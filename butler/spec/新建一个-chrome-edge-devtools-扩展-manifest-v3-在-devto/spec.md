# Spec — 新建一个 Chrome/Edge DevTools 扩展（Manifest V3）

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> 人读视图，与 `spec.json` 内容一致（机器真源 = `spec.json`）
> 生成: 2026-10-02 by butler-requirement-analyst（v1.1 覆盖重写）

## Source

- `req.txt`（Chrome DevTools 单条网络请求原始信息一键复制扩展 需求文档 v1.0）
- 老板本步原话（Phase ① 需求分析指令：新建 Chrome/Edge DevTools MV3 扩展）
- `butler/spec/新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto/requirement.md`

## Items

### 用户故事（US）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| US-001 | data | req.txt §4 | 作为前端开发，选中单条请求一键复制完整请求+响应原文，直接粘贴给 AI 分析 |
| US-002 | data | req.txt §4 | 作为测试工程师，把完整请求与响应原始信息附到 Bug 报告 |
| US-003 | data | req.txt §4 | 作为后端开发，查看浏览器实际发出/收到的请求响应原文以排查接口 |
| US-004 | data | req.txt §4 | 作为技术支持，把用户侧请求完整复制出来分析 |

### 需求（REQ）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| REQ-001 | ui | req.txt §3.1/§5.1 | DevTools 新增独立面板，与 Elements/Console/Network 并列，名称 Raw Copy 或 请求复制 |
| REQ-002 | api | req.txt §5.2 | 自动捕获当前页面请求，支持 XHR/Fetch/Document/Script/Stylesheet/Image/Font/Media/WebSocket 等 |
| REQ-003 | api | req.txt §5.2 | 请求列表实时更新，新请求自动追加 |
| REQ-004 | data | req.txt §5.2/§9 | 内存最多保留最近 1000 条请求，超出淘汰最旧，防内存泄漏 |
| REQ-005 | ui | req.txt §5.3 | 列表每行显示：方法/URL/状态码/资源类型/耗时(ms)/大小/时间 |
| REQ-006 | ui | req.txt §5.3 | 按 URL 关键字搜索 |
| REQ-007 | ui | req.txt §5.3 | 按请求方法过滤 |
| REQ-008 | ui | req.txt §5.3 | 按状态码过滤 |
| REQ-009 | ui | req.txt §5.3 | 按资源类型过滤 |
| REQ-010 | ui | req.txt §5.3 | 点击某一行选中该请求 |
| REQ-011 | ui | req.txt §5.3 | 支持键盘上下键切换选中项 |
| REQ-012 | ui | req.txt §5.4 | 选中后提供『复制请求 + 响应（原始）』按钮 |
| REQ-013 | ui | req.txt §5.4 | 可选附加按钮：仅复制请求 / 仅复制响应 / 复制为 cURL（非必须，P2） |
| REQ-014 | data | req.txt §5.4/§3.1 | 复制只处理当前选中单条，绝不附加其他请求 |
| REQ-015 | data | req.txt §5.5 | 请求部分含：方法/完整 URL/HTTP 版本(缺失回退 HTTP/1.1)/请求头(原始顺序)/请求体(原始文本) |
| REQ-016 | data | req.txt §5.5 | 响应部分含：状态码/状态文本/响应头(原始顺序)/响应体(原始文本) |
| REQ-017 | data | req.txt §5.5 | 可选元信息：开始时间/总耗时/资源类型/MIME，放标题段不干扰正文 |
| REQ-018 | data | req.txt §5.6 | 模式 A 简单格式化（默认），带 ===== REQUEST ===== / ===== RESPONSE ===== 标题 |
| REQ-019 | data | req.txt §5.6 | 模式 B 纯原始模式，无标题直接拼接 |
| REQ-020 | data | req.txt §5.7 | 禁止格式化：不解析 JSON/不缩进换行排序/不压缩/不改字符/不转 Markdown/不截断 |
| REQ-021 | data | req.txt §5.8 | 文本响应默认完整复制 |
| REQ-022 | data | req.txt §5.8 | 响应超阈值（如 10MB）提示用户是否继续复制 |
| REQ-023 | data | req.txt §5.8 | 二进制响应不复制内容，标注 [Binary content omitted: <mime>, <bytes> bytes] |
| REQ-024 | data | req.txt §5.8 | Base64 响应：文本类 MIME 尝试 UTF-8 解码，否则标注 [Base64 content omitted: length N] |
| REQ-025 | ui | req.txt §5.9 | 复制成功 Toast『已复制到剪贴板』/失败提示原因；内容不经网络传输 |
| REQ-026 | ops | req.txt §7.2 | 最小权限：仅 clipboardWrite；无 <all_urls>/host_permissions/tabs/webRequest/declarativeNetRequest |
| REQ-027 | ops | req.txt §3.2/§8 | 无网络请求代码、无服务器、无分析、无遥测、无广告 |
| REQ-028 | ops | req.txt §8 | 数据仅存 DevTools 内存，关闭 DevTools 即销毁，不收集/不存储/不传输 |
| REQ-029 | ops | req.txt §9 | 性能：捕获不影响页面性能；虚拟滚动，1000 条不卡顿 |
| REQ-030 | ops | req.txt §9 | 兼容最新版 Chrome 与 Edge（Chromium 内核） |
| REQ-031 | ops | req.txt §9 | 扩展包体积 < 200KB |
| REQ-032 | ops | req.txt §7.1/§9 | 零第三方运行时依赖，纯原生 JavaScript |
| REQ-033 | ui | req.txt §9 | 界面语言中文优先，可预留英文 |
| REQ-034 | ops | req.txt §9 | 可靠性：复制成功率 100%，异常有提示 |
| REQ-035 | api | req.txt §7.4 | HAR 字段映射：request.method/url/headers/postData.text；response.status/statusText/headers/content.text/encoding/mimeType；time；startedDateTime |
| REQ-036 | api | req.txt §7.1/§7.3 | 架构：MV3 + devtools_page + panels.create + onRequestFinished；无需 background SW/content script；Clipboard 优先 navigator.clipboard.writeText，降级 execCommand('copy') |

<!-- MD-PART2 -->
