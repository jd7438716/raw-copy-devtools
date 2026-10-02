# 开发领域知识

> 主写: butler-captain | 也读: butler-rf-fixer, butler-cr-reviewer, butler-config-changer, butler-frame-builder, butler-developer
> 最后更新: 2026-07-08

## 约定

### bash 超时配置
| 场景 | timeout |
|------|---------|
| 常规操作 | 60000ms |
| 构建/编译 | 300000ms |
| 测试 | 120000ms |
| 安装依赖 | 300000ms |

### 必需环境变量
| 变量 | 值 | 作用 |
|------|-----|------|
| `OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS` | `300000` | 全局 bash 超时(5min) |
| `OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS` | `true` | 启用后台 subagent |

### 步数规则
- steps: 80 — 所有 agent 统一
- 有进展不停 — 只要在推进就一直做
- 死循环 → 咨询用户 — 连续 3 次零进展 → 输出报告请用户决定

### Tools 层代码规范
- 统一 ESM 导入：禁止混用 import/require
- execSync 必须设 timeout（推荐 30000ms）
- 确定性检测规则硬编码：不接受 LLM 参数注入
- 检测模式覆盖变体：DA02 匹配 @ts-expect-error: 带冒号注释；DA04 匹配 .skip/.only
- 校验脚本中的字符串字面量提取：手写状态机（code/line/block/sq/dq/tpl）比正则可靠；前提是被扫描文件不用正则字面量（若用需另加状态）。

### CASCADE_IMPACT 契约
- 生产者: butler-sa
- 4 字段: TARGET / CHANGE_TYPE(new|modify|delete|refactor) / AFFECTED / IMPACT
- 消费者: butler-strategist (引用到 memory/sa/entries/{slug}.md)

## 发现

- (2026-07-07) [extracted from project/KNOWLEDGE.md] 关键模块: butler-analysis.ts, butler-async.ts, butler-bg.ts (异步工具)
- (2026-07-07) [extracted from project/KNOWLEDGE.md] verification artifacts: TASK-N.verdict, memory/auto/
- (2026-10-02) [TASK-013] 纯 Node 内置模块手写「最小合法 PNG」的可靠模式（零依赖，generator 可复现）：
  IHDR(13B: w/h 各4B + 位深8 + colorType6=RGBA + compression/filter/interlace 全0) →
  每个 chunk 前置4B长度 + 4B类型 + data + 4B CRC32（多项式 0xEDB88320，覆盖 类型+data）→
  IDAT = `zlib.deflateSync(raw, {level:9})`，raw 为每行前置 filter 字节 0 的 RGBA 扫描线 →
  IEND 空 chunk。
- (2026-10-02) [TASK-013] PNG 校验应分两层：① 位级（校验签名 + 逐 chunk 重算 CRC + `inflateSync(IDAT)` 后核对长度 == `height*(1+width*4)`）；② 真解码器交叉验证（Windows 用 .NET `System.Drawing.Image.FromFile`，能加载即浏览器可解析）。仅读文件头不足以证明可解析。

## 发现（TASK-016 i18n）

- (2026-10-02) Node 24 的 `node --test <目录>` 不会把目录当测试发现目标（会尝试 require 目录 → MODULE_NOT_FOUND）。跨平台写法：`node --test "tests/**/*.test.mjs"`（Node 内置 glob，Windows cmd 下也能被 node 自行展开）。
- (2026-10-02) 纯逻辑模块（i18n 等）保持零浏览器 API 依赖，即可在 Node 直接 `import` 做单元测试；出现 `console` 以外的浏览器全局前必须加 typeof 守卫。
- (2026-10-02) 复制文本中的逐字符契约标记（`===== REQUEST =====`、`[Request Body]`、`[Binary content omitted: ...]`）也应集中进 i18n 字典，但 zh/en 均保持原英文常量，避免翻译破坏 AC-007/AC-010 保真比对。

## 发现（TASK-001 MV3 manifest 门禁）

