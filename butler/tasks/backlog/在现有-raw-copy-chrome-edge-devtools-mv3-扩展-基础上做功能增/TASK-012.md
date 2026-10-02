---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-003, TASK-005, TASK-007, TASK-009
agent: butler-tester
estimate: M
weight: heavy
covers: REQ-012 REQ-022 REQ-023 AC-007 AC-014 AC-015 US-004
---

# TASK-012: 冻结契约守护 + 基线全量回归（保真门禁）

<!-- butler:covers REQ-012 REQ-022 REQ-023 AC-007 AC-014 AC-015 US-004 -->

## 目标
验证增强**未触碰**冻结模块、单选复制逐字符不变、既有基线用例全量回归通过、大响应/二进制/Base64 规则不漂移。

## 涉及文件
- 验证对象（只读，**禁改**）：`extension/src/selection.js`、`extension/src/formatter.js`
- 回归基线（只读）：`tests/*.test.mjs`（既有全部测试文件，当前 10 个）

## 冻结/禁止
- **禁止修改** `extension/src/selection.js` / `extension/src/formatter.js`（ADR-012；`git diff` 必须无输出）。
- **禁止修改** 既有 `tests/{selection,formatter}.test.mjs` golden 用例（reference-only）。

## 判定
- 冻结校验：`git diff -- extension/src/selection.js extension/src/formatter.js` → **无输出**。
- 单选 golden：`tests/formatter.test.mjs`（24 用例）逐字符 PASS；`tests/selection.test.mjs`（13 用例）PASS。
- 全量回归：`node --test tests/*.test.mjs` → 0 失败。
- 大响应/二进制/Base64：经**单选复制 / 批量复制 / 明细查看**三条路径处理规则与基线一致（占位标注/解码规则不变），不出现新截断或格式化。

## AC 引用
- **AC-007**：单选复制输出与基线 golden 用例逐字符一致。
- **AC-014**：大响应阈值提示、二进制标注、Base64 处理规则与基线一致（含批量"一次确认"与明细复用 `classifyBody`）。
- **AC-015**：现有基线用例（捕获/过滤/虚拟滚动/单选/单条复制/剪贴板）全部回归通过。
- 关联 REQ-012（单选不变）、REQ-022（字符级保真）、REQ-023（大响应/二进制/Base64 规则不变）、US-004。

## 验收
- [ ] test: PASS（`node --test tests/*.test.mjs`，0 失败）
- [ ] build: PASS（`node scripts/check-syntax.mjs`）
- [ ] 断言：`git diff` 冻结两文件无输出
- [ ] 断言：三路径（单选/批量/明细）对大响应/二进制/Base64 规则一致
- [ ] 失败即触发回退条件（design §9.1）

## 依赖
- 全部功能接线 TASK 完成后收口（TASK-003/005/007/009）。
