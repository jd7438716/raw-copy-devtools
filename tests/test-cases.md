# 测试用例矩阵 — Chrome/Edge DevTools 扩展（Manifest V3）

> 交付物: **DEL-013**（测试用例·文档/脚本）
> 关联验收: **AC-019**（交付物齐全，DIL-013 为必交项）
> 生成角色: butler-qa · 日期: 2026-10-02
> 上游真源: `requirement.md`（22 AC / 36 REQ）、`design.md`（ADR-006 保真 / ADR-007 剪贴板 / ADR-008 内容分类）、`checklist.md`（§C 边界 16 项）
> 三绑定约定: **story ↔ rule ↔ test** —— 每条用例同时标注「用户故事 US / 需求 REQ / 验收 AC / 测试落点」。

---

## 0. 图例

| 类型 | 含义 | 执行方式 |
|------|------|----------|
| `单元`（可执行） | Node 零依赖单测，import `extension/src/*.js` 纯逻辑 | `npm test` 自动执行 |
| `门禁`（可执行） | 静态检查脚本，读盘断言 | `node scripts/check-*.mjs` 自动执行 |
| `E2E`（手工） | 需真实 Chrome/Edge + load unpacked + 开发者操作 | 按 §3 手工步骤执行，截图留证 |

| 自动化状态 | 含义 |
|:----------:|------|
| ✅ | 已被现有 `tests/*.test.mjs` 或 `scripts/check-*.mjs` 机械覆盖 |
| ◐ | 逻辑层已由单测覆盖，浏览器可见行为仍需 E2E 复核 |
| ⏳ 待 E2E | 仅能通过真实浏览器手工验证（无自动化脚本） |

> **自动化测试落点清单**：`tests/*.test.mjs` 全量 —— `{i18n,store,capture,enrich,filter,render,selection,formatter,clipboard,content,contextmenu,multiselection,bulkformatter,detail}.test.mjs`（共 **14 文件 / 264 用例**，全量 PASS）
> **静态门禁脚本**：`scripts/{check-syntax,check-manifest,check-panel-shell,check-zero-network}.mjs`
> **增强里程碑用例**（右键 / 多选 / 双击详情）另见 **§1b**；其 AC 体系（增强 AC-001..AC-017）与 §1 基线 AC（AC-001..AC-022）**编号独立**，引用须注明里程碑。

---

## 1. AC 覆盖矩阵（AC-001 .. AC-022，逐条绑定）

### US-001 前端开发 — 一键复制请求+响应（AC-001..AC-011, AC-015）

| 用例 ID | AC | REQ/US | 类型 | 用例步骤 | 预期结果 | 自动化状态 |
|---------|:--:|:------:|:----:|----------|----------|:----------:|
| TC-AC-001 | AC-001 | REQ-001 / US-001 | 门禁 + E2E | ①`node scripts/check-manifest.mjs` 断言 `devtools_page==="devtools.html"` 且 icons 存在；②`chrome://extensions` 开发者模式加载 `extension/`；③打开 DevTools 查看面板下拉 | ①脚本 PASS；②无加载错误；③出现独立面板 `Raw Copy`（DEC-001），与 Elements/Console/Network 并列可切换 | ◐（`check-manifest.mjs` ✅ / 浏览器并列 ⏳ 待 E2E） |
| TC-AC-002 | AC-002 | REQ-002,003 / US-001 | 单元 + E2E | ①`tests/capture.test.mjs`：注入 chrome 桩注册 `onRequestFinished`，回调 HAR entry → `store.add`；②浏览器访问任意站点，观察面板列表 | ①回调被调用、记录入 store、追加稳定（16 用例 PASS）；②新请求自动追加入列表 | ◐（capture ✅ / 实时可见 ⏳ 待 E2E） |
| TC-AC-003 | AC-003 | REQ-006..009 / US-002 | 单元 | `tests/filter.test.mjs`：URL 关键字（大小写不敏感子串）、method 精确、status 精确码 + `2xx/3xx/4xx/5xx` 码段、resourceType 精确、多条件 AND、无匹配返回空数组、`collectOptions` 去重排序 | 过滤结果符合条件；无匹配时返回空数组（面板显示空态） | ✅ `tests/filter.test.mjs`（12 用例） |
| TC-AC-004 | AC-004 | REQ-010,011 / US-003 | 单元 + E2E | ①`tests/selection.test.mjs`：`selectAt`/`selectId` 单选替换、`move(±1)` 切换、首尾 **clamp 不环绕**、空列表 no-op、选中项被移除即清空；②浏览器点击行 + `↑`/`↓` | ①选中唯一、键盘钳制、失效清理；②点击高亮 `.is-selected`、上下键切换 | ◐（selection ✅ / 真实键鼠 ⏳ 待 E2E） |
| TC-AC-005 | AC-005 | REQ-015,016 / US-001 | 单元 | `tests/formatter.test.mjs`：模式 A 完整结构 golden —— 方法+完整 URL+HTTP 版本+请求头+空行+`[Request Body]`+体；状态码+状态文本+响应头+`[Response Body]`+体 | 输出逐字符等于 golden 模板；字段齐全无遗漏 | ✅ `tests/formatter.test.mjs`（AC-005 golden） |
| TC-AC-006 | AC-006 | REQ-014 / US-001 | 单元 | `tests/formatter.test.mjs`：仅传入单条 record，断言输出不含第二条请求的任何 URL/头/体内容 | 输出只含单条；无其他请求片段 | ✅ `tests/formatter.test.mjs`（单条隔离） |
| TC-AC-007 | AC-007 | REQ-020 / US-001 | 单元 | `tests/formatter.test.mjs`：响应体含不规则空白/`\n`/`\t`/转义/Unicode（`{"code":0,...}` 样例）→ 逐 UTF-16 码元比对；模式 A/B 两模式 body 子串完全一致 | 逐字符一致，**无缩进/换行/排序/Markdown 代码块** | ✅ `tests/formatter.test.mjs`（逐码元 + 双模式一致） |
| TC-AC-008 | AC-008 | REQ-027 / US-004 | 门禁 + E2E | ①`node scripts/check-zero-network.mjs` 扫描 `extension/**`：无 `fetch(`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`chrome.runtime.connect`；②浏览器复制操作时开 DevTools Network 面板观察 | ①17/17 项 PASS；②复制全程扩展零请求 | ◐（门禁 ✅ / 运行时观测 ⏳ 待 E2E） |
| TC-AC-009 | AC-009 | REQ-026 / US-004 | 门禁 | `node scripts/check-manifest.mjs`：`manifest_version===3`；`permissions` 长度 1 且唯一为 `clipboardWrite`；无 `host_permissions`/`tabs`/`webRequest`/`declarativeNetRequest`/`content_scripts`/`background`/`<all_urls>` | 17/17 项 PASS | ✅ `scripts/check-manifest.mjs` |
| TC-AC-010 | AC-010 | REQ-022,023,024 / US-001 | 单元 + E2E | ①`tests/content.test.mjs`：超阈值（=10MB false、10MB+1 true）；二进制 `[Binary content omitted: <mime>, <bytes> bytes]` 逐字符；base64+文本 MIME UTF-8 解码（中文/emoji）、base64+非文本 `[Base64 content omitted: length N]`；②浏览器超阈值复制触发 confirm 对话框 | ①占位格式逐字符正确、阈值边界精确；②出现"是否继续复制"提示（REQ-022） | ◐（content ✅ / confirm 交互 ⏳ 待 E2E） |
| TC-AC-011 | AC-011 | REQ-025 / US-001 | 单元 + E2E | ①`tests/clipboard.test.mjs`：`showToast` 写入文案+`success`/`error` 类名+`data-visible`、自动隐藏、未知 kind 回退 `info`；②浏览器复制成功/失败观察提示 | ①Toast 类名与时序正确；②成功显示"已复制到剪贴板"、失败显示原因 | ◐（clipboard ✅ / 视觉呈现 ⏳ 待 E2E） |
| TC-AC-015 | AC-015 | REQ-018,019 / US-001 | 单元 | `tests/formatter.test.mjs`：模式 A 含 `===== REQUEST =====`/`===== RESPONSE =====`（及 META）标题；模式 B 完全不含标题；`mode` 缺省即模式 A（DEC-005） | 默认 A、切 B 后无标题直接拼接 | ✅ `tests/formatter.test.mjs`（模式 A/B） |

