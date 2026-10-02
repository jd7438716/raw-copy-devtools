---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: N/A
agent: butler-rf-fixer
estimate: S
weight: light
covers: DEL-005 DEL-006 REQ-006 AC-007
---

# TASK-005: `panel.html` + `styles/panel.css` — 模式 A/B 双按钮、删 toggle、删分段按钮

<!-- butler:covers DEL-005 DEL-006 REQ-006 AC-007 -->

## 目标
把「先切换再复制」的 `#mode-toggle` 改为**动作即模式**的两个独立按钮（模式 A / 模式 B），并移除底部 P2 分段按钮 `#copy-req-btn` / `#copy-resp-btn` 及其样式。纯结构与样式，无逻辑。

## 涉及文件
- `extension/panel.html`（修改）
- `extension/styles/panel.css`（修改）

## 冻结/禁止
- **禁止**在 HTML 中出现任何裸中文/裸文案（全部走 `data-i18n`，check-panel-shell 项 5）。
- **禁止**新造 CSS 变量；沿用既有 token。
- 保留 `#copy-btn`（主「复制请求 + 响应（原始）」）、`#copy-curl-btn`、`#privacy-link`、`#context-menu`、多选工具栏 id。

## 实施要点
1. `panel.html`：
   - 工具栏删除 `#mode-toggle`（`:70-74`）。
   - 底部复制区（`:126-133`）：新增 `#copy-btn-a` / `#copy-btn-b`（`data-copy-mode="A"` / `"B"`，`data-i18n="mode.aButton"` / `"mode.bButton"`）；删除 `#copy-req-btn` / `#copy-resp-btn`；保留 `#copy-btn`。
   - 更新 `:121-125` 注释。
2. `styles/panel.css`：删除 `.mode-toggle*`（`:111,148,161,165,169,173` 附近）；为 `.copy-actions .btn[data-copy-mode]` 或 `.copy-mode-btn` 增加与既有 `.btn` 一致的样式（不新造变量）。
3. 保持 7 列表头、稳定 id 集合不变（除本 TASK 增删者）。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-005 | `panel.html` 新增 A/B 独立按钮，移除 `#mode-toggle` 与 `#copy-req-btn/#copy-resp-btn` |
| DEL-006 | `panel.css` 删除 toggle 样式、新增模式按钮样式（沿用 token） |
| REQ-006 | 复制模式 A/B 各提供独立按钮（动作即模式） |
| AC-007 | DOM 层存在 A/B 两按钮、无 toggle 残留 |

## 验收
- [ ] lint/build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 无裸中文（HTML 全 `data-i18n`）
- [ ] 稳定 id：`#copy-btn-a`/`#copy-btn-b` 存在；`#mode-toggle`/`#copy-req-btn`/`#copy-resp-btn` 不存在
- [ ] 样式：无 `.mode-toggle` 规则残留

## 备注
- 键名契约：`mode.aButton` / `mode.bButton`（由 TASK-006 在 i18n.js 定义，zh/en 对齐）；`title` 由 TASK-007 用 `mode.aHint`/`mode.bHint` 注入。
- 下游 TASK-007（接线）与 TASK-011（门禁 id 清单）依赖本 TASK 的 id 契约。
