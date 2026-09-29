/* Purposeful grey paths on Tutor's Holm (owner review 5, 2026-09-28). Owner: "I like that old school RuneScape has like
 * the purposeful gray paths. Ours are just like a heavy marker of shaded paths... make our paths a little bit more finite
 * and specific to where we want our character to be walking between all of the buildings."
 * The phase-5 worn paths (src/holm_island_paths_data.js, tools/stage_holm_v2land_dressing.js) were 3 tiles of dirt with
 * a half-tinted verge on each side (a 5-tile soft band) on 23 desire lines. This tool lays the island's paths again as
 * defined grey-stone lanes, visual only:
 *  - only along the routes adventurers walk: the 18-lesson route between its stations and the lanes that join the
 *    buildings (LEGS below: every leg starts or ends at a building's measured entrance or a lesson station), routed on
 *    the composed walk graph as it stands (every blocker in place), keeping to the old worn corridor where it runs;
 *  - one consistent width: a 2-tile lane (tiles whose centre lies within one tile of the route's smoothed centre line,
 *    drawn on the tile corners), a little wider only in the yards and squares (SQUARES) and at doors (a small apron);
 *  - crisp: every path tile has weight 1 (no half-tinted verge); src/holm_overhaul_ground.js draws them grey;
 *  - never under anything placed (props, decor, plants, lesson objects), never on water, a creek bank, a floor or a deck.
 * The walk graph is not an input of any renderer change: the composed graph hash is written into the data and the
 * report, and tools/test_holm_grey_paths.js recomposes it and proves it identical.
 * Writes: src/holm_island_grey_paths_data.js, scratchpad/holm_paths_rope/grey_paths_report.json.
 * Run: node tools/stage_holm_grey_paths.js   (then node tools/bump_script_versions.js) */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const Nav=require('../src/holm_island_nav');
const I=require('./holm_v2_land_inputs').load();
const T=I.terrain,W=T.width,D=T.depth;
const key=(x,z)=>x+','+z;
// the dressing's worn tiles: the desire lines every tree, prop and decor piece was placed around (weight 1 worn, .5 verge)
const WORN=require('../src/holm_island_paths_data').tiles;

// ---------- the composed walk graph as the island stands (every blocker) ----------
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.navBridges,arrivalFootprints:I.arrivalFootprints});
const g=nav.compile({arrival:true,garden:true});
function graphHash(G){const h=crypto.createHash('sha256');
 G.nodes.map(n=>[n.id,n.x.toFixed(4),n.y.toFixed(4),n.z.toFixed(4),n.surface].join(':')).sort().forEach(s=>h.update(s+'\n'));
 Object.keys(G.links).sort().forEach(k=>h.update(k+'>'+G.links[k].slice().sort().join(',')+'\n'));
 return h.digest('hex').slice(0,16)}
const edges=Object.values(g.links).reduce((a,l)=>a+l.length,0)/2;
const open=n=>n.owner==='land'||(/^b:/.test(n.owner)&&/Terrain$/.test(n.surface));
const walkable=n=>open(n)||n.surface==='deck';
const nodesAt=(x,z)=>g.byTile[key(x,z)]||[];
const tgt=(b,t)=>{const B=I.buildings.find(q=>q.id===b),X=B&&B.graph.targets.find(q=>q.id===t);const n=X&&X.nodeId&&g.byId['b:'+b+':'+X.nodeId];if(!n)throw Error('no target '+b+':'+t);return [n.x,n.z]};
const buildingTile=new Set();g.nodes.forEach(n=>{if(!open(n)&&n.owner!=='arrival'&&n.owner!=='land'&&n.surface!=='deck')buildingTile.add(key(n.tx,n.tz))});

