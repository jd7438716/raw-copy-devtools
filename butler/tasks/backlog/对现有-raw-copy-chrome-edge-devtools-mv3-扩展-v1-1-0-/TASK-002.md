---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: N/A
agent: butler-rf-fixer
estimate: M
weight: standard
covers: DEL-003 DEL-015 REQ-003 REQ-008 REQ-009 AC-009 AC-010
---

# TASK-002: `contextmenu.js` 移除 P2 两项 + 保批量项可达 + 注释对齐 + 单测清理

<!-- butler:covers DEL-003 DEL-015 REQ-003 REQ-008 REQ-009 AC-009 AC-010 -->

## 目标
收敛 `extension/src/contextmenu.js` 的菜单模型：删除 P2「仅复制请求/仅复制响应」的全部常量/入参/分支，保留核心主项与 `count≥2` 的多选批量项；同时把与运行时不符的注释改为与实现一致。

## 涉及文件
- `extension/src/contextmenu.js`（修改）
- `tests/contextmenu.test.mjs`（清理 P2 形状断言 + 新增模型层断言）

## 冻结/禁止
- **保持 `createMenuModel` 纯函数**：输入非法按空上下文处理，**不抛异常**；菜单项顺序稳定（C-7）。
- **禁止**误删主项「复制请求 + 响应（原始）」或 `count≥2` 的多选批量项（REQ-009 / AC-010）。
- 保留 `CTX_ACTION.COPY_REQUEST_RESPONSE` / `CTX_ITEM_ID.COPY_SELECTED`。

## 实施要点
1. 删除 P2 常量：`CTX_ACTION.COPY_REQUEST_ONLY`、`CTX_ACTION.COPY_RESPONSE_ONLY`、`CTX_ITEM_ID.COPY_REQUEST_ONLY`、`CTX_ITEM_ID.COPY_RESPONSE_ONLY`。
2. 删除 `createMenuModel(context)` 的 `canCopyRequestOnly` 入参、`p2Enabled` 计算与两处 P2 `makeItem` 分支。
3. `makeItem` 去除 `p2` 字段（及 `extra.p2`）；项模型变为：主项常驻 + 当 `count>=2` 追加「复制选中(N)」。
4. `:162-164` 注释改为与运行时一致；删除 P2 相关 JSDoc（`:150-155,163-168,173`）。
5. 单测：删除/改写 `canCopyRequestOnly`、P2 `p2=true`、默认 3 项等形状断言；改为断言——无 P2 id/action、`count=0/1` 仅 1 项、`count>=2` 恰好 2 项且批量项 enabled、非法 context 不抛。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-003 | 菜单模型保证批量项可达；移除 P2 项与 `CTX_ACTION/CTX_ITEM_ID`、`canCopyRequestOnly` 入参 |
| DEL-015 | 删除「count≥2 追加」等与运行时不符的注释，注释与实现对齐 |
| REQ-003 | `count≥2` 时「复制选中(N)」在模型中真实存在且 enabled |
| REQ-008 | 移除右键菜单「仅复制请求/仅复制响应」的菜单项与模型逻辑 |
| REQ-009 | 核心主项与多选批量项保留 |
| AC-009 | `createMenuModel` 无 `canCopyRequestOnly` 入参、无 P2 项 |
| AC-010 | 主项 + 批量项在清理后仍保留且 enabled |

## 验收
- [ ] lint: PASS
- [ ] test: PASS（`node --test tests/contextmenu.test.mjs`）
  - [ ] 无 `copy-request-only` / `copy-response-only` id 或 action
  - [ ] `count=2` → 恰含批量项且 enabled，顺序稳定
  - [ ] 非法 / 缺省 context 安全降级、不抛
- [ ] 无悬空引用：全仓 grep `canCopyRequestOnly` / `CTX_ACTION.COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` 仅剩待清理的 panel.js（由 TASK-008 处理）

## 备注
- 与 TASK-003（panel.js 入口）共同满足 AC-001/002/003；`openMenuAt` 去掉 `canCopyRequestOnly` 在 TASK-003。
