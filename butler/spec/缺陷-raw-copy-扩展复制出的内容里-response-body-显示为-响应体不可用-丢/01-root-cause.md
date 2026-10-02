# 01 · 根因分析报告：Raw Copy 复制出的 `[Response Body]` 显示「（响应体不可用）」

> **文档版本**：v1.0
> **日期**：2026-10-02
> **阶段**：Mode analyze（fix 管线 · 根因分析节点）
> **角色**：butler-fix-analyst
> **方法论**：`skill: fix-rca`（多假设 RCA + 反实验验证 + 5-Whys + CIA 四维扫描 + 影响×难度矩阵）
> **问题 slug**：`缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢`
> **结论摘要**：主根因 RC-1（未调用 `harEntry.getContent()`）`confidence: high`；设计根因 RC-2（把缺失正文降级为可接受边界 + 「同步读取」语义错误）`confidence: high`；测试根因 RC-3（测试样本恒带 `content.text`，缺失路径断言 `null`）`confidence: high`。
> **机器可读结论**：见文末 `---RCA_START---` / `---RCA_END---` 块。
> **约束声明**：本节点**只做分析与验证，未修改任何生产代码，未启动任何 DAG**。

---

## 0. 问题 Framing

### 0.1 三段标记

- **现象陈述 `[symptom]`**：Raw Copy 扩展复制出的内容里，`[Response Body]` 显示为「（响应体不可用）」，真实响应体丢失。
- **问题定义 `[problem]`**：复制产物违反了扩展的核心价值主张——「按需求原样输出完整响应体（不美化 JSON、不截断、字符级保真）」。用户拿到的是占位文案而非 401 JSON 正文，无法直接粘贴给 AI 排查问题。
- **解决方案偏见 `[solution-biased]`**：问题原话给出「疑似根因方向」——`entry.response.content.text` 常为空，需调用 `entry.getContent(cb)`。这是一个**假设**而非结论；本报告将其作为 H1 独立验证，并额外排查设计/测试层面的未预防原因（避免「只修一行」再次复发）。

### 0.2 复现基线（原话全文）

> 缺陷：Raw Copy 扩展复制出的内容里 `[Response Body]` 显示为「（响应体不可用）」，丢失了真实响应体。
>
> 复现：访问 `https://auth.autional.cn` ，在 Raw Copy 面板选中请求 `POST https://auth.autional.cn/bff/identity/api/v1/auth/login`（响应 `http/2.0 401`，`content-length: 395`，`content-type: application/json; charset=utf-8`），点击「复制请求 + 响应（原始）」。输出中 REQUEST 部分与响应头正常，但 `[Response Body]` 为「（响应体不可用）」。
>
> 期望：按需求原样输出完整响应体（不美化 JSON、不截断、字符级保真）；401 响应体也应完整复制。

### 0.3 问题边界

- 仅响应体丢失；请求块、请求头、响应头、状态行均正常 → 问题被隔离在 **响应体数据通路**（HAR `response.content` → `RequestRecord.responseContent.text` → 复制输出）。
- `content-length: 395` 说明响应体**客观存在**，且 `content-type: application/json; charset=utf-8` 属文本类，理应原样输出。

---

## 1. 模式选择

| 判据 | 本问题 | 选择 |
|------|--------|------|
| 是否规则性/可复现 | 是（特定面板操作 100% 复现，且与响应状态无关） | — |
| 是否涉及异步 API / 数据生命周期 | **是**（`getContent` 是异步回调；ext 采用「捕获时归一化、复制时读取」的两阶段模型） | — |
| 是否涉及测试盲区 | **是**（123 用例全绿仍复现） | — |

→ **采用假设驱动模式（3–5 个相互独立假设）+ 5-Whys 线性补充**（用于追溯「为什么评审/测试没发现」）。

---

## 2. 事实基线（确定性扫描，全部 `file:line`）

> 以下均为读盘/grep 得到的事实，不含推测。

