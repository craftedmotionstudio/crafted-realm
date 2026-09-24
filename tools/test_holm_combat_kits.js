'use strict';
// Execute the real kit module and reward planner with controlled persistence failures.
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const source=fs.readFileSync('src/holm_combat_kits.js','utf8');
const planner=fs.readFileSync('src/holm_reward_plan.js','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(saved){
  const calls={saves:[],refresh:0,messages:[],errors:[]};
  const c={Player:{inv:Array(28).fill(null),equip:{weapon:null},bank:[]},
    Tutorial:{combatKitClaims:{}}, ITEMS:{worn_bow:{stack:false},arrows:{stack:true},air_rune:{stack:true},mind_rune:{stack:true},coins:{stack:true},stone:{stack:false}},
    UI:{chat(...args){calls.messages.push(args);},refreshInv(){calls.refresh++;},refreshHud(){},refreshEquip(){}},
    console:{log(){},warn(){},error(...args){calls.errors.push(args);}},
    SaveGame:{save(force){calls.saves.push({force,inv:clone(c.Player.inv),claims:clone(c.Tutorial.combatKitClaims)});return true;}}};
  if(saved){c.Player.inv=clone(saved.inv);c.Tutorial.combatKitClaims=clone(saved.claims);}
  c.window=c;vm.createContext(c);vm.runInContext(planner,c);vm.runInContext(source,c);
  return {c,calls,claim:style=>c.HolmCombatKits.claim(style)};
}
function count(slots,id){return slots.reduce((n,s)=>n+(s&&s.id===id?s.qty:0),0);}
let passed=0;function test(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;}}
test('ranged grant commits inventory and claim before forced save',()=>{
  const f=fixture();assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'worn_bow'),1);assert.equal(count(f.c.Player.inv,'arrows'),30);
  assert.equal(f.c.Tutorial.combatKitClaims.ranged,true);assert.equal(f.calls.saves.length,1);assert.equal(f.calls.saves[0].force,true);assert.equal(f.calls.saves[0].claims.ranged,true);assert.equal(count(f.calls.saves[0].inv,'arrows'),30);
});
test('magic grant uses two stacks without ranged claim',()=>{const f=fixture();assert.equal(f.claim('magic'),true);assert.equal(count(f.c.Player.inv,'air_rune'),15);assert.equal(count(f.c.Player.inv,'mind_rune'),15);assert.equal(f.c.Tutorial.combatKitClaims.ranged,undefined);});
test('repeat claim cannot replenish consumed ammunition',()=>{const f=fixture();f.claim('ranged');f.c.Player.inv=f.c.Player.inv.map(s=>s&&s.id==='arrows'?null:s);const before=clone(f.c.Player.inv);assert.equal(f.claim('ranged'),true);assert.deepEqual(clone(f.c.Player.inv),before);assert.equal(f.calls.saves.length,1);});
test('serialized claim remains consumed after reload',()=>{let f=fixture();f.claim('magic');const saved=f.calls.saves[0];saved.inv=Array(28).fill(null);f=fixture(saved);assert.equal(f.claim('magic'),true);assert.equal(f.calls.saves.length,0);assert.equal(count(f.c.Player.inv,'air_rune'),0);});
test('full pack fails atomically',()=>{const f=fixture();f.c.Player.inv=Array.from({length:28},()=>({id:'stone',qty:1}));const inv=f.c.Player.inv,claims=f.c.Tutorial.combatKitClaims;assert.equal(f.claim('ranged'),false);assert.equal(f.c.Player.inv,inv);assert.equal(f.c.Tutorial.combatKitClaims,claims);assert.equal(f.calls.saves.length,0);});
test('bank-owned bow and ammunition count toward targets',()=>{const f=fixture();f.c.Player.bank=[{id:'worn_bow',qty:1},{id:'arrows',qty:19}];const bank=clone(f.c.Player.bank);assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'worn_bow'),0);assert.equal(count(f.c.Player.inv,'arrows'),11);assert.deepEqual(f.c.Player.bank,bank);});
test('equipped bow is not duplicated',()=>{const f=fixture();f.c.Player.equip.weapon='worn_bow';assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'worn_bow'),0);assert.equal(f.c.Player.equip.weapon,'worn_bow');});
test('partial inventory ammunition tops up exact deficit',()=>{const f=fixture();f.c.Player.inv[7]={id:'arrows',qty:12};f.c.Player.bank=[{id:'arrows',qty:3}];assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'arrows'),27);});
test('existing excess consumables are neither reduced nor increased',()=>{const f=fixture();f.c.Player.inv[0]={id:'air_rune',qty:80};f.c.Player.bank=[{id:'mind_rune',qty:50}];assert.equal(f.claim('magic'),true);assert.equal(count(f.c.Player.inv,'air_rune'),80);assert.equal(count(f.c.Player.inv,'mind_rune'),0);});
for(const mode of ['false','throw'])test('save '+mode+' restores exact prior references and permits retry',()=>{
  const f=fixture();f.c.Player.inv[5]={id:'coins',qty:7,origin:{name:'keepsake'}};f.c.Tutorial.combatKitClaims={magic:true};const inv=f.c.Player.inv,claims=f.c.Tutorial.combatKitClaims,before=clone(inv),save=f.c.SaveGame.save;
  f.c.SaveGame.save=()=>{if(mode==='throw')throw Error('storage unavailable');return false;};assert.equal(f.claim('ranged'),false);assert.equal(f.c.Player.inv,inv);assert.equal(f.c.Tutorial.combatKitClaims,claims);assert.deepEqual(clone(inv),before);assert.equal(claims.ranged,undefined);assert.equal(f.calls.refresh,0);
  f.c.SaveGame.save=save;assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'arrows'),30);
});
test('unrelated slot and stack metadata survive success',()=>{const f=fixture();f.c.Player.inv[5]={id:'coins',qty:9,origin:{name:'keepsake'}};f.c.Player.inv[6]={id:'arrows',qty:2,label:'practice'};assert.equal(f.claim('ranged'),true);assert.deepEqual(clone(f.c.Player.inv[5]),{id:'coins',qty:9,origin:{name:'keepsake'}});assert.deepEqual(clone(f.c.Player.inv[6]),{id:'arrows',qty:30,label:'practice'});});
test('invalid style never grants or saves',()=>{for(const style of [null,undefined,'melee','Ranged','toString','__proto__',{},1]){const f=fixture();assert.equal(f.claim(style),false);assert.equal(f.calls.saves.length,0);assert.equal(f.c.Player.inv.filter(Boolean).length,0);}});
test('corrupted bank fails closed without inventory or claim mutation',()=>{for(const bank of [null,{},[{id:'arrows',qty:-1}],[{id:'unknown',qty:1}],[{id:'arrows',qty:NaN}]]){const f=fixture();f.c.Player.bank=bank;const inv=f.c.Player.inv,claims=f.c.Tutorial.combatKitClaims;assert.equal(f.claim('ranged'),false);assert.equal(f.c.Player.inv,inv);assert.equal(f.c.Tutorial.combatKitClaims,claims);assert.equal(f.calls.saves.length,0);}});
function attachRealSave(f){
  let bytes=null;const c=f.c;
  Object.assign(c,{Persist:{store:{get(){return bytes;},set(key,value){bytes=value;return true;}}},
    player:{position:{x:1,z:2,set(x,y,z){this.x=x;this.z=z;}}},Quest:{tracked:null},CharCfg:{name:'Tester'},Music:{unlocked:[],mode:'auto'},
    document:{getElementById(){return null;}},groundY(){return 0;},collides(){return false;},applyPlayerLook(){},refreshPlayerGear(){}});
  Object.assign(c.UI,{refreshSkills(){},refreshQuests(){}});
  Object.assign(c.Player,{xp:{},hp:10,maxHp:10,quests:{},attackStyles:{}});
  Object.assign(c.Tutorial,{steps:[{id:'test'}],step:0,curriculumVersion:5});
  vm.runInContext(fs.readFileSync('src/ui_save.js','utf8'),c);
  return {save:vm.runInContext('SaveGame',c),read:()=>JSON.parse(bytes),write:d=>{bytes=JSON.stringify(d);}};
}
test('combined bank and inventory ownership overflow fails atomically',()=>{
  const f=fixture();f.c.Player.inv[0]={id:'arrows',qty:1};f.c.Player.bank=[{id:'arrows',qty:Number.MAX_SAFE_INTEGER}];const inv=f.c.Player.inv,claims=f.c.Tutorial.combatKitClaims;
  assert.equal(f.claim('ranged'),false);assert.equal(f.c.Player.inv,inv);assert.equal(f.c.Tutorial.combatKitClaims,claims);assert.equal(f.calls.saves.length,0);
});
test('actual SaveGame roundtrip carries claims and prevents duplicate grants',()=>{
  const f=fixture(), persistence=attachRealSave(f);assert.equal(f.claim('ranged'),true);
  const saved=persistence.read();assert.equal(saved.v,1);assert.equal(saved.tut.combatKitClaims.ranged,true);
  f.c.Player.inv=Array(28).fill(null);f.c.Tutorial.combatKitClaims={};assert.equal(persistence.save.load(),true);
  assert.equal(f.c.Tutorial.combatKitClaims.ranged,true);assert.equal(count(f.c.Player.inv,'arrows'),30);
  f.c.Player.inv=f.c.Player.inv.map(s=>s&&s.id==='arrows'?null:s);assert.equal(f.claim('ranged'),true);assert.equal(count(f.c.Player.inv,'arrows'),0);
});
test('actual legacy load defaults missing claims to unclaimed',()=>{
  const f=fixture(),p=attachRealSave(f);assert.equal(p.save.save(true),true);const saved=p.read();delete saved.tut.combatKitClaims;p.write(saved);
  f.c.Tutorial.combatKitClaims={ranged:true,magic:true};assert.equal(p.save.load(),true);assert.equal(f.c.Tutorial.combatKitClaims.ranged,false);assert.equal(f.c.Tutorial.combatKitClaims.magic,false);
});
test('actual load accepts only literal true claim flags',()=>{
  const f=fixture(),p=attachRealSave(f);p.save.save(true);const saved=p.read();saved.tut.combatKitClaims={ranged:'true',magic:1};p.write(saved);assert.equal(p.save.load(),true);assert.equal(f.c.Tutorial.combatKitClaims.ranged,false);assert.equal(f.c.Tutorial.combatKitClaims.magic,false);
});
console.log('[HOLM_COMBAT_KITS] '+passed+'/'+passed+' PASS');
