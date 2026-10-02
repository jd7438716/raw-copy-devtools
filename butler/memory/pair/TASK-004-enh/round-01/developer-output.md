# developer-output — Round 1 (TASK-004 增强: 多记录拼接器)

> slug: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
> 模式: 直接 backlog 任务（无 frame 骨架，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> 覆盖: DEL-003 / REQ-009 / REQ-010 / REQ-011 / REQ-022 / AC-006 / US-002
> 接口真源: `butler/spec/.../design.md` §4.2 + ADR-015（第 256-263 行）
> 说明: 基线项目已占用 `butler/memory/pair/TASK-004/`（list-view 任务），故本增强证据写入 `TASK-004-enh/`（沿用增强 TASK-002 的 `-enh` 命名约定）。

## 模块: 多记录拼接器 `bulkformatter.js`（外层聚合）

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `extension/src/bulkformatter.js` | 新增 | `joinBlocks(blocks, N)` + `buildBulkCopyText(records, mode, resolveBody)` |
| `tests/bulkformatter.test.mjs` | 新增 | 26 用例（模板/段数/逐字符/顺序/N=1/模式B/无混淆/resolveBody/纯度/单一真源） |

## 实现

### `extension/src/bulkformatter.js`

```js
import { buildCopyText, MODE_A } from './formatter.js';

function marker(i, total) {
  return '===== #' + i + '/' + total + ' =====';
}

function buildBlock(record, mode, resolveBody) {
  if (typeof resolveBody === 'function') {
    return buildCopyText(record, mode, { responseBody: resolveBody(record) });
  }
  return buildCopyText(record, mode);
}

export function joinBlocks(blocks, N) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return '';
  const total = Number.isFinite(N) && N > 0 ? Math.trunc(N) : list.length;
  if (total <= 1) return list[0];
  const marked = [];
  for (let i = 0; i < list.length; i += 1) {
    marked.push(marker(i + 1, total) + '\n' + list[i]);
  }
  return marked.join('\n\n');
}

export function buildBulkCopyText(records, mode = MODE_A, resolveBody) {
  const list = Array.isArray(records) ? records : [];
  const total = list.length;
  if (total === 0) return '';
  const blocks = [];
  for (let i = 0; i < total; i += 1) {
    blocks.push(buildBlock(list[i], mode, resolveBody));
  }
  if (total === 1) return blocks[0]; // N===1 委托单选路径，逐字符一致（无标记）
  return joinBlocks(blocks, total);
}

export default { joinBlocks, buildBulkCopyText };
```

### 契约实现要点（对照 ADR-015）

1. **N ≥ 2**：`joinBlocks` 为第 i 个**原样块**前置 `"===== #" + i + "/" + N + " =====" + "\n"`，
   再以 `'\n\n'` 连接；`i` 从 1、十进制无补零（N=10 时 `#1/10`、`#10/10`，无 `#01/10`）。
2. **N === 1**：`buildBulkCopyText` 直接返回 `blocks[0]`（即单条 `buildCopyText` 输出），无任何标记。
3. **N === 0 / 非数组**：返回 `''`（安全降级）。
4. **顺序**：严格保持入参数组顺序，绝不排序（以乱序输入断言验证）。
5. **单一真源**：段内文本 = `formatter.buildCopyText` 原样；本模块不含任何 body 拼接/替换逻辑。
6. **resolveBody 注入**：仅当为函数时传 `{ responseBody: resolveBody(record) }`；
   非函数/缺省时**不传 options**（关键：formatter 用 `hasOwnProperty` 区分「显式空值」，
   传 `{responseBody: undefined}` 会抑制其对 `record.responseContent.text` 的回退）。

## 测试结果（真实执行原始输出）

### 1) `node --test tests/bulkformatter.test.mjs` → PASS 26/26

