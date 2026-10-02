---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-008, TASK-002, TASK-007
agent: butler-developer
estimate: M
weight: standard
covers: REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 DEL-004 AC-008 AC-009 AC-010 AC-011 US-003
---

# TASK-009: panel.js 双击详情接线（含 P2 详情内复制 + 淘汰自动关闭）

<!-- butler:covers REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 DEL-004 AC-008 AC-009 AC-010 AC-011 US-003 -->

## 目标
监听 `#list-body` 的 `dblclick`，打开覆盖式详情抽屉 `#detail-pane`，用 `#detail-body`（`textContent`）展示该条记录六要素原文；提供关闭返回与淘汰失效联动。

## 涉及文件
- `extension/panel.js`（修改）

## 接线点（tech-eval ENH-003）
- (a) import `detail` 导出。
- (b) `els` 追加 `detailPane` / `detailBody` / `detailClose`。
- (c) `wireDetail()`：`els.listBody.addEventListener('dblclick', onRowDblClick)` → `resolveRowId`（**复用 TASK-006/007 的 `contextmenu.resolveRowId`**，避免重复命中逻辑）→ `openDetail(id)`。
  - ADR-014：双击前必发一次 `click`（该行已被单选替换），双击**不再改动集合**；不得在 `dblclick` 里 `stopPropagation` 误伤选中。
- (d) 关闭：`#detail-close` click / `Esc` / 点击遮罩 → `closeDetail()`。
- (e) 淘汰失效：在既有 `store.subscribe`（`L689-703`）中，若 `evicted === detailRecordId` → **自动关闭** + `t('detail.evicted')`（ADR-018）。
- (f) 详情响应体口径复用 `L152-167 resolveResponseBodyText`（pending/binary/base64 一致，AC-014）。
- (g) 新增导出 `openDetail(id)` / `closeDetail()`（§4.3，ADR-020 追加式）。
- **P2**「复制请求+响应」按钮（REQ-017）：复用 `buildCurrentCopy`，产物与主按钮一致；复制不关闭明细。

## 硬约束
- `#detail-body` 必须 `textContent` 注入（**禁止 `innerHTML`**）。
- 详情文本口径 = `buildDetailText`（模式 A），**不随面板 A/B 切换而变**（A-4）。
- 不改既有 id（ADR-020）。

## AC 引用
- **AC-008**：双击打开明细，含六要素。
- **AC-009**：响应体逐字符等于原始、头保持原始顺序、不缩进/排序/Markdown。
- **AC-010**：明细可关闭返回列表；单击仅选中、不打开明细（仅双击打开）。
- **AC-011**：明细「复制请求+响应」按钮（P2）产物与主复制按钮一致。
- 关联 REQ-013/014/015/016/017、DEL-004、US-003。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] lint: PASS（无 `innerHTML`；无裸中文）
- [ ] 断言：双击行 → `#detail-pane` 打开，六要素按顺序呈现
- [ ] 断言：详情响应体逐字符 === 原始响应体；模式切换不影响明细
- [ ] 断言：关闭按钮 / Esc / 遮罩 → 关闭返回，列表与滚动位置保持
- [ ] 断言：单击行不打开明细
- [ ] 断言：打开中记录被淘汰 → 自动关闭 + `detail.evicted`，无异常
- [ ] P2：明细内复制 === 主按钮产物（若实现）

## 依赖
- TASK-008（`detail.js`）、TASK-002（`#detail-pane` DOM）、TASK-007（复用 `resolveRowId`）。
