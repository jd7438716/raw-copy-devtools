# Butler 文件注册表 — Chrome DevTools 单条请求原始信息一键复制扩展

> 版本: 1.0
> 所有 agent 启动时先读此文件，再按标记加载对应文件
> 创建/修改文件后必须更新此文件的状态

---

## §1 文件总目录

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-01 | butler/CONSTITUTION.md | Butler 宪法 | ✅ | butler-init |
| F-02 | butler/config.json | 项目配置 | ✅ | butler-init |
| F-03 | .opencode/opencode.json | OpenCode 配置 | ✅ | butler-init |
| F-04 | butler/file-registry.md | 本文件 | ✅ | butler-init |
| F-05 | butler/conventions.md | 项目约定 | ✅ | butler-init |
| F-10 | butler/project/overview.md | 项目概述 | ✅ | butler-init |
| F-11 | butler/project/stack.md | 技术栈 | ✅ | butler-init |
| F-12 | butler/project/conventions.md | 编码约定 | ✅ | butler-init |
| F-13 | butler/project/risks.md | 风险追踪 | ✅ | butler-init |
| F-14 | butler/project/tech-debt.md | 技术债 | ✅ | butler-init |
| F-15 | butler/project/agent-manifest.md | Agent 清单 | ✅ | butler-init |
| F-16 | butler/project/_index.md | 知识索引 | ✅ | butler-init |
| F-17 | butler/project/profiles/ | Agent 档案目录 | ✅ | butler-init |
| F-20 | butler/domain/architecture.md | 架构领域 | ✅ | butler-init |
| F-21 | butler/domain/design.md | 设计领域 | ✅ | butler-init |
| F-22 | butler/domain/development.md | 开发领域 | ✅ | butler-init |
| F-23 | butler/domain/testing.md | 测试领域 | ✅ | butler-init |
| F-24 | butler/domain/security.md | 安全领域 | ✅ | butler-init |
| F-25 | butler/domain/product.md | 产品领域 | ✅ | butler-init |
| F-26 | butler/memory/corrections.md | 历史纠错 | ✅ | butler-init |
| F-30~49 | butler/learned/{agent}.md | 学习记录 | ✅ | butler-init |
| F-40 | butler/requirements/requirement.md | 需求规格书 | ✅ | butler-requirement-analyst |
| F-41 | butler/memory/research-*.md | 研究报告 | ⏳ | butler-researcher |
| F-42 | butler/requirements/expert-gap-analysis.md | 专家缺口 | ⏳ | butler-exp-analyzer |
| F-43 | butler/requirements/scope-confirmed.md | 提问确认 | ⏳ | butler-full |
| F-44 | butler/requirements/experts.md | 专家列表 | ⏳ | butler-exp-analyzer |
| F-50 | butler/requirements/analysis.md | 需求分析 | ⏳ | butler-req-analyst |
| F-51 | butler/memory/requirement-analysis.md | 需求分析反哺 | ⏳ | butler-req-analyst |
| F-52 | butler/memory/pm-value-assessment.md | PM 评估 | ⏳ | butler-pm |
| F-53 | butler/memory/ba-business-analysis.md | BA 分析 | ⏳ | butler-ba |
| F-54 | butler/memory/sa-system-analysis.md | SA 分析 | ⏳ | butler-sa |
| F-55 | butler/memory/architect-design.md | 架构设计 | ⏳ | butler-arch |
| F-56 | butler/memory/coordinator-gaps.md | 角色协调缺口 | ⏳ | butler-coordinator |
| F-57 | butler/memory/ai-orchestration.md | AI 编排 | ⏳ | butler-ai-orch |
| F-58 | butler/memory/security-audit.md | 安全审计 | ⏳ | butler-sec |
| F-59 | butler/memory/qa-strategy.md | QA 策略 | ⏳ | butler-qa |
| F-60~F-79 | .opencode/agents/{name}.md | 动态专家 (Agent 文件号段) | ⏳ | butler-exp-builder |
| F-80~F-99 | .opencode/skills/{name}/SKILL.md | Skill 定义 (Skill 文件号段) | ⏳ | butler-exp-builder |
| F-62 | butler/memory/taste.md | 审美基线 | ⏳ | butler-designer |
| F-63 | butler/memory/visual-design.md | 视觉设计 | ⏳ | butler-designer |
| F-63a | butler/memory/information-architecture.md | 信息架构（页面清单/导航结构） | ⏳ | butler-ia |
| F-64 | butler/memory/memory-architecture.md | 记忆架构 | ⏳ | butler-ai-mem-arch |
| F-65 | butler/memory/ui-ux-design.md | UI/UX 设计 | ⏳ | butler-ui-ux |
| F-66 | butler/memory/polish.md | Polish 报告 | ⏳ | butler-polish |
| F-67 | butler/requirements/stories.md | 用户故事 | ⏳ | butler-writer |
| F-68 | butler/requirements/story-gate.md | 故事门裁决 | ⏳ | butler-story-gate |
| F-69 | butler/requirements/tasks.md | 任务拆分 | ⏳ | butler-story-gate |
| F-70 | butler/requirements/design.md | 深度设计 | ⏳ | butler-deep-design |
| F-71 | butler/requirements/acceptance.md | 验收报告 | ⏳ | butler-regression |
| F-72 | butler/requirements/audit.md | 审计报告 | ⏳ | butler-review |
| F-73 | butler/requirements/e2e-test-plan.md | E2E 测试计划 | ⏳ | butler-deep-design |
| F-74 | butler/memory/quality-audit.md | 质量审计 | ⏳ | butler-review |
| F-75 | butler/memory/development-progress.md | 开发进度 | ⏳ | butler-developer |
| F-76 | butler/memory/test-results.md | 测试结果 | ⏳ | butler-tester |