- (2026-10-02) MV3 权限门禁的机械验证要双层：① 禁止键结构断言（`key in manifest`：host_permissions/tabs/webRequest/declarativeNetRequest/content_scripts/background）；② 原始 JSON 文本子串断言（`!raw.includes('all_urls')`）—— `<all_urls>` 是权限**值**不是键，只查键会漏。
- (2026-10-02) 断言 icons 时用 `existsSync(join(EXT_ROOT, rel))` 落到真实磁盘，不能只信 manifest 声明的路径（防声明了不存在的文件仍误判 PASS）。
- (2026-10-02) devtools.js 在 DevTools 上下文外会没有 `chrome.devtools`，注册前必须 `typeof chrome === 'undefined' || !chrome.devtools` 守卫 + 友好告警，避免抛 ReferenceError。

## 发现（TASK-002 面板 UI 外壳）

- (2026-10-02) 浏览器专属入口壳（`panel.js`）作为 `<script type="module">` 延迟执行 → DOM 已就绪，模块顶层 `document.querySelector` + 末尾 `init()` 安全；但也因此不可在 Node 直接 import。约定：入口壳不承担可单测纯逻辑，纯逻辑放 `src/*.js`（TASK-006/008 可单测）。
- (2026-10-02) 「零硬编码文案」用两道机械门禁守住：① 静态 HTML 全文件禁汉字（可见文案一律 `data-i18n*`，由 JS 经 `t()` 注入）；② JS 用状态机扫描字符串字面量（跳过注释/模板）判汉字。后者避免"中文注释"误伤，比整文件正则更准。
- (2026-10-02) i18n 键覆盖需独立校验：合并 HTML 的 `data-i18n*` 属性键 + JS 里 `t('...')` 字面量键，逐一比对 `dict.zh` 与 `dict.en`，防止引用不存在键（否则 `t()` 回退成 key 并 warn）。
- (2026-10-02) 为虚拟滚动预埋 CSS 契约：固定行高用 `--row-height`、列宽用共享 `--col-grid`，表头与数据行复用同一 grid 模板 → TASK-004 只需做数学定位，无需改 CSS。

## 发现（TASK-003 请求捕获 + 环形缓存）

- (2026-10-02) 环形缓冲用「固定 `Array(cap)` + `head` + `count` + `Map(id→rec)`」三件套：`head` 指向下一个写入槽，满时 `buf[head]` 即最旧项 → 覆盖淘汰 O(1)；`all()` 从 `(head - count + cap) % cap` 按序展开（满/未满两态统一公式，避免用 `head` 直接开头导致未满时错位）。
- (2026-10-02) 订阅者通知走**事件对象** `{type,id,record,evicted}`（而非多个位置参数）：可扩展、自描述，且 add 与 clear 能共用一条通知通道；遍历前先 `Array.from(subscribers)` 快照并 try/catch，避免「订阅者抛错/中途增删订阅」破坏处于页面请求热路径的捕获回调。
- (2026-10-02) 捕获模块在 Node 直接 import 的前提：模块顶层**零浏览器全局读取**，把 `globalThis.chrome` 的取值放进 `installCapture` 函数体内，并支持 `options.chrome` 注入 → 既满足真实扩展运行，又让 fake-chrome 单测可验证 addListener/normalize/store.add/removeListener 全链路。
- (2026-10-02) HAR→RequestRecord 归一化必须**复制** headers/content（不保留原 entry 引用）：ADR-003 要求释放 `entry.getContent` 闭包，否则长期持有会连带保留响应体造成内存泄漏；单测用「normalize 后修改 entry / 修改 record」双向断言证明无别名共享。
- (2026-10-02) 设计文档与遗留任务文件名冲突时以 design.md 接口表为准：TASK-003.md 写 `request-store.js`/`har-map.js`，design.md §5.3 冻结为 `src/store.js`/`src/capture.js`，按后者落盘并在交接备注显式说明，避免下游 TASK 按旧名 import 失配。

## 发现（TASK-014 零依赖可复现 ZIP 打包）

