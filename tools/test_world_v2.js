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
function glbPrimitiveCount(glb){
  return (glb.json.meshes||[]).reduce((n,m)=>n+(m.primitives||[]).length,0);
}
function glbNodeTreePrimitiveCount(glb,nodeName){
  const nodes=glb.json.nodes||[],meshes=glb.json.meshes||[];
  const root=nodes.findIndex(node=>node.name===nodeName);
  if(root<0)return 0;
  const seen=new Set(),stack=[root];let total=0;
  while(stack.length){
    const index=stack.pop();
    if(seen.has(index)||!nodes[index])continue;
    seen.add(index);
    const node=nodes[index];
    if(Number.isInteger(node.mesh)&&meshes[node.mesh])total+=(meshes[node.mesh].primitives||[]).length;
    (node.children||[]).forEach(child=>stack.push(child));
  }
  return total;
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
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','holm_lastlight_data.js'),'utf8'),ctx,{filename:'holm_lastlight_data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_building_data.js'),'utf8'),ctx,{filename:'world_v2_building_data.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_authoring.js'),'utf8'),ctx,{filename:'world_v2_authoring.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_bundle_authoring.js'),'utf8'),ctx,{filename:'world_v2_bundle_authoring.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_district_bundle_authoring.js'),'utf8'),ctx,{filename:'world_v2_district_bundle_authoring.js'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'src','world_v2_terrain_district.js'),'utf8'),ctx,{filename:'world_v2_terrain_district.js'});
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
  authoredCatalog.reduce((n,ch)=>n+ch.layers.interactions.length,0)===85);
check('landscape contract validates',p&&p.landscape&&p.landscape.planId==='tutors-holm-landscape-v1');
check('landscape acceptance locks 228-tile spine from the Guide Hall apron to the ferry',ctx.HolmLandscape.acceptanceResult.routeTiles===228);
check('six districts and eight functional pads',p.landscape.districts.length===6&&p.landscape.pads.length===8);
check('every surface district owns a tutorial purpose and increasing elevation band',
  ctx.HolmLandscape.districts.every(d=>d.tutorialRole&&d.elevationBand&&d.elevationBand[1]>d.elevationBand[0]));
const beacon=ctx.HolmLandscape.lastlightBeacon,beaconRoute=ctx.HolmLandscape.routes.find(r=>r.id===beacon.approachRoute);
const beaconSteps=[];for(let i=1;i<beaconRoute.points.length;i++){
  const a=beaconRoute.points[i-1],b=beaconRoute.points[i],dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]),n=Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]);
  for(let s=0;s<n;s++)beaconSteps.push([a[0]+dx*s+.5,a[1]+dz*s+.5]);
}beaconSteps.push([beacon.x+.5,beacon.z+.5]);
const beaconHeights=beaconSteps.map(p=>ctx.HolmLandscape.heightAt(p[0],p[1]));
check('Lastlight is a real high landmark reached by a cardinal, steadily climbable switchback',
  ctx.HolmLandscape.heightAt(beacon.x,beacon.z)>=13&&beaconHeights.every(Number.isFinite)&&
  beaconHeights.slice(1).every((h,i)=>Math.abs(h-beaconHeights[i])<=1.05));
check('Lastlight lighthouse contract preserves wide approach, three furnished levels and ladder circulation',
  ctx.HolmLastlightData.acceptanceResult.passed===ctx.HolmLastlightData.acceptanceResult.total&&
  ctx.HolmLastlightData.contract.footprint.outerRadius*2>=20&&ctx.HolmLastlightData.levels.length===3&&
  ctx.HolmLastlightData.acceptanceResult.ladders===2&&
  ctx.HolmLastlightData.contract.footprint.walkHalfWidth*2>=12);
check('Lastlight authored Blender model, source and acceptance manifest are banked',
  ['model','source','manifest'].every(k=>fs.existsSync(path.join(ROOT,ctx.HolmLastlightData.contract.visual[k])))&&
  ctx.HolmLastlightData.contract.visual.semanticRoots.length===5);
