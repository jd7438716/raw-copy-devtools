/**
 * panel.js — Raw Copy DevTools 面板入口（TASK-002 / DEL-002；TASK-004 接线列表）。
 *
 * 职责：
 *   1. 建立并导出稳定的 DOM 契约（`els`）与基础 UI 能力（`showToast` / `applyI18n`）；
 *   2. 在启动时把 `panel.html` 中所有 `data-i18n*` 文案经 `t()` 注入（AC-016 / REQ-033）；
 *   3. TASK-004：装配 store / capture / filter / render，实现列表渲染 + 搜索/过滤/虚拟滚动。
 *
 * 明确不做（留给后续 TASK，见 init() 末尾 TODO）：
 *   选中交互（TASK-005）：已实现，见下方「TASK-005」段落与 init() 内 wireSelection()。
 *   复制拼接（TASK-006）：已实现，见 formatter.js 与「TASK-006」段落（buildCurrentCopy）。
 *   剪贴板写入 + Toast（TASK-007）：已实现，见 clipboard.js 与「TASK-007」段落（runCurrentCopy）。
 *   大响应/二进制/Base64 分类（TASK-008）：已实现，见 content.js 与「TASK-008」段落（resolveResponseBodyText / runCurrentCopy 阈值确认）。
 *   右键菜单（TASK-007 增强）：已实现，见「TASK-007（增强）」段落（wireContextMenu / openContextMenu / P2 分段裁剪）。
 *
 * 约束：纯原生 ESM、零第三方依赖；不发起网络；不写任何持久化存储；
 *      渲染不可信数据时必须使用 textContent（禁止以 HTML 字符串方式注入）。
 *
 * @module panel
 */

import { t } from './src/i18n.js';
import { createStore } from './src/store.js';
import { installCapture } from './src/capture.js';
import { applyFilter, collectOptions } from './src/filter.js';
import { createVirtualList } from './src/render.js';
import { createMultiSelection } from './src/multiselection.js';
import {
  buildCopyText,
  MODE_A,
  MODE_B,
} from './src/formatter.js';
import { buildBulkCopyText } from './src/bulkformatter.js';
import { buildDetailText, createDetailView } from './src/detail.js';
import { copyText } from './src/clipboard.js';
import { classifyBody, isOverThreshold } from './src/content.js';
import {
  resolveRowId,
  createMenuModel,
  clampPosition,
  CTX_ACTION,
} from './src/contextmenu.js';

/** Toast 自动隐藏时长（ms）。 */
const TOAST_DURATION_MS = 2400;

/** 记录缓存容量（REQ-004 / AC-013）。 */
const STORE_CAPACITY = 1000;

/** 复制前等待异步 enrich 完成的超时（3s，REQ-006 / AC-007）。 */
const PENDING_TIMEOUT_MS = 3000;

/** 虚拟滚动可视区外上下各多渲染的行数（ADR-005）。 */
const LIST_OVERSCAN = 5;

/** 读不到 CSS `--row-height` 时的回退行高（与 styles/panel.css 保持一致）。 */
const FALLBACK_ROW_HEIGHT = 28;

/** 复制模式契约来自 formatter.js（TASK-006）：MODE_A='formatted' / MODE_B='raw'。 */

/** 面板内元素的稳定引用（id 为契约，不随任务演进改名）。 */
export const els = {
  toolbar: document.querySelector('#toolbar'),
  search: document.querySelector('#search'),
  filterMethod: document.querySelector('#filter-method'),
  filterStatus: document.querySelector('#filter-status'),
  filterType: document.querySelector('#filter-type'),

  list: document.querySelector('#list'),
  listBody: document.querySelector('#list-body'),
  empty: document.querySelector('#empty'),

  copyActions: document.querySelector('#copy-actions'),
  copyBtn: document.querySelector('#copy-btn'),
  copyBtnA: document.querySelector('#copy-btn-a'),
  copyBtnB: document.querySelector('#copy-btn-b'),
  copyCurlBtn: document.querySelector('#copy-curl-btn'),

  multiselectActions: document.querySelector('#multiselect-actions'),
  selectAllBtn: document.querySelector('#select-all-btn'),
  copySelectedBtn: document.querySelector('#copy-selected-btn'),
  selectedCount: document.querySelector('#selected-count'),

  contextMenu: document.querySelector('#context-menu'),

  detailPane: document.querySelector('#detail-pane'),
  detailBody: document.querySelector('#detail-body'),
  detailClose: document.querySelector('#detail-close'),
  detailBackdrop: document.querySelector('[data-detail-backdrop]'),

  toast: document.querySelector('#toast'),
  privacyLink: document.querySelector('#privacy-link'),
};

/**
 * 复制模式的显式白名单归一化：仅 `MODE_B` 原样通过，其余（undefined / 非法）一律
 * 回落 `MODE_A`（默认模式 A，REQ-007 / AC-008）。
 *
 * @param {'formatted'|'raw'|*} mode
 * @returns {'formatted'|'raw'}
 */
function normalizeMode(mode) {
  return mode === MODE_B ? MODE_B : MODE_A;
}

/** Toast 隐藏计时器句柄。 */
let toastTimer = null;

/* ------------------------------------------------------------------------- *
 * TASK-005 — 选中交互状态（DEL-005 / REQ-010 / REQ-011 / AC-004）
 * TASK-003（增强）— 选中来源由 createSelection 切换为 createMultiSelection
 *   （ADR-012 唯一契约切换点）：单选语义由冻结的 selection.js 内核保留，
 *   多选集合/Ctrl/Shift/全选由 multiselection.js 叠加。
 *
 * panel.js 只维护「当前主选 id」（供 TASK-006/007 的复制路径读取）与活动实例引用。
 * ------------------------------------------------------------------------- */

/** 当前主选 id（由多选 onChange 回调同步；无主选 → null）。 */
let selectedId = null;

/** 活动多选包装实例（供 renderRow 高亮判定；init 内装配）。 */
let activeSelection = null;

/** getSelected() 的实现注入点（init 内绑定 store；面板未启动时返回 null）。 */
let getSelectedImpl = function noSelection() {
  return null;
};

/** 活动 store 实例（init 内绑定；供 pending 判定，无 store → null）。 */
let activeStore = null;

/**
 * 读取当前选中项记录（TASK-006 formatter 的数据入口，本任务只维护状态）。
 *
 * @returns {Object|null} 选中记录（无选中 → null）
 */
export function getSelected() {
  return getSelectedImpl();
}

/* ------------------------------------------------------------------------- *
 * TASK-005（增强）— 批量复制出口（DEL-005 / REQ-008 / REQ-009 / AC-005/006/014）
 *
 * 与 `getSelectedImpl` 同构：真实实现需闭包访问 init() 内的 store 与多选实例，
 * 故在模块级留注入点，由 init() 装配后回填。面板未启动（测试/提前调用）
 * 时给出安全的空结果，绝不抛异常。
 * ------------------------------------------------------------------------- */

/** getSelectedIds() 的实现注入点（init 内绑定多选实例；未启动 → 空数组）。 */
let getSelectedIdsImpl = function noSelectionIds() {
  return [];
};

/** copySelection() 的实现注入点（init 内绑定批量复制流程；未启动 → 空结果）。 */
let copySelectionImpl = function noCopySelection() {
  return Promise.resolve({ ok: false, count: 0, reason: 'inactive' });
};

/**
 * 读取当前选中集合（按**可见列表顺序**，TASK-005 批量复制顺序契约）。
 *
 * @returns {Array<*>} 选中 id 数组（无选中 → 空数组）
 */
export function getSelectedIds() {
  return getSelectedIdsImpl();
}

/**
 * 批量复制当前选中集合（TASK-005 主入口）。
 *
 * 语义（ADR-015 / ADR-016）：
 *   - N === 0：提示 `copy.hintSelect`，返回 `{ok:false,count:0,reason}`；
 *   - pending：逐条 `awaitPending`，超时提示 `copy.fetchingTimeout` 并中止；
 *   - 大响应：批内任一条超阈值 → **一次** confirm 覆盖本批，取消则整批不复制；
 *   - 拼接：一律经 `buildBulkCopyText`（不在本文件重写拼接逻辑）。
 *
 * @param {'formatted'|'raw'} [mode] 复制模式；缺省/非法 → `MODE_A`
 * @returns {Promise<{ok:boolean, count:number, reason:string}>}
 */
