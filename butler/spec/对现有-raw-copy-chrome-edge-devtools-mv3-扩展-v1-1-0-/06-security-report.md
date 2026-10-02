verdict: WARN

---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
phase: ⑥ 安全审计（fix 管线 · secaudit 节点 · 修复后复评）
agent: butler-sec-auditor
date: 2026-10-02
run: run_muqovhi6_a5jwzk （dag=fix；secaudit=attempt 2）
scope: changed
scope_definition: |
  changed = 本轮修复实际改动的文件（源码 6 + 门禁 1 + 测试 6 + 文档 6 + 计划 1 + E2E 1 + 发行物 1 = 22，见 §1.1）
  affected = 反向依赖面（panel.js 为 contextmenu/multiselection/i18n/detail/formatter/bulkformatter 的唯一生产消费者；
             render.js 的 data-id/data-index 为右键命中链输入；manifest 权限模型；dist/ 发行产物；DevTools panel 外壳）
scope_weight: medium（无 heavy 节点；含发行物 S5 面 → 独立复算）
security_posture: WARN
predecessor: "butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/sec-audit.md（WARN；RISK-EXFIL-01 / RISK-MEM-02 / RISK-DOS-01 / RISK-INTEG-01 / RISK-DOC-01 open）"
---

# 安全审计报告 · 复评 — Raw Copy v1.1.0 三项修复/调整

## 0. 结论摘要

- **SECURITY_POSTURE: WARN** —— **不阻断**本次修复发布；附风险说明 + 2 项已闭环 + 5 条建议。
- **无新增漏洞**：本轮改动未引入注入、提权、数据外传、命令执行、供应链污染；全仓消息面（`onMessage`/`postMessage`/`runtime.sendMessage`）**0 命中**。
- **本轮是安全面的净改善（2 项风险闭环）**：
  1. **RISK-INTEG-01 `open → fixed`**：③「移除分段复制」把 `extractSectionText`（以全文首个固定标记行定位切片）整条删除 —— 该风险本质是「不可信正文可伪造 `===== RESPONSE =====` 劫持输出结构」，**能力移除即风险消除**（非缓解）。独立核验：源码 + 发行包内 **0 命中**（§5.3 / §5.4）。
  2. **RISK-DOC-01 `open → fixed`**：`extension/privacy.html:128` / `:198-202` 已同时披露「单条（默认且主要）」与「Ctrl/Shift 多选 → 复制选中(N) 一次多条」，商店披露与行为一致。
- **WARN 的 4 个理由**（**全部为本地用户可控面或流程卫生项**，无第三方/远程攻击者可达路径）：
  1. **W-1（中·既有风险可达路径 +1）RISK-MEM-02 仍未闭环**：`runCopySelection` 大响应确认仅按**单条**阈值（`DEFAULT_LARGE_THRESHOLD = 10MB`）判定（`panel.js:1177-1192`），对**批总量**无效。本轮 ① 的「已选保留」使右键菜单 `count≥2` 自然成立，批量项由**死规则变为常规可达**，同一风险入口 +1。
  2. **W-2（低·发行面卫生）`dist/` 内并存陈旧产物**：`dist/_unzip/`（16:17）内含**修复前** `panel.js`（独立核验：`runSectionCopy`/`extractSectionText` 命中 8 处），与 `dist/raw-copy-1.0.0.zip`（旧版）共存；且 `docs/DELIVERABLES-CHECKLIST.md:20,57,62` 仍把 **1.0.0** 当作当前交付物（与 v1.1.0 不符）。当前正确发行物 `dist/raw-copy-1.1.0.zip` 经**独立逐字节核验**确认与源码同代（§5.4）。
  3. **W-3（低·门禁缺口）`check-panel-shell.mjs` 的 id 契约是「正向存在清单」**：本轮已同步增 `copy-btn-a/b`、删 3 项，但**无反向断言**「`mode-toggle`/`copy-req-btn`/`copy-resp-btn` 不得再出现」。当前残留为 0（已机械确认），缺口属未来回归防线。
  4. **W-4（低·门禁缺口）`package.mjs` 读回校验只比**长度**不比**内容**：`package.mjs:585` 断言 `expected.length !== e.data.length`，等长篡改可穿透。本轮产物经审计**独立逐字节**核验通过（非依赖该门禁）。

