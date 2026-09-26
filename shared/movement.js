/* ============ shared/movement.js — walking, running and run energy (browser global + Node require) ============
 * Ported from the Lost City 2004 engine (MIT), verified 2026-09-25:
 *   src/engine/entity/Player.ts updateEnergy(): energy is 0..10000 (100.00%). A tick with fewer than
 *   two steps recovers floor(agility / 9) + 8; a running tick (two steps) costs
 *   floor(67 + 67 * clamp(weightKg, 0, 64) / 64). At 0 the run toggle switches off.
 *   src/engine/entity/PathingEntity.ts processMovement(): walk = 1 tile per tick, run = 2.
 * Weight counts non-stackable items carried or worn (stackables weigh nothing), per Player.ts
 * calculateRunWeight.
 * Our addition: an optional drain multiplier (shared/drinks.js: coffee drains run energy 25% slower for 2 minutes);
 * omitted it is 1 and every 2004 number above is unchanged.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.movement = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_ENERGY = 10000;
  const WALK_STEPS = 1;
  const RUN_STEPS = 2;

  /** one tick of run energy; returns the new energy (drainMult: optional, 1 = the 2004 cost) */
  function energyTick(energy, stepsTaken, weightKg, agilityLevel, drainMult) {
    if (stepsTaken < 2) {
      const recovered = Math.floor((agilityLevel || 1) / 9) + 8;
      return Math.min(energy + recovered, MAX_ENERGY);
    }
    const w = Math.min(Math.max(weightKg || 0, 0), 64);
    const m = (typeof drainMult === 'number' && drainMult >= 0) ? drainMult : 1;
    const loss = Math.floor((67 + (67 * w) / 64) * m);
    return Math.max(energy - loss, 0);
  }
  /** carried weight in kg: non-stackable inventory + worn items (stackables weigh nothing) */
  function carriedWeight(invDefs, wornDefs) {
    let w = 0;
    for (const d of invDefs) if (d && !d.stack) w += d.weight || 0;
    for (const d of wornDefs) if (d && !d.stack) w += d.weight || 0;
    return w;
  }
  /** 8-way direction index (2004 order: NW, N, NE, W, E, SW, S, SE) from a unit delta; north = +z */
  const DIRS = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]];
  function dirOf(dx, dz) {
    for (let i = 0; i < 8; i++) if (DIRS[i][0] === Math.sign(dx) && DIRS[i][1] === Math.sign(dz)) return i;
    return -1;
  }

  return { MAX_ENERGY, WALK_STEPS, RUN_STEPS, energyTick, carriedWeight, DIRS, dirOf };
});
