# 用户故事 — 新建 Chrome/Edge DevTools 扩展（Manifest V3）

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> 阶段: Phase ③（故事编写）| 日期: 2026-10-02 | 角色: butler-story-writer
> 上游: `requirement.md`（v1.1，36 REQ / 22 AC / 4 US / 18 DEL）+ `spec.json`（80 items，机器真源）+ `design.md`（Phase ②：15 模块 / 11 ADR / CIA 四维）+ `feasibility.md`（✅ 可执行，VALUE high / RISK medium / EFFORT ≈21 SP）
> 方法: INVEST 六项逐条 + 垂直切片（UI→系统→状态→反馈→追溯）+ Gherkin AC（每故事 ≥1 正常流 + ≥1 异常流）+ Scenario Outline 参数化 + 闭环/断头路检查
> 判定锚点: 全部 AC 锚定 `design.md` §10.4 的验证落点；门禁级决策 ADR-006（模式 A 保真）为本文件最高优先级约束。

---

## 0. 故事地图（Story Map）与垂直切片策略

### 0.1 用户旅程（横轴）与发布切片（纵轴）

```
用户旅程:    安装入口  →  捕获观察  →  检索定位  →  选中单条  →  一键复制  →  反馈/交付
               (EXT)      (CAP)       (LIST)      (SEL)       (FMT/CLP)    (PRV/DOC)

MVP / M1+M2:  EXT-001    CAP-001     LIST-001               MFT-001
                          │           LIST-002
                          │           NFR-002(性能门禁)
M3 (核心价值):                       SEL-001    FMT-001
                                                 FMT-002
                                                 CLP-001
M4 (健壮性):              CONT-001    NFR-001(无网络)
M5 (交付):                                        I18N-001  PRV-001
                                                            PKG-001
                                                            DOC-001 / TST-001 / NFR-003
P2 backlog:                                                 FMT-003
```

### 0.2 切片原则（防"横向切片"）

- **每条故事都是垂直切片**：贯穿 `UI → 系统行为 → 状态流转 → 用户反馈`，单独可交付用户可见价值。
- **不做"前端故事 / 后端故事"**：本项目无后端；每个模块故事都从"用户在面板上做什么"出发，到"面板给出什么回执"结束。
- **薄而全 > 深而横**：优先让 MVP 主链路（打开面板→看到列表→选中→复制→粘贴给 AI）端到端打通，再补健壮性与交付物。

### 0.3 全局角色表（来自 requirement.md §4.4）

| 角色 | 上下文 | 主要服务故事 |
|------|--------|-------------|
| 前端开发 | 调试 API，把请求+响应贴给 AI | FMT-001 / CLP-001 |
| 测试工程师 | 提 Bug 附完整请求响应 | LIST-002 / SEL-001 |
| 后端开发 | 排查接口，看实发/实收原文 | FMT-002 / CONT-001 |
| 技术支持 | 复制用户侧请求分析 | CAP-001 / CLP-001 / PRV-001 |
| 扩展用户（通用） | 在面板操作（打开/搜索/过滤/选中/复制） | EXT-001 / LIST-001 / I18N-001 |

---

## 1. 用户故事

### STORY-EXT-001: 安装扩展后在 DevTools 出现独立「Raw Copy」面板

```
TYPE: user_story
ROLE: 作为一位在接口联调中频繁使用 DevTools 的开发者
SLICE: UI(面板栏出现) → 系统(devtools_page 注册 + panels.create) → 状态(面板可见/空态) → 反馈(空态引导) → 追溯(manifest 版本/图标)

As a 需要在 DevTools 内完成"选中单条请求→复制→粘贴给 AI"闭环的开发者
I want 安装扩展后打开 DevTools 就能看到一个与 Elements/Console/Network 并列的「Raw Copy」独立面板
So that 我无需离开 DevTools 或安装额外工具，就能从面板进入捕获与复制流程
```

**CLOSURE_6 闭环**
- 入口：`chrome://extensions`（Edge 为 `edge://extensions`）→ 开发者模式 → 加载已解压的扩展程序 → 指向 `extension/`
- 操作：打开任意页面 → 打开 DevTools → 点击面板栏「Raw Copy」
- 反馈：面板正文加载成功，空态中文提示「暂无请求」，控制台无错误
- 异常：devtools_page 未声明 / 注册失败 → 扩展卡片报错 + 控制台 `E_DEVTOOLS_PAGE_MISSING`
- 完成：面板处于可见且可交互状态（列表容器/工具栏/复制按钮已挂载，复制按钮禁用）
- 追溯：面板标题 `Raw Copy`、图标来自 manifest `icons`、版本号 `manifest.json#version`

**INVEST 评估**
- I - Independent: **yes** — 纯新增骨架，不依赖其它故事即可 load unpacked 验收（AC-001）
- N - Negotiable: **yes** — 面板名/图标资源/空态文案可协商（DEC-001）
- V - Valuable: **yes** — 是后续所有价值的唯一入口，交付"扩展已可用"的可见起点
- E - Estimable: **yes** — `devtools_page` + `panels.create` 为 Chromium 稳定 API，工作量已知（design.md M1 = 3 SP）
- S - Small: **yes** — devtools.html/devtools.js + panel 骨架 + manifest，< 1 天
- T - Testable: **yes** — load unpacked 后观测面板栏即可判定

**PRIORITY:** critical
**RISK:** 面板不出现（devtools_page 路径/`panels.create` 参数错误）→ 缓解：注册异常兜底日志 + AC 冒烟；误加权限破坏 AC-009 → 缓解：本故事 manifest 仅含 `clipboardWrite`（由 STORY-MFT-001 守门）

**ACCEPTANCE**
```
AC-EXT-001-1: 正常路径 — 面板可见并与标准面板并列
  Given extension/ 已通过"加载已解压的扩展程序"加载且无报错
  When  打开任意 http(s) 页面并打开 DevTools
  Then  面板栏出现「Raw Copy」，与 Elements/Console/Network 并列
  And   点击后面板正文加载完成，控制台无错误

AC-EXT-001-E1: 异常路径 — devtools_page 声明缺失
  Given extension/manifest.json 未声明 "devtools_page"
  When  打开 DevTools
  Then  面板栏不出现「Raw Copy」
  And   扩展卡片显示错误 "Manifest: devtools_page 未声明"
  And   控制台输出 E_DEVTOOLS_PAGE_MISSING

AC-EXT-001-2: 空态
  Given 面板已打开且尚未捕获任何请求
  When  查看面板正文
  Then  显示中文空态「暂无请求，请刷新页面后重试」
  And   「复制请求 + 响应（原始）」按钮为禁用态
```

**DEPENDS_ON:** none
**SIZE:** M
**COVERS:** REQ-001, REQ-036(架构落点), DEL-001, DEL-002, DEL-017, AC-001, US-001~004（入口）

---

### STORY-CAP-001: 实时捕获当前页面请求并自动追加（环形缓冲 1000 条）

```
TYPE: user_story
ROLE: 作为技术支持，需要还原用户侧真实发生的请求
SLICE: UI(列表自动新增行) → 系统(onRequestFinished→normalize→store.add) → 状态(环形缓冲 size≤1000，最旧淘汰) → 反馈(新行出现/淘汰不报错) → 追溯(startedDateTime/time/resourceType)

As a 技术支持
I want 打开面板后，当前页面发起的请求被自动、实时地追加到列表
So that 我不需要手工记录或刷新，就能拿到用户侧真实请求的完整清单
```

**CLOSURE_6 闭环**
- 入口：面板已打开（捕获监听在 panel 上下文注册）
- 操作：用户在页面触发任意网络请求（XHR/Fetch/Document/Script/…）
- 反馈：列表实时出现新行；新请求按时间追加
- 异常：某条请求 HAR entry 缺 `content.text` → 异步 `getContent` 取回正文并回填；仅正文客观不可获取时标「响应体不可用」，不中断捕获（2026-10-02 修订）
- 完成：`store.add(record)` 成功，`size()` 更新；第 1001 条时最旧记录被淘汰
- 追溯：每行携带 `startedDateTime`（ISO）/`time`(ms)/`resourceType`

**INVEST 评估**
- I - Independent: **yes** — 捕获+内存模块独立可测（可 Node import `normalize`），不依赖渲染细节
- N - Negotiable: **yes** — 环形缓冲/等价 O(1) 结构可换（ADR-004 已定）
- V - Valuable: **yes** — "实时完整清单"是产品核心数据源，直接支撑 US-003/US-004
- E - Estimable: **yes** — HAR→RequestRecord 映射表已在 design.md §5.2 冻结，可估
- S - Small: **yes** — capture.js + store.js，M2 内 1–2 天
- T - Testable: **yes** — AC-002（实时追加）+ AC-013（上限淘汰）机械可测

