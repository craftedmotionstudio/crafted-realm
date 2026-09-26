'use strict';
/* ============ GroundItem — an item stack lying on a tile ============
 * Ownership follows the engine's Obj (Lost City, MIT: src/engine/entity/Obj.ts + World.addObj):
 * a drop with a receiver is visible only to that receiver until it "reveals" (100 ticks), then to
 * everyone, and it despawns when its duration runs out (monster and death loot: 200 ticks, from
 * data/src/scripts/drop tables/configs/lootdrop.constant). Stackable drops of the same item for the
 * same receiver on the same tile merge.
 */
class GroundItem {
  constructor(uid, id, qty, x, z, level, owner, tick, opts) {
    const o = opts || {};
    this.uid = uid;
    this.id = id; this.qty = qty;
    this.x = x; this.z = z; this.level = level | 0;
    this.owner = owner || null;                       // player key, or null = public from the start
    this.createdTick = tick;
    this.revealTick = this.owner ? tick + (o.privateTicks == null ? 100 : o.privateTicks) : tick;
    this.despawnTick = tick + (o.duration == null ? 200 : o.duration);
    this.neverReveal = !!o.neverReveal;               // untradeables stay private until they vanish
  }
  isPublic(tick) { return !this.owner || (!this.neverReveal && tick >= this.revealTick); }
  /** can this player (key) see/take it this tick? */
  visibleTo(key, tick) { return this.isPublic(tick) || this.owner === key; }
}

module.exports = GroundItem;
