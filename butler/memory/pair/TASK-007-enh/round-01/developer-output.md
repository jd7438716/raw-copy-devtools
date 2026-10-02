# developer-output — TASK-007-enh Round 01

> 里程碑: 在现有 Raw Copy（Chrome/Edge DevTools MV3）基础上做功能增强
> 任务: TASK-007 — `panel.js` 右键菜单接线（含 P2 仅请求 / 仅响应）
> 依据: design.md §4.2/§4.3、ADR-013/014/020、§10.5 未覆盖项
> 日期: 2026-10-02 | 角色: butler-developer

## 改动文件

| 文件 | 类型 | 说明 |
|------|------|------|
| `extension/panel.js` | 修改 | 右键菜单接线 + P2 分段裁剪 + `openContextMenu` 导出 + 主路径函数重命名 |
| `extension/styles/panel.css` | 修改（1 行注释） | 改述注释去掉 `chrome.contextMenus` 字面量（门禁假阳性，AC-012） |

未改动：`panel.html`（容器已就绪）、`contextmenu.js` / `formatter.js` / `selection.js`（冻结）、
`i18n.js`（键交 TASK-010）。

## 实现要点

### 1. 装配（`init()` 内新增段落）

- `import { resolveRowId, createMenuModel, clampPosition, CTX_ACTION } from './src/contextmenu.js'`
- `import { ..., REQUEST_SECTION, RESPONSE_SECTION } from './src/formatter.js'`（复用既有导出，不改冻结模块）
- `els.contextMenu = document.querySelector('#context-menu')`
- `wireContextMenu()`：`els.listBody.addEventListener('contextmenu', onContextMenu)`；菜单容器上 `mousedown/click/contextmenu` 冒泡隔离。

### 2. `onContextMenu(event)`

1. `event.preventDefault()`（屏蔽原生菜单）；
2. `resolveRowId(event, els.listBody)` → 未命中（表头/空白/未渲染行）→ **直接 return**（`E_CTX_NO_TARGET` 语义，不弹、不改集合、不抛）；
3. 命中行 → 用行 `data-index` 调 `multi.selectAt(index)`（**右键即单选替换**，ADR-014）；`data-index` 缺失时回退按 `multi.ids().indexOf(rowId)` 定位；
4. `openMenuAt(event)` 渲染并定位菜单。

### 3. 渲染与定位

- 菜单项来自 `createMenuModel({ hasSelection, count: multi.count(), canCopyRequestOnly: copyMode === MODE_A })`；
- 逐项 `document.createElement('button')` + `textContent = t(item.i18nKey, item.vars)`，**全链路零 `innerHTML`**；子项 id = `CTX_ITEM_ID`（`copy-request-response` 等），`data-action` = `CTX_ACTION`；
- `clampPosition({x: event.clientX, y: event.clientY, w: offsetWidth||0, h: offsetHeight||0, vw, vh})` → 写 `menu.style.left/top`，`menu.hidden = false`。

### 4. 隔离与关闭

- 菜单在 `#context-menu`（`#list-body` 的兄弟节点），菜单点击**不会**冒泡进 `#list-body` 的 click 委托；另在容器与菜单项上 `stopPropagation` 双保险；
- 关闭时机：`Esc`、菜单外 `mousedown`、`#list` 滚动、`window blur`；关闭时 `hidden=true` + 清空全部子节点 + 解绑文档级监听（幂等，无残留）；
- 键盘：`ArrowUp/Down` 跳过禁用项移动高亮（聚焦），`Enter` 激活，`Esc` 关闭；打开时聚焦首个可用项。

### 5. 复制动作同源（AC-002）

- 原 `onCopyClick` 重命名为 `runCurrentCopy()`（pending 等待 / 大响应 `confirmLargeCopy` / `copyText` / Toast 逻辑一字未改）；
- `#copy-btn` 与**菜单主项**均调用 `runCurrentCopy()` → 两模式产物逐字符等价；
- `count >= 2` 时菜单追加「复制选中(N)」→ 调用既有 `copySelection(copyMode)`（TASK-005）。

