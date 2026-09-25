/* Tutor's Holm: the Guide House cellar (owner 2026-09-25: "maybe having a hatch that goes down to a cellar").
 * The Blender parts come with Guide House v3 (tools/blender/holm_guide_house_cellar_v3.py): CellarHatch + CellarHatchLid
 * in the ground floor, and CellarFloor / CellarShell / CellarCeiling / CellarLadder / CellarFurnishing below.
 * 2004 style: click the hatch and you walk to it, the lid swings open and you stand at the ladder foot below; click the
 * ladder to climb back up. While you are below only the cellar is drawn (the house above is cut away).
 * The cellar is an overlay storey in the island graph (HolmIslandNav: it lies under the Guide House's own tiles), nine
 * walkable tiles measured clear of the casks, barrels, sacks, shelves, crates and keg. */
var HolmGuideCellar=(function(){
 'use strict';
 var ID='guide-cellar',Y=0.25,HATCH_TOP='ground:65,98',FOOT=[63.5,98.5],OPEN=1.745;
 var TILES=[[61.5,99.5],[61.5,100.5],[62.5,99.5],[62.5,100.5],[63.5,98.5],[63.5,99.5],[63.5,100.5],[64.5,99.5],[64.5,100.5]];
 var st={bound:false,lid:null,lidT:0,lidWant:0,closeAt:0,hidden:null,inCellar:false,parts:[]};
 function localId(x,z){return Math.floor(x)+':'+Math.floor(z)+':0'}
 // the measured storey as a building graph in the island's building schema (world coordinates, placement at the origin)
 function building(){
  var nodes=TILES.map(function(t){return {id:localId(t[0],t[1]),x:t[0],y:Y,z:t[1],surface:'floor'}}),links={};
  nodes.forEach(function(a){links[a.id]=nodes.filter(function(b){return Math.abs(a.x-b.x)+Math.abs(a.z-b.z)===1}).map(function(b){return b.id})});
  return {id:ID,overlay:true,placement:{x:0,y:0,z:0},graph:{schema:'holm-keep-navigation-v1',nodes:nodes,links:links,targets:[{id:'ladder-foot',node:localId(FOOT[0],FOOT[1])}]}};
 }
 function nodeId(x,z){return 'b:'+ID+':'+localId(x,z)}
 function below(surface){return typeof surface==='string'&&surface.indexOf('b:'+ID+':')===0}
 // the floor is a ground of storey -1: the game's ground cutaway draws it only while the player is underground
 function mark(n,kind,label,world,ground){n.traverse(function(m){if(!m.isMesh)return;m.userData.kind=kind;m.userData.label=label;if(ground)m.userData.plane=-1;
  if(world.clickables.indexOf(m)<0)world.clickables.push(m);if(ground&&world.grounds.indexOf(m)<0)world.grounds.push(m)})}
 // find the cellar parts in the Guide House and make the hatch, ladder and floor clickable
 function bind(o){
  var hatch=null,lid=null,ladder=null,floor=null;
  o.scene.traverse(function(n){var nm=n.name||'';if(nm==='CellarHatch')hatch=n;else if(nm==='CellarHatchLid')lid=n;else if(nm==='CellarLadder')ladder=n;else if(nm==='CellarFloor')floor=n});
  if(!hatch||!lid||!ladder||!floor)return false;
  st.lid=lid;st.container=hatch.parent;
  mark(hatch,'arrival_hatch','Climb-down Hatch',o.WORLD);mark(lid,'arrival_hatch','Climb-down Hatch',o.WORLD);
  mark(ladder,'arrival_cellar_ladder','Climb-up Ladder',o.WORLD);mark(floor,'arrival_cellar_floor','Walk here',o.WORLD,true);
  st.bound=true;show(false);return true;
 }
 // what a click on a cellar part does: {walk:node} or {from,to,down} for a climb
 function click(u,point,graph,surface){
  if(!st.bound||!graph||!graph.byId)return null;
  var k=u&&u.kind;if(k!=='arrival_hatch'&&k!=='arrival_cellar_ladder'&&k!=='arrival_cellar_floor')return null;
  var top=graph.byId[HATCH_TOP],foot=graph.byId[nodeId(FOOT[0],FOOT[1])];if(!top||!foot)return {chat:'The hatch is stuck fast.'};
  if(k==='arrival_cellar_floor'){if(!below(surface))return {chat:'You need to climb down the hatch first.'};
   var best=null,d=Infinity;TILES.forEach(function(t){var n=graph.byId[nodeId(t[0],t[1])],h=n?Math.hypot(n.x-point.x,n.z-point.z):Infinity;if(h<d){d=h;best=n}});return best?{walk:best}:null}
  if(below(surface))return {from:foot,to:top,down:false};
  return k==='arrival_hatch'?{from:top,to:foot,down:true}:null;
 }
 function climb(c,placeAt){if(c.down){st.lidWant=1;st.closeAt=0}placeAt(c.to);
  if(!c.down)st.closeAt=Date.now()+1200;   // the lid drops shut behind you once you are up
 }
 // below: draw only the cellar (the house above and its ceiling cut away); above: only the hatch of it shows
 function show(inCellar){if(!st.container)return;st.inCellar=inCellar;
  if(inCellar){st.hidden=[];st.container.children.forEach(function(n){var nm=n.name||'';var keep=/^Cellar/.test(nm)&&nm!=='CellarCeiling';
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
  if(st.lid&&st.lidT!==st.lidWant){var step=(dt||0)/0.45;st.lidT=st.lidWant>st.lidT?Math.min(1,st.lidT+step):Math.max(0,st.lidT-step);st.lid.rotation.z=OPEN*st.lidT}
 }
 return {building:building,bind:bind,click:click,climb:climb,update:update,below:below,ID:ID};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmGuideCellar;
