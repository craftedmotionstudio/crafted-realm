/* Tutor's Holm full route (finish goal M7: "Rewrite qa_holm_full_route.js for the new island and 18 lessons, including
 * bank, recovery, save/reload and negative cases"). Rewritten 2026-09-29 for the live Blender island (tutors-holm-v3,
 * GameConfig.holmIslandLive); the old-island route it replaces stays in git history (it drove ?holmLegacy=1).
 * One fresh adventurer, headless Chrome, real input throughout (tools/holm_island_driver_lib.js: every action is a
 * page.mouse click on a pixel whose game pick() hits the target, an inventory slot, a chat-box button or a menu row):
 *  - all 18 lessons in the curriculum's order, each only when the game itself advances the tutorial (the lesson steps
 *    are the playthrough driver's, tools/qa_holm_island_playthrough.js), every tutor spoken to first, then Tobin's
 *    ferry to the mainland with the departure pack;
 *  - negative cases: the relief chart before Guide Bram, an oak before Wenna and the bakehouse rack before Cook Hettie
 *    (talk-first rule), the barred Quest Lodge door while the bread is due (a locked door says why), the mine shaft
 *    before its turn (skipping ahead: "closed off"), the shaft without the rope, the drift ladder out of the ore
 *    workings before the dagger (skipping ahead: "roped off");
 *  - recovery: the tinderbox dropped from the pack menu and re-granted by the Guide House provision rack (the objective
 *    and arrow must lead there); a death in the Proving Ground (the broodmother) recovered on Tutor's Holm terms:
 *    nothing lost, full hitpoints, back at the Guide House, the lesson ledger untouched;
 *  - bank: open the account at the counter, deposit an item and withdraw it again by clicking the slots, the deposit
 *    kept across a save + reload;
 *  - save/reload mid-route (after cook_fish, forge_dagger, open_bank and with the rope tied): step, ledger, tutors,
 *    pack and stance come back exactly;
 *  - guidance audit ("exact arrows", "clear direction, objective and process at every moment"): before every route
 *    action the objective line and the guide arrow's resolved target are read, the arrow must sit on the exact object
 *    about to be used (or its building's door from outside, or the pack slot that pulses for a pack step), and a framed
 *    screenshot is kept for the contact sheet (tools/sheet_holm_guide_audit.py).
 * Run: SMOKE_BASE=http://127.0.0.1:8171 node tools/qa_holm_full_route.js
 *   -> scratchpad/holm_full_route/{results.json,guide_probes.json,probe_*.png} */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const OUT=path.join(__dirname,'..','scratchpad','holm_full_route');L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const PROFILE='route-'+Date.now().toString(36);
