---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
phase: ⑤ converge（收敛·执行后补齐，只增不改）
node: converge
agent: butler-iteration-manager
runId: run_muqbjtbn_bpv8j3
date: 2026-10-02
mode: add-only (只增不改)
gaps: 1
appended: 1
spec_ids_total: 80
covered_ids_before: 80
covered_ids_after: 80
gap_ids: [AC-018]
sources:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/captain-execution.md
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/test-results.md  # 不存在（tester 节点未运行）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/sec-audit.md     # 不存在（secaudit 节点未运行）
  - butler/tasks/backlog/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/TASK-*.md
outputs:
  - butler/tasks/backlog/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/TASK-017.md
---

# 收敛·执行后补齐报告（convergence.md）— 新建 Chrome/Edge DevTools MV3 扩展

> 模式：**只增不改**。本节点只做两件事 ——（1）对 `spec.json` 的全部 spec ID 与
> `butler/tasks/backlog/<slug>/TASK-*.md` 的 `covers` 并集做**确定性交叉对账**（抽取实现与引擎同源
> `butler2/lib/spec-schema.ts#parseCovers`）；（2）在**执行完成后**，叠加 `captain-execution.md`
> 与测试/安全报告，找出「**未被 `covers` 覆盖 / 执行中被判 blocked / 被测试或安全报告标为未完成**」
> 的 spec ID，**仅对其追加新 `TASK-*.md`**。
> **未修改/删除任何既有 TASK（16 个），未改动任何源码。**
>
> 本轮为**执行后补跑**：上一版本文件（backlog 为空时点）记 `gaps: 80 / appended: 15`；
> 中层复跑（16 TASK 就位）记 `gaps: 0 / appended: 0`。**本轮并入执行产物后**，`covers` 覆盖仍为
> **80/80（缺口 0）**，但执行报告新暴露出 **AC-018 浏览器级 E2E 未完成** → **gaps: 1 / appended: 1**。

## 0. 结论（机器可读）

```yaml
gaps: 1             # 三条判据并集命中的 spec ID 数（covers 缺口 0 + 执行未完成 1）
appended: 1         # 本轮追加的 TASK-*.md 文件数
spec_ids_total: 80
covered_ids_before: 80   # 既有 TASK-*.md covers 并集（16 个文件）
covered_ids_after: 80    # 追加 TASK-017 后仍为 80（AC-018 原已被覆盖，本次补的是"验证侧未完成"）
gap_ids: [AC-018]
```

**三条判据逐条求并：**

| # | 判据 | 命中 spec ID | 数量 |
|---|------|--------------|:---:|
| 一 | 未被 `covers` 覆盖（`spec.json ∖ ∪covers`） | — | 0 |
| 二 | 执行中被判 `blocked`（`captain-execution.md` 全表） | — | 0 |
| 三 | 被测试/执行报告标为**未完成** | `AC-018` | 1 |
| | **并集 `gaps`** | **`AC-018`** | **1** |

## 1. spec ID 全量枚举（80）

真源：`butler/spec/<slug>/spec.json` — `items[]`（与 `spec.md` 人读镜像一致）。

| 类别 | ID（共 80） | 数量 |
|------|-------------|:---:|
| US  | `US-001` `US-002` `US-003` `US-004` | 4 |
| DEL | `DEL-001`…`DEL-018` | 18 |
| REQ | `REQ-001`…`REQ-036` | 36 |
| AC  | `AC-001`…`AC-022` | 22 |

计数校验：US=4 + DEL=18 + REQ=36 + AC=22 = **80**。

## 2. 交叉对账方法（真源与候选）

| 项 | 值 |
|----|----|
| 真源（spec） | `butler/spec/<slug>/spec.json` — `items[]`，共 **80** ID |
| 候选（covers） | `butler/tasks/backlog/<slug>/TASK-*.md` 的 `covers`（frontmatter **单行** + 文末首个 `<!-- butler:covers … -->`，两处逐字一致） |
| 抽取实现 | 忠实复刻引擎 `parseCovers`：仅**首个** HTML 追溯块 + frontmatter **单行** `covers:` 值 |
| 判据一 | 规范集合差 `want ∖ got`（未覆盖）与 `got ∖ want`（越界） |
| 判据二 / 三 | 扫描 `captain-execution.md`（执行报告）+ `test-results.md` / `sec-audit.md`（若存在）+ `tests/test-cases.md`，抽取被标 `blocked` / `未完成` / `⏳ 待 E2E` 的 spec ID |

**本轮实跑确定性核验**（node 内联脚本，零落盘，只读 TASK 文件）：

```
spec total: 80
task files: 17 (16 既有 + 本轮追加 TASK-017)
covered unique: 80
GAPS: []          ← want ∖ got = ∅
EXTRA: []         ← got ∖ want = ∅
```

