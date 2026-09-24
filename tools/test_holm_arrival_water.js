const assert=require('node:assert/strict');
const W=require('../src/holm_arrival_water');
const creek={halfWidth:2,points:[[0,0,4],[0,5,3],[4,8,2]]};
const before=JSON.stringify(creek),a=W.ribbon(creek),b=W.ribbon(creek,{x:-72,z:-64});
assert.equal(JSON.stringify(creek),before);assert.deepEqual(a,W.ribbon(creek));
assert.equal(a.positions.length,18);assert.equal(a.indices.length,12);
for(let i=0;i<a.positions.length;i+=3){assert.equal(b.positions[i],a.positions[i]-72);assert.equal(b.positions[i+1],a.positions[i+1]);assert.equal(b.positions[i+2],a.positions[i+2]-64)}
assert.deepEqual(a.indices.slice(0,6),[0,2,1,1,2,3]);assert.deepEqual(a.indices.slice(6),[2,4,3,3,4,5]);
for(const bad of [{halfWidth:0,points:creek.points},{halfWidth:1,points:[[0,0,0],[0,0,0]]},{halfWidth:1,points:[[0,0,0],[1,0,0],[0,0,0]]},{halfWidth:1,points:[[0,0,0],[1,NaN,0]]}])assert.throws(()=>W.ribbon(bad));
console.log('[HolmArrivalWater] deterministic continuous ribbon, coordinate parity, immutability and four invalid-input cases pass');
