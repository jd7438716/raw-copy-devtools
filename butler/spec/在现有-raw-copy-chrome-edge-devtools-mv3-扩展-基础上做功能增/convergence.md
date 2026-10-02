---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
mode: 收敛·执行后补齐（只增不改）
generated: 2026-10-02
phase: ⑤ 收敛·执行后补齐（第 2 轮 · 执行后复扫）
spec: butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/spec.json
backlog: butler/tasks/backlog/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
spec_ids: 53
covered_ids: 53
covers_gaps: 0
gaps: 8
appended: 2
prev_gaps: 18
prev_appended: 4
resolved_from_prev: 18
sources:
  - butler/spec/<slug>/spec.json
  - butler/tasks/backlog/<slug>/TASK-001.md .. TASK-021.md
  - butler/spec/<slug>/test-results.md      （TASK-012 终局产物；本步复核其「同代性」）
  - butler/spec/<slug>/sec-audit.md         （TASK-019 独立安全审计；第 2 轮缺口主源）
  - butler/spec/<slug>/e2e-report.md        （TASK-016 浏览器级 E2E）
  - butler/spec/<slug>/data-audit.md        （产物/数据监审）
  - butler/.butler2/runs/run_muqg8hsx_j7mhsr.json（run 快照）
missing_context:
  - butler/spec/<slug>/captain-execution.md  （仍不存在 → [MISSING_CONTEXT]；execute 节点超时，未产出）
---

# 收敛报告（执行后补齐 · 第 2 轮） — spec ID 覆盖与执行复核（只增不改）

## 1. 结论

- 逐一枚举 `spec.json` 全部 **53** 个 ID（US×4 / REQ×24 / DEL×8 / AC×17）；对照 **19 个既有 TASK（001–019）** 的
  `covers`（frontmatter）取并集 → **covers 并集 = 53，无「未被 covers 覆盖」的 ID（`covers_gaps = 0`）**。
- **第 1 轮**补的 4 个 TASK（TASK-016/017/018/019）**已全部执行**，其承载的 18 个缺口 ID **全部闭合**：
  - `e2e-report.md`（TASK-016，PASS，Chrome/Edge 20/20）→ AC-001/002/003/008/009/010/011 + DEL-007（E2E 侧）；
  - `docs/USAGE.md`+`INSTALL.md`（TASK-017，13:39，根镜像逐字节一致）→ REQ-024/DEL-008/AC-017（文档侧）；
  - `tests/{README,test-cases}.md`（TASK-018，13:42，14 文件/264 用例）→ DEL-007（文档侧）；
  - `sec-audit.md`（TASK-019，WARN，AC-012/013/016 + REQ-018..021 逐条 PASS）→ 安全签署补齐。
- **第 2 轮（本轮）执行后复扫**发现 **8 个新缺口 spec ID**（`gaps: 8`）——均为**报告新标记的未完成项**，
  非「计划期未覆盖」：
  - **回归基线证据与当前源码不同代（被 `sec-audit.md` 标为未完成）**：`REQ-012 / REQ-022 / REQ-023 / AC-007 / AC-014 / AC-015`（6 个）；
  - **发行文档数据使用披露与增强行为不一致（被 `sec-audit.md` F-06 标为未完成）**：`DEL-008 / AC-017`（2 个）。
- **追加新 TASK：2 个**（`appended: 2`）——`TASK-020`（回归基线在当前源码上复跑）/ `TASK-021`（隐私声明一致性修订），均含 `covers`。
- **未改动、未删除任何既有 TASK（001–019 原样保留）**；**未改动任何代码或测试**。

## 2. 上下文与证据来源（含 [MISSING_CONTEXT]）

| 输入 | 状态 | 处置 |
|------|------|------|
| `spec.json` | ✅ 存在 | 提取 53 ID 真源（独立脚本重算 = 53） |
| `TASK-001..019.md` | ✅ 存在 | 提取 covers 并集 = **53**（`missing=[]`） |
| `test-results.md` | ✅ 存在（TASK-012 终局 Rework R1） | 复核「同代性」→ 其证据早于后续 `panel.js` 变更（第 2 轮缺口主因之一） |
| `sec-audit.md` | ✅ 存在（TASK-019，verdict=WARN） | **第 2 轮缺口主源**：取 §11.9 / degradations / F-06 未完成项 |
| `e2e-report.md` | ✅ 存在（TASK-016，verdict=PASS，§11 G-1 复验） | 采信；其 G-2 已由 TASK-018（13:42）修复 |
| `data-audit.md` | ✅ 存在（verdict=WARN） | 采信；其唯一 WARN（`checklist.md:5` 状态行自相矛盾）非 spec-ID 缺口 |
| `captain-execution.md` | ❌ **不存在**（`[MISSING_CONTEXT]`） | `run_muqg8hsx_j7mhsr` 的 `execute` 节点超时失败（2400000ms）→ 未产出执行纪要 |