- (2026-10-02) 手写「最小可加载 ZIP」的可靠模式（零依赖）：local file header(30B) + name + data → 逐个；再 central directory file header(46B) + name；最后 EOCD(22B)。压缩用 `zlib.deflateRawSync(data,{level:9})`（**raw** deflate，不能带 zlib 头，否则 ZIP 解压器拒绝）；CRC32 覆盖**未压缩**原文（多项式 `0xEDB88320`）。`manifest.json` 必须在根且条目名不加 `extension/` 前缀 → 解压目录可直接「加载已解压的扩展程序」。
- (2026-10-02) ZIP **可复现**的关键是抹掉时间源：DOS 时间/日期字段写固定值（如 1980-01-01 → time=0x0000, date=0x0021），并对条目按名排序后再计算 local header offset。否则 mtime 漂移导致每次打包 sha256 不同。

## 发现（TASK-007-enh panel.js 右键菜单 / 入口壳集成验证）

- (2026-10-02) 浏览器入口壳（`panel.js`）不可 Node import，但仍可做**运行时集成验证**：手写最小 DOM 桩（FakeElement/FakeDocument）注入 `document`/`window`/`getComputedStyle`/`requestAnimationFrame`/`navigator`，再以假 `chrome.devtools.network.onRequestFinished.addListener` 注入记录，动态 `import(panel.js)` 后派发真实事件。证据强度显著高于纯静态 grep，且零依赖。
- (2026-10-02) Node 24 `globalThis.navigator` 为只读 getter：`globalThis.navigator = {...}` 抛 `TypeError`；须 `Object.defineProperty(globalThis, 'navigator', { configurable:true, writable:true, value })`。
- (2026-10-02) 「两入口等价」类 AC 必须在 harness 里**分别触发两个入口**并捕获同一副作用（`clipboard.writeText` 的字符串）后 `assert.equal`；只断言「共用一个函数」不足以证明接线正确。附 `assert.notEqual(modeAText, modeBText)` 防止退化为空串的假通过。
- (2026-10-02) 自绘菜单生命周期 = 「hidden + 清空子节点 + 解绑 document/window/element 级监听」；用单一布尔做幂等挂/解，避免每次右键累积监听器。
- (2026-10-02) 段裁剪类 P2 的保真要守住**边界字符**：按行取 `[start,end)` 后仅去除段间空行，不 trim 正文；断言「裁剪产物是全量产物的逐字符子串 + 首行为段标记 + 不含另一段标记」。
- (2026-10-02) 打包脚本要「写完就独立读回解析」：重新定位 EOCD → 遍历 central directory → 按 offset 读 local header → `inflateRawSync` 解压 → 逐条目重算 CRC32/尺寸比对。复用内存对象自证 = 假阳性温床；独立读回还能顺带验证「不含 butler/tests/docs/req.txt」与「条目 ↔ 磁盘源一一对应」。
- (2026-10-02) 零第三方依赖审计用三条正则覆盖 `import x from 'X'` / 副作用 `import 'X'` / 动态 `import('X')`；判定「以 `.` 或 `/` 开头 = 内部」，其余 = 第三方。`chrome.*` 走全局对象不产生 import → 天然不计入。否定式门禁同样要**反向探针**（临时插入 `import 'lodash'` → 期望 exit 1 → 删除复跑 exit 0）。
- (2026-10-02) 用外部真解码器做交叉验证：.NET `System.IO.Compression.ZipFile.OpenRead` 列出条目 + 读回 `manifest.json`，可证明自研 ZIP 结构被通用实现接受（等价于 Chrome 能解压）。

## 发现（TASK-009 隐私页 + 零网络门禁）

