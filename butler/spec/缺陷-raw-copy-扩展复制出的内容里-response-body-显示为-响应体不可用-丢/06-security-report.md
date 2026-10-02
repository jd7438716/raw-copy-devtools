verdict: WARN

---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
phase: ⑥ 安全审计（fix 管线 · 修复后复评）
agent: butler-sec-auditor
date: 2026-10-02
scope: changed
scope_definition: "changed = 本轮修复改动的文件（extension/src/store.js、extension/src/capture.js、extension/panel.js、extension/src/i18n.js + 4 个测试文件）；affected = 反向依赖面（store/capture/i18n 的消费者 panel.js、manifest 权限模型、dist 发行产物、DevTools HAR 数据接入面）"
scope_weight: medium
security_posture: WARN
predecessor: "butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/sec-audit.md（WARN；R-01/R-02 open）"
---

# 安全审计报告 · 复评 — Raw Copy 响应体 enrich 修复

## 0. 结论摘要

- **SECURITY_POSTURE: WARN**（不阻断；附风险说明 + 3 项建议修复）。
- **无高危 / 可利用漏洞**：本次修复未引入注入、提权、认证绕过、数据外传、命令执行、供应链污染、消息面（`onMessage`/`postMessage` 全库 0 命中）。
- **总体是安全面的净改善**：前次审计的 R-01（内存放大 / 本地 DoS）所建议的「捕获期字节预算」已在本轮落地，并有单测 + 独立探针证据。
- **WARN 的 3 个理由**（全部为「中/低、本地可控面」，非远程可利用）：
  1. **F-1（中·低可利用）热路径瞬时内存/CPU 放大**：新增的字节账本 `estimateRecordBytes` 在 `add`/`update` 中对每条正文执行 `new TextEncoder().encode(text)`，即**全量复制一份正文**。实测 32MB 正文使 `onRequestFinished` 内同步阻塞 **71ms**、瞬时峰值 ≈2×。这是**本轮新引入**的开销，且落在 DevTools 面板主线程。
  2. **F-2（中·已知设计取舍，放大）敏感信息驻留/剪贴板外流面扩大**：enrich 现在**无用户手势**地对每条「同步快照缺正文」的请求自动调 `getContent()` 取回**完整正文**（含 401/Auth/Cookie/Token/业务 PII），使 R-02 的暴露量级上升（性质不变：仍零网络、零落盘）。
  3. **F-3（中·发行纪律）发行包陈旧**：`dist/raw-copy-1.0.0.zip`（10:52）**早于**修复源码（11:57–11:58），解包核对确认**不含**本轮修复；版本号仍为 `1.0.0`。若直接分发，等于以旧版发行且**无版本标识区分**。

> 判定为 **WARN 而非 REJECT**：F-1/F-2 均为**本机用户可控面**（无第三方/远程攻击者可达路径），F-3 是发行流程项而非代码漏洞；全部既有控制项（零网络 / 最小权限 / 全 `textContent` / 零依赖 / ZIP 白名单）经机械证据复跑仍为 PASS。

---

## 1. Scope 与口径

### 1.1 本步口径

- **scope = changed**（用户显式指定；宪法 §34 默认口径的窄化）。**未做全库审计**。
- `changed`（本轮修复改动，逐文件人读）：
  `extension/src/store.js`、`extension/src/capture.js`、`extension/panel.js`、`extension/src/i18n.js`；
  测试面 `tests/{store,capture,enrich,i18n}.test.mjs`。
- `affected`（反向依赖面，按其消费关系定向核对）：
  - `store.js` → `capture.js`、`panel.js`、`tests/{store,enrich,capture}.test.mjs`；
  - `capture.js` → `panel.js`、`tests/{capture,enrich}.test.mjs`；
  - `i18n.js` → `panel.js`、`extension/panel.html`（`data-i18n*` 键集）、`tests/i18n.test.mjs`；
  - `manifest.json` 权限模型（**未改动**，但为发行面必需项，做只读核对）；
  - `dist/raw-copy-1.0.0.zip` 发行产物（**因源码已变而进入 affected**）。

### 1.2 未覆盖清单（INV-1 强制声明）

