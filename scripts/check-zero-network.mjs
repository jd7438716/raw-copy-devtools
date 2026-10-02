#!/usr/bin/env node
/**
 * check-zero-network.mjs — 零网络 / 零持久化静态门禁（TASK-009，开发期工具，不进发行包）。
 *
 * 递归扫描 `extension/**\/*.{js,html}`，逐行断言不存在以下能力：
 *   - 网络请求：`fetch(`、`XMLHttpRequest`、`WebSocket`、`sendBeacon`、
 *     `navigator.sendBeacon`
 *   - 持久化 / 扩展存储：`chrome.storage`、`localStorage`、`sessionStorage`、
 *     `indexedDB`
 *   - 跨上下文连接：`chrome.runtime.connect`
 *   - 分析 / 遥测 / 广告 SDK 关键字：analytics、telemetry、gtag、mixpanel、
 *     sentry、amplitude、posthog
 *
 * 无命中 → 每项打印 [PASS] → exit 0；
 * 任一项命中 → 打印 文件:行号 + 命中行 → exit 1。
 *
 * 仅使用 Node 内置模块，无第三方依赖。（REQ-027 / REQ-028 / AC-008 / AC-020）
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const EXT_ROOT = fileURLToPath(new URL('../extension/', import.meta.url));

/**
 * 检测规则。`match(line)` 返回 true 视为命中。
 * 需要大小写不敏感的关键字用正则，字面量用 includes。
 */
const RULES = [
  // ---- 网络请求能力（AC-008 / REQ-027）----
  { id: 'fetch', label: 'fetch(', match: (line) => line.includes('fetch(') },
  { id: 'xhr', label: 'XMLHttpRequest', match: (line) => line.includes('XMLHttpRequest') },
  { id: 'websocket', label: 'WebSocket', match: (line) => line.includes('WebSocket') },
  { id: 'sendbeacon', label: 'sendBeacon', match: (line) => line.includes('sendBeacon') },
  {
    id: 'navigator-sendbeacon',
    label: 'navigator.sendBeacon',
    match: (line) => line.includes('navigator.sendBeacon'),
  },

  // ---- 持久化 / 扩展存储（REQ-028）----
  { id: 'chrome-storage', label: 'chrome.storage', match: (line) => line.includes('chrome.storage') },
  { id: 'localstorage', label: 'localStorage', match: (line) => line.includes('localStorage') },
  { id: 'sessionstorage', label: 'sessionStorage', match: (line) => line.includes('sessionStorage') },
  { id: 'indexeddb', label: 'indexedDB', match: (line) => line.includes('indexedDB') },

  // ---- 跨上下文连接 ----
  {
    id: 'runtime-connect',
    label: 'chrome.runtime.connect',
    match: (line) => line.includes('chrome.runtime.connect'),
  },

  // ---- 分析 / 遥测 / 广告 SDK 关键字（REQ-027）----
  { id: 'analytics', label: 'analytics', match: (line) => /analytics/i.test(line) },
  { id: 'telemetry', label: 'telemetry', match: (line) => /telemetry/i.test(line) },
  { id: 'gtag', label: 'gtag', match: (line) => /gtag/i.test(line) },
  { id: 'mixpanel', label: 'mixpanel', match: (line) => /mixpanel/i.test(line) },
  { id: 'sentry', label: 'sentry', match: (line) => /sentry/i.test(line) },
  { id: 'amplitude', label: 'amplitude', match: (line) => /amplitude/i.test(line) },
  { id: 'posthog', label: 'posthog', match: (line) => /posthog/i.test(line) },
];

/** 递归收集 .js / .html 文件。 */
function collectSourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (name.endsWith('.js') || name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 在单个文件里查找某条规则的所有命中行。
 * @returns {{line:number, text:string}[]}
 */
function findHits(content, match) {
  const hits = [];
  const lines = content.split(/\r?\n/u);
  for (let i = 0; i < lines.length; i += 1) {
    if (match(lines[i])) {
      hits.push({ line: i + 1, text: lines[i].trim() });
    }
  }
  return hits;
}

function main() {
  console.log('== check-zero-network ==');
  console.log('extension root: ' + EXT_ROOT);

  if (!existsSync(EXT_ROOT)) {
    console.error('[FAIL] extension/ 目录不存在');
    process.exit(1);
  }

  let files = [];
  try {
    files = collectSourceFiles(EXT_ROOT);
  } catch (err) {
    console.error('[FAIL] 无法遍历 extension/: ' + err.message);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('[FAIL] extension/ 下未找到任何 .js / .html 文件（避免空跑误判 PASS）');
    process.exit(1);
  }

  files.sort();

  // 只读一次盘，缓存内容（小仓库，代价可忽略）。
  const sources = files.map((file) => ({
    file,
    rel: relative(EXT_ROOT, file).split(sep).join('/'),
    content: readFileSync(file, 'utf8'),
  }));

  console.log('扫描文件 ' + files.length + ' 个：');
  for (const src of sources) {
    console.log('  - extension/' + src.rel);
  }

  let failed = 0;

  for (const rule of RULES) {
    const hits = [];
    for (const src of sources) {
      const found = findHits(src.content, rule.match);
      for (const hit of found) {
        hits.push({ rel: src.rel, ...hit });
      }
    }

    if (hits.length === 0) {
      console.log('[PASS] 无 "' + rule.label + '"');
    } else {
      failed += 1;
      console.error('[FAIL] 命中 "' + rule.label + '" (' + hits.length + ' 处)');
      for (const hit of hits) {
        console.error('    extension/' + hit.rel + ':' + hit.line + '  ' + hit.text);
      }
    }
  }

  console.log(
    '[check-zero-network] ' + (RULES.length - failed) + '/' + RULES.length + ' 项通过'
  );

  if (failed === 0) {
    console.log('== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==');
    process.exit(0);
  }

  console.error('== RESULT: FAIL (' + failed + ' 项命中) ==');
  process.exit(1);
}

main();
