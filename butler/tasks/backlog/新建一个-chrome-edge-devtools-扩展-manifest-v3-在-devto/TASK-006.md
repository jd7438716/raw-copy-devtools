---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-006
depends-on: TASK-005
agent: butler-developer
estimate: L
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次六（复制拼接核心 · 保真）
covers: [DEL-006, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, AC-005, AC-006, AC-007, AC-014, AC-015, US-001, US-002, US-003, US-004]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-006/REQ-014..020/AC-005..007/AC-014/AC-015/US-001..004）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.4/§5.5/§5.6/§5.7/§4）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/feasibility.md（R8 保真语义张力）
---

# TASK-006: 复制拼接核心（请求 + 响应原文，模式 A/B，保真约束）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖整条产品价值的核心——单条请求+响应的原文拼接。四类用户故事（US-001..004）均汇聚于此。

## 涉及文件
- `copy-builder.js`（**new** — 纯函数：`buildCopy(entry, mode)`，模式 A/B 拼接，保真）
- `panel.js`（**edit** — 接线复制按钮调用 copy-builder）

## 实现要点
1. **单条隔离**：只处理当前选中条目，**绝不**附加其他请求（REQ-014 / AC-006）。
2. 请求部分：方法 / 完整 URL / HTTP 版本（缺失回退 `HTTP/1.1`）/ 请求头（原始顺序，每行 `Name: Value`）/ 请求体（原始文本）。
3. 响应部分：状态码 / 状态文本 / 响应头（原始顺序）/ 响应体（原始文本）。
4. 模式 A（默认）：在正文外加 `===== REQUEST =====` / `===== RESPONSE =====` 标题段；**body 逐字符原样，不加/删/改任何字符**（feasibility R8）。
5. 模式 B：纯原始模式，无标题直接拼接。
6. 禁止格式化：不解析 JSON、不缩进/换行/排序、不压缩、不改字符、不转 Markdown、不截断（REQ-020 / AC-007）。
7. 元信息（开始时间/总耗时/资源类型/MIME）仅放标题段，不干扰正文（REQ-017）。

## AC 引用
- **DEL-006**：复制拼接模块（请求+响应，模式 A/B，保真约束）。
- **REQ-014**：只复制当前选中单条。
- **REQ-015**：请求部分字段与 HTTP 版本回退。
- **REQ-016**：响应部分字段。
- **REQ-017**：可选元信息放标题段。
- **REQ-018**：模式 A 简单格式化（默认，带标题）。
- **REQ-019**：模式 B 纯原始。
- **REQ-020**：禁止任何格式化/截断。
- **AC-005**：复制内容含请求与响应全部字段。
- **AC-006**：复制内容不含其他请求（单条隔离）。
- **AC-007**：JSON 响应体逐字符一致。
- **AC-014**：头原始顺序，body 不美化。
- **AC-015**：两种复制模式。
- **US-001..US-004**：四类用户故事的复制诉求。

## 验收
- [ ] `copy-builder.js` 存在且为纯函数；模式 A/B 均可输出
- [ ] 逐字符对比样例通过（JSON 原样、单条隔离）
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-006 REQ-014 REQ-015 REQ-016 REQ-017 REQ-018 REQ-019 REQ-020 AC-005 AC-006 AC-007 AC-014 AC-015 US-001 US-002 US-003 US-004 -->