- (2026-10-02) 「零网络/零存储」这类否定式合规约束，最可靠的机械证据是一个**独立递归扫描器**（`scripts/check-zero-network.mjs`），逐条规则打印 PASS，并且必须做一次**反向探针**（临时插入含 `fetch(`/`localStorage` 的文件 → 期望 exit 1 → 删除复跑 exit 0）来证明扫描器非空跑；否则 ALL-PASS 可能是「规则写错却没人发现」。
- (2026-10-02) 扫描器自身的规则要避开「合规文案误伤」：隐私页的中文「无分析/无遥测」不应触发 `analytics/telemetry` 规则——关键字规则只匹配英文 SDK/API 标识（analytics/telemetry/gtag/mixpanel/sentry/amplitude/posthog），中文标题不匹配。
- (2026-10-02) 静态隐私页（DEL-010）的 AC 常以「子串包含」验收；设计声明的两种措辞（任务版「不收集任何数据…」与 spec/AC 版「不收集数据…」）应在页面中**同时出现**（正文卡片 + 一句摘要），避免任一精确子串匹配落空。
- (2026-10-02) DevTools 面板内打开扩展自带静态页：`chrome.tabs.create` 需 `tabs` 权限（与最小权限门禁冲突），改用 `window.open('privacy.html','_blank')`（相对路径解析为 `chrome-extension://<id>/privacy.html`，扩展页自行打开无需 web_accessible_resources）+ `preventDefault()` 防止面板被导航覆盖。
- (2026-10-02) 在既有入口壳（panel.js）追加功能时，注意门禁脚本会扫描其**字符串字面量**；追加的注释/代码不得含中文字符串字面量、不得用正则字面量（旧扫描器不解析 `/`）。追加代码内联使用 `window.open` 即可，无需 import。

## 发现（TASK-004 列表渲染 + 搜索/过滤 + 虚拟滚动）

- (2026-10-02) 虚拟滚动把「窗口数学」抽成纯函数 `computeWindow({scrollTop,viewportHeight,rowHeight,total,overscan})→{start,end,offset,count}`：可 Node 直测、1000 条断言只渲染 15 行；`createVirtualList` 只负责 DOM 装配与事件，DOM 相关部分用极简桩测。
- (2026-10-02) 行宿主 `#list-body` 是 `position:relative`，真正滚动的父级 `#list` 是 `overflow-y:auto`；虚拟列表须**向上找可滚动祖先**（computed overflowY + `scrollHeight>clientHeight` 启发式），并用 `scrollTop - container.offsetTop` 扣除 sticky 表头偏移——否则窗口整体错位一行。
- (2026-10-02) DOM 复用实现：维护行元素池，窗口大小变化时只 append/remove 差值；`renderRow` 仅在「行索引变化或数据版本变化」时重跑，滚动时复用同批元素（测试断言 `before[0] === after[0]`）。
- (2026-10-02) 过滤条件里 `status` 的「码段」用 `^([1-5])[xX]{1,2}$` 判定首位数字前缀，精确码用 `Number()` 相等；`resourceType` 因 Chrome `_resourceType` 为小写而 UI 选项大写，采用「全值 + 大小写不敏感」（非前缀，测试用 `'doc'` 不命中 `'document'` 固定语义）。
- (2026-10-02) 工具栏下拉的派生选项 `collectOptions` 用 WeakMap 缓存指纹（`values.join('\u0000')`）——集合未变不重建 `<option>`，避免每次新请求都重排下拉并丢用户当前选择；重建时 `select.value = 旧值` 保选。
- (2026-10-02) 展示顺序约定：`store.all()` 为最旧→最新，UI 需最新在上 → `filtered.slice().reverse()` 后 `setData`（不依赖 store 顺序语义反转，明确在 panel 层做）。

## 发现（TASK-005 选中交互）

- (2026-10-02) 单选状态机以 `selectedId`（id 本身）为唯一真源、按下标**惰性派生** `currentIndex()`：避免缓存 index 在过滤/排序/追加后失效；`move` 每次现算 `index + delta` 再 clamp，天然处理「可见列表变化」。
- (2026-10-02) 可见列表变化走显式 `setIds(list)` 后再校正选中：若选中不在新列表 → 清空（`current()===null`），绝不让状态指向已移除项；过滤/排序只影响排列时保留选中并按新下标继续 move。
- (2026-10-02) 淘汰联动（ADR-004）由调用方把 `store` 事件的 `evicted` 转给 `selection.onEvict(id)`，而非 selection 自己去订阅 store——保持 selection 纯逻辑、零依赖、可 Node 直测；`onChange(id,index)` 回调用 try/catch 隔离消费者异常。
- (2026-10-02) 高亮复用虚拟滚动版本机制：`renderRow` 内按 `activeSelection.current()` 加/去 `.is-selected`，选中变化时调 `virtualList.refresh()`（version+1 → 重跑窗口内 renderRow）；行点击另用 `#list-body` 事件委托 + `closest('.row')` + `data-index`，因 render.js 的 `onSelect` 契约目前未主动派发点击。
- (2026-10-02) 键盘可用性闭环：`#list` 已带 `tabindex=0` → `keydown` 监听 ArrowUp/Down 并 `preventDefault()`（否则方向键滚动容器）；行点击后 `#list.focus()` 保证「点击再按 ↑↓」连续可用；移动后 `virtualList.scrollToId(current())` 让选中始终可见。选中态同时维护复制按钮 `disabled` 与 `getSelected()`，把状态交给 TASK-006/007 而不实现复制。

