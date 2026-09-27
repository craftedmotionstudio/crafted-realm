/* Tutor's Holm v2 land dressing (phase 5, 2026-09-26): the island's density, generated from data and checked on the
 * composed walk graph so nothing it places can cut a route. Deterministic (seeded); re-runnable (it ignores its own
 * previous output: habitat ids and prop set ids start 'dress-').
 *  - Paths: worn paths re-drawn on the v2 land along the island's desire lines (Dijkstra on the composed graph over
 *    open ground and bridge decks, gentle slopes and the old worn tiles preferred), primary legs 3 tiles wide with a
 *    soft verge, secondary legs 1 wide with a soft verge; the arrival trail's tiles are kept.
 *  - Trees in clumps (3-7, species by zone: pines on the coast, cliffs and the crown; birches by the creek and the
 *    pond; oaks and birches in the meadows), clear of paths, yards, stances, doors and pads, to ~260 island trees.
 *  - Clutter: every building's yard kit hugging its walls (yaw along the wall), Haycombe Farm (barn, haystacks, a
 *    fenced paddock with sheep and a cow, cabbage rows, a scarecrow, hens), Lanternfoot Cove (lobster pots, net rack,
 *    an upturned boat, the anchor, the ferry bell), the wayside (the broken carriage beside the old cart track, milestones,
 *    lamp posts, benches at the views, wells) and signposts at the new junctions.
 *  - Ground decor (grass, daisies, pebbles, ferns, bracken, thistles, mushrooms), 12-20 per 100 dry tiles, instanced.
 * Every blocking piece is tried on the walk graph first: it is kept only if every other reachable stance stays
 * reachable (ladders and climbs included), and it never stands on a path, a stance, a doorway, a bridge landing or a gate.
 * Writes: docs/rebuild/holm-overhaul/island-props.json (generated sets), docs/rebuild/holm-overhaul/v2land/habitat.v2land.json
 * (tree and signpost adds; applied by tools/rebuild_holm_v2land.js), src/holm_island_paths_data.js,
 * scratchpad/holm_v2_land/dressing_report.json.
 * Run: node tools/stage_holm_v2land_dressing.js   (then node tools/rebuild_holm_v2land.js --skip-measure) */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const write=(p,o)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(o,null,1)+'\n');
const Nav=require('../src/holm_island_nav'),PropsMod=require('../src/holm_island_props');
const I=require('./holm_v2_land_inputs').load();
const T=I.terrain,W=T.width,D=T.depth,S=W+1,H=T.heights,EPS=1e-9;
const key=(x,z)=>x+','+z;
let seed=20260926;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const pickW=list=>{let t=list.reduce((a,b)=>a+b[1],0)*rand();for(const [v,w] of list){t-=w;if(t<=0)return v}return list[list.length-1][0]};
function hAt(x,z){const ix=Math.min(W-1,Math.max(0,Math.floor(x))),iz=Math.min(D-1,Math.max(0,Math.floor(z))),fx=x-ix,fz=z-iz;
 return (H[iz*S+ix]*(1-fx)+H[iz*S+ix+1]*fx)*(1-fz)+(H[(iz+1)*S+ix]*(1-fx)+H[(iz+1)*S+ix+1]*fx)*fz}
const rise=(x,z)=>{const c=[H[z*S+x],H[z*S+x+1],H[(z+1)*S+x],H[(z+1)*S+x+1]];return Math.max(...c)-Math.min(...c)};
const wet=(x,z)=>x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0;

// ---------- the composed walk graph without this tool's previous output ----------
const blockers=I.blockers.filter(b=>!/^(habitat|prop):dress-/.test(b.id));
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers,bridges:I.navBridges,arrivalFootprints:I.arrivalFootprints});
const g=nav.compile({arrival:true,garden:true});
const open=n=>n.owner==='land'||(/^b:/.test(n.owner)&&/Terrain$/.test(n.surface));
const nodesAt=(x,z)=>g.byTile[key(x,z)]||[];
const openTile=(x,z)=>{const ns=nodesAt(x,z);return ns.length===1&&open(ns[0])};
const jump={},addJ=(a,b)=>{(jump[a]=jump[a]||[]).push(b);(jump[b]=jump[b]||[]).push(a)};
const tgt=(b,t)=>{const B=I.buildings.find(x=>x.id===b),X=B&&B.graph.targets.find(x=>x.id===t);return X&&X.nodeId?'b:'+b+':'+X.nodeId:null};
for(const L of I.ladders){const a=tgt(L.a[0],L.a[1]),b=tgt(L.b[0],L.b[1]);if(a&&b&&g.byId[a]&&g.byId[b])addJ(a,b)}
for(const B of I.buildings)for(const c of B.graph.climbs||[]){const a='b:'+B.id+':'+c.footId,b='b:'+B.id+':'+c.topId;if(g.byId[a]&&g.byId[b])addJ(a,b)}
const spawn=(g.byId['dock:61,125']||g.nodes.find(n=>n.surface==='dock')).id;
const removed=new Set();
function reach(){const seen=new Set([spawn]),q=[spawn];for(let h=0;h<q.length;h++){const u=q[h];for(const v of (g.links[u]||[]).concat(jump[u]||[]))if(!seen.has(v)&&!removed.has(v)){seen.add(v);q.push(v)}}return seen}
let R0=reach();
function footprint(x,z,b,yaw){if(!b)return [];const c=Math.abs(Math.cos(yaw||0)),s=Math.abs(Math.sin(yaw||0)),ex=b[0]*c+b[1]*s,ez=b[0]*s+b[1]*c,out=[];
 for(let tz=Math.floor(z-ez);tz<=Math.floor(z+ez-EPS);tz++)for(let tx=Math.floor(x-ex);tx<=Math.floor(x+ex-EPS);tx++)out.push([tx,tz]);return out}
