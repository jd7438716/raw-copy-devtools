verdict: WARN

---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
phase: ⑥ 安全审计
agent: butler-sec-auditor
date: 2026-10-02
scope: changed ∪ affected
scope_weight: heavy (TASK-006 heavy + TASK-014 heavy + 发行门)
security_posture: WARN
---

# 安全审计报告 — Raw Copy（Chrome/Edge DevTools MV3 扩展）

## 0. 结论摘要

- **SECURITY_POSTURE: WARN**（不阻断发布；附风险说明 + 2 项建议修复）。
- **无高危/可利用漏洞**：未发现注入、提权、数据外传、命令执行、供应链污染类问题。
- **WARN 的两个理由**（均为「设计已知 / 按需求行为，但需要显式接受 + 补强」）：
  1. **R-01（中）内存放大 / 本地 DoS**：`capture.normalize` 把 `response.content.text` 全量驻留内存，`store` 仅按**条数**（cap=1000）限流，**无字节总量上限**；大响应在高频页面下可累积占用大量内存（设计 §B-5 已自认 likely，缓解项未落地）。
  2. **R-02（中）敏感信息经剪贴板外流**：核心功能即把含 `Authorization` / `Cookie` / `Set-Cookie` / Token 的完整请求+响应原文写入系统剪贴板（明确用于粘贴给 AI 分析）。无网络代码，但剪贴板为 OS 共享资源，且无「复制后自动清理 / 二次警示」。`privacy.html` 已有警示文案，属**按需求（REQ-015/016/020）的设计行为**，需显式接受。

> 判定为 WARN 而非 REJECT：所有控制项（ZIP 门禁 / 权限最小化 / 零网络 / 文本节点写入）均经机械证据验证通过；R-01/R-02 不构成对第三方或远程攻击者的可利用面。

---

## 1. Scope（审计范围）与口径

### 1.1 本步口径

- **scope = changed ∪ affected**（宪法 §34）。本项目为**绿地新建**，仓库非 git 仓库（无 `git diff` 基线）→ **changed = 本轮 run 的全部交付物**。
- **weight 判定 = heavy**：TASK-006（复制保真，heavy）、TASK-014（打包，heavy）+ 本步为**发行门（PRESHIP）** → 允许的扩大范围；因 changed 已覆盖整个扩展发行面，**未额外扩大到无关面**。
- 判定依据：`butler/spec/<slug>/captain-execution.md` §2 文件变更清单 + 磁盘实际文件核对。

### 1.2 已审计（changed，逐文件）

| 面 | 文件 | 方式 |
|----|------|------|
| S1 前端/扩展页 | `extension/panel.html`、`panel.js`、`privacy.html`、`devtools.html`、`devtools.js`、`styles/panel.css` | 全量人读 + `butler_sec_scan` + `check-panel-shell` |
| S1b 纯逻辑模块 | `extension/src/{i18n,store,capture,filter,render,selection,formatter,clipboard,content}.js` | 全量人读 + `butler_sec_scan` |
| S2 权限/清单 | `extension/manifest.json` | 全量人读 + `check-manifest`（17/17）+ `check-zero-network`（17/17） |
| S4 供应链/构建 | `scripts/{check-syntax,check-manifest,check-panel-shell,check-zero-network,package,gen-icons,verify-icons}.mjs`、`package.json` | 全量人读 + 打包门禁复跑 |
| S4/S5 产物 | `dist/raw-copy-1.0.0.zip`（52392 B） | 结构/白名单/CRC 读回核对（`scripts/package.mjs`） |
| 资料 | `LICENSE`、`INSTALL.md`、`USAGE.md`、`docs/*`、`tests/**` | 定向读（密钥/外链/声明一致性） |

### 1.3 affected（反向依赖面）

