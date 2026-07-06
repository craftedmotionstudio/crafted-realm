// ref_bldint3.js — self-contained open (roofless) room interior, OSRS flat-shaded low-poly.
// Recreates Bible_References/Building_Interior_Option3.jpg: an overhead view of a stone-walled
// compound with a packed-dirt floor, angled (octagonal) low stone walls, a central partition
// wall with a doorway + climbing ladder, wall-mounted stone crosses, glowing blue floor rune
// circles, a wooden bench, a dormitory side (straw beds + sacks), a library side (bookshelves
// with coloured book spines), and barrels/crates. Roof-off so it reads from overhead.
// Global-script (THREE r128). Exposes window.makeRefBldInt3(x,z,rot) -> THREE.Group.
(function(){
'use strict';
if(typeof THREE==='undefined'){ console.warn('[ref_bldint3] THREE missing'); return; }

// Material guard — reuse game mat() when present, else flat-shaded Lambert fallback.
const M=(c)=> (typeof mat==='function') ? mat(c) : new THREE.MeshLambertMaterial({color:c, flatShading:true});
// Stone material — reuse TEX.stone tiling when the game has baked it, else flat colour.
function stoneMat(color, rx, ry){
  const T=(typeof TEX!=='undefined' && TEX && TEX.stone) ? TEX.stone.clone() : null;
  if(T){ T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||2, ry||2);
    return new THREE.MeshLambertMaterial({map:T, color:color||0xc9c4b8, flatShading:true}); }
  return M(color||0x9a948a);
}
function woodMat(color, rx, ry){
  const T=(typeof TEX!=='undefined' && TEX && TEX.wood) ? TEX.wood.clone() : null;
  if(T){ T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||1, ry||1);
    return new THREE.MeshLambertMaterial({map:T, color:color||0x6f573f, flatShading:true}); }
  return M(color||0x6a4a2a);
}

