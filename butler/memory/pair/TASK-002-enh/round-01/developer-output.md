# developer-output — Round 1 (增强里程碑 TASK-002)

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> 模式: 直接 backlog 任务（无 frame，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> covers: REQ-001 REQ-008 REQ-015 DEL-001 DEL-004 DEL-005
> 设计真源: design §4.4（新增 DOM 元素契约）+ ADR-020（既有 id 只追加不改名）
> 路径说明: 基线里程碑已有 `pair/TASK-002/round-01/developer-output.md`（面板外壳）；为避免覆盖基线证据，本增强交付写入 `pair/TASK-002-enh/`。

## 模块: 面板新增 DOM 容器与样式（多选工具栏 / 右键菜单 / 详情抽屉）

- `extension/panel.html`（**edit，追加**）— 3 组新容器 + 8 个新 id；既有 16 个 id 一律未改名
- `extension/styles/panel.css`（**edit，追加**）— 新组件样式；`#app` 设为定位上下文；沿用既有 token

## 实现摘要

### extension/panel.html（结构，零裸中文）

新增 DOM（design §4.4 契约，全部初始 `hidden` 或由后续 TASK 填充）：

| 元素 id | 元素 | 关键属性 | 关联 |
|---------|------|----------|------|
| `#multiselect-actions` | `<div>` | `class="multiselect" role="group" hidden` | DEL-005 / REQ-008 |
| `#select-all-btn` | `<button>` | `data-i18n="multi.selectAll"` | REQ-008 |
| `#copy-selected-btn` | `<button>` | `data-i18n="multi.copySelected" disabled`（N=0 禁用） | REQ-008 |
| `#selected-count` | `<span>` | `aria-live="polite" data-i18n="multi.selectedCount"` | REQ-008 / AC-005 |
| `#context-menu` | `<div>` | `class="context-menu" role="menu" tabindex="-1" hidden`（TASK-007 填充） | DEL-001 / REQ-001 |
| `#detail-pane` | `<section>` | `class="detail-pane" role="dialog" aria-modal="true" hidden` | DEL-004 / REQ-015 |
| `#detail-body` | `<pre>` | `class="detail-pane__body"`（TASK-009 用 `textContent` 注入） | REQ-013/014 |
| `#detail-close` | `<button>` | `data-i18n="detail.close"` | REQ-015 |

- 多选工具栏置于 `#toolbar` 内（`.toolbar__row` 之后的第二行）。
- `#context-menu` / `#detail-pane` 置于 `#app` 内、`#toast` 之前。
- 详情抽屉附加 `.detail-pane__backdrop`（`data-detail-backdrop`）作为「点击遮罩关闭」的稳定钩子（TASK-009 消费）。
- 所有新增可见文案均经 `data-i18n`（键由 TASK-010 补齐）；HTML 内无任何汉字。

### extension/styles/panel.css

- `.app { position: relative; }` — 为 `#detail-pane`（absolute inset:0）提供定位上下文（对既有布局无副作用：`.toast` 为 `fixed`，`#empty` 在已定位的 `.list` 内）。
- `.multiselect` — 工具栏第二行（flex + 虚线分隔），`.multiselect[hidden]{display:none}`，`.multiselect__count` 等宽数字。
- `.context-menu` — `position: fixed; z-index: 90`（视口坐标，配合 TASK-007 `clampPosition`）；`[hidden]` 隐藏；附 `.context-menu__item` / `.context-menu__sep` 供 TASK-007 使用。
- `.detail-pane` — **`position: absolute; inset: 0; z-index: 80`** 覆盖式抽屉 + 半透明遮罩；`[hidden]` 隐藏；`.detail-pane__surface`（solid 面板，margin 12px 形成可点击遮罩环）、`.detail-pane__header`、`.detail-pane__body`（`<pre>` 等宽、`white-space: pre`、`overflow:auto`）。
- `.row.is-selected:hover { background: var(--bg-selected); }` — 确认集合高亮在 hover 下仍可见（既有 `.row.is-selected` 保留未改）。
- 沿用既有 token：`--row-height` / `--bg` / `--bg-subtle` / `--bg-hover` / `--bg-selected` / `--fg` / `--fg-muted` / `--border` / `--accent`。

## 验证结果（真实执行）

