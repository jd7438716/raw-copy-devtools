---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-013
depends-on: N/A
agent: butler-developer
estimate: S
weight: light
phase: ⑤ 收敛·执行后补齐 / 批次十三（图标资源）
covers: [DEL-017]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-017）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§7.2/§11）
---

# TASK-013: 图标资源 icons（16/32/48/128）

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖图标交付物。

## 涉及文件
- `icons/icon16.png`、`icons/icon32.png`、`icons/icon48.png`、`icons/icon128.png`（**new**）

## 实现要点
1. 提供 4 个尺寸 PNG，风格统一。
2. `manifest.json` 的 `icons` 与 `action.default_icon`（如有）指向这些文件。
3. 图标体积纳入 <200KB 总体积核算。

## AC 引用
- **DEL-017**：图标资源 icons（16/32/48/128）。

## 验收
- [ ] 四个尺寸图标文件均存在且能被 manifest 正确引用
- [ ] build: N/A；test: N/A

<!-- butler:covers DEL-017 -->
