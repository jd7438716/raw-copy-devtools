---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-011
depends-on: TASK-006, TASK-007, TASK-008
agent: butler-qa
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次十一（测试用例）
covers: [DEL-013]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-013）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§11）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/checklist.md（§B/§C 边界项）
---

# TASK-011: 测试用例（文档 / 脚本）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖测试用例交付物。

## 涉及文件
- `tests/test-cases.md`（**new** — 覆盖 AC-001..AC-022 的用例矩阵 + 异常/边界）
- `tests/README.md`（**new** — 执行方式 / 存放路径 / 格式）

## 实现要点
1. 用例逐条绑定 AC/REQ（story↔rule↔test 三绑定）。
2. 覆盖 checklist §C 全部边界：无选中复制、GET/HEAD 空体、204/304、非文本体、状态码 0/失败、第 1000/1001 条、并发竞态、超长 URL、阈值边界、失焦降级、DevTools 重开清空、多 target、WebSocket、非法 Base64、重复点击。
3. 明确可执行脚本 vs 手工步骤的标注。

## AC 引用
- **DEL-013**：测试用例（文档/脚本）。
- 关联 **AC-019**：交付物齐全（测试用例为必交项，另见 TASK-015）。

## 验收
- [ ] `tests/test-cases.md` / `tests/README.md` 存在
- [ ] 用例覆盖 AC-001..AC-022 与 checklist §C 边界项
- [ ] build: N/A；test: 自检（用例格式与覆盖度）

<!-- butler:covers DEL-013 -->
