---
slug: 缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢
date: 2026-10-02
phase: ④ 修复·执行（方案 A）
executor: butler-rf-fixer
outcome: success
scope: TASK-001..007（代码 + 单测）；TASK-008（文档）/ TASK-009（真机 E2E）不在本角色范围
---

# 04 · 执行摘要 — Raw Copy `[Response Body]`「（响应体不可用）」

> 输入：`01-root-cause.md`（RC-1 主根因 / RC-2 设计 / RC-3 测试 / RC-3b 内存）、`02-solution-design.md`（方案 A，已批准）、`spec.json`、TASK-001..009。
> 结论：**方案 A 实现完成并通过 affected 范围自测与全量回归**。核心根因 RC-1（未调用 `harEntry.getContent()`）已修复：捕获后独立异步 enrich → 回填 store 同一条记录 → 复制读到真实正文（含 401/错误响应）。
> 未在本节点执行：TASK-008（`design.md`/`feasibility.md`/`stories-written.md` 边界修订，角色 butler-doc-writer）、TASK-009（真机 401 字符级 E2E，角色 butler-e2e-verifier）。

---

## 0. 根因 → 修复映射（方案 A 全覆盖）

| 根因 | 性质 | 修复落点 | 状态 |
|------|------|----------|:----:|
| **RC-1** 捕获层未调用 `harEntry.getContent()`，仅同步读 `response.content.text` | 技术（主根因） | `capture.js` 新增异步 enrich（`maybeEnrich`/`fetchContent`/`applyContent`） | ✅ |
| **RC-2** 把「无 `content.text`」合法化为占位 + 「同步读取」措辞错误 | 设计/文档 | 实现层已把 getContent 作为常规路径；文档修订（TASK-008）待 doc-writer | ⚠️ 代码侧完成，文档侧待办 |
| **RC-3** 测试恒带 `content.text` 且断言缺失为 `null` | 测试 | 删除 `text===null` 终态断言；新增缺失路径/双形态/编码/保真/401 用例 | ✅ |
| **RC-3b** 全量取正文放大内存（sec-audit R-01） | 关联约束 | `store` 字节预算 `maxBytes`（默认 64MB）+ 淘汰最旧 + 有界并发队列 | ✅ |

---

## 1. TASK 执行结果

| TASK | 标题 | 角色 | 结果 | 主要产出 |
|:----:|------|------|:----:|----------|
| TASK-001 | store.js 增量回填 / pending 注册表 / 字节预算淘汰 | butler-rf-fixer | ✅ done | `update` / `bytesInUse` / `markPending·resolvePending·rejectPending·awaitPending·isPending` / `maxBytes` 淘汰 |
| TASK-002 | capture.js 异步 enrich（getContent 双形态） | butler-rf-fixer | ✅ done | `applyContent`（导出）、`maybeEnrich`、`fetchContent`（回调 + Promise）、并发上限/有界队列 |
| TASK-003 | content.js 分类/编码合并一致性适配 | butler-rf-fixer | ✅ done（核验，无需改码） | `classifyBody` 已正确消费合并后的 `encoding` |
| TASK-004 | panel.js 接线 + i18n 文案 | butler-rf-fixer | ✅ done | `onUpdate` 刷新、`update`/`evict` 订阅、复制前 `awaitPending` 竞态、`content.fetching`/`copy.fetchingTimeout` |
| TASK-005 | tests/capture.test.mjs 修正错误断言 + 缺失路径用例 | butler-rf-fixer | ✅ done | 移除 `text===null` 断言；installCapture + getContent 桩用例 |
| TASK-006 | tests/enrich.test.mjs 新增 | butler-rf-fixer | ✅ done | 双形态 / base64 / 字符级保真 / 401 / 竞态 / 纯同步 / 引用一致 / 淘汰丢弃 |
| TASK-007 | tests/store.test.mjs 新增 | butler-rf-fixer | ✅ done | update 语义 / 字节预算 / pending 三路径与淘汰·clear 结算 |
| TASK-008 | 文档边界修订（design/feasibility/stories） | butler-doc-writer | ⏭️ 未执行（非本角色） | 待下游 doc-writer 节点 |
| TASK-009 | 真机 401 E2E 字符级验证 | butler-e2e-verifier | ⏭️ 未执行（非本角色） | 待下游 e2e 节点 |

