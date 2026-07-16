#!/usr/bin/env node
/* Crafted Realm — world-v2 contract lock (headless, zero dependencies). */
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
let failures=0;
function check(name,cond){
  if(cond) console.log('  ok  '+name);
  else { failures++; console.error('  FAIL '+name); }
}
function readGlbJson(file){
  const buf=fs.readFileSync(file);
  if(buf.readUInt32LE(0)!==0x46546c67||buf.readUInt32LE(4)!==2) throw new Error('invalid GLB header');
  let offset=12;
  while(offset+8<=buf.length){
    const length=buf.readUInt32LE(offset),type=buf.readUInt32LE(offset+4); offset+=8;
    if(type===0x4e4f534a) return {bytes:buf.length,json:JSON.parse(buf.subarray(offset,offset+length).toString('utf8').trim())};
    offset+=length;
  }
  throw new Error('GLB JSON chunk missing');
}
const ctx={console,Map,Set,Array,Object,Math,Number,String,Date,JSON,isFinite,
  performance:{now:(()=>{let t=0;return()=>++t;})()},
  CHUNK:8,
  ZONES:{holm:{pos:[158,141]}},
  HOLM_POND:{x:164,z:149},
  CRWorldMode:{legacy:false,provider:null,attachProvider(p){this.provider=p;this.initialRect=p.getWorldRect();}}
};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_contract.js'),'utf8'),ctx,{filename:'world_v2_contract.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','holm_landscape_data.js'),'utf8'),ctx,{filename:'holm_landscape_data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_building_data.js'),'utf8'),ctx,{filename:'world_v2_building_data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_authoring.js'),'utf8'),ctx,{filename:'world_v2_authoring.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','holm_tutorial_flow_data.js'),'utf8'),ctx,{filename:'holm_tutorial_flow_data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_holm.js'),'utf8'),ctx,{filename:'world_v2_holm.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_mainland.js'),'utf8'),ctx,{filename:'world_v2_mainland.js'});

const W=ctx.WorldV2, p=W.active;
console.log('world_v2_contract.js:');
check('contract version 1',W.CONTRACT_VERSION===1);
check('8x8 chunk law',W.CHUNK_SIZE===8);
check('Holm provider active',p&&p.id==='tutors-holm-v2'&&ctx.CRWorldMode.provider===p);
check('world revision 4 migration boundary',p&&p.worldRevision===4);
check('112x96 authored bounds',p&&p.getWorldRect().w===112&&p.getWorldRect().h===96);
check('catalog covers 195 edge chunks',p&&p.snapshot().catalogChunks===195);
check('provider validates',p&&p.validate().ok);
const authoredCatalog=p.catalogChunks();
check('authored object and interaction row totals match the purposeful Holm contract',
  authoredCatalog.reduce((n,ch)=>n+ch.layers.objects.length,0)===ctx.HolmLandscape.objectPlacements.length+5&&
  authoredCatalog.reduce((n,ch)=>n+ch.layers.interactions.length,0)===36);
check('landscape contract validates',p&&p.landscape&&p.landscape.planId==='tutors-holm-landscape-v1');
check('landscape acceptance locks 228-tile spine from the Guide Hall apron to the ferry',ctx.HolmLandscape.acceptanceResult.routeTiles===228);
check('six districts and eight functional pads',p.landscape.districts.length===6&&p.landscape.pads.length===8);
check('complete-building contracts pass every lock',ctx.WorldV2BuildingData.acceptance().ok&&
  ctx.WorldV2BuildingData.acceptance().checks.length===30);
const authoring=ctx.WorldV2Authoring;
const authoringAcceptance=authoring.acceptance();
check('world-v2 authoring module passes every pure-data acceptance lock',authoringAcceptance.ok&&authoringAcceptance.checks.length>=14);
const authoringDoc=authoring.addBuilding(authoring.createDocument('studio-guide-hall',1),'holm_guide_hall_v1',
  {id:'studio-guide-hall',x:151,z:155,rot:0});
