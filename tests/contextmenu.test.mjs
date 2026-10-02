/**
 * contextmenu.test.mjs — 右键菜单逻辑 + 面板级接线单元测试
 * （DEL-001 / DEL-008 / TASK-002 / TASK-004）
 *
 * covers: AC-001（行命中 / 表头空白 / 菜单模型）、AC-002（已选保留 / 未选替换）、
 *         AC-003（工具栏 ≡ 右键 批量产物逐字符一致）、AC-004（混合修饰键并集）、
 *         AC-005/006（0/1/N + 四路选择）、AC-009/010（无 P2、主项与批量项保留）。
 *
 * 覆盖（验收锚点）：
 *   - resolveRowId：命中 `.row[data-id]`；表头 / 空白 / 无 closest → null；
 *                   non-throwing 健壮性；列表体包含性。
 *   - clampPosition：左 / 右 / 上 / 下四边夹取 + 居中不漂移 + 非有限输入。
 *   - createMenuModel：count=0/1/2 项集正确、主项常驻、批量项可达、无 P2 常量/项。
 *   - 面板级接线（真实 panel.js + DOM shim）：多选态右键保留集合、集合外替换、
 *     空白不弹、混合修饰键并集、纯 Shift 仍替换、工具栏≡右键、A/B 按钮。
 *
 * 纯逻辑零 DOM 依赖；面板级用例用 tests/panel-harness.mjs 的手写 DOM shim 真实加载
 * extension/panel.js（非模型复制品）。运行：node --test "tests/contextmenu.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  E_CTX_NO_TARGET,
  CTX_ACTION,
  CTX_ITEM_ID,
  resolveRowId,
  createMenuModel,
  clampPosition,
} from '../extension/src/contextmenu.js';
import { createPanelHarness } from './panel-harness.mjs';

/* ------------------------------------------------------------------------- *
 * 最小 DOM 桩（鸭子类型）
 * ------------------------------------------------------------------------- */

/** 行元素桩：仅实现 resolveRowId 读取 `data-id` 所需的接口。 */
function makeRow(dataId, options = {}) {
  const row = {
    getAttribute(name) {
      if (name === 'data-id') {
        return dataId === undefined ? null : dataId;
      }
      return null;
    },
  };
  if (options.noGetAttribute) {
    delete row.getAttribute;
    row.dataset = { id: dataId };
  }
  return row;
}

/** 事件目标桩：`closest('.row')` 返回给定行（模拟祖先查找结果）。 */
function makeTarget(row) {
  return {
    closest(selector) {
      if (selector !== '.row') {
        return null;
      }
      return row || null;
    },
  };
}

/** 列表体桩。 */
function makeListBody(containsImpl) {
  return { contains: containsImpl };
}

/* ------------------------------------------------------------------------- *
 * resolveRowId — 命中路径
 * ------------------------------------------------------------------------- */

test('resolveRowId：命中 .row[data-id]，数值串还原为 number', () => {
  const row = makeRow('42');
  const event = { target: makeTarget(row) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), 42);
});

test('resolveRowId：data-id=0 → 返回 0（不因 falsy 误判为 null）', () => {
  const event = { target: makeTarget(makeRow('0')) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), 0);
});

test('resolveRowId：嵌套子元素（closest 逐级上溯）同样命中行', () => {
  // 模拟点击行内单元格：target 是单元格，closest 返回行。
  const row = makeRow('7');
  const cell = { closest: (sel) => (sel === '.row' ? row : null) };
  assert.equal(resolveRowId({ target: cell }, makeListBody(() => true)), 7);
});

test('resolveRowId：非常规 id（非十进制整数）原样返回字符串', () => {
  const event = { target: makeTarget(makeRow('req-abc')) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), 'req-abc');
});

test('resolveRowId：非规范十进制串保留原样（"007" 不还原成 7）', () => {
  const event = { target: makeTarget(makeRow('007')) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), '007');
});

