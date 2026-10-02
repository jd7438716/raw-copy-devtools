# Spec — 缺陷：Raw Copy `[Response Body]` 显示「（响应体不可用）」

> slug: `缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢`
> 人读视图，与 `spec.json` 内容一致（机器真源 = `spec.json`）
> 生成: 2026-10-02 by butler-requirement-analyst（fix 管线 · 规格脊柱覆盖重写）

## Source（上游出处）

- `butler/spec/缺陷-raw-copy-扩展复制出的内容里-response-body-显示为-响应体不可用-丢/01-root-cause.md`
- `design.md`（ADR-003 §243/§319/§337）
- `feasibility.md`（风险 R1 :77）
- `stories-written.md`（AC-FMT-002-E1 :156-158 / :497-500）
- `sec-audit.md`（R-01 大响应内存放大）

## Items

### 需求（REQ）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| REQ-001 | api | 01-root-cause §3 H1/§9 RC-1 | 捕获层必须在 `harEntry.response.content.text` 缺失时调用异步 `harEntry.getContent(cb/Promise)` 获取完整响应体正文 |
| REQ-002 | api | 01-root-cause §9 RC-1/§10.2 | getContent 为异步 API；`normalize` 保持纯同步函数，异步获取另设 enrich 步骤，不得阻塞捕获热路径 |
| REQ-003 | data | 01-root-cause §8 B维/§10.1 | 获取到的正文必须回填到 store 中同一条记录（引用一致），使复制读到最新值 |
| REQ-004 | data | 01-root-cause §8 B维 | getContent 返回的 encoding 需合并进 responseContent，保证 base64 分支判定正确 |
| REQ-005 | ui | 01-root-cause §8 A/B维/§10.2 | 回填后触发一次 UI 刷新；不得打乱 1000 条环形缓冲顺序与淘汰语义 |
| REQ-006 | ui | 01-root-cause §10.2 | 处理「异步完成前用户点击复制」竞态——不得输出占位，需等待真实正文或明确提示 |
| REQ-007 | data | 01-root-cause §10.1 | 占位「（响应体不可用）」仅保留给客观无法获取/二进制省略的合法场景，文本类正文不再产出占位 |
| REQ-008 | ops | 01-root-cause §9 RC-2/§10.2 | 与 ADR-003 内存约束共存：不长期驻留 harEntry/闭包引用，正文不得无界驻留 |
| REQ-009 | ops | 01-root-cause §7 RC-3b/§8/§10.2 | 满足 sec-audit R-01 大响应内存放大风险约束，getContent 全量取正文须结合字节预算/阈值策略 |
| REQ-010 | data | 01-root-cause §9 RC-2/§10.4 | 修正需求/设计边界定义：getContent 升为常规路径、取正文列为必达（design.md §243/§319/§337、feasibility.md:77、stories-written.md:156-158/497-500） |
| REQ-011 | verify | 01-root-cause §9 RC-3/§10.3 | 修正测试错误断言：tests/capture.test.mjs:125-132 不得再断言 `content.text` 缺失时 `text===null` |
| REQ-012 | verify | 01-root-cause §10.3 | 新增测试用例：(a) 缺失 content.text+提供 getContent；(b) getContent 异步/回调双形态；(c) base64+文本 MIME；(d) 字符级保真；(e) 401 错误响应体 |
| REQ-013 | verify | 01-root-cause §10.1/CE-4 | 字符级保真：401 等错误响应体完整复制，不美化 JSON、不截断、字符级一致 |
| REQ-014 | api | 01-root-cause §8 D维 | 兼容 Chrome 151+ `getContent()` Promise 形式与回调形式（双形态兼容） |

### 交付物（DEL）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| DEL-001 | api | 01-root-cause §3 H1/§10.2 | `extension/src/capture.js` — 新增 getContent 异步 enrich（保持 normalize 纯同步，installCapture 接线） |
| DEL-002 | ui | 01-root-cause §8 A维/§10.2 | `extension/panel.js` — 接线 enrich、回填后刷新、复制竞态处理 |
| DEL-003 | data | 01-root-cause §8 B维 | `extension/src/store.js` — 同一条记录回填/订阅刷新支持（如需要，保持环形语义） |
| DEL-004 | data | 01-root-cause §8 B维 | `extension/src/content.js` — 分类/编码合并适配（base64 + 文本 MIME 解码一致性） |
| DEL-005 | verify | 01-root-cause §9 RC-3/§10.3 | `tests/capture.test.mjs` — 修正错误断言 + 新增缺失 content.text/getContent 用例 |
| DEL-006 | verify | 01-root-cause §10.3 | `tests/` 新增 getContent 异步 enrich 用例（如 `tests/enrich.test.mjs`，覆盖双形态/竞态/编码） |
| DEL-007 | ops | 01-root-cause §10.4 | `design.md` 修订 — ADR-003 :243（同步→异步语义）、:319（备选→常规路径）、:337（降级矩阵） |
| DEL-008 | ops | 01-root-cause §10.4 | `feasibility.md` 修订 — 风险 R1 :77 缓解措施补入 getContent 兜底 |
| DEL-009 | ops | 01-root-cause §10.4 | `stories-written.md` 修订 — :156-158 / :497-500 验收期望改为「必须取到正文」 |

### 验收标准（AC）

| ID | 类型 | 出处 | 标题 |
|----|------|------|------|
| AC-001 | verify | 01-root-cause §5 CE-1 | 对「无 content.text 但提供 getContent 返回正文」的 entry，捕获流程调用 getContent 并取到正文；复制输出 `[Response Body]` 为真实正文而非「（响应体不可用）」 |
| AC-002 | verify | 01-root-cause §5 CE-4/§0.2 | 真实 Chrome/Edge 对 `https://auth.autional.cn` 401 登录请求复制，`[Response Body]` 与网络面板正文逐字符相等，不再出现占位 |
| AC-003 | verify | 01-root-cause §10.1 | 占位仅出现在客观不可获取/二进制省略场景；文本类正文不再产出占位 |
| AC-004 | verify | 01-root-cause §8 D维/§10.2 | normalize 仍为纯同步函数（单测直接调用无异步副作用），enrich 为独立步骤 |
| AC-005 | verify | 01-root-cause §8 B维 | getContent 回填后复制读取到最新正文（同一条 store 记录，引用一致） |
| AC-006 | verify | 01-root-cause §8 B维/§10.2 | getContent 返回 encoding 被合并；base64 + 文本 MIME 正确 UTF-8 解码 |
| AC-007 | verify | 01-root-cause §10.2 | 异步完成前点击复制不产生占位（等待真实正文或明确提示，不误报不可用） |
| AC-008 | verify | 01-root-cause §8 B维 | 回填触发 UI 刷新，1000 条环形淘汰语义与顺序不变 |
| AC-009 | verify | 01-root-cause §7 RC-3b/§10.2 | getContent 全量取正文未导致内存无界增长（符合 sec-audit R-01/字节预算） |
| AC-010 | verify | 01-root-cause §10.3 | tests/capture.test.mjs 不再断言 `text===null`；新增缺失路径/异步双形态/字符级保真/401 用例全部通过 |
| AC-011 | verify | 01-root-cause §5 CE-0/§10.3 | 现有测试（除被修正的错误断言外）保持全绿，无回归 |
| AC-012 | verify | 01-root-cause §10.4 | 文档边界修订（design.md/feasibility.md/stories-written.md）与实现一致，getContent 为常规路径 |
