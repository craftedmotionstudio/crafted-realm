'use strict';
/* ============ PathingEntity — anything that walks: players and NPCs ============
 * Ported from the Lost City engine (MIT) src/engine/entity/PathingEntity.ts:
 *   - waypoints are checkpoints from the path finder; each tick an entity takes one step (two when
 *     running) toward the current checkpoint, advancing when it lands on it (validateAndAdvanceStep);
 *   - takeStep tries the direct direction, then the x-only and z-only directions, else waits
 *     (blocked this tick, the checkpoint persists), exactly like the engine;
 *   - queues and timers follow the engine's two distinct countdown rules (see EntityQueue below).
 * Coordinates are tiles; north is +z.
 */
const coord = require('./coord');

/* ---------------------------------------------------------------------------------------------- */
/* Queues                                                                                          */
/* ---------------------------------------------------------------------------------------------- */
/**
 * Scripted delayed work ("queue" in RuneScript). Two countdown flavours, both from the engine:
 *   'player' (Player.processQueue): `delay = req.delay--; run when delay <= 0` — a delay-0 entry runs
 *            at the next processing pass, delay d at the (d+1)th pass.
 *   'npc'    (Npc.processQueue): `req.delay--; run when req.delay <= 0` — delay 0 and 1 both run at the
 *            next pass, delay d at the d-th pass. The delay does not count down while the NPC is delayed.
 * Entries added while a pass is running are first considered on the next pass (the engine's
 * LinkList can pick some up in the same pass — a documented quirk we do not reproduce).
 */
