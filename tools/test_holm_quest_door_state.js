const assert=require('node:assert/strict');
const fs=require('node:fs');
const {create}=require('./holm_quest_door_state.js');
const n=JSON.parse(fs.readFileSync('.studio-workspaces/holm-quest-navigation-v1/candidates/navigation.json','utf8'));
const d=JSON.parse(fs.readFileSync('.studio-workspaces/holm-quest-door-v1/candidates/door.json','utf8'));
let count=0;function test(label,fn){fn();count++;console.log('PASS',label)}
const safe=d.safeNodeIds[0],unsafe=n.nodes.find(x=>!d.safeNodeIds.includes(x.id)).id;
test('model drift fails closed',()=>assert.throws(()=>create({...d,modelSha256:'bad'},n)));
test('pose drift fails closed',()=>assert.throws(()=>create({...d,openTimeSeconds:99},n)));
test('invalid envelope fails closed',()=>assert.throws(()=>create({...d,envelope:{...d.envelope,radius:NaN}},n)));
test('unmeasured safe stance fails closed',()=>assert.throws(()=>create({...d,safeNodeIds:[unsafe]},n)));
test('walking excludes door movement',()=>{const c=create(d,n);assert.equal(c.request(false,safe,true).ok,false);assert.equal(c.phase,'open')});
test('doorway obstruction refuses closing',()=>{const c=create(d,n);assert.equal(c.request(false,unsafe,false).ok,false);assert.equal(c.phase,'open')});
test('unknown stance refuses closing',()=>assert.equal(create(d,n).request(false,'missing',false).ok,false));
test('closing stops all navigation until reopened exactly',()=>{const c=create(d,n);assert(c.request(false,safe,false).ok);assert(!c.canWalk);c.tick(.1);assert.equal(c.phase,'closing');assert(!c.request(true,safe,false).ok);c.tick(99);assert.equal(c.phase,'closed');assert.equal(c.time,0);assert(!c.canWalk);assert(c.request(true,safe,false).ok);c.tick(d.openTimeSeconds-.01);assert(!c.canWalk);c.tick(.01);assert(c.canWalk);assert.equal(c.time,n.doorPoseTimeSeconds)});
test('nonfinite or negative ticks rejected',()=>{for(const dt of [NaN,Infinity,-1])assert.throws(()=>create(d,n).tick(dt))});
test('all declared stances independently clear',()=>{const c=create(d,n);for(const id of d.safeNodeIds)assert(c.clear(id))});
console.log(`[QUEST_DOOR_STATE] ${count}/${count} acceptance ok`);
