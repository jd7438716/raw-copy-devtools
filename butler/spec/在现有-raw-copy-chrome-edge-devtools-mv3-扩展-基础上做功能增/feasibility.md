# 可行性评估 — 在现有 Raw Copy（Chrome/Edge DevTools MV3）基础上做功能增强

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> 版本: v1.0 ｜ 日期: 2026-10-02 ｜ 作者: butler-strategist（Phase ①.5）
> 上游：`requirement.md`（v1.0，53 条机器真源）+ `spec.json` / `spec.md`
> 只读评估：不写代码、不改源码；结论以可读代码事实为据

---

## 0. 总体结论

**✅ 可执行（Go）** — 综合判定 **VALUE = high ｜ RISK = medium ｜ EFFORT = medium（偏高）**。

- 三项新增能力（右键菜单复制 / 多选批量复制 / 双击查看明细）均为**对既有模块（selection / formatter / clipboard / panel）的交互与组合扩展**，无新算法、无网络、无新权限，技术上无不可逾越障碍。
- **无硬阻塞**。7 条待确认假设（A-1..A-6 / DEC-001..004）均有**安全默认值**，可推进并在下游设计（Phase ②）定稿；其中 1 条（多选时大响应阈值确认行为）建议在故事/设计阶段显式拍板。
- 主要谨慎点：**单选复制格式「逐字符不变」是门禁级冻结契约（DEC-007 / AC-007）**，而 selection 与 formatter 是本次改动波及面最大的两个既有模块，**回归权重需加倍**（建议 lifecycle=development 但回归门禁按 maintenance 执行）。

---

## 1. 分类

| 维度 | 判定 | 依据 |
|------|------|------|
| 任务类型 (TYPE) | **direct（增量功能增强 / incremental feature）** | 在既有扩展上叠加，非新建、非 bug 修复 |
| 生命周期 | **development**（架构优先，不留技术债） | 新增能力为主；但因存在冻结契约，回归门禁额外加权 |
| 变更性质 | 交互组合扩展 + 1 项自定义逻辑（多记录拼接器） | requirement.md Phase 2「未匹配的功能点：无自研算法类新功能」 |
| 变更规模 | **≤ 10 个文件**（含新模块 2 个 + 测试 3~4 个） | 见 §4 文件清单 |
| 技术栈影响 | 无 | MV3 / 原生 JS / 零依赖 / 权限不变（AC-012/016） |
| 优先级结构 | P0 主体（R-001/003/004/005..012/014/015）+ P2 可选（R-002 仅请求·仅响应、R-013 明细内复制） | requirement.md §2 核心功能表 |
| 需求特殊性 | **显式推翻基线非目标**（多选复制），须在规格与回归用例中记录 | DEC-005 / AC-017 |

---

## 2. 价值评估（VALUE: **high**）

### 2.1 用户价值（源自老板原话 + 角色映射）

| 功能 | 目标用户 | 痛点 → 收益 | 价值 |
|------|---------|-------------|:----:|
| 右键菜单复制（R-001/003/004） | 前端开发、技术支持 | 原话「复制按钮在下面，找起来还挺麻烦」→ 取用从「滚动到底部找按钮」降为「行上右键即达」 | **high** |
| 多选批量复制（R-005..008） | 测试工程师 | 多条请求附 Bug 报告需逐条复制 → 一次批量、分段输出 | **high** |
| 双击查看明细（R-009..012） | 后端开发 | 「不复制也能看原文」→ 排查路径缩短，避免污染剪贴板 | **high** |
| 仅请求/仅响应、明细内复制（P2） | 全部 | 减少手动裁剪 | medium |

### 2.2 产品/战略价值

- **直接回应唯一明确用户反馈**（入口难找），是对既有功能的可用性补强，非扩张性需求 → ROI 明确、无市场风险。
- 三项能力共享同一条复制管线（formatter + clipboard），实现成本在已有资产上摊销。
- 保持零依赖 / 最小权限 / 零网络，**不引入任何合规、隐私或供应链新增面**，与基线定位（开源、隐私友好）一致。

### 2.3 价值结论

