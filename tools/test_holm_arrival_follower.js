'use strict';
const assert=require('assert'),Follower=require('../src/holm_arrival_follower'),Dock=require('../src/holm_arrival_dock');
const layout=require('../docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes=require('../docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json');
const terrain=require('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'),dock=require('../docs/rebuild/holm-overhaul/arrival-dock.json');
const sources=JSON.stringify({layout,envelopes,terrain,dock}),doors={arrival:true,garden:true},nav=Dock.create(layout,envelopes,terrain,dock);
const cache={};function graphForDoors(d){const key=JSON.stringify(d);return cache[key]||(cache[key]=nav.compile(d))}
const graph=graphForDoors(doors),nodes=Object.fromEntries(graph.nodes.map(n=>[n.id,n]));
const initialGraph=JSON.stringify(graph);
function create(start=dock.destination,speed=2){return Follower.create({navigation:nav,graphForDoors,startNodeId:start,doors,speed})}
function settled(f,target){for(let i=0;i<10000&&f.snapshot().moving;i++){
 const before=f.snapshot(),after=f.update(.05);
 assert(Number.isFinite(after.y));assert(Math.hypot(after.x-before.x,after.z-before.z)<=.1000001);
 assert(nav.support(after.surface,after.x,after.z,doors),'supported pose throughout route');
}assert.strictEqual(f.snapshot().nodeId,target);assert(!f.snapshot().moving)}
const f=create();
for(const target of ['ground:65,97','upper:65,96',dock.destination]){assert(f.order(target));settled(f,target)}
assert.deepStrictEqual({x:f.snapshot().x,y:f.snapshot().y,z:f.snapshot().z,surface:f.snapshot().surface},{x:nodes[dock.destination].x,y:nodes[dock.destination].y,z:nodes[dock.destination].z,surface:'dock'});
assert(f.order('ground:65,97'));f.update(.1);const mid=f.snapshot();assert.strictEqual(mid.nodeId,null);
assert(f.order(dock.destination));assert.deepStrictEqual(f.snapshot(),mid,'repath must not move the actor');settled(f,dock.destination);
assert(f.order('ground:65,97'));f.update(.1);const stopping=f.snapshot();f.stop();assert.deepStrictEqual(f.snapshot(),stopping,'stop queues edge finish');
while(f.snapshot().moving)f.update(.05);assert(f.snapshot().nodeId);assert(Math.hypot(f.snapshot().x-stopping.x,f.snapshot().z-stopping.z)<=1);
const untouched=f.snapshot();assert(!f.order('upper:999,999'));assert.deepStrictEqual(f.snapshot(),untouched);
for(const dt of [-1,NaN,Infinity]){assert.throws(()=>f.update(dt),/dt/);assert.deepStrictEqual(f.snapshot(),untouched)}
assert.deepStrictEqual(f.update(0),untouched);
const large=create();large.order('upper:65,96');const before=large.snapshot();large.update(100000);const after=large.snapshot();
assert(Math.hypot(after.x-before.x,after.z-before.z)<=2*Follower.MAX_DT+1e-8,'stall budget capped');
const invalidMoving=large.snapshot();assert(!large.order('missing'));assert.deepStrictEqual(large.snapshot(),invalidMoving,'invalid order preserves active route');
// Instrument interpolation to check cardinal edge consumption, including high speed.
const pair=[dock.destination,graph.links[dock.destination][0]],longRoute=Array.from({length:101},(_,i)=>pair[i%2]);
let completedEdges=0,lastCompletedEdge=null;
const instrumented=Object.assign({},nav,{route:()=>longRoute,point:(a,b,t,ds)=>{
 assert(Math.abs(a.x-b.x)<1e-9||Math.abs(a.z-b.z)<1e-9,'never interpolate diagonally');
 const key=a.id+'>'+b.id;
 if(t===1&&key!==lastCompletedEdge){completedEdges++;lastCompletedEdge=key}return nav.point(a,b,t,ds);
}});
const bounded=Follower.create({navigation:instrumented,graphForDoors,startNodeId:pair[0],doors,speed:100000});
bounded.order(pair[0]);bounded.update(100000);
assert.strictEqual(completedEdges,Follower.MAX_EDGES,'bounded work even at extreme speed');
assert(bounded.snapshot().moving,'edge-count budget leaves remainder for later update');
assert.strictEqual(bounded.snapshot().nodeId,pair[0]);
const route=nav.route(graph,dock.destination,'ground:65,97'),shut={arrival:false,garden:true},closed=graphForDoors(shut);
const blocked=route.findIndex((id,i)=>i>0&&(!closed.links[route[i-1]]||!closed.links[route[i-1]].includes(id)));
assert(blocked>0);const edgeStart=route[blocked-1],edgeEnd=route[blocked];
const occupied=create(edgeStart);assert(occupied.order(edgeEnd));occupied.update(.1);const occupiedPose=occupied.snapshot();
assert.strictEqual(occupied.setDoors(shut),false,'cannot close an occupied doorway edge');assert.deepStrictEqual(occupied.snapshot(),occupiedPose);
settled(occupied,edgeEnd);
const approaching=create();assert(approaching.order('ground:65,97'));assert(approaching.setDoors(shut));
// Walk the retained valid prefix and stop before the closed edge.
settled(approaching,edgeStart);assert(!approaching.order('ground:65,97'),'closed door blocks new route');
assert(approaching.setDoors(doors));assert(approaching.order('ground:65,97'));settled(approaching,'ground:65,97');
const graphBefore=JSON.stringify(cache),sourceDoors={arrival:true,garden:true};
const detached=Follower.create({navigation:nav,graphForDoors,startNodeId:dock.destination,doors:sourceDoors,speed:2});
sourceDoors.arrival=false;assert(detached.order('ground:65,97'));settled(detached,'ground:65,97');
assert.strictEqual(JSON.stringify(cache),graphBefore);assert.strictEqual(JSON.stringify(graph),initialGraph);
assert.strictEqual(JSON.stringify({layout,envelopes,terrain,dock}),sources);
assert.throws(()=>create('bogus'),/start/);assert.throws(()=>create(dock.destination,Infinity),/speed/);
console.log('[HOLM_ARRIVAL_FOLLOWER] Actual fixture: dock/chart/upstairs return, supported motion, mid-edge repath/stop, atomic door refusal, prefix stop, bounded stall time, invalid input and immutable sources passed. Pure adapter only.');
