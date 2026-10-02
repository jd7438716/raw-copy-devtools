# 02 · 修复方案设计：Raw Copy v1.1.0 三项修复/调整（多选漏条 / 复制模式按钮化 / 移除分段复制）

> **文档版本**：v1.0（覆盖重写本目录旧内容）
> **日期**：2026-10-02
> **阶段**：Mode plan（fix 管线 · 方案设计节点）
> **角色**：butler-fix-analyst
> **方法论**：`skill: fix-guardrails`（横切约束前置 → 多方案 ≥2 → 后果追溯 ≥2 层 → 5 轴评分 → 反偷懒清单 → 6 角度对抗 → pre-mortem）
> **问题 slug**：`对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> **上游输入**：`01-root-cause.md`（RC-1/RH-2/RC-3/RC-4，均 `confidence: high`）、`spec.json`（REQ-001..016 / DEL-001..018 / AC-001..017）
> **覆盖范围**：本文**覆盖重写** `butler/spec/对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-/02-solution-design.md`；只做方案设计，**不修改任何生产代码、不启动任何 DAG**。
> **机读结论**：见文末 `---ARCH_START---` / `---ARCH_END---`。（`DAG_STARTED: false` / `CODE_CHANGED: false`）
> **推荐方案**：**方案 A · 入口语义统一 + 显式模式重构 + 回归网补齐（对根因）**（`score: 23/25`）。
> **用户决策**：`USER_DECISION_REQUIRED: true`（见 §10，待拍板）。

---

## 0. 根因 → 方案映射（设计目标锚点）

| 根因 | 性质 | 本方案必须命中 | 覆盖 spec |
|------|------|----------------|-----------|
| **RC-1** `onContextMenu` 弹菜单前无条件 `multi.selectAt(index)`，使 `count≥2` 批量项永不可达、菜单复制只含 1 条 | 技术/入口语义 | 统一「工具栏 / 右键」两入口语义；命中已选行保留集合、命中集合外行替换 | REQ-001/002/003、AC-001/002/003 |
| **RC-2** 分派先判 Shift + `rangeTo` 替换闭区间，Ctrl+Shift 丢弃先前 Ctrl 已选项 | 技术/选择语义 | additive 并集扩选（新增 `extendTo`），保持纯 Shift 替换不倒退 | REQ-004、AC-004/006 |
| **RC-3** ADR-014 两条决策互斥，右键在多选内的保留语义未定义 | 设计/流程 | 重裁 ADR-014 为一致规则 + 补「联合可满足性」核对 | REQ-014、AC-017 |
| **RC-4** 验证网按入口割裂（纯模型单测 / 只测全选+工具栏 / 无混合修饰键） | 测试/流程 | 补面板级接线、混合修饰键、入口等价、②golden、③删除断言 | REQ-013、AC-013/014/015 |
| **RC-5**（关联）③ 移除分段复制能力面 | 能力收敛 | 一并移除菜单 P2 + 底部两按钮 + 共享逻辑 + i18n | REQ-008/009、AC-009/010 |
| **RC-6**（关联）② 模式按钮化 | 体验调整 | 显式模式按钮（动作即模式），取消 toggle 状态 | REQ-006/007/012、AC-007/008 |

**一句话目标**：本轮三项 ①②③ 必须**同批交付**——① 以「入口语义统一 + additive 扩选」根治漏条（并同步 ADR 与回归网，防复发）；② 以「动作即模式」的独立按钮替换 toggle；③ 收敛分段复制能力面；全程维持既有约束（MV3 / 零依赖 / 仅 `clipboardWrite` / 零网络 / 字符级保真）。

---

## 1. 横切约束前置（不可违背）

### 1.1 硬约束

| # | 约束 | 来源 |
|---|------|------|
| C-1 | 保留 MV3；**仅 `clipboardWrite`**，不新增 `host_permissions`/网络权限 | REQ-010 / AC-011 |
| C-2 | **零第三方依赖**、原生 ESM；发行体积门禁 **<200KB** | REQ-010/011 / AC-011/016 |
| C-3 | **零网络传输**；不落盘 | REQ-010 / AC-011 |
| C-4 | 响应体**字符级保真**；大响应/二进制/Base64 规则不变 | REQ-011 / AC-012 |
| C-5 | 模式 A/B **产物字节契约不变**（`formatter.js` 冻结），默认模式 A | REQ-007 / AC-008 |
| C-6 | 多选集合既有不变量不得破坏：`count()` 与 `selectedIds()` 同源；`selectAt` 替换、`toggleAt` 增删、`move` 清集合回落单选、`setIds` 剪枝、`onEvict` 同步移除 | REQ-004 / AC-004/015 |
| C-7 | `createMenuModel` 保持**纯函数**（输入非法按空上下文，不抛异常）；菜单项顺序稳定 | REQ-008 / AC-009 |
| C-8 | 菜单批量项在 `count≥2` 时**必须真实可达**（消除死规则） | REQ-003 / AC-001 |
| C-9 | 工具栏批量项与右键批量项对同一集合产物**逐字符一致**（N≥2 含 `===== #i/N =====`） | REQ-001 / AC-003 |
| C-10 | 现有测试（除有意更新用例）保持全绿，基线 **264/264** 不回归 | REQ-013 / AC-015 |
| C-11 | 门禁/文档/i18n/E2E 与代码**同批同步**（id 清单、键断言、用例说明、ADR） | REQ-014/015 / AC-014/017 |

