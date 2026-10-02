# developer-output — TASK-014 (Round 1)

> slug: `新建一个-chrome-edge-devtools-扩展-manifest-v3-在-devto`
> agent: butler-developer | date: 2026-10-02 | phase: ⑤ 收敛·批次十四（打包 ZIP + 完整源码 + 体积/零依赖）
> covers: **[DEL-015, DEL-016, REQ-031, REQ-032, AC-017]**（源码项；另支撑 AC-019 的 ZIP/完整源码落点）
> 模式: converge 追补（无 frame-builder 骨架 → 按 TASK 描述 + design.md 冻结约束直接实现）

## 模块: Packaging 打包脚本 + 发行 ZIP

- 交付 1: `scripts/package.mjs`（**new** — 零第三方依赖、可复现、自带体积/依赖/读回三重门禁）
- 交付 2: `dist/raw-copy-1.0.0.zip`（**new** — 生成物，21 条目，可直接「加载已解压」）
- 附带: `package.json` 新增 `"package": "node scripts/package.mjs"`（保留 test/build/lint 原值）

## 关键约束落点（design.md）

| 约束 | 实现 |
|------|------|
| ADR-010 `extension/` 为打包边界 | 白名单仅 `extension/**` + 根 `LICENSE`；extension 内文件**展平到 zip 根** |
| ADR-011 打包脚本化 | `scripts/package.mjs`，仅 Node 内置模块 |
| C-4 排除非发行内容 | 读回断言不含 `butler/`、`tests/`、`docs/`、`scripts/`、`.refs/`、`.opencode/`、`req.txt`、`package.json`、`INSTALL.md`、`USAGE.md` |
| REQ-031 / AC-017 体积 | 门禁口径 = **解压后总体积 < 200KB**（204800B）；同时打印压缩后体积 |
| REQ-032 零第三方 | 扫描 `extension/**/*.js` import specifier，非相对路径集合为空 → `third-party deps = 0` |
| C-6 版本单一真源 | 版本读自 `extension/manifest.json#version` → 输出名 `raw-copy-<version>.zip` |

## 实现要点

### ZIP 写出（手写，零依赖，可复现）
- local file header(30B) + central directory(46B) + EOCD(22B)；
- 压缩方法 `8` = deflate，用 `zlib.deflateRawSync(data,{level:9})`（raw deflate，无 zlib 头，ZIP 要求）；
- 自写 CRC32（多项式 `0xEDB88320`，与 `scripts/gen-icons.mjs` 同源）；
- **固定 DOS 时间戳**（1980-01-01 00:00:00）→ 同一输入产出**逐字节相同**的 zip（sha256 已验证两次运行一致）；
- 条目排序后再计算 offset，顺序确定。

### 独立读回校验（防「生成器自证」假阳性）
打包后**重新从磁盘读回 zip 并解析**（不复用内存对象）：
- 反向定位 EOCD → 遍历 central directory → 定位每个 local header → `inflateRawSync` 解压；
- 逐条目重算 **CRC32** 与 central directory 记录比对；校验解压尺寸；
- 断言根 `manifest.json` 存在、为合法 JSON、`manifest_version===3`、`permissions===["clipboardWrite"]`；
- 断言 `LICENSE` 在根、无禁用路径前缀、每个条目与磁盘源文件一一对应（尺寸一致）。

### 依赖审计
- 正则覆盖三类：`import ... from 'X'`、副作用 `import 'X'`、动态 `import('X')`；
- 判定：specifier 以 `.` 或 `/` 开头 = 内部（相对/绝对）；其余计入 external；
- `chrome.*` / 浏览器原生 API 经全局对象访问、不产生 import → 天然为 0。

## 验证结果（真实执行，原始输出）

