# Spec — Raw Copy v1.1.0 三项修复/调整（多选漏条 / 复制模式按钮化 / 移除分段复制）

> slug: `对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
> 人读视图，与 `spec.json` 内容一致（机器真源 = `spec.json`）
> 生成: 2026-10-02 by butler-requirement-analyst（fix 管线 · 规格脊柱覆盖重写）
> 阶段: Mode analyze · 根因分析节点（01-root-cause）之后

## Source（上游出处）

- `butler/spec/对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-/01-root-cause.md`（主上游：需求原文 §0.1、事实基线 §2、RCA §3/§9、CIA §8、移交 §10）
- `butler/plan/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/plan.md`（ADR-014 §506-517、ADR-013 自绘菜单）
- `butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-report.md`（§3 #2/#12；AC-001/005/006）
- `extension/panel.js`、`extension/src/multiselection.js`、`extension/src/contextmenu.js`、`extension/src/bulkformatter.js`、`extension/panel.html`（§2 事实基线 file:line）

## Items

### 需求（REQ）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| REQ-001 | ui | 01-root-cause §0.3 ①/§10.1-1 | 入口统一：工具栏「复制选中(N)」与右键批量项对同一选中集合产出逐字符一致的 N 段文本（N≥2 含 `===== #i/N =====` 分隔） |
| REQ-002 | ui | 01-root-cause §9 RC-1/§10.1-2 | 右键不得丢失多选：命中已在集合内的行必须保留集合；仅命中集合外行才按单选替换 |
| REQ-003 | ui | 01-root-cause §2 F6/§5 CE-6/§10.1-2 | 菜单批量项「复制选中(N)」在 count≥2 时必须真实出现且可达（当前为不可达死规则） |
| REQ-004 | ui | 01-root-cause §9 RC-2/§5 CE-3/§10.1-3 | 混合修饰键正确：Ctrl 选集 + Shift 扩选得到并集（additive range），不得清空先前 Ctrl 已选项 |
| REQ-005 | verify | 01-root-cause §10.1-4/§5 CE-7/CE-8 | 边界：0 条明确提示且不写剪贴板；1 条逐字符等于单选；N 条 N 段零跨条混淆；全选/Ctrl/Shift/混合均正确 |
| REQ-006 | ui | 01-root-cause §0.1-2/§10.2-② | 复制模式 A/B 各提供独立按钮，点击哪个即按哪个模式复制（动作即模式），取消「先切换再复制」toggle |
| REQ-007 | ui | 01-root-cause §0.1-2/§0.4-② | 保留默认模式 A 语义；A/B 复制产物字节契约不变（`formatter.js` 冻结） |
| REQ-008 | ui | 01-root-cause §0.1-3/§10.2-③ | 移除右键菜单「仅复制请求」「仅复制响应」：菜单项、处理逻辑、i18n 文案与相关测试一并清理 |
| REQ-009 | ui | 01-root-cause §0.3 ③/§10.2-③ | 保留核心「复制请求 + 响应（原始）」以及多选批量项，不得随 ③ 一并误删 |
| REQ-010 | ops | 01-root-cause §0.1 约束/§8.4 | 约束保持：MV3、零第三方依赖、仅 `clipboardWrite`（不新增 host/网络权限）、零网络传输 |
| REQ-011 | data | 01-root-cause §0.1 约束/§8.4 | 响应体字符级保真；大响应/二进制/Base64 规则不变；发行体积门禁 <200KB 不受影响 |
| REQ-012 | api | 01-root-cause §8.5 D维 | `openContextMenu` 契约变化（右键不再坍缩多选）为契约级，需回归；`getCopyMode/setCopyMode` 保留或明确废弃 |
| REQ-013 | verify | 01-root-cause §9 RC-4/§10.3 | 补齐回归网：面板级接线（真实 `onContextMenu`）、混合修饰键并集、入口等价、②双按钮 golden、③删除断言 |
| REQ-014 | ops | 01-root-cause §9 RC-3/§10.4 | 文档修订：ADR-014 互斥条目重裁、`contextmenu` 注释对齐、tests 文档、USAGE/INSTALL 同步 |
| REQ-015 | ops | 01-root-cause §2 F18/F19/§10.3 | 门禁脚本 id 清单同步：`check-panel-shell.mjs` 的 `#mode-toggle`/`#copy-req-btn`/`#copy-resp-btn`，及 i18n 键断言、E2E 步骤 |
| REQ-016 | ops | 01-root-cause §8.4/[ASSUMPTION] | [ASSUMPTION] 需重新打包发行 ZIP（manifest 版本号处理待 solution 拍板，体积<200KB/零依赖审计通过） |

