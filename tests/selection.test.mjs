// tests/selection.test.mjs — 单选状态机单元测试
// 运行: node --test "tests/selection.test.mjs"
// 覆盖: DEL-005 / REQ-010 / REQ-011 / AC-004
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSelection } from '../extension/src/selection.js';

/* ------------------------------------------------------------------ *
 * 基本选中（REQ-010：点击某一行选中该请求，唯一选中）
 * ------------------------------------------------------------------ */

test('初始无选中；selectAt 选中唯一项，再点别的项整体替换', () => {
  const sel = createSelection({ ids: [10, 20, 30] });

  assert.equal(sel.current(), null);

  assert.equal(sel.selectAt(1), true);
  assert.equal(sel.current(), 20);
  assert.equal(sel.index(), 1);

  // 唯一选中：选中 30 后 20 不再处于选中态
  assert.equal(sel.selectAt(2), true);
  assert.equal(sel.current(), 30);
  assert.equal(sel.index(), 2);
});

test('selectAt：越界 / 负数 / 非整数 / 空列表 → 安全无变化', () => {
  const sel = createSelection({ ids: [1, 2] });
  assert.equal(sel.selectAt(5), false);
  assert.equal(sel.selectAt(-1), false);
  assert.equal(sel.selectAt(1.5), false);
  assert.equal(sel.current(), null);

  const empty = createSelection();
  assert.equal(empty.selectAt(0), false);
  assert.equal(empty.current(), null);
  assert.equal(empty.selectAt(NaN), false);
});

test('selectId：命中则选中；未命中不改变当前选中', () => {
  const sel = createSelection({ ids: ['a', 'b', 'c'] });

  assert.equal(sel.selectId('b'), true);
  assert.equal(sel.current(), 'b');

  assert.equal(sel.selectId('z'), false);
  assert.equal(sel.current(), 'b'); // 保持原选中

  assert.equal(sel.selectId(null), false);
});

/* ------------------------------------------------------------------ *
 * 键盘上下键（REQ-011：在可见列表内切换 + 边界 clamp）
 * ------------------------------------------------------------------ */

test('move：↑/↓ 在可见列表内切换选中项', () => {
  const sel = createSelection({ ids: [1, 2, 3] });
  sel.selectAt(1); // 2

  assert.equal(sel.move(1), true);
  assert.equal(sel.current(), 3);

  assert.equal(sel.move(-1), true);
  assert.equal(sel.current(), 2);

  assert.equal(sel.move(-1), true);
  assert.equal(sel.current(), 1);
});

test('move：首/尾 clamp，不越界不循环', () => {
  const sel = createSelection({ ids: [1, 2, 3] });

  sel.selectAt(0);
  assert.equal(sel.move(-1), false); // 首行再上 → 不动
  assert.equal(sel.current(), 1);

  sel.selectAt(2);
  assert.equal(sel.move(1), false); // 尾行再下 → 不动
  assert.equal(sel.current(), 3);

  // 单元素列表两个方向都 clamp
  const one = createSelection({ ids: [7] });
  assert.equal(one.move(1), true);
  assert.equal(one.current(), 7);
  assert.equal(one.move(1), false);
  assert.equal(one.current(), 7);
});

test('move：无选中时 ↓ 落首行、↑ 落末行；空列表 no-op', () => {
  const down = createSelection({ ids: [1, 2, 3] });
  assert.equal(down.move(1), true);
  assert.equal(down.current(), 1);

  const up = createSelection({ ids: [1, 2, 3] });
  assert.equal(up.move(-1), true);
  assert.equal(up.current(), 3);

  const empty = createSelection({ ids: [] });
  assert.equal(empty.move(1), false);
  assert.equal(empty.move(-1), false);
  assert.equal(empty.current(), null);
});

/* ------------------------------------------------------------------ *
 * 失效清理（setIds / onEvict / reset）
 * ------------------------------------------------------------------ */

test('setIds：当前选中被移除 → 清空（不指向已移除项）', () => {
  const sel = createSelection({ ids: [1, 2, 3] });
  sel.selectAt(1); // 2

  const after = sel.setIds([1, 3]);
  assert.equal(after, null);
  assert.equal(sel.current(), null);
  assert.equal(sel.index(), -1);
});

test('setIds：当前选中仍在新列表 → 保留，下标随新列表更新', () => {
  const sel = createSelection({ ids: [1, 2, 3] });
  sel.selectAt(1); // 2

  const after = sel.setIds([2, 3, 4]);
  assert.equal(after, 2);
  assert.equal(sel.current(), 2);
  assert.equal(sel.index(), 0);
  assert.deepEqual(sel.ids(), [2, 3, 4]);
});

test('onEvict：仅当被淘汰的正是选中项才清空', () => {
  const sel = createSelection({ ids: [1, 2, 3] });
  sel.selectAt(1); // 2

  assert.equal(sel.onEvict(99), false); // 非选中项 → 不清
  assert.equal(sel.current(), 2);

  assert.equal(sel.onEvict(2), true); // 选中项被淘汰 → 清空
  assert.equal(sel.current(), null);
});

test('reset：清空选中且保留可见列表；已空时返回 false', () => {
  const sel = createSelection({ ids: [1, 2, 3] });
  sel.selectAt(0);

  assert.equal(sel.reset(), true);
  assert.equal(sel.current(), null);
  assert.deepEqual(sel.ids(), [1, 2, 3]); // 列表不变
  assert.equal(sel.size(), 3);

  assert.equal(sel.reset(), false); // 已无选中
});

/* ------------------------------------------------------------------ *
 * onChange 通知 + 健壮性
 * ------------------------------------------------------------------ */

test('onChange：携带 (id, index)；清空时 id=null / index=-1', () => {
  const events = [];
  const sel = createSelection({
    ids: [5, 6, 7],
    onChange: (id, index) => events.push([id, index]),
  });

  sel.selectAt(1);
  assert.deepEqual(events[events.length - 1], [6, 1]);

  sel.move(1);
  assert.deepEqual(events[events.length - 1], [7, 2]);

  sel.onEvict(7);
  assert.deepEqual(events[events.length - 1], [null, -1]);

  // 未命中 selectId 不应触发回调
  const count = events.length;
  sel.selectId(12345);
  assert.equal(events.length, count);
});

test('健壮性：onChange 抛错被隔离；非法 options 不抛异常', () => {
  const sel = createSelection({
    ids: [1, 2],
    onChange: () => {
      throw new Error('boom');
    },
  });

  assert.doesNotThrow(() => sel.selectAt(0));
  assert.equal(sel.current(), 1);
  assert.doesNotThrow(() => sel.move(1));
  assert.equal(sel.current(), 2);

  assert.doesNotThrow(() => createSelection(null));
  assert.doesNotThrow(() => createSelection()); // 默认空 ids
  assert.equal(createSelection({ ids: 'nope' }).current(), null);
});

test('size/ids 助手返回可见列表的只读快照', () => {
  const source = [1, 2, 3];
  const sel = createSelection({ ids: source });
  assert.equal(sel.size(), 3);

  const snapshot = sel.ids();
  snapshot.push(999); // 修改副本不应影响内部状态
  assert.equal(sel.size(), 3);
  assert.equal(sel.current(), null);

  sel.setIds([9]);
  assert.equal(sel.size(), 1);
  assert.equal(sel.ids()[0], 9);
});
