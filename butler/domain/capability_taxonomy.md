# Capability Taxonomy

> 此文件由 butler-talent-manager 在发现新领域时自动追加.
> 种子版: 3 个预写条目作为格式示例. 其余条目来自实际项目.

## 领域: Web 后端开发

### REST API 设计
- 子能力: 资源建模, 版本管理, 分页/过滤/排序, 错误处理
- 适用项目: [Web]
- 关联 agent: [butler-architect, butler-developer]

### 数据库设计
- 子能力: 范式设计, 索引优化, 迁移管理, 查询优化
- 适用项目: [Web, 数据]
- 关联 agent: [butler-architect, butler-developer]

### 身份认证
- 子能力: JWT, OAuth2, RBAC/ABAC, MFA
- 适用项目: [Web, 移动]
- 关联 agent: [butler-sec-auditor, butler-developer]

## 追加规则

- butler-talent-manager Mode 2f: 新领域 → 追加条目, 状态=[draft]
- butler-talent-manager Mode 4c: 第二个不同项目命中 → 状态=[confirmed]
