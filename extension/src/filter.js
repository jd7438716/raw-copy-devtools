/**
 * filter.js — 列表搜索 / 过滤纯逻辑（DEL-004 / REQ-006..009 / AC-003）。
 *
 * 设计依据（design.md §5.3）：
 *   - `applyFilter(records, criteria): Record[]`
 *     criteria = `{ query, method, status, resourceType }`，空串 / 缺省 = 不筛。
 *   - `collectOptions(records): { methods, statuses, resourceTypes }` 派生下拉选项。
 *
 * 匹配规则：
 *   - query        —— URL 关键字，**不区分大小写**子串匹配。
 *   - method       —— **精确**匹配，不区分大小写（HTTP 方法大小写不敏感）。
 *   - status       —— 支持精确码（`200`）或码段（`2xx` / `4xx` / `5xx`，首位数字前缀匹配）。
 *   - resourceType —— **精确**匹配，不区分大小写（Chrome `_resourceType` 为小写，
 *                     而 UI 下拉曾用 `XHR`/`Fetch`，故按完整值做大小写不敏感相等）。
 *   - 多条件之间为 **AND**（可组合）。
 *
 * 约束：纯逻辑、零 import、零浏览器 API —— 可在 Node 下直接 `import` 单测。
 *
 * @module filter
 */

/** @param {*} value @returns {*} */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 把任意 criterion 值规整为字符串（支持 number，如 status: 200）。
 *
 * @param {*} value
 * @returns {string}
 */
function asCriteriaText(value) {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

/** @param {*} record @returns {string} */
function recordUrl(record) {
  return record && typeof record.url === 'string' ? record.url : '';
}

/** @param {*} record @returns {string} */
function recordMethod(record) {
  return record && typeof record.method === 'string' ? record.method : '';
}

/** @param {*} record @returns {string} */
function recordResourceType(record) {
  return record && typeof record.resourceType === 'string' ? record.resourceType : '';
}

/**
 * 读取记录状态码为数字；字符串数字也兼容；无法解析返回 NaN。
 *
 * @param {*} record
 * @returns {number}
 */
function recordStatusNumber(record) {
  const value = record ? record.status : undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

/**
 * URL 关键字匹配（不区分大小写）。空/纯空白关键字视为不筛。
 *
 * @param {string} url
 * @param {*} criteria
 * @returns {boolean}
 */
function matchQuery(url, criteria) {
  const query = asCriteriaText(criteria).trim();
  if (query === '') {
    return true;
  }
  return url.toLowerCase().indexOf(query.toLowerCase()) !== -1;
}

/**
 * method 精确匹配（不区分大小写）。
 *
 * @param {string} method
 * @param {*} criteria
 * @returns {boolean}
 */
function matchMethod(method, criteria) {
  const wanted = asCriteriaText(criteria).trim();
  if (wanted === '') {
    return true;
  }
  return method.trim().toLowerCase() === wanted.toLowerCase();
}

/**
 * status 匹配：精确码或码段（`2xx` / `4xx` / `5xx`）。
 *
 * @param {number} status
 * @param {*} criteria
 * @returns {boolean}
 */
function matchStatus(status, criteria) {
  const wanted = asCriteriaText(criteria).trim();
  if (wanted === '') {
    return true;
  }
  if (!Number.isFinite(status)) {
    return false;
  }

  // 码段：首位数字 + 1..2 个 x（2xx / 2X / 2x）
  const range = wanted.match(/^([1-5])[xX]{1,2}$/);
  if (range) {
    const base = Number(range[1]) * 100;
    return status >= base && status <= base + 99;
  }

  const exact = Number(wanted);
  if (Number.isFinite(exact)) {
    return status === exact;
  }
  return false;
}

/**
 * resourceType 精确匹配（不区分大小写）。
 *
 * @param {string} resourceType
 * @param {*} criteria
 * @returns {boolean}
 */
function matchResourceType(resourceType, criteria) {
  const wanted = asCriteriaText(criteria).trim();
  if (wanted === '') {
    return true;
  }
  return resourceType.trim().toLowerCase() === wanted.toLowerCase();
}

/** 判断某条件是否处于「不筛」状态。 */
function isInactive(criteria) {
  return asCriteriaText(criteria).trim() === '';
}

/**
 * 按条件过滤记录（AND 组合）。不修改入参，返回新数组。
 *
 * @param {Object[]} records 记录数组（通常来自 `store.all()`）
 * @param {{query?:string, method?:string, status?:string|number, resourceType?:string}} [criteria]
 * @returns {Object[]} 命中记录（保持入参相对顺序）
 */
export function applyFilter(records, criteria) {
  const list = asArray(records);
  const c = criteria && typeof criteria === 'object' ? criteria : {};

  if (
    isInactive(c.query) &&
    isInactive(c.method) &&
    isInactive(c.status) &&
    isInactive(c.resourceType)
  ) {
    return list.slice();
  }

  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const record = list[i];
    if (!matchQuery(recordUrl(record), c.query)) {
      continue;
    }
    if (!matchMethod(recordMethod(record), c.method)) {
      continue;
    }
    if (!matchStatus(recordStatusNumber(record), c.status)) {
      continue;
    }
    if (!matchResourceType(recordResourceType(record), c.resourceType)) {
      continue;
    }
    out.push(record);
  }
  return out;
}

/**
 * 字符串集合排序（不区分大小写、次级按原值，保证确定性 / 稳定）。
 *
 * @param {Set<string>} set
 * @returns {string[]}
 */
function sortStrings(set) {
  return Array.from(set).sort(function compare(a, b) {
    const la = a.toLowerCase();
    const lb = b.toLowerCase();
    if (la < lb) {
      return -1;
    }
    if (la > lb) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });
}

/**
 * 状态码集合按数值升序。
 *
 * @param {Set<string>} set
 * @returns {string[]}
 */
function sortStatuses(set) {
  return Array.from(set).sort(function compare(a, b) {
    return Number(a) - Number(b);
  });
}

/**
 * 从记录集合派生工具栏下拉选项（去重 + 稳定排序，供 select 使用）。
 *
 * - methods：非空 method 去重后**大写**（HTTP 方法大小写不敏感）。
 * - statuses：非零状态码去重为字符串，数值升序。
 * - resourceTypes：非空 resourceType 去重，字典序（不区分大小写）。
 *
 * @param {Object[]} records
 * @returns {{ methods: string[], statuses: string[], resourceTypes: string[] }}
 */
export function collectOptions(records) {
  const list = asArray(records);
  const methods = new Set();
  const statuses = new Set();
  const resourceTypes = new Set();

  for (let i = 0; i < list.length; i += 1) {
    const record = list[i];

    const method = recordMethod(record).trim();
    if (method !== '') {
      methods.add(method.toUpperCase());
    }

    const status = recordStatusNumber(record);
    if (Number.isFinite(status) && status > 0) {
      statuses.add(String(status));
    }

    const resourceType = recordResourceType(record).trim();
    if (resourceType !== '') {
      resourceTypes.add(resourceType);
    }
  }

  return {
    methods: sortStrings(methods),
    statuses: sortStatuses(statuses),
    resourceTypes: sortStrings(resourceTypes),
  };
}

export default { applyFilter, collectOptions };
