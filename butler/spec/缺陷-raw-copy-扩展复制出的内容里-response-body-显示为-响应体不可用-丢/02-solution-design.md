# 02 · 修复方案设计：Raw Copy 响应体丢失（`[Response Body]` = 「（响应体不可用）」）

> **文档版本**：v1.0（覆盖重写）
> **日期**：2026-10-02
> **阶段**：Mode plan（fix 管线 · 方案设计节点）
> **角色**：butler-fix-analyst
> **方法论**：`skill: fix-guardrails`（横切约束 → 多方案 ≥2 → 5 轴评分 → 后果追溯 ≥2 层 → 反偷懒清单 → 6 角度对抗 → pre-mortem）
> **问题 slug**：`缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢`
> **上游输入**：`01-root-cause.md`（RC-1/RC-2/RC-3，均 `confidence: high`）、`spec.json`（REQ-001..014 / DEL-001..009 / AC-001..012）
> **覆盖范围**：本文**覆盖重写**本目录 `02-solution-design.md` 旧内容；不修改任何生产代码、不启动任何 DAG。
> **机读结论**：见文末 `---ARCH_START---` / `---ARCH_END---`。
> **推荐方案**：**方案 A · 捕获层异步 enrich + store 原地回填 + pending/await 竞态处理**（`score: 21/25`）。
> **用户决策**：`USER_DECISION_REQUIRED: true`（见 §10）。

---

## 0. 根因 → 方案映射（设计目标锚点）

| 根因 | 性质 | 本方案必须命中 |
|------|------|----------------|
| **RC-1** 捕获层未调用 `harEntry.getContent()`，仅同步读 `response.content.text` | 技术 | 引入异步获取 → 回填**同一条** store 记录 → 复制读到真实正文 |
| **RC-2** 把「无 `content.text`」合法化为「响应体不可用」；ADR-003「同步读取」措辞与异步 API 矛盾；`getContent` 被降级为「备选」 | 设计/流程 | `getContent` 升为**常规路径**；边界定义与文档同步修正；占位仅留给合法场景 |
| **RC-3** 测试恒带 `content.text` 且断言缺失时为 `null`，固化缺陷 | 测试/流程 | 修正错误断言 + 新增缺失路径/异步/编码/保真用例 |
| **RC-3b** `getContent` 全量取正文会加剧 sec-audit R-01 内存放大 | 关联约束 | 字节预算 + 淘汰联动，不得无界驻留 |

**一句话目标**：凡浏览器侧正文客观存在（含 401 等错误响应），复制输出必须**逐字符完整**；占位只在「客观不可获取 / 主动降级（超预算）」时出现，且必须可解释。

---

## 1. 横切约束前置（不可违背）

### 1.1 硬约束

| # | 约束 | 来源 |
|---|------|------|
| C-1 | `normalize()` 必须保持**纯同步纯函数**，可被单测直接调用、无异步副作用 | REQ-002 / AC-004；`capture.js:11` |
| C-2 | 捕获回调位于页面请求热路径，**不得阻塞**；异步获取必须另设步骤 | REQ-002；design.md:215 |
| C-3 | 不得长期驻留 `harEntry` 引用/闭包，防 `getContent` 连带保留响应体（内存泄漏） | REQ-008；ADR-003（design.md:241-244） |
| C-4 | 回填必须写回 store 中**同一条记录（引用一致）**，复制读最新值 | REQ-003 / AC-005 |
| C-5 | 不得打乱 1000 条环形缓冲顺序与淘汰语义；回填触发一次 UI 刷新 | REQ-005 / AC-008 |
| C-6 | 满足 sec-audit R-01：全量正文不得无界驻留，须结合字节预算/阈值 | REQ-009 / AC-009 |
| C-7 | 占位仅保留给「客观无法获取 / 二进制省略 / 超预算降级」；文本类正文不再产出占位 | REQ-007 / AC-003 |
| C-8 | 模式 A/B 的 body 与解码后正文逐 UTF-16 码元一致，不 trim/不转义/不截断 | ADR-006；AC-002 / AC-013 |
| C-9 | 零第三方依赖、原生 ESM；体积 <200KB；最小权限不变（`getContent` 属既有 `devtools.network`） | ADR-002/009；C 维 `[cia_no_config]` |
| C-10 | 兼容 `getContent(callback)` 回调形式与 Promise 形式双形态 | REQ-014 |

