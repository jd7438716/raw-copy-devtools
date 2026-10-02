---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-developer
estimate: S
weight: standard
covers: REQ-013 REQ-014 DEL-004 AC-008 AC-009 US-003
---

# TASK-008: 双击明细视图逻辑 `detail.js` + 单测

<!-- butler:covers REQ-013 REQ-014 DEL-004 AC-008 AC-009 US-003 -->

## 目标
新增 `extension/src/detail.js`：明细文本构建（复用 formatter 模式 A 口径）+ 容器开合状态机。

## 涉及文件
- `extension/src/detail.js`（新增）
- `tests/detail.test.mjs`（新增）

## 冻结/禁止
- **禁止修改** `formatter.js` / `selection.js`。
- 渲染必须 `textContent`（`<pre>`），**禁止 `innerHTML`**（不可信请求数据，design §3.3-2）。

## 接口契约（design §4.2 / ADR-017）
- `buildDetailText(record, resolveBody): string`
  = `buildCopyText(record, MODE_A, { responseBody: resolveBody(record) })`
  —— 即"复制口径"的模式 A 渲染；**不随面板 A/B 切换而变**（A-4）；
  六要素由 formatter 结构天然覆盖：方法+URL / 请求头 / 请求体 / 状态码+状态文本 / 响应头 / 响应体。
- `createDetailView({container, onClose}) → { open(id), close(), isOpen(), currentId() }`（开合状态机，纯逻辑部分可测）。

## AC 引用
- **AC-008**：双击打开明细，含方法+URL、请求头、请求体、状态码+状态文本、响应头、响应体。
- **AC-009**：明细响应体逐字符等于原始响应体；头保持原始顺序（不缩进/不排序/不转 Markdown）。
- 关联 REQ-013/014、DEL-004、US-003。

## 验收
- [ ] lint: PASS（无 `innerHTML`）
- [ ] test: PASS（`tests/detail.test.mjs`）
  - [ ] `buildDetailText === buildCopyText(MODE_A,{responseBody})` 逐字符
  - [ ] 缺请求体 / 空响应体 / 状态码缺失时的六要素呈现（formatter 既有降级）
  - [ ] 开合状态机 open/close/isOpen/currentId
  - [ ] 输出不随 `copyMode` 变化
- [ ] build: PASS（`node scripts/check-syntax.mjs`）

## 备注
- 详情复用 `content.classifyBody/isOverThreshold`（大响应/二进制/Base64 规则不变，AC-014），由调用方注入 resolveBody。
- 淘汰/失效联动（ADR-018）在 TASK-009 的 panel 接线完成。
