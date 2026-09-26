'use strict';
/* ============ ZoneMap — 8x8 tile zones ============
 * The world is bucketed into 8x8 zones (Lost City engine, MIT: src/engine/zone/Zone.ts, ZoneMap.ts)
 * so "who can see what" queries touch a handful of buckets instead of every entity. Entities call
 * world.zones.move() whenever they cross a zone edge; views iterate zonesAround().
 */
class Zone {
  constructor(level, zx, zz) {
    this.level = level; this.zx = zx; this.zz = zz;
    this.players = new Set();
    this.npcs = new Set();
    this.objs = new Set();
  }
}

class ZoneMap {
  constructor() { this.zones = new Map(); }
  static key(level, zx, zz) { return (level << 24) | ((zx & 0xfff) << 12) | (zz & 0xfff); }
  /** the zone holding tile (x, z), created on demand */
  get(level, x, z) {
    const zx = x >> 3, zz = z >> 3, k = ZoneMap.key(level, zx, zz);
    let zone = this.zones.get(k);
    if (!zone) { zone = new Zone(level, zx, zz); this.zones.set(k, zone); }
    return zone;
  }
  setOf(zone, kind) { return kind === 'player' ? zone.players : kind === 'npc' ? zone.npcs : zone.objs; }
  enter(e, kind) { this.setOf(this.get(e.level, e.x, e.z), kind).add(e); }
  leave(e, kind, level, x, z) { this.setOf(this.get(level, x, z), kind).delete(e); }
  /** update membership after an entity moved from (level, x, z) */
  move(e, kind, level, x, z) {
    if (level === e.level && (x >> 3) === (e.x >> 3) && (z >> 3) === (e.z >> 3)) return;
    this.leave(e, kind, level, x, z);
    this.enter(e, kind);
  }
  /** every existing zone intersecting the square of `radius` tiles around (x, z) */
  *zonesAround(level, x, z, radius) {
    for (let zx = (x - radius) >> 3; zx <= (x + radius) >> 3; zx++) {
      for (let zz = (z - radius) >> 3; zz <= (z + radius) >> 3; zz++) {
        const zone = this.zones.get(ZoneMap.key(level, zx, zz));
        if (zone) yield zone;
      }
    }
  }
}

module.exports = ZoneMap;
