# developer-output — Round 1 (TASK-002)

> 模式: 直接 backlog 任务（无 frame，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> 覆盖: DEL-002 / REQ-005 / REQ-012 / REQ-013 / REQ-033 / AC-012 / AC-016

## 模块: DevTools 面板 UI 外壳（列表容器 + 工具栏 + 复制按钮 + Toast）

- `extension/panel.html`（新增）— 面板 DOM 外壳
- `extension/styles/panel.css`（新增）— 列表/工具栏/复制按钮/Toast/选中/空态样式
- `extension/panel.js`（新增）— 面板入口（UI 壳 + i18n 注入 + 稳定 DOM 契约）
- `scripts/check-panel-shell.mjs`（新增，开发期门禁工具，不进发行包）

## 实现摘要

### extension/panel.html（结构，零裸中文）

- `<meta charset="utf-8">` + `<link rel="stylesheet" href="styles/panel.css">`
- `<script type="module" src="panel.js"></script>`（ADR-002 原生 ESM）
- 顶部 `#toolbar`：`#search`（输入框）+ `#filter-method` / `#filter-status` / `#filter-type`（3 个 select）+ `#mode-toggle`（模式 A/B）
- 中部 `#list`（滚动容器）→ `.list__header`（7 列表头）+ `#list-body`（行容器，TASK-004 填充）+ `#empty`（空态）
- 底部 `#copy-actions`：`#copy-btn`（主）+ `#copy-req-btn` / `#copy-resp-btn` / `#copy-curl-btn`（P2 可选）+ `#privacy-link`
- `#toast`（`role=status aria-live=polite`）
- 所有可见文案用 `data-i18n` / `data-i18n-placeholder`，**文件内无任何汉字** → AC-016 机械可验

表头 7 列（`data-i18n` 键 → 文案）：
`col.method`(方法) / `col.url`(URL) / `col.status`(状态) / `col.resourceType`(类型) / `col.time`(耗时) / `col.size`(大小) / `col.started`(时间)

### extension/styles/panel.css

- 主题令牌（`:root` + `@media (prefers-color-scheme: dark)`）→ 深浅色基本可用
- 固定行高 `--row-height: 28px` + 共享列模板 `--col-grid`（ADR-005 虚拟滚动前置条件）
- 覆盖：工具栏 / 过滤 / 模式切换 / 列表表头（sticky） / `.row`（固定行高）/ 选中高亮 `.is-selected` / 空态 `.empty` / 复制按钮 / Toast（`data-visible` 过渡）/ 中文优先字体栈（PingFang SC → Microsoft YaHei → Noto Sans SC → …）

### extension/panel.js（UI 壳）

- `import { t } from './src/i18n.js'`
- `export const els = {...}` — 稳定 id 契约引用（TASK-004..009 依赖）
- `export function applyI18n(root)` — 注入 `data-i18n` / `-placeholder` / `-title` / `-aria-label`
- `export function showToast(message, kind)` — UI 级 Toast（不含剪贴板逻辑）
- `export function setEmptyState(visible)` / `export getCopyMode()` / `export setCopyMode(mode)`
- 启动：`applyI18n(document)` + 模式切换按钮纯视觉切换 + 空态展示
- 列表 / 过滤 / 选中 / 复制 / 大响应 / 隐私跳转 → 全部 `// TODO: wired by TASK-00X`
- 纯 ESM，零第三方依赖，无网络，无持久化

## 验证结果（真实执行）

### 1) 语法门禁 — `node scripts/check-syntax.mjs` → exit 0（含 panel.js）

```
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\devtools.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\panel.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\i18n.js
[check-syntax] 3/3 files passed
EXIT_SYNTAX=0
```

### 2) DOM 契约 + 文案门禁 — `node scripts/check-panel-shell.mjs` → exit 0