### 1.2 「绝对不做」清单（给实施节点的硬约束）

- ❌ 不把 `normalize` 改为 `async` / 返回 Promise（破坏 C-1 与既有 123 基线）。
- ❌ 不在 store 中长期保存 `harEntry` 或 `harEntry.getContent` 绑定（破坏 C-3）。
- ❌ 不在捕获回调内做 base64 解码 / JSON 解析 / DOM 操作（design.md:215）。
- ❌ 不采用 `chrome.devtools.network.getHAR()` 全量快照方案（design.md:323 已判「不采用」）。
- ❌ 不通过截断正文来满足内存预算（截断违反 AC-002 字符级保真）；预算只通过**条数/字节淘汰**与**超预算降级标注**实现。
- ❌ 不同批修改 RC-2/RC-3 时只修一行 `getContent`（会导致复发）。

---

## 2. 多方案设计

> 至少 2 个独立方案（本节给出 3 个）。每方案含：描述 / 变更范围（file:line）/ 优点 / 缺点风险。

### 方案 A — 捕获层异步 enrich + store 原地回填 + pending/await 竞态处理（推荐）

**描述**：`normalize` 保持纯同步不变；`installCapture` 在 `store.add(record)` **之后立刻**调用 `harEntry.getContent()`（回调/Promise 双形态），回调内把正文 + `encoding` 回填到**同一条记录**，再经 `store.update(id)` 触发一次 `update` 事件；面板订阅 `update` 刷新。为解决「异步未完成就点复制」，回填期间在记录上标记 `pending`，`onCopyClick` 先 `await` 该记录的完成（带超时），展示「获取中」而非占位。内存侧由 `store` 的字节预算（`maxBytes`）在回填增量入账时按「淘汰最旧」兜底（复用现有 `evict`/`onEvict` 链路）。

**变更范围**：

| 文件 | 变更 | 说明 |
|------|------|------|
| `extension/src/capture.js:171-239` | 修改 | `installCapture` 新增 enrich 触发（`maybeEnrich(harEntry, record, id)`）；新增 `applyContent(record, text, encoding)` 纯工具；保持 `normalize:105-145` **零改动** |
| `extension/src/store.js:105-163,213-224` | 修改 | 新增 `update(id, patch)`（原地合并 + `notify({type:'update'})`）、`bytesInUse`/`maxBytes` 预算与字节淘汰；新增 pending 注册表 `markPending/resolvePending/awaitPending`（或等价 API） |
| `extension/panel.js:127-157,656-668,711-756` | 修改 | `installCapture({...,onUpdate:requestRefresh})`；订阅 `update` 刷新；`resolveResponseBodyText` 增 pending 分支（展示「获取中」）；`onCopyClick` 复制前 `await` pending（超时→明确提示） |
| `extension/src/i18n.js:98-100` | 修改 | 新增 `content.fetching`（如「（正在获取响应体…）」）、`copy.fetchingTimeout`（中英双语） |
| `extension/src/content.js:278-292` | 微调 | 可选：`classifyBody` 对 `pending` 状态的显示处理（复制路径由 panel await，故分类逻辑无需破坏） |
| `tests/capture.test.mjs:14-40,125-132,200-241` | 修改 | 修正 `text===null` 错误断言；桩增加可选 `getContent`；新增缺失路径用例 |
| `tests/enrich.test.mjs` | 新增 | 双形态 / 竞态 / 编码合并 / 字符级保真 / 401 |
| `tests/store.test.mjs` | 修改 | 新增 `update` 事件、字节预算淘汰、pending 注册表用例 |
| `design.md:243,319,337` / `feasibility.md:77` / `stories-written.md:156-158,497-500` | 修改 | 边界定义修正（`getContent`→常规路径、取正文→必达、降级矩阵更新） |

