/**
 * render.js — 列表虚拟滚动（DEL-004 / REQ-029 / AC-021）。
 *
 * 设计依据（design.md §5.3 + ADR-005）：
 *   - `createVirtualList({container, rowHeight, overscan, renderRow, onSelect})`
 *     → `{ setData(items):void, scrollToId(id):void, refresh():void }`
 *   - 固定行高窗口化 + DOM 复用：仅渲染可视区 + overscan 行，1000 条下 DOM 节点
 *     数 ≈ 可视行数，与总条数无关（AC-021）。
 *   - `container` 内放一个 spacer 撑起总高度（`items.length * rowHeight`）；数据行
 *     绝对定位在容器内（容器需 `position: relative`，见 styles/panel.css `.list__body`）。
 *   - 滚动 / 尺寸变化重算窗口；`renderRow(record, el, index)` 由调用方填充。
 *
 * 约束：纯原生 DOM、无第三方依赖；模块顶层**零 DOM 访问**（可在 Node 直接 import
 *       `computeWindow` 做纯函数单测）。渲染不可信数据由 renderRow 调用方保证
 *       只用 textContent（本模块自身不写任何 record 内容）。
 *
 * @module render
 */

/**
 * 纯函数：计算当前可视窗口。
 *
 * 行 `i` 占据内容坐标 `[i*rowHeight, (i+1)*rowHeight)`。返回半开区间
 * `[start, end)` 与 `offset = start * rowHeight`。
 *
 * @param {Object} [options]
 * @param {number} [options.scrollTop=0]     滚动容器相对内容顶部的偏移（px）
 * @param {number} [options.viewportHeight=0] 可视区高度（px）
 * @param {number} [options.rowHeight=1]     固定行高（px，必须 > 0）
 * @param {number} [options.total=0]         总行数
 * @param {number} [options.overscan=0]      上下各多渲染的行数
 * @returns {{ start: number, end: number, offset: number, count: number }}
 */
