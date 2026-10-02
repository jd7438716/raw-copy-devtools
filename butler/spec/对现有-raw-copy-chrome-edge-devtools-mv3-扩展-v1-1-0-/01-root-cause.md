# 01 · 根因分析报告：Raw Copy v1.1.0 三项修复/调整（多选漏条 / 复制模式按钮化 / 移除分段复制）

> **文档版本**：v1.0
> **日期**：2026-10-02
> **阶段**：Mode analyze（fix 管线 · 根因分析节点）
> **角色**：butler-fix-analyst
> **方法论**：`skill: fix-rca`（问题 Framing + 多假设 RCA + 反实验验证 + 5-Whys + 已排除假设 + CIA 四维扫描 + 影响×难度矩阵）
> **问题 slug**：`对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> **结论摘要**：多选漏条的**主根因 RC-1（`confidence: high`）= 右键菜单入口在弹菜单前无条件「右键即单选替换」，使 `N≥2` 的批量菜单项永不可达，且经菜单复制的产物只含右键命中的 1 条**；**RC-2（`confidence: high`）= 修饰键分派顺序 + `rangeTo` 替换式闭区间，Ctrl+Shift 混合选择丢弃先前 Ctrl 已选项**；**RC-3（`confidence: high`，设计根因）= ADR-014 两条决策互斥**；**RC-4（`confidence: high`，测试根因）= 单测只测纯模型、E2E 只测「全选 + 工具栏按钮」，菜单折叠行为零断言**。需求原话疑似点名的 `multiselection` 集合传递 / `bulkformatter` 入参**均已被反实验排除**（工具栏路径在 Ctrl/Shift/新请求场景下 2→2 正确、3→3 正确）。
> **机器可读结论**：见文末 `---RCA_START---` / `---RCA_END---` 块。
> **约束声明**：本节点**只做分析与反实验，未修改任何生产代码，未启动任何 DAG**；反实验用最小 DOM shim 在 Node 下**只读加载真实 `extension/panel.js`**（产物：`butler/results/_rca/panel-sim.mjs`，位于 gitignore 的 `results/`）。

---

## 0. 问题 Framing

### 0.1 需求原文（全文携带，禁止摘要）

> 对现有 Raw Copy（Chrome/Edge DevTools MV3 扩展 v1.1.0）做三项修复/调整：
>
> 1【缺陷·必修】多选复制漏条：选中 2 条请求后点击「复制选中(N)」（或批量复制入口），结果剪贴板只包含 1 条，未复制全部选中项。期望：选中的每一条都被复制，N 条就输出 N 段（段间保持现有清晰分隔）。
>    可能相关：多选集合的构建/传递（multiselection.js 选中的 Set/数组）、批量复制入口（panel.js 的 copy-selected 处理）、聚合器（bulkformatter.js 入参）——请做根因分析（不要只补一行），并确保 0 条/1 条/多条（含全选、含 Ctrl 与 Shift 混合选择）都正确。
>
> 2【交互调整】复制模式切换太麻烦：当前用一个按钮点击切换模式 A/B，用户希望「直接在相关按钮上体现两种模式」——即在复制相关按钮区为「模式 A（简单格式化）」与「模式 B（纯原始）」各提供**独立按钮**，点哪个就用哪个模式复制（不再需要先切换再复制）。请保留默认模式（模式 A）语义，并同步更新面板 HTML/CSS/i18n 与相关测试。
>
> 3【移除功能】删除右键菜单中的「仅复制请求」「仅复制响应」两项：DevTools 原生已有该能力，不必重复实现。请一并清理对应菜单项、处理逻辑、i18n 文案与相关测试（保留核心的「复制请求 + 响应（原始）」以及多选批量项）。
>
> 约束保持：MV3、零第三方依赖、最小权限（仍仅 clipboardWrite，不新增 host/网络权限）、零网络传输、响应体字符级保真、大响应/二进制/Base64 规则不变。
>
> 请产出规格—方案—任务—实施—验证，并补齐回归测试。

### 0.2 三段标记

| 编号 | 类型 | 文本 | 标记 |
|:----:|:----:|:-----|:----:|
| ① | 缺陷 | 多选复制漏条（选中 2 条 → 剪贴板 1 条） | `[symptom]` + `[problem]` |
| ①-提示 | 方案偏见 | 「可能相关：multiselection 集合 / copy-selected / bulkformatter 入参」 | `[solution-biased]`（三个候选是按症状猜的定位方向，**非结论**；本报告逐一独立证伪/证实） |
| ② | 交互调整 | 模式切换按钮化（A/B 各一独立按钮） | `[problem]`（体验问题，非缺陷） |
| ③ | 移除功能 | 删除右键「仅复制请求/仅复制响应」 | `[solution-biased]`（原话已给出方案与理由「DevTools 原生已有」；本报告只做影响面裁定，不质疑其意图） |

### 0.3 问题定义（①②③ 分别的“真正要解决什么”）

- **①**：多选复制入口必须对**用户实际使用的每一条入口**（工具栏按钮 **和** 右键批量项）都满足「选中 N 条 → 输出 N 段、零漏条、零混淆」，且 `0/1/N` 与 `全选/Ctrl/Shift/混合` 全部正确。当前存在「某入口只输出 1 条」的**静默错误输出**。
- **②**：取消「先切换再复制」的两步心智负担，用**动作即模式**（点 A 按钮=按 A 复制，点 B 按钮=按 B 复制）替换 toggle；默认仍是 A，且单条/A、B 产物逐字符契约不变。
- **③**：删除与 DevTools 原生重复的「仅请求 / 仅响应」能力，收敛复制入口，降低维护面与测试面；**核心「复制请求+响应」与多选批量项必须保留**。

### 0.4 边界

- **① 只影响“多选/右键批量”这条链路**：单条复制、单条格式、聚合模板（`===== #i/N =====`）本身经反实验证明正确（§5）。
- **② 只影响 UI 控件形态与调用点**：复制文本产物字节契约不变（模式 A/B 由 `formatter.js` 冻结）。
- **③ 只影响“分段复制”能力面**：不影响主复制与批量复制。

