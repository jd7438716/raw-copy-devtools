// tests/multiselection.test.mjs — 多选组合包装单元测试
// 运行: node --test "tests/multiselection.test.mjs"
// 覆盖: DEL-002 / REQ-006 / REQ-007 / AC-004 / AC-005 / ADR-012/014/018
import test from 'node:test';
import assert from 'node:assert/strict';

import { createMultiSelection } from '../extension/src/multiselection.js';

/* ------------------------------------------------------------------ *
 * 初始状态与只读助手
 * ------------------------------------------------------------------ */

test('初始：集合为空、无主光标；size/ids 反映可见列表', () => {
  const ms = createMultiSelection({ ids: [10, 20, 30] });

  assert.equal(ms.current(), null);
  assert.equal(ms.count(), 0);
  assert.deepEqual(ms.selectedIds(), []);
  assert.equal(ms.has(10), false);
  assert.equal(ms.size(), 3);
  assert.deepEqual(ms.ids(), [10, 20, 30]);
});

test('健壮性：非法 options / 非整数索引不抛异常', () => {
  assert.doesNotThrow(() => createMultiSelection(null));
  assert.doesNotThrow(() => createMultiSelection());
  assert.equal(createMultiSelection({ ids: 'nope' }).size(), 0);

  const ms = createMultiSelection({ ids: [1, 2, 3] });
  assert.equal(ms.selectAt(NaN), false);
  assert.equal(ms.selectAt(1.5), false);
  assert.equal(ms.toggleAt('x'), false);
  assert.equal(ms.rangeTo(undefined), false);
  assert.equal(ms.count(), 0);
  assert.equal(ms.current(), null);
});

test('ids/size/selectedIds 返回只读快照，修改副本不影响内部状态', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAll();

  const idsSnap = ms.ids();
  idsSnap.push(999);
  assert.equal(ms.size(), 3);

  const selSnap = ms.selectedIds();
  selSnap.push(999);
  assert.equal(ms.count(), 3);
  assert.deepEqual(ms.selectedIds(), [1, 2, 3]);
});

/* ------------------------------------------------------------------ *
 * selectAt — 单击：替换集合 + 回落单选（ADR-014）
 * ------------------------------------------------------------------ */

test('selectAt：替换集合且回落单选；再次单击整体替换', () => {
  const ms = createMultiSelection({ ids: [10, 20, 30] });

  assert.equal(ms.selectAt(1), true);
  assert.equal(ms.count(), 1);
  assert.equal(ms.has(20), true);
  assert.equal(ms.has(10), false);
  assert.equal(ms.current(), 20); // 回落单选核心
  assert.deepEqual(ms.selectedIds(), [20]);

  // 单击 30：整体替换（非追加）
  assert.equal(ms.selectAt(2), true);
  assert.equal(ms.count(), 1);
  assert.equal(ms.has(20), false);
  assert.equal(ms.current(), 30);
  assert.deepEqual(ms.selectedIds(), [30]);
});

test('selectAt：越界 / 负数 / 空槽 / 空列表 → 安全无变化', () => {
  const ms = createMultiSelection({ ids: [1, 2] });
  ms.selectAt(0);

  assert.equal(ms.selectAt(5), false);
  assert.equal(ms.selectAt(-1), false);
  assert.equal(ms.selectAt(1.5), false);
  assert.equal(ms.current(), 1); // 保持原状态
  assert.equal(ms.count(), 1);

  const holes = createMultiSelection({ ids: [1, null, 3] });
  assert.equal(holes.selectAt(1), false); // 空槽不可选
  assert.equal(holes.count(), 0);

  const empty = createMultiSelection({ ids: [] });
  assert.equal(empty.selectAt(0), false);
  assert.equal(empty.current(), null);
});

/* ------------------------------------------------------------------ *
 * toggleAt — Ctrl/Cmd 单击：增 / 删 + anchor 更新（ADR-014）
 * ------------------------------------------------------------------ */

