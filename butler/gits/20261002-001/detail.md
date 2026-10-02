# 详细记录 — Git 仓库初始化与首次提交

## 目的

为「Raw Copy」DevTools 扩展项目建立版本控制基线，将当前可交付状态（源码/测试/文档/脚本/发行包）
作为首个提交固化，使后续变更可 diff、可回溯、可审计。

## 采用的方式

1. **`git init`**：在项目根初始化，默认分支 `master`（用户指定默认分支即可）。
2. **根 `.gitignore`**：集中声明跨平台/跨工具应排除的路径，补足全局忽略覆盖。
3. **`git add -A`**：一次性纳入全部未忽略内容（首次提交无历史，逐路径 add 等价且更繁琐）。
4. **提交前审查**：枚举全量变更 → 核对忽略规则 → 扫描密钥 → 检查大文件/二进制。
5. **中文 Conventional Commits** 生成提交信息。

## 采用该方式的原因

- 项目已是完整可交付状态，没有增量历史需要保留，首个提交用 `-A` 最直接、最不易漏项。
- 忽略规则采用「根 `.gitignore` 管全局 + 子目录 `.gitignore` 管自身」的分层方式，
  不改动既有 `butler/.gitignore` 与 `.refs/.gitignore`，避免破坏 Butler 既有约定。
- 用 `git check-ignore -v --no-index` 逐条验证规则命中，而非凭经验假设。

## 预期结果

一个干净的首个提交：恰好包含全部项目文件与已忽略路径之外的一切；`git status` 无残留；
发行 ZIP 保留；外部 junction、运行态日志、临时验证目录均不入库。

## 遇到的困难

1. **`.refs/.gitignore` 的语义陷阱**：其内容为 `*` + `!.gitignore`，会使 `.refs/.gitignore` 自身
   变为「不被忽略」从而可能被提交，与用户「`.refs` 不应被提交」的要求冲突。
2. **CRLF 警告刷屏**：Windows 上 `git add` 对大量文本文件提示 `LF will be replaced by CRLF`，
   干扰审查输出。
3. **大体积证据产物**：`butler/spec/**/e2e-artifacts/` 含大量 E2E 截图（单张最大 320KB），
   全库约 9MB。

## 解决方案

1. 在根 `.gitignore` 增加 `.refs/`（整目录忽略），并保留磁盘上的 `.refs/.gitignore` 不动；
   经 `git check-ignore` 验证 `.refs/.gitignore` 已被忽略，确认不会入库。
2. CRLF 警告仅为提示，不影响提交内容；审查时以 `git diff --cached --name-only` 为准。
3. 经用户指定的忽略范围未包含 `butler/spec`，故保留该证据产物并在报告中提示体积，
   由用户决定是否后续瘦身（不擅自排除，避免丢失验收证据）。

## 最终状态

- 分支 `master`，首个提交包含 353 个项目文件 + 3 个 Butler 决策记录。
- 115 个运行态/外部文件被正确忽略。
- 无密钥/凭证；无 `node_modules`；`dist/*.zip` 已入库。
- 未修改任何业务代码或测试。
