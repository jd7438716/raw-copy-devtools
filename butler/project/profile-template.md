# {agent-name} Talent Profile

> butler-agent 维护 | {last_updated}
> ⚠️ 格式要求: 必须用 ## Section 格式，不能用 YAML。

## Level
level: novice       # novice | practitioner | specialist | master
reason: "首次激活, 无历史"

## Statistics
rounds: 0              # 执行的 task 数
score: "NULL"          # auditor 评分 (rounds < 3 时 NULL)
score_history: []      # [{date, score, auditor}]
last_active: {date}

## Specialization
primary: []            # 主要擅长领域
secondary: []          # 次领域

## Skills
# agent 已装载的技能清单
# [{skill_name, skill_path, status, loaded_date, last_used}]

## Security History
security_history: []

## Needs
# 技能缺口. agent 自己写. talent-manager 读.
# [{skill, reason, priority, opened_date}]

## Contributions
# 对外产出的 domain knowledge 列表
# [{document, topic, promoted_date}]

## Community References
community_ref: []

## Status
status: active         # active | deprecated | frozen
deprecated_reason: ""
deprecated_date: ""
