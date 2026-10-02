# Raw Copy — DevTools 网络请求原始信息一键复制

> 在 Chrome / Edge 的 DevTools 里，选中一条或多条网络请求，一键把**完整请求 + 完整响应**的原始信息复制成纯文本，直接粘给 AI 或贴进 Bug 报告。
>
> **不美化 JSON、不改动响应体、不附加无关请求、不发任何网络请求。**

<p align="center">
  <img alt="Manifest" src="https://img.shields.io/badge/Manifest-V3-blue">
  <img alt="Chrome" src="https://img.shields.io/badge/Chrome-latest-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Edge" src="https://img.shields.io/badge/Edge-latest-0078D7?logo=microsoftedge&logoColor=white">
  <img alt="Dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen">
  <img alt="Tests" src="https://img.shields.io/badge/tests-302%20passing-success">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## 为什么需要它

Chrome DevTools 的 Network 面板里，想拿到**一条请求的完整信息**很麻烦：

- 请求头 / 请求体 / 响应头 / 响应体分散在不同标签页，只能逐个复制；
- 原生「Copy as cURL」**只有请求，没有响应**；
- 原生 HAR 导出只能导出全部或选中多条，格式复杂；
- 你往往**只想要某一条（或某几条）请求**，不想把无关请求一起带走。

Raw Copy 在 DevTools 里新增一个独立面板，把这些信息**一次性、原样**拼成纯文本。

---

## 功能特性

- **单条复制** — 选中一条请求，得到「完整请求 + 完整响应」纯文本。
- **多选批量复制** — `Ctrl/Cmd+点击` 逐条切换、`Shift+点击` 范围选择；「复制选中(N)」一次复制多条，段间有清晰分隔。
- **右键即复制** — 在请求行上右键弹出菜单，直接复制（无需到底部找按钮）；多选状态下可右键已选中行批量复制。
- **双击看明细** — 双击某条请求，打开完整明细视图（方法 / URL / 请求头 / 请求体 / 状态 / 响应头 / 响应体），可读、可关闭。
- **两种输出模式**
  - **模式 A（默认）**：带 `===== REQUEST =====` / `===== RESPONSE =====` 标题段；
  - **模式 B**：纯原始拼接，无任何标题。
- **字符级保真** — 不解析 JSON、不缩进、不排序、不转义、不加 Markdown 代码块；响应体按原始字符输出。
- **实时请求列表** — 方法 / 域名 / 路径 / 状态码 / 资源类型 / 耗时 / 大小 / 时间；URL 参考 DevTools 拆成「域名 + 路径」两列，长链接不再挤占整行；内存最多保留最近 **1000** 条（环形缓存）。
- **默认隐藏静态资源** — 一键隐藏 `.js` / `.css` / 字体 / 图片 / 媒体 / PDF 等非 API 请求，只留可调试的 XHR / Fetch / Document；开关可随时恢复显示全部（隐藏项仍保留在内存）。
- **清除网络日志** — 一键清空当前捕获列表，重新开始。
- **搜索与过滤** — 按 URL 关键字搜索，按请求方法 / 状态码 / 资源类型过滤；列表支持虚拟滚动，千条不卡。
- **大响应与二进制处理** — 超阈值提示；二进制以 `[Binary content omitted: <mime>, <bytes> bytes]` 标注；Base64 按 MIME 判断解码或标注。
- **复制可靠** — 优先 `navigator.clipboard.writeText`，失败降级 `document.execCommand('copy')`；成功/失败均有提示。

### 复制输出示例（模式 A）

```
===== REQUEST =====
POST https://api.example.com/v1/login HTTP/1.1
Host: api.example.com
User-Agent: Mozilla/5.0 ...
Content-Type: application/json
Accept: application/json
Cookie: sessionid=abc123

[Request Body]
{"username":"test","password":"123456"}

===== RESPONSE =====
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 45
Set-Cookie: token=xyz789; Path=/

[Response Body]
{"code":0,"message":"success","token":"xyz789"}
```

> 响应体 `{"code":0,"message":"success","token":"xyz789"}` **逐字符原样输出**：不格式化、不排序、不加代码块。

---

## 安装

本项目**无需构建**，直接加载已解压的扩展即可（Chrome / Edge 通用）：

1. 下载或克隆本仓库；
2. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）；
3. 打开右上角 **开发者模式**；
4. 点击 **加载已解压的扩展程序**，选择本仓库的 `extension/` 目录；
5. 打开任意页面的 DevTools（F12），顶部标签栏会出现 **Raw Copy** 面板。

> 也可以使用已打包的发行版：解压 `dist/raw-copy-1.1.0.zip` 后按上述步骤加载解压目录。

详细图文步骤见 [`INSTALL.md`](./INSTALL.md)。

---

## 使用

1. 打开 DevTools → **Raw Copy** 面板；
2. 页面产生请求后，列表会实时显示；
3. 找到目标请求（可搜索 / 过滤）；
4. 复制方式任选：
   - **单击**选中 → 点底部「模式 A / 模式 B」按钮直接按对应格式复制；
   - 在行上**右键** → 菜单里选择复制；
   - `Ctrl/Cmd+点击`、`Shift+点击` **多选** → 点「复制选中(N)」批量复制；