**优点**：
- 完整命中 RC-1/RC-2/RC-3；`getContent` 在 entry 存活当刻调用，最可靠（无惰性时序不确定）。
- `normalize` 与 formatter 零改动，AC-004/AC-011 基线可控。
- 回填写同一条记录，AC-005 引用一致天然满足；环形语义不变。
- 内存预算与 sec-audit R-01 建议方案（捕获期字节预算 + 复用 evict）一致。

**缺点 / 风险**：
- 改动跨 3 个模块（capture/store/panel）+ 文档 + 测试，工作量最大。
- pending/await 引入复制路径异步化（`buildCurrentCopy` 仍同步，仅 `onCopyClick` 变 await），需处理超时与选中断链。
- `getContent` 双形态回调签名有版本差异，需真机验证（CE-4）。

---

### 方案 B — 复制时惰性补取（保留 `getContent` 句柄 / WeakRef，复制时刻调用）

**描述**：`normalize` 时把 `harEntry` 包成 `WeakRef` 存到记录上；用户点击复制时若 `responseContent.text` 为空，则解引用 entry 调 `getContent`，await 后临时拼接输出（不回填、不触发刷新）。为减少内存压力可加 TTL/LRU。

**变更范围**：
- `extension/src/capture.js:117-144` — 修改：记录附加 `WeakRef(harEntry)`；
- `extension/panel.js:711-756` — 修改：`onCopyClick` 改为惰性 await 取正文；
- `extension/src/formatter.js` / `content.js` — 复制路径需接受异步结果；
- `tests/*` — 桩需支持 WeakRef 与异步复制。

**优点**：捕获热路径几乎零额外开销；不在捕获期全量取正文，天然省内存。

**缺点 / 风险**：
- **直接违反 C-3**：`getContent` 是 entry 上的方法，`WeakRef` 一旦被 GC，复制时正文永久取不到；且只要持有 `getContent` 就等价保留 entry 闭包，弱引用并不能改变「方法调用需 entry 存活」这一事实 → 可靠性差。
- 复制路径异步化，`buildCurrentCopy` 从纯同步变为异步，波及大量既有单测与导出契约（破坏性大）。
- 选中后长时间才复制，entry 大概率已被回收；对「用户先浏览再复制」的主用例直接失效 → 根因未真正解决。
- 与 ADR-003 明确冲突，需重开架构决策。

---

### 方案 C — 复制时 `chrome.devtools.network.getHAR()` 全量快照 + 按 URL/时间关联回填

**描述**：放弃「单条记录」边界，复制时调用 `getHAR()` 拉取全部请求 HAR，按 `request.url + startedDateTime` 匹配当前记录，取其 `response.content.text` 输出/回填。

**变更范围**：
- `extension/panel.js` — 新增 `getHAR` 调用与匹配逻辑；
- `extension/src/capture.js` — 记录中补充可用于匹配的键；
- 文档 ADR-005 需推翻（design.md:323 已判「不采用」）。

**优点**：不依赖 `onRequestFinished` 的延迟内容语义，理论上能拿到全量正文。

**缺点 / 风险**：
- **违反 design.md ADR/5.1 明确决策**（`getHAR` 不采用，违反「单条」边界）。
- 全量 HAR 会把**所有请求**（含凭证、其它站请求正文）一次性载入内存 → 严重放大 R-01/R-02，安全与隐私双重恶化。
- 匹配歧义高（重复 URL、并发同 URL），`startedDateTime` 精度/时区差异易错配。
- 延迟高（每次复制全量序列化），违背 UX 与体积/性能门禁。

---

## 3. 后果追溯（≥2 层，反偷懒 #1）

### 方案 A 连锁反应

