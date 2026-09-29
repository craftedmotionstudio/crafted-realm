/* Tutor's Holm complete playthrough (owner acceptance: at least 10 complete runs, everything working).
 * A fresh adventurer on the island draft (?holmIsland=1) plays the whole 18-lesson curriculum IN ORDER with real input
 * and NO granted progress: each lesson is done only when the game itself advances the tutorial. The driver behaves
 * like a player reading the hint line: when the banner says "Talk to <tutor>" it clicks that tutor and reads the chat
 * box page by page (2004 rule: an area's lessons wait for its tutor; every talk must register, and the camp's oaks must
 * refuse before Wenna is spoken to), walks by clicking tiles, uses stations, inventory and the spellbook by clicking
 * them, retries what a player would retry (burnt fish, missed spells), then speaks to Tobin and boards the ferry. Every run is logged (time, lessons, per-lesson seconds, errors, save/reload)
 * to scratchpad/holm_island_playthrough/runs.jsonl and summarised in docs/rebuild/HOLM_PLAYTHROUGHS.md.
 * Human pace (goal item, 2026-09-29): --human (or HOLM_PACE=human) plays like a person: the new adventurer spends a
 * minute in the 2004 character creator (arrows clicked one at a time), every chat-box page is read at 230 words a minute
 * before its button, every click waits a reaction time (0.9-1.7 s) first, and each new objective line is read and looked
 * for (the arrow) before acting. Walking stays click by click, never a teleport. The run is logged with pace:"human".
 * Run: SMOKE_BASE=http://localhost:8088 node tools/qa_holm_island_playthrough.js [runs=1] [--human] */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,shot,enter,pos,walkTo,clickService,clickNamed,clickButtonText,waitFor,clickInventory,closeDialogue,count,objective,lastChat}=L;
const OUT=path.join(__dirname,'..','scratchpad','holm_island_playthrough');L.setOut(OUT);
const ARGS=process.argv.slice(2),HUMAN=ARGS.includes('--human')||process.env.HOLM_PACE==='human';
const RUNS=Math.max(1,parseInt(ARGS.find(a=>/^\d+$/.test(a))||'1',10));
const BASE0=(process.env.SMOKE_BASE||'http://127.0.0.1:8777');
// ---- small real-input helpers on top of the shared library ----
const lesson=page=>page.evaluate(()=>Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id);
const waitLesson=(page,id,ms)=>waitFor(page,id=>Tutorial.complete||Tutorial.steps[Tutorial.step].id!==id,id,ms||120000);
async function clickKind(page,kind,extra){   // click an object by its userData.kind (doors, charts, racks) where pick() hits it
  const name=await page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;
    let r=o;while(r.parent&&r.parent!==scene&&!r.name)r=r.parent;if(!o.name)o.name='pt-'+kind+'-'+Math.random().toString(36).slice(2,7);return o.name},kind,extra||null);
  return name?clickNamed(page,name):{error:'no '+kind};
}
// the run's record of every tutor met: did the banner say "Talk to <tutor>" first, how many pages, did it register
let TALKS=[],FIRE=[];
async function talk(page,id){
  const banner=await objective(page),r=await L.talkTo(page,id);
  TALKS.push({id,banner:!!r.name&&banner.indexOf('Talk to '+r.name)>=0,pages:r.pages?r.pages.length:0,talked:!!r.talked,error:r.error||null});
  return r;
}
async function wield(page,id){if(await page.evaluate(id=>Player.equip.weapon===id,id))return true;return clickInventory(page,id)}
async function spellbook(page,spell){   // open the Spellbook tab and click the spell's button, like a player
  await page.evaluate(()=>{const t=Array.from(document.querySelectorAll('.tab-btn[data-tab="spells"]')).find(b=>b.getBoundingClientRect().width>0);if(t)t.click()});await sleep(600);
  const ok=await page.evaluate(spell=>{const b=Array.from(document.querySelectorAll('#spell-grid button')).find(b=>/Gale Dart/i.test(b.textContent));if(!b)return false;const r=b.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:false},spell);
  if(ok){await page.mouse.click(ok[0],ok[1]);await sleep(400)}
  await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="inv"]');if(t)t.click()});
  return page.evaluate(()=>Player.spell==='wind_strike');
}
async function attack(page,pen,opts){for(let i=0;i<4;i++){// the grubkin already fighting you first (2004 single combat: "You are already under attack!" for any other), else the nearest
  const n=await page.evaluate(pen=>{const l=HolmIslandTrials.npcs().filter(n=>!n.dead&&n.islandPen===pen);if(!l.length)return null;const d=n=>Math.hypot(n.mesh.position.x-player.position.x,n.mesh.position.z-player.position.z);
   const mine=l.find(n=>n===Player.aggressiveNpc);return (mine||l.sort((a,b)=>d(a)-d(b))[0]).mesh.name},pen);if(!n){await sleep(2000);continue}
  const c=await clickNamed(page,n,opts);if(!c.error&&await waitFor(page,()=>!!Player.target,null,6000))return c;await closeDialogue(page)}return {error:'no target'}}
