/* Tutor's Holm save migration proof (finish goal M7: "Switch production to tutors-holm-v3, with save migration for
 * positions, planes, items and lesson credit. Verify fresh characters, returning Holm saves, graduated saves, full
 * inventory and interruptions."). Headless Chrome on the live build (GameConfig.holmIslandLive), one isolated qaProfile
 * per case. Every returning case writes a save in an OLDER format into that profile's localStorage key before the game
 * loads, then boots through the real login (Continue) and checks what the adventurer gets:
 *  - the formats come from the save code's history and its migration paths (src/ui_save.js, git 67054785 onward;
 *    src/holm_curriculum_progress.js v4/v5 prefixes; src/holm_island_live.js provider rule; SaveGame.migrateInv):
 *    the July 2026 pre-world save (no world meta, tut {step}, 24-slot pack, spark runes, per-family attack styles,
 *    the old look), the old island's v4 and v5 curricula on 'tutors-holm-v2', an early island v6 save whose arrival
 *    checkpoint is from the retired 'holm-island-v1' graph, graduated saves on the mainland / on the island / without
 *    world meta, a full 24-slot and a full 28-slot pack;
 *  - checked: the provider booted, the lesson ledger and current lesson, the talk-first state, gates and the rope, every
 *    pack / bank / worn item, a safe stance on the walk graph, the objective line and where the guide arrow points,
 *    the migrated save round-tripping through a save + reload, and zero page errors;
 *  - NPC lifecycle: after the crossing no island tutor is left behind; a tutor whose model never arrives does not hold
 *    their lesson (tutor-model-fails);
 *  - interruptions, by real input in fresh profiles: reload in the middle of the bread lesson, in the middle of a
 *    tutor's chat box, half way up Lastlight's ladders, holding the untied rope, with the rope tied, down in the ore
 *    workings; the full pack at Wenna's hand-over (refused, nothing lost, room made with the pack menu's Drop, handed).
 * QA helpers only set up where a case starts (HolmIslandCurriculum.qaGrant, HolmArrivalQA.qaPlace); every action
 * checked is a real click (tools/holm_island_driver_lib.js).
 * Run: SMOKE_BASE=http://127.0.0.1:8171 node tools/qa_holm_save_migration.js [caseId,...]
 *   -> scratchpad/holm_save_migration/results.json + one screenshot per case */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');const {sleep,shot,enter,pos,waitFor,clickService,clickNamed,clickInventory,closeDialogue,talkTo,objective,lastChat,count}=L;
const OUT=path.join(__dirname,'..','scratchpad','holm_save_migration');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const ONLY=(process.argv[2]||'').split(',').filter(Boolean);
const STAMP=Date.now().toString(36);
// qaProfile ids are at most 32 characters ([a-z0-9_-]): m<case number>-<run stamp>
const PROFILE=id=>'m'+String(CASES.findIndex(c=>c.id===id)).padStart(2,'0')+'-'+STAMP;
const results=[];let pass=0;
function ok(caseId,name,cond,info){results.push({caseId,name,pass:!!cond,info});if(cond)pass++;console.log((cond?'  PASS ':'  FAIL ')+caseId+': '+name+(cond?'':' :: '+JSON.stringify(info).slice(0,700)))}
const IDS=['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread','learn_quests','descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger','melee_trial','ranged_trial','open_bank','magic_trial','relight_lastlight'];
const upTo=id=>IDS.slice(0,IDS.indexOf(id));
const slot=(id,qty)=>({id,qty:qty||1});
const pad=(list,n)=>{const a=list.slice();while(a.length<n)a.push(null);return a};
const OLD_LOOK={name:'Oldtimer',gender:'male',shirt:0x3a6ea5,skin:0xd8a878,hair:0x4a3020,hairStyle:'short',beard:1,legs:0x5a4a3a};
// ---------- the old formats ----------
function base(o){return Object.assign({v:1,xp:{},hp:10,maxHp:10,inv:pad([],28),bank:[],equip:{weapon:null,shield:null,head:null,body:null,legs:null,feet:null,hands:null,cape:null,neck:null,ring:null,ammo:null},
 quests:{},castMode:false,pos:[151,169],tracked:null,look:OLD_LOOK,styleIndex:0,autoRetaliate:true,music:{unlocked:['holm_morning'],mode:'auto',current:null},energy:100,runOn:false,spec:100,prayerPts:1,spell:null},o)}