**VALUE = high**。其中 R-004（右键为**主要**入口、底部按钮降为补充）是本次体验改善的核心杠杆，须在验收中可观测（AC-001 已覆盖）。

---

## 3. 风险评估（RISK: **medium**）

### 3.1 风险登记表

| ID | 风险 | 概率 | 影响 | 等级 | 缓解措施 | 关联 AC |
|----|------|:----:|:----:|:----:|---------|---------|
| **R-01** | 破坏 `formatter` 逐字符保真契约（单选格式被改动） | 中 | 高 | **高** | **冻结 formatter**（`extension/src/formatter.js:293 buildCopyText` 不改）；多选只在**外层**做拼接，每条仍调用原 `buildCopyText`；用基线 golden 用例逐字符回归 | AC-002/007/009/015 |
| **R-02** | selection 由「单选」扩为「集合」时破坏原有单选/↑↓ 语义 | 中 | 高 | **高** | 保留单选回落路径（单击替换、↑↓ 单选移动、clamp）；`selection.js` 现有 13 用例全量回归 + 新增集合用例；`onEvict` 钩子必须同步清理集合 | AC-004/015 |
| **R-03** | 右键菜单误用 `chrome.contextMenus` → 被迫新增 `contextMenus` 权限，**违反最小权限** | 中 | 高 | **中** | **必须**面板内自绘 DOM 菜单（`contextmenu` 事件 + 定位 + Esc/失焦关闭），零权限；在 TASK 中写入硬约束 | AC-012 |
| **R-04** | 单击 / 双击事件分流冲突（双击前必有一次 click，行会先被选中） | 高 | 中 | **中** | 采纳 A-6：双击以该行 id 打开明细，**不改动多选集合**；详情打开后以 recordId 重取数据，不依赖 DOM 行状态 | AC-010/012 |
| **R-05** | 虚拟滚动下选中行/详情行不在 DOM（`render.js` 窗口化，`extension/panel.js:891`） | 中 | 中 | **中** | 选中集合与详情**按 recordId 存于 store**（`extension/src/store.js`），不按行索引/DOM 判定；`setIds` 失效清理已有先例 | AC-005/006/010 |
| **R-06** | 大响应阈值 `confirm` 在多选下的行为未定义（逐条确认 / 整体确认 / 单次） | 高 | 中 | **中** | **需设计拍板**（见 §7 待确认）；建议默认「一次确认、覆盖本批」，避免 N 次弹窗 | AC-014 |
| **R-07** | 多选拼接分隔结构不确定，可能「混淆成一条」 | 中 | 中 | **中** | 拼接器结构固定：序号 + 分隔线 + 每条各自 `buildCopyText` 原始块；专属单测覆盖「段数 = N、段边界无跨条拼接」 | AC-006 |
| **R-08** | 新 UI 文案未 zh/en 对齐（基线约定） | 低 | 低 | 低 | 统一走 `extension/src/i18n.js:26 dict` 新增键，`tests/i18n.test.mjs` 校验键集对齐 | — |
| **R-09** | 体积突破 < 200KB / 引入第三方依赖 | 低 | 中 | 低 | 现状压缩 51.16KB（见 registry F-P14b），新增为原生 JS；打包门禁 `scripts/package.mjs` 已含体积 + 零依赖审计 | AC-016 |

### 3.2 二阶/三阶后果（二阶思维）

- **一阶（预期）**：入口更易达、支持批量、可免复制查看。
- **二阶（连锁）**：多选改变 `selection` 的数据模型 → 所有依赖「单一选中」的逻辑（高亮、↑↓、`getSelected()`、淘汰联动）需重新审视线程安全与一致性；`panel.js` 承担三处新接线，易成复杂度热点。
- **三阶（远因）**：基线语义「绝不附带其他请求」被推翻后，后续任何自动化导出（如未来 cURL、Markdown 导出）将默认面对"多选集"语境 —— 本增强须把「单条仍是默认主场景」写死，避免语义漂移。

### 3.3 风险结论

**RISK = medium**。两项高风险（R-01/02）均为**回归型**而非实现型风险，靠"冻结 formatter + 集合化 selection 全量回归"可控；唯一需要**人工拍板**的是 R-06（多选时大响应确认），不阻断可行性。