## 发现（TASK-006 复制拼接 / 逐字符保真）

- (2026-10-02) **保真拼接的实现范式**：段结构用 `string[]` 逐行 push，body 作为**单个数组元素**压入，最后 `join('\n')`——body 内部所有换行/前后空白/CJK/emoji 完全不受影响；绝不用 `+=` 或任何会对 body 做 trim/replace 的操作。这是 AC-007「逐字符」最稳的结构。
- (2026-10-02) **逐字符测试的机械断言**：`out.indexOf(body)` 定位后用 `Array.from(out.slice(...))` 与 `Array.from(body)` 做 `deepEqual`（逐 UTF-16 码元），再加三条反断言：不含 `JSON.stringify(JSON.parse(body),null,2)`、不含 ` ``` `、不含 `\t`。比「字符串相等」更能暴露隐藏的格式化。
- (2026-10-02) **转义验证的陷阱**：验证「字面 `\n`/`\t`/`\uXXXX` 序列不被改动」时，测试必须写在源文件（非 shell `-e`/heredoc），否则 shell 先吞一层反斜杠，测的就成了真实控制字符。配合 `JSON.parse(body)` 不抛错 + `!out.includes('\t')` 反证输入确为字面转义。
- (2026-10-02) **模式 A 只「加壳」**（ADR-006）：标题段（`===== META =====`/`===== REQUEST =====`/`===== RESPONSE =====`）与段标签（`[Request Body]`/`[Response Body]`）是允许新增的全部；元信息仅进标题段，缺失字段整行跳过；无 body 时不输出标签、不留多余空行。模式 B 完全无壳。两模式 body 子串必须逐码元一致。
- (2026-10-02) **可注入 body 的接口设计**：`buildCopyText(record, mode, { requestBody, responseBody, includeMeta })` 用 `hasOwnProperty` 区分「未提供（回退 record）」与「显式提供空值」，让 TASK-008 的内容分类（二进制/base64/大响应占位）无需改 formatter 即可注入分类结果，保持 formatter 纯函数且零依赖。


## 发现（TASK-008 大响应 / 二进制 / Base64 分类）

- (2026-10-02) **内容分类的判定顺序必须是设计真源说了算**：ADR-008 规定 `encoding==='base64'` **优先**——文本 MIME 解码、非文本 MIME（含 image/png 这类二进制）一律 `base64-omitted`；只有非 base64 才走「二进制 MIME → binary」。若按任务 bullet 的并列描述实现，image/png+base64 会同时命中两条规则而结果不定。把「判定优先级」在 JSDoc 里显式写出并落成用例，是消除歧义的关键。
- (2026-10-02) **非法 base64 的坑**：`Buffer.from(x,'base64')` 与 `atob` 对非法输入都**不抛**（Buffer 静默忽略非法字符返回垃圾）。要真正实现「非法→回退占位」，必须先做显式校验：去空白后 `length % 4 === 0` + `^[A-Za-z0-9+/]*={0,2}$`（`=` 只能尾部、最多 2 个）。否则「回退」分支永远不会触发。
- (2026-10-02) **Node/浏览器双环境解码**：优先 `Buffer.from(b64,'base64').toString('utf8')`（Node），否则 `atob` → `Uint8Array` → `TextDecoder('utf-8')`（浏览器扩展页）。用 `typeof Buffer !== 'undefined'` 探测而非打包判断，让同一份源码既可在扩展内运行又可在 Node 下 import 单测。
- (2026-10-02) **占位符是输出契约就逐字符锁死**：`[Binary content omitted: <mime>, <bytes> bytes]` / `[Base64 content omitted: length N]` 用 `assert.equal` 整串比对（MIME 先 `strip ';' 参数 + trim + toLowerCase` 归一化），并在 `i18n.js` 保留同值键，避免格式漂移。
- (2026-10-02) **阈值边界语义要写死**：`isOverThreshold` 用**严格大于**（`size > threshold`），并单测 `=10MB → false`、`10MB+1 → true`；`byteSize` 解析「优先 size，缺失回退 UTF-8 字节长度」用 `TextEncoder`，与列表大小列口径一致。
- (2026-10-02) **分类注入不破坏保真**：panel 通过既有 `buildCopyText(record, mode, { responseBody })` 注入分类结果——text/base64-text 用 `text`（与 `record.responseContent.text` 在 text 类下逐字符相同），binary/base64-omitted 用占位，unavailable 用 i18n 文案。formatter 一行不改，AC-007 保真路径不受影响。

## 发现（TASK-004 增强 多记录拼接器 bulkformatter）

- (2026-10-02) **外层聚合的单一真源范式**：批量拼接只做「逐条调用冻结的 `buildCopyText` + 外层加序号标记」，模块内零 body 处理。用「每个单条输出必须是批量文本中的连续子串（`indexOf` + `slice` 逐字符比对）」作为机械断言，把「不重写拼接」从约定变成可验证契约。
- (2026-10-02) **跨模块可选注入的 `undefined` 语义陷阱**：formatter 用 `hasOwnProperty('responseBody')` 区分「未提供」与「显式空值」。因此聚合层在 `resolveBody` 缺省时**必须不传 options**（而非 `{responseBody: undefined}`），否则响应体会被误抑制而非回退 `record.responseContent.text`。跨模块传「可选项」前，先确认下游是 `!== undefined` 判定还是 `hasOwnProperty` 判定。
- (2026-10-02) **批量段边界的分段断言**：模式 A 段内含空行，不能用 `split('\n\n')` 切段。规范做法：① 精确构造期望整串 `assert.equal`（最强）；② 用标记行 `===== #i/N =====\n` 的 `indexOf` 切出第 i 段正文，再与单条 `buildCopyText` 逐 UTF-16 码元比对。标记行还能直接正则计数来验证「段数 === N」。
- (2026-10-02) **N=1 委托边界应在入口分派**：`buildBulkCopyText` 内 `if (total===1) return blocks[0]`，与 N≥2 的加标记路径分开，保证「逐字符与单选一致、无标记」；把两种输出形态写进同一条分支判断，比让底层 `joinBlocks` 再判更不易漏。
- (2026-10-02) **签名歧义用「参数是否有用」反推**：`joinBlocks(blocks, N)` 若 blocks 已含标记则 N 成死参，故 blocks 必为不含标记的原样段、标记由函数按 N 生成。歧义时据此裁决并写进 JSDoc + 交付说明，避免评审各执一词。

