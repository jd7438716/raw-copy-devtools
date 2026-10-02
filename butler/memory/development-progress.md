# 开发进度（development-progress）

> 维护: butler-developer | 最后更新: 2026-10-02

## 2026-10-02 — TASK-001 MV3 清单 + devtools 注册页（DEL-001 / DEL-009）

- 状态: ✅ 完成（lint/build: PASS / test: 门禁断言 PASS）
- 交付（均在 `extension/`）:
  - `extension/manifest.json` — MV3；`permissions:["clipboardWrite"]`；`devtools_page:"devtools.html"`；icons 16/32/48/128
  - `extension/devtools.html` — 最小注册页，仅 `<script src="devtools.js">`
  - `extension/devtools.js` — `chrome.devtools.panels.create("Raw Copy","icons/icon32.png","panel.html",cb)`
- 支撑脚本（开发期工具，不进发行包）:
  - `scripts/check-manifest.mjs` — 17 项门禁断言（AC-009 权限门禁 + 禁止键 + devtools_page + icons 存在）
- 验证:
  - `node scripts/check-syntax.mjs` → PASS(2/2) exit 0
  - `node scripts/check-manifest.mjs` → PASS(17/17) exit 0
  - butler-sec-scan R1-R11 → manifest.json / devtools.html / devtools.js 全 PASS
- 约束: 未创建 panel.html/panel.js/privacy.html（其他 TASK 职责）
- 证据: `butler/memory/pair/TASK-001/round-01/developer-output.md`

## 2026-10-02 — TASK-013 图标资源（DEL-017）

- 状态: ✅ 完成（build: N/A / test: N/A，改用独立校验脚本作为等效证据）
- 交付:
  - `extension/icons/icon16.png`（267 B）
  - `extension/icons/icon32.png`（417 B）
  - `extension/icons/icon48.png`（459 B）
  - `extension/icons/icon128.png`（1233 B）
  - 合计 2376 B（2.32 KB），纳入 <200KB 门禁核算
- 支撑脚本（不在 `extension/` 内，不进发行包）:
  - `scripts/gen-icons.mjs` — 零依赖 PNG 生成器（node:zlib）
  - `scripts/verify-icons.mjs` — 独立位级校验（签名/CRC/IHDR/IDAT/IEND）
- 验证:
  - verify-icons.mjs → PASS 4/4
  - .NET System.Drawing 真解码 → 4/4 加载为 32bppArgb，尺寸正确
  - 像素抽样确认配色正确（#1f6feb 底 + 白色页面）
- 约束: 未创建/修改 `extension/manifest.json`（TASK-001 职责）
- 证据: `butler/memory/pair/TASK-013/round-01/developer-output.md`

## TASK-016: i18n 结构（中文优先，预留英文）— 2026-10-02

- 状态: DONE（build/lint/test 全 PASS）
- 新增文件:
  - `extension/src/i18n.js` — `t(key, vars?)` + `dict{zh,en}`；默认 zh，en 结构占位（键集一致）
  - `package.json` — name/type:module/scripts(test|build|lint)
  - `scripts/check-syntax.mjs` — 遍历 `extension/**/*.js` 逐个 `node --check`
  - `tests/i18n.test.mjs` — node:test 5 用例（命中/插值/缺 key 回退/语言切换/en 键集对齐）
  - `tests/README.md` — 测试说明
- 验证: `node --test tests/i18n.test.mjs` PASS(5/5)；`node scripts/check-syntax.mjs` PASS(1/1)；`npm test|lint|build` PASS
- 偏差: `npm test` 脚本从字面 `node --test tests/` 改为 `node --test "tests/**/*.test.mjs"`（Node 24 不再把目录参数作为测试发现目标，否则 MODULE_NOT_FOUND）

## 2026-10-02 — TASK-002 DevTools 面板 UI 外壳（DEL-002 / REQ-005/012/013/033 / AC-012/016）

- 状态: ✅ 完成（lint/build: 语法门禁 PASS / test: 门禁断言 + i18n 覆盖 PASS）
- 交付:
  - `extension/panel.html` — 工具栏 + 7 列表头 + 列表容器 + 复制按钮区 + Toast + 隐私入口；文件内零汉字（全走 `data-i18n`）
  - `extension/styles/panel.css` — 深/浅色令牌、固定行高 `--row-height`、共享 `--col-grid`、选中高亮、空态、Toast
  - `extension/panel.js` — 稳定 DOM 契约 `export const els` + `showToast` / `applyI18n` / `setCopyMode`；列表/过滤/选中/复制留 TODO
- 支撑脚本（开发期工具，不进发行包）:
  - `scripts/check-panel-shell.mjs` — 34 项断言（模块脚本/CSS 引用/7 列/16 个 id/零裸中文/中文字面量扫描/接线骨架/CSS 关键样式）
- 验证:
  - `node scripts/check-syntax.mjs` → PASS(3/3) exit 0（含 panel.js）
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0
  - i18n 键覆盖（21 键 zh+en 均在）→ PASS；CSS 括号平衡 → PASS
- 稳定契约（后续 TASK 不得改名）: `#toolbar #search #filter-method #filter-status #filter-type #list #list-body #copy-btn #copy-req-btn #copy-resp-btn #copy-curl-btn #mode-toggle #toast #empty #copy-actions #privacy-link`
- 约束: 未创建 request-store/list-view/selection/formatter/clipboard/content.js；未改 manifest.json / devtools.js / i18n.js
- 证据: `butler/memory/pair/TASK-002/round-01/developer-output.md`

## 2026-10-02 — TASK-009 隐私政策页 + 零网络/零持久化约束（DEL-010 / REQ-027/028 / AC-008/020）

- 状态: ✅ 完成（lint/build: 语法门禁 PASS / test: 静态扫描 + DOM 契约门禁 PASS）
- 交付:
  - `extension/privacy.html`（**new**）— 纯静态隐私页，零 `<script>`；三项核心声明（不收集任何数据 / 不传输任何数据 / 所有操作在本地完成）+ 摘要短句（不收集数据 / 不传输数据 / 所有操作本地完成）；敏感信息警示（Authorization / Cookie）；数据仅存内存、关闭 DevTools 即销毁；无服务器/无分析/无遥测/无广告；权限说明（仅 clipboardWrite）。复用 `styles/panel.css` 主题令牌 + 内联最小排版样式（不新增 CSS 文件）
  - `extension/panel.js`（**edit，追加**）— 新增 `wirePrivacyLink()`：点击 `#privacy-link` 经 `window.open(href,'_blank')` 打开 privacy.html（不用 chrome.tabs.create，无需 tabs 权限）；同步更新 TASK-009 的过时 TODO 注释
  - `scripts/check-zero-network.mjs`（**new**，开发期工具，不进发行包）— 递归扫描 `extension/**/*.{js,html}`，17 条规则断言无网络/无持久化/无遥测
