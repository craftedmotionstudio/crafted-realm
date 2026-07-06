/* ============ ref_dock — OSRS-style wooden HARBOUR PORT / WHARF ============
 * Recreates Bible_References/Port+Dock.jpg to OSRS quality: a warm, weathered
 * timber wharf reaching out over the bay. From the reference it reproduces:
 *   - a wide railed plank DECK platform running out over the water, with an
 *     L/T seaward return arm (the reference's pier bends across the water);
 *   - cross-laid plank decking with alternating boards -> clear plank seams;
 *   - long edge STRINGER beams tying the boards together;
 *   - support PILINGS descending from the deck to below the sea line (~y=-1.5)
 *     with X cross-braces at the water;
 *   - side RAILINGS (posts + top rail) framing the walkway;
 *   - stout MOORING POSTS / bollards at the seaward corners, wound with a
 *     coiled hemp ROPE ring;
 *   - CARGO dressing the deck: stacked crates + a barrel near the shore;
 *   - a LADDER at the seaward end down to the tide;
 *   - a faint translucent WATER hint plane beneath the structure.
 *
 *   window.makeRefDock(x=0, z=0, rot=0)  ->  THREE.Group
 *      (seated at x,0,z; deck top at y=0; +Z runs out over the water)
 *
 * Art: low-poly FLAT-SHADED, THREE r128, 1 unit = 1 tile. Self-contained — the
 * only optional global borrowed is game2_world.js `mat()` (guarded). Repeated
 * planks / pilings / posts / rails are MERGED per-material to a handful of
 * meshes for perf; castShadow on solids.
 */
