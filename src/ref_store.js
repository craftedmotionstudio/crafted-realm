/* ============================================================================
 * ref_store.js  —  General Store market stall (OSRS-quality low-poly)
 * Self-contained. Exposes window.makeRefStore(x=0, z=0, rot=0) -> THREE.Group.
 * Recreated from Bible_References/General Store.jpg:
 *   timber-framed shopfront, striped cloth awning, a laden goods counter
 *   (crates, sacks, bread, clay pots, coloured vials/bottles, barrel),
 *   a back shelf of wares, and a hanging painted sign. Warm inviting palette.
 * Flat-shaded, merged geometry, cast shadows on solids, gentle awning sway.
 * ==========================================================================*/
(function(){
  if (typeof THREE === 'undefined') { return; }

  // ---- material helper: reuse the game's mat() when present, else fallback ----
  const M = (c)=> typeof mat==='function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // shared cache so repeated calls reuse one material per colour
  const _matCache = {};
  const CM = (c)=> _matCache[c] || (_matCache[c] = M(c));

  // ---------- warm palette ----------
  const COL = {
    postDark:  0x5f3f24,   // structural timber (dark, weathered)
    beam:      0x7a5533,   // frame beams / rails
    counter:   0x8a6a44,   // counter body
    counterTop:0x9c7a4e,   // scrubbed plank top
    plank:     0x6e4a2e,   // shelf planks
    crate:     0x93714a,   // crate body
    crateDk:   0x7d5c39,   // crate darker
    slat:      0x5c4227,   // crate slat lines
    sack:      0xcdb488,   // burlap sack
    sackTie:   0xa8895f,   // sack neck
    bread:     0xc88a45,   // loaf crust
    breadTop:  0xd9a35c,   // loaf highlight
    clayA:     0xb5713e,   // terracotta pot
    clayB:     0x9a5a30,   // darker pot
    clayRim:   0xc9895a,   // pot rim
    barrel:    0x6e4a2e,   // barrel staves
    hoop:      0x3a2c1c,   // barrel hoop / iron
    stripeA:   0xe7dcbf,   // awning cream
    stripeB:   0xb2482f,   // awning warm red
    valance:   0xcf6a44,   // awning fringe accent
    signBoard: 0x8a6a44,   // hanging sign
    signFace:  0xe7dcbf,   // painted panel
    signMark:  0x5f3f24,   // painted symbol
    rope:      0x4a3826,
    metal:     0x8f8a7e
  };
  // bottle / vial glass colours (the shelf sparkle in the reference)
  const GLASS = [0x5f9a5c, 0x3a6f8f, 0x4aa08e, 0xb0553f, 0x8f6fae, 0x6f9ec4];

  // ---------- tiny mesh helpers ----------
  function m(geo, col, sx, sy, sz){
    const me = new THREE.Mesh(geo, CM(col));
    me.castShadow = true; me.receiveShadow = true;
    if (sx!==undefined) me.position.set(sx, sy, sz);
    return me;
  }
  function box(w,h,d,col,x,y,z){ return m(new THREE.BoxGeometry(w,h,d), col, x,y,z); }
  function cyl(rt,rb,h,seg,col,x,y,z){ return m(new THREE.CylinderGeometry(rt,rb,h,seg), col, x,y,z); }

  // A crate: body + painted slat lines, so it reads without a texture.
  function crate(s, col){
    const g = new THREE.Group();
    g.add(box(s, s, s, col, 0, 0, 0));
    const t = s*0.5 + 0.006, w = s*0.06;
    const line = COL.slat;
    // horizontal + vertical banding on the 4 side faces
    for (const rz of [ t, -t ]){
      g.add(box(s*1.005, w, 0.01, line, 0, s*0.18, rz));
      g.add(box(s*1.005, w, 0.01, line, 0, -s*0.18, rz));
      g.add(box(w, s*1.005, 0.01, line, 0, 0, rz));
    }
    for (const rx of [ t, -t ]){
      g.add(box(0.01, w, s*1.005, line, rx, s*0.18, 0));
      g.add(box(0.01, w, s*1.005, line, rx, -s*0.18, 0));
      g.add(box(0.01, s*1.005, w, line, rx, 0, 0));
    }
    return g;
  }

  // A stuffed burlap sack (pinched neck on top).
  function sack(r, col){
    const g = new THREE.Group();
    const body = m(new THREE.SphereGeometry(r, 7, 6), col);
    body.scale.set(1, 1.15, 1); body.position.y = r*0.85; g.add(body);
    const neck = m(new THREE.CylinderGeometry(r*0.34, r*0.5, r*0.5, 6), COL.sackTie);
    neck.position.y = r*1.7; g.add(neck);
    const knot = m(new THREE.IcosahedronGeometry(r*0.34, 0), COL.sackTie);
    knot.position.y = r*1.95; g.add(knot);
    return g;
  }

  // A clay pot / vase (belly + rim), OSRS storefront style.
  function pot(r, h, col){
    const g = new THREE.Group();
    const belly = m(new THREE.SphereGeometry(r, 8, 6), col);
    belly.scale.set(1, h/(2*r), 1); belly.position.y = h*0.5; g.add(belly);
    const rim = cyl(r*0.5, r*0.42, h*0.16, 8, COL.clayRim, 0, h*0.98, 0);
    g.add(rim);
    return g;
  }

  // A slender bottle / vial (the coloured glass rows on the shelves).
  function bottle(col, scale){
    const s = scale||1;
    const g = new THREE.Group();
    g.add(cyl(0.05*s, 0.075*s, 0.26*s, 7, col, 0, 0.13*s, 0));
    g.add(cyl(0.028*s, 0.05*s, 0.12*s, 6, col, 0, 0.31*s, 0));       // neck
    g.add(cyl(0.032*s, 0.032*s, 0.03*s, 6, COL.plank, 0, 0.39*s, 0)); // cork
    return g;
  }

  // A round loaf of bread.
  function loaf(){
    const g = new THREE.Group();
    const b = m(new THREE.SphereGeometry(0.14, 7, 5), COL.bread);
    b.scale.set(1.25, 0.7, 0.85); b.position.y = 0.09; g.add(b);
    const top = m(new THREE.SphereGeometry(0.09, 6, 4), COL.breadTop);
    top.scale.set(1.3, 0.5, 0.7); top.position.y = 0.15; g.add(top);
    return g;
  }

  // ========================================================================
  window.makeRefStore = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    const W = 4.2;   // counter width (x)
    const D = 2.6;   // depth (z)  — customer side at +z, shopkeep side at -z
    const POST = 2.9;
    const px = W*0.5 - 0.12, pz = D*0.5 - 0.12;

    // ---------------- structural timber frame ----------------
    const postGeo = new THREE.BoxGeometry(0.22, POST, 0.22);
    for (const [sx,sz] of [[-px,-pz],[px,-pz],[-px,pz],[px,pz]]){
      g.add(m(postGeo, COL.postDark, sx, POST*0.5, sz));
    }
    // top rails (front/back run along x, sides run along z), form the awning plate
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST, -pz));
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST,  pz));
    g.add(box(0.16, 0.16, D, COL.beam, -px, POST,  0));
    g.add(box(0.16, 0.16, D, COL.beam,  px, POST,  0));

    // ---------------- striped cloth awning (sloped forward) ----------------
    const awning = new THREE.Group();
    const nStripe = 8, sw = (W+0.5)/nStripe;
    const slopeLen = D + 0.7;
    const stripeGeo = new THREE.BoxGeometry(sw*0.98, 0.05, slopeLen);
    for (let i=0;i<nStripe;i++){
      const strip = new THREE.Mesh(stripeGeo, CM(i%2 ? COL.stripeB : COL.stripeA));
      strip.castShadow = true; strip.receiveShadow = true;
      strip.position.x = -(W+0.5)/2 + sw*(i+0.5);
      awning.add(strip);
    }
    // tilt so the front edge drops lower than the back
    awning.rotation.x = 0.30;
    awning.position.set(0, POST + 0.34, 0.15);
    g.add(awning);

    // scalloped valance (hanging fringe) along the front — these gently sway
    const flaps = [];
    const flapGeo = new THREE.BoxGeometry(sw*0.9, 0.34, 0.04);
    // the awning's true front-edge in GROUP coords: the awning is centred at z=0.15
    // (not at the post row) and tilted 0.30 rad — measure from there.
    const frontZ = 0.15 + slopeLen*Math.cos(0.30)*0.5 - 0.02;
    const frontY = POST + 0.34 - slopeLen*Math.sin(0.30)*0.5 + 0.2;
    for (let i=0;i<nStripe;i++){
      const flap = new THREE.Mesh(flapGeo, CM(i%2 ? COL.stripeA : COL.stripeB));
      flap.castShadow = true;
      const px2 = -(W+0.5)/2 + sw*(i+0.5);
      const pivot = new THREE.Group();
      pivot.position.set(px2, frontY, frontZ);
      flap.position.y = -0.17;
      // little triangular point at the bottom of each scallop
      const point = new THREE.Mesh(new THREE.ConeGeometry(sw*0.42, 0.18, 4),
                                   CM(i%2 ? COL.stripeA : COL.stripeB));
      point.rotation.x = Math.PI; point.position.y = -0.40; flap.add(point);
      pivot.add(flap);
      pivot.userData.phase = i*0.6;
      // frontY/frontZ are GROUP-frame coords (they re-include POST+0.34) — parenting to
      // `awning` double-applied that offset and floated the fringe ~2.5u up/behind the
      // stall (integration-pass bug 2026-07-06). Hang the flaps from the group instead.
      g.add(pivot);
      flaps.push(pivot);
    }

    // ---------------- goods counter (customer-facing front) ----------------
    const counterY = 0.95, counterZ = pz - 0.35;
    // body
    g.add(box(W-0.2, counterY, 0.7, COL.counter, 0, counterY*0.5, counterZ));
    // scrubbed plank top (slight overhang)
    g.add(box(W+0.1, 0.1, 0.9, COL.counterTop, 0, counterY+0.05, counterZ));
    // front kick panel detail (two recessed planks)
    g.add(box(W-0.6, 0.5, 0.02, COL.plank, 0, 0.4, counterZ+0.36));
    // under-counter shelf with a couple of stored crates
    g.add(box(W-0.3, 0.06, 0.6, COL.plank, 0, 0.34, counterZ));

    // ---------------- back shelf unit (rows of wares) ----------------
    const shelfZ = -pz + 0.35;
    const shelfW = W - 0.5;
    // uprights
    g.add(box(0.1, 2.2, 0.4, COL.plank, -shelfW*0.5, 1.1, shelfZ));
    g.add(box(0.1, 2.2, 0.4, COL.plank,  shelfW*0.5, 1.1, shelfZ));
    g.add(box(0.1, 2.2, 0.4, COL.plank, 0, 1.1, shelfZ));
    const shelfYs = [0.6, 1.25, 1.9];
    for (const sy of shelfYs){
      g.add(box(shelfW, 0.07, 0.42, COL.plank, 0, sy, shelfZ));
    }

    // fill the back shelves with clay pots + rows of coloured bottles
    let gi = 0;
    for (const sy of shelfYs){
      for (let k=0;k<7;k++){
        const bx = -shelfW*0.5 + 0.28 + k*((shelfW-0.56)/6);
        if (k%3===1){
          const p = pot(0.15, 0.34, k%2?COL.clayA:COL.clayB);
          p.position.set(bx, sy+0.035, shelfZ); g.add(p);
        } else {
          const b = bottle(GLASS[(gi++)%GLASS.length], 0.95);
          b.position.set(bx, sy+0.035, shelfZ + (k%2?0.05:-0.04));
          g.add(b);
        }
      }
    }

    // ---------------- wares laid out ON the counter ----------------
    const topY = counterY + 0.1;
    // a couple of crates
    const c1 = crate(0.5, COL.crate);   c1.position.set(-W*0.5+0.55, topY+0.25, counterZ-0.02); g.add(c1);
    const c2 = crate(0.42, COL.crateDk); c2.position.set(-W*0.5+0.98, topY+0.21, counterZ+0.12); c2.rotation.y=0.4; g.add(c2);
    // open crate of bread loaves
    const tray = box(0.62, 0.14, 0.42, COL.crateDk, W*0.5-0.7, topY+0.07, counterZ);
    g.add(tray);
    const loafSpots = [[-0.14,-0.08],[0.12,-0.06],[-0.02,0.10],[0.16,0.12]];
    for (const [lx,lz] of loafSpots){
      const lf = loaf(); lf.position.set(W*0.5-0.7+lx, topY+0.13, counterZ+lz);
      lf.rotation.y = Math.random()*3; g.add(lf);
    }
    // stacked sacks of grain at the near corner
    const s1 = sack(0.26, COL.sack);  s1.position.set(-0.15, topY, counterZ+0.16); g.add(s1);
    const s2 = sack(0.22, COL.sack);  s2.position.set(0.30, topY, counterZ+0.18); g.add(s2);
    // clay pots grouped centre
    const p1 = pot(0.17, 0.4, COL.clayA); p1.position.set(0.0, topY, counterZ-0.14); g.add(p1);
    const p2 = pot(0.13, 0.3, COL.clayB); p2.position.set(0.32, topY, counterZ-0.16); g.add(p2);
    // a few showcase bottles on the counter
    for (let i=0;i<3;i++){
      const b = bottle(GLASS[i], 1.15);
      b.position.set(0.75+i*0.16, topY, counterZ+0.05); g.add(b);
    }

    // ---------------- a barrel beside the stall ----------------
    const bar = new THREE.Group();
    bar.add(cyl(0.34, 0.30, 0.9, 12, COL.barrel, 0, 0.45, 0));
    bar.add(cyl(0.35, 0.35, 0.06, 12, COL.hoop, 0, 0.16, 0));
    bar.add(cyl(0.35, 0.35, 0.06, 12, COL.hoop, 0, 0.74, 0));
    bar.add(cyl(0.30, 0.30, 0.02, 12, COL.crate, 0, 0.90, 0)); // lid
    // apples/produce peeking out of the top
    for (let i=0;i<4;i++){
      const a = m(new THREE.IcosahedronGeometry(0.09,0), i%2?COL.clayA:COL.bread);
      a.position.set(Math.cos(i*1.6)*0.14, 0.94, Math.sin(i*1.6)*0.14); bar.add(a);
    }
    bar.position.set(W*0.5+0.35, 0, pz-0.3); g.add(bar);

    // ---------------- hanging painted sign ----------------
    const signG = new THREE.Group();
    // bracket arm off the front-right post
    g.add(box(0.7, 0.1, 0.1, COL.beam, px+0.35, POST-0.15, pz));
    g.add(box(0.1, 0.1, 0.6, COL.beam, px+0.68, POST-0.15, pz-0.28)); // strut back
    // two short ropes
    const ropeGeo = new THREE.CylinderGeometry(0.02,0.02,0.4,5);
    const rL = new THREE.Mesh(ropeGeo, CM(COL.rope)); rL.position.set(px+0.5, POST-0.35, pz);
    const rR = new THREE.Mesh(ropeGeo, CM(COL.rope)); rR.position.set(px+0.86, POST-0.35, pz);
    g.add(rL); g.add(rR);
    // board
    const board = box(0.86, 0.56, 0.06, COL.signBoard, 0, 0, 0);
    signG.add(board);
    // painted cream face
    signG.add(box(0.72, 0.42, 0.02, COL.signFace, 0, 0, 0.04));
    // painted "general store" mark — a money/goods bag glyph
    signG.add(box(0.26, 0.22, 0.015, COL.signMark, 0, -0.04, 0.055));   // bag body
    signG.add(box(0.16, 0.08, 0.015, COL.signMark, 0, 0.11, 0.055));    // bag neck
    signG.add(box(0.30, 0.05, 0.015, COL.signMark, 0, 0.17, 0.055));    // tie
    signG.position.set(px+0.68, POST-0.62, pz);
    g.add(signG);
    // let the sign sway too
    signG.userData.phase = 1.4;

    // ---------------- final transform ----------------
    let baseY = 0;
    if (typeof gy === 'function'){ try { baseY = gy(x,z)||0; } catch(e){} }
    g.position.set(x, baseY, z);
    g.rotation.y = rot;

    // collider (if the world uses them) — footprint ~ W x D
    if (typeof WORLD === 'object' && WORLD && Array.isArray(WORLD.colliders)){
      WORLD.colliders.push({type:'rect', x:x, z:z, hw:W*0.5, hd:D*0.5});
    }

    // ---------------- gentle cloth sway (self-installed rAF) ----------------
    const swayers = flaps.concat([signG]);
    g.userData.swayers = swayers;
    if (!window.__refStoreTick){
      window.__refStoreTick = { groups: [] };
      const tick = ()=>{
        const t = (typeof performance!=='undefined'? performance.now(): Date.now())*0.001;
        const list = window.__refStoreTick.groups;
        for (let i=list.length-1;i>=0;i--){
          const grp = list[i];
          if (!grp.parent){ list.splice(i,1); continue; }   // removed from scene
          const sw = grp.userData.swayers; if (!sw) continue;
          for (const s of sw){
            const ph = s.userData.phase||0;
            s.rotation.z = Math.sin(t*1.1 + ph)*0.05;
            s.rotation.x = Math.sin(t*0.9 + ph)*0.03;
          }
        }
        requestAnimationFrame(tick);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
    }
    window.__refStoreTick.groups.push(g);

    return g;
  };

  console.log('[ref_store] makeRefStore ready');
})();