## 3. 判据一：`covers` 覆盖对账（80/80 全覆盖，缺口 0）

| # | spec ID | type | 承载 TASK | 是否被 covers 覆盖 |
|---|---------|------|-----------|:---:|
| 1 | `US-001` | data | TASK-006 | ✅ |
| 2 | `US-002` | data | TASK-006 | ✅ |
| 3 | `US-003` | data | TASK-006 | ✅ |
| 4 | `US-004` | data | TASK-006 | ✅ |
| 5 | `REQ-001` | ui | TASK-001 | ✅ |
| 6 | `REQ-002` | api | TASK-003 | ✅ |
| 7 | `REQ-003` | api | TASK-003 | ✅ |
| 8 | `REQ-004` | data | TASK-003 | ✅ |
| 9 | `REQ-005` | ui | TASK-002 | ✅ |
| 10 | `REQ-006` | ui | TASK-004 | ✅ |
| 11 | `REQ-007` | ui | TASK-004 | ✅ |
| 12 | `REQ-008` | ui | TASK-004 | ✅ |
| 13 | `REQ-009` | ui | TASK-004 | ✅ |
| 14 | `REQ-010` | ui | TASK-005 | ✅ |
| 15 | `REQ-011` | ui | TASK-005 | ✅ |
| 16 | `REQ-012` | ui | TASK-002 | ✅ |
| 17 | `REQ-013` | ui | TASK-002 | ✅ |
| 18 | `REQ-014` | data | TASK-006 | ✅ |
| 19 | `REQ-015` | data | TASK-006 | ✅ |
| 20 | `REQ-016` | data | TASK-006 | ✅ |
| 21 | `REQ-017` | data | TASK-006 | ✅ |
| 22 | `REQ-018` | data | TASK-006 | ✅ |
| 23 | `REQ-019` | data | TASK-006 | ✅ |
| 24 | `REQ-020` | data | TASK-006 | ✅ |
| 25 | `REQ-021` | data | TASK-008 | ✅ |
| 26 | `REQ-022` | data | TASK-008 | ✅ |
| 27 | `REQ-023` | data | TASK-008 | ✅ |
| 28 | `REQ-024` | data | TASK-008 | ✅ |
| 29 | `REQ-025` | ui | TASK-007 | ✅ |
| 30 | `REQ-026` | ops | TASK-001 | ✅ |
| 31 | `REQ-027` | ops | TASK-009 | ✅ |
| 32 | `REQ-028` | ops | TASK-009 | ✅ |
| 33 | `REQ-029` | ops | TASK-004 | ✅ |
| 34 | `REQ-030` | ops | TASK-001 | ✅ |
| 35 | `REQ-031` | ops | TASK-014 | ✅ |
| 36 | `REQ-032` | ops | TASK-014 | ✅ |
| 37 | `REQ-033` | ui | TASK-002, TASK-016 | ✅ |
| 38 | `REQ-034` | ops | TASK-007 | ✅ |
| 39 | `REQ-035` | api | TASK-003 | ✅ |
| 40 | `REQ-036` | api | TASK-001 | ✅ |
| 41 | `DEL-001` | api | TASK-001 | ✅ |
| 42 | `DEL-002` | ui | TASK-002 | ✅ |
| 43 | `DEL-003` | api | TASK-003 | ✅ |
| 44 | `DEL-004` | ui | TASK-004 | ✅ |
| 45 | `DEL-005` | ui | TASK-005 | ✅ |
| 46 | `DEL-006` | data | TASK-006 | ✅ |
| 47 | `DEL-007` | api | TASK-007 | ✅ |
| 48 | `DEL-008` | data | TASK-008 | ✅ |
| 49 | `DEL-009` | ops | TASK-001 | ✅ |
| 50 | `DEL-010` | ui | TASK-009 | ✅ |
| 51 | `DEL-011` | ops | TASK-010 | ✅ |
| 52 | `DEL-012` | ops | TASK-010 | ✅ |
| 53 | `DEL-013` | verify | TASK-011 | ✅ |
| 54 | `DEL-014` | ops | TASK-012 | ✅ |
| 55 | `DEL-015` | ops | TASK-014 | ✅ |
| 56 | `DEL-016` | ops | TASK-014 | ✅ |
| 57 | `DEL-017` | ui | TASK-013 | ✅ |
| 58 | `DEL-018` | ops | TASK-015 | ✅ |
| 59 | `AC-001` | verify | TASK-001 | ✅ |
| 60 | `AC-002` | verify | TASK-003 | ✅ |
| 61 | `AC-003` | verify | TASK-004 | ✅ |
| 62 | `AC-004` | verify | TASK-005 | ✅ |
| 63 | `AC-005` | verify | TASK-006 | ✅ |
| 64 | `AC-006` | verify | TASK-006 | ✅ |
| 65 | `AC-007` | verify | TASK-006 | ✅ |
| 66 | `AC-008` | verify | TASK-009 | ✅ |
| 67 | `AC-009` | verify | TASK-001 | ✅ |
| 68 | `AC-010` | verify | TASK-008 | ✅ |
| 69 | `AC-011` | verify | TASK-007 | ✅ |
| 70 | `AC-012` | verify | TASK-002 | ✅ |
| 71 | `AC-013` | verify | TASK-003 | ✅ |
| 72 | `AC-014` | verify | TASK-006 | ✅ |
| 73 | `AC-015` | verify | TASK-006 | ✅ |
| 74 | `AC-016` | verify | TASK-002, TASK-016 | ✅ |
| 75 | `AC-017` | verify | TASK-014 | ✅ |
| 76 | `AC-018` | verify | TASK-001 **+ TASK-017（本轮补验证侧）** | ✅ |
| 77 | `AC-019` | verify | TASK-015 | ✅ |
| 78 | `AC-020` | verify | TASK-009 | ✅ |
| 79 | `AC-021` | verify | TASK-004 | ✅ |
| 80 | `AC-022` | verify | TASK-007 | ✅ |