const mainSource=fs.readFileSync(path.join(ROOT,'src','game5_main.js'),'utf8');
check('surface pathfinding rejects cliff transitions while preserving the Lastlight road',
  /MAX_SURFACE_STEP\s*=\s*1\.05/.test(mainSource)&&
  /tileTransitionWalkable\(i,j,ii,jj\)/.test(mainSource)&&
  /profile\.id===beacon\.approachRoute/.test(mainSource)&&
  /tileInsideLastlightRoute\(i\+\.5,j\+\.5\)/.test(mainSource));
const lastlightRuntimeSource=fs.readFileSync(path.join(ROOT,'src','holm_lastlight_runtime.js'),'utf8');
const uiSaveSource=fs.readFileSync(path.join(ROOT,'src','ui_save.js'),'utf8');
const guideHallInteractionSource=fs.readFileSync(path.join(ROOT,'src','holm_guide_hall_interactions.js'),'utf8');
const uiSource=fs.readFileSync(path.join(ROOT,'src','game4_ui.js'),'utf8');
const travelSource=fs.readFileSync(path.join(ROOT,'src','dev_travel.js'),'utf8');
check('Lastlight entry uses a hinged door before swapping to the authored base floor nearby',
  /entry\.position\.set\(c\.footprint\.door\.x,c\.baseY,c\.footprint\.door\.z\+1\)/.test(lastlightRuntimeSource)&&
  /kind:'lighthouseDoor'/.test(lastlightRuntimeSource)&&
  /runtime\.entryDoorOpen=true/.test(lastlightRuntimeSource)&&
  /You step through the door into Lastlight/.test(lastlightRuntimeSource)&&
  /o\.name==='CR_EntryDoor'/.test(lastlightRuntimeSource)&&
  /three floors, two ladders, Underkeep and beacon controls ready/.test(lastlightRuntimeSource)&&
  /runtime\.groups\[0\]\.visible=plane===0;runtime\.groups\[1\]\.visible=plane===1/.test(lastlightRuntimeSource)&&
  /transparentProxy\(2\.2,3\.9,1\.8\)/.test(lastlightRuntimeSource));
check('compact route begins and ends on real authored interactions',
  /Tutorial\.notify\('orient','route'\)/.test(guideHallInteractionSource)&&
  /Tutorial\.notify\('beacon','lit'\)/.test(lastlightRuntimeSource));
check('tutorial saves carry stable lesson ids and migrate curriculum v4 by meaning',
  /lessonId:/.test(uiSaveSource)&&/savedVersion===4&&activeVersion===5/.test(uiSaveSource)&&
  /next==='bake_bread'/.test(uiSaveSource)&&/next='descend_cavern'/.test(uiSaveSource));
check('Lastlight summit keeps the camera outside the opaque shell without hiding the door or flagstone floor',
  /an\.indexOf\('cutawaybase'\)>=0\)baseShellPart=true/.test(lastlightRuntimeSource)&&
  /nearSummit=plane===0/.test(lastlightRuntimeSource)&&
  /dy=Math\.atan2/.test(lastlightRuntimeSource)&&
  /runtime\.exteriorOcclusionAlpha\+=\(1-runtime\.exteriorOcclusionAlpha\)/.test(lastlightRuntimeSource));
check('non-surface saves preserve a validated plane and zone instead of restoring inside the surface shell',
  /plane:Player\.plane\|\|0/.test(uiSaveSource)&&
  /Planes\.elevAt\(px,pz,savedPlane\)/.test(uiSaveSource)&&
  /Player\.plane=savedPlane/.test(uiSaveSource)&&
  /restoredPlane:savedPlane&&restoredPlane\?savedPlane:0/.test(uiSaveSource));
check('pointer picking rejects hidden-floor interactions and upper floors retain authored location labels',
  /objectPlane!==undefined && objectPlane!==\(Player\.plane\|\|0\)/.test(uiSource)&&
  /HolmLastlightData\.levels\[activePlane-1\]\.label/.test(mainSource));