### US-002 测试工程师 / US-003 后端开发 — 列表与保真（AC-012..AC-016）

| 用例 ID | AC | REQ/US | 类型 | 用例步骤 | 预期结果 | 自动化状态 |
|---------|:--:|:------:|:----:|----------|----------|:----------:|
| TC-AC-012 | AC-012 | REQ-005 / US-002 | 门禁 + E2E | ①`node scripts/check-panel-shell.mjs` 断言表头恰好 7 列（`data-i18n="col.*"`）+ 稳定 DOM id；②浏览器观察每行 7 字段 | ①34/34 项 PASS；②每行显示 方法/URL/状态码/资源类型/耗时(ms)/大小/时间 | ◐（面板外壳 ✅ / 真实数据填充 ⏳ 待 E2E） |
| TC-AC-013 | AC-013 | REQ-004 / US-003 | 单元 | `tests/store.test.mjs`：`DEFAULT_CAPACITY===1000`；追加 1001 条 → size=1000、首条淘汰、末条保留；cap=3 追加 5 条顺序正确；clear/get/all | 环形缓冲 O(1) 淘汰，无泄漏（cap 恒定） | ✅ `tests/store.test.mjs`（9 用例） |
| TC-AC-014 | AC-014 | REQ-015,016 / US-003 | 单元 | `tests/formatter.test.mjs`：请求头/响应头按数组序输出，不排序/不去重/不合并同名；兼容 string 头行；`tests/capture.test.mjs` 断言归一化保序 | 头 `Name: Value` 原序；体逐字符不美化 | ✅ `tests/formatter.test.mjs` + `tests/capture.test.mjs` |
| TC-AC-016 | AC-016 | REQ-033 / US-004 | 单元 + 门禁 | ①`tests/i18n.test.mjs`：默认 zh 命中中文、插值、en 键集与 zh 完全一致（结构预留）；②`scripts/check-panel-shell.mjs`：`panel.html` 无裸中文（文案走 `data-i18n`）、`panel.js` 字符串字面量无中文 | ①i18n 结构对齐；②中文优先且结构可扩展 | ✅ `tests/i18n.test.mjs` + `check-panel-shell.mjs` |

### US-003/US-004 — 质量与交付（AC-017..AC-022）

