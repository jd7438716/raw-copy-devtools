verdict: PASS
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
phase: ⑥.1 UI/E2E 验收（spec 含 type=ui 触发）
date: 2026-10-02
executor: butler-e2e-verifier
browser: "真实 Chromium：Google Chrome 152.0.7977.84 + Microsoft Edge 154.0.4258.48"
app_target: Chrome/Edge DevTools MV3 扩展「Raw Copy」panel.html（静态包；无 npm run dev / dev server）
extension_load: "CDP Extensions.loadUnpacked（真实「加载已解压」，真实发行代码）"
harness: "e2e-artifacts/harness/{cdp.mjs,run-e2e.mjs} 零依赖；仅桥接 chrome.devtools.network.onRequestFinished 事件源 + clipboard 可观测包装，其余为发行代码"
checks: "25 / 25（Chrome）· 25 / 25（Edge）"
console_errors: 0
csp_violations: 0
unit_tests: "283/283 pass / 0 fail"
static_gates: "check-syntax 15/15 · check-manifest 17/17 · check-zero-network 17/17 · check-panel-shell 41/41"
touches_source: NO（extension/**、tests/**、scripts/** 仅读取）
open_items: "e2e-test-plan.md 声明输入缺失([MISSING_CONTEXT])；G-2 tests/README.md 测试表滞后(P4，非本任务绑定)"
covers: AC-001 AC-002 AC-003 AC-004 AC-007 AC-008 AC-009 AC-010 REQ-001 REQ-002 REQ-003 REQ-004 REQ-006 REQ-007 REQ-008 REQ-009 DEL-001 DEL-004 DEL-005
---

# E2E 测试报告 — Raw Copy v1.1.0 三项修复/调整

> 执行者：butler-e2e-verifier ｜ 日期：2026-10-02 ｜ Phase ⑥.1（spec 含 type=ui，触发本步）
> 被测：`extension/`（`panel.html` / `panel.js` / `src/contextmenu.js` / `src/multiselection.js` / `src/i18n.js` / `src/bulkformatter.js` / `src/formatter.js` / `src/clipboard.js` …）
> 只读执行：**未修改任何业务代码**；本任务仅运行验证与产出报告/原始结果/截图。

---

## 0. 上下文与预期来源（不可篡改）

| 项 | 结果 |
|----|------|
| 本步声明输入 `butler/requirements/e2e-test-plan.md`（F-73，butler-e2e-planner 产出） | **缺失** → 记录 `[MISSING_CONTEXT]`（`butler/file-registry.md` 标记 ⏳；本仓库历次 E2E 均缺此文件） |
| 预期结果来源（设计阶段冻结） | `spec.json` / `spec.md`（REQ-001..016 + DEL-001..018 + AC-001..017）+ `01-root-cause.md` + 既有 `run-e2e.mjs` 冻结断言 |
| 未新增/篡改任何预期 | **是**——执行阶段只对「设计阶段冻结的期望条件」与实测做 PASS/FAIL 比对，预期逐字未改（本步仅将 spec 已冻结的 AC-002/AC-003 以断言形式补入执行器，判定阈值逐字取自 spec） |

### 0.1 环境适配说明（为什么不是 `npm run dev`）

扩展是**静态 MV3 包**，不存在可启动的本地应用/开发服务器。本步的「启动应用」定义为：
**在真实 Chromium（Chrome 与 Edge）中以「加载已解压」装载 `extension/` 的真实发行代码，并打开真实面板页 `panel.html` 驱动全部交互**。

仅有的两处「测试替身」：① `chrome.devtools.network.onRequestFinished` 事件源（真实 HAR 事件无法从脚本注入）；② clipboard 写入的可观测包装（仅观测，行为不变）。
`capture/store/filter/render/selection/multiselection/contextmenu/bulkformatter/detail/formatter/clipboard/i18n` **全部为真实发行代码**。

---

## 1. 摘要

| 指标 | Chrome | Edge |
|------|:------:|:----:|
| 断言项（每浏览器） | 25 | 25 |
| 通过 | **25** | **25** |
| 失败 | 0 | 0 |
| 跳过 | 0 | 0 |
| 控制台错误 | **0** | **0** |
| CSP 违规 | **0** | **0** |
| 面板就绪 / 采集链自证 | true / true | true / true |
| 扩展 ID（loadUnpacked） | `iieicollgmbkdpmcnljkjdfndkbmdagk` | `iieicollgmbkdpmcnljkjdfndkbmdagk` |
| 截图 | 4 张 | 4 张 |

**结论：`verdict = PASS`。** 页面可访问（panelReady=true，3 条 HAR → 3 行渲染）、零控制台错误、零 CSP 违规；本 spec 的全部 UI 类交付物（多选漏条修复 / 复制模式 A·B 按钮化 / 移除分段复制）在 **Chrome 与 Edge 双端 25/25 PASS，0 FAIL**。

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

| # | 断言键 | 冻结预期（spec） | 实测（Chrome ≡ Edge） | 截图 | 结果 |
|:-:|:------:|----------|----------------------|------|:----:|
| 1 | ENV | mock 桥 + 真实 `installCapture` 注册 1 个监听；3 条 HAR → 3 行 | `listeners=1`；3 行，`data-id=1/2/3` | — | ✅✅ |
| 2 | **AC-001 / REQ-009** | 右键任一请求行 → 该行被选中 + 面板内自绘菜单弹出，含「复制请求 + 响应（原始）」 | `menu.hidden=false`；含 `#copy-request-response`，文案 `复制请求 + 响应（原始）`；`row.cls='row is-selected'`、`aria-selected=true` | `E2E-ctx-menu-*` | ✅✅ |
| 3 | **AC-002a / REQ-002** | 集合 {1,2}，右键命中**集合外** id3 → 集合坍缩为单选替换 {3}，count=1，无批量项 | `selected=['3']`；`batchPresent=false`；`count` 含 1 | — | ✅✅ |
| 4 | **AC-002b / REQ-002 / REQ-003** | 集合 {1,2}，右键命中**集合内** id1 → 集合保留 {1,2}，菜单出现「复制选中(2)」 | `selected=['1','2']`；`batchPresent=true`；`batchText` 匹配 `(2)` | `E2E-ctx-menu-*` | ✅✅ |
| 5 | **AC-003 / REQ-001** | 工具栏批量项与右键批量项对同一集合产物**逐字符一致**，含 2 个 `#i/2` 标记 | `ctx===toolbar:true`；`markers=2`；双路径真实系统剪贴板均匹配 | — | ✅✅ |
| 6 | **AC-004 / REQ-004** | `selectAt` + Ctrl `toggleAt` + Ctrl+Shift 扩选 = 并集（id3 不丢、先前 Ctrl 项保留） | 选中集合 size=3 且含 `data-id 1/2/3` | — | ✅✅ |
| 7 | **AC-008 ② / REQ-006/007** | 点 `#copy-btn-b` 产模式 B、点 `#copy-btn-a` 产模式 A；与冻结 oracle 一致；无 toggle 残留 | `===oracleB:true`、`===oracleA:true`、`A≠B:true`、`#mode-toggle===null`；真实剪贴板匹配 | — | ✅✅ |
| 8 | **AC-007 / REQ-006** | 复制相关按钮区存在「模式 A」「模式 B」两个独立按钮，携带 `data-copy-mode` | `#copy-btn-a`(data-copy-mode=`A`)、`#copy-btn-b`(=`B`) 均就位 | `E2E-ctx-menu-*` | ✅✅ |
| 9 | **AC-009 / REQ-008** | 菜单项集不含 `copy-request-only`/`copy-response-only`；DOM 无 `#copy-req-btn`/`#copy-resp-btn`/`#mode-toggle`；主项保留 | `p2MenuIds=[]`；三者为 `false`；`hasMain=true`；A/B 就位 | — | ✅✅ |
| 10 | **AC-010 / REQ-009** | 「复制请求 + 响应（原始）」与多选批量项在 ③ 清理后仍保留且可用 | AC-001 主项可用；AC-002b/AC-003 批量项可用 | — | ✅✅ |
| 11 | MS（AC-005/006 实机抽查） | 多选工具栏可见；全选 → 计数 3 → `复制选中(3)`；输出 3 段无跨条混淆 | `visible=true`；`count='已选 3 条'`；`enabled=true`；`markers=3`，每段 `blocksMatch=true` | `E2E-multiselect-*` | ✅✅ |
| 12 | G-1a/b/c | 多选按钮文案插值 `复制选中(N)`，绝不出现字面量 `{count}` | N=0 `复制选中(0)`/disabled=true；N=1 `复制选中(1)`/enabled；N=3 `复制选中(3)`/enabled | `E2E-g1-n0-*` | ✅✅ |
| 13 | AC-008 明细 | 双击行 → `#detail-pane` 打开，六要素齐全且顺序正确 | 有序下标 `reqLine<reqH1<reqH2<reqBody<reqBodyVal<respLine<respH1<respH2<respBody<respBodyVal` | `E2E-detail-*` | ✅✅ |
| 14 | AC-009 明细保真 | 明细文本 === 冻结模式 A 产物；响应体逐字符原样；头保原序 | `===oracle:true`、`endsWithBody:true`、头保原序 | `E2E-detail-*` | ✅✅ |
| 15 | AC-009b | 二进制（真实 HAR=base64 + image/png）明细逐字符占位且不泄露原文 | 含 `[Base64 content omitted: length 96]`；不含 base64 原文；`===oracle:true` | — | ✅✅ |
| 16 | AC-009c | 非 base64 图片正文 → `[Binary content omitted: image/png, 2048 bytes]` 逐字符 | 占位逐字符；`===oracle:true` | — | ✅✅ |
| 17 | AC-010 明细关闭 | 关闭按钮/Esc/遮罩均可关闭；单击仅选中不打开（仅双击打开） | `closeBtn:true`；`singleClick(hidden=true,row2sel=true)`；Esc/遮罩开合均 true | — | ✅✅ |
| 18 | AC-011 明细复制 | 明细内「复制请求+响应」按钮产物 === 主按钮，复制后不关详情 | `===oracle:true`、`===btnA:true`、`osMatched:true`、`detailStillOpen:true` | — | ✅✅ |
| 19 | AC-013 多选态右键批量 | Ctrl 选 2 条后右键集合内行 → 集合保留 + 菜单「复制选中(2)」→ 2 段 | `count` 含 2；`hasBatch=true` 且 enabled；`markers=2`；含两条产物；真实剪贴板匹配 | `E2E-multiselect-*` | ✅✅ |
| 20 | 边界·菜单 | 表头/空白不弹；Esc/点击他处/滚动/失焦关闭菜单 | `{headerNoMenu,blankNoMenu,escOpen/close,otherClick,scroll,blur}` 全 true | — | ✅✅ |
| 21 | 边界·淘汰 | 打开中的记录被环形淘汰 → 自动关闭明细 + 提示 | `detailHidden=true` 且 Toast = `该请求已被淘汰，明细已关闭` | — | ✅✅ |
| 22 | **CONSOLE** | 控制台零错误、零 CSP 违规（采集链自证） | `probeCaptured=true`；`errors=0`；`csp=0`；`consoleMessages=1`（仅自证探针） | — | ✅✅ |
| 23 | DEL-001 | `devtools_page` 注册面板 | spy：`panels.create({title:"Raw Copy", icon:"icons/icon32.png", page:"panel.html"})` | — | ✅✅ |

---

## 4. 关键截图断言（目视核验，8 张：每浏览器 4 张）

| 截图 | 目视核验内容 |
|------|--------------|
| `E2E-ctx-menu-{chrome,edge}.png` | 真实面板：3 行列表（最新在上）+ POST 行高亮选中 + 自绘菜单（仅 `复制请求 + 响应（原始）`；无 P2 项）+ 多选工具栏 + 底部 `#copy-btn` / 模式 A / 模式 B 三按钮组 |
| `E2E-detail-{chrome,edge}.png` | 覆盖式明细抽屉：标题「请求明细」、关闭按钮、`#detail-body` 六要素原文（头保原序、体不美化） |
| `E2E-multiselect-{chrome,edge}.png` | 全选后工具栏计数「已选 3 条」、`复制选中(3)` 按钮启用 |
| `E2E-g1-n0-{chrome,edge}.png` | N=0 时按钮 `复制选中(0)` 且禁用（G-1 修复留证） |

---

## 5. 控制台与网络

- **Chrome / Edge**：`errors=0`、`csp=0`；`Runtime.consoleAPICalled` 采集链自证探针 `[E2E-CONSOLE-PROBE]` 已被捕获（`probeCaptured=true`），证明「零错误」非采集缺失导致。
- `Log.entryAdded` 中无 `source:"security"`、无 "Content Security Policy" 文本。
- 页面原始 console 消息总数 = 1（即上述自证探针）→ 零错误、零 CSP 违规成立。
- 全流程仅与 `chrome-extension://` 本地资源交互，无外部网络请求（与 `check-zero-network` 门禁一致，见 §6）。

---

## 6. 静态门禁证据（支撑 AC 约束项）

| 检查 | 命令 | 结果 |
|------|------|------|
| 语法 | `node scripts/check-syntax.mjs` | `[check-syntax] 15/15 files passed` |
| manifest（MV3 / 权限 / devtools_page / 版本） | `node scripts/check-manifest.mjs` | `== RESULT: PASS (17/17 项) ==`；`manifest_version=3`、`permissions=["clipboardWrite"]`、`host_permissions=null`（**AC-011**） |
| 零网络/零持久化/零遥测 | `node scripts/check-zero-network.mjs` | `17/17 项通过` |
| 面板外壳契约（含 A/B 按钮、已移除 toggle/分段按钮） | `node scripts/check-panel-shell.mjs` | `== RESULT: PASS (41/41 项) ==`（**AC-014**） |
| 未使用原生菜单 API | `rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'` | **0 命中**（ADR-013 自绘菜单硬约束） |
| 全量单测回归 | `node --test "tests/**/*.test.mjs"` | **tests 283 / pass 283 / fail 0**（**AC-015**；spec 基线 264，本次含新增用例） |