test('resolveRowId：data-id 通过 dataset.id 读取（无 getAttribute 时降级）', () => {
  const row = makeRow('9', { noGetAttribute: true });
  const event = { target: makeTarget(row) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), 9);
});

/* ------------------------------------------------------------------------- *
 * resolveRowId — 未命中 / 边界
 * ------------------------------------------------------------------------- */

test('resolveRowId：表头 / 空白（closest 返回 null）→ null', () => {
  const event = { target: makeTarget(null) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), null);
});

test('resolveRowId：未渲染行 / 无 data-id → null', () => {
  const event = { target: makeTarget(makeRow(null)) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), null);
});

test('resolveRowId：data-id 为空串 → null', () => {
  const event = { target: makeTarget(makeRow('')) };
  assert.equal(resolveRowId(event, makeListBody(() => true)), null);
});

test('resolveRowId：列表体不包含该行 → null（排除列表外同 class 元素）', () => {
  const event = { target: makeTarget(makeRow('5')) };
  assert.equal(resolveRowId(event, makeListBody(() => false)), null);
});

test('resolveRowId：无 contains 的列表体桩不阻塞命中（兼容降级）', () => {
  const event = { target: makeTarget(makeRow('5')) };
  assert.equal(resolveRowId(event, { contains: 123 }), 5);
  assert.equal(resolveRowId(event, null), 5);
});

/* ------------------------------------------------------------------------- *
 * resolveRowId — 健壮性（不抛异常）
 * ------------------------------------------------------------------------- */

test('resolveRowId：null / undefined / 非对象事件 → null 且不抛', () => {
  assert.doesNotThrow(() => resolveRowId(null));
  assert.equal(resolveRowId(null), null);
  assert.equal(resolveRowId(undefined), null);
  assert.equal(resolveRowId('nope'), null);
  assert.equal(resolveRowId(123), null);
});

test('resolveRowId：无 target / target 无 closest → null', () => {
  assert.equal(resolveRowId({}), null);
  assert.equal(resolveRowId({ target: {} }), null);
  assert.equal(resolveRowId({ target: { closest: 'x' } }), null);
});

test('resolveRowId：closest 抛异常 → 捕获返回 null（绝不外抛）', () => {
  const event = {
    target: {
      closest() {
        throw new Error('boom');
      },
    },
  };
  let out;
  assert.doesNotThrow(() => {
    out = resolveRowId(event, makeListBody(() => true));
  });
  assert.equal(out, null);
});

test('resolveRowId：listBodyEl.contains 抛异常 → 不阻断命中', () => {
  const event = { target: makeTarget(makeRow('11')) };
  let out;
  assert.doesNotThrow(() => {
    out = resolveRowId(event, {
      contains() {
        throw new Error('boom');
      },
    });
  });
  assert.equal(out, 11);
});

test('E_CTX_NO_TARGET：错误码常量存在且为稳定字符串', () => {
  assert.equal(E_CTX_NO_TARGET, 'E_CTX_NO_TARGET');
});

/* ------------------------------------------------------------------------- *
 * clampPosition — 视口四边夹取
 * ------------------------------------------------------------------------- */

test('clampPosition：视口内不漂移（原样返回期望坐标）', () => {
  assert.deepEqual(
    clampPosition({ x: 10, y: 20, w: 100, h: 50, vw: 1000, vh: 800 }),
    { left: 10, top: 20 },
  );
});

test('clampPosition：右边溢出 → 左移贴右边界', () => {
  assert.deepEqual(
    clampPosition({ x: 980, y: 20, w: 100, h: 50, vw: 1000, vh: 800 }),
    { left: 900, top: 20 },
  );
});

test('clampPosition：左边溢出 → 夹到 0', () => {
  assert.deepEqual(
    clampPosition({ x: -30, y: 20, w: 100, h: 50, vw: 1000, vh: 800 }),
    { left: 0, top: 20 },
  );
});

