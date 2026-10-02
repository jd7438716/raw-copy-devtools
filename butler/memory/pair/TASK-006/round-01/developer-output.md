# developer-output — TASK-006 Round 1

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> 交付物: DEL-006 复制拼接核心（请求 + 响应原文，模式 A/B，逐字符保真）
> 覆盖: REQ-014..020 / AC-005/006/007/014/015 / US-001..004
> agent: butler-developer | 日期: 2026-10-02

## ⚠️ 真源冲突裁决（必须知晓）

任务描述对本任务的**模式 A 渲染**转述（元信息用 `# started:` 行、且未提 body 段标签）与
**被点名的设计真源**不一致：

| 真源 | 模式 A 元信息 | body 段标签 |
|------|---------------|-------------|
| 任务描述转述 | `# started:` / `# time:` 行，位于 REQUEST 段内 | 未提（看似不加） |
| **design.md ADR-006（门禁级，被点名为"模式 A 输出标记逐字符契约"）** | 仅允许出现在**标题段** | `[Request Body]` / `[Response Body]` |
| plan.md STORY-CORE-003 / FMT-001（逐字） | 标题段 | `[Request Body]` / `[Response Body]` |
| USAGE.md / docs/USAGE.md（用户手册示例） | `===== META =====` + 中文标签 | `[Request Body]` / `[Response Body]` |
| i18n.js | `copy.metaHeader='===== META ====='` / `copy.meta.started` 等键 | `copy.requestBody` / `copy.responseBody` |
| spec.json REQ-018 | 模式 A 带 `===== REQUEST =====` / `===== RESPONSE =====` 标题 | — |

按「**design.md 为设计真源；ADR-006 模式 A 输出标记逐字符契约**」的明确指示，本实现采用
**ADR-006 / USAGE.md 渲染**（`===== META =====` 标题段 + 中文元信息行；`[Request Body]` /
`[Response Body]` 段标签），以保证与 5 份既有产物（design / plan / USAGE / docs / i18n）一致。
若评审要求任务转述的 `# started:` 渲染，仅需替换 `buildMetaLines()` 的标签/前缀，**body 保真不受影响**。

## 交付文件

| 文件 | 类型 | 说明 |
|------|:----:|------|
| `extension/src/formatter.js` | **new** | 纯函数拼接核心：`MODE_A='formatted'` / `MODE_B='raw'`；`buildCopyText(record, mode, options)` |
| `tests/formatter.test.mjs` | **new** | node:test 24 用例（含 AC-007 逐码元断言 + golden 契约） |
| `extension/panel.js` | **edit（仅追加接线）** | import formatter；`buildCurrentCopy()` / `getLastCopyText()`；`#copy-btn` 点击生成文本；模式切换用 MODE_A/MODE_B；留 `// TODO: TASK-007 clipboard` |

## 实现要点

- **单条隔离**：`buildCopyText(record, …)` 只读传入的单条记录，结构性保证 AC-006 / REQ-014。
- **模式 A 结构**（ADR-006 / USAGE.md 逐字符）：
  `===== META =====`（started/time/type/mime，缺失整行跳过）→ 空行 → `===== REQUEST =====` →
  请求行 + 头（原序）→（有体：空行 + `[Request Body]` + body）→ 空行 →
  `===== RESPONSE =====` → 状态行 + 头（原序）→（有体：空行 + `[Response Body]` + body）。
- **模式 B 结构**：请求块（请求行 + 头 + 空行 + body）→ 空行 → 响应块（状态行 + 头 + 空行 + body），
  **无**任何标题/段标签/元信息。
- **保真**：body 一律字符串直通；不 `JSON.parse`/`stringify`、不缩进/换行/排序、不压缩、
  不替换字符、不转 Markdown、不截断（REQ-020 / AC-007）。
- **httpVersion** 缺失/空 → 回退 `HTTP/1.1`（DEC-002，请求行与响应行同时生效）。
- **头**：支持 `{name,value}` 与 `string` 行；按数组原序输出 `Name: Value`，不排序/去重/合并同名（AC-014）。
- **options**：`requestBody` / `responseBody` 显式覆盖（供 TASK-008 注入分类后 body）；
  `includeMeta !== false` 控制 META 段（默认输出）。
- **纯度**：纯函数、零副作用、零浏览器 API、零第三方依赖；可在 Node 直接 import。

## 逐字符保真证据（真实执行输出）

### 1) `node --test tests/formatter.test.mjs` → 24/24 PASS

