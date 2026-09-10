/* ============ buildkit_thatch.js — OPT-IN golden thatch roof capability ============
 * ADDITIVE and OPT-IN, default OFF. Loaded AFTER buildkit.js. Patches Buildkit.house
 * to honour a new opt-in flag so a caller can request an OSRS-Tutorial-Island golden
 * STRAW roof. When the flag is ABSENT, Buildkit.house behaves byte-for-byte as before
 * (the original function is called untouched) — existing buildings are unchanged.
 *
 *   Enable per-building:   Buildkit.house({ x, z, w, d, roofStyle:'thatch' })
 *                          (alias also accepted: { roofTex:'thatch' })
 *
 * REVERSIBLE: delete this file + its <script> tag and every building renders exactly
 * as it did before — nothing else references it.
 *
 * WHY A RE-TINT, NOT A NEW MATERIAL: makeBuilding() (game2_world.js) already maps the
 * straw-course texture (TEX.thatchRoof) onto the roof slopes with a per-slope repeat.
 * We keep that proven geometry + tiling and only (a) recolour this one building's roof
 * slopes to golden straw, (b) recolour its shingle-course bands to a darker gold, and
 * (c) guarantee the straw texture is present (self-contained fallback generator) so the
 * capability holds even if a future default ever drops the map. Each building owns its
 * own roof/band material instances (makeBuilding + _dressRoof create them fresh per
 * call), so mutating them is strictly local to the opted-in building.
 */
(function(){
  if(typeof Buildkit==='undefined' || Buildkit._thatchPatched) return;

  Buildkit.THATCH_GOLD = 0xC9A24B;   // golden straw, matches the reference roofs

  /* ---- self-contained tileable straw texture (fallback only; reuses TEX.thatchRoof
     when the game's buildTextures() has run, which is the normal case). Golden/tan
     straw with fine horizontal reed striations + subtle tonal noise, NearestFilter to
     match the game's flat-shaded pixel look. Cached after first build. ---- */
  Buildkit._thatchTexture = function(){
    if(typeof TEX!=='undefined' && (TEX.thatchRoof||TEX.thatch)) return (TEX.thatchRoof||TEX.thatch);
    if(this._thatchTexCache) return this._thatchTexCache;
    const c=document.createElement('canvas'); c.width=64; c.height=64; const x=c.getContext('2d');
    x.fillStyle='#c4a35c'; x.fillRect(0,0,64,64);                 // golden straw base
    [['#b8964e',150,2],['#d0b56e',110,2]].forEach(([col,n,s])=>{  // tonal noise
      x.fillStyle=col; for(let i=0;i<n;i++) x.fillRect(Math.random()*64|0,Math.random()*64|0,s,s); });
    x.strokeStyle='#8c6b34'; x.lineWidth=2;                       // dark reed seam per course
    for(let y=5;y<64;y+=11){ x.beginPath(); x.moveTo(0,y); x.lineTo(64,y); x.stroke(); }
    x.strokeStyle='#dcc587'; x.lineWidth=1;                       // straw highlight below each seam
    for(let y=8;y<64;y+=11){ x.beginPath(); x.moveTo(0,y); x.lineTo(64,y); x.stroke(); }
    const t=new THREE.CanvasTexture(c);
    t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;
    this._thatchTexCache=t; return t;
  };

  /* ---- re-skin ONE building's roof group to golden thatch (in place, local to it) ---- */
  Buildkit._goldenThatch = function(roofG){
    if(!roofG) return;
    const GOLD=new THREE.Color(Buildkit.THATCH_GOLD);
    const slopeCol=GOLD.clone().lerp(new THREE.Color(0xffffff), 0.42);  // same tint math as makeBuilding
    const bandCol =GOLD.clone().multiplyScalar(0.62);                    // darker gold shingle courses
    roofG.traverse(o=>{
      if(!o.isMesh || !o.geometry || !o.material) return;
      const gt=o.geometry.type;
      // _dressRoof band courses ride as children OF a slope mesh (parent is a mesh, not
      // the roof group) — recolour them to the darker gold so bands stay coherent.
      if(o.parent && o.parent.isMesh){ o.material.color.copy(bandCol); o.material.needsUpdate=true; return; }
      // roof SLOPE surfaces: hip/dormer cones + tilted gable slope boxes. Matches the
      // makeBuilding + _dressRoof targeting exactly (cone, or box tilted off flat).
      const isSlope = gt==='ConeGeometry'
        || (gt==='BoxGeometry' && (Math.abs(o.rotation.x)>0.05 || Math.abs(o.rotation.z)>0.05));
      if(isSlope && o.material.map){                 // .map guard skips any untextured trim
        o.material.color.copy(slopeCol);
        if(!o.material.map){ const t=Buildkit._thatchTexture().clone(); t.needsUpdate=true;
          t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2.4,3.2); o.material.map=t; }
        o.material.needsUpdate=true;
      }
    });
  };

  /* ---- patch house(): opt-in only; default path is the ORIGINAL function verbatim ---- */
  const _origHouse = Buildkit.house;
  Buildkit.house = function(opts){
    opts = opts || {};
    const wantThatch = opts.roofStyle==='thatch' || opts.roofTex==='thatch';
    if(!wantThatch) return _origHouse.call(this, opts);   // <-- DEFAULT: identical to today
    // makeBuilding pushes exactly one interiors entry per house() (synchronously); its
    // .roof is the roof group. Capture the index so we recolour OUR roof, not a neighbour's.
    const idx = (typeof WORLD!=='undefined' && WORLD.interiors) ? WORLD.interiors.length : -1;
    const g = _origHouse.call(this, opts);
    const it = (idx>=0) ? WORLD.interiors[idx] : null;
    if(it && it.roof) Buildkit._goldenThatch(it.roof);
    return g;
  };

  Buildkit._thatchPatched = true;
})();
