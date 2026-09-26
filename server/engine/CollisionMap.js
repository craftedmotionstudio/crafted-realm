'use strict';
/* ============ CollisionMap — our collision flags on top of rsmod-pathfinder ============
 * rsmod-pathfinder (RS Mod, ISC; npm @2004scape/rsmod-pathfinder) keeps one process-wide flag grid
 * (8x8 zones, allocated on demand; unallocated zones are solid). This wrapper loads OUR authored
 * collision JSON (server/data/maps/*.json, format documented in server/README.md) into it and
 * exposes the handful of queries the engine needs, with the same argument conventions the Lost City
 * engine uses (src/engine/GameMap.ts: findPath / findPathToEntity / reachedEntity / isApproached).
 *
 * Because rsmod is a singleton, only one CollisionMap may be loaded per process; loading a new one
 * unloads the previous (tests rely on that).
 */
const rs = require('@2004scape/rsmod-pathfinder');

const { CollisionFlag, CollisionType, LocAngle, LocShape } = rs;
const SIDE_ANGLE = { W: LocAngle.WEST, N: LocAngle.NORTH, E: LocAngle.EAST, S: LocAngle.SOUTH };
const MAX_WAYPOINTS = 25;

let current = null;

function unpack(c) { return { level: (c >>> 28) & 0x3, x: (c >>> 14) & 0x3fff, z: c & 0x3fff }; }
function pack(level, x, z) { return ((z & 0x3fff) | ((x & 0x3fff) << 14) | ((level & 0x3) << 28)) >>> 0; }

class CollisionMap {
  constructor(map) {
    this.map = map;
    this.level = map.level | 0;
    this.bounds = map.bounds;
    this.zones = [];
    this.load();
  }

  load() {
    if (current && current !== this) current.unload();
    current = this;
    const m = this.map, L = this.level, b = this.bounds;
    // allocate every zone that touches the bounds; tiles in those zones outside the bounds are solid
    for (let zx = b.x1 >> 3; zx <= b.x2 >> 3; zx++) {
      for (let zz = b.z1 >> 3; zz <= b.z2 >> 3; zz++) {
        rs.allocateIfAbsent(zx << 3, zz << 3, L);
        this.zones.push([zx << 3, zz << 3]);
        for (let x = zx << 3; x < (zx << 3) + 8; x++) {
          for (let z = zz << 3; z < (zz << 3) + 8; z++) {
            if (x < b.x1 || x > b.x2 || z < b.z1 || z > b.z2) rs.changeFloor(x, z, L, true);
          }
        }
      }
    }
    for (const r of m.blocked || []) this.rect(r, (x, z) => rs.changeLoc(x, z, L, 1, 1, true, false, true));
    for (const r of m.water || []) this.rect(r, (x, z) => rs.changeFloor(x, z, L, true));
    // walls: [x, z, side] for one tile edge, or [x1, z1, x2, z2, side] for a straight run of edges
    for (const w of m.walls || []) {
      const side = w.length === 5 ? w[4] : w[2];
      const angle = SIDE_ANGLE[side];
      if (angle === undefined) throw new Error('bad wall side ' + JSON.stringify(w));
      const r = w.length === 5 ? [w[0], w[1], w[2], w[3]] : [w[0], w[1], w[0], w[1]];
      this.rect(r, (x, z) => rs.changeWall(x, z, L, angle, LocShape.WALL_STRAIGHT, true, false, true));
    }
    for (const f of m.flags || []) rs.__set(f[0], f[1], L, f[2] >>> 0);
  }

  rect(r, fn) {
    const [x1, z1, x2, z2] = r;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) fn(x, z);
  }

  unload() {
    for (const [x, z] of this.zones) rs.deallocateIfPresent(x, z, this.level);
    this.zones = [];
    if (current === this) current = null;
  }

  inBounds(x, z) { const b = this.bounds; return x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2; }
  /** a tile a 1x1 entity may stand on */
  isWalkable(x, z, level) {
    if (!this.inBounds(x, z)) return false;
    return !rs.isFlagged(x, z, level == null ? this.level : level, CollisionFlag.WALK_BLOCKED);
  }
  /** smart BFS path to a tile (GameMap.findPath) -> [{x,z}] checkpoints, first to last */
  findPath(level, sx, sz, dx, dz) {
    return Array.from(rs.findPath(level, sx, sz, dx, dz, 1, 1, 1, 0, -1, true, 0, MAX_WAYPOINTS, CollisionType.NORMAL), unpack);
  }
  /** path to stand next to a pathing entity (shape -2: adjacent, not diagonal) (GameMap.findPathToEntity) */
  findPathToEntity(level, sx, sz, dx, dz, srcSize, dw, dh) {
    return Array.from(rs.findPath(level, sx, sz, dx, dz, srcSize, dw, dh, 0, -2, true, 0, MAX_WAYPOINTS, CollisionType.NORMAL), unpack);
  }
  /** dumb npc path (GameMap.findNaivePath) */
  findNaivePath(level, sx, sz, dx, dz, sw, sh, dw, dh, extraFlag) {
    return Array.from(rs.findNaivePath(level, sx, sz, dx, dz, sw, sh, dw, dh, extraFlag >>> 0, CollisionType.NORMAL), unpack);
  }
  canTravel(level, x, z, offX, offZ, size, extraFlag) {
    return rs.canTravel(level, x, z, offX, offZ, size, extraFlag >>> 0, CollisionType.NORMAL);
  }
  /** operable distance to a pathing entity: adjacent (not diagonal), no wall between (GameMap.reachedEntity) */
  reachedEntity(level, sx, sz, dx, dz, dw, dh, srcSize) { return rs.reached(level, sx, sz, dx, dz, dw, dh, srcSize, 0, -2, 0); }
  /** on or next to a ground item's tile (GameMap.reachedObj) */
  reachedObj(level, sx, sz, dx, dz) { return rs.reached(level, sx, sz, dx, dz, 1, 1, 1, 0, -1, 0); }
  /** projectile line of sight, blocked by players-flag too like isApproached */
  lineOfSight(level, sx, sz, dx, dz, sw, sh, dw, dh) {
    return rs.hasLineOfSight(level, sx, sz, dx, dz, sw, sh, dw, dh, CollisionFlag.PLAYER);
  }
  isFlagged(x, z, level, mask) { return rs.isFlagged(x, z, level, mask >>> 0); }
  changeNpc(x, z, level, size, add) { rs.changeNpc(x, z, level, size, add); }
}

CollisionMap.pack = pack;
CollisionMap.unpack = unpack;
CollisionMap.Flag = CollisionFlag;
module.exports = CollisionMap;