### 1) 打包主流程 `node scripts/package.mjs` → PASS
```
== package ==
repo root:       D:\xiaozhai.dev\chrome_extension2
extension root:  D:\xiaozhai.dev\chrome_extension2\extension
version:         1.0.0
zip:             D:\xiaozhai.dev\chrome_extension2\dist\raw-copy-1.0.0.zip

-- 打包条目 (21) --
  LICENSE                         1088 B  ->      645 B
  devtools.html                    296 B  ->      249 B
  devtools.js                     1481 B  ->      849 B
  icons/icon128.png               1233 B  ->     1195 B
  icons/icon16.png                 267 B  ->      272 B
  icons/icon32.png                 417 B  ->      422 B
  icons/icon48.png                 459 B  ->      464 B
  manifest.json                    469 B  ->      334 B
  panel.html                      5621 B  ->     1637 B
  panel.js                       28059 B  ->     9794 B
  privacy.html                    6603 B  ->     2852 B
  src/capture.js                  7362 B  ->     2784 B
  src/clipboard.js               11006 B  ->     3745 B
  src/content.js                 11590 B  ->     4066 B
  src/filter.js                   7459 B  ->     2482 B
  src/formatter.js               10796 B  ->     3665 B
  src/i18n.js                     8748 B  ->     3487 B
  src/render.js                  10449 B  ->     3760 B
  src/selection.js                7289 B  ->     2747 B
  src/store.js                    5876 B  ->     2586 B
  styles/panel.css                7090 B  ->     2179 B

-- 体积 --
条目数:              21
解压后总体积:        133658 B (130.53 KB)
ZIP 压缩后体积:      52392 B (51.16 KB)
门禁口径: 解压后总体积 < 204800 B (200 KB)
[PASS] 解压后总体积 < 200KB (133658 < 204800)

-- 依赖审计 --
扫描 .js 文件:       11
import specifiers:   ["./src/capture.js","./src/clipboard.js","./src/content.js","./src/filter.js","./src/formatter.js","./src/i18n.js","./src/render.js","./src/selection.js","./src/store.js"]
third-party deps = 0
[PASS] 全部 import specifier 均为相对路径（third-party deps = 0）

-- 读回校验 --
[PASS] zip 可解析，CRC32 全部通过，共 21 条目
[PASS] 读回条目数与打包一致 (21)
[PASS] 根 manifest.json 为合法 JSON
[PASS] manifest_version === 3
[PASS] permissions === ["clipboardWrite"]
[PASS] LICENSE 位于 zip 根
[PASS] 不含 butler/ tests/ docs/ scripts/ req.txt 等非发行内容
[PASS] 全部条目与磁盘源文件一一对应（无缺失/多余）

== RESULT: PASS (体积 / 依赖审计 / zip 读回 三项) ==
artifact: D:\xiaozhai.dev\chrome_extension2\dist\raw-copy-1.0.0.zip
EXIT=0
```

### 2) 独立解码交叉验证（.NET `System.IO.Compression.ZipFile`，非自研读回）
```
LICENSE  645  uncompressed=1088
devtools.html  249  uncompressed=296
...
styles/panel.css  2179  uncompressed=7090
TOTAL_ENTRIES=21
MANIFEST_HEAD={
  "manifest_version": 3,
  "name": "Raw Copy",
  "version"
EXIT=0
```
→ 外部真解码器能完整列出 21 条目、读回 `manifest.json`，证明 zip 合法且可直接 load unpacked。

### 3) 可复现性（sha256 两次运行逐字节一致）
```
before: 1657612ddccce6e0329963e549800a98cf232c27a55aa81b338803f4ab220366
after : 1657612ddccce6e0329963e549800a98cf232c27a55aa81b338803f4ab220366
```

### 4) 反向探针（证明依赖审计门禁非空跑）
临时写入 `extension/__probe_dep__.js`（`import lodash from 'lodash'`）：
```
probe exit=1 (expect 1)
third-party deps = 1
[FAIL] 发现第三方依赖: ["lodash"]
== RESULT: FAIL (1 项失败) ==
probe file removed: YES
```
删除探针后复跑 → `== RESULT: PASS`，且 sha256 恢复一致。

### 5) 回归门禁
```
$ node scripts/check-syntax.mjs
[check-syntax] 11/11 files passed           → EXIT=0

$ node --test "tests/**/*.test.mjs"
ℹ tests 123 | ℹ pass 123 | ℹ fail 0         → TEST_EXIT=0
```

## 自评
- [x] 符合 CONSTITUTION 红线（修改经 build + test 双验证；无 mock，真实读回校验）
- [x] 符合 conventions / 零第三方依赖（`node:zlib`、`node:fs`、`node:path`、`node:url`）
- [x] `extension/` 内源码**零改动**（只读打包）
- [x] 未引入 package-lock；package.json 仅新增 `package`，test/build/lint 原值保留
- [x] 体积门禁口径明确（解压后 < 200KB），压缩后体积同时打印
- [x] 依赖审计 `third-party deps = 0`，并有反向探针佐证
- [x] ZIP 读回三项（结构 / manifest / 无多余文件）全部 PASS
- [x] 输出可复现（固定时间戳，sha256 两次一致）

## 交付物清单（covers 对账）
- DEL-015：`dist/raw-copy-1.0.0.zip` ✅（21 条目，51.16KB 压缩 / 130.53KB 解压）
- DEL-016：完整源码 = `extension/**`（21 文件中的 20 个）+ `LICENSE` ✅（与 zip 条目一一对应）
- REQ-031：解压后 133658B < 204800B ✅
- REQ-032：`third-party deps = 0`，纯原生 JS ✅
- AC-017：体积达标 + 零第三方 + 纯原生 JS ✅
- AC-019（源码/ZIP 落点）：ZIP + 完整源码树对齐无缺失/多余 ✅

## 结论
TASK-014 完成：`scripts/package.mjs` 可复现打包 + 三重门禁；`dist/raw-copy-1.0.0.zip` 合法可加载；体积/依赖/读回全部 PASS；回归 123/123 无退化。
