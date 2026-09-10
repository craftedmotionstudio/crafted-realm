/* ================= WORLD V2: TUTOR'S HOLM =================
 * First runtime provider. The catalog is real 8x8 chunk data and the resident
 * ring owns chunk-native terrain, collision and authored landscape handles.
 */
(function(global){
  'use strict';
  if(!global.WorldV2) throw new Error('WorldV2 contract must load before the Holm provider');

  if(!global.HolmLandscape) throw new Error('HolmLandscape data must load before the Holm provider');
  if(!global.WorldV2BuildingData) throw new Error('World v2 building data must load before the Holm provider');
  if(!global.WorldV2Authoring||!global.WorldV2BuildingBundle||!global.WorldV2DistrictBundle)
    throw new Error('World v2 authoring compilers must load before the Holm provider');
  var rect=HolmLandscape.envelope;
  var h=[HolmLandscape.arrival.x,HolmLandscape.arrival.z];
  var survivalWorkyard=WorldV2BuildingData.get('holm_survival_workyard_v1');
  var survivalDoc=WorldV2Authoring.addBuilding(WorldV2Authoring.createDocument('studio-survival-workyard',1),survivalWorkyard.id,
    {id:'studio-survival-workyard',x:survivalWorkyard.placement.x,z:survivalWorkyard.placement.z,rot:survivalWorkyard.placement.rot,yOffset:survivalWorkyard.placement.yOffset||0});
  var survivalBuildingBundle=WorldV2BuildingBundle.compile(survivalDoc,{sourcePath:'assets/world/authoring/studio-survival-workyard.json'});
  var survivalDistrictBundle=WorldV2DistrictBundle.compile(WorldV2DistrictBundle.survivalWoodSource(),survivalDoc,survivalBuildingBundle);
  var survivalDistrictChunks={};survivalDistrictBundle.chunks.forEach(function(row){survivalDistrictChunks[row.id]=row;});
  global.HolmSurvivalWoodBundle=survivalDistrictBundle;
  if(!global.WorldV2TerrainDistrict)throw new Error('Terrain district compiler must load before the Holm provider');
  var lessonBundle=WorldV2TerrainDistrict.compile(WorldV2TerrainDistrict.source()),lessonChunks={};
  lessonBundle.chunks.forEach(function(row){lessonChunks[row.id]=row;});
  global.HolmLessonGreenBundle=lessonBundle;
  var chunks=[];
  var cx0=Math.floor(rect.x0/WorldV2.CHUNK_SIZE), cz0=Math.floor(rect.z0/WorldV2.CHUNK_SIZE);
  var cx1=Math.floor((rect.x0+rect.w-0.001)/WorldV2.CHUNK_SIZE);
  var cz1=Math.floor((rect.z0+rect.h-0.001)/WorldV2.CHUNK_SIZE);
  for(var cz=cz0;cz<=cz1;cz++) for(var cx=cx0;cx<=cx1;cx++){
    var districtRow=survivalDistrictChunks[WorldV2.key(cx,cz)];
    var lessonRow=lessonChunks[WorldV2.key(cx,cz)];
    // Building-owned dock overrides win over analytic water in overlapping districts.
    // Preserve source arrays: streamed runtime rows must not mutate either bundle.
    var flags=districtRow?districtRow.tileFlags.slice():[];
    if(lessonRow)lessonRow.tileFlags.forEach(function(flag){
      if(!flags.some(function(existing){return existing.x===flag.x&&existing.z===flag.z;}))flags.push(flag);
    });
    chunks.push({
      v:WorldV2.CONTRACT_VERSION, id:WorldV2.key(cx,cz), cx:cx, cz:cz,
      layers:{
        terrain:districtRow?districtRow.terrain:lessonRow?lessonRow.terrain:{underlay:'holm_landscape_v1',heightSource:'holm_landscape_v1',revision:3,
          roles:HolmLandscape.rolesForChunk(cx,cz)},
        tileFlags:flags, objects:[], interactions:[], mutations:[], spawns:[]
      }
    });
  }

  // Arrival supplies plus the Phase-2 landscape blockout. Interaction copy is
  // deliberately separate from placement and landscape objects remain passive.
  var guideHall=WorldV2BuildingData.get('holm_guide_hall_v1');
  var guideCheck=WorldV2BuildingData.validate(guideHall);
  if(!guideCheck.ok) throw new Error('Guide Hall data is invalid: '+guideCheck.errors.join('; '));
  var workyardCheck=WorldV2BuildingData.validate(survivalWorkyard);
  if(!workyardCheck.ok) throw new Error('Survival Workyard data is invalid: '+workyardCheck.errors.join('; '));
  var teachingKitchen=WorldV2BuildingData.get('holm_teaching_kitchen_v1');
  var kitchenCheck=WorldV2BuildingData.validate(teachingKitchen);
  if(!kitchenCheck.ok) throw new Error('Teaching Kitchen data is invalid: '+kitchenCheck.errors.join('; '));
  var questLodge=WorldV2BuildingData.get('holm_quest_lodge_v1');
  var lodgeCheck=WorldV2BuildingData.validate(questLodge);
  if(!lodgeCheck.ok) throw new Error('Quest Lodge data is invalid: '+lodgeCheck.errors.join('; '));
  var mineGatehouse=WorldV2BuildingData.get('holm_mine_gatehouse_v1');
  var gateCheck=WorldV2BuildingData.validate(mineGatehouse);
  if(!gateCheck.ok) throw new Error('Mine Gatehouse data is invalid: '+gateCheck.errors.join('; '));
  var holmBank=WorldV2BuildingData.get('holm_bank_v1');
  var bankCheck=WorldV2BuildingData.validate(holmBank);
  if(!bankCheck.ok) throw new Error('Holm Bank data is invalid: '+bankCheck.errors.join('; '));
  var combatHall=WorldV2BuildingData.get('holm_combat_hall_v1');
  var hallCheck=WorldV2BuildingData.validate(combatHall);
  if(!hallCheck.ok) throw new Error('Combat Hall data is invalid: '+hallCheck.errors.join('; '));
  var mageTower=WorldV2BuildingData.get('holm_mage_tower_v1');
  var towerCheck=WorldV2BuildingData.validate(mageTower);
  if(!towerCheck.ok) throw new Error('Mage Tower data is invalid: '+towerCheck.errors.join('; '));
  var authoredObjects=[
    {id:'holm_guide_hall',asset:guideHall.assetId,buildingDef:guideHall.id,
      x:guideHall.placement.x,z:guideHall.placement.z,rot:guideHall.placement.rot},
    {id:'holm_survival_workyard',asset:survivalWorkyard.assetId,buildingDef:survivalWorkyard.id,
      x:survivalWorkyard.placement.x,z:survivalWorkyard.placement.z,rot:survivalWorkyard.placement.rot,
      yOffset:survivalWorkyard.placement.yOffset||0},
    {id:'holm_teaching_kitchen',asset:teachingKitchen.assetId,buildingDef:teachingKitchen.id,
      x:teachingKitchen.placement.x,z:teachingKitchen.placement.z,rot:teachingKitchen.placement.rot,
      yOffset:teachingKitchen.placement.yOffset||0},
    {id:'holm_quest_lodge',asset:questLodge.assetId,buildingDef:questLodge.id,
      x:questLodge.placement.x,z:questLodge.placement.z,rot:questLodge.placement.rot,
      yOffset:questLodge.placement.yOffset||0},
    {id:'holm_mine_gatehouse',asset:mineGatehouse.assetId,buildingDef:mineGatehouse.id,
      x:mineGatehouse.placement.x,z:mineGatehouse.placement.z,rot:mineGatehouse.placement.rot,
      yOffset:mineGatehouse.placement.yOffset||0},
    {id:'holm_bank',asset:holmBank.assetId,buildingDef:holmBank.id,
      x:holmBank.placement.x,z:holmBank.placement.z,rot:holmBank.placement.rot,
      yOffset:holmBank.placement.yOffset||0},
    {id:'holm_combat_hall',asset:combatHall.assetId,buildingDef:combatHall.id,
      x:combatHall.placement.x,z:combatHall.placement.z,rot:combatHall.placement.rot,
      yOffset:combatHall.placement.yOffset||0},
    {id:'holm_mage_tower',asset:mageTower.assetId,buildingDef:mageTower.id,
      x:mageTower.placement.x,z:mageTower.placement.z,rot:mageTower.placement.rot,
      yOffset:mageTower.placement.yOffset||0},
    {id:'holm_departure_boat',asset:'holm_rowboat',x:211,z:154,rot:Math.PI/2,yOffset:0.9},
    // Keep the arrival props on the exterior apron rather than deriving them
    // from the safe spawn, which now sits inside the Guide Hall's centre aisle.
    {id:'holm_supply_crate',asset:'supply_crate',x:147.8,z:169.0,rot:0.35,
      collider:{type:'circle',r:0.5}},
    {id:'holm_supply_barrel',asset:'supply_barrel',x:149.2,z:169.3,rot:1.15,
      collider:{type:'circle',r:0.5}},
    {id:'holm_supply_bucket',asset:'supply_bucket',x:153.2,z:169.0,rot:5.35},
    // The vault chest now stands inside the Holm Bank's vault, behind the counter.
    {id:'holm_bank_chest',asset:'holm_bank_chest',x:159.5,z:113.5,rot:0,
      collider:{type:'circle',r:0.5}}
  ];
  for(var lo=0;lo<HolmLandscape.objectPlacements.length;lo++){
    var landscapeObject=HolmLandscape.objectPlacements[lo];
    // Complete buildings replace their planning foundations. Other pads
    // remain visible reservations until their own authoring slices are approved.
    if(landscapeObject.id!=='holm_pad_guide_hall'&&landscapeObject.id!=='holm_pad_survival_shelter'&&
       landscapeObject.id!=='holm_pad_teaching_kitchen'&&landscapeObject.id!=='holm_pad_quest_lodge'&&
       landscapeObject.id!=='holm_pad_mine_gatehouse'&&landscapeObject.id!=='holm_pad_holm_bank'&&
       landscapeObject.id!=='holm_pad_combat_hall'&&landscapeObject.id!=='holm_pad_mage_tower') authoredObjects.push(landscapeObject);
  }
  var authoredInteractions=WorldV2BuildingBundle.interactionRows(guideHall,'holm_guide_hall')
    .concat(WorldV2BuildingBundle.interactionRows(survivalWorkyard,'holm_survival_workyard'),
      WorldV2BuildingBundle.interactionRows(teachingKitchen,'holm_teaching_kitchen'),
      WorldV2BuildingBundle.interactionRows(questLodge,'holm_quest_lodge'),
      WorldV2BuildingBundle.interactionRows(mineGatehouse,'holm_mine_gatehouse'),
      WorldV2BuildingBundle.interactionRows(holmBank,'holm_bank'),
      WorldV2BuildingBundle.interactionRows(combatHall,'holm_combat_hall'),
      WorldV2BuildingBundle.interactionRows(mageTower,'holm_mage_tower'),[
    {id:'holm_supply_crate.search',objectId:'holm_supply_crate',kind:'prop',
      label:'Search <b>Crate</b>',examine:'A weathered supply crate.'},
    {id:'holm_supply_barrel.search',objectId:'holm_supply_barrel',kind:'prop',
      label:'Search <b>Barrel</b>',examine:'Smells faintly of ale.'},
    {id:'holm_supply_bucket.take',objectId:'holm_supply_bucket',kind:'prop',
      label:'Take <b>Bucket</b>',examine:'A sturdy wooden bucket.'},
    {id:'holm_departure_boat.board',objectId:'holm_departure_boat',kind:'holm_departure',
      label:'Boat',examine:'A salt-stained ferry skiff. Its brass lesson-lock opens only for trained adventurers.'},
    {id:'holm_bank_chest.use',objectId:'holm_bank_chest',kind:'bank',
      label:'Use <b>Bank chest</b>',examine:'A secure chest linked to Veyhollow Bank.'}
  ]);
  var chunkById={};
  for(var ci=0;ci<chunks.length;ci++) chunkById[chunks[ci].id]=chunks[ci];
  for(var oi=0;oi<authoredObjects.length;oi++){
    var object=authoredObjects[oi];
    var objectChunk=chunkById[WorldV2.key(WorldV2.tileToChunk(object.x),WorldV2.tileToChunk(object.z))];
    if(!objectChunk) throw new Error('Authored Holm object is outside the provider: '+object.id);
    objectChunk.layers.objects.push(object);
  }
  for(var ii=0;ii<authoredInteractions.length;ii++){
    var interaction=authoredInteractions[ii], owner=null;
    for(var ci2=0;ci2<chunks.length&&!owner;ci2++){
      if(chunks[ci2].layers.objects.some(function(o){ return o.id===interaction.objectId; })) owner=chunks[ci2];
    }
    if(!owner) throw new Error('Authored Holm interaction has no object: '+interaction.id);
    owner.layers.interactions.push(interaction);
  }

  // A building's walls can spill into neighbouring chunks that were baked
  // before (or after) its own chunk streamed in. Re-bake every resident tile
  // under the building's footprint whenever its chunk loads or unloads, so the
  // planner never sees an unwalled neighbour row or a wall that has left.
  function rebakeBuildingFootprints(chunk){
    if(typeof CollisionGrid==='undefined'||!CollisionGrid.grid||typeof CollisionGrid.rebakeArea!=='function'||typeof WorldV2BuildingData==='undefined') return;
    for(var i=0;i<chunk.layers.objects.length;i++){
      var o=chunk.layers.objects[i]; if(!o.buildingDef) continue;
      var def=WorldV2BuildingData.get(o.buildingDef); if(!def) continue;
      CollisionGrid.rebakeArea(o.x,o.z,Math.ceil(Math.max(def.footprint.w,def.footprint.d)/2)+2);
    }
  }
  var provider=WorldV2.register({
    contractVersion:WorldV2.CONTRACT_VERSION,
    id:'tutors-holm-v2', label:"Tutor's Holm",
    worldRevision:4,
    initialRect:rect,
    // 7x7 gives the elevated 30-degree camera enough ground in every direction
    // while remaining far smaller than the 195-chunk island catalog.
    residentRadius:3,
    renderStrategy:'chunk-native-terrain',
    defaultLandmark:'holm_arrival',
    landmarks:HolmLandscape.landmarks,
    landscape:HolmLandscape.landscapeContract,
    mapMetadata:{
      revision:4, regionId:'tutors_holm', orientation:'north-is-negative-z',
      compass:true, clickToWalk:true,
      landmarks:Object.keys(HolmLandscape.landmarks).map(function(id){return HolmLandscape.landmarks[id];}),
      riskAreas:[]
    },
    chunks:chunks,
    hooks:{
      buildTerrain:function(p){
        if(typeof TEX==='undefined'||!TEX.grass) buildTextures();
        if(typeof WORLD!=='undefined'&&!WORLD.sea) buildSea();
        if(typeof WorldV2Terrain==='undefined') throw new Error('WorldV2Terrain runtime is unavailable');
        if(typeof WorldV2Objects==='undefined') throw new Error('WorldV2Objects runtime is unavailable');
        if(typeof WorldV2Buildings==='undefined') throw new Error('WorldV2Buildings asset loader is unavailable');
        return WorldV2Buildings.preload(THREE).then(function(){
          WorldV2Terrain.init(p);
          WorldV2Objects.init(p);
          // The cavern is an auxiliary negative-plane region owned by this
          // provider. It is not a free-running global placement and is torn
          // down whenever the Holm provider is disposed.
          if(typeof HolmTrainingCavern!=='undefined') HolmTrainingCavern.init(p);
          if(typeof HolmSurvivalTrees!=='undefined') HolmSurvivalTrees.init(p);
          if(typeof HolmLastlight!=='undefined') HolmLastlight.init(p);
          if(typeof CollisionGrid!=='undefined') CollisionGrid.initResident(p);
          var spawn=p.getSpawnLandmark(p.defaultLandmark);
          p.updateResidency(spawn.x,spawn.z,true);
        });
      },
      // Phase 2 owns deterministic terrain and passive environment placement.
      // Tutorial services/resources return through authored chunk interactions
      // after their functional buildings are approved; legacy random scatter is
      // intentionally not imported into the rebuilt world.
      populate:function(){ console.info('[HOLM_LANDSCAPE] deterministic blockout population ready'); },
      chartCollision:function(p){
        if(typeof CollisionGrid!=='undefined') CollisionGrid.rebakeResident(p);
      },
      loadChunk:function(chunk,p){
        var render=(typeof WorldV2Terrain!=='undefined')?WorldV2Terrain.loadChunk(chunk,p):{id:chunk.id,dataOnly:true};
        var objects=(typeof WorldV2Objects!=='undefined')?WorldV2Objects.loadChunk(chunk,p):{id:chunk.id,dataOnly:true};
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid){ CollisionGrid.loadChunk(chunk); rebakeBuildingFootprints(chunk); }
        return {id:chunk.id,render:render,objects:objects};
      },
      unloadChunk:function(handle,chunk){
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.unloadChunk(chunk);
        if(typeof WorldV2Objects!=='undefined'&&handle) WorldV2Objects.unloadChunk(handle.objects);
        if(typeof WorldV2Terrain!=='undefined'&&handle) WorldV2Terrain.unloadChunk(handle.render);
        rebakeBuildingFootprints(chunk);
      },
      dispose:function(){
        if(typeof HolmLastlight!=='undefined') HolmLastlight.dispose();
        if(typeof HolmSurvivalTrees!=='undefined') HolmSurvivalTrees.dispose();
        if(typeof HolmTrainingCavern!=='undefined') HolmTrainingCavern.dispose();
        if(typeof WorldV2Objects!=='undefined') WorldV2Objects.dispose();
        if(typeof WorldV2Terrain!=='undefined') WorldV2Terrain.dispose();
      },
      snapshot:function(){
        return {
          terrain:typeof WorldV2Terrain!=='undefined'?WorldV2Terrain.snapshot():null,
          objects:typeof WorldV2Objects!=='undefined'?WorldV2Objects.snapshot():null,
          collision:typeof CollisionGrid!=='undefined'&&CollisionGrid.snapshot?CollisionGrid.snapshot():null,
          landscape:typeof HolmLandscapeRuntime!=='undefined'?HolmLandscapeRuntime.snapshot():null,
          trainingCavern:typeof HolmTrainingCavern!=='undefined'?HolmTrainingCavern.snapshot():null,
          survivalTrees:typeof HolmSurvivalTrees!=='undefined'?HolmSurvivalTrees.snapshot():null
          ,lastlight:typeof HolmLastlight!=='undefined'?HolmLastlight.snapshot():null
        };
      }
    }
  });
  WorldV2.activate(provider.id);
  if(global.CRWorldMode && !global.CRWorldMode.legacy) global.CRWorldMode.attachProvider(provider);
})(window);
