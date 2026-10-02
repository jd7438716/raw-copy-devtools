/**
 * content.js — 响应体内容分类（DEL-008 / REQ-021..024 / AC-010）
 *
 * 职责：把 HAR `response.content`（`{ text, encoding, mimeType, size }`）分类为
 * 复制时刻可直接使用的形态，**不修改任何正文**（ADR-006 保真）：
 *
 *   - `kind:'text'`           文本类响应 → `text` 为**逐字符原样**正文（REQ-021）。
 *   - `kind:'binary'`         二进制 MIME → `placeholder` 省略标注（REQ-023）。
 *   - `kind:'base64-text'`    `encoding==='base64'` 且 MIME 属文本类 → UTF-8 解码（REQ-024）。
 *   - `kind:'base64-omitted'` `encoding==='base64'` 且非文本 MIME（含解码失败）→ 省略标注（REQ-024）。
 *   - `kind:'unavailable'`    缺失/空正文 → 不可用（设计 §5.2 降级）。
 *
 * 判定顺序（ADR-008，权威）：
 *   1. 缺少 `text`（非空字符串）→ `unavailable`。
 *   2. `encoding === 'base64'`：MIME 文本类 → 解码；否则（含解码失败/非法 base64）→ `base64-omitted`。
 *   3. 非 base64 且 MIME 为二进制类 → `binary`。
 *   4. 其余 → `text`（原样）。
 *
 * 纯度：纯函数、零副作用；零第三方依赖；不发起网络、不读写持久化。
 * 运行环境：Node（用 `Buffer` 解码）与浏览器（用 `atob` + `TextDecoder`）均可用，
 *          故本模块可在 Node 下直接 import 做单元测试。
 *
 * @module content
 */

/** 大响应阈值（字节）：默认 10 MB，常量可配（REQ-022 / DEC-003）。 */
export const DEFAULT_LARGE_THRESHOLD = 10 * 1024 * 1024;

/* ------------------------------------------------------------------------- *
 * MIME 判定（ADR-008）
 * ------------------------------------------------------------------------- */

/** 二进制 MIME 前缀（`<type>/` 开头）。 */
const BINARY_MIME_PREFIXES = ['image/', 'audio/', 'video/', 'font/'];

/** 二进制 MIME 精确匹配集合（ADR-008 + 常见压缩/字体格式）。 */
const BINARY_MIME_EXACT = new Set([
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-tar',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/wasm',
  'application/font-woff',
  'application/vnd.ms-fontobject',
  'application/x-font-ttf',
  'application/x-font-woff',
  'application/x-font-opentype',
]);

/** 文本类 MIME 精确匹配集合（`encoding==='base64'` 时可尝试 UTF-8 解码）。 */
const TEXT_MIME_EXACT = new Set([
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/ecmascript',
  'application/x-www-form-urlencoded',
  'application/xhtml+xml',
  'application/manifest+json',
]);

/**
 * 归一化 MIME：去掉 `;` 参数、去首尾空白、转小写。
 * @param {*} mimeType
 * @returns {string}
 */
function normalizeMime(mimeType) {
  if (typeof mimeType !== 'string') {
    return '';
  }
  const semi = mimeType.indexOf(';');
  const base = semi === -1 ? mimeType : mimeType.slice(0, semi);
  return base.trim().toLowerCase();
}

/**
 * 是否为二进制 MIME（`image/*`、`audio/*`、`video/*`、`font/*`、
 * `application/octet-stream|pdf|zip` 等，ADR-008）。
 * @param {*} mimeType
 * @returns {boolean}
 */
function isBinaryMime(mimeType) {
  const mime = normalizeMime(mimeType);
  if (mime.length === 0) {
    return false;
  }
  for (let i = 0; i < BINARY_MIME_PREFIXES.length; i += 1) {
    if (mime.startsWith(BINARY_MIME_PREFIXES[i])) {
      return true;
    }
  }
  return BINARY_MIME_EXACT.has(mime);
}

/**
 * 是否为文本类 MIME（`text/*`、`application/json|xml|javascript`、
 * `+json`/`+xml` 后缀、`x-www-form-urlencoded` 等，ADR-008）。
 * MIME 缺失时按设计 §5.2 视作文本。
 * @param {*} mimeType
 * @returns {boolean}
 */
function isTextMime(mimeType) {
  const mime = normalizeMime(mimeType);
  if (mime.length === 0) {
    return true;
  }
  if (mime.startsWith('text/')) {
    return true;
  }
  if (mime.endsWith('+json') || mime.endsWith('+xml')) {
    return true;
  }
  return TEXT_MIME_EXACT.has(mime);
}

/* ------------------------------------------------------------------------- *
 * 字节长度估算（byteSize）
 * ------------------------------------------------------------------------- */

/**
 * 字符串 UTF-8 字节长度（优先 `TextEncoder`，否则手工按码元估算）。
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
      // 高代理项：假定与低代理项组成一个码点（4 字节）
      bytes += 4;
      i += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

/**
 * 解析正文字节数：优先 `responseContent.size`；否则按 `text` 的 UTF-8 字节长度估算。
 * @param {*} responseContent
 * @returns {number}
 */
function resolveByteSize(responseContent) {
  if (!isObject(responseContent)) {
    return 0;
  }
  const size = responseContent.size;
  if (typeof size === 'number' && Number.isFinite(size) && size >= 0) {
    return size;
  }
  return utf8ByteLength(typeof responseContent.text === 'string' ? responseContent.text : '');
}

/* ------------------------------------------------------------------------- *
 * Base64 校验与解码（Node / 浏览器双环境）
 * ------------------------------------------------------------------------- */

/** 标准 base64 字母表 + 最多 2 个尾部填充（`=` 只允许出现在末尾）。 */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * 去掉所有空白字符（HAR base64 可能带换行）。
 * @param {*} raw
 * @returns {string}
 */