**PRIORITY:** critical
**RISK:** 捕获回调位于页面请求热路径，做重活拖慢页面（R4/REQ-029）→ 缓解：回调内仅字段读取+归一化+`store.add`，禁止 JSON 解析/base64 解码/DOM（design §3.3）；持有 HAR entry 造成闭包内存泄漏（R2）→ 缓解：归一化后丢弃 entry 引用（ADR-003）

**ACCEPTANCE**
```
AC-CAP-001-1: 正常路径 — 实时追加
  Given 面板已打开且监听已注册
  When  在页面触发一次 XHR/Fetch 请求并等待其完成
  Then  列表在无人工刷新下自动新增 1 行，且该行 URL 与请求一致

AC-CAP-001-2: 上限淘汰（环形缓冲）
  Given 面板已捕获 1000 条请求
  When  页面再完成第 1001 条请求
  Then  列表 size 恒为 1000，最旧的第 1 条被移除，第 1001 条存在
  And   捕获过程无报错、无内存持续增长

AC-CAP-001-E1: 异常路径 — 正文缺失时必达取回（2026-10-02 修订）
  Given 某请求 HAR entry 无 response.content.text，但其 harEntry.getContent 可返回正文
  When  该请求进入列表（异步 enrich 完成后）并被选中复制
  Then  该条必须取回并展示完整真实正文（含 401 等错误响应），不再标记「响应体不可用」
  And   正文异步回填同一记录，其余请求捕获不受影响

AC-CAP-001-E2: 客观不可获取 — 占位仅限合法场景
  Given 某请求（如 WebSocket/SSE/预检）HAR entry 无 response.content.text 且正文客观不可获取
  When  该请求进入列表并被选中复制
  Then  仅此时标记「响应体不可用」，其余请求捕获不受影响
  And   错误码 E_BODY_UNAVAILABLE（不抛出、不中断监听）
```

**Scenario Outline — 请求类型归一化（参数化）**
```
  AC-CAP-001-3: 支持多资源类型
    Given 页面发起一条类型为 {resourceType} 的请求
    When  该请求完成
    Then  列表行的资源类型列显示 {expected}
    And   RequestRecord.resourceType = {expected}

    Examples:
    | resourceType | expected   |
    | XHR          | XHR        |
    | Fetch        | Fetch      |
    | Document     | Document   |
    | Script       | Script     |
    | Stylesheet   | Stylesheet |
    | Image        | Image      |
    | Font         | Font       |
    | Media        | Media      |
    | WebSocket    | WebSocket  |
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** M
**COVERS:** REQ-002, REQ-003, REQ-004, REQ-035, DEL-003, AC-002, AC-013, US-003, US-004

---

### STORY-LIST-001: 请求列表展示（7 字段）与虚拟滚动

```
TYPE: user_story
ROLE: 作为后端开发，需要快速扫描并锁定出问题的那一条请求
SLICE: UI(每行 7 列) → 系统(render.setData + 窗口化 DOM 复用) → 状态(可视窗口) → 反馈(滚动/新行平滑无卡顿) → 追溯(行=单条 RequestRecord)

As a 后端开发
I want 列表每行清晰显示 方法/URL/状态码/资源类型/耗时(ms)/大小/时间
So that 我能一眼判断哪条请求异常，并快速定位到要复制的那一条
```

**CLOSURE_6 闭环**
- 入口：面板正文列表区
- 操作：滚动列表 / 等待新请求追加
- 反馈：可视区行随滚动更新，固定行高 28px，URL 超长省略号不换行
- 异常：1000 条时滚动仍流畅；空列表显示空态
- 完成：`render.setData(items)` 后 DOM 节点数 ≈ 可视行数 + overscan
- 追溯：每行 `data-id` 指向 RequestRecord.id

**INVEST 评估**
- I - Independent: **yes** — 渲染层可独立用 mock 数据验证
- N - Negotiable: **yes** — 行高/列宽/overscan 数量可协商
- V - Valuable: **yes** — 列表可读性是"选中→复制"的前置，直接支撑 AC-012
- E - Estimable: **yes** — 自研虚拟滚动方案已定（ADR-005）
- S - Small: **yes** — render.js，1–2 天
- T - Testable: **yes** — 字段齐全 + 1000 条滚动帧率可测

**PRIORITY:** high
**RISK:** 全量 DOM 渲染 1000 行卡顿（R4）→ 缓解：窗口化 + DOM 复用 + 固定行高（ADR-005）；URL 含不可信字符 → 缓解：仅 `textContent`

**ACCEPTANCE**
```
AC-LIST-001-1: 正常路径 — 7 字段齐全
  Given 列表中存在一条已完成的请求记录
  When  查看该行
  Then  该行依次显示 请求方法、URL、状态码、资源类型、耗时(ms)、大小、时间

AC-LIST-001-2: 虚拟滚动性能
  Given 列表已捕获 1000 条请求
  When  连续滚动列表
  Then  滚动与追加保持流畅（无可感知卡顿），DOM 行节点数 ≈ 可视行数 + overscan（远小于 1000）

AC-LIST-001-E1: 异常路径 — 字段缺失降级
  Given 某请求缺少状态码（如失败请求 status=0）
  When  渲染该行
  Then  状态码列显示降级值（0/`-`）而非空白或报错
  And   其余字段正常显示，无 E_RENDER_FIELD_UNDEFINED 异常
```

**DEPENDS_ON:** STORY-CAP-001
**SIZE:** M
**COVERS:** REQ-005, REQ-029(渲染侧), DEL-004(渲染), AC-012

---

### STORY-LIST-002: 按 URL 搜索 + 方法/状态码/资源类型过滤

```
TYPE: user_story
ROLE: 作为测试工程师，需要在大量请求中快速筛出待复现的那一类
SLICE: UI(搜索框+三个过滤下拉) → 系统(applyFilter 组合条件) → 状态(过滤结果集) → 反馈(列表即时刷新/命中数) → 追溯(当前过滤条件回显)

As a 测试工程师
I want 按 URL 关键字搜索，并按方法/状态码/资源类型组合过滤
So that 我能在海量请求中秒级定位目标请求，而不是逐条肉眼筛查
```

**CLOSURE_6 闭环**
- 入口：面板工具栏（搜索框 + method/status/resourceType 下拉）
- 操作：输入关键字 / 选择过滤条件（可组合）
- 反馈：列表即时收敛为命中集，显示命中条数
- 异常：无命中 → 显示「无匹配请求」；清空条件 → 恢复全量
- 完成：`applyFilter(records, criteria)` 返回命中数组并注入渲染
- 追溯：过滤条件在 UI 上保持可见（可回看）

**INVEST 评估**
- I - Independent: **yes** — 纯函数 `applyFilter`，mock 数据即可独立验证
- N - Negotiable: **yes** — 匹配方式（包含/忽略大小写）可协商
- V - Valuable: **yes** — 检索能力直接决定"找到目标并复制"的效率（AC-003）
- E - Estimable: **yes** — 单模块纯函数，工作量小
- S - Small: **yes** — filter.js + 工具栏绑定，1 天
- T - Testable: **yes** — 参数化 Examples 覆盖各条件组合

**PRIORITY:** high
**RISK:** 组合过滤语义歧义（AND/OR）→ 缓解：统一定义为 AND（各条件同时满足），并在 USAGE 说明

**ACCEPTANCE**
```
AC-LIST-002-1: 正常路径 — URL 关键字搜索
  Given 列表含 URL 分别包含 "/api/login" 与 "/static/app.js" 的请求
  When  在搜索框输入 "api/login"
  Then  列表仅显示 URL 含 "api/login" 的请求，其余隐藏

AC-LIST-002-2: 组合过滤（AND）
  Given 列表含多条不同 方法/状态码/资源类型 的请求
  When  同时选择 method=POST、status=500、resourceType=XHR
  Then  列表仅显示三条条件同时满足的请求

AC-LIST-002-E1: 异常路径 — 无命中
  Given 当前过滤条件在列表中无任何匹配
  When  应用过滤
  Then  列表显示「无匹配请求」空态（非空白/非报错）
  And   清空条件后恢复全量列表，无 E_FILTER_NO_MATCH 阻塞

  Scenario Outline — 过滤参数化
    When 应用过滤条件 {criteria}
    Then 命中集合为 {expectedSet}

    Examples:
    | criteria                          | expectedSet        |
    | query="login"                     | URL 含 login 的请求 |
    | method=GET                        | 全部 GET 请求       |
    | status=404                        | 全部 404 请求       |
    | resourceType=Image                | 全部 Image 请求     |
    | method=POST & status=200          | POST 且 200         |
    | query="" & method=ALL & status=ALL| 全量               |
