# 变更摘要 — Git 仓库初始化与首次提交

## 背景

`D:\xiaozhai.dev\chrome_extension2` 项目（Manifest V3 Chrome/Edge DevTools 扩展「Raw Copy」）
此前没有任何版本控制，工作区积累了完整的源码、测试、文档、Butler 流水线产物与发行包。
用户明确要求执行 `git init` 并完成首次提交（已授权 git 写操作），以便后续可追踪文件沿革。

## 改动

- 执行 `git init`，默认分支 `master`，创建首个提交。
- 新增根 `.gitignore`：忽略 `node_modules/`、OS 垃圾文件（`Thumbs.db`/`.DS_Store`/`Desktop.ini`）、
  打包脚本的临时验证目录 `dist/_unzip/`、`dist/_verify/`，以及外部 junction 目录 `.refs/`；
  显式保留 `dist/*.zip` 发行产物。
- `git add -A` 暂存全部未忽略文件（353 个）+ Butler 决策记录，形成首个提交。
- 既有 `butler/.gitignore`（忽略 `.butler2/ logs/ jobs/ results/ tasks/queue/ tasks/skips/`）
  与 `.refs/.gitignore`（`*` + `!.gitignore`）均未改动，继续生效。

## 影响

- **纳入**：`extension/`（扩展源码+图标+样式+manifest）、`tests/`（16 个 `.test.mjs` + harness + 用例文档，
  283 条用例）、`scripts/`（7 个构建/校验脚本）、`docs/`、根文档（`INSTALL.md`/`USAGE.md`/`LICENSE`/`req.txt`）、
  `package.json`、`dist/*.zip`（1.0.0 与 1.1.0 发行包）、以及 `butler/` 下的知识/规范/流水线产物。
- **排除**：115 个运行态文件（`butler/.butler2/`、`butler/logs/`、`butler/results/`、`.refs/`）。
- 未改动任何业务代码或测试。

## 验收

- `git status` 干净（除被忽略项外无未跟踪/未暂存文件）。
- `dist/*.zip` 已入库，`.refs/`、临时验证目录、`node_modules` 均未入库。
- 密钥/凭证扫描无命中（仅文档中作为名词出现）。
- 遗留：无。仅提示仓库含约 8MB Butler E2E 截图/JSON 证据产物，如需瘦身可后续用 `.gitignore` 排除。
