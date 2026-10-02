// tests/i18n.test.mjs — i18n 单元测试
// 运行: npm test   或   node --test tests/i18n.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

import { t, dict, setLanguage, getLanguage, DEFAULT_LANG } from '../extension/src/i18n.js';

test('t() 命中 zh 返回中文文案', () => {
  setLanguage('zh');
  assert.equal(t('panel.title'), '请求原始信息复制');
  assert.equal(t('col.method'), '方法');
  assert.equal(t('copy.button'), '复制请求 + 响应（原始）');
  assert.equal(t('toast.copied'), '已复制到剪贴板');
});

test('t(key, vars) 正确插值 `{name}` 占位符', () => {
  setLanguage('zh');
  assert.equal(
    t('toast.copyFailed', { reason: '权限被拒绝' }),
    '复制失败：权限被拒绝'
  );
  assert.equal(
    t('list.cached', { count: 12, capacity: 1000 }),
    '缓存 12/1000 条'
  );
  // 多个占位符 + 类型强制为字符串
  assert.equal(
    t('content.binaryOmitted', { mime: 'image/png', bytes: 45678 }),
    '[Binary content omitted: image/png, 45678 bytes]'
  );
  // 未提供的占位符保持原样（可读回退，不抛异常）
  assert.equal(t('large.confirm', { size: '10MB' }), '该响应较大（10MB），是否继续复制？');
});

test('缺失 key 返回 key 且不抛异常', () => {
  setLanguage('zh');
  assert.doesNotThrow(() => t('__definitely.missing.key__'));
  assert.equal(t('__definitely.missing.key__'), '__definitely.missing.key__');
});

test('默认语言为 zh，切换 en 后命中英文占位', () => {
  assert.equal(DEFAULT_LANG, 'zh');
  assert.equal(getLanguage(), 'zh');

  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(t('panel.title'), 'Raw Request Copier');

  // 未知语言忽略，保持当前值
  assert.equal(setLanguage('fr'), 'en');

  setLanguage('zh');
});

test('en 为结构占位：键集与 zh 完全一致', () => {
  const zhKeys = Object.keys(dict.zh).sort();
  const enKeys = Object.keys(dict.en).sort();
  assert.deepEqual(enKeys, zhKeys);
  // zh 字典非空且覆盖面板核心可见文案
  for (const required of [
    'panel.title',
    'col.method',
    'col.url',
    'col.status',
    'col.resourceType',
    'col.time',
    'col.size',
    'col.started',
    'filter.searchPlaceholder',
    'copy.button',
    'mode.a',
    'mode.b',
    'toast.copied',
    'toast.copyFailed',
    'empty.title',
    'privacy.link',
    'large.confirm',
    'content.binaryOmitted',
    'content.base64Omitted',
    'content.fetching',
    'copy.fetchingTimeout',
    // TASK-010 新增键（contextmenu.* / multi.* / detail.*）
    'contextmenu.copyRequestResponse',
    'contextmenu.copySelected',
    'mode.aButton',
    'mode.bButton',
    'multi.selectAll',
    'multi.copySelected',
    'multi.selectedCount',
    'multi.largeConfirm',
    'detail.title',
    'detail.close',
    'detail.copyButton',
    'detail.evicted',
  ]) {
    assert.ok(required in dict.zh, 'zh 字典缺少键: ' + required);
    assert.ok(required in dict.en, 'en 字典缺少键: ' + required);
  }
});

test('TASK-010 新增键：zh/en 均必含且文案非空', () => {
  const NEW_KEYS = [
    'contextmenu.copyRequestResponse',
    'contextmenu.copySelected',
    'mode.aButton',
    'mode.bButton',
    'multi.selectAll',
    'multi.copySelected',
    'multi.selectedCount',
    'multi.largeConfirm',
    'detail.title',
    'detail.close',
    'detail.copyButton',
    'detail.evicted',
  ];

  for (const key of NEW_KEYS) {
    assert.ok(key in dict.zh, 'zh 字典缺少键: ' + key);
    assert.ok(key in dict.en, 'en 字典缺少键: ' + key);
    assert.equal(typeof dict.zh[key], 'string', key + ' zh 非字符串');
    assert.equal(typeof dict.en[key], 'string', key + ' en 非字符串');
    assert.ok(dict.zh[key].trim().length > 0, 'zh 文案为空: ' + key);
    assert.ok(dict.en[key].trim().length > 0, 'en 文案为空: ' + key);
  }
});

