/* Tutor's Holm island draft combat trials (finish goal M5.3). The 2004 Tutorial Island taught combat on rats in a
 * pen; ours are tame large rats (owner 2026-09-29: the large rat replaces the grubkin; our own Blender model,
 * assets/models/holm_large_rat_v1.glb with idle / walk / attack / hit / block / death clips,
 * tools/blender/build_holm_creatures_v1.py) in the Warden's Keep court for the melee and ranged trials and by the Mage
 * Tower for Wind Strike. They are ordinary game NPCs (game combat math, XP and death untouched): the kill's attack style
 * is credited by the existing npcKilled -> Tutorial.notify('killStyle', style) hook (tutorial_ext.js). The trial's
 * pacing is unchanged: harmless (they bite, every bite lands 0), slow (6 ticks), the court's hold 4 hitpoints and the
 * yard's 3, quick to respawn, no drops. They show the large rat's name and level. Island draft only (?holmIsland=1). */
var HolmIslandTrials=(function(){
 'use strict';
 var TYPE='holm_practice_rat',npcs=[];
 // our own entry, derived like the base data (npcMaxHit)
 var DEF={glbChar:'holm_large_rat_v1',glbHeight:.55,barH:1,name:'Large rat',level:3,examine:'A tame large rat the wardens keep for sparring. It bites, but only for show.',
  hp:5,att:1,str:1,def:1,aBonus:0,sBonus:0,dBonus:0,dStab:0,dSlash:0,dCrush:0,speedTicks:6,color:0x86705e,size:.9,aggro:false,respawn:6,drops:[],harmless:true,
  atype:'stab',bite:true,deathClip:true,keepOrigin:true};   // presentation: a bite (the snap sound), its own death clip (falls on its side, then sinks)
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
   if(!npc)return;npc.home.set(n.x,n.y,n.z);npc.mesh.position.set(n.x,n.y,n.z);npc.leash=12;npc.wanderR=1.5;   // a rat chasing an archer must not reset (and heal) before it dies: leash wide, idle wander small
   // 2004 Tutorial Island paced its practice foes to the lesson (a chicken for the first spells): under the 2004 rules
   // (0..max damage, single casts) the mage yard's rats have 3 hitpoints so fifteen teaching runes are always
   // enough; the keep court's keep 4 (thirty arrows). A per-instance copy: the shared type is never changed.
   if(pen.hp){npc.t=Object.assign({},npc.t,{hp:pen.hp});npc.hp=pen.hp}
   npc.islandPen=pen.id;npc.mesh.name='island-trial-'+pen.id+'-'+i;npcs.push(npc)})});
  return {npcs:npcs.length,pens:PENS.map(function(p){return p.id})};
 }
 function dispose(){npcs.forEach(function(n){if(typeof WORLD!=='undefined'){[WORLD.npcs,WORLD.clickables].forEach(function(a){var i=a.indexOf(n.mesh===undefined?n:(a===WORLD.npcs?n:n.mesh));if(i>=0)a.splice(i,1)})}if(n.mesh&&n.mesh.parent)n.mesh.parent.remove(n.mesh)});npcs=[]}
 return {load:load,dispose:dispose,npcs:function(){return npcs.slice()},TYPE:TYPE};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmIslandTrials;
