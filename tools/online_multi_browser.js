/* online_multi_browser.js — the W2 online alpha driven through real browser clients (COMBAT_GRADE A/B/C, criterion 20).
 *
 * Starts an authoritative game server in-process (in-memory database, seeded world, real ws on 127.0.0.1) and three
 * headless Chrome pages of the real game (?online=1 on the static dev server): two fighters and an observer. Every
 * fight goes through the same code paths a player uses (login screen, supply chest, walking over the Ditch, attack
 * menus, prayers, eating); the checks compare what each browser shows with what the server did:
 *   - no desync: after every fight each page's view of every adventurer (tile, hitpoints) equals the server's;
 *   - no double / lost hits: every server hit on a fighter shows exactly one splat on the attacker's page AND on the
 *     observer's page (counted per target, per fight);
 *   - loot: the killer's page sees the whole pile marked as theirs, the observer sees none of it while it is private,
 *     the killer picks it all up; the loser keeps exactly the items the client's kept-on-death preview promised;
 *   - skull on the attacker only (retaliation does not skull), respawn in the Commons at full health.
 * Scenarios (--only a,b): pvp-melee, pvp-ranged, pvp-magic (each with eating and protection prayers), pvp-mixed-*,
 * pvm-<style>-<monster>, reconnect (socket dropped mid-fight: the logout lock holds, the client re-attaches), multi.
 * Frame strips of each style's fight are captured from the observer for the feel criteria.
 *
 * Run (static server on 8100 first: python tools/serve_static.py 8100 .):
 *   node tools/online_multi_browser.js [--only pvp-melee] [--tick 600] [--out docs/rebuild/combat_grade_passes/online_evidence]
 * Exit 0 when every scenario passes; a JSON report is written to <out>/online_report.json.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const execFileAsync = (cmd, a) => new Promise((res, rej) => execFile(cmd, a, (e, out) => (e ? rej(e) : res(out))));   // never block: the world ticks in this process
const puppeteer = require('puppeteer-core');
const { createServer } = require('../server/app');
const { PathingEntity } = require('../server/engine/PathingEntity');
const C = require('../shared/combat.js');
const OnlineTiming = require('../src/online_fx.js');
const PVP = require('../shared/pvp.js');

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = arg('base', process.env.ONLINE_BASE || 'http://127.0.0.1:8100');
const TICK = Number(arg('tick', 600));
const OUT = path.resolve(arg('out', path.join(__dirname, '..', 'docs', 'rebuild', 'combat_grade_passes', 'online_evidence')));
const ONLY = arg('only', null) ? arg('only').split(',') : null;
const STRIPS = args.includes('--no-strips') ? false : true;
const HEADFUL = args.includes('--headful');
const PORT = Number(arg('port', 8201));
const DEADLINE = Date.now() + Number(arg('deadline-min', 90)) * 60000;   // the whole run gives up (and cleans up) after this
const STOP_FILE = path.join(OUT, 'STOP');                                  // touch this file to stop a run gracefully
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[online]', ...a);

/* ------------------------------------------------------------------------------------------------ */
/* server + instrumentation                                                                           */
/* ------------------------------------------------------------------------------------------------ */
let app, world;
const serverHits = [];     // {tick, to:'p3'|'n12', amount}
const serverAnims = [];    // {tick, who, name, type, expect}: every swing / cast, with the weapon's 2004 attack delay
const serverFx = [];       // {tick, from, to, d}: every projectile the server announced
const rolls = { n: 0, expected: 0, hits: 0, damage: {} };   // live accuracy rolls and damage draws
const serverEvents = [];   // world logger events
async function startServer() {
  app = await createServer({ db: ':memory:', saveKey: 'online-driver-save-key-0123456789abcdef', cost: { N: 1024 }, port: PORT, host: '127.0.0.1',
    authPerMinute: 1000, quiet: true, world: { seed: 20260926, tickMs: TICK, logger: (event, data) => { serverEvents.push(Object.assign({ event, tick: world ? world.tick : -1 }, data)); } } });
  world = app.world;
  // accuracy: every hit roll the server makes, against the closed-form chance; damage draws by max hit
  const hitRoll0 = C.hitRoll, dmg0 = C.damageRoll;
  C.hitRoll = function (rng, a, d) { const r = hitRoll0.call(this, rng, a, d); rolls.n++; rolls.expected += C.hitChance(a, d); if (r) rolls.hits++; return r; };
  C.damageRoll = function (rng, max) { const v = dmg0.call(this, rng, max); const b = rolls.damage[max] || (rolls.damage[max] = new Array(Math.max(0, max) + 1).fill(0)); b[v]++; return v; };
  const anim0 = PathingEntity.prototype.setAnim;
  PathingEntity.prototype.setAnim = function (name, extra) {
    if (name === 'attack' || name === 'cast') {
      let expect = null;
      if (this.pid != null && this.nid == null && typeof this.weapon === 'function') expect = name === 'cast' ? C.MAGIC_ATTACK_RATE : C.attackDelay(this.weapon(), this.style().style, false);
      else if (this.def) expect = this.def.speedTicks || C.DEFAULT_ATTACK_RATE;
      serverAnims.push({ tick: world.tick, who: this.nid != null ? 'n' + this.nid : 'p' + this.pid, name, type: extra && extra.type, spec: !!(extra && extra.spec), expect, weapon: this.equip ? this.equip.weapon : null });
    }
    return anim0.call(this, name, extra);
  };
  const fx0 = world.broadcastFx.bind(world);
  world.broadcastFx = function (src, fx) { serverFx.push({ tick: world.tick, from: fx.from, to: fx.to, d: fx.d, k: fx.k, splash: !!fx.splash }); return fx0(src, fx); };
  const orig = PathingEntity.prototype.addHit;
  PathingEntity.prototype.addHit = function (amount, type) {
    serverHits.push({ tick: world.tick, to: this.nid != null ? 'n' + this.nid : 'p' + this.pid, amount, prayers: this.prayers ? Array.from(this.prayers) : null });
    return orig.call(this, amount, type);
  };
  log('game server on ws://127.0.0.1:' + app.port + ' tick ' + TICK + ' ms');
}
function sp(name) { return world.playerByKey(String(name).toLowerCase()); }
function stopCheck() { if (Date.now() > DEADLINE || fs.existsSync(STOP_FILE)) throw new Error('run stopped (deadline or STOP file)'); }
/** PvP fixtures: monsters do not hunt while two adventurers duel (they would join in: the test is about PvP) */
function huntAll(on) { for (const n of world.npcs.values()) { if (n._huntSaved === undefined) n._huntSaved = n.huntEnabled; n.huntEnabled = on ? n._huntSaved : false; if (!on && n.target && n.target.pid != null) n.resetDefaults(); } }
/** walk through waypoints (keeps clear of monster haunts) */
async function walkRoute(c, pts, ms) { for (const p of pts) await walkTo(c, p[0], p[1], ms); }
/** the way from the Commons over the east crossing to the eastern Scarlands, away from the monster spawns */
const EAST = [[47, 40], [48, 47], [61, 49]];