function tryBlock(tiles){const ids=[];for(const [x,z] of tiles)for(const n of nodesAt(x,z))if(!removed.has(n.id))ids.push(n.id);
 if(!ids.length)return true;ids.forEach(i=>removed.add(i));const R=reach();for(const id of R0)if(!removed.has(id)&&!R.has(id)){ids.forEach(i=>removed.delete(i));return false}R0=R;return true}

// ---------- protected tiles: stances, doorways, bridge landings, gates, lesson objects, the hollow set, arrival ----------
const prot=new Set(),protect=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)prot.add(key(x+dx,z+dz))};
for(const B of I.buildings)for(const t of B.graph.targets){const n=g.byId['b:'+B.id+':'+t.nodeId];if(n)protect(n.tx,n.tz,1)}
g.nodes.forEach(n=>{if(open(n)||n.owner==='arrival')return;(g.links[n.id]||[]).forEach(m=>{const o=g.byId[m];if(o&&open(o)){protect(o.tx,o.tz,2)}})});   // doorways
I.navBridges.forEach(b=>b.tiles.forEach(t=>protect(t[0],t[1],2)));
read('docs/rebuild/holm-overhaul/island-gates.json').gates.forEach(q=>q.tiles.forEach(t=>protect(t[0],t[1],2)));
I.lessons.trees.forEach(t=>protect(Math.floor(t.x),Math.floor(t.z),1));I.lessons.rocks.forEach(t=>protect(Math.floor(t.x),Math.floor(t.z),1));
for(let z=86;z<=105;z++)for(let x=18;x<=37;x++)prot.add(key(x,z));   // Minnow Hollow: dressed in phase 2
g.nodes.forEach(n=>{if(n.owner==='arrival')protect(n.tx,n.tz,1)});
I.arrivalFootprints.forEach(r=>{for(let z=Math.floor(r.z0)-1;z<=Math.ceil(r.z1);z++)for(let x=Math.floor(r.x0)-1;x<=Math.ceil(r.x1);x++)prot.add(key(x,z))});
I.ladders.filter(l=>l.hatch).forEach(l=>protect(Math.floor(l.hatch.x),Math.floor(l.hatch.z),1));
const garden=read('docs/rebuild/holm-overhaul/island-props.json').sets.find(s=>s.id==='hetties-garden');
garden.placements.forEach(p=>protect(Math.floor(p.x),Math.floor(p.z),1));
const buildingTile=new Set();g.nodes.forEach(n=>{if(!open(n)&&n.owner!=='arrival'&&n.owner!=='land'&&n.surface!=='deck')buildingTile.add(key(n.tx,n.tz))});
// solid building footprints (no walkable node at all inside a building's patch) count as walls
const patchOwner={};I.buildings.forEach(B=>{const o=B.graph.placement||B.graph.origin,xs=B.graph.nodes.map(n=>Math.floor(n.x+o.x)),zs=B.graph.nodes.map(n=>Math.floor(n.z+o.z));
 for(let z=Math.min(...zs);z<=Math.max(...zs);z++)for(let x=Math.min(...xs);x<=Math.max(...xs);x++)patchOwner[key(x,z)]=B.id});   // the measured patch rectangle, as the composer claims it

// ---------- 1. paths ----------
const OLD=read('docs/rebuild/holm-overhaul/v2land/v1-snapshot/paths.json').tiles;   // the desire lines (the worn tiles before this tool)
class Heap{constructor(){this.a=[]}push(p,v){const a=this.a;a.push([p,v]);let i=a.length-1;while(i>0){const j=(i-1)>>1;if(a[j][0]<=a[i][0])break;[a[i],a[j]]=[a[j],a[i]];i=j}}
 pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[i],a[m]]=[a[m],a[i]];i=m}}return top}get size(){return this.a.length}}
const walkable=n=>open(n)||n.surface==='deck';
function nearestOpen(x,z){let best=null,d=1e9;g.nodes.forEach(n=>{if(!walkable(n)||removed.has(n.id))return;const k=Math.hypot(n.x-x,n.z-z);if(k<d){d=k;best=n}});return best}
function route(a,b){const A=nearestOpen(a[0],a[1]),B=nearestOpen(b[0],b[1]);const dist={[A.id]:0},prev={},h=new Heap();h.push(0,A.id);
 while(h.size){const [d,u]=h.pop();if(u===B.id)break;if(d>dist[u])continue;const un=g.byId[u];
  for(const v of g.links[u]||[]){const vn=g.byId[v];if(!walkable(vn))continue;const diag=un.tx!==vn.tx&&un.tz!==vn.tz;
   const c=(diag?1.42:1)*(OLD[key(vn.tx,vn.tz)]===1?.7:1)+2.2*Math.abs(vn.y-un.y)+(buildingTile.has(key(vn.tx,vn.tz))?3:0);
   if(dist[v]===undefined||d+c<dist[v]){dist[v]=d+c;prev[v]=u;h.push(d+c,v)}}}
 if(dist[B.id]===undefined)throw Error('no route '+a+' -> '+b);const out=[];for(let p=B.id;p!==undefined;p=prev[p])out.push(g.byId[p]);return out.reverse()}