test('clampPosition：下边溢出 → 上移贴下边界', () => {
  assert.deepEqual(
    clampPosition({ x: 10, y: 760, w: 100, h: 200, vw: 1000, vh: 800 }),
    { left: 10, top: 600 },
  );
});

test('clampPosition：上边溢出 → 夹到 0', () => {
  assert.deepEqual(
    clampPosition({ x: 10, y: -5, w: 100, h: 50, vw: 1000, vh: 800 }),
    { left: 10, top: 0 },
  );
});

test('clampPosition：右下角同时溢出 → 两边各自夹取', () => {
  assert.deepEqual(
    clampPosition({ x: 995, y: 795, w: 120, h: 90, vw: 1000, vh: 800 }),
    { left: 880, top: 710 },
  );
});

test('clampPosition：菜单大于视口 → 对齐 (0,0) 保左上可见', () => {
  assert.deepEqual(
    clampPosition({ x: 50, y: 50, w: 1200, h: 900, vw: 1000, vh: 800 }),
    { left: 0, top: 0 },
  );
});

test('clampPosition：恰好贴边 → 不越界', () => {
  assert.deepEqual(
    clampPosition({ x: 900, y: 700, w: 100, h: 100, vw: 1000, vh: 800 }),
    { left: 900, top: 700 },
  );
});

test('clampPosition：非有限 / 缺省输入 → 0 且不抛', () => {
  assert.deepEqual(clampPosition(), { left: 0, top: 0 });
  assert.deepEqual(clampPosition({}), { left: 0, top: 0 });
  assert.deepEqual(
    clampPosition({ x: NaN, y: Infinity, w: -10, h: -20, vw: NaN, vh: undefined }),
    { left: 0, top: 0 },
  );
  assert.doesNotThrow(() => clampPosition({ x: 'a', y: {}, w: [], h: null, vw: 'b', vh: {} }));
});

/* ------------------------------------------------------------------------- *
 * createMenuModel — 项集 / 主项常驻 / 批量项可达 / 无 P2
 * ------------------------------------------------------------------------- */

/** 提取项 id 序列，便于断言项集。 */
function idsOf(items) {
  return items.map((it) => it.id);
}

test('CTX 常量：P2 成员已移除，仅保留主项 + 批量项', () => {
  assert.equal(CTX_ACTION.COPY_REQUEST_RESPONSE, 'copyRequestResponse');
  assert.equal(CTX_ACTION.COPY_SELECTED, 'copySelected');
  assert.equal(CTX_ACTION.COPY_REQUEST_ONLY, undefined);
  assert.equal(CTX_ACTION.COPY_RESPONSE_ONLY, undefined);

  assert.equal(CTX_ITEM_ID.COPY_REQUEST_RESPONSE, 'copy-request-response');
  assert.equal(CTX_ITEM_ID.COPY_SELECTED, 'copy-selected');
  assert.equal(CTX_ITEM_ID.COPY_REQUEST_ONLY, undefined);
  assert.equal(CTX_ITEM_ID.COPY_RESPONSE_ONLY, undefined);
});

test('createMenuModel：count=0 且无选中 → 仅主项（禁用）', () => {
  const items = createMenuModel({ hasSelection: false, count: 0 });
  assert.deepEqual(idsOf(items), [CTX_ITEM_ID.COPY_REQUEST_RESPONSE]);
  assert.equal(items[0].enabled, false);
});

test('createMenuModel：count=1 有选中 → 仅主项（启用），无批量项', () => {
  const items = createMenuModel({ hasSelection: true, count: 1 });
  assert.deepEqual(idsOf(items), [CTX_ITEM_ID.COPY_REQUEST_RESPONSE]);
  assert.equal(items[0].enabled, true);
  assert.ok(!idsOf(items).includes(CTX_ITEM_ID.COPY_SELECTED));
});

