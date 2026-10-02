# 技术评估 — 新建一个 Chrome/Edge DevTools 扩展（Manifest V3）

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> 阶段: Phase ③（技术评估）| 日期: 2026-10-02 | 角色: butler-tech-eval
> 上游: `design.md`（Phase ② 架构设计 + ADR-001..011 + CIA 四维）、`requirement.md`（v1.1：36 REQ / 22 AC / 4 US / 18 DEL）、`spec.json`（80 items，机器真源）、`feasibility.md`（VALUE high / RISK medium / EFFORT medium ≈21 SP）
> 回答的问题：**"这个故事需要改哪些代码？"**
> 只读评估：本文件不修改任何源码、不运行构建。文件级证据锚定 `design.md` 行号。

---

## 0. 全局结论

| 项 | 结论 |
|----|------|
| 影响性质 | **纯新增（greenfield）** —— 全仓无既有 `.js/.html/.css` 源码（design.md §1.3 L71-77），**0 个既有文件被修改/删除** |
| 技术栈 | 原生 ES2020+ / HTML / CSS；MV3 DevTools Extension；**无构建、无框架、无第三方运行时依赖**（design.md §3.2 决策 2，L176-181） |
| 运行形态 | 纯前端、纯本地：无 HTTP 后端、无 DB、无 `chrome.storage` / localStorage / IndexedDB、无网络（design.md §6 L369-400、§8.3 L510-514） |
| 数据形态 | 仅内存 `RequestRecord`（环形缓冲 cap=1000）→ **DB_CHANGES = 无**（design.md §6.2 L393-400） |
| 交付规模 | 约 **25 个新增文件**（含图标/构建产物）+ 3 份文档；估算 **~1200–1800 行**（feasibility.md §一） |
| 工作量 | **medium（≈21 SP）**，对齐 M1–M5（design.md §11 L671-679） |

> ⚠️ **路径规范差异（实现前须冻结）**：`design.md` 采用 `extension/src/*.js` + `extension/panel.js`（extension/ 为扩展根，ADR-010）；而 `butler/tasks/backlog/<slug>/TASK-007.md` 等收敛追补任务使用**扁平文件名**（`clipboard.js` / `panel.js`）。本评估以 `design.md` 为规范路径（唯一权威），并建议在 TASK 落地时统一改写为 `extension/...`，否则打包白名单（ADR-011，只收 `extension/**`）会漏文件。

---

## STORY-CORE-001: DevTools 面板注册与实时请求列表

> 覆盖：**US-002 / US-003 / US-004 的前置链路**（进入面板即见请求）｜REQ-001/002/003/004/005/012 ｜ AC-001/002/012/013/021 ｜ DEL-001/002/003/004/009/017
> design 锚点：§1.1（L29-44）、§3.1（L146-163）、ADR-001（L226-231）、ADR-004（L247-252）、ADR-009（L286-291）、§5.1（L313-323）、§7.1（L408-455）

### AFFECTED_FILES