check('inspect-only scenery walks toward its model surface instead of terrain hidden behind it',
  /function walkPointForHit\(hit,e\)/.test(uiSource)&&
  /inspectOnly\?walkPointForHit\(hit,e\):null/.test(uiSource)&&
  /hit\.obj\.userData\.inspectOnly\)[\s\S]{0,120}walkPointForHit\(hit,e\)/.test(uiSource));
check('Lastlight test travel starts with a landmark-safe camera and distant door proxies stay behind terrain',
  /prepareLandmarkCamera\(entry\)/.test(travelSource)&&/camCtl\.yaw=Math\.atan2/.test(travelSource)&&
  /kind==='lighthouseDoor'.*>14\) continue/.test(uiSource));
check('complete-building contracts pass every lock',ctx.WorldV2BuildingData.acceptance().ok&&
  ctx.WorldV2BuildingData.acceptance().checks.length===61);
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
const buildingBundle=ctx.WorldV2BuildingBundle.compile(authoringDoc,{sourcePath:'assets/world/authoring/studio-building-preview.json'});
check('Guide Hall authoring compiles into one valid runtime-shaped building bundle',
  ctx.WorldV2BuildingBundle.validate(buildingBundle,authoringDoc).ok&&buildingBundle.chunks.length===1&&
  buildingBundle.chunks[0].layers.objects.length===1&&buildingBundle.chunks[0].layers.interactions.length===6);
const compiledGuideRows=ctx.WorldV2BuildingBundle.interactionRows(ctx.WorldV2BuildingData.get('holm_guide_hall_v1'),'holm_guide_hall');
const liveGuideRows=p.catalogChunks().flatMap(ch=>ch.layers.interactions).filter(row=>row.objectId==='holm_guide_hall');
check('live Guide Hall interactions are byte-equivalent to shared definition compilation',
  JSON.stringify(liveGuideRows)===JSON.stringify(compiledGuideRows));
check('bundle resource gate resolves the model, Blender source, and manifest',
  Object.values(buildingBundle.buildingContracts[0].resources).every(file=>fs.existsSync(path.join(ROOT,file))));
const workyardBundleDef=ctx.WorldV2BuildingData.get('holm_survival_workyard_v1');
const workyardDoc=authoring.addBuilding(authoring.createDocument('studio-survival-workyard',1),workyardBundleDef.id,
  {id:'studio-survival-workyard',x:116,z:151,rot:0,yOffset:-0.16});
const workyardBundle=ctx.WorldV2BuildingBundle.compile(workyardDoc,{sourcePath:'assets/world/authoring/studio-survival-workyard.json'});
check('Survival Workyard compiles into one valid runtime-shaped bundle with twenty-five interactions',
  ctx.WorldV2BuildingBundle.validate(workyardBundle,workyardDoc).ok&&workyardBundle.chunks.length===1&&
  workyardBundle.chunks[0].layers.objects.length===1&&workyardBundle.chunks[0].layers.interactions.length===25);
const checkedWorkyardDoc=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','world','authoring','studio-survival-workyard.json'),'utf8'));
const checkedWorkyardBundle=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','world','authoring','studio-survival-workyard.bundle.json'),'utf8'));
check('checked-in Workyard source and bundle are an exact deterministic compile pair',
  ctx.WorldV2BuildingBundle.validate(checkedWorkyardBundle,checkedWorkyardDoc).ok&&
  JSON.stringify(checkedWorkyardDoc)===JSON.stringify(workyardDoc)&&JSON.stringify(checkedWorkyardBundle)===JSON.stringify(workyardBundle));
const compiledWorkyardRows=ctx.WorldV2BuildingBundle.interactionRows(workyardBundleDef,'holm_survival_workyard');
const liveWorkyardRows=p.catalogChunks().flatMap(ch=>ch.layers.interactions).filter(row=>row.objectId==='holm_survival_workyard');
check('live Workyard interactions are byte-equivalent to shared definition compilation',
  JSON.stringify(liveWorkyardRows)===JSON.stringify(compiledWorkyardRows));
