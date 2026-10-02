/**
 * contextmenu.js — 右键菜单纯逻辑模块（DEL-001 / plan STORY-ENH-001）
 *
 * 设计依据：design.md §4.2（接口表）+ ADR-013（面板内自绘 DOM，零原生菜单权限）
 *          + ADR-014（右键即单选；多选 count≥2 追加「复制选中(N)」）
 *          + plan.md STORY-ENH-001 / NEW_APIS。
 *
 * 本模块只提供**三件纯逻辑**，零 DOM 接触、零浏览器 API、零第三方依赖，可在
 * Node 下直接 `import` 单测：
 *   1. `resolveRowId(event, listBodyEl)` — 事件目标 → 命中行的 recordId | null
 *      （`event.target.closest('.row')` → 读 `data-id`；表头 / 空白 / 未渲染行 → null，
 *       以 `E_CTX_NO_TARGET` 标记，**绝不抛异常**）。
 *   2. `createMenuModel({hasSelection, count})` — 菜单项模型
 *      （纯数据数组，不含任何渲染；文案只给 i18n 键，实际键值由 TASK-010 补齐）。
 *   3. `clampPosition({x, y, w, h, vw, vh})` — 菜单左上角视口四边夹取，防溢出。
 *
 * 约束：
 *   - 不引用任何浏览器 API；菜单渲染（DOM 创建 / 定位 / 关闭时机）由 TASK-007 负责。
 *   - 本模块不写任何 HTML 字符串；文案来自 i18n 常量字典（键名 `contextmenu.*`）。
 *   - `data-id` 采用 render.js:249-252 已写入的值（DOM 复用/回收时仍与该元素绑定，
 *     不受虚拟窗口重排影响，命中比 `data-index` 更稳）。
 *
 * @module contextmenu
 */

/** 未命中可右键行的错误码（调用方记录用；本模块只返回 null，不抛异常）。 */
export const E_CTX_NO_TARGET = 'E_CTX_NO_TARGET';

/** 菜单项动作名（panel 侧分派用）。 */
export const CTX_ACTION = {
  COPY_REQUEST_RESPONSE: 'copyRequestResponse',
  COPY_SELECTED: 'copySelected',
};

/** 菜单项稳定 DOM id（渲染为 `#context-menu` 内子项 id）。 */
export const CTX_ITEM_ID = {
  COPY_REQUEST_RESPONSE: 'copy-request-response',
  COPY_SELECTED: 'copy-selected',
};

/**
 * 行内 id 宿主选择器。render.js 生成的每行均为 `<div class="row" data-id=…>`。
 * @type {string}
 */
const ROW_SELECTOR = '.row';

/** 十进制整数字符串（含可选负号）。 */
const INT_RE = /^-?\d+$/;

/**
 * 把 DOM `data-id` 字符串还原为 recordId。
 *
 * render.js 写入的是 `String(record.id)`，而 store 的 `record.id` 为**递增 number**
 * （见 store.js:7 与 design §6.1 `selectedIds:Set<number>`）。为让下游
 * `selection.selectId(id)` / `multiselection.has(id)` 的严格相等判定命中，纯十进制
 * 整数串还原为 number；其余（非常规 id）原样返回字符串。
 *
 * @param {string} raw data-id 原始值
 * @returns {number|string} recordId
 */
function toRecordId(raw) {
  if (INT_RE.test(raw)) {
    const n = Number(raw);
    // 仅当字符串与数值的规范表示一致时还原（round-trip 安全）：
    // "42"→42；"007" / "-0" 等非规范写法保留原字符串，不改变原 id 形态。
    if (Number.isSafeInteger(n) && String(n) === raw) {
      return n;
    }
  }
  return raw;
}

/**
 * 解析右键事件命中的行 id。
 *
 * 判定链：
 *   1. `event.target` 具备 `closest` → 向上找 `.row`；
 *   2. 若提供了 `listBodyEl` 且其有 `contains` → 命中行必须落在列表体内
 *      （排除列表外同 class 元素）；
 *   3. 读取行的 `data-id`；空 / 缺失 → null。
 *
 * 任一环节不满足（表头 / 空白 / 未渲染行 / 畸形事件）→ 返回 `null`，
 * 以 `E_CTX_NO_TARGET` 语义表示未命中，**不抛异常**、无副作用。
 *
 * @param {{ target?: { closest?: Function } }|null|undefined} event 右键事件
 * @param {{ contains?: (node:*) => boolean }|null|undefined} [listBodyEl] 列表体容器
 * @returns {number|string|null} 命中行 recordId；未命中 → null
 */
