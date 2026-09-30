/* The ground facts the grey paths of Tutor's Holm are laid on (path tiles pass, 2026-09-29). Read-only: the composed walk
 * graph as the island stands (every blocker), which tiles may carry a path (open dry land: no water, creek bank, floor,
 * deck, arrival-owned tile or placed object), the ground decor, the tree trunks, and the named places the paths join
 * (building doors, lesson stations, bridge and deck ends). Shared by tools/stage_holm_grey_paths.js,
 * tools/audit_holm_path_tiles.js and tools/test_holm_grey_paths.js. Writes nothing.
 * The graph hash rule is the review-5 one (tools/test_holm_grey_paths.js BASE_GRAPH). */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const Nav=require('../src/holm_island_nav');
const I=require('./holm_v2_land_inputs').load();
const T=I.terrain,W=T.width,D=T.depth;
const key=(x,z)=>x+','+z;

// ---------- the composed walk graph (every blocker in place) ----------
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.navBridges,arrivalFootprints:I.arrivalFootprints});
const graph=nav.compile({arrival:true,garden:true});
function graphHash(G){const h=crypto.createHash('sha256');
 G.nodes.map(n=>[n.id,n.x.toFixed(4),n.y.toFixed(4),n.z.toFixed(4),n.surface].join(':')).sort().forEach(s=>h.update(s+'\n'));
 Object.keys(G.links).sort().forEach(k=>h.update(k+'>'+G.links[k].slice().sort().join(',')+'\n'));
 return h.digest('hex').slice(0,16)}
const graphSummary=G=>({nodes:G.nodes.length,edges:Object.values(G.links).reduce((a,l)=>a+l.length,0)/2,hash:graphHash(G)});
const open=n=>n.owner==='land'||(/^b:/.test(n.owner)&&/Terrain$/.test(n.surface));
const nodesAt=(x,z)=>graph.byTile[key(x,z)]||[];

// ---------- what a tile is ----------
const wet=(x,z)=>x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0;
const bank=(x,z)=>!wet(x,z)&&Nav.creekBank(T,x,z);
// 'water' | 'bank' | 'floor' (a building's floor) | 'deck' (bridges, jetty, weir walk, pier) | 'arrival' (the arrival house,
// its approach ribbon and the dock) | 'open' (open walkable ground) | 'none' (dry land the walk graph refuses: steep, a trunk)
function kind(x,z){
 const ns=nodesAt(x,z);
 if(ns.some(n=>n.surface==='deck'||/Deck/.test(n.surface)))return 'deck';   // bridges and decks stand over water and banks
 if(wet(x,z))return 'water';if(bank(x,z))return 'bank';
 if(!ns.length)return 'none';
 if(ns.every(open))return 'open';
 if(ns.some(n=>n.owner==='arrival'))return 'arrival';
 return 'floor';
}
// two neighbouring tiles are joined when the walk graph links a node of one to a node of the other (no cliff, step or wall
// between them); a lane never spans an unjoined edge (it would pave up a cliff)
const linkSet=new Set();graph.nodes.forEach(n=>(graph.links[n.id]||[]).forEach(v=>{const m=graph.byId[v];linkSet.add(n.tx+','+n.tz+'>'+m.tx+','+m.tz)}));
const joined=(x,z,x2,z2)=>linkSet.has(x+','+z+'>'+x2+','+z2)||linkSet.has(x2+','+z2+'>'+x+','+z);
// a lane may still cross an unjoined edge where the ground only steps (the walk graph refuses land steps over 0.9 and
// owner seams over 0.6, but a step of up to STEP_OK reads as ground to the eye, not as a cliff): 'smooth' neighbours
const STEP_OK=1.0,groundY=(x,z)=>{const n=(graph.byTile[x+','+z]||[]).find(open);return n?n.y:null};
const smooth=(x,z,x2,z2)=>{if(joined(x,z,x2,z2))return true;const a=groundY(x,z),b=groundY(x2,z2);return a!==null&&b!==null&&Math.abs(a-b)<=STEP_OK};
const markable=(x,z)=>!wet(x,z)&&!bank(x,z)&&nodesAt(x,z).length>0&&nodesAt(x,z).every(open);