```
直接后果：
  捕获时每有一条「无 content.text 且有 getContent」的请求，就在热路径尾部发起一次异步取正文，
  回填到同一 store 记录并 emit update。
  → 二级后果：
      a) 面板列表/详情收到 update 后刷新 → 用户在 200~800ms 内看到正文从「获取中」变为真实正文；
      b) store.bytesInUse 随回填增量上升 → 触发字节预算淘汰最旧记录 → selection.onEvict 联动清选中（既有链路）；
      c) 若用户已选中并在回填完成前点复制 → onCopyClick await 到回填完成再拼接（或超时提示），不再产出占位。
      → 三级后果：
         i)  高频页面下并发的 getContent 回调数量上升 → 需限制并发/串行队列，否则回调风暴；
         ii) 字节预算若设置过小，会误淘汰用户刚请求的大响应 → 需给出默认值（64MB）与可配置项；
         iii) 测试桩若无 getContent，需保证不抛错、行为等同「客观不可获取」，避免 123 基线回归。

回退方式：getContent 触发与回填可整体用 feature flag/常量开关关闭，回退到「现状 + 文档标注」；
          store.update 为增量 API，不改变 add/all 契约，可独立回退。回退耗时 ≈ 单次 revert + 重跑测试（<30min）。

3 个月后：enrich 成为捕获层一等公民，pending/预算语义沉淀为架构约束；风险是「每请求都 enrich」
          可能在高频场景成为隐性能耗点 → 由并发上限与预算兜底，长期健康。
```

### 方案 B 连锁反应

```
直接后果：记录携带 WeakRef，复制时才尝试取正文 → 二级后果：entry 已 GC 时复制仍失败并落回占位，
          根因在真实使用节奏下仍复现；复制路径异步化 → 三级后果：既有同步 `buildCurrentCopy` 契约与
          数十条单测需改写，回归面大且收益不确定。

回退方式：恢复为现状占位（等于没修）。回退耗时短，但等于放弃修复。

3 个月后：留下“看似修了、实际时灵时不灵”的隐性缺陷，且异步复制路径成为新债务 → [quick_fix_alert]。
```

### 方案 C 连锁反应

```
直接后果：每次复制拉全量 HAR → 二级后果：内存/隐私暴露面骤增（R-01/R-02 升级），匹配歧义产生错配正文；
          三级后果：推翻已冻结 ADR、审计重开、体积与性能门禁风险。

回退方式：删除 getHAR 调用，回到占位。回退耗时短，但已影响架构决策记录。

3 个月后：架构一致性受损，团队对“单条边界”失去信心 → [weak_solution]。
```

---

## 4. 5 轴评分（反偷懒 #2）

| 维度 | 方案 A | 方案 B | 方案 C |
|:-----|:------:|:------:|:------:|
| A. 技术正确性（是否解决根因 + 副作用） | 5 | 2 | 3 |
| B. 实施可行性（改动量/风险/可逆性） | 4 | 3 | 2 |
| C. 安全合规（漏洞/违规） | 4 | 3 | 2 |
| D. 长期可维护性（3 个月后好坏） | 4 | 2 | 2 |
| E. 影响范围（对现有系统冲击可控度） | 4 | 4 | 2 |
| **综合** | **21/25** | **14/25** | **11/25** |

**低分说明与可改善性**：
- 方案 A：B 维 4（跨模块但可逆、有回归基线）；C 维 4（不新增权限，但敏感正文驻留面略增→由复制确认 + 预算缓解，无法到 5）；无 ≤2 维度。
- 方案 B：**A 维 2**（未真正解决根因，受 GC 支配）；**D 维 2 → `[quick_fix_alert]`**。改善路径：改为捕获当刻取正文即等于方案 A，故不推荐单独采用。
- 方案 C：**B/C/D/E 均 ≤2 → `[weak_solution]`**（综合 11/25 < 15）。改善路径：回到单条边界，即方案 A。

---

## 5. 方案对比 + 推荐

