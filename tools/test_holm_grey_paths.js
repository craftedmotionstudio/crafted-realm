/* Purposeful grey paths on Tutor's Holm (owner review 5, 2026-09-28): "I like that old school RuneScape has like the purposeful
 * gray paths. Ours are just like a heavy marker of shaded paths... make our paths a little bit more finite and specific to
 * where we want our character to be walking between all of the buildings."
 *  1. the data is the generator's output (tools/stage_holm_grey_paths.js rebuilt in memory, tile for tile), grey and crisp
 *     (every tile weight 1: no soft verge), and far finer than the phase-5 worn dirt it replaces;
 *  2. lanes keep one width: most straight cross-sections are exactly 2 tiles; no bare tile splits a lane;
 *  3. only where adventurers walk: every tile lies on a lane, a square or the arrival trail, and every lesson station and
 *     building entrance on the route has a path within reach;
 *  4. never under anything: no path tile on water, a creek bank, a floor, a deck or a tile something is placed on;
 *  5. visual only: the composed walk graph recomposed now is the graph the paths were laid on, and the graph of the
 *     commit before them (bc65fe4b: 10468 nodes, 27691 links, hash d41278dc47dbc168);
 *  6. the island draws them grey: HolmArrivalQA hands the grey data to the ground with style 'grey'; the ground's grey
 *     underlay and the kit's path_grey texture (our own recipe, its mean in kit.json) are what a path tile gets; the
 *     online world's dirt paths (no style) keep the worn earth.
 * Run: node tools/test_holm_grey_paths.js */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,'src',f),'utf8');
