---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-014
depends-on: TASK-001, TASK-002, TASK-013
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次十四（打包 ZIP + 完整源码 + 体积/零依赖）
covers: [DEL-015, DEL-016, REQ-031, REQ-032, AC-017]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-015/DEL-016/REQ-031/REQ-032/AC-017）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§7.1/§9/§11）
---

# TASK-014: 打包 ZIP + 完整源码 + 体积 / 零依赖护栏

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖打包与源码交付物。

## 涉及文件
- `dist/raw-copy-extension.zip`（**new** — 可被 Chrome/Edge 以「加载已解压」方式安装）
- 完整源码树（**new/既有** — 可复现，含全部源码与资源；不含多余文件）

## 实现要点
1. ZIP 结构可直接 `load unpacked`：含 `manifest.json` 于根。
2. 完整源码 = ZIP 内容 + 源码文件（两者对齐，无缺失/多余）。
3. 体积核验：明确口径（ZIP 压缩后 / 解压后），目标 < 200KB（REQ-031 / AC-017）。
4. 零第三方运行时依赖：非 `chrome.*`/浏览器原生 API 的 import 集合为空（REQ-032）。

## AC 引用
- **DEL-015**：打包后的扩展 ZIP。
- **DEL-016**：完整源码。
- **REQ-031**：扩展包体积 < 200KB。
- **REQ-032**：零第三方运行时依赖，纯原生 JavaScript。
- **AC-017**：体积 < 200KB；零第三方依赖；纯原生 JS。

## 验收
- [ ] ZIP 解压后可直接安装，包内无多余/缺失文件
- [ ] 体积测量 < 200KB（口径明确）；依赖审计 = 0
- [ ] build: 打包脚本/步骤可复现；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-015 DEL-016 REQ-031 REQ-032 AC-017 -->
