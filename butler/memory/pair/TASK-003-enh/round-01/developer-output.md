# developer-output — TASK-003（增强）Round 01

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> agent: butler-developer | weight: heavy | 日期: 2026-10-02
> covers: REQ-006 REQ-007 AC-004 US-002 | 设计: design.md §4.2/§4.3 + ADR-012/014/018

## 模块: panel.js 多选接线（唯一契约切换点）

- 改动文件（源码，唯一）：`extension/panel.js`
- 冻结模块未动：`extension/src/selection.js` / `extension/src/formatter.js`（本任务零编辑）
- 新建（证据）：`butler/tasks/loads/TASK-003-enh-butler-developer.json`、本文件

## 接线点逐条落地（a–i）

| # | 契约 | 落点（实际行号） | 实现 |
|---|------|-----------------|------|
| a | import 切换 | L26 | `import { createMultiSelection } from './src/multiselection.js';`（formatter 等其余 import 不变） |
| b | 创建实例 + activeSelection | L524-536 | `const multi = createMultiSelection({...})`；`activeSelection = multi`；`createSelection` 调用已移除 |
| c | renderRow 集合高亮 | L424-431 | `activeSelection.has(rec.id)` 为主判定；`current()` 作为 ↑↓ 单选回落兜底（见裁决 R-A） |
| d | onChange 同步 | L526-534 | `selectedId=primaryId` → `setCopyButtonsEnabled(主选非空 ‖ 集合非空)` → `updateMultiToolbar()` → `virtualList.refresh()` |
| e | refreshView 剪枝 | L604-610 | `multi.setIds(display.map(r=>r.id))`；随后 `updateMultiToolbar()` 显式收敛计数 |
| f | 点击修饰键 | L650-678 | `shiftKey→rangeTo` / `ctrlKey‖metaKey→toggleAt` / 否则 `selectAt`；保留 `focus()` |
| g | ↑↓ 键盘 | L681-694 | `multi.move(±1)`（内部清空集合回落单选）+ `preventDefault` + `scrollSelectionIntoView` |
| h | store 淘汰双路径 | L770-776 | `add.evicted→multi.onEvict`；`evict→multi.onEvict`；`clear→multi.clear()`（multi 无 reset） |
| i | wireMultiToolbar | L714-743, L783 | `#select-all-btn→selectAll`；`updateMultiToolbar()` 渲染计数 + `#copy-selected-btn` 使能；`refreshView` 内也已调用 |

`els` 追加（ADD-only，既有 id 未改名，ADR-020）：`multiselectActions / selectAllBtn / copySelectedBtn / selectedCount`（L66-69）。

## 自验原始输出

### 1) `node scripts/check-syntax.mjs`

```
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\devtools.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\panel.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\bulkformatter.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\capture.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\clipboard.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\content.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\contextmenu.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\detail.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\filter.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\formatter.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\i18n.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\multiselection.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\render.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\selection.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\store.js
[check-syntax] 15/15 files passed
EXIT=0
```

### 2) `node scripts/check-panel-shell.mjs`（无裸中文）

```
== RESULT: PASS (34/34 项) ==
EXIT=0
（关键行）
[PASS] panel.html 无裸中文（可见文案全走 data-i18n）
[PASS] panel.js 无中文字符串字面量（中文仅允许注释）  (literals=186, offending=[])
```

### 3) `node scripts/check-zero-network.mjs`

```
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
EXIT=0
```

### 4) `node --test "tests/**/*.test.mjs"` 全量回归

```
ℹ tests 261
ℹ suites 0
ℹ pass 261
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 485.4677
```

（其中 `tests/multiselection.test.mjs` 单跑：`tests 25 / pass 25 / fail 0`）

### 5) 静态接线核查（grep）

```
26:import { createMultiSelection } from './src/multiselection.js';
524:  const multi = createMultiSelection({
84（仅注释）: 选中来源由 createSelection 切换为 createMultiSelection
428:      typeof activeSelection.has === 'function' && activeSelection.has(rec.id)
604:    multi.setIds(
771:      multi.onEvict(event.evicted);
773:      multi.onEvict(event.id);
692:    multi.move(key === 'ArrowDown' ? 1 : -1);
730:  function wireMultiToolbar() {
783:  wireMultiToolbar();
545:      multi.selectAt(index);
668:      multi.rangeTo(index);
670:      multi.toggleAt(index);
672:      multi.selectAt(index);
736:        multi.selectAll();
775:      multi.clear();
718:      els.selectedCount.textContent = t('multi.selectedCount', { count: count });
721:      els.copySelectedBtn.disabled = count <= 0;
```

