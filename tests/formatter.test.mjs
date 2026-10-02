/**
 * formatter.test.mjs — 复制拼接核心单元测试（DEL-006 / AC-005/006/007/014/015）
 *
 * 重点：AC-007 逐字符保真（项目命门）。所有断言基于真实字符串，不做 mock。
 * 运行：node --test "tests/formatter.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCopyText,
  MODE_A,
  MODE_B,
  META_HEADER,
  REQUEST_SECTION,
  RESPONSE_SECTION,
  REQUEST_BODY_LABEL,
  RESPONSE_BODY_LABEL,
} from '../extension/src/formatter.js';

/** 构造一条典型 RequestRecord（字段与 capture.normalize 产出保持一致）。 */
function makeRecord(overrides = {}) {
  return {
    id: 1,
    method: 'POST',
    url: 'https://api.example.com/login',
    httpVersion: 'HTTP/1.1',
    requestHeaders: [
      { name: 'Host', value: 'api.example.com' },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'X-Token', value: 'abc' },
    ],
    requestBody: '{"u":"a"}',
    status: 200,
    statusText: 'OK',
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'X-Req-Id', value: 'r-1' },
    ],
    responseContent: {
      text: '{"code":0}',
      encoding: null,
      mimeType: 'application/json',
      size: 10,
    },
    time: 123,
    startedDateTime: '2026-10-02T10:00:00.000Z',
    resourceType: 'XHR',
    ...overrides,
  };
}

/* ------------------------------------------------------------------------- *
 * 常量契约
 * ------------------------------------------------------------------------- */

test('常量：MODE_A / MODE_B 与逐字符段标记（ADR-006）', () => {
  assert.equal(MODE_A, 'formatted');
  assert.equal(MODE_B, 'raw');
  assert.equal(META_HEADER, '===== META =====');
  assert.equal(REQUEST_SECTION, '===== REQUEST =====');
  assert.equal(RESPONSE_SECTION, '===== RESPONSE =====');
  assert.equal(REQUEST_BODY_LABEL, '[Request Body]');
  assert.equal(RESPONSE_BODY_LABEL, '[Response Body]');
});

/* ------------------------------------------------------------------------- *
 * AC-007 逐字符保真（命门）
 * ------------------------------------------------------------------------- */

test('AC-007：响应体含不规则空白/转义/Unicode 时逐字符原样输出（模式 A）', () => {
  // 注意：源码中 `\\n` / `\\u0041` / `\\t` 表示 JSON 文本里字面的反斜杠序列，
  // 而非真实控制字符；双空格与紧凑排版用于验证「不缩进、不重排」。
  const json =
    '{"a":1,  "b":"line\\nbreak","uni":"中文😀","esc":"\\u0041","sp":"a\\tb","arr":[3,2,1]}';

  const record = makeRecord({
    responseContent: { text: json, encoding: null, mimeType: 'application/json', size: json.length },
  });

  const out = buildCopyText(record, MODE_A);
  const idx = out.indexOf(json);
  assert.notEqual(idx, -1, '输出必须包含原始 JSON 子串');

  // 逐 UTF-16 码元相等（不是「看起来一样」）。
  assert.deepEqual(
    Array.from(out.slice(idx, idx + json.length)),
    Array.from(json),
  );
  assert.equal(out.slice(idx, idx + json.length), json);

  // 明确禁止：不是美化后的 JSON、不含 Markdown 围栏。
  assert.ok(!out.includes(JSON.stringify(JSON.parse(json), null, 2)), '不得输出美化 JSON');
  assert.ok(!out.includes('```'), '不得添加 Markdown 代码块');
  assert.ok(!out.includes('\t'), '不得插入缩进制表符');
});

test('AC-007：模式 B 同样逐字符保真', () => {
  const json = '{"code":0,"message":"success","token":"xyz789"}';
  const record = makeRecord({
    responseContent: { text: json, encoding: null, mimeType: 'application/json', size: json.length },
  });

  const out = buildCopyText(record, MODE_B);
  const idx = out.indexOf(json);
  assert.notEqual(idx, -1);
  assert.equal(out.slice(idx, idx + json.length), json);
});

