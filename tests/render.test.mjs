// tests/render.test.mjs — 虚拟滚动窗口计算 + createVirtualList 轻量 DOM 桩测试
// 运行: node --test "tests/render.test.mjs"
// 覆盖: REQ-029 / AC-021 / DEL-004
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeWindow, createVirtualList } from '../extension/src/render.js';

/* ------------------------------------------------------------------ *
 * 极简 DOM 桩（零第三方依赖）——只实现 render.js 用到的 API 面。
 * ------------------------------------------------------------------ */

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(...names) {
    names.forEach((n) => this._set.add(n));
  }
  remove(...names) {
    names.forEach((n) => this._set.delete(n));
  }
  contains(name) {
    return this._set.has(name);
  }
}

class FakeElement {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentElement = null;
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.className = '';
    this.classList = new FakeClassList();
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.clientHeight = 0;
    this.offsetTop = 0;
    this._text = '';
  }
  get firstChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }
  appendChild(child) {
    if (child.parentElement) {
      child.parentElement.removeChild(child);
    }
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentElement = null;
    }
    return child;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  addEventListener(type, fn) {
    (this.listeners[type] || (this.listeners[type] = [])).push(fn);
  }
  removeEventListener(type, fn) {
    const list = this.listeners[type];
    if (list) {
      const index = list.indexOf(fn);
      if (index >= 0) {
        list.splice(index, 1);
      }
    }
  }
  dispatchEvent(type) {
    const list = this.listeners[type] || [];
    for (const fn of list.slice()) {
      fn({ type });
    }
  }
  set textContent(value) {
    this._text = String(value);
  }
  get textContent() {
    return this._text;
  }
}

const fakeDoc = { createElement: (tag) => new FakeElement(tag, fakeDoc) };

/** 创建一个可视高度为 viewportHeight 的容器。 */
function makeContainer(viewportHeight) {
  const el = new FakeElement('div', fakeDoc);
  el.clientHeight = viewportHeight;
  return el;
}

/** 计数容器内数据行（.row）元素。 */
function rowElements(container) {
  return container.children.filter((c) => c.className === 'row');
}

