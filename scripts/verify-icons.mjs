#!/usr/bin/env node
/**
 * verify-icons.mjs — 独立校验 `extension/icons/*.png`（TASK-013 证据）
 *
 * 校验项（只读、零依赖、位级解析）：
 *   1. PNG 签名 = 89 50 4E 47 0D 0A 1A 0A
 *   2. IHDR 存在且 bitDepth=8、colorType=6（RGBA）、compression=0、interlace=0
 *   3. IHDR 宽度 == 高度 == 目标尺寸
 *   4. 逐 chunk 重算 CRC32 并与文件内 CRC 比对（保证浏览器可解析）
 *   5. zlib 解压 IDAT，核对长度 = height*(1 + width*4)（filter 字节 + RGBA 扫描线）
 *   6. 以 IEND 正确收尾
 *   7. 打印每个文件字节数
 *
 * 用法： node scripts/verify-icons.mjs
 * 退出码：0 = 全部 PASS；1 = 任一 FAIL
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = join(__dirname, '..', 'extension', 'icons');
const EXPECTED = [
  { name: 'icon16.png', size: 16 },
  { name: 'icon32.png', size: 32 },
  { name: 'icon48.png', size: 48 },
  { name: 'icon128.png', size: 128 },
];
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function parsePng(buf) {
  const errors = [];
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    return { errors: ['bad PNG signature'], width: null, height: null, idat: null };
  }
  let off = 8;
  let width = null;
  let height = null;
  const idatParts = [];
  let sawIhdr = false;
  let sawIend = false;

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const dataStart = off + 8;
    const dataEnd = dataStart + len;
    if (dataEnd + 4 > buf.length) {
      errors.push(`chunk ${type}: truncated`);
      break;
    }
    const data = buf.subarray(dataStart, dataEnd);
    const expectedCrc = buf.readUInt32BE(dataEnd);
    const actualCrc = crc32(buf.subarray(off + 4, dataEnd));
    if (expectedCrc !== actualCrc) {
      errors.push(`chunk ${type}: CRC mismatch (expected ${expectedCrc}, got ${actualCrc})`);
    }

    if (type === 'IHDR') {
      sawIhdr = true;
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      const interlace = data[12];
      if (bitDepth !== 8) errors.push(`IHDR: bitDepth=${bitDepth} (expected 8)`);
      if (colorType !== 6) errors.push(`IHDR: colorType=${colorType} (expected 6 RGBA)`);
      if (compression !== 0) errors.push(`IHDR: compression=${compression} (expected 0)`);
      if (filter !== 0) errors.push(`IHDR: filter=${filter} (expected 0)`);
      if (interlace !== 0) errors.push(`IHDR: interlace=${interlace} (expected 0)`);
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      sawIend = true;
      if (len !== 0) errors.push('IEND: non-empty');
    }
    off = dataEnd + 4;
    if (type === 'IEND') break;
  }

  if (!sawIhdr) errors.push('missing IHDR');
  if (!sawIend) errors.push('missing IEND / truncated');
  if (off !== buf.length) errors.push(`trailing bytes: parsed ${off} of ${buf.length}`);

  return { errors, width, height, idat: Buffer.concat(idatParts) };
}

function main() {
  let failed = 0;
  console.log('== verify-icons ==');
  for (const { name, size } of EXPECTED) {
    const file = join(ICON_DIR, name);
    const problems = [];
    let bytes = 0;
    let width = null;
    let height = null;
    let rawLen = null;
    try {
      const buf = readFileSync(file);
      bytes = buf.length;
      const parsed = parsePng(buf);
      problems.push(...parsed.errors);
      width = parsed.width;
      height = parsed.height;
      if (width !== size) problems.push(`width=${width} (expected ${size})`);
      if (height !== size) problems.push(`height=${height} (expected ${size})`);
      if (width !== null && height !== null && parsed.idat.length > 0) {
        try {
          const raw = inflateSync(parsed.idat);
          rawLen = raw.length;
          const expectedRaw = height * (1 + width * 4);
          if (rawLen !== expectedRaw) {
            problems.push(`IDAT inflated=${rawLen} (expected ${expectedRaw})`);
          }
        } catch (e) {
          problems.push(`IDAT inflate failed: ${e.message}`);
        }
      }
    } catch (e) {
      problems.push(`read failed: ${e.message}`);
    }

    if (problems.length === 0) {
      console.log(
        `[PASS] ${name.padEnd(12)} ${width}x${height}  ${String(bytes).padStart(7)} bytes  signature=OK CRC=OK IHDR=OK IDAT=${rawLen}B IEND=OK`,
      );
    } else {
      failed++;
      console.log(`[FAIL] ${name.padEnd(12)} ${bytes} bytes`);
      for (const p of problems) console.log(`        - ${p}`);
    }
  }
  console.log(failed === 0 ? '== RESULT: PASS (4/4) ==' : `== RESULT: FAIL (${failed} broken) ==`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