test('AC-007：两种模式的 body 子串逐 UTF-16 码元一致（仅外壳不同）', () => {
  const json = '{"x": 1,"y":"z"}';
  const reqBody = '{"p":1,  "q":"r"}';
  const record = makeRecord({
    requestBody: reqBody,
    responseContent: { text: json, encoding: null, mimeType: 'application/json', size: json.length },
  });

  const outA = buildCopyText(record, MODE_A);
  const outB = buildCopyText(record, MODE_B);

  assert.equal(outA.slice(outA.indexOf(reqBody), outA.indexOf(reqBody) + reqBody.length), reqBody);
  assert.equal(outB.slice(outB.indexOf(reqBody), outB.indexOf(reqBody) + reqBody.length), reqBody);
  assert.equal(outA.slice(outA.indexOf(json), outA.indexOf(json) + json.length), json);
  assert.equal(outB.slice(outB.indexOf(json), outB.indexOf(json) + json.length), json);
});

test('AC-007：元信息块存在时仍不破坏 body（body 逐字符）', () => {
  const json = '{"only":"BODY"}';
  const record = makeRecord({
    responseContent: { text: json, encoding: null, mimeType: 'application/json', size: json.length },
  });

  const out = buildCopyText(record, MODE_A);
  assert.ok(out.includes(META_HEADER));
  assert.ok(out.includes('2026-10-02T10:00:00.000Z'));

  const idx = out.indexOf(json);
  assert.notEqual(idx, -1);
  assert.equal(out.slice(idx, idx + json.length), json);
});

/* ------------------------------------------------------------------------- *
 * AC-006 单条隔离
 * ------------------------------------------------------------------------- */

test('AC-006：只输出传入的单条记录，绝不附带其他请求', () => {
  const record1 = makeRecord({
    id: 1,
    url: 'https://a.example/one',
    requestBody: 'REQ-ONE',
    responseContent: { text: '{"only":"ONE"}', encoding: null, mimeType: 'application/json', size: 14 },
  });
  const record2 = makeRecord({
    id: 2,
    url: 'https://b.example/two',
    requestBody: 'REQ-TWO',
    responseContent: { text: '{"only":"TWO"}', encoding: null, mimeType: 'application/json', size: 14 },
  });

  const out = buildCopyText(record1, MODE_A);
  assert.ok(out.includes('https://a.example/one'));
  assert.ok(!out.includes('https://b.example/two'), '不得包含另一条的 URL');
  assert.ok(!out.includes('REQ-TWO'), '不得包含另一条的请求体');
  assert.ok(!out.includes('{"only":"TWO"}'), '不得包含另一条的响应体');
  // 反向：传入 record2 时不含 record1 的信息。
  const out2 = buildCopyText(record2, MODE_A);
  assert.ok(out2.includes('https://b.example/two'));
  assert.ok(!out2.includes('https://a.example/one'));
});

/* ------------------------------------------------------------------------- *
 * AC-015 模式 A / B 结构
 * ------------------------------------------------------------------------- */

test('AC-015：模式 A 含 REQUEST/RESPONSE/META 标题；模式 B 完全不含', () => {
  const record = makeRecord();

  const outA = buildCopyText(record, MODE_A);
  assert.ok(outA.includes(REQUEST_SECTION));
  assert.ok(outA.includes(RESPONSE_SECTION));
  assert.ok(outA.includes(META_HEADER));
  assert.ok(outA.includes(REQUEST_BODY_LABEL));
  assert.ok(outA.includes(RESPONSE_BODY_LABEL));

  const outB = buildCopyText(record, MODE_B);
  assert.ok(!outB.includes(REQUEST_SECTION));
  assert.ok(!outB.includes(RESPONSE_SECTION));
  assert.ok(!outB.includes(META_HEADER));
  assert.ok(!outB.includes(REQUEST_BODY_LABEL));
  assert.ok(!outB.includes(RESPONSE_BODY_LABEL));
  assert.ok(!outB.includes('```'));
});