| 触发点 | 受影响面 | 结论 |
|--------|----------|------|
| `manifest.json` permissions 变更 | 安装期授权、浏览器扩展管理页、企业策略 | 仅 `clipboardWrite`，无 host/tabs/webRequest |
| DevTools HAR 数据接入（`onRequestFinished`） | 内存数据结构 `RequestRecord`、渲染、复制链路 | 全链路已审 |
| 剪贴板写入 | OS 剪贴板（跨进程共享） | 见 R-02 |
| 打包白名单 | 分发产物内容边界 | 白名单 + 反向黑名单双校验通过 |
| 无持久化 → 无数据生命周期迁移 | — | N/A |

### 1.4 未覆盖清单（INV-1 强制声明）

1. **真机浏览器运行时验证未执行**：无 GUI 环境，AC-018 双端（Chrome/Edge）安装冒烟与 E2E-01..16 未跑（与 `captain-execution.md` §6 一致）。→ **CSP 实际生效、`navigator.clipboard` 降级链、`execCommand` 在真实面板中的行为未经实证**，仅静态推断 + 单测（Node 桩）。
2. **商店分发/发布渠道安全未覆盖**：CWS / Edge Add-ons 审核、签名、`update_url` 自动更新通道（当前 manifest **无** `update_url`，故无更新签名面可审）。
3. **企业托管策略（`ExtensionSettings`、ForceList）行为未覆盖**。
4. **OS 剪贴板层**：其他进程读取剪贴板属 OS 面，非扩展可控，未审计。
5. **P2 未实现功能**（仅复制请求/仅复制响应/复制为 cURL，REQ-013）——代码未落地，无攻击面；实现时需复审（cURL 拼接是新增注入面）。
6. **依赖漏洞扫描（OSV/npm audit）显式 N/A**：零第三方依赖（`package.json` 无 `dependencies`、无 lockfile、无 `node_modules`；`package.mjs` 依赖审计 third-party deps = 0）→ 无 CVE 可查，**非"跳过"**。
7. **图标 PNG 二进制内容**仅验证「PNG 结构合法 + 尺寸」，未做像素级/隐写审查（低风险：自产 `gen-icons.mjs`，不进发行包）。

---

## 2. 五面攻击面核对（S1–S5）

| # | 面 | 适用性 | 核对结果 |
|---|----|--------|----------|
| **S1** | 前端 / 扩展页 | ✅ 适用 | **PASS**：全部不可信数据（URL/headers/body）经 `textContent` 写入；无 `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function`/`srcdoc`/`javascript:`（grep 全库仅命中注释）。无 token 存储（零持久化）。无 CORS 面（零网络）。`t()` 用函数式 `replace` 回调，无 `$&` 替换模式注入。**无「由不可信输入构造的正则」**（`filter.js` 用 `indexOf`，`matchStatus` 的正则作用于输入而非由输入构造）→ 无 ReDoS。 |
| **S2** | 后端 | ❌ N/A | 本扩展**无后端、无服务器、无 SW、无 content script、无 message passing**（`onMessage`/`externally_connectable`/`postMessage` 全库 0 命中）→ 无远程可达面。等效「后端面」即 Chrome API 使用面：仅 `chrome.devtools.panels.create` + `chrome.devtools.network.onRequestFinished`，均**无需权限**且不可被网页触达。 |
| **S3** | 桌面 | ❌ N/A | 非桌面应用：无 sidecar、无端口绑定、无 updater、无安装钩子、无资源目录读写。 |
| **S4** | 供应链 | ✅ 适用 | **PASS**：`dependencies = 0`；全部 import 均为相对路径（`package.mjs` 审计 external = 0）；dev 脚本仅 `node:*` 内置模块；无 lockfile 漂移面（无第三方包）；无高危格式。**缺口（低）**：无 CI 依赖审计流水线——当前零依赖下无实际影响，若未来引入依赖必须补 `npm audit`/OSV 门禁。 |
| **S5** | 部署 | ✅ 适用（弱） | **PASS**：无服务器/数据卷/反代/生产 SSH 面。发行形态 = 本地 `load unpacked` / ZIP；`package.mjs` 白名单仅 `extension/**` + `LICENSE`，黑名单排除 `butler/ tests/ docs/ scripts/ .refs/ .opencode/ req.txt package.json INSTALL.md USAGE.md`；zip 读回 CRC32 + 尺寸 + 一一映射校验通过 → **无开发期文件/密钥混入发行包**。无 `update_url` → 无自动更新链路（亦无更新签名风险）。 |
| **AI/LLM** | 横切 | ⚠️ 相关 | 无 AI 集成。但**反向**：本扩展产出物是「喂给 AI 的文本」，存在**提示注入间接面**——被复制的响应体可能含针对下游 LLM 的注入指令。扩展侧无缓解（也不应擅自改写，REQ-020 禁止格式化）。属下游使用者的信任边界，登记为信息项 R-04。 |

