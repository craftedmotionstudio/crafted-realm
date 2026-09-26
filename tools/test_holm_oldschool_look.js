/* Headless locks for the old-school island look (world look pass 2026-09-25, src/holm_oldschool_look.js):
 *  1 the old-school ground draws EXACTLY the same triangles as the previous ground on every chunk (so raycasts,
 *    collision, the creek-water fit and the trail sampler are untouched), with finite colours in [0,1] and texture
 *    weights that never exceed 1;
 *  2 gouraud light: flat ground is lit 1.0, and a vertex shared by neighbouring tiles gets one light value (no facets);
 *  3 the texture kit exists as listed in kit.json (64 px PNGs, means in range) and the look module's fallback means
 *    agree with it;
 *  4 the switch: GameConfig.holmOldschoolLook / ?oldschool= decide it; off exposes no textured assets.
 * Run: node tools/test_holm_oldschool_look.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const Chunks=require('../src/holm_overhaul_chunks'),Ground=require('../src/holm_overhaul_ground'),Paths=require('../src/holm_island_paths_data');
const I=require('./holm_island_inputs').load(),T=I.terrain;
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name)};
Ground.setPaths(Paths.tiles);Ground.setTerrain(T);
const chunks=Chunks.compile(T).chunks;

check('1 old-school ground: same triangles as the previous ground on all '+chunks.length+' chunks; colours in [0,1]; weights <= 1',()=>{
 let tris=0;
 chunks.forEach(ch=>{const s=Chunks.surface(ch,[]),a=Ground.chunk(s),b=Ground.chunkOldschool(s);
  assert.strictEqual(b.positions.length,a.positions.length,ch.id+' vertex count');
  for(let i=0;i<a.positions.length;i++)assert.strictEqual(b.positions[i],a.positions[i],ch.id+' position '+i);
  assert.strictEqual(b.colors.length,b.positions.length);assert.strictEqual(b.ground.length,b.positions.length/3*4);
  b.colors.forEach(c=>assert(Number.isFinite(c)&&c>=0&&c<=1,'colour '+c));
  for(let i=0;i<b.ground.length;i+=4){const w=b.ground.slice(i,i+4);assert(w.every(v=>v>=0&&v<=1)&&w.reduce((p,q)=>p+q,0)<=1+1e-9,'weights '+w)}
  tris+=a.positions.length/9});
 assert(tris>30000,'island drawn ('+tris+' triangles)');
});

check('2 gouraud light: flat ground lights 1.0; every lattice vertex has one light shared by all its tiles',()=>{
 const flat={width:4,depth:4,heights:new Array(25).fill(2),materials:new Array(25).fill(1)};Ground.setTerrain(flat);
 [[1,1],[2.5,2.5],[3,1.25]].forEach(([x,z])=>assert(Math.abs(Ground.lightAt(x,z)-1)<1e-9,'flat light at '+x+','+z));
 Ground.setTerrain(T);
 const seen=new Map();let shared=0;
 chunks.slice(40,80).forEach(ch=>{const b=Ground.chunkOldschool(Chunks.surface(ch,[]));
  for(let v=0;v<b.positions.length/3;v++){const k=b.positions[v*3]+','+b.positions[v*3+2],li=Ground.lightAt(b.positions[v*3],b.positions[v*3+2]);
   if(seen.has(k)){assert(Math.abs(seen.get(k)-li)<1e-12,'one light per vertex at '+k);shared++}else seen.set(k,li)}});
 assert(shared>1000,'vertices shared between tiles were compared ('+shared+')');
 const L=[...seen.values()];assert(Math.min(...L)<.95&&Math.max(...L)>1.05,'slopes shade both ways (min '+Math.min(...L).toFixed(2)+', max '+Math.max(...L).toFixed(2)+')');
});

check('3 texture kit: every kit.json entry is a 64 px PNG with a sane mean; the look module fallbacks match kit.json',()=>{
 const kit=JSON.parse(fs.readFileSync(path.join(root,'assets/textures/oldschool/kit.json'),'utf8'));
 const need=['grass_a','grass_b','grass_c','dirt','path','sand','rock','mud','water','brick','stone_course','plaster','planks','beam','thatch','roof_tiles','leaves','needles','bark','bark_birch'];
 need.forEach(n=>{const t=kit.textures[n];assert(t,'kit has '+n);const b=fs.readFileSync(path.join(root,t.file));
  assert.strictEqual(b.slice(1,4).toString(),'PNG',n+' is a PNG');assert.strictEqual(b.readUInt32BE(16),64,n+' width');assert.strictEqual(b.readUInt32BE(20),64,n+' height');
  assert(t.mean.length===3&&t.mean.every(v=>v>.15&&v<.98),n+' mean '+t.mean)});
 const src=fs.readFileSync(path.join(root,'src/holm_oldschool_look.js'),'utf8'),m=/var MEAN=(\{[^;]+\});/.exec(src);assert(m,'MEAN table');
 const MEAN=Function('return '+m[1])();
 Object.keys(MEAN).forEach(n=>MEAN[n].forEach((v,i)=>assert(Math.abs(v-kit.textures[n].mean[i])<.02,'fallback mean '+n+' '+v+' vs kit '+kit.textures[n].mean[i])));
});

check('4 switch: config on by default, ?oldschool=0 turns it off (no textured assets), ?oldschool=1 forces it on; every island model has a verified-only swap',()=>{
 const file=path.join(root,'src/holm_oldschool_look.js');
 function load(search,cfg){delete require.cache[require.resolve(file)];global.location={search:search};global.GameConfig=cfg;const m=require(file);delete global.location;delete global.GameConfig;return m}
 const def=load('',{holmOldschoolLook:true});assert(def.enabled());assert(def.arrivalPackage()&&/^[0-9a-f]{16}$/.test(def.arrivalPackage().exportId),'arrival export pinned');
 // swaps stay off until preload has verified the textured files are served: an unverified swap never changes a URL
 const u='/.studio-workspaces/holm-warden-keep-v8/candidates/keep.glb';assert.strictEqual(def.url(u),u,'unverified swap leaves the URL');
 const ids=def.SWAPS.map(s=>s.id);['survival','keep','kitchen','lodge','bank','mage','lastlight','quarry','haven','cavern','trees','bridges','props1','props3','props5'].forEach(id=>assert(ids.includes(id),'swap '+id));
 def.SWAPS.forEach(s=>{assert(s.probe.length>=1);if(s.map.length===2)assert(s.probe.some(p=>/navigation\.json$/.test(p)),s.id+' probes its graph too')});
 const off=load('?oldschool=0',{holmOldschoolLook:true});assert(!off.enabled());assert.strictEqual(off.arrivalPackage(),null);assert.strictEqual(off.url(u),u);assert.strictEqual(off.waterTexture(),null);
 const cfgOff=load('',{holmOldschoolLook:false});assert(!cfgOff.enabled());
 const forced=load('?oldschool=1',{holmOldschoolLook:false});assert(forced.enabled());
 const r=def.fogRange(33);assert(r.near>33&&r.far>r.near&&r.color===0);
});
console.log('[HOLM OLDSCHOOL LOOK] '+passed+'/4 checks passed');
