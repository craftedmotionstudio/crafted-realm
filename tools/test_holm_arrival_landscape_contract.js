'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Contract=require('../src/holm_arrival_landscape_contract');
let count=0;
function test(name,fn){fn();count++;console.log('ok '+name)}
function fixture(){return {
 data:{schema:'holm-arrival-landscape-study-v1',placements:[{asset:'wall',x:4,z:4,scale:1,rotation:0}]},
 templates:{wall:{localBounds:{min:[-1,0,-.25],max:[1,2,.25]}}},
 layout:{schema:'holm-overhaul-arrival-layout-v1',version:1,avatar:{radius:.42},building:{world:{x:10,z:10,foundationY:0},width:2,depth:2},approach:{waypoints:[[0,0,0],[0,0,6],[2,0,6]]}},sample:()=>3
}}
function reject(name,edit,pattern){test(name,()=>{const f=fixture();edit(f);assert.throws(()=>Contract.compile(f),pattern)})}
test('stable output and immutable source/template/layout',()=>{const f=fixture(),before=JSON.stringify(f),a=Contract.compile(f);assert.equal(JSON.stringify(f),before);assert.deepEqual(a,Contract.compile(f));a.placements[0].localBounds.min[0]=999;assert.equal(f.templates.wall.localBounds.min[0],-1)});
test('quarter turn uses Three Y rotation convention and scale',()=>{const f=fixture();Object.assign(f.data.placements[0],{rotation:Math.PI/2,scale:2});const b=Contract.compile(f).placements[0].worldBounds;assert(Math.abs(b.min[0]-3.5)<1e-12);assert.equal(b.min[2],2);assert.equal(b.max[1],7)});
test('oblique corner extrema contain independently rotated corners',()=>{const f=fixture();f.data.placements[0].rotation=.37;const p=f.data.placements[0],b=Contract.compile(f).placements[0].worldBounds;for(const x of [-1,1])for(const z of [-.25,.25]){const wx=4+Math.cos(.37)*x+Math.sin(.37)*z,wz=4-Math.sin(.37)*x+Math.cos(.37)*z;assert(wx>=b.min[0]-1e-12&&wx<=b.max[0]+1e-12&&wz>=b.min[2]-1e-12&&wz<=b.max[2]+1e-12)}assert.equal(p.rotation,.37)});
test('structure uses lowest sampled support and keeps minY convention',()=>{const f=fixture();f.templates.wall.localBounds.min[1]=-.1;f.sample=x=>3+x*.05;const p=Contract.compile(f).placements[0];assert.equal(p.transform.y,3.15);assert(Math.abs(p.worldBounds.min[1]-3.05)<1e-12);assert(Math.abs(p.grounding.range-.1)<1e-12)});
test('vegetation center burial and conservative blocker retained',()=>{const f=fixture();f.data.placements[0].asset='oak';f.templates.oak=f.templates.wall;f.sample=(x,z)=>x+z;const out=Contract.compile(f);assert.equal(out.placements[0].transform.y,7.91);assert.equal(out.blockers.length,1);assert.equal(out.blockers[0].requiresNavigationIntegration,true);assert.equal(out.evidence.navigationIntegrated,false);assert.equal(out.evidence.sourceBytesVerified,false)});
test('structural slope exactly .3 accepted',()=>{const f=fixture();f.sample=x=>x===3?0:.3;assert.equal(Contract.compile(f).placements.length,1)});
reject('structural slope beyond .3 rejected',f=>{f.sample=x=>x===3?0:.300001},/foundation/);
reject('route expanded by avatar clearance',f=>{f.data.placements[0].x=1.49},/route/);
test('route envelope touching boundary has no strict overlap',()=>{const f=fixture();f.data.placements[0].x=1.5;assert.equal(Contract.compile(f).placements.length,1)});
reject('building footprint overlap',f=>{Object.assign(f.data.placements[0],{x:9,z:10})},/building footprint/);
reject('noncardinal route rejected',f=>{f.layout.approach.waypoints[1]=[1,0,6]},/cardinal/);
reject('zero route segment rejected',f=>{f.layout.approach.waypoints[1]=[0,0,0]},/cardinal/);
reject('duplicate implicit id rejected',f=>{f.data.placements.push({...f.data.placements[0]})},/duplicate/);
reject('duplicate explicit id rejected',f=>{f.data.placements[0].id='oak-one';f.data.placements.push({...f.data.placements[0],x:7})},/duplicate/);
reject('unsafe explicit id rejected',f=>{f.data.placements[0].id='../wall'},/id/);
reject('unsupported family rejected',f=>{f.data.placements[0].asset='castle'},/placement/);
reject('unknown template rejected',f=>{delete f.templates.wall},/template/);
reject('nonfinite placement rejected',f=>{f.data.placements[0].rotation=NaN},/placement/);
reject('numeric string rejected',f=>{f.data.placements[0].scale='1'},/placement/);
reject('zero scale rejected',f=>{f.data.placements[0].scale=0},/placement/);
reject('negative scale rejected',f=>{f.data.placements[0].scale=-1},/placement/);
reject('nonfinite bound rejected',f=>{f.templates.wall.localBounds.max[2]=Infinity},/localBounds/);
reject('reversed bound rejected',f=>{f.templates.wall.localBounds.max[0]=-2},/localBounds/);
reject('bad bound dimension rejected',f=>{f.templates.wall.localBounds.min.pop()},/localBounds/);
reject('nonfinite terrain center rejected',f=>{f.sample=(x,z)=>x===4&&z===4?NaN:3},/terrain sample/);
reject('nonfinite terrain corner rejected',f=>{f.sample=(x,z)=>x===3?Infinity:3},/terrain sample/);
reject('structural span numeric overflow rejected',f=>{f.sample=x=>x===3?-1e308:1e308},/range overflow/);
reject('transformed bounds overflow rejected',f=>{f.templates.wall.localBounds.max[0]=1e308;f.data.placements[0].scale=3},/overflow/);
reject('tiny scale precision collapse rejected',f=>{f.data.placements[0].scale=Number.MIN_VALUE},/collapsed/);
reject('huge terrain elevation precision collapse rejected',f=>{f.sample=()=>1e308},/collapsed/);
reject('rotated building rejected',f=>{f.layout.building.world.rotation=.1},/rotation/);
reject('nonfinite route rejected',f=>{f.layout.approach.waypoints[1][1]=NaN},/route/);
reject('missing sampler rejected',f=>{delete f.sample},/sample/);
test('classic script parity and boot acceptance log',()=>{const logs=[],context={console:{info:s=>logs.push(s)}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/holm_arrival_landscape_contract.js'),'utf8'),context);assert(logs.includes('[HOLM_LANDSCAPE_CONTRACT] 4/4 acceptance ok'));assert.equal(JSON.stringify(context.HolmArrivalLandscapeContract.compile(fixture())),JSON.stringify(Contract.compile(fixture())))});
test('existing study has all 17 authored placements; synthetic bounds do not claim asset proof',()=>{const f=fixture();f.data=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/rebuild/holm-overhaul/arrival-landscape.json'),'utf8'));f.layout=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/rebuild/holm-overhaul/arrival-layout.json'),'utf8'));f.templates={};for(const p of f.data.placements)f.templates[p.asset]={localBounds:{min:[-.01,0,-.01],max:[.01,.1,.01]}};const out=Contract.compile(f);assert.equal(out.placements.length,17);assert.equal(out.evidence.sourceBytesVerified,false);assert.deepEqual(out.placements.map(p=>[p.asset,p.transform.x,p.transform.z,p.transform.scale,p.transform.rotation]),f.data.placements.map(p=>[p.asset,p.x,p.z,p.scale,p.rotation]))});
console.log('[HOLM_LANDSCAPE_CONTRACT_TEST] '+count+'/'+count+' passed');
