'use strict';
// Unit harness for the actual browser-global wrappers, with controlled timer ticks.
// This does not claim browser walking/station/progression acceptance.
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const path=require('node:path');
function load(inv) {
  const timers=new Map(), calls={xp:[],events:[],fallback:0,walk:0,errors:[],now:0,distance:0,messages:[]}; let id=0;
  const context={
    Date:{now:()=>calls.now},CRWorldMode:{providerId:'tutors-holm-v2'},
    ITEMS:{bread:{stack:false}},
    Player:{inv:structuredClone(inv),usingItem:null,action:null,
      count(item){return this.inv.reduce((n,s)=>n+(s&&s.id===item?s.qty:0),0);},
      addXp(...args){calls.xp.push(args);}},
    player:{position:{x:0,y:0,z:0,distanceTo(){return calls.distance;}}},
    UI:{useItem(){calls.fallback++;},chat(m){calls.messages.push(m);},refreshInv(){},closeWorldModals(){}},
    Sfx:{click(){}},Tutorial:{notify(...args){calls.events.push(args);}},
    handleClick(){calls.fallback++;},orderWalk(){calls.walk++;},
    setInterval(fn){timers.set(++id,fn);return id;},clearInterval(id){timers.delete(id);},
    console:{info(){},error(...args){calls.errors.push(args);}}
  };
  vm.createContext(context);
  for(const file of ['bread_recipe.js','cooking_bread.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
  function tick(){for(const fn of [...timers.values()])fn();}
  tick(); assert.equal(timers.size,0,'wrapper bootstrap should complete');
  return {context,calls,tick,timers};
}
function bake(h) {
  h.context.UI.useItem(0);
  h.context.handleClick({userData:{kind:'fire'},position:{x:0,y:0,z:0}});
  assert.equal(h.calls.walk,1);
  h.tick(); assert.equal(h.timers.size,0); assert.deepEqual(h.calls.errors,[]);
}
let passed=0;
function test(name,fn){try{fn();passed++;}catch(error){console.error('[BREAD_WRAPPER_TEST] FAIL '+name);throw error;}}
test('full single-slot bake commits before XP and notification',()=>{
  const h=load([{id:'bread_dough',qty:1}]);
  h.context.Player.addXp=function(...args){
    assert.equal(this.inv[0].id,'bread','XP preceded committed inventory'); h.calls.xp.push(args);
  };
  bake(h); assert.equal(h.context.Player.inv[0].id,'bread');
  assert.deepEqual(h.calls.xp,[['Cooking',40]]); assert.deepEqual(h.calls.events,[['bake','bread']]);
  h.tick(); assert.equal(h.calls.xp.length,1,'timer grants repeated XP');
});
test('failed output insertion never awards XP or tutorial progress',()=>{
  const h=load([{id:'bread_dough',qty:2}]), before=JSON.stringify(h.context.Player.inv);
  bake(h); assert.equal(JSON.stringify(h.context.Player.inv),before);
  assert.deepEqual(h.calls.xp,[]); assert.deepEqual(h.calls.events,[]);
});
test('missing output item never consumes dough',()=>{
  const h=load([{id:'bread_dough',qty:1}]), before=JSON.stringify(h.context.Player.inv);
  delete h.context.ITEMS.bread; bake(h);
  assert.equal(JSON.stringify(h.context.Player.inv),before);
  assert.deepEqual(h.calls.xp,[]); assert.deepEqual(h.calls.events,[]);
});
test('failed mix leaves all ingredient slots intact',()=>{
  const h=load(['bucket_flour','bucket_water','dough'].map(id=>({id,qty:2})));
  const before=JSON.stringify(h.context.Player.inv); h.context.UI.useItem(0);
  assert.equal(JSON.stringify(h.context.Player.inv),before);
  assert.deepEqual(h.calls.xp,[]); assert.deepEqual(h.calls.events,[]);
  assert.deepEqual(h.calls.errors,[]);
});
test('full inventory mix commits one dough without XP',()=>{
  const h=load(['bucket_flour','bucket_water','dough'].map(id=>({id,qty:1})));
  h.context.UI.useItem(0);
  assert.equal(h.context.Player.count('bread_dough'),1);
  for(const id of ['bucket_flour','bucket_water','dough'])assert.equal(h.context.Player.count(id),0);
  assert.deepEqual(h.calls.xp,[]); assert.deepEqual(h.calls.events,[]);
});
test('new action cancels pending bake without consumption',()=>{
  const h=load([{id:'bread_dough',qty:1}]);
  h.context.UI.useItem(0);h.context.handleClick({userData:{kind:'fire'},position:{x:0,y:0,z:0}});
  h.context.Player.action={kind:'other'};h.tick();
  assert.equal(h.context.Player.count('bread_dough'),1);
  assert.deepEqual(h.calls.xp,[]);assert.deepEqual(h.calls.events,[]);assert.equal(h.timers.size,0);
});

function pending(){
 const h=load([{id:'bread_dough',qty:1}]);h.calls.distance=8;h.context.Player.moveTo={x:8,z:0};
 h.context.UI.useItem(0);h.target={userData:{kind:'fire'},position:{x:0,y:0,z:0}};h.context.handleClick(h.target);return h;
}
function cancelled(h){h.tick();assert.equal(h.timers.size,0);assert.equal(h.context.Player.count('bread_dough'),1);assert.deepEqual(h.calls.xp,[]);assert.deepEqual(h.calls.events,[]);assert.deepEqual(h.calls.errors,[]);}
test('unreachable walk cancels instead of waiting indefinitely',()=>{const h=pending();h.context.Player.moveTo=null;cancelled(h);assert.match(h.calls.messages.at(-1),/cannot reach/);});
test('stalled movement expires at thirty seconds',()=>{const h=pending();h.calls.now=29999;h.tick();assert.equal(h.timers.size,1);h.calls.now=30000;cancelled(h);assert.match(h.calls.messages.at(-1),/not reached in time/);});
test('late arrival after deadline gives no loaf',()=>{const h=pending();h.calls.now=30001;h.calls.distance=0;cancelled(h);});
test('plane change cancels bake',()=>{const h=pending();h.context.Player.plane=1;h.calls.distance=0;cancelled(h);});
test('provider change cancels bake',()=>{const h=pending();h.context.CRWorldMode.providerId='mainland';h.calls.distance=0;cancelled(h);});
test('moving target cancels bake',()=>{const h=pending();h.target.position.x=1;h.calls.distance=0;cancelled(h);});
test('expired fire cancels bake',()=>{const h=pending();h.target.userData.ttl=0;h.calls.distance=0;cancelled(h);});
test('nonfinite target cancels bake',()=>{const h=pending();h.target.position.z=NaN;cancelled(h);});
test('nonfinite player cancels bake',()=>{const h=pending();h.context.player.position.y=NaN;cancelled(h);});
test('second bake replaces first pending timer',()=>{const h=pending();h.context.handleClick(h.target);assert.equal(h.timers.size,1);h.calls.distance=0;h.tick();assert.equal(h.context.Player.count('bread'),1);assert.equal(h.calls.xp.length,1);assert.equal(h.calls.events.length,1);assert.equal(h.timers.size,0);});
test('real arrival before deadline still bakes',()=>{const h=pending();h.tick();assert.equal(h.timers.size,1);h.calls.now=29000;h.calls.distance=0;h.tick();assert.equal(h.context.Player.count('bread'),1);assert.equal(h.calls.xp.length,1);assert.equal(h.timers.size,0);});
test('stale replaced callback cannot bake later',()=>{const h=pending();const old=[...h.timers.values()][0];h.context.handleClick(h.target);h.calls.distance=0;old();assert.equal(h.calls.xp.length,0);assert.equal(h.context.Player.count('bread_dough'),1);h.tick();assert.equal(h.calls.xp.length,1);});
console.log('[BREAD_WRAPPER_TEST] '+passed+'/'+passed+' acceptance tests passed');