> 判定为 **WARN 而非 REJECT**：全部控制项（零网络 / 最小权限（仅 `clipboardWrite`）/ 全 `textContent` 无 `innerHTML` / 零第三方依赖 / ZIP 白名单 + 读回 / 发行物与源码同代）均经**本审计独立复跑或独立复算**验证为 PASS；W-1..W-4 均属本机用户可控面或流程卫生项，不构成对第三方或远程攻击者的可利用面。

---

## 1. 范围与未覆盖清单（INV-1）

### 1.1 审计范围（scope = changed，实证 mtime 窗口 16:34–16:46 + 清单交叉核对）

| 类别 | 文件 | 安全相关性 |
|---|---|---|
| 源码 | `extension/panel.js` | **高**（唯一 DOM 渲染/事件/剪贴板汇聚点） |
| 源码 | `extension/src/contextmenu.js` | 中（菜单模型；纯逻辑零 DOM） |
| 源码 | `extension/src/multiselection.js` | 中（新增 `extendTo` 集合运算） |
| 源码 | `extension/src/i18n.js` | 中（键集增删 + `{count}/{size}` 插值面） |
| 外壳 | `extension/panel.html` | 中（新增 `#copy-btn-a/b`；删 toggle/分段按钮） |
| 外壳 | `extension/styles/panel.css` | 低 |
| 门禁 | `scripts/check-panel-shell.mjs` | 中（契约断言面） |
| 测试 | `tests/{contextmenu,multiselection,i18n,formatter,bulkformatter}.test.mjs`、`tests/panel-harness.mjs`（新） | 低（**不随包发行**，已核验） |
| 文档 | `tests/test-cases.md`、`tests/README.md`、`USAGE.md`/`docs/USAGE.md`、`INSTALL.md`/`docs/INSTALL.md` | 低（披露准确性） |
| 计划 | `butler/plan/…功能增/plan.md`（ADR-014 重裁） | 低 |
| E2E | `butler/spec/…功能增/e2e-artifacts/harness/run-e2e.mjs` | 低（**不随包发行**） |
| 发行 | `dist/raw-copy-1.1.0.zip` | **高**（S5，已独立复算 sha256） |

> 合计 22 个改动文件；另审计独立观察 `dist/_unzip/`、`dist/_verify/`、`dist/raw-copy-1.0.0.zip`（非改动，属 S5 现状）。

### 1.2 受影响面（affected · 反向依赖）

- `extension/panel.js` 是 `contextmenu.js` / `multiselection.js` / `i18n.js` / `detail.js` / `formatter.js` / `bulkformatter.js` 的**唯一生产消费者**（已 grep 确认）→ 三个模块的改动爆炸半径收敛于面板内。
- `extension/src/render.js:248-252` 写入的 `data-id` / `data-index` 是右键命中链（`resolveRowId` → `panel.js:1527-1530`）的输入 —— 该文件**本轮未改**，仅做契约核对（键名/类型/还原逻辑未变）。
- `formatter.js` / `bulkformatter.js` **冻结未改**，其产物契约被 A/B 按钮与批量入口复用 → 以 affected 141 用例（含 A/B golden 逐字符断言）证明契约未破。
- `manifest.json` / `extension/` 权限模型：**零字节变化**（独立核验，§5.5）。

### 1.3 未覆盖清单（明确声明：未覆盖 ≠ 无风险）

