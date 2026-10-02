// tests/panel-controls.test.mjs — 面板级接线：隐藏静态资源开关 + 计数 + 清除网络日志
// 运行: node --test "tests/panel-controls.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPanelHarness } from './panel-harness.mjs';

const H = await createPanelHarness();

// id1 xhr / id2 script / id3 image / id4 fetch / id5 font / id6 document(html) / id7 other(pdf)
H.feed(1, 'https://api.example.com/v1/users', undefined, { resourceType: 'XHR' });
H.feed(2, 'https://cdn.example.com/app.js', undefined, {
  resourceType: 'Script',
  mimeType: 'application/javascript',
});
H.feed(3, 'https://cdn.example.com/logo.png', undefined, {
  resourceType: 'Image',
  mimeType: 'image/png',
});
H.feed(4, 'https://api.example.com/v1/login', undefined, { resourceType: 'Fetch' });
H.feed(5, 'https://cdn.example.com/font.woff2', undefined, {
  resourceType: 'Font',
  mimeType: 'font/woff2',
});
H.feed(6, 'https://www.example.com/page', undefined, {
  resourceType: 'Document',
  mimeType: 'text/html',
});
H.feed(7, 'https://files.example.com/report.pdf', undefined, {
  resourceType: 'Other',
  mimeType: 'application/pdf',
});
H.flushRaf();

test('默认隐藏静态资源：仅保留 xhr / fetch / document', () => {
  assert.equal(H.rows().length, 3, '默认应只渲染 3 条可调试请求');
  assert.match(H.getListCount(), /显示 3\/7 条/);
});

test('全选只作用于可见（未隐藏）条目', () => {
  H.clickButton('select-all-btn');
  const sel = H.panel
    .getSelectedIds()
    .slice()
    .sort((a, b) => a - b);
  assert.deepEqual(sel, [1, 4, 6], '全选不得选中被隐藏的 id');
  H.pressArrow('ArrowDown'); // 复位选中
});

test('关闭隐藏开关 → 恢复显示全部 7 条', () => {
  H.setHideStatic(false);
  assert.equal(H.rows().length, 7);
  assert.equal(H.getListCount(), '显示 7/7 条');
});

test('清除网络日志：清空列表 / 计数 / 选中', () => {
  H.clickButton('clear-btn');
  H.flushRaf();
  assert.equal(H.rows().length, 0);
  assert.equal(H.getListCount(), '');
  assert.deepEqual(H.panel.getSelectedIds(), []);
});
