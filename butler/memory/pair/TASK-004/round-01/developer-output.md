# developer-output — Round 1 (TASK-004)

> 模式: 直接 backlog 任务（无 frame，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> 覆盖: DEL-004 / REQ-006 / REQ-007 / REQ-008 / REQ-009 / REQ-029 / AC-003 / AC-021
> 接口真源: `design.md §5.3`（`src/render.js` + `src/filter.js`；ADR-005 虚拟滚动）。
> 说明: `TASK-004.md` 涉及文件写 `list-view.js`；design.md §5.3 冻结接口为
>       `extension/src/render.js`（虚拟滚动）+ `extension/src/filter.js`（搜索/过滤），
>       按 design.md 落盘（与 TASK-003 相同的文件名冲突处理，交接备注显式说明）。

## 模块: 列表渲染 + 搜索/过滤 + 虚拟滚动

| 文件 | 操作 | 行数 |
|------|:----:|:----:|
| `extension/src/filter.js` | 新增 | ~300 |
| `extension/src/render.js` | 新增 | ~330 |
| `tests/filter.test.mjs` | 新增 | ~200 |
| `tests/render.test.mjs` | 新增 | ~330 |
| `extension/panel.js` | edit（仅追加接线，保留已冻结导出契约） | 240 → ~480 |

## 实现摘要

### `extension/src/filter.js`（纯逻辑，可 Node 直接 import）

- `export function applyFilter(records, criteria): Object[]`
  - criteria = `{ query, method, status, resourceType }`；空串 / 缺省 / 纯空白 = 不筛。
  - `query`：URL 关键字 **不区分大小写** 子串匹配。
  - `method`：**精确**匹配，不区分大小写（`method:'get'` 命中 `GET`）。
  - `status`：精确码（`'200'` / 数字 `200`）**或**码段 `2xx/3xx/4xx/5xx`（首位数字前缀匹配，正则 `^([1-5])[xX]{1,2}$`）。
  - `resourceType`：**全值精确**匹配，不区分大小写（Chrome `_resourceType` 为小写，UI 用 `XHR/Fetch`）。
  - 多条件 **AND**；入参不改，返回新数组；畸形记录（null/undefined/{}）不抛错。
  - 无任何条件时走快速路径 `list.slice()`。
- `export function collectOptions(records): { methods, statuses, resourceTypes }`
  - methods：非空去重后**大写**；statuses：非零码去重为字符串、**数值升序**；resourceTypes：非空去重、字典序（不区分大小写）。
  - 供工具栏 select 派生使用；空/异常输入返回 `{[], [], []}`。

### `extension/src/render.js`（纯原生 DOM，零依赖）

- `export function computeWindow({ scrollTop, viewportHeight, rowHeight, total, overscan })`
  - 纯函数，返回 `{ start, end, offset, count }`（半开区间 `[start, end)`）。
  - 规则：`start = max(0, floor(scrollTop/rh) - overscan)`；`end = min(total, max(ceil((scrollTop+vh)/rh), floor(scrollTop/rh)+1) + overscan)`。
  - 非法参数安全降级（rh≤0→1，total≤0→0，负 scrollTop→0）。
- `export function createVirtualList({ container, rowHeight, overscan=5, renderRow, onSelect })`
  - 返回 `{ setData(items), scrollToId(id), refresh() }`（严格按 design §5.3）。
  - spacer 撑高 `items.length * rowHeight`；数据行 `position:absolute` + `translateY(index*rowHeight)`，**DOM 复用**（行元素池，扩缩不重建已有元素）。
  - 可视区 = 最近可滚动祖先（`overflow-y:auto/scroll/overlay` 或 `scrollHeight>clientHeight` 启发式）的 `clientHeight`；滚动偏移扣除 `container.offsetTop`（sticky 表头）。
  - `renderRow(record, el, index)` 按帧调用由调用方填充；版本号变化（setData/refresh）强制重跑，滚动仅对索引变化的行重跑。
  - 监听 `scroll` 重算；`window.resize` 重算；`scrollToId` 按 `record.id` 命中定位。
  - 模块顶层零 DOM 访问 → Node 可 import `computeWindow`；无 container/document 时安全降级。

### `extension/panel.js`（edit，仅追加接线）

