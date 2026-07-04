/* ================= PAVING / SIDEWALK TILES ================= */
/* Low-poly, flat-shaded PAVING / SIDEWALK tile builders for OSRS town centres.
   Owned by the sidewalks agent workstream (WORLD_QUALITY §F). This file only
   BUILDS the models and exposes reusable global builders — it does NOT place any
   paving into the live village (that is a deliberate, eyes-on main-session task).

   Convention: each builder is  function makePavingX(x, z, rot) -> THREE.Group
   - The returned group is a THIN, flat tile that sits at ground level (top facets
     at y ~ 0.03-0.09), footprint ~1 world unit = 1 tile.
   - x,z position the group; y is seated on terrain via gy() when available, else 0.
   - rot (radians) spins the tile about Y so a placer can vary the pattern.
   - NO colliders are registered — paving is fully walkable.
   - Chunky readable facets, warm grey stone palette; flatShading on every material.

   Three.js r128 in-game (global THREE). Materials are Lambert+flatShading so they
   also render fine in the r160 tool viewers. Safe to load AFTER game2_world.js
   (uses gy()/mat() only if present, otherwise self-contained fallbacks). */

/* ---- self-contained helpers (do not depend on game2 being loaded) ---- */
var _PAVE_MATS = {};
function pavMat(color, opts){
  // cached flat-shaded lambert; prefer the game's mat() palette hook if it exists
  var key = color + '|' + (opts ? JSON.stringify(opts) : '');
  if (_PAVE_MATS[key]) return _PAVE_MATS[key];
  var m = new THREE.MeshLambertMaterial(Object.assign({ color: color, flatShading: true }, opts || {}));
  _PAVE_MATS[key] = m;
  return m;
}
function pavGround(x, z){ return (typeof gy === 'function') ? gy(x, z) : 0; }
// small deterministic-ish jitter helper
function pavRand(a, b){ return a + Math.random() * (b - a); }

/* Warm town-stone palette (greys with a touch of warmth), plus mortar & dirt. */
var PAVE_PAL = {
  mortar:    0x4b463f,  // dark gap between stones
  stoneA:    0x9a938a,  // mid warm grey
  stoneB:    0xaba49a,  // light warm grey
  stoneC:    0x847d74,  // darker grey
  stoneD:    0xb8b1a6,  // pale slab
  brickA:    0x9c5842,  // warm terracotta brick
  brickB:    0x87472f,  // deeper brick
  brickC:    0xab6a4e,  // light brick
  dirt:      0x8a6f4c,  // worn path brown
  dirtDk:    0x6f5638,  // rut / damp brown
  pebble:    0x9d968c,  // scattered pebble grey
  kerb:      0xb2a99d,  // pale kerb stone
  moss:      0x5f6b3e   // faint moss accent
};

/* Register a group onto the scene at (x,z), seated on terrain, rotated by rot. */
function _pavSeat(g, x, z, rot){
  g.position.set(x, pavGround(x, z), z);
  if (rot) g.rotation.y = rot;
  g.traverse(function(o){ if (o.isMesh){ o.receiveShadow = true; o.castShadow = false; } });
  return g;
}

/* 1) FLAGSTONE — irregular grey slabs with dark mortar gaps (the OSRS town look). */
function makePavingFlagstone(x, z, rot){
  var g = new THREE.Group();
  // dark mortar base
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), pavMat(PAVE_PAL.mortar));
  base.position.y = 0.015; g.add(base);
  // irregular slabs on a jittered 3x3 lattice, each a squat flat box, slightly rotated
  var cols = [PAVE_PAL.stoneA, PAVE_PAL.stoneB, PAVE_PAL.stoneC, PAVE_PAL.stoneD];
  for (var i = 0; i < 3; i++){
    for (var j = 0; j < 3; j++){
      var cx = -0.33 + i * 0.33;
      var cz = -0.33 + j * 0.33;
      var w = pavRand(0.22, 0.30), d = pavRand(0.22, 0.30);
      var s = new THREE.Mesh(new THREE.BoxGeometry(w, pavRand(0.035, 0.06), d),
        pavMat(cols[(i * 3 + j) % cols.length]));
      s.position.set(cx + pavRand(-0.02, 0.02), 0.04, cz + pavRand(-0.02, 0.02));
      s.rotation.y = pavRand(-0.18, 0.18);
      g.add(s);
    }
  }
  return _pavSeat(g, x, z, rot);
}