## 发现（TASK-006 增强 右键菜单纯逻辑 contextmenu）

- (2026-10-02) **DOM 属性是字符串、领域 id 是 number —— 边界要显式还原**：`render.js` 写 `data-id = String(record.id)`，而 store 的 record id 为 number、`selection.selectId` / `Set<number>` 均用严格相等。`resolveRowId` 若直接返回 `getAttribute` 的字符串，下游 `has(id)`/`selectId(id)` 会静默失配。解法：仅当 `String(Number(raw)) === raw`（round-trip 规范表示）时还原为 number，其余原样返回，既命中主流又不动非常规 id。
- (2026-10-02) **纯逻辑模块收事件对象用鸭子类型**：`resolveRowId(event, listBodyEl)` 只依赖 `event.target.closest` 与 `row.getAttribute`/`dataset`，不 import 任何 DOM 类型。单测用最小桩对象即可覆盖「嵌套子元素/表头/空白/closest 抛错/contains 抛错」，无需 jsdom。
- (2026-10-02) **禁用占位比隐藏更安全**：P2 能力未接线时，菜单项仍返回但 `enabled=false`，并把「是否已接线」收敛成单一布尔开关 `canCopyRequestOnly`（默认 false）。这样 UI 位置稳定、永不误触发未实现动作，执行路径裁决可延后到接线任务而不返工模型。
- (2026-10-02) **门禁脚本按行文本匹配时，注释也会命中**：`check-zero-network` 类的逐行 includes 对注释同样生效，因此新模块注释里**不要出现**禁用关键字字面量（含「反例说明」）。本模块全篇以「浏览器原生菜单 API / 零浏览器 API」替代，保持 0 命中。
- (2026-10-02) **全仓文本门禁需限定文件类型**：`rg "chrome\.contextMenus" extension/` 会命中 `styles/panel.css` 里「not chrome.contextMenus」的既有说明注释，造成权限违规假阳性。代码级门禁应 `-g '*.js' -g '*.html'`；CSS 注释不构成权限引用。

