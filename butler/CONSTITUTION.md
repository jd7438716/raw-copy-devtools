# Butler 宪法 — Chrome DevTools 单条请求原始信息一键复制扩展

> 版本: 3.0 | 最后更新: 2026-07-19
> 来源: 合并自 v2.1 系统协议 (全局) + 操作红线 (本地)

---

## §1 系统目标

Butler 是一个 AI Agent 团队系统，用多 Agent + Skill 协作解决问题。

## §1a 知识-记忆-约束体系

本系统采用三层分离的知识-记忆-约束体系:
  - 约束层: Edicts > Decisions > Corrections（分级，高层级优先）
  - 知识层: domain/ > project/ > agent/（稳定性递减）
  - 记忆层: memory/（平铺文件）> auto/ > archived/
  
  详细规范见: butler/knowledge/project/_index.md

## §2 纯文件通信

所有 agent 通过 butler/ 目录下的文件交换信息。不连外部 API/数据库。

## §3 最小权限

每个 agent 只获得完成其任务所需的最小权限。

## §4 质量门禁

所有产出必须经过 butler-sec-scan 安全检查。

## §5 知识回写

每次任务完成后必须反哺 learned.md 和 memory/ 知识。

## §6-§18 (预留)

> D5: §6-§18 已删除空洞占位符。当前宪法活跃章节为 §1-§5 + §0 + §19-§27 + §X-§Z。
> 新增章节前请检查是否与现有 § 号重复。

## §0 知识加载协议 (Setup)

所有 agent Step 0 执行以下通用加载 (在 agent 自己的加载链之后):

1. 读需求目录:
   `ls butler/requirements/` — 了解本冲刺范围
   如有当前需求目录: `ls butler/requirements/` — 了解分析产出
   选择性读与你角色最相关的 2-3 个文件 (不要全读)

2. 读领域知识:
   从项目概述中推导 topic 关键词
   `cat butler/knowledge/domain/{topic}.md 2>/dev/null || true`
   `ls butler/knowledge/domain/` — 无 topic 匹配时读最相关的 domain 文件

3. 读人才档案:
   `cat butler/knowledge/agent/{my_name}/agent_profile.md 2>/dev/null || true`
   (如果不存在 = 首次运行，由 talent-manager 后续创建)

---

## §19 安全红线 (强制)

所有自产的 agent 和 skill 在注册前必须:
  a. 过 butler-sec-scan R1-R10
  b. 扫描结果存入 agent_profile.md#security_history
  c. 任何 REJECT → 不可上线，必须修复后重新扫描
  d. 运行时每 30 天重新扫描一次
  e. 扫描失败或过期 → 标记 [security_review_needed]
  f. 违反本条 → 立即下架，标记 security_hold
  g. 恢复需: 修复问题 → 重新过安全门 → 方可恢复

## §20 学习不引入 (强制)

所有外部资源 (GitHub/社区/开源) 的使用规则:
  a. 只学习，不引入：webfetch 只读，不留外部文件
  b. 学习产出 community_learning_report.md → 标记 community_ref
  c. 学到的模式必须通过制造管线自产
  d. 自产版本必须与参考来源有实质性差异
  e. community_ref 永久保留在 agent_profile.md
  f. 违反此条的 agent/skill → 立即下架 + 安全审计
  g. 恢复需: 清除违规内容 + 重新过安全门 + 老板书面确认

## §21 人才闭环

系统必须维持人才环和技能环的完整闭环:
   缺口识别 → 查找 → 社区学习 → 制造 → 安全门 → 注册 → 执行 → 评分升级
   任何环节断裂 → 标记为 P0 阻塞项
   butler-agent Mode 9 是闭环检查器, 每轮任务完成后触发检查。
   butler-strategist Phase 2.5 触发人才环: @butler-agent Mode 1 + 写 talent-gap-report.md

## §22 Phase 项目阶段协议

每条 Decision/Edict 可绑定项目阶段:
  - [phase:探索期] → 仅在探索期有效
  - [phase:构建期] → 仅在构建期有效
  - [phase:维护期] → 仅在维护期有效
  - 无 [phase:] 标记 → 默认永久有效

阶段转换:
  - 老板说 "进入XX期" → butler-full 更新 current_phase
  - 所有非当前阶段的规则 → 自动追加 [phase_inactive: 当前阶段=X]
  - gate 检查跳过 phase_inactive 条目
  - 阶段切换回旧阶段 → 移除 phase_inactive 恢复生效

