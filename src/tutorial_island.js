/* tutorial_island.js — grows Tutor's Holm into a proper guided Tutorial Island and (in later
 * phases) places its stations, buildings, props and underground cave.
 * Reference look: Bible_References/A_Tutorial_Island_Option.jpg (overall), Tutorial_Island_Building.jpg
 * (grey stone guide house), Tutorial_Island_Fishing_Spot.jpg (pond), Tutorial_Island_Mining_Cave_&_Mining_Rocks.jpg.
 *
 * PHASE 1 (this file so far): ENLARGE THE LANDMASS.
 * The Holm is the SE corner of the single baked biome map (worldgrid.js) — it's an island because
 * the grid cells around the anchor (158,141) are `water`. We override gridBiomeIdx so the WATER ring
 * around the anchor reads `grass`; terrainHeight() (game2_world.js) then raises those cells to walkable
 * land instead of flooding them. This MUST be active BEFORE buildGround() bakes the terrain (which runs
 * at Play), so the patch is applied at SCRIPT-LOAD (top-level) — NOT in a boot timer. Loaded right after
 * worldgrid.js so gridBiomeIdx already exists.
 *
 * Keep-it-an-island: R is chosen to grow into the open water N/W without merging into the southern
 * mainland — verify in-browser and tune. Reversible: revert this file / remove the script tag. */
(function(){
  if(typeof gridBiomeIdx!=='function' || typeof WORLDGRID==='undefined'){
    console.warn('[tutorial_island] gridBiomeIdx/WORLDGRID not ready — enlargement skipped'); return;
  }
  const HX=158, HZ=141;                                  // ZONES.holm.pos
  const R=26;                                            // island radius (tiles); grown 21→26 to fit the enlarged buildings at the 4 corners w/o crowding
  const GRASS = WORLDGRID.biomes.indexOf('grass');       // biome index for grass (1)
  const WATER = WORLDGRID.biomes.indexOf('water');       // biome index for water (0)

  const _origIdx = gridBiomeIdx;
  // Promote WATER cells inside the island disc to GRASS; leave every other cell untouched.
  gridBiomeIdx = function(x,z){
    const i = _origIdx(x,z);
    if(i===WATER){
      const dx=Math.floor(x)-HX, dz=Math.floor(z)-HZ;
      if(dx*dx+dz*dz < R*R) return GRASS;
    }
    return i;
  };
  // expose the region so later phases (buildings/props/cave-trapdoor) can place onto the new land
  window.TUTORIAL_ISLAND = {cx:HX, cz:HZ, r:R};
  console.log('[tutorial_island] PHASE1 enlarged: water→grass within R='+R+' of ('+HX+','+HZ+')');
})();

/* PHASE 2: STATION BUILDINGS — each is a UNIQUE, characterful structure (per user: no plain
 * boxes) built by its own module: tut_bld_guide/chef/quest/mage.js. Each builder places the
 * functional Buildkit shell (colliders/door/interior) + a rotatable character group (wings,
 * porch, signage, dormer/tower, props). Placed post-bake via a self-boot guard. rot=0 (the
 * shell door + character porch align at rot=0; each builder's fixed doorSide faces the plaza).
 * Coords verified flush on the flattened Holm. */