| # | 事实 | 位置 |
|---|------|------|
| F1 | `normalize()` 同步读取 `entry.response.content.text`，缺失即置 `null`；**全函数无任何 `getContent` 调用** | `extension/src/capture.js:105-145`，关键行 `:113` |
| F2 | 捕获回调 `handleRequestFinished` 同步执行「`normalize` → `store.add` → `onAdd`」，**无异步补写步骤** | `extension/src/capture.js:202-224`（`:205` 调用 normalize） |
| F3 | 全仓 grep `getContent`：仅出现在**注释/设计文档**中，无一处可执行调用 | `extension/src/capture.js:6`（注释）；`design.md:216/241/243/319`；`tech-evaluation.md:531` |
| F4 | 复制时用 `classifyBody(record.responseContent)` 分类；`unavailable` → 返回 `t('content.unavailable')` | `extension/panel.js:127-139`（`:131` 分类、`:138` 占位） |
| F5 | `classifyBody`：`text` 非非空字符串 → `{kind:'unavailable', byteSize}` | `extension/src/content.js:286-292` |
| F6 | 占位文案「（响应体不可用）」定义处 | `extension/src/i18n.js:98` |
| F7 | `buildCurrentCopy` 把 `resolveResponseBodyText(record)` 作为 `options.responseBody` 注入 formatter（**覆盖**记录自带 responseContent.text） | `extension/panel.js:150-157`（`:155-156`） |
| F8 | formatter 的 `resolveBodies` 优先采用 `options.responseBody`；占位文案因此原样进入 `[Response Body]` 段 | `extension/src/formatter.js:197-207`（`:204`） |
| F9 | 面板装配：`installCapture({ store, onAdd: requestRefresh })`——捕获层与 store 之外无正文补取 | `extension/panel.js:656` |
| F10 | 设计明确写出 getContent 兜底意图：「仅在 `content.text` 缺失时，于**捕获回调内同步读取**（不保留 entry）」 | `butler/spec/.../design.md:243`（ADR-003） |
| F11 | 设计把 `content.text` 缺失的降级固定为「输出『响应体不可用』（R1 边界）」`confirmed` | `design.md:337` |
| F12 | `getContent` 被登记为**「备选（……不作为常规路径）」** | `design.md:319` |
| F13 | 现有测试用 `makeFullEntry()` 恒带 `content.text`，因此从未走「缺失→getContent」路径 | `tests/capture.test.mjs:14-40`（样例），`:200-241`（installCapture 桩无 getContent） |
| F14 | 现有测试**主动断言**删除 `content.text` 后 `normalize` 返回 `text===null`（把缺陷行为固化为期望） | `tests/capture.test.mjs:125-132` |
| F15 | 123 条单测基线全绿（缺陷在测试网之下） | 反实验 CE-0 实测 |

---

## 3. 多假设 RCA

> 证据强度：`confirmed`（≥2 独立来源）｜`likely`（1 来源）｜`inconclusive`（无可靠来源）。
> 判定：PROVED / DISPROVED / INCONCLUSIVE。

### H1（主假设）—— `normalize` 只读同步 `content.text`，未调用 `harEntry.getContent()`，而 Chromium HAR entry 默认不携带正文

- **证据类型**：代码 + 官方 API 契约 + 复现。
- **代码证据**：F1、F2、F3（无任何可执行 `getContent`）。
- **官方契约（独立来源 2）**：Chrome for Developers `chrome.devtools.network` 文档原文：
  > "Note that request content is not provided as part of HAR for efficiency reasons. You may call request's `getContent()` method to retrieve content."
  且 `onRequestFinished` 回调的 HAR entry 上挂有异步 `getContent(callback)` / Promise 形式方法。
- **第三方来源（独立来源 3）**：Chromium 开发者论坛/StackOverflow 多个已知案例一致：`onRequestFinished` 的 entry `response.content.text` 缺失属**设计行为**，必须 `getContent()` 获取。
- **反实验**：CE-1（已执行）用一条「无 `content.text`、但提供 `getContent` 返回正文」的 entry 调 `normalize` → `getContent` **未被调用**，`responseContent.text` 为 `null`。
- **判定**：**PROVED**，**`confidence: high`**。
- **影响**：所有被 DevTools 以「延迟内容」形式提供的响应（绝大多数 XHR/fetch，含目标 401 JSON）正文丢失。

