---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-012
depends-on: N/A
agent: butler-doc-writer
estimate: S
weight: light
phase: ⑤ 收敛·执行后补齐 / 批次十二（LICENSE）
covers: [DEL-014]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-014）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§8/§11）
---

# TASK-012: LICENSE 文件（MIT 或 Apache-2.0）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖许可证交付物。

## 涉及文件
- `LICENSE`（**new** — 从 MIT 与 Apache-2.0 中**定死其一**，交付完整许可证全文）

## 实现要点
1. 二选一定死（消除 checklist A 段「MIT 或 Apache-2.0 不可判定」）。
2. 许可证全文完整、年份/版权主体正确。
3. 与 README/package 元信息（如有）保持一致。

## AC 引用
- **DEL-014**：LICENSE 文件（MIT 或 Apache-2.0）。

## 验收
- [ ] `LICENSE` 存在且为唯一确定的许可证（MIT 或 Apache-2.0 之一）
- [ ] 全文完整、无占位符
- [ ] build: N/A；test: N/A（纯文档）

<!-- butler:covers DEL-014 -->
