/* ============ world_paved_plaza — PERFORMANT merged flagstone plaza ============
 * WORLD_QUALITY §"PAVING PLACEMENT": the first placement attempt carpeted ~500
 * multi-mesh paving tiles as separate groups → hard render freeze + huge draw-call
 * count. This file is the CORRECT approach: a plaza-paving GENERATOR that bakes every
 * tile's flagstone geometry into ONE merged THREE.BufferGeometry → ONE THREE.Mesh →
 * ONE draw call, with a single flat-shaded material. Per-slab tone variation is baked
 * into VERTEX COLORS so one material dresses the whole plaza.
 *
 * It does NOT guess world placement — the PARENT (eyes-on, main session) passes the
 * REAL walkable Commons plaza tile centres to makePavedPlaza() and adds the returned
 * mesh to the scene. This file only BUILDS geometry + exposes the global builder, and
 * self-boots a tiny far-off-map DEMO patch for screenshot gating.
 *
 * Three.js r128 in-game (global THREE). Prefers THREE.BufferGeometryUtils.mergeBuffer-
 * Geometries when present; otherwise falls back to a self-contained inline attribute
 * concatenation (position/normal/color) so it never depends on the utils being loaded.
 *
 * API:  makePavedPlaza(tiles, opts) -> THREE.Mesh
 *   tiles : array of tile centres { x, z, y }   (y optional, defaults 0)
 *   opts  : { seed?, slabH?, baseH?, jitter?, mortar?, palette? }  (all optional)
 *   returns ONE flat-shaded, vertex-coloured mesh (caller does scene.add(mesh)).
 *   No colliders are registered — paving is fully walkable.
 */