### H2 —— `classifyBody` 分类逻辑错误，把有内容的正文误判为 `unavailable`

- **证据类型**：代码 + 单测。
- **代码证据**：F5 `!hasText` 才 unavailable，逻辑对「text 为空」判定正确。
- **反实验**：CE-2（已执行）`classifyBody({text:'{"a":1}', mimeType:'application/json'})` → `kind:'text'`，且 `tests/content.test.mjs` 已覆盖多类文本原样输出。
- **判定**：**DISPROVED**（`classifyBody` 收到 `null` 才判 unavailable，行为符合契约；真实输入就是 `null`，非误判）。
- **归因**：它是**传播路径的一环**，不是根因。

### H3 —— formatter / `resolveBodies` 丢弃或覆盖了响应体

- **证据类型**：代码 + 单测。
- **代码证据**：F7/F8：占位文案是 `panel.js` 在**注入前**由 `classifyBody` 分类结果生成，formatter 只是忠实输出 `options.responseBody`；若注入 `''`，formatter 会因 `hasBody` 为假而**整段省略** `[Response Body]`（见 `formatter.js:243`），不会凭空产出占位。
- **反实验**：CE-3（已执行）formatter 对显式 `responseBody` 逐字符直通；`tests/formatter.test.mjs:384` 已断言注入 `''` → 无响应体段。
- **判定**：**DISPROVED**（formatter 保真逻辑无缺陷，是数据源为空导致下游降级）。

### H4 —— store 淘汰/记录冻结/引用别名导致选中记录的正文丢失

- **证据类型**：代码。
- **代码证据**：`store.add` 直接持有记录引用（`store.js:127-163`）；单条请求场景无淘汰；`normalize` 在 `store.add` **之前**就把 `text` 置 `null`（F1），丢失点发生在入缓存之前，与 store 无关。
- **判定**：**DISPROVED**。

### H5 —— 存在 `getContent` 调用，但异步结果在「用户点击复制」前未回填（竞态/时序）

- **证据类型**：代码 grep。
- **代码证据**：F3——全仓**不存在任何** `getContent` 可执行调用，故不存在「调用后竞态」这一现象。
- **但**：设计 ADR-003 写的是「于**捕获回调内同步读取**」（F10），而 `getContent` 是**回调/Promise 异步 API**，字面「同步读取」在 API 语义上不可实现——这条**设计文字本身**是 H1 未被落实的诱因。
- **判定**：**DISPROVED**（作为「已调用但竞态」不成立）；其子结论「设计同步措辞与异步 API 矛盾」并入 RC-2 `confidence: high`。

### H6（设计根因）—— 需求/设计把「`content.text` 缺失」定义为**可接受降级边界**，未把「必须取到正文」列为硬需求

- **证据类型**：设计/需求文档（确定性引用）。
- **证据**：
  - `design.md:337`——`content.text` 缺失 → 输出「响应体不可用」（R1 边界），`confirmed`；
  - `design.md:319`——`getContent` 列为「**备选**……不作为常规路径」；
  - `feasibility.md:77`——将「部分请求 HAR entry 无 `content.text`」列为风险 R1，缓解措施仅是「标注不可用」，**未含 getContent 兜底**；
  - `stories-written.md:156-158` / `AC-FMT-002-E1`（`stories-written.md:497-500`）——把「无 `content.text` → 标不可用」写成**验收期望**。
- **判定**：**PROVED**，**`confidence: high`**。
- **说明**：这是「为什么 H1 没被预防」的直接流程原因——把可修复的数据获取缺陷当成了合法边界。

### H7（测试根因）—— 测试样例恒带 `content.text`，并用 `null` 断言固化缺陷

