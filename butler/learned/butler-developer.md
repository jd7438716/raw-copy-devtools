# butler-developer 学习记录

> auto-maintained by butler system
> 此文件由任务完成后自动追加，不可手动删除

---

## 自动采集条目
> 以下由 plugins/butler-async.ts E5.3 自动追加

## 手动反哺

### 2026-10-02 — TASK-013（图标资源 / 手写 PNG）
- rounds: 1 | level: novice
- 经验: 零依赖生成二进制资源时，把「生成器」与「校验器」拆成两个脚本：生成器只写文件，校验器独立重新读盘并做位级解析 + 真解码器交叉验证。避免生成器自证导致假阳性。
- 经验: 小图标（≤16px）需要更高超采样（12×12）才能边缘平滑；大图标 4×4 足够且更快。
- 经验: 本仓 `scripts/` 目录有并行任务写入（观察到 `check-syntax.mjs` 同时出现），只写自己 TASK 的脚本、不改他人文件。


## TASK-001 (2026-10-02)

- 交付 MV3 DevTools 扩展的清单 + 注册页（manifest.json / devtools.html / devtools.js）+ manifest 门禁脚本。
- 经验：权限门禁这类"否定式断言"必须同时做两种检查——① 逐键 `key in manifest`（结构层），② 对原始 JSON 文本 `includes('all_urls')`（字符串层），因为 `<all_urls>` 可能藏在 permissions 数组值里而非键名。
- 经验：devtools.js 在真实 DevTools 上下文外（如被 Node/普通页面加载）`chrome.devtools` 不存在，必须加守卫并友好告警，否则会抛 ReferenceError；守卫也让 `node --check` 之外的行为更健壮。
- 经验：断言脚本对"文件存在"用 `existsSync(join(EXT_ROOT, rel))` 直接落到磁盘，避免只信 manifest 声明的路径。
- rounds: 2 | level: novice

## TASK-016 (2026-10-02)

- 交付 i18n 模块（extension/src/i18n.js）+ 语法门禁脚本 + node:test 单测。
- 经验：字典设计用点分层级键；`t()` 的回退顺序 = 当前语言 → zh → key(带 E_I18N_MISSING_KEY warn)，既满足 en 结构占位不告警，又满足缺 key 可读回退。
- 经验：npm script 在 Windows 下不要依赖 shell glob 展开，交给 Node 内置 glob（引号包裹模式）。
- 自评：符合宪法红线「修改必须 build+test 验证」；无第三方依赖。

## TASK-002 (2026-10-02)

- 交付 DevTools 面板 UI 外壳（panel.html + styles/panel.css + panel.js）+ 34 项 DOM/文案门禁脚本。
- 经验：给"后续任务要扩展的 UI 壳"写代码时，把「稳定 DOM 契约（id 清单）」显式写进代码注释 + 门禁脚本 + 文档三处，并一次性 `export const els`，避免后续任务各自 querySelector 造成 id 漂移。
- 经验：AC 是「文案中文优先、预留 i18n」这类主观要求时，落成可机械验证的形态（HTML 零汉字 + JS 字符串字面量扫描零汉字 + 键覆盖比对），评审就不必逐字肉眼核对。
- 经验：手写字符串字面量扫描器（状态机）比正则更稳，且能明确"中文注释合法、中文字面量非法"的边界；前提是被扫描文件不用正则字面量。
- rounds: 1 | level: novice

## TASK-003 (2026-10-02)

- 交付请求捕获 + 内存缓存（`extension/src/store.js` 环形缓冲 + `extension/src/capture.js` HAR 归一化/onRequestFinished 注册）+ 25 条 node:test 单测。
- 经验：纯逻辑模块（store）做到「零 import + 零浏览器全局」即可在 Node 直接 import 单测；捕获模块把 `globalThis.chrome` 取值延迟到函数内并支持 `options.chrome` 注入，就能在无 DevTools 环境单测注册/卸载全链路。
- 经验：环形缓冲容量边界（未满 vs 已满）用同一展开公式 `(head-count+cap)%cap` 处理，比维护独立 `start` 指针少一处状态、少一类 off-by-one。
- 经验：任务文件里的遗留文件名与 design.md 接口表冲突时，以 design.md 冻结接口为准并在交接备注写明，防止下游 import 按旧名失配。
- rounds: 1 | level: novice