> 状态: ✅ 已存在  ⏳ 按需创建  ❌ 依赖未就绪

### §1a 扩展源码（TASK-003 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-E03a | extension/src/store.js | 请求记录内存缓存（环形缓冲 cap=1000，O(1) 追加/淘汰） | ✅ | butler-developer |
| F-E03b | extension/src/capture.js | HAR entry→RequestRecord 归一化 + onRequestFinished 注册 | ✅ | butler-developer |
| F-T03a | tests/store.test.mjs | store 单元测试（环形淘汰/get/all/clear/subscribe） | ✅ | butler-developer |
| F-T03b | tests/capture.test.mjs | capture 单元测试（字段映射/降级/纯函数/install） | ✅ | butler-developer |

### §1a-2 扩展源码（TASK-004 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-E04a | extension/src/filter.js | 列表搜索/过滤纯逻辑（applyFilter / collectOptions） | ✅ | butler-developer |
| F-E04b | extension/src/render.js | 固定行高虚拟滚动（computeWindow / createVirtualList） | ✅ | butler-developer |
| F-E04c | extension/panel.js | 面板入口（edit：接线 store/capture/filter/render + 虚拟列表 + 空态） | ✅ | butler-developer |
| F-T04a | tests/filter.test.mjs | filter 单元测试（搜索/method/status 码段/type/组合/collectOptions） | ✅ | butler-developer |
| F-T04b | tests/render.test.mjs | render 单元测试（computeWindow + DOM 桩虚拟列表 1000 条） | ✅ | butler-developer |
| F-E05 | extension/src/selection.js | 单选状态机（点击/↑↓/clamp/setIds 失效清理/onEvict 淘汰联动） | ✅ | butler-developer |
| F-E05b | extension/panel.js (edit) | TASK-005 接线：selection 实例 + 行点击 + ↑↓ + .is-selected 高亮 + getSelected() | ✅ | butler-developer |
| F-T05 | tests/selection.test.mjs | selection 单元测试（13 用例：点击/move/clamp/setIds/onEvict/reset/onChange） | ✅ | butler-developer |

