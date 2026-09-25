'use strict';
/* ============ combat — who hits whom, when, for how much ============
 * The server-side combat flow, ported step by step from Lost City's 2004 content scripts (MIT;
 * rules only, our own text). Verified 2026-09-25 against data/src/scripts/skill_combat/scripts/:
 *   player/player_combat.rs2   player_in_combat_check (single-way), dispatch ranged > autocast > melee
 *   player/player_melee.rs2    melee vs npc: hit roll, xp capped by npc hp, npc_retaliate(0), npc_queue(2,dmg,0)
 *   player/player_ranged.rs2   rate first, ammo, roll, npc hit delay (dur+30)/30, 4/5 arrows drop
 *   player/player_magic.rs2    runes + cast xp, rate 5, hit delay dur/30+1, splash = instant retaliation
 *   pvp/pvp_combat.rs2         pvp_is_attackable, pvp_hit_roll, .pvp_damage (logout lock 16), xp multiplier
 *   pvp/pvp_melee.rs2, pvp_ranged.rs2 (delay dur/30, no +30), pvp_magic.rs2 (dur/30+1)
 *   pvp/pk_skull.rs2           set_pk_vars on every attack
 *   player/auto_retaliate.rs2  pvp_retaliate / playerhit_n_retaliate
 *   npc/npc_combat.rs2         npc_default_retaliate, npc_default_damage, npc_check_notcombat(_self)
 *   npc/npc_combat_melee.rs2, npc_combat_ranged.rs2, npc_combat_magic.rs2
 *   ../../player/scripts/damage.rs2 + death.rs2   damage_self, player death
 * Numbers come from shared/combat.js and shared/pvp.js so client and server agree.
 */
const C = require('../../shared/combat.js');
const PVP = require('../../shared/pvp.js');
const D = require('../../shared/drops.js');
const coord = require('./coord');

const CONTINUE = true, STOP = false;
const DEATH_TICKS = 4;   // player_death: p_delay(1) ... p_delay(3) before items drop and the respawn

/* ============================================================================================ */
/* helpers                                                                                       */
/* ============================================================================================ */
function isNpc(e) { return e && e.nid != null; }
function magicRunesOk(p, spell) {
  const staff = p.weapon();
  const provides = staff && staff.provides;
  for (const r in spell.runes || {}) { if (provides === r) continue; if (p.invCount(r) < spell.runes[r]) return false; }
  return true;
}
function spendRunes(p, spell) {
  const staff = p.weapon(); const provides = staff && staff.provides;
  for (const r in spell.runes || {}) { if (provides === r) continue; p.invRemove(r, spell.runes[r]); }
}
/** 2004 check_spell_requirements: level and runes */
function spellRequirements(p, spellId) {
  const sp = p.world.content.SPELLS[spellId];
  if (!sp || sp.max == null || sp.utility) return { ok: false, text: 'You cannot cast that on anyone.' };
  if (p.base('Magic') < sp.req) return { ok: false, text: `You need a Magic level of ${sp.req} to cast this spell.` };
  if (!magicRunesOk(p, sp)) return { ok: false, text: 'You do not have enough runes to cast this spell.' };
  return { ok: true, spell: sp };
}
/** ranged ammo comes from the pack, as in the current client (the 2004 quiver slot is a W2 option) */
function findAmmo(p, weapon) {
  const need = weapon && weapon.needs;
  if (!need) return { id: null };
  return p.invCount(need) > 0 ? { id: need } : null;
}
function useAmmo(p, ammo) { p.invRemove(ammo.id, 1); }
/** 4 in 5 arrows land under the target (^dropammo_chance = 5), unless the tile is blocked */
function dropAmmo(w, p, ammoId, target, delayTicks) {
  if (!ammoId) return;
  if (w.rng.random(5) === 0) return;
  if (!w.collision.isWalkable(target.x, target.z, target.level)) return;
  const x = target.x, z = target.z, level = target.level;
  w.schedule(Math.max(0, delayTicks), () => w.addObj(ammoId, 1, x, z, level, p.key));
}
/** send a projectile to clients so the visual lands with the server's hit */
function projectile(w, from, to, kind, extra, delayTicks) {
  w.broadcastFx(from, Object.assign({ k: kind, from: fxRef(from), to: fxRef(to), d: delayTicks }, extra || {}));
}
function fxRef(e) { return isNpc(e) ? ['n', e.nid] : ['p', e.pid]; }

