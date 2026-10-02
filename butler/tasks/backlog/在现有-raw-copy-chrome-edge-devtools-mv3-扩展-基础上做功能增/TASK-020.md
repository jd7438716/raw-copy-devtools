---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-012, TASK-016
agent: butler-tester
estimate: M
weight: heavy
covers: REQ-012 REQ-022 REQ-023 AC-007 AC-014 AC-015
---

# TASK-020: 回归基线在当前源码上复跑（冻结契约 + 全量回归 + 门禁 + 打包/三路径）

<!-- butler:covers REQ-012 REQ-022 REQ-023 AC-007 AC-014 AC-015 -->

> 收敛·执行后补齐新增（第 2 轮；不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

被 **独立安全审计报告** 标为「未完成（测试证据不同代）」：`butler/spec/<slug>/sec-audit.md`
（TASK-019）在其 **degradations（severity: MEDIUM）** 与 **§11 未覆盖清单第 9 项** 中明确：

> 「测试证据引用 `test-results.md`（TASK-012，264/264 PASS，mtime 13:11），其时间早于 13:38 的
> `panel.js`（G-1 修复）变更 → **该变更未经测试基线复跑**。已列入未覆盖清单（§11.9）并建议
> **回交 TASK-012/验证链补跑**。」

可核验的磁盘佐证（本次复扫）：

- `butler/spec/<slug>/test-results.md`（TASK-012 终局）其冻结契约证据对应**更早的源码代**：
  解压后总体积 `139364 B`、`dist/raw-copy-1.1.0.zip` sha256 `24c2089a…`、`panel.js` 未含 G-1 修复。
- 当前源码已再次前进：`extension/panel.js` mtime **13:49**、`dist/raw-copy-1.1.0.zip` mtime **13:50**（42644 B）；
  `sec-audit.md` §6.3/§7.2 记录其审计时代码为 `139447 B` / sha256 `6f2514a9…`。
- 即：**TASK-012「冻结契约守护 + 基线全量回归」的产出证据，对当前源码不再同代** → `AC-007 / AC-014 / AC-015`
  与其承载的 `REQ-012 / REQ-022 / REQ-023` 的「当前源码通过」结论未被正式重产。
- 运行侧：`run_muqg8hsx_j7mhsr` 中 `tester` 节点仍 `pending`（`execute` 超时后验证链阻断），本回归门从未在新源码上由 `butler-tester` 正式复跑。

## 目标

在**当前源码**上复跑 TASK-012 的全部契约与回归，重新产出 `test-results.md`（覆盖写），使 `AC-007 / AC-014 / AC-015` 的 PASS 与当前源码同代。

## 涉及文件（只读验证，不改业务代码；产出覆盖 `test-results.md`）

- 冻结对象（只读，**禁改**）：`extension/src/selection.js`、`extension/src/formatter.js`。
- 回归基线（只读）：`tests/**/*.test.mjs`（当前 14 文件 / 264 用例）。
- 门禁脚本（只读，复跑）：`scripts/{check-syntax,check-manifest,check-zero-network,check-panel-shell,package}.mjs`。
- 产出：`butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/test-results.md`（覆盖写）。

## 验证清单（逐条绑定 AC / REQ）

- [ ] **冻结契约**：`selection.js` / `formatter.js` SHA256 与上一里程碑期望值逐字节一致（`0ee06d95…` / `c6504a45…`），mtime < 增强开始（12:28）→ 证明未被触碰。
- [ ] **AC-007 / REQ-012**：单选复制输出与基线 golden 用例逐字符一致（`formatter.test.mjs` 24 + `selection.test.mjs` 13）。
- [ ] **AC-015 / REQ-012**：全量回归 `node --test "tests/**/*.test.mjs"` → 0 失败（当前 264 用例）。
- [ ] **AC-014 / REQ-022 / REQ-023**：三路径（单选 / 批量 / 明细）对大响应 / 二进制 / Base64 的占位与解码规则逐字符一致，无新截断 / 不美化。
- [ ] **AC-016 关联门禁**：4 门禁脚本 + `package.mjs`（体积 < 200KB、零第三方依赖、zip CRC 读回）在当前源码上 PASS。
- [ ] **产物同代**：打包 `dist/raw-copy-1.1.0.zip` 的 mtime ≥ `max(extension/** mtime)`（消除 RISK-REL-01 的复发条件）。
- [ ] 若复用 TASK-016 已复验的 `264/264` 结论，须显式核验其运行时刻晚于当前 `panel.js` mtime；否则必须重跑。

## AC 引用

- **AC-007**：单选复制输出与基线 golden 用例逐字符一致。
- **AC-014**：大响应阈值提示、二进制标注、Base64 处理规则与基线一致（含批量「一次确认」与明细复用 `classifyBody`）。
- **AC-015**：现有基线用例（捕获 / 过滤 / 虚拟滚动 / 单选 / 单条复制 / 剪贴板）全部回归通过。
- 关联 **REQ-012**（单选逐字符不变）、**REQ-022**（响应体字符级保真）、**REQ-023**（大响应/二进制/Base64 规则不变）。

## 验收

- [ ] `test-results.md`（覆盖写）标注 `scope`、`command`、`outcome`，并记录**当前源码**的 mtime / sha256 作为证据基准。
- [ ] 全部断言 PASS（任一失败即触发 design §9.1 回退条件）。
- [ ] 未改动 `extension/**` 源码、`tests/**` golden、门禁脚本。

## 依赖

- TASK-012（回归口径与冻结契约来源）；TASK-016（其 G-1 修复引入了 `panel.js` 变更，是本复跑的触发因）。
- **执行顺序提示**：若与本轮新 TASK-021（`extension/privacy.html` 修订）同批执行，请让 TASK-020 在 TASK-021 **之后**复跑打包，避免再次产生「发行产物与源码不同代」（RISK-REL-01）。
