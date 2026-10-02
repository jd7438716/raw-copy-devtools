# 风险登记册

> 最后更新: {date}
> 跨任务持续更新。pre-mortem 预测风险，sec-auditor 发现安全风险，captain 完成后标记状态。

| # | 风险 | 概率 | 影响 | 状态 | 缓解措施 | 类别 | 日期 |
|---|------|:--:|:--:|------|---------|------|------|

## 状态

| 标记 | 含义 |
|------|------|
| 🔴 | 活跃 — 需立即处理 |
| 🟡 | 监控中 — 已缓解但需持续关注 |
| 🟢 | 已关闭 — 风险不再存在 |
| ⚪ | 已接受 — 评估后不处理 |

## 更新规则

| 触发 | 来源 | 流程 |
|------|------|------|
| 新任务初期 | pre-mortem skill | 输出 `risks:` YAML → captain 收集 |
| 安全审计 | sec-auditor | 输出 `risks:` YAML → captain 收集 |
| 任务完成 | captain | 收集所有 risks YAML → 委托 rf-fixer 追加到本表 |
| 任何时候 | 老板 | 直接编辑追加 `[老板原话]` |

## 输出格式（agent 用）

pre-mortem / sec-auditor 在产出末尾输出以下 YAML 块，captain 会收集并写入：

```yaml
risks:
  - description: "{风险描述}"
    probability: "高|中|低"
    impact: "高|中|低"
    mitigation: "{缓解措施}"
    category: "技术|安全|流程|依赖"
```
