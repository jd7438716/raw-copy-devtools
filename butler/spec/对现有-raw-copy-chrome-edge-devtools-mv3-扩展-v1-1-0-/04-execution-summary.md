# 04 · 执行总结：Raw Copy v1.1.0 三项修复/调整

> **文档**：04-execution-summary.md
> **slug**：`对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> **日期**：2026-10-02
> **角色**：butler-rf-fixer（修复员）
> **会话**：ses_f0435a51affeU7bTAqjhZRILkg
> **上游**：`01-root-cause.md`（RC-1..RC-6）→ `02-solution-design.md`（方案 A，23/25）→ `tasks/backlog/.../TASK-001..016`
> **方案**：方案 A · 入口语义统一 + 显式模式重构 + 回归网补齐
> **范围**：TASK-001..011（代码/测试/门禁）实现；TASK-012..015（文档/打包）落地；TASK-016（门禁+全量回归）执行
> **说明**：`fix-rca.md` 不存在，根因取自 `01-root-cause.md`（RC-1..RC-6，confidence: high）。本节点由 butler-rf-fixer 按 TASK 统一实现并**在 affected 范围自测**，随后执行全量回归复核。
> **复跑说明（2026-10-02）**：本节点在 DAG 重跑时对工作树状态做**独立复跑验证**——4 门禁、affected 范围 141、全量 283、`package.mjs` 全部 PASS（详见 §4）；同时静态核对确认真实改动均已落盘（§2）。未引入新改动。

---

## 0. 结论（TL;DR）

| 维度 | 结果 |
|------|------|
| ① 多选漏条（RC-1/RC-2） | ✅ 修复：右键「已选保留/未选替换」+ `extendTo` additive 并集 |
| ② 复制模式按钮化（RC-6） | ✅ 完成：删 toggle/`copyMode`，`#copy-btn-a/#copy-btn-b` 动作即模式，默认 A |
| ③ 移除分段复制（RC-5） | ✅ 完成：菜单 P2 + 底部按钮 + 共享逻辑 + i18n 一并移除 |
| ④ ADR/回归网（RC-3/RC-4） | ✅ 完成：ADR-014 重裁 + 面板级接线测试 + 混合修饰键 + golden |
| 门禁 | ✅ check-syntax 15/15、check-manifest 17/17、check-panel-shell 41/41、check-zero-network 17/17 |
| 测试（affected 范围） | ✅ **141 / 141 PASS**（multiselection + contextmenu + i18n + formatter + bulkformatter） |
| 测试（全量回归） | ✅ **283 / 283 PASS**（基线 264 + 新增 19） |
| 发行 | ✅ `dist/raw-copy-1.1.0.zip` 重打包 PASS（25 条目；零依赖；读回/CRC/`node --check` PASS） |
| 静态兜底 | ✅ `butler_diff_analyzer(extension/panel.js)` → P0=0（仅 1 条既有 P1 注释行 1141） |
| 冻结契约 | ✅ `selection.js` / `formatter.js` / `bulkformatter.js` 逻辑零改动 |

---

## 1. 逐 TASK 执行状态