| # | 未覆盖项 | 原因 / 为什么可接受 |
|---|---------|-------------------|
| U-1 | **全库审计**（本次未做） | 用户显式指定 `scope=changed`。上一轮已对全库（S1–S5 五面 + 全部 11 个 `extension/**/*.js` + scripts + ZIP）做过 heavy 全量审计（`…/新建一个-chrome-edge-devtools-…/sec-audit.md`），本轮只审增量。**未复核的存量结论依赖上一轮证据，非本次独立复现。** |
| U-2 | **真机浏览器运行时验证**（Chrome/Edge 的 401 场景 E2E、`getContent` 真实回调时延、面板主线程卡顿实测） | 无 GUI 环境。→ `getContent` 的真实体量与耗时仅有单测桩 + Node 探针（U-2 使 F-1 的严重度存在±1 档不确定性）。TASK-009（butler-e2e-verifier）应补。 |
| U-3 | `extension/src/content.js` | 本轮**未改动**（仅核验，`04-execution-summary.md` §2 记为「核验，无需改码」）。本次只做只读复核（`classifyBody` 消费合并后的 `encoding` 成立），未重新做全量分类边界审计。 |
| U-4 | `tests/*.mjs` 的**测试替身真实性** | 单测使用自建 `getContent` 桩，不能证明 Chromium 真实实现的行为（回调时序、超时、内存）。 |
| U-5 | 商店分发 / `update_url` 自动更新通道 | manifest 无 `update_url`（与上一轮一致），无更新签名面可审。 |
| U-6 | OS 剪贴板层（其它进程读取） | 非扩展可控面。 |
| U-7 | 依赖漏洞扫描（OSV / npm audit） | 显式 N/A：零第三方依赖、无 lockfile、无 `node_modules`。**非「跳过」**。 |
| U-8 | 图标 PNG 二进制内容（隐写/像素级） | 低风险，不进发行包的必要审计面。 |

---

## 2. 变更面审计（逐文件）

| 文件 | 变更性质 | 安全影响判定 |
|------|---------|-------------|
| `extension/src/store.js` | +`update/bytesInUse/markPending/resolvePending/rejectPending/awaitPending`；+`maxBytes` 字节预算淘汰；+`estimateRecordBytes` | **改善**：R-01 缓解落地（内存有界）。**新增**：热路径 `TextEncoder` 全量复制（F-1）。**核对通过**：环形语义/`all()` 顺序未被破坏（`start=(head-count+cap)%cap` 在预算淘汰后自洽，探针 1 验证）；`notify` 订阅者抛错隔离保留；`update` 对未知 id 返回 `false` 且**不创建幽灵记录**；`enforceBudget` 循环单调递减（`count--` / `totalBytes--`）**必然终止**，无死循环。 |
| `extension/src/capture.js` | +`applyContent`（导出）/`fetchContent`（回调+Promise 双形态，10s 兜底）/`maybeEnrich`/有界并发队列 | **核对通过**：`normalize` **零改动**（纯同步契约保住）；`getContent` 异常/非字符串/永不回调 → 一律降级为 `{text:null}`，**绝不 reject、绝不抛**；回填前 `store.get(id) !== record` 防写陈旧对象；`onAdd`/`onUpdate`/`uninstall` 全部 `try/catch` 隔离，捕获热路径不被拖垮；`uninstall` 结算全部队列 pending（无悬空 Promise）。**新增暴露面**：`harEntry` 引用在 enrich 期间被持有（见 F-4）。 |
| `extension/panel.js` | `onUpdate` 接线；`subscribe` 处理 `update`/`evict`；`onCopyClick` pending → `awaitPending(3s)`；pending → `copy.fetchingTimeout` | **核对通过**：仍**全 `textContent`**（无 `innerHTML`/`eval`/`document.write`）；`confirmLargeCopy` 失败/异常不阻断主路径；`awaitPending` reject 分支给出明确提示且**不产出占位**；回填后重新 `getSelected()` 防选中断链。无新增权限、无新增网络/存储调用。 |
| `extension/src/i18n.js` | +`content.fetching`、`copy.fetchingTimeout`（zh/en 键集对齐） | **核对通过**：`t()` 使用**函数式 `replace` 回调**（非 `$&` 替换模式）→ 无替换模式注入；插值仅作用于可信字典文案；缺失键回退 key + `console.warn(key)`，**不打印请求内容**。新增键均为静态文案，**不含任何不可信数据插值**。 |

**净判定**：4 个改动文件均**未引入**任何新的不可信数据到**解释性/执行性**汇聚点（DOM 仍走 `textContent`，无日志、无网络、无存储）。

