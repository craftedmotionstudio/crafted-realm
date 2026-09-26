'use strict';
/* Combat inside the world: the exact tick every hit lands, attack speeds, retaliation, eating,
 * single-way combat, protection prayers, logout lock and teleport block. */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../shared/combat.js');
const { fieldWorld, fieldMap, addPlayer, runUntil, alwaysHit, World } = require('./helpers');

/** log of {tick, hits} for each watched entity, captured before cleanup */
function watchHits(w, named) {
  const log = {};
  for (const k in named) log[k] = [];
  const prev = w.phaseHook;
  w.phaseHook = (phase) => {
    if (prev) prev(phase);
    if (phase !== 'clientsOut') return;
    for (const k in named) if (named[k].hits.length) log[k].push({ tick: w.tick, hits: named[k].hits.map((h) => h.amount) });
  };
  return log;
}
const spawn = (npc, x, z, extra) => Object.assign({ npc, x, z, wander: 0, hunt: 0 }, extra || {});
const fighter = (o) => Object.assign({ levels: { Attack: 40, Strength: 40, Defence: 40, Hitpoints: 60, Ranged: 40, Magic: 40, Prayer: 43 } }, o);

test('melee on an npc lands on the npc\'s next turn; swings repeat every weapon speed', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 11, 10)] });
  w.rng = alwaysHit(0);   // every swing "hits" for 0: we only watch timing
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'swinger', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'iron_sword' } }));
  const log = watchHits(w, { npc });
  const T0 = w.tick;
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  runUntil(w, () => false, 13);
  assert.deepEqual(log.npc.map((e) => e.tick - T0), [1, 5, 9, 13].filter((d) => d <= 12));
  assert.equal(p.actionDelay - T0, 16);             // swings at T0, +4, +8, +12
  w.collision.unload();
});

test('ranged: (46 + 5d + 30) / 30 tick delay; rapid shoots a tick faster', () => {
  // maxRange 0 leashes the npc to its spawn so the distance stays 5 (it cannot chase)
  const w = fieldWorld({ spawns: [spawn('korthul', 15, 10, { maxRange: 0 })] });
  w.rng = alwaysHit(0);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'archer', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'worn_bow' }, inv: [['arrows', 50]] }));
  const log = watchHits(w, { npc });
  const T0 = w.tick;
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  runUntil(w, () => false, 12);
  const d = C.rangedHitDelay(5);   // 3
  assert.equal(d, 3);
  assert.deepEqual(log.npc.map((e) => e.tick - T0), [0 + d, 5 + d]);   // shots at T0 and T0+5 (speed 5)
  assert.equal(p.invCount('arrows'), 47);                            // three arrows loosed (T0, +5, +10)
  // rapid: a fresh archer shoots every 4 ticks
  const w2 = fieldWorld({ spawns: [spawn('korthul', 15, 10, { maxRange: 0 })] });
  w2.rng = alwaysHit(0);
  const npc2 = [...w2.npcs.values()][0];
  const r = addPlayer(w2, 'rapid', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'worn_bow' }, inv: [['arrows', 50]], style: 1 }));
  const log2 = watchHits(w2, { npc: npc2 });
  const U0 = w2.tick;
  r.s.intent({ t: 'op_npc', nid: npc2.nid, op: 'attack' });
  runUntil(w2, () => false, 12);
  assert.deepEqual(log2.npc.map((e) => e.tick - U0), [3, 7, 11]);
  w2.collision.unload();
});

test('magic: dur/30 + 1 tick delay, 5-tick casts, runes and cast xp every cast', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 15, 10, { maxRange: 0 })] });
  w.rng = alwaysHit(0);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'mage', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'apprentice_staff' }, inv: [['air_rune', 10], ['mind_rune', 10]], autocast: 'wind_strike' }));
  const xp0 = p.xp10.Magic;
  const log = watchHits(w, { npc });
  const T0 = w.tick;
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  runUntil(w, () => false, 11);
  const d = C.magicHitDelay(5);   // 4
  assert.equal(d, 4);
  assert.deepEqual(log.npc.map((e) => e.tick - T0), [d, 5 + d]);
  assert.equal(p.invCount('air_rune'), 7);                    // casts at T0, +5, +10
  assert.equal(p.xp10.Magic - xp0, 3 * 55);                   // 5.5 xp per cast (hits of 0 add no damage xp)
  w.collision.unload();
});