- 验证:
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
  - 反向探针（临时插入含 `fetch(`/`localStorage` 的文件）→ FAIL(2 项命中) exit 1，随后删除探针复跑 PASS → 证明扫描非空跑
  - `node scripts/check-syntax.mjs` → PASS exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（无回归，含 `#privacy-link` id 契约）
  - privacy.html 内容断言（三条声明两种措辞 / Authorization / Cookie / 销毁 / 无服务器无分析无遥测无广告）→ PASS
- 约束: 未改 manifest.json（权限仍仅 clipboardWrite）；未改 devtools.js；未改 panel.html（已有 `href="privacy.html"`）；panel.js 未引入 fetch/XHR/WebSocket/存储
- 证据: `butler/memory/pair/TASK-009/round-01/developer-output.md`

## 2026-10-02 — TASK-003 请求捕获 + 内存缓存（DEL-003 / REQ-002/003/004/035 / AC-002/013）

- 状态: ✅ 完成（lint/build: 语法门禁 PASS / test: 25 用例 PASS + 全量回归 30/30 PASS）
- 交付（均在 `extension/src/`，接口以 design.md §5.3 为准）:
  - `extension/src/store.js`（**new**，234 行）— `createStore({capacity=1000})` → `{add,get,all,size,clear,subscribe}`；环形缓冲（固定数组 + head/count + `Map(id→rec)`）O(1) 追加/淘汰；subscribe 事件 `{type:'add',id,record,evicted}` / `{type:'clear'}`；零 import
  - `extension/src/capture.js`（**new**，241 行）— `normalize(harEntry,id?)` 纯函数（HAR→RequestRecord，含缺失降级；headers/body 复制不保留 entry 引用）；`installCapture({store,onAdd,chrome?})`→`{uninstall}`，无 chrome（Node）时安全降级
  - `tests/store.test.mjs`（**new**，138 行）+ `tests/capture.test.mjs`（**new**，247 行）— node:test + assert/strict
- 验证:
  - `node --test "tests/store.test.mjs" "tests/capture.test.mjs"` → PASS 25/25 exit 0
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 30/30 exit 0
  - `node scripts/check-syntax.mjs` → PASS(5/5) exit 0（含 capture.js/store.js）
  - 安全自检 → CLEAN（无 fetch/XHR/存储/innerHTML/eval）；依赖自检 → 零 import
- 契约交接: `add` 返回并写回 `record.id`；RequestRecord 字段采用 `requestHeaders/requestBody/responseHeaders/responseContent`；`all()` 顺序=最旧→最新
- 约束: 未创建 render/filter/selection/formatter/clipboard/content.js；未改 panel.js / manifest.json / devtools.js / i18n.js / package.json
- 证据: `butler/memory/pair/TASK-003/round-01/developer-output.md`

## 2026-10-02 — TASK-004 列表渲染 + 搜索/过滤 + 虚拟滚动（DEL-004 / REQ-006/007/008/009/029 / AC-003/021）

- 状态: ✅ 完成（lint/build: 语法门禁 PASS / test: 23 用例 PASS + 全量回归 53/53 PASS）
- 交付（接口以 design.md §5.3 为准；任务文件写 `list-view.js` 已按接口表拆为 filter+render）:
  - `extension/src/filter.js`（**new**）— `applyFilter(records,criteria)`（URL 子串大小写不敏感 / method 精确不区分大小写 / status 精确码或 `2xx..5xx` 码段 / resourceType 全值精确；AND 组合；畸形输入不抛错）+ `collectOptions(records)`（去重稳定排序派生 select 选项）
  - `extension/src/render.js`（**new**）— `computeWindow({scrollTop,viewportHeight,rowHeight,total,overscan})` 纯函数 + `createVirtualList({container,rowHeight,overscan,renderRow,onSelect})`→`{setData,scrollToId,refresh}`；spacer 撑高 + 行绝对定位/transform + DOM 复用池；scroll/resize 重算；无 container/document 安全降级
  - `tests/filter.test.mjs`（**new** 12 用例）+ `tests/render.test.mjs`（**new** 11 用例，含极简 DOM 桩）
  - `extension/panel.js`（**edit，仅追加接线**）— import store/capture/filter/render；`createStore({capacity:1000})` + `installCapture({store,onAdd})`；`#search`(input) + 三个 select(change) → rAF 批处理 → `collectOptions`/`applyFilter` → **倒序最新在上** → `virtualList.setData`；空态 `#empty` 用 `t('empty.title'/'empty.hint'/'empty.noMatch')`；行内 7 列全 `textContent`；保留 `els/showToast/applyI18n/setCopyMode` 导出契约
- 验证:
  - `node --test "tests/filter.test.mjs" "tests/render.test.mjs"` → PASS 23/23 exit 0
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 53/53 exit 0（无回归）
  - `node scripts/check-syntax.mjs` → PASS(7/7) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（无回归；panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
  - AC-021 证据: 1000 条时容器 `.row` 节点数 = 15（可视 10 + overscan 5），断言 `< 50`
- 契约交接: `collectOptions` 输出可直接作为 select 选项 value；`applyFilter` 不改入参；`createVirtualList` 返回严格三项；选中/复制/大响应分别留 TODO(TASK-005/006-007/008)
- 约束: 未改 manifest.json / panel.html / panel.css / store.js / capture.js / i18n.js；未实现其他 TASK 内容
- 偏差: `resourceType` 采用「全值 + 大小写不敏感」（Chrome `_resourceType` 小写 vs UI 大写），仍非前缀匹配（已测 `'doc'` 不命中 `'document'`）
- 证据: `butler/memory/pair/TASK-004/round-01/developer-output.md`

## 2026-10-02 — TASK-005 选中交互（点击 + 键盘上下键）（DEL-005 / REQ-010/011 / AC-004）

- 状态: ✅ 完成（test: 13 用例 PASS + 全量回归 66/66 PASS；lint/build: 三门前禁 PASS）
- 交付:
  - `extension/src/selection.js`（**new**）— `createSelection({ids,onChange})` → `{setIds,selectAt,move,selectId,current,onEvict,reset,index,ids,size}`；唯一选中 / 可见列表内 `move(±1)` / 首尾 clamp 不循环 / `setIds` 失效清理（不指向已移除项）/ `onEvict` 淘汰清空 / `onChange(id,index)` 隔离异常；纯逻辑零浏览器 API
  - `tests/selection.test.mjs`（**new**，13 用例）— 点击单选中 / move 上下 / clamp / 无选中落首尾 / setIds 失效+保留 / onEvict / reset / onChange / 健壮性（非法参数、回调抛错）
  - `extension/panel.js`（**edit，仅追加接线**）— `createSelection` 实例（onChange 同步 `selectedId` + 复制按钮可用态 + `virtualList.refresh()`）；`renderRow` 命中选中 id 加 `.is-selected`+`aria-selected`；`#list-body` 点击委托 → `data-index` → `selectAt` + `#list.focus()`；`#list` keydown ↑↓ → `move` + `preventDefault` + `scrollToId`；`store.subscribe` 的 `evicted` → `onEvict`、`clear` → `reset`；导出 `getSelected()`
  - `extension/panel.html` **未改**（`#list` 已有 `tabindex="0"`）
