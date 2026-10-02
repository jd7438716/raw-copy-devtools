/**
 * detail.test.mjs — 双击明细视图逻辑单元测试（TASK-008 / DEL-004）
 *
 * 覆盖（验收锚点 AC-008 / AC-009 / AC-010 / AC-011（文本口径） / ADR-017 / ADR-018）：
 *   - buildDetailText：与 `buildCopyText(record, MODE_A, {responseBody})` **逐字符相等**；
 *     六要素齐全且顺序正确；输入降级（缺请求体 / 空响应体 / 缺状态码 / 非对象）；
 *     不随 `copyMode`（A/B）变化；响应头保持原始顺序、响应体逐字符原样。
 *   - createDetailView：开合状态机 open/close/isOpen/currentId；幂等；非法 id；
 *     onEvict 自动关闭；resolveText / onClose 异常隔离；textContent 注入 + hidden 切换。
 *   - 安全静态断言：`extension/src/detail.js` 不含 `innerHTML`。
 *
 * 纯逻辑零 DOM 依赖：元素桩为最小鸭子类型（真实属性名，非测试框架 mock）。
 * 运行：node --test "tests/detail.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildDetailText, createDetailView } from '../extension/src/detail.js';
import { buildCopyText, MODE_A, MODE_B } from '../extension/src/formatter.js';

/* ------------------------------------------------------------------------- *
 * 夹具
 * ------------------------------------------------------------------------- */

/** 典型 xhr 记录：六要素齐全，含 CJK/emoji。 */
function makeRecord(overrides = {}) {
  return Object.assign(
    {
      id: 1,
      method: 'POST',
      url: 'https://api.example.com/v1/items?q=1&lang=zh',
      httpVersion: 'HTTP/2',
      status: 201,
      statusText: 'Created',
      requestHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'X-Token', value: 'abc' },
      ],
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Set-Cookie', value: 'sid=1' },
      ],
      requestBody: '{"name":"张三","emoji":"😀"}',
      responseContent: {
        text: '{"ok":true,"data":"响应体😀"}',
        mimeType: 'application/json',
        size: 30,
      },
      startedDateTime: '2026-10-02T00:00:00.000Z',
      time: 12.5,
      resourceType: 'xhr',
    },
    overrides,
  );
}

/** 复制口径的响应体解析器（等价 panel.resolveResponseBodyText 的文本分支）。 */
function resolveBody(record) {
  return record && record.responseContent ? record.responseContent.text : '';
}

/* ------------------------------------------------------------------------- *
 * buildDetailText — 口径恒等于模式 A（逐字符）
 * ------------------------------------------------------------------------- */

test('buildDetailText：与 buildCopyText(MODE_A,{responseBody}) 逐字符相等', () => {
  const record = makeRecord();
  const expected = buildCopyText(record, MODE_A, { responseBody: resolveBody(record) });
  assert.strictEqual(buildDetailText(record, resolveBody), expected);
});

test('buildDetailText：非 ASCII（CJK/emoji/空白/转义）逐字符保真', () => {
  const body = '  前导空格\n\t制表\t\n{"k":"值😀"}\n尾随空格   ';
  const record = makeRecord({ responseContent: { text: body, mimeType: 'application/json' } });
  assert.strictEqual(
    buildDetailText(record, resolveBody),
    buildCopyText(record, MODE_A, { responseBody: body }),
  );
});

test('buildDetailText：不随 copyMode 变化（恒为模式 A）', () => {
  const record = makeRecord();
  const modeAVariant = buildCopyText(record, MODE_A, { responseBody: resolveBody(record) });
  const modeBVariant = buildCopyText(record, MODE_B, { responseBody: resolveBody(record) });
  // 有 META 段时 A/B 必然不同（否则该断言无意义）。
  assert.notStrictEqual(modeAVariant, modeBVariant);

  // 模拟面板 copyMode 在两个值之间切换：详情产物始终等于模式 A。
  let copyMode = MODE_B;
  assert.strictEqual(buildDetailText(record, resolveBody), modeAVariant);
  copyMode = MODE_A;
  assert.strictEqual(buildDetailText(record, resolveBody), modeAVariant);
  void copyMode;
});

/* ------------------------------------------------------------------------- *
 * buildDetailText — 六要素（AC-008）
 * ------------------------------------------------------------------------- */

