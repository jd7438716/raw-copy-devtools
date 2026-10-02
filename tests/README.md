# 测试说明（tests/）

零第三方依赖，使用 Node 内置测试运行器 `node:test`。

## 运行方式

```bash
npm test                          # 等价于 node --test "tests/**/*.test.mjs"
node --test tests/i18n.test.mjs   # 只跑某个测试文件
```

> 注：Node 24 的 `node --test <目录>` 不再自动发现目录内测试，因此 `npm test`
> 使用 glob 模式 `tests/**/*.test.mjs`（由 Node 内置 glob 展开，跨平台一致）。

要求 Node.js ≥ 18（内置 `node:test`）。

## 测试存放路径

- 所有测试文件放在仓库根的 `tests/` 目录下。
- 单元测试直接 import `extension/src/*.js` 的纯逻辑模块（这些模块不依赖浏览器 API，可在 Node 下直接运行）。

## 命名约定

- 文件：`<module>.test.mjs`（如 `i18n.test.mjs`）；必须使用 `.mjs` 扩展名，与 `package.json` 的 `"type": "module"` 一致。
- 用例：`test('<被测行为>', () => { ... })`，用中文描述行为。
- 断言：统一使用 `node:assert/strict` 的 `assert.equal` / `assert.deepEqual` / `assert.doesNotThrow` 等。
- **新增测试**：一个被测模块对应一个同级 `<module>.test.mjs`；用例名尽量带上关联的 `REQ-xxx` / `AC-xxx`
  （便于从用例反查验收标准）；纯逻辑模块才写单元测试，依赖浏览器 API 的行为放 `test-cases.md` §3 手工 E2E。

## 测试文件清单

> 共 **14 个测试文件 / 283 用例**，`node --test "tests/**/*.test.mjs"` 全量 PASS（2026-10-02 实测）。
> 增强里程碑新增 5 个文件：`enrich` / `contextmenu` / `multiselection` / `bulkformatter` / `detail`；**每个文件头注释声明其 `covers` 的 AC 编号**。
> **面板级接线**：`tests/panel-harness.mjs`（非 `.test.mjs`，零依赖手写 DOM shim）真实加载 `extension/panel.js`，供 `contextmenu.test.mjs` 驱动真实 `onContextMenu` / A/B 按钮 / 批量入口（TASK-004/007/008）。
> **AC 体系说明**：基线 AC（AC-001..AC-022，`butler/requirements/requirement.md`）与增强里程碑 AC（AC-001..AC-017，`butler/spec/…/requirement.md`）为**两套独立编号**，同名不同义。

| 测试文件 | 被测模块 | 用例数 | 主要覆盖 |
|----------|----------|:------:|----------|
| `i18n.test.mjs` | `extension/src/i18n.js` | 10 | zh/en 键集对齐、插值、缺失 key；增强菜单/多选/详情键 + 模式 A/B 按钮键（基线 AC-016） |
| `store.test.mjs` | `extension/src/store.js` | 17 | 环形缓冲 cap=1000、淘汰、订阅、bytesInUse、pending（基线 AC-013） |
| `capture.test.mjs` | `extension/src/capture.js` | 19 | HAR→RequestRecord 映射、降级、installCapture（基线 REQ-035） |
| `enrich.test.mjs` | `extension/src/capture.js`（协同 content/formatter） | 11 | getContent 异步 enrich：双形态 / 竞态 / 编码 / 字符级保真 / 401（增强 REQ-012b..e） |
| `filter.test.mjs` | `extension/src/filter.js` | 12 | URL 搜索 / method / status / resourceType（基线 AC-003） |
| `render.test.mjs` | `extension/src/render.js` | 11 | 虚拟滚动窗口化 + DOM 复用（基线 AC-021） |
| `selection.test.mjs` | `extension/src/selection.js` | 13 | 点击 / ↑↓ / clamp / 淘汰联动（基线 AC-004） |
| `formatter.test.mjs` | `extension/src/formatter.js` | 26 | 模式 A/B、逐字符保真、单条隔离、A/B 冻结 golden（基线 AC-005/006/007/014/015） |
| `clipboard.test.mjs` | `extension/src/clipboard.js` | 14 | writeText→execCommand 降级、Toast（基线 AC-011/022） |
| `content.test.mjs` | `extension/src/content.js` | 19 | 文本 / 二进制 / base64 / 阈值边界（基线 AC-010） |
| `contextmenu.test.mjs` | `extension/src/contextmenu.js` + `extension/panel.js`（面板级） | 46 | 右键命中 / 表头空白 / 菜单模型（无 P2）/ 面板级接线（已选保留·未选替换）/ A/B 按钮 / 混合修饰键（增强 AC-001/002/003/004/005/006/007/008/009/010/013） |
| `multiselection.test.mjs` | `extension/src/multiselection.js` | 31 | 各语义互不破坏、`extendTo` 并集、全选幂等、计数、淘汰联动（增强 AC-004/005） |
| `bulkformatter.test.mjs` | `extension/src/bulkformatter.js` | 28 | N 段拼接、逐段保真、无跨条混淆、N=0/1 入口等价（增强 AC-006） |
| `detail.test.mjs` | `extension/src/detail.js` | 26 | 六要素 / 原文保真 / 关闭返回 / 淘汰自动关（增强 AC-008/009/010/011） |
| **合计** | — | **283** | 全量 PASS |