check('Workyard bundle preserves inspect-only metadata and excludes the future poultry socket',
  compiledWorkyardRows.filter(row=>row.inspectOnly).length===14&&
  compiledWorkyardRows.some(row=>row.id==='holm_survival_workyard.waterworks'&&row.inspectName&&row.examine)&&
  !compiledWorkyardRows.some(row=>row.partId==='chicken_spawn_socket'));
check('Workyard bundle resource gate resolves every authored model, Blender source, and manifest',
  Object.values(workyardBundle.buildingContracts[0].resources).length===16&&
  Object.values(workyardBundle.buildingContracts[0].resources).every(file=>fs.existsSync(path.join(ROOT,file))));
const districtSource=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','world','authoring','studio-survival-wood-district.json'),'utf8'));
const checkedDistrictBundle=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','world','authoring','studio-survival-wood-district.bundle.json'),'utf8'));
const compiledDistrictBundle=ctx.WorldV2DistrictBundle.compile(districtSource,checkedWorkyardDoc,checkedWorkyardBundle);
check('Survival Wood source is the exact standard district transaction definition',
  JSON.stringify(districtSource)===JSON.stringify(ctx.WorldV2DistrictBundle.survivalWoodSource()));
check('checked-in Survival Wood district bundle is an exact deterministic compile',
  ctx.WorldV2DistrictBundle.validate(checkedDistrictBundle,districtSource,checkedWorkyardDoc,checkedWorkyardBundle).ok&&
  JSON.stringify(checkedDistrictBundle)===JSON.stringify(compiledDistrictBundle));
check('district bundle accounts for every Workyard collider and authored dock surface',
  checkedDistrictBundle.navigation.collisionRows.length===workyardBundleDef.colliders.length&&
  checkedDistrictBundle.navigation.walkSurfaces.length===workyardBundleDef.walkSurfaces.length&&
  checkedDistrictBundle.navigation.walkSurfaces.every(row=>row.x>127&&row.y===0.04));
check('district bundle provides explicit water blocks and dock walk overrides',
  checkedDistrictBundle.chunks.some(ch=>ch.tileFlags.some(row=>row.mask===ctx.WorldV2DistrictBundle.BLOCK&&row.reason==='terrain-water'))&&
  checkedDistrictBundle.chunks.some(ch=>ch.tileFlags.some(row=>row.mask===0&&row.reason==='authored-walk-surface')));
check('live Survival Wood terrain and tile flags are byte-equivalent to the district bundle',
  checkedDistrictBundle.chunks.every(row=>{const live=p.getChunk(row.cx,row.cz);return live&&JSON.stringify(live.layers.terrain)===JSON.stringify(row.terrain)&&JSON.stringify(live.layers.tileFlags)===JSON.stringify(row.tileFlags);})&&
  JSON.stringify(ctx.HolmSurvivalWoodBundle)===JSON.stringify(checkedDistrictBundle));
const lessonSource=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/world/authoring/studio-lesson-green-district.json'),'utf8'));
const lessonBundle=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/world/authoring/studio-lesson-green-district.bundle.json'),'utf8'));
check('published Lesson Green is the exact runtime terrain-only compile',
  ctx.WorldV2TerrainDistrict.validate(lessonBundle,lessonSource).ok&&JSON.stringify(ctx.HolmLessonGreenBundle)===JSON.stringify(lessonBundle));
check('Lesson Green terrain and every water row are consumed without replacing Survival overrides',
  lessonBundle.chunks.every(row=>{const live=p.getChunk(row.cx,row.cz),survival=checkedDistrictBundle.chunks.find(c=>c.id===row.id);
    return live&&JSON.stringify(live.layers.terrain)===JSON.stringify(row.terrain)&&row.tileFlags.every(flag=>{
      const expected=survival&&survival.tileFlags.find(f=>f.x===flag.x&&f.z===flag.z)||flag;
      return live.layers.tileFlags.some(f=>JSON.stringify(f)===JSON.stringify(expected));
    })&&new Set(live.layers.tileFlags.map(f=>f.x+','+f.z)).size===live.layers.tileFlags.length;
  }));
