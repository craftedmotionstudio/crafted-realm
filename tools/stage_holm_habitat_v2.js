/* Tutor's Holm habitat v2 (finish goal M4.5): worn paths, habitat groups and signposts over the whole island.
 * Deterministic (seeded). Reads the Sept 13 plan/terrain and the composed island graph (tools/holm_island_inputs).
 *  - Paths: the plan's path polylines (primary ~2 tiles, secondary 1) plus a worn connector from every building's
 *    measured entrance to the nearest path, routed on the walkable island graph (so paths never cross water or walls).
 *  - Habitat: seeded irregular groups separated by open ground, chosen by zone (plan.vegetationDirection):
 *    exposed coast, creek bank, village meadow, woodland edge on the ridge, the Lastlight crown. Trees keep clear of
 *    paths, buildings, bridges and every measured service stance; understory never sits on a path tile.
 *  - Signposts at path junctions, one arm per branch, each arm naming the first place that branch reaches.
 * Keeps the Sept 13 v1 anchors (minus trees under new buildings). Writes .studio-workspaces/holm-habitat-v2/working/
 * {vegetation.json,paths.json} and src/holm_island_paths_data.js (ground tint, loaded before the terrain renders).
 * Run: node tools/stage_holm_habitat_v2.js */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const Nav=require('../src/holm_island_nav');
const I=require('./holm_island_inputs').load({habitat:'v1'});
const T=I.terrain,W=T.width,D=T.depth,plan=I.plan;
const key=(x,z)=>x+','+z,wet=(x,z)=>x<0||z<0||x>=W||z>=D||T.water[z*W+x]!==0;
function h(x,z){const ix=Math.min(W-1,Math.max(0,Math.floor(x))),iz=Math.min(D-1,Math.max(0,Math.floor(z))),fx=x-ix,fz=z-iz,s=W+1,H=T.heights;
 const a=H[iz*s+ix],b=H[iz*s+ix+1],c=H[(iz+1)*s+ix],d=H[(iz+1)*s+ix+1];return fx+fz<=1?a+fx*(b-a)+fz*(c-a):d+(1-fx)*(c-d)+(1-fz)*(b-d)}
let seed=20260924;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};

// ---------- occupied: building patches, measured building tiles, bridge decks, service stances ----------
const nav=Nav.create({terrain:T,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.bridges,arrivalFootprints:I.arrivalFootprints});
const g=nav.compile({arrival:true,garden:false});
const building=new Set(),stance=new Set(),deck=new Set();
g.nodes.forEach(n=>{if(n.owner!=='land'&&!/Terrain$/.test(n.surface||''))building.add(key(n.tx,n.tz))});
I.bridges.forEach(b=>b.tiles.forEach(t=>deck.add(key(t[0],t[1]))));
plan.places.forEach(p=>{for(let z=Math.floor(p.z-p.d/2);z<=Math.ceil(p.z+p.d/2);z++)for(let x=Math.floor(p.x-p.w/2);x<=Math.ceil(p.x+p.w/2);x++)building.add(key(x,z))});
I.buildings.forEach(B=>B.graph.targets.forEach(t=>{const n=g.byId['b:'+B.id+':'+t.nodeId];if(n)stance.add(key(n.tx,n.tz))}));

// ---------- paths ----------
const paths=new Map();   // "x,z" -> weight (1 worn centre, .5 soft edge)
const mark=(x,z,w)=>{const k=key(x,z);if(wet(x,z)||building.has(k)||deck.has(k))return;if((paths.get(k)||0)<w)paths.set(k,w)};
function segDist(px,pz,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz,t=L?Math.max(0,Math.min(1,((px-a[0])*dx+(pz-a[1])*dz)/L)):0;return Math.hypot(px-a[0]-t*dx,pz-a[1]-t*dz)}
plan.paths.forEach(p=>{const wide=p.kind==='primary';
 for(let i=0;i+1<p.points.length;i++){const a=p.points[i],b=p.points[i+1];
  for(let z=Math.floor(Math.min(a[1],b[1]))-2;z<=Math.ceil(Math.max(a[1],b[1]))+2;z++)for(let x=Math.floor(Math.min(a[0],b[0]))-2;x<=Math.ceil(Math.max(a[0],b[0]))+2;x++){
   const d=segDist(x+.5,z+.5,a,b);if(d<=(wide?1.0:.55))mark(x,z,1);else if(wide&&d<=1.45)mark(x,z,.5)}}});