test('AC-015：mode 缺省为模式 A（DEC-005）', () => {
  const record = makeRecord();
  assert.equal(buildCopyText(record), buildCopyText(record, MODE_A));
});

test('AC-005：模式 A 完整结构逐字符契约（golden）', () => {
  const record = makeRecord();
  const expected = [
    META_HEADER,
    '开始时间: 2026-10-02T10:00:00.000Z',
    '总耗时: 123 ms',
    '资源类型: XHR',
    'MIME 类型: application/json',
    '',
    REQUEST_SECTION,
    'POST https://api.example.com/login HTTP/1.1',
    'Host: api.example.com',
    'Content-Type: application/json',
    'X-Token: abc',
    '',
    REQUEST_BODY_LABEL,
    '{"u":"a"}',
    '',
    RESPONSE_SECTION,
    'HTTP/1.1 200 OK',
    'Content-Type: application/json',
    'X-Req-Id: r-1',
    '',
    RESPONSE_BODY_LABEL,
    '{"code":0}',
  ].join('\n');

  assert.equal(buildCopyText(record, MODE_A), expected);
});

test('AC-019：模式 B 完整结构逐字符契约（golden）', () => {
  const record = makeRecord();
  const expected = [
    'POST https://api.example.com/login HTTP/1.1',
    'Host: api.example.com',
    'Content-Type: application/json',
    'X-Token: abc',
    '',
    '{"u":"a"}',
    '',
    'HTTP/1.1 200 OK',
    'Content-Type: application/json',
    'X-Req-Id: r-1',
    '',
    '{"code":0}',
  ].join('\n');

  assert.equal(buildCopyText(record, MODE_B), expected);
});

/* ------------------------------------------------------------------------- *
 * AC-014 头保序 / 不美化
 * ------------------------------------------------------------------------- */

test('AC-014：请求头/响应头按原始顺序输出，不排序/不去重/不合并同名', () => {
  const record = makeRecord({
    requestHeaders: [
      { name: 'Z-Last', value: '1' },
      { name: 'A-First', value: '2' },
      { name: 'Z-Last', value: '3' },
    ],
    responseHeaders: [
      { name: 'Set-Cookie', value: 'a=1' },
      { name: 'Set-Cookie', value: 'b=2' },
      { name: 'Content-Type', value: 'text/plain' },
    ],
  });

  const out = buildCopyText(record, MODE_A);
  const z1 = out.indexOf('Z-Last: 1');
  const a2 = out.indexOf('A-First: 2');
  const z3 = out.indexOf('Z-Last: 3');
  assert.ok(z1 !== -1 && a2 !== -1 && z3 !== -1);
  assert.ok(z1 < a2 && a2 < z3, '请求头须保持原始顺序（非字典序）');

  const c1 = out.indexOf('Set-Cookie: a=1');
  const c2 = out.indexOf('Set-Cookie: b=2');
  const ct = out.indexOf('Content-Type: text/plain');
  assert.ok(c1 < c2 && c2 < ct, '响应头须保持原始顺序');
  assert.equal(out.split('Z-Last: ').length - 1, 2, '同名头不得合并');
});

test('AC-014：兼容 string 头行', () => {
  const record = makeRecord({
    requestHeaders: ['X-Raw: hello', { name: 'X-Obj', value: 'world' }, ''],
  });
  const out = buildCopyText(record, MODE_A);
  assert.ok(out.includes('X-Raw: hello'));
  assert.ok(out.includes('X-Obj: world'));
});

/* ------------------------------------------------------------------------- *
 * REQ-015 HTTP 版本回退
 * ------------------------------------------------------------------------- */

