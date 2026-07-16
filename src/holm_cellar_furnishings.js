/* ================= WORKYARD CELLAR FURNISHINGS =================
 * Owns the eleven-family Blender furnishing package, its semantic interactions,
 * the slow authored hearth loop, and the restrained west-shelf readability
 * light.  The architecture loader remains responsible for the room shell,
 * collisions and traversal.
 */
var HolmCellarFurnishings=(function(){
  'use strict';
  var CELLAR={x:330,y:-6,z:300,plane:-1};
  var model=null,ready=false,loading=false,mixer=null,hearthFlame=null;
  var legacyHearth=null,westShelfLight=null,lastFrame=0;
  var clickables=[],parts={},assetMetadata=null,errorMessage=null,onHearthReady=null;
  var hearthMeshCount=0,hearthFlameMeshCount=0,hearthBounds=null,pictureBounds=null,hearthAnimationSeconds=0;

  var DEFINITIONS=[
    {id:'cellar_storage_shelf',key:'shelf',name:'Reserve shelf',
      message:'A sturdy reserve shelf with each sack, crock and basket fitted neatly below the next plank.'},
    {id:'cellar_supply_barrel',key:'barrels',name:'Supply barrel',
      message:'A stave barrel of dried provisions, banded for the damp cellar air.'},
    {id:'cellar_lidded_crock',key:'crocks',name:'Lidded crock',
      message:'A blue-banded stoneware crock for pickled roots and other storm stores.'},
    {id:'cellar_grain_sack',key:'sacks',name:'Grain sack',
      message:'A patched sack of coarse meal, tied firmly against mice and moisture.'},
    {id:'cellar_handled_basket',key:'baskets',name:'Handled basket',
      message:'A hand-woven willow basket, repaired often enough to have earned its place.'},
    {id:'cellar_provision_table',key:'table',name:'Provision table',
      message:'A plain oak worktable for sorting, cutting and packing the cellar stores.'},
    {id:'cellar_root_basket',key:'roots',name:'Root basket',
      message:'Carrots, onions and a pale turnip wait here for the next meal.'},
    {id:'cellar_cutting_board_knife',key:'board',name:'Cutting board and knife',
      message:'A broad cellar knife rests in the hand-cut groove of an old oak board.'},
    {id:'cellar_aisle_rug',key:'rug',name:'Woven aisle runner',
      message:'Madder red, deep blue and ochre wool soften the cold central aisle.'},
    {id:'cellar_medieval_wall_picture',key:'picture',name:'The Moonward Watch',
      message:'An eight-bit knight approaches a lonely watchtower beneath a crescent moon. Someone painted every square with admirable patience.'},
    {id:'cellar_masonry_hearth',key:'hearth',name:'Cellar hearth',
      message:'A single masonry hearth keeps the storm cellar slow, warm and quietly alive.'}
  ];

  function findAll(base,id){
    var found=[];
    if(!base)return found;
    base.traverse(function(object){
      if((object.userData&&object.userData.partId===id)||object.name===id)found.push(object);
    });
    return found;
  }
  function findOne(base,id){var list=findAll(base,id);return list[0]||null;}
  function pushClickable(object){
    if(!object||clickables.indexOf(object)>=0)return;
    WORLD.clickables.push(object);clickables.push(object);
  }
  function bindDefinition(definition){
    var roots=findAll(model,definition.id);parts[definition.key]=roots;
    roots.forEach(function(root){
      root.traverse(function(object){
        if(!object.isMesh)return;
        object.userData=Object.assign({},object.userData||{},
          {kind:'prop',inspectOnly:true,inspectName:definition.name,inspectMessage:definition.message,
            label:'Inspect <b>'+definition.name+'</b>',plane:-1,roomAsset:'cellar_remaining_furnishings_v1'});
        pushClickable(object);
      });
    });
    return roots.length;
  }
  function normalize(next){
    next.name='cellar-remaining-furnishings-v1-runtime';
    next.position.set(CELLAR.x,CELLAR.y,CELLAR.z);
    next.userData=Object.assign({},next.userData||{},
      {plane:-1,assetId:'cellar_remaining_furnishings_v1',pipeline:'nano-banana-2-to-blender'});
    next.traverse(function(object){
      object.userData=object.userData||{};
      if(object.isMesh){
        object.castShadow=true;object.receiveShadow=true;
        var materials=Array.isArray(object.material)?object.material:[object.material];
        materials.forEach(function(material){
          if(material){material.flatShading=true;material.needsUpdate=true;}
        });
      }
    });
    return next;
  }
  function addShelfReadabilityLight(){
    westShelfLight=new THREE.PointLight(0xffad63,.34,5.1,2);
    westShelfLight.name='cellar-west-shelf-readability-light';
    westShelfLight.position.set(-4.72,2.05,.20);
    westShelfLight.userData={purpose:'lift-darkest-west-shelf',plane:-1};
    model.add(westShelfLight);
  }
  function finish(gltf){
    model=normalize(gltf.scene);
    assetMetadata=findOne(model,'cellar_remaining_furnishings_v1');
    var counts={};
    DEFINITIONS.forEach(function(definition){counts[definition.key]=bindDefinition(definition);});
    var required=['shelf','barrels','crocks','sacks','baskets','table','roots','board','rug','picture','hearth'];
    if(required.some(function(key){return !counts[key];}))
      throw new Error('furnishing GLB is missing one or more semantic families: '+JSON.stringify(counts));
    hearthFlame=findOne(model,'cellar_hearth_flame');
    if(!hearthFlame)throw new Error('furnishing GLB is missing cellar_hearth_flame');
    // The old depth-cached GLB could leave the authored flame behind the dark
    // firebox in Three r128.  The new asset moves it forward; these runtime
    // guards also keep every flame layer opaque, emissive and double-sided.
    hearthFlame.traverse(function(object){
      object.visible=true;
      if(!object.isMesh)return;
      hearthFlameMeshCount++;object.frustumCulled=false;object.renderOrder=18;
      var materials=Array.isArray(object.material)?object.material:[object.material];
      materials.forEach(function(material){if(material){
        material.visible=true;material.transparent=false;material.opacity=1;material.depthWrite=true;
        material.side=THREE.DoubleSide;
        if(material.emissive){
          var core=(material.name||'').toLowerCase().indexOf('core')>=0;
          material.emissive.setHex(core?0xffb845:0xff4a08);
          material.emissiveIntensity=Math.max(material.emissiveIntensity||0,core?1.85:1.55);
        }
        material.needsUpdate=true;
      }});
    });
    // Blender renders authored faces from either side, while Three r128 culls
    // backfaces.  The joined hearth contains hand-set blocks with mixed winding,
    // so make this one fixture double-sided and exempt it from aggregate-frustum
    // culling.  The rest of the room keeps normal one-sided materials.
    parts.hearth[0].traverse(function(object){
      object.visible=true;
      if(!object.isMesh)return;
      hearthMeshCount++;
      object.frustumCulled=false;
      var materials=Array.isArray(object.material)?object.material:[object.material];
      materials.forEach(function(material){if(material){material.visible=true;material.opacity=1;
        material.side=THREE.DoubleSide;material.needsUpdate=true;}});
    });
    var clip=(gltf.animations||[]).filter(function(candidate){return candidate.name==='Hearth_Flame';})[0];
    if(!clip)throw new Error('furnishing GLB is missing Hearth_Flame');
    hearthAnimationSeconds=clip.duration||0;
    mixer=new THREE.AnimationMixer(model);
    var action=mixer.clipAction(clip);action.setLoop(THREE.LoopRepeat,Infinity);action.play();
    addShelfReadabilityLight();
    scene.add(model);model.updateMatrixWorld(true);
    var hearthBox=new THREE.Box3().setFromObject(parts.hearth[0]);
    var hearthCenter=new THREE.Vector3(),hearthSize=new THREE.Vector3();
    hearthBox.getCenter(hearthCenter);hearthBox.getSize(hearthSize);
    hearthBounds={center:{x:+hearthCenter.x.toFixed(2),y:+hearthCenter.y.toFixed(2),z:+hearthCenter.z.toFixed(2)},
      size:{x:+hearthSize.x.toFixed(2),y:+hearthSize.y.toFixed(2),z:+hearthSize.z.toFixed(2)}};
    var pictureBox=new THREE.Box3().setFromObject(parts.picture[0]);
    var pictureCenter=new THREE.Vector3(),pictureSize=new THREE.Vector3();
    pictureBox.getCenter(pictureCenter);pictureBox.getSize(pictureSize);
    pictureBounds={center:{x:+pictureCenter.x.toFixed(2),y:+pictureCenter.y.toFixed(2),z:+pictureCenter.z.toFixed(2)},
      size:{x:+pictureSize.x.toFixed(2),y:+pictureSize.y.toFixed(2),z:+pictureSize.z.toFixed(2)}};
    Planes.addVisibilityRule(model,function(plane){return plane===-1;});
    if(legacyHearth)legacyHearth.visible=false;
    ready=true;loading=false;errorMessage=null;Planes.refreshVisibility();
    if(onHearthReady)onHearthReady(hearthFlame,parts.hearth[0],clip.duration||0);
    console.log('[holm_cellar_furnishings] eleven Blender furnishing families ready '+JSON.stringify({hearthMeshes:hearthMeshCount,flameMeshes:hearthFlameMeshCount,hearthBounds:hearthBounds}));
  }
  function load(options){
    options=options||{};
    if(options.legacyHearth){legacyHearth=options.legacyHearth;legacyHearth.visible=false;}
    if(options.onHearthReady)onHearthReady=options.onHearthReady;
    if(ready){if(onHearthReady)onHearthReady(hearthFlame,parts.hearth[0],0);return;}
    if(loading||typeof THREE==='undefined'||!THREE.GLTFLoader)return;
    loading=true;
    new THREE.GLTFLoader().load('/assets/models/props/cellar_remaining_furnishings_v1.glb?v=9',
      function(gltf){try{finish(gltf);}catch(error){loading=false;if(legacyHearth)legacyHearth.visible=true;
        errorMessage=String(error&&error.message||error);console.error('[holm_cellar_furnishings]',error);}},
      undefined,function(error){loading=false;if(legacyHearth)legacyHearth.visible=true;
        errorMessage=String(error&&error.message||error);console.error('[holm_cellar_furnishings] load failed',error);});
  }
  function animate(now){
    try{
      if(mixer){
        var dt=lastFrame?Math.min(.05,Math.max(0,((now||0)-lastFrame)/1000)):0;
        lastFrame=now||0;mixer.update(dt);
      }
    }catch(error){console.error('[holm_cellar_furnishings] animation',error);}
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  return {load:load,snapshot:function(){
    var familyCounts={};Object.keys(parts).forEach(function(key){familyCounts[key]=parts[key].length;});
    var rootBasketBody=parts.roots&&parts.roots[0]&&findOne(parts.roots[0],'cellar_root_basket_body');
    return {ready:ready,loading:loading,error:errorMessage,asset:ready?'cellar_remaining_furnishings_v1':null,
      familyCounts:familyCounts,semanticFamilies:Object.keys(parts).length,clickables:clickables.length,
      inspectionOnly:clickables.length&&clickables.every(function(object){return object.userData&&
        object.userData.kind==='prop'&&object.userData.inspectOnly&&object.userData.inspectMessage;}),
      hearthAnimation:hearthFlame&&mixer?'Hearth_Flame':null,hearthAnimationSeconds:hearthAnimationSeconds,
      legacyHearthHidden:!!legacyHearth&&!legacyHearth.visible,
      hearthMeshCount:hearthMeshCount,hearthFlameMeshCount:hearthFlameMeshCount,
      hearthFlameVisible:hearthFlameMeshCount>0&&hearthFlame.visible!==false,
      wallPictureReady:!!familyCounts.picture,hearthBounds:hearthBounds,pictureBounds:pictureBounds,
      hearthBackWallContact:!!hearthBounds&&hearthBounds.center.z+hearthBounds.size.z*.5>=CELLAR.z+4.48,
      pictureBelowWallCap:!!pictureBounds&&pictureBounds.center.y+pictureBounds.size.y*.5<=CELLAR.y+3.08,
      openBasketInteriors:!!parts.baskets&&parts.baskets.length===2&&parts.baskets.every(function(root){
        return root.userData&&root.userData.openInteriorDepth>=.16&&root.userData.interiorMaterial==='warm-willow';
      }),
      rootBasketInterior:!!rootBasketBody&&rootBasketBody.userData&&rootBasketBody.userData.openInteriorDepth>=.30,
      rootProduceNested:!!parts.roots&&parts.roots.length===1&&
        parts.roots[0].userData&&parts.roots[0].userData.produceNestedBelowRim===true,
      fullArchedFirebox:!!parts.hearth&&parts.hearth.length===1&&parts.hearth[0].userData&&
        parts.hearth[0].userData.fullCavityBacking===true&&parts.hearth[0].userData.cavityDepth>=.5,
      barrelToolClearance:assetMetadata&&assetMetadata.userData&&assetMetadata.userData.barrelToolClearance,
      westShelfReadabilityLight:!!westShelfLight,modelPosition:model&&{x:model.position.x,y:model.position.y,z:model.position.z}};
  }};
})();
