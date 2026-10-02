/**
 * urlparts.js — 把完整 URL 拆成「域名 / 路径」用于列表简化展示（纯逻辑、零 import）。
 *
 * 背景：请求列表里长 URL（尤其带超长 query 的登录重定向）会挤占整行。参考
 * Chrome DevTools Network 的域名 / 路径布局，把 URL 拆成两列展示，降低噪音。
 *
 * 注意：本模块**只影响列表展示**；复制产物仍输出完整 URL（逐字符契约不变）。
 *
 * @module urlparts
 */

/**
 * 拆分 URL。
 *
 * - 绝对 URL：`host` = 主机（含端口）；`path` = pathname + query + hash（缺省 `/`）。
 * - 相对 / 不可解析：`host` = `''`；`path` = 原串。
 *
 * @param {*} url
 * @returns {{ host: string, path: string }}
 */
export function splitUrl(url) {
  const raw = typeof url === 'string' ? url : '';
  if (raw === '') {
    return { host: '', path: '' };
  }

  if (typeof URL === 'function') {
    try {
      const parsed = new URL(raw);
      const host = parsed.host || '';
      // 不透明协议（data: / mailto: / file: 等）无 host → 整串作为 path。
      if (host === '') {
        return { host: '', path: raw };
      }
      const path = (parsed.pathname || '') + (parsed.search || '') + (parsed.hash || '');
      return { host: host, path: path || '/' };
    } catch (_err) {
      // 相对 / 非法 URL → 落到正则兜底。
    }
  }

  const m = /^([a-z][a-z0-9+.-]*:\/\/)([^/?#]+)([\s\S]*)$/i.exec(raw);
  if (m) {
    const rest = m[3] || '';
    return { host: m[2], path: rest || '/' };
  }
  return { host: '', path: raw };
}

export default { splitUrl };
