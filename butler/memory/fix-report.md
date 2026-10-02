# Fix Report — G-1（影响 AC-005）

> 修复员: butler-rf-fixer | 日期: 2026-10-02
> 范围: E2E 实测缺陷 G-1

## 1. 根因

`#copy-selected-btn`（`extension/panel.html:87-88`）带 `data-i18n="multi.copySelected"`，
文案键为 `复制选中({count})` / `Copy Selected ({count})`。但：

- `applyI18n()`（`panel.js` L344-372）对 `[data-i18n]` 仅执行 `textContent = t(key)`，**不做 `{count}` 插值**。
- `updateMultiToolbar()`（原 L848-856）只更新计数（`#selected-count`）与按钮 `disabled`，**未重写按钮标签**。

结果：`#copy-selected-btn` 永久显示字面量 `复制选中({count})`，违反 AC-005
「『复制选中(N)』的 N 等于当前选中条数且实时更新」。

## 2. 修复项

在 `updateMultiToolbar()` 中，为 `#copy-selected-btn` 同步设置带插值的标签。
调用点覆盖实时更新：多选 `onChange`（L660）、剪枝后显式同步（L743）、init 装配（L885）。

## 3. 改动文件

| 文件 | 行号 | 改动 |
|------|------|------|
| `extension/panel.js` | 854（新增行） | `els.copySelectedBtn.textContent = t('multi.copySelected', { count: count });` |

改动后函数体（L848-857）：
```js
function updateMultiToolbar() {
  const count = multi.count();
  if (els.selectedCount) {
    els.selectedCount.textContent = t('multi.selectedCount', { count: count });
  }
  if (els.copySelectedBtn) {
    els.copySelectedBtn.textContent = t('multi.copySelected', { count: count });
    els.copySelectedBtn.disabled = count <= 0;
  }
}
```

未改动：`extension/src/selection.js`、`extension/src/formatter.js`（冻结）、`panel.html` 结构、i18n 字典。

## 4. 验证命令与结果（原始输出摘要）

1. `node scripts/check-syntax.mjs` → **PASS**（15/15 files passed, exit=0）
2. `node scripts/check-panel-shell.mjs` → **PASS**（34/34 项；含「panel.js 无中文字符串字面量 offending=[]」, exit=0）
3. `node --test "tests/**/*.test.mjs"` → **264 pass / 0 fail**（与基线一致）
4. 行为断言（提取真实 `updateMultiToolbar` 函数体 + 真实 `i18n.t()`，桩 els/multi）→ **PASS**
   - static: `copySelectedBtn.textContent = t('multi.copySelected', { count: count })` ✅
   - zh count=3 → `复制选中(3)`, disabled=false, count=`已选 3 条` ✅
   - zh count=0 → `复制选中(0)`, disabled=true, count=`已选 0 条` ✅
   - en count=5 → `Copy Selected (5)`, disabled=false, count=`5 selected` ✅
   - 无残留字面量 `{count}` ✅
5. `rg "chrome\.contextMenus" extension/` → 0 匹配（rg exit=1）, exit=0（反向确认通过）

## 5. 遗留风险

- 无功能性遗留风险。标签由 `t()` 驱动，语言切换（当前无 UI）时若未来新增切换入口，
  需在切换后再次调用 `updateMultiToolbar()`（当前 `applyI18n` 会先把标签重置为字面量）。
- `data-i18n` 插值仍是通用缺口：其它含 `{...}` 占位符的 `data-i18n` 元素（如 `#selected-count`
  的 `multi.selectedCount`）同样依赖运行时显式赋值；本任务未扩大到通用 `applyI18n` 插值改造（保持最小改动）。

## 6. 结论

**PASS** — G-1 已修复，5 项验证全绿，未触碰冻结文件与 i18n 字典。

---

# Fix Report — DA01 空 catch 块（P0×5，`extension/panel.js`）

> 修复员: butler-rf-fixer | 日期: 2026-10-02
> 范围: `butler_diff_analyzer` 对 `extension/panel.js` 报告的 5 处 P0「空 catch 块」（DA01）

## 1. 根因

复制链路的 5 个入口在调用 `runCurrentCopy()` / `copySelection()` / `runSectionCopy()` /
`runDetailCopy()`（均为 `async`）后，用 `.catch(function noop() {})` 静默吞掉 rejected Promise：

| 位置（改前行号） | 调用方 |
|---|---|
| 881 | `wireMultiToolbar()` · `#copy-selected-btn` 点击 |
| 1498 | `onMenuItemClick()` 右键菜单分派 |
| 1632 | `#copy-req-btn` 点击 |
| 1640 | `#copy-resp-btn` 点击 |
| 1795 | `onDetailCopyClick()` 详情内复制 |

