# developer-output — Round 1（TASK-011 / TASK-012 rework）

## 模块: 打包体积门禁修复 — `scripts/package.mjs`

- 改动文件（唯一）: `scripts/package.mjs`
- 新增测试: 无（按任务「优先保持简单」，用脚本内建断言 + 反向探针 + 独立解码器验证）
- 未改: `extension/**`（含冻结模块）、其它门禁脚本、`UNCOMPRESSED_LIMIT_BYTES`（保持 200KB）

## 问题

`node scripts/package.mjs` 基线 FAIL：

```
条目数:              25
解压后总体积:        236655 B (231.11 KB)
[FAIL] 解压后总体积超限: 236655 >= 204800
== RESULT: FAIL (1 项失败) ==
```

根因：`extension/**/*.js` 共 207,814 B，其中整行注释 96,708 B（2,070 行）+ 整行空白 583 B，
真实代码仅约 110,523 B。注释随源码进入 ZIP → 解压体积超 200KB。

## 实现

在 `package.mjs` 内新增「打包期整行注释/空白剥离」（仅 Node 内置、零依赖）：

- `stripJsComments(src)`：保守行级状态机，仅移除**整行** `//` 注释、**整行**块注释、**整行**空白；
  其余行**原样保留**（不做 inline 剥离、不改缩进/空白）。块注释内跟踪 `结束符` 退出。
- `checkJsSyntax(code)`：把 JS 写入 `os.tmpdir` 临时 `.mjs` → `execFileSync(process.execPath,['--check',tmp])`；
  无论成败 `finally` 删除临时文件。
- 入包前：每个 `.js` 剥离后**必须**通过 `node --check`；任一失败 → 打印文件 + stderr → `exit 1`，**不写出 zip**。
- 读回阶段：从磁盘源**独立重新推导**期望字节（不复用打包期内存对象），并再次对读回解压出的每个 `.js`
  执行 `node --check`（双保险）。
- `.html/.css/.png/.json/LICENSE` 一律不剥离。

### 安全前提（已机械确认）

- 全仓 15 个 `.js` 中，**0 个代码行含反引号**（318 个含反引号的行全部位于注释内）；
- 无多行模板字符串；无「块注释结束符后同行仍有代码」的行；
- 所有 `.js` UTF-8 round-trip 有效。
- 因此整行剥离不会误伤字符串/模板字面量；`node --check` 作为最终兜底。

## 验证原始输出

### 1) `node scripts/package.mjs` → PASS（136.10 KB < 200KB，目标 ≤160KB 达标）

```
-- 打包期剥离（.js 整行注释/空白）--
JS 原始总字节:   207814 B
JS 剥离后总字节: 110523 B (节省 97291 B, 15/15 个文件)
[PASS] 全部 .js 剥离后 node --check 通过 (15/15)

-- 体积 --
条目数:              25
解压后总体积:        139364 B (136.10 KB)
ZIP 压缩后体积:      42614 B (41.62 KB)
门禁口径: 解压后总体积 < 204800 B (200 KB)
[PASS] 解压后总体积 < 200KB (139364 < 204800)

-- 读回校验 --
[PASS] zip 可解析，CRC32 全部通过，共 25 条目
[PASS] 根 manifest.json 为合法 JSON
[PASS] manifest_version === 3
[PASS] permissions === ["clipboardWrite"]
[PASS] LICENSE 位于 zip 根
[PASS] 不含 butler/ tests/ docs/ scripts/ req.txt 等非发行内容
[PASS] 全部条目与磁盘源文件一一对应（无缺失/多余；.js 按剥离口径）
[PASS] 读回全部 .js 条目 node --check 通过（双保险）

== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==
```

### 2) ZIP 内每个 `.js` 独立 `node --check`（PowerShell/.NET System.IO.Compression 解压后校验，非自研解析器）

```
checked=15 fail=0
[PASS] devtools.js / panel.js / src/*.js ×13
```

### 3) 全量回归 `node --test "tests/**/*.test.mjs"`

```
ℹ tests 264
ℹ pass 264
ℹ fail 0
```

### 4) 门禁脚本

| 脚本 | 结果 |
|------|------|
| check-syntax.mjs | PASS 15/15 |
| check-manifest.mjs | PASS 17/17 |
| check-zero-network.mjs | PASS 17/17 |
| check-panel-shell.mjs | PASS 34/34 |

### 5) 剥离效果真实（前后对比）

| 指标 | 剥离前 | 剥离后 | 降幅 |
|------|--------|--------|------|
| JS 总字节 | 207,814 B | 110,523 B | −97,291 B（−46.8%）|
| 解压后总体积 | 236,655 B (231.11 KB) | 139,364 B (136.10 KB) | −97,291 B（−41.1%）|
| ZIP 压缩后 | 84,450 B | 42,614 B | −41,836 B |

节省量 == 注释 96,708 B + 空白 583 B（97,291 B），证明只移除了注释与空白。

### 6) 反向探针（证明安全网非空跑）

临时插入 `extension/__probe_broken__.js`（`const = ;`）→ 期望 FAIL：

```
[FAIL] 剥离后 node --check 失败: __probe_broken__.js
== RESULT: FAIL (1 个 JS 剥离后语法错误，未写出 zip) ==
EXIT=1
```

探针已删除，仓库零残留；复跑 PASS。

### 7) ZIP 可复现 + 交付结构

- 两次运行 sha256 完全一致：`24c2089ab29c645f2bc21339b3e1fda381d88bc39c31210ea1f7e5d099f2fb5d`
- `dist/raw-copy-1.1.0.zip` 由独立 .NET `ZipFile.OpenRead` 读回：`manifest@root=True`、`manifest_version=3`、`permissions=clipboardWrite`

## 自评

- [x] 符合 CONSTITUTION 红线（真实构建+独立断言验证；未绕过门禁、未改阈值、未删功能/测试/源码）
- [x] 零第三方依赖（仅 node 内置 `child_process/fs/os/zlib/path/url`）
- [x] 语义不变（仅整行注释/空白；`node --check` 前置 + 读回双保险 + 反向探针）
- [x] 只改 `scripts/package.mjs`；未改 `extension/` 源码与其它门禁脚本

## 遗留项

- 剥离为**打包期**行为，`extension/` 源码保持可读注释（开发体验不受影响）。
- `stripJsComments` 的安全前提（代码无多行模板字符串 / 无「块注释结束符+同行代码」）依赖当前仓库事实；
  若未来新增多行模板字符串，`node --check` 会在入包前拦截（fail-closed），但会导致打包失败 —— 属预期保护。
