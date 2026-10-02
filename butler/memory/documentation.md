# 文档记忆（butler-doc-writer）

> 最后更新: 2026-10-02 ｜ 最近任务: TASK-018（测试文档固化 `tests/test-cases.md` + `tests/README.md`，DEL-007/AC-015，TASK-013 残项）

## 本项目文档约定（raw-copy-devtools）

1. **中文优先**：所有面向用户的文档用中文书写；代码级标识符、逐字符契约标记（如
   `===== REQUEST =====`、`[Request Body]`、`[Binary content omitted: ...]`）保持英文原样，
   不得翻译（否则破坏 AC-007 / AC-010 保真比对）。
2. **交付路径以 TASK 文件显式指令为准**：设计真源 `design.md` 写的是 `docs/INSTALL.md` /
   `docs/USAGE.md`，但 converge 追补任务 TASK-010 明确要求放**仓库根**。本项目同类收敛任务
   存在「重新定路径」现象（如 TASK-011 把 TESTCASES 从 docs/ 改到 tests/）。
   缓解做法：按 TASK 指令在根产出，同时镜像一份到 design 真源的 `docs/`，双路径均满足
   AC-019 存在性判据，且 `docs/` 不进入发行 ZIP（TASK-014 白名单仅 `extension/**` + LICENSE）。
3. **文档必须带「预期现象」**：每一步操作后描述用户能看到什么，而非只列动作。
4. **无占位符**：不得出现 TBD/TODO/待补/`{{}}`；占位符检查纳入自检。

## INSTALL.md 结构（DEL-011）

- 是什么 → 适用浏览器与版本 → 安装步骤（源码目录 / ZIP 两种方式）→ 验证安装 & 打开面板
  → 权限说明 → FAQ（加载失败 / 面板不出现 / 剪贴板失败 / 数据去向）→ 卸载 → 许可证。
- 关键锚点：`chrome://extensions`、`edge://extensions`、「开发者模式」、「加载已解压的扩展程序」、
  选择 **`extension/` 子目录**（ADR-010）。

## USAGE.md 结构（DEL-012）

- 6 类操作各自成节（v1.0.0 基线）：**打开面板 / 搜索 / 过滤 / 选中 / 复制 / 模式切换**。
  v1.1.0 增强后扩为 9 类操作（新增 右键菜单复制 / 多选批量复制 / 双击查看明细），见下方「增强里程碑文档约定」。
- 复制节必须显式写明三条保真承诺：**不美化 JSON / 不改动原始响应体 / 单条复制不含其他请求**；
  单条复制为**默认与主要场景**，但**不再具有排他性**（多选批量复制为独立显式入口）；
  面向用户的文档**禁止**再写「只复制当前单条 / 只支持单条」这类与多选行为冲突的排他表述（TASK-021 修订）。
- 模式 A/B 给出「示意」文本块（`text` 代码块，非 Markdown 引用），避免误导出真实输出含 Markdown。
- 隐私节必须含：仅内存、关闭 DevTools 销毁、不收集/不存储/不传输、仅 `clipboardWrite`，
  以及**敏感信息警示**（Authorization / Cookie / token）。
- P2 可选按钮（仅复制请求 / 仅复制响应 / 复制为 cURL）**必须标注「可选」并声明当前版本可能未启用**。

## 增强里程碑文档约定（TASK-017 新增，v1.1.0）

> 来源：TASK-017（TASK-014 残项）——增强版右键/多选/双击上线后补齐用户文档。

### USAGE.md 结构（增强后 15 节）

- 原 11 节**全部保留**，在「复制」后插入 3 个新交互节，并把隐私/需求覆盖声明紧随其后：
  `1 打开面板 / 2 搜索 / 3 过滤 / 4 选中 / 5 复制 / **6 右键菜单复制** / **7 多选批量复制** /
  **8 双击查看明细** / 9 复制模式切换 / 10 附加按钮 / 11 粘贴使用 /
  **12 需求覆盖声明（REQ-024 / AC-017）** / 13 隐私与数据安全 / 14 常见边界行为 / 15 关联文档`。
