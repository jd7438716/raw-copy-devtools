// tests/capture.test.mjs — HAR entry 归一化 + onRequestFinished 注册 单元测试
// 运行: node --test "tests/capture.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalize,
  installCapture,
  DEFAULT_HTTP_VERSION,
} from '../extension/src/capture.js';
import { createStore } from '../extension/src/store.js';

/** 一条字段齐全的 HAR entry 样例（含扩展字段 _resourceType）。 */
function makeFullEntry() {
  return {
    startedDateTime: '2026-10-02T10:00:00.000Z',
    time: 123.45,
    _resourceType: 'xhr',
    request: {
      method: 'POST',
      url: 'https://api.example.com/v1/items?q=1',
      httpVersion: 'HTTP/2.0',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer token' },
      ],
      postData: { text: '{"a":1}\n' },
    },
    response: {
      status: 201,
      statusText: 'Created',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      content: {
        text: '{"ok":true}',
        mimeType: 'application/json',
        size: 11,
      },
    },
  };
}

test('normalize 完整 HAR entry 字段映射正确（REQ-035）', () => {
  const record = normalize(makeFullEntry());

  assert.equal(record.id, null);
  assert.equal(record.method, 'POST');
  assert.equal(record.url, 'https://api.example.com/v1/items?q=1');
  assert.equal(record.httpVersion, 'HTTP/2.0');
  assert.deepEqual(record.requestHeaders, [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Authorization', value: 'Bearer token' },
  ]);
  assert.equal(record.requestBody, '{"a":1}\n');
  assert.equal(record.status, 201);
  assert.equal(record.statusText, 'Created');
  assert.deepEqual(record.responseHeaders, [
    { name: 'Content-Type', value: 'application/json' },
  ]);
  assert.deepEqual(record.responseContent, {
    text: '{"ok":true}',
    encoding: null,
    mimeType: 'application/json',
    size: 11,
  });
  assert.equal(record.time, 123.45);
  assert.equal(record.startedDateTime, '2026-10-02T10:00:00.000Z');
  assert.equal(record.resourceType, 'xhr');
});

test('DEFAULT_HTTP_VERSION 为 HTTP/1.1', () => {
  assert.equal(DEFAULT_HTTP_VERSION, 'HTTP/1.1');
});

test('缺 httpVersion → 回退 HTTP/1.1（DEC-002）', () => {
  const entry = makeFullEntry();
  delete entry.request.httpVersion;
  assert.equal(normalize(entry).httpVersion, 'HTTP/1.1');

  entry.request.httpVersion = '';
  assert.equal(normalize(entry).httpVersion, 'HTTP/1.1');
});

test('缺 postData → requestBody 为 undefined', () => {
  const entry = makeFullEntry();
  delete entry.request.postData;
  assert.equal(normalize(entry).requestBody, undefined);
});

test('postData 存在但无 text → requestBody 为 undefined；text 为空串保留空串', () => {
  const entry = makeFullEntry();
  entry.request.postData = {};
  assert.equal(normalize(entry).requestBody, undefined);

  entry.request.postData = { text: '' };
  assert.equal(normalize(entry).requestBody, '');
});

test('响应状态与时间缺失时按契约降级（status=0 / statusText="" / time=0）', () => {
  const entry = makeFullEntry();
  delete entry.response.status;
  delete entry.response.statusText;
  delete entry.time;
  delete entry.startedDateTime;

  const record = normalize(entry);
  assert.equal(record.status, 0);
  assert.equal(record.statusText, '');
  assert.equal(record.time, 0);
  assert.equal(record.startedDateTime, '');
});

test('headers 缺失 → []；保持原始顺序（AC-014）', () => {
  const entry = makeFullEntry();
  delete entry.request.headers;
  delete entry.response.headers;
  const record = normalize(entry);
  assert.deepEqual(record.requestHeaders, []);
  assert.deepEqual(record.responseHeaders, []);

  const ordered = makeFullEntry();
  const names = normalize(ordered).requestHeaders.map((h) => h.name);
  assert.deepEqual(names, ['Content-Type', 'Authorization']);
});

test('响应体缺失 → 字段形状保留且 size 回退 0（不再把 null 作为期望终态）', () => {
  const entry = makeFullEntry();
  delete entry.response.content.text;
  delete entry.response.content.size;
  const record = normalize(entry);
  // 不再断言 text === null：缺陷正是「缺失即 null 被当作终态」。
  assert.ok(Object.prototype.hasOwnProperty.call(record.responseContent, 'text'));
  assert.equal(record.responseContent.size, 0);
});

test('size 缺失时由 text 长度反推', () => {
  const entry = makeFullEntry();
  delete entry.response.content.size;
  entry.response.content.text = 'abcde';
  assert.equal(normalize(entry).responseContent.size, 5);
});

test('resourceType 回退：_resourceType → resourceType → 空串', () => {
  const entry = makeFullEntry();
  delete entry._resourceType;
  entry.resourceType = 'fetch';
  assert.equal(normalize(entry).resourceType, 'fetch');

  delete entry.resourceType;
  assert.equal(normalize(entry).resourceType, '');
});

