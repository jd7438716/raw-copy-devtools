# 记忆标签索引

> 全量记忆标签索引 — agent Step 0 根据标签匹配历史记忆

## 加载优先级
1. 先匹配 Active 记忆（< 90 天 或 有 recertify 标记）
2. 如果 Active 匹配 >= 3 条 → 不加载 Archived
3. 否则适当加载 Archived 高价值记忆

## 格式
每条记忆:
  - slug: {任务slug}
  - agent: {agent名}
  - tags: [tag1, tag2, ...]
  - date: {日期}
  - outcome: success|partial|failed
  - summary: {一句话}

---

## Active 记忆
> 此部分由运行时自动维护

## Archived 记忆
> 超过 90 天的 Active 记忆自动移入此区
