/* ============ shared/pvp.js — Wilderness rules (browser global + Node require) ============
 * Everything the Ditch warning has to explain, as pure functions the server enforces and the client
 * can show before crossing. Ported from Lost City's 2004 content scripts (MIT) — rules only, our
 * own names and text. Verified 2026-09-25 against:
 *   [WL]  data/src/scripts/areas/area_wilderness/scripts/wilderness_levels.rs2   level = (z - z0)/8 + 1
 *   [PVP] data/src/scripts/skill_combat/scripts/pvp/pvp_combat.rs2               eligibility, single-way
 *   [SK]  data/src/scripts/skill_combat/scripts/pvp/pk_skull.rs2 + configs/pvp.constant   skull 2000
 *   [DE]  data/src/scripts/player/scripts/death.rs2                               kept items, protect item
 *   [TP]  data/src/scripts/skill_magic/scripts/spells/teleport.rs2                teleport block > 20
 *   [LO]  data/src/scripts/skill_combat/scripts/npc/npc_combat.rs2 + player/auto_retaliate.rs2
 *         p_preventlogout(..., 16)                                                logout lock
 *   [HP]  src/engine/entity/HeroPoints.ts (engine)                                most-damage "hero"
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.pvp = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SKULL_TICKS = 2000;          // ^pk_skull_duration [SK]
  const LOGOUT_LOCK_TICKS = 16;      // p_preventlogout(..., 16) [LO]
  const TELEPORT_BLOCK_LEVEL = 20;   // "> 20" blocks normal teleports [TP]
  const SINGLE_COMBAT_TICKS = 8;     // add(%lastcombat, 8) > map_clock [PVP]
  const KEPT_ITEMS = 3;              // three priciest items [DE]
  const PREDATOR_SLOTS = 3;          // %pk_predator1..3 [SK]
  const PREY_SLOTS = 2;              // %pk_prey1..2 [SK]

  /** inclusive rect test; rect = {x1, z1, x2, z2} (x1<=x2, z1<=z2) */
  function inRect(r, x, z) { return x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2; }

  /**
   * Wilderness level at a tile [WL]: the first zone containing the tile gives floor((z - z1) / 8) + 1,
   * where z1 is the zone's southern edge; 0 outside every zone. North is +z (as in 2004).
   */
  function wildernessLevel(x, z, zones) {
    if (!zones) return 0;
    for (const r of zones) if (inRect(r, x, z)) return Math.floor((z - r.z1) / 8) + 1;
    return 0;
  }
  /** multi-combat test: any rect in `areas` contains the tile */
  function isMulti(x, z, areas) {
    if (!areas) return false;
    for (const r of areas) if (inRect(r, x, z)) return true;
    return false;
  }

  /**
   * Level-range check [PVP pvp_level_check]: both players' wilderness levels, the lower one decides;
   * it must be >= 1 and >= the combat level difference.
   * Returns null when allowed, else a reason code: 'not_in_wilderness' | 'level_difference'.
   */
  function levelCheck(attackerCb, attackerWild, targetCb, targetWild) {
    const wl = Math.min(attackerWild, targetWild);
    if (wl < 1) return 'not_in_wilderness';
    if (wl < Math.abs(attackerCb - targetCb)) return 'level_difference';
    return null;
  }

  /**
   * Single-way combat check for attacking a player [PVP pvp_in_combat_check]. Skipped entirely when the
   * TARGET stands in a multi-combat area. `a` / `t` are combat-state records:
   *   { id, lastCombat, predators: [id,id,id], aggressiveNpcAlive: bool }
   * Returns null when allowed, else 'already_under_attack' | 'target_busy'.
   */
  function singleCombatCheck(a, t, clock, targetInMulti) {
    if (targetInMulti) return null;
    if (a.lastCombat + SINGLE_COMBAT_TICKS > clock) {
      const p1 = a.predators[0];
      if (p1 != null && p1 !== t.id) return 'already_under_attack';
      if (a.aggressiveNpcAlive) return 'already_under_attack';
    }
    if (t.lastCombat + SINGLE_COMBAT_TICKS > clock) {
      const p1 = t.predators[0];
      if (p1 != null && p1 !== a.id) return 'target_busy';
      if (t.aggressiveNpcAlive) return 'target_busy';
    }
    return null;
  }

  /** player-facing text for each reason (our own wording) */
  const REASON_TEXT = {
    not_in_wilderness: 'You can only fight other adventurers in the Scarlands.',
    level_difference: 'The difference in your combat levels is too great here. Go deeper into the Scarlands.',
    already_under_attack: 'You are already under attack.',
    target_busy: 'Someone else is already fighting them.',
    target_dead: 'They are already beaten.',
  };

  /**
   * Full eligibility for attacking a player (level range first, then the single-way check), matching
   * the order of pvp_is_attackable [PVP]. Returns {ok, reason}.
   */
  function canAttack(a, t, clock, opts) {
    const o = opts || {};
    const lvl = levelCheck(a.combatLevel, a.wildLevel, t.combatLevel, t.wildLevel);
    if (lvl) return { ok: false, reason: lvl };
    const sc = singleCombatCheck(a, t, clock, !!o.targetInMulti);
    if (sc) return { ok: false, reason: sc };
    return { ok: true, reason: null };
  }

  /**
   * Skull rule [SK deserves_pk_skull]: attacking someone does NOT skull you when they are one of your
   * recent attackers (your predators 1..3) or you are one of their recent targets (their prey 1..2).
   */
  function deservesSkull(a, t) {
    if (t.preys.indexOf(a.id) >= 0) return false;
    if (a.predators.indexOf(t.id) >= 0) return false;
    return true;
  }
  /**
   * Apply the bookkeeping of one attack [SK set_pk_vars] to both records (mutates them).
   * Returns {skulled} — true when the attacker (re)gains a fresh 2000-tick skull this attack.
   */
  function recordAttack(a, t, clock) {
    const skulled = deservesSkull(a, t);
    if (skulled) a.skullUntil = clock + SKULL_TICKS;
    a.preys = [t.id].concat(a.preys).slice(0, PREY_SLOTS);
    t.predators = [a.id].concat(t.predators).slice(0, PREDATOR_SLOTS);
    t.lastCombat = clock;
    t.lastCombatPvp = clock;
    t.aggressiveNpc = null;
    return { skulled };
  }
  function isSkulled(skullUntil, clock) { return skullUntil > clock; }
  /** logout keeps the remaining skull time [SK set_pk_skull_logout] */
  function skullRemainingOnLogout(skullUntil, clock) { return skullUntil > clock ? skullUntil - clock : 0; }
  /** login restores it, capped at the full duration [SK set_pk_skull_login] */
  function skullUntilOnLogin(remaining, clock) { return remaining > 0 ? clock + Math.min(remaining, SKULL_TICKS) : 0; }

  /** logout lock [LO]: allowed once clock >= preventLogoutUntil */
  function canLogout(preventLogoutUntil, clock) { return clock >= preventLogoutUntil; }
  function logoutLockUntil(clock) { return clock + LOGOUT_LOCK_TICKS; }
  /** teleport block [TP]: normal teleports fail above wilderness level 20 */
  function canTeleport(wildLevel) { return !(wildLevel > TELEPORT_BLOCK_LEVEL); }

  /* Equipment scan order for the kept-items search, following the 2004 wear positions
   * (hat, back, front, right hand, torso, left hand, legs, hands, feet, quiver). */
  const EQUIP_SCAN_ORDER = ['head', 'cape', 'amulet', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ammo'];

  /**
   * Items kept on death [DE move_priciest_item_on_hero_to_death], exactly:
   *   repeat 3 times unless skulled, +1 more with Protect Item: find the single most valuable unit —
   *   inventory slots first (in order), then worn slots; a later item replaces the pick only when
   *   STRICTLY more valuable; value 0 items are never kept; items flagged destroyOnDeath are skipped —
   *   and move ONE unit of it (a stack loses one) to the kept pile.
   * @param inv    array of {id, qty} | null (not mutated)
   * @param equip  {slot: id} (not mutated)
   * @param valueOf (id) => number   destroyOnDeath (id) => bool (optional)
   * @returns {kept:[{id,qty}], lostInv:[{id,qty}|null], lostEquip:{slot:id}}
   */
  function keptOnDeath(inv, equip, opts) {
    const o = opts || {};
    const valueOf = o.valueOf || (() => 0);
    const destroy = o.destroyOnDeath || (() => false);
    const invCopy = inv.map((s) => (s ? { id: s.id, qty: s.qty } : null));
    const equipCopy = Object.assign({}, equip);
    const kept = [];
    let picks = o.skulled ? 0 : KEPT_ITEMS;
    if (o.protectItem) picks += 1;
    for (let k = 0; k < picks; k++) {
      let best = 0, where = null;
      for (let i = 0; i < invCopy.length; i++) {
        const s = invCopy[i];
        if (!s || s.qty < 1 || destroy(s.id)) continue;
        const v = valueOf(s.id);
        if (v > best) { best = v; where = { kind: 'inv', id: s.id }; }
      }
      for (const slot of EQUIP_SCAN_ORDER) {
        const id = equipCopy[slot];
        if (!id || destroy(id)) continue;
        const v = valueOf(id);
        if (v > best) { best = v; where = { kind: 'equip', id, slot }; }
      }
      if (!where) break;
      if (where.kind === 'equip') {
        equipCopy[where.slot] = null;
      } else {
        // inv_moveitem takes one unit of that item id from the first slot holding it
        const i = invCopy.findIndex((s) => s && s.id === where.id && s.qty > 0);
        invCopy[i].qty -= 1;
        if (invCopy[i].qty <= 0) invCopy[i] = null;
      }
      const last = kept.find((e) => e.id === where.id && o.stackable && o.stackable(where.id));
      if (last) last.qty += 1; else kept.push({ id: where.id, qty: 1 });
    }
    const lostEquip = {};
    for (const slot in equipCopy) if (equipCopy[slot]) lostEquip[slot] = equipCopy[slot];
    return { kept, lostInv: invCopy, lostEquip };
  }

  /**
   * Most-damage "hero" [HP]: entries [{key, points}] in the order they were first recorded;
   * the highest total wins, ties go to the earliest entry. Returns the key or null.
   */
  function findHero(entries) {
    let best = null;
    for (const e of entries) if (e.points > 0 && (!best || e.points > best.points)) best = e;
    return best ? best.key : null;
  }

  /**
   * The Ditch warning (our own words): what an adventurer must understand before crossing, with their own numbers.
   * o = {combatLevel, skulled, protectItem, keptNames: [names of what they would keep]}. Returns lines of text.
   */
  function ditchWarningLines(o) {
    const p = o || {}, cb = p.combatLevel | 0, n = p.skulled ? 0 : KEPT_ITEMS + (p.protectItem ? 1 : 0);
    const lines = [
      'Beyond the Ditch lie the Scarlands. Other adventurers can attack you there, and you them.',
      'At Scarlands level 1 you can fight adventurers within 1 combat level of you (' + Math.max(3, cb - 1) + ' to ' + (cb + 1) + '); every 8 steps north widens the range by one.',
      'If you fall there you keep only your ' + (n ? n + ' most valuable item' + (n > 1 ? 's' : '') : 'nothing') + (p.skulled ? ' (you are skulled)' : '') + '; the rest goes to whoever dealt you the most damage.',
      'Attacking an adventurer who did not attack you first puts a skull over your head for 20 minutes: a skulled adventurer keeps nothing (only Protect Item saves one thing).',
      'Above level ' + TELEPORT_BLOCK_LEVEL + ' no ordinary teleport will carry you out, and you cannot leave the world within ' + Math.round(LOGOUT_LOCK_TICKS * 0.6) + ' seconds of a fight.',
    ];
    if (p.keptNames && p.keptNames.length) lines.push('You would keep: ' + p.keptNames.join(', ') + '.');
    return lines;
  }

  return {
    ditchWarningLines,
    SKULL_TICKS, LOGOUT_LOCK_TICKS, TELEPORT_BLOCK_LEVEL, SINGLE_COMBAT_TICKS, KEPT_ITEMS, PREDATOR_SLOTS, PREY_SLOTS,
    EQUIP_SCAN_ORDER, REASON_TEXT,
    inRect, wildernessLevel, isMulti, levelCheck, singleCombatCheck, canAttack,
    deservesSkull, recordAttack, isSkulled, skullRemainingOnLogout, skullUntilOnLogin,
    canLogout, logoutLockUntil, canTeleport, keptOnDeath, findHero,
  };
});
