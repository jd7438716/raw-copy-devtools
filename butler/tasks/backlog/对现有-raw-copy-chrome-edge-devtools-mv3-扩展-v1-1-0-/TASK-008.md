---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-002 TASK-007
agent: butler-rf-fixer
estimate: M
weight: standard
covers: REQ-008 REQ-009 AC-009 AC-010
---

# TASK-008: `panel.js` ③ 彻底移除分段复制（菜单 P2 分派 + 底部按钮 + 共享逻辑 + 孤儿）

<!-- butler:covers REQ-008 REQ-009 AC-009 AC-010 -->

## 目标
③ 能力收敛：从 `panel.js` 彻底删除「仅复制请求 / 仅复制响应」的执行路径与共享逻辑，消除孤儿代码与悬空引用；**核心主项「复制请求 + 响应（原始）」与多选批量项不得误删**。

## 涉及文件
- `extension/panel.js`（删除：`:1379-1424` 共享逻辑、`:1453-1489`、`:1503-1506` 分派分支、`:1638-1654` 底部按钮接线、P2 相关 import/常量）

## 冻结/禁止
- **禁止**误删主项路径 `runCurrentCopy` / `copySelection` / 批量入口（REQ-009 / AC-010）。
- **禁止**改动冻结产物契约。
- 删除必须彻底：不得留无调用的 `extractSectionText` / `buildSectionCopy` / `runSectionCopy` / `writeCopyText`（若仅为分段复制所用）。

## 实施要点
1. 删除 `extractSectionText` / `buildSectionCopy` / `runSectionCopy`（`:1379-1489`）；`writeCopyText` 若仅被分段路径使用则一并删除。
2. `dispatchContextAction` 删除 `CTX_ACTION.COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` 分支（`:1503-1506`）。
3. 删除 `#copy-req-btn` / `#copy-resp-btn` 的 click 接线（`:1638-1654`）。
4. 清理不再使用的 import / 常量：`CTX_ACTION` P2 成员、`REQUEST_SECTION` / `RESPONSE_SECTION`（若无其他消费者）、`showToast(t('copy.notEnabled'))` 分段专用提示。
5. 全仓 grep 自检：`extractSectionText` / `buildSectionCopy` / `runSectionCopy` / `COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` / `copy.buttonRequest` / `copy.buttonResponse` 在 `extension/` 下无残留引用。
6. 保留并确认：`#copy-btn`、`#copy-btn-a/b`、`#copy-selected-btn`、菜单主项与批量项均正常接线。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| REQ-008 | 移除「仅复制请求/仅复制响应」的处理逻辑与按钮接线 |
| REQ-009 | 核心主项 + 多选批量项保留，不随 ③ 误删 |
| AC-009 | 无 P2 执行路径/分派分支/按钮接线 |
| AC-010 | 「复制请求 + 响应（原始）」与批量项清理后仍可用 |

## 验收
- [ ] lint/build: PASS
- [ ] test: PASS（既有用例除有意更新外全绿）
- [ ] 无悬空引用：上述 grep 清单在 `extension/` 下为零
- [ ] 功能面保留：`#copy-btn` 与菜单主项、`#copy-selected-btn` 与菜单批量项接线存在

## 备注
- 依赖 TASK-002（`contextmenu.js` 去 P2）与 TASK-007（同文件串行）。
- 与 TASK-006（i18n 键清理）共同满足 REQ-008 的「菜单项、处理逻辑、i18n 文案与相关测试一并清理」。
