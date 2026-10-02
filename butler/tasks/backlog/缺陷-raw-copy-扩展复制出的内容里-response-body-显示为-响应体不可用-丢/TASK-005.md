---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-005
depends-on: TASK-002
agent: butler-rf-fixer
estimate: M
weight: standard
phase: 修复·方案A（修正错误断言 + 缺失路径用例）
covers: [DEL-005, REQ-011, REQ-012, AC-010, AC-011]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-005 / REQ-011 / REQ-012 / AC-010 / AC-011）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · tests/capture.test.mjs:14-40,125-132,200-241）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§9 RC-3 / §10.3）
---

# TASK-005: tests/capture.test.mjs 修正错误断言 + 缺失 content.text 路径用例

> RC-3 修复：旧测试用 `makeFullEntry()` 恒带 `content.text`，并把「缺失→null」固化为期望。
> 本 TASK 必须**不再断言 `text === null`**，改为验证「缺失 + 提供 getContent → enrich 后取回正文」。

## 涉及文件
- `tests/capture.test.mjs`（修改）

## 实现要点
1. **删除 `text === null` 断言（REQ-011 / AC-010）**：原 `:125-132`「响应体缺失 → content.text 为 null」用例
   及空/畸形输入用例中的 `assert.equal(record.responseContent.text, null)` 一律移除；
   改为断言字段存在 / 形状正确，或改为 enrich 后的**真实正文**断言。全文件不得再出现把 `null` 当作期望终态的断言。
2. **桩支持 getContent（REQ-012a / DEL-005）**：`makeFullEntry()` 与 `installCapture` 桩增加**可选** `getContent`：
   - 回调形式 `getContent((content, encoding) => cb(...))`；
   - 缺失 `response.content.text` 时，installCapture 应触发 enrich，最终 `store.get(id).responseContent.text` 为真实正文。
3. **新增缺失路径用例（REQ-012）**：
   - (a) 缺失 `content.text` + 提供 getContent → enrich 取回正文；
   - 无 getContent → 不抛错、记录保持无正文（客观不可获取，占位合法性由 TASK-006 覆盖）。
4. **不回归（AC-011）**：除被修正的错误断言外，`capture.test.mjs` 既有用例（字段映射 / headers / id 注入 / 畸形输入 / 卸载幂等）保持全绿。

## 追溯（covers）
- **DEL-005**：tests/capture.test.mjs 修正错误断言 + 新增缺失 content.text/getContent 用例。
- **REQ-011**：`tests/capture.test.mjs:125-132` 不得再断言 `content.text` 缺失时 `text===null`。
- **REQ-012**：新增缺失 content.text + getContent 用例（a 子项；b–e 见 TASK-006）。
- **AC-010**：capture.test.mjs 不再断言 `text===null`。
- **AC-011**：现有测试（除被修正断言外）保持全绿，无回归。

## 验收
- [ ] `grep "responseContent.text, null" tests/capture.test.mjs` 无命中
- [ ] 缺失 content.text + getContent 桩 → enrich 后正文正确
- [ ] 既有用例全绿（由 **butler-tester** 执行 `node --test tests/capture.test.mjs`）
- [ ] lint: PASS

<!-- butler:covers DEL-005 REQ-011 REQ-012 AC-010 AC-011 -->