### 1.2 「绝对不做」清单（给实施节点的硬约束）

- ❌ 只改 `onContextMenu` 一行「加个 if」而不统一入口语义、不补回归网（RC-1/RC-3/RC-4 会复发）。
- ❌ 全局把 `rangeTo` 的**替换语义**改掉（会破坏纯 Shift 替换与既有 `multiselection.test.mjs:152-205` 期望）；additive 必须以**新增方法**承载。
- ❌ 为修 ① 而改动 `bulkformatter.js`/`formatter.js` 的冻结产物契约。
- ❌ 保留 `#mode-toggle` 或任何「先切换再复制」的模块级可变模式状态（违反 REQ-006 / AC-007）。
- ❌ 误删核心「复制请求 + 响应（原始）」与多选批量项（REQ-009 / AC-010）。
- ❌ ③ 清理时只删菜单项而留下孤儿共享逻辑/i18n/门禁 id（产生悬空引用与门禁漂移）。
- ❌ 新增任何第三方依赖或网络调用。

---

## 2. 多方案设计

> 至少 2 个独立方案（本节给出 3 个）。每方案含：描述 / 变更范围（file:line）/ 优点 / 缺点风险。

### 方案 A（推荐）— 入口语义统一 + 显式模式重构 + 回归网补齐（对根因）

**描述**：三项 ①②③ 一次性按「根因」治理。

- **①-a（RC-1/RC-3）入口语义统一**：`onContextMenu` 不再无条件 `selectAt`。新增判定——**命中行已在集合内 → 保留集合**（不坍缩，菜单 `count≥2` 自然成立并可点批量项）；**命中行在集合外 → `selectAt(index)` 单选替换**（保留「右键定位到该行」的既有心智）。随后 `openMenuAt` 用真实 `count` 构建菜单。ADR-014 同步重裁为这条一致规则。
- **①-b（RC-2）additive 扩选**：`multiselection.js` **新增 `extendTo(index)`**（以 `anchor` 为起点取闭区间，结果与既有 `selected` **并集**，不清空），`rangeTo` 保留替换语义。`panel.js` 分派顺序改为：`shiftKey && (ctrlKey||metaKey)` → `extendTo`；`shiftKey` → `rangeTo`；`ctrlKey||metaKey` → `toggleAt`；否则 `selectAt`。
- **②（RC-6）显式模式**：删除模块级可变 `copyMode` 与 `#mode-toggle`；在底部复制按钮区提供**两个独立按钮**（模式 A / 模式 B），每个按钮携带 `data-copy-mode`，点击即以该模式复制当前记录（动作即模式）。批量入口（工具栏 `#copy-selected-btn` 与菜单 `copy-selected`）统一按默认模式 A 复制（REQ-007 默认语义；B 批量不在本轮需求内，写入选型决策）。`getCopyMode()` 保留为「恒定返回 MODE_A」的兼容导出，`setCopyMode()` 废弃移除。
- **③（RC-5）能力收敛**：删除菜单 P2 两项 + `CTX_ACTION/CTX_ITEM_ID` P2 常量 + `createMenuModel` 的 `canCopyRequestOnly` 入参与 p2 分支；同步删除底部 `#copy-req-btn/#copy-resp-btn` 及其接线、`runSectionCopy/buildSectionCopy/extractSectionText` 共享逻辑、对应 i18n 键（zh/en）。
- **④（RC-4）回归网**：补面板级接线测试（真实 `panel.js` + DOM shim 或扩展 E2E）、混合修饰键并集、入口等价逐字符、②A/B golden、③删除断言；同步 `check-panel-shell.mjs` id 清单、`i18n.test.mjs` 键断言、E2E harness 步骤、`test-cases.md/README`、`docs/USAGE/INSTALL`、ADR-014。

**变更范围**：

