# 用户故事 — 在现有 Raw Copy（Chrome/Edge DevTools MV3）基础上做功能增强

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> 阶段: Phase ③（故事编写）| 日期: 2026-10-02 | 角色: butler-story-writer
> 上游: `requirement.md`（v1.0，53 条机器真源）+ `spec.json`（4 US / 24 REQ / 8 DEL / 17 AC = 53 items）+ `design.md`（Phase ②：3 新模块 + 1 多选包装 / ADR-012..020 / CIA 四维）+ `feasibility.md`（✅ 可执行，VALUE high / RISK medium / EFFORT medium）
> 方法: INVEST 六项逐条 + 垂直切片（UI → 系统行为 → 状态流转 → 用户反馈 → 追溯锚点）+ Gherkin AC（每故事 ≥1 正常流 + ≥1 异常流）+ Scenario Outline 参数化 + 闭环/断头路检查
> 判定锚点: 全部 AC 锚定 `design.md` §10.4 的验证落点；**门禁级约束**——ADR-012（冻结 `selection.js`/`formatter.js`、多选走组合包装）、ADR-013（右键禁走 `chrome.contextMenus`、面板内自绘 DOM）、ADR-015（批量模板）、ADR-016（一次阈值确认覆盖本批）为本文件最高优先级。

---

## 0. 故事地图（Story Map）与垂直切片策略

### 0.1 用户旅程（横轴）× 发布切片（纵轴）

```
用户旅程:     取用入口      →   选中/多选      →   复制输出      →   查看       →   反馈/门禁
              (CTX)            (MULTI)            (CTX/BULK)       (DTL)         (NFR/MFT/DOC)

P0 主链路:   CTX-001 右键弹菜单   MULTI-001 Ctrl/Shift/↑↓
             CTX-002 菜单复制     MULTI-002 全选/复制选中(N)      BULK-001 批量拼接
                                                                  CTX-002 单条等价
P0 查看链:                                                        DTL-001 双击明细
P0 门禁:                                                                           MFT-001 权限/零网络
                                                                                   NFR-001 保真/回归
P1 交付:                                                                           TST-001 测试 / I18N-001 文案
P2 backlog:                                                                        DTL-002 明细内复制
P1 文档:                                                                           DOC-001 使用/覆盖说明
```

### 0.2 切片原则（防"横向切片"）

- **每条故事都是垂直切片**：从"用户在面板行上做什么"出发，贯穿 `UI 事件 → 系统行为 → 内存状态流转 → 用户可见反馈 → 追溯锚点`，单独可交付用户可见价值。
- **不做"前端故事 / 逻辑故事"**：本项目无后端；多个纯逻辑模块（contextmenu/multiselection/bulkformatter/detail）以"其用户可见结果"为切片边界，而非以文件为边界。
- **薄而全 > 深而横**：优先让 P0 三条主链路（右键单条复制 / 多选批量复制 / 双击查看）端到端打通，再补 i18n 与门禁。
- **风险先切**：多选包装（ADR-012）是本次最高回归风险点，独立成故事并显式绑定"冻结模块零改动"AC 与既有 13 用例全回归。

### 0.3 全局角色表（来自 requirement.md §4）

| 角色 | 上下文 | 主要服务故事 |
|------|--------|-------------|
| 前端开发 | 把单条请求+响应原文快速粘给 AI | CTX-001 / CTX-002 |
| 测试工程师 | 多条请求附 Bug 报告 | MULTI-001 / MULTI-002 / BULK-001 |
| 后端开发 | 不复制直接看实发/实收原文 | DTL-001 |
| 技术支持 | 快速取用用户侧请求原文分析 | CTX-001 / CTX-002 / BULK-001 |
| 扩展用户（通用） | 在面板操作（右键/多选/查看/复制） | MFT-001 / NFR-001 / I18N-001 |

### 0.4 冻结契约与门禁（跨故事硬约束）

| 约束 | 来源 | 约束故事 |
|------|------|---------|
| `src/formatter.js`（`buildCopyText`）与 `src/selection.js` **字节级冻结、禁止改动** | ADR-012 / design §3.3 | MULTI-001 / BULK-001 / NFR-001 |
| 右键菜单**只允许面板内自绘 DOM**，禁止 `chrome.contextMenus` | ADR-013 / AC-012 | CTX-001 / MFT-001 |
| 复制主链路唯一出口 = `formatter.buildCopyText → clipboard.copyText` | D-4 / D-5 | CTX-002 / BULK-001 / DTL-002 |
| 所有渲染统一 `textContent`，禁止 `innerHTML`（不可信请求数据） | design §3.3-2 | CTX-001 / CTX-002 / DTL-001 |
| 无网络 / 无持久化 / 零第三方依赖 / 权限仅 `clipboardWrite` | REQ-018..021 / AC-012/013/016 | MFT-001 |

---

## 1. 用户故事

### STORY-CTX-001: 行上右键即选中该行并弹出面板内自绘上下文菜单

```
TYPE: user_story
ROLE: 作为前端开发，取用入口要从"滚动到底部找按钮"降为"行上右键即达"
SLICE: UI(#list-body contextmenu → 弹出 #context-menu) → 系统(命中判定 data-index→recordId + 菜单模型 + 视口 clamp) → 状态(该行被单选选中 + 菜单开合态) → 反馈(菜单贴边不溢出/可关闭/键盘可达) → 追溯(右键菜单至少含「复制请求 + 响应（原始）」)

As a 频繁把请求+响应原文贴给 AI 的前端开发
I want 在请求列表任意一行上右键，该行立即被选中并在指针处弹出一个面板内上下文菜单
So that 我无需离开列表、无需滚动找底部按钮，就能在当前行直接发起复制
```

**CLOSURE_6 闭环**
- 入口：`#list-body` 上的 `contextmenu` 事件（DOM 事件委托，零权限）
- 操作：在 `.row[data-index]` 上右键（`preventDefault` 原生菜单）
- 反馈：`#context-menu` 在指针处（贴边时 clamp 回视口内）显示，该行变为单选选中态（`.is-selected`）
- 异常：右键落在表头 / 空白区 / 未渲染行 → **不弹菜单、不抛异常**，不改动选中集合，记 `E_CTX_NO_TARGET`
- 完成：菜单项含「复制请求 + 响应（原始）」；`Esc` / 点击他处 / 失焦 / 列表滚动 → 菜单关闭，焦点返回列表
- 追溯：命中行 → `recordId`（`data-index` 经当前可见列表映射）；菜单文案经 `data-i18n` 注入；不引用 `chrome.contextMenus`

**INVEST 评估**
- I - Independent: **yes** — 菜单开合/命中/定位可独立验收（右键弹菜单 + 该行选中），不依赖多选与批量
- N - Negotiable: **yes** — 菜单项顺序、定位偏移、关闭时机集合可协商（ADR-013 已定"自绘 + 关闭枚举"，细节可谈）
- V - Valuable: **yes** — 直接兑现老板原话"复制按钮在下面找起来麻烦"的入口痛点（REQ-005 / US-001）
- E - Estimable: **yes** — `contextmenu.js` 纯逻辑（`resolveRowId`/`createMenuModel`/`clampPosition`）签名已在 design §4.2 冻结，可估
- S - Small: **yes** — `src/contextmenu.js` + `panel.html#context-menu` + `panel.js` 委托接线，< 1.5 天
- T - Testable: **yes** — AC-001（命中+弹出+最小菜单项）/ 边界右键无目标 / 键盘可达 均可机械断言

**PRIORITY:** critical
**RISK:** 误用 `chrome.contextMenus` 被迫扩权（feasibility R-03 硬约束）→ 缓解：ADR-013 门禁 + MFT-001 全仓扫描 `chrome.contextMenus`，命中即 REJECT；菜单贴边溢出/滚动残留 → 缓解：`clampPosition` 纯函数 + 关闭时机枚举单测；不可信 URL 经菜单渲染注入 → 缓解：`textContent` + 菜单文案来自常量字典