| TASK | 标题 | 负责角色 | 状态 | 证据 |
|------|------|----------|:----:|------|
| TASK-001 | `multiselection.js` 新增 additive `extendTo` | rf-fixer | ✅ | `extendTo`（`multiselection.js:304`，导出 `:514`）+ 9 条用例；`rangeTo` 替换语义零改动 |
| TASK-002 | `contextmenu.js` 去 P2 + 注释对齐 | rf-fixer | ✅ | `CTX_ACTION/CTX_ITEM_ID` 仅主项+批量项；`createMenuModel({hasSelection,count})`（`:166`）；无 `canCopyRequestOnly`/`p2` |
| TASK-003 | `panel.js` 入口语义 + 修饰键分派 | rf-fixer | ✅ | `onContextMenu`（`:1515`）已选保留/未选替换；分派 `shift+ctrl→extendTo`（`:796-802`）；`openMenuAt` 去 `canCopyRequestOnly` |
| TASK-004 | 面板级接线测试（真实 `onContextMenu`） | rf-fixer | ✅ | `tests/panel-harness.mjs` 真实 `import('../extension/panel.js')`（`:307`）+ `contextmenu.test.mjs` 面板级用例（已选保留/未选替换/空白不弹/混合并集） |
| TASK-005 | `panel.html`/`panel.css` A/B 按钮、删 toggle/分段 | rf-fixer | ✅ | `#copy-btn-a`/`#copy-btn-b` 就位（`panel.html:123-125`）；`#mode-toggle`/`.mode-toggle*`/分段按钮移除 |
| TASK-006 | `i18n.js` 模式键新增 + P2 键清理 | rf-fixer | ✅ | `mode.aButton/bButton`（zh `:53-54` / en `:152-153`）；4 个 P2 键 + `mode.label` 删除；zh/en 对齐 |
| TASK-007 | `panel.js` A/B 双按钮接线（动作即模式） | rf-fixer | ✅ | 删 `copyMode`/`setCopyMode`；`normalizeMode` 白名单（`:102`）；`getCopyMode()` 恒 A（`:437`）；批量固定 A |
| TASK-008 | `panel.js` ③ 彻底移除分段复制 | rf-fixer | ✅ | `extractSectionText/buildSectionCopy/runSectionCopy` 全仓零残留；`writeCopyText` 保留（详情复制在用） |
| TASK-009 | A/B golden + 批量入口等价/边界 | rf-fixer | ✅ | `formatter.test.mjs`、`bulkformatter.test.mjs` 新增断言，随 141 用例全绿 |
| TASK-010 | E2E harness 更新 | rf-fixer | ✅ | `#mode-toggle`→A/B 按钮（`run-e2e.mjs:503-511`）；新增 AC-013 右键批量（`:541-567`）与 AC-004 混合修饰键（`:573-583`） |
| TASK-011 | `check-panel-shell.mjs` id 清单同步 | rf-fixer | ✅ | `requiredIds` 增 `copy-btn-a/b`、删 3 项（`:129-135`）；PASS 41/41 |
| TASK-012 | `plan.md` ADR-014 重裁 + 联合可满足性 | doc-writer | ✅ | ADR-014 重写为一致规则 + 「联合可满足性核对」段 |
| TASK-013 | `tests/test-cases.md` + `README.md` 同步 | doc-writer | ✅ | 清理 P2 用例、补新场景；计数 264→283 |
| TASK-014 | `docs/USAGE.md` / `INSTALL.md` 同步 | doc-writer | ✅ | 第 9 节改「模式 A/B 两个独立按钮」；删分段复制说明；根/docs 镜像一致 |
| TASK-015 | 重新打包发行 ZIP | config-changer | ✅ | 保持 `1.1.0` 重打包；`package.mjs` 三项门禁 PASS |
| TASK-016 | 约束门禁 + 全量回归 | tester | ✅ | 4 门禁 PASS + 283/283；见 §4 |

---

## 2. 关键代码改动

### 2.1 ① 入口语义统一 + additive 扩选

- `extension/panel.js` `onContextMenu`（`:1515`）：
  - 命中行已在集合内 → **不改集合**（菜单 `count≥2` 自然成立，批量项可达）；
  - 命中行在集合外 → `multi.selectAt(index)` 单选替换；
  - 未命中（表头/空白）→ `E_CTX_NO_TARGET`（不弹、不改、不抛）。
- `extension/panel.js` `onListBodyClick` 分派顺序（`:796-802`）：
  `shift+ctrl/meta → extendTo`；`shift → rangeTo`；`ctrl/meta → toggleAt`；否则 `selectAt`。
- `extension/src/multiselection.js` 新增 `extendTo(index)`（`:304`）：以同一 `anchor` 取可见闭区间，结果与既有集合**并集**（不 `clear`），主光标指向命中行，`anchor` 不变；越界/空槽 `return false`。`rangeTo` 替换语义**零改动**。

### 2.2 ② 复制模式 A/B 显式按钮

- `extension/panel.html`（`:123-125`）：底部新增 `#copy-btn-a`/`#copy-btn-b`（`data-copy-mode="A"/"B"`），移除 `#mode-toggle`、`#copy-req-btn`、`#copy-resp-btn`；7 列表头与其余稳定 id 不变。
- `extension/styles/panel.css`：删 `.mode-toggle*`；新增 `.copy-mode-btn`（沿用既有 token，不新造变量）。
- `extension/panel.js`：删模块级 `copyMode`/`setCopyMode`；`normalizeMode` 白名单（仅 `B`→B，其余→A，`:102`）；A/B 按钮读 `data-copy-mode` 后调用 `runCurrentCopy(mode)`；`#copy-btn` 与批量入口（工具栏 + 菜单 `copy-selected`）固定 `MODE_A`；`getCopyMode()` 恒返回 `MODE_A`（`:437`，注释注明 `setCopyMode` 已移除）。
- `extension/src/i18n.js`：新增 `mode.aButton`/`mode.bButton`；删除 `copy.buttonRequest/Response`、`contextmenu.copyRequestOnly/copyResponseOnly`、`mode.label`（zh/en 同步对齐）。

