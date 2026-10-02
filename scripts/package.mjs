#!/usr/bin/env node
/**
 * package.mjs — 零第三方依赖的可复现打包脚本（TASK-014 / DEL-015 / DEL-016）。
 *
 * 目标：把扩展生成一个**可直接被 Chrome/Edge 以「加载已解压的扩展程序」
 * 方式安装**的 ZIP 包，并在同一次运行里完成体积门禁与零依赖审计。
 *
 * 设计真源（design.md）：
 *   - ADR-010：`extension/` 为可加载/可打包边界。zip 仅含 `extension/**` + `LICENSE`；
 *     `extension/` 内的文件在 zip 中**位于根**（`extension/manifest.json` → `manifest.json`）。
 *   - ADR-011：打包脚本化；白名单收集，输出 `dist/raw-copy-<version>.zip`。
 *   - C-4：排除 `butler/`、`req.txt`、`docs/`、`.refs/`、`.opencode/`。
 *   - REQ-031 / AC-017：解压后总体积 < 200KB；REQ-032：零第三方运行时依赖、纯原生 JS。
 *
 * 实现约束：
 *   - 仅使用 Node 内置模块（node:zlib / node:fs / node:path / node:url）。
 *   - 手写最小合法 ZIP：local file header + central directory + EOCD；
 *     压缩方法 8（deflate，`zlib.deflateRawSync`）；正确 CRC32；固定 DOS 时间戳
 *     → 同一输入产出**逐字节可复现**的 zip。
 *   - 打包完成后**独立读回**生成的 zip（重新解析 + inflate + CRC 校验 + manifest 断言），
 *     不复用内存中对象，避免"生成器自证"式假阳性。
 *   - **打包期体积优化（TASK-011/012 rework）**：对打包进 ZIP 的 `.js` 条目做「安全剥离」——
 *     移除**整行**注释（`//` 行注释与 `/*`…块注释）与**整行**空白，不改变任何可执行语义。
 *     保守行级算法，不引入第三方依赖；只做整行剔除，不做不可靠的 inline 剥离。
 *     剥离后每个 `.js` **必须先通过 `node --check`**（写入 os.tmpdir 临时 .mjs 校验）才允许入包，
 *     任一失败即终止且不写出 zip；读回阶段再对每个 .js 二次 `node --check`（双保险）。
 *     安全前提：本仓库全部反引号均位于注释内、代码无多行模板字符串（已机械确认），
 *     且不存在「块注释结束符后同行仍有代码」的行，故整行剥离不会误伤字符串/模板字面量。
 *   - `.html/.css/.png/.json/LICENSE` 一律不做任何剥离。
 *   - 体积门禁阈值 `UNCOMPRESSED_LIMIT_BYTES` 保持 200KB（REQ-031 / AC-017）不变。
 *
 * 用法： node scripts/package.mjs
 * 退出： 全部断言通过 → exit 0；任一失败 → 打印 FAIL 明细 → exit 1。
 */

import { deflateRawSync, inflateRawSync } from 'node:zlib';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXT_ROOT = join(ROOT, 'extension');
const LICENSE_PATH = join(ROOT, 'LICENSE');
const MANIFEST_PATH = join(EXT_ROOT, 'manifest.json');
const DIST_DIR = join(ROOT, 'dist');

/** 解压后总体积门禁：200KB（REQ-031 / AC-017）。 */
const UNCOMPRESSED_LIMIT_BYTES = 200 * 1024;

// ---------------------------------------------------------------------------
// CRC32（ZIP 每个条目都需要；多项式 0xEDB88320，与 PNG/gen-icons 同源）
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// 固定 DOS 时间戳（1980-01-01 00:00:00）→ zip 可复现（不随 mtime 漂移）。
const DOS_TIME = 0x0000;
const DOS_DATE = 0x0021; // year=0, month=1, day=1

/** 把 `full` 相对 `base` 转成 zip 内部的正斜杠条目名。 */
function toEntryName(base, full) {
  return relative(base, full).split(sep).join('/');
}

