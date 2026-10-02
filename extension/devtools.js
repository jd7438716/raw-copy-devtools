/**
 * devtools.js — 注册 Raw Copy DevTools 面板。
 *
 * 仅做一件事：通过 chrome.devtools.panels.create 创建一个与
 * Elements / Console / Network 并列的独立面板。
 *
 * 约束（design.md ADR-001 / ADR-009 / D-2）：
 *   - 纯原生 JS，无第三方依赖；
 *   - 面板页路径固定为 "panel.html"（由 TASK-002 提供）；
 *   - 图标使用扩展内 "icons/icon32.png"（TASK-013 提供）。
 */

'use strict';

(function registerRawCopyPanel() {
  // chrome.devtools.panels 仅在 DevTools 注册页（devtools_page）上下文可用。
  if (typeof chrome === 'undefined' ||
      !chrome.devtools ||
      !chrome.devtools.panels ||
      typeof chrome.devtools.panels.create !== 'function') {
    // 非 DevTools 上下文（例如被误加载）：静默退出，不抛错。
    console.warn('[Raw Copy] chrome.devtools.panels 不可用，跳过面板注册。');
    return;
  }

  var PANEL_TITLE = 'Raw Copy';
  var PANEL_ICON = 'icons/icon32.png';
  var PANEL_PAGE = 'panel.html';

  chrome.devtools.panels.create(PANEL_TITLE, PANEL_ICON, PANEL_PAGE, function (panel) {
    // panel 可用于后续扩展（如 onShown/onHidden）；当前无需额外处理。
    console.log('[Raw Copy] 面板已注册：' + PANEL_TITLE + ' → ' + PANEL_PAGE);
    if (panel && typeof panel.onShown === 'object') {
      // 预留钩子，不改变当前行为。
      console.log('[Raw Copy] panel 对象已就绪。');
    }
  });
})();
