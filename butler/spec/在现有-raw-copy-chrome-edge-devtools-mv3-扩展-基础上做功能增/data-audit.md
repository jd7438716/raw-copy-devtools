verdict: WARN

# 数据/产物独立监审 — `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`

> 监审者：butler-artifact-auditor（独立，只读业务产物，不改产物、不启动 DAG）
> 监审范围 run：`run_muqg8hsx_j7mhsr`（dag=dev，status=running，`dataAudit` 节点运行中）
> run.startedAt = `1790914470950`（ms，= 2026-10-02T04:14:30.950Z）
> 结论：**WARN** —— 无阻断级问题（无关键产物缺失/空、无未被覆盖的 spec ID、无悬空必要输入、无陈旧文件冒充）；存在 **1 项可接受的一致性瑕疵**（`checklist.md` 状态行与勾选标记自相矛盾）；另有若干「尚未到产出阶段」的未产出项（非缺口）。

---

## 1. 存在 / 非空

`[PASS]` 本 slug 范围内应产出文件**存在且非空**（字节数以 `statSync` 实测）：

| 产物 | 字节 | 判定 |
|---|---|---|
| `spec/spec.json` | 10056 | ✓ 非空 |
| `spec/spec.md` | 9297 | ✓ 非空 |
| `spec/requirement.md` | 28215 | ✓ 非空 |
| `spec/feasibility.md` | 14641 | ✓ 非空 |
| `spec/checklist.md` | 10936 | ✓ 非空 |
| `spec/design.md` | 49865 | ✓ 非空 |
| `spec/stories-written.md` | 53913 | ✓ 非空 |
| `spec/tech-evaluation.md` | 41837 | ✓ 非空 |
| `spec/convergence.md` | 3298 | ✓ 非空 |
| `plan/<slug>/plan.md` | 174337 | ✓ 非空 |
| `tasks/backlog/<slug>/TASK-001..015.md` | 1447–3855 各 | ✓ 15 个全存在、非空 |
| `tasks/backlog/<slug>/dependency-graph.md` | 5860 | ✓ 非空 |
| `tasks/backlog/<slug>/weight.json` | 1488 | ✓ 非空 |

`[未产出·非缺口]` 以下项**尚未到产出阶段**（run 快照对应节点仍 `pending`，非本轮缺口）：
- 执行类 `spec/<slug>/{captain-execution.md,test-results.md,sec-audit.md}`：未产出；快照 `analyze/audit/execute/verify/tester/secaudit/vgate/...` 全部 `pending`（`run_muqg8hsx_j7mhsr.json:178-225`）。

## 2. ID 覆盖（追链，独立重算）

`[PASS]` `spec.json` 共 **53** 个 ID（US×4 / REQ×24 / DEL×8 / AC×17；`spec.json:11-66`，独立脚本计数 = 53，**无重复**）。
独立脚本抽取设计/故事/技术评估三份产物的 `<!-- butler:covers ... -->` 机读块，并集对照：
- `design.md` covers = **53**，`stories-written.md` covers = **53**，`tech-evaluation.md` covers = **53** → 三份均**全覆盖**，`missing=[]`。
- `plan.md` 正文出现全部 4 US / 24 REQ / 8 DEL / 17 AC（独立 grep，缺失项均为 `NONE`）。
- 15 个 `TASK-*.md` frontmatter `covers` **并集 = 53**，对 spec 集合：`missing=[]`、`extra=[]`（无幽灵覆盖）。
- 与 `convergence.md` 自述（`spec_ids: 53 / covered_ids: 53 / gaps: 0 / appended: 0`）**经独立复算一致**。

`[PASS]` `spec.json` 未定义 `DEC-*` 条目（`items` 仅 US/REQ/DEL/AC），故无 DEC 断链；`design.md` 中的 `DEC-001..007`/`ADR-*` 属设计层决策命名空间，非 spec 机器真源 ID，不构成覆盖缺口。

## 3. 一致性

`[PASS]` **`spec.md` ↔ `spec.json`**：独立脚本正则抽取 `spec.md` 的 ID，按类型 distinct 计数 = US 4 / REQ 24 / DEL 8 / AC 17，与 `spec.json` 完全吻合；`spec.json` 全部 53 个 ID 均能在 `spec.md` 命中，双向 diff 为空。`spec.md` 的 covers 块亦为 53。

`[PASS]` **`weight.json` ↔ TASK 文件集**：`weight.json.tasks` 键集（TASK-001..015，15 个）与目录内 `TASK-*.md` 文件名集**完全一致**（脚本比对 `weight != files: false`）。

