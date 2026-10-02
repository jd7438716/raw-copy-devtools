---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-009
depends-on: TASK-001
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次九（隐私页 + 零网络/遥测约束）
covers: [DEL-010, REQ-027, REQ-028, AC-008, AC-020]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-010/REQ-027/REQ-028/AC-008/AC-020）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§3.2/§8）
---

# TASK-009: 隐私政策页 + 零网络 / 无存储约束

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖隐私与最小化数据处理交付物。

## 涉及文件
- `privacy.html`（**new** — 隐私政策页面：不收集、不传输、本地完成、敏感信息警示）
- `panel.js`（**edit** — 确保无任何 fetch/XHR/存储调用，纯内存态）

## 实现要点
1. 隐私政策声明三条：不收集数据、不传输数据、操作本地完成（REQ-028 / AC-020）。
2. 显式警示：复制内容可能含 Authorization/Cookie 等敏感信息，请谨慎分享（feasibility R12）。
3. 代码层零网络：不引入 fetch/XHR/WebSocket 客户端；不引入分析/遥测/广告（REQ-027）。
4. 数据仅存 DevTools 内存，关闭 DevTools 即销毁，不落任何持久化存储（REQ-028）。

## AC 引用
- **DEL-010**：隐私政策页面（privacy.html）。
- **REQ-027**：无网络请求代码、无服务器、无分析、无遥测、无广告。
- **REQ-028**：数据仅存内存、关闭即销毁。
- **AC-008**：复制过程中扩展不发出任何网络请求。
- **AC-020**：隐私政策声明三条齐全。

## 验收
- [ ] `privacy.html` 存在且含三条声明 + 敏感信息警示
- [ ] 静态扫描无网络调用；运行时网络监听为空
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-010 REQ-027 REQ-028 AC-008 AC-020 -->