// ---------- what stands on a tile ----------
// every tile something stands on is never paved: prop sets, plants, lesson oaks and rocks, the hollow set, hatches. The ground
// decor (grass clumps, pebbles, daisies: the dressing's no-block 'dress-decor' set) is listed apart: a lane may cross a decor
// tile only when the piece there is taken up (tools/stage_holm_grey_paths.js does that; decor never blocks)
const DECOR_SET='dress-decor';
const occupied=new Map(),occupy=(x,z,why)=>{const k=key(Math.floor(x),Math.floor(z));if(!occupied.has(k))occupied.set(k,why)};
const decorAt=new Map();
function box(x0,x1,z0,z1,why){for(let z=Math.floor(z0);z<=Math.floor(z1-1e-9);z++)for(let x=Math.floor(x0);x<=Math.floor(x1-1e-9);x++)occupy(x,z,why)}
const PROPS_FILE='docs/rebuild/holm-overhaul/island-props.json';
const props=read(PROPS_FILE);
props.sets.forEach(s=>s.placements.forEach(p=>{if(s.id===DECOR_SET){const k=key(Math.floor(p.x),Math.floor(p.z));if(!decorAt.has(k))decorAt.set(k,[]);decorAt.get(k).push(p);return}occupy(p.x,p.z,s.id+':'+p.prop)}));
I.blockers.forEach(b=>box(b.x0,b.x1,b.z0,b.z1,b.id));
const reg=read('docs/rebuild/holm-overhaul/v2land.json'),hab=read(reg.habitat||'.studio-workspaces/holm-habitat-v2land-v1/working/vegetation.json');
hab.placements.forEach(p=>occupy(p.x,p.z,'habitat:'+p.asset));
const TREES=/^(oak|birch|coastal-pine|pine)/;
const trunks=hab.placements.filter(p=>TREES.test(p.asset)).map(p=>({x:p.x,z:p.z,asset:p.asset}));
I.lessons.trees.forEach(t=>trunks.push({x:t.x,z:t.z,asset:'lesson-oak:'+t.id}));
const nearTrunk=new Set();trunks.forEach(p=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)nearTrunk.add(key(Math.floor(p.x)+dx,Math.floor(p.z)+dz))});
// a tile a path may be laid on: open dry land with nothing standing on it
const free=(x,z)=>markable(x,z)&&!occupied.has(key(x,z));