- 验证:
  - `node --test "tests/selection.test.mjs"` → PASS 13/13 exit 0
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 66/66 exit 0（无回归）
  - `node scripts/check-syntax.mjs` → PASS(8/8) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
- 契约交接: `getSelected()` 返回当前选中 `RequestRecord|null`（TASK-006 formatter 数据入口）；`selection` 的可见列表 = `refreshView` 倒序后的 display 列表（索引与虚拟列表 `data-index` 一致）；复制动作留 TODO(TASK-006/007)
- 约束: 未改 manifest.json / panel.html / panel.css / render.js / store.js / capture.js / i18n.js；未实现其他 TASK 内容
- 证据: `butler/memory/pair/TASK-005/round-01/developer-output.md`

## 2026-10-02 — TASK-006 复制拼接核心（请求+响应原文，模式 A/B，逐字符保真）（DEL-006 / REQ-014..020 / AC-005/006/007/014/015）

- 状态: ✅ 完成（formatter 24/24 PASS；全量回归 90/90 PASS；lint/build + 两道门禁 PASS）
- 交付:
  - `extension/src/formatter.js`（**new**）— 纯函数拼接核心：`MODE_A='formatted'` / `MODE_B='raw'`；
    `buildCopyText(record, mode=MODE_A, options={requestBody?,responseBody?,includeMeta?})`。
    模式 A：`===== META =====` 标题段 → `===== REQUEST =====` → 请求行+头（原序）+（体：空行+`[Request Body]`+body）
    → 空行 → `===== RESPONSE =====` → 状态行+头（原序）+（体：空行+`[Response Body]`+body）；
    模式 B：请求块 + 空行 + 响应块，无任何标题/标签/元信息。body 逐 UTF-16 码元直通，
    绝不 parse/stringify/缩进/换行/排序/压缩/替换/转 Markdown/截断。httpVersion 缺失回退 `HTTP/1.1`。
  - `tests/formatter.test.mjs`（**new**，24 用例）— AC-007 逐码元（不规则空白+字面反斜杠转义+Unicode）、
    双模式 body 一致、golden 契约、单条隔离、头保序/同名不合并/string 兼容、版本回退、空体（GET/HEAD、204/304、null）、
    options 覆盖、includeMeta、纯度。
  - `extension/panel.js`（**edit，仅追加接线**）— `import { buildCopyText, MODE_A, MODE_B }`；
    `buildCurrentCopy(mode?)` / `getLastCopyText()`；`#copy-btn` 点击生成文本（无选中 → `t('copy.hintSelect')`）；
    `setCopyMode` / 模式切换改用 MODE_A/MODE_B；留 `// TODO: TASK-007 clipboard`（本任务不写剪贴板）。
- 验证:
  - `node --test "tests/formatter.test.mjs"` → PASS 24/24 exit 0
  - 双模式逐码元脚本 → `substring===source: true, firstDiffCodepoint=-1`（A/B 皆然）
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 90/90 exit 0（无回归）
  - `node scripts/check-syntax.mjs` → PASS(9/9) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
- 真源裁决: 任务描述对模式 A 的转述（`# started:` 元信息、无 body 段标签）与 design.md **ADR-006（门禁级，被点名为逐字符契约）**
  及 plan/USAGE/i18n/spec 冲突；按「design.md 为设计真源」采用 ADR-006/USAGE.md 渲染（`===== META =====` + 中文标签 + `[Request Body]`/`[Response Body]`），
  body 保真不受影响。详见 `butler/memory/pair/TASK-006/round-01/developer-output.md`。
- 契约交接: TASK-007 消费 `buildCurrentCopy()`/`getLastCopyText()` 写剪贴板 + Toast；TASK-008 用 `options.requestBody/responseBody` 注入分类后 body。
- 约束: 未改 manifest.json / panel.html / panel.css / store.js / capture.js / i18n.js；未创建 TASK-007/008 文件
- 证据: `butler/memory/pair/TASK-006/round-01/developer-output.md`

## 2026-10-02 — TASK-007 剪贴板写入 + 降级链 + Toast（DEL-007 / REQ-025/034 / AC-011/022）

- 状态: ✅ 完成（clipboard 14/14 PASS；全量回归 104/104 PASS；lint/build + 三道门禁 PASS）
- 交付:
  - `extension/src/clipboard.js`（**new**）— `copyText(text, deps?) → Promise<{ok, via:'async'|'execCommand'|'none', reason?}>`：
    主路径 `navigator.clipboard.writeText`（`via:'async'`）→ 降级 `document.execCommand('copy')`（离屏 textarea + focus/select/setSelectionRange + `finally` 清理，`via:'execCommand'`）
    → 双失败 `{ok:false, via:'none', reason}` **永不抛**。`showToast(msg,kind,deps?)` + `createToast(el,options?)`：`textContent`（禁 innerHTML）、类名 `toast--success/error/info`、自动隐藏；`DEFAULT_TOAST_MS=2400`。
    `deps` 可注入 `{navigator, document, el, durationMs, setTimeout, clearTimeout}`。
  - `tests/clipboard.test.mjs`（**new**，14 用例）— 主路径 / 逐字符内容不改动 / primary reject+execCommand 成功 / API 不可用 / 无 navigator / 双失败不抛 / exec 抛异常仍清理 / Toast 类名+自动隐藏+旧计时器清理 / createToast 工厂。
  - `extension/panel.js`（**edit，仅追加接线**）— `import { copyText }`；`#copy-btn` → `buildCurrentCopy()`（无选中 `t('copy.hintSelect')`）→ `await copyText(text)` → 成功 `t('toast.copied')`(success) / 失败 `t('toast.copyFailed',{reason})`(error)；移除 `// TODO: TASK-007 clipboard`。P2 `#copy-req/resp/curl-btn` → `t('copy.notEnabled')` 提示（不阻断主路径）。
  - `extension/src/i18n.js`（**edit**）— 新增 `copy.notEnabled`（zh: 该功能暂未启用 / en: This action is not available yet），键集对齐。
- 验证:
  - `node --test "tests/clipboard.test.mjs"` → PASS 14/14 exit 0
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 104/104 exit 0（无回归）
  - `node scripts/check-syntax.mjs` → PASS(10/10) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
- 契约交接: TASK-008 可继续用 `styles/panel.css` 的 `.toast`；本任务内容不经网络（REQ-025）。
- 约束: 未改 manifest.json（权限仍仅 clipboardWrite）；未创建 TASK-008 文件；未改 panel.js 导出契约
- 证据: `butler/memory/pair/TASK-007/round-01/developer-output.md`