### §22a 冲突检测协议

每次更新 CONSTITUTION 后执行冲突检测:
  - 同一维度有多个 Active 决策 → 标记为冲突
  - Edict vs Decision 冲突 → Edict 优先（级别更高）
  - Boss direct > System inference（来源优先级）
  - 最新 > 最旧（时间优先级，同级别时）
  - 安全 > 质量 > 审美 > 视觉 > 交互 > polish（影响等级）
  - 所有冲突 → toast 提示老板裁决 → 不 block 流程

### §22b 知识时效性协议

每条知识必须带日期和来源:
  - (2026-07-14) [来源: Round 12 实现里发现] JWT refresh 用 rotation
  - (2026-07-14) [来源: 老板原话] API 响应统一用信封格式

过期处理三路径:
  - Update: 内容仍有价值但需修改 → agent 直接更新 → 移除 stale → 更新日期
  - Recertify: 内容仍完全有效 → 确认 → 追加 [recertified] → 移除 stale
  - Delete: 内容已完全过时 → 追加 [已过期: 原因] → gate 跳过

### §22c 知识依赖声明

domain/ 知识文件可在 frontmatter 中声明依赖:
  ---
  depends_on:
    - decision: "用 FastAPI"
    - edict: "E001 禁止 mock"
  ---

依赖的决策/天条被推翻时:
  → 该知识标记 [dependency_broken: XX 已推翻]
  → 不再作为必读知识加载
  → 改为"参考（依赖已失效）"方式加载

### §22d 步数续行规则

Agent 执行到 steps limit 后:
  a. 评估当前是否在取得进展
  b. 有进展 → 继续执行（不设上限）
  c. 无进展 → 输出 [stuck: {原因}] + 当前产出

## §23 降级透明度协议 (强制)

所有降级路径必须：
  a. 写 LOG: `[degradation] {agent}: {降级原因}`
  b. 输出标记：在最终输出末尾追加：
     === degradations ===
     - agent: "{agent名}"
       reason: "{降级原因}"
       impact: "{影响描述}"
       severity: "LOW|MEDIUM|HIGH"
     === end degradations ===
  c. 影响级别：
     - LOW: 降级不影响结果
     - MEDIUM: 降级影响部分质量
     - HIGH: 降级影响正确性
  d. 聚合展示：管线最终汇总时收集所有 degradation 标记
  e. 违反本条 → C-level 违规，需补 degradation 段后方可 claim [goal:complete]

## §24 Butler v4 编排管线协议 (强制)

### 24.1 管线分层

Butler 编排采用 11 Step 结构, Step 2-5 内部有子步分解:

```
Step 1:   项目初始化       → @butler-init

Step 2:   调研 (产品先行, 技术跟进)
  Step 2.1: 加载上下文
  Step 2.2: @butler-product-analyst    → product-analysis.md          ← 产品分析
  Step 2.3: @butler-researcher         → research.md                  ← 技术研究
  Step 2.4: @butler-expert-analyzer    → expert-gap-analysis.md       ← 缺口分析
  Step 2.5: 调研汇总                   → gates/research-done.json     ← 门禁

Step 3:   专家组建
  Step 3.1: @butler-expert-analyzer    → experts.md (含 role-coordinator)
  Step 3.2: @butler-expert-builder     → agent/skill + gates/experts-ready.json

Step 4:   需求分析
  Step 4.1: 读取上下文 (含 product-analysis.md)
  Step 4.2: @butler-requirement-analyst  → requirement.md
  Step 4.3: 领域专家前置评审 — @travel-pipeline-architect + @travel-amap-engineer + @travel-guide-designer + @travel-brand-officer + @travel-user-engineer → gates/expert-review-done.json
    ↻ FAIL → 回 Step 4.2
  Step 4.4: @butler-core-analysis        → memory/{pm,ba,sa,architect}.md
    ↻ FAIL → 回 Step 4.2

Step 5:   回归验证
  Step 5.1: @butler-ai-orchestrator    → gates/ai-orchestrated.json
  Step 5.2: @butler-story-gate         → gates/stories-gated.json
    ↻ FAIL → 回 Step 4.3
  Step 5.3: @butler-deep-design        → gates/design-ready.json
    ↻ FAIL → 回 Step 5.2
  Step 5.4: @butler-regression         → gates/regression-passed.json
  Step 5.5: 验证门                     → .verdict

Step 6:   设计审批       → 用户确认 / Plugin 自动
Step 7:   任务拆解       → @butler-strategist
Step 8:   Captain 实现   → @butler-captain ×N (并行, 依赖驱动)
Step 9:   构建验收       → bash / Plugin
Step 10:  质量审计       → @butler-review (mode: audit) + @butler-sec-auditor
Step 11:  经验反哺       → talent / 5-Why / config.json
```

