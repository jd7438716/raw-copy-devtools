---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-010
depends-on: TASK-002
agent: butler-doc-writer
estimate: S
weight: light
phase: ⑤ 收敛·执行后补齐 / 批次十（安装 + 使用说明）
covers: [DEL-011, DEL-012]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-011/DEL-012）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§11）
---

# TASK-010: 安装说明 + 使用说明

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖文档类交付物。

## 涉及文件
- `INSTALL.md`（**new** — 安装说明：Chrome/Edge 打开 chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选目录；适用浏览器/版本）
- `USAGE.md`（**new** — 使用说明：打开 DevTools → 选择 Raw Copy 面板 → 搜索/过滤 → 点击或键盘选中 → 复制 → 模式 A/B 切换）

## 实现要点
1. 安装步骤可复现，注明 load unpacked 流程与目标浏览器（Chrome/Edge）。
2. 使用说明覆盖 checklist B 段要求的全部操作：打开面板/搜索/过滤/选中/复制/模式切换。
3. 中文优先，步骤带预期现象。

## AC 引用
- **DEL-011**：安装说明文档。
- **DEL-012**：使用说明文档。

## 验收
- [ ] `INSTALL.md` / `USAGE.md` 均存在
- [ ] 内容级判据：安装步骤可复现；使用说明覆盖 6 类操作
- [ ] build: N/A；test: N/A（纯文档）

<!-- butler:covers DEL-011 DEL-012 -->