test('createMenuModel：count=2 → 主项 + 批量项，批量项 enabled 且 vars.count=2', () => {
  const items = createMenuModel({ hasSelection: true, count: 2 });
  assert.deepEqual(idsOf(items), [CTX_ITEM_ID.COPY_REQUEST_RESPONSE, CTX_ITEM_ID.COPY_SELECTED]);
  assert.equal(items[0].enabled, true);
  const selected = items[1];
  assert.equal(selected.enabled, true);
  assert.deepEqual(selected.vars, { count: 2 });
  assert.equal(selected.i18nKey, 'contextmenu.copySelected');
  assert.equal(selected.action, CTX_ACTION.COPY_SELECTED);
});

test('createMenuModel：count=5 → 插值 count=5，且批量项唯一', () => {
  const items = createMenuModel({ hasSelection: true, count: 5 });
  const selectedItems = items.filter((it) => it.id === CTX_ITEM_ID.COPY_SELECTED);
  assert.equal(selectedItems.length, 1);
  assert.deepEqual(selectedItems[0].vars, { count: 5 });
});

test('createMenuModel：任何 count 均不含 P2 id / action', () => {
  for (const count of [0, 1, 2, 5]) {
    const items = createMenuModel({ hasSelection: true, count: count });
    for (const it of items) {
      assert.ok(it.id !== 'copy-request-only' && it.id !== 'copy-response-only');
      assert.ok(it.action !== 'copyRequestOnly' && it.action !== 'copyResponseOnly');
    }
  }
});

test('createMenuModel：每项文案键均为 contextmenu.* 且非 P2 键', () => {
  const items = createMenuModel({ hasSelection: true, count: 2 });
  for (const it of items) {
    assert.ok(
      typeof it.i18nKey === 'string' && it.i18nKey.startsWith('contextmenu.'),
      'i18nKey 必须以 contextmenu. 开头: ' + it.i18nKey,
    );
    assert.ok(it.i18nKey !== 'contextmenu.copyRequestOnly');
    assert.ok(it.i18nKey !== 'contextmenu.copyResponseOnly');
  }
});

test('createMenuModel：项模型为纯数据，形状稳定（无 p2 字段）', () => {
  const items = createMenuModel({ hasSelection: true, count: 2 });
  for (const it of items) {
    assert.deepEqual(Object.keys(it).sort(), ['action', 'enabled', 'i18nKey', 'id', 'vars']);
    assert.equal(typeof it.id, 'string');
    assert.equal(typeof it.i18nKey, 'string');
    assert.equal(typeof it.enabled, 'boolean');
    assert.equal(typeof it.action, 'string');
    assert.ok(it.vars === null || typeof it.vars === 'object');
  }
});

test('createMenuModel：action 与 id 一一对应且不重复', () => {
  const items = createMenuModel({ hasSelection: true, count: 2 });
  assert.deepEqual(
    items.map((it) => it.action),
    [CTX_ACTION.COPY_REQUEST_RESPONSE, CTX_ACTION.COPY_SELECTED],
  );
  assert.equal(new Set(items.map((it) => it.id)).size, items.length);
});

test('createMenuModel：非法 / 缺省 context 安全降级（仅主项、禁用、不抛）', () => {
  assert.deepEqual(idsOf(createMenuModel()), [CTX_ITEM_ID.COPY_REQUEST_RESPONSE]);
  assert.equal(createMenuModel(null)[0].enabled, false);
  assert.equal(createMenuModel('x')[0].enabled, false);
  assert.doesNotThrow(() => createMenuModel(undefined));
});

test('createMenuModel：count 非法值（负数 / NaN）按 0；字符串 "2" 生效', () => {
  assert.ok(!idsOf(createMenuModel({ hasSelection: true, count: -3 })).includes(CTX_ITEM_ID.COPY_SELECTED));
  assert.ok(!idsOf(createMenuModel({ hasSelection: true, count: NaN })).includes(CTX_ITEM_ID.COPY_SELECTED));
  assert.ok(
    idsOf(createMenuModel({ hasSelection: true, count: '2' })).includes(CTX_ITEM_ID.COPY_SELECTED),
  );
});

