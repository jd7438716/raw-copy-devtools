---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
date: 2026-10-02
outcome: success
phase: ⑤ 收敛·执行后补齐
executor: butler-captain
---

# Captain 执行摘要 — Chrome/Edge DevTools MV3 扩展「Raw Copy」

## 0. 执行方式

- 严格按 `butler/tasks/backlog/<slug>/dependency-graph.md` 的 DAG 顺序执行，**每个 TASK 通过 `subagent` 工具派发**给对应 agent（butler-developer / butler-doc-writer / butler-qa），Captain 只编排、验证、记录，不亲手写业务代码。
- DAG 拓扑批次：`L0 T013/T016/T012 → L1 T001 → L2 T002/T003/T009/T010 → L3 T004 → L4 T005 → L5 T006 → L6 T007/T008/T011 → L7 T014 → L8 T015`（无环）。
- 设计真源：`butler/spec/<slug>/design.md`（ADR-010 扩展根 = `extension/`，ADR-002 原生 ESM 多模块无构建）。TASK 文件中的历史文件名（`request-store.js`/`list-view.js`/`copy-builder.js`/`body-policy.js`）按 design 接口表统一为 `capture.js`/`store.js`/`render.js`/`filter.js`/`formatter.js`/`content.js`。

## 1. TASK 执行结果（16/16 done）

| TASK | 标题 | Agent | weight | 结果 | 主要产出 |
|:----:|------|-------|:------:|:----:|----------|
| TASK-013 | 图标资源 16/32/48/128 | butler-developer | light | ✅ done | `extension/icons/icon{16,32,48,128}.png` + `scripts/gen-icons.mjs`/`verify-icons.mjs` |
| TASK-016 | i18n 结构（中文优先） | butler-developer | light | ✅ done | `extension/src/i18n.js`、`package.json`、`scripts/check-syntax.mjs`、`tests/i18n.test.mjs` |
| TASK-012 | LICENSE（定死 MIT） | butler-developer | light | ✅ done | `LICENSE` |
| TASK-001 | MV3 清单 + devtools 注册 | butler-developer | standard | ✅ done | `extension/manifest.json`、`devtools.html`、`devtools.js`、`scripts/check-manifest.mjs` |
| TASK-002 | 面板 UI 外壳 | butler-developer | standard | ✅ done | `extension/panel.html`、`panel.js`、`styles/panel.css`、`scripts/check-panel-shell.mjs` |
| TASK-003 | 请求捕获 + 环形缓存(1000) | butler-developer | standard | ✅ done | `extension/src/capture.js`、`store.js`、`tests/store.test.mjs`、`tests/capture.test.mjs` |
| TASK-009 | 隐私页 + 零网络/零存储 | butler-developer | standard | ✅ done | `extension/privacy.html`、`scripts/check-zero-network.mjs` |
| TASK-010 | 安装/使用说明 | butler-doc-writer | light | ✅ done | `INSTALL.md`、`USAGE.md`（+`docs/` 镜像） |
| TASK-004 | 列表渲染 + 搜索/过滤 + 虚拟滚动 | butler-developer | standard | ✅ done | `extension/src/render.js`、`filter.js`、`tests/render.test.mjs`、`tests/filter.test.mjs` |
| TASK-005 | 选中交互（点击 + ↑↓） | butler-developer | light | ✅ done | `extension/src/selection.js`、`tests/selection.test.mjs` |
| TASK-006 | **复制拼接核心（AC-007 保真命门）** | butler-developer | **heavy** | ✅ done | `extension/src/formatter.js`、`tests/formatter.test.mjs`（逐字符断言） |
| TASK-007 | Clipboard + 降级 + Toast | butler-developer | standard | ✅ done | `extension/src/clipboard.js`、`tests/clipboard.test.mjs` |
| TASK-008 | 大响应/二进制/Base64 | butler-developer | standard | ✅ done | `extension/src/content.js`、`tests/content.test.mjs` |
| TASK-011 | 测试用例矩阵 | butler-qa | standard | ✅ done | `tests/test-cases.md`、`tests/README.md` |
| TASK-014 | 打包 ZIP + 体积/零依赖门禁 | butler-developer | **heavy** | ✅ done | `scripts/package.mjs`、`dist/raw-copy-1.0.0.zip` |
| TASK-015 | 里程碑 + 交付物齐全验收 | butler-doc-writer | light | ✅ done | `docs/MILESTONES.md`、`docs/DELIVERABLES-CHECKLIST.md` |

## 2. 文件变更清单

### 发行源码（扩展根 `extension/`，20 文件）
```
extension/manifest.json          extension/devtools.html      extension/devtools.js
extension/panel.html             extension/panel.js           extension/privacy.html
extension/styles/panel.css
extension/src/i18n.js  store.js  capture.js  filter.js  render.js  selection.js
                formatter.js  clipboard.js  content.js
extension/icons/icon16.png icon32.png icon48.png icon128.png
```
### 仓库根 / 交付物
```
LICENSE  INSTALL.md  USAGE.md  package.json
dist/raw-copy-1.0.0.zip
docs/MILESTONES.md  docs/DELIVERABLES-CHECKLIST.md  docs/INSTALL.md  docs/USAGE.md
tests/README.md  tests/test-cases.md  tests/{i18n,store,capture,filter,render,selection,formatter,clipboard,content}.test.mjs
scripts/{check-syntax,check-manifest,check-panel-shell,check-zero-network,package,gen-icons,verify-icons}.mjs
```