const ST=(b,t)=>{const n=g.byId[tgt(b,t)];return [n.x,n.z]};
const LEGS=[   // [from, to, primary]
 [[64.5,92.5],ST('survival','trail'),1],[ST('survival','trail'),[33.5,99.3],0],[[40,88],ST('bakehouse','entrance'),1],
 [ST('bakehouse','entrance'),ST('lodge','entrance'),1],[ST('lodge','entrance'),ST('quarry','approach'),1],
 [ST('lodge','entrance'),[70,52.5],1],[[70,52.5],ST('keep','gate'),1],[ST('keep','gate'),ST('bank','entrance'),1],
 [ST('bank','entrance'),ST('mage','entrance'),1],[ST('mage','entrance'),ST('lastlight','door'),1],[ST('lastlight','door'),[110.5,24.5],1],
 [[64.5,92.5],[78.5,79],1],[[78.5,79],ST('bank','entrance'),1],[[70,52.5],[78.5,79],0],
 [ST('bakehouse','entrance'),[57.5,59.5],0],[[62.5,59.5],ST('mill','door'),0],[ST('bakehouse','entrance'),[52.3,57.6],0],
 [ST('mage','entrance'),ST('mage','yard'),0],[ST('mage','entrance'),[121.5,78],1],[[121.5,78],[117,95],1],
 [ST('stair','foot'),ST('haven','shore'),0]];
const paths=new Map(),routes=[];
const markable=(x,z)=>!wet(x,z)&&!Nav.creekBank(T,x,z)&&nodesAt(x,z).length>0&&nodesAt(x,z).every(open);
const mark=(x,z,w)=>{if(!markable(x,z))return;const k=key(x,z);if((paths.get(k)||0)<w)paths.set(k,w)};
// (a function, so section 7 can lay the island's final paths again with the Guide House back path redrawn)
function buildPaths(legs){paths.clear();routes.length=0;
legs.forEach(([a,b,primary])=>{const r=route(a,b);routes.push({from:a,to:b,primary:!!primary,tiles:r.length});
 r.forEach(n=>{if(n.surface==='deck')return;mark(n.tx,n.tz,1);
  const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=[[1,1],[1,-1],[-1,1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]];
  if(primary){N4.forEach(([dx,dz])=>mark(n.tx+dx,n.tz+dz,1));N8.forEach(([dx,dz])=>mark(n.tx+dx,n.tz+dz,.5))}
  else N4.forEach(([dx,dz])=>mark(n.tx+dx,n.tz+dz,.5))})});
// the arrival trail's tiles (dock -> Guide House porch, and the 30 tiles wholly under the trail mesh) stay worn
Object.keys(OLD).forEach(k=>{const [x,z]=k.split(',').map(Number);if(x>=55&&x<=72&&z>=100&&OLD[k]===1)paths.set(k,1)});
// no untinted dry tile may split a worn path (a green tile showing on the brown: tools/test_holm_world_fixes.js 5b)
for(let pass=0;pass<4;pass++){let fixed=0;for(let z=1;z<D-1;z++)for(let x=1;x<W-1;x++){const k=key(x,z);if(paths.has(k)||T.water[z*W+x]||Nav.creekBank(T,x,z))continue;
 const w=(a,b)=>paths.get(key(a,b))===1;if((w(x-1,z)&&w(x+1,z))||(w(x,z-1)&&w(x,z+1))){paths.set(k,1);fixed++}}if(!fixed)break}}
buildPaths(LEGS);
const isPath=(x,z)=>paths.has(key(x,z)),worn=(x,z)=>paths.get(key(x,z))===1;
const nearWorn=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(worn(x+dx,z+dz))return true;return false};

// ---------- placement helpers ----------
// owner review 4 (2026-09-27): clutter pack v2 (a loose spare wheel lies flat; a yard wheel leans on its own stake)
const packs={clutter:'.studio-workspaces/holm-clutter-props-os-v2/candidates/props.glb',route:'.studio-workspaces/holm-route-props-os-v2/candidates/props.glb'};
const man={clutter:read('.studio-workspaces/holm-clutter-props-os-v2/candidates/manifest.json'),route:read('.studio-workspaces/holm-route-props-v2/candidates/manifest.json')};
const blockOf=(pack,prop)=>{const a=man[pack].assets.find(q=>q.name===prop);if(!a)throw Error('no '+prop+' in '+pack);return a.block||null};
const used=new Set();   // tiles taken by a placed blocking piece
const sets={};const put=(set,p)=>{(sets[set]=sets[set]||[]).push(p);return p};
const flatEnough=(tiles,lim)=>{let lo=1e9,hi=-1e9;tiles.forEach(([x,z])=>[H[z*S+x],H[z*S+x+1],H[(z+1)*S+x],H[(z+1)*S+x+1]].forEach(v=>{lo=Math.min(lo,v);hi=Math.max(hi,v)}));return hi-lo<=lim};
function canStand(tiles,opts){opts=opts||{};return tiles.every(([x,z])=>openTile(x,z)&&!prot.has(key(x,z))&&!used.has(key(x,z))&&(opts.onPath||!worn(x,z))&&!removed.has((nodesAt(x,z)[0]||{}).id))&&flatEnough(tiles,opts.flat||.45)}
// place one prop at (x,z) if it may stand there and the walk graph keeps every stance
function place(set,pack,prop,x,z,yaw,extra){const b=blockOf(pack,prop),tiles=b?footprint(x,z,b,yaw):[[Math.floor(x),Math.floor(z)]];
 if(!canStand(tiles,extra&&extra.opts))return null;if(b&&!tryBlock(tiles))return null;
 tiles.forEach(([a,c])=>used.add(key(a,c)));const p=Object.assign({pack,prop,x:+x.toFixed(3),z:+z.toFixed(3),yaw:+(yaw||0).toFixed(4)},extra&&extra.p||{});return put(set,p)}
// try near a wanted spot: rings of candidate tile centres out to r
function near(set,pack,prop,x,z,yaw,r,extra){for(let d=0;d<=(r||2);d++)for(let dz=-d;dz<=d;dz++)for(let dx=-d;dx<=d;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==d)continue;
 const cx=Math.floor(x)+dx+.5+(x-Math.floor(x)-.5),cz=Math.floor(z)+dz+.5+(z-Math.floor(z)-.5);const p=place(set,pack,prop,cx,cz,yaw,extra);if(p)return p}return null}

