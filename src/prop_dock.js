/* ================= PROP: DOCK / PIER / JETTY ================= */
/* Reference: Bible_References/Port+Dock.jpg — a planked timber jetty on pilings that
 * steps out over the harbour water, railed on both sides, with mooring bollards, rope
 * loops, a ladder down to the water and dock cargo (crates + barrels). Cozy 2007/OSRS,
 * low-poly FLAT-SHADED. Self-booting IIFE (like world_scatter.js / saltreach.js).
 *
 * ENUMERATION vs the reference (Reference Inventory Rule):
 *   planked pier walkway ....... BUILT (cross-plank deck, weathered wood seams)
 *   support posts / pilings .... BUILT (paired cylinders sunk to the sea plane)
 *   railings both sides ........ BUILT (posts + top rail + mid rail — the gap the
 *                                       existing bare piers in saltreach/brynholt lack)
 *   mooring bollards ........... BUILT (fat capped posts at the seaward corners)
 *   rope loop / coil ........... BUILT (torus rope loops slung on the bollards)
 *   ladder down to the water ... BUILT (side rails + rungs, deck → sea plane)
 *   crates / barrels on dock ... BUILT (reuses Buildkit furniture where present)
 *   a boat ..................... ALREADY EXISTS — makeRowboat() (world_scatter.js);
 *                                saltreach.js / brynholt.js already float one, so we
 *                                do NOT rebuild it here (enumerated, not duplicated).
 *
 * WALKABILITY: matches how the existing over-water walkways work — the deck sits near
 *   ground level (deckY -0.55) so the shore end is walkable on the groundY plane; it is
 *   VISUAL over open water (no registered Planes floor, no blocking deck colliders), so
 *   the player is never fenced off the shore. Only the shore-side mooring posts and
 *   under-deck pilings are structural, and they sit over water where nobody walks, so we
 *   deliberately add NO colliders (guarding collides() — the walkway stays clear).
 *
 * Deps (all global from game2_world.js / buildkit.js): THREE, mat(), gy(), groundY(),
 *   scene, WORLD, ZONES, Buildkit, makeRowboat. Loaded AFTER world_scatter.js.
 */
const DOCK = { SEA_Y: -1.6, DECK_Y: -0.55, DECK_W: 2.4 };

/* Build a jetty along LOCAL +Z, then rotate the whole group to face `angle`.
 * cfg = { x, z, angle, len, tee, ladder }
 *   x,z   world shore-start (deck begins here, on land, and runs out over the water)
 *   angle rad — 0 = +Z (south), PI = north, PI/2 = +X (east), -PI/2 = west
 *   len   deck length in world units
 *   tee   true -> add a cross-deck at the seaward end (the reference T-junction)
 */
