/**
 * clipboard.js — 剪贴板写入 + 降级链 + Toast 提示
 * （DEL-007 / REQ-025 / REQ-034 / AC-011 / AC-022）
 *
 * 写入双路径（ADR-007 / design §5.1 D-3）：
 *   1. 首选 `navigator.clipboard.writeText(text)`（异步 Clipboard API）
 *      → 成功返回 `{ok:true, via:'async'}`；
 *   2. 失败 / 不可用 / 非安全上下文（`navigator.clipboard` 缺失或抛异常）
 *      → 降级 `document.execCommand('copy')`：构造临时 `<textarea>`、写入文本、
 *      选中、执行、**无论成败都清理** → 成功返回 `{ok:true, via:'execCommand'}`；
 *   3. 两条路径均失败 → `{ok:false, via:'none', reason}`，**绝不抛异常**。
 *
 * 依赖注入（可测试性）：
 *   `copyText(text, deps)` / `showToast(msg, kind, deps)` 的 `deps` 可注入
 *   `{navigator, document, el, durationMs, setTimeout, clearTimeout}`，
 *   使纯 Node（无 DOM）环境下可做确定性单元测试；缺省回退全局对象。
 *
 * Toast：
 *   - `showToast(message, kind, deps)`：在目标元素（默认 `#toast`）显示文案并自动隐藏；
 *   - `createToast(el, options)`：工厂，返回绑定了专属计时器的 toast 函数。
 *   两者均只用 `textContent`（禁止 innerHTML，防注入）、按 kind 加类名
 *   （`toast--success` / `toast--error` / `toast--info`）。
 *
 * 约束：纯原生 ESM、零第三方依赖；不发起任何网络请求；不读写任何持久化存储。
 *
 * @module clipboard
 */

/** Toast 默认自动隐藏时长（ms）。 */
export const DEFAULT_TOAST_MS = 2400;

/** 合法 Toast 类别（未知值统一回退 `info`）。 */
const TOAST_KINDS = ['info', 'success', 'error'];

/** 每个 Toast 元素的隐藏计时器（避免 DOM 上挂非标准属性）。 */
const toastTimers = new WeakMap();

/**
 * 取错误的人类可读原因（异常 / 字符串 / 兜底）。
 * @param {*} err
 * @returns {string}
 */
function describeError(err) {
  if (err && typeof err.message === 'string' && err.message.length > 0) {
    return err.message;
  }
  if (typeof err === 'string' && err.length > 0) {
    return err;
  }
  return 'unknown error';
}

/**
 * 解析 navigator（deps 优先，其次全局；均无 → null）。
 * @param {Object} deps
 * @returns {Object|null}
 */
function resolveNavigator(deps) {
  if (deps && deps.navigator) {
    return deps.navigator;
  }
  if (typeof navigator !== 'undefined') {
    return navigator;
  }
  return null;
}

/**
 * 解析 document（deps 优先，其次全局；均无 → null）。
 * @param {Object} deps
 * @returns {Object|null}
 */
function resolveDocument(deps) {
  if (deps && deps.document) {
    return deps.document;
  }
  if (typeof document !== 'undefined') {
    return document;
  }
  return null;
}

/**
 * 主路径：异步 Clipboard API。
 * 不可用（无 navigator / 无 clipboard / 无 writeText）视为失败，交由降级处理。
 *
 * @param {string} text
 * @param {Object|null} nav
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
async function copyViaAsyncApi(text, nav) {
  if (!nav || !nav.clipboard || typeof nav.clipboard.writeText !== 'function') {
    return { ok: false, reason: 'Clipboard API unavailable' };
  }
  try {
    await nav.clipboard.writeText(text);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: describeError(err) };
  }
}

/**
 * 清理临时 textarea（优先 `remove()`，回退 `parentNode.removeChild`）。
 * @param {Object|null} textarea
 * @returns {void}
 */
