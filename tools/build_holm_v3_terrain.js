/* Compile the Tutor's Holm v3 terrain source into its bundle and report every route.
 * Run: node tools/build_holm_v3_terrain.js [--check]
 *   default  writes assets/world/holm_v3/holm-v3.terrain.bundle.json
 *   --check  compiles and compares with the checked-in bundle without writing (gate mode)
 * Exits 1 when the source is invalid, a route is unreachable, or (--check) the bundle is stale. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const T=require('../src/holm_v3_terrain.js');
const DIR=path.join(__dirname,'..','assets','world','holm_v3');
const SRC=path.join(DIR,'holm-v3.terrain.source.json'),OUT=path.join(DIR,'holm-v3.terrain.bundle.json');
const check=process.argv.includes('--check');

const source=JSON.parse(fs.readFileSync(SRC,'utf8'));
const bundle=T.compile(source);
bundle.sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
const text=JSON.stringify(bundle);

let failed=false;
for(const r of bundle.routes){
  console.log((r.reachable?'  ok  ':'  FAIL')+' route '+r.from+' -> '+r.to+(r.reachable?' ('+r.steps+' steps)':' is unreachable'));
  if(!r.reachable) failed=true;
}
const s=bundle.stats;
console.log('  tiles walkable '+s.walkableTiles+', path overlay '+s.overlayTiles+', crossings '+s.crossings+
  ', height '+bundle.base.stats.minHeight.toFixed(2)+'..'+bundle.base.stats.maxHeight.toFixed(2));
if(check){
  const current=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):null;
  if(current!==text){ console.log('  FAIL checked-in bundle is stale: run node tools/build_holm_v3_terrain.js'); failed=true; }
  else console.log('  ok  checked-in bundle matches the source byte for byte');
}else{
  fs.writeFileSync(OUT,text);
  console.log('  wrote '+path.relative(process.cwd(),OUT)+' ('+text.length+' bytes)');
}
console.log('[HOLM_V3_TERRAIN_BUILD] '+(failed?'FAIL':'PASS'));
process.exitCode=failed?1:0;
