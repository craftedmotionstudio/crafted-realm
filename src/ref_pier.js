/* ============ ref_pier — OSRS-style wooden FISHING PIER / JETTY ============
 * Recreates Bible_References/Fishing_Pier_Option1.jpg to OSRS quality: a warm,
 * weathered timber pier extending over the water. Features cross-laid plank
 * decking with visible plank seams, long edge stringer beams, support PILINGS
 * descending below the deck toward the water line (~y=-1.5) with X cross-braces,
 * a side railing (posts + top rail + a sagging rope mid-rail), and a ladder at
 * the far end down to the water. A faint translucent water plane hints the surface.
 *
 *   window.makeRefPier(x=0, z=0, rot=0)  ->  THREE.Group  (seated at x,0,z; +Z runs out over water)
 *
 * Art: low-poly FLAT-SHADED, r128 THREE, 1 unit = 1 tile. Self-contained: the only
 * optional global it borrows is game2_world.js `mat()` (guarded). Repeated planks,
 * pilings, beams and rope are MERGED to a handful of meshes for perf. castShadow on solids.
 */
(function(){
  if (typeof THREE === 'undefined') { console.warn('[ref_pier] THREE not present'); return; }

  // ---- weathered warm-wood palette (matches the pale tan boards in the reference) ----
  const PLANK   = 0xb08a58;   // sun-bleached deck plank
  const PLANK_B = 0x977247;   // alternating darker board -> clear plank-to-plank seams
  const BEAM    = 0x6f5230;   // structural frame: stringers, joists, rails, braces
  const BEAM_D  = 0x574023;   // deep shadow beam
  const POST    = 0x7a5a34;   // support pilings (a touch greyer/wetter near the water)
  const ROPE    = 0xa89968;   // hemp rope rail
  const WATER   = 0x3f6f8c;   // translucent water hint

  // ---- material guard: prefer the game's flat-shaded mat(), else a lambert fallback ----
  const M = (c)=> (typeof mat==='function') ? mat(c)
                : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // ---- merge helper: batch same-material boxes/cyls into ONE mesh (fallback: loose meshes) ----
  const mergeFn = (()=>{ const B=THREE.BufferGeometryUtils||{}; return B.mergeBufferGeometries||B.mergeGeometries||null; })();
  function pushBox(arr, w,h,d, x,y,z, rx,ry,rz){
    const g=new THREE.BoxGeometry(w,h,d);
    if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz);
    g.translate(x,y,z); arr.push(g);
  }
  function pushCyl(arr, r0,r1,h,seg, x,y,z, rx,ry,rz){
    const g=new THREE.CylinderGeometry(r0,r1,h,seg);
    if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz);
    g.translate(x,y,z); arr.push(g);
  }
  function flush(parent, arr, color){
    if(!arr.length) return;
    if(mergeFn){ const mg=mergeFn(arr,false); if(mg){ const m=new THREE.Mesh(mg, M(color)); m.castShadow=true; m.receiveShadow=true; parent.add(m); arr.forEach(g=>g.dispose&&g.dispose()); return; } }
    // fallback: no merge util -> add each geometry as its own mesh
    for(const g of arr){ const m=new THREE.Mesh(g, M(color)); m.castShadow=true; m.receiveShadow=true; parent.add(m); }
  }

  window.makeRefPier = function(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const G = new THREE.Group();

    // ---------- geometry parameters (1 unit = 1 tile) ----------
    const L      = 14.0;   // pier length along +Z
    const W      = 4.0;    // deck width (X)
    const hw     = W/2;    // 2.0
    const Z0     = 0.6;    // decking starts just off the shore
    const DECK_Y = 0.0;    // top surface of the planks
    const PL_T   = 0.16;   // plank thickness
    const PL_D   = 0.42;   // plank depth along Z
    const STEP   = 0.52;   // plank pitch (0.42 board + 0.10 gap -> visible seam)
    const OVER   = 0.28;   // plank overhang past the stringers
    const WATER_Y= -1.5;   // water line

    // geometry accumulators, one per material colour
    const plankA=[], plankB=[], frame=[], frameD=[], posts=[], rope=[];

    // ================= 1) CROSS-LAID PLANK DECKING (visible seams) =================
    // boards run across the walk direction (along X), spaced along Z; alternate tone
    const nPlanks = Math.floor((L - Z0) / STEP);
    for(let i=0;i<=nPlanks;i++){
      const pz = Z0 + i*STEP;
      // a hair of length + thickness jitter keeps the flat-shaded boards from looking printed
      const jt = (i%2? -0.008 : 0.008);
      pushBox(i%2?plankB:plankA, W+OVER*2, PL_T+jt, PL_D, 0, DECK_Y-(PL_T/2), pz);
    }
    // deck end-trim board across the far tip (weathered dark cap)
    pushBox(frameD, W+OVER*2+0.06, 0.22, 0.22, 0, DECK_Y-0.11, L+0.02);
    pushBox(frameD, W+OVER*2+0.06, 0.22, 0.22, 0, DECK_Y-0.11, Z0-0.10);

    // ================= 2) LONG EDGE STRINGERS + UNDER-DECK JOISTS =================
    const strTopY = DECK_Y - PL_T;         // beams tuck just under the planks
    const strH    = 0.34, strCY = strTopY - strH/2;
    const spanZ   = (L - Z0) + 0.5, midZ = (L + Z0)/2;
    for(const sx of [-1,1]) pushBox(frame, 0.22, strH, spanZ, sx*(hw-0.02), strCY, midZ); // side stringers
    for(const jx of [-0.9, 0.9])                                                          // inner joists
      pushBox(frameD, 0.18, strH-0.04, spanZ, jx, strCY, midZ);

    // ================= 3) SUPPORT PILINGS (descend to the water) + X-BRACES =================
    const pileR = 0.15, pileTopY = strTopY - 0.05, pileBotY = WATER_Y - 0.25;
    const pileH = pileTopY - pileBotY, pileCY = (pileTopY + pileBotY)/2;
    const bayZ = [];
    { const first=Z0+1.1, last=L-0.4, gap=3.35, n=Math.max(3, Math.round((last-first)/gap));
      for(let i=0;i<=n;i++) bayZ.push(first + (last-first)*(i/n)); }
    for(const bz of bayZ){
      for(const sx of [-1,1]){
        const px = sx*(hw-0.18);
        pushCyl(posts, pileR*0.9, pileR, pileH, 7, px, pileCY, bz);          // tapered piling
        // little cap collar where the piling meets the deck
        pushBox(frameD, 0.30, 0.14, 0.30, px, pileTopY, bz);
      }
      // cross tie-beam near the water joining the pair
      pushBox(frameD, W-0.30, 0.15, 0.16, 0, WATER_Y+0.15, bz);
      // X cross-braces between the two pilings (classic OSRS jetty detail)
      const braceLen = Math.hypot(W-0.5, (pileTopY-0.2)-(WATER_Y+0.1));
      const braceAng = Math.atan2((pileTopY-0.2)-(WATER_Y+0.1), W-0.5);
      const braceCY  = ((pileTopY-0.2)+(WATER_Y+0.1))/2;
      for(const s of [-1,1])
        pushBox(frameD, braceLen, 0.10, 0.10, 0, braceCY, bz, 0, 0, s*braceAng);
    }

    // ================= 4) SIDE RAILINGS (posts + top rail + sagging rope) =================
    const railTopY = 0.86, railPostH = railTopY + PL_T, railPostCY = railTopY/2;
    const nRail = Math.max(4, Math.round((L - Z0)/1.7));
    for(const sx of [-1,1]){
      const rx = sx*(hw + OVER - 0.14);
      const zs = [];
      for(let i=0;i<=nRail;i++){ const rz = Z0 + (L-Z0)*(i/nRail); zs.push(rz);
        pushBox(frame, 0.14, railPostH, 0.14, rx, railPostCY, rz);            // baluster post
      }
      // continuous top rail
      pushBox(frame, 0.14, 0.13, (L-Z0)+0.14, rx, railTopY, midZ);
      // sagging hemp ROPE mid-rail strung post-to-post (little catenary dip)
      for(let i=0;i<zs.length-1;i++){
        const z1=zs[i], z2=zs[i+1], seg=z2-z1, cz=(z1+z2)/2;
        const y0=railTopY-0.30;
        pushCyl(rope, 0.035,0.035, seg, 6, rx, y0, cz, Math.PI/2, 0, 0);       // rope span
        pushCyl(rope, 0.05,0.05, 0.10, 6, rx, y0-0.055, cz, 0, 0, 0);          // sag droop at mid
      }
    }

    // ================= 5) LADDER at the far end, down to the water =================
    { const lad=new THREE.Group();
      const topY=DECK_Y-0.05, botY=WATER_Y+0.1, dz=1.0;            // leans out over +Z
      const run=Math.hypot(topY-botY, dz), ang=Math.atan2(dz, topY-botY);
      const cy=(topY+botY)/2, cz=L+dz/2;
      const lg=[];
      for(const s of [-1,1]) pushBox(lg, 0.09, run, 0.09, s*0.42, cy, cz, ang, 0, 0);
      // rungs stepping down the rails
      const nR=5;
      for(let i=1;i<nR;i++){
        const t=i/nR, ry=topY+(botY-topY)*t, rz=L+dz*t;
        pushBox(lg, 0.98, 0.07, 0.09, 0, ry, rz);
      }
      flush(lad, lg, BEAM);
      G.add(lad);
    }

    // ================= 6) flush all merged batches =================
    flush(G, plankA, PLANK);
    flush(G, plankB, PLANK_B);
    flush(G, frame,  BEAM);
    flush(G, frameD, BEAM_D);
    flush(G, posts,  POST);
    flush(G, rope,   ROPE);

    // ================= 7) faint translucent WATER hint plane under the pier =================
    { const wg=new THREE.PlaneGeometry(W+6, (L-Z0)+6);
      const wm=new THREE.MeshBasicMaterial({color:WATER, transparent:true, opacity:0.34, depthWrite:false});
      const wp=new THREE.Mesh(wg, wm);
      wp.rotation.x=-Math.PI/2; wp.position.set(0, WATER_Y+0.02, midZ);
      wp.renderOrder=-1; G.add(wp);
    }

    // ---------- seat + orient (pier runs out along +Z from the shore anchor) ----------
    G.position.set(x, 0, z);
    G.rotation.y = rot;
    G.traverse(o=>{ if(o.isMesh && o.material && !o.material.transparent){ o.castShadow=true; o.receiveShadow=true; } });
    return G;
  };

  console.log('[ref_pier] makeRefPier ready');
})();