---

## 7. 未覆盖 / 缺口（如实登记，不掩盖）

### 7.1 本 spec UI 绑定项：**0 失败**

REQ-001/002/003/004/006/007/008/009 与 DEL-001/004/005/007 在 Chrome 与 Edge 双端全部 PASS。

### 7.2 遗留观察（均为**非本步绑定阻塞**）

| # | 严重度 | 观察 | 关联 | 建议 |
|:-:|:------:|------|------|------|
| 输入缺口 | — | `[MISSING_CONTEXT]` `butler/requirements/e2e-test-plan.md`（F-73）不存在；本报告预期改引 spec 冻结 AC。 | 流程 | 补产该文件 |
| G-2 | P4（文档漂移） | `tests/README.md` §测试文件清单滞后（本步实测全量 283 用例）。 | DEL-016 文档侧 | 更新 README 表反映实际测试文件与用例数 |

### 7.3 环境能力边界（非失败、非缺口）

- **未驱动真实 DevTools 内嵌面板容器**：本步以「扩展页 `panel.html`（真实发行代码）」承载面板 UI；真实 `chrome.devtools.network.onRequestFinished` 事件源以加载前桥接脚本注入（真实 HAR 事件无法脚本化产生）。
- 面板**注册契约**已独立验证（§3 #23 spy）。面板内右键/明细/多选的**渲染与剪贴板行为**均在真实 Chromium 中对真实发行代码实测。
- 依附真实 DevTools 上下文的路径（live 页面实时捕获、多 inspected target、关闭 DevTools 销毁数据）不在本步范围，由既有单测/门禁覆盖或留人工复验。