---

## 3. 五面攻击面核对（S1–S5）

| # | 面 | 适用性 | 本轮结论 |
|---|----|--------|---------|
| **S1** | 前端 / 扩展页 | ✅ 适用 | **PASS（附 F-1）**。不可信数据（URL/headers/body，含本次新增的 `getContent` 正文）全部经 `textContent` 写入；注入面 grep（`innerHTML|outerHTML|insertAdjacentHTML|document.write|eval(|new Function|javascript:|srcdoc`）**仅命中注释**。无动态构造正则（`new RegExp` 0 命中）→ 无 ReDoS。无 token 存储（零持久化）。**新增**：热路径 `TextEncoder` 全量复制（F-1，性能/内存面，非注入面）。 |
| **S2** | 后端 | ❌ N/A | 无后端、无 SW、无 content script、无消息面（`onMessage`/`externally_connectable`/`postMessage` 0 命中）。等价面 = `chrome.devtools.*`（`onRequestFinished` + HAR entry `getContent()`），**均不需要额外权限**，网页无法触达。**权限模型未变**：`permissions === ["clipboardWrite"]`（`check-manifest` 17/17）。 |
| **S3** | 桌面 | ❌ N/A | 无 sidecar / 端口 / updater / 安装钩子。 |
| **S4** | 供应链 | ✅ 适用 | **PASS**。依赖集**未变**（零第三方依赖、无 lockfile、无 `node_modules`）；全部 import 为相对路径；本轮未新增任何外部代码或包。 |
| **S5** | 部署 / 发行 | ✅ 适用 | **WARN（F-3）**。源码已变而 `dist/raw-copy-1.0.0.zip` 未重打包，解包核对确认**不含**修复（`grep -c "maybeEnrich\|markPending"` = 0，`grep -c "onUpdate\|awaitPending"` = 0）；`version` 仍 `1.0.0` → 无版本区分，**发行产物与源码不一致**。ZIP 白名单/黑名单机制本身未变、未发现开发期文件或密钥混入。 |
| **AI/LLM** | 横切 | ⚠️ 相关 | 无 AI 集成；**反向**提示注入面（R-04/RISK-LLM-INJ-01）**不变**：修复只是让更多正文（含 401）进入复制输出，**扩大了间接提示注入的载体数量**，扩展侧按 REQ-020 保真契约不改写。 |

---

## 4. THREAT_MODEL (STRIDE)

| 威胁 | 风险 | 评估 |
|------|:----:|------|
| **Spoofing**（伪装） | 🟢 低 | 无认证面。面板仅由 DevTools 上下文创建，网页不可伪造。`getContent` 由 Chromium 注入，**不是**网页可提供的对象（网页无法伪造 `harEntry`）→ **未引入伪造源**。 |
| **Tampering**（篡改） | 🟢 低 | 扩展仍为**只读消费者**：不修改页面请求/响应，不写任何存储。新增 `store.update` 仅原地合并**自己**的记录对象，`Object.assign` 的 patch 来源为内部构造（`{responseContent}`），**非不可信输入** → 无原型污染可达路径。 |
| **Repudiation**（抵赖） | 🟢 低 | 无多用户/业务事务/审计要求。 |
| **Information Disclosure**（信息泄露） | 🟡 **中** | **F-2（放大，非新增）**：enrich 使「同步缺正文」的请求（含 401 登录响应、错误页）被**自动**取回完整正文并驻留内存（≤1000 条 / ≤64MB）与可能进入剪贴板。仍**零外传**（`check-zero-network` 17/17 PASS）、**零落盘**、无请求内容落日志。缓解：`maxBytes` 预算（本轮新增，限制驻留量）；`privacy.html` 警示；仅 `clipboardWrite` 权限。 |
| **Denial of Service**（拒绝服务） | 🟡 **中** | **R-01 已显著缓解**：字节预算 64MB + 淘汰最旧（探针 1：`capacity=1000, maxBytes=8MB` 下写入 20×2MB 后 `bytesInUse=6,291,843 ≤ 8MB`，`size()=3`）；enrich 并发上限 4 + 队列上限 200 + 单次 10s 兜底 → 有界。**残余 F-1**：字节账本本身在 `add`/`update` 同步做 `TextEncoder` 全量复制（实测 32MB → **71ms** 主线程阻塞 + 瞬时 ≈2× 峰值），属**新引入**的本地卡顿放大面。**残余 F-4**：字节预算**不覆盖**队列中 `/` 在飞的 `harEntry` 引用（≤204）与 `pending` Promise 的瞬时正文。均**限本机**，页面本身不受影响。 |
| **Elevation of Privilege**（提权） | 🟢 低 | `permissions === ["clipboardWrite"]`（未变，`check-manifest` 17/17）；无 `host_permissions`/`<all_urls>`/`tabs`/`webRequest`/`content_scripts`/`background`。本轮**未新增任何权限或 Chrome API 面**（`getContent()` 属 HAR entry 方法，非需授权 API）→ 提权面**零增长**。 |

