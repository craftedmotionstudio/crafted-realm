/* ============================================================================
 * ref_altar.js — Church Altar (OSRS-quality recreation)
 * Ref: Bible_References/Church_Altar.jpg
 * Self-contained. Exposes window.makeRefAltar(x=0, z=0, rot=0) -> THREE.Group.
 *
 * Reproduced from the reference:
 *   - Stone plinth base with horizontal grooves, sitting on the floor.
 *   - Dark shadowed recess beneath a cream/ivory altar cloth that drapes the
 *     top and hangs down the front & sides with subtle fabric folds.
 *   - Two flanking GOLDEN candlesticks with ivory candles, glowing flame tips,
 *     tiny flickering PointLights.
 *   - An open book (ivory pages, dark cover) standing at the back centre.
 *   - A golden religious cross/emblem standing front-centre.
 *   - A small golden chalice as an accent.
 * Warm, flat-shaded, low-poly OSRS look. 1 unit = 1 tile.
 * ==========================================================================*/
(function () {
  if (typeof THREE === 'undefined') {
    console.warn('[ref_altar] THREE not present — makeRefAltar unavailable');
    return;
  }

  // ---- material guard: reuse the game's mat() when present ------------------
  const M = (c) => typeof mat === 'function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({ color: c, flatShading: true });

  // emissive gold (candlesticks/emblem glow like the reference) --------------
  const goldGlow = (c, e) => new THREE.MeshPhongMaterial({
    color: c, emissive: e, flatShading: true, shininess: 12, specular: 0x332200
  });

  // ---- palette --------------------------------------------------------------
  const COL = {
    cloth:   0xece3cf,   // warm ivory/cream altar cloth
    clothLo: 0xd6ccb2,   // shaded fold (warmed)
    clothHi: 0xf4eede,   // lit fold (warmed)
    trim:    0xb9b0a0,   // hem trim
    stone:   0x8f8a80,   // plinth
    stoneD:  0x726d63,   // groove
    dark:    0x241f1b,   // shadowed recess
    gold:    0x9c7c34,   // deep antique brass/bronze (less yellow, aged metal)
    goldGlowE: 0x2a1e08, // dimmer emissive so it reads as aged metal, not highlighter
    wax:     0xf3ecd9,   // candle
    book:    0x6a3320,   // book cover
    page:    0xe9e3d2,   // book pages
    pageEdge:0xc9c1ac
  };

  // ---- shared flame registry + single self-installed rAF ticker ------------
  if (!window.__refAltarFlames) window.__refAltarFlames = [];
  if (!window.__refAltarTick) {
    window.__refAltarTick = function () {
      const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
      const F = window.__refAltarFlames;
      for (let i = 0; i < F.length; i++) {
        const f = F[i];
        // per-flame phase so candles don't flicker in unison
        const n = 0.72
          + 0.18 * Math.sin(t * 11.0 + f.ph)
          + 0.10 * Math.sin(t * 23.0 + f.ph * 2.3);
        if (f.flame) {
          f.flame.scale.set(0.9 + 0.14 * n, 0.82 + 0.42 * n, 0.9 + 0.14 * n);
        }
        if (f.light) f.light.intensity = f.base * (0.78 + 0.40 * n);
      }
      requestAnimationFrame(window.__refAltarTick);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(window.__refAltarTick);
  }

  // ---- one golden candlestick (returns a Group) -----------------------------
  function makeCandle(gold) {
    const c = new THREE.Group();
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.06, 8), gold);
    foot.position.y = 0.03; c.add(foot);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), gold);
    knot.position.y = 0.10; c.add(knot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.30, 8), gold);
    stem.position.y = 0.27; c.add(stem);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.05, 0.07, 8), gold);
    cup.position.y = 0.45; c.add(cup);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.20, 8), M(COL.wax));
    candle.position.y = 0.57; c.add(candle);

    // glowing flame tip (unlit basic material reads as emissive) + wick
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 4), M(0x1a1a1a));
    wick.position.y = 0.68; c.add(wick);
    const halo = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.20, 7),
      new THREE.MeshBasicMaterial({ color: 0xffb14a, transparent: true, opacity: 0.55 }));
    halo.position.y = 0.75; c.add(halo);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    flame.position.y = 0.75; c.add(flame);

    const light = new THREE.PointLight(0xffbf66, 0.6, 3.4, 2);
    light.position.y = 0.80; c.add(light);

    // register both cones (halo carries the flickering PointLight)
    window.__refAltarFlames.push({ flame: halo, light, base: 0.6, ph: Math.random() * 6.283 });
    window.__refAltarFlames.push({ flame, light: null, base: 0, ph: Math.random() * 6.283 });

    c.traverse(o => { if (o.isMesh && o.material && o.material.type !== 'MeshBasicMaterial') o.castShadow = true; });
    return c;
  }

  // ---- an open standing book ------------------------------------------------
  function makeBook() {
    const b = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.30, 0.05), M(COL.book));
    cover.position.set(0, 0.15, -0.03); b.add(cover);
    const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.27, 0.03), M(COL.page));
    pageL.position.set(-0.115, 0.155, 0.01); pageL.rotation.y = 0.22; b.add(pageL);
    const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.27, 0.03), M(COL.page));
    pageR.position.set(0.115, 0.155, 0.01); pageR.rotation.y = -0.22; b.add(pageR);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.06), M(COL.book));
    spine.position.set(0, 0.155, 0.0); b.add(spine);
    b.traverse(o => { if (o.isMesh) o.castShadow = true; });
    b.rotation.x = -0.20; // tip pages toward the viewer
    return b;
  }

  // ---- a golden cross emblem (generic medieval) -----------------------------
  function makeCross(gold) {
    const c = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.05), gold);
    post.position.y = 0.21; c.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.05), gold);
    arm.position.y = 0.29; c.add(arm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 6, 14), gold);
    ring.position.y = 0.29; ring.rotation.x = 0; c.add(ring);   // Celtic-style halo
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.05, 8), gold);
    foot.position.y = 0.025; c.add(foot);
    c.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return c;
  }

  // ---- a small golden chalice ----------------------------------------------
  function makeChalice(gold) {
    const c = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.04, 8), gold);
    base.position.y = 0.02; c.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.10, 8), gold);
    stem.position.y = 0.09; c.add(stem);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.04, 0.11, 8), gold);
    cup.position.y = 0.19; c.add(cup);
    c.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return c;
  }

  // ===========================================================================
  window.makeRefAltar = function (x, z, rot) {
    x = x || 0; z = z || 0; rot = rot || 0;
    const g = new THREE.Group();

    // footprint of the altar table (roughly 2.6 x 1.2 tiles) -----------------
    const W = 2.6, D = 1.15, topY = 1.02;
    const gold = goldGlow(COL.gold, COL.goldGlowE);

    // --- stone plinth base (floor level, with horizontal grooves) -----------
    const base = new THREE.Mesh(new THREE.BoxGeometry(W - 0.15, 0.24, D - 0.10), M(COL.stone));
    base.position.y = 0.12; base.castShadow = true; base.receiveShadow = true; g.add(base);
    for (const gy of [0.09, 0.19]) {   // groove lines
      const grv = new THREE.Mesh(new THREE.BoxGeometry(W - 0.10, 0.02, D - 0.04), M(COL.stoneD));
      grv.position.y = gy; g.add(grv);
    }

    // --- shadowed recess under the cloth (the dark void in the ref) ---------
    const recess = new THREE.Mesh(new THREE.BoxGeometry(W - 0.30, 0.55, D - 0.28), M(COL.dark));
    recess.position.y = 0.52; g.add(recess);

    // --- ivory altar cloth: top slab ----------------------------------------
    const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, D), M(COL.cloth));
    top.position.y = topY; top.castShadow = true; top.receiveShadow = true; g.add(top);
    // hem trim just under the top edge
    const hem = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.03, D + 0.02), M(COL.trim));
    hem.position.y = topY - 0.085; g.add(hem);

    // --- cloth drapes: front (short, revealing recess), back & sides (long) -
    const frontDrapeH = 0.46, frontTop = topY - 0.09;
    const front = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, frontDrapeH, 0.05), M(COL.cloth));
    front.position.set(0, frontTop - frontDrapeH / 2, D / 2 - 0.02); front.castShadow = true; g.add(front);

    const sideH = topY - 0.14;   // sides fall nearly to the base
    for (const sx of [-(W / 2 - 0.025), (W / 2 - 0.025)]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, sideH, D - 0.04), M(COL.clothLo));
      side.position.set(sx, (topY - 0.09) - sideH / 2, 0); side.castShadow = true; g.add(side);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, sideH, 0.05), M(COL.clothLo));
    back.position.set(0, (topY - 0.09) - sideH / 2, -(D / 2 - 0.02)); back.castShadow = true; g.add(back);

    // subtle vertical folds on the front drape (alternating light/dark) ------
    const nFolds = 7;
    for (let i = 0; i < nFolds; i++) {
      const fx = -W / 2 + 0.28 + i * ((W - 0.56) / (nFolds - 1));
      const shade = (i % 2 === 0) ? COL.clothHi : COL.clothLo;
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.10, frontDrapeH * 0.96, 0.03), M(shade));
      fold.position.set(fx, frontTop - frontDrapeH / 2, D / 2 + 0.005);
      fold.rotation.z = (i - nFolds / 2) * 0.01;
      g.add(fold);
    }

    // === dressing on the table top =========================================
    const surf = topY + 0.07;  // top surface of cloth slab

    // two flanking candlesticks (near front corners) ------------------------
    for (const cx of [-(W / 2 - 0.42), (W / 2 - 0.42)]) {
      const cand = makeCandle(gold);
      cand.position.set(cx, surf, D / 2 - 0.30);
      g.add(cand);
    }

    // open book, back-centre -------------------------------------------------
    const book = makeBook();
    book.position.set(0, surf, -(D / 2 - 0.34));
    g.add(book);

    // golden cross emblem, front-centre -------------------------------------
    const cross = makeCross(gold);
    cross.position.set(0, surf, D / 2 - 0.34);
    g.add(cross);

    // golden chalice accent --------------------------------------------------
    const chalice = makeChalice(gold);
    chalice.position.set(W / 2 - 1.0, surf, -0.02);
    g.add(chalice);

    // --- place & orient -----------------------------------------------------
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.userData = g.userData || {};
    g.userData.kind = 'ref_altar';
    g.userData.label = 'Pray at the <b>Altar</b>';
    return g;
  };

  console.log('[ref_altar] makeRefAltar ready');
})();
