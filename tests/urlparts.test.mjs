// tests/urlparts.test.mjs — URL 拆分为「域名 / 路径」纯逻辑单元测试
// 运行: node --test "tests/urlparts.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';

import { splitUrl } from '../extension/src/urlparts.js';

test('拆绝对 URL：host + path（含 query / hash）', () => {
  assert.deepEqual(splitUrl('https://api.example.com/v1/users?q=1#top'), {
    host: 'api.example.com',
    path: '/v1/users?q=1#top',
  });
});

test('host 保留端口', () => {
  assert.deepEqual(splitUrl('http://localhost:8080/a/b'), {
    host: 'localhost:8080',
    path: '/a/b',
  });
});

test('无 path → path 回退 "/"', () => {
  assert.deepEqual(splitUrl('https://example.com'), { host: 'example.com', path: '/' });
  assert.deepEqual(splitUrl('https://example.com?x=1'), { host: 'example.com', path: '/?x=1' });
});

test('长 query 原样保留在 path（不截断逻辑）', () => {
  const url = 'https://auth.example.com/login?redirect=https%3A%2F%2Fa.example.com%2Fhome';
  const parts = splitUrl(url);
  assert.equal(parts.host, 'auth.example.com');
  assert.equal(parts.path, '/login?redirect=https%3A%2F%2Fa.example.com%2Fhome');
});

test('相对 / 非法 URL → host 为空、path 为原串', () => {
  assert.deepEqual(splitUrl('/api/users?q=1'), { host: '', path: '/api/users?q=1' });
  assert.deepEqual(splitUrl('data:text/plain,hi'), { host: '', path: 'data:text/plain,hi' });
});

test('空 / 非字符串安全降级', () => {
  assert.deepEqual(splitUrl(''), { host: '', path: '' });
  assert.deepEqual(splitUrl(undefined), { host: '', path: '' });
  assert.deepEqual(splitUrl(123), { host: '', path: '' });
});
