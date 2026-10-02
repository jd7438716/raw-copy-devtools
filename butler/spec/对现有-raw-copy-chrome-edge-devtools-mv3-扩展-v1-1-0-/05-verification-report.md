verdict: PASS

# 05 · 独立验证报告 — Raw Copy v1.1.0 三项修复/调整（fresh context · 只读复验）

- **slug**：`对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-`
- **日期**：2026-10-02
- **角色**：butler-tester（独立验证 · fresh context · 只读 · 未复用上游结论）
- **scope**：`affected`（变更文件 ∪ 反向依赖者测试 ∪ 必跑集）——非全量；**未触发安全回退**，未降级
- **运行环境**：Node v24.15.0 / Windows（git-bash）
- **裁决依据**：进程退出码（exit code），非日志文本
- **结论**：`PASS` — affected 5 测试文件 **141/141** 全绿（exit=0）；`build/check-syntax` 15/15；3 项门禁全 PASS；发行 ZIP `unzip -t` 零错误、manifest 读回一致；移除特性仅存**负向断言/文档**，源码零功能残留。

---

## 1. 变更范围识别（本项目非 git 仓库）

`git status` / `git diff` → `fatal: not a git repository`，无 VCS 可用。独立做法：以源码改动 **mtime 窗口 16:34–16:46** 取变更，并与 `04-execution-summary.md §5 改动文件清单` 交叉核对，二者一致。

**变更文件（实证 mtime）**：

| 类别 | 文件 | mtime |
|------|------|-------|
| 源码 | `extension/src/multiselection.js` | 16:34:12 |
| 源码 | `extension/src/contextmenu.js` | 16:34:23 |
| 源码 | `extension/panel.js` | 16:35:37 |
| 源码 | `extension/panel.html` | 16:35:47 |
| 源码 | `extension/styles/panel.css` | 16:35:54 |
| 源码 | `extension/src/i18n.js` | 16:36:03 |
| 门禁 | `scripts/check-panel-shell.mjs` | 16:36:06 |
| 测试 | `tests/i18n.test.mjs` | 16:37:36 |
| 测试 | `tests/multiselection.test.mjs` | 16:37:48 |
| 测试 | `tests/formatter.test.mjs` | 16:38:02 |
| 测试 | `tests/bulkformatter.test.mjs` | 16:38:06 |
| 测试 | `tests/panel-harness.mjs` | 16:38:18 |
| 测试 | `tests/contextmenu.test.mjs` | 16:38:20 |
| 文档 | `tests/test-cases.md` / `tests/README.md` | 16:40:37 / 16:40:57 |
| 文档 | `USAGE.md` / `INSTALL.md`（含 `docs/` 镜像） | 16:39–16:40 |
| 发行 | `dist/raw-copy-1.1.0.zip` | 16:46:19 |

**冻结文件（mtime 早于本轮窗口，逻辑未改）**：`extension/src/selection.js`(10:34)、`extension/src/formatter.js`(10:38)、`extension/src/bulkformatter.js`(12:37)。

**安全回退检查（§34.3）**：变更集未命中 `*.lock / package-lock / yarn.lock / go.sum / Cargo.lock / .github / CI 配置 / schema.* / types / models / *.config.* / *.env* / 未知扩展名` → **不升 `full`**，维持 `affected`。

---

## 2. affected 计算（确定性：import 图反查，非 LLM 自由裁量）

`node:test` 无 jest 静态依赖图。独立以 `import` 图反查「被改模块的消费测试」：

| 变更模块 | 反向依赖测试 | 依据（实测 import 行） |
|----------|-------------|------------------------|
| `extension/src/multiselection.js` | `tests/multiselection.test.mjs` | `tests/multiselection.test.mjs:7` `from '../extension/src/multiselection.js'` |
| `extension/src/i18n.js` | `tests/i18n.test.mjs` | `tests/i18n.test.mjs:6` `from '../extension/src/i18n.js'` |
| `extension/src/contextmenu.js` | `tests/contextmenu.test.mjs` | `tests/contextmenu.test.mjs:31` `from '../extension/src/contextmenu.js'` |
| `extension/panel.js` | `tests/contextmenu.test.mjs`（经 harness） | `tests/panel-harness.mjs:307` `await import('../extension/panel.js')`（真实加载，非模型复制品） |
| `extension/panel.html` / `panel.css` | 门禁 `check-panel-shell.mjs`（DOM/CSS 契约） | html id + css 变量断言 |
| `scripts/check-panel-shell.mjs`（门禁自身被改） | 直接运行该门禁 | — |