const authoredChunk=authoring.toChunkRows(authoringDoc)[0];
const authoredRuntimeChunk={v:1,id:authoredChunk.id,cx:authoredChunk.cx,cz:authoredChunk.cz,
  layers:{terrain:{},tileFlags:[],objects:authoredChunk.objects,interactions:[],mutations:[],spawns:[]}};
check('authored Guide Hall row is accepted by the current world-v2 runtime contract',
  W.validateChunk(authoredRuntimeChunk)===authoredRuntimeChunk&&authoredChunk.id==='18,19');
const movedAuthoring=authoring.moveBuilding(authoringDoc,'studio-guide-hall',{x:160,z:155,rot:0});
check('authoring move changes only owner chunk while preserving caller input and stable identity',
  authoring.toChunkRows(movedAuthoring)[0].id==='20,19'&&authoring.toChunkRows(authoringDoc)[0].id==='18,19'&&
  movedAuthoring.placements[0].id===authoringDoc.placements[0].id&&
  movedAuthoring.placements[0].definitionRevision===authoringDoc.placements[0].definitionRevision&&
  movedAuthoring.placements[0].asset===authoringDoc.placements[0].asset);
const hallManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','manifests','holm_guide_hall_v6.json'),'utf8'));
const hallPipeline=JSON.parse(fs.readFileSync(path.join(ROOT,hallManifest.pipelineResult),'utf8'));
const hallGlb=readGlbJson(path.join(ROOT,hallManifest.model));
const hallNodeNames=new Set((hallGlb.json.nodes||[]).map(n=>n.name));
check('Guide Hall production GLB carries every runtime semantic node',
  ['roof','front_door','teaching_door','orientation_table','lesson_register','first_landing_plaque','provision_rack']
    .every(name=>hallNodeNames.has(name)));
check('Guide Hall one-command asset pipeline passes every authoring and GLB lock',hallPipeline.passed&&
  Object.values(hallPipeline.authoringChecks).every(Boolean));
check('Guide Hall production GLB stays below its manifest transfer lock',hallGlb.bytes<=hallManifest.budgets.maxFileBytes);
check('Guide Hall production GLB stays within semantic-safe render locks',
  (hallGlb.json.meshes||[]).reduce((n,m)=>n+(m.primitives||[]).length,0)<=hallManifest.budgets.maxPrimitives&&
  (hallGlb.json.materials||[]).length<=hallManifest.budgets.maxMaterials);
const workyardManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','manifests','holm_survival_workyard_v2.json'),'utf8'));
const workyardPipeline=JSON.parse(fs.readFileSync(path.join(ROOT,workyardManifest.pipelineResult),'utf8'));
const workyardGlb=readGlbJson(path.join(ROOT,workyardManifest.model));
const workyardNodeNames=new Set((workyardGlb.json.nodes||[]).map(n=>n.name));
check('Survival Workyard production GLB carries every runtime semantic node',
  workyardManifest.requiredNodes.every(name=>workyardNodeNames.has(name)));
check('Survival Workyard one-command asset pipeline passes every lock',workyardPipeline.passed&&
  Object.values(workyardPipeline.authoringChecks).every(Boolean)&&
  workyardPipeline.cardinalProofs.length===3&&workyardPipeline.cardinalProofs.every(row=>row.passed));
check('Survival Workyard production GLB stays within all manifest render locks',
  workyardGlb.bytes<=workyardManifest.budgets.maxFileBytes&&
  (workyardGlb.json.meshes||[]).reduce((n,m)=>n+(m.primitives||[]).length,0)<=workyardManifest.budgets.maxPrimitives&&
  (workyardGlb.json.materials||[]).length<=workyardManifest.budgets.maxMaterials);
const cellarManifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','manifests','holm_survival_workyard_cellar_v2.json'),'utf8'));
const cellarPipeline=JSON.parse(fs.readFileSync(path.join(ROOT,cellarManifest.pipelineResult),'utf8'));
const cellarGlb=readGlbJson(path.join(ROOT,cellarManifest.model));
const cellarNodeNames=new Set((cellarGlb.json.nodes||[]).map(n=>n.name));
check('Storm cellar GLB carries every climb, reserve, and flame socket',
  cellarManifest.requiredNodes.every(name=>cellarNodeNames.has(name))&&cellarPipeline.passed);
const hallDef=ctx.WorldV2BuildingData.get('holm_guide_hall_v1');
function hallBlocked(x,z,pad=0.42){
  return hallDef.colliders.some(c=>{
    if(c.type==='circle') return (x-c.x)**2+(z-c.z)**2<(c.r+pad)**2;
    let dx=x-c.x,dz=z-c.z;
    if(c.type==='obox'){
      const co=Math.cos(c.rot||0),si=Math.sin(c.rot||0);
      [dx,dz]=[dx*co+dz*si,-dx*si+dz*co];
    }
    return Math.abs(dx)<c.hw+pad&&Math.abs(dz)<c.hd+pad;
  });
}
function hallCardinalRoute(){
  const start=[0.5,13.5],goal=[0.5,-13.5],queue=[[...start,0]],seen=new Set([start.join(',')]);
  while(queue.length){
    const [x,z,n]=queue.shift(); if(x===goal[0]&&z===goal[1]) return n;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=nx+','+nz;
      if(nx<-14||nx>14||nz<-14||nz>14||seen.has(key)||hallBlocked(nx,nz)) continue;
      seen.add(key); queue.push([nx,nz,n+1]);
    }
  }
  return Infinity;
}
check('Guide Hall cardinal route passes through both authored door gaps',hallCardinalRoute()<=32);
const workyardDef=ctx.WorldV2BuildingData.get('holm_survival_workyard_v1');
function workyardBlocked(x,z,pad=0.42){
  return workyardDef.colliders.some(c=>{
    if(c.type==='circle') return (x-c.x)**2+(z-c.z)**2<(c.r+pad)**2;
    let dx=x-c.x,dz=z-c.z;
    if(c.type==='obox'){
      const co=Math.cos(c.rot||0),si=Math.sin(c.rot||0);
      [dx,dz]=[dx*co+dz*si,-dx*si+dz*co];
    }
    return Math.abs(dx)<c.hw+pad&&Math.abs(dz)<c.hd+pad;
  });
}
function workyardCardinalRoute(){
  const start=[-2.5,7.5],goal=[9.5,-1.5],queue=[[...start,0]],seen=new Set([start.join(',')]);
  while(queue.length){
    const [x,z,n]=queue.shift(); if(x===goal[0]&&z===goal[1]) return n;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=nx+','+nz;
      if(nx<-11||nx>11||nz<-8||nz>8||seen.has(key)||workyardBlocked(nx,nz)) continue;
      seen.add(key); queue.push([nx,nz,n+1]);
    }
  }
  return Infinity;
}
check('Survival Workyard cardinal route passes from trail door to pond door',workyardCardinalRoute()<=32);
const trailOutside=workyardDef.doors.find(d=>d.id==='trail_door').entry.outside;
const pondOutside=workyardDef.doors.find(d=>d.id==='pond_door').entry.outside;
check('Survival Workyard trail entrance intentionally meets the pond-loop path',
  ctx.HolmLandscape.pathDistance(workyardDef.placement.x+trailOutside[0],workyardDef.placement.z+trailOutside[1])<=0.5);
check('Survival Workyard pond exit lands on dry shore rather than in the pond',
  ctx.HolmLandscape.heightAt(workyardDef.placement.x+pondOutside[0],workyardDef.placement.z+pondOutside[1])>-1.2&&
  !ctx.HolmLandscape.inPond(workyardDef.placement.x+pondOutside[0],workyardDef.placement.z+pondOutside[1]));
