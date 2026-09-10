/* ref_furnace.js — reference-accurate OSRS smithing furnace.
 * Recreates Bible_References/Furnace_For_Smithing.jpg: a CHUNKY, WIDE, BOXY
 * dark slate-blue coursed-stone block with a SLOPED (truncated-pyramid) top
 * cap, a big WIDE-RECTANGLE mouth glowing molten orange with substantial
 * stone jambs/doors, a LOW WIDE work tray/chute jutting out the left side, a
 * stubby rear flue, and iron banding. Self-contained: window.makeRefFurnace().
 *
 * Footprint ~4.0 x 3.7 units, ~3.6 units tall (full storey). Returns a
 * THREE.Group positioned at (x,0,z), rotated `rot` about Y.
 */
(function(){
  if (typeof THREE === 'undefined') { return; }

  // Flat-shaded MeshPhong helper, matching game2_world.js `mat()`; guarded.
  const M = (c) => (typeof mat === 'function')
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // Emissive glow material (self-lit molten look); we mutate emissiveIntensity.
  const GLOW = (c, i) => new THREE.MeshPhongMaterial({
    color: 0x1a0d06, emissive: c, emissiveIntensity: (i == null ? 1.0 : i),
    shininess: 0, specular: 0x000000, flatShading: true
  });

  // ---- palette (dark slate-blue coursed stone + molten interior) ----
  const STONE_A = 0x3e444e;   // main coursed stone (dark cool blue-grey)
  const STONE_B = 0x4e5560;   // alternate course (lighter cool band)
  const STONE_D = 0x1e2129;   // recessed / frame stone (shadowed, cool)
  const STONE_CAP = 0x525a66; // sun-caught sloped cap (cool)
  const IRON     = 0x22242b;  // banding / straps
  const MOLTEN_HOT = 0xff6a1e;
  const MOLTEN_DEEP = 0xd8300a;

  // ---- shared flicker registry + single self-installed rAF loop ----
  // Multiple furnaces register their glow targets; one loop drives them all.
  if (!window.__refFurnaceFX) {
    const FX = { items: [], running: false };
    FX.loop = function(){
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
      // layered sine "fire" wobble, cheap and warm
      const f = 0.82
        + 0.13 * Math.sin(t * 7.3)
        + 0.06 * Math.sin(t * 17.1 + 1.7)
        + 0.05 * Math.sin(t * 3.1 + 0.5);
      for (let i = 0; i < FX.items.length; i++) {
        const it = FX.items[i];
        if (it.mats) for (let m = 0; m < it.mats.length; m++) {
          it.mats[m].emissiveIntensity = it.base[m] * f;
        }
        if (it.light) it.light.intensity = it.lightBase * f;
      }
      if (FX.items.length) requestAnimationFrame(FX.loop);
      else FX.running = false;
    };
    FX.register = function(item){
      this.items.push(item);
      if (!this.running) { this.running = true; requestAnimationFrame(this.loop); }
    };
    window.__refFurnaceFX = FX;
  }

  window.makeRefFurnace = function(x, z, rot){
    x = x || 0; z = z || 0; rot = rot || 0;
    const g = new THREE.Group();

    const solid = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // ---------------------------------------------------------------
    // 1) CHUNKY BOXY COURSED-STONE BODY
    //    Stack of RECTANGULAR box courses that taper only slightly toward
    //    the top -> a wide, blocky silhouette (NOT a beehive/egg dome).
    //    Alternating course shade gives the horizontal stone coursing.
    //    rows: [width(x), depth(z), height]
    // ---------------------------------------------------------------
    const courses = [
      [3.90, 3.60, 0.50],
      [3.82, 3.52, 0.48],
      [3.72, 3.42, 0.46],
      [3.60, 3.30, 0.44],
      [3.46, 3.16, 0.42]
    ];
    let cy = 0;
    let topW = 0, topD = 0;
    for (let i = 0; i < courses.length; i++) {
      const [w, d, h] = courses[i];
      const course = solid(new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        M(i % 2 ? STONE_B : STONE_A)
      ));
      course.position.y = cy + h / 2;
      g.add(course);
      cy += h;
      topW = w; topD = d;
    }
    const bodyTop = cy;                      // ~2.30

    // ---------------------------------------------------------------
    //    SLOPED TRUNCATED-PYRAMID CAP (the chunky sloped stone roof).
    //    Square 4-gon cylinder rotated 45deg -> a rectangular frustum,
    //    then scaled in z. Big base, smaller flat top = OSRS sloped cap.
    // ---------------------------------------------------------------
    const capH = 1.28;
    const capBotHalf = topW / 2;             // ~1.73 (matches top course x)
    const capTopHalf = 0.85;                 // flat-ish top
    const cap = solid(new THREE.Mesh(
      new THREE.CylinderGeometry(capTopHalf * Math.SQRT2, capBotHalf * Math.SQRT2, capH, 4),
      M(STONE_CAP)
    ));
    cap.rotation.y = Math.PI / 4;            // align faces to the axes
    cap.scale.z = (topD / topW);             // make it rectangular (deeper vs wide)
    cap.position.y = bodyTop + capH / 2 - 0.02;
    g.add(cap);
    const domeTop = bodyTop + capH - 0.02;   // ~3.56

    // heavy iron band cinching the base courses
    const band = solid(new THREE.Mesh(
      new THREE.BoxGeometry(3.96, 0.16, 3.66), M(IRON)
    ));
    band.position.y = 0.72;
    g.add(band);

    // ---------------------------------------------------------------
    // 2) BIG WIDE-RECTANGLE MOUTH (front, +Z) w/ MOLTEN INTERIOR
    //    Significantly larger + wider opening, substantial stone jambs.
    // ---------------------------------------------------------------
    const mouth = new THREE.Group();
    const FZ = topD / 2 + 0.02;              // front face plane (~1.82)
    const OPEN_W = 2.30, OPEN_H = 1.62;      // wide rectangular opening
    const my = 0.98;                         // mouth vertical centre

    // dark recessed surround flush behind the opening
    const frame = solid(new THREE.Mesh(
      new THREE.BoxGeometry(OPEN_W + 0.7, OPEN_H + 0.55, 0.42), M(STONE_D)
    ));
    frame.position.set(0, my, FZ - 0.24);
    mouth.add(frame);

    // SUBSTANTIAL side jamb pillars / doors, proud of the face
    for (const sx of [-1, 1]) {
      const jamb = solid(new THREE.Mesh(
        new THREE.BoxGeometry(0.42, OPEN_H + 0.30, 0.60), M(STONE_B)
      ));
      jamb.position.set(sx * (OPEN_W / 2 + 0.21), my - 0.04, FZ + 0.14);
      mouth.add(jamb);
      // inner iron door-strap on each jamb
      const dstrap = solid(new THREE.Mesh(
        new THREE.BoxGeometry(0.12, OPEN_H - 0.10, 0.10), M(IRON)
      ));
      dstrap.position.set(sx * (OPEN_W / 2 + 0.10), my, FZ + 0.46);
      mouth.add(dstrap);
    }

    // wide rectangular lintel beam across the top of the opening
    const lintelBeam = solid(new THREE.Mesh(
      new THREE.BoxGeometry(OPEN_W + 0.9, 0.42, 0.58), M(STONE_A)
    ));
    lintelBeam.position.set(0, my + OPEN_H / 2 + 0.14, FZ + 0.12);
    mouth.add(lintelBeam);
    // squared lintel underside — a flat rectangular soffit beam gives the
    // opening a clean WIDE-RECTANGLE top (no rounded arch), proud jambs below.
    const soffit = solid(new THREE.Mesh(
      new THREE.BoxGeometry(OPEN_W + 0.08, 0.16, 0.44), M(STONE_D)
    ));
    soffit.position.set(0, my + OPEN_H / 2 + 0.01, FZ + 0.14);
    mouth.add(soffit);

    // molten back wall — vertical glow plane filling the opening
    const mBack = GLOW(MOLTEN_DEEP, 0.85);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(OPEN_W, OPEN_H), mBack);
    backWall.position.set(0, my, FZ + 0.02);
    mouth.add(backWall);

    // glowing hearth floor / lip proud at the mouth base
    const mFloor = GLOW(MOLTEN_HOT, 1.05);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(OPEN_W, 0.60), mFloor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, my - OPEN_H / 2 + 0.02, FZ + 0.30);
    mouth.add(floor);

    // glowing coal lumps sitting on the lip
    const mCoal = GLOW(MOLTEN_HOT, 1.2);
    for (const cx of [-0.7, -0.2, 0.3, 0.7]) {
      const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mCoal);
      lump.position.set(cx, my - OPEN_H / 2 + 0.14, FZ + 0.30 + Math.abs(cx) * 0.06);
      mouth.add(lump);
    }

    // iron straps across the mouth (matches the ref's banded opening)
    for (const yy of [my - OPEN_H / 2 + 0.04, my + OPEN_H / 2 - 0.06]) {
      const strap = solid(new THREE.Mesh(
        new THREE.BoxGeometry(OPEN_W + 0.9, 0.12, 0.12), M(IRON)
      ));
      strap.position.set(0, yy, FZ + 0.26);
      mouth.add(strap);
    }

    // warm point light spilling out of the mouth
    const light = new THREE.PointLight(MOLTEN_HOT, 0.9, 9.0);
    light.position.set(0, my, FZ + 0.6);
    mouth.add(light);

    g.add(mouth);

    // register the glow for flicker (emissive mats + the point light)
    window.__refFurnaceFX.register({
      mats: [mBack, mFloor, mCoal],
      base: [0.9, 1.05, 1.2],
      light: light,
      lightBase: 0.9
    });

    // ---------------------------------------------------------------
    // 3) LOW, WIDE WORK TRAY / CHUTE jutting out the LEFT (-X) side
    //    A shallow rectangular tray with a raised rim, sitting LOW —
    //    replaces the old small high vent.
    // ---------------------------------------------------------------
    const trayX = -(topW / 2) - 0.55;        // centre well clear of the body
    const trayY = 0.60;                       // LOW
    const TRAY_W = 1.20, TRAY_D = 1.80;       // WIDE (deep in z, wide out in x)
    // tray slab
    const traySlab = solid(new THREE.Mesh(
      new THREE.BoxGeometry(TRAY_W, 0.16, TRAY_D), M(STONE_B)
    ));
    traySlab.position.set(trayX, trayY, 0.05);
    g.add(traySlab);
    // raised iron rim (front + outer + back lips)
    const rimSpecs = [
      [TRAY_W, 0.14, 0.10,  trayX,          trayY + 0.12,  0.05 + TRAY_D / 2],
      [TRAY_W, 0.14, 0.10,  trayX,          trayY + 0.12,  0.05 - TRAY_D / 2],
      [0.10,   0.14, TRAY_D, trayX - TRAY_W / 2, trayY + 0.12, 0.05]
    ];
    for (const [w, h, d, px, py, pz] of rimSpecs) {
      const rim = solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(IRON)));
      rim.position.set(px, py, pz);
      g.add(rim);
    }
    // squat legs under the tray
    for (const lz of [0.05 - TRAY_D / 2 + 0.18, 0.05 + TRAY_D / 2 - 0.18]) {
      const leg = solid(new THREE.Mesh(
        new THREE.BoxGeometry(0.20, trayY, 0.20), M(STONE_D)
      ));
      leg.position.set(trayX - TRAY_W / 2 + 0.16, trayY / 2, lz);
      g.add(leg);
    }

    // ---------------------------------------------------------------
    // 4) REAR FLUE / CHIMNEY on the sloped cap
    // ---------------------------------------------------------------
    const flue = solid(new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.44, 0.95, 8), M(STONE_A)
    ));
    flue.position.set(0, domeTop + 0.05, -1.05);
    flue.rotation.x = -0.22;
    g.add(flue);
    const flueCap = solid(new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.14, 8), M(IRON)
    ));
    flueCap.position.set(0.0, domeTop + 0.50, -1.16);
    flueCap.rotation.x = -0.22;
    g.add(flueCap);

    // ---------------------------------------------------------------
    // finalize
    // ---------------------------------------------------------------
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.userData = { kind: 'furnace', label: 'Smelt at <b>Furnace</b>' };
    return g;
  };

  console.log('[ref_furnace] makeRefFurnace ready');
})();
