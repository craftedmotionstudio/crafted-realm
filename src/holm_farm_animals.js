/* Haycombe Farm's animals (owner request 2026-09-29: "similar to the old school RuneScape NPCs, the chickens, cows").
 * The farm's hens by the barn door and its cows in the railed paddock are live, attackable old-school animals, like
 * 2004's farm animals: the Chicken (NPC_TYPES.pasturehen, level 1: bones, feathers, sometimes an egg) and the Cow
 * (NPC_TYPES.moorcalf, level 2: bones, beast hide, raw beef), our own Blender models with full clip sets
 * (tools/blender/build_holm_creatures_v1.py). They take the places of the still prop hens and cow the farm dressing set
 * down (docs/rebuild/holm-overhaul/island-props.json, dress-haycombe-farm, tools/stage_holm_v2land_dressing.js), which
 * are hidden here and never removed from the data: those props never blocked the walk graph, so every navigation graph
 * stays byte-identical. Each animal stands on the walkable land node nearest its spot (the combat engine snaps it onto
 * the composed island graph) and wanders a tile or so from it; the paddock's rails (graph blockers) keep the cows in.
 * The sheep stay still props. Island only; loaded after the prop sets (HolmArrivalQA). */
var HolmFarmAnimals=(function(){
 'use strict';
 var npcs=[],hidden=[];
 // the dressing's hen spots by the barn door, and two cows in the paddock (rails x 103.5..111.5, z 96.5..100.5; the gate
 // at x 107.5 on the north side), each two tiles from the gate so a wander of one tile never reaches it
 var SPOTS=[['pasturehen',108.2,95.1,2],['pasturehen',109.4,94.7,2],['pasturehen',110.6,95.3,2],['pasturehen',111.3,94.6,2],['pasturehen',107.1,94.8,2],
  ['moorcalf',105.4,98.4,1],['moorcalf',109.6,98.3,1]];
 var PROP=/^island-prop-dress-haycombe-farm-(chicken|cow)-\d+$/;
 function landNodes(api){return api.graphNodes().filter(function(n){return /(:(IslandTerrain|StagedTerrain)|land)$/.test(n.surface||'')})}
 function nearest(nodes,x,z,taken){var best=null,bd=1e9;nodes.forEach(function(n){var d=Math.hypot(n.x-x,n.z-z),k=Math.floor(n.x)+','+Math.floor(n.z);if(d<bd&&!taken[k]){bd=d;best=n}});return bd<=2.5?best:null}
 function hideProps(W){
  if(typeof scene==='undefined'||!scene)return;
  scene.children.forEach(function(o){if(!PROP.test(o.name||'')||!o.visible)return;o.visible=false;hidden.push(o);
   o.traverse(function(m){var i=W.clickables.indexOf(m);if(i>=0)W.clickables.splice(i,1)})});
 }
 function load(api){
  if(typeof spawnNpc!=='function'||typeof NPC_TYPES==='undefined'||typeof WORLD==='undefined'||!api||!api.graphNodes)return {npcs:0};
  var nodes=landNodes(api),taken={};
  SPOTS.forEach(function(s,i){
   if(!NPC_TYPES[s[0]])return;var n=nearest(nodes,s[1],s[2],taken);if(!n)return;taken[Math.floor(n.x)+','+Math.floor(n.z)]=1;
   spawnNpc.force=true;var npc;try{npc=spawnNpc(s[0],n.x,n.z)}finally{spawnNpc.force=false}
   if(!npc)return;npc.home.set(n.x,n.y,n.z);npc.mesh.position.set(n.x,n.y,n.z);npc.mesh.rotation.y=(i*2.39)%6.28;npc.wanderR=s[3];npc.leash=6;
   npc.farmAnimal=true;npc.mesh.name='haycombe-'+(s[0]==='moorcalf'?'cow':'chicken')+'-'+i;npcs.push(npc)});
  hideProps(WORLD);
  return {npcs:npcs.length,hiddenProps:hidden.length};
 }
 function dispose(){
  npcs.forEach(function(n){if(typeof WORLD!=='undefined'){var i=WORLD.npcs.indexOf(n);if(i>=0)WORLD.npcs.splice(i,1);i=WORLD.clickables.indexOf(n.mesh);if(i>=0)WORLD.clickables.splice(i,1)}if(n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh)});
  npcs=[];hidden.forEach(function(o){o.visible=true});hidden=[];
 }
 return {load:load,dispose:dispose,npcs:function(){return npcs.slice()},SPOTS:SPOTS};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmFarmAnimals;
