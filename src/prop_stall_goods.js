/* ============================================================================
   prop_stall_goods.js — MARKET STALL GOODS (per-trade dressing)
   References: Bible_References/Cake_Stall.jpg, Gem_Stall.jpg,
   EmptyStall+FurStall.jpg — the OSRS market-stall VARIANTS, where each stall's
   counter carries the goods of its trade:
     - CAKE   : stacked yellow sponge cakes, a tall rounded loaf, round pie in a
                cream dish, a layered "burger" cake, a brown-filling pie, a knife,
                a wicker basket in the back corner.
     - GEM    : two dark cloth display boards strewn with faceted cut gems (ruby,
                diamond, emerald, sapphire/amethyst, topaz, magenta), a small open
                wooden gem tray with a couple loose stones, a balance scale.
     - FUR    : folded yellow-tan pelts stacked, one pelt draped over the counter
                lip, a small basket/bowl, a scraping tool. (Empty-stall = bare +
                a couple of small crates in the corner.)
     - CRATE  : bare counter with 1-2 small wooden crates + a sack (the empty
                stall look) — used to vary any extra trade stalls.

   Our base market stall is the PROP PIPELINE asset (assets/models/stall.glb),
   built per stall by makeStall() (game2_world.js) and makeCanvasStall()
   (town_square.js). Both add two/three placeholder "goods" boxes on the counter
   and register the stall group with userData.kind==='stall'. This file finds
   those stall groups at runtime, HIDES the placeholder blobs, and parents a
   proper per-trade goods cluster onto the counter (group-local coords, so the
   goods inherit each stall's position + rotation automatically).

   Self-booting IIFE (mirrors world_scatter.js / prop_crates.js). Depends ONLY on
   globals declared elsewhere: THREE, mat(), scene, WORLD, PROC, running. Adds
   NOTHING to game2_world.js / game4_ui.js / game3_systems.js / game1_data.js.
   Goods are small and sit ON the counter surface — NO new colliders. Low-poly,
   flat-shaded, cozy 2007/OSRS palette.
   ========================================================================== */
