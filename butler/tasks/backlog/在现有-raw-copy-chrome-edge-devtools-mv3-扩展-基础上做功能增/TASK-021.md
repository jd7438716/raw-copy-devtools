---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-017
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-008 AC-017
---

# TASK-021: 隐私声明一致性修订（`privacy.html`「单条」→「一条或多条」，与多选行为对齐）

<!-- butler:covers DEL-008 AC-017 -->

> 收敛·执行后补齐新增（第 2 轮；不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

被 **独立安全审计报告** 标为「未完成（发行文档与行为不一致）」：`butler/spec/<slug>/sec-audit.md`
（TASK-019）将其登记为 **F-06 / `RISK-DOC-01`（§0 结论摘要 / §4.3 COMPLIANCE / §8.3 / §10.5）**：

> 「`privacy.html` 声明『只做一件事：把你选中的**单条**网络请求…写入剪贴板』，与增强后的**多选批量复制**
> 行为不一致；该页随发行包发布，属**数据使用披露准确性**（Chrome Web Store 审核关注项）。」
> §10.5 处置：把「**单条**网络请求」改为「**一条或多条**你选中的网络请求」，并在「你的控制权」节说明
> 多选批量为显式点击触发、单次可复制多条；**同步检查 `USAGE.md`/`docs/*`**；验证：**文档评审 + 与
> `extension/` 行为逐条对齐（DEL 侧）**。

可核验的磁盘佐证（本次复扫）：

- `extension/privacy.html` mtime **10:27**（早于本次增强开始 12:28），**未随增强更新**。
- 其第 128 行仍为：`<strong>单条</strong>网络请求的完整原始信息拼接为纯文本并写入剪贴板。`
- 对照：`docs/USAGE.md` 已于 13:39 记录多选批量复制（§7 / §12），且明确「单条复制仍为默认与主要场景」→
  唯 `privacy.html` 的「单条」限定与实现及 USAGE 自相矛盾。
- 该页为**发行包内文件**（`package.mjs` 白名单含 `privacy.html`），随发行分发，属对外数据使用披露。

## 目标

修订 `extension/privacy.html` 的数据使用披露，使其与增强后行为（单条 + 多选批量）一致，并同步核对用户文档。

## 涉及文件（文档）

- 修改：`extension/privacy.html`（「只做一件事…单条」→「一条或多条你选中的请求」；「你的控制权」节补充多选批量说明）。
- 核对（不改或按需同步）：`docs/USAGE.md`、`USAGE.md`、`docs/INSTALL.md`、`INSTALL.md`、`SECURITY`/隐私相关文档（如有）。

## 内容要求

- 将「**单条**网络请求」的限定改为「**一条或多条**你选中的网络请求」。
- 在「你的控制权」/数据使用章节明确：多选批量复制为**用户显式点击**触发（`Ctrl/Cmd`/`Shift` 选择 + 「复制选中(N)」），
  单次可复制**多条**；**单条复制仍为默认与主要场景**。
- 保持既有的「仅在 DevTools 内存 / 不外传 / 不收集不存储不传输」声明不变（与 `check-zero-network` 一致）。
- 与 `USAGE.md` §7/§12、实现行为逐条对齐（`DEL` 侧一致性）。

## 验收

- [ ] 断言：`extension/privacy.html` 不再含「**单条**网络请求」的单条限定；出现「一条或多条你选中的请求」表述。
- [ ] 断言：含「多选批量复制为显式点击触发、单次可复制多条、单条仍为默认主场景」说明。
- [ ] 断言：与 `docs/USAGE.md` §7/§12 的覆盖声明及 `extension/**` 实际行为逐条一致（无相互矛盾）。
- [ ] 断言：修订后重跑 `node scripts/package.mjs` → 体积 / 零依赖 / zip 读回 PASS，且发行包内 `privacy.html` 为新版（产物与源码同代）。

## 依赖

- TASK-017（USAGE/INSTALL 覆盖声明已落地，本 TASK 补齐其发行文档侧的最后一处不一致）。
