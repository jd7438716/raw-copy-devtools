---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-002
depends-on: TASK-001
agent: butler-rf-fixer
estimate: L
weight: heavy
phase: 修复·方案A（捕获层异步 enrich）
covers: [DEL-001, REQ-001, REQ-002, REQ-003, REQ-004, REQ-008, REQ-014, AC-001, AC-004, AC-005, AC-006]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-001 / REQ-001..004 / REQ-008 / REQ-014 / AC-001 / AC-004..006）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · capture.js:171-239）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§9 RC-1 / §8 D 维 / §10.2）
---

# TASK-002: capture.js 异步 enrich（getContent 双形态）· normalize 保持纯同步

> **本缺陷的根因修复 TASK**（RC-1）。核心：捕获到「正文不在同步 HAR 快照里」的 entry 时，
> 于**独立异步步骤**调用 `harEntry.getContent()`，把正文 + encoding 回填到 `store` 同一条记录。

## 涉及文件
- `extension/src/capture.js`（修改）

## 实现要点
1. **`normalize` 零改动 / 保持纯同步纯函数（硬约束 C-1 / AC-004）**：不得改为 async / 不得返回 Promise；
   现有 `normalize` 单测与 123 基线不动。
2. **独立 enrich 步骤（REQ-002 / C-2）**：捕获回调仍只做 `normalize → store.add → onAdd`（同步返回，不阻塞热路径）；
   在 `store.add` 拿到 `id` 后调用 `maybeEnrich(harEntry, record, id)`（异步，不 await 在热路径上）。
3. **触发条件（REQ-001）**：仅当 `record.responseContent.text` 为空/`null` **且** `typeof harEntry.getContent === 'function'` 时才 enrich；
   否则行为等同现状（客观不可获取，占位合法）。
4. **`applyContent(record, text, encoding)` 纯工具**：把正文写入 `record.responseContent.text`；将 `getContent` 返回的
   `encoding` **合并**进 `responseContent`（REQ-004 / AC-006）；必要时同步修正 `size`（不得截断）。保持逐字符、不 trim、不转义。
5. **getContent 双形态兼容（REQ-014 / C-10）**：
   - 回调形式 `getContent((content, encoding) => …)`（Chromium 既有签名，**两参** `content, encoding`）；
   - Promise 形式 `getContent()`（Chrome 151+，resolve `{ content, encoding }` 或 `{ text, encoding }`）。
   - 用 `typeof` 守卫 + thenable 探测 + try/catch 双解析；**不得**把返回值误当对象参数。
6. **回填与竞态（REQ-003 / C-4 / AC-005）**：
   - 调用前 `store.markPending(id)`；回调/Promise 内**先校验 `store.get(id) === record`**（防写到已被淘汰的陈旧对象），
     命中才 `applyContent` + `store.update(id, { responseContent })`；随后 `store.resolvePending(id)`。
   - 无 getContent / 取正文失败 → `store.rejectPending(id)`（占位由 panel 判定为合法不可获取）。
7. **内存约束（REQ-008 / C-3）**：**不**把 `harEntry` 或其 `getContent` 绑定/闭包保存进 record 或模块级长生命周期结构；
   回调完成即释放引用。高频页面下加**并发上限/串行队列**，防回调风暴（配合 TASK-001 的 `maxBytes`）。

## 追溯（covers）
- **DEL-001**：capture.js 新增 getContent 异步 enrich（normalize 纯同步，installCapture 接线）。
- **REQ-001**：`response.content.text` 缺失时调用异步 `getContent` 取完整正文。
- **REQ-002**：getContent 异步；normalize 纯同步，enrich 独立且不阻塞热路径。
- **REQ-003**：取到的正文回填到 store 同一条记录（引用一致）。
- **REQ-004**：`getContent` 返回的 encoding 合并进 `responseContent`。
- **REQ-008**：不长期驻留 harEntry/闭包引用，正文驻留有界。
- **REQ-014**：兼容 Chrome 151+ Promise 形式与回调形式（双形态）。
- **AC-001**：无 content.text 但提供 getContent 的 entry 取到真实正文。
- **AC-004**：normalize 仍为纯同步函数，enrich 为独立步骤。
- **AC-005**：回填后复制读到最新正文（同一条记录）。
- **AC-006**：encoding 被合并，base64 + 文本 MIME 正确解码。

## 验收
- [ ] `normalize` 仍同步返回（未变 async），既有纯函数断言不回归
- [ ] 提供回调式 / Promise 式 getContent 时均回填同一条记录的 `responseContent.text`
- [ ] 无 getContent 时不抛错、不误触发 enrich
- [ ] 回填前校验记录身份，淘汰后回填被丢弃；无 `harEntry` 长期引用
- [ ] build: N/A；test: TASK-005 / TASK-006 覆盖；lint: PASS（由 **butler-tester** 执行）

<!-- butler:covers DEL-001 REQ-001 REQ-002 REQ-003 REQ-004 REQ-008 REQ-014 AC-001 AC-004 AC-005 AC-006 -->
