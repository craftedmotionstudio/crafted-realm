/* Headless contract for "speak to the tutor first" on Tutor's Holm (owner play-test 2026-09-25: "I didn't have to talk
 * to [Wenna] to complete the tutorial"). The real island modules (curriculum, tutors, talk gate) and the real SaveGame
 * run in a VM: a new adventurer's first objective is Guide Bram; while the current lesson's tutor has not been spoken to
 * the banner says "Talk to <tutor>" and only that area's stations refuse; the descent to Foreman Durgin stays free;
 * each tutor's chat explains the CURRENT step; spoken-to tutors survive a save and reload; saves from before the rule
 * count tutors with completed lessons as spoken to; QA ledger grants do the same; nothing happens off the island.
 * Run: node tools/test_holm_island_talk.js */
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
function world(search,opts){
 opts=opts||{};
 const els={objective:{style:{display:'none'},textContent:''},'obj-text':{textContent:''}};
 const ctx={console,location:{search},URLSearchParams,chats:[],saves:0,bytes:null};
 ctx.document={getElementById:id=>els[id]||null};
 ctx.Tutorial={complete:false,step:0,steps:[],
  notify(ev,match){if(this.complete)return;const s=this.steps[this.step];if(!s)return;if(s.ev===ev&&s.match===match){this.step++;if(this.step>=this.steps.length)this.finish();else this.banner()}},
  // the engine's base banner: the step's hint line, hidden once complete
  banner(){if(this.complete){els.objective.style.display='none';return}els.objective.style.display='block';els['obj-text'].textContent=this.steps[this.step].text},
  finish(){this.complete=true;this.step=this.steps.length}};
 ctx.inv={};ctx.Player={count:id=>ctx.inv[id]||0,target:null,equip:{weapon:null},inv:[],bank:[],xp:{},hp:10,maxHp:10,quests:{},attackStyles:{}};
 ctx.UI={chat:t=>ctx.chats.push(t),dialogue(){},refreshInv(){},refreshSkills(){},refreshQuests(){},refreshEquip(){},refreshHud(){}};
 ctx.QAProfile={isolated:!!opts.qa,key:'motionscape_save__talk'};
 ctx.HolmArrivalQA={active:()=>false,islandActive:()=>true};
 ctx.scene={getObjectByName:n=>ctx.fire&&n==='island-campfire'?{}:null};
 Object.assign(ctx,{Persist:{store:{get:()=>ctx.bytes,set:(k,v)=>{ctx.bytes=v;return true},has:()=>ctx.bytes!==null}},
  player:{position:{x:1,y:0,z:2,set(x,y,z){this.x=x;this.y=y;this.z=z}}},Quest:{tracked:null},CharCfg:{name:'Tester'},Music:{unlocked:[],mode:'auto'},
  groundY:()=>0,collides:()=>false,applyPlayerLook(){},refreshPlayerGear(){}});
 vm.createContext(ctx);
 ['holm_landscape_data.js','holm_tutorial_flow_data.js','holm_curriculum_progress.js','holm_island_curriculum.js','holm_island_tutors.js','holm_island_talk.js','ui_save.js'].forEach(f=>{try{vm.runInContext(src(f),ctx,{filename:f})}catch(e){if(f!=='holm_landscape_data.js')throw e}});
 ctx.SaveGame=vm.runInContext('SaveGame',ctx);
 const real=ctx.SaveGame.save.bind(ctx.SaveGame);ctx.SaveGame.save=s=>{ctx.saves++;return real(s)};
 ctx.els=els;return ctx;
}
const same=(a,b,m)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),m);   // vm-realm arrays never deepEqual host arrays
let passed=0;const check=(n,f)=>{f();passed++;console.log('PASS '+n)};
// what the player can click (the userData the game's pick() hands to HolmArrivalQA.handleClick)
const CLICK={
 chart:{kind:'arrival_chart'},rack:{kind:'arrival_provisions'},door:{kind:'arrival_door',arrivalDoor:'arrival'},ground:{islandGround:true},
 oak:{kind:'resource',islandLesson:'survival-oak-1'},perch:{kind:'resource',islandLesson:'survival-perch'},fire:{kind:'fire'},
 fishingStage:{kind:'island_service',islandService:{building:'survival',target:'fishing',label:'Fishing spot'}},
 bucket:{kind:'island_service',islandService:{building:'bakehouse',target:'buckets',label:'Take bucket',call:['HolmTeachingKitchen','takeBucket']}},
 shaft:{kind:'island_service',islandService:{building:'quarry',target:'shaft',label:'Climb-down shaft ladder',climb:'b:cavern:x'}},
 ladderUp:{kind:'island_service',islandService:{building:'cavern',target:'ladder',label:'Climb-up ladder',climb:'b:quarry:x'}},
 copper:{kind:'resource',islandLesson:'cavern-copper-1'},furnace:{kind:'furnace',islandLesson:'furnace'},anvil:{kind:'anvil',islandLesson:'anvil'},
 court:{kind:'npc',npc:{islandPen:'keep-court'}},yard:{kind:'npc',npc:{islandPen:'mage-yard'}},
 ferry:{kind:'island_service',islandService:{building:'haven',target:'boat',label:'Ferry',call:['HolmIslandCurriculum','board']}},
 lever:{kind:'island_service',islandService:{building:'lastlight',target:'lever',label:'Pull beacon lever',call:['HolmIslandLessons','pullLever']}},
 lastlightLadder:{kind:'island_service',islandService:{building:'lastlight',target:'ladder1-foot',label:'Climb-up ladder',climb:'b:lastlight:y'}}};