check('Lesson Green keeps both planning foundations and adds no finished buildings',
  !lessonBundle.building&&['holm_teaching_kitchen','holm_quest_lodge'].every(id=>authoredCatalog.some(c=>c.layers.objects.some(o=>o.id===id)))&&
  !['holm_pad_quest_lodge','holm_pad_teaching_kitchen'].some(id=>authoredCatalog.some(c=>c.layers.objects.some(o=>o.id===id))));
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
const workyardU3Glb=readGlbJson(path.join(ROOT,workyardBundleDef.resources.occupationYardModel));
const workyardU4Glb=readGlbJson(path.join(ROOT,workyardBundleDef.resources.waterworksModel));
const workyardU5Glb=readGlbJson(path.join(ROOT,workyardBundleDef.resources.fishingEdgeModel));
const workyardStaticRoofOffDraws=glbPrimitiveCount(workyardGlb)-glbNodeTreePrimitiveCount(workyardGlb,'roof')+
  glbPrimitiveCount(workyardU3Glb)+glbPrimitiveCount(workyardU4Glb)+glbPrimitiveCount(workyardU5Glb);
check('Workyard roof-off composition leaves exactly two draws for its runtime hearth flame effect',
  workyardStaticRoofOffDraws===workyardBundleDef.resources.visualBudget.maxDrawCalls-2&&
  glbPrimitiveCount(workyardU4Glb)===26);
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
function workyardFloor(x,z){
  if(x<-12||x>20||z<-10||z>10)return false;
  const inside=x>=-9.5&&x<=10&&z>=-6.75&&z<=6.75;
  const worldX=workyardDef.placement.x+x,worldZ=workyardDef.placement.z+z;
  const drySurface=ctx.HolmLandscape.heightAt(worldX,worldZ)>-1.2&&!ctx.HolmLandscape.inPond(worldX,worldZ);
  const dock=workyardDef.walkSurfaces.some(s=>Math.abs(x-s.x)<=s.w/2+.05&&Math.abs(z-s.z)<=s.d/2+.05);
  return inside||drySurface||dock;
}
function workyardReachableTiles(){
  const start=[-2.5,7.5],queue=[start],seen=new Set([start.join(',')]);
  while(queue.length){
    const [x,z]=queue.shift();
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=nx+','+nz;
      if(seen.has(key)||!workyardFloor(nx,nz)||workyardBlocked(nx,nz))continue;
      seen.add(key);queue.push([nx,nz]);
    }
  }
  return [...seen].map(key=>key.split(',').map(Number));
}
const workyardReachable=workyardReachableTiles();
const explicitWorkyardTargets=[...workyardDef.services,...workyardDef.clues,...workyardDef.supportSpaces]
  .filter(row=>row.bundle!==false&&Array.isArray(row.interactionTile)&&!(row.interaction&&row.interaction.inspectOnly));
const unreachableWorkyardTargets=explicitWorkyardTargets.filter(row=>!workyardReachable.some(tile=>
  Math.hypot(tile[0]-row.interactionTile[0],tile[1]-row.interactionTile[1])<=1.55));
if(unreachableWorkyardTargets.length)console.error('    nearest Workyard anchor distances: '+unreachableWorkyardTargets.map(row=>{
  const ranked=workyardReachable.map(tile=>({tile,d:Math.hypot(tile[0]-row.interactionTile[0],tile[1]-row.interactionTile[1])})).sort((a,b)=>a.d-b.d);
  return row.id+'='+ranked[0].d.toFixed(2)+'@'+ranked[0].tile.join('/');
}).join(', '));
check('every functional Workyard service and lesson anchor is cardinally reachable'+
  (unreachableWorkyardTargets.length?' ['+unreachableWorkyardTargets.map(row=>row.id).join(', ')+']':''),
  unreachableWorkyardTargets.length===0);
