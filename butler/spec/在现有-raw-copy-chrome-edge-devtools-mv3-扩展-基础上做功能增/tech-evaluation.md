# 技术评估 — 在现有 Raw Copy（Chrome/Edge DevTools MV3）基础上做功能增强

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> 阶段: Phase ③（技术评估）| 日期: 2026-10-02 | 角色: butler-tech-eval
> 上游: `design.md`（Phase ② 架构设计 + CIA 四维 + ADR-012..020）、`requirement.md`（v1.0：4 US / 24 REQ / 8 DEL / 17 AC = 53 items）、`spec.json`（机器真源）、`feasibility.md`（VALUE high / RISK medium / EFFORT medium ≈19 SP+2）、`checklist.md`
> 回答的问题：**"这个故事需要改哪些代码？"**
> 规范: **只读评估**——本文件不修改任何源码、不运行构建。所有文件行号已对**磁盘真实源码**逐条复核（非转述 design.md）。
> 反哺: 已写 `butler/tasks/loads/3.1-butler-tech-eval.json`；`butler/learned/butler-tech-eval.md`。

---

## 0. 全局结论

| 项 | 结论 |
|----|------|
| 影响性质 | **增量增强（incremental）** —— 在既有 `extension/`（11 个源文件已交付）上叠加，**0 新增权限 / 0 新增网络 / 0 新增第三方依赖 / 0 新增浏览器 API 授权** |
| 冻结契约 | `src/selection.js`（275 行）与 `src/formatter.js`（333 行）**字节级冻结**（design §3.3 约束 1 / ADR-012）；单选复制输出逐字符不变（AC-007 / DEC-007） |
| 新增源码 | **4 个纯原生 ESM 模块**：`src/multiselection.js`、`src/contextmenu.js`、`src/bulkformatter.js`、`src/detail.js` |
| 修改源码 | **4 个**：`panel.js`（唯一 UI 编排中心，891 行）、`panel.html`（125 行）、`styles/panel.css`（387 行）、`src/i18n.js`（255 行）；`manifest.json` 仅版本号 |
| 运行形态 | 纯前端、纯本地、无 HTTP 后端、无 DB、无 `chrome.storage`/localStorage/indexedDB（ADR-019 / check-zero-network） |
| DB_CHANGES | **无**（无持久化；仅内存态集合/详情/菜单，关闭 DevTools 即销毁） |
| 交付规模 | 新增 4 模块 + 4 测试文件 + 文档/门禁修改；源码增量估 **~700–1000 行**，测试增量估 **~350–500 行** |
| 工作量 | **medium（≈19 SP + 2）**，风险集中在 `multiselection.js`+`panel.js` 接线（feasibility R-02 降级为"不动既有"） |
| 破坏面 | 集中在 `panel.js` 的 6 处 selection 接线点（design A-1）+ `i18n.js` 键集对齐；两大高风险模块零侵入 |

> ⚠️ **实现前必须冻结的 3 条硬门禁**（design 定稿，本文落为依赖）：
> 1. `src/selection.js` / `src/formatter.js` 保持 `git diff` 无输出（AC-007 / ADR-012）。
> 2. 全仓**禁止 `chrome.contextMenus`**（出现即 REJECT，AC-012 / ADR-013）。
> 3. `manifest.json#permissions` 严格 `["clipboardWrite"]`，`chrome.*` 无新增授权面（AC-012 / AC-013）。

---

## 1. 故事分组与覆盖

> spec.json 的 4 条 US 为角色故事；本评估按**可独立交付的功能切片**拆为 4 个 STORY，逐条映射 US/REQ/DEL/AC。
> 53 条 items 全覆盖（对照见 §6 覆盖矩阵）。**无 CLI 类条目**（spec.json 无 `type:"cli"`）。

| STORY | 标题 | 覆盖 US | 覆盖 REQ | 覆盖 DEL | 覆盖 AC | EFFORT |
|-------|------|:------:|---------|:--------:|---------|:------:|
| STORY-ENH-001 | 行级右键上下文菜单复制 | US-001 / US-004 | REQ-001..005 | DEL-001、DEL-006(部分) | AC-001..003 | medium |
| STORY-ENH-002 | 多选批量复制（含全选 / 复制选中 N） | US-002 | REQ-006..012 | DEL-002、DEL-003、DEL-005、DEL-006(部分)、DEL-007(部分) | AC-004..007 | **high** |
| STORY-ENH-003 | 双击明细视图（原始文本，可关闭） | US-003 | REQ-013..017 | DEL-004、DEL-006(部分) | AC-008..011 | medium |
| STORY-ENH-004 | 兼容保持 / 门禁 / 文档 / 全量回归（横切） | US-004 | REQ-018..024 | DEL-006、DEL-007、DEL-008 | AC-012..017 | medium |

---

## STORY-ENH-001: 行级右键上下文菜单复制

> 覆盖：US-001 / US-004 ｜ REQ-001/002/003/004/005 ｜ AC-001/002/003 ｜ DEL-001（+DEL-006 部分）
> design 锚点：§1.1 Panel（L31）、§3.2 决策 A2（L181-187）、ADR-013（L236-241）、ADR-014（L243-254）、§4.2（L322）、§4.4（L352）、§10.2（L569-573）
> 硬约束：**零 `contextMenus` 权限**，面板内自绘 DOM 菜单（ADR-013 门禁级）。

### AFFECTED_FILES

