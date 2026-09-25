/* Tutor's Holm v3 preview provider (finish goal, step 2).
 * Opt-in only: ?holmV3=1 with an isolated ?qaProfile. Ordinary adventurers and saves never see it;
 * production boot stays on the current island until the step-7 cutover.
 * One compiled bundle (tools/build_holm_v3_terrain.js) drives everything the player meets:
 *   groundY      -> HolmV3Terrain.walkHeight (null on water, deck height on crossings)
 *   collision    -> CollisionGrid resident chunks, baked from that same groundY
 *   pathfinding  -> the normal 4-direction BFS with the 1.05 step limit
 *   rendering    -> HolmV3Render (2004 underlay/overlay tiles, flat blue water, plank decks)
 */
var HolmV3Preview=(function(){
  'use strict';
  var requested=typeof location!=='undefined'&&new URLSearchParams(location.search).get('holmV3')==='1';
  var ID='tutors-holm-v3-preview',BUNDLE='assets/world/holm_v3/holm-v3.terrain.bundle.json';
  var HOUSES=['assets/world/holm_v3/guide_house.tilehouse.json'],SCENERY=['assets/world/holm_v3/arrival.scenery.json'];
  var bundle=null,provider=null,material=null,water=null,crossings=[],houseSources=[],scenerySources=[],installed=[];
  async function json(url){var r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Holm v3 file missing: '+url);return r.json();}

  // Houses, furniture and scenery go in before chunk residency so the first collision bake sees them.
  function installContent(){
    houseSources.forEach(function(src){
      var plan=HolmTileHouse.plan(src),built=HolmTileHouse.build(THREE,plan);
      built.root.name='world-object-'+plan.id;   // HolmStationReach finds service stances by this name
      var extra=HolmTileHouse.install(plan,built);
      plan.furniture.forEach(function(f){
        var piece=HolmTileFurniture.build(THREE,plan,f);(f.level?built.upper:built.ground).add(piece.group);
        if(piece.collider)WORLD.colliders.push(piece.collider);
        if(f.role){piece.group.userData=Object.assign({},ROLES[f.role]);WORLD.clickables.push(piece.group);}
      });
      installed.push({plan:plan,built:built,climbs:extra.climbs});
    });
    scenerySources.forEach(function(src){
      var s=HolmV3Scenery.build(THREE,src,function(x,z){return HolmV3Terrain.walkHeight(bundle,x,z);});
      scene.add(s.group);s.colliders.forEach(function(c){WORLD.colliders.push(c);});installed.push({scenery:s});
    });
  }
  // The look the owner asked for in review 2, matched to the Bible references: bright top light with a
  // gentle side component (as the baked terrain light), warm ambient, and a wider, higher camera so more
  // ground surrounds a smaller player. Everything is restored on dispose.
  var savedLights=null,savedCam=null;
  function setLights(on){
    if(typeof scene==='undefined')return;
    if(typeof camera!=='undefined'&&typeof camCtl!=='undefined'){
      if(on){savedCam={fov:camera.fov,pitch:camCtl.pitch,dist:camCtl.dist};camera.fov=45;camCtl.pitch=1.12;camCtl.dist=22;camera.updateProjectionMatrix();}
      else if(savedCam){camera.fov=savedCam.fov;camCtl.pitch=savedCam.pitch;camCtl.dist=savedCam.dist;camera.updateProjectionMatrix();savedCam=null;}
    }
    if(on){
      savedLights=[];
      scene.children.forEach(function(o){
        if(o.isHemisphereLight){savedLights.push([o,o.intensity,o.color.getHex(),o.groundColor.getHex()]);o.intensity=.95;o.color.set('#f2f0e4');o.groundColor.set('#6a6a50');}
        else if(o.isDirectionalLight){savedLights.push([o,o.intensity,o.color.getHex(),o.position.clone()]);o.intensity=.85;o.color.set('#fff8e8');o.position.set(-40,80,40);}
      });
    }else if(savedLights){
      savedLights.forEach(function(s){var o=s[0];o.intensity=s[1];o.color.setHex(s[2]);if(o.isHemisphereLight)o.groundColor.setHex(s[3]);else o.position.copy(s[3]);});
      savedLights=null;
    }
  }
  var ROLES={study_route:{kind:'holm_v3_chart',label:'Study <b>Relief chart</b>'},
    provisions:{kind:'holm_v3_provisions',label:'Collect-tools <b>Provisions rack</b>'}};
  // Service stances in world tiles (guide house origin 60,94): beside the chart and the rack, inside the hall.
  if(typeof Interact!=='undefined'&&typeof HolmStationReach!=='undefined'&&typeof HolmGuideHall!=='undefined'){
    var at=function(tile,fn){return HolmStationReach.guard('guide_house',tile,fn,1.2);};
    Interact.register({target:'kind:holm_v3_chart',option:'Study',primary:true,handler:at({x:61.5,z:96.5},function(){HolmGuideHall.studyRoute();})});
    Interact.register({target:'kind:holm_v3_provisions',option:'Collect-tools',primary:true,handler:at({x:61.5,z:97.5},function(){HolmGuideHall.collectTools();})});
    Interact.register({target:'kind:holm_v3_provisions',option:'Inspect',handler:at({x:61.5,z:97.5},function(){HolmGuideHall.inspectProvisions();})});
  }

  function active(){ return !!provider&&typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId===ID; }

  async function prepare(){
    if(!requested) return null;
    if(typeof QAProfile==='undefined'||!QAProfile.isolated||CRWorldMode.legacy)
      throw new Error('Holm v3 preview requires an isolated ?qaProfile and the v2 game');
    var res=await fetch(BUNDLE,{cache:'no-store'});
    if(!res.ok) throw new Error('Holm v3 bundle missing: run node tools/build_holm_v3_terrain.js');
    bundle=await res.json();
    if(bundle.schema!=='holm-terrain-bundle-v3') throw new Error('Holm v3 bundle has the wrong schema');
    houseSources=await Promise.all(HOUSES.map(json));scenerySources=await Promise.all(SCENERY.map(json));
    var chunks=HolmOverhaulChunks.compile(bundle.base).chunks, a=bundle.anchors;
    var landmarks={};
    Object.keys(a).forEach(function(id){ landmarks['v3_'+id]={id:'v3_'+id,label:id,x:a[id][0]+.5,z:a[id][1]+.5}; });
    provider=WorldV2.register({contractVersion:1,id:ID,label:'Tutor’s Holm · v3 preview',worldRevision:1,
      initialRect:{x0:0,z0:0,w:bundle.width,h:bundle.depth},residentRadius:4,renderStrategy:'holm-v3-tiles',
      defaultLandmark:'v3_landing',landmarks:landmarks,chunks:chunks,
      hooks:{
        buildTerrain:function(p){
          setLights(true);
          material=HolmV3Render.terrainMaterial(THREE);
          water=HolmV3Render.buildWater(THREE,bundle);scene.add(water);
          crossings=bundle.crossings.map(function(c){var g=HolmV3Render.buildCrossing(THREE,c);scene.add(g);
            if(g.userData.deckHit){WORLD.clickables.push(g.userData.deckHit);WORLD.grounds.push(g.userData.deckHit);}return g;});
          if(typeof CollisionGrid!=='undefined') CollisionGrid.initResident(p);
          installContent();
          var s=p.getSpawnLandmark(p.defaultLandmark);p.updateResidency(s.x,s.z,true);
        },
        populate:function(){},
        chartCollision:function(p){ if(typeof CollisionGrid!=='undefined') CollisionGrid.rebakeResident(p); },
        loadChunk:function(chunk){
          var mesh=HolmV3Render.buildChunk(THREE,bundle,chunk.cx,chunk.cz,material);
          mesh.userData.worldChunk={id:chunk.id,cx:chunk.cx,cz:chunk.cz};
          scene.add(mesh);WORLD.clickables.push(mesh);WORLD.grounds.push(mesh);
          if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.loadChunk(chunk);
          return {id:chunk.id,mesh:mesh};
        },
        unloadChunk:function(handle,chunk){
          if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.unloadChunk(chunk);
          if(!handle||!handle.mesh) return;
          scene.remove(handle.mesh);
          [WORLD.clickables,WORLD.grounds].forEach(function(list){var i=list.indexOf(handle.mesh);if(i>=0)list.splice(i,1);});
          handle.mesh.geometry.dispose();
        },
        dispose:function(){
          setLights(false);
          if(water){scene.remove(water);water.traverse(function(o){if(o.geometry)o.geometry.dispose();});}
          crossings.forEach(function(g){scene.remove(g);});crossings=[];
          if(material) material.dispose();material=null;water=null;
        },
        snapshot:function(){ return {v3Preview:true,stats:bundle.stats,routes:bundle.routes,
          collision:typeof CollisionGrid!=='undefined'&&CollisionGrid.snapshot?CollisionGrid.snapshot():null}; }
      }});
    WorldV2.activate(ID);CRWorldMode.attachProvider(provider);
    return provider;
  }

  function height(x,z){ return active()?HolmV3Terrain.walkHeight(bundle,x,z):null; }
  function snapshot(){ return active()?{provider:ID,stats:bundle.stats,routes:bundle.routes,
    houses:installed.filter(function(i){return i.plan;}).map(function(i){return {id:i.plan.id,stats:i.plan.stats,doors:i.built.doors.length};})}:null; }
  return {requested:requested,prepare:prepare,active:active,height:height,snapshot:snapshot};
})();
