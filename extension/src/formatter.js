/**
 * formatter.js — 复制拼接核心（DEL-006 / REQ-014..020 / AC-005/006/007/014/015）
 *
 * 职责：把**单条** RequestRecord 拼接为可直接粘贴给 AI 的纯文本，支持两种模式：
 *   - 模式 A（默认，`MODE_A='formatted'`）：在正文外「加壳」——标题段
 *     （`===== META =====` / `===== REQUEST =====` / `===== RESPONSE =====`）
 *     与段标签（`[Request Body]` / `[Response Body]`）。
 *   - 模式 B（`MODE_B='raw'`）：无任何标题/分隔/元信息，请求块 + 空行 + 响应块。
 *
 * 保真契约（ADR-006 门禁级 / AC-007 命门）：
 *   - body **逐 UTF-16 码元原样直通**：绝不 `JSON.parse`/`JSON.stringify`、
 *     不缩进/换行/排序、不压缩、不做任何字符替换、不转 Markdown、不截断。
 *   - 模式 A 只新增标题段/段标签，正文一码元不改；模式 B 不做任何新增。
 *   - 两种模式下 body 子串与输入**逐字符相等**。
 *
 * 单条隔离（REQ-014 / AC-006）：只读取传入的单条 record，绝不隐含其他请求。
 *
 * 纯度：纯函数、零副作用；零浏览器 API、零第三方依赖；可在 Node 下直接 import 单测。
 *
 * @module formatter
 */

/** 模式 A：简单格式化（默认，DEC-005）。 */
export const MODE_A = 'formatted';

/** 模式 B：纯原始模式。 */
export const MODE_B = 'raw';

/* ------------------------------------------------------------------------- *
 * 逐字符输出标记（ADR-006 / USAGE.md 契约；与 i18n.js 的 copy.* 键值保持一致）
 * ------------------------------------------------------------------------- */

/** 元信息标题段标记。 */
export const META_HEADER = '===== META =====';

/** 请求段标题标记。 */
export const REQUEST_SECTION = '===== REQUEST =====';

/** 响应段标题标记。 */
export const RESPONSE_SECTION = '===== RESPONSE =====';

/** 请求体段标签。 */
export const REQUEST_BODY_LABEL = '[Request Body]';

/** 响应体段标签。 */
export const RESPONSE_BODY_LABEL = '[Response Body]';

/* ------------------------------------------------------------------------- *
 * 内部常量
 * ------------------------------------------------------------------------- */

/** `httpVersion` 缺失时的回退值（DEC-002）。 */
const HTTP_VERSION_FALLBACK = 'HTTP/1.1';

/** 请求方法缺失时的占位（design §5.2）。 */
const METHOD_FALLBACK = '?';

/** 元信息标签（与 i18n.js `copy.meta.*` 的 zh 值一致，逐字符契约区内固定）。 */
const META_LABEL_STARTED = '开始时间';
const META_LABEL_TIME = '总耗时';
const META_LABEL_RESOURCE_TYPE = '资源类型';
const META_LABEL_MIME = 'MIME 类型';

/* ------------------------------------------------------------------------- *
 * 内部工具（全部无副作用）
 * ------------------------------------------------------------------------- */

/**
 * 是否为可用对象。
 * @param {*} value
 * @returns {boolean}
 */
function isObject(value) {
  return value !== null && typeof value === 'object';
}

/**
 * 宽松转字符串（null/undefined → ''）。
 * @param {*} value
 * @returns {string}
 */
