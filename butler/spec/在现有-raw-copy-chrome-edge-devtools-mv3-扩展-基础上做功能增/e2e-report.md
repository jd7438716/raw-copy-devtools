verdict: PASS
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
phase: ⑥.1 UI/E2E 验收
date: 2026-10-02
executor: butler-e2e-verifier
browser: "真实 Chromium：Google Chrome 152.0.7977.84 + Microsoft Edge 154.0.4258.48"
app_target: Chrome/Edge DevTools MV3 扩展「Raw Copy」panel.html（静态包；无 npm run dev / dev server）
extension_load: "CDP Extensions.loadUnpacked（真实「加载已解压」，真实发行代码）"
harness: "e2e-artifacts/harness/{cdp.mjs,run-e2e.mjs} 零依赖；仅桥接 chrome.devtools.network.onRequestFinished 事件源 + clipboard 可观测包装，其余为发行代码"
checks: "20 / 20（Chrome）· 20 / 20（Edge）"
console_errors: 0
csp_violations: 0
unit_tests: "264/264 pass / 0 fail"
static_gates: "check-syntax 15/15 · check-manifest 17/17 · check-zero-network 17/17 · check-panel-shell 42/42"
touches_source: NO（extension/**、tests/**、scripts/** 仅读取）
open_items: "G-2 tests/README.md 测试表滞后(P4，非本任务绑定)；G-3 Edge readText 环境观察；e2e-test-plan.md 声明输入缺失([MISSING_CONTEXT])"
covers: AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 DEL-001 DEL-002 DEL-004 DEL-005 DEL-007 REQ-001 REQ-002 REQ-003 REQ-005 REQ-006 REQ-008 REQ-013 REQ-015 REQ-016 REQ-017
---

# E2E 测试报告 — Raw Copy 增强版（右键菜单 / 多选复制 / 双击明细）

> 执行者：butler-e2e-verifier ｜ 日期：2026-10-02 ｜ Phase ⑥.1（spec 含 type=ui，触发本步）
> 被测：`extension/`（`panel.html` / `panel.js` / `src/contextmenu.js` / `src/detail.js` / `src/multiselection.js` / `src/bulkformatter.js` / `src/formatter.js` / `src/clipboard.js` / `src/i18n.js` …）
> 只读执行：**未修改任何业务代码**；本任务仅运行验证与产出报告/原始结果。

---

## 0. 上下文与预期来源（不可篡改）

| 项 | 结果 |
|----|------|
| 本步声明输入 `butler/requirements/e2e-test-plan.md`（F-73，butler-e2e-planner 产出） | **缺失** → 记录 `[MISSING_CONTEXT]`（`butler/file-registry.md` 标记 ⏳；本仓库历次 E2E 均缺此文件） |
| 预期结果来源（设计阶段冻结） | `spec.md` / `spec.json`（AC-001..017 + REQ-001..024 + DEL-001..008）+ `design.md`（ADR-013 自绘菜单 / ADR-015 批量模板 / ADR-017 明细口径）+ 既有 `e2e-artifacts/harness/run-e2e.mjs` 冻结断言 |
| 未新增/篡改任何预期 | **是**——执行阶段只对「设计阶段冻结的期望条件」与实测做 PASS/FAIL 比对，预期逐字未改 |

### 0.1 环境适配说明（为什么不是 `npm run dev`）

扩展是**静态 MV3 包**，不存在可启动的本地应用/开发服务器。本步的「启动应用」定义为：
**在真实 Chromium（Chrome 与 Edge）中以「加载已解压」装载 `extension/` 的真实发行代码，并打开真实面板页 `panel.html` 驱动全部交互**。

仅有的两处「测试替身」：① `chrome.devtools.network.onRequestFinished` 事件源（真实 HAR 事件无法从脚本注入）；② clipboard 写入的可观测包装（仅观测，行为不变）。
`capture.normalize`、`store`、`filter`、`render`、`selection`、`multiselection`、`contextmenu`、`bulkformatter`、`detail`、`formatter`、`clipboard`、`i18n` **全部为真实发行代码**。

---

## 1. 摘要

| 指标 | Chrome | Edge |
|------|:------:|:----:|
| 断言项（每浏览器） | 20 | 20 |
| 通过 | **20** | **20** |
| 失败 | 0 | 0 |
| 跳过 | 0 | 0 |
| 控制台错误 | **0** | **0** |
| CSP 违规 | **0** | **0** |
| 面板就绪 / 采集链自证 | true / true | true / true |
| 扩展 ID（loadUnpacked） | `iieicollgmbkdpmcnljkjdfndkbmdagk` | `iieicollgmbkdpmcnljkjdfndkbmdagk` |
| 截图 | 4 张 | 4 张 |

**结论：`verdict = PASS`。** 页面可访问、零控制台错误、零 CSP 违规；右键菜单 / 多选复制 / 双击明细的核心元素与交互全部存在且行为正确；关键截图断言通过。本增强绑定的 UI 类 AC（AC-001/002/003/008/009/010/011）+ 多选实机抽查（AC-005/006）+ DEL-007 在 **Chrome 与 Edge 双端全部 PASS（0 FAIL）**。

---

## 2. 环境与启动方式（可复现）

### 2.1 浏览器与版本（本次实测）

| 浏览器 | 版本 | 可执行文件 |
|--------|------|-----------|
| Google Chrome | `Chrome/152.0.7977.84` | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Microsoft Edge | `Edg/154.0.4258.48` | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |

Node：`v24.15.0`。

### 2.2 启动命令（真实、已执行）

```
chrome.exe / msedge.exe
  --remote-debugging-port=9351        # Edge: 9352
  --user-data-dir=<os.tmpdir>\rawcopy-e2e-<browser>-<port>
  --no-first-run --no-default-browser-check
  --enable-unsafe-extension-debugging
  about:blank
```

扩展装载（CDP 浏览器域）：`Extensions.loadUnpacked({ path: "D:\\xiaozhai.dev\\chrome_extension2\\extension" })` → 返回扩展 ID（真实「加载已解压」；Chrome ≥137 已禁用 `--load-extension`，故统一走官方推荐的 CDP 路径）。

### 2.3 面板驱动方式

1. `Target.createTarget(about:blank)` → `Page.addScriptToEvaluateOnNewDocument(INIT)` 注入加载前桥接脚本；
2. `Page.navigate(chrome-extension://<id>/panel.html)` → 面板真实模块代码执行（`installCapture` 真实注册 `onRequestFinished` 监听，`listeners=1` 自证）；
3. `Runtime.evaluate` 以真实 DOM 事件驱动交互（`contextmenu` / `click` / `dblclick` / `keydown Escape` / `mousedown` / `scroll` / `blur`）；
4. 剪贴板真源：**Windows 系统剪贴板**（`powershell Get-Clipboard` 读回，LF 规范化后比对），页面 `navigator.clipboard.readText()` 交叉核对。

---

## 3. 逐条断言表（预期 ← 设计阶段冻结；结果 = 实测）

> 表内「✅✅」= Chrome PASS + Edge PASS。双端实测原值**逐字符一致**，**无 ❌**。证据取自本次新产 `e2e-artifacts/results-{chrome,edge}.json`。

| # | 断言键 | 冻结预期 | 实测（Chrome ≡ Edge） | 截图 | 结果 |
|:-:|:------:|----------|----------------------|------|:----:|
| 1 | ENV | mock 桥 + 真实 `installCapture` 注册 1 个监听；3 条 HAR → 3 行 | `listeners=1`；3 行，`data-id=1/2/3` | — | ✅✅ |
| 2 | **AC-001** | 右键任一请求行 → 该行被选中 + 面板内自绘菜单弹出，至少含「复制请求 + 响应（原始）」 | `menu.hidden=false`；`items=["copy-request-response","copy-request-only","copy-response-only"]`；主项文案 `复制请求 + 响应（原始）`；`row.cls='row is-selected'`、`aria-selected=true` | `E2E-ctx-menu-*` | ✅✅ |
| 3 | **AC-002**（模式 A） | 菜单主项剪贴板产物 === 底部 `#copy-btn` 产物（逐字符） | `menu===btn:true`；系统剪贴板 `OSclipboard(menu)===OSclipboard(btn):true`；`menuOsMatched:true / btnOsMatched:true`；`===冻结 oracle:true` | `E2E-ctx-menu-*` | ✅✅ |
| 4 | **AC-002b**（模式 B） | 同上，模式 B（纯原始，无标题） | `menu===btn:true`；`===oracle(B):true`；系统剪贴板相等 | — | ✅✅ |
| 5 | **AC-003**（P2） | 菜单「仅复制请求」「仅复制响应」产物与对应按钮等价 | `req intended:true / os:true / ===oracle:true`；`resp intended:true / os:true / ===oracle:true`；两 P2 项 `disabled=false` | — | ✅✅ |
| 6 | **AC-008** | 双击行 → `#detail-pane` 打开，六要素齐全且顺序正确 | `hidden=false`；有序下标 `reqLine:119 < reqH1:161 < reqH2:192 < reqBody:225 < reqBodyVal:240 < respLine:293 < respH1:307 < respH2:338 < respBody:361 < respBodyVal:377` | `E2E-detail-*` | ✅✅ |
| 7 | **AC-009** | 明细响应体逐字符 === 原始响应体；头保持原始顺序（不缩进/不排序/不转 Markdown） | `===oracle:true`；`endsWithBody:true`；`reqHeadersOrdered:true`；`respHeadersOrdered:true` | `E2E-detail-*` | ✅✅ |
| 8 | AC-009b | 二进制（真实 HAR=base64 + image/png）明细复用 `classifyBody`，逐字符占位且不泄露原文 | 含 `[Base64 content omitted: length 96]`；不含 base64 原文；`===oracle:true` | — | ✅✅ |
| 9 | AC-009c | 非 base64 图片正文 → 明细 `[Binary content omitted: image/png, 2048 bytes]` 逐字符 | 占位逐字符；`===oracle:true` | — | ✅✅ |
| 10 | **AC-010** | 明细可关闭返回；**单击仅选中、不打开明细**（仅双击打开） | `closeBtn:true`；`singleClick(hidden=true, row2sel=true)`；`escOpened/closed:true`；`backdropOpened/closed:true` | — | ✅✅ |
| 11 | **AC-011**（P2） | 明细内「复制请求+响应」按钮产物 === 主复制按钮，且复制后不关闭详情 | `detailCopy===oracle:true`；`===btnA:true`；`osMatched:true`；`detailStillOpen:true` | `E2E-detail-*` | ✅✅ |
| 12 | **MS**（AC-005/006 实机抽查） | 多选工具栏实机：全选 / 计数 / 复制选中(N)，N 段不混淆 | 容器 `visible=true`；全选后 `count='已选 3 条'`、`enabled=true`；输出 `markers=3`，每段 `blocksMatch=true`（无跨条混淆） | `E2E-multiselect-*` | ✅✅ |
| 13 | G-1a/b/c | 多选按钮文案插值 `复制选中(N)`，绝不出现字面量 `{count}` | N=0 `复制选中(0)`/disabled=true；N=1 `复制选中(1)`/disabled=false；N=3 `复制选中(3)`/disabled=false | `E2E-g1-n0-*`、`E2E-multiselect-*` | ✅✅ |
| 14 | 边界·菜单 | 表头/空白不弹；Esc/点击他处/滚动/失焦关闭菜单 | `{headerNoMenu,blankNoMenu,escOpen/close,otherClick,scroll,blur}` 全 true | — | ✅✅ |
| 15 | 边界·淘汰 | 打开中的记录被环形淘汰 → 自动关闭明细 + 提示 | `detailHidden=true` 且 Toast = `该请求已被淘汰，明细已关闭` | — | ✅✅ |
| 16 | **CONSOLE** | 控制台零错误、零 CSP 违规（采集链自证） | `probeCaptured=true`；`errors=0`；`csp=0`；`consoleMessages=1`（仅自证探针） | — | ✅✅ |
| 17 | **DEL-001** | `devtools_page` 注册面板 | spy：`panels.create({title:"Raw Copy", icon:"icons/icon32.png", page:"panel.html"})` | — | ✅✅ |

---

## 4. 关键截图断言（目视核验，8 张：每浏览器 4 张）

| 截图 | 目视核验内容 |
|------|--------------|
| `E2E-ctx-menu-{chrome,edge}.png` | 真实面板：3 行列表（最新在上）+ POST 行高亮选中 + 自绘菜单（`复制请求 + 响应（原始）` / `仅复制请求` / `仅复制响应`）+ 多选工具栏（全选 / `复制选中(1)` / `已选 1 条`）+ 底部复制按钮组 |
| `E2E-detail-{chrome,edge}.png` | 覆盖式明细抽屉：标题「请求明细」、JS 追加的「复制请求 + 响应（原始）」按钮、关闭按钮、`#detail-body` 六要素原文（META/REQUEST/RESPONSE 逐字符、头保原序、体不美化） |
| `E2E-multiselect-{chrome,edge}.png` | 全选后工具栏计数「已选 3 条」、`复制选中(3)` 按钮启用 |
| `E2E-g1-n0-{chrome,edge}.png` | N=0 时按钮 `复制选中(0)` 且禁用（G-1 修复留证） |

---

## 5. 控制台与网络

- **Chrome / Edge**：`errors=0`、`csp=0`；`Runtime.consoleAPICalled` 采集链自证探针 `[E2E-CONSOLE-PROBE]` 已被捕获（`probeCaptured=true`），证明「零错误」非采集缺失导致。
- `Log.entryAdded` 中无 `source:"security"`、无 "Content Security Policy" 文本。
- 页面原始 console 消息总数 = 1（即上述自证探针）→ 零错误、零 CSP 违规成立。
- 全流程仅与 `chrome-extension://` 本地资源交互，无外部网络请求（与 `check-zero-network` 门禁一致，见 §6）。

---

## 6. 静态门禁证据（支撑 AC-012 / AC-013 / AC-014 / AC-015 / AC-016）

| 检查 | 命令 | 结果 |
|------|------|------|
| 语法 | `node scripts/check-syntax.mjs` | `[check-syntax] 15/15 files passed` |
| manifest（MV3 / 权限 / devtools_page / 版本） | `node scripts/check-manifest.mjs` | `== RESULT: PASS (17/17 项) ==`；`manifest_version=3`、`permissions=["clipboardWrite"]`、`host_permissions=null`、`webRequest=false`、`version=1.1.0`（**AC-012**） |
| 零网络/零持久化/零遥测 | `node scripts/check-zero-network.mjs` | `17/17 项通过`（**AC-013**） |
| 面板外壳契约 | `node scripts/check-panel-shell.mjs` | `== RESULT: PASS (42/42 项) ==`（含 `.is-selected` 高亮等） |
| 未使用原生菜单 API | `rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'` | **0 命中**（exit=1）（ADR-013 自绘菜单硬约束） |
| 全量单测回归 | `node --test "tests/**/*.test.mjs"` | **tests 264 / pass 264 / fail 0**（**AC-015**；含 formatter/selection 冻结契约、content 保真、contextmenu/detail/multiselection/bulkformatter/i18n） |