```
== check-panel-shell ==
[PASS] panel.html 存在
[PASS] panel.js 存在
[PASS] styles/panel.css 存在
[PASS] panel.html 引用 styles/panel.css
[PASS] panel.html 以 <script type="module" src="panel.js"> 加载
[PASS] 列表表头 7 列（data-i18n="col.*"）  (count=7 [col.method, col.url, col.status, col.resourceType, col.time, col.size, col.started])
[PASS] 含 id="#toolbar"
[PASS] 含 id="#search"
[PASS] 含 id="#filter-method"
[PASS] 含 id="#filter-status"
[PASS] 含 id="#filter-type"
[PASS] 含 id="#list"
[PASS] 含 id="#list-body"
[PASS] 含 id="#copy-btn"
[PASS] 含 id="#toast"
[PASS] 含 id="#mode-toggle"
[PASS] 含 id="#empty"
[PASS] 含 id="#copy-actions"
[PASS] 含 id="#privacy-link"
[PASS] 含 id="#copy-req-btn"
[PASS] 含 id="#copy-resp-btn"
[PASS] 含 id="#copy-curl-btn"
[PASS] panel.html 无裸中文（可见文案全走 data-i18n）
[PASS] panel.js 无中文字符串字面量（中文仅允许注释）  (literals=54, offending=[])
[PASS] panel.js 从 ./src/i18n.js import t
[PASS] panel.js 导出 els
[PASS] panel.js 导出 showToast 函数
[PASS] panel.js 导出 applyI18n 函数
[PASS] panel.css 定义固定行高变量 --row-height
[PASS] panel.css 含 .row 样式（虚拟滚动复用行）
[PASS] panel.css 含 .list__header 表头样式
[PASS] panel.css 含 .toast 样式
[PASS] panel.css 含 .empty 空态样式
[PASS] panel.css 含选中高亮 .is-selected
== RESULT: PASS (34/34 项) ==
EXIT_PANEL=0
```

### 3) i18n 键覆盖 — 引用键全部在 zh+en 字典中存在

```
i18n keys referenced: 21
zh+en 均存在: PASS
EXIT_I18N=0
```

### 4) CSS 括号平衡 — PASS (depth=0)

```
CSS brace balance: PASS depth=0
EXIT_CSS=0
```

## 自评

- [x] 符合 CONSTITUTION 红线（build/语法门禁 PASS + 门禁断言 PASS；零第三方依赖）
- [x] 符合 design.md ADR-002（原生 ESM）/ ADR-005（固定行高）/ ADR-010（extension/ 为根）/ D-5（渲染只允许 textContent）
- [x] 稳定 DOM 契约齐备且 id 未被改写（后续 TASK 可直接接线）
- [x] 错误处理：`showToast` 对缺失节点 guard；`els` 引用一次性建立
- [x] 文案门禁：panel.html 零裸中文 + panel.js 零中文字面量（AC-016 可机械验证）
- [x] 未越界：未创建 request-store/list-view/selection/formatter/clipboard/content.js；未改 manifest.json / devtools.js / i18n.js

## AC / REQ 对应

| 条目 | 落点 | 状态 |
|---|---|---|
| DEL-002 | panel.html + panel.js + styles/panel.css | ✅ |
| REQ-005 / AC-012 | 7 列表头（方法/URL/状态码/资源类型/耗时/大小/时间） | ✅ 机械验证 count=7 |
| REQ-012 | `#copy-btn` 主复制按钮（文案 `copy.button`） | ✅ |
| REQ-013 | `#copy-req-btn` / `#copy-resp-btn` / `#copy-curl-btn`（P2 可选，预留） | ✅ |
| REQ-033 / AC-016 | i18n 占位结构 + 中文优先；零硬编码中文 | ✅ 21 键覆盖 + 零裸中文 |

## 备注

- `scripts/check-panel-shell.mjs` 属开发期门禁工具，保留在仓库、**不进发行包**（打包白名单仅 `extension/**` + `LICENSE`，ADR-011）。
- `panel.js` 为浏览器专属入口（模块顶层读取 `document`），不设计为 Node 可 import；纯逻辑单测由 TASK-006/008 的 formatter/content 等模块承担（TASK-011 覆盖）。
- `#privacy-link` 目前为静态 `<a href="privacy.html">`；TASK-009 将改为经 `chrome.runtime.getURL('privacy.html')` 打开。
