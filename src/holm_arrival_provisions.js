/* Pure measured provision placement contract. No placement defaults, renderer,
 * file access, activation, item changes or visual/byte acceptance claims. */
var HolmArrivalProvisions=(function(){
 'use strict';
 var Dock=typeof module!=='undefined'&&module.exports?require('./holm_arrival_dock'):HolmArrivalDock;
 var PARTS=['ProvisionsRack','ProvisionHatchet','ProvisionNet','ProvisionTinderbox'],EPS=1e-6;
 function need(ok,message){if(!ok)throw Error('[HolmArrivalProvisions] '+message)}
 function copy(value){
  function check(v){
   need(v===null||['object','string','number','boolean'].indexOf(typeof v)>=0,'non-JSON input');
   if(typeof v==='number')need(Number.isFinite(v),'nonfinite input');
   if(v&&typeof v==='object')Object.keys(v).forEach(function(k){check(v[k])});
  }
  check(value);return JSON.parse(JSON.stringify(value));
 }
 function path(value,extension){
  need(typeof value==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(value)&&value.split('/').every(function(p){return p!=='.'&&p!=='..'})&&value.endsWith(extension),'invalid '+extension+' path');return value;
 }
 function overlap(a,b){return a.x0<b.x1-EPS&&a.x1>b.x0+EPS&&a.z0<b.z1-EPS&&a.z1>b.z0+EPS}
 function id(surface,x,z){return surface+':'+Math.floor(x)+','+Math.floor(z)}
 function compile(input){
  var i=copy(input),l=i.layout,e=i.envelopes,p=i.placement,m=i.manifest;
  need(l&&l.schema==='holm-overhaul-arrival-layout-v1'&&l.version===1&&l.building&&l.building.id==='guide','invalid layout');
  need(e&&e.schema==='holm-guide-house-collision-envelopes-v1'&&e.version===1&&Array.isArray(e.blockers),'invalid envelopes');
  need(p&&p.local&&p.interaction&&[p.local.x,p.local.z,p.interaction.x,p.interaction.z].every(Number.isFinite)&&p.local.rotation===0,'finite local placement and rotation 0 required');
  need(!l.building.rotation&&!l.building.world.rotation&&!i.dock.rotation,'unsupported house/dock rotation');
  need(m&&m.schema==='crafted-realms-local-prop-v1'&&m.id==='holm-provision-rack-v1'&&m.units==='tiles'&&m.coordinateSystem==='glTF X/Y-up/Z'&&m.origin==='floor centre','invalid provision manifest');
  need(JSON.stringify(m.frontDirection)==='[0,0,1]','unsupported manifest front direction');
  var bounds=m.localBounds,d=m.dimensions;
  need(bounds&&Array.isArray(bounds.min)&&Array.isArray(bounds.max)&&bounds.min.length===3&&bounds.max.length===3&&bounds.min.concat(bounds.max).every(Number.isFinite),'invalid measured localBounds');
  need(d&&[d.width,d.height,d.depth].every(function(n){return Number.isFinite(n)&&n>0}),'invalid measured dimensions');
  [d.width,d.height,d.depth].forEach(function(n,k){need(bounds.max[k]>bounds.min[k]&&Math.abs(bounds.max[k]-bounds.min[k]-n)<EPS,'dimensions disagree with measured bounds')});
  need(Math.abs(bounds.min[1])<EPS&&Math.abs(bounds.max[0]+bounds.min[0])<EPS&&Math.abs(bounds.max[2]+bounds.min[2])<EPS,'measured origin is not floor centre');
  [m.semanticInteractionMeshes,m.meshFamilies].forEach(function(parts){need(Array.isArray(parts)&&parts.length===PARTS.length&&parts.slice().sort().join(',')===PARTS.slice().sort().join(','),'invalid semantic part contract')});
  need(m.primaryInteractionMesh==='ProvisionsRack','invalid primary interaction mesh');
  need(Array.isArray(m.animationNames)&&m.animationNames.length===0,'unsupported moving provision asset');
  var b=l.building,w=b.world,s=l.stairs;
  need(Array.isArray(l.groundServices)&&Array.isArray(l.upperServices)&&!l.groundServices.some(function(q){return q.id==='provisions'})&&!e.blockers.some(function(q){return q.id==='provisions'}),'duplicate/missing service list');
  var blocker={id:'provisions',surface:'ground',x0:p.local.x+bounds.min[0],x1:p.local.x+bounds.max[0],z0:p.local.z+bounds.min[2],z1:p.local.z+bounds.max[2],source:'holm-provision-rack-v1 manifest.localBounds',note:'Measured model planar bounds; navigation applies avatar radius separately.'};
  var innerX=b.width/2-b.wallThickness/2,innerZ=b.depth/2-b.wallThickness/2;
  need(blocker.x0>=-innerX&&blocker.x1<=innerX&&blocker.z0>=-innerZ&&blocker.z1<=innerZ,'provision bounds outside house interior');
  need(b.groundFloorY+bounds.max[1]<=b.upperFloorY-b.upperFloorThickness+EPS,'provision asset exceeds ground ceiling');
  need(!e.blockers.some(function(q){return q.surface==='ground'&&overlap(blocker,q)}),'provision asset collides with existing furnishing');
  var stairReserved={x0:s.x-s.clearWidth/2-.175,x1:s.x+s.clearWidth/2+.175,z0:s.endZ,z1:s.startZ+.1};
  need(!overlap(blocker,stairReserved),'provision asset collides with stair/rail envelope');
  var ix=p.interaction.x,iz=p.interaction.z,r=l.avatar.radius;
  need(ix>=blocker.x0-r&&ix<=blocker.x1+r&&iz>=blocker.z1+r-EPS&&iz-blocker.z1<=2,'stance must face the provision front within interaction reach');
  var stance=id('ground',w.x+ix,w.z+iz);
  var service={id:'provisions',purpose:'Receive and recover the island teaching tools',x:p.local.x,z:p.local.z,y:b.groundFloorY,w:bounds.max[0]-bounds.min[0],d:bounds.max[2]-bounds.min[2],interaction:[ix,b.groundFloorY,iz]};
  l.groundServices.push(service);e.blockers.push(blocker);
  var nav=Dock.create(l,e,i.terrain,i.dock),doorStates={},routes=[];
  function existing(list,name,surface){var entries=list.filter(function(q){return q.id===name});need(entries.length===1&&Array.isArray(entries[0].interaction)&&entries[0].interaction.length===3,'missing service '+name);return id(surface,w.x+entries[0].interaction[0],w.z+entries[0].interaction[2])}
  var stops=[id('exterior',l.landing.x,l.landing.z),existing(l.groundServices,'chart','ground'),stance,existing(l.upperServices,'study','upper'),i.dock.destination];
  for(var mask=0;mask<4;mask++){
   var doors={arrival:!!(mask&1),garden:!!(mask&2)},key=(doors.arrival?'open':'closed')+'-'+(doors.garden?'open':'closed'),graph=nav.compile(doors),by={};
   graph.nodes.sort(function(a,b){return a.id<b.id?-1:a.id>b.id?1:0});
   graph.nodes.forEach(function(n){need(!by[n.id],'duplicate navigation node');by[n.id]=n});
   Object.keys(graph.links).forEach(function(from){graph.links[from].sort();graph.links[from].forEach(function(to){need(by[from]&&by[to]&&graph.links[to].indexOf(from)>=0&&nav.edge(by[from],by[to],doors),'unsupported/noncardinal navigation edge')})});
   need(by[stance]&&nav.support('ground',w.x+ix,w.z+iz,doors),'unsupported provision stance');
   doorStates[key]={doors:doors,graph:graph};
   if(doors.arrival){
    for(var k=0;k<stops.length-1;k++)[[stops[k],stops[k+1]],[stops[k+1],stops[k]]].forEach(function(pair){var route=nav.route(graph,pair[0],pair[1]);need(route&&route.length>1,'disconnected required provision route '+pair.join(' -> '));routes.push({doorState:key,from:pair[0],to:pair[1],nodeIds:route})});
   }else need(!nav.route(graph,stops[0],stance),'closed arrival leaks to provisions');
  }
  return {schema:'holm-arrival-provisions-contract-v1',version:1,layout:l,envelopes:e,service:{id:'holm_guide_hall.provisions',kind:'holm_provisions',objectId:'holm_provisions',surface:'ground',stanceNodeId:stance,interaction:service.interaction.slice(),local:copy(p.local),localBounds:copy(bounds),transform:{x:w.x+p.local.x,y:w.foundationY+b.groundFloorY,z:w.z+p.local.z,rotation:0,scale:1},model:path(p.model||m.modelFile,'.glb'),source:path(p.source||m.sourceFile,'.blend'),parts:PARTS.slice(),primaryInteractionMesh:m.primaryInteractionMesh},doorStates:doorStates,requiredRoutes:routes,evidence:{measuredBoundsDeclared:true,sourceBytesVerified:false,visualAcceptance:false,runtimeAcceptance:false}};
 }
 return {compile:compile,create:compile};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalProvisions;
