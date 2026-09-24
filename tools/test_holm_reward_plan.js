'use strict';
const assert=require('assert');
const vm=require('vm');
const fs=require('fs');
const path=require('path');
const planner=require('../src/holm_reward_plan.js');
const defs={coins:{stack:true},bread:{stack:false},bow:{stack:false},shield:{stack:false}};
const add=(id,qty)=>({id,qty});
const keep=id=>({id,qty:1,mode:'keep-one'});
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('full inventory still accepts existing stacks',()=>{
  const r=planner.plan([{id:'coins',qty:5},{id:'bread',qty:1}],{},defs,[add('coins',25)]);
  assert(r.ok);assert.strictEqual(r.inventory[0].qty,30);assert.strictEqual(r.requiredSlots,0);
});
check('partial space cannot partially deliver nonstack reward',()=>{
  const r=planner.plan([{id:'coins',qty:5},null],{},defs,[add('coins',25),add('bread',3)]);
  assert.deepStrictEqual(r,{ok:false,code:'insufficient-space',requiredSlots:3,freeSlots:1,missingSlots:2});
  assert(!('inventory' in r));
});
check('new stacks combine and nonstack quantities split into slots',()=>{
  const r=planner.plan([null,null,null],{},defs,[add('coins',2),add('bread',2),add('coins',3)]);
  assert(r.ok);assert.deepStrictEqual(r.inventory,[{id:'coins',qty:5},{id:'bread',qty:1},{id:'bread',qty:1}]);
});
check('duplicate keep-one rows respect inventory and earlier rewards',()=>{
  const r=planner.plan([null,null],{},defs,[keep('bow'),keep('bow'),add('bow',1),keep('bow')]);
  assert(r.ok);assert.strictEqual(r.grants.length,2);assert(r.inventory.every(s=>s.id==='bow'&&s.qty===1));
});
check('every equipment slot counts only for keep-one, not additive',()=>{
  const r=planner.plan([null],{shield:'shield',weapon:'bow',head:null},defs,[keep('shield'),keep('bow'),add('bow',1)]);
  assert(r.ok);assert.deepStrictEqual(r.inventory,[{id:'bow',qty:1}]);
});
check('caller data is immutable and output slots are independent',()=>{
  const inv=[{id:'coins',qty:5},null],equip={weapon:'bow'},rows=[add('coins',1),keep('bow')];
  const before=JSON.stringify([inv,equip,defs,rows]);
  const r=planner.plan(inv,equip,defs,rows);r.inventory[0].qty=999;
  assert.strictEqual(JSON.stringify([inv,equip,defs,rows]),before);
});
check('invalid inputs reject without any partial inventory',()=>{
  const bad=[
    [[],{},defs,[add('missing',1)]], [[],{},defs,[add('coins',0)]],
    [[],{},defs,[add('coins',1.5)]], [[],{},defs,[add('coins',Infinity)]],
    [[{id:'bread',qty:2}],{},defs,[]], [[undefined],{},defs,[]],
    [[{id:'coins',qty:-1}],{},defs,[]], [[],{head:'unknown'},defs,[]],
    [[],{},defs,[{id:'bow',qty:2,mode:'keep-one'}]],
    [[],{},defs,[{id:'bow',qty:1,mode:'other'}]],
    [[null],{},defs,[],0], [[],{},defs,[],1.5],
    [[{id:'coins',qty:Number.MAX_SAFE_INTEGER}],{},defs,[add('coins',1)]],
    [[],{},defs,[add('coins',1),add('missing',1)]],
    [[{id:'missing',qty:1}],{},defs,[]], [[],{},defs,[add('toString',1)]]
  ];
  bad.forEach(args=>{const r=planner.plan(...args);assert.strictEqual(r.code,'invalid-input');assert(!('inventory' in r));});
});
check('explicit capacity pads without changing existing slot indexes',()=>{
  const r=planner.plan([{id:'bread',qty:1}],{},defs,[add('bow',1)],3);
  assert(r.ok);assert.deepStrictEqual(r.inventory,[{id:'bread',qty:1},{id:'bow',qty:1},null]);
});
check('huge nonstack reward rejects before allocation',()=>{
  assert.strictEqual(planner.plan([null],{},defs,[add('bread',Number.MAX_SAFE_INTEGER)]).code,'insufficient-space');
});
check('duplicate preexisting stacks preserve quantities and first-stack add semantics',()=>{
  const r=planner.plan([{id:'coins',qty:2},{id:'coins',qty:3}],{},defs,[add('coins',4)]);
  assert(r.ok);assert.deepStrictEqual(r.inventory,[{id:'coins',qty:6},{id:'coins',qty:3}]);
});
check('plain script exposes browser global without dependencies',()=>{
  const context={};vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/holm_reward_plan.js'),'utf8'),context);
  assert.strictEqual(typeof context.HolmRewardPlan.plan,'function');
});
console.log('[HOLM_REWARD_PLAN] '+passed+'/'+passed+' checks passed');