export function computeWindow(options) {
  const opts = options && typeof options === 'object' ? options : {};

  const rawRowHeight = Number(opts.rowHeight);
  const rowHeight = Number.isFinite(rawRowHeight) && rawRowHeight > 0 ? rawRowHeight : 1;

  const rawTotal = Number(opts.total);
  const total = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.floor(rawTotal) : 0;

  const rawTop = Number(opts.scrollTop);
  const scrollTop = Number.isFinite(rawTop) && rawTop > 0 ? rawTop : 0;

  const rawViewport = Number(opts.viewportHeight);
  const viewportHeight = Number.isFinite(rawViewport) && rawViewport > 0 ? rawViewport : 0;

  const rawOverscan = Number(opts.overscan);
  const overscan = Number.isFinite(rawOverscan) && rawOverscan > 0 ? Math.floor(rawOverscan) : 0;

  if (total === 0) {
    return { start: 0, end: 0, offset: 0, count: 0 };
  }

  const firstVisible = Math.floor(scrollTop / rowHeight);
  const lastVisibleExclusive = Math.ceil((scrollTop + viewportHeight) / rowHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(
    total,
    Math.max(lastVisibleExclusive, firstVisible + 1) + overscan,
  );

  return {
    start,
    end,
    offset: start * rowHeight,
    count: Math.max(0, end - start),
  };
}

/** 读取 inline `overflowY`；无则尝试计算样式；再退化为「scrollHeight > clientHeight」。 */
function isScrollable(node) {
  if (!node) {
    return false;
  }
  const inline = node.style ? node.style.overflowY : '';
  if (inline === 'auto' || inline === 'scroll' || inline === 'overlay') {
    return true;
  }
  if (typeof getComputedStyle === 'function') {
    try {
      const computed = getComputedStyle(node);
      const value = computed ? computed.overflowY : '';
      if (value === 'auto' || value === 'scroll' || value === 'overlay') {
        return true;
      }
    } catch (_err) {
      // 环境不支持计算样式 → 继续用尺寸启发式
    }
  }
  const clientHeight = Number(node.clientHeight);
  const scrollHeight = Number(node.scrollHeight);
  return clientHeight > 0 && scrollHeight > clientHeight;
}

/** 向上寻找最近的可滚动祖先。 */
function findScrollParent(node) {
  let current = node ? node.parentElement : null;
  while (current) {
    if (isScrollable(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/** 空实现（无 container / 无 document 环境下的安全降级）。 */
function noopList() {
  return {
    setData() {
      // no-op
    },
    scrollToId() {
      return false;
    },
    refresh() {
      // no-op
    },
  };
}

/**
 * 创建一个固定行高虚拟列表。
 *
 * @param {Object} options
 * @param {HTMLElement} options.container 行宿主（应 `position: relative`）
 * @param {number} options.rowHeight 固定行高（px）
 * @param {number} [options.overscan=5] 上下各多渲染的行数
 * @param {(record:*, el:HTMLElement, index:number) => void} [options.renderRow] 行填充回调
 * @param {Function} [options.onSelect] 预留：TASK-005 选中交互（本任务不接线）
 * @returns {{ setData(items:*[]):void, scrollToId(id:*):boolean, refresh():void }}
 */
export function createVirtualList(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const container = opts.container;
  const renderRow = opts.renderRow;

  if (!container || typeof container.appendChild !== 'function') {
    return noopList();
  }

  const rawRowHeight = Number(opts.rowHeight);
  const rowHeight = Number.isFinite(rawRowHeight) && rawRowHeight > 0 ? rawRowHeight : 1;

  const rawOverscan = Number(opts.overscan);
  const overscan =
    Number.isFinite(rawOverscan) && rawOverscan >= 0 ? Math.floor(rawOverscan) : 5;

  const doc =
    container.ownerDocument ||
    (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.createElement !== 'function') {
    return noopList();
  }

  const scrollElement = findScrollParent(container) || container;

  /** 当前数据（最新在上由调用方决定，本模块不排序）。 */
  let items = [];
  /** 数据版本；版本变化强制重跑 renderRow（如过滤后同位置换了记录）。 */
  let version = 0;
  /** 复用的行元素池（DOM 复用）。 */
  const pool = [];

  // spacer：撑起总高度，使滚动条长度 = items.length * rowHeight。
  const spacer = doc.createElement('div');
  spacer.className = 'list__spacer';
  spacer.style.position = 'relative';
  spacer.style.width = '100%';
  spacer.style.height = '0px';
  container.appendChild(spacer);

  /** 可视区高度（滚动容器优先）。 */
  function viewportHeight() {
    const fromScroll = Number(scrollElement.clientHeight);
    if (Number.isFinite(fromScroll) && fromScroll > 0) {
      return fromScroll;
    }
    const fromContainer = Number(container.clientHeight);
    return Number.isFinite(fromContainer) && fromContainer > 0 ? fromContainer : 0;
  }

  /** 内容坐标下的滚动偏移（扣除 container 在滚动容器内的顶部偏移，如 sticky 表头）。 */
  function contentScrollTop() {
    const base = Number(container.offsetTop) || 0;
    const top = Number(scrollElement.scrollTop) || 0;
    return Math.max(0, top - base);
  }

  /** 按需扩缩行元素池（DOM 复用，不重建已有元素）。 */
  function ensurePool(size) {
    let guard = 0;
    while (pool.length < size && guard < 10000) {
      const el = doc.createElement('div');
      el.className = 'row';
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.right = '0';
      el.style.top = '0';
      el.style.height = rowHeight + 'px';
      el.style.transform = 'translateY(0px)';
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('role', 'row');
      }
      container.appendChild(el);
      pool.push(el);
      guard += 1;
    }
    while (pool.length > size) {
      const el = pool.pop();
      if (el && el.parentElement === container && typeof container.removeChild === 'function') {
        container.removeChild(el);
      }
    }
  }

  /** 渲染当前窗口：定位 + 按需调用 renderRow。 */
  function renderWindow() {
    const win = computeWindow({
      scrollTop: contentScrollTop(),
      viewportHeight: viewportHeight(),
      rowHeight,
      total: items.length,
      overscan,
    });

    ensurePool(win.count);

    for (let k = 0; k < win.count; k += 1) {
      const index = win.start + k;
      const el = pool[k];
      const record = items[index];

      if (el.__rowIndex !== index || el.__version !== version) {
        if (typeof renderRow === 'function') {
          renderRow(record, el, index);
        }
        el.__rowIndex = index;
        el.__version = version;
      }

      el.style.transform = 'translateY(' + index * rowHeight + 'px)';

      if (typeof el.setAttribute === 'function') {
        el.setAttribute('data-index', String(index));
        el.setAttribute(
          'data-id',
          record && record.id !== undefined && record.id !== null ? String(record.id) : '',
        );
      }
    }
  }

  function onScroll() {
    renderWindow();
  }

  if (scrollElement && typeof scrollElement.addEventListener === 'function') {
    scrollElement.addEventListener('scroll', onScroll);
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('resize', onScroll);
  }

  /**
   * 注入数据并重绘。
   * @param {*[]} next
   */
  function setData(next) {
    items = Array.isArray(next) ? next : [];
    version += 1;
    spacer.style.height = items.length * rowHeight + 'px';
    renderWindow();
  }

  /**
   * 滚动到指定 id（按 `record.id` 查找）。
   * @param {*} id
   * @returns {boolean} 是否找到
   */
  function scrollToId(id) {
    let index = -1;
    for (let i = 0; i < items.length; i += 1) {
      const record = items[i];
      if (record && record.id === id) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      return false;
    }
    const base = Number(container.offsetTop) || 0;
    if (scrollElement && typeof scrollElement.scrollTop === 'number') {
      scrollElement.scrollTop = base + index * rowHeight;
    }
    renderWindow();
    return true;
  }

  /** 强制重绘当前窗口（版本 +1 → 重跑 renderRow，如选中态刷新）。 */
  function refresh() {
    version += 1;
    renderWindow();
  }

  // onSelect 预留给 TASK-005 选中交互：本任务不实现点击/键盘选中。
  void opts.onSelect;

  return { setData, scrollToId, refresh };
}

export default { computeWindow, createVirtualList };