const ids=()=>vm.runInContext('HolmCurriculumProgress.lessonIds',W);
const W=world('?holmIsland=1'),T=W.Tutorial,G=W.HolmIslandTalk,Tu=W.HolmIslandTutors;
const doLesson=id=>{const s=T.steps[T.step];assert.strictEqual(s.id,id,'expected '+id+' due');T.notify(s.ev,s.match)};
check('a new adventurer starts with "Talk to Guide Bram"; the chart and the rack refuse until then, the door and the ground do not',()=>{
 assert(G.active());T.banner();assert.strictEqual(W.els['obj-text'].textContent,'Talk to Guide Bram in the Guide House.');
 assert.strictEqual(G.pending().id,'bram');
 assert.strictEqual(G.refusal(CLICK.chart),'You should speak to Guide Bram first.');assert.strictEqual(G.refusal(CLICK.rack),'You should speak to Guide Bram first.');
 assert.strictEqual(G.refusal(CLICK.door),null);assert.strictEqual(G.refusal(CLICK.ground),null);
});
check('Guide Bram\'s first chat welcomes the adventurer and explains the chart and the provision rack',()=>{
 const p=Tu.lines('bram');assert(/I am Guide Bram/.test(p[0]),p[0]);assert(p.some(l=>/relief chart/.test(l)));assert(p.some(l=>/provision rack/.test(l)));
 assert(p.length>=3&&p.every(l=>l.length<=200),'several short pages');
});
check('speaking to Bram opens his lessons, the banner moves on to the chart, and the talk is saved at once',()=>{
 const saves=W.saves;assert.strictEqual(G.markTalked('bram'),true);assert.strictEqual(G.markTalked('bram'),false,'once');
 assert.strictEqual(G.pending(),null);assert.strictEqual(G.refusal(CLICK.chart),null);
 assert(/relief chart/.test(W.els['obj-text'].textContent),W.els['obj-text'].textContent);assert(W.saves>saves,'saved');
 assert(!/I am Guide Bram/.test(Tu.lines('bram')[0]),'no second welcome when asked again');
});
check('Bram asked again during equip_hatchet explains the rack, then wielding the hatchet',()=>{
 doLesson('study_route');assert(/provision rack/.test(Tu.lines('bram').join(' ')));
 W.inv.hatchet=1;assert(/wield/.test(Tu.lines('bram').join(' '))&&/Wenna/.test(Tu.lines('bram').join(' ')));
});
check('only the current lesson\'s tutor gates: at chop_logs the camp refuses until Wenna, other areas and walk-only spots do not',()=>{
 doLesson('equip_hatchet');assert.strictEqual(G.pending().id,'wenna');
 assert.strictEqual(W.els['obj-text'].textContent,'Talk to Wenna at the survival camp, west along the path.');
 ['oak','perch','fire'].forEach(k=>assert.strictEqual(G.refusal(CLICK[k]),'You should speak to Wenna first.',k));
 ['fishingStage','bucket','court','yard','shaft','chart'].forEach(k=>assert.strictEqual(G.refusal(CLICK[k]),null,k));
});
check('Wenna\'s chat follows the step: welcome and oaks first, the tinderbox during light_fire, the net, then the fire',()=>{
 let p=Tu.lines('wenna');assert(/I am Wenna/.test(p[0])&&/oaks/.test(p.join(' ')));
 G.markTalked('wenna');assert.strictEqual(G.refusal(CLICK.oak),null);assert(!/I am Wenna/.test(Tu.lines('wenna')[0]));
 assert(/Follow the path west/.test(W.els['obj-text'].textContent),'banner back on the lesson');
 doLesson('chop_logs');W.inv.logs=1;p=Tu.lines('wenna').join(' ');assert(/tinderbox/.test(p)&&/logs/.test(p),p);
 W.inv.logs=0;assert(/Chop one of the oaks/.test(Tu.lines('wenna').join(' ')));
 doLesson('light_fire');assert(/net/.test(Tu.lines('wenna').join(' ')));
 doLesson('catch_fish');W.inv.raw_perch=1;W.fire=true;assert(/Click your fire/.test(Tu.lines('wenna').join(' ')));
 W.fire=false;assert(/burnt out/.test(Tu.lines('wenna').join(' ')));
 W.inv.raw_perch=0;assert(/raw perch first/.test(Tu.lines('wenna').join(' ')));
 assert.strictEqual(G.pending(),null,'Wenna already spoken to');
});
check('Cook Hettie gates the bakehouse and her chat walks through the buckets, kneading and the oven',()=>{
 doLesson('cook_fish');assert.strictEqual(G.pending().id,'hettie');assert.strictEqual(G.refusal(CLICK.bucket),'You should speak to Cook Hettie first.');
 assert.strictEqual(G.refusal(CLICK.oak),null,'the camp is free again');
 let p=Tu.lines('hettie');assert(/Cook Hettie/.test(p[0])&&/buckets/.test(p.join(' '))&&/oven/.test(p.join(' ')));
 G.markTalked('hettie');W.inv.bucket_flour=W.inv.bucket_water=W.inv.dough=1;assert(/knead/.test(Tu.lines('hettie').join(' ')));
 W.inv.bread_dough=1;assert(/oven/.test(Tu.lines('hettie')[0]));
});
check('the shaft ladder down to Foreman Durgin is free; the ore workings wait for him',()=>{
 doLesson('bake_bread');assert.strictEqual(G.pending().id,'ansel');G.markTalked('ansel');doLesson('learn_quests');
 assert.strictEqual(G.due(),null,'descend_cavern has no gate');assert.strictEqual(G.refusal(CLICK.shaft),null);
 doLesson('descend_cavern');assert.strictEqual(G.pending().id,'durgin');
 ['copper','furnace','anvil'].forEach(k=>assert.strictEqual(G.refusal(CLICK[k]),'You should speak to Foreman Durgin first.',k));
 assert.strictEqual(G.refusal(CLICK.ladderUp),null,'the ladder back up is movement');
 assert(/copper/i.test(Tu.lines('durgin').join(' ')));G.markTalked('durgin');
 ['mine_copper','mine_tin','smelt_bronze'].forEach(doLesson);assert(/anvil/.test(Tu.lines('durgin').join(' ')));doLesson('forge_dagger');
});
check('combat: the keep court waits for Warden Corrick (clicks and right-click attack orders), the mage yard is not his',()=>{
 assert.strictEqual(G.pending().id,'corrick');assert.strictEqual(G.refusal(CLICK.court),'You should speak to Warden Corrick first.');assert.strictEqual(G.refusal(CLICK.yard),null);
 const n=W.chats.length;W.Player.target={islandPen:'keep-court'};G.update();assert.strictEqual(W.Player.target,null);assert.strictEqual(W.chats.length,n+1);
 W.Player.target={islandPen:'mage-yard'};G.update();assert(W.Player.target,'not Corrick\'s pen');W.Player.target=null;
 G.markTalked('corrick');assert.strictEqual(G.refusal(CLICK.court),null);doLesson('melee_trial');
 assert(/shortbow/.test(Tu.lines('corrick').join(' ')));doLesson('ranged_trial');
});
check('the bank, the tower and Lastlight each wait for their tutor; Lastlight\'s ladders stay free',()=>{
 assert.strictEqual(G.pending().id,'maud');G.markTalked('maud');doLesson('open_bank');
 assert.strictEqual(G.pending().id,'ilse');assert.strictEqual(G.refusal(CLICK.yard),'You should speak to Magister Ilse first.');G.markTalked('ilse');doLesson('magic_trial');
 assert.strictEqual(G.pending().id,'aldous');assert.strictEqual(G.refusal(CLICK.lever),'You should speak to Keeper Aldous first.');assert.strictEqual(G.refusal(CLICK.lastlightLadder),null);
 assert(/beacon lever/.test(Tu.lines('aldous').join(' ')));G.markTalked('aldous');doLesson('relight_lastlight');assert.strictEqual(T.complete,true);
});
check('graduation: Ferryman Tobin is the last tutor; the skiff waits for him, then the banner says board',()=>{
 assert.strictEqual(G.pending().id,'tobin');assert.strictEqual(G.refusal(CLICK.ferry),'You should speak to Ferryman Tobin first.');
 T.banner();assert.strictEqual(W.els.objective.style.display,'block');assert.strictEqual(W.els['obj-text'].textContent,'Lastlight is lit. Talk to Ferryman Tobin at the Departure Haven.');
 assert(/Ferryman Tobin/.test(Tu.lines('tobin')[0])&&/pier/.test(Tu.lines('tobin').join(' ')));
 G.markTalked('tobin');assert.strictEqual(G.refusal(CLICK.ferry),null);assert(/Board Ferryman Tobin/.test(W.els['obj-text'].textContent));
 T.departurePackClaimed=true;assert.strictEqual(G.pending(),null);T.banner();assert.strictEqual(W.els.objective.style.display,'none','after the crossing the line goes');
});
check('the real SaveGame carries the spoken-to tutors across a reload (unknown and repeated ids dropped)',()=>{
 const R=world('?holmIsland=1');R.HolmIslandCurriculum.restore({curriculumVersion:6,completedLessonIds:ids().slice(0,2)});R.HolmIslandTalk.markTalked('wenna');
 const saved=JSON.parse(R.bytes);same(saved.tut.talkedTutors,['wenna']);
 saved.tut.talkedTutors=['wenna','bogus','wenna',7];R.bytes=JSON.stringify(saved);R.Tutorial.talkedTutors=[];
 assert.strictEqual(R.SaveGame.load(),true);same(R.Tutorial.talkedTutors,['wenna','bram']);assert.strictEqual(R.HolmIslandTalk.pending(),null,'chop_logs is open after the reload');
});
check('a save from before the rule counts tutors with completed lessons as spoken to (not the descent, not the lesson due)',()=>{
 const R=world('?holmIsland=1'),L=ids();R.bytes=JSON.stringify({v:1,xp:{},hp:10,maxHp:10,inv:[],bank:[],equip:{},pos:[1,2],tut:{curriculumVersion:6,completedLessonIds:L.slice(0,4),step:4}});
 assert.strictEqual(R.SaveGame.load(),true);same(R.Tutorial.talkedTutors,['bram','wenna']);assert.strictEqual(R.Tutorial.steps[R.Tutorial.step].id,'catch_fish');assert.strictEqual(R.HolmIslandTalk.pending(),null);
 const D=world('?holmIsland=1');D.bytes=JSON.stringify({v:1,xp:{},hp:10,maxHp:10,inv:[],bank:[],equip:{},pos:[1,2],tut:{curriculumVersion:6,completedLessonIds:L.slice(0,9),step:9}});
 D.SaveGame.load();assert(!D.Tutorial.talkedTutors.includes('durgin'),'the free descent proves nothing');assert.strictEqual(D.HolmIslandTalk.pending().id,'durgin');
 const C=world('?holmIsland=1');C.bytes=JSON.stringify({v:1,xp:{},hp:10,maxHp:10,inv:[],bank:[],equip:{},pos:[1,2],tut:{curriculumVersion:6,complete:true}});
 C.SaveGame.load();assert.strictEqual(C.Tutorial.talkedTutors.length,9,'a graduate has met every lesson tutor');assert.strictEqual(C.HolmIslandTalk.pending().id,'tobin');
});
check('QA ledger grants (isolated profiles only) count the granted lessons\' tutors as spoken to, not the tutor now due',()=>{
 const Q=world('?holmIsland=1',{qa:true}),L=ids();assert(Q.HolmIslandCurriculum.qaGrant(L.slice(0,6)));
 same(Q.Tutorial.talkedTutors,['bram','wenna']);assert.strictEqual(Q.HolmIslandTalk.pending().id,'hettie');
 assert(Q.HolmIslandCurriculum.qaSetLedger(L.slice(0,-1)));assert.strictEqual(Q.HolmIslandTalk.pending().id,'aldous','the lesson due keeps its tutor');
 // qa_holm_island.js: grant everything, then set the ledger back one lesson so the credit hooks stay live
 Q.HolmIslandCurriculum.qaGrant(L);assert.strictEqual(Q.Tutorial.talkedTutors.length,9);Q.HolmIslandCurriculum.qaSetLedger(L.slice(0,-1));assert.strictEqual(Q.HolmIslandTalk.pending(),null,'granted tutors stay spoken to');
 const P=world('?holmIsland=1',{qa:false});assert.strictEqual(P.HolmIslandCurriculum.qaGrant(L.slice(0,6)),false);same(P.Tutorial.talkedTutors,[]);
});
check('without the island the rule is inert',()=>{
 const L=world('?qaProfile=x');assert.strictEqual(L.HolmIslandTalk.active(),false);assert.strictEqual(L.HolmIslandTalk.pending(),null);
 assert.strictEqual(L.HolmIslandTalk.refusal(CLICK.oak),null);assert.strictEqual(L.HolmIslandTalk.restore({talkedTutors:['wenna']}),false);assert.strictEqual(L.HolmIslandTalk.markTalked('wenna'),false);
});
console.log('[HOLM_ISLAND_TALK] '+passed+'/15 checks passed');