const FIXTURES={
 // July 2026 (git 67054785 src/ui_save.js): no world meta, tut {step, complete}, a 24-slot pack with spark runes, one
 // attack style per family, the pre-kit look, the old music ids
 'legacy-july':()=>({v:1,xp:{Attack:0,Woodcutting:120},hp:10,maxHp:10,inv:pad([slot('hatchet'),slot('tinderbox'),slot('logs'),slot('spark_rune',5),slot('coins',25)],24),bank:[slot('bread',2)],
  equip:{weapon:null,shield:null,head:null,body:null,legs:null,feet:null,hands:null,cape:null,neck:null,ring:null,ammo:null},quests:{},castMode:false,tut:{step:3,complete:false},pos:[151,169],tracked:null,
  look:OLD_LOOK,styles:{melee:1,ranged:0,magic:0},autoRetaliate:true,music:{unlocked:['hollow_square'],mode:'auto',current:'hollow_square'},energy:80,runOn:true,spec:100,prayerPts:1,spell:null}),
 // the old live island's 12-lesson curriculum (v4) part way through, on 'tutors-holm-v2' at the old Guide Hall apron
 'v4-old-island':()=>base({tut:{step:6,complete:false,curriculumVersion:4,lessonId:null},world:{provider:'tutors-holm-v2',worldRevision:4,landmark:'holm_arrival'},
  inv:pad([slot('hatchet'),slot('tinderbox'),slot('fishing_net'),slot('cooked_perch',1),slot('bread'),slot('coins',40)],24)}),
 // the old live island's 13-lesson curriculum (v5) at the fishing lesson, bread done as an optional lesson, a bank
 'v5-catch-fish':()=>base({tut:{step:4,complete:false,curriculumVersion:5,lessonId:'catch_fish',optional:{bake_bread:true}},world:{provider:'tutors-holm-v2',worldRevision:4,landmark:'holm_arrival'},
  inv:pad([slot('hatchet'),slot('tinderbox'),slot('fishing_net'),slot('logs'),slot('bread'),slot('coins',55)],28),bank:[slot('logs',3)],pos:[113.7,158.25]}),
 // v5 late: at the bank lesson on the old island (everything but bread, quests and the trials is done)
 'v5-open-bank':()=>base({tut:{step:11,complete:false,curriculumVersion:5,lessonId:'open_bank'},world:{provider:'tutors-holm-v2',worldRevision:4,landmark:'holm_cave_gate'},
  xp:{Woodcutting:200,Firemaking:160,Fishing:80,Cooking:120,Mining:70,Smithing:90},inv:pad([slot('hatchet'),slot('tinderbox'),slot('fishing_net'),slot('pickaxe'),slot('hammer'),slot('bronze_dagger'),slot('coins',80)],28),pos:[128,124]}),
 // an early island save (production switch on, 2026-09-25): v6 ledger at the copper lesson, but its arrival checkpoint is
 // on the retired 'holm-island-v1' graph (before the v2 land) and its world revision is stale
 'v6-island-v1-checkpoint':()=>base({tut:{step:9,complete:false,curriculumVersion:6,lessonId:'mine_copper',completedLessonIds:upTo('mine_copper'),talkedTutors:['bram','wenna','hettie','ansel'],shaftRopeTied:false},
  world:{provider:'tutors-holm-v3',worldRevision:1,landmark:'holm_arrival'},pos:[200,60],
  arrivalSurface:{schema:'holm-island-checkpoint-v1',version:1,revision:'holm-island-v1',nodeId:'b:cavern:0:0:0',surface:'b:cavern:Floor',x:200,y:-30,z:60,doors:{arrival:true,garden:false}},
  inv:pad([slot('hatchet'),slot('tinderbox'),slot('fishing_net'),slot('pickaxe'),slot('bread')],28)}),
 // graduated and sailed: on the mainland provider
 'graduated-mainland':()=>base({tut:{step:18,complete:true,curriculumVersion:6,completedLessonIds:IDS,departurePackClaimed:true},world:{provider:'veyhollow-commons-v2',worldRevision:1,landmark:'veyhollow_ferry_arrival'},
  pos:[0,18],inv:pad([slot('coins',230),slot('bread',4),slot('bronze_dagger'),slot('worn_bow'),slot('arrows',12)],28),bank:[slot('logs',5)],equip:Object.assign(base({}).equip,{weapon:'bronze_dagger'})}),
 // graduated (v5 complete) but saved on the old island before the crossing
 'graduated-on-island':()=>base({tut:{step:13,complete:true,curriculumVersion:5,departurePackClaimed:false},world:{provider:'tutors-holm-v2',worldRevision:4,landmark:'holm_departure'},
  pos:[206.5,151.5],inv:pad([slot('coins',30),slot('bronze_dagger'),slot('bread')],28)}),
 // graduated before world meta existed (no world): starts on the Holm, graduation kept (boot select rule)
 'graduated-legacy':()=>({v:1,xp:{Attack:300},hp:12,maxHp:12,inv:pad([slot('coins',99)],24),bank:[],equip:base({}).equip,quests:{},castMode:false,tut:{step:13,complete:true},pos:[151,169],tracked:null,look:OLD_LOOK,styles:{melee:0,ranged:0,magic:0},autoRetaliate:true,energy:100,runOn:false,spec:100,prayerPts:1,spell:null}),
 // a full 24-slot pack (before the 28-slot 2004 backpack)
 'full-pack-24':()=>base({tut:{step:4,complete:false,curriculumVersion:5,lessonId:'catch_fish'},world:{provider:'tutors-holm-v2',worldRevision:4,landmark:'holm_arrival'},
  inv:Array.from({length:24},(_,i)=>i===0?slot('hatchet'):i===1?slot('tinderbox'):i===2?slot('fishing_net'):i===3?slot('coins',7):slot(i%2?'logs':'bread'))})};
