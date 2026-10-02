verdict: WARN
---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
date: 2026-10-02
task: TASK-019
agent: butler-sec-auditor
scope: changed ∪ affected
scope_weight: heavy（S1 全量人读 + S5 发行门 + 新增攻击面专审）
security_posture: WARN
covers: REQ-018 REQ-019 REQ-020 REQ-021 AC-012 AC-013 AC-016
---

# 独立安全审计报告 — Raw Copy 1.1.0（增强里程碑 · 新增攻击面 + 安全/运维门禁）

> 执行者：butler-sec-auditor ｜ 任务：TASK-019 ｜ 日期：2026-10-02
> 被测发行面：`extension/**`（15 个 .js + 3 个 .html + manifest + css）＋ `scripts/*.mjs` ＋ `dist/raw-copy-1.1.0.zip`
> **只读审计**：未改动任何业务代码（`extension/**`）/ 测试（`tests/**`）/ 门禁脚本（`scripts/**`）/ `butler/file-registry.md`。
> 唯一写操作：按 TASK-019 S5 授权复跑 `node scripts/package.mjs` 重新生成 `dist/raw-copy-1.1.0.zip`（**构建产物**，非源码），前后 sha256 与原因见 §7.1 / §11。

---

## 0. 结论摘要

**SECURITY_POSTURE: WARN**（不阻断发布；需显式接受 3 项中风险 + 落地 4 项建议修复）。

- **无高危 / 无可利用漏洞**。未发现注入、代码执行、提权、数据外传、命令执行、供应链污染、越权调用类问题。
- **本次增强的全部硬门禁均通过机械证据复跑验证**：AC-012（最小权限）/ AC-013（零网络）/ AC-016（体积+零依赖）/ REQ-018（MV3）/ REQ-019（零依赖）/ REQ-020（最小权限）/ REQ-021（零网络）**逐条 PASS**。
- **新增攻击面的静态结论全部成立**：全库 `chrome.contextMenus` == **0**；`innerHTML`/`eval`/`new Function` == **0**；不可信文本一律 `textContent`；发行 ZIP 剥离注释后的实际载荷中连上述字面量都不存在（见 §6.6）。
- **WARN 的四个实质理由**（均为**本地 / 用户显式触发 / 文档与发行完整性**性质，不构成对远程攻击者的可利用面）：

| # | 等级 | 发现 | 处置 |
|:-:|:----:|------|------|
| **F-01** | 🟡 中 | `RISK-EXFIL-01` 仍 `open`，且**被多选批量复制放大**：一次点击可把 N 条记录的凭证同时压入系统剪贴板，无复制前敏感探测 | 本轮接受 + 给出缓解（§10.1） |
| **F-02** | 🟡 中 | **新增**：批量复制**无总量门禁**（每记录阈值 10MB 对批总量无效）。实测 60×50KB → 2.95MB 静默入剪贴板、含 60 份 `Cookie` | 记录 `RISK-MEM-02`，给出缓解（§10.2） |
| **F-03** | 🟡 中 | **新增**：明细抽屉对不可信原文**无体积门禁**（复制路径有 confirm，明细路径没有）；双开一条超大正文可致面板长时间卡顿 | 记录 `RISK-DOS-01`，给出缓解（§10.3） |
| **F-04** | 🟠 中（发行完整性） | **发行包与源码不一致**：`dist/*.zip`（13:11 构建）落后于 13:38 的 `panel.js` 修复；`test-results.md` 声称的可复现 sha256 已被证伪 | 本轮已重建并通过 CRC 读回（§7.1） |

- 另登记 2 项低风险（P2 分段裁剪边界可被不可信正文伪造 / 隐私声明与增强后行为不一致）+ 3 项信息项（门禁覆盖缺口 / 注释字面量 / 下游 LLM 间接注入）。

> **判定为 WARN 而非 REJECT**：全部控制项（权限最小化 / 零网络 / 零持久化 / 文本节点写入 / 零依赖 / 白名单打包 / CRC 读回）均经机械证据 + 全量人读双重验证通过；F-01..F-04 均为**本地用户可控面或文档-发行一致性问题**，不存在"第三方页面 → 扩展"或"扩展 → 远端"的可达路径。按 §0 验收口径「无高危/可利用漏洞；中风险显式给出接受与缓解路径」→ **WARN 合规**。

---

## 1. Scope（审计范围）与口径

### 1.1 本步口径

- **scope = changed ∪ affected**（宪法 §34）。仓库**非 git 仓库**（`git rev-parse` → `fatal: not a git repository`）→ 无 `git diff` 基线，**changed = 本增强里程碑的全部交付物 + 上一里程碑的发行面**。
- **weight = heavy**：S1 全量人读（含 1927 行 `panel.js`）+ S5 发行门（PRESHIP）+ 4 项新增攻击面专审 → 允许的扩大范围。
- 判定依据：`file-registry.md` §1a-9..15（增强登记）+ 磁盘实际文件核对 + mtime 时序重建。

### 1.2 已审计（changed，逐文件）

| 面 | 文件 | 方式 |
|----|------|------|
| S1 扩展页 | `extension/panel.html`（168 行）、`panel.js`（1927 行）、`styles/panel.css`（534 行） | **全量人读** + `butler_sec_scan` + `check-panel-shell`（34/34） |
| S1 新增模块 | `src/contextmenu.js`（276）、`src/detail.js`（225）、`src/multiselection.js`（480）、`src/bulkformatter.js`（117） | **全量人读** + `butler_sec_scan` |
| S1 复核模块 | `src/{store,capture,clipboard,i18n,content,formatter,render,filter,selection}.js` | 定向人读（字节预算 / enrich 队列 / 剪贴板降级 / `t()` 插值 / `classifyBody` 阈值） |
| S2 权限/清单 | `extension/manifest.json`（14 行） | 全量人读 + `check-manifest`（17/17）+ **独立顶层键枚举**（§6.1） |
| S4 供应链/构建 | `scripts/{check-syntax,check-manifest,check-zero-network,check-panel-shell,package}.mjs`、`package.json` | 全量人读 + 全部复跑 + 门禁覆盖缺口评估（§6.7） |
| S5 发行产物 | `dist/raw-copy-1.1.0.zip`（42622 B / 25 条目） | `package.mjs` 复跑 + **独立 EOCD/中央目录/inflate/CRC32 复算**（§6.6） |
| 受影响面 | `extension/privacy.html`（207 行）、`LICENSE`、`devtools.{html,js}` | 定向人读（声明一致性 / 外链 / 权限使用） |

### 1.3 affected（反向依赖面）

| 触发点 | 受影响面 | 结论 |
|--------|----------|------|
| 新增面板内自绘菜单（ADR-013） | 权限模型、manifest、企业策略 | 零新权限；`permissions` 未变（唯一字节变化 = `version` 1.0.0→1.1.0） |
| 新增多选批量复制 | **OS 剪贴板（跨进程共享）**、批次数据量 | **放大面**，见 F-01 / F-02 |
| 新增明细抽屉渲染不可信原文 | 面板渲染性能、DOM 文本节点 | 注入面 PASS（textContent）；**体积门禁缺失**，见 F-03 |
| P2 分段裁剪（`extractSectionText`） | 「仅请求/仅响应」产物完整性 | **边界可被不可信数据影响**，见 F-04 |
| 打包期注释剥离（TASK-011/012 rework） | 发行载荷、可读性、`node --check` 前置门禁 | 剥离后无语法错误；**载荷更干净**（连注释里的 `contextMenus` 都不再进包） |
| 无持久化 → 无数据生命周期迁移 | — | N/A |

---

## 2. 五面攻击面表（S1–S5 + AI/LLM 横切）

