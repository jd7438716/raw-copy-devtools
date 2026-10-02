---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-007
depends-on: TASK-006
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次七（Clipboard + 降级 + Toast）
covers: [DEL-007, REQ-025, REQ-034, AC-011, AC-022]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-007/REQ-025/REQ-034/AC-011/AC-022）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.9/§7.3）
---

# TASK-007: Clipboard 写入 + 降级链 + Toast 提示

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖剪贴板写入与提示交付物。

## 涉及文件
- `clipboard.js`（**new** — `navigator.clipboard.writeText` 优先，失败降级 `document.execCommand('copy')`）
- `panel.js` / `panel.css`（**edit** — 接线复制按钮与 Toast 展示）

## 实现要点
1. 首选 `navigator.clipboard.writeText(text)`；因焦点/权限失败时降级 `document.execCommand('copy')`（REQ-036）。
2. 两条路径均失败 → 明确失败提示（原因）。
3. 成功 → Toast「已复制到剪贴板」；失败 → Toast 显示原因。
4. 内容不经任何网络传输。

## AC 引用
- **DEL-007**：Clipboard 写入 + 降级 + Toast 提示模块。
- **REQ-025**：复制成功/失败提示；内容不经网络传输。
- **REQ-034**：可靠性——存在可用降级路径 + 失败必有提示（feasibility 建议的可验收重述）。
- **AC-011**：复制成功显示明确提示；失败显示原因。
- **AC-022**：降级路径可被触发且成功，异常均有提示。

## 验收
- [ ] `clipboard.js` 存在，含两条写入路径
- [ ] 降级注入测试：primary 失败时 execCommand 成功且 Toast 正确
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-007 REQ-025 REQ-034 AC-011 AC-022 -->