// ---------- what may be painted ----------
const wet=(x,z)=>x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0;
const markable=(x,z)=>!wet(x,z)&&!Nav.creekBank(T,x,z)&&nodesAt(x,z).length>0&&nodesAt(x,z).every(open);
// every tile something stands on is never paved: prop sets, plants, lesson oaks and rocks, the hollow set, hatches. The ground
// decor (grass clumps, pebbles, daisies: the dressing's no-block 'dress-decor' set) is the exception: a lane may cross a decor
// tile and the piece there is taken up, as the review-4 back path did (decor never blocks: the walk graph is unchanged)
const DECOR_SET='dress-decor';
const occupied=new Map(),occupy=(x,z,why)=>{const k=key(Math.floor(x),Math.floor(z));if(!occupied.has(k))occupied.set(k,why)};
const decorAt=new Map();
function box(x0,x1,z0,z1,why){for(let z=Math.floor(z0);z<=Math.floor(z1-1e-9);z++)for(let x=Math.floor(x0);x<=Math.floor(x1-1e-9);x++)occupy(x,z,why)}
const props=read('docs/rebuild/holm-overhaul/island-props.json');
props.sets.forEach(s=>s.placements.forEach(p=>{if(s.id===DECOR_SET){const k=key(Math.floor(p.x),Math.floor(p.z));if(!decorAt.has(k))decorAt.set(k,[]);decorAt.get(k).push(p);return}occupy(p.x,p.z,s.id+':'+p.prop)}));
I.blockers.forEach(b=>box(b.x0,b.x1,b.z0,b.z1,b.id));
const reg=read('docs/rebuild/holm-overhaul/v2land.json'),hab=read(reg.habitat||'.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json');
hab.placements.forEach(p=>occupy(p.x,p.z,'habitat:'+p.asset));
// lanes keep a step clear of tree trunks where they can (a lane wrapped round a trunk reads as paving under a tree)
const TREES=/^(oak|birch|coastal-pine|pine)/,nearTrunk=new Set();hab.placements.filter(p=>TREES.test(p.asset)).forEach(p=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)nearTrunk.add(key(Math.floor(p.x)+dx,Math.floor(p.z)+dz))});
const free=(x,z)=>markable(x,z)&&!occupied.has(key(x,z));

// ---------- routes ----------
class Heap{constructor(){this.a=[]}push(p,v){const a=this.a;a.push([p,v]);let i=a.length-1;while(i>0){const j=(i-1)>>1;if(a[j][0]<=a[i][0])break;[a[i],a[j]]=[a[j],a[i]];i=j}}
 pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;[a[i],a[m]]=[a[m],a[i]];i=m}}return top}get size(){return this.a.length}}
function nearestOpen(x,z){let best=null,d=1e9;g.nodes.forEach(n=>{if(!walkable(n))return;const k=Math.hypot(n.x-x,n.z-z);if(k<d){d=k;best=n}});return best}
// Dijkstra over open ground and bridge decks: the old worn corridor preferred (the desire lines the island was dressed
// around), gentle slopes preferred, building patches avoided
function route(a,b){const A=nearestOpen(a[0],a[1]),B=nearestOpen(b[0],b[1]);const dist={[A.id]:0},prev={},h=new Heap();h.push(0,A.id);
 while(h.size){const [d,u]=h.pop();if(u===B.id)break;if(d>dist[u])continue;const un=g.byId[u];
  for(const v of g.links[u]||[]){const vn=g.byId[v];if(!walkable(vn))continue;const diag=un.tx!==vn.tx&&un.tz!==vn.tz,k=key(vn.tx,vn.tz);
   const c=(diag?1.42:1)*(WORN[k]===1?.55:WORN[k]?.8:1.25)*(occupied.has(k)&&vn.surface!=='deck'?1.6:1)+(nearTrunk.has(k)?.9:0)+2.2*Math.abs(vn.y-un.y)+(buildingTile.has(k)?3:0);
   if(dist[v]===undefined||d+c<dist[v]){dist[v]=d+c;prev[v]=u;h.push(d+c,v)}}}
 if(dist[B.id]===undefined)throw Error('no route '+a+' -> '+b);const out=[];for(let p=B.id;p!==undefined;p=prev[p])out.push(g.byId[p]);return out.reverse()}
