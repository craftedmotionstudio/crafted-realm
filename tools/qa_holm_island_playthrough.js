/* Tutor's Holm complete playthrough (owner acceptance: at least 10 complete runs, everything working).
 * A fresh adventurer on the island draft (?holmIsland=1) plays the whole 18-lesson curriculum IN ORDER with real input
 * and NO granted progress: each lesson is done only when the game itself advances the tutorial. The driver behaves
 * like a player reading the hint line: it talks to each area's tutor (chat-box, click to continue), walks by clicking
 * tiles, uses stations, inventory and the spellbook by clicking them, retries what a player would retry (burnt fish,
 * missed spells), then boards the ferry. Every run is logged (time, lessons, per-lesson seconds, errors, save/reload)
 * to scratchpad/holm_island_playthrough/runs.jsonl and summarised in docs/rebuild/HOLM_PLAYTHROUGHS.md.
 * Run: SMOKE_BASE=http://localhost:8088 node tools/qa_holm_island_playthrough.js [runs=1] */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,shot,enter,pos,walkTo,clickService,clickNamed,clickButtonText,waitFor,clickInventory,closeDialogue,count}=L;
const OUT=path.join(__dirname,'..','scratchpad','holm_island_playthrough');L.setOut(OUT);
const RUNS=Math.max(1,parseInt(process.argv[2]||'1',10));
const BASE0=(process.env.SMOKE_BASE||'http://127.0.0.1:8777');
// ---- small real-input helpers on top of the shared library ----
const lesson=page=>page.evaluate(()=>Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id);
const waitLesson=(page,id,ms)=>waitFor(page,id=>Tutorial.complete||Tutorial.steps[Tutorial.step].id!==id,id,ms||120000);
async function clickKind(page,kind,extra){   // click an object by its userData.kind (doors, charts, racks) where pick() hits it
  const name=await page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;
    let r=o;while(r.parent&&r.parent!==scene&&!r.name)r=r.parent;if(!o.name)o.name='pt-'+kind+'-'+Math.random().toString(36).slice(2,7);return o.name},kind,extra||null);
  return name?clickNamed(page,name):{error:'no '+kind};
}
async function talk(page,id){   // click the tutor, then click through every page of their chat box
  const c=await clickNamed(page,'island-tutor-'+id);if(c.error)return c;
  if(!await waitFor(page,()=>{const d=document.getElementById('dialogue-modal');return d&&getComputedStyle(d).display!=='none'},null,60000))return {error:'no dialogue'};
  const pages=[];for(let i=0;i<8;i++){const t=await page.evaluate(()=>{const d=document.getElementById('dialogue-modal');return getComputedStyle(d).display==='none'?null:d.textContent.replace(/\s+/g,' ').trim()});if(!t)break;pages.push(t.slice(0,160));
    const b=await page.evaluate(()=>{const bs=Array.from(document.querySelectorAll('#dialogue-modal button')).filter(b=>b.getBoundingClientRect().width>0);return bs.length?bs[0].textContent.trim():null});if(!b)break;
    await clickButtonText(page,'#dialogue-modal button',b);await sleep(500)}
  return {ok:true,pages:pages.length};
}
async function wield(page,id){if(await page.evaluate(id=>Player.equip.weapon===id,id))return true;return clickInventory(page,id)}
async function spellbook(page,spell){   // open the Spellbook tab and click the spell's button, like a player
  await page.evaluate(()=>{const t=Array.from(document.querySelectorAll('.tab-btn[data-tab="spells"]')).find(b=>b.getBoundingClientRect().width>0);if(t)t.click()});await sleep(600);
  const ok=await page.evaluate(spell=>{const b=Array.from(document.querySelectorAll('#spell-grid button')).find(b=>/Wind Strike/i.test(b.textContent));if(!b)return false;const r=b.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:false},spell);
  if(ok){await page.mouse.click(ok[0],ok[1]);await sleep(400)}
  await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="inv"]');if(t)t.click()});
  return page.evaluate(()=>Player.spell==='wind_strike');
}
async function attack(page,pen,opts){for(let i=0;i<4;i++){const n=await page.evaluate(pen=>{const x=HolmIslandTrials.npcs().find(n=>!n.dead&&n.islandPen===pen);return x?x.mesh.name:null},pen);if(!n){await sleep(2000);continue}
  const c=await clickNamed(page,n,opts);if(!c.error&&await waitFor(page,()=>!!Player.target,null,6000))return c}return {error:'no target'}}