function removeTextarea(textarea) {
  if (!textarea) {
    return;
  }
  if (typeof textarea.remove === 'function') {
    textarea.remove();
    return;
  }
  const parent = textarea.parentNode;
  if (parent && typeof parent.removeChild === 'function') {
    parent.removeChild(textarea);
  }
}

/**
 * 降级路径：`document.execCommand('copy')`。
 *
 * 流程：创建离屏 textarea → 写入文本 → 追加到 body → focus/select
 * （含 `setSelectionRange` 兜底）→ `execCommand('copy')` → finally 清理。
 *
 * @param {string} text
 * @param {Object|null} doc
 * @returns {{ok:boolean, reason?:string}}
 */
function copyViaExecCommand(text, doc) {
  if (!doc || typeof doc.execCommand !== 'function') {
    return { ok: false, reason: 'execCommand unavailable' };
  }

  let textarea = null;
  let host = null;

  try {
    // 构造临时输入元素（无 createElement 时不构造，仍尝试 execCommand）。
    if (typeof doc.createElement === 'function') {
      textarea = doc.createElement('textarea');
      textarea.value = text;
      if (typeof textarea.setAttribute === 'function') {
        textarea.setAttribute('readonly', '');
      }
      if (textarea.style) {
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0';
      }

      host = doc.body || doc.documentElement || null;
      if (host && typeof host.appendChild === 'function') {
        host.appendChild(textarea);
      }
      if (typeof textarea.focus === 'function') {
        textarea.focus();
      }
      if (typeof textarea.select === 'function') {
        textarea.select();
      }
      if (typeof textarea.setSelectionRange === 'function') {
        textarea.setSelectionRange(0, text.length);
      }
    }

    const ok = doc.execCommand('copy');
    return ok ? { ok: true } : { ok: false, reason: 'execCommand returned false' };
  } catch (err) {
    return { ok: false, reason: describeError(err) };
  } finally {
    // 无论成败都必须清理临时节点（避免焦点/内存残留）。
    removeTextarea(textarea);
  }
}

/**
 * 把文本写入系统剪贴板，双路径自动降级。
 *
 * @param {string} text 待复制文本（**逐字符原样**，不 trim / 不转义）
 * @param {{navigator?:Object, document?:Object}} [deps={}] 可注入依赖（Node 单测）
 * @returns {Promise<{ok:boolean, via:'async'|'execCommand'|'none', reason?:string}>}
 *          成功：`{ok:true, via}`；失败：`{ok:false, via:'none', reason}`。**永不抛异常**。
 */
export async function copyText(text, deps = {}) {
  const value = typeof text === 'string' ? text : text === null || text === undefined ? '' : String(text);
  const nav = resolveNavigator(deps);
  const doc = resolveDocument(deps);

  // 1) 首选异步 Clipboard API。
  const primary = await copyViaAsyncApi(value, nav);
  if (primary.ok) {
    return { ok: true, via: 'async' };
  }

  // 2) 降级 execCommand。
  const fallback = copyViaExecCommand(value, doc);
  if (fallback.ok) {
    return { ok: true, via: 'execCommand' };
  }

  // 3) 双失败：回传原因，不抛异常。
  return {
    ok: false,
    via: 'none',
    reason: fallback.reason || primary.reason || 'copy failed',
  };
}

/**
 * 归一化 Toast 类别（未知 → `info`）。
 * @param {string} kind
 * @returns {'info'|'success'|'error'}
 */
function normalizeKind(kind) {
  return TOAST_KINDS.indexOf(kind) !== -1 ? kind : 'info';
}

/**
 * 解析 Toast 元素（deps.el 优先 → deps.document 查询 `#toast` → 全局 document）。
 * @param {Object} deps
 * @returns {Object|null}
 */
function resolveToastEl(deps) {
  if (deps && deps.el) {
    return deps.el;
  }
  const doc = resolveDocument(deps);
  if (doc && typeof doc.querySelector === 'function') {
    return doc.querySelector('#toast');
  }
  return null;
}