function giveXp(p, table) { for (const sk in table) p.addXp(sk, table[sk]); }
function maybeSpecial(p, attackRoll, maxHit) {
  if (!p.specArmed) return { attackRoll, maxHit, spec: null };
  const w = p.weapon(); const spec = w && p.world.content.SPECIALS[w.model];
  p.specArmed = false; p.out.settingsDirty = true;
  if (!spec || p.specEnergy < spec.cost) return { attackRoll, maxHit, spec: null };
  p.specEnergy -= spec.cost;
  const r = C.applySpecial(spec, attackRoll, maxHit);
  return { attackRoll: r.attackRoll, maxHit: r.maxHit, spec };
}

/* ============================================================================================ */
/* player -> anything                                                                            */
/* ============================================================================================ */
/** called every tick the player is in reach of an 'attack' target; returns true to keep fighting */
function playerAttack(w, p, target) {
  if (p.hp <= 0) return STOP;                      // no blows from the grave (our guard)
  return isNpc(target) ? attackNpc(w, p, target) : attackPlayer(w, p, target);
}
/** a manual cast on a target ('cast' op); continues only when it is also the autocast spell */
function playerCast(w, p, target, spellId) {
  if (p.hp <= 0) return STOP;
  if (isNpc(target)) {
    if (!npcAttackable(p, target)) return STOP;
    return magicOnNpc(w, p, target, spellId, false);
  }
  if (!pvpAttackable(w, p, target)) return STOP;
  return magicOnPlayer(w, p, target, spellId, false);
}

/* ---------------------------------------------------------------------------------------------- */
/* player vs npc                                                                                   */
/* ---------------------------------------------------------------------------------------------- */
function npcAttackable(p, npc) {
  if (!npc.active || npc.dying) return false;
  if (npc.def.attackable === false) { p.message('You cannot attack that.'); return false; }
  return true;
}
/** player_in_combat_check: single-way rules unless the npc stands in a multi-combat area */
function pvmInCombatCheck(w, p, npc) {
  const tick = w.tick;
  if (w.isMulti(npc.x, npc.z)) return true;
  if (p.lastCombatPvp + C.SINGLE_COMBAT_TICKS > tick) { p.message('You are already under attack!'); return false; }
  if (p.lastCombat + C.SINGLE_COMBAT_TICKS > tick && p.aggressiveNpc && p.aggressiveNpc !== npc) { p.message('You are already under attack!'); return false; }
  if (npc.lastCombat + C.SINGLE_COMBAT_TICKS > tick && npc.aggressivePlayer !== p) { p.message('Someone else is fighting that.'); return false; }
  return true;
}
/** npc_retaliate($delay): queue the npc's retaliation and mark who is fighting it */
function npcRetaliate(w, npc, p, delay) {
  npc.queue.add('retaliate', delay, () => npcDefaultRetaliate(w, npc));
  npc.aggressivePlayer = p;
  if (npc.lastCombat < w.tick) npc.lastCombat = w.tick;
}

function attackNpc(w, p, npc) {
  if (!npcAttackable(p, npc)) return STOP;
  if (!pvmInCombatCheck(w, p, npc)) return STOP;
  const st = p.style();
  if (st.type === 'ranged') return rangedOnNpc(w, p, npc);
  if (p.autocastSpell()) return magicOnNpc(w, p, npc, p.autocast, true);
  return meleeOnNpc(w, p, npc);
}

function meleeOnNpc(w, p, npc) {
  if (p.actionDelay > w.tick) return CONTINUE;
  if (npc.hp === 0) return STOP;
  const { stats, style } = p.combatStats();
  let damage = 0;
  const sp = maybeSpecial(p, stats.attackRoll[style.type], stats.maxHit);
  if (C.hitRoll(w.rng, sp.attackRoll, C.npcDefenceRoll(npc.def, npc.levels, style.type))) {
    damage = C.damageRoll(w.rng, Math.min(sp.maxHit, npc.def.maxDealt != null ? npc.def.maxDealt : sp.maxHit));
    const capped = Math.min(damage, npc.hp);
    giveXp(p, C.combatXp(style.style, capped));
    npc.addHeroPoints(p.key, capped);
  }
  p.setAnim('attack', { type: style.type, spec: sp.spec ? 1 : undefined });
  npcRetaliate(w, npc, p, 0);
  const dmg = damage;
  npc.queue.add('damage', 0, () => npcDamage(w, npc, dmg));
  npc.setAnim('defend');
  p.actionDelay = w.tick + C.attackDelay(p.weapon(), style.style, false);
  return CONTINUE;
}

