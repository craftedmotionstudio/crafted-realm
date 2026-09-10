/* ============================================================================
 * ref_fountain.js  —  window.makeRefFountain(x=0, z=0, rot=0)
 *
 * A self-contained recreation of Bible_References/Fountain_Option2.jpg to OSRS
 * quality: a TALL, TIERED, upright garden fountain. A lower octagonal POOL
 * basin (moderate width, with a real overhanging coping rim) holds a wide
 * translucent-blue water surface; a central pedestal/stem rises well above the
 * pool rim to a clearly RAISED UPPER BOWL (also water-filled); the whole piece
 * is crowned by a rounded grey stone ball. Soft translucent cascade sheets
 * spill from the raised bowl down into the pool.
 *
 * Deliberately VERTICAL and tiered (NOT squat/flat): overall ~3.4 units tall,
 * lower pool ~4.8 tiles across, upper bowl ~2.2 tiles across and clearly
 * elevated — a tall silhouette, not a wide shallow disc.
 *
 * Warm-neutral grey-beige flat-shaded low-poly stone (guarded against the
 * game's `mat()` when present). Water is flat translucent-blue POOLED surfaces
 * (transparent:true, depthWrite:false) in both basins, plus soft cascade
 * sheets, all gently animated by a shader-free self-installed rAF ripple tick.
 *
 * Returns a THREE.Group at (x, 0, z), rotated `rot` radians on Y. Pure: it does
 * NOT add itself to any scene — the caller does that.
 * ==========================================================================*/