function asString(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * 是否是非空字符串。
 * @param {*} value
 * @returns {boolean}
 */
function hasText(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 自有属性判定（用于区分「未提供」与「显式提供空值」）。
 * @param {Object} obj
 * @param {string} key
 * @returns {boolean}
 */
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * 单行头渲染：`{name,value}` → `Name: Value`；`string` 行原样；其余宽松转字符串。
 * 保留原始顺序，不排序、不去重、不合并同名（AC-014）。
 *
 * @param {*} header
 * @returns {string|null} 空行返回 null（调用方跳过）
 */
function formatHeaderLine(header) {
  if (typeof header === 'string') {
    return header.length > 0 ? header : null;
  }
  if (isObject(header)) {
    return asString(header.name) + ': ' + asString(header.value);
  }
  if (header === null || header === undefined) {
    return null;
  }
  const text = asString(header);
  return text.length > 0 ? text : null;
}

/**
 * 按原始数组顺序追加头行。
 * @param {string[]} lines
 * @param {*} headers
 * @returns {void}
 */
function appendHeaderLines(lines, headers) {
  if (!Array.isArray(headers)) {
    return;
  }
  for (let i = 0; i < headers.length; i += 1) {
    const line = formatHeaderLine(headers[i]);
    if (line !== null) {
      lines.push(line);
    }
  }
}

/**
 * 请求起始行：`{method} {url} {httpVersion}`（缺失回退见 design §5.2 / DEC-002）。
 * @param {Object} record
 * @returns {string}
 */
function buildRequestStartLine(record) {
  const method = hasText(record.method) ? record.method : METHOD_FALLBACK;
  const url = asString(record.url);
  const version = hasText(record.httpVersion) ? record.httpVersion : HTTP_VERSION_FALLBACK;
  return method + ' ' + url + ' ' + version;
}

/**
 * 响应起始行：`{httpVersion} {status} {statusText}`。
 * @param {Object} record
 * @returns {string}
 */
function buildResponseStartLine(record) {
  const version = hasText(record.httpVersion) ? record.httpVersion : HTTP_VERSION_FALLBACK;
  const status =
    typeof record.status === 'number' && Number.isFinite(record.status)
      ? String(record.status)
      : '0';
  const statusText = asString(record.statusText);
  return statusText.length > 0
    ? version + ' ' + status + ' ' + statusText
    : version + ' ' + status;
}

/**
 * body 是否应产出（非空字符串才产出，避免多余字符）。
 * @param {*} body
 * @returns {boolean}
 */
function hasBody(body) {
  return typeof body === 'string' && body.length > 0;
}

/**
 * 解析实际使用的请求体 / 响应体：
 *   - `options` 显式提供（hasOwnProperty）→ 直接采用（供 TASK-008 注入分类后的 body）；
 *   - 否则回退 `record.requestBody` / `record.responseContent.text ?? ''`。
 *
 * @param {Object} record
 * @param {Object} options
 * @returns {{requestBody: *, responseBody: *}}
 */
function resolveBodies(record, options) {
  const requestBody = hasOwn(options, 'requestBody') ? options.requestBody : record.requestBody;

  let fallbackResponse = '';
  if (isObject(record.responseContent) && typeof record.responseContent.text === 'string') {
    fallbackResponse = record.responseContent.text;
  }
  const responseBody = hasOwn(options, 'responseBody') ? options.responseBody : fallbackResponse;

  return { requestBody, responseBody };
}

/**
 * 构建请求块行数组。
 * `withLabel=true`（模式 A）时，body 前加空行 + `[Request Body]`；
 * `withLabel=false`（模式 B）时，body 前仅加空行。
 *
 * @param {Object} record
 * @param {*} body
 * @param {boolean} withLabel
 * @returns {string[]}
 */
function buildRequestLines(record, body, withLabel) {
  const lines = [buildRequestStartLine(record)];
  appendHeaderLines(lines, record.requestHeaders);
  if (hasBody(body)) {
    lines.push('');
    if (withLabel) {
      lines.push(REQUEST_BODY_LABEL);
    }
    lines.push(body);
  }
  return lines;
}

/**
 * 构建响应块行数组（标签规则同 {@link buildRequestLines}）。
 *
 * @param {Object} record
 * @param {*} body
 * @param {boolean} withLabel
 * @returns {string[]}
 */
function buildResponseLines(record, body, withLabel) {
  const lines = [buildResponseStartLine(record)];
  appendHeaderLines(lines, record.responseHeaders);
  if (hasBody(body)) {
    lines.push('');
    if (withLabel) {
      lines.push(RESPONSE_BODY_LABEL);
    }
    lines.push(body);
  }
  return lines;
}

/**
 * 构建元信息行（缺失字段整行跳过，REQ-017 / ADR-006：仅出现在标题段）。
 * @param {Object} record
 * @returns {string[]}
 */
function buildMetaLines(record) {
  const lines = [];
  if (hasText(record.startedDateTime)) {
    lines.push(META_LABEL_STARTED + ': ' + record.startedDateTime);
  }
  if (typeof record.time === 'number' && Number.isFinite(record.time)) {
    lines.push(META_LABEL_TIME + ': ' + record.time + ' ms');
  }
  if (hasText(record.resourceType)) {
    lines.push(META_LABEL_RESOURCE_TYPE + ': ' + record.resourceType);
  }
  const mimeType =
    isObject(record.responseContent) && hasText(record.responseContent.mimeType)
      ? record.responseContent.mimeType
      : '';
  if (mimeType.length > 0) {
    lines.push(META_LABEL_MIME + ': ' + mimeType);
  }
  return lines;
}

/* ------------------------------------------------------------------------- *
 * 主入口
 * ------------------------------------------------------------------------- */

/**
 * 把单条记录拼接为复制文本（纯函数）。
 *
 * @param {Object} record RequestRecord（capture.normalize 产出的归一化记录）
 * @param {'formatted'|'raw'} [mode=MODE_A] 复制模式；非 `'raw'` 一律按模式 A 处理
 * @param {{requestBody?: *, responseBody?: *, includeMeta?: boolean}} [options]
 *        - `requestBody` / `responseBody`：显式覆盖（供 TASK-008 注入分类后 body）；
 *        - `includeMeta`：`!== false` 时输出 `===== META =====` 标题段（默认输出）。
 * @returns {string} 复制文本；`record` 非对象时返回 `''`
 */
export function buildCopyText(record, mode = MODE_A, options = {}) {
  if (!isObject(record)) {
    return '';
  }
  const opts = isObject(options) ? options : {};
  const { requestBody, responseBody } = resolveBodies(record, opts);
  const isRaw = mode === MODE_B;

  const requestLines = buildRequestLines(record, requestBody, !isRaw);
  const responseLines = buildResponseLines(record, responseBody, !isRaw);

  // 模式 B：纯原始——请求块 + 空行 + 响应块，无任何标题/标签/元信息。
  if (isRaw) {
    return requestLines.concat([''], responseLines).join('\n');
  }

  // 模式 A：可选元信息标题段 + REQUEST 段 + RESPONSE 段。
  const lines = [];
  if (opts.includeMeta !== false) {
    const metaLines = buildMetaLines(record);
    if (metaLines.length > 0) {
      lines.push(META_HEADER);
      for (let i = 0; i < metaLines.length; i += 1) {
        lines.push(metaLines[i]);
      }
      lines.push('');
    }
  }
  lines.push(REQUEST_SECTION);
  for (let i = 0; i < requestLines.length; i += 1) {
    lines.push(requestLines[i]);
  }
  lines.push('');
  lines.push(RESPONSE_SECTION);
  for (let i = 0; i < responseLines.length; i += 1) {
    lines.push(responseLines[i]);
  }
  return lines.join('\n');
}

export default { buildCopyText, MODE_A, MODE_B };