// worn connectors: entrance -> nearest existing worn tile, on walkable land (BFS over the composed graph)
const entrances=I.buildings.map(B=>({id:B.id,node:g.byId['b:'+B.id+':'+B.graph.startId]})).filter(e=>e.node);
const connectors=[];
entrances.forEach(e=>{
 const seen=new Map([[e.node.id,null]]),q=[e.node.id];let hit=null;
 while(q.length&&!hit){const u=q.shift(),n=g.byId[u];if(paths.get(key(n.tx,n.tz))===1&&u!==e.node.id){hit=u;break}
  for(const v of g.links[u]){const m=g.byId[v];if(!seen.has(v)&&(m.owner==='land'||m.surface==='deck'||/Terrain$/.test(m.surface||''))){seen.set(v,u);q.push(v)}}}
 if(!hit){connectors.push({id:e.id,joined:false});return}
 let len=0,first=null;for(let u=hit;u;u=seen.get(u)){const n=g.byId[u];if(n.owner==='land'||/Terrain$/.test(n.surface||'')){mark(n.tx,n.tz,1);if(u!==hit&&!first)first=[n.tx,n.tz]}len++}
 const j=g.byId[hit];connectors.push({id:e.id,joined:true,tiles:len,join:[j.tx,j.tz],toward:first});
});
const isPath=(x,z)=>paths.has(key(x,z));
const nearPath=(x,z,r)=>{for(let dz=-Math.ceil(r);dz<=Math.ceil(r);dz++)for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++)if(Math.hypot(dx,dz)<=r&&isPath(Math.floor(x)+dx,Math.floor(z)+dz))return true;return false};
const nearSet=(set,x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++)if(set.has(key(Math.floor(x)+dx,Math.floor(z)+dz)))return true;return false};

// ---------- habitat ----------
const creekDist=(()=>{const pts=T.creek.points;return (x,z)=>{let m=1e9;for(let i=0;i+1<pts.length;i++)m=Math.min(m,segDist(x,z,pts[i],pts[i+1]));return m}})();
const seaNear=(x,z,r)=>{for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const X=Math.floor(x)+dx,Z=Math.floor(z)+dz;if(wet(X,Z)&&creekDist(X+.5,Z+.5)>3)return true}return false};
function zone(x,z){const y=h(x,z);if(y>=9)return 'crown';if(creekDist(x,z)<4.5)return 'creek';if(seaNear(x,z,4)||y<2)return 'coast';if(y>=5)return 'ridge';return 'meadow'}
const MIX={ // [asset, weight] per zone; trees first, understory after
 coast:{trees:[['coastal-pine',1]],under:[['meadow-tuft',3],['rock-group',2],['stones-small',2]],size:[2,4],treeShare:.45},
 creek:{trees:[['birch',3],['oak',1]],under:[['creek-reeds',3],['stones-small',2],['flower-patch',2],['meadow-tuft',1]],size:[3,5],treeShare:.4},
 meadow:{trees:[['oak',3],['birch',1]],under:[['meadow-tuft',3],['flower-patch',3],['shrub-a',1],['shrub-b',1]],size:[3,6],treeShare:.35},
 ridge:{trees:[['oak',3],['birch',2]],under:[['shrub-a',2],['shrub-b',2],['fallen-log',1],['rock-group',1],['meadow-tuft',1]],size:[4,7],treeShare:.5},
 crown:{trees:[['coastal-pine',1]],under:[['rock-group',2],['stones-small',2],['meadow-tuft',2]],size:[2,4],treeShare:.25}};
const pick=l=>{let s=l.reduce((a,b)=>a+b[1],0),r=rand()*s;for(const [n,w] of l){if((r-=w)<=0)return n}return l[0][0]};
const TREE=new Set(['oak','birch','coastal-pine']),BLOCK={oak:.45,birch:.3,'coastal-pine':.35,'rock-group':.6,'fallen-log':.5,signpost:.2};
const placements=[],rejected=[];
// the Sept 13 v1 anchors stay (they were reviewed); trees under the new buildings were already dropped by the loader
JSON.parse(fs.readFileSync(path.join(ROOT,'.studio-workspaces/holm-habitat-v1/working/vegetation.json'),'utf8')).placements
 .filter(p=>!building.has(key(Math.floor(p.x),Math.floor(p.z))))
 .forEach(p=>placements.push(Object.assign({},p,{source:'v1'})));