test('toggleAt：集合中存在则删、否则加；主光标跟随，计数一致', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });

  assert.equal(ms.toggleAt(0), true); // 加
  assert.equal(ms.count(), 1);
  assert.equal(ms.has(1), true);
  assert.equal(ms.current(), 1);

  assert.equal(ms.toggleAt(1), true); // 加
  assert.equal(ms.count(), 2);
  assert.deepEqual(ms.selectedIds(), [1, 2]);
  assert.equal(ms.current(), 2);

  assert.equal(ms.toggleAt(0), true); // 删（非主光标）
  assert.equal(ms.count(), 1);
  assert.equal(ms.has(1), false);
  assert.deepEqual(ms.selectedIds(), [2]);
  assert.equal(ms.current(), 2);

  assert.equal(ms.toggleAt(1), true); // 删主光标 → 集合空，回落无光标
  assert.equal(ms.count(), 0);
  assert.equal(ms.current(), null);
  assert.deepEqual(ms.selectedIds(), []);

  assert.equal(ms.toggleAt(9), false); // 越界
});

test('toggleAt：移除主光标时回落到集合中仍可见的首个成员', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAt(1); // {2} 主光标 2
  ms.toggleAt(2); // {2,3} 主光标 3

  assert.equal(ms.toggleAt(2), true); // 移除主光标 3
  assert.equal(ms.count(), 1);
  assert.equal(ms.current(), 2); // 回落到 2
  assert.deepEqual(ms.selectedIds(), [2]);
  assert.equal(ms.has(3), false);
});

test('toggleAt：更新 anchor（经 rangeTo 观察）', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4, 5] });
  ms.selectAt(0); // anchor = 1
  ms.toggleAt(3); // anchor = 4，集合 {1,4}

  // 若 anchor 仍是 1，则区间为 [1..2] = {1,2}；anchor 已更新为 4 → [2..4]
  assert.equal(ms.rangeTo(1), true);
  assert.deepEqual(ms.selectedIds(), [2, 3, 4]);
  assert.equal(ms.has(1), false);
  assert.equal(ms.current(), 2);
});

/* ------------------------------------------------------------------ *
 * rangeTo — Shift 单击：可见闭区间（ADR-014/018）
 * ------------------------------------------------------------------ */

test('rangeTo：以 anchor 为起点的可见闭区间（正向 / 反向）', () => {
  const fwd = createMultiSelection({ ids: [10, 20, 30, 40, 50] });
  fwd.selectAt(1); // anchor 20
  assert.equal(fwd.rangeTo(3), true);
  assert.deepEqual(fwd.selectedIds(), [20, 30, 40]);
  assert.equal(fwd.count(), 3);
  assert.equal(fwd.current(), 40);

  // anchor 不因 rangeTo 改变：再次 Shift 到 1 → 仍以 20 为基
  assert.equal(fwd.rangeTo(1), true);
  assert.deepEqual(fwd.selectedIds(), [20]);

  const rev = createMultiSelection({ ids: [10, 20, 30, 40, 50] });
  rev.selectAt(4); // anchor 50
  assert.equal(rev.rangeTo(2), true);
  assert.deepEqual(rev.selectedIds(), [30, 40, 50]);
  assert.equal(rev.current(), 30);
});

test('rangeTo：跳过不可见空槽项，不污染集合', () => {
  const ms = createMultiSelection({ ids: [1, null, 3, undefined, 5] });
  ms.selectAt(0); // anchor 1

  assert.equal(ms.rangeTo(4), true);
  assert.deepEqual(ms.selectedIds(), [1, 3, 5]);
  assert.equal(ms.count(), 3);
  assert.equal(ms.current(), 5);
});

test('rangeTo：无有效 anchor 时回落主光标 / selectAt', () => {
  // 全新实例无 anchor、无主光标 → 等价 selectAt
  const fresh = createMultiSelection({ ids: [1, 2, 3] });
  assert.equal(fresh.rangeTo(1), true);
  assert.deepEqual(fresh.selectedIds(), [2]);
  assert.equal(fresh.current(), 2);

  // move 清空 anchor 后，以单选主光标为基线
  const afterMove = createMultiSelection({ ids: [1, 2, 3, 4] });
  afterMove.selectAt(0); // {1}
  afterMove.move(1); // 清空集合/anchor，主光标 → 2
  assert.equal(afterMove.rangeTo(3), true);
  assert.deepEqual(afterMove.selectedIds(), [2, 3, 4]);
});

