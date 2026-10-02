verdict: PASS

# 05 · 独立验证报告 — Raw Copy `[Response Body]`「（响应体不可用）」

> 角色: butler-tester（独立验证，fresh context，只读）
> 日期: 2026-10-02
> slug: `缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢`
> 模式: fix 管线 · 独立验证节点（不修改任何文件；除本报告/知识反哺外无写操作）

---

## 0. 裁决（唯一依据 = 退出码）

```
test: PASS
scope: affected
command (build): node scripts/check-syntax.mjs
command (tests): node --test tests/store.test.mjs tests/capture.test.mjs tests/enrich.test.mjs tests/i18n.test.mjs
framework: Node.js v24.15.0 内置 test runner (node --test) + 零依赖 .mjs 门禁脚本
exit codes: build=0, affected-tests=0, panel-shell=0, zero-network=0, manifest=0, content=0
```

---

## 1. Scope 与变更文件（非 git 仓库）

> 本目录**不是 git 仓库**（`git status` → fatal），无法用 `git diff --name-only`。
> 变更集由 `04-execution-summary.md` §2 文件清单 + 文件 mtime(11:57–11:58) 交叉确认。

**变更的生产文件（4）**

| 文件 | mtime | 说明 |
|------|-------|------|
| `extension/src/capture.js` | 11:58 | +异步 enrich（getContent 双形态）/ applyContent；normalize 零改动 |
| `extension/src/store.js` | 11:57 | +update / 字节预算 maxBytes / pending 五 API |
| `extension/panel.js` | 11:57 | +onUpdate 刷新 / 复制前 awaitPending 竞态 |
| `extension/src/i18n.js` | 11:57 | +`content.fetching` / `copy.fetchingTimeout`（zh/en 对齐） |
| `extension/src/content.js` | 10:43 | **未改**（仅核验，符合执行摘要） |

**变更的测试文件（4）**

| 文件 | mtime | 用例数 |
|------|-------|:------:|
| `tests/store.test.mjs` | 11:58 | 17 |
| `tests/capture.test.mjs` | 11:58 | 19 |
| `tests/enrich.test.mjs`（新增） | 11:58 | 11 |
| `tests/i18n.test.mjs` | 11:58 | 5 |

`changed_files: 8` ｜ `affected_test_files: 4` ｜ `must_run: 4（=变更测试文件全集，已在 affected 内）+ 历史失败 0`

---

## 2. 反向依赖（affected 计算依据）

对变更生产文件的**反向依赖**（哪些测试 import 了变更模块）:

| 变更模块 | 反向依赖测试 |
|----------|--------------|
| `extension/src/store.js` | store.test.mjs, capture.test.mjs, enrich.test.mjs |
| `extension/src/capture.js` | capture.test.mjs, enrich.test.mjs |
| `extension/src/i18n.js` | i18n.test.mjs |
| `extension/panel.js` | 无 .test.mjs 直接 import → 由静态门禁 `check-panel-shell.mjs`（34 项 DOM 契约）覆盖 |

**affected 集合 = { store, capture, enrich, i18n }**，与 `npm test` 全集的差集为
`{ clipboard, filter, formatter, render, selection }` —— 这 5 个测试**只 import 未变更模块**
（clipboard.js / filter.js / formatter.js / render.js / selection.js），不存在到变更集的 import 边，
故不构成反向依赖者。

> 工具注释：Node 无内置 `--findRelatedTests`，故按「静态 import 反向查询」实现 affected（等价 jest 静态依赖图），
> 未降级为 module/full。

---

## 3. 实证输出（逐条）

### 3.1 build / lint（全仓语法门禁，changed 文件全部命中）
```
$ node scripts/check-syntax.mjs
[PASS] extension/panel.js
[PASS] extension/src/capture.js
[PASS] extension/src/i18n.js
[PASS] extension/src/store.js
... (11/11)
[check-syntax] 11/11 files passed   EXIT=0
```

### 3.2 affected 测试（裁决依据）
```
$ node --test tests/store.test.mjs tests/capture.test.mjs tests/enrich.test.mjs tests/i18n.test.mjs
ℹ tests 52
ℹ pass 52
ℹ fail 0
EXIT=0
```
拆解: store 17 + capture 19 + enrich 11 + i18n 5 = 52（与执行摘要 §2 声明一致）。

### 3.3 变更文件相关静态/安全门禁
```
$ node scripts/check-panel-shell.mjs   → == RESULT: PASS (34/34 项)   EXIT=0   （panel.js 已变更）
$ node scripts/check-zero-network.mjs  → [check-zero-network] 17/17 项通过  EXIT=0
                                         （extension/ 无网络调用、无持久化、无遥测）
$ node scripts/check-manifest.mjs      → == RESULT: PASS (17/17 项)   EXIT=0   （AC-009 权限不变）
```

### 3.4 链路相邻单元测试（content.js 未变更，但为 enrich 的依赖）
```
$ node --test tests/content.test.mjs   → tests 19 / pass 19 / fail 0   EXIT=0
```

---

## 4. 独立断言核查（不采信测试名称，抽读断言体）

