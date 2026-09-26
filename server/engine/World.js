'use strict';
/* ============ World — the 600 ms game tick ============
 * One authoritative simulation. The cycle and its phase order are ported from the Lost City engine
 * (MIT), src/engine/World.ts cycle() (verified 2026-09-25):
 *
 *   1 processWorld        world queue (scheduled work) + NPC hunting (aggression)
 *   2 processClientsIn    decode client intents (rate-limited), set paths / interactions, item ops
 *   3 processNpcEventQueue npc spawn events
 *   4 processNpcs         each NPC: respawn, hunt target, regen, queue, movement/interaction
 *   5 processPlayers      each player (pid order): death, queues, timers, interaction + movement, energy
 *   6 processLogouts      honour logout requests once the logout lock allows it, x-log timeouts
 *   7 processLogins       new players enter (after processing, so nothing hits them this tick)
 *   8 processZones        ground items reveal / despawn
 *   9 processInfo         build every client's delta (15-tile view)
 *  10 processClientsOut   send
 *  11 processCleanup      reset per-tick masks
 *  then autosave every 1500 ticks (15 minutes).
 *
 * The real-time loop is drift-corrected exactly like the engine: the next cycle is scheduled at
 * tickMs - (time this cycle took) - (how late this cycle started).
 * Tests drive world.cycle() by hand for determinism.
 */
const fs = require('node:fs');
const path = require('node:path');
const CollisionMap = require('./CollisionMap');
const ZoneMap = require('./ZoneMap');
const Npc = require('./Npc');
const GroundItem = require('./GroundItem');
const combat = require('./combat');
const input = require('./input');
const info = require('./info');
const coord = require('./coord');
const C = require('../../shared/combat.js');
const PVP = require('../../shared/pvp.js');
const D = require('../../shared/drops.js');
const RNG = require('../../shared/rng.js');
const GameData = require('../content/GameData');

const TICK_MS = 600;
const MAX_PLAYERS = 2047;
const AUTOSAVE_TICKS = 1500;             // World.PLAYER_SAVERATE: 15 minutes
const TIMEOUT_NO_CONNECTION = 50;        // 30 s without a socket -> idle logout request
const TIMEOUT_NO_RESPONSE = 100;         // 60 s without any message -> forced logout
const MAX_INPUT_PER_TICK = 10;           // intents decoded per player per tick; the rest wait

const PHASES = ['world', 'clientsIn', 'npcEvents', 'npcs', 'players', 'logouts', 'logins', 'zones', 'info', 'clientsOut', 'cleanup'];

class World {
  /**
   * @param opts.map       parsed map JSON or a path (default server/data/maps/scarlands_test.json)
   * @param opts.content   GameData (default: loaded from src/)
   * @param opts.seed      seed for a deterministic world RNG (default: Math.random-backed)
   * @param opts.store     persistence adapter {savePlayer(player)} (optional)
   * @param opts.tickMs    real-time tick length (default 600)
   * @param opts.timeouts  {noConnection, noResponse} in ticks
   * @param opts.logger    (event, data) => void
   */
  constructor(opts) {
    const o = opts || {};
    let map = o.map || path.join(__dirname, '..', 'data', 'maps', 'scarlands_test.json');
    if (typeof map === 'string') map = JSON.parse(fs.readFileSync(map, 'utf8'));
    this.map = map;
    this.content = o.content || GameData.get();
    this.rng = o.seed != null ? RNG.create(o.seed) : RNG.math;
    this.store = o.store || null;
    this.tickMs = o.tickMs || TICK_MS;
    this.timeouts = Object.assign({ noConnection: TIMEOUT_NO_CONNECTION, noResponse: TIMEOUT_NO_RESPONSE }, o.timeouts || {});
    this.logger = o.logger || null;
    this.collision = new CollisionMap(map);
    this.zones = new ZoneMap();
    this.tick = 0;
    this.players = new Array(MAX_PLAYERS + 1).fill(null);   // index = pid (1..2047)
    this.byKey = new Map();
    this.newPlayers = [];
    this.npcs = new Map();
    this.nextNid = 1;
    this.objs = new Map();
    this.nextObjUid = 1;
    this.worldQueue = [];
    this.npcEvents = [];
    this.phaseHook = null;        // tests: (phaseName) => void
    this.running = false;
    this.timer = null;
    this.stats = { cycleMs: [], phaseMs: {}, lastCycleMs: 0, lastDrift: 0, players: 0, npcs: 0 };
    for (const s of map.spawns || []) this.spawnNpc(s.npc, s);
  }