| # | 未覆盖项 | 原因 | 承接 |
|---|---|---|---|
| U-1 | **真机 E2E 未复跑**（本轮新增/改动的真机断言：③移除负向断言、多选态右键→批量项→N 段、混合修饰键并集） | 本审计环境无可用 Chrome/Edge + CDP 装载条件 | `04-execution-summary §7 R-4` |
| U-2 | `extension/src/{store,capture,content,clipboard,filter,render,selection,formatter,bulkformatter,detail}.js` 的**全量复审** | 非本轮改动（scope=changed） | 前次 `sec-audit.md` 已覆盖；发布前建议 full 巡检 |
| U-3 | **Edge 特有行为**与**商店上架合规**（MV3 商店政策 / 数据使用披露审核） | 超出技术安全审计范围 | 发布流程 |
| U-4 | **AI 横切 RISK-LLM-INJ-01** 的下游缓解 | 复制文本本身即交付物，扩展侧无法缓解 | 保持 open（已知接受） |
| U-5 | 对抗性 fuzz / 模糊测试 | 本轮为**删除**一个解析器、新增 0 个解析器，无新增解析面 | 无需 |
| U-6 | `butler/` 流水线自身产物（`plan/`、`tasks/`）的安全审查 | 非运行时面 | — |
| U-7 | `dist/raw-copy-1.0.0.zip` 内部逐条复审 | 历史产物，非本次发行物 | 见 W-2 建议 |
| U-8 | **全量测试套件（283 用例）未跑** | 宪法「迭代内作用域契约」：scope=changed 只跑 affected（141）；全量属发布门 | 发布门 / `butler-tester` 全量 |

---

## 2. 五面攻击面核对（S1–S5 + AI 横切）

| # | 面 | 本轮核对结论 | 证据（本审计独立复跑） |
|---|---|---|---|
| **S1** | 前端/扩展 UI | ✅ **PASS** | 全仓 `innerHTML/outerHTML/insertAdjacentHTML/document.write/srcdoc/eval(/new Function/javascript:` **0 功能性命中**（3 处均为注释，见 §5.3）；`renderRow`/`renderMenuItems`/`toast`/`detail` 全部 `textContent`；无 token/凭证存储（`localStorage/sessionStorage/indexedDB/chrome.storage/document.cookie` 0 命中）；无 CORS 面；无敏感数据外发 |
| **S2** | 后端 | **N/A** | 该扩展**无后端**；`check-zero-network` 独立复跑 **17/17 PASS**（`fetch(`/`XMLHttpRequest`/`WebSocket`/`sendBeacon` 全 0）。等价项 = MV3 默认 CSP + 无 inline script（`panel.html` 仅 `:163` 一处 `<script type="module" src="panel.js">`，无 `on*=` 内联处理器） |
| **S3** | 桌面 | **N/A**（浏览器扩展无 sidecar/updater） | 等价项：manifest 顶层键**全集枚举** = `manifest_version/name/version/description/devtools_page/permissions/icons`；无 `nativeMessaging`、无 `externally_connectable`、无 `web_accessible_resources`、无 `update_url`、无 `content_scripts`、无 `background`（§5.5） |
| **S4** | 供应链 | ✅ **PASS** | 零第三方运行时依赖：`package.json` **无 `dependencies`/`devDependencies`**；无 `package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`（不存在）；`package.mjs` 独立复跑断言「全部 import specifier 均为相对路径」PASS；`extension/**` 全部 import 均为 `./` 相对路径（实证 grep） |
| **S5** | 发行/部署 | ⚠️ **WARN（W-2）** | `dist/raw-copy-1.1.0.zip` 经**独立逐字节核验** 25/25 与当前源码同代（§5.4）；但 `dist/` 并存 `_unzip/`（含**修复前** `panel.js`，8 处 `runSectionCopy`/`extractSectionText`）、`raw-copy-1.0.0.zip`，且 `docs/DELIVERABLES-CHECKLIST.md` 仍指向 1.0.0，无门禁区分当前发行物 |
| **AI** | LLM01-10 横切 | ⚠️ **告知性**（扩展侧不可缓解） | `RISK-LLM-INJ-01`：复制产物（不可信网络正文）可对下游 LLM 形成间接提示注入。本轮 ③ 移除分段复制**收窄**了「结构被伪造」子面，但 `===== REQUEST/RESPONSE =====` 段标记仍按设计契约原样输出。无 API key 明文、无安全控制委托 LLM |

---

## 3. STRIDE（本轮改动）