## TASK-009 (2026-10-02)

- 交付隐私政策页（extension/privacy.html）+ panel.js 隐私入口接线（window.open）+ 零网络/零持久化静态扫描器（scripts/check-zero-network.mjs）。
- 经验：「零网络」门禁的证据强度取决于**反向探针**：只跑一次 ALL-PASS 无法区分「真的干净」与「规则根本没生效」。插入违规临时文件 → 期望 exit 1 → 删除复跑 exit 0，才算可信。
- 经验：隐私文案的 AC 常按精确子串判定，同一页里同时给出「任何」版与「简版」两种措辞（`不收集任何数据` + `不收集数据`），可同时满足任务描述与 spec/AC 的字面要求。
- 经验：面板内打开扩展静态页用 `window.open`（`chrome.tabs.create` 需 tabs 权限，与最小权限门禁冲突）；顺带把过时的 TODO 注释改成实际实现说明，避免后续任务误以为还有 getURL 接线未做。
- 自评：符合宪法红线「修改必须 build + 独立断言验证」；零第三方依赖；未改 manifest/devtools/panel.html。
- rounds: 1 | level: novice

## TASK-004 (2026-10-02)

- 交付列表渲染 + 搜索/过滤 + 虚拟滚动（`extension/src/filter.js` + `extension/src/render.js` + panel.js 接线）+ 23 条 node:test 单测。
- 经验：性能类 AC（1000 条不卡顿）要落成可机械断言的形态——把窗口算法抽成纯函数 `computeWindow`，断言「1000 条 → 仅 15 行」；`< 50` 一行阈值断言比肉眼观察滚动更可信。
- 经验：虚拟列表的滚动容器不一定是传入的 `container`（本例 `#list-body` 的滚动父级是 `#list`）。组件要向上探测可滚动祖先，并用 `scrollTop - container.offsetTop` 扣掉 sticky 表头，否则窗口错位。
- 经验：DOM 复用 = 行元素池 + 「索引变化或数据版本变化才重跑 renderRow」；用 DOM 桩测「滚动后首批元素引用不变」直接证明复用而非重建。
- 经验：任务文件与 design.md 接口表再次冲突（`list-view.js` vs `src/render.js`+`src/filter.js`）——一律以 design.md §5.3 冻结接口为准并写进交接备注。
- 经验：给 panel.js（<script type=module> 入口壳，不可 Node import）追加代码时，门禁只扫字符串字面量；实现中所有输出文案走 `t()` 键（ASCII）即可安全通过「零中文字面量」门禁。
- rounds: 2 | level: novice

## TASK-005 (2026-10-02)

- 交付选中交互（`extension/src/selection.js` 单选状态机 + panel.js 点击/↑↓ 接线）+ 13 条 node:test 单测；全量回归 66/66。
- 经验：单选状态以「id」为真源、下标按需派生，比缓存 index 稳——过滤/排序/追加都会改变下标，缓存 index 迟早指错行。
- 经验：可见列表变化用 `setIds` 校正选中：不在新列表就清空、绝不指向已移除项；`onEvict` 只清选中项本身，纯逻辑模块不反向依赖 store。
- 经验：render.js 的 `onSelect` 契约当前未派发点击事件；在 panel.js 用 `#list-body` 事件委托 + `closest('.row')` + `data-index` 补上，既不改前置模块又能对齐虚拟列表下标。
- 经验：键盘可用性要三件套闭环——容器 `tabindex`（已有）+ `preventDefault`（防方向键滚动）+ 点击后 `focus()`（保证点击→键盘连续）；移动后 `scrollToId` 保证选中可见。
- rounds: 1 | level: novice

## TASK-006 (2026-10-02)