```

**DEPENDS_ON:** STORY-LIST-001
**SIZE:** M
**COVERS:** REQ-006, REQ-007, REQ-008, REQ-009, DEL-004(过滤), AC-003, US-002

---

### STORY-SEL-001: 点击 / 键盘上下键选中单条请求（含淘汰自愈）

```
TYPE: user_story
ROLE: 作为测试工程师，需要精确锁定唯一一条请求再复制
SLICE: UI(点击行/↑↓键) → 系统(selection.selectId/move) → 状态(唯一 selectedId) → 反馈(高亮跟随) → 追溯(选中项 id 与列表一致)

As a 测试工程师
I want 点击某一行选中它，或用键盘 ↑/↓ 在请求间切换选中
So that 我能精确、可预测地指定"要复制的那一条"，并保持单手键盘操作效率
```

**CLOSURE_6 闭环**
- 入口：列表行 / 面板聚焦态
- 操作：鼠标点击行；或按 ↑/↓
- 反馈：被选中行高亮，键盘移动时高亮随之滚动进入可视区
- 异常：当前选中项被环形缓冲淘汰 → 自动清空选中或落到最近项，不报错
- 完成：`selection.current()` 恒为 0 或 1 个有效 id
- 追溯：高亮行 `data-id` = `selection.current()`

**INVEST 评估**
- I - Independent: **yes** — selection 模块以 id 列表驱动，可独立单测
- N - Negotiable: **yes** — 淘汰后策略（清空 vs 落到最近项）可协商（默认落到最近项）
- V - Valuable: **yes** — "精确单条"是 AC-006（单条隔离）的前提，直接支撑 US-002
- E - Estimable: **yes** — 选中状态机 + 键盘事件，工作量已知
- S - Small: **yes** — selection.js，约 1 天
- T - Testable: **yes** — 点击/键盘/淘汰三场景可测（AC-004）

**PRIORITY:** critical
**RISK:** 选中项被淘汰后悬空（B-2）→ 缓解：`onEvict(id)` 自愈；键盘事件与 DevTools 默认快捷键冲突 → 缓解：仅在列表聚焦时拦截 ↑/↓

**ACCEPTANCE**
```
AC-SEL-001-1: 正常路径 — 点击选中
  Given 列表中存在多条请求
  When  点击第 3 行
  Then  第 3 行高亮，且为唯一选中项（其余行取消高亮）

AC-SEL-001-2: 正常路径 — 键盘上下键切换
  Given 当前第 3 行被选中且列表已聚焦
  When  按 ↓ 键
  Then  选中移动到第 4 行并自动滚动进入可视区
  When  再按 ↑ 键
  Then  选中回到第 3 行

AC-SEL-001-E1: 异常路径 — 选中项被淘汰
  Given 选中项为列表中最旧的一条，且随后有 N 条新请求使该条被环形缓冲淘汰
  When  发生淘汰
  Then  选中不会指向已删除记录；按约定落到最近有效项（或清空）
  And   复制按钮状态与当前选中一致性保持，无 E_STALE_SELECTION
```

**DEPENDS_ON:** STORY-CAP-001, STORY-LIST-001
**SIZE:** M
**COVERS:** REQ-010, REQ-011, DEL-005, AC-004, US-002

---

### STORY-FMT-001: 一键复制「完整请求 + 完整响应」（默认模式 A）

```
TYPE: user_story
ROLE: 作为前端开发，需要把一条请求和响应的全部原始信息直接贴给 AI 分析
SLICE: UI(复制按钮+模式切换) → 系统(buildCopyText(record, MODE_A)) → 状态(生成纯文本) → 反馈(交给 CLP-001 写剪贴板+Toast) → 追溯(元信息段含开始时间/耗时/资源类型/MIME)

As a 前端开发
I want 选中单条请求后点击一次按钮，就得到"该请求完整请求+完整响应"的纯文本
So that 我能直接粘贴给 AI 分析接口问题，而无需跨 DevTools 标签页分头复制
```

**CLOSURE_6 闭环**
- 入口：面板「复制请求 + 响应（原始）」按钮（默认模式 A）
- 操作：先选中一行 → 点击复制按钮（或模式切换到 A）
- 反馈：交由 STORY-CLP-001 出 Toast「已复制到剪贴板」
- 异常：未选中 → 按钮禁用并提示；请求体缺失 → 不输出 `[Request Body]` 段（不报错）
- 完成：剪贴板文本包含 请求行/请求头/请求体 + 状态行/响应头/响应体，且仅含该单条
- 追溯：模式 A 标题段含 开始时间/总耗时/资源类型/MIME 元信息

**INVEST 评估**
- I - Independent: **yes** — `buildCopyText` 为纯函数，可 Node 单测；不依赖剪贴板
- N - Negotiable: **yes** — 段标签文案/元信息放"标题段"位置可协商（ADR-006 边界内）
- V - Valuable: **yes** — 这是产品的**核心价值动作**（US-001 主链路）
- E - Estimable: **yes** — 输出结构已在 ADR-006 精确定义（含模式 A/B 结构）
- S - Small: **yes** — formatter.js 模式 A 部分，M3 内 1–2 天
- T - Testable: **yes** — 输出字段与单条隔离可逐项断言（AC-005/AC-006/AC-015）

**PRIORITY:** critical
**RISK:** 模式 A 被误实现为"美化 body"，破坏 AC-007（R8，门禁级）→ 缓解：**ADR-006 定死**：模式 A 只允许加标题段/段标签，body 逐字符原样；逐字符比对测试；误附加其它请求 → 缓解：`buildCopyText` 只接收单条 record

**ACCEPTANCE**
```
AC-FMT-001-1: 正常路径 — 模式 A 输出完整请求+响应
  Given 已选中一条含请求头/请求体/响应头/响应体的请求（模式 A 为默认）
  When  点击「复制请求 + 响应（原始）」
  Then  剪贴板文本包含：
         请求部分：请求方法、完整 URL、HTTP 版本、请求头（原始顺序）、请求体
         响应部分：状态码、状态文本、响应头（原始顺序）、响应体
  And   请求段以 ===== REQUEST ===== 标题、响应段以 ===== RESPONSE ===== 标题分隔

AC-FMT-001-2: 单条隔离
  Given 列表中存在多条请求，仅选中其中一条
  When  执行复制
  Then  剪贴板文本仅含该条请求的信息，不含任何其它请求的方法/URL/体

AC-FMT-001-3: 元信息仅出现在标题段
  Given 记录含 startedDateTime/time/resourceType/mimeType
  When  模式 A 复制
  Then  上述元信息出现在标题段内，且不插入请求体/响应体正文

AC-FMT-001-E1: 异常路径 — 无选中
  Given 当前没有任何请求被选中
  When  点击复制按钮
  Then  按钮为禁用态或点击后提示「请先选择一条请求」
  And   不写剪贴板，错误码 E_NO_SELECTION

AC-FMT-001-E2: 异常路径 — 请求体缺失
  Given 选中的请求无请求体（postData.text 为 null）
  When  模式 A 复制
  Then  不输出 [Request Body] 段与空行残留，其余部分完整
  And   无异常抛出
```

**DEPENDS_ON:** STORY-SEL-001, STORY-CAP-001
**SIZE:** M
**COVERS:** REQ-012, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-021, DEL-006(A), AC-005, AC-006, AC-015, US-001

---

### STORY-FMT-002: 原始保真复制模式（模式 B + 禁止任何格式化）

```
TYPE: user_story
ROLE: 作为后端开发，需要看到浏览器"实发/实收"的逐字符原文
SLICE: UI(模式切换为 B) → 系统(buildCopyText(record, MODE_B)) → 状态(原始拼接文本) → 反馈(经 CLP-001 反馈) → 追溯(headers 原始顺序)