Key differences from v2:
- Step 2 已从"需求分析"改为"调研", 新增产品分析(2.2)先于技术研究(2.3)
- 编号从 dash (Step 2-1) 改为 dot (Step 2.1) 以匹配当前管线
- 所有退回目标指向的 Step 编号与当前管线一致

### 24.2 文件即Agent间通信的唯一方式

子步之间通过文件传递状态. **禁止** 使用 marker 文件 / 共享数据库 / 跨 Step 的内存通信.

每个文件必须:
- 路径确定: `butler/memory/{type}.md` 或 `butler/requirements/NN-{name}.md`
- 内容自包含: 包含完整上下文, 不依赖其他 agent 的内存状态
- 非空校验: 文件存在且 >100 bytes 且包含 `##` 标题

### 24.3 Story Gate 协议

Step 5.2 故事门（含 story-writer 角色 — 写故事 + 审核合并为同一 agent）:
1. **butler-story-gate**（含 story-writer 内置角色）：先写故事 → panel 审核 → 修正 → acceptance gate
2. Reviewers: 现有已创建专家、项目干系人
3. INVEST 检查 → 对称性验证 → 完整性验证
4. acceptance gate: PASS → Step 5.3 / FAIL → 回 Step 4.3

### 24.4 BLOCKER 协议

BLOCKER 分为两类：

#### 🔴 DESIGN_BLOCKER
领域专家前置评审（Step 4.3）中发现的**设计缺陷**，表明需求规格或设计文档存在不足。
- **处理时限**: 必须在 Step 5.2（故事门）之前解决
- **标记**: `⚠️ DESIGN_BLOCKER` → 被标记 agent 修正设计文档 → `✅ BLOCKER [已处理]`
- **升级**: 拒绝或无法解决 → `🔴 ESCALATION`
- **优先级**: 安全 > 质量 > 审美 > 视觉 > 交互 > polish

#### 🟡 PIPELINE_BLOCKER
管线执行中因上游产出缺失或质量不达标导致的**执行阻塞**。
- **触发**: `⚠️ PIPELINE_BLOCKER` → 当前 step 阻塞
- **处理**: 退回上游 G3 → 修复后重试
- **超时**: 1 小时内未解决 → 升级老板

### 24.5 异常处理规则

