/**
 * hidefilter.js — 静态资源判定与视图隐藏纯逻辑（零 import、可 Node 单测）。
 *
 * 背景：本扩展主要用于把网络请求原文复制发给 AI 调试，列表里的 .js / .css /
 * 字体 / 图片 / 媒体 / pdf 等静态资源属于噪音。本模块提供「哪些记录算静态资源」
 * 的判定与「按开关隐藏」的视图过滤，供 panel.js 在 `applyFilter` 之后串联。
 *
 * 判定口径（DEC：resourceType 主 + MIME/扩展名辅）：
 *   1. 白名单优先放行：`xhr` / `fetch` / `websocket` / `eventsource` 永不隐藏；
 *   2. `document` 仅当为 pdf（MIME `application/pdf` 或 URL 以 `.pdf` 结尾）才隐藏，
 *      普通 HTML 文档保留；
 *   3. `script` / `stylesheet` / `font` / `image` / `media` 直接隐藏；
 *   4. 其余（`other` / 未知 / 空）用 MIME 与 URL 扩展名辅助判定，只命中显式静态表。
 *
 * 约束：纯逻辑、零 import、零浏览器 API —— 可在 Node 下直接 `import` 单测；
 *      大小写一律 `.toLowerCase()` 归一（Chrome `_resourceType` 实际为 PascalCase）。
 *
 * @module hidefilter
 */

/** 直接按 resourceType 判定的静态资源类型。 */
export const HIDDEN_RESOURCE_TYPES = Object.freeze([
  'script',
  'stylesheet',
  'font',
  'image',
  'media',
]);

/** resourceType 命中即隐藏的集合。 */
const HIDDEN_SET = new Set(HIDDEN_RESOURCE_TYPES);

/** 白名单：这些类型永远保留（可调试的接口 / 事件流类请求）。 */
const KEEP_RESOURCE_TYPES = new Set(['xhr', 'fetch', 'websocket', 'eventsource']);

/** 静态 MIME 精确值（小写、已去参数）。 */
const STATIC_MIME = new Set([
  'text/css',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/pdf',
]);

/** 静态 MIME 前缀。 */
const STATIC_MIME_PREFIXES = ['image/', 'font/', 'audio/', 'video/'];

/** 静态 URL 扩展名（小写、不含点）。 */
const STATIC_EXTENSIONS = new Set([
  'js', 'mjs', 'cjs', 'css',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico', 'bmp',
  'pdf',
  'mp4', 'webm', 'ogg', 'mp3', 'wav', 'flac', 'm4a', 'm4v', 'mov',
  'vtt',
]);

/**
 * @param {*} value
 * @returns {string}
 */
function asString(value) {
  return typeof value === 'string' ? value : '';
}

/**
 * 取 URL 的 path 部分（去 scheme/host、去 query/hash）。
 *
 * @param {*} url
 * @returns {string}
 */
function urlPathname(url) {
  const raw = asString(url);
  if (raw === '') {
    return '';
  }
  const noHash = raw.split('#')[0];
  const noQuery = noHash.split('?')[0];
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]*(\/[\s\S]*)?$/i.exec(noQuery);
  if (m) {
    return m[1] || '/';
  }
  return noQuery;
}

/**
 * 取 URL 最后一段的扩展名（小写、不含点）；无扩展名返回 `''`。
 *
 * @param {*} url
 * @returns {string}
 */
function urlExtension(url) {
  const path = urlPathname(url);
  const last = path.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0 || dot === last.length - 1) {
    return '';
  }
  return last.slice(dot + 1).toLowerCase();
}

/**
 * 取记录的 MIME 主类型（小写、去 `;charset=` 等参数）。
 *
 * @param {*} record
 * @returns {string}
 */
function mimeEssence(record) {
  const content = record && record.responseContent;
  const mime = content && typeof content.mimeType === 'string' ? content.mimeType : '';
  return mime.split(';')[0].trim().toLowerCase();
}

/**
 * 该记录是否为 pdf（MIME `application/pdf` 或 URL 以 `.pdf` 结尾）。
 *
 * @param {*} record
 * @returns {boolean}
 */
export function isPdf(record) {
  if (mimeEssence(record) === 'application/pdf') {
    return true;
  }
  return urlExtension(record && record.url) === 'pdf';
}

/**
 * 判断一条记录是否为「静态资源」（应被隐藏）。
 *
 * 纯读取、无副作用；对畸形记录一律返回 `false`（宁可不隐藏，避免误伤 API）。
 *
 * @param {*} record RequestRecord（含 `resourceType` / `url` / `responseContent.mimeType`）
 * @returns {boolean}
 */
export function isStaticResource(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }
  const resourceType = asString(record.resourceType).trim().toLowerCase();

  // 白名单优先：可调试请求永不隐藏。
  if (KEEP_RESOURCE_TYPES.has(resourceType)) {
    return false;
  }
  // 文档：仅 pdf 隐藏，普通 HTML 保留。
  if (resourceType === 'document') {
    return isPdf(record);
  }
  // 点名类型直接隐藏。
  if (HIDDEN_SET.has(resourceType)) {
    return true;
  }

  // 其余（other / 未知 / 空）：MIME 与扩展名辅助，只命中显式静态表。
  if (isPdf(record)) {
    return true;
  }
  const mime = mimeEssence(record);
  if (mime !== '') {
    if (STATIC_MIME.has(mime)) {
      return true;
    }
    for (let i = 0; i < STATIC_MIME_PREFIXES.length; i += 1) {
      if (mime.indexOf(STATIC_MIME_PREFIXES[i]) === 0) {
        return true;
      }
    }
  }
  return STATIC_EXTENSIONS.has(urlExtension(record.url));
}

/**
 * 视图层隐藏：`hideStatic` 为真时剔除静态资源，否则原样返回新数组。
 *
 * @param {Array} records
 * @param {boolean} hideStatic
 * @returns {Array} 过滤后的新数组（不修改入参）
 */
export function applyHide(records, hideStatic) {
  const list = Array.isArray(records) ? records : [];
  if (!hideStatic) {
    return list.slice();
  }
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    if (!isStaticResource(list[i])) {
      out.push(list[i]);
    }
  }
  return out;
}

export default { HIDDEN_RESOURCE_TYPES, isStaticResource, applyHide, isPdf };
