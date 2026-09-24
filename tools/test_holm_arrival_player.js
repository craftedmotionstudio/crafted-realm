'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const Bridge=require('../src/holm_arrival_player'),Dock=require('../src/holm_arrival_dock');
const layout=require('../docs/rebuild/holm-overhaul/arrival-layout.json'),envelopes=require('../docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json');
const terrain=require('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json'),dock=require('../docs/rebuild/holm-overhaul/arrival-dock.json');
const nav=Dock.create(layout,envelopes,terrain,dock),cache={};
function graphForDoors(d){const key=JSON.stringify(d);return cache[key]||(cache[key]=nav.compile(d))}
const doors={arrival:true,garden:true},graph=graphForDoors(doors),nodes=Object.fromEntries(graph.nodes.map(n=>[n.id,n]));
class Vec{constructor(x,y,z){this.set(x,y,z)}set(x,y,z){Object.assign(this,{x,y,z});return this}clone(){return new Vec(this.x,this.y,this.z)}}
function setup(id,canMove){const n=nodes[id],actor={position:new Vec(n.x,n.y,n.z),lookAt(){}},state={moveSpeed:()=>4.2,moveTo:null,path:[],stunT:0,action:null};return {actor,state,b:Bridge.create({actor,state,navigation:nav,graphForDoors,startNodeId:id,doors,canMove})}}
const {actor,state,b}=setup(dock.destination);
let ready=false;const gated=setup(dock.destination,()=>ready);assert(gated.b.order(nodes['upper:65,96']));
const waiting=JSON.stringify(gated.b.snapshot());gated.b.update(.1,{keys:{w:true}});assert.equal(JSON.stringify(gated.b.snapshot()),waiting,'door swing pauses keyboard and queued route without losing it');
ready=true;gated.b.update(.1);assert.notEqual(JSON.stringify(gated.b.snapshot()),waiting,'route resumes after swing');
assert(b.order(nodes['upper:65,96']));let frames=0;
while(b.snapshot().moving&&frames++<2000){const p=actor.position.clone();b.update(.05);assert(Math.abs(actor.position.x-p.x)+Math.abs(actor.position.z-p.z)<=.21+1e-7,'movement consumes cardinal distance budget even across a corner');assert(nav.support(b.snapshot().surface,actor.position.x,actor.position.z,doors),'actual actor feet supported')}
assert(frames<2000);assert.strictEqual(b.snapshot().nodeId,'upper:65,96');assert.strictEqual(state.moveTo,null);
const before=JSON.stringify(b.snapshot());assert(!b.order({x:65.5,y:999,z:96.5}));assert.strictEqual(JSON.stringify(b.snapshot()),before,'wrong floor click untouched');
assert(b.order(nodes[dock.destination]));b.update(.05);const stopped=actor.position.clone();state.stunT=2;b.update(.1);assert.deepStrictEqual(actor.position,stopped,'stun freezes feet');state.stunT=0;
while(b.snapshot().moving)b.update(.05);assert(b.snapshot().nodeId,'resume settles current edge');assert.strictEqual(state.moveTo,null);
const manual=setup('dock:61,125');manual.state.action={type:'test'};
manual.b.update(.05,{keys:{w:true,d:true},yaw:0});assert.strictEqual(manual.state.action,null);
for(let i=0;i<10;i++)manual.b.update(.05,{keys:{w:true},yaw:0});
assert(nav.support(manual.b.snapshot().surface,manual.actor.position.x,manual.actor.position.z,doors));
for(let i=0;i<20;i++)manual.b.update(.05,{keys:{}});assert(!manual.b.snapshot().moving,'key release settles without drifting');
const badActor={position:new Vec(0,0,0)};assert.throws(()=>Bridge.create({actor:badActor,state,navigation:nav,graphForDoors,startNodeId:dock.destination,doors}),/exact supported/);
// Appearance loading replaces the player container while preserving its pose.
const swap=setup('dock:61,125');assert(swap.b.order(nodes[dock.destination]));swap.b.update(.05);
const retired=swap.actor.position.clone(),replacement={position:retired.clone(),lookAt(){}};
assert.throws(()=>swap.b.replaceActor(badActor),/replacement actor changed/);
swap.b.replaceActor(replacement);swap.b.update(.05);
assert.deepStrictEqual(swap.actor.position,retired,'retired appearance container is no longer moved');
assert.notDeepStrictEqual(replacement.position,retired,'replacement continues the active route');
while(swap.b.snapshot().moving)swap.b.update(.05);
assert.strictEqual(swap.b.snapshot().nodeId,dock.destination);
// Execute the actual game's orderWalk function to verify guarded delegation.
const source=fs.readFileSync(require('path').join(__dirname,'../src/game5_main.js'),'utf8');
const hook=source.slice(source.indexOf('function orderWalk(point){'),source.indexOf('// player animation:'));
let routed=0;const ctx=vm.createContext({HolmArrivalPlayer:{active:()=>true,order:p=>{routed++;return p.x===4}},Player:{},THREE:{Vector3:Vec}});
vm.runInContext(hook,ctx);assert(vm.runInContext('orderWalk({x:4,y:2,z:3})',ctx));assert.strictEqual(routed,1);
ctx.HolmArrivalPlayer.active=()=>false;ctx.player={position:new Vec(0,0,0)};ctx.computePath=()=>({pts:[[1.5,2.5]],reached:true});ctx.pElev=()=>3;
vm.runInContext('orderWalk({x:1.5,y:3,z:2.5})',ctx);assert.strictEqual(ctx.Player.path.length,1);assert.strictEqual(routed,1,'inactive hook retains ordinary movement');
console.log('[HOLM_ARRIVAL_PLAYER] real actor-vector movement, floor rejection, cardinal keyboard, stun/cancel, attach guard and actual orderWalk dispatch passed; no provider activation.');
