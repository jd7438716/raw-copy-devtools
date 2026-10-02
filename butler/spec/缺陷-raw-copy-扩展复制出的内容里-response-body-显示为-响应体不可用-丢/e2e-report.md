verdict: WARN
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
phase: ⑥.1 UI/E2E 验收（TASK-009）
date: 2026-10-02
executor: butler-e2e-verifier
browser: chrome-devtools MCP 托管的真实 Chromium（Chrome 内核）
app_target: Chrome/Edge DevTools MV3 扩展「Raw Copy」panel.html（静态包，无 dev server）
harness: 临时 Node 静态服务器（127.0.0.1:8791，承载 extension/，运行后已删除）；navigate_page initScript 注入 chrome.devtools.network 桥 + navigator.clipboard mock
touches_source: NO（未修改任何业务源码；临时 harness/服务器已清理）
---

# E2E 测试报告 — Raw Copy `[Response Body]`「（响应体不可用）」修复

## 0. 上下文与预期来源（不可篡改）

| 项 | 结果 |
|----|------|
| 本步声明输入 `butler/requirements/e2e-test-plan.md`（F-73） | **缺失** → 记录 `[MISSING_CONTEXT]`（registry 标 ⏳） |
| 预期结果来源（设计阶段冻结） | `TASK-009.md` 验收清单 + `spec.json`（AC-001/002/003/005/006/007/008/011；REQ-001..014；DEL-002/004/005/006） |
| 未新增/篡改任何预期 | 是（执行阶段只判 PASS/FAIL/CONDITIONAL） |

> 说明：扩展是静态 MV3 包，不存在可 `npm run dev` 的本地应用。本步的「启动应用」实现为
> **在真实 Chromium 中加载扩展 UI 产物 `panel.html` 并驱动真实扩展代码**，
> 仅把浏览器 `chrome.devtools.network.onRequestFinished` 捕获边界与 `navigator.clipboard`
> 替换为可观测 mock（其余 capture/store/content/formatter/clipboard/panel/i18n 均为**真实发行代码**）。

## 1. 摘要

| 指标 | 值 |
|------|----|
| 总验证项 | 14 |
| 通过（PASS） | 13 |
| 失败（FAIL） | 0 |
| 条件性未验证（CONDITIONAL） | 1 组（AC-002 真机 live 网络，含 3 条环境边界） |
| 控制台错误 | 0（含交互后复检） |
| 外部网络请求 | 0（13 请求全为 `127.0.0.1:8791` 本地） |
| 截图 | 1 张 |

**结论**：**核心缺陷 RC-1 修复在真实浏览器 + 真实扩展代码下 PASS** —— 对「无 `content.text` 但 `getContent` 可返回正文」的 401 entry，
捕获异步 enrich 回填后，点击复制得到 **`[Response Body]` = 真实 JSON 正文**（逐字符，无美化/截断），
**不再出现「（响应体不可用）」**；复制竞态（异步未完成即点复制）等待真实正文；占位仅保留给客观不可获取场景。
所有**可执行**的 UI/E2E 断言全部 PASS，0 控制台错误，0 外网。
唯一无法在本环境裁决的是 **AC-002 的「真实 Chrome/Edge + `auth.autional.cn` live 401 网络面板逐字符」**——
本环境为可控 Chromium + 等价本地 401 fixture（`chrome.devtools.network` 边界为 mock），
故该项按 TASK-009 步骤 4 降级并标注 **CONDITIONAL**；JSON 无 FAIL 项，总体判 **WARN**（非 REJECT）。

## 2. 详细结果