```
✔ 常量：MODE_A / MODE_B 与逐字符段标记（ADR-006）
✔ AC-007：响应体含不规则空白/转义/Unicode 时逐字符原样输出（模式 A）
✔ AC-007：模式 B 同样逐字符保真
✔ AC-007：两种模式的 body 子串逐 UTF-16 码元一致（仅外壳不同）
✔ AC-007：元信息块存在时仍不破坏 body（body 逐字符）
✔ AC-006：只输出传入的单条记录，绝不附带其他请求
✔ AC-015：模式 A 含 REQUEST/RESPONSE/META 标题；模式 B 完全不含
✔ AC-015：mode 缺省为模式 A（DEC-005）
✔ AC-005：模式 A 完整结构逐字符契约（golden）
✔ AC-019：模式 B 完整结构逐字符契约（golden）
✔ AC-014：请求头/响应头按原始顺序输出，不排序/不去重/不合并同名
✔ AC-014：兼容 string 头行
✔ REQ-015：httpVersion 缺失/为空时回退 HTTP/1.1（请求行与响应行）
✔ REQ-015：httpVersion 存在时原样使用（如 HTTP/2）
✔ 无请求体（GET/HEAD）：不输出 [Request Body]，无空行残留
✔ 204/304 空响应体：不输出 [Response Body]，无多余空行
✔ 响应体为 null（不可用）：不输出 [Response Body]，且不抛异常
✔ 非对象 record：返回空串（不抛异常）
✔ 空字符串 body 不产出段标签（无多余字符）
✔ options.requestBody / options.responseBody 覆盖生效
✔ options.responseBody 覆盖为空串 → 不产出响应体段
✔ options.includeMeta=false → 不输出 META 段；默认真源含 META
✔ 元信息字段缺失时整行跳过（不产空标签）
✔ 纯函数：多次调用结果稳定且不修改入参
ℹ tests 24 | pass 24 | fail 0
```

关键断言（AC-007）输入响应体（含字面反斜杠转义 + Unicode + 不规则双空格）：
```js
'{"a":1,  "b":"line\\nbreak","uni":"中文😀","esc":"\\u0041","sp":"a\\tb","arr":[3,2,1]}'
```
断言：`out.indexOf(json) !== -1`；`Array.from(out.slice(...))` 与 `Array.from(json)` 逐码元
`deepEqual`；`out.slice(...) === json`；且**不**含 `JSON.stringify(JSON.parse(json),null,2)`、
不含 ` ``` `、不含 `\t`。全部 PASS。

### 2) 双模式逐码元比对（独立脚本真实输出）

```
mode=formatted  indexOf=295  substring===source: true  firstDiffCodepoint=-1  srcLen=61
mode=raw        indexOf=126  substring===source: true  firstDiffCodepoint=-1  srcLen=61
```

### 3) 全量回归 + 门禁

```
$ node --test "tests/**/*.test.mjs"
ℹ tests 90 | pass 90 | fail 0

$ node scripts/check-syntax.mjs      → [check-syntax] 9/9 files passed
$ node scripts/check-panel-shell.mjs → == RESULT: PASS (34/34 项) ==
$ node scripts/check-zero-network.mjs→ == RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
```

## 自评

- [x] 符合 CONSTITUTION 红线（零依赖、无网络、无持久化、textContent-only 渲染未触碰）
- [x] 符合 conventions.md / design.md §5.3 冻结接口（`buildCopyText(record,mode)` + `MODE_A/MODE_B`）
- [x] 错误处理已覆盖（非对象 record / null body / 缺字段 → 降级不抛异常）
- [x] 单元测试已覆盖（24 用例：AC-005/006/007/014/015 + REQ-015/017 + 边界 + 纯度）
- [x] AC-007 逐字符保真已机械可验（逐 UTF-16 码元断言 + golden）
- [x] 未改 manifest.json；未创建 TASK-007/008 文件；未写剪贴板（留 TODO(TASK-007)）
- [x] `panel.js` 无中文字符串字面量（文案走 `t()`），check-panel-shell PASS

## 交接

- `buildCurrentCopy(mode?)` / `getLastCopyText()` 供 TASK-007 消费；`#copy-btn` 已接线（生成文本，未写剪贴板）。
- TASK-007 只需：`clipboard.copyText(buildCurrentCopy(copyMode))` → `showToast(t('toast.copied'|'toast.copyFailed'))`。
- TASK-008 用 `buildCopyText(record, mode, { requestBody, responseBody })` 注入分类后的 body（覆盖已就绪）。