/**
 * 把文案与类别写入 Toast 元素（纯 DOM、textContent；不加计时器）。
 * @param {Object|null} el
 * @param {string} message
 * @param {string} kind
 * @returns {boolean} 是否成功写入（无元素 → false）
 */
function applyToast(el, message, kind) {
  if (!el) {
    return false;
  }
  el.textContent = typeof message === 'string' ? message : '';
  if (el.classList && typeof el.classList.remove === 'function') {
    el.classList.remove('toast--info', 'toast--success', 'toast--error');
  }
  if (el.classList && typeof el.classList.add === 'function') {
    el.classList.add('toast--' + normalizeKind(kind));
  }
  if (typeof el.setAttribute === 'function') {
    el.setAttribute('data-visible', 'true');
  }
  return true;
}

/** 取计时器函数（deps > 全局 > null）。 */
function resolveTimers(deps) {
  const setTimer =
    deps && typeof deps.setTimeout === 'function'
      ? deps.setTimeout
      : typeof setTimeout !== 'undefined'
        ? setTimeout
        : null;
  const clearTimer =
    deps && typeof deps.clearTimeout === 'function'
      ? deps.clearTimeout
      : typeof clearTimeout !== 'undefined'
        ? clearTimeout
        : null;
  return { setTimer, clearTimer };
}

/**
 * 显示一条 Toast，并在 `durationMs` 后自动隐藏。
 *
 * @param {string} message 已本地化的文案
 * @param {'info'|'success'|'error'} [kind='info']
 * @param {{el?:Object, document?:Object, durationMs?:number,
 *          setTimeout?:Function, clearTimeout?:Function}} [deps={}]
 * @returns {boolean} 是否显示成功（找不到 Toast 元素 → false）
 */
export function showToast(message, kind = 'info', deps = {}) {
  const el = resolveToastEl(deps);
  if (!applyToast(el, message, kind)) {
    return false;
  }

  const { setTimer, clearTimer } = resolveTimers(deps);
  const duration =
    deps && typeof deps.durationMs === 'number' ? deps.durationMs : DEFAULT_TOAST_MS;

  // 清除上一次未到期的隐藏计时器。
  const existing = toastTimers.get(el);
  if (existing !== undefined && clearTimer) {
    clearTimer(existing);
    toastTimers.delete(el);
  }

  if (duration > 0 && setTimer) {
    const id = setTimer(function hideToast() {
      if (typeof el.setAttribute === 'function') {
        el.setAttribute('data-visible', 'false');
      }
      toastTimers.delete(el);
    }, duration);
    toastTimers.set(el, id);
  }

  return true;
}

/**
 * Toast 工厂：绑定元素与专属计时器，返回可复用的 toast 函数。
 *
 * @param {Object} el Toast 元素（通常为 `#toast`）
 * @param {{durationMs?:number, setTimeout?:Function, clearTimeout?:Function}} [options]
 * @returns {(message:string, kind?:'info'|'success'|'error')=>boolean}
 */
export function createToast(el, options = {}) {
  const { setTimer, clearTimer } = resolveTimers(options);
  const duration =
    typeof options.durationMs === 'number' ? options.durationMs : DEFAULT_TOAST_MS;
  let timer = null;

  return function toast(message, kind = 'info') {
    if (!applyToast(el, message, kind)) {
      return false;
    }
    if (timer !== null && clearTimer) {
      clearTimer(timer);
      timer = null;
    }
    if (duration > 0 && setTimer) {
      timer = setTimer(function hideToast() {
        if (el && typeof el.setAttribute === 'function') {
          el.setAttribute('data-visible', 'false');
        }
        timer = null;
      }, duration);
    }
    return true;
  };
}

export default { copyText, showToast, createToast, DEFAULT_TOAST_MS };
