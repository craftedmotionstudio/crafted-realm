'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..'),Compiler=require('../src/holm_arrival_scenery'),Dock=require('../src/holm_arrival_dock'),Provision=require('../src/holm_arrival_provisions');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),clone=v=>JSON.parse(JSON.stringify(v));
const input={layout:read('docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes:read('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'),terrain:read('.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'),placement:read('docs/rebuild/holm-overhaul/arrival-landscape.json'),measurement:read('.studio-workspaces/holm-arrival-landscape-measure-v2/candidates/measured.json')};
const dock=read('docs/rebuild/holm-overhaul/arrival-dock.json');
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v)}return v}
const original=JSON.stringify(input);freeze(input);const out=Compiler.compile(input);
assert.strictEqual(JSON.stringify(input),original);assert.deepStrictEqual(Compiler.compile(input),out);assert.strictEqual(out.placements.length,18);assert.strictEqual(out.envelopes.blockers.length,input.envelopes.blockers.length+36);
assert.deepStrictEqual(out.envelopes.blockers.slice(0,input.envelopes.blockers.length),input.envelopes.blockers);
assert.strictEqual(out.evidence.sourceBytesVerified,false);assert.strictEqual(out.evidence.continuousSweptGuarantee,false);
for(const p of out.placements){
 const source=input.placement.placements.find(q=>q.asset===p.asset&&q.x===p.transform.x&&q.z===p.transform.z);assert(source);assert.strictEqual(p.transform.scale,source.scale);assert.strictEqual(p.transform.rotation,source.rotation);
 for(const surface of ['exterior','ground']){const b=out.envelopes.blockers.find(q=>q.id===p.id+(surface==='ground'?'.ground':''));const cb=out.blockers.find(q=>q.id===p.id);assert.strictEqual(b.surface,surface);assert.strictEqual(b.x0,cb.x0-input.layout.building.world.x);assert.strictEqual(b.z1,cb.z1-input.layout.building.world.z);if(!['oak','hazel'].includes(p.asset)){assert.strictEqual(cb.x0,p.worldBounds.min[0]);assert.strictEqual(cb.z1,p.worldBounds.max[2])}else assert(cb.x0>=p.worldBounds.min[0]&&cb.x1<=p.worldBounds.max[0])}
}
// Actual GLB JSON roots are checked here; compilation itself does not read bytes.
for(const [asset,m] of Object.entries(input.measurement.assets)){
 const b=fs.readFileSync(path.join(root,m.file)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 assert.deepStrictEqual(j.scenes[j.scene||0].nodes.map(n=>j.nodes[n].name),out.partsByAsset[asset]);
}
const provision=Provision.compile({...input,dock,manifest:read('.studio-workspaces/holm-provision-rack-v1/candidates/manifest.json'),placement:read('docs/rebuild/holm-overhaul/arrival-provisions.json')});
const augmented=Compiler.compile({...input,layout:provision.layout,envelopes:provision.envelopes});
const nav=Dock.create(augmented.layout,augmented.envelopes,input.terrain,dock);let routeCount=0;
for(const state of Object.values(provision.doorStates)){
 const graph=nav.compile(state.doors),by=Object.fromEntries(graph.nodes.map(n=>[n.id,n]));
 for(const [id,links] of Object.entries(graph.links))for(const to of links){assert(nav.edge(by[id],by[to],state.doors));assert(graph.links[to].includes(id))}
 for(const old of provision.requiredRoutes.filter(r=>JSON.stringify(provision.doorStates[r.doorState].doors)===JSON.stringify(state.doors))){assert(nav.route(graph,old.from,old.to),'required route lost '+old.from+' -> '+old.to);routeCount++}
 if(!state.doors.arrival)assert.strictEqual(nav.route(graph,'exterior:61,118',provision.service.stanceNodeId),null);
}
assert.strictEqual(routeCount,16);
let rejected=0;function bad(edit,pattern){const i=clone(input);edit(i);assert.throws(()=>Compiler.compile(i),pattern);rejected++}
bad(i=>i.measurement.schema='wrong',/schema/);bad(i=>i.measurement.version=2,/schema/);bad(i=>i.placement.version=2,/version/);
bad(i=>delete i.measurement.assets.oak,/seven/);bad(i=>i.measurement.assets.other={},/seven/);
bad(i=>i.measurement.continuousSweptGuarantee=true,/guarantee/);bad(i=>i.measurement.units='metres',/units/);
bad(i=>i.measurement.assets.oak.sha256='wrong',/hash/);bad(i=>i.measurement.assets.oak.file='../escape.glb',/file/);
bad(i=>i.measurement.assets.oak.file=i.measurement.assets.hazel.file,/duplicate model/);
bad(i=>i.measurement.assets.oak.triangles=0,/counts/);bad(i=>i.measurement.assets.oak.vertices=1,/counts/);
bad(i=>i.measurement.assets.oak.animatedSampledUnion.min[0]=0,/excludes/);
bad(i=>i.measurement.assets.oak.restBounds.max[1]=Infinity,/nonfinite/);
bad(i=>i.measurement.assets.oak.clips=[],/clip count/);bad(i=>i.measurement.assets.oak.clips[0].name='Idle',/Breeze/);
bad(i=>i.measurement.assets.hazel.clips[0].sampleTimesSeconds=[0,1,1],/times/);
bad(i=>i.measurement.assets.wall.animatedSampledUnion.max[0]+=1,/static/);
// v2 (2026-09-24): trees block by their measured ground-contact footprint; only trees may carry one, inside their bounds
bad(i=>i.measurement.assets.wall.footprintBounds=i.measurement.assets.wall.restBounds,/only trees/);
bad(i=>{i.measurement.assets.oak.footprintBounds={min:[-9,0,-9],max:[9,.5,9]}},/footprint outside/);
bad(i=>delete i.measurement.assets.statue&&i,/missing measured template: statue/);
{const oak=out.blockers.find(b=>b.asset==='oak');assert(oak.x1-oak.x0<3&&oak.z1-oak.z0<3,'tree blocker is its trunk footprint, not the canopy')}
bad(i=>i.placement.placements.push(i.placement.placements[0]),/duplicate placement/);
bad(i=>i.placement.placements[0].x=66,/obstructs|intersects/);
bad(i=>i.envelopes.blockers.push({...i.envelopes.blockers[0]}),/duplicate/);
bad(i=>i.envelopes.blockers[0].id=out.placements[0].id,/collision/);
bad(i=>i.envelopes.blockers[0].id=out.placements[0].id+'.ground',/collision/);
const detached=Compiler.compile(input);detached.placements[0].worldBounds.min[0]=999;detached.partsByAsset.oak.push('wrong');assert.deepStrictEqual(Compiler.compile(input),out);
const context=vm.createContext({console});for(const name of ['holm_overhaul_terrain','holm_arrival_landscape_contract','holm_arrival_scenery'])vm.runInContext(fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'),context);
context.input=JSON.stringify(input);assert.strictEqual(vm.runInContext('JSON.stringify(HolmArrivalScenery.compile(JSON.parse(input)))',context),JSON.stringify(out));
console.log('[HOLM_ARRIVAL_SCENERY_TEST] 18 authored placements (incl. Lantern Keeper statue), 36 translated blockers (trees by trunk footprint), 8 actual semantic roots, 4 door graphs, 16 preserved route legs, immutable classic/CommonJS parity; '+rejected+' invalid inputs rejected. No visual or continuous animation acceptance.');
