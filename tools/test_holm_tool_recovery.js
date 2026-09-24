'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const context={console:{info(){}}};vm.createContext(context);
// Actual pure-data curriculum, so an unlock removed/renamed in source fails here.
['holm_landscape_data.js','holm_tutorial_flow_data.js','holm_reward_plan.js','holm_tool_recovery.js'].forEach(file=>{
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
});
const recovery=context.HolmToolRecovery;
const defs=Object.fromEntries(['hatchet','tinderbox','fishing_net','pickaxe','hammer','bread'].map(id=>[id,{stack:false}]));
const empty=()=>Array(24).fill(null);
const plain=value=>JSON.parse(JSON.stringify(value));
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('pre-kit lesson grants nothing',()=>{
  const r=recovery.plan(empty(),{},[],defs,'study_route');assert(r.ok);assert.strictEqual(r.grants.length,0);
});
check('survival kit unlocks on wield lesson and persists through cavern descent',()=>{
  ['equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','descend_cavern'].forEach(id=>{
    const r=recovery.plan(empty(),{},[],defs,id);assert(r.ok);
    assert.deepStrictEqual(plain(r.missingTools),['hatchet','tinderbox','fishing_net']);
  });
});
check('pickaxe and hammer unlock at actual curriculum stages',()=>{
  ['mine_copper','mine_tin','smelt_bronze'].forEach(id=>assert.strictEqual(recovery.plan(empty(),{},[],defs,id).grants.length,4));
  ['forge_dagger','open_bank','relight_lastlight'].forEach(id=>assert.strictEqual(recovery.plan(empty(),{},[],defs,id).grants.length,5));
  assert.strictEqual(recovery.plan(empty(),{},[],defs,{complete:true}).grants.length,5);
});
check('carried and any equipped tool are not duplicated',()=>{
  const inv=empty();inv[0]={id:'tinderbox',qty:1};
  const r=recovery.plan(inv,{weapon:'hatchet',shield:'fishing_net'},[],defs,'cook_fish');
  assert(r.ok);assert.strictEqual(r.grants.length,0);
});
check('bank nonstack quantities report withdrawal without duplicate recovery',()=>{
  const r=recovery.plan(empty(),{},[{id:'hatchet',qty:2},{id:'pickaxe',qty:1}],defs,'mine_copper');
  assert(r.ok);assert.deepStrictEqual(plain(r.bankOwned),['hatchet','pickaxe']);
  assert.deepStrictEqual(plain(r.missingTools),['tinderbox','fishing_net']);
});
check('owned in both bank and inventory needs no withdrawal',()=>{
  const inv=empty();inv[0]={id:'hatchet',qty:1};
  const r=recovery.plan(inv,{},[{id:'hatchet',qty:1}],defs,'equip_hatchet');
  assert(r.ok);assert.strictEqual(r.bankOwned.length,0);
});
check('insufficient inventory space returns no partial proposal',()=>{
  const inv=Array.from({length:24},()=>({id:'bread',qty:1}));inv[23]=null;
  const before=JSON.stringify(inv),r=recovery.plan(inv,{},[],defs,'equip_hatchet');
  assert.strictEqual(r.code,'insufficient-space');assert.strictEqual(r.missingSlots,2);assert(!('inventory' in r));
  assert.strictEqual(JSON.stringify(inv),before);
});
check('planning and editing proposal never mutate callers',()=>{
  const inv=empty(),equip={weapon:'hatchet'},bank=[{id:'pickaxe',qty:3}],progress={lessonId:'mine_tin',complete:false};
  const before=JSON.stringify([inv,equip,bank,defs,progress]);
  const r=recovery.plan(inv,equip,bank,defs,progress);r.inventory[0].qty=99;
  assert.strictEqual(JSON.stringify([inv,equip,bank,defs,progress]),before);
});
check('bad bank and progress fail closed',()=>{
  [null,[null],[{id:'missing',qty:1}],[{id:'hatchet',qty:0}],[{id:'hatchet',qty:1.2}]].forEach(bank=>{
    assert.strictEqual(recovery.plan(empty(),{},bank,defs,'equip_hatchet').code,'invalid-input');
  });
  ['unknown','bake_bread',null,{complete:'true'},{}].forEach(progress=>{
    assert.strictEqual(recovery.plan(empty(),{},[],defs,progress).code,'invalid-input');
  });
});
check('second planning is idempotent after committing proposed inventory',()=>{
  const first=recovery.plan(empty(),{},[],defs,{complete:true});
  const second=recovery.plan(first.inventory,{},[],defs,{complete:true});
  assert(second.ok);assert.strictEqual(second.grants.length,0);assert.deepStrictEqual(plain(first.inventory),plain(second.inventory));
});
console.log('[HOLM_TOOL_RECOVERY] '+passed+'/'+passed+' checks passed');
