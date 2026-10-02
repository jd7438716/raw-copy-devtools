#!/usr/bin/env node
/**
 * check-panel-shell.mjs — TASK-002 面板 UI 外壳门禁（开发期工具，不进发行包）。
 *
 * 独立读盘并逐项断言（零第三方依赖，仅 Node 内置模块）：
 *   1. extension/panel.html / extension/panel.js / extension/styles/panel.css 均存在
 *   2. panel.html 引用 styles/panel.css 且以 <script type="module" src="panel.js"> 加载
 *   3. panel.html 列表表头恰好 8 列（data-i18n="col.*"）
 *   4. panel.html 含全部稳定 DOM 契约 id（REQ-005/012/013 / DEL-002）
 *   5. panel.html 不含任何裸中文（所有可见文案走 data-i18n；AC-016 / REQ-033）
 *   6. panel.js 的字符串字面量中不含中文（中文仅允许出现在注释里；AC-016）
 *   7. panel.js import 了 i18n 的 t()，并导出 els / showToast / applyI18n 接线骨架
 *   8. panel.css 定义了固定行高变量与列表/工具栏/Toast/空态样式
 *
 * 全部通过 → exit 0；任一失败 → 打印 FAIL 明细 → exit 1。
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = join(__dirname, '..', 'extension');
const PANEL_HTML = join(EXT_ROOT, 'panel.html');
const PANEL_JS = join(EXT_ROOT, 'panel.js');
const PANEL_CSS = join(EXT_ROOT, 'styles', 'panel.css');

const HAN = /[\u4e00-\u9fff]/u;

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

function readOrExit(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    console.error('[FAIL] 无法读取 ' + path + ': ' + err.message);
    process.exit(1);
  }
}

/**
 * 提取 JS 源码中的字符串字面量（含模板字面量），跳过注释。
 * panel.js 约定不使用正则字面量，故 `/` 仅作注释或除法处理。
 *
 * @param {string} src
 * @returns {string[]}
 */
function extractStringLiterals(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | line | block | sq | dq | tpl
  let buffer = '';

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    if (state === 'code') {
      if (ch === '/' && next === '/') { state = 'line'; i += 2; continue; }
      if (ch === '/' && next === '*') { state = 'block'; i += 2; continue; }
      if (ch === "'") { state = 'sq'; buffer = ''; i += 1; continue; }
      if (ch === '"') { state = 'dq'; buffer = ''; i += 1; continue; }
      if (ch === '`') { state = 'tpl'; buffer = ''; i += 1; continue; }
      i += 1; continue;
    }

    if (state === 'line') {
      if (ch === '\n') state = 'code';
      i += 1; continue;
    }

    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; i += 2; continue; }
      i += 1; continue;
    }

    // inside a string / template literal
    if (ch === '\\') { buffer += src.slice(i, i + 2); i += 2; continue; }
    const quote = state === 'sq' ? "'" : state === 'dq' ? '"' : '`';
    if (ch === quote) { out.push(buffer); state = 'code'; i += 1; continue; }
    buffer += ch;
    i += 1;
  }

  return out;
}

function main() {
  console.log('== check-panel-shell ==');

  // 1. 文件存在
  check('panel.html 存在', existsSync(PANEL_HTML), PANEL_HTML);
  check('panel.js 存在', existsSync(PANEL_JS), PANEL_JS);
  check('styles/panel.css 存在', existsSync(PANEL_CSS), PANEL_CSS);
  if (failed > 0) {
    for (const line of results) console.log(line);
    console.log('== RESULT: FAIL (前置文件缺失) ==');
    process.exit(1);
  }

  const html = readOrExit(PANEL_HTML);
  const js = readOrExit(PANEL_JS);
  const css = readOrExit(PANEL_CSS);

  // 2. 资源引用与模块脚本
  check('panel.html 引用 styles/panel.css', html.includes('styles/panel.css'));
  check(
    'panel.html 以 <script type="module" src="panel.js"> 加载',
    /<script[^>]*type="module"[^>]*src="panel\.js"[^>]*>/u.test(html),
  );

  // 3. 表头恰好 8 列
  const colMatches = html.match(/data-i18n="col\.[A-Za-z]+"/gu) || [];
  check('列表表头 8 列（data-i18n="col.*"）', colMatches.length === 8,
    'count=' + colMatches.length + ' [' + colMatches.join(', ') + ']');

  // 4. 稳定 DOM 契约 id（② 后：模式 toggle 与分段按钮移除，新增 copy-btn-a/b）
  const requiredIds = [
    'toolbar', 'search', 'filter-method', 'filter-status', 'filter-type',
    'hide-static-toggle', 'list-count', 'clear-btn',
    'list', 'list-body', 'copy-btn', 'copy-btn-a', 'copy-btn-b', 'toast',
    'empty', 'copy-actions', 'privacy-link', 'copy-curl-btn',
    'context-menu', 'multiselect-actions', 'select-all-btn', 'copy-selected-btn',
    'selected-count', 'detail-pane', 'detail-body', 'detail-close',
  ];
  for (const id of requiredIds) {
    check('含 id="#' + id + '"', new RegExp('id="' + id + '"', 'u').test(html));
  }

  // 5. panel.html 无裸中文
  check('panel.html 无裸中文（可见文案全走 data-i18n）', !HAN.test(html));

  // 6. panel.js 字符串字面量不含中文
  const literals = extractStringLiterals(js);
  const badLiterals = literals.filter((s) => HAN.test(s));
  check(
    'panel.js 无中文字符串字面量（中文仅允许注释）',
    badLiterals.length === 0,
    'literals=' + literals.length + ', offending=' + JSON.stringify(badLiterals),
  );

  // 7. 接线骨架
  check("panel.js 从 ./src/i18n.js import t",
    /import\s*\{\s*t\s*\}\s*from\s*['"]\.\/src\/i18n\.js['"]/u.test(js));
  check('panel.js 导出 els', /export\s+const\s+els\b/u.test(js));
  check('panel.js 导出 showToast 函数', /export\s+function\s+showToast\b/u.test(js));
  check('panel.js 导出 applyI18n 函数', /export\s+function\s+applyI18n\b/u.test(js));

  // 8. CSS 关键样式
  check('panel.css 定义固定行高变量 --row-height', /--row-height\s*:/u.test(css));
  check('panel.css 含 .row 样式（虚拟滚动复用行）', /\.row\b/u.test(css));
  check('panel.css 含 .list__header 表头样式', /\.list__header\b/u.test(css));
  check('panel.css 含 .toast 样式', /\.toast\b/u.test(css));
  check('panel.css 含 .empty 空态样式', /\.empty\b/u.test(css));
  check('panel.css 含选中高亮 .is-selected', /\.is-selected\b/u.test(css));

  for (const line of results) console.log(line);
  console.log(
    failed === 0
      ? '== RESULT: PASS (' + results.length + '/' + results.length + ' 项) =='
      : '== RESULT: FAIL (' + failed + ' 项失败) ==',
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
