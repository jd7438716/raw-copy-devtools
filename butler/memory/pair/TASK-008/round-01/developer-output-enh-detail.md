# developer-output — Round 1 (ENH TASK-008)

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> TASK-008: 双击明细视图逻辑 `detail.js` + 单测
> covers: REQ-013 REQ-014 DEL-004 AC-008 AC-009 US-003
> 设计真源: `design.md` §4.2 / ADR-017（内容口径与容器）/ ADR-018（失效清理）

## 模块: detail

- 文件: `extension/src/detail.js`（新增）
- 测试: `tests/detail.test.mjs`（新增，26 用例）

### 契约
```text
export function buildDetailText(record, resolveBody): string
  = buildCopyText(record, MODE_A, { responseBody: resolveBody(record) })   // 逐字符
  （resolveBody 非函数 → 回退 buildCopyText(record, MODE_A)，由 formatter 兜底）
export function createDetailView(options?): {
  open(id): boolean, close(): boolean, isOpen(): boolean, currentId(): id|null, onEvict(id): boolean
}
  options = { container?, body?, resolveText?, onClose? }
```

### 关键实现点
- **口径恒为模式 A**：`buildDetailText` 只接受 `(record, resolveBody)`，无 copyMode 入参；
  与面板 A/B 切换完全解耦（A-4）。六要素由 formatter 结构天然覆盖，本模块不重写拼接。
- **`createDetailView` 纯逻辑可测**：无 DOM 时 open/close/isOpen/currentId/onEvict 照常工作；
  提供 `body` 时仅以 **`textContent`** 注入（源码零 `innerHTML`，防不可信请求数据注入）。
- **ADR-018 失效清理**：`onEvict(id)` 命中当前打开项 → 自动 `close()` 返回 true（供 TASK-009 的 store.subscribe 接线）。
- **异常隔离**：`resolveText` / `onClose` 抛错被捕获，不破坏状态机、不外抛。
- **零依赖/零网络/零持久化**：仅 import `formatter.js`；不 import `content`（大响应/二进制/Base64 由调用方 `resolveBody` 注入，与复制口径同源，AC-014）。
- 未修改 `formatter.js` / `selection.js`（冻结）；未改任何既有 id / 导出。

## 自验原始输出

### 1) `node --test tests/detail.test.mjs`
```text
ℹ tests 26
ℹ pass 26
ℹ fail 0
ℹ duration_ms 107.3304
EXIT=0
```

### 2) `node --test tests/formatter.test.mjs`（零改动 PASS）
```text
ℹ tests 24
ℹ pass 24
ℹ fail 0
ℹ duration_ms 104.7609
EXIT=0
```

### 3) `node scripts/check-syntax.mjs`
```text
[check-syntax] 15/15 files passed
EXIT=0        （含 [PASS] extension/src/detail.js）
```

### 4) `node --test "tests/**/*.test.mjs"`（全量回归）
```text
ℹ tests 261
ℹ pass 261
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 403.2707
EXIT=0
```

### 5) `rg -n "innerHTML" extension/src/detail.js`
```text
EXIT=1（无命中 → 0 行）
```

## 覆盖映射
- REQ-013 明细六要素 → `buildDetailText` 模式 A 结构（方法+URL/请求头/请求体/状态+文本/响应头/响应体）。
- REQ-014 原始文本口径 → 与 `buildCopyText(MODE_A,{responseBody})` 逐字符相等；不美化/不改写。
- DEL-004 → `extension/src/detail.js` 新增。
- AC-008 → 六要素顺序测试 + 缺请求体/空响应体/缺状态码降级。
- AC-009 → 逐字符相等 + 头原序 + 非 ASCII 保真。
- US-003 → `createDetailView` 开合状态机（open/close/isOpen/currentId）+ onEvict。

## 遗留项（交 TASK-009）
- `container`/`body` DOM 接线（`#detail-pane` / `#detail-body` / `#detail-close`）、`dblclick`/Esc/遮罩关闭、
  淘汰自动关闭 + `t('detail.evicted')` 由 TASK-009 在 `panel.js` 完成；纯逻辑侧已就绪（含 `onEvict`）。
- `resolveText(id)` 由 TASK-009 注入（建议 = `buildDetailText(store.get(id), resolveResponseBodyText)`）。

## 自评
- [x] 符合 CONSTITUTION 红线（零依赖、零网络、零持久化、textContent）
- [x] 符合规范（纯 ESM、JSDoc、可 Node 单测）
- [x] 错误处理已覆盖（非法 id / 非函数 resolveBody / resolveText·onClose 异常隔离）
- [x] 单元测试已覆盖（26 用例）
- [x] 冻结模块零改动；lint（无 innerHTML / 无裸中文）、build（syntax）、全量回归全 PASS