/* 2) BRICK HERRINGBONE — warm terracotta bricks laid in a herringbone weave. */
function makePavingBrickHerringbone(x, z, rot){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), pavMat(PAVE_PAL.brickB));
  base.position.y = 0.015; g.add(base);
  var cols = [PAVE_PAL.brickA, PAVE_PAL.brickC, PAVE_PAL.brickA];
  var bl = 0.30, bw = 0.11, k = 0;
  // herringbone: alternate +45/-45 bricks over a grid
  for (var i = 0; i < 4; i++){
    for (var j = 0; j < 4; j++){
      var cx = -0.36 + i * 0.24;
      var cz = -0.36 + j * 0.24;
      var flip = ((i + j) % 2) === 0;
      var b = new THREE.Mesh(new THREE.BoxGeometry(bl, 0.05, bw), pavMat(cols[k++ % cols.length]));
      b.position.set(cx, 0.045, cz);
      b.rotation.y = flip ? Math.PI / 4 : -Math.PI / 4;
      g.add(b);
    }
  }
  return _pavSeat(g, x, z, rot);
}

/* 3) COBBLESTONE — packed rounded river cobbles, chunky low-poly domes. */
function makePavingCobble(x, z, rot){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), pavMat(PAVE_PAL.mortar));
  base.position.y = 0.015; g.add(base);
  var cols = [PAVE_PAL.stoneA, PAVE_PAL.stoneB, PAVE_PAL.stoneC, PAVE_PAL.pebble];
  for (var i = 0; i < 4; i++){
    for (var j = 0; j < 4; j++){
      var cx = -0.375 + i * 0.25 + pavRand(-0.03, 0.03);
      var cz = -0.375 + j * 0.25 + pavRand(-0.03, 0.03);
      // low icosahedron dome = rounded cobble, flattened
      var c = new THREE.Mesh(new THREE.IcosahedronGeometry(pavRand(0.10, 0.14), 0),
        pavMat(cols[(i + j * 4) % cols.length]));
      c.scale.y = 0.5;
      c.position.set(cx, 0.05, cz);
      c.rotation.y = pavRand(0, 6.28);
      g.add(c);
    }
  }
  return _pavSeat(g, x, z, rot);
}

/* 4) CUT-STONE PLAZA — neat pale ashlar slabs, 3x3 grid with tidy mortar joints. */
function makePavingCutStone(x, z, rot){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), pavMat(PAVE_PAL.mortar));
  base.position.y = 0.015; g.add(base);
  var cols = [PAVE_PAL.stoneD, PAVE_PAL.stoneB, PAVE_PAL.stoneD, PAVE_PAL.stoneB];
  for (var i = 0; i < 3; i++){
    for (var j = 0; j < 3; j++){
      var cx = -0.32 + i * 0.32;
      var cz = -0.32 + j * 0.32;
      var s = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.055, 0.29),
        pavMat(cols[(i * 3 + j) % cols.length]));
      s.position.set(cx, 0.045, cz);
      g.add(s);
    }
  }
  return _pavSeat(g, x, z, rot);
}

/* 5) KERB / BORDERED PATH EDGE — a path strip with a raised pale kerb along one edge.
   Orient with rot so the kerb faces the grass; footprint 1x1. */
function makePavingKerb(x, z, rot){
  var g = new THREE.Group();
  // path bed (cut stone) fills the tile
  var bed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.0), pavMat(PAVE_PAL.stoneC));
  bed.position.y = 0.02; g.add(bed);
  // three flat slabs across the bed for a walked-path read
  for (var i = 0; i < 3; i++){
    var sl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.26), pavMat(i % 2 ? PAVE_PAL.stoneB : PAVE_PAL.stoneD));
    sl.position.set(0, 0.045, -0.30 + i * 0.30); g.add(sl);
  }
  // raised kerb stones along the +z edge (a run of blocks)
  for (var b = 0; b < 4; b++){
    var kb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), pavMat(PAVE_PAL.kerb));
    kb.position.set(-0.36 + b * 0.24, 0.09, 0.44); g.add(kb);
  }
  return _pavSeat(g, x, z, rot);
}

/* 6) WORN DIRT PATH — trampled brown earth with a rut and scattered pebbles. */
function makePavingDirt(x, z, rot){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 1.0), pavMat(PAVE_PAL.dirt));
  base.position.y = 0.0125; g.add(base);
  // damp central rut, slightly sunk & darker
  var rut = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.34), pavMat(PAVE_PAL.dirtDk));
  rut.position.set(0, 0.02, pavRand(-0.08, 0.08)); rut.rotation.y = pavRand(-0.1, 0.1); g.add(rut);
  // scattered pebbles pressed into the mud
  for (var i = 0; i < 7; i++){
    var p = new THREE.Mesh(new THREE.IcosahedronGeometry(pavRand(0.03, 0.06), 0), pavMat(PAVE_PAL.pebble));
    p.scale.y = 0.5;
    p.position.set(pavRand(-0.42, 0.42), 0.03, pavRand(-0.42, 0.42));
    g.add(p);
  }
  return _pavSeat(g, x, z, rot);
}