(function () {
  if (typeof window === 'undefined' || typeof THREE === 'undefined') return;

  // ---- material helpers -----------------------------------------------------
  // Reuse the game's flat-shaded matte look when present; otherwise fall back.
  const M = (c) => (typeof mat === 'function')
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // Translucent water: never writes depth (so it doesn't punch holes in what's
  // behind it), matte, faintly luminous blue.
  const WATER = (c, op) => new THREE.MeshPhongMaterial({
    color: c, flatShading: true, shininess: 0, specular: 0x000000,
    transparent: true, opacity: (op == null ? 0.75 : op), depthWrite: false
  });

  // Warm-neutral grey-beige weathered stone, split across three shade bands.
  const STONE_LT = 0xa9a79c;   // sunlit grey-beige
  const STONE_MD = 0x8b897e;   // shaded stone / coping rims
  const STONE_DK = 0x67665d;   // deep shade inside the water wells
  const MOSS     = 0x6c7647;   // moss creeping the pool waterline
  const H2O_TOP  = 0x4a86c8;   // clear translucent-blue pool surface
  const H2O_DEEP = 0x3f7fbf;   // clear translucent-blue raised-bowl water
  const H2O_FALL = 0x8fb8e0;   // pale-blue falling cascade sheets
  const H2O_JET  = 0xc6e2f2;   // pale blue-white spouting water

  const octa = (rTop, rBot, h, m) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), m);

  // A curved translucent water SHEET segment hugging the bowl rim as it falls.
  const sheet = (rTop, rBot, h, thetaStart, thetaLen, m) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, h, 5, 1, true, thetaStart, thetaLen),
      m);

  // ---- a single shared animation ticker for every ref fountain --------------
  // Self-installed RAF so the fountain lives whether or not the host game loop
  // touches it. One loop drives all instances; each part carries its own phase.
  const REG = (window.__refFountainReg = window.__refFountainReg || []);
  if (!window.__refFountainTick) {
    window.__refFountainTick = true;
    const tick = () => {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      for (let i = 0; i < REG.length; i++) {
        const p = REG[i];
        if (!p || !p.mesh || !p.mesh.parent) continue;
        const s = Math.sin(t * p.speed + p.phase);
        if (p.type === 'surface') {
          // gentle vertical bob + a breathing opacity ripple on the flat disc
          p.mesh.position.y = p.baseY + s * 0.012;
          if (p.mesh.material) p.mesh.material.opacity = p.op + s * 0.06;
          const sc = 1 + Math.cos(t * p.speed * 0.5 + p.phase) * 0.008;
          p.mesh.scale.set(sc, 1, sc);
        } else if (p.type === 'sheet') {
          // soft cascade sheet: opacity shimmer + a short flow pulse in height
          if (p.mesh.material) p.mesh.material.opacity = p.op + s * 0.12;
          p.mesh.scale.y = 1 + Math.sin(t * p.speed * 1.4 + p.phase) * 0.06;
        } else if (p.type === 'jet') {
          // crown spout: flicker opacity + subtle length pulse to hint flow
          if (p.mesh.material) p.mesh.material.opacity = p.op + s * 0.18;
          p.mesh.scale.y = 1 + Math.sin(t * p.speed * 1.7 + p.phase) * 0.08;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const register = (mesh, type, extra) => {
    REG.push(Object.assign({
      mesh, type,
      baseY: mesh.position.y,
      op: (mesh.material ? mesh.material.opacity : 0.75),
      speed: 1.1 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    }, extra || {}));
  };

  // ---- the builder ----------------------------------------------------------
  window.makeRefFountain = function makeRefFountain(x, z, rot) {
    x = x || 0; z = z || 0; rot = rot || 0;
    const g = new THREE.Group();

    /* ---------------- TIER 0 : the lower octagonal POOL basin -------------- */
    // Moderate width (~4.8 tiles across), with a genuine overhanging coping rim
    // and a recessed water surface set just inside it — a real pool, not a disc.
    const basin = octa(2.28, 2.44, 0.6, M(STONE_LT));
    basin.position.y = 0.3; g.add(basin);

    // pronounced coping lip — overhangs the basin wall, water sits inside it
    const rim = octa(2.5, 2.42, 0.2, M(STONE_MD));
    rim.position.y = 0.62; g.add(rim);

    // inner shadow well so the pooled water clearly reads as recessed
    const well = octa(2.16, 2.16, 0.42, M(STONE_DK));
    well.position.y = 0.42; g.add(well);

    // POOLED WATER: a wide flat translucent-blue disc brimming the lower basin,
    // set high (near the coping brim) and broadened to the inner rim so the pool
    // reads clearly as blue water from the overhead game camera.
    const pool = octa(2.34, 2.34, 0.06, WATER(H2O_TOP, 0.72));
    pool.position.y = 0.66; pool.rotation.y = Math.PI / 8;
    pool.userData.isWater = true; g.add(pool);
    register(pool, 'surface');

    // subtle concentric lighter-blue inner ring on the surface for a water read
    const poolRing = octa(1.5, 1.5, 0.04, WATER(H2O_FALL, 0.4));
    poolRing.position.y = 0.68; poolRing.rotation.y = Math.PI / 8;
    poolRing.userData.isWater = true; g.add(poolRing);
    register(poolRing, 'surface');

    // moss creeping the pool foot — a few flat green nubs at the waterline
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const moss = new THREE.Mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.12, 5, 4), M(MOSS));
      moss.scale.y = 0.34;
      moss.position.set(Math.cos(a) * 2.34, 0.5, Math.sin(a) * 2.34);
      g.add(moss);
    }

    /* ---------------- CENTRAL PEDESTAL (tall) ---------------- */
    // An octagonal foot rising from the pool and a TALL tapered stem that lifts
    // the upper bowl well clear of the pool rim — this is what makes it read
    // tall and tiered rather than squat.
    const foot = octa(0.86, 1.08, 0.55, M(STONE_LT));
    foot.position.y = 0.5; g.add(foot);

    const footStep = octa(0.6, 0.76, 0.2, M(STONE_MD));
    footStep.position.y = 0.87; g.add(footStep);

    // the tall stem — spans roughly y0.97 -> y1.92, lifting the whole crown
    const stem = octa(0.34, 0.5, 1.0, M(STONE_LT));
    stem.position.y = 1.47; g.add(stem);

    const stemCollar = octa(0.56, 0.4, 0.16, M(STONE_MD));
    stemCollar.position.y = 2.02; g.add(stemCollar);

    /* ---------------- TIER 1 : the RAISED UPPER BOWL ---------------- */
    // A modest octagonal bowl (wide top, narrow foot) sitting HIGH atop the
    // stem — clearly elevated above the pool, giving the tiered silhouette.
    const bowl = octa(1.06, 0.46, 0.36, M(STONE_LT));
    bowl.position.y = 2.2; g.add(bowl);

    // dark inner well of the bowl, under the raised water surface
    const bowlWell = octa(0.9, 0.5, 0.22, M(STONE_DK));
    bowlWell.position.y = 2.26; g.add(bowlWell);

    // pronounced bowl lip
    const bowlRim = octa(1.12, 1.06, 0.12, M(STONE_MD));
    bowlRim.position.y = 2.36; g.add(bowlRim);

    // POOLED WATER in the raised bowl: second flat translucent-blue surface
    const bowlWater = octa(0.9, 0.9, 0.05, WATER(H2O_DEEP, 0.66));
    bowlWater.position.y = 2.34; bowlWater.rotation.y = Math.PI / 8;
    bowlWater.userData.isWater = true; g.add(bowlWater);
    register(bowlWater, 'surface');

    /* ---------------- CROWN : short stem + grey stone ball ---------------- */
    const upStem = octa(0.18, 0.3, 0.36, M(STONE_LT));
    upStem.position.y = 2.6; g.add(upStem);

    const collar = octa(0.32, 0.2, 0.12, M(STONE_MD));
    collar.position.y = 2.84; g.add(collar);

    // low-poly rounded finial (the reference's grey ball crown)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), M(STONE_LT));
    ball.position.y = 3.16; g.add(ball);

    /* ---------------- WATER : crown spout + soft cascade sheets ------------ */
    // Crown jets: pale water fanning gently up-and-out from under the sphere.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.4, 5), WATER(H2O_JET, 0.55));
      jet.position.set(Math.cos(a) * 0.16, 2.98, Math.sin(a) * 0.16);
      jet.rotation.z = Math.cos(a) * 0.5;
      jet.rotation.x = -Math.sin(a) * 0.5;
      jet.userData.isWater = true; g.add(jet);
      register(jet, 'jet');
    }

    // SOFT CASCADE SHEETS: curved translucent sheets draping over the raised
    // bowl rim and flaring outward as they fall toward the pool — sheets, not
    // thin bars. A handful spaced around the bowl so water clearly spills down.
    const N = 6, span = (Math.PI * 2) / N;
    for (let i = 0; i < N; i++) {
      const a = i * span + Math.PI / 8;
      const fall = sheet(1.02, 1.5, 1.4, a, span * 0.66, WATER(H2O_FALL, 0.46));
      fall.position.y = 1.42;   // top just under the bowl lip, hanging to pool
      fall.userData.isWater = true; g.add(fall);
      register(fall, 'sheet');
    }

    // ---- finalise -----------------------------------------------------------
    // Cast shadows from stone solids only; water surfaces/sheets don't cast.
    g.traverse(o => {
      if (o.isMesh) {
        o.receiveShadow = true;
        o.castShadow = !o.userData.isWater;
      }
    });
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.userData = {
      kind: 'deco',
      label: 'Examine <b>Fountain</b>',
      examine: 'A tall tiered stone fountain, its raised bowl spilling cool spring water to the pool below.'
    };
    return g;
  };

  console.log('[ref_fountain] makeRefFountain ready');
})();