### 6. P2 仅请求 / 仅响应（R-A 裁决，采纳 P-A）

- 用 `formatter` 导出的段标记常量对 `buildCurrentCopy(MODE_A)` 输出做**逐字符裁剪**：`extractSectionText()` 按行取 `[REQUEST_SECTION, RESPONSE_SECTION)` / `[RESPONSE_SECTION, end)`，仅去除 formatter 段间插入的尾部空行，正文码元不改；
- 模式 A：菜单 P2 项与 `#copy-req-btn`/`#copy-resp-btn` **共用 `runSectionCopy()`** → 产物等价（AC-003）；
- 模式 B（无段标记）：`buildSectionCopy` 返回 null；菜单项由 `createMenuModel` 的 `canCopyRequestOnly=false` 置**禁用**，按钮点击 `showToast(copy.notEnabled)`；记为 backlog（design §10.5 非阻塞）；
- 仅响应超阈值时复用 `confirmLargeCopy`（REQ-022）。

### 7. 追加式导出（ADR-020）

- 新增 `export function openContextMenu(event)`（注入点模式，面板未启动安全 no-op），default export 由 11 项 → **12 项**；既有导出名/既有 DOM id 全未改。

## 自验原始输出

### CMD1 — `rg -n "chrome\.contextMenus" extension/`（要求 0 命中）

```text
$ rg -n "chrome\.contextMenus" extension/
（无输出，exit=1 → 0 命中）
```

### CMD2 — `rg -n "innerHTML" extension/panel.js`（要求 0 命中）

```text
$ rg -n "innerHTML" extension/panel.js
（无输出，exit=1 → 0 命中）
```

> 说明：原文 line 490 注释「禁止 innerHTML」为 TASK-004 遗留，属门禁字面量命中；
> 已改述为「禁止以 HTML 字符串注入」，语义不变。

### CMD3 — `node scripts/check-syntax.mjs`

```text
[PASS] .../extension/devtools.js
[PASS] .../extension/panel.js
[PASS] .../extension/src/{bulkformatter,capture,clipboard,content,contextmenu,detail,filter,formatter,i18n,multiselection,render,selection,store}.js
[check-syntax] 15/15 files passed
[exit 0]
```

### CMD4 — `node scripts/check-panel-shell.mjs`

```text
== check-panel-shell ==
...（34 项逐条 PASS：DOM 契约 id / 7 列表头 / HTML 零裸中文 / JS 零中文字面量 / i18n 接线 / CSS 关键样式）
== RESULT: PASS (34/34 项) ==
[exit 0]
```

### CMD5 — `node scripts/check-zero-network.mjs`

```text
...（17 项逐条 PASS：fetch/XHR/WebSocket/sendBeacon/chrome.storage/localStorage/sessionStorage/indexedDB/chrome.runtime.connect/analytics/telemetry/gtag/mixpanel/sentry/amplitude/posthog）
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
[exit 0]
```

### CMD6 — `node --test "tests/**/*.test.mjs"`（全量回归）

```text
ℹ tests 261
ℹ suites 0
ℹ pass 261
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 707.3232
[exit 0]
```

### CMD7 — 静态接线核查

```text
$ rg -n "onContextMenu|wireContextMenu|createMenuModel|clampPosition|resolveRowId|copySelection|openContextMenu" extension/panel.js
38:  resolveRowId,
39:  createMenuModel,
40:  clampPosition,
168:export function copySelection(mode) {
192:export function openContextMenu(event) {
1122:  copySelectionImpl = runCopySelection;
1484:    const items = createMenuModel({
1492:    const pos = clampPosition({
1513:  function onContextMenu(event) {
1520:    const rowId = resolveRowId(event, els.listBody);
1538:  function wireContextMenu() {
1540:      els.listBody.addEventListener('contextmenu', onContextMenu);
1584:  openContextMenuImpl = onContextMenu;
1585:  wireContextMenu();
1611:  copySelection,
1612:  openContextMenu,
```

### CMD8 — 临时 headless harness（零依赖手写 DOM 桩；跑完即删，未留仓库文件）

