---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-003, TASK-005, TASK-007, TASK-009
agent: butler-doc-writer
estimate: S
weight: light
covers: REQ-024 DEL-008 AC-017 US-004
---

# TASK-014: 使用/安装文档更新 + 需求覆盖声明

<!-- butler:covers REQ-024 DEL-008 AC-017 US-004 -->

## 目标
更新 `docs/USAGE.md` / `docs/INSTALL.md`，并**显式记录**多选复制覆盖 req.txt 原非目标（REQ-024 / AC-017）。

## 涉及文件
- `docs/USAGE.md`（修改）
- `docs/INSTALL.md`（修改）

## 内容要求
- USAGE 新增三节（对齐现有 13 节结构）：
  - 「右键菜单复制」：右键即选中 + 弹出菜单，主项「复制请求+响应（原始）」；右键为**主要**入口，底部按钮为补充。
  - 「多选批量复制」：Ctrl/Cmd+点击切换、Shift+范围、单击单选、↑↓ 单选移动；「全选」「复制选中(N)」；输出为 `N` 段、`===== #i/N =====` 分隔。
  - 「双击查看明细」：双击打开覆盖式抽屉，六要素原文，关闭按钮/Esc/遮罩返回。
- **数据安全警示**：批量复制可能一次带出**多份** `Authorization`/`Cookie`/token，粘贴第三方前注意（design §8.1）。
- **需求覆盖声明**（显式）：多选复制**取代** req.txt 非目标「不复制全部请求 / 只复制当前选中那一条绝不附带其他请求」；**单条复制仍为默认与主要场景，格式逐字符不变**。
- INSTALL：版本 bump（1.1.0）+ 重新加载（reload unpacked）说明 + 权限清单复核（仅 `clipboardWrite`）。

## AC 引用
- **AC-017**：规格明确记录多选复制已取代 req.txt 非目标，且单条仍为默认与主要场景。
- 关联 REQ-024、DEL-008、US-004。

## 验收
- [ ] lint: PASS
- [ ] 断言：USAGE 含「右键复制」「多选批量复制」「双击查看明细」三节
- [ ] 断言：USAGE 含批量敏感凭证警示
- [ ] 断言：含"多选覆盖原非目标 + 单条仍为默认主场景"声明
- [ ] 断言：INSTALL 含 reload unpacked 步骤与权限复核
- [ ] 审计：文档与实现一致（P2 详情内复制若实现须同步记录）