| 用例 ID | AC | REQ/US | 类型 | 用例步骤 | 预期结果 | 自动化状态 |
|---------|:--:|:------:|:----:|----------|----------|:----------:|
| TC-AC-017 | AC-017 | REQ-031,032 / US-004 | 门禁 + E2E | ①`node scripts/check-syntax.mjs` 逐文件 `node --check`（11/11）；②`check-zero-network.mjs` 无第三方运行时调用；③打包后测量 `dist/raw-copy-1.0.0.zip` 体积 | ①11/11 PASS；②零依赖；③ZIP **< 200KB** | ◐（语法/依赖 ✅ / 体积测量 ⏳ 待 E2E，依赖打包脚本 DEL-015） |
| TC-AC-018 | AC-018 | REQ-030 / US-004 | E2E | 分别在最新版 Chrome 与 Edge：`chrome://extensions` / `edge://extensions` → 开发者模式 → 加载已解压 `extension/` → 打开 DevTools 面板 → 复制一次 | 两端均可安装、面板出现、复制成功 | ⏳ 待 E2E（Chromium 双端冒烟） |
| TC-AC-019 | AC-019 | DEL-001..018 / US-004 | 门禁 + E2E | 逐项核对交付物：`extension/**`、`docs/INSTALL.md`、`docs/USAGE.md`、`extension/privacy.html`、`tests/test-cases.md`、`tests/README.md`、`LICENSE`、`extension/icons/icon{16,32,48,128}.png`、`dist/raw-copy-1.0.0.zip` | 每项存在且非空 | ◐（源码/文档/测试/图标 ✅ / ZIP ⏳ 待 DEL-015） |
| TC-AC-020 | AC-020 | REQ-028 / US-004 | 门禁 + E2E | ①`grep` `extension/privacy.html` 含"不收集/不传输/本地"三项声明关键词；②`check-zero-network.mjs` 无 `localStorage`/`sessionStorage`/`indexedDB`/`chrome.storage`；③浏览器打开隐私页 | ①三项声明齐全；②无持久化；③页面可打开 | ◐（静态扫描 ✅ / 页面渲染 ⏳ 待 E2E） |
| TC-AC-021 | AC-021 | REQ-029 / US-003 | 单元 + E2E | ①`tests/render.test.mjs`：1000 条时 `computeWindow` 仅渲染可视区+overscan（节点数远小于 1000）、DOM 复用、滚动平移、缩容回收；②浏览器灌入 1000 条实测滚动/搜索/过滤帧率 | ①窗口化渲染生效、DOM 节点恒定；②交互无可感卡顿 | ◐（render ✅ / 真实帧率 ⏳ 待 E2E） |
| TC-AC-022 | AC-022 | REQ-034 / US-001 | 单元 + E2E | ①`tests/clipboard.test.mjs`：主路径 `writeText` resolve→`{ok:true,via:'async'}`；reject→`execCommand` 接管→`{ok:true,via:'execCommand'}` 且清理临时节点；双失败→`{ok:false,via:'none',reason}` 且不抛异常；逐字符不改动传入文本；②浏览器真实复制 + 断网/失焦复核 | ①降级链完整、失败必有原因；②两条路径至少一条成功；③异常有提示 | ◐（clipboard ✅ / 真实剪贴板 ⏳ 待 E2E） |

---

## 1b. 增强里程碑用例矩阵（右键菜单 / 多选 / 双击详情）

> **AC 体系说明（重要）**：本节 `AC-001..AC-017` 是**增强里程碑**的验收标准，真源为
> `butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/requirement.md` §验收标准（及同目录 `spec.md` §AC-001..AC-017）。
> 它与 §1 的**基线 AC-001..AC-022**（`butler/requirements/requirement.md`）是**两套独立编号**，同名不同义；本节引用一律以「增强里程碑 AC」为准。
> 覆盖交付物：**DEL-007**（右键复制等价 / 多选拼接不混淆 / 双击明细保真 / 单条逐字符回归）。
> 文档跟踪：TASK-013 / TASK-018；实机验证：TASK-016（见 §1b.6）。
> 类型图例沿用 §0；未标「单元」的 AC 由 E2E 实机证据兜底，**不虚构自动化**。
> 新增测试文件均在头注释声明本文件 `covers` 的增强 AC（见 `tests/README.md` §测试文件清单）。

### 1b.1 右键菜单（AC-001 / AC-002 / AC-003）

