/* ================= GEAR MODELS V1 =================
 * Runtime upgrade of the procedural held-gear meshes (world_gear.js) to
 * modelled GLB meshes. Loads assets/models/props/worn_gear_starter_v1.glb
 * (root node worn_gear_starter_v1 with grip-origin child groups gear_hatchet /
 * gear_pickaxe / gear_sword / gear_dagger / gear_shortbow / gear_shield; grip
 * at (0,0,0), blade along +Y, edge toward +X, shield face +X) and wraps the
 * global gearMesh() router: mapped items get a tier-recolored clone of the
 * modelled template, everything else (and any load failure) keeps the
 * procedural mesh. Because gearMesh is a top-level function declaration
 * (a window property), reassigning it here upgrades EVERY caller -- player
 * worn gear, the GLB avatar GearFit path (fx_humanoid.js), NPC gear, ground
 * drops (itemGroundMesh) and the anim showcase -- with no other file edited.
 * Fails soft: missing GLB / missing loader -> one console.warn, procedural
 * meshes stay. QA introspection via window.GearModels.status(). */
(function(){
  /* every gear GLB ships as its own file so new items never touch accepted assets */
  var GLB_SOURCES = [
    {url:'assets/models/props/worn_gear_starter_v1.glb?v=2',
     groups:['gear_hatchet','gear_pickaxe','gear_sword','gear_dagger','gear_shortbow','gear_shield','gear_helm']},
    {url:'assets/models/props/gear_longsword_v1.glb?v=7',  groups:['gear_longsword']},
    {url:'assets/models/props/gear_fullhelm_v1.glb?v=13',   groups:['gear_fullhelm']},
    {url:'assets/models/props/gear_scimitar_v1.glb?v=2',   groups:['gear_scimitar']},
    {url:'assets/models/props/gear_battleaxe_v1.glb?v=5',  groups:['gear_battleaxe']},
    {url:'assets/models/props/gear_kiteshield_v1.glb?v=3', groups:['gear_kiteshield']},
    {url:'assets/models/props/gear_longbow_v1.glb?v=4',    groups:['gear_longbow']},
    {url:'assets/models/props/gear_mace_v1.glb?v=3',       groups:['gear_mace']},
    {url:'assets/models/props/gear_warhammer_v1.glb?v=1',  groups:['gear_warhammer']},
    {url:'assets/models/props/gear_greatsword_v1.glb?v=1', groups:['gear_greatsword']},
    {url:'assets/models/props/gear_medhelm_v1.glb?v=4',    groups:['gear_medhelm']},
    {url:'assets/models/props/gear_sqshield_v1.glb?v=2',   groups:['gear_sqshield']},
  ];
  var MODEL_MAP = { axe:'gear_hatchet', pick:'gear_pickaxe', sword:'gear_sword',
                    longsword:'gear_longsword', sabre:'gear_scimitar',
                    battleaxe:'gear_battleaxe', kiteshield:'gear_kiteshield',
                    longbow:'gear_longbow',
                    mace:'gear_mace', warhammer:'gear_warhammer', greatsword:'gear_greatsword',
                    medhelm:'gear_medhelm', sqshield:'gear_sqshield',
                    bow:'gear_shortbow', shield:'gear_shield', helm:'gear_fullhelm' };
  var ID_MAP = { bronze_dagger:'gear_dagger',              // exact id wins over MODEL_MAP
                 iron_dagger:'gear_dagger' };              // tier recolor handles the iron look

  var _templates = {};       // group name -> fixed-up template Object3D
  var _failed = [];          // group names that failed the sanity check / were absent
  var _ready = false;
  var _matCache = {};        // (materialName + '|' + tier) -> shared recolored material

  /* capture the procedural router, then take over the global (top-level
   * function declarations are window properties, so this rebinds every caller) */
  var _procGearMesh = gearMesh;
  gearMesh = function(id){
    var def = (typeof ITEMS !== 'undefined') ? ITEMS[id] : null;
    var key = ID_MAP[id] || (def && def.model && MODEL_MAP[def.model]) || null;
    if(_ready && key && _templates[key]){
      try{ return cloneTinted(key, def); }
      catch(e){ console.warn('[GEAR] clone failed for '+id+', procedural fallback', e); }
    }
    return _procGearMesh(id);
  };

  /* tier recolor: CR_GEAR_METAL* materials take the tier colour; _EDGE
   * lightens, _DARK darkens, plain stays as-is. Cached per (name+tier)
   * so all clones of a tier share materials. */
  function tintedMaterial(srcMat, def){
    var name = srcMat.name || '';
    if(name.indexOf('CR_GEAR_METAL') !== 0) return null;   // not a recolorable metal
    var tier = (def && def.tier) || '_';
    var cKey = name + '|' + tier;
    if(_matCache[cKey]) return _matCache[cKey];
    var tint = new THREE.Color(tierMetal(def || {}));
    if(name.indexOf('CR_GEAR_METAL_EDGE') === 0)      tint.lerp(new THREE.Color(0xffffff), 0.3);
    else if(name.indexOf('CR_GEAR_METAL_DARK') === 0) tint.multiplyScalar(0.72);
    var m = srcMat.clone();
    m.color.copy(tint);
    _matCache[cKey] = m;
    return m;
  }
  function cloneTinted(key, def){
    var g = _templates[key].clone(true);                   // clone SHARES materials --
    g.traverse(function(o){                                // swap on the clone only,
      if(!o.isMesh || !o.material) return;                 // never touch the template
      if(Array.isArray(o.material)){
        var arr = o.material.slice();
        for(var i=0;i<arr.length;i++){ var t=tintedMaterial(arr[i], def); if(t) arr[i]=t; }
        o.material = arr;
      }else{
        var t = tintedMaterial(o.material, def);
        if(t) o.material = t;
      }
    });
    return g;
  }

  function onLoaded(gltf, GROUPS){
    var scene = gltf.scene || gltf.scenes && gltf.scenes[0];
    if(!scene){ console.warn('[GEAR] GLB has no scene -- procedural gear stays'); return; }
    scene.traverse(function(o){                            // GLB PBR exports render black
      if(o.isMesh){                                        // in this flat-lit scene -- same
        o.castShadow = true;                               // fix as installPlayerGLB
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for(var i=0;i<mats.length;i++){
          var m = mats[i]; if(!m) continue;
          if(m.metalness !== undefined) m.metalness = 0;
          if(m.roughness !== undefined) m.roughness = 1;
        }
      }
    });
    var size = new THREE.Vector3();
    for(var i=0;i<GROUPS.length;i++){
      var name = GROUPS[i];
      var node = scene.getObjectByName(name);
      if(!node){ _failed.push(name); console.warn('[GEAR] group missing in GLB: '+name); continue; }
      new THREE.Box3().setFromObject(node).getSize(size);
      var dim = Math.max(size.x, size.y, size.z);
      if(!(dim >= 0.25 && dim <= 1.4)){                    // sane held-item size only --
        _failed.push(name);                                // fail visible, not silent
        console.warn('[GEAR] '+name+' size out of range ('+dim.toFixed(2)+'wu), procedural fallback');
        continue;
      }
      node.position.set(0,0,0);                            // authored at grip origin; defensive
      _templates[name] = node;
    }
    var names = Object.keys(_templates);
    if(!names.length){ console.warn('[GEAR] no usable templates in GLB -- procedural gear stays'); return; }
    _ready = true;
    window.GearModels.ready = true;
    console.info('[GEAR] modelled worn gear live: ' + names.join(', '));
    /* upgrade already-equipped saved gear on the spot */
    if(typeof refreshPlayerGear === 'function' && typeof player !== 'undefined' && player.userData){
      try{ refreshPlayerGear(); }
      catch(e){ console.warn('[GEAR] refreshPlayerGear after load failed', e); }
    }
  }

  function startLoad(){
    GLB_SOURCES.forEach(function(src){
      try{
        new THREE.GLTFLoader().load(src.url, function(gltf){
          try{ onLoaded(gltf, src.groups); }
          catch(e){ console.warn('[GEAR] template setup failed for '+src.url, e); }
        }, undefined, function(err){
          console.warn('[GEAR] '+src.url+' not loadable -- procedural gear stays', err && err.message ? err.message : err);
        });
      }catch(e){
        console.warn('[GEAR] GLTFLoader.load threw for '+src.url, e);
      }
    });
  }
  function loaderPresent(){ return typeof THREE !== 'undefined' && !!THREE.GLTFLoader; }
  // Always defer the GLB fetch until the page has finished loading: the boot
  // script chain (and its 5s smoke budget) must never compete with this
  // request. Equipped gear upgrades in place via refreshPlayerGear on ready.
  if(document.readyState === 'complete'){
    if(loaderPresent()) startLoad();
    else console.warn('[GEAR] THREE.GLTFLoader unavailable -- procedural gear stays');
  } else window.addEventListener('load', function(){      // scripts load in order, so a
    if(loaderPresent()) startLoad();                      // missing loader here is real
    else console.warn('[GEAR] THREE.GLTFLoader unavailable -- procedural gear stays');
  });

  /* QA introspection (explicit window assignment -- lexical globals are
   * invisible to the browser javascript_tool) */
  window.GearModels = {
    ready: false,
    templates: _templates,
    status: function(){
      return { ready: _ready, loaded: Object.keys(_templates), failed: _failed.slice() };
    }
  };
})();
















