'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const Nav=require('../src/holm_arrival_navigation'),Checkpoint=require('../src/holm_arrival_checkpoint');
const layout=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/arrival-layout.json'));
const envelopes=JSON.parse(fs.readFileSync('docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json'));
const graph=Nav.create(layout,envelopes).compile({arrival:true,garden:true});
const before=JSON.stringify(graph),revision='arrival-test-1';
const ground=Checkpoint.encode(graph,'ground:66,99',revision),upper=Checkpoint.encode(graph,'upper:66,99',revision);
assert.strictEqual(ground.x,upper.x);assert.strictEqual(ground.z,upper.z);assert.notStrictEqual(ground.y,upper.y);
assert.strictEqual(Checkpoint.restore(graph,JSON.parse(JSON.stringify(ground)),revision).surface,'ground');
assert.strictEqual(Checkpoint.restore(graph,JSON.parse(JSON.stringify(upper)),revision).surface,'upper');
for(const n of graph.nodes){
 const record=Checkpoint.encode(graph,n.id,revision),snapshot=JSON.stringify(record);
 assert.deepStrictEqual(Checkpoint.restore(graph,record,revision),n);
 assert.strictEqual(JSON.stringify(record),snapshot);
}
const restored=Checkpoint.restore(graph,upper,revision);restored.y=500;
const exteriorGraph={schema:'holm-arrival-graph-v1',version:1,nodes:[{id:'exterior:61,118',surface:'exterior',x:61.5,z:118.5,y:1.125}],links:{'exterior:61,118':[]}};
const exterior=Checkpoint.encode(exteriorGraph,'exterior:61,118',revision);
assert.strictEqual(Checkpoint.restore(exteriorGraph,exterior,revision).y,1.125,'terrain checkpoint preserves fractional height and exterior identity');
assert.strictEqual(Checkpoint.restore(graph,upper,revision).y,upper.y,'restored result must not alias graph');
for(const changes of [{schema:'other'},{version:2},{revision:'old'},{surface:'ground'},{nodeId:'missing'},
 {nodeId:ground.nodeId},{x:upper.x+.01},{y:upper.y+.01},{z:upper.z+.01},{x:NaN},{y:Infinity},{z:'99.5'}]){
 assert.throws(()=>Checkpoint.restore(graph,Object.assign({},upper,changes),revision));
}
for(const bad of [null,undefined,{},[],0])assert.throws(()=>Checkpoint.restore(graph,bad,revision));
for(const bad of [null,undefined,'',' ',0,-1,NaN,Infinity,{},1.5])assert.throws(()=>Checkpoint.encode(graph,upper.nodeId,bad));
assert.throws(()=>Checkpoint.restore(graph,Checkpoint.encode(graph,upper.nodeId,1),'1'),'revision type must not coerce');
assert.throws(()=>Checkpoint.encode(graph,'missing',revision));
const clone=()=>JSON.parse(JSON.stringify(graph));
for(const change of [g=>g.nodes=g.nodes.filter(n=>n.id!==upper.nodeId),g=>g.nodes.push(g.nodes.find(n=>n.id===upper.nodeId)),
 g=>delete g.links[upper.nodeId],g=>g.version=2,g=>g.nodes.find(n=>n.id===upper.nodeId).x+=.1,
 g=>g.nodes.find(n=>n.id===upper.nodeId).y=Infinity,g=>g.nodes.find(n=>n.id===upper.nodeId).surface='ground']){
 const bad=clone();change(bad);assert.throws(()=>Checkpoint.restore(bad,upper,revision));
}
assert.strictEqual(JSON.stringify(graph),before,'input graph unchanged');
const context={console:{log() {}}};vm.createContext(context);
vm.runInContext(fs.readFileSync('src/holm_arrival_checkpoint.js','utf8'),context);
assert.strictEqual(context.HolmArrivalCheckpoint.restore(graph,upper,revision).surface,'upper','classic script export');
console.log(`[HOLM_ARRIVAL_CHECKPOINT] ${graph.nodes.length} stance roundtrips; overlapping floors, tampering, revision, invalid/missing nodes, immutability and classic export passed. Storage, mid-edge policy and live save integration remain deferred.`);