export function copySelection(mode) {
  return copySelectionImpl(mode);
}

/* ------------------------------------------------------------------------- *
 * TASK-007（增强）— 右键菜单出口（DEL-001 / REQ-001 / ADR-013/020）
 *
 * `openContextMenu(event)` 为**追加式**新导出（ADR-020）：把一次右键事件交给
 * panel 内部同一套委托处理（命中行 → 单选替换 → 弹菜单）。真实实现闭包依赖
 * init() 内的多选实例 / 复制管线，故与 `getSelected`/`copySelection` 同构，
 * 在模块级留注入点；面板未启动（测试/提前调用）时安全 no-op，绝不抛异常。
 * ------------------------------------------------------------------------- */

/** openContextMenu(event) 的实现注入点（init 内回填；未启动 → 安全 no-op）。 */
let openContextMenuImpl = function noContextMenu() {
  return undefined;
};

/**
 * 以一次 `contextmenu` 事件打开面板内自绘菜单（命中行 → 单选替换 + 弹菜单）。
 *
 * @param {Object} event 具备 `target.closest` / `clientX` / `clientY` 的事件（可鸭子类型）
 * @returns {void}
 */
export function openContextMenu(event) {
  return openContextMenuImpl(event);
}

/* ------------------------------------------------------------------------- *
 * TASK-009 — 双击详情出口（DEL-004 / REQ-013..017 / AC-008..011 / ADR-017/018/020）
 *
 * `openDetail(id)` / `closeDetail()` 为**追加式**新导出（ADR-020），与
 * `getSelected`/`copySelection`/`openContextMenu` 同构：真实实现闭包依赖 init()
 * 内的 store 与详情状态机，故在模块级留注入点；面板未启动（测试/提前调用）时
 * 安全 no-op，绝不抛异常。
 * ------------------------------------------------------------------------- */

/** 详情内「复制请求 + 响应」按钮 id（JS 追加到抽屉头部；panel.html 既有 id 不改名）。 */
const DETAIL_COPY_BTN_ID = 'detail-copy-btn';

/** openDetail(id) 的实现注入点（init 内回填；未启动 → false）。 */
let openDetailImpl = function noDetail() {
  return false;
};

/** closeDetail() 的实现注入点（init 内回填；未启动 → false）。 */
let closeDetailImpl = function noDetailClose() {
  return false;
};

/**
 * 打开某条记录的详情抽屉（追加式导出，ADR-020）。
 *
 * @param {number|string} id recordId
 * @returns {boolean} 是否成功打开（面板未启动 / id 非法 / 记录不存在 → false）
 */
export function openDetail(id) {
  return openDetailImpl(id);
}

/**
 * 关闭详情抽屉（追加式导出，ADR-020；幂等）。
 *
 * @returns {boolean} 是否由「已打开」转为「关闭」
 */
export function closeDetail() {
  return closeDetailImpl();
}

/* ------------------------------------------------------------------------- *
 * TASK-006 — 复制拼接接线（DEL-006 / REQ-014..020 / AC-005/006/007/014/015）
 *
 * formatter.buildCopyText 为纯函数（只读单条 record）；本段只负责：
 *   1. 读取当前选中记录；
 *   2. 按当前模式生成复制文本；
 *   3. 暴露生成的文本（`buildCurrentCopy`）。
 * **本任务不写剪贴板** —— 写剪贴板 + 结果 Toast 由 TASK-007 负责（见 TODO）。
 * ------------------------------------------------------------------------- */

/** 最近一次生成的复制文本（供 TASK-007 写剪贴板使用；本任务不写剪贴板）。 */
let lastCopyText = null;

/**
 * 该记录是否正在异步 enrich（pending）。无 store / 非 pending → false。
 *
 * @param {Object|null} record
 * @returns {boolean}
 */
function isRecordPending(record) {
  return !!(
    activeStore &&
    typeof activeStore.isPending === 'function' &&
    record &&
    record.id !== undefined &&
    record.id !== null &&
    activeStore.isPending(record.id)
  );
}

/**
 * 解析选中记录的响应体注入文本（TASK-008 / DEL-008 / REQ-021..024 / AC-010；
 * TASK-004 增加 pending 分支）。
 *
 * 用 `classifyBody` 对 `record.responseContent` 分类：
 *   - pending（异步获取中）→ `t('content.fetching')`（不产出占位，REQ-007 / AC-003）；
 *   - `text` / `base64-text` → 直接用 `text`（文本类**逐字符原样**，保 ADR-006 / AC-007）；
 *   - `binary` / `base64-omitted` → 用 `placeholder` 省略标注；
 *   - `unavailable` → `t('content.unavailable')`（仅客观不可获取的合法场景）。
 *
 * 纯读取、无副作用；不做任何二次处理（不 trim/不转义）。
 *
 * @param {Object|null} record
 * @returns {string} 注入 formatter 的 `options.responseBody`
 */
function resolveResponseBodyText(record) {
  if (!record) {
    return '';
  }
  if (isRecordPending(record)) {
    return t('content.fetching');
  }
  const classified = classifyBody(record.responseContent);
  if (classified.kind === 'text' || classified.kind === 'base64-text') {
    return typeof classified.text === 'string' ? classified.text : '';
  }
  if (classified.kind === 'binary' || classified.kind === 'base64-omitted') {
    return typeof classified.placeholder === 'string' ? classified.placeholder : '';
  }
  return t('content.unavailable');
}

/**
 * 生成当前选中记录的复制文本（纯读取，无副作用）。
 *
 * TASK-008：按响应体分类结果注入 `options.responseBody`——文本类原样注入，
 * 二进制/Base64 降级为占位标注；formatter 的逐字符保真逻辑不变。
 *
 * @param {'formatted'|'raw'} [mode] 复制模式；缺省使用面板当前模式
 * @returns {string|null} 复制文本；无选中 → null
 */
export function buildCurrentCopy(mode) {
  const record = getSelected();
  if (!record) {
    return null;
  }
  const responseBody = resolveResponseBodyText(record);
  return buildCopyText(record, normalizeMode(mode), { responseBody });
}

/**
 * 读取最近一次生成的复制文本（测试/调试用；TASK-007 将消费它）。
 * @returns {string|null}
 */
export function getLastCopyText() {
  return lastCopyText;
}

/**
 * 把 root 内所有 i18n 占位属性替换为当前语言文案。
 *
 * 支持：
 *   - `data-i18n`              → textContent
 *   - `data-i18n-placeholder`  → placeholder 属性
 *   - `data-i18n-title`        → title 属性
 *   - `data-i18n-aria-label`   → aria-label 属性
 *
 * @param {ParentNode} [root] 默认 document
 * @returns {number} 被注入文本的节点数量
 */
export function applyI18n(root) {
  const scope = root || document;

  const textNodes = scope.querySelectorAll('[data-i18n]');
  for (let i = 0; i < textNodes.length; i += 1) {
    const node = textNodes[i];
    node.textContent = t(node.getAttribute('data-i18n'));
  }

  const placeholderNodes = scope.querySelectorAll('[data-i18n-placeholder]');
  for (let i = 0; i < placeholderNodes.length; i += 1) {
    const node = placeholderNodes[i];
    node.setAttribute('placeholder', t(node.getAttribute('data-i18n-placeholder')));
  }

  const titleNodes = scope.querySelectorAll('[data-i18n-title]');
  for (let i = 0; i < titleNodes.length; i += 1) {
    const node = titleNodes[i];
    node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
  }

  const ariaNodes = scope.querySelectorAll('[data-i18n-aria-label]');
  for (let i = 0; i < ariaNodes.length; i += 1) {
    const node = ariaNodes[i];
    node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
  }

  return textNodes.length;
}

