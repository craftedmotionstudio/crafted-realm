/* ================= WORLD V2: TUTOR'S HOLM =================
 * First runtime provider. The catalog is real 8x8 chunk data and the resident
 * ring owns chunk-native terrain, collision and authored landscape handles.
 */
(function(global){
  'use strict';
  if(!global.WorldV2) throw new Error('WorldV2 contract must load before the Holm provider');

  if(!global.HolmLandscape) throw new Error('HolmLandscape data must load before the Holm provider');
  if(!global.WorldV2BuildingData) throw new Error('World v2 building data must load before the Holm provider');
  var rect=HolmLandscape.envelope;
  var h=[HolmLandscape.arrival.x,HolmLandscape.arrival.z];
  var chunks=[];
  var cx0=Math.floor(rect.x0/WorldV2.CHUNK_SIZE), cz0=Math.floor(rect.z0/WorldV2.CHUNK_SIZE);
  var cx1=Math.floor((rect.x0+rect.w-0.001)/WorldV2.CHUNK_SIZE);
  var cz1=Math.floor((rect.z0+rect.h-0.001)/WorldV2.CHUNK_SIZE);
  for(var cz=cz0;cz<=cz1;cz++) for(var cx=cx0;cx<=cx1;cx++){
    chunks.push({
      v:WorldV2.CONTRACT_VERSION, id:WorldV2.key(cx,cz), cx:cx, cz:cz,
      layers:{
        terrain:{underlay:'holm_landscape_v1',heightSource:'holm_landscape_v1',revision:2,
          roles:HolmLandscape.rolesForChunk(cx,cz)},
        tileFlags:[], objects:[], interactions:[], mutations:[], spawns:[]
      }
    });
  }

  // Arrival supplies plus the Phase-2 landscape blockout. Interaction copy is
  // deliberately separate from placement and landscape objects remain passive.
  var guideHall=WorldV2BuildingData.get('holm_guide_hall_v1');
  var guideCheck=WorldV2BuildingData.validate(guideHall);
  if(!guideCheck.ok) throw new Error('Guide Hall data is invalid: '+guideCheck.errors.join('; '));
  var survivalWorkyard=WorldV2BuildingData.get('holm_survival_workyard_v1');
  var workyardCheck=WorldV2BuildingData.validate(survivalWorkyard);
  if(!workyardCheck.ok) throw new Error('Survival Workyard data is invalid: '+workyardCheck.errors.join('; '));
  var authoredObjects=[
    {id:'holm_guide_hall',asset:guideHall.assetId,buildingDef:guideHall.id,
      x:guideHall.placement.x,z:guideHall.placement.z,rot:guideHall.placement.rot},
    {id:'holm_survival_workyard',asset:survivalWorkyard.assetId,buildingDef:survivalWorkyard.id,
      x:survivalWorkyard.placement.x,z:survivalWorkyard.placement.z,rot:survivalWorkyard.placement.rot,
      yOffset:survivalWorkyard.placement.yOffset||0},
    {id:'holm_departure_boat',asset:'holm_rowboat',x:211,z:154,rot:Math.PI/2,yOffset:0.9},
    // Keep the arrival props on the exterior apron rather than deriving them
    // from the safe spawn, which now sits inside the Guide Hall's centre aisle.
    {id:'holm_supply_crate',asset:'supply_crate',x:147.8,z:169.0,rot:0.35,
      collider:{type:'circle',r:0.5}},
    {id:'holm_supply_barrel',asset:'supply_barrel',x:149.2,z:169.3,rot:1.15,
      collider:{type:'circle',r:0.5}},
    {id:'holm_supply_bucket',asset:'supply_bucket',x:153.2,z:169.0,rot:5.35},
    {id:'holm_bank_chest',asset:'holm_bank_chest',x:157,z:116,rot:0,
      collider:{type:'circle',r:0.62}}
  ];
  for(var lo=0;lo<HolmLandscape.objectPlacements.length;lo++){
    var landscapeObject=HolmLandscape.objectPlacements[lo];
    // Complete buildings replace their planning foundations. Other pads
    // remain visible reservations until their own authoring slices are approved.
    if(landscapeObject.id!=='holm_pad_guide_hall'&&landscapeObject.id!=='holm_pad_survival_shelter') authoredObjects.push(landscapeObject);
  }
  var authoredInteractions=[
    {id:'holm_guide_hall.front_door',objectId:'holm_guide_hall',partId:'front_door',kind:'door',
      label:'Open <b>Arrival door</b>',examine:'A broad emberwood door polished by generations of new arrivals.'},
    {id:'holm_guide_hall.teaching_door',objectId:'holm_guide_hall',partId:'teaching_door',kind:'door',
      label:'Open <b>Teaching door</b>',examine:'This northern door opens toward Survival Wood.'},
    {id:'holm_guide_hall.orientation',objectId:'holm_guide_hall',partId:'orientation_table',kind:'holm_orientation',
      label:'Island route',examine:'A hand-built relief chart of Tutor\'s Holm.'},
    {id:'holm_guide_hall.register',objectId:'holm_guide_hall',partId:'lesson_register',kind:'holm_register',
      label:'Lesson register',examine:'Every lesson is marked here, along with the state of the departure lock.'},
    {id:'holm_guide_hall.plaque',objectId:'holm_guide_hall',partId:'first_landing_plaque',kind:'holm_story_clue',
      label:'First Landing plaque',examine:'A battered ship beneath a rising compass star.'},
    {id:'holm_guide_hall.provisions',objectId:'holm_guide_hall',partId:'provision_rack',kind:'holm_provisions',
      label:'Provision rack',examine:'Oilskins, packs, chalk, and spare teaching tools, all counted twice.'},
    {id:'holm_survival_workyard.trail_door',objectId:'holm_survival_workyard',partId:'trail_door',kind:'door',
      label:'Open <b>Trail door</b>',examine:'A full-height oak door scarred by wet boots and bundled firewood.'},
    {id:'holm_survival_workyard.pond_door',objectId:'holm_survival_workyard',partId:'pond_door',kind:'door',
      label:'Open <b>Pond door</b>',examine:'This side door opens into the covered yard and toward the fishing shore.'},
    {id:'holm_survival_workyard.tools',objectId:'holm_survival_workyard',partId:'tool_bench',kind:'holm_survival_tools',
      label:'Survival tools',examine:'Hatchets, wedges, a whetstone, and pitch arranged by the job they perform.'},
    {id:'holm_survival_workyard.fire_board',objectId:'holm_survival_workyard',partId:'firemaking_board',kind:'holm_firemaking_board',
      label:'Firemaking board',examine:'Chalk diagrams explain kindling, airflow, and how not to lose one\'s eyebrows.'},
    {id:'holm_survival_workyard.storm_tally',objectId:'holm_survival_workyard',partId:'storm_tally_beam',kind:'holm_storm_tally',
      label:'Storm tally',examine:'Deep cuts count the seasons when the island had to live from its own stores.'},
    {id:'holm_survival_workyard.net_rack',objectId:'holm_survival_workyard',partId:'net_rack',kind:'holm_net_rack',
      label:'Fishing-preparation stand',examine:'Painted cork buoys, a coiled hemp line, and a weighted teaching net wait beside a weathered crate.'},
    {id:'holm_survival_workyard.timber_rack',objectId:'holm_survival_workyard',partId:'timber_log_rack',kind:'prop',
      label:'Inspect <b>Timber rack</b>',inspectOnly:true,inspectName:'timber rack',
      inspectMessage:'Eight restrained logs rest on stone-footed bearers. The proud pale ends make every warped length easy to count.'},
    {id:'holm_survival_workyard.log_stack',objectId:'holm_survival_workyard',partId:'log_stack',kind:'prop',
      label:'Inspect <b>Stacked logs</b>',inspectOnly:true,inspectName:'stacked logs',
      inspectMessage:'A deliberately uneven stack of seasoned lesson timber, bound before the next storm can reorganize it.'},
    {id:'holm_survival_workyard.chopping_block',objectId:'holm_survival_workyard',partId:'chopping_block',kind:'prop',
      label:'Inspect <b>Chopping block</b>',inspectOnly:true,inspectName:'chopping block',
      inspectMessage:'A hand-hewn stump scarred by careful splitting. The tutors prefer kindling to heroic axe swings.'},
    {id:'holm_survival_workyard.embedded_axe',objectId:'holm_survival_workyard',partId:'embedded_axe',kind:'prop',
      label:'Inspect <b>Embedded axe</b>',inspectOnly:true,inspectName:'embedded axe',
      inspectMessage:'A purpose-built splitting axe seated firmly in the block, awaiting a later fuel-preparation lesson.'},
    {id:'holm_survival_workyard.sawbuck',objectId:'holm_survival_workyard',partId:'sawbuck',kind:'prop',
      label:'Inspect <b>Sawbuck</b>',inspectOnly:true,inspectName:'sawbuck',
      inspectMessage:'A half-sawn log. Someone\'s work was interrupted, probably by a tutor explaining posture.'},
    {id:'holm_survival_workyard.waterworks',objectId:'holm_survival_workyard',partId:'pulley_crank',kind:'holm_waterworks_pulley',
      label:'Operate <b>Water pulley</b>',inspectName:'water pulley',
      inspectMessage:'A pegged timber frame, iron crank, rope guide, and open stave bucket turn pond water into a lesson in patient leverage.',
      examine:'The Workyard tutors insist that carrying the pond itself would be less efficient.'},
    {id:'holm_survival_workyard.fishing_edge',objectId:'holm_survival_workyard',partId:'fishing_water_patch',kind:'holm_fishing_edge',
      label:'Net-fish <b>Mirrorperch</b>',inspectName:'fishing edge',
      inspectMessage:'Three silver-blue mirrorperch nose through the quiet water beside an open woven creel. The largest appears confident for no defensible reason.',
      examine:'A calm teaching shoal waits below the dock edge.'},
    {id:'holm_survival_workyard.hearth',objectId:'holm_survival_workyard',partId:'teaching_fireplace',kind:'holm_teaching_hearth',
      label:'Teaching hearth',examine:'A working cooking hearth, kettle crane, and carefully banked lesson fire.'},
    {id:'holm_survival_workyard.cellar',objectId:'holm_survival_workyard',partId:'cellar_ladder',kind:'holm_cellar_ladder',
      label:'Climb-down <b>Storm cellar ladder</b>',examine:'A fitted ladder descends beside the open reserve hatch.'},
    {id:'holm_survival_workyard.hutch',objectId:'holm_survival_workyard',partId:'workyard_crockery_hutch',kind:'prop',
      label:'Inspect <b>Crockery hutch</b>',inspectOnly:true,inspectName:'crockery hutch',
      inspectMessage:'A fitted oak hutch keeps each lesson plate and mug below its shelf. Even the crockery has learned to stand in line.'},
    {id:'holm_survival_workyard.mugs',objectId:'holm_survival_workyard',partId:'workyard_mug_shelf',kind:'prop',
      label:'Inspect <b>Mug shelf</b>',inspectOnly:true,inspectName:'mug shelf',
      inspectMessage:'Four handled mugs hang upside-down to dry. A fifth peg is deliberately absent; the Holm dislikes optimistic counting.'},
    {id:'holm_survival_workyard.bucket',objectId:'holm_survival_workyard',partId:'workyard_empty_bucket',kind:'holm_empty_bucket',
      label:'Take <b>Empty bucket</b>',inspectName:'empty bucket',
      inspectMessage:'A dry stave bucket reserved for the pond-pulley lesson. Its iron handle has survived more students than tutors.'},
    {id:'holm_survival_workyard.tool_stool',objectId:'holm_survival_workyard',partId:'workyard_tool_stool',kind:'prop',
      label:'Inspect <b>Repaired stool</b>',inspectOnly:true,inspectName:'repaired stool',
      inspectMessage:'A waist-low work stool with a small iron repair. It appears to have lost an argument with a hatchet.'},
    {id:'holm_survival_workyard.lodge_rug',objectId:'holm_survival_workyard',partId:'workyard_lodge_rug',kind:'prop',
      label:'Inspect <b>Lodge runner</b>',inspectOnly:true,inspectName:'lodge runner',
      inspectMessage:'A subdued blue runner marks the clear standing area between the tools and the cellar route.'},
    {id:'holm_survival_workyard.hearth_rug',objectId:'holm_survival_workyard',partId:'workyard_hearth_rug',kind:'prop',
      label:'Inspect <b>Hearth rug</b>',inspectOnly:true,inspectName:'hearth rug',
      inspectMessage:'An octagonal woven rug marks where learners may watch the fire without volunteering their boots as kindling.'},
    {id:'holm_survival_workyard.lesson_table',objectId:'holm_survival_workyard',partId:'workyard_lesson_table',kind:'prop',
      label:'Inspect <b>Kindling table</b>',inspectOnly:true,inspectName:'kindling table',
      inspectMessage:'Three shallow trays arrange tinder, crossed kindling, and larger fuel in the order a useful fire expects.'},
    {id:'holm_survival_workyard.split_stool',objectId:'holm_survival_workyard',partId:'workyard_hearth_stool_splitter',kind:'prop',
      label:'Inspect <b>Split-top stool</b>',inspectOnly:true,inspectName:'split-top stool',
      inspectMessage:'A small willow stool close enough to study the kindling and far enough to keep one\'s eyebrows.'},
    {id:'holm_survival_workyard.woven_stool',objectId:'holm_survival_workyard',partId:'workyard_hearth_stool_woven',kind:'prop',
      label:'Inspect <b>Woven stool</b>',inspectOnly:true,inspectName:'woven stool',
      inspectMessage:'A second lesson stool with a woven rush seat. No two Holm craftspeople solve the same problem identically.'},
    {id:'holm_survival_workyard.warden_relief',objectId:'holm_survival_workyard',partId:'workyard_storm_warden_relief',kind:'prop',
      label:'Inspect <b>Storm Warden relief</b>',inspectOnly:true,inspectName:'Storm Warden relief',
      inspectMessage:'A blocky painted relief shows a red-cloaked warden measuring the storm tide instead of attempting to fight it.'},
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
  ];
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
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.loadChunk(chunk);
        return {id:chunk.id,render:render,objects:objects};
      },
      unloadChunk:function(handle,chunk){
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.unloadChunk(chunk);
        if(typeof WorldV2Objects!=='undefined'&&handle) WorldV2Objects.unloadChunk(handle.objects);
        if(typeof WorldV2Terrain!=='undefined'&&handle) WorldV2Terrain.unloadChunk(handle.render);
      },
      dispose:function(){
        if(typeof WorldV2Objects!=='undefined') WorldV2Objects.dispose();
        if(typeof WorldV2Terrain!=='undefined') WorldV2Terrain.dispose();
      },
      snapshot:function(){
        return {
          terrain:typeof WorldV2Terrain!=='undefined'?WorldV2Terrain.snapshot():null,
          objects:typeof WorldV2Objects!=='undefined'?WorldV2Objects.snapshot():null,
          collision:typeof CollisionGrid!=='undefined'&&CollisionGrid.snapshot?CollisionGrid.snapshot():null,
          landscape:typeof HolmLandscapeRuntime!=='undefined'?HolmLandscapeRuntime.snapshot():null
        };
      }
    }
  });
  WorldV2.activate(provider.id);
  if(global.CRWorldMode && !global.CRWorldMode.legacy) global.CRWorldMode.attachProvider(provider);
})(window);