As a 后端开发
I want 复制时能选择"纯原始模式"，且任何模式下响应体都逐字符不变
So that 我排查接口时看到的 JSON 与浏览器实际收到的一模一样，不被任何美化污染
```

**CLOSURE_6 闭环**
- 入口：模式切换控件（A/B），选择 B
- 操作：选中一行 → 切换模式为 B → 复制
- 反馈：剪贴板文本为无标题直接拼接的请求块 + 响应块
- 异常：JSON 响应体 → 仍原样输出；非法/超大但不超阈值 → 原样
- 完成：模式 B 无 `===== REQUEST =====`/`===== RESPONSE =====`，body 与 `content.text` 逐 UTF-16 码元一致
- 追溯：两种模式下 body 内容必须逐字符相同（仅"外壳"不同）

**INVEST 评估**
- I - Independent: **yes** — 与 FMT-001 共享纯函数但可独立验收（模式 B 输出）
- N - Negotiable: **no** — 保真规则**不可协商**（ADR-006 门禁级决策，REQ-020 硬约束）
- V - Valuable: **yes** — "逐字符保真"是产品差异化与信任的核心（US-003）
- E - Estimable: **yes** — 输出结构已在 ADR-006 定义
- S - Small: **yes** — formatter.js 模式 B + 保真断言，约 1 天
- T - Testable: **yes** — AC-007 可"复制文本 vs 原文"逐字符比对（机械可验）

**PRIORITY:** critical
**RISK:** HAR `content.text` 与实际字节存在差异（encoding=base64 需解码一次）（R2）→ 缓解：仅按 `content.encoding` 做必需解码，不做任何格式化；任何 parse/stringify/trim/转义/Markdown 包裹 → 直接判 AC-007 FAIL

**ACCEPTANCE**
```
AC-FMT-002-1: 正常路径 — 模式 B 无标题直接拼接
  Given 已选中一条请求且模式切换为 B
  When  执行复制
  Then  输出为「请求块 + 空行 + 响应块」，无 ===== REQUEST/RESPONSE ===== 标题
  And   请求块含请求行/头/空行/请求体；响应块含状态行/头/空行/响应体

AC-FMT-002-2: 逐字符保真（AC-007 命门）
  Given 响应体原始文本为 {"code":0,"message":"success","token":"xyz789"}
  When  任意模式复制后取出响应体片段
  Then  该片段与原始 content.text 逐字符一致
  And   无缩进、无换行、无字段排序、无 Markdown 代码块、无引号转义、无截断

AC-FMT-002-3: 两种模式 body 内容一致
  Given 同一选中记录
  When  分别以模式 A 与模式 B 复制
  Then  两种输出中的请求体与响应体子串逐 UTF-16 码元一致（差异仅在外壳标题/段标签）

AC-FMT-002-4: 头保序
  Given 请求头/响应头在 HAR 中为固定数组顺序（含同名重复头）
  When  复制输出
  Then  头按原始数组顺序逐行输出为 "Name: Value"，不排序、不去重、不合并同名

AC-FMT-002-E1: 异常路径 — 正文缺失时必达取回（2026-10-02 修订）
  Given 选中记录 response.content.text 缺失，但其 getContent 可返回正文
  When  复制（异步 enrich 完成后；未完成时先等待，不输出占位）
  Then  响应体位置输出完整真实正文（含 401 等错误响应），其余不变
  And   错误码 E_BODY_UNAVAILABLE 仅在「客观不可获取 / 二进制省略 / 超预算降级」时出现（不抛异常）
```

**DEPENDS_ON:** STORY-FMT-001
**SIZE:** M
**COVERS:** REQ-019, REQ-020, DEL-006(B), AC-007, AC-014, AC-015(B), US-003

---

### STORY-FMT-003: 附加复制按钮（仅请求 / 仅响应 / 复制为 cURL）〔P2 backlog〕

```
TYPE: user_story
ROLE: 作为需要快速提取片段的高级用户
SLICE: UI(附加按钮) → 系统(局部拼接) → 状态(部分文本) → 反馈(Toast) → 追溯(片段来源单条)

As a 需要只取请求或只取响应的高级用户
I want 可选地"仅复制请求 / 仅复制响应 / 复制为 cURL"
So that 在特定场景下我能更聚焦地拿到所需片段
```

**INVEST 评估**
- I - Independent: **yes** — 复用 FMT-001/002 拼接器，附加导出
- N - Negotiable: **yes** — 是否实现、按钮形态均可协商
- V - Valuable: **yes（弱）** — 属增强，非核心闭环
- E - Estimable: **yes** — 复用现有拼接逻辑
- S - Small: **yes** — 附加分支，< 1 天
- T - Testable: **yes** — 可断言片段内容

**PRIORITY:** low（**P2 backlog，本期不实现，不阻塞验收**，见 feasibility R10 / DEC-004）
**RISK:** 挤占 P0 工期 → 缓解：明确推入 backlog，不进入本期交付范围
**ACCEPTANCE**
```
AC-FMT-003-1: 正常路径（若实现）— 仅复制响应
  Given 已选中一条请求
  When  点击「仅复制响应」
  Then  剪贴板仅含响应部分（无请求块）

AC-FMT-003-E1: 异常路径 — 功能未启用
  Given 本期未实现附加按钮
  When  用户查看复制区
  Then  仅呈现核心复制按钮；不出现无效/报错按钮
  And   无 E_FEATURE_DISABLED 误导提示
```
**DEPENDS_ON:** STORY-FMT-001
**SIZE:** S
**COVERS:** REQ-013

---

### STORY-CLP-001: 剪贴板写入（双路径降级）与复制结果提示

```
TYPE: user_story
ROLE: 作为技术支持，需要每次复制都有明确成功/失败回执
SLICE: UI(复制触发) → 系统(copyText: writeText→execCommand) → 状态({ok,via,reason}) → 反馈(Toast 成功/失败原因) → 追溯(记录 via 路径)

As a 技术支持
I want 复制时优先用剪贴板 API，失败自动降级，无论结果如何都有明确提示
So that 我能确信内容已进入剪贴板，或在失败时知道原因与下一步
```

**CLOSURE_6 闭环**
- 入口：复制按钮触发
- 操作：点击复制 → 系统先 `navigator.clipboard.writeText`，拒绝则 `document.execCommand('copy')`
- 反馈：成功 Toast「已复制到剪贴板」；失败 Toast 显示原因
- 异常：两条路径均失败 → 提示原因（权限/焦点），不静默
- 完成：返回 `{ok, via:'clipboard'|'execCommand'|'none', reason?}`
- 追溯：`via` 路径可见于 Toast/日志（本地）

**INVEST 评估**
- I - Independent: **yes** — 接受文本入参，与拼接器解耦
- N - Negotiable: **yes** — Toast 文案/位置可协商；降级顺序由 ADR-007 定
- V - Valuable: **yes** — 复制成功率与反馈是"最后一公里"可靠性（US-001/US-004）
- E - Estimable: **yes** — 双路径 + Toast，工作量小
- S - Small: **yes** — clipboard.js，约 1 天
- T - Testable: **yes** — AC-011/AC-022 可注入失败模拟验证降级

**PRIORITY:** critical
**RISK:** DevTools 面板焦点导致 `writeText` 被拒（R3）→ 缓解：降级 `execCommand`（隐藏 textarea + select + 恢复焦点）；REQ-034 字面"100%"不可完全保证（R9）→ 缓解：重述为"存在降级路径 + 失败必有提示"（待老板确认，见 §5 缺口）

**ACCEPTANCE**
```
AC-CLP-001-1: 正常路径 — 主路径成功
  Given 剪贴板 API 可用且调用被允许
  When  执行复制
  Then  文本写入系统剪贴板（text/plain）
  And   Toast 显示「已复制到剪贴板」，返回 {ok:true, via:'clipboard'}

AC-CLP-001-2: 正常路径 — 降级成功
  Given navigator.clipboard.writeText 被拒绝/不可用
  When  执行复制
  Then  自动降级 document.execCommand('copy') 并成功
  And   Toast 显示「已复制到剪贴板」，返回 {ok:true, via:'execCommand'}

AC-CLP-001-E1: 异常路径 — 两条路径均失败
  Given writeText 与 execCommand 均失败
  When  执行复制
  Then  Toast 显示失败原因（如「复制失败：剪贴板不可用，请手动选择复制」）
  And   返回 {ok:false, via:'none', reason}
  And   不静默失败

AC-CLP-001-3: 内容不经网络
  Given 复制成功
  When  观察 DevTools Network 面板
  Then  扩展未发出任何新增网络请求（见 STORY-NFR-001）
```

**DEPENDS_ON:** STORY-FMT-001
**SIZE:** M
**COVERS:** REQ-025, REQ-034, REQ-036(clipboard), DEL-007, AC-011, AC-022, US-004

---

### STORY-CONT-001: 大响应 / 二进制 / Base64 内容分类与占位

```
TYPE: user_story
ROLE: 作为后端开发，需要在大响应与二进制响应下仍能安全复制，不被卡死
SLICE: UI(阈值提示) → 系统(classifyBody 分类) → 状态(kind: text/binary/base64-*/unavailable) → 反馈(占位文本/继续确认) → 追溯(size/mimeType)