---

## 8. 复现步骤

```bash
# 0) 前置：Node ≥ 18（本环境 v24.15.0）；Chrome/Edge 已安装（见 §2.1）
cd /d/xiaozhai.dev/chrome_extension2

# 1) 双浏览器 E2E（自动启动浏览器 + loadUnpacked + 驱动 + 截图 + 写 results-*.json）
node "butler/spec/对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-/e2e-artifacts/harness/run-e2e.mjs"

# 2) 静态门禁
node scripts/check-manifest.mjs
node scripts/check-zero-network.mjs
node scripts/check-panel-shell.mjs
node scripts/check-syntax.mjs
rg -n "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'   # 期望 0 命中

# 3) 全量单测
node --test "tests/**/*.test.mjs"                                # 期望 283/283
```

产物：`e2e-artifacts/results-{chrome,edge,all}.json`（逐条断言原始值 + 剪贴板样本 + 控制台）、8 张截图。

---

## 9. 判定汇总

| 条目 | Chrome | Edge | 证据 |
|------|:------:|:----:|------|
| REQ-001/AC-003 工具栏与右键批量产物逐字符一致 | PASS | PASS | §3 #5 |
| REQ-002/AC-002 右键集合内保留 / 集合外替换 | PASS | PASS | §3 #3/#4 |
| REQ-003 菜单批量项 count≥2 可达 | PASS | PASS | §3 #4/#19 |
| REQ-004/AC-004 混合修饰键并集 | PASS | PASS | §3 #6 |
| REQ-006/007/AC-007/008 模式 A/B 独立按钮（无 toggle） | PASS | PASS | §3 #7/#8 |
| REQ-008/AC-009 移除 P2 分段复制 | PASS | PASS | §3 #9 |
| REQ-009/AC-010 主项与多选批量项保留可用 | PASS | PASS | §3 #2/#10 |
| AC-011 manifest 仅 clipboardWrite | PASS | PASS | §6 manifest 门禁 |
| AC-014 门禁脚本 id 清单同步 | PASS | PASS | §6 panel-shell 41/41 |
| AC-015 基线全回归 | PASS | PASS | §6 单测 283/283 |
| 边界（菜单关闭时机 / 淘汰关明细 / 控制台0错误0CSP） | PASS | PASS | §3 #20/#21/#22 |
| **总判定** | **PASS** | **PASS** | 双端 25/25；0 FAIL；残留输入缺口 + G-2(P4) 见 §7.2 |

<!-- butler:covers AC-001 AC-002 AC-003 AC-004 AC-007 AC-008 AC-009 AC-010 REQ-001 REQ-002 REQ-003 REQ-004 REQ-006 REQ-007 REQ-008 REQ-009 DEL-001 DEL-004 DEL-005 -->
<!-- E2E executed by butler-e2e-verifier; Phase 6.1; real Chromium Chrome 152 + Edge 154 loadUnpacked; 25/25 PASS both browsers; unit 283/283; 4 static gates PASS; console errors=0 csp=0; verdict=PASS; residual missing e2e-test-plan + G-2(P4 doc drift) -->