| 用例 ID | AC | 增强 REQ | 类型 | 用例步骤 | 预期结果 | 自动化落点 |
|---------|:--:|:--------:|:----:|----------|----------|:----------:|
| TC-ENH-CTX-01 | **AC-001** | R-001 | 单元 + E2E | ①`tests/contextmenu.test.mjs`：`resolveRowId` 命中 `.row[data-id]` → 还原 `recordId`（含 `0`、嵌套子元素、非规范串）；②`createMenuModel({count:1,hasSelection:true})` 主项常驻；③真机右键请求行 | ①命中返回行 id；②菜单含「复制请求 + 响应（原始）」主项；③行被选中（`.is-selected` / `aria-selected=true`）+ 菜单在指针处弹出 | ✅ `contextmenu.test.mjs`（46）+ E2E `e2e-report.md` §3#1 |
| TC-ENH-CTX-02 | **AC-001** | R-001 | 单元 + E2E | ①`resolveRowId` 落点超出 `.row`（表头 / 空白 / 列表外）→ null；②`createMenuModel` count=0 安全降级；③真机右键表头 / 空白 | 不弹菜单（`headerNoMenu / blankNoMenu=true`），且不误选 | ✅ `contextmenu.test.mjs`（表头 / 空白 / 越界）+ E2E §3#12 |
| TC-ENH-CTX-03 | **AC-001** | R-001 | E2E | 菜单打开后键盘可达：`↑`/`↓` 移动高亮、`Enter` 触发、`Esc` 关闭 | 菜单键盘全路径可操作、可触发、可关闭（无障碍） | E2E（panel 级；`e2e-report.md` §2.3 键鼠驱动） |
| TC-ENH-CTX-04 | **AC-001** | R-001 | E2E | 关闭时机：`Esc` / 点击菜单外 / 列表滚动 / 面板失焦 | 四种时机均关闭菜单（`escOpen→close`、`otherClick`、`scroll`、`blur` 全 true） | E2E `e2e-report.md` §3#12 |
| TC-ENH-CTX-05 | **AC-002** | R-003 | 单元 + E2E | 菜单主项「复制请求 + 响应（原始）」产物 === 底部 `#copy-btn` 产物（**模式 A 与模式 B 分别逐字符**） | `intended(menu) === intended(btn)`，且各自 === 冻结 `formatter.buildCopyText` oracle；系统剪贴板亦相等 | ✅ `formatter.test.mjs`（golden 单一真源）+ E2E §3#2/#3、§4.6 |
| TC-ENH-CTX-06 | **AC-009**（③ 删除断言） | R-002 | 单元 + E2E | ①`createMenuModel` 无 `canCopyRequestOnly` 入参、任何 `count` 均无 `copy-request-only`/`copy-response-only` id/action；②`CTX_ACTION`/`CTX_ITEM_ID` 无 P2 成员；③真机 DOM 无 `#copy-req-btn`/`#copy-resp-btn`/`#mode-toggle`，菜单无 P2 项 | ③ 能力面彻底移除且主项保留；无悬空引用 | ✅ `contextmenu.test.mjs`（③ 断言）+ `i18n.test.mjs`（P2 键已删）+ E2E `AC-009b` |
| TC-ENH-CTX-07 | **AC-002 / AC-013**（面板级接线） | R-001/R-003 | 单元（真实 panel.js + DOM shim） | ①多选集合后对**集合内行**派发真实 `contextmenu` → 集合保留、菜单出现「复制选中(2)」且 enabled；②对**集合外行**派发 → 单选替换、count=1、无批量项；③表头/空白派发 → 不弹、不改集合 | 入口语义「已选保留 / 未选替换」在真实 `onContextMenu` 上成立；批量项可达 | ✅ `contextmenu.test.mjs`（面板级接线，tests/panel-harness.mjs）+ E2E `AC-013` |
| TC-ENH-CTX-08 | **AC-007 / AC-008**（② A/B 按钮） | R-006 | 单元（真实 panel.js + DOM shim） + E2E | ①点 `#copy-btn-a` 产模式 A、点 `#copy-btn-b` 产模式 B，二者 ≠ 且各自 === 冻结 `buildCopyText` oracle；②`#copy-btn` 默认 A；③`getCopyMode()` 恒为 A、`setCopyMode` 已移除、无 `#mode-toggle` | 动作即模式、默认 A、无 toggle 状态残留 | ✅ `formatter.test.mjs`（A/B golden）+ `contextmenu.test.mjs`（面板级 A/B）+ E2E `AC-008` |

### 1b.2 多选（AC-004 / AC-005 / AC-006）

| 用例 ID | AC | 增强 REQ | 类型 | 用例步骤 | 预期结果 | 自动化落点 |
|---------|:--:|:--------:|:----:|----------|----------|:----------:|
| TC-ENH-MS-01 | **AC-004** | R-005 | 单元 | `tests/multiselection.test.mjs` 语义互不破坏：①单击 `selectAt` 整体替换（回落单选）；②Ctrl/Cmd `toggleAt` 加/减单行、主光标跟随；③Shift `rangeTo` 以 anchor 取可见闭区间（正 / 反向，**替换**集合）；④`extendTo`（Ctrl+Shift）取并集**不清空**既有集合；⑤`move` 在集合清空后回落 ↑↓ 单选移动（边界 clamp） | 各交互各自生效且互不清空对方；`rangeTo` 保持替换语义、`extendTo` 为并集；集合空时 ↑↓ 仍为单选移动 | ✅ `multiselection.test.mjs`（31） |
| TC-ENH-MS-02 | **AC-005** | R-006 | 单元 + E2E | ①`selectAll` 选中当前可见全部、重复调用返回 `false`（幂等）；②`count() === selectedIds().length` 恒等；③真机点「全选」后「复制选中(N)」的 N === 当前选中条数 | 全选幂等；N 实时 === 选中条数 | ✅ `multiselection.test.mjs`（selectAll / count）+ E2E §3#16 |
| TC-ENH-MS-03 | **AC-006** | R-007 | 单元 + E2E | `tests/bulkformatter.test.mjs`：N 段输出 —— ①段数 === N、标记 `===== #i/N =====` 精确；②每段正文逐字符 === 对应记录的单条 `buildCopyText`（模式 A/B）；③段序 === 输入可见序（不排序）；④段 i 不含其他段标识（无跨条混淆）；⑤段间 `\n\n`；⑥入口等价（N=1 委托单选逐字符、N=0 空串） | N 段清晰分隔、逐段保真、零跨条混淆 | ✅ `bulkformatter.test.mjs`（28）+ E2E §3#16、§4.5 |
| TC-ENH-MS-04 | **AC-004 / AC-006**（混合修饰键并集） | R-004 | 单元（真实 panel.js + DOM shim） + E2E | ①`selectAt + toggleAt + extendTo` 并集断言（先前 Ctrl 项保留）；②真实面板：单击 id1 → Ctrl id2 → Ctrl+Shift id3 → 集合含 1/2/3；③纯 Shift 仍替换 | Ctrl+Shift 并集不丢先前项；纯 Shift 保持替换 | ✅ `multiselection.test.mjs`（extendTo）+ `contextmenu.test.mjs`（面板级混合）+ E2E `AC-004` |

