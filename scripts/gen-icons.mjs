#!/usr/bin/env node
/**
 * gen-icons.mjs — 一次性/可复现的扩展图标生成器（TASK-013 / DEL-017）
 *
 * 目标：在 `extension/icons/` 下生成 4 个**真实有效**的 PNG：
 *   icon16.png / icon32.png / icon48.png / icon128.png
 *
 * 约束（设计真源 design.md / TASK-013）：
 *   - 零第三方依赖：仅使用 Node 内置模块（node:zlib / node:fs / node:path / node:url）。
 *   - 手写最小合法 PNG：签名 + IHDR + IDAT + IEND，位深 8、颜色类型 6（RGBA）、
 *     正确 CRC32、无交错。
 *   - 浏览器必须能正常解析（正确 CRC + 合法 zlib 流）。
 *   - 本脚本位于 `scripts/`，不在 `extension/` 内，不会进入发行包。
 *
 * 图标设计（统一风格，非美术追求）：
 *   - 深蓝（#1f6feb）圆角方块底。
 *   - 白色「复制」意象：两张叠加的页面，中间以底色描边分隔。
 *   - 所有形状按参数缩放；使用超采样（supersampling）做抗锯齿。
 *
 * 用法： node scripts/gen-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'extension', 'icons');
const SIZES = [16, 32, 48, 128];

// ---------------------------------------------------------------------------
// CRC32（PNG 每个 chunk 都需要）
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

// ---------------------------------------------------------------------------
// PNG chunk 组装
// ---------------------------------------------------------------------------
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length >>> 0, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function buildPng(size, rgba) {
  // IHDR: width(4) height(4) bitDepth(1) colorType(1) compression(1) filter(1) interlace(1)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type 6 = truecolour with alpha (RGBA)
  ihdr[10] = 0; // compression = deflate
  ihdr[11] = 0; // filter method 0
  ihdr[12] = 0; // no interlace

  // 原始扫描线：每行前置一个 filter 字节（0 = None），随后 size*4 个 RGBA 字节
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// 形状：圆角矩形（归一化坐标 0..1）
// ---------------------------------------------------------------------------
const BLUE = [0x1f, 0x6f, 0xeb]; // #1f6feb
const WHITE = [0xff, 0xff, 0xff];

function insideRoundedRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const dx = Math.max(x0 + r - px, px - (x1 - r), 0);
  const dy = Math.max(y0 + r - py, py - (y1 - r), 0);
  return dx * dx + dy * dy <= r * r;
}

// 图层（自底向上）；每个图层按顺序覆盖，返回该采样点最终颜色或 null(透明)
function sampleColor(px, py) {
  let color = null;

  // 1) 深蓝圆角底
  if (insideRoundedRect(px, py, 0, 0, 1, 1, 0.24)) color = BLUE;

  // 2) 后页（左上，白）
  if (insideRoundedRect(px, py, 0.21, 0.17, 0.65, 0.61, 0.09)) color = WHITE;

  // 3) 前页外侧用底色做分隔描边（覆盖后页重叠角 → 形成两张分离的页面）
  if (insideRoundedRect(px, py, 0.31, 0.31, 0.85, 0.85, 0.145)) color = BLUE;

  // 4) 前页（右下，白）
  if (insideRoundedRect(px, py, 0.36, 0.36, 0.80, 0.80, 0.09)) color = WHITE;

  return color;
}

function renderIcon(size) {
  // 超采样次数：小图标用更高采样保持边缘平滑
  const SS = size <= 16 ? 12 : size <= 32 ? 8 : 4;
  const rgba = Buffer.alloc(size * size * 4);
  const inv = 1 / size;
  const invSS = 1 / SS;
  const nSamples = SS * SS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let aSum = 0;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;

      for (let sy = 0; sy < SS; sy++) {
        const py = (y + (sy + 0.5) * invSS) * inv;
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) * invSS) * inv;
          const c = sampleColor(px, py);
          if (c) {
            aSum += 255;
            rSum += c[0] * 255;
            gSum += c[1] * 255;
            bSum += c[2] * 255;
          }
        }
      }

      const idx = (y * size + x) * 4;
      if (aSum > 0) {
        // 反预乘：颜色按 alpha 加权平均
        rgba[idx] = Math.round(rSum / aSum);
        rgba[idx + 1] = Math.round(gSum / aSum);
        rgba[idx + 2] = Math.round(bSum / aSum);
        rgba[idx + 3] = Math.round(aSum / nSamples);
      }
      // 否则保持全 0（透明）
    }
  }

  return rgba;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const results = [];

  for (const size of SIZES) {
    const rgba = renderIcon(size);
    const png = buildPng(size, rgba);
    const file = join(OUT_DIR, `icon${size}.png`);
    writeFileSync(file, png);
    results.push({ file, size, bytes: statSync(file).size });
    console.log(`[gen-icons] wrote ${file} (${size}x${size}, ${png.length} bytes)`);
  }

  console.log(`[gen-icons] done: ${results.length} icons → ${OUT_DIR}`);
}

main();
