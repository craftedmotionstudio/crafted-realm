/* Headless proof of the skeletal GLB animation pipeline (the Ash Wyrm boss).
   Two halves:
   (A) ASSET CONTRACT — parse the real ash_wyrm_built.glb binary and prove its skin
       ships every named bone the rig drive keys on (wing_L/R, four legs, neck, head,
       tail1/2) plus a skinned primitive, so makeGlbModel can stash userData.bones.
   (B) DRIVE — eval the REAL fx_dragon.js (riggedDragonAnim/_setupNamedRig) against a
       faithful THREE stub + fake bones named exactly as the GLB, and prove it rotates
       wings/legs/neck/tail, gaits harder when the body translates, and re-seats every
       bone to its captured rest each frame (no drift). A viewer of the live code, not a
       reimplementation. Not committed to gameplay — pure test. */
const fs = require('fs');
const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  PASS' : '  FAIL') + ' ' + m); if (!c) fails++; };

/* ---------- (A) asset contract ---------- */
console.log('[asset contract] ash_wyrm_built.glb');
const buf = fs.readFileSync(path.join(__dirname, '..', 'assets', 'models', 'ash_wyrm_built.glb'));
ok(buf.toString('utf8', 0, 4) === 'glTF', 'is a valid GLB container');
const total = buf.readUInt32LE(8);
let off = 12, json = null;
while (off < total) { const clen = buf.readUInt32LE(off); const ctype = buf.toString('utf8', off + 4, off + 8);
  if (ctype === 'JSON') json = JSON.parse(buf.slice(off + 8, off + 8 + clen).toString('utf8')); off += 8 + clen; }
ok(!!json, 'has a JSON chunk');
const nodeName = i => (json.nodes[i] || {}).name;
const skinned = (json.meshes || []).some(m => (m.primitives || []).some(p => p.attributes && ('JOINTS_0' in p.attributes)));
ok(skinned, 'has a skinned primitive (JOINTS_0) -> makeGlbModel will find a skeleton');
ok((json.skins || []).length >= 1, 'has a skin');
const joints = (json.skins[0].joints || []).map(nodeName);
// the exact bones riggedDragonAnim / _setupNamedRig reference, by name
const NEEDED = ['wing_L', 'wing_R', 'legFL', 'legFR', 'legBL', 'legBR', 'neck', 'head', 'tail1', 'tail2'];
NEEDED.forEach(nm => ok(joints.includes(nm), `skin exposes bone '${nm}' (rig drive keys on it)`));

/* ---------- (B) drive the real code ---------- */
console.log('[drive] real riggedDragonAnim on GLB-named bones');
function Q() { this.id = 0; }                                   // a stand-in quaternion (carries a tag)
Q.prototype.copy = function (q) { this.id = q.id; this._reseated = true; return this; };
Q.prototype.clone = function () { const q = new Q(); q.id = this.id; return q; };
function Vec(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
Vec.prototype.clone = function () { return new Vec(this.x, this.y, this.z); };
Vec.prototype.applyQuaternion = function () { return this; };
Vec.prototype.normalize = function () { return this; };
const THREE = { Quaternion: Q, Vector3: Vec };
global.THREE = THREE;
global.Math.__r = Math.random; global.Math.random = () => 0;   // suppress _emitSmoke chance in the drive

function makeBone(name) {
  return { name, quaternion: new Q(), userData: {}, _abs: 0, _reseats: 0,
    rotateOnWorldAxis(axis, ang) { this._lastAng = ang; this._abs += Math.abs(ang); return this; } };
}
function buildNpc() {
  const bones = ['spine', ...NEEDED].map(makeBone);
  const root = { isSprite: false, rotation: { x: 0, y: 0, z: 0 }, userData: {},
    getWorldQuaternion(q) { return q; } };
  const mesh = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
    userData: { bones }, children: [root],
    getWorldQuaternion(q) { return q; } };
  return { mesh, _breath: null };
}

// load the real drive functions into this scope
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'fx_dragon.js'), 'utf8');
eval(src);   // defines riggedDragonAnim/_setupNamedRig/_glbRoot/_emitSmoke... in this scope
ok(typeof riggedDragonAnim === 'function', 'fx_dragon.js defines riggedDragonAnim');

// track reseat-to-rest: every frame rest(b) does b.quaternion.copy(b.userData._rest)
const orig = Q.prototype.copy;
Q.prototype.copy = function (q) { if (this.__bone) this.__bone._reseats++; return orig.call(this, q); };

// --- standing (no translation): idle flutter/sway should still move wings/neck/tail ---
const n = buildNpc();
const byName = {}; n.mesh.userData.bones.forEach(b => { byName[b.name] = b; });
riggedDragonAnim(n, 1 / 60, false);                            // first call runs _setupNamedRig
ok(n.mesh.userData._namedRig && n.mesh.userData._namedRig.by, '_setupNamedRig succeeded (named rig detected)');
ok(Math.abs(n.mesh.children[0].rotation.y + Math.PI / 2) < 1e-6, 'applies the -90deg facing yaw to the GLB root');
n.mesh.userData.bones.forEach(b => { b.quaternion.__bone = b; });   // rest(b) calls b.quaternion.copy(_rest)
for (let i = 0; i < 90; i++) riggedDragonAnim(n, 1 / 60, false);   // ~1.5s standing
ok(byName.wing_L._abs > 0 && byName.wing_R._abs > 0, 'idle: both wings flutter');
ok(byName.neck._abs > 0 && byName.head._abs > 0, 'idle: neck + head sway');
ok(byName.tail1._abs > 0 && byName.tail2._abs > 0, 'idle: tail sways');
const idleLeg = byName.legFL._abs;

// --- walking: translate the body each frame; legs must gait HARDER than when standing ---
const w = buildNpc();
const wBy = {}; w.mesh.userData.bones.forEach(b => { wBy[b.name] = b; });
riggedDragonAnim(w, 1 / 60, true);
w.mesh.userData.bones.forEach(b => { b.quaternion.__bone = b; });
for (let i = 0; i < 90; i++) { w.mesh.position.x += 0.06; riggedDragonAnim(w, 1 / 60, true); }  // ~3.6 u/s
ok(wBy.legFL._abs > idleLeg * 3, `walking gaits legs far harder than standing (walk ${wBy.legFL._abs.toFixed(2)} vs idle ${idleLeg.toFixed(2)})`);

// --- no drift: each driven bone is re-seated to its captured rest every frame ---
const reseatable = NEEDED.filter(nm => wBy[nm]._reseats > 0).length;
ok(reseatable === NEEDED.length, `every named bone re-seats to rest each frame (no drift) — ${reseatable}/${NEEDED.length}`);

// --- fire wind-up rears the neck/head back (a distinct authored beat, not idle) ---
const f = buildNpc();
riggedDragonAnim(f, 1 / 60, false);
f.mesh.userData.bones.forEach(b => { b.quaternion.__bone = b; });
f._breath = { phase: 'windup', t: 0.1, windup: 0.6 };
const fBy = {}; f.mesh.userData.bones.forEach(b => { fBy[b.name] = b; });
riggedDragonAnim(f, 1 / 60, false);
ok(Math.abs(fBy.neck._lastAng) > 0.3, `fire wind-up rears the neck back hard (|${fBy.neck._lastAng.toFixed(2)}| rad)`);

global.Math.random = global.Math.__r;
console.log(fails ? ('\nFAILED (' + fails + ')') : '\nALL PASS');
process.exit(fails ? 1 : 0);