function rangedOnNpc(w, p, npc) {
  if (p.actionDelay > w.tick) return CONTINUE;
  if (npc.hp === 0) return STOP;
  const weapon = p.weapon();
  const { stats, style } = p.combatStats();
  p.actionDelay = w.tick + C.attackDelay(weapon, style.style, false);
  const ammo = findAmmo(p, weapon);
  if (!ammo) { p.message('There is no ammo left in your quiver.'); return STOP; }
  let damage = 0;
  const sp = maybeSpecial(p, stats.attackRoll.ranged, stats.maxHit);
  if (C.hitRoll(w.rng, sp.attackRoll, C.npcDefenceRoll(npc.def, npc.levels, 'ranged'))) {
    damage = C.damageRoll(w.rng, sp.maxHit);
    const capped = Math.min(damage, npc.hp);
    giveXp(p, C.combatXp(style.style, capped));
    npc.addHeroPoints(p.key, capped);
  }
  if (ammo.id) useAmmo(p, ammo);
  const dist = coord.distanceTo(npc, p);
  const delay = C.rangedHitDelay(dist);
  dropAmmo(w, p, ammo.id, npc, Math.floor(C.arrowDuration(dist) / 30));
  p.setAnim('attack', { type: 'ranged' });
  projectile(w, p, npc, 'arrow', null, delay);
  npcRetaliate(w, npc, p, delay);
  const dmg = damage;
  npc.queue.add('damage', delay, () => npcDamage(w, npc, dmg));
  return CONTINUE;
}

function magicOnNpc(w, p, npc, spellId, fromAutocast) {
  // pvm_combat_spell_checks: wait for the clock, then requirements, then single-way, then attackable
  if (w.tick < p.actionDelay) return CONTINUE;
  const req = spellRequirements(p, spellId);
  if (!req.ok) { p.message(req.text); if (fromAutocast && p.autocast === spellId) resetAutocast(p); return STOP; }
  if (!pvmInCombatCheck(w, p, npc)) return STOP;
  if (!npcAttackable(p, npc)) return STOP;
  const spell = req.spell;
  spendRunes(p, spell);
  p.addXp('Magic', C.spellXp10(spell));
  p.actionDelay = w.tick + C.MAGIC_ATTACK_RATE;
  const dist = coord.distanceTo(npc, p);
  const delay = C.magicHitDelay(dist);
  p.setAnim('cast', { spell: spellId });
  const { stats } = p.combatStats();
  if (C.hitRoll(w.rng, stats.attackRoll.magic, C.npcDefenceRoll(npc.def, npc.levels, 'magic'))) {
    const damage = C.damageRoll(w.rng, Math.min(spell.max, npc.def.maxDealt != null ? npc.def.maxDealt : spell.max));
    npcRetaliate(w, npc, p, delay);
    npc.queue.add('damage', delay, () => npcDamage(w, npc, damage));
    const capped = Math.min(damage, npc.hp);
    giveXp(p, C.combatXp(C.magicDamageStyle(p.style().style), capped));
    npc.addHeroPoints(p.key, capped);
    projectile(w, p, npc, 'spell', { sp: spellId }, delay);
  } else {
    projectile(w, p, npc, 'spell', { sp: spellId, splash: 1 }, delay);
    npcRetaliate(w, npc, p, 0);   // splashing draws instant retaliation
  }
  return fromAutocast || p.autocastSpell() === spellId ? CONTINUE : STOP;
}

function resetAutocast(p) { p.autocast = null; p.out.settingsDirty = true; }