/** 生成 n 条带自增 id 的记录。 */
function makeItems(n) {
  const out = new Array(n);
  for (let i = 0; i < n; i += 1) {
    out[i] = { id: i + 1, url: 'https://example.test/' + i };
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * computeWindow（纯函数）
 * ------------------------------------------------------------------ */

test('computeWindow：1000 条仅渲染可视区 + overscan（远小于总数）', () => {
  const win = computeWindow({
    scrollTop: 0,
    viewportHeight: 280,
    rowHeight: 28,
    total: 1000,
    overscan: 5,
  });
  assert.equal(win.start, 0);
  assert.equal(win.end, 15); // 10 可视 + 5 overscan
  assert.equal(win.count, 15);
  assert.ok(win.count < 1000 / 10, 'window must be far smaller than total');
});

test('computeWindow：滚动中段窗口平移，count 受控', () => {
  const win = computeWindow({
    scrollTop: 28 * 10,
    viewportHeight: 280,
    rowHeight: 28,
    total: 1000,
    overscan: 5,
  });
  assert.equal(win.start, 5);
  assert.equal(win.end, 25);
  assert.equal(win.count, 20);
  assert.equal(win.offset, 5 * 28);
});

test('computeWindow：窗口被 total 截断（不越界）', () => {
  const win = computeWindow({
    scrollTop: 28 * 990,
    viewportHeight: 280,
    rowHeight: 28,
    total: 1000,
    overscan: 5,
  });
  assert.equal(win.end, 1000);
  assert.ok(win.start >= 0 && win.start < 1000);
  assert.equal(win.count, win.end - win.start);
});

test('computeWindow：total=0 / 非法参数安全降级', () => {
  assert.deepEqual(computeWindow({ total: 0 }), { start: 0, end: 0, offset: 0, count: 0 });
  assert.deepEqual(computeWindow(), { start: 0, end: 0, offset: 0, count: 0 });
  assert.deepEqual(computeWindow({ total: -5, rowHeight: 0 }), {
    start: 0,
    end: 0,
    offset: 0,
    count: 0,
  });
  // 非正 viewport 也至少返回 1 行
  const win = computeWindow({ scrollTop: 0, viewportHeight: 0, rowHeight: 28, total: 10, overscan: 0 });
  assert.equal(win.count, 1);
});

test('computeWindow：可视高度 0 或负 scrollTop 不返回负索引', () => {
  const win = computeWindow({
    scrollTop: -100,
    viewportHeight: 280,
    rowHeight: 28,
    total: 100,
    overscan: 5,
  });
  assert.equal(win.start, 0);
  assert.ok(win.end <= 100);
});

/* ------------------------------------------------------------------ *
 * createVirtualList（DOM 桩）
 * ------------------------------------------------------------------ */

test('createVirtualList.setData(1000)：仅渲染可视区行（DOM 复用，节点数远小于 1000）', () => {
  const container = makeContainer(280);
  const rendered = [];
  const list = createVirtualList({
    container,
    rowHeight: 28,
    overscan: 5,
    renderRow: (record, el, index) => {
      rendered.push(index);
    },
  });

  list.setData(makeItems(1000));

  const spacer = container.children[0];
  assert.equal(spacer.className, 'list__spacer');
  assert.equal(spacer.style.height, 1000 * 28 + 'px');

  const rows = rowElements(container);
  assert.equal(rows.length, 15);
  assert.ok(rows.length < 50, 'rendered rows must be far fewer than 1000');
  assert.equal(rendered.length, 15);
  assert.equal(rows[0].getAttribute('data-index'), '0');
  assert.equal(rows[0].getAttribute('data-id'), '1');

  // 绝对定位 + transform 定位（而非全量流式布局）
  assert.equal(rows[0].style.position, 'absolute');
  assert.equal(rows[1].style.transform, 'translateY(28px)');
});

test('createVirtualList：滚动重算窗口，复用同一批行元素', () => {
  const container = makeContainer(280);
  const list = createVirtualList({
    container,
    rowHeight: 28,
    overscan: 5,
    renderRow: () => {},
  });
  list.setData(makeItems(1000));

  const before = rowElements(container);
  container.scrollTop = 28 * 10;
  container.dispatchEvent('scroll');

  const after = rowElements(container);
  assert.equal(after.length, 20); // 10 可视 + 上下各 5 overscan
  assert.equal(after[0].getAttribute('data-index'), '5');
  // 前 15 个元素被复用（同一引用），仅新增 5 个
  assert.equal(before[0], after[0]);
});

test('createVirtualList：setData 缩容时回收多余行元素并更新 spacer', () => {
  const container = makeContainer(280);
  const list = createVirtualList({ container, rowHeight: 28, overscan: 5, renderRow: () => {} });

  list.setData(makeItems(1000));
  assert.equal(rowElements(container).length, 15);

  list.setData([]);
  assert.equal(rowElements(container).length, 0);
  assert.equal(container.children[0].style.height, '0px');

  list.setData(makeItems(3));
  assert.equal(rowElements(container).length, 3);
  assert.equal(container.children[0].style.height, 3 * 28 + 'px');
});

test('createVirtualList：scrollToId 命中定位并重绘，未命中返回 false', () => {
  const container = makeContainer(280);
  const list = createVirtualList({ container, rowHeight: 28, overscan: 5, renderRow: () => {} });
  list.setData(makeItems(1000));

  assert.equal(list.scrollToId(500), true);
  assert.equal(container.scrollTop, 499 * 28);

  const rows = rowElements(container);
  assert.equal(rows[0].getAttribute('data-index'), '494');
  assert.equal(rows[0].getAttribute('data-id'), '495');

  assert.equal(list.scrollToId(99999), false);
});

test('createVirtualList.refresh 强制重跑 renderRow（版本变化）', () => {
  const container = makeContainer(280);
  let calls = 0;
  const list = createVirtualList({
    container,
    rowHeight: 28,
    overscan: 5,
    renderRow: () => {
      calls += 1;
    },
  });
  list.setData(makeItems(100));

  const firstPaint = calls;
  assert.ok(firstPaint > 0);
  list.refresh(); // 同窗口但版本 +1 → 重跑
  assert.ok(calls > firstPaint);
  assert.doesNotThrow(() => list.refresh());
});

test('createVirtualList：无 container / 无 document 时安全降级不抛错', () => {
  const empty = createVirtualList({ rowHeight: 28 });
  assert.equal(typeof empty.setData, 'function');
  assert.equal(empty.scrollToId(1), false);
  assert.doesNotThrow(() => empty.setData([{ id: 1 }]));
  assert.doesNotThrow(() => empty.refresh());
});