/**
 * 显示一条 Toast。
 *
 * @param {string} message 已本地化的文案
 * @param {'info'|'success'|'error'} [kind='info']
 * @returns {void}
 */
export function showToast(message, kind) {
  const el = els.toast;
  if (!el) {
    return;
  }

  el.textContent = typeof message === 'string' ? message : '';
  el.classList.remove('toast--info', 'toast--success', 'toast--error');
  el.classList.add('toast--' + (kind || 'info'));
  el.setAttribute('data-visible', 'true');

  if (toastTimer !== null) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(function hideToast() {
    el.setAttribute('data-visible', 'false');
    toastTimer = null;
  }, TOAST_DURATION_MS);
}

/**
 * 兜底处理复制链路未预料到的异步异常（不吞错：提示用户并保留原因）。
 *
 * @param {*} err 异常对象
 * @returns {void}
 */
function reportAsyncCopyError(err) {
  const reason = err && err.message ? err.message : t('toast.copyFailedUnknown');
  showToast(t('toast.copyFailed', { reason: reason }), 'error');
}

/**
 * 切换空态提示的可见性。
 *
 * @param {boolean} visible 是否展示空态
 * @returns {void}
 */
export function setEmptyState(visible) {
  if (els.empty) {
    els.empty.hidden = !visible;
  }
}

/**
 * 读取当前复制模式（REQ-012 兼容导出）。
 *
 * ② 后不再存在模块级可变模式：模式由按钮动作显式携带实参（动作即模式），
 * 本导出恒定返回默认模式 `MODE_A`。`setCopyMode()` 已随 toggle 一并移除。
 *
 * @returns {'formatted'|'raw'} 恒为 `MODE_A`（`'formatted'`）
 */
export function getCopyMode() {
  return MODE_A;
}

/* ------------------------------------------------------------------------- *
 * TASK-004 — 列表渲染 + 搜索/过滤 + 虚拟滚动接线（DEL-004 / REQ-006..009/029）
 *
 * 纯逻辑在 src/filter.js（applyFilter / collectOptions）与 src/render.js
 * （createVirtualList，核心为 computeWindow）。本段只做 DOM 装配：
 *   store 变更 → collectOptions 派生下拉选项 → applyFilter → 倒序（最新在上）
 *   → virtualList.setData → 空态显隐。
 *
 * 未实现（留后续 TASK）：
 *   - 复制（TASK-006/007）：buildCopyText / clipboard。
 *   - 大响应内容分类（TASK-008）：content.classifyBody。
 *   - 选中交互（TASK-005）已接线，见 init() 内 selection / wireSelection()。
 * ------------------------------------------------------------------------- */

/** 读取 CSS 固定行高 `--row-height`，失败回退 28px。 */
function readRowHeight() {
  if (typeof document !== 'undefined' && typeof getComputedStyle === 'function') {
    try {
      const computed = getComputedStyle(document.documentElement);
      const px = parseFloat(computed.getPropertyValue('--row-height'));
      if (Number.isFinite(px) && px > 0) {
        return px;
      }
    } catch (err) {
      // 环境不支持计算样式 → 使用回退值
    }
  }
  return FALLBACK_ROW_HEIGHT;
}

/** 状态码 → 文本（缺失/0 → '-'）。 */
function formatStatus(status) {
  return typeof status === 'number' && Number.isFinite(status) && status > 0
    ? String(status)
    : '-';
}

/** 耗时（ms）→ 文本。 */
function formatTime(time) {
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
    return '-';
  }
  return Math.round(time) + ' ms';
}

/** 字节数 → 人类可读文本。 */
function formatSize(size) {
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0) {
    return '-';
  }
  if (size >= 1048576) {
    return (size / 1048576).toFixed(1) + ' MB';
  }
  if (size >= 1024) {
    return (size / 1024).toFixed(1) + ' KB';
  }
  return size + ' B';
}

/** ISO 时间 → HH:MM:SS（缺失 → '-'）。 */
function formatStarted(iso) {
  if (typeof iso !== 'string' || iso.length < 19) {
    return iso || '-';
  }
  return iso.slice(11, 19);
}

/** 惰性构建 7 列（与 panel.html 表头顺序、panel.css `--col-grid` 一致）。 */
function ensureRowColumns(el) {
  if (el.children && el.children.length === 7) {
    return;
  }
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
  const classes = [
    'col col--method',
    'col col--url',
    'col col--status',
    'col col--type',
    'col col--time',
    'col col--size',
    'col col--started',
  ];
  for (let i = 0; i < classes.length; i += 1) {
    const span = document.createElement('span');
    span.className = classes[i];
    span.setAttribute('role', 'gridcell');
    el.appendChild(span);
  }
}

/** 行填充回调：只用 textContent（不可信数据，禁止以 HTML 字符串注入）。 */
function renderRow(record, el) {
  const rec = record || {};
  ensureRowColumns(el);
  const cols = el.children;
  cols[0].textContent = rec.method ? String(rec.method) : '?';
  cols[1].textContent = typeof rec.url === 'string' ? rec.url : '';
  cols[2].textContent = formatStatus(rec.status);
  cols[3].textContent = typeof rec.resourceType === 'string' ? rec.resourceType : '';
  cols[4].textContent = formatTime(rec.time);
  const content = rec.responseContent;
  cols[5].textContent = formatSize(content ? content.size : NaN);
  cols[6].textContent = formatStarted(rec.startedDateTime);

  // TASK-005 单选高亮 + TASK-003 多选集合高亮。
  // 主判定为集合成员（has）；↑↓ move 会清空集合回落单选，故同时保留
  // current() 判定，保证「↑↓ 单选移动」的被选行仍可见（REQ-007 / AC-004）。
  let selected = false;
  if (activeSelection && rec.id !== undefined && rec.id !== null) {
    selected =
      typeof activeSelection.has === 'function' && activeSelection.has(rec.id)
        ? true
        : activeSelection.current() === rec.id;
  }
  if (el.classList) {
    if (selected) {
      el.classList.add('is-selected');
    } else {
      el.classList.remove('is-selected');
    }
  }
  if (typeof el.setAttribute === 'function') {
    el.setAttribute('aria-selected', selected ? 'true' : 'false');
  }
}

/**
 * 无选中时禁用全部复制按钮（复制动作本身由 TASK-006/007 实现）。
 *
 * @param {boolean} enabled
 * @returns {void}
 */
function setCopyButtonsEnabled(enabled) {
  const buttons = [els.copyBtn, els.copyBtnA, els.copyBtnB, els.copyCurlBtn];
  for (let i = 0; i < buttons.length; i += 1) {
    if (buttons[i]) {
      buttons[i].disabled = !enabled;
    }
  }
}

/** 创建一个 <option>。 */
function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

/** 重建 select 选项（首项为「全部」），并尽量保留原选中值。 */
function fillSelect(select, values) {
  const previous = select.value;
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  select.appendChild(createOption('', t('filter.all')));
  for (let i = 0; i < values.length; i += 1) {
    select.appendChild(createOption(values[i], values[i]));
  }
  // 选项集合变化后恢复原选择；原值已不存在时浏览器会回落为空串（= 不筛）。
  select.value = previous;
}

/** 选项集合指纹缓存：集合未变则不重建（避免每次追加请求都重排下拉框）。 */
const selectCache = new WeakMap();

/** 仅在派生选项变化时重建 select。 */
function syncSelect(select, values) {
  if (!select) {
    return;
  }
  const key = values.join('\u0000');
  if (selectCache.get(select) === key) {
    return;
  }
  fillSelect(select, values);
  selectCache.set(select, key);
}

