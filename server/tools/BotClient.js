'use strict';
/* ============ BotClient — a scripted client that speaks the real protocol over ws ============
 * Keeps a small model of what a real client would know (itself, players/NPCs/items in view, pack,
 * messages) purely from server messages, so tests and the soak bots see exactly what players see.
 */
const WebSocket = require('ws');
const Protocol = require('../net/Protocol');

class BotClient {
  constructor(url, name) {
    this.url = url; this.name = name;
    this.ws = null;
    this.waiters = [];
    this.reset();
  }
  reset() {
    this.me = null; this.pid = -1; this.tick = -1;
    this.players = new Map(); this.npcs = new Map(); this.objs = new Map();
    this.inv = []; this.eq = {}; this.stats = {}; this.set = {}; this.prayers = [];
    this.messages = []; this.fx = []; this.errors = []; this.log = [];
    this.loggedOut = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (d) => this.onMessage(JSON.parse(d.toString())));
      this.ws.on('close', () => { this.closed = true; this.check(); });
    });
  }
  send(obj) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj)); }
  close() { if (this.ws) this.ws.close(); }

  onMessage(m) {
    this.log.push(m.t);
    if (this.log.length > 200) this.log.shift();
    switch (m.t) {
      case 'welcome': this.applyWelcome(m); break;
      case 'tick': this.applyTick(m); break;
      case 'error': this.errors.push(m); break;
      case 'logout': this.loggedOut = m.reason; break;
    }
    this.last = m;
    this.check(m);
  }
  applyWelcome(m) {
    this.reset();
    this.pid = m.pid; this.tick = m.tick;
    this.me = { x: m.x, z: m.z, hp: [m.stats.Hitpoints[2], m.stats.Hitpoints[1]], skull: m.skull, wl: 0, en: m.en };
    this.inv = m.inv; this.eq = m.eq; this.stats = m.stats; this.set = m.set; this.prayers = m.pr;
  }
  applyTick(m) {
    this.tick = m.n;
    if (m.me) Object.assign(this.me, m.me);
    const apply = (map, part) => {
      if (!part) return;
      for (const id of part.del || []) map.delete(id);
      for (const e of part.add || []) map.set(e.i, Object.assign({}, e));
      for (const u of part.upd || []) { const e = map.get(u.i); if (e) Object.assign(e, u); }
    };
    apply(this.players, m.pl);
    apply(this.npcs, m.np);
    if (m.ob) {
      for (const id of m.ob.del || []) this.objs.delete(id);
      for (const o of m.ob.add || []) this.objs.set(o.i, o);
    }
    if (m.inv) this.inv = m.inv;
    if (m.eq) this.eq = m.eq;
    if (m.st) Object.assign(this.stats, m.st);
    if (m.set) this.set = m.set;
    if (m.pr) this.prayers = m.pr;
    if (m.msg) for (const x of m.msg) this.messages.push(x[1]);
    if (m.fx) this.fx.push(...m.fx);
  }
  /** resolve with the first message for which pred(msg, bot) is truthy */
  waitFor(pred, timeoutMs, label) {
    return new Promise((resolve, reject) => {
      const w = { pred, resolve, timer: setTimeout(() => { this.waiters = this.waiters.filter((x) => x !== w); reject(new Error(`${this.name}: timeout waiting for ${label || 'condition'} (tick ${this.tick})`)); }, timeoutMs || 10000) };
      this.waiters.push(w);
      this.check(this.last);
    });
  }
  /** wait until pred(bot) holds after some message */
  until(pred, timeoutMs, label) { return this.waitFor(() => pred(this), timeoutMs, label); }
  check(m) {
    for (const w of this.waiters.slice()) {
      let ok = false;
      try { ok = w.pred(m, this); } catch (e) { ok = false; }
      if (ok) { clearTimeout(w.timer); this.waiters = this.waiters.filter((x) => x !== w); w.resolve(m); }
    }
  }

  /* ---- protocol helpers ---- */
  async hello() { this.send({ t: 'hello', v: Protocol.VERSION, client: 'bot' }); return this.waitFor((m) => m && m.t === 'hello', 5000, 'hello'); }
  async register(user, pass) {
    this.send({ t: 'register', user, pass });
    const m = await this.waitFor((x) => x && (x.t === 'register_ok' || x.t === 'auth_fail'), 10000, 'register');
    return m.t === 'register_ok' || (m.code === 'name_taken');
  }
  async login(user, pass) {
    this.send({ t: 'login', user, pass });
    const m = await this.waitFor((x) => x && (x.t === 'welcome' || x.t === 'auth_fail'), 10000, 'login');
    if (m.t !== 'welcome') throw new Error(`${this.name}: login failed ${m.code}`);
    return m;
  }
  walk(x, z) { this.send({ t: 'walk', x, z }); }
  run(on) { this.send({ t: 'run', on: !!on }); }
  attackPlayer(pid) { this.send({ t: 'op_player', pid, op: 'attack' }); }
  attackNpc(nid) { this.send({ t: 'op_npc', nid, op: 'attack' }); }
  take(uid) { this.send({ t: 'op_obj', uid, op: 'take' }); }
  eat(slot) { this.send({ t: 'eat', slot }); }
  logout() { this.send({ t: 'logout' }); }
  chat(text) { this.send({ t: 'chat', text }); }
  dist(x, z) { return Math.max(Math.abs(this.me.x - x), Math.abs(this.me.z - z)); }
}

module.exports = BotClient;
