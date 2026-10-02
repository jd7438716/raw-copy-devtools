# 学习记录 — butler-doc-writer

> 首次运行: 2026-10-02 ｜ rounds: 1 ｜ level: novice

## rounds 日志

| # | 日期 | 任务 | 产出 | 结果 |
|---|------|------|------|------|
| 1 | 2026-10-02 | TASK-010 安装说明 + 使用说明（DEL-011/DEL-012） | `INSTALL.md`、`USAGE.md`（+ `docs/` 镜像） | ✅ 全部关键词/占位符/一致性自检通过 |
| 2 | 2026-10-02 | TASK-015 里程碑 + 交付物齐全验收（DEL-018/AC-019） | `docs/MILESTONES.md`、`docs/DELIVERABLES-CHECKLIST.md` | ✅ 8/8 交付物逐项真实 shell 验证通过（17/17+11/11+17/17+34/34+123/123+体积 PASS） |
| 3 | 2026-10-02 | TASK-008 边界定义文档修订（DEL-007/008/009，AC-012） | `design.md`/`feasibility.md`/`stories-written.md` + 追加 `tech-evaluation.md` 就地修订 + `（2026-10-02 修订）` 印记 | ✅ getContent 升为常规路径、取正文列为必达；同步清理四个文件残留占位/备选表述，语义与 capture/store/panel 实现一致 |
| 4 | 2026-10-02 | TASK-017 使用/安装文档补齐 + 需求覆盖声明（REQ-024/DEL-008/AC-017，TASK-014 残项） | `docs/USAGE.md`、`docs/INSTALL.md` + 根镜像 `USAGE.md`、`INSTALL.md` | ✅ USAGE 11 节→15 节（新增右键/多选/双击/需求覆盖声明四节，均保留既有节）；INSTALL 版本 bump 1.1.0 + reload unpacked + 权限复核；4 项关键词 grep 通过；`cmp`+sha256 证明 docs 与根镜像逐字节一致 |
| 5 | 2026-10-02 | TASK-018 测试文档固化（DEL-007/AC-015，TASK-013 残项） | `tests/test-cases.md`（§1b 三组 + 边界 + AC-015 口径 + E2E 指针 + 计数修正）、`tests/README.md`（14 文件表 + 4 门禁 + E2E 节）、4 测试文件头注释 covers | ✅ 实测 264 pass/14 文件；门禁 17/17+15/15+17/17+34/34；4 项 grep 验收通过 |

## 经验

- 面向用户的文档以「操作步骤 + 预期现象」成对书写，可照做性最高。
- 当设计真源路径与收敛任务路径冲突时：以任务显式路径为主，镜像一份到规范路径兜底。
- 站在用户视角区分「核心能力」与「可选/P2 能力」，后者显式降级标注，避免过度承诺。
- 逐字符输出契约（英文标记）在中文文档中保持原样，绝不本地化。
- **修订边界定义时，锚点行只是「主目标」；必须全文件扫描同类残留**（TASK-008 中 `stories-written.md` CLOSURE_6 / GAP-3、`design.md` §10.5 均含同类「缺失即占位」表述，仅按行号改会留下复发隐患）。

## needs

- （暂无）
