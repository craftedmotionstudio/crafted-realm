'use strict';
// Controlled DOM/tutor fixture executing the actual runtime module; not browser QA.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('src/holm_quest_lodge_interactions.js','utf8');
function fixture(mode='success'){
 const state={mode,active:false,clicks:0,forwarded:[],saves:[],messages:[],errors:[],dialogues:[],sounds:0};
 const c={CRWorldMode:{providerId:'tutors-holm-v2'},QUESTS:{first:{},second:{}},
  Tutorial:{step:0,optional:{},notify(ev,match){state.forwarded.push([ev,match]);if(ev==='orient'&&match==='quests'&&this.step===0)this.step++;return 'original result';}},
  UI:{chat(message){state.messages.push(message)},dialogue(...args){state.dialogues.push(args)}},
  Sfx:{quest(){state.sounds++}},SaveGame:{save(force){state.saves.push({force,step:c.Tutorial.step,optional:{...c.Tutorial.optional}})}},
  document:{querySelector(selector){if(selector.includes('tab-btn'))return state.mode==='missing'?null:{click(){state.clicks++;if(state.mode==='throwing')throw Error('click failed');if(state.mode==='success')state.active=true;}};if(selector==='#pane-quests')return state.mode==='missing-pane'?null:{classList:{contains(name){return name==='active'&&state.active}}};return null;},getElementById(id){return id==='pane-quests'?this.querySelector('#pane-quests'):null;}},
  console:{log(){},warn(){},error(...args){state.errors.push(args)}}};
 vm.createContext(c);vm.runInContext(source,c);return {c,state};
}
let count=0;
function test(name,fn){try{fn();count++;console.log('PASS '+name);}catch(error){console.error('FAIL '+name);throw error;}}
function noCredit(f){assert.equal(f.c.Tutorial.step,0);assert.equal(f.c.Tutorial.optional.learn_quests,undefined);assert.equal(f.state.saves.length,0);assert.equal(f.state.forwarded.length,0);}
function retry(f){const buttons=f.state.dialogues[0][2];const button=buttons.find(b=>b.label==='Open my journal.');assert.ok(button,'journal retry remains offered');button.fn();}
for(const mode of ['missing','inert','throwing','missing-pane']){
 test(mode+' journal refuses completion',()=>{const f=fixture(mode);assert.equal(f.c.HolmQuestLodge.openJournal(),false);f.c.HolmQuestLodge.studyBoard();noCredit(f);assert.ok(f.state.messages.length,'failure gives feedback');});
}
test('successful study opens actual active pane and saves post-advance',()=>{const f=fixture();f.c.HolmQuestLodge.studyBoard();assert.equal(f.state.active,true);assert.equal(f.state.clicks,1);assert.deepEqual(f.state.forwarded,[['orient','quests']]);assert.equal(f.state.saves.length,1);assert.deepEqual(f.state.saves[0],{force:true,step:1,optional:{learn_quests:true}});assert.equal(f.state.sounds,1);});
test('failed study can complete through successful dialogue retry',()=>{const f=fixture('inert');f.c.HolmQuestLodge.studyBoard();noCredit(f);f.state.mode='success';retry(f);assert.equal(f.c.Tutorial.step,1);assert.equal(f.c.Tutorial.optional.learn_quests,true);assert.equal(f.state.saves.length,1);});
test('failed dialogue retry cannot grant credit',()=>{const f=fixture('inert');f.c.HolmQuestLodge.studyBoard();retry(f);noCredit(f);});
test('provider change before retry cannot grant credit',()=>{const f=fixture('inert');f.c.HolmQuestLodge.studyBoard();f.state.mode='success';f.c.CRWorldMode.providerId='mainland';retry(f);noCredit(f);});
test('repeat event saves each time but optional feedback occurs once',()=>{const f=fixture();assert.equal(f.c.Tutorial.notify('orient','quests'),'original result');const messages=f.state.messages.length;assert.equal(messages,1);assert.equal(f.c.Tutorial.notify('orient','quests'),'original result');assert.equal(f.state.saves.length,2);assert.equal(f.state.saves[1].step,1);assert.equal(f.state.messages.length,messages);assert.equal(f.state.sounds,1);});
test('foreign provider forwards original event without lodge state',()=>{const f=fixture();f.c.CRWorldMode.providerId='mainland';assert.equal(f.c.Tutorial.notify('orient','quests'),'original result');assert.equal(f.c.Tutorial.step,1);assert.equal(f.state.forwarded.length,1);assert.equal(f.state.saves.length,0);assert.equal(f.c.Tutorial.optional.learn_quests,undefined);});
test('unrelated event forwards unchanged without lodge save',()=>{const f=fixture();assert.equal(f.c.Tutorial.notify('orient','bank'),'original result');assert.deepEqual(f.state.forwarded,[['orient','bank']]);assert.equal(f.state.saves.length,0);assert.equal(f.c.Tutorial.optional.learn_quests,undefined);});
test('save failure is logged after original advancement',()=>{const f=fixture();f.c.SaveGame.save=()=>{throw Error('storage failed')};assert.equal(f.c.Tutorial.notify('orient','quests'),'original result');assert.equal(f.c.Tutorial.step,1);assert.equal(f.c.Tutorial.optional.learn_quests,true);assert.equal(f.state.errors.length,1);});
test('reloading module does not install duplicate notification wrapper',()=>{const f=fixture();vm.runInContext(source,f.c);f.c.Tutorial.notify('orient','quests');assert.equal(f.state.forwarded.length,1);assert.equal(f.state.saves.length,1);assert.equal(f.state.sounds,1);});
console.log('[QUEST_LODGE_SUCCESS] '+count+'/'+count+' PASS (controlled VM; no real browser interaction claimed)');
