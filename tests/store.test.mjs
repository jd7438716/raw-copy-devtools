// tests/store.test.mjs — 请求记录内存缓存（环形缓冲）单元测试
// 运行: node --test "tests/store.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore, DEFAULT_CAPACITY } from '../extension/src/store.js';

test('DEFAULT_CAPACITY 为 1000（REQ-004 / AC-013）', () => {
  assert.equal(DEFAULT_CAPACITY, 1000);
  const store = createStore();
  assert.equal(store.size(), 0);
});

test('add 1001 条 → size()===1000，首条被淘汰、末条保留', () => {
  const store = createStore({ capacity: 1000 });

  let firstId = null;
  for (let i = 0; i < 1001; i += 1) {
    const id = store.add({ url: 'https://example.test/' + i, index: i });
    if (i === 0) {
      firstId = id;
    }
  }

  assert.equal(store.size(), 1000);
  // 首条（index 0）已被淘汰
  assert.equal(store.get(firstId), undefined);
  const all = store.all();
  assert.equal(all.length, 1000);
  assert.equal(all[0].index, 1);
  assert.equal(all[999].index, 1000);
  // 末条保留且可取回
  assert.equal(store.get(all[999].id).index, 1000);
});

test('环形缓冲：capacity=3 追加 5 条后仅保留最近 3 条且顺序为最旧→最新', () => {
  const store = createStore({ capacity: 3 });
  ['a', 'b', 'c', 'd', 'e'].forEach((v) => store.add({ v }));

  assert.equal(store.size(), 3);
  assert.deepEqual(
    store.all().map((r) => r.v),
    ['c', 'd', 'e']
  );
});

test('get / all / clear 行为正确', () => {
  const store = createStore({ capacity: 5 });
  const id1 = store.add({ url: 'one' });
  const id2 = store.add({ url: 'two' });

  assert.equal(typeof id1, 'number');
  assert.equal(id2, id1 + 1);
  assert.equal(store.size(), 2);

  assert.equal(store.get(id1).url, 'one');
  assert.equal(store.get(id2).url, 'two');
  assert.equal(store.get(9999), undefined);

  assert.deepEqual(
    store.all().map((r) => r.url),
    ['one', 'two']
  );

  store.clear();
  assert.equal(store.size(), 0);
  assert.equal(store.get(id1), undefined);
  assert.deepEqual(store.all(), []);
});

test('add 对同一条记录返回稳定且唯一的递增 id', () => {
  const store = createStore({ capacity: 10 });
  const a = store.add({});
  const b = store.add({});
  const c = store.add({});
  assert.ok(a < b && b < c);
  assert.equal(new Set([a, b, c]).size, 3);
  assert.equal(store.get(a).id, a);
});

test('add 支持调用方注入唯一 id', () => {
  const store = createStore({ capacity: 10 });
  const id = store.add({ id: 42, url: 'injected' });
  assert.equal(id, 42);
  assert.equal(store.get(42).url, 'injected');
  // 后续自动分配不与注入 id 冲突
  const next = store.add({ url: 'auto' });
  assert.ok(next > 42);
});

test('subscribe 每次 add 收到事件且含被淘汰 id', () => {
  const store = createStore({ capacity: 3 });
  const events = [];
  const unsubscribe = store.subscribe((event) => events.push(event));

  const a = store.add({ v: 'a' }); // id 1
  store.add({ v: 'b' }); // id 2
  store.add({ v: 'c' }); // id 3
  const d = store.add({ v: 'd' }); // id 4 → 淘汰 id 1

  assert.equal(events.length, 4);
  assert.equal(events[0].type, 'add');
  assert.equal(events[0].id, a);
  assert.equal(events[0].evicted, null);
  assert.equal(events[3].id, d);
  assert.equal(events[3].evicted, a);
  assert.equal(events[3].record.v, 'd');

  // 取消订阅后不再收到通知
  unsubscribe();
  store.add({ v: 'e' });
  assert.equal(events.length, 4);
});

test('subscribe 隔离抛错的订阅者，不影响其他订阅者与 store', () => {
  const store = createStore({ capacity: 5 });
  let good = 0;
  store.subscribe(() => {
    throw new Error('boom');
  });
  store.subscribe(() => {
    good += 1;
  });

  assert.doesNotThrow(() => store.add({ v: 'x' }));
  assert.equal(good, 1);
  assert.equal(store.size(), 1);
});

test('clear 通知 { type: "clear" }', () => {
  const store = createStore({ capacity: 5 });
  const events = [];
  store.subscribe((event) => events.push(event));
  store.add({ v: 'a' });
  store.clear();
  assert.equal(events.length, 2);
  assert.equal(events[1].type, 'clear');
});

/* ------------------------------------------------------------------------- *
 * TASK-007 / DEL-003 — update / 字节预算 / pending 注册表
 * ------------------------------------------------------------------------- */