| AC/REQ | 独立核查方式 | 结论 |
|--------|--------------|------|
| AC-001 / REQ-012a | `enrich.test.mjs:74-119` 用「无 content.text + 回调/Promise getContent」entry，断言 `record.responseContent.text === 桩正文` 且 `store.get(id)===record` | ✅ 真实取回，非占位 |
| AC-004 / REQ-002 | `enrich.test.mjs:247-251` 断言 `normalize()` 返回值 `typeof .then === 'undefined'` 且非 Promise | ✅ 纯同步保持 |
| AC-005 / REQ-003 | `enrich.test.mjs:87` / `:104` `assert.equal(store.get(1), record)` | ✅ 同引用回填 |
| AC-006 / REQ-004 | `enrich.test.mjs:125-142` base64+文本 MIME → `encoding==='base64'`，`classifyBody` 得 `base64-text`，UTF-8 含中文/emoji 往返相等 | ✅ |
| AC-007 / REQ-006 | `enrich.test.mjs:204-241` pending → awaitPending 挂起/回调后 resolve；超时抛 `E_PENDING_TIMEOUT`，不永久挂起 | ✅ 竞态有明确终止 |
| AC-010 / REQ-011 | `tests/capture.test.mjs` 内 `text === null` 终态断言已删除（仅剩 130 行注释说明）；新增缺失路径 3 用例（:280/:308/:323） | ✅ 缺陷期望已移除 |
| AC-008 / REQ-005 | `store.test.mjs` 环形 1000/顺序/淘汰语义用例 + `update` 不改变顺序 | ✅ |
| AC-009 / REQ-009 | `store.test.mjs` `bytesInUse` 增长 / `maxBytes=64MB` 淘汰最旧 / `update` 增量入账淘汰 | ✅ |
| AC-013 / REQ-013（字符级保真） | `enrich.test.mjs:148-172` 逐 UTF-16 码元 `charCodeAt` 全等 + `buildCopyText` 输出以原文结尾 | ✅ |
| AC-002（真机侧） | 单测侧以同形 401 紧凑 JSON 逼近（`enrich.test.mjs:178-198`） | ⏭️ 真机未做（见 §5） |
| AC-012（文档一致性） | `design.md/feasibility.md/stories-written.md` 未修订（TASK-008 未执行） | ⏭️ 未闭环（见 §5） |

i18n 新增键独立核查: `extension/src/i18n.js:65/100/149/184` 存在 `copy.fetchingTimeout`、`content.fetching`
且 zh/en 双语齐备；`i18n.test.mjs` 断言键集对齐 PASS。

---

## 5. 未覆盖清单（INV-1 强制声明）

| 未覆盖项 | 依据 | 影响 | 置信度 |
|----------|------|------|--------|
| `tests/{clipboard,filter,formatter,render,selection}.test.mjs` | 其 import 仅指向**未变更**模块（clipboard/filter/formatter/render/selection），非任何变更文件的反向依赖者 | 低（无 import 边，本次变更不可能影响） | high |
| TASK-008 文档边界修订（design.md:243/319/337、feasibility.md:77、stories-written.md:156-158/497-500） | 执行摘要 §1 标注「未执行（非 butler-rf-fixer 范围）」；本节点只读验证 | 中（AC-012 不成立，RC-2 未闭环，存在复发风险） | high |
| TASK-009 真机 401 字符级 E2E（AC-002 最终裁决面） | 需真实 Chrome/Edge + `auth.autional.cn` 401 请求；非本节点能力 | 中（单测已同形逼近，真机逐字符未证） | high |
| `getContent` 在真实 Chrome 151+ 的 Promise 形态 | 单测以桩模拟 `Promise.resolve({content,encoding})` | 低-中（桩覆盖两形态，真机未验） | medium |

> 未运行 `scope=full` 的理由：变更模块的反向依赖者已全部包含在 affected 集中（§2），
> 且非 git 仓库无法用 `--changedSince`；按「变更范围优先」原则，affected 已构成充分覆盖面。
> 本节点**未**触发发布门，故不升 `full`。

---

## 6. 回归判定（regression_block）

```
regression_block: false
regression_baseline: null
regression_first_seen: null
```
依据：`butler/learned/butler-tester.md` 的 `historical_failures` 列表为空（该文件存在但无历史失败条目），
本次 affected 52/52 PASS，无失败签名需要比对。

---

## 7. 结论

- **verdict: PASS**（scope=affected）。
- 核心缺陷 RC-1（未调用 `harEntry.getContent()`）在单测层面已被独立证实修复：无 `content.text` 的
  entry 经回调/Promise 双形态 enrich 后，**同一条 store 记录**回填真实正文，401 紧凑 JSON 逐字符保真，不再输出「（响应体不可用）」。
- RC-3（测试错误断言）已移除；RC-3b（内存预算）有界淘汰有测试固化；`normalize` 纯同步契约保持。
- **残留（不阻断本次 PASS，但阻断规格终态）**：AC-002 真机 E2E（TASK-009）与 AC-012 文档一致性（TASK-008）未完成。

### degradations
```
=== degradations ===
- agent: "butler-tester"
  reason: "非 git 仓库，无法用 git diff 自动取变更集；改用执行摘要文件清单 + mtime 交叉确认"
  impact: "变更集可能存在未登记文件（已用全量生产文件 mtime 比对，未见其它 11:5x 变更文件）"
  severity: "LOW"
=== end degradations ===
```