---

## 5. AUTH_CHECK

| 项 | 结果 |
|----|------|
| authentication | **N/A** — 无用户/账号/服务认证面。 |
| authorization | **N/A（等价物 = 扩展权限模型）** — 仅 `clipboardWrite`，未变；发行 ZIP 门禁对 permissions 做白名单断言。 |
| principal_guard | **not-needed** — 无跨主体调用、无消息总线、无 `externally_connectable`。唯一主体 = 用户在本机 DevTools 内的显式点击。**注意**：`getContent` 的 enrich 是**无手势的自动动作**，但它只发生在本机 DevTools 面板上下文内读取**本机已发生的**网络数据，不构成跨主体的授权越界。 |

---

## 6. DATA_SECURITY

| 项 | 结果 |
|----|------|
| sensitive_fields | `Authorization`、`Cookie`、`Set-Cookie`、`Proxy-Authorization`、请求/响应体中的 Token/密码/API Key、URL query 凭证、业务 PII。**扩展不分类、不脱敏**（REQ-020 禁止字符改动，有意取舍）。**本轮变化**：此类正文的**取回率显著上升**（原「缺正文→占位」，现「缺正文→自动 getContent 取回」）。 |
| encryption_at_rest | **not applicable / not needed** — 零持久化（无 storage/localStorage/indexedDB），仅内存，关闭即销毁。 |
| encryption_in_transit | **N/A** — 零网络代码（`check-zero-network` 17/17 PASS，含「扫描文件数 0 → FAIL」的反空跑探针）。 |
| secret_handling | **合规** — 改动文件内无硬编码密钥/令牌/私钥；`console` 仅告警键名与隐私链接失败信息，**不含任何请求内容**。无密钥需轮换。 |

---

## 7. COMPLIANCE

| 项 | 结论 |
|----|------|
| **OWASP Top 10 (2021)** | A03 Injection ✅ 无（全 `textContent`；无动态正则；`t()` 用函数式 replace 回调）；A05 Security Misconfiguration ✅ 无（未改 manifest/CSP；仍无内联脚本）；A08 Integrity ✅（零依赖；ZIP CRC 读回）；A09 Logging ✅（无请求内容落日志）；A04 Insecure Design ⚠️ 见 F-1（新引入的热路径全量复制）。A01/A02/A06/A07/A10 不适用。 |
| **OWASP LLM Top 10** | 仅下游间接相关（LLM01 间接提示注入）：**载体数量因 F-2 上升**，扩展侧不改写（保真优先）→ 维持 RISK-LLM-INJ-01。 |
| **GDPR / PII** | **不涉及**（不收集、不存储、不传输；仅本机内存 + 用户主动剪贴板）。`privacy.html` 声明与代码一致。 |
| **PCI-DSS** | 不适用。 |
| **Chrome Web Store 政策** | 权限最小化未变 → 仍符合「单一用途 + 最小心权限 + 数据使用披露」；**但需同步隐私政策**：F-2 后「取回正文的范围」扩大，`privacy.html`/`USAGE.md` 若有「仅在同步快照含正文时」之类限定表述需核对（本轮未审 USAGE/privacy 文案与实现的语义一致性 → 计入 U-1）。 |

---

## 8. 新发现（findings）

### F-1 🟡 中 · 本地 DoS 放大 — 热路径 `TextEncoder` 全量复制正文（**本轮新引入**）

