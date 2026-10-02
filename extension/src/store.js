/**
 * store.js — 请求记录内存缓存（环形缓冲，容量默认 1000）＋ 原地回填/pending/字节预算。
 *
 * 设计依据（design.md / 02-solution-design.md 方案 A）：
 *   - ADR-004：环形缓冲（固定数组 + head/count 索引），追加 / 淘汰均 O(1)，内存恒定。
 *   - §5.3 接口：`createStore({capacity=1000})` → `{ add, get, all, size, clear, subscribe }`。
 *   - §6.1 数据模型：记录 `id` 为唯一、递增的 store 序号。
 *   - REQ-004 / AC-013：内存最多保留最近 1000 条，超出淘汰最旧，无内存泄漏。
 *   - TASK-001（方案 A）：
 *       · `update(id, patch)` 原地回填（引用一致，REQ-003 / AC-005）；
 *       · pending 注册表 `markPending/resolvePending/rejectPending/awaitPending/isPending`
 *         （复制竞态基础，REQ-006）；
 *       · 字节预算 `maxBytes` + `bytesInUse()`，超限淘汰最旧（sec-audit R-01 / REQ-008/009）。
 *
 * 约束：纯逻辑、零第三方依赖、零浏览器 API —— 可在 Node 下直接 `import` 做单元测试。
 *      不在新增时做任何解析 / 序列化 / DOM 操作（捕获热路径必须轻量，REQ-029）。
 *      1000 条环形顺序与淘汰语义（`add` 的 `evicted` 事件）保持不变（C-5 / AC-008）。
 *
 * @module store
 */

/** 默认容量（REQ-004 / AC-013）。 */
export const DEFAULT_CAPACITY = 1000;

/** 默认字节预算（64 MB，02-solution-design §8 pre-mortem 冻结值）。 */
export const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;

/** `awaitPending` 默认超时（3 s，REQ-006 / AC-007 冻结值）。 */
export const DEFAULT_PENDING_TIMEOUT_MS = 3000;

/** 每条记录的固定内存开销估算（字节，用于字节预算）。 */
const RECORD_BASE_BYTES = 128;

/**
 * 把任意传入值规整为可挂载的记录对象。
 *
 * @param {*} value
 * @returns {Object}
 */
function toRecord(value) {
  return value && typeof value === 'object' ? value : {};
}

/**
 * 把容量规整为正整数（非法值回退默认 1000）。
 *
 * @param {*} capacity
 * @returns {number}
 */
function normalizeCapacity(capacity) {
  const n = Number(capacity);
  if (!Number.isFinite(n) || n < 1) {
    return DEFAULT_CAPACITY;
  }
  return Math.floor(n);
}

/**
 * 把字节预算规整为正数（非法/非正值回退默认 64MB）。
 *
 * @param {*} maxBytes
 * @returns {number}
 */
function normalizeMaxBytes(maxBytes) {
  const n = Number(maxBytes);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_MAX_BYTES;
  }
  return Math.floor(n);
}

/**
 * 把超时规整为正数（非法/非正值回退默认 3000ms）。
 *
 * @param {*} timeoutMs
 * @returns {number}
 */
function normalizeTimeout(timeoutMs) {
  const n = Number(timeoutMs);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_PENDING_TIMEOUT_MS;
  }
  return Math.floor(n);
}

/**
 * 字符串 UTF-8 字节长度（优先 `TextEncoder`，否则按码元估算）。
 *
 * @param {*} text
 * @returns {number}
 */
function utf8ByteLength(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return 0;
  }
  if (typeof TextEncoder === 'function') {
    return new TextEncoder().encode(text).length;
  }
  let bytes = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * 估算一条记录占用字节（用于字节预算；口径：UTF-8 字节 + 固定开销）。
 *
 * 计入口径（checklist A 已冻结）：`responseContent.text` 与 `requestBody` 的
 * UTF-8 字节、mimeType/url 字符串长度、两处 headers，以及每记录 128B 固定开销。
 *
 * @param {Object} record
 * @returns {number}
 */
function estimateRecordBytes(record) {
  if (!record || typeof record !== 'object') {
    return RECORD_BASE_BYTES;
  }
  let bytes = RECORD_BASE_BYTES;
  if (typeof record.requestBody === 'string') {
    bytes += utf8ByteLength(record.requestBody);
  }
  if (typeof record.url === 'string') {
    bytes += record.url.length;
  }
  const rc = record.responseContent;
  if (rc && typeof rc === 'object') {
    if (typeof rc.text === 'string') {
      bytes += utf8ByteLength(rc.text);
    }
    if (typeof rc.mimeType === 'string') {
      bytes += rc.mimeType.length;
    }
  }
  bytes += headersBytes(record.requestHeaders);
  bytes += headersBytes(record.responseHeaders);
  return bytes;
}