```
STORY-CORE-001

AFFECTED_FILES:
  1. extension/manifest.json                        [new]
     - change: new
     - description: MV3 清单；manifest_version:3；devtools_page:"devtools.html"；
                    permissions:["clipboardWrite"]（唯一权限）；icons 16/32/48/128；
                    version 单一真源。（design §1.2 L50 / §2 C-1 L112 / ADR-009 L286-291）
  2. extension/devtools.html                        [new]
     - change: new
     - description: 空壳注册页，仅 <script src="devtools.js">（无 inline script，MV3 CSP）。
  3. extension/devtools.js                          [new]
     - change: new
     - description: chrome.devtools.panels.create("Raw Copy", "icons/icon32.png",
                    "panel.html")；不得在此持有 store/监听器（ADR-001 L226-231）。
  4. extension/panel.html                           [new]
     - change: new
     - description: 面板骨架；<script type="module" src="panel.js">；
                    工具栏（搜索框/方法/状态码/资源类型下拉）+ 列表容器 + 复制按钮 + Toast 挂载点。
                    DOM 更新走 textContent（§3.3 约束 5 L219）。
  5. extension/panel.js                             [new]
     - change: new
     - description: ESM 装配根：import store/capture/render/filter/selection/formatter/
                    content/clipboard/i18n 并接线；rAF 批处理订阅 store 变更（§3.1 L146-158 / ADR-002）。
  6. extension/src/capture.js                       [new]
     - change: new
     - description: installCapture({store,onAdd}) → onRequestFinished.addListener(cb)；
                    normalize(harEntry):RequestRecord（§5.2 L325-343 映射 + 降级矩阵）；
                    归一化后丢弃 entry 引用，另设独立异步 enrich：仅 content.text 缺失且 getContent 为函数时，
                    调用 getContent 双形态（回调/Promise）取回正文 → applyContent 原地回填同一记录（ADR-003，2026-10-02 修订）；
                    回调内 O(headers)、禁 JSON 解析/base64/DOM；enrich 有并发/队列上限 + 超时兜底，不长期驻留 entry。
  7. extension/src/store.js                         [new]
     - change: new
     - description: createStore({capacity=1000}) 环形缓冲（固定数组 + head/size），
                    add/get/all/size/clear/subscribe；追加/淘汰 O(1)（ADR-004 L247-252）。
                    id 单调递增；淘汰最旧 → 触发 selection.onEvict（§2 B-2 L102）。
  8. extension/styles/panel.css                     [new]
     - change: new
     - description: 固定行高 28px（虚拟滚动数学前提，ADR-005 L254-259）；URL 超长 ellipsis 不换行。
  9. extension/icons/icon16.png                     [new]
 10. extension/icons/icon32.png                     [new]
 11. extension/icons/icon48.png                     [new]
 12. extension/icons/icon128.png                    [new]
     - change: new
     - description: 4 尺寸 PNG（DEL-017）；MV3 常规要求；打包体积贡献需计入 <200KB。

NEW_APIS:   # 外部只读消费（非本仓服务端点）
  - chrome.devtools.panels.create(title, iconPath, pagePath, cb)
    - auth: 无（MV3 扩展上下文自带）
    - dto: void → cb(panel)
  - chrome.devtools.network.onRequestFinished.addListener(cb) / .removeListener(cb)
    - auth: 无
    - dto: cb(harEntry: HAREntry) → void
  - chrome.runtime.getURL("privacy.html")
    - auth: 无
    - dto: string → "chrome-extension://<id>/privacy.html"

  # 内部 ESM 导出（新增契约；签名冻结见 design §5.3 L347-357）
  - src/store.js:      createStore({capacity=1000}) →
                       { add(rec):id, get(id):rec|undefined, all():rec[], size():number,
                         clear():void, subscribe(fn):unsub }
  - src/capture.js:    installCapture({store,onAdd}) → { uninstall():void }
                       normalize(harEntry): RequestRecord

DB_CHANGES:
  - none  # 无 DB、无持久化、无 chrome.storage（REQ-028 / design §6 L367-400）

TESTS:
  - tests/unit/store.test.mjs (可选，Node 直接 import 纯逻辑):
      环形缓冲容量=1000；追加第 1001 条淘汰最旧；all() 环形顺序正确；subscribe 通知；clear 复位 —— AC-013
  - tests/unit/capture.test.mjs (可选):
      normalize(HAR entry) 字段映射 + 缺失降级（method?/status 0/httpVersion→HTTP/1.1）—— AC-002 / §5.2
  - docs/TESTCASES.md: AC-001（面板与 Elements/Console/Network 并列）、AC-002（实时追加）、AC-012（行字段）
  - 冒烟（浏览器）：load unpacked extension/ → DevTools 出现 Raw Copy 面板

EFFORT: medium
DEPENDENCIES: 无（首个故事，骨架 + 权限 + 图标 + 捕获 + 缓存 + 渲染全链路）

IMPLEMENTATION_ORDER:
  1. manifest.json + icons + devtools.html/js（M1：面板可见）
  2. store.js 环形缓冲（纯逻辑，可先单测）
  3. capture.js 归一化 + 监听（依赖 store）
  4. panel.html/panel.js/styles 骨架 + render.js 虚拟滚动接线（M2）
```

---

## STORY-CORE-002: 搜索 / 多条件过滤 / 单条选中（点击 + ↑↓）

> 覆盖：REQ-006/007/008/009/010/011 ｜ AC-003/004 ｜ DEL-004/005
> design 锚点：§1.1 Filter/Selection/Render（L33-35）、§5.3（L351-353）、§7.2（L459-468）

### AFFECTED_FILES

