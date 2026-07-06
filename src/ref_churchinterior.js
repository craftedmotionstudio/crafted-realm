// ref_churchinterior.js — self-contained church-nave interior (OSRS flat-shaded low-poly).
// Recreates Bible_References/Church_Interior_Option1.jpg: stone floor + red carpet aisle,
// two rows of wooden pews, altar with candles + cross on a raised step, stone side walls
// with tall arched stained-glass windows, gold wall sconces, stone columns. Roof-off interior.
// Global-script (THREE r128). Exposes window.makeRefChurchInterior(x,z,rot) -> THREE.Group.
(function(){
'use strict';
if(typeof THREE==='undefined'){ console.warn('[ref_churchinterior] THREE missing'); return; }

// Material guard — reuse game mat()/TEX when present, else flat-shaded Lambert fallback.
const M=(c)=> (typeof mat==='function') ? mat(c) : new THREE.MeshLambertMaterial({color:c, flatShading:true});
function stoneMat(color, rx, ry){
  const T=(typeof TEX!=='undefined' && TEX && TEX.stone) ? TEX.stone.clone() : null;
  if(T){ T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||2, ry||2);
    return new THREE.MeshLambertMaterial({map:T, color:color||0xc9c4b8, flatShading:true}); }
  return M(color||0x9a948a);
}

window.makeRefChurchInterior=function(x,z,rot){
  x=x||0; z=z||0; rot=rot||0;
  const g=new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y=rot;

  // Footprint: width along X, nave length along Z. Altar at -Z (front), entrance at +Z.
  const W=13, D=19, H=3.4, WT=0.55;                 // interior width / depth / wall height / wall thickness
  const xIn=W/2, zIn=D/2;                            // inner half-extents

  // Shared box helper (adds to group, optional shadow).
  function box(w,h,d,material,px,py,pz,shadow){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }

  // ---- Stone floor ------------------------------------------------------
  const floorMat=stoneMat(0x8d867a, W/2.2, D/2.2);
  const floor=box(W+WT*2, 0.3, D+WT*2, floorMat, 0, -0.15, 0, false);
  floor.receiveShadow=true;

  // ---- Red carpet aisle runner (raised sliver down the centre) ----------
  const carpetMat=M(0x7a1f1f);
  const carpet=box(3.0, 0.06, D-2.4, carpetMat, 0, 0.03, 0.6, false);
  carpet.receiveShadow=true;
  // gold trim edges
  const trimMat=M(0xc9a24a);
  box(0.12,0.05,D-2.4, trimMat, -1.56, 0.045, 0.6, false);
  box(0.12,0.05,D-2.4, trimMat,  1.56, 0.045, 0.6, false);

  // ---- Stone walls (open top, no roof) ----------------------------------
  const wallMat=stoneMat(0xc9c4b8, W/2.1, 1.6);
  const capMat=M(0x8f8a80);
  // side walls (run along Z)
  for(const sx of [-1,1]){
    box(WT, H, D+WT*2, wallMat, sx*(xIn+WT/2), H/2, 0, true);
    box(WT+0.35, 0.25, D+WT*2, capMat, sx*(xIn+WT/2), H+0.12, 0, false);
  }
  // back (altar) wall — solid, runs along X
  box(W+WT*2, H, WT, wallMat, 0, H/2, -(zIn+WT/2), true);
  box(W+WT*2, 0.25, WT+0.35, capMat, 0, H+0.12, -(zIn+WT/2), false);
  // front (entrance) wall with a central doorway gap
  const doorHalf=1.7, segLen=(W+WT*2)/2 - doorHalf;
  for(const sx of [-1,1]){
    box(segLen, H, WT, wallMat, sx*(doorHalf+segLen/2), H/2, (zIn+WT/2), true);
  }
  box(W+WT*2, 0.25, WT+0.35, capMat, 0, H+0.12, (zIn+WT/2), false);
  // lintel over the doorway
  box(doorHalf*2, H-2.2, WT, wallMat, 0, H-((H-2.2)/2), (zIn+WT/2), true);

  // ---- Tall arched stained-glass windows in the side walls --------------
  // Reusable arched-window builder: stone frame + coloured translucent panes.
  const glassColors=[0x6a3fb0, 0x2f6fb0, 0xb03f5a, 0x2fa05a]; // purple/blue/red/green mix
  const frameMat=M(0x6f6a60);
  const winZ=[-4.6,-1.5,1.6,4.7];      // four windows per side, evenly spaced
  function addWindow(sx, wz, tint){
    const px=sx*(xIn+WT/2 - 0.02);
    // stone frame (recessed panel)
    const fr=new THREE.Mesh(new THREE.BoxGeometry(0.18,2.3,1.1), frameMat);
    fr.position.set(px, 1.55, wz); fr.castShadow=true; g.add(fr);
    // arched top (half-cylinder cap)
    const arch=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.18,10,1,false,0,Math.PI), frameMat);
    arch.rotation.z=Math.PI/2; arch.rotation.y=sx>0?Math.PI:0;
    arch.position.set(px, 2.7, wz); g.add(arch);
    // translucent glass pane, split into a couple of coloured lights
    const gm1=new THREE.MeshPhongMaterial({color:tint, emissive:tint, emissiveIntensity:0.35,
      transparent:true, opacity:0.72, flatShading:true, shininess:10, side:THREE.DoubleSide});
    const gm2=new THREE.MeshPhongMaterial({color:0xf0d060, emissive:0xf0d060, emissiveIntensity:0.3,
      transparent:true, opacity:0.72, flatShading:true, shininess:10, side:THREE.DoubleSide});
    const p1=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.7,0.42), gm1);
    p1.position.set(px+sx*0.04, 1.55, wz-0.24); g.add(p1);
    const p2=new THREE.Mesh(new THREE.BoxGeometry(0.06,1.7,0.42), gm2);
    p2.position.set(px+sx*0.04, 1.55, wz+0.24); g.add(p2);
    // arched glass top
    const pa=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.06,8,1,false,0,Math.PI), gm1);
    pa.rotation.z=Math.PI/2; pa.rotation.y=sx>0?Math.PI:0;
    pa.position.set(px+sx*0.04, 2.62, wz); g.add(pa);
  }
  for(let i=0;i<winZ.length;i++){
    addWindow(-1, winZ[i], glassColors[i%glassColors.length]);
    addWindow( 1, winZ[i], glassColors[(i+2)%glassColors.length]);
  }

  // ---- Gold wall sconces (candelabra) between the windows ---------------
  const brassMat=M(0xc9a24a);
  const flameMat=new THREE.MeshBasicMaterial({color:0xffd24a});
  function addSconce(sx, sz){
    const px=sx*(xIn-0.12);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,6), brassMat);
    arm.rotation.z=Math.PI/2; arm.position.set(sx*(xIn-0.28), 2.0, sz); g.add(arm);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.09,0.12,7), brassMat);
    cup.position.set(px, 2.05, sz); g.add(cup);
    for(let c=-1;c<=1;c++){
      const candle=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.22,6), M(0xe9e2cf));
      candle.position.set(px, 2.25, sz+c*0.12); g.add(candle);
      const fl=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.14,5), flameMat);
      fl.position.set(px, 2.42, sz+c*0.12); g.add(fl);
    }
  }
  const sconceZ=[-3.05, 0.05, 3.15, 6.0];
  for(const sz of sconceZ){ addSconce(-1,sz); addSconce(1,sz); }

  // ---- Stone columns framing the nave -----------------------------------
  const colMat=stoneMat(0x9c5a44, 1, 2.4);   // reddish stone like the reference pillars
  function addColumn(cx, cz){
    box(0.8, H-0.2, 0.8, colMat, cx, (H-0.2)/2, cz, true);
    box(1.0, 0.22, 1.0, capMat, cx, H-0.2, cz, false);
    box(1.0, 0.22, 1.0, capMat, cx, 0.1, cz, false);
  }
  for(const cz of [-6.6, 6.6]){ addColumn(-(xIn-0.9), cz); addColumn(xIn-0.9, cz); }

  // ---- Wooden pews (two rows flanking the aisle) ------------------------
  // Reusable pew: seat plank + back plank + two end legs. Faces the altar (-Z).
  const woodMat=M(0x6e4a2a), woodDark=M(0x5a3a1e);   // warm brown bench wood (was bright gold)
  function addPew(px, pz){
    box(3.0, 0.16, 0.55, woodMat, px, 0.55, pz, true);      // seat
    box(3.0, 0.7, 0.14, woodDark, px, 0.85, pz-0.2, true);  // back
    for(const lx of [-1.3,1.3]){
      box(0.16, 0.55, 0.5, woodDark, px+lx, 0.28, pz, true); // legs/ends
    }
  }
  const pewZ=[-2.2, 0.6, 3.4, 6.2];   // four rows front-to-back
  for(const pz of pewZ){ addPew(-3.4, pz); addPew(3.4, pz); }

  // ---- Altar on a raised step at the front (-Z) -------------------------
  const stepMat=stoneMat(0xb8b2a4, 3, 1);
  const daisZ=-(zIn-1.6);
  box(7.5, 0.28, 2.0, stepMat, 0, 0.14, daisZ+0.4, true);   // raised platform
  box(9.0, 0.18, 2.6, stepMat, 0, 0.05, daisZ+0.4, true);   // lower step lip
  // altar table with white cloth
  const clothMat=M(0xece7da);
  box(3.4, 0.9, 0.14, M(0x7a6a52), 0, 0.73, daisZ+0.05, true); // table front pedestal
  box(3.8, 0.16, 1.2, clothMat, 0, 1.26, daisZ, true);         // white cloth top
  box(3.9, 0.5, 0.1, clothMat, 0, 1.0, daisZ+0.6, true);       // cloth drape front
  // altar candles (two tall, flanking)
  for(const cx of [-1.4,1.4]){
    const cnd=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.7,7), M(0xe9e2cf));
    cnd.position.set(cx, 1.68, daisZ); cnd.castShadow=true; g.add(cnd);
    const holder=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.14,7), brassMat);
    holder.position.set(cx, 1.4, daisZ); g.add(holder);
    const fl=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.22,6), flameMat);
    fl.position.set(cx, 2.12, daisZ); g.add(fl);
  }
  // open book / lectern piece at centre of altar
  box(0.7,0.06,0.5, M(0x2f2f34), 0, 1.37, daisZ, false);
  box(0.32,0.05,0.42, M(0xe8e2d4), -0.17, 1.41, daisZ, false);
  box(0.32,0.05,0.42, M(0xe8e2d4),  0.17, 1.41, daisZ, false);
  // standing cross behind the altar
  box(0.16, 1.7, 0.16, brassMat, 0, 2.05, daisZ-0.7, true);
  box(0.9, 0.16, 0.16, brassMat, 0, 2.4, daisZ-0.7, true);

  return g;
};

console.log('[ref_churchinterior] makeRefChurchInterior ready');
})();