  log(event, data) { if (this.logger) this.logger(event, data); }

  /* ------------------------------------------------------------------------------------------ */
  /* map queries                                                                                  */
  /* ------------------------------------------------------------------------------------------ */
  wildernessLevel(x, z) { return PVP.wildernessLevel(x, z, this.map.areas && this.map.areas.wilderness); }
  isMulti(x, z) { return PVP.isMulti(x, z, this.map.areas && this.map.areas.multi); }
  areaName(x, z) {
    for (const a of (this.map.areas && this.map.areas.named) || []) if (PVP.inRect(a, x, z)) return a.name;
    return null;
  }
  /** a walkable tile within the respawn radius (map_findsquare-style) */
  respawnPoint() {
    const r = this.map.respawn || { x: 0, z: 0, radius: 0 };
    for (let i = 0; i < 20; i++) {
      const x = r.x + this.rng.range(-(r.radius | 0), r.radius | 0), z = r.z + this.rng.range(-(r.radius | 0), r.radius | 0);
      if (this.collision.isWalkable(x, z, 0)) return { x, z, level: 0 };
    }
    return { x: r.x, z: r.z, level: 0 };
  }
  teleportDestination() { return this.respawnPoint(); }

  /* ------------------------------------------------------------------------------------------ */
  /* entities                                                                                     */
  /* ------------------------------------------------------------------------------------------ */
  spawnNpc(typeId, spawn) {
    const npc = new Npc(this, this.nextNid++, typeId, spawn);
    this.npcs.set(npc.nid, npc);
    this.addNpcToWorld(npc);
    return npc;
  }
  addNpcToWorld(npc) {
    npc.active = true;
    this.zones.enter(npc, 'npc');
    this.collision.changeNpc(npc.x, npc.z, npc.level, npc.size, true);
    npc.tele = true;
  }
  respawnNpc(npc) {
    npc.reset();
    npc.x = npc.startX; npc.z = npc.startZ; npc.level = npc.startLevel;
    this.addNpcToWorld(npc);
    npc.infoChanged = true;
  }
  /** end of npc_death: remove, drop the hero's loot, start the respawn countdown */
  finishNpcDeath(npc) {
    combat.npcDeathDrops(this, npc);
    npc.active = false; npc.dying = false;
    this.zones.leave(npc, 'npc', npc.level, npc.x, npc.z);
    this.collision.changeNpc(npc.x, npc.z, npc.level, npc.size, false);
    npc.respawnAt = this.tick + npc.respawnTicks;
    this.log('npc_death', { nid: npc.nid, type: npc.typeId });
  }
  playerByKey(key) { const p = this.byKey.get(key); return p && p.active ? p : null; }
  playerByPid(pid) { return this.players[pid] || null; }
  *activePlayers() { for (let i = 1; i <= MAX_PLAYERS; i++) { const p = this.players[i]; if (p) yield p; } }
  get playerCount() { return this.byKey.size; }

