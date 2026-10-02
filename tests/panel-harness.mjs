/**
 * tests/panel-harness.mjs — 面板级接线测试的零依赖 DOM shim（TASK-004 / DEL-008）。
 *
 * 目的：在 Node 下**真实加载** `extension/panel.js`（非纯模型复制品），驱动真实的
 * `#list-body` click / contextmenu 事件与复制按钮，读取真实写入剪贴板的文本。
 * 这样「多选态右键 → 批量项 → N 段」「混合修饰键并集」「入口等价」等断言才真的
 * 覆盖 `onContextMenu` / `onListBodyClick` / 复制管线，而非自欺的模型桩。
 *
 * 约束：零第三方依赖（手写最小 duck-typed DOM）；不修改任何生产代码；仅测试期使用。
 * 命名不以 `.test.mjs` 结尾 → 不会被 `node --test "tests/**\/*.test.mjs"` 当作用例执行。
 *
 * @module panel-harness
 */

/* ------------------------------------------------------------------ *
 * 最小 duck-typed DOM
 * ------------------------------------------------------------------ */

class ClassList {
  constructor() {
    this.set = new Set();
  }
  add(...cs) {
    cs.forEach((c) => this.set.add(c));
  }
  remove(...cs) {
    cs.forEach((c) => this.set.delete(c));
  }
  contains(c) {
    return this.set.has(c);
  }
  toggle(c, force) {
    const has = this.set.has(c);
    const want = force === undefined ? !has : !!force;
    if (want) this.set.add(c);
    else this.set.delete(c);
    return want;
  }
}

function matches(el, sel) {
  if (!el || !el.tagName) return false;
  if (sel.startsWith('#')) return el.attrs.id === sel.slice(1);
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel);
  if (m) {
    if (!(m[1] in el.attrs)) return false;
    return m[2] === undefined ? true : String(el.attrs[m[1]]) === m[2];
  }
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

class El {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.style = {};
    this._listeners = {};
    this.classList = new ClassList();
    this._text = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.scrollTop = 0;
    this.offsetTop = 0;
    this.offsetWidth = 120;
    this.offsetHeight = 40;
    this.clientHeight = 300;
    this.scrollHeight = 0;
  }
  get parentElement() {
    return this.parentNode;
  }
  get className() {
    return [...this.classList.set].join(' ');
  }
  set className(v) {
    this.classList.set = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  get firstChild() {
    return this.children[0] || null;
  }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    this._text = v === null || v === undefined ? '' : String(v);
    this.children = [];
  }
  appendChild(c) {
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  insertBefore(c, ref) {
    c.parentNode = this;
    const i = this.children.indexOf(ref);
    if (i === -1) this.children.push(c);
    else this.children.splice(i, 0, c);
    return c;
  }
  removeChild(c) {
    const i = this.children.indexOf(c);
    if (i !== -1) {
      this.children.splice(i, 1);
      c.parentNode = null;
    }
    return c;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  hasAttribute(k) {
    return k in this.attrs;
  }
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  removeEventListener(type, fn) {
    const a = this._listeners[type] || [];
    const i = a.indexOf(fn);
    if (i !== -1) a.splice(i, 1);
  }
  dispatchEvent(ev) {
    ev.target = ev.target || this;
    ev.currentTarget = this;
    ev.preventDefault = ev.preventDefault || function () {};
    ev.stopPropagation = ev.stopPropagation || function () {};
    for (const fn of (this._listeners[ev.type] || []).slice()) fn.call(this, ev);
    return true;
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  closest(sel) {
    let c = this;
    while (c) {
      if (matches(c, sel)) return c;
      c = c.parentNode;
    }
    return null;
  }
  contains(node) {
    let c = node;
    while (c) {
      if (c === this) return true;
      c = c.parentNode;
    }
    return false;
  }
  _walk(out) {
    for (const c of this.children) {
      out.push(c);
      c._walk(out);
    }
    return out;
  }
  querySelectorAll(sel) {
    const parts = String(sel).split(',').map((s) => s.trim());
    return this._walk([]).filter((el) => parts.some((p) => matches(el, p)));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

class Document extends El {
  constructor() {
    super('#document', null);
    this.ownerDocument = this;
    this.documentElement = new El('html', this);
    this.body = new El('body', this);
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);
    this.readyState = 'complete';
    this.activeElement = null;
    this._byId = new Map();
  }
  createElement(tag) {
    return new El(tag, this);
  }
  register(el) {
    this._byId.set(el.attrs.id, el);
    return el;
  }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this._byId.has(id)) return this._byId.get(id);
    }
    return super.querySelector(sel);
  }
}