| 类别 | 风险 | 说明 |
|---|:--:|---|
| **S**poofing | **无** | 该扩展无认证/身份概念；DevTools panel 为 per-user 本地上下文 |
| **T**ampering | **低**（较前次↓） | 不可信网络正文 → DOM/剪贴板。DOM 写入全 `textContent`（无代码执行）；**输出结构伪造面因 ③ 删除 `extractSectionText` 而消除**（RISK-INTEG-01 闭环）。新增 `extendTo` 为纯集合运算，无输入可信假设 |
| **R**epudiation | **无** | 无审计/不可否认需求；无持久化 |
| **I**nformation Disclosure | **中**（既有 open） | `RISK-EXFIL-01`：按需求把含 `Authorization`/`Cookie`/token 的完整请求+响应原文写入系统剪贴板。本轮**量级未变**（批量入口原已存在），但**可达路径 +1**（右键批量项由死规则变常规可达）。新增 `renderMenuItems` 只渲染常量 `id`/`action` + i18n 文案 + 数值 `{count}`，**无正文入菜单** |
| **D**enial of Service | **中**（既有 open） | `RISK-MEM-02`（批总量无门禁，见 W-1）、`RISK-DOS-01`（`openDetailRecord` → `detailView.open` 无体积门禁，`panel.js:1630-1642` → `detail.js:164` 直接物化全文）。均**本地自伤**，无远程放大 |
| **E**levation of Privilege | **低** | 权限集**未变**且为最小集：`permissions: ["clipboardWrite"]`，无 `host_permissions`、无 `tabs/webRequest/scripting/cookies/history/management/identity`；无 `eval`/`new Function`；`window.open` 目标为**包内同源静态页**（`href` 常量） |

---

## 4. 改动逐项安全审查

| 改动 | 安全判定 | 说明 |
|---|:--:|---|
| `multiselection.js` 新增 `extendTo(index)` | ✅ 无风险 | 纯集合运算（`selected` 并集，**不 `clear`**）；`anchor` 不变；越界/空槽 `return false`；无 I/O、无 DOM、无网络 |
| `contextmenu.js` 移除 P2（`CTX_ACTION/CTX_ITEM_ID` 成员、`canCopyRequestOnly` 入参、`p2` 字段） | ✅ **净改善** | 删除一个「以不可信输出为输入」的能力面；`createMenuModel` 收敛为「主项 + count≥2 批量项」，项集/`id`/`action` 全部来自模块常量；`count` 经 `Number.isFinite + Math.floor` 归一化 |
| `panel.js` `onContextMenu` 语义统一（已选保留 / 未选替换） | ✅ 无风险 | `resolveRowId` 保持「绝不抛异常 + 包含性校验」；`multi.has(rowId)` 判定后**最多**调用 `selectAt(index)`；未命中直接 `return`（不弹、不改、不抛） |
| `panel.js` ③ 移除 `extractSectionText`/`buildSectionCopy`/`runSectionCopy` + 分派分支 + 按钮接线 | ✅ **风险消除** | 独立 grep：源码 + 发行包内 `panel.js` **0 命中**；`REQUEST_SECTION/RESPONSE_SECTION` 仅作为**输出**常量保留于 `formatter.js`（不再用于定位/切片） |
| `panel.js` ② A/B 双按钮（删 `copyMode`/`setCopyMode`） | ✅ 无风险 | 模式经白名单 `normalizeMode`（`:102`，仅 `MODE_B` → B，其余 → A）；`modeFromButton` 读 `data-copy-mode` 常量枚举；**消除可变模块级状态**（减少状态混淆面） |
| `panel.js` `renderMenuItems` / `openMenuAt` | ✅ 无风险 | `btn.id`/`data-action` 源自常量；文案 `t(i18nKey, vars)` 经 `textContent`；定位 `menu.style.left/top = finite 数值 + 'px'`（`clampPosition` 内 NaN/Infinity → 0），**无字符串拼接进样式/属性** |
| `i18n.js` 键增删（+`mode.aButton/bButton`，−4 个 P2 键、−`mode.label`） | ✅ 无风险 | 插值 `text.replace(/\{(\w+)\}/g, …)` 产物仅进 `textContent`；插值变量为**数值**（`count`）或 `formatSize` 受控产物；zh/en 键集对齐由 `i18n.test.mjs` 断言（随 141 全绿） |
| `panel.html` 新增 `#copy-btn-a/b`（`data-copy-mode`） | ✅ 无风险 | 无内联脚本、无 `on*=`、无 `javascript:`（实证 grep）；唯一脚本入口 `<script type="module" src="panel.js">` |
| `panel.css` | ✅ 无风险 | 纯样式；本轮移除 `.mode-toggle*` 选择器 |
| `scripts/check-panel-shell.mjs` | ⚠️ W-3 | 脚本自身**无 `child_process`/`exec`/`spawn`**（实证 grep），纯进程内文本解析；正向 id 清单已同步，缺反向断言 |
| `tests/panel-harness.mjs`（新） | ✅ 无风险 | 手写 duck-typed DOM + 真实 `import` `panel.js`；**不随包发行**（zip 25 条目清单已核验，无 `tests/`）；无 `eval`/`child_process`/网络/写盘 |
| `dist/raw-copy-1.1.0.zip` | ✅ 同代 | §5.4 独立逐字节核验 25/25 |

