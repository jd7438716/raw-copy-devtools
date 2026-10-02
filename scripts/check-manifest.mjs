#!/usr/bin/env node
/**
 * check-manifest.mjs — MV3 清单权限门禁校验（TASK-001 证据，开发期工具，不进发行包）。
 *
 * 独立读盘 `extension/manifest.json` 并逐项断言（零第三方依赖，仅 Node 内置模块）：
 *   1. manifest_version === 3
 *   2. permissions 长度 === 1 且唯一项 === "clipboardWrite"（AC-009）
 *   3. 不存在 host_permissions / <all_urls> / tabs / webRequest /
 *      declarativeNetRequest / content_scripts / background（AC-009 / REQ-026）
 *   4. devtools_page === "devtools.html"（DEL-001 / REQ-001）
 *   5. icons 引用的 4 个 PNG 文件均存在于磁盘（DEL-017）
 *   6. 附加：name/version/description 存在且 version 为 "1.1.0"（增强里程碑）
 *
 * 全部通过 → exit 0；任一失败 → 打印 FAIL 明细 → exit 1。
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..', 'extension');
const MANIFEST_PATH = join(EXT_ROOT, 'manifest.json');

const FORBIDDEN_KEYS = [
  'host_permissions',
  'tabs',
  'webRequest',
  'declarativeNetRequest',
  'content_scripts',
  'background',
];

let failed = 0;
const results = [];

function check(label, ok, detail) {
  if (ok) {
    results.push('[PASS] ' + label + (detail ? '  (' + detail + ')' : ''));
  } else {
    failed += 1;
    results.push('[FAIL] ' + label + (detail ? '  (' + detail + ')' : ''));
  }
}

function main() {
  console.log('== check-manifest ==');
  console.log('manifest: ' + MANIFEST_PATH);

  let raw;
  try {
    raw = readFileSync(MANIFEST_PATH, 'utf8');
  } catch (err) {
    console.error('[FAIL] 无法读取 manifest.json: ' + err.message);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    console.error('[FAIL] manifest.json 不是合法 JSON: ' + err.message);
    process.exit(1);
  }

  // 1. manifest_version === 3
  check('manifest_version === 3', manifest.manifest_version === 3,
    'actual=' + JSON.stringify(manifest.manifest_version));

  // 2. permissions 长度 === 1 且 === "clipboardWrite"
  const perms = manifest.permissions;
  const permsOk = Array.isArray(perms) && perms.length === 1 && perms[0] === 'clipboardWrite';
  check('permissions === ["clipboardWrite"]', permsOk,
    'actual=' + JSON.stringify(perms));

  // 3. 禁止键 + <all_urls>
  for (const key of FORBIDDEN_KEYS) {
    check('无禁止键 "' + key + '"', !(key in manifest),
      key in manifest ? 'present' : 'absent');
  }
  check('无 "<all_urls>" 出现', !raw.includes('all_urls'),
    raw.includes('all_urls') ? 'found in manifest' : 'absent');

  // 4. devtools_page
  check('devtools_page === "devtools.html"', manifest.devtools_page === 'devtools.html',
    'actual=' + JSON.stringify(manifest.devtools_page));

  // 5. icons 4 个 PNG 存在
  const icons = manifest.icons || {};
  const expectedIcons = ['16', '32', '48', '128'];
  for (const size of expectedIcons) {
    const rel = icons[size];
    const ok = typeof rel === 'string' && existsSync(join(EXT_ROOT, rel));
    check('icons["' + size + '"] 文件存在', ok,
      rel ? rel + (ok ? ' → found' : ' → MISSING') : 'missing key');
  }

  // 6. 附加：元信息
  check('version === "1.1.0"', manifest.version === '1.1.0',
    'actual=' + JSON.stringify(manifest.version));
  check('name 非空', typeof manifest.name === 'string' && manifest.name.length > 0,
    'actual=' + JSON.stringify(manifest.name));
  check('description 非空', typeof manifest.description === 'string' && manifest.description.length > 0,
    'actual=' + JSON.stringify(manifest.description));

  for (const line of results) console.log(line);
  console.log(
    failed === 0
      ? '== RESULT: PASS (' + results.length + '/' + results.length + ' 项) =='
      : '== RESULT: FAIL (' + failed + ' 项失败) ==',
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