// a player who sees no progress clicks the foe again: up to four attack cycles, each waiting 40 s for the credit
async function fight(page,pen,id,opts){for(let k=0;k<4;k++){await attack(page,pen,opts);if(await waitLesson(page,id,40000))return true}return false}
async function toBeach(p){const r=await p.evaluate(()=>HolmFishing.fireRing());return L.walkPoint(p,r.ring[0]+.5,r.ring[1]+.6,[])}
// to cook: stand beside the fire, never on its tile (a fire does not block its tile; from on top of it a click hits the ground)
async function toFire(p){const f=await p.evaluate(()=>{const o=scene.getObjectByName('island-campfire');return o?[o.position.x,o.position.z]:null});if(!f)return toBeach(p);
 for(const [dx,dz] of [[1,0],[-1,0],[0,-1],[0,1]]){await L.walkPoint(p,f[0]+dx,f[1]+dz,[]);const q=await pos(p);if(Math.hypot(q[0]-f[0],q[2]-f[1])>.9)return}}
const spot=p=>p.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});
// still down in the ore workings (the guide arrow points at the drift ladder): climb it into the Warden's Keep hall
async function upDrift(p){for(let k=0;k<3&&await p.evaluate(()=>player.position.y<-20);k++){await walkTo(p,'cavern','exit',false,[]);await clickService(p,'Climb-up drift ladder','exit');await waitFor(p,()=>player.position.y>0,null,60000)}}
// net a fish like a player: when the spot moves on ("The fish have moved on.") or the net comes up empty for a while,
// click the nearest live ripple again
async function netFish(p){for(let k=0;k<6&&!await p.evaluate(()=>Player.count('raw_perch')>0);k++){
  // a ripple takes a plain click while a net is in the pack (the menu's "Net"), or the net's "Use" on it
  await clickNamed(p,await spot(p));await waitFor(p,()=>Player.count('raw_perch')>0,null,45000)}}