### 4.1 工具扫描的 2 处 REJECT = **确认误报**（本审计独立复现 + 定位）

`butler_sec_scan` 对 `extension/panel.html` 与 `scripts/check-panel-shell.mjs` 报 `R1 命令注入 REJECT`，经独立定位为**假阳性**：

- `panel.html`：触发字符为 **HTML 注释内的 Markdown 行内反引号**（实证：`:76` `` `multi.*` ``、`:118` `` `data-copy-mode` ``、`:134` `` `contextMenus` ``）。HTML 无 shell 语义，且该文件**不含任何脚本代码**（唯一 `<script>` 为外部 module 引用）。
- `check-panel-shell.mjs`：触发字符为**模板字面量定界符反引号**（实证：`:74` `ch === '`'`、`:90` 三元表达式）。该脚本**无 `child_process`/`exec`/`spawn`**（实证 grep），为纯进程内文本解析。
- 结论：两者均**非真实命令执行/代换**，不构成阻断项。

（其余 6 个改动文件 `butler_sec_scan` 独立复跑 **R1-R11 全 PASS**：`panel.js`/`multiselection.js`/`contextmenu.js`/`i18n.js`/`panel.css`/`panel-harness.mjs`。）

---

## 5. 独立验证证据（不采信上游自述）

### 5.1 门禁复跑（本审计独立执行，取退出码）

```
node scripts/check-syntax.mjs        → [check-syntax] 15/15 files passed            exit=0
node scripts/check-manifest.mjs      → == RESULT: PASS (17/17 项) ==                exit=0
node scripts/check-panel-shell.mjs   → == RESULT: PASS (41/41 项) ==                exit=0
node scripts/check-zero-network.mjs  → == RESULT: PASS（18 文件扫描 / 17 项通过）    exit=0
```

### 5.2 affected 回归复跑（scope=changed 口径）

```
node --test tests/i18n.test.mjs tests/multiselection.test.mjs tests/formatter.test.mjs \
           tests/bulkformatter.test.mjs tests/contextmenu.test.mjs
ℹ tests 141   ℹ pass 141   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0    exit=0
```

### 5.3 静态安全基线（机械 grep，全仓 `extension/`）

```
innerHTML|outerHTML|insertAdjacentHTML|document.write|srcdoc|eval(|new Function|javascript:  → 0 功能性命中
    （仅 3 处注释：panel.js:1813 / panel.html:143 / clipboard.js:21）
chrome.scripting|cookies|tabs|runtime.sendMessage|storage|localStorage|sessionStorage|
indexedDB|document.cookie|fetch(|XMLHttpRequest|WebSocket|sendBeacon                        → 0 命中
extractSectionText|buildSectionCopy|runSectionCopy|COPY_REQUEST_ONLY|COPY_RESPONSE_ONLY|
canCopyRequestOnly                                                                           → 0 命中
mode-toggle|copy-req-btn|copy-resp-btn                                                       → 0 命中
window.open                                                                                  → 1 功能性（panel.js:1841，目标为包内同源静态页）
```

> 说明：`chrome.devtools.*`（`devtools.js` / `capture.js`）为 DevTools 扩展必需 API，**不消耗权限**且不为远程可控面。

### 5.4 发行物同代性核验（**独立逐字节**，非 mtime 推断、非采信 `package.mjs` 的长度断言）