执行期状态（`run_muqg8hsx_j7mhsr`，dag=dev，status=running）：
`execute = failed`（节点超时）→ `verify = skipped`（上游未成功）；`tester`/`secaudit`/`e2e`/`e2e_gate` 仍 `pending`；
`vgate = done（error: until 未满足…）`；`iterate = running（iter 2）`；`converge = running（本节点）`。
**说明**：`tester/secaudit/e2e` 节点虽在 DAG 中 pending，但对应的 TASK-012/019/016 产物已由迭代补齐链实际产出并落到磁盘
（`test-results.md` / `sec-audit.md` / `e2e-report.md` 均存在），故本轮以**磁盘报告**为准判定缺口。

## 3. 第 1 轮缺口回顾（prev_gaps: 18 → 全部闭合）

| 第 1 轮缺口 ID | 处置 TASK | 本轮闭合证据 |
|----------------|-----------|--------------|
| REQ-024 / DEL-008 / AC-017 | TASK-017 | `docs/USAGE.md`(+根镜像) 13:39 含第 6/7/8 节与 §12「需求覆盖声明」；`docs/INSTALL.md` 13:39 含 v1.1.0/reload/权限复核；镜像逐字节一致 |
| DEL-007 | TASK-016 / TASK-018 | `e2e-report.md`（等价/保真 E2E）+ `tests/README.md` 13:42（14 文件/264 用例 + 4 门禁口径） |
| AC-001 / AC-002 / AC-003 / AC-008 / AC-009 / AC-010 / AC-011 | TASK-016 | `e2e-report.md` Chrome 152 + Edge 154 双端 20/20 PASS，系统剪贴板逐字符证据 |
| REQ-018 / REQ-019 / REQ-020 / REQ-021 | TASK-019 | `sec-audit.md` §6.4 逐条 PASS（MV3 / 零依赖 / 最小权限 / 零网络） |
| AC-012 / AC-013 / AC-016 | TASK-019 | `sec-audit.md` §6.1/§6.2/§6.3 逐条 PASS（独立复跑门禁 + 独立 ZIP 复算） |

> 另有第 1 轮记为「非阻塞遗留」的 `TASK-015`（未执行，covers DEL-007/REQ-001/REQ-015 均另有已落地覆盖）——本轮维持非阻塞。

## 4. 计划期覆盖（covers 并集，全部 53）

`spec_ids = 53`；`TASK-001..019` 的 `covers` 并集 = **53**；`missing=[]`、`extra=[]` → `covers_gaps = 0`。
（本轮新追加的 TASK-020/021 仅承载下方第 2 轮缺口 ID，均为已有 ID 的子集，不改变并集。）

## 5. 第 2 轮缺口清单（gaps: 8）— 逐条依据

| # | spec ID | 缺口类别 | 判定依据（可核验） | 新增 TASK |
|---|---------|----------|--------------------|-----------|
| 1 | REQ-012 | 安全报告标未完成（测试证据不同代） | `sec-audit.md` degradations(MEDIUM)+§11.9：`test-results.md`（13:11）早于 `panel.js` 后续变更，「应回交 TASK-012/验证链补跑」；当前 `extension/panel.js` mtime 13:49 与 `test-results.md` 证据（139364 B / sha `24c2089a…`）不同代 | TASK-020 |
| 2 | REQ-022 | 同上 | 同上（响应体字符级保真的回归证据未在当前源码上重产） | TASK-020 |
| 3 | REQ-023 | 同上 | 同上（大响应/二进制/Base64 三路径规则未在当前源码上重跑） | TASK-020 |
| 4 | AC-007 | 同上 | 同上（单选 golden 逐字符一致的正式回归产物与当前源码不同代） | TASK-020 |
| 5 | AC-014 | 同上 | 同上（大响应/二进制/Base64 与基线一致的正式回归未在当前源码复跑） | TASK-020 |
| 6 | AC-015 | 同上 | 同上（264 用例 + 4 门禁 + 打包的正式回归产物与当前源码不同代；`tester` 节点 pending） | TASK-020 |
| 7 | DEL-008 | 安全报告标未完成（发行文档不一致） | `sec-audit.md` F-06 / `RISK-DOC-01`（§0/§4.3/§8.3/§10.5）：`extension/privacy.html` 仍声明「**单条**网络请求」（mtime 10:27 < 增强开始 12:28，未更新），与多选批量复制行为及 `docs/USAGE.md` 矛盾；§10.5 要求「与 extension/ 行为逐条对齐（DEL 侧）」 | TASK-021 |
| 8 | AC-017 | 同上 | 同上（「覆盖/行为记录」须在发行文档面一致；privacy.html 与实现/USAGE 自相矛盾） | TASK-021 |

### 未列为缺口（已核验通过，避免误报）

- **AC-001/002/003/008/009/010/011 + DEL-007**：`e2e-report.md` 双端 PASS（§11 G-1 复验 20/20），已闭合。
- **REQ-024 / DEL-008 / AC-017（文档侧）**：`docs/USAGE.md` §12 已落地覆盖声明与单条主场景（TASK-017）；本轮仅剩 `privacy.html` 一处不一致，故只就该项追加 TASK-021（非重复计 DEL-008 全量）。
- **REQ-018..021 + AC-012/013/016**：`sec-audit.md` 逐条 PASS，已闭合（其 F-04 发行完整性已在审计内重建修复）。
- **AC-004/005/006**：`multiselection/bulkformatter` 单测 + E2E 批量断言通过，无报告标其未完成。
- **`checklist.md:5` 状态行自相矛盾**（`data-audit.md` WARN）：非 spec-ID，记为**非 spec-ID 遗留**（§7），不追加 TASK。