// ---------- 2. the farm, the cove, the wayside (authored, nudged to valid ground) ----------
function why(pack,prop,x,z,yaw){const b=blockOf(pack,prop),tiles=b?footprint(x,z,b,yaw):[[Math.floor(x),Math.floor(z)]];
 for(const [a,c] of tiles){const k=key(a,c),ns=nodesAt(a,c);if(!ns.length)return 'no-node '+k;if(ns.length>1)return 'multi '+k;if(!open(ns[0]))return 'floor '+k+' '+ns[0].surface;if(prot.has(k))return 'prot '+k;if(used.has(k))return 'used '+k;if(worn(a,c))return 'path '+k;if(removed.has(ns[0].id))return 'removed '+k}
 if(!flatEnough(tiles,.45))return 'slope';return 'connectivity'}
const nearBuildingW=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=key(x+dx,z+dz);if(patchOwner[k]&&!(g.byTile[k]||[]).every(open))return true}return false};
const report={missed:[]};const want=(set,pack,prop,x,z,yaw,r,extra)=>{const p=near(set,pack,prop,x,z,yaw,r,extra);if(!p)report.missed.push(set+':'+prop+'@'+x+','+z+' ('+why(pack,prop,x,z,yaw)+')');return p};
const FARM='dress-haycombe-farm';
want(FARM,'clutter','barn',108.5,92.5,0,3,{p:{name:'Barn',examine:'A timber barn. It smells of hay and warm animals.'}});
want(FARM,'clutter','haystack',114,91.5,0,3);want(FARM,'clutter','haystack',114.5,94.5,.6,3);
[[112.5,93.3,.2],[111.9,94.2,1.4],[115.8,96.2,.5]].forEach(([x,z,y])=>want(FARM,'clutter','hay-bale',x,z,y,1));
// the paddock: fence rails round x 104..110, z 96..99, a gate on the north side, sheep and a cow inside, troughs
for(let x=103;x<=111;x++){if(x!==107)want(FARM,'clutter','fence-run',x+.5,96.5,0,0)}
want(FARM,'clutter','fence-gate',107.5,96.5,0,0);
for(let x=103;x<=111;x++)want(FARM,'clutter','fence-run',x+.5,100.5,0,0);
for(let z=97;z<=99;z++){want(FARM,'clutter','fence-run',103.5,z+.5,Math.PI/2,0);want(FARM,'clutter','fence-run',111.5,z+.5,Math.PI/2,0)}
[[105.2,97.6,.4],[106.8,98.9,2.2],[108.6,97.9,-.8],[109.9,99.1,3.0]].forEach(([x,z,y])=>put(FARM,{pack:'clutter',prop:'sheep',x,z,yaw:y,name:'Sheep',examine:'A Holm sheep. It regards you with total indifference.'}));
put(FARM,{pack:'clutter',prop:'cow',x:107.3,z:97.8,yaw:.9,name:'Cow',examine:'A brown and white cow, chewing thoughtfully.'});
want(FARM,'clutter','feed-trough',105.5,99.5,0,3);want(FARM,'clutter','water-trough',109.5,99.6,0,3);
// the kitchen garden: cabbage rows and a scarecrow; hens by the barn door; a well, a wheelbarrow, tools
[[113.5,97.5],[113.5,98.5],[113.5,99.5]].forEach(([x,z])=>put(FARM,{pack:'clutter',prop:'cabbage-row',x,z,yaw:0}));
want(FARM,'clutter','scarecrow',115.6,98.6,.3,3);
[[108.2,95.1,.4],[109.4,94.7,2.3],[110.6,95.3,4.1],[111.3,94.6,1.1],[107.1,94.8,5.2]].forEach(([x,z,y])=>put(FARM,{pack:'clutter',prop:'chicken',x,z,yaw:y,name:'Chicken',examine:'A hen, pecking at nothing in particular.'}));
want(FARM,'clutter','well',104.8,92.2,0,3,{p:{name:'Well',examine:'A deep well. The water down there is cold and clear.'}});
want(FARM,'clutter','wheelbarrow',111.4,92,1.9,3);want(FARM,'clutter','tools-lean',106.2,94.1,0,3);want(FARM,'clutter','sack-pile',110.9,91.6,0,3);
// Lanternfoot Cove: the fishermen's corner under the cliff, the ferry bell at the pier root
const COVE='dress-lanternfoot-cove';
want(COVE,'clutter','lobster-pot-stack',106.5,16.6,0,3);want(COVE,'clutter','lobster-pot',107.6,15.6,.4,3);want(COVE,'clutter','lobster-pot',107.5,16.7,1.3,3);
want(COVE,'clutter','net-rack',106.5,17.55,0,3);want(COVE,'clutter','fish-crates',108.2,17.3,Math.PI/2,3);want(COVE,'clutter','rope-coil',105.6,16.2,.7,3);
want(COVE,'clutter','rowboat-upturned',95.6,16.2,.25,3);want(COVE,'clutter','anchor',97.4,16.9,.6,3);want(COVE,'clutter','barrel',108.4,15.5,0,3);
want(COVE,'route','cove-bell',102.6,17.4,0,3,{p:{name:'Ferry bell',examine:'Tobin rings it when the skiff is ready to cross.'}});
// the wayside: the broken carriage beside the old cart track, milestones, lamp posts, benches at the views, wells
const WAY='dress-wayside';
want(WAY,'clutter','broken-carriage',81.6,81.3,.25,3,{p:{name:'Broken carriage',examine:"Somebody's journey ended early."}});
want(WAY,'clutter','sack',80.2,83.4,.8,3);want(WAY,'clutter','crate',83.3,83.1,.3,3);
[[62.5,90.5],[78.5,74.5],[70.5,50.5],[99.5,61.5],[118.5,86.5],[56.5,88.5]].forEach(([x,z])=>want(WAY,'clutter','milestone',x,z,rand()*3,3,{opts:{onPath:false}}));
[[66.5,91.2],[46.5,70.5],[84.5,64.5],[104.5,60.5],[113.5,29.5],[90.5,44.5],[77.5,80.5]].forEach(([x,z])=>want(WAY,'clutter','lamp-post',x,z,rand()*6.28,2));
[[112.5,30.5,Math.PI],[58.5,63.5,-1.2],[88.5,64.5,0],[40.5,49.5,.3]].forEach(([x,z,y])=>want(WAY,'clutter','bench',x,z,y,2));
want(WAY,'clutter','well',73.5,55.5,0,3,{p:{name:'Well',examine:'A deep well. The water down there is cold and clear.'}});
want(WAY,'clutter','well',50.5,72.5,0,3,{p:{name:'Well',examine:'A deep well. The water down there is cold and clear.'}});
want(WAY,'clutter','cart-wheel',37.5,40.5,.4,3);

