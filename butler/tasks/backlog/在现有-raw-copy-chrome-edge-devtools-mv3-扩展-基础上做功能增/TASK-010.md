---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-003, TASK-005, TASK-007, TASK-009
agent: butler-developer
estimate: S
weight: light
covers: DEL-006 REQ-001 REQ-008 REQ-013
---

# TASK-010: i18n 新增键（`contextmenu.*` / `multi.*` / `detail.*`）与键集断言

<!-- butler:covers DEL-006 REQ-001 REQ-008 REQ-013 -->

## 目标
在 `extension/src/i18n.js` 的 `dict` 中补齐右键菜单 / 多选 / 明细三类新增文案键（zh + en **键集严格相等**），并扩展 `i18n.test.mjs` 断言。

## 涉及文件
- `extension/src/i18n.js`（修改：`dict.zh` / `dict.en` 同步增键）
- `tests/i18n.test.mjs`（修改：追加新键必含断言）

## 新增键（据接线实际用到的键；zh/en 一一对应）
- `contextmenu.*`：`copyRequestResponse` / `copyRequestOnly` / `copyResponseOnly` / `copySelected` / `openDetail` / （菜单无障碍相关）
- `multi.*`：`selectAll` / `copySelected` / `selectedCount`（含 `{count}` 插值）/ `largeConfirm`（R-B，含条数+最大体积）
- `detail.*`：`title` / `close` / `copyButton`(P2) / `evicted`
- 复用既有 `selection.evicted` / `copy.cancelled` 等不重复新增。

## 硬约束
- **zh 与 en 键集必须严格相等**（既有 `tests/i18n.test.mjs` `deepEqual(zhKeys, enKeys)`）；缺失即 FAIL。
- 复制文本逐字符契约键（`copy.*Section` / `copy.requestBody` 等）**不得翻译/改动**。
- 面板 HTML 不内联中文（`check-panel-shell`），全部经 `data-i18n*` + `t()`。

## AC 引用
- DEL-006（i18n 新键，zh/en 对齐）。
- 文案侧：REQ-001（右键菜单文案）、REQ-008（工具栏文案）、REQ-013（明细文案）。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] test: PASS（`tests/i18n.test.mjs`：zh/en 键集 `deepEqual`，全部新增键值非空）
- [ ] lint: PASS（`node scripts/check-panel-shell.mjs`，7 个 `col.*` 断言不破）
- [ ] 断言：切换 zh/en 后新增文案正确切换，无裸 key 回退

## 依赖
- 需待各 UI 接线 TASK 确定最终键名后收口（TASK-003/005/007/009）。
