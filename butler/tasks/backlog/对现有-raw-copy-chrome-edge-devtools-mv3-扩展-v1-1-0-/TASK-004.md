---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-001 TASK-002 TASK-003
agent: butler-rf-fixer
estimate: M
weight: heavy
covers: DEL-008 REQ-005 REQ-013 AC-001 AC-002 AC-003 AC-004 AC-006 AC-013
---

# TASK-004: 面板级接线测试（真实 `onContextMenu`）+ 混合修饰键并集 + 0/1/N 边界

<!-- butler:covers DEL-008 REQ-005 REQ-013 AC-001 AC-002 AC-003 AC-004 AC-006 AC-013 -->

## 目标
补齐 RC-4 最关键的缺口：现有测试按入口割裂（只测纯模型 / 只测全选+工具栏），**没有真实走 `panel.js` 的 `onContextMenu`**。本 TASK 新增面板级接线用例，固定 ① 的新契约。

## 涉及文件
- `tests/contextmenu.test.mjs`（新增面板级接线用例；清理 P2 形状断言）
- `tests/multiselection.test.mjs`（新增混合修饰键并集面板/模型级用例，如需）

## 冻结/禁止
- 测试文件不得依赖真实浏览器；用 DOM shim / 纯函数提取 + 鸭子类型事件模拟（沿用 `tests/contextmenu.test.mjs` 既有 stub 风格）。
- 不得修改被冻结的 `formatter.js` / `bulkformatter.js`。

## 实施要点
1. 面板级接线用例（真实 `onContextMenu`）：
   - 构造多选集合（`selectAt` + `toggleAt`）后，对**集合内行**派发 `contextmenu` → 断言集合不变、菜单项含「复制选中(N)」且 N === count。
   - 对**集合外行**派发 → 断言集合被替换为单选、count=1。
   - 空白/表头派发 → 不弹菜单、不改集合（`E_CTX_NO_TARGET`）。
2. 混合修饰键用例：`selectAt` + `toggleAt` + `Ctrl+Shift extendTo` → 并集（id3 不丢，先前 Ctrl 项保留）。
3. 0/1/N 边界：0 条提示且不写剪贴板；1 条 === 单选逐字符；N 条 N 段无跨条混淆（可复用 formatter/bulkformatter oracle 断言入口等价）。
4. 清理 P2 形状断言（与 TASK-002 对齐，避免重复/冲突）。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-008 | `tests/contextmenu.test.mjs` 新增面板级接线（真实 onContextMenu 折叠）用例 + P2 断言清理 |
| REQ-005 | 0/1/N 边界 + 全选/Ctrl/Shift/混合各路验证 |
| REQ-013 | 补齐回归网：接线 / 混合修饰键 / 入口等价 / ③删除断言的面板级部分 |
| AC-001 | Ctrl 选 2 → 右键 → 批量项 → 2 段 |
| AC-002 | 已选保留 / 未选替换集合断言 |
| AC-003 | 工具栏 ≡ 右键产物逐字符一致 |
| AC-004 | 并集断言（id3 保留） |
| AC-006 | 四路选择方式输出对应 N 段 |
| AC-013 | 新增面板级接线测试覆盖「多选态右键→批量项→N 段」与「混合修饰键并集」 |

## 验收
- [ ] test: PASS（`node --test tests/contextmenu.test.mjs tests/multiselection.test.mjs`）
- [ ] 新增用例在**未修 panel.js 时失败、修后通过**（确认真的接线到 `onContextMenu`，非纯模型）
- [ ] 无新增第三方依赖；测试可 `npm test` 全量运行

## 备注
- 依赖 TASK-003（panel.js 入口）、TASK-002（模型）、TASK-001（extendTo）。
- 与 TASK-009（golden）/ TASK-010（E2E）共同满足 REQ-013 / AC-013。
