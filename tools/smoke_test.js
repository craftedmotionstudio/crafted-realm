/* Crafted Realm — in-browser smoke test (regression gate).
 *
 * Run from the running game's console / javascript_tool:
 *   var x=new XMLHttpRequest();x.open('GET','tools/smoke_test.js',false);x.send();eval(x.responseText);CR_smoke();
 *
 * It exercises the global game state synchronously (no waits): structural integrity, the Player
 * API, data tables, and the sprint's new systems. Returns {pass, fail, total, failures[]}.
 * Pair with console-error inspection and Codex's direct screenshot review.
 */
window.CR_smoke = function(){
  var pass=0, fail=0, failures=[];
  function ok(name, cond){ if(cond){ pass++; } else { fail++; failures.push(name); } }
  function has(o, k){ return o && typeof o==='object' && (k in o); }

  // ---- core globals ----
  ok('global Player', typeof Player==='object');
  ok('global WORLD', typeof WORLD==='object');
  ok('global UI', typeof UI==='object');
  ok('global scene', typeof scene==='object');
  ok('global player mesh', typeof player==='object' && player && player.position);
  ok('global ITEMS', typeof ITEMS==='object');
  ok('global SPELLS', typeof SPELLS==='object');
  ok('global SHOPS', typeof SHOPS==='object');
  ok('global NPC_TYPES', typeof NPC_TYPES==='object');
  ok('global SKILLS array', Array.isArray(SKILLS) && SKILLS.length>=15);
  ok('shared roof transition system', typeof RoofTransitions==='object' &&
    typeof RoofTransitions.set==='function' && typeof RoofTransitions.update==='function' &&
    RoofTransitions.duration>=0.18 && RoofTransitions.duration<=0.30);

  // ---- Player API ----
  ok('Player.lvl()', typeof Player.lvl==='function' && Player.lvl('Attack')>=1);
  ok('Player.addXp()', typeof Player.addXp==='function');
  ok('Player.combatLevel()', typeof Player.combatLevel==='function' && Player.combatLevel()>=3);
  ok('Player.weaponSpeed()', typeof Player.weaponSpeed==='function' && Player.weaponSpeed()>0);
  ok('Player.moveSpeed()', typeof Player.moveSpeed==='function' && Player.moveSpeed()>0);
  ok('Player.count()', typeof Player.count==='function');
  ok('Player.inv array (24)', Array.isArray(Player.inv) && Player.inv.length===24);
  ok('Player.equip slots', has(Player,'equip'));
  ok('Player.xp map', has(Player,'xp') && typeof Player.xp.Attack==='number');

  // ---- sprint features ----
  ok('autoRetaliate flag', typeof Player.autoRetaliate==='boolean');
  ok('spec energy 0..100', typeof Player.spec==='number' && Player.spec>=0 && Player.spec<=100);
  ok('specArmed flag', typeof Player.specArmed==='boolean');
  ok('attackStyles map', has(Player,'attackStyles') && typeof Player.attackStyles.melee==='number');
  ok('teleport spells present', !!SPELLS.tele_quarry && SPELLS.tele_quarry.utility==='teleport');
  ok('5 teleport spells', Object.keys(SPELLS).filter(function(k){return SPELLS[k].utility==='teleport';}).length===5);
  ok('UI.xpDrop()', typeof UI.xpDrop==='function');
  ok('UI.refreshCombat()', typeof UI.refreshCombat==='function');
  ok('UI.refreshSpec()', typeof UI.refreshSpec==='function');
  ok('UI.refreshHud()', typeof UI.refreshHud==='function');
  ok('UI.openShop()', typeof UI.openShop==='function');
  ok('spec orb in DOM', !!document.getElementById('spec-orb'));
  ok('two tab rows in DOM', !!document.getElementById('tab-bar') && !!document.getElementById('tab-bar-bottom'));

  // ---- data integrity ----
  ok('ITEMS has tiered gear (veyrite)', !!ITEMS.veyrite_platebody);
  ok('XP curve L99 exact', (function(){ try{ return XP_TABLE[99]===13034431; }catch(e){ return false; } })());
  ok('boss has script tag', NPC_TYPES.korthul && NPC_TYPES.korthul.script==='korthul');
  ok('shop has stock', SHOPS.smith && Array.isArray(SHOPS.smith.stock) && SHOPS.smith.stock.length>0);

  // ---- live, restored mutations ----
  (function(){ var s='Woodcutting', before=Player.xp[s]; Player.addXp(s, 13); ok('addXp increases xp', Player.xp[s]>before); Player.xp[s]=before; })();
  (function(){ try{ UI.openShop('smith'); ok('openShop inits _q', SHOPS.smith._q && typeof SHOPS.smith._q[SHOPS.smith.stock[0].id]==='number');
    UI.closeModal && UI.closeModal('shop-modal'); }catch(e){ ok('openShop inits _q', false); } })();

  // ---- chunk data model ----
  ok('WorldChunks global', typeof WorldChunks==='object' && typeof WorldChunks.placeObject==='function');
  ok('CHUNK size = 8', typeof CHUNK==='number' && CHUNK===8);
  (function(){ try{
    var snap=WorldChunks.serialize();              // preserve any real data
    WorldChunks.clear();
    var o=WorldChunks.placeObject('test_obj', 10, 20, 1);
    ok('chunkOf(10,20) = [1,2]', WorldChunks.chunkOf(10,20)[0]===1 && WorldChunks.chunkOf(10,20)[1]===2);
    ok('local coords (2,4)', o.lx===2 && o.lz===4);
    var ser=WorldChunks.serialize(); WorldChunks.clear(); WorldChunks.load(ser);
    var found=0; WorldChunks.forEachObject(function(def,tx,tz){ if(def==='test_obj'&&tx===10&&tz===20) found++; });
    ok('serialize/load round-trip', found===1);
    WorldChunks.clear(); WorldChunks.load(snap);   // restore
  }catch(e){ ok('chunk model round-trip', false); } })();

  // ---- world-v2 runtime contract ----
  ok('WorldV2 global', typeof WorldV2==='object' && WorldV2.CONTRACT_VERSION===1);
  ok('WorldProvider global', typeof WorldProvider==='function');
  (function(){ try{
    var v2=(typeof CRWorldMode!=='undefined' && CRWorldMode.id==='v2');
    var p=v2 && CRWorldMode.provider;
    var holm=!!(p&&p.id==='tutors-holm-v2');
    ok('v2 provider attached', !v2 || (!!p && p===WorldV2.active && !!WorldV2.get(p.id)));
    ok('v2 provider validates', !v2 || p.validate().ok);
    var ps=v2&&p.snapshot();
    ok('chunk-native terrain strategy', !v2 || p.renderStrategy==='chunk-native-terrain');
    ok('resident ring is bounded', !v2 || (ps.residentChunks>0&&ps.residentChunks<=49));
    var c=v2 && p.getChunkAtWorldTile(player.position.x,player.position.z);
    ok('player is inside a resident chunk', !v2 || (!!c && ps.residentIds.indexOf(c.id)>=0));
    ok('chunk runtime layers', !v2 || WorldV2.LAYER_NAMES.every(function(n){ return n in c.layers; }));
    ok('named safe-spawn landmark', !v2 || p.getSpawnLandmark(p.defaultLandmark).kind==='safe-spawn');
    ok('provider owns world bounds', !v2 || (worldRect().x0===p.getWorldRect().x0 && worldRect().w===p.getWorldRect().w));
    ok('map metadata keeps compass + click walk', !v2 || (p.mapMetadata.compass && p.mapMetadata.clickToWalk));
    ok('authored Holm landscape contract', !v2 || !holm || (p.landscape&&p.landscape.planId==='tutors-holm-landscape-v1'&&
      p.landscape.districts.length===6&&p.landscape.pads.length===8));
    ok('landscape runtime owns geography', !v2 || !holm || (ps&&ps.runtime&&ps.runtime.landscape&&
      ps.runtime.landscape.installed&&ps.runtime.landscape.routeTiles===228));
    var sv=JSON.parse(SaveGame.serialize());
    ok('save carries world revision', !v2 || (sv.world && sv.world.provider===p.id && sv.world.worldRevision===p.worldRevision));
    ok('save carries tutorial curriculum revision', !v2 || (sv.tut&&sv.tut.curriculumVersion===HolmTutorialFlow.curriculumVersion));
    ok('save carries the reward-safe waterworks operation ledger', !v2 || !holm ||
      (sv.waterworks&&Array.isArray(sv.waterworks.appliedOps)));
    ok('save carries the reward-safe fishing-edge operation ledger', !v2 || !holm ||
      (sv.fishingEdge&&Array.isArray(sv.fishingEdge.appliedOps)));
    var rt=ps&&ps.runtime, tr=rt&&rt.terrain, ob=rt&&rt.objects, cg=rt&&rt.collision;
    ok('one terrain geometry per resident chunk', !v2 || (!!tr&&tr.liveGeometries===ps.residentChunks));
    ok('terrain shares one material and texture', !v2 || (!!tr&&tr.sharedMaterials===1&&tr.sharedTextures===1));
    var catalog=p&&p.catalogChunks?p.catalogChunks():[];
    var objectRows=catalog.reduce(function(n,ch){ return n+ch.layers.objects.length; },0);
    var interactionRows=catalog.reduce(function(n,ch){ return n+ch.layers.interactions.length; },0);
    var resident=p&&p.residentChunks?p.residentChunks():[];
    var residentObjectRows=resident.reduce(function(n,ch){ return n+ch.layers.objects.length; },0);
    var residentInteractionRows=resident.reduce(function(n,ch){ return n+ch.layers.interactions.length; },0);
    var residentColliderRows=resident.reduce(function(n,ch){ return n+ch.layers.objects.filter(function(o){return !!o.collider;}).length; },0);
    var residentBuildingRows=resident.reduce(function(n,ch){ return n+ch.layers.objects.filter(function(o){return !!o.buildingDef;}).length; },0);
    var residentBuildingColliders=resident.reduce(function(n,ch){ return n+ch.layers.objects.reduce(function(sum,o){
      if(!o.buildingDef||typeof WorldV2BuildingData==='undefined') return sum;
      var bd=WorldV2BuildingData.get(o.buildingDef); return sum+(bd?bd.colliders.length+bd.doors.length:0);
    },0); },0);
    ok('authored object and interaction layers validate', !v2 || !holm ||
      (objectRows===HolmLandscape.objectPlacements.length+5&&interactionRows===36&&
       WorldV2BuildingData.acceptance().ok));
    ok('chunk object runtime matches resident authored rows', !v2 || (!!ob&&ob.liveInstances===residentObjectRows));
    ok('chunk objects use shared cached resources', !v2 || (!!ob&&ob.templateBuilds===ob.templates&&
      (residentObjectRows===0||(ob.sharedGeometries>0&&ob.sharedMaterials>0))));
    ok('chunk interactions own resident raycasts and colliders', !v2 ||
      (!!ob&&ob.clickables===residentInteractionRows&&
       ob.colliders===residentColliderRows+residentBuildingColliders&&ob.buildings===residentBuildingRows&&
       ob.interiors===residentBuildingRows&&ob.doors===residentBuildingRows*2));
    ok('no duplicate global landscape placements', !v2 || (scene.children.filter(function(o){return o.userData&&o.userData.worldObjectId;}).length===residentObjectRows));
    var campLabels=['Search <b>Crate</b>','Search <b>Barrel</b>','Take <b>Bucket</b>'];
    ok('global population did not duplicate resident chunk interactions', !v2 || !holm || campLabels.every(function(label){
      var expected=resident.some(function(ch){return ch.layers.interactions.some(function(row){return row.label===label;});})?1:0;
      return WORLD.clickables.filter(function(o){return o.userData&&o.userData.label===label;}).length===expected;
    }));
    ok('Holm curriculum and boat gate are installed', !v2 || !holm ||
      (HolmTutorialFlow.acceptanceResult.passed===HolmTutorialFlow.acceptanceResult.total&&
       typeof HolmDeparture==='object'&&HolmDeparture.unlocked()===!!Tutorial.complete));
    ok('Holm landscape keeps passive props clear of completed building footprints', !v2 || !holm ||
      (HolmLandscape.acceptanceResult.passed===13&&HolmLandscape.acceptanceResult.total===13));
    var workyard=holm&&WorldV2BuildingData.get('holm_survival_workyard_v1');
    var workyardResident=holm&&resident.some(function(ch){return ch.layers.objects.some(function(o){
      return o.buildingDef==='holm_survival_workyard_v1';
    });});
    var workDoors=holm&&(WORLD.doors||[]).filter(function(d){return d.userData&&
      (d.userData.partId==='trail_door'||d.userData.partId==='pond_door');});
    ok('Workyard revision 17 is intentionally sited between path and the raised freshwater shore', !v2 || !holm ||
      (workyard.revision===17&&workyard.placement.yOffset===-0.16&&
       HolmLandscape.pathDistance(workyard.placement.x+workyard.doors[0].entry.outside[0],
       workyard.placement.z+workyard.doors[0].entry.outside[1])<=0.5&&
       !HolmLandscape.inPond(workyard.placement.x+workyard.doors[1].entry.outside[0],
       workyard.placement.z+workyard.doors[1].entry.outside[1])));
    var purposefulParts=['workyard_crockery_hutch','workyard_mug_shelf',
      'workyard_tool_stool','workyard_lodge_rug','workyard_hearth_rug','workyard_lesson_table',
      'workyard_hearth_stool_splitter','workyard_hearth_stool_woven','workyard_storm_warden_relief'];
    var occupationParts=['workyard_exterior_u3_v1','timber_log_rack','log_stack','rope_restraints',
      'chopping_block','embedded_axe','sawbuck'];
    var purposefulRuntime=workyardResident&&scene.getObjectByName('world-object-holm_survival_workyard');
    ok('Workyard upstairs has nine purposeful Blender scenery owners with walk-first behavior', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&purposefulParts.every(function(id){
        var part=WorldV2Buildings.findPart(purposefulRuntime,id);
        return part&&part.userData&&part.userData.kind==='prop'&&part.userData.inspectOnly===true;
      })));
    ok('Workyard modeled lesson bucket is the renewable empty vessel for the waterworks', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&(function(){
        var bucket=WorldV2Buildings.findPart(purposefulRuntime,'workyard_empty_bucket');
        return ITEMS.bucket&&bucket&&bucket.userData&&bucket.userData.kind==='holm_empty_bucket'&&
          Interact._hooks.some(function(h){return h.target.indexOf('kind:holm_empty_bucket')>=0&&h.primary;});
      })()));
    ok('Workyard U3 occupation family is composed from its separate Blender GLB with every semantic part', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&occupationParts.every(function(id){
        var part=WorldV2Buildings.findPart(purposefulRuntime,id);
        return part&&part.userData&&part.userData.partId===id;
      })));
    ok('Workyard U3 occupation family keeps its approved local placement and walk-first inspection contract', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&(function(){
        function close(a,b){return Math.abs(a-b)<0.001;}
        var expected={
          timber_log_rack:[2.25,.20,4.70,0],
          chopping_block:[.80,.20,2.25,.35],
          embedded_axe:[.74,.845,2.15,-.62],
          sawbuck:[4.60,.20,4.55,.28]
        };
        return Object.keys(expected).every(function(id){
          var part=WorldV2Buildings.findPart(purposefulRuntime,id),e=expected[id];
          return part&&close(part.position.x,e[0])&&close(part.position.y,e[1])&&close(part.position.z,e[2])&&
            close(part.rotation.y,e[3])&&part.userData&&part.userData.inspectOnly===true&&part.userData.kind==='prop';
        });
      })()));
    var waterworksParts=['workyard_waterworks_u4_v1','dock_shore_span','dock_turn_platform','dock_bank_span',
      'pulley_frame','pulley_crank','pulley_rope','pulley_bucket','shore_entry_socket','bank_exit_socket',
      'fishing_edge_socket','water_contact_socket','pulley_operator_socket'];
    ok('Workyard U4 waterworks is composed from its animated Blender GLB with every semantic part', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&waterworksParts.every(function(id){
        var part=WorldV2Buildings.findPart(purposefulRuntime,id);
        return part&&part.userData&&part.userData.partId===id;
      })&&(function(){
        var family=WorldV2Buildings.findPart(purposefulRuntime,'workyard_waterworks_u4_v1');
        var clips=WorldV2Buildings.dependencyAnimations('workyard_waterworks_u4_v1');
        var trackNodes=[];clips.forEach(function(c){c.tracks.forEach(function(t){trackNodes.push(t.name.split('.')[0]);});});
        return clips.map(function(c){return c.name;}).sort().join('|')==='Pulley_Idle|Pulley_Lift|Pulley_Lower'&&
          trackNodes.every(function(name){return !!family.getObjectByName(name);});
      })()));
    ok('Workyard U4 deck replaces pond collision with a continuous cardinal L route', !v2 || !holm ||
      !workyardResident || (typeof WorldWalkSurfaces!=='undefined'&&WorldWalkSurfaces.snapshot().surfaces>=3&&(function(){
        var oldPlane=Player.plane;Player.plane=0;
        var route=computePath(126.5,149.5,130.5,153.5);Player.plane=oldPlane;
        var deckY=groundY(126.5,149.5);
        return route.reached&&route.pts.every(function(p,i){return i===0||p[0]===route.pts[i-1][0]||p[1]===route.pts[i-1][1];})&&
          Math.abs((deckY-HOLM_POND_WATER_Y)-.5)<.03;
      })()));
    var waterworksSnap=holm&&typeof WorkyardWaterworksU4!=='undefined'&&WorkyardWaterworksU4.snapshot();
    ok('Workyard pulley has Operate/Inspect wiring, animation runtime, splash audio, and exact transaction clips', !v2 || !holm ||
      !workyardResident || (waterworksSnap&&waterworksSnap.ready&&waterworksSnap.operatorReady&&waterworksSnap.waterContactReady&&
        waterworksSnap.clipNames.join('|')==='Pulley_Idle|Pulley_Lift|Pulley_Lower'&&
        typeof SfxFurnishings.pulleyCreak==='function'&&typeof SfxFurnishings.waterSplash==='function'&&
        Interact._hooks.some(function(h){return h.target.indexOf('kind:holm_waterworks_pulley')>=0&&h.primary;})));
    var fishingParts=['workyard_fishing_edge_u5_v1','fishing_water_patch','fishing_ripple','fish_school',
      'dock_creel','catch_fish','catch_presentation_socket','fishing_operator_socket','fish_reward_socket','water_surface_socket'];
    var fishingSnap=holm&&typeof WorkyardFishingU5!=='undefined'&&WorkyardFishingU5.snapshot();
    ok('Workyard U5 fishing edge is composed from its animated Blender GLB with every semantic part', !v2 || !holm ||
      !workyardResident || (purposefulRuntime&&fishingParts.every(function(id){
        var part=WorldV2Buildings.findPart(purposefulRuntime,id);
        return part&&part.userData&&part.userData.partId===id;
      })&&(function(){
        var family=WorldV2Buildings.findPart(purposefulRuntime,'workyard_fishing_edge_u5_v1');
        var clips=WorldV2Buildings.dependencyAnimations('workyard_fishing_edge_u5_v1');
        var trackNodes=[];clips.forEach(function(c){c.tracks.forEach(function(t){trackNodes.push(t.name.split('.')[0]);});});
        return clips.map(function(c){return c.name;}).sort().join('|')==='FishingSpot_Bite|FishingSpot_Catch|FishingSpot_Idle'&&
          trackNodes.every(function(name){return !!family.getObjectByName(name);});
      })()));
    ok('Workyard U5 has Small-net interaction, cozy fishing audio, sockets, and exact transaction runtime', !v2 || !holm ||
      !workyardResident || (fishingSnap&&fishingSnap.ready&&fishingSnap.operatorReady&&fishingSnap.waterReady&&
        fishingSnap.clipNames.join('|')==='FishingSpot_Bite|FishingSpot_Catch|FishingSpot_Idle'&&
        WorldV2Buildings.findPart(purposefulRuntime,'fishing_water_patch').userData.acceptsUseItem===true&&
        typeof SfxFurnishings.netCast==='function'&&typeof SfxFurnishings.fishBite==='function'&&
        typeof SfxFurnishings.fishCatch==='function'&&
        Interact._hooks.some(function(h){return h.target.indexOf('kind:holm_fishing_edge')>=0&&h.primary;})));
    ok('Workyard doors expose world-space inside and outside approach tiles', !v2 || !holm ||
      !workyardResident || (workDoors.length===2&&workDoors.every(function(d){return d.userData.entryInside&&d.userData.entryOutside&&
        isFinite(d.userData.entryInside.x)&&isFinite(d.userData.entryOutside.z);})));
    var cellarSnap=holm&&typeof HolmSurvivalCellar!=='undefined'&&HolmSurvivalCellar.snapshot();
    ok('Workyard cellar returns beside the visible ladder on both planes', !v2 || !holm ||
      (cellarSnap&&cellarSnap.cellarApproach.z>cellarSnap.cellar.z&&cellarSnap.surface&&
       Math.hypot(cellarSnap.surface.anchor.x-cellarSnap.surface.approach.x,
         cellarSnap.surface.anchor.z-cellarSnap.surface.approach.z)<2));
    ok('Plane changes refuse an unregistered destination instead of entering a black void',
      typeof Planes!=='undefined'&&Planes.canEnter&&
      Planes.canEnter({plane:-99,x:9999,z:9999})===false&&
      (!v2||!holm||(cellarSnap&&cellarSnap.entryFloorReady===true)));
    var travelMarks=typeof TestTravel!=='undefined'&&TestTravel.bookmarks?TestTravel.bookmarks():[];
    ok('Local Test Travel has stable surface, basement, and cross-provider coordinate bookmarks',
      !v2||(travelMarks.some(function(row){return row.id==='holm_workyard_cellar'&&row.plane===-1;})&&
      travelMarks.some(function(row){return row.id==='holm_workyard_waterworks'&&row.plane===0&&row.x===130.5&&row.z===149.5;})&&
      travelMarks.some(function(row){return row.id==='holm_workyard_fishing'&&row.plane===0&&row.x===131.7&&row.z===151.1;})&&
      travelMarks.some(function(row){return row.id==='holm_workyard_cellar_hearth'&&row.plane===-1;})&&
      travelMarks.some(function(row){return row.id==='holm_workyard_cellar_shelf'&&row.plane===-1;})&&
      travelMarks.some(function(row){return row.id==='hollow_well_square'&&row.provider==='veyhollow-commons-v2';})&&
      travelMarks.some(function(row){return row.id==='holm_guide_apron'&&row.x===151&&row.z===169;})));
    var previousPlane=holm&&Player.plane,cellarRoute=null;
    if(holm&&cellarSnap&&cellarSnap.ready){
      Player.plane=-1;
      cellarRoute=computePath(cellarSnap.cellarApproach.x,cellarSnap.cellarApproach.z,
        cellarSnap.cellar.x+2.5,cellarSnap.cellar.z+0.5);
      Player.plane=previousPlane;
    }
    ok('Workyard cellar floor accepts a real cardinal click-to-walk route', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.walkSurfaceRegistered&&cellarRoute&&cellarRoute.reached&&
       cellarRoute.pts.length>2));
    ok('Workyard cellar has two modeled wall torches and a modeled animated hearth', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.cellarModel==='v2-revision-14-sealed-chest-end-panels-pass'&&
       cellarSnap.torchFlames===2&&cellarSnap.hearthFlames===1&&
       cellarSnap.flameLights===3&&cellarSnap.flameGlows===3&&cellarSnap.wallTorchAssetReady===2&&
       cellarSnap.wallTorchAsset==='cellar_wall_torch_v1'&&cellarSnap.wallTorchAnimation==='Flame_Flicker'&&
       cellarSnap.wallTorchAnimationSeconds>=2.7&&cellarSnap.wallTorchAnimationSeconds<=3.0&&
       cellarSnap.wallTorchLightProfile==='cozy-slow-v2'&&
       cellarSnap.wallTorchEastWallMounted&&cellarSnap.wallTorchScale&&cellarSnap.legacyWallTorchesHidden&&
        cellarSnap.exitClickable&&!cellarSnap.cellarFloorClimbProxy&&
        cellarSnap.ladderClickMode==='visible-mesh-only'&&cellarSnap.hearthInspectable));
    ok('Workyard cellar uses the separate animated Blender reserve chest facing inward against the wall', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.reserveChestReady&&cellarSnap.reserveChestClickable&&
       cellarSnap.reserveChestAsset==='cellar_reserve_chest_v1'&&cellarSnap.reserveChestAnimation==='Chest_Open'&&
       cellarSnap.reserveChestAudio==='cellar-furnishings-v2'&&
       cellarSnap.reserveChestFacingCenter&&cellarSnap.reserveChestAgainstSouthWall&&
       cellarSnap.reserveChestWallServiceGap>=.28&&cellarSnap.reserveChestOpenSettleDegrees===54&&
       cellarSnap.reserveChestContinuousUnderside&&cellarSnap.reserveChestSealedEndPanels&&
       cellarSnap.reserveChestWallSafeOpen&&
       cellarSnap.legacyChestHidden));
    ok('Workyard cellar replaces every remaining graybox with ten semantic Blender furnishing families', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.furnishings&&cellarSnap.furnishings.ready&&
       cellarSnap.furnishings.asset==='cellar_remaining_furnishings_v1'&&
       cellarSnap.furnishings.semanticFamilies===11&&cellarSnap.furnishings.clickables>=17&&
       cellarSnap.furnishings.inspectionOnly&&cellarSnap.furnishings.familyCounts.table===1&&
       cellarSnap.furnishings.familyCounts.picture===1&&cellarSnap.furnishings.wallPictureReady&&
       cellarSnap.furnishings.pictureBelowWallCap&&cellarSnap.furnishings.hearthBackWallContact&&
       cellarSnap.furnishings.openBasketInteriors&&cellarSnap.furnishings.rootBasketInterior&&
       cellarSnap.furnishings.rootProduceNested&&cellarSnap.furnishings.fullArchedFirebox&&
       cellarSnap.furnishings.barrelToolClearance>=.15&&
       cellarSnap.furnishings.hearthAnimation==='Hearth_Flame'&&
       cellarSnap.furnishings.hearthAnimationSeconds>=4.9&&cellarSnap.furnishings.hearthAnimationSeconds<=5.1&&
       cellarSnap.furnishings.hearthMeshCount>=2&&cellarSnap.furnishings.hearthFlameMeshCount>=3&&
       cellarSnap.furnishings.hearthFlameVisible&&cellarSnap.furnishings.hearthBounds&&
       cellarSnap.furnishings.hearthBounds.size.y>=3.2&&
       cellarSnap.furnishings.legacyHearthHidden&&cellarSnap.furnishings.westShelfReadabilityLight));
    ok('Workyard cellar quiet corner uses four approved clickable Blender furnishings outside the central aisle', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.quietCornerReady&&
       cellarSnap.quietCornerAsset==='cellar_quiet_corner_v1'&&cellarSnap.quietCornerParts===4&&
       cellarSnap.quietCornerClickable&&cellarSnap.quietCornerInspectionOnly&&cellarSnap.quietCornerEastWall&&
       cellarSnap.quietCornerFacesCenter&&cellarSnap.quietCornerAisleClear));
    ok('Workyard cellar uses separate purpose-built Blender hatch and wall ladder forms', !v2 || !holm ||
      (cellarSnap&&cellarSnap.ready&&cellarSnap.ladderTemplateReady&&
       cellarSnap.cellarWallLadderOnly&&cellarSnap.cellarLadderContextScale===1&&
       cellarSnap.cellarLadderVisual==='simple-uniform-oak-v4-wall-contact'&&
       cellarSnap.climbAudio==='cellar-furnishings-v2'&&cellarSnap.cellarClimbUpSound&&
       cellarSnap.legacyCellarLadderHidden&&
       (!workyardResident||(cellarSnap.ladderAssetReady&&
        cellarSnap.ladderAsset==='cellar_traversal_pair_v2'&&cellarSnap.ladderAssetCount===2&&
        cellarSnap.cellarVisibleLadderCount===1&&
        cellarSnap.surfaceFloorHatchOnly&&cellarSnap.surfaceDarkDescent&&cellarSnap.surfaceAnimatedLid&&
        cellarSnap.surfaceLidOpenPose&&cellarSnap.surfaceClimbDownSound&&cellarSnap.climbSoundDirections&&
         cellarSnap.legacyLaddersHidden))));
    ok('inspect-only scenery keeps Walk here as its reachable hover primary',
      typeof hoverPrimaryLabel==='function'&&
      hoverPrimaryLabel({obj:{name:'scenery',userData:{inspectOnly:true,label:'Inspect'}}},true)==='Walk here'&&
      hoverPrimaryLabel({obj:{name:'scenery',userData:{inspectOnly:true,label:'Inspect'}}},false)===null);
    ok('resident collision mirrors terrain ring', !v2 || (!!cg&&cg.mode==='resident'&&cg.residentChunks===ps.residentChunks));
  }catch(e){ ok('world-v2 runtime contract', false); } })();
  ok('measured boot ready', typeof CR_BOOT_TELEMETRY==='object' && CR_BOOT_TELEMETRY.status==='ready' && CR_BOOT_TELEMETRY.progress===100);
  ok('named boot telemetry', CR_BOOT_TELEMETRY && Array.isArray(CR_BOOT_TELEMETRY.steps) &&
    CR_BOOT_TELEMETRY.steps.some(function(s){ return s.id==='terrain' && s.status==='complete'; }));
  (function(){ try{
    var m=document.getElementById('minimap'), px=m&&m.getContext('2d').getImageData(72,72,1,1).data;
    ok('minimap is actively painted', !!px && px[3]>0);
  }catch(e){ ok('minimap is actively painted', false); } })();
  (function(){ try{
    var before=CRMinimap.snapshot(), n=before.dynamicFrames;
    drawMinimap(); drawMinimap(); drawMinimap();
    var mm=CRMinimap.snapshot();
    ok('minimap uses three cached layers', mm.layerVersion===2&&mm.staticBuilds>=1&&mm.markerBuilds>=1&&mm.dynamicFrames>=n+3);
    ok('minimap static layer stays cached', mm.staticBuilds===before.staticBuilds);
    ok('minimap marker layer stays cached', mm.markerBuilds===before.markerBuilds);
    ok('minimap dynamic markers are bounded', mm.dynamicMarkers<=mm.dynamicLimit&&mm.maxDynamicMarkers<=mm.dynamicLimit);
  }catch(e){ ok('minimap layered cache contract', false); } })();

  var total=pass+fail;
  var report={pass:pass, fail:fail, total:total, failures:failures, verdict: fail===0?'ALL PASS':'FAILURES'};
  try{ console.log('[CR_smoke] '+pass+'/'+total+' passed'+(fail?(' — FAILED: '+failures.join(', ')):'')); }catch(e){}
  return report;
};