test('update(id, patch) 原地合并、返回 true、emit update；未知 id 返回 false 且不创建', () => {
  const store = createStore({ capacity: 10 });
  const events = [];
  store.subscribe((event) => events.push(event));

  const id = store.add({
    responseContent: { text: null, encoding: null, mimeType: 'application/json', size: 0 },
  });
  const ref = store.get(id);

  const ok = store.update(id, {
    responseContent: { text: '{"ok":true}', encoding: null, mimeType: 'application/json', size: 11 },
  });

  assert.equal(ok, true);
  assert.equal(store.get(id), ref, '回填必须保持同一条记录引用（AC-005）');
  assert.equal(ref.responseContent.text, '{"ok":true}');

  const updates = events.filter((e) => e.type === 'update');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, id);
  assert.equal(updates[0].record, ref);

  // 未命中：不创建幽灵记录、不复活陈旧 id
  assert.equal(store.update(9999, { v: 'ghost' }), false);
  assert.equal(store.get(9999), undefined);
  assert.equal(store.size(), 1);
});

test('update 重复调用幂等（以最后一次为准）且不改变环形顺序', () => {
  const store = createStore({ capacity: 3 });
  ['a', 'b', 'c'].forEach((v) => store.add({ v }));
  const ids = store.all().map((r) => r.id);

  assert.equal(store.update(ids[1], { v: 'b2' }), true);
  assert.equal(store.update(ids[1], { v: 'b3' }), true);

  assert.deepEqual(store.all().map((r) => r.v), ['a', 'b3', 'c']);
  assert.deepEqual(store.all().map((r) => r.id), ids);
});

test('bytesInUse 随 add 增长；maxBytes 超限淘汰最旧且有界（evict 事件）', () => {
  const store = createStore({ capacity: 100, maxBytes: 400 });
  const events = [];
  store.subscribe((event) => events.push(event));

  for (let i = 0; i < 10; i += 1) {
    store.add({ responseContent: { text: 'x'.repeat(200) } });
  }

  assert.ok(store.bytesInUse() <= 400, '占用必须有界（AC-009）');
  assert.ok(store.size() < 10, '超限必须淘汰最旧');
  assert.ok(
    events.some((e) => e.type === 'evict' && e.reason === 'maxBytes'),
    '必须发 evict 事件（供 selection.onEvict）'
  );
  // 顺序仍为最旧→最新
  const all = store.all();
  for (let i = 1; i < all.length; i += 1) {
    assert.ok(all[i].id > all[i - 1].id, '环形顺序不变（AC-008）');
  }
});

test('update 增量入账后超预算同样触发淘汰', () => {
  const store = createStore({ capacity: 10, maxBytes: 500 });
  const a = store.add({ responseContent: { text: 'a' } });
  store.add({ responseContent: { text: 'b' } });
  assert.equal(store.size(), 2);

  // 让最早一条正文膨胀到超预算
  store.update(a, { responseContent: { text: 'y'.repeat(1000) } });

  assert.ok(store.bytesInUse() <= 500);
  assert.ok(store.size() < 2);
  assert.equal(store.get(a), undefined, '膨胀记录自身最旧时被淘汰');
});

test('pending：markPending → awaitPending resolve/reject；重复结算幂等', async () => {
  const store = createStore({ capacity: 5 });

  store.markPending(101);
  assert.equal(store.isPending(101), true);
  const p1 = store.awaitPending(101, 1000);
  assert.equal(store.resolvePending(101, true), true);
  assert.equal(await p1, true);
  assert.equal(store.isPending(101), false);
  assert.equal(store.resolvePending(101, true), false, '重复 resolve 幂等');

  store.markPending(102);
  const p2 = store.awaitPending(102, 1000);
  assert.equal(store.rejectPending(102, 'boom'), true);
  await assert.rejects(p2, /boom/);

  // 无 pending 的记录：await 立即 resolve true（不挂起）
  assert.equal(await store.awaitPending(103, 10), true);
});

test('pending：超时以 E_PENDING_TIMEOUT 终止，不永久挂起', async () => {
  const store = createStore({ capacity: 5 });
  store.markPending(201);
  await assert.rejects(
    store.awaitPending(201, 20),
    (err) => err && err.code === 'E_PENDING_TIMEOUT'
  );
  store.rejectPending(201, 'cleanup');
});

test('pending：记录被环形淘汰 / clear 时结算，无悬空 Promise', async () => {
  const store = createStore({ capacity: 2 });

  const a = store.add({ responseContent: { text: 'a' } });
  store.add({ responseContent: { text: 'b' } }); // 满
  store.markPending(a);
  const pEvict = store.awaitPending(a, 1000);
  store.add({ responseContent: { text: 'c' } }); // 淘汰 a

  await assert.rejects(pEvict, /evicted/);
  assert.equal(store.isPending(a), false);

  const d = store.add({ responseContent: { text: 'd' } });
  store.markPending(d);
  const pClear = store.awaitPending(d, 1000);
  store.clear();
  await assert.rejects(pClear, /clear/);
  assert.equal(store.isPending(d), false);
});

test('默认 maxBytes 为 64MB，且可配置', () => {
  const def = createStore();
  assert.equal(def.bytesInUse(), 0);
  const tiny = createStore({ capacity: 10, maxBytes: 1 });
  tiny.add({ responseContent: { text: 'x'.repeat(100) } });
  // 单条即超预算 → 被自身淘汰，最终为空
  assert.equal(tiny.size(), 0);
  assert.equal(tiny.bytesInUse(), 0);
});
