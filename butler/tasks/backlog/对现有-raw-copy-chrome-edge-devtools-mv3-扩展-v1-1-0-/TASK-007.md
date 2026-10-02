---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-003 TASK-005 TASK-006
agent: butler-rf-fixer
estimate: M
weight: standard
covers: DEL-004 REQ-006 REQ-007 REQ-012 AC-007 AC-008 AC-003
---

# TASK-007: `panel.js` 模式 A/B 双按钮接线（动作即模式，默认 A）

<!-- butler:covers DEL-004 REQ-006 REQ-007 REQ-012 AC-007 AC-008 AC-003 -->

## 目标
②：删除模块级可变 `copyMode` 与 `setCopyMode`，改为**动作即模式**——`#copy-btn-a` / `#copy-btn-b` 各自携带模式实参调用 `runCurrentCopy(mode)`；批量入口统一按默认模式 A；`getCopyMode()` 降为「恒定返回 MODE_A」的兼容导出。消除 toggle 状态残留。

## 涉及文件
- `extension/panel.js`（修改：`:77-99, 428-455, 811 段, 887-895, 951, 990-1053, 1107-1108, 1492-1560, 1638-1654, 1786` 等）

## 冻结/禁止
- **禁止保留** `#mode-toggle` 或任何模块级可变模式状态（违反 REQ-006 / AC-007）。
- **禁止改动** `formatter.js` / `bulkformatter.js` 冻结产物契约；A/B 产物字节不变。
- 批量入口（`#copy-selected-btn` 与菜单 `copy-selected`）**固定 MODE_A**（P-DEC-1 推荐项；B 批量不在本轮范围），在注释中记录该决策。
- ③ 的分段复制删除由 TASK-008 承担；本 TASK 只做 ②，同文件串行。

## 实施要点
1. 删除 `let copyMode = MODE_A`、`setCopyMode(...)`、`setCopyMode(MODE_A)` 初始化调用（`:641`）。
2. `runCurrentCopy(mode)` 显式入参（缺省兜底 MODE_A）；`#copy-btn` 保持默认 A；`#copy-btn-a` / `#copy-btn-b` 点击读 `data-copy-mode`，**非 A 即 A 白名单**（防 undefined/非法）。
3. `els`：删除 `modeToggle` / `copyReqBtn` / `copyRespBtn`；新增 `copyBtnA` / `copyBtnB`。
4. `getCopyMode()` 保留但恒返回 `MODE_A`；`setCopyMode` 移除（确保无导出引用断裂）。
5. `openMenuAt` 中 `canCopyRequestOnly: copyMode === MODE_A` 已在 TASK-003 移除；此处确认无残留。
6. 批量路径 `runCopySelection(mode)`：`#copy-selected-btn` 与菜单批量项以 `MODE_A` 调用（不再读 `copyMode`）。
7. 用 `mode.aHint`/`mode.bHint` 设置 A/B 按钮 `title`；更新相关注释。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-004 | `panel.js` 模式 A/B 双按钮接线（按钮携带模式实参，默认 A） |
| REQ-006 | 点 A 按 A 复制、点 B 按 B 复制；取消「先切换再复制」toggle |
| REQ-007 | 保留默认模式 A；A/B 产物字节契约不变 |
| REQ-012 | `getCopyMode` 保留为常量兼容导出；`setCopyMode` 明确废弃移除 |
| AC-007 | 无 toggle 状态残留 |
| AC-008 | 默认 A；A/B 各自产物与冻结 golden 逐字符一致（golden 断言见 TASK-009） |
| AC-003 | 批量入口与右键共用同一 `runCopySelection(MODE_A)`，产物一致 |

## 验收
- [ ] lint/build: PASS
- [ ] 静态：全仓 grep `copyMode` / `setCopyMode` / `mode-toggle` 无逻辑引用残留（注释说明除外）
- [ ] 行为：点 `#copy-btn-a` 与 `#copy-btn-b` 分别产出模式 A/B，且与冻结 `buildCopyText` oracle 一致
- [ ] `getCopyMode()` 恒返回 `MODE_A`；无 `setCopyMode` 导出

## 备注
- 依赖 TASK-003（同文件入口段先改）、TASK-005（按钮 id）、TASK-006（按钮键）。
- design §7 风险：漏改读取点 → undefined；本 TASK 用「非 A 即 A」兜底 + grep 自检。
