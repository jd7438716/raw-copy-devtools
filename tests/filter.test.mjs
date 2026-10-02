// tests/filter.test.mjs — 列表搜索/过滤纯逻辑单元测试
// 运行: node --test "tests/filter.test.mjs"
// 覆盖: REQ-006/007/008/009 / AC-003 / DEL-004
import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFilter, collectOptions } from '../extension/src/filter.js';

/** 构造一条记录。 */
function rec(overrides) {
  return Object.assign(
    {
      id: 1,
      method: 'GET',
      url: 'https://api.example.com/',
      status: 200,
      resourceType: 'xhr',
    },
    overrides,
  );
}

/** 固定样本集（含大小写差异与状态码分布）。 */
function makeSet() {
  return [
    rec({ id: 1, method: 'GET', url: 'https://api.example.com/users', status: 200, resourceType: 'xhr' }),
    rec({ id: 2, method: 'POST', url: 'https://api.example.com/users', status: 201, resourceType: 'fetch' }),
    rec({ id: 3, method: 'GET', url: 'https://cdn.example.com/logo.png', status: 404, resourceType: 'image' }),
    rec({ id: 4, method: 'DELETE', url: 'https://api.example.com/users/9', status: 500, resourceType: 'xhr' }),
    rec({ id: 5, method: 'get', url: 'HTTPS://API.example.com/Status', status: 302, resourceType: 'document' }),
  ];
}

function ids(records) {
  return records.map((r) => (r ? r.id : undefined));
}

test('空条件返回全部（新数组，不改入参）', () => {
  const set = makeSet();
  const out = applyFilter(set, { query: '', method: '', status: '', resourceType: '' });
  assert.deepEqual(ids(out), [1, 2, 3, 4, 5]);
  assert.notEqual(out, set);

  // 缺省 criteria / 非对象 / 空数组
  assert.deepEqual(ids(applyFilter(set)), [1, 2, 3, 4, 5]);
  assert.deepEqual(applyFilter(set, null).length, 5);
  assert.deepEqual(applyFilter(undefined, {}), []);
  assert.deepEqual(applyFilter(null, {}), []);
});

test('URL 关键字搜索：不区分大小写，命中子串（REQ-006 / AC-003）', () => {
  const set = makeSet();
  assert.deepEqual(ids(applyFilter(set, { query: 'USERS' })), [1, 2, 4]);
  assert.deepEqual(ids(applyFilter(set, { query: 'API.EXAMPLE' })), [1, 2, 4, 5]);
  assert.deepEqual(ids(applyFilter(set, { query: 'logo.png' })), [3]);
  // 纯空白 = 不筛
  assert.deepEqual(ids(applyFilter(set, { query: '   ' })), [1, 2, 3, 4, 5]);
  // 无命中
  assert.deepEqual(applyFilter(set, { query: 'nope' }), []);
});

test('method 过滤：精确匹配且不区分大小写（REQ-007）', () => {
  const set = makeSet();
  assert.deepEqual(ids(applyFilter(set, { method: 'GET' })), [1, 3, 5]);
  assert.deepEqual(ids(applyFilter(set, { method: 'get' })), [1, 3, 5]);
  assert.deepEqual(ids(applyFilter(set, { method: 'POST' })), [2]);
  assert.deepEqual(ids(applyFilter(set, { method: 'DELETE' })), [4]);
  assert.deepEqual(applyFilter(set, { method: 'OPTIONS' }), []);
  // 不筛
  assert.deepEqual(ids(applyFilter(set, { method: '' })), [1, 2, 3, 4, 5]);
});

test('status 过滤：精确码（REQ-008）', () => {
  const set = makeSet();
  assert.deepEqual(ids(applyFilter(set, { status: '200' })), [1]);
  assert.deepEqual(ids(applyFilter(set, { status: '404' })), [3]);
  assert.deepEqual(ids(applyFilter(set, { status: 201 })), [2]); // 数字入参兼容
  assert.deepEqual(applyFilter(set, { status: '999' }), []);
});

test('status 过滤：码段 2xx/3xx/4xx/5xx（REQ-008）', () => {
  const set = makeSet();
  assert.deepEqual(ids(applyFilter(set, { status: '2xx' })), [1, 2]);
  assert.deepEqual(ids(applyFilter(set, { status: '3xx' })), [5]);
  assert.deepEqual(ids(applyFilter(set, { status: '4xx' })), [3]);
  assert.deepEqual(ids(applyFilter(set, { status: '5xx' })), [4]);
  // 大小写与短写
  assert.deepEqual(ids(applyFilter(set, { status: '2XX' })), [1, 2]);
});

