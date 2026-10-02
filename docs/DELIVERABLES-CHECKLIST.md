# 交付物齐全清单 — AC-019 逐项验收

> 交付物: **AC-019**（交付物齐全）· 覆盖 **DEL-016/015/011/012/010/013/014/017**
> 需求真源: `butler/spec/<slug>/requirement.md` §11（交付物清单）、AC-019
> 机器真源: `butler/spec/<slug>/spec.json`（DEL-010 ~ DEL-017）
> 里程碑: `docs/MILESTONES.md` M5（测试打包隐私交付）
> 生成角色: butler-doc-writer · 日期: 2026-10-02
> 判决图例: ✅ 通过（存在性 + 内容级判据均满足）｜⏳ 待办
>
> **本清单相对 checklist「A 段」的增强**：每项同时给出 **① 存在性判据**（文件/目录存在且非空）与
> **② 内容级可判定判据**（对文件内部字段/关键词做可机械复核的断言），消除「仅存在性检查」的判定缺口。

---

## 0. 判决汇总

| # | AC-019 条目 | spec ID | 主路径 | 存在性 | 内容级 | 判决 |
|:-:|-------------|:-------:|--------|:------:|:------:|:----:|
| 1 | 完整源码 | DEL-016 | `extension/**` | ✅ | ✅ | ✅ |
| 2 | 打包 ZIP | DEL-015 | `dist/raw-copy-1.0.0.zip` | ✅ | ✅ | ✅ |
| 3 | 安装说明 | DEL-011 | `INSTALL.md` + `docs/INSTALL.md` | ✅ | ✅ | ✅ |
| 4 | 使用说明 | DEL-012 | `USAGE.md` + `docs/USAGE.md` | ✅ | ✅ | ✅ |
| 5 | 隐私政策页面 | DEL-010 | `extension/privacy.html` | ✅ | ✅ | ✅ |
| 6 | 测试用例 | DEL-013 | `tests/test-cases.md` + `tests/README.md` | ✅ | ✅ | ✅ |
| 7 | LICENSE | DEL-014 | `LICENSE` | ✅ | ✅ | ✅ |
| 8 | 图标 | DEL-017 | `extension/icons/icon{16,32,48,128}.png` | ✅ | ✅ | ✅ |

> **AC-019 判决：✅ 通过（8/8 项齐全）**。

---

## 1. 完整源码（DEL-016）

**路径**：`extension/`（扩展根 = 该子目录，ADR-010）

**① 存在性判据**

```bash
$ for f in extension/manifest.json extension/devtools.html extension/devtools.js \
    extension/panel.html extension/panel.js extension/privacy.html \
    extension/styles/panel.css extension/src/{capture,store,render,filter,selection,formatter,content,clipboard,i18n}.js; do
    [ -f "$f" ] && echo "OK  $f" || echo "MISS $f"; done
```
真实结果：全部 `OK`（17 个源码文件齐备：MVP 清单 1 + DevTools 注册 2 + 面板 2 + 样式 1 + 隐私页 1 + `src/` 9 + …）。

**② 内容级判据**
- `manifest_version === 3`、`devtools_page === "devtools.html"`、`permissions === ["clipboardWrite"]` —— 由 `scripts/check-manifest.mjs` 机械断言 **17/17 PASS**。
- 全部 `extension/**/*.js` 语法正确 —— `scripts/check-syntax.mjs` **11/11 PASS**。
- 无网络调用、无持久化、无遥测 —— `scripts/check-zero-network.mjs` **17/17 PASS**。

**判决**：✅（`check-manifest.mjs` 17/17、`check-syntax.mjs` 11/11、`check-zero-network.mjs` 17/17）

---

## 2. 打包 ZIP（DEL-015）

**路径**：`dist/raw-copy-1.0.0.zip`

**① 存在性判据**

```bash
$ test -f dist/raw-copy-1.0.0.zip && echo "EXISTS" && ls -l dist/raw-copy-1.0.0.zip
-rw-r--r-- 1 boyce 197121 52392 ... dist/raw-copy-1.0.0.zip
```

**② 内容级判据**（手工解析 zip 结构：条目名 + 解压体积）

```bash
$ node -e "…解析 local file header…"
条目数 = 21
 - LICENSE (645 compressed)
 - manifest.json (334 compressed)
 - devtools.html / devtools.js / panel.html / panel.js / privacy.html
 - src/capture.js … src/store.js (9 个 src 模块)
 - styles/panel.css / icons/icon{16,32,48,128}.png
解压总字节 = 133658 => 130.53 KB
压缩总字节 = 50214 => 49.04 KB
体积门禁 <200KB : PASS
```