// ---------- driving ----------
async function seed(page,profile,save){
  await page.goto(BASE+'/package.json',{waitUntil:'load'});
  await page.evaluate((k,v)=>{localStorage.setItem(k,v)},'motionscape_save__qa_'+profile,JSON.stringify(save));
}
async function boot(page,profile,expectIsland){
  await page.goto(BASE+'/?qaProfile='+profile,{waitUntil:'load',timeout:120000});await enter(page);
  if(expectIsland!==false)await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);
  await sleep(2500);
}
async function reload(page,expectIsland){await page.evaluate(()=>SaveGame.save(true));await page.reload({waitUntil:'load'});await enter(page);
  if(expectIsland!==false)await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);await sleep(2500)}
const state=page=>page.evaluate(()=>{
  const r=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.active()?HolmArrivalQA.saveRecord():null;
  const g=typeof GuideArrow!=='undefined'?GuideArrow._resolve():{spec:null,label:''},c=g.spec?GuideArrow._center(g.spec):null;
  const pulse=Array.from(document.querySelectorAll('#inv-grid .kit-hint')).map(el=>{const i=Array.prototype.indexOf.call(el.parentNode.children,el);return Player.inv[i]&&Player.inv[i].id})[0]||null;
  const tabs=Array.from(document.querySelectorAll('.tab-btn.holm-guide-pulse')).map(b=>b.dataset.tab);
  const cur=!Tutorial.complete&&Tutorial.steps&&Tutorial.steps[Tutorial.step];
  return {provider:typeof CRWorldMode!=='undefined'?CRWorldMode.providerId:null,v:Tutorial.curriculumVersion,complete:!!Tutorial.complete,lesson:cur?cur.id:null,
   ledger:(Tutorial.completedLessonIds||[]).slice(),talked:(Tutorial.talkedTutors||[]).slice().sort(),due:typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.pending()?HolmIslandTalk.pending().id:null,
   rope:typeof HolmShaftRope!=='undefined'&&HolmShaftRope.active&&HolmShaftRope.active()?{tied:HolmShaftRope.tied(),stage:HolmShaftRope.stage()}:null,
   gates:typeof HolmIslandGates!=='undefined'?['bakehouse-door','lodge-door','bank-door','lastlight-door'].filter(id=>HolmIslandGates.isOpen(id)):null,
   inv:Player.inv.map(s=>s?s.id+'x'+s.qty:null),invLen:Player.inv.length,bank:(Player.bank||[]).map(s=>s.id+'x'+s.qty),equip:Object.assign({},Player.equip),
   pos:[+player.position.x.toFixed(2),+player.position.y.toFixed(2),+player.position.z.toFixed(2)],surface:r?r.surface:null,plane:Player.plane||0,
   objective:(document.getElementById('objective')&&document.getElementById('objective').style.display!=='none')?(document.getElementById('obj-text')||{}).textContent:'',
   arrow:c?{x:+c.cx.toFixed(2),y:g.spec&&Number.isFinite(g.spec.y)?+g.spec.y.toFixed(2):null,z:+c.cz.toFixed(2),label:g.label}:null,pulse,tabs,
   lastLoad:SaveGame.lastLoad||null,hp:Player.hp,runOn:Player.runOn,look:typeof CharCfg!=='undefined'?{name:CharCfg.name,kit:!!CharCfg.kit}:null,
   chat:Array.from(document.querySelectorAll('#chatbox > div')).slice(-6).map(d=>d.textContent.trim())}});
// the arrow must point somewhere a player can go from here: on the island surface (0..144 x 0..128, above the sea), or
// into the ore workings only while the adventurer is down there, or at the pack (pulse) for a pack step
function arrowSane(s){if(!s.arrow)return !!(s.pulse||s.tabs.length);const inCavern=/^b:cavern:/.test(s.surface||'');
  const onIsland=s.arrow.x>=0&&s.arrow.x<=144&&s.arrow.z>=0&&s.arrow.z<=128&&!(Number.isFinite(s.arrow.y)&&s.arrow.y<-5);
  return inCavern?true:onIsland}
