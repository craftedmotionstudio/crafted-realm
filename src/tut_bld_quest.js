/* ============ tut_bld_quest — the Tutorial Island QUEST LODGE ============
 * A UNIQUE, characterful building (buildkit critique: "plain rectangles with no
 * character"). This one reads as a rustic TIMBER LODGE: warm half-timber posts over
 * a cool stone base, a STEEP gold-shingle gable with EXPOSED king-post trusses, a
 * covered front PORCH (posts + awning), a hanging "Quests" scroll sign, a pinned
 * QUEST NOTICE BOARD by the door, a stone chimney, a bench + barrel, and lanterns.
 *
 * Composes the proven Buildkit.house shell (walls/door/windows/roof/colliders/
 * interior) then bolts CHARACTER geometry on top as a separate rotated group.
 *
 *   window.makeQuestLodge(x, z, rot=0)
 *
 * Art: warm low-poly FLAT-SHADED, r128 THREE, 1 unit = 1 tile. Global deps (all in
 * game2_world.js / buildkit.js): THREE, Buildkit, makeBuilding, mat(), gy(), scene,
 * WORLD, TEX, addCircleCollider. Repeated shingle courses are merged to one mesh.
 */
(function(){
  const TIMBER  = 0x6a4a2c;   // warm lodge timber (posts, deck, board)
  const BEAM    = 0x46301d;   // dark Tudor framing / trusses
  const GOLD    = 0xb8923e;   // gold shingle roof
  const GOLD_D  = 0x8a6a2c;   // shingle course shadow
  const STONE   = 0x8a807a;   // chimney stone

  const M = (typeof mat==='function') ? mat : (c=>new THREE.MeshPhongMaterial({color:c,flatShading:true,shininess:0,specular:0x000000}));
  function woodMat(c){ const t=(typeof TEX!=='undefined'&&TEX.wood)?TEX.wood.clone():null;
    if(t){t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.3,1.3);}
    return new THREE.MeshPhongMaterial({color:c,map:t,flatShading:true,shininess:0,specular:0x000000}); }
  function stoneMat(c){ const t=(typeof TEX!=='undefined'&&TEX.stone)?TEX.stone.clone():null;
    if(t){t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.1,1.1);}
    return new THREE.MeshPhongMaterial({color:c,map:t,flatShading:true,shininess:0,specular:0x000000}); }
  const box=(w,h,d,m)=>{ const x=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); x.castShadow=true; return x; };
  const mergeFn=(()=>{ const B=THREE.BufferGeometryUtils||{}; return B.mergeBufferGeometries||B.mergeGeometries||null; })();

  /* CSP-safe canvas board texture: parchment + a "QUESTS" banner and a scroll/quill motif */
  function signTex(){
    const c=document.createElement('canvas'); c.width=256; c.height=128;
    const g=c.getContext('2d');
    g.fillStyle='#e9dcb4'; g.fillRect(0,0,256,128);                          // parchment
    g.fillStyle='#d8c79a'; for(let i=0;i<70;i++){ g.fillRect(Math.random()*256,Math.random()*128,2,2); }
    g.strokeStyle='#8a6a2c'; g.lineWidth=6; g.strokeRect(8,8,240,112);       // burnt border
    // a little unfurled scroll at left
    g.fillStyle='#cdb884'; g.fillRect(28,44,42,44); g.strokeStyle='#7a5a30'; g.lineWidth=3; g.strokeRect(28,44,42,44);
    g.fillStyle='#b89a5a'; g.fillRect(24,40,50,8); g.fillRect(24,84,50,8);   // scroll rollers
    g.strokeStyle='#7a5a30'; g.lineWidth=2;
    for(let i=0;i<4;i++){ g.beginPath(); g.moveTo(34,54+i*8); g.lineTo(64,54+i*8); g.stroke(); }  // scroll lines
    // a quill nib crossing the scroll
    g.strokeStyle='#3a2a1c'; g.lineWidth=4; g.beginPath(); g.moveTo(40,86); g.lineTo(70,40); g.stroke();
    g.fillStyle='#4a3a2c'; g.font='bold 46px Georgia,serif'; g.textBaseline='middle';
    g.fillText('QUESTS', 92, 66);
    const t=new THREE.CanvasTexture(c); t.needsUpdate=true; return t;
  }
  let SIGN_TEX=null;   // one shared texture across every lodge

  /* small tabletop candle (unlit by default; lit ones carry a soft warm point light) */
  function tableCandle(lit){ const g=new THREE.Group();
    const wax=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,0.24,6), M(0xe8e0c8)); wax.position.y=0.12; g.add(wax);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), new THREE.MeshBasicMaterial({color:0xffe6a0})); fl.position.y=0.28; g.add(fl);
    if(lit){ const li=new THREE.PointLight(0xffce88,0.4,4.5); li.position.y=0.34; g.add(li); }
    return g; }

  /* a small hanging lantern: cage + warm flame + a soft point light */
  function lantern(){
    const g=new THREE.Group();
    { const hanger=box(0.03,0.18,0.03,M(BEAM)); hanger.position.set(0,0.42,0); g.add(hanger); }   // hanger
    const cap=box(0.18,0.06,0.18,M(BEAM)); cap.position.y=0.33; g.add(cap);
    const base=box(0.16,0.05,0.16,M(BEAM)); base.position.y=0.02; g.add(base);
    for(const s of [[-1,-1],[1,-1],[1,1],[-1,1]]){ const p=box(0.025,0.28,0.025,M(BEAM));
      p.position.set(s[0]*0.07,0.17,s[1]*0.07); g.add(p); }
    const glass=new THREE.Mesh(new THREE.BoxGeometry(0.13,0.26,0.13), new THREE.MeshBasicMaterial({color:0xffcf6a,transparent:true,opacity:0.55}));
    glass.position.y=0.17; g.add(glass);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.05,5,4), new THREE.MeshBasicMaterial({color:0xffe6a0})); fl.position.y=0.15; g.add(fl);
    const li=new THREE.PointLight(0xffb050,0.5,4.5); li.position.y=0.17; g.add(li);
    return g;
  }

  /* one sloped shingle plane (gold) with darker course lines merged into ONE mesh */
  function shingleSlope(len, run, rise, tiltSign, planks){
    const g=new THREE.Group();
    const ang=Math.atan2(rise, run), slope=Math.hypot(run, rise);
    const face=box(len, 0.12, slope, M(GOLD)); g.add(face);
    // course lines stepping down the slope (merged, cheap detail)
    if(mergeFn && planks){ const geos=[]; const n=Math.max(2,Math.round(slope/0.5));
      for(let i=1;i<n;i++){ const q=new THREE.BoxGeometry(len*0.98,0.03,0.06);
        q.translate(0,0.08,-slope/2+i*(slope/n)); geos.push(q); }
      const mg=mergeFn(geos,false); if(mg){ const c=new THREE.Mesh(mg,M(GOLD_D)); c.castShadow=true; g.add(c); }
    }
    g.rotation.x = tiltSign*ang;
    return g;
  }

  /* king-post truss on a gable end (tie beam + 2 rafters + king post), proud of the face */
  function truss(halfW, h, apex){
    const g=new THREE.Group();
    const tie=box(halfW*2, 0.16, 0.14, M(BEAM)); tie.position.y=h; g.add(tie);          // bottom chord
    const king=box(0.14, apex-h, 0.14, M(BEAM)); king.position.y=(h+apex)/2; g.add(king); // king post
    const rl=Math.hypot(halfW, apex-h), ra=Math.atan2(apex-h, halfW);
    for(const s of [-1,1]){ const r=box(rl,0.13,0.12,M(BEAM));
      r.position.set(s*halfW/2, (h+apex)/2, 0); r.rotation.z = -s*ra; g.add(r); }        // rafters
    return g;
  }

  window.makeQuestLodge = function(x, z, rot){
    rot = rot||0;
    const W=13, D=10, H=Buildkit.STOREY_H;        // larger lodge footprint (was 11×9), 3.2 wall
    // ---- 1) functional shell (stone base, gable, north door) — interior:'house' furnish
    //         dropped; a bespoke cozy-lodge interior is added below ----
    Buildkit.house({x, z, w:W, d:D, floors:1, doorSide:'N', color:0x9a9a92,
      roofColor:0x8f8f88, shellOpts:{wall:'stone'}, roof:'gable'});

    // ground seat: match makeBuilding's yMin (lowest footprint corner)
    const gyf=(typeof gy==='function')?gy:()=>0;
    const baseY=Math.min(gyf(x-W/2,z-D/2), gyf(x+W/2,z-D/2), gyf(x-W/2,z+D/2), gyf(x+W/2,z+D/2));

    // ---- 2) CHARACTER group, built in LOCAL coords (+z = south, -z = north = DOOR) ----
    const C=new THREE.Group();
    const hw=W/2, hd=D/2;                          // 6.5, 5.0

    // --- half-timber: warm corner posts + top plate + mid rail proud of the stone base ---
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      const p=box(0.2, H, 0.2, woodMat(TIMBER)); p.position.set(sx*(hw-0.06), H/2, sz*(hd-0.06)); C.add(p); }
    for(const sz of [-1,1]){ const pl=box(W, 0.18, 0.16, M(BEAM)); pl.position.set(0, H-0.12, sz*(hd-0.02)); C.add(pl);
      const rl=box(W, 0.13, 0.14, M(BEAM)); rl.position.set(0, H*0.5, sz*(hd-0.02)); C.add(rl); }
    for(const sx of [-1,1]){ const pl=box(0.16, 0.18, D, M(BEAM)); pl.position.set(sx*(hw-0.02), H-0.12, 0); C.add(pl); }

    // --- steep GOLD gable accent (ridge along Z) with exposed trusses on both gable ends ---
    const RISE=2.4, apex=H+RISE, over=0.35;
    const roof=new THREE.Group();
    for(const s of [-1,1]){ const sl=shingleSlope(D+over*2, hw+over, RISE, s, true);
      // seat slope so its low edge sits at the eave (x=±hw, y=H) and high edge at ridge (x=0, y=apex)
      sl.position.set(s*(hw+over)/2, (H+apex)/2, 0); roof.add(sl); }
    const ridge=box(0.2, 0.2, D+over*2, M(GOLD_D)); ridge.position.set(0, apex, 0); roof.add(ridge);
    // gable-end infill triangles (so you don't see through under the ridge) + trusses
    for(const sz of [-1,1]){
      const tri=new THREE.Mesh(new THREE.CylinderGeometry(0.001, hw, RISE, 3, 1),
        new THREE.MeshPhongMaterial({color:0x9a9a92,flatShading:true,shininess:0,specular:0x000000}));
      tri.rotation.z=Math.PI; tri.scale.z=0.2; tri.position.set(0, H+RISE/2, sz*(hd-0.05)); tri.castShadow=true; roof.add(tri);
      const tr=truss(hw, H, apex); tr.position.set(0, 0, sz*(hd+0.02)); roof.add(tr);
    }
    C.add(roof);

    // --- stone CHIMNEY on the east wall, breaking the roofline ---
    const ch=box(0.62, H+2.0, 0.62, stoneMat(STONE)); ch.position.set(hw-0.5, (H+2.0)/2, 1.4); C.add(ch);
    const cap=box(0.78,0.18,0.78,M(0x6e6a64)); cap.position.set(hw-0.5, H+2.0, 1.4); C.add(cap);
    for(let i=0;i<2;i++){ const pot=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,0.28,6),M(0x5a544e));
      pot.position.set(hw-0.65+i*0.3, H+2.2, 1.4); C.add(pot); }

    // --- covered PORCH on the north (door) side: deck + posts + awning ---
    const pZ=-hd-0.9;                              // porch front line
    const postX=2.4;                              // porch posts flank the (centered) door, widened for the bigger shell
    const deckW=2*postX+1.2, headW=2*postX+0.2, awW=2*postX+1.4;   // porch spans derived from the post span
    const deck=box(deckW,0.1,1.9,woodMat(0x5a3f24)); deck.position.set(0,0.05,-hd-0.75); C.add(deck);
    for(const s of [-1,1]){ const post=box(0.18,2.7,0.18,woodMat(TIMBER)); post.position.set(s*postX,1.35,pZ); C.add(post);
      const brace=box(0.1,0.1,0.7,M(BEAM)); brace.position.set(s*postX,2.4,pZ+0.4); brace.rotation.x=0.7; C.add(brace); }
    const header=box(headW,0.16,0.14,M(BEAM)); header.position.set(0,2.62,pZ); C.add(header);
    // small awning: a shallow gold slab sloping down from the wall to the header
    const aw=box(awW,0.1,1.6,M(GOLD)); aw.position.set(0,2.72,-hd-0.75); aw.rotation.x=-0.28; C.add(aw);
    if(mergeFn){ const geos=[]; for(let i=1;i<4;i++){ const q=new THREE.BoxGeometry(awW-0.1,0.03,0.05);
        q.translate(0,0.06,-0.8+i*0.4); geos.push(q); } const mg=mergeFn(geos,false);
      if(mg){ const cc=new THREE.Mesh(mg,M(GOLD_D)); cc.position.set(0,2.72,-hd-0.75); cc.rotation.x=-0.28; C.add(cc); } }

    // --- hanging "Quests" SIGN under the awning ---
    if(!SIGN_TEX) SIGN_TEX=signTex();
    const sign=new THREE.Group();
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.7,0.06),
      new THREE.MeshPhongMaterial({map:SIGN_TEX,flatShading:true,shininess:0,specular:0x000000}));
    board.castShadow=true; sign.add(board);
    const fr=box(1.5,0.09,0.08,M(BEAM)); fr.position.y=0.4; sign.add(fr);
    const fr2=box(1.5,0.09,0.08,M(BEAM)); fr2.position.y=-0.4; sign.add(fr2);
    for(const s of [-1,1]){ const chain=box(0.03,0.34,0.03,M(0x2a2a2e)); chain.position.set(s*0.5,0.55,0); sign.add(chain); }
    sign.position.set(0,2.05,pZ-0.05); C.add(sign);

    // --- QUEST NOTICE BOARD beside the door (framed cork board + pinned colour notes) ---
    const nb=new THREE.Group();
    for(const s of [-1,1]){ const leg=box(0.1,1.2,0.1,woodMat(TIMBER)); leg.position.set(s*0.55,0.6,0); nb.add(leg); }
    const panel=box(1.35,1.0,0.09,woodMat(0x8a6a44)); panel.position.y=1.35; nb.add(panel);
    const rim=box(1.5,1.15,0.06,M(BEAM)); rim.position.set(0,1.35,-0.02); nb.add(rim);
    const gable=new THREE.Mesh(new THREE.CylinderGeometry(0.001,0.8,0.4,3,1),M(GOLD));
    gable.rotation.z=Math.PI; gable.scale.z=0.3; gable.position.y=2.05; nb.add(gable);  // little roof over the board
    const noteCols=[0xd8c79a,0xe8b0a0,0xa0c0d8,0xc8d8a0,0xe0d0e8];   // pinned quest slips
    let ni=0; for(let r=0;r<2;r++) for(let c2=0;c2<3;c2++){ if(ni>=5) break;
      const note=box(0.3,0.34,0.02,M(noteCols[ni]));
      note.position.set(-0.42+c2*0.42, 1.62-r*0.46, 0.06); note.rotation.z=(Math.random()-0.5)*0.18; nb.add(note); ni++; }
    nb.position.set(1.9, 0, -hd-0.06); nb.rotation.y=Math.PI;   // face outward (north)
    C.add(nb);

    // --- BENCH + BARREL on the porch (reuse Buildkit furniture builders) ---
    if(Buildkit.furniture){
      const bench=Buildkit.furniture.bench(Buildkit); bench.position.set(-2.5,0.1,-hd-0.55); bench.rotation.y=Math.PI/2; C.add(bench);
      const barrel=Buildkit.furniture.barrel(Buildkit); barrel.position.set(2.5,0.1,-hd-0.4); C.add(barrel);
    }

    // --- LANTERNS hung on the porch posts ---
    for(const s of [-1,1]){ const L=lantern(); L.position.set(s*postX,2.5,pZ+0.14); C.add(L); }

    // --- window PLANTERS + SHUTTERS on the side/back walls (warmth) ---
    function planter(px,pz,ry){
      const g=new THREE.Group();
      const boxm=box(1.0,0.24,0.26,woodMat(0x5a3f24)); boxm.position.y=1.0; g.add(boxm);
      for(let i=0;i<5;i++){ const lob=new THREE.Mesh(new THREE.IcosahedronGeometry(0.11+Math.random()*0.05,0),M(0x4a7a34));
        lob.position.set(-0.36+i*0.18,1.18,0); g.add(lob);
        const fl=new THREE.Mesh(new THREE.IcosahedronGeometry(0.05,0),M([0xe85c5c,0xf1c24a,0xf07ab0][i%3]));
        fl.position.set(-0.36+i*0.18,1.26,0.02); g.add(fl); }
      // flanking shutters
      for(const s of [-1,1]){ const sh=box(0.32,1.0,0.06,woodMat(0x6a4a2c)); sh.position.set(s*0.78,1.7,-0.02);
        sh.rotation.y=s*0.12; g.add(sh); }
      g.position.set(px,0,pz); g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); return g;
    }
    C.add(planter(-hw-0.02, -0.9, -Math.PI/2));   // west wall
    C.add(planter( hw+0.02, -0.9,  Math.PI/2));   // east wall
    C.add(planter(0, hd+0.02, 0));                // south wall

    // --- COZY LODGE INTERIOR: door is on -z (north); table sits toward +z away from the
    //     door, so the entry lane stays clear. Pieces are decorative (no floor colliders). ---
    { // walk surface inside = the Holm LEVEL-PAD slab, world top 2.46 (measured in-engine
      // 2026-07-08; see tut_bld_chef note) — seat interior pieces on it, not on gy()
      const PAD_TOP=2.46;
      const iy=(lx,lz)=>PAD_TOP+0.05-baseY;
      const F=(name,lx,lz,r,opt)=>{ const p=Buildkit.furniture[name](Buildkit,opt);
        p.position.set(lx,iy(lx,lz),lz); if(r) p.rotation.y=r;
        p.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); C.add(p); return p; };
      F('rug', 0, 1.4);
      // Mixar hero props (sprint 2026-07-08): map-strewn quest table (replaces kit table+candles)
      // + a parchment notice board against the west wall facing the room
      const GP=(url,h,lx,lz,r)=>{ const p=makeGlbModel(url,{height:h}); p.position.set(lx,iy(lx,lz),lz);
        if(r) p.rotation.y=r; C.add(p); return p; };
      GP('assets/models/tut_maptable.glb', 1.1, 0, 2.4, 0);
      GP('assets/models/tut_questboard.glb', 2.0, -4.6, 2.2, Math.PI/2);
      F('chair', 0, 1.5, 0); F('chair', 0, 3.3, Math.PI);
      F('chair', -1.3, 2.4, Math.PI/2); F('chair', 1.3, 2.4, -Math.PI/2);
      // hearth at the base of the east-wall chimney
      F('hearth', 5.7, 1.4, -Math.PI/2);
      // bookshelves on the west wall
      F('shelf', -5.7, -0.4, Math.PI/2);
      F('shelf', -5.7, 1.3, Math.PI/2);
      // a chest/crate + a barrel tucked in the corners
      F('crate', 5.4, -2.6); F('barrel', -5.4, 3.0);
    }

    // ---- 3) seat + rotate so the porch/door face out ----
    C.position.set(x, baseY, z); C.rotation.y=rot;
    C.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
    scene.add(C);

    // ---- porch-post + barrel colliders (rotate local -> world about (x,z)) ----
    if(typeof addCircleCollider==='function'){
      const cs=Math.cos(rot), sn=Math.sin(rot);
      const rp=(lx,lz)=>[x + lx*cs + lz*sn, z - lx*sn + lz*cs];
      [[-postX,pZ],[postX,pZ],[2.5,-hd-0.4],[hw-0.5,1.4]].forEach(([lx,lz])=>{
        const [wx,wz]=rp(lx,lz); addCircleCollider(wx,wz,0.28); });
    }
    return C;
  };
})();
