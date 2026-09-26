'use strict';
/* ============ WsServer — clients over WebSocket (npm ws) ============
 * One Session per socket: hello (version check) -> register / login (async scrypt, rate-limited per
 * address) -> in-game intents, which are only QUEUED here and applied by the world in its client-input
 * phase. A socket that drops leaves the player in the world until the logout rules release them
 * (x-log protection, as in 2004: World.processLogouts); logging in again while they are still there
 * re-attaches the new socket to the same player.
 * An HTTP GET /health on the same port answers {ok, tick, players} for monitoring.
 */
const http = require('node:http');
const { WebSocketServer } = require('ws');
const Protocol = require('./Protocol');
const { TokenBucket, WindowLimiter } = require('./RateLimiter');
const Player = require('../engine/Player');

const MSG_BURST = 40, MSG_PER_SEC = 20;       // per connection
const STRIKES_TO_KICK = 50;                   // dropped/malformed messages before disconnect
const AUTH_PER_MINUTE = 10;                   // login + register attempts per address
const INBOX_MAX = 60;                         // queued intents per player
const MAX_BUFFERED = 1 << 20;                 // 1 MB unsent -> the client cannot keep up

class Session {
  constructor(server, ws, ip) {
    this.server = server; this.ws = ws; this.ip = ip;
    this.state = 'new';           // new -> hello -> auth -> game -> closed
    this.player = null;
    this.bucket = new TokenBucket(MSG_BURST, MSG_PER_SEC);
    this.strikes = 0;
    this.busy = false;            // an auth request is in flight
    this.alwaysAlive = false;
  }
  get world() { return this.server.world; }

  send(obj) {
    if (this.ws.readyState !== 1) return;
    if (this.ws.bufferedAmount > MAX_BUFFERED) { this.close('slow_client'); return; }
    this.ws.send(JSON.stringify(obj));
  }
  error(code, text) { this.send({ t: 'error', code, text: text || code }); }
  close(reason) {
    if (this.state === 'closed') return;
    this.state = 'closed';
    try { this.ws.close(1000, reason || 'bye'); } catch (e) { /* already gone */ }
  }
  strike(code) {
    this.strikes++;
    if (this.strikes >= STRIKES_TO_KICK) { this.error('kicked', 'Too many bad messages.'); this.close('abuse'); }
    else if (code) this.error(code);
  }

  onMessage(raw) {
    if (this.state === 'closed') return;
    if (!this.bucket.take()) { this.strike('rate_limited'); return; }
    const res = Protocol.parse(raw);
    if (!res.ok) { this.strike(res.code); return; }
    const m = res.msg;
    if (this.player) this.player.lastResponse = this.world.tick;
    if (m.t === 'ping') { this.send({ t: 'pong', n: m.n, tick: this.world.tick }); return; }
    if (m.t === 'hello') {
      if (m.v !== Protocol.VERSION) { this.send({ t: 'error', code: 'version', need: Protocol.VERSION }); this.close('version'); return; }
      this.state = 'hello';
      this.send({ t: 'hello', v: Protocol.VERSION, tickMs: this.world.tickMs, server: 'crafted-realm-w1' });
      return;
    }
    if (m.t === 'register' || m.t === 'login') {
      if (this.state !== 'hello') { this.strike('say_hello_first'); return; }
      if (this.busy) { this.strike('busy'); return; }
      if (!this.server.authLimiter.allow(this.ip)) { this.send({ t: 'auth_fail', code: 'too_many_attempts', text: 'Too many attempts. Wait a minute.' }); return; }
      this.busy = true;
      (m.t === 'register' ? this.register(m) : this.login(m)).finally(() => { this.busy = false; });
      return;
    }
    // in-game intents
    if (this.state !== 'game' || !this.player) { this.strike('not_logged_in'); return; }
    if (this.player.inbox.length >= INBOX_MAX) { this.strike('slow_down'); return; }
    this.player.inbox.push(m);
  }

  async register(m) {
    try {
      await this.server.accounts.register(m.user, m.pass);
      this.send({ t: 'register_ok', user: m.user });
    } catch (e) {
      this.send({ t: 'auth_fail', code: e.code || 'error', text: e.code ? e.message : 'Something went wrong.' });
    }
  }