/* 7) CENTRE MEDALLION — decorative radial stone rosette for a plaza centrepiece. */
function makePavingMedallion(x, z, rot){
  var g = new THREE.Group();
  // outer disc (mortar ring)
  var outer = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), pavMat(PAVE_PAL.mortar));
  outer.position.y = 0.015; g.add(outer);
  // ring of wedge slabs
  var seg = 8;
  for (var i = 0; i < seg; i++){
    var ang = (i / seg) * Math.PI * 2;
    var wedge = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.14),
      pavMat(i % 2 ? PAVE_PAL.stoneB : PAVE_PAL.stoneD));
    wedge.position.set(Math.cos(ang) * 0.30, 0.045, Math.sin(ang) * 0.30);
    wedge.rotation.y = -ang;
    g.add(wedge);
  }
  // inner ring band
  var ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 4, 16), pavMat(PAVE_PAL.stoneC));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  // centre boss
  var boss = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.07, 8), pavMat(PAVE_PAL.stoneD));
  boss.position.y = 0.05; g.add(boss);
  return _pavSeat(g, x, z, rot);
}

/* 8) MOSSY FLAGSTONE — flagstone variant weathered with faint moss in the joints. */
function makePavingMossy(x, z, rot){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 1.0), pavMat(PAVE_PAL.moss));
  base.position.y = 0.015; g.add(base);
  var cols = [PAVE_PAL.stoneC, PAVE_PAL.stoneA, PAVE_PAL.stoneC, PAVE_PAL.stoneB];
  for (var i = 0; i < 3; i++){
    for (var j = 0; j < 3; j++){
      var cx = -0.33 + i * 0.33, cz = -0.33 + j * 0.33;
      var s = new THREE.Mesh(new THREE.BoxGeometry(pavRand(0.24, 0.30), pavRand(0.035, 0.055), pavRand(0.24, 0.30)),
        pavMat(cols[(i * 3 + j) % cols.length]));
      s.position.set(cx + pavRand(-0.015, 0.015), 0.038, cz + pavRand(-0.015, 0.015));
      s.rotation.y = pavRand(-0.12, 0.12);
      g.add(s);
    }
  }
  // a couple of moss tufts creeping over
  for (var m = 0; m < 3; m++){
    var t = new THREE.Mesh(new THREE.IcosahedronGeometry(pavRand(0.05, 0.08), 0), pavMat(PAVE_PAL.moss));
    t.scale.y = 0.4; t.position.set(pavRand(-0.4, 0.4), 0.055, pavRand(-0.4, 0.4)); g.add(t);
  }
  return _pavSeat(g, x, z, rot);
}

/* Reusable registry so a placer can pick by name or iterate the whole set. */
var PAVING_BUILDERS = {
  flagstone:  makePavingFlagstone,
  herringbone: makePavingBrickHerringbone,
  cobble:     makePavingCobble,
  cutstone:   makePavingCutStone,
  kerb:       makePavingKerb,
  dirt:       makePavingDirt,
  medallion:  makePavingMedallion,
  mossy:      makePavingMossy
};

/* ---- self-booting demo row FAR off-map (x~300, z~300) for screenshotting ----
   Purely a review aid: lays one of every tile in a labelled row so the parent can
   teleport there and gate with gemini_vision. Never touches the playable village. */
function bootPavingDemo(){
  if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return false;
  if (scene.getObjectByName('__paving_demo__')) return true;
  var row = new THREE.Group();
  row.name = '__paving_demo__';
  var names = Object.keys(PAVING_BUILDERS);
  var x0 = 300, z0 = 300;
  for (var i = 0; i < names.length; i++){
    // build a small 2x2 patch of each so the tiling reads
    for (var a = 0; a < 2; a++){
      for (var b = 0; b < 2; b++){
        var tile = PAVING_BUILDERS[names[i]](x0 + i * 2 + a, z0 + b, 0);
        // demo sits at flat y=0 patch regardless of terrain, for a clean screenshot
        tile.position.y = 0.01;
        row.add(tile);
      }
    }
  }
  scene.add(row);
  if (typeof console !== 'undefined') console.log('[paving] demo row placed at x=300,z=300 —', names.join(', '));
  return true;
}
// try to boot once the scene exists; retry a few times without blocking
(function pavPoll(n){
  if (bootPavingDemo()) return;
  if (n <= 0) return;
  if (typeof setTimeout === 'function') setTimeout(function(){ pavPoll(n - 1); }, 800);
})(15);