- 交付复制拼接核心（`extension/src/formatter.js` 纯函数模式 A/B + panel.js 生成文本接线）+ 24 条 node:test 单测；全量回归 90/90。
- 经验：**「逐字符保真」要落成可机械断言的形态**——把 body 子串 `indexOf` 后 `Array.from()` 逐 UTF-16 码元 `deepEqual`，并加「不得包含美化 JSON / ``` / 制表符」的反断言；比肉眼比对可信得多。
- 经验：验证「字面反斜杠转义」时要小心**多层转义陷阱**——shell `-e`/heredoc 会先把 `\\n` 吃掉；测试必须写在 `.mjs` 源文件里（真反斜杠），并同时断言 `JSON.parse` 可解析 + `!out.includes('\t')` 反证输入确为字面 `\t` 而非真制表符。
- 经验：任务描述转述与 design.md 接口/契约冲突时（本例模式 A 的元信息渲染与 body 段标签），以被点名的设计真源（ADR-006）+ 既有 user-facing 文档（USAGE.md）+ i18n 键为准，并把裁决写进交付说明，避免评审各执一词。
- 经验：纯函数模块把「段结构」做成数组 push 再 `join('\n')`——body 作为**单个数组元素**压入，天然保留其内部所有换行/空白，不会被 join 改变；比字符串 `+=` 拼接更不易引入意外字符。
- 经验：`panel.js`（module 入口壳，不可 Node import）追加接线时，所有输出文案继续走 `t()` ASCII 键，即可安全通过「零中文字面量」门禁；新增导出（`buildCurrentCopy`）供后续 TASK 消费。
- rounds: 1 | level: novice

## TASK-007 (2026-10-02)

- 交付剪贴板双路径降级 + Toast（`extension/src/clipboard.js` + panel.js 接线 + i18n 键 + panel.js P2 提示）+ 14 条 node:test 单测；全量回归 104/104。
- 经验：**「降级链」要在每个失败分类上都有显式用例**——primary 抛异常、`navigator.clipboard` 缺失、完全无 navigator、execCommand 返回 false、execCommand 自身抛异常、无 document。只测「primary reject → 降级成功」会漏掉「降级也炸」的分支。
- 经验：降级路径的临时节点清理必须放在 `finally`，并让失败注入（execCommand 抛异常）用例断言「body 无残留」——否则清理只在成功分支生效的 bug 不会被发现。
- 经验：DOM 相关模块（clipboard/Toast）用 `deps` 注入 `{navigator, document, el, setTimeout, clearTimeout}` 后，可完全在 Node 下确定性地测自动隐藏/计时器清理，无需 jsdom 或假计时器库；计时器用「记录型 fake setTimeout」拿到回调后手动触发即可。
- 经验：任务描述与设计文档在「`via` 取值措辞」上不一致时（任务说 `'async'`，ADR-007 说 `'clipboard'`），以**更具体的任务描述**为准并在交付说明记录；返回值判定（`ok`）不受影响。
- 经验：给 panel.js 增加 P2 占位按钮提示时要走 i18n 键（新增 `copy.notEnabled` 且 zh/en 同步），否则既触发「零中文字面量」门禁、又破坏 i18n 键集对齐测试。
- rounds: 1 | level: novice

## TASK-008 (2026-10-02)

- 交付响应体内容分类核心（`extension/src/content.js`：`classifyBody`/`isOverThreshold`/`DEFAULT_LARGE_THRESHOLD`）+ panel.js 接线（注入 `options.responseBody` + 超阈值 confirm）+ i18n 键 + 19 条 node:test 单测；全量回归 123/123。
- 经验：**并列描述的规则一定要先定优先级**。任务把「二进制 MIME→binary」与「base64+非文本 MIME→base64-omitted」并列，image/png+base64 会双命中；以被点名的设计真源 ADR-008（base64 分支优先）裁决，并写进 JSDoc + 专门用例，避免评审争议。
- 经验：**第三方「宽容解析」是隐式陷阱**——`Buffer.from(x,'base64')`/`atob` 对非法输入静默返回垃圾而非抛错。要交付「非法→回退」行为，必须自己写严格校验（%4 + 字母表 + 填充位置），并给 6 种非法样本各一条用例，否则回退分支形同虚设。
- 经验：**Node/浏览器双环境能力用「探测」而非「假设」**：`typeof Buffer !== 'undefined'` 走 Node 分支、否则 `atob`+`TextDecoder`。纯逻辑模块保持零 import 即可同时满足「浏览器运行」与「Node 单测」。
- 经验：占位符既然是 AC 契约，测试就整串 `assert.equal`（不 `includes`），并对占位里的 MIME 先归一化（去 `;` 参数/小写）再断言，固定住对外可见格式。
- 经验：**扩展既有纯函数靠 options 注入口**，不要改它——复用 TASK-006 预留的 `options.responseBody` 注入分类结果，formatter 零改动即满足 AC-007 逐字符保真，同时把新增复杂度隔离在 content.js。
- 经验：panel.js 不可 Node import（顶层触碰 DOM），因此其接线只能靠静态门禁 + 对纯逻辑模块的单测 + 一次性集成抽检脚本间接保证；集成抽检（classifyBody→buildCopyText 断言原串 `includes`）是不引入 DOM 测试框架的低成本手段，跑完即删不留垃圾。
- rounds: 1 | level: novice

## TASK-006（增强：右键菜单纯逻辑 contextmenu）(2026-10-02)

- 交付 `extension/src/contextmenu.js` + 39 条 node:test 单测；全量回归 235/235；check-syntax 14/14。
- 经验：**DOM 读回来的 id 是字符串，别直接丢给严格相等下游**。`data-id` 是 `String(record.id)`，而 store/selection 的 id 是 number。回读边界按「round-trip 规范表示」还原（`String(Number(raw))===raw`）——既让 `selectId/has` 命中，又不误改 `007`/`req-abc` 这类非常规 id。凡是「序列化到 DOM 再读回」的 id 都要在这一层收口。
- 经验：**纯逻辑模块的事件参数用鸭子类型，不 import DOM 类型**。只依赖 `event.target.closest` + `row.getAttribute`/`dataset`，单测用最小桩对象就能覆盖嵌套/表头/抛错，无需 jsdom；这让「零 DOM 依赖、Node 直测」真正成立而非口号。
- 经验：**未实现能力的菜单项用禁用占位而非隐藏**，并把可用性收敛成单一布尔开关（`canCopyRequestOnly`），UI 结构稳定、永不误触发；执行路径未裁决也不阻塞模型交付，接线任务只需翻转开关。
- 经验：**门禁按行文本匹配时注释同样算命中**。新模块注释必须规避禁用关键字字面量（连「反例」也不写）。同时发现全仓 `rg` 会命中 CSS 里的说明注释造成假阳性 → 代码门禁应限定 `-g '*.js' -g '*.html'`；跨文件问题记入遗留、不擅自改范围外文件。
- rounds: 1 | level: novice

## TASK-014 (2026-10-02)

- 交付可复现打包脚本 `scripts/package.mjs` + 发行包 `dist/raw-copy-1.0.0.zip`（21 条目，解压 130.53KB / 压缩 51.16KB）+ package.json `package` 脚本；回归 123/123 PASS。
- 经验：**手写 ZIP 的格式契约要一次对齐**——deflate 必须用 `deflateRawSync`（无 zlib 头）；CRC32 覆盖未压缩原文；中央目录每个条目的 `local header offset` 必须指向该条目 local header 起点（不是数据起点）；EOCD 的三处计数/偏移（条目数、central dir size、central dir offset）错一个解压器就报错。
- 经验：**「可复现」= 消除一切时间/随机源**。把 DOS date/time 固定为常量再对条目排序，两次运行 sha256 完全一致（本任务实测一致）；否则 mtime 一漂移体积/哈希就变，评审无法复核。
- 经验：**打包脚本必须自带独立读回校验**，而不是打包完打印「成功」。重新从磁盘解析 zip、inflate、重算 CRC、断言 manifest 与禁用路径——这样「生成器自证」的假阳性被结构性排除。对否定式门禁（零依赖 / 不含某目录）再加一次反向探针。
- 经验：外部真解码器交叉验证（.NET `System.IO.Compression.ZipFile`）是零成本的强证据：能列全条目 + 读回 manifest.json，即证明自研 ZIP 被通用实现接受 ≈ Chrome 可 load unpacked。
- 经验：`package.json` 增脚本时严格保留 `test/build/lint` 原值（本任务只加一行 `package`），避免把并行任务的脚手架覆盖掉。
- rounds: 1 | level: novice

## TASK-004（增强：多记录拼接器 bulkformatter）(2026-10-02)

- 交付批量外层聚合 `extension/src/bulkformatter.js` + 26 条 node:test 单测；全量回归 196/196。
- 经验：**外层聚合模块必须「只组装、不重写」**——段内容直接调用冻结的 `buildCopyText` 产出，标记/分隔只在外面加；用「每个单条输出必须作为连续子串出现在批量文本中」的断言把「单一真源」变成可机械验证的契约，而非口头承诺。
- 经验：**`hasOwnProperty` 型可选注入的坑**：formatter 用 `hasOwnProperty('responseBody')` 区分「未提供（回退 record）」与「显式空值」，所以聚合层缺省 resolveBody 时**绝不能传 `{responseBody: undefined}`**（会被判为显式覆盖 → 响应体丢失）。要么不传 options、要么先判断 `typeof resolveBody === 'function'`。这类「undefined 也是值」的语义在跨模块注入时反复出现。
- 经验：**N=1 边界要在入口分派、不要靠数学统一**：模板对 N≥2 加序号、N=1 委托单选无标记，二者是两种输出形态；在 `buildBulkCopyText` 里 `if (total===1) return blocks[0]` 显式分派，比让 `joinBlocks` 内部再判更清晰，且保证「逐字符与单选一致」。
- 经验：`joinBlocks(blocks, N)` 的 `N` 只有用于生成 `#i/N` 分母才有意义 → 反推 `blocks` 应为**不含标记**的原样段；若假设已含标记则 `N` 成死参。签名歧义时用「参数是否有用」反推语义，并写进 JSDoc + 交付说明。
- 经验：批量输出的段边界不能用 `split('\n\n')`（段内模式 A 本身含空行），要么精确构造期望整串 `assert.equal`，要么按标记行 `indexOf` 切段；后者用来做「逐字符 === 单条」「无跨条混淆」的分段断言。
- rounds: 1 | level: novice

