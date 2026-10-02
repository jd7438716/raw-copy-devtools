# 纠错记录

> 老板的纠错反馈。每条带计数器。
> count >= 3 → 提示老板升级为 Edict
> 升级为 Edict 后标记 [promoted: E00X]

## 格式
每条纠错:
  - id: C{递增编号}
    text: "{纠错内容}"
    count: 0
    first_seen: {日期}
    last_seen: {日期}
    status: active|promoted|resolved|overturned|reference_stale
    source: boss

---

## 记录
> 首次为空，运行时由 butler-full 自动识别并写入