| # | 面 | 适用性 | 核对结果 |
|---|----|:------:|----------|
| **S1** | 前端 / 扩展页 | ✅ 适用 | **PASS**。① 全部不可信数据（URL / headers / body / HAR 字段）经 `textContent` 写入：`renderRow`（`panel.js:543-550`）、`applyI18n`（:350-368）、菜单项 `btn.textContent = t(...)`（:1533）、`#detail-body`（`detail.js:164`）、Toast（`panel.js:387`、`clipboard.js:249`）。② `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`srcdoc`/`javascript:` **0 处实际使用**（仅 2 处注释提及）。③ 无 `eval` / `new Function` / 字符串化定时器。④ **无动态正则**（`i18n.t()` 用静态 `/\{(\w+)\}/g` + 函数式 replace 回调 → 无 `$&` 替换注入、无 ReDoS；`contextmenu.INT_RE` 为静态字面量）。⑤ 无 token 存储（零持久化）。⑥ CSS 无 `url()` / `@import` / `expression()`（不可外联、不可执行）。⑦ 菜单项 `id`/`data-action` 来自静态常量表 `CTX_ITEM_ID`/`CTX_ACTION`，非不可信值。⑧ 菜单位置经 `clampPosition` 规整为有限数后才写入 `style.left/top`（无 CSS 注入面）。 |
| **S2** | 后端 | ❌ **N/A** | 无后端、无服务器、无 SW。等效「后端面」= Chrome API 使用面，**仅 4 个入口**：`chrome.devtools.panels.create`（`devtools.js`）、`chrome.devtools.network.onRequestFinished.addListener/removeListener`（`capture.js`）。**无** `onMessage` / `externally_connectable` / `postMessage` / `runtime.connect` / `web_accessible_resources` → **无远程可达面**。 |
| **S3** | 桌面 | ❌ **N/A** | 非桌面应用：无 sidecar、无端口绑定、无 updater（`update_url` 缺失 → 亦无自动更新签名面）、无安装钩子、无资源目录读写。 |
| **S4** | 供应链 | ✅ 适用 | **PASS**。`dependencies`/`devDependencies`/`optionalDependencies` 全为 `null`；无 lockfile、无 `node_modules`；全部 import specifier 为相对路径（打包期审计 `third-party deps = 0`，15 个 .js）；dev 脚本仅 `node:*` 内置模块。**缺口（低）**：无 CI 依赖审计流水线（零依赖下无实际影响）；门禁脚本自身未过 `butler_sec_scan`（开发期工具，不进发行包）。**供应链载荷更干净**：剥离注释后 zip 内不存在 `fetch(` / `XMLHttpRequest` / `contextMenus` / `chrome.storage` / `chrome.tabs` / `innerHTML` / `eval(` 任何字面量（§6.6 独立复核）。 |
| **S5** | 部署 / 发行 | ✅ 适用（弱） | **PASS（含 1 项发行完整性缺陷，已修）**。发行形态 = 本地 `load unpacked` / ZIP，无服务器/数据卷/反代/生产 SSH 面。白名单 = `extension/**` + `LICENSE`；黑名单排除 `butler/ tests/ docs/ scripts/ .refs/ .opencode/ req.txt INSTALL.md USAGE.md package.json`；**独立**解析 EOCD + 中央目录 + inflate + CRC32 复算 → 25 条目全部 CRC 通过、无非发行条目、`manifest.json` 于根、无 `extension/` 前缀、无目录条目、EOCD 无注释。**F-04**：审计开始时 zip 落后于源码（§7.1）。 |
| **AI/LLM** | 横切 | ⚠️ 相关（信息项） | 无 AI 集成。**反向面**：产物是「喂给 AI 的文本」，被复制的原文可能含针对下游 LLM 的间接提示注入指令。按 REQ-020 保真契约扩展侧**不应也无法**改写（`RISK-LLM-INJ-01`，继承上一里程碑，未恶化）。 |

---

## 3. THREAT_MODEL（STRIDE）

| 威胁 | 风险 | 评估 |
|------|:----:|------|
| **Spoofing**（伪装） | 🟢 低 | 无认证面、无身份、无消息来源。面板仅由 DevTools 上下文创建；无 `externally_connectable`/`onMessage` → **网页无法伪造面板或调用扩展**。菜单为自绘 DOM，与浏览器原生菜单无可混淆的信任语义（且 `role="menu"` 语义正确）。 |
| **Tampering**（篡改） | 🟡 低-中 | 扩展是**只读消费者**（只读 HAR，不改页面请求/响应，不写存储）。复制文本逐字符保真由冻结 `formatter.js` + 单测锁定。**唯一新增篡改面 = F-04**：P2 分段裁剪的段边界由**字符串搜索**决定，正文内伪造 `===== RESPONSE =====` 可直接改变裁剪结果（已实测复现，§6.5）。**影响限于「裁剪产物」**，模式 A 完整产物（主路径 AC-002）不受影响；不构成代码执行或跨记录数据污染。 |
| **Repudiation**（抵赖） | 🟢 低 / N/A | 无多用户、无业务事务、无审计要求（设计 §8：无服务器无持久化 → 无审计日志需求）。 |
| **Information Disclosure**（信息泄露） | 🟡 **中** | **F-01 + 放大**。完整请求/响应（含 `Authorization` / `Cookie` / `Set-Cookie` / Token / PII）落入系统剪贴板；增强后**一次点击可同时写入 N 条**（实测 60 条 × 含 `Cookie: session=SECRET-i` 全部进入同一剪贴板文本，§6.5）。扩展自身**零外传**（§6.3）；无 storage / localStorage / indexedDB / 遥测；`console` 仅输出面板注册与告警，**不含任何请求内容**（唯一日志面 = `[E_PRIVACY_OPEN_FAILED]` / `[E_I18N_MISSING_KEY]`，均不含数据）。残余风险 = 用户后续粘贴行为 × OS 剪贴板共享 × 批次放大。已有缓解：`privacy.html` 敏感信息警示 + 权限仅 `clipboardWrite` + 大响应 confirm（**但批量总量无门禁**）。 |
| **Denial of Service**（拒绝服务） | 🟡 **中（已显著收敛）** | **`RISK-MEM-01` 已落地缓解并经独立复现**：`store` 新增 `maxBytes`（默认 `DEFAULT_MAX_BYTES = 64MB`）+ `bytesInUse()` + 字节优先淘汰（`store.js:26/125-148/313-326/505-510/542-558`）；`capture` 新增有界 enrich 队列（`MAX_CONCURRENT_ENRICH=4`、`MAX_ENRICH_QUEUE=200`、`ENRICH_FETCH_TIMEOUT_MS=10000`，超限 `enqueue-overflow` 降级，**不再无界驻留 HAR entry**）。**独立探针 A 实测**：连续 `add` 200 × 1MB → `size()=63`、`bytesInUse()=63.01MB ≤ 64MB` ✅。→ 捕获期内存放大**已被预算封顶**，且单条超预算记录会被立即淘汰（不会驻留）。**新增残余（F-02/F-03）**：① 批量复制的**输出字符串与剪贴板载荷**无总量门禁（源数据受 64MB 约束，故有上界，但瞬时约 2× 且静默）；② 明细抽屉渲染超大正文无 confirm，可造成面板长时间布局卡顿。两者**均限于本地面板，需用户显式操作**，页面本身不受影响。 |
| **Elevation of Privilege**（提权） | 🟢 低 | 权限最小化经机械 + 独立枚举双重验证：`manifest.json` 顶层**仅 7 键**（`manifest_version/name/version/description/devtools_page/permissions/icons`），`permissions === ["clipboardWrite"]`。**全部高风险键 absent**：`host_permissions`、`optional_permissions`、`optional_host_permissions`、`tabs`、`webRequest`、`declarativeNetRequest`、`content_scripts`、`background`、`externally_connectable`、`web_accessible_resources`、`update_url`、`content_security_policy`、`sandbox`、`key`。**关键**：无 content script + 无 host 权限 → 扩展无法接触页面 DOM，网页也无法调用扩展，**双向隔离**。ADR-013 硬约束（任何 `chrome.contextMenus` = REJECT）已由"全库 0 命中 + 发行载荷 0 命中"双侧落实。 |

---

## 4. AUTH_CHECK / DATA_SECURITY / COMPLIANCE

### 4.1 AUTH_CHECK

| 项 | 结果 |
|----|------|
| authentication | **N/A** — 无用户/账号/服务认证面（REQ-027/028：无服务器、无遥测、无账号）。 |
| authorization | **N/A（等价物 = 浏览器扩展权限模型）** — 仅 `clipboardWrite`。无主机/标签页/网络/后台授权。发行 ZIP 白名单 + 权限断言双重门禁（`package.mjs` 读回校验 + `check-manifest.mjs`）。 |
| principal_guard | **not-needed** — 无跨主体调用、无消息总线、无 `externally_connectable`。唯一主体 = 用户本人在自己 DevTools 内的**显式手势**：复制必须点击（`#copy-btn` / 菜单项 / `#copy-selected-btn` / `#copy-req-btn` / `#copy-resp-btn` / `#detail-copy-btn`）或双击行（仅打开明细，不复制）；**扩展不会自动复制**。 |

### 4.2 DATA_SECURITY

| 项 | 结果 |
|----|------|
| sensitive_fields | `Authorization` 头、`Cookie` 头、`Set-Cookie`、`Proxy-Authorization`、请求/响应体内的 Token/密码/API Key、URL query 中的凭证、响应体中的业务 PII（由被调试页面决定，扩展不区分）。**扩展不分类、不脱敏**（REQ-020 禁止任何字符改动 → 有意的设计取舍）。 |
| encryption_at_rest | **not applicable / not needed** — 零持久化（无 `chrome.storage`/`localStorage`/`sessionStorage`/`indexedDB`/`document.cookie`，门禁 + 人读双验证）。数据仅存活于 DevTools 内存，关闭即销毁。 |
| encryption_in_transit | **N/A** — 零网络代码（`check-zero-network` 17/17，扫描 18 个文件；含反向防"空跑假 PASS"：0 文件 → FAIL）。数据不离开本机扩展上下文；剪贴板为本地 OS IPC。 |
| secret_handling | **合规（就扩展自身而言）/ 待用户侧约束** — 全库无硬编码密钥/令牌/私钥（`api[_-]?key|secret|password|BEGIN PRIVATE KEY|AKIA…` 命中 0）。**无密钥需轮换**。残余：用户主动复制的敏感内容进入剪贴板（F-01，且被批量放大）。 |

### 4.3 COMPLIANCE

| 项 | 结论 |
|----|------|
| **OWASP Top 10 (2021)** | A03 Injection — ✅ 无（全 `textContent`；无动态正则；无 SQL/命令/DOM-XSS 面；菜单/明细/Toast/列表四类渲染面全覆盖）。A05 Security Misconfiguration — ✅ 采用 MV3 默认严格 CSP（`script-src 'self'`），**无内联脚本**（`panel.html` 仅 `<script type="module" src>`；`privacy.html` 仅内联 `<style>`，不涉 script-src）；E2E 实测 Chrome+Edge **0 CSP 违规**。A08 Software & Data Integrity — ✅ 零依赖 + ZIP CRC 读回（独立复算）。A09 Logging Failures — ✅ 无请求内容落日志。A01/A02/A04/A06/A07/A10 — 不适用。 |
| **OWASP LLM Top 10** | 仅「下游使用」间接相关：复制文本可能携带针对 AI 分析器的间接提示注入（`RISK-LLM-INJ-01`，信息项）；扩展按 REQ-020 保真契约不改写。 |
| **GDPR / PII** | **不涉及**（扩展不处理账号、支付、身份信息；不收集、不存储、不传输）。`privacy.html` 三项核心声明与代码一致。若用户复制的响应恰含 PII，控制权与责任归属用户。**惟 F-06**：声明的"**单条**"与实际多选批量行为不一致（文档准确性，非数据处理合法性）。 |
| **PCI-DSS** | 不适用。 |
| **Chrome Web Store 政策** | 权限最小化（单一 `clipboardWrite`）+ 隐私政策页齐备 + 单一用途 → 符合基本要求。**F-06 会影响"数据使用披露"的准确性**，建议同步修订后再提交商店（最终审核未覆盖）。 |

---

## 5. 新增攻击面专审（TASK-019 新增项）

### 5.1 右键菜单渲染 —— ✅ PASS
- 渲染唯一路径：`renderMenuItems`（`panel.js:1519-1538`）→ `document.createElement('button')` + `btn.textContent = t(item.i18nKey, item.vars)`；**无任何 HTML 字符串拼接**。
- `btn.id` / `data-action` 取自静态常量 `CTX_ITEM_ID` / `CTX_ACTION`（`contextmenu.js:30-43`），**非不可信值**。
- 定位：`clampPosition` 把 `event.clientX/Y` / `offsetWidth/Height` / 视口尺寸统一规整为有限数（`finite()` → NaN/Infinity → 0），返回数值 `left/top` 后拼 `'px'` → **无 CSS/`style` 注入面**。
- 关闭时机完整（Esc / 点击他处 / `#list` 滚动 / `window` 失焦），`attachMenuListeners`/`detachMenuListeners` 成对且幂等（`menuListenersAttached` 门闩）→ **无监听器泄漏**（反复开关菜单不累积）。
- 命中判定 `resolveRowId` 全程 `try/catch` + 类型守卫，**畸形事件绝不抛异常**（`E_CTX_NO_TARGET` 语义），且用 `listBodyEl.contains(row)` 排除列表外同 class 元素。
- **全库 `chrome.contextMenus` == 0**（`rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'` → 0 命中；`contextMenus` 裸字面量仅 1 处**注释**：`panel.html:137`）。⭐ 发行载荷（注释已剥离）中 `contextMenus` 亦为 **false**（§6.6）。

### 5.2 明细抽屉注入不可信原文 —— ⚠️ 注入 PASS / 体积门禁缺失（F-03）
- **注入面 PASS**：`createDetailView.open()` → `setProp(body, 'textContent', safeResolveText(id))`（`detail.js:164`），`#detail-body` 为 `<pre>`（HTML 解析器不参与文本节点 → **无 DOM XSS**）。`resolveText`/`onClose` 均有 `try/catch` 隔离，异常不外抛、不破坏状态机。淘汰联动 `onEvict` 自动关闭（ADR-018，E2E 已实测）。
- **F-03（中）**：`openDetailRecord`（`panel.js:1704-1716`）**无任何体积门禁**。对照复制路径：`runCurrentCopy` 有 `isOverThreshold → confirmLargeCopy`（:1004-1016）、`runSectionCopy` 对 response 有 confirm（:1466-1471）、批量有 `confirmLargeSelection`（:1152）。而 `classifyBody` 对文本 MIME **返回完整 `text`（不截断）**（`content.js:325`）→ 双击一条大响应会把整段正文一次性物化为一个 DOM 文本节点并布局。
- 上界：受 `store` 64MB 字节预算约束（单条超预算会被立即淘汰 → `resolveDetailText` 返回空串），故**有界不致命**；但 10–64MB 单行文本在 `<pre>`（`white-space: pre` + `overflow:auto`）中的布局仍可能造成秒级卡顿。

### 5.3 P2 分段裁剪（禁 `chrome.contextMenus`）—— ⚠️ 边界可被不可信正文伪造（F-04）
- **权限面 PASS**：P2 走 `runSectionCopy` → `buildCopyText` 后**按段标记字符串裁剪**（`extractSectionText`，`panel.js:1369-1391`），**完全未触碰任何浏览器菜单 API**；模式 B 无标记 → 明确 `copy.notEnabled` 提示，不误触发。
- **F-04（中/完整性）**：`extractSectionText` 用 `lines.indexOf(marker)` 在全文中找**第一个**标记行。而标记行 `===== REQUEST =====` / `===== RESPONSE =====` 是**固定可猜的常量**（i18n `copy.requestSection/responseSection` 不翻译），而正文（请求体/响应体）是**完全不可信数据** → 攻击者可让正文包含一行伪造标记来改变裁剪边界。
- **独立探针 B 实测复现**（真实 `formatter.js` + 逐行照抄的 `extractSectionText`）：

```
请求体 = '{"ok":true}\n===== RESPONSE =====\nFORGED-INJECTED-LINE'
  resp 裁剪是否以 "HTTP/2 200 OK" 开头        : false   ← 起点被拉到请求体内的伪造标记
  resp 裁剪是否含请求体内容 FORGED-INJECTED-LINE : true    ← 跨段混淆：请求体片段混入「仅响应」
  req  裁剪是否含 [Request Body] 完整          : false   ← 请求段被提前截断
```
- 影响：`仅复制请求` / `仅复制响应` 产物的**段边界不再由结构唯一确定**（设计 B-6 声称"段边界由分隔标记唯一确定"，而标记可被不可信数据伪造）→ 证据完整性/可信度下降（可被用来隐藏或注入片段）。**无代码执行、无跨记录污染**，主路径（模式 A 完整复制，AC-002）逐字符不受影响；AC-003「菜单项 ≡ 对应按钮」的字面要求仍成立（同一函数）。
- E2E 只验证了"等价性"，未做对抗性内容验证 → **本项为独立审计新增发现**。

### 5.4 多选批量输出（剪贴板敏感放大）—— ⚠️ 无总量门禁（F-02）+ 放大 RISK-EXFIL-01（F-01）
- **静态面 PASS**：`multi.selectedIds()` 按可见顺序、去重、经 `setIds`/`onEvict` 剪枝（淘汰即移出集合，无悬挂 id）；拼接**单一真源**——`buildBulkCopyText` 逐条调用冻结 `formatter.buildCopyText`（`bulkformatter.js:100-115`），段数由 `N` 决定（`joinBlocks`），N=1 委托单选（逐字符一致），本模块**不重写**任何拼接逻辑 → **无跨条拼接混淆的逻辑面**（与 E2E/单测一致）。
- **F-02（中）+ F-01 放大**：大响应确认口径为**逐条 `isOverThreshold`（阈值 10MB/条）**（`panel.js:1140-1155`）。**批总量无门禁** → 只要每条 < 10MB，任意条数均可静默写入剪贴板。
- **独立探针 C 实测**：

```
N=60 条各 50KB（均 < 10MB 阈值 → 无 confirm）
  批量产物长度        = 3089189 字符 (2.95 MB)
  含段标记数          = 60
  含 Cookie 凭据条数  = 60        ← 60 份 session=SECRET-i 一次性进入同一剪贴板文本
```
- 影响：① **信息泄露放大**：单次粘贴即可把整批凭证交给第三方（含 AI），是 `RISK-EXFIL-01` 的**爆炸半径放大**（此前为单条）；② **本地载荷**：一次性物化 + 写入最多约 64MB（受 store 预算）文本到 OS 剪贴板，可能拖慢其它应用的粘贴。二者**均需用户显式点击**，不构成远程可利用面。

---

## 6. 逐条 AC / REQ 判定（含机械证据）

### 6.1 AC-012 — manifest 权限仍仅 `clipboardWrite`，无新增网络/主机权限 → **PASS** ✅

```
$ node scripts/check-manifest.mjs
== check-manifest ==
manifest: D:\xiaozhai.dev\chrome_extension2\extension\manifest.json
[PASS] manifest_version === 3  (actual=3)
[PASS] permissions === ["clipboardWrite"]  (actual=["clipboardWrite"])
[PASS] 无禁止键 "host_permissions"  (absent)
[PASS] 无禁止键 "tabs"  (absent)
[PASS] 无禁止键 "webRequest"  (absent)
[PASS] 无禁止键 "declarativeNetRequest"  (absent)
[PASS] 无禁止键 "content_scripts"  (absent)
[PASS] 无禁止键 "background"  (absent)
[PASS] 无 "<all_urls>" 出现  (absent)
[PASS] devtools_page === "devtools.html"  (actual="devtools.html")
[PASS] icons["16"] 文件存在  (icons/icon16.png → found)
[PASS] icons["32"] 文件存在  (icons/icon32.png → found)
[PASS] icons["48"] 文件存在  (icons/icon48.png → found)
[PASS] icons["128"] 文件存在  (icons/icon128.png → found)
[PASS] version === "1.1.0"  (actual="1.1.0")
[PASS] name 非空  (actual="Raw Copy")
[PASS] description 非空  (actual="一键复制...")
== RESULT: PASS (17/17 项) ==
EXIT=0
```

**独立加固核对**（超出脚本覆盖，逐键枚举 manifest 顶层）：

```
top-level keys: manifest_version, name, version, description, devtools_page, permissions, icons
  optional_permissions        : absent      optional_host_permissions : absent
  externally_connectable      : absent      web_accessible_resources  : absent
  update_url                  : absent      content_security_policy   : absent
  sandbox                     : absent      background                : absent
  content_scripts             : absent      host_permissions          : absent
  tabs                        : absent      webRequest                : absent
  declarativeNetRequest       : absent      minimum_chrome_version    : absent
  key                         : absent
```

→ manifest 为**最小 7 键**，无任何扩权/外联/自动更新键。**判定 PASS**。

### 6.2 AC-013 — 复制/查看全流程零网络 → **PASS** ✅

```
$ node scripts/check-zero-network.mjs
== check-zero-network ==
扫描文件 18 个：（devtools.html, devtools.js, panel.html, panel.js, privacy.html,
  src/{bulkformatter,capture,clipboard,content,contextmenu,detail,filter,formatter,
       i18n,multiselection,render,selection,store}.js）
[PASS] 无 "fetch("          [PASS] 无 "XMLHttpRequest"     [PASS] 无 "WebSocket"
[PASS] 无 "sendBeacon"      [PASS] 无 "navigator.sendBeacon"
[PASS] 无 "chrome.storage"  [PASS] 无 "localStorage"       [PASS] 无 "sessionStorage"
[PASS] 无 "indexedDB"       [PASS] 无 "chrome.runtime.connect"
[PASS] 无 "analytics"  [PASS] 无 "telemetry"  [PASS] 无 "gtag"
[PASS] 无 "mixpanel"   [PASS] 无 "sentry"     [PASS] 无 "amplitude"  [PASS] 无 "posthog"
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
EXIT=0
```

**反向探针（独立人读交叉验证，防"脚本假 PASS"）**：
- `rg "fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts" extension/` → **0 命中**（exit=1）。
- `rg "localStorage|sessionStorage|indexedDB|chrome\.storage|document\.cookie|postMessage|onMessage|externally_connectable" extension/` → **0 命中**（exit=1）。
- `chrome.*` 全库调用面枚举 → 仅 `chrome.devtools.panels`（devtools.js，6 处）、`chrome.devtools.network`（capture.js，2 处）；`chrome.tabs.create` 1 处为**注释**（见 §6.7 信息项）。
- E2E 实机（TASK-016）：Chrome 152 + Edge 154 双端控制台 `errors=0`、`csp=0`，复制/查看全流程无网络事件。

→ 零网络 + 零持久化经「机械门禁 + 全量人读 + 真机实测」三重验证。**判定 PASS**。

### 6.3 AC-016 — 解压后体积 < 200KB 且零第三方运行时依赖 → **PASS** ✅

```
$ node scripts/package.mjs
-- 打包期剥离（.js 整行注释/空白）--
JS 原始总字节:   207897 B
JS 剥离后总字节: 110606 B (节省 97291 B, 15/15 个文件)
[PASS] 全部 .js 剥离后 node --check 通过 (15/15)
-- 体积 --
条目数:              25
解压后总体积:        139447 B (136.18 KB)
ZIP 压缩后体积:      42622 B (41.62 KB)
门禁口径: 解压后总体积 < 204800 B (200 KB)
[PASS] 解压后总体积 < 200KB (139447 < 204800)
-- 依赖审计 --
扫描 .js 文件:       15
third-party deps = 0
[PASS] 全部 import specifier 均为相对路径（third-party deps = 0）
-- 读回校验 --
[PASS] zip 可解析，CRC32 全部通过，共 25 条目
[PASS] 读回条目数与打包一致 (25)
[PASS] 根 manifest.json 为合法 JSON
[PASS] manifest_version === 3
[PASS] permissions === ["clipboardWrite"]
[PASS] LICENSE 位于 zip 根
[PASS] 不含 butler/ tests/ docs/ scripts/ req.txt 等非发行内容
[PASS] 全部条目与磁盘源文件一一对应（无缺失/多余；.js 按剥离口径）
[PASS] 读回全部 .js 条目 node --check 通过（双保险）
== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==
EXIT=0
```

**依赖面独立核对**：`dependencies`/`devDependencies`/`optionalDependencies` = `null`；无 `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`；无 `node_modules`。
**体积裕度**：136.18 KB / 200 KB = **68% 使用率**（余量 65.35 KB）。**判定 PASS**。

### 6.4 REQ-018 / REQ-019 / REQ-020 / REQ-021 复核 → **全 PASS** ✅

| REQ | 要求（spec.json 原文标题） | 判定 | 证据 |
|-----|---------------------------|:----:|------|
| **REQ-018** | 沿用 MV3（Manifest V3 DevTools 扩展） | **PASS** | `manifest_version === 3`；`devtools_page === "devtools.html"`；`chrome.devtools.panels.create` + `devtools_page` 注册（E2E spy 实测 `panels.create({title:"Raw Copy",icon:"icons/icon32.png",page:"panel.html"})`）；无 SW/background。 |
| **REQ-019** | 无第三方依赖（零第三方运行时依赖） | **PASS** | `third-party deps = 0`（15 .js 全相对 import）；`package.json` 三依赖字段均为 `null`；无 lockfile/node_modules；发行载荷无任何外部 URL/`import`。 |
| **REQ-020** | 最小权限：仅 `clipboardWrite`，不新增 host/网络权限 | **PASS** | `permissions === ["clipboardWrite"]`（长度 1 严格断言）；14 个高风险键逐键 absent（§6.1）；增强**唯一 manifest 字节变化 = `version` 1.0.0→1.1.0**。 |
| **REQ-021** | 零网络传输 | **PASS** | `check-zero-network` 17/17（18 文件）+ 反向 grep 0 命中 + E2E 双端 0 网络/0 CSP 违规。 |

### 6.5 新增面清单（TASK-019 验证清单第 5 条）→ **全 PASS**

| 检查项 | 命令 / 方式 | 结果 |
|--------|------------|:----:|
| 全库 `chrome.contextMenus` == 0 | `rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'` | **0 命中**（exit=1）✅ |
| `contextMenus` 裸字面量 | `rg -n "contextMenus" extension/` | 仅 1 处**注释**：`panel.html:137`（"no `contextMenus` permission is requested"）✅ |
| `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`srcdoc` | `rg` 全库 | **0 处实际使用**（仅 `panel.html:146` 与 `clipboard.js:21` 两处注释说明"never innerHTML"）✅ |
| `eval` / `new Function` / 字符串化定时器 / `javascript:` | `rg` 全库 | **0 命中**（exit=1）✅ |
| 动态正则（`new RegExp`） | `rg` 全库 | `extension/**` **0 命中**（仅 `scripts/check-panel-shell.mjs:136` 用 `new RegExp` 转义静态 id）✅ |
| 不可信文本一律 `textContent` | 4 类渲染面全量人读 | 列表行 / 菜单项 / 明细 `<pre>` / Toast **全部 `textContent`** ✅ |
| 消息面（`onMessage`/`postMessage`/`externally_connectable`） | `rg` | **0 命中** ✅ |
| 硬编码密钥 | `rg -i "api[_-]?key\|secret\|password\|BEGIN PRIVATE KEY\|AKIA…"` | **0 命中** ✅ |

### 6.6 S5 发行产物独立审计（不依赖 `package.mjs`）

**独立 ZIP 解析**（自写 EOCD + 中央目录 + `inflateRawSync` + CRC32 复算，零仓库写入）：

```
EOCD@42600 entries=25 cdSize=1502 cdOffset=41098 fileSize=42622
commentLen=0 (must be 0)
entries: 25
   LICENSE  devtools.html  devtools.js  icons/icon{128,16,32,48}.png
   manifest.json  panel.html  panel.js  privacy.html
   src/{bulkformatter,capture,clipboard,content,contextmenu,detail,filter,
        formatter,i18n,multiselection,render,selection,store}.js  styles/panel.css
uncompressed total = 139447 B (136.18 KB)
CRC/size mismatches: NONE
non-release entries: NONE
has manifest.json at root: true
has any directory entry: false
```

**发行载荷字面量复核**（注释已剥离后的真实载荷）：

```
zip contains "innerHTML":     false      zip contains "eval(":        false
zip contains "new Function":  false      zip contains "contextMenus": false
zip contains "fetch(":        false      zip contains "XMLHttpRequest": false
zip contains "chrome.storage":false      zip contains "chrome.tabs":   false
```

→ 白名单正确、CRC 全通过、无非发行内容混入、**载荷内连危险字面量都不存在**。**判定 PASS**。

### 6.7 S4 门禁脚本复核（含覆盖缺口登记）

| 脚本 | 复跑结果 | 复核意见 |
|------|:--------:|----------|
| `check-syntax.mjs` | `[check-syntax] 15/15 files passed` EXIT=0 | 逐文件 `node --check` + `timeout:30000`；0 文件 → FAIL（防空跑）。✅ |
| `check-manifest.mjs` | `PASS (17/17)` EXIT=0 | 严格 `permissions.length===1`；**缺口**：未断言 `optional_permissions` / `optional_host_permissions` / `externally_connectable` / `web_accessible_resources` / `update_url` / `content_security_policy`（当前 manifest 干净，已由本审计独立枚举补齐）。**F-08（信息）** |
| `check-zero-network.mjs` | `17/17 PASS` EXIT=0 | 关键字行扫描；**可被混淆绕过**（如 `globalThis['fe'+'tch']`）→ 本次结论**依赖人工全量人读交叉验证**，非该脚本单独背书（继承 `R-06`）。0 文件 → FAIL。**F-08（信息）** |
| `check-panel-shell.mjs` | `PASS (34/34)` EXIT=0 | DOM 契约 id / 7 列表头 / 零裸中文 / `--row-height` / `.is-selected`。✅ |
| `package.mjs` | `PASS (体积 / 依赖审计 / zip 读回)` EXIT=0 | 白名单 + 黑名单 + CRC 读回 + 剥离后 `node --check` 双保险；**缺口**：不校验"zip 是否与当前源码同代"（导致 F-04 未被门禁捕获）。**F-04/F-08** |

**信息项 F-09**：`panel.js:1888` 注释含 `chrome.tabs.create` 字面量（说明为何用 `window.open`）。当前无安全影响，但**未来若新增"禁 chrome.tabs"类门禁会产生假阳性** —— 与 `F-ENH07b`（为消除 `chrome.contextMenus` 假阳性而改述 CSS 注释）同源问题，建议一并改述。

---

## 7. 机械证据复跑汇总（TASK-019 硬约束）

### 7.1 复跑结果一览

| # | 命令 | 结果 | EXIT |
|:-:|------|------|:----:|
| 1 | `node scripts/check-syntax.mjs` | 15/15 files passed | 0 |
| 2 | `node scripts/check-manifest.mjs` | PASS (17/17 项) | 0 |
| 3 | `node scripts/check-zero-network.mjs` | PASS 17/17（扫描 18 文件） | 0 |
| 4 | `node scripts/check-panel-shell.mjs` | PASS (34/34 项) | 0 |
| 5 | `node scripts/package.mjs` | PASS（体积 136.18KB / 依赖审计 deps=0 / zip 读回） | 0 |
| 6 | `butler_sec_scan` × 7（panel.js / contextmenu / detail / multiselection / bulkformatter / manifest.json / privacy.html） | **R1–R11 全 PASS** | — |
| 7 | 独立 ZIP 解析（EOCD/中央目录/inflate/CRC32） | 25 条目 CRC 全通过、无杂项 | 0 |
| 8 | 独立探针 A / B / C（store 预算 / P2 裁剪 / 批量总量） | 见 §6 / §5 | — |

### 7.2 ⚠️ 发行产物 sha256 变化声明（F-04，透明记录）

```
[复跑前] sha256 dist/raw-copy-1.1.0.zip = 24c2089ab29c645f2bc21339b3e1fda381d88bc39c31210ea1f7e5d099f2fb5d
         size=42614  mtime=2026-10-02 13:11:49
[复跑后] sha256 dist/raw-copy-1.1.0.zip = 6f2514a9572a2b2b099211951d4a5e51ce3b906a288697096760fbc2b0207446
         size=42622  mtime=2026-10-02 13:44:27
差异根因: extension/panel.js mtime=2026-10-02 13:38:24（> 打包时间 13:11）→ 源码在打包后被修改
          JS 原始总字节 207814 → 207897（+83 B）；解压总体积 139364 → 139447（+83 B）
```

**F-04 判定（🟠 中 · 发行完整性）**：
1. 审计开始时 `dist/raw-copy-1.1.0.zip` **不代表当前源码**（缺少 13:38 的 `#copy-selected-btn` `{count}` 插值修复，即 E2E G-1；与 13:42 的 `tests/README.md` G-2 修复同批）。
2. `test-results.md` §6 声称"zip 可复现：两次运行 sha256 均为 `24c2089a…`"——该结论**对当前源码已失效**（源码变更后未重新打包，无任何门禁捕获）。
3. 按 TASK-019 S5 授权复跑 `package.mjs` 重建 → 新 zip 通过全部读回校验（§6.3/§6.6）。**缺陷已在审计内消除**，但**门禁缺口仍在**：建议增加"源码 mtime/哈希 ≤ 发行包 mtime"或"重打包后 sha256 一致"的发布前断言（§10.4）。

> 本项为**审计内唯一写操作**（构建产物），已在 §11 与 `loads` 日志显式声明；未触碰任何源码/测试/门禁脚本。

---

## 8. RISK-MEM-01 / RISK-EXFIL-01 复核（TASK-019 风险复核项）

### 8.1 `RISK-MEM-01`（捕获期无字节预算的内存放大 / 本地 DoS）→ **已缓解（建议状态机 `open → fixed`）** ✅

| 维度 | 上一里程碑状态 | 本次复核（独立证据） |
|------|---------------|---------------------|
| `store` 字节预算 | ❌ 未落地（仅按**条数** cap=1000） | ✅ **已落地**：`DEFAULT_MAX_BYTES = 64MB`；`estimateRecordBytes`（UTF-8 字节 + headers + 128B 固定开销）；`sizes` 账本 + `totalBytes`；`enforceBudget()` 超限按「淘汰最旧」循环释放并发 `evict{reason:'maxBytes'}`；`add`/`update` 双路径结算；`bytesInUse()` 可观测 |
| 捕获期降级 | ❌ 无 | ✅ **已落地（更强方案）**：有界 enrich 队列 `MAX_ENRICH_QUEUE = 200` + 并发上限 `MAX_CONCURRENT_ENRICH = 4` + `ENRICH_FETCH_TIMEOUT_MS = 10000`；超限 `drop()` → `rejectPending('enqueue-overflow')`，**不再无界驻留 HAR entry** |
| 单条超预算记录 | 无保护 | ✅ 预算循环会连新增记录一并淘汰（不会驻留） |
| 联动一致性 | — | ✅ `evict` 事件驱动 `selection/multiselection.onEvict` + `detailView.onEvict`（ADR-018），UI 不悬挂 |
| **独立探针 A** | — | 200 × 1MB → `size()=63`、`bytesInUse()=63.01MB ≤ 64MB` ✅ |
| 单测覆盖 | — | `tests/store.test.mjs`：`bytesInUse 随 add 增长；maxBytes 超限淘汰最旧且有界（evict 事件）`、`默认 maxBytes 为 64MB，且可配置` 等（TASK-012 基线 264/264 PASS） |

**结论：`RISK-MEM-01` 未随增强恶化，反而已被实质缓解** → 建议 RISK 状态机迁移 `open → fixed`（"独立验证通过"待 TASK-012 复跑复评后可标 `verified`）。残余（预算内 64MB 的瞬时开销）已由 F-02/F-03 细化登记。

### 8.2 `RISK-EXFIL-01`（凭证入剪贴板无复制前敏感探测）→ **仍 `open`，且**⚠️**随增强放大** ❌

| 维度 | 上一里程碑 | 本次复核 |
|------|-----------|---------|
| 复制前敏感探测 | ❌ 未实现 | ❌ **仍未实现**（`rg -i "sensitive|sensitiveWarning|Authorization|Cookie|token=|bearer|api[_-]?key" extension/` → 仅 `privacy.html:164-165` **警示文案**命中，**无任何代码侧探测**）；上一轮建议的 `copy.sensitiveWarning` i18n 键**不存在** |
| 复制后清理 / 二次警示 | ❌ 无 | ❌ 无（保留 `privacy.html` 静态警示） |
| **爆炸半径** | 单条（1 份凭证集） | ⚠️ **放大为 N 条**：多选批量复制 / 菜单「复制选中(N)」/ 全选 → 单次点击把 N 份 `Authorization`/`Cookie` 压入同一剪贴板文本（探针 C 实测 60 份），**且批量确认只对大响应（>10MB/条）触发**，普通批量**完全无确认** |
| 扩展自身外传 | 无 | ✅ 仍无（零网络，§6.2） |

**结论：`RISK-EXFIL-01` 未缓解且**因多选增强而恶化**（爆炸半径 1→N，且批量无确认）。**建议保持 `open` 并升级 severity 描述，附带本轮新增缓解方案（§10.1）。**

### 8.3 继承风险复核

| RISK | 状态 | 复核 |
|------|:----:|------|
| `RISK-OPEN-01`（`window.open` 无 `noopener`） | 仍 `open` | `panel.js:1916` 仍为 `window.open(target, '_blank')`。`target` 来自静态 `href="privacy.html"`（同源扩展页）→ **当前无可利用面**，属未来隐患。低。 |
| `RISK-LLM-INJ-01`（下游 LLM 间接提示注入） | 不变 | 扩展按 REQ-020 保真契约不改写；`USAGE.md` 提示语覆盖情况由文档侧负责。信息项。 |
| `RISK-DOC-01`（**新增**，低） | 新 | `privacy.html:127-128` 声明"只做一件事：把你选中的**单条**网络请求…写入剪贴板"，与增强后的**多选批量复制**行为不一致（该页随发行包发布）。属**数据使用披露准确性**（Chrome Web Store 审核关注项），非数据处理合法性问题。建议同步修订（§10.5）。 |

---

## 9. MITIGATIONS（风险 ≥ medium）

### 9.1 F-01 `RISK-EXFIL-01` 放大 — 复制前敏感探测 + 批量确认（🟡 中）
**问题**：含 `Authorization`/`Cookie`/`Set-Cookie`/Token 的原文入剪贴板，无复制前探测；多选使单次点击可外泄 N 条。
**建议（按性价比排序，交下游 butler-fix）**：
1. **[推荐] 复制前本地敏感探测 + 二次确认**：在 `runCurrentCopy` / `runCopySelection` / `runSectionCopy` / `runDetailCopy` 的 `copyText` 之前插入**本地**轻量正则探测（命中 `Authorization:`、`Set-Cookie:`、`Cookie:`、`token[=:"]`、`api[_-]?key`、`bearer `、`BEGIN [A-Z ]*PRIVATE KEY`），命中则 `confirm()`（新增 i18n 键 `copy.sensitiveWarning`，zh/en 对齐）。**不修改正文**（不破坏 REQ-020 保真契约）。
2. **[推荐] 批量额外做「总计」确认**：`count ≥ 阈值（如 5）` 或 `总字节 ≥ 阈值（如 1MB）` 时提示"本次将复制 N 条、共 X MB（含 M 条敏感）"，与 §10.2 合并实现。
3. **文档强化**：`USAGE.md` 增加"复制前请确认内容可外发"章节并交叉引用 `privacy.html`；隐私页补"批量复制"说明（见 §10.5）。
**验证方法**：单测断言 `isSensitiveText('Authorization: Bearer x') === true`、普通文本 `false`；`confirm` 返回 false 时不调用 `copyText`（可用注入桩断言调用次数 0）；批量路径断言确认文案含真实 `count` 与总字节。

### 9.2 F-02 批量复制无总量门禁（🟡 中 · 本地载荷 + 敏感放大）
**问题**：确认口径仅逐条 `isOverThreshold`（10MB/条），批总量无门禁 → 任意条数静默入剪贴板。
**建议**：
1. **[推荐] 批总量门禁**：在 `runCopySelection` 累加 `contentByteSize(record)` 得 `batchBytes`；当 `batchBytes > BATCH_CONFIRM_BYTES`（建议 2MB）**或** `overCount > 0` **或** `records.length >= BATCH_CONFIRM_COUNT`（建议 10）时，统一走一次 `confirmLargeSelection(count, formatSize(batchBytes))`（复用现有 i18n `multi.largeConfirm`，或新增含总量变量的键）。
2. **可选硬上限**：极端批（如总字节 > 预算一半）时先提示再复制；不建议直接拒绝（会破坏"全选即复制"的可用性契约，需老板裁决）。
**验证方法**：单测构造 60×50KB（无单条超阈值）断言 confirm 被调用 1 次；构造 1 条 20MB 断言仍触发；`confirm=false` → 断言 `copyText` 未被调用且返回 `{ok:false, reason:'cancelled'}`。

### 9.3 F-03 明细抽屉无体积门禁（🟡 中 · 本地卡顿）
**问题**：`openDetailRecord` 直接物化完整正文（`classifyBody` 对文本 MIME 不截断）。
**建议**：
1. **[推荐] 打开前门禁**：`openDetailRecord` 内对 `record.responseContent` 调 `isOverThreshold`；超阈值时弹一次 confirm（文案建议 i18n 新键 `detail.largeConfirm`，含大小），取消则不打开（或打开但正文以 `content.unavailable`/省略占位渲染，保持"六要素"骨架可见）。
2. **替代**：为 `<pre>` 增加纯 CSS 缓解（`contain: content` + 超长行 `white-space: pre-wrap` 保底），降低布局成本；但**不能替代**上述确认。
**验证方法**：单测/探针注入 `size > 阈值` 记录，断言 confirm 被调用且 cancel 时不执行 `detailView.open()`；E2E 断言大开时面板仍可交互（帧时间阈值）。

### 9.4 F-04 发行完整性门禁（🟠 中 · 已在审计内修复）
**问题**：`package.mjs` 只校验"zip 自身是否自洽"，**不校验 zip 是否与当前源码同代** → 源码在打包后被改动而无人发现（本次真实发生）。
**建议（二选一或并用）**：
1. **[推荐] 产物新鲜度断言**：`package.mjs` 打包后断言 **`max(extension/** mtime) ≤ zip mtime`**（或对源码树计算哈希写入 zip 注释旁的自校验清单），不满足 → `exit 1`。
2. **CI/发布门**：发布前固定跑 `package.mjs` 并比对期望 sha256（把当前 `6f2514a9…` 作为 1.1.0 基线记入发行台账），不一致即阻断。
**验证方法**：沙盒副本中"打包 → 触碰任一 `extension/**` 文件 → 复跑" 应 FAIL-closed；"打包 → 立即复跑" 应 PASS 且 sha256 稳定。

### 9.5 F-06 隐私声明与行为一致性（🟢 低 · 商店合规）
把 `privacy.html` 的"**单条**网络请求"改为"一条或多条你选中的网络请求"，并在「你的控制权」节说明多选批量为显式点击触发、单次可复制多条；同步检查 `USAGE.md`/`docs/*`。验证：文档评审 + 与 `extension/` 行为逐条对齐（DEL 侧）。

### 9.6 低风险 / 信息项（不阻断，建议顺手处理）
- **F-05（低）`RISK-OPEN-01`**：`window.open(target, '_blank')` → 加 `'noopener'`（或 `<a>` 补 `rel="noopener noreferrer"`）。当前无可利用面，属防御性加固。
- **F-07（低）F-04 的对抗面**：`extractSectionText` 的段边界应改为**结构化**确定（如由 `formatter` 在生成时返回段偏移，或对 `RESPONSE_SECTION` 取「最后一个位于 `REQUEST_SECTION` 之后的出现」并显式声明限制）。若判定为可接受限制 → 须在 `USAGE.md`/隐私页声明"仅请求/仅响应"为**尽力裁剪**，边界可能受正文内容影响。
- **F-08（信息）门禁覆盖缺口**：`check-manifest.mjs` 补断言 `optional_permissions`/`optional_host_permissions`/`externally_connectable`/`web_accessible_resources`/`update_url`/`content_security_policy`；`check-zero-network.mjs` 补"AST/import 白名单"类更强检查（当前关键字扫描可被混淆绕过，结论依赖人读）。
- **F-09（信息）注释字面量**：`panel.js:1888` 注释中的 `chrome.tabs.create` 建议改述（同 `F-ENH07b` 前例），避免未来门禁假阳性。
- **F-10（信息）无 CI 依赖审计**：当前零依赖无实际影响；若引入依赖必须补 `npm audit`/OSV 门禁 + lockfile 完整性校验。

---

## 10. RECOMMENDATION

**WARN — 可发布（不阻断发行），但须满足三项前置**：

1. **显式接受** F-01（`RISK-EXFIL-01` 放大）与 F-02 / F-03 三项中风险，并在发布说明中记录接受人与理由；
2. **发布前确认** `dist/raw-copy-1.1.0.zip` 为**本次重建产物**（sha256 `6f2514a9…`），并把它作为 1.1.0 的发行基线记录（F-04 已在审计内修复，但门禁缺口待补）；
3. **同步修订** `privacy.html` 的"单条"表述（F-06，商店数据使用披露准确性）。

扩展自身攻击面已收敛到教科书水平：**零依赖 / 零持久化 / 零网络 / 单一最小权限 / 无消息面 / 无 content script / 全 `textContent` / 白名单打包 + CRC 读回 / 捕获期内存有预算上界**。唯一实质残余风险来自**「按需求设计」的敏感数据入剪贴板（现被多选放大）** 与 **不可信原文的渲染/裁剪边界**，二者均属本地用户可控面，**不构成远程可利用面**，故不阻断发布。**下一里程碑（1.1.x）建议优先落地 §9.1 + §9.2（敏感探测与批总量门禁）与 §9.4（发行新鲜度门禁）**。

---

## 11. 未覆盖清单（INV-1 强制声明）

1. **真机浏览器运行时验证不由本审计承担**：已由 TASK-016（E2E 实机）覆盖 —— Chrome 152 + Edge 154 双端 17/17 PASS、0 错误、0 CSP 违规。本步**复用**其结论，未重复驱动浏览器；`Extensions.loadUnpacked` 与真实系统剪贴板读取的可信度依据其原始结果 JSON（`e2e-artifacts/results-*.json`）。
2. **未驱动真实 DevTools 内嵌面板容器**：E2E 以扩展页 `panel.html` + 桥接 `chrome.devtools.network.onRequestFinished` 事件源承载（真实 HAR 事件无法脚本化产生）。**live 页面实时捕获、多 inspected target、关闭 DevTools 销毁数据**路径未经端到端实测。
3. **商店分发/发布渠道安全未覆盖**：CWS / Edge Add-ons 审核、签名、账号侧供应链；`update_url` **缺失** → 无自动更新通道，故**无更新签名面可审**（亦无更新劫持面）。
4. **企业托管策略**（`ExtensionSettings`、ForceList/policy）行为未覆盖。
5. **OS 剪贴板层**：其他进程读取剪贴板属 OS 面，非扩展可控；本轮评审了**写入侧**（含批量放大），**未审计读取侧**（设计上扩展从不读剪贴板 ✅）。
6. **依赖漏洞扫描（OSV / npm audit）显式 N/A**：零第三方依赖（三依赖字段 `null`、无 lockfile、无 `node_modules`）→ 无 CVE 可查，**非"跳过"**。同理 `RISK` 表内供应链类 CVE 无适用对象。
7. **图标 PNG 二进制内容**仅验"存在 + 结构"，未做像素级/隐写审查（低风险：自产 `gen-icons.mjs`，不进发行包逻辑，但 PNG **在**发行包内）。
8. **门禁脚本自身未经 `butler_sec_scan`**：`scripts/*.mjs` 为开发期工具、不进发行包；本轮做了人读 + 复跑，未做 R1-R11 扫描。
9. **未重新执行完整测试套件**：TASK-019 未授权 `node --test`，且宪法 §19 规定测试执行唯一路径为 butler-tester。本报告引用 `test-results.md`（TASK-012，264/264 PASS，13:11）作为测试证据；**注意其 mtime 早于 13:38 的 `panel.js` 变更**（即 G-1 修复后的 `panel.js` 未再经测试基线复跑）——该项应回交 TASK-012/验证链补跑。
10. **性能/DoS 的量化基准未做**：F-02/F-03 的"卡顿"为静态推理 + 小规模探针（60×50KB / 200×1MB），**未做浏览器内帧时间与内存曲线实测**（属 E2E/性能专项）。
11. **`butler/project/security-constraints.md` 不存在** → 本项目**无项目专属安全约束表**（生产服务器红线/数据卷/密钥纪律均不适用），本审计沿用 agent 通用五面契约 + `butler/domain/security.md` 通用约定。
12. **未覆盖 `tests/**` 与 `docs/**` 的内容安全**（非发行面；`package.mjs` 已断言其不混入 zip）。

---

## 12. risks（宪法 全局红线 15 · YAML）

```yaml
risks:
  - description: "RISK-EXFIL-01（放大）：核心功能将含 Authorization/Cookie/Token 的请求响应原文写入系统剪贴板，无复制前敏感探测；本增强的多选批量复制使单次点击可同时外泄 N 条（探针实测 60 条含 Cookie 凭据一次入剪贴板），且批量确认仅对 >10MB/条 触发"
    probability: "中"
    impact: "中"
    mitigation: "复制前本地正则敏感探测 + confirm 二次确认（i18n copy.sensitiveWarning，不改正文保 REQ-020）；批量增加 count/总字节确认；USAGE.md + privacy.html 强化提示"
    category: "安全"
    surface: "S1(前端)/OS剪贴板"
    risk_id: RISK-EXFIL-01
    status: open
    change: "本里程碑：未缓解 + 爆炸半径由 1 条放大为 N 条"
  - description: "多选批量复制无批总量门禁：单记录阈值 10MB 对批总量无效，任意条数可静默写入剪贴板（实测 60×50KB=2.95MB、无 confirm），造成 OS 剪贴板载荷放大与敏感信息批量外泄"
    probability: "中"
    impact: "中"
    mitigation: "runCopySelection 累加批总量；batchBytes > 2MB 或 count >= 10 或 overCount>0 时统一一次 confirm（复用 multi.largeConfirm）"
    category: "安全"
    surface: "S1(前端)/OS剪贴板"
    risk_id: RISK-MEM-02
    status: open
  - description: "明细抽屉对不可信原文无体积门禁：openDetailRecord 直接物化完整正文（classifyBody 对文本 MIME 不截断）至 <pre> 文本节点，超大正文可致面板长时间布局卡顿（复制路径有 confirm，明细路径没有）"
    probability: "低"
    impact: "中"
    mitigation: "openDetailRecord 前置 isOverThreshold + confirm（或超阈值以占位渲染骨架）；<pre> 增加 contain/white-space 兜底"
    category: "安全"
    surface: "S1(前端)/DOM渲染"
    risk_id: RISK-DOS-01
    status: open
  - description: "P2 分段裁剪段边界可被不可信正文伪造：extractSectionText 以全文首个 ===== RESPONSE ===== 行定位边界，而请求/响应正文完全不可信且标记为固定常量 → 「仅响应」可混入请求体片段、「仅请求」可被提前截断（探针 B 已复现）"
    probability: "低"
    impact: "中"
    mitigation: "改为结构化边界（formatter 返回段偏移）或取「REQUEST 之后最后一个 RESPONSE」并显式声明限制；若接受为限制需在文档声明『尽力裁剪』"
    category: "安全"
    surface: "S1(前端)/输出完整性"
    risk_id: RISK-INTEG-01
    status: open
  - description: "发行包与源码不同代且无门禁捕获：dist/raw-copy-1.1.0.zip（13:11 构建）落后于 13:38 的 panel.js 修复（G-1）与 13:42 的文档修复（G-2）；test-results.md 声称的可复现 sha256 对当前源码失效"
    probability: "高"
    impact: "中"
    mitigation: "package.mjs 增加产物新鲜度断言（max(extension/** mtime) <= zip mtime）或发布前 sha256 基线比对；本轮已按 TASK-019 授权重建（sha256 6f2514a9…）"
    category: "流程"
    surface: "S5(发行)/构建"
    risk_id: RISK-REL-01
    status: fixed
    fixed_evidence: "audit 内复跑 package.mjs 重建，通过 CRC/白名单/体积/dep 四项读回校验"
  - description: "RISK-OPEN-01：privacy-link 处理以 window.open(target,'_blank') 打开，未带 noopener；target 为静态同源扩展页 privacy.html，当前无可利用面，属未来隐患"
    probability: "低"
    impact: "低"
    mitigation: "window.open 加 'noopener' 或 <a> 补 rel=noopener noreferrer"
    category: "安全"
    risk_id: RISK-OPEN-01
    status: open
  - description: "privacy.html 声明『只做一件事：把你选中的单条网络请求…写入剪贴板』，与增强后的多选批量复制行为不一致；该页随发行包发布，属商店数据使用披露准确性问题"
    probability: "中"
    impact: "低"
    mitigation: "修订为『一条或多条你选中的请求』并在控制权章节说明批量复制为显式点击触发；同步 USAGE.md/docs"
    category: "流程"
    surface: "S5(发行)/文档"
    risk_id: RISK-DOC-01
    status: open
  - description: "RISK-MEM-01：capture.normalize 全量驻留 response.content.text，store 仅按条数限流、无字节预算 → 已缓解（64MB 预算 + 字节优先淘汰 + 有界 enrich 队列），独立探针实测 200×1MB → 63.01MB <= 64MB"
    probability: "低"
    impact: "中"
    mitigation: "已落地（store.maxBytes / bytesInUse / enforceBudget / MAX_ENRICH_QUEUE=200 / MAX_CONCURRENT_ENRICH=4 / fetch 超时 10s）"
    category: "安全"
    surface: "S1(前端/内存)"
    risk_id: RISK-MEM-01
    status: fixed
    change: "本里程碑：open -> fixed（独立探针 A + store 单测佐证）"
  - description: "RISK-LLM-INJ-01：复制文本可携带针对下游 LLM 的间接提示注入指令；扩展按 REQ-020 保真契约不做改写"
    probability: "低"
    impact: "中"
    mitigation: "USAGE.md 提示粘贴给 AI 前自行确认内容来源；属下游信任边界"
    category: "安全"
    risk_id: RISK-LLM-INJ-01
    status: open
    change: "继承，未恶化"
  - description: "check-manifest.mjs 未断言 optional_permissions / optional_host_permissions / externally_connectable / web_accessible_resources / update_url / content_security_policy；check-zero-network.mjs 为可被混淆绕过的关键字扫描；package.mjs 不校验产物与源码同代"
    probability: "低"
    impact: "中"
    mitigation: "补齐上述键断言；引入 import/AST 白名单检查；增加产物新鲜度门禁（与 RISK-REL-01 合并）"
    category: "流程"
    surface: "S4(供应链)/门禁"
    risk_id: RISK-GATE-01
    status: open
```

## 13. tech_debt（宪法 全局红线 16）

```yaml
tech_debt:
  - location: "extension/panel.js:1369-1391 extractSectionText"
    issue: "P2 分段裁剪以全文首个固定标记行定位段边界，边界受不可信正文影响（伪造标记可跨段混淆/截断）"
    risk: "「仅请求/仅响应」产物完整性受损，可能误导人工/AI 分析（F-07 / RISK-INTEG-01）"
    priority: "P2"
    suggestion: "改结构化边界（formatter 返回段偏移），或限定搜索区间并显式声明『尽力裁剪』"
  - location: "extension/panel.js:1704-1716 openDetailRecord"
    issue: "明细打开无体积门禁，直接物化完整正文（复制路径有 confirm，明细路径没有）"
    risk: "超大正文导致面板长时间卡顿（F-03 / RISK-DOS-01）"
    priority: "P2"
    suggestion: "前置 isOverThreshold + confirm（i18n detail.largeConfirm）或占位渲染"
  - location: "scripts/package.mjs（打包后校验段）"
    issue: "不校验发行包与当前源码同代，源码在打包后变更无人发现（本次真实发生 G-1/G-2）"
    risk: "发行物与源码不一致（F-04 / RISK-REL-01），发布物不可复现"
    priority: "P2"
    suggestion: "增加 max(extension/** mtime) <= zip mtime 断言或发布前 sha256 基线比对"
  - location: "extension/panel.js:1888（注释）"
    issue: "注释内保留 chrome.tabs.create 字面量，未来门禁易假阳性"
    risk: "门禁噪声（无安全影响，F-09）"
    priority: "P3"
    suggestion: "改述注释（同 F-ENH07b 前例），消除字面量"
```

---

## 14. 知识库写回（Step 5.4 / 5.5 契约履行）

| 资产 | 动作 | 状态 |
|------|------|:----:|
| `butler/spec/<slug>/sec-audit.md` | 本报告（verdict: WARN） | ✅ 已写 |
| `butler/tasks/loads/TASK-019-butler-sec-auditor.json` | 上下文加载日志 | ✅ 已写 |
| `butler/domain/security.md`（RISK 登记表） | 新增/更新 `RISK-MEM-02`/`RISK-DOS-01`/`RISK-INTEG-01`/`RISK-REL-01`/`RISK-DOC-01`/`RISK-GATE-01`；`RISK-MEM-01` → `fixed`；`RISK-EXFIL-01` 补「放大」+ `open` | ✅ 已写（附录 A） |
| `butler/learned/sec-auditor.md` | 本轮经验追加（Round） | ✅ 已写（附录 A） |
| `butler/file-registry.md` | **未改**（TASK-019 硬约束） | ⛔ 未改 |
| `butler/project/security-constraints.md` | **不适用**（本项目无项目专属安全约束） | — |

---

## 附录 A — 知识回写内容

### A.1 `butler/domain/security.md` — RISK 登记表（本轮增量）

```
RISK 登记表（增量 · 2026-10-02 · 审计 run: TASK-019 / slug: 在现有-raw-copy-...-功能增）

| RISK | 面 | 描述(简) | 概率 | 影响 | 状态 |
|------|----|---------|:----:|:----:|:----:|
| RISK-MEM-01    | S1/内存      | 捕获期无字节预算的内存放大 | 低 | 中 | [fixed]    ← 本轮 64MB 预算 + 有界 enrich 队列落地，探针 A 验证 |
| RISK-EXFIL-01  | S1/剪贴板    | 凭证原文入剪贴板，无复制前敏感探测 | 中 | 中 | [open]     ← 本轮**放大**：多选批量 N 条、无批量确认 |
| RISK-MEM-02    | S1/剪贴板    | 批量复制无总量门禁 | 中 | 中 | [open]     ← 新增 |
| RISK-DOS-01    | S1/DOM       | 明细抽屉无体积门禁 | 低 | 中 | [open]     ← 新增 |
| RISK-INTEG-01  | S1/输出完整性 | P2 分段裁剪边界可被不可信正文伪造 | 低 | 中 | [open]     ← 新增 |
| RISK-REL-01    | S5/发行      | 发行包与源码不同代 | 高 | 中 | [fixed]    ← 新增；审计内重建消除，门禁待补 |
| RISK-OPEN-01   | S1/前端      | window.open 无 noopener | 低 | 低 | [open]     ← 继承 |
| RISK-DOC-01    | S5/文档      | 隐私声明「单条」与多选批量不一致 | 中 | 低 | [open]     ← 新增 |
| RISK-GATE-01   | S4/门禁      | 门禁覆盖缺口（manifest 键/keyword 扫描/产物新鲜度） | 低 | 中 | [open]     ← 新增 |
| RISK-LLM-INJ-01| AI 横切      | 下游 LLM 间接提示注入 | 低 | 中 | [open]     ← 继承 |

changelog:
  2026-10-02 RISK-MEM-01   open -> fixed    （store.maxBytes 64MB + 字节优先淘汰 + capture 有界 enrich 队列；探针 A 200x1MB→63.01MB≤64MB）
  2026-10-02 RISK-EXFIL-01 open -> open     （未缓解；爆炸半径 1→N，附放大证据：探针 C 60×50KB 含 60 份 Cookie）
  2026-10-02 RISK-REL-01   new  -> fixed    （审计内复跑 package.mjs 重建，sha256 24c2089a… → 6f2514a9…）
  2026-10-02 RISK-MEM-02 / RISK-DOS-01 / RISK-INTEG-01 / RISK-DOC-01 / RISK-GATE-01  new -> open
```

### A.2 `butler/learned/sec-auditor.md` — 本轮追加

```markdown
## Round — 2026-10-02（TASK-019 · 增强里程碑独立安全审计）

- 审计范围: changed ∪ affected（S1 全量人读 panel.html/panel.js/panel.css + 4 新模块；S2 manifest；S4 scripts+package.json；S5 发行 ZIP；4 项新增攻击面专审）
- 结论: verdict=WARN；无高危/可利用漏洞；AC-012/013/016 + REQ-018/019/020/021 全 PASS
- 新发现:
  - [中] 批量复制无总量门禁（每记录 10MB 阈值对批总量无效）→ RISK-MEM-02
  - [中] 明细抽屉无体积门禁（复制路径有 confirm，明细路径没有）→ RISK-DOS-01
  - [中] P2 分段裁剪边界可被不可信正文伪造（探针 B 复现跨段混淆）→ RISK-INTEG-01
  - [中] 发行包与源码不同代且无门禁捕获（sha256 声明失效）→ RISK-REL-01（审计内已修）
  - [低] privacy.html「单条」声明与多选批量不一致 → RISK-DOC-01
- 已收敛: RISK-MEM-01 open→fixed（64MB 字节预算 + 有界 enrich 队列，独立探针验证）
- 未缓解: RISK-EXFIL-01 保持 open，且被多选放大（爆炸半径 1→N）
- 新 pattern:
  - [pattern: 静态等价性测试≠对抗性内容测试, date: 2026-10-02] E2E 验证了「菜单项 ≡ 按钮」的等价性与逐字符保真，但没有验证"不可信正文能否影响输出结构"。复制/裁剪类功能的审计必须补一条对抗性用例：**把结构标记字符串塞进不可信数据字段**，观察结构解析是否被劫持。本次据此发现 RISK-INTEG-01。
  - [pattern: 门禁自洽≠产物同代, date: 2026-10-02] 打包门禁只校验"包内自洽"（CRC/白名单/体积），无法发现"源码在打包后被改动"。凡有发行物的项目，审计 S5 时必须独立复跑打包并比对 sha256 与上次记录值，差异即为发现。
  - [pattern: 增强放大既有风险要单独登记, date: 2026-10-02] 多选批量未引入新漏洞类，但把既有 RISK-EXFIL-01 的爆炸半径从 1 放大到 N。审计结论应区分"新增风险"与"既有风险放大"，并在状态机里把放大证据写入 change 字段。
- 误报记录: 无
```

---

**审计签署**：butler-sec-auditor ｜ verdict **WARN** ｜ 无 P0 / 无高危 / 无可利用漏洞 ｜ 4 项中风险给出接受与缓解路径 ｜ 未覆盖清单见 §11。

### degradations
- agent: "butler-sec-auditor"
  reason: "TASK-019 硬约束为「只读审计」，但 S5 要求复跑 `node scripts/package.mjs`，该脚本会重写 `dist/raw-copy-1.1.0.zip`（构建产物）。本次按任务明示授权执行，并完整记录复跑前后 sha256、字节差与根因（§7.2），未触碰任何源码/测试/门禁脚本。"
  impact: "审计内发生 1 次构建产物重写（dist/raw-copy-1.1.0.zip：24c2089a… → 6f2514a9…，42614B → 42622B）。该重写同时消除了 F-04（发行包落后于源码）；新产物已通过 CRC/白名单/体积/依赖四项读回校验。"
  severity: "LOW"
- agent: "butler-sec-auditor"
  reason: "未重新执行完整测试套件（`node --test`）：TASK-019 未列为必跑项，且宪法 §19 规定测试执行唯一路径为 butler-tester。"
  impact: "测试证据引用 `test-results.md`（TASK-012，264/264 PASS，mtime 13:11），其时间早于 13:38 的 `panel.js`（G-1 修复）变更 → 该变更未经测试基线复跑。已列入未覆盖清单（§11.9）并建议回交验证链补跑。"
  severity: "MEDIUM"
### end degradations
