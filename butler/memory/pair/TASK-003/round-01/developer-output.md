# developer-output — Round 1 (TASK-003)

> 模式: 直接 backlog 任务（无 frame，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> 覆盖: DEL-003 / REQ-002 / REQ-003 / REQ-004 / REQ-035 / AC-002 / AC-013
> 接口真源: design.md §5.3（`src/store.js` + `src/capture.js`，ADR-002/ADR-004/ADR-010）。
> 说明: `TASK-003.md` 中遗留文件名 `request-store.js` / `har-map.js` 按 design.md 接口表替换为
>       `extension/src/store.js`（缓存）+ `extension/src/capture.js`（监听 + HAR 映射），职责合并。

## 模块: 请求捕获与内存缓存

| 文件 | 状态 | 行数 |
|------|:----:|:----:|
| `extension/src/store.js` | 新增 | 234 |
| `extension/src/capture.js` | 新增 | 241 |
| `tests/store.test.mjs` | 新增 | 138 |
| `tests/capture.test.mjs` | 新增 | 247 |

## 实现摘要

### extension/src/store.js — 环形缓冲（cap=1000，O(1) 追加/淘汰）

- `export function createStore({ capacity = 1000 } = {})`
- 返回 `{ add(rec):id, get(id), all(), size(), clear(), subscribe(fn):unsub }`
- 存储结构：固定长度 `Array(cap)` 环形缓冲 + `head`/`count` 索引 + `Map(id→record)` 索引
  - 写入 `buf[head]`，`head=(head+1)%cap`；满时覆盖最旧（`head` 即最旧位）→ 追加/淘汰均 O(1)
  - `all()` 从 `(head-count+cap)%cap` 起按「最旧→最新」展开
  - `Map` 提供 `get(id)` 的 O(1) 命中；淘汰时同步 `index.delete(evictedId)`
- `add`：id 唯一递增（单调序号，`clear()` 后不重置，避免旧引用复用）；支持调用方注入唯一数字 id
- `subscribe(fn)`：每次 `add` 通知 `{ type:'add', id, record, evicted }`（含被淘汰 id）；
  `clear()` 通知 `{ type:'clear' }`；返回 `unsubscribe`；订阅者抛错被隔离（不破坏捕获热路径）
- 纯逻辑、零 import、零浏览器 API → Node 可直接 import 单测
- `export const DEFAULT_CAPACITY = 1000`

### extension/src/capture.js — onRequestFinished 注册 + HAR→RequestRecord 归一化

- `export function normalize(harEntry, idOrOptions)` —— 纯函数映射（design §5.2）：
  - `id`（可选注入，支持 `42` 或 `{id:42}`；未注入为 `null`，由 store 分配）
  - `method` / `url` / `httpVersion`（缺失或空串 → `HTTP/1.1`，DEC-002）
  - `requestHeaders`（复制为 `[{name,value}]`，**保持原始顺序**，AC-014）
  - `requestBody`（`request.postData?.text`，缺失 → `undefined`）
  - `status`（缺失 → 0）/ `statusText`（缺失 → `''`）
  - `responseHeaders`（原序复制）
  - `responseContent` = `{ text, encoding, mimeType, size }`
    - `text` 逐字符原样保留（REQ-020/AC-007），缺失 → `null`（R1 边界）
    - `size` 缺失时由 `text.length` 反推
  - `time`（缺失 → 0）/ `startedDateTime`（缺失 → `''`）
  - `resourceType` = `_resourceType || resourceType || ''`
  - ADR-003：headers/content 均复制为独立对象，不保留原 HAR entry 引用
- `export function installCapture({ store, onAdd, chrome })` → `{ uninstall() }`
  - 经 `chrome.devtools.network.onRequestFinished.addListener` 注册；每条 entry → `normalize` → `store.add` → `onAdd(record,id)`
  - `chrome` 可注入（默认 `globalThis.chrome`）→ Node 无 chrome 时安全降级为空操作，不抛错
  - `uninstall()` 调 `removeListener`，幂等
  - 回调内 try/catch 隔离 normalize/store/onAdd 异常，绝不打断热路径
- `export const DEFAULT_HTTP_VERSION = 'HTTP/1.1'`

## 测试结果（真实执行）

### 1) `node --test "tests/store.test.mjs" "tests/capture.test.mjs"` → PASS 25/25