test('rangeTo：越界 / 空槽目标安全无变化', () => {
  const ms = createMultiSelection({ ids: [1, 2] });
  assert.equal(ms.rangeTo(5), false);
  assert.equal(ms.rangeTo(-1), false);
  assert.equal(ms.count(), 0);

  const holes = createMultiSelection({ ids: [1, null] });
  assert.equal(holes.rangeTo(1), false);
  assert.equal(holes.count(), 0);
});

/* ------------------------------------------------------------------ *
 * extendTo — Ctrl+Shift 单击：additive 并集扩选（TASK-001 / REQ-004 / AC-004）
 * ------------------------------------------------------------------ */

test('extendTo：Ctrl 选集 + Ctrl+Shift 扩选 = 并集（id3 不丢）', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4, 5] });
  ms.selectAt(2); // {3}，anchor=3
  ms.toggleAt(4); // {3,5}，anchor=5
  assert.deepEqual(ms.selectedIds(), [3, 5]);

  assert.equal(ms.extendTo(3), true); // 区间 [3..4]={4,5}（anchor=5）∪ {3,5}
  assert.deepEqual(ms.selectedIds(), [3, 4, 5]); // 并集，id3 保留
  assert.equal(ms.count(), 3);
  assert.equal(ms.current(), 4); // 主光标指向命中行
  assert.equal(ms.has(4), true);
});

test('extendTo：连续调用并集不缩减既有集合', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4, 5, 6] });
  ms.selectAt(0); // {1}，anchor=1
  ms.extendTo(2); // {1,2,3}
  assert.deepEqual(ms.selectedIds(), [1, 2, 3]);
  ms.extendTo(4); // base=anchor=1 → {1,2,3,4,5}；并集不缩减
  assert.deepEqual(ms.selectedIds(), [1, 2, 3, 4, 5]);
  assert.equal(ms.count(), 5);
});

test('extendTo：anchor 保持不变（可连续扩选，与 rangeTo 锚点契约一致）', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4, 5] });
  ms.selectAt(1); // anchor=2
  ms.extendTo(3); // base=2 → {2,3,4}
  ms.extendTo(0); // base 仍=2 → 区间 [0..1]={1,2}；并集 {1,2,3,4}
  assert.deepEqual(ms.selectedIds(), [1, 2, 3, 4]);
  assert.equal(ms.current(), 1);
});

test('extendTo：无有效 anchor → 回落主光标 / 等价 selectAt', () => {
  // 全新实例无 anchor、无主光标 → 等价 selectAt
  const fresh = createMultiSelection({ ids: [1, 2, 3] });
  assert.equal(fresh.extendTo(1), true);
  assert.deepEqual(fresh.selectedIds(), [2]);
  assert.equal(fresh.current(), 2);

  // move 清空 anchor 后，以单选主光标为基线（additive 但集合原本为空）
  const afterMove = createMultiSelection({ ids: [1, 2, 3, 4] });
  afterMove.selectAt(0); // {1}
  afterMove.move(1); // 清空集合/anchor，主光标 → 2
  assert.equal(afterMove.extendTo(3), true);
  assert.deepEqual(afterMove.selectedIds(), [2, 3, 4]);
});

test('extendTo：越界 / 空槽目标 → false 且无变化、不抛', () => {
  const ms = createMultiSelection({ ids: [1, 2] });
  ms.selectAt(0);
  assert.equal(ms.extendTo(5), false);
  assert.equal(ms.extendTo(-1), false);
  assert.equal(ms.extendTo(NaN), false);
  assert.deepEqual(ms.selectedIds(), [1]);

  const holes = createMultiSelection({ ids: [1, null, 3] });
  ms.selectAt(0);
  assert.equal(holes.extendTo(1), false); // 空槽不可选
  assert.equal(holes.count(), 0);
  assert.doesNotThrow(() => holes.extendTo(undefined));
});