```
STORY-CORE-002

AFFECTED_FILES:
  1. extension/src/filter.js                        [new]
     - change: new
     - description: applyFilter(records, {query,method,status,resourceType}):Record[]；
                    URL 子串（建议大小写不敏感）+ 方法/状态码/资源类型 AND 组合（§5.3 L351）。
                    无匹配返回空数组（空状态判据见 §10 checklist）。
  2. extension/src/selection.js                     [new]
     - change: new
     - description: createSelection({ids,onChange})：selectAt(i)/move(±1)/selectId(id)/
                    current()/onEvict(id)；键盘 ↑↓ 边界钳制（非环绕，需 DEC 明示，§5.3 L353）。
  3. extension/src/render.js                        [new/edit]
     - change: modify（本故事新增交互层；文件在 CORE-001 已建）
     - description: 虚拟滚动（固定行高 28px + spacer + overscan + DOM 复用）；
                    onSelect 回调上抛选中 id；选中行高亮类切换（ADR-005 L254-259）。
  4. extension/panel.js                             [edit]
     - change: modify
     - description: 工具栏事件 → filter.applyFilter → render.setData；keydown ↑↓ → selection.move；
                    选中变更 → formatter 目标更新（复制按钮使能态）。
  5. extension/styles/panel.css                     [edit]
     - change: modify
     - description: 选中行高亮样式、工具栏布局。

NEW_APIS:
  - src/filter.js:     applyFilter(records, criteria) → Record[]
  - src/selection.js:  createSelection({ids,onChange}) →
                       { selectAt(i), move(delta), selectId(id), current():id|null, onEvict(id) }
  - src/render.js:     createVirtualList({container,rowHeight,overscan,renderRow,onSelect}) →
                       { setData(items), scrollToId(id), refresh() }

DB_CHANGES:
  - none

TESTS:
  - tests/unit/filter.test.mjs (可选):
      query 命中/未命中；方法过滤；状态码（含 0/失败）；资源类型过滤；组合 AND —— AC-003
  - tests/unit/selection.test.mjs (可选):
      selectAt/selectId/move 首末行边界钳制；onEvict 清空选中 —— AC-004 / AC-013 联动
  - docs/TESTCASES.md: AC-003（过滤结果正确 + 空状态）、AC-004（点击/键盘切换）

EFFORT: medium
DEPENDENCIES: STORY-CORE-001（需要 store 数据源与 render 骨架）

IMPLEMENTATION_ORDER:
  1. filter.js 纯逻辑 + 单测
  2. render.js 虚拟滚动窗口化 + onSelect
  3. selection.js 键盘/点击 + 淘汰联动
  4. panel.js/styles 接线与高亮
```

---

## STORY-CORE-003: 一键复制「完整请求 + 完整响应」原文（逐字符保真，模式 A/B）

> 覆盖：**US-001 核心**｜REQ-012/014/015/016/017/018/019/020/021 ｜ AC-005/006/007/014/015 ｜ DEL-006
> design 锚点：§1.1 Formatter（H 风险，L36）、ADR-006（L261-270，门禁级）、§3.3 约束 3/4（L217-218）、§5.3 formatter（L354）
> ⚠️ 这是本项目**唯一 AC 命门（AC-007）**：body 必须逐 UTF-16 码元一致，禁止 parse/缩进/排序/转 Markdown/截断。

### AFFECTED_FILES

