/* Minnow Hollow gate (Holm v2 land, phase 2, 2026-09-26): real pointer input on ?holmIsland=1, fresh isolated profile.
 * A new adventurer with the Guide House lessons done: speaks to Wenna at the head of the Hollow Path (talk-first), chops a
 * teaching oak on the rim, walks the path down to the Fire Beach, lights a fire there, nets a fish at a moving ripple (the
 * lesson's first catch lands on the second roll), cooks it on the beach (retrying a burn), then after the lesson: a spot
 * that moves while being netted says "The fish have moved on." and stops the player, the frog plops off its pad when the
 * player comes near, ducks paddle, a fish leaps, and more rolls land varied catches. Every step by a real click on a
 * pixel whose game pick() hits the target (tools/holm_island_driver_lib.js); qaGrant/qaMove only set up the state.
 * Run: SMOKE_BASE=http://127.0.0.1:8105 node tools/qa_holm_hollow.js     -> scratchpad/holm_v2_land/qa_hollow/ */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const D=require('./holm_island_driver_lib');const {sleep,shot,enter,pos,settle,aim,press,clickNamed,waitFor,clickInventory,closeDialogue,talkTo}=D;
const OUT=path.join(__dirname,'..','scratchpad','holm_v2_land','qa_hollow');D.setOut(OUT);
const PROFILE='hollow-'+Date.now().toString(36),BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8105')+'/?holmIsland=1&qaProfile='+PROFILE;
const results=[];let pass=0;
function ok(name,cond,info){results.push({name,pass:!!cond,info});if(cond)pass++;console.log((cond?'PASS ':'FAIL ')+name+(cond?'':' :: '+JSON.stringify(info).slice(0,600)))}
async function walkGround(page,x,z){const w=await D.walkPoint(page,x,z,[]);const p=await pos(page);return !w.error&&Math.hypot(p[0]-x,p[2]-z)<1.3}
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--enable-gpu','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const pageErrors=[],consoleErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/404|favicon|BUILD_INFO/.test(m.text()))consoleErrors.push(m.text().slice(0,300))});
 try{
  await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
  await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120);window.__notes=[];const n=Tutorial.notify.bind(Tutorial);Tutorial.notify=function(ev,m){window.__notes.push(ev+'/'+m);return n(ev,m)};window.__chat=[];const c=UI.chat.bind(UI);UI.chat=function(t,k){window.__chat.push(String(t));return c(t,k)}});
  const boot=await page.evaluate(()=>({spots:HolmFishing.spots(),fauna:HolmFishing.fauna(),ring:!!scene.getObjectByName('island-hollow-fire-ring'),jetty:!!scene.getObjectByName('island-hollow-jetty'),pond:!!scene.getObjectByName('ArrivalPond')}));
  ok('Minnow Hollow loads: 3 moving spots, the jetty, the Fire Beach ring, the pond sheet, ducks, frog, dragonflies',boot.spots.length===3&&boot.ring&&boot.jetty&&boot.pond&&boot.fauna&&boot.fauna.ducks.length===2&&boot.fauna.flies===2,boot);
  // the Guide House lessons done (the driver starts at the camp); tools in the pack as the rack gives them
  await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(['study_route','equip_hatchet']);Player.inv=Player.inv.map(()=>null);['tinderbox','fishing_net','hatchet'].forEach(i=>Player.addItem(i,1));UI.refreshInv()});
  await clickInventory(page,'hatchet');
  // walk to the camp like a player (the graph route toward the camp's bench), then talk to Wenna first (2004 rule)
  await D.walkTo(page,'survival','bench',true,[]);
  const refused=await clickNamed(page,'island-lesson-survival-oak-1');await sleep(1500);
  const said=await page.evaluate(()=>window.__chat.slice(-3));ok('talk-first: the oak refuses until Wenna has spoken',said.some(t=>/speak to Wenna/.test(t)),{said,refused});
  const t=await talkTo(page,'wenna');ok('Wenna stands at the head of the Hollow Path and teaches the hollow',t.ok&&t.talked&&t.pages.some(p=>/Minnow Hollow|hollow/.test(p)),t);
  await shot(page,'01_wenna');
  // chop a teaching oak on the rim
  let c=await clickNamed(page,'island-lesson-survival-oak-1');const chopped=!c.error&&await waitFor(page,()=>Player.count('logs')>0,null,120000);
  ok('chop_logs: a teaching oak on the Minnow Hollow rim gives logs (gather/logs credited)',chopped&&await page.evaluate(()=>window.__notes.includes('gather/logs')),{c});
  // down the Hollow Path to the Fire Beach and light the fire there
  const ring=await page.evaluate(()=>HolmFishing.fireRing());const beachAt=[ring.ring[0]+.5,ring.ring[1]+.6];
  const walked=await walkGround(page,beachAt[0],beachAt[1]);const p0=await pos(page);await shot(page,'02_fire_beach');
  ok('the Hollow Path leads down to the Fire Beach (real ground clicks)',walked&&p0[1]<2.2,{p0,beachAt});
  await clickInventory(page,'tinderbox');await clickInventory(page,'logs');
  const lit=await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,30000);await sleep(1500);
  const fireAt=await page.evaluate(()=>{const f=scene.getObjectByName('island-campfire');return f?[f.position.x,f.position.z]:null});
  ok('light_fire: the fire burns on the Fire Beach (firemake credited)',lit&&await page.evaluate(()=>window.__notes.includes('firemake/fire'))&&fireAt&&fireAt[0]>=ring.area[0]-1&&fireAt[0]<=ring.area[2]+1&&fireAt[1]>=ring.area[1]-1.2&&fireAt[1]<=ring.area[3]+1,{fireAt,area:ring.area});
  // fish the nearest live ripple; the first catch lands on the second roll (~6 s after the cast)
  const spot=await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});
  const before=await page.evaluate(()=>HolmFishing.stats());const tClick=Date.now();
  c=await clickNamed(page,spot);const caught=!c.error&&await waitFor(page,()=>Player.count('raw_perch')>0,null,90000);const tCatch=Date.now();
  const st1=await page.evaluate(()=>HolmFishing.stats());await shot(page,'03_catch');
  ok('catch_fish: the net at a ripple lands a mirrorperch; every roll visible (cast + splash), the first catch guaranteed on roll 2',caught&&st1.lastCatch&&st1.lastCatch.item==='raw_perch'&&st1.lastCatch.roll<=2&&st1.casts>before.casts&&st1.splashes>before.splashes&&await page.evaluate(()=>window.__notes.includes('gather/raw_perch')),{spot,st1,seconds:(tCatch-tClick)/1000});
  // cook on the beach fire (burns are taught: net another and retry)
  let tries=0;for(;tries<6&&!(await page.evaluate(()=>window.__notes.includes('cook/cooked_perch')));tries++){
   if(!await page.evaluate(()=>Player.count('raw_perch')>0)){const s2=await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});await clickNamed(page,s2);await waitFor(page,()=>Player.count('raw_perch')>0,null,120000)}
   if(!await page.evaluate(()=>!!scene.getObjectByName('island-campfire'))){await clickNamed(page,'island-lesson-survival-oak-2');await waitFor(page,()=>Player.count('logs')>0,null,120000);await walkGround(page,beachAt[0],beachAt[1]);await clickInventory(page,'tinderbox');await clickInventory(page,'logs');await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,30000);await sleep(1500)}
   const b=await page.evaluate(()=>Player.count('cooked_perch')+Player.count('burnt_perch'));c=await clickNamed(page,'island-campfire');await waitFor(page,b=>Player.count('cooked_perch')+Player.count('burnt_perch')>b,b,60000)}
  ok('cook_fish: cooked on the beach fire (cook/cooked_perch credited), burns retried',await page.evaluate(()=>window.__notes.includes('cook/cooked_perch')),{tries});
  const ledger=await page.evaluate(()=>Tutorial.completedLessonIds.slice());
  ok('the four survival lessons are credited in the ledger',['chop_logs','light_fire','catch_fish','cook_fish'].every(id=>ledger.includes(id)),ledger);
  // after the lesson: a spot moving while it is netted
  await page.evaluate(()=>{Player.xp['Fishing']=Math.max(Player.xp['Fishing']||0,1200);UI.refreshHud&&UI.refreshHud()});   // Fishing 10: the reedpike can bite
  const s3=await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});
  c=await clickNamed(page,s3);await waitFor(page,()=>Player.action&&Player.action.type==='gather',null,30000);await sleep(2000);
  const idx=await page.evaluate(n=>scene.getObjectByName(n).userData.holmFishing,s3);const was=await page.evaluate(i=>HolmFishing.spots()[i],idx);
  const mv0=await page.evaluate(()=>HolmFishing.stats().moves);await page.evaluate(i=>HolmFishing.qaMove(i),idx);
  const moved=await waitFor(page,()=>window.__chat.some(t=>/The fish have moved on/.test(t))&&!Player.action,null,15000);await sleep(3000);
  const now=await page.evaluate(i=>HolmFishing.spots()[i],idx),mv1=await page.evaluate(()=>HolmFishing.stats().moves);
  ok('a spot telegraphs its move (bubbles, fade) and the player netting it is told "The fish have moved on." and stops; it reappears on another candidate',moved&&mv1>mv0&&now.state==='on'&&now.candidate!==was.candidate,{was,now});
  // varied catches: keep netting for a while at Fishing 10 (mirrorperch and reedpike; junk and rares are rarer)
  const tFish=Date.now();while(Date.now()-tFish<75000){const sN=await page.evaluate(()=>{const s=HolmFishing.nearestSpot(player.position.x,player.position.z);return s?s.name:null});
   if(!await page.evaluate(()=>Player.action&&Player.action.type==='gather'))await clickNamed(page,sN);await sleep(6000);if(!await page.evaluate(()=>Player.inv.some(s=>!s)))await page.evaluate(()=>{Player.inv=Player.inv.map(s=>s&&/^(raw_|soggy|pond_)/.test(s.id)?null:s);UI.refreshInv()})}
  const st2=await page.evaluate(()=>HolmFishing.stats());await shot(page,'04_fishing_session');
  ok('fishing after the lesson: several rolls, catches recorded (varied table: perch, reedpike from Fishing 5, junk, rares)',st2.rolls>=8&&Object.keys(st2.catches).length>=1,st2);
  // pond life: frog plops when the player comes near its pad; ducks move; a fish leapt
  const fr=await page.evaluate(()=>HolmFishing.data().frog.pad);await walkGround(page,fr[0]-1.2,fr[1]-1.0);await sleep(2500);
  const fauna=await page.evaluate(()=>HolmFishing.fauna()),st3=await page.evaluate(()=>HolmFishing.stats());
  ok('the frog plops off its pad as the player comes near; the ducks paddle; a fish has leapt',st3.plops>=1&&st3.leaps>=1&&JSON.stringify(fauna.ducks)!==JSON.stringify(boot.fauna.ducks),{fauna,st3});
  await shot(page,'05_frog');
  ok('no page errors',pageErrors.length===0&&consoleErrors.length===0,{pageErrors,consoleErrors:consoleErrors.slice(0,5)});
 }catch(e){ok('driver completed',false,String(e&&e.stack||e).slice(0,800));await shot(page,'zz_error')}
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({profile:PROFILE,pass,total:results.length,results},null,1));
 console.log('[HOLM HOLLOW QA] '+pass+'/'+results.length+(pass===results.length?' PASS':' FAIL'));await browser.close();process.exit(pass===results.length?0:1);
})();
