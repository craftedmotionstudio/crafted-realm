'use strict';
/* NPC AI (wander, leash home, aggression rules, respawn) and the per-client view (15 tiles,
 * overhead chat, input throttling). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { fieldWorld, addPlayer, runUntil } = require('./helpers');

test('wandering: ~1 move in 8 ticks, stays within range of its spawn, sent home after 500 ticks away', () => {
  const w = fieldWorld({ spawns: [{ npc: 'burrowrat', x: 20, z: 10, wander: 3 }], areas: { wilderness: [], multi: [], named: [] } }, 99);
  const rat = [...w.npcs.values()][0];
  let moves = 0, maxDist = 0;
  const hook = () => { if (rat.steps.length) moves++; maxDist = Math.max(maxDist, Math.abs(rat.x - 20), Math.abs(rat.z - 10)); };
  w.phaseHook = (ph) => { if (ph === 'npcs') hook(); };
  runUntil(w, () => false, 400);
  assert.ok(maxDist <= 3, 'never beyond the wander range: ' + maxDist);
  assert.ok(moves > 20, 'it wanders (' + moves + ' moving ticks in 400)');
  // dragged away (e.g. chasing) and left idle: back on the spawn tile within 500 ticks
  w.phaseHook = null;
  rat.teleport(35, 35); rat.wanderRange = 0; rat.wanderCounter = 0;
  runUntil(w, () => rat.x === 20 && rat.z === 10, 510);
  assert.deepEqual([rat.x, rat.z], [20, 10]);
  w.collision.unload();
});

test('aggression: ignores players above twice its level outside the wilderness, not inside', () => {
  const build = (wild) => {
    const w = fieldWorld({ spawns: [{ npc: 'gnarlgob', x: 20, z: 10, wander: 0, hunt: 3 }], areas: { wilderness: wild ? [{ x1: 0, z1: 0, x2: 39, z2: 39 }] : [], multi: [], named: [] } }, 5);
    const gob = [...w.npcs.values()][0];   // level 5
    const vet = addPlayer(w, 'veteran', { levels: { Attack: 30, Strength: 30, Defence: 30, Hitpoints: 30 }, pos: { x: 22, z: 10 } });   // combat 37 > 10
    runUntil(w, () => false, 5);
    return { w, gob, vet };
  };
  const safe = build(false);
  assert.equal(safe.gob.target, null, 'too strong for it outside the wilderness');
  const lowbie = addPlayer(safe.w, 'lowbie', { pos: { x: 18, z: 10 } });   // combat 3
  runUntil(safe.w, () => safe.gob.target === lowbie.p, 5);
  assert.equal(safe.gob.target, lowbie.p);
  safe.w.collision.unload();
  const wild = build(true);
  assert.equal(wild.gob.target, wild.vet.p, 'in the wilderness it attacks anyone');
  wild.w.collision.unload();
});

test('the view: players and npcs within 15 tiles, adds / updates / deletes, overhead chat', () => {
  const w = fieldWorld({ spawns: [{ npc: 'burrowrat', x: 20, z: 20, wander: 0 }], areas: { wilderness: [], multi: [], named: [] } });
  const a = addPlayer(w, 'watcher', { pos: { x: 5, z: 20 } });
  const b = addPlayer(w, 'talker', { pos: { x: 20, z: 21 } });
  w.cycle();
  assert.ok(a.p.view.players.has(b.p.pid), '15 tiles away is in view');
  assert.ok(a.p.view.npcs.has([...w.npcs.keys()][0]));
  b.s.intent({ t: 'chat', text: 'hello <b>there</b>' });
  w.cycle();
  const upd = a.s.lastTick().pl.upd.find((u) => u.i === b.p.pid);
  assert.equal(upd.c, 'hello bthere/b');       // markup characters stripped
  b.p.teleport(21, 21);
  w.cycle();
  assert.deepEqual(a.s.lastTick().pl.del, [b.p.pid]);
  assert.ok(!a.p.view.players.has(b.p.pid), '16 tiles away is out of view');
  w.collision.unload();
});

test('input throttle: at most 10 intents per player per tick, the rest wait their turn', () => {
  const w = fieldWorld({ areas: { wilderness: [], multi: [], named: [] } });
  const { p, s } = addPlayer(w, 'spammer', { pos: { x: 5, z: 5 } });
  for (let i = 0; i < 15; i++) s.intent({ t: 'style', index: i % 4 });
  w.cycle();
  assert.equal(p.inbox.length, 5);
  w.cycle();
  assert.equal(p.inbox.length, 0);
  // malformed intents are counted, not applied
  s.intent({ t: 'walk', x: 'north' });
  s.intent({ t: 'equip', slot: 99 });
  w.cycle();
  assert.equal(p.badInput, 2);
  w.collision.unload();
});
