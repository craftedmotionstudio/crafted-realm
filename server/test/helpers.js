'use strict';
/* Shared helpers for the server tests: small maps, headless players, save data. */
const World = require('../engine/World');
const Player = require('../engine/Player');
const HeadlessSession = require('../engine/HeadlessSession');
const X = require('../../shared/xp.js');

/** an open 40x40 field; the northern half is wilderness level 1+ (z0 = 20), optional multi square */
function fieldMap(extra) {
  return Object.assign({
    format: 'crafted-realm-map', version: 1, name: 'test_field', level: 0,
    bounds: { x1: 0, z1: 0, x2: 39, z2: 39 },
    respawn: { x: 5, z: 5, radius: 0 },
    blocked: [], water: [], walls: [],
    areas: { wilderness: [{ x1: 0, z1: 20, x2: 39, z2: 39 }], multi: [], named: [] },
    spawns: [],
  }, extra || {});
}

/** save data for a player with given levels, position, pack and gear */
function saveData(world, o) {
  const stats = {};
  for (const sk of world.content.SKILLS) {
    const L = (o.levels && o.levels[sk]) || (sk === 'Hitpoints' ? 10 : 1);
    stats[sk] = { xp10: X.xp10ForLevel(L), cur: L };
  }
  return { pos: o.pos || { x: 5, z: 5, level: 0 }, stats, inv: o.inv || [], equip: o.equip || {}, run: !!o.run, style: o.style | 0, autoRetaliate: o.autoRetaliate !== false, autocast: o.autocast || null };
}

let nextId = 1;
/** a logged-in headless player (call after world creation; performs one cycle to log in) */
function addPlayer(world, name, o, noCycle) {
  const p = new Player(world, { id: nextId++, username: name }, saveData(world, o || {}));
  const s = new HeadlessSession().attach(p);
  world.queueLogin(p);
  if (!noCycle) world.cycle();
  return { p, s };
}

/** a deterministic world on the field map */
function fieldWorld(extra, seed) { return new World({ map: fieldMap(extra), seed: seed == null ? 1 : seed }); }

/** run cycles until pred() or the limit; returns ticks run */
function runUntil(world, pred, limit) {
  let n = 0;
  while (!pred() && n < (limit || 1000)) { world.cycle(); n++; }
  return n;
}

/**
 * an rng for exact combat tests: every attack hits and deals floor(max * f).
 * randomInc is only used by hit rolls (attack, then defence) and the damage roll, so it cycles
 * [max, 0, floor(max * f)]; everything else (wander, drops, ammo) gets fixed harmless values.
 */
function alwaysHit(f) {
  const frac = f == null ? 1 : f;
  let i = 0;
  return {
    next: () => 0.5,
    random: () => 1,
    range: (lo) => lo,
    randomInc: (n) => { const k = i++ % 3; return k === 0 ? n : k === 1 ? 0 : Math.floor(n * frac); },
  };
}

/** record every tile a player steps onto (captured before the cleanup phase resets the masks) */
function track(world, p) {
  const trail = [[p.x, p.z]];
  const perTick = [];
  const prev = world.phaseHook;
  world.phaseHook = (name) => { if (prev) prev(name); if (name === 'players') { perTick.push(p.steps.length); for (const st of p.steps) trail.push(st); } };
  return { trail, perTick };
}

module.exports = { track, fieldMap, saveData, addPlayer, fieldWorld, runUntil, alwaysHit, World, Player, HeadlessSession };