---

## 2. 文件变更清单

### 生产代码
| 文件 | 变更 | 说明 |
|------|------|------|
| `extension/src/store.js` | 修改 | +`DEFAULT_MAX_BYTES`(64MB)/`DEFAULT_PENDING_TIMEOUT_MS`(3000)；+`update`/`bytesInUse`/pending 五 API；`add/update` 后字节预算兜底淘汰（`{type:'evict',reason:'maxBytes'}`）；`clear`/环形淘汰结算 pending；`estimateRecordBytes`（UTF-8 字节口径） |
| `extension/src/capture.js` | 修改 | +`applyContent`（导出）/`fetchContent`（回调 `(content,encoding)` + Promise `{content|text,encoding}` 双形态、10s 兜底超时）；`installCapture` 新增 `onUpdate`/`maxConcurrent`/`maxQueue`，`normalize` **零改动**；`maybeEnrich` 触发条件 `text 为空 && getContent 为函数`；回填前校验 `store.get(id)===record`；无 `harEntry` 长期引用 |
| `extension/panel.js` | 修改 | `installCapture({onAdd,onUpdate})`；`subscribe` 处理 `update`(刷新)/`evict`(清选中)；`resolveResponseBodyText` pending → `content.fetching`；`onCopyClick` pending → `awaitPending(id,3000)`，超时提示不产占位 |
| `extension/src/i18n.js` | 修改 | +`content.fetching`、`copy.fetchingTimeout`（zh/en 键集对齐） |
| `extension/src/content.js` | 核验（未改） | base64 + 文本 MIME 判定与非法 base64 回退已满足 REQ-004/AC-006 |

### 测试
| 文件 | 变更 | 用例数 |
|------|------|:------:|
| `tests/store.test.mjs` | 修改（+8） | 9 → 17 |
| `tests/capture.test.mjs` | 修改（删错误断言，+3） | 16 → 19 |
| `tests/enrich.test.mjs` | **新增** | 0 → 11 |
| `tests/i18n.test.mjs` | 修改（required keys +2） | 5 |

**全量用例：123 → 145（+22）。**

---

## 3. 关键实现决策（与方案 A 硬约束对照）

| 约束 | 实现 |
|------|------|
| C-1 `normalize` 纯同步 | `normalize` 函数体未改；enrich 为独立异步步骤（单测断言返回值无 `then`） |
| C-2 不阻塞热路径 | `store.add → onAdd` 同步返回，`maybeEnrich` 仅入队不 await |
| C-3 不驻留 entry | `harEntry` 仅在 enrich 任务闭包内临时持有，完成即释放；无模块级长生命周期结构 |
| C-4 同一条记录回填 | `store.update(id, patch)` 用 `Object.assign` 原地合并；回填前 `store.get(id)===record` 校验 |
| C-5 环形语义不变 | `add` 的 `evicted` 事件与 1000 条环形顺序保持；预算淘汰另发 `evict` 事件 |
| C-6/C-9 字节预算/内存有界 | `maxBytes` 默认 64MB，`add`/`update` 增量入账后淘汰最旧；并发上限 4、队列上限 200、单次 fetch 10s 超时 |
| C-7 占位仅合法场景 | pending → 「正在获取」；`unavailable` 仅 `null` 正文（客观不可获取） |
| C-8 字符级保真 | enrich 逐字符原样写入，不 trim/转义；测试逐 UTF-16 码元断言 |
| C-10 双形态 | `typeof getContent==='function'` 守卫 + thenable 探测 + try/catch 双解析 |

---

## 4. 验证命令与结果（butler-rf-fixer 本地复跑）