```
STORY-ENH-001

AFFECTED_FILES:
  1. extension/src/contextmenu.js                       [new]
     - change: new
     - description: 纯逻辑（零 DOM 依赖、零浏览器 API，可 Node 直测）：
                    (a) resolveRowId(event, listBodyEl): 事件坐标/目标 → 命中行 recordId。
                        实现路径：event.target.closest('.row') → 读 `data-id`。
                        ⚠️ 采用 render.js 已写入的 `data-id`（render.js:249-252）而非 design 写的
                        `data-index`→数组映射：`data-id` 在 DOM 复用/回收时仍与该元素绑定，
                        不受 window 重排影响，命中更稳（resolveRowId 未命中表头/空白 → null）。
                    (b) createMenuModel({hasSelection, count, canCopyRequestOnly}): MenuItem[]
                        项集：主项「复制请求 + 响应（原始）」常驻；count>=2 追加「复制选中(N)」；
                        「仅复制请求」「仅复制响应」P2（见下方 R-A 风险）。
                    (c) clampPosition({x,y,w,h,vw,vh}): {left,top} —— 视口四边夹取，防溢出。
  2. extension/panel.js                                 [edit]
     - change: modify
     - description: 见下方"接线点"逐条（行号=当前磁盘行号）。
  3. extension/panel.html                               [edit]
     - change: modify
     - description: 新增 `<div id="context-menu" role="menu" hidden>`（§4.4 L352）。
                    ⚠️ check-panel-shell.mjs:140 禁裸中文 → 菜单容器不得内联中文；
                    check-panel-shell.mjs:124-126 要求 `data-i18n="col.*"` 恰好 7 个 →
                    菜单/详情新增文案一律用非 col.* 键，避免破坏该断言。
  4. extension/styles/panel.css                         [edit]
     - change: modify
     - description: #context-menu 绝对定位/层级/阴影；菜单项 hover + 键盘焦点环；沿用既有 token。
  5. extension/src/i18n.js                              [edit]
     - change: modify
     - description: 新增 `contextmenu.*` 键（copyRequestResponse / copyRequestOnly /
                    copyResponseOnly / copySelected / openDetail …），zh/en 同时补齐。
                    契约：en 键集必须严格等于 zh（tests/i18n.test.mjs:55-58 deepEqual）。
  6. tests/contextmenu.test.mjs                         [new]
     - change: new
     - description: resolveRowId（命中/表头/空白/无 closest 降级）；clampPosition 四边；
                    createMenuModel 项集 + count 门限 + 禁用态。

接线点（panel.js，行号为现值）：
     - L21-29   import 区追加 contextmenu 导出
     - L49-69   els 追加 `contextMenu: document.querySelector('#context-menu')`
     - L486+    init() 内新增 wireContextMenu()
     - L662-669 wireSelection() 旁挂 `els.listBody.addEventListener('contextmenu', onContextMenu)`
     - onContextMenu: event.preventDefault() → resolveRowId → **右键即单选替换**
       （调 multi/single 的 selectAt(index)，ADR-014）→ 渲染菜单（textContent，禁 innerHTML，L16）
       → 定位 clampPosition。⚠️ 需对 `mousedown/click` 冒泡做隔离（菜单点击不应触发行 click 委托 L624-643）
     - 关闭时机：Esc / 点击他处 / #list 滚动 / window blur；键盘 ArrowUp/Down + Enter
     - 菜单主项 → buildCurrentCopy(copyMode)（复用 L178-185）→ copyText（复用 L794）
       → Toast（复用 L800-805）——**与 #copy-btn（L808-810）同源，逐字符等价**（AC-002）
     - 复用 L152-167 resolveResponseBodyText / L730-739 confirmLargeCopy（大响应确认）

NEW_APIS:
  # 内部 ESM（新增导出契约）
  - src/contextmenu.js:  resolveRowId(event, listBodyEl) → recordId|null
                         createMenuModel(ctx) → Array<{id, i18nKey, enabled, action}>
                         clampPosition({x,y,w,h,vw,vh}) → {left, top}
  - panel.js (追加导出，向后兼容不破坏既有 9 项导出 src 见 L836-846):
                         openContextMenu(event) → void
  # 浏览器 API 消费（新增，零权限 · DOM 事件）
  - HTMLElement.addEventListener('contextmenu', cb) → void
  # 明确不采用
  - chrome.contextMenus → 禁止（否则新增权限，违反 AC-012 / ADR-013）

DB_CHANGES:
  - none

TESTS:
  - tests/contextmenu.test.mjs: resolveRowId 命中 data-id；表头/空白 → null；
      clampPosition 左/右/上/下四边；createMenuModel count=0/1/2 项集
  - E2E（浏览器）：右键任意行 → 行选中 + 菜单弹出；点主项 → 剪贴板 == #copy-btn 产物（AC-002）
  - 静态门禁：`rg "chrome\.contextMenus" extension/` → 0 命中（ADR-013）
  - 回归：tests/selection.test.mjs（13 用例）零改动 PASS

EFFORT: medium
DEPENDENCIES:
  - "复制选中(N)"菜单项依赖 STORY-ENH-002 的 count()/has()。主项与右键选中可先行（design §11 把多选排 T2 先做）。

IMPLEMENTATION_ORDER:
  1. src/contextmenu.js 纯逻辑 + tests/contextmenu.test.mjs（Node 直测）
  2. panel.html/#context-menu + styles/panel.css 菜单样式
  3. panel.js 右键委托接线（右键选中 + 菜单渲染 + 关闭时机）
  4. 菜单主项 → buildCurrentCopy → copyText → Toast（复用既有链路）
  5. i18n 键（contextmenu.*）+ i18n.test 键集回归
```

### ⚠️ 风险 R-A（design 未细化，实现前须裁决）：P2「仅复制请求 / 仅复制响应」