As a 后端开发
I want 文本响应完整复制；超过阈值时先提示；二进制/Base64 按类型给出规范占位
So that 复制不会因为超大或二进制内容而卡死或因乱码而失去可用性
```

**CLOSURE_6 闭环**
- 入口：复制流程中的内容分类步骤
- 操作：系统按 `encoding` + `mimeType` 分类；超阈值先询问"是否继续"
- 反馈：文本→原样；二进制→`[Binary content omitted: <mime>, <bytes> bytes]`；Base64 文本类→UTF-8 解码；否则→`[Base64 content omitted: length N]`
- 异常：超阈值用户取消 → 中止复制并提示；内容不可用 → 标注
- 完成：返回分类结果 `{kind, text?/placeholder?, byteSize}`
- 追溯：占位符含 mime/字节数/长度

**INVEST 评估**
- I - Independent: **yes** — 纯函数 `classifyBody(responseContent)`
- N - Negotiable: **yes** — 阈值为常量可配（DEC-003 默认 10MB）；占位格式**不可协商**（对外契约）
- V - Valuable: **yes** — 保证极端内容下复制可用（AC-010）
- E - Estimable: **yes** — 判定顺序由 ADR-008 定死
- S - Small: **yes** — content.js，约 1–2 天
- T - Testable: **yes** — 参数化 MIME×encoding 用例

**PRIORITY:** high
**RISK:** 占位符格式漂移导致 AC-010 精确匹配失败 → 缓解：格式常量集中定义 + 逐字符测试；超大响应内存驻留（B-5）→ 缓解：记 size/oversize 标记 + 阈值提示

**ACCEPTANCE**
```
AC-CONT-001-1: 正常路径 — 文本响应完整复制
  Given 响应 MIME 为 text/*（或 application/json）且未超阈值
  When  复制
  Then  响应体原样完整输出

AC-CONT-001-2: 正常路径 — 超阈值提示
  Given 响应内容 size ≥ 阈值（默认 10MB）
  When  点击复制
  Then  先弹出提示「响应较大（约 X MB），是否继续复制？」
  And   用户确认 → 继续；用户取消 → 中止且不写剪贴板（E_OVERSIZE_CANCELLED）

AC-CONT-001-E1: 异常路径 — 二进制省略
  Given 响应 MIME 为 image/png 等二进制类
  When  复制
  Then  输出 [Binary content omitted: image/png, 45678 bytes]（逐字符匹配）

AC-CONT-001-E2: 异常路径 — Base64 非文本类
  Given response.content.encoding = 'base64' 且 MIME 非文本类
  When  复制
  Then  输出 [Base64 content omitted: length 12345]（逐字符匹配）

  Scenario Outline — MIME × encoding 判定矩阵
    Given 响应 content.mimeType={mime}, encoding={encoding}, 字节数={bytes}
    When  执行内容分类
    Then  分类结果 kind={kind}，输出={output}

    Examples:
    | mime               | encoding | bytes  | kind           | output                                              |
    | application/json   | null     | 120    | text           | 原样文本                                            |
    | text/html          | null     | 2048   | text           | 原样文本                                            |
    | application/json   | base64   | 120    | base64-text    | UTF-8 解码后的原样文本                              |
    | application/xml    | base64   | 300    | base64-text    | UTF-8 解码后的原样文本                              |
    | image/png          | null     | 45678  | binary         | [Binary content omitted: image/png, 45678 bytes]    |
    | application/zip    | base64   | 99999  | base64-omitted | [Base64 content omitted: length 99999]              |
    | application/octet-stream | null | 8000  | binary         | [Binary content omitted: application/octet-stream, 8000 bytes] |
    | (空)               | null     | 50     | text           | 原样文本（空 MIME 视作文本）                        |
```

**DEPENDS_ON:** STORY-FMT-001
**SIZE:** M
**COVERS:** REQ-022, REQ-023, REQ-024, DEL-008, AC-010, US-003

---

### STORY-MFT-001: 最小权限 Manifest（仅 clipboardWrite）+ 图标资源

```
TYPE: user_story
ROLE: 作为注重隐私与供应链安全的开发者，绝不接受一个"权限贪婪"的扩展
SLICE: UI(扩展加载无多余权限提示) → 系统(manifest 声明) → 状态(已加载扩展权限清单) → 反馈(加载成功) → 追溯(版本/图标/权限)

As a 对隐私与权限高度敏感的开发者
I want 扩展只申请 clipboardWrite 一项权限，不含 host/tabs/webRequest 等
So that 我敢把它装进日常 DevTools，且商店审核/用户信任成本最低
```

**INVEST 评估**
- I - Independent: **yes** — 纯配置与图标资源，独立可验
- N - Negotiable: **no** — 权限集为硬门禁（AC-009），任何扩张即破坏承诺（R14）
- V - Valuable: **yes** — "最小权限"是产品核心承诺之一（US-001~004 信任基础）
- E - Estimable: **yes** — manifest 字段+图标，工作量小
- S - Small: **yes** — 配置文件 + 4 个 PNG，< 1 天
- T - Testable: **yes** — manifest 静态检查脚本可机械验证

**PRIORITY:** critical
**RISK:** 误加 `host_permissions`/`webRequest` 破坏 AC-009（R14，高影响低概率）→ 缓解：静态检查脚本 + 人工双检；图标缺失导致加载警告 → 缓解：提供 16/32/48/128 全套

**ACCEPTANCE**
```
AC-MFT-001-1: 正常路径 — 权限最小化
  Given extension/manifest.json
  When  静态检查 permissions 字段
  Then  permissions === ["clipboardWrite"]
  And   不含 host_permissions / <all_urls> / tabs / webRequest / declarativeNetRequest
  And   manifest_version === 3，devtools_page === "devtools.html"

AC-MFT-001-2: 图标资源齐全
  Given 加载扩展
  When  查看扩展卡片与 icons 字段
  Then  icons 声明 16/32/48/128 且对应 PNG 文件存在、可加载，无资源缺失告警

AC-MFT-001-E1: 异常路径 — 权限扩张被门禁拦截
  Given 有人误将 "tabs" 加入 permissions
  When  运行 manifest 检查
  Then  检查脚本返回 REJECT（错误码 E_PERMISSION_ESCALATION）
  And   阻止进入验收/交付
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** S
**COVERS:** REQ-026, DEL-009, DEL-017, AC-009

---

### STORY-PRV-001: 隐私政策页（不收集 / 不传输 / 全本地）

```
TYPE: user_story
ROLE: 作为把工具推荐给团队的开发者，需要对隐私承诺有据可查
SLICE: UI(隐私入口) → 系统(runtime.getURL 打开静态页) → 状态(静态页面可见) → 反馈(三项声明) → 追溯(页面路径)

As a 需要向团队/商店解释数据处理的开发者
I want 扩展内置一页隐私政策，明确声明不收集、不传输、全本地
So that 我能放心使用与分发，并满足商店审核的隐私披露要求
```

**INVEST 评估**
- I - Independent: **yes** — 静态 HTML，与代码零耦合
- N - Negotiable: **yes** — 文案措辞/排版可协商，三项声明事实不可少
- V - Valuable: **yes** — 合规与信任（US-004 场景）
- E - Estimable: **yes** — 静态页，工作量小
- S - Small: **yes** — 单文件，< 0.5 天
- T - Testable: **yes** — 三项声明文本可断言（AC-020）

**PRIORITY:** high
**RISK:** 文案与实际行为不一致（如暗中存储）→ 缓解：与 STORY-NFR-001 门禁（无 storage/无网络）联动核对

**ACCEPTANCE**
```
AC-PRV-001-1: 正常路径 — 三项声明齐全
  Given 扩展已加载
  When  打开 privacy.html（经 panel 入口或 chrome-extension://<id>/privacy.html）
  Then  页面明确声明：① 不收集数据 ② 不传输数据 ③ 所有操作本地完成

AC-PRV-001-E1: 异常路径 — 入口失效
  Given 隐私入口被点击
  When  目标 URL 不可达（路径错误）
  Then  不产生控制台未捕获异常；记录 E_PRIVACY_URL_INVALID
  And   提供回退说明（docs/USAGE.md 中路径指引）
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** S
**COVERS:** REQ-028(声明侧), DEL-010, AC-020, US-004

---

### STORY-I18N-001: 中文优先界面与 i18n 结构预留

```
TYPE: user_story
ROLE: 作为中文母语开发者，需要界面文案清晰统一
SLICE: UI(所有文案) → 系统(t(key, vars)) → 状态(默认 zh 字典) → 反馈(文案正确显示) → 追溯(字典 key)

As a 中文母语开发者
I want 面板/提示/空态等所有界面文案为中文，且文案集中可扩展
So that 我能无歧义地使用扩展，团队后续也可补英文
```

**INVEST 评估**
- I - Independent: **yes** — 字典+取值函数独立
- N - Negotiable: **yes** — 具体措辞可协商；结构预留为硬要求
- V - Valuable: **yes** — 可用性与本地化基础（AC-016）
- E - Estimable: **yes** — 集中文案表，工作量小
- S - Small: **yes** — i18n.js + 键，< 0.5 天
- T - Testable: **yes** — 无硬编码中文散落 + 默认 zh 可断言

**PRIORITY:** medium
**RISK:** 文案硬编码散落导致后续无法国际化 → 缓解：所有可见文案经 `t(key)`；ADR-002 ESM 结构

**ACCEPTANCE**
```
AC-I18N-001-1: 正常路径 — 中文文案
  Given 面板/Toast/空态/按钮渲染
  When  查看所有可见文案
  Then  文案为中文，且来自 i18n 字典（非散落硬编码）

AC-I18N-001-E1: 异常路径 — 缺失 key
  Given 某文案 key 未定义
  When  调用 t(key)
  Then  返回可读回退（key 本身或默认文案），不抛异常
  And   错误码 E_I18N_MISSING_KEY（开发期日志）
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** S
**COVERS:** REQ-033, AC-016

---

### STORY-PKG-001: 打包 ZIP、完整源码与体积/依赖门禁（含 M1–M5 交付节奏）

```
TYPE: user_story
ROLE: 作为分发者，需要可复现、干净、达标的发行包
SLICE: UI(命令/脚本) → 系统(白名单打包 extension/** + LICENSE) → 状态(dist/raw-copy-<ver>.zip) → 反馈(体积校验) → 追溯(版本号单一真源 manifest#version)

As a 需要把扩展交付/分发的维护者
I want 一条命令产出仅含扩展运行内容的 ZIP，并自动校验体积与零依赖
So that 我可以放心分发，且商店/用户拿到的是干净、轻量、可审计的包
```

**INVEST 评估**
- I - Independent: **yes** — 打包脚本独立于运行时代码
- N - Negotiable: **yes** — 打包实现方式（Node zlib / Compress-Archive）可协商
- V - Valuable: **yes** — 交付闭环最后一环（AC-017/AC-019 部分）
- E - Estimable: **yes** — 白名单脚本，工作量小
- S - Small: **yes** — scripts/package.mjs，约 0.5–1 天
- T - Testable: **yes** — zip 内容清单 + 体积可机械验证

**PRIORITY:** high
**RISK:** 手工打包把 `butler/`/`req.txt` 打进去（ADR-010/011）→ 缓解：脚本白名单仅 `extension/**` + LICENSE；体积超限 → 缓解：零依赖原生实现 + 打包时校验

**ACCEPTANCE**
```
AC-PKG-001-1: 正常路径 — 打包产物干净且达标
  Given 源码就绪
  When  运行 scripts/package.mjs
  Then  产出 dist/raw-copy-<version>.zip，仅含 extension/** + LICENSE
  And   zip 体积 < 200KB
  And   包内无 node_modules / 第三方运行时 / butler/ / req.txt / docs/ / .refs/

AC-PKG-001-2: 完整源码与零依赖
  Given 发行包与源码
  When  全仓检查
  Then  extension/** 为完整可加载源码，且无任何第三方运行时依赖（纯原生 JS）

AC-PKG-001-E1: 异常路径 — 体积/内容越界
  Given 打包结果体积 ≥ 200KB 或包含禁用目录
  When  运行打包校验
  Then  返回 REJECT 并列出越界项（错误码 E_PACKAGE_OVERSIZE / E_PACKAGE_CONTAMINATED）
  And   阻止交付
```

**DEPENDS_ON:** STORY-EXT-001, STORY-DOC-001
**SIZE:** M
**COVERS:** REQ-031, REQ-032, DEL-015, DEL-016, DEL-018(里程碑节奏), AC-017

---

### STORY-DOC-001: 安装说明 / 使用说明 / LICENSE

```
TYPE: user_story
ROLE: 作为第一次接触该扩展的用户，需要照文档即可装上并用起来
SLICE: UI(文档) → 系统(load unpacked 步骤/使用流程) → 状态(装好并会操作) → 反馈(文档可照做) → 追溯(版本/许可)

As a 第一次使用的开发者
I want 一份安装说明、一份使用说明和 LICENSE
So that 我能在几分钟内完成安装、学会"选中→复制→粘贴给 AI"，并知晓许可条款
```

**INVEST 评估**
- I - Independent: **yes** — 纯文档
- N - Negotiable: **yes** — 措辞/结构可协商，内容要点不可少
- V - Valuable: **yes** — 上手门槛与合规（AC-019）
- E - Estimable: **yes** — 文档写作，工作量小
- S - Small: **yes** — 3 个文件，约 1 天
- T - Testable: **yes** — 关键步骤与敏感信息警示可断言

**PRIORITY:** medium
**RISK:** 遗漏敏感信息警示（R12）→ 缓解：USAGE 显式警示"复制内容可能含 token/Cookie，请谨慎分享"

**ACCEPTANCE**
```
AC-DOC-001-1: 正常路径 — 安装说明可照做
  Given docs/INSTALL.md
  When  按步骤操作
  Then  可完成 Chrome/Edge 加载已解压扩展（指向 extension/）并看到面板

AC-DOC-001-2: 使用说明覆盖主链路 + 敏感警示
  Given docs/USAGE.md
  When  阅读
  Then  覆盖"打开面板→搜索/过滤→选中→复制→粘贴"流程
  And   含敏感信息警示（可能含 Authorization/Cookie/token）
  And   含"仅本地、不外传"说明

AC-DOC-001-E1: 异常路径 — 许可缺失
  Given 交付包
  When  检查 LICENSE
  Then  存在 MIT 或 Apache-2.0 许可证全文；缺失则 E_LICENSE_MISSING 阻止交付
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** S
**COVERS:** DEL-011, DEL-012, DEL-014, AC-019(文档侧)

---

### STORY-TST-001: 测试用例文档（覆盖 22 条 AC）

```
TYPE: user_story
ROLE: 作为维护者，需要一套可执行的验收用例来防止回归
SLICE: UI(测试用例文档) → 系统(逐条 AC 映射到步骤) → 状态(可执行清单) → 反馈(通过/失败判定) → 追溯(用例↔AC 双向引用)

As a 维护者
I want 一份测试用例文档，逐条覆盖 22 条验收标准
So that 每次变更后我可机械复验核心承诺（尤其 AC-007/AC-009/AC-022）
```

**INVEST 评估**
- I - Independent: **yes** — 文档交付物
- N - Negotiable: **yes** — 文档形式（手动/脚本）可协商
- V - Valuable: **yes** — 质量与可回归性（AC-019）
- E - Estimable: **yes** — 映射已有 AC，工作量小
- S - Small: **yes** — 单文档，约 1 天
- T - Testable: **yes** — 22 条 AC 是否全覆盖可检查

**PRIORITY:** medium
**RISK:** 用例与实现漂移 → 缓解：用例↔AC 编号双向引用 + 关键项（保真/权限/降级）逐字符断言

**ACCEPTANCE**
```
AC-TST-001-1: 正常路径 — AC 全覆盖
  Given docs/TESTCASES.md
  When  对照 spec.json 的 AC-001..AC-022
  Then  22 条均有对应可执行用例（含预期结果），无遗漏

AC-TST-001-E1: 异常路径 — 用例缺失
  Given 某 AC 无对应用例
  When  运行覆盖率检查
  Then  报告缺口（错误码 E_TESTCASE_GAP）并列出缺失 AC 编号
```

**DEPENDS_ON:** STORY-FMT-002, STORY-CLP-001, STORY-MFT-001
**SIZE:** S
**COVERS:** DEL-013, AC-019(测试用例侧)

---

### STORY-NFR-001: 零网络 / 零遥测 / 全本地内存（隐私承诺）

```
TYPE: nfr
SLICE: 系统(全仓静态检查 + 运行时观测) → 状态(无网络调用/无存储) → 反馈(复制期间零新增请求) → 追溯(门禁清单)

AS A 隐私敏感用户
THE SYSTEM MUST 不发出任何网络请求、不使用任何持久化存储、数据仅存 DevTools 内存
MEASURED BY ① 全仓零 `fetch(`/`XMLHttpRequest`/`sendBeacon`/WebSocket 客户端代码；② 复制全过程 DevTools Network 面板无扩展新增请求；③ 无 localStorage/sessionStorage/indexedDB/chrome.storage 读写
```

**INVEST 评估**
- I - Independent: **yes** — 跨切面约束，可用静态扫描独立验证
- N - Negotiable: **no** — 隐私承诺不可协商（REQ-027/REQ-028 硬约束）
- V - Valuable: **yes** — 是产品"可放心使用"的信任基石
- E - Estimable: **yes** — 可通过 grep/脚本机械检查
- S - Small: **yes** — 约束守门，非独立开发工时
- T - Testable: **yes** — AC-008 以 Network 面板观测验证

**PRIORITY:** critical
**RISK:** 依赖或工具链悄悄引入网络/存储 → 缓解：AC-008 门禁 + 打包白名单 + 静态扫描（design §8.3）

**ACCEPTANCE**
```
AC-NFR-001-1: 正常路径 — 复制期间零网络
  Given 打开 DevTools Network 面板并清空
  When  在面板选中请求并执行复制（一次或多次）
  Then  扩展未发出任何新增网络请求（fetch/XHR/beacon/WebSocket 均为 0）

AC-NFR-001-2: 无持久化
  Given 全仓源码
  When  静态扫描 localStorage/sessionStorage/indexedDB/chrome.storage
  Then  零命中

AC-NFR-001-E1: 异常路径 — 违规引入
  Given 代码中出现 fetch( 或 chrome.storage 调用
  When  运行门禁扫描
  Then  返回 REJECT（E_NETWORK_VIOLATION / E_STORAGE_VIOLATION）并阻止交付
```

**DEPENDS_ON:** STORY-EXT-001
**SIZE:** S
**COVERS:** REQ-027, REQ-028(运行时), AC-008

---

### STORY-NFR-002: 性能门禁 — 捕获不拖慢页面 + 1000 条不卡顿

```
TYPE: nfr
SLICE: 系统(捕获回调 O(headers) + 虚拟滚动) → 状态(热路径无重活/恒定 DOM) → 反馈(页面与面板流畅) → 追溯(性能观测)

AS A 正在调试页面的开发者
THE SYSTEM MUST 捕获请求不显著影响被调试页面性能，且 1000 条下列表滚动/搜索/过滤不卡顿
MEASURED BY ① 捕获回调内无 JSON 解析/base64 解码/DOM 操作（代码审查 + 归一化 O(headers)）；② 1000 条下滚动/搜索/过滤无可感知卡顿，DOM 行节点数 ≈ 可视行数 + overscan
```

**INVEST 评估**
- I - Independent: **yes** — 性能约束可独立度量
- N - Negotiable: **yes** — 具体阈值可协商，架构路径已定
- V - Valuable: **yes** — 直接决定日常可用性
- E - Estimable: **yes** — 虚拟滚动+归一化已在设计冻结
- S - Small: **yes** — 约束守门
- T - Testable: **yes** — AC-021 专项验证

**PRIORITY:** high
**RISK:** 高频追加下重排卡顿（R4）→ 缓解：rAF 批处理 + DOM 复用 + 固定行高；回调内重活 → 代码审查门禁

**ACCEPTANCE**
```
AC-NFR-002-1: 正常路径 — 热路径轻量
  Given capture 回调代码
  When  静态审查
  Then  回调内仅字段读取/归一化/store.add/轻量通知，无 JSON 解析、无 base64 解码、无 DOM 操作

AC-NFR-002-2: 1000 条流畅
  Given 列表已捕获 1000 条请求
  When  执行滚动、搜索、过滤
  Then  操作响应流畅（无可感知卡顿），DOM 行节点数 ≈ 可视行数 + overscan

AC-NFR-002-E1: 异常路径 — 性能回退
  Given 渲染退化为全量 DOM（1000 行挂载）
  When  滚动
  Then  判定 FAIL（E_PERF_REGRESSION），要求改回窗口化方案
```

**DEPENDS_ON:** STORY-LIST-001
**SIZE:** S
**COVERS:** REQ-029, AC-021

---

### STORY-NFR-003: Chrome / Edge 双兼容安装与使用

```
TYPE: nfr
SLICE: 系统(同一 extension/ 加载) → 状态(双浏览器可用) → 反馈(面板/复制正常) → 追溯(浏览器版本)

AS A 同时使用 Chrome 与 Edge 的开发者
THE SYSTEM MUST 在最新版 Chrome 与 Edge（Chromium）上均可正常安装与使用
MEASURED BY 两浏览器各完成一次 load unpacked + 面板可见 + 单条复制成功
```

**INVEST 评估**
- I - Independent: **yes** — 兼容性冒烟可独立执行
- N - Negotiable: **yes** — 版本下限可协商
- V - Valuable: **yes** — 覆盖双浏览器用户群
- E - Estimable: **yes** — 同内核，无需分叉
- S - Small: **yes** — 一次冒烟
- T - Testable: **yes** — AC-018 双浏览器冒烟

**PRIORITY:** high
**RISK:** Edge 差异（R5，低）→ 缓解：同 Chromium 内核，仅需一次安装+面板+复制冒烟

**ACCEPTANCE**
```
AC-NFR-003-1: 正常路径 — 双浏览器可用
  Given 最新版 Chrome 与 Edge
  When  分别以加载已解压方式加载 extension/
  Then  两者均能打开「Raw Copy」面板，且单条复制成功（Toast 成功）

AC-NFR-003-E1: 异常路径 — 兼容失败
  Given 某浏览器加载报错或面板缺失
  When  执行冒烟
  Then  判定 FAIL（E_COMPAT_FAIL）并记录浏览器/版本/错误
```

**DEPENDS_ON:** STORY-EXT-001, STORY-CLP-001
**SIZE:** S
**COVERS:** REQ-030, AC-018

---

## 2. 追溯矩阵（Story ↔ US / REQ / AC / DEL）

| Story | US | REQ | AC | DEL | 优先级 | SIZE |
|-------|----|-----|----|-----|:------:|:----:|
| STORY-EXT-001 | US-001~004(入口) | REQ-001, REQ-036(架构) | AC-001 | DEL-001, DEL-002, DEL-017 | critical | M |
| STORY-CAP-001 | US-003, US-004 | REQ-002, REQ-003, REQ-004, REQ-035 | AC-002, AC-013 | DEL-003 | critical | M |
| STORY-LIST-001 | US-003 | REQ-005 | AC-012 | DEL-004 | high | M |
| STORY-LIST-002 | US-002 | REQ-006~009 | AC-003 | DEL-004 | high | M |
| STORY-SEL-001 | US-002 | REQ-010, REQ-011 | AC-004 | DEL-005 | critical | M |
| STORY-FMT-001 | US-001 | REQ-012, REQ-014~018, REQ-021 | AC-005, AC-006, AC-015 | DEL-006 | critical | M |
| STORY-FMT-002 | US-003 | REQ-019, REQ-020 | AC-007, AC-014 | DEL-006 | critical | M |
| STORY-FMT-003 (P2) | — | REQ-013 | — | — | low | S |
| STORY-CLP-001 | US-004 | REQ-025, REQ-034, REQ-036(clip) | AC-011, AC-022 | DEL-007 | critical | M |
| STORY-CONT-001 | US-003 | REQ-022, REQ-023, REQ-024 | AC-010 | DEL-008 | high | M |
| STORY-MFT-001 | US-001~004(信任) | REQ-026 | AC-009 | DEL-009, DEL-017 | critical | S |
| STORY-PRV-001 | US-004 | REQ-028(声明) | AC-020 | DEL-010 | high | S |
| STORY-I18N-001 | — | REQ-033 | AC-016 | — | medium | S |
| STORY-PKG-001 | — | REQ-031, REQ-032 | AC-017 | DEL-015, DEL-016, DEL-018 | high | M |
| STORY-DOC-001 | — | — | AC-019(文档) | DEL-011, DEL-012, DEL-014 | medium | S |
| STORY-TST-001 | — | — | AC-019(用例) | DEL-013 | medium | S |
| STORY-NFR-001 | US-001~004(隐私) | REQ-027, REQ-028(运行时) | AC-008 | — | critical | S |
| STORY-NFR-002 | — | REQ-029 | AC-021 | — | high | S |
| STORY-NFR-003 | — | REQ-030 | AC-018 | — | high | S |

### 2.1 AC 覆盖校验（22/22）

AC-001→EXT, AC-002→CAP, AC-003→LIST-002, AC-004→SEL, AC-005→FMT-001, AC-006→FMT-001, AC-007→FMT-002, AC-008→NFR-001, AC-009→MFT, AC-010→CONT, AC-011→CLP, AC-012→LIST-001, AC-013→CAP, AC-014→FMT-002, AC-015→FMT-001/FMT-002, AC-016→I18N, AC-017→PKG, AC-018→NFR-003, AC-019→DOC-001/TST-001, AC-020→PRV, AC-021→NFR-002, AC-022→CLP. ✅

### 2.2 REQ 覆盖校验（36/36）

REQ-001→EXT, 002~004→CAP, 005→LIST-001, 006~009→LIST-002, 010~011→SEL, 012→FMT-001, 013→FMT-003(P2), 014~018→FMT-001, 019~020→FMT-002, 021→FMT-001, 022~024→CONT, 025→CLP, 026→MFT, 027~028→NFR-001/PRV, 029→NFR-002, 030→NFR-003, 031~032→PKG, 033→I18N, 034→CLP, 035→CAP, 036→EXT(架构)+CLP(clipboard). ✅

### 2.3 DEL 覆盖校验（18/18）

DEL-001/002/017→EXT；003→CAP；004→LIST-001/002；005→SEL；006→FMT-001/002；007→CLP；008→CONT；009→MFT；010→PRV；011/012/014→DOC-001；013→TST-001；015/016→PKG；018→PKG（对齐 M1–M5 节奏）. ✅

### 2.4 US 覆盖校验（4/4）

US-001→FMT-001/CLP；US-002→SEL/LIST-002；US-003→CAP/FMT-002/CONT；US-004→CLP/PRV. ✅

---

## 3. 闭环与断头路（story-gap）检查

| 检查项 | 结论 | 说明 |
|--------|:----:|------|
| 实体闭环（C/R/U/D） | N-A | 无持久化实体（数据仅内存，关闭即销毁，REQ-028）；RequestRecord 为只读瞬时记录，删除由环形淘汰自动完成（AC-013 已覆盖） |
| 状态机闭环 | ✅ | 选中态：none→selected→(evicted→re-selected/none) 有 SEL-001；过滤态：全量↔命中 有 LIST-002；复制态：idle→copying→ok/fail 有 CLP-001 |
| 角色闭环 | ✅ | 前端开发（FMT/CLP）、测试工程师（LIST-002/SEL）、后端开发（CAP/FMT-002/CONT）、技术支持（CAP/CLP/PRV）均有核心动作故事 |
| 界面闭环 | ✅ | 核心动作（打开面板/搜索/过滤/选中/复制/看隐私）全部有 UI 入口故事，无"只有 CLI 无 UI"缺口（本项目无 CLI） |
| UI/系统贯穿 | ✅ | 每条故事均为垂直切片；无"纯后端/纯前端"横向故事 |
| 可测 | ✅ | 每条故事 ≥1 正常流 + ≥1 异常流 AC；关键项含逐字符/参数化断言 |

**发现的缺口（非阻塞）**

| ID | 缺口 | 处置 |
|----|------|------|
| GAP-1 | 无 DOM 渲染 XSS 专项 AC（design 指出 URL/headers/body 为不可信输入，须 `textContent`） | 已并入 STORY-LIST-001（仅 textContent 约束）+ STORY-NFR-001 门禁；建议测试设计员在测试用例中显式覆盖（注入 `<img onerror>` 类 payload） |
| GAP-2 | REQ-034 字面"复制成功率 100%"不可完全保证（R9） | 已重述为 AC-022「存在降级路径 + 失败必有提示」；**待老板确认**（见 §5） |
| GAP-3 | WebSocket/SSE 完整响应体不可得（R1/DEC-006） | 文本类正文缺失已由 STORY-CAP-001-E1 / STORY-FMT-002-E1 保证"必达取回"；WebSocket/SSE 等客观不可获取场景由新增 STORY-CAP-001-E2 以"响应体不可用"边界标注覆盖（2026-10-02 修订） |
| GAP-4 | REQ-013 附加按钮为 P2 | STORY-FMT-003 显式标记 backlog，本期不实现，不阻塞 |

---

## 4. 依赖图（执行顺序建议）

```
STORY-EXT-001 (骨架/M1)
   ├─ STORY-MFT-001 (权限门禁)
   ├─ STORY-CAP-001 (捕获/M2)
   │     ├─ STORY-LIST-001 (列表渲染)
   │     │     ├─ STORY-LIST-002 (搜索/过滤)
   │     │     └─ STORY-NFR-002 (性能门禁)
   │     └─ STORY-SEL-001 (选中)
   ├─ STORY-FMT-001 (模式A复制/M3)
   │     ├─ STORY-FMT-002 (模式B+保真)
   │     ├─ STORY-FMT-003 (P2)
   │     ├─ STORY-CONT-001 (大响应/M4)
   │     └─ STORY-CLP-001 (剪贴板+Toast)
   │           └─ STORY-NFR-003 (双浏览器冒烟)
   ├─ STORY-NFR-001 (隐私门禁)
   ├─ STORY-PRV-001 (隐私页)
   ├─ STORY-I18N-001 (中文/i18n)
   └─ STORY-PKG-001 (打包/M5) ← STORY-DOC-001
                                    └─ STORY-TST-001
```

---

## 5. 待裁决 / 未验证项（供 story-gate 与老板）

| # | 项 | 状态 | 影响故事 |
|---|----|------|---------|
| 1 | DEC-001 面板名 `Raw Copy` / `请求复制` | 按 feasibility 默认 `Raw Copy`（界面中文） | STORY-EXT-001 |
| 2 | DEC-002 HTTP 版本缺失回退 `HTTP/1.1` | 按默认 | STORY-FMT-001 |
| 3 | DEC-003 大响应阈值默认 10MB | 按默认，常量可配 | STORY-CONT-001 |
| 4 | DEC-005 默认模式 A | 按默认 | STORY-FMT-001 |
| 5 | **REQ-034「成功率 100%」→ 重述** | ⚠️ 待老板确认（R9） | STORY-CLP-001 |
| 6 | REQ-013 附加按钮 | 推入 P2 backlog | STORY-FMT-003 |

---

## STORY_SUMMARY

```
- stories: 19（user_story=16, nfr=3, spike=0）
- 按模块:  EXT=1, CAP=1, LIST=2, SEL=1, FMT=3, CLP=1, CONT=1,
          MFT=1, PRV=1, I18N=1, PKG=1, DOC=1, TST=1, NFR=3
- 按工作量: S=10  M=9  L=0        ← 无 L 故事，无需强制拆分
- 按优先级: critical=7  high=7  medium=3  low=1(P2)  very_low=1
            （critical: EXT, CAP, SEL, FMT-001, FMT-002, CLP, MFT, NFR-001 → 计 8 项 critical；见下修正）
- 按价值: 核心链路(MVP)=EXT/CAP/LIST-001/SEL/FMT-001/CLP/MFT
- 覆盖: US 4/4, REQ 36/36, DEL 18/18, AC 22/22（100%）
- AC 完整性: 每故事 ≥1 正常流 + ≥1 异常流 ✅；参数化 Examples: CAP-001(类型), LIST-002(过滤), CONT-001(MIME×encoding)
```

> 修正：critical = 8（EXT-001, CAP-001, SEL-001, FMT-001, FMT-002, CLP-001, MFT-001, NFR-001）；high = 7（LIST-001, LIST-002, CONT-001, PRV-001, PKG-001, NFR-002, NFR-003）；medium = 3（I18N-001, DOC-001, TST-001）；low = 1（FMT-003, P2）。合计 19。

### AI 功能识别

本需求（DevTools 请求捕获与原文复制扩展）**不涉及任何 AI/LLM 能力**：无内容生成、无 Agent 角色、无智能处理、无自动决策。复制出的文本是供用户**自行**粘贴给 AI 的输入，扩展本身在复制/传输链路上零 AI、零网络。

== ai_features ==
| 功能 | 需要的 AI 能力 | 发现者 |
|------|---------------|--------|
| （无） | 无 —— 纯本地确定性文本拼接与剪贴板操作，不涉及 AI | 本 agent |
== end ai_features ==

---

<!-- butler:covers US-001 US-002 US-003 US-004 REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 REQ-006 REQ-007 REQ-008 REQ-009 REQ-010 REQ-011 REQ-012 REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 REQ-018 REQ-019 REQ-020 REQ-021 REQ-022 REQ-023 REQ-024 REQ-025 REQ-026 REQ-027 REQ-028 REQ-029 REQ-030 REQ-031 REQ-032 REQ-033 REQ-034 REQ-035 REQ-036 DEL-001 DEL-002 DEL-003 DEL-004 DEL-005 DEL-006 DEL-007 DEL-008 DEL-009 DEL-010 DEL-011 DEL-012 DEL-013 DEL-014 DEL-015 DEL-016 DEL-017 DEL-018 AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-007 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 AC-017 AC-018 AC-019 AC-020 AC-021 AC-022 -->
