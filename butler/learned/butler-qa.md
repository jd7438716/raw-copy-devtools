# 学习记录 — butler-qa

```yaml
learnings:
  - type: 发现
    summary: "TASK-011：为 Raw Copy MV3 扩展建立测试用例矩阵，逐条绑定 AC-001..AC-022 与 checklist §C 全部 16 项边界；现有 Node 单测基线 123 用例 + 4 门禁脚本全 PASS。"
  - type: 决定
    summary: "把 AC 分为「可执行单元/静态门禁/手工 E2E」三类映射：核心验收（过滤/选中/保真/淘汰/复制降级/内容分类/i18n）全部下沉为 L0 纯逻辑单测，仅浏览器可见行为（面板注册/实时捕获/真实剪贴板/体积/双端）保留 E2E。"
  - type: 经验
    summary: "保真类验收（AC-007）用逐 UTF-16 码元 + golden 模板断言，比 includes() 更能守住「不 parse/不排序/不转 Markdown」；阈值与淘汰边界必须成对断言（=10MB vs 10MB+1、第1000 vs 第1001）。"
  - type: 决定
    summary: "新增测试命名约定：一模块一 <module>.test.mjs，用例名带 REQ-/AC- 便于反查验收标准；纯逻辑才写单测，浏览器行为进 test-cases.md §3 手工 E2E。"
```