const ST=tgt;
const DOOR=[64.5,92.5],FORK=[62.5,90.5],BRIDGE=[50.5,87.5];
// [from, to, name]: the lesson route in lesson order, then the lanes that join the other buildings to it
const LEGS=[
 // the 18-lesson route (the dock -> Guide House porch leg is the arrival trail, drawn by its own ribbon)
 [DOOR,FORK,'Guide House back door -> the fork'],[FORK,BRIDGE,'the fork -> timber bridge'],[BRIDGE,ST('survival','trail'),'timber bridge -> Survival camp'],
 [ST('survival','trail'),[33.5,99.3],'Survival camp -> Hollow Path -> Fire Beach'],
 [[40,88],ST('bakehouse','entrance'),'Survival camp -> Bakehouse'],[ST('bakehouse','entrance'),ST('lodge','entrance'),'Bakehouse -> Quest Lodge'],
 [ST('lodge','entrance'),ST('quarry','approach'),'Quest Lodge -> Quarry Gate'],
 [ST('keep','gate'),ST('bank','entrance'),'Warden\'s Keep gate -> Holm Bank'],[ST('bank','entrance'),ST('mage','entrance'),'Holm Bank -> Mage tower'],
 [ST('mage','entrance'),ST('mage','yard'),'Mage tower -> practice yard'],[ST('mage','entrance'),ST('lastlight','door'),'Mage tower -> Lastlight'],
 [ST('lastlight','door'),ST('stair','head'),'Lastlight -> Keeper\'s Stair'],[ST('stair','foot'),ST('haven','shore'),'Keeper\'s Stair foot -> the haven'],
 // lanes between buildings
 // the east lane leaves the back yard east of the oak by the fork (a lane round a trunk read as paving under a tree)
 [DOOR,[67.5,90.5],'Guide House back door -> east lane'],[[67.5,90.5],[78.5,79],'east lane -> the carriage track'],[[78.5,79],ST('bank','entrance'),'east lane -> Holm Bank'],
 [ST('lodge','entrance'),[70,52.5],'Quest Lodge -> keep lane'],[[70,52.5],ST('keep','gate'),'keep lane -> Warden\'s Keep gate'],
 [ST('bakehouse','entrance'),[57.5,59.5],'Bakehouse -> weir walk (its planks lead on to the Creakwheel Mill door)'],
 [ST('bakehouse','entrance'),[52.3,57.6],'Bakehouse -> Hettie\'s Garden gate'],
 [ST('mage','entrance'),[121.5,78],'Mage tower -> farm lane'],[[121.5,78],[117,95],'farm lane -> Haycombe Farm']];
// yards and squares: a little wider than the lanes (centre, half-width x, half-width z)
const SQUARES=[
 {name:'Holm Bank front court',c:[86.5,64],r:[2.6,1.6]},
 {name:'Warden\'s Keep gate court',c:[89.5,44],r:[2.4,1.6]},
 {name:'Bakehouse junction',c:[46.5,69],r:[2,1.4]},
 {name:'Quarry Gate yard',c:[34.5,40],r:[2,1.5]},
 {name:'Mage tower door',c:[106.5,60],r:[1.8,1.4]}];

// ---------- lay them ----------
const paths=new Map(),why={notMarkable:0,occupied:0,occupiedBy:{}},legRows=[];
function paint(x,z){const k=key(x,z);if(paths.has(k))return true;if(!markable(x,z)){why.notMarkable++;return false}
 if(occupied.has(k)){why.occupied++;const w=occupied.get(k).replace(/[:@].*$/,'');why.occupiedBy[w]=(why.occupiedBy[w]||0)+1;return false}paths.set(k,1);return true}
// Ramer-Douglas-Peucker on the route's tile centres: straight runs stay straight, turns stay where the route turns
function rdp(pts,eps){if(pts.length<3)return pts;const [a,b]=[pts[0],pts[pts.length-1]];let dm=-1,im=0;
 for(let i=1;i<pts.length-1;i++){const d=segDist(pts[i],a,b);if(d>dm){dm=d;im=i}}
 return dm>eps?rdp(pts.slice(0,im+1),eps).slice(0,-1).concat(rdp(pts.slice(im),eps)):[a,b]}