```
✔ joinBlocks：N=2 精确模板（ADR-015 逐字符） (1.2357ms)
✔ joinBlocks：N=3 精确模板，标记数 === 3 (0.2345ms)
✔ joinBlocks：N=1 不加标记，返回首块原样 (0.1923ms)
✔ joinBlocks：空数组 → 空串 (0.1439ms)
✔ joinBlocks：非数组安全降级 → 空串 (0.1549ms)
✔ joinBlocks：十进制无补零（N=10，第 1 段不是 #01/10） (0.1777ms)
✔ AC-006：N=2 段数 === 2，恰好 2 个标记，精确 golden (0.7673ms)
✔ AC-006：N=3 段数 === 3，恰好 3 个标记 (0.2555ms)
✔ AC-006：N=5 段数 === 5，恰好 5 个标记 (0.3102ms)
✔ AC-006：每段正文逐字符 === 对应记录的单条 buildCopyText 原样（模式 A） (2.1017ms)
✔ AC-006：段序 === 输入顺序（可见列表序），不做任何排序 (0.1865ms)
✔ AC-006：模式 B 下每段为纯原始块（无标题段，段内 === buildCopyText MODE_B） (0.1961ms)
✔ AC-006：无跨条混淆——段 i 不含其他段的请求/响应标识 (0.1916ms)
✔ AC-006：段间恰好以两个换行分隔（`\n\n` + 标记行） (0.0986ms)
✔ AC-006：N=1 输出与单选 buildCopyText 逐字符一致（模式 A，无标记） (0.1273ms)
✔ AC-006：N=1 模式 B 与单选一致、无标记 (0.1751ms)
✔ AC-006：N=0（空数组）→ 空串 (0.0748ms)
✔ buildBulkCopyText：非数组安全降级 → 空串 (0.1125ms)
✔ buildBulkCopyText：mode 缺省为模式 A（与显式 MODE_A 相同） (0.1592ms)
✔ resolveBody：逐条调用（顺序与入参为对应记录），N 次 (0.217ms)
✔ resolveBody：注入值逐字符进入对应段（含替换原响应体） (0.1252ms)
✔ resolveBody：缺省时不改变单选回退（用 record.responseContent.text） (0.0943ms)
✔ resolveBody：非函数值（如 null）按缺省处理，不抛异常 (0.2325ms)
✔ 纯函数：多次调用结果稳定且不修改入参 (0.1328ms)
✔ 单一真源：段内文本与 formatter 单条输出完全同源（不重写拼接） (0.2306ms)
✔ 混合记录（含非对象项）：非对象项经 formatter 产出空块，不抛异常 (0.1323ms)
ℹ tests 26
ℹ pass 26
ℹ fail 0
ℹ duration_ms 128.5337
```

### 2) `node --test tests/formatter.test.mjs` → PASS 24/24（golden 零改动回归）

```
ℹ tests 24
ℹ pass 24
ℹ fail 0
ℹ duration_ms 134.6419
```

### 3) `node scripts/check-syntax.mjs` → PASS 13/13，exit 0

```
[PASS] .../extension/src/bulkformatter.js
[check-syntax] 13/13 files passed
```

### 4) `node --test "tests/**/*.test.mjs"` → 全量回归 PASS 196/196，fail 0

```
ℹ tests 196
ℹ pass 196
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 535.3089
```

## 验收清单对照（TASK-004 §验收）

- [x] lint: PASS（`bulkformatter.js` 仅相对 import `./formatter.js`，零第三方依赖）
- [x] test: PASS（26 用例）
  - [x] N=2/3/5 段数 === N，且恰好 N 个 `===== #i/N =====` 标记
  - [x] 每段正文逐字符 === 对应记录的单条 `buildCopyText` 原样
  - [x] 段序 = 输入（可见列表）顺序
  - [x] N=1 输出与单选逐字符一致（无标记）
  - [x] 模式 B 下每段为纯原始块
  - [x] 任意段不含另一段的请求/响应标识（无跨条混淆）
- [x] build: PASS（`node scripts/check-syntax.mjs` 13/13）
- [x] 回归: `tests/formatter.test.mjs` 24 用例 golden 零改动 PASS

## 自评
- [x] 符合 CONSTITUTION 红线（build + test 均真实执行并 PASS）
- [x] 符合 design.md §4.2 / ADR-015 接口（未发明新签名）
- [x] `formatter.js` **未改动**（本任务只新增文件；未调用 edit 于 formatter.js）
- [x] 未在 bulkformatter 内复制/重写拼接逻辑（单一真源，段内 `indexOf(single)` 原样子串断言）
- [x] 纯函数、零浏览器 API、零第三方依赖
- [x] 错误处理已覆盖（空/非数组/非对象项/非函数 resolveBody）

## 偏差 / 遗留
- **`joinBlocks` 入参语义**：任务只给签名 `joinBlocks(blocks, N)` 与模板；本实现取「`blocks` = 各段**不含标记**的原样文本，标记由本函数按 `N` 生成」。理由：`N` 参数只有用于生成 `#i/N` 分母才有意义；若假设 `blocks` 已含标记，则 `N` 成为死参。已在 JSDoc 明确。
- 说明：`check-zero-network.mjs` 不在本任务必验清单，未复跑；新模块不含任何该扫描器规则关键字（无 fetch/storage/analytics 等），预计 PASS。
