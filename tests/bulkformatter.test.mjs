/**
 * bulkformatter.test.mjs — 多记录批量拼接器单元测试（DEL-003 / ADR-015 / AC-006）
 * covers: AC-006（N 段拼接 / 逐段保真 / 无跨条混淆）
 *
 * 重点：段数 === N、标记逐字符、段内 = 对应单条 `buildCopyText` 原样、
 * 段序 = 输入顺序、N=1 与单选逐字符一致、模式 B 每段纯原始块、无跨条混淆。
 * 所有断言基于真实字符串，不做 mock。
 * 运行：node --test "tests/bulkformatter.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCopyText, MODE_A, MODE_B } from '../extension/src/formatter.js';
import { joinBlocks, buildBulkCopyText } from '../extension/src/bulkformatter.js';

/** 构造一条典型 RequestRecord（字段与 capture.normalize 产出一致）。 */
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

/** 构造一系列**载荷唯一**的记录（便于检测跨条混淆）。 */
function makeSet(n) {
  const list = [];
  for (let i = 1; i <= n; i += 1) {
    list.push(
      makeRecord({
        id: i,
        method: i % 2 === 0 ? 'GET' : 'POST',
        url: 'https://api.example.com/rec-' + i,
        requestHeaders: [{ name: 'X-Rec', value: 'req-' + i }],
        requestBody: 'REQ-BODY-' + i,
        status: 200 + i,
        statusText: 'S' + i,
        responseHeaders: [{ name: 'X-Resp', value: 'resp-' + i }],
        responseContent: {
          text: 'RESP-BODY-' + i,
          encoding: null,
          mimeType: 'application/json',
          size: 10,
        },
        startedDateTime: '2026-10-02T10:00:0' + i + '.000Z',
      }),
    );
  }
  return list;
}

/** 逐字符相等（逐 UTF-16 码元，而非仅字符串相等）。 */
function assertCharEqual(actual, expected, msg) {
  assert.deepEqual(Array.from(actual), Array.from(expected), msg);
  assert.equal(actual, expected, msg);
}

/** 精确构造 ADR-015 期望文本。 */
function expectedBulk(records, mode, resolveBody) {
  const total = records.length;
  if (total === 0) {
    return '';
  }
  const blocks = records.map((r) =>
    typeof resolveBody === 'function'
      ? buildCopyText(r, mode, { responseBody: resolveBody(r) })
      : buildCopyText(r, mode),
  );
  if (total === 1) {
    return blocks[0];
  }
  return blocks
    .map((b, i) => '===== #' + (i + 1) + '/' + total + ' =====\n' + b)
    .join('\n\n');
}

/** 提取拼接文本中第 i 段（1 起）的正文（去标记）。 */
function extractBlock(out, i, total) {
  const startMark = '===== #' + i + '/' + total + ' =====\n';
  const at = out.indexOf(startMark);
  assert.notEqual(at, -1, '段 ' + i + ' 的标记必须存在');
  const contentStart = at + startMark.length;
  if (i < total) {
    const nextMark = '\n\n===== #' + (i + 1) + '/' + total + ' =====\n';
    const end = out.indexOf(nextMark, contentStart);
    assert.notEqual(end, -1, '段 ' + (i + 1) + ' 的分隔必须存在');
    return out.slice(contentStart, end);
  }
  return out.slice(contentStart);
}

