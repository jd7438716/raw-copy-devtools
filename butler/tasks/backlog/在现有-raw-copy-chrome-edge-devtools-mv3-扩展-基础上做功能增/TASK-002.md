---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-developer
estimate: S
weight: light
covers: REQ-001 REQ-008 REQ-015 DEL-001 DEL-004 DEL-005
---

# TASK-002: 面板 DOM 容器与样式（多选工具栏 / 右键菜单 / 详情抽屉）

<!-- butler:covers REQ-001 REQ-008 REQ-015 DEL-001 DEL-004 DEL-005 -->

## 目标
在 `panel.html` 追加三组容器与在 `panel.css` 追加样式，为后续接线 TASK 提供稳定 DOM 契约（ADR-020：**既有 id 一律不改名，只追加**）。

## 涉及文件
- `extension/panel.html`（修改：新增容器，不改既有 id）
- `extension/styles/panel.css`（修改：新增样式，沿用既有 token）

## 新增 DOM 契约（design §4.4）
| 元素 id | 用途 | 关联 |
|---------|------|------|
| `#multiselect-actions` | 多选工具栏容器 | DEL-005 / REQ-008 |
| `#select-all-btn` | 「全选」按钮 | REQ-008 |
| `#copy-selected-btn` | 「复制选中(N)」按钮（N=0 禁用） | REQ-008 |
| `#selected-count` | 选中计数渲染节点 | REQ-008 |
| `#context-menu` | 自绘右键菜单容器（`role="menu"`，初始 `hidden`） | DEL-001 / REQ-001 |
| `#detail-pane` | 详情抽屉容器（`position:absolute; inset:0`，初始 `hidden`） | DEL-004 / REQ-015 |
| `#detail-body` | 详情文本 `<pre>`（`textContent` 注入） | REQ-013/014 |
| `#detail-close` | 详情关闭按钮 | REQ-015 |

## 硬约束
- **禁止裸中文**：`scripts/check-panel-shell.mjs` 禁止面板 HTML 内联中文，全部文案经 `data-i18n*`（键在 TASK-010 补齐）。
- **不得破坏** `col.*` 恰好 7 个的断言（新增文案使用非 `col.*` 键）。
- 详情抽屉为覆盖式（`position:absolute; inset:0`）；遮罩/层级样式随之。
- 样式沿用既有 token（`--row-height` 等）；`.is-selected` 已存在，仅确认集合高亮可见性。

## AC 引用
- REQ-001（右键菜单容器）、REQ-008（工具栏入口容器）、REQ-015（详情容器可关闭）——容器侧。
- DEL-001 / DEL-004 / DEL-005（结构侧）。

## 验收
- [ ] lint: PASS（`node scripts/check-panel-shell.mjs` 无裸中文、7 个 `col.*` 不破）
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 既有 id 全部保留未改名（`#list-body`/`#copy-btn`/`#toast` …）
- [ ] 三个容器初始 `hidden`；`#detail-body` 为 `<pre>`

## 备注
- 本 TASK 仅结构 + 样式，不含行为；行为由 TASK-003/005/007/009 接线。