/** 面板启动：注入 i18n + 接线列表渲染 / 搜索过滤 / 虚拟滚动 / 选中交互。 */
function init() {
  applyI18n(document);

  const store = createStore({ capacity: STORE_CAPACITY });
  activeStore = store;
  const rowHeight = readRowHeight();

  setCopyButtonsEnabled(false);

  /** TASK-006/007 读取入口：当前选中记录（无选中 → null）。 */
  getSelectedImpl = function resolveSelected() {
    if (selectedId === null) {
      return null;
    }
    return store.get(selectedId) || null;
  };

  /** 虚拟列表实例（selection 回调在装配完成后才可能触发，先以 null 兜底）。 */
  let virtualList = null;

  /**
   * 多选状态机（ADR-012）：包装冻结的单选核心，叠加集合 / Ctrl / Shift / 全选。
   * 可见列表 id 序列由 refreshView 注入（见下）；集合真源为 recordId。
   * onChange 只做 UI 同步（不改集合本身）。
   */
  const multi = createMultiSelection({
    ids: [],
    onChange: function onMultiSelectionChange(primaryId, index, ids) {
      selectedId = primaryId === undefined ? null : primaryId;
      // 复制按钮使能：有主选（单选回落）或集合非空（多选）皆可复制。
      setCopyButtonsEnabled(selectedId !== null || (Array.isArray(ids) && ids.length > 0));
      updateMultiToolbar();
      if (virtualList && typeof virtualList.refresh === 'function') {
        virtualList.refresh();
      }
    },
  });
  activeSelection = multi;

  /** TASK-009：详情视图状态机（init 内装配；供 store 淘汰联动引用）。 */
  let detailView = null;

  virtualList = createVirtualList({
    container: els.listBody,
    rowHeight,
    overscan: LIST_OVERSCAN,
    renderRow,
    onSelect: function onRowSelect(record, index) {
      // 保留虚拟列表的选中回调契约；行点击另经 #list-body 事件委托接线。
      multi.selectAt(index);
    },
  });

  let rafPending = false;

  /** 读取工具栏当前筛选条件。 */
  function readCriteria() {
    return {
      query: els.search ? els.search.value : '',
      method: els.filterMethod ? els.filterMethod.value : '',
      status: els.filterStatus ? els.filterStatus.value : '',
      resourceType: els.filterType ? els.filterType.value : '',
    };
  }

  /** 更新空态标题/提示文案（动态部分用 t() 注入）。 */
  function setEmptyMessage(titleKey, hintKey) {
    if (!els.empty) {
      return;
    }
    const title = els.empty.querySelector('.empty__title');
    if (title) {
      title.textContent = t(titleKey);
    }
    const hint = els.empty.querySelector('.empty__hint');
    if (hint) {
      hint.textContent = hintKey ? t(hintKey) : '';
      hint.hidden = !hintKey;
    }
  }

  /** 空态显隐：无任何请求 vs 有请求但无匹配。 */
  function updateEmptyState(total, shown) {
    if (total === 0) {
      setEmptyMessage('empty.title', 'empty.hint');
      setEmptyState(true);
    } else if (shown === 0) {
      setEmptyMessage('empty.noMatch', null);
      setEmptyState(true);
    } else {
      setEmptyState(false);
    }
  }

  /** 全量重绘：派生选项 → 过滤 → 倒序（最新在上）→ 虚拟列表 + 空态。 */
  function refreshView() {
    const all = store.all();
    const options = collectOptions(all);
    syncSelect(els.filterMethod, options.methods);
    syncSelect(els.filterStatus, options.statuses);
    syncSelect(els.filterType, options.resourceTypes);

    const filtered = applyFilter(all, readCriteria());
    // store.all() 为「最旧→最新」，倒序后即最新在上（新请求追加可见）。
    const display = filtered.slice().reverse();
    virtualList.setData(display);
    // 选中状态跟随【当前可见（已过滤）列表】：序号与虚拟列表 data-index 一致，
    // ↑↓ move 即在此可见列表内切换（REQ-011 / AC-004）。
    multi.setIds(
      display.map(function toId(record) {
        return record && record.id;
      }),
    );
    // 工具栏计数/使能在剪枝后即时收敛（集合未变时 onChange 不触发，故显式同步一次）。
    updateMultiToolbar();
    updateEmptyState(all.length, filtered.length);
  }

  /** rAF 批处理刷新（高频捕获时合并到一帧，护 REQ-029）。 */
  function requestRefresh() {
    if (rafPending) {
      return;
    }
    rafPending = true;
    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : function (cb) {
            return setTimeout(cb, 0);
          };
    schedule(function onFrame() {
      rafPending = false;
      refreshView();
    });
  }

  /** 选中项滚动到可视区（键盘移动后调用，保证切换可见）。 */
  function scrollSelectionIntoView() {
    if (!virtualList || typeof virtualList.scrollToId !== 'function') {
      return;
    }
    const id = multi.current();
    if (id !== null) {
      virtualList.scrollToId(id);
    }
  }

  /**
   * 行点击 → 按修饰键分派（ADR-014）：
   *   - Shift+Ctrl/Cmd → extendTo（以 anchor 为基的可见闭区间，与既有集合**并集**）；
   *   - Shift → rangeTo（以 anchor 为基的可见闭区间，替换集合）；
   *   - Ctrl/Cmd → toggleAt（切换该行在集合中的存在）；
   *   - 无修饰 → selectAt（替换集合为单行，回落单选）；
   * 随后让 #list 获得焦点（便于接着 ↑↓）。
   */
  function onListBodyClick(event) {
    const target = event ? event.target : null;
    if (!target || typeof target.closest !== 'function' || !els.listBody) {
      return;
    }
    const row = target.closest('.row');
    if (!row) {
      return;
    }
    if (typeof els.listBody.contains === 'function' && !els.listBody.contains(row)) {
      return;
    }
    const index = Number(row.getAttribute('data-index'));
    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    if (event && event.shiftKey && (event.ctrlKey || event.metaKey)) {
      multi.extendTo(index);
    } else if (event && event.shiftKey) {
      multi.rangeTo(index);
    } else if (event && (event.ctrlKey || event.metaKey)) {
      multi.toggleAt(index);
    } else {
      multi.selectAt(index);
    }

    if (els.list && typeof els.list.focus === 'function') {
      els.list.focus();
    }
  }

  /** ↑/↓ → 清空集合并回落单选移动；preventDefault 防页面滚动（REQ-007 / AC-004）。 */
  function onListKeyDown(event) {
    if (!event) {
      return;
    }
    const key = event.key;
    if (key !== 'ArrowDown' && key !== 'ArrowUp') {
      return;
    }
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    multi.move(key === 'ArrowDown' ? 1 : -1);
    scrollSelectionIntoView();
  }

  /** 装配选中交互：行点击事件委托 + #list 键盘事件（#list 已设 tabindex=0）。 */
  function wireSelection() {
    if (els.listBody) {
      els.listBody.addEventListener('click', onListBodyClick);
    }
    if (els.list) {
      els.list.addEventListener('keydown', onListKeyDown);
    }
  }

  /* ----------------------------------------------------------------------- *
   * TASK-003（增强）— 多选工具栏接线（DEL-005 / REQ-008 / AC-005）
   *
   * 只做「选择」侧：全选按钮 + 计数 N + 「复制选中」使能（N=0 禁用）。
   * 批量复制的动作本体（copySelection / buildBulkCopyText）属 TASK-005，
   * 由 TASK-005 给 #copy-selected-btn 追加点击处理。
   * ----------------------------------------------------------------------- */

  /** 同步多选工具栏：计数文案 + 「复制选中」按钮使能（N=0 禁用）。 */
  function updateMultiToolbar() {
    const count = multi.count();
    if (els.selectedCount) {
      els.selectedCount.textContent = t('multi.selectedCount', { count: count });
    }
    if (els.copySelectedBtn) {
      els.copySelectedBtn.textContent = t('multi.copySelected', { count: count });
      els.copySelectedBtn.disabled = count <= 0;
    }
  }

  /**
   * 装配多选工具栏：展示容器（ADR-014 入口常驻）、全选按钮、计数与使能。
   *
   * @returns {void}
   */
  function wireMultiToolbar() {
    if (els.multiselectActions) {
      els.multiselectActions.hidden = false;
    }
    if (els.selectAllBtn) {
      els.selectAllBtn.addEventListener('click', function onSelectAllClick() {
        multi.selectAll();
        if (els.list && typeof els.list.focus === 'function') {
          els.list.focus();
        }
      });
    }
    // TASK-005：批量复制入口接线（TASK-003 已建按钮但未挂监听，此处只挂一次）。
    // ② 后批量入口固定按默认模式 A 复制（P-DEC-1，B 批量不在本轮范围）。
    if (els.copySelectedBtn) {
      els.copySelectedBtn.addEventListener('click', function onCopySelectedClick() {
        const pendingCopy = copySelection(MODE_A);
        if (pendingCopy && typeof pendingCopy.catch === 'function') {
          pendingCopy.catch(reportAsyncCopyError);
        }
      });
    }
    updateMultiToolbar();
  }

  if (els.search) {
    els.search.addEventListener('input', requestRefresh);
  }
  if (els.filterMethod) {
    els.filterMethod.addEventListener('change', requestRefresh);
  }
  if (els.filterStatus) {
    els.filterStatus.addEventListener('change', requestRefresh);
  }
  if (els.filterType) {
    els.filterType.addEventListener('change', requestRefresh);
  }

  // 捕获：新记录入 store 后驱动列表刷新；异步 enrich 回填后再刷新一次（REQ-005 / AC-008）。
  installCapture({ store, onAdd: requestRefresh, onUpdate: requestRefresh });

  // 环形缓冲淘汰选中项 → 清空选中（REQ-004 / AC-013）；store.clear 同步复位。
  // update → 刷新（异步回填后正文从「获取中」变为真实正文）；evict → 清选中（字节预算兜底）。
  // TASK-009（ADR-018）：详情打开项被淘汰（add.evicted / evict）→ 自动关闭 + 提示。
  function handleDetailEvict(id) {
    if (detailView && typeof detailView.onEvict === 'function' && detailView.onEvict(id)) {
      showToast(t('detail.evicted'), 'info');
    }
  }

  store.subscribe(function onStoreEvent(event) {
    if (!event) {
      return;
    }
    if (event.type === 'add' || event.type === 'update' || event.type === 'evict') {
      requestRefresh();
    }
    if (event.type === 'add' && event.evicted !== null && event.evicted !== undefined) {
      multi.onEvict(event.evicted);
      handleDetailEvict(event.evicted);
    } else if (event.type === 'evict') {
      multi.onEvict(event.id);
      handleDetailEvict(event.id);
    } else if (event.type === 'clear') {
      multi.clear();
      closeDetailPane();
    }
  });

  // TASK-005：行点击 / ↑↓ 键盘选中接线。
  wireSelection();

  // TASK-003（增强）：多选工具栏（全选 / 计数 / 复制选中使能）接线。
  wireMultiToolbar();

  /* TASK-007（增强）— ② 复制模式 A/B 独立按钮（动作即模式，REQ-006 / AC-007/008）
   *
   * 每个按钮自带 `data-copy-mode`（A/B）；点击即按该模式复制当前记录，不再有
   * 模块级可变模式与 toggle 状态。模式经白名单归一化（`B`/`raw` → B，其余 → A）。
   */
  function setModeButtonTitle(btn, hintKey) {
    if (btn && typeof btn.setAttribute === 'function') {
      btn.setAttribute('title', t(hintKey));
    }
  }

  function modeFromButton(btn) {
    const raw =
      btn && typeof btn.getAttribute === 'function'
        ? btn.getAttribute('data-copy-mode')
        : null;
    return raw === 'B' || raw === MODE_B ? MODE_B : MODE_A;
  }

  if (els.copyBtnA) {
    setModeButtonTitle(els.copyBtnA, 'mode.aHint');
    els.copyBtnA.addEventListener('click', function onCopyModeAClick() {
      const pendingCopy = runCurrentCopy(modeFromButton(els.copyBtnA));
      if (pendingCopy && typeof pendingCopy.catch === 'function') {
        pendingCopy.catch(reportAsyncCopyError);
      }
    });
  }
  if (els.copyBtnB) {
    setModeButtonTitle(els.copyBtnB, 'mode.bHint');
    els.copyBtnB.addEventListener('click', function onCopyModeBClick() {
      const pendingCopy = runCurrentCopy(modeFromButton(els.copyBtnB));
      if (pendingCopy && typeof pendingCopy.catch === 'function') {
        pendingCopy.catch(reportAsyncCopyError);
      }
    });
  }

  /* TASK-007 — 剪贴板写入 + 降级 + Toast（DEL-007 / REQ-025 / REQ-034 / AC-011 / AC-022）
   *
   * 主路径：buildCurrentCopy() 生成文本 → clipboard.copyText() 双路径写入
   * （writeText 优先，execCommand 降级）→ 成功/失败 Toast。内容不经任何网络传输。
   *
   * TASK-008：复制前先做响应体分类注入（buildCurrentCopy）与超阈值确认（REQ-022 / AC-010）。
   */

  /**
   * 大响应二次确认（TASK-008 / REQ-022 / AC-010）。
   *
   * 无 `confirm` 能力的环境（异常/测试）不阻断复制，返回 true。
   *
   * @param {string} size 人类可读大小（如 `10.0 MB`）
   * @returns {boolean} 用户是否确认继续
   */
  function confirmLargeCopy(size) {
    if (typeof confirm !== 'function') {
      return true;
    }
    try {
      return confirm(t('large.confirm', { size: size })) === true;
    } catch (err) {
      return true;
    }
  }

  /**
   * 复制当前选中记录（单选主路径）。
   *
   * 菜单主项「复制请求 + 响应（原始）」与 `#copy-btn` **共用本函数**，
   * 保证二者产物逐字符一致（AC-002）。
   *
   * @param {'formatted'|'raw'} [mode] 复制模式；缺省/非法 → `MODE_A`
   * @returns {Promise<void>}
   */
  async function runCurrentCopy(mode) {
    const effectiveMode = normalizeMode(mode);
    let record = getSelected();
    if (!record) {
      showToast(t('copy.hintSelect'), 'error');
      return;
    }

    // 复制竞态（REQ-006 / AC-007）：异步 enrich 未完成时先等待真实正文；
    // 超时 → 明确提示，不输出占位、不静默输出空正文。
    if (isRecordPending(record)) {
      try {
        await activeStore.awaitPending(record.id, PENDING_TIMEOUT_MS);
      } catch (err) {
        showToast(t('copy.fetchingTimeout'), 'error');
        return;
      }
      // 回填可能伴随淘汰；重新读取选中记录。
      record = getSelected();
      if (!record) {
        showToast(t('copy.hintSelect'), 'error');
        return;
      }
    }

    // 大响应：复制前确认（REQ-022 / AC-010）。用户取消 → 不复制并提示。
    if (isOverThreshold(record.responseContent)) {
      const content = record.responseContent || {};
      const rawSize =
        typeof content.size === 'number' && Number.isFinite(content.size)
          ? content.size
          : typeof content.text === 'string'
            ? content.text.length
            : 0;
      if (!confirmLargeCopy(formatSize(rawSize))) {
        showToast(t('copy.cancelled'), 'info');
        return;
      }
    }

    const text = buildCurrentCopy(effectiveMode);
    if (text === null) {
      showToast(t('copy.hintSelect'), 'error');
      return;
    }
    lastCopyText = text;

    let result;
    try {
      result = await copyText(text);
    } catch (err) {
      // copyText 契约保证不抛；此处仅作最后的防御，避免未处理 Promise 拒绝。
      result = { ok: false, via: 'none', reason: err && err.message ? err.message : String(err) };
    }

    if (result && result.ok) {
      showToast(t('toast.copied'), 'success');
      return;
    }
    const reason = result && result.reason ? result.reason : t('toast.copyFailedUnknown');
    showToast(t('toast.copyFailed', { reason: reason }), 'error');
  }

  if (els.copyBtn) {
    els.copyBtn.addEventListener('click', function onCopyMainClick() {
      const pendingCopy = runCurrentCopy(MODE_A);
      if (pendingCopy && typeof pendingCopy.catch === 'function') {
        pendingCopy.catch(reportAsyncCopyError);
      }
    });
  }

  // P2（REQ-013 / DEC-004）尚未启用：点击给出明确提示，不阻断主路径。
  function onDeferredCopyClick() {
    showToast(t('copy.notEnabled'), 'info');
  }
  if (els.copyCurlBtn) {
    els.copyCurlBtn.addEventListener('click', onDeferredCopyClick);
  }

  /* ----------------------------------------------------------------------- *
   * TASK-005（增强）— 批量复制主流程（DEL-005 / REQ-008 / REQ-009 / AC-005/006/014）
   *
   * 取 multi.selectedIds()（可见顺序）→ 逐条记录 → pending 等待 → 大响应一次确认
   * → buildBulkCopyText（逐条复用冻结 formatter）→ clipboard.copyText → Toast。
   * 本段**不重写**任何拼接逻辑；段内保真完全依赖 bulkformatter/formatter。
   * ----------------------------------------------------------------------- */

  /**
   * 批量大响应确认：ADR-016「一次确认覆盖本批」。
   *
   * 无 `confirm` 能力的环境（异常/测试）不阻断复制，返回 true。
   *
   * @param {number} count 超阈值的条数
   * @param {string} size 批内最大体积的人类可读文本
   * @returns {boolean} 用户是否确认继续
   */
  function confirmLargeSelection(count, size) {
    if (typeof confirm !== 'function') {
      return true;
    }
    try {
      return confirm(t('multi.largeConfirm', { count: count, size: size })) === true;
    } catch (err) {
      return true;
    }
  }

  /** 取记录的响应体字节数（缺失时按文本长度估算，与单选阈值确认同口径）。 */
  function contentByteSize(record) {
    const content = record && record.responseContent ? record.responseContent : {};
    if (typeof content.size === 'number' && Number.isFinite(content.size)) {
      return content.size;
    }
    return typeof content.text === 'string' ? content.text.length : 0;
  }

  /**
   * 批量复制主流程（供 #copy-selected-btn 与导出 copySelection 复用）。
   *
   * @param {'formatted'|'raw'} [mode]
   * @returns {Promise<{ok:boolean, count:number, reason:string}>}
   */
  async function runCopySelection(mode) {
    const effectiveMode = normalizeMode(mode);
    const ids = multi.selectedIds();
    if (ids.length === 0) {
      showToast(t('copy.hintSelect'), 'error');
      return { ok: false, count: 0, reason: 'empty' };
    }

    // 按可见顺序取记录（await 前后各取一次；淘汰可能使实际条数少于 ids）。
    function collectRecords() {
      const out = [];
      for (let i = 0; i < ids.length; i += 1) {
        const record = store.get(ids[i]);
        if (record) {
          out.push(record);
        }
      }
      return out;
    }

    let records = collectRecords();
    if (records.length === 0) {
      showToast(t('copy.hintSelect'), 'error');
      return { ok: false, count: 0, reason: 'empty' };
    }

    // pending：逐条等待异步 enrich（与单选一致）；超时 → 提示并中止，绝不输出占位。
    const pending = records.filter(isRecordPending);
    if (pending.length > 0) {
      try {
        for (let i = 0; i < pending.length; i += 1) {
          await activeStore.awaitPending(pending[i].id, PENDING_TIMEOUT_MS);
        }
      } catch (err) {
        showToast(t('copy.fetchingTimeout'), 'error');
        return { ok: false, count: records.length, reason: 'timeout' };
      }
      records = collectRecords();
      if (records.length === 0) {
        showToast(t('copy.hintSelect'), 'error');
        return { ok: false, count: 0, reason: 'empty' };
      }
    }

    // 大响应：批内任一条超阈值 → 仅一次 confirm 覆盖本批；取消 → 整批不复制。
    let overCount = 0;
    let maxSize = 0;
    for (let i = 0; i < records.length; i += 1) {
      if (isOverThreshold(records[i].responseContent)) {
        overCount += 1;
        const size = contentByteSize(records[i]);
        if (size > maxSize) {
          maxSize = size;
        }
      }
    }
    if (overCount > 0 && !confirmLargeSelection(overCount, formatSize(maxSize))) {
      showToast(t('copy.cancelled'), 'info');
      return { ok: false, count: records.length, reason: 'cancelled' };
    }

    // 批量拼接唯一出口：bulkformatter 逐条复用冻结 formatter（N=1 委托单选逐字符一致）。
    const text = buildBulkCopyText(records, effectiveMode, function resolveBody(record) {
      return resolveResponseBodyText(record);
    });
    lastCopyText = text;

    let result;
    try {
      result = await copyText(text);
    } catch (err) {
      // copyText 契约保证不抛；此处仅作防御，避免未处理 Promise 拒绝。
      result = { ok: false, via: 'none', reason: err && err.message ? err.message : String(err) };
    }

    if (result && result.ok) {
      showToast(t('toast.copied'), 'success');
      return { ok: true, count: records.length, reason: 'copied' };
    }
    const reason = result && result.reason ? result.reason : t('toast.copyFailedUnknown');
    showToast(t('toast.copyFailed', { reason: reason }), 'error');
    return { ok: false, count: records.length, reason: reason };
  }

  // 回填模块级注入点：导出 getSelectedIds/copySelection 指向本闭包内的真实实现。
  getSelectedIdsImpl = function resolveSelectedIds() {
    return multi.selectedIds();
  };
  copySelectionImpl = runCopySelection;

  /* ----------------------------------------------------------------------- *
   * TASK-007（增强）— 面板内自绘右键菜单
   * （DEL-001 / REQ-001..005 / AC-001/002/003 / ADR-013/014/020）
   *
   * 纯 DOM 自绘（零权限，绝不使用原生浏览器菜单 API）：`#list-body` 的
   * `contextmenu` 委托 → resolveRowId 命中行 → 右键即单选替换（ADR-014）→
   * createMenuModel 渲染菜单项（全部 textContent）→ clampPosition 视口夹取。
   * 全部复制动作复用既有管线（runCurrentCopy / copySelection），
   * 保证与底部按钮同源（AC-002 / AC-003）。
   * ----------------------------------------------------------------------- */

  /** 当前菜单项按钮（顺序 = 模型顺序；供键盘高亮遍历）。 */
  let menuButtons = [];
  /** 当前高亮项下标（-1 = 无）。 */
  let menuActiveIndex = -1;
  /** 文档级关闭监听是否已挂载（防重复挂载 / 泄漏）。 */
  let menuListenersAttached = false;

  /** 读取视口宽高（无 window 环境 → 0，clampPosition 会安全处理）。 */
  function viewportSize() {
    const w =
      typeof window !== 'undefined' && Number(window.innerWidth) > 0
        ? Number(window.innerWidth)
        : 0;
    const h =
      typeof window !== 'undefined' && Number(window.innerHeight) > 0
        ? Number(window.innerHeight)
        : 0;
    return { w, h };
  }

  /** 清空菜单子节点（textContent 路径；关闭后无残留）。 */
  function clearMenuChildren(menu) {
    while (menu.firstChild) {
      menu.removeChild(menu.firstChild);
    }
  }

  /** 关闭菜单：隐藏 + 清空 + 解绑文档级监听 + 复位高亮。 */
  function closeContextMenu() {
    const menu = els.contextMenu;
    if (menu) {
      menu.hidden = true;
      clearMenuChildren(menu);
    }
    menuButtons = [];
    menuActiveIndex = -1;
    detachMenuListeners();
  }

  /** 挂载文档级关闭监听（点击他处 / Esc / 滚动 / 失焦）。 */
  function attachMenuListeners() {
    if (menuListenersAttached) {
      return;
    }
    menuListenersAttached = true;
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('mousedown', onMenuDocumentMouseDown);
      document.addEventListener('keydown', onMenuKeyDown);
    }
    if (els.list && typeof els.list.addEventListener === 'function') {
      els.list.addEventListener('scroll', onMenuScroll);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('blur', onMenuWindowBlur);
    }
  }

  /** 解绑文档级关闭监听（幂等）。 */
  function detachMenuListeners() {
    if (!menuListenersAttached) {
      return;
    }
    menuListenersAttached = false;
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('mousedown', onMenuDocumentMouseDown);
      document.removeEventListener('keydown', onMenuKeyDown);
    }
    if (els.list && typeof els.list.removeEventListener === 'function') {
      els.list.removeEventListener('scroll', onMenuScroll);
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('blur', onMenuWindowBlur);
    }
  }

  /** 点击菜单外区域 → 关闭（菜单内交互不关闭）。 */
  function onMenuDocumentMouseDown(event) {
    const menu = els.contextMenu;
    const target = event ? event.target : null;
    if (menu && target && typeof target.closest === 'function' && target.closest('#context-menu')) {
      return;
    }
    closeContextMenu();
  }

  /** #list 滚动 → 关闭（菜单不再跟随行）。 */
  function onMenuScroll() {
    closeContextMenu();
  }

  /** 窗口失焦 → 关闭。 */
  function onMenuWindowBlur() {
    closeContextMenu();
  }

  /** 当前高亮按钮（无 → null）。 */
  function activeMenuButton() {
    if (menuActiveIndex < 0 || menuActiveIndex >= menuButtons.length) {
      return null;
    }
    return menuButtons[menuActiveIndex];
  }

  /** 键盘移动高亮：跳过禁用项，两端环绕。 */
  function moveMenuHighlight(delta) {
    if (menuButtons.length === 0) {
      return;
    }
    const step = delta >= 0 ? 1 : -1;
    let index = menuActiveIndex;
    for (let guard = 0; guard < menuButtons.length; guard += 1) {
      index = (index + step + menuButtons.length) % menuButtons.length;
      if (index === menuActiveIndex) {
        break;
      }
      const btn = menuButtons[index];
      if (btn && !btn.disabled) {
        menuActiveIndex = index;
        if (typeof btn.focus === 'function') {
          btn.focus();
        }
        return;
      }
    }
  }

  /** 首个可用项高亮（并聚焦，使键盘可用）。 */
  function highlightFirstEnabled() {
    for (let i = 0; i < menuButtons.length; i += 1) {
      if (menuButtons[i] && !menuButtons[i].disabled) {
        menuActiveIndex = i;
        if (typeof menuButtons[i].focus === 'function') {
          menuButtons[i].focus();
        }
        return;
      }
    }
    menuActiveIndex = -1;
  }

  /** 菜单键盘：↑↓ 高亮 / Enter 激活 / Esc 关闭。 */
  function onMenuKeyDown(event) {
    if (!event) {
      return;
    }
    const key = event.key;
    if (key === 'Escape') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      closeContextMenu();
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      moveMenuHighlight(key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (key === 'Enter') {
      const btn = activeMenuButton();
      if (btn && !btn.disabled) {
        if (typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        dispatchContextAction(btn);
      }
    }
  }

  /** 写入文本到剪贴板并 Toast（详情内复制用；与主路径同 copyText）。 */
  async function writeCopyText(text) {
    lastCopyText = text;
    let result;
    try {
      result = await copyText(text);
    } catch (err) {
      result = { ok: false, via: 'none', reason: err && err.message ? err.message : String(err) };
    }
    if (result && result.ok) {
      showToast(t('toast.copied'), 'success');
      return true;
    }
    const reason = result && result.reason ? result.reason : t('toast.copyFailedUnknown');
    showToast(t('toast.copyFailed', { reason: reason }), 'error');
    return false;
  }

  /** 分派菜单项动作（鼠标点击与键盘 Enter 共用）。 */
  function dispatchContextAction(btn) {
    const action =
      btn && typeof btn.getAttribute === 'function' ? btn.getAttribute('data-action') : null;
    // 先关闭菜单（清点击面），动作引用已捕获，不受 DOM 移除影响。
    closeContextMenu();

    let pendingCopy = null;
    if (action === CTX_ACTION.COPY_REQUEST_RESPONSE) {
      // 菜单主项固定模式 A（与 #copy-btn 同源，AC-002/003）。
      pendingCopy = runCurrentCopy(MODE_A);
    } else if (action === CTX_ACTION.COPY_SELECTED) {
      // 菜单批量项固定模式 A（P-DEC-1，与工具栏批量入口同源）。
      pendingCopy = copySelection(MODE_A);
    }
    if (pendingCopy && typeof pendingCopy.catch === 'function') {
      pendingCopy.catch(reportAsyncCopyError);
    }
  }

  /** 菜单项点击：隔离冒泡（不触发行 click 委托）后分派动作。 */
  function onMenuItemClick(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
    }
    const btn = event && event.currentTarget ? event.currentTarget : null;
    if (btn) {
      dispatchContextAction(btn);
    }
  }

  /** 渲染菜单项（统一 textContent；禁用项不可点击）。 */
  function renderMenuItems(menu, items) {
    clearMenuChildren(menu);
    menuButtons = [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'context-menu__item';
      btn.id = item.id;
      btn.disabled = !item.enabled;
      if (typeof btn.setAttribute === 'function') {
        btn.setAttribute('role', 'menuitem');
        btn.setAttribute('data-action', item.action);
      }
      btn.textContent = t(item.i18nKey, item.vars || undefined);
      btn.addEventListener('click', onMenuItemClick);
      menu.appendChild(btn);
      menuButtons.push(btn);
    }
  }

  /** 在指针处打开菜单（命中行后调用）。 */
  function openMenuAt(event) {
    const menu = els.contextMenu;
    if (!menu) {
      return;
    }
    const items = createMenuModel({
      hasSelection: getSelected() !== null,
      count: multi.count(),
    });
    renderMenuItems(menu, items);
    menu.hidden = false;
    const rect = viewportSize();
    const pos = clampPosition({
      x: event ? event.clientX : 0,
      y: event ? event.clientY : 0,
      w: Number(menu.offsetWidth) || 0,
      h: Number(menu.offsetHeight) || 0,
      vw: rect.w,
      vh: rect.h,
    });
    menu.style.left = pos.left + 'px';
    menu.style.top = pos.top + 'px';
    highlightFirstEnabled();
    attachMenuListeners();
  }

  /**
   * 右键委托处理：命中行 → 「已选保留 / 未选替换」+ 弹菜单；未命中（表头/空白）→
   * `E_CTX_NO_TARGET` 语义（不弹、不改集合、不抛异常）。
   *
   * @param {Object} event contextmenu 事件（鸭子类型）
   * @returns {void}
   */
  function onContextMenu(event) {
    if (!event) {
      return;
    }
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    const rowId = resolveRowId(event, els.listBody);
    if (rowId === null) {
      return;
    }
    const target = event.target;
    const row = target && typeof target.closest === 'function' ? target.closest('.row') : null;
    let index = row ? Number(row.getAttribute('data-index')) : NaN;
    if (!Number.isInteger(index) || index < 0) {
      index = multi.ids().indexOf(rowId);
    }
    if (Number.isInteger(index) && index >= 0) {
      // 入口语义统一（ADR-014 重裁 / REQ-002）：
      //   命中行已在集合内 → 保留集合（不坍缩，count≥2 自然成立，批量项可达）；
      //   命中行在集合外 → selectAt 单选替换（保留「右键定位该行」心智）。
      if (!multi.has(rowId)) {
        multi.selectAt(index);
      }
    }
    openMenuAt(event);
  }

  /** 装配右键菜单：list-body 委托 + 菜单容器内的冒泡/默认行为隔离。 */
  function wireContextMenu() {
    if (els.listBody) {
      els.listBody.addEventListener('contextmenu', onContextMenu);
    }
    const menu = els.contextMenu;
    if (menu && typeof menu.addEventListener === 'function') {
      menu.addEventListener('mousedown', function onMenuMouseDown(event) {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
      });
      menu.addEventListener('click', function onMenuContainerClick(event) {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
      });
      menu.addEventListener('contextmenu', function onMenuContainerContextMenu(event) {
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
      });
    }
  }

  // 注入导出实现 + 接线右键委托。
  openContextMenuImpl = onContextMenu;
  wireContextMenu();

  /* ----------------------------------------------------------------------- *
   * TASK-009 — 双击详情接线（DEL-004 / REQ-013..017 / AC-008..011 / ADR-017/018/020）
   *
   * #list-body 的 dblclick 委托 → resolveRowId（复用 contextmenu 命中逻辑）→
   * 打开覆盖式抽屉 #detail-pane；#detail-body 以 textContent 注入
   * buildDetailText（模式 A 口径，恒等于复制产物；不随 A/B 切换，A-4）。
   * 关闭方式：关闭按钮 / Esc / 点击遮罩。详情记录被淘汰 → 自动关闭 + 提示（ADR-018）。
   * P2：抽屉头部 JS 追加「复制请求 + 响应」按钮，复用主复制管线（AC-011）。
   * ----------------------------------------------------------------------- */

  /**
   * 详情文本解析：仅按 recordId 从 store 取记录并走 buildDetailText（模式 A 口径）。
   * 记录已淘汰 → 空串（不抛异常，ADR-018）。
   *
   * @param {number|string} id
   * @returns {string}
   */
  function resolveDetailText(id) {
    const record = store.get(id);
    return record ? buildDetailText(record, resolveResponseBodyText) : '';
  }

  /**
   * 详情关闭回调：焦点还给列表（列表始终挂载，滚动位置天然保持，ADR-017）。
   *
   * @returns {void}
   */
  function onDetailClose() {
    if (els.list && typeof els.list.focus === 'function') {
      els.list.focus();
    }
  }

  detailView = createDetailView({
    container: els.detailPane,
    body: els.detailBody,
    resolveText: resolveDetailText,
    onClose: onDetailClose,
  });

  /**
   * 关闭详情（幂等）。
   *
   * @returns {boolean}
   */
  function closeDetailPane() {
    return detailView ? detailView.close() : false;
  }

  /**
   * 打开某条记录的详情（含焦点移交，避免打开期间 ↑↓ 改动底层选中）。
   *
   * @param {number|string} id
   * @returns {boolean}
   */
  function openDetailRecord(id) {
    if (id === undefined || id === null || !detailView) {
      return false;
    }
    if (!store.get(id)) {
      return false;
    }
    const opened = detailView.open(id);
    if (opened && els.detailClose && typeof els.detailClose.focus === 'function') {
      els.detailClose.focus();
    }
    return opened;
  }

  /**
   * 双击委托：命中行 → 打开详情。
   *
   * ADR-014：双击前浏览器必发一次 click（该行已被单选替换）；本处理**不改动**
   * 选中集合，也**不调用 stopPropagation**（避免误伤选中/冒泡）。
   *
   * @param {Object} event dblclick 事件（鸭子类型）
   * @returns {void}
   */
  function onRowDblClick(event) {
    if (!event) {
      return;
    }
    const rowId = resolveRowId(event, els.listBody);
    if (rowId === null) {
      return;
    }
    openDetailRecord(rowId);
  }

  /** Esc → 关闭详情（仅当已打开，避免误吞其它 Esc 语义）。 */
  function onDetailKeyDown(event) {
    if (!event || event.key !== 'Escape') {
      return;
    }
    if (detailView && detailView.isOpen()) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      closeDetailPane();
    }
  }

  /**
   * 抽屉内点击：surface 内交互不关闭；遮罩层 / 抽屉空白区 → 关闭（ADR-017）。
   *
   * @param {Object} event click 事件（鸭子类型）
   * @returns {void}
   */
  function onDetailPaneClick(event) {
    const target = event ? event.target : null;
    if (!target || typeof target.closest !== 'function') {
      return;
    }
    if (target.closest('.detail-pane__surface')) {
      return;
    }
    closeDetailPane();
  }

  /**
   * P2（REQ-017 / AC-011）：复制当前选中记录（与主复制按钮同一产物），
   * 复制后**不关闭**详情。
   *
   * @returns {Promise<void>}
   */
  async function runDetailCopy() {
    const text = buildCurrentCopy(MODE_A);
    if (text === null) {
      showToast(t('copy.hintSelect'), 'error');
      return;
    }
    await writeCopyText(text);
  }

  /** 详情内复制按钮点击：先隔离冒泡（不关闭详情），再复制。 */
  function onDetailCopyClick(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
    }
    const pendingCopy = runDetailCopy();
    if (pendingCopy && typeof pendingCopy.catch === 'function') {
      pendingCopy.catch(reportAsyncCopyError);
    }
  }

  /**
   * 在抽屉头部（#detail-close 旁）追加「复制请求 + 响应」按钮（P2 / REQ-017）。
   * panel.html 未提供该按钮 → 由 JS 创建并注入 i18n 文案（ADR-020 追加式）。
   *
   * @returns {Object|null} 按钮元素
   */
  function ensureDetailCopyButton() {
    const pane = els.detailPane;
    const header = pane && typeof pane.querySelector === 'function'
      ? pane.querySelector('.detail-pane__header')
      : null;
    if (!header) {
      return null;
    }
    let btn = header.querySelector('#' + DETAIL_COPY_BTN_ID);
    if (btn) {
      return btn;
    }
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = DETAIL_COPY_BTN_ID;
    btn.className = 'btn detail-pane__copy';
    btn.setAttribute('data-i18n', 'detail.copyButton');
    btn.textContent = t('detail.copyButton');
    btn.addEventListener('click', onDetailCopyClick);
    if (els.detailClose && els.detailClose.parentNode === header) {
      header.insertBefore(btn, els.detailClose);
    } else {
      header.appendChild(btn);
    }
    return btn;
  }

  /** 装配详情交互：双击委托 + 关闭按钮 + 遮罩 + Esc + P2 复制按钮。 */
  function wireDetail() {
    if (els.listBody) {
      els.listBody.addEventListener('dblclick', onRowDblClick);
    }
    if (els.detailClose) {
      els.detailClose.addEventListener('click', closeDetailPane);
    }
    if (els.detailPane) {
      els.detailPane.addEventListener('click', onDetailPaneClick);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('keydown', onDetailKeyDown);
    }
    ensureDetailCopyButton();
  }

  // TASK-009：注入导出实现 + 接线详情交互（追加式，ADR-020）。
  openDetailImpl = openDetailRecord;
  closeDetailImpl = closeDetailPane;
  wireDetail();

  // 首帧：填充下拉选项 + 空态。
  refreshView();

  // TASK-008: 大响应/二进制/base64 分类由 content.js 完成，接线见上方 runCurrentCopy。
  // TASK-009: 隐私入口接线已完成，见文件末尾 wirePrivacyLink()（window.open，无需 tabs 权限）。
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export default {
  els,
  applyI18n,
  showToast,
  setEmptyState,
  getCopyMode,
  getSelected,
  buildCurrentCopy,
  getLastCopyText,
  getSelectedIds,
  copySelection,
  openContextMenu,
  openDetail,
  closeDetail,
};

