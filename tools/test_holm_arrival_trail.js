const assert=require('node:assert/strict'),fs=require('node:fs');
const Trail=require('../src/holm_arrival_trail');
const layout=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/arrival-layout.json','utf8'));
const terrain=JSON.parse(fs.readFileSync('.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json','utf8'));
const sample=Trail.terrainSampler(terrain),before=JSON.stringify(layout),data=Trail.geometry(layout,sample),studio=Trail.geometry(layout,sample,{x:-72,z:-64});
assert.equal(JSON.stringify(layout),before);assert.deepEqual(data,Trail.geometry(layout,sample));assert(data.indices.length>0);assert.equal(data.colors.length,data.positions.length);
for(let i=0;i<data.positions.length;i+=3){const [x,y,z]=data.positions.slice(i,i+3);assert(z>=layout.building.world.z+7.4-1e-9);assert(Math.abs(y-sample(x,z)-.025)<1e-9);assert.equal(studio.positions[i],x-72);assert.equal(studio.positions[i+1],y);assert.equal(studio.positions[i+2],z-64)}
assert(data.indices.every(i=>Number.isInteger(i)&&i>=0&&i<data.positions.length/3));
for(let i=0;i<data.indices.length;i+=3){const p=data.indices.slice(i,i+3).map(j=>data.positions.slice(j*3,j*3+3)),center=[0,1,2].map(k=>p.reduce((s,v)=>s+v[k],0)/3);assert(Math.abs(center[1]-sample(center[0],center[2])-.025)<1e-8)}
// A saddle cell distinguishes the actual render diagonal from bilinear sampling.
const saddle={width:144,depth:128,heights:Array(145*129).fill(0)};saddle.heights[146]=4;const ss=Trail.terrainSampler(saddle);assert.equal(ss(.25,.25),0);assert.equal(ss(.75,.75),2);assert.equal(ss(.5,.5),0);
assert.throws(()=>sample(-1,0));assert.throws(()=>Trail.geometry(layout,()=>NaN));
const duplicate=JSON.parse(before);duplicate.approach.waypoints[1]=duplicate.approach.waypoints[0];assert.throws(()=>Trail.geometry(duplicate,sample));
console.log('[HolmArrivalTrail] actual authored route '+data.positions.length/3+' vertices / '+data.indices.length/3+' triangles; contour, terrain diagonal, translation, deterministic immutable geometry and invalid input gates pass');
