/* ============================================================================
 * ref_rowboat.js  —  window.makeRefRowboat(x, z, rot)
 * ----------------------------------------------------------------------------
 * A self-contained, OSRS-quality wooden rowboat rebuilt from Bible_References/
 * RowBoat.jpg.  Flat-shaded low-poly clinker hull that reads as a real boat
 * from the overhead camera:
 *   - tapered hull: pointed bow, rounded/squared stern
 *   - warm weathered gunwale rim ring (bright) over a dark shadowed interior
 *   - two-strake clinker outer skin (lapped plank ridge / chine)
 *   - planked interior floor with seam lines + raised central spine plank
 *   - two cross thwart seats
 *   - a pair of tan oars resting diagonally across the gunwales, with oarlocks
 *
 * Scale: 1 unit = 1 tile.  Footprint ~3.6 (length) x 1.72 (beam) units.
 * Returns a THREE.Group positioned at (x, 0, z), rotated `rot` rad about Y.
 * Does NOT auto-add to the scene — the caller adds it (self-contained/testable).
 * ==========================================================================*/
(function () {
  if (typeof THREE === 'undefined') { return; }

  window.makeRefRowboat = function (x, z, rot) {
    x = x || 0; z = z || 0; rot = rot || 0;

    // Match game2_world.js flat-shaded Phong "clay" look; fall back gracefully.
    const M = (c) => typeof mat === 'function'
      ? mat(c)
      : new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    // Hull skins are thin — render both sides so no holes appear from overhead.
    const Mds = (c) => { const m = M(c); m.side = THREE.DoubleSide; return m; };

    // ---- wood palette (warm, weathered) ---------------------------------
    const C_RIM   = 0x9a6a33;  // gunwale top rail — the bright rim you see first
    const C_HULL  = 0x6d4626;  // outer hull planking
    const C_DARK  = 0x2b1a0d;  // shadowed inner wall
    const C_FLOOR = 0x7d5330;  // interior floor planks
    const C_SEAM  = 0x50351d;  // plank seam lines
    const C_SPINE = 0x8a5c31;  // central spine plank
    const C_SEAT  = 0x93632f;  // thwart seats
    const C_OARW  = 0xc7a349;  // oar shaft (tan)
    const C_OARB  = 0xb28a37;  // oar blade
    const C_LOCK  = 0x808080;  // metal oarlock

    const g = new THREE.Group();

    // ---- hull outline profile -------------------------------------------
    // half-width along the length. t: 0 = stern (rounded) -> 1 = bow (pointed)
    const L = 3.6, halfL = L / 2;
    const prof = [
      [0.00, 0.50], [0.10, 0.72], [0.24, 0.82], [0.40, 0.86],
      [0.57, 0.85], [0.72, 0.74], [0.85, 0.54], [0.94, 0.31], [1.00, 0.05]
    ];
    const zAt = (t) => -halfL + t * L;

    // Build a closed loop ring: right side stern->bow, then left side bow->stern.
    // wScale scales beam, lenScale scales length, bulge adds outward chine.
    function ring(wScale, lenScale, y, bulge) {
      const pts = [];
      for (let i = 0; i < prof.length; i++) {
        const w = Math.max(prof[i][1] * wScale + (bulge || 0), 0.03);
        pts.push(new THREE.Vector3(w, y, zAt(prof[i][0]) * lenScale));
      }
      for (let i = prof.length - 1; i >= 0; i--) {
        const w = Math.max(prof[i][1] * wScale + (bulge || 0), 0.03);
        pts.push(new THREE.Vector3(-w, y, zAt(prof[i][0]) * lenScale));
      }
      return pts;
    }

    // vertical heights
    const yTop   = 0.54;   // gunwale
    const yMid   = 0.27;   // clinker lap line
    const yFloor = 0.24;   // interior floor
    const yKeel  = 0.00;   // bottom of hull

    const gunOuter = ring(1.00, 1.00, yTop, 0.00);      // outer edge of rim
    const gunInner = ring(1.00, 0.985, yTop, -0.13);    // inner edge of rim
    const midOuter = ring(0.86, 0.96, yMid, 0.05);      // bulged clinker chine
    const keel     = ring(0.50, 0.90, yKeel, 0.00);     // narrow keel line
    const floorRng = ring(0.84, 0.96, yFloor, -0.13);   // interior floor edge

    // --- geometry helpers ---
    function stripGeom(A, B) {                 // quad strip between two rings
      const N = A.length, pos = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, a0 = A[i], a1 = A[j], b0 = B[i], b1 = B[j];
        pos.push(a0.x, a0.y, a0.z, a1.x, a1.y, a1.z, b1.x, b1.y, b1.z);
        pos.push(a0.x, a0.y, a0.z, b1.x, b1.y, b1.z, b0.x, b0.y, b0.z);
      }
      const gm = new THREE.BufferGeometry();
      gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gm.computeVertexNormals();
      return gm;
    }
    function capGeom(R, y) {                    // triangle fan (centroid) at height y
      const N = R.length, pos = [];
      let cx = 0, cz = 0;
      R.forEach(p => { cx += p.x; cz += p.z; }); cx /= N; cz /= N;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, a = R[i], b = R[j];
        pos.push(cx, y, cz, a.x, y, a.z, b.x, y, b.z);
      }
      const gm = new THREE.BufferGeometry();
      gm.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gm.computeVertexNormals();
      return gm;
    }
    function addMesh(geom, material, shadow) {
      const m = new THREE.Mesh(geom, material);
      if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
      g.add(m); return m;
    }

    // ---- hull shell ------------------------------------------------------
    addMesh(stripGeom(gunOuter, midOuter), Mds(C_HULL));   // upper strake (outside)
    addMesh(stripGeom(midOuter, keel),     Mds(C_HULL));   // lower strake (outside)
    addMesh(stripGeom(gunOuter, gunInner), M(C_RIM));      // bright rim top cap
    addMesh(stripGeom(gunInner, floorRng), Mds(C_DARK));   // dark inner wall
    addMesh(capGeom(floorRng, yFloor),     Mds(C_FLOOR));  // interior floor

    // ---- floor plank seam lines (run along length) -----------------------
    [-0.5, -0.17, 0.17, 0.5].forEach(px => {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.02, 2.1), M(C_SEAM));
      s.position.set(px, yFloor + 0.012, -0.1);
      g.add(s);
    });

    // ---- raised central spine plank (bow-to-stern) -----------------------
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.09, 2.7), M(C_SPINE));
    spine.position.set(0, yFloor + 0.06, -0.05);
    spine.castShadow = true; g.add(spine);

    // ---- cross thwart seats ---------------------------------------------
    function thwart(zc, halfw) {
      const t = new THREE.Mesh(
        new THREE.BoxGeometry(halfw * 2, 0.09, 0.34), M(C_SEAT));
      t.position.set(0, 0.47, zc);
      t.castShadow = true; g.add(t);
    }
    thwart(-0.55, 0.80);
    thwart( 0.70, 0.72);

    // ---- oarlocks (grey rings on the gunwale) ---------------------------
    function oarlock(px, pz) {
      const o = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.025, 5, 8), M(C_LOCK));
      o.rotation.x = Math.PI / 2; o.position.set(px, yTop + 0.05, pz);
      o.castShadow = true; g.add(o);
    }
    oarlock( 0.60, -0.45); oarlock(-0.60, -0.45);
    oarlock( 0.55,  0.62); oarlock(-0.55,  0.62);

    // ---- oars: two, laid diagonally across, resting on the gunwales ------
    function makeOar() {
      const o = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 3.4, 6), M(C_OARW));
      shaft.rotation.z = Math.PI / 2;               // lie along local X
      shaft.castShadow = true; o.add(shaft);
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.03, 0.24), M(C_OARB));
      blade.position.set(1.85, 0, 0);
      blade.castShadow = true; o.add(blade);
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.3, 6), M(C_OARW));
      grip.rotation.z = Math.PI / 2; grip.position.set(-1.7, 0, 0);
      o.add(grip);
      return o;
    }
    const oarA = makeOar();
    oarA.position.set(-0.1, yTop + 0.06, -0.35);
    oarA.rotation.y =  0.52; oarA.rotation.x = 0.06;   // crosses to one side
    g.add(oarA);

    const oarB = makeOar();
    oarB.position.set(0.05, yTop + 0.06, 0.4);
    oarB.rotation.y = -0.52; oarB.rotation.x = -0.06;  // crosses to the other
    g.add(oarB);

    // ---- place & orient --------------------------------------------------
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return g;
  };

  console.log('[ref_rowboat] makeRefRowboat ready');
})();
