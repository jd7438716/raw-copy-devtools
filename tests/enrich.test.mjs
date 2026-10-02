// tests/enrich.test.mjs — getContent 异步 enrich（双形态 / 竞态 / 编码 / 字符级保真 / 401）
// 运行: node --test "tests/enrich.test.mjs"
//
// 覆盖 TASK-006（DEL-006 / REQ-012b..e / REQ-013 / REQ-014 / AC-002 单测侧 / AC-004 / AC-010）。
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalize, installCapture } from '../extension/src/capture.js';
import { createStore } from '../extension/src/store.js';
import { classifyBody } from '../extension/src/content.js';
import { buildCopyText } from '../extension/src/formatter.js';

/** 假 chrome：只提供 onRequestFinished 注册。 */
function makeFakeChrome(listeners) {
  return {
    devtools: {
      network: {
        onRequestFinished: {
          addListener(cb) {
            listeners.push(cb);
          },
          removeListener(cb) {
            const i = listeners.indexOf(cb);
            if (i >= 0) {
              listeners.splice(i, 1);
            }
          },
        },
      },
    },
  };
}

/** 排空微任务/定时器。 */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * 一条「同步 HAR 无 content.text、但提供 getContent」的 entry（目标 401 场景）。
 *
 * @param {Object} content getContent 返回的正文描述
 * @returns {Object}
 */
function makeNoTextEntry({ status = 401, mimeType = 'application/json; charset=utf-8', size = 395, body = '' } = {}) {
  return {
    startedDateTime: '2026-10-02T10:00:00.000Z',
    time: 88.8,
    _resourceType: 'xhr',
    request: {
      method: 'POST',
      url: 'https://auth.autional.cn/bff/identity/api/v1/auth/login',
      httpVersion: 'HTTP/2.0',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      postData: { text: '{"username":"u","password":"p"}' },
    },
    response: {
      status,
      statusText: 'Unauthorized',
      headers: [
        { name: 'content-type', value: mimeType },
        { name: 'content-length', value: String(size) },
      ],
      content: { mimeType, size },
    },
    __body: body,
  };
}

/* ------------------------------------------------------------------------- *
 * (a)(b) 双形态 getContent → 回填同一条记录（REQ-012a/b, AC-001/005 支撑）
 * ------------------------------------------------------------------------- */

test('(b) 回调式 getContent(content, encoding) → 回填同一条记录', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeNoTextEntry({ body: '{"a":1}' });
  entry.getContent = (cb) => cb('{"a":1}', null);

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);

  const record = store.get(1);
  assert.ok(store.isPending(1));
  await flush();

  assert.equal(store.get(1), record, '引用一致');
  assert.equal(record.responseContent.text, '{"a":1}');
  assert.equal(store.isPending(1), false);
});

test('(b) Promise 式 getContent() → 回填同一条记录（Chrome 151+ 形态）', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeNoTextEntry({ body: '{"b":2}' });
  entry.getContent = () => Promise.resolve({ content: '{"b":2}', encoding: null });

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);

  const record = store.get(1);
  await flush();

  assert.equal(store.get(1), record);
  assert.equal(record.responseContent.text, '{"b":2}');
});

test('(b) Promise 式 getContent() resolve { text, encoding } 亦兼容', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeNoTextEntry({ body: 'hello' });
  entry.getContent = () => Promise.resolve({ text: 'hello', encoding: null });

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush();

  assert.equal(store.get(1).responseContent.text, 'hello');
});

/* ------------------------------------------------------------------------- *
 * (c) base64 + 文本 MIME → encoding 合并 + 正确解码（REQ-004 / AC-006）
 * ------------------------------------------------------------------------- */

test('(c) base64 + 文本 MIME：encoding 合并进记录，classifyBody 得 base64-text 且 UTF-8 正确', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const original = '{"msg":"你好，世界😀","emoji":"🎉"}';
  const encoded = Buffer.from(original, 'utf8').toString('base64');
  const entry = makeNoTextEntry({ body: encoded });
  entry.getContent = (cb) => cb(encoded, 'base64');

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush();

  const record = store.get(1);
  assert.equal(record.responseContent.encoding, 'base64', 'encoding 被合并');
  const classified = classifyBody(record.responseContent);
  assert.equal(classified.kind, 'base64-text');
  assert.equal(classified.text, original);
});

/* ------------------------------------------------------------------------- *
 * (d) 字符级保真（REQ-013 / ADR-006 / AC-002 单测侧）
 * ------------------------------------------------------------------------- */

