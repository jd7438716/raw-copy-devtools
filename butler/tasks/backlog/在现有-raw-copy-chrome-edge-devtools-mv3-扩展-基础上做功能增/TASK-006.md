---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: N/A
agent: butler-developer
estimate: S
weight: standard
covers: REQ-001 REQ-002 REQ-003 REQ-004 DEL-001 AC-001 AC-003 US-001 US-004
---

# TASK-006: 右键菜单逻辑模块 `contextmenu.js` + 单测

<!-- butler:covers REQ-001 REQ-002 REQ-003 REQ-004 DEL-001 AC-001 AC-003 US-001 US-004 -->

## 目标
新增 `extension/src/contextmenu.js`：**纯逻辑**（零 DOM 依赖、零浏览器 API，Node 直测），提供行命中判定、菜单项模型、视口 clamp。

## 涉及文件
- `extension/src/contextmenu.js`（新增）
- `tests/contextmenu.test.mjs`（新增）

## 接口契约（design §4.2 / ADR-013）
- `resolveRowId(event, listBodyEl): id|null`
  - 路径：`event.target.closest('.row')` → 读 `data-id`（采用 `render.js` 已写入的 `data-id`，命中稳定，规避 DOM 回收/A-2）。
  - 未命中表头 / 空白 / 未渲染行 → `null`（错误码 `E_CTX_NO_TARGET`，不抛异常）。
- `createMenuModel({hasSelection, count, canCopyRequestOnly}): MenuItem[]`
  - 主项「复制请求 + 响应（原始）」常驻；
  - `count >= 2` 追加「复制选中(N)」（ADR-014）；
  - 「仅复制请求」「仅复制响应」= **P2**（REQ-003，落地路径见 R-A 备注）。
- `clampPosition({x, y, w, h, vw, vh}): {left, top}` —— 视口四边夹取，防溢出。

## 硬约束（门禁级）
- **禁止引用 `chrome.contextMenus`**（ADR-013；出现即 REJECT，违反 AC-012）。
- **禁止 `innerHTML`**；菜单文案来自 i18n 常量字典。
- 菜单项模型是纯数据，不含 DOM 渲染（渲染在 TASK-007）。

## AC 引用
- **AC-001**：右键任意行 → 该行被选中并弹出菜单，至少含「复制请求 + 响应（原始）」（命中 + 模型侧）。
- **AC-003**：菜单含「仅复制请求」「仅复制响应」（P2）且与对应按钮等价（模型侧；等价性由 TASK-007 完成）。
- 关联 REQ-001/002/003/004、DEL-001、US-001/US-004。

## 验收
- [ ] lint: PASS（`rg "chrome\.contextMenus" extension/src/contextmenu.js` == 0）
- [ ] test: PASS（`tests/contextmenu.test.mjs`）
  - [ ] resolveRowId 命中 `.row[data-id]`；表头/空白/无 closest → null
  - [ ] clampPosition 左/右/上/下四边夹取
  - [ ] createMenuModel count=0/1/2 项集正确、主项常驻、禁用态正确
- [ ] build: PASS（`node scripts/check-syntax.mjs`）

## 备注（R-A 待裁决）
- tech-eval R-A：`formatter.buildCopyText` 结构固定输出 REQUEST+RESPONSE 两段，**仅注入 body 无法得到「仅请求」**。
  - 默认采纳 **P-A**：在 panel/菜单执行层按段标记裁剪（模式 A）；模式 B 无标记，需另定。
  - 或按 design §10.5 声明 P2 **非发布阻塞**，AC-003 若未实现则不计失败。
- 本 TASK 只交付菜单模型（含 P2 项占位）；执行路径在 TASK-007 裁决。