function segDist(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz;let t=L?((p[0]-a[0])*dx+(p[1]-a[1])*dz)/L:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)}
// a lane two tiles wide: the centre line runs on tile corners (the route's tile centres + half a tile), and every tile
// whose centre lies within one tile of it is paved (exactly 2 wide on a straight run, a 2-tile band on a diagonal)
function lane(line,half){const xs=line.map(p=>p[0]),zs=line.map(p=>p[1]);let n=0;
 for(let z=Math.floor(Math.min(...zs)-half-1);z<=Math.ceil(Math.max(...zs)+half+1);z++)for(let x=Math.floor(Math.min(...xs)-half-1);x<=Math.ceil(Math.max(...xs)+half+1);x++){
  const c=[x+.5,z+.5];let d=1e9;for(let i=1;i<line.length;i++)d=Math.min(d,segDist(c,line[i-1],line[i]));if(line.length===1)d=Math.hypot(c[0]-line[0][0],c[1]-line[0][1]);
  if(d<half-1e-6&&paint(x,z))n++}return n}
LEGS.forEach(([a,b,name])=>{const r=route(a,b);if(process.env.DEBUG_LEG&&name.indexOf(process.env.DEBUG_LEG)>=0)console.log(name,JSON.stringify(r.map(n=>[n.tx,n.tz])));let run=[],tiles=0;const flush=()=>{if(run.length){const pts=rdp(run.map(n=>[n.tx+1,n.tz+1]),.75);tiles+=lane(pts,1)}run=[]};
 r.forEach(n=>{if(open(n))run.push(n);else flush()});flush();
 legRows.push({name,from:a,to:b,walked:r.length,paved:tiles})});
SQUARES.forEach(s=>{let n=0;for(let z=Math.floor(s.c[1]-s.r[1]);z<=Math.ceil(s.c[1]+s.r[1]);z++)for(let x=Math.floor(s.c[0]-s.r[0]);x<=Math.ceil(s.c[0]+s.r[0]);x++){
  const dx=(x+.5-s.c[0])/s.r[0],dz=(z+.5-s.c[1])/s.r[1];if(dx*dx+dz*dz<=1&&paint(x,z))n++}s.paved=n});
// the arrival trail's tiles (dock -> Guide House porch): under the trail ribbon, grey like it
Object.keys(WORN).forEach(k=>{const [x,z]=k.split(',').map(Number);if(x>=55&&x<=72&&z>=100&&WORN[k]===1)paths.set(k,1)});   // arrival-owned tiles: not paint()able
// no bare tile may split a lane (a green square showing on the grey): fill a free tile that has path on both opposite sides
for(let pass=0;pass<4;pass++){let fixed=0;for(let z=1;z<D-1;z++)for(let x=1;x<W-1;x++){const k=key(x,z);if(paths.has(k)||!free(x,z))continue;
 const p=(a,b)=>paths.has(key(a,b));if((p(x-1,z)&&p(x+1,z))||(p(x,z-1)&&p(x,z+1))){paths.set(k,1);fixed++}}if(!fixed)break}
// specks: a patch of fewer than 3 tiles cut off from every lane (by a prop or a slope) is taken off
{const seen=new Set();for(const k of [...paths.keys()]){if(seen.has(k))continue;const comp=[k],q=[k];seen.add(k);
 while(q.length){const [x,z]=q.pop().split(',').map(Number);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{const m=key(x+dx,z+dz);if(paths.has(m)&&!seen.has(m)){seen.add(m);comp.push(m);q.push(m)}})}
 if(comp.length<3)comp.forEach(m=>paths.delete(m))}}

// the ground decor under the lanes is taken up (written back to island-props.json below)
const takenUp=[];paths.forEach((v,k)=>{(decorAt.get(k)||[]).forEach(p=>takenUp.push(p))});

