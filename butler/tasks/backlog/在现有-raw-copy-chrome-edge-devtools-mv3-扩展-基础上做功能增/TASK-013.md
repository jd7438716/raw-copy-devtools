---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-001, TASK-004, TASK-006, TASK-008
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-007 AC-015
---

# TASK-013: 测试文档更新（`tests/test-cases.md` + `tests/README.md`）

<!-- butler:covers DEL-007 AC-015 -->

## 目标
把新增用例与门禁清单固化到测试文档，明确 AC-015「现有基线用例范围」口径。

## 涉及文件
- `tests/test-cases.md`（修改：追加右键/多选/详情三组用例，逐条绑定 AC-001..AC-017）
- `tests/README.md`（修改：新增 4 个测试文件条目 + 门禁脚本清单）

## 内容要求
- 追加三组用例：
  - 右键：命中/表头空白/键盘可达/关闭时机/主项等价（AC-001..003）
  - 多选：四语义互不破坏/全选与 N 实时/批量 N 段无混淆（AC-004..006）
  - 详情：六要素/原文保真/关闭返回/单击不打开/淘汰失效/明细内复制（AC-008..011）
- 记录边界（R-C）：空选 N=0、全选幂等、右键落表头、Shift 跨淘汰项、菜单键盘无障碍、详情期刷新。
- **AC-015 口径落定**（R-E）：现有基线用例 = 既有全部 `tests/*.test.mjs`（当前 10 个）全量 + 4 个门禁脚本（`check-manifest` / `check-syntax` / `check-zero-network` / `check-panel-shell`）。
- 新增 4 个测试文件条目：`contextmenu` / `multiselection` / `bulkformatter` / `detail`。
- 每个测试文件头注释声明其覆盖的 AC 编号（如 `// covers AC-006`）。

## AC 引用
- DEL-007（测试：右键复制等价、多选拼接不混淆、双击明细保真、单条逐字符回归）。
- AC-015（基线用例范围口径）——文档侧。

## 验收
- [ ] lint: PASS（文档无失效引用）
- [ ] 断言：`test-cases.md` 含三组新用例且逐条绑定 AC
- [ ] 断言：`README.md` 含 4 个新测试文件 + 4 门禁脚本清单
- [ ] 断言：AC-015 范围口径明确可判
