/* Tutor's Holm: the Guide House cellar (owner 2026-09-25: "maybe having a hatch that goes down to a cellar").
 * The Blender parts come with Guide House v3 (tools/blender/holm_guide_house_cellar_v3.py): CellarHatch + CellarHatchLid
 * in the ground floor, and CellarFloor / CellarShell / CellarCeiling / CellarLadder / CellarFurnishing below.
 * 2004 style: click the hatch and you walk to it, the lid swings open and you stand at the ladder foot below; click the
 * ladder to climb back up. While you are below only the cellar is drawn (the house above is cut away).
 * The cellar is an overlay storey in the island graph (HolmIslandNav: it lies under the Guide House's own tiles), its
 * walkable tiles measured clear of the furnishings.
 * Owner review 4 (2026-09-27): "when I went down the hatch all I can see is my character's head floating through the
 * floor". The storey stood at a fixed world height (0.25, the v1 land's foundation 3.0 less 2.75); on the v2 land the
 * house stands on a 4.4 foundation, so the adventurer stood 1.4 under the flagstones. Every height and tile is now
 * house-local (SPECS, per Guide House model) and placed from the arrival layout's foundation. */
var HolmGuideCellar=(function(){
 'use strict';
 var ID='guide-cellar';
 // per Guide House model, house-local (x east, z south, y up from the ground floor): the flagstones' top, the ground-floor
 // tile beside the hatch (the stance you climb down from), the ladder foot and the walkable cellar tiles (tile centres),
 // and how the lid opens (axis of its hinge, radians)
 var SPECS={
  // Guide House v3-v5 (tools/blender/holm_guide_house_cellar_v3.py): under the west half, the hatch between the tables
  v5:{floor:-2.75,hatchTop:[-1,-1],foot:[-2.5,-.5],tiles:[[-4.5,.5],[-4.5,1.5],[-3.5,.5],[-3.5,1.5],[-2.5,-.5],[-2.5,.5],[-2.5,1.5],[-1.5,.5],[-1.5,1.5]],lid:{axis:'z',angle:1.745}},
  // Guide House v6 (owner review 4: "the hatch should be in one corner of the room ... maybe there's just a cabbage spawn";
  // tools/blender/holm_guide_house_cellar_v6.py): the trapdoor in the south-east corner by the stair foot (its lid stands upright on its north
  // edge), a three-by-three cellar below with the ladder up the south wall, and a cabbage that grows back after it is picked
  v6:{floor:-2.75,hatchTop:[4.5,3.5],foot:[5.5,3.5],tiles:[[5.5,2.5],[4.5,2.5],[3.5,2.5],[5.5,3.5],[4.5,3.5],[3.5,3.5],[4.5,4.5]],lid:{axis:'x',angle:-Math.PI/2},
   cabbage:{part:'CellarCabbage',tile:[3.5,2.5],regrowMs:40000}}};
 var MODEL_SPEC=[[/holm_guide_house_oldschool_v1\.glb$/,'v5'],[/holm_guide_house_oldschool_v2\.glb$/,'v6']];
 var spec=SPECS.v5,place={x:66,z:99,y:4.4};
 var st={bound:false,lid:null,lidT:0,lidWant:0,closeAt:0,hidden:null,inCellar:false,parts:[]};
 function localId(x,z){return Math.floor(x)+':'+Math.floor(z)+':0'}
 function wx(t){return place.x+t[0]}function wz(t){return place.z+t[1]}
 function Y(){return place.y+spec.floor}
 function hatchTop(){return 'ground:'+Math.floor(place.x+spec.hatchTop[0])+','+Math.floor(place.z+spec.hatchTop[1])}
 function tiles(){return spec.tiles.map(function(t){return [wx(t),wz(t)]})}
 // the Guide House the island loads (arrival package: its layout's foundation and the guide model) picks the spec
 function configure(loaded){
  var b=loaded&&loaded.documents&&loaded.documents.layout&&loaded.documents.layout.building;if(b&&b.world)place={x:b.world.x,z:b.world.z,y:b.world.foundationY+(b.groundFloorY||0)};
  var row=loaded&&loaded.package&&(loaded.package.objects||[]).filter(function(o){return o.asset&&o.asset.id==='guide'})[0],path=row&&row.asset.model&&row.asset.model.path||'';
  var hit=MODEL_SPEC.filter(function(m){return m[0].test(path)})[0];spec=SPECS[hit?hit[1]:'v5'];return {spec:hit?hit[1]:'v5',y:Y()};
 }
 // the measured storey as a building graph in the island's building schema (world coordinates, placement at the origin)
 function building(loaded){
  if(loaded)configure(loaded);
  var nodes=tiles().map(function(t){return {id:localId(t[0],t[1]),x:t[0],y:Y(),z:t[1],surface:'floor'}}),links={};
  nodes.forEach(function(a){links[a.id]=nodes.filter(function(b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1}).map(function(b){return b.id})});
  return {id:ID,overlay:true,placement:{x:0,y:0,z:0},graph:{schema:'holm-keep-navigation-v1',nodes:nodes,links:links,targets:[{id:'ladder-foot',node:localId(wx(spec.foot),wz(spec.foot))}]}};
 }
 function nodeId(x,z){return 'b:'+ID+':'+localId(x,z)}
 function below(surface){return typeof surface==='string'&&surface.indexOf('b:'+ID+':')===0}
 // the floor is a ground of storey -1: the game's ground cutaway draws it only while the player is underground
 function mark(n,kind,label,world,ground){n.traverse(function(m){if(!m.isMesh)return;m.userData.kind=kind;m.userData.label=label;if(ground)m.userData.plane=-1;
  if(world.clickables.indexOf(m)<0)world.clickables.push(m);if(ground&&world.grounds.indexOf(m)<0)world.grounds.push(m)})}
 // find the cellar parts in the Guide House and make the hatch, ladder and floor clickable
 function bind(o){
  var hatch=null,lid=null,ladder=null,floor=null,cab=null;
  o.scene.traverse(function(n){var nm=n.name||'';if(nm==='CellarHatch')hatch=n;else if(nm==='CellarHatchLid')lid=n;else if(nm==='CellarLadder')ladder=n;else if(nm==='CellarFloor')floor=n;else if(spec.cabbage&&nm===spec.cabbage.part)cab=n});
  if(cab){st.cabbage=cab;st.cabbageTaken=false;mark(cab,'arrival_cellar_cabbage','Pick Cabbage',o.WORLD)}
  if(!hatch||!lid||!ladder||!floor)return false;
  st.lid=lid;st.container=hatch.parent;
  mark(hatch,'arrival_hatch','Climb-down Hatch',o.WORLD);mark(lid,'arrival_hatch','Climb-down Hatch',o.WORLD);
  mark(ladder,'arrival_cellar_ladder','Climb-up Ladder',o.WORLD);mark(floor,'arrival_cellar_floor','Walk here',o.WORLD,true);
  st.bound=true;show(false);return true;
 }
 // what a click on a cellar part does: {walk:node} or {from,to,down} for a climb
 function click(u,point,graph,surface){
  if(!st.bound||!graph||!graph.byId)return null;
  var k=u&&u.kind;if(k!=='arrival_hatch'&&k!=='arrival_cellar_ladder'&&k!=='arrival_cellar_floor'&&k!=='arrival_cellar_cabbage')return null;
  var top=graph.byId[hatchTop()],foot=graph.byId[nodeId(wx(spec.foot),wz(spec.foot))];if(!top||!foot)return {chat:'The hatch is stuck fast.'};
  // the cabbage: walk onto its tile (a 2004 ground spawn) and pick it
  if(k==='arrival_cellar_cabbage'){if(!below(surface))return {chat:'You need to climb down the hatch first.'};if(st.cabbageTaken)return {chat:'There is nothing there.'};
   var ct=graph.byId[nodeId(wx(spec.cabbage.tile),wz(spec.cabbage.tile))];return ct?{from:ct,take:true}:{chat:'You cannot reach that.'}}
  if(k==='arrival_cellar_floor'){if(!below(surface))return {chat:'You need to climb down the hatch first.'};
   var best=null,d=Infinity;tiles().forEach(function(t){var n=graph.byId[nodeId(t[0],t[1])],h=n?Math.hypot(n.x-point.x,n.z-point.z):Infinity;if(h<d){d=h;best=n}});return best?{walk:best}:null}
  if(below(surface))return {from:foot,to:top,down:false};
  return k==='arrival_hatch'?{from:top,to:foot,down:true}:null;
 }
 // (owner review 4) the cellar's cabbage: into the pack, hidden until it grows back
 function take(){if(!st.cabbage||st.cabbageTaken)return false;
  if(typeof Player==='undefined'||!Player.hasSpace()){if(typeof UI!=='undefined')UI.chat('You don\'t have enough inventory space.','plain');return false}
  Player.addItem('cabbage',1);st.cabbageTaken=true;st.cabbageBack=Date.now()+spec.cabbage.regrowMs;st.cabbage.visible=false;
  if(typeof UI!=='undefined'){UI.chat('You pick a cabbage.','plain');if(UI.refreshInv)UI.refreshInv()}if(typeof Sfx!=='undefined'&&Sfx.click)Sfx.click();return true}
 function climb(c,placeAt){if(c.take){take();return}if(c.down){st.lidWant=1;st.closeAt=0}placeAt(c.to);
  if(!c.down)st.closeAt=Date.now()+1200;   // the lid drops shut behind you once you are up
 }
 // below: draw only the cellar (the house above and its ceiling cut away); above: only the hatch of it shows
 // (owner review 4) the v6 cellar is three tiles square: its walls are cut a little over head height while you are below,
 // as the island's buildings are, so the game camera sees the room over them (the stones below the cut stay whole)
 var shellClip=null;
 function clipShell(on){if(!st.container||typeof THREE==='undefined')return;var shell=null;st.container.children.forEach(function(n){if(n.name==='CellarShell')shell=n});if(!shell)return;
  if(on&&!shellClip){shellClip=new THREE.Plane(new THREE.Vector3(0,-1,0),Y()+1.35);shell.traverse(function(m){if(!m.isMesh)return;if(!m.userData.ownClipMats){m.material=Array.isArray(m.material)?m.material.map(function(q){return q&&q.clone()}):m.material.clone();m.userData.ownClipMats=true}[].concat(m.material).forEach(function(q){if(q)q.clippingPlanes=[shellClip]})});if(typeof renderer!=='undefined'&&renderer)renderer.localClippingEnabled=true}
  else if(!on&&shellClip){shell.traverse(function(m){if(m.isMesh)[].concat(m.material).forEach(function(q){if(q)q.clippingPlanes=[]})});shellClip=null}}
 function show(inCellar){if(!st.container)return;st.inCellar=inCellar;if(spec.cabbage)clipShell(inCellar);
  if(inCellar){st.hidden=[];st.container.children.forEach(function(n){var nm=n.name||'';var keep=/^Cellar/.test(nm)&&nm!=='CellarCeiling'&&!(n===st.cabbage&&st.cabbageTaken);
    if(!keep&&n.visible){n.visible=false;st.hidden.push(n)}else if(keep)n.visible=true})}
  else{if(st.hidden)st.hidden.forEach(function(n){n.visible=true});st.hidden=null;
   st.container.children.forEach(function(n){var nm=n.name||'';if(/^Cellar/.test(nm))n.visible=/^CellarHatch/.test(nm)})}
 }
 // below, the rest of the world (the sea, the island, the tutors in the room overhead) is not drawn, as a 2004
 // dungeon sat in black; re-run every frame while below (streamed objects), restored exactly on the way up
 function isolate(on){if(typeof scene==='undefined'||!scene)return;
  if(on){if(!st.away)st.away=[];var root=st.container;while(root&&root.parent&&root.parent!==scene)root=root.parent;
   var keep=[root,typeof player!=='undefined'?player:null];if(typeof GuideArrow!=='undefined')['_sprite','_line','_arrow','_labelSprite','_label'].forEach(function(k){if(GuideArrow[k])keep.push(GuideArrow[k])});
   scene.children.forEach(function(c){if(!c.visible||c.isLight||c.isCamera||keep.indexOf(c)>=0)return;c.visible=false;st.away.push(c)})}
  else if(st.away){st.away.forEach(function(c){c.visible=true});st.away=null}}
 function update(dt,surface){if(!st.bound)return;
  var b=below(surface);if(b!==st.inCellar){show(b);if(!b)isolate(false)}if(b)isolate(true);
  // below ground the cellar is an underground storey: the follow camera stops clamping to the terrain overhead
  // and the sky and fog darken as in the cavern (restored the moment you are back up the ladder)
  if(typeof Player!=='undefined'){if(b)Player.plane=-1;else if(Player.plane===-1&&st.planeSet)Player.plane=0;st.planeSet=b}
  // 2004 dungeons sit in black: no sky around the cellar walls while you are below
  if(b&&typeof scene!=='undefined'&&scene){if(scene.background&&scene.background.setHex)scene.background.setHex(0x0c0907);if(scene.fog)scene.fog.color.setHex(0x0c0907)}
  if(st.closeAt&&Date.now()>st.closeAt){st.lidWant=0;st.closeAt=0}
  if(st.cabbageTaken&&Date.now()>st.cabbageBack){st.cabbageTaken=false;if(st.cabbage)st.cabbage.visible=st.inCellar}
  if(st.lid&&st.lidT!==st.lidWant){var step=(dt||0)/0.45;st.lidT=st.lidWant>st.lidT?Math.min(1,st.lidT+step):Math.max(0,st.lidT-step);st.lid.rotation[spec.lid.axis]=spec.lid.angle*st.lidT}
 }
 return {building:building,configure:configure,bind:bind,click:click,climb:climb,update:update,below:below,ID:ID,
  // read-only, for QA: the ladder foot and the hatch stance on the composed graph, the flagstones' height
  info:function(){return {spec:Object.keys(SPECS).filter(function(k){return SPECS[k]===spec})[0],floorY:Y(),hatchTop:hatchTop(),foot:nodeId(wx(spec.foot),wz(spec.foot)),tiles:tiles(),
   cabbage:spec.cabbage?{taken:!!st.cabbageTaken,node:nodeId(wx(spec.cabbage.tile),wz(spec.cabbage.tile)),visible:!!(st.cabbage&&st.cabbage.visible)}:null,lid:spec.lid}},take:take};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmGuideCellar;
