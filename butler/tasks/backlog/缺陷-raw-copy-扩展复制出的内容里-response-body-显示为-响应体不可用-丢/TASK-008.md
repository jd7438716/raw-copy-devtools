---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
task: TASK-008
depends-on: N/A
agent: butler-doc-writer
estimate: M
weight: light
phase: 修复·方案A（边界定义文档修订）
covers: [DEL-007, DEL-008, DEL-009, REQ-010, AC-012]
refs:
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/spec.json（DEL-007..009 / REQ-010 / AC-012）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/02-solution-design.md（方案 A · design.md:243,319,337 / feasibility.md:77 / stories-written.md:156-158,497-500）
  - butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md（§9 RC-2 / §10.4）
---

# TASK-008: 文档边界修订（design.md / feasibility.md / stories-written.md）

> RC-2 修复：把「无 content.text → 响应体不可用」的降级定义改为「getContent 为常规路径、取正文为必达」，
> 防止后续开发再次降级为占位（AC-012）。

## 涉及文件
- `butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/design.md`
  - ADR-003 `:243`：「捕获回调内同步读取」→ 修正为「捕获后独立异步 enrich，getContent 双形态」
  - `:319`：getContent 由「备选（不作为常规路径）」→ **常规路径**（正文缺失时的必达步骤）
  - `:337`：降级矩阵——文本类正文缺失 → 必达取回；占位仅限「客观不可获取 / 二进制省略 / 超预算降级」
- `butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/feasibility.md`
  - 风险 R1 `:77`：缓解措施补入 `getContent` 兜底 + 字节预算
- `butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/stories-written.md`
  - `:156-158` / `:497-500`：验收期望由「可接受占位」→「必须取到正文（含 401 错误响应）」

## 实现要点
1. 三份文档同步修订，语义与方案 A 实现一致（REQ-010）。
2. 只改边界/期望表述，不修改历史决策的记录性内容；如与实现不一致处明确标注「(2026-10-02 修订)」。
3. 修订后与 `spec.json` REQ/DEL/AC 口径一致，便于 AC-012 机械校验。

## 追溯（covers）
- **DEL-007**：design.md ADR-003 `:243`（同步→异步语义）、`:319`（备选→常规路径）、`:337`（降级矩阵）。
- **DEL-008**：feasibility.md `:77` 风险 R1 缓解措施补入 getContent 兜底。
- **DEL-009**：stories-written.md `:156-158` / `:497-500` 验收期望改为「必须取到正文」。
- **REQ-010**：修正需求/设计边界定义：getContent 升为常规路径、取正文列为必达。
- **AC-012**：文档边界修订（design.md/feasibility.md/stories-written.md）与实现一致。

## 验收
- [ ] 三份文档对应行已完成边界修订，getContent 表述为「常规路径」
- [ ] 占位定义收窄为合法场景；无残留「缺失即接受占位」表述
- [ ] build/test: N/A；lint: PASS（Markdown）

<!-- butler:covers DEL-007 DEL-008 DEL-009 REQ-010 AC-012 -->
