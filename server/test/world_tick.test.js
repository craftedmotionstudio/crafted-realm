'use strict';
/* The tick: phase order, login placement, drift-corrected real-time loop. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { fieldWorld, addPlayer, World } = require('./helpers');

test('cycle runs the 2004 phase order', () => {
  const w = fieldWorld();
  const seen = [];
  w.phaseHook = (name) => seen.push(name);
  w.cycle();
  assert.deepEqual(seen, ['world', 'clientsIn', 'npcEvents', 'npcs', 'players', 'logouts', 'logins', 'zones', 'info', 'clientsOut', 'cleanup']);
  assert.deepEqual(seen, World.PHASES);
  assert.equal(w.tick, 1);
  w.collision.unload();
});

test('a new player enters after the player phase (nothing hits them on their first tick) and gets a welcome', () => {
  const w = fieldWorld();
  const { p, s } = addPlayer(w, 'newbie', { pos: { x: 10, z: 10 } }, true);
  let processedDuringPlayers = null;
  w.phaseHook = (name) => { if (name === 'players') processedDuringPlayers = p.active; };
  w.cycle();
  assert.equal(processedDuringPlayers, false);   // not in the world yet during the player phase
  assert.equal(p.active, true);
  assert.equal(s.received[0].t, 'welcome');
  assert.equal(s.received[1].t, 'tick');          // and its first delta in the same cycle
  assert.equal(p.pid, 1);
  w.collision.unload();
});

test('players are processed in pid order', () => {
  const w = fieldWorld();
  const a = addPlayer(w, 'a', { pos: { x: 10, z: 10 } }).p;
  const b = addPlayer(w, 'b', { pos: { x: 12, z: 10 } }).p;
  const order = [];
  a.processInteraction = () => order.push('a');
  b.processInteraction = () => order.push('b');
  w.cycle();
  assert.deepEqual(order, ['a', 'b']);
  w.collision.unload();
});

test('real-time loop is drift-corrected (average interval stays on the tick length)', async () => {
  const w = new World({ map: require('./helpers').fieldMap(), seed: 1, tickMs: 25 });
  const stamps = [];
  const orig = w.cycle.bind(w);
  w.cycle = () => { stamps.push(Date.now()); orig(); if (stamps.length === 3) { const t = Date.now() + 40; while (Date.now() < t) { /* a slow tick */ } } };
  w.start();
  await new Promise((r) => setTimeout(r, 25 * 42));
  w.stop();
  w.collision.unload();
  assert.ok(stamps.length >= 30, 'ran ' + stamps.length + ' cycles');
  // after the deliberately slow tick the loop catches up: total elapsed ~= ticks * 25 ms
  const span = stamps[stamps.length - 1] - stamps[0];
  const avg = span / (stamps.length - 1);
  assert.ok(avg > 20 && avg < 32, 'average interval ' + avg.toFixed(1) + ' ms');
});