/**
 * 构建 DOM + 安装全局桩 + 真实加载 panel.js。
 *
 * @returns {Promise<Object>} harness
 */
export async function createPanelHarness() {
  const document = new Document();

  // 稳定 DOM 契约 id（与 panel.html / check-panel-shell.mjs 同源，② 后契约）。
  const ids = [
    'toolbar', 'search', 'filter-method', 'filter-status', 'filter-type',
    'list', 'list-body', 'empty', 'copy-actions', 'copy-btn', 'copy-btn-a',
    'copy-btn-b', 'copy-curl-btn', 'multiselect-actions', 'select-all-btn',
    'copy-selected-btn', 'selected-count', 'context-menu', 'detail-pane',
    'detail-body', 'detail-close', 'toast', 'privacy-link',
  ];
  for (const id of ids) {
    const el = document.createElement('div');
    el.attrs.id = id;
    document.register(el);
  }
  document._byId.get('multiselect-actions').hidden = true;

  // 模式 A/B 按钮契约（TASK-005）。
  document._byId.get('copy-btn-a').setAttribute('data-copy-mode', 'A');
  document._byId.get('copy-btn-a').setAttribute('data-i18n', 'mode.aButton');
  document._byId.get('copy-btn-b').setAttribute('data-copy-mode', 'B');
  document._byId.get('copy-btn-b').setAttribute('data-i18n', 'mode.bButton');
  document._byId.get('copy-selected-btn').setAttribute('data-i18n', 'multi.copySelected');
  document._byId.get('select-all-btn').setAttribute('data-i18n', 'multi.selectAll');

  // 详情抽屉头部（detail-copy-btn 由 panel.js 追加）。
  const detailPane = document._byId.get('detail-pane');
  const detailHeader = document.createElement('header');
  detailHeader.classList.add('detail-pane__header');
  detailHeader.appendChild(document._byId.get('detail-close'));
  detailPane.appendChild(detailHeader);

  const empty = document._byId.get('empty');
  const et = document.createElement('p');
  et.classList.add('empty__title');
  empty.appendChild(et);
  const eh = document.createElement('p');
  eh.classList.add('empty__hint');
  empty.appendChild(eh);

  const list = document._byId.get('list');
  const listBody = document._byId.get('list-body');
  list.appendChild(listBody);
  list.clientHeight = 300;
  listBody.clientHeight = 300;

  // 剪贴板捕获。
  let clipboardText = null;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      clipboard: {
        writeText: async (text) => {
          clipboardText = text;
        },
      },
    },
    configurable: true,
  });

  globalThis.document = document;
  globalThis.window = {
    innerWidth: 1200,
    innerHeight: 800,
    addEventListener() {},
    removeEventListener() {},
    open() {},
  };
  globalThis.getComputedStyle = () => ({
    getPropertyValue: (k) => (k === '--row-height' ? '28px' : ''),
    overflowY: '',
  });

  const rafQueue = [];
  globalThis.requestAnimationFrame = (cb) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  globalThis.confirm = () => true;

  // capture 依赖的 chrome.devtools 最小桩。
  let requestListener = null;
  globalThis.chrome = {
    devtools: {
      network: {
        onRequestFinished: {
          addListener: (fn) => {
            requestListener = fn;
          },
          removeListener: () => {
            requestListener = null;
          },
        },
      },
    },
  };

  const panel = await import('../extension/panel.js');
  flushRaf();

  function flushRaf() {
    while (rafQueue.length) rafQueue.shift()();
  }

  /** 喂入一条 HAR-like 记录（id 递增，与 capture 归一化一致）。 */
  function feed(id, url, body) {
    if (!requestListener) {
      throw new Error('capture listener not installed');
    }
    const text = body === undefined ? '{"id":' + id + '}' : body;
    requestListener({
      request: {
        method: 'GET',
        url: url || 'https://x/' + id,
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'X', value: 'y' }],
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        content: { text, mimeType: 'application/json', size: text.length },
      },
      time: 10,
      startedDateTime: '2026-10-02T10:00:00.000Z',
      _resourceType: 'XHR',
      getContent: (cb) => cb(text, undefined),
    });
  }

  function rows() {
    return listBody.children.filter((c) => c.classList && c.classList.contains('row'));
  }
  function rowByIndex(i) {
    return rows().find((r) => Number(r.getAttribute('data-index')) === i) || null;
  }
  function clickRow(i, mods = {}) {
    const row = rowByIndex(i);
    if (!row) throw new Error('no row at index ' + i);
    listBody.dispatchEvent({
      type: 'click',
      target: row,
      ctrlKey: !!mods.ctrl,
      shiftKey: !!mods.shift,
      metaKey: !!mods.meta,
    });
  }
  function rightClickRow(i, mods = {}) {
    const row = rowByIndex(i);
    if (!row) throw new Error('no row at index ' + i);
    listBody.dispatchEvent({
      type: 'contextmenu',
      target: row,
      ctrlKey: !!mods.ctrl,
      shiftKey: !!mods.shift,
      metaKey: !!mods.meta,
      clientX: 50,
      clientY: 50,
    });
  }
  /** 在列表体空白/表头派发右键（无 `.row` 命中）。 */
  function rightClickBody() {
    listBody.dispatchEvent({
      type: 'contextmenu',
      target: listBody,
      clientX: 400,
      clientY: 400,
    });
  }
  /** 派发 ↑/↓（清空集合、回落单选）。 */
  function pressArrow(key) {
    list.dispatchEvent({ type: 'keydown', key: key, preventDefault() {} });
    flushRaf();
  }
  function menuEl() {
    return document._byId.get('context-menu');
  }
  function menuItems() {
    const menu = menuEl();
    return menu.children.map((b) => ({
      id: b.attrs.id || b.id || null,
      action: typeof b.getAttribute === 'function' ? b.getAttribute('data-action') : null,
      text: b.textContent,
      disabled: b.disabled,
    }));
  }
  function menuIsOpen() {
    const menu = menuEl();
    return menu.hidden === false;
  }
  /** 通过 Esc 关闭已打开菜单（文档级监听）。 */
  function closeMenu() {
    document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  }
  function clickMenuId(id) {
    const menu = menuEl();
    const btn = menu.children.find((b) => (b.attrs.id || b.id) === id);
    if (!btn) throw new Error('no menu item #' + id);
    btn.dispatchEvent({ type: 'click' });
  }
  function clickButton(id) {
    document._byId.get(id).dispatchEvent({ type: 'click' });
  }
  function clickCopySelected() {
    clipboardText = null;
    clickButton('copy-selected-btn');
  }
  function getClipboard() {
    return clipboardText;
  }
  function resetClipboard() {
    clipboardText = null;
  }
  function countMarkers(text) {
    return (String(text || '').match(/^===== #\d+\/\d+ =====$/gm) || []).length;
  }
  function tick() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  return {
    panel,
    document,
    list,
    listBody,
    flushRaf,
    feed,
    rows,
    rowByIndex,
    clickRow,
    rightClickRow,
    rightClickBody,
    pressArrow,
    menuEl,
    menuItems,
    menuIsOpen,
    closeMenu,
    clickMenuId,
    clickButton,
    clickCopySelected,
    getClipboard,
    resetClipboard,
    countMarkers,
    tick,
  };
}