---

## 3. THREAT_MODEL (STRIDE)

| 威胁 | 风险 | 评估 |
|------|:----:|------|
| **Spoofing**（伪装） | 🟢 低 | 无认证面、无身份、无消息来源。面板仅由浏览器 DevTools 上下文创建，网页无法伪造面板或调用扩展。 |
| **Tampering**（篡改） | 🟢 低 | 扩展为**只读消费者**：只读 HAR，不修改页面请求/响应；不写任何存储。复制文本逐字符保真由 TASK-006 单测（24 例，逐码元比对 `firstDiffCodepoint=-1`）锁定。**唯一可篡改面**：本地 ZIP/未解压目录被第三方替换 → 属分发渠道信任，非本扩展可控。 |
| **Repudiation**（抵赖） | 🟢 低 / N/A | 无多用户、无业务事务、无审计要求（设计 §8 明确"无服务器无持久化 → 无审计日志需求"）。 |
| **Information Disclosure**（信息泄露） | 🟡 **中** | **R-02**：完整请求/响应（含 `Authorization` / `Cookie` / `Set-Cookie` / Token / 业务 PII）落入系统剪贴板，并被设计用于粘贴至第三方（含 AI 服务）。扩展自身**零外传**（无 fetch/XHR/WebSocket/sendBeacon，`check-zero-network` 17/17 PASS；无 storage/localStorage/indexedDB/遥测）。残余风险来自**用户后续粘贴行为 + OS 剪贴板共享**。已有缓解：`privacy.html` 显式敏感信息警示 + 权限仅 `clipboardWrite`。`console` 日志不含任何请求内容（仅面板注册/告警）。 |
| **Denial of Service**（拒绝服务） | 🟡 **中** | **R-01**：内存放大。`normalize()` 保留 `responseContent.text` 原字符串；`store` 环形缓冲按**条数** cap=1000 限流（O(1)，无泄漏），但**无字节总量预算**。满容量 1000 条大响应（HAR `content.text` 单条可达数 MB）可占数百 MB～GB 级内存，导致 DevTools 面板卡死/OOM。超阈值（10MB）检测仅在**复制时**（`isOverThreshold`），**不在捕获时**，故无法阻止驻留。虚拟滚动（`computeWindow` + DOM 复用）已保护**渲染**性能（1000 条 DOM 节点数与可视区相关），但不保护**内存**。设计 §B-5 自认 likely，缓解项「总量软上限日志告警」未实现。**影响限于本地面板**，页面本身不受显著影响（捕获回调轻量、`try/catch` 隔离、rAF 合并刷新）。 |
| **Elevation of Privilege**（提权） | 🟢 低 | 权限最小化经机械验证：`permissions === ["clipboardWrite"]`（`check-manifest` 17/17）；无 `host_permissions` / `<all_urls>` / `tabs` / `webRequest` / `declarativeNetRequest` / `content_scripts` / `background`。**关键**：无 `content_scripts` + 无 host 权限 → **扩展无法接触页面 DOM，网页也无法调用扩展**，双向隔离。`privacy.html` 的 `window.open` 不新增权限（同源扩展页）。 |

---

## 4. AUTH_CHECK