**ACCEPTANCE**
```
AC-CTX-001-1: 正常路径 — 右键命中行即选中并弹菜单
  Given 列表可见区存在一行请求记录（.row[data-index]）
  When  在该行上触发 contextmenu
  Then  该行被单选选中（.is-selected 高亮）
  And   #context-menu 在指针处显示且未溢出视口
  And   菜单至少含一项「复制请求 + 响应（原始）」
  And   浏览器原生上下文菜单未弹出（preventDefault 生效）

AC-CTX-001-2: 键盘可达性
  Given #context-menu 已打开
  When  按 ArrowDown / ArrowUp 移动并按 Enter
  Then  焦点在菜单项间移动，Enter 执行当前项动作
  And   按 Esc 关闭菜单且焦点返回列表

AC-CTX-001-E1: 异常路径 — 右键无命中目标
  Given 指针位于表头 / 空白区 / 未渲染行（无 .row[data-index]）
  When  触发 contextmenu
  Then  不弹出菜单、不抛异常、不改动选中集合
  And   错误码 E_CTX_NO_TARGET（记录但不中断面板）

AC-CTX-001-E2: 异常路径 — 关闭时机的三选一
  Given #context-menu 已打开
  When  点击面板内他处 / 面板失焦 / 滚动列表（任一）
  Then  菜单关闭且无残留 DOM、无重复监听
```

**DEPENDS_ON:** none（仅复用既有列表渲染；与 STORY-CAP-001/LIST-001 基线已交付）
**SIZE:** M
**COVERS:** REQ-001, REQ-005, DEL-001, AC-001, US-001, US-004

---

### STORY-CTX-002: 右键菜单复制与底部按钮逐字符等价（含 P2 仅请求/仅响应）

```
TYPE: user_story
ROLE: 作为前端开发，右键复制的产物必须与既有复制按钮完全一致，才能放心替代旧入口
SLICE: UI(点击菜单项) → 系统(复用 buildCopyText + clipboard.copyText) → 状态(剪贴板最终文本/成功或失败态) → 反馈(成功 Toast / 失败原因) → 追溯(与 #copy-btn 产物逐字符一致；模式 A/B 各自成立)

As a 前端开发
I want 点击右键菜单「复制请求 + 响应（原始）」时，得到与底部复制按钮逐字符相同的纯文本原文
So that 我能用更易达的右键入口，且输出不因入口不同而改变，粘贴给 AI 时零格式污染
```

**CLOSURE_6 闭环**
- 入口：`#context-menu` 的「复制请求 + 响应（原始）」项（P2：另含「仅复制请求」「仅复制响应」）
- 操作：点击菜单项
- 反馈：成功 Toast（复用 `showToast`）；失败时提示原因（双路径降级 `writeText → execCommand` 均由 `clipboard.copyText` 处理）
- 异常：剪贴板写入失败（DevTools 焦点/权限）→ 走降级路径，仍失败则失败 Toast（错误码沿用基线失败码）
- 完成：剪贴板文本 = `buildCopyText(record, mode, { responseBody })`，与 `#copy-btn` 在**同一模式**下逐字符一致
- 追溯：唯一出口 `formatter.buildCopyText → clipboard.copyText`；右键不重写任何拼接逻辑

**INVEST 评估**
- I - Independent: **yes** — 在 CTX-001 菜单可弹出的基础上，独立验收"菜单复制 ≡ 按钮复制"
- N - Negotiable: **yes** — P2 两项（仅请求/仅响应）是否本期落地可协商（design §10.5：纳入本迭代但非发布阻塞）
- V - Valuable: **yes** — 兑现 REQ-004"等价复制逻辑"，是"右键取代按钮成为主入口"的信任基础
- E - Estimable: **yes** — 复用既有两个冻结/不变模块，工作量集中在菜单项接线
- S - Small: **yes** — `contextmenu.createMenuModel` 增加项 + `panel.js` 动作分派，< 1 天
- T - Testable: **yes** — AC-002（模式 A/B 逐字符）/ AC-003（P2 等价）可确定断言

**PRIORITY:** critical
**RISK:** 在右键路径里重写一份拼接（双份保真逻辑漂移）→ 缓解：强制复用 `buildCopyText`，批量/右键均只做"取哪条"；P2 项与对应 body 注入错位 → 缓解：单测对齐仅请求=空响应体 / 仅响应=空请求侧

**ACCEPTANCE**
```
AC-CTX-002-1: 正常路径 — 模式 A 逐字符等价
  Given 选中一条请求记录
  When  分别点击右键菜单「复制请求 + 响应（原始）」与底部同项按钮
  Then  两次剪贴板文本逐字符一致（=== 字符串相等）
  And   文本为纯文本原始格式，未美化 JSON、未改动响应体

AC-CTX-002-2: 正常路径 — 模式 B 逐字符等价
  Given 面板复制模式切换为模式 B
  When  分别经右键菜单与底部按钮复制同一条请求
  Then  两次剪贴板文本逐字符一致

AC-CTX-002-E1: 异常路径 — 剪贴板写入失败
  Given DevTools 焦点导致 navigator.clipboard.writeText 拒绝
  When  点击右键菜单复制项
  Then  自动降级 document.execCommand('copy')；两次失败才提示失败原因
  And   面板不崩溃、无未捕获异常
```

**Scenario Outline — P2 仅请求/仅响应 与对应按钮等价（参数化）**
```
  AC-CTX-002-3: P2 菜单项等价
    Given 选中一条请求记录，其中 {side} 侧文本非空
    When  点击右键菜单「{menuItem}」
    Then  剪贴板文本 === 底部同项「{menuItem}」的产物
    And   未包含被排除一侧的内容

    Examples:
    | side      | menuItem               | Expected |
    | 请求侧    | 仅复制请求              | 仅含请求块（方法/URL/头/体），无响应块 |
    | 响应侧    | 仅复制响应              | 仅含响应块（状态码/状态文本/头/体），无请求块 |
    | 双侧      | 复制请求 + 响应（原始）  | 请求块 + 响应块，与主按钮逐字符一致 |
```

**DEPENDS_ON:** STORY-CTX-001
**SIZE:** S
**COVERS:** REQ-002, REQ-003, REQ-004, DEL-001, AC-002, AC-003, US-001, US-004

---

### STORY-MULTI-001: Ctrl/Cmd 切换 + Shift 范围多选，且与单击/↑↓ 单选互不破坏

```
TYPE: user_story
ROLE: 作为测试工程师，需要一次圈定多条相关请求而不破坏既有单选习惯
SLICE: UI(行点击带修饰键) → 系统(multiselection 组合包装 selection：toggleAt/rangeTo/move) → 状态({anchorId, selectedIds:Set} 与可见列表剪枝) → 反馈(多行同时高亮、计数变化) → 追溯(选中真源=recordId，与虚拟滚动 DOM 解耦)

As a 提交 Bug 报告的测试工程师
I want 用 Ctrl/Cmd+点击切换单行、Shift+点击按可见顺序选一段，同时保留单击单选与 ↑↓ 键导航
So that 我能在不学习新操作的前提下，快速圈出要随 Bug 附上的那几条请求
```

**CLOSURE_6 闭环**
- 入口：`#list-body` 的行点击（区分无修饰 / Ctrl·Cmd / Shift）
- 操作：单击 / Ctrl·Cmd+单击 / Shift+单击 / ↑↓
- 反馈：选中集合内所有行同时高亮（`has(id)` 判定，非标量相等）；计数变化经 MULTI-002 呈现
- 异常：记录被第 1001 条淘汰 / 过滤条件变化 → 集合按 `setIds`/`onEvict` 剪枝，剔除不可见或已淘汰 id，N 实时收敛
- 完成：`multiselection` 内部以 `{anchorId, selectedIds}` 为真源；`selection.js` 零改动、13 条既有用例零改动回归
- 追溯：选中以 `recordId` 存储（非行索引/DOM），行滑出虚拟窗口再滑回选中态保持