(function(){
  const PLACE = [
    // spread to the 4 corners (radius ~14 from anchor [158,141]) so the ENLARGED buildings don't crowd
    // the central plaza; doors still face inward toward the plaza. Island grown + flattened to fit.
    {k:'guide', fn:'makeGuideHall',   x:147, z:130, w:14, d:11},   // NW, door S → plaza
    {k:'chef',  fn:'makeChefKitchen', x:169, z:130, w:13, d:10},   // NE, door S → plaza
    {k:'quest', fn:'makeQuestLodge',  x:147, z:152, w:13, d:10},   // SW, door N → plaza
    {k:'mage',  fn:'makeMageTower',   x:169, z:152, w:11, d:10},   // SE, door W → plaza
  ];
  // A guaranteed-visible WOOD PLANK floor overlay — the shell's textured floor renders flat/muddy (the
  // woodPlanks texture is too subtle at this scale), so lay a warm plank base + DARK SEAM lines as real
  // geometry. Tutorial-scoped (4 buildings) so it's perf-safe. Seams read as individual planks from above.
  function plankFloor(cx, cz, w, d){
    const y=(typeof groundY==='function'?(groundY(cx,cz)||0):0)+0.11;
    const g=new THREE.Group();
    const ftx=(typeof TEX!=='undefined'&&(TEX.woodPlanks||TEX.wood))?(TEX.woodPlanks||TEX.wood).clone():null;
    if(ftx){ ftx.needsUpdate=true; ftx.wrapS=ftx.wrapT=THREE.RepeatWrapping; ftx.repeat.set(w/2,d/2); }
    const base=new THREE.Mesh(new THREE.BoxGeometry(w-0.5,0.08,d-0.5),
      ftx?new THREE.MeshLambertMaterial({map:ftx,color:0xa8814e}):new THREE.MeshLambertMaterial({color:0xa8814e}));
    base.position.set(cx,y,cz); base.receiveShadow=true; g.add(base);
    // dark plank SEAM lines across the floor (run along x, spaced in z) — merged to one mesh
    const geos=[], fw=w-0.5, fd=d-0.5, nS=Math.max(3,Math.round(fd/1.3));
    for(let i=1;i<nS;i++){ const sz=-fd/2+i*(fd/nS); const q=new THREE.BoxGeometry(fw,0.03,0.06); q.translate(cx,y+0.05,cz+sz); geos.push(q); }
    const BGU=THREE.BufferGeometryUtils||{}, mf=BGU.mergeGeometries||BGU.mergeBufferGeometries;
    const sm=new THREE.MeshLambertMaterial({color:0x6e4d29});
    if(mf&&geos.length){ const m=new THREE.Mesh(mf(geos,false),sm); m.receiveShadow=true; g.add(m); }
    else for(const q of geos) g.add(new THREE.Mesh(q,sm));
    scene.add(g);
  }
  let done=false;
  const iv=setInterval(()=>{
    try{
      if(done){ clearInterval(iv); return; }
      if(typeof running==='undefined' || !running) return;
      if(typeof groundY!=='function' || groundY(158,141)===null) return;    // Holm land baked
      if(!PLACE.every(p=>typeof window[p.fn]==='function')) return;         // all builders loaded
      const anchors={};
      // STAGGER each building across frames (~50ms apart) so the renderer never freezes at boot
      // (each Buildkit.house shell + character group is heavy). Anchors set now; meshes pop in over ~200ms.
      PLACE.forEach((p,i)=>{ anchors[p.k]={x:p.x, z:p.z};
        setTimeout(()=>{ try{ window[p.fn](p.x, p.z, 0); }catch(e){ console.error('[tutorial_island] build '+p.fn, e); } }, i*50); });
      window.TUTORIAL_ISLAND.buildings=anchors;   // for later station/NPC wiring
      done=true; clearInterval(iv);
      console.log('[tutorial_island] PHASE2 queued '+PLACE.length+' characterful buildings (staggered)');
    }catch(e){ console.error('[tutorial_island] PHASE2', e); clearInterval(iv); }
  }, 1500);
})();

/* PHASE 3: UNDERGROUND MINING CAVE — a shallow OPEN-TOP pit (sandy floor + LOW rock walls, NO
 * ceiling) at a far off-map offset, reached by a trapdoor on the Holm + a ladder back up. This
 * shape renders correctly under the game's fixed OVERHEAD camera — a walled+ceilinged Planes.addCave
 * does NOT (near-walls + ceiling occlude the interior; verified pass 10). Sea + surface terrain are
 * hidden while underground (plane<0). Matches Bible_References/Tutorial_Island_Mining_Cave (open
 * sunken rock area, ore rocks, glowing furnace, anvil, ladder). Verified in-browser pass 11. */
