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

// ---- look v2 (look pass 2, 2026-09-26) ----
const lookFile=path.join(root,'src/holm_oldschool_look.js');
function loadLook(search,cfg){delete require.cache[require.resolve(lookFile)];global.location={search:search};global.GameConfig=cfg;const m=require(lookFile);delete global.location;delete global.GameConfig;return m}
check('5 look versions: v2 by default, ?lookv=1 / holmLookVersion 1 give the first look exactly (ground table, detail, void)',()=>{
 const v2=loadLook('',{holmOldschoolLook:true}),v1=loadLook('?lookv=1',{holmOldschoolLook:true}),c1=loadLook('',{holmOldschoolLook:true,holmLookVersion:1});
 assert.strictEqual(v2.version(),2);assert.strictEqual(v1.version(),1);assert.strictEqual(c1.version(),1);assert.strictEqual(loadLook('?oldschool=0',{}).version(),0);
 assert.deepStrictEqual(v1.TUNE.grassA,{k:1,s:1.6});assert.deepStrictEqual(v1.TUNE.grassB,{k:.7,s:3.3});assert(v2.TUNE.grassA.k===0&&v2.TUNE.grassB.k<.2,'v2 grass nearly smooth');
 assert(v1.SCENE.fogNear===24&&v1.SCENE.fogFar===32&&v1.SCENE.sunColor===0xfff0d8,'first look void and sun');assert(v2.SCENE.fogFar-v2.SCENE.fogNear<=4,'v2 short void fade');
 // the ground table: v2 changes only the listed keys and setLookVersion(1) restores the first table byte for byte
 const before=JSON.stringify(Ground.LOOK);Ground.setLookVersion(2);
 Object.keys(Ground.LOOK).forEach(k=>{if(!(k in Ground.LOOK_V2))assert.strictEqual(JSON.stringify(Ground.LOOK[k]),JSON.stringify(JSON.parse(before)[k]),'v2 keeps '+k)});
 assert.notStrictEqual(JSON.stringify(Ground.LOOK.palette),JSON.stringify(JSON.parse(before).palette),'v2 underlays differ');
 const ch=chunks[60],s=Chunks.surface(ch,[]),a=Ground.chunk(s),b=Ground.chunkOldschool(s);assert.deepStrictEqual(b.positions,a.positions,'v2 ground: same triangles');
 b.colors.forEach(c=>assert(c>=0&&c<=1));
 Ground.setLookVersion(1);assert.strictEqual(JSON.stringify(Ground.LOOK),before,'setLookVersion(1) restores the first look');
});
check('6 v2 kit: every soft variant exists in kit.json, keeps its first-kit texture size, and every graded family is known',()=>{
 const kit=JSON.parse(fs.readFileSync(path.join(root,'assets/textures/oldschool/kit.json'),'utf8')).textures;const v2=loadLook('',{holmOldschoolLook:true});
 Object.keys(v2.SOFT).forEach(n=>{assert(kit[n],'first kit '+n);const t=kit[v2.SOFT[n]];assert(t,'soft '+v2.SOFT[n]);assert(v2.MEAN[n]&&v2.MEAN[v2.SOFT[n]],'means for '+n);
  const b=fs.readFileSync(path.join(root,t.file));assert.strictEqual(b.readUInt32BE(16),kit[n].size,v2.SOFT[n]+' size');assert.deepStrictEqual(v2.MEAN[v2.SOFT[n]].map(v=>+v.toFixed(2)),t.mean.map(v=>+v.toFixed(2)),v2.SOFT[n]+' mean')});
 Object.values(v2.FAMILY).forEach(f=>assert(v2.GRADE[f],'grade family '+f));
 Object.keys(v2.GRADE).forEach(k=>{const g=v2.GRADE[k];assert(g.gain>0&&g.gain<=1.1&&g.sat>=0&&g.sat<=1&&Math.abs(g.hue)<=30,'grade '+k)});
 // grade(): identity at gain 1 / sat 1, greys stay grey, desaturation keeps luma
 assert.deepStrictEqual(v2.grade([.3,.5,.2],{gain:1,sat:1,hue:0}),[.3,.5,.2]);
 const grey=v2.grade([.4,.4,.4],{gain:.9,sat:.5,hue:0});assert(Math.abs(grey[0]-grey[2])<1e-9);
 const d=v2.grade([.3,.5,.2],{gain:1,sat:.5,hue:0});assert(Math.abs((.299*d[0]+.587*d[1]+.114*d[2])-(.299*.3+.587*.5+.114*.2))<1e-9);
 const pal=JSON.parse(fs.readFileSync(path.join(root,'assets/textures/oldschool/classic_palette.json'),'utf8'));
 assert(pal.colors.length>=16&&pal.colors.length<=128&&pal.colors.some(c=>c[0]===0&&c[1]===0&&c[2]===0),'classic palette: 16..128 colours with black');
});
check('7 v2 regrade: kit-textured materials graded once, shared vertex-coloured materials grade every mesh\'s corners, other images untouched',()=>{
 const v2=loadLook('',{holmOldschoolLook:true});v2.activate({children:[]});
 function col(r,g,b){return {r,g,b,setRGB(x,y,z){this.r=x;this.g=y;this.b=z}}}
 function mat(name,c,vc){return {name,map:{id:name},color:col(...c),vertexColors:!!vc,userData:{},needsUpdate:false}}
 function geo(n){const a=new Float32Array(n*3).fill(1);return {attributes:{color:{array:a,itemSize:3,count:n,normalized:false}},userData:{}}}
 const leaves=mat('olive-leaves',[.5,.5,.4]),plaster=mat('Holm flat colour - plaster',[1,1,1],true),hero=mat('A_SKIN',[.8,.6,.5]),keepRoof=mat('Keep warm shingles',[.7,.5,.4]);
 const g1=geo(4),g2=geo(4);
 const meshes=[{isMesh:true,material:leaves,geometry:geo(3)},{isMesh:true,material:plaster,geometry:g1},{isMesh:true,material:plaster,geometry:g2},{isMesh:true,material:hero,geometry:geo(3)},{isMesh:true,material:keepRoof,geometry:geo(3)}];
 const images=['leaves','plaster','skin-atlas','roof-128'],assoc=new Map([[leaves.map,{type:'textures',index:0}],[plaster.map,{type:'textures',index:1}],[hero.map,{type:'textures',index:2}],[keepRoof.map,{type:'textures',index:3}]]);
 const gltf={parser:{json:{textures:images.map((n,i)=>({source:i})),images:images.map(n=>({name:n}))},associations:assoc},scene:{traverse(f){meshes.forEach(f)}}};
 const n=v2.regrade(gltf);assert.strictEqual(n,3,'leaves, plaster, keep roof graded');
 assert(leaves.color.g<.5*.99&&leaves.userData.oldschoolV2==='leaves','leaves darker');assert.deepStrictEqual([hero.color.r,hero.color.g,hero.color.b],[.8,.6,.5],'character untouched');
 [g1,g2].forEach((g,i)=>{assert(g.userData.oldschoolV2,'plaster mesh '+i+' corners graded');const a=g.attributes.color.array;assert(!(a[0]===1&&a[1]===1&&a[2]===1),'corner colour changed '+i)});
 assert(keepRoof.userData.oldschoolV2==='roof-128'&&keepRoof.color.r<.7,'own-image roof graded by family');
 assert.strictEqual(v2.regrade(gltf),0,'a second pass grades nothing again');
 const v1=loadLook('?lookv=1',{holmOldschoolLook:true});v1.activate({children:[]});const m2=mat('olive-leaves',[.5,.5,.4]);
 assert.strictEqual(v1.regrade({parser:{json:gltf.parser.json,associations:new Map([[m2.map,{type:'textures',index:0}]])},scene:{traverse(f){f({isMesh:true,material:m2,geometry:geo(3)})}}}),0,'the first look never regrades');
});
check('8 classic pixels: off by default, ?classic=1 forces it, whole-number scale to ~503 lines, no render without THREE',()=>{
 const file=path.join(root,'src/classic_pixels.js');
 function load(search,cfg){delete require.cache[require.resolve(file)];global.location={search:search};global.GameConfig=cfg;const m=require(file);delete global.location;delete global.GameConfig;return m}
 const def=load('',{classicPixels:false});assert(!def.enabled());assert(load('?classic=1',{classicPixels:false}).enabled());assert(!load('?classic=0',{classicPixels:true}).enabled());
 assert.deepStrictEqual([700,900,1080,1440,2160].map(h=>def.factorFor(h)),[2,2,2,3,4]);
 assert.strictEqual(def.render({},{},{}),false,'off: the loop renders normally');
});
console.log('[HOLM OLDSCHOOL LOOK] '+passed+'/8 checks passed');