/* ---------------------------------------------------------------------------------------------- */
/* player vs player                                                                               */
/* ---------------------------------------------------------------------------------------------- */
/** pvp_is_attackable: wilderness level range, then single-way; checked on every attempt */
function pvpAttackable(w, p, t) {
  if (!t.active || t.dead) return false;
  const res = PVP.canAttack(p.pvpRecord(), t.pvpRecord(), w.tick, { targetInMulti: t.inMulti() });
  if (!res.ok) { p.message(PVP.REASON_TEXT[res.reason] || 'You cannot attack them.'); return false; }
  return true;
}
/** set_pk_vars: skull + attacker history; also refreshes the head icons */
function pkVars(w, p, t) {
  const a = { id: p.key, preys: p.preys, predators: p.predators, skullUntil: p.skullUntil };
  const b = { id: t.key, preys: t.preys, predators: t.predators, lastCombat: t.lastCombat, lastCombatPvp: t.lastCombatPvp, aggressiveNpc: t.aggressiveNpc };
  const r = PVP.recordAttack(a, b, w.tick);
  if (r.skulled && !p.isSkulled()) { p.infoChanged = true; p.message('A skull now hangs over your head.', 'combat'); }
  p.preys = a.preys; p.skullUntil = a.skullUntil; p.out.selfDirty = true;
  t.predators = b.predators; t.lastCombat = b.lastCombat; t.lastCombatPvp = b.lastCombatPvp; t.aggressiveNpc = null;
}
/** .pvp_damage($delay, $damage): lock the target's logout now, queue the hit */
function pvpDamage(w, attacker, t, delay, damage) {
  t.preventLogoutUntil = PVP.logoutLockUntil(w.tick);
  if (damage < 0) return;
  t.queue.add('pvp_damage', delay, () => damageSelf(w, t, damage, attacker));
}
function pvpRetaliateQueue(w, attacker, t, delay) {
  t.queue.add('pvp_retaliate', delay, () => {
    t.preventLogoutUntil = PVP.logoutLockUntil(w.tick);
    autoRetaliate(w, t, attacker);
  });
}

function attackPlayer(w, p, t) {
  if (!pvpAttackable(w, p, t)) return STOP;
  const st = p.style();
  if (st.type === 'ranged') return rangedOnPlayer(w, p, t);
  if (p.autocastSpell()) return magicOnPlayer(w, p, t, p.autocast, true);
  return meleeOnPlayer(w, p, t);
}

function meleeOnPlayer(w, p, t) {
  if (t.dead) return STOP;
  if (p.actionDelay > w.tick) return CONTINUE;
  pkVars(w, p, t);
  const { stats, style } = p.combatStats();
  p.actionDelay = w.tick + C.attackDelay(p.weapon(), style.style, false);
  let damage = 0;
  const sp = maybeSpecial(p, stats.attackRoll[style.type], stats.maxHit);
  if (C.hitRoll(w.rng, sp.attackRoll, t.combatStats().stats.defenceRoll[style.type])) {
    let max = sp.maxHit;
    if (C.isProtected(t.prayers, style.type)) max = C.pvpProtectedMaxHit(max);
    damage = Math.min(C.damageRoll(w.rng, max), t.hp);
    giveXp(p, C.combatXp(style.style, damage, C.pvpXpMultiplier(t.combatLevel())));
    t.addHeroPoints(p.key, damage);
  }
  p.setAnim('attack', { type: style.type, spec: sp.spec ? 1 : undefined });
  pvpRetaliateQueue(w, p, t, 0);
  pvpDamage(w, p, t, 0, damage);
  t.setAnim('defend');
  return CONTINUE;
}

function rangedOnPlayer(w, p, t) {
  if (t.dead) return STOP;
  if (p.actionDelay > w.tick) return CONTINUE;
  const weapon = p.weapon();
  const { stats, style } = p.combatStats();
  p.actionDelay = w.tick + C.attackDelay(weapon, style.style, false);
  const ammo = findAmmo(p, weapon);
  if (!ammo) { p.message('There is no ammo left in your quiver.'); return STOP; }
  pkVars(w, p, t);
  let damage = 0;
  const sp = maybeSpecial(p, stats.attackRoll.ranged, stats.maxHit);
  if (C.hitRoll(w.rng, sp.attackRoll, t.combatStats().stats.defenceRoll.ranged)) {
    let max = sp.maxHit;
    if (C.isProtected(t.prayers, 'ranged')) max = C.pvpProtectedMaxHit(max);
    damage = Math.min(C.damageRoll(w.rng, max), t.hp);
    giveXp(p, C.combatXp(style.style, damage, C.pvpXpMultiplier(t.combatLevel())));
    t.addHeroPoints(p.key, damage);
  }
  if (ammo.id) useAmmo(p, ammo);
  const dur = C.arrowDuration(coord.distanceToSW(p, t));
  const delay = Math.floor(dur / 30);   // pvp: duration / 30 (no +30, unlike pvm)
  dropAmmo(w, p, ammo.id, t, delay);
  p.setAnim('attack', { type: 'ranged' });
  projectile(w, p, t, 'arrow', null, delay);
  pvpRetaliateQueue(w, p, t, delay);
  pvpDamage(w, p, t, delay, damage);
  return CONTINUE;
}

