// ref_bldint1.js — self-contained furnished building interior (OSRS flat-shaded low-poly).
// Recreates Bible_References/Building_Interior_Option1.jpg: an open (roofless) multi-room
// house read from overhead — black/white CHECKERBOARD tile floor, low grey stone-brick walls
// with small wooden windows, and a full set of lived-in props:
//   Kitchen  : iron RANGE/STOVE (glowing red fire), CAULDRON pot on a rack (smoke),
//              WORKBENCH with loaves, wooden DRESSER/CUPBOARD stacked with pottery, chairs.
//   Scullery : stone SINK with water, wooden BARREL + pottery.
//   Dining   : long dining TABLE, four CHAIRS, lit CANDLE, potted PLANT, gold-framed
//              wall PICTURE, closed wooden DOOR.
// Global-script (THREE r128). Exposes window.makeRefBldInt1(x,z,rot) -> THREE.Group.
(function(){
'use strict';
if(typeof THREE==='undefined'){ console.warn('[ref_bldint1] THREE missing'); return; }

// Material guard — reuse the game's mat() when present, else flat-shaded fallback.
const M=(c)=> (typeof mat==='function') ? mat(c) : new THREE.MeshLambertMaterial({color:c, flatShading:true});
function texMat(kind, color, rx, ry){
  const T=(typeof TEX!=='undefined' && TEX && TEX[kind]) ? TEX[kind].clone() : null;
  if(T){ T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||2, ry||2);
    return new THREE.MeshLambertMaterial({map:T, color:color||0xffffff, flatShading:true}); }
  return M(color||0x9a948a);
}

window.makeRefBldInt1=function(x,z,rot){
  x=x||0; z=z||0; rot=rot||0;
  const g=new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y=rot;

  // ---- shared palette -------------------------------------------------------
  const wallMat  = texMat('stone', 0x9b968c, 2, 1.4);   // grey stone brick
  const capMat   = M(0x7f7a70);                          // wall-top trim
  const tileWhite= M(0xdad6c8);                          // light floor tile
  const tileDark = M(0x37373b);                          // dark  floor tile
  const wood     = M(0x6e4a2a);
  const woodDark = M(0x543718);
  const woodLite = M(0x8a6236);
  const iron     = M(0x2c2c30);
  const brass    = M(0xc9a24a);
  const cream    = M(0xece3cf);
  const terra    = M(0xb35f38);
  const water    = M(0x3f83ad);
  const leaf     = M(0x3f7a34);
  const smokeMat = new THREE.MeshLambertMaterial({color:0x8f8f8f, transparent:true, opacity:0.45, flatShading:true});

  // ---- flame registry (self-contained gentle flicker) -----------------------
  const flames=[];  // {mesh?, mat?, ph}
  const emberMat=()=> new THREE.MeshPhongMaterial({color:0xff8a2e, emissive:0xff5a12, emissiveIntensity:1.0, flatShading:true, shininess:0});
  const coreMat =()=> new THREE.MeshBasicMaterial({color:0xffe07a});

  // ---- primitive helpers ----------------------------------------------------
  function box(w,h,d,m,px,py,pz,shadow){
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
    b.position.set(px,py,pz);
    if(shadow!==false){ b.castShadow=true; b.receiveShadow=true; }
    g.add(b); return b;
  }
  function cyl(rt,rb,h,m,px,py,pz,seg,shadow){
    const c=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8), m);
    c.position.set(px,py,pz);
    if(shadow!==false){ c.castShadow=true; c.receiveShadow=true; }
    g.add(c); return c;
  }
  // a small two-cone flame at (px,py,pz); registers for flicker
  function flame(px,py,pz,s){
    s=s||1;
    const f=new THREE.Group();
    const outer=new THREE.Mesh(new THREE.ConeGeometry(0.11*s,0.34*s,6), emberMat());
    outer.position.y=0.17*s; f.add(outer);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(0.06*s,0.2*s,6), coreMat());
    inner.position.y=0.13*s; f.add(inner);
    f.position.set(px,py,pz); g.add(f);
    flames.push({mesh:f, mat:outer.material, ph:Math.random()*6.283});
    return f;
  }

  // ---- FLOOR PLAN ----------------------------------------------------------
  // Tile grid (1 unit = 1 tile). Two wings that adjoin -> an L / cross footprint.
  //   Left wing  : kitchen (front) + scullery (back)
  //   Right wing : dining room
  const inSet=new Set(), tiles=[];
  function addRect(x0,x1,z0,z1){
    for(let ix=x0;ix<=x1;ix++) for(let iz=z0;iz<=z1;iz++){
      const k=ix+','+iz; if(!inSet.has(k)){ inSet.add(k); tiles.push([ix,iz]); }
    }
  }
  addRect(-9,-2,-6, 3);   // left wing  (kitchen z:-6..-1, scullery z:0..3)
  addRect(-1, 8,-2, 5);   // right wing (dining)
  const has=(ix,iz)=> inSet.has(ix+','+iz);

  // checkerboard floor tiles
  for(let i=0;i<tiles.length;i++){
    const ix=tiles[i][0], iz=tiles[i][1];
    const t=box(1,0.2,1, ((ix+iz)&1)?tileWhite:tileDark, ix,-0.1,iz, false);
    t.receiveShadow=true; t.castShadow=false;
  }

  // ---- WALLS (roofless) -----------------------------------------------------
  const WT=0.4, H=2.7;
  const doorSkip=new Set(['8,2,E']);   // east doorway of the dining room (wooden door leaf placed there)
  function edge(ix,iz,dir){
    let px=ix,pz=iz,ax;
    if(dir==='N'){ pz=iz-0.5; ax='x'; }
    else if(dir==='S'){ pz=iz+0.5; ax='x'; }
    else if(dir==='E'){ px=ix+0.5; ax='z'; }
    else { px=ix-0.5; ax='z'; }
    return {px,pz,ax};
  }
  function wallSeg(px,pz,ax){
    const w = ax==='x' ? 1+WT : WT;
    const d = ax==='x' ? WT   : 1+WT;
    box(w,H,d, wallMat, px, H/2, pz, true);
    box(w+0.12,0.22,d+0.12, capMat, px, H+0.05, pz, false);   // top trim
  }
  const N=[[0,-1,'N'],[0,1,'S'],[1,0,'E'],[-1,0,'W']];
  for(let i=0;i<tiles.length;i++){
    const ix=tiles[i][0], iz=tiles[i][1];
    for(let d=0;d<4;d++){
      const nx=ix+N[d][0], nz=iz+N[d][1], dir=N[d][2];
      if(!has(nx,nz)){
        if(doorSkip.has(ix+','+iz+','+dir)) continue;
        const e=edge(ix,iz,dir); wallSeg(e.px,e.pz,e.ax);
      }
    }
  }
  // interior partitions (manual, with doorway gaps)
  // kitchen | scullery  along z=-0.5, gap around x=-3
  box(6.0,H,WT, wallMat, -6.5,H/2,-0.5, true); box(6.12,0.22,WT+0.12,capMat,-6.5,H+0.05,-0.5,false);
  box(1.0,H,WT, wallMat, -2.0,H/2,-0.5, true); box(1.12,0.22,WT+0.12,capMat,-2.0,H+0.05,-0.5,false);
  // left wing | dining  along x=-1.5, gap around z=0..1
  box(WT,H,2.0, wallMat, -1.5,H/2,-1.5, true); box(WT+0.12,0.22,2.12,capMat,-1.5,H+0.05,-1.5,false);
  box(WT,H,2.0, wallMat, -1.5,H/2, 2.5, true); box(WT+0.12,0.22,2.12,capMat,-1.5,H+0.05, 2.5,false);

  // ---- WINDOWS (wooden frame + pale pane + yellow sill on the inner face) ----
  function windowOn(ix,iz,dir){
    const e=edge(ix,iz,dir);
    const inx=Math.sign(ix-e.px), inz=Math.sign(iz-e.pz);   // inward direction
    const px=e.px+inx*(WT/2+0.03), pz=e.pz+inz*(WT/2+0.03);
    const ax=e.ax; // 'x' => spans X, thin in Z
    const lw = ax==='x'?0.8:0.14, ld = ax==='x'?0.14:0.8;
    box(lw,0.72,ld, woodDark, px,1.42,pz, false);                 // frame
    const pw = ax==='x'?0.6:0.06, pd = ax==='x'?0.06:0.6;
    box(pw,0.54,pd, M(0xbcd6e6), px+inx*0.02,1.44,pz+inz*0.02, false); // glass pane
    box(lw+0.06,0.1,ld+0.06, brass, px,1.03,pz, false);          // yellow sill
  }
  [[-6,-6,'N'],[-4,-6,'N'],[-9,-4,'W'],[-9,1,'W'],[-9,3,'S'],
   [3,-2,'N'],[6,-2,'N'],[2,5,'S'],[5,5,'S'],[8,4,'E']
  ].forEach(w=>windowOn(w[0],w[1],w[2]));

  // ===========================================================================
  // FURNITURE
  // ===========================================================================
  // -- reusable chair (faces +Z at ry=0) --
  function chair(px,pz,ry){
    const s=new THREE.Group();
    const a=(w,h,d,m,cx,cy,cz)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(cx,cy,cz); b.castShadow=true; b.receiveShadow=true; s.add(b); };
    a(0.5,0.09,0.5, wood, 0,0.42,0);          // seat
    a(0.5,0.52,0.08, woodDark, 0,0.68,-0.21); // back
    for(const lx of [-0.19,0.19]) for(const lz of [-0.19,0.19]) a(0.07,0.42,0.07, woodDark, lx,0.21,lz);
    s.position.set(px,0,pz); s.rotation.y=ry||0; g.add(s);
  }
  // -- reusable table --
  function table(px,pz,w,d,h){
    h=h||0.72;
    box(w,0.12,d, woodLite, px,h,pz, true);
    for(const lx of [-w/2+0.2,w/2-0.2]) for(const lz of [-d/2+0.2,d/2-0.2])
      box(0.12,h-0.06,0.12, woodDark, px+lx,(h-0.06)/2,pz+lz, true);
  }
  // -- pottery cluster --
  function pottery(px,py,pz){
    cyl(0.13,0.1,0.14, cream, px-0.16,py+0.07,pz, 8);
    cyl(0.11,0.14,0.16, terra, px+0.14,py+0.08,pz+0.04, 8);
    cyl(0.09,0.09,0.12, M(0x6f8f6a), px,py+0.06,pz-0.16, 7);
  }

  // ---- KITCHEN (X:-9..-2, Z:-6..-1) ----------------------------------------
  // Range / stove in the back-left corner, with glowing fire + hood + chimney
  (function stove(){
    const sx=-8.1, sz=-5.0;
    box(1.5,1.2,1.0, iron, sx,0.6,sz, true);                 // body
    box(1.5,0.14,1.0, M(0x3a3a40), sx,1.27,sz, true);        // cook top
    // firebox opening (glowing)
    const glow=new THREE.MeshPhongMaterial({color:0xff5a12, emissive:0xff4d0a, emissiveIntensity:1.0, flatShading:true, shininess:0});
    box(1.0,0.5,0.06, glow, sx,0.55,sz+0.5, false);
    flames.push({mat:glow, ph:Math.random()*6.283});
    flame(sx-0.3,0.75,sz+0.48,0.7); flame(sx+0.3,0.75,sz+0.48,0.7);
    // hood + chimney going up
    box(1.2,0.5,0.9, M(0x3a3a40), sx,1.7,sz-0.05, true);
    box(0.55,1.0,0.55, iron, sx,2.45,sz-0.05, true);
    // smoke wisps
    box(0.4,0.4,0.4, smokeMat, sx,2.9,sz-0.05, false);
  })();
  // Cauldron on an iron rack, with rising smoke
  (function cauldron(){
    const cx=-4.6, cz=-4.2;
    for(let k=0;k<3;k++){ const a=k/3*Math.PI*2; cyl(0.04,0.04,0.5, iron, cx+Math.sin(a)*0.28,0.25,cz+Math.cos(a)*0.28,5); }
    cyl(0.42,0.34,0.5, iron, cx,0.7,cz, 10);                 // pot body
    cyl(0.44,0.44,0.08, M(0x1f1f22), cx,0.98,cz, 10);        // rim
    const glow=new THREE.MeshPhongMaterial({color:0xff6a1a, emissive:0xff5a10, emissiveIntensity:0.9, flatShading:true});
    cyl(0.3,0.3,0.05, glow, cx,0.55,cz, 10); flames.push({mat:glow, ph:Math.random()*6.283});
    for(let s=0;s<3;s++){ const b=box(0.34-0.05*s,0.34-0.05*s,0.34-0.05*s, smokeMat, cx,1.25+s*0.32,cz+0.02*s, false); }
  })();
  // Workbench with loaves along the back wall
  (function bench(){
    table(-6.4,-5.35,2.0,0.8,0.75);
    for(const bx of [-0.5,0,0.5]) box(0.34,0.2,0.5, M(0xc98d4e), -6.4+bx,0.9,-5.35, true); // loaves
  })();
  // Dresser / cupboard stacked with pottery (back wall, right of kitchen)
  (function dresser(){
    const dx=-2.6, dz=-5.4;
    box(1.4,1.9,0.6, wood, dx,0.95,dz, true);                // cabinet body
    box(1.5,0.1,0.7, woodDark, dx,1.9,dz, true);             // top
    for(const sy of [0.7,1.25,1.75]) box(1.4,0.06,0.62, woodDark, dx,sy,dz, false); // shelves
    pottery(dx-0.35,1.28,dz); pottery(dx+0.35,1.78,dz);
  })();
  chair(-5.4,-3.2, Math.PI);
  chair(-6.6,-3.0, Math.PI*0.85);

  // ---- SCULLERY (X:-9..-2, Z:0..3) -----------------------------------------
  (function sink(){
    const sx=-8.2, sz=1.6;
    box(1.0,0.9,1.4, texMat('stone',0xb7b1a4,1,1), sx,0.45,sz, true);   // stone counter
    box(0.74,0.16,1.1, water, sx+0.05,0.9,sz, false);                    // water basin
    box(0.9,0.06,1.24, M(0x8f8a80), sx,1.0,sz, false);                   // rim lip
    cyl(0.03,0.03,0.34, brass, sx+0.2,1.15,sz, 6);                       // tap
  })();
  (function barrel(){
    const bx=-8.3, bz=0.2;
    cyl(0.42,0.36,0.9, woodLite, bx,0.45,bz, 12);
    cyl(0.45,0.45,0.08, woodDark, bx,0.7,bz, 12);
    cyl(0.45,0.45,0.08, woodDark, bx,0.2,bz, 12);
    pottery(bx,0.9,bz);
  })();

  // ---- DINING (X:-1..8, Z:-2..5) -------------------------------------------
  (function dining(){
    table(3.4,1.5,3.4,1.4,0.74);
    chair(2.2,-0.1,0); chair(4.6,-0.1,0);           // north side, facing +Z? seats face table
    chair(2.2,3.1,Math.PI); chair(4.6,3.1,Math.PI); // south side
    // lit candle at table centre
    cyl(0.07,0.09,0.26, cream, 3.4,0.93,1.5, 7);
    cyl(0.13,0.16,0.06, brass, 3.4,0.8,1.5, 8);
    flame(3.4,1.06,1.5,0.55);
  })();
  // potted plant in the corner
  (function plant(){
    const px=6.8, pz=-1.0;
    cyl(0.28,0.2,0.4, terra, px,0.2,pz, 9);
    const f=new THREE.Mesh(new THREE.IcosahedronGeometry(0.42,0), leaf); f.position.set(px,0.75,pz); f.castShadow=true; g.add(f);
    const f2=new THREE.Mesh(new THREE.IcosahedronGeometry(0.3,0), M(0x4f8a3e)); f2.position.set(px+0.18,0.55,pz-0.1); f2.castShadow=true; g.add(f2);
  })();
  // gold-framed picture on the east wall
  (function picture(){
    const wx=8.5-WT/2-0.03;
    box(0.06,0.9,0.7, brass, wx,1.6,1.5, false);         // frame
    box(0.04,0.66,0.5, M(0x9ab7c9), wx-0.02,1.6,1.5, false); // canvas
  })();
  // closed wooden door in the east doorway (tile 8,2 E)
  (function door(){
    const dx=8.5;
    box(0.14,2.0,0.9, wood, dx,1.0,2.0, true);
    for(const px of [-0.22,0,0.22]) box(0.15,1.9,0.06, woodDark, dx,1.0,2.0+px, false); // plank seams
    cyl(0.05,0.05,0.05, brass, dx-0.09,1.0,2.28, 6);     // handle
  })();

  // ---- gentle flame flicker (self-contained; no host loop required) ---------
  if(flames.length && typeof requestAnimationFrame!=='undefined'){
    const now=()=> (typeof performance!=='undefined' && performance.now)?performance.now():Date.now();
    const t0=now();
    (function anim(){
      const t=(now()-t0)/1000;
      for(let i=0;i<flames.length;i++){
        const f=flames[i];
        const w=0.5*Math.sin(t*9+f.ph)+0.25*Math.sin(t*21+f.ph*1.7);
        if(f.mesh) f.mesh.scale.set(1, 1+0.22*w, 1);
        if(f.mat && f.mat.emissiveIntensity!==undefined) f.mat.emissiveIntensity=0.85+0.4*w;
      }
      requestAnimationFrame(anim);
    })();
  }

  return g;
};

console.log('[ref_bldint1] makeRefBldInt1 ready');
})();