---

## 4. 工作量评估（EFFORT: **medium，偏高 ｜ 约 19 SP + 2 SP 缓冲**）

### 4.1 分解（Story Points）

| # | 工作包 | 涉及文件 | SP | 说明 |
|---|--------|---------|:--:|------|
| **T1** | 行级右键菜单（含 P2 仅请求/仅响应） | `panel.js`(edit) + 新 `extension/src/contextmenu.js`(纯逻辑) + `panel.html`/`panel.css` | **3** | 面板内自绘菜单；右键即选中；复用复制管线 |
| **T2** | selection 多选扩展（Ctrl/Shift + 全选 + 选中计数 + 单选回落） | `extension/src/selection.js`(extend) + `panel.js`(edit) | **5** | 改动面最大：集合模型 + 既有 13 用例回归 + 新用例 |
| **T3** | 多记录拼接器（分隔线 + 序号 + 每条原始块） | 新 `extension/src/bulkformatter.js`(纯函数) + `panel.js`(edit) | **3** | 只做外层拼接，**不触碰 formatter** |
| **T4** | 双击详情视图（容器 + 关闭返回 + 原始渲染 + P2 复制按钮） | 新 `extension/src/detail.js` + `panel.js`(edit) + `panel.html`/`panel.css` | **5** | 复用 `content.js` 的 `classifyBody`/`isOverThreshold`；保留原始文本 |
| **T5** | i18n 新键 + 回归 + 权限/体积门禁 | `extension/src/i18n.js` + `tests/*.test.mjs` + 既有测试全量 | **3** | AC-004/007/012/015/016 门禁 |
| — | **缓冲**（click/dblclick 分流 + 虚拟滚动联动 + 多选×淘汰边界） | — | **2** | 已知集成风险预留 |
| | **合计** | | **19 SP（+2）** | |

### 4.2 工作量分布结论

- 无高难技术（无算法、无网络、无并发）；工作量集中在**既有状态机的安全扩展**与**新增 UI 接线**。
- 测试成本占比高（估计 ≥ 5 SP）：因存在冻结契约与既有 11 个测试文件（`tests/`），回归成本不可压缩。
- 相对基线（M1–M5、16 个 TASK）本增强约为其 **1/3 规模**的一次迭代。

### 4.3 文件清单（预估）

**修改（≤6）**：`extension/panel.js`、`extension/panel.html`、`extension/styles/panel.css`、`extension/src/selection.js`、`extension/src/i18n.js`、`extension/manifest.json`（**只校验不改**，除非版本号）
**新增（2~3）**：`extension/src/contextmenu.js`、`extension/src/bulkformatter.js`、`extension/src/detail.js`
**测试（3~4）**：`tests/contextmenu.test.mjs`、`tests/bulkformatter.test.mjs`、`tests/detail.test.mjs`、`tests/selection.test.mjs`(扩展)

> 依据：`extension/panel.js:891` 行为主接线面；`extension/src/selection.js:70 createSelection` 现为单选状态机；`extension/src/formatter.js:293 buildCopyText` 为复用点（**禁改**）；`extension/src/content.js:278 classifyBody` / `:338 isOverThreshold` 供详情复用。

---

## 5. 子任务级 VALUE / RISK / EFFORT 矩阵

| 工作包 | VALUE | RISK | EFFORT | 判定 | 建议 CHAIN |
|--------|:-----:|:----:|:------:|------|------------|
| T1 右键菜单 | high | low | low-medium | ✅ 执行 | frame-builder → developer → tester |
| T2 多选扩展 | high | **high** | medium-high | ⚠️ 执行（回归加权） | frame-builder → developer(+review) → tester |
| T3 多选拼接器 | high | medium | low-medium | ✅ 执行 | developer → tester |
| T4 双击详情 | high | medium | medium-high | ⚠️ 执行 | frame-builder → developer(+review) → tester |
| T5 i18n/回归/门禁 | medium | low | low-medium | ✅ 执行 | config-changer / developer → tester |
| P2：仅请求/仅响应、明细内复制 | medium | low | low | ✅ 可选纳入同一迭代 | 并 T1/T4 |

