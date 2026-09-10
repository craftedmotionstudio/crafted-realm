/* ============================================================
   ref_anvil.js  —  Blacksmith's ANVIL on a wooden stump
   Self-contained. Global-script (r128). Edit ONLY this file.
   window.makeRefAnvil(x=0, z=0, rot=0) -> THREE.Group
   Style: dark iron + warm wood, flat-shaded low-poly (OSRS).
   Scale: 1 unit = 1 tile. Anvil ~1 tile footprint.
   ============================================================ */
(function () {
  // Material guard: reuse world mat() (MeshPhongMaterial flat) if present.
  const M = (c) => typeof mat === 'function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // --- palette ---
  const IRON       = 0x2b2f36; // dark blue-grey iron body
  const IRON_DK    = 0x1c2026; // shadowed iron / base
  const IRON_FACE  = 0x3a3f47; // lighter worked top face
  const WOOD       = 0x6f5a34; // warm stump wood
  const WOOD_DK    = 0x574424; // stump end-grain / shadow
  const WOOD_HANDLE= 0x8a6d3b; // hammer/tongs handle
  const STEEL      = 0x4a5058; // hammer head / tong steel

  function box(w, h, d, color, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color));
    m.position.set(x || 0, y || 0, z || 0);
    if (ry) m.rotation.y = ry;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function cyl(rt, rb, h, color, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), M(color));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  window.makeRefAnvil = function (x, z, rot) {
    x = x || 0; z = z || 0; rot = rot || 0;
    const g = new THREE.Group();

    /* ---------- WOODEN STUMP / STAND ---------- */
    // chunky log section the anvil sits on
    const stumpH = 0.55, stumpR = 0.42;
    const stump = cyl(stumpR, stumpR * 1.08, stumpH, WOOD, 10);
    stump.position.y = stumpH / 2;
    g.add(stump);
    // darker top end-grain disk
    const grain = cyl(stumpR * 0.97, stumpR * 0.97, 0.04, WOOD_DK, 10);
    grain.position.y = stumpH;
    g.add(grain);
    // a couple of split staves for character
    g.add(box(0.10, 0.5, 0.06, WOOD_DK, stumpR * 0.7, 0.25, 0.1, 0.3));

    const baseY = stumpH; // anvil sits on top of stump

    /* ---------- ANVIL ---------- */
    const anvil = new THREE.Group();
    anvil.position.y = baseY;

    // broad heavy base (feet block) — widest at bottom
    anvil.add(box(0.70, 0.14, 0.46, IRON_DK, 0, 0.07, 0));
    // little foot chamfer plate
    anvil.add(box(0.60, 0.05, 0.38, IRON, 0, 0.165, 0));

    // stepped waist — narrow column rising from base
    anvil.add(box(0.30, 0.22, 0.24, IRON, 0, 0.30, 0));
    anvil.add(box(0.34, 0.06, 0.28, IRON_DK, 0, 0.44, 0)); // step shoulder

    // main body block under the top table
    anvil.add(box(0.60, 0.14, 0.40, IRON, 0, 0.54, 0));

    // flat top FACE (the working table) — slightly lighter, worked steel
    const face = box(0.66, 0.09, 0.42, IRON_FACE, 0, 0.655, 0);
    anvil.add(face);

    // tapered HORN at one end (+X). Cone lying on its side, tapering to a point.
    const horn = cyl(0.02, 0.16, 0.42, IRON, 8);
    horn.rotation.z = Math.PI / 2;   // point along +X
    horn.position.set(0.53, 0.655, 0);
    anvil.add(horn);
    // little collar where horn meets body
    anvil.add(box(0.06, 0.16, 0.34, IRON_DK, 0.34, 0.655, 0));

    // heel / hardy step at the far (-X) end
    anvil.add(box(0.10, 0.08, 0.42, IRON_DK, -0.34, 0.62, 0));

    g.add(anvil);

    /* ---------- SMITH'S HAMMER resting on the face ---------- */
    const hammer = new THREE.Group();
    hammer.position.set(-0.05, baseY + 0.70, 0.02);
    hammer.rotation.y = 0.5;
    // handle laid across the face
    const handle = cyl(0.028, 0.032, 0.44, WOOD_HANDLE, 6);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = 0.10;
    hammer.add(handle);
    // steel head at the near end
    hammer.add(box(0.13, 0.10, 0.11, STEEL, -0.14, 0, 0));
    g.add(hammer);

    /* ---------- TONGS leaning against the stump ---------- */
    const tongs = new THREE.Group();
    tongs.position.set(-0.30, 0, -0.30);
    tongs.rotation.set(0, 0.7, 0.35); // leaning
    const legA = cyl(0.018, 0.018, 0.62, STEEL, 6);
    legA.position.set(0, 0.31, 0.03);
    const legB = cyl(0.018, 0.018, 0.62, STEEL, 6);
    legB.position.set(0, 0.31, -0.03);
    // pivot + jaws at top
    const jaw = box(0.06, 0.10, 0.10, IRON_DK, 0, 0.60, 0);
    tongs.add(legA); tongs.add(legB); tongs.add(jaw);
    g.add(tongs);

    /* ---------- place & orient ---------- */
    g.position.set(x, (typeof gy === 'function' ? gy(x, z) : 0), z);
    g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };

  console.log('[ref_anvil] makeRefAnvil ready');
})();
