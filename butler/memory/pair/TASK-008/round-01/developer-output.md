# developer-output — Round 1

> TASK-008: 大响应 / 二进制 / Base64 处理逻辑
> covers: DEL-008, REQ-021, REQ-022, REQ-023, REQ-024, AC-010
> 设计真源: `design.md` §5.3（接口表：`src/content.js`）+ ADR-008（二进制/Base64 占位格式契约）

## 模块: content（响应体内容分类）

- 文件: `extension/src/content.js`
- 测试: `tests/content.test.mjs`

### 契约
```text
export const DEFAULT_LARGE_THRESHOLD = 10 * 1024 * 1024;
export function classifyBody(responseContent, options = {})
  → { kind:'text'|'binary'|'base64-text'|'base64-omitted'|'unavailable', text?, placeholder?, byteSize:number }
export function isOverThreshold(responseContent, threshold = DEFAULT_LARGE_THRESHOLD) → boolean
```

### 判定顺序（ADR-008 权威）
1. `responseContent` 缺失 / `text` 非非空字符串 → `unavailable`（byteSize：缺失=0，否则保留 size）。
2. `encoding==='base64'`（**优先分支**）：
   - 文本类 MIME（`text/*`、`application/json|xml|javascript|x-www-form-urlencoded`、`+json`/`+xml`、MIME 缺失）→ 严格校验后 UTF-8 解码 →
     `base64-text`；解码失败 / 非法 base64 → 回退 `base64-omitted`。
   - 非文本 MIME → `base64-omitted`（`[Base64 content omitted: length N]`，N=原始字符串长度）。
3. 非 base64 且二进制 MIME（`image/*`、`audio/*`、`video/*`、`font/*`、`application/octet-stream|pdf|zip|gzip|wasm` 等）
   → `binary`（`[Binary content omitted: <mime>, <bytes> bytes]`）。
4. 其余 → `text`（**逐字符原样**，ADR-006 / REQ-021）。

### 关键实现点
- **非法 base64 显式校验**（`Buffer.from`/`atob` 对非法输入不抛，必须自己判）：
  去空白后 `length % 4 === 0` 且 `^[A-Za-z0-9+/]*={0,2}$`，`=` 仅允许尾部且 ≤2。
- **双环境解码**：Node 用 `Buffer.from(b64,'base64').toString('utf8')`；浏览器用 `atob` → `Uint8Array` → `TextDecoder('utf-8')`。
  探测 `typeof Buffer !== 'undefined'`，无第三方依赖。
- **byteSize**：优先 `responseContent.size`（有限且 ≥0），否则按 `text` 的 UTF-8 字节长度（`TextEncoder`）估算。
- **占位符**：MIME 归一化（去 `;` 参数 + trim + 小写）后拼装，格式逐字符锁定。
- **阈值**：严格大于（`size > threshold`）→ `=10MB` 为 false、`10MB+1` 为 true。

## 模块: panel（接线，edit 仅追加）

- 文件: `extension/panel.js`
- `buildCurrentCopy(mode)`：`classifyBody(record.responseContent)` → text/base64-text 用 `text`、binary/base64-omitted 用 `placeholder`、
  unavailable 用 `t('content.unavailable')` → `buildCopyText(record, mode, { responseBody })`。
  **未改 formatter**，AC-007 逐字符保真路径不变。
- `onCopyClick()`：有选中且 `isOverThreshold(record.responseContent)` → `confirmLargeCopy(formatSize(size))`（无 confirm 环境不阻断）；
  用户取消 → `showToast(t('copy.cancelled'),'info')` 且**不复制**；确认后照常走剪贴板写入。
- `extension/src/i18n.js`：新增 `copy.cancelled`（zh/en，键集对齐；超阈值取消提示所需）。
- 未改导出契约；未改 `manifest.json`（权限仍仅 `clipboardWrite`）。

## 测试结果（真实执行）

### 专用
```text
$ node --test "tests/content.test.mjs"
ℹ tests 19
ℹ pass 19
ℹ fail 0
ℹ duration_ms ~105
```

### 全量回归
```text
$ node --test "tests/**/*.test.mjs"
ℹ tests 123
ℹ pass 123
ℹ fail 0
```

### 门禁
```text
$ node scripts/check-syntax.mjs        → 11/11 files passed        EXIT=0
$ node scripts/check-panel-shell.mjs   → RESULT: PASS (34/34)      EXIT=0   (panel.js 中文字面量 0)
$ node scripts/check-zero-network.mjs  → 17/17 项通过 / PASS       EXIT=0
$ node scripts/check-manifest.mjs      → RESULT: PASS (17/17)      EXIT=0
```

### 集成抽检（classifyBody → buildCopyText，临时脚本跑后即删）
```text
text verbatim injected: PASS
contains [Response Body]: PASS
binary placeholder: [Binary content omitted: image/png, 2048 bytes]
base64 decode: base64-text "hello 世界😀"
threshold const: 10485760 boundary: false true
```

## 覆盖映射
- REQ-021 文本默认完整复制 → `kind='text'` 逐字符原样（含 CJK/emoji/前后空白/字面转义）。
- REQ-022 超阈值提示 → `isOverThreshold` + panel `confirmLargeCopy`。
- REQ-023 二进制省略标注 → `kind='binary'` 占位逐字符。
- REQ-024 Base64 按 MIME → 文本类解码 / 非文本省略 / 非法回退。
- AC-010 边界（=10MB / 10MB+1）确定可判定。

## 自评
- [x] 符合 CONSTITUTION 红线（零依赖、零网络、零持久化、最小权限）
- [x] 符合 conventions.md 规范（纯 ESM、JSDoc、textContent）
- [x] 错误处理已覆盖（非法 base64 不抛 → 回退；异常输入不抛）
- [x] 单元测试已覆盖（19 用例 + 集成抽检）
- [ ] 待 reviewer 逐字符复核占位格式与判定优先级