  /** ground items: merge stackables with the same receiver on the same tile (World.addObj) */
  addObj(id, qty, x, z, level, owner, opts) {
    const def = this.content.ITEMS[id]; if (!def || !(qty > 0)) return null;
    if (def.stack) {
      for (const o of this.zones.get(level, x, z).objs) {
        if (o.id === id && o.x === x && o.z === z && o.owner === (owner || null) && !o.isPublic(this.tick)) {
          o.qty += qty; o.despawnTick = this.tick + D.LOOT_DESPAWN_TICKS; return o;
        }
      }
    }
    const o = new GroundItem(this.nextObjUid++, id, qty, x, z, level, owner, this.tick,
      Object.assign({ privateTicks: D.LOOT_PRIVATE_TICKS, duration: D.LOOT_DESPAWN_TICKS }, opts || {}));
    this.objs.set(o.uid, o);
    this.zones.enter(o, 'obj');
    return o;
  }
  removeObj(o) { if (this.objs.delete(o.uid)) this.zones.leave(o, 'obj', o.level, o.x, o.z); }
  takeObj(p, o) {
    if (this.objs.get(o.uid) !== o || !o.visibleTo(p.key, this.tick)) return false;
    if (!p.invAdd(o.id, o.qty)) { p.message('You do not have enough inventory space.'); return false; }
    this.removeObj(o);
    this.log('take', { key: p.key, id: o.id, qty: o.qty, owner: o.owner });
    return true;
  }
  /** run fn after `delay` ticks (world queue, post-decrement like the engine) */
  schedule(delay, fn) { this.worldQueue.push({ delay: delay | 0, fn }); }
  /** projectile / effect visuals to everyone who can see the source */
  broadcastFx(src, fx) {
    for (const zone of this.zones.zonesAround(src.level, src.x, src.z, info.VIEW)) {
      for (const q of zone.players) if (q.active && Math.abs(q.x - src.x) <= info.VIEW && Math.abs(q.z - src.z) <= info.VIEW) q.out.fx.push(fx);
    }
  }
  /** one firing of a player's prayer drain timer */
  prayerDrain(p) {
    if (!p.prayers.size) { p.clearTimer('prayer_drain'); return; }
    const res = C.prayerDrainTick(p.prayerCounter, C.prayerDrainEffect(p.prayers), C.prayerDrainResistance(p.combatStats().bonuses.prayer));
    p.prayerCounter = res.counter;
    if (res.drained > 0) {
      p.setLevel('Prayer', p.cur('Prayer') - res.drained);
      if (p.cur('Prayer') === 0) {
        p.message('You have run out of prayer points, you must recharge at an altar.');
        p.prayers.clear(); p.prayerCounter = 0; p.clearTimer('prayer_drain');
        p.out.prayersDirty = true; p.infoChanged = true; p.invalidate();
      }
    }
  }

  /* ------------------------------------------------------------------------------------------ */
  /* login / logout                                                                               */
  /* ------------------------------------------------------------------------------------------ */
  /** queue a player for processLogins; returns false if that account is already in the world */
  queueLogin(player) {
    if (this.byKey.has(player.key) || this.newPlayers.some((q) => q.key === player.key)) return false;
    this.newPlayers.push(player);
    return true;
  }
  nextPid() { for (let i = 1; i <= MAX_PLAYERS; i++) if (!this.players[i]) return i; return -1; }
  removePlayer(p) {
    if (p.pid > 0 && this.players[p.pid] === p) this.players[p.pid] = null;
    this.byKey.delete(p.key);
    this.zones.leave(p, 'player', p.level, p.x, p.z);
    p.active = false;
    for (const n of this.npcs.values()) if (n.target === p) n.resetDefaults();
    for (const q of this.activePlayers()) if (q.target === p) q.clearInteraction();
  }

  /* ------------------------------------------------------------------------------------------ */
  /* the cycle                                                                                    */
  /* ------------------------------------------------------------------------------------------ */
  start() {
    if (this.running) return;
    this.running = true;
    this.nextTick = Date.now() + this.tickMs;
    const loop = () => {
      if (!this.running) return;
      const start = Date.now();
      const drift = Math.max(0, start - this.nextTick);
      this.stats.lastDrift = drift;
      try { this.cycle(); } catch (e) { this.log('cycle_error', { message: e.message, stack: e.stack }); console.error(e); }
      this.nextTick += this.tickMs;
      this.timer = setTimeout(loop, Math.max(0, this.tickMs - (Date.now() - start) - drift));
    };
    this.timer = setTimeout(loop, this.tickMs);
  }
  stop() { this.running = false; if (this.timer) clearTimeout(this.timer); this.timer = null; }

  cycle() {
    const t0 = process.hrtime.bigint();
    let last = t0;
    const mark = (name) => {
      const now = process.hrtime.bigint();
      this.stats.phaseMs[name] = Number(now - last) / 1e6;
      last = now;
      if (this.phaseHook) this.phaseHook(name);
    };
    this.processWorld(); mark('world');
    this.processClientsIn(); mark('clientsIn');
    this.processNpcEventQueue(); mark('npcEvents');
    this.processNpcs(); mark('npcs');
    this.processPlayers(); mark('players');
    this.processLogouts(); mark('logouts');
    this.processLogins(); mark('logins');
    this.processZones(); mark('zones');
    this.processInfo(); mark('info');
    this.processClientsOut(); mark('clientsOut');
    this.processCleanup(); mark('cleanup');
    if (this.tick % AUTOSAVE_TICKS === 0 && this.tick > 0) this.saveAll();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    this.stats.lastCycleMs = ms;
    this.stats.cycleMs.push(ms);
    if (this.stats.cycleMs.length > 6000) this.stats.cycleMs.splice(0, this.stats.cycleMs.length - 6000);
    this.stats.players = this.playerCount; this.stats.npcs = this.npcs.size;
    this.tick++;
  }

