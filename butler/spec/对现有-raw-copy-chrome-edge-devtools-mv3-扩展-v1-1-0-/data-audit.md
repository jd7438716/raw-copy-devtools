verdict: WARN

# 数据监审报告 — `对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`

- 监审对象 run：`run_muqovhi6_a5jwzk`（dag=`fix`，status=running，当前节点 `dataAudit`）
- run.startedAt：`1790928980584` = **2026-10-02T08:16:20.584Z（本地 16:16:20 +0800）**
- 监审范围：`butler/spec/<slug>/`、`butler/plan/<slug>/`、`butler/tasks/backlog/<slug>/` 及执行类产物
- 监审方式：只读 + 独立复算（不采信 `convergence.md` 自述，自行脚本比对 ID 并集）
- 结论：**WARN** — 关键产物齐备、51/51 ID 全覆盖、新鲜度与引用均通过；存在 1 项非阻断的数据一致性缺陷（`checklist.md` 自称"未勾选"但 122/122 全部已勾选）与 1 项待观察时间戳异常。

---

## 1. 存在 / 非空 [通过]

| 产物 | 大小(bytes) | mtime(本地) | 结论 |
|---|---|---|---|
| `butler/spec/<slug>/01-root-cause.md` | 41482 | 2026-10-02 16:21:58 | OK |
| `butler/spec/<slug>/spec.json` | 11946 | 2026-10-02 16:22:50 | OK |
| `butler/spec/<slug>/spec.md` | 10766 | 2026-10-02 16:23:01 | OK |
| `butler/spec/<slug>/02-solution-design.md` | 32478 | 2026-10-02 16:27:57 | OK |
| `butler/spec/<slug>/checklist.md` | 16197 | 2026-10-02 16:27:57 | OK |
| `butler/spec/<slug>/convergence.md` | 3312 | 2026-10-02 16:31:34 | OK |
| `butler/tasks/backlog/<slug>/TASK-001..016.md` | 1673–3428 | 16:29:30–16:30:25 | OK（16 个，均非空） |
| `butler/tasks/backlog/<slug>/dependency-graph.md` | 7492 | 16:30:35 | OK |
| `butler/tasks/backlog/<slug>/weight.json` | 2098 | 16:30:41 | OK |

**未产出（范围内但 fix 管线不适用）**：`requirement.md`、`feasibility.md`、`design.md`、`stories-written.md`、`tech-evaluation.md`、`butler/plan/<slug>/plan.md`。
- 证据：`ls butler/spec/<slug>/` 无上述文件；`butler/plan/` 下无本 slug 目录。
- 影响：无。fix 管线的等价脊柱为本目录的 `01-root-cause.md`（RCA）/`02-solution-design.md`（方案）/`checklist.md`，且 `spec.json.source.refs` 引用的是**兄弟目录**既有 `butler/plan/在现有-…功能增/plan.md`（存在）。
- 建议：无需处理（属命名差异，非缺口）。

**执行类（应下游产出，尚未到）**：`captain-execution.md`/`test-results.md`/`sec-audit.md` 未产出；run 快照显示 `analyze/audit/apply/verify/secaudit/vgate/e2e/e2e_gate/learn` 均 `pending`。
- 影响：符合流程时序，非缺口。
- 建议：无。

---

## 2. ID 覆盖（追链）[通过]

独立复算（脚本扫描 16 个 TASK 的 `covers:` 行取并集，与 `spec.json.items[].id` 求差）：

- `TASK files: 16`，`covers union: 51`，`spec ids: 51`
- `missing(spec 未被覆盖) = []`
- `extra(covers 幽灵 ID) = []`

- 证据：`spec.json` REQ×16 / DEL×18 / AC×17（run `specIndex.ids` 与 `count=51` 一致）；16 个 TASK frontmatter + 内嵌 `<!-- butler:covers … -->` 注释并集 = 51。
- `02-solution-design.md §6`（第 236–306 行）声明并含 ID 覆盖矩阵（REQ 16/16、DEL 18/18、AC 17/17），逐一引用到位。
- `dependency-graph.md`（第 15–32 行）TASK→covers 表与 TASK frontmatter 完全一致。
- ID 命名均为 3 位补零（`AC-001` 式），无需 `AC-1→AC-001` 规范化。
- 影响：无 —— 计划期覆盖完整，无孤立 ID。
- 建议：无。

---

## 3. 一致性 [WARN（1 项）]

### 3.1 `spec.md` ↔ `spec.json` [通过]
- 证据：`spec.json` items = 51（REQ 16 / DEL 18 / AC 17）；`spec.md` §Items 三张表 ID 集合逐一对应同数，正文自述"与 spec.json 内容一致（机器真源 = spec.json）"。
- 影响：无。

### 3.2 `weight.json` ↔ TASK 文件集 [通过]
- 证据：`weight.json.tasks` 键 = `TASK-001…TASK-016`（16 个），与 `butler/tasks/backlog/<slug>/TASK-*.md`（16 个）一一相等；`overall=heavy`。
- 影响：无。

