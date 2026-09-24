/* Isolated authored-house navigation. Explicit surface identity, never highest Y.
 * This module has no Player, scene, save, or live-provider side effects.
 */
var HolmArrivalNavigation=(function(){
 'use strict';
 var EPS=1e-7;
 function need(ok,msg){if(!ok)throw Error('[HolmArrivalNavigation] '+msg)}
 function inside(x,z,b,pad){return x>b.x0-pad+EPS&&x<b.x1+pad-EPS&&z>b.z0-pad+EPS&&z<b.z1+pad-EPS}
 function create(layout,envelopes){
  need(layout&&layout.schema==='holm-overhaul-arrival-layout-v1','invalid layout');
  var c=JSON.parse(JSON.stringify(layout)),b=c.building,s=c.stairs,r=c.avatar.radius;
  need([b.width,b.depth,b.wallThickness,b.groundFloorY,b.upperFloorY,b.world.x,b.world.z,b.world.foundationY,r,s.x,s.clearWidth,s.startZ,s.endZ,s.startY,s.endY,s.riserHeight,s.treads,s.treadRun].every(Number.isFinite),'nonfinite layout');
  need(b.width>0&&b.depth>0&&b.wallThickness>0&&s.riserHeight>0&&s.riserHeight<=.25,'invalid dimensions');
  need(Math.abs(s.startY-b.groundFloorY)<EPS&&Math.abs(s.endY-b.upperFloorY)<EPS&&Math.abs(s.treads*s.riserHeight-(s.endY-s.startY))<EPS,'disconnected stair heights');
  need(Array.isArray(c.doors)&&c.doors.length===2,'invalid doors');
  c.doors.forEach(function(d){need([d.x,d.z,d.clearWidth,d.clearHeight].every(Number.isFinite)&&d.clearWidth>2*r&&d.clearHeight>=c.avatar.height+c.avatar.headMargin,'invalid door clearance')});
  need(r>0&&s.axis==='z'&&s.direction===-1&&s.startZ>s.endZ&&s.clearWidth>2*r,'unsupported stairs');
  need(Number.isInteger(s.treads)&&s.treads>0&&Math.abs(s.treads*s.treadRun-(s.startZ-s.endZ))<EPS,'invalid treads');
  need(envelopes&&Array.isArray(envelopes.blockers),'missing collision envelopes');
  var blockers=JSON.parse(JSON.stringify(envelopes.blockers));
  // Authored rail projections extend beyond tread bounds. Include these before
  // testing the lower turn; checking the flight rectangle alone is insufficient.
  [s.x-s.clearWidth/2-.12,s.x+s.clearWidth/2+.12].forEach(function(x){blockers.push({surface:'ground',x0:x-.055,x1:x+.055,z0:s.endZ,z1:s.startZ+.1})});
  [s.x-s.clearWidth/2-.08,s.x+s.clearWidth/2+.08].forEach(function(x){blockers.push({surface:'upper',x0:x-.06,x1:x+.06,z0:s.endZ-.06,z1:s.startZ+.11})});
  blockers.push({surface:'upper',x0:s.x-s.clearWidth/2-.14,x1:s.x+s.clearWidth/2+.14,z0:s.startZ-.01,z1:s.startZ+.11});
  blockers.forEach(function(q){need(['x0','x1','z0','z1'].every(function(k){return Number.isFinite(q[k])})&&q.x0<q.x1&&q.z0<q.z1&&['ground','upper','exterior'].indexOf(q.surface)>=0,'invalid blocker')});
  var halfX=b.width/2,halfZ=b.depth/2,innerX=halfX-b.wallThickness/2,innerZ=halfZ-b.wallThickness/2;
  function lane(x){return Math.abs(x-s.x)+r<=s.clearWidth/2+EPS}
  function support(surface,wx,wz,doors){
   if(!Number.isFinite(wx)||!Number.isFinite(wz))return null;
   var x=wx-b.world.x,z=wz-b.world.z,y=null,external=Math.abs(z)>innerZ;
   if(surface==='stair'){
    if(!lane(x)||z>s.startZ+EPS||z<s.endZ-EPS)return null;
    y=s.startY+Math.min(s.treads,Math.max(1,Math.ceil((s.startZ-z-EPS)/s.treadRun)))*s.riserHeight;
   }else if(surface==='ground'||surface==='upper'){
    if(Math.abs(x)+r>innerX+EPS)return null;
    if(Math.abs(z)+r>innerZ+EPS){
     if(surface!=='ground')return null;
     var door=c.doors.find(function(d){return Math.sign(d.z)===Math.sign(z)&&Math.abs(x-d.x)+r<=d.clearWidth/2+EPS});
     if(!door||Math.abs(z)>halfZ+1.5+EPS)return null;
     if((!doors||doors[door.id]!==true)&&Math.abs(z-door.z)<=b.wallThickness/2+r)return null;
    }
    var hole={x0:s.x-s.clearWidth/2,x1:s.x+s.clearWidth/2,z0:s.endZ,z1:s.startZ};
    if(inside(x,z,hole,r)){
     // Only the aligned landing may overlap the longitudinal stair boundary.
     // Lateral well/rail crossings remain forbidden on both storeys.
     if(!(lane(x)&&((surface==='ground'&&z>=s.startZ)||(surface==='upper'&&z<=s.endZ))))return null;
    }
    y=surface==='upper'?b.upperFloorY:b.groundFloorY;
   }else return null;
   if(blockers.some(function(q){return (q.surface===surface||(q.surface==='exterior'&&surface==='ground'&&external))&&inside(x,z,q,r)}))return null;
   return {surface:surface,x:wx,z:wz,y:b.world.foundationY+y};
  }
  function point(from,to,t,doors){
   if(!Number.isFinite(t)||t<0||t>1)return null;
   var x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t,surface=from.surface;
   if(from.surface!==to.surface){var localZ=z-b.world.z;surface=localZ>s.startZ?'ground':localZ<s.endZ?'upper':'stair'}
   return support(surface,x,z,doors);
  }
  function edge(from,to,doors){
   var dx=to.x-from.x,dz=to.z-from.z;
   if(Math.abs(Math.abs(dx)+Math.abs(dz)-1)>EPS||Math.abs(dx)>EPS&&Math.abs(dz)>EPS)return null;
   var cross=from.surface!==to.surface;
   if(cross){
    var pair=[from.surface,to.surface];if(pair.indexOf('stair')<0||Math.abs(dx)>EPS)return null;
    var other=pair.find(function(k){return k!=='stair'}),boundary=b.world.z+(other==='ground'?s.startZ:s.endZ);
    if((from.z-boundary)*(to.z-boundary)>0)return null;
   }
   var samples=[];
   // Include every tread discontinuity, on both sides, in addition to dense
   // horizontal clearance samples. These are source-envelope checks, not BVH.
   var ts=[];for(var i=0;i<=20;i++)ts.push(i/20);
   if(Math.abs(dz)>EPS)for(i=0;i<=s.treads;i++){
    var t=(b.world.z+s.startZ-i*s.treadRun-from.z)/dz;
    if(t>0&&t<1)ts.push(Math.max(0,t-1e-6),t,Math.min(1,t+1e-6));
   }
   ts.sort(function(a,b){return a-b});
   for(i=0;i<ts.length;i++){
    var p=point(from,to,ts[i],doors);if(!p)return null;
    if(samples.length&&Math.abs(p.y-samples[samples.length-1].y)>s.riserHeight+EPS)return null;
    samples.push(p);
   }
   return samples;
  }
  function compile(doors){
   var nodes=[],byKey={},links={},surfaces=['ground','upper','stair'];
   for(var z=Math.floor(b.world.z-halfZ-1);z<=Math.floor(b.world.z+halfZ+1);z++)for(var x=Math.floor(b.world.x-halfX);x<Math.ceil(b.world.x+halfX);x++)surfaces.forEach(function(surface){
    var p=support(surface,x+.5,z+.5,doors);if(!p)return;
    p.id=surface+':'+x+','+z;nodes.push(p);byKey[p.id]=p;links[p.id]=[];
   });
   nodes.forEach(function(p){[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){surfaces.forEach(function(surface){
    var id=surface+':'+Math.floor(p.x+d[0])+','+Math.floor(p.z+d[1]),q=byKey[id];
    if(q&&edge(p,q,doors))links[p.id].push(q.id);
   })})});
   return {schema:'holm-arrival-graph-v1',version:1,nodes:nodes,links:links};
  }
  function route(graph,start,goal){
   if(!graph.links[start]||!graph.links[goal])return null;
   var queue=[start],prev={};prev[start]=null;
   for(var i=0;i<queue.length;i++){var id=queue[i];if(id===goal){var path=[];while(id!==null){path.push(id);id=prev[id]}return path.reverse()}
    graph.links[id].forEach(function(next){if(!Object.prototype.hasOwnProperty.call(prev,next)){prev[next]=id;queue.push(next)}});
   }return null;
  }
  return {support:support,point:point,edge:edge,compile:compile,route:route};
 }
 return {create:create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalNavigation;