### 2.3 ③ 移除分段复制

- `extension/src/contextmenu.js`：删除 P2 常量/入参/分支与 `p2` 字段；`createMenuModel` 仅「主项 + count≥2 批量项」（`:166-199`）。
- `extension/panel.js`：删除 `extractSectionText/buildSectionCopy/runSectionCopy`、`dispatchContextAction` 的 P2 分支、`#copy-req-btn/#copy-resp-btn` 接线；`writeCopyText` 保留（`runDetailCopy` 仍用）；移除 `REQUEST_SECTION/RESPONSE_SECTION` import。

### 2.4 回归网

- 新增 `tests/panel-harness.mjs`：零依赖手写 DOM shim，真实 `import` `extension/panel.js`（`:307`，非模型复制品），驱动真实 click/contextmenu/按钮事件并捕获剪贴板。
- `tests/contextmenu.test.mjs`：清理 P2 形状断言，新增面板级接线用例（已选保留/未选替换/空白不弹/混合并集/纯 Shift 替换/0 条/N 段等价/入口等价/A/B 按钮/③ 无 P2）。
- `tests/multiselection.test.mjs`：新增 `extendTo` 用例（Ctrl 选集 + Ctrl+Shift 扩选并集、连续扩选、anchor 保持、无 anchor 回落、越界/空槽、一致性）。
- `tests/formatter.test.mjs` / `tests/bulkformatter.test.mjs`：A/B 冻结 golden、入口等价与边界。
- E2E `run-e2e.mjs`：`#mode-toggle` 步骤替换为 A/B 按钮采样（`:503-511`）；新增「多选态右键 → 批量项 → 2 段」（AC-013）与「混合修饰键并集」（AC-004）真机场景；`#mode-toggle` 反向不存在断言。

---

## 3. spec 覆盖（REQ / DEL / AC）

| 维度 | 覆盖 |
|------|------|
| REQ | 001✅ 002✅ 003✅ 004✅ 005✅ 006✅ 007✅ 008✅ 009✅ 010✅ 011✅ 012✅ 013✅ 014✅ 015✅ 016✅（16/16） |
| DEL | 001✅ 002✅ 003✅ 004✅ 005✅ 006✅ 007✅ 008✅ 009✅ 010✅ 011✅ 012✅ 013✅ 014✅ 015✅ 016✅ 017✅ 018✅（18/18） |
| AC | 001✅ 002✅ 003✅ 004✅ 005✅ 006✅ 007✅ 008✅ 009✅ 010✅ 011✅ 012✅ 013✅ 014✅ 015✅ 016✅ 017✅（17/17） |

> REQ-010/011、AC-011/012 由 4 门禁 + 既有 content/formatter 契约用例全绿证明；AC-016 由 `package.mjs` 三项门禁证明；AC-014 由 `check-panel-shell` 41/41 + `i18n.test` 键集断言 + E2E 步骤同步证明。

---

## 4. 验证命令与结果（本会话原始输出摘要 · 独立复跑）

> 下列结果为本节点（`ses_f0435a51affeU7bTAqjhZRILkg`）在当前工作树上独立复跑所得，非沿用上游产物。

```
$ node scripts/check-syntax.mjs
[check-syntax] 15/15 files passed                     exit=0

$ node scripts/check-manifest.mjs
== RESULT: PASS (17/17 项) ==                          exit=0
  （manifest_version=3；permissions=["clipboardWrite"]；version=1.1.0）

$ node scripts/check-panel-shell.mjs
== RESULT: PASS (41/41 项) ==                          exit=0
  （含 id="#copy-btn-a" / id="#copy-btn-b"；无裸中文；literals=325, offending=[]）

$ node scripts/check-zero-network.mjs
== RESULT: PASS（18 文件；无网络调用、无持久化存储、无遥测）==  exit=0

# affected 范围（本任务要求的自测范围）
$ node --test tests/multiselection.test.mjs tests/contextmenu.test.mjs \
               tests/i18n.test.mjs tests/formatter.test.mjs tests/bulkformatter.test.mjs
ℹ tests 141   ℹ pass 141   ℹ fail 0                   exit=0

# 全量回归
$ node --test "tests/**/*.test.mjs"
ℹ tests 283   ℹ pass 283   ℹ fail 0                   exit=0

$ node scripts/package.mjs
[PASS] 全部 import specifier 均为相对路径（third-party deps = 0）
[PASS] zip 可解析，CRC32 全部通过，共 25 条目
[PASS] 读回全部 .js 条目 node --check 通过（双保险）
== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==
artifact: dist/raw-copy-1.1.0.zip                     exit=0
```

