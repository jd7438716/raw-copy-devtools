---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-007
depends-on: TASK-001
agent: butler-rf-fixer
estimate: M
weight: standard
phase: 修复·方案A（store 专项测试）
covers: [DEL-003, REQ-003, REQ-005, REQ-008, REQ-009, AC-005, AC-008, AC-009]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-003 / REQ-003 / REQ-005 / REQ-008 / REQ-009 / AC-005 / AC-008 / AC-009）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · tests/store.test.mjs 修改）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§8 B 维 / RC-3b）
---

# TASK-007: tests/store.test.mjs 新增（update 事件 / 字节预算淘汰 / pending 注册表）

> 验证 TASK-001 的 `update` / 预算 / pending API 及既有环形语义不回归。

## 涉及文件
- `tests/store.test.mjs`（修改）

## 实现要点
1. **`update(id, patch)`（REQ-003 / AC-005）**：
   - 原地合并 → `get(id)` 引用不变（`store.get(id)` 恒等于更新前引用）；
   - 返回 `true` 且 emit `{ type:'update', id }`；
   - 不存在 id → 返回 `false`，不创建记录、不发 `add`。
2. **字节预算（REQ-008 / REQ-009 / AC-009）**：
   - 小 `maxBytes` 下，`add`/`update` 使 `bytesInUse() > maxBytes` → 淘汰最旧；
   - 淘汰事件与顺序符合环形语义（最旧→最新），`evicted` 正确；
   - 长序列反复回填不导致无界增长（有界断言）。
3. **pending 注册表（REQ-005 / AC-008 支撑）**：`markPending` → `awaitPending` resolve / reject / **超时**三路径；
   记录被淘汰 / `clear()` 时 pending 被结算，无悬空 Promise。
4. **回归**：既有 store 用例（capacity 1000、环形顺序、注入 id、subscribe 隔离、clear 事件）全绿。

## 追溯（covers）
- **DEL-003**：store 同一条记录回填 / 订阅刷新支持（测试侧）。
- **REQ-003**：回填写同一条记录（引用一致）。
- **REQ-005**：update 订阅事件；环形顺序与淘汰语义不变。
- **REQ-008**：正文驻留有界（预算淘汰）。
- **REQ-009**：字节预算/阈值策略生效（R-01）。
- **AC-005**：回填引用一致。
- **AC-008**：环形淘汰语义与顺序不变。
- **AC-009**：全量正文未导致内存无界增长。

## 验收
- [ ] `node --test tests/store.test.mjs` 全绿（由 **butler-tester** 执行）
- [ ] update 引用一致 / 事件 / 未命中返回 false 均断言
- [ ] 预算淘汰顺序与 `evicted` 正确；pending 超时可终止
- [ ] 既有用例无回归；lint: PASS

<!-- butler:covers DEL-003 REQ-003 REQ-005 REQ-008 REQ-009 AC-005 AC-008 AC-009 -->