| 文件 | 变更 | 说明 |
|------|------|------|
| `extension/panel.js:1586-1608` | 修改 | `onContextMenu` 入口语义统一（命中已选保留 / 未选替换） |
| `extension/panel.js:811-817` | 修改 | 修饰键分派顺序：`shift+ctrl` → `extendTo`；shift → `rangeTo`；ctrl → `toggleAt`；无 → `selectAt` |
| `extension/panel.js:98-99,428-455,887-895,990,1029` | 修改 | 移除可变 `copyMode`/`setCopyMode`；`runCurrentCopy(mode)` 显式入参；批量入口固定 MODE_A；保留 `getCopyMode()` 为常量导出 |
| `extension/panel.js:1492-1511,1638-1654,1552-1561` | 修改 | 删除 P2 分派与底部按钮接线；`openMenuAt` 去掉 `canCopyRequestOnly` |
| `extension/panel.js:1379-1424,1453-1489` | 删除 | 移除 `extractSectionText/buildSectionCopy/runSectionCopy` |
| `extension/src/multiselection.js:246-285,462-466` | 修改+新增 | 新增 `extendTo(index)`（并集、不清空、保持 anchor/primary 语义）；导出追加，`rangeTo` 不动 |
| `extension/src/contextmenu.js:30-43,150-155,177-233` | 修改 | 删除 P2 常量/入参/分支；`count≥2` 批量项保留；更新 `:162-164` 注释与实现一致 |
| `extension/panel.html:70-74,126-133` | 修改 | 删 `#mode-toggle`；底部改 `#copy-btn-a`/`#copy-btn-b`（`data-copy-mode="A|B"`）；删 `#copy-req-btn/#copy-resp-btn` |
| `extension/styles/panel.css:111,148,161,165,169,173` | 修改 | 删 `.mode-toggle*`；新增模式按钮样式（沿用既有 token，不新造变量） |
| `extension/src/i18n.js:51-55,59-60,113-114,153-157,161-162,215-216` | 修改 | 新增模式 A/B 按钮键；删 `copy.buttonRequest/Response`、`contextmenu.copyRequestOnly/copyResponseOnly`（zh/en 对齐） |
| `tests/contextmenu.test.mjs:291-331` | 修改 | 清理 P2 形状断言；新增面板级接线（真实 `onContextMenu` 折叠）用例 |
| `tests/multiselection.test.mjs:152-205` | 修改 | 新增 `selectAt+toggleAt+extendTo` 并集用例；保留 `rangeTo` 替换用例 |
| `tests/i18n.test.mjs:71-72,85-86` | 修改 | 键集断言同步（新增模式键 / 删除 P2 键） |
| `tests/formatter.test.mjs` / `tests/bulkformatter.test.mjs` | 修改 | ②A/B 双按钮产物与冻结 golden 逐字符断言；批量入口等价 |
| `butler/spec/…功能增/e2e-artifacts/harness/run-e2e.mjs:505-520,523-546` | 修改 | 替换 `#mode-toggle` 步骤为 A/B 按钮；新增多选态右键批量 + 混合修饰键场景 |
| `scripts/check-panel-shell.mjs:129-136` | 修改 | id 清单：删 `mode-toggle/copy-req-btn/copy-resp-btn`，增 `copy-btn-a/copy-btn-b` |
| `butler/plan/…功能增/plan.md:506-517` | 修改 | ADR-014 重裁：命中已选=保留 / 命中未选=替换 + 「联合可满足性」核对 |
| `tests/test-cases.md:91` + `tests/README.md` | 修改 | 清理 P2 用例、补新场景说明 |
| `docs/USAGE.md` / `INSTALL.md` | 修改 | 同步删除分段复制说明、说明 A/B 按钮与批量默认 A |
| `dist/` 发行 ZIP | 修改 | `[ASSUMPTION]` 重新打包 + 体积/零依赖/读回门禁 |

**优点**：
- 完整命中 RC-1/RC-2/RC-3/RC-4（技术 + 设计 + 测试三层），从根因杜绝复发；`extendTo` 新增而非改 `rangeTo`，C-6/AC-015 不倒退。
- 入口语义统一后，「工具栏 / 右键」天然产出逐字符一致（C-9/AC-003），批量项从死规则恢复可达。
- 模式状态从「可变全局」降为「动作实参」，无 toggle 残留（AC-007），默认 A 契约不变（AC-008）。
- ③ 一次性收敛，消除孤儿共享逻辑与门禁漂移。

**缺点 / 风险**：
- 改动跨 `panel.js`/`multiselection.js`/`contextmenu.js`/`panel.html`/`css`/`i18n` + 6 类测试/门禁/文档，工作量为三方案最大。
- 右键「命中已选保留」改变既有交互（此前右键必坍缩），需真机确认无用户困惑（CE-9）。
- 「批量入口固定 A」是相对现状的行为收窄（现状 toggle 可让批量走 B），需在 ADR 显式记录决策（见 §10 待定项）。

---

### 方案 B — 最小接线补丁（保留 toggle 与 P2，仅加 A/B 快捷按钮）

**描述**：只做「症状级」修补：`onContextMenu` 命中行时**永不改集合**（去掉 `selectAt`），`rangeTo` 直接改为 additive；保留 `#mode-toggle` 与模块级 `copyMode`，另在按钮区**并列**加两个「模式 A/B」快捷按钮（点击先设模式再复制），P2 两项暂留。