const inspectOnlyRows=[...workyardDef.supportSpaces,...workyardDef.furnishings].filter(row=>row.kind==='prop');
check('decorative Workyard props remain right-click inspect-only',inspectOnlyRows.length>=14&&
  inspectOnlyRows.every(row=>row.interaction&&row.interaction.inspectOnly===true));
const trailOutside=workyardDef.doors.find(d=>d.id==='trail_door').entry.outside;
const pondOutside=workyardDef.doors.find(d=>d.id==='pond_door').entry.outside;
check('Survival Workyard trail entrance intentionally meets the pond-loop path',
  ctx.HolmLandscape.pathDistance(workyardDef.placement.x+trailOutside[0],workyardDef.placement.z+trailOutside[1])<=0.5);
check('Survival Workyard pond exit lands on dry shore rather than in the pond',
  ctx.HolmLandscape.heightAt(workyardDef.placement.x+pondOutside[0],workyardDef.placement.z+pondOutside[1])>-1.2&&
  !ctx.HolmLandscape.inPond(workyardDef.placement.x+pondOutside[0],workyardDef.placement.z+pondOutside[1]));
check('Tutor\'s Holm uses a compact required route and keeps side lessons optional',ctx.HolmTutorialFlow.acceptanceResult.stations===11&&
  ctx.HolmTutorialFlow.acceptanceResult.plannedLessons===18&&ctx.HolmTutorialFlow.acceptanceResult.requiredLessons===13&&
  ctx.HolmTutorialFlow.acceptanceResult.optionalLessons===5&&ctx.HolmTutorialFlow.acceptanceResult.runtimeLessons===13);
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
check('placement and interaction layers stay separate',interactions===85);
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
const kitchenChunk=p.getChunkAtWorldTile(153,136);
const kitchen=kitchenChunk.layers.objects.find(o=>o.id==='holm_teaching_kitchen');
const hallChunk2=p.getChunkAtWorldTile(172,119);
const combatHall=hallChunk2.layers.objects.find(o=>o.id==='holm_combat_hall');
check('Combat Hall replaces its planning foundation, owns seven interactions, and receives the cavern exit inside its tower',!!combatHall&&combatHall.buildingDef==='holm_combat_hall_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_combat_hall'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_combat_hall').length,0)===7&&
  !catalog.some(c=>c.layers.interactions.some(i=>i.objectId==='holm_combat_hall'&&/socket$/.test(i.partId)))&&
  combatHall.x+4.5===176.5&&combatHall.z-2.5===116.5);
