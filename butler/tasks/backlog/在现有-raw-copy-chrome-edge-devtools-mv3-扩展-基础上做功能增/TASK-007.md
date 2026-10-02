---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-006, TASK-002, TASK-003, TASK-005
agent: butler-developer
estimate: M
weight: standard
covers: REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 DEL-001 AC-001 AC-002 AC-003 US-001 US-004
---

# TASK-007: panel.js 右键菜单接线（含 P2 仅请求 / 仅响应）

<!-- butler:covers REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 DEL-001 AC-001 AC-002 AC-003 US-001 US-004 -->

## 目标
监听 `#list-body` 的 `contextmenu`，右键即**单选选中**该行并在指针处弹出**面板内自绘 DOM 菜单**（ADR-013，零权限），菜单项复用既有复制管线（ADR-014）。

## 涉及文件
- `extension/panel.js`（修改）

## 接线点（tech-eval ENH-001）
- `L21-29` import 追加 `contextmenu` 导出。
- `L49-69` `els` 追加 `contextMenu: document.querySelector('#context-menu')`。
- `L486+` `init()` 内新增 `wireContextMenu()`；`L662-669` 旁挂 `els.listBody.addEventListener('contextmenu', onContextMenu)`。
- `onContextMenu`：`event.preventDefault()` → `resolveRowId` → **右键即单选替换**（`selectAt`，ADR-014）→ 渲染菜单（`textContent`，禁 `innerHTML`）→ `clampPosition` 定位。
  - ⚠️ 对 `mousedown/click` 冒泡做隔离：菜单点击不应触发行 click 委托（`L624-643`）。
  - 关闭时机：`Esc` / 点击他处 / `#list` 滚动 / `window blur`；键盘 `ArrowUp/Down` + `Enter`。
- 菜单主项「复制请求 + 响应（原始）」→ `buildCurrentCopy(copyMode)`（复用 `L178-185`）→ `copyText`（`L794`）→ Toast（`L800-805`）——**与 `#copy-btn`（`L808-810`）同源，逐字符等价**（AC-002）。
- 复用 `L152-167 resolveResponseBodyText` / `L730-739 confirmLargeCopy`（大响应确认）。
- `count >= 2` 时菜单追加「复制选中(N)」→ 复用 TASK-005 的 `copySelection()`。
- **P2**「仅复制请求」「仅复制响应」（REQ-003）：按 **R-A 裁决**落地（见备注）。
- 新增导出 `openContextMenu(event)`（ADR-020 追加式）。

## 硬约束（门禁级）
- **禁止 `chrome.contextMenus`**（出现即 REJECT，AC-012 / ADR-013）。
- 菜单渲染统一 `textContent`；文案来自 i18n 常量字典。
- `#copy-btn` 保留为补充入口，**不改名、不删除**（REQ-005：右键为主要入口）。

## AC 引用
- **AC-001**：右键任意行 → 该行被选中 + 菜单弹出（至少含主项）。
- **AC-002**：右键菜单主项产物与底部同名按钮产物**逐字符一致**（模式 A/B 分别校验）。
- **AC-003**：菜单「仅复制请求」「仅复制响应」（P2）产物与**对应按钮**等价。
- 关联 REQ-001/002/003/004/005、DEL-001、US-001/US-004。

## 验收
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] lint: PASS（`rg "chrome\.contextMenus" extension/` == 0；无 `innerHTML`）
- [ ] 断言：右键行 → 行选中 + 菜单显示且不溢出视口；原生菜单被 `preventDefault`
- [ ] 断言：右键表头/空白 → 不弹菜单、不抛异常、不改集合（`E_CTX_NO_TARGET`）
- [ ] 断言：主项剪贴板文本 === `#copy-btn` 同模式产物（模式 A 与模式 B）
- [ ] 断言：Esc / 点击他处 / 滚动 / 失焦 → 菜单关闭无残留
- [ ] P2：若实现，仅请求/仅响应产物理化等价于对应按钮；未实现 → 记为 backlog（非阻塞）

## 备注（R-A 裁决点）
- 现有 `#copy-req-btn`/`#copy-resp-btn` 当前为 **deferred（点击仅提示 notEnabled）**。
- tech-eval R-A 默认采纳 **P-A**：按段标记裁剪 `buildCopyText` 输出得到"仅请求/仅响应"（模式 A）；模式 B 无标记需另定。
- 或按 design §10.5 声明 P2 非发布阻塞；若实现 P2 菜单项，需与对应按钮的最终行为对齐（可能需一并启用 `#copy-req-btn`/`#copy-resp-btn`）。
