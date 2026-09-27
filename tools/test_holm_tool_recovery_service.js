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
  return {c,messages,recover:o=>c.HolmToolRecoveryService.recover(o),saves:()=>saves,refreshes:()=>refreshes,snapshot:()=>snapshot};
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
// owner review 4 (2026-09-27): on the Tutor's Holm island the tools come from the tutor (2004), the rack keeps spares
function island(ledger,stepId,pending){const t=setup(),ids=['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread','learn_quests','descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger'];
  t.c.Tutorial={steps:ids.map(id=>({id})),step:ids.indexOf(stepId),complete:false,completedLessonIds:ledger};
  t.c.HolmIslandTalk={active:()=>true,pending:()=>pending?{id:pending,name:pending==='wenna'?'Wenna':'Foreman Durgin'}:null};return t}
check('island: the survival tools stay with Wenna until she is spoken to (the rack says so and grants nothing)',()=>{
  const t=island(['study_route'],'equip_hatchet','wenna');assert(t.recover());assert.strictEqual(t.saves(),0);assert.strictEqual(t.c.Player.inv.filter(Boolean).length,0);
  assert(/come from Wenna/.test(t.messages.at(-1)),t.messages);
});
check('island: Wenna hands them over by name once spoken to; afterwards the rack only replaces lost ones',()=>{
  const t=island(['study_route'],'equip_hatchet',null);assert(t.recover({from:'Wenna'}));
  assert.deepStrictEqual(Array.from(t.c.Player.inv.filter(Boolean),s=>s.id),['hatchet','tinderbox','fishing_net']);
  assert.strictEqual(t.messages.at(-1),'Wenna hands you a hatchet, a tinderbox and a fishing_net.');
  t.c.Player.inv=t.c.Player.inv.map(s=>s&&s.id==='tinderbox'?null:s);assert(t.recover());assert(/Replacement tools placed in your pack: tinderbox/.test(t.messages.at(-1)));
});
check('island: the rack works during the island-only lessons (bread) and holds the pickaxe for Durgin',()=>{
  const L=['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish'];
  let t=island(L,'bake_bread',null);assert(t.recover());assert.strictEqual(t.c.Player.inv.filter(Boolean).length,3,'the survival set, not "could not prepare"');
  t=island(L.concat(['bake_bread','learn_quests','descend_cavern']),'mine_copper','durgin');assert(t.recover());assert(!t.c.Player.inv.some(s=>s&&s.id==='pickaxe'),'held by Durgin');
  t=island(L.concat(['bake_bread','learn_quests','descend_cavern']),'mine_copper',null);assert(t.recover({from:'Foreman Durgin'}));assert(t.c.Player.inv.some(s=>s&&s.id==='pickaxe'));
});
console.log('[HOLM_TOOL_RECOVERY_SERVICE] '+passed+'/'+passed+' checks passed');
