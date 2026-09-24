'use strict';
const assert=require('assert'),fs=require('fs'),crypto=require('crypto'),vm=require('vm');
const Package=require('../src/holm_arrival_package');
const root=require('path').resolve(__dirname,'..');
function read(path){return JSON.parse(fs.readFileSync(root+'/'+path,'utf8'))}
function descriptor(path){return {path,sha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/'+path)).digest('hex')}}
const paths={terrainSource:'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.json',terrain:'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json',layout:'docs/rebuild/holm-overhaul/arrival-layout.json',envelopes:'docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json',dock:'docs/rebuild/holm-overhaul/arrival-dock.json'};
const input={provider:{id:'tutors-holm-v2',worldRevision:20260912},sources:{},assets:[
 {id:'guide',ownerId:'holm_guide_hall',model:descriptor('.studio-workspaces/holm-guide-house-overhaul-v1/candidates/holm_guide_house_overhaul_v1.glb'),authoring:descriptor('.studio-workspaces/holm-guide-house-overhaul-v1/candidates/holm_guide_house_overhaul_v1.blend'),parts:['GroundFloor','UpperFloor','StairFlight','GroundFurnishing','DoorNorthHinge','DoorSouthHinge','DoorNorthLeaf','DoorSouthLeaf']},
 {id:'dock',ownerId:'holm_arrival_dock',model:descriptor('.studio-workspaces/holm-arrival-dock-v1/candidates/dock.glb'),authoring:descriptor('.studio-workspaces/holm-arrival-dock-v1/candidates/dock.blend'),parts:['DockDeck']}
]};
Object.keys(paths).forEach(k=>{input[k]=read(paths[k]);input.sources[k]=descriptor(paths[k])});
// This fixture verifies actual current GLB names; the pure compiler only validates
// declarations. Safe Publish must perform the same byte inspection independently.
for(const a of input.assets){const bytes=fs.readFileSync(root+'/'+a.model.path);assert.strictEqual(bytes.toString('ascii',0,4),'glTF');const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));for(const part of a.parts)assert(gltf.nodes.some(n=>n.name===part),'actual GLB part '+part)}
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const original=JSON.stringify(input);freeze(input);
const output=Package.compile(input);
assert.strictEqual(JSON.stringify(input),original,'input unchanged');
assert.deepStrictEqual(Package.compile(input),output,'deterministic compile');
assert.strictEqual(output.boundary.readyForWholeProviderReplacement,false);
assert.strictEqual(output.boundary.sourceBytesVerified,false);
assert.strictEqual(output.boundary.northExit.nextDistrictConnection,null);
assert.strictEqual(output.objects[0].transform.x,input.layout.building.world.x);
assert.strictEqual(output.objects[0].transform.y,input.layout.building.world.foundationY);
assert.deepStrictEqual(output.objects[1].transform,{x:input.dock.world.x,y:input.dock.world.y,z:input.dock.world.z,rotation:0,scale:1});
assert.strictEqual(output.navigation.requiredRoutes.length,6);
assert.strictEqual(Object.keys(output.navigation.doorStates).length,4);
const Nav=require('../src/holm_arrival_dock').create(input.layout,input.envelopes,input.terrain,input.dock);
const open=output.navigation.doorStates['open-open'].graph;
for(const route of output.navigation.requiredRoutes){
 assert.deepStrictEqual(Nav.route(open,route.from,route.to),route.nodeIds);
 assert(Nav.route(open,route.to,route.from));
}
for(const key of ['closed-closed','closed-open'])assert(!Nav.route(output.navigation.doorStates[key].graph,output.spawn.nodeId,'ground:65,97'));
for(const key of ['open-closed','open-open'])assert(Nav.route(output.navigation.doorStates[key].graph,output.spawn.nodeId,'ground:65,97'));
assert(!Nav.support('exterior',61.5,125,{arrival:true,garden:true}),'wet ground stays blocked');
assert(Nav.support('dock',61.5,125,{arrival:true,garden:true}),'authored dock support exists');
let rejected=0;
function bad(edit,pattern){const changed=clone(input);edit(changed);assert.throws(()=>Package.compile(changed),pattern);rejected++}
bad(i=>i.sources.layout.path='../outside.json',/path/);
bad(i=>i.sources.layout.path='C:\\outside.json',/path/);
bad(i=>i.sources.layout.path='docs//layout.json',/path/);
bad(i=>i.sources.layout.sha256='A'.repeat(64),/SHA256/);
bad(i=>i.sources.layout.sha256='ab',/SHA256/);
bad(i=>i.sources.layout.path=i.sources.dock.path,/conflicting|distinct/);
bad(i=>delete i.sources.envelopes,/source roles/);
bad(i=>i.terrain.heights[0]+=1,/source\/bundle mismatch/);
bad(i=>i.layout.schema='other',/layout/);
bad(i=>i.envelopes.schema='other',/envelope/);
bad(i=>i.provider.id='other',/provider/);
bad(i=>i.provider.worldRevision=0,/provider/);
bad(i=>i.assets[0].ownerId='other',/owner/);
bad(i=>i.assets[0].id='other',/asset/);
bad(i=>i.assets[0].parts.push('Unknown'),/semantic/);
bad(i=>i.assets[1].model.path='assets/wrong.glb',/model\/source/);
bad(i=>i.dock.world.y+=.2,/disconnected/);
bad(i=>i.layout.building.world.foundationY+=.2,/disconnected/);
bad(i=>i.layout.building.rotation=Math.PI/4,/transform/);
bad(i=>i.layout.avatar.height=NaN,/nonfinite/);
bad(i=>i.layout.groundServices.find(s=>s.id==='chart').interaction=[-2.5,0,-1.6],/stance/);
bad(i=>i.layout.groundServices.find(s=>s.id==='chart').x+=.1,/layout\/envelope/);
bad(i=>i.layout.groundServices.find(s=>s.id==='chart').interaction[1]=2.8,/floor/);
bad(i=>i.offset={x:1,z:1},/unknown\/missing/);
const changed=clone(input);changed.sources.layout.sha256='f'.repeat(64);
assert.notStrictEqual(Package.compile(changed).navigation.graphRevision,output.navigation.graphRevision,'bound descriptor changes revision');
const independent=Package.compile(input);independent.objects[0].transform.x=0;
assert.strictEqual(Package.compile(input).objects[0].transform.x,input.layout.building.world.x,'output independent of input and previous result');
const context=vm.createContext({console});
for(const file of ['holm_overhaul_terrain','holm_overhaul_chunks','holm_arrival_navigation','holm_arrival_approach','holm_arrival_dock','holm_arrival_package'])vm.runInContext(fs.readFileSync(root+'/src/'+file+'.js','utf8'),context);
context.inputJson=JSON.stringify(input);
assert.strictEqual(vm.runInContext('JSON.stringify(HolmArrivalPackage.compile(JSON.parse(inputJson)))',context),JSON.stringify(output),'classic-browser export parity');
console.log('[HOLM_ARRIVAL_PACKAGE] immutable deterministic compile, 4 door states, 6 reversible routes, source-derived placements, browser parity; '+rejected+' invalid inputs rejected. Draft only; bytes and runtime acceptance remain unverified.');