  async login(m) {
    let acct;
    try { acct = await this.server.accounts.login(m.user, m.pass); }
    catch (e) { this.send({ t: 'auth_fail', code: e.code || 'error', text: e.code ? e.message : 'Something went wrong.' }); return; }
    if (this.state === 'closed') return;
    const w = this.world;
    const existing = w.byKey.get(acct.username);
    if (existing) {
      if (existing.session && existing.connected) { this.send({ t: 'auth_fail', code: 'already_online', text: 'That adventurer is already in the world.' }); return; }
      // reconnect to the adventurer still standing in the world
      existing.session = this; existing.connected = true; existing.lastResponse = w.tick; existing.lastConnected = w.tick;
      existing.view = { players: new Map(), pver: new Map(), npcs: new Map(), objs: new Map() };
      existing.out.invDirty = existing.out.equipDirty = existing.out.selfDirty = existing.out.prayersDirty = existing.out.settingsDirty = true;
      existing.lastSeen.sig = null;
      this.player = existing; this.state = 'game';
      this.send(Object.assign(w.welcome(existing), { reconnected: 1 }));
      w.log('reconnect', { key: existing.key });
      return;
    }
    let data = null;
    try { data = this.server.store ? this.server.store.loadData(acct.id) : null; }
    catch (e) { w.log('save_invalid', { key: acct.username, code: e.code }); this.send({ t: 'auth_fail', code: 'save_invalid', text: 'Your save could not be read. Contact a moderator.' }); return; }
    const p = new Player(w, acct, data);
    p.session = this;
    this.player = p;
    this.state = 'auth';
    if (!w.queueLogin(p)) { this.player = null; this.state = 'hello'; this.send({ t: 'auth_fail', code: 'already_online', text: 'That adventurer is already in the world.' }); }
  }

  /* ---- called by the World ---- */
  onLogin(welcome) { this.state = 'game'; this.send(welcome); }
  onLoginFailed(reason) { this.player = null; this.state = 'hello'; this.send({ t: 'auth_fail', code: reason, text: reason === 'world_full' ? 'The world is full.' : 'That adventurer is already in the world.' }); }
  onLogout(reason) { this.send({ t: 'logout', reason }); this.player = null; this.close('logout'); }

  onClose() {
    const p = this.player;
    this.state = 'closed';
    if (p && p.session === this) { p.connected = false; p.lastConnected = this.world.tick; }
  }
}

class WsServer {
  /**
   * @param opts.world     the World
   * @param opts.accounts  server/persist/Accounts
   * @param opts.store     server/persist/PlayerStore (optional)
   * @param opts.port      TCP port (0 = any free port)
   */
  constructor(opts) {
    this.world = opts.world; this.accounts = opts.accounts; this.store = opts.store || null;
    this.authLimiter = new WindowLimiter(opts.authPerMinute || AUTH_PER_MINUTE, 60000);
    this.sessions = new Set();
    this.http = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, tick: this.world.tick, players: this.world.playerCount, cycleMs: this.world.stats.lastCycleMs }));
        return;
      }
      res.writeHead(404); res.end();
    });
    this.wss = new WebSocketServer({ server: this.http, maxPayload: Protocol.MAX_MESSAGE_BYTES });
    this.wss.on('connection', (ws, req) => {
      const s = new Session(this, ws, req.socket.remoteAddress || '?');
      this.sessions.add(s);
      ws.on('message', (data) => { try { s.onMessage(data); } catch (e) { this.world.log('session_error', { message: e.message }); s.close('error'); } });
      ws.on('close', () => { s.onClose(); this.sessions.delete(s); });
      ws.on('error', () => { /* close follows */ });
    });
  }
  listen(port, host) {
    return new Promise((resolve) => this.http.listen(port, host, () => resolve(this.http.address().port)));
  }
  close() {
    return new Promise((resolve) => {
      for (const s of this.sessions) s.close('shutdown');
      this.wss.close(() => this.http.close(() => resolve()));
    });
  }
}

WsServer.Session = Session;
module.exports = WsServer;