| 维度 | 方案 A（推荐） | 方案 B | 方案 C |
|:-----|:-------------:|:------:|:------:|
| 改动规模 | 中-大（3 模块 + 文档 + 测试） | 中（改动面窄但破坏契约） | 中 |
| 5 轴综合 | **21/25** | 14/25 | 11/25 |
| 回退难度 | 低（增量 API + 开关） | 低（等于不修） | 低（但伤架构） |
| 长期健康 | 好（沉淀 enrich/预算语义） | 差（隐性缺陷 + 异步复制债） | 差（破坏 ADR 与安全面） |
| 根因覆盖 | RC-1/RC-2/RC-3/RC-3b 全覆盖 | 仅部分 RC-1，且不可靠 | 仅部分 RC-1 |

**推荐：方案 A。**
理由：唯一同时满足「完整取到正文」「保持 `normalize` 纯度」「不驻留 entry」「回填同一记录」「兼容内存预算」的方案；且可逆、可测试、与既有架构决策一致。B/C 作为对照方案保留，供用户权衡。

---

## 6. spec ID 覆盖矩阵（方案 ↔ spec 条目）

> ✅ 直接满足 ｜ 🔶 部分/间接满足（需补充动作） ｜ ❌ 不满足

| spec ID | 方案 A | 方案 B | 方案 C |
|---------|:------:|:------:|:------:|
| REQ-001 捕获层 getContent | ✅ | 🔶 | 🔶 |
| REQ-002 normalize 纯同步 + enrich 独立 | ✅ | ❌（异步复制路径破坏） | 🔶 |
| REQ-003 回填同一条记录 | ✅ | 🔶（仅复制期临时，非回填） | 🔶 |
| REQ-004 encoding 合并 | ✅ | 🔶 | 🔶 |
| REQ-005 UI 刷新 + 环形语义 | ✅ | ❌ | ❌ |
| REQ-006 复制竞态 | ✅ | ❌ | ❌ |
| REQ-007 占位仅合法场景 | ✅ | 🔶 | 🔶 |
| REQ-008 不驻留 entry | ✅ | ❌ | ❌ |
| REQ-009 字节预算 / R-01 | ✅ | 🔶 | ❌（放大） |
| REQ-010 边界定义/文档修正 | ✅ | ❌ | ❌ |
| REQ-011 修正错误断言 | ✅ | 🔶 | 🔶 |
| REQ-012 新增用例 | ✅ | 🔶 | 🔶 |
| REQ-013 字符级保真 | ✅ | 🔶 | 🔶 |
| REQ-014 双形态兼容 | ✅ | ✅ | 🔶 |
| DEL-001 capture enrich | ✅ | 🔶 | ❌ |
| DEL-002 panel 接线/竞态 | ✅ | 🔶 | 🔶 |
| DEL-003 store 回填/订阅 | ✅ | ❌ | ❌ |
| DEL-004 content 编码合并适配 | ✅ | 🔶 | 🔶 |
| DEL-005 tests/capture 修正+新增 | ✅ | 🔶 | 🔶 |
| DEL-006 tests/enrich 新增 | ✅ | 🔶 | 🔶 |
| DEL-007 design.md 修订 | ✅ | ❌ | ❌ |
| DEL-008 feasibility.md 修订 | ✅ | ❌ | ❌ |
| DEL-009 stories-written.md 修订 | ✅ | ❌ | ❌ |
| AC-001 getContent 路径取到正文 | ✅ | 🔶 | 🔶 |
| AC-002 真机 401 逐字符 | ✅ | ❌（可能 GC 失效） | 🔶 |
| AC-003 占位仅合法场景 | ✅ | 🔶 | 🔶 |
| AC-004 normalize 仍纯同步 | ✅ | ❌ | 🔶 |
| AC-005 回填引用一致 | ✅ | 🔶 | 🔶 |
| AC-006 encoding/base64 解码 | ✅ | 🔶 | 🔶 |
| AC-007 竞态不误报 | ✅ | ❌ | ❌ |
| AC-008 刷新 + 淘汰语义不变 | ✅ | ❌ | ❌ |
| AC-009 内存无界增长 | ✅ | ✅ | ❌ |
| AC-010 测试断言修正 + 新用例 | ✅ | 🔶 | 🔶 |
| AC-011 无回归 | ✅ | ❌ | ❌ |
| AC-012 文档与实现一致 | ✅ | ❌ | ❌ |