const sleep=L.sleep;
const checks=[],t0=Date.now();
function ok(label,cond,detail){checks.push({label,ok:!!cond,detail,t:+((Date.now()-t0)/1000).toFixed(1)});console.log((cond?'  ok  ':'  FAIL ')+label+(cond?'':'  '+JSON.stringify(detail).slice(0,700)));return !!cond}
// ---------- the guidance probe: wraps the lib's click helpers BEFORE the lesson steps load (they bind them at require) ----------
const G={page:null,on:false,depth:0,list:[],n:0,lastKey:'',cur:null};   // cur: the lesson the driver is working on
async function probe(kind,a1,a2){
  const page=G.page;if(!page||!G.on||G.depth>0)return;
  // the guide re-aims every half second (HolmIslandGuide.update); a player takes longer than that to reach for the mouse
  await sleep(700);
  const r=await page.evaluate((kind,a1,a2)=>{
    const g=GuideArrow._resolve(),c=g.spec?GuideArrow._center(g.spec):null,arrow=c?{x:+c.cx.toFixed(2),z:+c.cz.toFixed(2),y:g.spec&&Number.isFinite(g.spec.y)?+g.spec.y.toFixed(2):null}:null;
    const pulse=Array.from(document.querySelectorAll('#inv-grid .kit-hint')).map(el=>{const i=Array.prototype.indexOf.call(el.parentNode.children,el);return Player.inv[i]&&Player.inv[i].id})[0]||null;
    const tabs=Array.from(document.querySelectorAll('.tab-btn.holm-guide-pulse')).map(b=>b.dataset.tab);
    let obj=null;
    if(kind==='name')obj=scene.getObjectByName(a1);
    else if(kind==='tutor')obj=scene.getObjectByName('island-tutor-'+a1);
    else if(kind==='service')scene.traverse(m=>{const s=m.userData&&m.userData.islandService;if(!obj&&m.isMesh&&s&&s.label===a1&&(!a2||s.target===a2))obj=m});
    const box=o=>{const b=new THREE.Box3().setFromObject(o);return b.isEmpty()?null:b};
    const gap=(b,p)=>Math.hypot(Math.max(b.min.x-p.x,0,p.x-b.max.x),Math.max(b.min.z-p.z,0,p.z-b.max.z));
    let dist=null,dy=null,family=null,target=null;
    if(obj&&arrow){const b=box(obj);if(b){dist=+gap(b,arrow).toFixed(2);dy=arrow.y!==null?+(arrow.y-b.max.y).toFixed(2):null;target=b.getCenter(new THREE.Vector3()).toArray().map(v=>+v.toFixed(2))}
      // a sibling of the same family (another teaching oak, ore rock, ripple, practice grubkin) exactly under the arrow
      const fam=kind==='name'&&/-\d+$/.test(a1)?a1.replace(/\d+$/,''):null;
      if(fam&&dist>.6)scene.traverse(o=>{if(!family&&o!==obj&&o.name&&o.name.indexOf(fam)===0&&/\d+$/.test(o.name)){const bb=box(o);if(bb&&gap(bb,arrow)<=.6)family=o.name}})}
    const rec=typeof HolmArrivalQA!=='undefined'&&HolmArrivalQA.saveRecord?HolmArrivalQA.saveRecord():null;
    const ob=document.getElementById('objective'),txt=document.getElementById('obj-text');
    return {lesson:Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id,objective:ob&&ob.style.display!=='none'&&txt?txt.textContent:'',label:g.label||'',arrow,pulse,tabs,
      target,dist,dy,family,surface:rec?rec.surface:null,player:[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(2)),due:typeof HolmIslandTalk!=='undefined'&&HolmIslandTalk.pending()?HolmIslandTalk.pending().id:null};
  },kind,a1||null,a2||null).catch(e=>({error:String(e).slice(0,200)}));
  r.kind=kind;r.what=a1+(a2?' / '+a2:'');r.driverLesson=G.cur||null;r.t=+((Date.now()-t0)/1000).toFixed(1);
  const key=r.lesson+'|'+kind+'|'+r.what+'|'+r.label;
  if(key!==G.lastKey&&!r.error){G.lastKey=key;G.n++;r.shot='probe_'+String(G.n).padStart(3,'0');await frameShot(page,r)}
  G.list.push(r);
}
// a player turns the camera toward where the arrow points; the capture keeps the objective box, the arrow and its tag in view
async function frameShot(page,r){
  const prev=await page.evaluate(a=>{const p=[camCtl.yaw,camCtl.pitch,camCtl.dist];if(a){const dx=player.position.x-a.x,dz=player.position.z-a.z,d=Math.hypot(dx,dz);
    camCtl.yaw=d>.5?Math.atan2(dx,dz):camCtl.yaw;camCtl.pitch=1.0;camCtl.dist=Math.min(34,Math.max(12,d*1.5))}return p},r.arrow||null);
  await sleep(1300);
  // where the arrow's tip and the object about to be used fall on screen (the contact sheet rings them)
  r.screen=await page.evaluate((a,t)=>{const rect=renderer.domElement.getBoundingClientRect(),pj=p=>{if(!p)return null;const v=new THREE.Vector3(p[0],p[1],p[2]).project(camera);return v.z>1?null:[Math.round((v.x+1)/2*rect.width+rect.left),Math.round((1-v.y)/2*rect.height+rect.top)]};
   return {arrow:a?pj([a.x,Number.isFinite(a.y)?a.y:groundY(a.x,a.z)||0,a.z]):null,target:pj(t)}},r.arrow||null,r.target||null).catch(()=>null);
  await page.screenshot({path:path.join(OUT,r.shot+'.png')}).catch(()=>{});
  await page.evaluate(p=>{camCtl.yaw=p[0];camCtl.pitch=p[1];camCtl.dist=p[2]},prev);
}
function wrap(name,fn){const orig=L[name];L[name]=async function(page){const a=fn(...arguments);if(a&&G.page===page)await probe(...a);G.depth++;try{return await orig.apply(this,arguments)}finally{G.depth--}}}
wrap('clickNamed',(page,name)=>/^island-tutor-/.test(name)?['tutor',name.slice(13)]:['name',name]);
wrap('clickService',(page,label,which)=>['service',label,which]);
wrap('clickInventory',(page,id)=>['pack',id]);
wrap('talkTo',(page,id)=>['tutor',id]);
wrap('rightClickRow',(page,name)=>['name',name]);
const P=require('./qa_holm_island_playthrough.js');   // the lesson steps (DO) now call the wrapped helpers
const {enter,pos,waitFor,clickService,clickNamed,clickInventory,closeDialogue,talkTo,objective,lastChat,count,shot}=L;
// ---------- small helpers ----------
const lesson=page=>page.evaluate(()=>Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id);
const chat=(page,n)=>lastChat(page,n||4);
const snap=page=>page.evaluate(()=>({step:Tutorial.step,lesson:Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id,ledger:(Tutorial.completedLessonIds||[]).slice(),talked:(Tutorial.talkedTutors||[]).slice().sort(),
  inv:Player.inv.map(s=>s?s.id+'x'+s.qty:null),bank:(Player.bank||[]).map(s=>s.id+'x'+s.qty),equip:Object.assign({},Player.equip),hp:Player.hp,maxHp:Player.maxHp,
  surface:(HolmArrivalQA.saveRecord()||{}).surface||null,pos:[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(2)),provider:CRWorldMode.providerId}));
