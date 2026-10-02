---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-001 TASK-002
agent: butler-rf-fixer
estimate: M
weight: heavy
covers: DEL-001 REQ-001 REQ-002 REQ-003 REQ-012 AC-001 AC-002 AC-003
---

# TASK-003: `panel.js` 入口语义统一（右键保留已选 / 集合外替换）+ 修饰键分派顺序

<!-- butler:covers DEL-001 REQ-001 REQ-002 REQ-003 REQ-012 AC-001 AC-002 AC-003 -->

## 目标
修复 RC-1：`onContextMenu` 不再无条件 `selectAt`（导致多选坍缩、批量项永不可达）。
- 命中行**已在集合内 → 保留集合**（不坍缩，`count≥2` 自然成立）。
- 命中行**在集合外 → `selectAt(index)` 单选替换**（保留「右键定位该行」心智）。
同时修正 RC-2 的面板侧分派顺序，接入 TASK-001 的 `extendTo`。

## 涉及文件
- `extension/panel.js`（修改，入口段 `:1586-1608` + 分派段 `:811-817` + `openMenuAt :1552-1561`）

## 冻结/禁止
- 三项 ②③ 的 panel.js 改动由 TASK-007/TASK-008 承担；本 TASK **只做 ①（入口语义 + 修饰键分派）**，避免同文件交叉。
- 不得改动 `formatter.js` / `bulkformatter.js` 冻结产物契约。
- 保持 `onContextMenu` 对未命中行（表头/空白）的 `E_CTX_NO_TARGET` 语义：不弹、不改集合、不抛。

## 实施要点
1. `onContextMenu`：解析 `rowId` / `index` 后——
   - `multi.has(rowId)` 为真（已在集合）→ **不改集合**；
   - 否则 → `multi.selectAt(index)`。
2. `openMenuAt`：`createMenuModel({ hasSelection: getSelected() !== null, count: multi.count() })`（**去掉 `canCopyRequestOnly`**）。
3. `onListBodyClick` 分派顺序改为：
   - `shiftKey && (ctrlKey || metaKey)` → `multi.extendTo(index)`
   - `shiftKey` → `multi.rangeTo(index)`
   - `ctrlKey || metaKey` → `multi.toggleAt(index)`
   - 否则 → `multi.selectAt(index)`
4. 同步更新 `:787-792`、`:1579-1585`、`:1201-1205` 注释为统一后的规则。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-001 | `onContextMenu` 入口语义统一 + 修饰键分派顺序修正 |
| REQ-001 | 右键批量项与工具栏对同一集合产出 N 段（共用 `copySelection` 路径） |
| REQ-002 | 命中已选保留集合 / 命中集合外替换 |
| REQ-003 | `count≥2` 时菜单批量项真实可达（count 不再被坍缩为 1） |
| REQ-012 | `openContextMenu` 契约级行为变化（不再坍缩多选）；`canCopyRequestOnly` 入参移除 |
| AC-001 | Ctrl 选 2 条 → 右键 → 菜单出现「复制选中(2)」可点 |
| AC-002 | 集合 size/count 符合「已选保留 / 未选替换」 |
| AC-003 | 工具栏与右键对同一集合产物逐字符一致（同一 `runCopySelection`） |

## 验收
- [ ] lint: PASS
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 静态：`panel.js` 字符串字面量无裸中文（check-panel-shell 项 6）
- [ ] 行为（由 TASK-004 面板级测试固化）：多选态右键命中已选行 → 菜单 count=N；命中集合外行 → 单选替换
- [ ] 无残留：`openMenuAt` 不再传 `canCopyRequestOnly`

## 备注
- 依赖 TASK-001（`extendTo`）与 TASK-002（菜单模型去 P2/签名收窄）。
- 本 TASK 是面板交互契约切换点，风险最高（design §7 逆向激励角度）。