### 3.3 `dependency-graph.md` ↔ TASK covers [通过]
- 证据：`dependency-graph.md` 第 15–32 行表格 covers 与各 TASK frontmatter 一致；拓扑 `{T1,T2,T5,T6,T12}→…→T16→T15` 无环。
- 影响：无。

### 3.4 `checklist.md` 自述与内容矛盾 [WARN — 非阻断]
- 证据：`checklist.md` 第 5 行断言"以下全部条目**保持未勾选**"、第 163 行结论"全部条目保持未勾选"；实际全文 `- [x]` 计数 = **122**，`- [ ]` 计数 = **0**（`checklist.md` 第 12–160 行，A/B/C/D/E/F/G/H 全部小节均为已勾选态）。
- 影响：该文件自定位为"人工评审用清单"，但内容已全量预勾选，与声明的"由评审者人工勾选"相矛盾；可能误导后续评审误判为"已人工确认通过"。**不阻断** ID 覆盖/下游 TASK 生成（`checklist_gate` 已 done，`convergence` 已基于 spec/TASK 完成）。
- 建议：生成待办 `DATA-AUDIT-FIX-001`（见 §7），由 `butler-fix-analyst`/文档角色将 `checklist.md` 的勾选态与声明对齐（二选一：显式改为"自检已勾选"并移除"保持未勾选"表述，或清空为 `[ ]`）；或安排人工评审补签。**不改本产物**。

---

## 4. 新鲜度 [通过（含 1 项待观察）]

- run `startedAt = 2026-10-02T08:16:20.584Z`（本地 16:16:20）。
- 全部监审产物 mtime（16:21:58 – 16:31:34）**均 ≥ run.startedAt**，无陈旧同名文件冒充本轮产物。
- **[待观察 / UNVERIFIED]**：`02-solution-design.md` 与 `checklist.md` 的 mtime 均为 **16:27:57**，晚于 run 快照中 `solution` 节点 `endedAt=16:24:27`、`checklist` 节点 `endedAt=16:25:10`，且恰落在 `approve` 窗口（16:25:10–16:27:59）末尾。两文件 mtime 完全相同，疑为某步重写/同步/时间戳刷新所致。
  - 影响：不影响"新鲜"判定（仍晚于 run 起点），但无法从快照确证内容为对应节点产物而非后续改动。
  - 建议：标 `[UNVERIFIED]` 观察；如后续发现 `approve` 期间有非预期写入，再追溯到具体节点。无需本轮处置。

---

## 5. 断链 [通过]

- **消费但未产出（悬空输入）**：无阻断项。`spec.json.source.refs` 8 条引用**全部存在**（见 §6）；下游节点所需输入（01-root-cause / spec / 02-solution-design / checklist / TASK 集）均齐备。
- **产出但无人消费（孤儿）**：无。`01-root-cause`→spec/方案；`spec.json/md`→specIndex/tasks；`02-solution-design`→tasks；`checklist`→approve/checklist_gate；`TASK-*/weight/dependency-graph`→converge；`convergence.md` 为 advisory 类，由 `butler-data-auditor`（本节点）消费，**豁免**孤儿判定。
- 影响：无。

---

## 6. 引用有效性（抽样）[通过]

`spec.json.source.refs`（第 4–13 行）逐条核验：

| 引用 | 状态 |
|---|---|
| `butler/spec/<slug>/01-root-cause.md` | OK (41482 bytes) |
| `butler/plan/在现有-…功能增/plan.md`（ADR-014 §506-517） | OK；文件 2513 行，第 506 行="ADR-014" 标题，锚点有效 |
| `butler/spec/在现有-…功能增/e2e-report.md` | OK (17299 bytes) |
| `extension/panel.js` / `extension/src/multiselection.js` / `extension/src/contextmenu.js` / `extension/src/bulkformatter.js` / `extension/panel.html` | 全部 OK |

`TASK-*.md` 涉及文件抽样（全部存在）：`extension/src/formatter.js`、`extension/src/i18n.js`、`extension/styles/panel.css`、`extension/manifest.json`、`tests/{contextmenu,multiselection,i18n,formatter,bulkformatter}.test.mjs`、`tests/{test-cases.md,README.md}`、`scripts/check-panel-shell.mjs`、`docs/{USAGE,INSTALL}.md`、`butler/spec/在现有-…功能增/e2e-artifacts/harness/run-e2e.mjs`。
另：`01-root-cause.md` 第 11 行登记的运行期产物 `butler/results/_rca/panel-sim.mjs` 存在（12166 bytes）。
- 影响：无 —— 无失效相对路径引用。

---

## 7. 建议待办（可选，供编排者决定）

- `butler/tasks/backlog/<slug>/DATA-AUDIT-FIX-001.md`：修复 `checklist.md` 声明与勾选态的矛盾（§3.4）。**本监审未创建该文件**，仅给建议；是否生成由编排者决定。

---

## 8. 监审边界声明

- 本报告只读业务产物，未修改任何被测产物、未改源码、未启动/续跑 DAG。
- 每条结论均给出文件路径 + 行/字节依据；不确定项已标 `[UNVERIFIED]`。
- 只报事实与影响，未做业务决策。