| # | 路径 / 断言（预期 ← 冻结来源） | 实测 | 结果 |
|:-:|------|------|:----:|
| 1 | `panel.html` 可访问（HTTP 200）且 12 个 ESM 模块全部加载 | 200；panel.js + src/*.js 全 200；favicon 204 | ✅ PASS |
| 2 | 页面控制台无错误（初始 + 全部交互后复检） | `<no console messages found>` | ✅ PASS |
| 3 | 无外部网络请求 | 13 请求全为 `127.0.0.1:8791` 本地 | ✅ PASS |
| 4 | 工具栏：搜索框 + 方法/状态码/资源类型 3 过滤器存在 | 均存在；placeholder=「按 URL 关键字搜索…」 | ✅ PASS |
| 5 | 列表表头恰 7 列且中文 | 方法/URL/状态/类型/耗时/大小/时间 | ✅ PASS |
| 6 | 无数据时空态显示、复制按钮禁用 | 「暂无网络请求」+ 引导语，`#copy-btn.disabled=true` | ✅ PASS |
| 7 | **核心修复（AC-001/AC-005/DEL-001/002）**：无 `content.text` + 回调型 `getContent` 的 401 entry → 捕获后异步 enrich 回填 → 复制 `[Response Body]` 为真实正文 | 行=POST `.../auth/login` 401 xhr 43 ms 159 B；复制正文 = 真实 JSON（逐字符），**无「（响应体不可用）」、无「（正在获取响应体…）」** | ✅ PASS |
| 8 | 行点击唯一选中 + 复制按钮启用 + 成功 Toast（DEL-002） | `class="row is-selected"`；`#copy-btn.disabled=false`；Toast「已复制到剪贴板」`toast--success` | ✅ PASS |
| 9 | **AC-007 竞态**：异步 enrich 未完成（400ms 后回填）即点复制 → 等待真实正文，不产占位 | 立即读剪贴板=null（未误报）；等待后复制正文含真实 401 body，无占位 | ✅ PASS |
| 10 | **REQ-014/DEL-006**：Chrome 151+ Promise 型 `getContent()` 形态 | Promise 型 entry 回填成功，复制正文含真实 body | ✅ PASS |
| 11 | **AC-003**：占位「（响应体不可用）」仅保留客观不可获取场景（无 text 且无 getContent） | 该 entry 复制输出含「（响应体不可用）」 | ✅ PASS |
| 12 | **AC-008/REQ-005**：enrich 回填触发 UI 刷新（`onUpdate`） | 同一行大小由 0 B 刷新为回填后 159 B | ✅ PASS |
| 13 | **AC-011 回归**：全量单测无回归 | `node --test "tests/**/*.test.mjs"` → tests 145 / pass 145 / fail 0，EXIT=0 | ✅ PASS |
| 14 | 截图留证 | `e2e-panel-enrich.png`（fullPage，多行 + 选中 + 复制成功态） | ✅ PASS |

## 3. FAIL 汇总

无 FAIL 项（0）。

## 4. CONDITIONAL / 环境边界（不影响代码正确性）

| 项 | 冻结预期 | 状态 | 原因 | 已有替代证据 | 可复跑步骤 |
|----|----------|:----:|------|--------------|------------|
| **AC-002** 真机 live 401 逐字符 | 真实 Chrome/Edge 对 `https://auth.autional.cn/bff/identity/api/v1/auth/login`（401，content-length 395）复制，正文与网络面板逐字符相等 | **CONDITIONAL(local-fixture)** | 本环境无法在真实 DevTools inspected-target 上完成该站点 live 网络抓取（`chrome.devtools.network` 边界为 mock）；按 TASK-009 §4 降级为「本地 fixture 复刻同一 401（同头同 shape）」 | 报告 §2 #7/#9（真实扩展代码、真实 Chromium、真实 enrich→回填→复制链路，字符级一致） | `tests/test-cases.md §3` E2E 索引 + `INSTALL.md`（人工在 Chrome/Edge 各自执行） |
| 真实 unpacked 扩展加载 | 以「加载已解压」加载 `extension/` 显示 DevTools 面板 | **BLOCKED(no-controllable-gui)** | chrome-devtools MCP 托管实例不加载未打包扩展；`chrome://extensions` 需原生文件对话框 | 前序 spec E2E 已证面板注册契约/manifest 合规；本次证 UI 产物与全链路代码可运行 | `INSTALL.md` |
| AC-008 环形 1000 淘汰 | 1000 条环形顺序/淘汰语义不变 | **未在本步展开**（单测已固化为真源） | 本步聚焦 enrich 回填 UI 刷新；环形语义属单测基线 | `tests/store.test.mjs` 环形/字节预算用例（145/145 PASS） | `node --test tests/store.test.mjs` |