## 3. 验证命令与结果（Captain 独立复跑）

| 命令 | 结果 |
|------|------|
| `node --test "tests/**/*.test.mjs"` | **PASS — 123/123**（i18n 5 / store 9 / capture 16 / filter 12 / render 11 / selection 13 / formatter 24 / clipboard 14 / content 19） |
| `node scripts/check-syntax.mjs`（build/lint 口径） | **PASS — 11/11 files** |
| `node scripts/check-manifest.mjs`（AC-009 权限门禁） | **PASS — 17/17**（`manifest_version===3`；`permissions===["clipboardWrite"]`；无 host_permissions/tabs/webRequest/declarativeNetRequest/content_scripts/background/all_urls） |
| `node scripts/check-panel-shell.mjs`（DEL-002 / AC-012/016） | **PASS — 34/34**（7 列表头；全 DOM 契约 id；零裸中文） |
| `node scripts/check-zero-network.mjs`（AC-008 / REQ-027） | **PASS — 17/17**（无 fetch/XHR/WebSocket/sendBeacon/chrome.storage/localStorage/indexedDB/遥测；含反向探针非空跑） |
| `node scripts/package.mjs`（AC-017） | **PASS**（21 条目；解压 130.53KB < 200KB；压缩 51.16KB；third-party deps=0；zip 读回全部键值校验；sha256 可复现） |

关键命门证据（TASK-006 / AC-007 逐字符保真）：
```
✔ AC-007：响应体含不规则空白/转义/Unicode 时逐字符原样输出（模式 A）
✔ AC-007：模式 B 同样逐字符保真
✔ AC-006：只输出传入的单条记录，绝不附带其他请求
✔ REQ-015：httpVersion 缺失/为空时回退 HTTP/1.1
独立双模式逐码元比对：mode=formatted indexOf=295 substring===source:true firstDiffCodepoint=-1
                      mode=raw      indexOf=126 substring===source:true firstDiffCodepoint=-1
```

## 4. Spec 覆盖对账（按 TASK frontmatter `covers`）

- DEL-001..018：全部落地（DEL-001/002/003/004/005/006/007/008/009/010/011/012/013/014/015/016/017/018）。
- REQ-001..036：全部有对应实现/文档/门禁。
- US-001..004：由 TASK-006 formatter 覆盖（单条请求+响应原文复制）。
- AC-001..AC-022：`tests/test-cases.md` 逐条三绑定，**AC 覆盖 22/22**；checklist §C 边界 16/16。
- 测试脚本 vs 设计用例：设计用例 22 AC + 16 边界 = 38；实际可执行单测 123（≫ 30% 阈值）+ 4 门禁脚本，覆盖率门通过。

## 5. 偏差与裁决（如实记录，不隐瞒）

1. **TASK-006 模式 A 渲染格式**：Captain 派发措辞与 design.md ADR-006 存在细节差异。执行者按**设计真源 ADR-006** 落地：`===== META =====` / `===== REQUEST =====` / `[Request Body]` / `===== RESPONSE =====` / `[Response Body]`，并保留 `===== REQUEST =====`/`===== RESPONSE =====` 常量与 req.txt 契约。body 逐字符保真不受影响，且与 i18n/USAGE/plan 一致。裁决已记录于 `butler/memory/pair/TASK-006/round-01/developer-output.md`。
2. **TASK-011 路径**：`tests/test-cases.md` + `tests/README.md`（test-cases 按 converge 重定路径落入 `tests/`，README edit 合并保留 TASK-016 内容）。
3. **package.json test 脚本**：Node v24 下 `node --test tests/` 不可用，改为 `node --test "tests/**/*.test.mjs"`；build/lint 指向 `scripts/check-syntax.mjs`。
4. **TASK-010 文档路径**：主交付在仓库根（`INSTALL.md`/`USAGE.md`），另镜像到 `docs/`（AC-019 存在性 + AC-DOC `docs/` 引用兼顾，双份内容逐字节一致）。

## 6. 未完成项 / 非阻塞遗留

- **浏览器级 E2E（AC-018 双端 Chrome/Edge 安装冒烟、E2E-01..16）**：环境无 GUI 浏览器，未执行。已由 `tests/test-cases.md` 定义手工步骤与预期，属 E2E 节点职责，**非阻塞**。
- **`dist/raw-copy-1.0.0.zip`**：已生成并通过读回校验；若源码再变更需重跑 `node scripts/package.mjs`。
- 本报告只记录执行；`test-results.md` / `sec-audit.md` 归 DAG 的 tester / secaudit 节点，Captain 未越权写入。

## 7. 结论

16/16 TASK 全部 done；build/lint（syntax 11/11）、test（123/123）、四项门禁（manifest 17/17、panel-shell 34/34、zero-network 17/17）与打包门禁（体积<200KB、零依赖、zip 读回）**全 PASS**；spec 80 items 经 `covers` 并集与 test-cases 对账闭合；AC-007 逐字符保真命门与 AC-009 权限门禁均有机械证据。唯一遗留为需真实浏览器的 E2E，交 E2E 节点。
