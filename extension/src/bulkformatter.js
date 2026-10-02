/**
 * bulkformatter.js — 多记录批量拼接器（外层聚合，DEL-003）
 *
 * 职责：把**多条** RequestRecord 聚合成一份可直接粘贴给 AI 的纯文本，
 * 每条各自调用**冻结的** {@link import('./formatter.js').buildCopyText} 生成原样块，
 * 再按 ADR-015 模板加序号分隔线。
 *
 * 模板契约（ADR-015 / AC-006）：
 *   - N ≥ 2：`join('\n\n', blocks)`，其中
 *     `block_i = "===== #" + i + "/" + N + " =====" + "\n" +
 *                buildCopyText(record_i, mode, { responseBody: resolveBody(record_i) })`，
 *     `i` 从 1 起、十进制**无补零**。
 *   - N === 1：**委托单选路径**，输出与单条 `buildCopyText` **逐字符一致**（不加序号/分隔线）。
 *   - N === 0：输出空串。
 *   - 顺序 = 输入数组顺序（调用方按**可见列表顺序**传入），本模块绝不排序。
 *
 * 单一真源（A5 / R-01 缓解）：
 *   本模块**只做外层聚合**，绝不复制/重写 `buildCopyText` 的拼接逻辑；
 *   段内文本与单选复制天然逐字符同源，保真契约集中在 `formatter.js` 一处。
 *
 * 纯度：纯函数、零副作用、零浏览器 API、零第三方依赖；Node 可直接 import 单测。
 *
 * @module bulkformatter
 */

import { buildCopyText, MODE_A } from './formatter.js';

/**
 * 单段序号标记（ADR-015）。`i` 从 1、十进制无补零。
 *
 * @param {number} i 段序号（1 起）
 * @param {number} total 段总数 N
 * @returns {string} e.g. `===== #1/3 =====`
 */
function marker(i, total) {
  return '===== #' + i + '/' + total + ' =====';
}

/**
 * 生成单条记录的**原样块**（不含序号标记）。
 *
 * 若提供了 `resolveBody`（函数），则按 ADR-015 注入 `{ responseBody: resolveBody(record) }`
 * —— 复用 formatter 的 body 注入契约（供 panel 注入分类后的响应体）；
 * 未提供时**不传 options**，让 formatter 回退 `record.responseContent.text`。
 *
 * 注意：不要用 `{ responseBody: undefined }` 表达「未注入」——formatter 用
 * `hasOwnProperty` 区分「显式提供空值」，显式 undefined 会抑制回退。
 *
 * @param {Object} record 单条 RequestRecord
 * @param {'formatted'|'raw'} mode 复制模式
 * @param {((record: Object) => *)|undefined} resolveBody 响应体解析器
 * @returns {string} 该条 `buildCopyText` 原样输出
 */
function buildBlock(record, mode, resolveBody) {
  if (typeof resolveBody === 'function') {
    return buildCopyText(record, mode, { responseBody: resolveBody(record) });
  }
  return buildCopyText(record, mode);
}

/**
 * 把 N 个**原样块**按 ADR-015 模板拼接为批量文本。
 *
 * - `total ≥ 2`：为第 i 个块前置 `block_i = marker(i, total) + '\n' + block`，再
 *   以 `'\n\n'` 连接。
 * - `total ≤ 1`：不加任何标记，返回首个块原样（与单选路径一致）。
 * - 空数组：返回 `''`。
 *
 * `blocks` 是**不含标记**的段内容数组；标记由本函数依据 `N` 生成，确保
 * 段数、分母与实际输入一致。
 *
 * @param {string[]} blocks 各段原样文本（通常来自 `buildCopyText`）
 * @param {number} N 段总数（用于生成 `#i/N` 标记的分母）
 * @returns {string} 批量文本
 */
export function joinBlocks(blocks, N) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) {
    return '';
  }
  const total = Number.isFinite(N) && N > 0 ? Math.trunc(N) : list.length;
  if (total <= 1) {
    return list[0];
  }
  const marked = [];
  for (let i = 0; i < list.length; i += 1) {
    marked.push(marker(i + 1, total) + '\n' + list[i]);
  }
  return marked.join('\n\n');
}

/**
 * 把多条记录聚合为批量复制文本（纯函数，ADR-015）。
 *
 * @param {Object[]} records RequestRecord 数组（顺序 = 可见列表顺序）
 * @param {'formatted'|'raw'} [mode=MODE_A] 复制模式；透传给 `buildCopyText`
 * @param {(record: Object) => *} [resolveBody] 逐条响应体解析器；由调用方注入分类后 body
 * @returns {string} 批量文本；`records` 非数组或为空时返回 `''`
 */
export function buildBulkCopyText(records, mode = MODE_A, resolveBody) {
  const list = Array.isArray(records) ? records : [];
  const total = list.length;
  if (total === 0) {
    return '';
  }
  const blocks = [];
  for (let i = 0; i < total; i += 1) {
    blocks.push(buildBlock(list[i], mode, resolveBody));
  }
  if (total === 1) {
    // N === 1：委托单选路径，逐字符一致（无标记）。
    return blocks[0];
  }
  return joinBlocks(blocks, total);
}

export default { joinBlocks, buildBulkCopyText };