- design §4.2（L322）称右键菜单「仅复制请求」「仅复制响应」"复用 formatter 两种 body 注入"。
- **源码事实**：`formatter.buildCopyText(record, mode, options)`（L293）**结构固定输出 REQUEST + RESPONSE 两段**（L301-302、L321-330）；`options.requestBody/responseBody` 只覆盖 body 内容，**不会移除任何一段**。因此仅注入 body **无法得到"仅请求"**（仍会输出空 RESPONSE 段起始行）。
- 三条可选落地路径（需 TASK 裁决其一）：
  - **P-A（推荐，零侵入冻结模块）**：在 `contextmenu.js`/`panel.js` 层用 `buildCopyText` 产出的文本**按段标记裁剪**（定位 `===== RESPONSE =====`/`===== REQUEST =====` 边界）。⚠️ 与 AC-007 的"逐字符"无冲突（单条主复制不走此路），但裁剪对模式 B（无标记）不可行。
  - **P-B**：为"仅请求/仅响应"在 `bulkformatter.js` 或新 `formatter` 包装中构造专用文本——**不解冻 formatter**，需新增一个受控入口。
  - **P-C**：若判定 P2 非发布阻塞，本迭代**不实现** REQ-003/REQ-017 P2（design §10.5 L634 已声明 P2 非阻塞），则 AC-003/AC-011 以"未实现则不计"处理。
- 本评估**默认采纳 P-A**（工作量为低），并在 §7 未决项登记。若不裁决，ENH-001/003 的 P2 分支有返工风险。

---

## STORY-ENH-002: 多选批量复制（含全选 / 复制选中 N）

> 覆盖：US-002 ｜ REQ-006/007/008/009/010/011/012 ｜ AC-004/005/006/007 ｜ DEL-002/003/005（+DEL-006/007 部分）
> design 锚点：§3.2 决策 A1/A4/A5（L173-210）、ADR-012（L229-234）、ADR-014（L243-254）、ADR-015（L256-263）、ADR-016（L265-270）、ADR-018（L278-285）
> 最高回归风险故事（feasibility R-02）；设计以「新增包装 + 外层聚合」把风险从"改既有"降为"不动既有"。

### AFFECTED_FILES

```
STORY-ENH-002

AFFECTED_FILES:
  1. extension/src/multiselection.js                    [new]
     - change: new
     - description: 组合式包装（ADR-012）：内部持 `createSelection({ids,onChange})` 作**单选核心**，
                    外层维护 `Set<id>`（selectedIds）+ `anchorId`。导出：
                    createMultiSelection({ids,onChange}) →
                      { selectAt(i), toggleAt(i), rangeTo(i), selectAll(), clear(),
                        move(d), current(), selectedIds(), has(id), count(),
                        setIds(ids), onEvict(id), ids(), size() }
                    语义（ADR-014/015/018）：
                    - selectAt(i): 替换集合 = {id_i}，anchor = id_i，回落单选。
                    - toggleAt(i): 集合内存在则删、否则加；更新 anchor。
                    - rangeTo(i): 以 anchor 为起点、按**可见列表顺序**闭区间；跳过不可见项。
                    - move(d): 清空集合，委托 primary.move(d)（↑↓ 仍单选移动，REQ-007）。
                    - setIds(ids): 集合剪枝——移除不在新可见列表的 id（ADR-018）。
                    - onEvict(id): 移除被淘汰 id + primary.onEvict(id)（计数 N 实时更新）。
                    - current() 委托 primary.current()（供既有 renderRow 主高亮复用）。
                    约束：纯逻辑、零浏览器 API、零第三方依赖 → Node 直测。
  2. extension/src/bulkformatter.js                     [new]
     - change: new
     - description: 外层聚合（ADR-015，**不复制 formatter 逻辑**）：
                    buildBulkCopyText(records, mode, resolveBody) → string
                    joinBlocks(blocks, N) → string
                    模板（N>=2）: join('\n\n', blocks)，block_i = "===== #" + i + "/" + N + " ====="
                                 + "\n" + buildCopyText(record_i, mode, {responseBody_i})
                    N===1: **委托单选路径**，输出与单选逐字符一致（不加序号/分隔线）。
                    顺序 = **可见列表顺序**（非点击先后）。
                    逐条 responseBody 由 panel 经 resolveResponseBodyText 注入（复用 content.classifyBody）。
                    约束：纯函数、零依赖、可 Node 直测；**只调用冻结的 buildCopyText，不重写拼接**（A-3/A-5）。
  3. extension/panel.js                                 [edit]
     - change: modify（本故事为最大接线面）
     - description: 接线点（行号=当前磁盘行号）：
       (a) L26   import 由 `createSelection` 切换为 `createMultiSelection`（ADR-012 唯一契约切换点）
       (b) L508-517 创建 multi 实例；activeSelection = multi（L518）
       (c) L416-419 renderRow 高亮：`activeSelection.current() === rec.id`
                   → 改为 `activeSelection.has(rec.id)`（集合判定，CIA A-2）
       (d) L510-516 onChange：集合或主选变化 → `virtualList.refresh()` + 计数渲染
                   + 复制按钮使能（既有 setCopyButtonsEnabled L438-445 扩展为"选中集合非空"）
       (e) L586-590 refreshView 的 selection.setIds → multi.setIds（剪枝保留可见项，ADR-018）
       (f) L624-643 onListBodyClick：读 event.ctrlKey/metaKey/shiftKey
                   → toggleAt / rangeTo；无修饰 → selectAt（ADR-014）
       (g) L646-659 onListKeyDown：selection.move → multi.move（内部清集合回落单选）
       (h) L696-702 store 事件 onEvict/reset → multi.onEvict / multi.reset
       (i) 新增 wireMultiToolbar()：#select-all-btn → multi.selectAll()；
           #copy-selected-btn → copySelection()；#selected-count 渲染 count()（N=0 禁用）
       (j) 新增 copySelection(mode): 批量复制入口
           - N===0 → showToast(copy.hintSelect)（复用文案）
           - 批量大响应：ADR-016 **一次 confirm 覆盖本批**（批内任一条 isOverThreshold → 一次确认；
             取消则整批不复制 + t('copy.cancelled')）——复用 L730-739 的 confirm 模式但改为批级
           - buildBulkCopyText(选中记录按可见序) → copyText → Toast（成功/失败复用 L800-805）
           - 返回值 {ok,count,reason}（§4.3）
       (k) L178-185 buildCurrentCopy：**保持单选语义不变**（AC-007 冻结路径）
       (l) L836-846 default export 追加 getSelectedIds / copySelection（向后兼容，ADR-020）
  4. extension/panel.html                               [edit]
     - change: modify
     - description: 工具栏容器新增 `#multiselect-actions`（含 `#select-all-btn`、`#copy-selected-btn`、
                    `#selected-count`）（§4.4 L348-351；DEL-005）。既有 id 一律不改名（ADR-020）。
                    无裸中文（check-panel-shell:140），全部 data-i18n。
  5. extension/styles/panel.css                         [edit]
     - change: modify
     - description: 多选工具栏/计数样式；`.is-selected` 既已存在（L231）无需新增，仅确认集合高亮可见性。
  6. extension/src/i18n.js                              [edit]
     - change: modify
     - description: 新增 `multi.*` 键（selectAll / copySelected / selectedCount({count}) /
                    evicted 复用 selection.evicted …），zh/en 对齐。
  7. tests/multiselection.test.mjs                      [new]
     - change: new
     - description: selectAt 替换集合；toggleAt 增删；rangeTo 闭区间 + 跳过不可见；
                    move 清集合回落单选；setIds 剪枝；onEvict 移集 + 计数；count/has/current。
  8. tests/bulkformatter.test.mjs                       [new]
     - change: new
     - description: N=2/3 段数 == N + 恰好 N 个 `===== #i/N =====` 标记 + 段内逐字符等于
                    该条 buildCopyText 原样；N=1 与单选逐字符一致；顺序=输入序；无跨条拼接。
  9. tests/selection.test.mjs                           [reference-only]
     - change: reference-only（**禁改**）
     - description: 13 条既有用例作为 A-5 回归门禁，零改动 PASS。
 10. tests/formatter.test.mjs                           [reference-only]
     - change: reference-only（**禁改**）
     - description: 24 条 golden 用例作为 AC-007 回归门禁，零改动 PASS。