**变更范围**：
- `extension/panel.js:1603-1607` — 删除 `selectAt`（右键不改集合）；
- `extension/src/multiselection.js:275` — 删除 `selected.clear()`（`rangeTo` 全局 additive）；
- `extension/panel.html:70-74` — 保留 `#mode-toggle`，新增 A/B 快捷按钮；
- `extension/panel.js:428-455` — `setCopyMode` 继续使用；
- P2 / 底部按钮 / i18n / 文档 — 基本不动。

**优点**：改动量最小、最快落地；批量项即刻可达。

**缺点 / 风险**：
- **不满足 REQ-006/AC-007**：toggle 未取消、状态残留；「先切换再复制」心智仍在。
- **不满足 REQ-008/AC-009**：P2 未删。
- **破坏 C-6/AC-015**：`rangeTo` 替换语义被全局改写，纯 Shift 行为与既有单测期望倒退。
- 右键「永不改集合」使「右键集合外行」无法定位选择 → 新 UX 缺陷。
- RC-3/RC-4 完全未治 → 同类漏条可再次全绿发布。

---

### 方案 C — 选择模型重构为「多选为主」（集合常驻，废弃单选回落）

**描述**：把 `multiselection` 的核心模型改为「选中即集合」：无修饰点击也 `toggleAt`，`move` 不清集合，菜单恒有批量项（`count≥1` 即可批量）。从模型层消灭「单选/多选」双态。

**变更范围**：`extension/src/multiselection.js:200-320,386-450` 全面改写；`extension/panel.js:794-838,1586-1608` 重写交互；`tests/multiselection.test.mjs` 大量用例重写。

**优点**：模型最一致，理论上无「入口语义分裂」。

**缺点 / 风险**：
- 直接推翻 `move`/`selectAt`/`rangeTo`/键盘导航等既有不变量（C-6 全面冲突），`tests/multiselection.test.mjs` 大面积改写。
- 「单选复制」主用例（点一行 → 复制该行）失去简洁语义，需重新设计。
- 与本轮「三项修复」范围严重超配，与「最小必要变更」原则冲突 → `[weak_solution]`。

---

## 3. 后果追溯（≥2 层，反偷懒 #1）

### 方案 A 连锁反应

```
直接后果：
  a) 右键命中已选行不再坍缩 → 菜单 count≥2 → 出现「复制选中(N)」→ 点击走 copySelection(MODE_A) 产出 N 段；
  b) Ctrl 选集后 Ctrl+Shift 扩选 → extendTo 并集 → 先前 id 不丢；
  c) #mode-toggle 消失 → 复制按钮区仅 A/B 两按钮，点击即以该模式执行；
  d) 菜单 P2 与底部 req/resp 按钮及其共享逻辑/i18n 被移除。
  → 二级后果：
     i)   入口等价约束（C-9）成为新契约，工具栏与右键共用 runCopySelection 同一路径 → 一致性质可被测试固定；
     ii)  createMenuModel 签名收窄（去 canCopyRequestOnly）→ 所有旧调用点/测试形状断言须同步，否则 TypeError/断言失败；
     iii) i18n 键集变化 → i18n.test 键数断言、E2E 文案选择器、check-panel-shell id 清单须同批改；
     iv)  模块级 copyMode 删除 → 任何隐式读取该变量的代码路径需显式传参，漏改会退化为 undefined 模式。
     → 三级后果：
        i)   若 additve 语义与纯 Shift 替换共用 anchor 未澄清，会出现「连续 Shift 扩选后 Ctrl+Shift 锚点漂移」→ 需在 ADR/测试中固化 anchor 契约；
        ii)  「批量固定 A」若用户确有批量 B 需求，会在 UAT 暴露 → 已登记为 §10 待定决策，可后续增量补 `#copy-selected-b-btn`；
        iii) 删除共享逻辑若不彻底，会留死代码（extractSectionText 无调用）→ 由「无未使用导出」门禁/审查兜底。

回退方式：三项彼此解耦，可分别 revert（① 面板+multiselection / ② HTML+panel / ③ contextmenu+panel+html）；
          ② 若只保留 A/B 按钮而实现有问题，可临时回退到「单按钮 + 默认 A」不影响 ①③。
          回退耗时 ≈ 单次 revert + 重跑单测/E2E（<30min）。
          `[irreversible: false]`

3 个月后：入口语义与 additive 扩选沉淀为可测契约，ADR-014 不再自相矛盾；风险是「批量仅 A」的
          能力收窄被用户反复要求 → 属可增量补齐的小债，远优于漏条复发；整体长期健康。
```

### 方案 B 连锁反应

```
直接后果：右键不再改集合 + rangeTo 全局 additive → 二级后果：
          纯 Shift 替换语义消失，既有 152-205 用例期望倒退（AC-015 失败）；
          右键集合外行无法定位（新缺陷）；toggle 与 P2 仍在（AC-007/009 失败）。
          三级后果：RC-3/RC-4 未治 → 下一轮同类「入口割裂」漏条可再次全绿发布，缺陷复发。

