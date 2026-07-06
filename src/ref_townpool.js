/* ============================================================================
 * ref_townpool.js  —  window.makeRefTownPool(x=0, z=0, rot=0)
 *
 * A self-contained recreation of the CENTRAL fountain-pool in the town square
 * reference (Bible_References/Town_Square.jpg). Unlike the tall tiered
 * ref_fountain, this is a LOW, GROUND-LEVEL, CRUCIFORM / QUATREFOIL STONE POOL:
 * a cross/clover footprint of four rounded lobes joined at a central hub, filled
 * with flat translucent-BLUE water sitting at ~ground level (y ~= 0.06). The
 * pool edge is ringed by a rough COBBLESTONE / boulder rim of individual
 * irregular grey stones, and a small raised stone plinth/island rises from the
 * middle. Read from the overhead game camera it is a cross-shaped blue pool with
 * a knobbly grey stone rim — NOT an upright fountain.
 *
 * Footprint ~6.4 tiles across (four lobes reaching r ~= 3.1 from centre).
 * Flat-shaded low-poly OSRS look, guarded against the game's mat() when present.
 * Water is a flat translucent-blue POOLED surface (transparent, depthWrite off)
 * gently animated by a shader-free self-installed rAF ripple tick.
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
    transparent: true, opacity: (op == null ? 0.8 : op), depthWrite: false
  });

  // Weathered grey stone, split across shade bands for the cobble rim / plinth.
  const STONE_LT = 0xa7a59b;   // sunlit grey cobble
  const STONE_MD = 0x8a8880;   // shaded stone
  const STONE_DK = 0x64635b;   // deep shade / recessed pool floor
  const STONE_XD = 0x4d4c46;   // darkest boulders
  const MOSS     = 0x6c7647;   // moss at the waterline
  const H2O      = 0x3f7fbf;   // clear translucent-blue pool water
  const H2O_LT   = 0x6fa6d8;   // paler inner sheen

  const STONES = [STONE_LT, STONE_MD, STONE_DK, STONE_XD];

  // A flat round water/stone disc (many sides so lobes read as circles).
  const disc = (r, h, m, seg) =>
    new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 24), m);

  // The four lobe directions (cardinal cross) + a joining central hub.
  const D = 1.65;           // lobe-centre distance from the middle
  const RL = 1.5;           // lobe radius
  const RH = 1.7;           // central hub radius
  const LOBES = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

  // Union outline radius of the quatrefoil at world-angle theta — used to seat
  // the boulder rim exactly on the pool edge. Outer ray/circle intersection per
  // lobe, plus the central hub; take the furthest reach.
  const outline = (theta) => {
    let best = RH;
    for (let k = 0; k < LOBES.length; k++) {
      const uc = D * Math.cos(theta - LOBES[k]);       // ray dir . lobe centre
      const disc2 = uc * uc - (D * D - RL * RL);
      if (disc2 > 0) {
        const t = uc + Math.sqrt(disc2);
        if (t > best) best = t;
      }
    }
    return best;
  };

  // ---- shared animation ticker (one rAF drives every town pool) -------------
  const REG = (window.__refTownPoolReg = window.__refTownPoolReg || []);
  if (!window.__refTownPoolTick) {
    window.__refTownPoolTick = true;
    const tick = () => {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      for (let i = 0; i < REG.length; i++) {
        const p = REG[i];
        if (!p || !p.mesh || !p.mesh.parent) continue;
        const s = Math.sin(t * p.speed + p.phase);
        // gentle vertical bob + breathing opacity ripple + faint scale swell
        p.mesh.position.y = p.baseY + s * 0.010;
        if (p.mesh.material) p.mesh.material.opacity = p.op + s * 0.06;
        const sc = 1 + Math.cos(t * p.speed * 0.5 + p.phase) * 0.006;
        p.mesh.scale.set(sc, 1, sc);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const register = (mesh) => {
    REG.push({
      mesh, baseY: mesh.position.y,
      op: (mesh.material ? mesh.material.opacity : 0.8),
      speed: 0.8 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    });
  };

  // ---- the builder ----------------------------------------------------------
  window.makeRefTownPool = function makeRefTownPool(x, z, rot) {
    x = x || 0; z = z || 0; rot = rot || 0;
    const g = new THREE.Group();

    // Helper: place one disc (floor / water) for hub + each lobe.
    const spots = [{ ang: null, r: RH }].concat(
      LOBES.map(a => ({ ang: a, r: RL })));
    const at = (s) => s.ang == null
      ? [0, 0]
      : [Math.cos(s.ang) * D, Math.sin(s.ang) * D];

    /* ---------------- SUNKEN STONE BASIN FLOOR ---------------- */
    // Dark recessed floor discs just under the water so the pool reads as a
    // real sunken basin, not blue paint on the ground.
    for (const s of spots) {
      const [px, pz] = at(s);
      const floor = disc(s.r + 0.02, 0.16, M(STONE_DK));
      floor.position.set(px, -0.02, pz);
      g.add(floor);
    }

    /* ---------------- CROSS/CLOVER WATER SURFACE ---------------- */
    // Flat translucent-blue lobes, all at the same low level, overlapping the
    // hub so they merge into one continuous cross-shaped blue pool.
    for (const s of spots) {
      const [px, pz] = at(s);
      const water = disc(s.r, 0.08, WATER(H2O, 0.8));
      water.position.set(px, 0.07, pz);
      water.userData.isWater = true;
      g.add(water);
      register(water);

      // faint paler inner sheen for a layered water read
      const sheen = disc(s.r * 0.6, 0.05, WATER(H2O_LT, 0.35));
      sheen.position.set(px, 0.085, pz);
      sheen.userData.isWater = true;
      g.add(sheen);
      register(sheen);
    }

    /* ---------------- COBBLESTONE / BOULDER RIM ---------------- */
    // Individual irregular grey stones ringing the pool edge, seated right on
    // the quatrefoil outline and half-buried at ground level. Dodecahedra with
    // random squash/spin so no two boulders match — a rough OSRS cobble ring.
    const RIM_N = 54;
    for (let i = 0; i < RIM_N; i++) {
      const th = (i / RIM_N) * Math.PI * 2;
      const rad = outline(th) + 0.12;                 // hug just outside the water
      const jx = (Math.random() - 0.5) * 0.14;
      const jz = (Math.random() - 0.5) * 0.14;
      const bx = Math.cos(th) * rad + jx;
      const bz = Math.sin(th) * rad + jz;
      const size = 0.24 + Math.random() * 0.22;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        M(STONES[(Math.random() * STONES.length) | 0]));
      stone.scale.set(1 + Math.random() * 0.5, 0.6 + Math.random() * 0.4, 1 + Math.random() * 0.5);
      stone.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      stone.position.set(bx, 0.06 + Math.random() * 0.06, bz);
      g.add(stone);
    }

    // a scattering of smaller cobbles filling gaps around the rim foot
    for (let i = 0; i < 22; i++) {
      const th = Math.random() * Math.PI * 2;
      const rad = outline(th) + 0.28 + Math.random() * 0.22;
      const cob = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14 + Math.random() * 0.12, 0),
        M(STONES[(Math.random() * STONES.length) | 0]));
      cob.scale.y = 0.5;
      cob.rotation.y = Math.random() * Math.PI;
      cob.position.set(Math.cos(th) * rad, 0.03, Math.sin(th) * rad);
      g.add(cob);
    }

    /* ---------------- CENTRAL STONE PLINTH / ISLAND ---------------- */
    // A small raised stone island rising from the middle of the pool.
    const base = disc(0.72, 0.22, M(STONE_MD), 10);
    base.position.y = 0.11; g.add(base);

    const step = disc(0.54, 0.2, M(STONE_LT), 8);
    step.position.y = 0.3; g.add(step);

    const cap = disc(0.4, 0.16, M(STONE_MD), 8);
    cap.position.y = 0.48; g.add(cap);

    // a rounded knob crowning the island (the little central stone bit)
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), M(STONE_LT));
    knob.position.y = 0.62; g.add(knob);

    // moss creeping the island foot at the waterline
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.5;
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 5, 4), M(MOSS));
      moss.scale.y = 0.35;
      moss.position.set(Math.cos(a) * 0.74, 0.12, Math.sin(a) * 0.74);
      g.add(moss);
    }

    // ---- finalise -----------------------------------------------------------
    // Stone solids cast/receive shadow; flat water surfaces don't cast.
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
      label: 'Examine <b>Town Pool</b>',
      examine: 'A low cruciform stone pool of cool blue water, ringed with rough cobbles around a little island.'
    };
    return g;
  };

  console.log('[ref_townpool] makeRefTownPool ready');
})();