> 用例矩阵见 [`test-cases.md`](./test-cases.md)：**§1** 基线（AC-001..AC-022 + checklist §C 全部 16 项边界）、**§1b** 增强（右键 / 多选 / 详情三组 + 6 项边界 + AC-015 口径 + E2E 证据指针）。

## 门禁脚本（`scripts/`，零依赖，开发期工具）

增强里程碑 **AC-015** 的「现有基线用例」= **全部 `tests/*.test.mjs`（283 用例）+ 以下 4 个门禁脚本**；任一用例失败或任一门禁非 PASS 即 AC-015 不满足（口径详见 [`test-cases.md` §1b.5](./test-cases.md)）。

```bash
node scripts/check-syntax.mjs        # 15/15  extension/**/*.js 语法（= npm run build / lint）
node scripts/check-manifest.mjs      # 17/17  AC-009 权限门禁 + devtools_page + 图标 + 版本 1.1.0
node scripts/check-panel-shell.mjs   # 41/41  AC-012/016 面板外壳（7 列表头 / DOM 契约 / 无裸中文）
node scripts/check-zero-network.mjs  # 17/17  AC-008/020 零网络 + 零持久化 + 无遥测
```

| 门禁脚本 | 检查项 | 关联 |
|----------|:------:|------|
| `check-manifest.mjs` | 17 | MV3 权限门禁（仅 `clipboardWrite`）+ `devtools_page` + 图标 + 版本 `1.1.0` |
| `check-syntax.mjs` | 15 | 全部 `extension/**/*.js` 语法（build / lint 共用） |
| `check-zero-network.mjs` | 17 | 零网络 + 零持久化 + 无遥测 |
| `check-panel-shell.mjs` | 41 | 面板外壳 DOM 契约（含 `#copy-btn-a`/`#copy-btn-b`）+ i18n 无裸中文 |

## 手工 E2E 步骤索引

真实浏览器验证（load unpacked `extension/`）的完整步骤见 [`test-cases.md` §3](./test-cases.md)
（E2E-01..E2E-16：面板注册 / 实时捕获 / 搜索过滤 / 选中 / 复制保真 / 模式切换 / 零网络 /
大响应 / 剪贴板降级 / 单条隔离 / 1000 条性能 / 销毁清空 / 多 target / WebSocket / 重复点击 / Edge 兼容）。

### 增强里程碑 E2E 实机结果（TASK-016）

增强新增的右键菜单 / 多选 / 双击详情已由 butler-e2e-verifier 在真实 Chromium（Chrome 152 + Edge 154，CDP `Extensions.loadUnpacked`）实机验证：

- 报告：[`butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-report.md`](../butler/spec/在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增/e2e-report.md)
- 结果：**17/17 PASS**（双端）、绑定 AC **0 FAIL**（AC-001/002/003/008/009/010/011 + DEL-007）、控制台零错误、零 CSP 违规；`verdict=WARN`（含非绑定观察 G-1/G-2/G-3）。
- 原始结果与截图：同目录 `e2e-artifacts/results-{chrome,edge}.json` + `E2E-*.png`；执行器 `e2e-artifacts/harness/run-e2e.mjs`。
- **v1.1.0 修复同批更新（TASK-010）**：harness 已将 `#mode-toggle` 步骤替换为 `#copy-btn-a`/`#copy-btn-b`（`AC-008`），新增「多选态右键 → 批量项 → N 段」（`AC-013`）与「混合修饰键并集」（`AC-004`）场景，并以 `AC-009b` 断言 ③ P2 项/DOM 按钮/toggle 均已移除。
- 证据链：单测（283）→ E2E（`e2e-report.md`）→ 门禁（4 脚本）。

## 与 build / lint 的关系

- `npm run build` 与 `npm run lint` 均指向 `scripts/check-syntax.mjs`（对 `extension/**/*.js` 逐个 `node --check`）。
- 每个 TASK 完成后应保证：`npm run lint`、`npm run build`、`npm test` 三项 PASS；
  涉及权限/面板/网络的改动另跑对应 `check-*.mjs` 门禁。