test('pvp melee: the hit lands this tick on a later pid, next tick on an earlier pid', () => {
  const map = { spawns: [] };
  const w = fieldWorld(map);
  w.rng = alwaysHit(0);
  const a = addPlayer(w, 'first', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const b = addPlayer(w, 'second', fighter({ pos: { x: 11, z: 25 }, equip: { weapon: 'iron_sword' }, autoRetaliate: false }));
  assert.ok(a.p.pid < b.p.pid);
  const log = watchHits(w, { a: a.p, b: b.p });
  const T0 = w.tick;
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  runUntil(w, () => false, 1);
  assert.deepEqual(log.b.map((e) => e.tick - T0), [0]);
  // now the later pid attacks the earlier one
  const w2 = fieldWorld(map);
  w2.rng = alwaysHit(0);
  const c = addPlayer(w2, 'first', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' }, autoRetaliate: false }));
  const d = addPlayer(w2, 'second', fighter({ pos: { x: 11, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const log2 = watchHits(w2, { c: c.p });
  const U0 = w2.tick;
  d.s.intent({ t: 'op_player', pid: c.p.pid, op: 'attack' });
  runUntil(w2, () => false, 2);
  assert.deepEqual(log2.c.map((e) => e.tick - U0), [1]);
  w2.collision.unload();
});

test('pvp ranged uses duration / 30 (no extra tick), magic duration / 30 + 1', () => {
  const w = fieldWorld();
  w.rng = alwaysHit(0);
  const a = addPlayer(w, 'bowman', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'worn_bow' }, inv: [['arrows', 20]] }));
  const b = addPlayer(w, 'target', fighter({ pos: { x: 15, z: 25 }, autoRetaliate: false }));
  const log = watchHits(w, { b: b.p });
  const T0 = w.tick;
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  runUntil(w, () => false, 4);
  assert.deepEqual(log.b.map((e) => e.tick - T0), [Math.floor(C.arrowDuration(5) / 30)]);   // 2
  const w2 = fieldWorld();
  w2.rng = alwaysHit(0);
  const m = addPlayer(w2, 'caster', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'apprentice_staff' }, inv: [['air_rune', 10], ['mind_rune', 10]], autocast: 'wind_strike' }));
  const t = addPlayer(w2, 'target', fighter({ pos: { x: 15, z: 25 }, autoRetaliate: false }));
  const log2 = watchHits(w2, { t: t.p });
  const U0 = w2.tick;
  m.s.intent({ t: 'op_player', pid: t.p.pid, op: 'attack' });
  runUntil(w2, () => false, 5);
  assert.deepEqual(log2.t.map((e) => e.tick - U0), [Math.floor(C.spellDuration(5) / 30) + 1]);   // 4
  w2.collision.unload();
});

test('npc retaliation: queue on its next turn, flinch = attack rate / 2; its melee lands the same tick', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 11, 10)] });
  w.rng = alwaysHit(0);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'poker', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'iron_sword' } }));
  const log = watchHits(w, { p });
  const T0 = w.tick;
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  runUntil(w, () => false, 12);
  // retaliate queued at T0 runs at T0+1: action delay T0+1 + floor(5/2) = T0+3; then every 5 ticks
  assert.deepEqual(log.p.map((e) => e.tick - T0), [3, 8]);
  assert.equal(npc.mode, 'attack');
  assert.equal(p.lastCombat - T0, 8);
  w.collision.unload();
});