| 项 | 结果 |
|----|------|
| authentication | **N/A** — 无用户/账号/服务认证面（REQ-027/028：无服务器、无遥测、无账号）。 |
| authorization | **N/A（等价物 = 权限模型）** — 浏览器扩展权限模型：仅 `clipboardWrite`（写入剪贴板）。无主机/标签页/网络/后台授权。发行 ZIP 门禁对 permissions 做白名单断言（`package.mjs` + `check-manifest.mjs` 双重）。 |
| principal_guard | **not-needed** — 无跨主体调用、无消息总线、无 `externally_connectable`；唯一主体 = 用户本人在自己 DevTools 内的显式点击（复制操作**必须**用户手势触发，扩展不自动复制——`privacy.html` §你的控制权，代码核对成立：仅 `#copy-btn` click 绑定 `onCopyClick`）。 |

---

## 5. DATA_SECURITY

| 项 | 结果 |
|----|------|
| sensitive_fields | `Authorization` 头、`Cookie` 头、`Set-Cookie` 响应头、`Proxy-Authorization`、请求/响应体中的 Token/密码/API Key、URL query 中的凭证、响应体中的业务 PII（由被调试页面决定，扩展不区分）。**扩展不分类、不脱敏**（REQ-020 禁止任何字符改动 → 有意的设计取舍）。 |
| encryption_at_rest | **not applicable / not needed** — 无持久化（零 storage/indexedDB/localStorage/chrome.storage）。数据仅存活于 DevTools 内存，关闭即销毁。 |
| encryption_in_transit | **N/A** — 零网络代码（`check-zero-network.mjs` 17/17 全 PASS，含反向探针防「空跑假 PASS」：扫描文件数 0 → 直接 FAIL）。数据不离开本机扩展上下文；剪贴板为本地 IPC。 |
| secret_handling | **合规（就扩展自身而言）/ 待用户侧约束** — 全库无硬编码密钥/令牌/私钥（grep `api_key|secret|token|password|BEGIN PRIVATE KEY|AKIA` 仅命中 CSS 注释与 `privacy.html` 警示文案）。**无密钥需轮换**。残余：用户主动复制的敏感内容进入剪贴板（R-02）。 |

---

## 6. COMPLIANCE

| 项 | 结论 |
|----|------|
| **OWASP Top 10 (2021)** | A03 Injection — ✅ 无（全 `textContent`，无动态正则，无 SQL/命令面）；A05 Security Misconfiguration — ✅ 无 CSP 覆盖 → 采用 MV3 默认严格 CSP（`script-src 'self'`），无内联脚本（`panel.html` 仅 `<script type="module" src>`，`devtools.html` 仅外链脚本；`privacy.html` 仅内联 `<style>`，不涉及 script-src）；A08 Software & Data Integrity — ✅ 零依赖 + ZIP CRC 读回；A09 Logging Failures — ✅ 无请求内容落日志；A01/A02/A04/A06/A07/A10 — 不适用（无认证/访问控制业务/加密业务数据/SSRF/脆弱组件/完整性校验场景）。 |
| **OWASP LLM Top 10** | 仅「下游使用」间接相关：复制文本可能携带针对 AI 分析器的间接提示注入（R-04，信息项）——扩展侧不应也无法改写（REQ-020 保真契约优先）。 |
| **GDPR / PII** | **不涉及**（扩展本身不处理账号、支付、身份信息；不收集、不存储、不传输）。`privacy.html` 声明与代码一致。若用户复制的响应恰含 PII，控制权与责任归属用户，属其自行处理。 |
| **PCI-DSS** | 不适用。 |
| **Chrome Web Store 政策** | 权限最小化 + 隐私政策页齐备 → 符合「单一用途 + 最小心权限 + 数据使用披露」基本要求（最终审核未覆盖）。 |

---

## 7. 机械证据（本步复跑）

