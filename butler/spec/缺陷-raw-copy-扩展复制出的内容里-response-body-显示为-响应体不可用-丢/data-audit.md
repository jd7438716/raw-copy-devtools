verdict: WARN

# 数据/产物独立监审 — `缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢`

> 监审者：butler-artifact-auditor（独立，只读业务产物）
> 监审范围 run：`run_muqf95nu_ddw3lq`（dag=fix，status=running，dataAudit 节点运行中）
> run.startedAt = `1790912822255`（ms）
> 结论：**WARN** —— 无阻断级问题（无关键产物缺失/空、无未被覆盖的 spec ID、无悬空必要输入、无陈旧文件冒充）；存在 2 项可接受的一致性瑕疵（跨 slug 未限定 ID 引用、方案文档机读字段陈旧），另有若干「按 fix 管线不适用/尚未到产出阶段」的未产出项。

---

## 1. 存在 / 非空

`[PASS]` 本 slug 范围内**存在且非空**（字节数）：

| 产物 | 字节 | 判定 |
|---|---|---|
| `01-root-cause.md` | 26402 | ✓ 非空，含 §0..§10 完整 RCA |
| `spec.json` | 7984 | ✓ 非空 |
| `spec.md` | 6557 | ✓ 非空 |
| `02-solution-design.md` | 24407 | ✓ 非空，含 §0..§10 + ARCH 机读块 |
| `checklist.md` | 10242 | ✓ 非空 |
| `convergence.md` | 2367 | ✓ 非空 |
| `TASK-001..009.md` | 2065–4868 各 | ✓ 9 个全存在，非空 |
| `dependency-graph.md` | 2065 | ✓ 非空 |
| `weight.json` | 1552 | ✓ 非空 |

`[不适用/未产出]` 以下项在 fix 管线中**不由本 run 产出**（按监审规则「存在即查，缺则记未产出」，非缺口）：
- `butler/plan/<slug>/plan.md`：无该目录（`ls butler/plan/` 仅见另一 slug），run 快照 nodes 中**无 plan 节点** → 非 fix 管线产物。
- `spec/<slug>/{requirement.md,feasibility.md,design.md,stories-written.md,tech-evaluation.md}`：未产出；fix 管线以 `01-root-cause.md` / `02-solution-design.md` 替代。
- 执行类 `spec/<slug>/{captain-execution.md,test-results.md,sec-audit.md}`：未产出；run 中 `apply/verify/secaudit` 节点仍 `pending`，尚未到产出阶段（当前 status=running，dataAudit 运行中）。
- `butler/results/<slug>/e2e-enrich-401.md`：TASK-009 声明的新增产出，`e2e` 节点 pending，尚未到产出阶段。

## 2. ID 覆盖（追链，独立重算）

`[PASS]` `spec.json` 共 **35** 个 ID（REQ×14 / DEL×9 / AC×12）。
独立脚本抽取 9 个 `TASK-*.md` frontmatter 的 `covers` 求并集：
- `specIds=35`，`coversUnion=35`，`missing=[]`，`extra=[]`（即 35 个 ID 全部被 ≥1 个 TASK 覆盖，且无幽灵覆盖）。
- 与 `convergence.md:16-21`（gaps=0 / extra=0 / 35=35）及 §覆盖矩阵一致 → 该收敛声明**经独立复算成立**。
- `02-solution-design.md §6` 覆盖矩阵声称方案 A「REQ 14/14、DEL 9/9、AC 12/12」（该矩阵行为自述，但逐行 ID 与 spec 集合一致）。

`[WARN]` **跨 slug 未限定 ID 引用**：`02-solution-design.md:43` 约束 C-8 出处写作「ADR-006；AC-002 / **AC-013**」，而本 slug `spec.json` 只定义 AC-001..012。经查 AC-013 存在于**上游基础项目** slug `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`（`design.md:648`、`convergence.md:165`）。即该引用属跨 slug 指向，但未加 slug 限定，读作本 slug ID 即为幽灵引用。
- 影响：低。约束 C-8 的语义仍成立；仅机读追溯可能误将 AC-013 归属本 slug。
- 建议：在 `02-solution-design.md:43` 改为限定写法（如 `…/design.md ADR-006；本 spec AC-002`），或新增 spec 条目。**由编排者决定**是否回填，不阻断。

## 3. 一致性

`[PASS]` **`spec.md` ↔ `spec.json`**：独立脚本正则抽取 `spec.md` 的 ID，`json 35 == md uniq 35`，双向 diff 均为空（json∉md=[]，md∉json=[]）。条数与 ID 集完全一致。

`[PASS]` **`weight.json` ↔ TASK 文件集**：`task_count=9` == 目录内 `TASK-*.md` 数 9；`weight.json.tasks` 键集 == 文件名集（脚本比对 `match:true`）；各 TASK 声明的 `weight`（standard/heavy/light）与 `weight.json` 逐一吻合（T1 standard / T2 heavy / T3 light / T4 standard / T5 standard / T6 standard / T7 standard / T8 light / T9 standard）。`spec_ids_total=35` == spec.json ID 数 35。