// ---- the lessons, in the curriculum's order ----
const DO={
 async study_route(p){await clickKind(p,'arrival_door',['arrivalDoor','arrival']);await waitFor(p,()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},null,40000);
  await L.enterGuideHouse(p);await talk(p,'bram');return clickKind(p,'arrival_chart')},
 // owner review 4 (2026-09-27): Bram and his chart give the overview only; the hatchet, tinderbox and net come from Wenna
 // at the camp when she is spoken to (2004), so the driver arrives with an empty pack and wields what she hands over
 async equip_hatchet(p){const empty=await p.evaluate(()=>['hatchet','tinderbox','fishing_net'].every(i=>Player.count(i)===0));await walkTo(p,'survival','trail',true,[]);
  // the owner's play-test: a player who goes straight for a tree is sent to Wenna first
  {const c=await clickNamed(p,'island-lesson-survival-oak-1');await sleep(1200);const chat=await lastChat(p,4);
   TALKS.push({id:'wenna-refusal',refused:!c.error&&chat.some(t=>/speak to Wenna first/.test(t))&&await count(p,'logs')===0})}
  await talk(p,'wenna');const got=await waitFor(p,()=>['hatchet','tinderbox','fishing_net'].every(i=>Player.count(i)>0),null,30000);
  TALKS.push({id:'wenna-tools',handed:empty&&got&&(await lastChat(p,6)).some(t=>/^Wenna hands you /.test(t))});return clickInventory(p,'hatchet')},
 async chop_logs(p){for(const t of ['oak-1','oak-2','oak-3']){if(await p.evaluate(()=>Player.count('logs')>0))break;const c=await clickNamed(p,'island-lesson-survival-'+t);if(!c.error)await waitFor(p,()=>Player.count('logs')>0,null,90000)}},
 // owner review 4: the fire is lit right where the adventurer stands after chopping (2004), not at one set spot; the fish
 // come from the live ripples on the pond and cook on that same fire (or a new one wherever the player is, if it burnt out)
 async light_fire(p){await clickInventory(p,'tinderbox');await clickInventory(p,'logs');
  if(!await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,12000)){await toBeach(p);await clickInventory(p,'tinderbox');await clickInventory(p,'logs');await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,20000)}
  FIRE.push(await p.evaluate(()=>{const f=scene.getObjectByName('island-campfire'),r=HolmFishing.fireRing();if(!f)return null;const a=r.area,x=f.position.x,z=f.position.z;return {x:+x.toFixed(1),z:+z.toFixed(1),onBeach:x>=a[0]-1&&x<=a[2]+1&&z>=a[1]-1&&z<=a[3]+1}}));await sleep(1500)},
 async catch_fish(p){await netFish(p)},
 async cook_fish(p){for(let k=0;k<8&&await lesson(p)==='cook_fish';k++){
   if(!await p.evaluate(()=>Player.count('raw_perch')>0))await netFish(p);
   await toFire(p);
   if(!await p.evaluate(()=>!!scene.getObjectByName('island-campfire'))){for(const t of ['oak-2','oak-3','oak-1']){if(await p.evaluate(()=>Player.count('logs')>0))break;await clickNamed(p,'island-lesson-survival-'+t);await waitFor(p,()=>Player.count('logs')>0,null,90000)}
    await clickInventory(p,'tinderbox');await clickInventory(p,'logs');if(!await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,12000)){await toBeach(p);await clickInventory(p,'tinderbox');await clickInventory(p,'logs');await waitFor(p,()=>!!scene.getObjectByName('island-campfire'),null,20000)}await sleep(1500)}
   const b=await p.evaluate(()=>Player.count('cooked_perch')+Player.count('burnt_perch'));await clickNamed(p,'island-campfire');await waitFor(p,b=>Player.count('cooked_perch')+Player.count('burnt_perch')>b,b,120000)}},
 async bake_bread(p){await walkTo(p,'bakehouse','entrance',true,[]);await talk(p,'hettie');
  for(const l of ['Take bucket','Take bucket','Fill bucket with flour','Fill bucket with water','Take dough'])await clickService(p,l);
  await clickInventory(p,'dough');if(await count(p,'bread_dough')<1){await clickInventory(p,'bucket_flour');await clickInventory(p,'dough')}
  await clickInventory(p,'bread_dough');await clickService(p,'Cook');await waitFor(p,()=>Player.count('bread')>0,null,30000);await closeDialogue(p)},
 async learn_quests(p){await walkTo(p,'lodge','board',true,[]);await talk(p,'ansel');await clickService(p,'Study quest board');await sleep(1500);await closeDialogue(p)},
 // owner review 5 (2026-09-28): the shaft is climbed on a rope, as the objective line says step by step: take the coil lying
 // beside the shaft (the old-school menu's Take), use it on the shaft to tie it to the frame, then climb down. The tie is saved
 // at once: the driver saves, reloads and checks the rope still hangs there before it climbs (the ledger has no descent yet)
 async descend_cavern(p){await walkTo(p,'quarry','approach',true,[]);const rec={id:'shaft-rope',objective:[await objective(p)]};
  if(!await p.evaluate(()=>HolmShaftRope.tied())){
   if(await count(p,'rope')<1){await waitFor(p,()=>!!scene.getObjectByName('island-rope-coil'),null,30000);const t=await L.rightClickRow(p,'island-rope-coil','Take Rope');rec.take=t.error||'ok';rec.takeRows=t.rows;
    rec.took=await waitFor(p,()=>Player.count('rope')>0,null,40000)}
   rec.objective.push(await objective(p));await clickInventory(p,'rope');const c=await clickService(p,'Climb-down mine shaft','shaft');rec.tie=c.error||'ok';
   rec.tied=await waitFor(p,()=>HolmShaftRope.tied()&&Tutorial.shaftRopeTied===true&&Player.count('rope')===0,null,40000);rec.objective.push(await objective(p));
   await p.evaluate(()=>SaveGame.save(true));await p.reload({waitUntil:'load'});await enter(p);await waitFor(p,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);
   rec.afterReload=await p.evaluate(()=>({tied:HolmShaftRope.tied(),saved:Tutorial.shaftRopeTied===true,lesson:Tutorial.steps[Tutorial.step].id,prop:HolmShaftRope.snapshot().propVisible}))}
  else rec.alreadyTied=true;
  await walkTo(p,'quarry','approach',true,[]);await clickService(p,'Climb-down mine shaft','shaft');rec.down=await waitFor(p,()=>player.position.y<-20,null,120000);
  rec.ok=!!(rec.alreadyTied||(rec.took!==false&&rec.tied&&rec.afterReload&&rec.afterReload.tied&&rec.afterReload.saved&&rec.afterReload.prop))&&rec.down;TALKS.push(rec);await talk(p,'durgin')},
 async mine_copper(p){await clickNamed(p,'island-lesson-cavern-copper-1');await waitFor(p,()=>Player.count('copper_ore')>0,null,90000)},
 async mine_tin(p){await clickNamed(p,'island-lesson-cavern-tin-1');await waitFor(p,()=>Player.count('tin_ore')>0,null,90000)},
 async smelt_bronze(p){await clickNamed(p,'island-lesson-furnace');await clickButtonText(p,'#dialogue-modal button','Smelt a Bronze bar.');await waitFor(p,()=>Player.count('bronze_bar')>0,null,30000)},
 async forge_dagger(p){await clickNamed(p,'island-lesson-anvil');await clickButtonText(p,'#smith-grid-overlay div[title]','Bronze dagger');await waitFor(p,()=>Player.count('bronze_dagger')>0,null,30000);
  // v2 land: out by the east drift, its ladder coming up through the trapdoor in the Warden's Keep hall
  // the ladder is roped off until the dagger lesson is credited: wait for the game to move on first, as a player reads the chat
  await waitLesson(p,'forge_dagger',30000);await upDrift(p)},
 async melee_trial(p){await upDrift(p);await walkTo(p,'keep','court',true,[]);await talk(p,'corrick');await wield(p,'bronze_dagger');await fight(p,'keep-court','melee_trial')},
 async ranged_trial(p){await waitFor(p,()=>Player.count('worn_bow')>0||Player.equip.weapon==='worn_bow',null,15000);await wield(p,'worn_bow');await fight(p,'keep-court','ranged_trial')},
 async open_bank(p){await walkTo(p,'bank','entrance',true,[]);await talk(p,'maud');await clickService(p,'Use bank counter','counter');await waitLesson(p,'open_bank',60000);await p.evaluate(()=>{try{UI.closeModal('bank-modal')}catch(e){}})},
 async magic_trial(p){await walkTo(p,'mage','entrance',true,[]);await talk(p,'ilse');await waitFor(p,()=>Player.count('air_rune')>0,null,15000);await closeDialogue(p);await spellbook(p,'wind_strike');
  // 2004: without a staff each Gale Dart is one cast (choose the spell, then the grubkin), so a player repeats it
  for(let k=0;k<40&&await lesson(p)==='magic_trial';k++){if(!await p.evaluate(()=>Player.spell==='wind_strike'))await spellbook(p,'wind_strike');
   await attack(p,'mage-yard',{keepDialogs:true});await waitFor(p,()=>!Player.target,null,9000)}},
 async relight_lastlight(p){await walkTo(p,'lastlight','door',true,[]);await talk(p,'aldous');
  for(const w of ['ladder1-foot','ladder2-foot','ladder3-foot'])await clickService(p,'Climb-up ladder',w);await clickService(p,'Pull beacon lever','lever');await waitLesson(p,'relight_lastlight',30000);
  for(const w of ['ladder3-top','ladder2-top','ladder1-top'])await clickService(p,'Climb-down ladder',w)}};