check('tutorial flow locks ten stations and the release curriculum',ctx.HolmTutorialFlow.acceptanceResult.stations===10&&
  ctx.HolmTutorialFlow.acceptanceResult.releaseLessons===16&&ctx.HolmTutorialFlow.acceptanceResult.runtimeLessons===11);
const sample=p&&p.getChunkAtWorldTile(158,141);
check('spawn resolves to a chunk',!!sample);
check('all runtime layers present',sample&&W.LAYER_NAMES.every(n=>n in sample.layers));
check('terrain is data, sparse layers are arrays',sample&&sample.layers.terrain.heightSource==='holm_landscape_v1'&&
  ['tileFlags','objects','interactions','mutations','spawns'].every(n=>Array.isArray(sample.layers[n])));
check('terrain carries semantic landscape roles',p.catalogChunks().some(c=>c.layers.terrain.roles.some(r=>r.kind==='district')));
const catalog=p.catalogChunks();
const authored=catalog.reduce((n,c)=>n+c.layers.objects.length,0);
const interactions=catalog.reduce((n,c)=>n+c.layers.interactions.length,0);
check('landscape blockout placements are fully catalogued',authored===ctx.HolmLandscape.objectPlacements.length+5);
check('placement and interaction layers stay separate',interactions===36);
const hallChunk=p.getChunkAtWorldTile(151,155);
const hall=hallChunk.layers.objects.find(o=>o.id==='holm_guide_hall');
check('Guide Hall replaces its planning foundation',!!hall&&hall.buildingDef==='holm_guide_hall_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_guide_hall')));
check('Guide Hall owns six semantic part interactions',hallChunk.layers.interactions.filter(i=>i.objectId==='holm_guide_hall').length===6&&
  hallChunk.layers.interactions.every(i=>i.objectId!=='holm_guide_hall'||!!i.partId));
const workyardChunk=p.getChunkAtWorldTile(116,151);
const workyard=workyardChunk.layers.objects.find(o=>o.id==='holm_survival_workyard');
check('Survival Workyard replaces its planning foundation',!!workyard&&workyard.buildingDef==='holm_survival_workyard_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_survival_shelter')));
check('Survival Workyard owns twenty-five purposeful semantic interactions through U5',workyardChunk.layers.interactions.filter(i=>i.objectId==='holm_survival_workyard').length===25&&
  workyardChunk.layers.interactions.every(i=>i.objectId!=='holm_survival_workyard'||!!i.partId));
const boatChunk=p.getChunkAtWorldTile(211,154);
check('departure boat occupies its declared water chunk',boatChunk.layers.objects.some(o=>o.id==='holm_departure_boat'));
check('departure boat carries the authored boarding interaction',boatChunk.layers.interactions.some(i=>
  i.objectId==='holm_departure_boat'&&i.kind==='holm_departure'));
check('named safe spawn',p&&p.getSpawnLandmark('holm_arrival').kind==='safe-spawn');
check('map orientation contract',p&&p.mapMetadata.orientation==='north-is-negative-z'&&p.mapMetadata.clickToWalk===true);
check('pond, bridge, cave and departure are mapped',
  ['holm_pond','holm_tidebridge','holm_cave_gate','holm_departure'].every(id=>!!p.getSpawnLandmark(id)));
const mainland=W.get('veyhollow-commons-v2');
check('mainland arrival provider is registered but does not steal new-game boot',mainland&&W.active===p);
check('mainland arrival provider validates 144 chunks',mainland&&mainland.validate().ok&&mainland.snapshot().catalogChunks===144);
check('ferry destination lands beside Hollow Well Square',mainland&&
  mainland.getSpawnLandmark('veyhollow_ferry_arrival').kind==='safe-spawn'&&mainland.getSpawnLandmark('hollow_well_square'));

