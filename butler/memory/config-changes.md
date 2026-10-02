# 配置变更记录

> butler-config-changer 的配置变更台账。每条含：日期 / TASK / 文件 / 精确改动 / 门禁证据 / 遗留。
> 只记录**配置类**变更（manifest / scripts 门禁 / JSON / ENV / TOML）。

---

## 记录

### 2026-10-02 — TASK-011：manifest 版本 bump 1.0.0 → 1.1.0（增强里程碑）

- **slug**: `在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增`
- **覆盖**: REQ-018..021 / DEL-007 / AC-012 / AC-013 / AC-016 / US-004
- **设计依据**: design.md §8.3（安全门禁清单）、§1.1 Manifest（L43）、C-6（版本号单一真源）

#### 改动文件（2）

| 文件 | 行 | 改动 | 说明 |
|------|----|------|------|
| `extension/manifest.json` | 4 | `"version": "1.0.0"` → `"1.1.0"` | **唯一**字节变化；`diff` 仅此一行（4c4）；normalize 后与基线逐字节一致 |
| `scripts/check-manifest.mjs` | 12, 99 | 断言/注释 `1.0.0` → `1.1.0` | 门禁脚本同步（**必要**：原脚本硬编码 1.0.0，bump 后必然 FAIL，与「check-manifest → PASS」要求冲突） |

> ⚠️ **范围说明**：TASK-011 设计「涉及文件」仅列 `extension/manifest.json`。但 `scripts/check-manifest.mjs:99`
> 硬编码 `version === "1.0.0"`，与任务要求的「`check-manifest.mjs` → PASS」+「bump 至 1.1.0」互斥。
> 经权衡，对门禁脚本做**最小同步**（2 行）以保 `check-manifest` PASS，安全断言（permissions/MV3/devtools_page/icons）全部未动。
> 此偏离已在交付报告显著标注，供 Captain / 评审复核。

#### 未改动（硬约束正向验证）

- `permissions` 仍严格 `["clipboardWrite"]`（无 host_permissions/optional_permissions/webRequest/`<all_urls>`/declarativeNetRequest）
- `manifest_version: 3` 不变；`devtools_page: "devtools.html"` 不变；`name`/`description`/`icons` 不变

#### 门禁结果（全 PASS）

| 门禁 | 结果 | 关键输出 |
|------|:----:|----------|
| `node scripts/check-manifest.mjs` | PASS | 17/17；`version === "1.1.0"`；`permissions === ["clipboardWrite"]` |
| `node scripts/check-syntax.mjs` | PASS | 15/15 files passed |
| `node scripts/check-zero-network.mjs` | PASS | 17/17；零 fetch/XHR/WebSocket/sendBeacon/storage |
| `node scripts/check-panel-shell.mjs` | PASS | 34/34 |
| `node scripts/package.mjs` | PASS | 25 条目；解压 198639 B (193.98 KB) < 200 KB；third-party deps = 0；权限断言 PASS |

#### 反向探针（门禁有效性证明）

- 注入 `extension/__probe_zero_network.js`（含 `fetch(` / `localStorage` / `XMLHttpRequest`）→ `check-zero-network.mjs` **exit 1**，命中 3 项
- 删除探针后复跑 → **exit 0**（17/17），证明门禁真实生效且探针已清理

#### 假阳性记录（非本任务范围）

- **`extension/styles/panel.css:396`** 含字符串 `chrome.contextMenus`，但位于**注释**中，语义为
  `zero permissions, so this is plain DOM, not chrome.contextMenus (ADR-013).`——即**声明未使用**。
- 判定：**假阳性**（注释，非代码引用）。
- 证据：`rg "chrome\.contextMenus" extension/ -g '*.js' -g '*.html'` → **0 命中**（exit 1）。
- 处置：TASK-011 明令**不改 CSS**；该注释属 TASK-002 遗留，留待后续文档/注释清理。

#### 遗留项

1. **发行产物陈旧**：`dist/raw-copy-1.0.0.zip` 仍存在（含旧版）。本次 build 产出 `dist/raw-copy-1.1.0.zip`；
   旧 zip 是否保留/清理由发行 TASK（TASK-014 文档侧或 release 步骤）决定。**未擅自删除**。
2. **体积余量偏紧**：解压后 193.98 KB / 200 KB，余量约 **6.0 KB**。后续再增文件需复测体积门禁。
3. `check-manifest.mjs` 版本断言仍为**硬编码**（1.1.0）。未来再次 bump 需同步该行（可考虑改为 semver 通用校验，属门禁演进，非本任务范围）。

#### 关联

- 加载日志：`butler/tasks/loads/TASK-011-butler-config-changer.json`
- 基线来源：`butler/memory/pair/TASK-001/round-01/developer-output.md`（F-E 基线 manifest 内容）
