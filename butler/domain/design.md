# 设计约定

> 主写: butler-designer | 也读: butler-ui-ux, butler-captain
> 最后更新: 2026-07-08

## 视觉支柱

<!-- 3-5个形容词描述美术方向，设计师首次运行时填充 -->

- _(待定义: 项目的视觉风格关键词)_

## 色彩令牌

| 角色 | 色值 | 用途 |
|------|------|------|
| primary | _(待定义)_ | 主色 |
| secondary | _(待定义)_ | 辅色 |
| accent | _(待定义)_ | 强调色 |
| background | _(待定义)_ | 背景 |
| surface | _(待定义)_ | 卡片/面板 |
| text-primary | _(待定义)_ | 主文字 |
| text-secondary | _(待定义)_ | 次要文字 |

## 字体

| 用途 | 字体 | 备选 |
|------|------|------|
| display | _(待定义)_ | _(待定义)_ |
| body | _(待定义)_ | _(待定义)_ |
| mono | _(待定义)_ | _(待定义)_ |

## 间距

- base unit: _(待定义, 建议 4px 或 8px)_

## 生成参数（锁定后勿改）

| 参数 | 值 |
|------|-----|
| model | doubao-seedream-5-0-pro-260628 |
| seed | _(锁定)_ |
| guidance_scale | 8.0 |
| size | 2048x2048 |
| negative_prompt | blurry, low quality, distorted, extra limbs |

## prompt_template

```
[SUBJECT], [ACTION], [STYLE: {视觉支柱}], {调色板描述}, {光照描述}
```

## golden_reference

<!-- 第一次生成满意的结果后，记录路径和seed -->
- path: _(待填充)_
- seed: _(待填充)_

## 资产清单

<!-- 设计师每次生成后更新 -->

| 文件名 | 用途 | 尺寸 | 状态 |
|--------|------|------|------|
| _(待首次生成)_ | _(待首次生成)_ | _(待首次生成)_ | _(待首次生成)_ |
