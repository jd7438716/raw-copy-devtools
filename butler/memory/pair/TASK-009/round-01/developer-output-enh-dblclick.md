# developer-output — TASK-009（增强：panel.js 双击详情接线 + P2 详情内复制 + 淘汰自动关闭）

> TASK: `butler/tasks/backlog/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/TASK-009.md`
> covers: REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 DEL-004 AC-008 AC-009 AC-010 AC-011 US-003
> 日期: 2026-10-02 | agent: butler-developer
> 说明: 本任务无 pair/frame（直接实现）。`pair/TASK-009/round-01/developer-output.md` 已被同号基线任务（隐私页）占用，故按 `pair/TASK-008/round-01/developer-output-enh-detail.md` 先例使用后缀文件名，未覆盖他人产物。

## 模块

- 修改: `extension/panel.js`（唯一改动文件；仅追加式接线，ADR-020）
- 依赖（未改）: `extension/src/detail.js`（TASK-008）、`extension/panel.html`（TASK-002 既有 `#detail-pane/#detail-body/#detail-close` + `[data-detail-backdrop]`）、`extension/src/contextmenu.js`（复用 `resolveRowId`）、`extension/src/i18n.js`

## 实现要点（接线点 a–h）

- (a) `import { buildDetailText, createDetailView } from './src/detail.js'`
- (b) `els` 追加 `detailPane` / `detailBody` / `detailClose` / `detailBackdrop`（`[data-detail-backdrop]`）
- (c) `wireDetail()`：`els.listBody.addEventListener('dblclick', onRowDblClick)` → `resolveRowId(event, els.listBody)`（**复用 contextmenu 命中逻辑**）→ `openDetailRecord(id)`
  - ADR-014：dblclick 处理**不改集合、不 stopPropagation**；单击已由既有 `onListBodyClick` 完成单选替换
  - 打开后 `focus()` 到 `#detail-close`：避免打开期间 ↑↓ 改动底层选中（细节实现，AC 未强制）
- (d) 关闭三路径：`#detail-close` click / `document` keydown `Escape`（仅当 `isOpen()`，避免误吞其它 Esc）/ `#detail-pane` click 且 target 不在 `.detail-pane__surface` 内（遮罩层 / 抽屉空白区）
- (e) 淘汰失效 `handleDetailEvict(id)`：在既有 `store.subscribe` 的 `add.evicted` 与 `evict` 两条路径调用 `detailView.onEvict(id)`，命中当前打开项 → 自动关闭 + `showToast(t('detail.evicted'))`（ADR-018）；`clear` 路径同步 `closeDetailPane()`
- (f) 响应体口径复用既有 `resolveResponseBodyText`（pending/binary/base64 与复制一致，AC-014）
- (g) 追加式导出 `openDetail(id)` / `closeDetail()`（模块级注入点 + default export 12→14 项）
- (h) P2：`ensureDetailCopyButton()` 在 `.detail-pane__header` 内 `#detail-close` 旁由 JS 创建 `#detail-copy-btn`；`runDetailCopy()` 复用 `buildCurrentCopy(copyMode)` → `writeCopyText`（与主按钮同一产物，AC-011）；`stopPropagation` 隔离冒泡，复制不关闭明细（REQ-017）

详情实例口径：`createDetailView({ container: els.detailPane, body: els.detailBody, resolveText: id => { const r = store.get(id); return r ? buildDetailText(r, resolveResponseBodyText) : ''; }, onClose: 恢复 #list 焦点 })`。列表始终挂载（覆盖式抽屉），滚动位置天然保持；`#detail-body` 由 detail.js 以 `textContent` 注入。

## 硬约束自证

- `#detail-body` 全程 `textContent`（detail.js 渲染），`extension/panel.js` 0 处 `innerHTML`
- 详情文本恒为 `buildDetailText`（模式 A），不随 copyMode A/B 变化
- 未改任何既有 id；未改 `panel.html` / `i18n.js` / 冻结模块
- 新增字符串字面量全部 ASCII/`t()` 键（`detail.copyButton` / `detail.evicted`），中文字面量 0
- 无新增网络/存储/第三方依赖

## 验证（真实执行原始输出）

### 1) `node scripts/check-syntax.mjs` → exit 0

```
[check-syntax] 15/15 files passed
```

### 2) `node scripts/check-panel-shell.mjs` → exit 0

```
[PASS] panel.js 无中文字符串字面量（中文仅允许注释）  (literals=347, offending=[])
...
== RESULT: PASS (34/34 项) ==
```

### 3) `node scripts/check-zero-network.mjs` → exit 0

```
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
```

### 4) `node --test "tests/**/*.test.mjs"` → exit 0