// human pace: a real click on a page element (reaction time first), as a player moves the mouse to a button
async function clickSel(page,sel){const xy=await page.evaluate(sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:null},sel);
  if(!xy)return false;await page.mouse.move(xy[0],xy[1]);if(L.pace())await sleep(L.pace().react());await page.mouse.click(xy[0],xy[1]);await sleep(400);return true}
// human pace: a new adventurer comes in through the login and spends about a minute in the 2004 character creator, one arrow
// at a time, watching the model change, then Confirms and reads the washed-ashore note (a continued save skips the creator)
const CREATOR=[['.kc-design','Next head',2],['.kc-design','Next torso',1],['.kc-design','Next legs',1],['.kc-colour','Next hair',2],['.kc-colour','Next torso',3],['.kc-colour','Next legs',1]];
async function enterHuman(page){
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:60000});
  if(await page.evaluate(()=>{try{return SaveGame.exists()}catch(e){return false}}))return {creator:false,continued:await enter(page)};
  await sleep(L.pace().look());await clickSel(page,'#btn-new');
  await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});await sleep(L.pace().look());await clickSel(page,'#btn-begin');
  await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
  if(!await page.evaluate(()=>typeof running!=='undefined'&&running))await clickSel(page,'#play-btn');
  await page.waitForFunction(()=>{if(typeof running==='undefined'||!running)return false;const b=document.getElementById('enter-buffer');return !b||b.style.display==='none'},{timeout:90000});
  const t0=Date.now(),clicks=[];
  const opened=await waitFor(page,()=>typeof HolmKitCreator!=='undefined'&&HolmKitCreator.active(),null,30000);
  if(opened){await sleep(L.pace().look());
    for(const [col,title,times] of CREATOR)for(let k=0;k<times;k++){const ok=await clickSel(page,col+' .kc-arrow.r[title="'+title+'"]');clicks.push(title+(ok?'':' (missed)'));await sleep(L.pace().look())}
    await clickSel(page,'.kc-confirm');await sleep(800);
    // the washed-ashore note: read it, then its button
    const note=await page.evaluate(()=>{const d=document.getElementById('dialogue-modal');return d&&getComputedStyle(d).display!=='none'?document.getElementById('dlg-text').textContent:null});
    if(note){await sleep(L.pace().read(note));const b=await page.evaluate(()=>{const b=Array.from(document.querySelectorAll('#dialogue-modal button')).find(b=>b.getBoundingClientRect().width>0);return b?b.textContent.trim():null});if(b)await clickButtonText(page,'#dialogue-modal button',b)}}
  await sleep(3000);
  return {creator:opened,creatorSeconds:Math.round((Date.now()-t0)/1000),clicks,look:await page.evaluate(()=>{try{return JSON.stringify(CharCfg.kit)}catch(e){return null}})};
}
async function playOnce(browser,n){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e&&e.stack||e).slice(0,300)));
  if(HUMAN)L.setPace(L.humanPace({seed:20260929+n}));let creator=null;
  // skilling-tool telemetry (HolmSkillTools, owner play-test 2026-09-25): per skill, how often the tool was in hand,
  // whether the weapon ever showed with it, and whether the weapon came back after; survives the mid-run reloads
  await page.evaluateOnNewDocument(()=>{let last=null;setInterval(()=>{try{
    if(typeof Player==='undefined'||typeof HolmSkillTools==='undefined'||typeof player==='undefined'||!player)return;
    const s=HolmSkillTools.status(),g=(player.userData&&player.userData.glbGear)||{},sk=HolmSkillTools.skillOfAction(Player.action),k=s.active?s.skill:sk;
    const r=JSON.parse(sessionStorage.getItem('__skillTools')||'{}'),bump=(key,f)=>{const e=r[key]||(r[key]={samples:0,tool:0,weaponShown:0,restored:0,notRestored:0,tools:{}});f(e)};
    if(k)bump(k,e=>{e.samples++;if(s.active){e.tool++;e.tools[s.tool]=1;if(g.weapon&&g.weapon.visible&&g.weapon.parent)e.weaponShown++}});
    if(last&&!s.active&&!sk)bump(last,e=>{if(!Player.equip.weapon||(g.weapon&&g.weapon.visible))e.restored++;else e.notRestored++});
    last=s.active?s.skill:(sk?last:null);sessionStorage.setItem('__skillTools',JSON.stringify(r))}catch(e){}},150)});
  const t0=Date.now(),per={},profile='playthrough-'+n+'-'+Date.now().toString(36);let status='incomplete',note='',run=null;TALKS=[];FIRE=[];
  // owner review 4: the objective box's MOVING ON notices, kept across the mid-run reloads
  await page.evaluateOnNewDocument(()=>{setInterval(()=>{try{if(typeof UI==='undefined'||UI.__moveLog)return;UI.__moveLog=1;const c=UI.chat;UI.chat=function(t){try{if(/Follow the arrow\.$/.test(String(t))){const l=JSON.parse(sessionStorage.getItem('__movingOn')||'[]');l.push(String(t).slice(0,90));sessionStorage.setItem('__movingOn',JSON.stringify(l))}}catch(e){}return c.apply(this,arguments)}}catch(e){}},100)});
  try{
    await page.goto(BASE0+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+profile+(process.env.SMOKE_QUERY||''),{waitUntil:'load',timeout:120000});if(HUMAN)creator=await enterHuman(page);else await enter(page);   // SMOKE_QUERY: e.g. &look=4b
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);await page.evaluate(()=>{if(!window.__qaTrace){window.__qaTrace=[];setInterval(()=>{window.__qaTrace.push([player.position.x,player.position.y,player.position.z]);if(window.__qaTrace.length>4000)window.__qaTrace.splice(0,2000)},120)}});
    const hint0=await page.evaluate(()=>document.getElementById('obj-text').textContent);
    run=await L.runOrb(page);   // a new adventurer walks; the player clicks the run orb, as in 2004
    for(let guard=0;guard<30;guard++){
      const id=await lesson(page);if(id==='complete'){status='complete';break}
      const s=Date.now();console.log('  run '+n+' lesson '+id+' | '+(await page.evaluate(()=>document.getElementById('obj-text').textContent)).slice(0,90));
      // human pace: read the new objective line, then look for the arrow before acting
      if(HUMAN){await sleep(L.pace().read(await objective(page)));await sleep(L.pace().look())}
      try{await DO[id](page)}catch(e){note=id+': '+String(e).slice(0,200)}
      await waitLesson(page,id,20000);per[id]=Math.round((Date.now()-s)/1000);
      if(await lesson(page)===id){status='stuck';const cs=await page.evaluate(()=>({target:!!Player.target,spell:Player.spell||null,weapon:Player.equip.weapon,air:Player.count('air_rune'),arrows:Player.count('arrows'),hp:Player.hp,dist:Player.target&&Player.target.mesh?+Math.hypot(player.position.x-Player.target.mesh.position.x,player.position.z-Player.target.mesh.position.z).toFixed(2):null}));
       note=note||('stuck at '+id+' '+JSON.stringify(cs));await shot(page,'run'+n+'_stuck_'+id);break}
      if(id==='cook_fish'||id==='forge_dagger'||id==='open_bank'){   // save + reload mid-run: progress must come back exactly
        const before=await page.evaluate(()=>({step:Tutorial.step,ledger:(Tutorial.completedLessonIds||[]).length,talked:(Tutorial.talkedTutors||[]).slice().sort().join()}));await page.evaluate(()=>SaveGame.save(true));
        await page.reload({waitUntil:'load'});await enter(page);await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);await page.evaluate(()=>{if(!window.__qaTrace){window.__qaTrace=[];setInterval(()=>{window.__qaTrace.push([player.position.x,player.position.y,player.position.z]);if(window.__qaTrace.length>4000)window.__qaTrace.splice(0,2000)},120)}});
        const after=await page.evaluate(()=>({step:Tutorial.step,ledger:(Tutorial.completedLessonIds||[]).length,talked:(Tutorial.talkedTutors||[]).slice().sort().join()}));
        if(after.step!==before.step||after.ledger!==before.ledger||after.talked!==before.talked){status='save-mismatch';note='after '+id+' '+JSON.stringify({before,after});break}}
    }
    if(status==='complete'){   // departure: board the ferry at the haven (Tobin first)
      // v2 land: down the Keeper's Stair to Lanternfoot Cove, Tobin first, then out along the pier to the skiff ("Board her
      // at the end of the pier")
      await walkTo(page,'haven','shore',true,[]);await talk(page,'tobin');await closeDialogue(page);await walkTo(page,'haven','boat',false,[]);const b=await clickService(page,'Ferry','boat');
      const sailed=await waitFor(page,()=>typeof CRWorldMode!=='undefined'&&!/holm/.test(CRWorldMode.providerId||''),null,60000);
      if(!sailed){status='departure-failed';note='ferry did not sail ('+(b.error||'clicked')+')'}
      await shot(page,'run'+n+'_end');
    }
    // 2004 rule: all ten tutors met in order, each announced on the banner first and registered by the game
    const met=TALKS.filter(t=>t.id.indexOf('-')<0),bad=met.filter(t=>!t.banner||!t.talked||t.error),refusal=TALKS.find(t=>t.id==='wenna-refusal');
    if(status==='complete'&&(met.length<10||bad.length||!(refusal&&refusal.refused))){status='talk-flow';note='talks '+JSON.stringify(TALKS).slice(0,400)}
    // owner review 4: Wenna hands over the tools (nothing from Bram or his chart), a MOVING ON notice at each of the eight
    // area changes, the fire lit where the player stood, run off for a new adventurer
    const tools=TALKS.find(t=>t.id==='wenna-tools'),moves=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__movingOn')||'[]')).catch(()=>[]);
    if(status==='complete'&&!(tools&&tools.handed)){status='tools-flow';note='wenna tools '+JSON.stringify(tools)}
    if(status==='complete'&&moves.length<8){status='moving-on';note='moving-on notices '+moves.length+' '+JSON.stringify(moves).slice(0,300)}
    if(status==='complete'&&!(run&&run.startedOff&&run.on)){status='run-default';note='run '+JSON.stringify(run)}
    {const rope=TALKS.find(t=>t.id==='shaft-rope');if(status==='complete'&&!(rope&&rope.ok)){status='rope-flow';note='shaft rope '+JSON.stringify(rope).slice(0,400)}}
    TALKS.push({id:'moving-on',count:moves.length,lines:moves},{id:'fire-spots',fires:FIRE},{id:'run-orb',run});
    note=note||('first hint: '+hint0.slice(0,60));
  }catch(e){status='driver-error';note=String(e).slice(0,300);await shot(page,'run'+n+'_error')}
  const skillTools=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('__skillTools')||'{}')).catch(()=>null);
  if(skillTools)console.log('  run '+n+' skill tools '+JSON.stringify(skillTools));
  const rec={run:n,profile,status,minutes:+((Date.now()-t0)/60000).toFixed(1),lessons:Object.keys(per).length,perLessonSeconds:per,talks:TALKS,errors:errors.slice(0,5),note,skillTools,at:new Date().toISOString(),
    pace:HUMAN?'human':'driver',paceLog:HUMAN&&L.pace()?Object.assign({},L.pace().log,{opts:L.pace().opts}):undefined,creator:creator||undefined};
  if(HUMAN)L.setPace(null);
  fs.appendFileSync(path.join(OUT,'runs.jsonl'),JSON.stringify(rec)+'\n');await page.close();return rec;
}
// requireable (tools/ref2004/capture_tutorial.js reuses the lesson steps): the runs start only when run directly
module.exports={DO,lesson,waitLesson,talk,clickKind,wield,spellbook,attack,fight,toBeach,toFire,spot,upDrift,netFish,talks:()=>TALKS,resetTalks:()=>{TALKS=[]}};
if(require.main===module)(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const results=[];
  try{for(let i=1;i<=RUNS;i++){const r=await playOnce(browser,i);results.push(r);console.log('[PLAYTHROUGH] run '+i+' '+r.status+' in '+r.minutes+' min ('+r.pace+' pace), lessons '+r.lessons+'/18, tutors met '+r.talks.filter(t=>t.talked).length+'/10, page errors '+r.errors.length+(r.note?' | '+r.note:''))}}
  finally{await browser.close()}
  const ok=results.filter(r=>r.status==='complete'&&!r.errors.length).length;
  console.log('[PLAYTHROUGH] '+ok+'/'+results.length+' complete runs with zero errors');process.exit(ok===results.length?0:1);
})();
