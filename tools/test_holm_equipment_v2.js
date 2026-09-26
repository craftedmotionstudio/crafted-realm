/* Holm equipment v2 contract (tools/blender/build_holm_equipment_v2.py -> the published equipment.glb):
 *  - every worn suit is a 'skin' template per body type (eq_<kind>, eq_<kind>_B) skinned to the 23-joint kit skeleton,
 *    with the kit's own inverse bind matrices (the runtime rebinds it to the player's bones with the kit's matrices);
 *  - morph targets: Build_Stout / Build_Slim on every suit, Feet_* on boots, Over_<body armour> + Over_Torso_* on the
 *    amulet and cape; extras.hides / extras.kit_morphs as the runtime expects;
 *  - the character kit carries Hair_Over / Jaw_Over on every hair / beard part (kit v3.1e);
 *  - src/holm_equipment.js loads the v2 GLB (published path) and HolmKit honours hides + kit morphs.
 * Run: node tools/test_holm_equipment_v2.js */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };
function glb(p) {
  const b = fs.readFileSync(p), jl = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
  const binStart = 20 + jl + 8;
  const acc = i => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], off = binStart + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const n = a.count * 16; const out = new Float32Array(n); for (let k = 0; k < n; k++) out[k] = b.readFloatLE(off + k * 4); return out; };
  return { json, acc };
}
const EQ = path.join(ROOT, 'assets/holm_island/ws/holm-equipment-v2/candidates/equipment.glb');
const KIT = path.join(ROOT, 'assets/models/holm_kit_v2.glb');
ok(fs.existsSync(EQ), 'published equipment.glb exists');
const E = glb(EQ), K = glb(KIT);
const nodes = E.json.nodes, byName = {}; nodes.forEach((n, i) => { byName[n.name] = i; });
const SUITS = ['platebody', 'chainbody', 'leather_body', 'platelegs', 'plateskirt', 'chaps', 'gloves', 'boots', 'amulet', 'cape'];
const HELD = ['dagger', 'sword', 'longsword', 'sabre', 'greatsword', 'mace', 'warhammer', 'battleaxe', 'hatchet', 'pickaxe', 'shortbow', 'longbow',
  'staff', 'round_shield', 'sqshield', 'kiteshield', 'arrow', 'fullhelm', 'medhelm', 'hat'];
HELD.forEach(k => ok(byName['eq_' + k] !== undefined, 'template eq_' + k));
const kitJoints = K.json.skins[0].joints.map(j => K.json.nodes[j].name);
const kitIbm = K.acc(K.json.skins[0].inverseBindMatrices);
SUITS.forEach(k => ['', '_B'].forEach(sfx => {
  const i = byName['eq_' + k + sfx]; ok(i !== undefined, 'skin template eq_' + k + sfx); if (i === undefined) return;
  const n = nodes[i], ex = n.extras || {};
  ok(ex.eq_kind === k && ex.frame === 'skin' && ex.body === (sfx ? 'B' : 'A'), k + sfx + ' extras kind / frame / body');
  ok(n.skin !== undefined, k + sfx + ' is skinned');
  const sk = E.json.skins[n.skin], joints = sk.joints.map(j => nodes[j].name);
  ok(joints.length === 23 && joints.every((nm, q) => nm === kitJoints[q]), k + sfx + ' joints = the kit skeleton');
  const ibm = E.acc(sk.inverseBindMatrices); let d = 0; for (let q = 0; q < ibm.length; q++) d = Math.max(d, Math.abs(ibm[q] - kitIbm[q]));
  ok(d < 1e-4, k + sfx + ' inverse bind matrices = the kit\'s (max diff ' + d.toExponential(1) + ')');
  const tn = (E.json.meshes[n.mesh].extras || {}).targetNames || [];
  ok(tn.includes('Build_Stout') && tn.includes('Build_Slim'), k + sfx + ' carries the build morphs');
  if (k === 'boots') ok(tn.includes('Feet_Small') && tn.includes('Feet_Large'), 'boots carry the feet morphs');
  if (k === 'amulet' || k === 'cape') ok(['platebody', 'chainbody', 'leather_body'].every(a => tn.includes('Over_' + a)), k + sfx + ' carries Over_<body armour>');
  const hides = { platebody: ['Torso', 'Arms'], chainbody: ['Torso', 'Arms'], leather_body: ['Torso', 'Arms'], platelegs: ['Legs'], chaps: ['Legs'],
    gloves: ['Hands'], boots: ['Feet'] }[k] || [];
  ok(JSON.stringify(ex.hides || []) === JSON.stringify(hides), k + sfx + ' hides ' + JSON.stringify(hides));
  const km = ['platebody', 'chainbody', 'leather_body', 'cape'].includes(k) ? ['Hair_Over', 'Jaw_Over'] : [];
  ok(JSON.stringify(ex.kit_morphs || []) === JSON.stringify(km), k + sfx + ' kit_morphs ' + JSON.stringify(km));
}));
['fullhelm', 'medhelm', 'hat'].forEach(k => ok(JSON.stringify((nodes[byName['eq_' + k]].extras || {}).hides) === '["Hair"]', k + ' shows the bald head'));
// the kit: every hair / beard part carries Hair_Over / Jaw_Over
const kitMeshes = K.json.nodes.filter(n => /^Kit_[AB]_(Hair|Jaw)_\d+$/.test(n.name || '') && n.mesh !== undefined);
ok(kitMeshes.length >= 25, 'kit hair / beard parts found (' + kitMeshes.length + ')');
kitMeshes.forEach(n => { const tn = (K.json.meshes[n.mesh].extras || {}).targetNames || [], want = /_Hair_/.test(n.name) ? 'Hair_Over' : 'Jaw_Over';
  ok(tn.includes(want), n.name + ' carries ' + want); });
// runtime wiring
const he = fs.readFileSync(path.join(ROOT, 'src/holm_equipment.js'), 'utf8'), hk = fs.readFileSync(path.join(ROOT, 'src/holm_kit.js'), 'utf8');
ok(/holm-equipment-v2\/candidates\/equipment\.glb/.test(he), 'holm_equipment.js loads the v2 GLB');
ok(/function fitSkin/.test(he) && /\.bind\(new THREE\.Skeleton/.test(he), 'skin templates are rebound to the rig skeleton');
ok(/hiddenSlots/.test(hk) && /Hair_Over/.test(hk), 'HolmKit.apply honours hides and the kit morphs');
ok(/holm-equipment-v2\/candidates/.test(fs.readFileSync(path.join(ROOT, 'tools/publish_holm_island.js'), 'utf8')), 'publish list carries holm-equipment-v2');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