```
STORY-CORE-003

AFFECTED_FILES:
  1. extension/src/formatter.js                     [new]
     - change: new
     - description: buildCopyText(record, mode):string；常量 MODE_A='formatted'、MODE_B='raw'。
                    模式 A 结构：===== REQUEST ===== / 请求行+头+空行+[Request Body]/body →
                    空行 → ===== RESPONSE ===== / 状态行+头+空行+[Response Body]/body。
                    模式 B：请求块 + 空行 + 响应块，无标题/标签。
                    元信息（startedDateTime/time/resourceType/mimeType）**仅允许出现在标题段**，
                    不得插入 body（ADR-006 L265-268 / REQ-017）。
                    headers 按数组原序、每行 `Name: Value`，不排序/去重/合并（AC-014 / §2 B-4 L104）。
                    postData.text 为 null → 不输出 [Request Body] 段。
  2. extension/panel.js                             [edit]
     - change: modify
     - description: 复制按钮 → selection.current() → formatter.buildCopyText(record, mode) →
                    若有响应体且 size ≥ 阈值 → 二次确认（见 CORE-004）→ clipboard。
                    模式 A/B 切换控件（默认 A，DEC-005）；无选中时按钮置灰 + 提示（DEC-008）。
  3. extension/src/store.js                         [reference-only]
     - change: reference-only
     - description: 提供 get(id) 取 record；不改。
  4. extension/src/content.js                       [reference-only]
     - change: reference-only
     - description: 由 CORE-004 提供 body 分类结果；formatter 只消费其 text/placeholder。

NEW_APIS:
  - src/formatter.js:  buildCopyText(record: RequestRecord, mode: 'formatted'|'raw') → string
                       （input 仅单条 → 结构性保证单条隔离 AC-006/REQ-014）

DB_CHANGES:
  - none

TESTS:
  - tests/unit/formatter.test.mjs (可选，最高优先级):
      AC-007 逐字符：输入 `{"code":0,"message":"success","token":"xyz789"}` →
        输出片段与原文 codepoint 序列完全相等（无缩进/换行/排序/Markdown 围栏）；
      AC-014：headers 原序、每行 `Name: Value`；同名头不合并；
      AC-015/REQ-018/019：模式 A 含两标题段、模式 B 无标题；
      REQ-015/016：方法/URL/HTTP 版本（缺省 HTTP/1.1）/状态码/状态文本齐备；
      REQ-017：元信息仅出现在标题段、body 段内无元信息；
      REQ-014/AC-006：单条入参不含第二条记录任何字段。
  - docs/TESTCASES.md: AC-005/006/007/014/015 全量用例（含 JSON 逐字符基准样例）

EFFORT: high
DEPENDENCIES: STORY-CORE-002（选中 id）、STORY-CORE-004（content 分类，body 输出可先直通后再接）

IMPLEMENTATION_ORDER:
  1. formatter.js 纯函数（先按"body 原样直通"实现，最小可测）
  2. 逐字符单测（AC-007）钉死回归
  3. panel.js 复制按钮接线 + 模式切换
  4. 接入 content.js 分类（CORE-004）
```

---

## STORY-CORE-004: 大响应 / 二进制 / Base64 内容分类与省略标注

> 覆盖：REQ-022/023/024 ｜ AC-010 ｜ DEL-008
> design 锚点：§1.1 Content（L37）、ADR-008（L279-284）、§3.3 约束 6（L220）、§5.3 content（L355）

### AFFECTED_FILES

```
STORY-CORE-004

AFFECTED_FILES:
  1. extension/src/content.js                       [new]
     - change: new
     - description: classifyBody(responseContent) →
                    {kind:'text'|'binary'|'base64-text'|'base64-omitted'|'unavailable',
                     text?, placeholder?, byteSize:number}。
                    判定顺序（ADR-008）：encoding==='base64' → 文本类 MIME
                    (text/*、application/json|xml|javascript、+json|+xml) 则 atob→UTF-8 解码，
                    否则占位 `[Base64 content omitted: length N]`；
                    非 base64 且 MIME 为 image/*|video/*|audio/*|font/*|
                    application/octet-stream|pdf|zip → `[Binary content omitted: <mime>, <bytes> bytes]`；
                    其余文本 → 原样。解码**仅在复制时刻**发生（§3.3 约束 3 L217）。
  2. extension/src/formatter.js                     [edit]
     - change: modify
     - description: 消费 classifyBody 结果；占位符逐字符输出（对外可见契约，§2 B-6 L106）。
  3. extension/panel.js                             [edit]
     - change: modify
     - description: size ≥ LARGE_BODY_THRESHOLD_BYTES(=10MB, DEC-003) 时提示"响应较大，是否继续复制"。
                    阈值常量集中定义（§3.3 约束 6 L220）。

NEW_APIS:
  - src/content.js:  classifyBody(responseContent) →
                     { kind, text?, placeholder?, byteSize }

DB_CHANGES:
  - none

TESTS:
  - tests/unit/content.test.mjs (可选):
      base64 + text/* → 解码为文本；base64 + image/* → `[Base64 content omitted: length N]`；
      png 二进制 → `[Binary content omitted: image/png, <bytes> bytes]`；
      content.text=null → kind='unavailable'（仅当正文客观不可获取；文本类缺失须先经捕获层异步 getContent 回填，2026-10-02 修订）；
      阈值常量边界（=10MB / >10MB）—— AC-010 / REQ-022/023/024
  - docs/TESTCASES.md: AC-010（大响应提示、二进制/Base64 占位）

EFFORT: medium
DEPENDENCIES: STORY-CORE-003（formatter 接入点）

IMPLEMENTATION_ORDER:
  1. content.js 分类纯逻辑 + 占位符常量
  2. formatter.js 接入（占位/解码分支）
  3. panel.js 阈值提示（确认框）
```