window.makeRefBldInt3=function(x,z,rot){
  x=x||0; z=z||0; rot=rot||0;
  const g=new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y=rot;

  // Shared box helper (adds to group, optional shadow).
  function box(w,h,d,material,px,py,pz,shadow){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }
  // Mesh helper for non-box geometry.
  function add(geo, material, px,py,pz, shadow){
    const m=new THREE.Mesh(geo, material); m.position.set(px,py,pz);
    if(shadow){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }

  // ---- Footprint: wide octagon (angled OSRS corners), roofless. ----------
  const H=1.7, WT=0.5;                       // wall height (low, reads overhead) / thickness
  const HX=10, HZ=5.5, C=3.5;                // half-width / half-depth / corner chamfer
  // Perimeter centreline, clockwise from the back-left corner. +Z is the "front" (toward viewer).
  const P=[
    [-HX+C,-HZ],[ HX-C,-HZ],[ HX,-HZ+C],[ HX, HZ-C],
    [ HX-C, HZ],[-HX+C, HZ],[-HX, HZ-C],[-HX,-HZ+C]
  ];

  // ---- Packed-dirt floor -------------------------------------------------
  const dirtMat=M(0x7a5636);                 // warm earthen brown
  const floor=box(HX*2+WT, 0.3, HZ*2+WT, dirtMat, 0, -0.15, 0, false);
  floor.receiveShadow=true;
  // a couple of subtle dirt-tone patches for lived-in variation
  box(5, 0.02, 3.5, M(0x815b39), -5.5, 0.011, 1.0, false);
  box(4.5,0.02, 3.0, M(0x6f4e30),  5.5, 0.011,-1.0, false);

  // ---- Angled stone low walls (place a segment along every octagon edge) --
  const wallMat=stoneMat(0xb7b1a4, 2.0, 1.0);
  const capMat =M(0x8f8a80);
  const crossMat=M(0x4a4640);                 // dark stone cross plaques
  // wall segments carrying a flag for where to skip a doorway (front edge P4->P5)
  const wallMids=[];
  for(let i=0;i<P.length;i++){
    const a=P[i], b=P[(i+1)%P.length];
    const dx=b[0]-a[0], dz=b[1]-a[1];
    const len=Math.hypot(dx,dz), ang=Math.atan2(dx,dz);
    const mx=(a[0]+b[0])/2, mz=(a[1]+b[1])/2;
    wallMids.push([mx,mz,ang,len,i]);
    // front-centre edge (i===4, running -X across the +Z side) gets a doorway gap
    if(i===4){
      const seg=(len-2.4)/2;
      for(const s of [-1,1]){
        const ox=mx + s*(seg/2+1.2)*Math.sin(ang);
        const oz=mz + s*(seg/2+1.2)*Math.cos(ang);
        const w=box(WT, H, seg, wallMat, ox, H/2, oz, true); w.rotation.y=ang;
        const c=box(WT+0.28, 0.22, seg, capMat, ox, H+0.1, oz, false); c.rotation.y=ang;
      }
      continue;
    }
    const w=box(WT, H, len, wallMat, mx, H/2, mz, true); w.rotation.y=ang;
    const cap=box(WT+0.28, 0.22, len, capMat, mx, H+0.1, mz, false); cap.rotation.y=ang;
  }

  // ---- Wall-mounted stone crosses (flat + shapes lying on the wall caps) --
  // From overhead these read as the row of dark crosses along the tops of the walls.
  function addCross(px,pz,ang){
    const y=H+0.24;
    const v=box(0.16,0.06,0.7, crossMat, px,y,pz, false); v.rotation.y=ang;
    const h=box(0.5, 0.06,0.16, crossMat, px,y,pz, false); h.rotation.y=ang;
  }
  // put a cross on most wall segments (skip the doorway edge index 4)
  for(const wm of wallMids){
    if(wm[4]===4) continue;
    // one or two crosses per segment depending on length
    if(wm[3]>5){
      addCross(wm[0]-1.6*Math.sin(wm[2]), wm[1]-1.6*Math.cos(wm[2]), wm[2]);
      addCross(wm[0]+1.6*Math.sin(wm[2]), wm[1]+1.6*Math.cos(wm[2]), wm[2]);
    } else {
      addCross(wm[0], wm[1], wm[2]);
    }
  }

  // ---- Central partition wall (splits dormitory | library) + doorway ------
  // Runs along Z at x=0. Gap in the middle (z:-1..1) is the doorway between rooms.
  for(const s of [-1,1]){
    const segLen=(HZ) - 1.0;                  // from wall to doorway on each side
    const pz=s*(1.0+segLen/2);
    box(WT, H, segLen, wallMat, 0, H/2, pz, true);
    box(WT+0.28, 0.22, segLen, capMat, 0, H+0.1, pz, false);
    addCross(0, pz, 0);
  }

  // ---- Climbing ladder against the partition (near the doorway) -----------
  (function ladder(){
    const lw=woodMat(0x6a4a2a,1,2), rail=M(0x5a3d22);
    const lx=0.75, lz=-2.6;
    box(0.12, H+0.2, 0.12, rail, lx-0.28, (H+0.2)/2, lz, true);
    box(0.12, H+0.2, 0.12, rail, lx+0.28, (H+0.2)/2, lz, true);
    for(let r=0;r<6;r++){
      box(0.68,0.08,0.1, lw, lx, 0.35+r*0.32, lz, true);
    }
  })();

  // ---- Glowing blue floor rune circles (the magic teleport markers) -------
  const runeGlow=new THREE.MeshBasicMaterial({color:0x59b7ff});      // unlit = reads emissive
  const runeCore=new THREE.MeshBasicMaterial({color:0xbfe6ff});
  function addRune(px,pz,scale){
    scale=scale||1;
    const grp=new THREE.Group(); grp.position.set(px,0.02,pz);
    const ring=new THREE.Mesh(new THREE.RingGeometry(0.55*scale,0.85*scale,20), runeGlow);
    ring.rotation.x=-Math.PI/2; grp.add(ring);
    const ring2=new THREE.Mesh(new THREE.RingGeometry(0.2*scale,0.34*scale,16), runeCore);
    ring2.rotation.x=-Math.PI/2; ring2.position.y=0.005; grp.add(ring2);
    // four little rune ticks around the ring
    for(let a=0;a<4;a++){
      const t=new THREE.Mesh(new THREE.BoxGeometry(0.1*scale,0.02,0.24*scale), runeCore);
      t.position.set(Math.cos(a*Math.PI/2)*0.7*scale, 0.008, Math.sin(a*Math.PI/2)*0.7*scale);
      t.rotation.y=a*Math.PI/2; grp.add(t);
    }
    // a soft flame node so the engine flicker loop pulses the glow (emissive + flicker)
    grp.userData.flame=ring2;
    g.add(grp);
    if(typeof WORLD!=='undefined' && WORLD.fires) WORLD.fires.push(grp);
    return grp;
  }
  addRune(-2.0, 0.4, 1.0);      // near the doorway
  addRune( 3.2,-2.6, 0.85);     // library corner
  addRune( 5.5, 1.8, 1.1);      // right room

  // ---- Wooden bench (centre, just inside the doorway) ---------------------
  (function bench(){
    const bw=woodMat(0x7a5a34,2,1), bd=M(0x5a3d22);
    const bx=-2.0, bz=2.6;
    box(2.6,0.16,0.7, bw, bx,0.5,bz, true);           // seat plank
    box(2.6,0.5,0.14, bd, bx,0.75,bz-0.28, true);     // backrest
    for(const lx of [-1.1,1.1]) box(0.16,0.5,0.6, bd, bx+lx,0.25,bz, true); // legs
  })();

  // ---- Dormitory side (left, x<0): straw beds + a white sack -------------
  function addBed(px,pz,ang){
    const grp=new THREE.Group(); grp.position.set(px,0,pz); grp.rotation.y=ang||0;
    const frame=M(0x5a3d22), straw=M(0xcaa34e), stripe=M(0x9a3630), pillow=M(0xe8e2d4);
    const f=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.3,2.4), frame); f.position.y=0.2; f.castShadow=true; grp.add(f);
    const m=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.22,2.1), straw); m.position.y=0.42; grp.add(m);
    // red blanket stripes across the mattress
    for(const sz of [-0.4,0.3,1.0]){
      const st=new THREE.Mesh(new THREE.BoxGeometry(1.32,0.24,0.28), stripe); st.position.set(0,0.42,sz); grp.add(st);
    }
    const pl=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.2,0.5), pillow); pl.position.set(0,0.5,-0.85); grp.add(pl);
    // headboard
    const hb=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.7,0.16), frame); hb.position.set(0,0.55,-1.2); hb.castShadow=true; grp.add(hb);
    g.add(grp);
  }
  addBed(-8.2, -2.6, 0);          // along the back-left wall
  addBed(-8.2,  0.6, 0);
  addBed(-5.4, -3.2, Math.PI/2);  // tucked under the back wall, sideways
  // white flour sacks (the pale blobs in the reference)
  function addSack(px,pz){
    const s=M(0xe4ddce);
    const b=add(new THREE.SphereGeometry(0.45,7,6), s, px,0.4,pz, true); b.scale.y=0.85;
    add(new THREE.SphereGeometry(0.22,6,5), s, px,0.72,pz, true);
  }
  addSack(-5.8, 2.6); addSack(-6.7, 2.9);

  // ---- Library side (right, x>0): bookshelves with coloured spines -------
  const bookCols=[0x8a2f2f,0x2f5a8a,0x2f7a4a,0x8a6a2f,0x5a2f7a,0x7a3a20];
  function addBookshelf(px,pz,ang){
    const grp=new THREE.Group(); grp.position.set(px,0,pz); grp.rotation.y=ang||0;
    const wd=woodMat(0x5f4326,1,2), wdk=M(0x4a3320);
    const carc=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.5,0.6), wdk); carc.position.y=0.75; carc.castShadow=true; grp.add(carc);
    // two shelves of book spines
    for(const sy of [0.55,1.05]){
      let bx=-1.05;
      while(bx<1.05){
        const bw=0.1+Math.random()*0.06, bh=0.32+Math.random()*0.1;
        const col=bookCols[(Math.floor((bx+2)*7))%bookCols.length];
        const bk=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,0.42), M(col));
        bk.position.set(bx+bw/2, sy+bh/2-0.02, 0.02); grp.add(bk);
        bx+=bw+0.015;
      }
    }
    g.add(grp);
  }
  addBookshelf(8.4, -2.4, 0);       // right room, back wall
  addBookshelf(8.4,  1.4, 0);
  addBookshelf(5.0, -3.4, Math.PI/2);

  // ---- Barrels & a crate (scattered props by the walls) ------------------
  function addBarrel(px,pz){
    const wd=woodMat(0x6a4a2a,2,1), hoop=M(0x3a2c1c);
    add(new THREE.CylinderGeometry(0.42,0.42,0.9,10), wd, px,0.45,pz, true);
    for(const hy of [0.18,0.72]) add(new THREE.CylinderGeometry(0.45,0.45,0.08,10), hoop, px,hy,pz, false);
    add(new THREE.CylinderGeometry(0.36,0.36,0.06,10), M(0x5a3d22), px,0.91,pz, false);
  }
  addBarrel(-8.6, 3.0); addBarrel(9.0, 3.2);
  // crate
  (function crate(){
    const w=woodMat(0x7a5a34,1,1);
    box(0.9,0.9,0.9, w, 6.8, 0.45, 3.4, true);
    for(const e of [-0.42,0.42]){ box(0.06,0.9,0.9,M(0x4a3320),6.8+e,0.45,3.4,false); }
  })();

  return g;
};

console.log('[ref_bldint3] makeRefBldInt3 ready');
})();