test('createMenuModel：纯函数——多次调用稳定、不修改入参、返回新数组', () => {
  const ctx = { hasSelection: true, count: 2 };
  const snapshot = JSON.stringify(ctx);
  const a = createMenuModel(ctx);
  const b = createMenuModel(ctx);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(ctx), snapshot, '不得修改入参 context');

  a.push({ id: 'injected' });
  assert.ok(!idsOf(createMenuModel(ctx)).includes('injected'));
});

/* ------------------------------------------------------------------------- *
 * 面板级接线（真实 panel.js + DOM shim；DEL-008 / TASK-004）
 *
 * display 顺序：index0→id6 … index5→id1（最新在上，见 refreshView 倒序）。
 * 一次性喂入 6 条，各用例以 clickRow 重置选择，避免相互污染。
 * ------------------------------------------------------------------------- */

const H = await createPanelHarness();
for (let i = 1; i <= 6; i += 1) {
  H.feed(i, 'https://x/' + i);
}
H.flushRaf();

/** 可见顺序排序，便于比较集合。 */
function sortedSel() {
  return H.panel.getSelectedIds().slice().sort((a, b) => a - b);
}

test('面板级：多选态右键命中集合内行 → 集合保留 + 菜单含「复制选中(2)」', () => {
  H.clickRow(0); // selectAt id6
  H.clickRow(1, { ctrl: true }); // toggle id5 → {5,6}
  assert.deepEqual(sortedSel(), [5, 6]);

  H.rightClickRow(0); // 命中 id6（已在集合内）→ 保留
  assert.deepEqual(sortedSel(), [5, 6], '命中已选行不得坍缩集合');
  assert.equal(H.menuIsOpen(), true);

  const ids = H.menuItems().map((it) => it.id);
  assert.deepEqual(ids, ['copy-request-response', 'copy-selected']);
  const batch = H.menuItems().find((it) => it.id === 'copy-selected');
  assert.equal(batch.disabled, false);
  assert.match(batch.text, /复制选中\(2\)/);
});

test('面板级：右键命中集合外行 → selectAt 单选替换、count=1、无批量项', () => {
  H.clickRow(0);
  H.clickRow(1, { ctrl: true }); // {5,6}
  H.rightClickRow(5); // id1 在集合外 → 单选替换
  assert.deepEqual(sortedSel(), [1], '命中集合外行按单选替换');
  assert.deepEqual(
    H.menuItems().map((it) => it.id),
    ['copy-request-response'],
    'count=1 不出现批量项',
  );
});

test('面板级：表头/空白右键 → 不弹菜单、不改集合（E_CTX_NO_TARGET）', () => {
  H.clickRow(0); // {6}
  const before = sortedSel();
  H.closeMenu(); // 清掉可能残留的菜单，验证「不新开」
  H.rightClickBody();
  assert.equal(H.menuIsOpen(), false, '未命中行不得弹菜单');
  assert.deepEqual(sortedSel(), before, '未命中行不得改集合');
});

test('面板级：Ctrl+Shift 扩选为并集（先前项不丢）；纯 Shift 仍替换', () => {
  H.clickRow(5); // selectAt id1 → {1}
  H.clickRow(0, { ctrl: true }); // toggle id6, anchor=id6 → {1,6}
  H.clickRow(1, { ctrl: true, shift: true }); // extendTo(idx1=id5)：{1,6} ∪ {6,5}
  assert.deepEqual(sortedSel(), [1, 5, 6], 'Ctrl+Shift 必须为并集，id5/id1 不得丢');

  // 纯 Shift 仍为替换语义（anchor 仍为 id6，区间 idx0..idx3 = {6,5,4,3}）
  H.clickRow(3, { shift: true });
  assert.deepEqual(sortedSel(), [3, 4, 5, 6], '纯 Shift 保持替换语义（id1 被替换掉）');
});

