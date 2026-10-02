/**
 * capture.js — HAR entry → RequestRecord 归一化 + `onRequestFinished` 注册。
 *
 * 设计依据（design.md）：
 *   - ADR-001：在 panel 上下文注册捕获监听器（数据生命周期 = 面板生命周期）。
 *   - ADR-003：捕获时归一化并丢弃原 HAR entry 引用（防 `getContent` 闭包连带保留响应体）。
 *   - ADR-004 / REQ-004：每条记录交给 `store` 缓存，超出容量淘汰最旧。
 *   - §5.2：HAR → RequestRecord 字段映射与缺失降级矩阵。
 *   - §5.3 接口：`normalize(harEntry):RequestRecord` / `installCapture({store,onAdd}):{uninstall}`。
 *
 * 约束：纯原生 ESM、零第三方依赖；`normalize` 为**纯函数**（可直接单测）；
 *      `installCapture` 在无 `chrome`（Node 环境）时安全降级、不抛错。
 *      捕获回调内只做字段读取 + 归一化 + `store.add` + 轻量通知（REQ-029）。
 *
 * @module capture
 */

/** 缺失 `request.httpVersion` 时的回退值（DEC-002）。 */
export const DEFAULT_HTTP_VERSION = 'HTTP/1.1';

/** enrich 并发上限（防高频页面回调风暴，REQ-008）。 */
export const MAX_CONCURRENT_ENRICH = 4;

/** enrich 待处理队列上限（超限立即降级，避免无界驻留 harEntry）。 */
export const MAX_ENRICH_QUEUE = 200;

/** 单次 getContent 兜底超时：永不回调时释放并发槽并降级（不悬空、不驻留 entry）。 */
export const ENRICH_FETCH_TIMEOUT_MS = 10000;

/**
 * 把选项规整为正整数。
 *
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function normalizePositive(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.floor(n);
}

/**
 * @param {*} value
 * @returns {Object|null}
 */
function asObject(value) {
  return value && typeof value === 'object' ? value : null;
}

/**
 * @param {*} value
 * @param {string} [fallback='']
 * @returns {string}
 */
function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

/**
 * @param {*} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
function asNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * 复制 headers 为 `[{name,value}]`，保持原始顺序（AC-014 / B-4），不保留原数组引用。
 *
 * @param {*} headers
 * @returns {{name: string, value: string}[]}
 */
function normalizeHeaders(headers) {
  if (!Array.isArray(headers)) {
    return [];
  }
  const out = [];
  for (let i = 0; i < headers.length; i += 1) {
    const header = asObject(headers[i]);
    if (!header) {
      continue;
    }
    out.push({ name: asString(header.name), value: asString(header.value) });
  }
  return out;
}

/**
 * 解析调用方注入的 id：支持 `normalize(entry, 42)` 与 `normalize(entry, {id:42})`。
 *
 * @param {*} idOrOptions
 * @returns {number|null}
 */