---

## 1. 模式选择

| 判据 | 本问题 | 选择 |
|------|--------|------|
| ① 是否规则性/可复现 | **是**（确定性 UI 交互 100% 复现；与响应内容/时序无关） | — |
| ① 是否涉及跨模块接线（面板/菜单/多选状态机） | **是**（`onContextMenu` × `createMenuModel` × `multiselection`） | — |
| ① 是否涉及测试盲区 | **是**（单测 264/264 全绿 + E2E 20/20 全绿仍存在） | — |
| ② / ③ 性质 | 显式需求变更（非缺陷） | 影响面扫描 |

→ **① 采用假设驱动模式（多假设 + 反实验）并补 5-Whys 追溯「为什么没被预防」；②③ 采用 CIA 影响扫描（call-site 清点）**。

---

## 2. 事实基线（确定性扫描，全部 `file:line`）

> 以下均为读盘 / grep / 反实验得到的事实，不含推测。行号以工作树 `extension/` 为准（= 发行版 `dist/raw-copy-1.1.0.zip` 语义等价，zip 仅做整行注释剥离，见 `scripts/package.mjs:125-143`）。

### 2.1 多选/批量链路

| # | 事实 | 位置 |
|---|------|------|
| F1 | 多选状态机把选中集合存于 `Set<id>`（`selected`），按可见列表顺序导出 `selectedIds()`；`count() = selected.size` | `extension/src/multiselection.js:95,130-145,373-375` |
| F2 | `rangeTo(i)` 无条件 `selected.clear()`，再用 `[anchor..i]` 可见闭区间**替换**集合 | `extension/src/multiselection.js:256-285`（关键行 `:275`） |
| F3 | 行点击按修饰键分派：**先判 `shiftKey` → `rangeTo`**；再判 `ctrlKey/metaKey` → `toggleAt`；否则 `selectAt` | `extension/panel.js:811-817` |
| F4 | 右键委托 `onContextMenu`：命中行后**无条件** `multi.selectAt(index)`（“右键即单选替换”）**然后**才 `openMenuAt(event)` | `extension/panel.js:1586-1608`（关键行 `:1603-1607`） |
| F5 | `openMenuAt` 用 `count: multi.count()` 构建菜单模型 | `extension/panel.js:1552-1561` |
| F6 | `createMenuModel` 仅当 `count >= 2` 才追加「复制选中(N)」项 | `extension/src/contextmenu.js:199-210` |
| F7 | 工具栏「复制选中(N)」按钮点击 → `copySelection(copyMode)` | `extension/panel.js:887-895` |
| F8 | `runCopySelection` 取 `multi.selectedIds()` → `store.get` 逐条 → `buildBulkCopyText(records, mode, resolveBody)` | `extension/panel.js:1107-1189`（取 ids `:1109`，拼接 `:1169`） |
| F9 | `buildBulkCopyText`：N≥2 逐段加 `===== #i/N =====`、`join('\n\n')`；N=1 委托单选逐字符一致；N=0 → `''` | `extension/src/bulkformatter.js:100-115`；模板 `:35-89` |
| F10 | `multi.selectedIds()` 与 `multi.count()` 同源（集合），且 `setIds` 会按新可见列表剪枝集合 | `extension/src/multiselection.js:386-420` |
| F11 | 菜单项动作分派：`copySelected` → `copySelection(copyMode)`；`copyRequestResponse` → `runCurrentCopy()`（**单条**） | `extension/panel.js:1492-1511` |
| F12 | `runCurrentCopy` 只读 `getSelected()`（单选主光标记录），不感知多选集合 | `extension/panel.js:990-1050`（`:991`） |

### 2.2 ② 模式切换链路

| # | 事实 | 位置 |
|---|------|------|
| F13 | 顶部工具栏只有一个 `#mode-toggle`（内含 label + `[data-mode-value]`），点击在 A/B 间翻转 | `extension/panel.html:70-74`；`extension/panel.js:93,949-953` |
| F14 | `copyMode` 为模块级状态（默认 A），`setCopyMode` 读/写 `els.modeToggle` 的 `data-mode/aria-pressed/title/value` | `extension/panel.js:98-99,428-455` |
| F15 | 单条复制 `buildCurrentCopy(copyMode)` 消费当前模式；批量 `copySelection(copyMode)` 同 | `extension/panel.js:1029,1502` |
| F16 | 模式文案键 `mode.label/a/b/aHint/bHint` 在 zh/en 双份 | `extension/src/i18n.js:51-55,153-157` |
| F17 | 模式切换样式类 `.mode-toggle*` | `extension/styles/panel.css:111,148,161,165,169,173` |
| F18 | 门禁脚本硬编码 `#mode-toggle` 为面板外壳契约 id | `scripts/check-panel-shell.mjs:131-134` |
| F19 | E2E harness 通过点击 `#mode-toggle` 切换模式并断言产物 | `butler/spec/…功能增/e2e-artifacts/harness/run-e2e.mjs:505-520` |

### 2.3 ③ 分段复制链路（待移除能力）

| # | 事实 | 位置 |
|---|------|------|
| F20 | 底部按钮 `#copy-req-btn` / `#copy-resp-btn` + `#copy-curl-btn` | `extension/panel.html:128-130` |
| F21 | `els.copyReqBtn/copyRespBtn` + `setCopyButtonsEnabled` 纳入二者 | `extension/panel.js:77-78,591-598` |
| F22 | 分段逻辑：`extractSectionText`（按首个固定标记行裁剪）+ `buildSectionCopy`（模式 B → null） | `extension/panel.js:1379-1424` |
| F23 | `runSectionCopy(which)` 复用单条管线；`#copy-req-btn`/`#copy-resp-btn` 与菜单 P2 项**共用** | `extension/panel.js:1453-1489,1638-1654` |
| F24 | 菜单 P2 项：`CTX_ACTION/CTX_ITEM_ID` 常量 + `createMenuModel` 无条件追加两项，`enabled = hasSelection && canCopyRequestOnly` | `extension/src/contextmenu.js:30-43,184-185,212-230` |
| F25 | `openMenuAt` 传 `canCopyRequestOnly: copyMode === MODE_A` | `extension/panel.js:1560` |
| F26 | i18n 键：`copy.buttonRequest/buttonResponse`、`contextmenu.copyRequestOnly/copyResponseOnly`（zh+en） | `extension/src/i18n.js:59-60,113-114,161-162,215-216` |
| F27 | 测试/门禁引用 P2：`contextmenu.test.mjs`（多例）、`i18n.test.mjs:85-86`、`check-panel-shell.mjs:133`、`test-cases.md:91` | 见对应文件 |