(function(){
  if (typeof THREE === 'undefined') { console.warn('[ref_dock] THREE not present'); return; }

  // ---- weathered warm-wood palette (matches the tan boards + grey-blue bay) ----
  const PLANK   = 0x9c7847;   // sun-bleached deck plank
  const PLANK_B = 0x835f38;   // alternating darker board -> visible plank seams
  const BEAM    = 0x6a4e2d;   // structural frame: stringers, joists, rails, braces
  const POST    = 0x74542f;   // support pilings / mooring bollards (wetter, greyer wood)
  const POST_D  = 0x52381f;   // deep-shadow timber
  const ROPE    = 0xa8945f;   // coiled hemp rope
  const CRATE   = 0x8a6a3c;   // cargo crate body
  const CRATE_R = 0x5e451f;   // crate frame rails
  const BARREL  = 0x7d5c33;   // barrel staves
  const HOOP    = 0x413024;   // barrel iron hoops
  const WATER   = 0x3f6f8c;   // translucent water hint

  // ---- material guard: prefer the game's flat-shaded mat(), else a lambert fallback ----
  const M = (c)=> (typeof mat==='function') ? mat(c)
                : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // ---- merge helper: batch same-material boxes/cyls/tori into ONE mesh ----
  const mergeFn = (()=>{ const B=THREE.BufferGeometryUtils||{}; return B.mergeBufferGeometries||B.mergeGeometries||null; })();
  function pushGeo(arr, g, x,y,z, rx,ry,rz){
    if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz);
    g.translate(x,y,z); arr.push(g);
  }
  function pushBox(arr, w,h,d, x,y,z, rx,ry,rz){ pushGeo(arr, new THREE.BoxGeometry(w,h,d), x,y,z, rx,ry,rz); }
  function pushCyl(arr, r0,r1,h,seg, x,y,z, rx,ry,rz){ pushGeo(arr, new THREE.CylinderGeometry(r0,r1,h,seg), x,y,z, rx,ry,rz); }
  function pushTorus(arr, r,tube,seg, x,y,z, rx,ry,rz){ pushGeo(arr, new THREE.TorusGeometry(r,tube,4,seg), x,y,z, rx,ry,rz); }
  function flush(parent, arr, color, shadow){
    if(!arr.length) return;
    if(mergeFn){ const mg=mergeFn(arr,false); if(mg){ const m=new THREE.Mesh(mg, M(color)); if(shadow!==false){m.castShadow=true; m.receiveShadow=true;} parent.add(m); arr.forEach(g=>g.dispose&&g.dispose()); return; } }
    for(const g of arr){ const m=new THREE.Mesh(g, M(color)); if(shadow!==false){m.castShadow=true; m.receiveShadow=true;} parent.add(m); }
  }

  window.makeRefDock = function(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const G = new THREE.Group();

    // ---------- geometry parameters (1 unit = 1 tile) ----------
    const L      = 13.0;   // main deck length along +Z (shore -> sea)
    const W      = 4.2;    // main deck width (X)
    const hw     = W/2;    // 2.1
    const Z0     = 0.5;    // decking starts just off the shore
    const ZEND   = Z0 + L; // seaward end of the main run
    const DECK_Y = 0.0;    // top surface of the planks
    const PL_T   = 0.16;   // plank thickness
    const SEG    = 1.0;    // plank spacing along the run
    const SEA_Y  = -1.5;   // water line the pilings sink to
    const ARM_L  = 6.5;    // length of the seaward return arm (T, running +X)
    const ARM_W  = 3.6;    // width of the return arm (its own Z extent)

    // buckets, one per material -> merged meshes
    const deckA=[], deckB=[], beams=[], posts=[], railGeo=[], rope=[], crateBody=[], crateRail=[], barrelGeo=[], hoopGeo=[];

    // ============================================================
    // 1) MAIN DECK — cross planks laid across the run (seams along +Z)
    // ============================================================
    for(let z0=Z0; z0<ZEND-0.01; z0+=SEG){
      const plen = Math.min(SEG*0.9, ZEND-z0);
      const bucket = (Math.round(z0/SEG)%2) ? deckA : deckB;
      pushBox(bucket, W, PL_T, plen, 0, DECK_Y-PL_T/2, z0+plen/2);
    }
    // edge stringer beams under the deck (both long sides)
    for(const s of [-1,1]) pushBox(beams, 0.18, 0.34, L, s*(hw-0.12), DECK_Y-0.28, Z0+L/2);
    // a couple of cross joists for structure feel
    for(let z0=Z0+1.0; z0<ZEND; z0+=3.0) pushBox(beams, W-0.2, 0.16, 0.18, 0, DECK_Y-0.30, z0);

    // ============================================================
    // 2) SEAWARD RETURN ARM (the reference's crossing pier) running +X
    // ============================================================
    const armCz = ZEND - ARM_W/2;               // arm centred at the seaward end
    const armX0 = hw - 0.2, armX1 = hw + ARM_L;  // extends to +X off the main deck
    for(let ax=armX0; ax<armX1-0.01; ax+=SEG){
      const plen = Math.min(SEG*0.9, armX1-ax);
      pushBox((Math.round(ax/SEG)%2 ? deckA : deckB), plen, PL_T, ARM_W, ax+plen/2, DECK_Y-PL_T/2, armCz);
    }
    for(const s of [-1,1]) pushBox(beams, ARM_L, 0.30, 0.18, (armX0+armX1)/2, DECK_Y-0.26, armCz+s*(ARM_W/2-0.12));

    // ============================================================
    // 3) SUPPORT PILINGS — sink from the deck below the sea line, w/ X-braces
    // ============================================================
    function piling(px, pz){
      const h = DECK_Y - SEA_Y + 0.6;            // top just under deck to below water
      pushCyl(posts, 0.14, 0.17, h, 6, px, DECK_Y-0.30-h/2, pz);
    }
    // main-run piling pairs
    for(let z0=Z0+0.9; z0<ZEND; z0+=2.6){ piling(-(hw-0.25), z0); piling(hw-0.25, z0); }
    // X cross-braces between each main-run pair (down at the water)
    for(let z0=Z0+0.9; z0<ZEND; z0+=2.6){
      for(const rz of [0.5, -0.5])
        pushBox(beams, W-0.5, 0.12, 0.12, 0, SEA_Y+0.55, z0, 0,0, rz);
    }
    // arm pilings
    for(let ax=armX0+0.6; ax<armX1; ax+=2.4){ piling(ax, armCz-ARM_W/2+0.3); piling(ax, armCz+ARM_W/2-0.3); }

    // ============================================================
    // 4) RAILINGS — posts + top rail down the walkway (shore -> arm)
    // ============================================================
    const RAIL_H = 0.92;
    function railRun(sx, z0, z1){                 // rail parallel to +Z at x=sx
      for(let zz=z0; zz<=z1+0.001; zz+=1.3){
        pushBox(railGeo, 0.11, RAIL_H, 0.11, sx, DECK_Y+RAIL_H/2, zz);
      }
      pushBox(railGeo, 0.10, 0.12, z1-z0, sx, DECK_Y+RAIL_H-0.06, (z0+z1)/2);   // top rail
      pushBox(railGeo, 0.08, 0.09, z1-z0, sx, DECK_Y+RAIL_H*0.5, (z0+z1)/2);    // mid rail
    }
    function railRunX(sz, x0, x1){               // rail parallel to +X at z=sz
      for(let xx=x0; xx<=x1+0.001; xx+=1.3){
        pushBox(railGeo, 0.11, RAIL_H, 0.11, xx, DECK_Y+RAIL_H/2, sz);
      }
      pushBox(railGeo, x1-x0, 0.12, 0.10, (x0+x1)/2, DECK_Y+RAIL_H-0.06, sz);
      pushBox(railGeo, x1-x0, 0.09, 0.08, (x0+x1)/2, DECK_Y+RAIL_H*0.5, sz);
    }
    // main run: rail both sides, stop short of the shore entry so the player can step on
    railRun(-(hw-0.08), Z0+1.4, ZEND-0.2);
    railRun( (hw-0.08), Z0+1.4, armCz-ARM_W/2);   // right side stops where the arm joins
    // arm: outer edge + seaward face railed
    railRunX(armCz-ARM_W/2+0.08, hw+0.2, armX1-0.1);   // shore-facing edge of arm
    railRunX(armCz+ARM_W/2-0.08, hw+0.2, armX1-0.1);   // sea-facing edge of arm
    railRun(armX1-0.1, armCz-ARM_W/2, armCz+ARM_W/2);  // far end cap of the arm

    // ============================================================
    // 5) MOORING BOLLARDS + coiled rope at the seaward corners
    // ============================================================
    function bollard(bx, bz){
      pushCyl(posts, 0.17, 0.20, 1.05, 8, bx, DECK_Y+0.50, bz);        // fat capped post
      pushCyl(posts, 0.23, 0.20, 0.14, 8, bx, DECK_Y+1.05, bz);        // flared cap
      // coiled rope rings around the post
      pushTorus(rope, 0.235, 0.05, 10, bx, DECK_Y+0.34, bz, Math.PI/2,0,0);
      pushTorus(rope, 0.235, 0.05, 10, bx, DECK_Y+0.46, bz, Math.PI/2,0,0);
    }
    bollard(-(hw-0.25), armCz-ARM_W/2+0.35);
    bollard(armX1-0.5, armCz+ARM_W/2-0.35);
    bollard(armX1-0.5, armCz-ARM_W/2+0.35);
    // a loose rope coil resting on the deck (flat ring)
    pushTorus(rope, 0.28, 0.055, 12, -(hw-0.7), DECK_Y+0.06, Z0+2.2, Math.PI/2,0,0);
    pushTorus(rope, 0.20, 0.055, 12, -(hw-0.7), DECK_Y+0.09, Z0+2.2, Math.PI/2,0,0);

    // ============================================================
    // 6) CARGO — stacked crates + a barrel near the shore end
    // ============================================================
    function crate(cx, cy, cz, s){
      s = s||0.62;
      pushBox(crateBody, s, s, s, cx, cy, cz);
      // frame rails on the crate corners (X pattern) — 4 verticals as edge trim
      for(const dx of [-1,1]) for(const dz of [-1,1])
        pushBox(crateRail, 0.06, s+0.02, 0.06, cx+dx*s/2, cy, cz+dz*s/2);
      pushBox(crateRail, s+0.02, 0.06, 0.06, cx, cy+s/2, cz);   // top band
      pushBox(crateRail, s+0.02, 0.06, 0.06, cx, cy-s/2, cz);
    }
    crate(-(hw-0.7), DECK_Y+0.31, Z0+3.6, 0.62);
    crate(-(hw-0.7), DECK_Y+0.31+0.55, Z0+3.6, 0.5);   // stacked on top
    crate(-(hw-0.55), DECK_Y+0.28, Z0+4.5, 0.56);
    // a barrel near the arm
    (function barrel(bx,bz){
      pushCyl(barrelGeo, 0.30, 0.34, 0.78, 10, bx, DECK_Y+0.39, bz);
      pushTorus(hoopGeo, 0.34, 0.035, 12, bx, DECK_Y+0.60, bz, Math.PI/2,0,0);
      pushTorus(hoopGeo, 0.35, 0.035, 12, bx, DECK_Y+0.39, bz, Math.PI/2,0,0);
      pushTorus(hoopGeo, 0.34, 0.035, 12, bx, DECK_Y+0.18, bz, Math.PI/2,0,0);
    })(hw+1.4, armCz);

    // ============================================================
    // 7) LADDER at the seaward end of the arm, down to the tide
    // ============================================================
    const ladX = armX1-0.5, ladZ = armCz+ARM_W/2+0.05, ladH = DECK_Y - SEA_Y + 0.4;
    for(const s of [-1,1]) pushCyl(posts, 0.06, 0.06, ladH, 6, ladX+s*0.28, DECK_Y-ladH/2+0.1, ladZ);
    for(let r=0; r<5; r++)
      pushCyl(posts, 0.04, 0.04, 0.62, 6, ladX, DECK_Y-0.15-r*0.36, ladZ, 0,0, Math.PI/2);

    // ---------- flush every material bucket to merged meshes ----------
    flush(G, deckA, PLANK);
    flush(G, deckB, PLANK_B);
    flush(G, beams, BEAM);
    flush(G, posts, POST);
    flush(G, railGeo, POST_D);
    flush(G, rope, ROPE);
    flush(G, crateBody, CRATE);
    flush(G, crateRail, CRATE_R);
    flush(G, barrelGeo, BARREL);
    flush(G, hoopGeo, HOOP);

    // ============================================================
    // 8) WATER HINT — a faint translucent plane under the structure
    // ============================================================
    const waterW = W + ARM_L + 4, waterD = L + ARM_W + 4;
    const wg = new THREE.PlaneGeometry(waterW, waterD);
    wg.rotateX(-Math.PI/2);
    const wm = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({
      color: WATER, transparent:true, opacity:0.55, flatShading:true }));
    wm.position.set((armX1)/2 - 0.5, SEA_Y+0.02, Z0 + L/2);
    wm.receiveShadow = true;
    G.add(wm);

    G.position.set(x, 0, z);
    G.rotation.y = rot;
    return G;
  };

  console.log('[ref_dock] makeRefDock ready');
})();