`[WARN]` **`02-solution-design.md` 机读字段自相矛盾**：
- 正文 `:310` 写「**`USER_DECISION_REQUIRED: false`**（已决策：方案 A）」，`:13` 亦指向 §10；
- 但文末机读块 `:376` 仍写 `USER_DECISION_REQUIRED: true`。
- run 快照 `approve` 节点 status=done（endedAt=1790913150312），`checklist.md:4` 记「已由人工评审逐条核对并勾选（2026-10-02 批准，采用方案 A）」→ 决策**已完成**，机读块 `true` 为**陈旧字段**。
- 影响：低-中。下游若消费 ARCH 块机读字段，可能误判为「待决策」而阻塞/重复询问。
- 建议：将 `:376` 回填为 `false`（与 `:310` 及 approve 事实一致）。可选生成待办 `DATA-AUDIT-FIX-*`。

`[PASS]` `checklist.md` 全部条目为 `[x]`，其自述「已由人工评审逐条核对并勾选」与 approve 节点 done 一致。

## 4. 新鲜度（防陈旧冒充）

`[PASS]` 全部在审产物 mtime（epoch s）**均 ≥ run.startedAt**（1790912822）：
- 最早 `01-root-cause.md` = 1790912931（对应 rca.endedAt），≥ startedAt ✓
- `spec.json` = 1790913015，`spec.md` = 1790913021；TASK 系列 1790913229–1790913255；`dependency-graph.md`/`weight.json` = 1790913261；`convergence.md` = 1790913280。
- 无任何产物早于本 run 起始时间，**无陈旧同名文件冒充本轮产物**。

## 5. 断链

`[PASS]` **消费但未产出（悬空输入）**：无。
- `spec.json.source.refs`（5 条）全部存在：`01-root-cause.md` ✓；上游 slug 的 `design.md`(683 行) ✓、`feasibility.md`(184 行) ✓、`stories-written.md`(1232 行) ✓、`sec-audit.md`(213 行，含 R-01) ✓。
- `dataAudit` 所需输入（spec.json / TASK 集）齐备。

`[PASS]` **产出但无人消费**：仅 `convergence.md`（butler-iteration-manager 收敛报告）无下游读取——属 **advisory 类，按规则豁免**（已在 `run` 中作为 converge 节点产物存在，非交付物）。其余产物均有下游消费（spec→tasks、TASK→apply/verify）。

`[ADVISORY]` TASK-009 声明新增产出 `butler/results/<slug>/e2e-enrich-401.md`，当前不存在；因 `e2e` 节点 pending，属**尚未到产出阶段**，非断链。

## 6. 引用有效性（抽样）

`[PASS]` 抽样核验：
- `spec.json.source.refs` 5 条**前导路径存在**；括号内 `(ADR-003 §243…)` 为注记非路径，无断路。
- 行锚点在文件范围内：`design.md:243/319/337`（≤683）、`feasibility.md:77`（≤184）、`stories-written.md:156-158/497-500`（≤1232）、`sec-audit` R-01（存在）。
- 代码/测试路径锚点（`02-solution-design.md` 表 & 各 TASK `refs`）均落在实际文件行数内：`capture.js:171-239`(241)、`store.js:105-163,213-224`(234)、`panel.js:127-157,656-668,711-756`(839)、`content.js:278-292`(346)、`i18n.js:98-100`(251)、`tests/capture.test.mjs:14-40,125-132,200-241`(247)、`tests/store.test.mjs`(138)；被引源码/测试文件均存在。
- `tests/enrich.test.mjs`、`butler/results/<slug>/e2e-enrich-401.md` 为 TASK 计划**新增**文件，当前不存在属预期，非断路。

`[ADVISORY]` `spec.json.source.refs` 中的上游文档（design.md / feasibility.md / stories-written.md）**当前仍描述缺陷态**（如 design.md:337「`null` → 输出"响应体不可用"」、feasibility.md:77「缺失时标注…」、stories-written.md:156-158「标记『响应体不可用』」）。这**正是** DEL-007/008/009 的修订对象，非本 slug 产物缺陷，仅记录以备下游核对。

---

## 汇总

| 检查项 | 结论 |
|---|---|
| 1 存在/非空 | PASS（核心产物齐备；plan/执行类按管线不适用或未到阶段） |
| 2 ID 覆盖 | PASS（35/35 独立复算，无 gaps/extra）；WARN：AC-013 未限定跨 slug 引用 |
| 3 一致性 | PASS（spec.md↔json；weight↔TASK）；WARN：02 机读字段 `USER_DECISION_REQUIRED=true` 陈旧 |
| 4 新鲜度 | PASS（全部 mtime ≥ run.startedAt） |
| 5 断链 | PASS（无悬空输入；convergence 为 advisory 豁免） |
| 6 引用有效性 | PASS（抽样路径/行锚点均有效） |

**verdict: WARN** —— 无阻断级问题，可继续下游；建议（不阻断，由编排者决定）：(a) 修正 `02-solution-design.md:43` 的 AC-013 限定；(b) 回填 `02-solution-design.md:376` 的 `USER_DECISION_REQUIRED: false`。二者无需重跑上游节点。

> 本监审只读业务产物，未修改任何被测产物，未启动/续跑任何 DAG；仅写入本 `data-audit.md`。