> 依附真实 DevTools 上下文、同样无法自动裁决的路径（均**非回归失败**）：
> 真实 live 页面 `onRequestFinished`、真实剪贴板失焦 `execCommand` 降级、DevTools 重开销毁清空。
> 均已在 `tests/test-cases.md` 标注 `⏳ 待 E2E`，本报告不虚报通过。

## 5. 环境与证据

- **浏览器**：chrome-devtools MCP 托管的真实 Chromium（DevTools MCP 已连接，1 page）。
- **承载**：临时 Node 静态服务器（`127.0.0.1:8791`，非交付物，运行后已删除）；`/favicon.ico` 返回 204 以保持控制台为零噪声。
- **mock 边界**：仅 `chrome.devtools.network.onRequestFinished`（桥，注册 1 个 listener 且被真实 `installCapture` 消费）与 `navigator.clipboard.writeText`（捕获复制文本）；
  `capture.normalize` / `maybeEnrich` / `fetchContent`（回调 + Promise 双形态）/ `applyContent` / `store`（update/pending）/ `classifyBody` / `formatter` / `panel.onCopyClick` 均为**真实发行代码**。
- **关键原始证据（复制文本尾部，逐字符）**：
  ```
  [Response Body]
  {"timestamp":"2026-10-02T04:00:00.000+00:00","status":401,"error":"Unauthorized","message":"用户名或密码错误","path":"/bff/identity/api/v1/auth/login"}
  ```
  （该 JSON 为**本地 401 fixture**：与 TASK-009 描述同 shape/同头 `content-type: application/json; charset=utf-8`；非 `auth.autional.cn` 实网 395B 原body，见 §4）
- **截图**：`butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/e2e-panel-enrich.png`。

## 6. 复现步骤（本报告口径）

1. `node <临时静态服务器> extension/ 8791`（本项目为只读执行，脚本已删除）
2. 真实 Chromium 打开 `http://127.0.0.1:8791/panel.html`，`initScript` 注入 `chrome.devtools.network.onRequestFinished` 桥 + clipboard mock
3. 经桥 `listeners[0](mockHAREntry)` 喂入「无 `content.text` + 回调/Promise `getContent` 返回 401 body」entry
4. 等待 enrich → 点击行选中 → 点击 `#copy-btn` → 读 `window.__e2e.copied`
5. 断言 `[Response Body]` 逐字符等于 fixture body、且不含任一占位文案；再验证竞态/占位保留
6. 运行 `node --test "tests/**/*.test.mjs"`（145/145）
7. 停止服务器并清理临时 harness（未改动业务源码）

## 7. 建议

- AC-002 的真机 `auth.autional.cn` live 401 字符级验证交回人工（具备 GUI Chrome/Edge 者可升级本 WARN → PASS）。
- 补产 `butler/requirements/e2e-test-plan.md`（F-73）以闭合本步声明输入缺口。
- TASK-008 文档边界修订（design.md/feasibility.md/stories-written.md）仍为规格终态阻塞项（非 E2E 范围）。

<!-- butler:covers AC-001 AC-003 AC-005 AC-007 AC-008 AC-011 -->
<!-- E2E executed by butler-e2e-verifier; verdict=WARN; 0 FAIL; AC-002=CONDITIONAL(local-fixture, live network blocked) -->
