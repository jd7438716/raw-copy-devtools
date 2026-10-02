---
slug: 在现有-raw-copy-chrome-edge-devtools-mv3-扩展-基础上做功能增
date: 2026-10-02
task: TASK-012
rework_round: 1
framework: node:test (Node.js ESM, node --test)
command: node --test "tests/**/*.test.mjs"
outcome: pass
regression_block: false
regression_baseline: null
scope: affected
---

# TASK-012 冻结契约守护 + 基线全量回归（保真门禁）— 终局结果（Rework Round 1）

## 终局判定：PASS ✅

上一轮唯一阻塞（`scripts/package.mjs` 体积门禁 236655 B ≥ 204800 B）经 Developer 修复后复验通过。
修复仅改动 `scripts/package.mjs`（mtime 13:09），采用「打包期整行注释/空白剥离 + 剥离后 `node --check` 前置 + 读回二次校验」，
未改阈值、未删功能、`extension/**` 源码（含冻结模块）未改。

## 1) 冻结校验 — PASS

```
sha256sum extension/src/selection.js
0ee06d95a7885b3f463b323457f4ac4ff1cd92da7bfb1db9ec4e0a2b886db5aa  ← 期望值一致 ✅
sha256sum extension/src/formatter.js
c6504a45f953d94659c3f1d22d304e30afbaa01c0aba32ce1615da7d698b0412  ← 期望值一致 ✅

stat:
selection.js | mtime=2026-10-02 10:34:17 | size=7289   （< 增强开始 12:28）✅
formatter.js | mtime=2026-10-02 10:38:24 | size=10796  （< 增强开始 12:28）✅
```

## 2) 冻结测试零改动 — PASS

```
tests/selection.test.mjs → ℹ tests 13 / pass 13 / fail 0
tests/formatter.test.mjs → ℹ tests 24 / pass 24 / fail 0
```

## 3) 全量回归 — PASS

```
node --test "tests/**/*.test.mjs"
ℹ tests 264 / pass 264 / fail 0 / cancelled 0 / skipped 0 / todo 0
EXIT=0
```

## 4) 门禁脚本 4/4 — PASS

| 脚本 | 原始结果 |
|------|----------|
| check-syntax.mjs | `[check-syntax] 15/15 files passed` EXIT=0 |
| check-manifest.mjs | `== RESULT: PASS (17/17 项) ==` EXIT=0 |
| check-zero-network.mjs | `[check-zero-network] 17/17 项通过 / RESULT: PASS` EXIT=0 |
| check-panel-shell.mjs | `== RESULT: PASS (34/34 项) ==` EXIT=0 |

## 5) 三路径保真一致（单选/批量/明细） — PASS

一次性脚本（stdin，不落仓库，镜像 `panel.js#resolveResponseBodyText`）对同一 record 断言三路径逐字符相等：

```
[CASE] large-response kind=text  singleLen=50314 | bulk1===single=true | detail===single=true | markers=2
[CASE] binary        kind=binary singleLen=333   | bulk1===single=true | detail===single=true | markers=2
[CASE] base64        kind=base64-text singleLen=344 | bulk1===single=true | detail===single=true | markers=2
===== three-path consistency: ALL PASS =====   EXIT=0
```
占位/解码规则：binary → `[Binary content omitted: image/png, 2048 bytes]`；base64 → 解码回原文；大响应 → 正文逐字符完整不截断。

## 6) `node scripts/package.mjs` — PASS ✅

```
-- 打包期剥离（.js 整行注释/空白）--
JS 原始总字节:   207814 B
JS 剥离后总字节: 110523 B (节省 97291 B, 15/15 个文件)
[PASS] 全部 .js 剥离后 node --check 通过 (15/15)

-- 体积 --
条目数:              25
解压后总体积:        139364 B (136.10 KB)   ← 期望 ~136KB ✅
ZIP 压缩后体积:      42614 B (41.62 KB)
门禁口径: 解压后总体积 < 204800 B (200 KB)
[PASS] 解压后总体积 < 200KB (139364 < 204800)

-- 依赖审计 --
third-party deps = 0
[PASS] 全部 import specifier 均为相对路径（third-party deps = 0）

-- 读回校验 --
[PASS] zip 可解析，CRC32 全部通过，共 25 条目
[PASS] manifest_version === 3 / permissions === ["clipboardWrite"]
[PASS] LICENSE 位于 zip 根
[PASS] 不含 butler/ tests/ docs/ scripts/ req.txt 等非发行内容
[PASS] 全部条目与磁盘源文件一一对应（.js 按剥离口径）
[PASS] 读回全部 .js 条目 node --check 通过（双保险）

== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==   EXIT=0
```
体积轨迹：修复前 236655 B (231.11 KB) → 修复后 139364 B (136.10 KB)，降幅 41.1%。
zip 可复现：两次运行 sha256 均为 `24c2089ab29c645f2bc21339b3e1fda381d88bc39c31210ea1f7e5d099f2fb5d`。

## 7) 反向探针（fail-closed） — PASS（独立复现）

在 **os.tmpdir 一次性沙箱副本**（零仓库改动）上独立复现：

```
[PROBE-0] clean sandbox -> expect PASS
   exit=0  == RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==
  [PASS] clean sandbox package PASS
[PROBE-1] inject broken JS (extension/__probe_broken__.js = "const = ;") -> expect 失败-封闭
   exit=1
   [失败] 剥离后 node --check 失败: __probe_broken__.js
   SyntaxError: Unexpected token '='
   == RESULT: 失败 (1 个 JS 剥离后语法错误，未写出 zip) ==
  [PASS] broken JS -> non-zero exit (fail-closed)
  [PASS] reports node --check failure
  [PASS] no zip written on failure
[PROBE] pass=4 fail=0
```
仓库残留检查：`extension/__probe_broken__.js` 不存在（clean）；偏离沙箱已在 finally 清理。

## AC 逐条判定（终局）

| AC | 判定 | 证据 |
|----|:----:|------|
| **AC-007** 单选复制与 golden 逐字符一致 | **PASS** | formatter 24/24 + selection 13/13；两冻结文件 SHA256 逐字节匹配；mtime < 12:28 |
| **AC-014** 大响应/二进制/Base64 规则一致（批量一次确认 + 明细复用 classifyBody） | **PASS** | content 19/19；三路径断言一致；`panel.js:1139-1154` 批内一次 confirm；`panel.js:1667` 详情复用 classifyBody |
| **AC-015** 既有基线用例全回归 | **PASS** | `node --test` 264/264 / 0 失败 |
| **AC-016** 体积 <200KB 且零第三方依赖 | **PASS** | 解压 139364 B (136.10 KB) < 204800 B；third-party deps = 0 |

## 学到

- (2026-10-02) [tester] 无 git 仓库时，冻结契约用「SHA256 + mtime + API 表面」三证据替代 `git diff`，可机械判定且可复算。
- (2026-10-02) [tester] pack 体积门禁口径为**解压后**（非压缩后）；评估体积风险时勿用 ZIP 压缩值对照阈值，易低估。
- (2026-10-02) [tester] 反向探针可在 os.tmpdir 沙箱副本上对真实脚本做 fail-closed 验证，零仓库改动、可复现。

> 未覆盖声明：本次 scope=affected 的窄化为「冻结两模块 + 全量既有测试 + 4 门禁 + 打包体积 + 三路径一致性」；
> 未做浏览器级 E2E（右键菜单/双击详情 UI 实机渲染），依据：TASK-012 为冻结契约与回归门禁，UI 实机验证归 E2E/发布门（scope=functional），置信度 high。