test('buildDetailText：六要素齐全且顺序正确（方法+URL/请求头/请求体/状态+文本/响应头/响应体）', () => {
  const record = makeRecord();
  const text = buildDetailText(record, resolveBody);

  const methodUrl = 'POST https://api.example.com/v1/items?q=1&lang=zh HTTP/2';
  const reqHeader = 'X-Token: abc';
  const reqBodyLabel = '[Request Body]';
  const statusLine = 'HTTP/2 201 Created';
  const respHeader = 'Set-Cookie: sid=1';
  const respBodyLabel = '[Response Body]';

  const at = (needle) => {
    const i = text.indexOf(needle);
    assert.notStrictEqual(i, -1, '缺少要素: ' + needle);
    return i;
  };

  const order = [
    at(methodUrl),
    at(reqHeader),
    at(reqBodyLabel),
    at(statusLine),
    at(respHeader),
    at(respBodyLabel),
  ];
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(order[i] > order[i - 1], '要素顺序错误 @' + i);
  }

  // 请求体 / 响应体原文完整出现。
  assert.ok(text.includes(record.requestBody));
  assert.ok(text.includes(record.responseContent.text));
});

test('buildDetailText：响应/请求头保持原始顺序（不排序、不合并）', () => {
  const record = makeRecord({
    responseHeaders: [
      { name: 'Z-Last', value: '1' },
      { name: 'A-First', value: '2' },
      { name: 'Z-Last', value: '3' },
    ],
  });
  const text = buildDetailText(record, resolveBody);
  const iZ1 = text.indexOf('Z-Last: 1');
  const iA = text.indexOf('A-First: 2');
  const iZ2 = text.indexOf('Z-Last: 3');
  assert.ok(iZ1 !== -1 && iA !== -1 && iZ2 !== -1);
  assert.ok(iZ1 < iA && iA < iZ2, '头顺序必须原样保留');
});

/* ------------------------------------------------------------------------- *
 * buildDetailText — 输入降级（formatter 既有语义）
 * ------------------------------------------------------------------------- */

test('buildDetailText：缺请求体 → 无 [Request Body]，响应体仍在，且与模式 A 逐字符相等', () => {
  const record = makeRecord({ requestBody: '' });
  const text = buildDetailText(record, resolveBody);
  assert.ok(!text.includes('[Request Body]'));
  assert.ok(text.includes('[Response Body]'));
  assert.strictEqual(
    text,
    buildCopyText(record, MODE_A, { responseBody: resolveBody(record) }),
  );
});

test('buildDetailText：空响应体 → 无 [Response Body]，响应起始行仍在', () => {
  const record = makeRecord({ responseContent: { text: '', mimeType: 'application/json' } });
  const text = buildDetailText(record, resolveBody);
  assert.ok(!text.includes('[Response Body]'));
  assert.ok(text.includes('HTTP/2 201 Created'));
  assert.strictEqual(
    text,
    buildCopyText(record, MODE_A, { responseBody: resolveBody(record) }),
  );
});

test('buildDetailText：状态码缺失 → 回退 0；statusText 空 → 仅版本+码', () => {
  const record = makeRecord({ status: undefined, statusText: '' });
  const text = buildDetailText(record, resolveBody);
  assert.ok(text.includes('HTTP/2 0'));
  assert.strictEqual(
    text,
    buildCopyText(record, MODE_A, { responseBody: resolveBody(record) }),
  );
});

test('buildDetailText：record 非对象 → 与 formatter 一致返回空串', () => {
  assert.strictEqual(buildDetailText(null, resolveBody), buildCopyText(null, MODE_A));
  assert.strictEqual(buildDetailText(null, resolveBody), '');
  assert.strictEqual(buildDetailText(undefined, resolveBody), '');
  assert.strictEqual(buildDetailText('nope', resolveBody), '');
});

test('buildDetailText：resolveBody 非函数 → 回退 formatter 的 responseContent.text 路径', () => {
  const record = makeRecord();
  assert.strictEqual(buildDetailText(record, undefined), buildCopyText(record, MODE_A));
  assert.strictEqual(buildDetailText(record, 'not-a-fn'), buildCopyText(record, MODE_A));
  assert.strictEqual(buildDetailText(record, undefined), buildCopyText(record, MODE_A, {}));
});

test('buildDetailText：注入分类占位（binary/base64）时与复制口径一致', () => {
  const record = makeRecord();
  const placeholder = '[Binary content omitted: image/png, 2048 bytes]';
  const resolvePlaceholder = () => placeholder;
  const text = buildDetailText(record, resolvePlaceholder);
  assert.ok(text.includes(placeholder));
  assert.strictEqual(
    text,
    buildCopyText(record, MODE_A, { responseBody: placeholder }),
  );
});

/* ------------------------------------------------------------------------- *
 * createDetailView — 开合状态机（纯逻辑）
 * ------------------------------------------------------------------------- */

test('createDetailView：初始关闭；open/close/isOpen/currentId 状态流转', () => {
  const view = createDetailView();
  assert.equal(view.isOpen(), false);
  assert.equal(view.currentId(), null);

  assert.equal(view.open(7), true);
  assert.equal(view.isOpen(), true);
  assert.equal(view.currentId(), 7);

  assert.equal(view.close(), true);
  assert.equal(view.isOpen(), false);
  assert.equal(view.currentId(), null);
});