## 2026-10-02 — TASK-008 大响应/二进制/Base64 分类（DEL-008 / REQ-021..024 / AC-010）

- 状态: ✅ 完成（content 19/19 PASS；全量回归 123/123 PASS；四道门禁 PASS）
- 交付:
  - `extension/src/content.js`（**new**）— `DEFAULT_LARGE_THRESHOLD = 10*1024*1024`；
    `classifyBody(responseContent, options?) → {kind:'text'|'binary'|'base64-text'|'base64-omitted'|'unavailable', text?, placeholder?, byteSize}`；
    `isOverThreshold(responseContent, threshold=DEFAULT_LARGE_THRESHOLD)`。判定顺序按 **ADR-008**：base64 分支优先 →
    文本 MIME 解码 / 非文本 MIME 省略；非 base64 且二进制 MIME → binary；其余 → text 原样。Node 用 `Buffer.from(b64,'utf8')`，
    浏览器用 `atob`+`TextDecoder`；非法 base64 先经严格校验（长度 %4、字母表、填充位置）→ 回退 `base64-omitted`，**绝不抛**。
    `byteSize` 优先 `size`，否则按 `text` UTF-8 字节长度估算。
  - `tests/content.test.mjs`（**new**，19 用例）— 文本逐字符原样 / 二进制逐字符占位 / base64 文本 MIME UTF-8 解码（中文+emoji）/ base64 非文本省略 /
    非法 base64 回退（6 种）/ 阈值边界（=10MB false、10MB+1 true、自定义阈值、size 优先+UTF-8 回退）/ 空缺失 unavailable / 输入不可变 / 默认导出。
  - `extension/panel.js`（**edit，仅追加接线**）— `import { classifyBody, isOverThreshold }`；`buildCurrentCopy()` 经 `resolveResponseBodyText(record)`
    注入 `options.responseBody`（text/base64-text 原样、binary/base64-omitted 用 placeholder、unavailable 用 `t('content.unavailable')`）；
    `onCopyClick()` 超阈值先 `confirmLargeCopy(formatSize(size))`（无 confirm 环境不阻断），取消则 `t('copy.cancelled')` 提示且**不复制**。
  - `extension/src/i18n.js`（**edit**）— 新增 `copy.cancelled`（zh: 已取消复制 / en: Copy cancelled），zh/en 键集保持对齐。
- 验证（真实执行）:
  - `node --test "tests/content.test.mjs"` → PASS 19/19 exit 0
  - 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 123/123 exit 0（无回归）
  - `node scripts/check-syntax.mjs` → PASS(11/11) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
  - 集成抽检（classifyBody→buildCopyText）: 文本逐字符注入 PASS；`[Response Body]` 段存在 PASS；二进制占位/中文 emoji 解码正确
- 契约交接: TASK-011 可复用 `classifyBody`/`isOverThreshold` 做用例覆盖；`content.unavailable` 作为无正文降级文案。
- 约束: 未改 manifest.json（权限仍仅 clipboardWrite）；formatter/clipboard/store/capture 未改；仅 panel.js + i18n.js 追加，未改导出契约。
- 证据: `butler/memory/pair/TASK-008/round-01/developer-output.md`

## 2026-10-02 — TASK-014 打包 ZIP + 完整源码 + 体积/零依赖护栏（DEL-015 / DEL-016 / REQ-031 / REQ-032 / AC-017）

- 状态: ✅ 完成（package RESULT: PASS；check-syntax PASS(11/11)；全量回归 123/123 PASS）
- 交付:
  - `scripts/package.mjs`（**new**，开发期工具，不进发行包）— 零第三方依赖、可复现打包脚本。白名单收集 `extension/**`（展平到 zip 根）+ 根 `LICENSE`；
    手写 ZIP（local header + central directory + EOCD；deflate=`zlib.deflateRawSync`；自写 CRC32 `0xEDB88320`；固定 DOS 时间戳 1980-01-01 → 逐字节可复现）；
    输出 `dist/raw-copy-<version>.zip`（version 读自 `extension/manifest.json#version`，C-6 单一真源）。
  - `dist/raw-copy-1.0.0.zip`（**new**，DEL-015）— 21 条目；压缩后 52392B (51.16KB)；解压后 133658B (130.53KB)；`manifest.json` 于根。
  - `package.json`（**edit**）— 新增 `"package": "node scripts/package.mjs"`；test/build/lint 原值保留；未引入 package-lock。
- 三重门禁（同一脚本内）:
  1. **体积**：解压后总体积 < 200KB（204800B）→ 133658 < 204800 PASS；同时打印压缩后体积（明确口径）。
  2. **依赖审计**：扫描 `extension/**/*.js` 的静态/副作用/动态 import；`third-party deps = 0`（全部 9 个 specifier 均为 `./src/*.js` 相对路径）。
  3. **zip 读回**：重新解析生成物（独立 inflate + CRC32 校验）→ 根 `manifest.json` 合法 JSON / `manifest_version===3` / `permissions===["clipboardWrite"]`；`LICENSE` 于根；不含 `butler/ tests/ docs/ scripts/ req.txt` 等；21 条目与磁盘源一一对应（无缺失/多余）。
- 验证（真实执行）:
  - `node scripts/package.mjs` → RESULT: PASS（体积/依赖/读回三项）exit 0
  - 独立解码交叉验证：.NET `System.IO.Compression.ZipFile` 读出 21 条目、尺寸匹配、manifest.json 可读
  - 可复现：sha256 两次运行一致 `1657612ddccce6e0329963e549800a98cf232c27a55aa81b338803f4ab220366`
  - 反向探针：临时 `extension/__probe_dep__.js`（import 'lodash'）→ third-party deps=1 → FAIL exit 1；删除后复跑 PASS（证明审计非空跑）
  - `node scripts/check-syntax.mjs` → PASS(11/11) exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 123/123 exit 0（无回归）
- 约束: `extension/` 内源码**零改动**（只读打包）；未改 manifest.json；未引入第三方依赖 / package-lock
- 证据: `butler/memory/pair/TASK-014/round-01/developer-output.md`

## 2026-10-02 — [增强里程碑] TASK-002 面板新增 DOM 容器与样式（REQ-001/008/015 / DEL-001/004/005）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（lint `check-panel-shell` PASS(34/34) / build `check-syntax` PASS(11/11) / `check-zero-network` PASS(17/17)）
- 交付:
  - `extension/panel.html`（**edit，追加**）— `#multiselect-actions`（含 `#select-all-btn` / `#copy-selected-btn`(初始 disabled) / `#selected-count`）、`#context-menu`（`role="menu"`）、`#detail-pane`（`role="dialog"`）含 `#detail-body`(`<pre>`) / `#detail-close` / `.detail-pane__backdrop[data-detail-backdrop]`；三容器初始 `hidden`；既有 16 个 id 未改名
  - `extension/styles/panel.css`（**edit，追加**）— `.app{position:relative}` 定位上下文；`.multiselect` / `.context-menu`(`position:fixed`) / `.detail-pane`(**`position:absolute; inset:0`** 覆盖式 + 遮罩) 及其子样式；`.row.is-selected:hover` 保证集合高亮可见；全部沿用既有 token
