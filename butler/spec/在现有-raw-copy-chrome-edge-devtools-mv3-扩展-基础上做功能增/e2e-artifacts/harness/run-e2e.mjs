/**
 * run-e2e.mjs — Raw Copy 增强版浏览器级 E2E 执行器（TASK-016）
 *
 * 真实 Chromium（Chrome / Edge）+ Extensions.loadUnpacked 加载 `extension/`，
 * 打开 `panel.html`（真实发行代码），仅桥接 `chrome.devtools.network.onRequestFinished`
 * 事件源与可观测 clipboard 包装；其余 normalize/store/render/selection/multiselect/
 * contextmenu/bulkformatter/detail/formatter/clipboard/i18n 全部为真实代码。
 *
 * 产出：e2e-artifacts/results-<browser>.json + 截图 + 控制台日志。
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { waitForEndpoint, listTargets, CDP, sleep } from './cdp.mjs';

const ROOT = process.cwd();
const EXT = path.join(ROOT, 'extension');
const SRC = path.join(EXT, 'src');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BROWSERS = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
};
const PORTS = { chrome: 9351, edge: 9352 };

/* ---------- Node 侧 oracle：复用真实冻结模块计算期望产物 ---------- */
const { normalize } = await import(pathToFileURL(path.join(SRC, 'capture.js')).href);
const { buildCopyText, MODE_A, MODE_B } = await import(pathToFileURL(path.join(SRC, 'formatter.js')).href);
const { classifyBody } = await import(pathToFileURL(path.join(SRC, 'content.js')).href);

function resolveBody(rec) {
  const c = classifyBody(rec.responseContent);
  if (c.kind === 'text' || c.kind === 'base64-text') return c.text;
  if (c.kind === 'binary' || c.kind === 'base64-omitted') return c.placeholder;
  return '（响应体不可用）';
}

/* ---------- HAR fixtures ---------- */
const HAR1 = {
  request: {
    method: 'POST', url: 'https://api.example.com/login', httpVersion: 'HTTP/2',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Authorization', value: 'Bearer token-123' },
    ],
    postData: { text: '{"user":"alice","pw":"s3cret"}' },
  },
  response: {
    status: 200, statusText: 'OK',
    headers: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'X-Trace-Id', value: 'trace-abc' },
    ],
    content: { text: '{"code":0,"msg":"ok"}', encoding: null, mimeType: 'application/json', size: 20 },
  },
  time: 123.4, startedDateTime: '2026-10-02T10:00:00.000Z', _resourceType: 'xhr',
};
const HAR2 = {
  request: {
    method: 'GET', url: 'https://api.example.com/users', httpVersion: 'HTTP/1.1',
    headers: [{ name: 'Accept', value: 'text/html' }],
  },
  response: {
    status: 404, statusText: 'Not Found',
    headers: [{ name: 'Content-Type', value: 'text/html' }],
    content: { text: 'not found', encoding: null, mimeType: 'text/html', size: 9 },
  },
  time: 42.1, startedDateTime: '2026-10-02T10:00:01.000Z', _resourceType: 'fetch',
};
const HAR3 = {
  request: { method: 'GET', url: 'https://cdn.example.com/img.png', httpVersion: 'HTTP/2', headers: [] },
  response: {
    status: 200, statusText: 'OK',
    headers: [{ name: 'Content-Type', value: 'image/png' }],
    content: {
      text: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      encoding: 'base64', mimeType: 'image/png', size: 2048,
    },
  },
  time: 88.0, startedDateTime: '2026-10-02T10:00:02.000Z', _resourceType: 'Other',
};
const HAR4 = {
  request: { method: 'GET', url: 'https://cdn.example.com/raw.png', httpVersion: 'HTTP/2', headers: [] },
  response: {
    status: 200, statusText: 'OK',
    headers: [{ name: 'Content-Type', value: 'image/png' }],
    content: { text: 'PNGDATA', encoding: null, mimeType: 'image/png', size: 2048 },
  },
  time: 12.0, startedDateTime: '2026-10-02T10:00:03.000Z', _resourceType: 'Other',
};
const FIX = [HAR1, HAR2, HAR3];
const REC = FIX.map((h) => normalize(h)); // id null
const EXP_A = REC.map((r) => buildCopyText(r, MODE_A, { responseBody: resolveBody(r) }));
const EXP_B = REC.map((r) => buildCopyText(r, MODE_B, { responseBody: resolveBody(r) }));
const REC4 = normalize(HAR4);
const EXP_A4 = buildCopyText(REC4, MODE_A, { responseBody: resolveBody(REC4) });

/* ---------- 注入脚本（页面加载前） ---------- */
const INIT = String.raw`(() => {
  try {
    const listeners = [];
    const network = { onRequestFinished: {
      addListener(fn){ listeners.push(fn); },
      removeListener(fn){ const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }
    }};
    let mockOk = false, mockErr = null;
    try { chrome.devtools = { network }; mockOk = true; }
    catch (e) { mockErr = String(e); }
    if (!mockOk) {
      try { Object.defineProperty(chrome, 'devtools', { value: { network }, configurable: true, writable: true }); mockOk = true; }
      catch (e2) { mockErr = String(e2); }
    }
    window.__rcMock = { ok: mockOk, err: mockErr, listeners };
    window.__rcFeed = function (entry) {
      for (const fn of listeners.slice()) { try { fn(entry); } catch (e) { window.__rcFeedErr = String(e); } }
    };
  } catch (e) { window.__rcInitErr = String(e); }

  window.__rcClipboardLog = [];
  window.__rcExecLog = [];
  try {
    const clip = navigator.clipboard;
    const orig = clip && clip.writeText ? clip.writeText.bind(clip) : null;
    window.__rcOrigWriteText = !!orig;
    Object.defineProperty(clip, 'writeText', { configurable: true, writable: true, value: function (t) {
      window.__rcClipboardLog.push({ via: 'writeText', text: String(t) });
      if (orig) return orig(t);
      return Promise.reject(new Error('no orig writeText'));
    }});
  } catch (e) { window.__rcClipWrapErr = String(e); }
  try {
    const origExec = document.execCommand ? document.execCommand.bind(document) : null;
    if (origExec) document.execCommand = function (cmd) {
      const r = origExec.apply(document, arguments);
      if (cmd === 'copy') window.__rcExecLog.push({ ok: r });
      return r;
    };
  } catch (e) { window.__rcExecWrapErr = String(e); }
})();`;

