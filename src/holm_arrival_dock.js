/* Isolated authored deck navigation. No live provider or ferry state changes. */
var HolmArrivalDock=(function(){
 'use strict';
 var Approach=typeof module!=='undefined'&&module.exports?require('./holm_arrival_approach'):HolmArrivalApproach,EPS=1e-7;
 function create(layout,envelopes,terrain,source){
  var base=Approach.create(layout,envelopes,terrain),d=JSON.parse(JSON.stringify(source)),r=layout.avatar.radius;
  function need(ok,message){if(!ok)throw Error('[HolmArrivalDock] '+message)}
  need(d.schema==='holm-arrival-dock-study-v1','unknown schema');
  var w=d.world,s=d.support;
  need(w&&s&&[w.x,w.y,w.z,s.x0,s.x1,s.z0,s.z1,d.entranceZ].every(Number.isFinite),'invalid deck data');
  need(s.x1-s.x0>2*r&&s.z1-s.z0>2*r&&Math.abs(w.z+s.z0-d.entranceZ)<EPS,'invalid deck entrance or clearance');
  function support(surface,x,z,doors){
   if(surface!=='dock')return base.support(surface,x,z,doors);
   if(!Number.isFinite(x)||!Number.isFinite(z)||x-r<w.x+s.x0-EPS||x+r>w.x+s.x1+EPS||z<d.entranceZ-EPS||z+r>w.z+s.z1+EPS)return null;
   if(z-r<d.entranceZ){var shore=base.support('exterior',x,z-r,doors);if(!shore||Math.abs(shore.y-w.y)>EPS)return null;}
   return {surface:'dock',x:x,z:z,y:w.y};
  }
  function point(a,b,t,doors){
   if(!a||!b||!Number.isFinite(t)||t<0||t>1)return null;
   if(a.surface!=='dock'&&b.surface!=='dock')return base.point(a,b,t,doors);
   var x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   return support(z>=d.entranceZ?'dock':'exterior',x,z,doors);
  }
  function edge(a,b,doors){
   if(!a||!b)return null;
   if(a.surface!=='dock'&&b.surface!=='dock')return base.edge(a,b,doors);
   var dx=b.x-a.x,dz=b.z-a.z;
   if(Math.abs(Math.abs(dx)+Math.abs(dz)-1)>EPS||Math.abs(dx)>EPS&&Math.abs(dz)>EPS)return null;
   if(a.surface!==b.surface){
    if([a.surface,b.surface].indexOf('exterior')<0||Math.abs(dx)>EPS||(a.z-d.entranceZ)*(b.z-d.entranceZ)>0)return null;
    var land=base.support('exterior',a.x,d.entranceZ,doors),deck=support('dock',a.x,d.entranceZ,doors);
    // A flat deck cannot silently bridge a raised/lowered shore or a wet entrance.
    if(!land||!deck||Math.abs(land.y-deck.y)>EPS)return null;
   }
   var samples=[];
   for(var i=0;i<=40;i++){
    var p=point(a,b,i/40,doors);if(!p)return null;
    if(samples.length&&Math.abs(p.y-samples[samples.length-1].y)>.01+EPS)return null;
    samples.push(p);
   }
   return samples;
  }
  function compile(doors){
   var graph=base.compile(doors),byId={};graph.nodes.forEach(function(p){byId[p.id]=p});
   for(var z=Math.floor(d.entranceZ);z<=Math.ceil(w.z+s.z1);z++)for(var x=Math.floor(w.x+s.x0);x<=Math.ceil(w.x+s.x1);x++){
    var p=support('dock',x+.5,z+.5,doors);if(!p)continue;
    p.id='dock:'+x+','+z;graph.nodes.push(p);byId[p.id]=p;graph.links[p.id]=[];
   }
   graph.nodes.forEach(function(p){[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v){['dock','exterior'].forEach(function(surface){
    if(p.surface!=='dock'&&surface!=='dock')return;
    var q=byId[surface+':'+Math.floor(p.x+v[0])+','+Math.floor(p.z+v[1])];
    if(q&&edge(p,q,doors))graph.links[p.id].push(q.id);
   })})});
   return graph;
  }
  return {compile:compile,route:base.route,support:support,point:point,edge:edge};
 }
 return {create:create};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalDock;
