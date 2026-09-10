/* test_gear_models.js — headless gate for the worn-gear GLB <-> runtime contract.
 *
 * src/gear_models_v1.js consumes assets/models/props/worn_gear_starter_v1.glb by
 * NODE NAME and assumes the authored grip conventions (grip at origin, blade along
 * game +Y, hatchet/pickaxe edge toward +X, shield face normal +X, helm face +Z).
 * This test parses the GLB's JSON chunk (accessor min/max carry each primitive's
 * bounds — no BIN decoding needed) and fails loudly if a rebuild breaks any part
 * of that contract, the same way validate_content.js gates the data layer.
 *
 * Run: node tools/test_gear_models.js
 */
const fs = require('fs');
const path = require('path');

const GLB = path.join(__dirname, '..', 'assets', 'models', 'props', 'worn_gear_starter_v1.glb');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  FAIL:', m); } };

/* ---- parse the GLB JSON chunk ---- */
const data = fs.readFileSync(GLB);
ok(data.length > 20 && data.toString('ascii', 0, 4) === 'glTF', 'GLB magic header');
let doc = null, off = 12;
while (off + 8 <= data.length) {
  const len = data.readUInt32LE(off), kind = data.readUInt32LE(off + 4);
  if (kind === 0x4E4F534A) { doc = JSON.parse(data.toString('utf8', off + 8, off + 8 + len)); break; }
  off += 8 + len;
}
ok(!!doc, 'GLB carries a JSON document');
if (!doc) { console.log(`${pass} passed, ${fail} failed`); process.exit(1); }

const nodes = doc.nodes || [], meshes = doc.meshes || [], accessors = doc.accessors || [];
const byName = {}; nodes.forEach((n, i) => { if (n.name) byName[n.name] = i; });

/* union the POSITION bounds of every mesh in a node's subtree, composing each
 * node's TRS (the consolidated meshes keep a compensating local transform from
 * the join/grip-origin reset, so raw accessor bounds alone are NOT group-local) */
function quatMat(q) { // 3x3 from glTF quaternion [x,y,z,w]
  const [x, y, z, w] = q;
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
          2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
          2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}
function apply(m, t, s, v) { // rotate+scale+translate one vec3
  const p = [v[0] * (s ? s[0] : 1), v[1] * (s ? s[1] : 1), v[2] * (s ? s[2] : 1)];
  const r = m ? [m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
                 m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
                 m[6] * p[0] + m[7] * p[1] + m[8] * p[2]] : p;
  return [r[0] + (t ? t[0] : 0), r[1] + (t ? t[1] : 0), r[2] + (t ? t[2] : 0)];
}
function subtreeBounds(idx) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  (function walk(i, chain) {
    const n = nodes[i];
    const link = { m: n.rotation ? quatMat(n.rotation) : null, t: n.translation || null, s: n.scale || null };
    const next = chain.concat([link]);
    if (n.mesh !== undefined) {
      for (const prim of meshes[n.mesh].primitives || []) {
        const acc = accessors[prim.attributes && prim.attributes.POSITION];
        if (!acc || !acc.min || !acc.max) continue;
        for (let c = 0; c < 8; c++) { // all 8 box corners through the transform chain
          let v = [c & 1 ? acc.max[0] : acc.min[0], c & 2 ? acc.max[1] : acc.min[1],
                   c & 4 ? acc.max[2] : acc.min[2]];
          for (let k = next.length - 1; k >= 0; k--) v = apply(next[k].m, next[k].t, next[k].s, v);
          for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], v[a]); hi[a] = Math.max(hi[a], v[a]); }
        }
      }
    }
    (n.children || []).forEach(ch => walk(ch, next));
  })(idx, []);
  return { lo, hi, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}

/* ---- 1) every runtime group the loader maps must exist ---- */
const GROUPS = ['gear_hatchet', 'gear_pickaxe', 'gear_sword', 'gear_dagger',
                'gear_shortbow', 'gear_shield', 'gear_helm'];
ok(byName['worn_gear_starter_v1'] !== undefined, 'root node worn_gear_starter_v1 present');
for (const g of GROUPS) ok(byName[g] !== undefined, `node ${g} present`);

/* ---- 2) the loader's sanity band + per-item orientation conventions ---- */
const B = {}; GROUPS.forEach(g => { if (byName[g] !== undefined) B[g] = subtreeBounds(byName[g]); });
for (const g of GROUPS) {
  if (!B[g]) continue;
  const d = Math.max(...B[g].size);
  ok(d >= 0.25 && d <= 1.4, `${g} largest dimension ${d.toFixed(2)} within the loader's 0.25-1.4 band`);
}
// blades/hafts run along game +Y (glTF +Y): height is the dominant axis
for (const g of ['gear_sword', 'gear_dagger', 'gear_shortbow']) {
  if (!B[g]) continue;
  ok(B[g].size[1] >= B[g].size[0] && B[g].size[1] >= B[g].size[2],
     `${g} blade/stave axis is +Y (GearFit longest-axis rule)`);
}
ok(B.gear_sword && Math.abs(B.gear_sword.size[1] - 1.09) < 0.12, 'sword length ~1.09 (matches procedural fit)');
// hatchet/pickaxe working edge reaches toward +X past the haft line
ok(B.gear_hatchet && B.gear_hatchet.hi[0] > 0.18, 'hatchet bit extends toward +X');
ok(B.gear_pickaxe && B.gear_pickaxe.hi[0] > 0.22, 'pickaxe point extends toward +X');
// shield face normal is X: the X extent is its THINNEST axis (GearFit thin-axis rule)
ok(B.gear_shield && B.gear_shield.size[0] < B.gear_shield.size[1] &&
   B.gear_shield.size[0] < B.gear_shield.size[2], 'shield thinnest axis is X (face normal +X)');
// helm: face opening toward game +Z (nasal bar in front), cheek guards dip below the band base
ok(B.gear_helm && B.gear_helm.hi[2] > 0.19, 'helm nasal/front reaches +Z');
ok(B.gear_helm && B.gear_helm.lo[1] < -0.05, 'helm cheek guards drop below the brow-band origin');
// grips authored at the origin: every held item's bounds straddle (0,0)
for (const g of ['gear_hatchet', 'gear_pickaxe', 'gear_sword', 'gear_dagger', 'gear_shortbow']) {
  if (!B[g]) continue;
  ok(B[g].lo[1] < 0 && B[g].hi[1] > 0, `${g} grip origin inside its Y extent`);
}

/* ---- 3) tier-recolor materials the loader keys on ---- */
const matNames = new Set((doc.materials || []).map(m => m.name));
for (const m of ['CR_GEAR_METAL', 'CR_GEAR_METAL_EDGE', 'CR_GEAR_METAL_DARK'])
  ok(matNames.has(m), `recolor material ${m} present`);

console.log(fail === 0 ? `ALL PASS — ${pass} passed` : `${pass} passed, ${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