`[PASS]` **`dependency-graph.md` ↔ TASK frontmatter**：15 个 TASK 的 `depends-on` 与依赖图表格逐行比对，**无不一致**（脚本比对 `mismatches: NONE`）；依赖图 §4 无环声明与拓扑排序自洽。

`[WARN]` **`checklist.md` 状态行与勾选标记自相矛盾**：
- `checklist.md:5` 写「状态: **全部未勾选 `- [x]`**（待人工评审）」；
- 但全文实测 `- [x]` **70 处**、`- [ ]` **0 处**（脚本文数），即条目实际**全部已勾选**；
- run 快照 `approve` 节点 `status=done`（`run_muqg8hsx_j7mhsr.json:73-81`）、`checklist_gate` 节点 `status=done`（`:82-90`）→ 评审门已过，状态行「待人工评审」为**陈旧/笔误表述**。
- 影响：低。仅影响人读一致性，不改变机读覆盖与门禁结论。
- 建议：将 `checklist.md:5` 状态行改为与事实一致（如「全部已勾选，已由人工评审逐条核对」）。**由编排者决定**是否回填，不阻断。可选生成待办 `DATA-AUDIT-FIX-*`。

## 4. 新鲜度

`[PASS]` 全部本轮产物 `mtime` **>= run.startedAt（1790914470950）**，无陈旧同名文件冒充：

| 产物 | mtime(UTC) | 判定 |
|---|---|---|
| `spec.json` | 2026-10-02T04:16:55 | FRESH |
| `spec.md` | 2026-10-02T04:17:03 | FRESH |
| `requirement.md` | 2026-10-02T04:17:30 | FRESH |
| `feasibility.md` | 2026-10-02T04:18:17 | FRESH |
| `checklist.md` | 2026-10-02T04:24:29 | FRESH |
| `design.md` | 2026-10-02T04:26:22 | FRESH |
| `stories-written.md` | 2026-10-02T04:28:41 | FRESH |
| `tech-evaluation.md` | 2026-10-02T04:28:42 | FRESH |
| `plan.md` | 2026-10-02T04:28:43 | FRESH |
| `convergence.md` | 2026-10-02T04:31:06 | FRESH |
| `TASK-001..015.md` | 04:30:01–04:30:33 | FRESH |
| `dependency-graph.md` / `weight.json` | 04:30:44 | FRESH |

## 5. 断链（消费但未产出 / 产出但无人消费）

`[PASS]` **消费但未产出**：无悬空必要输入。
- `spec.json` 声明 `source.refs`（`spec.json:3-9`）三条，独立核验：`req.txt`（项目根，11846B，存在）、「老板本步原话」（内联于 run inputs，非文件）、`butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md`（33496B，存在）。
- `plan.md`（174337B）经 `source:` 标注聚合 requirement/design/stories/tech-evaluation 等，均先于 plan 产出且 mtime 更早，输入闭合。

`[PASS/豁免]` **产出但无人消费**：
- `convergence.md` 为 `plan_converge` 节点产出的**收敛核对报告（advisory）**，未被 `plan.md`/TASK 引用；属监审规则明确豁免的 advisory 类，且由本 `dataAudit` 节点消费（`spec:` / `backlog:` / `covered_ids` 机读字段），**非断链**。
- `feasibility.md`/`checklist.md` 被 `design.md`/`tech-evaluation.md` 引用（`design.md` 头部上游、`tech-evaluation.md:5`），有下游消费。

## 6. 引用有效性（抽样）

`[PASS]` `spec.json.source.refs` 3 条（见 §5）逐条核验，实存 / 内联，无失效引用。

`[PASS]` `plan.md` 相对链接抽样：全文 markdown 相对链接数 = **0**（`](...)` 匹配后过滤 http/# 为空），故无失效相对路径。

`[PASS]` `dependency-graph.md` §1 表格的 `depends-on` 所指 TASK 编号（TASK-001..015）均在目录中实存，无指向缺失节点的悬空依赖。

---

## 附：监审方法与边界

- **方法**：独立脚本（Node）从磁盘产物抽取 ID/covers/mtime/字节数，与 run 快照逐节点复算；未采信任何产物的自述结论作为证据。
- **边界**：只读业务产物；本文件为本次唯一写入（另可选 `DATA-AUDIT-FIX-*` 待办，本次未生成）；未修改任何被测产物、未启动/续跑 DAG。
- **verdict 汇总**：存在/非空 PASS ｜ ID 覆盖 PASS ｜ 一致性 WARN（1 项非阻断）｜ 新鲜度 PASS ｜ 断链 PASS ｜ 引用有效性 PASS → **WARN**。
