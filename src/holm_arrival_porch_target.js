/* Narrow click fallback for the existing south arrival porch, not new support.
 * Returns a detached graph node; caller must still use the normal route follower.
 * With the current layout: z 104.175..106.4, x 64.18..67.82, y 3 +/- .15.
 * These limits derive from the authored wall/door/avatar and existing porch end;
 * they do not certify geometry, change collision, open doors or permit teleporting. */
var HolmArrivalPorchTarget=(function(){
 'use strict';
 function resolve(o){
  if(!o||!o.point||!o.layout||!o.graph||!Array.isArray(o.graph.nodes))return null;
  var p=o.point,l=o.layout,b=l.building,a=l.avatar;
  if(!b||!b.world||!a||!Array.isArray(l.doors))return null;
  var doors=l.doors.filter(function(d){return d&&d.id==='arrival'&&d.wall==='south'});
  if(doors.length!==1)return null;
  var d=doors[0],w=b.world;
  if(![p.x,p.y,p.z,w.x,w.z,w.foundationY,b.depth,b.wallThickness,b.groundFloorY,d.x,d.clearWidth,a.radius].every(Number.isFinite))return null;
  if(b.depth<=0||b.wallThickness<=0||b.wallThickness>=4.8||d.clearWidth<=0||a.radius<=0)return null;
  if(p.surface!==undefined&&p.surface!=='ground'&&p.surface!=='exterior')return null;
  var x=w.x+d.x,half=d.clearWidth/2+a.radius+.4,y=w.foundationY+b.groundFloorY;
  var z0=w.z+b.depth/2+b.wallThickness/2,z1=w.z+b.depth/2+2.4;
  function apron(n){return Math.abs(n.x-x)<=half&&n.z>=z0&&n.z<=z1&&Math.abs(n.y-y)<=.15}
  if(!apron(p))return null;
  var candidates=o.graph.nodes.filter(function(n){return n&&typeof n.id==='string'&&n.surface==='ground'&&[n.x,n.y,n.z].every(Number.isFinite)&&apron(n)&&Math.hypot(n.x-p.x,n.z-p.z)<=1.5});
  candidates.sort(function(a,b){var delta=Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z);return delta||(a.id<b.id?-1:a.id>b.id?1:0)});
  if(!candidates.length)return null;
  var n=candidates[0];return {id:n.id,x:n.x,y:n.y,z:n.z,surface:n.surface};
 }
 function selfTest(){
  var layout={building:{world:{x:66,z:99,foundationY:3},depth:10,wallThickness:.35,groundFloorY:0},avatar:{radius:.42},doors:[{id:'arrival',wall:'south',x:0,clearWidth:2}]};
  var graph={nodes:[{id:'ground:66,105',x:66.5,y:3,z:105.5,surface:'ground'}]},p={x:67.1514219,y:3,z:105.1140898};
  var tests=[resolve({point:p,layout:layout,graph:graph}).id==='ground:66,105',resolve({point:{x:66,y:5.8,z:105},layout:layout,graph:graph})===null,resolve({point:{x:66,y:3,z:105,surface:'stair'},layout:layout,graph:graph})===null,resolve({point:{x:66,y:3,z:103.9},layout:layout,graph:graph})===null,resolve({point:p,layout:layout,graph:{nodes:[]}})===null];
  if(tests.some(function(t){return !t}))throw Error('[HolmArrivalPorchTarget] acceptance failed');
  console.log('[HolmArrivalPorchTarget] '+tests.length+'/'+tests.length+' acceptance ok');
 }
 selfTest();return {resolve:resolve};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalPorchTarget;