const treeSource=fs.readFileSync(path.join(ROOT,'src','holm_survival_trees.js'),'utf8');
const holmSource=fs.readFileSync(path.join(ROOT,'src','world_v2_holm.js'),'utf8');
const chopTarget=ctx.HolmTutorialFlow.lessons.find(l=>l.id==='chop_logs').target;
const treeRows=[...treeSource.matchAll(/\{x:(\d+),z:(\d+)\}/g)].map(m=>[+m[1],+m[2]]);
check('three provider-owned marked trees stand within six tiles of the chop_logs arrow target',treeRows.length===3&&
  treeRows.every(t=>Math.hypot(t[0]-chopTarget.x,t[1]-chopTarget.z)<=6.5)&&/makeTree\(/.test(treeSource)&&
  /HolmSurvivalTrees\.init\(p\)/.test(holmSource)&&/HolmSurvivalTrees\.dispose\(\)/.test(holmSource));
const towerChunk=p.getChunkAtWorldTile(193,136);
const mageTower=towerChunk.layers.objects.find(o=>o.id==='holm_mage_tower');
check('Mage Tower replaces its planning foundation, owns eight interactions, and keeps its casting socket silent',!!mageTower&&mageTower.buildingDef==='holm_mage_tower_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_mage_tower'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_mage_tower').length,0)===8&&
  !catalog.some(c=>c.layers.interactions.some(i=>i.objectId==='holm_mage_tower'&&/socket$/.test(i.partId)))&&
  mageTower.x===193&&mageTower.z===136);
const bankChunk=p.getChunkAtWorldTile(157,116);
const bank=bankChunk.layers.objects.find(o=>o.id==='holm_bank');
const bankChest=catalog.flatMap(c=>c.layers.objects).find(o=>o.id==='holm_bank_chest');
check('Holm Bank replaces its planning foundation, owns nine interactions, and keeps the vault chest inside its footprint',!!bank&&bank.buildingDef==='holm_bank_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_holm_bank'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_bank').length,0)===9&&
  !!bankChest&&Math.abs(bankChest.x-bank.x)<5&&Math.abs(bankChest.z-bank.z)<4&&
  catalog.some(c=>c.layers.interactions.some(i=>i.objectId==='holm_bank_chest'&&i.kind==='bank')));
const gateChunk=p.getChunkAtWorldTile(127,119);
const gatehouse=gateChunk.layers.objects.find(o=>o.id==='holm_mine_gatehouse');
check('Mine Gatehouse replaces its planning foundation, owns eight interactions, and stands over the cavern shaft',!!gatehouse&&gatehouse.buildingDef==='holm_mine_gatehouse_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_mine_gatehouse'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_mine_gatehouse').length,0)===8&&
  gatehouse.x-2.5===124.5&&gatehouse.z+0.5===119.5);
const lodgeChunk=p.getChunkAtWorldTile(136,136);
const lodge=lodgeChunk.layers.objects.find(o=>o.id==='holm_quest_lodge');
check('Quest Lodge replaces its planning foundation and owns seven interactions with a silent guide socket',!!lodge&&lodge.buildingDef==='holm_quest_lodge_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_quest_lodge'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_quest_lodge').length,0)===7&&
  !catalog.some(c=>c.layers.interactions.some(i=>i.objectId==='holm_quest_lodge'&&i.partId==='quest_guide_socket')));
check('Teaching Kitchen replaces its planning foundation and owns ten interactions',!!kitchen&&kitchen.buildingDef==='holm_teaching_kitchen_v1'&&
  !catalog.some(c=>c.layers.objects.some(o=>o.id==='holm_pad_teaching_kitchen'))&&
  catalog.reduce((n,c)=>n+c.layers.interactions.filter(i=>i.objectId==='holm_teaching_kitchen').length,0)===10&&
  catalog.some(c=>c.layers.interactions.some(i=>i.objectId==='holm_teaching_kitchen'&&i.kind==='holm_kitchen_range'&&i.acceptsUseItem===true)));
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

console.log('holm_training_cavern.js:');
const cavern=require(path.join(ROOT,'src','holm_training_cavern.js'));
const flow=ctx.HolmTutorialFlow;
const lessonById=id=>flow.lessons.find(l=>l.id===id);
const stationById=id=>flow.station(id);
check('training cavern layout loads headlessly as pure data',
  !!cavern&&cavern.id==='holm_training_cavern'&&cavern.underground==='holm_mining_cavern');
const indexHtml=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const loadOrder=['src/game2_world.js','src/planes.js','src/tutorial_holm.js',
  'src/holm_survival_workyard_cellar.js','src/holm_training_cavern.js'].map(s=>indexHtml.indexOf(s));
check('index.html loads the training cavern exactly once, after world/planes/tutorial/cellar',
  loadOrder.every(i=>i>=0)&&loadOrder.every((v,i,arr)=>!i||v>arr[i-1])&&
  indexHtml.split('src/holm_training_cavern.js').length===2);
const cavernStation=stationById('cavern');
const insidePit=t=>Math.abs(t.x-cavern.cavern.x)<=cavern.cavern.hw-1&&
  Math.abs(t.z-cavern.cavern.z)<=cavern.cavern.hd-1;
check('cavern is a negative-plane room and every authored tile stands on its walkable floor',
  cavern.plane===-1&&cavern.cavern.y<0&&
  [cavern.entry,cavern.exit,cavern.targets.copper,cavern.targets.furnace,cavern.targets.anvil]
    .concat(cavern.extraRocks).every(insidePit));
check('gate descent links the Mine Gatehouse station to the cavern station entry',
  cavern.gate.x===stationById('mine_gate').entry.x&&cavern.gate.z===stationById('mine_gate').entry.z&&
  cavern.entry.x===cavernStation.entry.x&&cavern.entry.z===cavernStation.entry.z);
check('forward-only far exit surfaces at the Combat Hall station',
  cavern.exit.x===cavernStation.exit.x&&cavern.exit.z===cavernStation.exit.z&&
  cavern.hall.x===stationById('combat_hall').entry.x&&cavern.hall.z===stationById('combat_hall').entry.z&&
  cavern.oneWay.gateHasUp===false&&cavern.oneWay.exitHasDown===false);
check('all five cavern lesson targets are authored on their exact flow-contract tiles',
  [['descend_cavern',cavern.gate],['mine_copper',cavern.targets.copper],
   ['mine_tin',cavern.extraRocks.find(r=>r.kind==='tin')],
   ['smelt_bronze',cavern.targets.furnace],['forge_dagger',cavern.targets.anvil]]
    .every(([id,t])=>{const l=lessonById(id);return l&&l.runtime&&l.target.x===t.x&&l.target.z===t.z;}));
const worldSrc=fs.readFileSync(path.join(ROOT,'src','game2_world.js'),'utf8');
check('cavern reuses existing item and action ids only',
  cavern.targets.copper.item==='copper_ore'&&lessonById('mine_copper').match==='copper_ore'&&lessonById('mine_tin').match==='tin_ore'&&
  cavern.extraRocks.every(r=>['copper_ore','tin_ore','clay'].includes(r.item))&&
  cavern.targets.furnace.kind==='furnace'&&cavern.targets.anvil.kind==='anvil'&&
  worldSrc.includes("item:'copper_ore'")&&worldSrc.includes("item:'tin_ore'")&&worldSrc.includes("item:'clay'")&&
  fs.readFileSync(path.join(ROOT,'src','smith_bronze_dagger.js'),'utf8').includes('bronze_dagger'));
check('Holm flow acceptance still passes with the cavern leg in place',
  flow.acceptanceResult.passed===flow.acceptanceResult.total&&flow.acceptanceResult.stations===11&&
  cavernStation.underground===cavern.underground);
const cavernSrc=fs.readFileSync(path.join(ROOT,'src','holm_training_cavern.js'),'utf8');
const holmProviderSrc=fs.readFileSync(path.join(ROOT,'src','world_v2_holm.js'),'utf8');
check('training cavern has no polling self-boot and cannot masquerade as a resident chunk object',
  !cavernSrc.includes('setInterval(')&&!cavernSrc.includes('.worldObjectId=')&&
  cavernSrc.includes('runtimeOwnerId'));
check('cavern exit ladder owns a silhouette-sized click proxy rather than a clickable floor tile',
  cavernSrc.includes("ladderPick.name='cavern-exit-ladder-pick-proxy'")&&
  cavernSrc.includes('exitLadder.add(ladderPick)')&&!cavernSrc.includes('walk.userData.kind'));
check('cavern traversal carries explicit underground and surface zone labels',
  cavernSrc.includes("zone:'Training Cavern'")&&cavernSrc.includes('zone:"Tutor\'s Holm"')&&
  fs.readFileSync(path.join(ROOT,'src','planes.js'),'utf8').includes('UI.zone(dest.zone)'));
check('Tutor\'s Holm provider explicitly owns cavern initialization, disposal, and telemetry',
  holmProviderSrc.includes('HolmTrainingCavern.init(p)')&&
  holmProviderSrc.includes('HolmTrainingCavern.dispose()')&&
  holmProviderSrc.includes('trainingCavern:typeof HolmTrainingCavern'));

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
