---
slug: 新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto
id: TASK-016
title: i18n 结构（中文优先，预留英文）
depends-on: N/A
agent: butler-developer
estimate: S
weight: light
covers: [REQ-033, AC-016]
---

# TASK-016: i18n 结构（中文优先，预留英文）

## 目标
`extension/src/i18n.js`：`t(key, vars?):string`；默认 `zh` 字典，结构预留 `en`（不要求完整翻译，DEC-007）；面板/表头/按钮/Toast/空态/过滤标签等所有可见文案统一经 `t()`，禁止散落硬编码；缺失 key 返回可读回退（key 本身或默认文案），不抛异常（E_I18N_MISSING_KEY 开发期日志）。

## 涉及文件
- `extension/src/i18n.js`（新增）

## AC 引用
- REQ-033: 界面语言中文优先，可预留英文
- AC-016: 界面文案中文，预留英文 i18n 结构

## 验收
- [ ] build: PASS
- [ ] test: PASS（单元：t() 命中 / 缺 key 回退）
- [ ] lint: PASS
- [ ] 默认 zh 字典完整，结构含 en 占位
- [ ] 面板可见文案均来自字典（无散落硬编码）

## 备注 / 约束
- 由 TASK-002 接线消费；REQ-013 附加按钮文案预留。

<!-- butler:covers REQ-033 AC-016 -->
