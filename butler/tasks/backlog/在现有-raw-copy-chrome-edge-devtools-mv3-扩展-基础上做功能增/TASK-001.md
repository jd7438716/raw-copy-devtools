---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-developer
estimate: M
weight: heavy
covers: REQ-006 REQ-007 DEL-002 AC-004 US-002
---

# TASK-001: selection 多选组合包装模块 `multiselection.js` + 单测

<!-- butler:covers REQ-006 REQ-007 DEL-002 AC-004 US-002 -->

## 目标
新增 `extension/src/multiselection.js`，以**组合式包装**方式在既有 `selection.js` 之上叠加多选集合能力（ADR-012）：内部持 `createSelection` 作单选核心，外层维护 `Set<id>` + `anchorId`。
**本 TASK 为本次增强最高回归风险点（design §11 排 T2 先做），也是唯一允许触碰选中语义的落点。**

## 涉及文件
- `extension/src/multiselection.js`（新增）
- `tests/multiselection.test.mjs`（新增）

## 冻结/禁止
- **禁止修改** `extension/src/selection.js`（字节冻结，AC-007 / ADR-012）。
- **禁止修改** `extension/src/formatter.js`。
- 纯逻辑、零浏览器 API、零第三方依赖，Node 可直测。

## 接口契约（design §4.2）
`createMultiSelection({ids, onChange})` →
`{ selectAt(i), toggleAt(i), rangeTo(i), selectAll(), clear(), move(d), current(), selectedIds(), has(id), count(), setIds(ids), onEvict(id), ids(), size() }`

精确语义（ADR-014/015/018）：
- `selectAt(i)`：替换集合 = `{id_i}`，`anchor = id_i`，回落单选。
- `toggleAt(i)`：集合中存在则删、否则加；更新 anchor。
- `rangeTo(i)`：以 anchor 为起点、按**可见列表顺序**闭区间；自动跳过不可见项。
- `selectAll()`：选中当前 `ids` 全部（可见范围基准，A-1/A-2）。
- `move(d)`：**清空集合**，委托 `primary.move(d)`（↑↓ 仍为单选移动，REQ-007）。
- `setIds(ids)`：集合剪枝——移除不在新可见列表的 id（ADR-018）。
- `onEvict(id)`：移除被淘汰 id + `primary.onEvict(id)`（N 实时更新）。
- `current()` 委托 `primary.current()`（供既有 `renderRow` 主高亮复用）。
- `has(id)` 供集合高亮；`count()` 供工具栏计数。

## AC 引用
- **AC-004**：Ctrl/Cmd 切换、Shift 范围、单击单选、↑↓ 单选移动四者互不破坏（模块层语义）。
- 关联 REQ-006（多选交互）、REQ-007（保留单击/↑↓）、DEL-002。

## 验收
- [ ] lint: PASS（纯原生 ESM，无外部 import）
- [ ] test: PASS（`tests/multiselection.test.mjs`）
  - [ ] selectAt 替换集合且回落单选
  - [ ] toggleAt 增/删 + anchor 更新
  - [ ] rangeTo 可见闭区间、跳过不可见/已淘汰项
  - [ ] move 清空集合后委托单选移动
  - [ ] selectAll = 当前 ids 全部
  - [ ] setIds 剪枝保留仍可见项、剔除不可见项
  - [ ] onEvict 移集 + 计数实时更新
  - [ ] count/has/current 一致性
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 回归: `tests/selection.test.mjs`（13 用例）零改动 PASS

## 备注
- `selection.js` 零改动是 AC-007 的前提；本 TASK 完成即锁定该结论。
- 集合真源为 `recordId`（非行索引/DOM），天然规避虚拟滚动回收（feasibility R-05/R-07）。