---

## STORY-IO-001: Clipboard 写入 + 降级链 + 成功/失败 Toast

> 覆盖：REQ-025/034 ｜ AC-011/022 ｜ DEL-007
> design 锚点：§1.1 Clipboard（L38）、ADR-007（L272-277）、§5.3 clipboard（L356）、§8.1 剪贴板（L494）

### AFFECTED_FILES

```
STORY-IO-001

AFFECTED_FILES:
  1. extension/src/clipboard.js                     [new]
     - change: new
     - description: copyText(text):Promise<{ok:boolean, via:'clipboard'|'execCommand'|'none', reason?}>；
                    showToast(msg, kind)。主路径 navigator.clipboard.writeText；失败降级
                    document.execCommand('copy')（隐藏 textarea + select() + 恢复焦点）（ADR-007 L272-277）。
  2. extension/panel.js                             [edit]
     - change: modify
     - description: 复制按钮 → clipboard.copyText → 按结果 showToast（成功"已复制到剪贴板"/失败原因）。
  3. extension/styles/panel.css                     [edit]
     - change: modify
     - description: Toast 样式与隐藏 textarea 样式。

NEW_APIS:
  - src/clipboard.js:  copyText(text) → Promise<{ok,via,reason?}>
                       showToast(msg, kind) → void

DB_CHANGES:
  - none

TESTS:
  - tests/unit/clipboard.test.mjs (可选，注入 mock clipboard/execCommand):
      writeText resolve → via='clipboard'；reject → 降级 execCommand 返回 true → via='execCommand'；
      两者皆失败 → ok=false + reason；无网络调用 —— AC-011 / AC-022 / AC-008
  - docs/TESTCASES.md: AC-011（成功/失败提示）、AC-022（降级成功）

EFFORT: low
DEPENDENCIES: STORY-CORE-003（提供待复制文本）

IMPLEMENTATION_ORDER:
  1. clipboard.js 双路径 + 结果对象
  2. Toast 组件（可内联于 clipboard.js 或拆 toast.js —— 见下方差异提示）
  3. panel.js 接线
```

> 🔎 **与收敛 TASK 的差异**：`TASK-007.md` 把 Toast 拆为独立 `toast.js`；`design.md §5.3` 将 `showToast` 并入 `clipboard.js`。建议实现时**以 design 为准（合并在 clipboard.js）或显式增补 toast.js 并更新设计**，避免文件清单不一致。

---

## STORY-META-001: 最小权限 / 无网络 / 无存储 / 隐私合规

> 覆盖：REQ-026/027/028/030/031/032 ｜ AC-008/009/017/018/020 ｜ DEL-010
> design 锚点：ADR-009（L286-291）、§2 C-1/C-5（L112/L116）、§8.3 门禁清单（L510-514）、§9 回退（L521-529）

### AFFECTED_FILES

```
STORY-META-001

AFFECTED_FILES:
  1. extension/manifest.json                        [edit]
     - change: modify（门禁校验点）
     - description: 复核 permissions 仅 ["clipboardWrite"]；无 host_permissions/
                    <all_urls>/tabs/webRequest/declarativeNetRequest（AC-009）。
  2. extension/privacy.html                         [new]
     - change: new
     - description: 静态隐私政策页（无 JS 接口，D-6 L128）；三项声明：
                    不收集数据 / 不传输数据 / 全部本地完成（AC-020）。
  3. extension/src/*.js（全部）                     [reference-only]
     - change: reference-only
     - description: 全仓静态门禁：无 fetch(/XMLHttpRequest/sendBeacon/WebSocket；
                    无 eval/new Function/innerHTML；无 localStorage/sessionStorage/
                    indexedDB/chrome.storage（§8.3 L510-514）。

NEW_APIS:
  - none（privacy.html 无对外 JS 接口）

DB_CHANGES:
  - none（禁止所有持久化 API）

TESTS:
  - 静态扫描（可脚本化）：grep/AST 检查禁用符号（fetch/XHR/beacon/ws/eval/innerHTML/storage）—— AC-008/REQ-027/028
  - DevTools Network 观察：加载+复制全程扩展零请求 —— AC-008
  - docs/TESTCASES.md: AC-009（权限清单）、AC-020（隐私三声明）、AC-017（体积/零依赖）
  - 兼容冒烟：Chrome + Edge（edge://extensions load unpacked）—— AC-018

EFFORT: low
DEPENDENCIES: STORY-CORE-001（manifest 已存在）

IMPLEMENTATION_ORDER:
  1. manifest 权限门禁自检（含打包脚本内断言）
  2. privacy.html 三声明
  3. 全仓禁用符号静态扫描
```

