# developer-output — TASK-006-enh Round 01

> 里程碑: 在现有 Raw Copy（Chrome/Edge DevTools MV3）基础上做功能增强
> 任务: TASK-006 — 右键菜单逻辑模块 `contextmenu.js` + 单测
> 依据: design.md §4.2 / ADR-013 / ADR-014；plan.md STORY-ENH-001 NEW_APIS
> 日期: 2026-10-02 | 角色: butler-developer

## 模块: contextmenu.js（纯逻辑）

- 文件: `extension/src/contextmenu.js`（新增，DEL-001）
- 测试: `tests/contextmenu.test.mjs`（新增，39 用例，DEL-007）

### 导出契约

| 导出 | 签名 | 说明 |
|------|------|------|
| `resolveRowId(event, listBodyEl)` | `→ number\|string\|null` | `event.target.closest('.row')` → 读 `data-id`；未命中表头/空白/未渲染行 → null（`E_CTX_NO_TARGET` 语义，不抛异常） |
| `createMenuModel({hasSelection,count,canCopyRequestOnly})` | `→ MenuItem[]` | 主项常驻；`count>=2` 追加「复制选中(N)」；P2「仅复制请求/仅复制响应」占位 |
| `clampPosition({x,y,w,h,vw,vh})` | `→ {left,top}` | 视口四边夹取，防溢出 |
| `E_CTX_NO_TARGET` / `CTX_ACTION` / `CTX_ITEM_ID` | 常量 | 供 TASK-007 分派与日志 |

`MenuItem = { id, i18nKey, enabled, action, p2, vars }`（纯数据，无渲染）。

### 关键实现决策

1. **`data-id` → recordId 类型还原**：`render.js:249-252` 写入的是 `String(record.id)`，
   而 store 的 `record.id` 为递增 **number**（design §6.1 `selectedIds:Set<number>`）。
   故 `resolveRowId` 对**规范十进制整数串**（`String(Number(raw)) === raw`）还原为 number，
   保证下游 `selection.selectId(id)` / `multiselection.has(id)` 的严格相等命中；
   非常规 id（`req-abc`）与非法写法（`007`）原样返回字符串，round-trip 安全。
2. **列表体包含性**：镜像 `panel.js:633` 既有写法，`listBodyEl.contains(row)` 存在时才校验；
   无 `contains` 的 DOM 桩降级为不阻塞（Node 单测可直测）。
3. **主项禁用态**：主项常驻，`enabled = hasSelection`；无选中时禁用而非隐藏。
4. **P2 占位策略**：两项始终存在、`p2=true`；`enabled = hasSelection && canCopyRequestOnly`。
   `canCopyRequestOnly` 作为 P2 执行路径（R-A：P-A/P-B/P-C）的**统一接线开关**，默认 false 全禁用，
   绝不误触发尚未实现的能力。执行路径裁决归 **TASK-007**。
5. **越界早退不抛**：null/畸形事件、`closest` 抛错、`contains` 抛错均捕获返回 null/降级；
   `clampPosition` 非有限输入按 0 处理。零副作用、零入参修改。

### 约束符合

- 零 DOM 依赖 / 零浏览器 API / 零第三方依赖 → Node 直接 import 单测 ✅
- 无 `innerHTML`、无 HTML 字符串拼接；文案只给 `contextmenu.*` i18n 键（实际键 TASK-010 补齐）✅
- 未引用 `chrome.contextMenus`，未新增任何权限 ✅

## 测试结果

```
node --test tests/contextmenu.test.mjs
ℹ tests 39
ℹ pass 39
ℹ fail 0
```

## 自验原始输出（门禁）

```text
$ node --test tests/contextmenu.test.mjs
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 124.4962
[exit 0]

$ rg -n "chrome\.contextMenus" extension/src/contextmenu.js
0 命中 (PASS)              # rg 无输出、exit 1

$ node scripts/check-syntax.mjs
[PASS] .../extension/src/contextmenu.js
[check-syntax] 14/14 files passed      # [exit 0]

$ node --test "tests/**/*.test.mjs"
ℹ tests 235
ℹ pass 235
ℹ fail 0                               # [exit 0]（基线 196 + 本任务 39）
```

附加（非任务门禁，回归确认）：

```text
$ node scripts/check-zero-network.mjs   → 17/17 PASS
$ node scripts/check-panel-shell.mjs    → 34/34 PASS
$ rg "innerHTML|document\.|window\.|chrome\." extension/src/contextmenu.js tests/contextmenu.test.mjs → 0 命中
```

## 结论

- TASK-006 交付物（`contextmenu.js` + `contextmenu.test.mjs`）完成，39/39 PASS；
- lint/build（check-syntax 14/14）PASS；全量回归 235/235 PASS，0 失败；
- 硬约束（禁 `chrome.contextMenus` / 禁 `innerHTML` / 纯逻辑 Node 直测）全部满足。

## 遗留项

1. **P2 执行路径裁决（R-A）**：本 TASK 只交付 P2 菜单项占位（默认禁用），
   P-A（按段标记裁剪）/ P-B（专用入口）/ P-C（不实现）由 **TASK-007** 裁决并接线
   `canCopyRequestOnly` 开关。
2. **i18n 键待补**：`contextmenu.copyRequestResponse` / `contextmenu.copySelected` /
   `contextmenu.copyRequestOnly` / `contextmenu.copyResponseOnly` 由 **TASK-010** 写入 `i18n.js`
   （zh/en 键集须相等）；本模块只输出键名。
3. **全仓文本扫描的既有假阳性**：`rg "chrome\.contextMenus" extension/` 会在
   `extension/styles/panel.css:396` 命中一处**既有注释**（TASK-002 产物，原文意为
   "not chrome.contextMenus"）。该文件不属 TASK-006 范围，本任务未改动。
   建议全仓门禁（MFT-001）以 `-g '*.js' -g '*.html'` 限定代码文件，或由 TASK-002 侧改述该注释。
   本任务门禁（`extension/src/contextmenu.js` == 0）已 PASS。

## tech_debt

```yaml
tech_debt:
  - location: "extension/src/contextmenu.js (createMenuModel)"
    issue: "P2 两项共用单一 canCopyRequestOnly 开关，无独立 response-only 开关"
    risk: "若 TASK-007 仅接线 request-only，response-only 无法独立启用"
    priority: "P3"
    suggestion: "TASK-007 若需独立控制，可扩展为 canCopyRequestOnly/canCopyResponseOnly 双开关（向后兼容追加）"
```

## risks

```yaml
risks:
  - description: "全仓文本门禁把 panel.css 既有注释中的菜单 API 名当作权限违规假阳性"
    probability: "中"
    impact: "低"
    mitigation: "门禁限定 .js/.html；或改述该注释"
    category: "流程"
```
