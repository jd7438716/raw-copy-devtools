---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-001 TASK-003 TASK-004 TASK-006 TASK-007 TASK-008 TASK-009 TASK-010 TASK-011
agent: butler-tester
estimate: M
weight: heavy
covers: REQ-010 REQ-011 REQ-013 AC-011 AC-012 AC-015
---

# TASK-016: 约束门禁校验 + 全量回归基线（264/264 不回归）

<!-- butler:covers REQ-010 REQ-011 REQ-013 AC-011 AC-012 AC-015 -->

## 目标
在 ①②③ 与回归网改动落定后，执行约束门禁与全量回归：确认 MV3 / 仅 `clipboardWrite` / 零依赖 / 零网络 / 字符级保真不变、体积门禁不受影响，且基线 **264/264** 除有意更新外无回归。

## 涉及文件
- （验证任务，无源码变更；产出报告到 `butler/results/` 或 TASK 提到的工作目录）

## 冻结/禁止
- 只读验证，不改业务代码；发现问题回退对应 TASK。
- 不得通过放宽门禁/跳过用例来「通过」。

## 实施要点
1. 权限/零网络门禁：
   - `node scripts/check-manifest.mjs`（`manifest_version===3`；`permissions` 仅 `clipboardWrite`；无 `host_permissions`/`tabs`/`webRequest` 等）。
   - `node scripts/check-zero-network.mjs`（无 fetch/XHR/WebSocket/storage/遥测）。
2. 零依赖/语法/体积：`node scripts/check-syntax.mjs`；确认无第三方依赖、发行体积门禁 <200KB（打包由 TASK-015 最终执行）。
3. 全量回归：`npm test`（`node --test "tests/**/*.test.mjs"`）→ 记录基线 264 + 新增用例数，逐项确认除有意更新外全绿。
4. 字符级保真：确认 `tests/formatter.test.mjs` / `content` / `detail` 等冻结契约用例全绿（AC-012）。
5. 产出回归报告：改动文件清单、门禁结果、测试通过/失败明细、剩余风险。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| REQ-010 | 校验 MV3 / 零第三方依赖 / 仅 clipboardWrite / 零网络保持 |
| REQ-011 | 校验字符级保真与大响应/二进制/Base64 规则不变；体积门禁不受影响 |
| REQ-013 | 执行完整回归网（单元 + 面板接线 + golden + E2E 已由上游 TASK 补齐） |
| AC-011 | manifest 仅 clipboardWrite、无 host_permissions、无网络；零依赖/零网络校验通过 |
| AC-012 | 响应体字符级保真不变（既有 content/formatter 契约用例全绿） |
| AC-015 | 现有测试（除有意更新用例）保持全绿，基线 264/264 无回归 |

## 验收
- [ ] `check-manifest.mjs` PASS
- [ ] `check-zero-network.mjs` PASS
- [ ] `check-syntax.mjs` PASS
- [ ] `npm test` 全绿（或有意的用例更新已登记）
- [ ] 回归报告产出，无未解释失败

## 备注
- 依赖 ①（TASK-003/004）、②（TASK-006/007/009）、③（TASK-008）、门禁（TASK-011）、E2E（TASK-010）。
- 本 TASK 通过是 TASK-015（发行打包）的前置条件。