以打包器同口径（对 `.js` 复刻 `package.mjs:125-143` 的整行注释/空白剥离）把 `dist/raw-copy-1.1.0.zip` 的每个条目与**当前源码**逐字节比对：

```json
{ "zipEntries": 25, "same": 25, "byteDiff": [], "lengthDiff": [], "onlyZip": [], "onlySrc": [] }
```

→ **25/25 条目逐字节一致**（含 `panel.js`/`contextmenu.js`/`multiselection.js`/`i18n.js`/`panel.html`/`manifest.json`/`styles/panel.css`/`privacy.html`），**无旧版内容、无缺项、无多余项**。
发行包内语义抽查：`copy-selected`=**present**、`extendTo`=**present**、`canCopyRequestOnly`=**absent**、`runSectionCopy`=**absent**、`extractSectionText`=**absent**、`copy-req-btn`=**absent**、`mode-toggle`=**absent**、`innerHTML`=**absent**。

```
dist/raw-copy-1.1.0.zip  sha256 = 5d352ef3ac39239cdd5543fd555a9e6dbceb3a2942b237f0261f33b96a5ca8e5
dist/raw-copy-1.0.0.zip  sha256 = 4cbf9871cdec64589d480e7c2e702380ea055dede344fa48c24e985080dfc56f  （旧版，非本次发行物）
zip 条目 = 25（LICENSE + extension/** 展平；**无** tests/ scripts/ butler/ docs/ req.txt package.json）
```

### 5.5 最小权限枚举（manifest 顶层键**全集**）

| 键 | 值 | 判定 |
|---|---|---|
| `manifest_version` | `3` | ✅ |
| `name` / `version` / `description` | `Raw Copy` / `1.1.0` / （含「单条或多条」「不发起网络请求、不持久化数据」披露） | ✅ 披露与行为一致 |
| `devtools_page` | `devtools.html` | ✅ 最小集 |
| `permissions` | `["clipboardWrite"]` | ✅ 最小集；本轮**未变** |
| `icons` | 16/32/48/128（文件均存在） | ✅ |
| `host_permissions` / `optional_permissions` / `optional_host_permissions` | **不存在** | ✅ |
| `externally_connectable` / `web_accessible_resources` / `update_url` / `content_scripts` / `background` / `nativeMessaging` | **不存在** | ✅ |

---

## 6. RISK 登记表状态机（本轮迁移）

| RISK | 迁移 | 依据（本审计独立证据） |
|---|---|---|
| **RISK-INTEG-01** | `open → **fixed**` | ③ 移除分段复制：`extractSectionText` 在源码 + 发行包 **0 命中**（§5.3/§5.4）。风险成因（不可信正文伪造 `===== RESPONSE =====` 劫持切片）随能力一并消失 |
| **RISK-DOC-01** | `open → **fixed**` | `extension/privacy.html:128`「一条或多条」+ `:198-202`「单条（默认且主要）」与「Ctrl/Shift 多选 → 复制选中(N) 一次多条」；`USAGE.md` 声明分段复制移除；根/`docs/` 镜像一致 |
| **RISK-REL-01** | `fixed → **verified**` | §5.4 独立逐字节核验 25/25 同代（`sha256 5d352ef3…`，非 mtime 推断）。**遗留**：`package.mjs` 仍无「`max(extension/** mtime) ≤ zip mtime`」新鲜度断言 |
| **RISK-MEM-02** | `open → open（可达路径 +1）` | `panel.js:1177-1192` 仅按单条 `isOverThreshold`（`content.js` 10MB）判定，批总量无门禁；① 的「已选保留」使右键批量项由死规则变常规可达（REQ-003 预期） |
| **RISK-EXFIL-01** | `open → open（未变 + 路径 +1）` | 本轮未改变剪贴板外流性质与量级（批量入口原已存在）；右键批量项可达性提升 |
| **RISK-DOS-01** | `open → open（未变）` | `openDetailRecord`（`panel.js:1630-1642`）→ `detail.js:164` `setProp(body,'textContent', safeResolveText(id))` 直接物化全文，无体积门禁；本轮未触及 |
| **RISK-OPEN-01** | `open → open（未变）` | `panel.js:1841` `window.open(target, '_blank')` 无 `noopener`；`target` 取自 `panel.html` 静态 `href`（包内同源），**实际可利用性极低** |
| **RISK-GATE-01** | `open → open（+2 证据）**加强**` | 证据 A：`check-panel-shell.mjs` 为正向 id 存在清单，**无「已删 id 不得再现」反向断言**（W-3）。证据 B：`package.mjs:585` 读回只比**长度**不比**内容**（等长篡改可穿透，W-4）；另有既往证据（manifest 同级扩权键未枚举 / keyword 扫描可绕过 / 无产物新鲜度断言） |
| **RISK-LLM-INJ-01** | `open → open（子面收窄）` | ③ 移除分段复制降低了「结构伪造」子面；段标记仍按契约输出 |
| **RISK-REL-02** | `open → open（+1 证据）` | `dist/` 内并存 `_unzip/`（**含修复前** `panel.js`，8 处 `runSectionCopy`/`extractSectionText`）与 `raw-copy-1.0.0.zip`；无门禁区分当前发行物 |
| **RISK-DOC-02**（新） | `new → open` | `docs/DELIVERABLES-CHECKLIST.md:20,57,62` 仍把 `dist/raw-copy-1.0.0.zip` 当作当前交付物（与 v1.1.0 不符）；`docs/MILESTONES.md:136` 同。属发行文档漂移（低） |

