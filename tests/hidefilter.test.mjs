// tests/hidefilter.test.mjs — 静态资源判定 + 视图隐藏纯逻辑单元测试
// 运行: node --test "tests/hidefilter.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HIDDEN_RESOURCE_TYPES,
  isStaticResource,
  isPdf,
  applyHide,
} from '../extension/src/hidefilter.js';

/** 构造一条记录。 */
function rec(overrides) {
  return Object.assign(
    {
      id: 1,
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      responseContent: { mimeType: 'application/json', text: '{}', size: 2 },
      resourceType: 'xhr',
    },
    overrides,
  );
}

test('HIDDEN_RESOURCE_TYPES 覆盖点名集合', () => {
  assert.deepEqual([...HIDDEN_RESOURCE_TYPES].sort(), [
    'font',
    'image',
    'media',
    'script',
    'stylesheet',
  ]);
});

test('点名类型隐藏，且大小写不敏感（Chrome 常为 PascalCase）', () => {
  for (const rt of ['script', 'stylesheet', 'font', 'image', 'media']) {
    assert.equal(isStaticResource(rec({ resourceType: rt })), true, rt);
    assert.equal(
      isStaticResource(rec({ resourceType: rt[0].toUpperCase() + rt.slice(1) })),
      true,
      'PascalCase ' + rt,
    );
  }
});

test('白名单保留：xhr / fetch / websocket / eventsource 永不隐藏', () => {
  for (const rt of ['xhr', 'fetch', 'websocket', 'eventsource', 'XHR', 'Fetch']) {
    assert.equal(isStaticResource(rec({ resourceType: rt })), false, rt);
  }
});

test('document：普通 HTML 保留；pdf（MIME 或 .pdf URL）隐藏', () => {
  assert.equal(isStaticResource(rec({ resourceType: 'document', url: 'https://x/page', responseContent: { mimeType: 'text/html' } })), false);
  assert.equal(isStaticResource(rec({ resourceType: 'document', responseContent: { mimeType: 'application/pdf' } })), true);
  assert.equal(isStaticResource(rec({ resourceType: 'document', url: 'https://x/report.pdf', responseContent: { mimeType: 'text/html' } })), true);
});

test('isPdf：MIME application/pdf 或 URL 以 .pdf 结尾（含 query）', () => {
  assert.equal(isPdf(rec({ responseContent: { mimeType: 'application/pdf' } })), true);
  assert.equal(isPdf(rec({ responseContent: { mimeType: 'APPLICATION/PDF; charset=binary' } })), true);
  assert.equal(isPdf(rec({ url: 'https://x/a.PDF?download=1#frag' })), true);
  assert.equal(isPdf(rec({ url: 'https://x/a.pdfx' })), false);
  assert.equal(isPdf(rec({})), false);
});

test('other / 未知类型：MIME 与扩展名辅助判定，且不误伤 API', () => {
  // 静态命中
  assert.equal(isStaticResource(rec({ resourceType: 'other', responseContent: { mimeType: 'image/png' } })), true);
  assert.equal(isStaticResource(rec({ resourceType: 'other', responseContent: { mimeType: 'font/woff2' } })), true);
  assert.equal(isStaticResource(rec({ resourceType: 'other', responseContent: { mimeType: 'text/css' } })), true);
  assert.equal(isStaticResource(rec({ resourceType: 'other', url: 'https://x/app.js', responseContent: { mimeType: '' } })), true);
  assert.equal(isStaticResource(rec({ resourceType: 'other', responseContent: { mimeType: 'application/pdf' } })), true);
  // API 反例：json / xml / 无扩展名端点不得隐藏
  assert.equal(isStaticResource(rec({ resourceType: 'other', url: 'https://api.x/data.json', responseContent: { mimeType: 'application/json' } })), false);
  assert.equal(isStaticResource(rec({ resourceType: 'other', url: 'https://api.x/v1/orders', responseContent: { mimeType: 'application/json' } })), false);
  assert.equal(isStaticResource(rec({ resourceType: '', url: 'https://api.x/sse/stream', responseContent: { mimeType: 'text/event-stream' } })), false);
});

test('畸形记录一律不隐藏（宁可不隐藏，避免误伤）', () => {
  assert.equal(isStaticResource(null), false);
  assert.equal(isStaticResource(undefined), false);
  assert.equal(isStaticResource({}), false);
  assert.equal(isStaticResource(rec({ resourceType: '', url: '', responseContent: undefined })), false);
});

test('applyHide：保持顺序、不改入参、开关关闭时原样拷贝', () => {
  const list = [
    rec({ id: 1, resourceType: 'xhr' }),
    rec({ id: 2, resourceType: 'script', url: 'https://x/a.js' }),
    rec({ id: 3, resourceType: 'fetch' }),
    rec({ id: 4, resourceType: 'image', url: 'https://x/a.png' }),
  ];
  const visible = applyHide(list, true);
  assert.deepEqual(visible.map((r) => r.id), [1, 3]);
  assert.equal(list.length, 4, '入参不得被修改');

  const all = applyHide(list, false);
  assert.deepEqual(all.map((r) => r.id), [1, 2, 3, 4]);
  assert.notEqual(all, list);
});

test('applyHide：空 / 非法输入安全降级', () => {
  assert.deepEqual(applyHide(undefined, true), []);
  assert.deepEqual(applyHide(null, true), []);
  assert.deepEqual(applyHide('nope', false), []);
});
