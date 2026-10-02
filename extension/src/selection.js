/**
 * selection.js — 单选状态机（DEL-005 / REQ-010 / REQ-011 / AC-004）。
 *
 * 设计依据（design.md §5.3）：
 *   `createSelection({ids, onChange})`
 *     → `{ selectAt(i), move(delta), selectId(id), current(), onEvict(id) }`
 *   本实现按任务要求扩展：`setIds(ids)` / `reset()`（并附 `index()` / `ids()` / `size()` 只读助手）。
 *
 * 语义：
 *   - **唯一选中**：任意时刻至多一个 id 被选中；点击（selectAt/selectId）即整体替换。
 *   - **可见列表**：`ids` 为「当前可见（已过滤 + 已排序）列表」的 id 序列；`move(±1)`
 *     只在此序列内切换，索引与虚拟列表的 `data-index` 一一对应。
 *   - **边界 clamp**：到首/尾后继续同向移动保持不变（不越界、不循环）。
 *   - **失效清理**：`setIds` 后当前选中若不在新列表 → 清空（`current()===null`），
 *     绝不指向已移除项；`onEvict(id)` 处理选中项被环形缓冲淘汰 → 清空。
 *   - **onChange(id, index)**：选中发生变化时回调；异常被隔离，不影响状态机。
 *
 * 约束：纯逻辑、零第三方依赖、零浏览器 API —— 可在 Node 下直接 `import` 单测。
 *
 * @module selection
 */

/**
 * 把任意传入值规整为 id 数组副本（非数组 → 空数组）。
 *
 * 说明：保留元素原样（含重复/空值），以维持与可见列表的**索引一一对应**；
 * 非法元素仅在 `selectAt` / `move` 落点处被忽略。
 *
 * @param {*} value
 * @returns {Array}
 */
function toIdList(value) {
  return Array.isArray(value) ? value.slice() : [];
}

/**
 * 把 delta 规整为整数（非法/0 → 0）。
 *
 * @param {*} value
 * @returns {number}
 */
function toDelta(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.trunc(n);
}

/**
 * 创建一个单选状态机。
 *
 * @param {Object} [options]
 * @param {Array} [options.ids] 当前可见列表的 id 序列（初始值）
 * @param {(id: (number|string|null), index: number) => void} [options.onChange]
 *        选中变化回调；`id` 为当前选中项（无 → null），`index` 为其在可见列表中的下标（无 → -1）
 * @returns {{
 *   setIds(ids: Array): (number|string|null),
 *   selectAt(index: number): boolean,
 *   move(delta: number): boolean,
 *   selectId(id: *): boolean,
 *   current(): (number|string|null),
 *   onEvict(id: *): boolean,
 *   reset(): boolean,
 *   index(): number,
 *   ids(): Array,
 *   size(): number
 * }}
 */
export function createSelection(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;

  /** 当前可见列表（id 序列），`show`/`move` 的唯一索引依据。 */
  let list = toIdList(opts.ids);
  /** 当前选中 id；null = 无选中。 */
  let selectedId = null;

  /** @param {*} id @returns {number} */
  function indexOfId(id) {
    return list.indexOf(id);
  }

  /** 当前选中项在可见列表中的下标（无 → -1）。 */
  function currentIndex() {
    return selectedId === null ? -1 : indexOfId(selectedId);
  }

  /** 广播选中变化；消费者异常被隔离。 */
  function emit() {
    if (!onChange) {
      return;
    }
    try {
      onChange(selectedId, currentIndex());
    } catch (_err) {
      // 回调失败不得破坏状态机
    }
  }

  /**
   * 设置选中项（内部）：返回是否发生变化。
   * @param {*} next
   * @returns {boolean}
   */
  function setSelected(next) {
    if (next === selectedId) {
      return false;
    }
    selectedId = next;
    emit();
    return true;
  }

  /**
   * 按可见列表下标选中（行点击入口）。下标非法 → 不改变状态。
   *
   * @param {number} index
   * @returns {boolean} 是否成功定位到一个有效 id
   */
  function selectAt(index) {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= list.length) {
      return false;
    }
    const id = list[i];
    if (id === undefined || id === null) {
      return false;
    }
    setSelected(id);
    return true;
  }

  /**
   * 按 id 选中（仅当该 id 在当前可见列表内）。未命中 → 不改变状态。
   *
   * @param {*} id
   * @returns {boolean} 是否命中并选中
   */
  function selectId(id) {
    if (id === undefined || id === null || indexOfId(id) === -1) {
      return false;
    }
    if (id === selectedId) {
      return true;
    }
    selectedId = id;
    emit();
    return true;
  }

  /**
   * 在可见列表内相对移动 `delta` 行（↑ = -1 / ↓ = +1）。
   *
   * - 无选中时：正向落到首行、反向落到末行（首/尾 clamp 的自然延伸）。
   * - 有选中时：`index + delta` 后 clamp 到 `[0, len-1]`，到边界保持不动（不循环）。
   *
   * @param {number} delta
   * @returns {boolean} 是否发生选中变化
   */
  function move(delta) {
    const step = toDelta(delta);
    if (step === 0 || list.length === 0) {
      return false;
    }

    const at = currentIndex();
    let target;
    if (at === -1) {
      target = step > 0 ? 0 : list.length - 1;
    } else {
      target = at + step;
      if (target < 0) {
        target = 0;
      } else if (target > list.length - 1) {
        target = list.length - 1;
      }
    }

    if (target === at) {
      return false;
    }
    const id = list[target];
    if (id === undefined || id === null) {
      return false;
    }
    selectedId = id;
    emit();
    return true;
  }

  /**
   * 当前选中 id（不在可见列表内 → null）。
   * @returns {number|string|null}
   */
  function current() {
    if (selectedId === null) {
      return null;
    }
    return indexOfId(selectedId) === -1 ? null : selectedId;
  }

  /**
   * 处理某 id 被淘汰（环形缓冲覆盖最旧）：若正是选中项 → 清空。
   *
   * @param {*} id
   * @returns {boolean} 是否因此清空了选中
   */
  function onEvict(id) {
    if (selectedId !== null && id === selectedId) {
      selectedId = null;
      emit();
      return true;
    }
    return false;
  }

  /**
   * 替换可见列表（过滤 / 排序变化后调用）。当前选中不在新列表 → 清空。
   *
   * @param {Array} next
   * @returns {number|string|null} 替换后的当前选中
   */
  function setIds(next) {
    list = toIdList(next);
    if (selectedId !== null && indexOfId(selectedId) === -1) {
      selectedId = null;
      emit();
    }
    return current();
  }

  /**
   * 清空选中（列表保持不变）。
   * @returns {boolean} 是否发生变化
   */
  function reset() {
    if (selectedId === null) {
      return false;
    }
    selectedId = null;
    emit();
    return true;
  }

  /** 当前选中下标（无 → -1）。 */
  function index() {
    return currentIndex();
  }

  /** 可见列表的只读副本。 */
  function ids() {
    return list.slice();
  }

  /** 可见列表长度。 */
  function size() {
    return list.length;
  }

  return {
    setIds,
    selectAt,
    move,
    selectId,
    current,
    onEvict,
    reset,
    index,
    ids,
    size,
  };
}

export default { createSelection };
