# developer-output — Round 1 (TASK-005)

> 模式: 直接 backlog 任务（无 frame，非结对迭代）。单模块交付，Round 1 即完成全部交付物。
> 覆盖: DEL-005 / REQ-010 / REQ-011 / AC-004
> 接口真源: `design.md §5.3`（`src/selection.js`；ADR-005 行元素 `.row`；ADR-004 淘汰联动）。
> 说明: TASK-005.md 涉及文件写 `selection.js` / `panel.js`；按 design.md §5.3 落盘为
>       `extension/src/selection.js`（新增）+ `extension/panel.js`（edit，仅追加接线）。

## 模块: 选中交互（点击 + 键盘上下键）

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `extension/src/selection.js` | 新增 | 单选状态机（纯逻辑，可 Node 直接 import） |
| `tests/selection.test.mjs` | 新增 | 13 用例（node:test） |
| `extension/panel.js` | edit | 仅追加接线：selection 实例 / 行点击 / ↑↓ / 高亮 / 复制按钮可用态 / `getSelected()` |
| `extension/panel.html` | 未改 | `#list` 已有 `tabindex="0"`，键盘绑定在 panel.js 完成，无需改 HTML |

## 实现摘要

### `extension/src/selection.js`

- `export function createSelection({ ids, onChange })` →
  `{ setIds, selectAt, move, selectId, current, onEvict, reset, index, ids, size }`
  （前 7 个为 design §5.3 + 任务要求；后 3 个为只读助手扩展）。
- **唯一选中**：`selectAt` / `selectId` / `move` 任一操作整体替换选中，任意时刻 ≤1 个。
- **可见列表**：`ids` = 当前可见（已过滤 + 已排序）列表，索引与渲染层 `data-index` 一致；
  `move(±1)` 仅在此序列内切换。
- **边界 clamp**：`index+delta` 后钳制到 `[0, len-1]`，到边界保持不动（不越界、不循环）；
  无选中时 ↓ 落首行 / ↑ 落末行。
- **失效清理**：`setIds` 后当前选中不在新列表 → 清空（`current()===null`），不指向已移除项。
- **淘汰联动**：`onEvict(id)` 命中选中项 → 清空。
- `onChange(id, index)`：选中变化回调（无 → `null` / `-1`）；回调异常被隔离，不破坏状态机。
- 纯逻辑、零第三方依赖、零浏览器 API。

### `extension/panel.js`（仅追加接线）

- `import { createSelection } from './src/selection.js'`。
- 模块级维护 `selectedId` / `activeSelection`；导出 `getSelected(): RequestRecord|null`
  （TASK-006 formatter 数据入口）。
- `createSelection({ ids: [], onChange })`：`onChange` → 同步 `selectedId`、切换
  `#copy-btn` 等复制按钮 `disabled`、`virtualList.refresh()` 重绘高亮。
- `createVirtualList({... onSelect: (record, index) => selection.selectAt(index) })`
  （保留契约；行点击另经 `#list-body` 事件委托）。
- `refreshView()`：`virtualList.setData(display)` 后 `selection.setIds(display.map(id))`，
  使选中状态跟随可见（过滤后）列表。
- `renderRow`：命中选中 id 的行加 `.is-selected` + `aria-selected`（仅用 textContent 渲染不可信数据）。
- `#list-body` 点击委托 → `event.target.closest('.row')` → `data-index` → `selectAt` + `#list.focus()`。
- `#list` `keydown`：`ArrowDown`/`ArrowUp` → `move(+1/-1)` + `preventDefault`（防滚动）+
  `virtualList.scrollToId` 保证选中可见。
- `store.subscribe`：`add` 事件的 `evicted` → `selection.onEvict(id)`；`clear` → `selection.reset()`。
- 未实现复制/大响应（留 TASK-006/007/008）；不改 manifest.json、不改 render.js。

## 测试结果（真实执行）

```
$ node --test "tests/selection.test.mjs"
ℹ tests 13
ℹ pass 13
ℹ fail 0

$ node --test "tests/**/*.test.mjs"
ℹ tests 66
ℹ pass 66
ℹ fail 0
```

## 门禁（真实执行）

```
$ node scripts/check-syntax.mjs
[check-syntax] 8/8 files passed            -> exit 0

$ node scripts/check-panel-shell.mjs
== RESULT: PASS (34/34 项) ==              -> exit 0

$ node scripts/check-zero-network.mjs
[check-zero-network] 17/17 项通过
== RESULT: PASS（extension/ 无网络调用、无持久化存储、无遥测）== -> exit 0
```

## 自评

- [x] 符合 CONSTITUTION 红线（最小权限 / 质量门禁 / 知识回写）
- [x] 符合 conventions.md 规范（纯原生 ESM、零依赖、textContent、中文注释/ASCII 字面量）
- [x] 错误处理已覆盖（非法索引/delta/回调异常/空列表/非数组 ids 均安全降级）
- [x] 单元测试已覆盖（点击单选中 / move 上下 / 边界 clamp / setIds 失效清理 / onEvict / reset / onChange）
- [x] 五个门禁命令全部 PASS
