/* ============================================================================
 * ref_missedprops.js  —  two interior props missed in the enumeration audit
 * ----------------------------------------------------------------------------
 * Both recreated from Bible_References/Tutorial_Island_Building.jpg:
 *   (a) window.makeRefGrandfatherClock(x=0,z=0,rot=0) -> THREE.Group
 *         the tall wooden floor-standing pendulum (longcase) clock on the LEFT
 *         of the interior — stepped base, slim glass-fronted body case with a
 *         gently SWINGING pendulum (self-installed rAF), a bonnet/hood top
 *         carrying a round white CLOCK FACE (gold rim, hour marks, two hands).
 *   (b) window.makeRefKitchenSink(x=0,z=0,rot=0) -> THREE.Group
 *         the KITCHEN COUNTER with a metal SINK at the top-right of the interior
 *         — wooden cabinet base + worktop, an inset metal basin, a swan-neck
 *         faucet/tap, and a plate + jug dressing the counter.
 *
 * Flat-shaded low-poly OSRS look; reads cleanly from the overhead camera.
 * 1 unit = 1 tile.  Global-script (THREE r128).  Edits ONLY this file.
 * ==========================================================================*/
(function(){
  if(typeof THREE==='undefined'){ console.warn('[ref_missedprops] THREE missing'); return; }

  // --- material guard: reuse the world's OSRS mat() when present ------------
  const M=(c)=> typeof mat==='function'
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  function box(w,h,d,c){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M(c)); }
  function at(m,x,y,z){ m.position.set(x,y,z); return m; }

  // ==========================================================================
  // (a) GRANDFATHER / LONGCASE CLOCK
  // ==========================================================================
  window.makeRefGrandfatherClock = function(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g = new THREE.Group();

    // warm-wood palette
    const C = {
      caseD : 0x4a3117,  // deep case sides (in shadow)
      case  : 0x5f4128,   // main case wood
      trim  : 0x7a5433,  // mouldings / rails (waxed, lighter)
      cap   : 0x8a6141,  // finial cap
      glass : 0x1d2732,  // dark glazed door
      faceW : 0xf1ead9,  // white clock face
      gold  : 0xc9a24b,  // gold rim
      dark  : 0x1c1c20,  // hands / ticks
      brass : 0xcaa64a   // pendulum bob (brass)
    };

    const CW = 0.62;   // case width (X)
    const CD = 0.42;   // case depth (Z)  — narrow, sits against a wall
    const totalH = 2.6;

    // ---- 1. stepped BASE -------------------------------------------------
    g.add(at(box(CW+0.22, 0.14, CD+0.22, C.trim), 0, 0.07, 0));           // plinth foot
    g.add(at(box(CW+0.10, 0.46, CD+0.10, C.case), 0, 0.07+0.23, 0));      // base box
    g.add(at(box(CW+0.20, 0.06, CD+0.20, C.trim), 0, 0.07+0.46+0.03, 0)); // base cap moulding

    // ---- 2. slim BODY case (holds the pendulum behind glass) -------------
    const bodyY0 = 0.62;
    const bodyH  = 1.28;
    const bodyYc = bodyY0 + bodyH/2;
    // side stiles + back panel = the wooden case shell (leave the front glazed)
    g.add(at(box(0.11, bodyH, CD, C.case), -(CW/2-0.055), bodyYc, 0));   // left stile
    g.add(at(box(0.11, bodyH, CD, C.case),  (CW/2-0.055), bodyYc, 0));   // right stile
    g.add(at(box(CW, bodyH, 0.10, C.caseD), 0, bodyYc, -(CD/2-0.05)));   // back panel
    // dark glazed door revealing the works
    g.add(at(box(CW-0.20, bodyH-0.16, 0.05, C.glass), 0, bodyYc, CD/2-0.02));

    // ---- 2b. swinging PENDULUM (its own pivot group, gently animated) ----
    const pend = new THREE.Group();
    const rodLen = 0.86;
    const rod = at(box(0.05, rodLen, 0.04, C.dark), 0, -rodLen/2, 0);     // hangs down
    pend.add(rod);
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.045,18), M(C.brass));
    bob.rotation.x = Math.PI/2;                                           // face the viewer
    bob.position.set(0, -rodLen, 0);
    pend.add(bob);
    // pivot sits high in the case, pendulum swings just behind the glass
    const pivotY = bodyY0 + bodyH - 0.10;
    pend.position.set(0, pivotY, CD/2-0.10);
    g.add(pend);

    // ---- 3. BONNET / HOOD top + round CLOCK FACE -------------------------
    const hoodY0 = bodyY0 + bodyH;                 // 1.90
    const hoodH  = 0.62;
    const hoodYc = hoodY0 + hoodH/2;
    g.add(at(box(CW+0.16, 0.07, CD+0.14, C.trim), 0, hoodY0+0.035, 0));   // hood base moulding
    g.add(at(box(CW+0.14, hoodH, CD+0.10, C.case), 0, hoodYc, 0));        // hood block
    g.add(at(box(CW+0.24, 0.07, CD+0.18, C.trim), 0, hoodY0+hoodH+0.03, 0)); // cornice
    // finial cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.09,0.16,5), M(C.cap));
    cap.rotation.y=Math.PI/5; cap.position.set(0, hoodY0+hoodH+0.13, 0); g.add(cap);

    // the dial, built flat then stood up to face +Z
    const faceZ = CD/2 + 0.06;
    const r = 0.235;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r+0.045, r+0.045, 0.05, 22), M(C.gold));
    rim.rotation.x = Math.PI/2; rim.position.set(0, hoodYc, faceZ-0.01); g.add(rim);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 22), M(C.faceW));
    face.rotation.x = Math.PI/2; face.position.set(0, hoodYc, faceZ); g.add(face);
    // hour marks (12 ticks)
    for(let k=0;k<12;k++){
      const a=k*Math.PI/6;
      const tick=box(0.022,0.05,0.02, C.dark);
      tick.position.set(Math.sin(a)*(r-0.045), hoodYc+Math.cos(a)*(r-0.045), faceZ+0.02);
      tick.rotation.z=-a; g.add(tick);
    }
    // two hands (hour up-left, minute up-right), pinned at the hub
    const hHand=box(0.03,0.16,0.02, C.dark); hHand.geometry.translate(0,0.08,0);
    hHand.position.set(0, hoodYc, faceZ+0.03); hHand.rotation.z= 0.85; g.add(hHand);
    const mHand=box(0.022,0.215,0.02, C.dark); mHand.geometry.translate(0,0.11,0);
    mHand.position.set(0, hoodYc, faceZ+0.035); mHand.rotation.z=-0.35; g.add(mHand);
    g.add(at(box(0.05,0.05,0.03, C.gold), 0, hoodYc, faceZ+0.045));       // hub

    // ---- shadows / placement --------------------------------------------
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = { kind:'prop', label:'Grandfather clock',
                   examine:'A tall longcase clock, its pendulum ticking softly.' };

    // ---- self-installed rAF: gently swing the pendulum -------------------
    if(typeof requestAnimationFrame==='function'){
      const t0 = (typeof performance!=='undefined' && performance.now)
                 ? performance.now() : Date.now();
      (function tick(now){
        // group may be removed from scene; keep animating cheaply regardless
        const t = ((now|| (typeof performance!=='undefined'?performance.now():Date.now())) - t0)/1000;
        pend.rotation.z = Math.sin(t*1.9) * 0.18;   // ~gentle 0.18 rad swing
        requestAnimationFrame(tick);
      })(t0);
    }

    if(typeof scene!=='undefined' && scene && scene.add) scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD){
      if(WORLD.clickables) WORLD.clickables.push(g);
      if(WORLD.colliders && typeof addRectCollider==='function'){
        const sideways = Math.abs((rot%Math.PI)) > 0.6;
        const hw = sideways ? CD/2+0.12 : CW/2+0.12;
        const hd = sideways ? CW/2+0.12 : CD/2+0.12;
        addRectCollider(x, z, hw, hd);
      }
    }
    return g;
  };

  // ==========================================================================
  // (b) KITCHEN COUNTER + SINK
  // ==========================================================================
  window.makeRefKitchenSink = function(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g = new THREE.Group();

    const C = {
      cabD  : 0x4a3117,  // cabinet sides (shadow)
      cab   : 0x5f4128,  // cabinet wood
      trim  : 0x7a5433,  // toe-kick / rails
      knob  : 0x3a2a18,  // door knobs
      top   : 0x8a7a5c,  // stone/wood worktop
      basin : 0xb9bcc2,  // metal sink basin (light steel)
      basinD: 0x8a8f96,  // basin inner (darker steel)
      tap   : 0xc9ccd2,  // faucet metal
      plate : 0xe9e4d8,  // crockery
      jug   : 0x9c6a3c   // earthenware jug
    };

    const W = 2.0;    // counter width (X)
    const D = 0.72;   // counter depth (Z)
    const H = 0.9;    // counter height

    // ---- 1. CABINET base -------------------------------------------------
    const bodyH = H-0.10;
    g.add(at(box(W, bodyH, D, C.cab), 0, bodyH/2, 0));                    // carcass
    g.add(at(box(W-0.02, bodyH, 0.06, C.cabD), 0, bodyH/2, -(D/2-0.04))); // back (shadowed)
    g.add(at(box(W-0.10, 0.08, D-0.10, C.trim), 0, 0.05, 0.02));          // toe-kick rail
    // two shaker cabinet-door panels on the front + little knobs
    for(const dx of [-W/4, W/4]){
      g.add(at(box(W/2-0.14, bodyH-0.18, 0.04, C.trim), dx, bodyH/2, D/2-0.005));
      g.add(at(box(0.06,0.06,0.05, C.knob), dx + (dx<0?0.18:-0.18), bodyH/2+0.02, D/2+0.02));
    }

    // ---- 2. WORKTOP (with a cut-out feel: top surface + raised rim) ------
    const topY = H;
    g.add(at(box(W+0.06, 0.10, D+0.06, C.top), 0, topY, 0));              // worktop slab

    // ---- 3. inset metal SINK BASIN (recessed into the worktop) -----------
    const bw=0.72, bd=0.44, brimY=topY+0.05;
    // steel rim frame (four thin bars around the opening)
    g.add(at(box(bw+0.10, 0.03, 0.06, C.basin), -0.28, brimY, -(bd/2+0.03)));
    g.add(at(box(bw+0.10, 0.03, 0.06, C.basin), -0.28, brimY,  (bd/2+0.03)));
    g.add(at(box(0.06, 0.03, bd+0.06, C.basin), -0.28-(bw/2+0.03), brimY, 0));
    g.add(at(box(0.06, 0.03, bd+0.06, C.basin), -0.28+(bw/2+0.03), brimY, 0));
    // basin walls + floor (open box sunk below the rim) — read as a hollow
    const basinCx = -0.28, floorY = topY-0.14;
    g.add(at(box(bw, 0.02, bd, C.basinD), basinCx, floorY, 0));           // basin floor
    g.add(at(box(bw+0.04, 0.20, 0.04, C.basinD), basinCx, topY-0.05, -(bd/2)));// far wall
    g.add(at(box(bw+0.04, 0.20, 0.04, C.basinD), basinCx, topY-0.05,  (bd/2)));// near wall
    g.add(at(box(0.04, 0.20, bd, C.basinD), basinCx-(bw/2), topY-0.05, 0));    // left wall
    g.add(at(box(0.04, 0.20, bd, C.basinD), basinCx+(bw/2), topY-0.05, 0));    // right wall

    // ---- 4. FAUCET / tap (upright post + swan-neck spout) ----------------
    const tapX = basinCx, tapZ = -(bd/2+0.06);
    g.add(at(box(0.10,0.05,0.10, C.tap), tapX, topY+0.06, tapZ));         // tap base
    const post=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.04,0.30,12), M(C.tap));
    post.position.set(tapX, topY+0.20, tapZ); g.add(post);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.24,12), M(C.tap));
    neck.rotation.z=Math.PI/2; neck.position.set(tapX, topY+0.34, tapZ+0.11); g.add(neck);
    const spout=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.08,10), M(C.tap));
    spout.position.set(tapX, topY+0.30, tapZ+0.22); g.add(spout);
    // small lever handle
    g.add(at(box(0.12,0.03,0.03, C.tap), tapX+0.09, topY+0.24, tapZ));

    // ---- 5. counter dressing: a plate + a jug ----------------------------
    const plate=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.15,0.03,18), M(C.plate));
    plate.position.set(0.62, topY+0.065, 0.08); g.add(plate);
    const jug=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.24,14), M(C.jug));
    jug.position.set(0.62, topY+0.17, -0.14); g.add(jug);
    g.add(at(box(0.05,0.10,0.03, C.jug), 0.72, topY+0.17, -0.14));        // jug handle

    // ---- shadows / placement --------------------------------------------
    g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = { kind:'prop', label:'Kitchen counter',
                   examine:'A sturdy counter with a metal sink. The tap drips.' };

    if(typeof scene!=='undefined' && scene && scene.add) scene.add(g);
    if(typeof WORLD!=='undefined' && WORLD){
      if(WORLD.clickables) WORLD.clickables.push(g);
      if(WORLD.colliders && typeof addRectCollider==='function'){
        const sideways = Math.abs((rot%Math.PI)) > 0.6;
        const hw = sideways ? D/2 : W/2;
        const hd = sideways ? W/2 : D/2;
        addRectCollider(x, z, hw, hd);
      }
    }
    return g;
  };

  console.log('[ref_missedprops] grandfather clock + kitchen sink ready');
})();
