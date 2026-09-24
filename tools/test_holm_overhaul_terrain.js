'use strict';
const assert=require('assert'),T=require('../src/holm_overhaul_terrain.js');
const source={schema:'holm-overhaul-terrain-source-v1',version:1,width:144,depth:128,spacing:1,
  coast:[[4,4],[140,4],[140,124],[4,124]],hills:[{x:100,z:70,rx:25,rz:25,height:10}],
  pads:[{id:'guide',x:90,z:90,w:10,d:8,height:5,blend:3}],
  creek:{points:[[40,20,3],[40,60,2],[40,120,0]],halfWidth:1.2,bankWidth:2.5,depth:.8}};
const clone=x=>JSON.parse(JSON.stringify(x));let passed=0;
function check(name,f){f();passed++;console.log('PASS '+name);}
const before=JSON.stringify(source),b=T.compile(source);
check('deterministic immutable serializable full lattice',()=>{
  assert.strictEqual(JSON.stringify(source),before);assert.strictEqual(JSON.stringify(b),JSON.stringify(T.compile(source)));
  assert.strictEqual(b.heights.length,145*129);assert.strictEqual(b.water.length,144*128);
  assert(b.heights.every(Number.isFinite));assert(b.materials.every(n=>Number.isInteger(n)&&n>=0&&n<=4));
  b.creek.points[0][2]=99;assert.strictEqual(source.creek.points[0][2],3);b.creek.points[0][2]=3;
});
check('coast signed-distance shoreline and sea classifications',()=>{
  assert.strictEqual(T.sample(b,0,0),-2);assert.strictEqual(b.water[0],1);
  assert.strictEqual(T.sample(b,4,70),0);assert.strictEqual(T.sample(b,5,70),1);assert.strictEqual(T.sample(b,6,70),2);
  assert.strictEqual(b.materials[70*145+5],0);assert.strictEqual(b.materials[70*145+6],1);
});
check('creek channel lies below interpolated descending water',()=>{
  for(let z=20;z<=120;z++){
    const water=z<=60?3-(z-20)/40:2-(z-60)/30;
    assert(T.sample(b,40,z)<=water-.8+1e-10);assert.strictEqual(b.materials[z*145+40],3);
  }
  assert.strictEqual(b.water[60*144+40],2);assert.strictEqual(b.water[60*144+50],0);
});
check('pad interior exactly level and hill centre smooth and high',()=>{
  for(let z=86;z<=94;z++)for(let x=85;x<=95;x++)assert.strictEqual(T.sample(b,x,z),5);
  assert.strictEqual(T.sample(b,100,70),12);assert(T.sample(b,99,70)<12);
});
check('low terrain receives explicit bed and above-water bank lips',()=>{
  const s=clone(source);s.creek.points=[[40,20,8],[40,120,8]];s.creek.halfWidth=1;s.creek.bankWidth=2;
  const raised=T.compile(s);
  assert.strictEqual(T.sample(raised,40,60),7.2);
  assert.strictEqual(T.sample(raised,42,60),8.3);
  assert.strictEqual(T.sample(raised,38,60),8.3);
  assert.strictEqual(T.sample(raised,43,60),2);
  assert.strictEqual(T.waterHeight(raised,40,60),8);assert.strictEqual(T.waterHeight(raised,43,60),null);
});
check('bilinear sample and exact upper boundary',()=>{
  const x=99,z=69,mean=[b.heights[z*145+x],b.heights[z*145+x+1],b.heights[(z+1)*145+x],b.heights[(z+1)*145+x+1]].reduce((a,c)=>a+c)/4;
  assert.strictEqual(T.sample(b,x+.5,z+.5),mean);assert.strictEqual(T.sample(b,144,128),-2);
  assert.throws(()=>T.sample(b,-1,0));assert.throws(()=>T.sample(b,Infinity,1));
});
check('malformed sources and uphill or zero-length creek rejected',()=>{
  [s=>s.width=12,s=>s.spacing=2,s=>s.coast=[],s=>s.coast[0][0]=NaN,s=>s.hills[0].rx=0,
    s=>s.pads[0].x=1,s=>s.pads.push(clone(s.pads[0])),s=>s.creek.points[1][2]=4,
    s=>s.creek.points[1]=[40,20,2],s=>s.creek.depth=-1,s=>s.creek.points[0][1]=129].forEach(change=>{
    const s=clone(source);change(s);assert.throws(()=>T.compile(s));
  });
  const level=clone(source);level.creek.points.forEach(p=>p[2]=1);assert.doesNotThrow(()=>T.compile(level));
});
check('submerged shore shelf is continuous rather than a two-tile cliff',()=>{
  const s=clone(source);s.shore={beachWidth:4,shelfWidth:4};const coast=T.compile(s);
  assert(T.sample(coast,3,70)<0&&T.sample(coast,3,70)>-.5);
  assert(T.sample(coast,5,70)>0&&T.sample(coast,5,70)<.5);
  assert.throws(()=>T.compile({...s,shore:{beachWidth:0,shelfWidth:4}}));
});
check('tile stats partition entire grid',()=>{
  assert.strictEqual(b.stats.dryTiles+b.stats.seaTiles+b.stats.creekTiles,144*128);
  assert.strictEqual(b.stats.minHeight,Math.min(...b.heights));assert.strictEqual(b.stats.maxHeight,Math.max(...b.heights));
});
console.log('[HOLM_OVERHAUL_TERRAIN] '+passed+'/'+passed+' checks passed');
