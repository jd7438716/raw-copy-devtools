/**
 * cdp.mjs — 极简 Chrome DevTools Protocol 客户端（零第三方依赖）。
 * 使用 Node 18+ 全局 fetch / WebSocket。
 */
import crypto from 'node:crypto';

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 计算 Chrome「加载已解压」扩展的确定性 ID（path → sha256 → a-p 字母表）。 */
export function crxIdFromPath(p) {
  const hex = crypto.createHash('sha256').update(p, 'utf8').digest('hex').slice(0, 32);
  return hex
    .split('')
    .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
    .join('');
}

/** 等待 CDP HTTP 端点就绪。 */
export async function waitForEndpoint(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch (_e) {
      // retry
    }
    await sleep(250);
  }
  throw new Error(`CDP endpoint on port ${port} not ready within ${timeoutMs}ms`);
}

/** 列出目标。 */
export async function listTargets(port) {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  return res.json();
}

/** 在指定 browser-ws 上打开一个新页面目标，返回 {targetId, sessionId, ws}。 */
export class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this._listeners = new Map();
  }

  static async connect(wsUrl) {
    const client = new CDP(wsUrl);
    await client._open();
    return client;
  }

  _open() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(new Error('ws error: ' + (e.message || 'unknown')));
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_e) {
          return;
        }
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
          const key = `${msg.sessionId || ''}:${msg.method}`;
          const list = this._listeners.get(key) || [];
          for (const fn of list) fn(msg.params, msg.sessionId);
          const anyList = this._listeners.get('*') || [];
          for (const fn of anyList) fn(msg);
        }
      };
    });
  }

  on(sessionId, method, fn) {
    const key = `${sessionId || ''}:${method}`;
    if (!this._listeners.has(key)) this._listeners.set(key, []);
    this._listeners.get(key).push(fn);
  }

  onAny(fn) {
    if (!this._listeners.has('*')) this._listeners.set('*', []);
    this._listeners.get('*').push(fn);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 30000);
    });
  }

  close() {
    try {
      this.ws.close();
    } catch (_e) {
      // noop
    }
  }
}

/** 便捷：通过 browser ws 附加到目标并返回 sessionId。 */
export async function attach(browser, targetId) {
  const { sessionId } = await browser.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  return sessionId;
}