### 1b.3 双击详情（AC-008 / AC-009 / AC-010 / AC-011）

| 用例 ID | AC | 增强 REQ | 类型 | 用例步骤 | 预期结果 | 自动化落点 |
|---------|:--:|:--------:|:----:|----------|----------|:----------:|
| TC-ENH-DT-01 | **AC-008** | R-009 | 单元 + E2E | ①`tests/detail.test.mjs`：`buildDetailText` 六要素齐全且顺序为 方法+URL / 请求头 / 请求体 / 状态码+状态文本 / 响应头 / 响应体；②真机双击行 | ①六要素有序无缺；②`#detail-pane` 打开且 `hidden=false` | ✅ `detail.test.mjs`（26）+ E2E §3#5 |
| TC-ENH-DT-02 | **AC-009** | R-010 | 单元 + E2E | ①`buildDetailText` === `buildCopyText(record, MODE_A, {responseBody})` 逐字符；②非 ASCII（CJK / emoji / 空白 / 转义）逐字符保真；③头保持原始顺序（不排序 / 不合并）；④二进制 / base64 占位与复制口径一致 | 响应体逐字符 === 原始；头保序；不缩进 / 不换行 / 不排序 / 不转 Markdown | ✅ `detail.test.mjs` + E2E §3#6/#7/#8 |
| TC-ENH-DT-03 | **AC-010** | R-011, R-012 | 单元 + E2E | ①`createDetailView`：`open/close/isOpen/currentId` 状态流转、`close` 幂等、`open(null)` 拒绝、新 id 覆盖；②真机：单击仅选中（不打开）、双击才打开、关闭按钮返回列表 | 单击 ≠ 打开；双击打开；可关闭返回列表 | ✅ `detail.test.mjs`（createDetailView）+ E2E §3#9 |
| TC-ENH-DT-04 | **AC-011**（P2） | R-013 | 单元（文本口径）+ E2E | 明细内「复制请求+响应」按钮产物 === 主复制按钮（逐字符） | `detailCopy === oracle(A) === btnA`；复制后详情保持打开 | E2E §3#10（`detail.test.mjs` 提供文本口径 `buildDetailText === buildCopyText`） |

### 1b.4 边界用例（增强，R-C）

| 用例 ID | 边界主题 | AC | 类型 | 用例步骤 | 预期结果 | 自动化落点 |
|---------|----------|:--:|:----:|----------|----------|:----------:|
| TC-ENH-B-01 | **空选 N=0** | AC-005/006 | 单元 | `buildBulkCopyText([], …)` → 空串；`joinBlocks([])` → 空串；多选工具栏计数 `0`、复制按钮禁用 | 空选不产出内容、不崩、按钮禁用 | ✅ `bulkformatter.test.mjs`（N=0 / 非数组降级） |
| TC-ENH-B-02 | **全选幂等** | AC-005 | 单元 | `selectAll()` 连续两次：首次选中返回 `true`，再次返回 `false` 且集合不变 | 重复全选无副作用 | ✅ `multiselection.test.mjs`（selectAll 幂等） |
| TC-ENH-B-03 | **右键落表头** | AC-001 | 单元 + E2E | `resolveRowId` 命中 `.row` 之外的表头 / 空白 → null；真机右键表头不弹菜单 | 不选、不弹菜单 | ✅ `contextmenu.test.mjs` + E2E §3#12 |
| TC-ENH-B-04 | **Shift 跨淘汰项** | AC-004 | 单元 | `rangeTo` 跳过不可见空槽不污染集合；`setIds` 剪枝剔除不可见项、锚点失效则回落；`onEvict` 移除集合成员并更新计数、主光标回落到集合成员 | 范围选择不纳入已淘汰行；淘汰后集合一致 | ✅ `multiselection.test.mjs`（rangeTo / setIds / onEvict） |
| TC-ENH-B-05 | **菜单键盘无障碍** | AC-001 | E2E | 菜单键盘 `↑`/`↓`/`Enter`/`Esc` 全路径可操作并可关闭 | 键盘可达、可触发、可关闭 | E2E（`e2e-report.md` §2.3） |
| TC-ENH-B-06 | **详情期刷新（淘汰失效）** | AC-010 | 单元 + E2E | 明细打开中该记录被环形淘汰 → `createDetailView.onEvict(id)` 自动关闭；真机灌 1000 条触发淘汰 → 明细自动关闭 + Toast「该请求已被淘汰，明细已关闭」 | 淘汰即失效关闭，不留悬空详情 | ✅ `detail.test.mjs`（onEvict，ADR-018）+ E2E §3#13 |

### 1b.5 AC-015「现有基线用例范围」口径（落定）

> 增强里程碑 **AC-015**：*现有基线用例（捕获 / 过滤 / 虚拟滚动 / 单选 / 单条复制 / 剪贴板）全部回归通过。*

**「现有基线用例」定义（明确可判、无歧义）**：

1. **全部 `tests/*.test.mjs` 全量**（**非白名单**）——截至本 TASK 为 **14 个文件 / 264 用例**（清单与逐文件计数见 §4 与 `tests/README.md`）。以 glob `tests/**/*.test.mjs` 为准，**日后新增的测试文件自动纳入基线范围**。
2. **4 个静态门禁脚本全 PASS**：`scripts/check-manifest.mjs`、`scripts/check-syntax.mjs`、`scripts/check-zero-network.mjs`、`scripts/check-panel-shell.mjs`。

