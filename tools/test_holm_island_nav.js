/* Headless contract for the island navigation composer (M4.1) on the actual Sept 13 candidates.
 * Run: node tools/test_holm_island_nav.js */
'use strict';
const assert=require('assert'),Nav=require('../src/holm_island_nav'),Follower=require('../src/holm_arrival_follower');
const I=require('./holm_island_inputs').load();
let passed=0;const check=(name,f)=>{f();passed++;console.log('PASS '+name);};
const make=extra=>Nav.create(Object.assign({terrain:I.terrain,arrival:I.arrival,buildings:I.buildings,blockers:I.blockers,bridges:I.bridges,arrivalFootprints:I.arrivalFootprints},extra||{}));
const nav=make(),open={arrival:true,garden:false},closed={arrival:false,garden:false},g=nav.compile(open);
const spawn=g.nodes.find(n=>n.surface==='dock');
function nearest(graph,x,z,any){for(let r=0;r<10;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const q=(graph.byTile[(Math.floor(x)+dx)+','+(Math.floor(z)+dz)]||[]).find(n=>any||n.owner==='land'||n.surface==='deck');if(q)return q}return null}
const W=I.terrain.width,wet=(x,z)=>I.terrain.water[z*W+x]!==0;

check('deterministic: the same inputs compile the same graph',()=>{
 const h=gr=>JSON.stringify(gr.nodes.map(n=>[n.id,+n.y.toFixed(4)]))+JSON.stringify(Object.keys(gr.links).sort().map(k=>[k,gr.links[k].slice().sort()]));
 assert.strictEqual(h(make().compile(open)),h(g));
});
check('whole island: every planned place is reachable from the landing on one graph',()=>{
 // every place has a stance reachable from the landing within a few tiles (building interiors may hold unreachable ledges)
 const reach=new Set(),q=[spawn.id];reach.add(spawn.id);while(q.length){for(const t of g.links[q.pop()])if(!reach.has(t)){reach.add(t);q.push(t)}}
 for(const p of I.plan.places){let ok=false;for(let r=0;r<8&&!ok;r++)for(let dz=-r;dz<=r&&!ok;dz++)for(let dx=-r;dx<=r&&!ok;dx++)ok=(g.byTile[(Math.floor(p.x)+dx)+','+(Math.floor(p.z)+dz)]||[]).some(n=>reach.has(n.id));assert(ok,p.id+' has no reachable stance nearby')}
});
check('Blender buildings join the land: every measured target of all eight buildings is reachable (lane points ceded to a neighbour excepted)',()=>{
 for(const B of I.buildings)for(const t of B.graph.targets){if(B.id==='lodge'&&t.id==='north-lane')continue;assert(nav.route(g,spawn.id,'b:'+B.id+':'+t.nodeId),B.id+'.'+t.id+' unreachable')}
 for(const [b,ids] of [['keep',['gate']],['bakehouse',['oven','pantry','loft']],['lodge',['board','map']]]){
  const B=I.buildings.find(x=>x.id===b);
  for(const id of ids){const t=B.graph.targets.find(x=>x.id===id);assert(t,b+' target '+id);assert(nav.route(g,spawn.id,'b:'+b+':'+t.nodeId),b+'.'+id+' unreachable')}
 }
});
check('cardinal only: every link is one tile north, south, east or west',()=>{
 for(const [id,ls] of Object.entries(g.links))for(const t of ls){const a=g.byId[id],b=g.byId[t];assert(Math.abs(Math.abs(a.x-b.x)+Math.abs(a.z-b.z)-1)<1e-6,id+' -> '+t)}
});
check('water is refused except on bridge decks; the teaching bridge is a real shortcut over the creek',()=>{
 for(const n of g.nodes)if(n.owner==='land'&&n.surface==='land')assert(!wet(n.tx,n.tz),'land node on water '+n.id);
 const decks=g.nodes.filter(n=>n.surface==='deck');assert.strictEqual(decks.length,I.bridges.reduce((s,b)=>s+b.tiles.length,0));
 const nb=make({bridges:[]}),gb=nb.compile(open),kitchen=nearest(gb,44,62);
 // The Sept 13 creek rises inland, so its head can be walked round (open owner question, M4.5); the bridge must
 // still save real distance.
 const withB=nav.route(g,spawn.id,nearest(g,44,62).id).length,without=nb.route(gb,gb.nodes.find(n=>n.surface==='dock').id,kitchen.id);
 assert(withB&&(!without||without.length>withB+10),'bridge saves distance: '+withB+' vs '+(without&&without.length));
 console.log('    dock -> bakehouse: '+withB+' steps with the bridges, '+(without?without.length+' round the creek head':'unreachable')+' without');
});
check('land steps stay within one step of height; seams within the seam step',()=>{
 for(const [id,ls] of Object.entries(g.links))for(const t of ls){const a=g.byId[id],b=g.byId[t];
  if(a.owner==='land'&&b.owner==='land')assert(Math.abs(a.y-b.y)<=Nav.LAND_STEP+1e-9);
  else if(a.owner!==b.owner)assert(Math.abs(a.y-b.y)<=Nav.SEAM_STEP+1e-9,'seam '+id+' -> '+t)}
});
check('blockers refuse their tiles: the Lantern Keeper and the habitat trunks',()=>{
 const statue=I.blockers.find(b=>/statue/.test(b.id));assert(statue);
 for(let z=Math.floor(statue.z0);z<=Math.floor(statue.z1);z++)for(let x=Math.floor(statue.x0);x<=Math.floor(statue.x1);x++)
  if(x+.5>statue.x0&&x+.5<statue.x1&&z+.5>statue.z0&&z+.5<statue.z1)assert(!(g.byTile[x+','+z]||[]).length,'statue tile '+x+','+z+' walkable');
 const trees=I.blockers.filter(b=>/^habitat:oak/.test(b.id));assert(trees.length>5);
 for(const t of trees)for(let z=Math.floor(t.z0);z<=Math.floor(t.z1-1e-9);z++)for(let x=Math.floor(t.x0);x<=Math.floor(t.x1-1e-9);x++)
  if(!(g.byTile[x+','+z]||[]).every(n=>n.owner!=='land'))assert.fail('oak trunk tile walkable '+t.id+' at '+x+','+z);
});
check('the closed arrival door keeps the house shut; open, the hall is reachable',()=>{
 const gc=nav.compile(closed),hall=gc.nodes.find(n=>n.surface==='ground'),start=gc.nodes.find(n=>n.surface==='dock');
 const fromNorth=nav.compile(closed).nodes.find(n=>n.owner==='land'&&n.tz<92&&n.tx>60&&n.tx<72);
 assert(hall&&start);assert.strictEqual(nav.route(gc,start.id,hall.id),null,'closed doors must refuse the hall');
 const go=nav.compile(open);assert(nav.route(go,start.id,go.nodes.find(n=>n.surface==='ground').id),'open door admits');
 assert(fromNorth,'land north of the house');
});
check('the arrival follower walks the composed graph from the dock to the bakehouse oven without leaving it',()=>{
 const f=Follower.create({navigation:nav,graphForDoors:d=>nav.compile(d),startNodeId:spawn.id,doors:open,speed:3});
 const B=I.buildings.find(x=>x.id==='bakehouse'),goal='b:bakehouse:'+B.graph.targets.find(x=>x.id==='oven').nodeId;
 assert(f.order(goal));let s,guard=0;do{s=f.update(.25);guard++}while(s.moving&&guard<4000);
 assert.strictEqual(s.nodeId,goal);assert(Math.abs(s.y-g.byId[goal].y)<1e-6);
});
check('island checkpoints round-trip any settled node and refuse a stale revision or a moved stance',()=>{
 const n=g.nodes.find(x=>x.owner==='b:keep'),rec=Nav.encodeCheckpoint(g,n.id,'holm-island-v1');
 assert.strictEqual(Nav.restoreCheckpoint(g,rec,'holm-island-v1').id,n.id);
 assert.throws(()=>Nav.restoreCheckpoint(g,rec,'holm-island-v2'),/stale/);
 assert.throws(()=>Nav.restoreCheckpoint(g,{...rec,y:rec.y+1},'holm-island-v1'),/mismatch/);
});
console.log('[HOLM_ISLAND_NAV] '+passed+'/'+passed+' checks passed; '+JSON.stringify(nav.stats(open)));
