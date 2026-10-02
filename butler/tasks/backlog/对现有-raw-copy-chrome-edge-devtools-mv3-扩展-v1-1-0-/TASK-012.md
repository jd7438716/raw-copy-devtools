---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: N/A
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-014 REQ-014 AC-017
---

# TASK-012: `plan.md` ADR-014 重裁（互斥条目改为一致规则 + 补「联合可满足性」核对）

<!-- butler:covers DEL-014 REQ-014 AC-017 -->

## 目标
修复 RC-3：ADR-014 原两条决策互斥，右键在多选内的保留语义未定义。将其重裁为一条一致规则并补「联合可满足性」核对说明，使设计文档与运行时（TASK-003 实现）一致。

## 涉及文件
- `butler/plan/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/plan.md`（修改 ADR-014，`:506-517`）

## 冻结/禁止
- 仅修订 ADR-014 与该增强相关的决策段落；**不改动需求目标/约束/其它 ADR**。
- 不新增未在本题范围的能力承诺。

## 实施要点
1. 重裁 ADR-014：
   - 命中行**已在多选集合内** → 右键**保留集合**（不坍缩，保留多选）。
   - 命中行**在集合外** → `selectAt` **单选替换**（保留右键定位心智）。
   - 明确「工具栏入口 ≡ 右键入口，对同一集合产物逐字符一致」。
2. 补「联合可满足性」核对：说明新规则同时满足「多选批量可达」与「右键单选定位」两诉求，不再互斥。
3. 记录 additive 扩选 anchor 契约（与 TASK-001 `extendTo` 对齐）：Ctrl+Shift 取并集、纯 Shift 保持替换。
4. 与 `contextmenu.js` 注释（TASK-002）表述一致。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-014 | `plan.md` ADR-014 重裁 + 补「联合可满足性」核对说明 |
| REQ-014 | 文档修订（ADR） |
| AC-017 | ADR-014 互斥条目修正为一致规则且记录「联合可满足性」核对 |

## 验收
- [ ] ADR-014 表述与 TASK-003 运行时行为一致（已选保留 / 未选替换）
- [ ] 含「联合可满足性」核对段落
- [ ] 无残留互斥表述

## 备注
- 「contextmenu 注释与运行时一致」由 TASK-002（DEL-015）承担；二者共同满足 AC-017。
