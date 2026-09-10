/* ref_ladder.js — Ladder-to-Dungeon/Cave entrance (OSRS-style, low-poly flat-shaded)
 * Recreates Bible_References/Ladder_To_Dungeon_or_Cave.jpg:
 *   - a square DARK HOLE recessed into the ground (a pit)
 *   - dark/sloped interior walls so it reads as a hole from overhead
 *   - a log/timber RIM (stacked-log border) around the opening
 *   - a wooden LADDER (two side rails + rungs) leaning into the hole, descending to ~y=-2
 * Author-only file. Global-script (THREE r128). Exposes window.makeRefLadder(x,z,rot).
 */
(function(){
  // Material guard: use the world's mat() if present, else a flat-shaded Lambert fallback.
  const M = (c)=> (typeof mat==='function') ? mat(c)
                : new THREE.MeshLambertMaterial({color:c, flatShading:true});

  // Palette
  const C_WOOD   = 0x9c6b34; // warm ladder wood
  const C_WOODD  = 0x7a4f26; // darker rung/rail shade
  const C_LOG    = 0xbfa77e; // tan timber rim (as in ref)
  const C_LOGD   = 0x9c8862; // darker log for alternating depth
  const C_DIRT   = 0x6f5a3e; // brown dirt inner wall
  const C_DIRTD  = 0x4a3c28; // deeper dirt (lower walls)
  const C_VOID   = 0x0a0806; // near-black pit floor / interior

  // Footprint: ~5x5 tiles. Hole opening ~3x3, rim ring around it.
  const HALF   = 1.5;   // half-width of the square hole opening (opening = 3x3)
  const DEPTH  = 2.0;   // how far the pit descends (to y=-2)
  const RIMW   = 0.85;  // width of the log rim band

  window.makeRefLadder = function(x, z, rot){
    x = x||0; z = z||0; rot = rot||0;
    const g = new THREE.Group();

    // ---- 1) Pit interior walls (four sloped/vertical dark panels) forming the shaft ----
    // Slight inward slope at top -> reads as a recessed hole; dark material -> reads as a pit.
    const wallGeoTop = new THREE.PlaneGeometry(HALF*2, DEPTH);
    const mkWall = (col)=> new THREE.Mesh(wallGeoTop, M(col));
    const walls = [
      { pos:[0,-DEPTH/2, HALF], rotY:Math.PI },   // +Z facing in
      { pos:[0,-DEPTH/2,-HALF], rotY:0 },         // -Z
      { pos:[ HALF,-DEPTH/2,0], rotY:-Math.PI/2 },// +X
      { pos:[-HALF,-DEPTH/2,0], rotY: Math.PI/2 } // -X
    ];
    walls.forEach((w,i)=>{
      const m = mkWall(i<2 ? C_DIRT : C_DIRTD);
      m.material.side = THREE.DoubleSide;
      m.position.set(w.pos[0], w.pos[1], w.pos[2]);
      m.rotation.y = w.rotY;
      m.receiveShadow = true;
      g.add(m);
    });

    // ---- 2) Pit floor (near-black) so the overhead camera sees a dark hole ----
    const floor = new THREE.Mesh(new THREE.BoxGeometry(HALF*2, 0.1, HALF*2), M(C_VOID));
    floor.position.set(0, -DEPTH, 0);
    floor.receiveShadow = true;
    g.add(floor);

    // A darker "throat" ring just below ground to deepen the shadow read.
    const throat = new THREE.Mesh(new THREE.BoxGeometry(HALF*2-0.05, DEPTH*0.5, HALF*2-0.05), M(C_VOID));
    throat.position.set(0, -DEPTH*0.55, 0);
    g.add(throat);

    // ---- 3) Log/timber RIM around the opening (stacked-log style border) ----
    // Build the rim as a ring of short logs (boxes) laid end-to-end around the square.
    const inner = HALF;            // inner edge of rim = hole edge
    const outer = HALF + RIMW;     // outer edge
    const mid   = (inner + outer)/2;
    const rimY  = 0.18;            // sits just above ground
    const rimH  = 0.36;
    const rimGeo = new THREE.BoxGeometry(1, rimH, RIMW);
    const rimGeos = [];
    const logLen = 0.72;           // each timber segment length
    const spanHalf = outer;        // logs run the full outer span per side
    const nPer = Math.max(2, Math.round((spanHalf*2)/logLen));
    const step = (spanHalf*2)/nPer;

    // helper: place a segment along one side, alternating shade via slight y jitter (baked into geo not possible w/ merge color -> use two merged groups)
    const geosLight = [];
    const geosDark  = [];
    for(let side=0; side<4; side++){
      for(let k=0;k<nPer;k++){
        const t = -spanHalf + step*(k+0.5);
        const gm = rimGeo.clone();
        // orient: sides 0/2 run along X (logs long axis X), sides 1/3 run along Z
        const seg = new THREE.Object3D();
        if(side===0){ seg.position.set(t, rimY, -mid); seg.rotation.y=0; }
        if(side===2){ seg.position.set(t, rimY,  mid); seg.rotation.y=0; }
        if(side===1){ seg.position.set(-mid, rimY, t); seg.rotation.y=Math.PI/2; }
        if(side===3){ seg.position.set( mid, rimY, t); seg.rotation.y=Math.PI/2; }
        // scale segment length to the log length so they read as individual timbers
        seg.scale.x = logLen;
        seg.updateMatrix();
        gm.applyMatrix4(seg.matrix);
        ((side+k)%2===0 ? geosLight : geosDark).push(gm);
      }
    }
    const hasMerge = !!(THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries);
    const mergeInto = (list, col)=>{
      if(!list.length) return;
      if(hasMerge){
        const mesh = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(list, false), M(col));
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);
      } else {
        list.forEach(geo=>{ const mm = new THREE.Mesh(geo, M(col)); mm.castShadow = true; g.add(mm); });
      }
    };
    mergeInto(geosLight, C_LOG);
    mergeInto(geosDark,  C_LOGD);

    // ---- 4) Wooden LADDER: two side rails + rungs, leaning into the hole ----
    const ladder = new THREE.Group();
    const railLen = DEPTH + 1.0;   // extends above ground and down to floor
    const railR   = 0.09;
    const railGap = 0.66;          // distance between the two rails
    const railGeo = new THREE.BoxGeometry(railR*2, railLen, railR*2);
    const railL = new THREE.Mesh(railGeo, M(C_WOOD));
    const railRt= new THREE.Mesh(railGeo, M(C_WOOD));
    railL.position.set(-railGap/2, 0, 0);
    railRt.position.set( railGap/2, 0, 0);
    railL.castShadow = railRt.castShadow = true;
    ladder.add(railL); ladder.add(railRt);

    // Rungs: merge into one geometry.
    const rungGeo = new THREE.BoxGeometry(railGap + railR*2, railR*1.4, railR*1.4);
    const rungList = [];
    const nRungs = 8;
    for(let i=0;i<nRungs;i++){
      const y = -railLen/2 + 0.35 + (railLen-0.7)*(i/(nRungs-1));
      const rg = rungGeo.clone();
      rg.translate(0, y, 0);
      rungList.push(rg);
    }
    let rungMesh;
    if(THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries){
      rungMesh = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(rungList,false), M(C_WOODD));
      rungMesh.castShadow = true; ladder.add(rungMesh);
    } else {
      rungList.forEach(rgg=>{ const rm=new THREE.Mesh(rgg,M(C_WOODD)); rm.castShadow=true; ladder.add(rm); });
    }

    // Lean the ladder into the hole: tilt back and position against the -Z inner wall,
    // top poking above ground, bottom reaching near the pit floor.
    ladder.rotation.x = -0.28;                 // lean
    ladder.position.set(0, -DEPTH*0.5 + 0.4, -HALF + 0.55);
    g.add(ladder);

    // ---- place & orient the whole entrance ----
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    return g;
  };

  console.log('[ref_ladder] makeRefLadder ready');
})();