**INVEST 评估**
- I - Independent: **yes** — 多选交互可独立于批量复制与详情验收（高亮/计数/剪枝）
- N - Negotiable: **yes** — ↑↓ 多选态行为已由 ADR-014 定稿（单选移动 + 清空集合），实现细节（集合数据结构）可协商
- V - Valuable: **yes** — US-002 的前置能力；"能圈多条"是批量复制价值的必要条件
- E - Estimable: **yes** — 组合包装方案（ADR-012）与 `multiselection` 接口已在 design §4.2 冻结
- S - Small: **yes** — `src/multiselection.js` + `panel.js` 集合接线 + `renderRow` 集合高亮，1–2 天
- T - Testable: **yes** — AC-004（四语义互不破坏）+ 剪枝/淘汰边界 可机械断言

**PRIORITY:** critical
**RISK:** 就地改 `selection.js` 破坏冻结契约与 13 条既有用例（feasibility R-02）→ 缓解：ADR-012 组合包装、`selection.js` 字节冻结、`nfr` 门禁校验 `git diff` 为空；虚拟滚动行回收导致选中丢失 → 缓解：recordId 真源 + setIds/onEvict 双剪枝；多选态下 ↑↓ 语义歧义（A-6）→ 缓解：ADR-014 定稿"单选移动 + 清空集合"

**ACCEPTANCE**
```
AC-MULTI-001-1: 正常路径 — 四语义互不破坏
  Given 列表可见 5 行（id 1..5），当前无选中
  When  单击 id2；Ctrl/Cmd+单击 id4；Shift+单击 id5；再按 ArrowDown
  Then  单击后集合={2}；Ctrl 后集合={2,4}；Shift 后集合={2,4,5}（以 anchor=4 的可见闭区间）
  And   按 ArrowDown 后回落单选移动，集合被清空为新的单行
  And   任一操作不残留旧高亮、不抛异常

AC-MULTI-001-2: 正常路径 — 选中与虚拟滚动解耦
  Given 选中 id=7，随后滚动使该行滑出可视窗口再滑回
  When  观察该行
  Then  选中态保持（.is-selected 存在），集合仍含 7

AC-MULTI-001-E1: 异常路径 — 淘汰与过滤剪枝
  Given 集合含 id=3，且列表过滤变化使 id=3 不可见（或 id=3 被第 1001 条淘汰）
  When  触发 setIds / onEvict
  Then  集合剔除 3，计数 N 实时减 1
  And   不产生幽灵选中、不抛异常
  And   可见范围内的其它选中项保留

AC-MULTI-001-E2: 异常路径 — Shift 范围跨越隐藏/淘汰项
  Given 可见列表顺序中 id 序列存在被过滤隐藏或被淘汰的中间项
  When  Shift+单击从 anchor 到目标
  Then  范围仅按"当前可见列表顺序"的闭区间选择，自动跳过不可见/已淘汰项
  And   选中集合全部可复制、无失效 id
```

**DEPENDS_ON:** none（复用既有列表/渲染；与 CTX 无强依赖）
**SIZE:** M
**COVERS:** REQ-006, REQ-007, DEL-002, AC-004, US-002

---

### STORY-MULTI-002: 工具栏提供「全选」与「复制选中(N)」入口及实时计数

```
TYPE: user_story
ROLE: 作为测试工程师，需要一键全选当前筛出的请求并看到确切条数
SLICE: UI(#select-all-btn / #copy-selected-btn / #selected-count) → 系统(selectAll + copySelection) → 状态(可见范围选中数 N) → 反馈(按钮启用/禁用 + 计数实时) → 追溯(N = 选中集合 ∩ 当前可见列表)

As a 测试工程师
I want 工具栏提供「全选」与「复制选中(N)」按钮，并实时显示选中条数
So that 我能一键圈定当前筛选结果并确认将复制多少条，避免遗漏或错附
```

**CLOSURE_6 闭环**
- 入口：工具栏 `#multiselect-actions` 容器内 `#select-all-btn` / `#copy-selected-btn` / `#selected-count`
- 操作：点击「全选」；点击「复制选中(N)」
- 反馈：`#selected-count` 实时显示 N；N=0 时「复制选中(N)」禁用；复制后成功/失败 Toast
- 异常：空列表（0 条）或 N=0 → 按钮禁用、无操作、无弹窗；重复点击全选 → 按 ADR-014 语义保持当前可见全选（幂等）
- 完成：`N === selectedIds ∩ 当前可见列表`；「全选」范围 = 当前过滤后可见列表（A-1/A-2）
- 追溯：计数节点 `#selected-count`；复用 `panel.getSelectedIds` / `copySelection` 新导出（ADR-020 追加式）

**INVEST 评估**
- I - Independent: **yes** — 入口与计数可独立于批量拼接模板验收（N 正确 + 按钮态）
- N - Negotiable: **yes** — 按钮放置位置、N=0 时"禁用 vs 隐藏"可协商（ADR-014 采"禁用"）
- V - Valuable: **yes** — 兑现 REQ-008"提供入口 + N 为当前选中条数（实时）"
- E - Estimable: **yes** — 与 MULTI-001 共用集合真源，仅新增渲染与按钮态
- S - Small: **yes** — `panel.html#multiselect-actions` + `panel.js` 接线，< 1 天
- T - Testable: **yes** — AC-005（全选=可见列表；N 实时且等于选中数）可确定断言

**PRIORITY:** high
**RISK:** 「全选」范围误用全量缓存（含被过滤隐藏项）→ 缓解：ADR-014 明确以可见列表为准，与 `data-index` 同源；N 与真实可复制集合漂移 → 缓解：ADR-018 剪枝 + 单测；空选态无提示 → 缓解：N=0 禁用为确定行为

**ACCEPTANCE**
```
AC-MULTI-002-1: 正常路径 — 全选 = 当前可见列表
  Given 列表过滤后可见 8 行，缓存中另有 3 行被过滤隐藏
  When  点击「全选」
  Then  选中集合 = 可见的 8 行（不含隐藏 3 行）
  And   计数显示 N=8

AC-MULTI-002-2: 正常路径 — 计数实时更新
  Given 已选中 3 行
  When  Ctrl+单击加入 1 行、再 Shift 增选 2 行、再取消 1 行
  Then  #selected-count 依次显示 4 → 6 → 5（无延迟滞留）
  And   N 恒等于当前集合大小

AC-MULTI-002-E1: 异常路径 — 空选/空列表
  Given 列表为空（0 条）或选中集合为空（N=0）
  When  查看工具栏
  Then  「复制选中(N)」为禁用态，点击无操作、无弹窗、无异常
  And   「全选」对空列表为禁用态

AC-MULTI-002-E2: 异常路径 — 复制失败提示
  Given N≥1 已选中
  When  点击「复制选中(N)」且剪贴板双路径均失败
  Then  提示失败原因（复用基线失败 Toast），选中集合不被清空
  And   面板不崩溃
```

**DEPENDS_ON:** STORY-MULTI-001
**SIZE:** S
**COVERS:** REQ-008, DEL-005, AC-005, US-002

---

### STORY-BULK-001: 多选批量复制为「序号 + 分隔线 + 每条原样块」的确定性输出

