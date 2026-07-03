/* ============ WARDENHOLM KEEP — the moated island castle (MAP_PIPELINE flagship) ============
 * Seat of the Wardens' Guild, on its own moated island east of the Commons.
 * Built to the Jagex blueprint (research 2026-07-02): one bridge with a warden ON it,
 * read-only moat, floor = function (ground public / middle power / top reward),
 * two staircases + tower ladder, kitchen trapdoor → undercroft quest socket,
 * 8-15 objects per room, ranked garrison as decor+gym, courtyard centerpiece +
 * statuary with lore examines, a fight ring with house rules, one absurd object.
 *
 * Contents: curtain wall w/ WALKABLE ramparts + 4 corner towers (walkable tops),
 * gatehouse, great hall / kitchen / throne room / study / armory, Lady Maren's
 * tower chamber (plane 2), the Proving Ring (sparring knights), training garrison,
 * undercroft (plane -1, far offset): Old Halbrec's cell + the chained Oathbreaker.
 * Quest: 'undercroft_oath' (game1_data). Zone: 'wardenholm'. Road: PATHS.
 */
(function(){
  const C={x:77, z:0};                    // keep centre (map-anchored: east of the Commons)
  const UND={x:330, z:330};               // undercroft, far off the charted map (OSRS +6400 trick)
  let built=false;

  function build(){
    if(built) return true;
    if(typeof scene==='undefined' || typeof running==='undefined' || !running) return false;
    if(typeof Planes==='undefined' || typeof Buildkit==='undefined' || typeof spawnFriendly!=='function') return false;
    const g0=gy(C.x, C.z);
    const M=(c)=>new THREE.MeshLambertMaterial({color:c});
    const stoneT=(c)=>TEX&&TEX.stone?new THREE.MeshLambertMaterial({map:TEX.stone, color:c||0xffffff}):M(c||0x9a958c);
    const G=new THREE.Group(); scene.add(G);
    const box=(w,h,d,m,x,y,z2)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
      b.position.set(x,y,z2); b.castShadow=true; b.receiveShadow=true; G.add(b); return b; };

    /* ================= 1. THE MOAT (read-only, 3 tiles, bridged west) ================= */
    const IH=18;                          // island half-size (walls sit inside)
    const MO=IH+4;                        // moat outer edge
    // the water itself is TERRAIN now — game2_world carves a true ring around the
    // island (pass 020); the old floating plane ring + bank boxes are gone.
    // moat colliders: block both rims, leaving the bridge gap (west, z 2.2..5.8)
    const gapLo=C.z-1.8, gapHi=C.z+1.8;
    function moatColl(half){
      addRectCollider(C.x, C.z-half-2, half+4, 2.2);                        // north strip
      addRectCollider(C.x, C.z+half+2, half+4, 2.2);                        // south strip
      addRectCollider(C.x+half+2, C.z, 2.2, half+4);                        // east strip
      // west strip split around the bridge gap
      const wl=(gapLo-(C.z-half-4))/2, wh=((C.z+half+4)-gapHi)/2;
      addRectCollider(C.x-half-2, gapLo-wl, 2.2, wl);
      addRectCollider(C.x-half-2, gapHi+wh, 2.2, wh);
    }
    moatColl(IH);

    /* ================= 2. THE BRIDGE (one approach; a warden stands on it) ================= */
    const bx0=C.x-IH-4.5, bx1=C.x-IH+0.5;
    const deck=box(bx0<bx1?(bx1-bx0+2):6, 0.3, 3.6, stoneT(0xbdb4a4), (bx0+bx1)/2, g0+0.12, C.z);
    for(const s of [-1,1]){   // parapets + torch posts
      box(bx1-bx0+2, 0.5, 0.25, stoneT(0xa89e8c), (bx0+bx1)/2, g0+0.5, C.z+s*1.85);
      for(const tx of [bx0+0.5, (bx0+bx1)/2, bx1-0.5]){
        const post=box(0.16,1.1,0.16, M(0x46301d), tx, g0+1.0, C.z+s*1.85);
        const fl=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,5), new THREE.MeshBasicMaterial({color:0xffb050}));
        fl.position.set(tx, g0+1.72, C.z+s*1.85); G.add(fl);
      }
    }
    addRectCollider((bx0+bx1)/2, C.z-1.85, (bx1-bx0)/2+1, 0.2);
    addRectCollider((bx0+bx1)/2, C.z+1.85, (bx1-bx0)/2+1, 0.2);

    /* ================= 3. CURTAIN WALL + WALKABLE RAMPARTS ================= */
    const WH=17;                           // wall half-extent
    const WALL_H=3.4, WT=1.0;
    const wallMat=stoneT(0xa8a096);
    const gateLo=C.z-1.6, gateHi=C.z+1.6;  // gatehouse opening (west wall)
    // four walls (west split for the gate)
    box(WH*2+WT, WALL_H, WT, wallMat, C.x, g0+WALL_H/2, C.z-WH);
    box(WH*2+WT, WALL_H, WT, wallMat, C.x, g0+WALL_H/2, C.z+WH);
    box(WT, WALL_H, WH*2+WT, wallMat, C.x+WH, g0+WALL_H/2, C.z);
    const wSegN=(gateLo-(C.z-WH))/1, wSegS=((C.z+WH)-gateHi)/1;
    box(WT, WALL_H, wSegN, wallMat, C.x-WH, g0+WALL_H/2, C.z-WH+wSegN/2);
    box(WT, WALL_H, wSegS, wallMat, C.x-WH, g0+WALL_H/2, C.z+WH-wSegS/2);
    // gate lintel + portcullis bars
    box(WT+0.3, 1.2, gateHi-gateLo+0.6, wallMat, C.x-WH, g0+WALL_H-0.6, C.z);
    for(let i=0;i<5;i++) box(0.07, 2.0, 0.07, M(0x2a2a30), C.x-WH-0.42, g0+2.6, gateLo+0.35+i*(gateHi-gateLo-0.7)/4);
    // wall colliders (west split at gate)
    addRectCollider(C.x, C.z-WH, WH+0.6, WT/2+0.1);
    addRectCollider(C.x, C.z+WH, WH+0.6, WT/2+0.1);
    addRectCollider(C.x+WH, C.z, WT/2+0.1, WH+0.6);
    addRectCollider(C.x-WH, C.z-WH+wSegN/2, WT/2+0.1, wSegN/2);
    addRectCollider(C.x-WH, C.z+WH-wSegS/2, WT/2+0.1, wSegS/2);
    // crenellations + rampart floors (plane 1, y=g0+WALL_H)
    const cren=(len,x,z2,horiz)=>{ const n=Math.floor(len/1.4);
      for(let i=0;i<n;i++){ const off=-len/2+0.7+i*1.4;
        box(horiz?0.7:0.3, 0.55, horiz?0.3:0.7, wallMat, x+(horiz?off:(WT/2+0.1)* (x>C.x?1:-1)*0), g0+WALL_H+0.28, z2+(horiz?0:off)); } };
    // outer crenellation rows
    cren(WH*2, C.x, C.z-WH-0.35, true); cren(WH*2, C.x, C.z+WH+0.35, true);
    cren(WH*2, C.x+WH+0.35, C.z, false); cren(wSegN, C.x-WH-0.35, C.z-WH+wSegN/2, false); cren(wSegS, C.x-WH-0.35, C.z+WH-wSegS/2, false);
    // rampart walkway floors — one strip per side, plane 1. Each walkway is centred on a
    // TILE ROW (x/z ± .5 offsets) and 2 half-tiles wide, so the rim fences land on tile
    // boundaries and the walk row itself stays BFS-walkable (pad 0.42 clears a 1.0 gap).
    const rampY=g0+WALL_H+0.05;
    const walkSlab=(w,d,x,z2)=>{ const s=box(w,0.18,d, stoneT(0xb6ada0), x, rampY-0.06, z2); s.receiveShadow=true; return s; };
    const strips=[
      {x:C.x, z:C.z-WH+0.5, hw:WH+0.5, hd:1.0},
      {x:C.x, z:C.z+WH-0.5, hw:WH+0.5, hd:1.0},
      {x:C.x+WH-0.5, z:C.z, hw:1.0, hd:WH+0.5},
      {x:C.x-WH+0.5, z:C.z-WH+wSegN/2, hw:1.0, hd:wSegN/2},
      {x:C.x-WH+0.5, z:C.z+WH-wSegS/2, hw:1.0, hd:wSegS/2},
    ];
    for(const s of strips){
      walkSlab(s.hw*2, s.hd*2, s.x, s.z);
      Planes.addFloor({plane:1, x:s.x, z:s.z, hw:s.hw, hd:s.hd, y:rampY});
    }
    // rampart circuit fencing: continuous OUTER parapet, INNER fences shortened 2 tiles
    // at each end so the walkway turns every corner; end caps close the gatehouse gap
    const AC=(x,z2,hw,hd)=>Planes.addCollider({type:'rect', plane:1, x, z:z2, hw, hd});
    AC(C.x, C.z-WH-0.5, WH+1.0, 0.1); AC(C.x, C.z+WH+0.5, WH+1.0, 0.1);          // N/S outer
    AC(C.x+WH+0.5, C.z, 0.1, WH+1.0); AC(C.x-WH-0.5, C.z, 0.1, WH+1.0);          // E/W outer
    AC(C.x, C.z-WH+1.5, WH-2.0, 0.1); AC(C.x, C.z+WH-1.5, WH-2.0, 0.1);          // N/S inner
    AC(C.x+WH-1.5, C.z, 0.1, WH-2.0);                                              // E inner
    AC(C.x-WH+1.5, C.z-WH+wSegN/2+1.0, 0.1, wSegN/2-2.0);                          // W inner (north half)
    AC(C.x-WH+1.5, C.z+WH-wSegS/2-1.0, 0.1, wSegS/2-2.0);                          // W inner (south half)
    AC(C.x-WH+0.5, gateLo-0.4, 1.1, 0.1); AC(C.x-WH+0.5, gateHi+0.4, 1.1, 0.1);   // gate-gap end caps
    // stairs up to the rampart: NE and SW of the courtyard (two circulations, per the blueprint)
    function rampStair(sx, sz, destX, destZ, ry){
      const st=new THREE.Group();
      for(let i=0;i<6;i++){ const step=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,0.62), stoneT(0xb0a898));
        step.position.set(0, 0.25+i*0.52, -i*0.58); step.castShadow=true; st.add(step); }
      st.position.set(sx, g0, sz); st.rotation.y=ry||0; G.add(st);
      Planes.addClimb({x:sx, z:sz, h:0.2, name:'Stairs', label:'Climb <b>Stairs</b>',
        mesh:new THREE.Group(),
        up:{plane:1, x:destX, z:destZ}, down:{plane:0, x:sx+Math.sin(ry||0)*1.2, z:sz+Math.cos(ry||0)*1.2}});
      addRectCollider(sx, sz-1.7, 0.9, 1.8);
    }
    rampStair(C.x+WH-2.5, C.z-WH+4.4, C.x+WH-0.5, C.z-WH+2.5, 0);
    rampStair(C.x-WH+3.5, C.z+WH-4.4, C.x-WH+0.5, C.z+WH-2.5, Math.PI);

    /* ================= 4. CORNER TOWERS (walkable tops, plane 2) ================= */
    const TWR_H=5.6;
    for(const [tx,tz] of [[C.x-WH,C.z-WH],[C.x+WH,C.z-WH],[C.x-WH,C.z+WH],[C.x+WH,C.z+WH]]){
      const t=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.7,TWR_H,8), stoneT(0x9e968a));
      t.position.set(tx, g0+TWR_H/2, tz); t.castShadow=true; G.add(t);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,0.4,8), stoneT(0xb0a898));
      cap.position.set(tx, g0+TWR_H+0.2, tz); G.add(cap);
      for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
        box(0.5,0.55,0.3, wallMat, tx+Math.cos(a)*2.55, g0+TWR_H+0.65, tz+Math.sin(a)*2.55).rotation.y=-a; }
      // pennant
      const pole=box(0.07,1.6,0.07, M(0x46301d), tx, g0+TWR_H+1.2, tz);
      const flag=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.5), new THREE.MeshBasicMaterial({color:0x8a3030, side:THREE.DoubleSide}));
      flag.position.set(tx+0.5, g0+TWR_H+1.7, tz); G.add(flag);
      addCircleCollider(tx, tz, 2.6);
      const tf=Planes.addFloor({plane:2, x:tx, z:tz, hw:1.9, hd:1.9, y:g0+TWR_H+0.4});
      Planes.edgeFence(tf);
      // ladder from the rampart to the tower top (base + return land ON the walk row)
      const rx=tx+(tx<C.x?1.5:-1.5), rz=tz+(tz<C.z?0.5:-0.5);
      Planes.addClimb({x:rx, z:rz, h:2.4, basePlane:1, y:rampY, name:'Tower ladder',
        up:{plane:2, x:tx, z:tz}, down:{plane:1, x:tx+(tx<C.x?2.5:-2.5), z:rz}});
    }

    /* ================= 5. THE KEEP (east bailey: hall/kitchen + power floor + Maren's tower) ================= */
    const K={x:C.x+6, z:C.z-3, w:16, d:12};
    const kMat=stoneT(0xaaa298);
    const KH=2.6;
    const kIdx=WORLD.interiors.length;
    // ground shell: four walls with a west door
    box(K.w, KH, 0.5, kMat, K.x, g0+KH/2, K.z-K.d/2);
    box(K.w, KH, 0.5, kMat, K.x, g0+KH/2, K.z+K.d/2);
    box(0.5, KH, K.d, kMat, K.x+K.w/2, g0+KH/2, K.z);
    const dLo=K.z+1.0, dHi=K.z+3.2;
    box(0.5, KH, (dLo-(K.z-K.d/2)), kMat, K.x-K.w/2, g0+KH/2, K.z-K.d/2+(dLo-(K.z-K.d/2))/2);
    box(0.5, KH, ((K.z+K.d/2)-dHi), kMat, K.x-K.w/2, g0+KH/2, K.z+K.d/2-((K.z+K.d/2)-dHi)/2);
    box(0.6, 0.8, dHi-dLo+0.4, kMat, K.x-K.w/2, g0+KH-0.4, (dLo+dHi)/2);
    addRectCollider(K.x, K.z-K.d/2, K.w/2+0.2, 0.35);
    addRectCollider(K.x, K.z+K.d/2, K.w/2+0.2, 0.35);
    addRectCollider(K.x+K.w/2, K.z, 0.35, K.d/2+0.2);
    addRectCollider(K.x-K.w/2, K.z-K.d/2+(dLo-(K.z-K.d/2))/2, 0.35, (dLo-(K.z-K.d/2))/2);
    addRectCollider(K.x-K.w/2, K.z+K.d/2-((K.z+K.d/2)-dHi)/2, 0.35, ((K.z+K.d/2)-dHi)/2);
    // interior partition: kitchen NW
    box(6, KH, 0.35, kMat, K.x-K.w/2+3, g0+KH/2, K.z-K.d/2+4);
    addRectCollider(K.x-K.w/2+3, K.z-K.d/2+4, 2.4, 0.25);   // leave a doorway east of it
    // storey 2 (power floor) shell + floor slab
    const s2=new THREE.Group(); s2.position.y=KH;
    const w2=(w,h,d,x,y,z2)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), kMat);
      m.position.set(x-K.x, y, z2-K.z); m.castShadow=true; s2.add(m); };
    w2(K.w, KH, 0.5, K.x, KH/2, K.z-K.d/2); w2(K.w, KH, 0.5, K.x, KH/2, K.z+K.d/2);
    w2(0.5, KH, K.d, K.x+K.w/2, KH/2, K.z); w2(0.5, KH, K.d, K.x-K.w/2, KH/2, K.z);
    const slab=new THREE.Mesh(new THREE.BoxGeometry(K.w-0.4, 0.16, K.d-0.4), M(0x8a6a48));
    slab.position.y=0.08; slab.receiveShadow=true; s2.add(slab);
    // windows on storey 2
    for(const s of [-1,1]){ const glass=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.08),
      new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
      glass.position.set(s*K.w*0.25, KH*0.55, K.d/2+0.28); s2.add(glass);
      const glass2=glass.clone(); glass2.position.z=-K.d/2-0.28; s2.add(glass2); }
    s2.position.x=K.x; s2.position.z=K.z; s2.position.y=g0+KH; G.add(s2);
    // storey 3 (visual only — no plane; raises the keep to the map's tall silhouette)
    const s3=new THREE.Group();
    const w3f=(w,h,d,x,y,z2)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), kMat);
      m.position.set(x-K.x, y, z2-K.z); m.castShadow=true; s3.add(m); };
    w3f(K.w, KH, 0.5, K.x, KH/2, K.z-K.d/2); w3f(K.w, KH, 0.5, K.x, KH/2, K.z+K.d/2);
    w3f(0.5, KH, K.d, K.x+K.w/2, KH/2, K.z); w3f(0.5, KH, K.d, K.x-K.w/2, KH/2, K.z);
    for(const sx3 of [-1,1]) for(const sz3 of [-1,1]){       // tall arched windows, all faces
      const gl3=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.2,0.08),
        new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
      gl3.position.set(sx3*K.w*0.25, KH*0.5, sz3*(K.d/2+0.28)); s3.add(gl3);
      const gl4=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.2,0.8),
        new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
      gl4.position.set(sx3*(K.w/2+0.28), KH*0.5, sz3*K.d*0.2); s3.add(gl4);
    }
    s3.position.set(K.x, g0+KH*2, K.z); G.add(s3);
    // Maren's tower: NE corner of the keep, one more storey (plane 2)
    const T={x:K.x+K.w/2-2.5, z:K.z-K.d/2+2.5};
    const tw=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.9,KH*3+2.2,8), stoneT(0xb4aa9c));
    tw.position.set(T.x, g0+(KH*3+2.2)/2, T.z); tw.castShadow=true; G.add(tw);
    const twCap=new THREE.Mesh(new THREE.ConeGeometry(3.1,3.2,8), M(0x4a6f93));   // the map's BLUE spire
    twCap.position.set(T.x, g0+KH*3+2.2+1.5, T.z); twCap.castShadow=true; G.add(twCap);
    addCircleCollider(T.x, T.z, 2.6);
    // keep roof (flat, crenellated) — registered for roof-lift
    const roofG=new THREE.Group();
    const kroof=new THREE.Mesh(new THREE.BoxGeometry(K.w+0.6, 0.3, K.d+0.6), stoneT(0x8e867a));
    kroof.position.set(K.x, g0+KH*3+0.15, K.z); roofG.add(kroof);
    for(let i=0;i<Math.floor(K.w/1.4);i++){
      const c1=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.3), wallMat);
      c1.position.set(K.x-K.w/2+0.7+i*1.4, g0+KH*3+0.55, K.z-K.d/2-0.15); roofG.add(c1);
      const c2=c1.clone(); c2.position.z=K.z+K.d/2+0.15; roofG.add(c2);
    }
    // the GREAT SPIRE (map silhouette: the castle's dominant blue-capped tower) —
    // rides in roofG so it lifts away with the keep roof when you step inside
    const gsX=K.x-3.5, gsZ=K.z+2;
    const drum=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.4,4.2,8), stoneT(0xb4aa9c));
    drum.position.set(gsX, g0+KH*3+2.1, gsZ); drum.castShadow=true; roofG.add(drum);
    const drumTrim=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,0.35,8), stoneT(0x8e867a));
    drumTrim.position.set(gsX, g0+KH*3+4.15, gsZ); roofG.add(drumTrim);
    const spire=new THREE.Mesh(new THREE.ConeGeometry(2.8,4.6,8), M(0x4a6f93));
    spire.position.set(gsX, g0+KH*3+6.6, gsZ); spire.castShadow=true; roofG.add(spire);
    const finial=new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), M(0xd8c26a));
    finial.position.set(gsX, g0+KH*3+9.0, gsZ); roofG.add(finial);
    // spire windows (warm, high — read from the town across the moat)
    for(const a of [Math.PI*0.75, Math.PI*1.5]){
      const w3=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.8,0.1),
        new THREE.MeshLambertMaterial({color:0xffe6a0, emissive:0x6a4e16}));
      w3.position.set(gsX+Math.cos(a)*2.3, g0+KH*3+2.6, gsZ+Math.sin(a)*2.3);
      w3.rotation.y=-a+Math.PI/2; roofG.add(w3);
    }
    G.add(roofG);
    WORLD.interiors.push({x:K.x, z:K.z, hw:K.w/2+0.3, hd:K.d/2+0.3, roof:roofG, band:s2});
    // keep floor-1 walkable (plane 1) + stairs (two: hall north + south)
    const kf=Planes.addFloor({plane:1, x:K.x, z:K.z, hw:K.w/2-0.6, hd:K.d/2-0.6, y:g0+KH+0.16});
    Planes.edgeFence(kf);
    Planes.addClimb({x:K.x+K.w/2-1.4, z:K.z+K.d/2-1.2, h:KH+0.2, name:'Stairs', label:'Climb <b>Stairs</b>',
      up:{plane:1, x:K.x+K.w/2-2.6, z:K.z+K.d/2-2.2}, down:{plane:0, x:K.x+K.w/2-2.6, z:K.z+K.d/2-2.2}});
    Planes.addClimb({x:K.x-K.w/2+1.4, z:K.z-K.d/2+5.2, h:KH+0.2, name:'Stairs', label:'Climb <b>Stairs</b>',
      up:{plane:1, x:K.x-K.w/2+2.6, z:K.z-K.d/2+5.8}, down:{plane:0, x:K.x-K.w/2+2.6, z:K.z-K.d/2+5.8}});
    // Maren's chamber floor (plane 2, tower top) + ladder from floor 1
    const mf=Planes.addFloor({plane:2, x:T.x, z:T.z, hw:2.0, hd:2.0, y:g0+KH*2+0.3});
    Planes.edgeFence(mf);
    Planes.addClimb({x:T.x-1.6, z:T.z+1.6, h:KH+0.4, basePlane:1, y:g0+KH+0.16, name:'Tower ladder',
      up:{plane:2, x:T.x, z:T.z+0.6}, down:{plane:1, x:T.x-2.2, z:T.z+2.2}});

    /* ---- furnish: ground = great hall + kitchen; floor 1 = throne + study + armory; tower = Maren ---- */
    const F=Buildkit.furniture, P=(name,x,z2,y,rot,opt)=>{ const m=F[name](Buildkit,opt);
      m.position.set(x, y, z2); if(rot) m.rotation.y=rot;
      m.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); G.add(m); return m; };
    // floor-1 dressing lives in its own group: hidden unless you're UP there —
    // otherwise thrones float in mid-air when the storey walls lift away (OSRS rule:
    // you never see the floor above you)
    const f1G=new THREE.Group(); G.add(f1G);
    Planes.addVisibilityRule(f1G, p=>p>=1);
    const P1=(name,x,z2,y,rot,opt)=>{ const m=F[name](Buildkit,opt);
      m.position.set(x, y, z2); if(rot) m.rotation.y=rot;
      m.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); f1G.add(m); return m; };
    // great hall (south/centre): long table = two tables, benches, hearth, candles, rug
    P('table', K.x-1.2, K.z+1.8, g0); P('table', K.x+0.1, K.z+1.8, g0);
    P('bench', K.x-0.6, K.z+2.6, g0); P('bench', K.x-0.6, K.z+1.0, g0);
    P('hearth', K.x+K.w/2-1.1, K.z+1.5, g0, -Math.PI/2);
    P('rug', K.x-0.6, K.z+1.8, g0, 0, 0x7a3a34);
    P('candle', K.x-3.6, K.z+3.6, g0); P('shelf', K.x-K.w/2+0.6, K.z+4.2, g0, Math.PI/2);
    P('crate', K.x+K.w/2-1.0, K.z+4.6, g0);
    // kitchen (NW): range-substitute hearth, barrels, crates, table
    P('hearth', K.x-K.w/2+1.0, K.z-K.d/2+1.2, g0, Math.PI/2);
    P('table', K.x-K.w/2+3.4, K.z-K.d/2+1.4, g0);
    P('barrel', K.x-K.w/2+1.0, K.z-K.d/2+3.0, g0); P('crate', K.x-K.w/2+1.8, K.z-K.d/2+3.2, g0);
    // floor 1: throne dais east, study west, armory racks north (all in f1G — plane-gated)
    const f1=g0+KH+0.16;
    const dais=new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 2.6), stoneT(0xb4aa9c));
    dais.position.set(K.x+K.w/2-2.4, f1+0.15, K.z+0.4); dais.castShadow=true; f1G.add(dais);
    const throne=new THREE.Group();
    const tSeat=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.5,0.8), M(0x6a3a5a)); tSeat.position.y=0.55; throne.add(tSeat);
    const tBack=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.6,0.16), M(0x6a3a5a)); tBack.position.set(0,1.3,-0.34); throne.add(tBack);
    const tTrim=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.14,0.9), M(0xd8b23a)); tTrim.position.y=0.32; throne.add(tTrim);
    throne.position.set(K.x+K.w/2-2.4, f1+0.3, K.z+0.4); throne.traverse(o=>{if(o.isMesh)o.castShadow=true;}); f1G.add(throne);
    P1('rug', K.x+K.w/2-3.6, K.z+0.4, f1, 0, 0x3a4a6a);
    P1('candle', K.x+K.w/2-1.2, K.z-2.2, f1); P1('candle', K.x+K.w/2-1.2, K.z+2.8, f1);
    P1('shelf', K.x-K.w/2+0.8, K.z-1.5, f1, Math.PI/2); P1('shelf', K.x-K.w/2+0.8, K.z+0.5, f1, Math.PI/2);
    P1('table', K.x-K.w/2+2.6, K.z+2.4, f1); P1('chair', K.x-K.w/2+3.4, K.z+2.4, f1, -Math.PI/2);
    P1('crate', K.x-1.0, K.z-K.d/2+1.2, f1); P1('barrel', K.x+0.2, K.z-K.d/2+1.1, f1);
    // Maren's chamber (tower top)
    const mfY=g0+KH*2+0.3;
    P('bed', T.x-0.6, T.z-0.6, mfY); P('candle', T.x+1.0, T.z-1.0, mfY);
    P('rug', T.x, T.z+0.6, mfY, 0, 0x6a3a5a);

    /* ================= 6. COURTYARD: well, statues, fight ring, garrison, chicken ================= */
    // centerpiece well
    const well=new THREE.Group();
    const wellBase=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.1,0.9,8), stoneT(0x9a958c)); wellBase.position.y=0.45; well.add(wellBase);
    const wellRoof=new THREE.Mesh(new THREE.ConeGeometry(1.2,0.7,6), M(0x7a5a34)); wellRoof.position.y=1.9; well.add(wellRoof);
    for(const s of [-1,1]){ const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.3,0.12), M(0x46301d)); post.position.set(s*0.8,1.1,0); well.add(post); }
    well.position.set(C.x-6, g0, C.z-6); well.traverse(o=>{if(o.isMesh)o.castShadow=true;});
    well.userData={kind:'well', label:'Drink from <b>Warden’s Well</b>'};
    G.add(well); WORLD.clickables.push(well); addCircleCollider(C.x-6, C.z-6, 1.2);
    // statues with lore examines
    function statue(x,z2,examine){
      const st=new THREE.Group();
      const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.7,1.0), stoneT(0x8e867a)); plinth.position.y=0.35; st.add(plinth);
      const figure=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.34,1.5,6), M(0xb0aa9e)); figure.position.y=1.45; st.add(figure);
      const head=new THREE.Mesh(new THREE.SphereGeometry(0.24,6,5), M(0xb0aa9e)); head.position.y=2.35; st.add(head);
      const sword=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.2,0.08), M(0x9a948a)); sword.position.set(0.4,1.4,0); st.add(sword);
      st.position.set(x, g0, z2); st.traverse(o=>{if(o.isMesh)o.castShadow=true;});
      st.userData={kind:'prop', examine};
      G.add(st); WORLD.clickables.push(st); addCircleCollider(x, z2, 0.75);
    }
    statue(C.x-WH+3, C.z-2.2, 'The First Warden. The plaque is worn to a single word: "HOLD."');
    statue(C.x-WH+3, C.z+2.2, 'A warden of the Scarring years. Her shield is carved with tally marks — one per year held.');
    // the Proving Ring (fight ring w/ house rules)
    const R={x:C.x-8, z:C.z+9, r:4.6};
    const sand=new THREE.Mesh(new THREE.CircleGeometry(R.r,20), M(0xd2bc86));
    sand.rotation.x=-Math.PI/2; sand.position.set(R.x, g0+0.04, R.z); sand.receiveShadow=true; G.add(sand);
    for(let i=0;i<14;i++){ const a=i/14*Math.PI*2;
      if(a>0.4 && a<1.0) continue;                        // ring entrance (NE)
      const post=box(0.14,1.0,0.14, M(0x46301d), R.x+Math.cos(a)*R.r, g0+0.5, R.z+Math.sin(a)*R.r);
      addCircleCollider(post.position.x, post.position.z, 0.22);
    }
    P('bench', R.x+R.r+1.6, R.z-1.2, g0, Math.PI/2); P('bench', R.x+R.r+1.6, R.z+1.2, g0, Math.PI/2);
    // garrison: ranked, attackable, spread through the bailey
    const spawnN=(t,x,z2)=>{ const n=(typeof spawnNpc==='function')?spawnNpc(t,x,z2):null; return n; };
    spawnN('hold_knight', R.x-1.2, R.z-0.8); spawnN('hold_knight', R.x+1.2, R.z+0.8);   // sparring pair in the ring
    spawnN('cn_guard', C.x-WH+2.2, C.z-0.2); spawnN('cn_guard', C.x-2, C.z-WH+2.5);
    spawnN('cn_guard', C.x-2, C.z+WH-2.5); spawnN('hold_knight', C.x+WH-3, C.z+WH-3);
    spawnN('cn_goldknight', K.x-K.w/2-2.5, K.z+2.2);                                     // the captain by the keep door
    spawnN('pasturehen', C.x-10, C.z-1);                                                  // the absurd object (Falador chicken law)
    // friendlies
    spawnFriendly('osric','Bridge Warden Osric', (bx0+bx1)/2+0.5, C.z-0.8, 0x5a6a8a, '🛡️');
    spawnFriendly('brand','Pit Master Brand', R.x+R.r+1.2, R.z-2.6, 0x8a4a3a, '🥊');
    spawnFriendly('maren','Lady Maren', T.x+0.8, T.z-0.4, 0x8a5a7a, '👑');
    // Maren lives on plane 2 — tag + lift her
    const marenF=WORLD.friendlies.find(f=>f.id==='maren');
    if(marenF){ marenF.mesh.position.y=mfY; marenF.mesh.userData.plane=2; }

    /* ================= 7. THE UNDERCROFT (plane -1, far offset): Halbrec + the Oathbreaker ============ */
    const cell=Planes.addCave({x:UND.x, z:UND.z, hw:6, hd:5, y:0, plane:-1, rock:0x4a4238});
    const dun =Planes.addCave({x:UND.x+15, z:UND.z, hw:7, hd:6, y:0, plane:-1, rock:0x3e3630});
    // a passage between the two rooms (gap in the shared walls + connecting floor)
    const pass=Planes.addFloor({plane:-1, x:UND.x+7.5, z:UND.z, hw:2.6, hd:1.2, y:0});
    box(5.4, 3.2, 0.5, M(0x4a4238), UND.x+7.5, 1.6, UND.z-1.4);
    box(5.4, 3.2, 0.5, M(0x4a4238), UND.x+7.5, 1.6, UND.z+1.4);
    const passCeil=box(5.6, 0.4, 3.2, M(0x2e2820), UND.x+7.5, 3.2, UND.z);
    addRectCollider(UND.x+7.5, UND.z-1.4, 2.8, 0.35); addRectCollider(UND.x+7.5, UND.z+1.4, 2.8, 0.35);
    // Halbrec's cell micro-story: cot, brazier, shelves, broom-and-bucket clutter
    P('bed', UND.x-4.2, UND.z-3.0, 0); P('shelf', UND.x-5.2, UND.z+1.5, 0, Math.PI/2);
    P('crate', UND.x+4.2, UND.z+3.4, 0); P('barrel', UND.x+4.8, UND.z+2.6, 0);
    P('candle', UND.x-2.5, UND.z+3.5, 0); P('rug', UND.x-3, UND.z-1.5, 0, 0, 0x4a3a2a);
    spawnFriendly('halbrec','Old Halbrec', UND.x-2, UND.z-1, 0x6a6a5a, '🧙');
    const halF=WORLD.friendlies.find(f=>f.id==='halbrec');
    if(halF){ halF.mesh.position.y=0; halF.mesh.userData.plane=-1; }
    // the dungeon: chained Oathbreaker between two anchor pillars
    for(const s of [-1,1]){
      const pillar=box(0.8, 3.0, 0.8, stoneT(0x5a544a), UND.x+15+s*3.4, 1.5, UND.z-2);
      // chain links from pillar toward the boss
      for(let i=1;i<=4;i++){
        const link=new THREE.Mesh(new THREE.TorusGeometry(0.16,0.05,4,8), M(0x3a3a44));
        link.position.set(UND.x+15+s*(3.4-i*0.7), 1.2-i*0.12, UND.z-2+i*0.28);
        link.rotation.set(Math.PI/2*(i%2), i*0.6, 0); G.add(link);
      }
    }
    const boss=spawnN('oathbreaker', UND.x+15, UND.z-0.6);
    if(boss){ boss.plane=-1; boss.mesh.position.y=0; }
    // trapdoor (keep kitchen) ↔ undercroft ladder
    Planes.addClimb({x:K.x-K.w/2+2.2, z:K.z-K.d/2+2.4, h:0.1, name:'Trapdoor', label:'Climb-down <b>Trapdoor</b>',
      mesh:(()=>{ const t=new THREE.Group();
        const lid=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.09,0.95), M(0x5a4226)); lid.position.y=0.09; t.add(lid);
        const ring2=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.03,4,8), M(0x3a3a44));
        ring2.position.set(0.25,0.14,0); ring2.rotation.x=Math.PI/2; t.add(ring2); return t; })(),
      down:{plane:-1, x:UND.x, z:UND.z+2.5}});
    Planes.addClimb({x:UND.x+1.5, z:UND.z+3.6, h:2.8, basePlane:-1, y:0, name:'Ladder', label:'Climb-up <b>Ladder</b>',
      up:{plane:0, x:K.x-K.w/2+3.2, z:K.z-K.d/2+2.4}});

    /* ================= 8. DIALOGUE + QUEST WIRING ================= */
    const origTalk=(typeof talkTo==='function')?talkTo:null;
    if(origTalk){
      talkTo=function(id, name, face){
        if(id==='osric'){
          UI.dialogue(name,'Welcome to Wardenholm, traveller. One bridge in, one bridge out — the Guild likes it that way. The Proving Ring takes challengers, and the well is sweet.',
            [{label:'What is this place?', fn:()=>UI.dialogue(name,'Seat of the Wardens’ Guild. Walls to hold the line, a ring to sharpen it, and things below best left chained.',[{label:'Farewell.'}],face)},
             {label:'Farewell.'}], face); return;
        }
        if(id==='pip'){
          UI.dialogue(name,'Polish, polish, polish. The captain says a squire who can see his face in a breastplate is halfway to a knight. I say the captain likes looking at his face.',
            [{label:'Keep at it, squire.'},{label:'Farewell.'}], face); return;
        }
        if(id==='brand'){
          UI.dialogue(name,'The Proving Ring! House rules: what happens in the ring stays in the ring. Spar the knights inside whenever you fancy — when the realm links worlds, you’ll duel other adventurers here.',
            [{label:'I’ll test my blade.'},{label:'Farewell.'}], face); return;
        }
        if(id==='maren'){
          const st=Quest.stageOf('undercroft_oath');
          if(st===3){
            UI.dialogue(name,'Halbrec’s blessing… then the oath is done, and the tower door is mine to open at last. Father kept me "safe" up here half my life. Take this — you’ve freed more than one of us today.',
              [{label:'It was an honour, my lady.', fn:()=>Quest.advance('undercroft_oath')}], face);
          } else {
            UI.dialogue(name,'Another visitor up the ladder! Father keeps me locked away "for my safety" — from up here I name the birds and count the carts on the bridge. Do hurry the world along, won’t you?',
              [{label:'I’ll see what I can do.'},{label:'Farewell.'}], face);
          }
          return;
        }
        if(id==='halbrec'){
          const st=Quest.stageOf('undercroft_oath');
          if(st===0 && Quest.canStart('undercroft_oath')){
            UI.dialogue(name,'Few find the old stair… I am Halbrec, once a warden, now a keeper of one last oath. That THING in the next room wore our colours once. My chains of duty hold while its chains of iron do. End it, and free us both.',
              [{label:'I will slay the Oathbreaker.', fn:()=>Quest.start('undercroft_oath')},   // stage 1 = the kill
               {label:'Not yet.'}], face);
            return;
          }
          if(st===1){
            UI.dialogue(name,'It waits beyond the passage, past where the chains are bolted. Strike true — a century of oaths ride on it.',
              [{label:'It will be done.'}], face);
            return;
          }
          if(st===2){
            UI.dialogue(name,'The chains lie still… a century of watching, done. Carry my blessing up to the Lady in the tower — her door was bound to the same oath, though she never knew it.',
              [{label:'I will tell her.', fn:()=>Quest.advance('undercroft_oath')}], face);
            return;
          }
          if(st===99){ UI.dialogue(name,'The undercroft is quiet now. I find I like the quiet.',[{label:'Rest well, warden.'}],face); return; }
          UI.dialogue(name,'The Oathbreaker waits beyond the passage. Mind the chains — they mark where its reach ends.',[{label:'Farewell.'}],face);
          return;
        }
        return origTalk(id, name, face);
      };
    }
    // stage 1 auto-advance on first talk uses the dialogue above; kill stage counts via Quest.onKill ✓
    // well: drinking is a small heal
    Interact.register({target:'kind:well', option:'Drink', walkTo:true, reach:2.2,
      handler(){ Player.hp=Math.min(Player.maxHp, Player.hp+3); UI.refreshHud();
        UI.chat('The well water is cold and sweet. You feel a little restored.','plain'); }});

    /* ================= 9. CASTLE PASS #1 — paving, structures, light, height, life ============ */
    // --- a real castle floor: flagstone courtyard with a bordered approach from gate to keep ---
    (function(){
      const paveT=TEX.stone?TEX.stone.clone():null;
      if(paveT){ paveT.needsUpdate=true; paveT.wrapS=paveT.wrapT=THREE.RepeatWrapping; paveT.repeat.set(14,14); }
      const paveMat=paveT?new THREE.MeshLambertMaterial({map:paveT, color:0xb8b0a2}):M(0xa8a096);
      // TERRAIN-HUGGING pave: subdivided plane, every vertex lifted to groundY+0.07 so
      // the flagstones follow the yard's undulation instead of sinking under it
      function hugPlane(w, d, cx, cz, mat, lift){
        const geo=new THREE.PlaneGeometry(w, d, Math.ceil(w/1.5), Math.ceil(d/1.5));
        geo.rotateX(-Math.PI/2);
        const pos=geo.attributes.position;
        for(let i=0;i<pos.count;i++){
          const vx=pos.getX(i)+cx, vz=pos.getZ(i)+cz;
          pos.setY(i, (groundY(vx,vz)||g0)+lift);
        }
        geo.computeVertexNormals();
        // vertices are LOCAL (±w/2); the mesh position carries them to the site
        const m=new THREE.Mesh(geo, mat); m.position.set(cx, 0, cz);
        m.receiveShadow=true; G.add(m); return m;
      }
      hugPlane((WH-1.2)*2, (WH-1.2)*2, C.x, C.z, paveMat, 0.07);
      // darker approach lane: gate → keep door
      const laneT=TEX.stone?TEX.stone.clone():null;
      if(laneT){ laneT.needsUpdate=true; laneT.wrapS=laneT.wrapT=THREE.RepeatWrapping; laneT.repeat.set(9,2); }
      hugPlane(WH*2-6, 3.4, C.x, (dLo+dHi)/2-1.0,
        laneT?new THREE.MeshLambertMaterial({map:laneT, color:0x8f8578}):M(0x8f8578), 0.1);
      // grass "garden squares" flanking the lane — TEXTURED turf, not a flat green slab
      for(const s of [[C.x-8, C.z-8],[C.x+2, C.z-9]]){
        const gT=TEX.grass?TEX.grass.clone():null;
        if(gT){ gT.needsUpdate=true; gT.wrapS=gT.wrapT=THREE.RepeatWrapping; gT.repeat.set(3,2.2); }
        hugPlane(7, 5, s[0], s[1], gT?new THREE.MeshLambertMaterial({map:gT}):M(0x6f8a48), 0.12);
      }
    })();
    // --- the old watch turret is RETIRED (pass 021): the Great Spire crowns the keep
    //     now. The kitchen chimney rides up to the raised roof. ---
    (function(){
      const chim=box(0.7,1.6,0.7, stoneT(0x8e867a), K.x+5.5, g0+KH*3+0.9, K.z-3.5);
      // the kitchen fire vents here — register so the atmosphere layer smokes it
      const vent=new THREE.Group(); vent.position.set(K.x+5.5, g0+KH*3+1.7, K.z-3.5);
      G.add(vent); if(WORLD.fires) WORLD.fires.push(vent);
    })();
    // --- more structures: stable lean-to (W wall), shrine of the Dawn (N wall), smithy corner (S) ---
    (function(){
      // stable: timber posts + sloped plank roof + hay + cart
      const SB={x:C.x-WH+3.4, z:C.z-8};
      for(const [px,pz] of [[SB.x-2,SB.z-2],[SB.x+2,SB.z-2],[SB.x-2,SB.z+2],[SB.x+2,SB.z+2]])
        box(0.18,2.2,0.18, M(0x46301d), px, g0+1.1, pz);
      const sroof=box(5.4,0.16,5.2, new THREE.MeshLambertMaterial({map:TEX.plank||null, color:0x8a6a44}), SB.x, g0+2.35, SB.z);
      sroof.rotation.z=0.12;
      const hay=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.9,0.9,7), M(0xC9A94E));
      hay.position.set(SB.x-1.1, g0+0.45, SB.z+0.9); hay.castShadow=true; G.add(hay);
      const hay2=hay.clone(); hay2.position.set(SB.x-0.2, g0+0.45, SB.z+1.2); G.add(hay2);
      P('crate', SB.x+1.4, SB.z-1.0, g0); P('barrel', SB.x+1.6, SB.z+0.6, g0);
      addRectCollider(SB.x, SB.z, 2.4, 2.4);
      // shrine: mini chapel-corner with a working altar (Prayer!)
      const SH={x:C.x+2, z:C.z-WH+3.2};
      const altar=new THREE.Group();
      const slab2=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.9,0.8), stoneT(0xcac2b4)); slab2.position.y=0.45; altar.add(slab2);
      const cloth=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.08,0.9), M(0xd8b23a)); cloth.position.y=0.92; altar.add(cloth);
      for(const s of [-1,1]){ const cnd=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.06,0.5,5), M(0xe8e2d0));
        cnd.position.set(s*0.6,1.2,0); altar.add(cnd);
        const fl2=new THREE.Mesh(new THREE.SphereGeometry(0.05,4,4), new THREE.MeshBasicMaterial({color:0xffe6a0}));
        fl2.position.set(s*0.6,1.5,0); altar.add(fl2); }
      altar.position.set(SH.x, g0, SH.z);
      altar.traverse(o=>{if(o.isMesh)o.castShadow=true;});
      altar.userData={kind:'altar'};
      G.add(altar); WORLD.clickables.push(altar); addRectCollider(SH.x, SH.z, 1.0, 0.6);
      for(const s of [-1,1]) P('bench', SH.x+s*1.6, SH.z+1.6, g0, 0);
      // smithy corner: anvil block + trough + tool crates under a small awning
      const SM={x:C.x+9, z:C.z+WH-3.4};
      const anvil=new THREE.Group();
      const aB=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.35), M(0x4a4a52)); aB.position.y=0.55; anvil.add(aB);
      const aT=new THREE.Mesh(new THREE.BoxGeometry(0.95,0.2,0.3), M(0x5a5a64)); aT.position.y=0.9; anvil.add(aT);
      const aBase=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.36,0.4,6), M(0x6a4a2f)); aBase.position.y=0.2; anvil.add(aBase);
      anvil.position.set(SM.x, g0, SM.z); anvil.traverse(o=>{if(o.isMesh)o.castShadow=true;});
      anvil.userData={kind:'prop', examine:'The Guild farrier\'s anvil. Someone has stamped tiny shields along its flank.'};
      G.add(anvil); WORLD.clickables.push(anvil); addCircleCollider(SM.x, SM.z, 0.5);
      const trough=box(1.4,0.4,0.6, M(0x6a4a2f), SM.x+1.6, g0+0.2, SM.z);
      P('crate', SM.x-1.4, SM.z+0.4, g0); P('barrel', SM.x-1.2, SM.z-0.8, g0);
    })();
    // --- good lighting: braziers flanking the gate lane + keep door, warm hall glow ---
    (function(){
      function brazier(x,z2){
        const b=new THREE.Group();
        const bowl=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.2,0.3,7), M(0x3a3a44)); bowl.position.y=1.05; b.add(bowl);
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,1.0,5), M(0x3a3a44)); leg.position.y=0.5; b.add(leg);
        const fl2=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.5,6), new THREE.MeshBasicMaterial({color:0xffa23a}));
        fl2.position.y=1.45; b.add(fl2);
        const li=new THREE.PointLight(0xff9a40, 0.85, 9); li.position.y=1.8; b.add(li);
        b.position.set(x, g0, z2); b.traverse(o=>{if(o.isMesh)o.castShadow=true;});
        G.add(b); addCircleCollider(x, z2, 0.3);
      }
      brazier(C.x-WH+2.2, gateLo-1.2); brazier(C.x-WH+2.2, gateHi+1.2);      // inside the gate
      brazier(K.x-K.w/2-1.2, dLo-0.8); brazier(K.x-K.w/2-1.2, dHi+0.8);      // keep door
      const hallGlow=new THREE.PointLight(0xffc070, 0.7, 12);
      hallGlow.position.set(K.x, g0+2.0, K.z+1.5); G.add(hallGlow);
      const throneGlow=new THREE.PointLight(0xd8a0ff, 0.5, 8);
      throneGlow.position.set(K.x+K.w/2-2.4, g0+KH+1.6, K.z+0.4); G.add(throneGlow);
    })();
    // --- life that makes sense: banners, servants, a patrol post ---
    (function(){
      for(const [bx,bz] of [[C.x-6, (dLo+dHi)/2-2.6],[C.x-1, (dLo+dHi)/2-2.6],[C.x+4, (dLo+dHi)/2-2.6]]){
        const pole=box(0.1,2.6,0.1, M(0x46301d), bx, g0+1.3, bz);
        const bn=new THREE.Mesh(new THREE.PlaneGeometry(0.7,1.1), new THREE.MeshBasicMaterial({color:0x8a3030, side:THREE.DoubleSide}));
        bn.position.set(bx+0.36, g0+2.0, bz); G.add(bn);
        const sig=new THREE.Mesh(new THREE.CircleGeometry(0.16,6), new THREE.MeshBasicMaterial({color:0xd8b23a, side:THREE.DoubleSide}));
        sig.position.set(bx+0.36, g0+2.1, bz+0.01); G.add(sig);
      }
      spawnFriendly('wat','Old Wat the Groom', C.x-WH+4.6, C.z-6.2, 0x7a6a4a, '👴');
      spawnFriendly('tilly','Tilly the Cook', K.x-K.w/2+2.0, K.z-K.d/2-1.2, 0xa06a4a, '👩‍🍳');
    })();

    /* ================= 10. DETAIL PASS #2 — interior wall decor, murder-hole, castle folk ============ */
    (function(){
      // ---- wall sconces (flame, no extra lights — the braziers carry the lighting) ----
      function sconce(x, z2, y, ry){
        const s=new THREE.Group();
        const arm=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.3,0.08), M(0x3a3a44)); arm.position.y=0.1; s.add(arm);
        const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.05,0.12,6), M(0x3a3a44)); cup.position.y=0.28; s.add(cup);
        const fl=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.22,5), new THREE.MeshBasicMaterial({color:0xffb050}));
        fl.position.y=0.44; s.add(fl);
        s.position.set(x, y, z2); if(ry) s.rotation.y=ry; G.add(s);
      }
      // great hall: sconces down both long walls (ground) + throne room (floor 1)
      for(const sx of [-4.5,-1,2.5,6]){
        sconce(K.x+sx, K.z+K.d/2-0.45, g0+1.9);
        sconce(K.x+sx, K.z-K.d/2+0.45, g0+1.9);
      }
      // floor-1 sconces ride the plane-gated group
      const sc1=new THREE.Group(), sc2=new THREE.Group();
      [sc1, sc2].forEach((sg,i)=>{
        const arm=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.3,0.08), M(0x3a3a44)); arm.position.y=0.1; sg.add(arm);
        const fl=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.22,5), new THREE.MeshBasicMaterial({color:0xffb050}));
        fl.position.y=0.44; sg.add(fl);
        sg.position.set(K.x+K.w/2-0.55, f1+1.9, i? K.z+2.8 : K.z-2.2); sg.rotation.y=Math.PI/2;
        f1G.add(sg);
      });
      // ---- portraits: framed panels of the First Wardens (hall walls) ----
      function portrait(x, z2, y, tint, ry){
        const p=new THREE.Group();
        const fr=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.0,0.06), M(0x5a4226)); p.add(fr);
        const cv=new THREE.Mesh(new THREE.BoxGeometry(0.66,0.86,0.07), M(tint)); cv.position.z=0.01; p.add(cv);
        const fig=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.16,0.5,5), M(0x4a4438)); fig.position.set(0,-0.08,0.05); p.add(fig);
        const hd=new THREE.Mesh(new THREE.SphereGeometry(0.09,5,4), M(0xb08d68)); hd.position.set(0,0.26,0.05); p.add(hd);
        p.position.set(x, y, z2); if(ry) p.rotation.y=ry;
        p.userData={kind:'prop', examine:'A stern Warden of years past. The eyes follow you — or the varnish does.'};
        G.add(p); WORLD.clickables.push(p);
      }
      portrait(K.x-3, K.z+K.d/2-0.4, g0+1.7, 0x6a5a3a, Math.PI);
      portrait(K.x+1, K.z+K.d/2-0.4, g0+1.7, 0x5a6a4a, Math.PI);
      portrait(K.x+4.5, K.z-K.d/2+0.4, g0+1.7, 0x4a5a6a);
      // ---- tapestries flanking the throne (floor 1, plane-gated) ----
      for(const s of [-1,1]){
        const tp=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.9),
          new THREE.MeshLambertMaterial({color:0x7a2e2e, side:THREE.DoubleSide}));
        tp.position.set(K.x+K.w/2-0.5, f1+1.5, K.z+0.4+s*2.2); tp.rotation.y=-Math.PI/2; f1G.add(tp);
        const sig2=new THREE.Mesh(new THREE.CircleGeometry(0.28,6),
          new THREE.MeshBasicMaterial({color:0xd8b23a, side:THREE.DoubleSide}));
        sig2.position.set(K.x+K.w/2-0.44, f1+1.6, K.z+0.4+s*2.2); sig2.rotation.y=-Math.PI/2; f1G.add(sig2);
      }
      // ---- trophy shields over the hall hearth ----
      for(let i=0;i<3;i++){
        const sh=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.06,6),
          M([0x8a3030,0x3a5a8a,0xd8b23a][i]));
        sh.rotation.z=Math.PI/2; sh.rotation.y=Math.PI/2;
        sh.position.set(K.x+K.w/2-0.5, g0+2.1, K.z+0.6+ (i-1)*0.75); G.add(sh);
      }
      // ---- the murder-hole: a grated chamber over the gate passage (two-room set piece) ----
      const MH={x:C.x-WH+0.5, z:(gateLo+gateHi)/2};
      const grate=new THREE.Group();
      for(let i=0;i<5;i++){ const bar=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.05,2.6), M(0x2a2a30));
        bar.position.set(-0.6+i*0.3, 0, 0); grate.add(bar); }
      for(let i=0;i<5;i++){ const bar=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.05,0.06), M(0x2a2a30));
        bar.position.set(0, 0.02, -1.1+i*0.55); grate.add(bar); }
      grate.position.set(MH.x, g0+WALL_H-0.35, MH.z);
      grate.userData={kind:'prop', examine:'A murder-hole over the gate. Wardens above, regrets below.'};
      G.add(grate); WORLD.clickables.push(grate);
      const stoneCrate=Buildkit.furniture.crate(Buildkit);
      stoneCrate.position.set(MH.x, rampY, MH.z-2.6); G.add(stoneCrate);
      // ---- castle folk: Squire Pip polishes armour by the floor-1 armory ----
      spawnFriendly('pip','Squire Pip', K.x-1.6, K.z-K.d/2+1.6, 0x9a8a5a, '🧒');
      const pipF=WORLD.friendlies.find(f=>f.id==='pip');
      if(pipF){ pipF.mesh.position.y=f1; pipF.mesh.userData.plane=1; }
      // ---- two more item spawns with reasons (registered if the system is up) ----
      if(typeof ItemSpawns!=='undefined'){
        ItemSpawns.TABLE.push({id:'hollow_ale', x:K.x-1.2, z:K.z+1.8, every:70, plane:0});   // ale on the hall table
        ItemSpawns.TABLE.push({id:'bones', x:42.5, z:17.5, every:55, plane:0});               // the graveyard keeps its dead... mostly
      }
      Planes.refreshVisibility();   // apply the floor-1 gate immediately (not on first climb)
    })();

    /* ================= CASTLE DETAIL PASS — depth + fountain + purposeful life ================= */
    (function castleDetail(){
      const trimMat=stoneT(0x928a80), slitMat=M(0x1b1916);
      // stepped buttress pier on the outer wall face — turns a flat box into read-as-masonry
      function buttress(x,z,nx,nz){
        box(1.1, WALL_H*0.92, 1.1, wallMat, x+nx*0.55, g0+WALL_H*0.46, z+nz*0.55);
        box(0.85, WALL_H*0.5, 0.85, wallMat, x+nx*0.8, g0+WALL_H*0.25, z+nz*0.8);
        box(1.26, 0.26, 1.26, trimMat, x+nx*0.55, g0+WALL_H*0.95, z+nz*0.55);   // sloped cap
        addCircleCollider(x+nx*0.66, z+nz*0.66, 0.6);
      }
      // recessed arrow-loop (thin dark vertical, proud of the face)
      function slit(x,z,horiz){ box(horiz?0.14:0.34, 1.0, horiz?0.34:0.14, slitMat, x, g0+WALL_H*0.55, z); }
      // string-course trim band running the length of a span
      function band(len,x,z,horiz){ box(horiz?len:WT+0.22, 0.16, horiz?WT+0.22:len, trimMat, x, g0+WALL_H*0.64, z); }
      band(WH*2, C.x, C.z-WH, true); band(WH*2, C.x, C.z+WH, true); band(WH*2, C.x+WH, C.z, false);
      for(let i=-2;i<=2;i++){
        buttress(C.x+i*6.4, C.z-WH, 0,-1); slit(C.x+i*6.4+3.2, C.z-WH-0.5, true);
        buttress(C.x+i*6.4, C.z+WH, 0, 1); slit(C.x+i*6.4+3.2, C.z+WH+0.5, true);
        buttress(C.x+WH, C.z+i*6.4, 1, 0); slit(C.x+WH+0.5, C.z+i*6.4+3.2, false);
      }
      // inner-face pilasters + hanging banners so the depth reads FROM THE BAILEY (not just outside)
      const bannerMat=M(0x7a2a2a);
      function pilaster(x,z,nx,nz){ box(0.5, WALL_H*0.98, 0.5, wallMat, x+nx*0.4, g0+WALL_H*0.49, z+nz*0.4); }
      function banner(x,z,nx,nz){ box(0.04+Math.abs(nz)*0.85, 1.5, 0.04+Math.abs(nx)*0.85, bannerMat, x+nx*0.42, g0+WALL_H*0.58, z+nz*0.42); }
      for(let i=-2;i<=2;i++){
        pilaster(C.x+i*6.4+1.6, C.z-WH, 0, 1); pilaster(C.x+i*6.4+1.6, C.z+WH, 0,-1); pilaster(C.x+WH, C.z+i*6.4+1.6, -1,0);
        if(i%2===0){ banner(C.x+i*6.4, C.z-WH, 0, 1); banner(C.x+WH, C.z+i*6.4, -1, 0); }
      }

      // --- the Warden's Fountain: tiered octagonal basin + central spouting bowl + finial ---
      const waterMat = (typeof TEX!=='undefined' && TEX.water)
        ? new THREE.MeshLambertMaterial({map:(function(){const t=TEX.water.clone();t.needsUpdate=true;t.repeat.set(2,2);return t;})()})
        : M(0x4a7494);
      function fountain(fx,fz){
        const g=new THREE.Group();
        const base=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.5,0.95,8), stoneT(0xb0a898)); base.position.y=0.47; g.add(base);
        const rim=new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.35,0.2,8), trimMat); rim.position.y=0.98; g.add(rim);
        const w1=new THREE.Mesh(new THREE.CylinderGeometry(2.9,2.9,0.14,8), waterMat); w1.position.y=0.9; g.add(w1);
        const ped=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.8,2.0,8), stoneT(0xb0a898)); ped.position.y=1.95; g.add(ped);
        const bowl=new THREE.Mesh(new THREE.CylinderGeometry(1.5,0.7,0.55,8), trimMat); bowl.position.y=3.0; g.add(bowl);
        const w2=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.25,0.12,8), waterMat.clone()); w2.position.y=3.25; g.add(w2);
        const fin=new THREE.Mesh(new THREE.ConeGeometry(0.35,0.9,8), stoneT(0xb0a898)); fin.position.y=3.9; g.add(fin);
        g.traverse(o=>{ if(o.isMesh) o.castShadow=true; });
        g.position.set(fx, g0, fz); G.add(g);
        addCircleCollider(fx, fz, 3.5);
        g.userData={kind:'prop', examine:'The Warden\'s fountain — spring-fed, sweet and cold. Coins glint on the basin floor.'};
        WORLD.clickables.push(g);
      }
      fountain(C.x-3, C.z-7);

      // --- a market stall + flanking gate guards: NPC scenes, not scattered figures ---
      P('counter', C.x+5, C.z-12, g0, 0);
      P('crate', C.x+3.6, C.z-12.6, g0); P('barrel', C.x+6.4, C.z-12.6, g0);
      spawnN('cn_guard', C.x-WH+2.6, gateLo-1.2); spawnN('cn_guard', C.x-WH+2.6, gateHi+1.2);
    })();

    if(typeof Deeds!=='undefined') Deeds.addLog('Wardenholm Keep stands — the Guild has its castle.');
    UI.chat('[MAP] Wardenholm Keep rises east of the Commons — cross the bridge, climb the walls, and mind what’s chained below.','sys');
    built=true;
    return true;
  }

  const iv=setInterval(()=>{ try{ if(build()) clearInterval(iv); }
    catch(e){ console.error('[wardenholm]', e); clearInterval(iv); } }, 2200);
})();