---

## STORY-META-002: i18n（中文优先，结构预留英文）

> 覆盖：REQ-033 ｜ AC-016 ｜ design 锚点：§1.1 i18n（L39）、§5.3 i18n（L357）

### AFFECTED_FILES

```
STORY-META-002

AFFECTED_FILES:
  1. extension/src/i18n.js                          [new]
     - change: new
     - description: t(key, vars?) → string；默认 zh 字典；结构预留 en（不要求完整翻译，DEC-007）。
                   面板可见文案（按钮/表头/Toast/过滤标签）统一走 t()。

NEW_APIS:
  - src/i18n.js:  t(key:string, vars?:object) → string

DB_CHANGES:
  - none

TESTS:
  - docs/TESTCASES.md: AC-016（界面文案中文 + 预留结构存在）
  - tests/unit/i18n.test.mjs (可选)：t() 命中/缺 key 回退

EFFORT: low
DEPENDENCIES: STORY-CORE-002（UI 文案接入点）

IMPLEMENTATION_ORDER:
  1. i18n.js zh 字典骨架
  2. panel/Toast/表头文案接入 t()
```

---

## STORY-DELIV-001: 文档交付（安装 / 使用 / 测试用例 / LICENSE）

> 覆盖：DEL-011/012/013/014 ｜ AC-019 ｜ design 锚点：§1.2（L62-65）、§10.3（L623-626）

### AFFECTED_FILES

```
STORY-DELIV-001

AFFECTED_FILES:
  1. docs/INSTALL.md                                [new]
     - change: new
     - description: Load-unpacked 流程（chrome://extensions / edge://extensions →
                    开发者模式 → 加载已解压 → 指向 extension/）；版本/浏览器适用说明。
  2. docs/USAGE.md                                  [new]
     - change: new
     - description: 打开面板/搜索/过滤/选中/复制/模式切换全流程；
                    **显式警示复制内容可能含 Authorization/Cookie/token 等敏感信息**（§8.1 L489）。
  3. docs/TESTCASES.md                              [new]
     - change: new
     - description: 覆盖全部 22 条 AC 的用例（含 AC-007 逐字符基准样例）。
  4. LICENSE                                        [new]
     - change: new
     - description: MIT 或 Apache-2.0（**二选一需 DEC 定死**，checklist A 项指出未定死不可判定）。

NEW_APIS:
  - none

DB_CHANGES:
  - none

TESTS:
  - 文档评审：安装步骤可复现；使用说明覆盖 6 个操作；测试用例逐条映射 AC
  - 存在性：AC-019 交付物清单齐全

EFFORT: low
DEPENDENCIES: STORY-CORE-003（测试用例需引用保真基准）、STORY-IO-001

IMPLEMENTATION_ORDER:
  1. LICENSE 选型确认（DEC）
  2. INSTALL.md → USAGE.md
  3. TESTCASES.md（对齐 22 AC）
```

---

## STORY-DELIV-002: 图标资源 + 打包脚本 + ZIP 交付

> 覆盖：DEL-015/016/017 ｜ REQ-031 ｜ AC-017/019 ｜ design 锚点：ADR-010/011（L293-305）、§2 C-4（L115）

### AFFECTED_FILES