/** 统计形如 `===== #i/N =====` 的标记行数量。 */
function countMarkers(out) {
  const m = out.match(/^===== #\d+\/\d+ =====$/gm);
  return m ? m.length : 0;
}

/* ------------------------------------------------------------------------- *
 * joinBlocks：模板层
 * ------------------------------------------------------------------------- */

test('joinBlocks：N=2 精确模板（ADR-015 逐字符）', () => {
  const out = joinBlocks(['AAA', 'BBB'], 2);
  assert.equal(out, '===== #1/2 =====\nAAA\n\n===== #2/2 =====\nBBB');
});

test('joinBlocks：N=3 精确模板，标记数 === 3', () => {
  const out = joinBlocks(['a', 'b', 'c'], 3);
  assert.equal(
    out,
    [
      '===== #1/3 =====\na',
      '===== #2/3 =====\nb',
      '===== #3/3 =====\nc',
    ].join('\n\n'),
  );
  assert.equal(countMarkers(out), 3);
});

test('joinBlocks：N=1 不加标记，返回首块原样', () => {
  assert.equal(joinBlocks(['ONLY'], 1), 'ONLY');
  assert.ok(!joinBlocks(['ONLY'], 1).includes('====='));
});

test('joinBlocks：空数组 → 空串', () => {
  assert.equal(joinBlocks([], 2), '');
  assert.equal(joinBlocks([], 0), '');
});

test('joinBlocks：非数组安全降级 → 空串', () => {
  assert.equal(joinBlocks(null, 2), '');
  assert.equal(joinBlocks(undefined, 2), '');
});

test('joinBlocks：十进制无补零（N=10，第 1 段不是 #01/10）', () => {
  const blocks = Array.from({ length: 10 }, (_, i) => 'b' + (i + 1));
  const out = joinBlocks(blocks, 10);
  assert.ok(out.includes('===== #1/10 =====\n'));
  assert.ok(out.includes('===== #10/10 =====\n'));
  assert.ok(!out.includes('===== #01/10 ====='));
  assert.ok(!out.includes('===== #010/10 ====='));
  assert.equal(countMarkers(out), 10);
});

/* ------------------------------------------------------------------------- *
 * buildBulkCopyText：N ≥ 2
 * ------------------------------------------------------------------------- */

test('AC-006：N=2 段数 === 2，恰好 2 个标记，精确 golden', () => {
  const records = makeSet(2);
  const out = buildBulkCopyText(records, MODE_A);
  assert.equal(countMarkers(out), 2);
  assert.equal(out, expectedBulk(records, MODE_A));
});

test('AC-006：N=3 段数 === 3，恰好 3 个标记', () => {
  const records = makeSet(3);
  const out = buildBulkCopyText(records, MODE_A);
  assert.equal(countMarkers(out), 3);
  assert.equal(out, expectedBulk(records, MODE_A));
});

test('AC-006：N=5 段数 === 5，恰好 5 个标记', () => {
  const records = makeSet(5);
  const out = buildBulkCopyText(records, MODE_A);
  assert.equal(countMarkers(out), 5);
  assert.equal(out, expectedBulk(records, MODE_A));
});

test('AC-006：每段正文逐字符 === 对应记录的单条 buildCopyText 原样（模式 A）', () => {
  const records = makeSet(4);
  const out = buildBulkCopyText(records, MODE_A);
  for (let i = 0; i < records.length; i += 1) {
    const expected = buildCopyText(records[i], MODE_A);
    assertCharEqual(extractBlock(out, i + 1, records.length), expected, '段 ' + (i + 1));
  }
});

test('AC-006：段序 === 输入顺序（可见列表序），不做任何排序', () => {
  // 故意传入乱序 id（3,1,2），验证输出严格保持数组顺序。
  const records = [makeSet(3)[2], makeSet(3)[0], makeSet(3)[1]];
  const out = buildBulkCopyText(records, MODE_A);
  const posRec3 = out.indexOf('https://api.example.com/rec-3');
  const posRec1 = out.indexOf('https://api.example.com/rec-1');
  const posRec2 = out.indexOf('https://api.example.com/rec-2');
  assert.ok(posRec3 !== -1 && posRec1 !== -1 && posRec2 !== -1);
  assert.ok(posRec3 < posRec1 && posRec1 < posRec2, '段序必须等于输入数组顺序');
});

test('AC-006：模式 B 下每段为纯原始块（无标题段，段内 === buildCopyText MODE_B）', () => {
  const records = makeSet(3);
  const out = buildBulkCopyText(records, MODE_B);
  assert.equal(countMarkers(out), 3);
  // 除批量序号标记外，不应出现模式 A 的标题/段标签。
  assert.ok(!out.includes('===== META ====='));
  assert.ok(!out.includes('===== REQUEST ====='));
  assert.ok(!out.includes('===== RESPONSE ====='));
  assert.ok(!out.includes('[Request Body]'));
  assert.ok(!out.includes('[Response Body]'));
  for (let i = 0; i < records.length; i += 1) {
    const expected = buildCopyText(records[i], MODE_B);
    assertCharEqual(extractBlock(out, i + 1, records.length), expected, '段 ' + (i + 1));
  }
});

test('AC-006：无跨条混淆——段 i 不含其他段的请求/响应标识', () => {
  const records = makeSet(3);
  const out = buildBulkCopyText(records, MODE_A);
  for (let i = 0; i < records.length; i += 1) {
    const block = extractBlock(out, i + 1, records.length);
    assert.ok(block.includes('https://api.example.com/rec-' + (i + 1)));
    assert.ok(block.includes('REQ-BODY-' + (i + 1)));
    assert.ok(block.includes('RESP-BODY-' + (i + 1)));
    for (let j = 0; j < records.length; j += 1) {
      if (j === i) {
        continue;
      }
      assert.ok(!block.includes('https://api.example.com/rec-' + (j + 1)), '段 ' + (i + 1) + ' 不得含段 ' + (j + 1) + ' 的 URL');
      assert.ok(!block.includes('REQ-BODY-' + (j + 1)), '段 ' + (i + 1) + ' 不得含段 ' + (j + 1) + ' 的请求体');
      assert.ok(!block.includes('RESP-BODY-' + (j + 1)), '段 ' + (i + 1) + ' 不得含段 ' + (j + 1) + ' 的响应体');
    }
  }
});

test('AC-006：段间恰好以两个换行分隔（`\\n\\n` + 标记行）', () => {
  const records = makeSet(3);
  const out = buildBulkCopyText(records, MODE_A);
  assert.ok(out.includes('\n\n===== #2/3 =====\n'));
  assert.ok(out.includes('\n\n===== #3/3 =====\n'));
  // 不存在三个换行分隔（那是段内内容，不应出现在段边界处）。
  assert.ok(!out.includes('\n\n\n===== #'));
});

/* ------------------------------------------------------------------------- *
 * N === 1 边界（委托单选路径）
 * ------------------------------------------------------------------------- */

test('AC-006：N=1 输出与单选 buildCopyText 逐字符一致（模式 A，无标记）', () => {
  const record = makeRecord();
  const out = buildBulkCopyText([record], MODE_A);
  assertCharEqual(out, buildCopyText(record, MODE_A));
  assert.ok(!out.includes('===== #'));
  assert.ok(!out.includes('1/1'));
});

test('AC-006：N=1 模式 B 与单选一致、无标记', () => {
  const record = makeRecord();
  const out = buildBulkCopyText([record], MODE_B);
  assertCharEqual(out, buildCopyText(record, MODE_B));
  assert.ok(!out.includes('===== #'));
});

test('AC-006：N=0（空数组）→ 空串', () => {
  assert.equal(buildBulkCopyText([], MODE_A), '');
});

test('buildBulkCopyText：非数组安全降级 → 空串', () => {
  assert.equal(buildBulkCopyText(null, MODE_A), '');
  assert.equal(buildBulkCopyText(undefined, MODE_A), '');
  assert.equal(buildBulkCopyText('not-array', MODE_A), '');
});

test('buildBulkCopyText：mode 缺省为模式 A（与显式 MODE_A 相同）', () => {
  const records = makeSet(2);
  assert.equal(buildBulkCopyText(records), buildBulkCopyText(records, MODE_A));
});

/* ------------------------------------------------------------------------- *
 * resolveBody 注入（panel 注入分类后响应体）
 * ------------------------------------------------------------------------- */

test('resolveBody：逐条调用（顺序与入参为对应记录），N 次', () => {
  const records = makeSet(3);
  const seen = [];
  const resolve = (record) => {
    seen.push(record.id);
    return 'RESOLVED-' + record.id;
  };
  const out = buildBulkCopyText(records, MODE_A, resolve);
  assert.deepEqual(seen, [1, 2, 3]);
  for (let i = 0; i < records.length; i += 1) {
    const block = extractBlock(out, i + 1, records.length);
    assert.ok(block.includes('RESOLVED-' + (i + 1)));
    assert.ok(!block.includes('RESP-BODY-' + (i + 1)), '注入后应用注入值');
  }
});

test('resolveBody：注入值逐字符进入对应段（含替换原响应体）', () => {
  const records = makeSet(2);
  const injected = { 1: 'INJ-1\nline2', 2: 'INJ-2' };
  const out = buildBulkCopyText(records, MODE_A, (r) => injected[r.id]);
  assert.equal(out, expectedBulk(records, MODE_A, (r) => injected[r.id]));
  const b1 = extractBlock(out, 1, 2);
  assert.ok(b1.includes('INJ-1\nline2'));
});

test('resolveBody：缺省时不改变单选回退（用 record.responseContent.text）', () => {
  const records = makeSet(2);
  const out = buildBulkCopyText(records, MODE_A);
  assert.equal(out, expectedBulk(records, MODE_A));
  for (let i = 0; i < records.length; i += 1) {
    const block = extractBlock(out, i + 1, records.length);
    assert.ok(block.includes('RESP-BODY-' + (i + 1)));
  }
});

test('resolveBody：非函数值（如 null）按缺省处理，不抛异常', () => {
  const records = makeSet(2);
  assert.doesNotThrow(() => buildBulkCopyText(records, MODE_A, null));
  assert.equal(buildBulkCopyText(records, MODE_A, null), expectedBulk(records, MODE_A));
});

/* ------------------------------------------------------------------------- *
 * 纯度 / 单一真源
 * ------------------------------------------------------------------------- */

test('纯函数：多次调用结果稳定且不修改入参', () => {
  const records = makeSet(3);
  const snapshot = JSON.stringify(records);
  const a = buildBulkCopyText(records, MODE_A);
  const b = buildBulkCopyText(records, MODE_A);
  assert.equal(a, b);
  assert.equal(JSON.stringify(records), snapshot, '不得修改入参 records');
});

test('单一真源：段内文本与 formatter 单条输出完全同源（不重写拼接）', () => {
  const records = makeSet(3);
  const out = buildBulkCopyText(records, MODE_A);
  // 每个单条 buildCopyText 输出必须作为连续子串出现在批量文本中。
  for (let i = 0; i < records.length; i += 1) {
    const single = buildCopyText(records[i], MODE_A);
    const at = out.indexOf(single);
    assert.notEqual(at, -1, '段 ' + (i + 1) + ' 必须是单条输出原样子串');
    assertCharEqual(out.slice(at, at + single.length), single);
  }
});

test('混合记录（含非对象项）：非对象项经 formatter 产出空块，不抛异常', () => {
  const records = makeSet(2);
  const mixed = [records[0], null, records[1]];
  let out;
  assert.doesNotThrow(() => {
    out = buildBulkCopyText(mixed, MODE_A);
  });
  assert.equal(countMarkers(out), 3);
  // 第二段（null）正文为空串。
  assert.equal(extractBlock(out, 2, 3), '');
});

/* ------------------------------------------------------------------------- *
 * TASK-009 / DEL-011 — 面板入口等价与边界（0/1/N，含 resolveBody 注入）
 * ------------------------------------------------------------------------- */

test('TASK-009：入口等价——N=1 经批量入口 === 单选（模式 A/B，含 resolveBody）', () => {
  const record = makeRecord();
  const resolve = (r) => 'INJ-' + r.id;
  for (const mode of [MODE_A, MODE_B]) {
    const viaBulk = buildBulkCopyText([record], mode, resolve);
    const viaSingle = buildCopyText(record, mode, { responseBody: resolve(record) });
    assertCharEqual(viaBulk, viaSingle, 'N=1 委托单选逐字符一致（' + mode + '）');
    assert.equal(countMarkers(viaBulk), 0, 'N=1 不加批量标记');
  }
});

test('TASK-009：边界——0 条空串；N=2 恰 N 段、段序=可见序、无跨条混淆', () => {
  assert.equal(buildBulkCopyText([], MODE_A), '');

  const records = makeSet(2);
  const out = buildBulkCopyText(records, MODE_A, (r) => 'BODY-' + r.id);
  assert.equal(countMarkers(out), 2);
  assert.ok(out.includes('===== #1/2 =====\n'));
  assert.ok(out.includes('===== #2/2 =====\n'));

  const first = extractBlock(out, 1, 2);
  const second = extractBlock(out, 2, 2);
  assert.ok(first.includes('https://api.example.com/rec-1'));
  assert.ok(second.includes('https://api.example.com/rec-2'));
  assert.ok(!first.includes('https://api.example.com/rec-2'), '段 1 不得含段 2 标识');
  assert.ok(!second.includes('https://api.example.com/rec-1'), '段 2 不得含段 1 标识');
});