// the kitchen garden's fence (a split rail round the cabbage rows, a gate facing the barn)
for(let x=112;x<=115;x++){if(x!==112)want(FARM,'clutter','fence-run',x+.5,96.5,0,0);want(FARM,'clutter','fence-run',x+.5,100.5,0,0)}
want(FARM,'clutter','fence-gate',112.5,96.5,0,0);for(let z=97;z<=99;z++)want(FARM,'clutter','fence-run',116.5,z+.5,Math.PI/2,0);
// wayside clusters: a few things set down by the road (a barrel and a crate, a sack pile, a spare wheel, a woodpile)
{const KIND=[['barrel','crate'],['sack-pile'],['hay-bale','cart-wheel'],['woodpile'],['barrel','barrel'],['crate-stack'],['sack','crate']];let n=0;const spots=[];
 for(let t=0;t<4000&&n<14;t++){const x=Math.floor(rand()*W),z=Math.floor(rand()*D);if(!openTile(x,z)||worn(x,z)||!nearWorn(x,z,1)||prot.has(key(x,z))||used.has(key(x,z))||nearBuildingW(x,z,4)||spots.some(q=>Math.hypot(q[0]-x,q[1]-z)<11))continue;
  const kit=KIND[n%KIND.length];let ok=0;kit.forEach((prop,i)=>{if(place(WAY,'clutter',prop,x+.5+i,z+.5,rand()*6.28))ok++});if(ok){spots.push([x,z]);n++}}}
// ---------- 3. yard kits: hugging each building's walls ----------
// (owner review 4: "a lot of the wagon wheels that are on the ground are standing vertically upright". A spare wheel is
// never set on its edge by itself: set against a wall it is 'cart-wheel-lean', propped on its stake; anywhere else, the
// wayside and the clusters, 'cart-wheel' lies flat in the grass. Only the handcart's, the wheelbarrow's and the mill's
// wheels stand, on their axles. Same footprints as before, so every placement and route check is unchanged.)
const KITS={survival:['woodpile','chopping-block','barrel','crate','sack-pile','tools-lean','hay-bale','barrel','crate','fish-crates','wheelbarrow'],
 bakehouse:['sack-pile','barrel-apples','crate-stack','water-trough','handcart','sack','barrel','bench','crate','sack','barrel','woodpile','crate'],
 lodge:['bench','barrel','crate','cart-wheel-lean','sack','barrel','crate-stack'],
 quarry:['crate-stack','handcart','wheelbarrow','barrel','sack','tools-lean','crate','cart-wheel-lean','crate','barrel','woodpile','sack-pile'],
 keep:['hay-bale','hay-bale','hay-bale','water-trough','barrel','barrel','crate-stack','cart-wheel-lean','bench','woodpile','crate','crate','handcart'],
 bank:['market-stall','market-stall','barrel','crate','sack-pile','barrel-apples','bench','crate-stack','barrel','sack'],
 mage:['crate','barrel','bench','crate-stack','crate','barrel'],
 mill:['sack-pile','sack-pile','sack','sack','sack','handcart','barrel','crate','wheelbarrow','cart-wheel-lean','crate-stack'],
 lastlight:['crate','barrel','crate-stack','rope-coil','barrel','crate'],
 haven:['lobster-pot','lobster-pot-stack','fish-crates','barrel','crate','rope-coil','anchor']};