/** 递归收集目录下所有普通文件（返回绝对路径，按名称排序）。 */
function collectFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (stat.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 打包期安全剥离（TASK-011/012 rework · 体积优化，零依赖）
// ---------------------------------------------------------------------------
/**
 * 逐行剥离 `.js` 的**整行**注释与**整行**空白，不改变任何可执行语义：
 *   - 块注释外：trim 后以 `//` 开头 → 整行丢弃；
 *               trim 后以块注释起始符开头 → 进入块注释（同行含结束符则立即退出），整行丢弃；
 *   - 块注释内：含结束符 → 退出（整行丢弃），否则整行丢弃；
 *   - 其余行**原样保留**（连续空白/缩进不动；不做不可靠的 inline 注释剥离）。
 *
 * 安全前提（已对本仓库机械确认）：全部反引号均位于注释内、代码无多行模板字符串，
 * 且不存在「块注释结束符后同行仍有代码」的行；故整行剥离不会误伤字符串/模板字面量。
 * 剥离产物仍必须逐个通过 `checkJsSyntax`（node --check），作为最终安全兜底。
 *
 * @param {string} src 源文件 UTF-8 文本
 * @returns {string} 剥离后的文本（行边界统一为 \n）
 */
function stripJsComments(src) {
  const out = [];
  let inBlock = false;
  for (const line of src.split('\n')) {
    const t = line.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      continue;
    }
    if (t.startsWith('//')) continue;
    if (t.startsWith('/*')) {
      if (!t.includes('*/')) inBlock = true;
      continue;
    }
    if (t === '') continue;
    out.push(line);
  }
  return out.join('\n');
}

let __jsCheckSeq = 0;

/**
 * 用 Node 解析器验证一段 JS 源码的语法：写入 os.tmpdir 临时 `.mjs` 后调用
 * `node --check`。无论成败都删除临时文件。
 *
 * @param {string} code 已剥离/读回的 JS 文本
 * @returns {{ok: boolean, stderr: string}}
 */
function checkJsSyntax(code) {
  const tmp = join(
    tmpdir(),
    'rawcopy-jscheck-' + process.pid + '-' + __jsCheckSeq++ + '.mjs'
  );
  writeFileSync(tmp, code, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmp], {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 30000,
    });
    return { ok: true, stderr: '' };
  } catch (err) {
    const stderr =
      err && err.stderr ? String(err.stderr).trim() : String(err && err.message);
    return { ok: false, stderr };
  } finally {
    try {
      rmSync(tmp, { force: true });
    } catch {
      /* 临时文件清理失败不掩盖主流程结果 */
    }
  }
}

// ---------------------------------------------------------------------------
// ZIP 写出
// ---------------------------------------------------------------------------
function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const crc = crc32(data);
    const compressed = deflateRawSync(data, { level: 9 });
    const method = 8; // deflate

    // ---- local file header (30B + name) ----
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flag: UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    localParts.push(local, nameBuf, compressed);

    // ---- central directory file header (46B + name) ----
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8); // flag: UTF-8 names
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42); // local header offset
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const localData = Buffer.concat(localParts);
  const centralDir = Buffer.concat(centralParts);

  // ---- end of central directory (22B) ----
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // central dir disk
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localData, centralDir, eocd]);
}

// ---------------------------------------------------------------------------
// ZIP 读回解析（独立于写出的内存对象）
// ---------------------------------------------------------------------------
function parseZip(buf) {
  // 从尾部反向定位 EOCD。
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) throw new Error('未找到 EOCD（zip 结构损坏）');

  const total = buf.readUInt16LE(eocdPos + 10);
  const cdOffset = buf.readUInt32LE(eocdPos + 16);

  const entries = [];
  let p = cdOffset;
  for (let i = 0; i < total; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error('中央目录头签名非法 @' + p);
    }
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('本地文件头签名非法 @' + localOffset + '（' + name + '）');
    }
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const compressed = buf.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 8) {
      data = inflateRawSync(compressed);
    } else if (method === 0) {
      data = Buffer.from(compressed);
    } else {
      throw new Error('不支持的压缩方法 ' + method + '（' + name + '）');
    }

    if (data.length !== uncompSize) {
      throw new Error('解压尺寸不匹配 ' + name + '（' + data.length + '≠' + uncompSize + '）');
    }
    if (crc32(data) !== crc) {
      throw new Error('CRC32 校验失败 ' + name);
    }

    entries.push({ name, data, compressedBytes: compSize });
    p += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 零第三方运行时依赖审计