### §1a-3 扩展源码（TASK-006 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-E06 | extension/src/formatter.js | 复制拼接核心（纯函数；模式 A/B；逐字符保真；MODE_A/MODE_B + buildCopyText） | ✅ | butler-developer |
| F-E06b | extension/panel.js (edit) | TASK-006 接线：import formatter + buildCurrentCopy/getLastCopyText + #copy-btn 生成文本（不写剪贴板） | ✅ | butler-developer |
| F-T06 | tests/formatter.test.mjs | formatter 单元测试（24 用例：AC-007 逐码元/golden/单条隔离/保序/回退/空体/options/纯度） | ✅ | butler-developer |

### §1a-4 扩展源码（TASK-007 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-E07 | extension/src/clipboard.js | 剪贴板写入双路径降级（copyText via:'async'\|'execCommand'\|'none'）+ Toast（showToast/createToast，textContent） | ✅ | butler-developer |
| F-E07b | extension/panel.js (edit) | TASK-007 接线：#copy-btn → buildCurrentCopy → copyText → 成功/失败 Toast；P2 按钮提示 | ✅ | butler-developer |
| F-E07c | extension/src/i18n.js (edit) | 新增 `copy.notEnabled`（zh/en 键集对齐） | ✅ | butler-developer |
| F-T07 | tests/clipboard.test.mjs | clipboard 单元测试（14 用例：主路径/逐字符不改动/降级/双失败不抛/临时节点清理/Toast） | ✅ | butler-developer |

### §1a-5 扩展源码（TASK-008 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-E08 | extension/src/content.js | 响应体内容分类（DEFAULT_LARGE_THRESHOLD / classifyBody / isOverThreshold；图文/二进制/Base64 判定，ADR-008） | ✅ | butler-developer |
| F-E08b | extension/panel.js (edit) | TASK-008 接线：buildCurrentCopy 注入分类后 responseBody；onCopyClick 超阈值 confirm + 取消 Toast | ✅ | butler-developer |
| F-E08c | extension/src/i18n.js (edit) | 新增 `copy.cancelled`（zh/en 键集对齐，超阈值取消提示） | ✅ | butler-developer |
| F-T08 | tests/content.test.mjs | content 单元测试（19 用例：文本原样/二进制逐字符占位/base64 文本解码含中文 emoji/base64 省略/非法 base64 回退/阈值边界/unavailable） | ✅ | butler-developer |

### §1a-6 测试文档（TASK-011 / TASK-016 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-T11 | tests/test-cases.md | 测试用例矩阵（DEL-013）：AC-001..AC-022 逐条三绑定 + checklist §C 全部 16 边界 + E2E 步骤索引 + 门禁清单 + 覆盖统计 | ✅ | butler-qa |
| F-T16 | tests/README.md | 测试说明：运行方式/存放路径/命名约定/文件清单/门禁脚本/E2E 索引（edit 合并，保留 TASK-016 内容） | ✅ | butler-developer, butler-qa |
| F-T11b | butler/memory/qa-strategy.md | QA 策略反哺（测试分层/关键教训/边界清单/复跑命令/遗留） | ✅ | butler-qa |

### §1a-7 打包（TASK-014 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-P14a | scripts/package.mjs | 可复现打包脚本（白名单 extension/** + LICENSE；手写 ZIP/deflate/CRC32；体积 <200KB + 零依赖审计 + zip 读回三重门禁；**TASK-011/012 rework：打包期剥离 .js 整行注释/空白 + 剥离后 node --check 前置门禁 + 读回双保险**） | ✅ | butler-developer |
| F-P14b | dist/raw-copy-1.0.0.zip | 发行 ZIP（DEL-015）：21 条目，解压 130.53KB / 压缩 51.16KB，manifest.json 于根，可直接 load unpacked | ✅ | butler-developer |

