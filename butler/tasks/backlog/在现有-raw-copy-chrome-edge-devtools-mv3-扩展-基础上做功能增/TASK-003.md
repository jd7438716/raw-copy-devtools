---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-001, TASK-002
agent: butler-developer
estimate: M
weight: heavy
covers: REQ-006 REQ-007 AC-004 US-002
---

# TASK-003: panel.js 多选接线（集合高亮 / 点击键盘 / 剪枝淘汰 / 工具栏状态）

<!-- butler:covers REQ-006 REQ-007 AC-004 US-002 -->

## 目标
把 `panel.js` 的选中来源从 `createSelection` 切换到 `createMultiSelection`（ADR-012 唯一契约切换点），并完成点击/键盘/剪枝/淘汰/高亮/工具栏计数的全部接线。

## 涉及文件
- `extension/panel.js`（修改）

## 接线点（行号为当前磁盘值，tech-eval ENH-002）
- (a) `L26` import 由 `createSelection` → `createMultiSelection`。
- (b) `L508-517` 创建 multi 实例；`L518` `activeSelection = multi`。
- (c) `L416-419` `renderRow` 高亮：`activeSelection.current() === rec.id` → **`activeSelection.has(rec.id)`**（集合判定，CIA A-2）。
- (d) `L510-516` `onChange`：集合/主选变化 → `virtualList.refresh()` + 计数渲染 + 复制按钮使能（扩展既有 `setCopyButtonsEnabled L438-445` 为"选中集合非空"）。
- (e) `L586-590` `refreshView` 的 `selection.setIds` → `multi.setIds`（剪枝保留可见项，ADR-018）。
- (f) `L624-643` `onListBodyClick`：读 `event.ctrlKey/metaKey/shiftKey` → `toggleAt` / `rangeTo`；无修饰 → `selectAt`（ADR-014）。
- (g) `L646-659` `onListKeyDown`：`selection.move` → `multi.move`（内部**清空集合**回落单选，REQ-007）。
- (h) `L696-702` store 事件 `onEvict`/`reset` → `multi.onEvict` / `multi.reset`（两条淘汰路径都要处理）。
- (i) 新增 `wireMultiToolbar()`：`#select-all-btn` → `multi.selectAll()`；`#selected-count` 渲染 `count()`；`#copy-selected-btn` 使能（N=0 禁用）——批量动作本体在 TASK-005。

## 硬约束
- `renderRow` 集合变化**必须**触发 `virtualList.refresh()`，否则滑出窗口再滑回的行高亮丢失。
- `refreshView` 注入的是 `display.map(r=>r.id)` 可见序列；`setIds` 保留"仍可见"选中、剔除不可见（与"全选=可见列表"一致，A-1/A-2）。
- **禁止改动**冻结模块；本 TASK 只改 `panel.js`。

## AC 引用
- **AC-004**：Ctrl/Cmd 切换、Shift 范围、单击单选、↑↓ 单选移动四者互不破坏（端到端）。
- 关联 REQ-006/007、US-002。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] test: PASS（既有 `tests/render.test.mjs` 等回归；`tests/multiselection.test.mjs`）
- [ ] lint: PASS（`node scripts/check-panel-shell.mjs` 无裸中文；`check-zero-network.mjs` 无网络/存储关键字）
- [ ] 手工/单测断言：单击→{1}；Ctrl→{1,3}；Shift→可见闭区间；↑↓→清空集合并单选移动
- [ ] 断言：行滑出可视窗口再滑回，选中态保持
- [ ] 断言：过滤变化/淘汰后集合剪枝、计数 N 实时收敛

## 依赖
- TASK-001（`multiselection.js` 接口）、TASK-002（`#multiselect-actions` DOM）。
