verdict: WARN
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
phase: ⑥.1 UI/E2E 验收
date: 2026-10-02
executor: butler-e2e-verifier
browser: Google Chrome（chrome-devtools MCP 托管的真实 Chromium 实例）
app_target: Chrome/Edge DevTools MV3 扩展「Raw Copy」（无 dev server —— 扩展为静态包，不能 `npm run dev`）
harness: 原生 Node 静态服务器（HTTP）承载 `extension/`；`initScript` 注入 `chrome.devtools.network.onRequestFinished` 桥 + clipboard mock
touches_source: NO（未修改任何业务源码；临时 harness 已删除）
---

# E2E 测试报告 — Raw Copy（Chrome/Edge DevTools MV3 扩展）

## 0. 上下文与预期来源（不可篡改）

| 项 | 结果 |
|----|------|
| 本步声明输入 `butler/requirements/e2e-test-plan.md`（F-73，butler-e2e-planner 产出） | **缺失** → 记录 `[MISSING_CONTEXT]`（`butler/file-registry.md` 亦标 ⏳） |
| 预期结果来源（设计阶段冻结，执行阶段只判 PASS/FAIL，不改预期） | `butler/tasks/.../TASK-017.md` 验收清单 + `tests/test-cases.md §3`（E2E-01..E2E-16）+ `spec.json`（REQ-005..013/025/033、DEL-002/004/005/010/017、AC-004/005/006/007/010/012/013/015/016/020/021/022/009/017/018） |
| 未新增/篡改任何预期 | 是 |

> 说明：扩展是「静态 MV3 包」，不存在可启动的本地应用。本步的「启动应用」实现为
> **在真实 Chromium 中加载扩展 UI 产物（panel.html / privacy.html）并驱动真实扩展代码**，
> 仅替换浏览器 DevTools API 边界（`chrome.devtools.network` / clipboard）为可观测 mock。

## 1. 摘要

| 指标 | 值 |
|------|----|
| 总验证项 | 28 |
| 通过 | 27 |
| 失败 | 0 |
| 条件性未验证（CONDITIONAL / BLOCKED） | 1 个验收项（AC-018）覆盖 5 条路径 |
| 控制台错误 | 0（页面级；见 §5 关于初始 harness 的 favicon 404 已消除） |
| 外部网络请求 | 0（全部为 127.0.0.1 本地资源加载） |
| 截图 | 3 张 |

**结论**：所有**可执行**的 UI/E2E 断言全部 PASS（真实浏览器、真实扩展代码、零控制台错误、零外网）。
唯一无法在本环境裁决的是 **AC-018「在真实 Chrome 与 Edge 双端以『加载已解压』安装并显示面板」**——
环境中无可控的 GUI Chromium 支持 `--load-extension`，Edge 亦无法自动化；
按 TASK-017「若环境仍无 GUI 浏览器 → 如实标注 BLOCKED，不得以单元测试冒充」，
该验收项标记 **CONDITIONAL**，故总体判 **WARN**（非 REJECT：无失败项）。

## 2. 详细结果