const YARD='dress-yards';
Object.keys(KITS).forEach(bid=>{
 // wall tiles: this building's patch tiles with no walkable node, or with a floor node (inside)
 const walls=new Set();Object.keys(patchOwner).forEach(k=>{if(patchOwner[k]!==bid)return;const ns=g.byTile[k]||[];if(!ns.length||ns.some(n=>!open(n)&&n.owner==='b:'+bid))walls.add(k)});
 const cand=[];
 for(const k of walls){const [x,z]=k.split(',').map(Number);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{const X=x+dx,Z=z+dz;if(walls.has(key(X,Z)))return;cand.push({x:X,z:Z,wall:[dx,dz]})})}
 const seen=new Set(),C=cand.filter(c=>{const k=key(c.x,c.z);if(seen.has(k))return false;seen.add(k);return true});
 for(let i=C.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[C[i],C[j]]=[C[j],C[i]]}
 if(process.env.DRESS_DEBUG===bid){const why={};C.forEach(c=>{const k=key(c.x,c.z),r=!nodesAt(c.x,c.z).length?'no-node':nodesAt(c.x,c.z).length>1?'multi':!open(nodesAt(c.x,c.z)[0])?'floor':prot.has(k)?'prot':used.has(k)?'used':isPath(c.x,c.z)?'path':'ok';why[r]=(why[r]||0)+1});console.log('DEBUG',bid,C.length,JSON.stringify(why))}
 const placed=[];
 KITS[bid].forEach(prop=>{
  for(const c of C){if(placed.some(p=>Math.hypot(p.x-c.x-.5,p.z-c.z-.5)<1.7))continue;
   // long axis along the wall; the prop's front (+z local) faces away from it
   const along=c.wall[0]!==0?Math.PI/2:0,face=c.wall[0]!==0?(c.wall[0]>0?Math.PI/2:-Math.PI/2):(c.wall[1]>0?0:Math.PI);
   // a propped wheel faces away from the wall, leaning back onto its stake against it (one rand() drawn, as before, so the
   // rest of the dressing is unchanged)
   const yaw=['bench','market-stall','water-trough','woodpile','handcart','crate-stack','sack-pile','hay-bale'].includes(prop)?face:prop==='cart-wheel-lean'?(rand(),face):along+rand()*.3-.15;
   const off=['woodpile','bench','market-stall','cart-wheel','cart-wheel-lean','tools-lean'].includes(prop)?.12:0;
   // a propped wheel needs the building's wall behind it (the wall tile, or the one past it, holds the building's floor); on
   // a bank or a slope of the patch it lies flat instead
   const floorAt=(x,z)=>(g.byTile[key(x,z)]||[]).some(n=>!open(n)&&n.owner==='b:'+bid),wx=c.x-c.wall[0],wz=c.z-c.wall[1];
   const name=prop==='cart-wheel-lean'&&!(floorAt(wx,wz)||floorAt(wx-c.wall[0],wz-c.wall[1]))?'cart-wheel':prop;
   const p=place(YARD,'clutter',name,c.x+.5+c.wall[0]*off,c.z+.5+c.wall[1]*off,yaw);if(p){p.yard=bid;placed.push({x:p.x,z:p.z});return}}
  report.missed.push('yard:'+bid+':'+prop)})});

// ---------- 4. trees in clumps ----------
const habSrc=read('.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json');
const TREES=new Set(['oak','birch','coastal-pine']);
const baseTrees=habSrc.placements.filter(p=>TREES.has(p.asset)&&!/^dress-/.test(p.id)).length;
const distTo=seeds=>{const d=new Float32Array(W*D).fill(1e9),q=[];seeds.forEach(([x,z])=>{d[z*W+x]=0;q.push([x,z])});
 for(let h=0;h<q.length;h++){const [x,z]=q[h],v=d[z*W+x]+1;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>{const X=x+a,Z=z+b;if(X<0||Z<0||X>=W||Z>=D||d[Z*W+X]<=v)return;d[Z*W+X]=v;q.push([X,Z])})}return d};
const sea=[],fresh=[];for(let z=0;z<D;z++)for(let x=0;x<W;x++){const k=T.water[z*W+x];if(k===1)sea.push([x,z]);else if(k)fresh.push([x,z])}
const dSea=distTo(sea),dFresh=distTo(fresh);
const pads=I.design.pads;const onPad=(x,z)=>pads.some(p=>Math.abs(x-p.x)<=p.w/2+1&&Math.abs(z-p.z)<=p.d/2+1);
const nearBuilding=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=key(x+dx,z+dz);if(patchOwner[k]&&!(g.byTile[k]||[]).every(open))return true}return false};
const treeOk=(x,z)=>openTile(x,z)&&!prot.has(key(x,z))&&!used.has(key(x,z))&&!nearWorn(x,z,2)&&!isPath(x,z)&&rise(x,z)<=1.0&&!onPad(x,z)&&!nearBuilding(x,z,2)&&dSea[z*W+x]>=2&&dFresh[z*W+x]>=2;
const species=(x,z)=>{const y=hAt(x+.5,z+.5);if(dSea[z*W+x]<=6||y>=11||rise(x,z)>.7)return pickW([['coastal-pine',.8],['oak',.2]]);if(dFresh[z*W+x]<=6)return pickW([['birch',.6],['oak',.4]]);return pickW([['oak',.65],['birch',.35]])};
const HAB=[],hab=p=>{HAB.push(p);return p};const TARGET=Math.max(0,262-baseTrees);let added=0,clumps=0;const centres=[];
const radius=habSrc.blockers;
for(let tries=0;tries<6000&&added<TARGET;tries++){
 const cx=Math.floor(rand()*W),cz=Math.floor(rand()*D);if(!treeOk(cx,cz)||centres.some(c=>Math.hypot(c[0]-cx,c[1]-cz)<7))continue;
 const n=3+Math.floor(rand()*5),sp=species(cx,cz);let got=0;
 for(let k=0;k<n*4&&got<n;k++){const a=rand()*6.283,d=k===0?0:1.2+rand()*1.8,x=Math.round(cx+Math.cos(a)*d),z=Math.round(cz+Math.sin(a)*d);
  if(!treeOk(x,z))continue;const s=+(.82+rand()*.2).toFixed(2),r=radius[sp]*s,px=x+.5+(rand()-.5)*.08,pz=z+.5+(rand()-.5)*.08;
  const tiles=footprint(px,pz,[r,r],0);if(!tiles.every(([a,b])=>treeOk(a,b)||(a===x&&b===z)))continue;if(!tryBlock(tiles))continue;
  tiles.forEach(([a,b])=>used.add(key(a,b)));hab({id:'dress-tree-'+HAB.length,asset:sp,x:+px.toFixed(3),z:+pz.toFixed(3),scale:s,yaw:+(rand()*6.283).toFixed(3),source:'v2land-dressing',zone:'clump-'+clumps});got++;added++}
 if(got){centres.push([cx,cz]);clumps++}}

// owner review 4 (2026-09-27): "the statue is colliding with one of the tree branches when we first spawn". An oak's crown
// spreads about three tiles from its trunk, so no dressing tree stands that close to an arrival landmark (the Lantern Keeper
// statue). Filtered after the clumps are grown, so the random draws, and every other tree and prop, are unchanged.
{const land=read('docs/rebuild/holm-overhaul/arrival-landscape.json').placements.filter(p=>p.asset==='statue'),CLEAR=3.2,drop=[];
 for(let i=HAB.length-1;i>=0;i--){const p=HAB[i];if(TREES.has(p.asset)&&land.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<CLEAR)){drop.push(p.id);HAB.splice(i,1)}}
 report.statueClear={radius:CLEAR,dropped:drop};}