// ---------- the named places the paths join ----------
const tgt=(b,t)=>{const B=I.buildings.find(q=>q.id===b),X=B&&B.graph.targets.find(q=>q.id===t);const n=X&&X.nodeId&&graph.byId['b:'+b+':'+X.nodeId];if(!n)throw Error('no target '+b+':'+t);return [+n.x.toFixed(2),+n.z.toFixed(2)]};
const fishing=I.fishing||{};
// kind: door (a building's way in: tiles are its outside threshold tiles, measured from the walk graph where a floor node
// links to open ground), station (a lesson or tutor stands here), crossing (the Keeper's Stair ends), trail (the arrival
// ribbon), place (a yard or farm the lanes serve). lesson: the 18-lesson route passes it. reach: how far (tiles, square
// distance) a path tile may be from one of its tiles for the place to count as served (a door: on it or beside it).
const PLACES=[
 {id:'dock',name:'the dock (arrival trail)',at:[61,117.5],tiles:[[60,117],[61,117]],kind:'trail',lesson:true,reach:1},
 {id:'guide-house:front-door',name:'Guide House front door',at:[66,104.5],tiles:[[66,104]],kind:'door',lesson:true,reach:1},
 {id:'guide-house:back-door',name:'Guide House back door',at:[66,93.5],tiles:[[65,93],[66,92],[67,93]],kind:'door',lesson:true,reach:1},
 {id:'survival:camp',name:'Survival camp (east openings)',at:[32.5,87],tiles:[[32,86],[32,87],[32,88]],kind:'door',lesson:true,reach:1},
 {id:'survival:trail',name:'Survival camp gate',at:tgt('survival','trail'),tiles:[[40,87]],kind:'station',lesson:true,reach:1},
 {id:'survival:wenna',name:'Wenna (tools)',at:[34.5,89.5],tiles:[[34,89]],kind:'station',lesson:true,reach:1},
 {id:'survival:oaks',name:'teaching oaks',at:[38.5,93.5],tiles:I.lessons.trees.map(t=>[Math.floor(t.x),Math.floor(t.z)]),kind:'station',lesson:true,reach:4},
 {id:'hollow:fire-beach',name:'Fire Beach (Minnow Hollow)',at:[33.5,99.3],tiles:[[33,99]],kind:'station',lesson:true,reach:1},
 {id:'bakehouse:entrance',name:'Bakehouse door',at:tgt('bakehouse','entrance'),tiles:[[45,68]],kind:'door',lesson:true,reach:1},
 {id:'lodge:entrance',name:'Quest Lodge door',at:tgt('lodge','entrance'),tiles:[[35,53]],kind:'door',lesson:true,reach:1},
 {id:'quarry:approach',name:'Quarry Gate',at:tgt('quarry','approach'),tiles:[[33,38],[34,38],[35,37],[35,38]],kind:'door',lesson:true,reach:1},
 {id:'keep:gate',name:"Warden's Keep gate",at:tgt('keep','gate'),tiles:[[88,45],[89,45]],kind:'door',lesson:true,reach:1},
 {id:'bank:entrance',name:'Holm Bank door',at:tgt('bank','entrance'),tiles:[[85,62],[86,62]],kind:'door',lesson:true,reach:1},
 {id:'mage:entrance',name:'Mage tower door',at:tgt('mage','entrance'),tiles:[[106,57],[106,58],[106,59]],kind:'door',lesson:true,reach:1},
 {id:'mage:yard',name:'Mage practice yard',at:tgt('mage','yard'),tiles:[[110,63]],kind:'door',lesson:true,reach:1},
 {id:'lastlight:door',name:'Lastlight storm door',at:tgt('lastlight','door'),tiles:[[113,26]],kind:'door',lesson:true,reach:1},
 {id:'stair:head',name:"Keeper's Stair head",at:tgt('stair','head'),tiles:[[110,22],[111,21]],kind:'crossing',lesson:true,reach:1},
 {id:'stair:foot',name:"Keeper's Stair foot",at:tgt('stair','foot'),tiles:[[104,14]],kind:'crossing',lesson:true,reach:1},
 {id:'haven:shore',name:'the haven pier',at:tgt('haven','shore'),tiles:[[102,17]],kind:'door',lesson:true,reach:1},
 {id:'mill:door',name:'Creakwheel Mill north door',at:[65.5,57.5],tiles:[[64,58],[65,58],[66,58],[67,58]],kind:'door',lesson:false,reach:1},
 {id:'garden:gate',name:"Hettie's Garden gate",at:[52.3,57.6],tiles:[[52,57]],kind:'door',lesson:false,reach:1},
 {id:'farm:yard',name:'Haycombe Farm yard',at:[117,95],tiles:[[117,95]],kind:'place',lesson:false,reach:1}];
// walked through a building: the Guide House's front and back doors are one room apart (the route's first lesson); the
// practice yard lies behind the Mage tower (its south door); the Keeper's Stair is one flight from head to foot
const THROUGH=[['guide-house:front-door','guide-house:back-door'],['mage:entrance','mage:yard'],['stair:head','stair:foot']];
// the crossings: each bridge / deck's two ends (the first and last deck tile), and the arrival ribbon's tiles
const crossings=[];
I.bridges.concat(I.decks).forEach(b=>{if(!b.tiles||!b.tiles.length)return;const a=b.tiles[0],z=b.tiles[b.tiles.length-1];crossings.push({id:b.id,name:b.label||b.id,tiles:b.tiles.map(t=>[t[0],t[1]]),ends:[a,z]})});

// ---------- the ground picture (for the maps) ----------
const S=W+1,H=T.heights,M=T.materials;
function ground(x,z){const c4=[M[z*S+x],M[z*S+x+1],M[(z+1)*S+x],M[(z+1)*S+x+1]],h4=[H[z*S+x],H[z*S+x+1],H[(z+1)*S+x],H[(z+1)*S+x+1]];
 return {mats:c4,slope:+(Math.max(...h4)-Math.min(...h4)).toFixed(3),y:+((h4[0]+h4[1]+h4[2]+h4[3])/4).toFixed(2)}}

module.exports={ROOT,I,T,W,D,key,nav,graph,graphHash,graphSummary,open,nodesAt,joined,smooth,groundY,STEP_OK,wet,bank,kind,markable,occupied,decorAt,trunks,nearTrunk,free,
 tgt,PLACES,THROUGH,crossings,ground,DECOR_SET,PROPS_FILE,hab};
