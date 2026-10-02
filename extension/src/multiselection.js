/**
 * multiselection.js — 多选组合包装（DEL-002 / REQ-006 / REQ-007 / AC-004）。
 *
 * 设计依据（design.md §4.2 + ADR-012 / ADR-014 / ADR-018）：
 *   `createMultiSelection({ ids, onChange })`
 *     → `{ selectAt(i), toggleAt(i), rangeTo(i), extendTo(i), selectAll(), clear(),
 *          move(d), current(), selectedIds(), has(id), count(), setIds(ids),
 *          onEvict(id), ids(), size() }`
 *
 * 角色（组合而非继承）：
 *   - **冻结核心**：本模块内部持有 `createSelection`（`selection.js`）作**单选核心**，
 *     负责「可见列表索引 ↔ id」映射、边界 clamp、单条回落与失效清理。
 *   - **叠加能力**：外层维护 `Set<id>`（多选集合）与 `anchorId`（范围选择锚点）。
 *   - `selection.js` 与 `formatter.js` **字节冻结、禁止改动**（AC-007 / ADR-012）。
 *
 * 语义（ADR-014 / ADR-015 / ADR-018）：
 *   - `selectAt(i)`：替换集合 = `{id_i}`，`anchor = id_i`，同时回落单选核心（主光标）。
 *   - `toggleAt(i)`：集合中存在则删、否则加；无论增删都更新 `anchor = id_i`。
 *   - `rangeTo(i)`：以 `anchor` 为起点、按**可见列表顺序**取闭区间并替换集合；
 *     自动跳过不可见/空槽项；`anchor` 自身不变（Shift 语义）。
 *   - `extendTo(i)`：additive 并集扩选——与 `rangeTo` 同取 `anchor` 闭区间，但
 *     结果与既有 `selected` **并集**（不 clear）；`anchor` 不变（Ctrl+Shift 语义）。
 *   - `selectAll()`：选中当前可见 `ids` 全部（A-1 / A-2 可见范围基准）。
 *   - `move(d)`：**清空集合与锚点**后委托 `primary.move(d)`（↑↓ 仍为单选移动，REQ-007）。
 *   - `clear()`：清空集合、锚点与单选光标。
 *   - `setIds(ids)`：集合剪枝——移除不在新可见列表的 id；锚点失效则清空（ADR-018）。
 *   - `onEvict(id)`：从集合移除被淘汰 id + `primary.onEvict(id)`；计数实时更新。
 *   - `current()`：委托 `primary.current()`（供既有 `renderRow` 主高亮 / `getSelected` 复用）。
 *   - `has(id)`：集合高亮判定；`count()`：工具栏计数；`selectedIds()`：按可见顺序快照。
 *
 * 一致不变量：
 *   - `count() === selectedIds().length`。
 *   - `current()` 要么为 `null`，要么属于选中集合（除非集合被 `move()` 清空后
 *     处于「单选回落」态——此时集合为空、`current()` 为单选光标，`count() === 0`）。
 *   - `selectedIds()` 恒按**可见列表顺序**返回（批量复制顺序契约，ADR-015）。
 *
 * 约束：纯逻辑、零第三方依赖、零浏览器 API —— 可在 Node 下直接 `import` 单测。
 *
 * @module multiselection
 */

import { createSelection } from './selection.js';

/**
 * 把任意传入值规整为 id 数组副本（非数组 → 空数组；保留元素原样以维持索引对应）。
 *
 * @param {*} value
 * @returns {Array}
 */
function toIdList(value) {
  return Array.isArray(value) ? value.slice() : [];
}

/**
 * 是否为可用 id（null / undefined 视为可见列表中的空槽，应跳过）。
 *
 * @param {*} id
 * @returns {boolean}
 */
function isValidId(id) {
  return id !== undefined && id !== null;
}

