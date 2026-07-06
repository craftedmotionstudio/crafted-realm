/* ============================================================================
 * ref_church.js  —  standalone stone CHURCH exterior (global-script, THREE r128)
 * Recreated from Bible_References/Church_Exterior_Option1.jpg + brief:
 *   long nave, steep gabled THATCH roof, tall front BELL TOWER w/ slate spire +
 *   cross, tall ARCHED stained-glass windows, big arched double DOOR, corner
 *   buttresses, coursed grey stone walls, a rose window on the rear gable.
 * Author ONE file only.  Exposes window.makeRefChurch(x,z,rot) -> THREE.Group.
 * ==========================================================================*/
(function(){
  'use strict';
  if(typeof window==='undefined') return;

  // ---- material guard (reuse the world's flat-shaded mat() when present) ----
  const M = (c)=> (typeof mat==='function')
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // coursed grey stone: prefer the shared canvas texture, tinted; flat fallback
  function stoneMat(tint, rx, ry){
    if(typeof TEX!=='undefined' && TEX.stone){
      const t=TEX.stone.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||2, ry||2);
      return new THREE.MeshLambertMaterial({map:t, color:tint||0xb9b4ab});
    }
    return M(tint||0x8f8a80);
  }
  // golden thatch roof: prefer the dedicated thatch texture
  function thatchMat(rx, ry){
    const src=(typeof TEX!=='undefined') ? (TEX.thatchRoof||TEX.thatch) : null;
    if(src){
      const t=src.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||3, ry||3);
      return new THREE.MeshLambertMaterial({map:t, color:0xd8bd7c});
    }
    return M(0xbf9d55);
  }

  function makeRefChurch(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g   = new THREE.Group();
    const roofG = new THREE.Group();          // grouped so a roof-lift toggle can reach it

    /* ---- dimensions (1 unit = 1 tile) ------------------------------------ */
    const L   = 10.5;                          // nave length (X)
    const Wd  = 6.0;                           // nave width  (Z)
    const wH  = 4.6;                           // nave wall height (~1.2 storeys)
    const t   = 0.42;                          // wall thickness
    const hx  = L/2, hz = Wd/2;
    const tw  = 3.0;                           // tower footprint (square)
    const towerX = hx + tw/2 - 0.55;           // tower planted at the front (+X), overlapping the gable
    const shaftTop = 7.2;                      // top of stone shaft / cornice
    const spireH   = 3.4;                      // slate spire

    // shared materials (one draw-state each, reused across many meshes)
    const wallMat  = stoneMat(0xb9b4ab, 3, 2);
    const trimMat  = stoneMat(0xc9c4ba, 2, 1); // lighter dressed stone for arches/quoins
    const roofMat  = thatchMat(4, 4);
    const woodMat  = (typeof TEX!=='undefined' && TEX.wood)
        ? new THREE.MeshLambertMaterial({map:TEX.wood, color:0x6e5236})
        : M(0x5b4733);
    const ironMat  = M(0x2c2c30);
    const slateMat = M(0x505a66);
    const goldMat  = M(0xc7a94e);

    /* ---- helpers --------------------------------------------------------- */
    function box(w,h,d,m,px,py,pz){
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
      o.position.set(px,py,pz); o.castShadow=true; o.receiveShadow=true;
      return o;
    }
    // arched outline: rectangular body of height hRect capped by a semicircle
    function archShape(w, hRect){
      const r=w/2, s=new THREE.Shape();
      s.moveTo(-r,0); s.lineTo(-r,hRect);
      s.absarc(0,hRect,r,Math.PI,0,true);      // over the top -> ends at (+r,hRect)
      s.lineTo(r,0); s.lineTo(-r,0);
      return s;
    }

    /* ---- tall ARCHED STAINED-GLASS window (faces +Z in local space) ------ */
    // cache the flat geometries so N windows reuse them
    const winW=1.15, winRect=1.55;            // total height ~ winRect + winW/2 = 2.13
    const glassGeo  = new THREE.ShapeGeometry(archShape(winW, winRect));
    const revealGeo = new THREE.ShapeGeometry(archShape(winW+0.28, winRect+0.14));
    // a translucent "leaded" base pane; hint of stained glass via a few coloured lights
    const stainCols=[0x3a4fa0,0x8a3a6a,0x2f7a4a,0xb0872f,0x7a3ab0,0x9a3030];
    function makeWindow(){
      const gp=new THREE.Group();
      gp.add(new THREE.Mesh(revealGeo, trimMat));                       // dressed-stone reveal
      const base=new THREE.Mesh(glassGeo, new THREE.MeshLambertMaterial(
        {color:0x2b3f86, emissive:0x14204a, transparent:true, opacity:0.82}));
      base.position.z=0.05; gp.add(base);
      // coloured stained panes (small boxes) in a 2x3 grid within the body
      let ci=0;
      for(let r=0;r<3;r++) for(let c=0;c<2;c++){
        const m=new THREE.MeshLambertMaterial({color:stainCols[ci%stainCols.length],
          emissive:new THREE.Color(stainCols[ci%stainCols.length]).multiplyScalar(0.35),
          transparent:true, opacity:0.9}); ci++;
        gp.add(box(winW*0.40, winRect*0.40, 0.04, m,
          (c?1:-1)*winW*0.24, winRect*0.20 + r*winRect*0.30, 0.06));
      }
      // dark lead tracery: centre mullion + two transoms + arch spring bar
      gp.add(box(0.07, winRect+winW*0.5, 0.06, ironMat, 0, (winRect+winW*0.5)/2, 0.08));
      gp.add(box(winW,  0.07, 0.06, ironMat, 0, winRect*0.42, 0.08));
      gp.add(box(winW,  0.07, 0.06, ironMat, 0, winRect*0.80, 0.08));
      gp.add(box(winW+0.02,0.08,0.06, ironMat, 0, winRect, 0.08));      // spring line
      return gp;
    }
    function placeWindow(px,pz,face){                 // face: +1 => +Z wall, -1 => -Z wall
      const w=makeWindow();
      w.position.set(px, 1.35, pz + face*0.02);
      w.rotation.y = face>0 ? 0 : Math.PI;
      g.add(w);
    }

    /* ---- WALLS: hollow shell, long nave ---------------------------------- */
    // long side walls (Z = +/-hz)
    g.add(box(L, wH, t, wallMat, 0, wH/2,  hz-t/2));
    g.add(box(L, wH, t, wallMat, 0, wH/2, -hz+t/2));
    // rear (back) gable wall
    g.add(box(t, wH, Wd, wallMat, -hx+t/2, wH/2, 0));
    // front wall (behind the tower) — split around a doorway into the tower
    const fdoorW=2.0;
    g.add(box(t, wH, (Wd-fdoorW)/2, wallMat, hx-t/2, wH/2,  (fdoorW/2+(Wd-fdoorW)/4)));
    g.add(box(t, wH, (Wd-fdoorW)/2, wallMat, hx-t/2, wH/2, -(fdoorW/2+(Wd-fdoorW)/4)));
    g.add(box(t, wH-2.9, fdoorW, wallMat, hx-t/2, wH-(wH-2.9)/2, 0));   // lintel over inner opening

    // simple stone floor slab (reads as a nave floor from the doorway)
    g.add(box(L-0.2, 0.14, Wd-0.2, stoneMat(0x9a958b,3,3), 0, 0.07, 0));

    // stained-glass windows: 3 down each long wall
    for(const px of [-3.1, 0.2, 3.1]){ placeWindow(px, hz-0.06, +1); placeWindow(px, -hz+0.06, -1); }

    /* ---- rose window on the rear gable ----------------------------------- */
    (function rose(){
      const rg=new THREE.Group(), R=0.95;
      rg.add(new THREE.Mesh(new THREE.CircleGeometry(R+0.14,20), trimMat));      // stone ring
      const disc=new THREE.Mesh(new THREE.CircleGeometry(R,20),
        new THREE.MeshLambertMaterial({color:0x2b3f86, emissive:0x14204a, transparent:true, opacity:0.85}));
      disc.position.z=0.05; rg.add(disc);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const bar=box(R*1.9,0.06,0.05, ironMat, 0,0,0.07); bar.rotation.z=a; rg.add(bar); // radial tracery
        const col=stainCols[i%stainCols.length];
        const p=box(0.30,0.30,0.04, new THREE.MeshLambertMaterial({color:col,
          emissive:new THREE.Color(col).multiplyScalar(0.35), transparent:true, opacity:0.9}),
          Math.cos(a)*R*0.55, Math.sin(a)*R*0.55, 0.06);
        rg.add(p);
      }
      rg.position.set(-hx+0.03, wH+1.35, 0); rg.rotation.y=-Math.PI/2;
      g.add(rg);
    })();

    /* ---- corner + wall BUTTRESSES ---------------------------------------- */
    const butGeo=new THREE.BoxGeometry(0.7, 3.6, 0.9);           // reused body
    const capGeo=new THREE.BoxGeometry(0.82,0.5,1.02);          // weathered sloping cap
    function buttress(px,pz){
      const b=new THREE.Group();
      const body=new THREE.Mesh(butGeo, wallMat); body.position.y=1.8; body.castShadow=true; b.add(body);
      const cap=new THREE.Mesh(capGeo, trimMat); cap.position.y=3.7; cap.rotation.x=0.32; cap.castShadow=true; b.add(cap);
      b.position.set(px,0,pz); g.add(b);
    }
    for(const pz of [-hz+0.15, hz-0.15]){
      buttress(-hx+0.15, pz); buttress(-1.55, pz); buttress(1.85, pz);  // rear corner + two along nave
    }

    /* ---- steep GABLED THATCH roof over the nave -------------------------- */
    (function naveRoof(){
      const span=Wd+0.7, len=L+0.7;
      const rise=span*0.62;                              // steep pitch (~60% -> ~52deg)
      const ang=Math.atan2(rise, span/2), hyp=Math.hypot(span/2,rise)+0.12;
      for(const s of [-1,1]){
        const slope=box(len,0.16,hyp, roofMat, 0, wH+rise/2+0.05, s*span/4);
        slope.rotation.x=s*ang; roofG.add(slope);
      }
      roofG.add(box(len+0.1,0.2,0.34, M(0x8c6b34), 0, wH+rise+0.06, 0)); // ridge cap
      // stone gable triangles fill the wall gable ends
      const tri=new THREE.Shape();
      tri.moveTo(-span/2+0.35,0); tri.lineTo(span/2-0.35,0); tri.lineTo(0,rise); tri.lineTo(-span/2+0.35,0);
      const tg=new THREE.ShapeGeometry(tri);
      const tm=wallMat.clone(); tm.side=THREE.DoubleSide;
      for(const e of [-1,1]){
        const end=new THREE.Mesh(tg,tm);
        end.rotation.y=e*Math.PI/2; end.position.set(e*(hx-0.02), wH, 0); end.castShadow=true;
        roofG.add(end);
      }
    })();

    /* ---- BELL TOWER / STEEPLE at the front ------------------------------- */
    (function tower(){
      const tg=new THREE.Group();
      // stone shaft
      tg.add(box(tw, shaftTop, tw, wallMat, 0, shaftTop/2, 0));
      // clasping quoins at the four vertical arrises
      for(const sx of [-1,1]) for(const sz of [-1,1])
        tg.add(box(0.34, shaftTop, 0.34, trimMat, sx*(tw/2-0.05), shaftTop/2, sz*(tw/2-0.05)));
      // string course + cornice
      tg.add(box(tw+0.24,0.22,tw+0.24, trimMat, 0, shaftTop*0.55, 0));
      tg.add(box(tw+0.34,0.30,tw+0.34, trimMat, 0, shaftTop-0.05, 0));

      // arched belfry louvres on all four faces
      const louGeo=new THREE.ShapeGeometry(archShape(0.9,0.9));
      const f=tw/2+0.02;
      for(let i=0;i<4;i++){
        const lv=new THREE.Group();
        lv.add(new THREE.Mesh(louGeo, M(0x24262b)));                 // dark recess
        for(let k=0;k<4;k++) lv.add(box(0.86,0.09,0.05, slateMat, 0, 0.2+k*0.28, 0.04)); // slats
        lv.position.set(0, shaftTop-2.1, f);           // sit on the +Z face...
        const grp=new THREE.Group(); grp.add(lv);      // ...then spin the whole face around the shaft
        grp.rotation.y=i*Math.PI/2;
        tg.add(grp);
      }

      // steep 4-sided SLATE spire + finial + CROSS
      const spire=new THREE.Mesh(new THREE.ConeGeometry(tw*0.72, spireH, 4), slateMat);
      spire.rotation.y=Math.PI/4; spire.position.y=shaftTop+spireH/2; spire.castShadow=true; tg.add(spire);
      const apex=shaftTop+spireH;
      tg.add(box(0.22,0.35,0.22, goldMat, 0, apex+0.15, 0));         // finial ball/base
      tg.add(box(0.12, 1.1, 0.12, goldMat, 0, apex+0.85, 0));        // cross upright
      tg.add(box(0.6, 0.12, 0.12, goldMat, 0, apex+1.05, 0));        // cross arms

      tg.position.set(towerX, 0, 0);
      g.add(tg);
    })();

    /* ---- large arched double DOOR in the tower base ---------------------- */
    (function door(){
      const dg=new THREE.Group();
      const dW=2.0, dRect=2.2;
      // dressed-stone arch surround (voussoirs) behind the leaves
      dg.add(new THREE.Mesh(new THREE.ShapeGeometry(archShape(dW+0.5, dRect+0.25)), trimMat));
      dg.add(new THREE.Mesh(new THREE.ShapeGeometry(archShape(dW+0.16, dRect+0.08)), M(0x2a2018)));
      // two plank leaves, hinged at the jambs and SWUNG OPEN (integration 2026-07-06:
      // the church is walk-in — closed leaves over an open collider path read wrong;
      // the dark arch fill behind reads as the open doorway). Iron straps ride each leaf.
      const lw = dW/2 - 0.06;
      for(const s of [-1,1]){
        const hinge=new THREE.Group(); hinge.position.set(s*(dW/2-0.02), 0, 0.12);
        const leaf=new THREE.Group();
        leaf.add(box(lw, dRect, 0.12, woodMat, -s*lw/2, dRect/2, 0));
        for(const y of [0.5, 1.35, 2.05]) leaf.add(box(lw-0.06, 0.1, 0.05, ironMat, -s*lw/2, y, 0.08));
        leaf.add(box(0.09, dRect-0.1, 0.05, ironMat, -s*lw/2, dRect/2, 0.08));
        hinge.add(leaf);
        hinge.rotation.y = s*1.8;                 // leaves resting open against the jambs
        dg.add(hinge);
      }
      // arched tympanum over the doorway (planked timber, above the leaf line)
      const tymp=new THREE.Mesh(new THREE.ShapeGeometry(archShape(dW-0.04, dRect)), woodMat);
      tymp.position.set(0,0,0.1); dg.add(tymp);
      // door sits on the tower's front face
      dg.position.set(towerX + tw/2 - 0.02, 0, 0);
      dg.rotation.y=Math.PI/2;
      g.add(dg);
    })();

    /* ---- ground plinth / step (LOW: 0.12 top — a 0.4-high slab buried the player's
     * shins once the nave went walk-in; the nave floor slab at 0.14 stays on top) ---- */
    const totalLen = (towerX+tw/2) - (-hx) + 0.6;
    g.add(box(totalLen, 0.12, Wd+1.0, stoneMat(0x8f8a80,4,3),
      (-hx + (towerX+tw/2))/2, 0.06, 0));

    /* ---- register + place ------------------------------------------------ */
    roofG.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roofG);
    if(typeof WORLD!=='undefined' && WORLD.roofs) WORLD.roofs.push({mesh:roofG, x, z});
    /* WALK-IN collider layout (integration 2026-07-06): wall segments tracing the real
     * shell with the real door path (outside → tower door → tower → inner doorway →
     * nave) instead of the old solid block — a sealed church can't hold the altar.
     * Colliders are axis-aligned: rot must be a multiple of PI/2. */
    if(typeof addRectCollider==='function'){
      const q=Math.round(rot/(Math.PI/2))*(Math.PI/2);
      const c=Math.round(Math.cos(q)), s=Math.round(Math.sin(q)), swap=(s!==0);
      const R=(lx,lz,hw,hd)=>addRectCollider(x + lx*c + lz*s, z - lx*s + lz*c,
        swap?hd:hw, swap?hw:hd);
      const T=0.3, seg=(Wd-fdoorW)/2;
      R(0,  hz-t/2, hx, T);                            // long wall (+Z side)
      R(0, -hz+t/2, hx, T);                            // long wall (−Z side)
      R(-hx+t/2, 0, T, hz);                            // rear gable wall
      R(hx-t/2,  (fdoorW/2+seg/2), T, seg/2);          // front wall beside the inner doorway
      R(hx-t/2, -(fdoorW/2+seg/2), T, seg/2);
      R(towerX,  tw/2-0.15, tw/2, 0.25);               // tower side walls
      R(towerX, -tw/2+0.15, tw/2, 0.25);
      const fx=towerX+tw/2-0.15, fseg=(tw-2.0)/2;      // tower front beside the 2.0 door
      R(fx,  (1.0+fseg/2), 0.25, fseg/2);
      R(fx, -(1.0+fseg/2), 0.25, fseg/2);
    }
    // room registration: roof-hide + "don't path through buildings" both key off this.
    // The entry MUST carry roof (game5's interiors loop does it.roof.visible each frame —
    // an entry without it crashed update() every frame, caught by the smoke gate 2026-07-06).
    if(typeof WORLD!=='undefined' && WORLD.interiors){
      const swap=(Math.round(Math.sin(Math.round(rot/(Math.PI/2))*(Math.PI/2))))!==0;
      WORLD.interiors.push({x:x, z:z, hw:(swap?hz:hx)+0.3, hd:(swap?hx:hz)+0.3,
        roof:roofG, band:null});
    }

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = {kind:'church', label:'Enter the <b>Church</b>'};
    return g;
  }

  window.makeRefChurch = makeRefChurch;
  console.log('[ref_church] makeRefChurch ready');
})();