- `createSelection` 在 panel.js 中**无 import / 无调用**；唯一出现处 L84 是解释切换的文档注释（非字符串字面量，门禁不受影响）。

## TASK-003 验收清单逐条对照

| 验收项 | 状态 | 证据 / 去向 |
|--------|:----:|-------------|
| 单击 → `{1}` | ✅ 逻辑+接线 | `multi.selectAt` 由单测覆盖（`selectAt` 3 用例）；panel 无修饰分支静态确认（L672） |
| Ctrl/Cmd → `{1,3}` | ✅ 逻辑+接线 | `toggleAt` 单测（3 用例）；panel `ctrlKey‖metaKey`→toggleAt（L669-670） |
| Shift → 可见闭区间 | ✅ 逻辑+接线 | `rangeTo` 单测（正向/反向/跳空槽/无 anchor 回落）；panel `shiftKey`→rangeTo（L667-668） |
| ↑↓ → 清空集合 + 单选移动 | ✅ 逻辑+接线 | `move` 单测（清空集合 + clamp）；panel L692；`preventDefault` 防滚动 |
| 滑出滑回高亮保持 | ⚠️ 组件级 | `renderRow` 用集合判定 + 每次 onChange `virtualList.refresh()`（L531-533）；render.test 的 DOM 桩覆盖 refresh 复用，浏览器滑动端到端留 **TASK-012** |
| 过滤剪枝 / 淘汰计数收敛 | ✅ 逻辑+接线 | `setIds`/`onEvict` 单测（剪枝/锚点失效/N 实时）；`refreshView` 注入可见序列；store 双淘汰路径 + `clear` 均接线 |
| 冻结模块未改 | ✅ | 本次仅编辑 `extension/panel.js` |
| 向后兼容导出 | ✅ | `els/getSelected/buildCurrentCopy/getCopyMode/setCopyMode/showToast/applyI18n/getLastCopyText` 全部保留原名 |
| `#copy-btn` 单选语义不变 | ✅ | 仍走 `buildCurrentCopy`；使能条件含「主选非空」，↑↓ 单选回落仍可复制 |
| 批量复制本体不实现 | ✅ | `#copy-selected-btn` 仅做使能，点击动作留 TASK-005（未挂监听，避免与 TASK-005 双监听） |

## 自评

- [x] 符合 CONSTITUTION 红线（build PASS + test PASS，未滥用 git/网络）
- [x] 符合 design ADR-012/014/018、§3.3 约束（textContent、recordId 真源、零新权限/网络）
- [x] 错误处理：多选回调异常由 multiselection 内部 try/catch 隔离；面板侧全部 null 守卫
- [x] 静态接线覆盖：a–i 全部落点
- [x] 单元测试：复用 `tests/multiselection.test.mjs`（25 用例，接口层）；panel 无 DOM 框架 → 静态核查

## 裁决与遗留项

- **R-A（renderRow 高亮口径）**：任务 (c) 要求改为 `has(id)`；但 `multi.move()` 会清空集合、主光标落到新行（`count()===0`），若只按 `has()` 判定则「↑↓ 单选移动」的行不可见 → 违反 REQ-007 / AC-004。故采用 **`has(id) ‖ current()===id`**：集合态由 `has` 主导，单选回落态由 `current` 兜底。这是对 (c) 的兼容性扩展，不改变集合判定语义。
- **R-B（i18n 键缺失，非本任务）**：`t('multi.selectedCount', {count})` 及 panel.html 的 `multi.selectAll`/`multi.copySelected` 键当前不在 `dict`，`t()` 按既有契约回退为 key 字面量。键由 **TASK-010** 补齐（zh/en 键集对齐）；本任务严禁越界改 `i18n.js`。
- **R-C（工具栏可见性）**：`#multiselect-actions` 初始 `hidden`，本任务在 `wireMultiToolbar()` 中置 `hidden=false`（ADR-014「入口常驻」；html 注释亦声明 TASK-003/005 负责接线可见性）。不构成新增 DOM/文案。
- **R-D（端到端）**：浏览器级四语义（点击/Ctrl/Shift/↑↓）与「滑出滑回」留 **TASK-012** 回归；本任务以纯逻辑单测 + 静态接线覆盖。
- **未实现（正确留给下游）**：`copySelection` / `getSelectedIds` / `buildBulkCopyText` 接线 = TASK-005。