- **证据类型**：测试代码。
- **证据**：F13（`makeFullEntry` 恒有 `content.text`；installCapture 桩的 entry 无 getContent）、F14（`capture.test.mjs:125-132` 断言 `text===null`）。
- **判定**：**PROVED**，**`confidence: high`**。
- **说明**：测试不是「遗漏」，而是「**断言了错误行为**」——这是缺陷能全绿通过的机制。

---

## 4. 5-Whys 线性追溯

```
Why #1（直接原因）：为什么复制出的 [Response Body] 是「（响应体不可用）」？
  → panel.js:131 classifyBody 判为 unavailable，panel.js:138 返回 t('content.unavailable')，
    i18n.js:98 输出该占位，panel.js:155 作为 options.responseBody 注入 formatter。

Why #2（数据原因）：为什么 classifyBody 判为 unavailable？
  → 因为 record.responseContent.text === null（content.js:287-291 的 !hasText 分支）。
    （反实验 CE-1 实测：text=null、byteSize=395）

Why #3（获取原因）：为什么 responseContent.text 为 null？
  → 因为 capture.js:113 只做同步读取 `typeof content.text === 'string' ? ... : null`，
    而 onRequestFinished 的 HAR entry 按 Chromium 设计不含 response.content.text，
    正文必须通过 harEntry.getContent(cb) 异步获取（官方文档明示）。

Why #4（实现原因）：为什么没有调用 getContent？
  → capture.js:105-145 / 202-224 通篇无 getContent 调用；全仓仅有注释提及（capture.js:6）。
    ADR-003 虽写了兜底意图（design.md:243），但写成了 API 上不可实现的「同步读取」，
    实现阶段既未落地、评审也未补齐（design.md:319 又将其降级为「备选」）。

Why #5（最深根因）：为什么「取不到正文」会被允许发布？
  → 需求/设计将「HAR 无 content.text」正式定义为可接受降级边界「响应体不可用」
    （design.md:337 / feasibility.md:77 / stories-written.md:156-158），
    测试据此把 null 固化为期望（tests/capture.test.mjs:125-132），
    导致「核心输出保真」这一产品命门被一个占位文案合法化，缺陷全绿通过（123/123）。
```

**最深根因定性**：这是**「边界定义错误」驱动的系统性根因**，而非单纯漏了一行异步调用。仅补 `getContent` 而不修正边界定义与测试，同类「核心数据缺失被降级为占位」仍会复发。

---

## 5. 反实验验证

> 说明：本节点不修改生产代码，因此「反实验」采用**只读复现 + 负对照（negative control）**，即在不改变源码的前提下构造确定性输入，验证失败链的每一跳。修复后（fix 节点）应补做 CE-4。

### CE-0（基线）—— 现有测试全绿，证明缺陷在测试网之下

- 命令：`node --test "tests/**/*.test.mjs"`
- 结果：`tests 123 / pass 123 / fail 0`。
- 意义：缺陷不是「测试挂了未修」，而是**测试根本没覆盖真实数据形态**。

### CE-1（已执行，只读）—— 负对照：提供 `getContent` 但无 `content.text`，观察 normalize 是否取正文

模拟目标请求（`POST .../login`，401，`content-length: 395`，JSON），entry 带 `getContent` 且能返回真实正文，但 `response.content` 不含 `text`：

```
CTA: getContent called by normalize? false
CTA: responseContent.text = null
CTA: classifyBody = {"kind":"unavailable","byteSize":395}
CTA: copy contains placeholder? true

--- output tail ---
HTTP/2.0 401 Unauthorized
content-type: application/json; charset=utf-8
content-length: 395

[Response Body]
（响应体不可用）
```

- **结论**：H1 PROVED。`normalize` 对可获取的正文**视而不见**；失败链 `content.text 缺失 → text=null → unavailable → 占位` 逐跳复现；`byteSize:395` 进一步证明 `size` 已知而 `text` 未取，正文客观存在。
- **可逆性**：只读执行，无副作用。

### CE-2（已执行，只读）—— 排除分类逻辑缺陷

`classifyBody` 对非空文本返回 `kind:'text'`（见 `tests/content.test.mjs` 及 CE-1 对照）。→ H2 DISPROVED。