function makeDock(cfg){
  const g = new THREE.Group();
  const deckY = DOCK.DECK_Y, seaY = DOCK.SEA_Y, HW = DOCK.DECK_W/2;
  const L = cfg.len || 12;
  // weathered salt-bleached timber palette (flat-shaded via global mat())
  const plankA = mat(0x6f5638), plankB = mat(0x7d6444), woodDark = mat(0x503c28);
  const rope = mat(0xb7a06a);

  // ---- deck: cross planks laid along +Z (the reference's plank seams) ----
  const SEG = 0.52;
  for(let z=0; z<L-0.01; z+=SEG){
    const p = new THREE.Mesh(new THREE.BoxGeometry(DOCK.DECK_W, 0.11, SEG*0.86),
      (Math.round(z/SEG)%2) ? plankA : plankB);
    p.position.set(0, deckY, z + SEG*0.5); p.castShadow=true; p.receiveShadow=true; g.add(p);
  }
  // two stringer beams under the deck edges tie the planks together
  for(const s of [-1,1]){
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, L), woodDark);
    beam.position.set(s*(HW-0.18), deckY-0.12, L/2); g.add(beam);
  }

  // ---- pilings: paired posts sunk from the deck to below the sea plane ----
  const pileH = (deckY - (seaY-0.5));
  for(let z=0.4; z<L; z+=2.4) for(const s of [-1,1]){
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, pileH, 6), woodDark);
    pile.position.set(s*(HW-0.05), (deckY - pileH/2 - 0.05), z);
    pile.castShadow=true; g.add(pile);
  }

  // ---- railings both sides: posts + top rail + mid rail (start past the shore entry) ----
  for(const s of [-1,1]){
    const rx = s*(HW+0.02);
    for(let z=1.0; z<=L-0.3; z+=1.5){
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.07,0.92,5), plankA);
      post.position.set(rx, deckY+0.46, z); post.castShadow=true; g.add(post);
    }
    for(const ry of [deckY+0.86, deckY+0.5]){
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, L-1.1), woodDark);
      rail.position.set(rx, ry, (L+0.7)/2); g.add(rail);
    }
  }

  // ---- mooring bollards + rope loops at the seaward corners ----
  for(const s of [-1,1]){
    const bx = s*(HW+0.28), bz = L-0.5;
    const boll = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.17,0.95,7), woodDark);
    boll.position.set(bx, deckY+0.45, bz); boll.castShadow=true; g.add(boll);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17,7,5), plankB);
    cap.position.set(bx, deckY+0.92, bz); cap.scale.y=0.7; g.add(cap);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.2,0.045,5,9), rope);
    loop.position.set(bx, deckY+0.55, bz); loop.rotation.x=Math.PI/2; loop.scale.z=1.4; g.add(loop);
  }
  // a coil of rope resting on the deck near the shore
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22,0.055,5,12), rope);
  coil.position.set(HW-0.5, deckY+0.11, 1.6); coil.rotation.x=Math.PI/2; g.add(coil);

  // ---- ladder down to the water at the seaward end (one side) ----
  if(cfg.ladder !== false){
    const lx = HW+0.12, lz = L-0.7, ladH = deckY - seaY + 0.15;
    for(const s of [-0.22, 0.22]){
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,ladH,5), woodDark);
      rail.position.set(lx, deckY - ladH/2 + 0.1, lz+s); g.add(rail);
    }
    const rungs = Math.max(3, Math.round(ladH/0.34));
    for(let i=0;i<rungs;i++){
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,0.5,5), plankB);
      rung.rotation.x=Math.PI/2; rung.position.set(lx, deckY-0.1 - i*(ladH-0.2)/rungs, lz);
      g.add(rung);
    }
  }

  // ---- the T-junction cross deck at the seaward end (reference) ----
  if(cfg.tee){
    const tz = L-1.1, tHW = 2.2;
    for(let x=-tHW; x<tHW-0.01; x+=SEG){
      const p = new THREE.Mesh(new THREE.BoxGeometry(SEG*0.86, 0.11, DOCK.DECK_W),
        (Math.round(x/SEG)%2) ? plankA : plankB);
      p.position.set(x+SEG*0.5, deckY, tz); p.castShadow=true; g.add(p);
    }
    for(const s of [-1,1]){                       // pilings under the arms
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.14,pileH,6), woodDark);
      pile.position.set(s*(tHW-0.2), deckY-pileH/2-0.05, tz); g.add(pile);
      // arm-end mooring posts
      const boll = new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.16,0.9,7), woodDark);
      boll.position.set(s*(tHW-0.05), deckY+0.42, tz); g.add(boll);
    }
  }

  // ---- dock cargo: crates + a barrel near the shore end (reuse kit where present) ----
  const cargo = [];
  if(typeof Buildkit!=='undefined' && Buildkit.furniture){
    const c1 = Buildkit.furniture.crate(Buildkit);  c1.position.set(-HW+0.55, deckY+0.02, 2.4); cargo.push(c1);
    const c2 = Buildkit.furniture.crate(Buildkit);  c2.position.set(-HW+0.5, deckY+0.02, 3.3); c2.scale.set(0.8,0.8,0.8); cargo.push(c2);
    const b1 = Buildkit.furniture.barrel(Buildkit);  b1.position.set(HW-0.55, deckY+0.02, 3.1); cargo.push(b1);
  } else {                                          // fallback if Buildkit not loaded yet
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62,0.62,0.62), plankB);
    crate.position.set(-HW+0.55, deckY+0.33, 2.6); crate.castShadow=true; cargo.push(crate);
  }
  cargo.forEach(c=>{ c.traverse(o=>{if(o.isMesh)o.castShadow=true;}); g.add(c); });

  g.position.set(cfg.x, 0, cfg.z);
  g.rotation.y = cfg.angle || 0;
  scene.add(g);
  return g;
}

/* ---- placement: probe from shore to the water edge, then run the jetty out ---- */
(function(){
  // step outward from (sx,sz) along (dx,dz) until groundY drops below the sea line;
  // returns the last on-shore coord, or null if no water within `max` tiles
  function coastEdge(sx, sz, dx, dz, max){
    for(let i=0;i<max;i++){
      const x=sx+dx*i, z=sz+dz*i, y=groundY(x,z);
      if(y!==null && y < -1.35) return {x: sx+dx*(i-1.5), z: sz+dz*(i-1.5)};
    }
    return null;
  }

  function build(){
    if(typeof scene==='undefined' || typeof WORLD==='undefined' || !WORLD.grounds || !WORLD.grounds.length) return false;
    if(typeof running==='undefined' || !running) return false;
    if(typeof groundY!=='function' || typeof ZONES==='undefined' || typeof mat!=='function') return false;
    if(!ZONES.saltreach || groundY(ZONES.saltreach.pos[0], ZONES.saltreach.pos[1])===null) return false;

    // SALTREACH PORT — the main harbour jetty, east of the existing bare pier (x~228),
    // reaching SOUTH into the bay. Probe the south shore so it meets the real waterline.
    const S = ZONES.saltreach.pos;                // [232, 48]
    let placed = 0;
    const eS = coastEdge(S[0]+4, S[1], 0, 1, 26);  // walk south (+z) from just east of centre
    if(eS){
      makeDock({ x:eS.x, z:eS.z-1.5, angle:0, len:13, tee:true, ladder:true });
      placed++;
    }

    // BRYNHOLT (optional) — a second short fishing jetty, offset SOUTH of the existing
    // dock (~z-16) so the two don't overlap; only builds if the probe actually finds sea.
    if(ZONES.brynholt && groundY(ZONES.brynholt.pos[0], ZONES.brynholt.pos[1])!==null){
      const b = ZONES.brynholt.pos;               // [178, -97]
      const eB = coastEdge(b[0]+12, b[1]-6, 1, 0, 26);  // walk east into the NE sea
      if(eB){ makeDock({ x:eB.x-1.5, z:eB.z, angle:Math.PI/2, len:9, tee:false, ladder:true }); placed++; }
    }

    if(placed && typeof UI!=='undefined' && UI.chat)
      UI.chat('[MAP] The harbour jetty stands out over the water — railed planks, mooring posts, and a ladder to the tide.','sys');
    return placed>0;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[prop_dock]', e); clearInterval(iv); } }, 2200);
})();
