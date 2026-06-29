/* ============================================================================
   VEYHOLLOW KEEP — a Lumbridge-style castle, modelled from a modular stone kit
   and hand-placed piece by piece (see LUMBRIDGE_CASTLE.md for the design spec).
   ----------------------------------------------------------------------------
   Faithful to the OSRS Lumbridge silhouette: a square grey-stone keep with four
   SQUARE corner towers, blocky crenellations lined with black cannons, a walled
   grassy courtyard (two fountains + two statues) reached by a three-step arched
   entrance, a rear door, and two straight staircases. The ground floor is fully
   walk-in (great hall, kitchen with range); the upper storeys + roof lift away
   when you step inside (OSRS-style roof removal via WORLD.interiors).

   Loaded as a plain global <script> after the world builders. Exposes
   window.buildVeyhollowKeep(), invoked once during world generation.
   ========================================================================== */
(function(){
  if(typeof THREE==='undefined') return;

  /* ---- site: a flat plateau carved in terrainHeight() (game2_world.js) ---- */
  const SITE = (typeof CASTLE_SITE!=='undefined') ? CASTLE_SITE : {x:0, z:-51, half:16, y:0.6};
  const BASE = SITE.y;                       // ground level on the plateau

  /* keep footprint (world units = tiles) */
  const KC = {x:0, z:-57};                   // keep centre
  const KX = 8, KZ = 8;                      // keep half-width / half-depth
  const T  = 0.7;                            // wall thickness
  const H1 = 4.0, H2 = 3.6, H3 = 3.4;        // three tall storeys of grey stone
  const ROOF = H1+H2+H3;                     // height of the battlement deck
  const DOORW = 3.4, DOORH = 3.0;            // a GENEROUS arched entrance (wide enough to read as a way in)

  /* ---- materials: grey stone keep, dark trim, warm wood, iron, glow ---- */
  const stoneMap = TEX.stone;
  const M = {
    stone:  new THREE.MeshLambertMaterial({map:stoneMap, color:0x9c978c}),
    stoneLt:new THREE.MeshLambertMaterial({map:stoneMap, color:0xb0aa9e}),
    stoneDk:new THREE.MeshLambertMaterial({map:stoneMap, color:0x726d63}),
    wood:   mat(0x6b4a2f),
    woodDk: mat(0x46301d),
    iron:   mat(0x3a3a40),
    black:  mat(0x191920),
    glass:  new THREE.MeshLambertMaterial({color:0xbcd2e0, emissive:0x223844}),
    fire:   new THREE.MeshLambertMaterial({color:0xffd05a, emissive:0xff7a18}),
    ember:  new THREE.MeshLambertMaterial({color:0xff8a3a, emissive:0xc24a10}),
    banner: mat(0x8f2730),
    bannerGold: mat(0xc9a23a),
    water:  new THREE.MeshLambertMaterial({color:0x2f6f93, transparent:true, opacity:0.92}),
    cloth:  mat(0xb8ad8e),
    cobble: new THREE.MeshLambertMaterial({map:(TEX.cobble||TEX.stone), color:0x8f897e}),
  };

  /* ---- low-level helpers ---- */
  function box(w,h,d,m){ const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); me.castShadow=true; me.receiveShadow=true; return me; }
  function cyl(rt,rb,h,s,m){ const me=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,s),m); me.castShadow=true; return me; }
  function add(host,m,x,y,z,ry){ m.position.set(x, BASE+y, z); if(ry) m.rotation.y=ry; host.add(m); return m; }
  /* axis-aligned wall box centred at (x,z), spanning height band [y0, y0+h] */
  function wallBox(host, x,z, w,h,d, y0, m){ const me=box(w,h,d,m); me.position.set(x, BASE+y0+h/2, z); host.add(me); return me; }
  function col(x,z,hw,hd){ if(typeof addRectCollider==='function') addRectCollider(x,z,hw,hd); else WORLD.colliders.push({type:'rect',x,z,hw,hd}); }

  /* ---- merlon run: blocky crenellations along an axis ---- */
  function crenellate(host, x0,z0, x1,z1, y, m){
    const dx=x1-x0, dz=z1-z0, len=Math.hypot(dx,dz);
    const n=Math.max(2, Math.round(len/1.4)); const step=len/n;
    const ux=dx/len, uz=dz/len;
    for(let i=0;i<n;i++){ if(i%2) continue;                  // every other slot is a merlon
      const cx=x0+ux*(i+0.5)*step, cz=z0+uz*(i+0.5)*step;
      const me=box(step*0.92, 0.85, T*0.95, m); me.position.set(cx, BASE+y+0.42, cz);
      me.rotation.y=-Math.atan2(dz,dx); host.add(me);
    }
  }
  /* ---- black battlement cannon — the signature Lumbridge silhouette cue ---- */
  function cannon(host, x,z, y, ry){
    const g=new THREE.Group();
    const carriage=box(0.5,0.3,0.7,M.woodDk); carriage.position.y=0.15; g.add(carriage);
    for(const sx of [-0.22,0.22]) for(const sz of [-0.26,0.26]){
      const w=cyl(0.13,0.13,0.08,10,M.black); w.rotation.z=Math.PI/2; w.position.set(sx,0.12,sz); g.add(w); }
    const barrel=cyl(0.13,0.17,0.92,12,M.black); barrel.rotation.x=Math.PI/2; barrel.position.set(0,0.42,0.16); g.add(barrel);
    const cap=cyl(0.1,0.14,0.12,12,M.black); cap.rotation.x=Math.PI/2; cap.position.set(0,0.42,-0.32); g.add(cap);
    g.position.set(x, BASE+y, z); if(ry) g.rotation.y=ry; g.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); host.add(g); return g;
  }
  /* ---- square corner / gate tower: base (always shown) + upper (lifts with roof) ---- */
  function squareTower(sceneHost, roofHost, cx,cz, half, topY, withCannons){
    // base columns 0..H1 stay; upper storeys + crenellated cap lift away
    wallBox(sceneHost, cx,cz, half*2, H1, half*2, 0, M.stone);
    col(cx,cz, half, half);
    const up=box(half*2, topY-H1, half*2, M.stone); up.position.set(cx, BASE+(H1+topY)/2, cz); roofHost.add(up);
    // arrow-slit windows up the tower
    for(const s of [[0,half],[0,-half],[half,0],[-half,0]]){
      for(const yy of [H1+1.2, topY-1.4]){
        const slit=box(s[0]?0.12:0.34, 0.95, s[1]?0.12:0.34, M.glass);
        slit.position.set(cx+s[0]*0.99, BASE+yy, cz+s[1]*0.99); roofHost.add(slit);
      }
    }
    // crenellated cap + a corner banner
    crenellate(roofHost, cx-half,cz-half, cx+half,cz-half, topY, M.stoneDk);
    crenellate(roofHost, cx-half,cz+half, cx+half,cz+half, topY, M.stoneDk);
    crenellate(roofHost, cx-half,cz-half, cx-half,cz+half, topY, M.stoneDk);
    crenellate(roofHost, cx+half,cz-half, cx+half,cz+half, topY, M.stoneDk);
    if(withCannons){ cannon(roofHost, cx,cz-half+0.1, topY, 0); cannon(roofHost, cx,cz+half-0.1, topY, Math.PI); }
    // pennant pole + flag
    const pole=cyl(0.05,0.05,2.2,6,M.woodDk); pole.position.set(cx, BASE+topY+1.1, cz); roofHost.add(pole);
    const flag=box(0.9,0.55,0.05,M.banner); flag.position.set(cx+0.5, BASE+topY+1.6, cz); roofHost.add(flag);
  }
  /* ---- arched doorway frame + working double doors ---- */
  function gateway(host, x,z, width, facing){   // facing: 'S'(+z) or 'N'(-z)
    const sgn = facing==='S' ? 1 : -1;
    // stone arch over the opening
    const lintel=box(width+1.0, 0.9, T+0.2, M.stoneLt); lintel.position.set(x, BASE+DOORH+0.3, z); host.add(lintel);
    const key=box(0.5,0.7,T+0.3,M.stoneLt); key.position.set(x, BASE+DOORH+0.15, z); host.add(key);
    for(const s of [-1,1]){ const jamb=box(0.4, DOORH+0.2, T+0.1, M.stoneLt); jamb.position.set(x+s*(width/2+0.2), BASE+(DOORH+0.2)/2, z); host.add(jamb); }
    // two doors, hinged at the jambs
    for(const s of [-1,1]){
      const door=box(width/2-0.12, DOORH-0.25, 0.14, M.woodDk);
      door.position.set(x+s*(width/4), BASE+(DOORH-0.25)/2, z+sgn*0.05);
      for(const yy of [-0.7,0,0.7]){ const band=box(width/2-0.12,0.09,0.16,M.iron); band.position.set(x+s*(width/4), BASE+(DOORH-0.25)/2+yy, z+sgn*0.06); host.add(band); }
      host.add(door);
    }
  }

  /* ===================== FURNITURE & DRESSING ===================== */
  function longTable(host, x,z, len, ry){
    const g=new THREE.Group();
    const top=box(len,0.16,1.3,M.wood); top.position.y=1.0; g.add(top);
    for(const sx of [-len/2+0.4,len/2-0.4]) for(const sz of [-0.5,0.5]){ const leg=box(0.16,1.0,0.16,M.woodDk); leg.position.set(sx,0.5,sz); g.add(leg); }
    g.position.set(x,BASE,z); if(ry) g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    col(x,z, ry?0.65:len/2, ry?len/2:0.65); return g;
  }
  function bench(host, x,z, len, ry){
    const g=new THREE.Group(); const top=box(len,0.12,0.4,M.wood); top.position.y=0.55; g.add(top);
    for(const sx of [-len/2+0.3,len/2-0.3]){ const leg=box(0.12,0.55,0.36,M.woodDk); leg.position.set(sx,0.27,0); g.add(leg); }
    g.position.set(x,BASE,z); if(ry) g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g); return g;
  }
  function fireplace(host, x,z, ry){
    const g=new THREE.Group();
    const back=box(2.4,2.8,0.5,M.stoneDk); back.position.set(0,1.4,0); g.add(back);
    for(const s of [-1,1]){ const post=box(0.4,2.2,0.7,M.stone); post.position.set(s*1.0,1.1,0.25); g.add(post); }
    const mantel=box(2.6,0.3,0.9,M.stoneLt); mantel.position.set(0,2.25,0.2); g.add(mantel);
    const hearth=box(1.6,0.18,0.6,M.stoneDk); hearth.position.set(0,0.09,0.35); g.add(hearth);
    const embers=box(1.2,0.2,0.4,M.ember); embers.position.set(0,0.22,0.35); g.add(embers);
    for(let i=0;i<3;i++){ const fl=cyl(0.001,0.18,0.6+Math.random()*0.3,6,M.fire); fl.position.set(-0.4+i*0.4,0.5,0.35); g.add(fl); }
    g.position.set(x,BASE,z); if(ry) g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    col(x,z, ry?0.4:1.3, ry?1.3:0.4); return g;
  }
  function range(host, x,z, ry){   // kitchen cooking range
    const g=new THREE.Group();
    const body=box(2.0,1.5,1.2,M.stoneDk); body.position.y=0.75; g.add(body);
    const hood=cyl(0.3,1.1,1.4,4,M.stone); hood.rotation.y=Math.PI/4; hood.position.set(0,2.4,0); g.add(hood);
    const mouth=box(1.3,0.8,0.1,M.black); mouth.position.set(0,0.7,0.61); g.add(mouth);
    for(let i=0;i<3;i++){ const fl=cyl(0.001,0.16,0.5,6,M.fire); fl.position.set(-0.35+i*0.35,0.55,0.55); g.add(fl); }
    const pot=cyl(0.3,0.24,0.3,10,M.iron); pot.position.set(0,1.6,0); g.add(pot);
    g.position.set(x,BASE,z); if(ry) g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    g.userData={kind:'deco', label:'Cook on the <b>Range</b>'}; if(WORLD.clickables) WORLD.clickables.push(g);
    col(x,z, ry?0.65:1.0, ry?1.0:0.65); return g;
  }
  function portrait(host, x,z, ry){   // framed wall painting
    const g=new THREE.Group();
    const frame=box(1.1,1.4,0.08,M.bannerGold); g.add(frame);
    const cols=[0x4a5a3a,0x5a3a2a,0x3a4a6a,0x6a4a5a];
    const pic=box(0.85,1.15,0.1,mat(cols[Math.floor(Math.random()*cols.length)])); pic.position.z=0.02; g.add(pic);
    g.position.set(x,BASE+2.0,z); if(ry) g.rotation.y=ry; host.add(g); return g;
  }
  function banner(host, x,z, y, ry){
    const g=new THREE.Group();
    const cloth=box(1.1,2.4,0.06,M.banner); cloth.position.y=0; g.add(cloth);
    const trim=box(1.2,0.18,0.08,M.bannerGold); trim.position.y=1.2; g.add(trim);
    const emblem=box(0.5,0.5,0.09,M.bannerGold); emblem.position.set(0,0.2,0.02); g.add(emblem);
    g.position.set(x,BASE+y,z); if(ry) g.rotation.y=ry; host.add(g); return g;
  }
  function wallTorch(host, x,z, y, ry){
    const g=new THREE.Group();
    const bracket=box(0.1,0.4,0.12,M.iron); bracket.position.y=-0.1; g.add(bracket);
    const cup=cyl(0.1,0.06,0.18,8,M.iron); cup.position.y=0.12; g.add(cup);
    const fl=cyl(0.001,0.13,0.4,6,M.fire); fl.position.y=0.36; g.add(fl);
    g.position.set(x,BASE+y,z); if(ry) g.rotation.y=ry; host.add(g); return g;
  }
  function chandelier(host, x,z, y){
    const g=new THREE.Group();
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.7,0.06,6,16),M.woodDk); ring.rotation.x=Math.PI/2; g.add(ring);
    const chain=cyl(0.02,0.02,1.2,4,M.iron); chain.position.y=0.6; g.add(chain);
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const cnd=cyl(0.05,0.05,0.22,6,M.cloth); cnd.position.set(Math.cos(a)*0.7,0.14,Math.sin(a)*0.7); g.add(cnd);
      const fl=cyl(0.001,0.06,0.16,5,M.fire); fl.position.set(Math.cos(a)*0.7,0.32,Math.sin(a)*0.7); g.add(fl); }
    g.position.set(x,BASE+y,z); host.add(g); return g;
  }
  function fountain(host, x,z){
    const g=new THREE.Group();
    const basin=cyl(1.5,1.6,0.6,8,M.stoneLt); basin.position.y=0.3; g.add(basin);
    const inner=cyl(1.25,1.25,0.5,8,M.stoneDk); inner.position.y=0.45; g.add(inner);
    const water=cyl(1.2,1.2,0.08,8,M.water); water.position.y=0.62; g.add(water);
    const stem=cyl(0.22,0.3,1.1,8,M.stoneLt); stem.position.y=1.05; g.add(stem);
    const bowl=cyl(0.6,0.2,0.3,8,M.stoneLt); bowl.position.y=1.6; g.add(bowl);
    const top=cyl(0.18,0.18,0.1,8,M.water); top.position.y=1.78; g.add(top);
    g.position.set(x,BASE,z); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    g.userData={kind:'deco', label:'Examine <b>Fountain</b>'}; if(WORLD.clickables) WORLD.clickables.push(g);
    col(x,z,1.6,1.6); return g;
  }
  function grandStair(host, x,z, ry){   // a straight stone flight (visual landmark)
    const g=new THREE.Group();
    for(let i=0;i<5;i++){ const step=box(2.6, 0.4, 0.7, M.stoneLt); step.position.set(0, 0.2+i*0.4, -i*0.7); g.add(step); }
    const rail=box(0.18,2.2,3.6,M.stoneDk); rail.position.set(1.3,1.0,-1.4); g.add(rail);
    const rail2=rail.clone(); rail2.position.x=-1.3; g.add(rail2);
    g.position.set(x,BASE,z); if(ry) g.rotation.y=ry; g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    g.userData={kind:'deco', label:'Climb <b>Staircase</b>'}; if(WORLD.clickables) WORLD.clickables.push(g);
    col(x,z, 1.4,1.8); return g;
  }
  function trapdoor(host, x,z){
    const g=new THREE.Group();
    const frame=box(1.1,0.1,1.1,M.woodDk); frame.position.y=0.06; g.add(frame);
    const lid=box(0.92,0.08,0.92,M.wood); lid.position.y=0.12; g.add(lid);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.03,5,10),M.iron); ring.rotation.x=Math.PI/2; ring.position.set(0.25,0.17,0); g.add(ring);
    g.position.set(x,BASE,z); g.traverse(o=>{if(o.isMesh)o.castShadow=true;}); host.add(g);
    g.userData={kind:'deco', label:'Open <b>Trapdoor</b>'}; if(WORLD.clickables) WORLD.clickables.push(g); return g;
  }
  function floorSlabs(host, x0,z0,x1,z1, m){
    for(let x=x0; x<x1; x++) for(let z=z0; z<z1; z++){
      const s=box(0.98,0.1,0.98, (((x+z)&1)?m:M.stoneDk)); s.position.set(x+0.5, BASE+0.05, z+0.5); s.receiveShadow=true; host.add(s);
    }
  }

  /* ===================== THE BUILD ===================== */
  function buildVeyhollowKeep(){
    const sc=scene;                              // ground-level structure (always visible)
    const roofG=new THREE.Group();               // upper storeys + battlements (lift when inside)
    sc.add(roofG);

    /* ---- interior stone floor ---- */
    floorSlabs(sc, KC.x-KX+1, KC.z-KZ+1, KC.x+KX, KC.z+KZ, M.stoneLt);

    /* ---- GROUND STOREY walls (0..H1), with wide south + rear north doorways ---- */
    const zS=KC.z+KZ, zN=KC.z-KZ, xE=KC.x+KX, xW=KC.x-KX;
    // south wall split around the main entrance
    const sSeg=(KX*2-DOORW)/2;
    wallBox(sc, KC.x-(DOORW/2+sSeg/2), zS, sSeg, H1, T, 0, M.stone); col(KC.x-(DOORW/2+sSeg/2), zS, sSeg/2, T/2);
    wallBox(sc, KC.x+(DOORW/2+sSeg/2), zS, sSeg, H1, T, 0, M.stone); col(KC.x+(DOORW/2+sSeg/2), zS, sSeg/2, T/2);
    wallBox(sc, KC.x, zS, DOORW+0.6, H1-DOORH, T, DOORH, M.stone);     // lintel band over the door
    // north wall split around the rear entrance
    const rW=2.6, nSeg=(KX*2-rW)/2;
    wallBox(sc, KC.x-(rW/2+nSeg/2), zN, nSeg, H1, T, 0, M.stone); col(KC.x-(rW/2+nSeg/2), zN, nSeg/2, T/2);
    wallBox(sc, KC.x+(rW/2+nSeg/2), zN, nSeg, H1, T, 0, M.stone); col(KC.x+(rW/2+nSeg/2), zN, nSeg/2, T/2);
    wallBox(sc, KC.x, zN, rW+0.6, H1-DOORH, T, DOORH, M.stone);
    // east + west walls (full)
    wallBox(sc, xE, KC.z, T, H1, KZ*2, 0, M.stone); col(xE, KC.z, T/2, KZ);
    wallBox(sc, xW, KC.z, T, H1, KZ*2, 0, M.stone); col(xW, KC.z, T/2, KZ);

    /* ---- UPPER STOREYS (lift with roof): storeys 2 & 3 with arched windows ---- */
    function storey(y0,h, m){
      [[KC.x,zS,KX*2,T],[KC.x,zN,KX*2,T],[xE,KC.z,T,KZ*2],[xW,KC.z,T,KZ*2]].forEach(s=>{
        wallBox(roofG, s[0],s[1], s[2],h,s[3], y0, m);
      });
      // arched window slits, two per face
      const wy=y0+h*0.5;
      for(const dx of [-3.5,3.5]){ const w=box(0.5,1.3,0.16,M.glass); w.position.set(KC.x+dx, BASE+wy, zS+0.02); roofG.add(w);
        const w2=w.clone(); w2.position.z=zN-0.02; roofG.add(w2); }
      for(const dz of [-3.5,3.5]){ const w=box(0.16,1.3,0.5,M.glass); w.position.set(xE-0.02, BASE+wy, KC.z+dz); roofG.add(w);
        const w2=w.clone(); w2.position.x=xW+0.02; roofG.add(w2); }
    }
    storey(H1, H2, M.stone);
    storey(H1+H2, H3, M.stoneLt);
    // belt courses: protruding ledges marking each floor — break up the height, kill the "squat box" read
    [H1, H1+H2].forEach(y=>{
      [[KC.x,zS,KX*2+0.5,T+0.5],[KC.x,zN,KX*2+0.5,T+0.5],[xE,KC.z,T+0.5,KZ*2+0.5],[xW,KC.z,T+0.5,KZ*2+0.5]]
        .forEach(s=>{ const b=box(s[2],0.28,s[3],M.stoneDk); b.position.set(s[0],BASE+y,s[1]); roofG.add(b); });
    });
    // ground-floor ceiling / 2nd-floor deck (so hiding the roof reveals the room)
    const deck=box(KX*2, 0.2, KZ*2, M.stoneDk); deck.position.set(KC.x, BASE+H1, KC.z); roofG.add(deck);

    /* ---- BATTLEMENTS + black cannons along the keep roofline ---- */
    crenellate(roofG, xW,zS, xE,zS, ROOF, M.stoneDk);
    crenellate(roofG, xW,zN, xE,zN, ROOF, M.stoneDk);
    crenellate(roofG, xW,zN, xW,zS, ROOF, M.stoneDk);
    crenellate(roofG, xE,zN, xE,zS, ROOF, M.stoneDk);
    const roofDeck=box(KX*2-0.4,0.2,KZ*2-0.4,M.stoneDk); roofDeck.position.set(KC.x,BASE+ROOF,KC.z); roofG.add(roofDeck);
    for(const dx of [-4.5,0,4.5]){ cannon(roofG, KC.x+dx, zS-0.3, ROOF, 0); cannon(roofG, KC.x+dx, zN+0.3, ROOF, Math.PI); }
    for(const dz of [-4,4]){ cannon(roofG, xE-0.3, KC.z+dz, ROOF, Math.PI/2); cannon(roofG, xW+0.3, KC.z+dz, ROOF, -Math.PI/2); }

    /* ---- FOUR SQUARE CORNER TOWERS ---- */
    const TH = ROOF+4.4;                          // towers dominate the keep for grandeur
    squareTower(sc, roofG, xW, zN, 2.0, TH, true);
    squareTower(sc, roofG, xE, zN, 2.0, TH, true);
    squareTower(sc, roofG, xW, zS, 2.0, TH, true);
    squareTower(sc, roofG, xE, zS, 2.0, TH, true);

    /* ---- ENTRANCES ---- */
    gateway(sc, KC.x, zS, DOORW, 'S');
    gateway(sc, KC.x, zN, rW, 'N');
    // three steps up to the south entrance
    for(let i=0;i<3;i++){ const w=DOORW+1.4-i*0.5; const st=box(w,0.3,0.7,M.stoneLt); st.position.set(KC.x, BASE+0.15+i*0.0+(2-i)*0.02, zS+1.6-i*0.55); st.receiveShadow=true; sc.add(st); }
    wallTorch(sc, KC.x-DOORW/2-0.5, zS+0.1, 2.2, 0); wallTorch(sc, KC.x+DOORW/2+0.5, zS+0.1, 2.2, 0);

    /* ===================== GROUND-FLOOR INTERIOR ===================== */
    // partition: kitchen walled off in the NW quarter, with a doorway
    const pz=KC.z-2.2;                            // east-west partition
    wallBox(sc, KC.x-5.4, pz, 5.0, H1, T, 0, M.stone); col(KC.x-5.4, pz, 2.5, T/2);   // leaves a doorway toward centre
    const pxw=KC.x-2.9;                           // north-south partition
    wallBox(sc, pxw, KC.z-4.6, T, H1, 4.4, 0, M.stone); col(pxw, KC.z-4.6, T/2, 2.2);

    // — KITCHEN (NW) —
    range(sc, KC.x-6.2, KC.z-6.0, Math.PI/2);
    trapdoor(sc, KC.x-6.0, KC.z-3.6);
    if(window.Decor){ Decor.barrel(KC.x-6.6, KC.z-4.7); Decor.crate(KC.x-4.2, KC.z-6.4); Decor.crate(KC.x-4.2, KC.z-5.6); }
    longTable(sc, KC.x-5.0, KC.z-4.0, 2.2, 0);

    // — GREAT HALL (centre/east) —
    longTable(sc, KC.x+1.5, KC.z, 6.0, Math.PI/2);
    bench(sc, KC.x+0.2, KC.z, 5.4, Math.PI/2);
    bench(sc, KC.x+2.8, KC.z, 5.4, Math.PI/2);
    fireplace(sc, xE-0.6, KC.z+3.0, -Math.PI/2);
    chandelier(sc, KC.x+1.5, KC.z, H1-0.7);
    portrait(sc, KC.x+5.0, zN+0.45, 0); portrait(sc, KC.x+2.0, zN+0.45, 0);
    banner(sc, KC.x+0.0, zN+0.5, 2.3, 0); banner(sc, KC.x+6.0, zN+0.5, 2.3, 0);
    wallTorch(sc, xE-0.45, KC.z-2, 2.2, -Math.PI/2); wallTorch(sc, xE-0.45, KC.z+5, 2.2, -Math.PI/2);

    // — STAIRCASES at the north & south ends —
    grandStair(sc, KC.x+6.0, zS-2.2, Math.PI);    // south stair, rising toward the (future) upper floor
    grandStair(sc, KC.x-2.0, zN+2.2, 0);          // north stair

    /* ===================== WALLED COURTYARD (south face) ===================== */
    const cyN=zS, cyS=KC.z+KZ+12;                 // courtyard from keep front to the outer gate
    const cxE=KC.x+9.5, cxW=KC.x-9.5;
    // east + west outer walls with crenellations
    wallBox(sc, cxE, (cyN+cyS)/2, T, 2.6, (cyS-cyN), 0, M.stone); col(cxE,(cyN+cyS)/2,T/2,(cyS-cyN)/2);
    wallBox(sc, cxW, (cyN+cyS)/2, T, 2.6, (cyS-cyN), 0, M.stone); col(cxW,(cyN+cyS)/2,T/2,(cyS-cyN)/2);
    crenellate(sc, cxE,cyN, cxE,cyS, 2.6, M.stoneDk);   // courtyard crenellations stay (short, won't block the keep)
    crenellate(sc, cxW,cyN, cxW,cyS, 2.6, M.stoneDk);
    // south wall with a central gate
    const gW=3.6, gSeg=((cxE-cxW)-gW)/2;
    wallBox(sc, cxW+gSeg/2, cyS, gSeg, 2.6, T, 0, M.stone); col(cxW+gSeg/2, cyS, gSeg/2, T/2);
    wallBox(sc, cxE-gSeg/2, cyS, gSeg, 2.6, T, 0, M.stone); col(cxE-gSeg/2, cyS, gSeg/2, T/2);
    crenellate(sc, cxW,cyS, cxW+gSeg,cyS, 2.6, M.stoneDk);
    crenellate(sc, cxE-gSeg,cyS, cxE,cyS, 2.6, M.stoneDk);
    // imposing gatehouse: two tall towers + a raised crenellated block spanning the gate
    const ghTop=7.2;
    squareTower(sc, sc, KC.x-gW/2-1.5, cyS, 1.5, ghTop, true);
    squareTower(sc, sc, KC.x+gW/2+1.5, cyS, 1.5, ghTop, true);
    gateway(sc, KC.x, cyS, gW, 'S');
    const ghBlock=box(gW+3.2, 2.0, T+0.7, M.stone); ghBlock.position.set(KC.x, BASE+3.6, cyS); sc.add(ghBlock);
    crenellate(sc, KC.x-(gW+3.2)/2, cyS, KC.x+(gW+3.2)/2, cyS, 4.6, M.stoneDk);
    cannon(sc, KC.x, cyS-0.15, 4.6, 0);

    // courtyard: cobbled approach from the gate up to the keep steps
    for(let z=Math.ceil(cyN); z<cyS; z++){ for(let dx=-1;dx<=1;dx++){ const p=box(0.99,0.08,0.99,M.cobble); p.position.set(KC.x+dx, BASE+0.06, z+0.5); p.receiveShadow=true; sc.add(p); } }
    // grand approach causeway south of the gate, with low parapets
    for(let z=Math.ceil(cyS); z<cyS+7; z++){ for(let dx=-2;dx<=2;dx++){ const p=box(0.99,0.1,0.99,M.cobble); p.position.set(KC.x+dx, BASE+0.07, z+0.5); p.receiveShadow=true; sc.add(p); } }
    for(const s of [-1,1]){ const par=box(0.5,0.8,7,M.stone); par.position.set(KC.x+s*3.0, BASE+0.4, cyS+3.5); sc.add(par); col(KC.x+s*3.0, cyS+3.5, 0.25, 3.5); }
    fountain(sc, KC.x-5.5, KC.z+KZ+4.5);
    fountain(sc, KC.x+5.5, KC.z+KZ+4.5);
    if(typeof makeStatue==='function'){ makeStatue(KC.x-5.5, KC.z+KZ+8.5); makeStatue(KC.x+5.5, KC.z+KZ+8.5); }
    wallTorch(sc, KC.x-gW/2-0.4, cyS-0.1, 2.0, Math.PI); wallTorch(sc, KC.x+gW/2+0.4, cyS-0.1, 2.0, Math.PI);

    /* ---- register the walk-in interior so the upper keep + roof lift away ---- */
    WORLD.interiors.push({ x:KC.x, z:KC.z, hw:KX+0.4, hd:KZ+0.4, roof:roofG, band:null,
      door:{x:KC.x, z:zS+2.0}, song:'keep_quiet' });   // its own theme; the city song returns when you leave

    /* ---- a guard at the gate + a cook in the kitchen ---- */
    if(typeof spawnNpc==='function'){
      try{ spawnNpc('wanderer', KC.x-5.2, KC.z-4.6); }catch(_e){}
      try{ spawnNpc('monk', KC.x+1.5, KC.z+3.0); }catch(_e){}
    }

    if(typeof UI!=='undefined' && UI.chat) UI.chat('[WORLD] Veyhollow Keep rises to the north.','sys');
  }

  window.buildVeyhollowKeep = buildVeyhollowKeep;
})();