## TASK-003（增强：panel.js 多选接线 / 唯一契约切换点）(2026-10-02)

- 交付 `extension/panel.js` 多选接线（createSelection → createMultiSelection，接线点 a–i）+ 静态核查；全量回归 261/261；三门禁 PASS。仅改 panel.js，冻结 selection/formatter 零编辑。
- 经验：**「集合高亮」不能只看 Set 成员**。`multi.move(±1)` 会清空集合、把主光标落到新行（`count()===0`），此时若 `renderRow` 只按 `has(id)` 判定，↑↓ 移动到的行不会高亮 → 违反「↑↓ 仍是单选移动」。正确做法是 `has(id) ‖ current()===id`：集合态由 has 主导，单选回落态由 current 兜底。凡是「集合 + 主光标」双层状态，可见性判定必须同时覆盖两层。
- 经验：**切换状态机来源时，用「旧标识符残留 grep」兜底**。把 `const selection` 改名 `const multi` 后，逐个 `selection.` 引用（create/onSelect/setIds/current/move/onEvict/reset/click）都要手动替换；收尾用 `grep -n "\bselection\b"` 确认只剩注释，避免漏改导致运行时 `ReferenceError`（panel.js 无法 Node import，漏改不会被单测发现）。
- 经验：**`reset` vs `clear` 的接口对齐**。基线 `selection.reset()` 在 multiselection 中对应 `clear()`（multi 无 reset）；同类接口迁移要按新模块实际导出名接线，不能照抄旧调用名。
- 经验：**面板入口壳的接线只能靠「静态 grep + 纯逻辑单测 + 全量回归」三件套**（无 DOM 框架）。为每个接线点建立「契约 → 实际行号 → grep 命中」对照表，评审可机械化复核，比口头声明可靠。
- 经验：**回调里引用「稍后声明的函数」是可行的**（函数声明提升），但引用「稍后声明的 `const`」要确认回调触发时机在其声明之后（本例 `multi` 构造不 emit，onChange 只在 refreshView 之后触发，无 TDZ 风险）。
- 经验：**跨任务 i18n 键缺失是排期而非缺陷**。TASK-003 用 `t('multi.selectedCount',{count})`，键由 TASK-010 补；`t()` 的 key 回退契约让接线期可安全引用未来键（显式登记为遗留 R-B，不越界改 i18n.js）。
- rounds: 1 | level: novice