function resolveInjectedId(idOrOptions) {
  let value = idOrOptions;
  if (value && typeof value === 'object') {
    value = value.id;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * 把一条 Chromium DevTools HAR entry 归一化为内部 `RequestRecord`（纯函数，无副作用）。
 *
 * 字段映射与降级见 design.md §5.2：缺失时按契约回退，绝不保留原 `harEntry` 引用。
 *
 * @param {Object} harEntry Chromium `onRequestFinished` 回调入参
 * @param {number|{id: number}} [idOrOptions] 可选：调用方注入的 id
 * @returns {{
 *   id: number|null,
 *   method: string,
 *   url: string,
 *   httpVersion: string,
 *   requestHeaders: {name: string, value: string}[],
 *   requestBody: string|undefined,
 *   status: number,
 *   statusText: string,
 *   responseHeaders: {name: string, value: string}[],
 *   responseContent: {text: string|null, encoding: string|null, mimeType: string, size: number},
 *   time: number,
 *   startedDateTime: string,
 *   resourceType: string
 * }}
 */
export function normalize(harEntry, idOrOptions) {
  const entry = asObject(harEntry) || {};
  const request = asObject(entry.request) || {};
  const response = asObject(entry.response) || {};
  const content = asObject(response.content) || {};
  const postData = asObject(request.postData);

  // 响应体文本逐字符原样保留（REQ-020 / AC-007）；缺失时置 null（R1 边界）。
  const responseText = typeof content.text === 'string' ? content.text : null;

  const rawHttpVersion = asString(request.httpVersion);

  return {
    id: resolveInjectedId(idOrOptions),
    method: asString(request.method),
    url: asString(request.url),
    httpVersion: rawHttpVersion || DEFAULT_HTTP_VERSION,
    requestHeaders: normalizeHeaders(request.headers),
    requestBody:
      postData && typeof postData.text === 'string' ? postData.text : undefined,
    status: asNumber(response.status, 0),
    statusText: asString(response.statusText),
    responseHeaders: normalizeHeaders(response.headers),
    responseContent: {
      text: responseText,
      encoding: typeof content.encoding === 'string' ? content.encoding : null,
      mimeType: asString(content.mimeType),
      size:
        typeof content.size === 'number' &&
        Number.isFinite(content.size) &&
        content.size >= 0
          ? content.size
          : responseText === null
            ? 0
            : responseText.length,
    },
    time: asNumber(entry.time, 0),
    startedDateTime: asString(entry.startedDateTime),
    resourceType: asString(entry._resourceType) || asString(entry.resourceType) || '',
  };
}

/**
 * 字符串 UTF-8 字节长度（优先 `TextEncoder`，否则按码元估算）。
 *
 * @param {string} text
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
 * 把异步取回的正文（+ encoding）写回记录（**纯工具，原样写入，不 trim / 不转义**）。
 *
 * - `text` 必须为字符串，否则返回 `false`（不改动记录）；
 * - `encoding` 非空字符串时**合并**进 `responseContent`（REQ-004 / AC-006）；
 * - `size` 缺失/非正时按正文 UTF-8 字节修正（**绝不截断**正文）。
 *
 * @param {Object} record
 * @param {string} text 原始正文（含 base64，若 encoding 为 base64）
 * @param {string|null} [encoding]
 * @returns {boolean} 是否写入
 */
export function applyContent(record, text, encoding) {
  if (!asObject(record) || typeof text !== 'string') {
    return false;
  }
  const rc = asObject(record.responseContent) || {};
  rc.text = text;
  if (typeof encoding === 'string' && encoding.length > 0) {
    rc.encoding = encoding;
  }
  const size = rc.size;
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    rc.size = utf8ByteLength(text);
  }
  record.responseContent = rc;
  return true;
}

/**
 * 取一条 HAR entry 的正文，兼容回调与 Promise 两种形态（REQ-014 / C-10）。
 *
 * - 回调形式：`getContent((content, encoding) => …)`（Chromium 既有签名，两参）；
 * - Promise 形式：`getContent()`（Chrome 151+，resolve `{content, encoding}` 或 `{text, encoding}`）；
 * - 任何异常/不可解析 → resolve `{ text:null, encoding:null }`，**绝不 reject**。
 *
 * @param {Object} harEntry
 * @returns {Promise<{text: string|null, encoding: string|null}>}
 */
function fetchContent(harEntry) {
  return new Promise(function executor(resolve) {
    let settled = false;
    let timer = null;

    /**
     * @param {*} text
     * @param {*} encoding
     */
    function done(text, encoding) {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      resolve({
        text: typeof text === 'string' ? text : null,
        encoding: typeof encoding === 'string' ? encoding : null,
      });
    }

    // 兜底：getContent 永不回调（页面导航/关闭）→ 超时释放并发槽。
    timer = setTimeout(function onFetchTimeout() {
      done(null, null);
    }, ENRICH_FETCH_TIMEOUT_MS);

    /**
     * 解析 Promise 形式返回的对象。
     * @param {*} obj
     */
    function fromObject(obj) {
      if (obj && typeof obj === 'object') {
        const text =
          typeof obj.content === 'string'
            ? obj.content
            : typeof obj.text === 'string'
              ? obj.text
              : null;
        const encoding =
          typeof obj.encoding === 'string'
            ? obj.encoding
            : typeof obj.contentEncoding === 'string'
              ? obj.contentEncoding
              : null;
        done(text, encoding);
      } else {
        done(null, null);
      }
    }

    let ret;
    try {
      // 回调形式优先（Chromium 既有签名）。
      ret = harEntry.getContent(function onContent(content, encoding) {
        done(content, encoding);
      });
    } catch (_err) {
      // Promise-only 形态在收到函数参数时可能抛错 → 无参重试。
      try {
        ret = harEntry.getContent();
      } catch (_err2) {
        done(null, null);
        return;
      }
    }

    if (ret && typeof ret.then === 'function') {
      try {
        ret.then(fromObject, function onReject() {
          done(null, null);
        });
      } catch (_err3) {
        done(null, null);
      }
    }
    // 回调形式：由 onContent 触发 done（无 then）。
  });
}

/**
 * 一个空操作卸载器（环境不具备捕获能力时的安全降级返回值）。
 *
 * @returns {{ uninstall: () => void }}
 */
function noopHandle() {
  return {
    uninstall() {
      // no-op
    },
  };
}

/**
 * 注册 `chrome.devtools.network.onRequestFinished` 监听：每条 HAR entry → `normalize`
 * → `store.add` → 可选 `onAdd(record, id)` → 异步 enrich（`getContent` 回填）。
 *
 * 环境守卫：`chrome` / `chrome.devtools.network.onRequestFinished` 不存在时（如 Node
 * 单测环境）直接返回空操作卸载器，**不抛错**。
 *
 * enrich（TASK-002 / REQ-001/002/003/004/008/014）：
 *   - 仅当 `record.responseContent.text` 为空/`null` **且** `harEntry.getContent` 为函数时触发；
 *   - `normalize → store.add → onAdd` 仍同步返回，不阻塞捕获热路径（C-2）；
 *   - 触发前 `store.markPending(id)`；回调内校验 `store.get(id) === record`（防写陈旧对象），
 *     命中才 `applyContent` + `store.update`，随后 `resolvePending`；
 *   - 回调/Promise 完成即释放 `harEntry` 引用（不写入 record，无长生命周期闭包，C-3）；
 *   - 并发上限 + 有界队列，防高频回调风暴（REQ-008）。
 *
 * @param {{ store?: Object, onAdd?: Function, onUpdate?: Function, chrome?: Object,
 *           maxConcurrent?: number, maxQueue?: number }} [options]
 *        `chrome` 可注入（默认取 `globalThis.chrome`），用于测试或宿主注入。
 * @returns {{ uninstall: () => void }}
 */
export function installCapture(options = {}) {
  const opts = asObject(options) || {};
  const store = opts.store;
  const onAdd = opts.onAdd;
  const onUpdate = opts.onUpdate;

  if (!store || typeof store.add !== 'function') {
    return noopHandle();
  }

  const chromeApi =
    opts.chrome !== undefined
      ? opts.chrome
      : typeof globalThis !== 'undefined'
        ? globalThis.chrome
        : undefined;
  const network =
    chromeApi && chromeApi.devtools ? chromeApi.devtools.network : undefined;
  const onRequestFinished = network ? network.onRequestFinished : undefined;

  if (!onRequestFinished || typeof onRequestFinished.addListener !== 'function') {
    return noopHandle();
  }

  const maxConcurrent = normalizePositive(opts.maxConcurrent, MAX_CONCURRENT_ENRICH);
  const maxQueue = normalizePositive(opts.maxQueue, MAX_ENRICH_QUEUE);

  let active = true;
  let inFlight = 0;
  /** 待处理 enrich 任务（有界；仅临时持有 harEntry 引用，处理完即释放）。 */
  const queue = [];

  /** 取出队列任务执行，直到达到并发上限。 */
  function pump() {
    while (active && inFlight < maxConcurrent && queue.length > 0) {
      const task = queue.shift();
      inFlight += 1;
      Promise.resolve()
        .then(task.run)
        .catch(function onTaskError() {
          // 单条 enrich 失败不得影响其他任务。
        })
        .then(function onTaskDone() {
          inFlight -= 1;
          pump();
        });
    }
  }

  /**
   * 入队一个 enrich 任务；队列已满则立即降级（drop）。
   *
   * @param {{ run: () => Promise<*>, drop: () => void }} task
   */
  function schedule(task) {
    if (!active || queue.length >= maxQueue) {
      task.drop();
      return;
    }
    queue.push(task);
    pump();
  }

  /**
   * 对一个「正文不在同步 HAR 快照里」的 entry 发起异步 enrich。
   *
   * @param {Object} harEntry
   * @param {Object} record
   * @param {number} id
   * @returns {void}
   */
  function maybeEnrich(harEntry, record, id) {
    const rc = record ? record.responseContent : null;
    const hasText = !!rc && typeof rc.text === 'string' && rc.text.length > 0;
    if (hasText) {
      return;
    }
    if (!harEntry || typeof harEntry.getContent !== 'function') {
      return;
    }
    if (
      typeof store.markPending !== 'function' ||
      typeof store.update !== 'function' ||
      typeof store.resolvePending !== 'function'
    ) {
      return;
    }

    store.markPending(id);

    schedule({
      run: function run() {
        return fetchContent(harEntry).then(function onContent(result) {
          // 防写到已被淘汰的陈旧对象（C-4）。
          if (typeof store.get === 'function' && store.get(id) !== record) {
            store.rejectPending(id, 'record-evicted');
            return;
          }
          if (result && typeof result.text === 'string') {
            applyContent(record, result.text, result.encoding);
            store.update(id, { responseContent: record.responseContent });
            store.resolvePending(id, true);
            if (typeof onUpdate === 'function') {
              try {
                onUpdate(record, id);
              } catch (_err) {
                // onUpdate 失败不得影响捕获/回填。
              }
            }
          } else {
            store.rejectPending(id, 'content-unavailable');
          }
        });
      },
      drop: function drop() {
        store.rejectPending(id, 'enqueue-overflow');
      },
    });
  }

  /**
   * `onRequestFinished` 回调：位于页面请求热路径，只做归一化 + 入缓存 + 轻量通知，
   * 随后以**独立异步步骤**补取正文（不 await）。
   *
   * @param {Object} harEntry
   * @returns {void}
   */
  function handleRequestFinished(harEntry) {
    let record;
    try {
      record = normalize(harEntry);
    } catch (_err) {
      return;
    }

    let id;
    try {
      id = store.add(record);
    } catch (_err) {
      return;
    }

    if (typeof onAdd === 'function') {
      try {
        onAdd(record, id);
      } catch (_err) {
        // onAdd 失败不得影响后续捕获。
      }
    }

    try {
      maybeEnrich(harEntry, record, id);
    } catch (_err) {
      // enrich 触发失败绝不影响捕获热路径。
    }
  }

  onRequestFinished.addListener(handleRequestFinished);

  return {
    uninstall() {
      if (!active) {
        return;
      }
      active = false;
      // 丢弃未开始的任务（已入队 pending 需结算，避免悬空 Promise）。
      const dropped = queue.splice(0, queue.length);
      for (let i = 0; i < dropped.length; i += 1) {
        try {
          dropped[i].drop();
        } catch (_err) {
          // 忽略。
        }
      }
      if (typeof onRequestFinished.removeListener === 'function') {
        onRequestFinished.removeListener(handleRequestFinished);
      }
    },
  };
}

export default { normalize, installCapture, applyContent };