### 交付物（DEL）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| DEL-001 | ui | 01-root-cause §8.2 A维/§10.1-1,2 | `extension/panel.js` — 右键 `onContextMenu` 入口语义统一（命中已选行保留集合 / 命中未选行替换）+ 修饰键分派顺序修正 |
| DEL-002 | ui | 01-root-cause §9 RC-2/§10.2 | `extension/src/multiselection.js` — `rangeTo` 语义改为 additive 并集（或新增 additive 模式），保持既有不变量 |
| DEL-003 | data | 01-root-cause §8.3 B维/§2 F24/§10.2-③ | `extension/src/contextmenu.js` — 菜单模型保证批量项可达；移除 P2 项与 `CTX_ACTION/CTX_ITEM_ID`、`canCopyRequestOnly` 入参 |
| DEL-004 | ui | 01-root-cause §8.2 A维/§10.2-② | `extension/panel.js` — 复制按钮区模式 A/B 双按钮接线（按钮携带模式实参，默认 A）；移除分段复制共享逻辑调用 |
| DEL-005 | ui | 01-root-cause §2 F13/F20/§10.2-②③ | `extension/panel.html` — 新增模式 A/B 独立按钮，移除 `#mode-toggle` 与 `#copy-req-btn`/`#copy-resp-btn` |
| DEL-006 | ui | 01-root-cause §2 F17 | `extension/styles/panel.css` — 模式 A/B 与复制按钮区样式（沿用既有 token） |
| DEL-007 | data | 01-root-cause §2 F16/F26/§10.2-②③ | `extension/src/i18n.js` — 模式双按钮文案键新增/调整；`copy.buttonRequest/Response` 与 `contextmenu.copyRequestOnly/copyResponseOnly` 清理（zh/en 对齐） |
| DEL-008 | verify | 01-root-cause §9 RC-4/§10.3 | `tests/contextmenu.test.mjs` — 新增面板级接线用例（真实 `onContextMenu` 折叠）；清理 P2 项形状断言 |
| DEL-009 | verify | 01-root-cause §2 F32/§10.3 | `tests/multiselection.test.mjs` — 新增 Ctrl 选集 + Shift 扩选并集用例 |
| DEL-010 | verify | 01-root-cause §2 F27/§10.3 | `tests/i18n.test.mjs` — 键集断言同步（新增模式键 / 清理 P2 键；zh/en 对齐） |
| DEL-011 | verify | 01-root-cause §10.3-② | `tests/formatter.test.mjs`（及 bulkformatter）— 模式 A/B 双按钮产物与冻结 golden 逐字符断言 |
| DEL-012 | verify | 01-root-cause §2 F19/F30/§10.3 | E2E harness `run-e2e.mjs` — 新增多选态右键批量入口 + 混合修饰键场景；替换 `#mode-toggle` 点击步骤 |
| DEL-013 | ops | 01-root-cause §2 F18/§8.3 B维 | `scripts/check-panel-shell.mjs` — 面板外壳契约 id 清单同步（增删模式/分段按钮） |
| DEL-014 | ops | 01-root-cause §9 RC-3/§10.4 | `butler/plan/…功能增/plan.md` — ADR-014 重裁：互斥条目改为一致规则 + 补「联合可满足性」核对说明 |
| DEL-015 | ops | 01-root-cause §3 H3/§10.4 | `extension/src/contextmenu.js` — 注释与实现对齐（删除「count≥2 追加」与运行时不符的注释） |
| DEL-016 | ops | 01-root-cause §10.4 | `tests/test-cases.md` 与 `tests/README.md` — 用例与运行说明同步（清理 P2 / 补齐新场景） |
| DEL-017 | ops | 01-root-cause §10.4 | `docs/USAGE.md` / `INSTALL.md` — 若 ③ 一并移除底部两按钮，同步删除分段复制说明 |
| DEL-018 | ops | 01-root-cause §8.4/[ASSUMPTION] | [ASSUMPTION] `dist/` 重新打包发行 ZIP（含 manifest 版本号处理；体积<200KB + 零依赖审计 + zip 读回门禁） |