async function reload(page){await page.evaluate(()=>SaveGame.save(true));await page.reload({waitUntil:'load'});await enter(page);await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);await sleep(2000)}
async function clickKind(page,kind){const name=await page.evaluate(kind=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind)o=m});if(!o)return null;if(!o.name)o.name='pt-'+kind;return o.name},kind);return name?clickNamed(page,name):{error:'no '+kind}}
// the pack menu by real input: right-click the item's slot, click the row that starts with the option
async function packMenu(page,itemId,option){
  await page.evaluate(()=>{const t=document.querySelector('.tab-btn[data-tab="inv"]');if(t)t.click()});await sleep(300);
  const i=await page.evaluate(id=>Player.inv.findIndex(s=>s&&s.id===id),itemId);if(i<0)return {error:'no '+itemId};
  const b=await page.$eval('#inv-grid .inv-slot:nth-child('+(i+1)+')',e=>{const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]});
  await page.mouse.move(b[0],b[1]);await sleep(200);await page.mouse.click(b[0],b[1],{button:'right'});await sleep(400);const rows=await L.readMenuRows(page);
  const at=await page.evaluate(o=>{const r=Array.from(document.querySelectorAll('#ctx-rows .ctx-row')).find(r=>r.textContent.trim().indexOf(o)===0);if(!r)return null;const q=r.getBoundingClientRect();return [q.x+q.width/2,q.y+q.height/2]},option);
  if(!at){await page.keyboard.press('Escape');return {error:'no row '+option,rows}}
  await page.mouse.move(at[0],at[1]);await sleep(150);await page.mouse.click(at[0],at[1]);await sleep(600);return {ok:true,rows};
}
async function clickSlot(page,grid,itemId){const xy=await page.evaluate((grid,id)=>{const list=grid==='bank-grid'?Player.bank:Player.inv;const i=list.findIndex(s=>s&&s.id===id);if(i<0)return null;
  const el=document.querySelectorAll('#'+grid+' > *')[i];if(!el)return null;const r=el.getBoundingClientRect();return r.width>0?[r.x+r.width/2,r.y+r.height/2]:null},grid,itemId);
  if(!xy)return false;await page.mouse.move(xy[0],xy[1]);await sleep(200);await page.mouse.click(xy[0],xy[1]);await sleep(600);return true}
// ---------- the route ----------
const EXTRA={};   // per lesson: run before (and around) the playthrough's lesson step
EXTRA.study_route=async page=>{
  G.on=true;await P.clickKind(page,'arrival_door',['arrivalDoor','arrival']);await waitFor(page,()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},null,40000);
  await L.enterGuideHouse(page);G.on=false;
  // NEGATIVE (talk-first): the relief chart before Guide Bram
  await clickKind(page,'arrival_chart');await sleep(1500);const c=await chat(page,4);
  ok('talk-first: the relief chart refuses until Guide Bram has been spoken to ("You should speak to Guide Bram first."), no credit',c.some(t=>/speak to Guide Bram first/.test(t))&&await lesson(page)==='study_route',{chat:c});
  G.on=true;const t=await P.talk(page,'bram');await clickKind(page,'arrival_chart');G.on=false;
  ok('Guide Bram\'s chat box explains the island (pages read, talk registered)',t.talked&&(t.pages||[]).length>=2,{pages:(t.pages||[]).length,talked:t.talked});
  return true};