函数内部对「已处理的失败」已用 `t('toast.copyFailed', { reason })` 提示
（panel.js:1037-1038 / 1175-1176 / 1428-1429），故外层 `.catch` 只兜底**未预料到的** rejected
Promise。noop 使其被完全吞掉 → DA01 P0（错误无感知、无法定位）。

## 2. 修复项

1. 模块级（`showToast` 之后、`t` 与 `showToast` 均在作用域内）新增统一兜底处理函数
   `reportAsyncCopyError(err)`：提取 `err.message` 或回退 `toast.copyFailedUnknown`，
   以 error Toast 提示用户，不吞错、保留原因。
2. 5 处 `pendingCopy.catch(function noop() {});` → `pendingCopy.catch(reportAsyncCopyError);`，
   保留前置 `if (pendingCopy && typeof pendingCopy.catch === 'function')` 守卫不变。
3. 未新增/修改 i18n 键（复用 `toast.copyFailed` / `toast.copyFailedUnknown`）；
   未引入中文字符串字面量；未改冻结模块 `selection.js` / `formatter.js`；未改 `panel.html`。

## 3. 改动文件

| 文件 | 行号（改后） | 改动 |
|------|-------------|------|
| `extension/panel.js` | 401-410（新增） | `function reportAsyncCopyError(err) { ... }` + JSDoc |
| `extension/panel.js` | 892 | `pendingCopy.catch(reportAsyncCopyError);` |
| `extension/panel.js` | 1509 | 同上 |
| `extension/panel.js` | 1643 | 同上 |
| `extension/panel.js` | 1651 | 同上 |
| `extension/panel.js` | 1806 | 同上 |

新增函数体：
```js
function reportAsyncCopyError(err) {
  const reason = err && err.message ? err.message : t('toast.copyFailedUnknown');
  showToast(t('toast.copyFailed', { reason: reason }), 'error');
}
```

## 4. 验证命令与结果（原始输出摘要）

1. `node scripts/check-syntax.mjs` → **PASS**（`[check-syntax] 15/15 files passed`, exit=0）
2. `node scripts/check-panel-shell.mjs` → **PASS**（`== RESULT: PASS (42/42 项) ==`, exit=0）
   含「panel.js 无中文字符串字面量 (literals=351, offending=[])」✅
3. `node --test "tests/**/*.test.mjs"` → **264 pass / 0 fail**（`ℹ pass 264`, `ℹ fail 0`, duration_ms≈676）
4. `node scripts/check-zero-network.mjs` → **PASS**（17/17 项；`== RESULT: PASS ==`, exit=0）
5. `butler_diff_analyzer(path="extension/panel.js")` → **P0 = 0**
   `{"summary":{"total":1,"P0":0,"P1":1,"P2":0},"findings":[{"id":"DA03","line":1115,"severity":"P1","pattern":"被注释掉的代码",...}]}`
   —— 仅剩 1 条与本次改动无关的既有 P1（注释行 1115），DA01 已清零。
6. `rg -n "catch\(function noop" extension/panel.js` → **0 命中**（rg exit=1）。

## 5. 遗留风险

- 无功能性遗留风险。兜底 Toast 仅在未预料异常（如 `copyText` 之外的 reject）时出现。
- diff-analyzer 仍报告 1 条既有 P1（DA03, line 1115：被识别为"注释掉的代码"）：实为
  中文说明性注释，非本次改动引入，保持最小改动未处理。

## 6. 结论

**PASS** — 5 处 DA01 P0 空 catch 已改为统一异步异常处理，6 项验证全绿，未触碰冻结文件、
i18n 字典与 `panel.html`。

---

# Fix Report — v1.1.0 三项修复/调整（多选漏条 / 复制模式按钮化 / 移除分段复制）