p.prepare();
check('prepare validates before renderer residency',p.snapshot().residentChunks===0);
const lifecycle={created:0,disposed:0};
const objectLife={created:0,disposed:0};
ctx.WorldV2Terrain={
  loadChunk(chunk){ lifecycle.created++; return {id:chunk.id,mesh:true}; },
  unloadChunk(handle){ if(handle&&handle.mesh) lifecycle.disposed++; },
  snapshot(){ return {liveGeometries:lifecycle.created-lifecycle.disposed}; },
  dispose(){}
};
ctx.WorldV2Objects={
  loadChunk(chunk){ const count=chunk.layers.objects.length; objectLife.created+=count; return {id:chunk.id,count}; },
  unloadChunk(handle){ if(handle) objectLife.disposed+=handle.count||0; },
  snapshot(){ return {liveInstances:objectLife.created-objectLife.disposed}; },
  dispose(){}
};
ctx.CollisionGrid={grid:{},loadChunk(){},unloadChunk(){},snapshot(){return {mode:'resident'};}};
p.updateResidency(158,165,true);
let s1=p.snapshot();
check('initial 7x7 resident ring',s1.residentChunks===49);
p.updateResidency(190,165);
let s2=p.snapshot();
check('four-boundary residency shift stays bounded',s2.residentChunks>0&&s2.residentChunks<=49&&s2.residencyChanges===2);
check('shift unloads and loads deterministically',s2.loaded>s1.loaded&&s2.unloaded>0);
check('render handles equal resident chunks after disposal',lifecycle.created-lifecycle.disposed===s2.residentChunks);
check('eastward shift changes authored object residency',objectLife.disposed>=1&&objectLife.created>objectLife.disposed);
const residentObjects=p.residentChunks().reduce((n,c)=>n+c.layers.objects.length,0);
check('only resident authored objects remain live',objectLife.created-objectLife.disposed===residentObjects);
let kept=p.resolveSavedPosition([160,142],{provider:p.id,worldRevision:p.worldRevision,landmark:'holm_arrival'});
check('same-revision position is preserved',!kept.relocated&&kept.x===160&&kept.z===142);
let moved=p.resolveSavedPosition([0,0],{provider:'legacy',worldRevision:0,landmark:'holm_arrival'});
check('old-world position migrates to the Guide Hall arrival apron',moved.relocated&&moved.x===151&&moved.z===169);
let rejected=false;
try{ W.validateChunk({v:1,id:'0,0',cx:0,cz:0,layers:{terrain:{}}}); }catch(e){ rejected=true; }
check('malformed layer set is rejected',rejected);
let badObjectChunk=false;
try{ W.validateChunk({v:1,id:'0,0',cx:0,cz:0,layers:{terrain:{},tileFlags:[],
  objects:[{id:'misplaced',asset:'crate',x:8.5,z:1}],interactions:[],mutations:[],spawns:[]}}); }
catch(e){ badObjectChunk=true; }
check('object outside its declared chunk is rejected',badObjectChunk);
let badInteraction=false;
try{ W.validateChunk({v:1,id:'0,0',cx:0,cz:0,layers:{terrain:{},tileFlags:[],objects:[],
  interactions:[{id:'orphan',objectId:'missing',kind:'prop',label:'Search'}],mutations:[],spawns:[]}}); }
catch(e){ badInteraction=true; }
check('orphan interaction is rejected',badInteraction);
let badLandmark=false;
try{ W.register({contractVersion:1,id:'bad-landmark',worldRevision:1,initialRect:{x0:0,z0:0,w:8,h:8},
  defaultLandmark:'bad',landmarks:{bad:{id:'bad',x:NaN,z:0}},chunks:[{
    v:1,id:'0,0',cx:0,cz:0,layers:{terrain:{},tileFlags:[],objects:[],interactions:[],mutations:[],spawns:[]}
  }]}); }catch(e){ badLandmark=true; }
check('invalid safe landmark is rejected',badLandmark);
p.dispose();
check('provider disposal releases every render handle',lifecycle.created===lifecycle.disposed);
check('provider disposal releases every object instance',objectLife.created===objectLife.disposed);

if(failures){ console.error('\nworld-v2 contract: '+failures+' failure(s)'); process.exit(1); }
console.log('\nworld-v2 contract: all locks pass');