### 本轮新 pattern（跨项目通用）

- (2026-10-02) [审计] **门禁的「读回校验」可能只比长度不比内容**：`package.mjs` 的读回断言为 `expected.length !== e.data.length`，对**等长篡改**完全无感。凡声称「产物 = 源码」的门禁，审计必须确认其比对是**逐字节**还是**长度**，并独立复算最少一次逐字节核验。
- (2026-10-02) [审计] **「能力删除」类修复要按 `fixed` 而不是 `mitigated` 登记**：`extractSectionText` 整条移除使攻击面**不存在**，证据应为「源码 + 发行包双 0 命中」；勿因「没加防护代码」而低估修复等级。
- (2026-10-02) [审计] **交互语义变更会提升既有风险的可达性**：右键「已选保留」把右键批量项从死规则变为常规可达，风险**性质/量级不变但可达路径 +1**。审计应把「可达性」单列为既有风险的状态变更证据，而非视为无变化。

---

## 7. 修复建议（按优先级，只读建议 —— 交由 `butler-fix` / `butler-dev` 落地）

| # | 优先级 | 建议 | 落点 | 验证方法 |
|---|---|---|---|---|
| 1 | **中** | 批量复制增加**批总量**门禁：`Σ contentByteSize(records)` 超预算（建议 = 单条阈值 10MB 复用，或独立常量如 32MB）时复用既有 `confirmLargeSelection` 一次确认 | `panel.js` `runCopySelection`（`:1177-1192`） | 单测：60×50KB（Σ≈2.95MB）→ 无 confirm（现状）；60×1MB（Σ=60MB）→ **必须** confirm；取消 → 剪贴板不变 |
| 2 | **中** | `openDetailRecord` 增加体积门禁（超阈值 → 只展示头部截断 + 提示，或先 `confirm`），与复制路径口径一致 | `panel.js:1630-1642` / `src/detail.js:164` | 单测：构造 20MB 正文 → 断言不物化完整字符串 / 弹确认 |
| 3 | **低** | `package.mjs` 读回改为**逐字节**比对（替换 `:585` 的长度断言为 `expected.equals(e.data)`）；并增加「`max(extension/** mtime) ≤ zip mtime`」新鲜度断言 | `scripts/package.mjs:568-603` | 人为改一字节等长内容 → 门禁必须 FAIL；touch 源码不重打包 → 门禁必须 FAIL |
| 4 | **低** | ① 清理 `dist/_unzip/`、`dist/_verify/`（改为打包期临时目录或加 `.gitignore`）；② 归档/移出 `dist/raw-copy-1.0.0.zip`；③ `package.mjs` 增「`dist/` 内仅允许当前 version 的 zip」断言；④ 刷新 `docs/DELIVERABLES-CHECKLIST.md` / `docs/MILESTONES.md` 中的 1.0.0 引用 | `scripts/package.mjs` / `dist/` / `docs/*` | 复跑 `package.mjs` 三项门禁 + `ls dist/` 仅 1 个 zip + `rg "raw-copy-1.0.0" docs/` 0 命中 |
| 5 | **低** | `check-panel-shell.mjs` 增补**反向断言**：`forbiddenIds = ['mode-toggle','copy-req-btn','copy-resp-btn']` 必须 0 命中；并断言 `#copy-btn-a/b` 各自 `data-copy-mode` ∈ {A,B} | `scripts/check-panel-shell.mjs` | 人为注入 `id="mode-toggle"` → 门禁必须 FAIL |
| 6 | **低** | `window.open(target, '_blank', 'noopener,noreferrer')`（防御性，尽管目标为包内同源页） | `panel.js:1841` | 静态断言 / 手工点击 |