- `∪covers` = `{US-001..004, DEL-001..018, REQ-001..036, AC-001..022}` → 覆盖 **80/80**。
- 双向差集：`spec_ids − ∪covers = ∅`；`∪covers − spec_ids = ∅`。**判据一：gaps = 0。**

## 4. 判据二：执行中被判 `blocked`（0）

真源：`butler/spec/<slug>/captain-execution.md` §1 执行结果表（16/16 done）。

- TASK-001..TASK-016 **全部 `✅ done`**，无 `blocked` / `failed` / `skipped` 记录。
- §5「偏差与裁决」4 项（TASK-006 模式 A 渲染、TASK-011 路径、`package.json` test 脚本、TASK-010 文档路径）
  均为**已收敛并记录裁决**的偏差，**不构成任何 spec ID 的 blocked**。
- `dependency-graph.md` §4 拓扑校验：DAG 无环，无被依赖阻塞的悬挂节点。
- **判据二：gaps = 0。**

## 5. 判据三：测试/安全报告标为未完成（1）

### 5.1 报告可用性（如实记录缺失）

| 报告 | 文件 | 状态 |
|------|------|------|
| 测试报告 | `butler/spec/<slug>/test-results.md` | **不存在**（`tester` 节点未运行）→ 无测试报告可标"未完成" |
| 安全报告 | `butler/spec/<slug>/sec-audit.md` | **不存在**（`secaudit` 节点未运行）→ 无安全报告可标"未完成" |

> 两项均记为 `[MISSING_CONTEXT]`，**不据此臆造缺口**。执行报告 `captain-execution.md` 与
> 测试用例矩阵 `tests/test-cases.md`（TASK-011 产物，属测试侧文档）作为替代信号。

### 5.2 命中项（逐条依据）

| spec ID | 判据 | 依据（逐条） |
|---------|------|--------------|
| **`AC-018`**（在最新版 Chrome 与 Edge 均可正常安装与使用 / REQ-030） | 三 | ① `captain-execution.md` **§6 未完成项** 明确写：「浏览器级 E2E（**AC-018** 双端 Chrome/Edge 安装冒烟、E2E-01..16）：环境无 GUI 浏览器，**未执行**」；② `tests/test-cases.md` **TC-AC-018** 状态列 = `⏳ 待 E2E（Chromium 双端冒烟）`（全表唯一完全未打勾的 AC）；③ `butler/memory/qa-strategy.md` **§5 遗留/待 E2E** 列「AC-018 Chrome/Edge 双端安装…只能真实 E2E」。→ 实现侧虽由 TASK-001 `covers`，**验证侧从未执行**。 |

**未命中的相邻项（明确排除，避免误报）：**

- `AC-001/002/008/010/011/012/017/020/021/022` 在 `tests/test-cases.md` 中为 `◐`（**部分**），其非浏览器部分已有
  机械证据（单测/门禁脚本），不属"未完成"。
- `AC-017` 体积、`AC-019` ZIP 存在性：`test-cases.md` 尾部注记为「依赖 DEL-015」，而 `captain-execution.md` §3
  已实跑 `node scripts/package.mjs` PASS（130.53KB<200KB、21 条目读回）→ **已闭环**，不追补。
