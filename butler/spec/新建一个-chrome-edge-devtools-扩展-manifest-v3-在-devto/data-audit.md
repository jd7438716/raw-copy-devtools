verdict: WARN

# 数据监审报告 — 新建一个 Chrome/Edge DevTools 扩展（Manifest V3）

- slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
- runId: `run_muqbjtbn_bpv8j3`（dag=dev，version=4，status=running）
- run.startedAt: `1790906601021`（2026-10-02T10:03:21 +08:00）
- 监审人: butler-artifact-auditor（只读业务产物；本报告为唯一写入）
- 监审时点: 2026-10-02T10:18:59 +08:00
- 结论摘要: **WARN** —— 存在/新鲜/ID 覆盖/断链均无阻断级问题；但发现 2 项数据一致性问题（`spec.md` 人读视图截断缺 40/80；`weight.json` 与 TASK frontmatter 权重在 6 个任务上冲突，其中 4 个为安全关键任务）。

---

## 1. 存在 / 非空

**[结论] PASS** —— 范围内应产出文件均存在且非空；执行类文件属未到阶段，记"未产出"。

证据（字节数 > 0）：

| 文件 | 大小(bytes) |
|---|---|
| `butler/spec/<slug>/spec.json` | 12522 |
| `butler/spec/<slug>/spec.md` | 5185 |
| `butler/spec/<slug>/requirement.md` | 33496 |
| `butler/spec/<slug>/feasibility.md` | 12659 |
| `butler/spec/<slug>/checklist.md` | 7576 |
| `butler/spec/<slug>/design.md` | 49967 |
| `butler/spec/<slug>/stories-written.md` | 58815 |
| `butler/spec/<slug>/tech-evaluation.md` | 27324 |
| `butler/spec/<slug>/convergence.md` | 9426 |
| `butler/plan/<slug>/plan.md` | 170069 |
| `butler/tasks/backlog/<slug>/TASK-001.md … TASK-016.md` | 16 个，1140–3288 |
| `butler/tasks/backlog/<slug>/dependency-graph.md` | 2806 |
| `butler/tasks/backlog/<slug>/weight.json` | 1303 |

未产出（**非缺陷，属阶段未到**）：`captain-execution.md` / `test-results.md` / `sec-audit.md` 均不存在；run.json 中 `execute`/`verify`/`tester`/`secaudit` 节点仍为 `pending`，故执行类产物尚未生成。**影响**：不构成缺口。**建议**：无需动作。

---

## 2. ID 覆盖（追链）

**[结论] PASS** —— `spec.json` 80 个 ID 全部被下游 `covers` 覆盖，无孤立 ID。

证据（脚本化交叉对账，源：`spec.json` items 80 与各产物 `butler:covers` / TASK frontmatter `covers`）：

| 下游产物 | 覆盖 ID 数 | 未被覆盖的 spec ID |
|---|---|---|
| `design.md`（`butler:covers`，L683） | 80 | 无 |
| `stories-written.md`（`butler:covers`，L1232） | 80 | 无 |
| `plan.md`（3 处 `butler:covers`，L430/L1118/L2355） | 80 / 80 / 80 | 无 |
| `TASK-*.md` frontmatter `covers` 并集 | 80 | 无 |

- ID 构成：US×4 + REQ×36 + DEL×18 + AC×22 = 80（`spec.json`）。
- TASK 并集既无缺失也无多余（脚本输出：`MISSING: (none)` / `EXTRA: (none)`）。
- 覆盖矩阵一致性：`stories-written.md` §2.1–2.4 自证 22/22 AC、36/36 REQ、18/18 DEL、4/4 US；`design.md` §10 逐条对照矩阵；与脚本复算一致。

**[结论] PASS（附注）** —— `convergence.md` 自述 `gaps:0 / appended:0 / covered 80→80`，与本次独立复算一致。

---

## 3. 一致性

### 3.1 `spec.md` ↔ `spec.json`：**[结论] FAIL（WARN 级）**

证据：`spec.md` 仅 65 行 / 5185 bytes（`wc -l -c`），内容止于 REQ-036，末尾为占位符 `<!-- MD-PART2 -->`（L65），**无 part 2**。脚本提取 `spec.md` 内 ID 集 = **40**，相对 `spec.json` 80 个 ID **缺 40 个**（DEL-001…018 与 AC-001…022 全部缺失）。而 `spec.md` 自身声明（L4）"人读视图，与 `spec.json` 内容一致（机器真源 = `spec.json`）"。