> AC-014（大响应/二进制/Base64 规则一致）由 §3 #8/#9 实机占位断言 + `tests/content.test.mjs` 覆盖；AC-016（体积 <200KB、零第三方依赖）由 `scripts/package.mjs` 门禁（`test-results.md`：解压 139364 B / third-party deps = 0）覆盖。

---

## 7. 未覆盖 / 缺口（如实登记，不掩盖）

### 7.1 本增强绑定项：**0 失败**

AC-001/002/003/005/006/008/009/010/011 与 DEL-001/002/004/005/007 在 Chrome 与 Edge 双端全部 PASS。

### 7.2 遗留观察（均为**非本步绑定阻塞**）

| # | 严重度 | 观察 | 关联 | 建议 |
|:-:|:------:|------|------|------|
| G-2 | P4（文档漂移） | `tests/README.md` §测试文件清单滞后，未含增强新增测试文件（TASK-012 实测全量 264 用例）。 | DEL-007 文档侧 | 更新 README 表反映实际测试文件与用例数 |
| G-3 | 环境观察 | Edge 页面内 `navigator.clipboard.readText()` 曾返回陈旧值；但**真实系统剪贴板已被正确写入**（`Get-Clipboard` 与冻结产物逐字符一致）。Chrome 的 `readText()` 与系统剪贴板一致。 | 无（验证方法差异） | 本报告以**系统剪贴板**为真源，`readText` 仅作交叉核对 |
| 输入缺口 | — | `[MISSING_CONTEXT]` `butler/requirements/e2e-test-plan.md`（F-73）不存在；本报告预期改引 spec/design 冻结 AC。 | 流程 | 补产该文件 |

