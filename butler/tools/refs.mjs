#!/usr/bin/env node
// butler refs — 管理 .refs/ junction 与索引 butler/refs.md
// 用法: node butler/tools/refs.mjs add <name> <target> [purpose] | remove <name> | list
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmdirSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import { execFileSync } from "node:child_process"

const ROOT = process.env.BUTLER_PROJECT_ROOT || process.cwd()
const REFS = join(ROOT, ".refs")
const INDEX = join(ROOT, "butler", "refs.md")
const HEADER = "# 外部目录索引（.refs/）\n\n| name | target | 用途 | 更新日期 |\n|---|---|---|---|\n"

function readIndex() {
  if (!existsSync(INDEX)) return []
  const rows = []
  for (const line of readFileSync(INDEX, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/)
    if (!m) continue
    const name = m[1].trim()
    if (name === "name" || name.indexOf("-") === 0 || name.indexOf("空") >= 0) continue
    rows.push({ name: name, target: m[2].trim(), purpose: m[3].trim(), date: m[4].trim() })
  }
  return rows
}
function writeIndex(rows) {
  mkdirSync(join(ROOT, "butler"), { recursive: true })
  const body = rows.map(function (r) { return "| " + r.name + " | " + r.target + " | " + r.purpose + " | " + r.date + " |" }).join("\n")
  writeFileSync(INDEX, HEADER + (body ? body + "\n" : ""))
}
function today() {
  const d = new Date(); const p = function (n) { return String(n).padStart(2, "0") }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate())
}

const argv = process.argv.slice(2)
const cmd = argv[0], name = argv[1], target = argv[2], rest = argv.slice(3)
if (cmd === "add") {
  if (!name || !target) { console.error("用法: add <name> <target> [purpose]"); process.exit(1) }
  const abs = resolve(target)
  if (!existsSync(abs)) { console.error("目标不存在: " + abs); process.exit(1) }
  const PROTECTED = /[\\/](\.opencode2[\\/](state|data)|\.ssh|\.aws|\.kube|\.gnupg)([\\/]|$)|credentials\.json$|\.git-credentials$/i
  if (PROTECTED.test(abs)) { console.error("拒绝：目标是受保护目录/凭证，不可 junction 进项目: " + abs); process.exit(1) }
  mkdirSync(REFS, { recursive: true })
  const link = join(REFS, name)
  if (existsSync(link)) { console.error("已存在: " + link); process.exit(1) }
  if (process.platform === "win32") execFileSync("cmd", ["/c", "mklink", "/j", link, abs], { stdio: "inherit" })
  else execFileSync("ln", ["-s", abs, link], { stdio: "inherit" })
  const rows = readIndex().filter(function (r) { return r.name !== name })
  rows.push({ name: name, target: abs.replace(/\\/g, "/"), purpose: rest.join(" ") || "-", date: today() })
  writeIndex(rows)
  console.log("OK: .refs/" + name + " -> " + abs)
} else if (cmd === "remove") {
  if (!name) { console.error("用法: remove <name>"); process.exit(1) }
  const link = join(REFS, name)
  if (existsSync(link)) { try { rmdirSync(link) } catch (e) { execFileSync("cmd", ["/c", "rmdir", link]) } }
  writeIndex(readIndex().filter(function (r) { return r.name !== name }))
  console.log("OK: removed .refs/" + name)
} else if (cmd === "list") {
  const rows = readIndex()
  rows.forEach(function (r) { console.log((existsSync(join(REFS, r.name)) ? "[ok] " : "[missing] ") + r.name + " -> " + r.target + " (" + r.purpose + ")") })
  const present = existsSync(REFS) ? readdirSync(REFS) : []
  present.forEach(function (e) {
    if (e === ".gitignore") return
    if (!rows.some(function (r) { return r.name === e })) console.log("[untracked] " + e + " (未登记到 refs.md)")
  })
} else {
  console.log("用法: node butler/tools/refs.mjs add|remove|list ...")
}
