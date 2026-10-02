---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
depends-on: TASK-011, TASK-016
agent: butler-sec-auditor
estimate: M
weight: heavy
covers: REQ-018 REQ-019 REQ-020 REQ-021 AC-012 AC-013 AC-016
---

# TASK-019: 独立安全审计补齐（新增攻击面 + 安全/运维门禁）

<!-- butler:covers REQ-018 REQ-019 REQ-020 REQ-021 AC-012 AC-013 AC-016 -->

> 收敛·执行后补齐新增（不修改/删除任何既有 TASK；不改代码）。

## 补齐依据（为什么此 TASK 是缺口）

- 本里程碑期望的 `butler/spec/<slug>/sec-audit.md` **不存在**；`run_muqg8hsx_j7mhsr` 中 `secaudit` 节点仍 `pending`（execute 超时后验证链阻断）→ **本次增强从未经过独立安全审计签署**。
- 仅有的安全证据来自 `test-results.md` 里**静态门禁脚本**（package/manifest/zero-network）：脚本级 PASS ≠ 独立安全审计。且本次增强**新增了不可信数据渲染面**（面板内自绘右键菜单、`<pre>` 明细抽屉注入原始请求/响应文本、P2 分段裁剪），属必须复审的新增攻击面。
- 上一里程碑 `sec-audit.md`（WARN）登记的两项中风险仍为 `open` 且本次未见缓解落地：
  - `RISK-MEM-01`（捕获期无字节预算的内存放大 / 本地 DoS）
  - `RISK-EXFIL-01`（含 Authorization/Cookie 的原文入剪贴板，无复制前敏感探测）
- 故安全/运维类 spec ID `REQ-018 / REQ-019 / REQ-020 / REQ-021 / AC-012 / AC-013 / AC-016` 缺独立审计签署 → 记为未完成。

## 目标

对增强后的发行面做一次独立安全审计，产出 `butler/spec/<slug>/sec-audit.md`（verdict: PASS/WARN/REJECT），并复核新增攻击面与既有 open 风险。

## 审计范围（scope = changed ∪ affected）

- S1 前端/扩展页：`extension/panel.html`、`panel.js`、`styles/panel.css`、`src/{contextmenu,detail,multiselection,bulkformatter}.js`（新增/改动面全量人读）。
- S2 权限/清单：`extension/manifest.json`（`permissions === ["clipboardWrite"]`，无 host/webRequest/`<all_urls>`）。
- S4 供应链/构建：`scripts/*.mjs`、`package.json`（零第三方运行时依赖）。
- S5 发行产物：`dist/raw-copy-1.1.0.zip`（白名单 / CRC 读回 / 无非发行内容混入）。
- 新增攻击面专审：右键菜单渲染（`textContent`、无 `innerHTML`）、明细抽屉注入不可信原文、P2 分段裁剪（禁 `chrome.contextMenus`）、多选批量输出（剪贴板敏感放大）。

## 验证清单（逐条绑定 AC/REQ）

- [ ] **AC-012**：manifest 权限仍仅 `clipboardWrite`，无 `<all_urls>`/host_permissions/webRequest/新增网络权限。
- [ ] **AC-013**：复制/查看全流程零网络传输（`check-zero-network` + 反向探针）。
- [ ] **AC-016**：解压后体积 < 200KB 且零第三方运行时依赖。
- [ ] **REQ-018/019/020/021**：MV3 / 零依赖 / 最小权限 / 零网络四项约束复核。
- [ ] 新增面：全库 `chrome.contextMenus` == 0；无 `innerHTML`/`eval`/`new Function`；不可信文本一律 `textContent`。
- [ ] 风险复核：`RISK-MEM-01` / `RISK-EXFIL-01` 是否随增强恶化；给出接受/缓解建议。

## 验收

- [ ] 产出 `sec-audit.md`，含 THREAT_MODEL、五面攻击面表、机械证据复跑、未覆盖清单（INV-1）。
- [ ] verdict ∈ {PASS, WARN, REJECT}；REJECT 则阻断发布并回退登记。
- [ ] 无高危/可利用漏洞；中风险显式给出接受与缓解路径。

## 依赖

- TASK-011（权限/网络/体积门禁脚本）、TASK-016（真机运行行为，供运行时安全判断）。
