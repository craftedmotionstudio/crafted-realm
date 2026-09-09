// CR-CLAUDE-AUTO-008C numeric probe: runs the REAL updateRoofs() extracted from
// src/game2_world.js against the live acceptance case + negatives. Not shipped.
const fs = require('fs');
const src = fs.readFileSync('src/game2_world.js', 'utf8');
const start = src.indexOf('function updateRoofs');
const end = src.indexOf('/* ---------- skeleton');
if (start < 0 || end < 0 || end <= start) { console.error('extract failed'); process.exit(1); }
eval(src.slice(start, end)); // defines updateRoofs with our stub globals below

globalThis.WORLD = { roofs: [], roofsOff: false };
globalThis.player = { position: { x: 0, z: 0 } };
globalThis.camera = { position: { x: 0, z: 0 } };
let out = [];
globalThis.RoofTransitions = { set: (m, w) => out.push(w) };

let fails = 0;
function probe(name, roof, cam, pl, expectOccluded) {
  out = [];
  WORLD.roofs = [roof];
  camera.position.x = cam[0]; camera.position.z = cam[1];
  player.position.x = pl[0]; player.position.z = pl[1];
  updateRoofs();
  const occluded = out[0] === false;
  const ok = occluded === expectOccluded;
  if (!ok) fails++;
  console.log((ok ? ' ok ' : 'FAIL') + '  ' + name + '  occluded=' + occluded + ' (expected ' + expectOccluded + ')');
}

const CAM = [169.603, 150.394], PL = [151, 169];
// Live acceptance case: Guide Hall hw=13 hd=12 must occlude (old radius-5 said false)
probe('Guide Hall live case (151,155) hw13 hd12', { mesh: {}, x: 151, z: 155, hw: 13, hd: 12 }, CAM, PL, true);
// Negatives
probe('box strictly behind camera (190,130)', { mesh: {}, x: 190, z: 130, hw: 13, hd: 12 }, CAM, PL, false);
probe('box strictly beyond player (130,192)', { mesh: {}, x: 130, z: 192, hw: 13, hd: 12 }, CAM, PL, false);
probe('off-axis box (170,170) hw3 hd3', { mesh: {}, x: 170, z: 170, hw: 3, hd: 3 }, CAM, PL, false);
// Legacy row (no hw/hd) keeps the 5-tile circle: same Guide Hall center stays visible
probe('legacy row same center, radius-5 path', { mesh: {}, x: 151, z: 155 }, CAM, PL, false);
// Legacy row that the circle DOES catch (center near the sight line)
probe('legacy row on sight line (160,160)', { mesh: {}, x: 160, z: 160 }, CAM, PL, true);
// Proximity rule preserved: within 7.5 tiles the roof hides regardless
probe('proximity <7.5 tiles hides (154,166) hw13 hd12', { mesh: {}, x: 154, z: 166, hw: 13, hd: 12 }, CAM, PL, true);
// roofsOff master toggle still hides everything
WORLD.roofsOff = true;
probe('roofsOff hides far roof (130,192)', { mesh: {}, x: 130, z: 192, hw: 13, hd: 12 }, CAM, PL, true);
WORLD.roofsOff = false;

console.log(fails ? 'PROBE FAIL (' + fails + ')' : 'PROBE PASS 8/8');
process.exit(fails ? 1 : 0);