**结论**：方案 A 覆盖 **REQ 14/14、DEL 9/9、AC 12/12**；B/C 均存在硬失败项，不满足 spec 脊柱，故仅作对照。

---

## 7. 6 角度对抗审查（red-team，方案 A）

| 角度 | 挑战 | 风险等级 | 缓解措施 |
|------|------|:--------:|----------|
| 安全 | enrich 把原本缺失的敏感响应正文引入内存并可能进剪贴板，扩大驻留/泄露面 | 中 | 沿用现有复制前大响应确认；字节预算限制驻留；零网络传输不变；不落盘 |
| 资源 | 高频页面每请求发起 `getContent` → 回调/内存压力上升 | 中 | 仅 `text===null && typeof getContent==='function'` 才 enrich；并发上限/串行队列；`maxBytes` 淘汰最旧 |
| 时间 | 异步回填可能晚于用户点击复制 | 低 | `pending` + `await` + 超时；超时给明确提示而非占位 |
| 依赖 | `getContent` 回调签名（`(content, encoding)`）与 Promise 形态版本差异；Node 桩无该 API | 低 | 双形态解析 + `typeof` 守卫 + 测试桩可选注入；CE-4 真机验证 |
| 用户行为 | 用户误以为超预算降级正文也是完整正文 | 低-中 | 降级时输出显式 oversize 标注 + Toast 说明；文档写明预算默认值 |
| 逆向激励 | 实施者图省事只加一行 `getContent`，不改 RC-2/RC-3 | 中 | §1.2 硬约束 + 本方案将 RC-2/RC-3 同批绑定为交付门禁 |

---

## 8. 事前验尸（pre-mortem，假设方案 A 上线后失败）

| 失败场景 | 概率 | 影响 | 预防措施 |
|----------|:----:|:----:|----------|
| `getContent` 回调参数被误当对象（实际为 `content, encoding` 两参） | 中 | 高 | `done(text, encoding)` 与 Promise `{content,encoding}` 双解析；单测覆盖两形态 |
| 回填时记录已被淘汰，写到陈旧对象 | 中 | 中 | 回填前校验 `store.get(id) === record`，否则丢弃 |
| pending 永不 resolve（页面导航/API 不回调）导致复制卡住 | 中 | 中 | `awaitPending` 超时（如 3s）→ 明确提示，不静默占位 |
| 字节预算过小误淘汰用户刚选中项 | 中 | 中 | 默认 64MB；淘汰走既有 `onEvict`（选中被清有提示）；可配置 |
| Node 测试桩缺 `getContent`，引入回归 | 中 | 低 | `typeof` 守卫 + 桩可选；保持 `normalize` 纯同步，123 基线先行验证 |
| 文档未同步，后续开发再次降级为占位 | 中 | 中 | DEL-007/008/009 同批；AC-012 机械校验文档与实现一致 |

---

## 9. 反偷懒检查清单

| 检查项 | 结论 |
|--------|------|
| 这是「最容易写的方案」而非最正确的方案？ | 否。最省事的写法是只加一行 `harEntry.getContent` 不改测试/文档（方案 B 的近亲），已明确拒绝。 |
| 时间充足时会设计出完全不同的方案吗？ | 否。已枚举 3 个独立方案并给出评分，A 在全部 5 轴领先。 |
| 3 个月后会被推翻重做吗？ | 低概率。A 将 enrich/pending/预算沉淀为架构语义，且与既有 ADR 一致；文档同步降低复发。 |
| 是否被「最小改动量」限制住？ | 否。明确接受跨 3 模块 + 文档 + 测试的改动量。 |
| 是否处理了所有根因，而非只处理最表面的？ | 是。RC-1（技术）+ RC-2（边界/文档）+ RC-3（测试）+ RC-3b（内存预算）全覆盖。 |

`LAZY_CHECK: PASS`

---

