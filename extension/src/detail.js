/**
 * detail.js — 双击明细视图逻辑（DEL-004 / TASK-008）
 *
 * 设计依据：design.md §4.2（接口表）+ ADR-017（详情内容口径与容器）
 *          + ADR-018（失效清理）+ ADR-019（全内存态）。
 *
 * 职责：
 *   1. `buildDetailText(record, resolveBody)` — 生成明细纯文本。
 *      口径 **恒等于** 复制口径的模式 A（`MODE_A`）渲染：
 *        `buildCopyText(record, MODE_A, { responseBody: resolveBody(record) })`
 *      即"详情与复制产物逐字符同源"（AC-009），**不随面板 A/B 切换而变**（A-4）。
 *      六要素由 formatter 结构天然覆盖（见下），本模块不重写拼接逻辑：
 *        - 方法 + URL            → 请求起始行（`{method} {url} {httpVersion}`）
 *        - 请求头                → `record.requestHeaders` 原序逐行
 *        - 请求体                → `[Request Body]` + 原文
 *        - 状态码 + 状态文本     → 响应起始行（`{httpVersion} {status} {statusText}`）
 *        - 响应头                → `record.responseHeaders` 原序逐行
 *        - 响应体                → `[Response Body]` + 原文
 *      注：头保持原始顺序，不缩进/不排序/不转 Markdown（AC-009）；正文一码元不改。
 *
 *   2. `createDetailView({container, onClose, resolveText})` — 详情抽屉**开合状态机**。
 *      纯逻辑部分（open/close/isOpen/currentId/onEvict）不依赖 DOM，可在 Node 下直接单测；
 *      若提供 `container`/`body`，则仅用 **`textContent`** 渲染（禁止 HTML 字符串注入，防 XSS）。
 *      接口（design §4.2）：
 *        `{ open(id), close(), isOpen(), currentId() }`（另附 `onEvict(id)` 供 ADR-018）。
 *
 * 生成器注入（AC-014）：
 *   大响应/二进制/Base64 分类复用 `content.classifyBody/isOverThreshold`；
 *   本模块不 import content，由调用方通过 `resolveBody(record)` / `resolveText(id)` 注入，
 *   从而保证详情口��与复制口径（panel 的 `resolveResponseBodyText`）完全一致。
 *
 * 纯度：`buildDetailText` 为纯函数；`createDetailView` 无全局副作用、无浏览器 API 依赖。
 *       零第三方依赖、零网络、零持久化（check-zero-network 门禁不受影响）。
 *
 * @module detail
 */

import { buildCopyText, MODE_A } from './formatter.js';

/* ------------------------------------------------------------------------- *
 * 1. 明细文本构建
 * ------------------------------------------------------------------------- */

/**
 * 生成单条记录的明细文本（模式 A 口径，纯函数）。
 *
 * 恒等于 `buildCopyText(record, MODE_A, { responseBody: resolveBody(record) })`：
 *   - 与复制产物逐字符同源（AC-009）；
 *   - 与面板当前 `copyMode` 无关（A-4：A/B 只影响复制产物）；
 *   - `resolveBody` 未提供（非函数）时回退 `buildCopyText(record, MODE_A)`，
 *     由 formatter 走 `record.responseContent.text` 兜底路径。
 *
 * @param {Object} record RequestRecord（`capture.normalize` 产出的归一化记录）
 * @param {(record: Object) => *} [resolveBody] 响应体解析器（由调用方注入分类后 body）
 * @returns {string} 明细文本；`record` 非对象时 formatter 返回 `''`
 */
export function buildDetailText(record, resolveBody) {
  if (typeof resolveBody !== 'function') {
    return buildCopyText(record, MODE_A);
  }
  return buildCopyText(record, MODE_A, { responseBody: resolveBody(record) });
}

/* ------------------------------------------------------------------------- *
 * 2. 详情抽屉开合状态机
 * ------------------------------------------------------------------------- */

/**
 * 把任意值规整为可用的元素桩（具备 `textContent` 或 `hidden` 才认为可用）。
 * @param {*} el
 * @returns {Object|null}
 */
function toElement(el) {
  if (el && typeof el === 'object') {
    return el;
  }
  return null;
}

