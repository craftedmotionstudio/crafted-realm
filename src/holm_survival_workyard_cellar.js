/* ================= SURVIVAL WORKYARD STORM CELLAR =================
 * Loads the Blender-authored cellar at an OSRS-style far map offset on plane
 * -1, then turns the surface hatch and cellar ladder into a real two-way climb.
 * One lightweight loop also animates the authored flame sockets and keeps
 * surface terrain hidden while the player is underground.
 */
var HolmSurvivalCellar=(function(){
  'use strict';
  var CELLAR={x:330,z:300,y:-6,plane:-1,hw:5.35,hd:3.85};
  var RESERVE_CHEST={xOffset:-1.25,zOffset:3.25,colliderHw:1.16,colliderHd:.65,
    wallServiceGap:.28,openSettleDegrees:54};
  var CELLAR_APPROACH={x:CELLAR.x-4.05,z:CELLAR.z+2.47};
  function surfaceLayout(){
    var fallback={x:110.35,z:154.65,walkX:110.35,walkZ:153.35};
    try{
      var def=WorldV2BuildingData.get('holm_survival_workyard_v1');
      var row=def.supportSpaces.filter(function(s){return s.id==='cellar_ladder';})[0];
      if(!row) return fallback;
      var rot=def.placement.rot||0,c=Math.cos(rot),s=Math.sin(rot);
      function project(p){ return {x:def.placement.x+c*p[0]+s*p[1],z:def.placement.z-s*p[0]+c*p[1]}; }
      var anchor=project(row.position),walk=project(row.interactionTile);
      return {x:anchor.x,z:anchor.z,walkX:walk.x,walkZ:walk.z};
    }catch(error){ return fallback; }
  }
  var SURFACE=surfaceLayout();
  var root=null,ready=false,loading=false,surfaceRoot=null,surfaceFlame=null,surfaceClimbProxy=null,cellarWalkSurface=null;
  var hearthClickProxy=null,cellarExitProxy=null,cellarExitData=null;
  var cellarLadderClickTargets=[];
  var cellarFlames=[],cellarLights=[],cellarGlows=[],runtimeColliders=[],runtimeClickables=[],glowTexture=null;
  var torchFlames=[],hearthFlame=null,reserveModal=null;
  var reserveChest=null,reserveChestModel=null,reserveChestReady=false,reserveChestLoading=false;
  var reserveChestMixer=null,reserveChestAction=null,reserveChestAnimLast=0,legacyChest=null;
  var wallTorchModels=[],wallTorchMixers=[],wallTorchFlames=[],legacyWallTorches=[];
  var wallTorchLoading=false,wallTorchReady=0,wallTorchAnimLast=0,wallTorchClipDuration=0;
  var quietCornerModel=null,quietCornerReady=false,quietCornerLoading=false,quietCornerCollider=null;
  var quietCornerParts={tall:null,low:null,table:null,basket:null};
  var ladderFamilyTemplate=null,ladderFamilyLoading=false,ladderFamilyReady=false;
  var ladderHatchClip=null,surfaceHatchMixer=null;
  var surfaceLadderModel=null,cellarLadderModel=null,legacySurfaceLadder=null,legacyCellarLadder=null;
  var wasUnderground=false,savedBackground=null,savedFog=null;

  function findPart(base,id){
    if(!base) return null;
    if(typeof WorldV2Buildings!=='undefined'&&WorldV2Buildings.findPart)
      return WorldV2Buildings.findPart(base,id);
    var found=null;
    base.traverse(function(o){ if(!found&&((o.userData&&o.userData.partId===id)||o.name===id)) found=o; });
    return found;
  }
  function pushClickable(obj){
    if(!obj||runtimeClickables.indexOf(obj)>=0) return;
    WORLD.clickables.push(obj); runtimeClickables.push(obj);
  }
  function dropClickable(obj){
    var i;
    i=WORLD.clickables.indexOf(obj);if(i>=0)WORLD.clickables.splice(i,1);
    i=runtimeClickables.indexOf(obj);if(i>=0)runtimeClickables.splice(i,1);
  }
  function clearCellarLadderClickTargets(){
    cellarLadderClickTargets.forEach(dropClickable);cellarLadderClickTargets.length=0;
  }
  function bindCellarLadderClickTargets(base){
    if(!base||!cellarExitData)return 0;
    clearCellarLadderClickTargets();
    base.traverse(function(object){
      if(!object.isMesh)return;
      object.userData=Object.assign({},object.userData||{},cellarExitData,
        {clickTarget:'visible-ladder-mesh'});
      pushClickable(object);cellarLadderClickTargets.push(object);
    });
    return cellarLadderClickTargets.length;
  }
  function prepareTraversalModel(model,plane,label){
    model.name=label;
    model.userData=Object.assign({},model.userData||{},
      {plane:plane,assetId:'cellar_traversal_pair_v2',factoryVersion:2,designRevision:4});
    model.traverse(function(o){
      o.userData=o.userData||{};
      if(o.isMesh){
        o.castShadow=true;o.receiveShadow=true;
        var materialList=Array.isArray(o.material)?o.material:[o.material];
        materialList.forEach(function(material){
          if(material){material.flatShading=true;material.needsUpdate=true;}
        });
      }
    });
    return model;
  }
  function installSurfaceLadder(){
    if(surfaceLadderModel||!ladderFamilyTemplate||!legacySurfaceLadder)return false;
    var model=prepareTraversalModel(ladderFamilyTemplate.clone(true),0,
      'cellar-traversal-pair-v2-surface-runtime');
    var surface=findPart(model,'SurfaceFloorHatch'),cellar=findPart(model,'CellarWallLadder');
    if(!surface||!cellar||!findPart(model,'SurfaceHatchStatic')||!findPart(model,'SurfaceHatchLid'))
      throw new Error('surface floor hatch is missing a purpose-built semantic root');
    cellar.visible=false;surface.visible=true;
    var y=groundY(SURFACE.x,SURFACE.z);
    model.position.set(SURFACE.x,(y===null?0:y)+.005,SURFACE.z);
    // The support-space approach is north of the hatch; turn the Blender +Z
    // presentation toward that cardinal landing without changing its scale.
    model.rotation.y=Math.PI;
    model.userData.view='surface-floor-hatch-only';
    model.userData.scaleContract='1.9-player-v2';
    scene.add(model);model.updateMatrixWorld(true);
    if(ladderHatchClip){
      surfaceHatchMixer=new THREE.AnimationMixer(model);
      var hatchAction=surfaceHatchMixer.clipAction(ladderHatchClip);
      hatchAction.setLoop(THREE.LoopOnce,1);hatchAction.clampWhenFinished=true;hatchAction.play();
      surfaceHatchMixer.setTime(ladderHatchClip.duration);
      model.updateMatrixWorld(true);
    }
    Planes.addVisibilityRule(model,function(plane){return plane===0;});
    surfaceLadderModel=model;legacySurfaceLadder.visible=false;
    Planes.refreshVisibility();
    return true;
  }
  function installCellarLadder(){
    if(cellarLadderModel||!ladderFamilyTemplate||!legacyCellarLadder)return false;
    var model=prepareTraversalModel(ladderFamilyTemplate.clone(true),-1,
      'cellar-traversal-pair-v2-cellar-runtime');
    var surface=findPart(model,'SurfaceFloorHatch'),cellar=findPart(model,'CellarWallLadder');
    if(!surface||!cellar||!findPart(model,'CellarLadderRuntimeMesh'))
      throw new Error('cellar wall ladder is missing a purpose-built semantic root');
    // The cellar side is a simple authored three-tile ladder: no duplicated
    // hatch, black recess, or stretched copy of the surface threshold.
    surface.visible=false;cellar.visible=true;
    // The authored top is almost flush with local Y=0.  This origin places it
    // against the west wall while the stronger rake leaves the feet in-room.
    model.position.set(CELLAR.x-5.48,CELLAR.y+.02,CELLAR.z+2.47);
    model.rotation.y=Math.PI/2;
    model.scale.set(1,1,1);
    model.userData.view='cellar-wall-ladder-only';
    model.userData.contextHeightScale=1;
    model.userData.contextRungSpacing=.31;
    scene.add(model);model.updateMatrixWorld(true);
    Planes.addVisibilityRule(model,function(plane){return plane===-1;});
    cellarLadderModel=model;
    // Only the visible authored rails and rungs own climb-up.  A click that
    // misses them now reaches the walkable floor and simply walks there.
    if(!bindCellarLadderClickTargets(cellar))
      throw new Error('cellar wall ladder has no visible click target meshes');
    // The fallback mesh can leave the scene completely once the authored
    // ladder is ready, avoiding a second ladder after visibility refreshes.
    legacyCellarLadder.visible=false;
    legacyCellarLadder.traverse(function(object){object.visible=false;});
    if(legacyCellarLadder.parent)legacyCellarLadder.parent.remove(legacyCellarLadder);
    Planes.refreshVisibility();
    return true;
  }
  function loadTraversalFamily(){
    if(ladderFamilyTemplate){
      installSurfaceLadder();installCellarLadder();
      ladderFamilyReady=!!cellarLadderModel&&!!surfaceLadderModel;
      return;
    }
    if(ladderFamilyLoading)return;
    ladderFamilyLoading=true;
    new THREE.GLTFLoader().load('/assets/models/props/cellar_traversal_pair_v2.glb?v=7',function(gltf){
      try{
        ladderFamilyTemplate=gltf.scene;
        ladderHatchClip=(gltf.animations||[]).filter(function(clip){return clip.name==='Hatch_Open';})[0]||null;
        if(!findPart(ladderFamilyTemplate,'SurfaceFloorHatch')||
           !findPart(ladderFamilyTemplate,'SurfaceHatchStatic')||
           !findPart(ladderFamilyTemplate,'SurfaceHatchLid')||
           !findPart(ladderFamilyTemplate,'CellarWallLadder')||!ladderHatchClip)
          throw new Error('cellar_traversal_pair_v2 GLB is missing a purpose-built semantic root');
        ladderFamilyLoading=false;
        installCellarLadder();installSurfaceLadder();
        ladderFamilyReady=!!cellarLadderModel&&!!surfaceLadderModel;
        console.log('[holm_survival_cellar] purpose-built Blender hatch and wall ladder ready on both planes');
      }catch(error){
        ladderFamilyLoading=false;ladderFamilyReady=false;
        if(legacySurfaceLadder)legacySurfaceLadder.visible=true;
        if(legacyCellarLadder)legacyCellarLadder.visible=true;
        console.error('[holm_survival_cellar] ladder family',error);
      }
    },undefined,function(error){
      ladderFamilyLoading=false;ladderFamilyReady=false;
      console.error('[holm_survival_cellar] ladder family load failed',error);
    });
  }
  function bindQuietPart(part,name,message){
    if(!part) return false;
    var targets=[];
    part.traverse(function(o){if(o.isMesh)targets.push(o);});
    if(!targets.length)return false;
    targets.forEach(function(target){
      target.userData=Object.assign({},target.userData||{},{kind:'prop',inspectOnly:true,
        inspectName:name,inspectMessage:message,label:'Inspect <b>'+name+'</b>',plane:-1});
      pushClickable(target);
    });
    return true;
  }
  function loadQuietCorner(){
    if(quietCornerReady||quietCornerLoading)return;
    quietCornerLoading=true;
    new THREE.GLTFLoader().load('/assets/models/props/cellar_quiet_corner_v1.glb?v=2',function(gltf){
      try{
        var model=gltf.scene;
        model.name='cellar-quiet-corner-v1-runtime';
        // Return the complete seating family to the east wall.  The fireplace
        // now owns the visible north/back wall bay instead.
        model.position.set(CELLAR.x+4.76,CELLAR.y,CELLAR.z+.58);
        model.rotation.y=-Math.PI/2;
        model.userData=Object.assign({},model.userData||{},
          {plane:-1,assetId:'cellar_quiet_corner_v1',wall:'east',facing:'room-center'});
        model.traverse(function(o){
          o.userData=o.userData||{};
          if(o.isMesh){
            o.castShadow=true;o.receiveShadow=true;
            var materialList=Array.isArray(o.material)?o.material:[o.material];
            materialList.forEach(function(material){
              if(material){material.flatShading=true;material.needsUpdate=true;}
            });
          }
        });
        var tall=findPart(model,'TallFiresideChair'),low=findPart(model,'LowWovenWorkChair');
        var table=findPart(model,'SevenSidedSideTable'),basket=findPart(model,'HandledYarnBasket');
        if(!tall||!low||!table||!basket)throw new Error('quiet corner GLB is missing a semantic furnishing root');
        scene.add(model);quietCornerModel=model;model.updateMatrixWorld(true);
        Planes.addVisibilityRule(model,function(plane){return plane===-1;});
        if(!bindQuietPart(tall,'High-backed fireside chair','A tall, character-sized chair pushed close to the wall for long storm watches.')||
           !bindQuietPart(low,'Woven work chair','A low rush chair tucked beside the wall, repaired more often than replaced.')||
           !bindQuietPart(table,'Seven-sided side table','A small hand-cut table that keeps a warm drink within reach of either chair.')||
           !bindQuietPart(basket,'Yarn basket','Moss, russet and undyed wool wait beside two blunt needles.'))
          throw new Error('quiet corner GLB has no clickable furnishing meshes');
        quietCornerCollider=rect('cellar_quiet_corner',CELLAR.x+4.75,CELLAR.z+.64,.80,1.72,'furnishing');
        quietCornerParts={tall:tall,low:low,table:table,basket:basket};
        quietCornerReady=true;quietCornerLoading=false;Planes.refreshVisibility();
        console.log('[holm_survival_cellar] approved quiet seating corner ready against east wall');
      }catch(error){
        quietCornerLoading=false;
        if(quietCornerModel&&quietCornerModel.parent)quietCornerModel.parent.remove(quietCornerModel);
        quietCornerModel=null;quietCornerReady=false;
        console.error('[holm_survival_cellar] quiet corner',error);
      }
    },undefined,function(error){
      quietCornerLoading=false;
      console.error('[holm_survival_cellar] quiet corner load failed',error);
    });
  }
  function bindReserveTarget(target){
    target.userData=Object.assign({},target.userData||{},
      {kind:'holm_cellar_reserve',label:'Open <b>Storm reserve chest</b>',plane:-1,
        inspectName:'Storm reserve chest',
        inspectMessage:'A broad iron-strapped chest holding the cellar\'s counted emergency reserve.'});
    pushClickable(target); reserveChest=target;
  }
  function loadReserveChest(fallback){
    legacyChest=fallback||legacyChest;
    if(reserveChestReady||reserveChestLoading) return;
    reserveChestLoading=true;
    new THREE.GLTFLoader().load('/assets/models/props/cellar_reserve_chest_v1.glb?v=4',function(gltf){
      try{
        reserveChestModel=gltf.scene;
        reserveChestModel.name='cellar-reserve-chest-v1-runtime';
        reserveChestModel.position.set(CELLAR.x+RESERVE_CHEST.xOffset,CELLAR.y,
          CELLAR.z+RESERVE_CHEST.zOffset);
        reserveChestModel.userData=Object.assign({},reserveChestModel.userData||{},
          {plane:-1,assetId:'cellar_reserve_chest_v1',facing:'room-center',wall:'south',
            wallServiceGap:RESERVE_CHEST.wallServiceGap});
        reserveChestModel.traverse(function(o){
          o.userData=o.userData||{};
          if(o.isMesh){
            o.castShadow=true; o.receiveShadow=true;
            var materialList=Array.isArray(o.material)?o.material:[o.material];
            materialList.forEach(function(material){
              if(material){material.flatShading=true;material.needsUpdate=true;}
            });
          }
        });
        scene.add(reserveChestModel); reserveChestModel.updateMatrixWorld(true);
        Planes.addVisibilityRule(reserveChestModel,function(plane){return plane===-1;});
        var target=findPart(reserveChestModel,'cellar_reserve_chest_v1')||reserveChestModel;
        bindReserveTarget(target);
        reserveChestMixer=new THREE.AnimationMixer(reserveChestModel);
        var clip=(gltf.animations||[]).filter(function(candidate){return candidate.name==='Chest_Open';})[0];
        if(!clip) throw new Error('reserve chest GLB is missing Chest_Open');
        reserveChestAction=reserveChestMixer.clipAction(clip);
        reserveChestAction.setLoop(THREE.LoopOnce,1);
        reserveChestAction.clampWhenFinished=true;
        reserveChestAction.enabled=true;
        reserveChestAction.paused=true;
        reserveChestAction.time=0;
        if(legacyChest) legacyChest.visible=false;
        reserveChestReady=true; reserveChestLoading=false; Planes.refreshVisibility();
        console.log('[holm_survival_cellar] animated reserve chest ready, facing room center');
      }catch(error){
        reserveChestLoading=false;
        if(legacyChest){legacyChest.visible=true;bindReserveTarget(legacyChest);}
        console.error('[holm_survival_cellar] reserve chest',error);
      }
    },undefined,function(error){
      reserveChestLoading=false;
      if(legacyChest){legacyChest.visible=true;bindReserveTarget(legacyChest);}
      console.error('[holm_survival_cellar] reserve chest load failed',error);
    });
  }
  function setReserveChestOpen(open){
    if(!reserveChestAction) return;
    var duration=reserveChestAction.getClip().duration||.8;
    reserveChestAction.enabled=true;
    reserveChestAction.paused=false;
    reserveChestAction.setLoop(THREE.LoopOnce,1);
    reserveChestAction.clampWhenFinished=true;
    if(open){
      if(reserveChestAction.time>=duration-.03||reserveChestAction.time<.03) reserveChestAction.time=0;
      reserveChestAction.timeScale=1;
    }else{
      if(reserveChestAction.time<.03) reserveChestAction.time=duration;
      reserveChestAction.timeScale=-1;
    }
    reserveChestAction.play();
    if(typeof SfxFurnishings!=='undefined'){
      if(open) SfxFurnishings.chestOpen(duration);
      else SfxFurnishings.chestClose(duration);
    }
  }
  function lanternGlowTexture(){
    if(glowTexture) return glowTexture;
    var canvas=document.createElement('canvas'); canvas.width=128; canvas.height=128;
    var context=canvas.getContext('2d'),gradient=context.createRadialGradient(64,64,2,64,64,62);
    gradient.addColorStop(0,'rgba(255,230,150,1)');
    gradient.addColorStop(.18,'rgba(255,164,65,.82)');
    gradient.addColorStop(.52,'rgba(255,105,32,.24)');
    gradient.addColorStop(1,'rgba(255,80,20,0)');
    context.fillStyle=gradient; context.fillRect(0,0,128,128);
    glowTexture=new THREE.CanvasTexture(canvas); glowTexture.needsUpdate=true; return glowTexture;
  }
  function lightFlame(flame,index,kind){
    var hearth=kind==='hearth';
    // Blender owns every visible fixture. Three.js only supplies light spill,
    // which a GLB emissive material cannot cast into this r128 scene.
    var light=new THREE.PointLight(hearth?0xff7a2d:0xff9a43,hearth?2.72:1.86,hearth?8.1:6.25,2);
    light.name='cellar-'+kind+'-light-'+index;
    light.userData.phase=index*2.13; light.userData.flameKind=kind;
    flame.add(light); cellarLights.push(light);
    var material=new THREE.SpriteMaterial({map:lanternGlowTexture(),color:0xffa14f,
      transparent:true,opacity:hearth ? .38 : .34,depthWrite:false,depthTest:false,
      blending:THREE.AdditiveBlending});
    var glow=new THREE.Sprite(material); glow.name='cellar-'+kind+'-glow-'+index;
    var size=hearth?4.8:3.7;
    glow.scale.set(size,size,1); glow.userData.phase=index*2.13;
    glow.userData.flameKind=kind; glow.userData.baseSize=size; glow.renderOrder=999;
    flame.add(glow); cellarGlows.push(glow);
  }
  function clearFlameLighting(){
    cellarLights.forEach(function(light){if(light&&light.parent)light.parent.remove(light);});
    cellarGlows.forEach(function(glow){
      if(glow&&glow.parent)glow.parent.remove(glow);
      if(glow&&glow.material)glow.material.dispose();
    });
    cellarLights.length=0;cellarGlows.length=0;
  }
  function rebuildFlameLighting(){
    clearFlameLighting();
    cellarFlames=torchFlames.slice();if(hearthFlame)cellarFlames.push(hearthFlame);
    torchFlames.forEach(function(flame,index){lightFlame(flame,index,'torch');});
    if(hearthFlame)lightFlame(hearthFlame,0,'hearth');
  }
  function prepareWallTorch(model,index,clip){
    var positions=[
      {x:CELLAR.x+5.60,y:CELLAR.y+1.72,z:CELLAR.z-2.55},
      {x:CELLAR.x+5.60,y:CELLAR.y+1.72,z:CELLAR.z+3.05}
    ],position=positions[index];
    model.name='cellar-wall-torch-v1-runtime-'+index;
    model.position.set(position.x,position.y,position.z);
    model.rotation.y=-Math.PI/2;
    model.scale.setScalar(.72);
    model.userData=Object.assign({},model.userData||{},
      {plane:-1,assetId:'cellar_wall_torch_v1',wall:'east',wallMounted:true,instance:index});
    model.traverse(function(o){
      o.userData=o.userData||{};
      if(o.isMesh){
        o.castShadow=true;o.receiveShadow=true;
        o.userData=Object.assign({},o.userData||{},{kind:'prop',inspectOnly:true,
          inspectName:'Wall torch',inspectMessage:'A modest wall torch, set high enough to warm the stone without filling the room with glare.',
          label:'Inspect <b>Wall torch</b>',plane:-1});
        pushClickable(o);
        var materialList=Array.isArray(o.material)?o.material:[o.material];
        materialList.forEach(function(material){
          if(material){material.flatShading=true;material.needsUpdate=true;}
        });
      }
    });
    scene.add(model);model.updateMatrixWorld(true);
    Planes.addVisibilityRule(model,function(plane){return plane===-1;});
    var flame=findPart(model,'cellar_wall_torch_flame');
    if(!flame)throw new Error('cellar_wall_torch_v1 is missing its flame node');
    flame.userData=Object.assign({},flame.userData||{},{_blenderFlicker:true});
    var mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat,Infinity);action.clampWhenFinished=false;action.play();
    wallTorchModels.push(model);wallTorchMixers.push(mixer);wallTorchFlames.push(flame);
  }
  function loadWallTorches(fallbacks){
    legacyWallTorches=fallbacks.filter(Boolean);
    if(wallTorchLoading||wallTorchReady===2)return;
    wallTorchLoading=true;
    new THREE.GLTFLoader().load('/assets/models/props/cellar_wall_torch_v1.glb?v=2',function(gltf){
      try{
        var clip=(gltf.animations||[]).filter(function(candidate){return candidate.name==='Flame_Flicker';})[0];
        if(!clip)throw new Error('cellar_wall_torch_v1 is missing Flame_Flicker');
        wallTorchClipDuration=clip.duration||0;
        prepareWallTorch(gltf.scene,0,clip);
        prepareWallTorch(gltf.scene.clone(true),1,clip);
        legacyWallTorches.forEach(function(old){old.visible=false;});
        torchFlames=wallTorchFlames.slice();wallTorchReady=wallTorchModels.length;wallTorchLoading=false;
        rebuildFlameLighting();Planes.refreshVisibility();
        console.log('[holm_survival_cellar] two animated Blender wall torches ready');
      }catch(error){
        wallTorchLoading=false;
        wallTorchModels.forEach(function(model){if(model.parent)model.parent.remove(model);});
        wallTorchModels.length=0;wallTorchMixers.length=0;wallTorchFlames.length=0;wallTorchReady=0;
        wallTorchClipDuration=0;
        legacyWallTorches.forEach(function(old){old.visible=true;});
        console.error('[holm_survival_cellar] wall torch',error);
      }
    },undefined,function(error){
      wallTorchLoading=false;wallTorchClipDuration=0;legacyWallTorches.forEach(function(old){old.visible=true;});
      console.error('[holm_survival_cellar] wall torch load failed',error);
    });
  }
  function surfaceClimbData(){
    return {
      kind:'climb',label:'Climb-down <b>Storm cellar ladder</b>',
      climbSound:'down',
      inspectName:'Storm cellar hatch',
      inspectMessage:'A floor hatch with a dark shaft and a ladder descending into the Workyard stores.',
      walkAt:{x:SURFACE.walkX,z:SURFACE.walkZ},
      climb:{up:null,down:{plane:-1,x:CELLAR_APPROACH.x,z:CELLAR_APPROACH.z}}
    };
  }
  function rect(id,x,z,hw,hd,role){
    var c={id:id,type:'rect',x:x,z:z,hw:hw,hd:hd,plane:-1,
      worldObjectId:'holm_survival_workyard_cellar',role:role||'wall'};
    WORLD.colliders.push(c); runtimeColliders.push(c); return c;
  }
  function bindSurface(){
    var next=scene.getObjectByName('world-object-holm_survival_workyard');
    if(!next) return false;
    if(next!==surfaceRoot){
      surfaceRoot=next; surfaceFlame=findPart(next,'hearth_flame');
      if(surfaceFlame){
        surfaceFlame.userData._cozyChildren=[];
        surfaceFlame.traverse(function(child){
          if(child===surfaceFlame||!child.isMesh)return;
          child.userData._cozyBase={y:child.position.y,sx:child.scale.x,
            sy:child.scale.y,sz:child.scale.z,rz:child.rotation.z};
          surfaceFlame.userData._cozyChildren.push(child);
        });
        var warmLight=new THREE.PointLight(0xff7a28,.72,5.2,2);
        warmLight.position.set(0,.48,-.10); surfaceFlame.add(warmLight);
        surfaceFlame.userData._cozyLight=warmLight;
      }
    }
    var ladder=findPart(next,'cellar_ladder');
    if(!ladder) return false;
    legacySurfaceLadder=ladder;
    ladder.userData=Object.assign({},ladder.userData||{},surfaceClimbData());
    // A generous invisible volume prevents intentional ladder clicks from
    // leaking through to the walkable ground below the slender authored mesh.
    if(!surfaceClimbProxy){
      var y=groundY(SURFACE.x,SURFACE.z);
      surfaceClimbProxy=new THREE.Mesh(
        new THREE.BoxGeometry(1.45,2.4,1.15),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false})
      );
      surfaceClimbProxy.name='storm-cellar-ladder-click-proxy';
      surfaceClimbProxy.position.set(SURFACE.x,(y===null?0:y)+1.05,SURFACE.z);
      surfaceClimbProxy.userData=surfaceClimbData();
      scene.add(surfaceClimbProxy); pushClickable(surfaceClimbProxy);
      Planes.addVisibilityRule(surfaceClimbProxy,function(plane){return plane===0;});
    }else surfaceClimbProxy.userData=surfaceClimbData();
    if(ladderFamilyTemplate){
      installSurfaceLadder();ladderFamilyReady=!!cellarLadderModel&&!!surfaceLadderModel;
    }
    return true;
  }
  function bindCellar(){
    var exit=findPart(root,'cellar_exit_ladder');
    if(!exit) throw new Error('cellar GLB is missing cellar_exit_ladder');
    legacyCellarLadder=exit;
    cellarExitData={kind:'climb',label:'Climb-up <b>Workyard ladder</b>',plane:-1,climbSound:'up',
      inspectName:'Workyard ladder',
      inspectMessage:'A plain, single-colour oak ladder leaning against the cellar wall.',
      walkAt:{x:CELLAR_APPROACH.x,z:CELLAR_APPROACH.z},
      climb:{up:{plane:0,x:SURFACE.walkX,z:SURFACE.walkZ},down:null}};
    exit.userData=Object.assign({},exit.userData||{},cellarExitData);
    // During the brief GLB load, the visible fallback ladder is clickable.
    // The authored ladder replaces these exact mesh targets when it arrives.
    bindCellarLadderClickTargets(exit);
    var chest=findPart(root,'cellar_reserve_chest');
    if(!chest) throw new Error('cellar GLB is missing cellar_reserve_chest fallback');
    loadReserveChest(chest);
    loadQuietCorner();
    var hearth=findPart(root,'cellar_hearth');
    if(!hearth) throw new Error('cellar GLB is missing cellar_hearth');
    hearth.userData=Object.assign({},hearth.userData||{},{plane:-1,legacyVisual:true});
    var legacyTorchRoots=[findPart(root,'cellar_wall_torch_0'),findPart(root,'cellar_wall_torch_1')].filter(Boolean);
    torchFlames=[findPart(root,'cellar_torch_flame_0'),findPart(root,'cellar_torch_flame_1')].filter(Boolean);
    hearthFlame=findPart(root,'cellar_hearth_flame');
    rebuildFlameLighting();
    if(typeof HolmCellarFurnishings!=='undefined'){
      HolmCellarFurnishings.load({legacyHearth:hearth,onHearthReady:function(flame){
        if(!flame)return;
        flame.userData=Object.assign({},flame.userData||{},{_blenderFlicker:true});
        hearthFlame=flame;rebuildFlameLighting();
      }});
    }
    loadWallTorches(legacyTorchRoots);
  }
  function addCollision(){
    Planes.addFloor({plane:-1,x:CELLAR.x,z:CELLAR.z,hw:CELLAR.hw,hd:CELLAR.hd,y:CELLAR.y});
    rect('cellar_north',CELLAR.x,CELLAR.z-4.5,5.75,.18);
    rect('cellar_west',CELLAR.x-5.75,CELLAR.z,.18,4.5);
    rect('cellar_east',CELLAR.x+5.75,CELLAR.z,.18,4.5);
    rect('cellar_south',CELLAR.x,CELLAR.z+4.5,5.75,.18);
    rect('cellar_shelf_w',CELLAR.x-5.05,CELLAR.z-1.12,.45,2.02);
    rect('cellar_root_bins',CELLAR.x,CELLAR.z-2.95,1.85,.62);
    rect('cellar_chest',CELLAR.x+RESERVE_CHEST.xOffset,CELLAR.z+RESERVE_CHEST.zOffset,
      RESERVE_CHEST.colliderHw,RESERVE_CHEST.colliderHd);
    rect('cellar_hearth',CELLAR.x+3.28,CELLAR.z+3.72,1.72,1.02);
  }
  function addWalkSurface(){
    cellarWalkSurface=new THREE.Mesh(
      new THREE.PlaneGeometry(CELLAR.hw*2,CELLAR.hd*2),
      new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false,
        side:THREE.DoubleSide})
    );
    cellarWalkSurface.name='ground';
    cellarWalkSurface.rotation.x=-Math.PI/2;
    cellarWalkSurface.position.set(CELLAR.x,CELLAR.y+.015,CELLAR.z);
    cellarWalkSurface.userData={plane:-1,walkSurface:'holm_survival_workyard_cellar'};
    scene.add(cellarWalkSurface); pushClickable(cellarWalkSurface);
    WORLD.grounds.push(cellarWalkSurface);
    Planes.addVisibilityRule(cellarWalkSurface,function(plane){return plane===-1;});
  }
  function normalize(model){
    model.name='holm-survival-workyard-cellar-runtime';
    model.position.set(CELLAR.x,CELLAR.y,CELLAR.z);
    model.userData=Object.assign({},model.userData||{},{plane:-1,cellarId:'holm_survival_workyard_cellar'});
    model.traverse(function(o){
      o.userData=o.userData||{};
      if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        var mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(function(m){ if(m){m.flatShading=true;m.needsUpdate=true;} });
      }
    });
    return model;
  }
  function load(){
    if(ready||loading) return;
    if(typeof THREE==='undefined'||!THREE.GLTFLoader||typeof Planes==='undefined') return;
    loading=true;
    new THREE.GLTFLoader().load('/assets/models/buildings/holm_survival_workyard_cellar_v2.glb?v=4',function(gltf){
      try{
        root=normalize(gltf.scene); scene.add(root); root.updateMatrixWorld(true);
        Planes.addVisibilityRule(root,function(plane){return plane===-1;});
        addCollision(); addWalkSurface(); bindCellar(); bindSurface();
        loadTraversalFamily();
        ready=true; loading=false; Planes.refreshVisibility();
        console.log('[holm_survival_cellar] Blender cellar ready at ('+CELLAR.x+','+CELLAR.z+')');
      }catch(error){ loading=false; console.error('[holm_survival_cellar]',error); }
    },undefined,function(error){ loading=false; console.error('[holm_survival_cellar] load failed',error); });
  }
  function ensureReserveModal(){
    if(reserveModal&&reserveModal.parentNode) return reserveModal;
    reserveModal=document.createElement('div'); reserveModal.id='cellar-reserve-modal';
    reserveModal.className='modal steel';
    reserveModal.innerHTML='<span class="close-x" aria-label="Close">&#10005;</span>'+
      '<div class="reserve-title"><img src="assets/icons/ui/storm_reserve_chest_v2.png" alt="Modeled storm reserve chest">'+
      '<div><h3>Storm Reserve Chest</h3><small>TUTOR\'S HOLM &middot; SEALED STORES</small></div></div>'+
      '<p class="reserve-purpose">Food, clean water, lamp fuel and wool are counted here before every hard-weather season.</p>'+
      '<div class="reserve-stock"><div><b>Sealed grain</b><span>3 crocks</span></div>'+
      '<div><b>Fresh water</b><span>4 jars</span></div><div><b>Wool blankets</b><span>6 rolls</span></div>'+
      '<div><b>Emergency bread</b><span id="reserve-ration-count">1 learner ration</span></div></div>'+
      '<button class="opt" id="reserve-take-ration"><img src="assets/icons/bread.png" alt="">Take one storm ration</button>'+
      '<button class="opt reserve-close">Close the chest</button>';
    document.body.appendChild(reserveModal);
    function close(){
      if(reserveModal.style.display==='none') return;
      reserveModal.style.display='none'; setReserveChestOpen(false);
    }
    reserveModal.querySelector('.close-x').onclick=close;
    reserveModal.querySelector('.reserve-close').onclick=close;
    reserveModal.querySelector('#reserve-take-ration').onclick=function(){
      if(Tutorial.cellarRationClaimed) return;
      if(Player.addItem('bread',1)){
        Tutorial.cellarRationClaimed=true; UI.refreshInv();
        if(typeof SaveGame!=='undefined') SaveGame.save(true);
        UI.chat('You take one sealed storm ration. The rest belongs to the Holm.','sys');
        refreshReserveModal();
      }else UI.chat('Your pack is too full for the ration.','plain');
    };
    document.addEventListener('keydown',function(event){if(event.key==='Escape') close();});
    return reserveModal;
  }
  function refreshReserveModal(){
    var modal=ensureReserveModal(),claimed=!!Tutorial.cellarRationClaimed;
    var button=modal.querySelector('#reserve-take-ration');
    var count=modal.querySelector('#reserve-ration-count');
    button.disabled=claimed; button.classList.toggle('claimed',claimed);
    button.lastChild.nodeValue=claimed?' Ration already issued':' Take one storm ration';
    count.textContent=claimed?'issued to this learner':'1 learner ration';
  }
  function inspectReserve(){
    if(!ready) return;
    setReserveChestOpen(true);
    refreshReserveModal();
    var ration=reserveModal.querySelector('#reserve-take-ration');
    ration.disabled=true;
    reserveModal.style.display='block';
    setTimeout(function(){refreshReserveModal();},300);
    if(typeof Events!=='undefined') Events.emit('modalOpened',{id:'cellar-reserve-modal'});
  }
  function warmAtHearth(){
    if(typeof SfxFurnishings!=='undefined'&&SfxFurnishings.hearthCrackle)
      SfxFurnishings.hearthCrackle();
    UI.dialogue('The cellar hearth',
      'Split oak burns behind the iron bar. It keeps damp from the grain and feeling in the watchman\'s hands.',
      [{label:'Warm enough.'}],'🔥');
  }
  function sitTallChair(){
    UI.dialogue('The high-backed chair',
      'You settle beneath the crooked crest. The storm stores look less grim when the fire is doing its job.',
      [{label:'Rest a moment.'}],'🪑');
  }
  function sitLowChair(){
    UI.dialogue('The woven work chair',
      'The rush seat creaks. Someone has repaired this chair often enough that giving up on it would now be rude.',
      [{label:'Fair enough.'}],'🪑');
  }
  function examineSideTable(){
    UI.dialogue('The seven-sided table',
      'Three legs, seven edges, and no wobble. In a storm cellar, that counts as fine craftsmanship.',
      [{label:'Examine the cup.'},{label:'Leave it.'}],'☕');
  }
  function examineYarnBasket(){
    UI.dialogue('The yarn basket',
      'Moss, russet and undyed wool wait beside two blunt needles. Somebody expects the long watches to be useful.',
      [{label:'A patient sort of work.'}],'🧶');
  }
  if(typeof Interact!=='undefined')
    // The authored chest is broad enough that its closest collision-safe tile is
    // roughly 2.4 units from the interaction origin. Keep the reach just beyond
    // that boundary so the player does not stall one step short of opening it.
    Interact.register({target:'kind:holm_cellar_reserve',option:'Open',primary:true,walkTo:true,reach:2.6,handler:inspectReserve});

  function animate(now){
    if(typeof scene==='undefined'||!scene){ requestAnimationFrame(animate); return; }
    try{
      if(!surfaceRoot||!surfaceRoot.parent) bindSurface();
      // Preload behind the title screen. A continued character can already be
      // beside this ladder, so waiting for active play leaves a loading race.
      if(!ready) load();
      if(ready&&!ladderFamilyReady&&!ladderFamilyLoading)loadTraversalFamily();
      var t=(now||0)*.001,all=cellarFlames.slice(); if(surfaceFlame) all.push(surfaceFlame);
      if(reserveChestMixer){
        var chestDt=reserveChestAnimLast?Math.min(.05,Math.max(0,((now||0)-reserveChestAnimLast)/1000)):0;
        reserveChestAnimLast=now||0; reserveChestMixer.update(chestDt);
      }
      if(wallTorchMixers.length){
        var torchDt=wallTorchAnimLast?Math.min(.05,Math.max(0,((now||0)-wallTorchAnimLast)/1000)):0;
        wallTorchAnimLast=now||0;
        wallTorchMixers.forEach(function(mixer){mixer.update(torchDt);});
      }
      for(var i=0;i<all.length;i++) if(all[i]){
        if(all[i].userData&&all[i].userData._blenderFlicker)continue;
        if(all[i].userData._flameBaseY===undefined) all[i].userData._flameBaseY=all[i].position.y;
        var surfaceCozy=all[i]===surfaceFlame;
        all[i].scale.y=surfaceCozy
          ? 1.00+Math.sin(t*1.55)*.115+Math.sin(t*2.35+.7)*.045
          : .92+Math.sin(t*7.4+i*1.7)*.11;
        all[i].scale.x=surfaceCozy
          ? .98+Math.sin(t*1.28+.4)*.055
          : .96+Math.sin(t*5.1+i*.8)*.05;
        all[i].scale.z=surfaceCozy
          ? .99+Math.sin(t*1.82+.9)*.040
          : .96+Math.sin(t*6.3+i*1.1)*.045;
        all[i].position.y=all[i].userData._flameBaseY+
          Math.sin(t*(surfaceCozy?1.72:8.6)+i*1.3)*(surfaceCozy?.020:.018);
        all[i].rotation.y=Math.sin(t*(surfaceCozy?1.10:3.2)+i)*(surfaceCozy?.11:.10);
        if(surfaceCozy&&all[i].userData._cozyChildren){
          all[i].userData._cozyChildren.forEach(function(child,index){
            var base=child.userData._cozyBase,phase=index*1.37;
            child.scale.y=base.sy*(.98+Math.sin(t*(1.66+index*.10)+phase)*.105);
            child.scale.x=base.sx*(1.0+Math.sin(t*(1.22+index*.08)+phase+.6)*.065);
            child.position.y=base.y+Math.sin(t*(1.84+index*.12)+phase)*.018;
            child.rotation.z=base.rz+Math.sin(t*(1.15+index*.07)+phase)*.075;
          });
          if(all[i].userData._cozyLight)
            all[i].userData._cozyLight.intensity=.68+Math.sin(t*1.48)*.10+
              Math.sin(t*2.21+.8)*.045;
        }
      }
      for(var li=0;li<cellarLights.length;li++){
        var light=cellarLights[li],phase=light.userData.phase||0;
        var hearth=light.userData.flameKind==='hearth',base=hearth?2.68:1.83;
        light.intensity=hearth
          ? base+Math.sin(t*2.1+phase)*.22+Math.sin(t*3.7+phase*.7)*.06
          : 1.78+Math.sin(t*2.35+phase)*.095+Math.sin(t*4.15+phase*.7)*.035;
        light.distance=hearth
          ? 8.05+Math.sin(t*1.35+phase)*.24
          : 6.16+Math.sin(t*1.55+phase)*.12;
      }
      for(var gi=0;gi<cellarGlows.length;gi++){
        var glow=cellarGlows[gi],gPhase=glow.userData.phase||0;
        var size=glow.userData.baseSize||3.7,hearthGlow=glow.userData.flameKind==='hearth';
        var pulse=hearthGlow
          ? 1+Math.sin(t*1.8+gPhase)*.035+Math.sin(t*3.2+gPhase*.6)*.018
          : 1+Math.sin(t*2.05+gPhase)*.016+Math.sin(t*3.8+gPhase*.6)*.007;
        glow.scale.set(size*pulse,size*pulse,1);
        if(glow.material) glow.material.opacity=(hearthGlow ? .38 : .34)+
          Math.sin(t*(hearthGlow?2.4:7.4)+gPhase)*.045;
      }
      var inCellar=typeof Player!=='undefined'&&(Player.plane||0)===CELLAR.plane&&
        Math.abs(player.position.x-CELLAR.x)<=CELLAR.hw+2&&Math.abs(player.position.z-CELLAR.z)<=CELLAR.hd+2;
      if(inCellar!==wasUnderground){
        if(inCellar){
          savedBackground=scene.background; savedFog=scene.fog;
          scene.background=new THREE.Color(0x18130f);
          scene.fog=new THREE.Fog(0x18130f,18,48);
        }else{
          scene.background=savedBackground; scene.fog=savedFog;
        }
        wasUnderground=inCellar;
      }
      var underground=typeof Player!=='undefined'&&(Player.plane||0)<0;
      if(WORLD.sea) WORLD.sea.visible=!underground;
      for(var g=0;g<(WORLD.grounds||[]).length;g++){
        var ground=WORLD.grounds[g],plane=ground.userData&&ground.userData.plane;
        ground.visible=underground ? plane===-1 : plane!==-1;
      }
    }catch(error){ console.error('[holm_survival_cellar] animation',error); }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  return {load:load,bindSurface:bindSurface,inspectReserve:inspectReserve,
    snapshot:function(){var reserveLid=reserveChestModel&&findPart(reserveChestModel,'cellar_chest_lid');return {ready:ready,loading:loading,cellar:CELLAR,surface:{anchor:{x:SURFACE.x,z:SURFACE.z},
      approach:{x:SURFACE.walkX,z:SURFACE.walkZ}},cellarApproach:CELLAR_APPROACH,
      colliders:runtimeColliders.length,clickables:runtimeClickables.length,
      entryFloorReady:typeof Planes!=='undefined'&&Planes.canEnter&&Planes.canEnter({
        plane:CELLAR.plane,x:CELLAR_APPROACH.x,z:CELLAR_APPROACH.z}),
      walkSurfaceRegistered:!!cellarWalkSurface&&WORLD.grounds.indexOf(cellarWalkSurface)>=0,
      surfaceHearthFlameProfile:surfaceFlame?'cozy-readable-purposeful-upstairs-v2':null,
      exitClickable:cellarLadderClickTargets.length>0&&cellarLadderClickTargets.every(function(target){
        return WORLD.clickables.indexOf(target)>=0&&target.userData.clickTarget==='visible-ladder-mesh';
      }),
      cellarFloorClimbProxy:!!cellarExitProxy,
      ladderClickMode:'visible-mesh-only',
      hearthInspectable:typeof HolmCellarFurnishings!=='undefined'&&
        !!HolmCellarFurnishings.snapshot().familyCounts.hearth,
      torchFlames:torchFlames.length,hearthFlames:hearthFlame?1:0,
      flameLights:cellarLights.length,flameGlows:cellarGlows.length,
       wallTorchAssetReady:wallTorchReady,wallTorchLoading:wallTorchLoading,
       wallTorchAsset:wallTorchReady===2?'cellar_wall_torch_v1':'legacy-fallback',
       wallTorchAnimation:wallTorchMixers.length===2?'Flame_Flicker':null,
       wallTorchAnimationSeconds:wallTorchClipDuration,
       wallTorchLightProfile:wallTorchMixers.length===2?'cozy-slow-v2':null,
       wallTorchScale:wallTorchModels.length===2&&wallTorchModels.every(function(model){
         return Math.abs(model.scale.x-.72)<.001&&Math.abs(model.scale.y-.72)<.001;
       }),
       wallTorchEastWallMounted:wallTorchModels.length===2&&wallTorchModels.every(function(model){
          return model.userData.wall==='east'&&model.userData.wallMounted&&
            Math.abs(model.position.x-(CELLAR.x+5.60))<.01&&Math.abs(model.rotation.y+Math.PI/2)<.01;
       }),
       legacyWallTorchesHidden:legacyWallTorches.length===2&&legacyWallTorches.every(function(old){return !old.visible;}),
       quietCornerReady:quietCornerReady,quietCornerLoading:quietCornerLoading,
       quietCornerAsset:quietCornerReady?'cellar_quiet_corner_v1':null,
       quietCornerParts:Object.keys(quietCornerParts).filter(function(key){return !!quietCornerParts[key];}).length,
       quietCornerClickable:quietCornerReady&&['tall','low','table','basket'].every(function(key){
         var part=quietCornerParts[key],found=false;
         if(part)part.traverse(function(o){if(o.isMesh&&WORLD.clickables.indexOf(o)>=0)found=true;});
         return found;
       }),
       quietCornerInspectionOnly:quietCornerReady&&['tall','low','table','basket'].every(function(key){
         var part=quietCornerParts[key],valid=true,seen=false;
         if(part)part.traverse(function(o){if(o.isMesh){seen=true;valid=valid&&o.userData.kind==='prop'&&
           o.userData.inspectOnly&&!!o.userData.inspectMessage;}});
         return seen&&valid;
       }),
         quietCornerEastWall:!!quietCornerModel&&quietCornerModel.userData.wall==='east'&&
           Math.abs(quietCornerModel.position.x-(CELLAR.x+4.76))<.01,
       quietCornerFacesCenter:!!quietCornerModel&&quietCornerModel.userData.facing==='room-center',
        quietCornerAisleClear:!!quietCornerCollider&&quietCornerCollider.x-quietCornerCollider.hw>=CELLAR.x+3.2,
       reserveChestReady:reserveChestReady,reserveChestLoading:reserveChestLoading,
       reserveChestClickable:!!reserveChest&&WORLD.clickables.indexOf(reserveChest)>=0,
       reserveChestAsset:reserveChestReady?'cellar_reserve_chest_v1':'legacy-fallback',
       reserveChestAnimation:reserveChestAction&&reserveChestAction.getClip().name,
       reserveChestAudio:typeof SfxFurnishings!=='undefined'&&SfxFurnishings.profile,
       reserveChestFacingCenter:!!reserveChestModel&&reserveChestModel.userData.facing==='room-center',
       reserveChestAgainstSouthWall:!!reserveChestModel&&
         Math.abs(reserveChestModel.position.z-(CELLAR.z+RESERVE_CHEST.zOffset))<.01,
       reserveChestWallServiceGap:reserveChestModel&&reserveChestModel.userData.wallServiceGap,
       reserveChestOpenSettleDegrees:reserveLid&&reserveLid.userData.openSettleDegrees,
       reserveChestContinuousUnderside:!!reserveLid&&reserveLid.userData.continuousUndersideShell===true,
       reserveChestSealedEndPanels:!!reserveLid&&reserveLid.userData.sealedArchedEndPanels===true&&
         reserveLid.userData.sealedEndPanelCount===2,
       reserveChestWallSafeOpen:!!reserveLid&&reserveLid.userData.wallSafeOpenPose===true&&
         reserveLid.userData.openSettleDegrees===RESERVE_CHEST.openSettleDegrees,
       legacyChestHidden:!!legacyChest&&!legacyChest.visible,
       ladderAssetReady:ladderFamilyReady,
       ladderAssetLoading:ladderFamilyLoading,
       ladderTemplateReady:!!ladderFamilyTemplate,
       ladderAsset:ladderFamilyReady?'cellar_traversal_pair_v2':null,
        ladderAssetCount:(surfaceLadderModel?1:0)+(cellarLadderModel?1:0),
        cellarVisibleLadderCount:(cellarLadderModel?1:0)+
          (legacyCellarLadder&&legacyCellarLadder.parent&&legacyCellarLadder.visible?1:0),
       surfaceFloorHatchOnly:!!surfaceLadderModel&&surfaceLadderModel.userData.view==='surface-floor-hatch-only'&&
         Math.abs(surfaceLadderModel.scale.x-1)<.001&&Math.abs(surfaceLadderModel.scale.y-1)<.001,
       surfaceDarkDescent:!!surfaceLadderModel&&!!findPart(surfaceLadderModel,'SurfaceHatchStatic'),
       surfaceAnimatedLid:!!surfaceLadderModel&&!!findPart(surfaceLadderModel,'SurfaceHatchLid'),
       surfaceLidOpenPose:!!surfaceHatchMixer&&!!ladderHatchClip&&surfaceHatchMixer.time>=ladderHatchClip.duration-.02,
       cellarWallLadderOnly:!!cellarLadderModel&&cellarLadderModel.userData.view==='cellar-wall-ladder-only'&&
         findPart(cellarLadderModel,'SurfaceFloorHatch').visible===false&&
         findPart(cellarLadderModel,'CellarWallLadder').visible!==false,
       cellarLadderVisual:cellarLadderModel?'simple-uniform-oak-v4-wall-contact':null,
       climbAudio:typeof SfxFurnishings!=='undefined'&&SfxFurnishings.climbDown&&SfxFurnishings.climbUp
         ? SfxFurnishings.profile:null,
       surfaceClimbDownSound:!!surfaceClimbProxy&&surfaceClimbProxy.userData.climbSound==='down',
       cellarClimbUpSound:cellarLadderClickTargets.length>0&&cellarLadderClickTargets.every(function(target){
         return target.userData.climbSound==='up';
       }),
       climbSoundDirections:!!surfaceClimbProxy&&surfaceClimbProxy.userData.climbSound==='down'&&
         cellarLadderClickTargets.length>0&&cellarLadderClickTargets.every(function(target){
            return target.userData.climbSound==='up';
          }),
       cellarLadderContextScale:cellarLadderModel&&cellarLadderModel.userData.contextHeightScale,
        legacyLaddersHidden:!!legacySurfaceLadder&&!legacySurfaceLadder.visible&&
          !!legacyCellarLadder&&(!legacyCellarLadder.parent||!legacyCellarLadder.visible),
        legacyCellarLadderHidden:!!legacyCellarLadder&&(!legacyCellarLadder.parent||!legacyCellarLadder.visible),
       legacySurfaceLadderHidden:!!legacySurfaceLadder&&!legacySurfaceLadder.visible,
       furnishings:typeof HolmCellarFurnishings!=='undefined'?HolmCellarFurnishings.snapshot():null,
        cellarModel:'v2-revision-14-sealed-chest-end-panels-pass'};}};
})();
