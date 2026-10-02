# developer-output — TASK-007 Round 01

## 模块: Clipboard 写入 + 降级链 + Toast（DEL-007 / REQ-025/034 / AC-011/022）

- 新增: `extension/src/clipboard.js`
- 新增: `tests/clipboard.test.mjs`
- 编辑: `extension/panel.js`（仅追加接线，不改导出契约）
- 编辑: `extension/src/i18n.js`（新增 `copy.notEnabled` zh/en，保持键集对齐）
- 契约真源: design.md §5.3 / §5.1 D-3 / ADR-007

## 实现

### `extension/src/clipboard.js`

```js
export async function copyText(text, deps = {}) {
  const value = typeof text === 'string' ? text : text == null ? '' : String(text);
  const primary = await copyViaAsyncApi(value, resolveNavigator(deps));   // navigator.clipboard.writeText
  if (primary.ok) return { ok: true, via: 'async' };
  const fallback = copyViaExecCommand(value, resolveDocument(deps));      // 临时 textarea + execCommand('copy') + finally 清理
  if (fallback.ok) return { ok: true, via: 'execCommand' };
  return { ok: false, via: 'none', reason: fallback.reason || primary.reason || 'copy failed' };
}

export function showToast(message, kind = 'info', deps = {}) { /* #toast / textContent / 类名 / 自动隐藏 */ }
export function createToast(el, options = {}) { /* 工厂：绑定元素与专属计时器 */ }
export const DEFAULT_TOAST_MS = 2400;
```

要点：
- 主路径 `via:'async'`；降级 `via:'execCommand'`；双失败 `via:'none'` + `reason`，**永不抛异常**。
- 降级构造离屏 textarea（`position:fixed; top/left:-9999px; opacity:0` + `readonly`），`focus/select/setSelectionRange`，`finally` 无条件清理临时节点。
- `deps` 可注入 `{navigator, document, el, durationMs, setTimeout, clearTimeout}`，纯 Node 可确定性单测。
- Toast 只用 `textContent`（禁 innerHTML），按 kind 加 `toast--success/error/info`，`data-visible` 控制显隐。
- 零第三方依赖；无网络；无持久化。

### `extension/panel.js`（追加）

```js
import { copyText } from './src/clipboard.js';

async function onCopyClick() {
  const text = buildCurrentCopy(copyMode);
  if (text === null) { showToast(t('copy.hintSelect'), 'error'); return; }
  lastCopyText = text;
  let result;
  try { result = await copyText(text); }
  catch (err) { result = { ok:false, via:'none', reason: err && err.message ? err.message : String(err) }; }
  if (result && result.ok) { showToast(t('toast.copied'), 'success'); return; }
  const reason = result && result.reason ? result.reason : t('toast.copyFailedUnknown');
  showToast(t('toast.copyFailed', { reason }), 'error');
}
// #copy-btn → onCopyClick；#copy-req/resp/curl-btn → onDeferredCopyClick（t('copy.notEnabled')，P2 未启用，不阻断主路径）
```

## 测试结果

```
node --test "tests/clipboard.test.mjs"
✔ 主路径成功：writeText resolve → {ok:true, via:"async"}
✔ 内容不改动：传入文本被逐字符原样传给 writeText
✔ 降级：primary reject + execCommand true → {ok:true, via:"execCommand"} 且清理临时节点
✔ 降级：navigator.clipboard 不可用（非安全上下文）→ execCommand 接管
✔ 降级：完全没有 navigator（无 API）→ execCommand 接管
✔ 双失败：primary reject + execCommand false → {ok:false, via:"none", reason} 且不抛
✔ 双失败：execCommand 抛异常 → 捕获为失败结果且清理临时节点
✔ 双失败：无 navigator 且无 document → {ok:false, via:"none"} 不抛
✔ showToast：写入文案 + success 类名 + data-visible=true，并安排自动隐藏
✔ showToast：error 类名且清除旧计时器
✔ showToast：未知 kind 回退 info；找不到元素返回 false
✔ showToast：默认时长常量与自动隐藏
✔ createToast：返回可复用函数，重复调用复用同一元素并清理计时器
✔ createToast：无元素时返回 false 且不抛
ℹ tests 14  pass 14  fail 0
```

全量回归：`node --test "tests/**/*.test.mjs"` → **tests 104 / pass 104 / fail 0**（TASK-006 基线 90 + 14）

门禁：
```
node scripts/check-syntax.mjs       → 10/10 files passed (exit 0)
node scripts/check-panel-shell.mjs  → RESULT: PASS (34/34) (exit 0)
node scripts/check-zero-network.mjs → 17/17 项通过 / PASS (exit 0)
```

## 自评
- [x] 符合 CONSTITUTION 红线（build + test 均真实 PASS）
- [x] 符合 conventions.md 规范（纯原生 ESM、零依赖、文案走 i18n、textContent）
- [x] 错误处理已覆盖（API 缺失/拒绝/execCommand false/抛异常/无 DOM，全部返回结果对象不抛）
- [x] 单元测试已覆盖（主路径/降级/双失败/内容不改动/清理/Toast）
- [x] 未改 manifest.json；未创建 TASK-008 文件；未改 panel.js 导出契约

## 备注 / 决策
- 任务描述指定主路径 `via:'async'`（优先于设计 ADR-007 的 `'clipboard'` 措辞），已按任务描述执行。
- P2 三按钮（REQ-013 / DEC-004）仅给「暂未启用」提示，不实现仅请求/响应/curl 复制；新增 i18n 键 `copy.notEnabled`（zh/en 同步），维持 `i18n.test.mjs` 键集对齐。
- 降级路径的临时 textarea 在成功与异常两条分支均通过 `finally` 清理（测试断言 body 无残留）。