(function(){
  const CC={x:300,z:360}, TD={x:163,z:148};        // cave centre (off-map) + trapdoor on the Holm
  const Y=-6, WALL_H=1.4, HW=9, HD=7, SAND=0x6b5d44, ROCK=0x4a4238;
  let done=false;
  const iv=setInterval(()=>{
    try{
      if(done){ clearInterval(iv); return; }
      if(typeof running==='undefined' || !running) return;
      if(typeof Planes==='undefined' || typeof Planes.addFloor!=='function' || typeof Planes.addClimb!=='function') return;
      if(typeof makeRock!=='function' || typeof makeFurnace!=='function' || typeof mat!=='function') return;
      if(typeof scene==='undefined' || typeof WORLD==='undefined') return;
      // --- pit shell: sandy floor + low rock walls (NO ceiling) + torch glow ---
      const g=new THREE.Group();
      const floor=new THREE.Mesh(new THREE.BoxGeometry(HW*2,0.3,HD*2), mat(SAND));
      floor.position.set(CC.x,Y-0.15,CC.z); floor.receiveShadow=true; g.add(floor);
      const wall=(wx,wz,ww,wd)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(ww,WALL_H,wd),mat(ROCK)); m.position.set(wx,Y+WALL_H/2,wz); g.add(m); };
      wall(CC.x,CC.z-HD,HW*2+0.6,0.6); wall(CC.x,CC.z+HD,HW*2+0.6,0.6);
      wall(CC.x-HW,CC.z,0.6,HD*2+0.6); wall(CC.x+HW,CC.z,0.6,HD*2+0.6);
      const glow=new THREE.PointLight(0xff9a40,0.9,28); glow.position.set(CC.x,Y+2,CC.z); g.add(glow);
      scene.add(g);
      Planes.addFloor({plane:-1,x:CC.x,z:CC.z,hw:HW-0.6,hd:HD-0.6,y:Y});   // walkable region
      // wall colliders (plane -1) — circles along each edge so the player stays in the pit
      const wc=(x1,z1,x2,z2)=>{ const n=Math.max(2,Math.round(Math.hypot(x2-x1,z2-z1)/1.6)); for(let i=0;i<=n;i++){ const t=i/n; WORLD.colliders.push({type:'circle',x:x1+(x2-x1)*t,z:z1+(z2-z1)*t,r:0.5,plane:-1}); } };
      wc(CC.x-HW,CC.z-HD,CC.x+HW,CC.z-HD); wc(CC.x-HW,CC.z+HD,CC.x+HW,CC.z+HD);
      wc(CC.x-HW,CC.z-HD,CC.x-HW,CC.z+HD); wc(CC.x+HW,CC.z-HD,CC.x+HW,CC.z+HD);
      // --- props: mining rocks + glowing furnace + anvil (reseated to floor Y, plane-tagged) ---
      // STAGGER the ore rocks across frames (each makeRock is ~15 meshes → ~75 total; the heaviest part)
      [[CC.x-4,CC.z-3,'copper'],[CC.x-2,CC.z-3,'tin'],[CC.x-4,CC.z+2,'copper'],[CC.x+3,CC.z-3,'tin'],[CC.x+4,CC.z+2,'copper']]
        .forEach(([x,z,k],i)=>{ setTimeout(()=>{ try{ const r=makeRock(x,z,k); r.position.y=Y; r.userData.plane=-1; }catch(e){ console.error('[tutorial_island] rock', e); } }, i*50); });
      const furn=makeFurnace(CC.x+5,CC.z+3); furn.position.y=Y; furn.userData.plane=-1;
      WORLD.colliders[WORLD.colliders.length-1].plane=-1;   // retag the furnace's plane-0 collider
      { const a=new THREE.Group();   // minimal anvil (makeAnvil is private to prop_smithy); kind:'anvil' → smith grid
        const b=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.55,0.5),mat(0x33312e)); b.position.y=0.27; a.add(b);
        const t=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.24,1.05),mat(0x45423c)); t.position.y=0.66; a.add(t);
        const hn=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.5,6),mat(0x45423c)); hn.rotation.z=Math.PI/2; hn.position.set(0,0.66,0.72); a.add(hn);
        a.position.set(CC.x+2,Y,CC.z+3); a.userData={kind:'anvil',label:'Smith at <b>Anvil</b>',plane:-1};
        scene.add(a); WORLD.clickables.push(a); WORLD.colliders.push({type:'circle',x:CC.x+2,z:CC.z+3,r:0.6,plane:-1}); }
      // --- trapdoor on the Holm + ladder back up ---
      Planes.addClimb({x:TD.x,z:TD.z,h:0.1,name:'Trapdoor',label:'Climb-down <b>Trapdoor</b>',down:{plane:-1,x:CC.x-6,z:CC.z+4},
        mesh:(()=>{ const q=new THREE.Group();
          const t=new THREE.Mesh(new THREE.BoxGeometry(1,0.1,1),new THREE.MeshLambertMaterial({color:0x5a4226})); t.position.y=0.06; q.add(t);
          const rim=new THREE.Mesh(new THREE.TorusGeometry(0.62,0.07,4,8),new THREE.MeshLambertMaterial({color:0x3a2a18})); rim.rotation.x=Math.PI/2; rim.position.y=0.02; q.add(rim); return q; })()});
      Planes.addClimb({x:CC.x-7,z:CC.z+5,h:2.8,basePlane:-1,y:Y,name:'Ladder',label:'Climb-up <b>Ladder</b>',up:{plane:0,x:TD.x+1.6,z:TD.z+1.6}});
      // --- hide sea + surface terrain while underground (plane<0) ---
      if(WORLD.sea) Planes.addVisibilityRule(WORLD.sea, p=>p>=0);
      (WORLD.grounds||[]).forEach(gr=>Planes.addVisibilityRule(gr,p=>p>=0));
      window.TUTORIAL_ISLAND.cave={cx:CC.x,cz:CC.z,trapdoor:TD};
      done=true; clearInterval(iv);
      console.log('[tutorial_island] PHASE3 open-pit cave placed at ('+CC.x+','+CC.z+')');
    }catch(e){ console.error('[tutorial_island] PHASE3', e); clearInterval(iv); }
  }, 1600);
})();