/* ---------- 工具 ---------- */
function readClipFile() {
  const f = path.join(os.tmpdir(), 'rawcopy-clip.txt');
  try {
    execSync(
      `powershell.exe -NoProfile -Command "[System.IO.File]::WriteAllText('${f.replace(/\\/g, '\\\\')}', [String](Get-Clipboard -Raw), (New-Object System.Text.UTF8Encoding($false)))"`,
      { encoding: 'utf8' },
    );
    let t = fs.readFileSync(f, 'utf8');
    return t;
  } catch (e) {
    return null;
  }
}

class Run {
  constructor(browser, cdp, sid) {
    this.browser = browser;
    this.cdp = cdp;
    this.sid = sid;
    this.checks = [];
    this.console = [];
    this.errors = [];
    this.shots = [];
  }

  async eval(expr, awaitPromise = false) {
    const r = await this.cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, this.sid);
    if (r.exceptionDetails) {
      throw new Error('page eval error: ' + (r.exceptionDetails.text || '') + ' :: ' + String(expr).slice(0, 140));
    }
    return r.result ? r.result.value : undefined;
  }

  async j(expr, awaitPromise = false) {
    const v = await this.eval(`JSON.stringify(${expr})`, awaitPromise);
    return JSON.parse(v);
  }

  async waitClip(timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const n = await this.eval('window.__rcClipboardLog.length');
      if (n > 0) return true;
      await sleep(80);
    }
    return false;
  }

  async sampleClip(label) {
    await this.waitClip();
    const intended = await this.eval('window.__rcClipboardLog.length ? window.__rcClipboardLog[window.__rcClipboardLog.length-1].text : null');
    const target = (intended || '').replace(/\r\n/g, '\n');
    // 轮询真实系统剪贴板（readText 读的是 OS 剪贴板；Windows 会做 LF→CRLF 规范化）
    let osText = null;
    const start = Date.now();
    while (Date.now() - start < 3500) {
      osText = await this.eval('navigator.clipboard.readText().then(t=>t).catch(e=>"__READERR__:"+e.message)', true);
      if (typeof osText === 'string' && osText.replace(/\r\n/g, '\n') === target) break;
      await sleep(120);
    }
    const readNorm = (osText || '').replace(/\r\n/g, '\n');
    // OS 系统剪贴板（PowerShell Get-Clipboard）——真实系统剪贴板真源
    const osFile = readClipFile() || '';
    const osNorm = osFile.replace(/\r\n/g, '\n');
    const osMatched = osNorm === target || osNorm.replace(/\n$/, '') === target;
    const toast = await this.j('({text:document.querySelector("#toast").textContent, cls:document.querySelector("#toast").className, vis:document.querySelector("#toast").getAttribute("data-visible")})');
    return {
      label, intended, osText, osFile,
      norm: osNorm, osMatched,
      readNorm, readTextMatched: readNorm === target,
      toast,
    };
  }

  async resetClip() {
    await this.eval('window.__rcClipboardLog.length = 0; window.__rcExecLog.length = 0; "reset"');
  }

  async screenshot(name) {
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const r = await this.cdp.send('Page.captureScreenshot', { format: 'png' }, this.sid);
        const buf = Buffer.from(r.data, 'base64');
        const file = path.join(OUT, name);
        fs.writeFileSync(file, buf);
        this.shots.push({ name, bytes: buf.length });
        return file;
      } catch (e) {
        lastErr = e;
        await sleep(500);
      }
    }
    this.shots.push({ name, bytes: 0, error: String(lastErr && lastErr.message) });
    return null;
  }

  add(key, name, expected, actual, pass, evidence) {
    this.checks.push({ key, name, expected, actual, pass: !!pass, evidence: evidence || '' });
  }
}

