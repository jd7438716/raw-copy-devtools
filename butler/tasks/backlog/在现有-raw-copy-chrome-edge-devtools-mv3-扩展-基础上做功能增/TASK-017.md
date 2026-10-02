---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-003, TASK-005, TASK-007, TASK-009
agent: butler-doc-writer
estimate: S
weight: standard
covers: REQ-024 DEL-008 AC-017
---

# TASK-017: 使用/安装文档补齐 + 需求覆盖声明（TASK-014 残项）

<!-- butler:covers REQ-024 DEL-008 AC-017 -->

> 收敛·执行后补齐新增（不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

- 既有 `TASK-014`（covers `REQ-024 DEL-008 AC-017 US-004`）在此次执行中**未落地**，磁盘证据：
  - `docs/USAGE.md` / `docs/INSTALL.md`（及仓库根镜像 `USAGE.md` / `INSTALL.md`）mtime 均为 **10:27**，早于本次增强开始（12:28）；
  - grep 全文**无**「多选批量复制」「双击查看明细」「需求覆盖声明 / 取代原非目标」等新增章节（仅有基线期的通用「敏感信息警示」）。
- `run_muqg8hsx_j7mhsr` 的 `execute` 节点超时失败（2400000ms）→ 该文档类 TASK 未被执行。
- 故 `REQ-024 / DEL-008 / AC-017` 三个 spec ID **未完成交付**。

## 目标

更新 `docs/USAGE.md` / `docs/INSTALL.md`（并同步仓库根镜像 `USAGE.md` / `INSTALL.md`），补齐增强功能说明与**显式需求覆盖声明**。

## 涉及文件（文档）

- `docs/USAGE.md`、`USAGE.md`（同步镜像）
- `docs/INSTALL.md`、`INSTALL.md`（同步镜像）

## 内容要求（对齐 TASK-014 原文）

- USAGE 新增三节：
  - 「右键菜单复制」：右键即选中 + 菜单，主项「复制请求+响应（原始）」；右键为**主要**入口，底部按钮为补充。
  - 「多选批量复制」：Ctrl/Cmd+点击切换、Shift+范围、单击单选、↑↓ 单选移动；「全选」「复制选中(N)」；输出为 `N` 段、`===== #i/N =====` 分隔。
  - 「双击查看明细」：双击打开覆盖式抽屉，六要素原文，关闭按钮/Esc/遮罩返回。
- **数据安全警示**（批量）：一次可能带出**多份** `Authorization`/`Cookie`/token，粘贴第三方前注意。
- **需求覆盖声明（REQ-024 / AC-017）**：显式记录多选复制**取代** req.txt 原非目标「不复制全部请求 / 只复制当前选中那一条绝不附带其他请求」；**单条复制仍为默认与主要场景，格式逐字符不变**。
- INSTALL：版本 bump（1.1.0）+ reload unpacked 说明 + 权限复核（仅 `clipboardWrite`）。

## 验收

- [ ] 断言：USAGE 含「右键菜单复制」「多选批量复制」「双击查看明细」三节，且仓库根与 `docs/` 镜像逐字节一致。
- [ ] 断言：USAGE 含批量敏感凭证警示。
- [ ] 断言：含「多选覆盖原非目标 + 单条仍为默认主场景」声明。
- [ ] 断言：INSTALL 含 reload unpacked 步骤与权限复核。
- [ ] 审计：文档与实现一致（P2 若实现须同步记录）。

## 依赖

- TASK-003/005/007/009（文档须反映已落地的实际行为）。