```
ℹ tests 261
ℹ pass 261
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

### 5) `rg -n "innerHTML" extension/panel.js` → 0 命中（exit 1）

```
NO MATCHES (0 hits)
```

### 6) 静态接线核查（`rg -n`）

```
36:import { buildDetailText, createDetailView } from './src/detail.js';
231:export function openDetail(id) { return openDetailImpl(id); }
240:export function closeDetail() { return closeDetailImpl(); }
906:  function handleDetailEvict(id) {
908:      showToast(t('detail.evicted'), 'info');
921:      handleDetailEvict(event.evicted);
924:      handleDetailEvict(event.id);
1667:    return record ? buildDetailText(record, resolveResponseBodyText) : '';
1681:  detailView = createDetailView({
1726:  function onRowDblClick(event) {
1834:      els.listBody.addEventListener('dblclick', onRowDblClick);
1880:  closeDetail,
```

### 7) 临时 headless harness（本地 Chrome via chrome-devtools MCP；harness 落在系统 temp、跑完删除，仓库零残留）→ 23/23 PASS

用临时静态服务器（同一 origin 服务 `extension/`）加载 `panel.html` markup + 注入 `chrome.devtools.network.onRequestFinished` 桩 → 动态 `import('/panel.js')` → 派发真实 `click`/`dblclick`/`keydown` 事件。原始结果：

```json
{"done":true,"errors":[],"results":[
{"name":"capture listener registered","ok":true,"detail":"listeners=1"},
{"name":"rows rendered","ok":true,"detail":"count=2"},
{"name":"found target rows","ok":true,"detail":"items=true, health=true"},
{"name":"AC-010 single click: detail stays closed","ok":true,"detail":"hidden=true"},
{"name":"AC-010 single click selects row","ok":true,"detail":"https://api.example.com/v1/items?q=1&lang=zh"},
{"name":"AC-008 dblclick opens detail","ok":true,"detail":"hidden=false"},
{"name":"AC-009 detail body === buildDetailText(mode A)","ok":true,"detail":"len=395/395"},
{"name":"AC-008 six elements present & ordered","ok":true,"detail":"POST https://api.example.com/v1/items?q=1&lang=zh HTTP/2 | X-Token: abc | [Request Body] | HTTP/2 201 Created | Set-Cookie: sid=1 | [Response Body]"},
{"name":"AC-009 body preserves raw response text","ok":true,"detail":"utf8 preserved"},
{"name":"ADR-017 detail ignores copyMode B","ok":true,"detail":"mode=raw"},
{"name":"AC-010 close button closes","ok":true,"detail":"hidden=true"},
{"name":"AC-010 list rows preserved after close","ok":true,"detail":"2 -> 2"},
{"name":"AC-010 selection preserved after close","ok":true,"detail":"https://api.example.com/v1/items?q=1&lang=zh"},
{"name":"AC-010 Esc closes","ok":true,"detail":"hidden=true"},
{"name":"AC-010 clicking surface keeps detail open","ok":true,"detail":"hidden=false"},
{"name":"AC-010 backdrop click closes","ok":true,"detail":"hidden=true"},
{"name":"P2 detail copy button exists","ok":true,"detail":"detail-copy-btn"},
{"name":"AC-011 detail copy === main copy","ok":true,"detail":"mainLen=395, detailLen=395"},
{"name":"REQ-017 copy does not close detail","ok":true,"detail":"hidden=false"},
{"name":"detail open before eviction","ok":true,"detail":"id=1"},
{"name":"ADR-018 evicted detail auto-closes","ok":true,"detail":"hidden=true"},
{"name":"ADR-018 detail.evicted toast","ok":true,"detail":"detail.evicted"},
{"name":"no uncaught page errors","ok":true,"detail":"[]"}
]}
```

## 自评

- [x] 符合 CONSTITUTION 红线（build PASS + test PASS + 独立断言；无 git 写操作）
- [x] 符合 conventions / design（ADR-014 双击不改集合；ADR-017 模式 A 口径；ADR-018 淘汰清理；ADR-020 追加式）
- [x] 错误处理已覆盖（id 为空/记录不存在 → false；resolveText/onClose 由 detail.js 隔离；遮罩/按钮关闭幂等）
- [x] 单元测试已覆盖（全量 261/261）+ 门禁三件套 + headless harness 23/23
- [x] 仅改 `extension/panel.js`；未改冻结模块 / 既有 id / `panel.html`

## 遗留 / 裁决

- R-A（跨任务）: `detail.title` / `detail.close` / `detail.copyButton` / `detail.evicted` i18n 键由 **TASK-010** 补齐；当前 `t()` 按契约回退键名（无裸中文、不抛）。
- R-B（门禁流程）: 按本任务明确要求由 developer 执行 `node --test`，与宪法红线 19（测试唯一路径 butler-tester）存在张力；正式回归门禁仍应由 **butler-tester** 独立复跑并出具报告。已按任务指令执行并在本文件留痕。
- R-C: 真实扩展（load unpacked + DevTools 上下文）E2E 与键盘可达性细项留 TASK-012/016。

## 验收对照

| 验收项 | 结果 |
|---|---|
| build / lint PASS | ✅ 15/15；0 innerHTML；中文字面量 0 |
| 双击 → `#detail-pane` 打开，六要素按序 | ✅ harness |
| 详情响应体逐字符 === 原始；模式切换不影响 | ✅ harness（=== buildDetailText(mode A)，mode B 下不变） |
| 关闭按钮 / Esc / 遮罩 → 关闭返回，列表与滚动位置保持 | ✅ harness（rows 2→2；selection 保持） |
| 单击不打开明细 | ✅ harness |
| 打开中淘汰 → 自动关闭 + `detail.evicted`，无异常 | ✅ harness（1001 条溢出淘汰）+ errors=[] |
| P2 明细内复制 === 主按钮产物 | ✅ harness（395=395） |
| 全量回归 0 失败 | ✅ 261/261 |
