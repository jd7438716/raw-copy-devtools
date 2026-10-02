---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-004 TASK-006 TASK-009 TASK-010
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-016 REQ-014 AC-017
---

# TASK-013: `tests/test-cases.md` + `tests/README.md` 用例与运行说明同步

<!-- butler:covers DEL-016 REQ-014 AC-017 -->

## 目标
测试文档与用例同批同步：清理 P2（仅复制请求/响应）相关用例，补齐新增场景（面板级接线、混合修饰键、入口等价、② A/B 双按钮、③ 删除断言），更新文件清单与用例计数。

## 涉及文件
- `tests/test-cases.md`（修改，含 `:91` P2 用例行）
- `tests/README.md`（修改）

## 冻结/禁止
- 文档描述必须与实际测试实现一致（不得写未实现的用例）。
- 只改测试文档，不改测试代码（代码由 TASK-004/009/010 承担）。

## 实施要点
1. `test-cases.md`：
   - 删除 P2 分段复制相关用例（`TC-ENH-CTX-06` 等）或标注「③ 已移除」。
   - 补充：面板级接线（多选态右键 → 批量项 → N 段）、混合修饰键并集、入口等价逐字符、② A/B 双按钮 golden、③ 无 P2 断言。
   - 更新 AC 编号引用（对齐本 spec 的 AC-001..017）。
2. `tests/README.md`：更新「测试文件清单 / 用例数」（基线 264 + 新增），说明新增用例落点与 `covers` 声明约定。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-016 | `tests/test-cases.md` 与 `tests/README.md` 用例与运行说明同步（清理 P2 / 补新场景） |
| REQ-014 | 文档修订（tests 文档） |
| AC-017 | 测试文档与 ADR/运行时一致（同批交付） |

## 验收
- [ ] 文档无 P2 已删用例残留或已明确标注移除
- [ ] 新增场景与 TASK-004/009/010 实现一一对应
- [ ] 用例计数与实际 `npm test` 输出一致

## 备注
- 依赖 TASK-004/009/010（用例就绪）与 TASK-006（键集）。