class EntityQueue {
  constructor(kind) { this.kind = kind; this.items = []; }
  add(name, delay, fn) { this.items.push({ name, delay: delay | 0, fn }); }
  has(name) { return this.items.some((r) => r.name === name); }
  clear(names) {
    if (!names) { this.items = []; return; }
    const set = new Set(names);
    this.items = this.items.filter((r) => !set.has(r.name));
  }
  process(canRun, isDelayed) {
    const snapshot = this.items.slice();
    for (const req of snapshot) {
      if (this.items.indexOf(req) < 0) continue;   // cleared by an earlier entry this pass
      let due;
      if (this.kind === 'npc') {
        if (isDelayed && isDelayed()) continue;
        req.delay--;
        due = req.delay <= 0;
      } else {
        const d = req.delay--;
        due = d <= 0;
      }
      if (due && canRun()) {
        this.items.splice(this.items.indexOf(req), 1);
        req.fn();
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* PathingEntity                                                                                   */
/* ---------------------------------------------------------------------------------------------- */
class PathingEntity {
  constructor(world, x, z, level, size) {
    this.world = world;
    this.x = x; this.z = z; this.level = level | 0;
    this.size = size || 1;
    this.path = [];          // checkpoints [{x, z}], first to last
    this.pathPos = 0;
    this.running = false;    // this tick's move speed (players: run toggle && energy)
    this.stepsTaken = 0;
    this.steps = [];         // tiles stepped onto this tick (for the info update)
    this.lastStepX = x - 1; this.lastStepZ = z;
    this.tele = false;
    this.target = null;      // interaction target (entity)
    this.targetOp = null;    // 'attack' | 'cast' | 'take' | 'follow'
    this.targetArg = null;
    this.delayed = false; this.delayedUntil = -1;
    this.resetMasks();
  }

  get width() { return this.size; }
  get length() { return this.size; }

  /** per-tick info masks (cleared in World.processCleanup) */
  resetMasks() {
    this.anim = null;          // {name, style?}
    this.hits = [];            // [{amount, type: 'hit'|'block'}]
    this.chat = null;
    this.faceChanged = false;
    this.infoChanged = false;  // anything worth sending this tick besides movement
    this.steps = [];
    this.stepsTaken = 0;
    this.tele = false;
  }
  setAnim(name, extra) {
    // animation priority (the 2004 client plays one sequence per tick by priority): a blow of your own (attack / cast)
    // or a death outranks the defend flinch, so two fighters swinging on the same tick both show their swing (W2)
    const a = this.anim;
    if (a && name === 'defend' && (a.name === 'attack' || a.name === 'cast' || a.name === 'death')) return;
    this.anim = Object.assign({ name }, extra || {}); this.infoChanged = true;
  }
  addHit(amount, type) { this.hits.push({ amount, type: type || (amount > 0 ? 'hit' : 'block') }); this.infoChanged = true; }

  /* ---- waypoints ---- */
  hasWaypoints() { return this.pathPos < this.path.length; }
  isLastOrNoWaypoint() { return this.path.length - this.pathPos <= 1; }
  queueWaypoints(list) { this.path = list.map((p) => ({ x: p.x, z: p.z })); this.pathPos = 0; }
  queueWaypoint(x, z) { this.path = [{ x, z }]; this.pathPos = 0; }
  clearWaypoints() { this.path = []; this.pathPos = 0; }

  /** extra collision flag that blocks this entity's steps (npcs: other npcs) */
  blockWalkFlag() { return 0; }
  /** called after every tile change (zone membership, npc occupancy flags) */
  onMoved(prevX, prevZ, prevLevel) { /* subclasses */ }

  /** one tick of movement: 1 step walking, 2 running. Returns true when it had waypoints. */
  processMovement() {
    if (!this.hasWaypoints()) return false;
    const walked = this.validateAndAdvanceStep();
    if (this.running && walked !== -1) this.validateAndAdvanceStep();
    return true;
  }

  validateAndAdvanceStep() {
    const dir = this.takeStep();
    if (dir === null) return -1;                       // blocked: wait, keep the checkpoint
    if (dir === -1) {                                  // standing on the checkpoint: next one
      this.pathPos++;
      if (this.hasWaypoints()) return this.validateAndAdvanceStep();
      return -1;
    }
    const px = this.x, pz = this.z;
    this.x += coord.DX[dir]; this.z += coord.DZ[dir];
    this.stepsTaken++;
    this.steps.push([this.x, this.z]);
    this.lastStepX = px; this.lastStepZ = pz;
    this.onMoved(px, pz, this.level);
    if (this.hasWaypoints()) {
      const wp = this.path[this.pathPos];
      if (wp.x === this.x && wp.z === this.z) this.pathPos++;
    }
    return dir;
  }

  takeStep() {
    if (!this.hasWaypoints()) return null;
    const cm = this.world.collision, L = this.level, flag = this.blockWalkFlag();
    const wp = this.path[this.pathPos];
    if (this.size > 1) {
      const tx = coord.face(this.x, 0, wp.x, 0);
      if (tx !== -1 && cm.canTravel(L, this.x, this.z, coord.DX[tx], 0, this.size, flag)) return tx;
      const tz = coord.face(0, this.z, 0, wp.z);
      if (tz !== -1 && cm.canTravel(L, this.x, this.z, 0, coord.DZ[tz], this.size, flag)) return tz;
      return -1;
    }
    const dir = coord.face(this.x, this.z, wp.x, wp.z);
    if (dir === -1) return -1;
    const dx = coord.DX[dir], dz = coord.DZ[dir];
    if (cm.canTravel(L, this.x, this.z, dx, dz, 1, flag)) return dir;
    if (dx !== 0 && cm.canTravel(L, this.x, this.z, dx, 0, 1, flag)) return coord.face(this.x, this.z, wp.x, this.z);
    if (dz !== 0 && cm.canTravel(L, this.x, this.z, 0, dz, 1, flag)) return coord.face(this.x, this.z, this.x, wp.z);
    return null;
  }

  /** instant move (respawn, teleport spells) */
  teleport(x, z, level) {
    const px = this.x, pz = this.z, pl = this.level;
    this.x = x; this.z = z; this.level = level == null ? this.level : level;
    this.lastStepX = x - 1; this.lastStepZ = z;
    this.clearWaypoints();
    this.tele = true;
    this.infoChanged = true;
    this.onMoved(px, pz, pl);
  }

  /* ---- interactions ---- */
  setInteraction(target, op, arg) { this.target = target; this.targetOp = op; this.targetArg = arg == null ? null : arg; this.faceChanged = true; this.infoChanged = true; }
  clearInteraction() {
    if (this.target) { this.faceChanged = true; this.infoChanged = true; }
    this.target = null; this.targetOp = null; this.targetArg = null;
  }
  hasInteraction() { return !!this.target && this.targetOp !== 'follow'; }

  distanceTo(other) { return coord.distanceTo(this, other); }
}

module.exports = { PathingEntity, EntityQueue };
