# 里程碑交付节奏 — Chrome/Edge DevTools 扩展（Manifest V3）

> 交付物: **DEL-018**（里程碑 M1–M5 交付节奏）
> 关联验收: **AC-019**（交付物齐全）、**AC-017**（体积 <200KB）、**AC-018**（Chrome/Edge 兼容）
> 需求真源: `butler/spec/<slug>/requirement.md` §4.5（M1–M5）、§11（交付物清单）
> 设计真源: `butler/spec/<slug>/design.md` §11（建议实现顺序，对齐 M1–M5）
> 生成角色: butler-doc-writer · 日期: 2026-10-02
> 状态图例: ✅ 已完成（静态门禁 + 单元测试机械通过）｜⏳ 待 E2E（真实浏览器手工复核）

---

## 0. 总览

| 里程碑 | 名称 | 对应 TASK | 对应 DEL | 状态 |
|:------:|------|-----------|----------|:----:|
| M1 | 面板框架 | TASK-001、TASK-002、TASK-013 | DEL-001、DEL-002、DEL-009、DEL-017 | ✅ |
| M2 | 捕获与列表 | TASK-003、TASK-004 | DEL-003、DEL-004 | ✅ |
| M3 | 复制拼接 | TASK-005、TASK-006、TASK-007 | DEL-005、DEL-006、DEL-007 | ✅ |
| M4 | 搜索过滤与大响应 | TASK-008、TASK-016（+ TASK-004 过滤基座） | DEL-008 | ✅ |
| M5 | 测试打包隐私交付 | TASK-009、TASK-010、TASK-011、TASK-012、TASK-014、TASK-015 | DEL-010 ~ DEL-016 | ✅ |

> **全局注记**：M1–M5 的**可机械验证部分**（语法、权限门禁、零网络、单元测试、体积）均已 ✅ 全通过；
> **浏览器可见行为**（面板并列显示、实时捕获、真实剪贴板、双端安装）仍需按 `tests/test-cases.md` §3 的
> E2E-01..E2E-16 手工复核，当前标记 ⏳（无自动化脚本，属既定验收方式，不阻塞交付物齐全判定）。

---

## M1 — 面板框架

**目标**：以 Manifest V3 注册 DevTools 页面并新增独立面板「Raw Copy」，搭建面板 UI 外壳与图标资源，使扩展可被 `load unpacked` 加载且面板可见。

**包含 TASK**

| TASK | 内容 | 覆盖交付物 |
|------|------|-----------|
| TASK-001 | MV3 清单 + devtools 注册页 + DevTools 面板注册 | DEL-001、DEL-009 |
| TASK-002 | 面板 UI 外壳（列表容器 + 工具栏 + 复制按钮 + Toast） | DEL-002 |
| TASK-013 | 图标资源 icons（16/32/48/128） | DEL-017 |

**落点文件**：`extension/manifest.json`、`extension/devtools.html`、`extension/devtools.js`、`extension/panel.html`、`extension/panel.js`、`extension/styles/panel.css`、`extension/icons/icon{16,32,48,128}.png`。

**验收判据**
- `manifest_version === 3`；`devtools_page === "devtools.html"`；`permissions === ["clipboardWrite"]`；无 `host_permissions`/`tabs`/`webRequest`/`declarativeNetRequest`/`background`/`content_scripts`/`<all_urls>`。
- 四个图标文件在 manifest 声明且实际存在。
- 面板外壳含 7 列表头（方法/URL/状态码/资源类型/耗时/大小/时间）与稳定 DOM 契约。
- 浏览器加载 `extension/` 后 DevTools 面板栏出现「Raw Copy」并与 Elements/Console/Network 并列。

**状态**：✅（`check-manifest.mjs` 17/17、`check-panel-shell.mjs` 34/34、`check-syntax.mjs` 11/11 通过）；面板并列显示 ⏳ 待 E2E-01。

---

## M2 — 捕获与列表

