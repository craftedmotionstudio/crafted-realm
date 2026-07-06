/* =============================================================================
 * ref_torch.js  —  Crafted Realms  —  OSRS-style torches
 * -----------------------------------------------------------------------------
 * Self-contained, global-script (THREE r128, NOT ES modules).
 * Recreates the two torch types seen in the Bible references:
 *   1. WALL-BRACKET torch  (Beds+Torches.jpg)   — golden iron sconce on a wall
 *                                                  backplate, angled arm, fuel
 *                                                  cup, upward flame.
 *   2. STANDING FLOOR torch (Torch_Options.jpg) — curved wooden shaft planted
 *                                                  in the ground, splayed iron
 *                                                  bracket bowl, flame.
 *
 * Public API:  window.makeRefTorch(x=0, z=0, rot=0)  ->  THREE.Group
 *   Returns a Group (placed at x,0,z, yaw=rot) holding BOTH torch types side
 *   by side. Each has a wooden/iron shaft, a fuel bowl/head, an animated flame
 *   (stacked emissive cones), and a warm PointLight. A single shared
 *   requestAnimationFrame loop flickers every flame's scale + light intensity.
 *
 * Flat-shaded, low-poly, warm — matches the game's `mat(color)` clay/facet look.
 * ========================================================================== */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[ref_torch] THREE not found — makeRefTorch unavailable');
    return;
  }

  // Materials guard: reuse the game's mat() if present, else a matching fallback.
  const M = (c) => (typeof mat === 'function')
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // Emissive flame material — glows regardless of scene lighting, keeps facets.
  // op = per-layer opacity (outer layers translucent, core near-solid).
  const FLAME = (c, em, ei, op) => new THREE.MeshPhongMaterial({
    color: c, emissive: (em === undefined ? c : em), emissiveIntensity: (ei === undefined ? 1 : ei),
    flatShading: true, shininess: 0, specular: 0x000000,
    transparent: true, opacity: (op === undefined ? 0.9 : op), depthWrite: false
  });

  // ---- palette --------------------------------------------------------------
  const C_WOOD   = 0x6b4a2b;  // brown shaft
  const C_WOOD_D = 0x4a3320;  // darker wood bands
  const C_IRON   = 0x2c2c30;  // dark iron
  const C_BRASS  = 0x9a7a34;  // golden sconce (wall torch reads gold in ref)
  const C_BRASS_D= 0x6f561f;  // darker brass shade
  const C_COAL   = 0x241a12;  // charred fuel

  const F_OUTER = 0xff5a12;   // outer orange/red envelope (wide base, translucent)
  const F_MID   = 0xffa028;   // mid amber body
  const F_CORE  = 0xffe89a;   // hot pale-yellow core (small)
  const F_LIGHT = 0xff8a34;   // point light warmth (orange-leaning)

  // Registry of live flames + one shared rAF ticker (installed once).
  const REG = (window.__refTorchFlames = window.__refTorchFlames || []);

  function installTicker() {
    if (window.__refTorchTicking) return;
    window.__refTorchTicking = true;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    function tick(now) {
      const t = ((typeof now === 'number' ? now : Date.now()) - t0) * 0.001;
      for (let i = 0; i < REG.length; i++) {
        const f = REG[i];
        if (!f || !f.group || !f.group.parent) continue; // skip orphaned
        // Per-torch base flicker (drives the light + a shared breathing term).
        const ph = f.phase;
        const flick =
          0.62 * Math.sin(t * 11.0 + ph) +
          0.26 * Math.sin(t * 19.7 + ph * 1.7) +
          0.12 * Math.sin(t * 31.3 + ph * 0.5);
        const n = 0.5 + 0.5 * flick;              // 0..1 (torch-wide)
        let nSum = 0;
        for (let j = 0; j < f.cones.length; j++) {
          const cn = f.cones[j];
          const ud = cn.userData;
          const cph = ud.phase || 0;
          // Each tongue licks on its own layered sines => independent dance.
          const lick =
            0.60 * Math.sin(t * 13.0 + cph) +
            0.28 * Math.sin(t * 23.3 + cph * 1.5) +
            0.12 * Math.sin(t * 37.0 + cph * 0.7);
          const cn01 = 0.5 + 0.5 * lick;          // 0..1 for this tongue
          nSum += cn01;
          const ampY = (ud.ampY !== undefined ? ud.ampY : 0.34);
          const ampS = (ud.ampSway !== undefined ? ud.ampSway : 0.06);
          cn.scale.y = (ud.baseScaleY || 1) * (1.0 - ampY * 0.5 + ampY * cn01); // height dance
          cn.scale.x = cn.scale.z = 0.92 + 0.14 * (1 - cn01);                   // width pulse
          // Tip sway around its own rest tilt; wanders on a slow sine.
          cn.rotation.z = (ud.baseTZ || 0) + ampS * Math.sin(t * 3.1 + cph);
          cn.position.x = (ud.baseX || 0) + ampS * 0.20 * Math.sin(t * 4.7 + cph * 1.3);
        }
        // Light tracks the average tongue brightness + torch flicker.
        const nAvg = f.cones.length ? nSum / f.cones.length : n;
        if (f.light) f.light.intensity = f.lightBase * (0.70 + 0.34 * n + 0.20 * nAvg);
      }
      window.__refTorchRAF = requestAnimationFrame(tick);
    }
    if (typeof requestAnimationFrame === 'function') {
      window.__refTorchRAF = requestAnimationFrame(tick);
    }
  }

  // Build one layered, multi-tongue flame + PointLight; register it for flicker.
  // Instead of a single smooth cone (which reads as an ice-cream/party-hat), the
  // flame is built from several low-poly (5-sided) tapered "tongues" of
  // decreasing width: a WIDE translucent orange/red envelope at the base, an
  // amber mid body, and a small hot pale-yellow core. Side tongues are offset &
  // tilted so the silhouette is jagged, and each tongue flickers on its own
  // phase so the fire licks & dances rather than pulsing as one solid cone.
  // Returns a Group to be placed at the fuel-head origin.
  function makeFlame(group, lightIntensity) {
    const fl = new THREE.Group();

    // Tongue spec: geometry, material, position, tilt, and per-tongue flicker.
    //   ampY  = how much its height dances,  ampSway = how much its tip leans.
    //   phase = independent offset so tongues move out of sync.
    const spec = [
      // --- OUTER orange/red envelope (translucent ~0.5, widest at the base) ---
      { r: 0.165, h: 0.46, seg: 5, mat: FLAME(F_OUTER, F_OUTER, 0.85, 0.50),
        x: 0.00, y: 0.23, z: 0.00, tz: 0.00, ampY: 0.42, ampSway: 0.10 },
      { r: 0.085, h: 0.34, seg: 5, mat: FLAME(F_OUTER, F_OUTER, 0.85, 0.42),
        x: -0.075, y: 0.19, z: 0.015, tz: 0.42, ampY: 0.55, ampSway: 0.16 },
      { r: 0.075, h: 0.38, seg: 5, mat: FLAME(F_OUTER, F_OUTER, 0.85, 0.42),
        x: 0.080, y: 0.21, z: -0.02, tz: -0.34, ampY: 0.50, ampSway: 0.15 },
      // --- MID amber body (decreasing width, translucent ~0.72) --------------
      { r: 0.100, h: 0.34, seg: 5, mat: FLAME(F_MID, F_MID, 1.05, 0.72),
        x: 0.00, y: 0.18, z: 0.00, tz: 0.00, ampY: 0.38, ampSway: 0.09 },
      { r: 0.052, h: 0.26, seg: 5, mat: FLAME(F_MID, F_MID, 1.05, 0.64),
        x: 0.050, y: 0.16, z: 0.02, tz: -0.30, ampY: 0.52, ampSway: 0.14 },
      // --- HOT pale-yellow core (small, near-opaque) -------------------------
      { r: 0.050, h: 0.19, seg: 5, mat: FLAME(F_CORE, F_CORE, 1.35, 0.95),
        x: 0.00, y: 0.105, z: 0.00, tz: 0.00, ampY: 0.30, ampSway: 0.06 }
    ];

    const cones = [];
    for (let i = 0; i < spec.length; i++) {
      const s = spec[i];
      const m = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h, s.seg), s.mat);
      m.position.set(s.x, s.y, s.z);
      m.rotation.z = s.tz;
      m.userData.isFlame = true;
      m.userData.baseScaleY = 1.0;
      m.userData.baseX = s.x;
      m.userData.baseY = s.y;
      m.userData.baseZ = s.z;
      m.userData.baseTZ = s.tz;
      m.userData.ampY = s.ampY;
      m.userData.ampSway = s.ampSway;
      m.userData.phase = Math.random() * Math.PI * 2; // independent per tongue
      fl.add(m);
      cones.push(m);
    }

    const light = new THREE.PointLight(F_LIGHT, lightIntensity, 6.5, 2.0);
    light.position.y = 0.22;
    fl.add(light);

    REG.push({
      group: group,
      cones: cones,
      light: light,
      lightBase: lightIntensity,
      phase: Math.random() * Math.PI * 2
    });
    return fl;
  }

  // ---------------------------------------------------------------------------
  // WALL-BRACKET TORCH  (golden iron sconce)
  // ---------------------------------------------------------------------------
  function makeWallTorch() {
    const g = new THREE.Group();

    // Backplate bolted to the wall (behind, -z), mounted ~1.4 up.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.07), M(C_IRON));
    plate.position.set(0, 1.42, -0.02);
    g.add(plate);
    // Two rivets
    for (const yy of [1.58, 1.26]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 6), M(C_BRASS));
      r.rotation.x = Math.PI / 2; r.position.set(0, yy, 0.03); g.add(r);
    }

    // Angled arm reaching up-and-out from the plate to the cup.
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 6), M(C_BRASS_D));
    arm.position.set(0, 1.52, 0.14);
    arm.rotation.x = -0.62; // lean outward/up
    g.add(arm);

    // Fuel cup — a small tapered bowl (cone frustum) sitting on the arm end.
    const cupY = 1.66, cupZ = 0.26;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.16, 8), M(C_BRASS));
    cup.position.set(0, cupY, cupZ);
    g.add(cup);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 10), M(C_BRASS_D));
    rim.rotation.x = Math.PI / 2; rim.position.set(0, cupY + 0.08, cupZ); g.add(rim);
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.05, 8), M(C_COAL));
    coal.position.set(0, cupY + 0.06, cupZ); g.add(coal);

    // Flame at the cup mouth.
    const flame = makeFlame(g, 1.15);
    flame.position.set(0, cupY + 0.09, cupZ);
    g.add(flame);

    return g;
  }

  // ---------------------------------------------------------------------------
  // STANDING FLOOR TORCH  (curved wooden shaft + splayed iron bowl)
  // ---------------------------------------------------------------------------
  function makeFloorTorch() {
    const g = new THREE.Group();

    // Curved organic shaft: a few stacked, slightly offset & tilted segments
    // approximate the twisted-wood look from the reference.
    const segs = [
      { y: 0.18, z: 0.00, tilt: 0.10, h: 0.38, r0: 0.075, r1: 0.065 },
      { y: 0.52, z: 0.05, tilt: 0.16, h: 0.36, r0: 0.065, r1: 0.056 },
      { y: 0.84, z: 0.12, tilt: 0.10, h: 0.34, r0: 0.056, r1: 0.05  },
      { y: 1.14, z: 0.14, tilt: -0.04, h: 0.30, r0: 0.05,  r1: 0.052 }
    ];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(s.r1, s.r0, s.h, 6),
        M(i % 2 ? C_WOOD_D : C_WOOD)
      );
      seg.position.set(0, s.y, s.z);
      seg.rotation.x = s.tilt;
      g.add(seg);
    }

    // Splayed iron bracket "claws" cradling the bowl (like the ref head).
    const headY = 1.30, headZ = 0.15;
    const claws = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const claw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.20, 5), M(C_IRON));
      const a = (k / 4) * Math.PI * 2;
      claw.position.set(Math.cos(a) * 0.09, headY - 0.02, headZ + Math.sin(a) * 0.09);
      claw.rotation.z = Math.cos(a) * 0.7;
      claw.rotation.x = -Math.sin(a) * 0.7;
      claws.add(claw);
    }
    g.add(claws);

    // Fuel bowl (wider, shallow) + charred coals.
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.10, 0.15, 8), M(C_IRON));
    bowl.position.set(0, headY + 0.06, headZ); g.add(bowl);
    const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 10), M(C_BRASS_D));
    bowlRim.rotation.x = Math.PI / 2; bowlRim.position.set(0, headY + 0.13, headZ); g.add(bowlRim);
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.05, 8), M(C_COAL));
    coal.position.set(0, headY + 0.11, headZ); g.add(coal);

    // Flame — a touch bigger than the wall torch.
    const flame = makeFlame(g, 1.35);
    flame.position.set(0, headY + 0.14, headZ);
    flame.scale.set(1.12, 1.18, 1.12);
    g.add(flame);

    return g;
  }

  // ---------------------------------------------------------------------------
  // Public factory — both torches side by side.
  // ---------------------------------------------------------------------------
  window.makeRefTorch = function (x, z, rot) {
    x = (typeof x === 'number') ? x : 0;
    z = (typeof z === 'number') ? z : 0;
    rot = (typeof rot === 'number') ? rot : 0;

    const root = new THREE.Group();
    root.name = 'RefTorch';

    const wall = makeWallTorch();
    wall.position.set(-0.55, 0, 0);
    root.add(wall);

    const floor = makeFloorTorch();
    floor.position.set(0.55, 0, 0);
    root.add(floor);

    // Cast shadows on solid parts (flames excluded — they don't castShadow well).
    root.traverse((o) => {
      if (o.isMesh && !o.userData.isFlame) {
        o.castShadow = true;
      }
    });

    root.position.set(x, 0, z);
    root.rotation.y = rot;

    installTicker();
    return root;
  };

  console.log('[ref_torch] makeRefTorch ready');
})();