- 验证（真实执行）:
  - `node scripts/check-syntax.mjs` → PASS(11/11) exit 0
  - `node scripts/check-panel-shell.mjs` → PASS(34/34) exit 0（7 列 `col.*` 不破；HTML 零裸中文）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
  - 追加断言：HTML HAN=0；三容器均含 `hidden`；`#detail-body` = `<pre>`；既有 16 id 逐个 OK；CSS 括号平衡 depth=0
- 契约交接: 容器供 TASK-003（工具栏显隐/计数）、TASK-005（`#copy-selected-btn` 使能）、TASK-007（`#context-menu`）、TASK-009（`#detail-pane`/`#detail-body`/`#detail-close`/遮罩）消费；i18n 键 `multi.*` / `detail.*` 由 TASK-010 补齐
- 约束: 未改 `panel.js` / `i18n.js` / `manifest.json`；未引入行为（纯结构 + 样式）
- 证据: `butler/memory/pair/TASK-002-enh/round-01/developer-output.md`（基线同名任务证据保留于 `pair/TASK-002/`）

## 2026-10-02 — [增强里程碑] TASK-001 selection 多选组合包装 `multiselection.js` + 单测（DEL-002 / REQ-006/007 / AC-004 / ADR-012/014/018）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（test: 25/25 PASS；全量回归 170/170 PASS，0 失败；lint/build: `check-syntax` PASS(12/12)；`check-zero-network` PASS(17/17)）
- 交付:
  - `extension/src/multiselection.js`（**new**，约 430 行）— `createMultiSelection({ids,onChange})` 组合包装冻结的 `createSelection`（单选核心）：
    外层 `Set<id>` + `anchorId`；接口 `{selectAt,toggleAt,rangeTo,selectAll,clear,move,current,selectedIds,has,count,setIds,onEvict,ids,size}`；
    精确语义（ADR-014/018）：selectAt 替换集合+anchor+回落单选核心；toggleAt 增/删+更新 anchor（移除主光标时回落集合首个成员）；
    rangeTo 以 anchor 为起点可见闭区间替换集合、跳过空槽、anchor 不变、无 anchor 时回落主光标/selectAt；
    selectAll 可见全选；move 清空集合与 anchor 后委托 `primary.move`（↑↓ 回落单选）；setIds 剪枝 + 主光标再同步；onEvict 移集 + `primary.onEvict`；
    `selectedIds()` 恒按可见列表顺序（批量复制顺序契约）。纯逻辑、零浏览器 API、零第三方依赖（仅相对 import `./selection.js`）。
  - `tests/multiselection.test.mjs`（**new**，25 用例）— 覆盖接口契约全部方法 + 空槽/越界/非法输入/一致性/onChange（含异常隔离）。
- 冻结: `extension/src/selection.js` 与 `extension/src/formatter.js` **零改动**（本任务只新增文件，未写入二者）。
- 验证（真实执行原始输出见回报）:
  - `node --test tests/multiselection.test.mjs` → PASS 25/25 exit 0
  - `node --test tests/selection.test.mjs` → PASS 13/13 exit 0（回归零改动）
  - `node scripts/check-syntax.mjs` → PASS(12/12) exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 170/170，fail 0，exit 0
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0（附加门禁，新模块未触发关键字）
- 契约交接: panel 接线时以 `createMultiSelection` 替换 `createSelection`；行高亮改 `multi.has(id)`；`getSelected` 用 `multi.current()`；批量顺序用 `multi.selectedIds()`；`store.evicted` → `multi.onEvict`；`refreshView` → `multi.setIds`。
- 约束: 未改 `panel.js` / `panel.html` / `i18n.js` / `manifest.json`；未实现其他 TASK 内容。

## 2026-10-02 — [增强里程碑] TASK-004 多记录拼接器 `bulkformatter.js` + 单测（DEL-003 / REQ-009/010/011/022 / AC-006 / US-002 / ADR-015）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（test: 26/26 PASS + formatter golden 24/24 + 全量回归 196/196，fail 0；lint/build: `check-syntax` PASS(13/13)；`check-zero-network` PASS(17/17)）
- 交付:
  - `extension/src/bulkformatter.js`（**new**）— 批量外层聚合，逐条调用**冻结的** `formatter.buildCopyText`（单一真源，绝不重写拼接）：
    - `joinBlocks(blocks, N)`：为第 i 个原样块前置 `"===== #" + i + "/" + N + " =====" + "\n"`（i 从 1、十进制无补零），再以 `'\n\n'` 连接；空数组 → `''`；`total ≤ 1` 不加标记返回首块。
    - `buildBulkCopyText(records, mode=MODE_A, resolveBody)`：N≥2 走 `joinBlocks`；**N===1 委托单选路径**（直接返回单条 `buildCopyText`，逐字符一致、无标记）；N===0 / 非数组 → `''`；顺序严格保留入参数组序（可见列表序）。
    - `resolveBody` 仅当为函数时注入 `{ responseBody: resolveBody(record) }`；缺省时**不传 options**（避免 formatter 的 `hasOwnProperty` 把显式 undefined 当作覆盖而抑制回退）。纯函数、零浏览器 API、零三方依赖。
  - `tests/bulkformatter.test.mjs`（**new**，26 用例）— joinBlocks 模板逐字符/段数与标记数 === N/每段逐字符 === 单条 `buildCopyText`/段序=输入序/无跨条混淆/模式 B 纯原始块/N=1 与单选一致/N=0/resolveBody 注入与回退/非函数安全/纯度/单一真源（`indexOf(single)` 原样子串）/混合非对象项。
- 验证（真实执行原始输出见证据文件）:
  - `node --test tests/bulkformatter.test.mjs` → PASS 26/26 exit 0
  - `node --test tests/formatter.test.mjs` → PASS 24/24 exit 0（golden 零改动）
  - `node scripts/check-syntax.mjs` → PASS(13/13) exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 196/196，fail 0，exit 0（无回归）
  - `node scripts/check-zero-network.mjs` → PASS(17/17) exit 0
- 冻结: `extension/src/formatter.js` **零改动**（本任务只新增文件）。
- 契约交接: panel 批量入口：`resolveBody = (r) => resolveResponseBodyText(r)`（复用既有 `content.classifyBody`，REQ-022），`records` 按 `multi.selectedIds()` 可见顺序传入；`buildBulkCopyText` 输出直接交 `clipboard.copyText`。N===1 时批量入口与单选入口产物逐字符一致（可直接复用单选复制路径）。
- 约束: 未改 `panel.js` / `panel.html` / `i18n.js` / `manifest.json`；未实现其他 TASK 内容。
- 证据: `butler/memory/pair/TASK-004-enh/round-01/developer-output.md`（基线同名任务证据保留于 `pair/TASK-004/`）

