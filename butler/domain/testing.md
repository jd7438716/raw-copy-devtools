# 测试领域知识

> 主写: butler-qa | 也读: butler-tester, butler-captain, butler-rf-fixer
> 最后更新: 2026-07-08

## 约定

- Butler 作为 OpenCode 工具，测试验证通过 Phase 6.5 验证门强制执行
- Captain 自述 [goal:complete] 后需独立验证 (butler-exec 验证门)
- 验证门检查: lint: PASS|SKIP, build: PASS, test: PASS — 三项不全 = 无效

## 发现

- (2026-07-07) [extracted from project/KNOWLEDGE.md] S1: 无完成屏障 — TASK 模板仅 3 项检查 `[ ] build / test / review`，无 DoD 清单
- (2026-07-07) [extracted from project/KNOWLEDGE.md] 07-tasks.md 中的验证步骤常被标记"高工作量"后跳过
- (2026-07-07) [extracted from project/KNOWLEDGE.md] DA04: 需匹配 .skip/.only 等测试变体模式