/**
 * headers 数组的近似字节数。
 *
 * @param {*} headers
 * @returns {number}
 */
function headersBytes(headers) {
  if (!Array.isArray(headers)) {
    return 0;
  }
  let bytes = 0;
  for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (!h || typeof h !== 'object') {
      continue;
    }
    if (typeof h.name === 'string') {
      bytes += h.name.length;
    }
    if (typeof h.value === 'string') {
      bytes += h.value.length;
    }
  }
  return bytes;
}

/**
 * 尽量就地把 id 写回记录；记录被冻结（frozen）时返回 false，由调用方改用副本。
 *
 * @param {Object} record
 * @param {number} id
 * @returns {boolean}
 */
function assignId(record, id) {
  try {
    record.id = id;
    return record.id === id;
  } catch (_err) {
    return false;
  }
}

/**
 * 创建一个请求记录内存缓存。
 *
 * @param {{ capacity?: number, maxBytes?: number }} [options]
 * @returns {{
 *   add(rec: Object): number,
 *   get(id: number): Object|undefined,
 *   all(): Object[],
 *   size(): number,
 *   update(id: number, patch: Object): boolean,
 *   bytesInUse(): number,
 *   clear(): void,
 *   markPending(id: number): boolean,
 *   isPending(id: number): boolean,
 *   resolvePending(id: number, value?: *): boolean,
 *   rejectPending(id: number, reason?: *): boolean,
 *   awaitPending(id: number, timeoutMs?: number): Promise<*>,
 *   subscribe(fn: (event: Object) => void): () => void
 * }}
 */