- `REQ-013`（P2 附加按钮）：`design.md` §10.5 / `stories-written.md` GAP-4 显式声明"本期不实现、不阻塞"，
  属**范围裁剪**而非未完成，判据未命中（且已由 TASK-002 `covers`）。

- **判据三：gaps = 1（`AC-018`）。**

## 6. 命中清单与追加（Append List，appended = 1）

| 未完成 spec ID | 追加文件 | 承载 agent | weight | 说明 |
|----------------|----------|------------|:------:|------|
| `AC-018` | `butler/tasks/backlog/<slug>/TASK-017.md` | butler-e2e-verifier | heavy | 浏览器级 E2E：Chrome/Edge 双端安装 + 面板注册 + 最小复制冒烟；`covers: [AC-018]` |

- 追加文件**含 `covers`**（frontmatter 单行 `covers: [AC-018]` + 文末 `<!-- butler:covers AC-018 -->`，两处一致）。
- 追加文件为**新文件**：未覆盖/未修改任何既有 TASK；为验证类 TASK，**不改动任何源码**。
- `covered_ids_after` 仍为 80：AC-018 原本已在 TASK-001 的 `covers` 内，本次补的是**验证侧执行闭环**，
  非覆盖缺口（`covers` 集合不变）。

## 7. 既有 TASK 覆盖分布（只读盘点，未修改）

| TASK | covers 数 | covers |
|------|:---:|--------|
| TASK-001 | 9 | DEL-001, DEL-009, REQ-001, REQ-026, REQ-030, REQ-036, AC-001, AC-009, AC-018 |
| TASK-002 | 7 | DEL-002, REQ-005, REQ-012, REQ-013, REQ-033, AC-012, AC-016 |
| TASK-003 | 7 | DEL-003, REQ-002, REQ-003, REQ-004, REQ-035, AC-002, AC-013 |
| TASK-004 | 8 | DEL-004, REQ-006, REQ-007, REQ-008, REQ-009, REQ-029, AC-003, AC-021 |
| TASK-005 | 4 | DEL-005, REQ-010, REQ-011, AC-004 |
| TASK-006 | 17 | DEL-006, REQ-014..020, AC-005..007, AC-014, AC-015, US-001..004 |
| TASK-007 | 5 | DEL-007, REQ-025, REQ-034, AC-011, AC-022 |
| TASK-008 | 6 | DEL-008, REQ-021, REQ-022, REQ-023, REQ-024, AC-010 |
| TASK-009 | 5 | DEL-010, REQ-027, REQ-028, AC-008, AC-020 |
| TASK-010 | 2 | DEL-011, DEL-012 |
| TASK-011 | 1 | DEL-013 |
| TASK-012 | 1 | DEL-014 |
| TASK-013 | 1 | DEL-017 |
| TASK-014 | 5 | DEL-015, DEL-016, REQ-031, REQ-032, AC-017 |
| TASK-015 | 2 | DEL-018, AC-019 |
| TASK-016 | 2 | REQ-033, AC-016 |
| **TASK-017（本轮追加）** | **1** | **AC-018**（验证侧） |

## 8. 约束遵守声明（只增不改）

- [x] 未修改、未删除任何既有 `TASK-*.md`（16 个，只读盘点）
- [x] 仅**追加 1 个**新 `TASK-*.md`（`TASK-017.md`，命中 `AC-018`）
- [x] 未修改 `spec.json` / `spec.md` / `requirement.md` / `captain-execution.md` / 其它 spec 目录文件
- [x] 未改动任何代码（未触碰 `extension/**`、`tests/**`、`scripts/**`；未运行 DAG、未执行 git 写操作）
- [x] 本轮写入 = 追加 `TASK-017.md` + 更新本文件 `convergence.md`（`gaps: 1 / appended: 1`）+ 刷新加载日志

## 9. 证据锚（working tree）

- `butler/spec/<slug>/spec.json`（80 items：US-001..004 / DEL-001..018 / REQ-001..036 / AC-001..022）
- `butler/tasks/backlog/<slug>/TASK-001..016.md`（16 个既有 TASK；`covers` 并集 = 80/80，逆向零越界）
- `butler/spec/<slug>/captain-execution.md`（§1 十六/十六 done；§6 唯一未完成项 = AC-018 浏览器级 E2E）
- `tests/test-cases.md`（TC-AC-018 = `⏳ 待 E2E`；其余为 `✅`/`◐`）
- `butler/spec/<slug>/test-results.md`、`sec-audit.md`（均不存在 → `[MISSING_CONTEXT]`）
- 追加产物：`butler/tasks/backlog/<slug>/TASK-017.md`（`covers: [AC-018]`）

---

*收敛人: butler-iteration-manager（质量迭代管理员）｜只增不改：未修改/删除任何既有 TASK、仅追加 TASK-017、未改动任何源码*
