/* ============ shared/drops.js — weighted drop tables (browser global + Node require) ============
 * The 2004 monster drop shape (Lost City content scripts, MIT; verified 2026-09-25 against
 * data/src/scripts/drop tables/scripts/goblin.rs2, shared_droptables.rs2, drop_table.rs2 and
 * configs/lootdrop.constant; engine src/engine/entity/Obj.ts for the reveal timer):
 *   1. an "always" drop (bones) for the hero,
 *   2. ONE roll of random(128) walked down a ladder of weighted rungs ("if roll < 1 .. else if < 2 ..");
 *      unused weight means no main drop; a rung can point at a shared table (gems, a rare table) which
 *      is rolled the same way and can itself come up empty,
 *   3. independent tertiary rolls (clue-style extras).
 * Loot belongs to the hero for 100 ticks, then anyone may take it until 200 ticks after the drop.
 *
 * Our table format (JSON-friendly, our own ids):
 *   { always: [{item, qty}], rolls: 128, main: [{w, item, qty} | {w, table: 'shared_id'}],
 *     tertiary: [{num, den, item, qty}], independent: [{item, qty, p}] }
 * qty is a number or [lo, hi] (inclusive; ranges are our extension). `independent` reproduces the
 * client's current per-entry probability lists (src/game1_data.js NPC_TYPES[].drops) exactly.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.drops = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LOOT_PRIVATE_TICKS = 100;   // Obj.REVEAL: owner-only for 100 ticks
  const LOOT_DESPAWN_TICKS = 200;   // ^lootdrop_duration: gone 200 ticks after it fell
  const DEFAULT_ROLLS = 128;
  const MAX_DEPTH = 4;              // nested shared tables

  function rollQty(rng, qty) {
    if (Array.isArray(qty)) return rng.range(qty[0] | 0, qty[1] | 0);
    return qty == null ? 1 : qty | 0;
  }

  /** walk one ladder: returns the chosen rung or null (unused weight) */
  function pickRung(rng, rolls, rungs) {
    const r = rng.random(rolls || DEFAULT_ROLLS);
    let acc = 0;
    for (const rung of rungs) {
      acc += rung.w | 0;
      if (r < acc) return rung;
    }
    return null;
  }

  function rollLadder(rng, table, shared, out, depth) {
    if (!table || !table.main || !table.main.length) return;
    const rung = pickRung(rng, table.rolls, table.main);
    if (!rung) return;
    if (rung.table) {
      if (depth >= MAX_DEPTH) return;
      rollLadder(rng, shared && shared[rung.table], shared, out, depth + 1);
      return;
    }
    if (rung.item) out.push({ id: rung.item, qty: rollQty(rng, rung.qty) });
  }

  /**
   * Roll a monster's drops. `rng` is a CRShared.rng generator (seeded in tests), `shared` maps shared
   * table ids to tables. Returns [{id, qty}] in drop order (always, main, tertiary, independent).
   */
  function roll(rng, table, shared) {
    const out = [];
    if (!table) return out;
    for (const a of table.always || []) out.push({ id: a.item, qty: rollQty(rng, a.qty) });
    rollLadder(rng, table, shared, out, 0);
    for (const t of table.tertiary || []) {
      if (rng.random(t.den) < t.num) out.push({ id: t.item, qty: rollQty(rng, t.qty) });
    }
    for (const e of table.independent || []) {
      if (e.p >= 1 || rng.next() < e.p) out.push({ id: e.item, qty: rollQty(rng, e.qty) });
    }
    return out;
  }

  /** express the client's legacy list [{id, q, p}] as a table (p >= 1 -> always, the rest independent) */
  function fromLegacy(list) {
    const t = { always: [], independent: [] };
    for (const d of list || []) {
      if (d.p >= 1) t.always.push({ item: d.id, qty: d.q });
      else t.independent.push({ item: d.id, qty: d.q, p: d.p });
    }
    return t;
  }

  /** exact probability of each main-ladder outcome (for docs/tests): {item|'table:x'|'nothing': p} */
  function ladderOdds(table) {
    const rolls = table.rolls || DEFAULT_ROLLS;
    const out = {}; let used = 0;
    for (const r of table.main || []) {
      const k = r.table ? 'table:' + r.table : r.item;
      out[k] = (out[k] || 0) + (r.w | 0) / rolls; used += r.w | 0;
    }
    out.nothing = Math.max(0, rolls - used) / rolls;
    return out;
  }

  /** structural validation; itemExists(id) -> bool. Returns an array of error strings. */
  function validate(id, table, shared, itemExists) {
    const errs = [];
    const chkItem = (it, where) => { if (!itemExists(it)) errs.push(`${id}: ${where} unknown item "${it}"`); };
    const chkQty = (q, where) => {
      if (Array.isArray(q)) { if (!(q[0] >= 1 && q[1] >= q[0])) errs.push(`${id}: ${where} bad qty range ${JSON.stringify(q)}`); }
      else if (q != null && !(q >= 1)) errs.push(`${id}: ${where} bad qty ${q}`);
    };
    for (const a of table.always || []) { chkItem(a.item, 'always'); chkQty(a.qty, 'always'); }
    let w = 0;
    for (const r of table.main || []) {
      if (!(r.w >= 1)) errs.push(`${id}: main rung weight ${r.w}`);
      w += r.w | 0;
      if (r.table) { if (!shared || !shared[r.table]) errs.push(`${id}: unknown shared table "${r.table}"`); }
      else { chkItem(r.item, 'main'); chkQty(r.qty, 'main'); }
    }
    if (w > (table.rolls || DEFAULT_ROLLS)) errs.push(`${id}: main weights ${w} exceed rolls ${table.rolls || DEFAULT_ROLLS}`);
    for (const t of table.tertiary || []) {
      chkItem(t.item, 'tertiary'); chkQty(t.qty, 'tertiary');
      if (!(t.num >= 1 && t.den >= t.num)) errs.push(`${id}: tertiary odds ${t.num}/${t.den}`);
    }
    for (const e of table.independent || []) {
      chkItem(e.item, 'independent'); chkQty(e.qty, 'independent');
      if (!(e.p > 0 && e.p <= 1)) errs.push(`${id}: independent p ${e.p}`);
    }
    return errs;
  }

  return { LOOT_PRIVATE_TICKS, LOOT_DESPAWN_TICKS, DEFAULT_ROLLS, roll, pickRung, rollQty, fromLegacy, ladderOdds, validate };
});
