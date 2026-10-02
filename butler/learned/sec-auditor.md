# sec-auditor 学习记录

> auto-maintained by butler system
> 此文件由任务完成后自动追加，不可手动删除

---

## 自动采集条目
> 以下由 plugins/butler-async.ts E5.3 自动追加

---

## Round — 2026-10-02（TASK-019 · 增强里程碑独立安全审计）

- **审计范围**: changed ∪ affected（S1 全量人读 `panel.html`/`panel.js`(1927 行)/`panel.css` + `src/{contextmenu,detail,multiselection,bulkformatter}.js`；S2 `manifest.json`；S4 `scripts/*.mjs` + `package.json`；S5 `dist/raw-copy-1.1.0.zip`；4 项新增攻击面专审）
- **结论**: `verdict=WARN`；**无高危/可利用漏洞**；AC-012 / AC-013 / AC-016 + REQ-018/019/020/021 **全 PASS**
- **新发现**:
  - [中] 多选批量复制**无总量门禁**（每记录 10MB 阈值对批总量无效）→ `RISK-MEM-02`
  - [中] 明细抽屉**无体积门禁**（复制路径有 confirm，明细路径没有）→ `RISK-DOS-01`
  - [中] P2 分段裁剪**边界可被不可信正文伪造**（探针 B 复现跨段混淆）→ `RISK-INTEG-01`
  - [中] **发行包与源码不同代**且无门禁捕获（`test-results.md` 声称的 sha256 失效）→ `RISK-REL-01`（审计内已重建修复）
  - [低] `privacy.html`「单条」声明与多选批量行为不一致（商店披露准确性）→ `RISK-DOC-01`
  - [信息] 门禁覆盖缺口（manifest 键未枚举 / keyword 扫描可绕过 / 产物新鲜度未校验）→ `RISK-GATE-01`
- **已收敛**: `RISK-MEM-01` open → **fixed**（64MB 字节预算 + 字节优先淘汰 + 有界 enrich 队列；独立探针 A 验证）
- **未缓解**: `RISK-EXFIL-01` 保持 open，且被多选**放大**（爆炸半径 1→N，批量无确认）
- **新 pattern**:
  - `[pattern: 静态等价性测试≠对抗性内容测试, date: 2026-10-02]` 等价性/保真测试只证"路径 A ≡ 路径 B"，不证"不可信数据不能劫持输出**结构**"。复制/裁剪类功能审计必补：把结构标记塞进不可信字段，看解析是否被劫持。
  - `[pattern: 门禁自洽≠产物同代, date: 2026-10-02]` 打包门禁只校验"包内自洽"，不校验"包=当前源码"。S5 审计必须独立复跑打包 + 比对 sha256 与历史记录，差异即发现。
  - `[pattern: 增强放大既有风险要单独登记, date: 2026-10-02]` 区分「新增风险」与「既有风险放大」，放大证据写入状态机 change 字段。
  - `[pattern: 权限门禁要枚举键集, date: 2026-10-02]` 黑名单式断言会漏掉同级扩权键（`optional_host_permissions`/`externally_connectable`/`web_accessible_resources`/`update_url`）；应枚举 manifest 顶层键并与最小集比对。
- **误报记录**: 无
- **环境备注**: 仓库非 git 仓库 → 冻结/变更判定改用「SHA256 + mtime + 文件清单」三证据（与 TASK-012 口径一致）。
