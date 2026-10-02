---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: N/A
agent: butler-rf-fixer
estimate: S
weight: light
covers: DEL-007 DEL-010 REQ-006 REQ-008 REQ-009 AC-009 AC-010
---

# TASK-006: `src/i18n.js` 模式双按钮键新增 + P2 键清理 + 键集断言同步

<!-- butler:covers DEL-007 DEL-010 REQ-006 REQ-008 REQ-009 AC-009 AC-010 -->

## 目标
i18n 字典与代码同批同步：② 新增模式 A/B 按钮文案键；③ 删除 `copy.buttonRequest/buttonResponse`、`contextmenu.copyRequestOnly/copyResponseOnly`；zh/en **键集一一对应**。

## 涉及文件
- `extension/src/i18n.js`（修改）
- `tests/i18n.test.mjs`（键集断言同步）

## 冻结/禁止
- **不得改动逐字符契约键**：`copy.metaHeader` / `copy.requestSection` / `copy.responseSection` / `copy.requestBody` / `copy.responseBody` / `content.*`（禁翻译）。
- en 必须与 zh 键集完全一致（结构占位约定）。
- 缺失 key 仍返回 key 本身、仅告警、不抛异常。

## 实施要点
1. 新增键（zh/en 各一份）：
   - `mode.aButton`：模式 A 按钮文案（如「模式 A」/「Mode A」）
   - `mode.bButton`：模式 B 按钮文案（如「模式 B」/「Mode B」）
   - `mode.aHint` / `mode.bHint`：已有则复用为 title 说明。
   - `mode.label` 若无引用（toggle 已删）则删除。
2. 删除键（zh/en 同步）：`copy.buttonRequest`、`copy.buttonResponse`、`contextmenu.copyRequestOnly`、`contextmenu.copyResponseOnly`。
3. 保留 `contextmenu.copyRequestResponse`、`contextmenu.copySelected`、`copy.button`、`copy.buttonCurl`。
4. `tests/i18n.test.mjs`：更新 zh/en 键集对齐断言、新增键存在性/插值断言、断言 P2 键已不存在。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-007 | `i18n.js` 新增模式双按钮键；清理 `copy.buttonRequest/Response`、`contextmenu.copyRequestOnly/copyResponseOnly`（zh/en 对齐） |
| DEL-010 | `tests/i18n.test.mjs` 键集断言同步（新增模式键 / 删除 P2 键；zh/en 对齐） |
| REQ-006 | 提供模式 A/B 按钮文案键 |
| REQ-008 | 清理「仅复制请求/仅复制响应」i18n 键 |
| REQ-009 | 主项 / 批量项文案键保留 |
| AC-009 | 相关 i18n 键已清理 |
| AC-010 | 主项 + 批量项文案键保留可用 |

## 验收
- [ ] test: PASS（`node --test tests/i18n.test.mjs`）
- [ ] zh/en 键集 deepEqual 一致
- [ ] `copy.buttonRequest` / `copy.buttonResponse` / `contextmenu.copyRequestOnly` / `contextmenu.copyResponseOnly` 在 dict 中不存在
- [ ] 逐字符契约键零改动

## 备注
- 键名契约与 TASK-005（HTML `data-i18n`）严格一致：`mode.aButton` / `mode.bButton`。
- 与 TASK-008（panel.js 删除 P2 逻辑/i18n 使用点）共同满足 REQ-008。