function magicOnPlayer(w, p, t, spellId, fromAutocast) {
  if (t.dead) return STOP;
  if (w.tick < p.actionDelay) return CONTINUE;
  const req = spellRequirements(p, spellId);
  if (!req.ok) { p.message(req.text); if (fromAutocast && p.autocast === spellId) resetAutocast(p); return STOP; }
  if (!pvpAttackable(w, p, t)) return STOP;
  const spell = req.spell;
  pkVars(w, p, t);                      // pvp_spell_cast: set_pk_vars first
  spendRunes(p, spell);
  p.addXp('Magic', C.spellXp10(spell));
  p.actionDelay = w.tick + C.MAGIC_ATTACK_RATE;
  const dur = C.spellDuration(coord.distanceToSW(p, t));
  const delay = Math.floor(dur / 30) + 1;
  p.setAnim('cast', { spell: spellId });
  const { stats } = p.combatStats();
  if (C.hitRoll(w.rng, stats.attackRoll.magic, t.combatStats().stats.defenceRoll.magic)) {
    let max = spell.max;
    if (C.isProtected(t.prayers, 'magic')) max = C.pvpProtectedMaxHit(max);
    const damage = Math.min(C.damageRoll(w.rng, max), t.hp);
    pvpDamage(w, p, t, delay, damage);
    giveXp(p, C.combatXp(C.magicDamageStyle(p.style().style), damage, C.pvpXpMultiplier(t.combatLevel())));
    t.addHeroPoints(p.key, damage);
    pvpRetaliateQueue(w, p, t, delay);
    projectile(w, p, t, 'spell', { sp: spellId }, delay);
  } else {
    projectile(w, p, t, 'spell', { sp: spellId, splash: 1 }, delay);
    pvpRetaliateQueue(w, p, t, 0);
  }
  return fromAutocast || p.autocastSpell() === spellId ? CONTINUE : STOP;
}

/* ============================================================================================ */
/* damage, retaliation, death                                                                    */
/* ============================================================================================ */
/** damage_self: apply a hit to a player; at 0 hitpoints the death queue starts */
function damageSelf(w, p, amount, source) {
  if (p.hp === 0 || p.dead) return;
  const dmg = Math.min(amount, p.hp);
  p.setLevel('Hitpoints', p.hp - dmg);
  p.addHit(dmg, dmg > 0 ? 'hit' : 'block');
  if (p.hp === 0) p.queue.add('death', 0, () => startPlayerDeath(w, p));
}
/** auto-retaliate for players (pvp_retaliate / playerhit_n_retaliate) */
function autoRetaliate(w, p, attacker) {
  if (!p.autoRetaliate || p.dead || !attacker || !attacker.active || attacker.dead || attacker.dying) return;
  if (p.busy2()) return;   // already doing something (interaction or walking): no auto-retaliate
  if (p.actionDelay < w.tick) {
    const st = p.style();
    p.actionDelay = w.tick + C.retaliateDelay(p.weapon(), st.style);
  }
  p.setInteraction(attacker, 'attack');
}