### 7.3 环境能力边界（非失败、非缺口）

- **未驱动真实 DevTools 内嵌面板容器**：本步以「扩展页 `panel.html`（真实发行代码）」承载面板 UI；真实 `chrome.devtools.network.onRequestFinished` 事件源以加载前桥接脚本注入（真实 HAR 事件无法脚本化产生）。
- 面板**注册契约**已独立验证（§3 #17 spy）。面板内右键/明细/多选的**渲染与剪贴板行为**均在真实 Chromium 中对真实发行代码实测。
- 依附真实 DevTools 上下文的路径（live 页面实时捕获、多 inspected target、关闭 DevTools 销毁数据）不在本步范围，由既有单测/门禁覆盖或留人工复验。

---

## 8. 复现步骤

```bash
# 0) 前置：Node ≥ 18（本环境 v24.15.0）；Chrome/Edge 已安装（见 §2.1）
cd /d/xiaozhai.dev/chrome_extension2

# 1) 双浏览器 E2E（自动启动浏览器 + loadUnpacked + 驱动 + 截图 + 写 results-*.json）
node "butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-artifacts/harness/run-e2e.mjs"

# 2) 静态门禁
node scripts/check-manifest.mjs
node scripts/check-zero-network.mjs
node scripts/check-panel-shell.mjs
node scripts/check-syntax.mjs
rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'   # 期望 0 命中

# 3) 全量单测
node --test "tests/**/*.test.mjs"                                # 期望 264/264
```

