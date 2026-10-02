---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-005
depends-on: TASK-004
agent: butler-developer
estimate: S
weight: light
phase: ⑤ 收敛·执行后补齐 / 批次五（选中交互）
covers: [DEL-005, REQ-010, REQ-011, AC-004]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-005/REQ-010/REQ-011/AC-004）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.3）
---

# TASK-005: 选中交互（点击 + 键盘上下键）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖选中交互交付物。

## 涉及文件
- `selection.js`（**new** — 单选状态机：点击选中 + ↑/↓ 键切换，含边界 clamp）
- `panel.js`（**edit** — 接线选中模块）

## 实现要点
1. 点击某一行 → 选中该请求（唯一选中，单选）。
2. ↑/↓ 键 → 在筛选后的可见列表内切换选中项；到达首/尾时 clamp（不越界、不循环）。
3. 选中态视觉高亮；供 TASK-006/TASK-007 读取当前选中项。

## AC 引用
- **DEL-005**：选中交互模块（点击 + 键盘上下键）。
- **REQ-010**：点击某一行选中该请求。
- **REQ-011**：支持键盘上下键切换选中项。
- **AC-004**：点击选中与键盘上下键切换均可用。

## 验收
- [ ] `selection.js` 存在，点击与键盘上下键均可切换唯一选中项
- [ ] 边界处不越界（clamp 生效）
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-005 REQ-010 REQ-011 AC-004 -->
