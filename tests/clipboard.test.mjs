/**
 * clipboard.test.mjs — 剪贴板写入 + 降级链 + Toast 单元测试
 * （DEL-007 / REQ-025 / REQ-034 / AC-011 / AC-022）
 *
 * 全部使用注入的 fake navigator/document，纯 Node 运行、零第三方依赖。
 * 运行：node --test "tests/clipboard.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { copyText, showToast, createToast, DEFAULT_TOAST_MS } from '../extension/src/clipboard.js';

/* ------------------------------------------------------------------------- *
 * 测试替身
 * ------------------------------------------------------------------------- */

/**
 * 构造 fake document，支持 execCommand 降级路径所需的 DOM 操作，
 * 并记录 append/remove/命令，便于断言「临时节点已清理」。
 *
 * @param {{execCommandResult?:boolean, throwOnExec?:boolean}} [opts]
 */
function makeFakeDocument(opts = {}) {
  const execCommandResult = opts.execCommandResult !== false; // 默认 true
  const appended = [];
  const removed = [];
  const selections = [];

  const body = {
    children: appended,
    appendChild(node) {
      appended.push(node);
      node.parentNode = body;
      return node;
    },
    removeChild(node) {
      const i = appended.indexOf(node);
      if (i >= 0) appended.splice(i, 1);
      removed.push(node);
      node.parentNode = null;
      return node;
    },
  };

  const document = {
    body,
    lastCommand: null,
    createElement(tag) {
      const el = {
        tagName: tag,
        value: '',
        style: {},
        parentNode: null,
        selected: false,
        range: null,
        attrs: {},
        setAttribute(k, v) {
          el.attrs[k] = v;
        },
        focus() {
          el.focused = true;
        },
        select() {
          el.selected = true;
        },
        setSelectionRange(start, end) {
          el.range = [start, end];
          selections.push([start, end]);
        },
        remove() {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        },
      };
      return el;
    },
    execCommand(cmd) {
      document.lastCommand = cmd;
      if (opts.throwOnExec) {
        throw new Error('exec exploded');
      }
      return execCommandResult;
    },
  };

  return { document, body, appended, removed, selections };
}

/** 构造 fake navigator：writeText 由调用方提供。 */
function makeNavigator(writeText) {
  return { clipboard: writeText ? { writeText } : {} };
}

/** 构造 fake Toast 元素（classList / setAttribute / textContent）。 */
function makeToastEl() {
  const classes = new Set();
  return {
    textContent: '',
    attrs: {},
    classList: {
      add(c) {
        classes.add(c);
      },
      remove(...cs) {
        for (const c of cs) classes.delete(c);
      },
      contains(c) {
        return classes.has(c);
      },
      all() {
        return Array.from(classes);
      },
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
  };
}

/** 记录型 setTimeout/clearTimeout（确定性，不真实延时）。 */
function makeFakeTimers() {
  let nextId = 1;
  const scheduled = [];
  const cleared = [];
  const setTimeout = (fn, ms) => {
    const id = nextId++;
    scheduled.push({ id, fn, ms });
    return id;
  };
  const clearTimeout = (id) => {
    cleared.push(id);
  };
  return { setTimeout, clearTimeout, scheduled, cleared };
}

/* ------------------------------------------------------------------------- *
 * copyText — 主路径
 * ------------------------------------------------------------------------- */

test('主路径成功：writeText resolve → {ok:true, via:"async"}', async () => {
  let received = null;
  const result = await copyText('hello world', {
    navigator: makeNavigator(async (t) => {
      received = t;
    }),
  });

  assert.deepEqual(result, { ok: true, via: 'async' });
  assert.equal(received, 'hello world');
});

test('内容不改动：传入文本被逐字符原样传给 writeText', async () => {
  // 含 CRLF、Tab、双空格、中文、emoji、JSON 紧凑排版 —— 一律不得被改写。
  const text = 'line1\r\nline2\ttab  two  spaces\n中文😀{"a":1,"b":[2,3]}';
  let received = null;

  await copyText(text, {
    navigator: makeNavigator(async (t) => {
      received = t;
    }),
  });

  assert.equal(received, text);
  assert.equal(received.length, text.length);
  for (let i = 0; i < text.length; i += 1) {
    assert.equal(received.charCodeAt(i), text.charCodeAt(i), 'charCode mismatch at ' + i);
  }
});

/* ------------------------------------------------------------------------- *
 * copyText — 降级路径
 * ------------------------------------------------------------------------- */

test('降级：primary reject + execCommand true → {ok:true, via:"execCommand"} 且清理临时节点', async () => {
  const fake = makeFakeDocument({ execCommandResult: true });
  const result = await copyText('payload', {
    navigator: makeNavigator(async () => {
      throw new Error('document is not focused');
    }),
    document: fake.document,
  });

  assert.deepEqual(result, { ok: true, via: 'execCommand' });
  assert.equal(fake.document.lastCommand, 'copy');
  // 临时 textarea 必须已从 body 清理。
  assert.equal(fake.appended.length, 0, '临时节点未清理');
  assert.equal(fake.removed.length, 1, '未走 removeChild 清理');
});

test('降级：navigator.clipboard 不可用（非安全上下文）→ execCommand 接管', async () => {
  const fake = makeFakeDocument({ execCommandResult: true });
  const result = await copyText('abc', {
    navigator: makeNavigator(null), // clipboard 存在但无 writeText
    document: fake.document,
  });

  assert.deepEqual(result, { ok: true, via: 'execCommand' });
});

test('降级：完全没有 navigator（无 API）→ execCommand 接管', async () => {
  const fake = makeFakeDocument({ execCommandResult: true });
  const result = await copyText('abc', { document: fake.document });
  assert.deepEqual(result, { ok: true, via: 'execCommand' });
});

/* ------------------------------------------------------------------------- *
 * copyText — 双失败
 * ------------------------------------------------------------------------- */

test('双失败：primary reject + execCommand false → {ok:false, via:"none", reason} 且不抛', async () => {
  const fake = makeFakeDocument({ execCommandResult: false });
  let result;

  await assert.doesNotReject(async () => {
    result = await copyText('x', {
      navigator: makeNavigator(async () => {
        throw new Error('not allowed');
      }),
      document: fake.document,
    });
  });

  assert.equal(result.ok, false);
  assert.equal(result.via, 'none');
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0, 'reason 不能为空');
});

