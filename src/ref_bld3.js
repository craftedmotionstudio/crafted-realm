/* ============================================================================
 * ref_bld3.js  —  standalone WHITE-PLASTER FARMHOUSE exterior
 *                 (global-script, THREE r128; NOT an ES module)
 * Recreated from Bible_References/Building_Exterior_Option3.jpg :
 *   irregular TWO-STOREY farmhouse — bright whitewashed plaster walls, warm
 *   BROWN timber corner-posts + eave trim, and pale weathered THATCH HIPPED
 *   roofs in THREE staggered masses (tall rear block, big front-right block
 *   carrying the DOOR + two stacked multi-pane leaded windows, lower front-
 *   left wing with a single window).  No chimney, no tower.
 * Author ONE file only.  Exposes window.makeRefBld3(x,z,rot) -> THREE.Group.
 * ==========================================================================*/
(function(){
  'use strict';
  if(typeof window==='undefined') return;

  // ---- material guard (reuse the world's flat-shaded mat() when present) ----
  const M = (c)=> (typeof mat==='function')
      ? mat(c)
      : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // bright limewashed plaster: prefer the shared canvas texture, tinted white
  function plasterMat(tint){
    if(typeof TEX!=='undefined' && TEX.plaster){
      const t=TEX.plaster.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1.6,1.4);
      return new THREE.MeshLambertMaterial({map:t, color:tint||0xf4f1e7});
    }
    return M(tint||0xf2efe4);
  }
  // pale weathered straw thatch: prefer the coursed thatchRoof texture
  function thatchMat(){
    const src=(typeof TEX!=='undefined') ? (TEX.thatchRoof||TEX.thatch) : null;
    if(src){
      const t=src.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping;
      return new THREE.MeshLambertMaterial({map:t, color:0xdccfae, side:THREE.DoubleSide});
    }
    return new THREE.MeshLambertMaterial({color:0xcfc3a0, flatShading:true, side:THREE.DoubleSide});
  }

  function makeRefBld3(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g     = new THREE.Group();
    const roofG = new THREE.Group();          // grouped so the world roof-lift toggle can reach it

    /* ---- shared materials (one draw-state each, reused everywhere) -------- */
    const wallMat  = plasterMat(0xf4f1e7);
    const roofMat  = thatchMat();
    const woodMat  = (typeof TEX!=='undefined' && TEX.wood)
        ? new THREE.MeshLambertMaterial({map:TEX.wood, color:0x7a5a34})
        : M(0x6e5236);
    const trimMat  = M(0x6e5236);             // warm brown timber corner-posts / eave band
    const ridgeMat = M(0x5b4a30);             // dark straw ridge
    const frameMat = M(0x9c9a94);             // light grey window frame
    const mullMat  = M(0x6c6a63);             // darker leaded mullions
    const glassMat = new THREE.MeshLambertMaterial({color:0xdde8e6, emissive:0x2a3538});
    const ironMat  = M(0x2c2c30);

    /* ---- generic box helper --------------------------------------------- */
    function box(w,h,d,m,px,py,pz,parent){
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
      o.position.set(px,py,pz); o.castShadow=true; o.receiveShadow=true;
      (parent||g).add(o); return o;
    }
    // arched outline (rect body of height hRect capped by a semicircle), faces +Z
    function archShape(w,hRect){
      const r=w/2, s=new THREE.Shape();
      s.moveTo(-r,0); s.lineTo(-r,hRect);
      s.absarc(0,hRect,r,Math.PI,0,true);
      s.lineTo(r,0); s.lineTo(-r,0);
      return s;
    }

    /* ---- HIPPED THATCH ROOF over a rectangular block --------------------- */
    // Builds a true hip roof (2 trapezoid slopes + 2 triangular ends meeting at
    // a ridge), eave at local y=0, centred on the block, ridge along the long axis.
    function slopeGeo(pts){
      const p=pts.map(a=>new THREE.Vector3(a[0],a[1],a[2]));
      const geo=new THREE.BufferGeometry(), pos=[], uv=[];
      const o=p[0];
      const eave=p[1].clone().sub(p[0]).normalize();
      const upRaw=p[p.length-1].clone().sub(p[0]);
      const up=upRaw.clone().sub(eave.clone().multiplyScalar(upRaw.dot(eave))).normalize();
      const uS=1/1.3, vS=1/0.95;              // straw-course density
      const push=(v)=>{ pos.push(v.x,v.y,v.z); const d=v.clone().sub(o); uv.push(d.dot(eave)*uS, d.dot(up)*vS); };
      if(p.length===4){ push(p[0]);push(p[1]);push(p[2]); push(p[0]);push(p[2]);push(p[3]); }
      else            { push(p[0]);push(p[1]);push(p[2]); }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
      geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,2));
      geo.computeVertexNormals();
      return geo;
    }
    function hipRoof(w,d,wallY,rise){
      const holder=new THREE.Group();
      const oh=0.55;                          // eave overhang past the walls
      const W=w+oh, D=d+oh;
      const alongX = W>=D;
      const hL=Math.max(W,D)/2, hS=Math.min(W,D)/2;
      const rL=Math.max(0.05, hL-hS);         // ridge half-length (45deg hips)
      // vertices in the ridge-along-X frame
      const E0=[-hL,0,-hS], E1=[hL,0,-hS], E2=[hL,0,hS], E3=[-hL,0,hS];
      const R0=[-rL,rise,0], R1=[rL,rise,0];
      const faces=[ [E3,E2,R1,R0], [E1,E0,R0,R1], [E2,E1,R1], [E0,E3,R0] ];
      for(const f of faces){
        const m=new THREE.Mesh(slopeGeo(f), roofMat);
        m.castShadow=true; m.receiveShadow=true; holder.add(m);
      }
      // ridge cap + eave-line straw trim
      const rc=new THREE.Mesh(new THREE.BoxGeometry(2*rL+0.3,0.22,0.34), ridgeMat);
      rc.position.y=rise; rc.castShadow=true; holder.add(rc);
      if(!alongX) holder.rotation.y=Math.PI/2;
      holder.position.y=wallY;
      return holder;
    }

    /* ---- one white-plaster BLOCK: solid walls + brown quoins + eave band -- */
    // returns {front:z-of-+Z-face, top:wallY, right:x-of-+X-face} for placing openings
    function block(cx,cz,w,h,d){
      box(w,h,d, wallMat, cx, h/2, cz);                       // solid plaster mass
      // brown timber corner posts (quoins) at the four vertical arrises
      for(const sx of [-1,1]) for(const sz of [-1,1])
        box(0.26,h,0.26, trimMat, cx+sx*(w/2-0.02), h/2, cz+sz*(d/2-0.02));
      // brown eave band / fascia running the wall-head (the ref's dark trim line)
      box(w+0.30,0.22,d+0.30, trimMat, cx, h-0.06, cz);
      // hipped thatch roof
      const r=hipRoof(w,d,h, Math.min(w,d)*0.50);
      r.position.x+=cx; r.position.z+=cz; roofG.add(r);
      return {cx,cz,w,h,d, front:cz+d/2, right:cx+w/2, back:cz-d/2, left:cx-w/2};
    }

    /* ---- multi-pane LEADED window (grey frame, faces +Z) ----------------- */
    const winW=1.5, winH=1.45, cols=4, rows=3;
    const glassGeo=new THREE.BoxGeometry(winW-0.14, winH-0.14, 0.05);
    const vMull=new THREE.BoxGeometry(0.05, winH-0.14, 0.06);
    const hMull=new THREE.BoxGeometry(winW-0.14, 0.05, 0.06);
    function makeWindow(){
      const gp=new THREE.Group();
      // grey outer frame (4 bars)
      const f=0.11;
      box(winW,f,0.10, frameMat, 0, winH/2-f/2, 0.03, gp);
      box(winW,f,0.10, frameMat, 0,-winH/2+f/2, 0.03, gp);
      box(f,winH,0.10, frameMat,-winW/2+f/2,0,0.03, gp);
      box(f,winH,0.10, frameMat, winW/2-f/2,0,0.03, gp);
      const glass=new THREE.Mesh(glassGeo, glassMat); glass.position.z=0.01; gp.add(glass);
      // leaded grid: vertical + horizontal mullions (thicker centre post)
      for(let c=1;c<cols;c++){
        const b=new THREE.Mesh(vMull, mullMat);
        b.position.set(-winW/2 + c*(winW/cols), 0, 0.06);
        if(c===cols/2) b.scale.x=1.8;
        gp.add(b);
      }
      for(let rI=1;rI<rows;rI++){
        const b=new THREE.Mesh(hMull, mullMat);
        b.position.set(0, -winH/2 + rI*(winH/rows), 0.06); gp.add(b);
      }
      return gp;
    }
    // place a window on a block's +Z front face (px,py in world/local, z=front)
    function frontWindow(px,py,zFace){
      const w=makeWindow(); w.position.set(px, py, zFace+0.04); g.add(w);
    }

    /* ---- brown arched plank DOOR (faces +Z) ------------------------------ */
    function frontDoor(px,zFace){
      const dg=new THREE.Group();
      const dW=1.4, dRect=2.0;
      // dark recess behind the leaf
      dg.add(new THREE.Mesh(new THREE.ShapeGeometry(archShape(dW+0.14,dRect+0.07)), M(0x241a12)));
      // arched plank leaf
      const leaf=new THREE.Mesh(new THREE.ShapeGeometry(archShape(dW,dRect)), woodMat);
      leaf.position.z=0.06; dg.add(leaf);
      // vertical plank seams
      for(let i=-2;i<=2;i++) box(0.05, dRect+dW*0.3, 0.05, M(0x4a381f), i*dW*0.2, (dRect+dW*0.3)/2, 0.12, dg);
      // iron cross-bands + latch
      for(const y of [0.55,1.55]) box(dW-0.05,0.09,0.05, ironMat, 0, y, 0.13, dg);
      box(0.12,0.12,0.08, ironMat, dW/2-0.22, 1.0, 0.15, dg);
      dg.position.set(px, 0, zFace+0.03); g.add(dg);
    }

    /* ======================================================================
     * COMPOSE the farmhouse: three staggered hip-roofed masses
     *   A  tall rear main block            (highest ridge)
     *   B  big front-right block           carries door + 2 stacked windows
     *   C  lower front-left wing           single ground-floor window
     * ==================================================================== */
    const A = block(-1.0, -1.0, 9.0, 7.4, 6.0);     // rear main mass, two storeys
    const B = block( 3.5,  3.0, 6.0, 7.0, 5.5);     // front-right block, projects toward +Z
    const C = block(-4.5,  2.5, 5.0, 4.8, 4.5);     // front-left wing, lower

    // B front face: door (left) + two stacked leaded windows (right)
    frontDoor  (1.9,           B.front);
    frontWindow(4.4, 2.35,     B.front);            // ground storey
    frontWindow(4.4, 5.15,     B.front);            // upper storey
    // C front face: single ground-floor window
    frontWindow(-4.5, 2.30,    C.front);
    // A front face upper window (visible in the notch above the left wing)
    frontWindow(0.4, 5.35,     A.front);

    /* ---- stone plinth / doorstep footprint ------------------------------- */
    const plMat=(typeof TEX!=='undefined' && TEX.stone)
        ? new THREE.MeshLambertMaterial({map:TEX.stone, color:0x9a958b})
        : M(0x8f8a80);
    box(15.5, 0.4, 11.5, plMat, -0.3, 0.14, 1.2);

    /* ---- register roof + colliders + place ------------------------------ */
    roofG.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roofG);
    if(typeof WORLD!=='undefined' && WORLD.roofs) WORLD.roofs.push({mesh:roofG, x, z});
    if(typeof addRectCollider==='function'){
      for(const b of [A,B,C]){
        const wx = x + b.cx*Math.cos(rot) + b.cz*Math.sin(rot);
        const wz = z - b.cx*Math.sin(rot) + b.cz*Math.cos(rot);
        addRectCollider(wx, wz, b.w/2+0.2, b.d/2+0.2);
      }
    }

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = {kind:'building', label:'Enter the <b>Farmhouse</b>'};
    return g;
  }

  window.makeRefBld3 = makeRefBld3;
  console.log('[ref_bld3] makeRefBld3 ready');
})();
