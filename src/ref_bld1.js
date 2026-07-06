/* ============================================================================
 * ref_bld1.js  —  standalone OCTAGONAL TOWER building (global-script, THREE r128)
 * Recreated from Bible_References/Building_Exterior_Option1.jpg :
 *   OSRS-style two-storey octagonal tower on a hill.  Ground storey is coursed
 *   grey STONE with a big analog CLOCK face, timber-lattice WINDOWS and a plank
 *   DOOR.  An overhanging THATCH skirt-eave rings the mid line.  The upper
 *   storey is an OPEN-AIR veranda / bar: 8 corner WOODEN POSTS, a railing
 *   balustrade on the open sides, low stone half-walls on the back, a round
 *   TABLE with STOOLS and a potted plant.  Crowned by a wide-eaved octagonal
 *   THATCH PYRAMID roof with a finial.  Author ONE file only.
 *   Exposes window.makeRefBld1(x,z,rot) -> THREE.Group.
 * ==========================================================================*/
(function(){
  'use strict';
  if(typeof window==='undefined') return;

  // ---- material guard (reuse the world's flat-shaded mat() when present) ----
  const M = (c)=> (typeof mat==='function')
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  function stoneMat(tint, rx, ry){
    if(typeof TEX!=='undefined' && TEX.stone){
      const t=TEX.stone.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||2, ry||2);
      return new THREE.MeshLambertMaterial({map:t, color:tint||0xb9b4ab});
    }
    return M(tint||0x8f8a80);
  }
  function thatchMat(tint, rx, ry){
    const src=(typeof TEX!=='undefined') ? (TEX.thatchRoof||TEX.thatch) : null;
    if(src){
      const t=src.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||4, ry||3);
      return new THREE.MeshLambertMaterial({map:t, color:tint||0xceac60});
    }
    return M(tint||0xbf9d55);
  }
  function woodMat(tint){
    if(typeof TEX!=='undefined' && TEX.wood){
      const t=TEX.wood.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,2);
      return new THREE.MeshLambertMaterial({map:t, color:tint||0x6e5236});
    }
    return M(tint||0x5b4733);
  }

  function makeRefBld1(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g    = new THREE.Group();
    const roofG= new THREE.Group();            // grouped so the roof-lift toggle can reach it

    /* ---- octagon geometry (1 unit = 1 tile) ------------------------------ */
    const a   = 4.4;                           // apothem: centre -> face midpoint
    const R   = a/Math.cos(Math.PI/8);         // centre -> vertex (~4.76)
    const faceW = 2*a*Math.tan(Math.PI/8);     // flat width of one face (~3.65)
    const gH  = 3.9;                           // ground storey height (~1 storey)
    const uH  = 3.3;                           // upper (veranda) storey height
    const wt  = 0.4;                           // wall thickness
    const deckY = gH;                          // upper-floor deck level
    const postTop = gH + uH;                   // top of corner posts / eave line

    /* ---- shared materials ------------------------------------------------ */
    const wallMat  = stoneMat(0xa9a49b, 2, 2);
    const plinthMat= stoneMat(0x847f75, 3, 1);
    const trimMat  = stoneMat(0xc2bcb1, 2, 1);
    const thatch   = thatchMat(0xceac60, 4, 2);
    const thatchTop= thatchMat(0xd8b869, 5, 4);
    const wood     = woodMat(0x6e5236);
    const woodDark = M(0x4a382a);
    const railMat  = woodMat(0x7a5c3d);
    const glassMat = new THREE.MeshLambertMaterial({color:0x1d2732, emissive:0x0e161f, transparent:true, opacity:0.55});
    const ironMat  = M(0x2c2c30);
    const clockFaceMat = M(0xe7e2d4);
    const clockRimMat  = M(0x3a3a3e);
    const leafMat  = M(0x3f6a34);
    const potMat   = M(0x7a4a2c);

    /* ---- helpers --------------------------------------------------------- */
    function box(w,h,d,m,px,py,pz){
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
      o.position.set(px,py,pz); o.castShadow=true; o.receiveShadow=true;
      return o;
    }
    // per-face frame: local +Z faces radially outward, local +X tangential
    function faceGroup(i, radial){
      const ang=i*Math.PI/4;
      const gp=new THREE.Group();
      gp.position.set((a+ (radial||0))*Math.cos(ang), 0, (a+(radial||0))*Math.sin(ang));
      gp.rotation.y = Math.PI/2 - ang;
      return gp;
    }

    /* ---- GROUND STOREY: 8 coursed-stone wall panels ---------------------- */
    // door on face 0 (+X front); clock on face 2; windows on faces 5 & 6.
    const DOOR_FACE=0, CLOCK_FACE=2, WIN_FACES=[5,6];
    const panelGeo = new THREE.BoxGeometry(faceW+0.12, gH, wt);   // reused for every face
    for(let i=0;i<8;i++){
      const fg=faceGroup(i, 0);
      if(i===DOOR_FACE){
        // split the wall around a doorway (opening ~1.9 wide, 2.7 tall)
        const dw=1.9, dh=2.7, side=(faceW+0.12-dw)/2;
        fg.add(box(side, gH, wt, wallMat, -(dw/2+side/2), gH/2, 0));
        fg.add(box(side, gH, wt, wallMat,  (dw/2+side/2), gH/2, 0));
        fg.add(box(dw,   gH-dh, wt, wallMat, 0, dh+(gH-dh)/2, 0));       // lintel wall
      } else {
        const p=new THREE.Mesh(panelGeo, wallMat);
        p.position.y=gH/2; p.castShadow=p.receiveShadow=true; fg.add(p);
      }
      g.add(fg);
    }

    // stone plinth / base course ring (a shallow wider octagon drum)
    const plinth=new THREE.Mesh(new THREE.CylinderGeometry(R+0.35, R+0.5, 0.55, 8), plinthMat);
    plinth.rotation.y=Math.PI/8; plinth.position.y=0.27; plinth.castShadow=plinth.receiveShadow=true; g.add(plinth);
    // ground-floor slab
    const floor0=new THREE.Mesh(new THREE.CylinderGeometry(R-0.15, R-0.15, 0.16, 8), plinthMat);
    floor0.rotation.y=Math.PI/8; floor0.position.y=0.6; g.add(floor0);

    /* ---- DOOR (face 0) --------------------------------------------------- */
    (function door(){
      const fg=faceGroup(DOOR_FACE, wt/2);
      const dw=1.7, dh=2.55;
      fg.add(box(dw+0.34, dh+0.22, 0.14, woodDark, 0, (dh+0.22)/2, 0.02)); // timber frame
      fg.add(box(dw+0.14, dh+0.04, 0.05, M(0x1a140e), 0, (dh)/2, 0.09));   // dark reveal
      for(const s of [-1,1]){                                             // two plank leaves
        fg.add(box(dw/2-0.05, dh, 0.1, wood, s*(dw/4), dh/2, 0.12));
      }
      for(const y of [0.5, 1.7]) fg.add(box(dw-0.06, 0.09, 0.05, ironMat, 0, y, 0.18)); // iron bands
      fg.add(box(0.09, dh-0.1, 0.05, ironMat, 0, dh/2, 0.18));            // centre strap
      // small worn stone step in front of the door
      fg.add(box(dw+0.5, 0.3, 0.7, plinthMat, 0, 0.15, 0.55));
      g.add(fg);
    })();

    /* ---- CLOCK (face 2) -------------------------------------------------- */
    (function clock(){
      const fg=faceGroup(CLOCK_FACE, wt/2);
      const cy=gH*0.6, r=0.85;
      // dark square backing plate (as in the ref) + round face + rim
      fg.add(box(2.0, 2.0, 0.1, M(0x241c14), 0, cy, 0.04));
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(r+0.1, r+0.1, 0.08, 20), clockRimMat);
      rim.rotation.x=Math.PI/2; rim.position.set(0,cy,0.11); fg.add(rim);
      const face=new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 20), clockFaceMat);
      face.rotation.x=Math.PI/2; face.position.set(0,cy,0.13); fg.add(face);
      // hour ticks
      for(let k=0;k<12;k++){
        const ta=k*Math.PI/6;
        const tick=box(0.05,0.14,0.04, M(0x2a2a2e),
          Math.sin(ta)*(r-0.12), cy+Math.cos(ta)*(r-0.12), 0.15);
        tick.rotation.z=-ta; fg.add(tick);
      }
      // hands (hour ~ up-left, minute ~ up-right)
      const hHand=box(0.07,0.55,0.04, M(0x1c1c20), 0, cy, 0.16); hHand.rotation.z= 0.9;  hHand.geometry.translate(0,0.27,0); hHand.position.set(0,cy,0.16); fg.add(hHand);
      const mHand=box(0.05,0.78,0.04, M(0x1c1c20), 0, cy, 0.17); mHand.rotation.z=-0.4;  mHand.geometry.translate(0,0.39,0); mHand.position.set(0,cy,0.17); fg.add(mHand);
      fg.add(box(0.12,0.12,0.05, clockRimMat, 0, cy, 0.18));             // hub
      g.add(fg);
    })();

    /* ---- timber-lattice WINDOWS (faces 5 & 6) ---------------------------- */
    const winW=1.5, winH=1.9;
    const winFrameGeo=new THREE.BoxGeometry(winW+0.22, winH+0.22, 0.12);
    const winGlassGeo=new THREE.BoxGeometry(winW, winH, 0.06);
    const mullGeo=new THREE.BoxGeometry(0.07, winH, 0.05);
    const transGeo=new THREE.BoxGeometry(winW, 0.07, 0.05);
    for(const fi of WIN_FACES){
      const fg=faceGroup(fi, wt/2);
      const cy=gH*0.58;
      const wf=new THREE.Mesh(winFrameGeo, wood);  wf.position.set(0,cy,0.02); wf.castShadow=true; fg.add(wf);
      const wg=new THREE.Mesh(winGlassGeo, glassMat); wg.position.set(0,cy,0.08); fg.add(wg);
      // lattice: 2 mullions + 2 transoms
      for(const mx of [-winW/4, winW/4]){ const mm=new THREE.Mesh(mullGeo, woodDark); mm.position.set(mx,cy,0.12); fg.add(mm); }
      for(const my of [-winH/4, winH/4]){ const tt=new THREE.Mesh(transGeo, woodDark); tt.position.set(0,cy+my,0.12); fg.add(tt); }
      g.add(fg);
    }

    /* ---- MID-TIER overhanging THATCH skirt eave -------------------------- */
    (function midEave(){
      const skirt=new THREE.Mesh(new THREE.CylinderGeometry(a+0.25, R+1.35, 1.05, 8, 1, true), thatch);
      skirt.rotation.y=Math.PI/8; skirt.position.y=gH-0.15; skirt.castShadow=true;
      roofG.add(skirt);
      // ridge cap ring at the top of the skirt
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(a+0.2, a+0.3, 0.18, 8), M(0x8c6b34));
      cap.rotation.y=Math.PI/8; cap.position.y=gH+0.38; roofG.add(cap);
    })();

    /* ---- UPPER STOREY: deck, posts, railings, stone half-walls ---------- */
    // upper-floor deck
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(R-0.05, R-0.05, 0.18, 8), woodMat(0x5f4a34));
    deck.rotation.y=Math.PI/8; deck.position.y=deckY; deck.receiveShadow=true; g.add(deck);

    // 8 corner wooden posts (at the octagon vertices)
    const postGeo=new THREE.BoxGeometry(0.28, uH, 0.28);
    for(let v=0; v<8; v++){
      const va=v*Math.PI/4 + Math.PI/8;
      const p=new THREE.Mesh(postGeo, wood);
      p.position.set((R-0.1)*Math.cos(va), deckY+uH/2, (R-0.1)*Math.sin(va));
      p.castShadow=true; g.add(p);
    }

    // per-face: railing on open (front) sides, low stone wall on back sides
    const BACK_FACES=[3,4,5];                 // stone half-walls face the hill
    const balusterGeo=new THREE.BoxGeometry(0.07,0.85,0.07);
    const railGeo=new THREE.BoxGeometry(faceW-0.2, 0.12, 0.14);
    for(let i=0;i<8;i++){
      const fg=faceGroup(i, 0);
      if(BACK_FACES.includes(i)){
        fg.add(box(faceW+0.12, 1.5, wt, wallMat, 0, deckY+0.75, 0));      // stone half-wall
        fg.add(box(faceW+0.16, 0.16, wt+0.06, trimMat, 0, deckY+1.5, 0)); // coping
      } else if(i!==DOOR_FACE || true){
        // railing balustrade
        const topR=new THREE.Mesh(railGeo, railMat); topR.position.set(0, deckY+0.98, 0); fg.add(topR);
        const botR=new THREE.Mesh(railGeo, railMat); botR.position.set(0, deckY+0.2, 0);  fg.add(botR);
        const n=4;
        for(let b=0;b<n;b++){
          const bx=-(faceW-0.5)/2 + b*(faceW-0.5)/(n-1);
          const bl=new THREE.Mesh(balusterGeo, railMat); bl.position.set(bx, deckY+0.58, 0); fg.add(bl);
        }
      }
      g.add(fg);
    }

    // round bar TABLE + STOOLS + potted plant on the veranda
    (function furniture(){
      const top=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.14,16), woodMat(0x6a4f34));
      top.position.set(0, deckY+1.15, 0); top.castShadow=true; g.add(top);
      g.add(box(0.28, 1.1, 0.28, woodDark, 0, deckY+0.6, 0));               // pedestal
      const stoolGeo=new THREE.CylinderGeometry(0.32,0.32,0.12,12);
      const stoolLegGeo=new THREE.BoxGeometry(0.14,0.7,0.14);
      for(let s=0;s<4;s++){
        const sa=s*Math.PI/2 + Math.PI/4, sr=1.7;
        const sx=sr*Math.cos(sa), sz=sr*Math.sin(sa);
        const st=new THREE.Mesh(stoolGeo, woodMat(0x5f4a34)); st.position.set(sx, deckY+0.78, sz); st.castShadow=true; g.add(st);
        const lg=new THREE.Mesh(stoolLegGeo, woodDark); lg.position.set(sx, deckY+0.4, sz); g.add(lg);
      }
      // potted palm/plant near a corner
      const pa=Math.PI/8, pr=R-0.6;
      const px=pr*Math.cos(pa), pz=pr*Math.sin(pa);
      g.add(box(0.5,0.5,0.5, potMat, px, deckY+0.35, pz));
      for(let f=0;f<5;f++){
        const fa=f*Math.PI*2/5;
        const frond=box(0.12,0.9,0.12, leafMat, px+Math.cos(fa)*0.3, deckY+1.05, pz+Math.sin(fa)*0.3);
        frond.rotation.set(Math.sin(fa)*0.5, fa, Math.cos(fa)*0.5); g.add(frond);
      }
    })();

    /* ---- TOP octagonal THATCH PYRAMID roof (wide overhanging eaves) ------ */
    (function topRoof(){
      const overhang=1.7, roofH=3.6;
      const cone=new THREE.Mesh(new THREE.ConeGeometry(R+overhang, roofH, 8), thatchTop);
      cone.rotation.y=Math.PI/8; cone.position.y=postTop+roofH/2-0.1; cone.castShadow=true;
      roofG.add(cone);
      // thin fascia ring at the eave line to thicken the overhang edge
      const fascia=new THREE.Mesh(new THREE.CylinderGeometry(R+overhang-0.05, R+overhang+0.15, 0.35, 8), thatch);
      fascia.rotation.y=Math.PI/8; fascia.position.y=postTop-0.05; roofG.add(fascia);
      // finial cap + spike at the apex
      roofG.add(box(0.4,0.4,0.4, M(0x8c6b34), 0, postTop+roofH-0.1, 0));
      roofG.add(box(0.14,0.9,0.14, woodDark, 0, postTop+roofH+0.35, 0));
    })();

    /* ---- register, collide, place --------------------------------------- */
    roofG.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roofG);
    if(typeof WORLD!=='undefined' && WORLD.roofs) WORLD.roofs.push({mesh:roofG, x, z});
    if(typeof addRectCollider==='function') addRectCollider(x, z, a+0.3, a+0.3);

    const baseY=(typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y=rot;
    g.userData={kind:'bld1', label:'Enter the <b>Tower</b>'};
    return g;
  }

  window.makeRefBld1 = makeRefBld1;
  console.log('[ref_bld1] makeRefBld1 ready');
})();
