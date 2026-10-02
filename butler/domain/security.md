# 安全领域知识

> 主写: butler-sec-auditor (per-project, agents_butler/{project}/learned.md)
> 也读: butler-captain, butler-tester, butler-rf-fixer, butler-cr-reviewer
> 最后更新: 2026-07-14
> 通用 pattern 来源: 多项目审计 pattern 累积 (3 次命中升级)

---

## 安全人才培养体系 (2026-07-14 新增)

### 架构
- 安全员: `agents_butler/{project}/sec-auditor-agent.md` (per-project)
- 知识: `agents_butler/{project}/learned.md` (动态增长)
- 技能: 安全员自己学 (skill-discovery),不预写
- 约束: OSV API / web researcher / LLM 推理

### 工作流 (Step 0-5)
- Step 0: 加载项目上下文 + 声明块
- Step 1-2: 情报收集 (OSV API + web researcher)
- Step 3: 全栈扫描 (代码/配置/架构/依赖)
- Step 4: LLM 推理 (STRIDE + 可利用性)
- Step 5: 报告 + 覆盖分析 + 知识写回

### Level 体系
- novice → practitioner (rounds>=3, score>=3.0) → specialist (rounds>=8, score>=4.0) → master (rounds>=15, score>=4.5)
- 降级: 连续 3 次 score < 2.0 → level down

### 知识沉淀
- 每次审计后写回 agents_butler/{project}/learned.md
- 通用 pattern (3 次+ 命中) → 升级为本文件
- 跨项目: 新项目初始化时读取本文件的通用 pattern

---

## 约定 (旧,保留)

## 约定

- 绕过模式检测 (DA01-DA06) 为硬编码正则，不接受 LLM 参数注入
- diff-analyzer 工具为确定性执行层，不依赖 LLM prompt
- 所有 agent 的 bash 命令必须有 timeout 参数
- 检测模式需覆盖变体 (@ts-expect-error: 带冒号注释、.skip/.only 测试变体)
- 多行模式感知：逐行正则必须验证是否覆盖多行跨行写法

## 发现

- (2026-07-07) [extracted from project/KNOWLEDGE.md] S2: 无防绕过硬边界 — 捷径检测全部在 LLM prompt 中，无确定性执行层
- (2026-07-07) [extracted from project/KNOWLEDGE.md] 绕过路径: A-吞异常 (try-catch), B-promise≠reality, C-半途而废, D-选择性实现
- (2026-07-08) [extracted from project/KNOWLEDGE.md] Tools 层代码规范: 统一 ESM 导入、execSync 必须设 timeout、确定性检测规则硬编码

---

## RISK 登记表（Raw Copy · Chrome/Edge DevTools MV3 扩展）

> 维护: butler-sec-auditor（每轮审计/巡检后更新）
> 状态机: [open] → [in-progress] → [fixed] → [verified]
> 最近更新: 2026-10-02（审计 run: TASK-019 · slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增）

| RISK | 面 | 描述(简) | 概率 | 影响 | 状态 |
|------|----|---------|:----:|:----:|:----:|
| RISK-MEM-01 | S1/内存 | 捕获期无字节预算的内存放大（本地 DoS） | 低 | 中 | **fixed** |
| RISK-EXFIL-01 | S1/剪贴板 | 凭证原文入剪贴板，无复制前敏感探测 | 中 | 中 | **open**（本轮放大） |
| RISK-MEM-02 | S1/剪贴板 | 多选批量复制无总量门禁 | 中 | 中 | open |
| RISK-DOS-01 | S1/DOM 渲染 | 明细抽屉无体积门禁（复制路径有 confirm） | 低 | 中 | open |
| RISK-INTEG-01 | S1/输出完整性 | P2 分段裁剪边界可被不可信正文伪造 | 低 | 中 | open |
| RISK-REL-01 | S5/发行 | 发行包与源码不同代，无门禁捕获 | 高 | 中 | **fixed** |
| RISK-OPEN-01 | S1/前端 | window.open 未带 noopener | 低 | 低 | open |
| RISK-DOC-01 | S5/文档 | privacy.html「单条」与多选批量行为不一致 | 中 | 低 | open |
| RISK-GATE-01 | S4/门禁 | 门禁覆盖缺口（manifest 键/keyword 扫描/产物新鲜度） | 低 | 中 | open |
| RISK-LLM-INJ-01 | AI 横切 | 复制文本可对下游 LLM 形成间接提示注入 | 低 | 中 | open |