### 验收标准（AC）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| AC-001 | verify | 01-root-cause §5 CE-4/CE-9 | Ctrl 选 2 条后右键 → 菜单出现「复制选中(2)」且点击产出 2 段（`===== #1/2 =====`/`#2/2`），剪贴板含全部 2 条 |
| AC-002 | verify | 01-root-cause §9 RC-1/§10.1-2 | 右键命中已在集合内的行保留集合（不坍缩）；命中集合外行按单选替换——集合 size 与 count 符合预期 |
| AC-003 | verify | 01-root-cause §10.1-1/§5 CE-9-3 | 工具栏批量项与右键批量项对同一选中集合的产物逐字符一致 |
| AC-004 | verify | 01-root-cause §5 CE-3/§10.1-3 | `selectAt` + Ctrl `toggleAt` + Ctrl+Shift 扩选得到并集（id3 不被丢弃），先前 Ctrl 已选项保留 |
| AC-005 | verify | 01-root-cause §10.1-4/§5 CE-7/CE-8 | 0 条提示且不写剪贴板；1 条输出逐字符等于单选（无 `===== #i/N =====`）；N 条输出 N 段无跨条混淆 |
| AC-006 | verify | 01-root-cause §0.1-1/§10.1 | 全选、Ctrl、Shift、Ctrl+Shift 混合四种选择方式均正确输出对应 N 段 |
| AC-007 | verify | 01-root-cause §0.1-2/§10.3-② | 复制相关按钮区存在「模式 A」「模式 B」两个独立按钮；点 A 按 A 复制、点 B 按 B 复制；无 toggle 状态残留 |
| AC-008 | verify | 01-root-cause §0.4-②/§10.3-② | 默认模式为 A；A/B 双按钮各自产物与冻结 A/B golden 逐字符一致 |
| AC-009 | verify | 01-root-cause §0.1-3/§10.3-③ | 菜单项集不含 `copy-request-only`/`copy-response-only`；`createMenuModel` 无 `canCopyRequestOnly` 入参；相关 i18n 键已清理 |
| AC-010 | verify | 01-root-cause §0.3 ③/§10.3-③ | 「复制请求 + 响应（原始）」与多选批量项在 ③ 清理后仍保留且可用 |
| AC-011 | verify | 01-root-cause §0.1 约束/§8.4 | manifest 仍仅 `clipboardWrite`、无 `host_permissions`、无网络；零第三方依赖与零网络校验通过 |
| AC-012 | verify | 01-root-cause §0.1 约束 | 响应体字符级保真不变；大响应/二进制/Base64 规则不变（既有 content/formatter 契约用例全绿） |
| AC-013 | verify | 01-root-cause §9 RC-4/§10.3 | 新增面板级接线测试（真实 `panel.js`+DOM shim 或扩展 E2E）覆盖多选态右键→批量项→N 段 与 混合修饰键并集 |
| AC-014 | verify | 01-root-cause §10.3 同步门禁 | `check-panel-shell.mjs` id 清单、i18n 键断言、E2E 步骤同步后各自门禁 PASS |
| AC-015 | verify | 01-root-cause §5 CE-0/§10.3 | 现有测试（除有意更新用例）保持全绿，无回归（基线 264/264） |
| AC-016 | verify | 01-root-cause §8.4/[ASSUMPTION] | [ASSUMPTION] 发行 ZIP 体积 <200KB + 零依赖审计 + zip 读回门禁全部 PASS |
| AC-017 | verify | 01-root-cause §9 RC-3/§10.4 | ADR-014 互斥条目修正为一致规则且记录「联合可满足性」核对；`contextmenu` 注释与运行时一致 |

## 根因映射（与 01-root-cause 对齐）

| 需求 | 对应根因 | 综合优先级 |
|------|----------|-----------|
| ITEM-1 多选复制漏条 | RC-1（右键入口坍缩多选）、RC-2（Ctrl+Shift 混合丢弃）、RC-3（ADR-014 互斥）、RC-4（验证网割裂） | RC-1/RC-3/RC-4 HIGH；RC-2 MEDIUM（需求明示） |
| ITEM-2 模式按钮化 | RC-6（体验调整） | MEDIUM（本次交付范围） |
| ITEM-3 移除分段复制 | RC-5（能力面收敛） | MEDIUM（本次交付范围） |