```
TYPE: user_story
ROLE: 作为测试工程师，批量产物必须分段清晰且每条保真，才能直接贴进 Bug 报告
SLICE: UI(复制选中(N) / 右键批量项) → 系统(bulkformatter.joinBlocks 外层聚合，逐条调用 buildCopyText) → 状态(批量字符串，不落盘) → 反馈(一次阈值确认 + 成功/失败 Toast) → 追溯(段边界由 ===== #i/N ===== 唯一确定；N=1 回落单选)

As a 测试工程师
I want 多选后一次复制，输出为按可见列表顺序排列的 N 段、每段带 `#i/N` 序号与分隔线、段内为该条请求+响应原始纯文本
So that 我能把多条请求作为独立证据附到 Bug 报告，且不会把两条内容混淆成一条
```

**CLOSURE_6 闭环**
- 入口：工具栏「复制选中(N)」（N≥2）或右键菜单在 N≥2 时追加的批量项（A-3 二者等价）
- 操作：触发批量复制
- 反馈：成功 Toast（含条数）；批内任一条超阈值时**一次确认覆盖本批**（ADR-016），取消则整批不复制
- 异常：N==1 → **委托单选路径**，输出与单选复制逐字符一致（不加序号/分隔线）；N==0 → 无操作
- 完成：`N≥2` 输出 = `join('\n\n', blocks)`，`block_i = "===== #i/N =====" + "\n" + buildCopyText(record_i, mode, {responseBody_i})`，i 从 1、十进制无补零
- 追溯：顺序 = 可见列表顺序（集合在可见列表中的下标升序）；段内 = 冻结的 `buildCopyText` 原样，无跨条拼接

**INVEST 评估**
- I - Independent: **yes** — 拼接模板可独立于 UI 入口用纯函数断言（N 段/标记/顺序/N=1 回落）
- N - Negotiable: **yes** — 分隔线字符/序号格式在 ADR-015 已定稿为可断言模板，实现细节可谈
- V - Valuable: **yes** — US-002 的核心交付；"不混淆"是可直接贴附的证据质量保证
- E - Estimable: **yes** — `bulkformatter` 签名与模板已在 design §4.2/ADR-015 冻结
- S - Small: **yes** — `src/bulkformatter.js` + `panel.js` 批量入口接线，< 1.5 天
- T - Testable: **yes** — AC-006 可逐字符断言"N 个标记 + N 个原样块"，顺序可断言

**PRIORITY:** critical
**RISK:** 复制一份 formatter 逻辑到 bulkformatter 导致保真漂移（feasibility R-01）→ 缓解：ADR-015 只在外层循环调用冻结的 `buildCopyText`，不重写；多条超阈值弹 N 次打扰（R-06）→ 缓解：ADR-016 一次确认覆盖本批；顺序歧义（列表序 vs 点击序）→ 缓解：ADR-015 定为可见列表序 + 单测

**ACCEPTANCE**
```
AC-BULK-001-1: 正常路径 — N 段确定性输出
  Given 可见列表选中 3 条（列表序 id=2,5,7），模式 A
  When  触发批量复制
  Then  输出含 3 段，段标记依次为 "===== #1/3 ====="、"===== #2/3 ====="、"===== #3/3 ====="
  And   每段正文 === 对应记录的单条 buildCopyText 原样
  And   段序 = 可见列表顺序（2,5,7），非点击先后

AC-BULK-001-2: 正常路径 — 模式 B 保持语义
  Given 复制模式切为模式 B，选中 2 条
  When  批量复制
  Then  每段为模式 B 纯原始块，段间以空行 + 序号标记分隔

AC-BULK-001-E1: 边界 — N=1 回落单选（不加序号）
  Given 经批量入口选中 1 条
  When  触发复制
  Then  输出与单选复制逐字符一致（无 ===== #1/1 ===== 标记）
  And   走单选委托路径

AC-BULK-001-E2: 异常路径 — 批内含超阈值/失败请求
  Given 批内某一条 isOverThreshold 为真（或含状态码 0 / 无响应体 204/304/HEAD）
  When  触发批量复制
  Then  弹一次 confirm（含超限条数与最大体积）；取消则整批不复制
  And   确认后仍逐条按规则输出（无响应体沿用基线标注），不跨条拼接
```

**Scenario Outline — 段边界解析（参数化）**
```
  AC-BULK-001-3: 段数恒等于 N 且无跨条拼接
    Given 选中 {n} 条请求（n 取 2/3/5）
    When  批量复制并解析输出
    Then  分隔标记数量 === {n}，段数 === {n}
    And   任意一段不含另一段的请求/响应标识（无跨条混淆）

    Examples:
    | n | Expected markers |
    | 2 | ["===== #1/2 =====", "===== #2/2 ====="] |
    | 3 | ["===== #1/3 =====", "===== #2/3 =====", "===== #3/3 ====="] |
    | 5 | ["===== #1/5 =====", "===== #2/5 =====", "===== #3/5 =====", "===== #4/5 =====", "===== #5/5 ====="] |
