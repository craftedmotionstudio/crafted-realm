// ref_bankbasement.js — self-contained BANK BASEMENT / VAULT interior (OSRS flat-shaded low-poly).
// Recreates "Bible_References/Bank Basement.jpg": a roofless coursed-stone cellar split by low
// stone walls into a main clerk hall + side storage rooms, a heavy BARRED IRON VAULT GATE, rows of
// domed deposit CHESTS / strongboxes, shelves stacked with GOLD BARS + coin stacks, scattered gold
// coin piles, wooden clerk desks with open ledgers + chairs, barrels, wall TORCHES (emissive flame
// + flicker), stone columns, a wooden up-staircase, and rubble strewn across the floor.
// Global-script (THREE r128, NOT ES modules). Exposes window.makeRefBankBasement(x,z,rot) -> THREE.Group.
(function(){
'use strict';
if(typeof THREE==='undefined'){ console.warn('[ref_bankbasement] THREE missing'); return; }

// Material guard — reuse the game's mat()/TEX when present, else flat-shaded Lambert fallback.
const M=(c)=> (typeof mat==='function') ? mat(c) : new THREE.MeshLambertMaterial({color:c, flatShading:true});
function stoneMat(color, rx, ry){
  const T=(typeof TEX!=='undefined' && TEX && TEX.stone) ? TEX.stone.clone() : null;
  if(T){ T.needsUpdate=true; T.wrapS=T.wrapT=THREE.RepeatWrapping; T.repeat.set(rx||2, ry||2);
    return new THREE.MeshLambertMaterial({map:T, color:color||0xc9c4b8, flatShading:true}); }
  return M(color||0x9a948a);
}

// ---- Shared flicker registry + one self-installed rAF loop (all torches share it) --------------
if(!window.__refBankFX){
  const FX={ items:[], running:false };
  FX.loop=function(){
    const t=(typeof performance!=='undefined'?performance.now():Date.now())*0.001;
    for(let i=0;i<FX.items.length;i++){
      const it=FX.items[i];
      const f=0.80 + 0.16*Math.sin(t*7.7+it.ph) + 0.07*Math.sin(t*15.3+it.ph*1.7);
      if(it.flame){ it.flame.scale.y=f; it.flame.scale.x=0.9+0.12*Math.sin(t*11.0+it.ph); }
      if(it.mat) it.mat.emissiveIntensity=it.base*f;
      if(it.light) it.light.intensity=it.lightBase*f;
    }
    if(FX.items.length) requestAnimationFrame(FX.loop); else FX.running=false;
  };
  FX.register=function(it){ this.items.push(it); if(!this.running){ this.running=true; requestAnimationFrame(this.loop); } };
  window.__refBankFX=FX;
}

window.makeRefBankBasement=function(x,z,rot){
  x=x||0; z=z||0; rot=rot||0;
  const g=new THREE.Group();
  g.position.set(x,0,z);
  g.rotation.y=rot;

  // Footprint: width along X, depth along Z. Interior ~22 x 17, low roofless vault walls.
  const W=22, D=17, H=2.6, WT=0.6;
  const xIn=W/2, zIn=D/2;

  // Shared box helper (adds to group, optional shadow).
  function box(w,h,d,material,px,py,pz,shadow){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }
  // Cylinder helper.
  function cyl(rt,rb,h,material,px,py,pz,seg,shadow){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||8), material);
    m.position.set(px,py,pz);
    if(shadow!==false){ m.castShadow=true; m.receiveShadow=true; }
    g.add(m); return m;
  }

  // ---- Coursed stone FLOOR (+ a low base slab so it reads as sunk-in cellar) -------------------
  const floorMat=stoneMat(0x7f7a70, W/2.4, D/2.4);
  const floor=box(W+WT*2, 0.3, D+WT*2, floorMat, 0, -0.15, 0, false);
  floor.receiveShadow=true;

  // ---- Perimeter walls (open top / no roof) + an inner dividing wall for side storage rooms ----
  const wallMat=stoneMat(0xb9b3a6, W/2.2, 1.4);
  const capMat=M(0x8f8a80);
  // outer perimeter (side walls run along Z, end walls along X)
  for(const sx of [-1,1]){
    box(WT, H, D+WT*2, wallMat, sx*(xIn+WT/2), H/2, 0, true);
    box(WT+0.3, 0.22, D+WT*2, capMat, sx*(xIn+WT/2), H+0.1, 0, false);
  }
  for(const sz of [-1,1]){
    box(W+WT*2, H, WT, wallMat, 0, H/2, sz*(zIn+WT/2), true);
    box(W+WT*2, 0.22, WT+0.3, capMat, 0, H+0.1, sz*(zIn+WT/2), false);
  }
  // inner dividing wall at x = -4 splitting off the LEFT storage rooms; leave a doorway gap.
  const divX=-4;
  const gateGap=2.2;                       // opening filled by the vault gate
  const segFront=(zIn - gateGap/2)/2;       // wall segments above/below the gate opening
  // upper segment (+Z side) and lower segment (-Z side)
  box(WT, H, segFront*2, wallMat, divX, H/2,  (gateGap/2+segFront), true);
  box(WT, 0.22, segFront*2, capMat, divX, H+0.1, (gateGap/2+segFront), false);
  box(WT, H, segFront*2, wallMat, divX, H/2, -(gateGap/2+segFront), true);
  box(WT, 0.22, segFront*2, capMat, divX, H+0.1, -(gateGap/2+segFront), false);
  // a short cross-wall inside the left block, splitting it into two storage rooms
  box((xIn+divX)+WT, H, WT, wallMat, (-xIn+divX)/2, H/2, 0, true);
  box((xIn+divX)+WT, 0.22, WT+0.3, capMat, (-xIn+divX)/2, H+0.1, 0, false);

  // ---- Heavy BARRED IRON VAULT GATE in the dividing-wall opening --------------------------------
  const ironMat=M(0x3a3d42), ironDark=M(0x24262a);
  (function vaultGate(){
    const gx=divX, gy0=0.1, gyTop=H-0.15, gh=gyTop-gy0;
    // stone jambs framing the opening
    for(const sz of [-1,1]){
      box(WT+0.25, H+0.15, 0.5, stoneMat(0xa39d90,1,1.6), gx, (H+0.15)/2, sz*(gateGap/2+0.05), true);
    }
    // top lintel
    box(WT+0.25, 0.4, gateGap+1.0, stoneMat(0xa39d90,1.2,0.6), gx, gyTop+0.2, 0, true);
    // vertical iron bars
    const nBars=6, span=gateGap-0.3;
    for(let i=0;i<nBars;i++){
      const bz=-span/2 + span*(i/(nBars-1));
      cyl(0.055,0.055,gh, ironMat, gx, gy0+gh/2, bz, 7, true);
    }
    // horizontal rails (top / mid / bottom)
    for(const ry of [gy0+0.15, gy0+gh*0.5, gyTop-0.15]){
      const r=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,span+0.2,7), ironDark);
      r.rotation.x=Math.PI/2; r.position.set(gx, ry, 0); r.castShadow=true; g.add(r);
    }
    // a round wheel/handle boss on the gate — the vault "lock"
    const boss=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.07,6,14), ironMat);
    boss.position.set(gx+0.08, gy0+gh*0.5, 0.0); boss.rotation.y=Math.PI/2; boss.castShadow=true; g.add(boss);
    cyl(0.1,0.1,0.14, ironDark, gx+0.05, gy0+gh*0.5, 0, 8, true);
  })();

  // ---- Reusable DEPOSIT CHEST / strongbox (domed lid, iron bands, gold latch) -------------------
  const woodMat=M(0x7a5227), woodDark=M(0x5e3d1c), bandMat=M(0x353535), goldMat=M(0xcaa63c);
  // shared lid geometry (merged reuse across every chest)
  const lidGeo=new THREE.CylinderGeometry(0.5,0.5,1.0,10,1,false,0,Math.PI);
  function addChest(cx,cz,ry){
    ry=ry||0;
    const c=new THREE.Group(); c.position.set(cx,0,cz); c.rotation.y=ry;
    // body
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.55,0.7), woodMat);
    body.position.y=0.375; body.castShadow=true; body.receiveShadow=true; c.add(body);
    // domed lid (half-cylinder laid along X)
    const lid=new THREE.Mesh(lidGeo, woodDark);
    lid.scale.set(0.5,1.0,0.35); lid.rotation.z=Math.PI/2; lid.rotation.y=Math.PI/2;
    lid.position.y=0.65; lid.castShadow=true; c.add(lid);
    // iron bands + gold latch
    for(const bx of [-0.32,0.32]){
      const bnd=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.62,0.74), bandMat);
      bnd.position.set(bx,0.42,0); c.add(bnd);
    }
    const latch=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.16,0.06), goldMat);
    latch.position.set(0,0.42,0.37); c.add(latch);
    g.add(c); return c;
  }

  // ---- Reusable BARREL ------------------------------------------------------------------------
  const barrelMat=M(0x6a4a26), hoopMat=M(0x4a3218);
  function addBarrel(cx,cz){
    const b=new THREE.Group(); b.position.set(cx,0,cz);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.30,0.85,10), barrelMat);
    body.position.y=0.43; body.castShadow=true; body.receiveShadow=true; b.add(body);
    for(const hy of [0.18,0.68]){
      const h=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.08,10), hoopMat);
      h.position.y=hy; b.add(h);
    }
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.30,0.30,0.05,10), hoopMat);
    top.position.y=0.865; b.add(top);
    g.add(b); return b;
  }

  // ---- Reusable GOLD COIN PILE (small muted-gold cluster on the floor) --------------------------
  const coinGeo=new THREE.CylinderGeometry(0.12,0.14,0.05,8);   // shared coin-stack geometry
  const nuggetGeo=new THREE.DodecahedronGeometry(0.1,0);        // shared nugget geometry
  function addCoinPile(cx,cz,scale){
    scale=scale||1;
    const p=new THREE.Group(); p.position.set(cx,0,cz); p.scale.setScalar(scale);
    const spots=[[0,0,0.9],[0.16,0.05,0.9],[-0.14,0.05,0.9],[0.05,-0.16,0.9],[0.0,0.12,1.6]];
    for(const s of spots){
      const c=new THREE.Mesh(coinGeo, goldMat);
      c.position.set(s[0], 0.03+ (s[2]>1?0.05:0), s[1]); c.scale.y=s[2];
      c.castShadow=true; p.add(c);
    }
    for(const nx of [-0.1,0.12,0.02]){
      const n=new THREE.Mesh(nuggetGeo, goldMat);
      n.position.set(nx, 0.06, nx*0.6+0.05); p.add(n);
    }
    g.add(p); return p;
  }

  // ---- Reusable SHELF of gold bars + coin stacks (against a wall) ------------------------------
  const barGold=M(0xc39a30);
  function addGoldShelf(cx,cz,ry){
    ry=ry||0;
    const s=new THREE.Group(); s.position.set(cx,0,cz); s.rotation.y=ry;
    const frameW=1.8, frameD=0.7, frameH=2.1;
    // side posts + back
    for(const px of [-frameW/2,frameW/2]) { const p=new THREE.Mesh(new THREE.BoxGeometry(0.1,frameH,frameD),woodDark); p.position.set(px,frameH/2,0); p.castShadow=true; s.add(p); }
    const back=new THREE.Mesh(new THREE.BoxGeometry(frameW,frameH,0.08), woodDark); back.position.set(0,frameH/2,-frameD/2+0.04); s.add(back);
    // three shelf boards + their loot
    const levels=[0.5,1.15,1.8];
    for(let li=0; li<levels.length; li++){
      const ly=levels[li];
      const board=new THREE.Mesh(new THREE.BoxGeometry(frameW,0.08,frameD), woodMat);
      board.position.set(0,ly,0); board.castShadow=true; board.receiveShadow=true; s.add(board);
      if(li<2){
        // stacked gold BARS (muted gold trapezoid-ish boxes)
        for(let bx=-1; bx<=1; bx++){
          const bar=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.14,0.22), barGold);
          bar.position.set(bx*0.5, ly+0.11, -0.05); bar.castShadow=true; s.add(bar);
          const bar2=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.14,0.22), barGold);
          bar2.position.set(bx*0.5, ly+0.26, -0.05); bar2.castShadow=true; s.add(bar2);
        }
      } else {
        // coin stacks on the top shelf
        for(let cxk=-2; cxk<=2; cxk++){
          const ck=new THREE.Mesh(coinGeo, goldMat);
          ck.position.set(cxk*0.34, ly+0.14, 0.05); ck.scale.y=2.6; ck.castShadow=true; s.add(ck);
        }
      }
    }
    g.add(s); return s;
  }

  // ---- Reusable STONE COLUMN -------------------------------------------------------------------
  const colMat=stoneMat(0x9a948a, 1, 2.0);
  function addColumn(cx,cz){
    box(0.8, H-0.15, 0.8, colMat, cx, (H-0.15)/2, cz, true);
    box(1.0, 0.22, 1.0, capMat, cx, H-0.15, cz, false);
    box(1.0, 0.2, 1.0, capMat, cx, 0.1, cz, false);
  }

  // ---- Reusable WALL TORCH (bracket + emissive flame, registered for flicker) ------------------
  const flameCore=new THREE.MeshBasicMaterial({color:0xffd24a});
  function addTorch(px,py,pz,faceRot){
    const t=new THREE.Group(); t.position.set(px,py,pz); t.rotation.y=faceRot||0;
    // back plate + bracket + cup
    const plate=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.4,0.12), ironDark); plate.position.set(0,0,0); t.add(plate);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.28,6), ironMat); arm.rotation.x=Math.PI/2.4; arm.position.set(0,0.02,0.14); t.add(arm);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.06,0.14,7), ironMat); cup.position.set(0,0.12,0.26); t.add(cup);
    // layered emissive flame (a small group so scale.y flickers the whole tongue)
    const flame=new THREE.Group(); flame.position.set(0,0.2,0.26);
    const outerMat=new THREE.MeshBasicMaterial({color:0xff8a1e, transparent:true, opacity:0.85});
    const outer=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.4,7), outerMat); outer.position.y=0.18; flame.add(outer);
    const inner=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.26,6), flameCore); inner.position.y=0.14; flame.add(inner);
    t.add(flame);
    // warm point light + registration for flicker
    const light=new THREE.PointLight(0xffb24a, 0.9, 9, 2); light.position.set(0,0.3,0.4); t.add(light);
    g.add(t);
    window.__refBankFX.register({ flame:flame, light:light, lightBase:0.9, ph:Math.random()*6.28 });
    return t;
  }

  // ---- Reusable WOODEN CLERK DESK + open ledger + chairs ---------------------------------------
  const deskMat=M(0x6e4a28), paperMat=M(0xe9e2d0), inkMat=M(0x2c2c30);
  function addChair(cx,cz,ry){
    const c=new THREE.Group(); c.position.set(cx,0,cz); c.rotation.y=ry||0;
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.1,0.5), deskMat); seat.position.y=0.5; seat.castShadow=true; c.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.55,0.08), woodDark); back.position.set(0,0.78,-0.21); back.castShadow=true; c.add(back);
    for(const lx of [-0.2,0.2]) for(const lz of [-0.2,0.2]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.5,0.08), woodDark); leg.position.set(lx,0.25,lz); c.add(leg);
    }
    g.add(c); return c;
  }
  function addDesk(cx,cz,ry){
    const d=new THREE.Group(); d.position.set(cx,0,cz); d.rotation.y=ry||0;
    const top=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.14,1.0), deskMat); top.position.y=0.85; top.castShadow=true; top.receiveShadow=true; d.add(top);
    for(const lx of [-0.85,0.85]) for(const lz of [-0.38,0.38]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.85,0.12), woodDark); leg.position.set(lx,0.42,lz); d.add(leg);
    }
    // open ledger: dark cover + two white pages tented up
    const cover=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.05,0.5), inkMat); cover.position.set(0,0.94,0); d.add(cover);
    for(const s of [-1,1]){
      const pg=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.04,0.46), paperMat);
      pg.position.set(s*0.18,0.98,0); pg.rotation.z=s*0.12; d.add(pg);
    }
    // a couple of coin stacks on the desk
    for(const sx of [-0.7,0.7]){ const ck=new THREE.Mesh(coinGeo, goldMat); ck.position.set(sx,0.98,0.28); ck.scale.y=2.2; d.add(ck); }
    g.add(d);
    addChair(cx, cz+1.0+ (0), (ry||0)+Math.PI);   // chair on near side
    return d;
  }

  // ---- Reusable WOODEN UP-STAIRCASE (stepped boxes rising to the wall) --------------------------
  function addStairs(cx,cz,ry){
    const s=new THREE.Group(); s.position.set(cx,0,cz); s.rotation.y=ry||0;
    const steps=8, sw=2.0, sd=0.45, rise=0.28;
    for(let i=0;i<steps;i++){
      const st=new THREE.Mesh(new THREE.BoxGeometry(sw, rise, sd), deskMat);
      st.position.set(0, rise/2 + i*rise, -i*sd); st.castShadow=true; st.receiveShadow=true; s.add(st);
    }
    // side stringers
    for(const px of [-sw/2-0.06, sw/2+0.06]){
      const str=new THREE.Mesh(new THREE.BoxGeometry(0.1, steps*rise, steps*sd), woodDark);
      str.position.set(px, steps*rise/2, -(steps-1)*sd/2); str.castShadow=true; s.add(str);
    }
    g.add(s); return s;
  }

  // ---- Scattered floor RUBBLE (shared geometry reused across many rocks) ------------------------
  const rockGeo=new THREE.DodecahedronGeometry(0.16,0), rockMat=M(0x6f6960);
  (function scatterRubble(){
    let seed=97;
    const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
    for(let i=0;i<70;i++){
      const rx=-xIn+0.6 + rnd()*(W-1.2);
      const rz=-zIn+0.6 + rnd()*(D-1.2);
      const r=new THREE.Mesh(rockGeo, rockMat);
      const sc=0.4+rnd()*0.9;
      r.position.set(rx, 0.05*sc, rz); r.scale.set(sc, sc*0.6, sc);
      r.rotation.set(rnd()*3, rnd()*6, rnd()*3);
      r.castShadow=true; g.add(r);
    }
  })();

  // ================= LAYOUT =====================================================================
  // Main clerk hall occupies the right (x from -4 .. +11); left block holds two storage rooms.

  // --- Two clerk desks in the main hall (like the reference center desks) ---
  addDesk(4.5, 1.0, 0);
  addDesk(2.0, -3.5, 0.15);

  // --- Wooden UP-staircase against the right wall ---
  addStairs(xIn-1.4, zIn-2.4, Math.PI);

  // --- Shelves of gold bars / coin stacks along the right + back walls ---
  addGoldShelf(3.5, -(zIn-0.6), 0);
  addGoldShelf(6.2, -(zIn-0.6), 0);
  addGoldShelf(xIn-0.7, -3.0, -Math.PI/2);

  // --- Rows of deposit CHESTS: a bank of them along the main-hall back-right, plus storage rooms ---
  // main hall row (facing into room)
  for(let i=0;i<4;i++) addChest(-1.5+i*1.4, zIn-1.2, Math.PI);
  // left storage room A (upper, +Z of cross-wall): dense grid of strongboxes
  for(let r=0;r<2;r++) for(let c=0;c<3;c++) addChest(-9.5+c*1.5, 2.0+r*1.6, (r%2? Math.PI:0));
  // left storage room B (lower, -Z of cross-wall)
  for(let r=0;r<2;r++) for(let c=0;c<3;c++) addChest(-9.5+c*1.5, -2.0-r*1.6, (c%2? Math.PI:0));
  // a lone opened chest near the gate spilling coins
  addChest(-6.0, 0.4, Math.PI/2);

  // --- Barrels tucked in corners ---
  addBarrel(-xIn+1.0, -zIn+1.0);
  addBarrel(-xIn+1.7, -zIn+1.0);
  addBarrel(-xIn+1.0, zIn-1.0);
  addBarrel(xIn-1.2, -zIn+1.2);

  // --- Gold coin piles scattered where chests/desks are (muted, not neon) ---
  addCoinPile(-6.0, 0.9, 1.2);
  addCoinPile(-9.4, 0.6, 0.9);
  addCoinPile(-7.8, -1.2, 1.0);
  addCoinPile(0.6, 1.2, 0.9);
  addCoinPile(1.4, -1.6, 0.8);
  addCoinPile(5.6, -zIn+1.4, 1.0);

  // --- Stone columns framing the main hall ---
  addColumn(-0.5, -zIn+1.4);
  addColumn(-0.5, zIn-1.4);
  addColumn(8.0, -zIn+1.4);
  addColumn(8.0, zIn-1.4);

  // --- Wall TORCHES around the perimeter (emissive + flicker) ---
  const ty=1.9;
  // right wall (facing -X into room)
  addTorch(xIn-0.12, ty, -1.5, -Math.PI/2);
  addTorch(xIn-0.12, ty,  4.0, -Math.PI/2);
  // back wall (facing +Z)
  addTorch(-1.0, ty, -(zIn-0.12), 0);
  addTorch(9.5, ty, -(zIn-0.12), 0);
  // front wall (facing -Z)
  addTorch(3.0, ty, (zIn-0.12), Math.PI);
  // left storage rooms
  addTorch(-xIn+0.12, ty, 2.5, Math.PI/2);
  addTorch(-xIn+0.12, ty, -2.5, Math.PI/2);
  // flanking the vault gate
  addTorch(divX-0.35, ty, gateGap/2+0.6, 0);

  return g;
};

console.log('[ref_bankbasement] makeRefBankBasement ready');
})();
