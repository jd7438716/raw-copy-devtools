# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-10-02

### Added
- **右键菜单复制**：在请求列表行上右键弹出面板内菜单，可直接复制「请求 + 响应（原始）」；多选状态下右键已选中行可批量复制。菜单为面板内自绘 DOM，**不申请 `contextMenus` 权限**。
- **多选批量复制**：支持 `Ctrl/Cmd+点击` 逐条切换、`Shift+点击` 范围选择、`全选` 与「复制选中(N)」；批量输出按条分段、段间有清晰分隔，每条内容仍为原始纯文本。
- **双击查看明细**：双击请求行打开完整明细视图（方法 / URL / 请求头 / 请求体 / 状态 / 响应头 / 响应体），内容与复制口径一致（原始文本、不美化），可关闭返回列表。
- 两种输出模式的**独立按钮**（模式 A / 模式 B），点击即按对应模式复制，默认模式 A。
- 新增模块：`src/multiselection.js`、`src/contextmenu.js`、`src/bulkformatter.js`、`src/detail.js`。

### Fixed
- **响应体丢失**：此前复制输出的 `[Response Body]` 显示为「（响应体不可用）」。根因是捕获层只同步读取 HAR `response.content.text`，而 Chromium 的 HAR entry 默认不携带正文。现改为捕获后**独立异步调用 `harEntry.getContent()`**（兼容回调 / Promise 双形态）取回正文并原地回填，401 等错误响应也能完整复制。
- **多选漏条**：多选后经右键菜单复制只输出 1 条。根因是右键在弹菜单前无条件把选择替换为命中的单行，导致批量项不可达。现统一入口语义（命中已选中行保留选择集，命中集合外才替换），并修正 `Ctrl+Shift` 混合选择为 additive 并集。

### Changed
- 复制模式由「单按钮切换」改为「A/B 独立按钮，动作即模式」。
- 移除右键菜单中的「仅复制请求」「仅复制响应」（与 DevTools 原生能力重复），收敛复制入口。
- 存储层新增字节预算（默认 64MB）与有界并发队列，缓解大响应场景的内存放大。

### Security
- 权限保持最小化：仅 `clipboardWrite`；无 host / tabs / webRequest / declarativeNetRequest；零网络调用、零持久化。

## [1.0.0] - 2026-10-02

### Added
- 首个版本：Manifest V3 DevTools 面板，实时捕获网络请求列表（环形缓存最多 1000 条，虚拟滚动）。
- 按 URL 关键字搜索，按方法 / 状态码 / 资源类型过滤；点击与 `↑↓` 键选中。
- 单条请求「完整请求 + 响应」原始纯文本复制；模式 A（简单格式化）/ 模式 B（纯原始）。
- 字符级保真：不解析 JSON、不缩进、不排序、不改字符、不加 Markdown、不截断。
- 大响应阈值提示、二进制省略标注、Base64 按 MIME 处理。
- 剪贴板写入（`navigator.clipboard` + `execCommand` 降级）与成功/失败提示。
- 隐私声明页、安装/使用说明、测试用例、图标、MIT LICENSE、打包脚本。

[1.1.0]: https://github.com/jd7438716/raw-copy-devtools/releases/tag/v1.1.0
[1.0.0]: https://github.com/jd7438716/raw-copy-devtools/releases/tag/v1.0.0
