// tests/content.test.mjs — 响应体内容分类单元测试（TASK-008 / DEL-008 / AC-010）
// 运行: node --test "tests/content.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';

import contentDefault, {
  classifyBody,
  isOverThreshold,
  DEFAULT_LARGE_THRESHOLD,
} from '../extension/src/content.js';

/** 把 UTF-8 字符串编码为 base64（测试辅助）。 */
function b64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

/** 把字节数组编码为 base64（测试辅助）。 */
function b64Bytes(bytes) {
  return Buffer.from(bytes).toString('base64');
}

const MB = 1024 * 1024;

/* ------------------------------------------------------------------------- *
 * 常量
 * ------------------------------------------------------------------------- */

test('DEFAULT_LARGE_THRESHOLD === 10MB（REQ-022 / DEC-003）', () => {
  assert.equal(DEFAULT_LARGE_THRESHOLD, 10 * MB);
  assert.equal(DEFAULT_LARGE_THRESHOLD, 10485760);
});

/* ------------------------------------------------------------------------- *
 * 文本类：逐字符原样（REQ-021 / ADR-006）
 * ------------------------------------------------------------------------- */

test('文本响应 → kind=text 且 text 逐字符原样（不 trim/不转义/不解析）', () => {
  const raw = '  {\n  "a": 1,\n  "b": "x\\ny"\n}\t  ';
  const result = classifyBody({
    text: raw,
    encoding: null,
    mimeType: 'application/json; charset=utf-8',
    size: 30,
  });

  assert.equal(result.kind, 'text');
  assert.equal(result.text, raw);
  assert.equal(result.text.length, raw.length);
  // 前后空白、制表符、换行、转义序列全部保留
  assert.ok(result.text.startsWith('  {'));
  assert.ok(result.text.endsWith('\t  '));
  assert.equal(result.byteSize, 30);
});

test('任意非二进制 MIME（text/*、+json、x-www-form-urlencoded）→ kind=text', () => {
  const cases = [
    ['text/html', '<h1>hi</h1>'],
    ['text/plain', 'plain'],
    ['application/json', '{}'],
    ['application/xml', '<a/>'],
    ['application/javascript', 'var a=1;'],
    ['application/ld+json', '{"@type":"x"}'],
    ['application/rss+xml', '<rss/>'],
    ['application/x-www-form-urlencoded', 'a=1&b=2'],
    ['', 'no mime treated as text'],
  ];
  for (const [mimeType, text] of cases) {
    const result = classifyBody({ text, mimeType, size: text.length });
    assert.equal(result.kind, 'text', 'mime=' + mimeType);
    assert.equal(result.text, text, 'mime=' + mimeType);
  }
});

test('byteSize 优先 responseContent.size；缺失时按 UTF-8 字节长度估算', () => {
  assert.equal(classifyBody({ text: '你好', mimeType: 'text/plain', size: 999 }).byteSize, 999);
  // 缺失 size → '你'/'好' 各 3 字节 = 6
  assert.equal(classifyBody({ text: '你好', mimeType: 'text/plain' }).byteSize, 6);
});

/* ------------------------------------------------------------------------- *
 * 二进制：占位格式逐字符（REQ-023）
 * ------------------------------------------------------------------------- */

test('二进制 MIME → kind=binary，占位格式逐字符 `[Binary content omitted: <mime>, <bytes> bytes]`', () => {
  const result = classifyBody({
    text: '\u0089PNG\u000d\u000a\u001a\u000a...',
    encoding: null,
    mimeType: 'image/png',
    size: 45678,
  });

  assert.equal(result.kind, 'binary');
  assert.equal(result.placeholder, '[Binary content omitted: image/png, 45678 bytes]');
  assert.equal(result.byteSize, 45678);
  assert.equal(result.text, undefined);
});

test('各类二进制 MIME 均判为 binary', () => {
  const mimes = [
    'image/png',
    'image/jpeg',
    'audio/mpeg',
    'video/mp4',
    'font/woff2',
    'application/octet-stream',
    'application/pdf',
    'application/zip',
    'application/gzip',
    'application/wasm',
  ];
  for (const mimeType of mimes) {
    const result = classifyBody({ text: 'AAAA', mimeType, size: 4 });
    assert.equal(result.kind, 'binary', 'mime=' + mimeType);
    assert.equal(result.placeholder, '[Binary content omitted: ' + mimeType + ', 4 bytes]');
  }
});

test('二进制占位：MIME 参数被剥离，字节数为 size', () => {
  const result = classifyBody({ text: 'x', mimeType: 'image/svg+xml ; charset=binary', size: 7 });
  // image/* 前缀优先 → binary；mime 归一化去参数/小写
  assert.equal(result.kind, 'binary');
  assert.equal(result.placeholder, '[Binary content omitted: image/svg+xml, 7 bytes]');
});

/* ------------------------------------------------------------------------- *
 * Base64：文本类 MIME → UTF-8 解码（REQ-024）
 * ------------------------------------------------------------------------- */

test('base64 + 文本 MIME → kind=base64-text，UTF-8 解码正确（含中文/emoji）', () => {
  const original = '{"msg":"你好，世界😀","emoji":"🎉"}';
  const encoded = b64(original);

  for (const mimeType of ['application/json', 'text/plain', 'application/xml']) {
    const result = classifyBody({
      text: encoded,
      encoding: 'base64',
      mimeType,
      size: Buffer.byteLength(original, 'utf8'),
    });
    assert.equal(result.kind, 'base64-text', 'mime=' + mimeType);
    assert.equal(result.text, original, 'mime=' + mimeType);
    assert.equal(result.byteSize, Buffer.byteLength(original, 'utf8'));
  }
});