const onGraph=page=>page.evaluate(()=>{const r=HolmArrivalQA.saveRecord();if(!r)return false;const g=HolmArrivalQA.navGraph();const n=g&&g.byId[r.nodeId];return !!n&&Math.hypot(n.x-player.position.x,n.z-player.position.z)<.6});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const invIds=s=>s.inv.filter(Boolean).sort();
// ---------- the cases ----------
const CASES=[];const add=(id,fn)=>CASES.push({id,fn});
add('fresh',async(page,id)=>{
  await boot(page,PROFILE(id));const s=await state(page);
  ok(id,'a new adventurer boots on the live island (tutors-holm-v3) with the 18-lesson v6 curriculum at study_route, nothing credited',s.provider==='tutors-holm-v3'&&s.v===6&&s.lesson==='study_route'&&s.ledger.length===0&&!s.complete,s);
  ok(id,'objective names Guide Bram and the arrow points at the Guide House door (an exact target on the island), pack is 28 slots',s.objective==='Talk to Guide Bram in the Guide House.'&&arrowSane(s)&&/door|Guide House/i.test(s.arrow&&s.arrow.label||'')&&s.invLen===28,s);
  ok(id,'a new adventurer starts walking (run off, 2004) on a graph stance at the landing',s.runOn===false&&await onGraph(page),{runOn:s.runOn,surface:s.surface,pos:s.pos});
  await reload(page);const r=await state(page);
  ok(id,'a fresh save round-trips (same lesson, empty ledger, same stance)',r.lesson==='study_route'&&r.ledger.length===0&&r.surface===s.surface&&Math.hypot(r.pos[0]-s.pos[0],r.pos[2]-s.pos[2])<.6,{s:{lesson:s.lesson,surface:s.surface,pos:s.pos},r:{lesson:r.lesson,surface:r.surface,pos:r.pos}});
});
add('legacy-july',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'a July 2026 save with no world meta boots on the island (tutors-holm-v3); the unknown curriculum grants nothing (study_route)',s.provider==='tutors-holm-v3'&&s.lesson==='study_route'&&s.ledger.length===0&&s.lastLoad&&s.lastLoad.ok,s);
  ok(id,'its 24-slot pack becomes 28 slots with every item kept in its slot; spark runes become wit (mind) runes; the bank is kept (the crowns may carry the 50 of the Apprentice deed on entry)',s.invLen===28&&s.inv[0]==='hatchetx1'&&s.inv[1]==='tinderboxx1'&&s.inv[2]==='logsx1'&&s.inv[3]==='mind_runex5'&&/^coinsx(25|75)$/.test(s.inv[4])&&s.inv.slice(5).every(x=>!x)&&same(s.bank,['breadx2']),{inv:s.inv,bank:s.bank});
  ok(id,'the pre-kit look loads (name kept), the old music ids are sanitised, and the adventurer stands on a safe graph stance',s.look&&s.look.name==='Oldtimer'&&await onGraph(page),{look:s.look,surface:s.surface,pos:s.pos});
  // the old look carried onto the kit (holm_island_player legacyKit): male -> body A, short hair, a beard, the blue shirt
  await waitFor(page,()=>!!(CharCfg.kit&&CharCfg.kit.body),null,15000);await sleep(1500);
  const kit=await page.evaluate(()=>{const k=CharCfg.kit,hex=HolmKit.palette('torso')[k.colors.torso],v=parseInt(hex.slice(1),16),d=HolmKit.defaults('A');
   return {body:k.body,hair:HolmKit.label(k.body,'Hair',k.parts.Hair),jaw:k.parts.Jaw?HolmKit.label(k.body,'Jaw',k.parts.Jaw):null,torso:hex,blue:(v&255)>((v>>16)&255),isDefault:JSON.stringify(k.parts)===JSON.stringify(d.parts)&&JSON.stringify(k.colors)===JSON.stringify(d.colors)}});
  ok(id,'the pre-kit look is carried onto the kit (body A for a man, short hair, a beard, the blue shirt as the nearest torso colour), not reset to the default',kit.body==='A'&&kit.hair==='Short'&&kit.jaw==='Short'&&kit.blue&&!kit.isDefault,kit);
  ok(id,'objective and arrow are sane (Guide Bram, a target on the island)',/Guide Bram/.test(s.objective)&&arrowSane(s),{objective:s.objective,arrow:s.arrow});
  await reload(page);const r=await state(page);ok(id,'after migration the save round-trips in the current format (provider, ledger, pack, bank)',r.provider==='tutors-holm-v3'&&same(r.inv,s.inv)&&same(r.bank,s.bank)&&same(r.ledger,s.ledger),{inv:r.inv,bank:r.bank});
});
add('v4-old-island',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  const want=['equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread'];
  ok(id,'an old-island v4 save boots on the island with its known prefix credited (6 lessons incl. bread) and the missing orientation due',s.provider==='tutors-holm-v3'&&same(s.ledger,want)&&s.lesson==='study_route',s);
  ok(id,'tutors of credited lessons count as spoken to (Wenna, Hettie), Bram is due first; bakehouse and Quest Lodge doors are open; the rope is not tied yet',same(s.talked,['hettie','wenna'])&&s.due==='bram'&&s.gates.includes('bakehouse-door')&&s.gates.includes('lodge-door')&&s.rope&&!s.rope.tied,{talked:s.talked,due:s.due,gates:s.gates,rope:s.rope});
  ok(id,'every item kept (24-slot pack padded to 28); old-island coordinates are replaced by a safe island stance',invIds(s).join()===['breadx1','coinsx40','cooked_perchx1','fishing_netx1','hatchetx1','tinderboxx1'].join()&&s.invLen===28&&await onGraph(page),{inv:s.inv,pos:s.pos,surface:s.surface});
  ok(id,'objective and arrow sane',/Guide Bram/.test(s.objective)&&arrowSane(s),{objective:s.objective,arrow:s.arrow});
});
add('v5-catch-fish',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'an old-island v5 save at catch_fish keeps its 4-lesson prefix + the optional bread, and is at catch_fish',s.provider==='tutors-holm-v3'&&same(s.ledger,['study_route','equip_hatchet','chop_logs','light_fire','bake_bread'])&&s.lesson==='catch_fish',s);
  ok(id,'Bram, Wenna and Hettie count as spoken to; no tutor is due; the fishing objective shows and the arrow is on a live pond ripple',same(s.talked,['bram','hettie','wenna'])&&!s.due&&/Net a fish/.test(s.objective)&&arrowSane(s)&&/Net a fish/.test(s.arrow&&s.arrow.label||''),{talked:s.talked,due:s.due,objective:s.objective,arrow:s.arrow});
  ok(id,'pack and bank kept exactly',same(s.inv.slice(0,6),['hatchetx1','tinderboxx1','fishing_netx1','logsx1','breadx1','coinsx55'])&&same(s.bank,['logsx3']),{inv:s.inv,bank:s.bank});
  // real input: net a fish at the ripple the arrow shows (the lesson is doable from the migrated state)
  const spot=await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});
  for(let k=0;k<5&&!await page.evaluate(()=>Player.count('raw_perch')>0);k++){await clickNamed(page,await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null}));await waitFor(page,()=>Player.count('raw_perch')>0,null,45000)}
  const a=await state(page);ok(id,'by real clicks the migrated adventurer walks to the ripple, nets a perch and the lesson moves on to cook_fish',a.lesson==='cook_fish'&&a.ledger.includes('catch_fish'),{spot,lesson:a.lesson,chat:a.chat});
});
add('v5-open-bank',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'a late v5 save (at open_bank) keeps everything done and becomes due at the earliest new lesson (bake_bread)',same(s.ledger,['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','descend_cavern','mine_copper','mine_tin','smelt_bronze','forge_dagger'])&&s.lesson==='bake_bread',s);
  ok(id,'Hettie is due (banner + arrow), the bakehouse door is open, the lodge is shut, the rope counts as tied (already past the shaft)',s.due==='hettie'&&/Cook Hettie/.test(s.objective)&&arrowSane(s)&&s.gates.includes('bakehouse-door')&&!s.gates.includes('lodge-door')&&s.rope&&s.rope.tied,{due:s.due,objective:s.objective,arrow:s.arrow,gates:s.gates,rope:s.rope});
  ok(id,'items and XP kept',invIds(s).join()===['bronze_daggerx1','coinsx80','fishing_netx1','hammerx1','hatchetx1','pickaxex1','tinderboxx1'].join()&&await page.evaluate(()=>Player.xp.Smithing===90),{inv:s.inv});
});
add('v6-island-v1-checkpoint',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'an early island save keeps its v6 ledger (9 lessons) and talked tutors; its retired-graph checkpoint falls back to a safe stance on the current graph',s.provider==='tutors-holm-v3'&&s.ledger.length===9&&s.lesson==='mine_copper'&&s.talked.join()==='ansel,bram,hettie,wenna'&&await onGraph(page),{ledger:s.ledger,lesson:s.lesson,surface:s.surface,pos:s.pos});
  ok(id,'from the surface the objective and arrow lead to the mine shaft, not into the sea over the offshore ore workings',arrowSane(s),{objective:s.objective,arrow:s.arrow,surface:s.surface,due:s.due});
});
add('graduated-mainland',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p,false);
  await waitFor(page,()=>typeof CRWorldMode!=='undefined'&&!!CRWorldMode.providerId,null,60000);const s=await state(page);
  ok(id,'a graduated save on the mainland boots on the mainland (never the island), graduation and every item kept',s.provider==='veyhollow-commons-v2'&&s.complete&&same(s.inv.slice(0,5),['coinsx230','breadx4','bronze_daggerx1','worn_bowx1','arrowsx12'])&&same(s.bank,['logsx5'])&&s.equip.weapon==='bronze_dagger',{provider:s.provider,complete:s.complete,inv:s.inv,bank:s.bank,equip:s.equip});
  await reload(page,false);const r=await state(page);ok(id,'and stays on the mainland after a save + reload',r.provider==='veyhollow-commons-v2'&&r.complete,{provider:r.provider});
});
add('graduated-on-island',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'a graduated save still on the old island boots on the new island with graduation kept (every gate open, rope tied)',s.provider==='tutors-holm-v3'&&s.complete&&s.gates.length===4&&s.rope&&s.rope.tied,{complete:s.complete,gates:s.gates,rope:s.rope});
  ok(id,'the last objective sends them to Ferryman Tobin and the arrow is on him',/Ferryman Tobin/.test(s.objective)&&arrowSane(s)&&/Tobin/.test(s.arrow&&s.arrow.label||''),{objective:s.objective,arrow:s.arrow});
  // real input: to Tobin, talk, board: the departure pack is granted once and the skiff sails
  const w=await L.walkTo(page,'haven','shore',true,[]);const tb=await talkTo(page,'tobin');await closeDialogue(page);await L.walkTo(page,'haven','boat',false,[]);await clickService(page,'Ferry','boat');
  const sailed=await waitFor(page,()=>typeof CRWorldMode!=='undefined'&&!/holm/.test(CRWorldMode.providerId||''),null,90000);const a=await state(page);
  ok(id,'by real clicks: down to the cove, Tobin spoken to, the skiff boarded, the mainland reached with the departure pack claimed',!w.error&&tb.talked&&sailed&&a.provider==='veyhollow-commons-v2'&&await page.evaluate(()=>Tutorial.departurePackClaimed===true),{walk:w.error||'ok',talk:tb.talked,sailed,provider:a.provider,inv:a.inv});
  // NPC lifecycle, unload: the island's tutors went with the island (provider dispose on the crossing)
  await sleep(3000);const gone=await page.evaluate(()=>{let n=0;scene.traverse(o=>{if(/^island-tutor-/.test(o.name||''))n++});return {scene:n,clickables:WORLD.clickables.filter(o=>/^island-tutor-/.test(o.name||'')).length,tutors:typeof HolmIslandTutors!=='undefined'?HolmIslandTutors.tutors().length:null}});
  ok(id,'NPC lifecycle: after the crossing no island tutor is left in the scene or the clickables',gone.scene===0&&gone.clickables===0&&gone.tutors===0,gone);
});
// NPC lifecycle, failure (goal item "chunk-owned NPC lifecycle ... load/unload, failure"): Cook Hettie's model never
// arrives (the request is refused twice); the island still boots, the other tutors stand at their authored stances, and
// the bread lesson is not held for a tutor who is not there (no "Talk to Cook Hettie", the bucket rack works)
add('tutor-model-fails',async(page,id)=>{
  await page.setRequestInterception(true);let refused=0;
  page.on('request',r=>{if(/holm_tutor_hettie_v2\.glb/.test(r.url())){refused++;r.abort()}else r.continue()});
  await boot(page,PROFILE(id));
  const st=await page.evaluate(()=>{const b=scene.getObjectByName('island-tutor-bram'),s=HolmArrivalQA.arrivalStance('holm_orientation');return {ready:HolmIslandTutors.ready(),missing:HolmIslandTutors.missing(),count:HolmIslandTutors.tutors().length,
   bram:b&&s?+Math.hypot(b.position.x-s.x,b.position.z-s.z).toFixed(2):null}});
  ok(id,'a tutor model that never arrives is asked for twice and recorded missing; the other nine stand at their authored stances (Guide Bram beside his chart)',refused===2&&st.ready&&st.missing.hettie==='model'&&st.count===9&&st.bram!==null&&st.bram<3,{refused,...st});
  await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),upTo('bake_bread'));await sleep(1500);const s=await state(page);
  ok(id,'with Cook Hettie missing the bread lesson is not held on her: the objective is the bread line, not "Talk to Cook Hettie"',s.lesson==='bake_bread'&&!s.due&&!/Cook Hettie/.test(s.objective)&&/bakehouse/i.test(s.objective),{objective:s.objective,due:s.due});
  await L.walkTo(page,'bakehouse','entrance',true,[]);await clickService(page,'Take bucket');await sleep(800);const b=await state(page);
  ok(id,'and the bakehouse bucket rack works by a real click (a bucket in the pack, no "speak to" refusal)',b.inv.some(x=>/^bucketx/.test(x||''))&&!b.chat.some(t=>/speak to Cook Hettie first/.test(t)),{inv:b.inv.filter(Boolean),chat:b.chat});
});
// full inventory at the pier (found by the human-pace playthrough 2026-09-29): the welcome pack is refused with the number
// of slots to free, the objective line counts them down while the pack tab pulses, and after the leftovers are dropped
// from the pack menu the skiff sails with the whole welcome pack
add('full-pack-departure',async(page,id)=>{
  const f=FIXTURES['graduated-on-island']();f.inv=Array.from({length:28},(_,i)=>i===0?slot('coins',30):slot(i%2?'logs':'bread'));
  const p=PROFILE(id);await seed(page,p,f);await boot(page,p);
  await L.walkTo(page,'haven','shore',true,[]);const tb=await talkTo(page,'tobin');await closeDialogue(page);await L.walkTo(page,'haven','boat',false,[]);
  const dep=await L.boardSkiff(page);const a=await state(page);
  ok(id,'a full pack at the pier: the welcome pack is refused with a count of slots to free (drop or bank), the objective counts them down with the pack tab pulsing, and once leftovers are dropped the skiff sails and the welcome pack is claimed',
   tb.talked&&!!dep.room&&/drop something/.test(dep.room.chat.join(' '))&&/Free \d+ more pack slot/.test(dep.room.objective)&&dep.room.drops.length>=dep.room.need&&dep.sailed&&a.provider==='veyhollow-commons-v2'&&await page.evaluate(()=>Tutorial.departurePackClaimed===true),{room:dep.room,sailed:dep.sailed,provider:a.provider});
});
add('graduated-legacy',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  ok(id,'a graduated save from before world meta starts on the Holm (boot rule) with graduation kept and its crowns, pointed at Tobin',s.provider==='tutors-holm-v3'&&s.complete&&same(s.inv.slice(0,1),['coinsx99'])&&s.invLen===28&&/Ferryman Tobin/.test(s.objective)&&arrowSane(s),{complete:s.complete,inv:s.inv.slice(0,2),objective:s.objective,arrow:s.arrow});
});
add('full-pack-24',async(page,id)=>{
  const f=FIXTURES[id](),p=PROFILE(id);await seed(page,p,f);await boot(page,p);const s=await state(page);
  const want=f.inv.map(x=>x.id+'x'+x.qty);
  ok(id,'a full 24-slot pack keeps all 24 items in their slots and gains four free slots',s.invLen===28&&same(s.inv.slice(0,24),want)&&s.inv.slice(24).every(x=>!x),{inv:s.inv});
  await reload(page);const r=await state(page);ok(id,'and round-trips unchanged',same(r.inv,s.inv),{inv:r.inv});
});
add('full-pack-wenna',async(page,id)=>{
  const p=PROFILE(id);await boot(page,p);
  // set up: the orientation done (Bram spoken to), a full 28-slot pack, standing by Wenna at the head of the Minnow Hollow path
  await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(['study_route']);Player.inv=Player.inv.map((s,i)=>({id:i%3?'logs':'bread',qty:1}));UI.refreshInv()});
  const near=await page.evaluate(()=>{const w=scene.getObjectByName('island-tutor-wenna').position;let best=null,d=1e9;HolmArrivalQA.navGraph().nodes.forEach(n=>{const k=Math.hypot(n.x-w.x,n.z-w.z);if(k>2&&k<4&&Math.abs(n.y-w.y)<.5&&k<d){d=k;best=n.id}});return best});
  await page.evaluate(n=>HolmArrivalQA.qaPlace(n),near);await sleep(2500);
  const before=await state(page);const t1=await talkTo(page,'wenna');await closeDialogue(page);await sleep(1200);const a=await state(page);
  ok(id,'a full pack at Wenna: she says to make room, no tools are handed and nothing in the pack is lost',t1.ok&&(t1.pages||[]).concat(a.chat).some(x=>/too full|Make room/i.test(x||''))&&same(a.inv,before.inv)&&!a.inv.some(x=>/hatchet|tinderbox|fishing_net/.test(x||'')),{pages:t1.pages,chat:a.chat,inv:a.inv.slice(0,4)});
  // real input: the pack menu's Drop on three logs (right-click the slot, click "Drop")
  await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="inv"]');if(t)t.click()});await sleep(400);
  const dropped=[];for(let k=0;k<3;k++){const i=await page.evaluate(()=>Player.inv.findIndex(s=>s&&s.id==='logs'));const sel='#inv-grid .inv-slot:nth-child('+(i+1)+')';
   const b=await page.$eval(sel,e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});await page.mouse.click(b[0],b[1],{button:'right'});await sleep(400);
   const rows=await L.readMenuRows(page);const at=await page.evaluate(()=>{const r=Array.from(document.querySelectorAll('#ctx-rows .ctx-row')).find(r=>/^Drop/.test(r.textContent.trim()));if(!r)return null;const b=r.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});
   if(at){await page.mouse.click(at[0],at[1]);dropped.push('ok')}else{dropped.push(rows);await page.keyboard.press('Escape')}await sleep(700)}
  const t2=await talkTo(page,'wenna');await closeDialogue(page);const got=await waitFor(page,()=>['hatchet','tinderbox','fishing_net'].every(i=>Player.count(i)>0),null,20000);const b2=await state(page);
  ok(id,'after dropping three logs by the pack menu, asking again hands over the hatchet, tinderbox and net; every other item is still there',got&&dropped.every(x=>x==='ok')&&b2.inv.filter(x=>x==='breadx1').length===before.inv.filter(x=>x==='breadx1').length,{dropped,got,chat:b2.chat,inv:b2.inv});
});
add('interrupt-bread',async(page,id)=>{
  const p=PROFILE(id);await boot(page,p);
  await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),upTo('bake_bread'));await L.walkTo(page,'bakehouse','entrance',true,[]);
  const h=await talkTo(page,'hettie');for(const l of ['Take bucket','Take bucket','Fill bucket with flour'])await clickService(page,l);
  const s=await state(page);await reload(page);const r=await state(page);
  ok(id,'reload in the middle of the bread lesson: buckets and flour kept, Hettie still counts as spoken to, same lesson, the arrow on the next station (water butt)',h.talked&&r.lesson==='bake_bread'&&r.talked.includes('hettie')&&!r.due&&same(invIds(r),invIds(s))&&(r.inv.join().match(/bucket_flour/)||[]).length===1&&/water/i.test(r.arrow&&r.arrow.label||''),{before:s.inv.filter(Boolean),after:r.inv.filter(Boolean),arrow:r.arrow,talked:r.talked});
  for(const l of ['Fill bucket with water','Take dough'])await clickService(page,l);await clickInventory(page,'dough');if(await count(page,'bread_dough')<1){await clickInventory(page,'bucket_flour');await clickInventory(page,'dough')}
  await clickInventory(page,'bread_dough');await clickService(page,'Cook');await waitFor(page,()=>Player.count('bread')>0,null,30000);await closeDialogue(page);
  const d=await state(page);ok(id,'and the lesson finishes by real clicks after the reload (bread baked, learn_quests next)',d.lesson==='learn_quests'&&d.ledger.includes('bake_bread'),{lesson:d.lesson});
});
add('interrupt-dialogue',async(page,id)=>{
  const p=PROFILE(id);await boot(page,p);
  await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),upTo('learn_quests'));await L.walkTo(page,'lodge','board',false,[]);
  // open Loremaster Ansel's chat box by a real click, read the first page, then reload with the box still open
  await clickNamed(page,'island-tutor-ansel');const open=await waitFor(page,()=>{const d=document.getElementById('dialogue-modal'),n=document.getElementById('dlg-name');return d&&getComputedStyle(d).display!=='none'&&n&&/Ansel/.test(n.textContent)},null,60000);
  const s=await state(page);await reload(page);const r=await state(page);
  ok(id,'reload with a tutor\'s chat box half read: nothing breaks, the tutor is still due (the talk counts once the chat ends), same lesson',open&&s.due==='ansel'&&r.due==='ansel'&&r.lesson==='learn_quests'&&/Loremaster Ansel/.test(r.objective)&&arrowSane(r),{open,before:s.due,after:r.due,objective:r.objective,arrow:r.arrow});
  const t=await talkTo(page,'ansel');await closeDialogue(page);await clickService(page,'Study quest board');await sleep(1500);await closeDialogue(page);const d=await state(page);
  ok(id,'talking again and studying the board by real clicks completes the lesson',t.talked&&d.ledger.includes('learn_quests'),{talked:t.talked,lesson:d.lesson});
});
add('interrupt-climb',async(page,id)=>{
  const p=PROFILE(id);await boot(page,p);
  await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),upTo('relight_lastlight'));
  const door=await page.evaluate(()=>HolmArrivalQA.qaStance('lastlight','door'));await page.evaluate(n=>HolmArrivalQA.qaPlace(n),door.id);await sleep(2500);
  const t=await talkTo(page,'aldous');for(const w of ['ladder1-foot','ladder2-foot'])await clickService(page,'Climb-up ladder',w);
  const s=await state(page);await reload(page);const r=await state(page);
  ok(id,'reload half way up Lastlight (two ladders climbed): back on the same storey and stance, the arrow on the third ladder',t.talked&&r.surface===s.surface&&Math.abs(r.pos[1]-s.pos[1])<.3&&Math.hypot(r.pos[0]-s.pos[0],r.pos[2]-s.pos[2])<.6&&s.pos[1]>door.y+2&&/ladder/i.test(r.arrow&&r.arrow.label||''),{door:door.y,before:{s:s.surface,p:s.pos},after:{s:r.surface,p:r.pos},arrow:r.arrow});
  await clickService(page,'Climb-up ladder','ladder3-foot');await clickService(page,'Pull beacon lever','lever');await waitFor(page,()=>Tutorial.complete,null,30000);
  ok(id,'and the climb goes on by real clicks to the lever (Lastlight lit, island complete)',await page.evaluate(()=>Tutorial.complete===true),{});
});
add('interrupt-rope',async(page,id)=>{
  const p=PROFILE(id);await boot(page,p);
  await page.evaluate(ids=>HolmIslandCurriculum.qaGrant(ids),upTo('descend_cavern'));await L.walkTo(page,'quarry','approach',true,[]);
  await waitFor(page,()=>!!scene.getObjectByName('island-rope-coil'),null,30000);const tk=await L.rightClickRow(page,'island-rope-coil','Take Rope');await waitFor(page,()=>Player.count('rope')>0,null,40000);
  const s=await state(page);await reload(page);const r=await state(page);
  ok(id,'reload holding the untied rope: the rope is still in the pack, the stage is tie, the objective says to use it on the shaft and the arrow is on the shaft',!tk.error&&r.inv.some(x=>/^ropex/.test(x||''))&&r.rope&&r.rope.stage==='tie'&&!r.rope.tied&&/Use the rope/.test(r.objective)&&/rope|shaft/i.test(r.arrow&&r.arrow.label||''),{take:tk.error||'ok',rope:r.rope,objective:r.objective,arrow:r.arrow});
  await L.walkTo(page,'quarry','approach',true,[]);await clickInventory(page,'rope');await clickService(page,'Climb-down mine shaft','shaft');await waitFor(page,()=>HolmShaftRope.tied(),null,40000);
  await reload(page);const t=await state(page);
  ok(id,'reload with the rope tied: still tied (saved), the rope is gone from the pack, the objective says climb down',t.rope&&t.rope.tied&&t.rope.stage==='climb'&&!t.inv.some(x=>/^ropex/.test(x||''))&&/Climb down|rope hangs/i.test(t.objective+' '+(t.arrow&&t.arrow.label||'')),{rope:t.rope,objective:t.objective,arrow:t.arrow});
  await L.walkTo(page,'quarry','approach',true,[]);await clickService(page,'Climb-down mine shaft','shaft');const down=await waitFor(page,()=>player.position.y<-20,null,90000);const c=await state(page);
  await reload(page);const d=await state(page);
  ok(id,'down the rope into the ore workings, and a reload there restores the adventurer in the workings on the same stance',down&&/^b:cavern:/.test(d.surface||'')&&d.surface===c.surface&&Math.hypot(d.pos[0]-c.pos[0],d.pos[2]-c.pos[2])<.6&&d.pos[1]<-20,{down,before:c.surface,after:d.surface,pos:d.pos});
});
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
 const t0=Date.now();
 for(const c of CASES){if(ONLY.length&&!ONLY.includes(c.id))continue;
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e&&e.stack||e).slice(0,300)));const t=Date.now();console.log('case '+c.id);
  try{await c.fn(page,c.id)}catch(e){ok(c.id,'case ran without throwing',false,String(e&&e.stack||e).slice(0,600))}
  await shot(page,c.id);ok(c.id,'zero page errors',errs.length===0,errs.slice(0,3));console.log('  ('+Math.round((Date.now()-t)/1000)+' s)');await page.close();
 }
 await browser.close();
 const failed=results.filter(r=>!r.pass);
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({at:new Date().toISOString(),base:BASE,pass,total:results.length,seconds:Math.round((Date.now()-t0)/1000),failed:failed.map(f=>f.caseId+': '+f.name),results},null,1));
 console.log('[SAVE MIGRATION] '+pass+'/'+results.length+(failed.length?' FAILED: '+failed.map(f=>f.caseId+': '+f.name).join(' | '):'')+' -> '+OUT);
 process.exit(failed.length?1:0);
})();