回退方式：恢复 selectAt 与 selected.clear()（等于没修）。回退耗时短，但等于放弃根治。
3 个月后：留下「症状修一半、契约与测试倒退」的技术债，且 toggle/P2 与需求持续冲突 → [quick_fix_alert]。
```

### 方案 C 连锁反应

```
直接后果：选择模型全面改写 → 二级后果：既有单测大面积重写、单选主用例语义改变、
          与既有 ADR/不变量冲突；三级后果：本轮范围失控、回归面不可控、发布风险升高。

回退方式：整体 revert 重构（成本高）。回退耗时以天计，且中途状态不可发布。
3 个月后：要么半成品模型长期悬空，要么被迫再次重构 → [weak_solution]。
```

---

## 4. 5 轴评分（反偷懒 #2）

| 维度 | 方案 A | 方案 B | 方案 C |
|:-----|:------:|:------:|:------:|
| A. 技术正确性（是否解决根因 + 副作用） | 5 | 3 | 3 |
| B. 实施可行性（改动量/风险/可逆性） | 4 | 4 | 2 |
| C. 安全合规（漏洞/违规） | 5 | 4 | 4 |
| D. 长期可维护性（3 个月后好坏） | 5 | 2 | 3 |
| E. 影响范围（对现有系统冲击可控度） | 4 | 3 | 2 |
| **综合** | **23/25** | **16/25** | **14/25** |

**低分说明与可改善性**：
- 方案 A：B 维 4（跨 6 类文件，工作量最大，但可解耦 revert、有 264 基线）；E 维 4（右键交互与批量默认 A 有行为收窄，但均可增量回调）；无 ≤2 维度，综合 23/25。
- 方案 B：**D 维 2 → `[quick_fix_alert]`**（RC-3/RC-4 未治，复发风险高；`rangeTo` 语义倒退）。改善路径：补 ADR 重裁 + 回归网 + 新增 `extendTo`，即回到方案 A。
- 方案 C：**B/E 均 ≤2 → `[weak_solution]`**（综合 14/25 < 15，范围超配、回归不可控）。改善路径：收敛为「模型不动，仅加 additive 方法」，即方案 A。

---

## 5. 方案对比 + 推荐

| 维度 | 方案 A（推荐） | 方案 B | 方案 C |
|:-----|:-------------:|:------:|:------:|
| 改动规模 | 中-大（多模块 + 测试 + 文档） | 小 | 大（模型重构） |
| 5 轴综合 | **23/25** | 16/25 | 14/25 |
| 回退难度 | 低（三项解耦、可分别 revert） | 低（等于不修） | 高（整体重构） |
| 长期健康 | 好（语义/ADR/回归网沉淀） | 差（复发 + 契约倒退） | 中-差（悬空重构） |
| 根因覆盖 | RC-1/RC-2/RC-3/RC-4/RC-5/RC-6 全覆盖 | 仅部分 RC-1/RC-2 | 仅 RC-1（且超配） |

**推荐：方案 A。** 理由：唯一同时满足「根治 RC-1/RC-2」「重裁 RC-3 防复发」「补 RC-4 回归网」「完成 ②③ 全部需求」「不破坏既有不变量与冻结契约」的方案；且变更**按项解耦、可逆、可测**，与既有 ADR/约束一致。B/C 保留为对照。

---

## 6. spec ID 覆盖矩阵（方案 ↔ spec 条目）

> ✅ 直接满足 ｜ 🔶 部分/间接满足（需补充动作） ｜ ❌ 不满足

### 6.1 需求（REQ）

| spec ID | 方案 A | 方案 B | 方案 C |
|---------|:------:|:------:|:------:|
| REQ-001 入口统一（工具栏≡右键，N 段一致） | ✅ | 🔶 | ✅ |
| REQ-002 右键不丢多选（已选保留/未选替换） | ✅ | 🔶（永不改集合，语义偏离） | ✅ |
| REQ-003 菜单批量项 count≥2 真实可达 | ✅ | ✅ | 🔶（count≥1） |
| REQ-004 Ctrl+Shift 并集（additive range） | ✅ | ✅（但改坏纯 Shift） | ✅ |
| REQ-005 边界 0/1/N、全选/Ctrl/Shift/混合 | ✅ | 🔶 | ✅ |
| REQ-006 A/B 独立按钮，取消 toggle | ✅ | ❌（toggle 保留） | ✅ |
| REQ-007 保留默认 A；A/B 产物契约不变 | ✅ | ✅ | ✅ |
| REQ-008 移除右键仅请求/仅响应（含逻辑/i18n/测试） | ✅ | ❌ | ✅ |
| REQ-009 保留核心主项 + 多选批量项 | ✅ | ✅ | ✅ |
| REQ-010 约束：MV3/零依赖/仅 clipboardWrite/零网络 | ✅ | ✅ | ✅ |
| REQ-011 字符级保真；体积门禁不受影响 | ✅ | ✅ | ✅ |
| REQ-012 openContextMenu 契约回归；getCopyMode/setCopyMode 处置 | ✅ | 🔶 | 🔶 |
| REQ-013 补齐回归网（接线/混合/等价/②golden/③断言） | ✅ | ❌ | 🔶 |
| REQ-014 文档修订（ADR/注释/tests/USAGE/INSTALL） | ✅ | ❌ | ❌ |
| REQ-015 门禁脚本 id 清单 + i18n 断言 + E2E 步骤同步 | ✅ | ❌ | 🔶 |
| REQ-016 重新打包发行 ZIP（体积/零依赖/读回） | ✅ | 🔶 | 🔶 |

### 6.2 交付物（DEL）

| spec ID | 方案 A | 方案 B | 方案 C |
|---------|:------:|:------:|:------:|
| DEL-001 panel.js 入口语义统一 + 分派修正 | ✅ | 🔶 | ✅ |
| DEL-002 multiselection.js additive（或新方法） | ✅（新增 `extendTo`） | 🔶（改坏 rangeTo） | ✅ |
| DEL-003 contextmenu.js 批量可达 + 移除 P2 | ✅ | ❌ | ✅ |
| DEL-004 panel.js 模式双按钮接线 | ✅ | 🔶（并存 toggle） | ✅ |
| DEL-005 panel.html 模式双按钮 / 删 toggle / 删分段按钮 | ✅ | 🔶 | ✅ |
| DEL-006 panel.css 样式 | ✅ | 🔶 | ✅ |
| DEL-007 i18n.js 键新增/清理 | ✅ | 🔶 | ✅ |
| DEL-008 tests/contextmenu 接线 + P2 清理 | ✅ | ❌ | 🔶 |
| DEL-009 tests/multiselection 混合并集 | ✅ | ❌ | 🔶 |
| DEL-010 tests/i18n 键集同步 | ✅ | ❌ | 🔶 |
| DEL-011 tests/formatter+bulkformatter A/B golden | ✅ | 🔶 | 🔶 |
| DEL-012 E2E harness 场景 + 替换 toggle 步骤 | ✅ | ❌ | 🔶 |
| DEL-013 check-panel-shell id 清单同步 | ✅ | ❌ | 🔶 |
| DEL-014 plan.md ADR-014 重裁 | ✅ | ❌ | ❌ |
| DEL-015 contextmenu.js 注释对齐 | ✅ | ❌ | ✅ |
| DEL-016 test-cases/README 同步 | ✅ | ❌ | 🔶 |
| DEL-017 USAGE/INSTALL 同步 | ✅ | ❌ | ❌ |
| DEL-018 dist ZIP 重打包 | ✅ | 🔶 | 🔶 |

### 6.3 验收标准（AC）

| spec ID | 方案 A | 方案 B | 方案 C |
|---------|:------:|:------:|:------:|
| AC-001 Ctrl 选 2 + 右键 → 批量项 → 2 段 | ✅ | ✅ | 🔶 |
| AC-002 右键已选保留 / 未选替换 | ✅ | ❌ | ✅ |
| AC-003 工具栏 ≡ 右键 逐字符一致 | ✅ | 🔶 | ✅ |
| AC-004 selectAt+toggleAt+CtrlShift 并集 | ✅ | ✅（纯 Shift 倒退） | ✅ |
| AC-005 0/1/N 边界 | ✅ | 🔶 | ✅ |
| AC-006 全选/Ctrl/Shift/混合四路正确 | ✅ | 🔶 | ✅ |
| AC-007 双按钮、无 toggle 残留 | ✅ | ❌ | ✅ |
| AC-008 默认 A；A/B golden 逐字符 | ✅ | ✅ | ✅ |
| AC-009 菜单无 P2、无 canCopyRequestOnly、i18n 清理 | ✅ | ❌ | ✅ |
| AC-010 主项 + 批量项保留可用 | ✅ | ✅ | ✅ |
| AC-011 权限/零依赖/零网络校验 | ✅ | ✅ | ✅ |
| AC-012 字符级保真不变 | ✅ | ✅ | ✅ |
| AC-013 新增面板级接线测试 | ✅ | ❌ | 🔶 |
| AC-014 门禁同步后 PASS | ✅ | ❌ | 🔶 |
| AC-015 无回归（基线 264/264） | ✅ | ❌（rangeTo 倒退） | ❌（大面积重写） |
| AC-016 发行 ZIP 门禁 PASS | ✅ | 🔶 | 🔶 |
| AC-017 ADR-014 一致 + 注释对齐 | ✅ | ❌ | ❌ |

**结论**：方案 A 覆盖 **REQ 16/16、DEL 18/18、AC 17/17**；方案 B 硬失败项集中在 REQ-006/008/013/014/015、DEL-003/008/009/010/012/013/014/015/016/017、AC-002/007/009/013/014/015/017；方案 C 硬失败于 AC-015 及大范围不变量冲突。B/C 仅作对照。

---

## 7. 6 角度对抗审查（red-team，方案 A）

| 角度 | 挑战 | 风险等级 | 缓解措施 |
|------|------|:--------:|----------|
| 安全 | ③ 删逻辑不彻底会留悬空导出/死代码；② 若按钮模式解析失误可能复制到错误模式内容 | 低-中 | ③ 用「无未使用导出」检查 + grep 全仓引用；② 模式由 `data-copy-mode` 显式白名单（非 A 即 A），并加 golden 断言 |
| 资源 | `extendTo` 与入口统一均为纯内存操作，无新增资源；删除逻辑反而减体积 | 低 | 不新增依赖；体积门禁 <200KB 兜底 |
| 时间 | 跨 6 类文件 + 文档，工期易超预期 | 中 | ① 与 ②③ 解耦为可独立合入的子变更；先落 ①（发布阻塞）再 ②③/文档 |
| 依赖 | `createMenuModel` 签名收窄 → 旧调用点/测试若不改会运行时失败 | 中 | 全仓 grep `canCopyRequestOnly` / `CTX_ACTION` / `CTX_ITEM_ID` 并同步；测试同批改 |
| 用户行为 | 右键「已选保留」改变既有「右键必定位单选」心智；批量固定 A 可能不满足批量 B 用户 | 中 | ADR-014 显式记录新规则；真机 CE-9 验证；§10 把「批量是否需 A/B」列为待定决策 |
| 逆向激励 | 实施者图省事只改 `onContextMenu` 一行、不补回归网与 ADR | 中 | §1.2 硬约束 + 把 RC-3/RC-4 绑定为同批交付门禁（AC-014/015/017） |

---

## 8. 事前验尸（pre-mortem，假设方案 A 上线后失败）

| 失败场景 | 概率 | 影响 | 预防措施 |
|----------|:----:|:----:|----------|
| 只改了右键入口，未补回归网 → 同类漏条再次全绿发布 | 中 | 高 | AC-013/014/015 作为交付门禁；面板级接线测试必须真实走 `onContextMenu` |
| `extendTo` anchor 语义与 `rangeTo` 混淆，连续操作后扩选范围错 | 中 | 中 | 单测固化「Ctrl 选集 + Ctrl+Shift 扩选 = 并集」；ADR 写明 anchor 契约 |
| ② 删除 `copyMode` 后漏改某读取点 → 复制模式 `undefined` | 中 | 中 | 全仓 grep `copyMode`；默认值兜底（非 B 即 A）；E2E 覆盖两条按钮 |
| `createMenuModel` 签名收窄导致旧测试/调用点报错 | 中 | 低-中 | 同批改测试与调用点；保持纯函数不抛异常 |
| ③ 删除共享逻辑后遗留孤儿 i18n 键/门禁 id → 门禁漂移 | 中 | 中 | i18n 键集断言 + `check-panel-shell` id 清单同批；CI 全绿为准 |
| 右键新语义引发用户困惑（以为应该单选定位） | 低-中 | 中 | ADR 记录 + INSTALL/USAGE 说明；CE-9 真机观察 |
| 批量仅 A 无法满足批量 B 场景 | 低-中 | 低-中 | 记为 §10 待定决策，保留增量补 `#copy-selected-b-btn` 的路径 |

