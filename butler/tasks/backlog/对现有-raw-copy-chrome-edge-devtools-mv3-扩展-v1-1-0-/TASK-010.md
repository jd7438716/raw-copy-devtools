---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-003 TASK-005 TASK-006 TASK-007 TASK-008
agent: butler-rf-fixer
estimate: M
weight: standard
covers: DEL-012 REQ-013 AC-013 AC-014
---

# TASK-010: E2E harness 更新（A/B 按钮替换 toggle + 多选态右键批量 + 混合修饰键）

<!-- butler:covers DEL-012 REQ-013 AC-013 AC-014 -->

## 目标
同步 E2E 驱动脚本到新 UI/交互契约：替换 `#mode-toggle` 点击步骤为 A/B 按钮；新增「多选态右键 → 批量项 → N 段」与「混合修饰键并集」真机场景；移除 P2 项相关步骤。

## 涉及文件
- `butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-artifacts/harness/run-e2e.mjs`（修改 `:505-546` 及 P2 相关断言）

## 冻结/禁止
- harness 只改驱动/断言，不改扩展源码。
- 步骤与断言必须反映**真实面板行为**（真实 `contextmenu` 事件、真实剪贴板采样）。

## 实施要点
1. `:505-520` 模式 B 场景：删除 `#mode-toggle` 点击与 `data-mode` 读取，改为点击 `#copy-btn-b`（模式 B）/ `#copy-btn-a`（模式 A）采样。
2. 新增场景：Ctrl 选 2 条 → 对**集合内行**派发 `contextmenu` → 断言菜单含「复制选中(2)」→ 点击 → 剪贴板含 2 段 `===== #1/2 =====` / `#2/2`。
3. 新增场景：`selectAt` + `toggleAt` + `Ctrl+Shift` 扩选 → 断言并集（先前项保留）。
4. 移除/替换引用 `#copy-request-only` / `#copy-response-only` / `#copy-req-btn` / `#copy-resp-btn` 的步骤与断言。
5. 保留多选工具栏 N 段场景（`:523-546`）并确认与新契约一致。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-012 | E2E harness 新增多选态右键批量入口 + 混合修饰键场景；替换 `#mode-toggle` 点击步骤 |
| REQ-013 | 回归网之 E2E 部分 |
| AC-013 | E2E 覆盖「多选态右键→批量项→N 段」与「混合修饰键并集」 |
| AC-014 | E2E 步骤同步后门禁 PASS |

## 验收
- [ ] harness 语法/加载 PASS
- [ ] 新步骤在修复前失败、修复后 PASS（有效回归）
- [ ] 无残留 `mode-toggle` / P2 选择器

## 备注
- 依赖 TASK-003/005/006/007/008（新 DOM 与交互契约就绪后才可改驱动）。
- AC-014 的「门禁 PASS」由 TASK-011（id 清单）与 TASK-016（全量门禁）最终确认。