test('resourceType 过滤：全值精确匹配、不区分大小写（REQ-009）', () => {
  const set = makeSet();
  assert.deepEqual(ids(applyFilter(set, { resourceType: 'xhr' })), [1, 4]);
  assert.deepEqual(ids(applyFilter(set, { resourceType: 'XHR' })), [1, 4]);
  assert.deepEqual(ids(applyFilter(set, { resourceType: 'image' })), [3]);
  assert.deepEqual(ids(applyFilter(set, { resourceType: 'document' })), [5]);
  // 非前缀匹配：'doc' 不应命中 'document'
  assert.deepEqual(applyFilter(set, { resourceType: 'doc' }), []);
});

test('多条件组合为 AND（REQ-006..009 / AC-003）', () => {
  const set = makeSet();
  const out = applyFilter(set, {
    query: 'example.com',
    method: 'GET',
    status: '2xx',
    resourceType: 'xhr',
  });
  assert.deepEqual(ids(out), [1]);

  // 去掉 resourceType 约束 → id5 因 status 302 被排除
  assert.deepEqual(
    ids(applyFilter(set, { query: 'example.com', method: 'GET', status: '2xx' })),
    [1],
  );

  // 三条件组合命中多条
  assert.deepEqual(
    ids(applyFilter(set, { query: 'USERS', method: 'GET', status: '2xx' })),
    [1],
  );

  // 组合无交集 → []
  assert.deepEqual(
    applyFilter(set, { query: 'logo', method: 'POST', status: '2xx', resourceType: 'xhr' }),
    [],
  );
});

test('applyFilter 容忍畸形记录（空/缺字段）', () => {
  const set = [null, undefined, {}, { id: 9, method: 'GET' }, { id: 10, status: 'abc' }];
  assert.doesNotThrow(() => applyFilter(set, { query: 'x' }));
  assert.deepEqual(ids(applyFilter(set, {})), [undefined, undefined, undefined, 9, 10]);
  // status 无法解析 → 任何 status 条件都不命中
  assert.deepEqual(applyFilter(set, { status: '2xx' }).map((r) => r && r.id), []);
  // method 命中
  assert.deepEqual(applyFilter(set, { method: 'get' }).map((r) => r && r.id), [9]);
});

test('collectOptions：去重 + 稳定排序', () => {
  const options = collectOptions(makeSet());
  assert.deepEqual(options.methods, ['DELETE', 'GET', 'POST']);
  assert.deepEqual(options.statuses, ['200', '201', '302', '404', '500']);
  assert.deepEqual(options.resourceTypes, ['document', 'fetch', 'image', 'xhr']);
});

test('collectOptions：空 / 异常输入返回空数组', () => {
  assert.deepEqual(collectOptions([]), { methods: [], statuses: [], resourceTypes: [] });
  assert.deepEqual(collectOptions(undefined), { methods: [], statuses: [], resourceTypes: [] });
  assert.deepEqual(collectOptions(null), { methods: [], statuses: [], resourceTypes: [] });
  assert.deepEqual(collectOptions([{}, null, { method: '', status: 0, resourceType: '' }]), {
    methods: [],
    statuses: [],
    resourceTypes: [],
  });
});

test('collectOptions：method 大小写归一去重、status 数值排序', () => {
  const options = collectOptions([
    { id: 1, method: 'get', status: 404, resourceType: 'XHR' },
    { id: 2, method: 'GET', status: 200, resourceType: 'xhr' },
    { id: 3, method: 'Post', status: 1000, resourceType: 'Fetch' },
  ]);
  assert.deepEqual(options.methods, ['GET', 'POST']);
  assert.deepEqual(options.statuses, ['200', '404', '1000']);
  assert.deepEqual(options.resourceTypes, ['Fetch', 'XHR', 'xhr']);
});

test('collectOptions 的输出可直接驱动 applyFilter（选项 → 过滤自洽）', () => {
  const set = makeSet();
  const options = collectOptions(set);
  for (const method of options.methods) {
    const out = applyFilter(set, { method });
    assert.ok(out.length > 0, 'method option should match: ' + method);
  }
  for (const status of options.statuses) {
    const out = applyFilter(set, { status });
    assert.ok(out.length > 0, 'status option should match: ' + status);
  }
  for (const rt of options.resourceTypes) {
    const out = applyFilter(set, { resourceType: rt });
    assert.ok(out.length > 0, 'resourceType option should match: ' + rt);
  }
});
