/* Tutor's Holm island draft combat trials (finish goal M5.3). The 2004 Tutorial Island taught combat on small pests
 * in a pen; ours are practice grubkins (our own creature, Blender-rigged: assets/models/holm_grubkin_v1.glb with
 * idle/walk/attack/block clips) in the Warden's Keep court for the melee and ranged trials and by the Mage Tower for
 * Wind Strike. They are ordinary game NPCs (game combat math, XP and death untouched): the kill's attack style is
 * credited by the existing npcKilled -> Tutorial.notify('killStyle', style) hook (tutorial_ext.js). Harmless (no
 * hits land hard: level 1, max hit 1), quick to respawn, no drops. Island draft only (?holmIsland=1). */
var HolmIslandTrials=(function(){
 'use strict';
 var TYPE='holm_practice_grubkin',npcs=[];
 // our own entry, derived like the base data (npcMaxHit)
 var DEF={glbChar:'holm_grubkin_v1',glbHeight:.75,name:'Practice grubkin',level:1,examine:'A tame grubkin the wardens keep for sparring. It snaps, but only for show.',
  hp:5,att:1,str:1,def:1,aBonus:0,sBonus:0,dBonus:0,dStab:0,dSlash:0,dCrush:0,speedTicks:6,color:0x8a7a3a,size:.8,aggro:false,respawn:6,drops:[],harmless:true,
  deathStyle:'flip'};   // presentation only (combat feel): a crawler dies rolling onto its back, then sinks away
 // pens: near a building's measured target, on graph nodes 2-3 tiles from the stance, spread apart
 var PENS=[{id:'keep-court',building:'keep',target:'court',count:3,hp:4},{id:'mage-yard',building:'mage',target:'entrance',count:2,hp:3}];
 function register(){if(typeof NPC_TYPES==='undefined')return false;if(!NPC_TYPES[TYPE]){var t=Object.assign({},DEF);t.npcMaxHit=1;NPC_TYPES[TYPE]=t}return true}
 function spots(api,pen){
  var s=api.qaStance(pen.building,pen.target);if(!s)return [];
  var nodes=api.graphNodes().filter(function(n){var d=Math.hypot(n.x-s.x,n.z-s.z);return d>=2&&d<=4.5&&Math.abs(n.y-s.y)<.6&&/(:(IslandTerrain|StagedTerrain)|Floor|land)$/.test(n.surface)});
  var out=[];nodes.sort(function(a,b){return (a.x*7+a.z*13)%5-(b.x*7+b.z*13)%5});
  nodes.forEach(function(n){if(out.length<pen.count&&out.every(function(o){return Math.hypot(o.x-n.x,o.z-n.z)>=2.2}))out.push(n)});return out;
 }
 function load(api){
  if(!register()||typeof spawnNpc!=='function')return {npcs:0};
  PENS.forEach(function(pen){spots(api,pen).forEach(function(n,i){
   spawnNpc.force=true;var npc;try{npc=spawnNpc(TYPE,n.x,n.z)}finally{spawnNpc.force=false}
   if(!npc)return;npc.home.set(n.x,n.y,n.z);npc.mesh.position.set(n.x,n.y,n.z);npc.leash=12;npc.wanderR=1.5;   // a grubkin chasing an archer must not reset (and heal) before it dies: leash wide, idle wander small
   // 2004 Tutorial Island paced its practice foes to the lesson (a chicken for the first spells): under the 2004 rules
   // (0..max damage, single casts) the mage yard's grubkins have 3 hitpoints so fifteen teaching runes are always
   // enough; the keep court's keep 4 (thirty arrows). A per-instance copy: the shared type is never changed.
   if(pen.hp){npc.t=Object.assign({},npc.t,{hp:pen.hp});npc.hp=pen.hp}
   npc.islandPen=pen.id;npc.mesh.name='island-trial-'+pen.id+'-'+i;npcs.push(npc)})});
  return {npcs:npcs.length,pens:PENS.map(function(p){return p.id})};
 }
 function dispose(){npcs.forEach(function(n){if(typeof WORLD!=='undefined'){[WORLD.npcs,WORLD.clickables].forEach(function(a){var i=a.indexOf(n.mesh===undefined?n:(a===WORLD.npcs?n:n.mesh));if(i>=0)a.splice(i,1)})}if(n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh)});npcs=[]}
 return {load:load,dispose:dispose,npcs:function(){return npcs.slice()},TYPE:TYPE};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTrials;