NEW_APIS:
  - src/multiselection.js: createMultiSelection({ids,onChange}) → (见上)
  - src/bulkformatter.js:  buildBulkCopyText(records, mode, resolveBody) → string
                           joinBlocks(blocks, N) → string
  - panel.js (追加导出):    getSelectedIds() → Array<id>
                           copySelection(mode?) → Promise<{ok,count,reason}>

DB_CHANGES:
  - none（新增内存态 selectedIds:Set<number> / anchorId:number|null，见 design §6.1 L369-370；无持久化）

TESTS:
  - tests/multiselection.test.mjs（新）
  - tests/bulkformatter.test.mjs（新）
  - tests/selection.test.mjs（13 用例，回归，禁改）
  - tests/formatter.test.mjs（24 用例 golden，回归，禁改）
  - E2E：Ctrl+点击切换、Shift+范围、单击单选、↑↓ 单选四者互不破坏（AC-004）；
      「全选」选中当前可见列表、N 实时更新（AC-005）；
      多选输出恰好 N 段无混淆（AC-006）

EFFORT: high
DEPENDENCIES:
  - 无前置（design §11 排序中排 T2 先做，风险最高）；被 STORY-ENH-001/003 复用其选中接线。

IMPLEMENTATION_ORDER:
  1. src/multiselection.test.mjs 先写（TDD）+ multiselection.js 纯逻辑
  2. src/bulkformatter.test.mjs + bulkformatter.js（依赖 formatter 冻结契约）
  3. panel.html 工具栏 + styles/panel.css
  4. panel.js (a)-(h) 接线切换到 multi（**单次提交、集中回归**）
  5. panel.js (i)-(j) 工具栏/批量入口接线
  6. i18n multi.* 键 + i18n.test 键集回归
  7. 全量回归：selection(13) + formatter(24) + 既有 11 文件
```

### 实现注意（源码级）

- `activeSelection` 目前是单选实例（L88），`renderRow` L416-419 依赖 `activeSelection.current()`。切到 multi 后 `current()` 仍委托单选核心 → **既有主高亮语义不破**；但集合高亮必须**额外**用 `has(id)` 判定（否则 Ctrl 多选的行不高亮）。
- `virtualList.refresh()`（render.js L305-308）通过 version+1 重跑窗口内 `renderRow`；集合变化**必须**触发 refresh（否则滑出窗口再滑回的行高亮丢失）。
- `refreshView()` L586-590 用 `display.map(r=>r.id)` 注入可见序列；multi.setIds 必须保留"仍可见"的选中、剔除不可见（ADR-018）——注意与"全选范围=可见列表"一致（A-1/A-2）。
- `store.subscribe` L689-703 的 `evicted` 处理：`add.evicted`（L696-697）与 `evict`（L698-699）两条路径都要 `multi.onEvict`。
- 批量输出的 body 注入必须**逐条**调用 `resolveResponseBodyText`（L152-167，含 pending 分支）；纯文本类逐字符原样（保真）。

---

## STORY-ENH-003: 双击明细视图（原始文本，可关闭）

> 覆盖：US-003 ｜ REQ-013/014/015/016/017 ｜ AC-008/009/010/011 ｜ DEL-004（+DEL-006 部分）
> design 锚点：§3.2 决策 A3（L189-195）、ADR-014（L250-251）、ADR-017（L272-276）、ADR-018（L278-285）、§4.4（L353-355）

### AFFECTED_FILES

```
STORY-ENH-003

