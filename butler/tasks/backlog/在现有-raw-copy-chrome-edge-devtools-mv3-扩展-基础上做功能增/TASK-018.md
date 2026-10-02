---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-016
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-007
---

# TASK-018: 测试文档固化（`tests/test-cases.md` + `tests/README.md`，TASK-013 残项）

<!-- butler:covers DEL-007 -->

> 收敛·执行后补齐新增（不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

- 既有 `TASK-013`（covers `DEL-007 AC-015`）在此次执行中**未落地**，磁盘证据：
  - `tests/test-cases.md`（mtime 10:45）、`tests/README.md`（mtime 10:46）均早于本次增强开始（12:28）；
  - grep 全文**无** `contextmenu` / `multiselection` / `bulkformatter` / `detail` 三组新增用例与四个新测试文件条目。
- `run_muqg8hsx_j7mhsr` 的 `execute` 节点超时失败 → 该 TASK 未执行。
- 故 `DEL-007`（测试交付物：右键复制等价、多选拼接不混淆、双击明细保真、单条逐字符回归）的**文档侧**未闭合（单测文件本身已存在并通过）。

## 目标

把新增用例与门禁清单固化到测试文档，明确 AC-015「现有基线用例范围」口径。

## 涉及文件（文档）

- `tests/test-cases.md`（追加右键/多选/详情三组用例，逐条绑定 AC-001..AC-017）
- `tests/README.md`（新增 4 个测试文件条目 + 4 门禁脚本清单）

## 内容要求

- 追加三组用例：
  - 右键：命中/表头空白/键盘可达/关闭时机/主项等价（AC-001..003）
  - 多选：四语义互不破坏/全选与 N 实时/批量 N 段无混淆（AC-004..006）
  - 详情：六要素/原文保真/关闭返回/单击不打开/淘汰失效/明细内复制（AC-008..011）
- 记录边界：空选 N=0、全选幂等、右键落表头、Shift 跨淘汰项、菜单键盘无障碍、详情期刷新。
- **AC-015 口径落定**：现有基线用例 = 既有全部 `tests/*.test.mjs` 全量 + 4 门禁脚本（`check-manifest` / `check-syntax` / `check-zero-network` / `check-panel-shell`）。
- 新增 4 个测试文件条目：`contextmenu` / `multiselection` / `bulkformatter` / `detail`；每个测试文件头注释声明覆盖的 AC 编号。

## 验收

- [ ] 断言：`test-cases.md` 含三组新用例且逐条绑定 AC。
- [ ] 断言：`README.md` 含 4 个新测试文件 + 4 门禁脚本清单。
- [ ] 断言：AC-015 范围口径明确可判。
- [ ] 附 E2E 结果（来自 TASK-016）的指针，形成「单测 + E2E + 门禁」完整证据链。

## 依赖

- TASK-016（E2E 结果作为文档中的 E2E 用例证据）。