### 2.4 设计与测试盲区事实

| # | 事实 | 位置 |
|---|------|------|
| F28 | ADR-014 同时写了两条**互斥**决策：`:513`「右键即把该行设为单选选中（**替换集合**）」与 `:515`「右键菜单在 **N≥2** 时追加『复制选中(N)』」 | `butler/plan/…功能增/plan.md:506-517`（`:510-515`） |
| F29 | 单测只测 `createMenuModel` 纯函数（直接喂 `count:2` 断言有批量项），**从不经过 `onContextMenu` 的折叠** | `tests/contextmenu.test.mjs:291-311,313-331` |
| F30 | E2E 多选只测「点 `#select-all-btn`（全选 3 条）→ 点 `#copy-selected-btn` → 断言 3 段」，**未测 Ctrl/Shift 子集、未测右键批量入口** | `butler/spec/…功能增/e2e-artifacts/harness/run-e2e.mjs:523-546` |
| F31 | 基线全量绿：单测 264/264、E2E 双端 20/20、4 静态门禁 PASS | 反实验 CE-0；`e2e-report.md` |
| F32 | 既有多选单测覆盖 `rangeTo` 正向/反向/空槽，但全部是「全新实例或 move 后」的**单次替换**语义，**无「Ctrl 选集后 Shift 扩选」用例** | `tests/multiselection.test.mjs:152-205` |

---

## 3. 多假设 RCA

> 证据强度：`confirmed`（≥2 独立来源）｜`likely`（1 来源）｜`inconclusive`。
> 判定：PROVED / DISPROVED / INCONCLUSIVE。

### H1（主假设 · 右键批量入口）—— `onContextMenu` 在弹菜单前无条件「右键即单选替换」，使 `N≥2` 的批量菜单项永不可达，且菜单发起的复制只含 1 条

- **证据类型**：代码 + 反实验（真实加载 panel.js）。
- **代码链**：F4（`:1605` selectAt）→ F5（`count = multi.count()`）→ F6（`count>=2` 才追加）→ F11（主项走 `runCurrentCopy`，F12 只读单选）。即：右键瞬间集合被替换为 `{命中行}`，`count === 1`，批量项被跳过；菜单只剩主项，点它复制 1 条。
- **反实验**：**CE-4**——先 Ctrl 选 2 条（`selectedIds=[3,1]`），再对已选行右键：`after=[3]`（集合坍缩为 1），菜单项 `[copy-request-response, copy-request-only, copy-response-only]`（**无 `copy-selected`**），点击主项 → 剪贴板 URL 数 = **1**。这精确复现需求原话「选中 2 条 → 剪贴板只包含 1 条」。
- **独立来源 2**：**CE-6**——`before=2` 时 `hasBatchItem=false`（`createMenuModel` 的 `count>=2` 在折叠后永不成立）。
- **判定**：**PROVED**，**`confidence: high`**。
- **说明**：这是唯一能产出「2 选中 → 1 复制」的入口；工具栏按钮路径经 CE-1/CE-5 证明正确（见 §5），故用户所述「（或批量复制入口）」实际落在此处。

### H2（次假设 · 混合修饰键）—— 修饰键分派先判 Shift + `rangeTo` 替换集合，Ctrl+Shift 混合选择丢弃先前的 Ctrl 选择

- **证据类型**：代码 + 反实验。
- **代码链**：F3（`:811` shift 优先于 `:813` ctrl）→ F2（`rangeTo` `:275` `selected.clear()` 后闭区间**替换**）→ 先前 `toggleAt` 加入的集合成员被清掉。
- **反实验**：**CE-3**——`selectAt`(id3) + `toggleAt`(id1) ⇒ `[3,1]`；再 `ctrl+shift` 点中间行 ⇒ `selectedIds=[2,1]`（**id3 被丢弃**，预期应保留并扩选）。→ 混合选择漏条成立。
- **判定**：**PROVED**，**`confidence: high`**（作为「混合选择可行性」的独立缺陷）。
- **说明**：它不是「2→1」的直接来源，但**直接落在需求 ① 明确点名的验收面「含 Ctrl 与 Shift 混合选择」**，必须同批修复。

### H3（设计根因）—— ADR-014 两条决策互斥，设计未定义「右键发生在多选集合内」的保留语义

- **证据类型**：设计文档（确定性引用）+ 代码实现对照。
- **证据**：F28（`:513` 替换 vs `:515` N≥2 追加）；实现忠实落实了 `:513`（F4），于是 `:515` 成为**不可达的死规则**；`contextmenu.js:162-164` 的注释仍宣称「count≥2 追加」，与运行时事实矛盾。
- **判定**：**PROVED**，**`confidence: high`**。
- **说明**：这是「为什么 H1 没被预防」的**决策层根因**——不是漏写一行，而是两条验收规则在逻辑上不可能同时成立，评审未做互斥检查。

### H4（测试根因）—— 测试与 E2E 均绕过了「多选下的右键路径」，折叠行为零断言

- **证据类型**：测试代码 + E2E harness。
- **证据**：F29（单测直接喂 `count:2` 给纯模型，绕开接线）、F30（E2E 只测全选+工具栏按钮）、F32（`rangeTo` 无 Ctrl+Shift 用例）。
- **判定**：**PROVED**，**`confidence: high`**。
- **说明**：这是缺陷能「单测 264/264 + E2E 20/20 全绿」通过的机制。