/**
 * 创建多选状态机（组合包装单选核心）。
 *
 * @param {Object} [options]
 * @param {Array} [options.ids] 当前可见（已过滤 + 已排序）列表的 id 序列
 * @param {(primaryId: (number|string|null), index: number, ids: Array) => void} [options.onChange]
 *        多选状态变化回调：`primaryId` 为主光标 id（无 → null），`index` 为其可见下标（无 → -1），
 *        `ids` 为选中集合的可见顺序快照。异常被隔离，不影响状态机。
 * @returns {{
 *   selectAt(index: number): boolean,
 *   toggleAt(index: number): boolean,
 *   rangeTo(index: number): boolean,
 *   extendTo(index: number): boolean,
 *   selectAll(): boolean,
 *   clear(): boolean,
 *   move(delta: number): boolean,
 *   current(): (number|string|null),
 *   selectedIds(): Array,
 *   has(id: *): boolean,
 *   count(): number,
 *   setIds(ids: Array): Array,
 *   onEvict(id: *): boolean,
 *   ids(): Array,
 *   size(): number
 * }}
 */
export function createMultiSelection(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;

  /** 单选核心（冻结模块）：只读消费，不传入 onChange，避免双重通知。 */
  const primary = createSelection({ ids: toIdList(opts.ids) });

  /** 选中集合（真源为 recordId，非行索引 / DOM）。 */
  const selected = new Set();
  /** 范围选择锚点 id；集合清空 / 锚点被剔除后失效为 null。 */
  let anchorId = null;

  /**
   * 定位可见列表下标对应的有效 id。
   *
   * @param {*} index
   * @returns {{ok: boolean, id?: *, index?: number, ids?: Array}}
   */
  function idAt(index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0) {
      return { ok: false };
    }
    const ids = primary.ids();
    if (i >= ids.length) {
      return { ok: false };
    }
    const id = ids[i];
    if (!isValidId(id)) {
      return { ok: false };
    }
    return { ok: true, id, index: i, ids };
  }

  /** 在可见列表中查找 id 的下标（无 → -1）。 */
  function indexOfList(id) {
    return primary.ids().indexOf(id);
  }

  /**
   * 选中集合的可见顺序快照（去重）。
   * @returns {Array}
   */
  function selectedIds() {
    const ids = primary.ids();
    const out = [];
    const seen = new Set();
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!isValidId(id) || seen.has(id)) {
        continue;
      }
      if (selected.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  }

  /** 可见顺序下第一个仍被选中的 id（无 → null）。 */
  function firstSelectedId() {
    const arr = selectedIds();
    return arr.length > 0 ? arr[0] : null;
  }

  /**
   * 集合非空时，保证主光标落在集合成员上（优先 `preferredId`）。
   * 集合为空时不动主光标（保留 `move()` 的单选回落语义）。
   *
   * @param {*} [preferredId]
   * @returns {void}
   */
  function syncPrimaryToSet(preferredId) {
    if (selected.size === 0) {
      return;
    }
    if (
      isValidId(preferredId) &&
      selected.has(preferredId) &&
      indexOfList(preferredId) !== -1
    ) {
      primary.selectId(preferredId);
      return;
    }
    const cur = primary.current();
    if (cur !== null && selected.has(cur)) {
      return;
    }
    const first = firstSelectedId();
    if (first !== null) {
      primary.selectId(first);
    }
  }

  /** 广播多选状态变化；消费者异常被隔离。 */
  function emit() {
    if (!onChange) {
      return;
    }
    try {
      onChange(primary.current(), primary.index(), selectedIds());
    } catch (_err) {
      // 回调失败不得破坏状态机
    }
  }

  /**
   * 单击（无修饰）：替换集合 = `{id_i}`，`anchor = id_i`，并回落单选核心。
   *
   * @param {number} index
   * @returns {boolean} 是否命中有效行
   */
  function selectAt(index) {
    const hit = idAt(index);
    if (!hit.ok) {
      return false;
    }
    selected.clear();
    selected.add(hit.id);
    anchorId = hit.id;
    primary.selectAt(hit.index);
    emit();
    return true;
  }

  /**
   * Ctrl/Cmd + 单击：集合中存在则删、否则加；更新 `anchor = id_i`。
   *
   * 主光标随交互移动；若被移除的正是主光标，则回落到集合中仍可见的首个成员
   * （集合因此为空时清空主光标）。
   *
   * @param {number} index
   * @returns {boolean} 是否命中有效行
   */
  function toggleAt(index) {
    const hit = idAt(index);
    if (!hit.ok) {
      return false;
    }
    anchorId = hit.id;
    if (selected.has(hit.id)) {
      selected.delete(hit.id);
      if (primary.current() === hit.id) {
        const first = firstSelectedId();
        if (first === null) {
          primary.reset();
        } else {
          primary.selectId(first);
        }
      }
    } else {
      selected.add(hit.id);
      primary.selectId(hit.id);
    }
    emit();
    return true;
  }

  /**
   * Shift + 单击：以 `anchor` 为起点，按可见顺序取闭区间并替换集合。
   *
   * - `anchor` 无效（未设置 / 已不可见）时，回落主光标；仍无 → 等价 `selectAt`。
   * - 区间内空槽 / 不可见项被跳过。
   * - 成功后主光标指向 `id_i`，但 `anchor` 保持不变（可连续 Shift 扩选）。
   *
   * @param {number} index
   * @returns {boolean} 是否命中有效行
   */
  function rangeTo(index) {
    const hit = idAt(index);
    if (!hit.ok) {
      return false;
    }
    const ids = hit.ids;

    let base = anchorId;
    if (!isValidId(base) || ids.indexOf(base) === -1) {
      const cur = primary.current();
      base = isValidId(cur) && ids.indexOf(cur) !== -1 ? cur : null;
    }
    if (base === null) {
      return selectAt(hit.index);
    }

    const a = ids.indexOf(base);
    const lo = Math.min(a, hit.index);
    const hi = Math.max(a, hit.index);
    selected.clear();
    for (let i = lo; i <= hi; i += 1) {
      const id = ids[i];
      if (isValidId(id)) {
        selected.add(id);
      }
    }
    primary.selectId(hit.id);
    emit();
    return true;
  }

  /**
   * Ctrl+Shift + 单击：additive 并集扩选（REQ-004 / AC-004）。
   *
   * 与 `rangeTo` 同以 `anchor` 为起点取可见闭区间，但**不移除既有集合成员**——
   * 结果 = `selected ∪ [base..hit]`。这样「Ctrl 选集 + Ctrl+Shift 扩选」不会丢弃
   * 先前 Ctrl 已选项（id3 不丢）。
   *
   * - `anchor` 无效（未设置 / 已不可见）时回落主光标；仍无 → 等价 `selectAt`。
   * - 区间内空槽 / 不可见项被跳过；`primary` 指向 `hit.id`，`anchor` 保持不变。
   * - 越界 / 空槽目标 → `return false`，不抛异常。
   *
   * @param {number} index
   * @returns {boolean} 是否命中有效行
   */
  function extendTo(index) {
    const hit = idAt(index);
    if (!hit.ok) {
      return false;
    }
    const ids = hit.ids;

    let base = anchorId;
    if (!isValidId(base) || ids.indexOf(base) === -1) {
      const cur = primary.current();
      base = isValidId(cur) && ids.indexOf(cur) !== -1 ? cur : null;
    }
    if (base === null) {
      return selectAt(hit.index);
    }

    const a = ids.indexOf(base);
    const lo = Math.min(a, hit.index);
    const hi = Math.max(a, hit.index);
    // additive：只并入区间成员，绝不 clear 既有集合。
    for (let i = lo; i <= hi; i += 1) {
      const id = ids[i];
      if (isValidId(id)) {
        selected.add(id);
      }
    }
    primary.selectId(hit.id);
    emit();
    return true;
  }

  /**
   * 全选：加入当前可见列表的全部有效 id（A-1 / A-2）。
   *
   * 主光标若不在集合内则移到可见顺序首个成员；`anchor` 保持不变。
   *
   * @returns {boolean} 是否发生集合变化
   */
  function selectAll() {
    const ids = primary.ids();
    let changed = false;
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      if (!isValidId(id)) {
        continue;
      }
      if (!selected.has(id)) {
        selected.add(id);
        changed = true;
      }
    }
    const cur = primary.current();
    if (selected.size > 0 && (cur === null || !selected.has(cur))) {
      const first = firstSelectedId();
      if (first !== null) {
        primary.selectId(first);
        changed = true;
      }
    }
    if (changed) {
      emit();
    }
    return changed;
  }

  /**
   * 清空：集合、锚点与单选光标全部复位。
   *
   * @returns {boolean} 是否发生变化
   */
  function clear() {
    const changed =
      selected.size > 0 || anchorId !== null || primary.current() !== null;
    selected.clear();
    anchorId = null;
    primary.reset();
    if (changed) {
      emit();
    }
    return changed;
  }

  /**
   * ↑/↓：清空集合与锚点后委托单选核心移动（REQ-007「回落单选」）。
   *
   * @param {number} delta
   * @returns {boolean} 是否发生可见变化（集合被清空或光标移动）
   */
  function move(delta) {
    const hadSet = selected.size > 0 || anchorId !== null;
    selected.clear();
    anchorId = null;
    const moved = primary.move(delta);
    if (moved || hadSet) {
      emit();
    }
    return moved || hadSet;
  }

  /**
   * 当前主光标 id（委托单选核心）。
   * @returns {number|string|null}
   */
  function current() {
    return primary.current();
  }

  /**
   * 集合是否包含某 id。
   * @param {*} id
   * @returns {boolean}
   */
  function has(id) {
    return selected.has(id);
  }

  /** 选中条数（工具栏计数 N）。 */
  function count() {
    return selected.size;
  }

  /**
   * 替换可见列表（过滤 / 排序变化后调用）并剪枝集合（ADR-018）。
   *
   * - 移除不在新列表的 id；锚点失效 → 清空。
   * - `primary.setIds` 同步单选核心的失效清理。
   *
   * @param {Array} next
   * @returns {Array} 剪枝后的选中集合可见顺序快照
   */
  function setIds(next) {
    const beforeSize = selected.size;
    const beforeAnchor = anchorId;
    const beforePrimary = primary.current();

    const nextIds = toIdList(next);
    const lookup = new Set();
    for (let i = 0; i < nextIds.length; i += 1) {
      if (isValidId(nextIds[i])) {
        lookup.add(nextIds[i]);
      }
    }
    for (const id of Array.from(selected)) {
      if (!lookup.has(id)) {
        selected.delete(id);
      }
    }
    if (anchorId !== null && !lookup.has(anchorId)) {
      anchorId = null;
    }

    primary.setIds(nextIds);
    if (selected.size > 0) {
      syncPrimaryToSet();
    }

    const changed =
      selected.size !== beforeSize ||
      anchorId !== beforeAnchor ||
      primary.current() !== beforePrimary;
    if (changed) {
      emit();
    }
    return selectedIds();
  }

  /**
   * 处理某 id 被淘汰（环形缓冲覆盖最旧）：移出集合 + 单选核心失效清理。
   *
   * @param {*} id
   * @returns {boolean} 是否发生可见变化
   */
  function onEvict(id) {
    const beforeSize = selected.size;
    const beforeAnchor = anchorId;
    const beforePrimary = primary.current();

    primary.onEvict(id);
    selected.delete(id);
    if (anchorId === id) {
      anchorId = null;
    }
    if (selected.size > 0) {
      syncPrimaryToSet();
    }

    const changed =
      selected.size !== beforeSize ||
      anchorId !== beforeAnchor ||
      primary.current() !== beforePrimary;
    if (changed) {
      emit();
    }
    return changed;
  }

  /** 可见列表的只读副本。 */
  function ids() {
    return primary.ids();
  }

  /** 可见列表长度。 */
  function size() {
    return primary.size();
  }

  return {
    selectAt,
    toggleAt,
    rangeTo,
    extendTo,
    selectAll,
    clear,
    move,
    current,
    selectedIds,
    has,
    count,
    setIds,
    onEvict,
    ids,
    size,
  };
}

export default { createMultiSelection };