- 新增节必含的实现锚点（与 `panel.js` / `bulkformatter.js` 对齐，勿凭设计臆写）：
  - 右键：右键即单选选中 + 面板内自绘菜单；主项「复制请求 + 响应（原始）」；`N≥2` 时菜单追加「复制选中(N)」；
    关闭时机 = `Esc` / 点击他处 / 滚动 / 失焦；**零 `contextMenus` 权限**。
  - 多选：Ctrl/Cmd→toggle、Shift→range、单击→单选替换、↑↓→**清空集合**回落单选；「全选」与 `N` 均以**过滤后可见列表**为准；
    输出 `N` 段，段间 `===== #i/N =====`（i 按可见顺序 1..N），`N=1` 与单条逐字符一致；批量大响应=**一次确认覆盖本批**。
  - 双击：覆盖式抽屉六要素原文（方法+URL/请求头/请求体/状态码+状态文本/响应头/响应体）；关闭=按钮/Esc/遮罩；
    单击仅选中、仅双击打开；明细**恒为模式 A 口径**（不随 A/B 切换）；记录淘汰则自动关闭。
- **需求覆盖声明（REQ-024 / AC-017）必须显式保留**：`req.txt` 原非目标「不复制全部请求 / 只复制单条」被多选批量复制**取代**，
  但**单条复制仍为默认与主要场景且格式逐字符不变**；其余非目标继续有效。此声明同时置顶（头部引用）+ 独立成节（第 12 节）。
- 隐私节新增**批量敏感凭证警示**（一次可能带出**多份** `Authorization`/`Cookie`/token）；与既有单条敏感警示并存。

### INSTALL.md 结构（增强后 9 节）

- 版本号统一 `v1.1.0`（头部、§2 表格、§3 预期现象）。
- 新增 **§6 版本升级 / 重新加载（reload unpacked）**：覆盖源码 → `chrome://extensions` 卡片「重新加载 / Reload」→
  重开 DevTools → 确认 `1.1.0`；无法重新加载时回退「加载已解压」重选 `extension/`。
- **§5 权限说明（复核）** 新增明确结论：v1.1.0 增强**未新增任何权限**，右键菜单为自绘 DOM、**未用** `chrome.contextMenus`；
  复核方法 = 卡片「详情」中权限栏**仅** `clipboardWrite`。
- FAQ 增补 Q8（升级后看不到右键/多选 → 未真正 reload）；Q7 补充批量凭证提示并回链 USAGE §13。

### 镜像一致性（硬约束）

- `docs/{USAGE,INSTALL}.md` 与根 `{USAGE,INSTALL}.md` 必须**逐字节一致**；改完一侧用
  `cp docs/X.md X.md` 同步，再以 `cmp X.md docs/X.md` + `sha256sum` 双证据证明。
- **只镜像 USAGE/INSTALL**；`docs/MILESTONES.md`、`docs/DELIVERABLES-CHECKLIST.md` 是 docs 独有，不复制到根。

### 教训（本次）

- **「不改代码」不等于「不核对代码」**：文档行为逐条回读 `panel.js`/`bulkformatter.js`，发现 E2E 报告 G-1（按钮未插值）在实际代码中已修复
  （`panel.js:854` 已按 `{count}` 插值），故按真实的「复制选中(N)」书写，而非照抄旧 E2E 缺陷描述。
- **P2 状态需据实更新**：v1.0.0 时「仅复制请求/仅复制响应」标注「可能未启用」；v1.1.0 已实现（E2E AC-003 PASS + 菜单项），
  文档须由「可能未启用」改为「已实现」，「复制为 cURL」仍保留可选标注。

## 测试文档固化约定（TASK-018 新增；TASK-013 残项闭合）

> 来源：`tests/test-cases.md` + `tests/README.md`。核心是「单测 + E2E + 门禁」证据链与 **AC 双体系消歧**。

### 双 AC 体系（本项目最大的消歧点）