EXTRA.light_fire=async page=>{
  // RECOVERY (a lost tool): the tinderbox dropped from the pack menu before the fire is lit
  const d=await packMenu(page,'tinderbox','Drop');await sleep(800);
  const s=await page.evaluate(()=>{const g=GuideArrow._resolve();return {tb:Player.count('tinderbox'),label:g.label,objective:document.getElementById('obj-text').textContent,chat:Array.from(document.querySelectorAll('#chatbox > div')).slice(-4).map(d=>d.textContent.trim())}});
  ok('recovery: the tinderbox is dropped by the pack menu (Drop); the arrow then leads to the spare tools (the Guide House provision rack) and the chat says so',!d.error&&s.tb===0&&/spare|rack|tools/i.test(s.label)&&s.chat.some(t=>/Spare tools hang on the rack in the Guide House/.test(t)),{drop:d,after:s});
  // follow the guidance: walk to the Guide House and take a spare from the rack (the rack's Collect-tools, a real click)
  const door=await page.evaluate(()=>{const b=new THREE.Box3().setFromObject(scene.getObjectByName('DoorSouthLeaf')).getCenter(new THREE.Vector3());return [b.x,b.z]});
  const w=await L.walkPoint(page,door[0],door[1]+2.5,[]);await L.enterGuideHouse(page);G.on=true;await clickKind(page,'arrival_provisions');G.on=false;await waitFor(page,()=>Player.count('tinderbox')>0,null,40000);const c=await chat(page,4);
  ok('recovery: the provision rack re-grants the lost tinderbox ("Replacement tools placed in your pack")',await page.evaluate(()=>Player.count('tinderbox')===1)&&c.some(x=>/Replacement tools placed in your pack/.test(x)),{walk:w.error||'ok',chat:c});
  // back to the camp: the fire is lit where the adventurer stands, on the camp's open ground
  await L.walkTo(page,'survival','trail',true,[]);return false};
EXTRA.bake_bread=async page=>{
  await L.walkTo(page,'bakehouse','entrance',true,[]);
  // NEGATIVE (a locked door): the Quest Lodge door while the bread is due
  const door=await page.evaluate(()=>{const o=HolmIslandGates.leafObject('lodge-door');if(!o)return null;let m=null;o.traverse(q=>{if(!m&&q.isMesh)m=q});if(!m)return null;if(!m.name)m.name='pt-lodge-door';return m.name});
  const r=door?await clickNamed(page,door):{error:'no lodge door'};await sleep(1500);const c=await chat(page,4);
  ok('locked door: the Quest Lodge door says why it is shut while the bread is due ("stays shut until you have baked your first loaf")',!r.error&&c.some(t=>/Quest Lodge stays shut until you have baked your first loaf/.test(t))&&!await page.evaluate(()=>HolmIslandGates.isOpen('lodge-door')),{click:r.error||'ok',chat:c});
  // NEGATIVE (talk-first): the bucket rack before Cook Hettie
  await clickService(page,'Take bucket');await sleep(1200);const c2=await chat(page,4);
  ok('talk-first: the bakehouse bucket rack refuses until Cook Hettie has been spoken to; the banner names her',c2.some(t=>/speak to Cook Hettie first/.test(t))&&await page.evaluate(()=>Player.count('bucket')===0)&&/Cook Hettie/.test(await objective(page)),{chat:c2,objective:await objective(page)});
  // the lesson in the order the arrow gives it: a bucket, flour, another bucket, water, dough, knead (flour on the dough), bake
  G.on=true;await P.talk(page,'hettie');
  for(const l of ['Take bucket','Fill bucket with flour','Take bucket','Fill bucket with water','Take dough'])await clickService(page,l);
  await clickInventory(page,'bucket_flour');await clickInventory(page,'dough');await waitFor(page,()=>Player.count('bread_dough')>0,null,15000);
  await clickInventory(page,'bread_dough');await clickService(page,'Cook');await waitFor(page,()=>Player.count('bread')>0,null,30000);await closeDialogue(page);G.on=false;
  return true};
EXTRA.learn_quests=async page=>{
  // NEGATIVE (skipping ahead): the mine shaft before the Quest Lodge lesson
  const w=await L.walkTo(page,'quarry','approach',true,[]);await clickService(page,'Climb-down mine shaft','shaft');await sleep(1200);const c=await chat(page,4);
  ok('skipping ahead: the Quarry Gate\'s mine shaft is closed off until the Quest Lodge lesson ("Visit the Quest Lodge first"), nothing taken',!w.error&&c.some(t=>/mine shaft is closed off for now\. Visit the Quest Lodge first/.test(t))&&await page.evaluate(()=>player.position.y>-5&&!HolmShaftRope.tied()),{walk:w.error||'ok',chat:c});
  return false};