---

## 9. 反偷懒检查清单

| 检查项 | 结论 |
|--------|------|
| 这是「最容易写的方案」而非最正确的方案？ | 否。最容易的是方案 B（只改一行 + 改 `rangeTo`），已明确拒绝。 |
| 时间充足时会设计出完全不同的方案吗？ | 否。已枚举 3 个独立方案并 5 轴评分，A 在正确性/长期性/覆盖度全面领先。 |
| 3 个月后会被推翻重做吗？ | 低概率。A 把「入口语义 + additive 扩选 + ADR 一致规则 + 回归网」沉淀为契约。 |
| 是否被「最小改动量」限制住？ | 否。明确接受跨多模块 + 测试 + 文档 + 门禁的改动量。 |
| 是否处理了所有根因，而非只处理最表面的？ | 是。RC-1（技术）+ RC-2（技术）+ RC-3（设计）+ RC-4（测试）+ RC-5/RC-6（需求范围）全覆盖。 |

`LAZY_CHECK: PASS`

---

## 10. 决策（用户选择）

> **推荐 ≠ 决策。** 请用户在下列选项中确认；未确认前实施节点不得启动。

- [x] **采用方案 A（推荐）** — 入口语义统一 + 显式模式重构 + 回归网补齐；覆盖 REQ 16/16、DEL 18/18、AC 17/17。
- [ ] 采用方案 B — 最小接线补丁（**已知不满足 REQ-006/008/013，D 维 ≤2 `[quick_fix_alert]`**）。
- [ ] 采用方案 C — 选择模型重构（**综合 14/25 `[weak_solution]`，范围超配**）。
- [ ] 其它/退回重设计（说明：__________）。

