# QA 策略 — Chrome/Edge DevTools MV3 扩展（Raw Copy）

> 反哺: butler-qa · 日期: 2026-10-02 · 关联 TASK-011（DEL-013）

## 1. 测试分层决策（本项目实证）

| 层 | 范围 | 落点 | 数量 |
|:--:|------|------|:----:|
| L0 单元 | 纯逻辑模块（无浏览器 API） | `tests/{i18n,store,capture,filter,render,selection,formatter,clipboard,content}.test.mjs` | 123 用例 |
| L0 门禁 | 静态读盘断言（权限/外壳/网络/语法） | `scripts/check-{syntax,manifest,panel-shell,zero-network}.mjs` | 17+34+17+11 项 |
| L2/L3 E2E | 真实浏览器可见行为 | `tests/test-cases.md §3`（E2E-01..16） | 16 场景 |

**决策依据**：扩展把「可判定逻辑」全部下沉到 `extension/src/*.js` 纯函数，浏览器层只做装配 → 让 AC-003/004/005/006/007/010/013/014/015/022 等**核心验收可用 Node 机械验证**，仅 AC-001/002/011/012/017/018/019/020/021 的可见部分需要 E2E。

## 2. 关键教训

- **保真类 AC（AC-007）必须用「逐 UTF-16 码元」断言 + golden 模板**，而非 `includes()`——语义张力（模式 A 格式化 vs 禁止格式化）靠逐字符比对 + 两模式 body 子串一致来消解（ADR-006）。
- **窗口化渲染性能（AC-021）可单测**：断言「DOM 节点数 ≈ 可视行数 + overscan 且远小于 1000」比真实帧率更稳定、可回归。
- **剪贴板降级链（AC-022）用桩注入验证**：primary reject → execCommand true、双失败 → `{ok:false,reason}`，必须覆盖「不抛异常」。
- **边界用例要成对**：阈值 `=10MB` vs `10MB+1`、`第1000条` vs `第1001条`、空体 vs `null` 体——单侧断言无法证明边界正确。
- **静态门禁价值高**：AC-008/009/020（零网络/最小权限/无持久化）无法靠运行时观测穷尽，静态扫描 `extension/**` 是主证据。

## 3. 边界覆盖清单（checklist §C 16 项）

无选中复制、GET/HEAD 空体、204/304、非文本体、状态码 0/失败、第 1000/1001 条、并发竞态、超长 URL、阈值边界、超阈值继续复制、失焦降级、DevTools 重开清空、多 target、WebSocket、非法 Base64、重复点击 —— 全部落于 `tests/test-cases.md §2`（TC-B-01..TC-B-16）。

## 4. 复跑命令

```bash
npm test                              # 123 单元用例
node scripts/check-syntax.mjs         # 11/11
node scripts/check-manifest.mjs       # 17/17
node scripts/check-panel-shell.mjs    # 34/34
node scripts/check-zero-network.mjs   # 17/17
```

## 5. 遗留 / 待 E2E

- AC-017 体积、AC-019 ZIP 存在性 → 依赖 `dist/raw-copy-1.0.0.zip`（DEL-015）。
- AC-018 Chrome/Edge 双端安装、TC-B-12/13/14 浏览器行为 → 只能真实 E2E。
- DEC-001..008 取值以 `requirement.md §3.3` 已批准默认值为准（`Raw Copy` / `HTTP/1.1` / 10MB / 模式 A）。