## 10. 决策（用户选择）

> **推荐 ≠ 决策。** 请用户在下列选项中确认；未确认前实施节点不得启动。

- [x] **采用方案 A（推荐）** — 捕获层异步 enrich + 原地回填 + pending/await + 字节预算。
- [ ] 采用方案 B — 复制时惰性补取（**已知不满足 AC-002/004/011，`[quick_fix_alert]`**）。
- [ ] 采用方案 C — `getHAR()` 全量快照（**违反 ADR，`[weak_solution]`**）。
- [ ] 其它/退回重设计（说明：__________）。

**记录**：2026-10-02 老板决定采用方案 A（推荐）。approved via butler-build。
**`USER_DECISION_REQUIRED: false`**（已决策：方案 A）

---

## 11. 机读结论（fix-guardrails 契约）

```text
---ARCH_START---
doc: 02-solution-design
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
version: v1.0
date: 2026-10-02
mode: plan
methodology: fix-guardrails
upstream: [01-root-cause.md, spec.json]
root_causes_addressed: [RC-1, RC-2, RC-3, RC-3b]

constraints:
  hard: [C-1 normalize pure sync, C-2 non-blocking hot path, C-3 no entry retention,
         C-4 same-record backfill, C-5 ring/buffer semantics, C-6 byte budget (R-01),
         C-7 placeholder only legit, C-8 char-level fidelity, C-9 zero-dep/min-perm, C-10 dual-form getContent]
  never_do: [async normalize, retain entry/getContent, base64/JSON/DOM in capture callback,
             getHAR snapshot, truncate body, fix only one line]

SOLUTIONS:
  - id: A
    name: capture-layer async enrich + in-place store backfill + pending/await race handling
    status: recommended
    changes:
      - extension/src/capture.js:171-239
      - extension/src/store.js:105-163,213-224
      - extension/panel.js:127-157,656-668,711-756
      - extension/src/i18n.js:98-100
      - extension/src/content.js:278-292
      - tests/capture.test.mjs; tests/enrich.test.mjs; tests/store.test.mjs
      - design.md:243,319,337; feasibility.md:77; stories-written.md:156-158,497-500
    consequence_depth: 3
  - id: B
    name: lazy on-copy getContent via WeakRef handle
    status: rejected
    consequence_depth: 3
  - id: C
    name: getHAR() full snapshot + correlate by url/time
    status: rejected
    consequence_depth: 3

SCORE:
  - { id: A, correctness: 5, feasibility: 4, security: 4, maintainability: 4, impact: 4, total: 21, verdict: ok }
  - { id: B, correctness: 2, feasibility: 3, security: 3, maintainability: 2, impact: 4, total: 14, verdict: quick_fix_alert }
  - { id: C, correctness: 3, feasibility: 2, security: 2, maintainability: 2, impact: 2, total: 11, verdict: weak_solution }

CONSEQUENCE_DEPTH:
  - { id: A, depth: 3 }
  - { id: B, depth: 3 }
  - { id: C, depth: 3 }

SPEC_COVERAGE:
  solution_A: { REQ: 14/14, DEL: 9/9, AC: 12/12 }
  solution_B: { hard_fail: [REQ-002, REQ-005, REQ-006, REQ-008, REQ-010, DEL-001, DEL-003, DEL-007, DEL-008, DEL-009, AC-002, AC-004, AC-007, AC-008, AC-011, AC-012] }
  solution_C: { hard_fail: [REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, DEL-001, DEL-003, DEL-007, DEL-008, DEL-009, AC-007, AC-008, AC-009, AC-011, AC-012] }

LAZY_CHECK: PASS
RED_TEAM_ANGLES: [security, resource, time, dependency, user-behavior, reverse-incentive]
PRE_MORTEM_SCENARIOS: 6

RECOMMENDED: A
USER_DECISION_REQUIRED: true
DAG_STARTED: false
CODE_CHANGED: false
---ARCH_END---
```

---

*本节点只做分析与方案设计，未修改任何生产代码，未启动任何 DAG。*