```
✔ normalize 完整 HAR entry 字段映射正确（REQ-035）
✔ DEFAULT_HTTP_VERSION 为 HTTP/1.1
✔ 缺 httpVersion → 回退 HTTP/1.1（DEC-002）
✔ 缺 postData → requestBody 为 undefined
✔ postData 存在但无 text → requestBody 为 undefined；text 为空串保留空串
✔ 响应状态与时间缺失时按契约降级（status=0 / statusText="" / time=0）
✔ headers 缺失 → []；保持原始顺序（AC-014）
✔ 响应体缺失 → content.text 为 null 且 size 回退 0（R1 边界）
✔ size 缺失时由 text 长度反推
✔ resourceType 回退：_resourceType → resourceType → 空串
✔ normalize 与 entry 解耦：不保留引用（headers/body 已复制）
✔ normalize 支持注入 id（数字或 {id}）
✔ normalize 对空 / 畸形输入不抛错
✔ installCapture 在无 chrome（Node）时安全降级、不抛错
✔ installCapture 注入 chrome：注册监听 → 归一化入 store → 回调 → 卸载
✔ installCapture 在 store 缺失时安全降级
✔ DEFAULT_CAPACITY 为 1000（REQ-004 / AC-013）
✔ add 1001 条 → size()===1000，首条被淘汰、末条保留
✔ 环形缓冲：capacity=3 追加 5 条后仅保留最近 3 条且顺序为最旧→最新
✔ get / all / clear 行为正确
✔ add 对同一条记录返回稳定且唯一的递增 id
✔ add 支持调用方注入唯一 id
✔ subscribe 每次 add 收到事件且含被淘汰 id
✔ subscribe 隔离抛错的订阅者，不影响其他订阅者与 store
✔ clear 通知 { type: "clear" }
ℹ tests 25  ℹ pass 25  ℹ fail 0
EXIT_TEST=0
```

### 2) `node scripts/check-syntax.mjs` → PASS 5/5

```
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\devtools.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\panel.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\capture.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\i18n.js
[PASS] D:\xiaozhai.dev\chrome_extension2\extension\src\store.js
[check-syntax] 5/5 files passed
EXIT_SYNTAX=0
```

### 3) 全量回归 `node --test "tests/**/*.test.mjs"` → PASS 30/30

```
ℹ tests 30  ℹ pass 30  ℹ fail 0
EXIT_ALL=0
```

### 4) 安全/依赖自检

```
安全自检: CLEAN（store.js/capture.js 无 fetch/XHR/sendBeacon/localStorage/indexedDB/chrome.storage/innerHTML/eval/new Function/document.）
依赖自检: store.js/capture.js 无任何 import（零第三方依赖）
```

## 自评

- [x] 符合 CONSTITUTION 红线（build/语法门禁 PASS + test PASS；零第三方依赖）
- [x] 符合 design.md ADR-002（原生 ESM）/ ADR-003（归一化并释放 entry）/ ADR-004（环形缓冲 O(1)）/ §5.2（HAR 映射降级）/ §5.3（导出签名）
- [x] AC-013：注入 1001 条 → `size()===1000`，首条被淘汰、末条保留（机械验证）
- [x] 错误处理：normalize 对空/畸形输入不抛错；installCapture 无 chrome 守卫；回调/订阅者异常隔离
- [x] 单元测试覆盖：store（环形淘汰/顺序/get/all/clear/subscribe/注入 id）+ capture（全字段映射/各缺失降级/纯函数/install/uninstall）
- [x] 未越界：未创建 render/filter/selection/formatter/clipboard/content.js；未改 panel.js / manifest.json / devtools.js / i18n.js / package.json

## AC / REQ 对应

| 条目 | 落点 | 状态 |
|---|---|---|
| DEL-003 | `extension/src/capture.js` + `extension/src/store.js` | ✅ |
| REQ-002 | `installCapture` 注册 `onRequestFinished`；以 HAR entry 为准支持多资源类型（`resourceType` 映射） | ✅ |
| REQ-003 | `store.add` 实时追加 + `subscribe` 通知（供 TASK-004 渲染） | ✅ |
| REQ-004 | 环形缓冲 cap=1000，O(1) 淘汰最旧 | ✅ |
| REQ-035 | HAR→RequestRecord 全字段映射（§5.2）+ 缺失降级 | ✅ |
| AC-002 | 捕获→归一化→入缓存→回调 完整链路（fake chrome 测试验证） | ✅ |
| AC-013 | 1001 条断言仅留 1000，首条淘汰 | ✅ |

## 备注 / 交接约定（供 TASK-004+）

- `store.subscribe(fn)` 回调事件契约：`{ type:'add', id, record, evicted }` / `{ type:'clear' }`。
- `RequestRecord` 字段名采用任务交付说明：`requestHeaders` / `requestBody` / `responseHeaders` / `responseContent`。
- `id` 权威在 store（`add` 返回并写回 `record.id`）；`normalize` 的 id 参数仅用于独立/测试注入。
- `onRequestFinished` 监听须在 panel 上下文（ADR-001）；本模块只提供注册函数，由 panel.js 装配。
- `butler/memory/ai-orchestration.json` 不存在 → DAG/SSE 生成规则不适用（本任务为单模块库函数，无事件流）。