- **21 条目**；`manifest.json` 位于 zip 根（可直接 `load unpacked` 解压使用）。
- 仅含 `extension/**` + `LICENSE`（`butler/`、`docs/`、`req.txt` 未打包，ADR-010/011）。
- 解压 **130.53 KB < 200 KB**（AC-017 体积门禁 PASS）。

**判决**：✅（21 条目、manifest 于根、130.53KB < 200KB）

---

## 3. 安装说明（DEL-011）

**路径**：`INSTALL.md`（镜像 `docs/INSTALL.md`）

**① 存在性判据**

```bash
$ for f in INSTALL.md docs/INSTALL.md; do [ -f "$f" ] && echo "OK  $f"; done
OK  INSTALL.md
OK  docs/INSTALL.md
$ cmp -s INSTALL.md docs/INSTALL.md && echo "镜像一致 ✅"
镜像一致 ✅
```

**② 内容级判据**

```bash
$ grep -nE "chrome://extensions|edge://extensions|加载已解压" INSTALL.md
26:| 扩展清单页 | Chrome 用 `chrome://extensions`；Edge 用 `edge://extensions` |
27:| 构建 | 无需构建，直接「加载已解压的扩展程序」 |
42:4. **点击「加载已解压的扩展程序 / Load unpacked」**。
43:5. **选择目录**：…选中本仓库的 **`extension/`** 子目录 …
```
- 覆盖 Chrome 与 Edge 两个清单页地址；含「加载已解压」完整步骤；明确指向 `extension/` 子目录。
- 128 行，含排障小节（选错目录的说明）。

**判决**：✅（双端清单页 + 加载步骤 + `extension/` 指向，镜像一致）

---

## 4. 使用说明（DEL-012）

**路径**：`USAGE.md`（镜像 `docs/USAGE.md`）

**① 存在性判据**

```bash
$ cmp -s USAGE.md docs/USAGE.md && echo "镜像一致 ✅"
镜像一致 ✅
```

**② 内容级判据**

```bash
$ grep -nE "搜索|过滤|复制|模式|敏感" USAGE.md
4:> 安装步骤见仓库根 `INSTALL.md`。本文覆盖 9 类操作：**打开面板 / 搜索 / 过滤 / 选中 / 复制 / 右键菜单复制 / 多选批量复制 / 双击查看明细 / 模式切换**。
5:> 核心承诺：**不美化 JSON、不改动原始响应体**；**单条复制仍为默认与主要场景**，另新增右键、多选批量与双击查看能力。
18:- 面板自上而下依次为：**工具栏**（搜索框 + 方法 / 状态码 / 资源类型过滤下拉 + 多选工具栏 + 复制模式按钮）、**请求列表**（表头：方法 / URL / 状态 / 类型 / 耗时 / 大小 / 时间）…
24:## 2. 搜索
```
- 覆盖 安装→面板→搜索→过滤→选中→单条复制→右键菜单复制→多选批量复制→双击查看明细→模式切换 全流程；282 行（v1.1.0）。
- 含「不美化 JSON / 不改动原始响应体 / 单条隔离」核心承诺与敏感信息相关说明；单条复制为默认主场景，**多选批量复制**为独立入口（需求覆盖声明见 §12）。

**判决**：✅（全流程操作说明 + 核心承诺，镜像一致）

---

## 5. 隐私政策页面（DEL-010）

**路径**：`extension/privacy.html`

**① 存在性判据**

```bash
$ test -f extension/privacy.html && echo "EXISTS"
EXISTS
```

**② 内容级判据**（AC-020 三项声明 + 敏感信息警示）

```bash
$ grep -o "不收集[^<，。]*" extension/privacy.html   # → 不收集数据 / 不收集任何数据
$ grep -o "不传输[^<，。]*" extension/privacy.html   # → 不传输数据 / 不传输任何用户数据
$ grep -o "本地[^<，。]*完成" extension/privacy.html  # → 本地完成
$ grep -n "敏感" extension/privacy.html
162:      <p class="notice__title">敏感信息警示</p>
165:        <span class="policy__code">Cookie</span>、Token、密码等敏感信息。
```
- 三项声明齐全：**不收集数据 / 不传输数据 / 全部本地完成**（AC-020）。
- 含「敏感信息警示」区块（Cookie / Token / 密码），由 panel 经 `chrome.runtime.getURL('privacy.html')` 打开。

**判决**：✅（三声明 + 敏感信息警示齐全）

---

## 6. 测试用例（DEL-013）

**路径**：`tests/test-cases.md` + `tests/README.md` + `tests/*.test.mjs`（可执行单测）

**① 存在性判据**

```bash
$ for f in tests/test-cases.md tests/README.md; do [ -f "$f" ] && echo "OK  $f"; done
OK  tests/test-cases.md
OK  tests/README.md
$ ls tests/*.test.mjs | wc -l
9
```

**② 内容级判据**

```bash
$ grep -oE "AC-0[0-9]{2}" tests/test-cases.md | sort -u | wc -l
22                       # AC-001..AC-022 全覆盖
$ grep -n "checklist §C 边界用例矩阵（16 项，全覆盖）" tests/test-cases.md
71:## 2. checklist §C 边界用例矩阵（16 项，全覆盖）
$ grep -c -E "\b(test|it)\(" tests/*.test.mjs | awk -F: '{s+=$2} END {print s}'
123                      # 123 个可执行单元用例
$ node --test "tests/**/*.test.mjs" | tail -6
ℹ tests 123
ℹ pass 123
ℹ fail 0
```
- 用例矩阵逐条绑定 **AC-001..AC-022（22/22）** + checklist §C **16/16 边界**；16 条手工 E2E 索引（E2E-01..16）。
- **123 个可执行单测全 PASS**（9 个测试文件）。

**判决**：✅（AC 22/22、边界 16/16、单测 123/123 PASS）

---

## 7. LICENSE（DEL-014）

**路径**：`LICENSE`

**① 存在性判据**

```bash
$ test -f LICENSE && echo "EXISTS" && wc -l LICENSE
EXISTS
21 LICENSE
```

**② 内容级判据**

```bash
$ head -3 LICENSE
MIT License