test('createDetailView：close 幂等（已关闭再关 → false，无副作用）', () => {
  const view = createDetailView();
  assert.equal(view.close(), false);

  view.open(1);
  assert.equal(view.close(), true);
  assert.equal(view.close(), false);
});

test('createDetailView：open 新 id 覆盖当前（详情同时最多一条）', () => {
  const view = createDetailView();
  view.open(1);
  assert.equal(view.open(2), true);
  assert.equal(view.currentId(), 2);
  assert.equal(view.isOpen(), true);
});

test('createDetailView：open(null/undefined) 拒绝且不改变状态', () => {
  const view = createDetailView();
  view.open(5);
  assert.equal(view.open(null), false);
  assert.equal(view.open(undefined), false);
  assert.equal(view.currentId(), 5, '非法 open 不得清空当前');
  assert.equal(view.isOpen(), true);
});

test('createDetailView：onEvict 命中当前项 → 自动关闭并返回 true（ADR-018）', () => {
  const view = createDetailView();
  view.open(42);
  assert.equal(view.onEvict(7), false);
  assert.equal(view.isOpen(), true);
  assert.equal(view.onEvict(42), true);
  assert.equal(view.isOpen(), false);
  assert.equal(view.currentId(), null);
});

test('createDetailView：onEvict 在未打开时恒为 false，不抛', () => {
  const view = createDetailView();
  assert.equal(view.onEvict(1), false);
  assert.equal(view.onEvict(null), false);
});

test('createDetailView：open 时以 textContent 注入 resolveText(id) 结果', () => {
  const body = { textContent: '', hidden: true };
  const container = { hidden: true, contains: () => true };
  const seen = [];
  const view = createDetailView({
    container,
    body,
    resolveText(id) {
      seen.push(id);
      return 'DETAIL:' + id;
    },
  });

  view.open(3);
  assert.deepEqual(seen, [3]);
  assert.equal(body.textContent, 'DETAIL:3');
  assert.equal(container.hidden, false);

  view.close();
  assert.equal(body.textContent, '');
  assert.equal(container.hidden, true);
});

test('createDetailView：未提供 body 时退化为写入 container.textContent', () => {
  const container = { textContent: '', hidden: true };
  const view = createDetailView({ container, resolveText: () => 'X' });
  view.open(1);
  assert.equal(container.textContent, 'X');
  assert.equal(container.hidden, false);
});

test('createDetailView：无 DOM（纯逻辑）时状态机照常工作', () => {
  const view = createDetailView({});
  assert.equal(view.open(9), true);
  assert.equal(view.currentId(), 9);
  assert.equal(view.close(), true);
});

test('createDetailView：onClose 收到被关闭的 id，且 close 返回值不受回调影响', () => {
  const closed = [];
  const view = createDetailView({ onClose: (id) => closed.push(id) });
  view.open(11);
  assert.equal(view.close(), true);
  assert.deepEqual(closed, [11]);
});

test('createDetailView：onClose 抛异常被隔离（不外抛，状态仍正确关闭）', () => {
  const view = createDetailView({
    onClose() {
      throw new Error('boom');
    },
  });
  view.open(1);
  assert.doesNotThrow(() => view.close());
  assert.equal(view.isOpen(), false);
  assert.equal(view.currentId(), null);
});

test('createDetailView：resolveText 抛异常被隔离 → 仍打开，文本为空', () => {
  const body = { textContent: 'stale', hidden: true };
  const view = createDetailView({
    body,
    resolveText() {
      throw new Error('boom');
    },
  });
  let ok;
  assert.doesNotThrow(() => {
    ok = view.open(1);
  });
  assert.equal(ok, true);
  assert.equal(view.isOpen(), true);
  assert.equal(body.textContent, '');
});

test('createDetailView：resolveText 返回非字符串 → 宽松转字符串', () => {
  const body = { textContent: '', hidden: true };
  const view = createDetailView({ body, resolveText: () => 12345 });
  view.open(1);
  assert.equal(body.textContent, '12345');
});

test('createDetailView：多次 open/close 往返后状态稳定', () => {
  const body = { textContent: '', hidden: true };
  const view = createDetailView({ body, resolveText: (id) => 'T' + id });
  for (let i = 0; i < 3; i += 1) {
    view.open(i);
    assert.equal(view.isOpen(), true);
    assert.equal(view.currentId(), i);
    assert.equal(body.textContent, 'T' + i);
    view.close();
    assert.equal(view.isOpen(), false);
    assert.equal(body.textContent, '');
  }
});

/* ------------------------------------------------------------------------- *
 * 安全静态断言
 * ------------------------------------------------------------------------- */

test('detail.js 源码不含 innerHTML（强制 textContent，防注入）', () => {
  const src = readFileSync(new URL('../extension/src/detail.js', import.meta.url), 'utf8');
  assert.ok(!/innerHTML/.test(src), 'detail.js 不得出现 innerHTML');
});
