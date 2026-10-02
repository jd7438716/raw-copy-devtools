---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
task: TASK-008
depends-on: TASK-006
agent: butler-developer
estimate: M
weight: standard
phase: ⑤ 收敛·执行后补齐 / 批次八（大响应/二进制/Base64）
covers: [DEL-008, REQ-021, REQ-022, REQ-023, REQ-024, AC-010]
refs:
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/spec.json（DEL-008/REQ-021..024/AC-010）
  - butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md（§5.8）
---

# TASK-008: 大响应 / 二进制 / Base64 处理逻辑

> **收敛追补说明（只增不改）**：由 `converge` 节点追加；覆盖响应体边界处理交付物。

## 涉及文件
- `body-policy.js`（**new** — 阈值判定 + 二进制标注 + Base64 按 MIME 解码/省略）
- `panel.js`（**edit** — 接线大响应确认与省略标注）

## 实现要点
1. 文本响应默认完整复制（REQ-021）。
2. 响应超阈值（默认 10MB，常量可配）→ 提示用户是否继续复制（REQ-022）。
3. 二进制响应不复制内容，标注 `[Binary content omitted: <mime>, <bytes> bytes]`（REQ-023）。
4. Base64 响应：文本类 MIME 尝试 UTF-8 解码；否则标注 `[Base64 content omitted: length N]`（REQ-024）。
5. 边界：恰好等于/略超阈值（10MB、10MB+1）行为一致可判定。

## AC 引用
- **DEL-008**：大响应/二进制/Base64 处理逻辑。
- **REQ-021**：文本响应默认完整复制。
- **REQ-022**：超阈值提示是否继续。
- **REQ-023**：二进制省略标注格式。
- **REQ-024**：Base64 按 MIME 判定。
- **AC-010**：大响应提示、二进制省略、Base64 按 MIME。

## 验收
- [ ] `body-policy.js` 存在；三类用例（大响应/二进制/Base64）判定正确
- [ ] 阈值边界（=10MB、10MB+1）行为确定
- [ ] build: N/A；test: 由 TASK-011 用例覆盖

<!-- butler:covers DEL-008 REQ-021 REQ-022 REQ-023 REQ-024 AC-010 -->