// ---------- measures ----------
let dry=0;for(let z=0;z<D;z++)for(let x=0;x<W;x++)if(!wet(x,z))dry++;
// lane width: on each paved tile, the run of paved tiles across the lane's local direction (straight runs only)
const widths={};paths.forEach((v,k)=>{const [x,z]=k.split(',').map(Number),p=(a,b)=>paths.has(key(a,b));
 if(p(x-1,z)&&p(x+1,z)&&!p(x,z-1)!==!p(x,z+1)){let w=1;for(let s of [-1,1])for(let t=1;t<6&&p(x,z+s*t);t++)w++;widths[w]=(widths[w]||0)+1}});
const oldWorn=Object.values(WORN).filter(v=>v===1).length;
const report={generated:'tools/stage_holm_grey_paths.js',tiles:paths.size,dryTiles:dry,share:+(paths.size/dry*100).toFixed(1),
 before:{tiles:Object.keys(WORN).length,worn:oldWorn,verge:Object.keys(WORN).length-oldWorn,share:+(Object.keys(WORN).length/dry*100).toFixed(1)},
 insideOldCorridor:[...paths.keys()].filter(k=>WORN[k]).length,decorTakenUp:takenUp.map(p=>p.prop+'@'+p.x+','+p.z),crossWidths:widths,skipped:why,legs:legRows,squares:SQUARES.map(s=>({name:s.name,paved:s.paved})),
 graph:{nodes:g.nodes.length,edges,hash:graphHash(g)}};
const tiles=[...paths.keys()].sort().map(k=>[k,1]);
// required as a module (tools/test_holm_grey_paths.js): hand back the paths, the graph and the helpers, write nothing
if(require.main!==module){module.exports={tiles:Object.fromEntries(tiles),report,graph:g,markable,occupied,decorAt,takenUp,LEGS,SQUARES,graphHash,open};return}
if(takenUp.length){const pf=path.join(ROOT,'docs/rebuild/holm-overhaul/island-props.json'),raw=fs.readFileSync(pf,'utf8'),nl=raw.indexOf('\r\n')>=0?'\r\n':'\n',pd=JSON.parse(raw),set=pd.sets.find(q=>q.id===DECOR_SET),drop=new Set(takenUp.map(p=>p.prop+'@'+p.x+','+p.z));
 set.placements=set.placements.filter(p=>!drop.has(p.prop+'@'+p.x+','+p.z));fs.writeFileSync(pf,(JSON.stringify(pd,null,1)+'\n').replace(/\n/g,nl))}
fs.writeFileSync(path.join(ROOT,'src/holm_island_grey_paths_data.js'),'/* Generated by tools/stage_holm_grey_paths.js (owner review 5, 2026-09-28): the purposeful grey paths of Tutor\'s Holm, "x,z" -> 1\n'+
 ' * (crisp: no verge). 2-tile lanes along the 18-lesson route and the lanes between the buildings, wider in the yards and\n'+
 ' * squares; nothing under a placed object. HolmOverhaulGround draws them grey (style grey). Replaces the phase-5 worn dirt\n'+
 ' * (src/holm_island_paths_data.js, kept as the dressing\'s record). graph = the composed walk graph these paths were laid on\n'+
 ' * (paths are visual only; tools/test_holm_grey_paths.js proves the graph unchanged). Do not edit by hand. */\n'+
 'var HolmIslandGreyPaths={schema:"holm-island-paths-v2-grey",style:"grey",graph:'+JSON.stringify(report.graph)+',tiles:'+JSON.stringify(Object.fromEntries(tiles))+'};\n'+
 'if(typeof module!=="undefined"&&module.exports)module.exports=HolmIslandGreyPaths;\n');
fs.mkdirSync(path.join(ROOT,'scratchpad/holm_paths_rope'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'scratchpad/holm_paths_rope/grey_paths_report.json'),JSON.stringify(report,null,1)+'\n');
console.log('[HOLM GREY PATHS]',JSON.stringify({tiles:report.tiles,share:report.share,before:report.before,insideOldCorridor:report.insideOldCorridor,crossWidths:widths,skipped:{notMarkable:why.notMarkable,occupied:why.occupied},graph:report.graph}));
