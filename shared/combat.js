/* ============ shared/combat.js — the 2004 combat rules (browser global + Node require) ============
 * One source of truth for combat numbers: the authoritative server runs these, and the client can
 * run the same code offline / for prediction. Pure functions, integer maths, no globals.
 *
 * Rules and formulas ported from Lost City's 2004 content scripts (MIT, (c) 2023-2025 Lost City;
 * https://github.com/2004scape/Server). Only RULES and FORMULAS are ported — every name, table and
 * text here is our own. Each block cites the script it was verified against (2026-09-25):
 *   [C]   data/src/scripts/skill_combat/scripts/combat.rs2               effective stat, rolls, max hit, xp split
 *   [PCS] .../scripts/player/player_combat_stat.rs2                       player rolls, magic defence, prayers
 *   [PC]  .../scripts/player/player_combat.rs2                            hit roll, attack range
 *   [PM]  .../scripts/player/player_melee.rs2, player_ranged.rs2, player_magic.rs2   attack rates, hit delays
 *   [PJ]  .../scripts/projectile.rs2 + configs/magic/magic_combat_spells.dbrow        projectile durations
 *   [PVP] .../scripts/pvp/pvp_melee.rs2, pvp_ranged.rs2, pvp_magic.rs2, pvp_combat.rs2 protection, pvp xp
 *   [NPC] .../scripts/npc/npc_combat.rs2, npc_combat_melee.rs2, npc_combat_ranged.rs2, npc_combat_magic.rs2
 *   [AR]  .../scripts/player/auto_retaliate.rs2                           retaliation delay
 *   [CL]  data/src/scripts/player/scripts/combat_level.rs2                combat level
 *   [EAT] data/src/scripts/player/scripts/consumption/consume.rs2        eating delays
 *   [PR]  data/src/scripts/skill_prayer/scripts/prayer.rs2 + configs/prayers.enum/dbrow  prayer drain
 *   [CS]  data/src/scripts/skill_combat/configs/combat.dbrow             weapon category style tables
 *
 * Notation: "roll" = effective level * (bonus + 64); a hit lands when randomInc(attackRoll) >
 * randomInc(defenceRoll). Damage is randomInc(maxHit) — 0..max inclusive (a 0 on a successful roll
 * is still a hit for xp/retaliation purposes, it just deals nothing).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.combat = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------------------------------------ */
  /* Damage types and damage styles                                                              */
  /* ------------------------------------------------------------------------------------------ */
  const TYPE = { STAB: 'stab', SLASH: 'slash', CRUSH: 'crush', RANGED: 'ranged', MAGIC: 'magic' };
  const MELEE_TYPES = [TYPE.STAB, TYPE.SLASH, TYPE.CRUSH];
  const STYLE = {
    ACCURATE: 'accurate', AGGRESSIVE: 'aggressive', DEFENSIVE: 'defensive', CONTROLLED: 'controlled',
    RANGED_ACCURATE: 'ranged_accurate', RANGED_RAPID: 'ranged_rapid', RANGED_LONGRANGE: 'ranged_longrange',
    MAGIC_NORMAL: 'magic_normal', MAGIC_DEFENSIVE: 'magic_defensive',
  };

  /** invisible style bonuses [C] combat_get_damagestyle_bonuses: (attack, strength, defence, ranged) */
  const STYLE_BONUS = {
    accurate:         { att: 3, str: 0, def: 0, rng: 0 },
    aggressive:       { att: 0, str: 3, def: 0, rng: 0 },
    defensive:        { att: 0, str: 0, def: 3, rng: 0 },
    controlled:       { att: 1, str: 1, def: 1, rng: 0 },
    ranged_accurate:  { att: 0, str: 0, def: 0, rng: 3 },
    ranged_rapid:     { att: 0, str: 0, def: 0, rng: 0 },
    ranged_longrange: { att: 0, str: 0, def: 3, rng: 0 },
    magic_normal:     { att: 0, str: 0, def: 0, rng: 0 },
    magic_defensive:  { att: 0, str: 0, def: 0, rng: 0 },
  };

  /* Weapon categories -> the style buttons they offer. Structure ported from [CS] combat_style_table
   * (each category lists damagestyle + damagetype per button); button labels are our own words. */
  const S = (label, style, type) => ({ label, style, type });
  const CATEGORY_STYLES = {
    unarmed:   [S('Punch', 'accurate', 'crush'), S('Kick', 'aggressive', 'crush'), S('Block', 'defensive', 'crush')],
    stab:      [S('Stab', 'accurate', 'stab'), S('Lunge', 'aggressive', 'stab'), S('Slash', 'aggressive', 'slash'), S('Block', 'defensive', 'stab')],
    slash:     [S('Chop', 'accurate', 'slash'), S('Slash', 'aggressive', 'slash'), S('Lunge', 'controlled', 'stab'), S('Block', 'defensive', 'slash')],
    spiked:    [S('Pound', 'accurate', 'crush'), S('Pummel', 'aggressive', 'crush'), S('Spike', 'controlled', 'stab'), S('Block', 'defensive', 'crush')],
    blunt:     [S('Pound', 'accurate', 'crush'), S('Pummel', 'aggressive', 'crush'), S('Block', 'defensive', 'crush')],
    twohanded: [S('Chop', 'accurate', 'slash'), S('Slash', 'aggressive', 'slash'), S('Smash', 'aggressive', 'crush'), S('Block', 'defensive', 'slash')],
    axe:       [S('Chop', 'accurate', 'slash'), S('Hack', 'aggressive', 'slash'), S('Smash', 'aggressive', 'crush'), S('Block', 'defensive', 'slash')],
    pickaxe:   [S('Spike', 'accurate', 'stab'), S('Impale', 'aggressive', 'stab'), S('Smash', 'aggressive', 'crush'), S('Block', 'defensive', 'stab')],
    staff:     [S('Bash', 'accurate', 'crush'), S('Pound', 'aggressive', 'crush'), S('Focus', 'defensive', 'crush')],
    bow:       [S('Accurate', 'ranged_accurate', 'ranged'), S('Rapid', 'ranged_rapid', 'ranged'), S('Longrange', 'ranged_longrange', 'ranged')],
    thrown:    [S('Accurate', 'ranged_accurate', 'ranged'), S('Rapid', 'ranged_rapid', 'ranged'), S('Longrange', 'ranged_longrange', 'ranged')],
  };
  /* Our weapon templates / models -> the 2004 category they behave like. */
  const TEMPLATE_CATEGORY = {
    sword: 'stab', sabre: 'slash', longsword: 'slash', mace: 'spiked', warhammer: 'blunt', greatsword: 'twohanded',
    battleaxe: 'axe', hatchet: 'axe', pickaxe: 'pickaxe',
  };
  const MODEL_CATEGORY = {
    sword: 'stab', sabre: 'slash', longsword: 'slash', mace: 'spiked', warhammer: 'blunt', greatsword: 'twohanded',
    battleaxe: 'axe', axe: 'axe', pick: 'pickaxe', staff: 'staff', bow: 'bow', longbow: 'bow',
  };

  /** The style category of a wielded weapon definition (null = unarmed). */
  function weaponCategory(def) {
    if (!def) return 'unarmed';
    if (def.combatCategory && CATEGORY_STYLES[def.combatCategory]) return def.combatCategory;
    if (def.style === 'ranged') return 'bow';
    if (def.style === 'magic') return 'staff';
    if (def.template && TEMPLATE_CATEGORY[def.template]) return TEMPLATE_CATEGORY[def.template];
    // a melee item whose attack split clearly favours crush (e.g. a maul carried on a sword model) is blunt
    const st = def.aStab || 0, sl = def.aSlash || 0, cr = def.aCrush || 0;
    if (cr > st && cr > sl) return 'blunt';
    if (def.model && MODEL_CATEGORY[def.model]) return MODEL_CATEGORY[def.model];
    return sl > st ? 'slash' : 'stab';
  }
  /** Style buttons for a weapon. */
  function stylesFor(def) { return CATEGORY_STYLES[weaponCategory(def)]; }
  /** The selected style; the index is clamped to the table like 2004 (%com_mode = min(com_mode, count-1)) [PCS]. */
  function styleFor(def, index) {
    const list = stylesFor(def);
    return list[Math.max(0, Math.min(index | 0, list.length - 1))];
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Equipment bonuses                                                                           */
  /* ------------------------------------------------------------------------------------------ */
  /* 2004 items carry 12 bonuses (5 attack, 5 defence, strength, prayer) plus ranged strength on ammo.
   * Our item data is flatter, so this is the documented mapping from our fields:
   *   melee weapon  : stab/slash/crush attack = aStab/aSlash/aCrush (fallback aBonus); strength = sBonus
   *   ranged weapon : ranged attack = aBonus; ranged strength = rStr, else sBonus (our bows carry it)
   *   magic weapon  : magic attack = aBonus; melee = aStab/aSlash/aCrush (default 0); strength = sBonus
   *   other gear    : aBonus adds to stab/slash/crush and ranged attack; sBonus adds melee strength;
   *                   mBonus/magB add magic attack; defence per type = dStab.. (fallback dBonus) for all
   *                   five types; prayB = prayer bonus; rStr = ranged strength (ammo)
   */
  function zeroBonuses() {
    return { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0, dStab: 0, dSlash: 0, dCrush: 0, dMagic: 0, dRanged: 0, str: 0, rStr: 0, prayer: 0 };
  }
  const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
  const pick = (v, fb) => (typeof v === 'number' && isFinite(v) ? v : n(fb));
  function itemBonuses(def) {
    const b = zeroBonuses();
    if (!def) return b;
    const isWeapon = def.equip === 'weapon';
    if (isWeapon && def.style === 'ranged') {
      b.ranged = n(def.aBonus);
      b.rStr = pick(def.rStr, def.sBonus);
    } else if (isWeapon && def.style === 'magic') {
      b.magic = n(def.aBonus) + n(def.mBonus) + n(def.magB);
      b.stab = n(def.aStab); b.slash = n(def.aSlash); b.crush = n(def.aCrush);
      b.str = n(def.sBonus);
    } else if (isWeapon) {
      b.stab = pick(def.aStab, def.aBonus); b.slash = pick(def.aSlash, def.aBonus); b.crush = pick(def.aCrush, def.aBonus);
      b.str = n(def.sBonus);
      b.magic = n(def.mBonus) + n(def.magB);
    } else {
      const a = n(def.aBonus);
      b.stab = pick(def.aStab, a); b.slash = pick(def.aSlash, a); b.crush = pick(def.aCrush, a);
      b.ranged = pick(def.aRanged, a);
      b.magic = n(def.mBonus) + n(def.magB);
      b.str = n(def.sBonus);
      b.rStr = n(def.rStr);
    }
    const d = n(def.dBonus);
    b.dStab = pick(def.dStab, d); b.dSlash = pick(def.dSlash, d); b.dCrush = pick(def.dCrush, d);
    b.dMagic = pick(def.dMagic, d); b.dRanged = pick(def.dRanged, d);
    b.prayer = n(def.prayB);
    return b;
  }
  /** Sum of bonuses over a list of equipped item definitions. */
  function equipmentBonuses(defs) {
    const t = zeroBonuses();
    for (const def of defs) {
      if (!def) continue;
      const b = itemBonuses(def);
      for (const k in t) t[k] += b[k];
    }
    return t;
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Prayers                                                                                     */
  /* ------------------------------------------------------------------------------------------ */
  /* Ids match the client's PRAYERS table (src/game3_systems.js) plus protect_item (2004 level 25).
   * pct = the multiplier in percent used by combat_effective_stat [PCS check_*_prayer].
   * drain = the per-prayer drain effect from prayers.enum [PR] (thick skin 3 .. protection 12,
   * protect item 2). Prayers in the same group replace each other ([PR] prayer_deactivate lists).
   * sharp_eye/hawk_eye/mystic_will/mystic_lore are OUR additions (2004 had no ranged/magic prayers);
   * they use the same 3/6 drain as the matching melee tier. */
  const PRAYERS = {
    thick_skin:     { level: 1,  group: 'def', stat: 'def', pct: 105, drain: 3 },
    burst_str:      { level: 4,  group: 'str', stat: 'str', pct: 105, drain: 3 },
    clarity:        { level: 7,  group: 'att', stat: 'att', pct: 105, drain: 3 },
    sharp_eye:      { level: 8,  group: 'rng', stat: 'rng', pct: 105, drain: 3 },
    mystic_will:    { level: 9,  group: 'mag', stat: 'mag', pct: 105, drain: 3 },
    rock_skin:      { level: 10, group: 'def', stat: 'def', pct: 110, drain: 6 },
    superhuman:     { level: 13, group: 'str', stat: 'str', pct: 110, drain: 6 },
    reflexes:       { level: 16, group: 'att', stat: 'att', pct: 110, drain: 6 },
    protect_item:   { level: 25, group: null,  stat: null,  pct: 100, drain: 2 },
    hawk_eye:       { level: 26, group: 'rng', stat: 'rng', pct: 110, drain: 6 },
    mystic_lore:    { level: 27, group: 'mag', stat: 'mag', pct: 110, drain: 6 },
    steel_skin:     { level: 28, group: 'def', stat: 'def', pct: 115, drain: 12 },
    ultimate_str:   { level: 31, group: 'str', stat: 'str', pct: 115, drain: 12 },
    incredible_ref: { level: 34, group: 'att', stat: 'att', pct: 115, drain: 12 },
    protect_magic:  { level: 37, group: 'overhead', protect: 'magic',  drain: 12 },
    protect_range:  { level: 40, group: 'overhead', protect: 'ranged', drain: 12 },
    protect_melee:  { level: 43, group: 'overhead', protect: 'melee',  drain: 12 },
  };
  function asList(active) { return !active ? [] : Array.isArray(active) ? active : Array.from(active); }
  /** percent multipliers from the active prayers: {att, str, def, rng, mag} (100 = none) */
  function prayerPercents(active) {
    const p = { att: 100, str: 100, def: 100, rng: 100, mag: 100 };
    for (const id of asList(active)) { const d = PRAYERS[id]; if (d && d.stat) p[d.stat] = Math.max(p[d.stat], d.pct); }
    return p;
  }
  /** does the active prayer set protect from this damage type? [PCS check_protect_prayer] */
  function isProtected(active, type) {
    const want = (type === TYPE.RANGED) ? 'ranged' : (type === TYPE.MAGIC) ? 'magic' : 'melee';
    for (const id of asList(active)) { const d = PRAYERS[id]; if (d && d.protect === want) return true; }
    return false;
  }
  /** the prayer ids a newly activated prayer switches off (same group) */
  function prayerConflicts(id) {
    const d = PRAYERS[id]; if (!d || !d.group) return [];
    return Object.keys(PRAYERS).filter((k) => k !== id && PRAYERS[k].group === d.group);
  }
  function prayerDrainEffect(active) { let t = 0; for (const id of asList(active)) t += (PRAYERS[id] ? PRAYERS[id].drain : 0); return t; }
  /** drain resistance = 60 + 2 * prayer bonus (data/src/scripts/player/scripts/equip.rs2) */
  function prayerDrainResistance(prayerBonus) { return 60 + 2 * n(prayerBonus); }
  const PRAYER_DRAIN_INTERVAL = 5;   // [PR] settimer(prayer_drain, 5)
  /**
   * One firing of the prayer_drain timer [PR]:
   *   counter += effect * 5; if counter >= max(resistance, 60): points -= floor(counter / resistance),
   *   counter -= resistance * that.
   * Returns {counter, drained}.
   */
  function prayerDrainTick(counter, effect, resistance) {
    let c = effect * 5 + Math.max(counter, 0);
    let drained = 0;
    if (c >= Math.max(resistance, 60)) {
      drained = Math.floor(c / resistance);
      c -= resistance * drained;
    }
    return { counter: c, drained };
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Core formulas [C]                                                                           */
  /* ------------------------------------------------------------------------------------------ */
  /** combat_effective_stat: floor(level * max(100, pct) / 100) */
  function effectiveLevel(level, pct) { return Math.floor(level * Math.max(100, pct == null ? 100 : pct) / 100); }
  /** combat_stat: effective * (bonus + 64) */
  function roll(effective, bonus) { return effective * (bonus + 64); }
  /** combat_maxhit: floor((strengthRoll + 320) / 640) */
  function maxHitFromRoll(strengthRoll) { return Math.floor((strengthRoll + 320) / 640); }
  /** the hit check: randominc(attack) > randominc(defence) [PC player_npc_hit_roll] */
  function hitRoll(rng, attackRoll, defenceRoll) {
    const a = rng.randomInc(attackRoll);
    const d = rng.randomInc(defenceRoll);
    return a > d;
  }
  /** damage on a successful roll: randominc(max) */
  function damageRoll(rng, maxHit) { return rng.randomInc(Math.max(0, maxHit)); }
  /** exact probability of a successful hit roll, for UI/appraisal (not used by the server) */
  function hitChance(attackRoll, defenceRoll) {
    const A = attackRoll + 1, D = defenceRoll + 1;       // uniform 0..atk, 0..def
    let wins = 0;                                         // count pairs a > d
    if (attackRoll <= defenceRoll) wins = attackRoll * (attackRoll + 1) / 2;
    else wins = D * (D - 1) / 2 + (A - D) * D;
    return wins / (A * D);
  }

  /**
   * Player combat numbers — a port of the player_combat_stat proc [PCS].
   * @param p.levels   current levels {attack, strength, defence, ranged, magic}
   * @param p.bonuses  equipmentBonuses(...)
   * @param p.prayers  active prayer ids (array or Set)
   * @param p.style    {style, type} from styleFor()
   */
  function playerCombatStats(p) {
    const L = p.levels, b = p.bonuses || zeroBonuses();
    const pct = prayerPercents(p.prayers);
    const sb = STYLE_BONUS[(p.style && p.style.style) || 'accurate'] || STYLE_BONUS.accurate;
    const baseAtt = effectiveLevel(L.attack, pct.att);
    const baseStr = effectiveLevel(L.strength, pct.str);
    const baseDef = effectiveLevel(L.defence, pct.def);
    const baseMag = effectiveLevel(L.magic, pct.mag);   // 2004: no magic prayers (pct 100)
    const baseRng = effectiveLevel(L.ranged, pct.rng);  // 2004: no ranged prayers (pct 100)
    // magic defence blends magic and defence BEFORE the +8 / style bonus [PCS]
    const baseMagDef = Math.floor((7 * baseMag + 3 * baseDef) / 10);
    const effAttack = baseAtt + 8 + sb.att;
    const effStrength = baseStr + 8 + sb.str;
    const effDefence = baseDef + 8 + sb.def;
    const effRanged = baseRng + 8 + sb.rng;
    const effMagic = baseMag + 8 + 1;          // magic always has a style bonus of 1 [PCS]
    const effMagicDefence = baseMagDef + 8;   // no style bonus
    const attackRoll = {
      stab: roll(effAttack, b.stab), slash: roll(effAttack, b.slash), crush: roll(effAttack, b.crush),
      ranged: roll(effRanged, b.ranged), magic: roll(effMagic, b.magic),
    };
    const defenceRoll = {
      stab: roll(effDefence, b.dStab), slash: roll(effDefence, b.dSlash), crush: roll(effDefence, b.dCrush),
      ranged: roll(effDefence, b.dRanged), magic: roll(effMagicDefence, b.dMagic),
    };
    const meleeMaxHit = maxHitFromRoll(roll(effStrength, b.str));
    const rangedMaxHit = maxHitFromRoll(roll(effRanged, b.rStr));   // ranged uses RANGED strength
    const type = p.style && p.style.type;
    return {
      effAttack, effStrength, effDefence, effRanged, effMagic, effMagicDefence,
      attackRoll, defenceRoll, meleeMaxHit, rangedMaxHit,
      maxHit: type === TYPE.RANGED ? rangedMaxHit : meleeMaxHit,
    };
  }

  /* ------------------------------------------------------------------------------------------ */
  /* NPC formulas [NPC]                                                                          */
  /* ------------------------------------------------------------------------------------------ */
  /* NPCs are "essentially always on controlled": effective = level + 9 (8 + style bonus 1), no
   * prayer. Our NPC data has no magic/ranged levels; fallbacks (documented deviation):
   *   magic level for ATTACK = mag ?? att, for DEFENCE = mag ?? def; ranged level = rng ?? att;
   *   defence bonus vs ranged/magic = dRanged/dMagic ?? dBonus; ranged/magic attack bonus = aBonus. */
  function npcLevels(def) {
    return { attack: def.att | 0, strength: def.str | 0, defence: def.def | 0, hitpoints: def.hp | 0,
      ranged: (def.rng != null ? def.rng : def.att) | 0, magic: def.mag != null ? def.mag | 0 : null };
  }
  /** the damage type an NPC deals: its magic/ranged kind, else its melee attack type (default crush) */
  function npcAttackType(def) {
    if (def.ranged === 'arrow') return TYPE.RANGED;
    if (def.ranged) return TYPE.MAGIC;
    return MELEE_TYPES.indexOf(def.atype) >= 0 ? def.atype : TYPE.CRUSH;
  }
  function npcDefenceBonus(def, type) {
    switch (type) {
      case TYPE.STAB: return pick(def.dStab, def.dBonus);
      case TYPE.SLASH: return pick(def.dSlash, def.dBonus);
      case TYPE.CRUSH: return pick(def.dCrush, def.dBonus);
      case TYPE.RANGED: return pick(def.dRanged, def.dBonus);
      case TYPE.MAGIC: return pick(def.dMagic, def.dBonus);
    }
    return n(def.dBonus);
  }
  /** npc_defence_roll_specific: (effective(def or magic) + 9) * (bonus + 64) */
  function npcDefenceRoll(def, levels, type) {
    const lv = type === TYPE.MAGIC ? (levels.magic != null ? levels.magic : levels.defence) : levels.defence;
    return roll(effectiveLevel(lv, 100) + 9, npcDefenceBonus(def, type));
  }
  /** npc attack roll for its own attack type; 0 when the player prays against it (NPC protection is total) */
  function npcAttackRoll(def, levels, targetPrayers) {
    const type = npcAttackType(def);
    if (isProtected(targetPrayers, type)) return 0;
    const lv = type === TYPE.RANGED ? levels.ranged : type === TYPE.MAGIC ? (levels.magic != null ? levels.magic : levels.attack) : levels.attack;
    const bonus = type === TYPE.MAGIC ? pick(def.magicAttack, def.aBonus) : n(def.aBonus);
    return roll(effectiveLevel(lv, 100) + 9, bonus);
  }
  /** npc max hit: floor(((str + 9) * (sBonus + 64) + 320) / 640) (ranged npcs use their ranged level) */
  function npcMaxHit(def, levels) {
    if (def.maxHit != null) return def.maxHit | 0;
    const type = npcAttackType(def);
    const lv = type === TYPE.RANGED ? levels.ranged : levels.strength;
    return maxHitFromRoll(roll(effectiveLevel(lv, 100) + 9, n(def.sBonus)));
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Protection prayers                                                                          */
  /* ------------------------------------------------------------------------------------------ */
  /** vs players: the max hit is cut by 40% — scale(6, 10, maxhit) [PVP] */
  function pvpProtectedMaxHit(maxHit) { return Math.floor(maxHit * 6 / 10); }

  /* ------------------------------------------------------------------------------------------ */
  /* Timing (all in 600 ms ticks)                                                                */
  /* ------------------------------------------------------------------------------------------ */
  const DEFAULT_ATTACK_RATE = 4;   // unarmed [PM]
  const MAGIC_ATTACK_RATE = 5;     // %action_delay = map_clock + 5 on every cast [PM]
  const SINGLE_COMBAT_TICKS = 8;   // add(%lastcombat, 8) > map_clock [PC]
  /** weapon attack rate (ticks); magic casts are always 5; rapid is one tick faster [PM] */
  function attackDelay(weaponDef, styleName, isMagic) {
    if (isMagic) return MAGIC_ATTACK_RATE;
    let d = weaponDef && weaponDef.speedTicks > 0 ? weaponDef.speedTicks | 0 : DEFAULT_ATTACK_RATE;
    if (styleName === STYLE.RANGED_RAPID) d -= 1;
    return d;
  }
  /** auto-retaliate "flinch": action delay becomes clock + floor(rate / 2) (rapid -1) [AR] */
  function retaliateDelay(weaponDef, styleName) {
    const rate = weaponDef && weaponDef.speedTicks > 0 ? weaponDef.speedTicks | 0 : DEFAULT_ATTACK_RATE;
    let d = Math.floor(rate / 2);
    if (styleName === STYLE.RANGED_RAPID) d -= 1;
    return d;
  }
  /** npc flinch: npc_action_delay = clock + floor(attackrate / 2) [NPC npc_default_retaliate] */
  function npcRetaliateDelay(npcDef) { return Math.floor(((npcDef && npcDef.speedTicks) || DEFAULT_ATTACK_RATE) / 2); }

  /* Projectile durations in client cycles (20 ms; 30 per tick) [PJ]: duration = delay + length + step*dist.
   *   arrows/bolts: delay 41, length 5, step 5   thrown: delay 32, length 0, step 5
   *   combat spells: delay 51, length -5, step 10 (magic_combat_spells.dbrow spotanim_proj) */
  function arrowDuration(dist) { return 41 + 5 + 5 * dist; }
  function thrownDuration(dist) { return 32 + 0 + 5 * dist; }
  function spellDuration(dist) { return 51 - 5 + 10 * dist; }
  /** queue delay for a player's ranged hit: (duration + 30) / 30 [PM player_ranged / PVP pvp_ranged] */
  function rangedHitDelay(dist, thrown) { return Math.floor(((thrown ? thrownDuration(dist) : arrowDuration(dist)) + 30) / 30); }
  /** queue delay for a player's spell hit: duration / 30 + 1 (the extra osrs tick) [PM/PVP] */
  function magicHitDelay(dist) { return Math.floor(spellDuration(dist) / 30) + 1; }
  /** queue delay for an npc's ranged hit on a player: duration / 30 with the thrown curve [NPC npc_rangeattack] */
  function npcRangedHitDelay(dist) { return Math.floor(thrownDuration(dist) / 30); }
  /** queue delay for an npc's spell on a player: duration / 30, no extra tick [NPC npc_spell_success] */
  function npcMagicHitDelay(dist) { return Math.floor(spellDuration(dist) / 30); }

  /** attack range in tiles [PC player_attackrange]: autocast 10; weapon range (+2 longrange), cap 10; melee 0 */
  function attackRange(weaponDef, styleName, autocasting) {
    if (autocasting) return 10;
    if (!weaponDef) return 0;
    let r = 0;
    if (weaponDef.attackRange != null) r = weaponDef.attackRange | 0;
    else if (weaponDef.style === 'ranged') r = weaponDef.model === 'longbow' ? 10 : 7;
    r = Math.min(r, 10);
    if (styleName === STYLE.RANGED_LONGRANGE) r = Math.min(r + 2, 10);
    return r;
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Combat level [CL] — integer form                                                            */
  /* ------------------------------------------------------------------------------------------ */
  /** floor((10*(def + hp + floor(pray/2)) + max(13*(att+str), 13*floor(3*rng/2), 13*floor(3*mag/2))) / 40) */
  function combatLevel(base) {
    const b = 10 * (base.defence + base.hitpoints + Math.floor(base.prayer / 2));
    const melee = 13 * (base.attack + base.strength);
    const ranged = 13 * Math.floor(3 * base.ranged / 2);
    const magic = 13 * Math.floor(3 * base.magic / 2);
    return Math.floor((b + Math.max(melee, ranged, magic)) / 40);
  }

  /* ------------------------------------------------------------------------------------------ */
  /* Experience [C give_combat_experience] — returned in TENTHS                                  */
  /* ------------------------------------------------------------------------------------------ */
  const scale = (num, den, v) => Math.floor(v * num / den);   // RuneScript scale(a, b, v) = v*a/b
  /**
   * xp for dealing `damage` with a damage style. multiplier is per-mille (1000 = normal; pvp uses
   * pvpXpMultiplier). Returns {Attack: xp10, ...}.
   */
  function combatXp(damageStyle, damage, multiplier) {
    const m = multiplier == null ? 1000 : multiplier;
    const base = damage * 10;
    const x = (pctOfBase) => scale(m, 1000, scale(pctOfBase, 100, base));
    const out = {};
    switch (damageStyle) {
      case STYLE.ACCURATE: out.Attack = x(400); break;
      case STYLE.AGGRESSIVE: out.Strength = x(400); break;
      case STYLE.DEFENSIVE: out.Defence = x(400); break;
      case STYLE.CONTROLLED: out.Attack = x(133); out.Strength = x(133); out.Defence = x(133); break;
      case STYLE.RANGED_ACCURATE: case STYLE.RANGED_RAPID: out.Ranged = x(400); break;
      case STYLE.RANGED_LONGRANGE: out.Ranged = x(200); out.Defence = x(200); break;
      case STYLE.MAGIC_NORMAL: out.Magic = x(200); break;
      case STYLE.MAGIC_DEFENSIVE: out.Magic = x(133); out.Defence = x(100); break;
      default: return out;
    }
    out.Hitpoints = x(133);
    return out;
  }
  /** pvp bonus xp: min(1125, 1000 + floor(floor(cb/20) * 1000 / 40)) per-mille [PVP pvp_xp_multiplier] */
  function pvpXpMultiplier(targetCombatLevel) {
    return Math.min(1125, 1000 + Math.floor(Math.floor(targetCombatLevel / 20) * 1000 / 40));
  }
  /** a spell's cast xp (given hit or splash) in tenths; our spells carry baseXp in whole xp */
  function spellXp10(spell) { return Math.round(n(spell && spell.baseXp) * 10); }
  /** casting on the "defensive" melee style gives magic+defence xp [PM pvm_spell_success] */
  function magicDamageStyle(selectedStyleName) { return selectedStyleName === STYLE.DEFENSIVE ? STYLE.MAGIC_DEFENSIVE : STYLE.MAGIC_NORMAL; }

  /* ------------------------------------------------------------------------------------------ */
  /* Eating [EAT]                                                                                */
  /* ------------------------------------------------------------------------------------------ */
  const EAT_DELAY = 2;         // %eat_delay = clock + 2 (next bite 3 ticks later)
  const EAT_ATTACK_DELAY = 3;  // %action_delay = %action_delay + 3 (added to the stored clock, 2004 quirk)
  /** can the player eat this tick? (if %eat_delay >= map_clock the bite is ignored) */
  function canEat(eatDelay, clock) { return !(eatDelay >= clock); }
  /** apply a bite's timers: returns {eatDelay, actionDelay} */
  function applyEat(state, clock) { return { eatDelay: clock + EAT_DELAY, actionDelay: state.actionDelay + EAT_ATTACK_DELAY }; }

  /* ------------------------------------------------------------------------------------------ */
  /* Special attack hook (our design; 2004 had none)                                             */
  /* ------------------------------------------------------------------------------------------ */
  /** spec = {acc, dmg} multipliers (client SPECIALS use the same field names). */
  function applySpecial(spec, attackRollValue, maxHit) {
    if (!spec) return { attackRoll: attackRollValue, maxHit };
    return { attackRoll: Math.floor(attackRollValue * (spec.acc || 1)), maxHit: Math.floor(maxHit * (spec.dmg || 1)) };
  }

  return {
    TYPE, MELEE_TYPES, STYLE, STYLE_BONUS, CATEGORY_STYLES, TEMPLATE_CATEGORY, MODEL_CATEGORY,
    weaponCategory, stylesFor, styleFor,
    zeroBonuses, itemBonuses, equipmentBonuses,
    PRAYERS, prayerPercents, isProtected, prayerConflicts, prayerDrainEffect, prayerDrainResistance,
    PRAYER_DRAIN_INTERVAL, prayerDrainTick,
    effectiveLevel, roll, maxHitFromRoll, hitRoll, damageRoll, hitChance,
    playerCombatStats,
    npcLevels, npcAttackType, npcDefenceBonus, npcDefenceRoll, npcAttackRoll, npcMaxHit,
    pvpProtectedMaxHit,
    DEFAULT_ATTACK_RATE, MAGIC_ATTACK_RATE, SINGLE_COMBAT_TICKS,
    attackDelay, retaliateDelay, npcRetaliateDelay,
    arrowDuration, thrownDuration, spellDuration, rangedHitDelay, magicHitDelay, npcRangedHitDelay, npcMagicHitDelay,
    attackRange, combatLevel, combatXp, pvpXpMultiplier, spellXp10, magicDamageStyle,
    EAT_DELAY, EAT_ATTACK_DELAY, canEat, applyEat, applySpecial,
  };
});
