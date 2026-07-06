/* ============================================================================
 * ref_bld2.js  —  standalone L-shaped stone MANOR/HALL exterior
 *                 (global-script, THREE r128 — NOT an ES module)
 * Recreated from Bible_References/Building_Exterior_Option2.jpg:
 *   - L-shaped coursed grey STONE building
 *   - a TWO-STOREY main block (front) with a big golden THATCH gable roof
 *   - a lower SINGLE-STOREY side WING extending to the right, own thatch gable
 *     with a perpendicular ridge (forms the L)
 *   - a tall square STONE TOWER with an OPEN CRENELLATED (battlemented) top at
 *     the back corner — the tallest element
 *   - white multi-pane leaded WINDOWS on both storeys / both wings
 *   - a wooden plank DOOR at the front-left
 *   - clasping quoins, warm flat-shaded low-poly OSRS look
 * Author ONE file only. Exposes window.makeRefBld2(x,z,rot) -> THREE.Group.
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
      return new THREE.MeshLambertMaterial({map:t, color:tint||0xaba79e});
    }
    return M(tint||0x8f8a80);
  }
  // golden thatch roof: prefer the dedicated thatch texture
  function thatchMat(rx, ry){
    const src=(typeof TEX!=='undefined') ? (TEX.thatchRoof||TEX.thatch) : null;
    if(src){
      const t=src.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx||3, ry||3);
      return new THREE.MeshLambertMaterial({map:t, color:0xcbb06f});
    }
    return M(0xbf9d55);
  }

  function makeRefBld2(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g     = new THREE.Group();
    const roofG = new THREE.Group();      // grouped so the roof-lift toggle can reach it

    /* ---- shared materials (one draw-state each, reused across many meshes) - */
    const wallMat  = stoneMat(0xaba79e, 3, 2);          // coursed grey stone
    const trimMat  = stoneMat(0xc7c2b8, 1, 1);          // lighter dressed stone (quoins)
    const roofMat  = thatchMat(4, 3);
    const ridgeMat = M(0x8c6b34);
    const woodMat  = (typeof TEX!=='undefined' && TEX.wood)
        ? new THREE.MeshLambertMaterial({map:TEX.wood, color:0x6e5236})
        : M(0x5b4733);
    const frameMat = M(0xe9e7dd);                       // white window frame
    const ironMat  = M(0x2c2c30);
    const glassMat = new THREE.MeshLambertMaterial(
        {color:0xb8ccd4, emissive:0x33454e, transparent:true, opacity:0.9});

    /* ---- primitives ------------------------------------------------------- */
    function box(w,h,d,m,px,py,pz){
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
      o.position.set(px,py,pz); o.castShadow=true; o.receiveShadow=true;
      return o;
    }

    /* ---- dimensions (1 unit = 1 tile) ------------------------------------- */
    const storey = 3.8;
    const t      = 0.4;                    // wall thickness for gable-fill offset

    // MAIN block (two storeys), ridge runs along Z
    const mW = 6.0, mL = 8.0, mH = storey*2;          // width(X) x length(Z) x wall H
    const mCx = 0, mCz = 0;
    const mX0=mCx-mW/2, mX1=mCx+mW/2, mZ0=mCz-mL/2, mZ1=mCz+mL/2;

    // SIDE wing (single storey), ridge runs along X, extends toward +X
    const sW = 6.5, sD = 5.0, sH = storey*1.15;        // length(X) x depth(Z) x wall H
    const sCx = mX1 + sW/2 - 0.4, sCz = 1.2;           // overlaps the main block's +X wall
    const sZ0=sCz-sD/2, sZ1=sCz+sD/2;

    // TOWER (square, open crenellated top) at the back corner of the main block
    const tw = 3.0, towerH = storey*2.75;              // shaft height to parapet rim
    const tCx = mX0 + tw/2 + 0.2, tCz = mZ0 - tw/2 + 0.9;

    /* ---- solid stone masses (simple, readable low-poly volumes) ----------- */
    g.add(box(mW, mH, mL, wallMat, mCx, mH/2, mCz));                 // main 2-storey block
    g.add(box(sW, sH, sD, wallMat, sCx, sH/2, sCz));                 // side single-storey wing

    // floor string-course band around the main block (reads the storey split)
    g.add(box(mW+0.14, 0.26, mL+0.14, trimMat, mCx, storey, mCz));

    // clasping quoins on the exposed corners of the main block
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      // skip the corner buried in the side wing / tower
      g.add(box(0.4, mH, 0.4, trimMat, mCx+sx*(mW/2-0.02), mH/2, mCz+sz*(mL/2-0.02)));
    }
    // low plinth under the whole footprint
    g.add(box(mW+0.5, 0.4, mL+0.5, trimMat, mCx, 0.2, mCz));
    g.add(box(sW+0.4, 0.4, sD+0.4, trimMat, sCx, 0.2, sCz));

    /* ---- WHITE multi-pane leaded WINDOW (faces +Z in local space) --------- */
    const winW=1.15, winH=1.45;
    const glassGeo = new THREE.BoxGeometry(winW, winH, 0.05);
    function makeWindow(){
      const gp=new THREE.Group();
      gp.add(box(winW+0.34, winH+0.34, 0.14, trimMat, 0, 0, -0.02));   // dressed-stone reveal
      const pane=new THREE.Mesh(glassGeo, glassMat); pane.position.z=0.05; gp.add(pane);
      // white frame: outer surround + centre mullion + two transoms (2x3 panes)
      gp.add(box(winW+0.14, 0.12, 0.08, frameMat, 0,  winH/2, 0.09));  // head
      gp.add(box(winW+0.14, 0.12, 0.08, frameMat, 0, -winH/2, 0.09));  // sill
      gp.add(box(0.12, winH, 0.08, frameMat, -winW/2, 0, 0.09));       // jamb L
      gp.add(box(0.12, winH, 0.08, frameMat,  winW/2, 0, 0.09));       // jamb R
      gp.add(box(0.09, winH, 0.07, frameMat, 0, 0, 0.10));             // centre mullion
      gp.add(box(winW, 0.09, 0.07, frameMat, 0,  winH*0.17, 0.10));    // transom
      gp.add(box(winW, 0.09, 0.07, frameMat, 0, -winH*0.17, 0.10));    // transom
      return gp;
    }
    function placeWin(px,py,pz,rotY){
      const w=makeWindow();
      w.position.set(px,py,pz); w.rotation.y=rotY||0; g.add(w);
    }

    // main block — front (+Z) face: ground-floor pair (right of door) + upper trio
    placeWin(mCx+1.4, storey*0.55, mZ1+0.02, 0);
    placeWin(mCx+2.6, storey*0.55, mZ1+0.02, 0);
    for(const px of [mCx-1.6, mCx+0.5, mCx+2.6])
      placeWin(px, storey*1.55, mZ1+0.02, 0);
    // main block — left (-X) long face: two windows per storey
    for(const pz of [mCz-2.0, mCz+2.0]){
      placeWin(mX0-0.02, storey*0.55, pz, -Math.PI/2);
      placeWin(mX0-0.02, storey*1.55, pz, -Math.PI/2);
    }
    // side wing — front (+Z) face: two windows
    for(const px of [sCx-1.4, sCx+1.4]) placeWin(px, sH*0.5, sZ1+0.02, 0);
    // side wing — right gable (+X) end: one window
    placeWin(sCx+sW/2+0.02, sH*0.5, sCz, Math.PI/2);

    /* ---- wooden plank DOOR (front-left of the main block) ----------------- */
    (function door(){
      const dg=new THREE.Group(), dW=1.5, dH=2.6;
      dg.add(box(dW+0.36, dH+0.3, 0.16, trimMat, 0, dH/2, -0.02));     // stone surround
      dg.add(box(dW, dH, 0.14, woodMat, 0, dH/2, 0.06));               // planked leaf
      for(let i=-1;i<=1;i++) dg.add(box(0.08, dH-0.1, 0.04, ridgeMat, i*0.42, dH/2, 0.14)); // seams
      for(const y of [0.55, dH-0.4]) dg.add(box(dW, 0.1, 0.05, ironMat, 0, y, 0.15));       // iron bands
      dg.position.set(mCx-1.7, 0, mZ1+0.02);
      g.add(dg);
    })();

    /* ---- helper: steep GABLED THATCH roof --------------------------------- */
    function gableRoof(cx, cz, ridgeLen, span, baseY, ridgeAlongX){
      const oh=0.7, len=ridgeLen+oh, sp=span+oh;
      const rise=sp*0.52, ang=Math.atan2(rise, sp/2), hyp=Math.hypot(sp/2,rise)+0.12;
      for(const s of [-1,1]){
        let slope;
        if(ridgeAlongX){
          slope=box(len,0.16,hyp, roofMat, cx, baseY+rise/2+0.05, cz+s*sp/4);
          slope.rotation.x=s*ang;
        }else{
          slope=box(hyp,0.16,len, roofMat, cx+s*sp/4, baseY+rise/2+0.05, cz);
          slope.rotation.z=-s*ang;
        }
        roofG.add(slope);
      }
      if(ridgeAlongX) roofG.add(box(len+0.1,0.2,0.32, ridgeMat, cx, baseY+rise+0.06, cz));
      else            roofG.add(box(0.32,0.2,len+0.1, ridgeMat, cx, baseY+rise+0.06, cz));
      // stone gable-end triangles fill the wall gables
      const tri=new THREE.Shape();
      tri.moveTo(-sp/2+0.35,0); tri.lineTo(sp/2-0.35,0); tri.lineTo(0,rise); tri.lineTo(-sp/2+0.35,0);
      const tg=new THREE.ShapeGeometry(tri);
      const tm=wallMat.clone(); tm.side=THREE.DoubleSide;
      for(const e of [-1,1]){
        const end=new THREE.Mesh(tg,tm); end.castShadow=true;
        if(ridgeAlongX){ end.rotation.y=e*Math.PI/2; end.position.set(cx, baseY, cz+e*(ridgeLen/2-0.02)); }
        else           { if(e<0) end.rotation.y=Math.PI; end.position.set(cx+e*(ridgeLen/2-0.02), baseY, cz); }
        roofG.add(end);
      }
      return rise;
    }
    gableRoof(mCx, mCz, mL, mW, mH, false);            // main block roof (ridge along Z)
    gableRoof(sCx, sCz, sW, sD, sH, true);             // side wing roof  (ridge along X)

    /* ---- TOWER: square stone shaft with OPEN CRENELLATED top -------------- */
    (function tower(){
      const tg=new THREE.Group();
      tg.add(box(tw, towerH, tw, wallMat, 0, towerH/2, 0));            // shaft
      // clasping quoins on the four vertical arrises
      for(const sx of [-1,1]) for(const sz of [-1,1])
        tg.add(box(0.36, towerH, 0.36, trimMat, sx*(tw/2-0.04), towerH/2, sz*(tw/2-0.04)));
      // string course + parapet base ring (below the merlons)
      tg.add(box(tw+0.3, 0.24, tw+0.3, trimMat, 0, towerH*0.62, 0));
      tg.add(box(tw+0.36, 0.5, tw+0.36, trimMat, 0, towerH-0.05, 0));  // corbelled parapet base
      // a couple of tall arrow-slit windows high on the shaft (+Z and -X faces)
      const slit=new THREE.BoxGeometry(0.22, 1.1, 0.08);
      const s1=new THREE.Mesh(slit, ironMat); s1.position.set(0, towerH*0.5, tw/2+0.02); tg.add(s1);
      const s2=new THREE.Mesh(slit, ironMat); s2.position.set(-tw/2-0.02, towerH*0.72, 0); s2.rotation.y=Math.PI/2; tg.add(s2);
      // battlements: ring of merlons around the open rim
      const rim=tw/2+0.18, rimY=towerH+0.2, mS=0.6, mH2=0.75, step=tw/2-0.05;
      function merlon(px,pz){ tg.add(box(mS, mH2, mS, trimMat, px, rimY+mH2/2, pz)); }
      for(let i=-1;i<=1;i++){
        merlon(i*step,  rim);          // +Z edge
        merlon(i*step, -rim);          // -Z edge
        if(i===0){ merlon(rim, 0); merlon(-rim, 0); }  // side mid-merlons (corners already placed)
      }
      tg.position.set(tCx, 0, tCz);
      g.add(tg);
    })();

    /* ---- register + place ------------------------------------------------- */
    roofG.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roofG);
    if(typeof WORLD!=='undefined' && WORLD.roofs) WORLD.roofs.push({mesh:roofG, x, z});
    if(typeof addRectCollider==='function'){
      addRectCollider(x+mCx*Math.cos(rot)+mCz*Math.sin(rot),
                      z-mCx*Math.sin(rot)+mCz*Math.cos(rot), mW/2+0.4, mL/2+0.4);
      addRectCollider(x+sCx*Math.cos(rot)+sCz*Math.sin(rot),
                      z-sCx*Math.sin(rot)+sCz*Math.cos(rot), sW/2+0.3, sD/2+0.3);
      addRectCollider(x+tCx*Math.cos(rot)+tCz*Math.sin(rot),
                      z-tCx*Math.sin(rot)+tCz*Math.cos(rot), tw/2+0.2, tw/2+0.2);
    }

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = {kind:'bld2', label:'Enter the <b>Hall</b>'};
    return g;
  }

  window.makeRefBld2 = makeRefBld2;
  console.log('[ref_bld2] makeRefBld2 ready');
})();
