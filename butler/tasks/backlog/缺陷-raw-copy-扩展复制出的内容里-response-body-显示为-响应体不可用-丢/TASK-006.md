---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-006
depends-on: TASK-001, TASK-002, TASK-003
agent: butler-rf-fixer
estimate: L
weight: standard
phase: 修复·方案A（enrich 专项测试）
covers: [DEL-006, REQ-012, REQ-013, REQ-014, AC-002, AC-010]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-006 / REQ-012..014 / AC-002 / AC-010）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · tests/enrich.test.mjs 新增）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§10.3 CE-4 / §0.2 复现基线）
---

# TASK-006: tests/enrich.test.mjs 新增（双形态 / 竞态 / 编码 / 字符级保真 / 401）

> 覆盖 `02-solution-design` §5 与 01-root-cause §10.3 要求的新增测试面（b–e + 竞态）。

## 涉及文件
- `tests/enrich.test.mjs`（新增）

## 实现要点
新增用例（对应 REQ-012 b–e 与竞态/纯同步）：
1. **(b) getContent 双形态**：回调形式 `getContent(cb)` 与 Promise 形式 `getContent()`（Chrome 151+ resolve `{content, encoding}`）→ 两种都回填到同一条记录。
2. **(c) base64 + 文本 MIME**：`encoding==='base64'` + `application/json` → `classifyBody` 得 `base64-text`，UTF-8 解码正确（配合 TASK-003）。
3. **(d) 字符级保真**：含换行 / Unicode / 引号 / 不转义 → 复制输出与原文逐 UTF-16 码元相等。
4. **(e) 401 错误响应体（复现基线）**：`http/2.0 401` + `content-type: application/json; charset=utf-8` + `content-length: 395` 的 JSON 正文
   → 完整取回、不美化 JSON、不截断、逐字符一致（REQ-013 / AC-002 单测侧）。
5. **竞态**：pending 期间 `awaitPending` 挂起，回填后 resolve；超时（>3s）以可区分结果返回，不永久挂起。
6. **normalize 纯同步（AC-004 测试侧）**：直接调用 `normalize` 无异步副作用、返回值非 Promise。
7. **引用一致**：回填后 `store.get(id)` 为同一条记录（引用相等）。
8. **客观不可获取**：无 getContent → 记录保持无正文，占位合法（配合 AC-003）。

## 追溯（covers）
- **DEL-006**：tests/ 新增 getContent 异步 enrich 用例（覆盖双形态/竞态/编码）。
- **REQ-012**：新增用例 (b) 双形态、(c) base64+文本 MIME、(d) 字符级保真、(e) 401 错误响应体。
- **REQ-013**：401 等错误响应体完整复制，不美化 JSON、不截断、字符级一致。
- **REQ-014**：兼容 Promise 与回调双形态（测试验证）。
- **AC-002**：401 正文逐字符相等（单测侧；真机侧由 TASK-009 覆盖）。
- **AC-010**：新增缺失路径/异步双形态/字符级保真/401 用例全部通过。

## 验收
- [ ] `node --test tests/enrich.test.mjs` 全绿（由 **butler-tester** 执行）
- [ ] 双形态均通过；base64 文本 MIME 解码正确；401 正文逐字符相等
- [ ] 竞态超时路径可终止；normalize 同步性断言通过
- [ ] lint: PASS

<!-- butler:covers DEL-006 REQ-012 REQ-013 REQ-014 AC-002 AC-010 -->