### changelog

```
2026-10-02 RISK-MEM-01   open   -> fixed   store.maxBytes=64MB + estimateRecordBytes + enforceBudget（字节优先淘汰，evict{reason:'maxBytes'}）
                                            + capture 有界 enrich（MAX_ENRICH_QUEUE=200 / MAX_CONCURRENT_ENRICH=4 / fetch 超时 10s）
                                            证据: 独立探针 A（200×1MB -> size()=63, bytesInUse=63.01MB ≤ 64MB）+ tests/store.test.mjs 字节预算用例
2026-10-02 RISK-EXFIL-01 open   -> open    未缓解；**爆炸半径 1 -> N**（多选批量复制单次点击 N 条凭证入同一剪贴板）
                                            证据: 独立探针 C（60×50KB -> 2.95MB，含 60 份 Cookie 凭据，无 confirm）
2026-10-02 RISK-MEM-02   new    -> open    批量复制无总量门禁（每记录 10MB 阈值对批总量无效）
2026-10-02 RISK-DOS-01   new    -> open    openDetailRecord 无体积门禁，直接物化完整正文至 <pre>
2026-10-02 RISK-INTEG-01 new    -> open    extractSectionText 以全文首个固定标记行定位，正文可伪造标记
                                            证据: 独立探针 B（请求体含 "===== RESPONSE =====" -> 「仅响应」混入请求体片段、「仅请求」被截断）
2026-10-02 RISK-REL-01   new    -> fixed   dist/raw-copy-1.1.0.zip(13:11) 落后于 panel.js(13:38)；test-results.md 声称的 sha256 失效
                                            修复: 审计内复跑 package.mjs 重建（24c2089a… -> 6f2514a9…），CRC/白名单/体积/依赖四项读回通过
                                            遗留: 门禁缺口（建议 package.mjs 增加 max(extension/** mtime) <= zip mtime 断言）
2026-10-02 RISK-DOC-01   new    -> open    privacy.html:127-128「只做一件事：…单条网络请求」与多选批量不一致（商店披露准确性）
2026-10-02 RISK-GATE-01  new    -> open    check-manifest 未断言 optional_permissions/externally_connectable/web_accessible_resources/update_url/CSP；
                                            check-zero-network 为可混淆绕过的关键字扫描；package.mjs 不校验产物新鲜度
```

### 本轮新 pattern（跨项目通用）

- (2026-10-02) [审计] **静态等价性测试 ≠ 对抗性内容测试**：复制/裁剪类功能即使通过了「路径 A 产物 ≡ 路径 B 产物」的等价性测试，仍可能被不可信数据劫持**输出结构**。审计必查项：把结构标记字符串（分隔线/序号/段标签）塞进不可信字段（body/header/URL），观察解析是否被劫持。
- (2026-10-02) [审计] **门禁自洽 ≠ 产物同代**：打包门禁通常只校验"包内自洽"（CRC/白名单/体积/依赖），无法发现"源码在打包后被改动"。凡有发行物的项目，S5 审计必须**独立复跑打包**并比对 sha256 与上次记录值，差异即发现。
- (2026-10-02) [审计] **既有风险被增强放大要单独登记**：新功能未引入新漏洞类，但可能把既有风险的爆炸半径从 1 放大到 N（如单条复制 → 批量复制）。结论应区分「新增风险」与「既有风险放大」，并把放大证据写入状态机 change 字段。
- (2026-10-02) [审计] **权限门禁要枚举键集而非只查黑名单**：只断言"无 host_permissions/tabs/…"会漏掉 `optional_host_permissions` / `externally_connectable` / `web_accessible_resources` / `update_url` 等同级扩权键；审计时应对 manifest 顶层键做**全集枚举**并与最小集比对。
