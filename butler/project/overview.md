# 项目概述: Chrome DevTools 单条请求原始信息一键复制扩展

> 由 butler-init 自动创建
> slug: raw-copy-devtools

## 项目描述
Manifest V3 DevTools 扩展：一键复制单条网络请求的完整请求+响应原始信息为纯文本（不美化 JSON），供 AI 分析。零第三方依赖，不发起网络请求，最小权限。

## 技术栈
- **语言**: JavaScript（原生 ES，零第三方运行时依赖）
- **框架**: Chrome Extension / DevTools — Manifest V3
- **构建**: 无（直接 load unpacked，扩展包目标 < 200KB）
- **测试**: 待开发阶段配置

## 需求来源
- `req.txt`（项目根）— Chrome DevTools 单条网络请求原始信息一键复制扩展需求文档 v1.0

## 核心约束
- 只复制**单条**选中请求；输出**纯文本**，不美化 / 不排序 / 不改动 JSON 原文
- 最小权限：无 `<all_urls>`、无 `host_permissions`、无 `webRequest`、无 tabs
- 无网络请求代码、无遥测、无第三方依赖

## 目录结构（v2：产物统一收进 butler/）
```
butler/
├── project/        项目档案（overview / stack / risks / tech-debt / manifest）
├── domain/         领域知识（architecture / design / testing / security ...）
├── learned/        各 agent 学习记录
├── memory/         纠错与 agent 记忆
├── requirements/   需求规格与流水线产物
├── tasks/          backlog / done / gates / queue / skips
├── logs/  jobs/
.opencode/          项目级 opencode 配置（含动态 skills 路径）
req.txt             原始需求文档
```

## 文档约定（2026-10-02 记录）

- 面向用户的说明文档：`INSTALL.md` / `USAGE.md`（仓库根；同时在 `docs/` 保留规范路径镜像）。
- 测试用例：`tests/test-cases.md` + `tests/README.md`；里程碑/交付清单：`docs/MILESTONES.md`、`docs/DELIVERABLES-CHECKLIST.md`。
- **AC 双体系（2026-10-02）**：基线 AC-001..AC-022（`butler/requirements/requirement.md`）与增强里程碑 AC-001..AC-017（`butler/spec/…/requirement.md`）**编号独立、同名不同义**；引用 AC 时必须加「基线 / 增强里程碑」限定。基线回归口径（增强 AC-015）= 全部 `tests/*.test.mjs` 全量 + 4 门禁脚本。
- 中文优先；逐字符输出契约标记（`===== REQUEST =====` 等）保持英文原样不翻译。
- 每步操作必附「预期现象」；纯文档无占位符。