- **基线 AC-001..AC-022**：真源 `butler/requirements/requirement.md`（TASK-011 的 `test-cases.md` §1 用的是这套）。
- **增强里程碑 AC-001..AC-017**：真源 `butler/spec/在现有-raw-copy-.../requirement.md` / `spec.md`。
- 两套**编号独立、同名不同义**（例：基线 AC-004 = 单选交互；增强 AC-004 = Ctrl/Shift 多选四语义）。
  凡新增/引用 AC 必须写「基线」或「增强里程碑」限定词，并在段首放一段体系说明（`test-cases.md` §1b 开头即此约定）。
- 增强 UI 类 AC（AC-001/002/003/008/009/010/011）**无纯单测**，其等价/保真性由 E2E 实机证据兜底；
  文档**不得**把它们标成 ✅ 自动化，应写「E2E（`e2e-report.md` §x#y）」。

### 增强里程碑用例矩阵（`test-cases.md` §1b）

- 三组 + 边界表：**右键 AC-001..003**、**多选 AC-004..006**、**详情 AC-008..011**；边界 TC-ENH-B-01..06
  （空选 N=0 / 全选幂等 / 右键落表头 / Shift 跨淘汰项 / 菜单键盘无障碍 / 详情期刷新）。
- 每行必带「增强 REQ（R-00x）+ 类型 + 步骤 + 预期 + 自动化落点（具体测试文件/用例数或 E2E §x#y）」。
- 新增测试文件在**头注释**声明 `covers: AC-xxx`（本次给 `contextmenu` 补 AC-001/003、`multiselection` 补 AC-005、
  `detail` 补 AC-010、`bulkformatter` 加 covers 行；均为注释级最小改动，不碰断言）。

### AC-015「现有基线用例范围」口径（可判）

- 口径 = **全部 `tests/*.test.mjs` 全量**（glob `tests/**/*.test.mjs`，非白名单，新文件自动纳入）
  **+ 4 门禁脚本**（`check-manifest` / `check-syntax` / `check-zero-network` / `check-panel-shell`）。
- 判定：任一用例 `fail` 或任一门禁非 PASS → AC-015 不满足。文档中附「一键复跑 + 期望值」命令块。
- **计数必须以实测为准**：文档陈旧处（README 表 123 用例、check-syntax 11/11）一律重跑后修正
  （本次实测 14 文件 / 264 用例；check-syntax 15/15）。

### E2E 指针

- E2E 真机证据不内联，指向 `butler/spec/…/e2e-report.md`（TASK-016）：报告 §3 逐条 AC、§4 剪贴板原文、
  §5 截图、§9 复现、§10 判定汇总；原始结果 `e2e-artifacts/results-{chrome,edge}.json`。
- `verdict=WARN` 须如实转述（绑定 AC 0 FAIL；非绑定观察 G-1/G-2/G-3 照登），不得只写 PASS。

## 交付物验收清单结构（DEL-018 / AC-019，TASK-015 新增）

- **两层判据**（消除「仅存在性检查」缺口）：每项交付物同时给
  ① 存在性（`test -f` / `cmp` / `ls`）与 ② 内容级（对文件内部字段/关键词/结构做可机械复核断言，
  如 `manifest.json` 用 node 读 JSON 断言 `permissions===["clipboardWrite"]`、zip 用 node 解析
  local file header 得条目数与解压体积）。
- **验证优先**：清单中的每一行判决都必须贴回**真实 shell 输出**，不得只写「存在」；无法自动化的
  浏览器行为如实标 ⏳（不伪装成 ✅）。
- **里程碑映射双源**：M1-M5 的任务归属以 `design.md` §11（建议实现顺序 + DEL 落点）为主，用
  `butler/tasks/backlog/<slug>/TASK-00N.md` 的 `phase` / `covers` 校验，保证 16 个 TASK 全覆盖、
  无重复无遗漏（TASK-001..016 ↔ M1..M5）。
- **状态字符**：只用 ✅（静态门禁/单元机械通过）与 ⏳（待手工 E2E），禁止 TBD/TODO。

## 教训

- 源码分析时发现实现进度落后于设计：`extension/` 仅落地 panel 外壳 + i18n；capture/store/
  render/filter/selection/formatter/clipboard/content 尚未存在。面向用户的文档按 **design.md
  冻结契约**描述产品行为，但**不得**把 P2 未实现项说成已可用——显式标注「可选 / 可能未启用」。