test('auto-retaliate: an idle player turns on the attacker after floor(rate/2) ticks; walking away prevents it', () => {
  const w = fieldWorld();
  w.rng = alwaysHit(0);
  const a = addPlayer(w, 'attacker', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const b = addPlayer(w, 'defender', fighter({ pos: { x: 11, z: 25 }, equip: { weapon: 'steel_battleaxe' } }));
  const T0 = w.tick;
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  w.cycle();
  assert.equal(b.p.target, a.p);
  assert.equal(b.p.actionDelay - T0, Math.floor(5 / 2));   // battleaxe speed 5 -> 2
  // a walking player does not auto-retaliate
  const w2 = fieldWorld();
  w2.rng = alwaysHit(0);
  const c = addPlayer(w2, 'attacker', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const d = addPlayer(w2, 'runner', fighter({ pos: { x: 11, z: 25 } }));
  d.s.intent({ t: 'walk', x: 11, z: 35 });
  c.s.intent({ t: 'op_player', pid: d.p.pid, op: 'attack' });
  w2.cycle();
  assert.equal(d.p.target, null);
  w2.collision.unload();
});

test('eating: one bite per 3 ticks, heals, pushes the next attack back 3 ticks and drops the attack order', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 11, 10)] });
  w.rng = alwaysHit(0);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'eater', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'iron_sword' }, inv: [['trout', 1], ['trout', 1], ['trout', 1]] }));
  p.setLevel('Hitpoints', 30);
  const T0 = w.tick;
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  w.cycle();                                   // swing at T0 -> next swing T0+4
  assert.equal(p.actionDelay, T0 + 4);
  s.intent({ t: 'eat', slot: 0 });
  s.intent({ t: 'eat', slot: 1 });             // same tick: ignored
  w.cycle();                                   // bite at T0+1: eat delay T0+3, action delay +3
  assert.equal(p.hp, 37);                      // trout heals 7
  assert.equal(p.actionDelay, T0 + 7);
  assert.equal(p.invCount('trout'), 2);
  assert.equal(p.target, null);                // eating cleared the attack order
  s.intent({ t: 'eat', slot: 1 }); w.cycle();  // T0+2: too soon (T0+3 >= T0+2)
  assert.equal(p.invCount('trout'), 2);
  s.intent({ t: 'eat', slot: 1 }); w.cycle();  // T0+3: still too soon (T0+3 >= T0+3)
  assert.equal(p.invCount('trout'), 2);
  s.intent({ t: 'eat', slot: 1 }); w.cycle();  // T0+4: allowed
  assert.equal(p.invCount('trout'), 1);
  w.collision.unload();
});

test('single-way combat: under attack by one npc you cannot start on another; multi-combat lifts it', () => {
  const build = (multi) => {
    const w = fieldWorld({ spawns: [spawn('korthul', 11, 10), spawn('korthul', 10, 11)], areas: { wilderness: [], multi: multi ? [{ x1: 0, z1: 0, x2: 39, z2: 39 }] : [], named: [] } });
    w.rng = alwaysHit(0);
    const [n1, n2] = [...w.npcs.values()];
    const pl = addPlayer(w, 'busy', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'iron_sword' } }));
    pl.s.intent({ t: 'op_npc', nid: n1.nid, op: 'attack' });
    runUntil(w, () => false, 4);     // n1 retaliates at +3 -> player's lastCombat set
    pl.s.intent({ t: 'op_npc', nid: n2.nid, op: 'attack' });
    w.cycle(); w.cycle();
    return { w, pl, n2 };
  };
  const single = build(false);
  assert.ok(single.pl.s.messages().includes('You are already under attack!'));
  assert.equal(single.n2.aggressivePlayer, null);    // the second npc was never engaged
  single.w.collision.unload();
  const multi = build(true);
  assert.ok(!multi.pl.s.messages().includes('You are already under attack!'));
  assert.equal(multi.n2.aggressivePlayer, multi.pl.p);
  multi.w.collision.unload();
});

test('protection prayers: total against npcs, 40% off the max hit against players', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 11, 10)] });
  w.rng = alwaysHit(1);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'pious', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'iron_sword' } }));
  s.intent({ t: 'prayer', id: 'protect_melee', on: true });
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  const hp0 = p.hp;
  runUntil(w, () => false, 10);
  assert.equal(p.hp, hp0, 'korthul never lands a blow through the prayer');
  w.collision.unload();

  const w2 = fieldWorld();
  w2.rng = alwaysHit(1);
  const a = addPlayer(w2, 'hitter', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const b = addPlayer(w2, 'prayer', fighter({ pos: { x: 11, z: 25 }, autoRetaliate: false }));
  b.s.intent({ t: 'prayer', id: 'protect_melee', on: true });
  w2.cycle();
  const max = a.p.combatStats().stats.maxHit;
  const hpB = b.p.hp;
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  w2.cycle();
  assert.equal(hpB - b.p.hp, C.pvpProtectedMaxHit(max));
  w2.collision.unload();
});

