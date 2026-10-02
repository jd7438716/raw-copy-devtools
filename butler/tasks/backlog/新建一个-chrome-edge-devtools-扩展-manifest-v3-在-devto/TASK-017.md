---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-017
depends-on: TASK-001, TASK-015
agent: butler-e2e-verifier
estimate: M
weight: heavy
phase: ⑤ 收敛·执行后补齐 / 批次十六（浏览器级 E2E 双端安装与可见行为验证）
covers: [AC-018]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（AC-018 / REQ-030）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/captain-execution.md（§6 未完成项）
  - tests/test-cases.md（TC-AC-018 / E2E-01..E2E-16）
  - butler/memory/qa-strategy.md（§5 遗留 / 待 E2E）
  - dist/raw-copy-1.0.0.zip（DEL-015，可选安装源）
---

# TASK-017: 浏览器级 E2E — Chrome/Edge 双端安装与可见行为验证

> **收敛追补说明（只增不改）**：本 TASK 由 `converge`（执行后补齐）节点**追加**，**不修改/删除任何既有 TASK、不改动任何源码**。
> 追加动因：执行后 `captain-execution.md` §6「未完成项 / 非阻塞遗留」明确把
> **「浏览器级 E2E（AC-018 双端 Chrome/Edge 安装冒烟、E2E-01..16）」标为「环境无 GUI 浏览器，未执行」**；
> 同时 `tests/test-cases.md` 中 **TC-AC-018** 状态为 `⏳ 待 E2E`、`butler/memory/qa-strategy.md` §5 将
> **AC-018** 列为「只能真实 E2E」的遗留。AC-018 虽已被 TASK-001 的 `covers` 覆盖（**实现侧**），
> 但**验证侧从未执行** → 命中「被测试/执行报告标为未完成」判据，故追加本验证 TASK。

## 目标
在真实 GUI Chromium 浏览器中补做 **AC-018**：在**最新版 Chrome 与 Edge** 分别以「加载已解压的扩展」
（优先 `extension/`，亦可解压 `dist/raw-copy-1.0.0.zip`）安装并跑通双端冒烟，确认面板注册、捕获、复制可用；
产出可复跑的 E2E 证据，闭合执行阶段唯一被显式标为「未完成」的验收项。

## 涉及文件
- `tests/e2e/AC-018-chrome-edge.md`（**new** — 双端 E2E 执行记录：浏览器名+版本、步骤、结果、证据）
- （**只读**）`extension/**`、`dist/raw-copy-1.0.0.zip`、`tests/test-cases.md §3`（E2E-01..16）

## 实现要点
1. **Chrome**：`chrome://extensions` → 开发者模式 → 加载已解压 `extension/` → 打开 DevTools，确认独立 `Raw Copy` 面板出现（对齐 E2E-01 / TC-AC-001）。
2. **Edge**：`edge://extensions` → 同理加载 → 确认面板出现且基本可用（E2E-16）。
3. 双端各跑**最小复制冒烟**：选单条请求 → 点击复制 → 粘贴比对逐字符一致（E2E-05，模式 A 默认）。
4. 记录：浏览器名称与版本、加载是否零错误、面板是否并列可见、复制是否成功、任何差异/偏差。
5. 若环境仍无 GUI 浏览器 → **如实标注 `BLOCKED(no-gui)`** 并保留可复跑步骤证据，**不得以单元测试冒充**浏览器级结论。

## AC 引用
- **AC-018**：在最新版 Chrome 与 Edge 均可正常安装与使用（REQ-030）。
- 关联（只读回归，不新增 `covers`）：AC-001 面板并列、AC-002 实时捕获、AC-011 复制提示。

## 验收
- [ ] Chrome 加载 `extension/` 无错误，DevTools 出现独立 `Raw Copy` 面板
- [ ] Edge 加载 `extension/` 无错误，DevTools 出现独立 `Raw Copy` 面板
- [ ] 双端各完成一次单条复制且粘贴内容正确（逐字符比对）
- [ ] `tests/e2e/AC-018-chrome-edge.md` 记录浏览器版本 / 步骤 / 结果 / 证据（或 `BLOCKED(no-gui)`）
- [ ] build: N/A；test: E2E（非单元）；**不得修改任何源码**

## 备注 / 约束
- 本 TASK 为**验证类**：禁止改动 `extension/**` 源码；若发现实现缺陷，另立修复 TASK（不改本 TASK）。
- `weight.json` 未同步新增 TASK-017（本轮只增不改、不触碰既有 TASK / 权重文件）；本 TASK 按安全/兼容门禁相关
  （AC-018 属 `weight.json` `notes.heavy` 注记中的「权限门禁 AC-009/AC-018」）设为 `heavy`，与强制回归口径一致。

<!-- butler:covers AC-018 -->
