'use strict';
/* Wilderness rules: levels, eligibility table, single-way, skulls, kept items, locks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../shared/pvp.js');

const WILD = [{ x1: 0, z1: 48, x2: 63, z2: 127 }];

test('wilderness level = floor((z - z0) / 8) + 1 inside the zone, 0 outside', () => {
  assert.equal(P.wildernessLevel(10, 47, WILD), 0);
  assert.equal(P.wildernessLevel(10, 48, WILD), 1);
  assert.equal(P.wildernessLevel(10, 55, WILD), 1);
  assert.equal(P.wildernessLevel(10, 56, WILD), 2);
  assert.equal(P.wildernessLevel(10, 127, WILD), 10);
  assert.equal(P.wildernessLevel(64, 60, WILD), 0);
  assert.equal(P.wildernessLevel(0, 0, null), 0);
});

test('pvp eligibility table (level range decides by the lower wilderness level)', () => {
  // [attackerCb, attackerWild, targetCb, targetWild, expected]
  const rows = [
    [50, 5, 55, 10, null],                 // min 5 >= diff 5
    [50, 4, 55, 10, 'level_difference'],   // min 4 < diff 5
    [50, 10, 55, 4, 'level_difference'],   // the TARGET's lower level decides too
    [50, 0, 50, 10, 'not_in_wilderness'],
    [50, 10, 50, 0, 'not_in_wilderness'],
    [3, 1, 3, 1, null],                    // same level, level 1
    [3, 1, 4, 1, null],                    // diff 1 at level 1
    [3, 1, 5, 1, 'level_difference'],      // diff 2 at level 1
    [126, 10, 116, 10, null],              // diff 10 at level 10
    [126, 10, 115, 10, 'level_difference'],
  ];
  for (const [ac, aw, tc, tw, want] of rows) assert.equal(P.levelCheck(ac, aw, tc, tw), want, JSON.stringify([ac, aw, tc, tw]));
});

test('single-way combat check (pvp_in_combat_check)', () => {
  const rec = (id, o) => Object.assign({ id, lastCombat: -100, predators: [], preys: [], aggressiveNpcAlive: false }, o);
  const clock = 100;
  // fresh fight
  assert.equal(P.singleCombatCheck(rec('A'), rec('B'), clock, false), null);
  // A was hit by C 5 ticks ago -> A cannot start on B
  assert.equal(P.singleCombatCheck(rec('A', { lastCombat: 95, predators: ['C'] }), rec('B'), clock, false), 'already_under_attack');
  // ...but may hit C back
  assert.equal(P.singleCombatCheck(rec('A', { lastCombat: 95, predators: ['C'] }), rec('C'), clock, false), null);
  // after 8 ticks the lock is gone (92 + 8 = 100, not > 100)
  assert.equal(P.singleCombatCheck(rec('A', { lastCombat: 92, predators: ['C'] }), rec('B'), clock, false), null);
  // an npc is fighting A
  assert.equal(P.singleCombatCheck(rec('A', { lastCombat: 99, aggressiveNpcAlive: true }), rec('B'), clock, false), 'already_under_attack');
  // B is busy with C
  assert.equal(P.singleCombatCheck(rec('A'), rec('B', { lastCombat: 97, predators: ['C'] }), clock, false), 'target_busy');
  // multi-combat around the target skips everything
  assert.equal(P.singleCombatCheck(rec('A', { lastCombat: 99, predators: ['C'] }), rec('B', { lastCombat: 99, predators: ['C'] }), clock, true), null);
  // canAttack: level check first
  const a = Object.assign(rec('A'), { combatLevel: 50, wildLevel: 1 });
  const b = Object.assign(rec('B', { lastCombat: 99, predators: ['C'] }), { combatLevel: 60, wildLevel: 1 });
  assert.deepEqual(P.canAttack(a, b, clock), { ok: false, reason: 'level_difference' });
  a.wildLevel = 10; b.wildLevel = 10;
  assert.deepEqual(P.canAttack(a, b, clock), { ok: false, reason: 'target_busy' });
  assert.deepEqual(P.canAttack(a, b, clock, { targetInMulti: true }), { ok: true, reason: null });
});

test('skulls: attacker skulls, a defender fighting back does not, history slots are 3 and 2', () => {
  const rec = (id) => ({ id, lastCombat: -100, lastCombatPvp: -100, predators: [], preys: [], skullUntil: 0, aggressiveNpc: null });
  const A = rec('A'), B = rec('B'), C = rec('C');
  assert.equal(P.recordAttack(A, B, 10).skulled, true);
  assert.equal(A.skullUntil, 2010);
  assert.deepEqual(B.predators, ['A']);
  assert.equal(B.lastCombat, 10);
  assert.equal(P.recordAttack(B, A, 12).skulled, false);       // B hits back: A is B's predator
  assert.equal(B.skullUntil, 0);
  assert.equal(P.recordAttack(A, B, 14).skulled, false);       // A is in B's prey list now: no fresh skull
  assert.equal(A.skullUntil, 2010);
  assert.equal(P.recordAttack(C, A, 20).skulled, true);        // a third party joining in skulls
  // predator history holds 3
  const V = rec('V');
  for (const id of ['B', 'C', 'D', 'E']) P.recordAttack(rec(id), V, 30);
  assert.deepEqual(V.predators, ['E', 'D', 'C']);
  const Bx = rec('B'); Bx.preys = ['V'];
  assert.equal(P.deservesSkull(V, Bx), false);                 // Bx attacked V earlier (V is in Bx's preys)
  // prey history holds 2
  const Q = rec('Q');
  P.recordAttack(Q, rec('X'), 1); P.recordAttack(Q, rec('Y'), 2); P.recordAttack(Q, rec('Z'), 3);
  assert.deepEqual(Q.preys, ['Z', 'Y']);
});

test('skull survives logout, capped at 2000 on login', () => {
  assert.equal(P.skullRemainingOnLogout(3000, 1500), 1500);
  assert.equal(P.skullRemainingOnLogout(1000, 1500), 0);
  assert.equal(P.skullUntilOnLogin(1500, 10), 1510);
  assert.equal(P.skullUntilOnLogin(5000, 10), 2010);
  assert.equal(P.skullUntilOnLogin(0, 10), 0);
  assert.equal(P.isSkulled(1510, 1509), true);
  assert.equal(P.isSkulled(1510, 1510), false);
});

test('items kept on death: 3 priciest, 0 when skulled, +1 with Protect Item', () => {
  const V = { a: 100, b: 50, c: 50, d: 10, e: 0, x: 200, arrows: 2 };
  const opts = (o) => Object.assign({ valueOf: (id) => V[id] || 0, stackable: (id) => id === 'arrows' }, o);
  const inv = [{ id: 'a', qty: 1 }, { id: 'b', qty: 1 }, null, { id: 'd', qty: 1 }, { id: 'arrows', qty: 100 }];
  const equip = { weapon: 'c', body: 'e', head: 'x' };
  let r = P.keptOnDeath(inv, equip, opts({}));
  assert.deepEqual(r.kept.map((k) => k.id), ['x', 'a', 'b']);   // tie b(inv)=c(worn): the inventory keeps it
  assert.deepEqual(r.lostInv, [null, null, null, { id: 'd', qty: 1 }, { id: 'arrows', qty: 100 }]);
  assert.deepEqual(r.lostEquip, { weapon: 'c', body: 'e' });
  r = P.keptOnDeath(inv, equip, opts({ skulled: true }));
  assert.deepEqual(r.kept, []);
  r = P.keptOnDeath(inv, equip, opts({ skulled: true, protectItem: true }));
  assert.deepEqual(r.kept.map((k) => k.id), ['x']);
  r = P.keptOnDeath(inv, equip, opts({ protectItem: true }));
  assert.deepEqual(r.kept.map((k) => k.id), ['x', 'a', 'b', 'c']);
  // a stack gives one unit per pick
  r = P.keptOnDeath([{ id: 'arrows', qty: 5 }], {}, opts({}));
  assert.deepEqual(r.kept, [{ id: 'arrows', qty: 3 }]);
  assert.deepEqual(r.lostInv, [{ id: 'arrows', qty: 2 }]);
  // worthless items are never kept
  r = P.keptOnDeath([{ id: 'e', qty: 1 }], {}, opts({}));
  assert.deepEqual(r.kept, []);
  // inputs are not mutated
  assert.deepEqual(inv[0], { id: 'a', qty: 1 });
});

test('logout lock, teleport block, multi areas, hero', () => {
  assert.equal(P.logoutLockUntil(100), 116);
  assert.equal(P.canLogout(116, 115), false);
  assert.equal(P.canLogout(116, 116), true);
  assert.equal(P.canTeleport(20), true);
  assert.equal(P.canTeleport(21), false);
  assert.equal(P.canTeleport(0), true);
  const multi = [{ x1: 40, z1: 96, x2: 55, z2: 111 }];
  assert.equal(P.isMulti(40, 96, multi), true);
  assert.equal(P.isMulti(56, 96, multi), false);
  assert.equal(P.findHero([{ key: 'A', points: 10 }, { key: 'B', points: 15 }, { key: 'C', points: 15 }]), 'B');
  assert.equal(P.findHero([]), null);
  assert.equal(P.findHero([{ key: 'A', points: 0 }]), null);
});
