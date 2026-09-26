'use strict';
/* ============ Npc — monsters and other non-player characters ============
 * Behaviour ported from the Lost City engine (MIT), verified 2026-09-25:
 *   src/engine/entity/Npc.ts turn(): lifecycle (respawn) -> hunt target -> regen -> timers -> queue ->
 *     movement/interaction; wanderMode(): 1/8 chance per tick to pick a random tile within the wander
 *     range, and after 500 ticks away from the spawn tile it is put back; aiMode()/tryInteract();
 *     validateTarget()/targetWithinMaxRange() (max range 7 from spawn by default); huntPlayers().
 *   src/cache/config/NpcType.ts defaults: wanderrange 5, maxrange 7, regenRate 100, respawnrate 100.
 * Combat (attack, damage, retaliation, death) lives in combat.js; this file owns the AI loop.
 *
 * Our NPC_TYPES carry `respawn` in SECONDS (client convention); the server converts to ticks.
 */
const { PathingEntity, EntityQueue } = require('./PathingEntity');
const coord = require('./coord');
const C = require('../../shared/combat.js');
const pvp = require('../../shared/pvp.js');

const WANDER_CHANCE = 0.125;
const WANDER_RESET_TICKS = 500;
const REGEN_RATE = 100;
const DEFAULT_WANDER = 5;
const DEFAULT_MAX_RANGE = 7;
const DEFAULT_RANGED_ATTACK_RANGE = 7;
const NPC_FLAG = 0x80000;   // rsmod CollisionFlag.NPC

/** tile footprint of an NPC type: `tiles`, or an integer `size` of 2+ (the Scarlands bestiary convention); our older
 *  types use `size` as a visual scale (0.5 .. 1.05), which is one tile */
function footprint(def) {
  if (def.tiles != null) return Math.max(1, def.tiles | 0);
  return Number.isInteger(def.size) && def.size >= 2 ? def.size : 1;
}

class Npc extends PathingEntity {
  constructor(world, nid, typeId, spawn) {
    const def = world.content.NPC_TYPES[typeId];
    if (!def) throw new Error('unknown npc type ' + typeId);
    super(world, spawn.x, spawn.z, spawn.level || 0, footprint(def));
    this.nid = nid;
    this.typeId = typeId;
    this.def = def;
    this.startX = spawn.x; this.startZ = spawn.z; this.startLevel = spawn.level || 0;
    this.wanderRange = spawn.wander != null ? spawn.wander : DEFAULT_WANDER;
    this.maxRange = spawn.maxRange != null ? spawn.maxRange : DEFAULT_MAX_RANGE;
    this.huntRange = spawn.hunt != null ? spawn.hunt : (def.aggro ? 3 : 0);
    this.attackType = C.npcAttackType(def);
    this.attackRange = def.attackRange != null ? def.attackRange : (this.attackType === 'stab' || this.attackType === 'slash' || this.attackType === 'crush') ? 0 : DEFAULT_RANGED_ATTACK_RANGE;
    this.respawnTicks = Math.max(1, Math.round((def.respawn || 60) / 0.6));
    this.queue = new EntityQueue('npc');
    this.reset();
    this.active = false;    // becomes true when the world adds it
  }

  /** a fresh life: full stats, no memory of the last fight */
  reset() {
    this.levels = C.npcLevels(this.def);
    this.baseLevels = C.npcLevels(this.def);
    this.mode = 'wander';
    this.target = null; this.targetOp = null;
    this.huntEnabled = this.huntRange > 0;
    this.huntTarget = null;
    this.actionDelay = -1000;          // %npc_action_delay
    this.lastCombat = -1000;           // %npc_lastcombat
    this.aggressivePlayer = null;      // %npc_aggressive_player
    this.attackingPlayer = null;       // %npc_attacking_uid
    this.heroPoints = new Map();       // player key -> damage
    this.queue.clear();
    this.wanderCounter = 0;
    this.regenClock = 0;
    this.dying = false; this.removeAt = -1;
    this.respawnAt = -1;
    this.attackCount = 0;               // for scripted every-Nth specials (def.breath)
  }

  get hp() { return this.levels.hitpoints; }
  get maxHp() { return this.baseLevels.hitpoints; }
  get combatLevel() { return this.def.level | 0; }
  blockWalkFlag() { return NPC_FLAG; }

  onMoved(px, pz, pl) {
    const cm = this.world.collision;
    if (this.active) { cm.changeNpc(px, pz, pl, this.size, false); cm.changeNpc(this.x, this.z, this.level, this.size, true); }
    this.world.zones.move(this, 'npc', pl, px, pz);
  }

  /** return to wandering (Npc.resetDefaults): hunting resumes */
  resetDefaults() {
    this.mode = 'wander';
    this.target = null; this.targetOp = null;
    this.huntEnabled = this.huntRange > 0;
    this.clearWaypoints();
  }

  addHeroPoints(key, points) {
    if (points < 1) return;
    this.heroPoints.set(key, (this.heroPoints.get(key) || 0) + points);
  }
  heroKey() { return pvp.findHero(Array.from(this.heroPoints, ([key, points]) => ({ key, points }))); }

