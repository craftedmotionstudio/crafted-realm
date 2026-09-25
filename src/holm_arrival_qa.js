/* Local, opt-in real-game arrival provider. Consumes the validated Studio export;
 * never publishes it or selects it for ordinary adventurers. */
var HolmArrivalQA=(function(){
 'use strict';
 var qs=new URLSearchParams(location.search),island=typeof HolmIsland!=='undefined'?HolmIsland.live():qs.get('holmIsland')==='1',requested=qs.get('arrivalQA')==='1'||island,loaded=null,provider=null,owner=null,bridge=null,pending=null;
 // M4.5: worn paths tint the island ground before any chunk renders (island draft only)
 if(island&&typeof HolmIslandPaths!=='undefined'&&typeof HolmOverhaulGround!=='undefined')HolmOverhaulGround.setPaths(HolmIslandPaths.tiles);
 var doors={arrival:false,garden:false},nav=null,graphs={},water=null,chart=null,trail=null,extras=null,islandData=null,heldRecord=null,lessons=null,passThrough=false,lastGateKey='';
 // ?holmIsland=1 (M4.1): the same provider over the whole Sept 13 island: the arrival graph composed with the
 // Blender keep/bakehouse/lodge graphs, habitat and bridges by HolmIslandNav; saves use their own graph revision.
 function revision(){return island?'holm-island-v1':loaded.package.navigation.graphRevision}
 // v4 (2026-09-24, M3R): guide house v2, branching oak, Lantern Keeper statue, trunk-footprint tree blockers
 var ID=island&&typeof HolmIsland!=='undefined'?HolmIsland.ID:'tutors-holm-arrival-qa',EXPORT='64098cdbe5d0631d';
 function active(){return !!provider&&CRWorldMode.providerId===ID}
 function graphForDoors(d){var key=JSON.stringify(d)+(island&&nav&&nav.gateKey?'|'+nav.gateKey():'');return graphs[key]||(graphs[key]=nav.compile(d))}
 function spawn(){return loaded.package.navigation.doorStates['closed-closed'].graph.nodes.find(function(n){return n.id===loaded.package.spawn.nodeId})}
 async function prepare(){
  if(!requested)return null;
  var production=typeof HolmIsland!=='undefined'&&HolmIsland.production();
  if((!production&&!QAProfile.isolated)||CRWorldMode.legacy)throw Error('Arrival QA requires a local isolated qaProfile and the v2 game');
  loaded=await HolmArrivalExportLoader.load({baseUrl:'/.studio-workspaces/holm-arrival-package-v9/exports/',exportId:EXPORT});
  nav=HolmArrivalDock.create(loaded.documents.layout,loaded.documents.envelopes,loaded.documents.terrain,loaded.documents.dock);
  var pack=loaded.package,chunks=JSON.parse(JSON.stringify(pack.terrain.chunks)),b=loaded.documents.layout.building,s=spawn();
  chunks.forEach(function(c){c.layers.terrain.exclusions=[{x:b.world.x-b.width/2,z:b.world.z-b.depth/2,w:b.width,d:b.depth}]});
  islandData=null;
  if(island){   // compose before registration, so a saved island position restores onto the full graph
   islandData=await HolmIslandExtras.loadData();
   var bw=b.world,scenic=loaded.documents.envelopes.blockers.filter(function(q){return q.surface==='exterior'&&/^Blender declared/.test(q.source||'')}).map(function(q){return {id:q.id,x0:q.x0+bw.x,x1:q.x1+bw.x,z0:q.z0+bw.z,z1:q.z1+bw.z}});
   var gateData=typeof HolmIslandGates!=='undefined'?await HolmIslandGates.loadData():{gates:[]};
   nav=HolmIslandNav.create({gates:gateData.gates,terrain:loaded.documents.terrain,arrival:nav,buildings:islandData.buildings.concat(typeof HolmGuideCellar!=='undefined'?[HolmGuideCellar.building()]:[]),blockers:scenic.concat(islandData.blockers),bridges:islandData.bridges,
    arrivalFootprints:[{x0:bw.x-b.width/2,x1:bw.x+b.width/2,z0:bw.z-b.depth/2,z1:bw.z+b.depth/2}]});graphs={};
  }
  provider=WorldV2.register({contractVersion:1,id:ID,label:island?(typeof HolmIsland!=='undefined'&&HolmIsland.production()?'Tutor’s Holm':'Tutor\u2019s Holm \u00b7 island draft'):'Tutor’s Holm · arrival draft',worldRevision:pack.provider.worldRevision,
   initialRect:{x0:0,z0:0,w:144,h:128},residentRadius:4,renderStrategy:'holm-overhaul-sampled',defaultLandmark:'holm_arrival',
   landmarks:{holm_arrival:{id:'holm_arrival',label:'Arrival landing',x:s.x,z:s.z}},chunks:chunks,
   hooks:{
    buildTerrain:async function(p){
     WorldV2Terrain.init(p);p.updateResidency(s.x,s.z,true);
     owner=await HolmArrivalModelOwner.create({THREE:THREE,scene:scene,WORLD:WORLD,loaded:loaded});owner.setDoors(doors);
     if(island&&typeof HolmGuideCellar!=='undefined')try{HolmGuideCellar.bind({scene:scene,WORLD:WORLD})}catch(err){console.error('[HolmArrivalQA] cellar',err)}
     if(island){
      extras=await HolmIslandExtras.load({THREE:THREE,scene:scene,WORLD:WORLD,data:islandData,sample:function(x,z){return HolmOverhaulTerrain.sample(loaded.documents.terrain,x,z)}});
      // M5.1 lesson stations on the island (trees, fishing spot, ore rocks, furnace, anvil, beacon lever)
      if(typeof HolmIslandLessons!=='undefined')lessons=await HolmIslandLessons.load({THREE:THREE,scene:scene,WORLD:WORLD,models:extras.models,sample:function(x,z){return HolmOverhaulTerrain.sample(loaded.documents.terrain,x,z)}});
      // M6.4: Blender-animated lever, beam, marker, ripple, furnace glow, sparks; tree fall and ferry departure
      if(typeof HolmIslandFx!=='undefined')try{await HolmIslandFx.load({THREE:THREE,scene:scene,models:extras.models,api:HolmArrivalQA})}catch(err){console.error('[HolmArrivalQA] fx',err)}
      // M6.1: one Blender tutor per area, with chat-box lessons
      if(typeof HolmIslandTutors!=='undefined')try{await HolmIslandTutors.load({THREE:THREE,scene:scene,WORLD:WORLD,api:HolmArrivalQA})}catch(err){console.error('[HolmArrivalQA] tutors',err)}
      // M6.2: the adventurer as the Blender player (appearance from the character creator, a clip per action)
      if(typeof HolmIslandPlayer!=='undefined')try{await HolmIslandPlayer.load({swapActor:function(o){if(bridge&&bridge.replaceActor)bridge.replaceActor(o)}})}catch(err){console.error('[HolmArrivalQA] player',err)}
      // M5.3: practice grubkins for the combat trials
      if(typeof HolmIslandTrials!=='undefined')try{HolmIslandTrials.load(HolmArrivalQA)}catch(err){console.error('[HolmArrivalQA] trials',err)}
      // M5.2b: progress gates (doors that open as lessons are done)
      if(typeof HolmIslandGates!=='undefined')try{await HolmIslandGates.load({THREE:THREE,scene:scene,WORLD:WORLD,nav:nav})}catch(err){console.error('[HolmArrivalQA] gates',err)}
      // M5.2a: the island curriculum's arrows point at the stations that now exist
      if(typeof HolmIslandCurriculum!=='undefined')try{HolmIslandCurriculum.bind(HolmArrivalQA)}catch(err){console.error('[HolmArrivalQA] curriculum targets',err)}
     }
     // the creek water fills its carved channel to the drawn bank (owner play-test 2026-09-25: no looking under its edge)
     water=HolmArrivalWater.create(THREE,loaded.documents.terrain.creek,null,loaded.documents.terrain);scene.add(water.group);
     trail=HolmArrivalTrail.create(THREE,loaded.documents.layout,HolmArrivalTrail.terrainSampler(loaded.documents.terrain));
     trail.userData={kind:"arrival_surface",arrivalSurface:"exterior"};scene.add(trail);WORLD.grounds.push(trail);WORLD.clickables.push(trail);
     var bounds=pack.navigation.interactions[0].localBounds;
     chart=new THREE.Mesh(new THREE.BoxGeometry(bounds.width,.3,bounds.depth),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
     chart.position.set(b.world.x+bounds.x,b.world.foundationY+bounds.y+.65,b.world.z+bounds.z);chart.userData={kind:'arrival_chart',label:'Study relief chart'};scene.add(chart);WORLD.clickables.push(chart);
     for(const d of pack.navigation.doors){var leaf=owner.house.getObjectByName(d.leafPart);if(leaf){leaf.userData.kind='arrival_door';leaf.userData.arrivalDoor=d.id;leaf.userData.label='Open / close door';if(WORLD.clickables.indexOf(leaf)<0)WORLD.clickables.push(leaf)}}
    },populate:function(){},chartCollision:function(){},
    loadChunk:function(c,p){return WorldV2Terrain.loadChunk(c,p)},unloadChunk:function(h){WorldV2Terrain.unloadChunk(h)},
    dispose:function(){HolmArrivalPlayer.detach();if(typeof HolmIslandTutors!=='undefined')HolmIslandTutors.dispose(WORLD,scene);if(typeof HolmIslandTrials!=='undefined')HolmIslandTrials.dispose();if(lessons){HolmIslandLessons.dispose(WORLD,scene);lessons=null}if(extras){extras.dispose();extras=null}if(owner)owner.dispose();if(water)water.dispose();if(trail){scene.remove(trail);[WORLD.grounds,WORLD.clickables].forEach(function(a){var i=a.indexOf(trail);if(i>=0)a.splice(i,1)});trail.geometry.dispose();trail.material.dispose();trail=null;}if(chart){scene.remove(chart);var i=WORLD.clickables.indexOf(chart);if(i>=0)WORLD.clickables.splice(i,1);chart.geometry.dispose();chart.material.dispose()}WorldV2Terrain.dispose()},
    snapshot:function(){return {arrivalDraft:true,terrain:WorldV2Terrain.snapshot(),pose:bridge?bridge.snapshot():null,doors:doors}}
   }});
  WorldV2.activate(ID);CRWorldMode.attachProvider(provider);return provider;
 }
 function height(x,z){
  if(!active()||x<0||z<0||x>144||z>128)return null;
  // Ground queries never return the upper floor. Actual traversal uses explicit surfaces.
  var d=nav.support('dock',x,z,doors);if(d)return d.y;
  if(island){var k=nav.support('deck',x,z,doors);if(k)return k.y}
  return HolmOverhaulTerrain.sample(loaded.documents.terrain,x,z);
 }
 function bindPlayer(record){
  if(!active())return;
  if(!record&&heldRecord){record=heldRecord;if(record.doors){doors=record.doors;owner.setDoors(doors)}}heldRecord=null;
  var node=spawn(),graph=graphForDoors(doors);
  if(record&&(record.revision===revision()||(loaded.package.navigation.compatibleGraphRevisions||[]).indexOf(record.revision)>=0)){
   try{node=island?HolmIslandNav.restoreCheckpoint(graph,record,record.revision):HolmArrivalCheckpoint.restore(graph,record,record.revision)}catch(e){UI.chat('The arrival draft changed; restored at the landing.','sys')}
  }
  placeAt(node);
 }
 // Stand the player on a graph node (boot, restore, and 2004-style ladders, which change storey instantly).
 var stairMesh;
 function placeAt(node){
  HolmArrivalPlayer.detach();player.position.set(node.x,node.y,node.z);Player.plane=0;Player.path=[];Player.moveTo=null;
  provider.updateResidency(node.x,node.z,true);
  bridge=HolmArrivalPlayer.attach({actor:player,state:Player,providerId:ID,navigation:nav,graphForDoors:graphForDoors,startNodeId:node.id,doors:doors,lenientTiles:island,canMove:function(){return !owner.doorsMoving()}});owner.update(0,node.surface);
 }
 function saveRecord(){
  if(!active()||!bridge)return null;var pose=bridge.snapshot();
  if(!pose.nodeId)return null;
  var record=(island?HolmIslandNav.encodeCheckpoint:HolmArrivalCheckpoint.encode)(graphForDoors(doors),pose.nodeId,revision());record.doors={arrival:doors.arrival,garden:doors.garden};return record;
 }
 function restore(record){
  // the game boots behind the welcome screen: a Continue before the models exist is held, then bound with the player
  if(!owner){heldRecord=record||null;return}
  if(!active())return;
  if(record&&record.doors&&typeof record.doors.arrival==='boolean'&&typeof record.doors.garden==='boolean'){doors=record.doors;owner.setDoors(doors)}
  bindPlayer(record);
 }
 function toggleDoor(id,enter){
  var next={arrival:doors.arrival,garden:doors.garden};next[id]=!next[id];
  if(bridge.setDoors(next)){doors=next;owner.setDoors(doors,{animate:true});
   // opened from outside: once the leaf has swung clear, step through into the doorway (the roof lifts, the room shows)
   if(enter&&next[id]&&!insideHouse(player.position)){var inn=doorwayInside(id);if(inn)setTimeout(function(){if(bridge&&!bridge.snapshot().moving&&doors[id])bridge.order(inn)},650)}}
  else UI.chat('Step clear of the doorway first.','plain');
 }
 // the house footprint and the first floor node inside a door
 function insideHouse(p){if(!loaded||!loaded.documents||!loaded.documents.layout)return true;var b=loaded.documents.layout.building,w=b.world;return Math.abs(p.x-w.x)<b.width/2&&Math.abs(p.z-w.z)<b.depth/2}
 function doorwayInside(id){if(typeof scene==='undefined'||!scene||!scene.getObjectByName)return null;var h=scene.getObjectByName(id==='garden'?'DoorNorthHinge':'DoorSouthHinge');if(!h)return null;var c=h.getWorldPosition(new THREE.Vector3()),best=null,d=Infinity;
  graphForDoors(doors).nodes.forEach(function(n){if(n.surface!=='ground'||!insideHouse(n))return;var k=Math.hypot(n.x-c.x,n.z-c.z);if(k<d){d=k;best=n}});return d<2.5?best:null}
 // Nearest walkable node within reach of the door, preferring the player's own side of it.
 // the leaf's swing: its hinge and the radius it sweeps (leaf length plus the adventurer's own radius)
 function doorSwing(id){if(typeof scene==='undefined'||!scene||!scene.getObjectByName)return null;var hinge=scene.getObjectByName(id==='garden'?'DoorNorthHinge':'DoorSouthHinge'),leaf=scene.getObjectByName(id==='garden'?'DoorNorthLeaf':'DoorSouthLeaf');if(!hinge||!leaf)return null;
  var h=hinge.getWorldPosition(new THREE.Vector3()),b=new THREE.Box3().setFromObject(leaf),r=0;[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.max.z]].forEach(function(c){r=Math.max(r,Math.hypot(c[0]-h.x,c[1]-h.z))});
  return {hinge:{x:h.x,z:h.z},r:r+.35}}
 function inSwing(n,swing){return !!swing&&Math.hypot(n.x-swing.hinge.x,n.z-swing.hinge.z)<swing.r}
 function doorStance(pos,swing){
  var best=null,bestScore=Infinity;
  graphForDoors(doors).nodes.forEach(function(n){
   var reach=Math.hypot(n.x-pos.x,n.z-pos.z);if(reach>2.4||reach<.6||inSwing(n,swing))return;
   var score=Math.hypot(n.x-player.position.x,n.z-player.position.z);
   if(score<bestScore){best=n;bestScore=score}
  });
  return best;
 }
 var WORLD_KINDS={resource:1,fire:1,bank:1,furnace:1,anvil:1};
 // the stance beside a station: a graph node 0.5-1.7 tiles away horizontally at about the station's height, nearest the player
 function beside(at){var best=null,score=Infinity;graphForDoors(doors).nodes.forEach(function(n){var h=Math.hypot(n.x-at.x,n.z-at.z);
  if(h<.5||h>1.7||Math.abs(n.y-at.y)>2.2)return;var s=Math.hypot(n.x-player.position.x,n.z-player.position.z)+h*2;if(s<score){score=s;best=n}});return best}
 // pass the click to the game's handler (it sets the action); cancel the direct walk it orders, the player is in reach
 function act(obj,point){passThrough=true;try{if(typeof window.handleClick==='function')window.handleClick(obj,point);else handleClickGame(obj,point)}finally{passThrough=false}if(bridge)bridge.stop()}
 function handleClickGame(obj,point){try{return new Function('o','p','return handleClick(o,p)')(obj,point)}catch(e){console.error(e)}}
 function handleClick(obj,point){
  if(passThrough)return false;
  if(!active()||!bridge)return false;
  var u=obj.userData||{};pending=null;Player.target=null;Player.action=null;
  if(u.kind==='island_sign'&&island){UI.chat(u.islandSign,'plain');return true}
  // 2004 rule: the current lesson's area waits until its tutor has been spoken to (stations, lesson objects, grubkins)
  if(island&&typeof HolmIslandTalk!=='undefined'){var tm=HolmIslandTalk.refusal(u);if(tm){UI.chat(tm,'plain');return true}}
  // M5.2b: a shut door says why; an open one is walked through like the floor beneath it
  if(u.kind==='island_gate'&&island){var gm=HolmIslandGates.message(u.islandGate);if(gm){UI.chat(gm,'plain');return true}if(bridge.order({x:point.x,y:point.y,z:point.z}))return true;UI.chat('There is no open route to that spot.','plain');return true}
  // M6.1: a tutor: walk to a stance beside them, then talk (chat-box dialogue)
  if(u.kind==='island_tutor'&&island){var tg=obj;while(tg&&!/^island-tutor-/.test(tg.name||''))tg=tg.parent;var tp=(tg||obj).getWorldPosition(new THREE.Vector3());
   var tn=beside(tp);if(tn&&Math.hypot(tn.x-player.position.x,tn.z-player.position.z)<.3&&!bridge.snapshot().moving){HolmIslandTutors.talk(u.islandTutor);return true}
   if(Math.hypot(tp.x-player.position.x,tp.z-player.position.z)<1.8&&!bridge.snapshot().moving){HolmIslandTutors.talk(u.islandTutor);return true}
   if(tn&&bridge.order(tn))pending={id:tn.id,kind:'tutor',tutor:u.islandTutor};else UI.chat('You cannot reach them from here.','plain');return true}
  // M5.1: the game's own stations (trees, fishing spot, rocks, fires, furnace, anvil, bank booths). Walk the graph to a
  // stance beside the object, then hand the click to the game's handleClick, which runs the normal action.
  if(island&&!passThrough&&WORLD_KINDS[u.kind]){
   if(u.kind==='resource'&&!u.alive){UI.chat('There is nothing left to gather here.','plain');return true}
   // stand-off measured from the station's footprint centre at its base (a furnace's bounding centre is head-high)
   var bx=new THREE.Box3().setFromObject(obj),at=bx.getCenter(new THREE.Vector3());at.y=bx.min.y;if(u.kind==='resource'||u.kind==='fire')at.copy(obj.getWorldPosition(new THREE.Vector3()));
   var near=beside(at);
   if(near&&Math.hypot(near.x-player.position.x,near.z-player.position.z)<.3&&!bridge.snapshot().moving){act(obj,point);return true}
   if(near&&bridge.order(near))pending={id:near.id,kind:'world',obj:obj,point:point};else UI.chat('You cannot reach that from here.','plain');
   return true;
  }
  if(u.kind==='island_service'&&u.islandService&&island){   // M4.2: walk to the measured stance, then serve
   var sv=u.islandService,blockedMsg=typeof HolmIslandGates!=='undefined'&&HolmIslandGates.serviceBlocked(sv.building,sv.target);if(blockedMsg){UI.chat(blockedMsg,'plain');return true}
   var sg=graphForDoors(doors),stance=sg.byId&&sg.byId[sv.node];
   if(stance&&bridge.order({x:stance.x,y:stance.y,z:stance.z,surface:stance.surface}))pending={id:sv.node,kind:'island_service',service:sv};
   else UI.chat('There is no open route to the '+sv.label.toLowerCase()+'.','plain');
   return true;
  }
  if(u.kind==='arrival_door'){
   // Exported leaf geometry can be offset from its object origin/hinge.
   var pos=new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
   // a door never swings through the adventurer: from inside its sweep, first step clear, then open or close it
   var swing=doorSwing(u.arrivalDoor),inside=inSwing({x:player.position.x,z:player.position.z},swing);
   if(Math.hypot(pos.x-player.position.x,pos.z-player.position.z)>2.5||inside){
    // Old-school doors: a far click walks to the nearest stance beside the door, then opens it.
    var stance=doorStance(pos,swing);
    if(stance&&bridge.order(stance))pending={id:stance.id,kind:'door',door:u.arrivalDoor};
    else UI.chat('There is no open route to that door.','plain');
    return true;
   }
   toggleDoor(u.arrivalDoor,true);return true;
  }
  if(u.kind==='arrival_chart'||u.kind==='arrival_provisions'){
   var service=loaded.package.navigation.interactions.find(function(s){return s.kind===(u.kind==='arrival_chart'?'holm_orientation':'holm_provisions')});
   if(!service)return true;
   var id=service.stanceNodeIds[0],node=graphForDoors(doors).nodes.find(function(n){return n.id===id});
   if(node&&bridge.order(node))pending={id:id,kind:service.kind};return true;
  }
  // the Guide House cellar (2004 trapdoor): walk to the hatch or the ladder foot, then stand on the other storey
  if(island&&typeof HolmGuideCellar!=='undefined'){var cz=HolmGuideCellar.click(u,point,graphForDoors(doors),bridge.snapshot().surface);
   if(cz){if(cz.chat){UI.chat(cz.chat,'plain');return true}
    if(cz.walk){if(!bridge.order(cz.walk))UI.chat('You cannot reach that from here.','plain');return true}
    if(Math.hypot(cz.from.x-player.position.x,cz.from.z-player.position.z)<.3&&Math.abs(cz.from.y-player.position.y)<.6&&!bridge.snapshot().moving){HolmGuideCellar.climb(cz,placeAt);return true}
    if(bridge.order(cz.from))pending={id:cz.from.id,kind:'cellar',climb:cz};else UI.chat('You cannot reach that from here.','plain');return true}}
  // 2004 staircase: a click on the flight walks to its foot (or its head) and climbs to the other floor in one step
  if(island&&u.arrivalSurface==='stair'){var sc=stairClimb();
   if(!sc){UI.chat('You cannot reach the stairs from here.','plain');return true}
   if(Math.hypot(sc.from.x-player.position.x,sc.from.z-player.position.z)<.3&&Math.abs(sc.from.y-player.position.y)<.6&&!bridge.snapshot().moving){climbStairs(sc);return true}
   if(bridge.order(sc.from))pending={id:sc.from.id,kind:'stair',climb:sc};else UI.chat('You cannot reach the stairs from here.','plain');return true}
  // a spot on the other floor of the Guide House: the stairs are climbed, not walked (2004), then on to the spot
  var tgt=u.arrivalSurface||(u.islandGround||isGroundName(obj.name)?'outside':null);
  if(island&&tgt&&tgt!=='stair'){var cur=bridge.snapshot().surface;
   if((cur==='upper')!==(tgt==='upper')){var sc2=stairClimb(),dest={x:point.x,y:point.y,z:point.z};if(u.arrivalSurface)dest.surface=u.arrivalSurface;
    if(sc2&&bridge.order(sc2.from)){pending={id:sc2.from.id,kind:'stair',climb:sc2,then:dest};return true}}}
  if(u.arrivalSurface||u.islandGround||isGroundName(obj.name)){
   var p={x:point.x,y:point.y,z:point.z};if(u.arrivalSurface)p.surface=u.arrivalSurface;
   if(!bridge.order(p)){
    var porch=HolmArrivalPorchTarget.resolve({point:p,layout:loaded.documents.layout,graph:graphForDoors(doors)});
    if(!porch||!bridge.order(porch))UI.chat('There is no open route to that spot.','plain');
   }return true;
  }
  return false;
 }
 function update(dt){
  if(!active()||!bridge||!owner)return;if(water)water.update(dt);var pose=bridge.snapshot();if(extras)extras.update(dt,pose);if(lessons)HolmIslandLessons.update();if(island&&typeof HolmIslandTutors!=='undefined')HolmIslandTutors.update(dt);if(island&&typeof HolmIslandPlayer!=='undefined')HolmIslandPlayer.update();if(island&&typeof HolmIslandFx!=='undefined')HolmIslandFx.update(dt,THREE,scene);if(island&&typeof HolmIslandGuide!=='undefined')HolmIslandGuide.update(dt);if(island&&typeof HolmIslandTalk!=='undefined')HolmIslandTalk.update();if(island&&typeof HolmIslandGates!=='undefined'){HolmIslandGates.refresh();HolmIslandGates.update(dt);
   // an opened gate changes the composed graph: the follower holds its graph, so re-seat it on the current one
   var gk=nav.gateKey?nav.gateKey():'';if(gk!==lastGateKey){if(bridge.setDoors({arrival:doors.arrival,garden:doors.garden}))lastGateKey=gk}}owner.update(dt,pose.surface);
  if(island&&typeof HolmGuideCellar!=='undefined')HolmGuideCellar.update(dt,pose.surface);
  if(island){if(stairMesh===undefined)stairMesh=scene.getObjectByName('StairFlight')||null;if(stairMesh)stairMesh.userData.label=pose.surface==='upper'?'Climb-down Staircase':'Climb-up Staircase'}
  if(pending&&pose.nodeId===pending.id&&!pose.moving){var p0=pending,kind=pending.kind,door=pending.door;pending=null;
   if(kind==='island_service'){var call=p0.service.call;
    if(p0.service.climb){var up=graphForDoors(doors).byId[p0.service.climb];if(up){placeAt(up);if(typeof HolmIslandPlayer!=='undefined'&&HolmIslandPlayer.active())HolmIslandPlayer.play('climb');if(p0.service.notify)try{Tutorial.notify(p0.service.notify[0],p0.service.notify[1])}catch(e){}}else UI.chat('The ladder leads nowhere yet.','plain');if(!call)return}
    if(!call){UI.chat(p0.service.label+'. (Its lesson comes with the full tutorial.)','plain');return}
    // module globals may be lexical (const UI), so resolve by name rather than only on window
    var mod=typeof window!=='undefined'&&window[call[0]];if(!mod&&/^[A-Za-z_]\w*$/.test(call[0])){try{mod=new Function('return typeof '+call[0]+'!==\'undefined\'?'+call[0]+':null')()}catch(e){mod=null}}
    if(mod&&typeof mod[call[1]]==='function')mod[call[1]]();return}
   if(kind==='world'){act(p0.obj,p0.point);return}
   if(kind==='cellar'){HolmGuideCellar.climb(p0.climb,placeAt);return}
   if(kind==='stair'){climbStairs(p0.climb);if(p0.then&&!bridge.order(p0.then))UI.chat('There is no open route to that spot.','plain');return}
   if(kind==='tutor'){HolmIslandTutors.talk(p0.tutor);return}
   if(kind==='door')toggleDoor(door,true);else if(kind==='holm_provisions')HolmGuideHall.collectTools();else HolmGuideHall.studyRoute()}
 }
 // the Guide House stairs: the ground node at the foot of the flight and the upper node at its head (layout is building-local)
 function stairClimb(){var l=loaded.documents.layout,s=l.stairs,bw=l.building.world,g=graphForDoors(doors),up=bridge.snapshot().surface!=='upper';
  function near(surface,x,z){var best=null,d=Infinity;g.nodes.forEach(function(n){if(n.surface!==surface)return;var h=Math.hypot(n.x-x,n.z-z);if(h<d){d=h;best=n}});return d<2.5?best:null}
  var foot=near('ground',bw.x+s.x,bw.z+s.startZ+.5),head=near('upper',bw.x+s.x,bw.z+s.endZ-.5);if(!foot||!head)return null;
  return up?{from:foot,to:head}:{from:head,to:foot}}
 // 2004 stairs have no climb animation: the adventurer simply stands on the other floor, facing on into the room
 function climbStairs(sc){placeAt(sc.to);var dz=sc.to.z-sc.from.z,dx=sc.to.x-sc.from.x;if(Math.hypot(dx,dz)>.1)player.rotation.y=Math.atan2(dx,dz)}
 // the firemaker's step off the fire tile on the graph: west first, then east, south, north (island draft only)
 function stepAside(){if(!island||!active()||!bridge)return false;var g=graphForDoors(doors),cur=g.byId[bridge.snapshot().nodeId];if(!cur)return false;
  var nb=(g.links[cur.id]||[]).map(function(id){return g.byId[id]});
  for(var d of [[-1,0],[1,0],[0,1],[0,-1]]){var n=nb.filter(function(m){return Math.round(m.x-cur.x)===d[0]&&Math.round(m.z-cur.z)===d[1]})[0];if(n&&bridge.order(n))return true}
  return true}
 // where an arrival-package service is taught (the relief chart, the provision rack): its first stance node
 function arrivalStance(kind){if(!active()||!loaded)return null;var s=loaded.package.navigation.interactions.filter(function(i){return i.kind===kind})[0];
  var n=s&&graphForDoors(doors).nodes.filter(function(m){return m.id===s.stanceNodeIds[0]})[0];return n?{id:n.id,x:n.x,y:n.y,z:n.z}:null}
 // combat on the island graph (M5.3): walk to a reachable node within weapon reach of a target that stands off the
 // graph (melee: next to it; ranged/magic: a few tiles off), nearest the player; cached per target tile
 var approachCache={},approachStall={},approachBad={};
 function approach(point){if(!island||!active()||!bridge)return false;var melee=Player.weaponStyle&&Player.weaponStyle()==='melee',lo=melee?.9:2.5,hi=melee?1.6:6;
  var key=(melee?'m':'r')+Math.floor(point.x)+','+Math.floor(point.z),n=approachCache[key]&&graphForDoors(doors).byId[approachCache[key]];
  if(!n){var py=Number.isFinite(point.y)?point.y:player.position.y,ring=graphForDoors(doors).nodes.filter(function(m){var h=Math.hypot(m.x-point.x,m.z-point.z);return h>=lo&&h<=hi&&Math.abs(m.y-py)<=2.5});
   // the target's own level: the lowest height gap in reach, plus half a tile (never the wall walk above a court)
   var minDy=ring.reduce(function(a,m){return Math.min(a,Math.abs(m.y-py))},Infinity),best=null,score=Infinity;
   ring.forEach(function(m){var dy=Math.abs(m.y-py);if(dy>minDy+.5||(approachBad[key]&&approachBad[key][m.id]))return;
    // ranged and magic need a clear line to the target (walls of a court block it; the game's own LoS rule)
    if(!melee&&typeof hasCombatLoS==='function'&&!hasCombatLoS({x:m.x,z:m.z},point))return;var s=Math.hypot(m.x-player.position.x,m.z-player.position.z)+Math.hypot(m.x-point.x,m.z-point.z)+dy*6;if(s<score){score=s;best=m}});
   n=best;if(n)approachCache[key]=n.id}
  if(!n)return false;var cur=bridge.snapshot();
  // standing on the chosen node and still asked to close in: that node does not work for this target, pick another
  if(cur.nodeId===n.id){approachStall[key]=(approachStall[key]||0)+1;if(approachStall[key]>4){(approachBad[key]=approachBad[key]||{})[n.id]=true;delete approachCache[key];approachStall[key]=0}return true}
  approachStall[key]=0;return bridge.order({x:n.x,y:n.y,z:n.z,surface:n.surface})}
 function graphNodes(){return active()?graphForDoors(doors).nodes:[]}
 // death on the island: back to the arrival spawn stance on the graph (the old respawn teleports to v2 coordinates)
 function respawnIsland(){if(!island||!active())return false;pending=null;try{placeAt(spawn())}catch(e){return false}return true}
 // QA only (read-only): where a building's measured target stands on the composed graph (any storey).
 function qaStance(buildingId,targetId){
  if(!active()||!island||!islandData)return null;var b=islandData.buildings.filter(function(x){return x.id===buildingId})[0],t=b&&b.graph.targets.filter(function(x){return x.id===targetId})[0];
  var n=t&&graphForDoors(doors).byId['b:'+buildingId+':'+t.nodeId];return n?{id:n.id,x:n.x,y:n.y,z:n.z,surface:n.surface}:null;
 }
 // QA only (read-only): the planned island route from the player's node to a building's measured target, so a
 // real-pointer driver can click reachable tiles along it. Never moves the player.
 function qaRoute(buildingId,targetId){
  if(!active()||!island||!islandData||!bridge)return null;var b=islandData.buildings.filter(function(x){return x.id===buildingId})[0];if(!b)return null;
  var t=b.graph.targets.filter(function(x){return x.id===targetId})[0];if(!t)return null;
  var g=graphForDoors(doors),from=bridge.snapshot().nodeId,r=from&&nav.route(g,from,'b:'+buildingId+':'+t.nodeId);
  return r?r.map(function(id){var n=g.byId[id];return {id:id,x:n.x,y:n.y,z:n.z,surface:n.surface}}):null;
 }
 return {requested:requested,prepare:prepare,active:active,height:height,bindPlayer:bindPlayer,restore:restore,saveRecord:saveRecord,handleClick:handleClick,update:update,qaRoute:qaRoute,qaStance:qaStance,stepAside:stepAside,arrivalStance:arrivalStance,approach:approach,graphNodes:graphNodes,respawnIsland:respawnIsland,
  islandActive:function(){return active()&&island},
  // review captures only: stream and frame a place without moving the adventurer
  qaView:function(x,z,y0){if(!active())return null;provider.updateResidency(x,z,true);var y=Number.isFinite(y0)?y0:height(x,z);window.__qaCameraFocus={x:x,y:Number.isFinite(y)?y:0,z:z};return window.__qaCameraFocus},   // y0: explicit height (the offshore cavern has no terrain)
  qaViewClear:function(){window.__qaCameraFocus=null},
  // the bakehouse oven stance, for the kitchen module's cook proxy on the island
  islandRangePoint:function(){if(!active()||!island)return null;var n=graphForDoors(doors).byId['b:bakehouse:-4:-3:1'];return n?{x:n.x,y:n.y,z:n.z}:null},
  islandStats:function(){return island&&nav&&nav.stats?nav.stats(doors):null}};
})();