test('extendTo：结果恒满足 count === selectedIds().length', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4, 5] });
  ms.selectAt(4);
  ms.toggleAt(0);
  ms.extendTo(2);
  assert.equal(ms.count(), ms.selectedIds().length);
});

/* ------------------------------------------------------------------ *
 * selectAll — 全选（可见范围基准，A-1/A-2）
 * ------------------------------------------------------------------ */

test('selectAll：选中当前可见全部（跳过空槽）；重复调用返回 false', () => {
  const ms = createMultiSelection({ ids: [1, null, 3] });

  assert.equal(ms.selectAll(), true);
  assert.equal(ms.count(), 2);
  assert.deepEqual(ms.selectedIds(), [1, 3]);
  assert.equal(ms.current(), 1); // 主光标落到首个成员

  assert.equal(ms.selectAll(), false); // 无变化

  const empty = createMultiSelection({ ids: [] });
  assert.equal(empty.selectAll(), false);
});

test('selectAll：主光标已是集合成员时保持不变', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAt(2); // 主光标 3

  assert.equal(ms.selectAll(), true);
  assert.equal(ms.count(), 3);
  assert.equal(ms.current(), 3);
});

/* ------------------------------------------------------------------ *
 * move — ↑↓ 单选移动并清空集合（REQ-007 回落单选）
 * ------------------------------------------------------------------ */

test('move：清空集合后委托单选移动（↑↓ 回落单选）', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAt(0); // {1}
  ms.toggleAt(1); // {1,2} 主光标 2

  assert.equal(ms.move(1), true);
  assert.equal(ms.count(), 0); // 集合被清空
  assert.deepEqual(ms.selectedIds(), []);
  assert.equal(ms.has(3), false);
  assert.equal(ms.current(), 3); // 单选核心从 2 移动到 3

  assert.equal(ms.move(-1), true);
  assert.equal(ms.current(), 2);
});

test('move：无选中时 ↓ 落首行、↑ 落末行；边界 clamp；空列表 no-op', () => {
  const down = createMultiSelection({ ids: [1, 2, 3] });
  assert.equal(down.move(1), true);
  assert.equal(down.current(), 1);
  assert.equal(down.move(-1), false); // 首行上移 clamp 不动
  assert.equal(down.current(), 1);

  const up = createMultiSelection({ ids: [1, 2, 3] });
  assert.equal(up.move(-1), true);
  assert.equal(up.current(), 3);

  const empty = createMultiSelection({ ids: [] });
  assert.equal(empty.move(1), false);
  assert.equal(empty.move(-1), false);
  assert.equal(empty.current(), null);
});

/* ------------------------------------------------------------------ *
 * setIds — 剪枝（ADR-018）
 * ------------------------------------------------------------------ */

test('setIds：剪枝保留仍可见项、剔除不可见项、更新计数', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4] });
  ms.selectAll(); // {1,2,3,4}，主光标 1

  const left = ms.setIds([2, 3, 5]);
  assert.deepEqual(left, [2, 3]);
  assert.equal(ms.count(), 2);
  assert.equal(ms.has(1), false);
  assert.equal(ms.has(4), false);
  assert.equal(ms.has(2), true);
  assert.equal(ms.current(), 2); // 主光标被剔除后回落到首个成员
  assert.deepEqual(ms.ids(), [2, 3, 5]);
  assert.equal(ms.size(), 3);
});

test('setIds：锚点被剔除则失效；选中全被剔除则清空', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4] });
  ms.selectAt(3); // {4}，anchor 4

  const left = ms.setIds([1, 2, 3]);
  assert.deepEqual(left, []);
  assert.equal(ms.count(), 0);
  assert.equal(ms.current(), null);
  assert.equal(ms.has(4), false);
});