**必跑集（§34.2 强制）**：
1. 本轮新增/修改测试文件：`i18n`、`multiselection`、`formatter`、`bulkformatter`、`contextmenu`（含 `panel-harness.mjs`）——**全部纳入**。
2. 历史失败测试（`butler/learned/butler-tester.md#historical_failures`）：**不存在该小节，视为空** → 无追加。

**最终 affected 命令**：
```
node --test tests/i18n.test.mjs tests/multiselection.test.mjs tests/formatter.test.mjs \
           tests/bulkformatter.test.mjs tests/contextmenu.test.mjs
```

> 降级说明：本次**未降级**——反向依赖可由 import 图确定性得出，且新增/修改测试已覆盖全部变更模块，无需回退 `module`；未触发 `full`。

---

## 3. 实证输出（原始，逐命令，本会话独立复跑）

### 3.1 build / lint（`npm run build|lint` = `check-syntax`）

```
$ node scripts/check-syntax.mjs
[PASS] extension/panel.js … [PASS] extension/src/{bulkformatter,capture,clipboard,content,contextmenu,
       detail,filter,formatter,i18n,multiselection,render,selection,store}.js  (15 files)
[check-syntax] 15/15 files passed
BUILD_EXIT=0
```

### 3.2 affected 测试

```
$ node --test tests/i18n.test.mjs tests/multiselection.test.mjs tests/formatter.test.mjs \
              tests/bulkformatter.test.mjs tests/contextmenu.test.mjs
ℹ tests 141
ℹ suites 0
ℹ pass 141
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2603.5597
TEST_EXIT=0
```

### 3.3 门禁（项目 AC-015 口径）

```
$ node scripts/check-manifest.mjs      →  == RESULT: PASS (17/17 项) ==   EXIT=0
       （manifest_version=3；permissions=["clipboardWrite"]；version="1.1.0"；icons 16/32/48/128 存在）
$ node scripts/check-panel-shell.mjs   →  == RESULT: PASS (41/41 项) ==   EXIT=0
       （含 #copy-btn-a / #copy-btn-b；panel.js 导出 applyI18n；--row-height / .is-selected 等契约）
$ node scripts/check-zero-network.mjs  →  == RESULT: PASS（17/17 项通过）== EXIT=0
       （extension/ 无网络调用、无持久化存储、无遥测）
```

### 3.4 发行 ZIP 只读复验（无任何项目写入）

`dist/raw-copy-1.1.0.zip`（42232 B，16:46:19 重打包版）：

```
$ unzip -t dist/raw-copy-1.1.0.zip
    testing: src/store.js             OK
    testing: styles/panel.css         OK
No errors detected in compressed data of dist/raw-copy-1.1.0.zip.

$ unzip -p dist/raw-copy-1.1.0.zip manifest.json | node …
version=1.1.0 mv=3 perms=["clipboardWrite"] host=null
```

### 3.5 移除特性残留审计（负向证据）

`rg`（默认尊重 .gitignore，排除 `dist/`、`butler/`）扫描 `extension/ tests/ scripts/`：

| 模式 | 命中 | 判定 |
|------|------|------|
| `extractSectionText` / `buildSectionCopy` / `runSectionCopy` | 0 | ✅ 零残留 |
| `COPY_REQUEST_ONLY` / `COPY_RESPONSE_ONLY` | 4 | ✅ **仅负向断言**（`tests/contextmenu.test.mjs:272-278` `assert.equal(..., undefined)`） |
| `canCopyRequestOnly` | 1 | ✅ **仅文档**（`tests/test-cases.md:91`，描述删除断言） |
| `mode-toggle` | 4 | ✅ **仅负向断言/文档**（`contextmenu.test.mjs:516` `assert.ok(!…has('mode-toggle'))`；`test-cases.md`/`README.md`） |
| `copy-req-btn` / `copy-resp-btn` | 各 2 | ✅ **仅负向断言/文档**（`contextmenu.test.mjs:517-518` 及文档） |

`extension/` 源码内**无任何功能性残留**；`panel.html:123-126` 实测存在 `#copy-btn-a`/`#copy-btn-b`（`data-copy-mode="A"/"B"`）。

---

## 4. 覆盖与未覆盖清单（§34.6 INV-1 强制）