- **位置**：`extension/src/store.js:92-114`（`utf8ByteLength`）→ 被 `estimateRecordBytes`（`:125-148`）调用 → 由 `add()`（`:505`）与 `update()`（`:553`）调用。即落在 `capture.handleRequestFinished` → `store.add` 的**同步热路径**上。
- **问题**：`new TextEncoder().encode(text)` 对正文做**一次性全量字节化**，为**每条记录**再分配一份与正文等长的临时 `Uint8Array`；`update()` 回填时**再算一次**。
- **证据（Node 探针，本步复跑）**：32MB 正文 `store.add` 同步耗时 **71ms**，计入 `bytesInUse = 33,554,561`。
  → 换算 ≈ **2.2 ms / MB** 主线程阻塞 + 瞬时 ≈**2× 内存峰值**。默认 64MB 预算下，单条上限 64MB 正文 → 单次 add 约 **140ms** 主线程卡顿。
- **影响**：DevTools 面板主线程卡顿（本地、用户可控面）；放大 R-01 的瞬时峰值。**非远程可利用**、不导致数据泄露。
- **修复建议（具体到改动）**：
  1. **[推荐]** 用**廉价上界**替代精确字节化：`bytes += text.length * 3`（或 `text.length` 当正文为 Latin-1），把账本变为 O(1)、零分配；仅在需要精确值的路径保留 `TextEncoder`。
  2. 或把 `estimateRecordBytes` 的结果**缓存到记录上**（如 `record.__bytes`，`update` 时按差异增量修正），避免重复全量计算。
  3. 或把字节入账改为**异步/分片**（`requestIdleCallback`），但会削弱预算的即时性 → 次选。
- **验证方法**：新增单测断言「`add(32MB)` 的同步耗时不随正文线性增长（如 <5ms）」，或断言 `estimateRecordBytes` 不再调用 `TextEncoder`（spy）。

### F-2 🟡 中 · 信息泄露面放大 — 无手势自动取回全量正文

- **位置**：`extension/src/capture.js:426-473`（`maybeEnrich` 自动触发）。
- **问题**：`maybeEnrich` 对**每一条**「同步快照缺正文」的请求自动调 `getContent()`，**无需用户选中/点击**。修复前这类请求只保留元信息；修复后其**完整正文**（含 401 登录响应、含 Token/PII 的错误体）进入内存驻留（≤64MB/1000 条）并成为剪贴板候选。
- **性质**：这是**本次缺陷修复的必然代价**，且 `02-solution-design.md:264` 已将其登记为「中」风险并接受（缓解：复制前大响应确认 + 字节预算 + 零网络 + 不落盘）。
- **判定**：**非新漏洞**，属**已登记 R-02 的暴露量级上升**；不可远程利用；仍是本机用户可控面。
- **建议**：① 落地前次审计的 R-02 缓解项 1（敏感内容**复制前**二次确认，命中 `Authorization|Set-Cookie|Cookie|token=|api[_-]?key|bearer ` 时 `confirm`，文案走 i18n 新键 `copy.sensitiveWarning`，**不改写正文**）；② `USAGE.md`/`privacy.html` 明确「扩展会在后台补取响应正文（含错误响应）」，保持披露与实现一致。

### F-3 🟡 中 · 发行纪律 — `dist/` 发行包陈旧且无版本区分

- **位置**：`dist/raw-copy-1.0.0.zip`（mtime 10:52）vs 修复源码（11:57–11:58）；`extension/manifest.json` `version` 仍 `1.0.0`。
- **证据（本步复跑）**：解包至临时目录后 `grep -c "maybeEnrich|markPending" src/{store,capture}.js` = **0**；`grep -c "onUpdate|awaitPending" panel.js` = **0** → **ZIP 内不含本轮修复**。
- **影响**：若以此 ZIP 发行/送审，用户拿到的是**未修复版**且版本号不区分（`1.0.0` vs `1.0.0`）→ 无法用版本号判断是否含修复；破坏「发行产物 == 受审源码」的可追溯性。
- **建议（PRESHIP 阻断项，非代码改动）**：① 修复合并后**重跑 `scripts/package.mjs`** 重打包；② 提升 `manifest.json` `version`（如 `1.0.1`）并同步 `package.json` / ZIP 文件名；③ 在打包门禁中加一条**一致性断言**：ZIP 内 `src/capture.js` 必须包含 `maybeEnrich` 等修复标识（或改为按源码哈希比对）。
- **验证方法**：`node scripts/package.mjs` 后重复本报告 §9 的解包 grep，三项计数均 > 0。

### F-4 🟢 低 · 内存预算口径外仍有未计账驻留（残余）