// ---------------------------------------------------------------------------
/**
 * 扫描 extension/**\/*.js 的静态/副作用/动态 import，收集 specifier。
 * 判定：specifier 以 `.` 或 `/` 开头 = 相对路径（本扩展内 / 绝对路径）；
 * 其余 = 外部依赖（第三方）。
 * 注：`chrome.*` 与浏览器原生 API 通过全局对象访问，不产生 import，天然不计入。
 */
function auditDependencies() {
  const jsFiles = collectFiles(EXT_ROOT).filter((f) => f.endsWith('.js'));
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g, // import x from '...'; import {a} from '...'
    /\bimport\s*['"]([^'"]+)['"]/g, // 副作用 import '...'
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // 动态 import('...')
  ];

  for (const file of jsFiles) {
    const src = readFileSync(file, 'utf8');
    for (const re of patterns) {
      let m;
      while ((m = re.exec(src)) !== null) {
        specifiers.add(m[1]);
      }
    }
  }

  const all = [...specifiers].sort();
  const external = all.filter((s) => !(s.startsWith('.') || s.startsWith('/')));
  return { files: jsFiles.length, all, external };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function main() {
  const failures = [];
  const fail = (msg) => {
    failures.push(msg);
    console.error('[FAIL] ' + msg);
  };

  console.log('== package ==');
  console.log('repo root:       ' + ROOT);
  console.log('extension root:  ' + EXT_ROOT);

  if (!existsSync(EXT_ROOT)) {
    console.error('[FAIL] extension/ 目录不存在，无法打包');
    process.exit(1);
  }
  if (!existsSync(MANIFEST_PATH)) {
    console.error('[FAIL] extension/manifest.json 不存在，无法确定版本');
    process.exit(1);
  }
  if (!existsSync(LICENSE_PATH)) {
    console.error('[FAIL] 仓库根 LICENSE 不存在');
    process.exit(1);
  }

  // ---- 版本单一真源：manifest.json#version（ADR-010 / C-6）----
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const version = manifest.version;
  if (typeof version !== 'string' || version.length === 0) {
    console.error('[FAIL] manifest.json 缺少合法 version');
    process.exit(1);
  }

  const zipPath = join(DIST_DIR, 'raw-copy-' + version + '.zip');
  console.log('version:         ' + version);
  console.log('zip:             ' + zipPath);
  console.log('');

  // ---- 白名单收集：extension/**（展平到根） + LICENSE（根）----
  // 打包期体积优化：.js 条目做「整行注释/空白剥离」（语义不变）；其余文件原样。
  const sourceFiles = collectFiles(EXT_ROOT);
  const sourceJsCount = sourceFiles.filter((f) => f.endsWith('.js')).length;
  let jsRawBytes = 0;
  let jsStrippedBytes = 0;
  let jsStrippedFiles = 0;
  const syntaxFailures = [];

  const entries = sourceFiles.map((full) => {
    const name = toEntryName(EXT_ROOT, full);
    const raw = readFileSync(full);
    if (!name.endsWith('.js')) {
      return { name, data: raw };
    }
    const stripped = Buffer.from(stripJsComments(raw.toString('utf8')), 'utf8');
    jsRawBytes += raw.length;
    jsStrippedBytes += stripped.length;
    if (stripped.length < raw.length) jsStrippedFiles += 1;
    // 强制安全验证：剥离后的 JS 必须先通过 node --check 才允许入包。
    const check = checkJsSyntax(stripped.toString('utf8'));
    if (!check.ok) {
      syntaxFailures.push({ name, stderr: check.stderr });
    }
    return { name, data: stripped, stripped: true };
  });
  entries.push({ name: 'LICENSE', data: readFileSync(LICENSE_PATH) });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  // 剥离后语法验证失败 → 立即终止，绝不写出可能损坏的 zip。
  if (syntaxFailures.length > 0) {
    for (const f of syntaxFailures) {
      fail('剥离后 node --check 失败: ' + f.name + '\n' + f.stderr);
    }
    console.error(
      '== RESULT: FAIL (' + syntaxFailures.length + ' 个 JS 剥离后语法错误，未写出 zip) =='
    );
    process.exit(1);
  }

  console.log('-- 打包期剥离（.js 整行注释/空白）--');
  console.log('JS 原始总字节:   ' + jsRawBytes + ' B');
  console.log(
    'JS 剥离后总字节: ' + jsStrippedBytes + ' B (节省 ' +
    (jsRawBytes - jsStrippedBytes) + ' B, ' + jsStrippedFiles + '/' + sourceJsCount + ' 个文件)'
  );
  console.log('[PASS] 全部 .js 剥离后 node --check 通过 (' + sourceJsCount + '/' + sourceJsCount + ')');
  console.log('');

  console.log('-- 打包条目 (' + entries.length + ') --  (* = .js 已剥离整行注释/空白)');
  for (const e of entries) {
    const compressed = deflateRawSync(e.data, { level: 9 }).length;
    console.log(
      '  ' + e.name.padEnd(28) + ' ' +
      String(e.data.length).padStart(7) + ' B  ->  ' +
      String(compressed).padStart(7) + ' B' +
      (e.stripped ? '  *' : '')
    );
  }

  // ---- 写 zip ----
  mkdirSync(DIST_DIR, { recursive: true });
  const zipBuf = buildZip(entries);
  writeFileSync(zipPath, zipBuf);
  console.log('');

  // ---- 体积核算 ----
  const uncompressedTotal = entries.reduce((sum, e) => sum + e.data.length, 0);
  const compressedTotal = zipBuf.length;
  console.log('-- 体积 --');
  console.log('条目数:              ' + entries.length);
  console.log('解压后总体积:        ' + uncompressedTotal + ' B (' +
    (uncompressedTotal / 1024).toFixed(2) + ' KB)');
  console.log('ZIP 压缩后体积:      ' + compressedTotal + ' B (' +
    (compressedTotal / 1024).toFixed(2) + ' KB)');
  console.log('门禁口径: 解压后总体积 < ' + UNCOMPRESSED_LIMIT_BYTES + ' B (200 KB)');
  if (uncompressedTotal >= UNCOMPRESSED_LIMIT_BYTES) {
    fail('解压后总体积超限: ' + uncompressedTotal + ' >= ' + UNCOMPRESSED_LIMIT_BYTES);
  } else {
    console.log('[PASS] 解压后总体积 < 200KB (' + uncompressedTotal + ' < ' +
      UNCOMPRESSED_LIMIT_BYTES + ')');
  }
  console.log('');

  // ---- 零第三方依赖审计（REQ-032）----
  console.log('-- 依赖审计 --');
  const audit = auditDependencies();
  console.log('扫描 .js 文件:       ' + audit.files);
  console.log('import specifiers:   ' + JSON.stringify(audit.all));
  console.log('third-party deps = ' + audit.external.length);
  if (audit.external.length > 0) {
    fail('发现第三方依赖: ' + JSON.stringify(audit.external));
  } else {
    console.log('[PASS] 全部 import specifier 均为相对路径（third-party deps = 0）');
  }
  console.log('');

  // ---- 读回校验（独立解析生成物，不复用内存对象）----
  console.log('-- 读回校验 --');
  let readBack;
  try {
    readBack = parseZip(readFileSync(zipPath));
  } catch (err) {
    fail('无法读回解析 zip: ' + err.message);
    readBack = null;
  }

  if (readBack) {
    console.log('[PASS] zip 可解析，CRC32 全部通过，共 ' + readBack.length + ' 条目');

    if (readBack.length !== entries.length) {
      fail('读回条目数 ' + readBack.length + ' ≠ 打包条目数 ' + entries.length);
    } else {
      console.log('[PASS] 读回条目数与打包一致 (' + readBack.length + ')');
    }

    const names = readBack.map((e) => e.name);

    // 1) 根 manifest.json 存在 + 合法 JSON + MV3 + permissions
    if (!names.includes('manifest.json')) {
      fail('zip 根缺少 manifest.json');
    } else {
      const mEntry = readBack.find((e) => e.name === 'manifest.json');
      let mJson = null;
      try {
        mJson = JSON.parse(mEntry.data.toString('utf8'));
        console.log('[PASS] 根 manifest.json 为合法 JSON');
      } catch (err) {
        fail('根 manifest.json 不是合法 JSON: ' + err.message);
      }
      if (mJson) {
        if (mJson.manifest_version === 3) {
          console.log('[PASS] manifest_version === 3');
        } else {
          fail('manifest_version ≠ 3: ' + JSON.stringify(mJson.manifest_version));
        }
        const perms = mJson.permissions;
        const permsOk = Array.isArray(perms) && perms.length === 1 && perms[0] === 'clipboardWrite';
        if (permsOk) {
          console.log('[PASS] permissions === ["clipboardWrite"]');
        } else {
          fail('permissions 非 ["clipboardWrite"]: ' + JSON.stringify(perms));
        }
      }
    }

    // 2) LICENSE 于根
    if (names.includes('LICENSE')) {
      console.log('[PASS] LICENSE 位于 zip 根');
    } else {
      fail('zip 根缺少 LICENSE');
    }

    // 3) 非发行内容不得进入 zip
    const FORBIDDEN_PREFIXES = [
      'butler/',
      'tests/',
      'docs/',
      'scripts/',
      '.refs/',
      '.opencode/',
      'node_modules/',
      'extension/', // 扩展内容应展平到根，不应保留 extension/ 前缀
    ];
    const FORBIDDEN_FILES = new Set([
      'req.txt',
      'package.json',
      'package-lock.json',
      'INSTALL.md',
      'USAGE.md',
    ]);
    const offenders = names.filter(
      (n) =>
        FORBIDDEN_PREFIXES.some((p) => n.startsWith(p)) || FORBIDDEN_FILES.has(n)
    );
    if (offenders.length === 0) {
      console.log('[PASS] 不含 butler/ tests/ docs/ scripts/ req.txt 等非发行内容');
    } else {
      fail('zip 含非发行内容: ' + JSON.stringify(offenders));
    }

    // 4) 每个读回条目解压后尺寸与磁盘源一致（展平映射；.js 按剥离后口径独立复算）
    let mismatch = 0;
    let jsCheckFailed = 0;
    for (const e of readBack) {
      const src = e.name === 'LICENSE'
        ? LICENSE_PATH
        : join(EXT_ROOT, e.name.split('/').join(sep));
      if (!existsSync(src)) {
        fail('zip 条目在磁盘无对应源文件: ' + e.name);
        mismatch += 1;
        continue;
      }
      // 从磁盘源独立重新推导期望交付字节（不复用打包期内存对象）。
      const diskRaw = readFileSync(src);
      const expected = e.name.endsWith('.js')
        ? Buffer.from(stripJsComments(diskRaw.toString('utf8')), 'utf8')
        : diskRaw;
      if (expected.length !== e.data.length) {
        fail(
          '条目尺寸与源不一致: ' + e.name +
          '（读回 ' + e.data.length + ' ≠ 期望 ' + expected.length + '）'
        );
        mismatch += 1;
      }
      // 双保险：对读回解压出的 .js 再次 node --check。
      if (e.name.endsWith('.js')) {
        const check = checkJsSyntax(e.data.toString('utf8'));
        if (!check.ok) {
          fail('读回 .js node --check 失败: ' + e.name + '\n' + check.stderr);
          jsCheckFailed += 1;
        }
      }
    }
    if (mismatch === 0) {
      console.log('[PASS] 全部条目与磁盘源文件一一对应（无缺失/多余；.js 按剥离口径）');
    }
    if (jsCheckFailed === 0) {
      console.log('[PASS] 读回全部 .js 条目 node --check 通过（双保险）');
    }
  }
  console.log('');

  // ---- 结果 ----
  if (failures.length === 0) {
    console.log('== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==');
    console.log('artifact: ' + zipPath);
    process.exit(0);
  }
  console.error('== RESULT: FAIL (' + failures.length + ' 项失败) ==');
  process.exit(1);
}

main();