test('(d) 字符级保真：换行/Unicode/引号/反斜杠/不转义 → 逐 UTF-16 码元相等', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const original = '{\n  "a": 1,\n  "b": "x\\ny",\n  "c": "\\u4f60\\u597d",\n  "d": "😀"\n}\n';
  const entry = makeNoTextEntry({ body: original });
  entry.getContent = (cb) => cb(original, null);

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush();

  const record = store.get(1);
  assert.equal(record.responseContent.text.length, original.length);
  for (let i = 0; i < original.length; i += 1) {
    assert.equal(
      record.responseContent.text.charCodeAt(i),
      original.charCodeAt(i),
      '码元 #' + i
    );
  }
  // 复制输出（模式 A）中的 [Response Body] 段落逐字符原样
  const out = buildCopyText(record, 'formatted', { responseBody: record.responseContent.text });
  assert.ok(out.includes('[Response Body]'));
  assert.ok(out.endsWith(original));
});

/* ------------------------------------------------------------------------- *
 * (e) 401 错误响应体复现基线（REQ-013 / AC-002）
 * ------------------------------------------------------------------------- */

test('(e) 401 错误响应体完整取回：不美化 JSON、不截断、逐字符一致', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const body =
    '{"timestamp":"2026-10-02T10:00:00.000+00:00","status":401,"error":"Unauthorized","message":"Bad credentials","path":"/bff/identity/api/v1/auth/login"}';
  const entry = makeNoTextEntry({ status: 401, size: Buffer.byteLength(body, 'utf8'), body });
  entry.getContent = (cb) => cb(body, null);

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush();

  const record = store.get(1);
  assert.equal(record.status, 401);
  assert.equal(record.responseContent.text, body);
  // 未被美化：与原文完全一致（含无空格的紧凑 JSON）
  assert.equal(record.responseContent.text, JSON.stringify(JSON.parse(body)));
  const classified = classifyBody(record.responseContent);
  assert.equal(classified.kind, 'text');
  assert.equal(classified.text, body);
});

/* ------------------------------------------------------------------------- *
 * 竞态：pending 期间 await；回填后 resolve；超时可终止（REQ-012 / AC-007 支撑）
 * ------------------------------------------------------------------------- */

test('竞态：pending 期间 awaitPending 挂起，getContent 回调后 resolve 并读到正文', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeNoTextEntry({ body: '{"late":true}' });
  let release = null;
  entry.getContent = (cb) => {
    release = cb;
  };

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush(); // 让 enrich 任务执行到 getContent（等待回调）

  const id = 1;
  assert.equal(store.isPending(id), true, '未回调期间为 pending');

  const waiting = store.awaitPending(id, 1000);
  release('{"late":true}', null);
  const value = await waiting;

  assert.equal(value, true);
  assert.equal(store.get(id).responseContent.text, '{"late":true}');
  assert.equal(store.isPending(id), false);
});

test('竞态：awaitPending 超时以可区分错误返回，不永久挂起', async () => {
  const store = createStore({ capacity: 10 });
  store.markPending(777);
  let err = null;
  try {
    await store.awaitPending(777, 20);
  } catch (e) {
    err = e;
  }
  assert.ok(err, '超时必须以错误终止');
  assert.equal(err.code, 'E_PENDING_TIMEOUT');
  store.rejectPending(777, 'cleanup');
});

/* ------------------------------------------------------------------------- *
 * (f) normalize 纯同步（AC-004 测试侧）
 * ------------------------------------------------------------------------- */

test('(f) normalize 仍为纯同步：返回值非 Promise / 无 then；enrich 为独立步骤', () => {
  const record = normalize(makeNoTextEntry());
  assert.equal(typeof record.then, 'undefined');
  assert.ok(!(record instanceof Promise));
});

/* ------------------------------------------------------------------------- *
 * 客观不可获取 / 淘汰后回填被丢弃
 * ------------------------------------------------------------------------- */

test('无 getContent → 记录保持无正文且不 pending（占位合法性由 panel 判定）', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeNoTextEntry();
  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flush();
  assert.equal(store.get(1).responseContent.text, null);
  assert.equal(store.isPending(1), false);
});

test('回填前记录已被淘汰（get(id) !== record）→ 丢弃、不写陈旧对象', async () => {
  const listeners = [];
  const store = createStore({ capacity: 1 });
  const entry = makeNoTextEntry({ body: '{"stale":true}' });
  let release = null;
  entry.getContent = (cb) => {
    release = cb;
  };

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry); // id 1
  await flush();

  // 写第二条触发环形淘汰（capacity=1 → 淘汰 id 1）
  store.add({ responseContent: { text: 'OTHER' } });

  const staleRecord = store.get(1);
  assert.equal(staleRecord, undefined);

  release('{"stale":true}', null);
  await flush();

  // 陈旧记录未被复活；淘汰事件已结算 pending
  assert.equal(store.get(1), undefined);
  assert.equal(store.isPending(1), false);
});