AFFECTED_FILES:
  1. extension/src/detail.js                            [new]
     - change: new
     - description: (a) buildDetailText(record, resolveBody) →
                        buildCopyText(record, MODE_A, {responseBody: resolveBody(record)})
                        —— 即"复制口径"的模式 A 渲染（ADR-017），**不随面板 A/B 切换变**（A-4）；
                        六要素由 formatter 结构天然覆盖（方法+URL / 请求头 / 请求体 /
                        状态码+状态文本 / 响应头 / 响应体）。
                    (b) createDetailView({container, onClose}) →
                        { open(id), close(), isOpen(), currentId() } —— 开合状态机（纯逻辑部分可测）。
                    渲染必须 `textContent`（<pre>），禁 innerHTML（不可信请求数据）。
  2. extension/panel.js                                 [edit]
     - change: modify
     - description: (a) import detail 导出
                    (b) els 追加 detailPane/detailBody/detailClose
                    (c) wireDetail(): `els.listBody.addEventListener('dblclick', onRowDblClick)`
                        → resolveRowId（**复用 ENH-001 的 contextmenu.resolveRowId**，避免重复行命中逻辑）
                        → openDetail(id)。ADR-014：双击前必发一次 click（该行已被单选替换），
                        双击**不再改动集合**。
                    (d) 关闭：`#detail-close` click / Esc / 点击遮罩 → closeDetail
                    (e) 详情记录被淘汰：在既有 store.subscribe（L689-703）中，若 evicted === detailRecordId
                        → 自动关闭 + t('detail.evicted')（ADR-018）
                    (f) 详情响应体口径复用 L152-167 resolveResponseBodyText（pending/binary/base64 一致，AC-014）
                    (g) 新增导出 openDetail(id)/closeDetail()（§4.3）
  3. extension/panel.html                               [edit]
     - change: modify
     - description: 新增 `#detail-pane`（position:absolute;inset:0，初始 hidden）、
                    `#detail-body`（<pre>，textContent 注入）、`#detail-close`（§4.4 L353-355）。
                    无裸中文（check-panel-shell:140）。
  4. extension/styles/panel.css                         [edit]
     - change: modify
     - description: 覆盖式抽屉 `#detail-pane{position:absolute;inset:0}`、<pre> 滚动/字体、
                    `#detail-close` 按钮、遮罩层级。
  5. extension/src/i18n.js                              [edit]
     - change: modify
     - description: 新增 `detail.*` 键（title / close / copyButton(P2) / **evicted** …），zh/en 对齐。
  6. tests/detail.test.mjs                              [new]
     - change: new
     - description: buildDetailText == buildCopyText(MODE_A) 逐字符；
                    缺请求体/空响应体/状态码缺失时的六要素呈现（formatter 既有降级）；
                    开合状态机（open/close/isOpen/currentId）；不随 copyMode 变化。

NEW_APIS:
  - src/detail.js: buildDetailText(record, resolveBody) → string
                   createDetailView({container,onClose}) → {open(id),close(),isOpen(),currentId()}
  - panel.js (追加导出): openDetail(id) → boolean
                         closeDetail() → boolean
  # 浏览器 API 消费（新增，零权限 · DOM 事件）
  - HTMLElement.addEventListener('dblclick', cb) → void

DB_CHANGES:
  - none（新增内存态 detailRecordId:number|null，design §6.1 L372；无持久化）

TESTS:
  - tests/detail.test.mjs（新）
  - E2E：双击打开含六要素（AC-008）；响应体逐字符==原始、头保持原序（AC-009）；
      可关闭返回、单击不打开（AC-010）；P2 详情内复制 == 主按钮产物（AC-011）

EFFORT: medium
DEPENDENCIES:
  - STORY-ENH-002（选中集合：双击的 click 语义与集合替换）；
  - STORY-ENH-001（复用 contextmenu.resolveRowId 行命中）。

IMPLEMENTATION_ORDER:
  1. src/detail.js 纯逻辑 + buildDetailText 测试
  2. panel.html #detail-pane + styles/panel.css
  3. panel.js dblclick 接线 + 关闭时机
  4. 淘汰联动自动关闭（ADR-018）
  5. i18n detail.* 键 + 键集回归
```

### 实现注意（源码级）

- `detail.buildDetailText` 直接用 `buildCopyText(record, MODE_A, {responseBody})` —— **详情与复制产物逐字符同源**（AC-009 可机械断言），且不触碰 formatter。
- `render.js` 的 `onSelect` 是 `void opts.onSelect`（L311，未派发）；行交互全部经 `#list-body` 事件委托。双击/右键监听都挂 `#list-body`，需各自 `closest('.row')`。
- 双击与单击共存：浏览器先 click 后 dblclick；click 会 `selectAt`（替换集合），dblclick 不再改集合（ADR-014）。不得在 dblclick 里 stopPropagation 误伤选中。

---

## STORY-ENH-004: 兼容保持 / 门禁 / 文档 / 全量回归（横切）

> 覆盖：US-004 ｜ REQ-018/019/020/021/022/023/024 ｜ AC-012/013/014/015/016/017 ｜ DEL-006/007/008
> design 锚点：§1.1 Manifest（L43）、§8.3 安全门禁清单（L501-508）、§9 回退（L512-546）、§10.5（L629-637）、§11 T5（L649）

### AFFECTED_FILES