/* ------------------------------------------------------------------------------------------------ */
/* browser clients                                                                                    */
/* ------------------------------------------------------------------------------------------------ */
let browser;
class Client {
  constructor(name, page) { this.name = name; this.page = page; this.errors = []; this.lastState = null; }
  async state() { const s = await this.page.evaluate(() => window.CROnlineQA && CROnlineQA.state()); this.lastState = s; return s; }
  q(fn, ...a) { return this.page.evaluate(fn, ...a); }
  get pid() { return this.lastState && this.lastState.me ? this.lastState.me.pid : -1; }
  async until(pred, ms, label) {
    const t0 = Date.now();
    for (;;) {
      stopCheck();
      const s = await this.state();
      if (s && pred(s)) return s;
      if (Date.now() - t0 > ms) throw new Error(this.name + ': timeout waiting for ' + label);
      await sleep(150);
    }
  }
}
async function openClient(name, viewport) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport || { width: 1100, height: 700 });
  const c = new Client(name, page);
  page.on('pageerror', (e) => { c.errors.push(String(e).slice(0, 300)); log(name, 'PAGEERROR', String(e).slice(0, 300)); });
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) c.errors.push(m.text().slice(0, 300)); });
  await page.goto(BASE + '/?online=1&server=' + encodeURIComponent('ws://127.0.0.1:' + app.port) + '&t=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 90000 });
  const t0 = Date.now();
  while (!(await page.evaluate(() => !!window.CR_WORLD_READY && !!document.getElementById('online-login')))) {
    if (Date.now() - t0 > 120000) throw new Error(name + ': the world never finished loading');
    await sleep(300);
  }
  return c;
}
async function register(c, user) {
  await c.page.type('#online-user', user);
  await c.page.type('#online-pass', 'alpha-pass-' + user);
  await c.page.click('#online-register');
  await c.until((s) => s.entered && s.me, 30000, 'enter the world');
  await sleep(500);
}
/** take a kit at the chest (walks there first) */
async function kitUp(c, kit) {
  const s0 = await c.state();
  await c.q((k) => CROnlineQA.kit(k), kit);
  const want = { melee: 'steel_longsword', ranged: 'gale_longbow', magic: 'storm_staff' }[kit];
  await c.until((s) => s.equip.weapon === want && s.ui.set.run !== undefined, 150000, 'kit ' + kit).catch(async (e) => {
    const p = sp(c.name), s = await c.state();
    throw new Error(e.message + ' ' + JSON.stringify({ at: p && [p.x, p.z], tick: world.tick, lockUntil: p && p.preventLogoutUntil, target: p && p.target && (p.target.nid != null ? 'n' + p.target.nid : 'p' + p.target.pid), hp: p && p.hp, waypoints: p && p.path.length, chat: s.chat.slice(-5) }));
  });
  await c.q(() => CROnlineQA.send({ t: 'run', on: true }));
  return s0;
}
async function walkTo(c, x, z, ms) {
  // like a player: click again when the adventurer stops short (the path finder searches 64 tiles out, as in 2004)
  let last = null, still = 0;
  await c.q((a, b) => CROnlineQA.walk(a, b), x, z);
  await c.until((s) => {
    if (s.me.tile.x === x && s.me.tile.z === z) return true;
    const k = s.me.tile.x + ',' + s.me.tile.z; if (k === last) still++; else { last = k; still = 0; }
    if (still >= 12) { still = 0; c.q((a, b) => CROnlineQA.walk(a, b), x, z).catch(() => {}); }
    return false;
  }, ms || 90000, 'walk to ' + x + ',' + z);
}
/** everyone restored to full health (the server's regen is slow; the driver tops fighters up between fights) */
function heal(name) {
  const p = sp(name); if (!p) return;
  for (const sk of world.content.SKILLS) p.setLevel(sk, p.base(sk));
  p.runEnergy = 10000;
  p.out.selfDirty = true;
}