// ---- the lessons, in the curriculum's order ----
const DO={
 async study_route(p){await clickKind(p,'arrival_door',['arrivalDoor','arrival']);await waitFor(p,()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},null,40000);
  await talk(p,'bram');return clickKind(p,'arrival_chart')},
 async equip_hatchet(p){if(!await p.evaluate(()=>Player.count('hatchet')>0))await clickKind(p,'arrival_provisions');await waitFor(p,()=>Player.count('hatchet')>0,null,30000);return clickInventory(p,'hatchet')},
 async chop_logs(p){await walkTo(p,'survival','trail',true,[]);await talk(p,'wenna');for(const t of ['oak-1','oak-2','oak-3']){if(await p.evaluate(()=>Player.count('logs')>0))break;const c=await clickNamed(p,'island-lesson-survival-'+t);if(!c.error)await waitFor(p,()=>Player.count('logs')>0,null,90000)}},
 async light_fire(p){await clickInventory(p,'tinderbox');await clickInventory(p,'logs');await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,20000);await sleep(1500)},
 async catch_fish(p){await walkTo(p,'survival','fishing',false,[]);await clickInventory(p,'fishing_net');await clickNamed(p,'island-lesson-survival-perch');await waitFor(p,()=>Player.count('raw_perch')>0,null,150000)},
 async cook_fish(p){for(let k=0;k<8&&await lesson(p)==='cook_fish';k++){
   if(!await p.evaluate(()=>Player.count('raw_perch')>0)){await walkTo(p,'survival','fishing',false,[]);await clickInventory(p,'fishing_net');await clickNamed(p,'island-lesson-survival-perch');await waitFor(p,()=>Player.count('raw_perch')>0,null,150000)}
   await walkTo(p,'survival','trail',true,[]);
   if(!await p.evaluate(()=>!!scene.getObjectByName('island-campfire'))){for(const t of ['oak-2','oak-3','oak-1']){if(await p.evaluate(()=>Player.count('logs')>0))break;await clickNamed(p,'island-lesson-survival-'+t);await waitFor(p,()=>Player.count('logs')>0,null,90000)}
    await clickInventory(p,'tinderbox');await clickInventory(p,'logs');await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,20000);await sleep(1500)}
   const b=await p.evaluate(()=>Player.count('cooked_perch')+Player.count('burnt_perch'));await clickNamed(p,'island-campfire');await waitFor(p,b=>Player.count('cooked_perch')+Player.count('burnt_perch')>b,b,120000)}},
 async bake_bread(p){await walkTo(p,'bakehouse','entrance',true,[]);await talk(p,'hettie');
  for(const l of ['Take bucket','Take bucket','Fill bucket with flour','Fill bucket with water','Take dough'])await clickService(p,l);
  await clickInventory(p,'dough');if(await count(p,'bread_dough')<1){await clickInventory(p,'bucket_flour');await clickInventory(p,'dough')}
  await clickInventory(p,'bread_dough');await clickService(p,'Cook');await waitFor(p,()=>Player.count('bread')>0,null,30000);await closeDialogue(p)},
 async learn_quests(p){await walkTo(p,'lodge','board',true,[]);await talk(p,'ansel');await clickService(p,'Study quest board');await sleep(1500);await closeDialogue(p)},
 async descend_cavern(p){await walkTo(p,'quarry','approach',true,[]);await clickService(p,'Climb-down shaft ladder','shaft');await waitFor(p,()=>player.position.y<-20,null,120000);await talk(p,'durgin')},
 async mine_copper(p){await clickNamed(p,'island-lesson-cavern-copper-1');await waitFor(p,()=>Player.count('copper_ore')>0,null,90000)},
 async mine_tin(p){await clickNamed(p,'island-lesson-cavern-tin-1');await waitFor(p,()=>Player.count('tin_ore')>0,null,90000)},
 async smelt_bronze(p){await clickNamed(p,'island-lesson-furnace');await clickButtonText(p,'#dialogue-modal button','Smelt a Bronze bar.');await waitFor(p,()=>Player.count('bronze_bar')>0,null,30000)},
 async forge_dagger(p){await clickNamed(p,'island-lesson-anvil');await clickButtonText(p,'#smith-grid-overlay div[title]','Bronze dagger');await waitFor(p,()=>Player.count('bronze_dagger')>0,null,30000);
  await clickService(p,'Climb-up ladder','ladder');await waitFor(p,()=>player.position.y>0,null,60000)},
 async melee_trial(p){await walkTo(p,'keep','court',true,[]);await talk(p,'corrick');await wield(p,'bronze_dagger');await attack(p,'keep-court');await waitLesson(p,'melee_trial',150000)},
 async ranged_trial(p){await waitFor(p,()=>Player.count('worn_bow')>0||Player.equip.weapon==='worn_bow',null,15000);await wield(p,'worn_bow');await attack(p,'keep-court');await waitLesson(p,'ranged_trial',150000)},
 async open_bank(p){await walkTo(p,'bank','entrance',true,[]);await talk(p,'maud');await clickService(p,'Use bank counter','counter');await waitLesson(p,'open_bank',60000);await p.evaluate(()=>{try{UI.closeModal('bank-modal')}catch(e){}})},
 async magic_trial(p){await walkTo(p,'mage','entrance',true,[]);await talk(p,'ilse');await waitFor(p,()=>Player.count('air_rune')>0,null,15000);await closeDialogue(p);await spellbook(p,'wind_strike');
  await attack(p,'mage-yard',{keepDialogs:true});await waitLesson(p,'magic_trial',150000)},
 async relight_lastlight(p){await walkTo(p,'lastlight','door',true,[]);await talk(p,'aldous');
  for(const w of ['ladder1-foot','ladder2-foot','ladder3-foot'])await clickService(p,'Climb-up ladder',w);await clickService(p,'Pull beacon lever','lever');await waitLesson(p,'relight_lastlight',30000);
  for(const w of ['ladder3-top','ladder2-top','ladder1-top'])await clickService(p,'Climb-down ladder',w)}};
