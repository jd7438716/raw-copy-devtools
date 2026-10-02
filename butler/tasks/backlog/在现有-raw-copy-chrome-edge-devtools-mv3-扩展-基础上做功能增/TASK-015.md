---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-002
agent: butler-developer
estimate: S
weight: light
covers: DEL-007 REQ-001 REQ-015
---

# TASK-015: 面板契约门禁增强（`check-panel-shell.mjs` requiredIds 追加）

<!-- butler:covers DEL-007 REQ-001 REQ-015 -->

## 目标
（**可选增强**，R-D）在 `scripts/check-panel-shell.mjs` 的 `requiredIds` 中追加本次新增 DOM id 断言，使结构契约可被门禁自动守住。

## 涉及文件
- `scripts/check-panel-shell.mjs`（修改：`requiredIds` 追加）

## 追加 id
`#context-menu`、`#multiselect-actions`、`#select-all-btn`、`#copy-selected-btn`、`#selected-count`、`#detail-pane`、`#detail-body`、`#detail-close`。

## 硬约束
- **非必需**：不追加也不致 FAIL（tech-eval R-D）；追加属增强。
- 不得破坏既有断言（7 个 `col.*`、无裸中文、既有 requiredIds）。
- 脚本零依赖、零网络。

## AC 引用
- DEL-007（门禁侧）。
- 结构契约：REQ-001（`#context-menu`）、REQ-015（`#detail-pane`/`#detail-close`）。

## 验收
- [ ] lint: PASS（`node scripts/check-panel-shell.mjs` 在正确 shell 下 PASS）
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 断言：缺失任一新增 id 时脚本 FAIL（门禁生效）
- [ ] 断言：既有 requiredIds 与 7 个 `col.*` 断言不破

## 依赖
- TASK-002（新增 DOM id 已落地）。
