/* ============================================================================
 * ref_cakestall.js  —  Baker's / Cake market stall (OSRS-quality low-poly)
 * Self-contained. Exposes window.makeRefCakeStall(x=0, z=0, rot=0) -> THREE.Group.
 * Recreated from Bible_References/Cake_Stall.jpg:
 *   timber-framed stall, sagging cream cloth awning, a counter LADEN with
 *   baked goods — round layer cakes with white icing + cherries, stacked
 *   yellow sponge squares, a tall domed loaf, an orange-filled pie, round
 *   bread loaves and buns — plus a wicker basket and a hanging painted sign.
 * Warm inviting palette, flat-shaded, merged geometry, cast shadows, awning sway.
 * ==========================================================================*/
(function(){
  if (typeof THREE === 'undefined') { return; }

  // ---- material helper: reuse the game's mat() when present, else fallback ----
  const M = (c)=> typeof mat==='function'
    ? mat(c)
    : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // shared cache so repeated colours reuse one material
  const _matCache = {};
  const CM = (c)=> _matCache[c] || (_matCache[c] = M(c));

  // ---------------- warm baker's palette ----------------
  const COL = {
    postDark:   0x8a6a42,   // structural timber (light weathered pine, per ref)
    beam:       0x9c7a4e,   // frame beams / rails
    counter:    0x8a6a44,   // counter body
    counterTop: 0xa07f52,   // scrubbed plank top
    plank:      0x6f4d2f,   // shelf planks / rungs
    rung:       0x7d5c39,   // slatted rungs under counter (per ref)
    awning:     0xe4d8bb,   // cream cloth awning
    awningEdge: 0xd2c39e,   // awning shadow edge
    // -- baked goods --
    sponge:     0xe8c94e,   // bright yellow sponge cake
    spongeTop:  0xf2da6a,   // sponge highlight
    icingWhite: 0xf3ecda,   // pale cream icing
    icingPink:  0xe8b7c0,   // pink icing accent
    cherry:     0xb83030,   // glace cherry red
    chocolate:  0x5a3820,   // chocolate cake layer
    pieCrust:   0xc79350,   // pastry / pie crust
    pieFill:    0xcf7a2e,   // orange fruit filling
    breadCrust: 0xc88a45,   // loaf crust
    breadTop:   0xdaa45e,   // loaf highlight
    bun:        0xd9973f,   // glazed bun
    basket:     0x9c6f3c,   // wicker basket
    basketDk:   0x7a5329,   // wicker weave shadow
    signBoard:  0x8a6a44,   // hanging sign
    signFace:   0xe4d8bb,   // painted panel
    signMark:   0xb83030,   // painted symbol (cherry-red cake glyph)
    signIcing:  0xf3ecda,
    rope:       0x4a3826
  };

  // ---------------- tiny mesh helpers ----------------
  function m(geo, col, sx, sy, sz){
    const me = new THREE.Mesh(geo, CM(col));
    me.castShadow = true; me.receiveShadow = true;
    if (sx!==undefined) me.position.set(sx, sy, sz);
    return me;
  }
  function box(w,h,d,col,x,y,z){ return m(new THREE.BoxGeometry(w,h,d), col, x,y,z); }
  function cyl(rt,rb,h,seg,col,x,y,z){ return m(new THREE.CylinderGeometry(rt,rb,h,seg), col, x,y,z); }

  // ---- baked-good builders (each returns a small THREE.Group) ----

  // Round layer cake: sponge base, icing disc on top, a ring of cherries.
  function layerCake(r, baseCol, icingCol){
    const g = new THREE.Group();
    const h = r*0.78;
    // sponge body (short low-poly cylinder)
    g.add(cyl(r, r, h, 12, baseCol, 0, h*0.5, 0));
    // a darker filling seam
    g.add(cyl(r*1.005, r*1.005, h*0.14, 12, COL.chocolate, 0, h*0.5, 0));
    // domed icing lid, slightly wider (drips over the edge)
    const icing = m(new THREE.CylinderGeometry(r*1.02, r*1.02, h*0.34, 12), icingCol);
    icing.position.y = h + h*0.14; g.add(icing);
    const dome = m(new THREE.SphereGeometry(r*0.98, 12, 6), icingCol);
    dome.scale.set(1, 0.4, 1); dome.position.y = h + h*0.3; g.add(dome);
    // ring of glace cherries on top
    const nC = 6;
    for (let i=0;i<nC;i++){
      const a = i/nC*Math.PI*2;
      const ch = m(new THREE.IcosahedronGeometry(r*0.16, 0), COL.cherry);
      ch.position.set(Math.cos(a)*r*0.6, h + h*0.42, Math.sin(a)*r*0.6); g.add(ch);
    }
    // centre cherry
    g.add(m(new THREE.IcosahedronGeometry(r*0.18, 0), COL.cherry, 0, h + h*0.46, 0));
    return g;
  }

  // Stacked square sponge cake (a couple of yellow slabs, per the ref's left pile).
  function spongeStack(s){
    const g = new THREE.Group();
    const h = s*0.42;
    g.add(box(s, h, s, COL.sponge, 0, h*0.5, 0));
    g.add(box(s*0.94, h*0.9, s*0.94, COL.spongeTop, 0, h*1.4, 0));
    g.add(box(s*0.9, h*0.85, s*0.9, COL.sponge, 0, h*2.25, 0));
    // thin cream icing line between layers
    g.add(box(s*1.01, h*0.12, s*1.01, COL.icingWhite, 0, h, 0));
    return g;
  }

  // Round pie with pastry crust and glossy orange filling (front-left in ref).
  function pie(r){
    const g = new THREE.Group();
    const h = r*0.5;
    // crust base
    g.add(cyl(r, r*0.9, h, 12, COL.pieCrust, 0, h*0.5, 0));
    // filling disc
    const fill = m(new THREE.SphereGeometry(r*0.86, 12, 6), COL.pieFill);
    fill.scale.set(1, 0.34, 1); fill.position.y = h; g.add(fill);
    // crimped rim
    g.add(cyl(r*1.02, r*1.02, h*0.3, 12, COL.pieCrust, 0, h*0.95, 0));
    // little pastry star garnish
    g.add(box(r*0.5, h*0.16, r*0.14, COL.pieCrust, 0, h*1.12, 0));
    g.add(box(r*0.14, h*0.16, r*0.5, COL.pieCrust, 0, h*1.12, 0));
    return g;
  }

  // Tall domed loaf (the big yellow dome in the ref).
  function domeLoaf(r){
    const g = new THREE.Group();
    const body = m(new THREE.SphereGeometry(r, 10, 8), COL.bun);
    body.scale.set(1, 1.35, 1); body.position.y = r*1.05; g.add(body);
    const top = m(new THREE.SphereGeometry(r*0.6, 8, 6), COL.breadTop);
    top.scale.set(1, 1.1, 1); top.position.y = r*1.9; g.add(top);
    return g;
  }

  // Round bread loaf (squat, scored top).
  function loaf(){
    const g = new THREE.Group();
    const b = m(new THREE.SphereGeometry(0.16, 8, 6), COL.breadCrust);
    b.scale.set(1.3, 0.72, 0.9); b.position.y = 0.1; g.add(b);
    const top = m(new THREE.SphereGeometry(0.1, 7, 5), COL.breadTop);
    top.scale.set(1.35, 0.5, 0.75); top.position.y = 0.17; g.add(top);
    return g;
  }

  // Small glazed bun.
  function bun(r){
    const g = new THREE.Group();
    const b = m(new THREE.SphereGeometry(r, 8, 6), COL.bun);
    b.scale.set(1, 0.8, 1); b.position.y = r*0.7; g.add(b);
    // icing cross / drizzle
    g.add(box(r*1.4, r*0.1, r*0.18, COL.icingWhite, 0, r*1.28, 0));
    g.add(box(r*0.18, r*0.1, r*1.4, COL.icingWhite, 0, r*1.28, 0));
    return g;
  }

  // Woven wicker basket (body + a couple of weave bands).
  function basket(r, h){
    const g = new THREE.Group();
    g.add(cyl(r, r*0.82, h, 12, COL.basket, 0, h*0.5, 0));
    g.add(cyl(r*1.03, r*1.03, h*0.14, 12, COL.basketDk, 0, h*0.28, 0));
    g.add(cyl(r*1.03, r*1.03, h*0.14, 12, COL.basketDk, 0, h*0.66, 0));
    g.add(cyl(r*1.06, r*1.02, h*0.14, 12, COL.basketDk, 0, h*0.97, 0)); // rim
    return g;
  }

  // ========================================================================
  window.makeRefCakeStall = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    const W = 4.2;   // counter width (x)
    const D = 2.6;   // depth (z)  — customer side at +z, baker side at -z
    const POST = 2.9;
    const px = W*0.5 - 0.12, pz = D*0.5 - 0.12;

    // ---------------- structural timber frame ----------------
    const postGeo = new THREE.BoxGeometry(0.22, POST, 0.22);
    for (const [sx,sz] of [[-px,-pz],[px,-pz],[-px,pz],[px,pz]]){
      g.add(m(postGeo, COL.postDark, sx, POST*0.5, sz));
    }
    // top rails forming the awning plate
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST, -pz));
    g.add(box(W, 0.16, 0.16, COL.beam,  0, POST,  pz));
    g.add(box(0.16, 0.16, D, COL.beam, -px, POST,  0));
    g.add(box(0.16, 0.16, D, COL.beam,  px, POST,  0));

    // ---------------- sagging cream cloth awning ----------------
    // solid cream sheet (no stripes, per ref) built from 5 gently-sagging panels
    const awning = new THREE.Group();
    const nPan = 5, pw = (W+0.5)/nPan;
    const slopeLen = D + 0.7;
    const panGeo = new THREE.BoxGeometry(pw*0.99, 0.05, slopeLen);
    for (let i=0;i<nPan;i++){
      const t = i/(nPan-1);                        // 0..1 across width
      const sag = Math.sin(t*Math.PI)*0.12;        // centre dips lowest
      const col = (i===0||i===nPan-1) ? COL.awningEdge : COL.awning;
      const pan = new THREE.Mesh(panGeo, CM(col));
      pan.castShadow = true; pan.receiveShadow = true;
      pan.position.set(-(W+0.5)/2 + pw*(i+0.5), -sag, 0);
      awning.add(pan);
    }
    awning.rotation.x = 0.26;                       // tilt front edge down
    awning.position.set(0, POST + 0.34, 0.12);
    g.add(awning);

    // a short hanging valance fringe along the awning's front edge (gently sways)
    // NOTE: pivots are children of `awning`, so their positions must be AWNING-LOCAL.
    // (The awning group already carries the tilt + world placement.)
    const flaps = [];
    const lipGeo = new THREE.BoxGeometry(pw*0.95, 0.20, 0.03);   // short thin fringe, not a plank
    const frontZ = slopeLen*0.5 - 0.02;                          // local front edge of the sheet
    for (let i=0;i<nPan;i++){
      const pivot = new THREE.Group();
      pivot.position.set(-(W+0.5)/2 + pw*(i+0.5), 0, frontZ);
      const lip = new THREE.Mesh(lipGeo, CM(i%2 ? COL.awningEdge : COL.awning));
      lip.castShadow = true; lip.position.y = -0.10;             // hangs straight down from the edge
      pivot.add(lip);
      pivot.userData.phase = i*0.7;
      awning.add(pivot);
      flaps.push(pivot);
    }

    // ---------------- counter with slatted rung shelf (per ref) ----------------
    const counterY = 0.95, counterZ = pz - 0.35;
    // scrubbed plank top (slight overhang)
    g.add(box(W+0.1, 0.1, 0.9, COL.counterTop, 0, counterY+0.05, counterZ));
    // front face: open slatted rungs (the horizontal bars in the reference)
    const nRung = 5;
    for (let i=0;i<nRung;i++){
      const ry = 0.28 + i*((counterY-0.28)/(nRung-1));
      g.add(box(W-0.2, 0.06, 0.05, COL.rung, 0, ry, counterZ+0.42));
    }
    // side end-panels + a couple of legs to close the frame
    g.add(box(0.06, counterY, 0.86, COL.counter, -(W*0.5-0.05), counterY*0.5, counterZ));
    g.add(box(0.06, counterY, 0.86, COL.counter,  (W*0.5-0.05), counterY*0.5, counterZ));
    g.add(box(0.12, counterY, 0.12, COL.plank, -(W*0.5-0.3), counterY*0.5, counterZ+0.3));
    g.add(box(0.12, counterY, 0.12, COL.plank,  (W*0.5-0.3), counterY*0.5, counterZ+0.3));
    // back board of the counter
    g.add(box(W-0.1, counterY*0.7, 0.05, COL.rung, 0, counterY*0.42, counterZ-0.4));

    // ---------------- goods laid out ON the counter ----------------
    const topY = counterY + 0.1;

    // stacked yellow sponge squares (left, per ref)
    const st = spongeStack(0.44);
    st.position.set(-W*0.5+0.62, topY, counterZ-0.02); st.rotation.y = 0.12; g.add(st);
    const st2 = spongeStack(0.36);
    st2.position.set(-W*0.5+1.12, topY, counterZ+0.16); st2.rotation.y = -0.2; g.add(st2);

    // orange-filled pie (front-left)
    const p1 = pie(0.32);
    p1.position.set(-W*0.5+0.72, topY, counterZ+0.24); g.add(p1);

    // round iced layer cake (centre) — the pale cream cake in the ref
    const cake1 = layerCake(0.34, COL.sponge, COL.icingWhite);
    cake1.position.set(-0.1, topY, counterZ-0.02); g.add(cake1);

    // tall domed loaf (centre-back, the big yellow dome)
    const dome = domeLoaf(0.32);
    dome.position.set(0.28, topY, counterZ-0.22); g.add(dome);

    // a second, pink-iced chocolate cake for colour variety (right-centre)
    const cake2 = layerCake(0.28, COL.chocolate, COL.icingPink);
    cake2.position.set(0.66, topY, counterZ+0.08); g.add(cake2);

    // round yellow bun / loaf (right, per ref)
    const b1 = bun(0.26);
    b1.position.set(W*0.5-0.6, topY, counterZ-0.06); g.add(b1);

    // a little tray of bread loaves and buns near the right corner
    const tray = box(0.7, 0.1, 0.5, COL.plank, W*0.5-0.72, topY+0.05, counterZ+0.2);
    g.add(tray);
    const spots = [[-0.16,-0.1],[0.12,-0.08],[-0.04,0.12],[0.18,0.1]];
    for (let i=0;i<spots.length;i++){
      const item = (i%2) ? loaf() : bun(0.14);
      item.position.set(W*0.5-0.72+spots[i][0], topY+0.1, counterZ+0.2+spots[i][1]);
      item.rotation.y = Math.random()*3; g.add(item);
    }

    // ---------------- wicker basket behind the counter (per ref) ----------------
    const bk = basket(0.42, 0.7);
    bk.position.set(-W*0.5+0.55, 0, -pz+0.45); g.add(bk);
    // a few loaves poking out of the basket
    for (let i=0;i<3;i++){
      const lf = loaf();
      lf.position.set(-W*0.5+0.55 + Math.cos(i*2.1)*0.16, 0.72, -pz+0.45 + Math.sin(i*2.1)*0.16);
      g.add(lf);
    }

    // ---------------- hanging painted sign (a cake glyph) ----------------
    const signG = new THREE.Group();
    g.add(box(0.7, 0.1, 0.1, COL.beam, px+0.35, POST-0.15, pz));
    g.add(box(0.1, 0.1, 0.6, COL.beam, px+0.68, POST-0.15, pz-0.28));
    const ropeGeo = new THREE.CylinderGeometry(0.02,0.02,0.4,5);
    const rL = new THREE.Mesh(ropeGeo, CM(COL.rope)); rL.position.set(px+0.5, POST-0.35, pz);
    const rR = new THREE.Mesh(ropeGeo, CM(COL.rope)); rR.position.set(px+0.86, POST-0.35, pz);
    g.add(rL); g.add(rR);
    // board + painted cream face
    signG.add(box(0.86, 0.56, 0.06, COL.signBoard, 0, 0, 0));
    signG.add(box(0.72, 0.42, 0.02, COL.signFace, 0, 0, 0.04));
    // painted cake glyph: sponge body + icing lid + cherry
    signG.add(box(0.30, 0.14, 0.015, COL.signMark, 0, -0.06, 0.055));
    signG.add(box(0.34, 0.07, 0.015, COL.signIcing, 0, 0.03, 0.055));
    signG.add(m(new THREE.IcosahedronGeometry(0.05,0), COL.signMark, 0, 0.12, 0.06));
    signG.position.set(px+0.68, POST-0.62, pz);
    signG.userData.phase = 1.3;
    g.add(signG);

    // ---------------- final transform ----------------
    let baseY = 0;
    if (typeof gy === 'function'){ try { baseY = gy(x,z)||0; } catch(e){} }
    g.position.set(x, baseY, z);
    g.rotation.y = rot;

    // collider (if the world uses them) — footprint ~ W x D
    if (typeof WORLD === 'object' && WORLD && Array.isArray(WORLD.colliders)){
      WORLD.colliders.push({type:'rect', x:x, z:z, hw:W*0.5, hd:D*0.5});
    }

    // ---------------- gentle cloth sway (shared self-installed rAF) ----------------
    const swayers = flaps.concat([signG]);
    g.userData.swayers = swayers;
    if (!window.__refCakeStallTick){
      window.__refCakeStallTick = { groups: [] };
      const tick = ()=>{
        const t = (typeof performance!=='undefined'? performance.now(): Date.now())*0.001;
        const list = window.__refCakeStallTick.groups;
        for (let i=list.length-1;i>=0;i--){
          const grp = list[i];
          if (!grp.parent){ list.splice(i,1); continue; }
          const sw = grp.userData.swayers; if (!sw) continue;
          for (const s of sw){
            const ph = s.userData.phase||0;
            // tiny amplitude only (~2-2.5 deg) so the fringe just wobbles and never juts out
            s.rotation.z = Math.sin(t*1.1 + ph)*0.04;
            s.rotation.x = Math.sin(t*0.9 + ph)*0.025;
          }
        }
        requestAnimationFrame(tick);
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tick);
    }
    window.__refCakeStallTick.groups.push(g);

    return g;
  };

  console.log('[ref_cakestall] makeRefCakeStall ready');
})();
