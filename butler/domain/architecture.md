# 架构领域知识

> 主写: butler-architect | 也读: butler-sa, butler-pm, butler-captain, butler-tech-eval
> 最后更新: 2026-07-08

## 约定

### 核心架构规则 (来自 ARCHITECTURE.md)
1. 零外部依赖：不连 Plane、不连 API、不连数据库
2. 纯文件通信：所有 agent 通过 butler/ 目录下的文件交换信息
3. 通用自适应：agent 从 butler/knowledge/ 读取项目特定约定
4. 4 模式链路：butler / butler-full / butler-analyze / butler-exec / butler-init 各司其职
5. Goal 契约：[goal:complete] / [goal:blocked] / [goal:evidence]
6. 双轨制知识记忆：Knowledge 稳定项目级，Memory 动态会话级
7. 宪法共享：butler/CONSTITUTION.md 全员必读
8. Cynefin 分类：Clear / Complicated / Complex / Chaotic

### 分层架构 (任务硬边界增强)
- 工具层: butler-diff-analyzer.ts (绕过检测)
- 插件层: butler-analysis.ts (Phase 6.5 验证门), butler-async.ts (session 采集)
- Agent 层: butler-captain (gits 生成), butler-exec (验证门), butler-strategist (级联清单)
- 运行时产物: TASK-N.verdict (验证门结果), memory/{agent}/auto/ (自动采集)

### 异步增强分层
- 工具层: butler-bg.ts (命令级异步)
- 插件层: butler-async.ts (会话心跳+超时检测)
- Agent 层: 并行派发 + 3轮自动重试

## 发现

- (2026-07-07) [extracted from project/KNOWLEDGE.md] S3: 无级联影响审查 — captain/rf-fixer/cr-reviewer prompt 中"级联"=0 匹配
- (2026-07-07) [extracted from project/KNOWLEDGE.md] CASCADE_IMPACT 4 字段清单: TARGET/CHANGE_TYPE/AFFECTED/IMPACT