## 发现（TASK-003 增强 panel.js 多选接线）

- (2026-10-02) **「集合 + 主光标」双层选中态的可见性判定**：多选包装（multiselection）在 `move(±1)` 后清空集合、把主光标落到新行（集合为空、`count()===0`）。若 `renderRow` 只用 `has(id)` 判高亮，「↑↓ 单选移动」的行不可见。正确：`has(id) || current()===id`。凡「集合态 + 单选回落态」并存，渲染判定必须同时覆盖两层。
- (2026-10-02) **切换状态机来源的低成本自检**：把 `const selection` 替换为 `const multi` 后，用 `grep -n "\bselection\b" panel.js` 扫旧标识符残留——入口壳（panel.js）不可 Node import，漏改一个 `selection.xxx()` 只会到浏览器运行时才 `ReferenceError`，静态 grep 是唯一低成本兜底。
- (2026-10-02) **同一能力在不同模块的接口名可能不同**：基线 `selection.reset()` ↔ 包装 `multi.clear()`（无 reset）。迁移接线前先核对新模块实际导出表，不照抄旧调用名。
- (2026-10-02) **入口壳接线的机械证据形态**：panel.js 无 DOM 测试框架时，用「接线点 → 实际行号 → `grep` 命中」对照表 + 纯逻辑模块单测 + 全量回归 三件套，替代不可行的 DOM 集成测试。
- (2026-10-02) **回调内引用稍后声明的绑定**：函数声明受提升、`const` 有 TDZ。`createMultiSelection({onChange})` 内调用 init 后段声明的 `updateMultiToolbar()`（函数声明，OK）；但若该回调内部引用后声明的 `const multi`，必须确认构造函数不立即 emit（本例构造期不触发 onChange，无 TDZ 风险）。
- (2026-10-02) **接线期可安全引用「未来任务补齐的 i18n 键」**：`t(key)` 缺键按契约回退 key 字面量且不抛；本任务用 `multi.selectedCount` 键、由后续 TASK-010 补 zh/en。登记为跨任务遗留而非缺陷，且不越界改 `i18n.js`（保持「本 TASK 只改 panel.js」边界）。

## 发现（TASK-009 增强 panel.js 双击详情接线）

