verdict: PASS
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
date: 2026-10-02
framework: Node.js built-in test runner (node --test, v24.15.0) + 原生门禁脚本
command: "node --test \"tests/**/*.test.mjs\" && node scripts/check-syntax.mjs && node scripts/check-manifest.mjs && node scripts/check-panel-shell.mjs && node scripts/check-zero-network.mjs && node scripts/package.mjs"
scope: full
weight: heavy
changed_files: 46
affected_files: 46
must_run: 9 (本次新增/改动的测试文件：i18n/store/capture/filter/render/selection/formatter/clipboard/content.test.mjs)
test-levels: L0=0 L1=123 L2=0 L3=0
failures: 0
regression_block: false
regression_baseline: null
executor: butler-tester
---

# 测试报告 — Chrome/Edge DevTools MV3 扩展「Raw Copy」

## 1. 结论

**verdict: PASS** — 全量测试 123/123 通过；build/lint 与 4 项门禁 + 打包门禁全部退出码 0。

## 2. scope 决策与依据

| 项 | 值 | 依据 |
|----|----|------|
| scope | `full` | `weight.json` `overall=heavy`（`reason` 明示「跨 15+ 模块 + 安全相关硬门禁 → heavy」）；且任务指令明确「仅当 `weight=heavy` 或发布门才 `full`」 |
| 为何非 `affected` | — | 项目**非 git 仓库**（`git status` 返回 NOT A GIT REPO，`git diff --name-only -M HEAD` 不可用），无法用 VCS 计算变更集；本交付为**绿地实现**，`extension/**`、`tests/**`、`scripts/**`、交付文档均为本次会话新增 → 变更集 ≈ 全仓发行面 |
| 兜底 | full | 影响面无法收敛到子集 + weight=heavy → 按 §34 允许项取 `full`，并输出下方未覆盖清单 |

> 未命中 §34.3 安全回退清单中的「未知扩展名」以外的升级项；本次 full 由 weight=heavy 直接授权，非迭代违规。

## 3. 变更/影响文件

- **changed_files = 46**（绿地发行面，无 git 可精确 diff，按交付清单枚举）：
  - `extension/**` 20 文件（manifest/devtools/panel/privacy/css + `src/` 9 模块 + 4 icons）
  - `tests/**` 11 文件（9 个 `*.test.mjs` + `README.md` + `test-cases.md`）
  - `scripts/**` 7 文件（check-syntax / check-manifest / check-panel-shell / check-zero-network / package / gen-icons / verify-icons）
  - `docs/**` 4 文件（MILESTONES / DELIVERABLES-CHECKLIST / INSTALL / USAGE）
  - 仓库根 4 文件（LICENSE / INSTALL.md / USAGE.md / package.json）
  - 产物 1 文件（`dist/raw-copy-1.0.0.zip`）
- **affected_files = 46**；反向依赖：Extension 为无构建原生 ESM，`panel.js` 静态 import 全部 `src/*.js`，因此任一 `src/*.js` 变更即影响面板全链路 → 反向依赖闭包同样覆盖全部 9 个测试文件。

## 4. 所跑范围（必跑集 = 全部 9 个测试文件，无裁剪）

| 命令 | 运行器/门禁 | 结果 | 退出码 |
|------|-------------|------|:------:|
| `node --test "tests/**/*.test.mjs"` | Node built-in test | **PASS 123/123**（i18n 5 / store 9 / capture 16 / filter 12 / render 11 / selection 13 / formatter 24 / clipboard 14 / content 19） | 0 |
| `node scripts/check-syntax.mjs` | build + lint | **PASS 11/11 files** | 0 |
| `node scripts/check-manifest.mjs` | AC-009 权限门禁 | **PASS 17/17**（MV3；permissions=`["clipboardWrite"]`；无 host_permissions/tabs/webRequest/declarativeNetRequest/content_scripts/background/all_urls） | 0 |
| `node scripts/check-panel-shell.mjs` | DEL-002 / AC-012/016 | **PASS 34/34**（7 列表头 / DOM 契约 id / 零裸中文） | 0 |
| `node scripts/check-zero-network.mjs` | AC-008 / REQ-027 | **PASS 17/17**（无 fetch/XHR/WebSocket/sendBeacon/chrome.storage/localStorage/indexedDB/遥测） | 0 |
| `node scripts/package.mjs` | AC-017 体积/零依赖/zip 读回 | **PASS**（21 条目；130.53KB<200KB；third-party deps=0；zip 读回 CRC/键值一致；sha256 可复现） | 0 |

测试级别：**L1=123**（单元/契约）；L0/L2/L3 = 0（无 static-API / 集成 / E2E 自动化层）。test 输出末行为 `pass 123 / fail 0`，所有脚本末行 `EXIT=0`（退出码为唯一裁决依据）。

## 5. 未覆盖清单（INV-1，窄化→此处为 E2E 层不可自动化部分）

| 未覆盖项 | 类型 | 依据 | 置信度 |
|----------|------|------|:------:|
| **AC-018** Chrome/Edge 双端真实浏览器安装冒烟 | 浏览器级 E2E | 环境无 GUI 浏览器；`captain-execution.md §6` 明示未执行；`tests/test-cases.md` TC-AC-018 = `⏳ 待 E2E`；已由 `TASK-017`（butler-e2e-verifier, heavy）承接 | **high**（已定位为唯一缺口） |
| E2E-01..E2E-16（面板并列可见 / 实时捕获 / 逐字符粘贴比对等真实 DevTools 行为） | 手工/E2E | 同上，非单测可替代；`tests/test-cases.md §3` 已给出可复跑步骤 | high |
| `extension/panel.js`、`devtools.js` 等含 `chrome.devtools`/DOM 胶水代码的运行时路径 | 集成 | 单测覆盖的是纯逻辑模块（store/capture/filter/render/selection/formatter/clipboard/content/i18n）；浏览器 API 胶水层仅由 `check-panel-shell.mjs` 静态契约校验 | medium |

> 说明：上述未覆盖均属**测试环境能力边界**（无 GUI Chromium），已如实记录，**不以单元测试冒充浏览器级结论**；`TASK-017` 为其闭环任务。

## 6. 回归判定

- `butler/learned/butler-tester.md` 无 `historical_failures`（当前为空）→ **regression_block: false / regression_baseline: null**。
- 本次无失败测试，无需追加历史失败签名。

## 7. 证据锚（working tree）

- `tests/*.test.mjs`（9 文件）→ `node --test` 输出 `pass 123 / fail 0`
- `scripts/check-{syntax,manifest,panel-shell,zero-network}.mjs`、`scripts/package.mjs` → 各 `EXIT=0`
- `dist/raw-copy-1.0.0.zip`（21 条目，解压 130.53KB）
- `butler/spec/<slug>/captain-execution.md`（Captain 独立复跑同口径一致）

---

*测试执行人: butler-tester｜只读执行：未修改任何业务源码；写入本报告 + 装载日志*
