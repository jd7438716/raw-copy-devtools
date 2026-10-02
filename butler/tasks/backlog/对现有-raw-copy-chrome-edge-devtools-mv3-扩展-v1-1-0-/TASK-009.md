---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-001 TASK-006 TASK-007
agent: butler-rf-fixer
estimate: S
weight: standard
covers: DEL-011 REQ-005 REQ-007 REQ-013 AC-003 AC-005 AC-008
---

# TASK-009: ② A/B 双按钮产物 golden 断言 + 批量入口等价/边界

<!-- butler:covers DEL-011 REQ-005 REQ-007 REQ-013 AC-003 AC-005 AC-008 -->

## 目标
用冻结 golden 固定 ② 与批量边界：A/B 双按钮各自产物逐字符 === 冻结 `formatter.buildCopyText` oracle；批量入口 N=1 委托单选逐字符一致、N≥2 恰 N 段无跨条混淆。

## 涉及文件
- `tests/formatter.test.mjs`（新增断言）
- `tests/bulkformatter.test.mjs`（新增入口等价 / 边界断言）

## 冻结/禁止
- `formatter.js` / `bulkformatter.js` **冻结不可改**；本 TASK 只加测试断言。
- 断言必须**逐字符**（`assert.equal`），不得用包含/近似。

## 实施要点
1. `tests/formatter.test.mjs`：新增「模式 A 按钮产物 === golden A」「模式 B 按钮产物 === golden B」逐字符用例（以 `buildCopyText(record, MODE_A/MODE_B)` 为单一真源）。
2. `tests/bulkformatter.test.mjs`：
   - N=1 输出 === 对应单选 `buildCopyText`（模式 A/B 分别）。
   - N≥2 段数 === N，恰含 N 个 `===== #i/N =====`，段序 === 可见序。
   - 边界：0 条（空数组）→ 空串；段 i 不含其他段标识（无跨条混淆）。
3. 与 TASK-007 的「默认 A」一致：批量缺省 mode → MODE_A。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-011 | `tests/formatter.test.mjs`（及 bulkformatter）模式 A/B 双按钮产物与冻结 golden 逐字符断言 |
| REQ-005 | 0/1/N 边界断言 |
| REQ-007 | A/B 产物字节契约不变（golden） |
| REQ-013 | 回归网之「②双按钮 golden」 |
| AC-003 | 入口等价（批量 N=1 委托单选逐字符） |
| AC-005 | 0 条空串 / 1 条 === 单选 / N 条 N 段无混淆 |
| AC-008 | 默认 A；A/B 各自产物与冻结 golden 逐字符一致 |

## 验收
- [ ] test: PASS（`node --test tests/formatter.test.mjs tests/bulkformatter.test.mjs`）
- [ ] golden 断言使用冻结 oracle，非自造期望
- [ ] 段数/标记数/段序断言全部通过

## 备注
- 依赖 TASK-007（接线后语义确认）、TASK-006（文案不影响产物但同批）、TASK-001（批量与多选语义）。