// ---------- 5. signposts at the new junctions ----------
const SIGNS=[{near:[37.5,89.5],arms:[['Minnow Hollow',[33.5,99]],['Survival camp',[30,84]],['Guide House',[64,93]]]},
 {near:[48.5,69.5],arms:[['Creakwheel Mill',[64.5,59.5]],['Bakehouse',[44.5,68.5]],['Guide House',[64,92]]]},
 {near:[112.5,27.5],arms:[["Keeper's Stair",[110.5,21.5]],['Lastlight',[115.5,26.5]],['Mage Tower',[106.5,58.5]]]},
 {near:[119.5,93.5],arms:[['Haycombe Farm',[110,95]],['Mage Tower',[106.5,58.5]]]}];
SIGNS.forEach((s,i)=>{let ok=false;for(let d=1;d<=5&&!ok;d++)for(let dz=-d;dz<=d&&!ok;dz++)for(let dx=-d;dx<=d&&!ok;dx++){const x=Math.floor(s.near[0])+dx,z=Math.floor(s.near[1])+dz;
  if(!openTile(x,z)||prot.has(key(x,z))||used.has(key(x,z))||isPath(x,z)||!nearWorn(x,z,1))continue;if(!tryBlock([[x,z]]))continue;used.add(key(x,z));
  hab({id:'dress-signpost-'+i,asset:'signpost',x:x+.5,z:z+.5,scale:1,yaw:0,source:'v2land-dressing',zone:'sign',arms:s.arms.map(([label,to])=>({label,yaw:+Math.atan2(-(to[1]-z-.5),to[0]-x-.5).toFixed(4)}))});ok=true}
 if(!ok)report.missed.push('signpost '+i)});

// ---------- 6. ground decor (no block; instanced) ----------
const DECOR='dress-decor';let dry=0,decor=0;
const treeTiles=new Set(HAB.filter(p=>TREES.has(p.asset)).map(p=>key(Math.floor(p.x),Math.floor(p.z))));habSrc.placements.forEach(p=>{if(TREES.has(p.asset))treeTiles.add(key(Math.floor(p.x),Math.floor(p.z)))});
const nearTree=(x,z)=>{for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(treeTiles.has(key(x+dx,z+dz)))return true;return false};
for(let z=0;z<D;z++)for(let x=0;x<W;x++){if(wet(x,z))continue;dry++;
 if(!openTile(x,z)||worn(x,z)||used.has(key(x,z))||prot.has(key(x,z)))continue;
 const coast=dSea[z*W+x]<=2,steep=rise(x,z)>.8,wood=nearTree(x,z),verge=isPath(x,z);
 const rate=verge?.14:coast?.16:steep?.18:wood?.34:.235;if(rand()>rate)continue;
 const prop=coast?pickW([['pebbles',.6],['grass-clump',.4]]):steep?pickW([['pebbles',.45],['thistle',.3],['grass-clump',.25]]):wood?pickW([['fern',.35],['bracken',.25],['mushrooms',.2],['grass-clump',.2]]):
  verge?pickW([['grass-clump',.6],['daisies',.25],['pebbles',.15]]):pickW([['grass-clump',.5],['daisies',.22],['thistle',.1],['bracken',.08],['pebbles',.1]]);
 put(DECOR,{pack:'clutter',prop,x:+(x+.2+rand()*.6).toFixed(2),z:+(z+.2+rand()*.6).toFixed(2),yaw:+(rand()*6.283).toFixed(2),scale:+(.8+rand()*.45).toFixed(2),noBlock:true});decor++}

// ---------- 7. the Guide House back path (owner review 4, 2026-09-27: "the path out back seems a little random") ----------
// Bram sends a new adventurer out of the back door and west to Wenna. The two legs from the door were routed separately along
// the old desire lines: north, a wide knot where they parted, then west. Now one path leaves the door for a fork a few steps
// out (a signpost: Survival camp / Holm Bank / Guide House), runs straight west-north-west to the timber bridge and on to
// the camp, and the bank leg branches at the fork. Laid after everything else is placed, so the random draws and every other
// path, tree and prop are unchanged; dressing trees, clutter and decor that now stand on the new path are taken off it.
{const DOOR=[64.5,92.5],FORK=[62.5,90.5],BRIDGE=[50.5,87.5],was=new Map(paths);
 const LEGS2=LEGS.filter(l=>!(l[0][0]===DOOR[0]&&l[0][1]===DOOR[1])).concat([[DOOR,FORK,1],[FORK,BRIDGE,1],[BRIDGE,ST('survival','trail'),1],[FORK,[78.5,79],1]]);
 buildPaths(LEGS2);
 const NEW=[...paths.entries()].filter(([k,v])=>v===1&&was.get(k)!==1).map(([k])=>k.split(',').map(Number)),near=(x,z,r)=>NEW.some(([a,b])=>Math.abs(a-x)<=r&&Math.abs(b-z)<=r);
 const off=[];for(let i=HAB.length-1;i>=0;i--){const p=HAB[i];if(TREES.has(p.asset)&&near(Math.floor(p.x),Math.floor(p.z),1)){off.push(p.id);HAB.splice(i,1)}}
 Object.keys(sets).forEach(id=>{sets[id]=sets[id].filter(p=>{const b=p.noBlock?null:blockOf(p.pack,p.prop),t=b?footprint(p.x,p.z,b,p.yaw):[[Math.floor(p.x),Math.floor(p.z)]];
  const hit=t.some(([x,z])=>worn(x,z)&&was.get(key(x,z))!==1);if(hit)off.push(id+':'+p.prop+'@'+p.x+','+p.z);return !hit})});
 const base=habSrc.placements.filter(p=>!/^dress-/.test(p.id)&&TREES.has(p.asset)&&worn(Math.floor(p.x),Math.floor(p.z))&&was.get(key(Math.floor(p.x),Math.floor(p.z)))!==1).map(p=>p.id);
 // the fork's signpost, beside the path
 let sign=null;for(let d=1;d<=3&&!sign;d++)for(let dz=-d;dz<=d&&!sign;dz++)for(let dx=-d;dx<=d&&!sign;dx++){const x=Math.floor(FORK[0])+dx,z=Math.floor(FORK[1])+dz;
  if(!openTile(x,z)||prot.has(key(x,z))||used.has(key(x,z))||isPath(x,z)||!nearWorn(x,z,1))continue;if(!tryBlock([[x,z]]))continue;used.add(key(x,z));
  sign=hab({id:'dress-signpost-back',asset:'signpost',x:x+.5,z:z+.5,scale:1,yaw:0,source:'v2land-dressing',zone:'sign',arms:[['Survival camp',[40.5,87.5]],['Holm Bank',[78.5,79]],['Guide House',DOOR]].map(([label,to])=>({label,yaw:+Math.atan2(-(to[1]-z-.5),to[0]-x-.5).toFixed(4)}))})}
 report.backPath={legs:4,newWornTiles:NEW.length,takenOff:off,baseTreesOnPath:base,signpost:sign&&[sign.x,sign.z]};}