---

## 8. 门禁与机读结论

```text
---SEC_START---
doc: 06-security-report
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
run: run_muqovhi6_a5jwzk
date: 2026-10-02
agent: butler-sec-auditor
scope: changed
scope_files: 22
uncovered: [U-1..U-8]
security_posture: WARN
verdict: WARN
new_vulnerabilities: 0
risk_transitions:
  RISK-INTEG-01: open  -> fixed      # ③ 移除分段复制；源码+发行包双 0 命中
  RISK-DOC-01:   open  -> fixed      # privacy.html:128 / 198-202 披露一致
  RISK-REL-01:   fixed -> verified   # 独立逐字节核验 25/25 同代
  RISK-MEM-02:   open  -> open       # 批总量仍无门禁；可达路径 +1
  RISK-EXFIL-01: open  -> open       # 量级不变；可达路径 +1
  RISK-DOS-01:   open  -> open
  RISK-OPEN-01:  open  -> open
  RISK-GATE-01:  open  -> open       # +2 证据（无反向断言 / 读回只比长度）
  RISK-LLM-INJ-01: open -> open      # 子面收窄
  RISK-REL-02:   open  -> open       # dist/ 陈旧产物混杂（+docs 指向 1.0.0）
  RISK-DOC-02:   new   -> open       # 交付清单仍指向 1.0.0
attacksurface:
  S1_frontend: PASS
  S2_backend: N/A
  S3_desktop: N/A
  S4_supply_chain: PASS
  S5_release: WARN
  AI_crosscut: WARN(informational)
gates_reproduced: {check-syntax: "PASS 15/15", check-manifest: "PASS 17/17", check-panel-shell: "PASS 41/41", check-zero-network: "PASS 17/17"}
tests_reproduced: {scope: changed, total: 141, pass: 141, fail: 0}
release: {artifact: dist/raw-copy-1.1.0.zip, sha256: 5d352ef3ac39239cdd5543fd555a9e6dbceb3a2942b237f0261f33b96a5ca8e5, entries: 25, same_generation: true, method: byte-by-byte}
false_positives: ["panel.html R1(注释内反引号)", "check-panel-shell.mjs R1(模板字面量定界符)"]
warn_reasons: [W-1 批总量门禁缺失(RISK-MEM-02), W-2 dist 卫生(RISK-REL-02/DOC-02), W-3 无反向 id 断言, W-4 package.mjs 读回只比长度]
verdict_reason: 无新增漏洞；2 项风险闭环 + 1 项 verified；WARN 由 4 项既有/流程项触发（均为本地可控面或流程卫生，无远程可达路径）
---SEC_END---
```

---

## 9. 知识回写

| 资产 | 动作 |
|---|---|
| `butler/domain/security.md` | RISK 登记表状态迁移（§6）+ changelog 追加 + 3 条新 pattern |
| `butler/learned/sec-auditor.md` | Round 记录追加（第二次审计 · fix 管线复评） |
| `butler/memory/` | 本报告归档 + 审计记忆条目 |

> 本报告为**只读审计**：未修改任何业务代码（`extension/**` / `scripts/**` / `tests/**`）；审计期间仅运行既有门禁与 affected 测试（均无写操作）。