## 2026-10-02 — [增强里程碑] TASK-006 右键菜单纯逻辑 `contextmenu.js` + 单测（DEL-001 / REQ-001..004 / AC-001/003 / US-001/004 / ADR-013/014）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（test: 39/39 PASS + 全量回归 235/235，fail 0；lint/build: `check-syntax` PASS(14/14)；附加 `check-zero-network` PASS(17/17) / `check-panel-shell` PASS(34/34)）
- 交付:
  - `extension/src/contextmenu.js`（**new**）— 纯逻辑（零 DOM、零浏览器 API、零三方依赖，Node 直测）：
    - `resolveRowId(event, listBodyEl)` → `recordId|null`：`event.target.closest('.row')` → 读 `data-id`；表头/空白/未渲染行/畸形事件 → `null`（`E_CTX_NO_TARGET` 语义，**绝不抛**）。**规范十进制整数串还原为 number**（`String(Number(raw))===raw`），保证与 store 的 number id / `selection.selectId` / `multi.has` 严格相等命中；非常规 id 与 `007` 等非规范写法保留字符串。
    - `createMenuModel({hasSelection,count,canCopyRequestOnly})` → `MenuItem[]`（`{id,i18nKey,enabled,action,p2,vars}` 纯数据、无渲染）：主项「复制请求+响应（原始）」**常驻**（`enabled=hasSelection`）；`count>=2` 追加「复制选中(N)」（`vars:{count}`，ADR-014）；「仅复制请求/仅复制响应」P2 占位常驻、`p2=true`、`enabled=hasSelection&&canCopyRequestOnly`（默认禁用，绝不误触发未接线能力）。
    - `clampPosition({x,y,w,h,vw,vh})` → `{left,top}`：视口四边夹取；菜单大于视口 → 对齐 (0,0)；非有限输入按 0，不抛。
    - 另导出 `E_CTX_NO_TARGET` / `CTX_ACTION` / `CTX_ITEM_ID` 常量供 panel 分派。
  - `tests/contextmenu.test.mjs`（**new**，39 用例）— 命中/嵌套/`dataset` 降级/数值还原/非规范串/表头空白/无 data-id/包含性/非抛健壮性（closest 与 contains 抛错）；clampPosition 四边+居中原样+超大菜单+贴边+非有限；createMenuModel count=0/1/2/5 项集与顺序、主项常驻、禁用态、P2 开关、形状稳定、纯度、入参不改。
- 验证（真实执行原始输出见证据文件）:
  - `node --test tests/contextmenu.test.mjs` → PASS 39/39 exit 0
  - `rg -n "chrome\.contextMenus" extension/src/contextmenu.js` → 0 命中 (PASS)
  - `node scripts/check-syntax.mjs` → PASS(14/14) exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 235/235，fail 0，exit 0（基线 196 无回归）
  - 附加: `check-zero-network` 17/17 PASS；`check-panel-shell` 34/34 PASS；`innerHTML|document.|window.|chrome.` 于两文件 0 命中
- 契约交接: TASK-007 消费三导出接线 panel（右键委托 / 菜单渲染 textContent / 关闭时机）；`canCopyRequestOnly` 为 P2 执行路径（R-A：P-A/P-B/P-C）统一开关。i18n `contextmenu.*` 四键由 TASK-010 补齐。
- 遗留: P2 执行路径裁决归 TASK-007；i18n 键归 TASK-010；`extension/styles/panel.css:396` 既有注释含全仓文本扫描易假阳性的 API 名（非本 TASK 范围，建议门禁限定 `-g '*.js' -g '*.html'`）。
- 约束: 未改 `panel.js` / `panel.html` / `panel.css` / `i18n.js` / `manifest.json`；未实现其他 TASK 内容。
- 证据: `butler/memory/pair/TASK-006-enh/round-01/developer-output.md`

## 2026-10-02 — [增强里程碑] TASK-008 双击明细视图逻辑 `detail.js` + 单测（DEL-004 / REQ-013/014 / AC-008/009 / US-003 / ADR-017/018）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（test: 26/26 PASS + formatter golden 24/24 零改动 + 全量回归 261/261，fail 0；lint/build: `check-syntax` PASS(15/15)；`rg innerHTML extension/src/detail.js` 0 命中）
- 交付:
  - `extension/src/detail.js`（**new**）— 仅 import 冻结的 `formatter.js`：
    - `buildDetailText(record, resolveBody)` **恒等于** `buildCopyText(record, MODE_A, {responseBody: resolveBody(record)})`（逐字符，与复制口径同源）；无 copyMode 入参 → 不随面板 A/B 切换而变（A-4）。`resolveBody` 非函数 → 回退 `buildCopyText(record, MODE_A)`。六要素由 formatter 结构天然覆盖（方法+URL / 请求头 / 请求体 / 状态码+状态文本 / 响应头 / 响应体）。不 import `content`；分类由调用方注入（AC-014 同源）。
    - `createDetailView({container, body, resolveText, onClose})` → `{open(id), close(), isOpen(), currentId(), onEvict(id)}`：纯逻辑开合状态机（无 DOM 亦可测）；`open(id)` 拒绝 null/undefined；`close()` 幂等且清空 `textContent`、隐藏容器；`onEvict(id)` 命中当前项自动关闭（ADR-018）；`resolveText`/`onClose` 异常隔离。
    - 渲染只用 `textContent`；源码**零 `innerHTML`**（防不可信请求数据 XSS，design §3.3-2）。
  - `tests/detail.test.mjs`（**new**，26 用例）— 逐字符口径（CJK/emoji/空白/转义）、不随 copyMode 变化、六要素顺序、头原序、降级（缺请求体/空响应体/缺状态码/非对象/非函数 resolveBody）、分类占位注入、状态机 open/close/isOpen/currentId/幂等/非法 id/onEvict/DOM 注入+hidden/异常隔离/往返稳定 + 源码静态断言无 `innerHTML`。
- 验证（真实执行原始输出见证据文件）:
  - `node --test tests/detail.test.mjs` → PASS 26/26 exit 0
  - `node --test tests/formatter.test.mjs` → PASS 24/24 exit 0（冻结 golden 零改动）
  - `node scripts/check-syntax.mjs` → PASS(15/15) exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 261/261，fail 0，exit 0（基线 235 无回归）
  - `rg -n "innerHTML" extension/src/detail.js` → 0 命中（exit 1）