test('normalize 与 entry 解耦：不保留引用（headers/body 已复制）', () => {
  const entry = makeFullEntry();
  const record = normalize(entry);

  // 修改 entry 不应影响已归一化记录（headers 已复制为独立对象）
  entry.request.method = 'GET';
  entry.request.headers.push({ name: 'X', value: 'Y' });
  entry.response.content.text = 'MUTATED';

  assert.equal(record.method, 'POST');
  assert.equal(record.requestHeaders.length, 2);
  assert.equal(record.responseContent.text, '{"ok":true}');

  // 修改已归一化记录也不回写 entry（无别名共享）
  record.requestHeaders[0].name = 'Changed';
  assert.equal(entry.request.headers[0].name, 'Content-Type');
});

test('normalize 支持注入 id（数字或 {id}）', () => {
  assert.equal(normalize(makeFullEntry(), 42).id, 42);
  assert.equal(normalize(makeFullEntry(), { id: 7 }).id, 7);
  assert.equal(normalize(makeFullEntry(), 'nope').id, null);
});

test('normalize 对空 / 畸形输入不抛错', () => {
  assert.doesNotThrow(() => normalize(undefined));
  assert.doesNotThrow(() => normalize(null));
  assert.doesNotThrow(() => normalize({}));
  const record = normalize({});
  assert.equal(record.method, '');
  assert.equal(record.url, '');
  assert.equal(record.httpVersion, 'HTTP/1.1');
  assert.deepEqual(record.requestHeaders, []);
  assert.equal(record.requestBody, undefined);
  assert.equal(record.status, 0);
  assert.ok(Object.prototype.hasOwnProperty.call(record.responseContent, 'text'));
});

test('installCapture 在无 chrome（Node）时安全降级、不抛错', () => {
  const store = createStore({ capacity: 5 });
  let handle;
  assert.doesNotThrow(() => {
    handle = installCapture({ store });
  });
  assert.equal(typeof handle.uninstall, 'function');
  assert.doesNotThrow(() => handle.uninstall());
  assert.equal(store.size(), 0);
});

test('installCapture 注入 chrome：注册监听 → 归一化入 store → 回调 → 卸载', () => {
  const listeners = [];
  const fakeChrome = {
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

  const store = createStore({ capacity: 10 });
  const added = [];
  const handle = installCapture({
    store,
    onAdd: (record, id) => added.push({ record, id }),
    chrome: fakeChrome,
  });

  assert.equal(listeners.length, 1);
  listeners[0](makeFullEntry());

  assert.equal(store.size(), 1);
  assert.equal(added.length, 1);
  assert.equal(added[0].record.method, 'POST');
  assert.equal(added[0].record.id, added[0].id);
  assert.equal(store.get(added[0].id).url, 'https://api.example.com/v1/items?q=1');

  // 卸载后不再有监听器；重复卸载幂等
  assert.doesNotThrow(() => handle.uninstall());
  assert.equal(listeners.length, 0);
  assert.doesNotThrow(() => handle.uninstall());
});

test('installCapture 在 store 缺失时安全降级', () => {
  assert.doesNotThrow(() => installCapture({}));
  const handle = installCapture({});
  assert.equal(typeof handle.uninstall, 'function');
});

/* ------------------------------------------------------------------------- *
 * TASK-005 / DEL-005 — 缺失 content.text + getContent 路径（REQ-011/012）
 * ------------------------------------------------------------------------- */

/** 构造一个只注册监听器的假 chrome（installCapture 测试辅助）。 */
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

/** 让微任务队列排空（enrich 为异步步骤）。 */
function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test('缺失 content.text + 提供回调式 getContent → enrich 回填同一条记录（REQ-012a / AC-001/005）', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeFullEntry();
  delete entry.response.content.text;
  entry.response.content.size = 395;
  let called = 0;
  entry.getContent = (cb) => {
    called += 1;
    cb('{"error":"invalid_grant"}', null);
  };

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);

  const record = store.get(1);
  assert.ok(record);
  assert.equal(store.isPending(1), true);

  await flushMicrotasks();

  assert.equal(called, 1);
  assert.equal(store.get(1), record, '回填必须写回同一条记录（引用一致）');
  assert.equal(record.responseContent.text, '{"error":"invalid_grant"}');
  assert.equal(record.responseContent.size, 395, '已有 size 不被覆盖');
  assert.equal(store.isPending(1), false);
});

test('缺失 content.text + 无 getContent → 不抛错、记录保持无正文（客观不可获取）', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeFullEntry();
  delete entry.response.content.text;

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  assert.doesNotThrow(() => listeners[0](entry));
  await flushMicrotasks();

  const record = store.get(1);
  assert.equal(record.responseContent.text, null);
  assert.equal(store.isPending(1), false);
});

test('已有 content.text 时不触发 getContent（不误 enrich）', async () => {
  const listeners = [];
  const store = createStore({ capacity: 10 });
  const entry = makeFullEntry();
  let called = 0;
  entry.getContent = (cb) => {
    called += 1;
    cb('SHOULD_NOT_BE_USED', null);
  };

  installCapture({ store, chrome: makeFakeChrome(listeners) });
  listeners[0](entry);
  await flushMicrotasks();

  assert.equal(called, 0);
  assert.equal(store.get(1).responseContent.text, '{"ok":true}');
});
