/* Draft arrival corridor facade. Source envelopes, not exported-mesh collision.
 * No scene, player, provider or persistence side effects. */
var HolmArrivalApproach=(function(){
 'use strict';
 var Nav=typeof module!=='undefined'&&module.exports?require('./holm_arrival_navigation'):HolmArrivalNavigation;
 var Terrain=typeof module!=='undefined'&&module.exports?require('./holm_overhaul_terrain'):HolmOverhaulTerrain;
 var EPS=1e-7;
 function need(ok,msg){if(!ok)throw Error('[HolmArrivalApproach] '+msg)}
 function create(layout,envelopes,bundle){
  var house=Nav.create(layout,envelopes),c=JSON.parse(JSON.stringify(layout)),b=JSON.parse(JSON.stringify(bundle));
  var a=c.approach,r=c.avatar.radius,w=c.building.world,blocks=JSON.parse(JSON.stringify(envelopes.blockers));
  need(a&&Number.isFinite(a.clearWidth)&&a.clearWidth>2*r&&Number.isFinite(a.maxSlope)&&a.maxSlope>0&&a.maxSlope<=.4,'invalid approach limits');
  need(Array.isArray(a.waypoints)&&a.waypoints.length>1,'missing approach waypoints');
  a.waypoints.forEach(function(p){need(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),'invalid waypoint')});
  Terrain.sample(b,0,0);
  need(b.heights.every(Number.isFinite)&&Array.isArray(b.water)&&b.water.length===b.width*b.depth&&b.water.every(function(v){return v===0||v===1||v===2}),'invalid terrain cells');
  var strips=[],half=a.clearWidth/2-r,seam=w.z+c.building.depth/2+2;
  for(var i=1;i<a.waypoints.length;i++){
   var p=a.waypoints[i-1],q=a.waypoints[i],run=Math.abs(p[0]-q[0])+Math.abs(p[2]-q[2]);
   need(run>0&&(p[0]===q[0]||p[2]===q[2])&&Math.abs(p[1]-q[1])/run<=a.maxSlope+EPS,'noncardinal or steep approach');
   strips.push({x0:Math.min(p[0],q[0])-half,x1:Math.max(p[0],q[0])+half,z0:Math.min(p[2],q[2])-half,z1:Math.max(p[2],q[2])+half});
  }
  function blocked(x,z){return blocks.some(function(q){return q.surface==='exterior'&&x>w.x+q.x0-r+EPS&&x<w.x+q.x1+r-EPS&&z>w.z+q.z0-r+EPS&&z<w.z+q.z1+r-EPS})}
  function terrainSupport(x,z){
   if(!Number.isFinite(x)||!Number.isFinite(z)||z<seam-EPS||!strips.some(function(q){return x>=q.x0-EPS&&x<=q.x1+EPS&&z>=q.z0-EPS&&z<=q.z1+EPS})||blocked(x,z))return null;
   if(x-r<0||z-r<0||x+r>=b.width||z+r>=b.depth)return null;
   // Whole square footprint is deliberately conservative relative to a capsule.
   for(var iz=Math.floor(z-r);iz<=Math.floor(z+r);iz++)for(var ix=Math.floor(x-r);ix<=Math.floor(x+r);ix++)if(b.water[iz*b.width+ix]!==0)return null;
   return {surface:'exterior',x:x,z:z,y:Terrain.sample(b,x,z)};
  }
  function support(surface,x,z,doors){
   if(surface==='exterior')return terrainSupport(x,z);
   var p=house.support(surface,x,z,doors);
   // Extend the existing ground apron by half a tile to the terrain join.
   // The authored slab reaches seam+0.4; retain the house's conservative lane.
   if(!p&&surface==='ground'&&z>w.z+c.building.depth/2+1.5&&z<=seam+EPS&&!blocked(x,z)){
    p=house.support('ground',x,w.z+c.building.depth/2+1.5,doors);
    if(p)p={surface:'ground',x:x,z:z,y:p.y};
   }
   return p;
  }
  function point(from,to,t,doors){
   if(!from||!to||!Number.isFinite(t)||t<0||t>1)return null;
   if(from.surface!=='exterior'&&to.surface!=='exterior')return house.point(from,to,t,doors);
   var x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t;
   return support(z>=seam?'exterior':'ground',x,z,doors);
  }
  function edge(from,to,doors){
   if(!from||!to)return null;
   if(from.surface!=='exterior'&&to.surface!=='exterior')return house.edge(from,to,doors);
   var dx=to.x-from.x,dz=to.z-from.z;
   if(Math.abs(Math.abs(dx)+Math.abs(dz)-1)>EPS||Math.abs(dx)>EPS&&Math.abs(dz)>EPS)return null;
   if(from.surface!==to.surface){
    if([from.surface,to.surface].indexOf('ground')<0||Math.abs(dx)>EPS||(from.z-seam)*(to.z-seam)>0)return null;
    var g=support('ground',from.x,seam,doors),e=support('exterior',from.x,seam,doors);
    if(!g||!e||Math.abs(g.y-e.y)>EPS)return null;
   }
   var samples=[];
   for(var i=0;i<=40;i++){
    var p=point(from,to,i/40,doors);if(!p)return null;
    if(samples.length&&Math.abs(p.y-samples[samples.length-1].y)>.025*a.maxSlope+EPS)return null;
    samples.push(p);
   }
   return samples;
  }
  function compile(doors){
   var graph=house.compile(doors),byKey={};graph.nodes.forEach(function(p){byKey[p.id]=p});
   var x0=Math.floor(Math.min.apply(null,strips.map(function(q){return q.x0}))),x1=Math.ceil(Math.max.apply(null,strips.map(function(q){return q.x1})));
   var z0=Math.floor(seam),z1=Math.ceil(Math.max.apply(null,strips.map(function(q){return q.z1})));
   for(var z=z0;z<=z1;z++)for(var x=x0;x<=x1;x++){
    var p=support('exterior',x+.5,z+.5,doors);if(!p)continue;
    p.id='exterior:'+x+','+z;graph.nodes.push(p);byKey[p.id]=p;graph.links[p.id]=[];
   }
   graph.nodes.forEach(function(p){[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){['exterior','ground'].forEach(function(surface){
    if(p.surface!=='exterior'&&surface!=='exterior')return;
    var id=surface+':'+Math.floor(p.x+d[0])+','+Math.floor(p.z+d[1]),q=byKey[id];
    if(q&&edge(p,q,doors))graph.links[p.id].push(id);
   })})});
   return graph;
  }
  return {compile:compile,route:house.route,point:point,support:support,edge:edge};
 }
 return {create:create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalApproach;
