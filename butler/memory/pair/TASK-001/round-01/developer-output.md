# developer-output — Round 1 (TASK-001)

## 模块: MV3 清单 + devtools 注册页 + DevTools 面板注册

- `extension/manifest.json`（新增）
- `extension/devtools.html`（新增）
- `extension/devtools.js`（新增）
- `scripts/check-manifest.mjs`（新增，开发期门禁工具，不进发行包）

## 实现

### extension/manifest.json

```json
{
  "manifest_version": 3,
  "name": "Raw Copy",
  "version": "1.0.0",
  "description": "一键复制单条网络请求的完整请求与响应原始信息为纯文本（不美化 JSON），仅本地运行、不发起网络请求、不持久化数据。",
  "devtools_page": "devtools.html",
  "permissions": ["clipboardWrite"],
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### extension/devtools.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Raw Copy — DevTools</title>
</head>
<body>
  <!-- DevTools 注册页：仅加载注册脚本，创建与 Elements/Console/Network 并列的 Raw Copy 面板。 -->
  <script src="devtools.js"></script>
</body>
</html>
```

### extension/devtools.js

```js
'use strict';

(function registerRawCopyPanel() {
  if (typeof chrome === 'undefined' ||
      !chrome.devtools ||
      !chrome.devtools.panels ||
      typeof chrome.devtools.panels.create !== 'function') {
    console.warn('[Raw Copy] chrome.devtools.panels 不可用，跳过面板注册。');
    return;
  }

  var PANEL_TITLE = 'Raw Copy';
  var PANEL_ICON = 'icons/icon32.png';
  var PANEL_PAGE = 'panel.html';

  chrome.devtools.panels.create(PANEL_TITLE, PANEL_ICON, PANEL_PAGE, function (panel) {
    console.log('[Raw Copy] 面板已注册：' + PANEL_TITLE + ' → ' + PANEL_PAGE);
    if (panel && typeof panel.onShown === 'object') {
      console.log('[Raw Copy] panel 对象已就绪。');
    }
  });
})();
```

## 验证结果（真实执行）

### 1) 语法门禁 — `node scripts/check-syntax.mjs` → exit 0

```
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\devtools.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\i18n.js
[check-syntax] 2/2 files passed
EXIT_SYNTAX=0
```

### 2) manifest 门禁 — `node scripts/check-manifest.mjs` → exit 0（AC-009 / DEL-001 / DEL-009）

```
== check-manifest ==
manifest: D:\xiaozhai.dev\chrome_extension2\extension\manifest.json
[PASS] manifest_version === 3  (actual=3)
[PASS] permissions === ["clipboardWrite"]  (actual=["clipboardWrite"])
[PASS] 无禁止键 "host_permissions"  (absent)
[PASS] 无禁止键 "tabs"  (absent)
[PASS] 无禁止键 "webRequest"  (absent)
[PASS] 无禁止键 "declarativeNetRequest"  (absent)
[PASS] 无禁止键 "content_scripts"  (absent)
[PASS] 无禁止键 "background"  (absent)
[PASS] 无 "<all_urls>" 出现  (absent)
[PASS] devtools_page === "devtools.html"  (actual="devtools.html")
[PASS] icons["16"] 文件存在  (icons/icon16.png → found)
[PASS] icons["32"] 文件存在  (icons/icon32.png → found)
[PASS] icons["48"] 文件存在  (icons/icon48.png → found)
[PASS] icons["128"] 文件存在  (icons/icon128.png → found)
[PASS] version === "1.0.0"  (actual="1.0.0")
[PASS] name 非空  (actual="Raw Copy")
[PASS] description 非空  (actual="一键复制单条网络请求的完整请求与响应原始信息为纯文本（不美化 JSON），仅本地运行、不发起网络请求、不持久化数据。")
== RESULT: PASS (17/17 项) ==
EXIT_MANIFEST=0
```

### 3) 安全扫描 — butler-sec-scan R1-R11

`devtools.js` / `devtools.html` / `manifest.json` 三者 **结论: PASS**（R1-R11 全绿）。

## 自评

- [x] 符合 CONSTITUTION 红线（build PASS + 门禁断言 PASS，无第三方依赖）
- [x] 符合 conventions.md（纯原生 JS，零第三方依赖）
- [x] 错误处理已覆盖（`chrome.devtools.panels` 不可用时守卫 + 友好告警）
- [x] 门禁测试已覆盖（check-manifest.mjs 17 项断言；check-syntax.mjs 语法门禁）
- [x] 未越界（未创建 panel.html/panel.js/privacy.html）

## AC 对应

| AC / DEL | 落点 | 状态 |
|---|---|---|
| DEL-001 | devtools.html + devtools.js | ✅ |
| DEL-009 | manifest.json（MV3 + clipboardWrite） | ✅ |
| AC-009 | permissions 长度 1 且仅 clipboardWrite，无禁止键 | ✅ 机械验证 17/17 |
| AC-001 | panels.create 注册 Raw Copy 面板（运行时冒烟由 E2E 覆盖） | ✅ 代码就绪 |

## 备注

- `scripts/check-manifest.mjs` 属开发期门禁工具，保留在仓库、**不进发行包**（打包白名单仅 `extension/**` + `LICENSE`，ADR-011）。
- 本任务为单模块交付，Round 1 即完成全部交付物。