(function(){
  // counter top surface in stall-group-local space (placeholder goods sat with
  // their base ~0.87–0.90; makeStall/makeCanvasStall put boxes centred ~1.02).
  const S = 0.90;
  const rnd = i => Math.abs(Math.sin(i*127.1 + 13.7) * 43758.5453) % 1;

  /* ---------- shared little pieces ---------- */
  // a faceted cut gem — an octahedron is a diamond silhouette in low poly
  function gem(col, r){
    const g = new THREE.Mesh(new THREE.OctahedronGeometry(r||0.055, 0),
      new THREE.MeshPhongMaterial({color:col, flatShading:true, shininess:14,
        specular:0x222222, emissive:new THREE.Color(col).multiplyScalar(0.10)}));
    g.rotation.y = Math.random()*Math.PI;
    g.scale.y = 1.3;                       // taller = cut-stone read
    return g;
  }
  // a small open wooden crate (filled) — for the empty-stall / crate variant
  function crate(s){
    s = s || 0.24;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(s, s*0.85, s), mat(0xa9783a));
    body.position.y = s*0.425; g.add(body);
    // corner posts so it reads as slatted, not a solid cube
    const post = new THREE.BoxGeometry(s*0.10, s*0.9, s*0.10);
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      const p = new THREE.Mesh(post, mat(0x6e4d24));
      p.position.set(sx*s*0.46, s*0.45, sz*s*0.46); g.add(p);
    }
    g.traverse(o=>{ if(o.isMesh) o.castShadow = true; });
    return g;
  }
  // a lumpy little sack
  function sack(col){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), mat(col||0xc6ab74));
    body.scale.set(1, 1.15, 0.9); body.position.y = 0.13; g.add(body);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 6), mat(col||0xc6ab74));
    top.position.y = 0.27; g.add(top);
    g.traverse(o=>{ if(o.isMesh) o.castShadow = true; });
    return g;
  }

  /* ---------- CAKE STALL goods ---------- */
  function cakeGoods(){
    const g = new THREE.Group();
    const YEL = 0xe6c64a, YEL2 = 0xdcbb3e, TAN = 0xe2b24a, CREAM = 0xece2cc,
          GOLD = 0xd8a030, BROWN = 0x8a5a2a, GREY = 0xb8b2a4;
    // a stack of square sponge cakes (left)
    for(let i=0;i<3;i++){
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.24-i*0.02, 0.11, 0.24-i*0.02),
        mat(i%2?YEL2:YEL));
      c.position.set(-0.46 + (rnd(i)-0.5)*0.04, S + 0.055 + i*0.11, -0.02);
      g.add(c);
    }
    // a tall rounded loaf/cake
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(TAN));
    loaf.scale.set(1, 1.5, 1); loaf.position.set(-0.02, S + 0.19, -0.10); g.add(loaf);
    // round pie in a cream dish (centre)
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.06, 10), mat(CREAM));
    dish.position.set(0.10, S + 0.03, 0.12); g.add(dish);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), mat(GOLD));
    fill.position.set(0.10, S + 0.075, 0.12); g.add(fill);
    // a layered "burger" cake (two buns + a filling disc)
    const bunGeo = new THREE.SphereGeometry(0.12, 8, 5);
    const b1 = new THREE.Mesh(bunGeo, mat(YEL)); b1.scale.set(1, 0.6, 1);
    b1.position.set(0.44, S + 0.05, -0.06); g.add(b1);
    const filD = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 9), mat(BROWN));
    filD.position.set(0.44, S + 0.10, -0.06); g.add(filD);
    const b2 = new THREE.Mesh(bunGeo, mat(YEL2)); b2.scale.set(1, 0.55, 1);
    b2.position.set(0.44, S + 0.15, -0.06); g.add(b2);
    // a brown-filling pie (front right)
    const pd = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.05, 10), mat(CREAM));
    pd.position.set(0.50, S + 0.025, 0.17); g.add(pd);
    const pdome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 5, 0, 6.3, 0, 1.2), mat(BROWN));
    pdome.position.set(0.50, S + 0.05, 0.17); g.add(pdome);
    // a serving knife
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.045), mat(GREY));
    blade.position.set(0.14, S + 0.012, 0.30); blade.rotation.y = 0.3; g.add(blade);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.03), mat(0x5a3a22));
    handle.position.set(-0.02, S + 0.012, 0.34); handle.rotation.y = 0.3; g.add(handle);
    // a wicker basket in the back corner
    const bask = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.22, 9, 1, true), mat(0xb58a44));
    bask.material.side = THREE.DoubleSide;
    bask.position.set(-0.58, S + 0.11, -0.26); g.add(bask);
    return g;
  }

  /* ---------- GEM STALL goods ---------- */
  function gemGoods(){
    const g = new THREE.Group();
    const GEMS = [0xd12a4a, 0xeef2ff, 0x9a3ad1, 0x3ad14a, 0xe8d63a, 0xd13a9a,
                  0x3a7ad1, 0xff8a2a];
    // two dark cloth display boards
    const boardGeo = new THREE.BoxGeometry(0.44, 0.035, 0.34);
    const boards = [[-0.30, -0.02], [0.18, -0.02]];
    boards.forEach(([bx,bz], bi)=>{
      const bd = new THREE.Mesh(boardGeo, mat(0x2a2630));
      bd.position.set(bx, S + 0.018, bz); g.add(bd);
      // a thin wooden frame lip
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.02, 0.37), mat(0x7d6a3a));
      lip.position.set(bx, S + 0.006, bz); g.add(lip);
      // scatter faceted gems across the board
      for(let i=0;i<10;i++){
        const seed = bi*31 + i*7 + 1;
        const gx = bx + (rnd(seed)-0.5)*0.34;
        const gz = bz + (rnd(seed+99)-0.5)*0.24;
        const st = gem(GEMS[Math.floor(rnd(seed+3)*GEMS.length)], 0.038 + rnd(seed+5)*0.03);
        st.position.set(gx, S + 0.06, gz); g.add(st);
      }
    });
    // a small open wooden tray with a couple of loose stones (left)
    const tray = crate(0.20); tray.position.set(-0.62, S, 0.18); g.add(tray);
    const t1 = gem(0xd12a4a, 0.05); t1.position.set(-0.62, S + 0.20, 0.18); g.add(t1);
    const t2 = gem(0x9a3ad1, 0.045); t2.position.set(-0.55, S + 0.20, 0.22); g.add(t2);
    // a couple of loose gems on the bare counter (front)
    const l1 = gem(0xd13a9a, 0.05); l1.position.set(-0.05, S + 0.05, 0.32); g.add(l1);
    const l2 = gem(0x9a3ad1, 0.045); l2.position.set(0.06, S + 0.045, 0.30); g.add(l2);
    // a balance scale (right): post, beam, two shallow pans
    const scale = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.32, 6), mat(0x9a948a));
    post.position.y = 0.16; scale.add(post);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.02), mat(0x9a948a));
    beam.position.y = 0.32; scale.add(beam);
    for(const sx of [-1,1]){
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.02, 0.05, 9), mat(0xb0aa9e));
      pan.position.set(sx*0.15, 0.24, 0); scale.add(pan);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 4), mat(0x777168));
      wire.position.set(sx*0.15, 0.285, 0); scale.add(wire);
    }
    scale.position.set(0.52, S, 0.10);
    scale.traverse(o=>{ if(o.isMesh) o.castShadow = true; });
    g.add(scale);
    return g;
  }

  /* ---------- FUR STALL goods ---------- */
  function furGoods(){
    const g = new THREE.Group();
    const F1 = 0xd8c24a, F2 = 0xcbb63e, F3 = 0xc0a838;   // yellow-tan pelts (per ref)
    // two stacks of folded pelts (folded = a flattened, slightly-tapered box)
    function pelt(col){
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.22), mat(col));
      return p;
    }
    const stackA = [F1, F2, F3];
    stackA.forEach((c,i)=>{
      const p = pelt(c);
      p.position.set(-0.34 + (rnd(i)-0.5)*0.05, S + 0.045 + i*0.07, -0.04);
      p.rotation.y = (rnd(i+10)-0.5)*0.4; g.add(p);
    });
    const stackB = [F2, F1];
    stackB.forEach((c,i)=>{
      const p = pelt(c);
      p.position.set(0.36 + (rnd(i+5)-0.5)*0.05, S + 0.045 + i*0.07, 0.0);
      p.rotation.y = (rnd(i+20)-0.5)*0.5; g.add(p);
    });
    // one pelt draped over the front counter lip (tilts down over the edge)
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.26), mat(F1));
    drape.position.set(0.05, S + 0.02, 0.34); drape.rotation.x = 0.45; g.add(drape);
    // a small basket/bowl in the middle
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.12, 9, 1, true), mat(0x8a6a3a));
    bowl.material.side = THREE.DoubleSide;
    bowl.position.set(-0.02, S + 0.06, -0.08); g.add(bowl);
    // a scraping tool (curved blade suggested by a thin wedge) + handle
    const tool = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.05), mat(0xb8b2a4));
    tool.position.set(-0.12, S + 0.01, 0.16); tool.rotation.y = -0.4; g.add(tool);
    const th = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.03), mat(0x5a3a22));
    th.position.set(-0.22, S + 0.01, 0.20); th.rotation.y = -0.4; g.add(th);
    return g;
  }

  /* ---------- CRATE / EMPTY STALL goods ---------- */
  function crateGoods(){
    const g = new THREE.Group();
    // a bare-ish counter with a couple of small crates in the back corner + a sack
    const c1 = crate(0.26); c1.position.set(-0.50, S, -0.14); g.add(c1);
    const c2 = crate(0.22); c2.position.set(-0.28, S, -0.22); g.add(c2);
    const c3 = crate(0.20); c3.position.set(-0.40, S + 0.221, -0.14); g.add(c3);  // one on top
    const sk = sack(0xb7a06a); sk.position.set(0.42, S, -0.06); g.add(sk);
    const sk2 = sack(0xc6ab74); sk2.position.set(0.60, S, 0.04); g.add(sk2);
    return g;
  }

  const BUILDERS = { cake:cakeGoods, gem:gemGoods, fur:furGoods, crate:crateGoods };
  // map a stall's trade to a goods variant; unknown trades fall to a position hash
  function variantFor(g){
    const k = g.userData && g.userData.stall;
    if(k === 'baker')  return 'cake';
    if(k === 'silver') return 'gem';
    if(k === 'spice')  return 'fur';
    const pick = ['cake','gem','fur','crate'];
    const h = Math.abs(Math.round((g.position.x*7 + g.position.z*13)));
    return pick[h % pick.length];
  }

  /* dress ONE stall group: hide the placeholder blobs, parent the goods cluster */
  function dress(g){
    if(!g || g.userData._goodsDressed) return false;
    g.userData._goodsDressed = true;
    // hide the placeholder goods: they are the direct Mesh children of the stall
    // group (the GLB clone is a Group child, so it is never touched).
    g.children.slice().forEach(c=>{ if(c.isMesh) c.visible = false; });
    const kind = variantFor(g);
    const goods = (BUILDERS[kind] || crateGoods)();
    goods.traverse(o=>{ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
    goods.userData._stallGoods = true;
    g.add(goods);
    return true;
  }

  /* find every stall group in the live scene (kind==='stall'), dress the new ones */
  function dressAll(){
    let n = 0;
    const seen = new Set();
    // WORLD.stalls holds the registered trade stalls; also sweep the scene graph
    // so town_square's late-loaded stalls are caught however they registered.
    (WORLD.stalls || []).forEach(g=>{ if(!seen.has(g)){ seen.add(g); if(dress(g)) n++; } });
    if(typeof scene !== 'undefined' && scene.traverse){
      scene.traverse(o=>{
        if(o && o.userData && o.userData.kind === 'stall' && !seen.has(o)){
          seen.add(o); if(dress(o)) n++;
        }
      });
    }
    return n;
  }

  // boot once the world is live; keep polling a bounded window so town_square's
  // interval-built stalls (which arrive a few seconds after play) get dressed too.
  let ticks = 0, idle = 0, everDressed = 0;
  const iv = setInterval(()=>{
    try{
      if(typeof running === 'undefined' || !running) return;
      if(typeof scene === 'undefined' || typeof WORLD === 'undefined') return;
      if(typeof THREE === 'undefined' || typeof mat !== 'function') return;
      ticks++;
      const n = dressAll();
      everDressed += n;
      idle = (n === 0) ? idle + 1 : 0;
      // stop once things have settled (dressed some, then 4 quiet ticks) or after ~45s
      if((everDressed > 0 && idle >= 4) || ticks > 30){
        if(everDressed > 0 && typeof UI !== 'undefined' && UI.chat)
          UI.chat('[MAP] Market stalls dressed with per-trade goods: '+everDressed+' stalls.','sys');
        clearInterval(iv);
      }
    } catch(e){ console.error('[prop_stall_goods]', e); clearInterval(iv); }
  }, 1500);
})();
