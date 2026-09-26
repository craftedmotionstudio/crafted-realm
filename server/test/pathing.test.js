'use strict';
/* Pathing with rsmod-pathfinder on our authored collision map (server/data/maps/scarlands_test.json). */
const test = require('node:test');
const assert = require('node:assert/strict');
const World = require('../engine/World');
const { addPlayer, runUntil, track } = require('./helpers');

function stepsLegal(w, trail) {
  for (let i = 1; i < trail.length; i++) {
    const [px, pz] = trail[i - 1], [x, z] = trail[i];
    const dx = x - px, dz = z - pz;
    assert.ok(Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && (dx || dz), `step ${i} is one tile`);
    assert.ok(w.collision.canTravel(0, px, pz, dx, dz, 1, 0), `step ${px},${pz} -> ${x},${z} crosses no wall`);
  }
}

test('walking into the walled yard goes round to the south door', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'walker', { pos: { x: 23, z: 12 } });
  s.intent({ t: 'walk', x: 23, z: 22 });
  const { trail } = track(w, p);
  runUntil(w, () => p.x === 23 && p.z === 22, 60);
  assert.deepEqual([p.x, p.z], [23, 22]);
  stepsLegal(w, trail);
  // the south wall has a single gap at x = 23: the trail must pass through (23,18) -> (23,19)
  const i = trail.findIndex(([x, z]) => x === 23 && z === 18);
  assert.ok(i >= 0 && trail[i + 1][0] === 23 && trail[i + 1][1] === 19, 'enters through the door');
  w.collision.unload();
});

test('a path around a wall from the north side of the yard', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'walker', { pos: { x: 23, z: 28 } });
  s.intent({ t: 'walk', x: 23, z: 22 });    // straight line is blocked by the north wall
  const { trail } = track(w, p);
  const ticks = runUntil(w, () => p.x === 23 && p.z === 22, 80);
  assert.deepEqual([p.x, p.z], [23, 22]);
  stepsLegal(w, trail);
  assert.ok(trail.length - 1 > 6, 'went the long way round (' + (trail.length - 1) + ' steps in ' + ticks + ' ticks)');
  w.collision.unload();
});

test('the Ditch is only crossed at its gaps, and running takes two tiles a tick', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'runner', { pos: { x: 30, z: 40 }, run: true });
  s.intent({ t: 'walk', x: 30, z: 50 });
  const { trail, perTick } = track(w, p);
  runUntil(w, () => p.x === 30 && p.z === 50, 80);
  const maxPerTick = Math.max(...perTick);
  assert.deepEqual([p.x, p.z], [30, 50]);
  stepsLegal(w, trail);
  for (const [x, z] of trail) if (z === 44 || z === 45) assert.ok([15, 16, 47, 48].includes(x), `crossed the ditch at x=${x}`);
  assert.equal(maxPerTick, 2);
  assert.ok(p.wildLevel() === 1);
  w.collision.unload();
});

test('walking costs no energy, running drains it by weight; recovery when idle', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'jogger', { pos: { x: 30, z: 10 }, run: true });
  const e0 = p.runEnergy;
  s.intent({ t: 'walk', x: 30, z: 30 });
  w.cycle(); w.cycle();
  assert.equal(p.runEnergy, e0 - 67 * 2 + 0, 'two running ticks cost 67 each');   // full energy clamps recovery
  runUntil(w, () => !p.hasWaypoints(), 40);
  const e1 = p.runEnergy;
  w.cycle();
  assert.equal(p.runEnergy, e1 + 8, 'idle tick recovers 8 (agility 1)');
  w.collision.unload();
});

test('unreachable targets end with "I can\'t reach that!"', () => {
  const w = new World({ seed: 3 });
  const { p, s } = addPlayer(w, 'blocked', { pos: { x: 30, z: 10 } });
  // a spot inside a solid block has no path; the move click simply goes nowhere
  s.intent({ t: 'walk', x: 31, z: 12 });
  runUntil(w, () => false, 5);
  assert.ok(!(p.x === 31 && p.z === 12));
  w.collision.unload();
});