/**
 * 创建一个详情视图开合状态机。
 *
 * 选项（全部可选，缺省即为纯逻辑状态机）：
 *   - `container`：抽屉容器（`#detail-pane`）；open/close 时切换其 `hidden`。
 *   - `body`：文本宿主（`#detail-body`，`<pre>`）；open 时以 `textContent` 注入。
 *     未提供 `body` 时，若 `container` 自身有 `textContent`，退化为直接写入 `container`。
 *   - `resolveText(id)`：按 id 解析明细文本（通常 = `buildDetailText(record, resolveBody)`）。
 *   - `onClose(id)`：关闭回调（隔离异常）；参数为被关闭的 id。
 *
 * 语义：
 *   - `open(id)`：`id` 为 null/undefined → 拒绝（返回 false，不改变状态）；否则置为当前项并渲染。
 *   - `close()`：已关闭 → false（幂等）；否则清空 `textContent`、隐藏容器、回调、返回 true。
 *   - `isOpen()`：是否处于打开态。
 *   - `currentId()`：当前打开的 recordId（未打开 → null）。
 *   - `onEvict(id)`：若 `id` 正是当前打开项 → 自动 `close()` 并返回 true（ADR-018），否则 false。
 *
 * 异常隔离：`resolveText` / `onClose` 抛错不得破坏状态机，也不得外抛。
 *
 * @param {Object} [options]
 * @param {Object} [options.container] 抽屉容器（`#detail-pane`）
 * @param {Object} [options.body] 文本宿主（`#detail-body`）
 * @param {(id: *) => string} [options.resolveText] 明细文本解析器
 * @param {(id: *) => void} [options.onClose] 关闭回调
 * @returns {{open: Function, close: Function, isOpen: Function, currentId: Function, onEvict: Function}}
 */
export function createDetailView(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const container = toElement(opts.container);
  const body = toElement(opts.body) || (container && 'textContent' in container ? container : null);
  const resolveText = typeof opts.resolveText === 'function' ? opts.resolveText : null;
  const onClose = typeof opts.onClose === 'function' ? opts.onClose : null;

  /** 当前打开的 recordId；null = 未打开。 */
  let currentId = null;

  /** 安全设置元素属性（桩可能只读/缺属性）。 */
  function setProp(el, name, value) {
    if (!el) {
      return;
    }
    try {
      el[name] = value;
    } catch (_err) {
      // 元素桩不可写 → 忽略（纯逻辑状态仍正确）
    }
  }

  /** 安全解析文本（异常 → 空串）。 */
  function safeResolveText(id) {
    if (!resolveText) {
      return '';
    }
    try {
      const text = resolveText(id);
      return typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text);
    } catch (_err) {
      return '';
    }
  }

  /** 安全调用关闭回调（异常隔离）。 */
  function safeOnClose(id) {
    if (!onClose) {
      return;
    }
    try {
      onClose(id);
    } catch (_err) {
      // 回调失败不得破坏状态机
    }
  }

  /**
   * 打开某条记录的明细。
   * @param {number|string} id recordId
   * @returns {boolean} 是否成功打开（非法 id → false）
   */
  function open(id) {
    if (id === undefined || id === null) {
      return false;
    }
    currentId = id;
    if (body) {
      setProp(body, 'textContent', safeResolveText(id));
    }
    if (container) {
      setProp(container, 'hidden', false);
    }
    return true;
  }

  /**
   * 关闭明细（幂等）。
   * @returns {boolean} 是否由「已打开」转为「关闭」
   */
  function close() {
    if (currentId === null) {
      return false;
    }
    const closedId = currentId;
    currentId = null;
    if (body) {
      setProp(body, 'textContent', '');
    }
    if (container) {
      setProp(container, 'hidden', true);
    }
    safeOnClose(closedId);
    return true;
  }

  /**
   * 处理记录被淘汰（环形缓冲/失效清理，ADR-018）。
   * 若被淘汰的正是当前打开项 → 自动关闭。
   * @param {number|string} id 被淘汰的 recordId
   * @returns {boolean} 是否因此关闭了明细
   */
  function onEvict(id) {
    if (currentId === null || id !== currentId) {
      return false;
    }
    close();
    return true;
  }

  /** 是否处于打开态。 */
  function isOpen() {
    return currentId !== null;
  }

  /** 当前打开的 recordId（未打开 → null）。 */
  function currentIdValue() {
    return currentId;
  }

  return {
    open,
    close,
    isOpen,
    currentId: currentIdValue,
    onEvict,
  };
}

export default { buildDetailText, createDetailView };