### CE-3（已执行，只读）—— 排除 formatter 缺陷

formatter 对显式 body 逐字符直通；注入空串则整段省略（`tests/formatter.test.mjs:384`）；占位只能源自 panel 注入。→ H3 DISPROVED。

### CE-4（修复后补做，`[irreversible: false]`，本节点不做）

修复落地后，在真实 Chrome/Edge 对 `https://auth.autional.cn` 的 401 登录请求执行：调用 `getContent` 并断言复制文本的 `[Response Body]` 与网络面板正文**逐字符相等**，且不再出现占位。属 fix 节点的验收动作，本报告仅登记为待办。

> `[skip_counter_experiment]` 不适用：本问题为 P0 级，已执行可行的只读反实验。

---

## 6. 已排除假设清单（避免重复排查）

| 假设 | 排除理由 | 排除依据（file:line） |
|------|----------|----------------------|
| H2 `classifyBody` 误判有内容的正文 | 非空文本返回 `kind:'text'`；真实输入本就是 `null` | `extension/src/content.js:286-292`；`tests/content.test.mjs`；CE-2 |
| H3 formatter 丢弃/覆盖正文 | formatter 只忠实输出注入值；空串会整段省略而非产出占位 | `extension/src/formatter.js:197-207,240-251`；CE-3 |
| H4 store 淘汰/冻结/别名丢正文 | 丢失点在 `store.add` 之前；单条无淘汰；add 持有引用 | `extension/src/store.js:127-163`；`capture.js:205,212` |
| H5 getContent 已调用但异步竞态 | 全仓无任何可执行 `getContent` 调用 | `capture.js:105-145,202-224`；grep：`capture.js:6` 仅注释 |
| H8（补充）DevTools 协议 `getHAR` 可绕过 | 设计已将 `getHAR` 登记为「不采用」（违反单条边界），且无需依赖它 | `design.md:323` |
| H9（补充）响应体为空/204 导致 | 目标 `content-length: 395` 明确非空，且问题描述正文存在 | 复现原话；CE-1 `byteSize:395` |

---

## 7. 影响 × 难度矩阵

| 根因 | 影响级别 | 难度级别 | 优先级 | 排序依据 |
|------|:--------:|:--------:|:------:|----------|
| **RC-1** 未调用 `getContent`（主根因，P0） | **P0**：核心功能（复制完整响应体）对绝大多数 XHR/fetch 完全失效，直接违背产品命门 AC-007 | **D2**：需引入异步 `getContent`、在「捕获→复制」两阶段模型下正确回填记录，并处理 Promise 与回调兼容 | **HIGH**（P0D2） | 影响最大；难度适中 |
| **RC-2** 边界定义错误（设计根因，P0） | **P0**：把核心数据缺失合法化为占位，是缺陷得以发布的许可 | **D1**：修正设计/需求措辞，把「取正文」列为必达、`getContent` 列为常规路径 | **HIGH**（P0D1） | 不修则复发 |
| **RC-3** 测试固化缺陷（测试根因，P1） | **P1**：测试无法拦截回归，且当前断言与期望相反 | **D1**：替换样例 + 新增缺失路径/异步路径用例 | **HIGH**（P1D1） | 回归防护必需 |
| **RC-3b** 大响应内存约束（关联，P2） | **P2**：`getContent` 全量取正文会加剧 sec-audit R-01 内存放大 | **D2**：需结合字节预算/阈值策略 | **MEDIUM**（P2D2） | 修复时不得恶化既有内存风险 |

**综合优先级：HIGH / CRITICAL 边界**——RC-1 为主修对象，RC-2/RC-3 为「防复发」配套，必须同批处理。

---

## 8. CIA 四维影响扫描

**变更级别判定**：RC-1 修复涉及公共数据结构 `RequestRecord.responseContent.text` 的**写入时机**与捕获模块 API（新增异步语义），属 **L3-跨模块** → 执行 A + B + D 维（C 维配置无涉及，`[cia_no_config]`）。