```

**DEPENDS_ON:** STORY-MULTI-001, STORY-MULTI-002
**SIZE:** M
**COVERS:** REQ-009, REQ-010, REQ-011, DEL-003, AC-006, US-002, US-004

---

### STORY-DTL-001: 双击行打开明细抽屉，六要素原文可关闭返回

```
TYPE: user_story
ROLE: 作为后端开发，需要不复制、不污染剪贴板就能直接查看完整原文
SLICE: UI(行 dblclick → #detail-pane 覆盖式抽屉) → 系统(detail.buildDetailText 复用模式 A 口径 + 事件分流 click/dblclick) → 状态(detailRecordId 开合 + 淘汰失效) → 反馈(#detail-body 原文展示、关闭返回列表) → 追溯(内容与复制口径同源；与复制模式 A/B 切换无关)

As a 排查接口问题的后端开发
I want 双击列表某行，在面板内打开该请求的完整明细（方法+URL、请求头、请求体、状态码+状态文本、响应头、响应体）
So that 我能直接查看实发/实收原文，无需先复制再到别处粘贴
```

**CLOSURE_6 闭环**
- 入口：`#list-body` 行 `dblclick`（单击仍只选中，双击才查看）；工具栏/详情无新增权限
- 操作：双击某行 → 打开 `#detail-pane` 覆盖式抽屉（`position:absolute; inset:0`）
- 反馈：`#detail-body`（`<pre>`，`textContent`）按六要素顺序显示原始文本；关闭按钮 / `Esc` / 点击遮罩关闭并返回列表
- 异常：明细打开记录被淘汰 → 自动关闭并提示（`detail.evicted`）；大响应/二进制/Base64 → 复用 `content.classifyBody/isOverThreshold` 规则
- 完成：`buildDetailText(record, resolveBody)` = `buildCopyText(record, MODE_A, { responseBody: classifyBody(...) })`，不随面板复制模式 A/B 变化（A-4）
- 追溯：`detailRecordId` 为真源；列表保持挂载；`#detail-body` 逐字符等于原始响应体，头保持原始顺序

**INVEST 评估**
- I - Independent: **yes** — 从列表双击→查看→关闭可独立验收，不依赖多选/批量
- N - Negotiable: **yes** — 抽屉样式、遮罩透明度、关闭动画可协商（ADR-017 已定"覆盖式抽屉 + 三种关闭方式"）
- V - Valuable: **yes** — US-003 的直接兑现；"查看而不复制"缩短排查路径
- E - Estimable: **yes** — `detail.js` 接口（`buildDetailText`/`createDetailView`）已在 design §4.2 冻结
- S - Small: **yes** — `src/detail.js` + `#detail-pane/#detail-body/#detail-close` + 事件分流，1–2 天
- T - Testable: **yes** — AC-008/009/010 可机械断言（六要素齐备、逐字符相等、关闭与分流）

**PRIORITY:** high
**RISK:** 单击误触发明细（与选中/多选冲突）→ 缓解：ADR-014 事件分流，双击仅追加"打开详情"不改集合；明细引用被淘汰记录悬挂（R-05）→ 缓解：ADR-018 淘汰即自动关闭 + 提示；不可信正文注入 → 缓解：`#detail-body` 用 `textContent`（禁止 innerHTML）

**ACCEPTANCE**
```
AC-DTL-001-1: 正常路径 — 六要素齐备
  Given 列表中一条含完整请求/响应的记录
  When  双击该行
  Then  #detail-pane 打开，#detail-body 含：请求方法与 URL、请求头、请求体、响应状态码与状态文本、响应头、响应体
  And   六要素按此顺序呈现

AC-DTL-001-2: 正常路径 — 原文保真
  Given 该记录响应体为未美化 JSON，头有原始顺序
  When  查看 #detail-body
  Then  响应体逐字符等于原始响应体（无缩进/换行/排序/Markdown）
  And   请求/响应头保持原始顺序
  And   明细不随面板模式 A/B 切换而改变

AC-DTL-001-3: 正常路径 — 关闭返回列表
  Given #detail-pane 已打开
  When  点击关闭按钮 / 按 Esc / 点击遮罩（任一）
  Then  明细关闭，列表仍挂载且原选中态与滚动位置保持
  And   无残留遮挡层

AC-DTL-001-E1: 异常路径 — 单击不打开明细
  Given 列表行可见
  When  单击该行（无双击）
  Then  仅选中，不打开 #detail-pane
  And   多选集合语义不受影响

AC-DTL-001-E2: 异常路径 — 打开中记录被淘汰
  Given #detail-pane 打开记录 id=42
  When  记录 42 被环形缓冲淘汰
  Then  明细自动关闭并提示 detail.evicted
  And   无悬挂引用、无 JS 异常

AC-DTL-001-E3: 异常路径 — 大响应/二进制/Base64
  Given 该记录响应为超阈值大响应 / 二进制 / Base64 文本类
  When  查看明细
  Then  处理规则与基线的复制口径一致（阈值占位/二进制标注/Base64 解码规则）
  And   不因明细展示而改变原始响应体内容
```

**DEPENDS_ON:** none（复用既有 `content.js` 分类与 `formatter` 模式 A）
**SIZE:** M
**COVERS:** REQ-013, REQ-014, REQ-015, REQ-016, DEL-004, AC-008, AC-009, AC-010, US-003

---

### STORY-DTL-002 (P2): 明细视图内提供「复制请求+响应」按钮

```
TYPE: user_story
ROLE: 作为后端开发，在查看明细时可能顺手需要复制同一条原文
SLICE: UI(#detail-pane 内复制按钮) → 系统(复用 buildCopyText + clipboard.copyText) → 状态(剪贴板文本) → 反馈(成功/失败 Toast) → 追溯(产物与主复制按钮一致)

As a 后端开发
I want 在明细视图内一键复制当前查看的这条请求+响应
So that 我无需关闭明细、回到列表选中后再点按钮
```

**CLOSURE_6 闭环**
- 入口：`#detail-pane` 内「复制请求+响应」按钮（P2 可选）
- 操作：点击复制
- 反馈：成功 Toast / 失败原因（复用 `clipboard.copyText`）
- 异常：剪贴板失败 → 双路径降级 + 失败提示；复制不关闭明细
- 完成：产物 === 主复制按钮对同一条记录的产物
- 追溯：唯一出口 `buildCopyText → copyText`，不新增拼接逻辑

**INVEST 评估**
- I - Independent: **yes** — 建立在 DTL-001 之上，可独立验收等价性
- N - Negotiable: **yes** — P2 是否本期落地可协商（design §10.5：非发布阻塞）
- V - Valuable: **medium** — 减少"关闭→选中→复制"往返，价值明确但非核心
- E - Estimable: **yes** — 复用既有复制管线，工作量极小
- S - Small: **yes** — `panel.html` 按钮 + `panel.js` 复用 `buildCurrentCopy`，< 0.5 天
- T - Testable: **yes** — AC-011（产物与主按钮一致）可断言

**PRIORITY:** low（P2, backlog）
**RISK:** 条件性交付不可判定（checklist B: AC-011 为 P2）→ 缓解：显式标记 backlog，本期不实现不阻塞验收；若实现则必须与主按钮逐字符一致

**ACCEPTANCE**
```
AC-DTL-002-1: 正常路径 — 明细复制等价
  Given #detail-pane 打开记录 id=9
  When  点击明细内「复制请求+响应」按钮
  Then  剪贴板文本 === 主复制按钮对 id=9 的产物（逐字符）
  And   明细保持打开、选中态不变

AC-DTL-002-E1: 异常路径 — 剪贴板失败
  Given 剪贴板双路径均失败
  When  点击明细内复制
  Then  提示失败原因，明细不关闭、面板不崩溃
```

**DEPENDS_ON:** STORY-DTL-001, STORY-CTX-002（共用复制管线等价性）
**SIZE:** S
**COVERS:** REQ-017, AC-011, US-003

---

### STORY-MFT-001: 增强后权限/依赖/网络/体积四门禁保持不变（NFR）

```
TYPE: nfr

AS A 项目维护者与隐私敏感用户
THE SYSTEM MUST 在新增右键/多选/查看能力后仍保持最小权限与零外部面
MEASURED BY manifest 权限严格等于 ["clipboardWrite"]、全仓零 `chrome.contextMenus`、零网络 API/storage 关键字、零第三方运行时依赖、解压后总体积 < 200KB
```

**CLOSURE_6 闭环**
- 入口：`manifest.json` + 全仓源码 + 打包脚本
- 操作：新增 4 个纯原生 ESM 模块 + 面板接线后运行门禁脚本
- 反馈：`package.mjs`（权限断言 + 体积 + 零依赖）/ `check-zero-network.mjs` / `check-manifest.mjs` / `check-syntax.mjs` 全 PASS
- 异常：出现 `chrome.contextMenus` / `fetch(` / `chrome.storage` / `localStorage` / `indexedDB` / 外部 import / 体积 ≥200KB → 门禁 FAIL（触发回退）
- 完成：权限清单字节不变；`third-party deps === 0`；解压总体积 < 200KB
- 追溯：`manifest.json#version` bump patch；门禁脚本为唯一判定真源

**INVEST 评估**
- I - Independent: **yes** — 门禁脚本可独立运行，无需等待其它故事
- N - Negotiable: **yes** — 具体门禁脚本内部实现可协商（判定标准由 AC-012/013/016 固定）
- V - Valuable: **yes** — 保住基线"最小权限 + 零网络 + 零依赖"的隐私承诺，是产品立身之本
- E - Estimable: **yes** — 既有 4 个门禁脚本 + manifest 断言已存在，仅需保证新增不触发
- S - Small: **yes** — 无需新逻辑，只做"不破坏"（主要为验证）
- T - Testable: **yes** — 脚本退出码/断言结果可直接判定（AC-012/013/016）

**PRIORITY:** critical
**RISK:** 实现右键菜单时误引 `chrome.contextMenus` 扩权（feasibility R-03, E 高影响/中概率）→ 缓解：ADR-013 门禁 + 全仓扫描 + manifest 断言；新模块命名/注释含禁用关键字被 `check-zero-network` 命中 → 缓解：变量/注释命名避免 `fetch`/`storage` 等词；新增模块抬高体积 → 缓解：纯原生 ESM 极小，远低于 200KB（现状 ~51KB）

**ACCEPTANCE**
```
AC-MFT-001-1: 正常路径 — 权限清单不变
  Given 增强后的 manifest.json
  When  比对 permissions / host_permissions / optional_permissions 全清单
  Then  permissions === ["clipboardWrite"]，host_permissions 与 optional_permissions 缺省/为空
  And   无 <all_urls>、无 webRequest、无 declarativeNetRequest

AC-MFT-001-2: 正常路径 — 零网络 / 零持久化 / 零依赖 / 体积
  Given 增强后全仓
  When  运行 check-zero-network.mjs 与 package.mjs
  Then  零 fetch/XHR/sendBeacon/WebSocket/storage/localStorage/indexedDB 命中
  And   external deps === 0
  And   解压后总体积 < 200KB（双 PASS）

AC-MFT-001-E1: 异常路径 — 误用浏览器菜单 API
  Given 任意新增/修改文件含 chrome.contextMenus 引用
  When  运行门禁
  Then  门禁 FAIL（REJECT），列为不可上线
  And   触发回退条件（ADR-013）
```

**DEPENDS_ON:** none
**SIZE:** S
**COVERS:** REQ-018, REQ-019, REQ-020, REQ-021, DEL-007(门禁侧), AC-012, AC-013, AC-016, US-004

---

### STORY-NFR-001: 冻结契约与保真规则不变 + 基线全量回归（NFR）

```
TYPE: nfr

AS A 依赖既有复制格式的用户
THE SYSTEM MUST 保证单选复制输出逐字符不变、冻结模块未被改动、既有基线用例全部回归通过
MEASURED BY `git diff -- extension/src/formatter.js extension/src/selection.js` 无输出、golden 用例逐字符相等、既有 11 个测试文件 0 失败、大响应/二进制/Base64 规则与基线一致
```

**CLOSURE_6 闭环**
- 入口：冻结模块 + 既有 golden 用例 + 4 门禁脚本
- 操作：实现增强后运行 `node --test tests/*.test.mjs` + `git diff` 冻结校验
- 反馈：全量测试 PASS；冻结模块无 diff
- 异常：任一 golden 失败 / 冻结模块出现 diff → 门禁 FAIL（触发回退）
- 完成：`formatter.buildCopyText` 与 `selection` 状态机行为逐字符/逐语义不变
- 追溯：`tests/formatter.test.mjs`（24 用例 golden）、`tests/selection.test.mjs`（13 用例）为判定基线

**INVEST 评估**
- I - Independent: **yes** — 回归门禁独立于新功能实现，随时可跑
- N - Negotiable: **yes** — 新增测试的组织方式可协商（判定基线固定）
- V - Valuable: **yes** — 冻结契约（DEC-007）是最高优先级约束，破坏即用户可见回归
- E - Estimable: **yes** — 判定方法与基线用例集合已明确（design §9.1）
- S - Small: **yes** — 以验证为主，无需新业务逻辑
- T - Testable: **yes** — 逐字符相等 + git diff 空 为确定性判据（AC-007/014/015）

**PRIORITY:** critical
**RISK:** 多选改造波及 `selection.js`（feasibility R-02）→ 缓解：ADR-012 组合包装 + git diff 门禁；批量拼接改写 formatter 造成保真漂移 → 缓解：ADR-015 只外层调用；大响应/Base64 规则在明细/批量中漂移 → 缓解：复用 `content.classifyBody`，回归 AC-014

**ACCEPTANCE**
```
AC-NFR-001-1: 正常路径 — 冻结契约零改动
  Given 增强实现完成
  When  运行 git diff -- extension/src/formatter.js extension/src/selection.js
  Then  无输出（两文件字节未改）
  And   tests/selection.test.mjs 与 tests/formatter.test.mjs 全部 PASS

AC-NFR-001-2: 正常路径 — 单选 golden 逐字符一致
  Given 一条选自基线 golden 的请求
  When  经单选复制（模式 A 与模式 B）
  Then  剪贴板文本与基线 golden 逐字符相等

AC-NFR-001-3: 正常路径 — 基线全量回归
  Given 既有 11 个测试文件（capture/store/filter/render/selection/formatter/content/clipboard/enrich/i18n 等）
  When  运行 node --test tests/*.test.mjs
  Then  0 失败

AC-NFR-001-E1: 异常路径 — 大响应/二进制/Base64 规则漂移
  Given 超阈值 / 二进制 / Base64 文本类响应
  When  分别经单选复制、批量复制、明细查看
  Then  三者处理规则与基线一致（占位标注/解码规则不变）
  And  不出现新的截断或格式化行为
```

**DEPENDS_ON:** STORY-MULTI-001, STORY-BULK-001, STORY-DTL-001（回归面覆盖三者）
**SIZE:** M
**COVERS:** REQ-012, REQ-022, REQ-023, AC-007, AC-014, AC-015

---

### STORY-I18N-001: 新增右键/多选/明细文案 zh/en 键集对齐

```
TYPE: user_story
ROLE: 作为中文优先的扩展用户，新增界面文案必须与既有语言机制一致
SLICE: UI(菜单项/工具栏/明细/Toast 文案) → 系统(i18n dict 新增键 + t() 回退) → 状态(zh/en 键集相等) → 反馈(切换语言无缺键、无回退到裸键名) → 追溯(全部新增文案经 data-i18n* 注入)

As a 中文优先的扩展用户
I want 右键菜单、多选工具栏、明细视图的所有新增文案都随面板语言正确显示
So that 新增能力在中文/英文下都完整可用，不出现缺失或英文串入中文界面
```

**CLOSURE_6 闭环**
- 入口：`extension/src/i18n.js` 的 `dict`（zh/en 两套）
- 操作：新增 `contextmenu.*` / `multi.*` / `detail.*` 键；页面经 `data-i18n` 注入
- 反馈：切换语言后所有新增文案切换；无缺键回退为原始 key
- 异常：zh/en 键集不等 / 缺键 → `i18n.test.mjs` 校验 FAIL
- 完成：zh 与 en 键集严格相等且值非空
- 追溯：`i18n.test.mjs` 键集校验 + 新增 `data-i18n` 键

**INVEST 评估**
- I - Independent: **yes** — i18n 键集可独立校验，不依赖交互实现
- N - Negotiable: **yes** — 具体中英文案措辞可协商
- V - Valuable: **yes** — 保证新增能力的语言完整性（基线"中文优先"约定）
- E - Estimable: **yes** — 新增键清单明确（菜单/多选/明细）
- S - Small: **yes** — 仅 dict 增项 + 校验，< 0.5 天
- T - Testable: **yes** — 键集相等为确定性判据

**PRIORITY:** medium
**RISK:** zh/en 键集不对称（checklist 指出 DEL-006 原无 AC）→ 缓解：新增键集相等 AC + 既有 `i18n.test.mjs` 扩展校验；硬编码文案绕过 i18n → 缓解：全部经 `data-i18n*` 注入

**ACCEPTANCE**
```
AC-I18N-001-1: 正常路径 — 键集对齐与渲染
  Given i18n.js 已新增右键/多选/明细键
  When  运行 i18n.test.mjs 并在 zh/en 下打开面板
  Then  zh 键集 === en 键集，且所有新增键值非空
  And   菜单/工具栏/明细文案随语言正确显示，无裸键名

AC-I18N-001-E1: 异常路径 — 缺键回退
  Given 某新增键在 en 缺失
  When  以 en 渲染
  Then  命中校验 FAIL（键集不等），不得静默回退到裸 key
  And   记录 E_I18N_MISMATCH
```

**DEPENDS_ON:** STORY-CTX-001, STORY-MULTI-002, STORY-DTL-001
**SIZE:** S
**COVERS:** DEL-006, REQ-001(文案), REQ-008(文案), REQ-013(文案)

---

### STORY-TST-001: 新增 4 个测试文件 + 既有全量回归的测试交付

```
TYPE: user_story
ROLE: 作为项目维护者，需要可执行的测试资产来守住本次增强的契约
SLICE: UI(无) → 系统(node --test 可执行套件) → 状态(测试资产入库) → 反馈(全绿/失败定位) → 追溯(对应用例绑定 AC)

As a 项目维护者
I want 新增 contextmenu / multiselection / bulkformatter / detail 四个测试文件，并将既有 11 个测试文件纳入回归
So that 本次增强的关键契约（右键等价、多选不混淆、明细保真、单条逐字符）有可执行门禁，回归可一键跑
```

**CLOSURE_6 闭环**
- 入口：`tests/*.test.mjs` + `node --test`
- 操作：运行全量测试
- 反馈：全绿；失败时给出用例与期望/实际
- 异常：任一用例失败 → 门禁 FAIL（触发回退）
- 完成：4 个新文件 + 既有 11 文件全部 PASS
- 追溯：每个测试文件头注释声明其覆盖的 AC 编号（如 `// covers AC-006`）

**INVEST 评估**
- I - Independent: **yes** — 测试资产独立于实现，可与实现并行/先行
- N - Negotiable: **yes** — 测试组织与命名可协商（覆盖范围固定）
- V - Valuable: **yes** — 把冻结契约与新增语义固化为可执行门禁
- E - Estimable: **yes** — 覆盖范围（右键等价/多选/拼接/明细/回归）明确
- S - Small: **yes** — 4 新文件（纯函数为主）+ 回归执行，1–2 天
- T - Testable: **yes** — 测试自身以退出码判定

**PRIORITY:** high
**RISK:** 纯逻辑模块（contextmenu/multiselection/bulkformatter/detail）难测 DOM 部分 → 缓解：核心算法抽为纯函数（`resolveRowId`/`clampPosition`/`joinBlocks`/`buildDetailText`）+ DOM 桩；条件性 AC（P2）不可判定 → 缓解：P2 用例显式标记，缺失不计失败

**ACCEPTANCE**
```
AC-TST-001-1: 正常路径 — 新增测试齐备且通过
  Given tests/contextmenu.test.mjs、multiselection.test.mjs、bulkformatter.test.mjs、detail.test.mjs 存在
  When  运行 node --test tests/*.test.mjs
  Then  4 个新文件 + 既有 11 文件全部 PASS，0 失败

AC-TST-001-2: 正常路径 — 用例绑定 AC
  Given 各测试文件头注释
  When  检查覆盖声明
  Then  覆盖 AC-001/002/003/004/005/006/007/008/009/010 中对应的新增用例

AC-TST-001-E1: 异常路径 — 破坏契约即失败
  Given 人为改动 selection.js 或批量模板
  When  运行测试
  Then  对应用例 FAIL 并定位到具体用例
  And   退出码非 0（门禁生效）
```

**DEPENDS_ON:** STORY-CTX-001, STORY-MULTI-001, STORY-BULK-001, STORY-DTL-001
**SIZE:** M
**COVERS:** DEL-007, AC-007, AC-015

---

### STORY-DOC-001: 更新 USAGE/INSTALL 并显式记录多选覆盖原非目标

```
TYPE: user_story
ROLE: 作为扩展使用者与项目干系人，需要文档反映新增能力与需求变更
SLICE: UI(无) → 系统(docs/USAGE.md + docs/INSTALL.md 更新) → 状态(文档入库) → 反馈(使用者可按文档使用右键/多选/明细) → 追溯(记录多选覆盖 req.txt 非目标，单条仍为默认主场景)

As a 扩展使用者与项目干系人
I want USAGE 新增右键/多选/明细三节、INSTALL 说明重新加载方式，并显式记录多选复制覆盖原非目标
So that 新用户能上手三项能力，且需求变更（覆盖"不复制全部请求"）有据可查
```

**CLOSURE_6 闭环**
- 入口：`docs/USAGE.md`、`docs/INSTALL.md`、需求覆盖说明
- 操作：新增三节使用说明 + 覆盖声明
- 反馈：文档与实现一致，可直接照做
- 异常：文档与实现不符 → 审计（data-audit）标记不一致
- 完成：USAGE 含右键/多选/明细三节；INSTALL 含 load unpacked 步骤；覆盖声明含"多选取代原非目标 + 单条仍为默认主场景"
- 追溯：与 requirement.md §7 / spec.md §非目标覆盖声明一致

**INVEST 评估**
- I - Independent: **yes** — 文档可独立编写与验收
- N - Negotiable: **yes** — 文档结构与措辞可协商
- V - Valuable: **yes** — 兑现 REQ-024/AC-017"显式记录变更"，保证可维护性与合规透明
- E - Estimable: **yes** — 更新范围明确（两文档 + 覆盖声明）
- S - Small: **yes** — 文档编辑，< 0.5 天
- T - Testable: **yes** — 内容级判据（三节存在 + 覆盖声明存在）可断言

**PRIORITY:** medium
**RISK:** 文档与需求覆盖记录不一致（checklist 指出 DEL-008 原无 AC）→ 缓解：内容级 AC + 审计；隐私警示缺失（批量可能含多份凭证）→ 缓解：USAGE 增加数据安全警示

**ACCEPTANCE**
```
AC-DOC-001-1: 正常路径 — USAGE 三节齐备
  Given docs/USAGE.md
  When  检查新增内容
  Then  含「右键复制」「多选批量复制」「双击查看明细」三节
  And   含批量内容可能含多份敏感凭证的警示

AC-DOC-001-2: 正常路径 — 需求覆盖声明
  Given 文档与规格
  When  检查覆盖记录
  Then  显式记录"多选复制覆盖 req.txt 非目标：不复制全部请求 / 只复制单条"
  And   声明"单条复制仍为默认与主要场景，格式逐字符不变"

AC-DOC-001-E1: 异常路径 — 文档与实现不一致
  Given 实现新增了详情内复制按钮（P2）但文档未提及，或反之
  When  审计文档覆盖
  Then  标记不一致（data-audit WARN）并要求补齐
```

**DEPENDS_ON:** STORY-CTX-001, STORY-MULTI-001, STORY-BULK-001, STORY-DTL-001
**SIZE:** S
**COVERS:** DEL-008, REQ-024, AC-017

---

## 2. 依赖图（执行顺序建议，对齐 design §11 T1–T5）

```
STORY-CTX-001 (右键入口/DEL-001)          STORY-MULTI-001 (多选包装/DEL-002, 风险最高先做)
   └─ STORY-CTX-002 (菜单复制等价)            └─ STORY-MULTI-002 (工具栏入口/DEL-005)
                                                 └─ STORY-BULK-001 (批量拼接/DEL-003)
STORY-DTL-001 (双击明细/DEL-004)
   └─ STORY-DTL-002 (P2 明细内复制)

STORY-MFT-001 (权限/零网络门禁)  ← 与全部并行，作为门禁
STORY-NFR-001 (冻结/回归门禁)     ← 依赖 MULTI-001 + BULK-001 + DTL-001
STORY-I18N-001 (文案)             ← 依赖 CTX-001 + MULTI-002 + DTL-001
STORY-TST-001 (测试交付)          ← 依赖 CTX-001 + MULTI-001 + BULK-001 + DTL-001
STORY-DOC-001 (文档/覆盖声明)      ← 依赖 CTX-001 + MULTI-001 + BULK-001 + DTL-001

门禁关系（非功能，独立可跑）：
  MFT-001 ─┐
  NFR-001 ─┼─→ 全部功能故事的发布前置（任一 FAIL → 回退，design §9.1）
```

**断头路检查（无孤立故事）**

| 故事 | 上游 | 下游消费者 | 断头路? |
|------|------|-----------|:------:|
| CTX-001 | 基线面板 | CTX-002 / I18N / TST / DOC | 否 |
| CTX-002 | CTX-001 | DTL-002(等价复用) / TST | 否 |
| MULTI-001 | 基线面板 | MULTI-002 / BULK-001 / NFR / TST | 否 |
| MULTI-002 | MULTI-001 | BULK-001 / I18N / TST | 否 |
| BULK-001 | MULTI-001/002 | NFR / TST / DOC | 否 |
| DTL-001 | 基线面板/content | DTL-002 / I18N / NFR / TST / DOC | 否 |
| DTL-002 (P2) | DTL-001/CTX-002 | 用户（可选） | 否（显式 backlog） |
| MFT-001 | 无 | 全部门禁 | 否 |
| NFR-001 | MULTI/BULK/DTL | 全部门禁 | 否 |
| I18N-001 | CTX/MULTI/DTL | 用户 | 否 |
| TST-001 | CTX/MULTI/BULK/DTL | 门禁 | 否 |
| DOC-001 | CTX/MULTI/BULK/DTL | 用户/干系人 | 否 |

---

## 3. 需求覆盖对账（53 items）

| 类别 | 覆盖 | 承接故事 |
|------|:----:|---------|
| US-001 | ✅ | CTX-001 / CTX-002 |
| US-002 | ✅ | MULTI-001 / MULTI-002 / BULK-001 |
| US-003 | ✅ | DTL-001 / DTL-002 |
| US-004 | ✅ | CTX-001 / CTX-002 / BULK-001 / MFT-001 |
| REQ-001..005 | ✅ | CTX-001 / CTX-002 |
| REQ-006..008 | ✅ | MULTI-001 / MULTI-002 |
| REQ-009..011 | ✅ | BULK-001 |
| REQ-012 | ✅ | NFR-001 |
| REQ-013..017 | ✅ | DTL-001 / DTL-002 |
| REQ-018..021 | ✅ | MFT-001 |
| REQ-022..023 | ✅ | NFR-001 |
| REQ-024 | ✅ | DOC-001 |
| DEL-001 | ✅ | CTX-001 / CTX-002 |
| DEL-002 | ✅ | MULTI-001 |
| DEL-003 | ✅ | BULK-001 |
| DEL-004 | ✅ | DTL-001 |
| DEL-005 | ✅ | MULTI-002 |
| DEL-006 | ✅ | I18N-001 |
| DEL-007 | ✅ | TST-001 / MFT-001 |
| DEL-008 | ✅ | DOC-001 |
| AC-001..003 | ✅ | CTX-001 / CTX-002 |
| AC-004..006 | ✅ | MULTI-001 / MULTI-002 / BULK-001 |
| AC-007 | ✅ | NFR-001 |
| AC-008..011 | ✅ | DTL-001 / DTL-002 |
| AC-012..013 | ✅ | MFT-001 |
| AC-014..015 | ✅ | NFR-001 |
| AC-016 | ✅ | MFT-001 |
| AC-017 | ✅ | DOC-001 |

**覆盖结论：53/53 = 100%**（US 4/4、REQ 24/24、DEL 8/8、AC 17/17）。**无 CLI 类条目**（产品为 DevTools 面板 UI，无命令行交付物）。

---

## 4. 待裁决 / 未验证项（供 story-gate 与老板）

| # | 项 | 处置 | 影响故事 |
|---|----|------|---------|
| 1 | DEC-001/002（N 与「全选」范围=可见列表；右键可承载批量项） | 已由 ADR-014 定稿为"可见列表基准 + 右键批量项等价" | MULTI-002 / BULK-001 |
| 2 | DEC-003（明细恒为原始文本，模式 A/B 只影响复制产物） | 已由 ADR-017 定稿 | DTL-001 |
| 3 | DEC-004 / A-5（多选分隔=分隔线+序号） | 已由 ADR-015 定稿为可逐字符断言模板 | BULK-001 |
| 4 | A-6（双击/↑↓ 与多选集合的关系） | 已由 ADR-014 定稿（双击不改集合；↑↓ 单选移动并清空集合） | MULTI-001 / DTL-001 |
| 5 | R-06（多选大响应阈值确认） | 已由 ADR-016 定稿为"一次确认覆盖本批" | BULK-001 |
| 6 | P2 项（REQ-003 仅请求/仅响应、REQ-017 明细内复制） | 纳入本迭代但**非发布阻塞**；DEC-002/R-013 保持 backlog | CTX-002 / DTL-002 |
| 7 | REQ-024/AC-017 记录载体 | 由 DOC-001 落在 USAGE + 规格一致性 | DOC-001 |

> 无遗留阻塞；全部 checklist 歧义项已由 design ADR-012..020 拍板。

---

## 5. 断头路与拆分审查（自审）

| 检查项 | 结论 |
|--------|------|
| 每条故事是否有独立用户可见价值 | ✅ 12/12 均以"用户动作 → 可见反馈"闭环 |
| 三要素齐全（As a / I want / So that） | ✅ 11 条 user_story 全含；MFT/NFR 用 NFR 格式 |
| L 故事拆分 | ✅ 无 L（S=6, M=6, L=0），无需强制拆分 |
| 冻结契约是否被故事无意破坏 | ✅ MULTI-001/BULK-001 显式绑定 ADR-012/015，NFR-001 守门 |
| 权限门禁是否可被绕过 | ✅ CTX-001/MFT-001 双重覆盖（自绘 + 全仓扫描） |
| 跨条混淆风险是否可断言 | ✅ BULK-001 用"N 段 = N 标记"参数化断言 |
| 异常流是否每故事 ≥1 | ✅ 每条故事均含 ≥1 异常/边界 AC |

---

## STORY_SUMMARY

```
- stories: 12（user_story=10, nfr=2, spike=0）
- 按模块:    CTX=2, MULTI=2, BULK=1, DTL=2, MFT=1, NFR=1, I18N=1, TST=1, DOC=1
- 按工作量:  S=6  M=6  L=0        ← 无 L 故事，无需强制拆分
- 按优先级:  critical=6  high=3  medium=2  low=1(P2)
            （critical: CTX-001, CTX-002, MULTI-001, BULK-001, MFT-001, NFR-001
              high: MULTI-002, DTL-001, TST-001
              medium: I18N-001, DOC-001
              low: DTL-002 (P2 backlog)）
- 按价值:    核心链路(P0)=CTX-001/CTX-002/MULTI-001/BULK-001/DTL-001
            门禁(P0)=MFT-001/NFR-001；交付= TST-001/I18N-001/DOC-001；P2=DTL-002
- 覆盖:      US 4/4, REQ 24/24, DEL 8/8, AC 17/17（100%，共 53/53）
- AC 完整性: 每故事 ≥1 正常流 + ≥1 异常/边界流 ✅
- 参数化 Examples: CTX-002(P2 三菜单项), BULK-001(段数 2/3/5)
- 冻结门禁:  selection.js / formatter.js git diff 为空；chrome.contextMenus 零引用；manifest 仅 clipboardWrite
```

---

## 6. 反哺知识（butler/spec/<slug>/stories-written.md 已落盘）

- 本次为"接线型增量"：破坏面集中于 `panel.js` 与 `i18n.js`；两大高风险模块通过"新增包装 + 外层聚合"零侵入 → 故事层显式以 `NFR-001` 守门。
- 关键可测性来源：ADR-015 的批量模板（可逐字符断言）与 ADR-014 的四语义（可机械验证）把 checklist 中"不可判定"的 AC 转成可断言 Gherkin。
- P2 项以显式 backlog 故事承载，避免"条件性 AC 不可判定"污染验收。

---

### AI 功能识别

本需求（Raw Copy 扩展的右键/多选/双击查看增强）**不涉及任何 AI/LLM 能力**：无内容生成、无 Agent 角色、无智能处理、无自动决策。复制/查看链路全为本地确定性 DOM 与字符串操作，零网络、零持久化；文本仅为用户**自行**粘贴给 AI 的输入，扩展本身不含 AI。

== ai_features ==
| 功能 | 需要的 AI 能力 | 发现者 |
|------|---------------|--------|
| （无） | 无 —— 纯本地确定性文本拼接（buildCopyText/bulkformatter）与剪贴板操作，不涉及 AI | 本 agent |
== end ai_features ==

---

<!-- butler:covers US-001 US-002 US-003 US-004 REQ-001 REQ-002 REQ-003 REQ-004 REQ-005 REQ-006 REQ-007 REQ-008 REQ-009 REQ-010 REQ-011 REQ-012 REQ-013 REQ-014 REQ-015 REQ-016 REQ-017 REQ-018 REQ-019 REQ-020 REQ-021 REQ-022 REQ-023 REQ-024 DEL-001 DEL-002 DEL-003 DEL-004 DEL-005 DEL-006 DEL-007 DEL-008 AC-001 AC-002 AC-003 AC-004 AC-005 AC-006 AC-007 AC-008 AC-009 AC-010 AC-011 AC-012 AC-013 AC-014 AC-015 AC-016 AC-017 -->
