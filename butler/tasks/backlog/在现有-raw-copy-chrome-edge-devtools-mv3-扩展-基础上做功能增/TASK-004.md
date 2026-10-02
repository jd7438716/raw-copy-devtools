---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-developer
estimate: S
weight: standard
covers: REQ-009 REQ-010 REQ-011 REQ-022 DEL-003 AC-006 US-002
---

# TASK-004: 多记录拼接器 `bulkformatter.js` + 单测

<!-- butler:covers REQ-009 REQ-010 REQ-011 REQ-022 DEL-003 AC-006 US-002 -->

## 目标
新增 `extension/src/bulkformatter.js`：**只做外层聚合**，逐条调用冻结的 `formatter.buildCopyText`，产出确定性批量纯文本（ADR-015）。

## 涉及文件
- `extension/src/bulkformatter.js`（新增）
- `tests/bulkformatter.test.mjs`（新增）

## 冻结/禁止
- **禁止修改** `extension/src/formatter.js`（`buildCopyText` 签名与行为冻结，AC-007/A-3/A-5）。
- **禁止**在 bulkformatter 内复制/重写拼接逻辑（单一真源，避免保真漂移 R-01）。
- 纯函数、零浏览器 API、零第三方依赖，Node 可直测。

## 接口契约（design §4.2 / ADR-015）
- `joinBlocks(blocks, N): string`
- `buildBulkCopyText(records, mode, resolveBody): string`

输出模板（ADR-015，精确可逐字符断言）：
- **N ≥ 2**：`join('\n\n', blocks)`，其中
  `block_i = "===== #" + i + "/" + N + " =====" + "\n" + buildCopyText(record_i, mode, { responseBody: resolveBody(record_i) })`，`i` 从 1、十进制无补零。
- **N === 1**：**委托单选路径**，输出与单选复制**逐字符一致**（不加序号/分隔线）。
- **顺序** = **可见列表顺序**（调用方按可见序传入），非点击先后。
- 段内 = 该条 `buildCopyText` **原样**，模式 A/B 各自成立；**无跨条拼接**。

## AC 引用
- **AC-006**：多选输出含 N 段，每段为该条请求+响应原始纯文本，段间清晰分隔，无混淆。
- 关联 REQ-009/010/011、REQ-022（字符级保真）、DEL-003。

## 验收
- [ ] lint: PASS（无外部 import）
- [ ] test: PASS（`tests/bulkformatter.test.mjs`）
  - [ ] N=2/3/5 段数 === N，且恰好 N 个 `===== #i/N =====` 标记
  - [ ] 每段正文逐字符 === 对应记录的单条 `buildCopyText` 原样
  - [ ] 段序 = 输入（可见列表）顺序
  - [ ] N=1 输出与单选逐字符一致（无标记）
  - [ ] 模式 B 下每段为纯原始块
  - [ ] 任意段不含另一段的请求/响应标识（无跨条混淆）
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 回归: `tests/formatter.test.mjs`（24 用例 golden）零改动 PASS

## 备注
- responseBody 由调用方（panel）经既有 `resolveResponseBodyText` 注入，复用 `content.classifyBody`（REQ-022/023）。