/* ------------------------------------------------------------------------------------------------ */
/* a fight, watched from three pages                                                                  */
/* ------------------------------------------------------------------------------------------------ */
const report = { tick: TICK, started: new Date().toISOString(), fights: [], failures: [] };
function check(fight, ok, label, detail) {
  fight.checks.push({ ok: !!ok, label, detail: detail === undefined ? null : detail });
  if (!ok) { report.failures.push(fight.name + ': ' + label + (detail ? ' ' + JSON.stringify(detail).slice(0, 300) : '')); log('  FAIL', label, detail ? JSON.stringify(detail).slice(0, 300) : ''); }
}
/** per-target counts of server hits since `since` */
function hitsSince(since, targetKey) { return serverHits.filter((h) => h.tick >= since && h.to === targetKey); }
/** splats a page has shown on a target since a wall-clock time */
async function splatsOn(c, ref, sinceMs) {
  return c.q((r, t) => CROnlineQA.fxLog().filter((e) => e.t >= t && e.to[0] === r[0] && e.to[1] === r[1]).length, ref, sinceMs);
}
/** the eating + praying loop a player runs during a fight */
function fighterBrain(c, opts) {
  let stop = false;
  const o = opts || {};
  const run = (async () => {
    let prayed = false, ateAt = 0;
    while (!stop) {
      try {
        const s = await c.state();
        if (s && s.me && !s.me.dead) {
          if (o.protect && !prayed && s.me) { await c.q((id) => CROnlineQA.send({ t: 'prayer', id, on: true }), o.protect); prayed = true; }
          if (s.hp[0] > 0 && s.hp[0] <= Math.floor(s.hp[1] * 0.45)) { if ((await c.q(() => CROnlineQA.eatFirst())) >= 0) ateAt = Date.now(); }
          // eating drops the attack order (2004): like a player, click the opponent again a moment later
          else if (o.opponent && ateAt && Date.now() - ateAt > TICK * 1.5) { ateAt = 0; const me = sp(c.name); if (me && !me.target) await c.q((n) => CROnlineQA.attackPlayerByName(n), o.opponent); }
        }
      } catch (e) { /* page busy */ }
      await sleep(Math.max(250, TICK / 2));
    }
  })();
  return { stop: async () => { stop = true; await run; } };
}
/** frames from the observer page around the fighters (for the feel criteria) */
async function captureStrip(obs, name, ids, frames, gapMs) {
  const shots = [];
  await obs.page.bringToFront();   // only the front page renders every frame in headless Chrome
  await obs.q((refs) => CROnlineQA.focus(refs, 20), ids);
  await sleep(900);                 // let the follow camera settle on the new focus
  for (let i = 0; i < frames; i++) {
    await obs.q((refs) => CROnlineQA.focus(refs), ids);
    const pts = [];
    for (const id of ids) { const p = await obs.q((k, x) => CROnlineQA.screenOf(k, x), id[0], id[1]); if (p) pts.push(p); }
    if (!pts.length) { await sleep(gapMs); continue; }
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const vp = obs.page.viewport();
    const w = 440, h = 330, x = Math.max(0, Math.min(vp.width - w, Math.round(cx - w / 2))), y = Math.max(0, Math.min(vp.height - h, Math.round(cy - h / 2 - 20)));
    const file = path.join(OUT, `frame_${name}_${String(i).padStart(2, '0')}.png`);
    await obs.page.screenshot({ path: file, clip: { x, y, width: w, height: h } });
    shots.push({ file, t: Date.now() });
    await sleep(gapMs);
  }
  await obs.q(() => CROnlineQA.unfocus());
  // compose into one strip (python + PIL), keep only the strip
  const strip = path.join(OUT, `strip_${name}.jpg`);
  try {
    await execFileAsync('python', ['-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f).convert('RGB') for f in fs]
if ims:
  w,h=ims[0].size; cols=min(6,len(ims)); rows=(len(ims)+cols-1)//cols
  out=Image.new('RGB',(cols*w//2,rows*h//2),(0,0,0))
  for i,im in enumerate(ims): out.paste(im.resize((w//2,h//2)),((i%cols)*w//2,(i//cols)*h//2))
  out.save(sys.argv[1], quality=84)`, strip, ...shots.map((s) => s.file)]);
    for (const s of shots) fs.unlinkSync(s.file);
  } catch (e) { log('strip failed', e.message); }
  return strip;
}

async function pvpFight(fight, A0, B0, O, opts) {
  const o = opts || {};
  const [A, B] = o.swap ? [B0, A0] : [A0, B0];   // A attacks, B defends
  log('fight', fight.name, A.name, 'attacks', B.name);
  heal(A.name); heal(B.name);
  await kitUp(A, o.kitA); await kitUp(B, o.kitB);
  // meet in the Scarlands, a few tiles apart
  const spot = o.spot || { x: 59, z: 66 };
  huntAll(false);
  const route = async (c, x, z) => { const s = await c.state(); if (s.me.tile.z < 47) await walkRoute(c, EAST); await walkTo(c, x, z); };
  await Promise.all([route(A, spot.x - 2, spot.z), route(B, spot.x + 2, spot.z), route(O, spot.x, spot.z - 5)]);
  heal(A.name); heal(B.name);
  await sleep(TICK * 2);
  const sa = await A.state(), sb = await B.state();
  const aPid = sa.me.pid, bPid = sb.me.pid;
  // the menu shows the attack option with the combat level (and only when the level range allows)
  const menu = await A.q((pid) => CROnlineQA.menuFor('player', pid), bPid);
  check(fight, menu && /^Attack .+ \(level-\d+\)$/.test(menu[0]), 'attack option first in the menu with the level', menu);
  // 2004 skull rule: no skull for attacking someone who attacked you (or whom you attacked) recently
  const pa0 = sp(A.name), pb0 = sp(B.name);
  const expectSkull = PVP.deservesSkull({ id: pa0.key, predators: pa0.predators }, { id: pb0.key, preys: pb0.preys }) || pa0.isSkulled();
  const since = world.tick, sinceMs = Date.now();
  const fxA0 = (await A.state()).fx, fxO0 = (await O.state()).fx;
  if (o.protectItemA) await A.q(() => CROnlineQA.send({ t: 'prayer', id: 'protect_item', on: true }));
  const maxA = await A.q(() => OnlineUI.myMaxHit()), maxB = await B.q(() => OnlineUI.myMaxHit());
  const brains = [fighterBrain(A, { protect: o.protectA, opponent: B.name }), fighterBrain(B, { protect: o.protectB, opponent: A.name })];
  // A attacks with a real left click on B (the top menu entry), B retaliates automatically
  const at = await A.q((pid) => CROnlineQA.screenOf('player', pid), bPid);
  if (at) { await A.page.mouse.move(at.x, at.y); await sleep(80); await A.page.mouse.down(); await A.page.mouse.up(); }
  await sleep(TICK * 2);
  fight.leftClickAttack = !!(sp(A.name).target && sp(A.name).target.pid === bPid);
  if (!fight.leftClickAttack) { log('  (left click missed; attacking through the menu action)'); await A.q((n) => CROnlineQA.attackPlayerByName(n), B.name); }
  // frames of the exchange from the observer
  let strip = null;
  if (STRIPS && o.strip) strip = captureStrip(O, o.strip, [['player', aPid], ['player', bPid]], 18, Math.round(TICK / 3));
  // skull: the attacker only (set on the first swing, once A is in reach)
  const so = await O.until((s) => { const a = s.players.find((p) => p.pid === aPid); return a && (expectSkull ? a.sk === 1 : sp(B.name).lastCombatPvp >= since); }, 20000, 'the skull of the attacker').catch(() => O.lastState);
  const seenA = so.players.find((p) => p.pid === aPid), seenB = so.players.find((p) => p.pid === bPid);
  check(fight, seenA && seenB, 'the observer sees both fighters', { seenA: !!seenA, seenB: !!seenB });
  check(fight, seenA && (seenA.sk || 0) === (expectSkull ? 1 : 0) && seenB && !seenB.sk, expectSkull ? 'the attacker is skulled, the defender (retaliating) is not' : 'no skull for striking back at a recent attacker (2004 rule); the defender unskulled', { a: seenA && seenA.sk, b: seenB && seenB.sk, expectSkull });
  const aSelf = await A.state();
  check(fight, (aSelf.ui.skull > 0) === expectSkull, 'the attacker sees their own skull state', aSelf.ui.skull);
  // readability at the desktop size and on a phone-sized window, mid-fight (criterion 12)
  if (o.screens) {
    await O.page.bringToFront();
    await O.q((refs) => CROnlineQA.focus(refs, 22), [['player', aPid], ['player', bPid]]);
    await O.page.setViewport({ width: 1538, height: 900 }); await sleep(1500);
    await O.q((refs) => CROnlineQA.focus(refs), [['player', aPid], ['player', bPid]]);
    await O.page.screenshot({ path: path.join(OUT, 'screen_' + o.screens + '_1538x900.jpg'), type: 'jpeg', quality: 85 });
    await O.page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 }); await sleep(1500);
    await O.q((refs) => CROnlineQA.focus(refs, 26), [['player', aPid], ['player', bPid]]);
    await sleep(600);
    await O.page.screenshot({ path: path.join(OUT, 'screen_' + o.screens + '_phone.jpg'), type: 'jpeg', quality: 85 });
    await O.page.setViewport({ width: 1280, height: 800 }); await O.q(() => CROnlineQA.unfocus());
  }
  // switching mid-fight answers on the next tick (criterion 14): a style button, a prayer, a bite, all real UI clicks
  if (o.switches) {
    const resp = {};
    const t1 = Date.now();
    await A.q(() => { document.querySelector('.tab-btn[data-tab="combat"]').click(); const b = document.querySelector('#combat-styles .cmb-style[data-i="2"]'); if (b) b.click(); });
    await A.until((st) => st.ui.style === 2, 5000, 'style switch').catch(() => {});
    resp.style = Date.now() - t1;
    const t2 = Date.now();
    await A.q(() => { document.querySelector('.tab-btn[data-tab="prayers"]').click(); });
    await sleep(200);
    await A.q(() => { const bs = document.querySelectorAll('#prayer-grid .prayer-btn'); const ids = Object.keys(PRAYERS); const i = ids.indexOf('ultimate_str'); if (bs[i]) bs[i].click(); });
    await A.until((st) => st.prayers.includes('ultimate_str'), 5000, 'prayer switch').catch(() => {});
    resp.prayer = Date.now() - t2;
    const hp0 = (await A.state()).hp[0], t3 = Date.now();
    await A.q(() => { document.querySelector('.tab-btn[data-tab="inv"]').click(); });
    await sleep(150);
    const slot = await A.q(() => { for (let i = 0; i < Player.inv.length; i++) { const x = Player.inv[i]; if (x && ITEMS[x.id].heal > 0) { const el = document.querySelectorAll('#inv-grid > *')[i]; if (el) { el.click(); return i; } } } return -1; });
    await A.until((st) => st.inv[slot] === null || (st.inv[slot] && st.inv[slot][0] !== 'trout'), 5000, 'the bite').catch(() => {});
    resp.eat = Date.now() - t3;
    fight.responsiveness = { ms: resp, ticks: { style: +(resp.style / TICK).toFixed(2), prayer: +(resp.prayer / TICK).toFixed(2), eat: +(resp.eat / TICK).toFixed(2) } };
    // a request goes out at once and is applied at the start of the next tick: never more than two ticks (plus the poll)
    check(fight, resp.style <= TICK * 2 + 400 && resp.prayer <= TICK * 2 + 600 && resp.eat <= TICK * 2 + 550, 'style, prayer and food switches answer on the next tick', fight.responsiveness.ms);
    // the attacker keeps fighting (eating dropped the attack order: click again, as a player would)
    await sleep(TICK);
    if (!sp(A.name).target) await A.q((n) => CROnlineQA.attackPlayerByName(n), B.name);
  }
  // the special attack: switch to the kit's spec weapon from the pack, arm the orb, strike, switch back (criterion 16)
  if (o.spec) {
    const specWeapon = { melee: 'steel_sword', ranged: 'ash_bow' }[o.swap ? o.kitB : o.kitA] || 'steel_sword';
    const main = (await A.state()).equip.weapon, e0 = (await A.state()).ui.set.spec;
    const clickInv = (id) => A.q((want) => { document.querySelector('.tab-btn[data-tab="inv"]').click(); const i = Player.inv.findIndex((x) => x && x.id === want); if (i >= 0) document.querySelectorAll('#inv-grid > *')[i].click(); return i; }, id);
    await clickInv(specWeapon);
    const switched = await A.until((st) => st.equip.weapon === specWeapon, 6000, 'spec weapon').then(() => true, () => false);
    await A.q(() => document.getElementById('spec-orb').click());
    await A.q((n) => CROnlineQA.attackPlayerByName(n), B.name);
    const used = await A.until((st) => st.ui.set.spec < e0, 20000, 'the special attack').then(() => true, () => false);
    const specAnims = serverAnims.filter((a) => a.tick >= since && a.who === 'p' + aPid && a.spec).length;
    check(fight, switched && used && specAnims > 0, 'the special attack fires from the orb after a weapon switch (energy spent, special swing seen)', { switched, energyBefore: e0, energyAfter: (await A.state()).ui.set.spec, specSwings: specAnims });
    await clickInv(main);
    await A.until((st) => st.equip.weapon === main, 6000, 'main weapon back').catch(() => {});
    await A.q((n) => CROnlineQA.attackPlayerByName(n), B.name);
  }
  // single-way combat: a third adventurer cannot join outside a multi-combat area
  if (o.thirdParty) {
    await O.q((n) => CROnlineQA.attackPlayerByName(n), B.name);
    const refused = await O.until((st) => st.chat.some((t) => /already fighting them|already under attack/i.test(t)), 8000, 'a single-combat refusal').then(() => true, () => false);
    check(fight, refused, 'a third adventurer is refused (single-way combat)');
    const ot = (await O.state()).me.tile;
    await O.q((x, z) => CROnlineQA.walk(x, z), ot.x, ot.z);
  }
  // a dropped connection mid-fight: the adventurer stays (logout lock), the client re-attaches, the fight goes on
  if (o.reconnect) {
    const nBefore = serverEvents.filter((e) => e.event === 'reconnect').length;
    await A.q(() => CROnlineQA.drop());
    await sleep(TICK * 2);
    const stillThere = !!sp(A.name) && sp(A.name).active;
    check(fight, stillThere, 'the dropped adventurer stays in the world (x-log protection)');
    const back = await A.until((st) => st.net.state === 'game' && st.net.stats.reconnects > 0, 20000, 'reconnect').then(() => true, () => false);
    check(fight, back && serverEvents.filter((e) => e.event === 'reconnect').length > nBefore, 'the client logs in again and re-attaches to the same adventurer');
    await A.q(() => CROnlineQA.logout());
    const refusedOut = await A.until((st) => st.chat.some((t) => /can't log out until/i.test(t)), 8000, 'logout refusal').then(() => true, () => false);
    check(fight, refusedOut && !!sp(A.name) && sp(A.name).active, 'logging out mid-fight is refused (the combat logout lock)');
    if (!sp(A.name).target) await A.q((n) => CROnlineQA.attackPlayerByName(n), B.name);
  }
  // fight to the death; remember each side's kept-on-death preview right up to the end
  const preview = {};
  const t0 = Date.now();
  let loser = null, winner = null;
  const dists = [];   // server distance between the fighters while both stand (reach per style, criterion 14)
  while (Date.now() - t0 < (o.maxMs || 400000)) {
    stopCheck();
    for (const c of [A, B]) {
      const s = await c.state();
      if (s.overlay && /you are dead/i.test(s.overlay)) { loser = c; break; }
      if (s.hp[0] > 0) preview[c.name] = await c.q(() => OnlineUI.keptList());
    }
    if (loser) break;
    { const pa = sp(A.name), pb = sp(B.name); if (pa && pb && !pa.dead && !pb.dead && pa.target) dists.push(Math.max(Math.abs(pa.x - pb.x), Math.abs(pa.z - pb.z))); }
    await sleep(TICK / 2);
  }
  for (const b of brains) await b.stop();
  if (strip) strip = await strip;
  if (!loser) { check(fight, false, 'someone dies'); return; }
  winner = loser === A ? B : A;
  { const kA = o.swap ? o.kitB : o.kitA, n = dists.length, near = dists.filter((d) => d <= 1).length / Math.max(1, n), far = dists.filter((d) => d >= 2).length / Math.max(1, n);
    fight.reach = { attackerKit: kA, samples: n, adjacentShare: +near.toFixed(2), atRangeShare: +far.toFixed(2) };
    const kB = o.swap ? o.kitA : o.kitB;
    if (kA === 'melee' || kB !== 'melee')   // a melee defender walks up to a ranged attacker: nothing to check there
      check(fight, n > 10 && (kA === 'melee' ? near >= 0.8 : far >= 0.8), 'the attacker fights from the right reach (melee adjacent, ranged and magic from range)', fight.reach); }
  fight.winner = winner.name; fight.loser = loser.name; fight.ticks = world.tick - since; fight.seconds = +((Date.now() - t0) / 1000).toFixed(1);
  const death = [...serverEvents].reverse().find((e) => e.event === 'death' && e.key === loser.name.toLowerCase());
  const kill = [...serverEvents].reverse().find((e) => e.event === 'pvp_kill' && e.victim === loser.name.toLowerCase());
  check(fight, !!kill && kill.killer === winner.name.toLowerCase(), 'the server credits the kill to the winner', kill);
  // respawn in the Commons at full health, holding exactly what the preview promised
  const ls = await loser.until((s) => s.me && s.me.tile.z < 20 && s.hp[0] === s.hp[1], 20000, 'respawn in the Commons');
  check(fight, Math.abs(ls.me.tile.x - world.map.respawn.x) <= 2 && Math.abs(ls.me.tile.z - world.map.respawn.z) <= 2, 'respawned at the Commons respawn', ls.me.tile);
  const keptIds = (death && death.kept || []).map((k) => k.id + 'x' + k.qty).sort();
  const promised = (preview[loser.name] && preview[loser.name].kept || []).map((k) => k.id + 'x' + k.qty).sort();
  check(fight, JSON.stringify(keptIds) === JSON.stringify(promised), 'kept items equal the client preview', { kept: keptIds, promised });
  const invIds = ls.inv.filter(Boolean).map((x) => x[0] + 'x' + x[1]).sort();
  check(fight, JSON.stringify(invIds) === JSON.stringify(keptIds), 'the loser holds exactly the kept items', { inv: invIds, kept: keptIds });
  check(fight, ls.overlay && /You kept/.test(ls.overlay), 'the death screen explains what was kept', ls.overlay && ls.overlay.slice(0, 160));
  // loot: all of it the winner's, none visible to the observer while private
  await sleep(TICK * 2);
  const dropped = (kill && kill.dropped) || [];
  const ws = await winner.state(), os2 = await O.state();
  // the death pile on the server: created at the death, owned by the winner
  const deathTick = kill ? kill.tick : since;
  const serverPile = [...world.objs.values()].filter((x) => x.owner === winner.name.toLowerCase() && !x.isPublic(world.tick) && kill && x.x === kill.x && x.z === kill.z).map((x) => x.uid);   // stackables merge into an older private stack on the tile
  const pile = ws.objs.filter((x) => x.own && serverPile.includes(x.uid));
  const want = dropped.map((d) => d[0]).concat(['bones']);
  const missing = want.filter((id) => !pile.some((x) => x.id === id));
  check(fight, missing.length === 0, 'the winner sees the whole pile as theirs', { missing, pile: pile.length });
  const leaked = os2.objs.filter((x) => serverPile.includes(x.uid));
  check(fight, leaked.length === 0, 'the observer cannot see the private pile', leaked.length);
  // the winner picks everything up (as many as fit)
  const invBefore = ws.inv.filter(Boolean).length;
  for (const it of pile) { await winner.q((uid) => CROnlineQA.send({ t: 'op_obj', uid, op: 'take' }), it.uid); await sleep(TICK * 1.2); }
  const wAfter = await winner.until((s) => s.objs.filter((x) => pile.some((p) => p.uid === x.uid)).length === 0 || s.inv.filter(Boolean).length >= 28, 45000, 'pick up the pile');
  check(fight, wAfter.inv.filter(Boolean).length > invBefore, 'loot reaches the winner\'s pack', { before: invBefore, after: wAfter.inv.filter(Boolean).length });
  const fxA1 = (await A.state()).fx, fxO1 = (await O.state()).fx;
  fight.fx = { attacker: fxDelta(fxA0, fxA1), observer: fxDelta(fxO0, fxO1) };
  if (fight.fx.attacker.late || fight.fx.observer.late) fight.lateLog = { A: await A.q(() => OnlineFX.lateLog()), O: await O.q(() => OnlineFX.lateLog()) };
  if (fight.fx.attacker.generic || fight.fx.observer.generic) fight.genericLog = { A: await A.q(() => OnlineFX.generic()), O: await O.q(() => OnlineFX.generic()) };
  check(fight, fight.fx.attacker.generic === 0 && fight.fx.observer.generic === 0 && fight.fx.attacker.late === 0, 'every splat is tied to its swing or projectile (no untimed hits, no late projectiles)', fight.fx);
  // protection prayers against players: the max hit is cut by 40% (never more than floor(max * 0.6) lands)
  for (const [def, att, max, pr] of [[B, A, maxA, o.protectB], [A, B, maxB, o.protectA]]) {
    if (!pr) continue;
    const key = 'p' + (def === A ? aPid : bPid), got = hitsSince(since, key).filter((h) => h.prayers && h.prayers.includes(pr)).map((h) => h.amount), cap = C.pvpProtectedMaxHit(max);   // only while the prayer was up (it can run dry)
    check(fight, got.length > 0 && Math.max(...got) <= cap, 'protection caps ' + att.name + '\'s hits on ' + def.name + ' at ' + cap + ' (max ' + max + ')', { biggest: Math.max(...got), cap });
  }
  // hits: every server hit on each fighter shows exactly one splat on the attacker's page and the observer's
  for (const [tgt, other] of [[A, B], [B, A]]) {
    const key = 'p' + (tgt === A ? aPid : bPid), ref = ['p', tgt === A ? aPid : bPid];
    const nServer = hitsSince(since, key).length;
    const onOther = await splatsOn(other, ref, sinceMs), onObs = await splatsOn(O, ref, sinceMs), onSelf = await splatsOn(tgt, ref, sinceMs);
    const selfOk = o.reconnect && tgt === A ? onSelf <= nServer : onSelf === nServer;   // a page offline for a moment misses the hits of those ticks
    const otherOk = o.reconnect && other === A ? onOther <= nServer : onOther === nServer;
    check(fight, nServer > 0 && otherOk && onObs === nServer && selfOk, 'splats on ' + tgt.name + ' match the server hits (no double or lost hits)', { server: nServer, opponent: onOther, observer: onObs, self: onSelf });
  }
  fight.strip = strip ? path.relative(path.join(__dirname, '..'), strip).replace(/\\/g, '/') : null;
  await syncCheck(fight, [A, B, O]);
  await closeOverlays([A, B, O]);
  huntAll(true);
}
function fxDelta(a, b) { const o = {}; for (const k of ['hits', 'splats', 'projectiles', 'matchedProjectile', 'matchedSwing', 'matchedNext', 'generic', 'late', 'deaths']) o[k] = ((b && b[k]) || 0) - ((a && a[k]) || 0); return o; }
async function closeOverlays(cs) { for (const c of cs) await c.q(() => OnlineUI.closeOverlay()); }
/** every page's view of every adventurer matches the server once things are still */
async function syncCheck(fight, clients) {
  await sleep(TICK * 3);
  const truth = new Map();
  for (const p of world.activePlayers()) truth.set(p.pid, { x: p.x, z: p.z, hp: p.hp });
  const bad = [];
  for (const c of clients) {
    const s = await c.state();
    const me = truth.get(s.me.pid);
    if (me && (me.x !== s.me.tile.x || me.z !== s.me.tile.z || me.hp !== s.hp[0])) bad.push({ page: c.name, who: 'self', client: [s.me.tile.x, s.me.tile.z, s.hp[0]], server: me });
    for (const p of s.players) { const t = truth.get(p.pid); if (t && (t.x !== p.tile.x || t.z !== p.tile.z || t.hp !== p.hp[0])) bad.push({ page: c.name, who: p.name, client: [p.tile.x, p.tile.z, p.hp[0]], server: t }); }
    // the drawn position has caught up with the tile
    const w = await c.q(() => { const m = OnlineActors.me(); const t = OnlineWorld.model().toWorld(m.tile.x, m.tile.z); return Math.hypot(m.mover.x - t.x, m.mover.z - t.z); });
    if (w > 0.5) bad.push({ page: c.name, who: 'drawn self', off: w });   // a background page steps its frames coarsely; a rubber band would be a tile or more
  }
  check(fight, bad.length === 0, 'every page agrees with the server (tiles, hitpoints)', bad);
}

/* ------------------------------------------------------------------------------------------------ */
/* PvM: one adventurer against the server's monsters                                                 */
/* ------------------------------------------------------------------------------------------------ */
const WEST = [[16, 40], [16, 47]];
async function pvmFight(fight, A, O, o) {
  log('fight', fight.name, A.name, 'vs', o.npc);
  heal(A.name);
  await kitUp(A, o.kit);
  const home = world.map.spawns.filter((s1) => s1.npc === o.npc);
  const target0 = home[0];
  const s0 = await A.state();
  if (s0.me.tile.z < 47) await walkRoute(A, target0.x < 32 ? WEST : EAST);
  // stand a few tiles from the haunt; the monster comes (they are aggressive) or we go to it
  const stand = o.stand || { x: target0.x + (target0.x < 32 ? 4 : -4), z: target0.z - 3 };
  await walkTo(A, stand.x, stand.z, 90000).catch(() => {});
  heal(A.name);
  if (o.protect) await A.q((id) => CROnlineQA.send({ t: 'prayer', id, on: true }), o.protect);
  const since = world.tick, sinceMs = Date.now();
  const st0 = await A.state();
  const fx0 = st0.fx, xp0 = Object.assign({}, st0.ui.xp10), aPid = st0.me.pid;
  // the monster already on us, else the nearest of its kind
  let nid = null;
  for (let tries = 0; tries < 20 && nid == null; tries++) {
    const on = await A.q(() => CROnlineQA.npcTargeting());
    const mine = on.map((id) => world.npcs.get(id)).find((n) => n && n.typeId === o.npc);
    if (mine) { nid = mine.nid; await A.q((id) => CROnlineQA.send({ t: 'op_npc', nid: id, op: 'attack' }), nid); break; }
    const r = await A.q((ty) => CROnlineQA.attackNpcNearest(ty), o.npc);
    if (r) nid = r.nid; else await sleep(TICK * 2);
  }
  if (nid == null) { check(fight, false, 'found a ' + o.npc); return; }
  const brain = fighterBrain(A, {});
  let strip = null;
  if (STRIPS && o.strip) strip = captureStrip(A, o.strip, [['me', 0], ['npc', nid]], 15, Math.round(TICK / 3));
  const npc = world.npcs.get(nid);
  const t0 = Date.now();
  let killed = false;
  while (Date.now() - t0 < (o.maxMs || 150000)) {
    stopCheck();
    if (!npc.active || npc.dying) { killed = true; break; }
    const st = await A.state();
    if (st.overlay && /you are dead/i.test(st.overlay)) break;
    const me = sp(A.name);
    if (me && !me.target && npc.active && !npc.dying) await A.q((id) => CROnlineQA.send({ t: 'op_npc', nid: id, op: 'attack' }), nid);
    await sleep(TICK);
  }
  await brain.stop();
  if (strip) strip = await strip;
  fight.seconds = +((Date.now() - t0) / 1000).toFixed(1); fight.ticks = world.tick - since;
  check(fight, killed, 'the ' + o.npc + ' dies');
  if (!killed) return;
  const tile = { x: npc.x, z: npc.z };
  await sleep(TICK * 5);
  const st = await A.state();
  // xp for the style and Hitpoints
  const skill = { melee: ['Attack', 'Strength', 'Defence'], ranged: ['Ranged'], magic: ['Magic'] }[o.kit];
  const gained = skill.some((sk) => (st.ui.xp10[sk] || 0) > (xp0[sk] || 0)) && (st.ui.xp10.Hitpoints || 0) > (xp0.Hitpoints || 0);
  check(fight, gained, 'experience for the style and Hitpoints arrives', skill.concat(['Hitpoints']).map((sk) => [sk, xp0[sk], st.ui.xp10[sk]]));
  // splats: every hit on the monster and on us shown exactly once on our page
  const nHitsNpc = hitsSince(since, 'n' + nid).length, onNpc = await splatsOn(A, ['n', nid], sinceMs);
  const nHitsMe = hitsSince(since, 'p' + aPid).length, onMe = await splatsOn(A, ['p', aPid], sinceMs);
  check(fight, nHitsNpc > 0 && onNpc === nHitsNpc && onMe === nHitsMe, 'splats match the server hits (monster and adventurer)', { npcServer: nHitsNpc, npcShown: onNpc, meServer: nHitsMe, meShown: onMe });
  if (o.protect) {
    const fromNpc = serverHits.filter((h) => h.tick >= since && h.to === 'p' + aPid);
    check(fight, fromNpc.every((h) => h.amount === 0), 'the protection prayer blocks the monster completely', fromNpc.map((h) => h.amount));
    await A.q((id) => CROnlineQA.send({ t: 'prayer', id, on: false }), o.protect);
  }
  fight.fx = { attacker: fxDelta(fx0, st.fx) };
  if (fight.fx.attacker.generic) fight.genericLog = await A.q(() => OnlineFX.generic());
  if (fight.fx.attacker.late) fight.lateLog = await A.q(() => OnlineFX.lateLog());
  check(fight, fight.fx.attacker.generic === 0 && fight.fx.attacker.late === 0, 'every splat is tied to its swing or projectile', fight.fx);
  // loot: the kill's pile is ours (bones always drop), shown once the body has sunk, and we pick the bones up
  const pile = st.objs.filter((x) => x.own && x.x === tile.x && x.z === tile.z);
  const bones = pile.find((x) => /bones/.test(x.id));
  check(fight, !!bones && pile.every((x) => !x.hidden), 'the drop shows as ours once the body has sunk', pile);
  if (bones) {
    const n0 = st.inv.filter((x) => x && /bones/.test(x[0])).length;
    await A.q((uid) => CROnlineQA.send({ t: 'op_obj', uid, op: 'take' }), bones.uid);
    const got = await A.until((s2) => s2.inv.filter((x) => x && /bones/.test(x[0])).length > n0, 20000, 'take the bones').then(() => true, () => false);
    check(fight, got, 'the bones reach the pack');
  }
  fight.strip = strip ? path.relative(path.join(__dirname, '..'), strip).replace(/\\/g, '/') : null;
  await syncCheck(fight, [A]);
}

/* ------------------------------------------------------------------------------------------------ */
/* measurements over the whole run (COMBAT_GRADE criteria 1-4)                                        */
/* ------------------------------------------------------------------------------------------------ */
function measure() {
  const out = {};
  // 1) accuracy: observed hits vs the sum of per-roll chances (a z-score; |z| < 3 is a match)
  const varSum = rolls.n ? rolls.expected * (1 - rolls.expected / rolls.n) : 0;
  out.accuracy = { rolls: rolls.n, expectedHits: +rolls.expected.toFixed(1), observedHits: rolls.hits, z: varSum ? +((rolls.hits - rolls.expected) / Math.sqrt(varSum)).toFixed(2) : null };
  // 2) damage 0..max uniform: chi-square per max hit with enough draws
  out.damage = Object.keys(rolls.damage).map((m) => { const b = rolls.damage[m], n = b.reduce((a, x) => a + x, 0), e = n / b.length;
    const chi = b.reduce((a, x) => a + (x - e) * (x - e) / e, 0); return { max: +m, draws: n, counts: b, chi2: +chi.toFixed(2), dof: b.length - 1 }; }).filter((r) => r.draws >= 30);
  // 3) attack speed: gaps between one attacker's swings, compared with the weapon's 2004 delay
  const gaps = {};
  const byWho = {};
  for (const a of serverAnims) (byWho[a.who] = byWho[a.who] || []).push(a);
  for (const who in byWho) { const l = byWho[who]; for (let i = 1; i < l.length; i++) { const g = l[i].tick - l[i - 1].tick, k = (l[i].weapon || who.charAt(0) === 'n' && 'monster' || 'unarmed') + ':' + l[i].name + ':' + l[i].expect;
    if (l[i].expect === l[i - 1].expect && g <= 12) (gaps[k] = gaps[k] || []).push(g); } }
  out.attackSpeed = Object.keys(gaps).map((k) => { const l = gaps[k], hist = {}; l.forEach((g) => { hist[g] = (hist[g] || 0) + 1; });
    const mode = +Object.keys(hist).sort((a, b) => hist[b] - hist[a])[0]; const [weapon, name, expect] = k.split(':'); return { weapon, name, expect: +expect, mode, samples: l.length, hist }; });
  // 4) projectile hit delays: the first hit on the target after the announcement lands when the client expects it
  let ok = 0, bad = [];
  for (const fx of serverFx) {
    if (fx.splash) continue;
    const to = fx.to[0] + fx.to[1], from = fx.from[0] + fx.from[1];
    const h = serverHits.find((x) => x.to === to && x.tick >= fx.tick);
    if (!h) continue;
    const att = fx.from[0] === 'n' ? { kind: 'npc' } : { kind: 'player', pid: fx.from[1] }, tgt = fx.to[0] === 'n' ? { kind: 'npc' } : { kind: 'player', pid: fx.to[1] };
    const want = OnlineTiming.landingOffset(att, tgt, fx.d), got = h.tick - fx.tick;
    if (want === got) ok++; else if (bad.length < 20) bad.push({ from, to, d: fx.d, want, got });
  }
  out.projectileTiming = { matched: ok, mismatched: bad.length, examples: bad };
  return out;
}

/* ------------------------------------------------------------------------------------------------ */
/* main                                                                                               */
/* ------------------------------------------------------------------------------------------------ */
const SCENARIOS = [
  // PvP, each style on its own, with eating and protection prayers (the defender prays against the attacker's style)
  { name: 'pvp-melee', kind: 'pvp', kitA: 'melee', kitB: 'melee', protectB: 'protect_melee', strip: 'pvp_melee', thirdParty: true, screens: 'pvp' },
  { name: 'pvp-ranged', kind: 'pvp', kitA: 'ranged', kitB: 'ranged', protectB: 'protect_range', strip: 'pvp_ranged' },
  { name: 'pvp-magic', kind: 'pvp', kitA: 'magic', kitB: 'magic', protectB: 'protect_magic', strip: 'pvp_magic', switches: true },
  // PvM, each style against the test map's monsters (melee and magic monsters; protection prayers against them)
  { name: 'pvm-melee-gnarlgob', kind: 'pvm', kit: 'melee', npc: 'gnarlgob', strip: 'pvm_melee' },
  { name: 'pvm-ranged-mosswolf', kind: 'pvm', kit: 'ranged', npc: 'mosswolf', strip: 'pvm_ranged' },
  { name: 'pvm-magic-skeleton', kind: 'pvm', kit: 'magic', npc: 'skeleton', strip: 'pvm_magic' },
  { name: 'pvm-melee-moss_seer', kind: 'pvm', kit: 'melee', npc: 'moss_seer', protect: 'protect_magic' },
  { name: 'pvm-ranged-skeleton', kind: 'pvm', kit: 'ranged', npc: 'skeleton', protect: 'protect_melee' },
  { name: 'pvm-magic-gnarlgob', kind: 'pvm', kit: 'magic', npc: 'gnarlgob' },
  { name: 'pvm-melee-bryn_raider', kind: 'pvm', kit: 'melee', npc: 'bryn_raider', protect: 'protect_melee' },
  { name: 'pvm-ranged-moss_seer', kind: 'pvm', kit: 'ranged', npc: 'moss_seer' },
  { name: 'pvm-magic-cinder_shade', kind: 'pvm', kit: 'magic', npc: 'cinder_shade', protect: 'protect_melee', maxMs: 240000 },
  // mixed PvP, roles swapped, Protect Item, a dropped connection mid-fight
  { name: 'pvp-melee-vs-magic', kind: 'pvp', kitA: 'melee', kitB: 'magic', protectB: 'protect_melee', protectItemA: true },
  { name: 'pvp-ranged-vs-melee', kind: 'pvp', kitA: 'ranged', kitB: 'melee', protectA: 'protect_melee', spec: true },
  { name: 'pvp-magic-vs-ranged', kind: 'pvp', kitA: 'magic', kitB: 'ranged' },
  { name: 'pvp-melee-swapped', kind: 'pvp', kitA: 'melee', kitB: 'melee', swap: true, switches: true, spec: true },
  { name: 'pvp-ranged-swapped', kind: 'pvp', kitA: 'ranged', kitB: 'magic', swap: true, protectItemA: true },
  { name: 'pvp-reconnect', kind: 'pvp', kitA: 'melee', kitB: 'ranged', reconnect: true },
  { name: 'pvp-magic-vs-melee', kind: 'pvp', kitA: 'magic', kitB: 'melee', protectB: 'protect_magic' },
  { name: 'pvm-melee-hex_adept', kind: 'pvm', kit: 'melee', npc: 'hex_adept', protect: 'protect_magic' },
];
(async () => {
  await startServer();
  browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: HEADFUL ? false : 'new',
    args: ['--mute-audio', '--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const tag = Date.now().toString(36).slice(-4);
  try { fs.writeFileSync(path.join(OUT, 'chrome.pid'), String(browser.process().pid)); } catch (e) { /* not fatal */ }
  if (fs.existsSync(STOP_FILE)) fs.unlinkSync(STOP_FILE);
  const A = await openClient('Ash' + tag), B = await openClient('Bryn' + tag), O = await openClient('Oak' + tag, { width: 1280, height: 800 });
  for (const c of [A, B, O]) await register(c, c.name);
  log('three adventurers in the world');
  for (const sc of SCENARIOS) {
    if (ONLY && !ONLY.includes(sc.name)) continue;
    const fight = { name: sc.name, checks: [] };
    report.fights.push(fight);
    try {
      if (sc.kind === 'pvp') await pvpFight(fight, A, B, O, sc);
      else if (sc.kind === 'pvm') await pvmFight(fight, A, O, sc);
    } catch (e) { check(fight, false, 'scenario ran', e.message); }
    huntAll(true);
    await closeOverlays([A, B, O]).catch(() => {});
    fs.writeFileSync(path.join(OUT, 'online_report.json'), JSON.stringify(report, null, 1));
    const ok = fight.checks.every((c) => c.ok);
    log(sc.name, ok ? 'PASS' : 'FAIL', fight.winner ? `(${fight.winner} beat ${fight.loser} in ${fight.seconds}s / ${fight.ticks} ticks)` : '');
  }
  report.pageErrors = { A: A.errors, B: B.errors, O: O.errors };
  report.measured = measure();
  report.movement = {};
  for (const c of [A, B, O]) { const st = await c.state(); report.movement[c.name] = { maxBacklog: st.me.maxBacklog, catchUps: st.me.catchUps, teleports: st.me.teles, ticksSeen: st.ticks, tickGaps: st.net.stats.gaps, maxGapMs: st.net.stats.maxGapMs, reconnects: st.net.stats.reconnects }; }
  report.finished = new Date().toISOString();
  report.pass = report.failures.length === 0 && [A, B, O].every((c) => c.errors.length === 0);
  fs.writeFileSync(path.join(OUT, 'online_report.json'), JSON.stringify(report, null, 1));
  log(report.pass ? 'ALL PASS' : 'FAILURES: ' + report.failures.length, '->', path.join(OUT, 'online_report.json'));
  await browser.close();
  await app.close();
  process.exit(report.pass ? 0 : 1);
})().catch(async (e) => { console.error(e); try { await browser.close(); } catch (x) {} try { await app.close(); } catch (x) {} process.exit(1); });