EXTRA.descend_cavern=async page=>{
  await L.walkTo(page,'quarry','approach',true,[]);
  // NEGATIVE: the shaft without the rope
  await clickService(page,'Climb-down mine shaft','shaft');await sleep(1500);const c=await chat(page,4);
  ok('the shaft without a rope refuses ("You need a rope tied to the frame to climb down") and the adventurer stays up top',c.some(t=>/You need a rope tied to the frame/.test(t))&&await page.evaluate(()=>player.position.y>-5),{chat:c});
  return false};
EXTRA.forge_dagger=async page=>{
  // NEGATIVE (skipping ahead): the drift ladder out of the ore workings before the bronze dagger
  await L.walkTo(page,'cavern','exit',false,[]);const b=await page.evaluate(()=>(HolmArrivalQA.saveRecord()||{}).surface);await clickService(page,'Climb-up drift ladder','exit');await sleep(1500);const c=await chat(page,4);
  ok('skipping ahead: the drift ladder out of the ore workings is roped off until the dagger is made; still below',c.some(t=>/drift ladder is roped off/.test(t))&&await page.evaluate(()=>player.position.y<-20),{surface:b,chat:c});
  return false};
EXTRA.open_bank=async page=>{
  G.on=true;await L.walkTo(page,'bank','entrance',true,[]);await P.talk(page,'maud');await clickService(page,'Use bank counter','counter');G.on=false;
  const opened=await waitFor(page,()=>{const m=document.getElementById('bank-modal');return m&&m.style.display==='block'},null,60000);await P.waitLesson(page,'open_bank',30000);
  ok('bank: the counter opens the bank and the open_bank lesson is credited',opened&&await page.evaluate(()=>(Tutorial.completedLessonIds||[]).includes('open_bank')),{opened});
  // deposit by clicking the pack side of the bank, withdraw by clicking the vault slot
  const item=await page.evaluate(()=>{const pick=['bread','cooked_perch','logs','burnt_perch','copper_ore'].find(id=>Player.count(id)>0);return pick||(Player.inv.find(s=>s&&s.id!=='coins'&&s.id!=='bronze_dagger'&&s.id!=='worn_bow'&&s.id!=='arrows')||{}).id||null});
  const before=await page.evaluate(id=>({inv:Player.count(id),bank:((Player.bank||[]).find(b=>b.id===id)||{qty:0}).qty}),item);
  await clickSlot(page,'bank-inv-grid',item);const dep=await page.evaluate(id=>({inv:Player.count(id),bank:((Player.bank||[]).find(b=>b.id===id)||{qty:0}).qty}),item);
  ok('bank: clicking the '+item+' in the bank\'s pack column deposits it (pack -1 stack, vault +)',dep.inv<before.inv&&dep.bank>before.bank,{item,before,dep});
  const xy=await page.evaluate(()=>{const b=document.querySelector('#bank-modal .close-x').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});await page.mouse.click(xy[0],xy[1]);await sleep(500);
  await reload(page);const kept=await page.evaluate(id=>((Player.bank||[]).find(b=>b.id===id)||{qty:0}).qty,item);
  ok('bank: the deposit is kept across a save + reload',kept===dep.bank,{kept,dep});
  await clickService(page,'Use bank counter','counter');await waitFor(page,()=>{const m=document.getElementById('bank-modal');return m&&m.style.display==='block'},null,60000);
  await clickSlot(page,'bank-grid',item);const wd=await page.evaluate(id=>({inv:Player.count(id),bank:((Player.bank||[]).find(b=>b.id===id)||{qty:0}).qty}),item);
  ok('bank: clicking the vault slot withdraws it back into the pack',wd.inv>dep.inv&&wd.bank<dep.bank,{wd,dep});
  const xy2=await page.evaluate(()=>{const b=document.querySelector('#bank-modal .close-x').getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]});await page.mouse.click(xy2[0],xy2[1]);await sleep(500);
  return true};