```text
$ node _tmp_ctx_harness.mjs
[PASS] AC-001 right-click row -> select + menu (items=3)
[PASS] AC-002 menu main === #copy-btn (A len=258, B len=103)
[PASS] blank/header right-click -> no menu, no throw, set unchanged
[PASS] AC-003 P2 trim (req=65, resp=93) menu===buttons
[PASS] close paths (Esc / outside / scroll / blur) no residue
[PASS] openContextMenu(event) additive export works

ALL HARNESS ASSERTIONS PASSED
[exit 0]
```

Harness 覆盖（真实加载 `panel.js`，经 `chrome.devtools.network.onRequestFinished` 注入 2 条记录 → 虚拟列表渲染 → 派发真实 `contextmenu`）：

1. 命中行右键 → 行 `is-selected` + 菜单显示（主项 + P2×2）；
2. 菜单主项产物 === `#copy-btn` 产物（模式 A、模式 B 分别断言，且确认 A≠B）；
3. 表头/空白右键 → 菜单不显示、无异常、选中集合不变；
4. P2 裁剪：`request-only` 以 `===== REQUEST =====` 开头且不含 RESPONSE/META，`response-only` 以 `===== RESPONSE =====` 开头；菜单项产物 === 对应按钮产物；且均为全量模式 A 产物的**逐字符子串**；
5. 关闭路径 Esc / 菜单外 mousedown / #list scroll / window blur → `hidden=true` 且子节点清零；
6. 新增导出 `openContextMenu(event)` 可独立打开菜单。

（`[E_I18N_MISSING_KEY]` 告警为预期：`contextmenu.*` / `multi.*` 键由 TASK-010 补齐，`t()` 按契约回退为键名。）

## 结论

- lint：`chrome.contextMenus` 0 命中、`panel.js` `innerHTML` 0 命中 ✅
- build：`check-syntax` 15/15 PASS ✅
- 外壳/零网络门禁：34/34、17/17 PASS ✅
- 全量回归：261/261 PASS，0 失败 ✅
- 静态接线 + 临时 headless 集成 harness 全断言 PASS ✅
- 冻结模块（formatter/selection/contextmenu/i18n/panel.html）零编辑；既有 id / 既有导出名未改 ✅

## 遗留项（backlog）

1. **P2 模式 B**：模式 B 无段标记，菜单 P2 两项禁用、按钮提示 `copy.notEnabled`（design §10.5 声明 P2 非发布阻塞）。若后续需要模式 B 的「仅请求/仅响应」，需裁决输出口径（例如剥离模式 B 的响应块），本任务不做。
2. **i18n 键交 TASK-010**：`contextmenu.copyRequestResponse` / `contextmenu.copySelected` /
   `contextmenu.copyRequestOnly` / `contextmenu.copyResponseOnly`（zh/en 键集相等）。
   接线期 `t()` 回退为键名（可读、不抛），已在 harness 中观察到预期告警。
3. **键盘可达性**已在代码中实现（↑↓/Enter/Esc），harness 仅覆盖 Esc 关闭；E2E/可访问性细项可留 TASK-016 验证。
4. **`chrome.contextMenus` 全仓门禁**：本任务已消除 `panel.css` 注释假阳性，全仓 `extension/` 现 0 命中。

## tech_debt

```yaml
tech_debt:
  - location: "extension/panel.js (runSectionCopy)"
    issue: "P2 分段复制在模式 B 下不可用（无段标记），仅提示 notEnabled"
    risk: "模式 B 用户无法使用仅请求/仅响应，功能不完整（非发布阻塞）"
    priority: "P3"
    suggestion: "如需支持，定义模式 B 的分段口径后扩展 extractSectionText 或增加专用 formatter 段构造"
```

## risks

```yaml
risks:
  - description: "contextmenu.* / multi.* i18n 键在 TASK-010 落地前，菜单文案显示为键名"
    probability: "高"
    impact: "低"
    mitigation: "t() 可读回退（非崩溃）；TASK-010 补齐键后自动生效"
    category: "流程"
```