function normalizeBase64(raw) {
  return typeof raw === 'string' ? raw.replace(/\s+/g, '') : '';
}

/**
 * 严格校验是否为合法（带填充）标准 base64。
 * 非法输入（长度非 4 的倍数、含非法字符、填充位置错误）返回 false。
 * @param {*} candidate 已去除空白的字符串
 * @returns {boolean}
 */
function isWellFormedBase64(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return false;
  }
  if (candidate.length % 4 !== 0) {
    return false;
  }
  if (!BASE64_PATTERN.test(candidate)) {
    return false;
  }
  // 填充只允许在末尾且最多 2 个；校验 '=' 到结尾的片段长度。
  const padIndex = candidate.indexOf('=');
  if (padIndex !== -1 && candidate.length - padIndex > 2) {
    return false;
  }
  return true;
}

/**
 * 把 base64 字符串解码为 UTF-8 文本。
 *
 * - Node：`Buffer.from(clean,'base64').toString('utf8')`；
 * - 浏览器：`atob` → 字节数组 → `TextDecoder('utf-8')`；
 * - 非法 base64 / 解码异常 → 返回 `null`（调用方回退 `base64-omitted`，绝不抛异常）。
 *
 * @param {*} raw 原始 base64 字符串
 * @returns {string|null} 解码后的文本；失败 → null
 */
function decodeBase64ToUtf8(raw) {
  const candidate = normalizeBase64(raw);
  if (!isWellFormedBase64(candidate)) {
    return null;
  }
  try {
    const bufferRef =
      typeof Buffer !== 'undefined'
        ? Buffer
        : typeof globalThis !== 'undefined' && globalThis
          ? globalThis.Buffer
          : undefined;
    if (bufferRef && typeof bufferRef.from === 'function') {
      return bufferRef.from(candidate, 'base64').toString('utf8');
    }
    if (typeof atob === 'function') {
      const binary = atob(candidate);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      if (typeof TextDecoder === 'function') {
        return new TextDecoder('utf-8').decode(bytes);
      }
      return decodeURIComponent(escape(binary));
    }
  } catch (err) {
    return null;
  }
  return null;
}

/* ------------------------------------------------------------------------- *
 * 内部工具
 * ------------------------------------------------------------------------- */

/**
 * 是否为可用对象。
 * @param {*} value
 * @returns {boolean}
 */
function isObject(value) {
  return value !== null && typeof value === 'object';
}

/* ------------------------------------------------------------------------- *
 * 主入口
 * ------------------------------------------------------------------------- */

/**
 * 分类响应体内容。
 *
 * @param {{text?: string|null, encoding?: string|null, mimeType?: string|null, size?: number|null}} [responseContent]
 *        HAR `response.content`（`capture.normalize` 产出的 `responseContent`）。
 * @param {Object} [options] 预留选项（前向兼容；当前未使用）。
 * @returns {{kind:'text'|'binary'|'base64-text'|'base64-omitted'|'unavailable', text?:string, placeholder?:string, byteSize:number}}
 *          分类结果；`byteSize` 优先取 `size`，否则按文本 UTF-8 字节估算。
 */
export function classifyBody(responseContent, options = {}) {
  void options; // 预留：当前分类逻辑不依赖选项。

  if (!isObject(responseContent)) {
    return { kind: 'unavailable', byteSize: 0 };
  }

  const byteSize = resolveByteSize(responseContent);
  const text = responseContent.text;
  const hasText = typeof text === 'string' && text.length > 0;

  // 1. 空/缺失正文 → unavailable（byteSize 可能为 0）。
  if (!hasText) {
    return { kind: 'unavailable', byteSize };
  }

  const mimeType = responseContent.mimeType;
  const encoding =
    typeof responseContent.encoding === 'string' ? responseContent.encoding.toLowerCase() : '';

  // 2. base64 分支优先（ADR-008）。
  if (encoding === 'base64') {
    if (isTextMime(mimeType)) {
      const decoded = decodeBase64ToUtf8(text);
      if (decoded !== null) {
        return { kind: 'base64-text', text: decoded, byteSize };
      }
    }
    // 非文本 MIME，或文本 MIME 但解码失败（含非法 base64）→ 省略标注。
    return {
      kind: 'base64-omitted',
      placeholder: '[Base64 content omitted: length ' + text.length + ']',
      byteSize,
    };
  }

  // 3. 二进制 MIME → 省略标注（REQ-023）。
  if (isBinaryMime(mimeType)) {
    return {
      kind: 'binary',
      placeholder:
        '[Binary content omitted: ' + normalizeMime(mimeType) + ', ' + byteSize + ' bytes]',
      byteSize,
    };
  }

  // 4. 文本类 → 逐字符原样（REQ-021 / ADR-006）。
  return { kind: 'text', text, byteSize };
}

/**
 * 是否超过大响应阈值。
 *
 * 字节数取 `responseContent.size`，缺失时按文本 UTF-8 字节长度估算。
 * **严格大于**阈值才算超限：`size === threshold` → false；`size === threshold + 1` → true。
 *
 * @param {{text?: string|null, size?: number|null}} [responseContent]
 * @param {number} [threshold=DEFAULT_LARGE_THRESHOLD] 阈值（字节）
 * @returns {boolean}
 */
export function isOverThreshold(responseContent, threshold = DEFAULT_LARGE_THRESHOLD) {
  const limit =
    typeof threshold === 'number' && Number.isFinite(threshold)
      ? threshold
      : DEFAULT_LARGE_THRESHOLD;
  return resolveByteSize(responseContent) > limit;
}

export default { classifyBody, isOverThreshold, DEFAULT_LARGE_THRESHOLD };