## TASK-007（增强：panel.js 右键菜单接线 / P2 分段裁剪）(2026-10-02)

- 交付 `extension/panel.js` 右键菜单接线（contextmenu 委托 + 自绘菜单 + 键盘/关闭时机 + P2 分段裁剪 + `openContextMenu` 导出）+ `panel.css` 1 行注释改述；全量回归 261/261；三门禁 PASS；临时 headless harness 6 组断言 PASS。
- 经验：**「入口壳不可 Node import」不等于「不可运行时验证」**。panel.js 顶层触碰 DOM 是硬约束，但可以用**手写最小 DOM 桩**（~150 行 FakeElement/FakeDocument：closest/contains/children/listeners/createElement）+ `chrome.devtools.network.onRequestFinished` 的假 addListener 注入记录 → 动态 `import(panel.js)` → 派发真实事件，把 AC-001/002/003 变成可执行断言；比只做静态 grep 的证据强度高一个量级，且零依赖、零 jsdom。
- 经验：**验证脚本本身要先证明「init 真的跑了」**。harness 里先 `assert(typeof capturedRequestFinished === 'function')`，否则桩没接上时后续断言可能全在空状态上「假通过」。同理，虚拟列表渲染后先断言 `rows.length >= 2` 再取行。
- 经验：**Node 24 的 `globalThis.navigator` 是只读 getter**，直接赋值抛 `TypeError: Cannot set property navigator`；注入 fake 必须 `Object.defineProperty(globalThis, 'navigator', {configurable:true, writable:true, value})`。这是「DOM 桩单测」的第一个暗礁。
- 经验：**AC「两入口逐字符等价」要派发真实事件去比，而不是读同一函数的源码**。主项与 `#copy-btn` 共用 `runCurrentCopy()`，但在 harness 里仍分别点击两个入口、各自捕获 `navigator.clipboard.writeText` 的字符串再 `assert.equal`——这才证明「入口接线」而非仅「函数复用」。（同时断言 A≠B，排除「两模式都退化成空串」的假通过。）
- 经验：**菜单关闭要「隐藏 + 清子节点 + 解绑文档级监听」三件套**。挂 `document` mousedown/keydown + `window` blur + `#list` scroll 的监听若只 hidden 不解绑，会随每次右键累积泄漏；用单一 `menuListenersAttached` 布尔做幂等挂/解，harness 对四条关闭路径逐条断言 `hidden===true && children.length===0`。
- 经验：**P2「裁剪」的风险在边界字符，不在选择器**。按行 `slice(indexOf(start), indexOf(end))` 后必须去掉 formatter 段间插入的尾部空行、且**不得 trim 正文**；用「裁剪产物是模式 A 全量产物的逐字符子串（`full.includes(part)`）」+「首行 === 段标记」+「不含另一段标记」三重断言，既验证裁对口径又守住保真。
- 经验：**给冻结模块的既有导出加消费者是零风险扩权**。formatter 已导出 `REQUEST_SECTION/RESPONSE_SECTION`，接线直接 import 即可；不需要为了「P2 helper」新增模块或改 `contextmenu.js`，保持「本任务只改 panel.js + 1 行 CSS」的最小改动面。
- rounds: 1 | level: novice

