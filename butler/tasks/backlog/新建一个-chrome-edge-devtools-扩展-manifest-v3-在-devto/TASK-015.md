---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-015
depends-on: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012, TASK-013, TASK-014
agent: butler-doc-writer
estimate: S
weight: light
phase: ⑤ 收敛·执行后补齐 / 批次十五（里程碑 + 交付物齐全验收）
covers: [DEL-018, AC-019]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-018/AC-019）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§4.5 里程碑 M1-M5；§11 交付物清单）
---

# TASK-015: 里程碑交付节奏 + 交付物齐全验收

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖里程碑计划与「交付物齐全」总验收。

## 涉及文件
- `docs/MILESTONES.md`（**new** — M1-M5 交付节奏表）
- `docs/DELIVERABLES-CHECKLIST.md`（**new** — AC-019 交付物齐全清单，逐项勾对）

## 实现要点
1. 里程碑：M1 面板框架 / M2 捕获与列表 / M3 复制拼接 / M4 搜索过滤与大响应 / M5 测试打包隐私交付。
2. AC-019 交付物齐全核对：完整源码、打包 ZIP、安装说明、使用说明、隐私政策页面、测试用例、LICENSE、图标 —— 逐项对应 DEL-016/015/011/012/010/013/014/017。
3. 每项给可判定判据（存在性 + 内容级），消除 checklist A 段「仅存在性检查」缺口。

## AC 引用
- **DEL-018**：里程碑 M1-M5 交付节奏。
- **AC-019**：交付物齐全（源码/ZIP/安装说明/使用说明/隐私政策/测试用例/LICENSE/图标）。

## 验收
- [ ] `docs/MILESTONES.md` 与 `docs/DELIVERABLES-CHECKLIST.md` 存在
- [ ] 交付物清单八项逐条可勾对，每项有可判定判据
- [ ] build: N/A；test: N/A（纯文档/清单）

<!-- butler:covers DEL-018 AC-019 -->