test('REQ-015：httpVersion 缺失/为空时回退 HTTP/1.1（请求行与响应行）', () => {
  for (const version of [undefined, '', null]) {
    const record = makeRecord({ httpVersion: version });
    const out = buildCopyText(record, MODE_A);
    assert.ok(out.includes('POST https://api.example.com/login HTTP/1.1'));
    assert.ok(out.includes('HTTP/1.1 200 OK'));
  }
});

test('REQ-015：httpVersion 存在时原样使用（如 HTTP/2）', () => {
  const record = makeRecord({ httpVersion: 'HTTP/2' });
  const out = buildCopyText(record, MODE_A);
  assert.ok(out.includes('POST https://api.example.com/login HTTP/2'));
  assert.ok(out.includes('HTTP/2 200 OK'));
});

/* ------------------------------------------------------------------------- *
 * 空体 / 边界
 * ------------------------------------------------------------------------- */

test('无请求体（GET/HEAD）：不输出 [Request Body]，无空行残留', () => {
  const record = makeRecord({ method: 'GET', requestBody: undefined });
  const out = buildCopyText(record, MODE_A);
  assert.ok(!out.includes(REQUEST_BODY_LABEL));
  // 请求头之后恰好一个空行，紧接着 RESPONSE 段（无多余空行）。
  assert.ok(out.includes('X-Token: abc\n\n' + RESPONSE_SECTION));
  assert.ok(!out.includes('X-Token: abc\n\n\n'));
});

test('204/304 空响应体：不输出 [Response Body]，无多余空行', () => {
  for (const [status, statusText] of [[204, 'No Content'], [304, 'Not Modified']]) {
    const record = makeRecord({
      status,
      statusText,
      responseHeaders: [{ name: 'Cache-Control', value: 'no-cache' }],
      responseContent: { text: '', encoding: null, mimeType: 'text/html', size: 0 },
    });
    const out = buildCopyText(record, MODE_A);
    assert.ok(!out.includes(RESPONSE_BODY_LABEL));
    // 状态行 + 头存在；末尾为最后一行的头，无尾随换行/空行。
    assert.ok(out.includes('HTTP/1.1 ' + status + ' ' + statusText));
    assert.ok(out.endsWith('Cache-Control: no-cache'));
    assert.ok(!out.endsWith('\n'));
    assert.ok(!out.endsWith('\n\n'));
  }
});

test('响应体为 null（不可用）：不输出 [Response Body]，且不抛异常', () => {
  const record = makeRecord({
    responseContent: { text: null, encoding: null, mimeType: '', size: 0 },
  });
  let out;
  assert.doesNotThrow(() => {
    out = buildCopyText(record, MODE_A);
  });
  assert.ok(!out.includes(RESPONSE_BODY_LABEL));
});

test('非对象 record：返回空串（不抛异常）', () => {
  assert.equal(buildCopyText(null), '');
  assert.equal(buildCopyText(undefined), '');
  assert.equal(buildCopyText(42), '');
});

test('空字符串 body 不产出段标签（无多余字符）', () => {
  const record = makeRecord({ requestBody: '', responseContent: { text: '', mimeType: '', encoding: null, size: 0 } });
  const out = buildCopyText(record, MODE_A);
  assert.ok(!out.includes(REQUEST_BODY_LABEL));
  assert.ok(!out.includes(RESPONSE_BODY_LABEL));
});

/* ------------------------------------------------------------------------- *
 * options 覆盖（供 TASK-008 注入分类后的 body）
 * ------------------------------------------------------------------------- */

test('options.requestBody / options.responseBody 覆盖生效', () => {
  const record = makeRecord();
  const out = buildCopyText(record, MODE_A, {
    requestBody: 'OVERRIDE-REQ',
    responseBody: 'OVERRIDE-RESP',
  });
  assert.ok(out.includes('OVERRIDE-REQ'));
  assert.ok(out.includes('OVERRIDE-RESP'));
  assert.ok(!out.includes('{"u":"a"}'));
  assert.ok(!out.includes('{"code":0}'));
});