## TASK-009（增强：panel.js 双击详情接线 / P2 详情内复制 / 淘汰自动关闭）(2026-10-02)

- 交付 `extension/panel.js` 详情接线（唯一改动文件；追加式导出 `openDetail/closeDetail`）+ 门禁三件套 + 全量回归 261/261 + 临时 headless harness 23/23；仅改 panel.js，冻结 `detail.js`/`formatter.js`/`selection.js`/`contextmenu.js` 零编辑。
- 经验：**「单击选中 + 双击打开」的分流靠「dblclick 什么都不改」**。浏览器 dblclick 前必发 click，单击已把该行单选替换；dblclick 处理器只要 `resolveRowId` → 开抽屉，**不得再改集合、不得 stopPropagation**。AC「单击不打开、双击才打开」由此天然成立，无需在 click 里加时间窗防抖（那会引入新的竞态）。
- 经验：**覆盖式抽屉的「关闭返回列表且滚动/选中保持」几乎不需要代码**：列表始终挂载在 `position:absolute; inset:0` 的抽屉之下，切 hidden 即恢复；实现点其实是 onClose 里把焦点还给 `#list`。
- 经验：**打开抽屉要主动 `focus()` 到关闭按钮**。否则 `#list` 仍持焦，用户看详情时按 ↑↓ 会命中底层键盘监听、偷偷改动选中，使「详情所示 === 复制对象」失真；移焦同时改善 Esc 可达性。
- 经验：**淘汰联动必须覆盖 store 的全部淘汰路径**：`add` 事件携带的 `evicted`（容量挤掉最旧）与 `evict` 事件（字节预算兜底）是两条独立路径，`clear` 也要关；只接一条会漏。用 `detailView.onEvict(id)` 自判「是否当前项」并以返回布尔决定 Toast，调用方无重复判断。
- 经验：**「两入口逐字符等价」继续用「共享函数 + 行为级 harness 双侧点击」双证**：`runDetailCopy` 复用 `buildCurrentCopy(copyMode)`（结构同源），harness 里分别点 `#detail-copy-btn` 与 `#copy-btn`、比较 `getLastCopyText()`（行为同源）。
- 经验：**「新增 UI 但不改 HTML」用 JS 追加节点**：`#detail-copy-btn` 由 `ensureDetailCopyButton()` 在既有 `.detail-pane__header` 内 `insertBefore` 到 `#detail-close` 前，`textContent = t('detail.copyButton')`；满足 ADR-020「既有 id 不改名、能力追加」，改动面锁死在 panel.js。
- 经验：**入口壳（panel.js）的运行时验证可以更强**：有了本地 Chrome（chrome-devtools MCP），用「只读 `extension/` 的同源临时静态服务器 + `/__harness.html` 内存返回」在真实浏览器加载 panel.html markup、注入 `chrome.devtools.network.onRequestFinished` 桩喂 HAR entry、派发真实事件，比手写 DOM 桩更真。harness 落在系统 temp、跑完即删，仓库零残留；本次 23/23 PASS。
- 教训：shell heredoc 传大文件（>8KB）会被命令长度截断，且 `\\` 可能被吃掉一层——应分块 append，并避免在 heredoc 里用需要反斜杠的正则（用 `String.fromCharCode(92)` 之类绕开）。
- 自评：符合宪法红线「修改必须 build + test + 独立断言」；零第三方依赖；未改 manifest/panel.html/i18n.js。任务明确要求 developer 自跑 `node --test`，已在交付说明登记与红线 19 的张力及「正式门禁由 butler-tester 复跑」。
- rounds: 1 | level: novice