### 1) build/语法门禁 — `node scripts/check-syntax.mjs` → exit 0

```
[PASS] ... extension/panel.js
[PASS] ... extension/src/*.js  (共 11 个)
[check-syntax] 11/11 files passed
exit=0
```

### 2) lint/DOM+文案门禁 — `node scripts/check-panel-shell.mjs` → exit 0（PASS 34/34）

```
[PASS] 列表表头 7 列（data-i18n="col.*"）  (count=7)
[PASS] 含 id="#list-body" ... 含 id="#copy-btn" ... 含 id="#toast" ...
[PASS] panel.html 无裸中文（可见文案全走 data-i18n）
== RESULT: PASS (34/34 项) ==
exit=0
```

### 3) 零网络/零持久化 — `node scripts/check-zero-network.mjs` → exit 0（PASS 17/17）

```
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
exit=0
```

### 4) 追加的显式断言（Node 读盘）

```
HAN chars in panel.html: 0
multiselect-actions tag -> <div id="multiselect-actions" class="multiselect" role="group" hidden>   has hidden: true
context-menu tag -> <div id="context-menu" class="context-menu" role="menu" tabindex="-1" hidden>   has hidden: true
detail-pane tag -> <section id="detail-pane" ... aria-modal="true" hidden>                         has hidden: true
#detail-body tag -> <pre id="detail-body" class="detail-pane__body"></pre>
既有 16 id：OK ×16（toolbar/search/filter-method/filter-status/filter-type/list/list-body/copy-btn/toast/mode-toggle/empty/copy-actions/privacy-link/copy-req-btn/copy-resp-btn/copy-curl-btn）
col.* 计数：7
CSS brace balance: 0（min 0）；--row-height/--bg-selected/--border/--fg-muted/--bg-hover/--bg-subtle 均存在
.app position:relative → true；#detail-pane absolute inset:0 → true
```

## 自评

- [x] 符合 CONSTITUTION 红线（build=check-syntax PASS；lint=check-panel-shell PASS；零第三方依赖/零网络）
- [x] 符合 ADR-020：既有 id 一律未改名，仅追加（16 个既有 id 逐个校验通过）
- [x] 符合 design §4.4：8 个新 id 全部落位；三个容器初始 `hidden`；`#detail-body` 为 `<pre>`
- [x] 符合 ADR-013/017：菜单纯 DOM（`role="menu"`，无 `chrome.contextMenus`）；详情覆盖式 `absolute; inset:0`
- [x] 文案门禁：HTML 零裸中文；新增键使用 `multi.*` / `detail.*`（非 `col.*`，7 列断言不破）
- [x] 未越界：未改 `panel.js`、未改 `i18n.js`、未改 manifest；未实现任何行为逻辑（TASK-003/005/007/009 职责）

## 契约交接（供下游 TASK）

| TASK | 交付的容器 / 钩子 |
|------|-------------------|
| TASK-003 | `#multiselect-actions`（默认 hidden，需自行按选中态显示）、`#select-all-btn`、`#selected-count` |
| TASK-005 | `#copy-selected-btn`（初始 `disabled`，由选中集合使能） |
| TASK-007 | `#context-menu`（`role="menu"`，TASK-007 用 `textContent` 填项 + `position:fixed` 定位） |
| TASK-009 | `#detail-pane` / `#detail-body`（`<pre>`）/ `#detail-close` / `.detail-pane__backdrop[data-detail-backdrop]` |
| TASK-010 | 待补 i18n 键：`multi.selectAll` / `multi.copySelected` / `multi.selectedCount` / `detail.title` / `detail.close` |

## 备注

- `#multiselect-actions` 初始 `hidden` 是 TASK-002 的显式契约；其显示时机（进入多选态/有数据时）由 TASK-003/005 决定，本任务不引入行为。
- `data-i18n="multi.selectedCount"` 在 TASK-010 补键前 `t()` 会回退为 key 字符串并打印 `[E_I18N_MISSING_KEY]` 告警；因容器初始 `hidden`，用户不可见，且 TASK-010 会补齐键——**非缺陷**。
- CSS 增设 `.context-menu__item` / `.context-menu__sep` 供 TASK-007 复用；若 TASK-007 采用不同类名，这些规则为惰性无副作用。