test('面板级：0 条 → copySelection 提示且不写剪贴板', async () => {
  H.pressArrow('ArrowDown'); // 清空集合，回落单选
  assert.deepEqual(H.panel.getSelectedIds(), []);
  H.resetClipboard();
  const r = await H.panel.copySelection('formatted');
  assert.equal(r.ok, false);
  assert.equal(r.count, 0);
  assert.equal(H.getClipboard(), null, '0 条不得写剪贴板');
});

test('面板级：1 条 → 逐字符等于单选，无 ===== #i/N ===== 标记', async () => {
  H.clickRow(0); // {6}
  H.resetClipboard();
  const r = await H.panel.copySelection('formatted');
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  const clip = H.getClipboard();
  assert.equal(clip, H.panel.buildCurrentCopy('formatted'));
  assert.equal(H.countMarkers(clip), 0);
});

test('面板级：右键批量项 ≡ 工具栏「复制选中」(逐字符) 且 N 段', async () => {
  H.clickRow(0);
  H.clickRow(1, { ctrl: true }); // {5,6}

  // 菜单批量入口
  H.rightClickRow(0); // 已在集合 → 保留
  H.resetClipboard();
  H.clickMenuId('copy-selected');
  await H.tick();
  const menuClip = H.getClipboard();

  // 工具栏批量入口
  H.resetClipboard();
  H.clickCopySelected();
  await H.tick();
  const toolbarClip = H.getClipboard();

  assert.equal(menuClip, toolbarClip, '工具栏 ≡ 右键 批量产物必须逐字符一致');
  assert.equal(H.countMarkers(menuClip), 2);
  assert.ok(menuClip.includes('===== #1/2 ====='));
  assert.ok(menuClip.includes('===== #2/2 ====='));
});

test('面板级：模式 A/B 独立按钮（动作即模式），默认 A；无 toggle 残留', async () => {
  H.clickRow(0); // {6}

  H.resetClipboard();
  H.clickButton('copy-btn-a');
  await H.tick();
  const clipA = H.getClipboard();

  H.resetClipboard();
  H.clickButton('copy-btn-b');
  await H.tick();
  const clipB = H.getClipboard();

  H.resetClipboard();
  H.clickButton('copy-btn');
  await H.tick();
  const clipMain = H.getClipboard();

  assert.equal(clipA, H.panel.buildCurrentCopy('formatted'));
  assert.equal(clipB, H.panel.buildCurrentCopy('raw'));
  assert.notEqual(clipA, clipB, 'A/B 产物必须不同');
  assert.equal(clipMain, clipA, '#copy-btn 默认模式 A');
  assert.equal(H.panel.getCopyMode(), 'formatted', 'getCopyMode 恒为默认 A');
  assert.equal(typeof H.panel.setCopyMode, 'undefined', 'setCopyMode 已移除');
  assert.ok(!H.document._byId.has('mode-toggle'), '无 #mode-toggle 残留');
  assert.ok(!H.document._byId.has('copy-req-btn'), '无 #copy-req-btn 残留');
  assert.ok(!H.document._byId.has('copy-resp-btn'), '无 #copy-resp-btn 残留');
});

test('面板级：菜单从不出现 P2 项（③ 已移除）', () => {
  H.clickRow(0);
  H.clickRow(1, { ctrl: true });
  H.rightClickRow(0);
  for (const it of H.menuItems()) {
    assert.ok(it.id !== 'copy-request-only' && it.id !== 'copy-response-only');
  }
  assert.ok(H.menuItems().some((it) => it.id === 'copy-request-response'), '主项保留');
  assert.ok(H.menuItems().some((it) => it.id === 'copy-selected'), '批量项保留');
});