```
STORY-DELIV-002

AFFECTED_FILES:
  1. scripts/package.mjs                            [new]
     - change: new
     - description: 白名单仅 `extension/**` + LICENSE → dist/raw-copy-<version>.zip；
                    Node 内置能力（zlib 手写 zip 或调系统 Compress-Archive），零运行时依赖（ADR-011）。
                    脚本内断言：体积 < 200KB、manifest 权限仅 clipboardWrite、包内无 butler/docs/.opencode。
  2. dist/raw-copy-1.0.0.zip                        [new 构建产物]
     - change: new
     - description: 版本号取自 manifest.json#version（单一真源，§2 C-6 L117）。
  3. extension/icons/*.png                          [reference-only]
     - change: reference-only
     - description: 由 STORY-CORE-001 产出；打包白名单包含。

NEW_APIS:
  - none（构建脚本，非扩展运行时）

DB_CHANGES:
  - none

TESTS:
  - 打包后解压 → Chrome/Edge load unpacked 成功启动（AC-019）
  - 体积断言 < 200KB（AC-017）
  - 包内容白名单校验（无 butler/、docs/、constraints）

EFFORT: low
DEPENDENCIES: 全部源码故事（STORY-CORE-001..004, STORY-IO-001, STORY-META-001/002）

IMPLEMENTATION_ORDER:
  1. package.mjs 白名单与断言
  2. 生成 ZIP
  3. 双浏览器 load unpacked 冒烟
```

---

## AGGREGATE_ESTIMATE

```
AGGREGATE_ESTIMATE:
  - total_files: 25 新增（其中源码/页面 15，图标 4，文档 3，LICENSE 1，打包脚本 1，ZIP 产物 1）
                 + 可选单测 4（tests/unit/*.test.mjs，非设计强制）
  - total_existing_files_modified: 0
  - total_apis: 0（无 HTTP 端点）
               外部只读消费 7（panels.create / onRequestFinished / runtime.getURL /
                 clipboard.writeText / execCommand / HAR entry 字段 /
                 getContent 常规路径（正文缺失时的必达步骤，异步 enrich 调用 + 原地回填，仅 typeof getContent==='function' 时触发））
               内部新增 ESM 导出 9 个模块（store/capture/filter/render/selection/formatter/content/clipboard/i18n）
  - total_new_tables: 0（无 DB；仅内存 RequestRecord 环形缓冲）
  - total_reqs_covered: 36/36
  - total_acs_covered: 22/22
  - total_dels_covered: 18/18
```

### 工作量分解（对齐 M1–M5）

| 里程碑 | 故事 | 主要文件 | EFFORT |
|:------:|------|---------|:------:|
| M1 | STORY-CORE-001 | manifest/devtools.html+js/panel.html+js/icons | medium |
| M2 | STORY-CORE-001(续) + CORE-002 | capture/store/render/filter | medium |
| M3 | STORY-CORE-003 + IO-001 | selection/formatter/clipboard | **high** |
| M4 | STORY-CORE-004 + META-002 | content/i18n | medium |
| M5 | META-001 + DELIV-001/002 | privacy.html/docs/LICENSE/package.mjs | low |

### 关键路径与风险（滚动）

| 风险 | 关联 | 缓解 |
|------|------|------|
| **AC-007 逐字符保真**（唯一命门） | formatter.js | 纯函数 + 逐 codepoint 单测；ADR-006 定死"只加壳不改 body" |
| 虚拟滚动 + 固定行高约束 | render.js/css | 先冻结行高 28px 再实现；URL ellipsis 不换行 |
| 权限门禁被破坏 | manifest.json | 打包脚本内静态断言；AC-009 双检 |
| 路径命名不一致（extension/** vs 扁平） | 全部 TASK | 实现前统一以 design.md 为规范 |
| 大 body 内存驻留（cap=1000 理论峰值） | store/capture | 丢弃 HAR entry + oversize 标记；软上限日志（§2 B-5 L105） |

### 未决假设（不阻塞编码，实现前一次性确认）

| ID | 项 | 默认值（feasibility.md 建议） |
|----|----|------|
| DEC-001 | 面板名 | `Raw Copy`（界面文案中文） |
| DEC-002 | HTTP 版本回退 | `HTTP/1.1` |
| DEC-003 | 大响应阈值 | 10MB（可配常量） |
| DEC-005 | 默认复制模式 | 模式 A（简单格式化） |
| DEC-008 | 无选中点复制 | 按钮置灰 + 提示 |
| DEC-007 | i18n | 仅预留结构，不要求英文翻译 |
| —— | LICENSE | MIT 或 Apache-2.0（**需定死**） |

---

== ai_features ==
| 功能 | 需要的 AI 能力 | 发现者 |
|------|---------------|--------|
| 复制纯文本供用户粘贴给 AI 分析（US-001/US-003） | **无** —— 本扩展自身不含 LLM 集成 / Agent 编排 / 推理；仅在用户侧与该扩展外部 AI 之间传递文本。落在 Out-of-Scope（requirement.md §3.2「不自动上传/发送给 AI」），属"AI 消费的前置数据处理"，非 AI 能力需求。 | 本 agent |
== end ai_features ==