- 文档行为溯源到 design.md 的 ADR / REQ / AC 编号（如 ADR-006 保真、ADR-008 内容降级、
  REQ-013/DEC-004 可选按钮），便于审计逐条回链。
- TASK-015 复核时上述「实现落后」已被后续 TASK-003..008 补齐：写验收清单前必须**重跑**
  `node scripts/check-*.mjs` 与 `node --test`，以当前真实输出为准，不沿用旧结论。
- 设计 §11 的里程碑 DEL 映射与 requirement §4.5 的字面名称存在轻微张力（M4 是否含过滤）：
  以 design §11 落点为准并在文档中显式说明「TASK-004 过滤基座已在 M2 交付，M4 收口其完善」。

## 边界定义修订约定（TASK-008 新增，缺陷 RC-2）

> 背景：`[Response Body]` = 「（响应体不可用）」缺陷的**设计侧根因 RC-2** 是「把可修复的数据获取缺陷当成合法降级边界」。
> 因此修订任何「降级/占位」类文档时，必须遵守：

1. **占位收窄原则**：`「响应体不可用」` 仅允许出现在三类合法场景——「客观不可获取（WebSocket/SSE/预检等无正文） / 二进制省略 / 超预算降级」；**文本类正文缺失不再产出占位**。
2. **必达取回措辞**：文档中凡描述「`content.text` 缺失」的路径，必须写明「异步 `getContent` 兜底取回（原地回填，含 401 等错误响应）」，不得写「缺失即标不可用」。
3. **异步语义**：ADR-003 原文「捕获回调内**同步读取**」与 `getContent` 异步 API 矛盾，是缺陷未被落实的诱因。凡引用该 ADR，一律表述为「捕获后**独立异步 enrich** + `getContent` 双形态（回调/Promise）」，并注明「不长期驻留 entry（有界队列内临时持有）」。
4. **修订印记**：与实现不一致的历史决策文字就地修订并标注 `（2026-10-02 修订）`；**记录性内容**（如 ADR「已接受」状态）保留并加注原因，不删改历史。
5. **同批清理**：修订边界时须**全文件扫描同类残留**（不止列出的锚点行）——本次额外清理了 `stories-written.md` 的 CLOSURE_6 异常行与 GAP-3 追溯行、`design.md` §10.5 边界表，否则「无残留占位表述」验收（AC-012）不通过。

### TASK-008 实际改动清单（语义锚点）

- `design.md`：ADR-003 决策+后果+状态；§3.3 约束 2；§5.1 `getContent` 行（备选→常规路径）；§5.2 降级矩阵 `content.text` 行；§10.5 边界表。
- `feasibility.md`：R1 缓解措施（补 `getContent` 兜底 + `maxBytes` 字节预算）。
- `stories-written.md`：`AC-CAP-001-E1`（改为必达取回 + 新增 `E2` 合法占位）、`AC-FMT-002-E1`、CLOSURE_6 异常行、GAP-3 追溯行。

### 后续补修（tech-evaluation.md，同一 RC-2 口径）

- ✅ 已修 `tech-evaluation.md`：`getContent` 由「备选」→「常规路径」（AGGREGATE_ESTIMATE）；`content.text=null → kind='unavailable'` 补注「仅客观不可获取，文本类须先经捕获层异步 getContent 回填」；capture.js 描述补「独立异步 enrich + getContent 双形态 + 原地回填」。
- `stories-written.md` RISK 行（STORY-CAP-001）「归一化后丢弃 entry 引用（ADR-003）」未注明 enrich 的有界临时持有；语义仍成立（指长期不驻留），故未改。
- 说明：本次未改 `design.md` §5.3 / `tech-evaluation.md` 的 `installCapture` ESM 导出签名（仍为 `{uninstall}` / `normalize`），因 `design.md` 真源未同步 `applyContent`，单独改 tech-evaluation 会产生新的跨文档不一致——留待未来统一契约修订。
