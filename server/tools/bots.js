'use strict';
/* ============ bots — a soak test: N scripted clients doing PvP and PvM over WebSocket ============
 *   npm run bots -- --bots 50 --seconds 120            (starts its own server in-process)
 *   npm run bots -- --url ws://host:43594 --bots 20     (against a running server)
 * Half the bots hunt monsters in the Scarlands pocket, half hunt each other in the Wilderness;
 * all of them eat when low and chat now and then. In-process runs print the server's tick timing
 * (avg / p50 / p95 / p99 / max of World.cycle) and outgoing bandwidth every 10 s and at the end.
 */
const { createServer } = require('../app');
const BotClient = require('./BotClient');
const { saveData } = require('../test/helpers');

function args() {
  const a = { bots: 50, seconds: 60, url: null, tick: 600, seed: 1 };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    const k = v[i].replace(/^--/, '');
    if (k in a) a[k] = k === 'url' ? v[++i] : Number(v[++i]);
  }
  return a;
}
function pct(sorted, p) { if (!sorted.length) return 0; return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]; }
function summary(ms) {
  const s = ms.slice().sort((x, y) => x - y);
  const avg = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { cycles: s.length, avg: +avg.toFixed(3), p50: +pct(s, 0.5).toFixed(3), p95: +pct(s, 0.95).toFixed(3), p99: +pct(s, 0.99).toFixed(3), max: +(s[s.length - 1] || 0).toFixed(3) };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FOODS = ['trout', 'cooked_perch', 'bread'];

class SoakBot {
  constructor(i, url, role, rnd) { this.i = i; this.role = role; this.rnd = rnd; this.c = new BotClient(url, 'bot' + i); this.kills = 0; }
  pick(list) { return list[Math.floor(this.rnd() * list.length)]; }
  home() {   // where this bot hangs around
    if (this.role === 'pvm') return { x: 40 + Math.floor(this.rnd() * 16), z: 86 + Math.floor(this.rnd() * 30) };
    return { x: 44 + Math.floor(this.rnd() * 14), z: 64 + Math.floor(this.rnd() * 20) };
  }
  think() {
    const c = this.c; if (!c.me || c.loggedOut) return;
    const hp = c.me.hp || [1, 1];
    // eat below half health
    if (hp[0] < hp[1] / 2) {
      const slot = c.inv.findIndex((s) => s && FOODS.includes(s[0]));
      if (slot >= 0) { c.eat(slot); return; }
    }
    if (this.rnd() < 0.01) c.chat(this.pick(['ha!', 'come here', 'nice try', 'gf', 'where are the wolves']));
    if (this.busyUntil && c.tick < this.busyUntil) return;
    // stick with the current target while it is in view; re-issue the attack now and then
    const map = this.role === 'pvm' ? c.npcs : c.players;
    const cur = this.target != null ? map.get(this.target) : null;
    if (cur && (!cur.hp || cur.hp[0] > 0)) {
      if (this.role === 'pvm') c.attackNpc(cur.i); else c.attackPlayer(cur.i);
      this.busyUntil = c.tick + 12; return;
    }
    this.target = null;
    if (this.role === 'pvm') {
      const npcs = [...c.npcs.values()];
      if (npcs.length) {
        const n = npcs.reduce((x, y) => (c.dist(x.x, x.z) <= c.dist(y.x, y.z) ? x : y));
        this.target = n.i; c.attackNpc(n.i); this.busyUntil = c.tick + 12; return;
      }
    } else if (c.me.wl > 0) {
      const ps = [...c.players.values()].filter((p) => p.cb != null && Math.abs(p.cb - (c.me.cb || 3)) <= c.me.wl);
      if (ps.length) { const t = this.pick(ps); this.target = t.i; c.attackPlayer(t.i); this.busyUntil = c.tick + 12; return; }
    }
    if (!this.dest || c.dist(this.dest.x, this.dest.z) <= 1 || this.rnd() < 0.05) { this.dest = this.home(); c.walk(this.dest.x, this.dest.z); }
  }
}

async function main() {
  const a = args();
  let seed = a.seed >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let app = null, url = a.url;
  if (!url) {
    app = await createServer({ db: ':memory:', saveKey: 'soak-test-save-key-0123456789abcd', cost: { N: 1024 }, port: 0, quiet: true, authPerMinute: 100000, world: { tickMs: a.tick, seed: a.seed } });
    url = `ws://127.0.0.1:${app.port}`;
    // count outgoing bytes
    const S = require('../net/WsServer').Session;
    const orig = S.prototype.send;
    app.bytesOut = 0;
    S.prototype.send = function (obj) { const n = JSON.stringify(obj).length; app.bytesOut += n; return orig.call(this, obj); };
  }
  console.log(`soak: ${a.bots} bots for ${a.seconds}s against ${url}`);
  const bots = [];
  for (let i = 0; i < a.bots; i++) {
    const b = new SoakBot(i, url, i % 2 === 0 ? 'pvp' : 'pvm', rnd);
    await b.c.connect();
    await b.c.hello();
    await b.c.register(b.c.name, 'soak-password');
    if (app) {
      const L = b.role === 'pvp' ? 40 + Math.floor(rnd() * 4) : 30 + Math.floor(rnd() * 30);
      const lv = { Attack: L, Strength: L, Defence: L, Hitpoints: L, Ranged: 1, Magic: 1, Prayer: 20 };
      app.db.writeSave(app.db.findAccount(b.c.name).id, app.store.codec.encode(saveData(app.world, {
        levels: lv, pos: { x: 26 + Math.floor(rnd() * 12), z: 6 + Math.floor(rnd() * 12) }, run: true,
        equip: { weapon: b.pick(['iron_sword', 'steel_sword', 'steel_sabre', 'steel_battleaxe']), body: 'iron_platebody', legs: 'iron_platelegs', head: 'iron_helm' },
        inv: [['trout', 1], ['trout', 1], ['trout', 1], ['trout', 1], ['coins', 100 + Math.floor(rnd() * 900)]],
      })));
    }
    await b.c.login(b.c.name, 'soak-password');
    bots.push(b);
  }
  console.log(`soak: all ${bots.length} bots in the world`);
  const thinker = setInterval(() => { for (const b of bots) { try { b.think(); } catch (e) { /* keep going */ } } }, Math.max(20, a.tick));
  const started = Date.now();
  let lastIdx = app ? app.world.stats.cycleMs.length : 0, lastBytes = 0, lastTick = app ? app.world.tick : 0;
  while (Date.now() - started < a.seconds * 1000) {
    await sleep(10000);
    if (app) {
      const w = app.world;
      const win = w.stats.cycleMs.slice(lastIdx); lastIdx = w.stats.cycleMs.length;
      const ticks = w.tick - lastTick; lastTick = w.tick;
      const bytes = app.bytesOut - lastBytes; lastBytes = app.bytesOut;
      const deaths = bots.reduce((n, b) => n + b.c.messages.filter((m) => m === 'Oh dear, you are dead!').length, 0);
      console.log(JSON.stringify({ t: Math.round((Date.now() - started) / 1000), players: w.playerCount, npcsAlive: [...w.npcs.values()].filter((n) => n.active).length, objs: w.objs.size, deaths, bytesPerTick: Math.round(bytes / Math.max(1, ticks)), tickMs: summary(win), phaseMs: w.stats.phaseMs }));
    } else {
      console.log(JSON.stringify({ t: Math.round((Date.now() - started) / 1000), connected: bots.filter((b) => !b.c.closed).length, clientTick: bots[0].c.tick }));
    }
  }
  clearInterval(thinker);
  let result = null;
  if (app) {
    const w = app.world;
    const kills = bots.reduce((n, b) => n + b.c.messages.filter((m) => /^You have defeated/.test(m)).length, 0);
    const deaths = bots.reduce((n, b) => n + b.c.messages.filter((m) => m === 'Oh dear, you are dead!').length, 0);
    result = { bots: a.bots, seconds: a.seconds, tickMs: a.tick, ticks: w.tick, pvpKills: kills, deaths, cycle: summary(w.stats.cycleMs), bytesOutPerTick: Math.round(app.bytesOut / Math.max(1, w.tick)) };
    console.log('RESULT ' + JSON.stringify(result));
  }
  for (const b of bots) b.c.close();
  if (app) await app.close();
  return result;
}

if (require.main === module) main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
module.exports = { main };