```
STORY-ENH-004

AFFECTED_FILES:
  1. extension/manifest.json                            [edit]
     - change: modify（仅 version 号）
     - description: version 1.0.0 → 1.1.0（design C-6 L119）；permissions 字节不变
                    ["clipboardWrite"]（manifest.json:7 / AC-012）；devtools_page 不变。
                    ⚠️ 禁改权限清单与任何键（scripts/package.mjs:399-404 断言 permissions 严格等于
                    单元素 ["clipboardWrite"]）。
  2. extension/src/selection.js                         [reference-only / FROZEN]
     - change: reference-only
     - description: **禁改**；门禁：`git diff -- extension/src/selection.js` 无输出（ADR-012/AC-007）。
  3. extension/src/formatter.js                         [reference-only / FROZEN]
     - change: reference-only
     - description: **禁改**；门禁：`git diff -- extension/src/formatter.js` 无输出（ADR-012/AC-007）。
  4. tests/i18n.test.mjs                                [edit]
     - change: modify
     - description: 追加新键必含断言（contextmenu.* / multi.* / detail.*）；
                    键集相等由既有 L55-58 deepEqual 自动覆盖新键（zh/en 必须同步补齐）。
  5. scripts/check-panel-shell.mjs                      [edit，可选增强]
     - change: modify（可选）
     - description: requiredIds（L129-134）追加 #context-menu / #multiselect-actions /
                    #select-all-btn / #copy-selected-btn / #selected-count / #detail-pane /
                    #detail-body / #detail-close 的 id 断言。**非必需**：不追加也不 FAIL。
  6. tests/test-cases.md                                [edit]
     - change: modify
     - description: 追加右键/多选/详情三组用例 + 逐条绑定 AC-001..AC-017；checklist §C 边界（见下）。
  7. tests/README.md                                    [edit]
     - change: modify
     - description: 新增 4 个测试文件条目 + 门禁脚本清单（AC-015 的"基线用例范围"口径落此处）。
  8. docs/USAGE.md                                      [edit]
     - change: modify
     - description: 新增「右键菜单」「多选复制」「双击查看」三节（对齐现有 13 节结构 L1-177）；
                    **显式警示批量内容可能含多份 Authorization/Cookie/token**（design §8.1）；
                    记录多选覆盖原非目标 + 单条仍为默认主场景（REQ-024 / AC-017）。
  9. docs/INSTALL.md                                    [edit]
     - change: modify
     - description: 版本/重新加载（reload unpacked）说明；权限清单复核。

NEW_APIS:
  - none（本故事为门禁/文档/回归，无新接口）

DB_CHANGES:
  - none

TESTS:
  - 4 门禁脚本：check-manifest.mjs / check-syntax.mjs / check-zero-network.mjs / check-panel-shell.mjs
  - package.mjs：解压后 <200KB（L46-47）、零第三方依赖（external.length===0，L260-261）、
    权限 == ["clipboardWrite"]（L399-404）
  - 既有 11 个测试文件全量回归（AC-015）；新增 4 个测试文件
  - 静态负面门禁：`rg "chrome\.contextMenus" extension/` == 0；`rg "innerHTML" extension/` 新增处 == 0
  - 反向探针（沿用 development.md 经验）：临时注入 fetch(/localStorage → check-zero-network 应 exit 1
  - E2E 冒烟：Chrome + Edge load unpacked，右键/多选/双击三条新链路 + 单条 golden 不变
  - checklist §C 待收敛边界（见 §7 未决项）

EFFORT: medium
DEPENDENCIES:
  - STORY-ENH-001 / 002 / 003 全部完成后收口。

IMPLEMENTATION_ORDER:
  1. i18n 键集 + i18n.test 回归（贯穿各故事）
  2. 4 门禁脚本 + package.mjs 全绿
  3. 既有 11 + 新增 4 测试全量回归
  4. docs/USAGE + INSTALL + tests/*.md 更新
  5. E2E 冒烟 + 回退演练（design §9.2）
```

---

## 6. 规格覆盖矩阵（逐条对照 spec.items）

> spec.json 共 **53** items（4 US + 24 REQ + 8 DEL + 17 AC）。**逐条覆盖，无遗漏**。CLI 类条目：不适用。

### 6.1 US（用户故事）

| ID | 覆盖故事 | 落点 |
|----|:--------:|------|
| US-001 | ENH-001 | 右键主项 → `buildCurrentCopy` → `copyText`（panel.js L178-185 / L794） |
| US-002 | ENH-002 | `multiselection.js` + `bulkformatter.js`（ADR-012/015） |
| US-003 | ENH-003 | `detail.js` + `#detail-pane`（ADR-017） |
| US-004 | ENH-001/003/004 | 右键/多选复用复制管线；§8.1 数据安全；门禁 |

### 6.2 REQ

| ID | 覆盖故事 | 落点（文件/ADR） |
|----|:--------:|-----------------|
| REQ-001 | ENH-001 | `#context-menu`；ADR-013；`contextmenu.resolveRowId` |
| REQ-002 | ENH-001 | 菜单主项 → `buildCurrentCopy` |
| REQ-003 | ENH-001(P2) | 菜单模型 P2 项（**R-A 待裁决**） |
| REQ-004 | ENH-001 | 复用 L178-185/L794/L800-805（同源等价，AC-002） |
| REQ-005 | ENH-001 | `#copy-btn` 保留（不改）；右键为主入口 |
| REQ-006 | ENH-002 | `multi.toggleAt/rangeTo`（ADR-014） |
| REQ-007 | ENH-002 | `multi.move` 清集合回落单选；`selection.move` 冻结 |
| REQ-008 | ENH-002 | `#select-all-btn`/`#copy-selected-btn`/`#selected-count` |
| REQ-009 | ENH-002 | `bulkformatter.joinBlocks`（ADR-015 模板） |
| REQ-010 | ENH-002 | 段内 = 各自 `buildCopyText`（模式 A/B 保持） |
| REQ-011 | ENH-002 | 段边界唯一（`===== #i/N =====`），无跨条拼接 |
| REQ-012 | ENH-002 | `selection.js`/`formatter.js` 冻结；golden 回归 |
| REQ-013 | ENH-003 | `#detail-pane`/`#detail-body`；`detail.buildDetailText` 六要素 |
| REQ-014 | ENH-003 | `buildDetailText` 复用 `buildCopyText(MODE_A)`；不美化 |
| REQ-015 | ENH-003 | 覆盖式抽屉（ADR-017）；关闭 = 按钮/Esc/遮罩 |
| REQ-016 | ENH-003 | click 选中 / dblclick 查看 分流（ADR-014） |
| REQ-017 | ENH-003(P2) | `openDetail` + 详情内「复制请求+响应」（**R-A 待裁决**） |
| REQ-018 | ENH-004 | `manifest.json` 仅版本号；MV3 不变 |
| REQ-019 | ENH-004 | 4 个纯原生模块；`package.mjs` 零依赖审计 |
| REQ-020 | ENH-004 | 权限不新增；ADR-013 禁 `contextMenus`；§8.3 门禁 1/2 |
| REQ-021 | ENH-004 | `check-zero-network.mjs`（§8.3 门禁 3） |
| REQ-022 | ENH-002/003 | 批量与详情均复用 `buildCopyText` 保真 body |
| REQ-023 | ENH-002/003 | `content.classifyBody/isOverThreshold` 复用 |
| REQ-024 | ENH-004 | `docs/USAGE.md` 记录多选覆盖 + 单条主场景 |