- 佐证：`MD-PART2` 标记在 `butler/spec/` 全目录仅此一处（grep），即第二段从未生成。
- 影响：人读视图缺失交付物与验收标准两节，人工评审/交接会误判"只有 REQ"。**机器真源 `spec.json` 完整（80/80）**，且下游覆盖链（design/stories/plan/TASK）均基于 `spec.json` 的 ID，未受影响 → 非阻断。
- `requirement.md` 复核：含全部 80 个 ID（missing:0），完整。
- 建议：重跑/补写 `requirement` 节点的 `spec.md` 人读视图第二段（DEL+AC 表），补全至 80 items；或由编排者生成待办 `TASK-FIX-spec-md-part2`。**不改业务产物，仅建议。**

### 3.2 `weight.json` ↔ `TASK-*.md` frontmatter 权重：**[结论] FAIL（重点项）**

证据：键集合一致（均 TASK-001…016，16/16），但**权重取值 6 处冲突**：

| TASK | `weight.json` | `TASK-*.md` frontmatter | 冲突 |
|---|---|---|---|
| TASK-001 | `heavy` | `standard` | ✗ |
| TASK-005 | `standard` | `light` | ✗ |
| TASK-006 | `heavy` | `standard` | ✗ |
| TASK-009 | `heavy` | `standard` | ✗ |
| TASK-011 | `light` | `standard` | ✗ |
| TASK-014 | `heavy` | `standard` | ✗ |

- 佐证：`weight.json` `notes.heavy` 明确点名 **TASK-001 / TASK-006 / TASK-009 / TASK-014** 为 heavy（"独立回归 + 强制 sec-audit"），而恰好这 4 个任务在 `TASK-*.md` frontmatter 中均写成 `standard`（TASK-001 L5、TASK-006 L5、TASK-009 L5、TASK-014 L5）。
- 影响：`heavy` 与 `standard` 的验证强度不同（heavy 强制独立回归 + sec-audit；standard 仅 build+test+sec-scan）。若下游以 TASK frontmatter 为准，则**权限门禁(AC-009/AC-018)、逐字符保真(AC-007)、零网络/隐私(AC-008/AC-020)、体积与零依赖门禁(AC-017)** 四类安全关键任务的强制 sec-audit 会被降级跳过，存在门禁削弱风险。**[UNVERIFIED]**：引擎究竟以 `weight.json` 还是 TASK frontmatter 为执行真源，本次无法从产物确定。
- 建议：在进入 `execute` 前对齐两处权重（以 `weight.json` 的 heavy 判定为准恢复 T1/T6/T9/T14 为 heavy；T5/T11 择一）；由编排者生成待办 `DATA-AUDIT-FIX-weights`。**不改业务产物，仅建议。**

---

## 4. 新鲜度

**[结论] PASS** —— 全部受审产物 `mtime >= run.startedAt`，无陈旧同名文件冒充。

证据：run.startedAt = 1790906601s（10:03:21）。各文件 mtime（epoch, s）：

| 文件 | mtime | ≥ startedAt |
|---|---|---|
| spec.json | 1790906860 | ✓ |
| spec.md | 1790906866 | ✓ |
| requirement.md | 1790906844 | ✓ |
| feasibility.md | 1790906951 | ✓ |
| checklist.md | 1790907059 | ✓ |
| design.md | 1790907205 | ✓ |
| tech-evaluation.md | 1790907300 | ✓ |
| stories-written.md | 1790907384 | ✓ |
| convergence.md | 1790907510 | ✓ |
| plan.md | 1790907387 | ✓ |
| weight.json | 1790907473 | ✓ |

- `convergence.md` mtime 1790907510 与 run.json `plan_converge.endedAt` 1790907510984 吻合，确为本轮产物。

---

## 5. 断链

**[结论] PASS（无悬空输入）** —— 已产出节点间引用均指向存在文件。

