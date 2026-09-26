'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const files=['holm_landscape_data.js','holm_tutorial_flow_data.js','holm_reward_plan.js','holm_tool_recovery.js','holm_tool_recovery_service.js'];
function setup(){
  let saves=0,refreshes=0,snapshot=null;const messages=[];
  const c={console:{info(){}},CRWorldMode:{providerId:'tutors-holm-v2'},
    Player:{inv:Array(28).fill(null),equip:{},bank:[]},ITEMS:{},
    UI:{chat(m){messages.push(m);},refreshInv(){refreshes++;}},
    SaveGame:{save(silent){assert.strictEqual(silent,true);saves++;snapshot=JSON.stringify(c.Player.inv);return true;}}};
  ['hatchet','tinderbox','fishing_net','pickaxe','hammer','bread'].forEach(id=>{c.ITEMS[id]={stack:false,name:id};});
  vm.createContext(c);files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),c));
  c.Tutorial={steps:c.HolmTutorialFlow.runtimeSteps(),step:1,complete:false};
  return {c,messages,recover:()=>c.HolmToolRecoveryService.recover(),saves:()=>saves,refreshes:()=>refreshes,snapshot:()=>snapshot};
}
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('arrival provider uses the same atomic grant and inactive drafts cannot grant',()=>{
  const t=setup();t.c.CRWorldMode.providerId='tutors-holm-arrival-qa';
  t.c.HolmArrivalQA={active:()=>false};assert.strictEqual(t.recover(),false);assert.strictEqual(t.saves(),0);
  t.c.HolmArrivalQA.active=()=>true;assert(t.recover());assert.strictEqual(t.saves(),1);
  assert.deepStrictEqual(Array.from(t.c.Player.inv.filter(Boolean),s=>s.id),['hatchet','tinderbox','fishing_net']);
  assert(t.recover());assert.strictEqual(t.saves(),1);
});
check('full pack refuses atomically with exact additional slot requirement',()=>{
  const t=setup();t.c.Player.inv=Array.from({length:28},()=>({id:'bread',qty:1}));t.c.Player.inv[27]=null;
  const before=t.c.Player.inv;assert.strictEqual(t.recover(),false);assert.strictEqual(t.c.Player.inv,before);
  assert(t.messages[0].includes('need 3 free inventory slots; you have 1. Free 2 more slots'));assert.strictEqual(t.saves(),0);
});
check('bank-owned tools remain in bank and produce a location message',()=>{
  const t=setup();t.c.Player.bank=[{id:'hatchet',qty:2}];const bank=t.c.Player.bank;
  assert(t.recover());assert.strictEqual(t.c.Player.bank,bank);assert(!t.c.Player.inv.some(s=>s&&s.id==='hatchet'));
  assert(t.messages.some(m=>m.includes('Holm Bank on Warden\'s Ridge, west of the Combat Hall')));
});
check('equipped tools are preserved and repeated requests are idempotent',()=>{
  const t=setup();t.c.Player.equip={weapon:'hatchet',shield:'fishing_net'};
  assert(t.recover());assert.strictEqual(t.c.Player.inv.filter(Boolean).length,1);assert.strictEqual(t.saves(),1);
  const bytes=JSON.stringify(t.c.Player.inv);assert(t.recover());assert.strictEqual(t.saves(),1);
  assert.strictEqual(JSON.stringify(t.c.Player.inv),bytes);assert.strictEqual(t.refreshes(),1);
});
check('save refusal and throw restore exact prior inventory then allow one saved retry',()=>{
  [()=>false,()=>{throw new Error('storage unavailable');}].forEach(fail=>{
    const t=setup(),normal=t.c.SaveGame.save,old=t.c.Player.inv;
    t.c.SaveGame.save=fail;assert.strictEqual(t.recover(),false);assert.strictEqual(t.c.Player.inv,old);
    assert.strictEqual(t.refreshes(),0);assert(t.messages.at(-1).includes('could not be saved'));
    t.c.SaveGame.save=normal;assert(t.recover());assert.strictEqual(t.saves(),1);
    assert.strictEqual(t.snapshot(),JSON.stringify(t.c.Player.inv));assert(t.recover());assert.strictEqual(t.saves(),1);
  });
});
check('missing save service cannot grant tools',()=>{
  const t=setup(),old=t.c.Player.inv;delete t.c.SaveGame;
  assert.strictEqual(t.recover(),false);assert.strictEqual(t.c.Player.inv,old);
});
check('progress gates survive completion and no-op before chart',()=>{
  const t=setup();t.c.Tutorial.step=0;assert(t.recover());assert.strictEqual(t.saves(),0);
  t.c.Tutorial.complete=true;t.c.Tutorial.step=t.c.Tutorial.steps.length;
  assert(t.recover());assert.strictEqual(t.c.Player.inv.filter(Boolean).length,5);
});
check('mainland and malformed inventory cannot receive replacements',()=>{
  const t=setup();t.c.CRWorldMode.providerId='veyhollow-commons-v2';assert.strictEqual(t.recover(),false);
  t.c.CRWorldMode.providerId='tutors-holm-v2';t.c.Player.inv[0]={id:'missing',qty:1};
  assert.strictEqual(t.recover(),false);assert.strictEqual(t.saves(),0);
});
console.log('[HOLM_TOOL_RECOVERY_SERVICE] '+passed+'/'+passed+' checks passed');