### H5（需求提示候选 A）—— `multiselection.js` 的选中 `Set`/数组在构建/传递中丢条

- **证据类型**：代码 + 反实验。
- **代码证据**：F1/F10——`count()` 与 `selectedIds()` 同源；`setIds` 只剪「不在新可见列表」的项；`onEvict` 同步移除；无「集合与列表脱节」路径。
- **反实验**：**CE-1/CE-5/CE-7**——Ctrl 选 2 → `[3,1]`/2 段；新请求到达后仍 `[3,1]`/2 段；`count()` 与 `selectedIds().length` 始终一致。
- **判定**：**DISPROVED**（作为「集合传递丢条」）。**唯一与 `multiselection` 相关的真实缺陷是 H2 的 `rangeTo` 替换语义 + 分派顺序，而非 Set/数组传递。**

### H6（需求提示候选 B）—— 聚合器 `bulkformatter.js` 入参/拼接丢段

- **证据类型**：代码 + 单测 + 反实验。
- **代码证据**：F8/F9——`records` 由 `selectedIds()` 逐条 `store.get` 得到；`N≥2` 生成 N 个标记。既有 26 例 `bulkformatter.test.mjs` 逐字符断言 N 段、无跨条混淆。
- **反实验**：**CE-1/CE-2/CE-5**——工具栏复制实测 `markers=2 urls=2`（N=2）、`markers=3`（全选）。
- **判定**：**DISPROVED**。

### H7（需求提示候选 C）—— 工具栏 `#copy-selected-btn` 的 copy-selected 处理丢条

- **证据类型**：代码 + 反实验。
- **代码证据**：F7/F8——按钮 → `copySelection` → `runCopySelection` 取全集。
- **反实验**：**CE-1（Ctrl 2 条→2 段）、CE-2（Shift 2 条→2 段、Shift-only→2 段）、CE-5（新请求后→2 段）**全部正确；且既有 E2E F30 全选→3 段通过。
- **判定**：**DISPROVED**。

### H8（边界假设）—— `0 条` 或 `1 条` 处理错误导致误判

- **证据类型**：代码 + 反实验。
- **代码证据**：F8（N=0 → 提示并返回 `{ok:false,count:0,reason:'empty'}`）、F9（N=1 → 委托单选、无标记）。
- **反实验**：**CE-7**（0 条 → `{ok:false,count:0,reason:"empty"}`）、**CE-8**（N=1 → 无 `#` 标记、逐字符=单选）。均正确。
- **判定**：**DISPROVED**。

### H9（时序/剪枝假设）—— 选中后列表刷新（rAF `refreshView` / `setIds` 剪枝）把某一项剪掉

- **证据类型**：代码 + 反实验。
- **代码证据**：F10——`setIds` 只移除「不在新可见列表」的项；新请求只会使列表增长，不会移除已选 id（除淘汰）。
- **反实验**：**CE-5**——Ctrl 选 2 后再灌入新请求（触发 `refreshView`）→ `[3,1]`/2 段，无剪枝。
- **判定**：**DISPROVED**（正常增长场景）。唯一真实剪枝场景是「记录被环形缓冲/字节预算淘汰」，此时计数同步下降且属预期，非本缺陷。

---

## 4. 5-Whys 线性追溯（针对 H1 / RC-1）

```
Why #1（直接现象）：为什么选中 2 条后复制，剪贴板只有 1 条？
  → 因为用户经右键菜单入口复制时，菜单里根本没有「复制选中(N)」项，
    只能点「复制请求 + 响应（原始）」，而该动作只读单选主光标（1 条）。
    （panel.js:1499-1501 → runCurrentCopy → getSelected，panel.js:991）

Why #2（菜单为何没有批量项）：为什么 count≥2 的批量项没出现？
  → 因为 onContextMenu 在 openMenuAt 之前先执行了 multi.selectAt(index)，
    集合被替换为「仅右键命中行」，count 恒为 1；
    createMenuModel 的 `if (count >= 2)` 永不成立。
    （panel.js:1603-1607；contextmenu.js:199-210）

Why #3（为何先折叠）：为什么要「右键即单选替换」？
  → 因为 ADR-014 明确规定「右键即把该行设为单选选中（替换集合）」（plan.md:513），
    实现忠实照做；但同一条 ADR 又要求「右键菜单在 N≥2 时追加批量项」（plan.md:515），
    两条规则在逻辑上互斥、无法同时满足。

Why #4（评审为何未拦）：为什么互斥的两条决策会同时被接受？
  → 因为评审/设计只做逐条可用性核对，未做「同一入口下两条规则的联合可满足性」检查；
    且 contextmenu.js:162-164 的注释与模型测试（只喂 count:2 给纯函数）进一步坐实了
    「批量项存在」的错觉（tests/contextmenu.test.mjs:291-311）。

Why #5（最深根因）：为什么缺陷能全绿发布？
  → 因为验证网只覆盖了「纯模型 + 全选 + 工具栏按钮」：
    单测绕开 onContextMenu 接线（F29），E2E 只用 selectAll（F30），
    rangeTo 无 Ctrl+Shift 用例（F32）——多选下的右键入口与混合修饰键，
    在规格/设计/单测/E2E 四层里都没有一条端到端断言。
```

**最深根因定性**：这是**「入口语义未统一 + 验证网按入口割裂」**导致的系统性根因，不是单点 bug。只改 `onContextMenu` 一行、而不统一「工具栏 / 右键」两个入口的多选语义、不补混合修饰键与右键端到端用例，同类漏条仍会复发。

---

## 5. 反实验验证

> 本节点不修改生产代码，反实验采用**只读真实加载 + 确定性负对照**：用最小 DOM shim 在 Node 下 import 真实 `extension/panel.js`（含 `store/capture/render/multiselection/contextmenu/bulkformatter/formatter/clipboard` 全部发行代码），以真实 DOM 事件驱动。
> 复现命令：`node butler/results/_rca/panel-sim.mjs`
> 说明：shim 仅替身浏览器 DOM/`navigator.clipboard`/`chrome.devtools.network.onRequestFinished`（与既有 E2E harness 的两处替身一致）；所有被测逻辑为发行代码。

