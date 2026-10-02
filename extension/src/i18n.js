/**
 * i18n — 文案字典与翻译函数（纯 ESM，零浏览器 API 依赖）
 *
 * 设计约束（TASK-016 / REQ-033 / AC-016）：
 *   - 默认语言 `zh`（中文优先）；`en` 仅作结构占位（键集与 zh 完全一致，便于后续补翻译）。
 *   - 所有面板可见文案统一经 `t()` 取值，禁止散落硬编码。
 *   - `t(key, vars?)`：支持 `{name}` 占位符插值；命中返回文案；
 *     缺失 key 返回 key 本身（可读回退）并打印 `[E_I18N_MISSING_KEY]`，**绝不抛异常**。
 *
 * 注意（ADR-006 / AC-010 输出契约）：
 *   `copy.*Section` / `copy.requestBody` / `copy.responseBody` 属于「复制文本」
 *   的逐字符契约（`===== REQUEST =====` / `[Request Body]` …），zh/en 均保持
 *   req.txt §5.6/§13 规定的原始英文标记，不得翻译，否则破坏保真比对。
 */

/** 默认语言。 */
export const DEFAULT_LANG = 'zh';

/** 支持的语言（zh 为真源，en 为结构占位）。 */
export const SUPPORTED_LANGS = ['zh', 'en'];

/**
 * 文案字典。键名使用点分层级（如 `panel.title`、`col.method`）。
 * zh 为完整可交付文案；en 为结构占位（键集一一对应）。
 */
export const dict = {
  zh: {
    // ---- 面板 ----
    'panel.name': 'Raw Copy',
    'panel.title': '请求原始信息复制',
    'panel.subtitle': '选中单条请求，一键复制完整请求与响应（纯文本，不做 JSON 美化）',

    // ---- 列表表头（7 个字段）----
    'col.method': '方法',
    'col.url': 'URL',
    'col.status': '状态',
    'col.resourceType': '类型',
    'col.time': '耗时',
    'col.size': '大小',
    'col.started': '时间',

    // ---- 搜索 / 过滤 ----
    'filter.searchPlaceholder': '按 URL 关键字搜索…',
    'filter.method': '方法',
    'filter.status': '状态码',
    'filter.resourceType': '资源类型',
    'filter.all': '全部',
    'filter.clear': '清除筛选',

    // ---- 复制模式 A / B ----
    'mode.a': '简单格式化',
    'mode.b': '纯原始',
    'mode.aButton': '模式 A',
    'mode.bButton': '模式 B',
    'mode.aHint': '加标题段与段标签，正文逐字符原样',
    'mode.bHint': '不加任何标题，直接拼接',

    // ---- 复制按钮 / 提示 ----
    'copy.button': '复制请求 + 响应（原始）',
    'copy.buttonCurl': '复制为 cURL',
    'copy.hintSelect': '请先选中一条请求',
    'copy.notEnabled': '该功能暂未启用',
    'copy.cancelled': '已取消复制',
    'copy.fetchingTimeout': '响应体仍在获取中，请稍后重试',

    // ---- 复制文本段标记（逐字符契约，禁止翻译）----
    'copy.metaHeader': '===== META =====',
    'copy.requestSection': '===== REQUEST =====',
    'copy.responseSection': '===== RESPONSE =====',
    'copy.requestBody': '[Request Body]',
    'copy.responseBody': '[Response Body]',

    // ---- 元信息标签 ----
    'copy.meta.started': '开始时间',
    'copy.meta.time': '总耗时',
    'copy.meta.resourceType': '资源类型',
    'copy.meta.mimeType': 'MIME 类型',

    // ---- Toast ----
    'toast.copied': '已复制到剪贴板',
    'toast.copyFailed': '复制失败：{reason}',
    'toast.copyFailedUnknown': '未知原因',

    // ---- 空态 ----
    'empty.title': '暂无网络请求',
    'empty.hint': '在页面中触发请求后，列表会自动更新。',
    'empty.noMatch': '没有匹配的请求',

    // ---- 隐私入口 ----
    'privacy.link': '隐私政策',
    'privacy.title': '隐私政策',

    // ---- 大响应确认 ----
    'large.confirm': '该响应较大（{size}），是否继续复制？',
    'large.badge': '大响应',

    // ---- 内容降级标注（ADR-008 / AC-010 逐字符契约）----
    'content.unavailable': '（响应体不可用）',
    'content.fetching': '（正在获取响应体…）',
    'content.binaryOmitted': '[Binary content omitted: {mime}, {bytes} bytes]',
    'content.base64Omitted': '[Base64 content omitted: length {length}]',

    // ---- 选中 / 状态栏 ----
    'selection.evicted': '选中的请求已被淘汰',
    'list.count': '共 {count} 条',
    'list.cached': '缓存 {count}/{capacity} 条',
    'app.loading': '加载中…',

    // ---- 右键菜单（DEL-001 / REQ-001）----
    'contextmenu.copyRequestResponse': '复制请求 + 响应（原始）',
    'contextmenu.copySelected': '复制选中({count})',

    // ---- 多选工具栏（DEL-005 / REQ-008）----
    'multi.selectAll': '全选',
    'multi.copySelected': '复制选中({count})',
    'multi.selectedCount': '已选 {count} 条',
    'multi.largeConfirm': '本批含 {count} 条大响应（最大 {size}），是否继续复制？',

    // ---- 明细抽屉（DEL-004 / REQ-013）----
    'detail.title': '请求明细',
    'detail.close': '关闭',
    'detail.copyButton': '复制请求 + 响应（原始）',
    'detail.evicted': '该请求已被淘汰，明细已关闭',
  },

  en: {
    // ---- Panel ----
    'panel.name': 'Raw Copy',
    'panel.title': 'Raw Request Copier',
    'panel.subtitle': 'Select one request and copy its full request + response as plain text.',

    // ---- Columns (7) ----
    'col.method': 'Method',
    'col.url': 'URL',
    'col.status': 'Status',
    'col.resourceType': 'Type',
    'col.time': 'Time',
    'col.size': 'Size',
    'col.started': 'Started',

    // ---- Search / Filter ----
    'filter.searchPlaceholder': 'Search by URL…',
    'filter.method': 'Method',
    'filter.status': 'Status',
    'filter.resourceType': 'Resource type',
    'filter.all': 'All',
    'filter.clear': 'Clear filters',

    // ---- Copy modes A / B ----
    'mode.a': 'Formatted',
    'mode.b': 'Raw',
    'mode.aButton': 'Mode A',
    'mode.bButton': 'Mode B',
    'mode.aHint': 'Add section headers only; body stays byte-for-byte identical',
    'mode.bHint': 'Concatenate directly without any headers',

    // ---- Copy actions ----
    'copy.button': 'Copy Request + Response (Raw)',
    'copy.buttonCurl': 'Copy as cURL',
    'copy.hintSelect': 'Select a request first',
    'copy.notEnabled': 'This action is not available yet',
    'copy.cancelled': 'Copy cancelled',
    'copy.fetchingTimeout': 'The response body is still being fetched, please retry shortly',

    // ---- Copy text markers (exact contract, do not translate) ----
    'copy.metaHeader': '===== META =====',
    'copy.requestSection': '===== REQUEST =====',
    'copy.responseSection': '===== RESPONSE =====',
    'copy.requestBody': '[Request Body]',
    'copy.responseBody': '[Response Body]',

    // ---- Meta labels ----
    'copy.meta.started': 'Started',
    'copy.meta.time': 'Duration',
    'copy.meta.resourceType': 'Resource type',
    'copy.meta.mimeType': 'MIME type',

    // ---- Toast ----
    'toast.copied': 'Copied to clipboard',
    'toast.copyFailed': 'Copy failed: {reason}',
    'toast.copyFailedUnknown': 'Unknown reason',

    // ---- Empty state ----
    'empty.title': 'No network requests yet',
    'empty.hint': 'Requests will appear here automatically.',
    'empty.noMatch': 'No matching requests',

    // ---- Privacy ----
    'privacy.link': 'Privacy Policy',
    'privacy.title': 'Privacy Policy',

    // ---- Large response ----
    'large.confirm': 'This response is large ({size}). Copy anyway?',
    'large.badge': 'Large',

    // ---- Content fallbacks (exact contract, do not translate) ----
    'content.unavailable': '(response body unavailable)',
    'content.fetching': '(fetching response body…)',
    'content.binaryOmitted': '[Binary content omitted: {mime}, {bytes} bytes]',
    'content.base64Omitted': '[Base64 content omitted: length {length}]',

    // ---- Selection / status bar ----
    'selection.evicted': 'The selected request has been evicted',
    'list.count': '{count} total',
    'list.cached': 'Cached {count}/{capacity}',
    'app.loading': 'Loading…',

    // ---- Context menu (DEL-001 / REQ-001) ----
    'contextmenu.copyRequestResponse': 'Copy Request + Response (Raw)',
    'contextmenu.copySelected': 'Copy Selected ({count})',

    // ---- Multi-select toolbar (DEL-005 / REQ-008) ----
    'multi.selectAll': 'Select all',
    'multi.copySelected': 'Copy Selected ({count})',
    'multi.selectedCount': '{count} selected',
    'multi.largeConfirm': 'This batch contains {count} large response(s) (max {size}). Copy anyway?',

    // ---- Detail drawer (DEL-004 / REQ-013) ----
    'detail.title': 'Request details',
    'detail.close': 'Close',
    'detail.copyButton': 'Copy Request + Response (Raw)',
    'detail.evicted': 'This request has been evicted; details closed',
  },
};

