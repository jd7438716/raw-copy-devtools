---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-005 TASK-007 TASK-008
agent: butler-doc-writer
estimate: S
weight: light
covers: DEL-017 REQ-014
---

# TASK-014: `docs/USAGE.md` + `docs/INSTALL.md` 同步（删分段复制说明，说明 A/B 按钮与批量默认 A）

<!-- butler:covers DEL-017 REQ-014 -->

## 目标
用户文档同步 ②③：删除「仅复制请求 / 仅复制响应」分段复制说明，说明复制模式 A/B 的**独立按钮（动作即模式）**与「批量入口默认模式 A」。

## 涉及文件
- `docs/USAGE.md`（修改）
- `docs/INSTALL.md`（修改）
- （若仓库根 `USAGE.md` / `INSTALL.md` 为同内容镜像，一并同步，保持一致）

## 冻结/禁止
- 不得删除核心「复制请求 + 响应（原始）」与多选批量复制的说明（REQ-009）。
- 不得描述 toggle「先切换再复制」旧交互。

## 实施要点
1. `USAGE.md`：
   - 第 9 节「复制模式切换」改写为「复制模式 A/B（两个独立按钮）」：点 A 按 A 复制、点 B 按 B 复制、默认 A；删除 toggle 描述。
   - 删除「仅复制请求 / 仅复制响应」相关段落（`:224-228` 等）与右键菜单 P2 描述（`:91`）。
   - 多选批量节说明：批量入口按默认模式 A 复制。
2. `INSTALL.md`：同步删除分段复制能力描述（如有）；权限/版本说明保持。
3. 若根目录与 `docs/` 两处文档同源，双写一致。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-017 | `docs/USAGE.md` / `INSTALL.md` 同步删除分段复制说明，说明 A/B 按钮与批量默认 A |
| REQ-014 | 文档修订（USAGE/INSTALL） |

## 验收
- [ ] 文档无「仅复制请求/仅复制响应」操作说明
- [ ] 文档描述 A/B 两个独立按钮与默认 A
- [ ] 核心主项与批量复制说明保留

## 备注
- 依赖 TASK-005/007/008（UI 与交互定稿）。
- 根目录与 `docs/` 镜像若内容不同，以 `docs/` 为准并同步。