(function(){
  'use strict';

  /* warm/grey flagstone palette expressed as HSL anchors (hue, sat, lit) so we can
     jitter tone per-slab cheaply into vertex colours. Slightly warm greys + a dark
     mortar. Caller may override via opts.palette. */
  var DEF_PAL = {
    mortar: { h: 0.09, s: 0.10, l: 0.20 },   // dark warm gap between slabs
    slabs: [
      { h: 0.09, s: 0.07, l: 0.56 },         // mid warm grey
      { h: 0.10, s: 0.09, l: 0.62 },         // light warm grey
      { h: 0.08, s: 0.06, l: 0.48 },         // darker grey
      { h: 0.10, s: 0.05, l: 0.66 }          // pale slab
    ]
  };

  /* small deterministic LCG so a given tile set + seed paves identically every load */
  function mkRnd(seed){
    var s = (seed | 0) || 0x9e3779b1;
    return function(){ s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  }

  /* build ONE non-indexed, vertex-coloured box baked to world coords.
     rotY spins about Y before translate; (r,g,b) is the flat slab tone. Dropping uv
     keeps the attribute set minimal + identical across every part so both the utils
     merge and the inline merge concatenate cleanly. */
  function coloredBox(w, h, d, cx, cy, cz, rotY, r, g, b){
    var box = new THREE.BoxGeometry(w, h, d);
    if (rotY) box.rotateY(rotY);
    box.translate(cx, cy, cz);
    var ng = box.toNonIndexed();
    box.dispose && box.dispose();
    if (ng.attributes.uv) ng.deleteAttribute('uv');
    var n = ng.attributes.position.count;
    var col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++){ col[i*3] = r; col[i*3+1] = g; col[i*3+2] = b; }
    ng.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return ng;
  }

  /* merge a list of non-indexed geometries (position/normal/color) into one.
     Prefers THREE.BufferGeometryUtils; inline fallback is fully self-contained. */
  function mergeGeos(list){
    var BGU = (typeof THREE !== 'undefined') && THREE.BufferGeometryUtils;
    if (BGU && typeof BGU.mergeBufferGeometries === 'function'){
      var merged = BGU.mergeBufferGeometries(list, false);
      if (merged) return merged;
    }
    // ---- inline merge: concatenate matching BufferAttributes ----
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].attributes.position.count;
    var pos = new Float32Array(total * 3);
    var nor = new Float32Array(total * 3);
    var col = new Float32Array(total * 3);
    var o = 0;
    for (i = 0; i < list.length; i++){
      var g = list[i];
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array,   o * 3);
      col.set(g.attributes.color.array,    o * 3);
      o += g.attributes.position.count;
    }
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal',   new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    return out;
  }

  /* ============ PUBLIC: makePavedPlaza(tiles, opts) -> THREE.Mesh ============ */
  function makePavedPlaza(tiles, opts){
    opts = opts || {};
    if (!tiles || !tiles.length) { console.warn('[paved-plaza] no tiles given'); return null; }
    var pal    = opts.palette || DEF_PAL;
    var slabH  = (opts.slabH  != null) ? opts.slabH  : 0.05;   // slab thickness
    var baseH  = (opts.baseH  != null) ? opts.baseH  : 0.03;   // mortar base thickness
    var jitter = (opts.jitter != null) ? opts.jitter : 1;      // 0 disables tone/pos jitter
    var wantMortar = opts.mortar !== false;                    // mortar base on by default
    var rnd = mkRnd(opts.seed);

    var t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    var parts = [];
    var tmp = new THREE.Color();

    for (var ti = 0; ti < tiles.length; ti++){
      var tx = tiles[ti].x || 0;
      var tz = tiles[ti].z || 0;
      var ty = (tiles[ti].y != null) ? tiles[ti].y : 0;

      // dark mortar base fills the whole 1x1 tile (top at ty + baseH)
      if (wantMortar){
        tmp.setHSL(pal.mortar.h, pal.mortar.s, pal.mortar.l);
        parts.push(coloredBox(1.0, baseH, 1.0, tx, ty + baseH * 0.5, tz, 0,
          tmp.r, tmp.g, tmp.b));
      }

      // a few irregular flagstone slabs on a jittered 3x3 lattice; slabs sit ON the
      // mortar (top at ty + baseH + slabH) with per-slab tone + slight pos/rot jitter
      var slabTopY = ty + baseH + slabH * 0.5;
      for (var i = 0; i < 3; i++){
        for (var j = 0; j < 3; j++){
          var toneA = pal.slabs[(i * 3 + j) % pal.slabs.length];
          var shade = jitter ? (0.90 + rnd() * 0.20) : 1;      // micro value jitter
          var hj = jitter ? (rnd() - 0.5) * 0.02 : 0;
          tmp.setHSL(
            toneA.h + hj,
            toneA.s,
            Math.max(0, Math.min(1, toneA.l * shade))
          );
          var w = 0.24 + (jitter ? rnd() * 0.06 : 0.05);       // slab footprint ~0.24-0.30
          var d = 0.24 + (jitter ? rnd() * 0.06 : 0.05);
          var cx = tx - 0.33 + i * 0.33 + (jitter ? (rnd() - 0.5) * 0.04 : 0);
          var cz = tz - 0.33 + j * 0.33 + (jitter ? (rnd() - 0.5) * 0.04 : 0);
          var rot = jitter ? (rnd() - 0.5) * 0.34 : 0;         // slight in-plane rotation
          parts.push(coloredBox(w, slabH, d, cx, slabTopY, cz, rot,
            tmp.r, tmp.g, tmp.b));
        }
      }
    }

    var geo = mergeGeos(parts);
    // free the per-part buffers now they are baked into the merged geometry
    for (var p = 0; p < parts.length; p++){ parts[p].dispose && parts[p].dispose(); }

    var mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'paved_plaza';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;

    var t1 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    console.log('[paved-plaza] paved ' + tiles.length + ' tiles → 1 merged mesh (' +
      geo.attributes.position.count + ' verts) in ' + (t1 - t0).toFixed(1) + 'ms');
    return mesh;
  }

  // expose the builder on window so both in-file callers and javascript_tool see it
  if (typeof window !== 'undefined') window.makePavedPlaza = makePavedPlaza;

  /* ---- self-booting DEMO: a 12x12 paved patch FAR off-map at x=300,z=310, flat y=0,
     so the parent can teleport/screenshot it for the gemini gate. Never touches the
     playable village. ---- */
  function bootPlazaDemo(){
    if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return false;
    if (scene.getObjectByName('__paved_plaza_demo__')) return true;
    var tiles = [];
    var X0 = 300, Z0 = 310, N = 12;
    for (var i = 0; i < N; i++){
      for (var j = 0; j < N; j++){
        tiles.push({ x: X0 + i, z: Z0 + j, y: 0 });
      }
    }
    var mesh = makePavedPlaza(tiles, { seed: 1337 });
    if (!mesh) return false;
    mesh.name = '__paved_plaza_demo__';
    scene.add(mesh);
    console.log('[paved-plaza] demo ' + N + 'x' + N + ' patch placed at x=' + X0 +
      ',z=' + Z0 + ' (flat y=0) — 1 draw call');
    return true;
  }

  // poll for the scene without blocking (same discipline as the other prop files)
  (function poll(n){
    try { if (bootPlazaDemo()) return; } catch(e){ console.error('[paved-plaza]', e); return; }
    if (n <= 0) return;
    if (typeof setTimeout === 'function') setTimeout(function(){ poll(n - 1); }, 900);
  })(20);

})();