反例/边界证据：

- `butler_diff_analyzer(extension/panel.js)` → `P0=0,P1=1,P2=0`；唯一 P1 为既有注释行（`:1141`），非本次引入。
- 全仓 grep（`extension/`）确认零残留：`COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` / `canCopyRequestOnly` / `extractSectionText` / `buildSectionCopy` / `runSectionCopy` / `copy.buttonRequest` / `copy.buttonResponse` / `copyRequestOnly` / `copyResponseOnly` → **NONE**；`mode-toggle` / `copy-req-btn` / `copy-resp-btn` → **NONE**（E2E 中仅作「不存在」反向断言）。
- 残留 `copyMode`/`setCopyMode` 仅出现在**注释**（`panel.js:433`），无逻辑引用。

---

## 5. 改动文件清单

| 类别 | 文件 |
|------|------|
| 源码 | `extension/panel.js`、`extension/src/multiselection.js`、`extension/src/contextmenu.js`、`extension/src/i18n.js`、`extension/panel.html`、`extension/styles/panel.css` |
| 测试 | `tests/contextmenu.test.mjs`、`tests/multiselection.test.mjs`、`tests/i18n.test.mjs`、`tests/formatter.test.mjs`、`tests/bulkformatter.test.mjs`、`tests/panel-harness.mjs`（新） |
| 门禁 | `scripts/check-panel-shell.mjs` |
| 测试文档 | `tests/test-cases.md`、`tests/README.md` |
| 用户文档 | `USAGE.md` / `docs/USAGE.md`、`INSTALL.md` / `docs/INSTALL.md` |
| 设计文档 | `butler/plan/在现有-raw-copy-…-功能增/plan.md`（ADR-014） |
| E2E | `butler/spec/在现有-raw-copy-…-功能增/e2e-artifacts/harness/run-e2e.mjs` |
| 发行 | `dist/raw-copy-1.1.0.zip`（重打包） |

> 冻结文件 `extension/src/selection.js` / `formatter.js` / `bulkformatter.js` 逻辑**未改动**。

---

## 6. 版本决策

- 本轮为 v1.1.0 的三项**同版本修复/调整** → 保持 `manifest.json#version = 1.1.0` 重打包（未 bump）。
- 若后续需要区分修复版发布，可 bump 至 `1.1.1` 并同步 `check-manifest.mjs` 版本断言与文档版本行（TASK-015 备注路径）。

---

## 7. 遗留风险与后续

| # | 风险 | 影响 | 处置 |
|---|------|------|------|
| R-1 | 批量入口**固定模式 A**（P-DEC-1） | 低-中 | 已登记；如用户需批量 B，可增量补 `#copy-selected-b-btn` |
| R-2 | 右键「已选保留」改变既有交互 | 中 | E2E AC-013 真机确认；ADR-014 显式记录 |
| R-3 | `setCopyMode`/`copyMode` 历史注释残留（`panel.js:433`、`detail.js`） | 低 | 仅文档注释，无逻辑引用；后续清理可选 |
| R-4 | E2E 需真实 Chrome/Edge 才能重跑新增场景 | 低 | harness 语法/加载 PASS；待环境可用时实机复跑 |

---

## 8. 机读结论

```text
---EXEC_START---
doc: 04-execution-summary
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
date: 2026-10-02
session: ses_f04369de5ffez8NqFaTi7bfLd2
role: butler-rf-fixer
solution: A
tasks_done: [TASK-001..TASK-016]
root_causes_fixed: [RC-1, RC-2, RC-3, RC-4, RC-5, RC-6]
gates:
  check-syntax: PASS (15/15)
  check-manifest: PASS (17/17)
  check-panel-shell: PASS (41/41)
  check-zero-network: PASS
tests: { total: 283, pass: 283, fail: 0, baseline: 264, added: 19, affected_scope: 141 }
package: { artifact: dist/raw-copy-1.1.0.zip, entries: 25, zero_dep: true, readback: PASS }
diff_analyzer: { panel.js: { P0: 0, P1: 1, P2: 0 } }
frozen_modules_untouched: [selection.js, formatter.js, bulkformatter.js]
verdict: PASS
---EXEC_END---
```