/* ------------------------------------------------------------------------- *
 * TASK-009 — 隐私政策入口接线（DEL-010 / REQ-027 / AC-020）
 *
 * panel.html 已提供 <a id="privacy-link" href="privacy.html">。本扩展刻意只申请
 * clipboardWrite 权限（AC-009），因此 chrome.tabs.create 不可用；改用 window.open
 * 打开扩展内的静态页 privacy.html（同源相对路径会解析为
 * chrome-extension://<id>/privacy.html）。阻止默认行为，避免面板自身被导航覆盖。
 *
 * 约束：不发起网络请求；不写任何持久化存储；不新增任何可见文案。
 * ------------------------------------------------------------------------- */

/**
 * 为隐私政策链接接线：点击时在新标签页打开 privacy.html。
 *
 * `type="module"` 脚本在 DOM 解析后延迟执行，故此处可直接读取 `els.privacyLink`。
 * 若 `window.open` 被环境拦截，则回退到 `<a>` 的默认 `href` 行为。
 *
 * @returns {void}
 */
function wirePrivacyLink() {
  const link = els.privacyLink;
  if (!link) {
    return;
  }

  link.addEventListener('click', function onPrivacyLinkClick(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const target = link.getAttribute('href') || 'privacy.html';
    try {
      window.open(target, '_blank');
    } catch (err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          '[E_PRIVACY_OPEN_FAILED] ' + (err && err.message ? err.message : String(err))
        );
      }
    }
  });
}

wirePrivacyLink();
