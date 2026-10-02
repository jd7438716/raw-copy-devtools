---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
gaps: 0
appended: 0
spec_total: 35
covered_total: 35
generated: 2026-10-02
by: butler-iteration-manager
---

# 收敛·补齐报告 — 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢

> 目标：逐一枚举 `spec.json` 的每个 ID，为**未被任何 TASK 的 `covers` 覆盖**的 ID 追加新 TASK。
> 约束：只增不改（不改/删已有 TASK、不改代码）。

## 结论

- `spec.json` 共 **35** 个 ID（REQ×14 / DEL×9 / AC×12）。
- 已有 9 个 TASK 的 `covers` 并集 = **35**，与 spec ID 集合**完全相等**。
- **未被覆盖（gaps） = 0** → **appended = 0**，无需追加任何 TASK。
- 无「幽灵覆盖」（covers 中出现 spec 不存在的 ID）→ extra = 0。

## 覆盖矩阵（ID → 覆盖它的 TASK）

| ID | 覆盖 TASK |
|----|-----------|
| REQ-001 | TASK-002 |
| REQ-002 | TASK-002 |
| REQ-003 | TASK-001, TASK-002, TASK-007 |
| REQ-004 | TASK-002, TASK-003 |
| REQ-005 | TASK-001, TASK-004, TASK-007 |
| REQ-006 | TASK-004 |
| REQ-007 | TASK-004 |
| REQ-008 | TASK-001, TASK-002, TASK-007 |
| REQ-009 | TASK-001, TASK-007 |
| REQ-010 | TASK-008 |
| REQ-011 | TASK-005 |
| REQ-012 | TASK-005, TASK-006 |
| REQ-013 | TASK-006 |
| REQ-014 | TASK-002, TASK-006 |
| DEL-001 | TASK-002 |
| DEL-002 | TASK-004 |
| DEL-003 | TASK-001, TASK-007 |
| DEL-004 | TASK-003 |
| DEL-005 | TASK-005 |
| DEL-006 | TASK-006 |
| DEL-007 | TASK-008 |
| DEL-008 | TASK-008 |
| DEL-009 | TASK-008 |
| AC-001 | TASK-002 |
| AC-002 | TASK-006, TASK-009 |
| AC-003 | TASK-004 |
| AC-004 | TASK-002 |
| AC-005 | TASK-001, TASK-002, TASK-007 |
| AC-006 | TASK-002, TASK-003 |
| AC-007 | TASK-004 |
| AC-008 | TASK-001, TASK-004, TASK-007 |
| AC-009 | TASK-001, TASK-007 |
| AC-010 | TASK-005, TASK-006 |
| AC-011 | TASK-005, TASK-009 |
| AC-012 | TASK-008 |

## 未覆盖清单（gaps）

（空）

## 追加的 TASK

（无 —— appended = 0）

## 校验方法

1. 从 `spec.json` 的 `items[].id` 抽取全部 ID（35 个，去重）。
2. 扫描 `butler/tasks/backlog/<slug>/TASK-*.md` frontmatter 的 `covers: [...]`，取并集（35 个）。
3. 集合差：`spec_ids \ covers` = 空；`covers \ spec_ids` = 空。
4. 判定：gaps = 0，appended = 0，覆盖完整，收敛达成。