## 6. 追加 TASK 清单（appended: 2）

| 新 TASK | 标题 | agent | covers（补齐的缺口 ID） |
|---------|------|-------|--------------------------|
| TASK-020 | 回归基线在当前源码上复跑（冻结契约 + 全量回归 + 门禁 + 打包/三路径） | butler-tester | REQ-012 REQ-022 REQ-023 AC-007 AC-014 AC-015 |
| TASK-021 | 隐私声明一致性修订（`privacy.html`「单条」→「一条或多条」） | butler-doc-writer | DEL-008 AC-017 |

- 新 TASK 的 covers 并集 = 上表 8 个缺口 ID 的全集。
- 既有 `TASK-001..019` **字节未改动**；本步**未改任何源码 / 测试 / 门禁脚本**。
- **建议执行顺序**：TASK-021（改 `extension/privacy.html`）→ TASK-020（复跑打包），以免再次产生「发行产物与源码不同代」（`RISK-REL-01` 复发条件）。

## 7. 非 spec-ID 遗留（独立审计/监审标记，但不映射到 spec ID → 不追加 TASK）

以下项被 `sec-audit.md` / `data-audit.md` / `e2e-report.md` 标记，但**不对应本 slug `spec.json` 的任何 ID**（无 `covers` 可承载），
按报告自身的处置归入**下一里程碑（1.1.x）**或**建议**，不在本步追加 TASK：

| 来源 | 项 | 处置 |
|------|----|------|
| `sec-audit.md` F-01（`RISK-EXFIL-01` 放大） | 复制前敏感探测缺失，多选批量放大爆炸半径 | 报告明示「下一里程碑落地 §9.1」；属安全加固而非 spec 条目 |
| `sec-audit.md` F-02（`RISK-MEM-02`） | 批量复制无**总量**门禁（每记录 10MB 阈值对批总量无效） | 同上（§9.2）；spec 仅要求批内「一次确认」，不要求总量门禁 |
| `sec-audit.md` F-03（`RISK-DOS-01`） | 明细抽屉无体积门禁（复制路径有 confirm，明细路径没有） | 同上（§9.3）；design 将 AC-014 明细侧限定为 `classifyBody` 复用，故不判 AC-014 缺口 |
| `sec-audit.md` F-07（`RISK-INTEG-01`） | P2 分段裁剪边界可被不可信正文伪造（`extractSectionText` 用全文首个标记） | 同上（§10.5）；属输出完整性加固 |
| `sec-audit.md` F-08 / F-10（`RISK-GATE-01`） | 门禁覆盖缺口（manifest 键 / 关键字扫描 / 产物同代）+ 无 CI 依赖审计 | 报告建议；非 spec 条目 |
| `sec-audit.md` F-05（`RISK-OPEN-01`） | `window.open` 无 `noopener` | 低风险防御性加固 |
| `e2e-report.md` G-3 | Edge 页内 `readText` 返回陈旧值（系统剪贴板正确） | 环境观察，非缺口 |
| `e2e-report.md` §8.4 | `butler/requirements/e2e-test-plan.md` 缺失 | 声明输入缺口（`[MISSING_CONTEXT]`），非 spec ID |
| `data-audit.md` §3 WARN | `checklist.md:5` 状态行「全部未勾选」与实测 70 处 `- [x]` 自相矛盾 | 人读一致性瑕疵；建议回填状态行，非 spec ID |

## 8. 核对方法

1. 从 `spec.json` 提取全部 ID → 53 个（独立脚本 `JSON.parse(items)` 去重）。
2. 从 `TASK-*.md` 的 `covers:` 行取并集 → 53 个；差集 `spec_ids - covers` = ∅ → `covers_gaps = 0`。
3. 复核第 1 轮 18 缺口是否闭合：
   - `ls`/`stat` `e2e-report.md`、`docs/{USAGE,INSTALL}.md`、`tests/{README,test-cases}.md`、`sec-audit.md` 存在且 mtime ≥ 增强开始；
   - 逐条抽验其内容是否覆盖对应 ID（截图/剪贴板/章节/断言表）。
4. 复扫报告找第 2 轮缺口：
   - `test-results.md`（TASK-012）证据基准（139364 B / sha `24c2089a…`）与当前源码（`panel.js` 13:49、zip 13:50/42644 B）**不同代** → 依据 `sec-audit.md` §11.9/degradations 判 6 个回归 ID 未完成；
   - `grep -n "单条" extension/privacy.html` → 第 128 行仍为「单条」；`mtime 10:27 < 12:28` → 依据 `sec-audit.md` F-06/§10.5 判 2 个文档 ID 未完成。
5. 缺口并集 = 8 → `gaps: 8`；按缺口类别追加 2 个新 TASK → `appended: 2`。
