'use strict';
/* Coffee (shared/drinks.js): 4 doses, each sip +20% run energy, 2 minutes of 25% slower run drain; the 2004 potion
 * rule (no eat delay, no attack delay, the fight goes on); brewing plan; the server's consume path and persistence. */
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../../shared/drinks.js');
const M = require('../../shared/movement.js');
const { fieldWorld, addPlayer, World } = require('./helpers');

test('shared: the dose chain, the sip and the drain multiplier', () => {
  assert.deepEqual(D.DRINKS.coffee.doses, ['coffee_4', 'coffee_3', 'coffee_2', 'coffee_1']);
  assert.equal(D.drinkOf('coffee_4').next, 'coffee_3');
  assert.equal(D.drinkOf('coffee_1').next, null);            // the mug is set aside
  assert.equal(D.drinkOf('coffee_2').left, 2);
  assert.equal(D.isDrink('trout'), false);
  const r = D.sip('coffee_4', 5000, M.MAX_ENERGY, 100);
  assert.equal(r.energy, 7000);                             // +20% of 10000
  assert.equal(r.until, 300);                               // 200 ticks = 2 minutes
  assert.equal(D.sip('coffee_3', 9500, M.MAX_ENERGY, 0).energy, 10000);   // clamped
  assert.equal(D.sip('coffee_3', 50, 100, 0).energy, 70);  // the client's 0..100 scale
  assert.equal(D.drainMultiplier(300, 299), 0.75);
  assert.equal(D.drainMultiplier(300, 300), 1);
  assert.equal(D.drainMultiplier(0, 5), 1);
});

test('shared: run energy drains 25% slower with the multiplier; the 2004 numbers are unchanged without it', () => {
  assert.equal(M.energyTick(5000, 2, 0, 1), 4933);          // 2004: -67
  assert.equal(M.energyTick(5000, 2, 0, 1, 1), 4933);
  assert.equal(M.energyTick(5000, 2, 0, 1, 0.75), 4950);    // floor(67 * 0.75) = 50
  assert.equal(M.energyTick(5000, 2, 64, 1, 0.75), 4900);   // floor(134 * 0.75) = 100
  assert.equal(M.energyTick(5000, 0, 0, 1, 0.75), 5008);    // recovery is untouched
});

test('shared: brewing needs roasted beans and a jug of water; the jug comes back', () => {
  const ok = D.planBrew('coffee', [null, 'jug_water', { id: 'bread' }, { id: 'roasted_beans' }], 1);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.take.slice().sort(), [1, 3]);
  assert.deepEqual(ok.give, ['coffee_4', 'jug']);
  assert.equal(ok.skill, 'Cooking');
  assert.ok(ok.xp > 0);
  assert.deepEqual(D.planBrew('coffee', ['roasted_beans'], 1).missing, ['jug_water']);
  assert.deepEqual(D.planBrew('coffee', ['bucket_water', 'roasted_beans'], 1).give, ['coffee_4', 'bucket']);
  assert.equal(D.BREWS.coffee.station, 'range');
});

test('server: a sip restores 20%, steps the dose, starts 200 ticks of slower drain, costs no delay and keeps the fight', () => {
  const w = fieldWorld({ spawns: [{ npc: 'korthul', x: 11, z: 10, wander: 0, hunt: 0 }] });
  const npc = [...w.npcs.values()][0];
  const { p, s } = addPlayer(w, 'barista', { pos: { x: 10, z: 10 }, run: true, inv: [['coffee_4', 1], ['trout', 1]],
    levels: { Attack: 40, Strength: 40, Defence: 40, Hitpoints: 60 }, equip: { weapon: 'iron_sword' } });
  s.intent({ t: 'op_npc', nid: npc.nid, op: 'attack' }); w.cycle();
  p.runEnergy = 4000; p.actionDelay = w.tick + 2; const ad = p.actionDelay;
  s.intent({ t: 'eat', slot: 0 }); w.cycle();
  assert.equal(p.target, npc, 'the attack order survives a sip');
  const T = w.tick - 1;                                     // the intent ran on the previous cycle's tick
  assert.equal(p.inv[0].id, 'coffee_3');
  assert.ok(p.runEnergy >= 6000 && p.runEnergy <= 6008, 'energy +2000 (plus an idle tick of recovery)');
  assert.ok(p.caffeinatedUntil >= T + 200 && p.caffeinatedUntil <= T + 201);
  assert.equal(p.actionDelay, ad, 'no attack delay (2004 potion)');
  assert.equal(p.eatDelay, 0, 'no eat delay: it combos with food');
  s.intent({ t: 'eat', slot: 1 }); s.intent({ t: 'eat', slot: 0 }); w.cycle();   // trout and a sip in one tick
  assert.equal(p.invCount('trout'), 0);
  assert.equal(p.inv[0].id, 'coffee_2');
  for (const id of ['coffee_2', 'coffee_1']) { assert.equal(p.inv[0].id, id); s.intent({ t: 'eat', slot: 0 }); w.cycle(); }
  assert.equal(p.inv[0], null, 'the last sip leaves nothing (the mug is set aside)');
  w.collision.unload();
});

test('server: while caffeinated a running tick costs 50 instead of 67; the effect ends after 2 minutes', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'jogger', { pos: { x: 30, z: 10 }, run: true, inv: [['coffee_1', 1]] });
  p.runEnergy = 5000;
  s.intent({ t: 'eat', slot: 0 }); w.cycle();               // 7000 (+ idle recovery 8)
  const e0 = p.runEnergy;
  s.intent({ t: 'walk', x: 30, z: 30 });
  w.cycle(); w.cycle();
  assert.equal(p.runEnergy, e0 - 50 * 2, 'two caffeinated running ticks cost 50 each');
  // the effect runs out
  while (w.tick < p.caffeinatedUntil + 1) w.cycle();
  assert.equal(p.caffeinatedUntil, 0, 'cleared by the soft timer');
  w.collision.unload();
});

test('server: the effect survives a logout as ticks left', () => {
  const w = fieldWorld();
  const { p, s } = addPlayer(w, 'saver', { pos: { x: 10, z: 10 }, inv: [['coffee_4', 1]] });
  s.intent({ t: 'eat', slot: 0 }); w.cycle();
  const left = p.caffeinatedUntil - w.tick;
  const save = p.toSave();
  assert.equal(save.caf, left);
  assert.ok(left > 190 && left <= 200);
  w.collision.unload();
});