> 修复员: butler-rf-fixer | 日期: 2026-10-02
> slug: `对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> 方案: 02-solution-design 方案 A（推荐，23/25）| TASK-001..011（代码/测试/门禁）+ TASK-012..015（文档/打包）
> fix-rca.md 不存在，根因取自 `01-root-cause.md`（RC-1..RC-6，confidence: high）。

## 1. 根因（一句话）

- **RC-1**：`onContextMenu` 弹菜单前无条件 `multi.selectAt(index)` → 多选集合被坍缩为 1，菜单 `count≥2` 的「复制选中(N)」永不可达。
- **RC-2**：行点击分派先判 `shiftKey` 走 `rangeTo`（替换语义），Ctrl+Shift 扩选会**丢弃先前 Ctrl 已选项**。
- **RC-3**：ADR-014 两条决策互斥（右键必替换 vs N≥2 批量项），多选内右键保留语义未定义。
- **RC-4**：验证网按入口割裂（纯模型单测 / 只测全选+工具栏 / 无混合修饰键），无真实 `onContextMenu` 接线测试。
- **RC-5 + RC-6**（关联能力面）：③「仅复制请求/仅复制响应」P2 能力面连同 toggle ②「先切换再复制」需要一并收敛。

## 2. 修复项（对应 TASK）

| TASK | 内容 | 结果 |
|------|------|------|
| TASK-001 | `multiselection.js` 新增 `extendTo(index)`（additive 并集，`rangeTo` 替换语义不动） | ✅ |
| TASK-002 | `contextmenu.js` 移除 P2 常量/入参/分支/`p2` 字段；`createMenuModel({hasSelection,count})`；注释对齐 | ✅ |
| TASK-003 | `panel.js` `onContextMenu` 入口语义统一（已选保留/未选替换）+ 分派顺序 `shift+ctrl→extendTo`；`openMenuAt` 去 `canCopyRequestOnly` | ✅ |
| TASK-004 | `tests/contextmenu.test.mjs` 面板级接线用例（真实 `onContextMenu`）+ 0/1/N + 混合修饰键；新增 `tests/panel-harness.mjs` DOM shim | ✅ |
| TASK-005 | `panel.html` + `panel.css` 增 `#copy-btn-a/#copy-btn-b`（`data-copy-mode`），删 `#mode-toggle`、`#copy-req-btn/#copy-resp-btn` 与 `.mode-toggle*` 样式 | ✅ |
| TASK-006 | `i18n.js` 增 `mode.aButton/mode.bButton`；删 `copy.buttonRequest/Response`、`contextmenu.copyRequestOnly/copyResponseOnly`、`mode.label`（zh/en 对齐） | ✅ |
| TASK-007 | `panel.js` 删可变的 `copyMode`/`setCopyMode`；A/B 按钮「动作即模式」（非 B 即 A 白名单）；批量入口固定 MODE_A；`getCopyMode()` 恒返回 A | ✅ |
| TASK-008 | `panel.js` 彻底删 `extractSectionText/buildSectionCopy/runSectionCopy`、P2 分派分支与底部按钮接线；`writeCopyText` 保留（详情复制在用） | ✅ |
| TASK-009 | `formatter.test.mjs` A/B 冻结 golden；`bulkformatter.test.mjs` 入口等价（resolveBody）、0/1/N 边界 | ✅ |
| TASK-010 | E2E harness：`#mode-toggle` 步骤 → `#copy-btn-a/b`；新增多选态右键批量 + 混合修饰键场景；`AC-009b` ③ 移除断言 | ✅ |
| TASK-011 | `check-panel-shell.mjs` `requiredIds` 删 toggle/分段，增 `copy-btn-a/copy-btn-b` | ✅ |

## 3. 改动文件

- 源码：`extension/panel.js`、`extension/src/multiselection.js`、`extension/src/contextmenu.js`、`extension/src/i18n.js`、`extension/panel.html`、`extension/styles/panel.css`
- 测试：`tests/contextmenu.test.mjs`、`tests/multiselection.test.mjs`、`tests/i18n.test.mjs`、`tests/formatter.test.mjs`、`tests/bulkformatter.test.mjs`、`tests/panel-harness.mjs`(新)
- 门禁/文档：`scripts/check-panel-shell.mjs`、`tests/test-cases.md`、`tests/README.md`、`docs/USAGE.md`、`docs/INSTALL.md`（+ 根 `USAGE.md`/`INSTALL.md` 镜像）、`butler/plan/…功能增/plan.md`(ADR-014)、E2E `run-e2e.mjs`
- 发行：`dist/raw-copy-1.1.0.zip`（重新打包）

## 4. 验证命令与结果