## TASK-011 / TASK-012 rework（打包体积门禁修复 · 打包期注释剥离）(2026-10-02)

- 交付 `scripts/package.mjs` 打包期 `.js` 整行注释/空白剥离 + `node --check` 前置门禁 + 读回双保险；package PASS，回归 264/264，四门禁 PASS。
- 经验：**遇到「产物体积门禁失败」，先做字节归因再动手**。本仓 JS 注释占 46.8%（96,708 B / 2,070 行），剥离即从 231KB→136KB；这比压缩/删功能/调阈值都更干净，且不牺牲任何可执行语义与可读源码（剥离只在打包期发生）。
- 经验：**行级注释剥离的安全边界要用「机械事实证明」而非「看起来没问题」**。先跑三项探针：① 代码行（非整行注释）含反引号数 == 0（防多行模板字面量被误删）；② 无「块注释结束符后同行代码」；③ `utf8` round-trip 相等。本仓分别得到 0 / 0 / 全部相等，才落方案。**没有这三项，宁可不动**。
- 经验：**转换型打包必须 fail-closed + 双保险**。剥离后写临时 `.mjs` 跑 `node --check`，失败打印文件与 stderr 并 `exit 1` 且不落 zip；读回阶段再从磁盘独立重推期望字节并对解压出的 `.js` 二次 `--check`。用反向探针（临时插入 `const = ;`）证明门禁真的会 FAIL，而不是空跑。
- 经验：**「节省量 == 注释字节 + 空白字节」是极强的正确性反证**：97,291(省) 恰等于 96,708(注释)+583(空白)，说明没有误删任何代码/字符串字节。
- 经验：**独立解码器交叉验证仍是最强外部证据**：用 PowerShell `Expand-Archive`（.NET System.IO.Compression）解压新 zip，再对 15 个 `.js` 逐个 `node --check`，fail=0；并读回根 `manifest.json` 断言 MV3/permissions。自研 ZIP 的可加载性由此被通用实现背书。
- 经验：**改「读回 vs 磁盘源」断言口径时，保持「独立重算」**：不要复用打包期内存 buffer，而是在读回阶段把同一确定性变换重新施加到磁盘源上，既适配剥离又保留防自证性质。
- rounds: 1 | level: novice
