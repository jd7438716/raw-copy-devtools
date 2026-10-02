---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-005
agent: butler-rf-fixer
estimate: S
weight: light
covers: DEL-013 REQ-015 AC-014
---

# TASK-011: `scripts/check-panel-shell.mjs` requiredIds 清单同步

<!-- butler:covers DEL-013 REQ-015 AC-014 -->

## 目标
门禁脚本的 DOM id 契约清单与 ②③ 后的 `panel.html` 同批同步，避免门禁漂移。

## 涉及文件
- `scripts/check-panel-shell.mjs`（修改 `requiredIds`，`:129-136`）

## 冻结/禁止
- 只改 id 清单与必要注释；不放松其他断言（7 列表头、无裸中文、模块脚本等保持）。
- 不得引入第三方依赖。

## 实施要点
1. `requiredIds` 删除：`mode-toggle`、`copy-req-btn`、`copy-resp-btn`。
2. `requiredIds` 新增：`copy-btn-a`、`copy-btn-b`。
3. 保留：`copy-btn`、`copy-curl-btn`、`context-menu`、`multiselect-actions`、`select-all-btn`、`copy-selected-btn`、`selected-count`、`detail-pane` 等既有 id。
4. 更新文件头注释（`:9`）的 id 契约说明。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-013 | `check-panel-shell.mjs` 面板外壳契约 id 清单同步（增删模式/分段按钮） |
| REQ-015 | 门禁脚本 id 清单同步 |
| AC-014 | id 清单同步后门禁 PASS |

## 验收
- [ ] `node scripts/check-panel-shell.mjs` → exit 0 / ALL PASS
- [ ] 清单与 `panel.html` 实际 id 完全一致（无遗漏/无残余）

## 备注
- 依赖 TASK-005（id 契约变更）。
- i18n 键断言由 TASK-006（`tests/i18n.test.mjs`）承担；E2E 步骤由 TASK-010 承担；三者共同满足 REQ-015 / AC-014。
