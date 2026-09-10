/* ============================================================================
 * ref_bld4.js  —  standalone stone CLOCK-MANOR exterior (global-script, THREE r128)
 * Recreated from Bible_References/Building_Exterior_Option4.jpg:
 *   a large, sprawling multi-tiered manor of coursed grey stone with golden
 *   THATCH hipped roofs stacked at several heights.  A tall 3-storey RIGHT WING
 *   carries a round CLOCK (white face, gold square frame, black hands) flanked
 *   by tall DIAMOND-LATTICE leaded windows; grid-pane windows sit on the lower
 *   storeys.  A dominant CENTRAL hipped roof shelters an open ground-floor PORCH
 *   (wooden posts + central dark DOORWAY).  A LEFT 2-storey WING wears a BELL +
 *   FLAG finial on its ridge and is reached by an external wooden STAIRCASE.
 *   Wooden perimeter FENCES ring the front yard.
 * Author ONE file only.  Exposes window.makeRefBld4(x,z,rot) -> THREE.Group.
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
      return new THREE.MeshLambertMaterial({map:t, color:tint||0x9a958b});
    }
    return M(tint||0x8f8a80);
  }
  // golden thatch roof (double-sided so no hipped face ever reads black)
  function thatchMat(){
    const src=(typeof TEX!=='undefined') ? (TEX.thatchRoof||TEX.thatch) : null;
    if(src){
      const t=src.clone(); t.needsUpdate=true;
      t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,1);
      return new THREE.MeshLambertMaterial({map:t, color:0xd8bd7c, side:THREE.DoubleSide});
    }
    return new THREE.MeshLambertMaterial({color:0xbf9d55, side:THREE.DoubleSide, flatShading:true});
  }
  function woodMatMake(tint){
    return (typeof TEX!=='undefined' && TEX.wood)
      ? new THREE.MeshLambertMaterial({map:TEX.wood, color:tint||0x6e5236})
      : M(tint||0x5b4733);
  }

  // ---- small canvas texture: diamond-lattice leaded glass -------------------
  function latticeTexture(){
    const c=document.createElement('canvas'); c.width=32; c.height=48;
    const x=c.getContext('2d');
    x.fillStyle='#e2eae7'; x.fillRect(0,0,32,48);          // pale glass
    x.strokeStyle='#3a3b33'; x.lineWidth=1.4;              // dark lead cames
    for(let d=-48; d<48; d+=8){                            // '/' diagonals
      x.beginPath(); x.moveTo(d,48); x.lineTo(d+48,0); x.stroke();
    }
    for(let d=-48; d<48; d+=8){                            // '\' diagonals
      x.beginPath(); x.moveTo(d,0); x.lineTo(d+48,48); x.stroke();
    }
    x.strokeStyle='#5b4733'; x.lineWidth=3; x.strokeRect(0,0,32,48);
    const t=new THREE.CanvasTexture(c);
    t.magFilter=THREE.NearestFilter; t.minFilter=THREE.LinearFilter;
    return t;
  }
  // ---- small canvas texture: rectangular grid-pane window -------------------
  function gridTexture(){
    const c=document.createElement('canvas'); c.width=32; c.height=32;
    const x=c.getContext('2d');
    x.fillStyle='#eef3ef'; x.fillRect(0,0,32,32);
    x.strokeStyle='#4a4638'; x.lineWidth=2;
    x.beginPath(); x.moveTo(16,0); x.lineTo(16,32); x.stroke();        // 1 mullion
    x.beginPath(); x.moveTo(0,11); x.lineTo(32,11); x.stroke();        // 2 transoms
    x.beginPath(); x.moveTo(0,21); x.lineTo(32,21); x.stroke();
    x.strokeStyle='#5b4733'; x.lineWidth=3; x.strokeRect(0,0,32,32);
    const t=new THREE.CanvasTexture(c);
    t.magFilter=THREE.NearestFilter; t.minFilter=THREE.LinearFilter;
    return t;
  }

  const S = 3.8;               // one storey (units)

  function makeRefBld4(x, z, rot){
    x=x||0; z=z||0; rot=rot||0;
    const g     = new THREE.Group();
    const roofG = new THREE.Group();        // grouped so the world roof-toggle reaches it

    /* ---- shared materials (one draw-state each) -------------------------- */
    const wallMat  = stoneMat(0x9a958b, 2, 2);
    const wallMat2 = stoneMat(0xa7a298, 2, 3);   // slightly lighter stone for wings
    const trimMat  = stoneMat(0xbdb8ae, 1, 1);   // dressed stone for frames / quoins
    const roofMat  = thatchMat();
    const woodMat  = woodMatMake(0x6e5236);
    const postMat  = woodMatMake(0x7a5c3c);
    const darkMat  = M(0x1c1a17);                // doorway / recess void
    const ironMat  = M(0x2f302b);
    const goldMat  = M(0xc7a94e);
    const bellMat  = M(0x8a7326);
    const flagMat  = M(0x9a3030);
    const glassLat = new THREE.MeshLambertMaterial({map:latticeTexture(), color:0xffffff, emissive:0x545a50});
    const glassGrd = new THREE.MeshLambertMaterial({map:gridTexture(),    color:0xffffff, emissive:0x60655a});
    const clockFaceMat = M(0xf2efe6);

    /* ---- helpers --------------------------------------------------------- */
    function box(w,h,d,m,px,py,pz){
      const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
      o.position.set(px,py,pz); o.castShadow=true; o.receiveShadow=true;
      return o;
    }
    // solid storey block of coursed stone
    function block(w,h,d, cx,cy,cz, m){ g.add(box(w,h,d, m||wallMat, cx,cy,cz)); }

    // HIPPED thatch roof (ridge runs along X).  Explicit vertices -> no
    // orientation ambiguity; DoubleSide material -> no winding worries.
    function hipRoof(w,d,h, cx,cyB,cz, ridgeFrac){
      const hw=w/2, hd=d/2, rh=hw*(ridgeFrac==null?0.5:ridgeFrac);
      const V=[
        -hw,0,-hd,   hw,0,-hd,   hw,0,hd,   -hw,0,hd,   // 0..3  eaves E1..E4
        -rh,h,0,     rh,h,0                              // 4,5   ridge R1,R2
      ];
      const idx=[
        3,2,5,  3,5,4,      // front (+Z) trapezoid
        1,0,4,  1,4,5,      // back  (-Z) trapezoid
        0,3,4,              // left  (-X) hip triangle
        2,1,5               // right (+X) hip triangle
      ];
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(V,3));
      const uv=[]; for(let i=0;i<V.length;i+=3){ uv.push(V[i]/2.6, V[i+2]/2.6); }
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
      geo.setIndex(idx); geo.computeVertexNormals();
      const m=new THREE.Mesh(geo, roofMat);
      m.position.set(cx,cyB,cz); m.castShadow=true; m.receiveShadow=true;
      roofG.add(m);
      // ridge cap board for a crisp golden ridge line
      roofG.add(box(2*rh+0.3, 0.24, 0.5, M(0x8c6b34), cx, cyB+h, cz));
    }

    // windows: pre-cached flat geometries reused across every opening
    const latGeo = new THREE.PlaneGeometry(1.1, 1.85);
    const grdGeo = new THREE.PlaneGeometry(1.15, 1.35);
    const latFrameGeo = new THREE.BoxGeometry(1.4, 2.15, 0.16);
    const grdFrameGeo = new THREE.BoxGeometry(1.45, 1.65, 0.16);
    // place a window flat on a +Z-facing wall at world-local (px,py,pz)
    function diamondWin(px,py,pz){
      const gp=new THREE.Group();
      const fr=new THREE.Mesh(latFrameGeo, trimMat); fr.castShadow=true; gp.add(fr);
      const gl=new THREE.Mesh(latGeo, glassLat); gl.position.z=0.10; gp.add(gl);
      gp.position.set(px,py,pz); g.add(gp);
    }
    function gridWin(px,py,pz){
      const gp=new THREE.Group();
      const fr=new THREE.Mesh(grdFrameGeo, trimMat); fr.castShadow=true; gp.add(fr);
      const gl=new THREE.Mesh(grdGeo, glassGrd); gl.position.z=0.10; gp.add(gl);
      gp.position.set(px,py,pz); g.add(gp);
    }
    // vertical timber post ground->top
    function post(px,pz,top){ g.add(box(0.28, top, 0.28, postMat, px, top/2, pz)); }
    // quoin strips up a vertical corner arris
    function quoins(px,pz,top){ g.add(box(0.34, top, 0.34, trimMat, px, top/2, pz)); }

    /* =====================================================================
     * CENTRAL HALL — open porch under the dominant hipped roof
     * ===================================================================*/
    const Cw=9, Cd=7, Cfz=Cd/2;                 // front face at z=+3.5
    block(Cw, S, Cd, 0, S/2, 0);                // ground stone hall
    // central DOORWAY on the front face
    g.add(box(2.3, 2.9, 0.3, darkMat, 0, 1.45, Cfz-0.02));      // void
    g.add(box(2.7, 0.32, 0.34, woodMat, 0, 2.95, Cfz+0.02));    // lintel
    for(const sx of [-1,1]) g.add(box(0.3,2.9,0.34, woodMat, sx*1.35, 1.45, Cfz+0.02)); // jambs
    // two plank door leaves, slightly ajar-looking
    for(const sx of [-1,1]) g.add(box(1.0,2.7,0.12, woodMat, sx*0.55, 1.35, Cfz+0.06));
    for(const y of [0.7,1.9]) g.add(box(2.1,0.1,0.06, ironMat, 0, y, Cfz+0.13));
    // grid windows flanking the door
    gridWin(-3.1, 2.0, Cfz+0.02); gridWin(3.1, 2.0, Cfz+0.02);
    // PORCH: dominant hipped roof overhangs the front on two timber posts
    const cRoofY=S;
    post(-3.9, Cfz+0.7, cRoofY); post(3.9, Cfz+0.7, cRoofY);
    g.add(box(8.4, 0.3, 0.3, postMat, 0, cRoofY-0.1, Cfz+0.7));   // porch beam
    hipRoof(10.6, 9.6, 4.7, 0, cRoofY, 0, 0.42);

    /* =====================================================================
     * RIGHT WING — tall 3-storey CLOCK tower
     * ===================================================================*/
    const Rw=6, Rd=7, Rcx=7.2, Rcz=-0.3, Rfz=Rcz+Rd/2;   // front at z=+3.2
    const Rh=3*S;                                          // 3 storeys tall
    block(Rw, Rh, Rd, Rcx, Rh/2, Rcz, wallMat2);
    // quoins up the two front corners
    quoins(Rcx-Rw/2+0.17, Rfz-0.17, Rh); quoins(Rcx+Rw/2-0.17, Rfz-0.17, Rh);
    // storey band string-courses (dressed stone)
    for(const by of [S, 2*S]) g.add(box(Rw+0.2, 0.26, Rd+0.2, trimMat, Rcx, by, Rcz));
    // storey 1: grid windows
    gridWin(Rcx-1.5, 2.0, Rfz+0.02); gridWin(Rcx+1.5, 2.0, Rfz+0.02);
    // storey 2: diamond-lattice windows
    diamondWin(Rcx-1.5, S+2.0, Rfz+0.02); diamondWin(Rcx+1.5, S+2.0, Rfz+0.02);
    // storey 3: CLOCK centred, flanked by diamond windows
    diamondWin(Rcx-2.0, 2*S+2.0, Rfz+0.02); diamondWin(Rcx+2.0, 2*S+2.0, Rfz+0.02);
    (function clock(){
      const cg=new THREE.Group();
      cg.add(box(1.9,1.9,0.18, goldMat, 0,0,0));                       // gold square frame
      const face=new THREE.Mesh(new THREE.CircleGeometry(0.72,22), clockFaceMat);
      face.position.z=0.11; cg.add(face);
      cg.add(box(0.09,0.52,0.05, ironMat, 0,0.14,0.17));               // minute hand
      const hh=box(0.10,0.36,0.05, ironMat, 0,0,0.17);
      hh.position.set(0.1,0.06,0.17); hh.rotation.z=-1.05; cg.add(hh); // hour hand
      cg.position.set(Rcx, 2*S+2.05, Rfz+0.03); g.add(cg);
    })();
    hipRoof(7.0, 8.0, 4.2, Rcx, Rh, Rcz, 0.4);            // highest roof

    /* =====================================================================
     * LEFT WING — 2-storey, BELL + FLAG finial, external STAIRCASE
     * ===================================================================*/
    const Lw=5.5, Ld=6, Lcx=-7.0, Lcz=-0.2, Lfz=Lcz+Ld/2;   // front at z=+2.8
    const Lh=2*S;
    block(Lw, Lh, Ld, Lcx, Lh/2, Lcz, wallMat2);
    g.add(box(Lw+0.2, 0.26, Ld+0.2, trimMat, Lcx, S, Lcz));  // storey band
    gridWin(Lcx-1.3, 2.0, Lfz+0.02); gridWin(Lcx+1.3, 2.0, Lfz+0.02);        // storey 1
    diamondWin(Lcx-1.3, S+2.0, Lfz+0.02); diamondWin(Lcx+1.3, S+2.0, Lfz+0.02); // storey 2
    hipRoof(6.4, 7.0, 3.8, Lcx, Lh, Lcz, 0.42);
    // BELL + FLAG finial on the left ridge
    (function bellFlag(){
      const ry=Lh+3.8;                                        // ridge apex height
      g.add(box(0.16, 1.6, 0.16, postMat, Lcx, ry+0.8, Lcz)); // mast
      const bell=new THREE.Mesh(new THREE.ConeGeometry(0.34,0.5,8), bellMat);
      bell.position.set(Lcx-0.55, ry+1.3, Lcz); bell.castShadow=true; g.add(bell);
      g.add(box(0.05,0.5,0.05, ironMat, Lcx-0.55+0.02, ry+1.35, Lcz)); // bell hanger
      const flag=box(0.9,0.5,0.04, flagMat, Lcx+0.5, ry+1.4, Lcz);
      g.add(flag);                                            // pennant flag
    })();
    // external wooden STAIRCASE up the -X face to a raised 2nd-storey door
    (function stairs(){
      const sx=Lcx-Lw/2-0.55;                                 // just outside left face
      const steps=9, rise=(S-0.2)/steps, run=0.5, z0=Lcz-2.4;
      for(let i=0;i<steps;i++){
        g.add(box(1.6, 0.34, run+0.1, postMat, sx, 0.17+i*rise, z0+i*run));
      }
      // landing + rail posts + door
      const lz=z0+steps*run;
      g.add(box(1.8,0.3,1.2, postMat, sx, S-0.2, lz));
      for(const dz of [z0, lz]) g.add(box(0.16, S, 0.16, postMat, sx-0.7, S/2, dz)); // outer rail posts
      g.add(box(0.12, 0.12, steps*run+1.0, postMat, sx-0.7, S+0.4, (z0+lz)/2));      // rail
      // door on the wing's -X face at the landing
      const dr=new THREE.Group();
      dr.add(box(1.3,2.4,0.2, darkMat, 0,0,0));
      dr.add(box(1.1,2.2,0.1, woodMat, 0,0,0.09));
      dr.position.set(Lcx-Lw/2+0.02, S+1.0, lz); dr.rotation.y=-Math.PI/2; g.add(dr);
    })();

    /* =====================================================================
     * GROUND SLAB + perimeter FENCES + a couple of corner buttress posts
     * ===================================================================*/
    g.add(box(24, 0.4, 15, stoneMat(0x8f8a80, 6, 4), -0.5, 0.16, -0.5)); // plinth/yard
    function fenceRun(xA,xB,zf){
      const n=Math.max(1, Math.round(Math.abs(xB-xA)/2));
      for(let i=0;i<=n;i++){ const px=xA+(xB-xA)*(i/n); g.add(box(0.2,1.15,0.2, postMat, px, 0.75, zf)); }
      for(const ry of [0.6,1.1]) g.add(box(Math.abs(xB-xA)+0.2, 0.11, 0.11, postMat, (xA+xB)/2, ry+0.15, zf));
    }
    fenceRun(-12.0, -3.2, 5.4);        // front fence, left of the entry gap
    fenceRun( 3.2, 12.0, 5.4);         // front fence, right of the entry gap
    // corner brace posts under the tall wing eaves (jettied look)
    post(Rcx-Rw/2+0.3, Rfz-0.3, Rh); post(Rcx+Rw/2-0.3, Rfz-0.3, Rh);

    /* ---- register roofs + colliders + place ------------------------------ */
    roofG.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    g.add(roofG);
    if(typeof WORLD!=='undefined' && WORLD.roofs) WORLD.roofs.push({mesh:roofG, x, z});

    if(typeof addRectCollider==='function'){
      const c=Math.cos(rot), s=Math.sin(rot);
      const coll=(lx,lz,hw,hd)=> addRectCollider(x+lx*c+lz*s, z-lx*s+lz*c, hw, hd);
      coll(0,    0,    5.0, 4.0);      // central hall
      coll(Rcx,  Rcz,  3.2, 3.7);      // right clock wing
      coll(Lcx,  Lcz,  3.0, 3.3);      // left wing
    }

    const baseY = (typeof gy==='function') ? gy(x,z) : 0;
    g.position.set(x, baseY, z);
    g.rotation.y = rot;
    g.userData = {kind:'bld4', label:'Enter the <b>Clock Manor</b>'};
    return g;
  }

  window.makeRefBld4 = makeRefBld4;
  console.log('[ref_bld4] makeRefBld4 ready');
})();
