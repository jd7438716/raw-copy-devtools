---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-003, TASK-004
agent: butler-developer
estimate: S
weight: standard
covers: REQ-008 REQ-009 DEL-005 AC-005 AC-006 AC-014 US-002
---

# TASK-005: panel.js 批量复制入口 `copySelection`（含一次阈值确认）

<!-- butler:covers REQ-008 REQ-009 DEL-005 AC-005 AC-006 AC-014 US-002 -->

## 目标
在 `panel.js` 接线工具栏批量入口与批量复制主流程，复用冻结的 `buildCopyText`（经 `bulkformatter`）与既有 `clipboard.copyText`。

## 涉及文件
- `extension/panel.js`（修改）

## 接线点（tech-eval ENH-002）
- (j) 新增 `copySelection(mode)`：
  - `N === 0` → `showToast(t('copy.hintSelect'))`（复用既有文案）。
  - **批量大响应**：ADR-016 **一次 confirm 覆盖本批**——批内任一条 `isOverThreshold` → **一次** `confirm`（文案含超限条数与最大体积）；取消则整批不复制 + `t('copy.cancelled')`（R-B：默认新增 `multi.largeConfirm`）。
  - 调用 `buildBulkCopyText(按可见序的选中记录, mode, resolveResponseBodyText)` → `copyText` → 成功/失败 Toast（复用 `L800-805`）。
  - 返回 `{ok, count, reason}`（design §4.3）。
- (l) `L836-846` default export **追加** `getSelectedIds` / `copySelection`（追加式，ADR-020，不改既有 9 项导出）。
- 与 `wireMultiToolbar()`（TASK-003）对接：`#copy-selected-btn` → `copySelection()`；`#selected-count` 显示 N 且实时更新。

## 硬约束
- 批量输出**必须**经 `bulkformatter`（TASK-004），**不得**在 panel 内重写拼接。
- `buildCurrentCopy`（`L178-185`）**保持单选语义不变**（AC-007 冻结路径）——批量 N=1 也委托单选路径（由 bulkformatter 保证）。
- **禁止**在批量路径引入网络/存储关键字（check-zero-network）。

## AC 引用
- **AC-005**：点击「全选」后当前列表全选；「复制选中(N)」的 N 等于当前选中条数且实时更新。
- **AC-006**：多选输出含 N 段，段间清晰分隔，无混淆（端到端）。
- **AC-014**：大响应阈值提示在批量场景下"一次确认覆盖本批"（ADR-016）。
- 关联 REQ-008/009、DEL-005、US-002。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] test: PASS（`tests/bulkformatter.test.mjs` + 既有回归）
- [ ] lint: PASS（`check-zero-network.mjs` 无网络/存储关键字）
- [ ] 断言：N=0 → 复制选中按钮禁用、点击无操作
- [ ] 断言：N≥2 → 输出恰 N 段、段序 = 可见列表序
- [ ] 断言：N=1 → 经批量入口输出与单选逐字符一致
- [ ] 断言：批内含超阈值 → 仅弹一次 confirm；取消整批不复制

## 依赖
- TASK-003（多选集合与工具栏接线）、TASK-004（`bulkformatter.js`）。