- 冻结: `extension/src/formatter.js` / `extension/src/selection.js` **零改动**（本任务只新增两文件）。
- 契约交接: TASK-009 接线时 `resolveText = (id) => { const r = store.get(id); return r ? buildDetailText(r, resolveResponseBodyText) : ''; }`；store 淘汰事件 → `detailView.onEvict(id)` 自动关闭 + `t('detail.evicted')`；`#detail-body` 即 `body`，`#detail-pane` 即 `container`。
- 约束: 未改 `panel.js` / `panel.html` / `panel.css` / `i18n.js` / `manifest.json`；未实现其他 TASK 内容。
- 证据: `butler/memory/pair/TASK-008/round-01/developer-output-enh-detail.md`（基线同名任务证据保留于 `developer-output.md`）

## 2026-10-02 — [增强里程碑] TASK-003 panel.js 多选接线（唯一契约切换点）（REQ-006/007 / AC-004 / US-002 / ADR-012/014/018）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（全量回归 261/261，fail 0；`check-syntax` 15/15 PASS；`check-panel-shell` 34/34 PASS；`check-zero-network` 17/17 PASS）
- 交付（源码唯一改动 `extension/panel.js`；冻结 `selection.js`/`formatter.js` 零编辑）:
  - (a) L26 import `createSelection` → `createMultiSelection`；`createSelection` 在 panel.js 无调用（仅切换说明注释）
  - (b) `const multi = createMultiSelection({...})` + `activeSelection = multi`（替换原单选实例）；虚拟列表 `onSelect` → `multi.selectAt`
  - (c) `renderRow` 高亮改为 `activeSelection.has(rec.id)`（集合判定）；保留 `current()===id` 作为 ↑↓ 清空集合后单选回落兜底（裁决 R-A，保 REQ-007 可见性）
  - (d) `onChange(primaryId,index,ids)`：同步 `selectedId`；`setCopyButtonsEnabled(主选非空 ‖ 集合非空)`；`updateMultiToolbar()`；`virtualList.refresh()`
  - (e) `refreshView` 的 `selection.setIds` → `multi.setIds(display.map(r=>r.id))`（可见序列剪枝）+ 显式 `updateMultiToolbar()`
  - (f) `#list-body` 点击修饰键分派：`shiftKey→rangeTo` / `ctrlKey‖metaKey→toggleAt` / 无修饰→`selectAt`
  - (g) `#list` ↑↓ → `multi.move(±1)`（内部清空集合回落单选）+ `preventDefault`；`scrollSelectionIntoView` 用 `multi.current()`
  - (h) `store.subscribe`：`add.evicted→onEvict`、`evict→onEvict`、`clear→multi.clear()`（multi 无 reset）
  - (i) 新增 `updateMultiToolbar()` + `wireMultiToolbar()`：`#multiselect-actions` 置可见；`#select-all-btn→multi.selectAll()`；`#selected-count` 经 `t('multi.selectedCount',{count})` 渲染；`#copy-selected-btn` 使能（N=0 禁用）；初始化调用一次并纳入 `refreshView`
  - `els` ADD-only 追加 `multiselectActions/selectAllBtn/copySelectedBtn/selectedCount`；既有导出与 id 全部保留（ADR-020）
- 验证（真实执行原始输出见证据文件）:
  - `node scripts/check-syntax.mjs` → `15/15 files passed` exit 0
  - `node scripts/check-panel-shell.mjs` → `PASS (34/34 项)` exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → `17/17 项通过` exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 261/261，fail 0，exit 0（基线零回归）
  - 接线静态核查（grep）→ `createMultiSelection`/`activeSelection.has`/`multi.setIds`/`multi.onEvict`/`multi.move`/`wireMultiToolbar`/`toggleAt`/`rangeTo`/`selectAll`/`clear` 全部命中；`createSelection` 仅注释
- 裁决/遗留:
  - R-A: 任务 (c) 只要求 `has()`；因 `move()` 清空集合后主光标不在集合内，仅 `has()` 会使 ↑↓ 单选行不可见 → 采用 `has ‖ current()` 兼容扩展
  - R-B: `multi.*` i18n 键由 **TASK-010** 补齐（当前 `t()` 按契约回退 key 字面量，非本任务）
  - R-D: 浏览器级四语义 + 滑出滑回端到端留 **TASK-012**
- 约束: 未改 `panel.html` / `panel.css` / `i18n.js` / `manifest.json` / 任何 `src/*.js`；批量复制本体（`copySelection`/`getSelectedIds`）留 TASK-005
- 证据: `butler/memory/pair/TASK-003-enh/round-01/developer-output.md`（基线同名任务证据保留于 `pair/TASK-003/`）

## 2026-10-02 — [增强里程碑] TASK-007 panel.js 右键菜单接线（含 P2 仅请求/仅响应）（REQ-001..005 / DEL-001 / AC-001/002/003 / US-001/004 / ADR-013/014/020）

- slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- 状态: ✅ 完成（全量回归 261/261，fail 0；`check-syntax` 15/15 PASS；`check-panel-shell` 34/34 PASS；`check-zero-network` 17/17 PASS）
- 交付:
  - (a) `import { resolveRowId, createMenuModel, clampPosition, CTX_ACTION } from './src/contextmenu.js'`；`formatter` import 追加 `REQUEST_SECTION/RESPONSE_SECTION`
  - (b) `els` ADD-only 追加 `contextMenu = #context-menu`
  - (c) `wireContextMenu()`：`#list-body` contextmenu 委托 + 菜单容器 mousedown/click/contextmenu 冒泡隔离
  - (d) `onContextMenu`：`preventDefault` → `resolveRowId` 未命中即 return（表头/空白不弹不改不抛）→ 命中行 `multi.selectAt(data-index)`（右键即单选替换）→ `createMenuModel` 渲染（全 `textContent`）→ `clampPosition` 定位
  - (e) 关闭时机 Esc / 菜单外 mousedown / #list scroll / window blur；关闭清空子节点+解绑文档监听；键盘 ↑↓（跳禁用、聚焦）/Enter/Esc
  - (f) 主路径 `onCopyClick` 重命名 `runCurrentCopy`，`#copy-btn` 与菜单主项共用 → AC-002 逐字符等价（A/B 两模式）
  - (g) count≥2 菜单追加「复制选中(N)」→ 复用 `copySelection(copyMode)`
  - (h) P2（R-A 采纳 P-A）：`extractSectionText` 按段标记对 `buildCurrentCopy(MODE_A)` 逐字符裁剪；`runSectionCopy` 供菜单 P2 与 `#copy-req-btn`/`#copy-resp-btn` 共用（AC-003 等价）；模式 B 菜单禁用 + 按钮 `copy.notEnabled`
  - (i) 追加式导出 `openContextMenu(event)`（default export 11→12 项）
  - `panel.css` 改述 1 行注释，去掉 `chrome.contextMenus` 字面量（全仓门禁假阳性清零，样式逻辑不变）
