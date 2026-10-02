---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-002
depends-on: TASK-001
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次二（面板 UI 外壳）
covers: [DEL-002, REQ-005, REQ-012, REQ-013, REQ-033, AC-012, AC-016]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-002/REQ-005/REQ-012/REQ-013/REQ-033/AC-012/AC-016）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.1/§5.3/§5.4/§9）
---

# TASK-002: DevTools 面板 UI 外壳（列表容器 + 工具栏 + 复制按钮 + Toast）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖此前完全未落地的 UI 外壳交付物。

## 涉及文件
- `panel.html`（**new** — 面板 DOM：工具栏 + 列表容器 + 复制按钮 + Toast 槽位）
- `panel.css`（**new** — 列表/工具栏样式，中文文案，预留 i18n 结构）
- `panel.js`（**new** — 面板入口（UI 壳，具体列表/过滤/选中/复制由后续 TASK 接线））

## 实现要点
1. 面板布局：顶部工具栏（后续放搜索/过滤控件）、中部列表容器、底部/右侧复制按钮区、Toast 提示区。
2. 列表每行预留 7 个字段位：方法 / URL / 状态码 / 资源类型 / 耗时(ms) / 大小 / 时间。
3. 「复制请求 + 响应（原始）」为主按钮；「仅复制请求 / 仅复制响应 / 复制为 cURL」为**可选**附加按钮（P2，非验收阻断）。
4. 界面语言中文优先；文案抽取到 i18n 占位结构（预留英文）。

## AC 引用
- **DEL-002**：面板 UI（panel.html + panel.js：列表 + 工具栏 + 复制按钮 + Toast）。
- **REQ-005**：列表每行显示 方法/URL/状态码/资源类型/耗时(ms)/大小/时间。
- **REQ-012**：选中后提供「复制请求 + 响应（原始）」按钮。
- **REQ-013**：可选附加按钮（仅复制请求 / 仅复制响应 / 复制为 cURL）。
- **REQ-033**：界面语言中文优先，可预留英文。
- **AC-012**：列表每行显示 7 个字段。
- **AC-016**：面板文案中文优先，预留 i18n 结构。

## 验收
- [ ] `panel.html` / `panel.css` / `panel.js` 均存在
- [ ] 列表行含 7 个字段位；工具栏、复制按钮、Toast 容器齐备
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-002 REQ-005 REQ-012 REQ-013 REQ-033 AC-012 AC-016 -->