### CE-0（基线）—— 现有验证网全绿，缺陷在测试之下

- 命令：`node --test "tests/**/*.test.mjs"`
- 结果：`tests 264 / pass 264 / fail 0`。
- 意义：缺陷不是「测试挂了未修」，而是**测试没覆盖真实入口组合**。

### CE-1（已执行，只读）—— 工具栏路径 · Ctrl+click 选 2 条

```
[S1-ctrl2] selectedIds=[3,1] markers=2 urls=2
```
→ 工具栏「复制选中(N)」**无漏条**。H7/H6 DISPROVED。

### CE-2（已执行，只读）—— Shift 范围 / Shift-only

```
[S2-shift2]     selectedIds=[2,1] markers=2 urls=2
[S6-shift-only] selectedIds=[3,2] markers=2 urls=2
```
→ 纯 Shift 范围选择**无漏条**。

### CE-3（已执行，只读）—— Ctrl 与 Shift 混合（核心证据）

```
[S3-ctrl+shift] selectedIds=[2,1] markers=2 urls=2
（操作序列：selectAt(id3) → Ctrl+toggleAt(id1) ⇒ [3,1] → Ctrl+Shift 点中间行）
```
→ 先选的 **id3 被 `rangeTo` 的 `selected.clear()` 丢弃**，结果只剩 `[2,1]`。**H2 PROVED：混合选择漏条。**

### CE-4（已执行，只读）—— 多选态下右键菜单入口（主根因核心证据）

```
[S4-ctx-menu] before=[3,1] after=[3]
              items=[copy-request-response, copy-request-only, copy-response-only]
              copiedUrls=1 (expected 1 if collapse)
```
→ 右键令集合 `[3,1] → [3]`；菜单**无 `copy-selected`**；经菜单复制得 **1 条**。**精确复现「选中 2 条 → 剪贴板只包含 1 条」。H1 PROVED。**

### CE-5（已执行，只读）—— 选中后新请求到达（排除剪枝时序）

```
[S5-newreq] selectedIds=[3,1] markers=2 urls=2
```
→ H9 DISPROVED。

### CE-6（已执行，只读）—— 菜单模型在「多选态右键」下是否含批量项

```
[S7-menu-batch] before=2 hasBatchItem=false
                itemIds=[copy-request-response, copy-request-only, copy-response-only]
```
→ 「N≥2 追加批量项」在真实接线里**永不成立**（死规则）。H1/H3 互相印证。

### CE-7（已执行，只读）—— 0 条

```
[S8-zero] selectedIds=[] result={"ok":false,"count":0,"reason":"empty"}
```
→ 0 条语义正确。H8 DISPROVED。

### CE-8（已执行，只读）—— 单条 / 批量单体（N=1）

代码路径：`buildBulkCopyText` total=1 → 返回 `blocks[0]`（无 `===== #i/N =====`，逐字符≈单选 `buildCopyText`）；既有 `tests/bulkformatter.test.mjs:262-275` 已逐字符断言。→ H8 DISPROVED。

### CE-9（修复后补做，`[irreversible: false]`，本节点不做）

修复落地后在真实 Chrome/Edge 复验：
1. Ctrl 选 2 + 右键 → 菜单应出现「复制选中(2)」且点击产出 2 段；
2. Ctrl 选集 + Shift 扩选 → 集合为并集而非替换；
3. 工具栏与右键两条入口对同一集合产物**逐字符一致**。
属 fix 节点验收动作，本报告登记为待办。

> `[skip_counter_experiment]` 不适用：本问题为发布阻塞级，已执行可行的只读反实验。

---

## 6. 已排除假设清单（避免重复排查）

| 假设 | 排除理由 | 排除依据（file:line / CE） |
|------|----------|----------------------------|
| H5 `multiselection` 的 Set/数组在传递中丢条 | `count()` 与 `selectedIds()` 同源；剪枝只针对不可见项；无脱节路径 | `multiselection.js:95,130-145,373-375,386-420`；CE-1/CE-5/CE-7 |
| H6 `bulkformatter` 入参/拼接丢段 | N≥2 逐段加标记、N=1 委托单选；26 例逐字符断言 + 实测 2/3 段 | `bulkformatter.js:100-115`；`tests/bulkformatter.test.mjs`；CE-1/CE-2 |
| H7 工具栏 copy-selected 处理丢条 | `copySelection` 取全集逐条 `store.get` 后拼接；实测 2→2、3→3 | `panel.js:1107-1189`；CE-1/CE-2/CE-5；`e2e-report.md` §3#12 |
| H8 `0/1` 条处理错误 | 0 条提示 + `{ok:false,count:0,reason:'empty'}`；1 条无标记委托单选 | `panel.js:1109-1112`；`bulkformatter.js:110-112`；CE-7/CE-8 |
| H9 列表刷新 rAF 剪掉已选项 | `setIds` 只移除「不在新可见列表」项；新请求只增不删 | `multiselection.js:386-420`；CE-5 |
| H10 记录被淘汰导致漏条（补充） | 淘汰会经 `onEvict` 同步移出集合并更新计数，属预期语义，非本缺陷 | `panel.js:924-941`；`multiselection.js:428-450`；`store.js:490-511` |
| H11 formatter 模式/保真缺陷（补充） | 单条/批量段内文本经反实验逐字符同源；与漏条无关 | `formatter.js`；CE-1/CE-2；`tests/formatter.test.mjs` |

---

## 7. 影响 × 难度矩阵

