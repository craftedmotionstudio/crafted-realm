/* ============ shared/drinks.js — drinks taken in doses, and brewing them (browser global + Node require) ============
 * The consumption skeleton is the 2004 one (Lost City consume.rs2, MIT): a potion-style drink calls
 * player_consume_item(effect, null, null), i.e. NO eat delay and NO attack delay (it combos with food and does not slow
 * a fight), and each sip turns the item into its next stage.
 * Coffee is our own drink (owner request 2026-09-26):
 *   - 4 doses in a mug: coffee_4 -> coffee_3 -> coffee_2 -> coffee_1 -> gone (the mug is set aside);
 *   - each sip restores 20% run energy;
 *   - for 2 minutes (200 ticks) run energy drains 25% slower ("caffeinated"); another sip starts the 2 minutes again;
 *   - brewed with Cooking on a range from roasted beans and water (a jug or a bucket of water; the vessel comes back).
 * Used by: the server (server/engine/input.js eat intent -> Player.drink, Player.updateEnergy) and the offline client
 * (src/coffee.js, Player.tickVitals in src/game3_systems.js). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.drinks = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TICK_SECONDS = 0.6;
  const DRINKS = {
    coffee: {
      doses: ['coffee_4', 'coffee_3', 'coffee_2', 'coffee_1'],
      empty: null,                  // what the last sip leaves in the pack (nothing: the mug is set aside)
      restorePct: 20,               // run energy restored per sip, % of the maximum
      effectTicks: 200,             // 2 minutes
      drainMult: 0.75,              // run energy drains 25% slower while it lasts
      status: 'caffeinated',
      sipText: 'You drink some of your coffee. You feel wide awake.',
      lastText: 'You drink the last of your coffee and set the mug aside.',
    },
  };
  const BY_ID = {};
  for (const key in DRINKS) DRINKS[key].doses.forEach((id, i) => { BY_ID[id] = { key, left: DRINKS[key].doses.length - i }; });

  /** the drink an item is a dose of: {key, drink, left (doses in this item), next (item id after one sip, or the empty vessel)} */
  function drinkOf(itemId) {
    const b = BY_ID[itemId]; if (!b) return null;
    const d = DRINKS[b.key], i = d.doses.indexOf(itemId);
    return { key: b.key, drink: d, left: b.left, next: i + 1 < d.doses.length ? d.doses[i + 1] : (d.empty || null) };
  }
  function isDrink(itemId) { return !!BY_ID[itemId]; }

  /** one sip. energy/maxEnergy in the caller's units (server 0..10000, client 0..100); clock in ticks.
   *  Returns {key, next, energy, until, last} — `until` is the tick the effect ends (exclusive). */
  function sip(itemId, energy, maxEnergy, clock) {
    const o = drinkOf(itemId); if (!o) return null;
    const max = maxEnergy || 100, gain = max * o.drink.restorePct / 100;
    return { key: o.key, next: o.next, last: o.left === 1, energy: Math.min(max, (energy || 0) + gain),
      until: (clock || 0) + o.drink.effectTicks, text: o.left === 1 ? o.drink.lastText : o.drink.sipText };
  }
  /** the run-energy drain multiplier at `clock` for an effect that lasts until `until` (1 = none) */
  function drainMultiplier(until, clock) { return until > clock ? DRINKS.coffee.drainMult : 1; }

  /* ---- brewing ---- */
  const BREWS = {
    // an input is an item id or a list of alternatives; EMPTIES gives back the vessel a used input leaves
    coffee: { inputs: ['roasted_beans', ['jug_water', 'bucket_water']], outputs: ['coffee_4'], skill: 'Cooking', level: 1, xp: 30,
      station: 'range', text: 'You brew a mug of strong coffee.' },
  };
  const EMPTIES = { jug_water: 'jug', bucket_water: 'bucket' };
  /** plan one brew from an inventory (array of item ids or {id} slots, null = empty); pure.
   *  Returns {ok:true, take:[slot indexes], give:[ids], xp, skill} or {ok:false, missing:[ids]} / {ok:false, level}. */
  function planBrew(key, inventory, skillLevel) {
    const b = BREWS[key]; if (!b) return { ok: false, missing: [] };
    if ((skillLevel || 1) < b.level) return { ok: false, level: b.level };
    const ids = (inventory || []).map(s => (s && typeof s === 'object') ? s.id : s), take = [], missing = [], give = b.outputs.slice();
    for (const want of b.inputs) {
      const alts = Array.isArray(want) ? want : [want];
      const at = ids.findIndex((id, i) => alts.indexOf(id) >= 0 && take.indexOf(i) < 0);
      if (at < 0) { missing.push(alts[0]); continue; }
      take.push(at); if (EMPTIES[ids[at]]) give.push(EMPTIES[ids[at]]);
    }
    if (missing.length) return { ok: false, missing };
    return { ok: true, take, give, xp: b.xp, skill: b.skill, text: b.text };
  }

  return { TICK_SECONDS, DRINKS, BREWS, EMPTIES, drinkOf, isDrink, sip, drainMultiplier, planBrew };
});
