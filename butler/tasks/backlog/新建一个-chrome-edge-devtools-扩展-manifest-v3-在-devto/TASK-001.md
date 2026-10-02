---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-001
depends-on: N/A
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次一（MV3 清单 + DevTools 注册）
covers: [DEL-001, DEL-009, REQ-001, REQ-026, REQ-030, REQ-036, AC-001, AC-009, AC-018]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-001/DEL-009/REQ-001/REQ-026/REQ-030/REQ-036/AC-001/AC-009/AC-018）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§2.1 C-001/C-011；§4.2 F-001/F-012；§7.1/§7.2）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/feasibility.md（§5.1 M1）
---

# TASK-001: MV3 清单 + devtools 注册页 + DevTools 面板注册

> **收敛追补说明（只增不改）**：本 TASK 由 `converge`（执行后补齐）节点追加，**不修改/删除任何既有 TASK、不改动任何源码**。
> 追加动因：上游管线在 `checklist_gate` 失败后中断，`decompose`/`execute` 从未运行 —— `butler/tasks/backlog/<slug>/` 无任何 `TASK-*.md`，
> 故 `spec.json` 的 **80/80** 个 spec ID 的 `covers` 并集为空，全部命中「未被 `covers` 覆盖」判据。

## 涉及文件
- `manifest.json`（**new** — MV3，`manifest_version: 3`，`devtools_page: "devtools.html"`，`permissions: ["clipboardWrite"]`，`icons` 指向 DEL-017）
- `devtools.html`（**new** — 仅加载 `devtools.js`）
- `devtools.js`（**new** — `chrome.devtools.panels.create("Raw Copy", "", "panel.html", cb)`）

## 实现要点
1. `manifest_version` 必须为 `3`；仅声明 `"permissions": ["clipboardWrite"]`；**不得**出现 `<all_urls>` / `host_permissions` / `tabs` / `webRequest` / `declarativeNetRequest`。
2. 使用 `devtools_page` 注册页；**不需要** background service worker / content script。
3. 通过 `chrome.devtools.panels.create` 创建与 Elements/Console/Network 并列的独立面板。
4. 纯原生 JS，零第三方运行时代码。

## AC 引用
- **DEL-001**：`devtools_page` 注册页（devtools.html + devtools.js）。
- **DEL-009**：`manifest.json`（MV3，permissions 仅 `clipboardWrite`）。
- **REQ-001**：DevTools 新增独立面板，与 Elements/Console/Network 并列。
- **REQ-026**：最小权限，仅 `clipboardWrite`；无敏感权限。
- **REQ-030**：兼容最新版 Chrome 与 Edge（Chromium）。
- **REQ-036**：架构 = MV3 + devtools_page + panels.create + onRequestFinished。
- **AC-001**：安装后打开 DevTools 出现新的独立面板。
- **AC-009**：权限清单仅 `clipboardWrite`。
- **AC-018**：在最新版 Chrome 与 Edge 均可正常安装与使用。

## 验收
- [ ] `manifest.json` / `devtools.html` / `devtools.js` 均存在
- [ ] `manifest.json` 中 `permissions` 仅含 `clipboardWrite`（无敏感权限）
- [ ] 加载扩展后打开 DevTools 能见到 `Raw Copy`（或 `请求复制`）面板
- [ ] build: N/A（无构建产物）；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-001 DEL-009 REQ-001 REQ-026 REQ-030 REQ-036 AC-001 AC-009 AC-018 -->