async function playOnce(browser,n){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e&&e.stack||e).slice(0,300)));
  const t0=Date.now(),per={},profile='playthrough-'+n+'-'+Date.now().toString(36);let status='incomplete',note='';
  try{
    await page.goto(BASE0+'/?holmIsland=1&qaProfile='+profile,{waitUntil:'load',timeout:120000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,60000);
    const hint0=await page.evaluate(()=>document.getElementById('obj-text').textContent);
    for(let guard=0;guard<30;guard++){
      const id=await lesson(page);if(id==='complete'){status='complete';break}
      const s=Date.now();console.log('  run '+n+' lesson '+id+' | '+(await page.evaluate(()=>document.getElementById('obj-text').textContent)).slice(0,90));
      try{await DO[id](page)}catch(e){note=id+': '+String(e).slice(0,200)}
      await waitLesson(page,id,20000);per[id]=Math.round((Date.now()-s)/1000);
      if(await lesson(page)===id){status='stuck';note=note||('stuck at '+id);await shot(page,'run'+n+'_stuck_'+id);break}
      if(id==='cook_fish'||id==='forge_dagger'||id==='open_bank'){   // save + reload mid-run: progress must come back exactly
        const before=await page.evaluate(()=>({step:Tutorial.step,ledger:(Tutorial.completedLessonIds||[]).length}));await page.evaluate(()=>SaveGame.save(true));
        await page.reload({waitUntil:'load'});await enter(page);await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,60000);
        const after=await page.evaluate(()=>({step:Tutorial.step,ledger:(Tutorial.completedLessonIds||[]).length}));
        if(after.step!==before.step||after.ledger!==before.ledger){status='save-mismatch';note='after '+id+' '+JSON.stringify({before,after});break}}
    }
    if(status==='complete'){   // departure: board the ferry at the haven (Tobin first)
      await walkTo(page,'haven','shore',true,[]);await talk(page,'tobin');const b=await clickService(page,'Ferry','boat');
      const sailed=await waitFor(page,()=>typeof CRWorldMode!=='undefined'&&!/holm/.test(CRWorldMode.providerId||''),null,60000);
      if(!sailed){status='departure-failed';note='ferry did not sail ('+(b.error||'clicked')+')'}
      await shot(page,'run'+n+'_end');
    }
    note=note||('first hint: '+hint0.slice(0,60));
  }catch(e){status='driver-error';note=String(e).slice(0,300);await shot(page,'run'+n+'_error')}
  const rec={run:n,profile,status,minutes:+((Date.now()-t0)/60000).toFixed(1),lessons:Object.keys(per).length,perLessonSeconds:per,errors:errors.slice(0,5),note,at:new Date().toISOString()};
  fs.appendFileSync(path.join(OUT,'runs.jsonl'),JSON.stringify(rec)+'\n');await page.close();return rec;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const results=[];
  try{for(let i=1;i<=RUNS;i++){const r=await playOnce(browser,i);results.push(r);console.log('[PLAYTHROUGH] run '+i+' '+r.status+' in '+r.minutes+' min, lessons '+r.lessons+'/18, page errors '+r.errors.length+(r.note?' | '+r.note:''))}}
  finally{await browser.close()}
  const ok=results.filter(r=>r.status==='complete'&&!r.errors.length).length;
  console.log('[PLAYTHROUGH] '+ok+'/'+results.length+' complete runs with zero errors');process.exit(ok===results.length?0:1);
})();
