#!/usr/bin/env node
'use strict';
// OLD-SCHOOL LOOK. v2 (rollout 2026-09-26): v9 (tools/stage_holm_arrival_package_v9.js) with EVERY arrival model swapped for
// its textured old-school candidate (tools/blender/apply_oldschool_textures.py; geometry, names, extras and animations
// proven identical by tools/compare_glb_structure.js): Guide House, dock + moored boat, provision rack, arrival oak,
// hazels, fieldstones, garden wall, bench, waypost, cargo, and (v3, 2026-09-26) the Lantern Keeper statue v4 on the v3.0 body
// (holm-arrival-statue-oldschool-v1: pale stone, lantern glass still emissive; same footprint and root name). v2 kept statue v3
// (statue v4 was being built
// on a new body). The landscape models are re-measured (holm-arrival-landscape-measure-oldschool-v1, identical bounds).
// Collision envelopes, layout, terrain and graph inputs are v9's, so the arrival navigation compiles to the same graph.
// v1 (2026-09-25) swapped the Guide House only. Loaded only when HolmOldschoolLook is on (src/holm_oldschool_look.js).
// Build candidates, then stage only through the existing Safe Publish CLI.
// Never applies or changes the active provider. Re-running deliberately restages
// this recipe's targets; other workspaces and candidate art are not modified.
// v9 (2026-09-25 world fixes, owner play-test: "with the boat that's tied to the dock, I can see water inside the bottom
// of the boat"): dock v4 (the dock geometry byte-identical to v3; the moored rowing boat rides 12 cm higher on a closed
// inner sole, so the sea plane can no longer show inside its hull); arrival graph identical to v8. Otherwise v8:
// v8 (2026-09-25, owner play-test): guide house v5 (doors fitted to oak frames, layered hearth fire, the chart's
// lesson route ChartRoute_01..09 / ChartStop_01..10) and the Lantern Keeper v3 stone statue (same footprint); otherwise v7:
// v7 (2026-09-25, owner): z-fighting sweep (guide house v4; provision rack v2; dock v3 with its planks 4 cm over the 1.00 navigation plane and a stone landing) and the Lantern Keeper monument v2 (same footprint); otherwise v6:
// v3 collision envelopes (v2 list + Blender-declared blockers; arrival graph node-identical to v4). Otherwise v4.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const Package=require('../src/holm_arrival_package');
const root=path.resolve(__dirname,'..'),id='holm-arrival-package-oldschool-v3';
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
 envelopes:add(authoring+'holm-arrival.envelopes.json','.studio-workspaces/holm-guide-house-overhaul-v5/candidates/guide-house-collision-envelopes.json'),
 dock:add(authoring+'holm-arrival.dock.json','docs/rebuild/holm-overhaul/arrival-dock.json',d=>({...d,model:'assets/models/holm_arrival_dock_oldschool_v1.glb'}))
};
const assets=[
 {id:'guide',ownerId:'holm_guide_hall',
  model:add('assets/models/holm_guide_house_oldschool_v1.glb','.studio-workspaces/holm-guide-house-oldschool-v1/candidates/holm_guide_house_oldschool_v1.glb'),
  authoring:add('assets/blender/holm_guide_house_oldschool_v1.blend','.studio-workspaces/holm-guide-house-oldschool-v1/candidates/holm_guide_house_oldschool_v1.blend'),
  parts:['GroundFloor','UpperFloor','StairFlight','GroundFurnishing','DoorNorthHinge','DoorSouthHinge','DoorNorthLeaf','DoorSouthLeaf']},
 {id:'dock',ownerId:'holm_arrival_dock',
  model:add('assets/models/holm_arrival_dock_oldschool_v1.glb','.studio-workspaces/holm-arrival-dock-oldschool-v1/candidates/dock.glb'),
  authoring:add('assets/blender/holm_arrival_dock_oldschool_v1.blend','.studio-workspaces/holm-arrival-dock-oldschool-v1/candidates/dock.blend'),parts:['DockDeck']}
];
const provisionBase='.studio-workspaces/holm-provision-rack-oldschool-v1/candidates/';   // v7: rack v2 (hatchet edge z-fight fixed; same manifest contract and bounds)
const provisionModel='assets/models/holm_provisions_oldschool_v1.glb',provisionSource='assets/blender/holm_provisions_oldschool_v1.blend';
sources.provisionsPlacement=add(authoring+'holm-arrival.provisions.json','docs/rebuild/holm-overhaul/arrival-provisions.json',p=>({...p,model:provisionModel,source:provisionSource}));
sources.provisionsManifest=add(authoring+'holm-arrival.provisions.manifest.json',provisionBase+'manifest.json');
assets.push({id:'provisions',ownerId:'holm_provisions',model:add(provisionModel,provisionBase+'provisions.glb'),authoring:add(provisionSource,provisionBase+'provisions.blend'),parts:['ProvisionsRack','ProvisionHatchet','ProvisionNet','ProvisionTinderbox']});
const landscapeBase='.studio-workspaces/holm-arrival-landscape-measure-oldschool-v2/candidates/';
const measured=JSON.parse(fs.readFileSync(path.join(root,landscapeBase+'measured.json'),'utf8'));
const roots={oak:'ArrivalOak',hazel:'ArrivalHazel',fieldstones:'ArrivalFieldstones',wall:'LandingGardenWall',bench:'LandingOakBench',waypost:'LandingWaypost',cargo:'LandingCargoCrate',statue:'LanternKeeperStatue'};
const modelName={oak:'holm_arrival_oak_oldschool_v1.glb',statue:'holm_arrival_statue_oldschool_v1.glb',hazel:'holm_arrival_hazel_oldschool_v1.glb',fieldstones:'holm_arrival_fieldstones_oldschool_v1.glb',
 wall:'holm_arrival_wall_oldschool_v1.glb',bench:'holm_arrival_bench_oldschool_v1.glb',waypost:'holm_arrival_waypost_oldschool_v1.glb',cargo:'holm_arrival_cargo_oldschool_v1.glb'};