function ok(asset,x,z){const tree=TREE.has(asset),X=Math.floor(x),Z=Math.floor(z),k=key(X,Z);
 if(wet(X,Z)||h(x,z)<=.05)return 'off dry land';
 if(asset==='creek-reeds'?creekDist(x,z)>2.2:false)return 'reeds keep to the creek edge';
 if(building.has(k)||deck.has(k))return 'building or deck';
 if(isPath(X,Z))return 'on a path';
 if(tree&&nearPath(x,z,2))return 'tree too close to a path';
 if(!tree&&BLOCK[asset]&&nearPath(x,z,1.2))return 'blocking prop too close to a path';
 if(nearSet(building,x,z,tree?3:1))return 'building clearance';
 if(nearSet(stance,x,z,tree?3:2))return 'service stance clearance';
 if(nearSet(deck,x,z,2))return 'bridge approach';
 for(const p of placements){const r=(TREE.has(p.asset)?2.4:.9)+(tree?2.4:.9);if(Math.hypot(p.x-x,p.z-z)<r*.55)return 'crowded'}
 if(tree){const s=[[-.45,0],[.45,0],[0,-.45],[0,.45]].map(d=>h(x+d[0],z+d[1]));if(Math.max(...s)-Math.min(...s)>.65)return 'steep root support'}
 return null}
function add(asset,x,z,extra){const why=ok(asset,x,z);if(why){rejected.push({asset,x:+x.toFixed(2),z:+z.toFixed(2),reason:why});return false}
 placements.push(Object.assign({id:asset+'-v2-'+placements.length,asset,x:+x.toFixed(3),z:+z.toFixed(3),scale:+(TREE.has(asset)?.8+rand()*.35:.8+rand()*.4).toFixed(3),yaw:+(rand()*Math.PI*2).toFixed(3),source:'v2'},extra||{}));return true}
// group centres on a jittered 7-tile lattice; about a third are skipped so open ground stays between groups
const groups=[];
for(let gz=4;gz<D-2;gz+=7)for(let gx=4;gx<W-2;gx+=7){const cx=gx+rand()*5-2.5,cz=gz+rand()*5-2.5;if(rand()<.3)continue;
 if(wet(Math.floor(cx),Math.floor(cz)))continue;const zn=zone(cx,cz),M=MIX[zn],n=M.size[0]+Math.floor(rand()*(M.size[1]-M.size[0]+1));let got=0;
 for(let i=0;i<n*3&&got<n;i++){const a=rand()*Math.PI*2,r=.6+rand()*2.8,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
  const asset=rand()<M.treeShare?pick(M.trees):pick(M.under);if(add(asset,x,z,{zone:zn}))got++}
 groups.push({x:+cx.toFixed(1),z:+cz.toFixed(1),zone:zn,placed:got})}
// worn soil near buildings stays open (plan: "open lawns and worn soil near buildings"); path verges get sparse tufts/flowers
[...paths.keys()].forEach(k=>{if(rand()>.06)return;const [x,z]=k.split(',').map(Number),s=rand()<.5?1:-1,d=rand()<.5;
 add(rand()<.55?'meadow-tuft':'flower-patch',x+.5+(d?s*1.3:0),z+.5+(d?0:s*1.3),{zone:'verge'})});

// ---------- signposts at junctions ----------
const PLACE_NAME={landing:'Arrival Cove',guide:'Guide House',survival:'Survival Camp',kitchen:'Bakehouse',quest:'Quest Lodge',mine:'Quarry',keep:"Warden's Keep",bank:'Bank',mage:'Mage Tower',lastlight:'Lastlight',ferry:'Departure Haven'};
const worn=k=>paths.get(k)===1,DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
function destination(x,z,dx,dz){ // walk the worn path from a branch; first place whose footprint edge is within 3 tiles
 const seen=new Set([key(x,z)]),q=[[x+dx,z+dz,0]];seen.add(key(x+dx,z+dz));
 while(q.length){const [a,b,d]=q.shift();if(d>90)break;
  for(const p of plan.places){if(Math.abs(a+.5-p.x)<=p.w/2+3&&Math.abs(b+.5-p.z)<=p.d/2+3&&!(Math.abs(x+.5-p.x)<=p.w/2+3&&Math.abs(z+.5-p.z)<=p.d/2+3))return p.id}
  for(const [ex,ez] of DIRS){const k=key(a+ex,b+ez);if(!seen.has(k)&&paths.has(k)){seen.add(k);q.push([a+ex,b+ez,d+1])}}}
 return null}
const signs=[],taken=[];
// junctions from the path lines themselves (a two-wide path has three worn neighbours everywhere): a plan path's end
// that meets another path, and every connector's join point
const J=[];
plan.paths.forEach((p,i)=>[p.points[0],p.points[p.points.length-1]].forEach(e=>{
 if(plan.paths.some((q,k)=>k!==i&&q.points.some((a,n)=>n+1<q.points.length&&segDist(e[0],e[1],a,q.points[n+1])<1.6)))J.push([e[0],e[1]])}));