- (2026-10-02) **「单击选中 + 双击打开」分流的关键是「双击不改集合」**：浏览器在 dblclick 前必发 click，故 dblclick 处理只需 `resolveRowId` → 打开抽屉，**不得再调 `multi.selectAt`、不得 `stopPropagation`**（否则误伤已完成的单选替换）。AC-010「单击仅选中、双击才打开」因此天然成立。
- (2026-10-02) **覆盖式抽屉的「关闭后列表/滚动保持」是自然结果，不需要额外保存-恢复**：抽屉 `position:absolute; inset:0`，列表始终挂载于其下，隐藏抽屉即恢复可见，`scrollTop` 与选中态从未被触碰。真正的实现点是 onClose 里把焦点还给 `#list`（键盘连续性），而非重建列表。
- (2026-10-02) **打开期间要主动移走焦点，防止底层键盘监听劫持状态**：`#list` 有 keydown ↑↓ 监听且打开抽屉时仍持焦，会在用户认为「在看详情」时偷偷改动底层选中，令「详情所示记录 === 主按钮复制对象」失真。打开后 `focus()` 到 `#detail-close` 即消除该竞态，也让 Esc/Enter 键盘可达。
- (2026-10-02) **淘汰联动要覆盖 store 的两条淘汰路径 + clear**：环形缓冲淘汰同时可能来自 `add` 事件携带的 `evicted`（新增挤掉最旧）与显式 `evict` 事件（字节预算兜底）；只在其中一条接 `onEvict` 会漏关闭。另 `clear` 应同步关闭详情。`detailView.onEvict(id)` 自判「是否当前项」并用返回值决定是否 Toast，避免调用方重复判断。
- (2026-10-02) **P2「详情内复制 === 主按钮」用共享函数而非复制粘贴**：`runDetailCopy` 直接调 `buildCurrentCopy(copyMode)`，与 `#copy-btn` 同源，AC-011 的逐字符一致由结构保证；再在 harness 里分别点击两个入口、比较 `getLastCopyText()` 做行为级证明。
- (2026-10-02) **「新增 UI 不改 HTML」的追加式做法**：`#detail-copy-btn` 由 JS 在既有 `.detail-pane__header` 内、`#detail-close` 旁 `insertBefore` 创建，`textContent = t('detail.copyButton')`。既满足 ADR-020「既有 id 不改名、新能力追加」，又把改动面锁死在 panel.js，避免与 panel.html 冻结契约冲突。
- (2026-10-02) **入口壳的运行时验证可用「同源静态服务器 + 浏览器 MCP」替代手写 DOM 桩**：起一个只读 `extension/` 的临时 http server（`/__harness.html` 内存返回），用 chrome-devtools MCP `navigate_page` + `evaluate_script` 在真实 Chrome 里加载 panel.html markup、注入 `chrome.devtools.network.onRequestFinished` 桩喂 HAR entry、派发真实事件。比手写 DOM 桩更真（真 DOM/真事件/真 ESM），且 harness 全在系统 temp、跑完删除，仓库零残留。


## 发现（TASK-011/012 rework 打包期注释剥离 / 体积门禁）

- (2026-10-02) **「体积门禁失败」优先看可剥离的非语义字节，而不是砍功能**。本仓 JS 共 207,814 B，其中整行注释 96,708 B + 整行空白 583 B（合计 46.8%），剥离后解压总量 236,655 → 139,364 B，一次性从 231KB 降到 136KB。**先量化「注释/空白/重复」占比**再决定优化手段，通常一次即达标。
- (2026-10-02) **行级注释剥离要「保守且可证」**：只剔除 trim 后以 `//` 开头、以块注释起始符开头（含块内行）以及整行空白的行；其余行**原样保留**。**绝不做 inline 注释剥离**（`code // comment` 的正确切断需要完整词法分析，正则/行级做不可靠）。用「节省量 == 注释字节 + 空白字节」可反证只移除了这两类。
- (2026-10-02) **剥离的安全前提必须先机械验证，而不是假设**：① 统计「代码行（非整行注释）中含反引号」的数量必须为 0 —— 否则多行模板字符串内的行会被整行误删；② 检查不存在「块注释结束符后同行仍有代码」的行；③ 所有被 `toString('utf8')` 再 `Buffer.from(...,'utf8')` 的文件需 round-trip 相等（防非法 UTF-8 被替换字符改写语义）。三项全绿才允许用行级方案。
- (2026-10-02) **剥离后必须 `node --check` 且 fail-closed**：把剥离结果写入 `os.tmpdir` 临时 `.mjs` → `execFileSync(process.execPath,['--check',tmp])`，任一失败即 `exit 1` **不写出 zip**。语法校验只是下限，但能结构性拦住「误删代码行」；再叠加读回阶段二次校验（双保险）与反向探针（插入坏文件期望 exit 1）。
- (2026-10-02) **打包期转换会改变「读回条目 == 磁盘源字节」的既有断言**：需要把该断言的口径从「原始磁盘字节」改为「对磁盘源重新施加同一确定性变换后的期望字节」，且**在读回阶段重新从磁盘推导**（不复用打包期内存对象），以保留「独立读回、防生成器自证」的性质。