  /* ------------------------------------------------------------------------------------------- */
  /* the NPC turn (World.processNpcs)                                                             */
  /* ------------------------------------------------------------------------------------------- */
  turn() {
    const w = this.world, tick = w.tick;
    // lifecycle: respawn when the countdown ends
    if (!this.active) {
      if (this.respawnAt >= 0 && tick >= this.respawnAt) w.respawnNpc(this);
      return;
    }
    if (this.delayed && tick >= this.delayedUntil) this.delayed = false;
    // death delay (npc_delay(1) in npc_death) then removal and drops
    if (this.dying) {
      if (tick >= this.removeAt) w.finishNpcDeath(this);
      return;
    }
    // hunt target found in processWorld -> start attacking (consumeHuntTarget)
    if (this.huntTarget) {
      const t = this.huntTarget;
      this.huntTarget = null;
      if (t.active && !t.dead) { this.startAttacking(t); this.huntEnabled = false; }
    }
    this.processRegen();
    this.queue.process(() => true, () => this.delayed);
    if (!this.active || this.dying) return;
    this.processMovementInteraction();
  }

  processRegen() {
    if (--this.regenClock <= 0) {
      this.regenClock = REGEN_RATE;
      for (const k of ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic']) {
        if (this.levels[k] == null) continue;
        if (this.levels[k] < this.baseLevels[k]) this.levels[k]++;
        else if (this.levels[k] > this.baseLevels[k]) this.levels[k]--;
      }
    }
  }

  startAttacking(player) {
    this.mode = 'attack';
    this.target = player;
    this.targetOp = 'attack';
    this.faceChanged = true; this.infoChanged = true;
  }

  processMovementInteraction() {
    if (this.delayed) return;
    if (this.mode === 'wander') { this.wanderMode(); return; }
    if (this.mode === 'none') { this.updateMovement(); return; }
    if (!this.target || !this.validateTarget()) { this.resetDefaults(); return; }
    this.aiMode();
  }

  wanderMode() {
    const w = this.world;
    if (this.wanderRange > 0 && w.rng.next() < WANDER_CHANCE) {
      const r = this.wanderRange;
      const dx = Math.round(w.rng.next() * (r * 2) - r), dz = Math.round(w.rng.next() * (r * 2) - r);
      const tx = this.startX + dx, tz = this.startZ + dz;
      if (tx !== this.x || tz !== this.z) this.queueWaypoint(tx, tz);
    }
    this.updateMovement();
    const onSpawn = this.x === this.startX && this.z === this.startZ && this.level === this.startLevel;
    if (this.wanderCounter++ >= WANDER_RESET_TICKS) {
      if (!onSpawn) this.teleport(this.startX, this.startZ, this.startLevel);
      this.wanderCounter = 0;
    }
  }

  updateMovement() {
    this.running = false;
    return this.processMovement() && this.stepsTaken > 0;
  }

  /** target still fightable and inside the leash (Npc.validateTarget / targetWithinMaxRange) */
  validateTarget() {
    const t = this.target;
    if (!t || !t.active || t.dead || t.level !== this.level) return false;
    if (this.attackRange <= 0) {
      const dx = Math.abs(t.x - this.startX), dz = Math.abs(t.z - this.startZ);
      if (Math.max(dx, dz) > this.maxRange + 1) return false;
      if (dx === this.maxRange + 1 && dz === this.maxRange + 1) return false;
    } else if (coord.distanceToSW(t, { x: this.startX, z: this.startZ }) > this.maxRange + this.attackRange) {
      return false;
    }
    return true;
  }

  aiMode() {
    this.wanderCounter = 0;
    if (this.tryInteract()) return;
    this.pathToTarget();
    const moved = this.updateMovement();
    if (moved && this.def.givechase === false) { this.resetDefaults(); return; }
    if (this.target) this.tryInteract();
  }

  inRangeOf(t) {
    const cm = this.world.collision;
    if (this.attackRange <= 0) return cm.reachedEntity(this.level, this.x, this.z, t.x, t.z, t.size, t.size, this.size);
    if (coord.intersects(this.x, this.z, this.size, this.size, t.x, t.z, t.size, t.size)) return false;
    // npc line of sight is calculated backwards, from the target (PathingEntity.inApproachDistance)
    return coord.distanceTo(this, t) <= this.attackRange && cm.lineOfSight(this.level, t.x, t.z, this.x, this.z, t.size, t.size, this.size, this.size);
  }

  tryInteract() {
    const t = this.target;
    if (!t || !this.inRangeOf(t)) return false;
    this.clearWaypoints();
    require('./combat').npcAttack(this.world, this, t);
    return true;
  }

  pathToTarget() {
    const t = this.target; if (!t) return;
    const cm = this.world.collision;
    this.queueWaypoints(cm.findNaivePath(this.level, this.x, this.z, t.x, t.z, this.size, this.size, t.size, t.size, NPC_FLAG));
  }
}

Npc.NPC_FLAG = NPC_FLAG;
Npc.footprint = footprint;
module.exports = Npc;