> 无 `low VALUE + high RISK` 组合 → **无 REJECT、无 BACKLOG**。全部工作包进入本迭代（P2 可延后不影响 P0）。

---

## 6. 关键判定依据（代码事实）

| 事实 | 出处 | 对评估的意义 |
|------|------|-------------|
| 选中逻辑已抽为纯逻辑模块，含 `setIds`/`reset`/`onEvict` | `extension/src/selection.js:70`、`:224`、`:209` | 多选扩展有清晰落点，且已有失效清理先例（R-05 可控） |
| 复制拼接为纯函数 `buildCopyText(record, mode, options)` | `extension/src/formatter.js:293` | 多选只需外层循环调用，**零侵入**保真（R-01 可控） |
| 响应体分类/阈值已独立 | `extension/src/content.js:278` / `:338` | 详情视图直接复用，无需新逻辑（R-06 仅剩交互决策） |
| i18n 为 zh/en 键字典 | `extension/src/i18n.js:26` | 新文案有既定落点（R-08 低） |
| 现有测试 11 个文件（含 selection 13 用例、formatter 24 用例 golden） | `tests/` | 回归基线充分，冻结契约可被逐字符验证 |
| 权限现为最小集，面板可自绘 UI | `extension/manifest.json`（14 行）、`extension/panel.html` | 右键菜单必须走 DOM 自绘，零权限（R-03 硬约束） |
| 打包门禁已含体积 + 零依赖审计 | `scripts/package.mjs`（registry F-P14a） | AC-016 有自动化保障（R-09 低） |

---

## 7. 待确认假设（不阻断，需下游定稿）

| ID | 假设 | 默认值（可推进） | 影响面 | 建议定稿阶段 |
|----|------|------------------|--------|-------------|
| A-1 | 「复制选中(N)」N 统计范围 | 当前**过滤后可见**列表 | 多选计数/全选 | 故事/设计 |
| A-2 | 「全选」范围 | 当前过滤后可见全部行 | 同上 | 故事/设计 |
| A-3 | 右键菜单是否含「复制选中(N)」 | 按钮与右键菜单项等价并存 | UI | 设计 |
| A-4 | 明细展示与模式 A/B 关系 | 详情始终原始文本；A/B 只影响复制产物 | 详情 | 设计 |
| A-5 | 多选分隔形式 | 「分隔线 + 序号」组合 | 拼接器 | 设计（影响 AC-006） |
| A-6 | 双击时的选中语义 | 该行先被选中；详情不改动多选集合 | 事件分流 | 设计（影响 AC-010） |
| R-06 补充 | 多选时大响应阈值确认 | 建议「一次确认、覆盖本批」 | 复制流程 | **建议本阶段拍板** |

---

## 8. 执行建议

1. **冻结契约先行**：TASK 中显式标注 `formatter.js` 与单选 golden 为**不改动**基线，作为 CI 门禁（AC-007）。
2. **T2 与 T1/T4 解耦**：selection 扩展（T2）风险最高，建议独立 TASK + 全量回归，避免与 UI 接线同批返工。
3. **右键菜单零权限硬约束**写入 TASK（AC-012），防止实现期走 `chrome.contextMenus` 捷径。
4. **详情与多选均以 recordId 为真源**，不依赖 DOM/虚拟窗口，规避虚拟滚动集成风险（R-05）。
5. **回归门禁按 maintenance 权重执行一次**（虽然 lifecycle=development），因存在 AC-015「现有基线用例全部回归通过」。
6. P2 项（R-002 / R-013）可与 P0 同迭代，但不作为发布阻塞。

---

## 9. 交付判定

- **Go / No-Go**：**Go**（可执行）。
- **分类**：功能增强型 · development · direct。
- **规模**：约 19 SP（+2 缓冲），预计 5 个 TASK（T1–T5，P2 并入 T1/T4）。
- **阻塞项**：无硬阻塞；1 项建议拍板（多选时大响应确认行为），6 项有默认值可推进。

---
<!-- butler:covers REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 REQ-006 REQ-007 REQ-008 REQ-009 REQ-010 REQ-011 REQ-012 REQ-013 REQ-014 REQ-015 AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-007 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 AC-017 -->