- **已覆盖**：affected 5 测试文件 **141 用例**（exit=0）；`check-syntax` 15/15；门禁 `check-manifest` 17/17、`check-panel-shell` 41/41、`check-zero-network` 17/17；发行 ZIP 完整性（`unzip -t` + manifest 读回）；移除特性残留扫描（含负向断言核验）。
- **未覆盖（窄化声明，禁止默认全量的合规后果）**：以下 **9 个测试文件未跑**，依据是它们**不 import 任何本轮变更模块**（import 图反查确认），属完整套件但非 affected：

  | 未跑测试文件 | 不跑依据 |
  |---|---|
  | `tests/capture.test.mjs` | 仅 import `store.js` / `capture.js`，均未改 |
  | `tests/clipboard.test.mjs` | 仅 import `clipboard.js`，未改 |
  | `tests/content.test.mjs` | 仅 import `content.js`，未改 |
  | `tests/detail.test.mjs` | import `detail.js` + 冻结 `formatter.js`，未改 |
  | `tests/enrich.test.mjs` | import `store/capture/content` + 冻结 `formatter.js`，未改 |
  | `tests/filter.test.mjs` | 仅 import `filter.js`，未改 |
  | `tests/render.test.mjs` | 仅 import `render.js`，未改 |
  | `tests/selection.test.mjs` | 仅 import `selection.js`，未改（冻结） |
  | `tests/store.test.mjs` | 仅 import `store.js`，未改 |

  > 说明：未跑文件中**不含**任何受影响模块；无需全量即可判定 `affected` 结论。（未独立获得其用例数——获取需运行全量，属迭代内**禁止**动作 §34。）
- **未覆盖**：真实浏览器 E2E（`e2e-artifacts` harness）——本轮为**非发布门**，按 §34 迭代内禁止 `api/functional/full`；且 `panel.js` 已由真实加载用例（`panel-harness.mjs:307`）在 Node 侧驱动 click/contextmenu 事件覆盖。**依据**：宪法 §34.3/§34.5；**置信度**：`high`。
- **置信度**：`high`（受影响面已由 141 单测 + 3 门禁 + 移除特性负向核验充分覆盖）。

---

## 5. 回归判定（regression_block）

```
regression_block: false
regression_baseline: null
regression_first_seen: null
```

依据：`butler/learned/butler-tester.md` **无 `historical_failures` 小节/条目**；本轮 outcomes 0 失败。`regression_baseline: null`。

---

## 6. 机读结论

```text
---VERIFY_START---
doc: 05-verification-report
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
date: 2026-10-02
role: butler-tester
scope: affected
changed_files: 16
affected_value: [multiselection.test.mjs, i18n.test.mjs, formatter.test.mjs, bulkformatter.test.mjs, contextmenu.test.mjs, panel-harness.mjs, check-panel-shell.mjs]
degradation: none
security_fallback: false
commands:
  test: "node --test tests/i18n.test.mjs tests/multiselection.test.mjs tests/formatter.test.mjs tests/bulkformatter.test.mjs tests/contextmenu.test.mjs"
  build: "node scripts/check-syntax.mjs"
  gates: ["check-manifest", "check-panel-shell", "check-zero-network"]
  artifact_readonly: "unzip -t dist/raw-copy-1.1.0.zip + manifest 读回"
results:
  tests: { total: 141, pass: 141, fail: 0, exit: 0 }
  build: { files: "15/15", exit: 0 }
  gates: { check-manifest: "17/17", check-panel-shell: "41/41", check-zero-network: "17/17" }
  artifact: { zip_restore_test: PASS, manifest_version: "1.1.0", mv: 3, permissions: ["clipboardWrite"], host_permissions: null }
  residue: { source_functional_residue: 0, negative_assertions_only: true }
not_covered: { tests_not_run: 9, files: "capture,clipboard,content,detail,enrich,filter,render,selection,store", e2e_real_browser: true, reason: "affected scope / non-release gate (CONSTITUTION §34)" }
confidence: high
regression_block: false
regression_baseline: null
regression_first_seen: null
verdict: PASS
---VERIFY_END---
```

---

## 7. 反哺

- 测试结果写入本文件（`butler/spec/<slug>/test-results.md` 等价产物）。
- 领域知识（`butler/domain/testing.md`）：node:test 项目可用 `rg` 反查 `import` 图做确定性 affected 计算；无 git 仓库时以 mtime 窗口 + 执行总结交叉确认变更集。
- `butler/learned/butler-tester.md`：本轮 0 失败，无新增 `historical_failures`。