**判定**：任一 `tests/*.test.mjs` 用例 `fail`，或任一上述门禁脚本非 PASS → AC-015 **不满足**；全部通过 → **满足**。

**一键复跑（期望值即口径）**：

```bash
node --test "tests/**/*.test.mjs"      # 期望：264 pass / 0 fail（14 文件）
node scripts/check-manifest.mjs        # 期望：PASS (17/17)
node scripts/check-syntax.mjs          # 期望：15/15 files passed
node scripts/check-zero-network.mjs    # 期望：PASS (17/17)
node scripts/check-panel-shell.mjs     # 期望：PASS (34/34)
```

### 1b.6 E2E 实机证据指针（来自 TASK-016）

> 增强里程碑 UI 类 AC（AC-001/002/003/008/009/010/011）与 DEL-007 的**真机证据**不在本文件的自动化矩阵内，指向：

- **报告**：`butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-report.md`
  - Chrome `152.0.7977.84` + Edge `154.0.4258.48` 双端真实「加载已解压」扩展（CDP `Extensions.loadUnpacked`）；**17/17 PASS**、绑定 AC **0 FAIL**、控制台零错误、零 CSP 违规；`verdict=WARN`（含非绑定新观察 G-1/G-2/G-3）。
  - 逐条 AC 断言见报告 §3；剪贴板逐字符原文见 §4；截图见 §5；控制台见 §6；复现步骤见 §9；AC 判定汇总见 §10。
- **原始结果**：同目录 `e2e-artifacts/results-{chrome,edge}.json`、`results-all.json` + 6 张 `E2E-{ctx-menu,detail,multiselect}-{chrome,edge}.png`。
- **执行器（可复现）**：同目录 `e2e-artifacts/harness/run-e2e.mjs`（`harness/cdp.mjs`）。

**完整证据链**：单测（本文件 §1 / §1b + `tests/*.test.mjs`，264 用例）→ E2E（`e2e-report.md`）→ 门禁（§4 四脚本）→ AC-015 回归口径（§1b.5）。

---

## 2. checklist §C 边界用例矩阵（16 项，全覆盖）

> 来源：`checklist.md` §C「边界与异常定义」逐条（16 条）。每条给类型、步骤、预期、自动化落点。

