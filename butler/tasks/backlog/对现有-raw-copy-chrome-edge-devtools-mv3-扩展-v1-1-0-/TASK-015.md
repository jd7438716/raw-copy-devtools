---
slug: 对现有-raw-copy-chrome-edge-devtools-mv3-扩展-v1-1-0-
depends-on: TASK-005 TASK-008 TASK-011 TASK-014 TASK-016
agent: butler-config-changer
estimate: S
weight: heavy
covers: DEL-018 REQ-016 AC-016
---

# TASK-015: 重新打包发行 ZIP（版本号处理 + 体积/零依赖/读回门禁）

<!-- butler:covers DEL-018 REQ-016 AC-016 -->

## 目标
`[ASSUMPTION]` 重新打包发行 ZIP：处理 `manifest.json` 版本号，运行打包脚本，确认解压后 **<200KB**、零第三方依赖、zip 读回门禁与双份 `node --check` 全 PASS。

## 涉及文件
- `extension/manifest.json`（版本号，如需 bump）
- `dist/raw-copy-<version>.zip`（重新生成）
- （`scripts/package.mjs` / `scripts/check-manifest.mjs` 若版本常量需同步）

## 冻结/禁止
- **禁止**新增权限/依赖（打包会再次校验，违反则中止）。
- 版本号是打包单一真源（`manifest.json#version`，ADR-010）；若 bump，需同步 `check-manifest.mjs` 的版本断言。
- 不得手工构造 zip；必须走 `scripts/package.mjs`（可复现 + 读回校验）。

## 实施要点
1. 版本决策：本轮为 v1.1.0 的三项修复/调整。若视为同一版本的修复 → 保持 `1.1.0` 重打包；若视为新发布 → 按语义化 bump（如 `1.1.1`）并同步 `check-manifest.mjs` 版本断言与 `INSTALL.md`/`USAGE.md` 版本行（如涉及则回写 TASK-014）。
2. 运行 `node scripts/package.mjs`：
   - 校验 `extension/` 白名单收集、JS 剥离语法、解压后总体积 `< 200KB`、零依赖。
   - 读回 zip：重新解析 + inflate + CRC + manifest 断言 + 每个 `.js` 二次 `node --check`。
3. 产物：`dist/raw-copy-<version>.zip`；记录体积与校验结果。
4. 若 bump 版本，复核 AC-011（权限不变）。

## 覆盖追溯（covers）
| spec ID | 本 TASK 如何覆盖 |
|---------|------------------|
| DEL-018 | `dist/` 重新打包发行 ZIP（含 manifest 版本号处理；体积<200KB + 零依赖审计 + zip 读回门禁） |
| REQ-016 | `[ASSUMPTION]` 需重新打包发行 ZIP |
| AC-016 | 发行 ZIP 体积 <200KB + 零依赖审计 + zip 读回门禁全部 PASS |

## 验收
- [ ] `node scripts/package.mjs` PASS（体积/零依赖/读回/CRC/语法全通过）
- [ ] 生成 `dist/raw-copy-<version>.zip`，记录版本与体积
- [ ] 若 bump：`check-manifest.mjs` 版本断言与文档版本行同步
- [ ] 权限/零网络不变（AC-011 复核）

## 备注
- 依赖 TASK-016（门禁与回归先通过）、TASK-011（id 清单）、TASK-014（文档版本）、TASK-005/008（最终 UI/代码面）。
- 版本号处理为 solution §待定项相关的 `[ASSUMPTION]`，执行时若用户另有拍板以其为准。