- **位置**：`capture.js:385`（`queue`，含 `harEntry` 闭包引用）、`:383`（`inFlight`）、`store.js:226`（`pending` Map）。
- **问题**：`maxBytes` 只对**已入账的记录正文**生效；enrich 队列（≤200）+ 在飞（≤4）持有的 `harEntry`（可能连带响应体）、`pending` 的 Promise、以及 `getContent` 取回但**尚未 `update` 入账**的瞬时正文，均在预算口径之外。
- **判定**：**明确有界**（≤204 + ≤1000 pending，10s 兜底释放），与设计的 C-3/C-6 自述一致；属**残余**而非缺陷。仅在接受并发上限/队列上限绝对值即总内存上界的前提下可接受。
- **建议**：把「队列上限 × 单条正文上界」写入设计文档作为**显式内存上界**；可选：对 `getContent` 结果先做**长度上界判断**（超 `maxBytes` 直接降级为占位，不再入账）。

### F-5 🟢 低 · 超预算单条记录静默自淘汰

- **证据（探针 2）**：`capacity=10, maxBytes=1024` 下写入单条 4096B 正文 → `size()=0`、`bytesInUse()=0`（记录刚入账即被 `enforceBudget` 淘汰自身）。
- **影响**：默认 64MB 预算下仅影响 **>64MB 的单条正文**；表现为列表/复制目标消失（`selection.onEvict` 已联动清选中），用户侧仅能通过选中被清除间接感知，**无明确文案**。
- **判定**：`04-execution-summary.md` §6.4 已自述为「有界优先」的既有取舍 → **已知行为，非漏洞**。建议：超单条预算时给 `content.unavailable` 类明确提示（i18n 新键），避免「静默消失」体验。

---

## 9. 机械证据（本步复跑）

| 命令 / 探针 | 结果 |
|------|------|
| `node --test "tests/**/*.test.mjs"` | **PASS 145/145，fail 0**（含 `maxBytes` 淘汰、pending 三路径、enrich 双形态/竞态/字符级保真） |
| `node scripts/check-syntax.mjs` | **PASS 11/11** |
| `node scripts/check-manifest.mjs` | **PASS 17/17**（`permissions === ["clipboardWrite"]`；无 host/tabs/webRequest/content_scripts/background） |
| `node scripts/check-zero-network.mjs` | **PASS 17/17**（无 fetch/XHR/WebSocket/sendBeacon/chrome.storage/遥测） |
| `butler_sec_scan`（store.js / capture.js / panel.js / i18n.js / content.js） | **R1–R11 全 PASS**（5/5 文件） |
| grep 注入面（`innerHTML\|eval(\|new Function\|document.write\|javascript:\|srcdoc`） | 仅 **2 处注释**命中 → 无实际使用 |
| grep 动态正则 / 消息面（`new RegExp` / `onMessage\|postMessage`） | **0 命中** |
| grep `TextEncoder` 使用点 | 3 处（`store.js:97`、`capture.js:182`、`content.js:134`）→ F-1 定位 |
| 探针 1（字节预算上界） | `capacity=1000, maxBytes=8MB`，写入 20×2MB → `size=3`，`bytesInUse=6,291,843 ≤ 8MB` ✅ |
| 探针 2（单条超预算） | 单条 4096B / 预算 1024B → `size=0`（自淘汰）→ F-5 |
| 探针 3（pending 有界） | `capacity=2` 下 markPending 5 条 → 存活 pending = **2** ✅（随淘汰/clear 结算，无泄漏） |
| 探针 4（热路径成本） | 32MB 正文 `store.add` 同步 **71ms**，`bytesInUse=33,554,561` → F-1 |

---

## 10. RISK 登记表状态机（Step 5.4 闭环）