| 用例 ID | 边界主题 | checklist §C 原文要点 | 关联 AC/REQ | 类型 | 用例步骤 | 预期结果 | 自动化状态 |
|---------|----------|----------------------|:-----------:|:----:|----------|----------|:----------:|
| TC-B-01 | 无选中复制 | 无选中请求时点击复制（DEC-008 待确认：置灰/禁用/提示） | AC-003 / REQ-012,014 | 单元 + E2E | ①`selection` 初始无选中，`current()` 返回 null；②浏览器不选中直接点 `#copy-btn` | ①`current()===null`；②按钮禁用/置灰 或 无操作并给出提示（不产生空文本、不写入剪贴板） | ◐（selection ✅ / 面板禁用态 ⏳ 待 E2E） |
| TC-B-02 | GET/HEAD 空体 | 无请求体（GET/HEAD）的复制输出表示 | AC-005,014 / REQ-015 | 单元 | `tests/formatter.test.mjs`：`requestBody` 为 `undefined`/`''` → 不输出 `[Request Body]` 段且**无空行残留** | 不出现请求体段标签；段间空行数正确 | ✅ `tests/formatter.test.mjs`（无请求体） |
| TC-B-03 | 204/304 空体 | 空响应体（204/304/HEAD）的复制输出 | AC-005 / REQ-016 | 单元 | `tests/formatter.test.mjs`：响应体为空串/null → 不输出 `[Response Body]`、无多余空行；`capture.test.mjs`：`content.text===null` → 保留 null | 无响应体段、无残留空行、不抛异常 | ✅ `tests/formatter.test.mjs` + `tests/capture.test.mjs` |
| TC-B-04 | 非文本请求体 | 请求体非文本（FormData/二进制/URLSearchParams）复制规则 | AC-005,014 / REQ-015,023 | 单元 | `tests/capture.test.mjs`：`postData.text` 缺失 → `requestBody=undefined`；`tests/formatter.test.mjs`：仅文本体原样；二进制体按占位规则（与响应体一致的省略语义） | 文本体原样、非文本体不损坏输出、缺失体安全降级 | ✅ `tests/capture.test.mjs` + `tests/formatter.test.mjs` |
| TC-B-05 | 状态码 0 / 失败 | 失败请求（状态码 0、cancel、blocked、CORS 失败）展示与复制 | AC-005,012 / REQ-016 | 单元 | `tests/capture.test.mjs`：`response.status` 缺失 → `0`、`statusText` → `""`、`time` → `0`；`tests/formatter.test.mjs`：status=0 时输出 `0` 而非崩溃 | status=0/statusText="" 正确降级，列表与复制均不抛错 | ✅ `tests/capture.test.mjs` + `tests/formatter.test.mjs` |
| TC-B-06 | 第 1000/1001 条 | 恰好第 1000 条 / 第 1001 条淘汰边界 | AC-013 / REQ-004 | 单元 | `tests/store.test.mjs`：追加 1001 条 → size=1000、**首条被淘汰**、末条保留；cap=3 的 5 条泛化验证 | 恰好 1000 条时无淘汰；第 1001 条追加后最旧淘汰、容量恒定 | ✅ `tests/store.test.mjs` |
| TC-B-07 | 并发/竞态 | 快速连续请求下列表追加与选中一致性 | AC-002,013 | 单元 | `tests/store.test.mjs`：连续 `add` 触发 `subscribe` 事件与 `evictedId`；`tests/selection.test.mjs`：`setIds`/`onEvict` 在选中项被淘汰时清空、未淘汰时保留 | 追加顺序稳定、无重复/丢失；选中项被淘汰即清理，不指向已移除项 | ✅ `tests/store.test.mjs` + `tests/selection.test.mjs` |
| TC-B-08 | 超长/特殊 URL | URL 超长 / 含特殊字符 / Unicode 的列表与复制 | AC-005,012,021 | 单元 + E2E | ①`tests/formatter.test.mjs`：含 Unicode/特殊字符的 URL 逐字符原样；②`tests/render.test.mjs`：超长 URL 固定行高（CSS ellipsis 不换行）；③浏览器粘贴超长 URL 观察 | ①不截断/不转义；②行高稳定不引起重排；③列表不撑破布局 | ◐（单测 ✅ / 真实布局 ⏳ 待 E2E） |
| TC-B-09 | 阈值边界 | 响应体恰等于或略超阈值（=10MB、10MB+1） | AC-010 / REQ-022 | 单元 | `tests/content.test.mjs`：`isOverThreshold(size=10*1024*1024)===false`；`size=10*1024*1024+1===true`；支持自定义阈值（严格大于） | 恰好 10MB 不提示、10MB+1 提示；边界精确 | ✅ `tests/content.test.mjs` |
| TC-B-10 | 超阈值继续复制 | 超阈值"继续复制"写入超长文本的剪贴板行为 | AC-010,022 / REQ-022 | 单元 + E2E | ①`tests/clipboard.test.mjs`：传入超长文本逐字符交给 `writeText`/`execCommand` 不改动；②浏览器超阈值 confirm 确认后复制 | ①完整写入不改动/不截断；②确认后成功 Toast、取消则取消提示 | ◐（clipboard ✅ / confirm 后真实写入 ⏳ 待 E2E） |
| TC-B-11 | 失焦降级 | `navigator.clipboard` 非聚焦/失焦失败时降级链触发 | AC-022 / REQ-034 | 单元 + E2E | `tests/clipboard.test.mjs`：primary reject → `execCommand` 接管；`navigator.clipboard` 不可用 / 无 `navigator` → 接管；双失败返回 `{ok:false,reason}` | 降级链按序触发；每条路径结果对象正确；失败不抛异常 | ✅ `tests/clipboard.test.mjs`（+ ⏳ 真实失焦 E2E） |
| TC-B-12 | DevTools 重开清空 | 关闭再打开后数据应清空（REQ-028 销毁） | AC-020 / REQ-028 | E2E | ①捕获若干请求；②完全关闭 DevTools；③重新打开 DevTools 的 `Raw Copy` 面板 | 列表为空（数据仅存面板内存，随上下文销毁）；无任何持久化残留 | ⏳ 待 E2E（静态层已由 `check-zero-network.mjs` 保证无存储） |
| TC-B-13 | 多 target | 同时打开/切换多个被检查页面时捕获哪一页 | AC-002 / REQ-002 | E2E | 打开两个标签各自产生请求，在 DevTools 中切换 inspected target，观察列表 | 列表跟随当前 inspected target；切换后不串页/不混入其它 target 记录 | ⏳ 待 E2E |
| TC-B-14 | WebSocket | WebSocket（101/帧）在列表与复制中的表现（DEC-006） | AC-002,005 / REQ-002,035 | 单元 + E2E | ①`tests/capture.test.mjs`：`resourceType` 回退链（`_resourceType`→推断→空串）；②浏览器触发 WS，观察列表与复制 | ①WS 作为资源类型出现；②HAR entry 响应体不可用时按约定标注"响应体不可用"（DEC-006），不崩溃 | ◐（类型回退 ✅ / WS 真实帧 ⏳ 待 E2E） |
| TC-B-15 | 非法 Base64 | Base64 解码失败/非法 Base64 的降级输出 | AC-010 / REQ-024 | 单元 | `tests/content.test.mjs`：非法 base64 串 → 不抛异常、回退 `kind=base64-omitted` + `[Base64 content omitted: length N]` 占位；合法 base64+文本 MIME 正确 UTF-8 解码 | 非法输入安全降级为占位；合法输入正确解码（含中文/emoji） | ✅ `tests/content.test.mjs` |
| TC-B-16 | 重复点击 | 复制按钮被快速重复点击时的行为（防抖？重复写入？） | AC-011,022 / REQ-012,025 | 单元 + E2E | ①`tests/clipboard.test.mjs`：连续多次 `copyText` 均返回结果对象且不抛；`showToast` 重复调用复用同一元素并清理旧计时器；②浏览器快速连点 `#copy-btn` | ①无异常、Toast 不叠加/计时器不泄漏；②每次均写入当前选中文本且不卡死（重复写入幂等可接受） | ◐（clipboard ✅ / 面板连点 ⏳ 待 E2E） |

---

## 3. 手工 E2E 步骤索引（真实浏览器）

> 前置：Chrome/Edge 最新版 → `chrome://extensions`（Edge 为 `edge://extensions`）→ 开启开发者模式 → 「加载已解压的扩展程序」→ 选择 `extension/`。
> 所有 E2E 需**截图留证**，并记录浏览器版本号。