1. `node scripts/check-syntax.mjs` → **PASS**（15/15 files，exit=0）
2. `node scripts/check-panel-shell.mjs` → **PASS（41/41 项）**（含新增 `#copy-btn-a`/`#copy-btn-b`、无裸中文）
3. `node scripts/check-manifest.mjs` → **PASS（17/17 项）**（MV3 / 仅 `clipboardWrite` / v1.1.0）
4. `node scripts/check-zero-network.mjs` → **PASS**（零网络/零持久化/无遥测）
5. `node --test "tests/**/*.test.mjs"` → **283 pass / 0 fail**（基线 264 + 新增 19）
6. 受影响范围 `node --test tests/multiselection.test.mjs tests/contextmenu.test.mjs tests/i18n.test.mjs tests/formatter.test.mjs tests/bulkformatter.test.mjs` → **141 pass / 0 fail**
7. `node scripts/package.mjs` → **PASS**（25 条目；解压 133.97 KB / 压缩 41.24 KB < 200 KB；零第三方依赖；zip 读回/CRC/`node --check` 双保险全通过）
8. `butler_diff_analyzer(extension/panel.js)` → **P0=0**（仅 1 条既有 P1 注释行 1141，非本次引入）

## 5. 遗留风险

- **批量入口固定模式 A**（P-DEC-1）：B 批量不在本轮范围；若用户后续需要，可增量补 `#copy-selected-b-btn`。
- 残留 `setCopyMode`/`copyMode` 仅出现在**注释**（panel.js:433 说明已移除；detail.js:49 历史说明），无逻辑引用。
- E2E harness 中的 `mode-toggle`/P2 选择器仅用于**「不存在」反向断言**（AC-009b / AC-008），非正向步骤。
- 右键「已选保留」改变既有交互，需真机确认（E2E AC-013）。

## 6. 结论

**PASS** — ①②③ 与 ADR/回归网/门禁/文档/打包同批落地；受影响范围与全量回归全绿，未触碰冻结模块（`selection.js`/`formatter.js`/`bulkformatter.js` 逻辑零改动）。

---

# Re-verification — v1.1.0 三项修复/调整（本节点独立复跑）

> 修复员: butler-rf-fixer | 日期: 2026-10-02 | 会话: ses_f0435a51affeU7bTAqjhZRILkg
> slug: `对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> 目的: 在 DAG fix 节点重跑时，对既有工作树状态做**独立复跑验证**并以 `butler/spec/…/04-execution-summary.md` 收口。

## 复跑命令与结果（原始输出摘要）

1. `node scripts/check-syntax.mjs` → **PASS**（15/15 files，exit=0）
2. `node scripts/check-manifest.mjs` → **PASS**（17/17；MV3 / 仅 `clipboardWrite` / version=1.1.0，exit=0）
3. `node scripts/check-panel-shell.mjs` → **PASS**（41/41；含 `#copy-btn-a`/`#copy-btn-b`，无裸中文，exit=0）
4. `node scripts/check-zero-network.mjs` → **PASS**（18 文件；17/17 项，exit=0）
5. affected 范围 `node --test tests/multiselection.test.mjs tests/contextmenu.test.mjs tests/i18n.test.mjs tests/formatter.test.mjs tests/bulkformatter.test.mjs` → **141 pass / 0 fail**（exit=0）
6. 全量 `node --test "tests/**/*.test.mjs"` → **283 pass / 0 fail**（基线 264 + 新增 19，exit=0）
7. `node scripts/package.mjs` → **PASS**（25 条目；解压 133.97 KB / 压缩 41.24 KB < 200 KB；third-party deps=0；zip 读回/CRC/`node --check` 全通过，exit=0）

## 静态核对（确认真实改动已落盘）

- `extension/src/multiselection.js:304` `extendTo` 存在，导出 `:514`；`rangeTo` 的 `selected.clear()`（`:278`）替换语义保留。
- `extension/panel.js:1536-1537` `onContextMenu`：`!multi.has(rowId)` 才 `selectAt`（已选保留 / 未选替换）；`:796` 分派 `shift+ctrl → extendTo`；`:437` `getCopyMode()` 恒 `MODE_A`。
- 全仓 `extension/` 无 `canCopyRequestOnly` / `COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` / `extractSectionText` / `buildSectionCopy` / `runSectionCopy` / `mode-toggle` / `copy-req-btn` / `copy-resp-btn` 正向引用（测试与 E2E 中仅作「不存在」反向断言）。
- `extension/src/i18n.js:53-54 / 152-153` 存在 `mode.aButton`/`mode.bButton`；无 `copy.buttonRequest/Response`、`contextmenu.copyRequestOnly/copyResponseOnly`、`mode.label`。
- `scripts/check-panel-shell.mjs` `requiredIds` 增 `copy-btn-a/b`、删 toggle/分段三项。
- `dist/raw-copy-1.1.0.zip` 存在（重打包产物）。

## 结论

**PASS** — 三项修复 ①②③ 与门禁/测试/打包同批状态一致，本节点独立复跑全绿；未新增改动，无遗留功能性风险。