### 6.3 DEL

| ID | 覆盖故事 | 落点 |
|----|:--------:|------|
| DEL-001 | ENH-001 | `src/contextmenu.js` + `#context-menu` + 右键委托 |
| DEL-002 | ENH-002 | `src/multiselection.js`（组合 `selection.js`）+ 接线 |
| DEL-003 | ENH-002 | `src/bulkformatter.js`（ADR-015） |
| DEL-004 | ENH-003 | `src/detail.js` + `#detail-pane/#detail-body/#detail-close` |
| DEL-005 | ENH-002 | `#multiselect-actions/#select-all-btn/#copy-selected-btn/#selected-count` |
| DEL-006 | ENH-001/002/003/004 | `src/i18n.js` 新键（contextmenu.*/multi.*/detail.*），zh/en 对齐 |
| DEL-007 | ENH-002/003/004 | `tests/{contextmenu,bulkformatter,detail,multiselection}.test.mjs` + i18n 校验 + 11 文件回归 |
| DEL-008 | ENH-004 | `docs/USAGE.md`/`docs/INSTALL.md` 新增三节 + 覆盖说明 |

### 6.4 AC

| ID | 覆盖故事 | 验证锚点 |
|----|:--------:|---------|
| AC-001 | ENH-001 | `#context-menu`；`resolveRowId` 命中 |
| AC-002 | ENH-001 | 主项与 `#copy-btn` 同源（L178-185 vs L184）逐字符一致 |
| AC-003 | ENH-001(P2) | P2 菜单项与对应 body 注入等价（**R-A**） |
| AC-004 | ENH-002 | `multiselection` 四语义 + 冻结 `selection.move` |
| AC-005 | ENH-002 | `#select-all-btn`/`#selected-count`；ADR-018 实时 N |
| AC-006 | ENH-002 | ADR-015 模板（N 段 + `#i/N` + 段内原样 + 可见序） |
| AC-007 | ENH-002/004 | `selection.js`/`formatter.js` 冻结；golden 回归 |
| AC-008 | ENH-003 | `buildDetailText` 六要素（formatter 结构） |
| AC-009 | ENH-003 | 复用 `buildCopyText(MODE_A,{responseBody})`；`<pre>` textContent |
| AC-010 | ENH-003 | click 不打开 + ADR-017 关闭方式 |
| AC-011 | ENH-003(P2) | 详情内复制复用 `buildCurrentCopy`（**R-A**） |
| AC-012 | ENH-004 | `manifest.json` 不变；`package.mjs` 权限断言；禁 `contextMenus` |
| AC-013 | ENH-004 | `check-zero-network.mjs` |
| AC-014 | ENH-002/003 | ADR-016（一次确认覆盖本批）；详情复用 `classifyBody` |
| AC-015 | ENH-004 | 既有 11 测试文件全量回归 |
| AC-016 | ENH-004 | `package.mjs` 体积 + 零依赖审计 |
| AC-017 | ENH-004 | `docs/USAGE.md` 记录多选覆盖原非目标 |

---

## 7. 未决项 / 实现前须裁决

| ID | 项 | 现状 | 默认建议 | 影响故事 |
|----|----|------|---------|:--------:|
| R-A | P2「仅复制请求 / 仅响应」落地路径 | design §4.2 措辞"复用 body 注入"**不足以**（formatter 结构固定双段） | 采纳 **P-A**（按段标记裁剪）；或按 design §10.5 声明 P2 非阻塞而不实现 | ENH-001/003 |
| R-B | 多选批内大响应确认文案细节 | ADR-016 定为"一次确认覆盖本批"，但文案键（是否复用 `large.confirm` 还是新增 `multi.largeConfirm`）未定 | 新增 `multi.largeConfirm`（含条数+最大体积） | ENH-002 |
| R-C | checklist §C 边界（空选 N=0、全选切换语义、右键落表头、Shift 跨淘汰项、菜单键盘无障碍、详情期刷新） | requirement/checklist 未定；design ADR-014/018 已定多数 | 按 ADR-014/018 实现，`tests/test-cases.md` 逐条补断言 | ENH-001/002/003 |
| R-D | `check-panel-shell.mjs` requiredIds 是否追加新 id | 可选增强 | 追加（增强门禁，不追加也不 FAIL） | ENH-004 |
| R-E | SPEC 中"现有基线用例"范围口径（历史 123 用例 / 4 门禁脚本） | AC-015 判据模糊（checklist B） | 落 `tests/README.md`：= 既有 11 个 test.mjs 全量 + 4 门禁脚本 | ENH-004 |

> DEC-001..004 / A-1..A-6 / R-06 已由 design ADR-012..020 **全部拍板**，无阻塞（design §0 L21）。

---

## AGGREGATE_ESTIMATE

