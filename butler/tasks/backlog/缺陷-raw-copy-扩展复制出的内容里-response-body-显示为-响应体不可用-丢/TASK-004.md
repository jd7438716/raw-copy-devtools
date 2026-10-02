---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-004
depends-on: TASK-001, TASK-002
agent: butler-rf-fixer
estimate: M
weight: standard
phase: 修复·方案A（panel 接线 + 复制竞态 + 占位边界）
covers: [DEL-002, REQ-005, REQ-006, REQ-007, AC-003, AC-007, AC-008]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-002 / REQ-005..007 / AC-003 / AC-007 / AC-008）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · panel.js:127-157,656-668,711-756；i18n.js:98-100）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§8 A/B 维 / §10.2）
---

# TASK-004: panel.js 接线 + i18n 文案（回填刷新 / 复制竞态 / 占位边界）

> 把 capture 的异步回填接到 UI，并保证「异步未完成就点复制」不误报不可用。

## 涉及文件
- `extension/panel.js`（修改）
- `extension/src/i18n.js`（修改）

## 实现要点
1. **接线 enrich 刷新（REQ-005 / AC-008）**：
   - `installCapture({ store, onAdd: requestRefresh, onUpdate: requestRefresh })`；
   - `store.subscribe` 增加 `event.type === 'update'` 分支 → `requestRefresh()`；
   - 保留 `add` 的 `evicted → selection.onEvict` 与 `clear → selection.reset` 语义不变，**不得**打乱环形顺序（AC-008）。
2. **复制竞态（REQ-006 / AC-007）**：`onCopyClick` 在生成文本前，若该记录处于 pending →
   `await store.awaitPending(id, timeout)`（超时 ~3s）：
   - 回填成功 → 用真实正文拼接；
   - 超时 → 明确提示 `t('copy.fetchingTimeout')`，**不得**输出「（响应体不可用）」占位、不得静默输出空正文。
3. **占位边界（REQ-007 / AC-003）**：`resolveResponseBodyText` 增加 pending 分支，返回「获取中」文案（`t('content.fetching')`）而非占位；
   `t('content.unavailable')`（「（响应体不可用）」）**仅**保留给客观不可获取 / 二进制省略 / 超预算降级。
4. **i18n（zh + en 双语，`i18n.js`）**：新增 `content.fetching`（如「（正在获取响应体…）」）与 `copy.fetchingTimeout`（如「响应体仍在获取中，请稍后重试」），中英各一条，key 对齐。

## 追溯（covers）
- **DEL-002**：panel.js 接线 enrich、回填后刷新、复制竞态处理。
- **REQ-005**：回填后触发一次 UI 刷新；不打乱环形缓冲顺序与淘汰语义。
- **REQ-006**：处理异步完成前点击复制的竞态——不输出占位，等待真实正文或明确提示。
- **REQ-007**：占位仅保留给客观不可获取/二进制省略的合法场景。
- **AC-003**：占位仅出现在客观不可获取/二进制省略场景；文本类正文不再产出占位。
- **AC-007**：异步完成前点击复制不产生占位（等待真实正文或明确提示）。
- **AC-008**：回填触发 UI 刷新，1000 条环形淘汰语义与顺序不变。

## 验收
- [ ] `store` emit `update` 后面板列表/详情刷新一次
- [ ] pending 期间点击复制 → 等待真实正文；超时 → 明确提示且无占位
- [ ] 文本类正文路径不再出现「（响应体不可用）」
- [ ] `i18n.js` 中英 key 成对存在，`tests/i18n.test.mjs` 全绿
- [ ] build: N/A；test: 相关单测（由 **butler-tester** 执行）；lint: PASS

<!-- butler:covers DEL-002 REQ-005 REQ-006 REQ-007 AC-003 AC-007 AC-008 -->