| E2E ID | 场景 | 步骤 | 关联用例 |
|:------:|------|------|:--------:|
| E2E-01 | 面板注册 | 打开 DevTools → 查看顶部面板栏 | TC-AC-001 / AC-018 |
| E2E-02 | 实时捕获 | 访问任意站点触发请求 → 观察列表面板实时追加 | TC-AC-002 |
| E2E-03 | 搜索/过滤 | 输入关键字 → 切方法/状态/类型过滤 → 观察结果与空态 | TC-AC-003 |
| E2E-04 | 选中交互 | 点击行 → `↑`/`↓` 切换 → 观察高亮与首尾钳制 | TC-AC-004 |
| E2E-05 | 一键复制保真 | 选 JSON 请求 → 复制 → 粘贴比对逐字符一致（模式 A 默认） | TC-AC-005/007 / TC-B-04/05 |
| E2E-06 | 模式切换 | 切模式 B → 复制 → 确认无标题直接拼接 | TC-AC-015 |
| E2E-07 | 零网络 & 隐私 | 复制时开 DevTools Network 面板 → 确认扩展零请求；打开隐私页核对三项声明 | TC-AC-008/020 |
| E2E-08 | 大响应/二进制 | 触发 >10MB 响应 → 复制确认提示；触发图片请求 → 占位格式 | TC-AC-010 / TC-B-09/10 |
| E2E-09 | 剪贴板降级 | 面板失焦/拒绝权限场景下复制 → 确认 `execCommand` 接管成功 | TC-AC-022 / TC-B-11 |
| E2E-10 | 单条隔离 | 产生多条请求 → 只选一条复制 → 确认不含其它请求信息 | TC-AC-006 |
| E2E-11 | 1000 条性能 | 通过脚本灌入 1000 条 → 滚动/搜索/过滤 | TC-AC-021 |
| E2E-12 | 销毁清空 | 捕获后完全关闭 DevTools → 重开 → 列表为空 | TC-B-12 |
| E2E-13 | 多 target | 双标签切换 inspected target → 列表跟随 | TC-B-13 |
| E2E-14 | WebSocket | 页面建 WS 连接 → 观察列表资源类型与复制表现 | TC-B-14 |
| E2E-15 | 重复点击 | 快速连点复制按钮 → 观察 Toast 与结果 | TC-B-16 |
| E2E-16 | Edge 兼容 | 在 Edge 重复 E2E-01/05/09 | TC-AC-018 |

---

## 4. 可执行门禁脚本清单

| 脚本 | 覆盖 | 运行命令 | 当前结果 |
|------|------|----------|:--------:|
| `scripts/check-syntax.mjs` | 全部 `extension/**/*.js` 语法（build/lint 共用） | `node scripts/check-syntax.mjs` | ✅ 15/15 |
| `scripts/check-manifest.mjs` | AC-009 权限门禁 + devtools_page + 图标（17 项） | `node scripts/check-manifest.mjs` | ✅ 17/17 |
| `scripts/check-panel-shell.mjs` | AC-012/016 面板外壳：7 列表头、DOM 契约、i18n 无裸中文（34 项） | `node scripts/check-panel-shell.mjs` | ✅ 34/34 |
| `scripts/check-zero-network.mjs` | AC-008/020 零网络 + 零持久化 + 无遥测（17 项） | `node scripts/check-zero-network.mjs` | ✅ 17/17 |
| `npm test` | 全部单元用例（14 文件 / 264 用例，含增强新增 5 文件） | `node --test "tests/**/*.test.mjs"` | ✅ 264/264 |

---

## 5. 覆盖统计

| 维度 | 要求 | 实际 | 状态 |
|------|:----:|:----:|:----:|
| AC-001..AC-022 覆盖（基线） | 22 | **22** | ✅ 100% |
| 增强里程碑 AC-001..AC-017 覆盖 | 17 | **17**（见 §1b 三组 + 边界） | ✅ 100%（含 E2E 兜底） |
| checklist §C 边界覆盖 | 16 | **16**（TC-B-01..TC-B-16） | ✅ 100% |
| 增强里程碑边界覆盖 | 6 | **6**（TC-ENH-B-01..B-06） | ✅ 100% |
| 可执行单元用例 | — | 264（14 文件，含增强新增 5 文件） | ✅ 全 PASS |
| 静态门禁脚本 | 4 | 4（syntax/manifest/panel-shell/zero-network） | ✅ 全 PASS |
| 手工 E2E 场景索引（基线） | — | 16（E2E-01..E2E-16） | ✅ 已列 |
| E2E 实机验证（增强，TASK-016） | — | 17/17 PASS（Chrome 152 + Edge 154 双端） | ✅ 见 §1b.6 |

> **未决前置（非本 TASK 阻塞）**：AC-017 体积测量与 AC-019 ZIP 存在性依赖 DEL-015 打包脚本（`scripts/package.mjs` / `dist/raw-copy-1.0.0.zip`），当前标注 ⏳ 待 E2E；DC-001..DEC-008 的最终取值以 `requirement.md` §3.3 为准（本矩阵按已批准默认值：`Raw Copy` / `HTTP/1.1` / 10MB / 模式 A）。

---

<!-- butler:covers DEL-013 AC-019 -->
<!-- butler:covers DEL-007 增强里程碑 AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-008 AC-009 AC-010 AC-011 AC-015（TASK-018 追加 §1b + AC-015 口径 + TASK-016 E2E 指针） -->