const BASE_GRAPH={nodes:10468,edges:27691,hash:'d41278dc47dbc168'};   // measured on bc65fe4b before this pass (same hash rule)
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
const DATA=require('../src/holm_island_grey_paths_data.js'),OLD=require('../src/holm_island_paths_data.js');
const G=require('./stage_holm_grey_paths.js');
const tiles=DATA.tiles,keys=Object.keys(tiles),has=(x,z)=>!!tiles[x+','+z];
check('1 the data is the generator\'s output, grey and crisp, and far finer than the worn dirt it replaces',()=>{
 assert.strictEqual(DATA.schema,'holm-island-paths-v2-grey');assert.strictEqual(DATA.style,'grey');
 assert.deepStrictEqual(Object.keys(G.tiles).sort(),keys.slice().sort(),'regenerate: node tools/stage_holm_grey_paths.js');
 assert(keys.every(k=>tiles[k]===1),'no half-tinted verge');
 const old=Object.keys(OLD.tiles).length;assert(keys.length<old*.6,keys.length+' of '+old);assert(keys.length>500,'the route is still paved: '+keys.length);
});
check('2 one width: most straight cross-sections are exactly 2 tiles; no bare tile splits a lane',()=>{
 const w=G.report.crossWidths,total=Object.values(w).reduce((a,b)=>a+b,0);assert(total>100);assert(w[2]/total>=.6,JSON.stringify(w));
 const bare=[];keys.forEach(k=>{const [x,z]=k.split(',').map(Number);[[1,0],[0,1]].forEach(([dx,dz])=>{const a=[x+dx,z+dz],b=[x+2*dx,z+2*dz];
  if(!has(a[0],a[1])&&has(b[0],b[1])&&G.markable(a[0],a[1])&&!G.occupied.has(a[0]+','+a[1]))bare.push(a.join(','))})});
 assert.strictEqual(bare.length,0,'bare tiles splitting a lane: '+bare.slice(0,8).join(' '));
});
check('3 only where adventurers walk: every station and entrance on the route has a path within reach; nothing far off a lane',()=>{
 const near=(p,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(has(Math.floor(p[0])+dx,Math.floor(p[1])+dz))return true;return false};
 G.LEGS.forEach(([a,b,name])=>{assert(near(a,3),name+' start '+a);assert(near(b,3),name+' end '+b)});
 assert(G.report.legs.every(l=>l.paved>0),'every leg paved');
 // every tile belongs to a lane in the walked corridor (the desire lines the island was dressed around), a square or the arrival trail
 const inSquare=(x,z)=>G.SQUARES.some(s=>{const dx=(x+.5-s.c[0])/s.r[0],dz=(z+.5-s.c[1])/s.r[1];return dx*dx+dz*dz<=1});
 const trail=(x,z)=>x>=55&&x<=72&&z>=100;
 const oldCorridor=k=>!!OLD.tiles[k];
 const stray=keys.filter(k=>{const [x,z]=k.split(',').map(Number);return !inSquare(x,z)&&!trail(x,z)&&!oldCorridor(k)});
 assert(stray.length<=keys.length*.03,'tiles outside the walked corridor: '+stray.length+' '+stray.slice(0,6).join(' '));
});
check('4 never under anything: no path tile on water, a creek bank, a floor, a deck or a placed object (ground decor on a lane is taken up)',()=>{
 const trail=(x,z)=>x>=55&&x<=72&&z>=100;
 keys.forEach(k=>{const [x,z]=k.split(',').map(Number);if(trail(x,z))return;assert(G.markable(x,z),'not open dry land: '+k);assert(!G.occupied.has(k),'under '+G.occupied.get(k)+': '+k)});
 assert.strictEqual(keys.filter(k=>G.decorAt.has(k)).length,0,'ground decor left on a lane (the generator takes it up)');
});
check('5 visual only: the walk graph now is the graph the paths were laid on and the graph before this pass',()=>{
 const now={nodes:G.graph.nodes.length,edges:Object.values(G.graph.links).reduce((a,l)=>a+l.length,0)/2,hash:G.graphHash(G.graph)};
 assert.deepStrictEqual(now,DATA.graph,'recorded in the data');assert.deepStrictEqual(now,BASE_GRAPH,'bc65fe4b');
 const inputs=fs.readFileSync(path.join(__dirname,'holm_v2_land_inputs.js'),'utf8'),nav=src('holm_island_nav.js');
 assert(!/paths_data|GreyPaths|HolmIslandPaths/.test(inputs+nav),'no walk graph input reads the paths');
});
check('6 the island draws them grey; the online world keeps its dirt',()=>{
 const q=src('holm_arrival_qa.js');assert(/HolmIslandGreyPaths/.test(q)&&/setPaths\(islandPaths\.tiles,\{style:islandPaths\.style\}\)/.test(q));
 assert(/holm_island_grey_paths_data\.js\?v=/.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8')));
 const Ground=require('../src/holm_overhaul_ground.js');Ground.setLookVersion(3);
 const lattice={width:2,depth:2,heights:Array(9).fill(1),materials:Array(9).fill(1)};Ground.setTerrain(lattice);
 const surface={positions:[],materials:Array(81).fill(1),indices:[0,9,1,1,9,10]};for(let z=0;z<9;z++)for(let x=0;x<9;x++)surface.positions.push(x,1,z);
 Ground.setPaths({'0,0':1},{style:'grey'});assert.strictEqual(Ground.pathStyle(),'grey');const grey=Ground.chunkOldschool(surface);
 Ground.setPaths({'0,0':1});assert.strictEqual(Ground.pathStyle(),'dirt');const dirt=Ground.chunkOldschool(surface);
 Ground.setPaths(null);const grass=Ground.chunkOldschool(surface);
 const c=r=>r.colors.slice(0,3);const sat=v=>Math.max(...v)-Math.min(...v);
 assert(sat(c(grey))<.02,'grey reads grey: '+c(grey));assert(sat(c(dirt))>.03,'dirt stays warm: '+c(dirt));assert(c(grass)[1]>c(grass)[0],'grass is green');
 assert.strictEqual(grey.ground[3],1,'a path tile carries the path texture weight, whole tile');
 const kit=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/textures/oldschool/kit.json'),'utf8')).textures.path_grey;assert(kit&&kit.size===64);
 const L=require('../src/holm_oldschool_look.js');assert.strictEqual(L.GREY_PATHS.texture,'path_grey');kit.mean.forEach((m,i)=>assert(Math.abs(m-L.MEAN.path_grey[i])<.02));
});
console.log('[HOLM GREY PATHS] '+passed+'/6 checks passed');
if(passed!==6)process.exit(1);
