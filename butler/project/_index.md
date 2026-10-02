# 知识→记忆映射索引

> 此文件定义 butler/knowledge/ 到 butler/memory/ 的映射关系。

## 格式: 每条映射
  - knowledge: {知识文件路径}
  - tags: [tag1, tag2]
  - 适用: {任务类型}

---

## 项目知识映射
### overview → 通用概述
- knowledge: butler/knowledge/project/overview.md
- tags: [overview, project]
- 适用: 所有任务

### conventions → 编码规范
- knowledge: butler/knowledge/project/conventions.md
- tags: [conventions, code-style]
- 适用: 开发/配置任务

### stack → 技术栈
- knowledge: butler/knowledge/project/stack.md
- tags: [stack, build, test]
- 适用: 开发/构建/部署任务

---

## 领域知识映射
### architecture → 架构约束
- knowledge: butler/knowledge/domain/architecture.md
- tags: [architecture, design, modules]
- 适用: 架构/开发/CR 任务

### security → 安全红线
- knowledge: butler/knowledge/domain/security.md
- tags: [security, audit]
- 适用: 安全审计/开发/CR 任务

### development → 开发约定
- knowledge: butler/knowledge/domain/development.md
- tags: [development, refactoring, testing]
- 适用: 开发任务

### testing → 测试策略
- knowledge: butler/knowledge/domain/testing.md
- tags: [testing, qa]
- 适用: 测试/QA 任务

### product → 产品领域
- knowledge: butler/knowledge/domain/product.md
- tags: [product, ux, requirements]
- 适用: PM/BA 任务

### design → 设计约定
- knowledge: butler/knowledge/domain/design.md
- tags: [design, ui, visual]
- 适用: 设计/UI 任务
