'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..'),Compiler=require('../src/holm_arrival_provisions');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),clone=v=>JSON.parse(JSON.stringify(v));
// Numerical fixture only. This is not an accepted world placement.
const input={layout:read('docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes:read('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'),terrain:read('.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'),dock:read('docs/rebuild/holm-overhaul/arrival-dock.json'),manifest:read('.studio-workspaces/holm-provision-rack-v1/candidates/manifest.json'),placement:{local:{x:2,z:-4,rotation:0},interaction:{x:2.5,z:-2.5}}};
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const original=JSON.stringify(input);freeze(input);
const output=Compiler.compile(input);
assert.strictEqual(JSON.stringify(input),original);
assert.deepStrictEqual(Compiler.create(input),output);
assert.strictEqual(output.service.stanceNodeId,'ground:68,96');
assert.deepStrictEqual(output.service.transform,{x:68,y:3,z:95,rotation:0,scale:1});
assert.strictEqual(output.service.source,'provisions.blend');
assert.strictEqual(output.service.model,'provisions.glb');
assert.deepStrictEqual(output.service.localBounds,input.manifest.localBounds);
assert.strictEqual(output.layout.groundServices.length,input.layout.groundServices.length+1);
assert.strictEqual(output.envelopes.blockers.length,input.envelopes.blockers.length+1);
assert.strictEqual(output.requiredRoutes.length,16);
const nav=require('../src/holm_arrival_dock').create(output.layout,output.envelopes,input.terrain,input.dock);
for(const route of output.requiredRoutes){const graph=output.doorStates[route.doorState].graph;assert.deepStrictEqual(nav.route(graph,route.from,route.to),route.nodeIds)}
for(const state of Object.values(output.doorStates)){
 assert(!nav.support('ground',68,95,state.doors),'rack footprint blocks walking');
 const by=Object.fromEntries(state.graph.nodes.map(n=>[n.id,n]));
 for(const [id,links] of Object.entries(state.graph.links))for(const to of links){assert(nav.edge(by[id],by[to],state.doors));assert(state.graph.links[to].includes(id))}
 if(!state.doors.arrival)assert.strictEqual(nav.route(state.graph,'exterior:61,118',output.service.stanceNodeId),null);
}
let rejected=0;
function bad(edit,pattern){const altered=clone(input);edit(altered);assert.throws(()=>Compiler.compile(altered),pattern);rejected++}
bad(i=>i.placement.local.x=NaN,/nonfinite/);
bad(i=>i.placement.local.rotation=Math.PI/2,/rotation/);
bad(i=>delete i.placement.local.rotation,/rotation/);
bad(i=>i.placement.local.x=6,/outside house/);
bad(i=>i.placement.local.z=-5,/outside house/);
bad(i=>{i.placement.local.x=-2.5;i.placement.local.z=-1.6},/collides/);
bad(i=>{i.placement.local.x=4.25;i.placement.local.z=0},/stair/);
bad(i=>i.placement.interaction.z=-4,/stance/);
bad(i=>i.placement.interaction.x=0,/stance/);
bad(i=>i.placement.interaction.z=0,/stance/);
bad(i=>i.manifest.dimensions.width=0,/dimensions/);
bad(i=>i.manifest.dimensions.height=2,/dimensions disagree/);
bad(i=>i.manifest.localBounds.max[1]=Infinity,/nonfinite/);
bad(i=>i.manifest.localBounds.max[0]=-1,/dimensions disagree/);
bad(i=>i.manifest.localBounds.min.pop(),/localBounds/);
bad(i=>i.manifest.semanticInteractionMeshes.pop(),/semantic/);
bad(i=>i.manifest.meshFamilies[0]='SomethingElse',/semantic/);
bad(i=>i.manifest.primaryInteractionMesh='ProvisionNet',/primary/);
bad(i=>i.manifest.animationNames=['Idle'],/moving/);
bad(i=>i.manifest.frontDirection=[0,0,-1],/front/);
bad(i=>i.manifest.units='metres',/manifest/);
bad(i=>i.manifest.sourceFile='../escape.blend',/path/);
bad(i=>i.placement.model='C:\\outside.glb',/path/);
bad(i=>i.layout.groundServices.push({id:'provisions'}),/duplicate/);
bad(i=>i.envelopes.blockers.push({id:'provisions'}),/duplicate/);
bad(i=>{i.manifest.dimensions.height=2.7;i.manifest.localBounds.max[1]=2.7},/ceiling/);
bad(i=>i.dock.world.y+=.2,/disconnected/);
const separate=Compiler.compile(input);separate.layout.groundServices.pop();separate.service.localBounds.min[0]=100;
assert.deepStrictEqual(Compiler.compile(input),output,'independent output');
const context=vm.createContext({console});
for(const file of ['holm_overhaul_terrain','holm_arrival_navigation','holm_arrival_approach','holm_arrival_dock','holm_arrival_provisions'])vm.runInContext(fs.readFileSync(path.join(root,'src',file+'.js'),'utf8'),context);
context.input=JSON.stringify(input);
assert.strictEqual(vm.runInContext('JSON.stringify(HolmArrivalProvisions.compile(JSON.parse(input)))',context),JSON.stringify(output),'classic script parity');
console.log('[HOLM_ARRIVAL_PROVISIONS] acceptance ok: 4 door graphs, 16 reversible route legs, measured bound blockers, immutable deterministic classic/CommonJS parity; '+rejected+' invalid inputs rejected. Numerical fixture only; no runtime or visual acceptance.');