connectors.forEach(c=>{if(c.joined)J.push([c.join[0]+.5,c.join[1]+.5])});
function branches(jx,jz){ // cardinal directions from the junction along which worn path continues 3 tiles out
 return DIRS.filter(([dx,dz])=>{for(let s=2;s<=4;s++){if(!worn(key(Math.floor(jx+dx*s),Math.floor(jz+dz*s))))return false}return true})}
function destinationFrom(jx,jz,dx,dz){
 const X=Math.floor(jx+dx*3),Z=Math.floor(jz+dz*3),seen=new Set(),q=[[X,Z,0]];seen.add(key(X,Z));
 for(let r=-2;r<=2;r++)for(let s=-2;s<=2;s++)seen.add(key(Math.floor(jx)+r,Math.floor(jz)+s));
 while(q.length){const [a,b,d]=q.shift();if(d>110)break;
  for(const p of plan.places){if(Math.abs(a+.5-p.x)<=p.w/2+2.5&&Math.abs(b+.5-p.z)<=p.d/2+2.5)return p.id}
  for(const [ex,ez] of DIRS){const k=key(a+ex,b+ez);if(!seen.has(k)&&paths.has(k)){seen.add(k);q.push([a+ex,b+ez,d+1])}}}
 return null}
J.forEach(([jx,jz])=>{
 if(taken.some(t=>Math.hypot(t[0]-jx,t[1]-jz)<6))return;
 const arms=[],names=new Set();
 for(const [dx,dz] of branches(jx,jz)){const id=destinationFrom(jx,jz,dx,dz);if(!id||names.has(id))continue;names.add(id);arms.push({place:id,label:PLACE_NAME[id]||id,yaw:+Math.atan2(-dz,dx).toFixed(4)})}
 if(arms.length<2)return;
 // stand the post just off the path at the junction's quietest corner
 for(const [cx,cz] of [[1,1],[-1,1],[1,-1],[-1,-1],[2,1],[-2,1],[1,2],[-1,-2],[2,-1],[-2,-1]]){const px=Math.floor(jx)+.5+cx*1.5,pz=Math.floor(jz)+.5+cz*1.5;
  const X=Math.floor(px),Z=Math.floor(pz);if(isPath(X,Z)||wet(X,Z)||building.has(key(X,Z))||nearSet(stance,px,pz,1)||!nearPath(px,pz,1.1))continue;
  placements.push({id:'signpost-'+signs.length,asset:'signpost',x:+px.toFixed(3),z:+pz.toFixed(3),scale:1,yaw:0,arms:arms.slice(0,3),source:'v2',zone:'sign'});
  signs.push({x:+px.toFixed(2),z:+pz.toFixed(2),arms:arms.map(a=>a.label)});taken.push([jx,jz]);break}});
// ---------- write ----------
const out=path.join(ROOT,'.studio-workspaces/holm-habitat-v2/working');fs.mkdirSync(out,{recursive:true});
const tiles=[...paths.entries()].sort((a,b)=>a[0]<b[0]?-1:1);
const count={};placements.forEach(p=>count[p.asset]=(count[p.asset]||0)+1);
fs.writeFileSync(path.join(out,'vegetation.json'),JSON.stringify({schema:'holm-habitat-study-v2',status:'M4.5 candidate; trees, rock groups, fallen logs and signposts block by footprint',
 blockers:BLOCK,placements,groups,rejected:rejected.slice(0,400)},null,1)+'\n');
fs.writeFileSync(path.join(out,'paths.json'),JSON.stringify({schema:'holm-island-paths-v1',tiles,connectors,signs},null,1)+'\n');
fs.writeFileSync(path.join(ROOT,'src/holm_island_paths_data.js'),'/* Generated by tools/stage_holm_habitat_v2.js (M4.5): worn path tiles on the island draft, "x,z" -> weight\n * (1 worn centre, .5 soft edge). HolmOverhaulGround tints them to dirt when ?holmIsland=1. Do not edit by hand. */\n'
 +'var HolmIslandPaths={schema:"holm-island-paths-v1",tiles:'+JSON.stringify(Object.fromEntries(tiles))+'};\nif(typeof module!=="undefined"&&module.exports)module.exports=HolmIslandPaths;\n');
const rej={};rejected.forEach(r=>rej[r.reason]=(rej[r.reason]||0)+1);
console.log(JSON.stringify({pathTiles:tiles.length,worn:tiles.filter(t=>t[1]===1).length,connectors,placements:placements.length,byAsset:count,groups:groups.length,signs,rejected:rej},null,1));