- 新增 import：`createStore` / `installCapture` / `applyFilter` / `collectOptions` / `createVirtualList`（`t` 原样保留）。
- `init()`：`createStore({capacity:1000})` → `installCapture({store, onAdd: requestRefresh})`；
  - `refreshView()`：`store.all()` → `collectOptions` 派生并同步三个 select（仅集合变化时重建，保留选中值）→ `applyFilter` → **倒序（最新在上）** → `virtualList.setData` → 空态显隐。
  - `#search`(input) 与三个 select(change) → `requestRefresh`（rAF 批处理，无 rAF 时 setTimeout 回退）。
  - 空态：无请求用 `empty.title`/`empty.hint`；有请求但无匹配用 `empty.noMatch`（均经 `t()`）。
  - 行渲染 `renderRow`：7 列（方法/URL/状态/类型/耗时/大小/时间）**全部 `textContent`**，惰性建列、DOM 复用。
  - `setEmptyState` / `showToast` / `applyI18n` / `els` / `getCopyMode` / `setCopyMode` 导出契约**未改动**。
- 未实现并留 TODO：选中（TASK-005）、复制（TASK-006/007）、大响应分类（TASK-008）。

## 测试结果（真实执行）

### 1) `node --test "tests/filter.test.mjs" "tests/render.test.mjs"` → PASS 23/23

```
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 144.6576
```

### 2) `node --test "tests/**/*.test.mjs"` → 全量回归 PASS 53/53

```
ℹ tests 53
ℹ suites 0
ℹ pass 53
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 415.5034
```

### 3) `node scripts/check-syntax.mjs` → PASS 7/7，exit=0

```
[PASS] extension/devtools.js
[PASS] extension/panel.js
[PASS] extension/src/capture.js
[PASS] extension/src/filter.js
[PASS] extension/src/i18n.js
[PASS] extension/src/render.js
[PASS] extension/src/store.js
[check-syntax] 7/7 files passed
```

### 4) `node scripts/check-panel-shell.mjs` → PASS 34/34，exit=0（无回归）

```
[PASS] panel.js 无中文字符串字面量（中文仅允许注释）  (literals=115, offending=[])
[PASS] panel.js 从 ./src/i18n.js import t
[PASS] panel.js 导出 els
[PASS] panel.js 导出 showToast 函数
[PASS] panel.js 导出 applyI18n 函数
== RESULT: PASS (34/34 项) ==
```

### 5) `node scripts/check-zero-network.mjs` → PASS 17/17，exit=0

```
[PASS] 无 "fetch("
... 17 项全 PASS ...
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）==
```

## AC/REQ 逐条对照

| 条目 | 证据 |
|------|------|
| DEL-004 | `src/filter.js` + `src/render.js` 存在，interface 与 design §5.3 一致 |
| REQ-006 | `applyFilter` query 子串、大小写不敏感（测试） |
| REQ-007 | `applyFilter` method 精确、大小写不敏感（测试） |
| REQ-008 | `applyFilter` status 精确码 + `2xx/3xx/4xx/5xx`（测试） |
| REQ-009 | `applyFilter` resourceType 全值精确（测试） |
| REQ-029 | `computeWindow` 1000 条仅 15 行；DOM 复用池；panel rAF 批处理 |
| AC-003 | 组合 AND + `collectOptions` 选项→过滤自洽（测试） |
| AC-021 | 测试断言 `rows.length === 15` 且 `rows.length < 50`（<< 1000 = 虚拟滚动生效） |

## 自评
- [x] 符合 CONSTITUTION 红线（node --test / check-syntax 真实执行并 PASS）
- [x] 符合 design.md §5.3 接口（未改签名；render 返回值严格三项）
- [x] 零第三方依赖、无网络、无持久化（check-zero-network 17/17）
- [x] 错误处理已覆盖（畸形记录、非法参数、无 DOM 环境降级）
- [x] 单元测试已覆盖（filter 12 + render 11 = 23 条）
- [x] panel.js 已冻结导出契约未破坏（check-panel-shell PASS）
- [x] 未实现 TASK-005/006/007/008 内容（仅留 TODO），未改 manifest.json

## 备注 / 偏差
- 任务文件写 `list-view.js`，design.md §5.3 为 `src/render.js` + `src/filter.js` → 以 design.md 为准落盘。
- `render.js` 未使用 `innerHTML`，行内容由调用方（panel.js）用 `textContent` 填充（D-5 注入防御）。
- `resourceType` 匹配为「全值 + 大小写不敏感」：因 Chrome `_resourceType` 为小写而 UI 选项为 `XHR/Fetch`；仍为**全值精确**（非前缀），已测试 `'doc'` 不命中 `'document'`。
