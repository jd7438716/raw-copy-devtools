---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-001
depends-on: N/A
agent: butler-rf-fixer
estimate: M
weight: standard
phase: 修复·方案A（store 原地回填 + pending 注册表 + 字节预算淘汰）
covers: [DEL-003, REQ-003, REQ-005, REQ-008, REQ-009, AC-005, AC-008, AC-009]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-003 / REQ-003 / REQ-005 / REQ-008 / REQ-009 / AC-005 / AC-008 / AC-009）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · store.js:105-163,213-224）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§8 B 维 / RC-3b / sec-audit R-01）
---

# TASK-001: store.js 增量回填 / pending 注册表 / 字节预算淘汰

> 方案 A 的基础设施层。`capture` 与 `panel` 都依赖本 TASK 新增的 `update` / pending / 预算 API，
> 故为其余实现 TASK 的前置。

## 涉及文件
- `extension/src/store.js`（修改）

## 实现要点
1. **原地回填（引用一致，硬约束 C-4 / AC-005）**：新增 `update(id, patch) → boolean`。
   - 从 `index` 取到**同一条**记录对象，`Object.assign(record, patch)` 原地合并；保持 `store.get(id)` 返回同一引用。
   - 命中 → 返回 `true`，并 `notify({ type: 'update', id, record, patch })`。
   - 未命中（记录已被淘汰）→ 返回 `false`，**不得**创建幽灵记录、不得复活陈旧 id。
2. **pending 注册表（复制竞态的基础，REQ-006 由 panel 消费）**：
   - `markPending(id)` / `resolvePending(id)` / `rejectPending(id[, reason])` / `awaitPending(id, timeoutMs) → Promise`。
   - `awaitPending` 默认超时 **3000ms**；已 resolve 的记录再次 await 立即返回；超时以可区分错误/值返回，**不得**永久挂起。
   - 回填完成 / 失败 / 记录被淘汰（`clear`、环形淘汰）时必须 resolve/reject 对应 pending，避免悬空 Promise。
3. **字节预算（sec-audit R-01 / C-6 / REQ-008 / REQ-009）**：
   - `createStore({ capacity = 1000, maxBytes = 64 * 1024 * 1024 })`；新增 `bytesInUse()`。
   - 记录入账（`add` 与 `update` 增量）后若 `bytesInUse() > maxBytes` → 按「淘汰最旧」兜底，复用既有淘汰链路。
   - 淘汰必须走既有 `evicted` 事件语义（供 `selection.onEvict` 清选中）；**不得**改变 1000 条环形顺序与淘汰语义（C-5 / AC-008）。
   - 默认 `maxBytes` 与阈值须可配置（pre-mortem：默认值过小会误淘汰刚选中项）。
4. **契约保持**：`add / get / all / size / clear / subscribe` 签名与语义不变；`add` 事件仍为 `{type:'add', id, record, evicted}`；纯逻辑、零第三方依赖、Node 可直接 import 单测。

## 追溯（covers）
- **DEL-003**：store 同一条记录回填 / 订阅刷新支持。
- **REQ-003**：回填写到 store 中同一条记录（引用一致），复制读最新值。
- **REQ-005**：回填触发订阅事件；不打乱 1000 条环形缓冲顺序与淘汰语义。
- **REQ-008**：不长期驻留正文；由 `maxBytes` 淘汰保证驻留有界。
- **REQ-009**：getContent 全量取正文须结合字节预算/阈值策略（R-01）。
- **AC-005**：回填后复制读取到最新正文（同一条 store 记录）。
- **AC-008**：回填触发刷新，环形淘汰语义与顺序不变。
- **AC-009**：全量取正文未导致内存无界增长。

## 验收
- [ ] `store.update(id, patch)` 原地合并、返回 `true`、emit `{type:'update'}`；不存在 id → `false` 且不创建
- [ ] `awaitPending` resolve/reject/超时三路径均可终止，淘汰/clear 时无悬空 Promise
- [ ] `maxBytes` 超限淘汰最旧，环形顺序与 `evicted` 事件语义不变
- [ ] build: N/A（纯模块）；test: `tests/store.test.mjs` 由 TASK-007 覆盖；lint: PASS
- [ ] 由 **butler-tester** 执行相关单测（宪法 §19/§20）

<!-- butler:covers DEL-003 REQ-003 REQ-005 REQ-008 REQ-009 AC-005 AC-008 AC-009 -->
