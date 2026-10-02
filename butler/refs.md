# 外部目录索引（.refs/）

> 规则：所有项目外目录必须用 junction 引入，并在此登记：
>   node butler/tools/refs.mjs add <name> <真实目录> "<用途>"
> 全局 external_directory = deny：不经 .refs/ 的外部路径无法访问。
> 注意：glob 不穿透 junction；访问用 read .refs/<name>/... 或 shell ls -R .refs。

| name | target | 用途 | 更新日期 |
|---|---|---|---|