| 命令 | 结果 |
|------|------|
| `node scripts/check-zero-network.mjs` | **PASS 17/17**（无 fetch/XHR/WebSocket/sendBeacon/chrome.storage/localStorage/sessionStorage/indexedDB/runtime.connect/analytics/telemetry/gtag/mixpanel/sentry/amplitude/posthog） |
| `node scripts/check-manifest.mjs` | **PASS 17/17**（MV3；`permissions===["clipboardWrite"]`；无 host_permissions/tabs/webRequest/declarativeNetRequest/content_scripts/background/`all_urls`；4 图标存在） |
| `node scripts/check-syntax.mjs` | **PASS 11/11** |
| `node scripts/check-panel-shell.mjs` | **PASS 34/34**（DOM 契约 id / 7 列表头 / 零裸中文） |
| `butler_sec_scan`（manifest / panel.js / clipboard.js / content.js） | **R1–R11 全 PASS** |
| grep 注入面（`innerHTML|eval|new Function|document.write|javascript:|srcdoc`） | 仅注释命中 → 无实际使用 |
| grep 动态正则（`new RegExp`） | 0 命中 |
| grep 消息面（`onMessage|externally_connectable|postMessage`） | 0 命中 |
| `package.json dependencies` | 无（零依赖，无 lockfile / node_modules） |

---

## 8. MITIGATIONS（风险 ≥ medium）

### R-01（中·Denial of Service）— 内存放大
**问题**：`normalize` 全量保留 `content.text`；`store` 仅按条数限流，无字节预算。
**建议（按性价比排序，交下游 butler-fix）**：
1. **[推荐] 捕获期字节预算**：`store` 增加 `maxBytes`（如 64 MB），维护 `bytesInUse`；`add()` 时按 UTF-16 长度估算并累加，超预算时按「淘汰最旧」循环释放直到回落（复用现有 `evicted` 事件，`selection.onEvict` 已能处理联动）。改动局部、向后兼容。
2. **超阈值捕获期降级**：`capture.handleRequestFinished` 内对 `content.size > 阈值` 的记录**只存元信息 + `oversize` 标记**，正文置 `null`（`content.classifyBody` 已有 `unavailable` 降级路径）；复制时提示"正文过大未捕获"。
3. **软上限告警**：`bytesInUse` 超 80% 预算时 `console.warn` 一次（设计 §B-5 建议项）。
**验证方法**：新增单测——连续 `add` N 条各 1 MB 记录后断言 `bytesInUse <= maxBytes` 且 `size() < 1000`（字节优先淘汰）；Node 内存 `process.memoryUsage().heapUsed` 前后对比。

### R-02（中·Information Disclosure）— 剪贴板敏感信息外流
**问题**：完整请求/响应（含凭证）进剪贴板，无复制后清理，无二次确认（除大响应外）。
**建议**：
1. **[推荐] 敏感内容复制前提示**：`onCopyClick` 生成文本后做**本地**轻量探测（正则命中 `Authorization`/`Set-Cookie`/`Cookie`/`token=`/`api[_-]?key`/`bearer `），命中则 `confirm()` 二次确认（文案走 i18n，新增键 `copy.sensitiveWarning`）。不修改正文（不破坏 REQ-020 保真）。
2. **可选：剪贴板自动清理**：复制成功后可选延时清空剪贴板（需用户开启；`clipboardWrite` 权限已够）——注意会破坏正常粘贴，**默认关闭**，仅提供开关。
3. **文档强化**：`USAGE.md` 增加「复制前请确认内容可外发」章节（`privacy.html` 已有警示，可交叉引用）。
**验证方法**：单测断言敏感探测函数对 `Authorization: Bearer x` 返回 true、对普通文本返回 false；`confirm` 返回 false 时不调用 `copyText`。

