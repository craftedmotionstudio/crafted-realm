/* Local, opt-in real-game arrival provider. Consumes the validated Studio export;
 * never publishes it or selects it for ordinary adventurers. */
var HolmArrivalQA=(function(){
 'use strict';
 var qs=new URLSearchParams(location.search),island=qs.get('holmIsland')==='1',requested=qs.get('arrivalQA')==='1'||island,loaded=null,provider=null,owner=null,bridge=null,pending=null;
 var doors={arrival:false,garden:false},nav=null,graphs={},water=null,chart=null,trail=null,extras=null,islandData=null,heldRecord=null;
 // ?holmIsland=1 (M4.1): the same provider over the whole Sept 13 island: the arrival graph composed with the
 // Blender keep/bakehouse/lodge graphs, habitat and bridges by HolmIslandNav; saves use their own graph revision.
 function revision(){return island?'holm-island-v1':loaded.package.navigation.graphRevision}
 // v4 (2026-09-24, M3R): guide house v2, branching oak, Lantern Keeper statue, trunk-footprint tree blockers
 var ID='tutors-holm-arrival-qa',EXPORT='8d488d326998f957';
 function active(){return !!provider&&CRWorldMode.providerId===ID}
 function graphForDoors(d){var key=JSON.stringify(d);return graphs[key]||(graphs[key]=nav.compile(d))}
 function spawn(){return loaded.package.navigation.doorStates['closed-closed'].graph.nodes.find(function(n){return n.id===loaded.package.spawn.nodeId})}
 async function prepare(){
  if(!requested)return null;
  if(!QAProfile.isolated||CRWorldMode.legacy)throw Error('Arrival QA requires a local isolated qaProfile and the v2 game');
  loaded=await HolmArrivalExportLoader.load({baseUrl:'/.studio-workspaces/holm-arrival-package-v4/exports/',exportId:EXPORT});
  nav=HolmArrivalDock.create(loaded.documents.layout,loaded.documents.envelopes,loaded.documents.terrain,loaded.documents.dock);
  var pack=loaded.package,chunks=JSON.parse(JSON.stringify(pack.terrain.chunks)),b=loaded.documents.layout.building,s=spawn();
  chunks.forEach(function(c){c.layers.terrain.exclusions=[{x:b.world.x-b.width/2,z:b.world.z-b.depth/2,w:b.width,d:b.depth}]});
  islandData=null;
  if(island){   // compose before registration, so a saved island position restores onto the full graph
   islandData=await HolmIslandExtras.loadData();
   var bw=b.world,scenic=loaded.documents.envelopes.blockers.filter(function(q){return q.surface==='exterior'&&/^Blender declared/.test(q.source||'')}).map(function(q){return {id:q.id,x0:q.x0+bw.x,x1:q.x1+bw.x,z0:q.z0+bw.z,z1:q.z1+bw.z}});
   nav=HolmIslandNav.create({terrain:loaded.documents.terrain,arrival:nav,buildings:islandData.buildings,blockers:scenic.concat(islandData.blockers),bridges:islandData.bridges,
    arrivalFootprints:[{x0:bw.x-b.width/2,x1:bw.x+b.width/2,z0:bw.z-b.depth/2,z1:bw.z+b.depth/2}]});graphs={};
  }
  provider=WorldV2.register({contractVersion:1,id:ID,label:island?'Tutor\u2019s Holm \u00b7 island draft':'Tutor’s Holm · arrival draft',worldRevision:pack.provider.worldRevision,
   initialRect:{x0:0,z0:0,w:144,h:128},residentRadius:4,renderStrategy:'holm-overhaul-sampled',defaultLandmark:'holm_arrival',
   landmarks:{holm_arrival:{id:'holm_arrival',label:'Arrival landing',x:s.x,z:s.z}},chunks:chunks,
   hooks:{
    buildTerrain:async function(p){
     WorldV2Terrain.init(p);p.updateResidency(s.x,s.z,true);
     owner=await HolmArrivalModelOwner.create({THREE:THREE,scene:scene,WORLD:WORLD,loaded:loaded});owner.setDoors(doors);
     if(island){
      extras=await HolmIslandExtras.load({THREE:THREE,scene:scene,WORLD:WORLD,data:islandData,sample:function(x,z){return HolmOverhaulTerrain.sample(loaded.documents.terrain,x,z)}});
     }
     water=HolmArrivalWater.create(THREE,loaded.documents.terrain.creek);scene.add(water.group);
     trail=HolmArrivalTrail.create(THREE,loaded.documents.layout,HolmArrivalTrail.terrainSampler(loaded.documents.terrain));
     trail.userData={kind:"arrival_surface",arrivalSurface:"exterior"};scene.add(trail);WORLD.grounds.push(trail);WORLD.clickables.push(trail);
     var bounds=pack.navigation.interactions[0].localBounds;
     chart=new THREE.Mesh(new THREE.BoxGeometry(bounds.width,.3,bounds.depth),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
     chart.position.set(b.world.x+bounds.x,b.world.foundationY+bounds.y+.65,b.world.z+bounds.z);chart.userData={kind:'arrival_chart',label:'Study relief chart'};scene.add(chart);WORLD.clickables.push(chart);
     for(const d of pack.navigation.doors){var leaf=owner.house.getObjectByName(d.leafPart);if(leaf){leaf.userData.kind='arrival_door';leaf.userData.arrivalDoor=d.id;leaf.userData.label='Open / close door';if(WORLD.clickables.indexOf(leaf)<0)WORLD.clickables.push(leaf)}}
    },populate:function(){},chartCollision:function(){},
    loadChunk:function(c,p){return WorldV2Terrain.loadChunk(c,p)},unloadChunk:function(h){WorldV2Terrain.unloadChunk(h)},
    dispose:function(){HolmArrivalPlayer.detach();if(extras){extras.dispose();extras=null}if(owner)owner.dispose();if(water)water.dispose();if(trail){scene.remove(trail);[WORLD.grounds,WORLD.clickables].forEach(function(a){var i=a.indexOf(trail);if(i>=0)a.splice(i,1)});trail.geometry.dispose();trail.material.dispose();trail=null;}if(chart){scene.remove(chart);var i=WORLD.clickables.indexOf(chart);if(i>=0)WORLD.clickables.splice(i,1);chart.geometry.dispose();chart.material.dispose()}WorldV2Terrain.dispose()},
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
 function toggleDoor(id){
  var next={arrival:doors.arrival,garden:doors.garden};next[id]=!next[id];
  if(bridge.setDoors(next)){doors=next;owner.setDoors(doors,{animate:true})}else UI.chat('Step clear of the doorway first.','plain');
 }
 // Nearest walkable node within reach of the door, preferring the player's own side of it.
 function doorStance(pos){
  var best=null,bestScore=Infinity;
  graphForDoors(doors).nodes.forEach(function(n){
   var reach=Math.hypot(n.x-pos.x,n.z-pos.z);if(reach>2||reach<.6)return;
   var score=Math.hypot(n.x-player.position.x,n.z-player.position.z);
   if(score<bestScore){best=n;bestScore=score}
  });
  return best;
 }
 function handleClick(obj,point){
  if(!active()||!bridge)return false;
  var u=obj.userData||{};pending=null;Player.target=null;Player.action=null;
  if(u.kind==='island_service'&&u.islandService&&island){   // M4.2: walk to the measured stance, then serve
   var sv=u.islandService,sg=graphForDoors(doors),stance=sg.byId&&sg.byId[sv.node];
   if(stance&&bridge.order({x:stance.x,y:stance.y,z:stance.z,surface:stance.surface}))pending={id:sv.node,kind:'island_service',service:sv};
   else UI.chat('There is no open route to the '+sv.label.toLowerCase()+'.','plain');
   return true;
  }
  if(u.kind==='arrival_door'){
   // Exported leaf geometry can be offset from its object origin/hinge.
   var pos=new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
   if(Math.hypot(pos.x-player.position.x,pos.z-player.position.z)>2.5){
    // Old-school doors: a far click walks to the nearest stance beside the door, then opens it.
    var stance=doorStance(pos);
    if(stance&&bridge.order(stance))pending={id:stance.id,kind:'door',door:u.arrivalDoor};
    else UI.chat('There is no open route to that door.','plain');
    return true;
   }
   toggleDoor(u.arrivalDoor);return true;
  }
  if(u.kind==='arrival_chart'||u.kind==='arrival_provisions'){
   var service=loaded.package.navigation.interactions.find(function(s){return s.kind===(u.kind==='arrival_chart'?'holm_orientation':'holm_provisions')});
   if(!service)return true;
   var id=service.stanceNodeIds[0],node=graphForDoors(doors).nodes.find(function(n){return n.id===id});
   if(node&&bridge.order(node))pending={id:id,kind:service.kind};return true;
  }
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
  if(!active()||!bridge||!owner)return;if(water)water.update(dt);var pose=bridge.snapshot();if(extras)extras.update(dt,pose);owner.update(dt,pose.surface);
  if(pending&&pose.nodeId===pending.id&&!pose.moving){var p0=pending,kind=pending.kind,door=pending.door;pending=null;
   if(kind==='island_service'){var call=p0.service.call;
    if(p0.service.climb){var up=graphForDoors(doors).byId[p0.service.climb];if(up)placeAt(up);else UI.chat('The ladder leads nowhere yet.','plain');if(!call)return}
    if(!call){UI.chat(p0.service.label+'. (Its lesson comes with the full tutorial.)','plain');return}
    // module globals may be lexical (const UI), so resolve by name rather than only on window
    var mod=typeof window!=='undefined'&&window[call[0]];if(!mod&&/^[A-Za-z_]\w*$/.test(call[0])){try{mod=new Function('return typeof '+call[0]+'!==\'undefined\'?'+call[0]+':null')()}catch(e){mod=null}}
    if(mod&&typeof mod[call[1]]==='function')mod[call[1]]();return}
   if(kind==='door')toggleDoor(door);else if(kind==='holm_provisions')HolmGuideHall.collectTools();else HolmGuideHall.studyRoute()}
 }
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
 return {requested:requested,prepare:prepare,active:active,height:height,bindPlayer:bindPlayer,restore:restore,saveRecord:saveRecord,handleClick:handleClick,update:update,qaRoute:qaRoute,qaStance:qaStance,
  islandActive:function(){return active()&&island},
  // review captures only: stream and frame a place without moving the adventurer
  qaView:function(x,z){if(!active())return null;provider.updateResidency(x,z,true);var y=height(x,z);window.__qaCameraFocus={x:x,y:Number.isFinite(y)?y:0,z:z};return window.__qaCameraFocus},
  qaViewClear:function(){window.__qaCameraFocus=null},
  // the bakehouse oven stance, for the kitchen module's cook proxy on the island
  islandRangePoint:function(){if(!active()||!island)return null;var n=graphForDoors(doors).byId['b:bakehouse:-3:-2:1'];return n?{x:n.x,y:n.y,z:n.z}:null},
  islandStats:function(){return island&&nav&&nav.stats?nav.stats(doors):null}};
})();