| 根因 | 影响级别 | 难度级别 | 优先级 | 判定依据 |
|------|:--------:|:--------:|:------:|----------|
| **RC-1** 右键入口折叠多选 → 批量项死代码 + 菜单复制只 1 条 | **P0**（对右键这一“主要、易达入口”而言多选复制**完全失效**，且为静默错误输出，违反 AC-006 的 N 段契约） | **D2**（需统一两入口语义：折叠/保留的判定、菜单模型、面板接线、与 ADR-014 重裁） | **HIGH** | 影响最大，发布阻塞 |
| **RC-2** Ctrl+Shift 混合选择丢弃已选项（分派顺序 + `rangeTo` 替换） | **P1**（混合选择漏条，落在需求 ① 明示验收面） | **D2**（`rangeTo` 语义从“替换”改为“并集”或引入 additive 模式 + 分派顺序） | **MEDIUM** | 必修，但场景窄于 RC-1 |
| **RC-3** ADR-014 两条决策互斥，未定义右键在多选内的保留语义 | **P0**（是 RC-1 的许可来源；不改则复发） | **D1**（修正设计/ADR 措辞 + 联合可满足性检查） | **HIGH** | 不修则复发 |
| **RC-4** 测试/E2E 按入口割裂，右键与混合修饰键零断言 | **P1**（回归网失效，同类缺陷可再次全绿通过） | **D1**（补面板级/接线级用例 + E2E 场景） | **HIGH** | 回归防护必需 |
| **RC-5**（关联）`③` 移除分段复制能力面 | **P2**（开发者体验/维护面，功能可由 DevTools 原生承担） | **D2**（跨 `contextmenu/panel/html/i18n/tests/门禁`，需同步清理） | **MEDIUM** | 与本批同做 |
| **RC-6**（关联）`②` 模式按钮化 | **P2**（体验调整，非缺陷） | **D2**（DOM/CSS/i18n/接线/测试同步重构） | **MEDIUM** | 与本批同做 |

**综合优先级**：RC-1 / RC-3 / RC-4 为**必修（HIGH）**，RC-2 为**同批必修（MEDIUM，需求明示）**；RC-5/RC-6 为本次交付范围。

---

## 8. CIA 四维影响扫描（供 Mode plan / 任务分解消费）

### 8.1 变更级别判定

- **RC-1 修复**：同时触及 `panel.js`（接线）、`src/contextmenu.js`（菜单模型/常量）、`src/multiselection.js`（判定/语义）→ **L3-跨模块** → 扫 **A + B + D**（C 无配置/权限改动，`[cia_no_config]`）。
- **RC-2 修复**：`src/multiselection.js`（`rangeTo` 语义）+ `panel.js`（修饰键分派）→ **L3**。
- **②/③ 变更**：均为 UI 控件 + 文案 + 接线 + 测试的**跨模块**改动 → **L3**。

### 8.2 A 维 · 调用影响（谁调用）

| 符号 | 调用点 | 确信度 |
|------|--------|:------:|
| `multi.selectAt` | `panel.js:816`（行点击）、`:1605`（右键） | confirmed |
| `multi.rangeTo` | `panel.js:812`（Shift 点击） | confirmed |
| `multi.toggleAt` | `panel.js:814`（Ctrl/Cmd 点击） | confirmed |
| `multi.count` / `selectedIds` | `panel.js:860,1109,1559` | confirmed |
| `createMenuModel` | `panel.js:1557`；`tests/contextmenu.test.mjs` 多例 | confirmed |
| `copySelection` | `panel.js:890`（工具栏）、`:1502`（菜单） | confirmed |
| `buildBulkCopyText` | `panel.js:1169`；`tests/bulkformatter.test.mjs` | confirmed |
| `runSectionCopy` / `buildSectionCopy` / `extractSectionText` | `panel.js:1504-1506`（菜单）、`:1641,1649`（按钮） | confirmed |
| `getCopyMode` / `setCopyMode` | `panel.js:641,951,560`；`tests/i18n.test.mjs` 无关；无单测直接调用（导出契约） | confirmed |

### 8.3 B 维 · 数据结构影响

| 数据 | 消费点 | 修复含义 |
|------|--------|----------|
| 多选集合 `selected:Set<id>` + `anchorId` | `panel.js` 渲染/计数/复制；`renderRow` 高亮 | RC-2 改 `rangeTo` 语义时不得破坏 `selectAt/toggleAt/move/setIds/onEvict` 既有不变量 |
| 菜单项模型 `{id,i18nKey,enabled,action,p2,vars}` | `panel.js:1530-1549` 渲染；`dispatchContextAction` 分派 | ③ 移除两项后须同步 `CTX_ACTION/CTX_ITEM_ID` 与单测形状断言 |
| `copyMode`（模块级） | `panel.js:150,1029,1502,1560` | ② 改为「由按钮携带的模式实参」，默认 A；保留 `getCopyMode/setCopyMode` 导出或被新契约替代 |
| DOM id 契约 | `check-panel-shell.mjs:131-134`；E2E harness | ②③ 涉及 `#mode-toggle`、`#copy-req-btn`、`#copy-resp-btn` 增删，门禁清单须同步 |

### 8.4 C 维 · 配置/部署影响

- 无新增配置键、环境变量、权限。`manifest.json` 仍 `permissions:["clipboardWrite"]`、无 `host_permissions`、无网络。→ `[cia_no_config]`。
- 发行体积门禁（<200KB）与零第三方依赖不受影响（仅删减/重构原生代码）。

### 8.5 D 维 · API/接口影响

| 接口 | 变化 | 确信度 |
|------|------|:------:|
| `contextmenu.createMenuModel(ctx)` 的 `canCopyRequestOnly` 入参 | ③ 移除 → 参数与 P2 项一并删除 | confirmed |
| `CTX_ACTION.COPY_REQUEST_ONLY/COPY_RESPONSE_ONLY`、`CTX_ITEM_ID.*` | ③ 移除 | confirmed |
| `panel.els.modeToggle/copyReqBtn/copyRespBtn` | ②③ 增删/改名（需评估导出契约影响） | confirmed |
| `panel.getCopyMode()/setCopyMode()` 导出 | ② 语义调整（建议保留导出以兼容测试，或明确废弃） | confirmed |
| `panel.openContextMenu()` 追加式导出 | RC-1 修复后行为变化（右键不再坍缩多选）——**契约级**，需回归 | confirmed |