// ---------- write ----------
const pd=read('docs/rebuild/holm-overhaul/island-props.json');
pd.packs=Object.assign({},pd.packs,{clutter:packs.clutter,route:packs.route});
pd.sets=pd.sets.filter(s=>!/^dress-/.test(s.id)).concat(Object.keys(sets).map(id=>({id,generated:'tools/stage_holm_v2land_dressing.js',name:{'dress-haycombe-farm':'Haycombe Farm','dress-lanternfoot-cove':'Lanternfoot Cove','dress-wayside':'The wayside','dress-yards':'Yards','dress-decor':'Ground decor'}[id]||id,placements:sets[id]})));
pd.status='Holm v2 land (2026-09-26): Blender prop sets placed on the island (src/holm_island_props.js). Hettie\'s Garden (phase 3, hand placed); phase 5 sets generated by tools/stage_holm_v2land_dressing.js (yards, Haycombe Farm, Lanternfoot Cove, the wayside, ground decor).';
write('docs/rebuild/holm-overhaul/island-props.json',pd);
const hov=read('docs/rebuild/holm-overhaul/v2land/habitat.v2land.json');hov.add=HAB;hov.note=hov.note.replace(/ Phase 5:.*$/,'')+' Phase 5: tree clumps and junction signposts added by tools/stage_holm_v2land_dressing.js (ids dress-*).';
write('docs/rebuild/holm-overhaul/v2land/habitat.v2land.json',hov);
// the island's working habitat carries the dressing adds as tools/rebuild_holm_v2land.js step 3c applies them: refresh them
// here too, so a dressing run alone leaves the island consistent (the plants that were not dressing adds are untouched)
{const vf='.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json',veg=read(vf),kept=veg.placements.filter(p=>!/^dress-/.test(p.id));
 veg.placements=kept.concat(hov.add.filter(p=>!kept.some(q=>q.id===p.id)));write(vf,veg);}
const tiles=[...paths.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
fs.writeFileSync(path.join(ROOT,'src/holm_island_paths_data.js'),'/* Generated by tools/stage_holm_v2land_dressing.js (Holm v2 land, phase 5, 2026-09-26): worn path tiles on the island, "x,z" ->\n'+
 ' * weight (1 worn, .5 soft verge). Primary legs 3 tiles wide, secondary 1; routed on the v2 land\'s walk graph along the old desire\n * lines; the arrival trail\'s tiles (dock -> Guide House porch, and the tiles wholly under the trail mesh) kept. HolmOverhaulGround\n * tints them to dirt when ?holmIsland=1. Do not edit by hand. */\n'+
 'var HolmIslandPaths={schema:"holm-island-paths-v1",tiles:'+JSON.stringify(Object.fromEntries(tiles))+'};\nif(typeof module!=="undefined"&&module.exports)module.exports=HolmIslandPaths;\n');
const count={};Object.keys(sets).forEach(id=>sets[id].forEach(p=>{count[p.prop]=(count[p.prop]||0)+1}));
const clutterN=Object.keys(sets).filter(id=>id!=='dress-decor').reduce((a,id)=>a+sets[id].length,0),yardN=(sets['dress-yards']||[]).length+(sets['dress-haycombe-farm']||[]).length+(sets['dress-lanternfoot-cove']||[]).length;
Object.assign(report,{pathTiles:tiles.length,worn:tiles.filter(t=>t[1]===1).length,routes,trees:{base:baseTrees,added,total:baseTrees+added,clumps},signposts:HAB.filter(p=>p.asset==='signpost').length,
 clutter:clutterN,inYards:yardN,yardShare:+(yardN/Math.max(1,clutterN)).toFixed(2),decor,dryTiles:dry,decorPer100:+(decor/dry*100).toFixed(1),byProp:count,reachableNodes:R0.size});
write('scratchpad/holm_v2_land/dressing_report.json',report);
console.log('[V2LAND DRESSING]',JSON.stringify({pathTiles:report.pathTiles,worn:report.worn,trees:report.trees,signposts:report.signposts,clutter:report.clutter,yardShare:report.yardShare,decor,decorPer100:report.decorPer100,missed:report.missed.length}));
if(report.missed.length)console.log('  missed:',report.missed.join(', '));
