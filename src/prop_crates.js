/* ============================================================================
   prop_crates.js — CARGO DRESSING VARIETY PASS
   Reference: Bible_References/Crates+More.jpg (OSRS market cargo: single &
   stacked crates, staved barrels + barrel rows, lumpy burlap sacks & sack
   piles, one stencil-marked crate). A basic crate/barrel already ships via the
   global PROC.crate() / PROC.barrel(); this adds the *variety* — clusters,
   rows, sacks — and hand-places them where cargo belongs (docks, market backs,
   warehouse corners).

   Self-booting IIFE (mirrors src/world_scatter.js / src/saltreach.js). Depends
   ONLY on globals declared elsewhere: THREE, mat(), gy(), groundY(), collides(),
   addCircleCollider(), scene, WORLD, PROC, ZONES, running. Loaded AFTER
   world_scatter.js so those are all defined by boot time. Adds NOTHING to the
   big three source files. Low-poly, flat-shaded, warm wood + burlap palette.
   ========================================================================== */
(function(){
  const CR = {
    burlap:   0xc6ab74,   // sun-bleached sack canvas
    burlapDk: 0xa88b57,   // shaded / dirtier sack
    burlapGr: 0xb7a06a,   // greyer grain sack
    twine:    0x7a5f38,   // tied neck cord
    stencil:  0x4a3418,   // painted crate stencil / brand
    crateWood:0xa9783a,   // matches PROC.crate body
    crateFrame:0x6e4d24,
  };

  /* --- a lumpy burlap sack: low-poly rounded bag, pinched + tied neck --- */
  function makeSack(col){
    const g = new THREE.Group();
    col = col || CR.burlap;
    // body: a squashed low-seg sphere, faceted so it reads as stuffed canvas
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.30, 7, 5), mat(col));
    body.scale.set(1.0, 1.15, 0.9);
    body.position.y = 0.30; body.castShadow = true; g.add(body);
    // belly lump (offset) so no two sacks read as a clean ball
    const lump = new THREE.Mesh(new THREE.SphereGeometry(0.17, 6, 4), mat(col));
    lump.position.set(0.12, 0.20, 0.06); lump.scale.set(1, 0.85, 1); g.add(lump);
    // pinched neck + tied twine + gathered top
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.14, 6), mat(col));
    neck.position.y = 0.56; g.add(neck);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.03, 5, 8), mat(CR.twine));
    tie.position.y = 0.55; tie.rotation.x = Math.PI/2; g.add(tie);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 6), mat(col));
    top.position.y = 0.66; g.add(top);
    return g;
  }

  /* --- a barrel: reuse the shared PROC.barrel() so art matches everywhere --- */
  function makeBarrel(){ return PROC.barrel(); }

  /* --- a crate: shared PROC.crate(); optional painted stencil face --- */
  function makeCrateP(stencil){
    const g = PROC.crate();
    if(stencil){
      // an 'X' brand / diamond stencil on the +Z face (as in the reference)
      const s = 0.62, y = 0.29, zf = 0.302;
      const bar = (rot)=>{
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.055, s*0.86, 0.02), mat(CR.stencil));
        b.position.set(0, y, zf); b.rotation.z = rot; return b;
      };
      g.add(bar( Math.PI/4)); g.add(bar(-Math.PI/4));   // the painted X
      const dia = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02), mat(CR.stencil));
      dia.position.set(0, y, zf); dia.rotation.z = Math.PI/4; g.add(dia);  // centre diamond
    }
    return g;
  }

  /* ---- CLUSTER BUILDERS (world coords; seat on gy; collide solid pieces) ---- */

  // a chunky stacked-crate cluster: 3 base crates, 1 stenciled, 1 on top, a barrel + sack
  function crateStack(x, z){
    const g = new THREE.Group();
    const add = (m, ox, oy, oz, ry)=>{ m.position.set(ox, oy, oz); m.rotation.y = ry||0; g.add(m); };
    add(makeCrateP(false),  0.00, 0,  0.00, 0.02);
    add(makeCrateP(true),   0.66, 0,  0.10, -0.08);   // stencil-marked crate faces out
    add(makeCrateP(false), -0.02, 0,  0.66, 0.12);
    add(makeCrateP(false),  0.32, 0.58, 0.34, 0.40);  // one hoisted on top
    const bar = makeBarrel(); bar.scale.set(0.92,0.92,0.92); add(bar, 0.72, 0, 0.78, 0.5);
    add(makeSack(CR.burlapDk), -0.42, 0, 0.30, 0.3);
    seat(g, x, z, Math.random()*6);
    // one fat circle round the whole footprint (chunky low-poly, cheap)
    addCircleCollider(x, z, 0.95);
    return g;
  }

  // a row of barrels (like a delivery lined up dockside), n barrels along +X
  function barrelRow(x, z, n, rot){
    const g = new THREE.Group();
    n = n || 3;
    for(let i=0;i<n;i++){
      const b = makeBarrel();
      b.position.set(i*0.78 - (n-1)*0.39, 0, (i%2)*0.06);
      b.rotation.y = Math.random()*6;
      g.add(b);
    }
    // a stray sack leaning on the end
    if(Math.random()<0.7){ const s = makeSack(CR.burlapGr); s.position.set((n-1)*0.39+0.55, 0, 0.1); g.add(s); }
    seat(g, x, z, rot!=null?rot:Math.random()*6);
    addCircleCollider(x, z, Math.max(0.5, n*0.42));   // one footprint circle for the row
    return g;
  }

  // a loose pile of sacks (grain sacks tumbled in a heap)
  function sackPile(x, z){
    const g = new THREE.Group();
    const spots = [[0,0,0,CR.burlap],[0.42,0,0.1,CR.burlapDk],[0.2,0,0.44,CR.burlapGr],
                   [0.24,0.34,0.22,CR.burlap]];   // one flopped on top of the heap
    spots.forEach(([ox,oy,oz,c])=>{
      const s = makeSack(c);
      s.position.set(ox, oy, oz); s.rotation.y = Math.random()*6;
      if(oy>0){ s.rotation.z = Math.PI/2.3; s.position.y = 0.30; }  // top sack laid on its side
      g.add(s);
    });
    seat(g, x, z, Math.random()*6);
    addCircleCollider(x, z, 0.6);
    return g;
  }

  /* seat a group on the terrain + add to scene */
  function seat(g, x, z, ry){
    g.position.set(x, gy(x,z), z); g.rotation.y = ry||0;
    g.traverse(o=>{ if(o.isMesh) o.castShadow = true; });
    scene.add(g);
    return g;
  }

  /* place a builder only if the spot is on solid ground and not already blocked */
  function place(fn, x, z){
    if(typeof groundY!=='function' || groundY(x,z)===null) return false;   // skip water/void
    if(typeof collides==='function' && collides(x,z,0.5)) return false;    // don't jam a doorway/wall/other prop
    try { fn(x, z); return true; }
    catch(e){ console.error('[prop_crates] build failed @'+x+','+z, e); return false; }
  }

  /* ---- PLACEMENT: cargo where it belongs ---- */
  function dressWorld(){
    let n = 0;
    // Veyhollow Commons — behind the market row / general store (existing clusters
    // sit at 3.2,-8.6 / -9.8,-6.2 / 11.2,13.8 / -15.6,3.4; these fill the gaps).
    n += place(crateStack, 13.5, -15.5) ? 1:0;     // stacked cargo behind the bazaar lane
    n += place(barrelRow.bind(null,-13.0,-19.5,3,0.2), -13.0, -19.5) ? 1:0;
    n += place(sackPile,   -6.5, -20.5) ? 1:0;      // grain sacks by the food stalls
    n += place(barrelRow.bind(null,16.5,-8.0,2,1.4), 16.5, -8.0) ? 1:0;
    n += place(sackPile,   -17.5, 5.0) ? 1:0;

    // Saltreach Port — the harbour warehouse corner + dockside deliveries
    if(typeof ZONES!=='undefined' && ZONES.saltreach){
      const S = ZONES.saltreach.pos;
      n += place(crateStack, S[0]-6.0, S[1]+3.5) ? 1:0;   // warehouse corner
      n += place(barrelRow.bind(null, S[0]+6.0, S[1]+2.5, 3, 0.1), S[0]+6.0, S[1]+2.5) ? 1:0;
      n += place(sackPile,   S[0]+2.5, S[1]-6.0) ? 1:0;   // by the warehouse wall (S.z-9)
      n += place(crateStack, S[0]-3.0, S[1]-6.5) ? 1:0;
    }

    // Brynholt — the frost-coast dock (mead hall / bowyer trade goods)
    if(typeof ZONES!=='undefined' && ZONES.brynholt){
      const b = ZONES.brynholt.pos;
      n += place(barrelRow.bind(null, b[0]+11.5, b[1]+2.0, 3, 0.3), b[0]+11.5, b[1]+2.0) ? 1:0;
      n += place(sackPile,   b[0]+6.5, b[1]+8.5) ? 1:0;
      n += place(crateStack, b[0]-9.5, b[1]+3.0) ? 1:0;   // palisade store corner
    }

    if(typeof UI!=='undefined' && UI.chat && n>0)
      UI.chat('[MAP] Cargo dressing set: '+n+' crate/barrel/sack clusters at the docks & markets.','sys');
    return n>0;
  }

  // boot once the world is live (grounds built + PROC ready), like the region files
  const iv = setInterval(()=>{
    try{
      if(typeof running==='undefined' || !running) return;
      if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return;
      if(typeof PROC==='undefined' || typeof gy!=='function' || typeof mat!=='function') return;
      dressWorld();
      clearInterval(iv);
    } catch(e){ console.error('[prop_crates]', e); clearInterval(iv); }
  }, 2300);
})();