5. 在「你的控制权」之外没有任何后台行为——**只有你主动点击时**才会写入剪贴板。

完整操作说明见 [`USAGE.md`](./USAGE.md)。

---

## 隐私与权限

Raw Copy 是一个**完全本地运行**的开发者工具：

- **最小权限**：清单只申请 `clipboardWrite` 一项；**没有** `<all_urls>`、`host_permissions`、`tabs`、`webRequest`、`declarativeNetRequest`。
- **零网络**：扩展代码不含任何 `fetch` / XHR / `sendBeacon` 等网络调用，安装后不向任何服务器发送数据（由 `scripts/check-zero-network.mjs` 静态门禁守护）。
- **零持久化**：所有请求数据只存在于 DevTools 内存中，关闭 DevTools 即销毁；不使用 storage / cookie。
- **零依赖**：纯原生 JavaScript（ESM），无第三方运行时依赖，无遥测 / 分析 / 广告。

> 提示：复制内容会包含 `Cookie`、`Authorization`、Token 等敏感原文——这是本工具的设计用途（便于你分析接口），请自行注意粘贴对象的可信度。

隐私声明见扩展内的 [`extension/privacy.html`](./extension/privacy.html)。

---

## 项目结构

```
extension/            # 扩展本体（可直接“加载已解压”）
├── manifest.json     # MV3 清单（permissions: clipboardWrite）
├── devtools.html/js  # DevTools 页面注册
├── panel.html/js     # 面板 UI 与编排
├── privacy.html      # 隐私声明页
├── styles/panel.css  # 面板样式
├── icons/            # 16/32/48/128 图标
└── src/              # 纯逻辑模块（原生 ESM）
    ├── capture.js         # 请求捕获 + 异步 getContent 保真取体
    ├── store.js           # 环形缓存(1000) + 原地回填 + 字节预算
    ├── filter.js          # 搜索/过滤
    ├── hidefilter.js      # 静态资源判定 + 视图隐藏（零 import 纯逻辑）
    ├── urlparts.js        # URL → 域名 / 路径（列表展示用）
    ├── render.js          # 列表渲染 + 虚拟滚动
    ├── selection.js       # 单选核心
    ├── multiselection.js  # 多选包装（Ctrl/Shift/全选）
    ├── contextmenu.js     # 右键菜单模型
    ├── bulkformatter.js   # 多选批量拼接
    ├── detail.js          # 双击明细视图
    ├── formatter.js       # 请求+响应 → 原始纯文本（模式 A/B）
    ├── content.js         # 大响应 / 二进制 / Base64 处理
    ├── clipboard.js       # 剪贴板写入 + 降级
    └── i18n.js            # 中文优先文案（预留英文）
tests/                # 单元/接线测试（node:test，302 用例）
scripts/              # 零依赖门禁与打包脚本
docs/                 # 安装/使用/里程碑/交付清单
dist/                 # 打包后的发行 ZIP
```

---

## 开发

要求：Node.js（内置 `node --test`，无需安装依赖）。

```bash
npm test          # 运行全部单元/接线测试（302 用例）
npm run lint      # 语法检查（等价 build）
npm run package   # 生成 dist/raw-copy-<version>.zip 并做体积/依赖/读回门禁
```

质量门禁（`scripts/`）：

| 脚本 | 作用 |
|---|---|
| `check-syntax.mjs` | 全部 JS 语法检查 |
| `check-manifest.mjs` | 清单结构 / 版本 / 权限断言 |
| `check-panel-shell.mjs` | 面板 DOM 契约（关键 id 不缺失） |
| `check-zero-network.mjs` | 静态扫描：禁止任何网络/存储/遥测关键字 |
| `package.mjs` | 打包 ZIP + 体积(<200KB)/零依赖/读回校验 |

架构决策、需求规格与测试矩阵见仓库内 `butler/spec/` 与 `tests/test-cases.md`。

---

## 兼容性

- 最新版 **Google Chrome**（Chromium）与 **Microsoft Edge**；
- Manifest V3，DevTools 扩展（无需 background service worker，无需 content script）；
- 打包体积（解压）< 200KB。

---

## 路线图 / 贡献

- 欢迎 issue 与 PR。提交前请确保 `npm test`、`npm run lint`、`npm run package` 全部通过。
- 有意一并维护的候选：非 Chrome 系浏览器（Firefox DevTools）适配、更多输出格式（cURL / PowerShell / fetch 片段）等。

---

## 许可证

[MIT](./LICENSE)。

---

## English

**Raw Copy** is a Manifest V3 DevTools extension for Chrome/Edge that copies the **full raw request + response** of one or several selected network requests as plain text — no JSON beautification, no modification of the original body, no extra requests, and **no network calls at all**. It requests only the `clipboardWrite` permission, has zero third-party dependencies, and keeps all data in DevTools memory.