### 低风险 / 信息项（无需阻断，建议顺手处理）
- **R-03（低）`window.open` 缺 `noopener`**：`panel.js:828` `window.open(target,'_blank')`。`target` 取自静态 `href="privacy.html"`，**非不可信输入**，且目标为同源扩展页 → 当前无可利用面。建议改 `window.open(target, '_blank', 'noopener')` 或补 `rel="noopener noreferrer"` 以消除未来 href 被改动时的隐患。
- **R-04（信息）间接提示注入面**：复制文本可能含针对下游 LLM 的注入指令。扩展侧不改写（保真优先）；建议在 `USAGE.md` 加一句「复制内容来自被调试页面，粘贴给 AI 前请自行确认」。
- **R-05（信息）无 CI 依赖审计**：当前零依赖，无实际影响；若引入依赖，必须补 `npm audit`/OSV 门禁与 lockfile 完整性校验。
- **R-06（信息）`check-zero-network.mjs` 为静态关键字扫描**，可被混淆绕过；本次结论依赖**人工全量人读**交叉验证，非该脚本单独背书。

---

## 9. RECOMMENDATION

**WARN — 可发布（发行门不阻断），但必须在发布说明中显式接受 R-01/R-02 两项中风险，并建议在 1.0.x 内落地两项缓解：捕获期字节预算（R-01）与敏感内容复制前确认（R-02）。** 扩展自身攻击面已最小化到教科书水平（零依赖、零持久化、零网络、单一最小权限、无消息面、全 `textContent`），无高危/可利用漏洞；唯一实质残余风险来自「按需求设计」的敏感数据入剪贴板与仅按条数限流的内存模型，二者均属本地用户可控面，不构成远程可利用面。

---

## 10. 知识库写回建议（交编排器/下游，本步不越权写入）

按 Step 5.4 状态机，建议在 `butler/domain/security.md` RISK 登记表新增：

```yaml
risks:
  - description: "capture.normalize 全量驻留 response.content.text，store 仅按条数(cap=1000)限流、无字节预算；大响应高频页面可致面板内存放大/卡死（本地 DoS）"
    probability: "中"
    impact: "中"
    mitigation: "捕获期字节预算（maxBytes + 字节优先淘汰，复用 evict/onEvict 链路）；超阈值捕获期降级为元信息+oversize标记；80% 预算软告警"
    category: "安全"
    surface: "S1(前端/内存)"
    risk_id: RISK-MEM-01
    status: open
  - description: "核心功能将含 Authorization/Cookie/Set-Cookie/Token 的完整请求响应原文写入系统剪贴板，用于粘贴至第三方(含AI)，无复制后清理与二次警示；扩展自身零外传"
    probability: "中"
    impact: "中"
    mitigation: "复制前本敏感探测(正则)+confirm 二次确认(i18n: copy.sensitiveWarning)；可选剪贴板自动清理(默认关)；USAGE.md 强化提示；保留 privacy.html 警示"
    category: "安全"
    surface: "S1(前端)/OS剪贴板"
    risk_id: RISK-EXFIL-01
    status: open
  - description: "window.open(target,'_blank') 未带 noopener；当前 target 为静态同源扩展页，无可利用面，属未来隐患"
    probability: "低"
    impact: "低"
    mitigation: "window.open 加 'noopener' 或 <a> 补 rel=noopener noreferrer"
    category: "安全"
    risk_id: RISK-OPEN-01
    status: open
  - description: "复制文本可携带针对下游 LLM 的间接提示注入指令；扩展按 REQ-020 保真契约不做改写"
    probability: "低"
    impact: "中"
    mitigation: "USAGE.md 提示使用者粘贴给 AI 前自行确认内容来源；属下游信任边界"
    category: "安全"
    risk_id: RISK-LLM-INJ-01
    status: open
```

**未覆盖门禁提醒**：本报告未执行真机浏览器运行时验证（E2E AC-018），建议在 E2E 节点补：① Chrome/Edge 中加载 `extension/`，确认面板注册且控制台无 CSP 违规；② 触发一次真实请求 → 选中 → 复制，确认剪贴板内容逐字符正确且 Toast 正确；③ 触发 >10MB 响应，确认 `confirm` 拦截路径生效。E2E 通过后可将 security_posture 复评为 **PASS**（若 R-01/R-02 缓解落地）或维持 WARN（若显式接受）。
