/* test_online_client.js — the online client's pure parts (W2): the server-map model, the ground lattice, the tick
 * mover (8 directions, walk/run pacing, teleports, catch-up), the combat timing rules, and the connection
 * (hello -> login -> welcome, pings, reconnect after a dropped socket, no reconnect after a logout).
 * Run: node tools/test_online_client.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const OnlineMap = require('../src/online_world.js');
const OnlineMover = require('../src/online_actors.js');
const OnlineTiming = require('../src/online_fx.js');
const CRNet = require('../src/net_client.js');
const PVP = require('../shared/pvp.js');
const C = require('../shared/combat.js');

let pass = 0, fail = 0;
function test(name, fn) {
  try { const r = fn(); if (r && r.then) return r.then(() => { pass++; console.log('PASS', name); }, (e) => { fail++; console.log('FAIL', name, e.message); }); pass++; console.log('PASS', name); }
  catch (e) { fail++; console.log('FAIL', name, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); }
  return Promise.resolve();
}
const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'data', 'maps', 'scarlands_test.json'), 'utf8'));

(async () => {
  const m = OnlineMap.create(MAP);
  await test('server tiles <-> world points round-trip; north (+z) is up the screen (-world z)', () => {
    for (const [x, z] of [[0, 0], [63, 127], [32, 10], [15, 44], [47, 45]]) {
      const w = m.toWorld(x, z), t = m.toTile(w.x, w.z);
      assert.deepStrictEqual(t, { x, z });
    }
    assert.ok(m.toWorld(32, 60).z < m.toWorld(32, 10).z, 'north of the Ditch is further up (smaller world z)');
  });
  await test('walkability matches the server map: the Ditch is water with two crossings, rocks block, outside is solid', () => {
    for (let x = 0; x <= 63; x++) {
      const crossing = x === 15 || x === 16 || x === 47 || x === 48;
      assert.strictEqual(m.isWater(x, 44), !crossing, 'ditch row 44 at x=' + x);
      assert.strictEqual(m.walkable(x, 45), crossing, 'ditch row 45 at x=' + x);
    }
    assert.ok(m.isBlocked(5, 5) && m.isBlocked(-1, 5) && m.isBlocked(5, 128));
    assert.ok(m.walkable(32, 10) && m.walkable(58, 68));
  });
  await test('Wilderness level and multi-combat agree with shared/pvp.js everywhere', () => {
    for (let z = 0; z <= 127; z++) for (let x = 0; x <= 63; x += 7) {
      assert.strictEqual(m.wildernessLevel(x, z), PVP.wildernessLevel(x, z, MAP.areas.wilderness), 'wl ' + x + ',' + z);
      assert.strictEqual(m.isMulti(x, z), PVP.isMulti(x, z, MAP.areas.multi), 'multi ' + x + ',' + z);
    }
    assert.strictEqual(m.areaName(32, 10), 'Veyhollow Commons');
    assert.strictEqual(m.wildernessLevel(32, 48), 1);
    assert.strictEqual(m.wildernessLevel(32, 127), 10);
  });
  await test('nearest walkable tile snaps a click on water or rock to the bank', () => {
    const w = m.nearestWalkable(30, 44, 3);
    assert.ok(w && m.walkable(w.x, w.z) && Math.abs(w.z - 44) <= 1, JSON.stringify(w));
    assert.deepStrictEqual(m.nearestWalkable(32, 10, 3), { x: 32, z: 10 });
  });
  await test('the ground: the Ditch is a trench (water below the banks), the pocket is ringed by banks', () => {
    const L = OnlineMap.lattice(m);
    assert.strictEqual(L.W, 64 + 2 * L.P); assert.strictEqual(L.D, 128 + 2 * L.P);
    const ditch = m.toWorld(30, 44), bank = m.toWorld(30, 40), wild = m.toWorld(30, 50);
    const hd = OnlineMap.heightAt(L, ditch.x, ditch.z);
    assert.ok(hd < OnlineMap.WATER_Y, 'the ditch bed lies under the water surface: ' + hd);
    assert.ok(OnlineMap.heightAt(L, bank.x, bank.z) > OnlineMap.WATER_Y + 0.2 && OnlineMap.heightAt(L, wild.x, wild.z) > OnlineMap.WATER_Y + 0.2);
    const edge = OnlineMap.heightAt(L, -6, 60), inside = OnlineMap.heightAt(L, 20, 60);
    assert.ok(edge > inside + 1, 'land banks up outside the bounds');
    // deterministic: the same map always gives the same ground (every client draws the same world)
    const L2 = OnlineMap.lattice(OnlineMap.create(MAP));
    assert.strictEqual(Buffer.from(L.h.buffer).toString('base64'), Buffer.from(L2.h.buffer).toString('base64'));
  });
  await test('mover: walking covers one tile per tick, running two, diagonals included (8 directions)', () => {
    const mv = new OnlineMover.Mover(10.5, 10.5);
    mv.push([{ x: 11.5, z: 9.5 }], 600);                 // one diagonal step
    mv.update(300); assert.ok(Math.abs(mv.x - 11) < 1e-6 && Math.abs(mv.z - 10) < 1e-6, 'half way at half a tick');
    mv.update(300); assert.deepStrictEqual([mv.x, mv.z], [11.5, 9.5]);
    assert.ok(mv.dirX > 0 && mv.dirZ < 0, 'faces the diagonal');
    mv.push([{ x: 12.5, z: 9.5 }, { x: 13.5, z: 9.5 }], 600);   // a run tick: two steps in 600 ms
    mv.update(300); assert.deepStrictEqual([mv.x, mv.z], [12.5, 9.5]);
    mv.update(300); assert.deepStrictEqual([mv.x, mv.z], [13.5, 9.5]);
    assert.ok(Math.abs(mv.speed - 1 / 0.3) < 0.01, 'running speed is two tiles per tick');
  });
  await test('mover: a teleport is a jump, and a backlog catches up instead of lagging behind', () => {
    const mv = new OnlineMover.Mover(0.5, 0.5);
    mv.push([{ x: 1.5, z: 0.5 }], 600); mv.tele(30.5, 40.5);
    assert.deepStrictEqual([mv.x, mv.z, mv.pending()], [30.5, 40.5, 0]);
    for (let i = 0; i < 8; i++) mv.push([{ x: 31.5 + i, z: 40.5 }], 600);   // eight ticks arrive at once
    let t = 0; while (mv.pending() && t < 10000) { mv.update(16); t += 16; }
    assert.deepStrictEqual([mv.x, mv.z], [38.5, 40.5]);
    assert.ok(t < 8 * 600 * 0.8, 'caught up faster than real time: ' + t + ' ms');
  });
  await test('hit timing: melee on NPCs next tick, PvP by distance with the PID rule, NPC hits at once', () => {
    const me = { kind: 'me', pid: 5 }, hi = { kind: 'player', pid: 9 }, lo = { kind: 'player', pid: 2 }, npc = { kind: 'npc' };
    assert.strictEqual(OnlineTiming.landingOffset(me, npc, 0), 1);
    assert.strictEqual(OnlineTiming.landingOffset(me, npc, 3), 3);
    assert.strictEqual(OnlineTiming.landingOffset(npc, me, 0), 0);
    assert.strictEqual(OnlineTiming.landingOffset(npc, me, 2), 2);
    assert.strictEqual(OnlineTiming.landingOffset(me, hi, 0), 0, 'higher pid target: same tick');
    assert.strictEqual(OnlineTiming.landingOffset(me, lo, 0), 1, 'lower pid target: a tick later');
    assert.strictEqual(OnlineTiming.landingOffset(me, lo, 2), 3);
    // the projectile is planned to land with the splat: release + flight end at the landing time
    for (const d of [1, 3, 7, 10]) {
      const land = Math.floor(C.spellDuration(d) / 30) + 1, sec = land * 0.6;
      const plan = OnlineTiming.projectilePlan(sec, OnlineTiming.KIT_IMPACT.cast, OnlineTiming.flightTime('magic', d));
      assert.ok(Math.abs(plan.arrive - sec) < 1e-9 && plan.late === 0 && plan.speed >= 1, 'spell at distance ' + d);
      const aland = Math.floor(C.arrowDuration(d) / 30), asec = Math.max(1, aland) * 0.6;
      const ap = OnlineTiming.projectilePlan(asec, OnlineTiming.KIT_IMPACT.bow, OnlineTiming.flightTime('arrow', d));
      assert.ok(Math.abs(ap.arrive - asec) < 1e-9 && ap.late === 0 && ap.release >= OnlineTiming.MIN_RELEASE, 'arrow at distance ' + d + ' late ' + ap.late);
    }
    assert.strictEqual(OnlineTiming.swingDelay(0.6, 0.3), 0.3);
  });

  /* ---- the connection, against a fake socket ---- */
  function fakeWorld() {
    const sockets = [];
    const timers = []; let now = 0;   // the client's clock (advance() moves it)
    class FakeWS {
      constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); setTimeout(() => { this.readyState = 1; this.onopen && this.onopen(); }, 0); }
      send(s) { const m = JSON.parse(s); this.sent.push(m); this.server(m); }
      close() { this.readyState = 3; setTimeout(() => this.onclose && this.onclose(), 0); }
      reply(m) { setTimeout(() => this.onmessage && this.onmessage({ data: JSON.stringify(m) }), 0); }
      server(m) {
        if (m.t === 'hello') this.reply({ t: 'hello', v: 1, tickMs: 600, server: 'fake' });
        else if (m.t === 'login') this.reply({ t: 'welcome', pid: 3, name: m.user, tick: 10, tickMs: 600, x: 32, z: 10, stats: {}, inv: [], eq: {}, set: {}, en: 10000, skull: 0, pr: [], reconnected: sockets.length > 1 ? 1 : undefined });
        else if (m.t === 'register') this.reply({ t: 'register_ok', user: m.user });
        else if (m.t === 'ping') this.reply({ t: 'pong', n: m.n, tick: 11 });
        else if (m.t === 'logout') { this.reply({ t: 'logout', reason: 'logout' }); setTimeout(() => this.close(), 5); }
      }
    }
    const tm = { set: (f, ms) => { const h = { f, ms, every: true }; timers.push(h); return h; }, clear: (h) => { h.dead = true; },
      once: (f, ms) => { const h = { f, ms }; timers.push(h); return h; }, cancel: (h) => { h.dead = true; } };
    const fire = (every) => { for (const h of timers.slice()) if (!h.dead && !!h.every === every) { if (!every) h.dead = true; h.f(); } };
    return { FakeWS, sockets, timers: tm, fire, now: () => now, advance: (ms) => { now += ms; } };
  }
  const flush = () => new Promise((r) => setTimeout(r, 20));
  // the fake socket answers through a chain of timers: on a busy machine wait for the outcome, not a fixed time
  const settle = async (pred, ms) => { const t0 = Date.now(); while (!pred() && Date.now() - t0 < (ms || 3000)) await flush(); };
  await test('connection: hello, register, login -> welcome, pings keep us alive', async () => {
    const f = fakeWorld();
    const c = new CRNet.Client({ url: 'ws://x', WebSocket: f.FakeWS, timers: f.timers });
    const h = await c.connect(); assert.strictEqual(h.t, 'hello');
    assert.strictEqual((await c.register('ash', 'password1')).t, 'register_ok');
    const w = await c.login('ash', 'password1', { body: 'A' });
    assert.strictEqual(w.t, 'welcome'); assert.strictEqual(c.state, 'game');
    assert.deepStrictEqual(f.sockets[0].sent.find((m) => m.t === 'login').look, { body: 'A' });
    f.fire(true); await settle(() => c.rtt !== null);
    assert.ok(f.sockets[0].sent.some((m) => m.t === 'ping'), 'pinged');
    assert.ok(c.rtt !== null, 'measured the round trip');
    assert.ok(c.send({ t: 'walk', x: 1, z: 2 }));
  });
  await test('connection: the ticks keep a background tab alive (its timers held to one a minute)', async () => {
    const f = fakeWorld();
    const c = new CRNet.Client({ url: 'ws://x', WebSocket: f.FakeWS, timers: f.timers, now: f.now });
    await c.connect(); await c.login('dara', 'password1');
    const pings = () => f.sockets[0].sent.filter((m) => m.t === 'ping').length;
    const p0 = pings();
    f.advance(4000); f.sockets[0].reply({ t: 'tick', n: 11 }); await settle(() => c.lastTick === 11);
    assert.strictEqual(pings(), p0, 'nothing extra while we spoke recently');
    f.advance(6500); f.sockets[0].reply({ t: 'tick', n: 12 }); await settle(() => c.lastTick === 12);   // the interval timer never fired
    assert.strictEqual(pings(), p0 + 1, 'a tick answered with a ping after 10 s of silence');
    f.advance(600); f.sockets[0].reply({ t: 'tick', n: 13 }); await settle(() => c.lastTick === 13);
    assert.strictEqual(pings(), p0 + 1, 'one ping, not one per tick');
  });
  await test('connection: a dropped socket in the world logs in again and re-attaches (reconnected)', async () => {
    const f = fakeWorld();
    const c = new CRNet.Client({ url: 'ws://x', WebSocket: f.FakeWS, timers: f.timers });
    await c.connect(); await c.login('bryn', 'password1');
    const events = [];
    c.on('dropped', () => events.push('dropped')); c.on('reconnected', (m) => events.push('reconnected:' + m.reconnected));
    c.simulateDrop(); await flush();
    assert.deepStrictEqual(events, ['dropped']);
    f.fire(false); await settle(() => events.length >= 2);
    assert.deepStrictEqual(events, ['dropped', 'reconnected:1']);
    assert.strictEqual(f.sockets.length, 2);
    assert.strictEqual(c.state, 'game');
  });
  await test('connection: after a logout nothing reconnects and the credentials are forgotten', async () => {
    const f = fakeWorld();
    const c = new CRNet.Client({ url: 'ws://x', WebSocket: f.FakeWS, timers: f.timers });
    await c.connect(); await c.login('carys', 'password1');
    const ev = []; c.on('logout', () => ev.push('logout')); c.on('dropped', () => ev.push('dropped')); c.on('closed', () => ev.push('closed'));
    c.logout(); await settle(() => ev.includes('closed'));
    assert.ok(ev.includes('logout') && !ev.includes('dropped'), ev.join(','));
    assert.strictEqual(c.creds, null);
    f.fire(false); await flush();
    assert.strictEqual(f.sockets.length, 1, 'no second socket');
  });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
