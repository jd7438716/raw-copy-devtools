---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-config-changer
estimate: S
weight: heavy
covers: REQ-018 REQ-019 REQ-020 REQ-021 DEL-007 AC-012 AC-013 AC-016 US-004
---

# TASK-011: manifest 版本与最小权限 / 零网络 / 零依赖 / 体积门禁

<!-- butler:covers REQ-018 REQ-019 REQ-020 REQ-021 DEL-007 AC-012 AC-013 AC-016 US-004 -->

## 目标
仅 bump `manifest.json#version`，并验证新增能力未破坏权限/网络/依赖/体积四项门禁（REQ-018..021）。

## 涉及文件
- `extension/manifest.json`（修改：**仅 `version` 1.0.0 → 1.1.0**，其他字节不变）

## 硬约束（门禁级）
- `permissions` 严格 `["clipboardWrite"]`；无 `host_permissions` / `optional_permissions` / `webRequest` / `<all_urls>` / `declarativeNetRequest`（AC-012）。
- `manifest_version: 3` 不变；`devtools_page` 不变。
- 全仓**零 `chrome.contextMenus` 引用**（ADR-013；出现即 REJECT）。
- 零 `fetch(`/XHR/`sendBeacon`/WebSocket；零 `chrome.storage`/`localStorage`/`indexedDB`（AC-013）。
- 零第三方运行时依赖（`external.length === 0`，AC-016）。
- 解压后总体积 < 200KB（AC-016）。

## 门禁脚本（判定真源）
- `node scripts/check-manifest.mjs` → PASS
- `node scripts/check-syntax.mjs` → PASS
- `node scripts/check-zero-network.mjs` → PASS
- `node scripts/check-panel-shell.mjs` → PASS
- `node scripts/package.mjs` → 体积 < 200KB + 零依赖 + 权限断言全 PASS

## AC 引用
- **AC-012**：manifest 权限仍仅 `clipboardWrite`，无新增网络/主机权限。
- **AC-013**：复制/查看全流程不发出任何网络请求（零网络传输）。
- **AC-016**：扩展包体积仍 < 200KB 且零第三方运行时依赖。
- 关联 REQ-018（MV3）、REQ-019（零依赖）、REQ-020（最小权限）、REQ-021（零网络）、DEL-007（门禁侧）。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] lint: PASS（4 门禁脚本全 PASS）
- [ ] test: PASS（`node scripts/package.mjs`：体积 + 零依赖 + 权限断言）
- [ ] 断言：`manifest.json` 除 `version` 外与基线逐字节一致
- [ ] 反向探针：临时注入 `fetch(`/`localStorage` → `check-zero-network.mjs` 应 exit 1（验证门禁生效）
- [ ] 断言：`rg "chrome\.contextMenus" extension/` == 0