---

## 9. 结论与根因（机读）

```text
---RCA_START---
problem_slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
date: 2026-10-02
methodology: fix-rca
mode: hypothesis-driven
target_version: 1.1.0

items:
  - id: ITEM-1
    kind: defect
    title: 多选复制漏条（选中 2 条 -> 剪贴板 1 条）
    severity: release-blocking
  - id: ITEM-2
    kind: interaction-change
    title: 复制模式 A/B 由 toggle 改为两个独立按钮
  - id: ITEM-3
    kind: feature-removal
    title: 移除右键「仅复制请求」「仅复制响应」

root_causes:
  - id: RC-1
    title: 右键入口在弹菜单前无条件「右键即单选替换」，使 N>=2 批量菜单项永不可达，菜单复制只含 1 条
    category: technical/entry-semantics
    confidence: high
    evidence:
      - extension/panel.js:1586-1608 (onContextMenu; selectAt at :1605 before openMenuAt at :1607)
      - extension/panel.js:1552-1561 (openMenuAt uses count=multi.count())
      - extension/src/contextmenu.js:199-210 (COPY_SELECTED appended only when count>=2)
      - extension/panel.js:1492-1511 (menu copySelected -> copySelection; copyRequestResponse -> runCurrentCopy single)
      - CE-4: before=[3,1] after=[3] items=[copy-request-response,copy-request-only,copy-response-only] copiedUrls=1
      - CE-6: before=2 hasBatchItem=false
    chain: right-click -> multi.selectAt(index) -> set size 1 -> count(1) < 2
           -> batch menu item skipped -> user clicks main item -> runCurrentCopy -> 1 record

  - id: RC-2
    title: 修饰键分派先判 Shift + rangeTo 替换式闭区间，Ctrl+Shift 混合选择丢弃先前 Ctrl 已选项
    category: technical/selection-semantics
    confidence: high
    evidence:
      - extension/panel.js:811-817 (shiftKey branch precedes ctrlKey; rangeTo vs toggleAt)
      - extension/src/multiselection.js:256-285 (rangeTo; selected.clear() at :275)
      - tests/multiselection.test.mjs:152-205 (no Ctrl-then-Shift case)
      - CE-3: [3,1] then ctrl+shift -> [2,1] (id3 dropped)

  - id: RC-3
    title: ADR-014 两条决策互斥（右键=单选替换 vs 菜单 N>=2 追加批量项），设计未定义右键在多选中的保留语义
    category: design/process
    confidence: high
    evidence:
      - butler/plan/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/plan.md:513 (右键即单选替换)
      - butler/plan/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/plan.md:515 (右键菜单 N>=2 追加批量项)
      - extension/src/contextmenu.js:162-164 (comment claims count>=2 append; runtime unreachable)

  - id: RC-4
    title: 验证网按入口割裂：单测只测菜单纯模型、E2E 只测全选+工具栏，右键与混合修饰键零断言
    category: test/process
    confidence: high
    evidence:
      - tests/contextmenu.test.mjs:291-311,313-331 (model fed count=2 directly; bypasses onContextMenu)
      - butler/spec/...功能增/e2e-artifacts/harness/run-e2e.mjs:523-546 (selectAll + #copy-selected-btn only)
      - tests/multiselection.test.mjs:152-205 (no mixed Ctrl+Shift)
      - baseline: unit 264/264 pass, e2e 20/20 pass, defect still present

excluded_hypotheses:
  - id: H5
    claim: multiselection 的 Set/数组在传递中丢条
    reason: count() 与 selectedIds() 同源；剪枝仅针对不可见项；无脱节路径
    evidence: multiselection.js:95,130-145,373-375,386-420; CE-1/CE-5/CE-7
  - id: H6
    claim: bulkformatter 入参/拼接丢段
    reason: N>=2 生成 N 段标记、N=1 委托单选；26 例逐字符断言 + 实测 2/3 段
    evidence: bulkformatter.js:100-115; tests/bulkformatter.test.mjs; CE-1/CE-2
  - id: H7
    claim: 工具栏 copy-selected 处理丢条
    reason: 取全集逐条 store.get 后拼接；实测 2->2、3->3
    evidence: panel.js:1107-1189; CE-1/CE-2/CE-5; e2e-report.md §3#12
  - id: H8
    claim: 0/1 条边界处理错误
    reason: 0 条提示并返回 empty；1 条无标记委托单选
    evidence: panel.js:1109-1112; bulkformatter.js:110-112; CE-7/CE-8
  - id: H9
    claim: 列表刷新 rAF 剪掉已选项
    reason: setIds 只移除不在新列表项；新请求只增不删
    evidence: multiselection.js:386-420; CE-5
  - id: H10
    claim: store 淘汰导致漏条
    reason: 淘汰经 onEvict 同步移出并更新计数，属预期
    evidence: panel.js:924-941; multiselection.js:428-450; store.js:490-511
  - id: H11
    claim: formatter 模式/保真缺陷
    reason: 段内文本与单选逐字符同源；与漏条无关
    evidence: formatter.js; tests/formatter.test.mjs; CE-1/CE-2

impact_difficulty:
  - { id: RC-1, impact: P0, difficulty: D2, priority: HIGH }
  - { id: RC-2, impact: P1, difficulty: D2, priority: MEDIUM }
  - { id: RC-3, impact: P0, difficulty: D1, priority: HIGH }
  - { id: RC-4, impact: P1, difficulty: D1, priority: HIGH }
  - { id: RC-5, impact: P2, difficulty: D2, priority: MEDIUM, scope: ITEM-3 }
  - { id: RC-6, impact: P2, difficulty: D2, priority: MEDIUM, scope: ITEM-2 }

cia:
  level: L3-cross-module
  dimensions: [A, B, D]
  A_callers: [panel.js:816,812,814,1605,1109,1557,890,1502,1169,1504-1506; tests/*]
  B_data: [multi.selected:Set, multi.anchorId, menu-item model shape, copyMode, DOM id contract]
  C_config: none
  D_api: [createMenuModel.canCopyRequestOnly(removed), CTX_ACTION.*(removed), CTX_ITEM_ID.*(removed), panel.els.modeToggle/copyReqBtn/copyRespBtn, panel.getCopyMode/setCopyMode, panel.openContextMenu behavior]

counter_experiments:
  - { id: CE-0, status: executed, result: baseline unit 264/264 pass, defect present }
  - { id: CE-1, status: executed, result: "toolbar Ctrl+click 2 => selectedIds=[3,1] markers=2 urls=2", verdict: H7/H6 DISPROVED }
  - { id: CE-2, status: executed, result: "Shift range 2 => markers=2; shift-only => markers=2", verdict: clean }
  - { id: CE-3, status: executed, result: "Ctrl set [3,1]; Ctrl+Shift => [2,1] (id3 dropped)", verdict: RC-2 PROVED }
  - { id: CE-4, status: executed, result: "multi [3,1]; right-click => after=[3]; no copy-selected item; menu copy urls=1", verdict: RC-1 PROVED }
  - { id: CE-5, status: executed, result: "new request after selection => [3,1] markers=2", verdict: H9 DISPROVED }
  - { id: CE-6, status: executed, result: "before=2 hasBatchItem=false", verdict: RC-1/RC-3 PROVED }
  - { id: CE-7, status: executed, result: "0 selected => {ok:false,count:0,reason:empty}", verdict: H8 DISPROVED }
  - { id: CE-8, status: executed, result: "N=1 => no batch marker, delegates single", verdict: H8 DISPROVED }
  - { id: CE-9, status: deferred_to_fix_node, result: real-browser verification of menu batch entry + mixed selection after fix }

harness:
  file: butler/results/_rca/panel-sim.mjs
  method: minimal DOM shim + real extension/panel.js (read-only)
  reproduce: node butler/results/_rca/panel-sim.mjs
---RCA_END---
```