产物：`e2e-artifacts/results-{chrome,edge,all}.json`（逐条断言原始值 + 剪贴板样本 + 控制台）、8 张截图。

---

## 9. 判定汇总

| 条目 | Chrome | Edge | 证据 |
|------|:------:|:----:|------|
| AC-001 右键选中 + 菜单含主项 | PASS | PASS | §3 #2、§4 |
| AC-002 菜单主项 === 底部按钮（模式 A/B 逐字符） | PASS | PASS | §3 #3/#4 |
| AC-003（P2）仅请求/仅响应与按钮等价 | PASS | PASS | §3 #5 |
| AC-005 复制选中(N) 计数实时更新 | PASS | PASS | §3 #12/#13 |
| AC-006 多选 N 段分隔、无混淆 | PASS | PASS | §3 #12 |
| AC-008 双击明细六要素齐全且有序 | PASS | PASS | §3 #6、§4 |
| AC-009 明细响应体/头逐字符保真 | PASS | PASS | §3 #7/#8/#9 |
| AC-010 明细可关闭；单击不打开 | PASS | PASS | §3 #10 |
| AC-011（P2）明细内复制 === 主按钮 | PASS | PASS | §3 #11 |
| AC-012 manifest 仅 clipboardWrite | PASS | PASS | §6 manifest 门禁 |
| AC-013 零网络传输 | PASS | PASS | §6 zero-network 门禁 |
| AC-015 基线全回归 | PASS | PASS | §6 单测 264/264 |
| DEL-001/002/004/005/007 | PASS | PASS | §3 |
| 边界（菜单关闭时机 / 淘汰关明细 / 控制台0错误0CSP） | PASS | PASS | §3 #14/#15/#16 |
| **总判定** | **PASS** | **PASS** | 双端 20/20；0 FAIL；残留 G-2(P4)/G-3(环境) 见 §7.2 |

<!-- butler:covers AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 DEL-001 DEL-002 DEL-004 DEL-005 DEL-007 -->
<!-- E2E executed by butler-e2e-verifier; Phase ⑥.1; real Chromium Chrome 152 + Edge 154 loadUnpacked; 20/20 PASS both browsers; unit 264/264; 4 static gates PASS; console errors=0 csp=0; verdict=PASS; residual G-2(P4 doc drift)/G-3(env)/missing e2e-test-plan -->
