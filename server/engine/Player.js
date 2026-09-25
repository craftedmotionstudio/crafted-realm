'use strict';
/* ============ Player — a logged-in adventurer ============
 * The per-tick processing order and interaction model are ported from the Lost City engine (MIT),
 * src/engine/entity/Player.ts (verified 2026-09-25):
 *   processQueues -> processTimers -> processInteraction (try op before moving, recalc path, move,
 *   try again after moving, "I can't reach that" when stuck) -> updateEnergy.
 * Stats are stored as experience in tenths (see shared/xp.js) plus a current level per skill
 * (current hitpoints are the current Hitpoints level; prayer points are the current Prayer level,
 * as in 2004).
 */
const { PathingEntity, EntityQueue } = require('./PathingEntity');
const coord = require('./coord');
const C = require('../../shared/combat.js');
const P = require('../../shared/pvp.js');
const X = require('../../shared/xp.js');
const M = require('../../shared/movement.js');

const INV_SIZE = 28;
const EQUIP_SLOTS = ['head', 'cape', 'amulet', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet'];
const COMBAT_SKILLS = { attack: 'Attack', strength: 'Strength', defence: 'Defence', ranged: 'Ranged', magic: 'Magic', hitpoints: 'Hitpoints', prayer: 'Prayer' };
const REGEN_TICKS = 100;          // stat_regen / health_regen timers (login.rs2: settimer(..., 100))
const SPEC_REGEN_TICKS = 50;      // our special-attack energy: +10% every 30 s
const PLAYER_FLAG = 0x100000;     // rsmod CollisionFlag.PLAYER

class Player extends PathingEntity {
  /**
   * @param world  the World
   * @param acct   {id, username, display}
   * @param save   decoded save data (server/persist/SaveCodec) or null for a new adventurer
   */
  constructor(world, acct, save) {
    const s = save || {};
    const spawn = s.pos || world.respawnPoint();
    super(world, spawn.x, spawn.z, spawn.level || 0, 1);
    this.pid = -1;
    this.accountId = acct.id;
    this.name = acct.display || acct.username;
    this.key = String(acct.username).toLowerCase();
    this.session = null;
    this.active = false;

    const skills = world.content.SKILLS;
    this.xp10 = {}; this.levels = {};
    for (const sk of skills) {
      const st = s.stats && s.stats[sk];
      this.xp10[sk] = st ? st.xp10 : (sk === 'Hitpoints' ? X.xp10ForLevel(10) : 0);
      this.levels[sk] = st ? st.cur : this.base(sk);
    }
    this.inv = new Array(INV_SIZE).fill(null);
    if (s.inv) s.inv.forEach((it, i) => { if (it && i < INV_SIZE && world.content.ITEMS[it[0]]) this.inv[i] = { id: it[0], qty: it[1] }; });
    this.equip = {};
    for (const slot of EQUIP_SLOTS) this.equip[slot] = (s.equip && s.equip[slot] && world.content.ITEMS[s.equip[slot]]) ? s.equip[slot] : null;

    this.runEnabled = s.run != null ? !!s.run : false;
    this.runEnergy = s.energy != null ? s.energy : M.MAX_ENERGY;
    this.styleIndex = s.style | 0;
    this.autoRetaliate = s.autoRetaliate != null ? !!s.autoRetaliate : true;
    this.autocast = s.autocast || null;
    this.specEnergy = s.spec != null ? s.spec : 100;
    this.specArmed = false;
    this.playtime = s.playtime | 0;
    this.skullRemaining = s.skull | 0;       // applied at login (pvp.skullUntilOnLogin)

    this.prayers = new Set();
    this.prayerCounter = 0;
    // combat state (2004 varps: %action_delay, %eat_delay, %lastcombat, %lastcombat_pvp, %aggressive_npc,
    // %pk_predator1..3, %pk_prey1..2, %pk_skull)
    this.actionDelay = 0;
    this.eatDelay = 0;
    this.lastCombat = -1000;
    this.lastCombatPvp = -1000;
    this.aggressiveNpc = null;
    this.predators = [];
    this.preys = [];
    this.skullUntil = 0;
    this.heroPoints = new Map();
    this.preventLogoutUntil = -1;
    this.dead = false;
    this.deathAt = -1;

    this.queue = new EntityQueue('player');
    this.timers = new Map();

    // network bookkeeping
    this.inbox = [];
    this.connected = true;
    this.lastResponse = 0;
    this.lastConnected = 0;
    this.requestLogout = false;
    this.requestIdleLogout = false;
    this.loggingOut = false;
    this.out = { msgs: [], fx: [], invDirty: true, equipDirty: true, stats: new Set(skills), selfDirty: true, prayersDirty: true, settingsDirty: true };
    this.view = { players: new Map(), pver: new Map(), npcs: new Map(), objs: new Map() };
    this.appearanceVersion = 0;
    this.lastSeen = { hp: -1, skull: null, overhead: null, cb: -1 };
    this.cache = null;   // combat stat cache
  }

  /* ---------------------------------------------------------------------------------------- */
  /* stats                                                                                     */
  /* ---------------------------------------------------------------------------------------- */
  base(skill) { return X.levelForXp10(this.xp10[skill] | 0); }
  cur(skill) { return this.levels[skill] | 0; }
  get hp() { return this.levels.Hitpoints | 0; }
  get maxHp() { return this.base('Hitpoints'); }
  setLevel(skill, v) { this.levels[skill] = Math.max(0, v | 0); this.out.stats.add(skill); this.invalidate(); if (skill === 'Hitpoints') this.infoChanged = true; }
  /** stat_advance: add tenths of xp; a level-up raises the current level with it */
  addXp(skill, xp10) {
    if (!(xp10 > 0) || this.xp10[skill] == null) return;
    const before = this.base(skill);
    this.xp10[skill] = X.addXp10(this.xp10[skill], xp10);
    const after = this.base(skill);
    if (after > before) {
      this.levels[skill] += after - before;
      this.message(`Congratulations, your ${skill} level is now ${after}.`, 'level');
      this.appearanceVersion++; this.infoChanged = true;
    }
    this.out.stats.add(skill);
    this.invalidate();
  }
  combatLevel() {
    return C.combatLevel({ attack: this.base('Attack'), strength: this.base('Strength'), defence: this.base('Defence'),
      hitpoints: this.base('Hitpoints'), prayer: this.base('Prayer'), ranged: this.base('Ranged'), magic: this.base('Magic') });
  }

  /* ---------------------------------------------------------------------------------------- */
  /* items                                                                                     */
  /* ---------------------------------------------------------------------------------------- */
  itemDef(id) { return id ? this.world.content.ITEMS[id] || null : null; }
  weapon() { return this.itemDef(this.equip.weapon); }
  style() { return C.styleFor(this.weapon(), this.styleIndex); }
  invCount(id) { let n = 0; for (const s of this.inv) if (s && s.id === id) n += s.qty; return n; }
  freeSlots() { let n = 0; for (const s of this.inv) if (!s) n++; return n; }
  /** add items; returns false (and adds nothing) when there is no room */
  invAdd(id, qty) {
    const def = this.itemDef(id); if (!def || !(qty > 0)) return false;
    if (def.stack) {
      const slot = this.inv.find((s) => s && s.id === id);
      if (slot) { slot.qty += qty; this.out.invDirty = true; this.invalidate(); return true; }
      const i = this.inv.indexOf(null); if (i < 0) return false;
      this.inv[i] = { id, qty }; this.out.invDirty = true; this.invalidate(); return true;
    }
    if (this.freeSlots() < qty) return false;
    for (let k = 0; k < qty; k++) this.inv[this.inv.indexOf(null)] = { id, qty: 1 };
    this.out.invDirty = true; this.invalidate();
    return true;
  }
  /** remove up to qty of an item id; returns how many were removed */
  invRemove(id, qty) {
    let left = qty;
    for (let i = 0; i < this.inv.length && left > 0; i++) {
      const s = this.inv[i]; if (!s || s.id !== id) continue;
      const take = Math.min(s.qty, left); s.qty -= take; left -= take;
      if (s.qty <= 0) this.inv[i] = null;
    }
    if (left !== qty) { this.out.invDirty = true; this.invalidate(); }
    return qty - left;
  }
  invSlotRemove(slot, qty) {
    const s = this.inv[slot]; if (!s) return 0;
    const take = Math.min(s.qty, qty); s.qty -= take;
    if (s.qty <= 0) this.inv[slot] = null;
    this.out.invDirty = true; this.invalidate();
    return take;
  }
  wornDefs() { return EQUIP_SLOTS.map((sl) => this.itemDef(this.equip[sl])); }
  weightKg() { return M.carriedWeight(this.inv.map((s) => s && this.itemDef(s.id)), this.wornDefs()); }
  /** visible gear for other players' clients */
  appearance() { const a = {}; for (const sl of EQUIP_SLOTS) if (this.equip[sl]) a[sl] = this.equip[sl]; return a; }

  /* ---------------------------------------------------------------------------------------- */
  /* combat numbers (recomputed on change, like the player_combat_stat proc)                   */
  /* ---------------------------------------------------------------------------------------- */
  invalidate() { this.cache = null; }
  combatStats() {
    if (this.cache) return this.cache;
    const bonuses = C.equipmentBonuses(this.wornDefs());
    const style = this.style();
    const stats = C.playerCombatStats({
      levels: { attack: this.cur('Attack'), strength: this.cur('Strength'), defence: this.cur('Defence'), ranged: this.cur('Ranged'), magic: this.cur('Magic') },
      bonuses, prayers: this.prayers, style,
    });
    this.cache = { bonuses, style, stats };
    return this.cache;
  }
  /** the autocast spell when it can be used (2004: autocast needs a staff) */
  autocastSpell() {
    if (!this.autocast) return null;
    const w = this.weapon();
    if (!w || w.style !== 'magic') return null;
    const sp = this.world.content.SPELLS[this.autocast];
    return sp && sp.max != null && !sp.utility ? this.autocast : null;
  }
  /** attack range for the current setup (0 = melee op distance) */
  attackRange() {
    const st = this.style();
    return C.attackRange(this.weapon(), st.style, !!this.autocastSpell() && st.type !== 'ranged');
  }
  wildLevel() { return this.world.wildernessLevel(this.x, this.z); }
  inMulti() { return this.world.isMulti(this.x, this.z); }
  isSkulled() { return P.isSkulled(this.skullUntil, this.world.tick); }
  overhead() { for (const id of this.prayers) { const d = C.PRAYERS[id]; if (d && d.protect) return d.protect; } return null; }
  /** the record shape shared/pvp.js works on */
  pvpRecord() {
    const npc = this.aggressiveNpc;
    return { id: this.key, combatLevel: this.combatLevel(), wildLevel: this.wildLevel(), lastCombat: this.lastCombat,
      predators: this.predators, preys: this.preys, aggressiveNpcAlive: !!(npc && npc.active && !npc.dying) };
  }
  addHeroPoints(key, points) { if (points >= 1) this.heroPoints.set(key, (this.heroPoints.get(key) || 0) + points); }

  /* ---------------------------------------------------------------------------------------- */
  /* messages to the client                                                                    */
  /* ---------------------------------------------------------------------------------------- */
  message(text, kind) { this.out.msgs.push([kind || 'game', String(text)]); }

  /* ---------------------------------------------------------------------------------------- */
  /* access                                                                                    */
  /* ---------------------------------------------------------------------------------------- */
  canAccess() { return !this.delayed && !this.dead; }
  busy2() { return this.hasInteraction() || this.hasWaypoints(); }
  blockWalkFlag() { return PLAYER_FLAG; }
  onMoved(px, pz, pl) {
    this.world.zones.move(this, 'player', pl, px, pz);
  }

  /* ---------------------------------------------------------------------------------------- */
  /* timers (soft timers run while busy, normal ones do not)                                   */
  /* ---------------------------------------------------------------------------------------- */
  setTimer(name, interval, fn, soft) { this.timers.set(name, { interval, clock: this.world.tick, fn, soft: !!soft }); }
  clearTimer(name) { this.timers.delete(name); }
  processTimers(soft) {
    const tick = this.world.tick;
    for (const [name, t] of Array.from(this.timers)) {
      if (t.soft !== soft || this.timers.get(name) !== t) continue;
      if (tick >= t.clock + t.interval && (t.soft || this.canAccess())) { t.clock = tick; t.fn(); }
    }
  }
  /** the login timers (login.rs2): stat restore, hitpoint regen, special energy */
  startTimers() {
    this.setTimer('stat_regen', REGEN_TICKS, () => {
      for (const sk of this.world.content.SKILLS) {
        if (sk === 'Prayer' || sk === 'Hitpoints') continue;
        if (this.cur(sk) < this.base(sk)) this.setLevel(sk, this.cur(sk) + 1);
      }
    });
    this.setTimer('stat_boost_restore', REGEN_TICKS, () => {
      for (const sk of this.world.content.SKILLS) {
        if (sk === 'Prayer' || sk === 'Hitpoints') continue;
        if (this.cur(sk) > this.base(sk)) this.setLevel(sk, this.cur(sk) - 1);
      }
    });
    this.setTimer('health_regen', REGEN_TICKS, () => { if (this.hp > 0 && this.hp < this.maxHp) this.setLevel('Hitpoints', this.hp + 1); });
    this.setTimer('spec_regen', SPEC_REGEN_TICKS, () => { if (this.specEnergy < 100) { this.specEnergy = Math.min(100, this.specEnergy + 10); this.out.settingsDirty = true; } });
    this.setTimer('skull', 1, () => {
      if (this.skullUntil && this.world.tick >= this.skullUntil) { this.skullUntil = 0; this.infoChanged = true; this.out.selfDirty = true; }
    }, true);
  }

  /* ---------------------------------------------------------------------------------------- */
  /* movement                                                                                  */
  /* ---------------------------------------------------------------------------------------- */
  walkTo(x, z) {
    this.queueWaypoints(this.world.collision.findPath(this.level, this.x, this.z, x, z));
  }
  updateMovement() {
    this.running = this.runEnabled && this.runEnergy > 0;
    this.processMovement();
    return this.stepsTaken > 0;
  }
  /** run energy after movement (Player.updateEnergy) */
  updateEnergy() {
    if (this.delayed) return;
    const before = this.runEnergy;
    this.runEnergy = M.energyTick(this.runEnergy, this.stepsTaken, this.weightKg(), this.cur('Agility') || 1);
    if (this.runEnergy === 0 && this.runEnabled) { this.runEnabled = false; this.out.settingsDirty = true; }
    if (Math.floor(before / 100) !== Math.floor(this.runEnergy / 100)) this.out.selfDirty = true;
  }

  /* ---------------------------------------------------------------------------------------- */
  /* interactions (Player.processInteraction port)                                             */
  /* ---------------------------------------------------------------------------------------- */
  validateTarget() {
    const t = this.target;
    if (!t || t.level !== this.level) return false;
    if (this.targetOp === 'take') return this.world.objs.get(t.uid) === t && t.visibleTo(this.key, this.world.tick);
    return !!t.active && !(t.dying);
  }

  processInteraction() {
    let interacted = false;
    if (this.target && this.canAccess()) {
      if (!this.validateTarget()) { this.clearInteraction(); this.clearWaypoints(); return; }
      interacted = this.tryInteract(false);
    }
    if (!interacted) {
      this.pathToPathingTarget();
      if (!this.hasWaypoints() && this.targetOp === 'follow') this.clearInteraction();
      this.updateMovement();
      if (this.target && this.canAccess() && this.targetOp !== 'follow') {
        if (!this.validateTarget()) { this.clearInteraction(); return; }
        interacted = this.tryInteract(this.stepsTaken === 0);
        if (!interacted && !this.hasWaypoints() && this.stepsTaken === 0) {
          this.message("I can't reach that!");
          this.clearInteraction();
        }
      }
    }
  }

  /** is the current target inside this interaction's reach? */
  inReach() {
    const t = this.target, cm = this.world.collision;
    if (this.targetOp === 'take') return (this.x === t.x && this.z === t.z) || (!cm.isWalkable(t.x, t.z, t.level) && cm.reachedObj(this.level, this.x, this.z, t.x, t.z));
    const range = this.targetOp === 'cast' ? 10 : this.attackRange();
    if (range <= 0) return cm.reachedEntity(this.level, this.x, this.z, t.x, t.z, t.size, t.size, this.size);
    if (coord.intersects(this.x, this.z, this.size, this.size, t.x, t.z, t.size, t.size)) return false;
    return coord.distanceTo(this, t) <= range && cm.lineOfSight(this.level, this.x, this.z, t.x, t.z, this.size, this.size, t.size, t.size);
  }

  /** returns true when the interaction ran (in reach) this tick */
  tryInteract() {
    if (!this.target || !this.hasInteraction() || !this.canAccess()) return false;
    if (!this.inReach()) return false;
    this.clearWaypoints();
    const combat = require('./combat');
    let keep = false;
    switch (this.targetOp) {
      case 'attack': keep = combat.playerAttack(this.world, this, this.target); break;
      case 'cast': keep = combat.playerCast(this.world, this, this.target, this.targetArg); break;
      case 'take': this.world.takeObj(this, this.target); keep = false; break;
      default: keep = false;
    }
    if (!keep) this.clearInteraction();
    return true;
  }

  pathToPathingTarget() {
    const t = this.target; if (!t) return;
    const cm = this.world.collision;
    if (this.targetOp === 'follow') {
      if (this.isLastOrNoWaypoint()) this.queueWaypoint(t.lastStepX, t.lastStepZ);
      return;
    }
    if (this.targetOp === 'take') {
      if (!this.hasWaypoints() && !(this.x === t.x && this.z === t.z)) this.walkTo(t.x, t.z);
      return;
    }
    if (!this.canAccess()) return;
    if (coord.intersects(this.x, this.z, this.size, this.size, t.x, t.z, t.size, t.size)) {
      this.queueWaypoints(cm.findNaivePath(this.level, this.x, this.z, t.x, t.z, this.size, this.size, t.size, t.size, 0));
      return;
    }
    if (this.isLastOrNoWaypoint()) this.queueWaypoints(cm.findPathToEntity(this.level, this.x, this.z, t.x, t.z, this.size, t.size, t.size));
  }

  /* ---------------------------------------------------------------------------------------- */
  /* saving                                                                                    */
  /* ---------------------------------------------------------------------------------------- */
  toSave() {
    const stats = {};
    for (const sk of this.world.content.SKILLS) stats[sk] = { xp10: this.xp10[sk], cur: this.levels[sk] };
    const equip = {};
    for (const sl of EQUIP_SLOTS) if (this.equip[sl]) equip[sl] = this.equip[sl];
    return {
      pos: { x: this.x, z: this.z, level: this.level },
      stats,
      inv: this.inv.map((s) => (s ? [s.id, s.qty] : null)),
      equip,
      run: this.runEnabled, energy: this.runEnergy,
      style: this.styleIndex, autoRetaliate: this.autoRetaliate, autocast: this.autocast, spec: this.specEnergy,
      skull: this.active ? P.skullRemainingOnLogout(this.skullUntil, this.world.tick) : this.skullRemaining,
      playtime: this.playtime,
    };
  }
}

Player.INV_SIZE = INV_SIZE;
Player.EQUIP_SLOTS = EQUIP_SLOTS;
Player.COMBAT_SKILLS = COMBAT_SKILLS;
module.exports = Player;