Copyright (c) 2026 Raw Copy Extension Contributors
```
- 采用 **MIT License**（requirement §8 / DEL-014 允许 MIT 或 Apache-2.0），许可证正文完整。

**判决**：✅（MIT 许可证正文完整）

---

## 8. 图标（DEL-017）

**路径**：`extension/icons/icon{16,32,48,128}.png`

**① 存在性判据**

```bash
$ ls -l extension/icons/
-rw-r--r-- 1233 icon128.png
-rw-r--r--  267 icon16.png
-rw-r--r--  417 icon32.png
-rw-r--r--  459 icon48.png
```

**② 内容级判据**
- `manifest.json#icons` 声明 16/32/48/128 四个键，且各指向实际存在的 PNG。
- `scripts/check-manifest.mjs` 逐项断言 → **4/4 图标存在 PASS**。

```bash
[PASS] icons["16"] 文件存在  (icons/icon16.png → found)
[PASS] icons["32"] 文件存在  (icons/icon32.png → found)
[PASS] icons["48"] 文件存在  (icons/icon48.png → found)
[PASS] icons["128"] 文件存在  (icons/icon128.png → found)
```

**判决**：✅（4 枚 PNG 存在且被 manifest 声明）

---

## 9. 复现命令（一键自检）

```bash
# 存在性 + 内容级完整自检（零第三方依赖）
node scripts/check-manifest.mjs       # 17/17  AC-009 权限门禁 + devtools_page + 图标
node scripts/check-syntax.mjs         # 11/11  extension/**/*.js 语法
node scripts/check-zero-network.mjs   # 17/17  AC-008/020 零网络 + 无持久化 + 无遥测
node scripts/check-panel-shell.mjs    # 34/34  AC-012/016 面板外壳 + i18n
node --test "tests/**/*.test.mjs"     # 123/123 单元用例
node -e "…zip 条目 + 解压体积测量…"    # 21 条目、130.53KB < 200KB
```

| 门禁 | 结果 |
|------|:----:|
| `check-manifest.mjs` | ✅ 17/17 |
| `check-syntax.mjs` | ✅ 11/11 |
| `check-zero-network.mjs` | ✅ 17/17 |
| `check-panel-shell.mjs` | ✅ 34/34 |
| `node --test` | ✅ 123/123 |
| ZIP 体积 | ✅ 130.53KB < 200KB |

---

## 10. 结论与遗留

- **AC-019 交付物齐全：✅ 通过（8/8）**，对应 DEL-016/015/011/012/010/013/014/017 均满足存在性 + 内容级判据。
- **遗留（不阻塞 AC-019）**：AC-018 的 Chrome/Edge 双端浏览器安装冒烟属手工 E2E（`tests/test-cases.md` E2E-16），当前 ⏳；AC-017 体积已机械验证 PASS。
- 本清单与 `docs/MILESTONES.md`（M1–M5）共同构成 DEL-018 / AC-019 的交付证据。

<!-- butler:covers AC-019 DEL-010 DEL-011 DEL-012 DEL-013 DEL-014 DEL-015 DEL-016 DEL-017 -->