| RISK | 前次状态 | 本轮状态 | 依据 |
|------|---------|---------|------|
| **RISK-MEM-01**（R-01 内存放大） | open | **fixed**（代码侧已落地，待真机 verified） | 字节预算 `maxBytes`(64MB) + 淘汰最旧 + `bytesInUse` 已实现；单测 + 探针 1 验证有界。真机内存曲线仍待 TASK-009（U-2）。 |
| **RISK-MEM-02**（F-1 热路径全量复制） | — | **open**（新登记，中） | 见 F-1；建议按 F-1 修复建议 1/2 落地后转 fixed。 |
| **RISK-MEM-03**（F-4 预算口径外驻留） | — | **open**（新登记，低） | 见 F-4；有界，建议文档显式化上界。 |
| **RISK-EXFIL-01**（R-02 剪贴板敏感信息） | open | **open（暴露量级 ↑）** | F-2；性质不变，缓解项未落地。 |
| **RISK-OPEN-01**（`window.open` 缺 noopener） | open | **open（未变）** | 非本轮改动文件；`target` 仍取自静态 `href`，无可利用面。 |
| **RISK-LLM-INJ-01**（间接提示注入） | open | **open（载体数量 ↑）** | F-2 派生；扩展侧按保真契约不改写。 |
| **RISK-DEPLOY-01**（F-3 发行包陈旧） | — | **open**（新登记，中·发行纪律） | 见 F-3；PRESHIP 阻断项。 |

> 状态变更 changelog：`2026-10-02 RISK-MEM-01 open→fixed`；`2026-10-02 RISK-MEM-02/03/DEPLOY-01 新登记(open)`；`2026-10-02 RISK-EXFIL-01/LLM-INJ-01 暴露量级↑（status 不变）`。

---

## 11. MITIGATIONS（按优先级）

| # | 优先级 | 动作 | 落点 | 验证 |
|---|:----:|------|------|------|
| M-1 | **P1** | 重打包 + 提升版本号，使发行产物含修复且可区分 | `scripts/package.mjs`、`extension/manifest.json`(`version`)、`package.json` | 解包后 `grep maybeEnrich` > 0；version ≠ 1.0.0 |
| M-2 | **P1** | 消除热路径全量字节化（O(1) 上界或结果缓存） | `extension/src/store.js` `utf8ByteLength`/`estimateRecordBytes` | 单测：32MB `add` 同步耗时 <5ms |
| M-3 | **P2** | 敏感内容复制前二次确认（不改写正文） | `extension/panel.js` `onCopyClick` + `i18n.js` 新键 `copy.sensitiveWarning` | 单测：命中 `Authorization`/`Set-Cookie`/`token=` → `confirm` 返回 false 时不调用 `copyText` |
| M-4 | **P2** | `window.open` 补 `noopener`；`USAGE.md`/`privacy.html` 披露「后台补取正文」 | `extension/panel.js:880`、文档 | 静态 grep |
| M-5 | **P3** | 超单条预算时给出明确文案而非静默消失；文档显式化「队列上限 × 单条上界」内存上界 | `extension/src/capture.js`/`store.js`/`02-solution-design.md` | 单测 + 文档评审 |

---

## 12. RECOMMENDATION

**WARN — 不阻断本轮修复 run。** 本次修复在安全面是**净改善**：前次审计 R-01 建议的「捕获期字节预算」已落地并有单测 + 探针双重证据，未新增任何权限、网络、存储或消息面，注入面机械复扫全 PASS。WARN 的三项来源均属**本机可控面 / 发行纪律**：F-1（新引入的热路径全量字节化，实测 32MB→71ms 主线程阻塞）、F-2（自动取回全量正文使用户可控的敏感驻留/剪贴板暴露量级上升，设计已登记接受）、F-3（`dist/` 发行包不含修复且版本号无区分）。**建议在发布门（PRESHIP）前完成 M-1（重打包 + 版本号）与 M-2（热路径成本）**；M-3/M-4 建议在 1.0.x 内落地。真机运行时验证（U-2）完成前，本报告的 `security_posture` 保持 WARN。

---

## 13. 知识库写回（Step 5.3/5.5）

- 本步已写：`butler/domain/security.md`（RISK 登记表：RISK-MEM-01/02/03、RISK-DEPLOY-01、RISK-EXFIL-01、RISK-OPEN-01、RISK-LLM-INJ-01）。
- 本步已写：`butler/project/security-constraints.md`（项目专属约束 + PRESHIP 跟踪项）。
- 本步已写：`butler/learned/sec-auditor.md`（Round 记录）。
- 本步已写：`butler/memory/security-audit-fix-responsebody.md`（本次审计记忆）。
- 通用 pattern 候选（待跨项目二次命中后升级）：**「字节/大小账本自身成为热路径放大面」** —— 反直觉点：为限制内存而新增的度量代码，若用 `TextEncoder().encode()` 全量复制做精确计量，会以「2× 瞬时峰值 + O(n) 主线程阻塞」回补风险。