---

## 10. 移交说明（供 Mode plan / solution / tasks / fix 节点消费）

### 10.1 必达修复目标（ITEM-1）

1. **入口统一**：工具栏「复制选中(N)」**与**右键批量项必须对同一选中集合产出**逐字符一致**的 N 段文本（N≥2 时 `===== #i/N =====` 分隔）。
2. **右键不得丢失多选**：右键命中**已在集合内**的行时，必须保留集合（或提供等价且可达的批量入口）；只有右键命中集合**之外**的行才按「单选替换」处理。菜单批量项在 `count≥2` 时**必须真实出现**。
3. **混合修饰键正确**：Ctrl 选集 + Shift 扩选必须得到**并集**（additive range），不得清空先前 Ctrl 选中的项。
4. **边界**：0 条 → 明确提示且不写剪贴板；1 条 → 逐字符等于单选；N 条 → N 段，无跨条混淆；全选/Ctrl/Shift/混合均正确。

### 10.2 修复设计需回答的关键约束（交 `02-solution-design`）

- 「右键即选中」与「右键保留多选」如何裁决（ADR-014 需**重裁**并记录：命中已选行=保留；命中未选行=替换）。RC-3 要求把互斥改成一致规则。
- `rangeTo` 是改为「并集」还是新增 additive 模式；若改语义，如何保持既有单测 `tests/multiselection.test.mjs:152-205` 的「替换式」期望不倒退（需明确新契约并更新用例）。
- ②③ 与 ① 的 UI 改动叠加：复制按钮区在「模式 A/B 双按钮」下，批量入口是否也需 A/B 双按钮（默认 A）——**此为待定决策**，建议在 solution 节点拍板并写入 ADR。
- ③ 移除范围：需求原话明确「删除右键菜单中的两项」，但「处理逻辑」`runSectionCopy/buildSectionCopy/extractSectionText` 与底部 `#copy-req-btn/#copy-resp-btn` 共用同一实现。**默认裁定：一并移除该能力（含底部两按钮与全部共享逻辑），只保留「复制请求+响应」与批量项**；若 solution 节点决定保留底部按钮，需显式记录偏离并保留对应逻辑与 i18n（`copy.buttonRequest/Response`）。`[ASSUMPTION]`
- 保持约束：MV3 / 零第三方依赖 / 仅 `clipboardWrite` / 零网络 / 响应体逐字符保真 / 大响应·二进制·Base64 规则不变。

### 10.3 测试补齐要求（RC-4）

必须新增/修订：
- **面板级接线测试**（真实 `panel.js` + DOM shim，或扩展既有 E2E harness）：多选态右键 → 菜单含 `copy-selected` → 点击产出 N 段；
- **混合修饰键**：`selectAt + toggleAt + ctrl+shift` 的并集断言（`multiselection.test.mjs` 新增用例）；
- **入口等价**：工具栏批量项与右键批量项产物逐字符一致；
- **边界**：0/1/N、全选、`onEvict` 后计数收敛；
- **②**：模式 A/B 双按钮各自产物与冻结 A/B golden 逐字符一致；默认 A；无 toggle 状态残留；
- **③**：删除后断言菜单项集不含 `copy-request-only/copy-response-only`、无 `canCopyRequestOnly` 入参、相关 i18n 键清理、门禁 id 清单同步；
- **同步门禁**：`scripts/check-panel-shell.mjs` 的 id 清单、`tests/i18n.test.mjs:71-72,85-86` 的键断言、E2E harness 的 `#mode-toggle` 步骤。

### 10.4 文档修订

- `butler/plan/…功能增/plan.md:506-517` ADR-014：修正互斥条目，明确右键在多选内的保留语义，并补「联合可满足性」核对说明；
- `extension/src/contextmenu.js:162-164` 注释与实现对齐；
- `tests/README.md`、`test-cases.md`（含 `:91` 的 P2 用例）同步清理；
- 若 ③ 移除底部按钮：`docs/USAGE.md` / `INSTALL.md` 中相关说明同步。
