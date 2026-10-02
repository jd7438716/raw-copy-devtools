---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-009
depends-on: TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007
agent: butler-e2e-verifier
estimate: M
weight: standard
phase: 修复·方案A（真机 E2E 字符级验证 CE-4）
covers: [AC-002, AC-011]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（AC-002 / AC-011）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§0.2 复现基线 / CE-4 / §10.3）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · 真机验证）
---

# TASK-009: 真机 E2E 字符级验证（401 登录请求，CE-4）

> 01-root-cause CE-4：修复后须做**真实 Chrome/Edge 字符级**验证；这是 AC-002 的最终裁决面。

## 涉及文件
- `butler/results/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/e2e-enrich-401.md`（新增，验证报告）

## 实现要点
1. 以 unpacked 方式加载 `extension/` 到 Chrome/Edge（DevTools 面板 Raw Copy）。
2. 访问 `https://auth.autional.cn`，在面板选中 `POST https://auth.autional.cn/bff/identity/api/v1/auth/login`
   （响应 `http/2.0 401`、`content-length: 395`、`content-type: application/json; charset=utf-8`）。
3. 点击「复制请求 + 响应（原始）」，断言 `[Response Body]` 为**真实 JSON 正文**（非「（响应体不可用）」），
   与 DevTools 网络面板正文**逐字符相等**（不美化、不截断）。
4. **无网络/站点不可达时的降级**：改用本地 fixture 服务器复刻同一 401 响应（同头同正文）执行同等断言；
   在报告中明确标注降级路径与原因。
5. **回归确认（AC-011）**：运行全量单测，除 TASK-005 修正的错误断言外全绿、无回归（测试命令经 **butler-tester**）。
6. 报告输出：环境/步骤/预期/实测/逐字符比对证据（含截图或复制文本哈希）/结论 PASS|FAIL。

## 追溯（covers）
- **AC-002**：真实 Chrome/Edge 对 401 登录请求复制，`[Response Body]` 与网络面板正文逐字符相等，不再出现占位。
- **AC-011**：现有测试（除被修正的错误断言外）保持全绿，无回归。

## 验收
- [ ] 真机（或本地 fixture 降级）401 正文逐字符相等，无占位
- [ ] 全量单测无回归（butler-tester 出具结果）
- [ ] `e2e-enrich-401.md` 落盘，结论 PASS；失败则给可复现证据
- [ ] build: N/A；lint: N/A

<!-- butler:covers AC-002 AC-011 -->