### A 维 · 调用影响（谁调用）

| 符号 | 调用点 | 确信度 |
|------|--------|:------:|
| `normalize` | `capture.js:205`（`handleRequestFinished`）；`tests/capture.test.mjs` 多处 | confirmed |
| `installCapture` | `panel.js:656`；`tests/capture.test.mjs:193,222,244-245` | confirmed |
| `classifyBody` | `panel.js:131`；`tests/content.test.mjs` 多处 | confirmed |
| `resolveResponseBodyText` | `panel.js:155`（`buildCurrentCopy` 内） | confirmed |
| `buildCopyText` | `panel.js:156`；`tests/formatter.test.mjs` 多处 | confirmed |

### B 维 · 数据结构影响（谁消费了该数据）

| 字段 | 消费点 | 确信度 | 修复含义 |
|------|--------|:------:|----------|
| `record.responseContent.text` | `content.js:286`（分类）、`formatter.js:201-202`（回退）、`panel.js:724`（阈值估算）、`capture.js:113`（写入） | confirmed | 异步回填必须写回**同一条** store 记录（引用一致），否则面板复制读到旧值 |
| `record.responseContent.size/encoding/mimeType` | `content.js:285,294-296`、`formatter.js:270`、`render.js`（列显示经 panel） | confirmed | `getContent` 返回的 `encoding` 需合并进记录，避免 base64 分支误判 |
| store 记录集合与 `subscribe` 事件 | `panel.js` 的 `requestRefresh`（`:656`）、`selection.onEvict`（`store.js:161`） | confirmed | 回填后需触发一次 UI 刷新，且不得打乱环形缓冲顺序/淘汰语义 |

### C 维 · 配置/部署影响

- 无新增配置键、环境变量、权限。`manifest.json` 权限集不受影响（`getContent` 属既有 `devtools.network` 能力）。→ `[cia_no_config]`

### D 维 · API/接口影响

| 接口 | 变化 | 确信度 |
|------|------|:------:|
| `chrome.devtools.network` HAR entry `getContent(cb)` | **新增消费**（设计登记为「备选」，修复后应升为常规路径） | confirmed（`design.md:319`） |
| Chrome 151+ 的 `getContent()` Promise 形式 | 可选；为兼容性应优先回调形式或做双形态兼容 | confirmed（官方文档） |
| `normalize()` 内部契约 | 若改为异步，需评估是否保持 `normalize` 纯同步（推荐：保持纯函数，异步获取另设 enrich 步骤），避免破坏现有单测与纯度设计 | confirmed |

---

## 9. 根因结论（机读）

