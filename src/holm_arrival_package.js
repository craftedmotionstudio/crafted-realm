/* Pure arrival integration package. Hash strings are declarations, not byte verification.
 * Safe Publish must verify each file and recompile before consuming this output.
 * No provider registration, scene, Player, Tutorial or persistence side effects. */
var HolmArrivalPackage=(function(){
 'use strict';
 var node=typeof module!=='undefined'&&module.exports;
 var Dock=node?require('./holm_arrival_dock'):HolmArrivalDock;
 var Terrain=node?require('./holm_overhaul_terrain'):HolmOverhaulTerrain;
 var Chunks=node?require('./holm_overhaul_chunks'):HolmOverhaulChunks;
 function need(ok,msg){if(!ok)throw Error('[HolmArrivalPackage] '+msg)}
 function canonical(v){
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+canonical(v[k])}).join(',')+'}';
 }
 function json(v){
  need(v!==undefined,'missing JSON input');
  function check(x){
   need(x===null||['string','number','boolean','object'].indexOf(typeof x)>=0,'non-JSON value');
   if(typeof x==='number')need(Number.isFinite(x),'nonfinite JSON number');
   if(x&&typeof x==='object'){need(Array.isArray(x)||Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null,'non-JSON object');Object.keys(x).forEach(function(k){check(x[k])})}
  }
  check(v);return JSON.parse(canonical(v));
 }
 function descriptor(d){
  need(d&&typeof d.path==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(d.path)&&d.path.split('/').every(function(p){return p!=='.'&&p!=='..'}),'invalid contained source path');
  need(typeof d.sha256==='string'&&/^[0-9a-f]{64}$/.test(d.sha256),'invalid SHA256 declaration');
  return {path:d.path,sha256:d.sha256};
 }
 function compile(input){
  var i=json(input),p=i.provider,l=i.layout,provisions=null,extended=!!i.provisionsPlacement,scenic=!!i.landscapePlacement,scenery=null;
  var expectedKeys=(extended?"assets,dock,envelopes,layout,provider,provisionsManifest,provisionsPlacement,sources,terrain,terrainSource":"assets,dock,envelopes,layout,provider,sources,terrain,terrainSource").split(",");
  if(scenic){need(extended,"scenery requires the provision package");expectedKeys.push("landscapePlacement","landscapeMeasurement")}
  need(Object.keys(i).sort().join(',')===expectedKeys.sort().join(','),'unknown/missing package input');
  if(extended){
   var ProvisionCompiler=node?require('./holm_arrival_provisions'):HolmArrivalProvisions;
   provisions=ProvisionCompiler.compile({layout:l,envelopes:i.envelopes,terrain:i.terrain,dock:i.dock,placement:i.provisionsPlacement,manifest:i.provisionsManifest});
   l=provisions.layout;i.envelopes=provisions.envelopes;
  }
  if(scenic){
   var Scenery=node?require('./holm_arrival_scenery'):HolmArrivalScenery;
   scenery=Scenery.compile({layout:l,envelopes:i.envelopes,terrain:i.terrain,placement:i.landscapePlacement,measurement:i.landscapeMeasurement});i.envelopes=scenery.envelopes;
  }
  need(p&&p.id==='tutors-holm-v2'&&Number.isInteger(p.worldRevision)&&p.worldRevision>0,'explicit provider revision required');
  need(l&&l.schema==='holm-overhaul-arrival-layout-v1'&&l.version===1&&l.building.id==='guide','invalid layout owner/schema');
  need(i.envelopes&&i.envelopes.schema==='holm-guide-house-collision-envelopes-v1'&&i.envelopes.version===1,'invalid envelope schema');
  need(l.avatar.height>0&&l.avatar.radius>0&&l.avatar.headMargin>=0&&l.stairs.headClearance>=l.avatar.height+l.avatar.headMargin-1e-7,'invalid actor clearance');
  need(!l.building.rotation&&!l.building.world.rotation&&!i.dock.rotation,'unsupported navigation transform');
  need(canonical(Terrain.compile(i.terrainSource))===canonical(i.terrain),'terrain source/bundle mismatch');
  var chunkData=Chunks.compile(i.terrain),sources=[],seen={};
  function add(d){d=descriptor(d);need(!seen[d.path]||seen[d.path]===d.sha256,'conflicting source hashes');if(!seen[d.path])sources.push(d);seen[d.path]=d.sha256;return d}
  var required=['terrainSource','terrain','layout','envelopes','dock'].concat(extended?['provisionsPlacement','provisionsManifest']:[]).concat(scenic?['landscapePlacement','landscapeMeasurement']:[]);
  need(i.sources&&Object.keys(i.sources).length===required.length,'source roles must match input documents');
  required.forEach(function(k){add(i.sources[k])});
  need(new Set(required.map(function(k){return i.sources[k].path})).size===required.length,'source roles require distinct paths');
  need(Array.isArray(i.assets)&&i.assets.length===(scenic?3+Object.keys(scenery.partsByAsset).length:extended?3:2),'arrival assets must match source roles');
  var assetMap={};
  var partContract={guide:['GroundFloor','UpperFloor','StairFlight','GroundFurnishing','DoorNorthHinge','DoorSouthHinge','DoorNorthLeaf','DoorSouthLeaf'],dock:['DockDeck']};
  if(extended)partContract.provisions=provisions.service.parts;
  if(scenic)Object.keys(scenery.partsByAsset).forEach(function(k){partContract[k]=scenery.partsByAsset[k]});
  i.assets.forEach(function(a){
   need(a&&partContract[a.id]&&!assetMap[a.id]&&a.ownerId===(({guide:'holm_guide_hall',dock:'holm_arrival_dock',provisions:'holm_provisions'})[a.id]||(scenic?'holm_landscape_'+a.id:null)),'unknown/duplicate asset or owner');
   need(Array.isArray(a.parts)&&canonical(a.parts.slice().sort())===canonical(partContract[a.id].slice().sort()),'unknown/missing semantic part');
   var model=add(a.model),authoring=add(a.authoring);
   need(/\.glb$/.test(model.path)&&/\.blend$/.test(authoring.path),'asset must bind GLB and Blender source');
   assetMap[a.id]={id:a.id,ownerId:a.ownerId,model:model,authoring:authoring,parts:a.parts.slice().sort()};
  });
  [['groundServices','chart','ground'],['groundServices','shared_table','ground'],['upperServices','study','upper']].forEach(function(pair){
   var s=l[pair[0]].filter(function(v){return v.id===pair[1]}),q=i.envelopes.blockers.filter(function(v){return v.id===pair[1]});
   need(s.length===1&&q.length===1,'missing/duplicate service envelope');s=s[0];q=q[0];
   need(q.surface===pair[2]&&Math.abs(q.x0-(s.x-s.w/2))<1e-7&&Math.abs(q.x1-(s.x+s.w/2))<1e-7&&Math.abs(q.z0-(s.z-s.d/2))<1e-7&&Math.abs(q.z1-(s.z+s.d/2))<1e-7,'layout/envelope mismatch '+pair[1]);
  });
  need(assetMap.dock.model.path===i.dock.model,'dock model/source mismatch');
  if(extended)need(assetMap.provisions.model.path===provisions.service.model&&assetMap.provisions.authoring.path===provisions.service.source,'provisions asset/source mismatch');
  if(scenic)Object.keys(scenery.partsByAsset).forEach(function(k){var m=i.landscapeMeasurement.assets[k];need(assetMap[k].model.path===m.file&&assetMap[k].model.sha256===m.sha256,'landscape measured model mismatch '+k)});
  var nav=Dock.create(l,i.envelopes,i.terrain,i.dock),states={},open,closed;
  var doors=l.doors.map(function(d){return d.id}).sort();
  need(doors.join(',')==='arrival,garden','unknown door identities');
  for(var mask=0;mask<4;mask++){
   var ds={arrival:!!(mask&1),garden:!!(mask&2)},key=(ds.arrival?'open':'closed')+'-'+(ds.garden?'open':'closed');
   var graph=nav.compile(ds),by={};graph.nodes.forEach(function(n){need(!by[n.id],'duplicate node');by[n.id]=n});
   graph.nodes.sort(function(a,b){return a.id.localeCompare(b.id,'en')});
   Object.keys(graph.links).forEach(function(id){graph.links[id].sort();graph.links[id].forEach(function(to){need(by[to]&&graph.links[to].indexOf(id)>=0&&nav.edge(by[id],by[to],ds),'invalid nonreciprocal/cardinal edge')})});
   states[key]={doors:ds,graph:graph};
   if(mask===3)open=graph;if(mask===0)closed=graph;
  }
  function nodeId(surface,x,z){return surface+':'+Math.floor(x)+','+Math.floor(z)}
  var spawn=nodeId('exterior',l.landing.x,l.landing.z),b=l.building.world;
  function service(list,id,surface){
   var rows=list.filter(function(s){return s.id===id});need(rows.length===1,'missing/duplicate service '+id);
   var s=rows[0];need(Array.isArray(s.interaction)&&s.interaction.length===3&&s.interaction.every(Number.isFinite),'invalid service stance');
   need(s.interaction[1]===(surface==='ground'?l.building.groundFloorY:l.building.upperFloorY),'service floor mismatch');
   var idn=nodeId(surface,b.x+s.interaction[0],b.z+s.interaction[2]);need(open.links[idn],'unreachable service stance '+id);
   return {source:s,nodeId:idn};
  }
  var chart=service(l.groundServices,'chart','ground'),study=service(l.upperServices,'study','upper'),dock=i.dock.destination;
  var routes=[];
  [chart.nodeId,study.nodeId,dock].concat(extended?[provisions.service.stanceNodeId]:[]).forEach(function(target){[[spawn,target],[target,spawn]].forEach(function(pair){var route=nav.route(open,pair[0],pair[1]);need(route&&route.length>1,'disconnected required route '+pair.join(' -> '));routes.push({from:pair[0],to:pair[1],nodeIds:route})})});
  need(!nav.route(closed,spawn,chart.nodeId),'closed arrival door leaks');
  var north=l.doors.filter(function(d){return d.id==='garden'})[0],northId=nodeId('ground',b.x+north.outside[0],b.z+north.outside[2]);
  need(open.links[northId]&&nav.route(open,chart.nodeId,northId)&&!nav.route(closed,chart.nodeId,northId),'north door topology mismatch');
  var portals=[];open.nodes.forEach(function(n){open.links[n.id].forEach(function(to){if(n.id<to&&to.split(':')[0]!==n.surface)portals.push({from:n.id,to:to,bidirectional:true})})});
  var occupied={};
  function bounds(x0,z0,x1,z1){
   need(x0>=0&&z0>=0&&x1<=i.terrain.width&&z1<=i.terrain.depth,'owner footprint outside terrain');
   for(var z=Math.floor(z0/8);z<=Math.min(15,Math.floor(z1/8));z++)for(var x=Math.floor(x0/8);x<=Math.min(17,Math.floor(x1/8));x++)occupied[x+','+z]=true;
  }
  open.nodes.forEach(function(n){bounds(n.x-l.avatar.radius,n.z-l.avatar.radius,n.x+l.avatar.radius,n.z+l.avatar.radius)});
  bounds(b.x-l.building.width/2,b.z-l.building.depth/2,b.x+l.building.width/2,b.z+l.building.depth/2);
  i.envelopes.blockers.forEach(function(q){bounds(b.x+q.x0,b.z+q.z0,b.x+q.x1,b.z+q.z1)});
  bounds(i.dock.world.x-i.dock.width/2,i.dock.world.z-i.dock.depth/2,i.dock.world.x+i.dock.width/2,i.dock.world.z+i.dock.depth/2);
  sources.sort(function(a,b){return a.path<b.path?-1:a.path>b.path?1:0});
  var result=json({schema:'crafted-realm-holm-arrival-package-v1',version:1,provider:p,sources:sources,
   terrain:{sourcePath:i.sources.terrainSource.path,bundlePath:i.sources.terrain.path,chunks:chunkData.chunks},
   objects:[{id:'holm_guide_hall',asset:assetMap.guide,transform:{x:b.x,y:b.foundationY,z:b.z,rotation:0,scale:1}},
    {id:'holm_arrival_dock',asset:assetMap.dock,transform:{x:i.dock.world.x,y:i.dock.world.y,z:i.dock.world.z,rotation:0,scale:1}}].concat(extended?[{id:'holm_provisions',asset:assetMap.provisions,transform:provisions.service.transform}]:[]).concat(scenic?scenery.placements.map(function(row){return {id:row.id,asset:assetMap[row.asset],transform:row.transform}}):[]),
   navigation:{ownerId:'holm_arrival',graphRevision:'arrival-v1:'+p.worldRevision+':'+canonical(sources),actor:l.avatar,
    surfaces:{ground:{floorY:l.building.groundFloorY,foundationY:b.foundationY},upper:{floorY:l.building.upperFloorY,foundationY:b.foundationY},stair:l.stairs,exterior:l.approach,dock:{world:i.dock.world,support:i.dock.support}},
    doorStates:states,doors:[{id:'arrival',hingePart:'DoorSouthHinge',leafPart:'DoorSouthLeaf'},{id:'garden',hingePart:'DoorNorthHinge',leafPart:'DoorNorthLeaf'}],portals:portals,requiredRoutes:routes,requiredChunkIds:Object.keys(occupied).sort(),
    interactions:[{id:'holm_guide_hall.orientation',kind:'holm_orientation',objectId:'holm_guide_hall',surface:'ground',stanceNodeIds:[chart.nodeId],renderPart:'GroundFurnishing',proxyRequired:true,localBounds:{x:chart.source.x,y:chart.source.y,z:chart.source.z,width:chart.source.w,depth:chart.source.d}}].concat(extended?[{id:provisions.service.id,kind:'holm_provisions',objectId:'holm_provisions',surface:'ground',stanceNodeIds:[provisions.service.stanceNodeId],renderPart:'ProvisionsRack',proxyRequired:false}]:[])},
   spawn:{landmark:'holm_arrival',surface:'exterior',nodeId:spawn},lessonBindings:{study_route:'holm_guide_hall.orientation'},
   boundary:{northExit:{nodeId:northId,nextDistrictConnection:null},readyForWholeProviderReplacement:false,
    missing:['north-district-connection','skiff-and-dressing-package','real-player-runtime-adapter','visual-and-performance-acceptance'],collisionEvidence:'source-envelopes-only',sourceBytesVerified:false,assetPartsVerified:false}});
  if(scenic){
   var previous=json(input);delete previous.landscapePlacement;delete previous.landscapeMeasurement;delete previous.sources.landscapePlacement;delete previous.sources.landscapeMeasurement;
   previous.assets=previous.assets.filter(function(a){return ['guide','dock','provisions'].indexOf(a.id)>=0});
   result.navigation.compatibleGraphRevisions=[compile(previous).navigation.graphRevision];
  }
  return result;
 }
 return {compile:compile};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HolmArrivalPackage;