test('base64 文本：带换行/空白的编码串仍可解码', () => {
  const original = 'line1\nline2\nline3';
  const encoded = b64(original);
  const wrapped = encoded.slice(0, 4) + '\n' + encoded.slice(4);

  const result = classifyBody({ text: wrapped, encoding: 'base64', mimeType: 'text/plain' });
  assert.equal(result.kind, 'base64-text');
  assert.equal(result.text, original);
});

test('base64 + 非文本 MIME → kind=base64-omitted（ADR-008 判定顺序：base64 优先）', () => {
  const raw = b64Bytes([0x89, 0x50, 0x4e, 0x47]); // 8 字符
  const result = classifyBody({ text: raw, encoding: 'base64', mimeType: 'image/png', size: 4 });

  assert.equal(result.kind, 'base64-omitted');
  assert.equal(result.placeholder, '[Base64 content omitted: length ' + raw.length + ']');
  assert.equal(result.text, undefined);
});

test('encoding===base64 且 MIME 缺失（视作文本）→ 尝试解码', () => {
  const original = 'hello';
  const result = classifyBody({ text: b64(original), encoding: 'base64', mimeType: '' });
  assert.equal(result.kind, 'base64-text');
  assert.equal(result.text, 'hello');
});

/* ------------------------------------------------------------------------- *
 * 非法 base64：不抛异常，回退占位
 * ------------------------------------------------------------------------- */

test('非法 base64 → 不抛异常，回退 base64-omitted + 占位', () => {
  const invalids = [
    'not-valid-base64!!!',
    'abcde', // 长度非 4 的倍数
    '====', // 全是填充
    'aGVsbG8', // 缺填充（长度 7）
    '####',
    'AB=C', // 填充位置错误
  ];
  for (const text of invalids) {
    let result;
    assert.doesNotThrow(() => {
      result = classifyBody({ text, encoding: 'base64', mimeType: 'text/plain', size: text.length });
    }, 'text=' + text);
    assert.equal(result.kind, 'base64-omitted', 'text=' + text);
    assert.equal(result.placeholder, '[Base64 content omitted: length ' + text.length + ']');
  }
});

/* ------------------------------------------------------------------------- *
 * 阈值边界（AC-010）
 * ------------------------------------------------------------------------- */

test('阈值边界：size 恰好 10MB → false；10MB+1 → true', () => {
  const atLimit = { text: 'x', mimeType: 'text/plain', size: DEFAULT_LARGE_THRESHOLD };
  const overLimit = { text: 'x', mimeType: 'text/plain', size: DEFAULT_LARGE_THRESHOLD + 1 };

  assert.equal(isOverThreshold(atLimit), false);
  assert.equal(isOverThreshold(overLimit), true);
});

test('isOverThreshold 支持自定义阈值（严格大于）', () => {
  assert.equal(isOverThreshold({ text: 'abc', size: 2 }, 2), false); // 无 size 时按文本长度 3？→ 有 size=2
  assert.equal(isOverThreshold({ text: 'abc', size: 3 }, 2), true);
  assert.equal(isOverThreshold({ text: 'abc' }, 2), true); // 无 size → UTF-8 长度 3 > 2
  assert.equal(isOverThreshold({ text: 'ab' }, 2), false); // 长度 2 不 > 2
});

test('isOverThreshold 依据 size 优先；size 缺失回退 UTF-8 文本长度', () => {
  assert.equal(isOverThreshold({ text: '你好', size: 1 }, 5), false); // size=1
  assert.equal(isOverThreshold({ text: '你好' }, 5), true); // UTF-8 长度 6 > 5
  assert.equal(isOverThreshold(undefined, 0), false); // 缺失 → 0
});

/* ------------------------------------------------------------------------- *
 * 空/缺失内容 → unavailable
 * ------------------------------------------------------------------------- */

test('responseContent 缺失/空正文且 size 为 0 → kind=unavailable, byteSize=0', () => {
  assert.deepEqual(classifyBody(undefined), { kind: 'unavailable', byteSize: 0 });
  assert.deepEqual(classifyBody(null), { kind: 'unavailable', byteSize: 0 });
  assert.deepEqual(classifyBody({ text: '', size: 0 }), { kind: 'unavailable', byteSize: 0 });
  assert.deepEqual(classifyBody({ text: null, mimeType: 'application/json', size: 0 }), {
    kind: 'unavailable',
    byteSize: 0,
  });
  assert.deepEqual(classifyBody({ mimeType: 'application/json' }), {
    kind: 'unavailable',
    byteSize: 0,
  });
});

test('空正文但 size>0 → 仍为 unavailable，byteSize 保留 size', () => {
  const result = classifyBody({ text: '', mimeType: 'application/json', size: 100 });
  assert.equal(result.kind, 'unavailable');
  assert.equal(result.byteSize, 100);
});

/* ------------------------------------------------------------------------- *
 * 纯度 / 默认导出 / 无副作用
 * ------------------------------------------------------------------------- */

test('classifyBody 不修改输入对象', () => {
  const input = { text: '{"a":1}', encoding: null, mimeType: 'application/json', size: 7 };
  const snapshot = JSON.stringify(input);
  classifyBody(input);
  assert.equal(JSON.stringify(input), snapshot);
});

test('默认导出暴露 classifyBody / isOverThreshold / DEFAULT_LARGE_THRESHOLD', () => {
  assert.equal(typeof contentDefault.classifyBody, 'function');
  assert.equal(typeof contentDefault.isOverThreshold, 'function');
  assert.equal(contentDefault.DEFAULT_LARGE_THRESHOLD, DEFAULT_LARGE_THRESHOLD);
});
