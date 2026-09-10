// ref_bldint2.js — self-contained furnished room interior (OSRS flat-shaded low-poly).
// Recreates Bible_References/Building_Interior_Option2.jpg: an open (roofless) two-room house
// seen from overhead. LEFT room = red/cream checkerboard tile living space; RIGHT room = wood-plank
// bedroom. Faithfully models every prop from the reference: bookshelf, wall-mounted mounted head +
// hide/shield + hanging pelt + antler branch, rocking chair, grey bed w/ gold frame, wooden chair,
// standing clothes-rack, pet on a mat, potted plant, two blue urns, wall lantern (flicker), plus the
// bedroom's large wooden bed, dresser/cabinet, and a grey stone spiral staircase. Yellow-framed
// windows in the low plaster walls; interior divider wall with a doorway. Roof-off interior.
// Global-script (THREE r128). Exposes window.makeRefBldInt2(x,z,rot) -> THREE.Group. 1 unit = 1 tile.
(function(){
'use strict';
if(typeof THREE==='undefined'){ console.warn('[ref_bldint2] THREE missing'); return; }

// ---- Material guard: reuse game mat()/TEX when present, else flat-shaded fallback ----------------
const M=(c)=> (typeof mat==='function') ? mat(c) : new THREE.MeshLambertMaterial({color:c, flatShading:true});
function texMat(which, color, rx, ry){
  const src=(typeof TEX!=='undefined' && TEX && TEX[which]) ? TEX[which] : null;
  if(src){ const T=src.clone(); T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||1, ry||1);
    return new THREE.MeshLambertMaterial({map:T, color:color||0xffffff, flatShading:true}); }
  return M(color||0x9a948a);
}

window.makeRefBldInt2=function(x,z,rot){
  x=x||0; z=z||0; rot=rot||0;
  const g=new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y=rot;

  const flames=[];   // collected flame materials for flicker

  // ---- helpers ----------------------------------------------------------------------------------
  function box(w,h,d,material,px,py,pz,shadow){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }
  function cyl(rt,rb,h,seg,material,px,py,pz,shadow){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }
  // Merge an array of {geo,mat-ignored} boxes described as [w,h,d,px,py,pz] into ONE mesh (one material).
  function mergedBoxes(specs, material, shadow){
    const U=THREE.BufferGeometryUtils, geos=[];
    for(const s of specs){
      const bg=new THREE.BoxGeometry(s[0],s[1],s[2]);
      bg.translate(s[3],s[4],s[5]); geos.push(bg);
    }
    if(U && U.mergeBufferGeometries){
      const merged=U.mergeBufferGeometries(geos,false);
      geos.forEach(b=>b.dispose&&b.dispose());
      const m=new THREE.Mesh(merged, material);
      if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
      g.add(m); return m;
    }
    // fallback: individual meshes
    const grp=new THREE.Group();
    for(const bg of geos){ const m=new THREE.Mesh(bg, material); if(shadow!==false){m.castShadow=true;m.receiveShadow=true;} grp.add(m); }
    g.add(grp); return grp;
  }
  function addFlame(px,py,pz,s){
    s=s||1;
    const fm=new THREE.MeshBasicMaterial({color:0xffcf5a});
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.07*s,0.2*s,6), fm);
    fl.position.set(px,py,pz); g.add(fl);
    flames.push({m:fl, base:py, mat:fm, ph:Math.random()*6.28});
    return fl;
  }

  // ---- Footprint --------------------------------------------------------------------------------
  // Main (living) room: X in [-7,1]. Bedroom: X in [1,7]. Depth Z in [-6,6]. Low plaster walls.
  const X0=-7, X1=7, Z0=-6, Z1=6;      // interior extents
  const DIV=1;                          // interior divider wall at X=DIV
  const H=2.6, WT=0.4;                  // wall height / thickness
  const plasterMat=texMat('plaster', 0xece3c8, (X1-X0)/3, 1.4);
  const capMat=M(0xd8cdaa);

  // ---- Floors -----------------------------------------------------------------------------------
  // Checkerboard living-room floor via a canvas texture (fewer meshes, crisp OSRS tiles).
  function checkerTex(){
    if(typeof document==='undefined') return null;
    const N=8, px=64, cv=document.createElement('canvas'); cv.width=cv.height=N*px;
    const cx=cv.getContext('2d');
    const a='#b96a5f', b='#d8d1b4';     // dusty red + pale cream
    for(let iy=0;iy<N;iy++) for(let ix=0;ix<N;ix++){
      cx.fillStyle=((ix+iy)&1)?a:b; cx.fillRect(ix*px,iy*px,px,px);
    }
    const t=new THREE.CanvasTexture(cv); t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
    t.repeat.set((DIV-X0)/2,(Z1-Z0)/2); t.needsUpdate=true; return t;
  }
  const chk=checkerTex();
  const livingMat = chk ? new THREE.MeshLambertMaterial({map:chk}) : M(0xc07064);
  const liveFloor=box((DIV-X0), 0.3, (Z1-Z0), livingMat, (X0+DIV)/2, -0.15, (Z0+Z1)/2, false);
  liveFloor.receiveShadow=true;
  // Bedroom wood-plank floor
  const bedFloorMat=texMat('wood', 0x6f533a, (X1-DIV)/2.5, (Z1-Z0)/2.5);
  const bedFloor=box((X1-DIV), 0.3, (Z1-Z0), bedFloorMat, (DIV+X1)/2, -0.14, (Z0+Z1)/2, false);
  bedFloor.receiveShadow=true;

  // ---- Walls (open top, no roof) ----------------------------------------------------------------
  function wallRun(px,pz,w,d){ box(w,H,d,plasterMat,px,H/2,pz,true); box(w+0.12,0.22,d+0.12,capMat,px,H+0.05,pz,false); }
  // outer walls with window/door gaps handled by segmenting
  // North wall (Z=Z0) — full width, single window notch handled visually by frames
  wallRun((X0+X1)/2, Z0-WT/2, (X1-X0)+WT*2, WT);
  // South wall (Z=Z1)
  wallRun((X0+X1)/2, Z1+WT/2, (X1-X0)+WT*2, WT);
  // West wall (X=X0)
  wallRun(X0-WT/2, (Z0+Z1)/2, WT, (Z1-Z0));
  // East wall (X=X1)
  wallRun(X1+WT/2, (Z0+Z1)/2, WT, (Z1-Z0));
  // Interior divider wall at X=DIV with a doorway near the south end (staircase side)
  const doorZ0=3.2, doorZ1=5.4;                 // doorway gap on divider
  wallRun(DIV, (Z0+doorZ0)/2, WT, (doorZ0-Z0));                 // north segment
  wallRun(DIV, (doorZ1+Z1)/2, WT, (Z1-doorZ1));                 // south stub

  // ---- Yellow-framed windows --------------------------------------------------------------------
  const winFrameMat=M(0xd9b24a);                // warm gold/yellow window frame
  const winGlassMat=new THREE.MeshPhongMaterial({color:0xbfe0e6, emissive:0x9fc4cc, emissiveIntensity:0.25,
    transparent:true, opacity:0.5, flatShading:true, shininess:8, side:THREE.DoubleSide});
  // side: 'W'|'E'|'N'|'S'; along = coordinate along the wall
  function window2(side, along){
    const y=1.5, ww=1.2, wh=1.4;
    let px,pz,geoW,geoD;
    if(side==='W'){ px=X0-WT/2; pz=along; geoW=0.14; geoD=ww; }
    else if(side==='E'){ px=X1+WT/2; pz=along; geoW=0.14; geoD=ww; }
    else if(side==='N'){ px=along; pz=Z0-WT/2; geoW=ww; geoD=0.14; }
    else { px=along; pz=Z1+WT/2; geoW=ww; geoD=0.14; }
    // frame (slightly proud of wall) + glass + cross mullions
    box(geoW+0.06, wh+0.12, geoD+0.12, winFrameMat, px, y, pz, false);
    box(geoW+0.02, wh, geoD, winGlassMat, px, y, pz, false);
    const mv=(side==='W'||side==='E');
    box(mv?geoW+0.03:0.06, wh, mv?0.06:geoD, winFrameMat, px, y, pz, false);         // vertical bar
    box(mv?geoW+0.03:geoW, 0.06, mv?geoD:0.06, winFrameMat, px, y, pz, false);       // horizontal bar
  }
  window2('W',-2.5); window2('W',0.6); window2('W',3.6);       // 3 tall windows, west living-room wall
  window2('N',-3.6);                                            // north living-room window
  window2('S',-3.4);                                            // south living-room window
  window2('E',-1.0); window2('E',2.6);                          // 2 bedroom windows, east wall

  // ================================ LIVING ROOM PROPS ============================================
  const woodMat=M(0x6e4a2a), woodDark=M(0x543720), woodLite=M(0x8a6236);

  // 1) Bookshelf against north wall (top-left) — frame + shelves + rows of coloured books.
  (function bookshelf(){
    const bx=-5.4, bz=Z0+0.55, w=2.0, h=2.0, d=0.55;
    mergedBoxes([
      [w,h,0.1,0,h/2,-d/2+0.05],          // back
      [0.12,h,d,-w/2+0.06,h/2,0],         // left side
      [0.12,h,d, w/2-0.06,h/2,0],         // right side
      [w,0.1,d,0,h-0.05,0],               // top
      [w,0.1,d,0,0.05,0],                 // bottom
      [w,0.08,d,0,h*0.66,0],              // shelf
      [w,0.08,d,0,h*0.34,0],              // shelf
    ], woodMat, true).position.set(bx,0,bz);
    // book rows (three shelves), merged per colour
    const cols=[0x8a3b2e,0x2f5d8a,0x3f7a45,0xb2913f,0x5a3f78];
    const rowY=[0.5,1.18,1.86];
    cols.forEach((c,ci)=>{
      const specs=[];
      rowY.forEach(ry=>{ for(let i=0;i<4;i++){ if((i+ci)%cols.length<3){ const bw=0.12+((i*7+ci)%3)*0.03;
        specs.push([bw,0.34+((i)%2)*0.06,0.3, -0.7+i*0.42+ (ci%2)*0.02, ry+0.17, 0]); } } });
      if(specs.length) mergedBoxes(specs, M(c), true).position.set(bx,0,bz);
    });
  })();

  // 2) Wall-mounted MOUNTED HEAD (deer/trophy) on north wall.
  (function mountedHead(){
    const hx=-2.7, hy=1.85, hz=Z0+0.28;
    box(0.6,0.5,0.12, M(0x5a3f2a), hx, hy, hz, false);                     // wooden plaque
    cyl(0.16,0.2,0.28,7, M(0x8a6a44), hx, hy+0.02, hz+0.18, false);        // muzzle/head
    // antlers
    for(const s of [-1,1]){ cyl(0.03,0.03,0.3,5, M(0xd8c79c), hx+s*0.12, hy+0.32, hz+0.16, false).rotation.z=s*0.5;
      cyl(0.025,0.025,0.18,5, M(0xd8c79c), hx+s*0.22, hy+0.46, hz+0.16, false).rotation.z=s*0.9; }
  })();

  // 3) Wall-mounted HIDE / SHIELD on north wall.
  (function hide(){
    const hx=-1.35, hz=Z0+0.26;
    box(0.55,0.7,0.08, M(0x8a6a3e), hx,1.85,hz, false);                    // stretched hide
    box(0.34,0.5,0.1, M(0x6a4c26), hx,1.85,hz+0.04, false);                // darker inner
  })();

  // 4) Hanging PELT / fur on north wall.
  (function pelt(){
    const hx=-0.25, hz=Z0+0.24;
    box(0.4,0.85,0.09, M(0x3a2c20), hx,1.75,hz, false);
    box(0.24,0.55,0.11, M(0x574235), hx,1.72,hz+0.03, false);
  })();

  // 5) Antler / dead branch decoration high on divider wall (north end).
  (function branch(){
    const bx=DIV-0.28, by=1.9, bz=-3.6;
    const b=cyl(0.05,0.07,1.1,6, M(0x6b4a2c), bx,by,bz, false); b.rotation.x=Math.PI/2; b.rotation.z=0.4;
    cyl(0.03,0.03,0.4,5, M(0x6b4a2c), bx-0.05,by+0.35,bz-0.35, false).rotation.set(1.2,0,0.7);
    cyl(0.03,0.03,0.35,5, M(0x6b4a2c), bx-0.02,by-0.2,bz+0.3, false).rotation.set(1.0,0,-0.6);
  })();

  // 6) Rocking chair (upper-left) — seat, curved back spindles, curved rockers.
  (function rockingChair(){
    const rx=-5.3, rz=-2.4;
    box(0.7,0.1,0.7, woodLite, rx,0.55,rz, true);                          // seat
    mergedBoxes([                                                          // back spindles + top rail
      [0.06,0.7,0.06,-0.28,0.9,-0.3],[0.06,0.7,0.06,0,0.9,-0.3],[0.06,0.7,0.06,0.28,0.9,-0.3],
      [0.72,0.08,0.1,0,1.25,-0.3],
    ], woodDark, true).position.set(rx,0,rz);
    for(const sx of [-1,1]){ box(0.06,0.5,0.06, woodDark, rx+sx*0.3,0.28,rz+0.3, true); }   // front legs
    // curved rockers (two arcs approximated by tilted planks)
    for(const sx of [-1,1]){ const rk=box(0.06,0.06,0.95, woodDark, rx+sx*0.3,0.06,rz, true); rk.rotation.x=0.0; }
  })();

  // 7) Bed against west wall — grey mattress + pillow on a warm gold frame.
  (function bed(){
    const bx=-6.1, bz=-0.6, w=1.4, len=3.0;                                // head to south
    box(w+0.2,0.4,len+0.2, woodLite, bx,0.3,bz, true);                     // gold wood frame
    box(w,0.22,len, M(0x8f939a), bx,0.55,bz, true);                        // grey mattress
    box(w-0.1,0.16,0.5, M(0xe6e2d6), bx,0.66,bz-len/2+0.35, true);         // pillow
    box(w,0.16,len*0.55, M(0x7c8087), bx,0.64,bz+len*0.12, true);          // grey blanket
    box(0.16,0.9,0.16, woodLite, bx-w/2,0.45,bz-len/2, true);              // headboard posts
    box(0.16,0.9,0.16, woodLite, bx+w/2,0.45,bz-len/2, true);
    box(w+0.2,0.7,0.14, woodLite, bx,0.5,bz-len/2, true);                  // headboard
  })();

  // 8) Wooden dining chair (mid living room), facing a bit.
  (function chair(){
    const cx=-3.9, cz=0.2;
    box(0.6,0.1,0.6, woodMat, cx,0.55,cz, true);
    box(0.6,0.7,0.1, woodDark, cx,0.9,cz-0.25, true);                      // back
    mergedBoxes([[0.08,0.55,0.08,-0.24,0.28,-0.24],[0.08,0.55,0.08,0.24,0.28,-0.24],
                 [0.08,0.55,0.08,-0.24,0.28,0.24],[0.08,0.55,0.08,0.24,0.28,0.24]], woodDark, true).position.set(cx,0,cz);
  })();

  // 9) Standing clothes-rack / rag stand (the cross-shaped item, centre).
  (function rack(){
    const rx=-1.0, rz=-3.4;
    box(0.5,0.1,0.5, woodDark, rx,0.05,rz, true);                          // base
    cyl(0.06,0.07,1.6,6, woodMat, rx,0.85,rz, true);                       // post
    box(0.9,0.08,0.08, woodMat, rx,1.5,rz, true);                          // cross-arm
    box(0.3,0.5,0.06, M(0xcfd3c0), rx-0.28,1.2,rz, false);                 // hanging cloth
    box(0.3,0.4,0.06, M(0xb0673f), rx+0.28,1.25,rz, false);                // hanging cloth 2
  })();

  // 10) Pet (grey dog/cat) resting on a small mat, centre-right of living room.
  (function pet(){
    const px=-1.4, pz=1.6;
    box(1.0,0.05,0.7, M(0x86502f), px,0.03,pz, false);                     // mat
    box(0.5,0.24,0.28, M(0x9a9a9e), px,0.2,pz, true);                      // body
    box(0.22,0.22,0.2, M(0xa4a4a8), px+0.32,0.28,pz, true);                // head
    box(0.06,0.1,0.06, M(0xa4a4a8), px+0.45,0.36,pz-0.06, true);           // ear
    box(0.06,0.1,0.06, M(0xa4a4a8), px+0.45,0.36,pz+0.06, true);
    box(0.34,0.06,0.06, M(0x8a8a8e), px-0.3,0.16,pz, true);                // tail
  })();

  // 11) Potted plant (bottom-left corner) — spiky green aloe in a pot.
  (function plant(){
    const px=X0+0.8, pz=Z1-1.0;
    cyl(0.28,0.22,0.35,8, M(0x9c5a3a), px,0.18,pz, true);                  // pot
    const leaf=M(0x4f7a3a);
    for(let i=0;i<7;i++){ const a=i/7*Math.PI*2; const bl=box(0.1,0.55,0.1, leaf, px+Math.cos(a)*0.12,0.55,pz+Math.sin(a)*0.12, true);
      bl.rotation.set(Math.sin(a)*0.5, a, Math.cos(a)*0.5); }
  })();

  // 12) Two blue urns/barrels (bottom-centre living room).
  (function urns(){
    const uy=0.4;
    for(const ux of [-4.0,-2.9]){
      cyl(0.34,0.28,0.8,10, M(0x2f5aa0), ux,uy,Z1-0.9, true);              // body
      cyl(0.2,0.28,0.18,10, M(0x274c88), ux,0.82,Z1-0.9, true);           // neck/rim
      cyl(0.24,0.24,0.06,10, M(0x1f3f70), ux,0.9,Z1-0.9, false);          // lip
    }
  })();

  // 13) Wall lantern (warm lived-in glow) on the west wall — exercises flame flicker.
  (function lantern(){
    const lx=X0+0.25, ly=1.9, lz=2.0;
    box(0.16,0.28,0.16, M(0x3a2c1e), lx,ly,lz, false);                    // casing
    box(0.1,0.18,0.1, new THREE.MeshPhongMaterial({color:0xffdf8a,emissive:0xffcf5a,emissiveIntensity:0.6,flatShading:true}), lx,ly,lz, false);
    addFlame(lx,ly+0.02,lz,0.8);
  })();

  // ================================ BEDROOM PROPS (right, wood floor) ============================

  // 14) Large wooden bed (dominates bedroom).
  (function bigBed(){
    const bx=4.3, bz=0.8, w=3.0, len=4.2;
    box(w+0.3,0.45,len+0.3, M(0x5a3d24), bx,0.32,bz, true);                // heavy frame
    box(w,0.28,len, M(0x7a5636), bx,0.62,bz, true);                        // mattress base (brown)
    box(w,0.14,len*0.5, M(0x6a4a2c), bx,0.78,bz+len*0.18, true);           // folded quilt
    box(w-0.2,0.18,0.7, M(0xe4dcc8), bx,0.8,bz-len/2+0.5, true);           // pillows
    for(const sx of [-1,1]) box(0.22,1.0,0.22, M(0x4c3320), bx+sx*w/2,0.5,bz-len/2, true);  // headboard posts
    box(w+0.3,0.8,0.18, M(0x543a22), bx,0.62,bz-len/2, true);              // headboard
    for(const sx of [-1,1]) box(0.22,0.7,0.22, M(0x4c3320), bx+sx*w/2,0.35,bz+len/2, true); // foot posts
  })();

  // 15) Dresser / cabinet against north wall of bedroom.
  (function dresser(){
    const dx=4.0, dz=Z0+0.5;
    box(2.2,1.0,0.7, M(0x6a4a2c), dx,0.5,dz, true);                        // body
    box(2.3,0.12,0.8, M(0x543720), dx,1.02,dz, true);                      // top
    for(const c of [-0.55,0.55]){ box(0.9,0.36,0.06, M(0x8a6236), dx+c,0.62,dz+0.35, false);   // drawers
      box(0.9,0.36,0.06, M(0x8a6236), dx+c,0.24,dz+0.35, false);
      box(0.12,0.06,0.06, M(0xd9b24a), dx+c,0.62,dz+0.4, false);           // handles
      box(0.12,0.06,0.06, M(0xd9b24a), dx+c,0.24,dz+0.4, false); }
  })();

  // 16) Grey stone spiral staircase (bedroom SW, by the divider doorway).
  (function stairs(){
    const sx=2.1, sz=4.5, cx=sx, cz=sz;
    const stoneStep=texMat('stone', 0x9a948a, 1, 1);
    cyl(0.18,0.18,1.6,8, stoneStep, cx,0.8,cz, true);                      // central newel
    const N=8, R=0.95;
    for(let i=0;i<N;i++){ const a=i/N*Math.PI*1.9; const y=0.16+i*0.18;
      const st=new THREE.Mesh(new THREE.BoxGeometry(R,0.14,0.5), stoneStep);
      st.position.set(cx+Math.cos(a)*R/2, y, cz+Math.sin(a)*R/2);
      st.rotation.y=-a; st.castShadow=true; st.receiveShadow=true; g.add(st);
    }
    // dark stairwell hole hint under the well
    box(1.9,0.06,1.9, M(0x2a2622), cx,0.02,cz, false);
  })();

  // ---- Flame flicker (self-driven, lightweight) -------------------------------------------------
  if(flames.length && typeof requestAnimationFrame!=='undefined'){
    const t0=(typeof performance!=='undefined'?performance.now():Date.now());
    (function tick(){
      const t=((typeof performance!=='undefined'?performance.now():Date.now())-t0)/1000;
      for(const f of flames){ const s=0.85+Math.sin(t*9+f.ph)*0.15+Math.sin(t*17+f.ph)*0.07;
        f.m.scale.set(1,s,1); f.m.position.y=f.base+(s-1)*0.06;
        f.mat.color.setRGB(1,0.78+0.12*Math.sin(t*13+f.ph),0.28); }
      if(g.parent!==null || flames.length) requestAnimationFrame(tick);
    })();
  }

  return g;
};

console.log('[ref_bldint2] makeRefBldInt2 ready');
})();