test('logout is refused for 16 ticks after being hit', () => {
  const w = fieldWorld();
  w.rng = alwaysHit(0);
  const a = addPlayer(w, 'hitter', fighter({ pos: { x: 10, z: 25 }, equip: { weapon: 'iron_sword' } }));
  const b = addPlayer(w, 'quitter', fighter({ pos: { x: 11, z: 25 }, autoRetaliate: false }));
  a.s.intent({ t: 'op_player', pid: b.p.pid, op: 'attack' });
  w.cycle();
  const hitTick = w.tick - 1;
  a.s.intent({ t: 'walk', x: 20, z: 25 });   // stop attacking
  b.s.intent({ t: 'logout' });
  w.cycle();
  assert.ok(b.p.active);
  assert.ok(b.s.messages().some((m) => /can't log out/.test(m)));
  runUntil(w, () => w.tick >= hitTick + 16, 30);
  b.s.intent({ t: 'logout' });
  w.cycle();
  assert.equal(b.p.active, false);
  assert.equal(b.s.loggedOut, 'logout');
  w.collision.unload();
});

test('teleports work up to wilderness level 20 and fail above it', () => {
  // wilderness starting at z = -152: z 0..7 is level 20, z 8..15 level 21
  const deep = fieldMap({ areas: { wilderness: [{ x1: 0, z1: -152, x2: 39, z2: 39 }], multi: [], named: [] } });
  const w = new World({ map: deep, seed: 1 });
  const hi = addPlayer(w, 'deep', fighter({ pos: { x: 10, z: 8 } }));
  const lo = addPlayer(w, 'edge', fighter({ pos: { x: 20, z: 7 } }));
  assert.equal(hi.p.wildLevel(), 21);
  assert.equal(lo.p.wildLevel(), 20);
  hi.s.intent({ t: 'teleport', spell: 'home_tele' });
  lo.s.intent({ t: 'teleport', spell: 'home_tele' });
  runUntil(w, () => false, 4);
  assert.deepEqual([hi.p.x, hi.p.z], [10, 8]);
  assert.ok(hi.s.messages().some((m) => /teleports fail/.test(m)));
  assert.deepEqual([lo.p.x, lo.p.z], [5, 5]);                 // the respawn point
  w.collision.unload();
});

test('an npc boxed in by walls cannot be reached', () => {
  const walls = [[20, 20, 22, 20, 'S'], [20, 22, 22, 22, 'N'], [20, 20, 20, 22, 'W'], [22, 20, 22, 22, 'E']];
  const w = fieldWorld({ walls, spawns: [spawn('korthul', 21, 21)], areas: { wilderness: [], multi: [], named: [] } });
  const npc = [...w.npcs.values()][0];
  const { s } = addPlayer(w, 'outside', fighter({ pos: { x: 15, z: 21 }, equip: { weapon: 'iron_sword' } }));
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  runUntil(w, () => false, 20);
  assert.ok(s.messages().includes("I can't reach that!"));
  w.collision.unload();
});

test('prayer drains on its 5-tick timer and switches off at 0 points', () => {
  const w = fieldWorld({ areas: { wilderness: [], multi: [], named: [] } });
  const { p, s } = addPlayer(w, 'monk', { levels: { Prayer: 43, Hitpoints: 20 }, pos: { x: 5, z: 5 } });
  s.intent({ t: 'prayer', id: 'protect_melee', on: true });
  w.cycle();
  const T0 = w.tick - 1;
  runUntil(w, () => w.tick > T0 + 50, 60);
  assert.equal(p.cur('Prayer'), 43 - 10);          // effect 12 vs resistance 60: 1 point per 5 ticks
  s.intent({ t: 'prayer', id: 'thick_skin', on: true });   // +3 effect: 75 per firing -> 1 point, 15 carried
  p.setLevel('Prayer', 2);
  runUntil(w, () => p.prayers.size === 0, 30);
  assert.equal(p.cur('Prayer'), 0);
  assert.ok(s.messages().some((m) => /run out of prayer points/.test(m)));
  s.intent({ t: 'prayer', id: 'thick_skin', on: true });
  w.cycle();
  assert.equal(p.prayers.size, 0, 'no prayers without points');
  w.collision.unload();
});

test('special attack hook: an armed special spends energy and scales that one swing', () => {
  const w = fieldWorld({ spawns: [spawn('korthul', 11, 10)] });
  w.rng = alwaysHit(1);
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'lunger', fighter({ pos: { x: 10, z: 10 }, equip: { weapon: 'steel_sword' } }));
  const spec = w.content.SPECIALS.sword;
  assert.ok(spec, 'the client special table was loaded');
  const max = p.combatStats().stats.maxHit;
  s.intent({ t: 'spec', on: true });
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' });
  w.cycle(); w.cycle();
  assert.equal(p.specEnergy, 100 - spec.cost);
  assert.equal(npc.maxHp - npc.hp, Math.floor(max * spec.dmg));
  w.collision.unload();
});
