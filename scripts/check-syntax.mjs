#!/usr/bin/env node
/**
 * check-syntax.mjs — 零依赖语法门禁（build / lint 共用）
 *
 * 遍历 `extension/**\/*.js`，逐个调用 `node --check` 做语法检查。
 *   - 全部通过 → exit 0
 *   - 任一失败 → 打印文件与错误 → exit 1
 *   - extension/ 不存在或无可检查文件 → exit 1（避免空跑误判 PASS）
 *
 * 仅使用 Node 内置模块，无第三方依赖。
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const EXT_ROOT = fileURLToPath(new URL('../extension/', import.meta.url));

/** 递归收集所有 .js 文件。 */
function collectJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

let files;
try {
  files = collectJsFiles(EXT_ROOT);
} catch (err) {
  console.error('[FAIL] 无法读取 extension/ 目录: ' + err.message);
  process.exit(1);
}

if (files.length === 0) {
  console.error('[FAIL] extension/ 下未找到任何 .js 文件');
  process.exit(1);
}

files.sort();

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 30000,
    });
    console.log('[PASS] ' + file);
  } catch (err) {
    failed += 1;
    console.error('[FAIL] ' + file);
    const stderr = err && err.stderr ? String(err.stderr).trim() : '';
    console.error(stderr || (err && err.message) || '未知错误');
  }
}

console.log(
  '[check-syntax] ' + (files.length - failed) + '/' + files.length + ' files passed'
);

process.exit(failed === 0 ? 0 : 1);