/* ---------- 单浏览器执行 ---------- */
async function runBrowser(name) {
  const exe = BROWSERS[name];
  const port = PORTS[name];
  const userDataDir = path.join(os.tmpdir(), `rawcopy-e2e-${name}-${port}`);
  fs.rmSync(userDataDir, { recursive: true, force: true });
  const child = spawn(exe, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--enable-unsafe-extension-debugging',
    'about:blank',
  ], { stdio: 'ignore' });
  const out = { browser: name, exe, port, startedAt: new Date().toISOString(), checks: [], console: [], errors: [], shots: [], clipboardSamples: [], env: {} };
  let cdp = null;
  try {
    const version = await waitForEndpoint(port, 30000);
    out.env.browserVersion = version.Browser;
    cdp = await CDP.connect(version.webSocketDebuggerUrl);
    const { id } = await cdp.send('Extensions.loadUnpacked', { path: EXT });
    out.env.extensionId = id;
    await sleep(2500);

    // 打开面板页（注入 mock 后再导航）
    const t = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const sid = (await cdp.send('Target.attachToTarget', { targetId: t.targetId, flatten: true })).sessionId;
    out.targetId = t.targetId;
    cdp.on(sid, 'Runtime.consoleAPICalled', (p) => {
      const text = (p.args || []).map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type)).join(' ');
      out.console.push({ type: p.type, text });
      if (p.type === 'error') out.errors.push({ kind: 'console.error', text });
    });
    cdp.on(sid, 'Runtime.exceptionThrown', (p) => {
      const d = p.exceptionDetails || {};
      out.errors.push({ kind: 'exception', text: d.text || '', desc: (d.exception && d.exception.description) || '' });
    });
    cdp.on(sid, 'Log.entryAdded', (p) => {
      const e = p.entry || {};
      out.console.push({ type: e.level, source: e.source, text: e.text });
      if (e.source === 'security' || /Content Security Policy/i.test(e.text || '')) {
        out.errors.push({ kind: 'csp/log', source: e.source, text: e.text });
      }
      if (e.level === 'error' && e.source !== 'security') out.errors.push({ kind: 'log.error', source: e.source, text: e.text });
    });

    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Log.enable', {}, sid);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT }, sid);
    await cdp.send('Page.navigate', { url: `chrome-extension://${id}/panel.html` }, sid);
    await sleep(1800);
    await cdp.send('Page.bringToFront', {}, sid);
    try {
      await cdp.send('Browser.grantPermissions', { origin: `chrome-extension://${id}`, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
    } catch (_e) { /* ignore */ }

    const R = new Run(name, cdp, sid);
    out.run = R;

    // 等面板 init 完成
    let ready = false;
    for (let i = 0; i < 40; i += 1) {
      const ok = await R.eval('!!(document.querySelector("#multiselect-actions") && document.querySelector("#multiselect-actions").hidden === false)');
      if (ok) { ready = true; break; }
      await sleep(150);
    }
    out.env.panelReady = ready;

    const mock = await R.j('window.__rcMock');
    out.env.mock = { ok: mock.ok, err: mock.err, listeners: mock.listeners.length };
    R.add('ENV', 'mock chrome.devtools 桥接 + 真实 installCapture 注册监听', 'listeners === 1', `listeners=${mock.listeners.length}`, mock.ok && mock.listeners.length === 1);

    // 控制台采集自证：注入一条探针，确认 Runtime.consoleAPICalled 采集链可用
    await R.eval('console.info("[E2E-CONSOLE-PROBE]"); "probe"');
    await sleep(300);
    out.env.consoleProbeCaptured = out.console.some((c) => (c.text || '').includes('[E2E-CONSOLE-PROBE]'));

    // 喂 3 条记录
    await R.eval(`window.__rcClipboardLog.length=0; ${FIX.map((h) => `window.__rcFeed(${JSON.stringify(h)});`).join('')} "fed"`);
    await sleep(600);
    const rowInfo = await R.j('[...document.querySelectorAll("#list-body .row")].map(r=>({id:r.getAttribute("data-id"), idx:r.getAttribute("data-index"), url:r.children[1].textContent, status:r.children[2].textContent}))');
    R.add('ENV', '捕获→归一化→store→渲染 3 条记录', '3 行，data-id=1/2/3', JSON.stringify(rowInfo), rowInfo.length === 3);

    /* ============ G-1 聚焦复验：复制选中按钮文案插值（N=0） ============ */
    // 冻结预期：t('multi.copySelected',{count}) → 中文 `复制选中(N)` / 英文 `Copy Selected (N)`；
    // 绝不出现字面量 `{count}`；N=0 时 disabled=true，N≥1 时 disabled=false。
    const G1_RE = /^(复制选中|Copy Selected)\((\d+)\)$/;
    const g1_btn = '(()=>{const b=document.querySelector("#copy-selected-btn");return {text:b.textContent, disabled:b.disabled};})()';
    const g1_n0 = await R.j(g1_btn);
    const g1N0Ok = G1_RE.test(g1_n0.text) && !g1_n0.text.includes('{count}') && /\(0\)$/.test(g1_n0.text) && g1_n0.disabled === true;
    R.add('G-1a', '复制选中按钮 N=0：文案=复制选中(0)/Copy Selected (0)，无字面量 {count}，disabled=true',
      'text 匹配 /^(复制选中|Copy Selected)\\(0\\)$/ 且 disabled=true 且不含 {count}',
      `text='${g1_n0.text}', disabled=${g1_n0.disabled}`, g1N0Ok);
    await R.screenshot(`E2E-g1-n0-${name}.png`);

    /* ================= AC-001 ================= */
    await R.eval('window.__rcClipboardLog.length=0;');
    const ctxRes = await R.eval(`(()=>{const el=document.querySelector('#list-body .row[data-id="1"]'); if(!el) return 'NOROW'; el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160,button:2})); return 'ok';})()`);
    await sleep(200);
    const menu = await R.j('(()=>{const m=document.querySelector("#context-menu");return {hidden:m.hidden, left:m.style.left, top:m.style.top, items:[...m.querySelectorAll("button")].map(b=>({id:b.id,action:b.getAttribute("data-action"),text:b.textContent,disabled:b.disabled}))};})()');
    const rowSel = await R.j('(()=>{const r=document.querySelector(\'#list-body .row[data-id="1"]\');return {cls:r.className, aria:r.getAttribute("aria-selected")};})()');
    const hasMain = menu.items.some((i) => i.id === 'copy-request-response' && i.text === '复制请求 + 响应（原始）');
    R.add('AC-001', '右键行 → 行被选中 + 面板内菜单弹出且含主项', 'menu.hidden=false 且含「复制请求 + 响应（原始）」；该行 is-selected',
      `menu.hidden=${menu.hidden}, items=${JSON.stringify(menu.items.map((i) => i.id))}, row.cls='${rowSel.cls}', aria=${rowSel.aria}`,
      ctxRes === 'ok' && menu.hidden === false && hasMain && rowSel.cls.includes('is-selected') && rowSel.aria === 'true',
      JSON.stringify(menu));

    /* ============ G-1 聚焦复验：右键选中 1 条后文案（N=1） ============ */
    const g1_n1 = await R.j(g1_btn);
    const g1N1Ok = G1_RE.test(g1_n1.text) && !g1_n1.text.includes('{count}') && /\(1\)$/.test(g1_n1.text) && g1_n1.disabled === false;
    R.add('G-1b', '复制选中按钮 N=1：文案=复制选中(1)，无字面量 {count}，disabled=false（使能）',
      'text 匹配 /^(复制选中|Copy Selected)\\(1\\)$/ 且 disabled=false 且不含 {count}',
      `text='${g1_n1.text}', disabled=${g1_n1.disabled}`, g1N1Ok);
    await R.screenshot(`E2E-ctx-menu-${name}.png`);

    /* ================= AC-002 模式 A ================= */
    await R.resetClip();
    await R.eval('document.querySelector("#copy-request-response").click(); "clicked"');
    const menuA = await R.sampleClip('AC-002 menu mode A');
    out.clipboardSamples.push(menuA);
    await sleep(150);

    await R.resetClip();
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); document.querySelector('#copy-btn').click(); return 'ok';})()`);
    const btnA = await R.sampleClip('AC-002 button mode A');
    out.clipboardSamples.push(btnA);

    const aMenuEqBtn = menuA.intended === btnA.intended;
    const aOsEq = menuA.norm === btnA.norm;
    const aOracle = menuA.intended === EXP_A[0];
    R.add('AC-002', '模式 A：菜单主项剪贴板产物 === 底部 #copy-btn 产物（逐字符）',
      'intended(menuA)===intended(btnA) 且双双等于冻结 formatter 期望；真实剪贴板（LF 规范化后）亦相等',
      `menu===btn:${aMenuEqBtn}, OSclipboard(menu)===OSclipboard(btn):${aOsEq}, menuOsMatched:${menuA.osMatched}, btnOsMatched:${btnA.osMatched}, ===oracle:${aOracle}`,
      aMenuEqBtn && aOsEq && menuA.osMatched && btnA.osMatched && aOracle,
      'menuA=' + JSON.stringify((menuA.intended || '').slice(0, 80)) + '…');

    /* ================= ③ 移除分段复制（REQ-008 / AC-009） ================= */
    await R.eval(`(()=>{const el=document.querySelector('#list-body .row[data-id="1"]');el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 'ok';})()`);
    await sleep(150);
    const removedProbe = await R.j(`({
      p2MenuIds: [...document.querySelectorAll('#context-menu button')].map(b=>b.id).filter(id=>id==='copy-request-only'||id==='copy-response-only'),
      hasMain: !!document.querySelector('#copy-request-response'),
      domReqBtn: !!document.querySelector('#copy-req-btn'),
      domRespBtn: !!document.querySelector('#copy-resp-btn'),
      domToggle: !!document.querySelector('#mode-toggle'),
      hasModeA: !!document.querySelector('#copy-btn-a'),
      hasModeB: !!document.querySelector('#copy-btn-b'),
      modeAValue: document.querySelector('#copy-btn-a') ? document.querySelector('#copy-btn-a').getAttribute('data-copy-mode') : null,
      modeBValue: document.querySelector('#copy-btn-b') ? document.querySelector('#copy-btn-b').getAttribute('data-copy-mode') : null
    })`);
    await R.eval('window.__hideMenu = (()=>{const m=document.querySelector("#context-menu"); m.hidden=true; return 1;})()');
    R.add('AC-009b', '③ 分段复制移除：菜单无 P2 项、DOM 无 req/resp 按钮与 toggle；主项保留、A/B 按钮就位',
      'p2MenuIds=[]；domReqBtn/domRespBtn/domToggle=false；hasMain=true；hasModeA/B=true 且 data-copy-mode=A/B',
      JSON.stringify(removedProbe),
      removedProbe.p2MenuIds.length === 0 && removedProbe.hasMain === true &&
        removedProbe.domReqBtn === false && removedProbe.domRespBtn === false && removedProbe.domToggle === false &&
        removedProbe.hasModeA === true && removedProbe.hasModeB === true &&
        removedProbe.modeAValue === 'A' && removedProbe.modeBValue === 'B');

    /* ================= AC-008 双击明细 ================= */
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(300);
    const detail = await R.j('(()=>{const p=document.querySelector("#detail-pane");return {hidden:p.hidden, text:document.querySelector("#detail-body").textContent, hasCopyBtn: !!document.querySelector("#detail-copy-btn")};})()');
    const dtext = detail.text || '';
    const order = {
      reqLine: dtext.indexOf('POST https://api.example.com/login HTTP/2'),
      reqH1: dtext.indexOf('Content-Type: application/json'),
      reqH2: dtext.indexOf('Authorization: Bearer token-123'),
      reqBody: dtext.indexOf('[Request Body]'),
      reqBodyVal: dtext.indexOf('{"user":"alice","pw":"s3cret"}'),
      respLine: dtext.indexOf('HTTP/2 200 OK'),
      respH1: dtext.indexOf('Content-Type: application/json', dtext.indexOf('HTTP/2 200 OK')),
      respH2: dtext.indexOf('X-Trace-Id: trace-abc'),
      respBody: dtext.indexOf('[Response Body]'),
      respBodyVal: dtext.indexOf('{"code":0,"msg":"ok"}'),
    };
    const sixOrdered = order.reqLine >= 0 && order.reqH1 > order.reqLine && order.reqH2 > order.reqH1 &&
      order.reqBody > order.reqH2 && order.reqBodyVal > order.reqBody && order.respLine > order.reqBodyVal &&
      order.respH1 > order.respLine && order.respH2 > order.respH1 && order.respBody > order.respH2 && order.respBodyVal > order.respBody;
    R.add('AC-008', '双击行 → #detail-pane 打开，六要素齐全且顺序正确',
      '明细打开且 方法+URL/请求头/请求体/状态行/响应头/响应体 依次出现',
      `hidden=${detail.hidden}, order=${JSON.stringify(order)}`,
      detail.hidden === false && sixOrdered,
      'detailText.length=' + dtext.length);
    await R.screenshot(`E2E-detail-${name}.png`);

    /* ================= AC-009 明细保真 ================= */
    const aeqOracle = dtext === EXP_A[0];
    const endsWithBody = dtext.endsWith('{"code":0,"msg":"ok"}');
    const rawBodyIncl = dtext.includes('{"code":0,"msg":"ok"}') && !dtext.includes('{\n  "code"');
    // 头保持原序（不排序）：Content-Type 在 Authorization 之前
    const headersOrdered = dtext.indexOf('Content-Type: application/json') < dtext.indexOf('Authorization: Bearer token-123');
    const respHeadersOrdered = dtext.indexOf('Content-Type: application/json', order.respLine) < dtext.indexOf('X-Trace-Id: trace-abc');
    R.add('AC-009', '明细文本 === 冻结模式 A 产物；响应体逐字符原样；头保原序',
      'detailText===oracle(A) 且以响应体原文结尾且头未重排',
      `===oracle:${aeqOracle}, endsWithBody:${endsWithBody}, reqHeadersOrdered:${headersOrdered}, respHeadersOrdered:${respHeadersOrdered}`,
      aeqOracle && endsWithBody && rawBodyIncl && headersOrdered && respHeadersOrdered);
    // 二进制记录明细占位（真实 HAR 二进制 = base64 编码 + image/png）
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="3"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(250);
    const binText = await R.eval('document.querySelector("#detail-body").textContent');
    const binPh = '[Base64 content omitted: length 96]';
    const binPhOk = (binText || '').includes(binPh);
    const binNoLeak = !(binText || '').includes('iVBORw0KGgo');
    const binOracle = binText === EXP_A[2];
    R.add('AC-009b', '二进制（base64）响应明细复用 classifyBody：逐字符占位且不泄露原文',
      `${binPh} 且 ===oracle(A) 且不含 base64 原文`,
      `placeholder:${binPhOk}, noLeak:${binNoLeak}, ===oracle:${binOracle}`,
      binPhOk && binNoLeak && binOracle);

    /* ================= AC-010 关闭/单击不打开 ================= */
    // 先关闭当前（id3）明细
    await R.eval('document.querySelector("#detail-close").click(); "closed"');
    await sleep(150);
    const closedByBtn = await R.eval('document.querySelector("#detail-pane").hidden');
    // 单击不打开
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="2"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(200);
    const singleClick = await R.j('({detailHidden:document.querySelector("#detail-pane").hidden, row2Selected: document.querySelector(\'#list-body .row[data-id="2"]\').getAttribute("aria-selected")})');
    // dblclick 打开 → Esc 关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="2"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));document.querySelector('#list-body .row[data-id="2"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(200);
    const opened2 = await R.eval('document.querySelector("#detail-pane").hidden === false');
    await R.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); "esc"`);
    await sleep(150);
    const closedByEsc = await R.eval('document.querySelector("#detail-pane").hidden');
    // dblclick 打开 → 遮罩关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="2"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(200);
    const opened3 = await R.eval('document.querySelector("#detail-pane").hidden === false');
    await R.eval('document.querySelector(".detail-pane__backdrop").click(); "backdrop"');
    await sleep(150);
    const closedByBackdrop = await R.eval('document.querySelector("#detail-pane").hidden');
    R.add('AC-010', '明细可关闭返回；单击仅选中不打开（仅双击打开）',
      '关闭按钮/Esc/遮罩均隐藏抽屉；单击后 detail.hidden=true 且该行仍选中',
      `closeBtn:${closedByBtn}, singleClick(hidden=${singleClick.detailHidden}, row2sel=${singleClick.row2Selected}), escOpened:${opened2}/closed:${closedByEsc}, backdropOpened:${opened3}/closed:${closedByBackdrop}`,
      closedByBtn === true && singleClick.detailHidden === true && singleClick.row2Selected === 'true' &&
        opened2 === true && closedByEsc === true && opened3 === true && closedByBackdrop === true);

    /* ================= AC-011 明细内复制按钮 ================= */
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return 'ok';})()`);
    await sleep(250);
    await R.resetClip();
    await R.eval('document.querySelector("#detail-copy-btn").click(); "clicked"');
    const detailCopy = await R.sampleClip('AC-011 detail copy');
    out.clipboardSamples.push(detailCopy);
    const stillOpen = await R.eval('document.querySelector("#detail-pane").hidden === false');
    R.add('AC-011', '明细内「复制请求+响应」按钮产物 === 主按钮产物，且复制后不关闭详情',
      'detailCopy.intended === intendedA === btnA 且 detail 仍打开；真实剪贴板匹配',
      `detailCopy===oracle:${detailCopy.intended === EXP_A[0]}, ===btnA:${detailCopy.intended === btnA.intended}, osMatched:${detailCopy.osMatched}, norm===btnA:${detailCopy.norm === btnA.norm}, detailStillOpen:${stillOpen}`,
      detailCopy.intended === EXP_A[0] && detailCopy.intended === btnA.intended &&
        detailCopy.osMatched && detailCopy.norm === btnA.norm && stillOpen === true);
    await R.eval('document.querySelector("#detail-close").click();');

    /* ================= ② A/B 独立按钮（AC-008 / REQ-006/007） ================= */
    await R.resetClip();
    await R.eval('document.querySelector("#copy-btn-b").click(); "modeB"');
    const btnB = await R.sampleClip('AC-008 button mode B');
    await R.resetClip();
    await R.eval('document.querySelector("#copy-btn-a").click(); "modeA"');
    const btnA2 = await R.sampleClip('AC-008 button mode A');
    out.clipboardSamples.push(btnB, btnA2);
    const noToggle = await R.eval('document.querySelector("#mode-toggle") === null');
    R.add('AC-008', '② 模式 A/B 独立按钮：点 B 产模式 B、点 A 产模式 A；与冻结 oracle 一致；无 toggle 残留',
      'B===oracle(B)、A===oracle(A)、A≠B、#mode-toggle 不存在；真实剪贴板匹配',
      `===oracleB:${btnB.intended === EXP_B[0]}, ===oracleA:${btnA2.intended === EXP_A[0]}, A≠B:${btnA2.intended !== btnB.intended}, noToggle:${noToggle}, osB:${btnB.osMatched}, osA:${btnA2.osMatched}`,
      btnB.intended === EXP_B[0] && btnA2.intended === EXP_A[0] &&
        btnA2.intended !== btnB.intended && noToggle === true && btnB.osMatched && btnA2.osMatched);

    /* ================= 多选工具栏（标题要求，补充） ================= */
    const msVisible = await R.eval('document.querySelector("#multiselect-actions").hidden === false');
    await R.eval('document.querySelector("#select-all-btn").click(); "all"');
    await sleep(200);
    const msCount = await R.eval('document.querySelector("#selected-count").textContent');
    const msEnabled = await R.eval('document.querySelector("#copy-selected-btn").disabled === false');
    /* ============ G-1 聚焦复验：全选 3 条后文案（N=3） ============ */
    const g1_n3 = await R.j(g1_btn);
    const g1N3Ok = G1_RE.test(g1_n3.text) && !g1_n3.text.includes('{count}') && /\(3\)$/.test(g1_n3.text) && g1_n3.disabled === false;
    R.add('G-1c', '复制选中按钮 N=3：文案=复制选中(3)，无字面量 {count}，disabled=false（使能）',
      'text 匹配 /^(复制选中|Copy Selected)\\(3\\)$/ 且 disabled=false 且不含 {count}',
      `text='${g1_n3.text}', disabled=${g1_n3.disabled}`, g1N3Ok);
    await R.screenshot(`E2E-multiselect-${name}.png`);
    await R.resetClip();
    await R.eval('document.querySelector("#copy-selected-btn").click(); "copySel"');
    const bulk = await R.sampleClip('bulk copy 3');
    out.clipboardSamples.push(bulk);
    const bulkText = bulk.intended || '';
    const markerCount = (bulkText.match(/===== #\d+\/3 =====/g) || []).length;
    const bulkHasAll = REC.every((r, i) => bulkText.includes(buildCopyText(r, MODE_A, { responseBody: resolveBody(r) })));
    R.add('MS', '多选工具栏：全选→计数→复制选中(N) 输出 N 段无混淆（补充 AC-005/006 实机抽查）',
      '工具栏可见；全选后 count=3 且按钮启用；输出含 3 个 #i/3 标记且每段=单条产物',
      `visible=${msVisible}, count='${msCount}', enabled=${msEnabled}, markers=${markerCount}, blocksMatch=${bulkHasAll}`,
      msVisible === true && /3/.test(msCount || '') && msEnabled === true && markerCount === 3 && bulkHasAll);

    /* ================= AC-013 多选态右键批量入口（①） ================= */
    // 单击 id1 → Ctrl 点 id2 → 集合 {1,2}
    await R.eval(`(()=>{
      const row=(id)=>document.querySelector('#list-body .row[data-id="'+id+'"]');
      row(1).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      row(2).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));
      return 'sel2';
    })()`);
    await sleep(180);
    // 多选态右键命中集合内行 → 集合保留 + 批量项出现
    await R.eval(`(()=>{const el=document.querySelector('#list-body .row[data-id="1"]');el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 'ctx';})()`);
    await sleep(180);
    const ctxBatch = await R.j(`({
      hasBatch: !!document.querySelector('#copy-selected'),
      batchText: document.querySelector('#copy-selected') ? document.querySelector('#copy-selected').textContent : '',
      batchDisabled: document.querySelector('#copy-selected') ? document.querySelector('#copy-selected').disabled : null,
      countText: document.querySelector('#selected-count').textContent
    })`);
    await R.resetClip();
    await R.eval('document.querySelector("#copy-selected").click(); "batch"');
    const ctxBatchClip = await R.sampleClip('AC-013 ctx batch 2');
    out.clipboardSamples.push(ctxBatchClip);
    const ctxT = ctxBatchClip.intended || '';
    const ctxMarkers = (ctxT.match(/===== #\d+\/2 =====/g) || []).length;
    const ctxHas1 = ctxT.includes(buildCopyText(REC[0], MODE_A, { responseBody: resolveBody(REC[0]) }));
    const ctxHas2 = ctxT.includes(buildCopyText(REC[1], MODE_A, { responseBody: resolveBody(REC[1]) }));
    R.add('AC-013', '多选态右键命中集合内行 → 集合保留 + 菜单出现「复制选中(2)」→ 点击产出 2 段',
      'countText 含 2；hasBatch=true 且 enabled；输出 2 个 #i/2 标记且含两条单条产物；真实剪贴板匹配',
      `count='${ctxBatch.countText}', hasBatch=${ctxBatch.hasBatch}, batchText='${ctxBatch.batchText}', disabled=${ctxBatch.batchDisabled}, markers=${ctxMarkers}, has1=${ctxHas1}, has2=${ctxHas2}, osMatched=${ctxBatchClip.osMatched}`,
      ctxBatch.hasBatch === true && ctxBatch.batchDisabled === false && /2/.test(ctxBatch.countText || '') &&
        ctxMarkers === 2 && ctxHas1 && ctxHas2 && ctxBatchClip.osMatched === true);

    /* ================= AC-004 混合修饰键并集（①） ================= */
    await R.eval(`(()=>{
      const row=(id)=>document.querySelector('#list-body .row[data-id="'+id+'"]');
      row(1).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      row(2).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));
      row(3).dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true,shiftKey:true}));
      return 'mix';
    })()`);
    await sleep(180);
    const mixSel = await R.j('[...document.querySelectorAll("#list-body .row.is-selected")].map(r=>r.getAttribute("data-id"))');
    R.add('AC-004', '混合修饰键：Ctrl 选集 + Ctrl+Shift 扩选 = 并集（id3 不丢、先前 Ctrl 项保留）',
      '选中集合 size=3 且含 data-id 1/2/3',
      `selected=${JSON.stringify(mixSel)}`,
      Array.isArray(mixSel) && mixSel.length === 3 && ['1', '2', '3'].every((id) => mixSel.includes(id)));

    /* ================= AC-009c 非 base64 二进制分支 ================= */
    await R.eval(`window.__rcFeed(${JSON.stringify(HAR4)}); "add binary"`);
    await sleep(350);
    const domMax4 = await R.eval('Math.max(...[...document.querySelectorAll("#list-body .row")].map(r=>Number(r.getAttribute("data-id"))||0))');
    const binId = 4; // store 顺序 id：HAR1=1, HAR2=2, HAR3=3, HAR4=4
    const binOpened2 = await R.eval(`(async()=>{const m=await import('./panel.js'); return m.openDetail(${binId});})()`, true);
    await sleep(250);
    const binText2 = await R.eval('document.querySelector("#detail-body").textContent');
    const binExp2 = '[Binary content omitted: image/png, 2048 bytes]';
    R.add('AC-009c', '非 base64 图片正文 → 明细 [Binary content omitted] 逐字符占位',
      `包含 ${binExp2} 且 ===oracle(A)`,
      `domMax=${domMax4}, id=${binId}, open:${binOpened2}, contains:${(binText2 || '').includes(binExp2)}, ===oracle:${binText2 === EXP_A4}`,
      binOpened2 === true && (binText2 || '').includes(binExp2) && binText2 === EXP_A4);
    await R.eval('document.querySelector("#detail-close").click(); "close"');
    await sleep(150);

    /* ================= 边界：菜单关闭时机 ================= */
    const edgeResults = {};
    // 表头不弹
    await R.eval(`(()=>{const m=document.querySelector("#context-menu");m.hidden=true;document.querySelector(".list__header .col").dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:50,clientY:30}));return 1;})()`);
    await sleep(120);
    edgeResults.headerNoMenu = await R.eval('document.querySelector("#context-menu").hidden');
    // 空白不弹
    await R.eval(`(()=>{const m=document.querySelector("#context-menu");m.hidden=true;document.querySelector("#list-body").dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:400,clientY:400}));return 1;})()`);
    await sleep(120);
    edgeResults.blankNoMenu = await R.eval('document.querySelector("#context-menu").hidden');
    // Esc 关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 1;})()`);
    await sleep(120);
    const openEsc = await R.eval('document.querySelector("#context-menu").hidden');
    await R.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));1`);
    await sleep(120);
    edgeResults.escCloses = { opened: openEsc === false, closed: await R.eval('document.querySelector("#context-menu").hidden') };
    // 点击他处关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 1;})()`);
    await sleep(120);
    await R.eval(`document.querySelector("#list").dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));1`);
    await sleep(120);
    edgeResults.otherClickCloses = await R.eval('document.querySelector("#context-menu").hidden');
    // 滚动关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 1;})()`);
    await sleep(120);
    await R.eval(`document.querySelector("#list").dispatchEvent(new Event('scroll'));1`);
    await sleep(120);
    edgeResults.scrollCloses = await R.eval('document.querySelector("#context-menu").hidden');
    // 失焦关闭
    await R.eval(`(()=>{document.querySelector('#list-body .row[data-id="1"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:160}));return 1;})()`);
    await sleep(120);
    await R.eval(`window.dispatchEvent(new Event('blur'));1`);
    await sleep(120);
    edgeResults.blurCloses = await R.eval('document.querySelector("#context-menu").hidden');
    R.add('EDGE', '边界：表头/空白不弹；Esc/点击他处/滚动/失焦关闭菜单',
      'header/blank 保持 hidden=true；四种关闭触发后 hidden=true',
      JSON.stringify(edgeResults),
      edgeResults.headerNoMenu === true && edgeResults.blankNoMenu === true &&
        edgeResults.escCloses.opened === true && edgeResults.escCloses.closed === true &&
        edgeResults.otherClickCloses === true && edgeResults.scrollCloses === true && edgeResults.blurCloses === true);

    /* ================= 边界：淘汰自动关闭明细 ================= */
    // 新增 1 条并记录 id，打开明细；再灌 1000 条使其淘汰
    await R.eval(`window.__rcFeed(${JSON.stringify(HAR2)}); "add special"`);
    await sleep(250);
    const specialId = 5; // store 顺序 id：1..4 已用，此处新增 = 5
    // 通过追加式导出 openDetail(id) 打开（不依赖该行是否在可视区）
    const openedSpecial = await R.eval(`(async()=>{const m=await import('./panel.js'); return m.openDetail(${specialId});})()`, true);
    await sleep(150);
    const detailOpenBefore = await R.eval('document.querySelector("#detail-pane").hidden === false');
    const bulkEntries = [];
    for (let i = 0; i < 1000; i += 1) {
      bulkEntries.push({ request: { method: 'GET', url: 'https://bulk.example.com/r' + i, httpVersion: 'HTTP/1.1', headers: [] }, response: { status: 200, statusText: 'OK', headers: [], content: { text: 'r' + i, encoding: null, mimeType: 'text/plain', size: 2 } }, time: 1, startedDateTime: '2026-10-02T10:00:00.000Z', _resourceType: 'xhr' });
    }
    await R.eval(`window.__rcBulk=${JSON.stringify(bulkEntries)}; for (const e of window.__rcBulk) window.__rcFeed(e); "bulk"`);
    await sleep(1500);
    const evictRes = await R.j('({detailHidden: document.querySelector("#detail-pane").hidden, toast: document.querySelector("#toast").textContent})');
    R.add('EDGE', '边界：明细记录被淘汰 → 自动关闭 + 提示 detail.evicted',
      `specialId=${specialId} 打开后灌 1000 条淘汰之 → detail.hidden=true 且 toast=该请求已被淘汰，明细已关闭`,
      JSON.stringify(evictRes),
      openedSpecial === true && detailOpenBefore === true && evictRes.detailHidden === true && evictRes.toast === '该请求已被淘汰，明细已关闭');

    /* ================= 控制台 ================= */
    await sleep(300);
    const csp = out.errors.filter((e) => e.kind === 'csp/log');
    const errs = out.errors.filter((e) => e.kind !== 'csp/log');
    R.add('CONSOLE', '控制台零错误 / 零 CSP 违规（采集链自证）',
      'probe 被采集 且 errors=0 且 csp=0',
      `probeCaptured=${out.env.consoleProbeCaptured}, errors=${errs.length}, csp=${csp.length}, consoleMessages=${out.console.length}`,
      out.env.consoleProbeCaptured === true && errs.length === 0 && csp.length === 0,
      JSON.stringify({ errs: errs.slice(0, 5), csp: csp.slice(0, 5) }));

    /* ================= devtools 面板注册 spy（补充 DEL-001） ================= */
    try {
      const t2 = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const sid2 = (await cdp.send('Target.attachToTarget', { targetId: t2.targetId, flatten: true })).sessionId;
      const regInit = `(()=>{ window.__panelReg=null; const dev={ panels:{ create:(title,icon,page,cb)=>{ window.__panelReg={title,icon,page}; if(cb)cb({onShown:{},onHidden:{}}); } }, network:{ onRequestFinished:{ addListener(){}, removeListener(){} } } }; try{chrome.devtools=dev;}catch(e){Object.defineProperty(chrome,'devtools',{value:dev,configurable:true,writable:true});} })();`;
      await cdp.send('Page.enable', {}, sid2);
      await cdp.send('Runtime.enable', {}, sid2);
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: regInit }, sid2);
      await cdp.send('Page.navigate', { url: `chrome-extension://${id}/devtools.html` }, sid2);
      await sleep(1200);
      const rr = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.__panelReg)', returnByValue: true }, sid2);
      const reg = rr.result && rr.result.value ? JSON.parse(rr.result.value) : null;
      R.add('DEL-001', 'devtools_page 注册面板 spy：panels.create(Raw Copy, panel.html)',
        'title=Raw Copy, page=panel.html',
        JSON.stringify(reg),
        !!reg && reg.title === 'Raw Copy' && reg.page === 'panel.html');
    } catch (e) {
      R.add('DEL-001', 'devtools_page 注册面板 spy', 'spy 调用', 'error: ' + e.message, false);
    }

    out.checks = R.checks;
    out.shots = R.shots;
    out.consoleCount = out.console.length;
    out.errorCount = out.errors.length;
  } catch (e) {
    out.fatal = e.message + '\n' + (e.stack || '');
  } finally {
    try { if (cdp) cdp.close(); } catch (_e) { /* ignore */ }
    await sleep(200);
    try { child.kill(); } catch (_e) { /* ignore */ }
    out.finishedAt = new Date().toISOString();
  }
  return out;
}

/* ---------- main ---------- */
const wanted = process.argv[2] ? [process.argv[2]] : ['chrome', 'edge'];
const summary = { generatedAt: new Date().toISOString(), extPath: EXT, fixtureCount: FIX.length, browsers: [] };
for (const name of wanted) {
  console.log(`\n===== RUN ${name} =====`);
  const r = await runBrowser(name);
  // 清理不可序列化引用
  delete r.run;
  summary.browsers.push(r);
  for (const c of r.checks || []) {
    console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.key} ${c.name}`);
  }
  console.log(`  checks=${(r.checks || []).length} pass=${(r.checks || []).filter((c) => c.pass).length} fatal=${r.fatal ? 'YES' : 'no'}`);
  if (r.fatal) console.log('  FATAL:', r.fatal);
  fs.writeFileSync(path.join(OUT, `results-${name}.json`), JSON.stringify(r, null, 2), 'utf8');
}
fs.writeFileSync(path.join(OUT, 'results-all.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('\n[done] wrote results-*.json');