- "消费但未产出"：未发现。`plan.md` 的 4 处 `<!-- source: … -->` 指向 `requirement.md`(L4)/`design.md`(L434)/`stories-written.md`(L1122)/`tech-evaluation.md`(L2359)，**全部存在**。
- `spec.json.source.refs[2]` → `butler/spec/<slug>/requirement.md`：存在。
- `spec.json.source.refs[0]` 内嵌 `req.txt`：项目根 `req.txt`（11846 bytes，10-02 09:57）存在。
- "产出但无人消费"：
  - `convergence.md`：advisory（收敛报告，无下游读取）→ **豁免**，注明即可。
  - `spec.md`：**无下游消费**（`plan.md` 消费的是 `requirement.md` 而非 `spec.md`）→ advisory 人读视图，且其内容截断（见 §3.1），二者叠加进一步降低其可信度。
  - `dependency-graph.md`：advisory（与 TASK frontmatter `depends-on` 互为表达），非引擎输入。
- 循环依赖：`dependency-graph.md` §4 声明 DAG 无环；与 `TASK-*.md` 的 `depends-on` 边抽样核对无回边。

---

## 6. 引用有效性（抽样）

**[结论] PASS** —— 抽样引用均可解析；仅来源描述格式为文字而非纯路径（非缺陷）。

- `spec.json.source.refs`：
  - `[0]` = "req.txt（…需求文档 v1.0）" —— 为**带括号描述的文字**而非纯路径（其内 `req.txt` 确实存在）；格式瑕疵，非断链。
  - `[1]` = "老板本步原话（…）" —— 非路径引用（可接受）。
  - `[2]` = 相对路径 `butler/spec/<slug>/requirement.md` —— 存在。
- `design.md` 未检出可解析的 `butler/…` 路径型引用（以锚点 `§/L` 交叉引用为主，如 `design 锚点：§1.1 i18n（L39）`，见 `tech-evaluation.md`）→ 无断链。
- `plan.md` 链接抽样：`source` 注释 4 条全部命中（见 §5）。

---

## 7. 其它观察（非阻断，advisory）

- **run 状态与 vgate 陈旧记录**：run.json 中 `vgate` 节点 `status=done` 但携带早期错误（`endedAt`=1790907065649，早于 design/decompose/converge），内容是"缺 test-results.md/sec-audit.md + 覆盖缺口(缺 80)"——该快照对应"backlog 为空"的旧时点。`convergence.md` 已声明本轮复算 80/80、缺口 0。**影响**：看板可能误读为仍存在覆盖缺口。**建议**：以上下游新鲜产物（`convergence.md`/`weight.json`）为准，或由编排者置该项为待刷新；本次不启动/续跑。
- **GAP-2 待老板确认项**：`design.md` §10.5 与 `stories-written.md` GAP-2 均标注 REQ-034"成功率 100%"重述为 AC-022"存在降级路径 + 失败必有提示"，**待老板确认**。属已知悬置决策，非数据缺陷，提示编排者关注。
- **P2/边界项**：REQ-013（仅请求/仅响应/cURL）设计标注 P2 本期不实现（`design.md` §10.5）；WebSocket/SSE 响应体不可得已按 DEC-006 边界标注。均为显式声明的范围裁剪。

---

## 8. 逐条结论汇总

| 检查项 | 结论 | 关键证据 |
|---|---|---|
| 1 存在/非空 | PASS | 全部文件存在且非空；执行类属未到阶段 |
| 2 ID 覆盖 | PASS | spec 80 ↔ TASK 并集 80，无缺失/多余 |
| 3 一致性 | **FAIL** | `spec.md` 缺 40/80（§3.1）；`weight.json` 与 TASK 权重 6 处冲突（§3.2） |
| 4 新鲜度 | PASS | 全部 mtime ≥ startedAt |
| 5 断链 | PASS | 无悬空输入；advisory 未消费已注明 |
| 6 引用有效性 | PASS | 抽样全部可解析；refs[0] 格式瑕疵 |

**总体 verdict: WARN** —— 无阻断级缺口。两项一致性缺陷需在 `execute` 前处理：(a) 补全 `spec.md` 第二段（DEL+AC）；(b) 对齐 `weight.json` 与 TASK frontmatter 权重，避免安全关键任务（TASK-001/006/009/014）的强制 sec-audit 被降级。

> 本报告仅为事实与建议；未修改任何业务产物，未启动/续跑任何 DAG。修复动作由编排者决定。
