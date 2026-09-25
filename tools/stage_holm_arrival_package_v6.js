#!/usr/bin/env node
'use strict';
// Build candidates, then stage only through the existing Safe Publish CLI.
// Never applies or changes the active provider. Re-running deliberately restages
// this recipe's targets; other workspaces and candidate art are not modified.
// v6 (2026-09-25, owner): arrival dock v2 (connected under-deck structure, moored rowing boat with an idle bob). Otherwise v5:
// v3 collision envelopes (v2 list + Blender-declared blockers; arrival graph node-identical to v4). Otherwise v4.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const Package=require('../src/holm_arrival_package');
const root=path.resolve(__dirname,'..'),id='holm-arrival-package-v6';
const workspace=path.join(root,'.studio-workspaces',id),candidates=path.join(workspace,'candidates');
const rows=[],bytesByTarget=new Map();
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function add(target,source,transform){
 let bytes=fs.readFileSync(path.join(root,source));
 if(transform)bytes=Buffer.from(JSON.stringify(transform(JSON.parse(bytes.toString('utf8'))),null,2)+'\n');
 const candidate=path.join(candidates,path.basename(target));
 if(rows.some(r=>r.target===target||r.candidate===candidate))throw Error('duplicate recipe target/candidate');
 rows.push({target,candidate,bytes});bytesByTarget.set(target,bytes);
 return {path:target,sha256:digest(bytes)};
}
const authoring='assets/world/authoring/',oldTerrain='.studio-workspaces/holm-overhaul-terrain-v1/working/'+authoring;
const sources={
 terrainSource:add(authoring+'holm-overhaul.terrain.json',oldTerrain+'holm-overhaul.terrain.json'),
 terrain:add(authoring+'holm-overhaul.terrain.bundle.json',oldTerrain+'holm-overhaul.terrain.bundle.json'),
 layout:add(authoring+'holm-arrival.layout.json','docs/rebuild/holm-overhaul/arrival-layout.json'),
 envelopes:add(authoring+'holm-arrival.envelopes.json','.studio-workspaces/holm-guide-house-overhaul-v3/candidates/guide-house-collision-envelopes.json'),
 dock:add(authoring+'holm-arrival.dock.json','docs/rebuild/holm-overhaul/arrival-dock.json',d=>({...d,model:'assets/models/holm_arrival_dock_overhaul_v2.glb'}))
};
const assets=[
 {id:'guide',ownerId:'holm_guide_hall',
  model:add('assets/models/holm_guide_house_overhaul_v3.glb','.studio-workspaces/holm-guide-house-overhaul-v3/candidates/holm_guide_house_overhaul_v3.glb'),
  authoring:add('assets/blender/holm_guide_house_overhaul_v3.blend','.studio-workspaces/holm-guide-house-overhaul-v3/candidates/holm_guide_house_overhaul_v3.blend'),
  parts:['GroundFloor','UpperFloor','StairFlight','GroundFurnishing','DoorNorthHinge','DoorSouthHinge','DoorNorthLeaf','DoorSouthLeaf']},
 {id:'dock',ownerId:'holm_arrival_dock',
  model:add('assets/models/holm_arrival_dock_overhaul_v2.glb','.studio-workspaces/holm-arrival-dock-v2/candidates/dock.glb'),
  authoring:add('assets/blender/holm_arrival_dock_overhaul_v2.blend','.studio-workspaces/holm-arrival-dock-v2/candidates/dock.blend'),parts:['DockDeck']}
];
const provisionBase='.studio-workspaces/holm-provision-rack-v1/candidates/';
const provisionModel='assets/models/holm_provisions_v1.glb',provisionSource='assets/blender/holm_provisions_v1.blend';
sources.provisionsPlacement=add(authoring+'holm-arrival.provisions.json','docs/rebuild/holm-overhaul/arrival-provisions.json',p=>({...p,model:provisionModel,source:provisionSource}));
sources.provisionsManifest=add(authoring+'holm-arrival.provisions.manifest.json',provisionBase+'manifest.json');
assets.push({id:'provisions',ownerId:'holm_provisions',model:add(provisionModel,provisionBase+'provisions.glb'),authoring:add(provisionSource,provisionBase+'provisions.blend'),parts:['ProvisionsRack','ProvisionHatchet','ProvisionNet','ProvisionTinderbox']});
const landscapeBase='.studio-workspaces/holm-arrival-landscape-measure-v2/candidates/';
const measured=JSON.parse(fs.readFileSync(path.join(root,landscapeBase+'measured.json'),'utf8'));
const roots={oak:'ArrivalOak',hazel:'ArrivalHazel',fieldstones:'ArrivalFieldstones',wall:'LandingGardenWall',bench:'LandingOakBench',waypost:'LandingWaypost',cargo:'LandingCargoCrate',statue:'LanternKeeperStatue'};
const modelName={oak:'holm_arrival_oak_v3.glb',statue:'holm_arrival_statue_v1.glb'};
const oakSource=add('assets/blender/holm_tree_family_v3.blend','.studio-workspaces/holm-tree-family-v3/candidates/tree-family.blend');
const statueSource=add('assets/blender/holm_arrival_statue_v1.blend','.studio-workspaces/holm-arrival-statue-v1/candidates/lantern_keeper_statue_v1.blend');
const gardenSource=add('assets/blender/holm_arrival_garden_v1.blend','.studio-workspaces/holm-arrival-garden-v1/candidates/holm_arrival_garden_v1.blend');
const landingSource=add('assets/blender/holm_landing_props_v1.blend','.studio-workspaces/holm-landing-props-v1/candidates/holm_landing_props_v1.blend');
for(const [id,m] of Object.entries(measured.assets)){
 const target='assets/models/'+(modelName[id]||'holm_arrival_'+id+'_v1.glb');
 const model=add(target,m.file);if(model.sha256!==m.sha256)throw Error('Measured landscape bytes changed: '+id);
 assets.push({id,ownerId:'holm_landscape_'+id,model,authoring:id==='oak'?oakSource:id==='statue'?statueSource:['hazel','fieldstones'].includes(id)?gardenSource:landingSource,parts:[roots[id]]});
}
sources.landscapePlacement=add(authoring+'holm-arrival.landscape.json','docs/rebuild/holm-overhaul/arrival-landscape.json');
sources.landscapeMeasurement=add(authoring+'holm-arrival.landscape-measure.json',landscapeBase+'measured.json',d=>{for(const [id,m] of Object.entries(d.assets))m.file='assets/models/'+(modelName[id]||'holm_arrival_'+id+'_v1.glb');return d});
const input={provider:{id:'tutors-holm-v2',worldRevision:20260925},sources,assets};
for(const [role,descriptor] of Object.entries(sources))input[role]=JSON.parse(bytesByTarget.get(descriptor.path).toString('utf8'));
const value=Package.compile(input),target=authoring+'holm-arrival.package.json';
rows.push({target,candidate:path.join(candidates,'holm-arrival.package.json'),bytes:Buffer.from(JSON.stringify(value,null,2)+'\n')});
function cli(...args){return JSON.parse(cp.execFileSync(process.execPath,[path.join(__dirname,'studio_workspace_cli.js'),...args],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true}))}
const manifest=path.join(workspace,'studio-workspace.json');
if(fs.existsSync(manifest)){
 const registered=JSON.parse(fs.readFileSync(manifest,'utf8')).targets.map(t=>t.path).sort();
 if(JSON.stringify(registered)!==JSON.stringify(rows.map(r=>r.target).sort()))throw Error('Existing workspace targets differ from recipe; refusing to alter registration');
}else cli('init',id,...rows.map(r=>r.target));
fs.mkdirSync(candidates,{recursive:true});
for(const row of rows){fs.writeFileSync(row.candidate,row.bytes);cli('stage',id,row.target,row.candidate)}
const result=cli('export',id),plan=cli('plan',id,...(result.exportId?[result.exportId]:[]));
if(!plan.ok)throw Error('Arrival plan rejected: '+JSON.stringify(plan));
console.log(JSON.stringify({workspace:id,exportId:result.exportId||null,files:rows.length,planOk:plan.ok,applied:false,readyForWholeProviderReplacement:value.boundary.readyForWholeProviderReplacement},null,2));