**目标**：通过 `chrome.devtools.network.onRequestFinished` 实时捕获当前页面请求，归一化为内存 `RequestRecord` 并写入上限 1000 条的环形缓冲；以虚拟滚动渲染列表并支持搜索/过滤。

**包含 TASK**

| TASK | 内容 | 覆盖交付物 |
|------|------|-----------|
| TASK-003 | 请求捕获与内存缓存（onRequestFinished，上限 1000，HAR 映射） | DEL-003 |
| TASK-004 | 列表渲染 + 搜索/过滤 + 虚拟滚动 | DEL-004 |

**落点文件**：`extension/src/capture.js`、`extension/src/store.js`、`extension/src/render.js`、`extension/src/filter.js`、`extension/panel.js`（接线）。

**验收判据**
- `capture.installCapture` 注册 `onRequestFinished`；HAR entry 归一化字段完整、缺失时按降级矩阵处理。
- `store` 环形缓冲 `DEFAULT_CAPACITY === 1000`，追加第 1001 条淘汰最旧、容量恒定（O(1)）。
- 虚拟滚动仅渲染可视区 + overscan，1000 条下 DOM 节点数远小于 1000。
- `filter.applyFilter` 支持 URL 子串（大小写不敏感）+ method + status（精确码 + 码段）+ resourceType 的组合 AND，无匹配返回空数组。

**状态**：✅（capture 16、store 9、render 11、filter 12 用例全 PASS）；列表实时追加/1000 条真实帧率 ⏳ 待 E2E-02/E2E-11。

---

## M3 — 复制拼接

**目标**：实现单条选中（点击 + ↑/↓）、请求 + 响应原文的模式 A/B 保真拼接，并经 Clipboard 双路径降级写入剪贴板，配 Toast 反馈。

**包含 TASK**

| TASK | 内容 | 覆盖交付物 |
|------|------|-----------|
| TASK-005 | 选中交互（点击 + 键盘上下键） | DEL-005 |
| TASK-006 | 复制拼接核心（请求 + 响应原文，模式 A/B，保真约束） | DEL-006 |
| TASK-007 | Clipboard 写入 + 降级链 + Toast 提示 | DEL-007 |

**落点文件**：`extension/src/selection.js`、`extension/src/formatter.js`、`extension/src/clipboard.js`、`extension/panel.js`（接线）、`extension/src/i18n.js`（文案键）。

**验收判据**
- 单选状态机：`selectAt`/`selectId` 唯一选中，`move(±1)` 首尾钳制（不环绕），选中项被淘汰即清理。
- 模式 A 输出含 `===== REQUEST =====` / `===== RESPONSE =====` 标题；模式 B 无标题；两模式下 body 与原文**逐 UTF-16 码元一致**（不解析/不缩进/不排序/不加 Markdown/不截断）；仅含单条请求，无其他请求片段。
- 剪贴板主路径 `navigator.clipboard.writeText`，失败降级 `document.execCommand('copy')`，双失败返回 `{ok:false,via:'none',reason}` 且不抛异常；Toast 显示成功/失败文案。

**状态**：✅（selection 13、formatter 24、clipboard 14 用例全 PASS）；真实键鼠/真实剪贴板/失焦降级 ⏳ 待 E2E-04/E2E-05/E2E-09。

---

## M4 — 搜索过滤与大响应

**目标**：在 M2 的搜索/过滤基座之上，补齐大响应（超阈值提示）、二进制与 Base64 内容分类与占位标注，并完成中文优先 / 预留英文的 i18n 结构。

**包含 TASK**

| TASK | 内容 | 覆盖交付物 |
|------|------|-----------|
| TASK-008 | 大响应 / 二进制 / Base64 处理逻辑 | DEL-008 |
| TASK-016 | i18n 结构（中文优先，预留英文） | REQ-033 / AC-016 |
| （TASK-004） | 搜索/过滤/虚拟滚动基座（M2 已交付，本里程碑收口其完善） | DEL-004 |

**落点文件**：`extension/src/content.js`、`extension/src/i18n.js`、`extension/panel.js`（超阈值 confirm 接线）。