```
AGGREGATE_ESTIMATE:
  - total_files_new: 8
      · 源码 4：extension/src/{multiselection,contextmenu,bulkformatter,detail}.js
      · 测试 4：tests/{multiselection,contextmenu,bulkformatter,detail}.test.mjs
  - total_files_modified: 6
      · extension/panel.js（大改，唯一 UI 编排中心）
      · extension/panel.html（新增菜单/工具栏/详情容器）
      · extension/styles/panel.css（新增菜单/抽屉/工具栏样式）
      · extension/src/i18n.js（新增 contextmenu.*/multi.*/detail.* 键）
      · extension/manifest.json（仅 version 1.0.0→1.1.0）
      · scripts/check-panel-shell.mjs（可选：requiredIds 追加）
  - total_files_frozen: 2
      · extension/src/selection.js（git diff 必须为空）
      · extension/src/formatter.js（git diff 必须为空）
  - total_docs_modified: 4
      · docs/USAGE.md / docs/INSTALL.md / tests/test-cases.md / tests/README.md
  - total_existing_test_files_regressed: 11（全部零改动必须 PASS）
  - total_apis_http: 0（无 HTTP 端点 / 无后端）
  - total_new_internal_modules_exports: 4 模块（multiselection / contextmenu / bulkformatter / detail）
  - total_panel_new_exports: 5（getSelectedIds / copySelection / openDetail / closeDetail / openContextMenu）
  - total_browser_api_new_consumption: 3（contextmenu 事件 / dblclick 事件 / 键盘 Escape·ArrowUp·ArrowDown·Enter）
  - total_browser_api_new_permissions: 0（AC-012）
  - total_new_tables: 0（无 DB；5 项新增内存态：selectedIds/anchorId/detailRecordId/menuOpen/批量输出串）
  - total_reqs_covered: 24/24
  - total_acs_covered: 17/17
  - total_dels_covered: 8/8
  - total_us_covered: 4/4
```

### 工作量分解（对齐 design §11 T1–T5）

| 阶段 | 故事 | 主要文件 | EFFORT | 回归门禁 |
|:----:|------|---------|:------:|---------|
| T2（先做，风险最高） | ENH-002 | multiselection.js + panel.js 集合接线 + renderRow 高亮 | **high** | selection 13 用例 + formatter 24 用例 |
| T1 | ENH-001 | contextmenu.js + #context-menu + 右键委托 | medium | 零 `contextMenus` 静态门禁 |
| T3 | ENH-002(续) | bulkformatter.js + 批量入口 | medium | 段数/逐字符断言 |
| T4 | ENH-003 | detail.js + #detail-pane + dblclick 分流 | medium | detail 纯逻辑 + 淘汰联动 |
| T5 | ENH-004 | i18n + 4 新测试 + 11 回归 + 4 门禁 + 文档 | medium | AC-004/007/012/015/016 |

### 关键路径与风险

| 风险 | 概率×影响 | 关联 | 缓解（已落为门禁/顺序） |
|------|:---------:|------|------------------------|
| **R-01 单选复制保真被破坏**（AC-007 命门） | 低×高 | formatter/selection 冻结 | 字节级冻结 + golden 24 用例 + 批量只做外层聚合（A-5） |
| **R-02 选中改造回归面大** | 中×高 | selection→multi 切换 | ADR-012 组合式包装，`selection.js` 零改动；6 处接线集中单次提交 |
| **R-03 误用 `chrome.contextMenus` 扩权** | 中×高 | ENH-001 | ADR-013 硬门禁 + 静态扫描 + package 权限断言 |
| **R-04 panel.js 新代码引入中文/禁用符号** | 中×中 | panel.js/新模块 | check-panel-shell（L140/L142-149）禁中文；check-zero-network 禁网络/存储关键字 |
| **R-05 i18n 键集不对齐** | 中×低 | i18n.js | tests/i18n.test.mjs L55-58 自动 deepEqual |
| **R-06 多选大响应 N 次弹窗** | 低×中 | ENH-002 | ADR-016 一次确认覆盖本批 |
| **R-07 虚拟滚动淘汰导致悬挂选中/详情** | 中×中 | ENH-002/003 | recordId 真源 + setIds 剪枝 + onEvict + ADR-018 自动关闭 |
| **R-A P2 落地路径未裁决** | 中×中 | ENH-001/003 | §7 登记；默认 P-A；否则按非阻塞剔除 |

### 未决假设（默认值，不阻塞编码）

| 项 | 默认值 | 依据 |
|----|--------|------|
| 多选范围基准 | 当前过滤后可见列表 | A-1/A-2 → ADR-014 |
| ↑↓ 多选态 | 清空集合回落单选 | REQ-007 → ADR-014 |
| 批量拼接模板 | `===== #i/N =====` + `\n\n` 连接；N=1 委托单选 | ADR-015 |
| 批量顺序 | 可见列表顺序 | ADR-015 |
| 详情容器 | 面板内覆盖式抽屉，模式 A 口径 | ADR-017 |
| 批量大响应确认 | 一次确认覆盖本批 | ADR-016 |
| P2 | 纳入但非发布阻塞 | design §10.5 |

---

== ai_features ==
| 功能 | 需要的 AI 能力 | 发现者 |
|------|---------------|--------|
| （本次增强全部 4 个故事）右键/多选/双击产生纯文本供用户粘贴给外部 AI | **无** —— 增强自身不含 LLM 集成 / Agent 编排 / 推理 / 推荐 / 学习；仍属"AI 消费的前置数据处理"，且 req.txt 非目标"不自动发送给 AI"继续有效（requirement.md §Phase3-7）。增强不改变此结论。 | 本 agent |
| 右键菜单 / 多选集合 / 详情渲染 | **无** —— 均为确定性 DOM/状态机逻辑，`textContent` 渲染，菜单文案来自 i18n 常量字典；无模型、无 prompt、无评分。 | 本 agent |
== end ai_features ==

---

<!-- butler:covers US-001 US-002 US-003 US-004 REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 REQ-006 REQ-007 REQ-008 REQ-009 REQ-010 REQ-011 REQ-012 REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 REQ-018 REQ-019 REQ-020 REQ-021 REQ-022 REQ-023 REQ-024 DEL-001 DEL-002 DEL-003 DEL-004 DEL-005 DEL-006 DEL-007 DEL-008 AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-007 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 AC-017 -->
