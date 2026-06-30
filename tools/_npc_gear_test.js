/* throwaway harness: prove the WORN-ARMOUR pass for humanoid NPCs.
 *
 * Humanoid NPCs (Hold Knight, Bryn raider, Gravewight, ...) shared one body with only a
 * colour/robe/hat/weapon tint — a "Knight" stood in a plain tunic. This run lets a type opt
 * into real worn gear (helm / shield / body+leg plate) via the SAME builders the player uses,
 * so an armoured NPC reads identically to an armoured player.
 *
 * This harness does NOT reimplement the builders: it extracts the REAL helmMesh / shieldMesh /
 * bodyArmorMesh / legArmorMesh + the METALS table straight out of src/game2_world.js source,
 * runs them under a THREE stub, then mirrors the exact attach block added to humanoid() to prove:
 *   (1) every builder yields a non-empty mesh group;
 *   (2) the data metals (steel/iron/leather) resolve to real METALS colours that flow into the mesh;
 *   (3) the attach hides the bare-head hair (cap2/fringe/back) and parents the helm to headTop;
 *   (4) body + leg plate parent to the rig root and the leg plate hides the cloth leg meshes;
 *   (5) the shield parents to handL (so blockReact's armL guard carries it up) and faces outward.
 * Pure read of real source; mutates nothing; touches no game file.
 */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'game2_world.js'), 'utf8');

let pass = 0, fail = 0;
const ok  = (c, m) => { if (c) { pass++; } else { fail++; console.log('  FAIL:', m); } };

/* ---- minimal THREE stub: geometries record their args, meshes/groups form a tree ---- */
function V(){ this.x=0; this.y=0; this.z=0; }
V.prototype.set = function(x,y,z){ this.x=x; this.y=y; this.z=z; return this; };
V.prototype.setScalar = function(s){ this.x=s; this.y=s; this.z=s; return this; };
function node(){ this.position=new V(); this.rotation=new V(); this.scale=new V(); this.scale.set(1,1,1);
  this.children=[]; this.userData={}; this.visible=true;
  this.add=function(c){ this.children.push(c); return this; }; }
function Mesh(geo, material){ node.call(this); this.geometry=geo; this.material=material; this.isMesh=true; this.castShadow=false; }
function Group(){ node.call(this); }
function geo(){ this.args = Array.from(arguments); }
function MeshLambertMaterial(o){ Object.assign(this, o); this.lambert = true; }
function MeshBasicMaterial(o){ Object.assign(this, o); this.basic = true; }
const THREE = {
  Mesh, Group,
  SphereGeometry: geo, CylinderGeometry: geo, BoxGeometry: geo, TorusGeometry: geo,
  ConeGeometry: geo, OctahedronGeometry: geo,
  MeshLambertMaterial, MeshBasicMaterial,
};
const mat = c => ({ color: c, isMat: true });
const countMeshes = g => { let n=0; (function walk(o){ if(o.isMesh) n++; (o.children||[]).forEach(walk); })(g); return n; };
const anyColor = (g, col) => { let hit=false; (function walk(o){ if(o.material && o.material.color===col) hit=true; (o.children||[]).forEach(walk); })(g); return hit; };

/* ---- extract a top-level `function NAME(...) { ... }` from source by brace-matching ---- */
function extractFn(name){
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) return null;
  let i = SRC.indexOf('{', start), depth = 0;
  for (; i < SRC.length; i++){
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}'){ depth--; if (depth === 0){ return SRC.slice(start, i + 1); } }
  }
  return null;
}
const metalsLine = SRC.match(/const METALS\s*=\s*\{[\s\S]*?\};/);
ok(!!metalsLine, 'METALS table found in source');

const names = ['shieldMesh', 'helmMesh', 'bodyArmorMesh', 'legArmorMesh'];
const srcs = {}; for (const n of names){ srcs[n] = extractFn(n); ok(!!srcs[n], `extracted ${n} from source`); }

/* build the real builders in a stubbed context */
const body = metalsLine[0] + '\n' + names.map(n => srcs[n]).join('\n') +
  `\nreturn { shieldMesh, helmMesh, bodyArmorMesh, legArmorMesh, METALS };`;
const built = new Function('THREE', 'mat', body)(THREE, mat);
const { shieldMesh, helmMesh, bodyArmorMesh, legArmorMesh, METALS } = built;

