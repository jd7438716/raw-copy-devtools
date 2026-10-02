# butler-config-changer — 学习记录

> per CONSTITUTION §X：`butler/learned/{agent-file-name}.md`
> rounds: 1 | level: novice

## 经验

### 2026-10-02 — TASK-011 manifest 版本 bump
- 项目非 git 仓库：基线对比改用磁盘副本 + `diff` + normalize 后 `cmp`（`sed` 还原 version 再逐字节比对）。
- 门禁脚本可能硬编码版本号（`scripts/check-manifest.mjs:99`）。**版本 bump 前必查所有门禁脚本是否锚定旧版本**，否则 bump 即 FAIL。
- 静态扫描门禁「零 X 引用」时，注释里的关键字会造成假阳性。判定口径：按文件类型区分（`-g '*.js' -g '*.html'`）或剔注释。
- 反向探针做法：临时注入违规文件 → 跑门禁期待 exit 1 → **确保删除** → 复跑期待 exit 0。清理必须可验证（`[ -f ]` 检查）。

## 技能缺口 (needs)

- （暂无）