  processWorld() {
    // world queue: `delay = req.delay--; if (delay > 0) continue;`
    const q = this.worldQueue; this.worldQueue = [];
    for (const req of q) {
      const d = req.delay--;
      if (d > 0) { this.worldQueue.push(req); continue; }
      req.fn();
    }
    // npc hunting
    for (const npc of this.npcs.values()) {
      if (!npc.active || npc.dying || !npc.huntEnabled || npc.huntRange < 1 || npc.target) continue;
      npc.huntTarget = this.huntFor(npc);
    }
  }
  /** Npc.huntPlayers with the "cowardly" hunt (not too strong outside the wilderness, not in combat) */
  huntFor(npc) {
    const found = [];
    for (const zone of this.zones.zonesAround(npc.level, npc.x, npc.z, npc.huntRange)) {
      for (const p of zone.players) {
        if (!p.active || p.dead || coord.distanceTo(npc, p) > npc.huntRange) continue;
        if (!npc.def.alwaysAggro && this.wildernessLevel(p.x, p.z) === 0 && p.combatLevel() > npc.combatLevel * 2) continue;
        if (npc.target !== p && !this.isMulti(p.x, p.z)) {
          if (p.lastCombat + C.SINGLE_COMBAT_TICKS > this.tick) continue;
          if (npc.lastCombat + C.SINGLE_COMBAT_TICKS > this.tick) continue;
        }
        if (!this.collision.lineOfSight(npc.level, npc.x, npc.z, p.x, p.z, npc.size, npc.size, 1, 1)) continue;
        found.push(p);
      }
    }
    if (!found.length) return null;
    found.sort((a, b) => a.pid - b.pid);
    return found[this.rng.random(found.length)];
  }

  processClientsIn() {
    for (const p of this.activePlayers()) {
      p.playtime++;
      if (p.inbox.length || (p.session && p.session.alwaysAlive)) p.lastResponse = this.tick;
      if (p.connected) p.lastConnected = this.tick;
      let n = 0;
      while (p.inbox.length && n < MAX_INPUT_PER_TICK) {
        const m = p.inbox.shift(); n++;
        try { if (!input.handle(this, p, m)) p.badInput = (p.badInput || 0) + 1; }
        catch (e) { p.badInput = (p.badInput || 0) + 1; this.log('input_error', { key: p.key, t: m && m.t, message: e.message }); }
      }
    }
  }

  processNpcEventQueue() {
    const ev = this.npcEvents; this.npcEvents = [];
    for (const e of ev) e();
  }

  processNpcs() {
    for (const npc of this.npcs.values()) {
      try { npc.turn(); } catch (e) { this.log('npc_error', { nid: npc.nid, message: e.message, stack: e.stack }); }
    }
  }

  processPlayers() {
    for (const p of this.activePlayers()) {
      try {
        if (p.delayed && this.tick >= p.delayedUntil) p.delayed = false;
        if (p.dead) {
          if (this.tick >= p.deathAt) combat.finishPlayerDeath(this, p);
          continue;
        }
        p.queue.process(() => p.canAccess());
        if (!p.loggingOut) { p.processTimers(false); p.processTimers(true); }
        p.processInteraction();
        p.updateEnergy();
      } catch (e) { this.log('player_error', { key: p.key, message: e.message, stack: e.stack }); }
    }
  }

  processLogouts() {
    for (const p of this.activePlayers()) {
      let force = false;
      if (this.tick - p.lastResponse >= this.timeouts.noResponse) { p.loggingOut = true; force = true; }
      else if (!p.connected && this.tick - p.lastConnected >= this.timeouts.noConnection) p.requestIdleLogout = true;
      if (p.requestLogout || p.requestIdleLogout) {
        if (PVP.canLogout(p.preventLogoutUntil, this.tick)) p.loggingOut = true;
        else if (p.requestLogout) p.message("You can't log out until 10 seconds after the end of combat.");
        p.requestLogout = false; p.requestIdleLogout = false;
      }
      // never mid-death: the kept/lost split must finish first (the engine waits for strong queues)
      if (p.loggingOut && !p.dead && !p.queue.has('death') && (force || PVP.canLogout(p.preventLogoutUntil, this.tick))) {
        this.logoutPlayer(p, force ? 'timeout' : 'logout');
      }
    }
  }
  logoutPlayer(p, reason) {
    this.savePlayer(p);
    this.removePlayer(p);
    this.log('logout', { key: p.key, reason, tick: this.tick });
    if (p.session) p.session.onLogout(reason);
  }