/* (1) every builder yields a non-empty group */
ok(countMeshes(helmMesh(METALS.steel)) >= 2, 'helmMesh builds (dome+rim+ridge)');
ok(countMeshes(shieldMesh()) >= 3,            'shieldMesh builds (disc+rim+boss)');
ok(countMeshes(bodyArmorMesh(METALS.steel)) >= 3, 'bodyArmorMesh builds (chest+pads+trim)');

/* (2) the data metals all resolve + flow into the mesh colour */
for (const k of ['steel', 'iron', 'leather']) ok(typeof METALS[k] === 'number', `METALS.${k} is a real colour`);
ok(anyColor(helmMesh(METALS.steel), METALS.steel),       'steel helm carries the steel colour');
ok(anyColor(bodyArmorMesh(METALS.iron), METALS.iron),    'iron plate carries the iron colour');
ok(METALS.steel !== METALS.iron && METALS.iron !== METALS.leather, 'the three NPC metals are visually distinct');

/* ---- mirror of the attach block added to humanoid() (rig-local, same pivots) ---- */
function fakeRig(){
  const g = new Group();
  const parts = { headTop: new Group(), handL: new Group(), legL: new Group(), legR: new Group(),
                  legMeshL: new Mesh(geo(), mat(0)), legMeshR: new Mesh(geo(), mat(0)) };
  // hair the helm should hide
  const cap2 = new Mesh(geo(), mat(0)), fringe = new Mesh(geo(), mat(0)), back = new Mesh(geo(), mat(0));
  return { g, parts, cap2, fringe, back };
}
function applyGear(rig, opts){
  const { g, parts, cap2, fringe, back } = rig;
  if (opts.helm !== undefined){ cap2.visible=false; fringe.visible=false; back.visible=false;
    const hm = helmMesh(opts.helm); hm.position.y = -0.04; parts.headTop.add(hm); }
  if (!opts.robe && opts.armour !== undefined) g.add(bodyArmorMesh(opts.armour));
  if (!opts.robe && opts.legArmour !== undefined) g.add(legArmorMesh(opts.legArmour, parts));
  if (opts.shield){ const sh = shieldMesh(); sh.rotation.y = Math.PI/2; parts.handL.add(sh); }
}

/* (3) full-plate knight: helm hides hair + parents to headTop */
const knight = fakeRig();
applyGear(knight, { helm: METALS.steel, armour: METALS.steel, legArmour: METALS.steel, shield: true });
ok(knight.cap2.visible === false && knight.fringe.visible === false && knight.back.visible === false, 'helm hides bare-head hair (cap2/fringe/back)');
ok(knight.parts.headTop.children.length === 1, 'helm parents to headTop (rides the head pivot)');
ok(knight.parts.headTop.children[0].position.y === -0.04, 'helm seated at the crown offset');
/* (4) body + leg plate parent to the root; leg plate hides the cloth legs */
ok(knight.g.children.length === 2, 'body + leg plate parent to the rig root');
ok(knight.parts.legMeshL.visible === false && knight.parts.legMeshR.visible === false, 'leg plate hides the cloth leg meshes');
ok(knight.parts.legL.children.length === 1 && knight.parts.legR.children.length === 1, 'leg plate covers both leg pivots');
/* (5) shield parents to handL and faces outward */
ok(knight.parts.handL.children.length === 1, 'shield parents to handL (carried up by armL on a block)');
ok(Math.abs(knight.parts.handL.children[0].rotation.y - Math.PI/2) < 1e-9, 'shield faces outward (rot.y = pi/2)');

/* the raider: helm + leather, NO shield, NO leg plate (distinct silhouette from the knight) */
const raider = fakeRig();
applyGear(raider, { helm: METALS.iron, armour: METALS.leather });
ok(raider.parts.headTop.children.length === 1 && raider.parts.handL.children.length === 0, 'raider gets a helm but no shield');
ok(raider.parts.legMeshL.visible === true, 'raider keeps cloth legs (no leg plate) — reads lighter than the knight');

/* a robed caster must NEVER get body/leg plate even if asked (guarded by !opts.robe) */
const caster = fakeRig();
applyGear(caster, { robe: 0x35418f, armour: METALS.steel, legArmour: METALS.steel });
ok(caster.g.children.length === 0, 'robe suppresses body/leg plate (no plate over robes)');

console.log(`\n${fail ? 'SOME FAILED' : 'ALL PASS'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