- 验证（真实执行原始输出见证据文件）:
  - `rg "chrome\.contextMenus" extension/` → 0 命中；`rg "innerHTML" extension/panel.js` → 0 命中
  - `node scripts/check-syntax.mjs` → `15/15 files passed` exit 0
  - `node scripts/check-panel-shell.mjs` → `PASS (34/34 项)` exit 0（panel.js 中文字面量 0）
  - `node scripts/check-zero-network.mjs` → `17/17 项通过` exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 261/261，fail 0，exit 0
  - 临时 headless harness（手写 DOM 桩，跑完即删）→ AC-001/002/003 + 关闭路径 + 导出 API 全断言 PASS
- 裁决/遗留:
  - R-A: P2 按段标记裁剪（P-A），模式 A 生效；模式 B 无标记 → 菜单禁用 / 按钮 notEnabled（design §10.5 非阻塞）
  - R-B: `contextmenu.*`（+ `multi.*`）i18n 键由 **TASK-010** 补齐（当前 `t()` 回退键名，非本任务）
  - R-C: 键盘可达性细项 + 真实浏览器 E2E 留 **TASK-012/016**
- 约束: 未改 `panel.html` / `i18n.js` / `manifest.json` / 冻结 `formatter.js`/`selection.js`/`contextmenu.js`；既有 id / 既有导出名全未改
- 证据: `butler/memory/pair/TASK-007-enh/round-01/developer-output.md`（基线同名任务证据保留于 `pair/TASK-007/`）

## TASK-009（增强：panel.js 双击详情接线 / P2 详情内复制 / 淘汰自动关闭）(2026-10-02)

- 交付 `extension/panel.js` 详情接线（唯一改动文件，追加式）:
  - (a) import `buildDetailText`/`createDetailView`；(b) `els` 追加 `detailPane/detailBody/detailClose/detailBackdrop`
  - (c) `wireDetail()`：`#list-body` dblclick → `resolveRowId`（复用 contextmenu）→ `openDetailRecord(id)`；ADR-014 不改集合/不 stopPropagation
  - (d) 关闭三路径：`#detail-close` / document Escape（仅 isOpen 时）/ `#detail-pane` click 且 target 不在 `.detail-pane__surface`
  - (e) 既有 `store.subscribe` 增 `handleDetailEvict`：`add.evicted` 与 `evict` 双路径 → `detailView.onEvict(id)` 命中即自动关闭 + `t('detail.evicted')`；`clear` 同步关
  - (f) 响应体口径复用 `resolveResponseBodyText`（AC-014）
  - (g) 追加式导出 `openDetail(id)`/`closeDetail()`（default export 12→14）
  - (h) P2 `#detail-copy-btn` 由 JS 插到 `#detail-close` 旁；复用 `buildCurrentCopy(copyMode)` → `writeCopyText`（AC-011），复制不关闭明细
- 验证（真实执行原始输出见证据文件）:
  - `node scripts/check-syntax.mjs` → `15/15 files passed` exit 0
  - `node scripts/check-panel-shell.mjs` → `PASS (34/34 项)` exit 0（panel.js 中文字面量 0，literals=347）
  - `node scripts/check-zero-network.mjs` → `17/17 项通过` exit 0
  - `node --test "tests/**/*.test.mjs"` → PASS 261/261，fail 0，exit 0
  - `rg "innerHTML" extension/panel.js` → 0 命中
  - 临时 headless harness（本地 Chrome via chrome-devtools MCP + 同源静态服务器，跑完删）→ 23/23 PASS（单击不打开 / 双击六要素序 / 模式 A 不变 / 关闭三路径 + 列表保持 / P2 === 主按钮 / 淘汰自动关闭 + toast / errors=[]）
- 裁决/遗留:
  - R-A: `detail.title/detail.close/detail.copyButton/detail.evicted` i18n 键由 **TASK-010** 补齐（`t()` 回退键名，无裸中文）
  - R-B: 按任务明确要求 developer 自跑 `node --test`，与宪法红线 19 张力；正式门禁仍应由 **butler-tester** 复跑出证
  - R-C: 真实 load-unpacked E2E + 键盘可达性细项留 TASK-012/016
- 约束: 未改 `panel.html` / `i18n.js` / `manifest.json` / 冻结 `formatter.js`/`selection.js`/`detail.js`/`contextmenu.js`；既有 id 与既有导出名全未改
- 证据: `butler/memory/pair/TASK-009/round-01/developer-output-enh-dblclick.md`（`pair/TASK-009/round-01/developer-output.md` 属同号基线隐私页任务，未覆盖）

## TASK-011 / TASK-012 rework（打包体积门禁失败修复）(2026-10-02)

- 状态: ✅ 完成（package PASS / 回归 264/264 / 四门禁 PASS）
- 问题: `node scripts/package.mjs` FAIL —— 解压后 236655 B (231.11 KB) ≥ 204800 B (200KB)
- 交付 `scripts/package.mjs`（唯一改动文件，TASK-011/012 rework）:
  - (a) `stripJsComments(src)`：打包期对 `.js` 做保守「整行」剥离（`//` 行注释 / 块注释 / 整行空白），保留其余行原样
  - (b) `checkJsSyntax(code)`：写 `os.tmpdir` 临时 `.mjs` → `node --check` → `finally` 删除
  - (c) 入包前逐 `.js` 强制 `node --check`，任一失败即 `exit 1` 且**不写出 zip**（fail-closed）
  - (d) 读回阶段从磁盘源独立重推期望字节 + 对读回 `.js` 二次 `node --check`
  - (e) `.html/.css/.png/.json/LICENSE` 不剥离；阈值 200KB 不变；未删除任何功能/测试/源码
- 验证（原始输出见证据文件）:
  - `node scripts/package.mjs` → PASS；解压后 `139364 B (136.10 KB)` < 200KB（目标 ≤160KB 达标）；ZIP 压缩 42614 B
  - JS 剥离前后: `207814 B → 110523 B`（节省 97291 B = 注释 96708 + 空白 583）
  - 独立解码器（.NET `ZipFile` / PowerShell `Expand-Archive`）解压 25 条目 → 15/15 `.js` `node --check` PASS，fail=0
  - `node --test "tests/**/*.test.mjs"` → PASS 264/264，fail 0
  - check-syntax 15/15 / check-manifest 17/17 / check-zero-network 17/17 / check-panel-shell 34/34 全 PASS
  - 反向探针：临时插入语法错误 `.js` → `[FAIL] 剥离后 node --check 失败` exit 1（未写出 zip），删除复跑 PASS
  - 可复现：两次运行 sha256 一致 `24c2089a…f2fb5d`；`dist/raw-copy-1.1.0.zip` 由独立 .NET 读回 manifest@root=True / MV3 / permissions=clipboardWrite
- 约束: 未改 `extension/` 源码（含冻结模块）、其它门禁脚本；未绕过门禁/未调阈值
- 证据: `butler/memory/pair/TASK-011/round-01/developer-output.md`（`pair/TASK-012/round-01/` 镜像）
