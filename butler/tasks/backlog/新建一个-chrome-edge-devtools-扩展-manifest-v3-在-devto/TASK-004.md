---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-004
depends-on: TASK-003
agent: butler-developer
estimate: L
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次四（列表渲染 + 搜索/过滤 + 虚拟滚动）
covers: [DEL-004, REQ-006, REQ-007, REQ-008, REQ-009, REQ-029, AC-003, AC-021]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-004/REQ-006..009/REQ-029/AC-003/AC-021）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.3/§9）
---

# TASK-004: 列表渲染 + 搜索/过滤 + 虚拟滚动

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖列表渲染与筛选交付物。

## 涉及文件
- `list-view.js`（**new** — 列表渲染 + 虚拟滚动 + 搜索/过滤逻辑）
- `panel.js`（**edit** — 接线列表模块，仅追加调用，不改 TASK-002 已定义结构）

## 实现要点
1. 列表渲染：每行 方法/URL/状态码/资源类型/耗时(ms)/大小/时间。
2. 搜索：按 URL 关键字匹配。
3. 过滤：按请求方法 / 状态码 / 资源类型（可组合）。
4. 虚拟滚动：仅渲染可视区域行，1000 条下滚动/搜索/过滤不卡顿。
5. 捕获不影响页面性能（监听在 DevTools 进程侧）。

## AC 引用
- **DEL-004**：列表渲染 + 搜索/过滤 + 虚拟滚动模块。
- **REQ-006**：按 URL 关键字搜索。
- **REQ-007**：按请求方法过滤。
- **REQ-008**：按状态码过滤。
- **REQ-009**：按资源类型过滤。
- **REQ-029**：性能——虚拟滚动，1000 条不卡顿。
- **AC-003**：搜索 + 三类过滤结果正确。
- **AC-021**：1000 条下列表滚动/搜索/过滤不卡顿。

## 验收
- [ ] `list-view.js` 存在；四类过滤 + URL 搜索结果正确
- [ ] 1000 条下虚拟滚动生效（DOM 行数与可视区一致）
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-004 REQ-006 REQ-007 REQ-008 REQ-009 REQ-029 AC-003 AC-021 -->