test('双失败：execCommand 抛异常 → 捕获为失败结果且清理临时节点', async () => {
  const fake = makeFakeDocument({ throwOnExec: true });
  const result = await copyText('x', {
    navigator: makeNavigator(async () => {
      throw new Error('denied');
    }),
    document: fake.document,
  });

  assert.equal(result.ok, false);
  assert.equal(result.via, 'none');
  assert.ok(result.reason.includes('exec exploded'));
  assert.equal(fake.appended.length, 0, '异常路径也必须清理临时节点');
});

test('双失败：无 navigator 且无 document → {ok:false, via:"none"} 不抛', async () => {
  const result = await copyText('x', {});
  assert.equal(result.ok, false);
  assert.equal(result.via, 'none');
  assert.equal(typeof result.reason, 'string');
});

/* ------------------------------------------------------------------------- *
 * showToast
 * ------------------------------------------------------------------------- */

test('showToast：写入文案 + success 类名 + data-visible=true，并安排自动隐藏', () => {
  const el = makeToastEl();
  const timers = makeFakeTimers();

  const shown = showToast('已复制到剪贴板', 'success', {
    el,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    durationMs: 100,
  });

  assert.equal(shown, true);
  assert.equal(el.textContent, '已复制到剪贴板');
  assert.ok(el.classList.contains('toast--success'));
  assert.equal(el.attrs['data-visible'], 'true');
  assert.equal(timers.scheduled.length, 1);
  assert.equal(timers.scheduled[0].ms, 100);

  // 执行隐藏回调 → data-visible=false。
  timers.scheduled[0].fn();
  assert.equal(el.attrs['data-visible'], 'false');
});

test('showToast：error 类名且清除旧计时器', () => {
  const el = makeToastEl();
  const timers = makeFakeTimers();

  showToast('第一次', 'info', { el, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  showToast('复制失败：权限被拒绝', 'error', {
    el,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });

  assert.equal(el.textContent, '复制失败：权限被拒绝');
  assert.ok(el.classList.contains('toast--error'));
  assert.ok(!el.classList.contains('toast--info'), '旧类名应被移除');
  assert.equal(timers.cleared.length, 1, '应清除第一次的计时器');
});

test('showToast：未知 kind 回退 info；找不到元素返回 false', () => {
  const el = makeToastEl();
  assert.equal(showToast('x', 'weird', { el, durationMs: 0 }), true);
  assert.ok(el.classList.contains('toast--info'));
  assert.equal(showToast('x', 'info', { document: { querySelector: () => null } }), false);
});

test('showToast：默认时长常量与自动隐藏', () => {
  assert.equal(DEFAULT_TOAST_MS, 2400);
  const el = makeToastEl();
  const timers = makeFakeTimers();
  showToast('x', 'info', { el, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  assert.equal(timers.scheduled[0].ms, DEFAULT_TOAST_MS);
});

/* ------------------------------------------------------------------------- *
 * createToast 工厂
 * ------------------------------------------------------------------------- */

test('createToast：返回可复用函数，重复调用复用同一元素并清理计时器', () => {
  const el = makeToastEl();
  const timers = makeFakeTimers();
  const toast = createToast(el, {
    durationMs: 50,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });

  assert.equal(toast('a', 'info'), true);
  assert.equal(toast('b', 'success'), true);
  assert.equal(el.textContent, 'b');
  assert.ok(el.classList.contains('toast--success'));
  assert.ok(!el.classList.contains('toast--info'));
  assert.equal(timers.cleared.length, 1);

  // 隐藏回调把可见性复位。
  timers.scheduled[timers.scheduled.length - 1].fn();
  assert.equal(el.attrs['data-visible'], 'false');
});

test('createToast：无元素时返回 false 且不抛', () => {
  const toast = createToast(null);
  assert.equal(toast('x'), false);
});