| 命令 | 范围 | 结果 |
|------|------|------|
| `node scripts/check-syntax.mjs` | build/lint（11 个 `extension/**/*.js`） | **PASS 11/11** |
| `node --test tests/{store,capture,enrich,i18n,content}.test.mjs` | affected 范围 | **PASS 71/71** |
| `npm test`（`node --test "tests/**/*.test.mjs"`） | 全量回归 | **PASS 145/145，fail 0** |
| `node scripts/check-manifest.mjs` | AC-009 权限门禁 | PASS 17/17 |
| `node scripts/check-panel-shell.mjs` | 面板外壳/DOM 契约 | PASS 34/34 |
| `node scripts/check-zero-network.mjs` | 零网络/零持久化/无遥测 | PASS 17/17 |

---

## 5. spec 覆盖状态（代码侧）

| 维度 | 状态 | 说明 |
|------|------|------|
| REQ-001..009 | ✅ 代码实现 | getContent enrich / 纯同步 / 同引用回填 / encoding 合并 / UI 刷新 / 复制竞态 / 占位边界 / 有界驻留 / 字节预算 |
| REQ-010 | ⏭️ 文档（TASK-008） | 代码侧已把 getContent 作为常规路径 |
| REQ-011..014 | ✅ 测试实现 | 错误断言修正 + 新用例（双形态/编码/保真/401） |
| DEL-001..006 | ✅ 实现 | capture/store/panel/i18n + 三类测试 |
| DEL-007..009 | ⏭️ 文档（TASK-008） | 未在本角色范围 |
| AC-001/003..011 | ✅ 单测覆盖 | 见 §4 |
| AC-002（真机 401 逐字符） | ⏭️ TASK-009 | 单测侧已用同形 401 正文验证（enrich.test.mjs (e)） |
| AC-012 | ⏭️ 文档一致性（TASK-008/009） | 代码侧完成，文档侧待修订 |

---

## 6. 遗留风险与后续

1. **文档未同步（RC-2 尚未闭环）**：`design.md:243/319/337`、`feasibility.md:77`、`stories-written.md:156-158/497-500` 仍描述缺陷态（「缺失→占位」「getContent 备选」）。→ TASK-008（butler-doc-writer）。在此之前 AC-012 不成立、RC-2 未闭环，存在复发风险。
2. **真机验证未做**：AC-002 的最终裁决面在真实 Chrome/Edge 的 401 请求（CE-4）。→ TASK-009（butler-e2e-verifier），单测已用同形态正文作逼近验证。
3. **`getContent` 永不回调**：3s `awaitPending` 超时保证复制路径明确提示；10s fetch 兜底释放并发槽。pending 条目在记录被环形淘汰/`clear` 时结算，驻留有界（≤1000 条）。
4. **单条正文自身超 `maxBytes`**：按「淘汰最旧」会淘汰该刚入账记录（`size` 归零）。这是「有界优先」的取舍，已在 `store.test.mjs` 固化；如需「单条豁免」，应作为后续决策。
5. **`data-audit.md` 的两处 WARN（非阻断）**：`02-solution-design.md:43` 跨 slug `AC-013` 引用未限定；`:376` 机读字段 `USER_DECISION_REQUIRED=true` 陈旧。建议编排者回填，本节点未改 spec 文档。
6. **i18n `content.fetching` 的显示**：`onCopyClick` 在 pending 时先 await（成功即得真实正文），「获取中」主要服务于面板详情/其它读取路径；真机表现需 TASK-009 眼验。

---

## 7. 反偷懒自审

- [x] 未只加「一行 `getContent`」：同步落地 RC-1（enrich）+ RC-3（测试修正）+ RC-3b（字节预算/并发）。
- [x] 未改动 `normalize`（保住 123 基线中的纯函数契约）。
- [x] 未把缺陷行为固化为期望：删除 `text===null` 终态断言，改为「真实正文」断言。
- [x] 未过度重构：只改与缺陷链路直接相关的 4 个生产文件 + 4 个测试文件。
- [x] 回退可行：`store.update`/pending/预算是增量 API，可与 enrich 触发一并关闭回退到现状。

*本摘要由 butler-rf-fixer 在 fix 执行节点产出；未提交 git（不 commit/push）。*