test('options.responseBody 覆盖为空串 → 不产出响应体段', () => {
  const record = makeRecord();
  const out = buildCopyText(record, MODE_A, { responseBody: '' });
  assert.ok(!out.includes(RESPONSE_BODY_LABEL));
});

test('options.includeMeta=false → 不输出 META 段；默认真源含 META', () => {
  const record = makeRecord();
  const withMeta = buildCopyText(record, MODE_A);
  const withoutMeta = buildCopyText(record, MODE_A, { includeMeta: false });
  assert.ok(withMeta.includes(META_HEADER));
  assert.ok(!withoutMeta.includes(META_HEADER));
  // 关闭元信息后，请求/响应段结构不变。
  assert.ok(withoutMeta.startsWith(REQUEST_SECTION));
  assert.ok(withoutMeta.includes(RESPONSE_SECTION));
});

test('元信息字段缺失时整行跳过（不产空标签）', () => {
  const record = makeRecord({
    startedDateTime: '',
    resourceType: '',
    responseContent: { text: 'x', encoding: null, mimeType: '', size: 1 },
  });
  const out = buildCopyText(record, MODE_A);
  assert.ok(!out.includes('开始时间:'));
  assert.ok(!out.includes('资源类型:'));
  assert.ok(!out.includes('MIME 类型:'));
  assert.ok(out.includes('总耗时: 123 ms'));
});

/* ------------------------------------------------------------------------- *
 * 纯度 / 无副作用
 * ------------------------------------------------------------------------- */

test('纯函数：多次调用结果稳定且不修改入参', () => {
  const record = makeRecord();
  const snapshot = JSON.stringify(record);
  const a = buildCopyText(record, MODE_A);
  const b = buildCopyText(record, MODE_A);
  assert.equal(a, b);
  assert.equal(JSON.stringify(record), snapshot, '不得修改入参 record');
});

/* ------------------------------------------------------------------------- *
 * TASK-009 / DEL-011 — ② A/B 独立按钮冻结 golden
 *
 * 固定模式 A/B 各自的完整冻结产物（与 TASK-005/007 的两枚按钮一一对应）：
 * 点「模式 A」按 A 复制、点「模式 B」按 B 复制；二者为两套**不同**的逐字符契约。
 * ------------------------------------------------------------------------- */

test('TASK-009：模式 A 按钮冻结 golden（逐字符）', () => {
  const record = makeRecord();
  const expectedA = [
    '===== META =====',
    '开始时间: 2026-10-02T10:00:00.000Z',
    '总耗时: 123 ms',
    '资源类型: XHR',
    'MIME 类型: application/json',
    '',
    '===== REQUEST =====',
    'POST https://api.example.com/login HTTP/1.1',
    'Host: api.example.com',
    'Content-Type: application/json',
    'X-Token: abc',
    '',
    '[Request Body]',
    '{"u":"a"}',
    '',
    '===== RESPONSE =====',
    'HTTP/1.1 200 OK',
    'Content-Type: application/json',
    'X-Req-Id: r-1',
    '',
    '[Response Body]',
    '{"code":0}',
  ].join('\n');

  assert.equal(buildCopyText(record, MODE_A), expectedA);
});

test('TASK-009：模式 B 按钮冻结 golden（逐字符）且与模式 A 不同', () => {
  const record = makeRecord();
  const expectedB = [
    'POST https://api.example.com/login HTTP/1.1',
    'Host: api.example.com',
    'Content-Type: application/json',
    'X-Token: abc',
    '',
    '{"u":"a"}',
    '',
    'HTTP/1.1 200 OK',
    'Content-Type: application/json',
    'X-Req-Id: r-1',
    '',
    '{"code":0}',
  ].join('\n');

  assert.equal(buildCopyText(record, MODE_B), expectedB);
  assert.notEqual(buildCopyText(record, MODE_A), buildCopyText(record, MODE_B));
});