任何 agent 异常按 G1-G4 处理:
- **G1 (重试)**: 超时 / 5xx → backoff 重试 max 2 次, 仍失败 → 标记 [BLOCKED]
- **G2 (隔离)**: 文件写失败 → 写 .tmp → 校验 (非空 + ## 标题) → rename; 校验失败保留 .tmp 作证据
- **G3 (退回)**: Phase 验收 FAIL → `重新 @butler-phase{N}`; 新产出覆盖旧文件; 最多 2 轮, 仍 FAIL → 升级老板
- **G4 (索引)**: [以插件替代: butler-async.ts experimental.session.compacting hook 在压缩前自动保存管线状态]

### 24.6 正向回归协议

Step 5.4 回归: 全 agent 串行确认各自部分.

1. `node local/build-context.js raw-copy-devtools` 预建上下文索引
2. 每 agent 读索引 + 按需读 1-2 完整文件
3. 每 agent 读对应 memory 文件并确认 `## 回归确认` 段
4. acceptance 终审: 6 项检查 → `05-acceptance-final.md`
5. FAIL → G3 退回对应 Phase; PASS → Step 6 审批

---

## 全局红线（所有 agent 强制执行）

以下规则写入此处而非 agent prompt，因为所有 agent Step 0 必读此文件：

1. **任何修改必须通过构建验证** — 声称 [goal:complete] 但 build 未 PASS → 无效
2. **任何修改必须通过测试验证** — 声称 [goal:complete] 但 test 未 PASS → 无效
3. **captain 完成不代表任务完成** — butler-exec 必须独立验证 captain 的 evidence
4. **任务状态只能由 task 文件记录** — 不凭记忆说"做完了"
5. **卡住必须咨询用户，不自动放弃** — 检测到死循环 → 咨询用户意见，不自动 [goal:blocked]

### bash 安全规则（所有 agent 强制执行）

6. **每个 bash 命令必须设 timeout** — 常规操作 timeout: 60000，构建/安装 timeout: 300000，测试 timeout: 120000
7. **永远不运行持续监听命令** — dev server / watch / --watch 已全局禁止（deny）
8. **交互命令用非交互模式** — apt install -y / npm init -y / yes | command
9. **运行前自己判断** — 这个命令会退出还是持续运行？会等输入吗？不会退出的不运行
10. **不确定是否安全 → 用 question 工具问用户 → 不猜**

### git 安全规则（所有 agent 强制执行）

11. **git 非读操作必须先有老板明确指令** — add / commit / push / rebase / stash / merge 全在范围内。老板不说话 = 不操作。不问"要不要提交"。

### steps 自检规则（所有 agent 强制执行，统一 80）

12. **steps 是自检信号，不是停止信号** — 所有 agent 统一 steps: 80（例外: butler-full 保持 200，因其编排多 task 需要更长周期）。达到时自检：有进展 → 继续不停止。**只要在推进，就一直做下去。**
13. **死循环检测** — 连续 3 次 80-step 检查均零进展 → 判定为死循环。此时先尝试改变策略自救。自救失败 → **咨询用户**（不自动 [goal:blocked]）。用户判断是否真死循环，由用户决定继续还是放弃。
14. **但 butler-full 的表述为标准格式** — "80 steps 自检。达到时输出进度：已完成任务/进展/是否继续。有进展继续，连续3次零进展 → 咨询用户"

### 风险与技术债追踪（所有 agent 强制执行）

15. **风险追踪** — 所有 agent Step 0 读取 `butler/knowledge/project/risks.md`。pre-mortem 和 sec-auditor 在产出末尾输出 `risks:` YAML 块。captain 在完成阶段收集 subagent 产出中的 risks YAML → 委托 rf-fixer 追加到 risks.md。格式：
    ```yaml
    risks:
      - description: "{风险描述}"
        probability: "高|中|低"
        impact: "高|中|低"
        mitigation: "{缓解措施}"
        category: "技术|安全|流程|依赖"
    ```

16. **技术债追踪** — 所有 agent Step 0 读取 `butler/knowledge/project/TECH-DEBT.md`。cr-reviewer 和 auditor 在产出末尾输出 `tech_debt:` YAML 块（P0+P1 必须输出）。captain 在完成阶段收集 → 委托 rf-fixer 追加到 TECH-DEBT.md。格式：
    ```yaml
    tech_debt:
      - location: "{文件路径或模块}"
        issue: "{一句话问题}"
        risk: "{不修会导致什么}"
        priority: "P0|P1|P2|P3"
        suggestion: "{建议修复方式}"
    ```

17. **人才自成长** — 每个 agent 在任务完成后必须写 `agent_profile.md` (如果存在) 或 `learned.md`。rounds 自计数。level 自动升级:
    - rounds < 5: novice
    - rounds 5-19: practitioner
    - rounds 20-49: specialist (可产出 domain knowledge)
    - rounds ≥ 50: master
    specialist 级别的 agent 可产出 `knowledge/domain/{topic}.md`, 被其他 agent Step 0 读取 → context promotion.
    技能缺口 → 追加 `agent_profile.md#needs` [{skill, reason}].

18. **外部内容安全** — 所有社区来源的 skill / agent / domain knowledge 引用前必须:
    a. [skill] butler-sec-scan → R1-R5 检查
    b. PASS → 允许导入/参考
    c. WARN → 人工确认 → 决定 PASS/REJECT
    d. REJECT → 不可导入, 不可参考结构
    agent 生产管线: frame-builder 产出 → tester 行为验证 → auditor 质量审计 → captain 入库前 sec-scan + auditor 双重审查通过.

### 测试与编排红线（所有 agent 强制执行）

19. **测试执行唯一路径** — 所有测试命令必须通过 butler-tester agent 执行。禁止 developer / rf-fixer 直接执行 npm test / vitest / jest。违反 → P0 级别阻止 [goal:complete]。
20. **编排链完整性** — 所有 TASK 的 CHAIN 最后一步 butler-tester 不可跳过。Captain 必须在 Step 5.4 之前调 butler-tester。违反 → P0 级别阻止。
21. **回归零容忍** — 已知测试失败未修复 → 后续任务不推进。butler-tester 输出 regression_block: true → 强制 rework。

---

## 全局约束

(暂无 — 随着使用自动填充)

---

## 按领域

<!-- butler 在每轮完成后按领域归类更新 -->

### 2026-07-07: 任务收尾硬边界增强 [系统推断]

老板原话: "任务实施的时候，总发现有各种未完成，未处理，剩余问题，实施过程也经常发现存在绕过的方式，而不是采取正确的方式，好像也没有完整的审查级联影响，Gits 好像也没有记录决策链。"

分析结论:
- 6 Epic × 15 Task 方案已审批
- 执行 agent 零记忆（12/24 agent memory 为空）— 通过 T11 自动采集解决
- gits/ 与 git 脱钩（633c8ac→427a52e→dcd3aff 逐步退化）— 通过 T8-T10 解决
- 所有 agent steps 统一 80（但 butler-full 保留 200），死循环咨询用户
- 15 个任务文件已写入 butler/tasks/active/TASK-T{1-15}.md

### 2026-07-08: 文档与记忆功能分析 + Claude Code / Hermes 对比 [已修正]

老板原话: "分析当前项目的文档与记忆功能。对比 claude code 与 hermes。"
老板补充: "Butler 是开发工具（OpenCode agent framework），不是被开发的应用。"

修正后分析结论 (详见 butler/requirements/2026-07-08-doc-memory-analysis/analysis-report-v2.md):
- **Butler 是开发工具，不是被管理的项目** — 与 Claude Code 同级对比，都是帮别人写代码的工具
- **24 个 agent 分片知识是架构必然** — 多 agent 系统必须信息隔离，这不是"碎片化"是"专业化"。相比 Claude Code 的 1 CLAUDE.md 只是架构选择不同，不是设计缺陷
- **真正的差距：强制执行层** — Claude Code 是单体（1 Claude），记忆由自身保证；Butler 是多体（24 agent），记忆需要 framework enforce。目前 enforce 只在 prompt 层，不在 plugin 层
- **Butler 比 Claude Code 强的地方**：7 阶段结构化分析、多视角独立审查、审批门、完整决策链（requirements → tasks → gits → audit）
- **改进方向**（修正后）：
  - Tier 1：plugin 强制执行 Step N 反哺 + 自动注入 KNOWLEDGE.md（让工具更可靠）
  - Tier 2：butler-init 增强（分析目标项目代码库生成 initial knowledge）
  - Tier 3：暂不需要知识图谱/path-scoped rules（当前粒度已够）

---

## §25 Gate 规范

1. **唯一位置**: 所有 gate 文件必须写入 `butler/tasks/gates/{name}.json`。
2. **禁止路径**: `butler/gates/`、`gates/`、`butler/memory/gates/` 等非标准位置不得写入 gate 文件。
3. **编排者职责**: butler-full/solo 在检查 gate 时只扫描 `butler/tasks/gates/`。
4. **例外**: 无。所有 Step agent 的完成信号必须通过 gate 文件传递，不可绕过。

## §26 专家消费强制规则 (强制)

1. **创建必消费**: Step 3 (butler-expert-builder) 创建的任何领域专家 agent，必须在后续 Step 中定义消费点（读文件/评审/输入提供）。
2. **消费点三选一**: 每个领域专家至少属于以下三种消费模式之一：
   - **Step 4 上下文输入**: 专家 agent 文件作为 Step 4 (core-analysis) 的 M 级必读输入
   - **Step 5.2 评审 panel**: 专家以 reviewer 身份参与故事门审核，产出评审 note
   - **Step 5.3 深度设计**: 专家作为设计输入源，提供领域规范
3. **gate next_step 对齐**: Step 3.2 门禁 (experts-ready.json) 的 next_step 必须指向 Step 4.1（不可跳过 Step 4）。
4. **注册表追踪**: file-registry.md §3 每个 Step 的加载清单必须明确列出所有需要读取的 agent/skill 文件。
5. **违反后果**: 任何 Step 3 创建的专家在后续 Step 中未被消费 → 标记为 P0 阻塞项，must-fix 后方可继续管线。

## §X 学习记录文件命名规范

所有 agent 的学习记录文件必须遵循以下命名规则:

- 文件路径: `butler/learned/{agent-file-name}`
- agent-file-name = agent 定义文件的文件名（不含 .md）
- 例: butler-researcher → butler/learned/butler-researcher.md
- 例: butler-role-coordinator → butler/learned/butler-role-coordinator.md
- 禁止使用短名、别名、变量名
- 创建时机: agent 首次运行时自动创建（内容可为空或含初始注释）

## §Y 文件缺失处理规范

所有 cat 命令应按以下规则分级处理:

### 分级规则
- ✅ 预期存在: `cat <path> 2>/dev/null || echo "❌ [MISSING] <path> 应该存在但找不到"`
  - 使用场景: from registry §3 with status=✅
  - 缺失 → WARN, 记录到运行日志

- ⏳ 预期不存在: `cat <path> 2>/dev/null || echo "⏳ [INFO] <path> 属于 Step N, 尚不存在"`
  - 使用场景: from registry §3 with status=⏳
  - 缺失 → INFO, 不告警

- 🆕 首次运行: `cat <path> 2>/dev/null || echo "[INFO] 首次运行, 无历史记录"`
  - 使用场景: butler/learned/{agent}.md
  - 缺失 → INFO, 不告警

- ❌ 不应该出现: 不在 registry §3 中 → 不应被 cat
  - 如果 agent Step 0 仍包含此类文件 → 删除该 cat 行

### 禁止
- 裸的 `2>/dev/null` 不带输出消息
- 同一文件在同一 agent 中重复 `cat`

## §Z1 ↻ FAIL 回路适用范围 (2026-07-25)

FAIL 回路的实际 enforcement 机制说明：
1. 所有 gate 的 ↻ FAIL 标记的目的是**指导性**（LLM 行为的参考路径）
2. LLM 不会自主触发 FAIL 回路——门禁强制执行由插件 `tool.execute.after` 实现
3. 预期：大部分 gate 第一次 PASS → plugin hook 验证通过 → 推进
4. 异常场景由 G3（退回）+ plugin 组合处理，非 FAIL 回路本身

## §Z2 项目级 Agent 生命周期 (2026-07-25)

1. Step 3.2 创建的 travel-* agent（`.opencode/agents/`）是**文件级 Agent**——定义文件存在，可被 general agent 代理执行
2. 同 session 内 `@task @{agent_id}` 不可用——OpenCode 的 @task 注册表在进程启动时编译
3. 重启 OpenCode 后新增的 agent 文件被扫描注册 → `@task @{agent_id}` 可用
4. butler-full 的双层派发设计（直接 dispatch → 失败降级 general + skill 加载）确保功能完整性

## §Z5 架构决策记录 (2026-07-25)

来源: butler/requirements/butler-system-improvement-plan/improvement-plan.md 步骤 14

| ID | 决策 | 结论 | 日期 |
|:--:|:------|:----|:----:|
| A1 | Captain vs Agent 模型 | 混合模式 + §26 强制执行 Agent 消费（improvement-plan.md §4） | 2026-07-25 |
| A2 | mode:subagent ≠ 同 session dispatch | 接受（§Z2 已记录） | 2026-07-25 |
| A3 | ↻ FAIL 回路不可 enforce | 接受（§Z1 + E6/E7 Plugin 接管） | 2026-07-25 |
| A4 | 核心分析链四角色合并 | 暂不改变，保持当前 single core-analysis | 2026-07-25 |
| A5 | Agent 重新 dispatch vs Captain | 保留分层设计 | 2026-07-25 |
| A6 | Plugin 存活检测 (self_check) | 启动时写 butler/tasks/.hook_ready 证据文件 | 2026-07-26 |

## §Z3 上下文加载日志命名规范

1. 格式: `{step}-{agent}.json`
2. {step} = 纯数字+点号, 如 "2.2", "3.1", "4.2"
3. {agent} = agent 文件名去 ".md" 和后缀
4. 禁止: "step-" 前缀, 无点号编号, 省略 agent 名