test('setIds：选中仍可见则保留；selectedIds 按新可见顺序返回', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAt(1); // {2}
  ms.toggleAt(2); // {2,3}，主光标 3

  const left = ms.setIds([3, 2, 1]);
  assert.deepEqual(left, [3, 2]); // 可见顺序（3 在前）
  assert.equal(ms.count(), 2);
  assert.equal(ms.current(), 3);
  assert.deepEqual(ms.selectedIds(), [3, 2]);
});

/* ------------------------------------------------------------------ *
 * onEvict — 淘汰联动（N 实时更新，ADR-018）
 * ------------------------------------------------------------------ */

test('onEvict：移除集合成员 + 计数实时更新；非成员返回 false', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAll(); // {1,2,3}，主光标 1

  assert.equal(ms.onEvict(2), true);
  assert.equal(ms.count(), 2);
  assert.equal(ms.has(2), false);
  assert.deepEqual(ms.selectedIds(), [1, 3]);
  assert.equal(ms.current(), 1);

  assert.equal(ms.onEvict(99), false); // 非成员、非主光标 → 无变化
  assert.equal(ms.count(), 2);
});

test('onEvict：主光标被淘汰时回落到集合成员', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAt(1); // {2}
  ms.toggleAt(2); // {2,3}，主光标 3

  assert.equal(ms.onEvict(3), true);
  assert.equal(ms.count(), 1);
  assert.equal(ms.current(), 2);
  assert.deepEqual(ms.selectedIds(), [2]);
});

test('onEvict：单选回落态（集合空、主光标选中）被淘汰时清空光标', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.move(1); // 集合空，主光标 1

  assert.equal(ms.count(), 0);
  assert.equal(ms.current(), 1);

  assert.equal(ms.onEvict(1), true);
  assert.equal(ms.current(), null);
  assert.equal(ms.count(), 0);
});

/* ------------------------------------------------------------------ *
 * clear — 全部复位
 * ------------------------------------------------------------------ */

test('clear：清空集合 / 锚点 / 主光标并返回是否变化', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3] });
  ms.selectAll();

  assert.equal(ms.clear(), true);
  assert.equal(ms.count(), 0);
  assert.deepEqual(ms.selectedIds(), []);
  assert.equal(ms.current(), null);
  assert.equal(ms.size(), 3); // 可见列表保留

  assert.equal(ms.clear(), false); // 已空
});

/* ------------------------------------------------------------------ *
 * 一致性 + onChange
 * ------------------------------------------------------------------ */

test('一致性：count === selectedIds().length；current 属于集合或为 null', () => {
  const ms = createMultiSelection({ ids: [1, 2, 3, 4] });

  const assertConsistent = () => {
    assert.equal(ms.count(), ms.selectedIds().length);
    const cur = ms.current();
    if (cur !== null) {
      assert.equal(ms.has(cur), true);
    }
  };

  ms.selectAt(1);
  assertConsistent();
  ms.toggleAt(2);
  assertConsistent();
  ms.rangeTo(3);
  assertConsistent();
  ms.selectAll();
  assertConsistent();
  ms.setIds([4, 3]);
  assertConsistent();
  ms.onEvict(3);
  assertConsistent();
});

test('onChange：携带 (primaryId, index, ids)；无效操作不触发；异常隔离', () => {
  const events = [];
  const ms = createMultiSelection({
    ids: [5, 6, 7],
    onChange: (id, index, ids) => events.push([id, index, ids.slice()]),
  });

  ms.selectAt(1);
  assert.deepEqual(events[events.length - 1], [6, 1, [6]]);

  ms.toggleAt(2);
  assert.deepEqual(events[events.length - 1], [7, 2, [6, 7]]);

  ms.move(-1); // 清空集合，主光标 7 → 6
  assert.deepEqual(events[events.length - 1], [6, 1, []]);

  ms.clear();
  assert.deepEqual(events[events.length - 1], [null, -1, []]);

  const count = events.length;
  ms.toggleAt(99); // 越界 → 无事件
  assert.equal(events.length, count);

  const boom = createMultiSelection({
    ids: [5],
    onChange: () => {
      throw new Error('boom');
    },
  });
  assert.doesNotThrow(() => boom.selectAt(0));
  assert.equal(boom.current(), 5);
});