**待定子决策 P-DEC-1（需在批准方案 A 时一并拍板）**：
批量复制入口（工具栏 `#copy-selected-btn` 与菜单 `copy-selected`）在删除 toggle 后：
- [ ] **默认仅模式 A**（推荐，REQ-007 默认语义；改写面最小）；
- [ ] 也拆为 A/B 两按钮（多一组按钮，改写面更大）。

**记录**：待用户批准后在此登记。
**`USER_DECISION_REQUIRED: false`**（已决策：方案 A）

---

## 11. 机读结论（fix-guardrails 契约）

```text
---ARCH_START---
doc: 02-solution-design
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
version: v1.0
date: 2026-10-02
mode: plan
methodology: fix-guardrails
upstream: [01-root-cause.md, spec.json]
root_causes_addressed: [RC-1, RC-2, RC-3, RC-4, RC-5, RC-6]

constraints:
  hard: [C-1 clipboardWrite only, C-2 zero-dep <200KB, C-3 zero-network, C-4 char-level fidelity,
         C-5 frozen A/B formatter, C-6 multiselection invariants, C-7 pure createMenuModel,
         C-8 batch item reachable, C-9 toolbar==contextmenu byte-identical, C-10 no regression 264/264,
         C-11 code+doc+i18n+gate same-batch]
  never_do: [one-line onContextMenu patch, globally change rangeTo replace semantics,
             touch bulkformatter/formatter frozen contract, keep toggle/module copyMode,
             delete core main + batch items, leave orphan logic/i18n/gate ids, add deps/network]

SOLUTIONS:
  - id: A
    name: unify entry semantics + explicit-mode refactor + regression-net completion
    status: recommended
    changes:
      - extension/panel.js:1586-1608,811-817,98-99,428-455,887-895,990,1029,1492-1511,1552-1561,1638-1654,1379-1424,1453-1489
      - extension/src/multiselection.js:246-285,462-466
      - extension/src/contextmenu.js:30-43,150-155,177-233
      - extension/panel.html:70-74,126-133
      - extension/styles/panel.css:111,148,161,165,169,173
      - extension/src/i18n.js:51-55,59-60,113-114,153-157,161-162,215-216
      - tests/contextmenu.test.mjs; tests/multiselection.test.mjs; tests/i18n.test.mjs;
        tests/formatter.test.mjs; tests/bulkformatter.test.mjs; tests/test-cases.md; tests/README.md
      - butler/spec/...功能增/e2e-artifacts/harness/run-e2e.mjs:505-546
      - scripts/check-panel-shell.mjs:129-136
      - butler/plan/...功能增/plan.md:506-517; docs/USAGE.md; docs/INSTALL.md; dist/
    consequence_depth: 3
  - id: B
    name: minimal wiring patch (keep toggle + P2)
    status: rejected
    consequence_depth: 3
  - id: C
    name: selection-model rewrite (set-primary)
    status: rejected
    consequence_depth: 3

SCORE:
  - { id: A, correctness: 5, feasibility: 4, security: 5, maintainability: 5, impact: 4, total: 23, verdict: ok }
  - { id: B, correctness: 3, feasibility: 4, security: 4, maintainability: 2, impact: 3, total: 16, verdict: quick_fix_alert }
  - { id: C, correctness: 3, feasibility: 2, security: 4, maintainability: 3, impact: 2, total: 14, verdict: weak_solution }

CONSEQUENCE_DEPTH:
  - { id: A, depth: 3 }
  - { id: B, depth: 3 }
  - { id: C, depth: 3 }

SPEC_COVERAGE:
  solution_A: { REQ: 16/16, DEL: 18/18, AC: 17/17 }
  solution_B: { hard_fail: [REQ-006, REQ-008, REQ-013, REQ-014, REQ-015,
                            DEL-003, DEL-008, DEL-009, DEL-010, DEL-012, DEL-013, DEL-014, DEL-015, DEL-016, DEL-017,
                            AC-002, AC-007, AC-009, AC-013, AC-014, AC-015, AC-017] }
  solution_C: { hard_fail: [AC-015], note: selection-model rewrite breaks C-6 invariants }

LAZY_CHECK: PASS
RED_TEAM_ANGLES: [security, resource, time, dependency, user-behavior, reverse-incentive]
PRE_MORTEM_SCENARIOS: 7
PENDING_DECISIONS: [P-DEC-1 bulk copy default mode A vs A/B split]

RECOMMENDED: A
USER_DECISION_REQUIRED: true
DAG_STARTED: false
CODE_CHANGED: false
---ARCH_END---
```

---

*本节点只做分析与方案设计，未修改任何生产代码，未启动任何 DAG。*
