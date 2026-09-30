/* Holm foot grounding (owner review 9, 2026-09-30: "the feet sink into the ground" on the slopes by Wenna's camp fire).
 * The player object stands on the ground height at its CENTRE (pElev / groundY), so on a slope the uphill foot of the kit character
 * sinks into the hill. After the animation step this lifts the kit rig (never lowers it) by exactly what the lowest planted
 * sole needs to stand on the ground under THAT foot: for each foot, the ground under its heel and toe versus how high the clip
 * holds them above the character's floor. On flat ground nothing moves (a lifted foot in the air never asks for more);
 * the lift eases in and out so a step onto a slope does not pop. Presentation only: the player's position, paths,
 * collisions and the server never see it.
 *   HolmFootGround.update(root, rig, baseY)  -- root = the player group (on the centre ground), rig = the kit scene inside it,
 *                                              baseY = the rig's own resting y offset inside the root
 *   HolmFootGround.status()                  -- {lift, target, feet: [...]} for QA */
var HolmFootGround=(function(){
 'use strict';
 // sole below each bone's origin in kit metres at the rest pose (the ankle joint 12 cm up, the ball of the foot 3 cm up)
 var PTS=[['LeftFoot',.12],['LeftToeBase',.03],['RightFoot',.12],['RightToeBase',.03]];
 var MAX=.45;          // never lift more than this (kit metres x the rig scale): a cliff edge is not a slope
 var st={lift:0,target:0,t:null,feet:[],bones:null,rig:null};
 function bones(rig){
  if(st.rig===rig&&st.bones)return st.bones;
  var b={};rig.traverse(function(o){if(o.isBone){var m=/(LeftFoot|LeftToeBase|RightFoot|RightToeBase)$/.exec(o.name);if(m)b[m[1]]=o}});
  st.rig=rig;st.bones=b;return b;
 }
 var _v=null;
 function target(root,rig,ground){
  var b=bones(rig),s=rig.scale.x||1,y0=root.position.y,need=0,feet=[];
  if(!_v)_v=new THREE.Vector3();
  for(var i=0;i<PTS.length;i++){
   var bo=b[PTS[i][0]];if(!bo)continue;
   bo.getWorldPosition(_v);
   var g=ground(_v.x,_v.z);if(g===null||g===undefined||!isFinite(g))continue;
   var h=(_v.y-st.lift)-PTS[i][1]*s-y0;         // how high the clip holds this sole above the character's floor
   var n=(g-y0)-Math.max(h,0);                   // how far the ground under it rises above that sole
   feet.push({bone:PTS[i][0],ground:+(g-y0).toFixed(3),sole:+h.toFixed(3)});
   if(n>need)need=n;
  }
  st.feet=feet;
  return Math.min(need,MAX*s);
 }
 function update(root,rig,baseY){
  if(!root||!rig||typeof THREE==='undefined')return;
  // the same floor the player itself stands on (pElev: the ground, or the floor of the plane it is on)
  var ground=typeof pElev==='function'?pElev:(typeof groundY==='function'?groundY:null);if(!ground)return;
  var now=(typeof performance!=='undefined'?performance.now():Date.now())/1000,dt=st.t===null?0:Math.min(.1,Math.max(0,now-st.t));st.t=now;
  var t=0;try{t=target(root,rig,ground)}catch(e){t=0}
  st.target=t;
  // ease: up fast (a foot should never be seen inside the hill), down a little slower
  var k=t>st.lift?Math.min(1,dt*18):Math.min(1,dt*8);
  st.lift+=(t-st.lift)*(dt?k:1);
  if(st.lift<1e-4)st.lift=0;
  rig.position.y=(baseY||0)+st.lift;
 }
 function status(){return {lift:+st.lift.toFixed(4),target:+st.target.toFixed(4),feet:st.feet.slice()}}
 function reset(){st.lift=0;st.target=0;st.t=null;st.feet=[]}
 return {update:update,status:status,reset:reset,_target:target};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmFootGround;