export function resolveRowId(event, listBodyEl) {
  if (!event || typeof event !== 'object') {
    return null;
  }
  const target = event.target;
  if (!target || typeof target.closest !== 'function') {
    return null;
  }

  let row;
  try {
    row = target.closest(ROW_SELECTOR);
  } catch (_err) {
    return null;
  }
  if (!row) {
    return null;
  }

  // 列表体包含性校验（可选，兼容无 contains 的 DOM 桩）。
  if (listBodyEl && typeof listBodyEl.contains === 'function') {
    let contained = true;
    try {
      contained = listBodyEl.contains(row);
    } catch (_err) {
      contained = true;
    }
    if (!contained) {
      return null;
    }
  }

  let raw = null;
  if (typeof row.getAttribute === 'function') {
    raw = row.getAttribute('data-id');
  } else if (row.dataset && row.dataset.id !== undefined) {
    raw = row.dataset.id;
  }
  if (raw === null || raw === undefined) {
    return null;
  }

  const text = String(raw);
  if (text === '') {
    return null;
  }
  return toRecordId(text);
}

/** 构造一个菜单项（纯数据，无渲染）。 */
function makeItem(id, i18nKey, action, enabled, options) {
  const extra = options && typeof options === 'object' ? options : {};
  return {
    id,
    i18nKey,
    enabled: Boolean(enabled),
    action,
    // i18n 插值变量（如「复制选中({count})」），无 → null。
    vars: extra.vars && typeof extra.vars === 'object' ? extra.vars : null,
  };
}

/**
 * 生成右键菜单项模型。
 *
 * 项集（顺序固定）：
 *   1. 「复制请求 + 响应（原始）」——**常驻**；`enabled = hasSelection`。
 *   2. 「复制选中(N)」——仅当 `count >= 2` 追加（ADR-014）；`vars = { count }`。
 *
 * 纯函数：输入非法按空上下文处理，不抛异常；项顺序稳定（C-7）。
 *
 * @param {Object} [context]
 * @param {boolean} [context.hasSelection] 当前是否存在选中行（主项可用性）
 * @param {number} [context.count] 选中集合大小（多选计数）
 * @returns {Array<{id:string, i18nKey:string, enabled:boolean, action:string, vars:Object|null}>}
 *          菜单项模型（纯数据）；输入非法按空上下文处理，不抛异常
 */
export function createMenuModel(context) {
  const ctx = context && typeof context === 'object' ? context : {};
  const hasSelection = Boolean(ctx.hasSelection);

  const rawCount = Number(ctx.count);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;

  const items = [];

  // 主项：常驻；无选中 → 禁用。
  items.push(
    makeItem(
      CTX_ITEM_ID.COPY_REQUEST_RESPONSE,
      'contextmenu.copyRequestResponse',
      CTX_ACTION.COPY_REQUEST_RESPONSE,
      hasSelection,
    ),
  );

  // 多选追加项：count ≥ 2 才出现（ADR-014）；enabled=true（count≥2 即有多选）。
  if (count >= 2) {
    items.push(
      makeItem(
        CTX_ITEM_ID.COPY_SELECTED,
        'contextmenu.copySelected',
        CTX_ACTION.COPY_SELECTED,
        true,
        { vars: { count } },
      ),
    );
  }

  return items;
}

/** 把值规整为有限数（非数 / NaN / Infinity → 0）。 */
function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 将菜单左上角位置夹取到视口内（四边），防溢出。
 *
 * 约束：`left + w ≤ vw` 且 `top + h ≤ vh`，同时 `left ≥ 0`、`top ≥ 0`。
 * 当菜单比视口还大（`w > vw` 或 `h > vh`）→ 对齐到 0（先保证左/上边可见）。
 * 非有限输入按 0 处理，**不抛异常**。
 *
 * @param {Object} [rect]
 * @param {number} [rect.x] 期望左边距（视口坐标，通常为指针 x）
 * @param {number} [rect.y] 期望上边距（视口坐标，通常为指针 y）
 * @param {number} [rect.w] 菜单宽度（px）
 * @param {number} [rect.h] 菜单高度（px）
 * @param {number} [rect.vw] 视口宽度（px）
 * @param {number} [rect.vh] 视口高度（px）
 * @returns {{ left: number, top: number }} 夹取后的坐标
 */
export function clampPosition(rect) {
  const r = rect && typeof rect === 'object' ? rect : {};

  const x = finite(r.x);
  const y = finite(r.y);
  const w = Math.max(0, finite(r.w));
  const h = Math.max(0, finite(r.h));
  const vw = Math.max(0, finite(r.vw));
  const vh = Math.max(0, finite(r.vh));

  const maxLeft = Math.max(0, vw - w);
  const maxTop = Math.max(0, vh - h);

  return {
    left: Math.min(Math.max(x, 0), maxLeft),
    top: Math.min(Math.max(y, 0), maxTop),
  };
}

export default { E_CTX_NO_TARGET, CTX_ACTION, CTX_ITEM_ID, resolveRowId, createMenuModel, clampPosition };
