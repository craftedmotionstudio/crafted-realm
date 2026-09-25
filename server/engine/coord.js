'use strict';
/* ============ coord — tile geometry helpers ============
 * Ported from the Lost City engine (MIT) src/engine/CoordGrid.ts (distanceTo / closest /
 * distanceToSW / intersects / face): Chebyshev distances between tile rectangles, and the 8-way
 * direction table (NW, N, NE, W, E, SW, S, SE) with north = +z.
 */
const DIR = { NW: 0, N: 1, NE: 2, W: 3, E: 4, SW: 5, S: 6, SE: 7 };
const DX = [-1, 0, 1, -1, 1, -1, 0, 1];
const DZ = [1, 1, 1, 0, 0, -1, -1, -1];

/** direction from one tile toward another (-1 when equal) */
function face(sx, sz, dx, dz) {
  if (sx === dx) { if (sz > dz) return DIR.S; if (sz < dz) return DIR.N; return -1; }
  if (sx > dx) { if (sz > dz) return DIR.SW; if (sz < dz) return DIR.NW; return DIR.W; }
  if (sz > dz) return DIR.SE; if (sz < dz) return DIR.NE; return DIR.E;
}
/** nearest tile of rect `a` to rect `b` */
function closest(a, b) {
  const ox = a.x + (a.width || 1) - 1, oz = a.z + (a.length || a.width || 1) - 1;
  return { x: b.x <= a.x ? a.x : b.x >= ox ? ox : b.x, z: b.z <= a.z ? a.z : b.z >= oz ? oz : b.z };
}
/** Chebyshev distance between the nearest tiles of two rects */
function distanceTo(a, b) {
  const p1 = closest(a, b), p2 = closest(b, a);
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.z - p2.z));
}
/** Chebyshev distance between two south-west tiles */
function distanceToSW(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)); }
/** do two tile rects overlap? */
function intersects(ax, az, aw, al, bx, bz, bw, bl) {
  return !(ax >= bx + bw || bx >= ax + aw || az >= bz + bl || bz >= az + al);
}

module.exports = { DIR, DX, DZ, face, closest, distanceTo, distanceToSW, intersects };
