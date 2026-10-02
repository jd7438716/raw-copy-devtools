---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: N/A
agent: butler-rf-fixer
estimate: M
weight: heavy
covers: DEL-002 DEL-009 REQ-004 AC-004 AC-006
---

# TASK-001: `multiselection.js` 新增 additive `extendTo` + 混合修饰键单测

<!-- butler:covers DEL-002 DEL-009 REQ-004 AC-004 AC-006 -->

## 目标
在 `extension/src/multiselection.js` **新增** `extendTo(index)`（additive 并集扩选），修复 RC-2：Ctrl 选集后再 Ctrl+Shift 扩选会丢弃先前已选项。
**硬约束：不得改 `rangeTo` 的替换语义**（纯 Shift 替换与既有 `tests/multiselection.test.mjs:152-205` 期望必须保持全绿）。

## 涉及文件
- `extension/src/multiselection.js`（修改 + 新增导出）
- `tests/multiselection.test.mjs`（新增用例）

## 冻结/禁止
- **禁止**删除/改写 `rangeTo` 的 `selected.clear()` 替换语义（方案 B 的倒退路径，已否决）。
- **禁止**破坏既有不变量：`count() === selectedIds().length`；`selectAt` 替换、`toggleAt` 增删、`move` 清集合回落单选、`setIds` 剪枝、`onEvict` 同步移除。
- 纯逻辑、零浏览器 API、零第三方依赖，Node 可直测。

## 实施要点
1. 新增 `extendTo(index)`：
   - base = 有效 `anchorId`，否则回落 `primary.current()`；仍无 → 等价 `selectAt(index)`。
   - 按**可见列表顺序**取 `base..hit.index` 闭区间（自动跳过不可见/空槽）。
   - **并集**：`selected` 中已有成员一律保留，只 `add` 区间成员，**不 clear**。
   - 主光标指向 `hit.id`；`anchor` 保持不变（可连续扩选）。
   - 越界/未命中 → `return false`，不抛异常。
2. 在返回对象与 `default` 导出中追加 `extendTo`（签名 `(index: number) => boolean`）。
3. 仅新增方法，`rangeTo` 原样保留。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-002 | 在 `multiselection.js` 新增 additive 方法（不改 `rangeTo`） |
| DEL-009 | 新增「selectAt + toggleAt + extendTo 并集」单测 |
| REQ-004 | Ctrl 选集 + Shift 扩选 = 并集，不清空先前 Ctrl 项 |
| AC-004 | id3 不被丢弃、先前 Ctrl 已选项保留 |
| AC-006 | 混合修饰键（Ctrl / Shift / Ctrl+Shift）输出正确 |

## 验收
- [ ] lint: PASS（`node scripts/check-syntax.mjs`）
- [ ] test: PASS（`node --test tests/multiselection.test.mjs`）
  - [ ] `selectAt(2)` → `toggleAt(4)` → `extendTo(3)` 后集合含 `{2,4,3}`（并集，id3 不丢）
  - [ ] 连续 `extendTo` 并集不缩减既有集合
  - [ ] `extendTo` 无有效 anchor → 回落主光标 / 等价 `selectAt`
  - [ ] `extendTo` 越界 / 空槽 → 无变化且不抛
  - [ ] `rangeTo` 替换语义用例（152-205）零改动 PASS
- [ ] 回归: `count() === selectedIds().length` 及既有 13+ 用例全绿

## 备注
- design §2 ①-b / §3 直接后果 b；`extendTo` 与 `rangeTo` 的 anchor 契约需在 ADR-014（TASK-012）记录。
- 本 TASK 为 ① 的模型层前置，TASK-003（panel.js 分派顺序）依赖本接口。
