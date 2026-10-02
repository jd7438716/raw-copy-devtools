---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-002, TASK-003, TASK-005, TASK-007, TASK-009
agent: butler-e2e-verifier
estimate: M
weight: heavy
covers: AC-001 AC-002 AC-003 AC-008 AC-009 AC-010 AC-011 DEL-007
---

# TASK-016: 浏览器级 E2E 实机验证（右键菜单 / 明细 / 多选工具栏）

<!-- butler:covers AC-001 AC-002 AC-003 AC-008 AC-009 AC-010 AC-011 DEL-007 -->

> 收敛·执行后补齐新增（不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

- `butler/spec/<slug>/test-results.md`（TASK-012 终局 Rework Round 1）末尾 **「未覆盖声明」** 明确：
  > scope=affected 窄化为「冻结两模块 + 全量既有测试 + 4 门禁 + 打包体积 + 三路径一致性」；
  > **未做浏览器级 E2E（右键菜单/双击详情 UI 实机渲染）**，依据 TASK-012 为冻结契约与回归门禁，UI 实机验证归 E2E/发布门。
- 因此以下 UI 交互 AC 仅有 Node 单测/逻辑测（`contextmenu.test.mjs`/`detail.test.mjs`），**无真机浏览器实证** → 被测试报告判为未完成：
  `AC-001 / AC-002 / AC-003 / AC-008 / AC-009 / AC-010 / AC-011`；`DEL-007`（测试交付物含「右键复制等价、双击明细保真」E2E）亦未闭合。
- 运行证据：`run_muqg8hsx_j7mhsr` 中 `e2e` / `e2e_gate` 节点仍 `pending`（execute 超时后整条验证链阻断）。

## 目标

在真实浏览器（Chrome 与 Edge，MV3）中加载 `extension/`（load unpacked），对右键菜单、双击明细、多选工具栏做**实机渲染与剪贴板断言**，闭合上述 UI AC。

## 涉及文件（只读验证，不改业务代码；仅产出验证报告）

- 被测：`extension/`（`panel.html` / `panel.js` / `styles/panel.css` / `src/contextmenu.js` / `src/detail.js` / `src/multiselection.js` / `src/bulkformatter.js`）
- 产出：`butler/spec/<slug>/e2e-report.md`（截图 + 剪贴板读取 + 断言表）

## 验证清单（逐条绑定 AC）

- [ ] **AC-001**：右键任意请求行 → 该行被选中且面板内自绘菜单弹出，至少含「复制请求 + 响应（原始）」。
- [ ] **AC-002**：菜单主项点击后读取真实剪贴板文本，与底部 `#copy-btn` 同模式（A/B）产物**逐字符一致**。
- [ ] **AC-003（P2）**：菜单「仅复制请求」「仅复制响应」产物与对应按钮等价（若实现）。
- [ ] **AC-008**：双击行 → `#detail-pane` 打开，六要素（方法+URL / 请求头 / 请求体 / 状态码+状态文本 / 响应头 / 响应体）齐全且顺序正确。
- [ ] **AC-009**：明细响应体逐字符等于原始响应体；头保持原始顺序（不缩进/不排序/不转 Markdown）。
- [ ] **AC-010**：明细可关闭返回列表；**单击仅选中、不打开明细**（仅双击打开）。
- [ ] **AC-011（P2）**：明细内「复制请求+响应」按钮产物与主复制按钮一致。
- [ ] **DEL-007**：E2E 用例覆盖「右键复制等价、双击明细保真」（多选拼接不混淆 / 单条逐字符回归由 TASK-012 单测覆盖，E2E 复跑抽查）。
- [ ] 边界抽查：右键表头/空白不弹菜单；Esc/点击他处/滚动/失焦关闭菜单；打开中记录被淘汰自动关闭明细。
- [ ] 控制台零错误、零 CSP 违规。

## 验收

- [ ] 两浏览器（Chrome / Edge）均通过并附截图与剪贴板原文。
- [ ] 每条断言映射到 AC 编号，形成 `e2e-report.md` 证据表。
- [ ] 若某条实测失败 → 作为新缺口登记（不掩盖）。

## 依赖

- TASK-002/003/005/007/009（UI 接线已落地）；TASK-012（既有单测/门禁基线）。