test('TASK-010 新增键：{count} / {size} 插值且 zh/en 同步切换', () => {
  setLanguage('zh');
  assert.equal(t('contextmenu.copySelected', { count: 3 }), '复制选中(3)');
  assert.equal(t('multi.copySelected', { count: 3 }), '复制选中(3)');
  assert.equal(t('multi.selectedCount', { count: 5 }), '已选 5 条');
  assert.equal(
    t('multi.largeConfirm', { count: 2, size: '12MB' }),
    '本批含 2 条大响应（最大 12MB），是否继续复制？'
  );
  assert.equal(t('detail.title'), '请求明细');
  assert.equal(t('detail.close'), '关闭');
  assert.equal(t('detail.copyButton'), '复制请求 + 响应（原始）');
  assert.equal(t('detail.evicted'), '该请求已被淘汰，明细已关闭');

  setLanguage('en');
  assert.equal(t('contextmenu.copySelected', { count: 3 }), 'Copy Selected (3)');
  assert.equal(t('multi.copySelected', { count: 3 }), 'Copy Selected (3)');
  assert.equal(t('multi.selectedCount', { count: 5 }), '5 selected');
  assert.equal(
    t('multi.largeConfirm', { count: 2, size: '12MB' }),
    'This batch contains 2 large response(s) (max 12MB). Copy anyway?'
  );
  assert.equal(t('detail.title'), 'Request details');
  assert.equal(t('detail.close'), 'Close');

  setLanguage('zh');
});

test('TASK-010：新增键与既有逐字符契约键并存互不污染', () => {
  // 复制文本逐字符契约键未被翻译/改动
  assert.equal(dict.zh['copy.requestSection'], '===== REQUEST =====');
  assert.equal(dict.en['copy.requestSection'], '===== REQUEST =====');
  assert.equal(dict.zh['copy.responseSection'], '===== RESPONSE =====');
  assert.equal(dict.en['copy.responseSection'], '===== RESPONSE =====');
  assert.equal(dict.zh['copy.requestBody'], '[Request Body]');
  assert.equal(dict.en['copy.requestBody'], '[Request Body]');
  assert.equal(dict.zh['copy.responseBody'], '[Response Body]');
  assert.equal(dict.en['copy.responseBody'], '[Response Body]');
  assert.equal(dict.zh['copy.metaHeader'], '===== META =====');
  assert.equal(dict.en['copy.metaHeader'], '===== META =====');
});

test('TASK-006：② 模式 A/B 按钮键存在且 zh/en 对齐、非空', () => {
  for (const key of ['mode.aButton', 'mode.bButton']) {
    assert.ok(key in dict.zh, 'zh 缺少键: ' + key);
    assert.ok(key in dict.en, 'en 缺少键: ' + key);
    assert.ok(dict.zh[key].trim().length > 0);
    assert.ok(dict.en[key].trim().length > 0);
  }
  setLanguage('zh');
  assert.equal(t('mode.aButton'), '模式 A');
  assert.equal(t('mode.bButton'), '模式 B');
  setLanguage('en');
  assert.equal(t('mode.aButton'), 'Mode A');
  assert.equal(t('mode.bButton'), 'Mode B');
  setLanguage('zh');
});

test('TASK-006 / ③：分段复制与 toggle 相关 i18n 键已彻底清理', () => {
  const REMOVED = [
    'copy.buttonRequest',
    'copy.buttonResponse',
    'contextmenu.copyRequestOnly',
    'contextmenu.copyResponseOnly',
    'mode.label',
  ];
  for (const key of REMOVED) {
    assert.ok(!(key in dict.zh), 'zh 不应再有键: ' + key);
    assert.ok(!(key in dict.en), 'en 不应再有键: ' + key);
  }
});