/** 当前语言（模块级状态，默认 zh）。 */
let currentLang = DEFAULT_LANG;

/**
 * 设置当前语言。未知语言忽略并保持原值。
 * @param {string} lang
 * @returns {string} 生效后的语言
 */
export function setLanguage(lang) {
  if (SUPPORTED_LANGS.indexOf(lang) !== -1) {
    currentLang = lang;
  }
  return currentLang;
}

/** 读取当前语言。 */
export function getLanguage() {
  return currentLang;
}

/**
 * 取文案。
 *
 * @param {string} key 点分层级的文案键（如 `panel.title`）
 * @param {Record<string, unknown>} [vars] `{name}` 占位符的取值表
 * @returns {string} 命中返回文案（已插值）；缺失返回 key 本身
 */
export function t(key, vars) {
  if (typeof key !== 'string' || key.length === 0) {
    return '';
  }

  const langTable = dict[currentLang] || dict[DEFAULT_LANG];
  let text = langTable[key];

  // en 结构占位：en 未翻译的键回退到 zh，不视为缺失。
  if (text === undefined && langTable !== dict[DEFAULT_LANG]) {
    text = dict[DEFAULT_LANG][key];
  }

  // 真正缺失：可读回退（返回 key），仅告警，绝不抛异常。
  if (text === undefined) {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn('[E_I18N_MISSING_KEY] ' + key);
    }
    return key;
  }

  if (vars && typeof text === 'string') {
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name)
        ? String(vars[name])
        : match;
    });
  }

  return text;
}

export default { t, dict, setLanguage, getLanguage, DEFAULT_LANG, SUPPORTED_LANGS };