```text
---RCA_START---
problem_slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
date: 2026-10-02
methodology: fix-rca
mode: hypothesis-driven

root_causes:
  - id: RC-1
    title: 捕获层未调用 harEntry.getContent()，仅同步读取 HAR response.content.text
    category: technical
    confidence: high
    evidence:
      - extension/src/capture.js:105-145 (normalize 仅读 content.text)
      - extension/src/capture.js:113 (responseText = content.text ?? null)
      - extension/src/capture.js:202-224 (捕获回调无异步补写)
      - official chrome.devtools.network docs: request content not provided in HAR; call getContent()
      - counter_experiment CE-1: getContent called? false; text=null; byteSize=395; placeholder=true
    chain: content.text missing -> responseContent.text=null -> classifyBody unavailable
           -> panel.js:138 t('content.unavailable') -> formatter outputs placeholder
  - id: RC-2
    title: 需求/设计把「HAR 无 content.text」定义为可接受降级边界，「同步读取」措辞与 getContent 异步 API 矛盾，且把 getContent 降级为「备选」
    category: process/design
    confidence: high
    evidence:
      - design.md:337 (content.text 缺失 -> 响应体不可用, confirmed)
      - design.md:319 (getContent 备选/不作为常规路径)
      - design.md:243 (ADR-003「捕获回调内同步读取」)
      - feasibility.md:77 (风险 R1 缓解仅「标注不可用」)
      - stories-written.md:156-158 / 497-500 (AC 期望即占位)
  - id: RC-3
    title: 测试样例恒带 content.text 且断言缺失时为 null，固化缺陷并掩盖真实数据形态
    category: test/process
    confidence: high
    evidence:
      - tests/capture.test.mjs:14-40 (makeFullEntry 恒有 content.text)
      - tests/capture.test.mjs:125-132 (断言 text===null)
      - tests/capture.test.mjs:200-241 (installCapture 桩无 getContent)
      - baseline: 123/123 pass 仍复现缺陷

excluded_hypotheses:
  - id: H2
    claim: classifyBody 误判非空正文为 unavailable
    reason: 非空文本返回 kind=text；真实输入为 null
    evidence: extension/src/content.js:286-292; tests/content.test.mjs; CE-2
  - id: H3
    claim: formatter 丢弃/覆盖响应体
    reason: formatter 忠实输出注入值；空串会整段省略不产占位
    evidence: extension/src/formatter.js:197-207,240-251; CE-3
  - id: H4
    claim: store 淘汰/冻结/别名导致正文丢失
    reason: 丢失点在 store.add 之前；单条无淘汰
    evidence: extension/src/store.js:127-163; capture.js:205,212
  - id: H5
    claim: getContent 已调用但异步竞态
    reason: 全仓无任何可执行 getContent 调用
    evidence: capture.js:105-145,202-224; capture.js:6 仅注释

impact_difficulty:
  - { id: RC-1, impact: P0, difficulty: D2, priority: HIGH }
  - { id: RC-2, impact: P0, difficulty: D1, priority: HIGH }
  - { id: RC-3, impact: P1, difficulty: D1, priority: HIGH }

cia:
  level: L3-cross-module
  dimensions: [A, B, D]
  A_callers: [capture.js:205, panel.js:131,155,156, tests/*]
  B_data: [responseContent.text, responseContent.encoding, store record identity + subscribe]
  C_config: none
  D_api: [harEntry.getContent (new consumption, promote to normal path)]

counter_experiments:
  - id: CE-0
    status: executed
    result: baseline 123/123 pass; defect reproduces
  - id: CE-1
    status: executed
    result: getContent not called; text=null; unavailable; placeholder true
    verdict: RC-1 PROVED
  - id: CE-2
    status: executed
    result: classifyBody(text non-empty) => kind=text
    verdict: H2 DISPROVED
  - id: CE-3
    status: executed
    result: formatter faithful; empty body omitted not placeholder
    verdict: H3 DISPROVED
  - id: CE-4
    status: deferred_to_fix_node
    result: real-browser char-level verification after fix
    verdict: pending
---RCA_END---
```

---

## 10. 移交说明（供 Mode plan / fix 节点消费）

1. **必达修复目标**：响应体数据通路必须在正文存在于浏览器时取到**完整、逐字符、不美化、不截断**的正文（含 401 等错误响应），占位文案仅保留给「客观无法获取/二进制省略」的合法场景。
2. **修复设计需回答的关键约束**（交 `02-solution-design` 展开）：
   - 异步 `getContent` 与「捕获即归一化、丢弃 entry 引用」的 `ADR-003` 内存约束如何共存（避免闭包/正文长期驻留）；
   - 回填时机与「用户可能在异步完成前点击复制」的竞态处理；
   - `content.encoding === 'base64'` 的合并与文本类 MIME 解码一致性；
   - 与 sec-audit R-01「大响应内存放大」风险的相容（不得无界驻留）。
3. **测试补齐要求**：必须新增（a）缺失 `content.text` + 提供 `getContent` 的路径用例；（b）`getContent` 异步/回调双形态；（c）base64 + 文本 MIME；（d）字符级保真；（e）401 错误响应体；（f）修正 `tests/capture.test.mjs:125-132` 的错误断言。
4. **文档修订**：`design.md` ADR-003 `:243`（同步→异步语义）、`:319`（备选→常规路径）、`:337`（降级矩阵）、`feasibility.md:77`、`stories-written.md:156-158/497-500` 的边界定义需同步更新，防止复发。