/** npc_default_retaliate */
function npcDefaultRetaliate(w, npc) {
  const p = npc.aggressivePlayer;
  if (!p || !p.active || p.dead || npc.dying) return;
  const ready = (npc.actionDelay + 8 < w.tick) || npc.mode !== 'attack';
  if (!ready) return;
  npc.actionDelay = w.tick + C.npcRetaliateDelay(npc.def);
  npc.attackingPlayer = p;
  npc.startAttacking(p);
}
/** npc_default_damage: apply a hit; queue death at 0 */
function npcDamage(w, npc, damage) {
  if (npc.hp === 0 || npc.dying || !npc.active) return;
  const dmg = Math.min(damage, npc.hp);
  npc.levels.hitpoints -= dmg;
  npc.addHit(dmg, damage > 0 ? 'hit' : 'block');
  if (npc.hp > 0) return;
  npc.queue.add('death', 0, () => startNpcDeath(w, npc));
}
/** npc_death: stop, fall, and one tick later vanish and drop the hero's loot */
function startNpcDeath(w, npc) {
  npc.dying = true;
  npc.mode = 'none';
  npc.target = null;
  npc.clearWaypoints();
  npc.setAnim('death');
  npc.removeAt = w.tick + 1;
  const p = npc.aggressivePlayer;
  if (p && p.active) p.lastCombat = -1000;   // "%lastcombat = null": other npcs may hunt them at once
}
/** the rest of npc death (World.finishNpcDeath calls this before removing the npc) */
function npcDeathDrops(w, npc) {
  const heroKey = npc.heroKey();
  const hero = heroKey ? w.playerByKey(heroKey) : null;
  if (!hero) return [];
  const table = w.content.DROP_TABLES[npc.typeId];
  const drops = D.roll(w.rng, table, w.content.SHARED_DROPS);
  for (const d of drops) w.addObj(d.id, d.qty, npc.x, npc.z, npc.level, hero.key);
  return drops;
}

/* ---------------------------------------------------------------------------------------------- */
/* npc -> player                                                                                   */
/* ---------------------------------------------------------------------------------------------- */
/** npc_check_notcombat: single-way lock of the player, checked at the NPC's tile */
function npcCheckNotCombat(w, npc, p) {
  if (w.isMulti(npc.x, npc.z)) return true;
  if (p.lastCombatPvp + C.SINGLE_COMBAT_TICKS > w.tick) return false;
  if (p.lastCombat + C.SINGLE_COMBAT_TICKS > w.tick && p.aggressiveNpc && p.aggressiveNpc !== npc) return false;
  return true;
}
function npcCheckNotCombatSelf(w, npc, p) {
  if (w.isMulti(npc.x, npc.z)) return true;
  if (npc.lastCombat + C.SINGLE_COMBAT_TICKS > w.tick && npc.aggressivePlayer && npc.aggressivePlayer !== p) return false;
  return true;
}
/** npc_set_attack_vars */
function npcSetAttackVars(w, npc, p) {
  p.lastCombat = w.tick;
  npc.attackingPlayer = p;
  p.aggressiveNpc = npc;
}
/** npc attack script: melee (npc_default_attack), ranged (npc_rangeattack), magic (npc_cast_spell) */
function npcAttack(w, npc, p) {
  if (p.dead) { npc.resetDefaults(); return; }
  if (npc.actionDelay > w.tick) return;
  if (!npcCheckNotCombat(w, npc, p)) { npc.resetDefaults(); return; }
  if (!npcCheckNotCombatSelf(w, npc, p)) return;
  const def = npc.def, type = npc.attackType;
  const atk = C.npcAttackRoll(def, npc.levels, p.prayers);
  const defRoll = p.combatStats().stats.defenceRoll[type];
  const max = C.npcMaxHit(def, npc.levels);
  const hit = C.hitRoll(w.rng, atk, defRoll);
  const damage = hit ? C.damageRoll(w.rng, max) : 0;
  const rate = def.speedTicks > 0 ? def.speedTicks : C.DEFAULT_ATTACK_RATE;
  npc.setAnim('attack', { type });
  if (def.harmless) { npcSetAttackVars(w, npc, p); npc.actionDelay = w.tick + rate; return; }
  if (type === 'ranged' || type === 'magic') {
    const dist = coord.distanceTo(npc, p);
    const delay = type === 'ranged' ? C.npcRangedHitDelay(dist) : C.npcMagicHitDelay(dist);
    npc.actionDelay = w.tick + rate;
    projectile(w, npc, p, type === 'ranged' ? 'arrow' : 'spell', type === 'magic' ? { splash: hit ? undefined : 1 } : null, delay);
    if (type === 'ranged' || hit) {
      p.queue.add('npc_damage', delay, () => { p.preventLogoutUntil = PVP.logoutLockUntil(w.tick); damageSelf(w, p, damage, npc); });
      p.queue.add('npc_retaliate', delay, () => autoRetaliate(w, p, npc));
    } else {
      p.queue.add('npc_retaliate', 0, () => autoRetaliate(w, p, npc));   // a splash draws retaliation at once
    }
    npcSetAttackVars(w, npc, p);
    return;
  }
  // melee: playerhit_n_melee
  npcSetAttackVars(w, npc, p);
  npc.actionDelay = w.tick + rate;
  if (npc.hp === 0) return;
  p.queue.add('npc_damage', 0, () => { p.preventLogoutUntil = PVP.logoutLockUntil(w.tick); damageSelf(w, p, damage, npc); });
  p.queue.add('npc_retaliate', 0, () => autoRetaliate(w, p, npc));
}