// PRACTICE ENEMIES: the grubkin felled in the melee trial comes back on its own spot (respawn), and the pen's grubkins
// never share a tile (collision) while it does
async function respawnCheck(page){
  const t=Date.now();let overlap=0,back=false,dead0=null;
  for(let k=0;k<50;k++){const s=await page.evaluate(()=>{const l=HolmIslandTrials.npcs().filter(n=>n.islandPen==='keep-court');const tiles={},alive=l.filter(n=>!n.dead);let dup=0;
    alive.forEach(n=>{const key=Math.floor(n.mesh.position.x)+','+Math.floor(n.mesh.position.z);if(tiles[key])dup++;tiles[key]=1});return {n:l.length,dead:l.filter(n=>n.dead).map(n=>n.mesh.name),dup}});
   if(dead0===null)dead0=s.dead;overlap+=s.dup;if(dead0.length&&!s.dead.length){back=true;break}if(!dead0.length){back=true;break}await sleep(500)}
  ok('practice enemies: the practice foe felled in the melee trial respawns in the keep court (about 10 ticks) and no two practice foes share a tile',back&&overlap===0,{dead0,back,overlap,seconds:Math.round((Date.now()-t)/1000)});
}
// DEATH (recovery): after the ranged trial, into the Proving Ground: challenge its strongest foe and fall. The foe is read
// from the Proving Ground's own data (the highest level there), never by creature name: the creatures pass replaces them
async function death(page){
  const site=await page.evaluate(()=>{const s=HolmProvingGround.sites();const b=HolmProvingGround.npcs().filter(n=>!n.dead).sort((p,q)=>(q.t.level||0)-(p.t.level||0))[0];return s&&b?{x:s.centre.x,z:s.centre.z,name:b.mesh.name,foe:b.t.name,level:b.t.level}:null});
  if(!site)return ok('death: the Proving Ground is on the island',false,{site});
  const before=await snap(page);const w=await L.walkPoint(page,site.x,site.z,[]);
  const deaths0=await page.evaluate(()=>WORLD.deathCount||0);
  for(let k=0;k<8&&await page.evaluate(d=>(WORLD.deathCount||0)===d,deaths0);k++){await clickNamed(page,site.name,{keepDialogs:true});await waitFor(page,d=>(WORLD.deathCount||0)>d,deaths0,25000)}
  await sleep(2500);const after=await snap(page);const c=await chat(page,16);
  const died=await page.evaluate(d=>(WORLD.deathCount||0)>d,deaths0);
  ok('death: challenged in the Proving Ground, the adventurer falls to its strongest foe ('+(site&&site.foe)+', level '+(site&&site.level)+')',died,{walk:w.error||'ok',site,chat:c});
  const home=await page.evaluate(()=>{const s=scene.getObjectByName('GuideHouse');if(!s)return null;const b=new THREE.Box3().setFromObject(s);return Math.hypot(player.position.x-(b.min.x+b.max.x)/2,player.position.z-(b.min.z+b.max.z)/2)});
  const keep=x=>x.inv.filter(Boolean).filter(i=>!/^arrows/.test(i)).sort().join();
  ok('death recovered (Tutor\'s Holm rule): nothing lost (pack except spent arrows, worn gear), full hitpoints, woken back at the Guide House, the ledger and lesson unchanged',
    died&&keep(after)===keep(before)&&JSON.stringify(after.equip)===JSON.stringify(before.equip)&&after.hp===after.maxHp&&home!==null&&home<9&&JSON.stringify(after.ledger)===JSON.stringify(before.ledger)&&after.lesson===before.lesson&&c.some(t=>/nothing is lost/.test(t)),
    {home,before:{inv:keep(before),equip:before.equip,lesson:before.lesson},after:{inv:keep(after),equip:after.equip,hp:after.hp,lesson:after.lesson},chat:c});
  const g=await page.evaluate(()=>{const g=GuideArrow._resolve();return {label:g.label,objective:document.getElementById('obj-text').textContent}});
  ok('after the death the objective and arrow carry on with the lesson due ('+after.lesson+')',!!g.label&&!!g.objective,g);
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});for(const f of fs.readdirSync(OUT))if(/^probe_\d+\.png$/.test(f))fs.unlinkSync(path.join(OUT,f));
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();G.page=page;const pageErrors=[],consoleErrors=[],failed=[];
 page.on('pageerror',e=>pageErrors.push(String(e&&e.stack||e).slice(0,300)));
 page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|favicon/.test(m.text()))consoleErrors.push(m.text().slice(0,300))});
 // (BUILD_INFO.json is the build stamp serve.ps1 writes for the review server; the QA static server has none: not a game asset)
 page.on('response',r=>{if(r.status()>=400&&!/favicon\.ico|\/BUILD_INFO\.json/.test(r.url()))failed.push(r.status()+' '+r.url())});
 const per={},reloads=[];
 try{
  await page.goto(BASE+'/?qaProfile='+PROFILE,{waitUntil:'load',timeout:180000});await enter(page);
  await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);
  await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>{window.__qaTrace.push([player.position.x,player.position.y,player.position.z]);if(window.__qaTrace.length>4000)window.__qaTrace.splice(0,2000)},120)});
  const b0=await page.evaluate(()=>({provider:CRWorldMode.providerId,v:Tutorial.curriculumVersion,n:Tutorial.steps.length,lesson:Tutorial.steps[Tutorial.step].id,tutors:HolmIslandTutors.tutors().length,objective:document.getElementById('obj-text').textContent,label:GuideArrow._resolve().label}));
  ok('boot: a fresh adventurer on the live island (tutors-holm-v3), 18-lesson v6 curriculum, 10 tutors, "Talk to Guide Bram", the arrow on the Guide House door',b0.provider==='tutors-holm-v3'&&b0.v===6&&b0.n===18&&b0.lesson==='study_route'&&b0.tutors===10&&b0.objective==='Talk to Guide Bram in the Guide House.'&&/door|Guide House/.test(b0.label),b0);
  const run=await L.runOrb(page);ok('a new adventurer walks until the run orb is clicked (2004)',run.startedOff&&run.on,run);
  for(let guard=0;guard<30;guard++){
   const id=await lesson(page);if(id==='complete')break;G.cur=id;const s=Date.now();console.log(' lesson '+id+' | '+(await objective(page)).slice(0,90));
   let done=false;try{if(EXTRA[id])done=await EXTRA[id](page);if(!done){G.on=true;await P.DO[id](page)}}catch(e){ok('lesson '+id+' ran without throwing',false,String(e&&e.stack||e).slice(0,500))}finally{G.on=false}
   await P.waitLesson(page,id,20000);per[id]=Math.round((Date.now()-s)/1000);
   if(await lesson(page)===id){ok('lesson '+id+' is credited by the game',false,{chat:await chat(page,6)});await shot(page,'stuck_'+id);break}
   if(id==='melee_trial')await respawnCheck(page);
   if(id==='ranged_trial')await death(page);
   if(id==='cook_fish'||id==='forge_dagger'||id==='open_bank'){
    const before=await snap(page);await reload(page);const after=await snap(page);
    const same=before.step===after.step&&JSON.stringify(before.ledger)===JSON.stringify(after.ledger)&&before.talked.join()===after.talked.join()&&JSON.stringify(before.inv)===JSON.stringify(after.inv)&&JSON.stringify(before.bank)===JSON.stringify(after.bank)&&before.surface===after.surface;
    reloads.push({after:id,same});ok('save + reload after '+id+': step, ledger, tutors, pack, bank and stance come back exactly',same,{before,after});
   }
  }
  const P0=P.talks(),met=P0.filter(t=>t.id.indexOf('-')<0);
  ok('all 18 lessons credited in order by real input',await lesson(page)==='complete'&&(await page.evaluate(()=>(Tutorial.completedLessonIds||[]).length))===18,{per});
  const ref=P0.find(t=>t.id==='wenna-refusal'),rope=P0.find(t=>t.id==='shaft-rope'),tools=P0.find(t=>t.id==='wenna-tools');
  ok('talk-first: an oak refuses before Wenna is spoken to (no logs)',!!(ref&&ref.refused),ref);
  ok('Wenna hands over the hatchet, tinderbox and net when spoken to',!!(tools&&tools.handed),tools);
  ok('the rope: taken from beside the shaft, tied (saved across a reload), climbed down',!!(rope&&rope.ok),rope);
  ok('every tutor was announced on the objective line first and spoken to (9 before departure, each chat registered)',met.length>=9&&met.every(t=>t.banner&&t.talked&&!t.error),met.map(t=>[t.id,t.banner,t.talked,t.pages]));
  // departure
  G.cur='complete';G.on=true;await L.walkTo(page,'haven','shore',true,[]);const tb=await P.talk(page,'tobin');await closeDialogue(page);await L.walkTo(page,'haven','boat',false,[]);await clickService(page,'Ferry','boat');G.on=false;
  const sailed=await waitFor(page,()=>typeof CRWorldMode!=='undefined'&&!/holm/.test(CRWorldMode.providerId||''),null,90000);await sleep(3000);
  const end=await page.evaluate(()=>({provider:CRWorldMode.providerId,complete:!!Tutorial.complete,pack:!!Tutorial.departurePackClaimed,coins:Player.count('coins'),bread:Player.count('bread')}));
  ok('departure: Ferryman Tobin spoken to, the skiff boarded, Hearthmere reached with the departure pack',tb.talked&&sailed&&end.provider==='veyhollow-commons-v2'&&end.complete&&end.pack&&end.coins>0,{tobin:tb.talked,sailed,end});
  await page.evaluate(()=>SaveGame.save(true));await page.reload({waitUntil:'load'});await enter(page);await sleep(4000);
  const back=await page.evaluate(()=>({provider:CRWorldMode.providerId,complete:!!Tutorial.complete}));ok('after the crossing a reload stays on the mainland, graduated',back.provider==='veyhollow-commons-v2'&&back.complete,back);
  await shot(page,'zz_mainland');
 }catch(e){ok('route completed without a driver error',false,String(e&&e.stack||e).slice(0,600));await shot(page,'zz_error')}
 // ---------- the guidance audit ----------
 const probes=G.list.filter(p=>!p.error);
 probes.forEach((p,i)=>{
  if(p.kind==='pack'){const prev=probes[i-1],next=probes[i+1];
   p.verdict=p.pulse===p.what?'pack':(prev&&prev.kind==='pack'&&prev.lesson===p.lesson&&prev.pulse===prev.what)?'use-on':(next&&next.kind!=='pack'&&next.lesson===p.lesson&&p.arrow&&next.arrow&&Math.hypot(p.arrow.x-next.arrow.x,p.arrow.z-next.arrow.z)<.1)?'use-item-on-arrow-target':'mismatch'}
  // a click the playthrough makes on purpose while a tutor is still due (the oak before Wenna: the talk-first refusal
  // test): the arrow must be on that tutor, not on what was clicked
  // the driver's last click of a lesson the game has already credited (the kill landed between the loop's check and the
  // click): not a guidance moment
  else if(p.driverLesson&&p.lesson!==p.driverLesson)p.verdict='lesson-already-done';
  else if(p.due&&p.kind!=='tutor'&&/^Talk to /.test(p.label))p.verdict=p.label.indexOf(p.due.charAt(0).toUpperCase()+p.due.slice(1))>=0?'tutor-first':'mismatch';
  else if(p.dist!==null&&p.dist<=.6)p.verdict='exact';
  else if(p.family)p.verdict='exact-family';
  else if(/^(Enter the|Open the door)/.test(p.label))p.verdict='door-first';
  else if(/drift ladder/i.test(p.label)&&/^b:cavern:/.test(p.surface||''))p.verdict='drift-ladder-first';
  else p.verdict=p.arrow?'mismatch':'no-arrow';
  p.clear=!!p.objective&&p.objective.length>12;
 });
 const bad=probes.filter(p=>p.verdict==='mismatch'||p.verdict==='no-arrow'),unclear=probes.filter(p=>!p.clear);
 ok('guidance: before every route action the arrow is on the exact object (or its door from outside / the pulsing pack slot): '+probes.length+' probes',probes.length>40&&bad.length===0,bad.map(p=>({lesson:p.lesson,what:p.what,label:p.label,arrow:p.arrow,target:p.target,dist:p.dist,shot:p.shot})));
 ok('guidance: an objective line is shown before every route action',unclear.length===0,unclear.map(p=>({lesson:p.lesson,what:p.what,shot:p.shot})));
 ok('zero page errors',pageErrors.length===0,pageErrors.slice(0,5));
 ok('zero failed asset loads',failed.length===0,failed.slice(0,5));
 const pass=checks.filter(c=>c.ok).length;
 fs.writeFileSync(path.join(OUT,'guide_probes.json'),JSON.stringify(probes,null,1));
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({at:new Date().toISOString(),base:BASE,profile:PROFILE,pass,total:checks.length,minutes:+((Date.now()-t0)/60000).toFixed(1),perLessonSeconds:per,reloads,
   verdicts:probes.reduce((a,p)=>(a[p.verdict]=(a[p.verdict]||0)+1,a),{}),consoleErrors:consoleErrors.slice(0,20),checks},null,1));
 console.log('[FULL ROUTE] '+pass+'/'+checks.length+' in '+((Date.now()-t0)/60000).toFixed(1)+' min; guide probes '+probes.length+' '+JSON.stringify(probes.reduce((a,p)=>(a[p.verdict]=(a[p.verdict]||0)+1,a),{}))+' -> '+OUT);
 await browser.close();process.exit(pass===checks.length?0:1);
})();
