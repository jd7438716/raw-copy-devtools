# 依赖图 — 新建 Chrome/Edge DevTools MV3 扩展

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> 真源: `butler/spec/<slug>/spec.json`（80 items）+ `butler/plan/<slug>/plan.md`（requirement/design/stories/tech-eval）
> 说明: DAG 无环；`depends-on` 见各 `TASK-N.md` frontmatter。

## 1. Mermaid 依赖图

```mermaid
graph TD
    T013[TASK-013 图标]:::root
    T016[TASK-016 i18n]:::root
    T012[TASK-012 LICENSE]:::root

    T001[TASK-001 MV3清单+devtools注册]
    T002[TASK-002 面板UI外壳]
    T003[TASK-003 捕获+环形缓存]
    T004[TASK-004 渲染+过滤]
    T005[TASK-005 单条选中]
    T006[TASK-006 复制拼接核心★]
    T007[TASK-007 Clipboard+Toast]
    T008[TASK-008 大响应/二进制/Base64]
    T009[TASK-009 隐私页+零网络门禁]
    T010[TASK-010 安装/使用说明]
    T011[TASK-011 测试用例]
    T014[TASK-014 打包ZIP+体积门禁]
    T015[TASK-015 里程碑+交付验收]

    T013 --> T001
    T016 --> T002
    T001 --> T002
    T001 --> T003
    T001 --> T009
    T001 --> T010
    T003 --> T004
    T002 --> T004
    T004 --> T005
    T005 --> T006
    T002 --> T006
    T006 --> T007
    T002 --> T007
    T006 --> T008
    T002 --> T008
    T004 --> T011
    T005 --> T011
    T006 --> T011
    T007 --> T011
    T008 --> T011
    T009 --> T011
    T001 --> T014
    T002 --> T014
    T003 --> T014
    T004 --> T014
    T005 --> T014
    T006 --> T014
    T007 --> T014
    T008 --> T014
    T009 --> T014
    T013 --> T014
    T016 --> T014
    T010 --> T015
    T011 --> T015
    T012 --> T015
    T014 --> T015

    classDef root fill:#fff3e0,stroke:#e65100;
    classDef heavy fill:#ffebee,stroke:#c62828;
    class T006,T001,T009,T014 heavy;
```

## 2. 关键路径（最长链）

`TASK-013 → TASK-001 → TASK-002 → TASK-004 → TASK-005 → TASK-006 → TASK-007/TASK-008 → TASK-011 → TASK-015`

以及交付收口链：`... → TASK-014 → TASK-015`。

- 关键路径含 AC-007 命门（TASK-006）与安全门禁（TASK-001/009/014），任何一环失败都阻塞 `TASK-015` 交付验收。
- `TASK-010 / TASK-012 / TASK-016 / TASK-013` 为可并行起点。

## 3. 并行批次（拓扑分层）

| 批次 | 可并行 TASK |
|:----:|-------------|
| L0 | TASK-012, TASK-013, TASK-016 |
| L1 | TASK-001 |
| L2 | TASK-002, TASK-003, TASK-009, TASK-010 |
| L3 | TASK-004 |
| L4 | TASK-005 |
| L5 | TASK-006 |
| L6 | TASK-007, TASK-008, TASK-011 |
| L7 | TASK-014 |
| L8 | TASK-015 |

> 注：`TASK-006` 依赖 `TASK-005`（选中）与 `TASK-002`（面板接线）；`TASK-008` 在 `TASK-006` 之后接入 content 分类（formatter 可先"body 原样直通"）。无循环依赖。

## 4. 循环依赖检测

对全部 `depends-on` 边做拓扑校验：**无环（DAG）**。