  processLogins() {
    const pending = this.newPlayers; this.newPlayers = [];
    for (const p of pending) {
      if (this.byKey.has(p.key)) { if (p.session) p.session.onLoginFailed('already_online'); continue; }
      const pid = this.nextPid();
      if (pid < 0) { if (p.session) p.session.onLoginFailed('world_full'); continue; }
      p.pid = pid;
      this.players[pid] = p;
      this.byKey.set(p.key, p);
      p.active = true;
      p.lastResponse = this.tick; p.lastConnected = this.tick;
      if (!this.collision.isWalkable(p.x, p.z, p.level)) { const r = this.respawnPoint(); p.x = r.x; p.z = r.z; p.level = r.level; }
      this.zones.enter(p, 'player');
      p.tele = true;
      p.skullUntil = PVP.skullUntilOnLogin(p.skullRemaining, this.tick);
      p.caffeinatedUntil = p.caffeineRemaining > 0 ? this.tick + p.caffeineRemaining : 0;
      p.startTimers();
      this.log('login', { key: p.key, pid, tick: this.tick });
      if (p.session) p.session.onLogin(this.welcome(p));
    }
  }
  /** the first message a client gets: who it is and the full state of its own panels */
  welcome(p) {
    const stats = {};
    for (const sk of this.content.SKILLS) stats[sk] = [p.xp10[sk], p.base(sk), p.cur(sk)];
    return {
      t: 'welcome', pid: p.pid, name: p.name, tick: this.tick, tickMs: this.tickMs,
      map: { name: this.map.name, bounds: this.map.bounds, areas: this.map.areas, respawn: this.map.respawn },
      x: p.x, z: p.z, level: p.level,
      stats, inv: p.inv.map((s) => (s ? [s.id, s.qty] : null)), eq: p.appearance(),
      set: { run: p.runEnabled ? 1 : 0, style: p.styleIndex, ar: p.autoRetaliate ? 1 : 0, ac: p.autocast, spec: p.specEnergy },
      en: p.runEnergy, skull: Math.max(0, p.skullUntil - this.tick), caf: Math.max(0, p.caffeinatedUntil - this.tick), pr: Array.from(p.prayers),
    };
  }

  processZones() {
    for (const o of Array.from(this.objs.values())) {
      if (this.tick >= o.despawnTick) this.removeObj(o);
    }
  }

  processInfo() {
    for (const p of this.activePlayers()) {
      try { p.pendingTick = info.buildTick(this, p); } catch (e) { this.log('info_error', { key: p.key, message: e.message, stack: e.stack }); p.pendingTick = null; }
    }
  }

  processClientsOut() {
    for (const p of this.activePlayers()) {
      if (p.pendingTick && p.session) { try { p.session.send(p.pendingTick); } catch (e) { /* the session handles its own errors */ } }
      p.pendingTick = null;
    }
  }

  processCleanup() {
    for (const p of this.activePlayers()) p.resetMasks();
    for (const n of this.npcs.values()) n.resetMasks();
  }

  /* ------------------------------------------------------------------------------------------ */
  /* saving                                                                                       */
  /* ------------------------------------------------------------------------------------------ */
  savePlayer(p) {
    if (!this.store) return;
    try { this.store.savePlayer(p); } catch (e) { this.log('save_error', { key: p.key, message: e.message }); }
  }
  saveAll() { for (const p of this.activePlayers()) this.savePlayer(p); }
  /** stop the world: everyone is saved and removed (used on shutdown) */
  shutdown() {
    this.stop();
    for (const p of Array.from(this.activePlayers())) this.logoutPlayer(p, 'shutdown');
    this.collision.unload();
  }
}

World.PHASES = PHASES;
World.TICK_MS = TICK_MS;
World.AUTOSAVE_TICKS = AUTOSAVE_TICKS;
module.exports = World;
