---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-003
depends-on: TASK-001
agent: butler-developer
estimate: L
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次三（请求捕获 + 内存缓存）
covers: [DEL-003, REQ-002, REQ-003, REQ-004, REQ-035, AC-002, AC-013]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-003/REQ-002/REQ-003/REQ-004/REQ-035/AC-002/AC-013）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.2/§7.1/§7.4/§9）
---

# TASK-003: 请求捕获与内存缓存（onRequestFinished，上限 1000，HAR 映射）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖请求捕获/缓存交付物。

## 涉及文件
- `request-store.js`（**new** — `chrome.devtools.network.onRequestFinished` 监听 + 环形缓冲，上限 1000 条 + HAR 字段映射）
- 可选 `har-map.js`（**new** — HAR entry → 内部记录 的纯函数映射，便于单测）

## 实现要点
1. 捕获源：`chrome.devtools.network.onRequestFinished.addListener`，将 HAR entry 缓存到内存数组。
2. 支持类型：XHR / Fetch / Document / Script / Stylesheet / Image / Font / Media / WebSocket 等（以 HAR entry 为准）。
3. 新请求实时追加到列表（供 TASK-004 渲染）。
4. 上限 1000 条：超出淘汰最旧（环形缓冲/数组裁剪），防内存泄漏。
5. HAR 字段映射：`request.method/url/headers/postData.text`；`response.status/statusText/headers/content.text/encoding/content.mimeType`；`time`；`startedDateTime`。

## AC 引用
- **DEL-003**：请求捕获 + 内存缓存模块（onRequestFinished，上限 1000 条）。
- **REQ-002**：自动捕获当前页面请求，支持多资源类型。
- **REQ-003**：列表实时更新，新请求自动追加。
- **REQ-004**：内存最多保留最近 1000 条，超出淘汰最旧。
- **REQ-035**：HAR 字段映射。
- **AC-002**：访问任意网站，列表实时显示并自动追加。
- **AC-013**：最多保留最近 1000 条，无内存泄漏。

## 验收
- [ ] `request-store.js` 存在并注册 `onRequestFinished` 监听
- [ ] 注入 1001 条后断言仅保留最近 1000 条（首条被淘汰）
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-003 REQ-002 REQ-003 REQ-004 REQ-035 AC-002 AC-013 -->
