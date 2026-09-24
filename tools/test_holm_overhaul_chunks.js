'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const C=require('../src/holm_overhaul_chunks'),T=require('../src/holm_overhaul_terrain');
const b=JSON.parse(fs.readFileSync('.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'));
const before=JSON.stringify(b),pack=C.compile(b);assert.strictEqual(JSON.stringify(b),before);assert.deepStrictEqual(pack,C.compile(b));
const context={console,Map,Set};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync('src/world_v2_contract.js','utf8'),context);
assert.strictEqual(pack.chunks.length,288);let wet=0;
for(const ch of pack.chunks){
 context.WorldV2.validateChunk(ch);assert.strictEqual(ch.layers.terrain.heights.length,81);wet+=ch.layers.tileFlags.length;
 for(let z=0;z<=8;z++)for(let x=0;x<=8;x++){
  const wx=ch.cx*8+x,wz=ch.cz*8+z;assert(Math.abs(C.sample(ch,wx,wz)-T.sample(b,wx,wz))<1e-10);
 }
 const x=ch.cx*8+3.25,z=ch.cz*8+5.75;assert(Math.abs(C.sample(ch,x,z)-T.sample(b,x,z))<1e-10);
 if(ch.cx<17){const east=pack.chunks[ch.cz*18+ch.cx+1];for(let z=0;z<=8;z++)assert.strictEqual(ch.layers.terrain.heights[z*9+8],east.layers.terrain.heights[z*9]);}
 if(ch.cz<15){const south=pack.chunks[(ch.cz+1)*18+ch.cx];for(let x=0;x<=8;x++)assert.strictEqual(ch.layers.terrain.heights[72+x],south.layers.terrain.heights[x]);}
}
assert.strictEqual(wet,b.water.filter(Boolean).length);
for(const mutate of [x=>x.heights[0]=NaN,x=>x.water[0]=8,x=>x.materials.pop(),x=>x.width=143]){const bad=JSON.parse(before);mutate(bad);assert.throws(()=>C.compile(bad));}
assert.throws(()=>C.sample(pack.chunks[0],9,0));
// Surface triangles cover every tile once, with upward winding and exact source
// vertex heights. A house exclusion crossing chunk seams removes only its tiles.
const covered=new Set();let faces=0;
for(const ch of pack.chunks){
 const mesh=C.surface(ch,[{x:60,z:94,w:12,d:10}]);
 assert.strictEqual(mesh.positions.length,243);
 for(let i=0;i<81;i++)assert.strictEqual(mesh.positions[i*3+1],ch.layers.terrain.heights[i]);
 for(let i=0;i<mesh.indices.length;i+=6){
  const a=mesh.indices[i]*3,b=mesh.indices[i+1]*3,c=mesh.indices[i+2]*3,p=mesh.positions;
  assert((p[b+2]-p[a+2])*(p[c]-p[a])-(p[b]-p[a])*(p[c+2]-p[a+2])>0);
  const key=p[a]+','+p[a+2];assert(!covered.has(key));covered.add(key);faces+=2;
 }
}
assert.strictEqual(faces,36624);assert.strictEqual(covered.size,144*128-120);
for(let z=94;z<104;z++)for(let x=60;x<72;x++)assert(!covered.has(x+','+z));
assert.throws(()=>C.surface(pack.chunks[0],[{x:0.5,z:0,w:1,d:1}]));
console.log('[HOLM_OVERHAUL_SURFACE] exact lattice, upward winding, unique tile coverage and cross-chunk house exclusion verified');
console.log('[HOLM_OVERHAUL_CHUNKS] 288 contract-valid chunks, exact shared seams/samples, water coverage, immutable deterministic output and malformed inputs verified; no provider activated');