/* PHASE 4: SURFACE DRESSING — the central knight STATUE (reference centerpiece: a stepped stone
 * plinth + a grey-stone knight holding a sword upright) + a BANK BOOTH (the banking-step station).
 * Self-boot guard; staggered so it doesn't add to the boot freeze. */
(function(){
  const SX=158, SZ=146, BANK=[163,143,Math.PI], RANGE=[171,140];   // range = chef's bread-baking station (SE of the kitchen)
  const STONE=0x8f8a80, STONE_D=0x6e6a62, STEEL=0x9aa0a8, BRONZE=0x7a6a48;
  function buildStatue(){
    const gyc=groundY(SX,SZ), g=new THREE.Group();
    const step=(w,y,c)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,0.42,w),mat(c)); m.position.set(SX,gyc+y,SZ); m.castShadow=true; m.receiveShadow=true; g.add(m); };
    step(2.4,0.21,STONE_D); step(1.9,0.63,STONE); step(1.3,1.15,STONE_D);       // stepped plinth
    const ped=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.7,1.0),mat(STONE)); ped.position.set(SX,gyc+1.7,SZ); g.add(ped);
    const F=new THREE.Group(); F.position.set(SX,gyc+2.05,SZ);                  // knight figure on the pedestal
    const b=(w,h,d,c,x,y,z)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c)); m.position.set(x,y,z); m.castShadow=true; F.add(m); };
    b(0.22,0.8,0.24,STONE,-0.16,0.4,0); b(0.22,0.8,0.24,STONE,0.16,0.4,0);       // legs
    b(0.62,0.82,0.36,STONE,0,1.15,0); b(0.44,0.5,0.42,STONE_D,0,1.68,0); b(0.3,0.34,0.3,STONE,0,2.05,0);  // torso/cape/head
    b(0.15,0.75,0.15,STONE,-0.34,1.1,0.16); b(0.15,0.75,0.15,STONE,0.34,1.1,0.16);   // arms
    b(0.12,1.5,0.04,STEEL,0,1.35,0.34); b(0.44,0.1,0.1,BRONZE,0,0.72,0.34); b(0.12,0.12,0.12,BRONZE,0,2.12,0.34);  // upright sword
    g.add(F); scene.add(g); WORLD.colliders.push({type:'circle',x:SX,z:SZ,r:1.4});
  }
  let done=false;
  const iv=setInterval(()=>{
    try{
      if(done){ clearInterval(iv); return; }
      if(typeof running==='undefined' || !running) return;
      if(typeof groundY!=='function' || groundY(SX,SZ)===null) return;
      if(typeof makeBankBooth!=='function' || typeof makeRange!=='function' || typeof mat!=='function' || typeof WORLD==='undefined' || typeof scene==='undefined') return;
      done=true; clearInterval(iv);
      setTimeout(()=>{ try{ (typeof window.makeTutStatue==='function'? window.makeTutStatue(SX,SZ) : buildStatue()); }catch(e){ console.error('[tutorial_island] statue', e); } }, 0);   // new modelled knight monument (tut_statue.js), fallback to old box statue
      setTimeout(()=>{ try{ makeBankBooth(BANK[0],BANK[1],BANK[2]); }catch(e){ console.error('[tutorial_island] bank', e); } }, 60);
      setTimeout(()=>{ try{ makeRange(RANGE[0],RANGE[1]); }catch(e){ console.error('[tutorial_island] range', e); } }, 120);   // chef's range (bread step)
      window.TUTORIAL_ISLAND.statue={x:SX,z:SZ}; window.TUTORIAL_ISLAND.bank={x:BANK[0],z:BANK[1]}; window.TUTORIAL_ISLAND.range={x:RANGE[0],z:RANGE[1]};
      console.log('[tutorial_island] PHASE4 statue + bank + range placed');
    }catch(e){ console.error('[tutorial_island] PHASE4', e); clearInterval(iv); }
  }, 1500);
})();