### §1a-8 文档交付（TASK-010 / TASK-015 登记）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-D10a | INSTALL.md（+ `docs/INSTALL.md` 镜像） | 安装说明（DEL-011）：Chrome/Edge 加载已解压 `extension/` 步骤 + FAQ | ✅ | butler-doc-writer |
| F-D10b | USAGE.md（+ `docs/USAGE.md` 镜像） | 使用说明（DEL-012）：打开面板/搜索/过滤/选中/复制/模式切换 6 节 | ✅ | butler-doc-writer |
| F-D15a | docs/MILESTONES.md | 里程碑交付节奏（DEL-018）：M1-M5 目标/TASK 映射/验收判据/状态 + TASK-001..016 全映射 | ✅ | butler-doc-writer |
| F-D15b | docs/DELIVERABLES-CHECKLIST.md | 交付物齐全清单（AC-019）：8 项 DEL-010..017 逐项存在性 + 内容级判据 + 真实 shell 勾对 | ✅ | butler-doc-writer |

### §1a-9 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-002 登记

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH02a | extension/panel.html (edit) | 追加 `#multiselect-actions`(#select-all-btn/#copy-selected-btn/#selected-count) + `#context-menu` + `#detail-pane`(#detail-body `<pre>`/#detail-close/遮罩)；三容器初始 hidden；既有 id 未改名（ADR-020） | ✅ | butler-developer |
| F-ENH02b | extension/styles/panel.css (edit) | 追加多选工具栏/自绘菜单/覆盖式详情抽屉样式；`.app{position:relative}`；`.detail-pane{position:absolute;inset:0}`；沿用既有 token；`.row.is-selected:hover` 高亮可见 | ✅ | butler-developer |
| F-ENH02c | butler/memory/pair/TASK-002-enh/round-01/developer-output.md | 增强 TASK-002 交付证据（门禁原始输出 + 契约交接） | ✅ | butler-developer |

### §1a-10 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-004 登记（多记录拼接器）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH04a | extension/src/bulkformatter.js | 多记录批量拼接器（DEL-003）：`joinBlocks(blocks,N)` + `buildBulkCopyText(records,mode,resolveBody)`；ADR-015 模板（N≥2 加 `===== #i/N =====` 标记 join `\n\n`；N=1 委托单选无标记）；只做外层聚合，逐条调用冻结的 `formatter.buildCopyText`（单一真源）；纯函数零依赖 | ✅ | butler-developer |
| F-ENH04b | tests/bulkformatter.test.mjs | bulkformatter 单元测试（26 用例：模板精确/段数===N/每段逐字符===单条/顺序/无跨条混淆/模式B/N=1/N=0/resolveBody 注入与回退/纯度/单一真源） | ✅ | butler-developer |
| F-ENH04c | butler/memory/pair/TASK-004-enh/round-01/developer-output.md | 增强 TASK-004 交付证据（基线 `pair/TASK-004/` 保留 list-view 记录） | ✅ | butler-developer |

### §1a-11 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-006 登记（右键菜单逻辑）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH06a | extension/src/contextmenu.js | 右键菜单纯逻辑（DEL-001）：`resolveRowId(event,listBodyEl)→recordId\|null`（`.row` 命中 + `data-id` 还原 number）+ `createMenuModel({hasSelection,count,canCopyRequestOnly})→MenuItem[]`（主项常驻 / count≥2 追加复制选中(N) / P2 仅请求·仅响应占位）+ `clampPosition(...)→{left,top}` 视口四边夹取；纯数据无渲染、零 DOM、零浏览器 API、禁 `innerHTML`、零 `chrome.contextMenus` | ✅ | butler-developer |
| F-ENH06b | tests/contextmenu.test.mjs | contextmenu 单元测试（39 用例：resolveRowId 命中/嵌套/表头空白/包含性/非抛健壮性；clampPosition 四边+超大+非有限；createMenuModel count=0/1/2/5 项集/禁用态/P2 开关/纯度） | ✅ | butler-developer |
| F-ENH06c | butler/memory/pair/TASK-006-enh/round-01/developer-output.md | 增强 TASK-006 交付证据（门禁原始输出 + 契约交接 + R-A 遗留） | ✅ | butler-developer |

### §1a-12 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-011 登记（manifest 版本 + 门禁）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH11a | extension/manifest.json (edit) | 版本 bump `version` 1.0.0→1.1.0（唯一字节变化；permissions/MV3/devtools_page 不变，AC-012） | ✅ | butler-config-changer |
| F-ENH11b | scripts/check-manifest.mjs (edit) | 门禁版本断言同步 1.0.0→1.1.0（L12/L99；**必要**——原硬编码与 bump 冲突；安全断言未动） | ✅ | butler-config-changer |
| F-ENH11c | dist/raw-copy-1.1.0.zip | 发行 ZIP（build 产物）：25 条目，manifest 于根；**TASK-011/012 rework 后：解压 136.10KB / 压缩 41.62KB**（原 193.98KB / 73.59KB） | ✅ | butler-config-changer |
| F-ENH11d | butler/memory/config-changes.md | 配置变更台账（TASK-011：改动/门禁原始输出/反向探针/假阳性/遗留） | ✅ | butler-config-changer |
| F-ENH11e | butler/learned/butler-config-changer.md | config-changer 学习记录（首次运行创建） | ✅ | butler-config-changer |

### §1a-13 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-007 登记（panel.js 右键菜单接线）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH07a | extension/panel.js (edit) | TASK-007 接线：`#list-body` contextmenu 委托 + 自绘菜单渲染（textContent）/clampPosition 定位 + 关闭时机（Esc/点击他处/滚动/失焦）+ 键盘 ↑↓/Enter + P2 分段裁剪（模式 A）+ `#copy-req-btn`/`#copy-resp-btn` 启用 + 追加式导出 `openContextMenu(event)` | ✅ | butler-developer |
| F-ENH07b | extension/styles/panel.css (edit) | 注释改述（单行）：去掉 `chrome.contextMenus` 字面量，消除全仓门禁假阳性（AC-012）；样式逻辑不变 | ✅ | butler-developer |
| F-ENH07c | butler/memory/pair/TASK-007-enh/round-01/developer-output.md | 增强 TASK-007 交付证据（门禁原始输出 + 临时 headless harness 结果 + 契约交接） | ✅ | butler-developer |

### §1a-14 TASK-011 / TASK-012 rework 登记（打包体积门禁修复）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-R11a | scripts/package.mjs (edit) | 打包期 `.js` 整行注释/空白剥离 + 剥离后 `node --check` 前置门禁 + 读回 `.js` 二次 `node --check`；阈值保持 200KB（TASK-011/012 rework） | ✅ | butler-developer |
| F-R11b | butler/memory/pair/TASK-011/round-01/developer-output.md | rework 交付证据（改动/原始输出/体积前后对比/独立解码验证/反向探针/结论） | ✅ | butler-developer |
| F-R11c | butler/memory/pair/TASK-012/round-01/developer-output.md | 同上（TASK-012 镜像） | ✅ | butler-developer |

### §1a-15 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-016 登记（浏览器级 E2E 实机验证）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH16a | butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-report.md | E2E 实机验证报告（TASK-016）：Chrome 152 + Edge 154 真实扩展（CDP Extensions.loadUnpacked）双端 17/17 PASS；逐条映射 AC-001/002/003/008/009/010/011 + DEL-007；verdict=WARN（绑定 AC 0 FAIL；新观察 G-1 多选按钮未插值 {count} / G-2 README 表滞后 / G-3 Edge readText 陈旧） | ✅ | butler-e2e-verifier |
| F-ENH16b | butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-artifacts/harness/{cdp.mjs,run-e2e.mjs} | E2E 执行器（零依赖 CDP 客户端 + 双浏览器断言/截图/系统剪贴板；只读业务代码） | ✅ | butler-e2e-verifier |
| F-ENH16c | butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-artifacts/{results-chrome.json,results-edge.json,results-all.json,E2E-*-*.png} | E2E 原始结果（逐条断言值/剪贴板样本/控制台）+ 6 张截图 | ✅ | butler-e2e-verifier |
| F-ENH16d | butler/tasks/loads/TASK-016-butler-e2e-verifier.json | TASK-016 上下文加载日志（含 [MISSING_CONTEXT] e2e-test-plan.md） | ✅ | butler-e2e-verifier |

> TASK-016 只读验证：**未修改任何业务代码**（`extension/**` / `scripts/**` / `tests/**` mtime 均早于本任务开始）。

### §1a-16 增强里程碑（slug: 在现有-raw-copy-...-基础上做功能增）TASK-021 登记（隐私声明一致性修订）

| # | 文件 | 描述 | 状态 | 创建者 |
|---|------|------|------|--------|
| F-ENH21a | extension/privacy.html (edit) | TASK-021：发行包内隐私数据使用披露与多选行为对齐——「只做一件事：把你选中的**单条**网络请求…」→「**一条或多条**」；「你的控制权」节补充 Ctrl/Cmd/Shift 多选 + 「复制选中(N)」一次复制多条、单条仍为默认主场景；既有「不收集/不传输/完全本地/仅写剪贴板」声明不变 | ✅ | butler-doc-writer |
| F-ENH21b | INSTALL.md / docs/INSTALL.md (edit) | §1「选中单条请求即可…它的」→「选中一条或多条请求，即可一键把其…」；补注多选经「复制选中(N)」一次复制多条（根 + docs 镜像逐字节一致） | ✅ | butler-doc-writer |
| F-ENH21c | docs/DELIVERABLES-CHECKLIST.md (edit) | §4 DEL-012 内容级判据重跑刷新：删除陈旧引文「只复制当前选中的单条请求」，改 9 类操作 / 282 行 / 多选独立入口 | ✅ | butler-doc-writer |
| F-ENH21d | butler/memory/documentation.md (edit) | 文档约定反哺：禁止「只复制当前单条/只支持单条」排他表述；单条为默认主场景但非唯一入口 | ✅ | butler-doc-writer |
| F-ENH21e | butler/tasks/loads/TASK-021-butler-doc-writer.json | TASK-021 上下文加载日志 | ✅ | butler-doc-writer |

> TASK-021 只改文档/静态页面：**未修改任何 JS 业务逻辑**（`extension/src/**`、`panel.js` 等未动）；门禁 `check-syntax` 15/15、`check-manifest` 17/17、`check-panel-shell` 42/42、`check-zero-network` 17/17 全 PASS；`package.mjs` 体积/依赖/zip 读回三项 PASS。

---

## §2 通用上下文（所有 agent Step 0 必读基线）

任何 agent 在任何 step 启动时，以下文件为通用必读基线:

| 优先级 | # | 文件 | 说明 |
|--------|---|------|------|
| M | F-01 | butler/CONSTITUTION.md | 宪法 |
| M | F-26 | butler/memory/corrections.md | 历史纠错 |
| M | F-04 | butler/file-registry.md | 本文件（查步骤清单用）|
| M | F-40 | butler/requirements/requirement.md | 需求规格书（含老板原话，如已存在）|
| O | F-10 | butler/project/overview.md | 项目概述 |
| O | F-30~49 | butler/learned/{agent}.md | 个人学习记录 |

> M=必读 O=可选

---

## §3 Step 加载清单

### Step 1: Init

| 操作 | 文件 | 创建者 |
|------|------|--------|
| 创建 | F-01~05, F-10~17, F-20~26 | butler-init |
| 创建 | F-30~49 butler/learned/{agent}.md | butler-init |

### Step 2: 调研

| 读/写 | 文件 | 必读? | 创建者 | 依赖 | 时间线状态 |
|:-----:|------|:----:|--------|------|:---------:|
| R | F-40 requirement.md | M | — | — | ⏳ Step 4.2 |
| R+W | F-41a product-analysis.md | M | butler-product-analyst | F-40 | ⏳ Step 2.2 |
| R+W | F-41b research-*.md | O | butler-researcher | F-41a | ⏳ Step 2.3 |
| R | F-42 expert-gap | — | — | F-41b | ⏳ Step 2.4 |
| R+W | F-43 scope-confirmed | O | butler-full | — | ⏳ Step 2.5 |
| R | 通用基线 M-01~M-04 | M | — | — | ✅ 始终存在 |

### Step 3: 组建

| 读/写 | 文件 | 必读? | 创建者 | 依赖 | 时间线状态 |
|:-----:|------|:----:|--------|------|:---------:|
| R | F-42 expert-gap | M | — | — | ✅ Step 2.4 |
| R | F-44 experts.md | M | — | — | ⏳ 自产出 |
| W | F-60 .opencode/agents/* | — | butler-exp-builder | F-44 | ⏳ Step 3.2 |
| W | F-61 .opencode/skills/* | — | butler-exp-builder | F-44 | ⏳ Step 3.2 |
| R | 通用基线 M-01~M-04 | M | — | — | ✅ 始终存在 |

### Step 4: 需求分析

| 读/写 | 文件 | 必读? | 创建者 | 依赖 |
|:-----:|------|:----:|--------|:----:|
| R | 通用基线 M-01~M-04 | M | — | — |
| R | F-42 expert-gap | M | — | — |
| R | F-43 scope-confirmed | M | — | — |
| R+W | F-50 analysis.md | M | butler-req-analyst | F-40 |
| R | F-77~81 .opencode/agents/travel-*.md | M | — | — |
| R+W | F-200~204 butler/memory/travel-*.md | M | travel-* experts | F-50 |
| R+W | F-95 butler/tasks/gates/expert-review-done.json | M | travel-* experts | F-50 |
| R | F-200~204 butler/memory/travel-*.md | M | — | — |
| R | F-84~92 .opencode/skills/*/SKILL.md | O | — | — |
| R+W | F-52 pm-value.md | M | butler-pm | F-50 |
| R+W | F-53 ba-business.md | M | butler-ba | F-52 |
| R+W | F-54 sa-system.md | M | butler-sa | F-53 |
| R+W | F-55 architect-design.md | M | butler-arch | F-54 |

### Step 5: 回归验证

| 读/写 | 文件 | 必读? | 创建者 | 依赖 |
|:-----:|------|:----:|--------|:----:|
| R | 通用基线 M-01~M-04 | M | — | — |
| R | F-55 architect-design | M | — | — |
| R | F-200~204 | O | — | — |
| R | F-57 butler/memory/ai-orchestration.md | O | — | — |
| R+W | F-67 stories.md | M | butler-writer | F-55 |
| R+W | F-68 story-gate.md | M | butler-story-gate | F-67 |
| R+W | F-69 tasks.md | M | butler-story-gate | F-67 |
| R+W | F-58~66 + F-63a 设计产出 | M | deep-design chain | F-55 |
| R+W | F-71 acceptance.md | M | butler-regression | F-52~55, F-200~204, F-67~70 |
| W | F-72 audit.md | M | butler-review | F-71 |

---

## §4 动态专家文件访问规则

动态创建的 expert（不在 §1 中预定义）按以下规则自动获得权限:

| 规则 | 说明 |
|------|------|
| **通用必读** | 自动继承 §2 的 M-01~M-04 |
| **Step 文件** | 根据被分配的 step，自动继承该 step 的所有 M 和 O 标记文件 |
| **产出注册** | 创建完文件后，在 registry 的 §1 中追加一条记录 |
| **读权限** | 默认有所有 R 和 M 标记文件的读权限 |
| **写权限** | 需要在 §1 中显式登记 |
| **专家消费注册** | Step 4.3 创建的 5 位 travel-* 专家的 F-200~204 产出文件必须在 §1 中注册，并在 §3 Step 4.4 的 R 读行中列出。 |

---

## §5 路径变更记录

| 文件 | 旧路径 | 新路径 | 变更日期 | 原因 |
|------|--------|--------|---------|------|
| F-52 pm-value | butler/memory/pm/entries/{slug}.md | butler/memory/pm-value-assessment.md | Phase 2 | 扁平化重构 |
| F-40 requirement | butler/requirements/{slug}/requirement.md | butler/requirements/requirement.md | Phase 2 | 去 slug 层 |
| 全域 knowledge/ | butler/knowledge/{project,domain,agent}/ | butler/project/ + butler/domain/ + butler/learned/ | Phase 2 → v2 | 层级扁平化；v2 统一收进 butler/ |
| .opencode/skills/ | butler/knowledge/skills/ | .opencode/skills/ | Phase 3 | 技能移至 .opencode |