const oakSource=add('assets/blender/holm_arrival_oak_oldschool_v1.blend','.studio-workspaces/holm-tree-family-oldschool-v1/candidates/arrival_oak_v3.blend');
const statueSource=add('assets/blender/holm_arrival_statue_oldschool_v1.blend','.studio-workspaces/holm-arrival-statue-oldschool-v1/candidates/lantern_keeper_statue_v4.blend');
// one textured .blend per landscape asset (the recipe imported each GLB of the shared garden / landing-props .blend)
const perAssetSource={hazel:['holm-arrival-garden-oldschool-v1','arrival_hazel_v1'],fieldstones:['holm-arrival-garden-oldschool-v1','arrival_fieldstones_v1'],
 wall:['holm-landing-props-oldschool-v1','wall'],bench:['holm-landing-props-oldschool-v1','bench'],waypost:['holm-landing-props-oldschool-v1','waypost'],cargo:['holm-landing-props-oldschool-v1','cargo']};
const landscapeSource={};for(const [id,[ws,n]] of Object.entries(perAssetSource))landscapeSource[id]=add('assets/blender/holm_arrival_'+id+'_oldschool_v1.blend','.studio-workspaces/'+ws+'/candidates/'+n+'.blend');
for(const [id,m] of Object.entries(measured.assets)){
 const target='assets/models/'+(modelName[id]||'holm_arrival_'+id+'_v1.glb');
 const model=add(target,m.file);if(model.sha256!==m.sha256)throw Error('Measured landscape bytes changed: '+id);
 assets.push({id,ownerId:'holm_landscape_'+id,model,authoring:id==='oak'?oakSource:id==='statue'?statueSource:landscapeSource[id],parts:[roots[id]]});
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