export function createStore({
  capacity = DEFAULT_CAPACITY,
  maxBytes = DEFAULT_MAX_BYTES,
} = {}) {
  const cap = normalizeCapacity(capacity);
  const budget = normalizeMaxBytes(maxBytes);

  /** 固定长度环形缓冲：`buf[head]` 为下一个写入槽。 */
  const buf = new Array(cap);
  /** id → 记录，支持 O(1) `get`。 */
  const index = new Map();
  /** id → 记录估算字节数（字节预算增量账本）。 */
  const sizes = new Map();
  /** id → pending 条目（复制竞态注册表）。 */
  const pending = new Map();
  /** 订阅者集合。 */
  const subscribers = new Set();

  /** 下一个写入位置（0..cap-1）。 */
  let head = 0;
  /** 当前存活记录数（≤ cap）。 */
  let count = 0;
  /** 单调递增 id 序号（clear 后不重置，避免已被引用的旧 id 被复用）。 */
  let nextId = 1;
  /** 当前估算占用的总字节数。 */
  let totalBytes = 0;

  /**
   * 判定调用方注入的 id 是否可用：有限数值且当前未被占用。
   *
   * @param {*} value
   * @returns {boolean}
   */
  function isUsableId(value) {
    return typeof value === 'number' && Number.isFinite(value) && !index.has(value);
  }

  /**
   * 广播一个事件给所有订阅者；订阅者抛错被隔离，绝不影响捕获热路径。
   *
   * @param {Object} event
   * @returns {void}
   */
  function notify(event) {
    if (subscribers.size === 0) {
      return;
    }
    const snapshot = Array.from(subscribers);
    for (let i = 0; i < snapshot.length; i += 1) {
      try {
        snapshot[i](event);
      } catch (_err) {
        // 单个订阅者失败不得中断 store（捕获回调位于页面请求热路径）。
      }
    }
  }

  /**
   * 从账本中移除一条已淘汰记录（index/sizes/totalBytes/pending 结算）。
   *
   * @param {number} id
   * @returns {number} 释放的字节数
   */
  function detachRecord(id) {
    const bytes = sizes.get(id) || 0;
    index.delete(id);
    sizes.delete(id);
    totalBytes -= bytes;
    if (totalBytes < 0) {
      totalBytes = 0;
    }
    rejectPending(id, 'evicted');
    return bytes;
  }

  /**
   * 淘汰当前最旧一条记录（字节预算兜底）。
   *
   * @returns {number|null} 被淘汰的 id；无可淘汰 → null
   */
  function evictOldestForBudget() {
    if (count === 0) {
      return null;
    }
    const start = (head - count + cap) % cap;
    const oldest = buf[start];
    buf[start] = undefined;
    count -= 1;
    if (!oldest || typeof oldest.id !== 'number') {
      return null;
    }
    detachRecord(oldest.id);
    return oldest.id;
  }

  /**
   * 字节预算兜底：超限则淘汰最旧，直至回到预算内或无可淘汰。
   * 每次淘汰发 `{ type:'evict', id, reason:'maxBytes' }`（供 selection.onEvict 清选中）。
   *
   * @returns {number[]} 本次因预算被淘汰的 id 列表（最旧→较新）
   */
  function enforceBudget() {
    const evicted = [];
    while (totalBytes > budget && count > 0) {
      const id = evictOldestForBudget();
      if (id === null) {
        break;
      }
      evicted.push(id);
    }
    for (let i = 0; i < evicted.length; i += 1) {
      notify({ type: 'evict', id: evicted[i], reason: 'maxBytes' });
    }
    return evicted;
  }

  /* ----------------------------------------------------------------------- *
   * pending 注册表（复制竞态基础）
   * ----------------------------------------------------------------------- */

  /**
   * 标记某记录正在异步获取正文。重复标记会重置为新的 pending。
   *
   * @param {number} id
   * @returns {boolean} 是否成功建立 pending
   */
  function markPending(id) {
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      return false;
    }
    const entry = { settled: false, promise: null, resolve: null, reject: null };
    entry.promise = new Promise(function executor(resolve, reject) {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    // 内部吞掉拒绝，避免「无人 await」时触发 unhandledRejection。
    entry.promise.catch(function noop() {});
    pending.set(id, entry);
    return true;
  }

  /**
   * 是否处于 pending（未结算）。
   *
   * @param {number} id
   * @returns {boolean}
   */
  function isPending(id) {
    const entry = pending.get(id);
    return !!(entry && !entry.settled);
  }

  /**
   * 结算为成功。已结算/不存在 → 返回 false（幂等）。
   *
   * @param {number} id
   * @param {*} [value]
   * @returns {boolean}
   */
  function resolvePending(id, value) {
    const entry = pending.get(id);
    if (!entry || entry.settled) {
      return false;
    }
    entry.settled = true;
    pending.delete(id);
    entry.resolve(value);
    return true;
  }

  /**
   * 结算为失败。已结算/不存在 → 返回 false（幂等）。
   *
   * @param {number} id
   * @param {*} [reason]
   * @returns {boolean}
   */
  function rejectPending(id, reason) {
    const entry = pending.get(id);
    if (!entry || entry.settled) {
      return false;
    }
    entry.settled = true;
    pending.delete(id);
    const err = reason instanceof Error ? reason : new Error(String(reason === undefined ? 'pending rejected' : reason));
    entry.reject(err);
    return true;
  }

  /** 结算全部 pending（clear 场景）。 */
  function rejectAllPending(reason) {
    const ids = Array.from(pending.keys());
    for (let i = 0; i < ids.length; i += 1) {
      rejectPending(ids[i], reason);
    }
  }

  /**
   * 等待某记录 enrich 完成。
   *
   * - 该 id 无 pending（从未标记 / 已结算）→ 立即 resolve `true`；
   * - pending → resolve（成功）或 reject（失败 / 超时 `E_PENDING_TIMEOUT`）；
   * - 超时可终止，**绝不永久挂起**（REQ-006 / AC-007）。
   *
   * @param {number} id
   * @param {number} [timeoutMs=3000]
   * @returns {Promise<*>}
   */
  function awaitPending(id, timeoutMs) {
    const entry = pending.get(id);
    if (!entry || entry.settled) {
      return Promise.resolve(true);
    }
    const ms = normalizeTimeout(timeoutMs);
    return new Promise(function executor(resolve, reject) {
      let done = false;
      let timer = null;
      timer = setTimeout(function onTimeout() {
        if (done) {
          return;
        }
        done = true;
        const err = new Error('pending await timeout (' + ms + 'ms)');
        err.code = 'E_PENDING_TIMEOUT';
        reject(err);
      }, ms);
      entry.promise.then(
        function onResolved(value) {
          if (done) {
            return;
          }
          done = true;
          clearTimeout(timer);
          resolve(value);
        },
        function onRejected(err) {
          if (done) {
            return;
          }
          done = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /* ----------------------------------------------------------------------- *
   * 记录读写
   * ----------------------------------------------------------------------- */

  /**
   * 追加一条记录；超过容量时淘汰最旧一条；随后按字节预算兜底淘汰。
   *
   * 调用方可通过记录上已有的数字 `id` 注入 id（需唯一）；否则由 store 递增分配。
   *
   * @param {Object} rec
   * @returns {number} 该记录生效的 id
   */
  function add(rec) {
    let record = toRecord(rec);

    let id;
    if (isUsableId(record.id)) {
      id = record.id;
      if (id >= nextId) {
        nextId = id + 1;
      }
    } else {
      id = nextId;
      nextId += 1;
    }

    if (!assignId(record, id)) {
      record = Object.assign({}, record, { id });
    }

    let evicted = null;
    if (count === cap) {
      const oldest = buf[head];
      if (oldest && typeof oldest.id === 'number') {
        evicted = oldest.id;
        detachRecord(evicted);
      }
      buf[head] = record;
      head = (head + 1) % cap;
    } else {
      buf[head] = record;
      head = (head + 1) % cap;
      count += 1;
    }

    index.set(id, record);
    const bytes = estimateRecordBytes(record);
    sizes.set(id, bytes);
    totalBytes += bytes;

    notify({ type: 'add', id, record, evicted });
    enforceBudget();
    return id;
  }

  /**
   * 按 id 取记录。
   *
   * @param {number} id
   * @returns {Object|undefined}
   */
  function get(id) {
    return index.get(id);
  }

  /**
   * 原地回填：把 patch 合并进 store 中**同一条**记录（引用一致，REQ-003 / AC-005）。
   *
   * - 命中 → 返回 `true`，发 `{ type:'update', id, record, patch }`；
   * - 未命中（已被淘汰 / 未知 id）→ 返回 `false`，**不创建幽灵记录、不复活陈旧 id**；
   * - 合并后按字节预算兜底（可能触发 evict）。
   *
   * @param {number} id
   * @param {Object} patch
   * @returns {boolean}
   */
  function update(id, patch) {
    const record = index.get(id);
    if (!record) {
      return false;
    }
    const p = patch && typeof patch === 'object' ? patch : {};

    const before = sizes.get(id) || 0;
    totalBytes -= before;
    if (totalBytes < 0) {
      totalBytes = 0;
    }
    try {
      Object.assign(record, p);
    } catch (_err) {
      totalBytes += before;
      return false;
    }
    const after = estimateRecordBytes(record);
    sizes.set(id, after);
    totalBytes += after;

    notify({ type: 'update', id, record, patch: p });
    enforceBudget();
    return true;
  }

  /**
   * 按「最旧 → 最新」顺序返回全部存活记录（只读展开，O(n)）。
   *
   * @returns {Object[]}
   */
  function all() {
    const out = new Array(count);
    const start = (head - count + cap) % cap;
    for (let i = 0; i < count; i += 1) {
      out[i] = buf[(start + i) % cap];
    }
    return out;
  }

  /**
   * 当前存活记录数。
   *
   * @returns {number}
   */
  function size() {
    return count;
  }

  /**
   * 当前记录的估算占用字节数（≤ `maxBytes`，除非单条即超预算）。
   *
   * @returns {number}
   */
  function bytesInUse() {
    return totalBytes;
  }

  /**
   * 清空全部记录（id 序号不重置）；同时结算所有 pending。
   *
   * @returns {void}
   */
  function clear() {
    for (let i = 0; i < cap; i += 1) {
      buf[i] = undefined;
    }
    index.clear();
    sizes.clear();
    totalBytes = 0;
    head = 0;
    count = 0;
    rejectAllPending('clear');
    notify({ type: 'clear' });
  }

  /**
   * 订阅变更：
   *   - `add` 通知 `{ type:'add', id, record, evicted }`（`evicted` 为本次被淘汰的 id 或 null）；
   *   - `update` 通知 `{ type:'update', id, record, patch }`；
   *   - 字节预算淘汰额外通知 `{ type:'evict', id, reason:'maxBytes' }`；
   *   - `clear()` 通知 `{ type:'clear' }`。
   *
   * @param {(event: Object) => void} fn
   * @returns {() => void} 取消订阅函数
   */
  function subscribe(fn) {
    if (typeof fn !== 'function') {
      return function noop() {};
    }
    subscribers.add(fn);
    return function unsubscribe() {
      subscribers.delete(fn);
    };
  }

  return {
    add,
    get,
    all,
    size,
    update,
    bytesInUse,
    clear,
    markPending,
    isPending,
    resolvePending,
    rejectPending,
    awaitPending,
    subscribe,
  };
}

export default createStore;