**验收判据**
- 文本响应原样输出；二进制输出 `[Binary content omitted: <mime>, <bytes> bytes]`；base64 + 文本类 MIME 按 UTF-8 解码，否则 `[Base64 content omitted: length N]`；非法 base64 安全回退占位。
- 阈值边界精确：`size === 10MB` 不提示、`10MB + 1` 提示（超阈值复制前 confirm「是否继续」）。
- i18n 默认 zh 命中中文，`en` 键集与 `zh` 完全一致（结构预留，不要求完整翻译）；面板文案无裸中文（走 `data-i18n`）。

**状态**：✅（content 19、i18n 5 用例 + `check-panel-shell.mjs` i18n 断言全 PASS）；confirm 交互与真实布局 ⏳ 待 E2E-08。

---

## M5 — 测试打包隐私交付

**目标**：完成隐私政策页与零网络/无存储约束、安装/使用说明、测试用例、LICENSE、打包 ZIP + 完整源码，并做交付物齐全总验收。

**包含 TASK**

| TASK | 内容 | 覆盖交付物 |
|------|------|-----------|
| TASK-009 | 隐私政策页 + 零网络 / 无存储约束 | DEL-010 |
| TASK-010 | 安装说明 + 使用说明 | DEL-011、DEL-012 |
| TASK-011 | 测试用例（文档 / 脚本） | DEL-013 |
| TASK-012 | LICENSE 文件（MIT 或 Apache-2.0） | DEL-014 |
| TASK-014 | 打包 ZIP + 完整源码 + 体积 / 零依赖护栏 | DEL-015、DEL-016 |
| TASK-015 | 里程碑交付节奏 + 交付物齐全验收 | DEL-018（本文档）、AC-019 |

**落点文件**：`extension/privacy.html`、`INSTALL.md`（+`docs/INSTALL.md`）、`USAGE.md`（+`docs/USAGE.md`）、`tests/test-cases.md`、`tests/README.md`、`LICENSE`、`scripts/package.mjs`、`dist/raw-copy-1.0.0.zip`。

**验收判据**
- 隐私页含三项声明（不收集数据 / 不传输数据 / 全部本地完成）及敏感信息警示。
- 全仓 `extension/**` 无 `fetch(`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`/`localStorage`/`indexedDB`/`chrome.storage`/遥测关键词。
- 安装/使用说明含「加载已解压 → 指向 `extension/`」完整步骤；测试用例覆盖 AC-001..AC-022 与 checklist §C 16 项边界。
- `LICENSE` 为 MIT；打包 ZIP 含 21 条目、解压 130.53KB < 200KB、`manifest.json` 位于根。

**状态**：✅（`check-zero-network.mjs` 17/17、`npm test` 123/123、体积门禁 PASS、AC-019 八项逐条勾对通过 — 见 `docs/DELIVERABLES-CHECKLIST.md`）；Chrome/Edge 双端安装冒烟 ⏳ 待 E2E-16。

---

## 附：TASK ↔ 里程碑完整映射（TASK-001..016）

| TASK | 里程碑 | 交付物/需求 |
|------|:------:|-------------|
| TASK-001 | M1 | DEL-001、DEL-009 |
| TASK-002 | M1 | DEL-002 |
| TASK-003 | M2 | DEL-003 |
| TASK-004 | M2 | DEL-004 |
| TASK-005 | M3 | DEL-005 |
| TASK-006 | M3 | DEL-006 |
| TASK-007 | M3 | DEL-007 |
| TASK-008 | M4 | DEL-008 |
| TASK-009 | M5 | DEL-010 |
| TASK-010 | M5 | DEL-011、DEL-012 |
| TASK-011 | M5 | DEL-013 |
| TASK-012 | M5 | DEL-014 |
| TASK-013 | M1 | DEL-017 |
| TASK-014 | M5 | DEL-015、DEL-016 |
| TASK-015 | M5 | DEL-018、AC-019 |
| TASK-016 | M4 | REQ-033、AC-016 |

<!-- butler:covers DEL-018 -->