| # | 路径 / 断言（预期 ← 冻结来源） | 实测 | 截图 | 结果 |
|:-:|------|------|------|:----:|
| 1 | panel.html 可访问（HTTP 200）且 12 个 ESM 模块全部加载 | 200；panel.js + src/*.js 全 200 | — | ✅ PASS |
| 2 | 页面控制台无错误 | `<no console messages found>` | — | ✅ PASS |
| 3 | 无外部网络请求（AC-008 环境侧） | 13 请求全为 `127.0.0.1:8767` 本地 | — | ✅ PASS |
| 4 | 工具栏：搜索框 + 方法/状态码/资源类型 3 过滤器存在（REQ-006..009） | 均存在；placeholder=「按 URL 关键字搜索…」 | rows | ✅ PASS |
| 5 | 列表表头恰 7 列且中文（REQ-005/AC-012/AC-016） | 方法/URL/状态/类型/耗时/大小/时间 | rows | ✅ PASS |
| 6 | 无数据时显示空态（REQ/AC-016） | 「暂无网络请求」+ 引导语，`empty.hidden=false` | empty | ✅ PASS |
| 7 | 捕获→归一化→store→渲染：2 条 mock HAR → 2 行、7 列值正确、最新在上 | GET users(404/fetch/43ms/12B) 在上，POST login(200/xhr) 在下 | rows | ✅ PASS |
| 8 | 过滤下拉选项由数据派生（AC-003） | methods=[GET,POST]、status=[200,404]、type=[fetch,xhr] | — | ✅ PASS |
| 9 | 点击行唯一选中 + 启用复制（REQ-010/TC-B-01） | `is-selected`=第 0 行；`#copy-btn.disabled=false` | rows | ✅ PASS |
| 10 | 键盘 ↑↓ 切换 + 首尾钳制（REQ-011/AC-004） | ↓:0→1；末行再↓仍 [false,true]（clamp）；↑:1→0 | — | ✅ PASS |
| 11 | 模式 A（默认）复制结构（AC-005/AC-014/REQ-015/016/018） | `===== META/REQUEST/RESPONSE =====`；方法+完整URL+HTTP/2+头原序+体；状态行+响应头+体 | — | ✅ PASS |
| 12 | JSON 体逐字符保真（AC-007/REQ-020） | `{"user":"alice","pw":"s3cret"}`、`{"code":0,"msg":"ok"}` 原样无美化 | — | ✅ PASS |
| 13 | 单条隔离，不含其它请求（AC-006） | 输出仅 POST /login，无 GET /users 片段 | — | ✅ PASS |
| 14 | 复制成功 Toast（REQ-025/AC-011） | 文案「已复制到剪贴板」，`class="toast toast--success"`，`data-visible=true` | — | ✅ PASS |
| 15 | 模式切换 B 纯原始（AC-015） | `data-mode=raw`；输出无任何标题、直接拼接 | — | ✅ PASS |
| 16 | URL 关键字搜索，大小写不敏感子串（REQ-006/AC-003） | `USERS` → 命中 `/users` | — | ✅ PASS |
| 17 | 方法/状态码/资源类型过滤 + 多条件 AND（REQ-007..009/AC-003） | 各单条件精确；POST+200 → 仅 /login | — | ✅ PASS |
| 18 | 无匹配空态（checklist §B） | 0 行 + 「没有匹配的请求」 | — | ✅ PASS |
| 19 | 二进制响应省略标注（REQ-023/AC-010） | `[Binary content omitted: image/png, 2048 bytes]`（逐字符） | — | ✅ PASS |
| 20 | Base64 + 文本 MIME → UTF-8 解码（REQ-024/AC-010） | 复制体 = `{"hi":"世界"}`（与原文逐字符一致） | — | ✅ PASS |
| 21 | 超阈值复制前确认（REQ-022/AC-010） | 弹 `该响应较大（10.0 MB），是否继续复制？`；确认后复制成功 | — | ✅ PASS |
| 22 | 1,000 条上限淘汰最旧（REQ-004/AC-013） | 1005 条后：`zc-0000`/`zc-0004` 已淘汰（无匹配）、`zc-0005`（边界）与 `zc-1004` 保留 | — | ✅ PASS |
| 23 | 虚拟滚动：DOM 行数远小于记录数（REQ-029/AC-021） | >2000 条记录时 DOM 仅 29 行 | — | ✅ PASS |
| 24 | 隐私页渲染 + 三项核心声明 + 关键词（DEL-010/AC-020/REQ-027/028） | 标题「隐私政策」；3 卡片；含不收集/不传输/本地完成/不存储/clipboardWrite；`<script>`=0；控制台干净 | privacy | ✅ PASS |
| 25 | 图标 16/32/48/128 尺寸正确（DEL-017） | naturalWidth/Height = 16/32/48/128 | — | ✅ PASS |
| 26 | manifest 合规：MV3 + 仅 clipboardWrite + 无越权键（DEL-009/AC-009） | `manifest_version=3`；`permissions=["clipboardWrite"]`；host_permissions/tabs/webRequest/declarativeNetRequest/content_scripts/background 全无 | — | ✅ PASS |
| 27 | 面板注册入口契约（DEL-001/REQ-001/AC-001 逻辑层） | 注入 spy 后：`panels.create('Raw Copy','icons/icon32.png','panel.html', cb)` 调用一次且回调触发 | — | ✅ PASS |
| 28 | 打包体积/零依赖（DEL-015/AC-017/REQ-031/032） | `dist/raw-copy-1.0.0.zip` = 51.2 KB（< 200 KB）；dependencies/devDependencies 空；无 node_modules | — | ✅ PASS |
| 29 | **AC-018**：真实 Chrome 与 Edge 双端「加载已解压」安装并显示独立面板、复制可用 | **本环境无法执行** → CONDITIONAL/BLOCKED（见 §4） | — | ⚠️ CONDITIONAL |

## 3. FAIL 汇总

无 FAIL 项（0）。

## 4. CONDITIONAL / BLOCKED（唯一未裁决验收项）

| 验收项 | 冻结预期 | 状态 | 原因 | 已有替代证据 | 可复跑步骤 |
|--------|----------|:----:|------|--------------|------------|
| **AC-018**（REQ-030） | 最新版 Chrome 与 Edge 均可正常安装与使用 | **BLOCKED(no-controllable-gui)** | ① `browser` 桌面工具未连接（`browser.disconnected`）；② chrome-devtools MCP 托管实例不支持 `--load-extension`，无法加载未打包扩展；③ Edge 无可用自动化通道；④ `chrome://extensions` 的「加载已解压」需原生文件对话框 | 逻辑层已证：面板注册契约（#27）、manifest 合规（#26）、全 UI 功能在真实 Chromium 中跑通（#1..#23） | 见 `tests/test-cases.md §3` E2E-01/E2E-05/E2E-16 与 `INSTALL.md`（由人工在 Chrome/Edge 各自执行） |

> 依附于真实 DevTools 上下文、本次同样无法自动裁决的路径（均**非回归失败**，属环境能力边界）：
> E2E-02 真实 live 页面 `onRequestFinished`（本次为等价 mock 桥驱动真实 `normalize`/store 链路）、
> E2E-09 真实剪贴板失焦降级、E2E-12 DevTools 重开销毁清空、E2E-13 多 inspected target。
> 以上在 `tests/test-cases.md` 已各自标注 `⏳ 待 E2E`，本报告不虚报通过。

## 5. 环境与证据

- **浏览器**：chrome-devtools MCP 托管的真实 Chromium（Chrome 内核，DevTools MCP 已连接）。
- **承载**：临时 Node 静态服务器（本地 `127.0.0.1`，非交付物，运行后已删除）。
- **初始 harness 的 favicon 404**：首次用裸 `python -m http.server` 时浏览器自动请求 `/favicon.ico` 产生 1 条 404 控制台错误；改为对 `/favicon.ico` 返回 `204` 的临时 harness 后重跑，控制台为 **完全干净**（`<no console messages found>`）。该 404 属本地 harness 行为，非扩展缺陷（扩展上下文不请求该资源）。
- **截图**（`butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/`）：
  - `e2e-panel-rows.png`（89 KB）— 3 行列表 + 选中高亮 + 复制按钮启用
  - `e2e-panel-empty.png`（193 KB）— 空态面板
  - `e2e-privacy.png`（320 KB，整页）— 隐私政策页
- **关键原始证据**（复制文本，模式 A）：
  ```
  ===== META =====
  开始时间: 2026-10-02T10:00:00.000Z
  总耗时: 123.4 ms
  资源类型: xhr
  MIME 类型: application/json

  ===== REQUEST =====
  POST https://api.example.com/login HTTP/2
  Content-Type: application/json
  Authorization: Bearer token-123

  [Request Body]
  {"user":"alice","pw":"s3cret"}

  ===== RESPONSE =====
  HTTP/2 200 OK
  Content-Type: application/json

  [Response Body]
  {"code":0,"msg":"ok"}
  ```
- **mock 边界说明**：仅 `chrome.devtools.network.onRequestFinished`（桥接）与 `navigator.clipboard.writeText`（可观测）被替换；
  `capture.normalize`、`store`、`filter`、`render`、`selection`、`formatter`、`clipboard`、`content`、`i18n` 均为**真实发行代码**。

## 6. 复现步骤（本报告口径）

1. `node <临时静态服务器> extension/ 8767`（或 `python -m http.server 8767 --directory extension`）
2. 真实 Chromium 打开 `http://127.0.0.1:8767/panel.html`，`initScript` 注入 `chrome.devtools.network.onRequestFinished` 桥与 clipboard mock
3. 通过桥 `feed(mockHAREntry)` 驱动真实捕获/渲染链路；依次断言 §2 #1..#23
4. 打开 `http://127.0.0.1:8767/privacy.html` 断言 §2 #24
5. 注入 `chrome.devtools.panels.create` spy 打开 `devtools.html` 断言 §2 #27
6. 停止服务器；清理临时 harness（本项目为只读执行，未改动业务源码）

## 7. 建议

- 将 AC-018 的真机双端安装冒烟交回人工（`tests/e2e/AC-018-chrome-edge.md`，按 TASK-017 占位），或由具备 GUI Chromium/Edge 的 E2E 执行器复核后由 WARN 升为 PASS。
- 补产 `butler/requirements/e2e-test-plan.md`（F-73）以闭合本步声明输入缺口。

<!-- butler:covers AC-018 -->
<!-- E2E executed by butler-e2e-verifier; verdict=WARN; 0 FAIL; AC-018=BLOCKED(no-controllable-gui) -->