/* ---------------------------------------------------------------------------------------------- */
/* player death (death.rs2)                                                                        */
/* ---------------------------------------------------------------------------------------------- */
const COMBAT_QUEUES = ['npc_retaliate', 'npc_damage', 'pvp_damage', 'pvp_retaliate', 'death'];
function startPlayerDeath(w, p) {
  if (p.dead) return;
  p.dead = true;
  p.deathAt = w.tick + DEATH_TICKS;
  p.clearInteraction(); p.clearWaypoints();
  p.setAnim('death');
  p.queue.clear(COMBAT_QUEUES);   // combat_clearqueue
  p.message('Oh dear, you are dead!', 'combat');
}
/** runs from World.processPlayers when the death delay is over */
function finishPlayerDeath(w, p) {
  const heroKey = PVP.findHero(Array.from(p.heroPoints, ([key, points]) => ({ key, points })));
  const hero = heroKey ? w.playerByKey(heroKey) : null;
  const items = w.content.ITEMS;
  const kept = PVP.keptOnDeath(p.inv, p.equip, {
    skulled: p.isSkulled(), protectItem: p.prayers.has('protect_item'),
    valueOf: (id) => (items[id] && items[id].value) || 0,
    destroyOnDeath: (id) => !!(items[id] && items[id].destroyOnDeath),
    stackable: (id) => !!(items[id] && items[id].stack),
  });
  const owner = hero ? hero.key : p.key;   // pvp: the killer's pile; otherwise the dead player's own
  const x = p.x, z = p.z, level = p.level;
  const dropped = [];
  for (const s of kept.lostInv) if (s && s.qty > 0) { w.addObj(s.id, s.qty, x, z, level, owner); dropped.push([s.id, s.qty]); }
  for (const slot in kept.lostEquip) { w.addObj(kept.lostEquip[slot], 1, x, z, level, owner); dropped.push([kept.lostEquip[slot], 1]); }
  // bones: the killer's in pvp (.obj_add), public otherwise (obj_addall)
  if (items.bones) w.addObj('bones', 1, x, z, level, hero ? hero.key : null);
  // what the player keeps goes back into a clean inventory
  p.inv.fill(null);
  for (const sl in p.equip) p.equip[sl] = null;
  for (const k of kept.kept) p.invAdd(k.id, k.qty);
  if (hero) {
    hero.message(`You have defeated ${p.name}.`, 'combat');
    w.log('pvp_kill', { killer: hero.key, victim: p.key, x, z, dropped });
  }
  // respawn: stats back to base, full energy, no skull, prayers off
  const r = w.respawnPoint();
  p.teleport(r.x, r.z, r.level);
  for (const sk of w.content.SKILLS) p.setLevel(sk, p.base(sk));
  p.runEnergy = 10000;
  p.skullUntil = 0;
  p.prayers.clear(); p.prayerCounter = 0; p.clearTimer('prayer_drain'); p.out.prayersDirty = true;
  p.heroPoints.clear();
  p.predators = []; p.preys = [];
  p.aggressiveNpc = null; p.lastCombat = -1000; p.lastCombatPvp = -1000;
  p.actionDelay = 0; p.eatDelay = 0;
  p.queue.clear(COMBAT_QUEUES);
  p.dead = false; p.deathAt = -1;
  p.appearanceVersion++;
  p.out.invDirty = true; p.out.equipDirty = true; p.out.selfDirty = true; p.out.settingsDirty = true;
  p.invalidate();
  p.message('You wake in the Commons.', 'combat');
  w.log('death', { key: p.key, hero: heroKey, kept: kept.kept });
}

module.exports = {
  playerAttack, playerCast, npcAttack, npcDamage, npcDeathDrops, finishPlayerDeath, damageSelf, autoRetaliate,
  spellRequirements, DEATH_TICKS,
};
