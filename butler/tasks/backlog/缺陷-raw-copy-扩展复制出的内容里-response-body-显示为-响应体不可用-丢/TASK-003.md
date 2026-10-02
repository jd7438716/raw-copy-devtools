---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-003
depends-on: N/A
agent: butler-rf-fixer
estimate: S
weight: light
phase: 修复·方案A（编码/分类一致性适配）
covers: [DEL-004, REQ-004, AC-006]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-004 / REQ-004 / AC-006）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · content.js:278-292）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§8 B 维）
---

# TASK-003: content.js 分类/编码合并一致性适配（base64 + 文本 MIME）

> `content.js` 现有 base64 解码已较完整（`isWellFormedBase64` + Node/Browser 双路径）；
> 本 TASK 重点是**核验并最小适配**：确保 `capture` 异步合并进来的 `encoding` 被 `classifyBody` 一致消费，
> 不出现「已解码文本被二次解码」或「文本 MIME 被误判为 omitted」。

## 涉及文件
- `extension/src/content.js`（核验，必要时最小修改；**不做无关重构**）

## 实现要点
1. **编码合并一致性（REQ-004 / AC-006）**：`classifyBody` 必须正确消费「异步 enrich 合并后的 `responseContent.encoding`」——
   `encoding === 'base64'` 且文本 MIME → `decodeBase64ToUtf8` 一次解码为 `base64-text`；非文本 MIME 或非法 base64 → `base64-omitted`。
   - 明确约定：getContent 回填的 `text` 为**原始（含 base64）**正文，`encoding` 同步合并；分类层只解码一次，**不重复解码**。
2. **不变式**：文本类正文逐字符原样（不 trim / 不转义）；`byteSize` 优先取 `size`，否则按 UTF-8 字节估算；
   `unavailable` 仅用于「无正文」而非「有正文但编码待处理」。
3. 若核验确认现有逻辑已满足 → 在 TASK 产出中记录**核验结论**（不改代码即算完成 DEL-004 的适配义务）；
   若发现偏差（如非法 base64 判定、换行/padding 边界）→ 最小修正并保持既有 `content.test.mjs` 全绿。

## 追溯（covers）
- **DEL-004**：content.js 分类/编码合并适配（base64 + 文本 MIME 解码一致性）。
- **REQ-004**：`getContent` 返回的 encoding 合并进 `responseContent`，保证 base64 分支判定正确（分类侧）。
- **AC-006**：encoding 被合并；base64 + 文本 MIME 正确 UTF-8 解码。

## 验收
- [ ] `classifyBody` 对「base64 + 文本 MIME + 合并后 encoding」返回 `base64-text` 且文本正确
- [ ] 非法 base64 / 非文本 MIME 仍回退 `base64-omitted`，不抛错
- [ ] `tests/content.test.mjs` 既有用例全绿；无回归
- [ ] build: N/A；test: 相关单测（由 **butler-tester** 执行）；lint: PASS

<!-- butler:covers DEL-004 REQ-004 AC-006 -->
