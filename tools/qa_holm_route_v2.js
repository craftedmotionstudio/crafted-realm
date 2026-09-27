/* Holm v2 land route gate (phase 4, 2026-09-26): real pointer input on ?holmIsland=1, fresh isolated profile.
 *  1. the ore workings' east drift: at the exit ladder before the dagger is made the ladder refuses ("roped off"); with
 *     the dagger lesson done the guide arrow points at the drift ladder, the ladder climbs out through the trapdoor into
 *     the Warden's Keep hall, the trapdoor climbs back down, and from the hall the adventurer walks out to the court;
 *  2. the capstone drop: from Lastlight's storm door down the crown path, the Keeper's Stair (head landing, mid landing,
 *     the foot on the shingle) to the haven at Lanternfoot Cove, Ferryman Tobin (talk-first) and the skiff.
 * Every move is a real click on a pixel whose game pick() hits the target (tools/holm_island_driver_lib.js); qaGrant and
 * qaPlace only set up the state (lessons already learned, where the adventurer starts).
 * Run: SMOKE_BASE=http://127.0.0.1:8105 node tools/qa_holm_route_v2.js     -> scratchpad/holm_v2_land/qa_route/ */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const D=require('./holm_island_driver_lib');const {sleep,shot,enter,pos,settle,clickService,waitFor,talkTo,closeDialogue}=D;
const OUT=path.join(__dirname,'..','scratchpad','holm_v2_land','qa_route');D.setOut(OUT);
const PROFILE='route-'+Date.now().toString(36),BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8105')+'/?holmIsland=1&qaProfile='+PROFILE;
const results=[];let pass=0;
function ok(name,cond,info){results.push({name,pass:!!cond,info});if(cond)pass++;console.log((cond?'PASS ':'FAIL ')+name+(cond?'':' :: '+JSON.stringify(info).slice(0,600)))}
const LESSONS=['study_route','equip_hatchet','chop_logs','light_fire','catch_fish','cook_fish','bake_bread','learn_quests','descend_cavern','mine_copper','mine_tin','smelt_bronze'];
const surface=page=>page.evaluate(()=>{const r=HolmArrivalQA.saveRecord();return r?r.surface:''});
const chat=(page,n)=>page.evaluate(n=>Array.from(document.querySelectorAll('#chatbox > div')).slice(-(n||4)).map(d=>d.textContent.trim()),n);
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const pageErrors=[],consoleErrors=[];
 page.on('pageerror',e=>pageErrors.push(String(e).slice(0,300)));page.on('console',m=>{if(m.type()==='error'&&!/404|favicon|BUILD_INFO/.test(m.text()))consoleErrors.push(m.text().slice(0,300))});
 try{
  await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
  await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120)});
  // ---- what loaded: the hatch, the two ladder ends, the stair, the haven at the cove ----
  const boot=await page.evaluate(()=>{const svc={};scene.traverse(o=>{const s=o.userData&&o.userData.islandService;if(s&&o.isMesh&&!svc[s.label+'|'+s.target])svc[s.label+'|'+s.target]={node:s.node,climb:s.climb||null}});
   const at=n=>{const o=scene.getObjectByName(n);if(!o)return null;const p=o.getWorldPosition(new THREE.Vector3());return [+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)]};
   return {hatch:at('island-hatch-keep-undercroft'),stair:at('island-building-stair'),haven:at('island-building-haven'),exit:svc['Climb-up drift ladder|exit']||null,trap:svc['Climb-down trapdoor|undercroft']||null,boat:svc['Ferry|boat']||null}});
  ok('route pieces load: the keep trapdoor (route prop), the drift ladder and trapdoor services joined, the Keeper\'s Stair, the haven at Lanternfoot Cove',
   boot.hatch&&boot.stair&&boot.haven&&boot.exit&&boot.trap&&boot.exit.climb===boot.trap.node&&boot.trap.climb===boot.exit.node&&boot.haven[0]===101&&boot.haven[2]===14,boot);
  // ---- 1. the east drift ----
  await page.evaluate(ids=>{HolmIslandCurriculum.qaGrant(ids);Player.inv=Player.inv.map(()=>null);['pickaxe','hammer','bronze_bar'].forEach(i=>{try{Player.addItem(i,1)}catch(e){}});UI.refreshInv()},LESSONS);
  await page.evaluate(n=>HolmArrivalQA.qaPlace(n),boot.exit.node);await sleep(2500);
  await clickService(page,'Climb-up drift ladder','exit');await sleep(1200);
  const refuse=await chat(page,3),s0=await surface(page);
  ok('before the dagger the drift ladder refuses (roped off) and the adventurer stays below',refuse.some(t=>/drift ladder is roped off/.test(t))&&s0.indexOf('b:cavern:')===0,{refuse,s0});
  await shot(page,'01_drift_exit_chamber');
  await page.evaluate(()=>HolmIslandCurriculum.qaGrant(['forge_dagger']));await sleep(1500);
  const arrow=await page.evaluate(()=>GuideArrow._label);
  ok('with the dagger made, down in the workings the guide arrow points at the drift ladder',/drift ladder/i.test(arrow),{arrow});
  await clickService(page,'Climb-up drift ladder','exit');await sleep(1500);
  const p1=await pos(page),s1=await surface(page);await shot(page,'02_keep_hall_trapdoor');
  await page.evaluate(()=>{camCtl.yaw=Math.PI/2;camCtl.pitch=.95;camCtl.dist=8});await sleep(1500);await shot(page,'02b_trapdoor_view');
  ok('the drift ladder climbs out through the trapdoor into the Warden\'s Keep hall',s1.indexOf('b:keep:')===0&&Math.hypot(p1[0]-78.5,p1[2]-35.5)<1.2&&Math.abs(p1[1]-11)<.6,{p1,s1});
  await clickService(page,'Climb-down trapdoor','undercroft');await sleep(1500);
  const p2=await pos(page),s2=await surface(page);
  ok('the trapdoor climbs back down to the exit chamber',s2.indexOf('b:cavern:')===0&&p2[1]<-25,{p2,s2});
  await clickService(page,'Climb-up drift ladder','exit');await sleep(1500);
  const tr=[];const w=await D.walkTo(page,'keep','court',false,tr);const p3=await pos(page),s3=await surface(page);await shot(page,'03_keep_court');
  ok('from the hall the adventurer walks out to the keep court (Warden Corrick\'s trials)',!w.error&&s3.indexOf('b:keep:')===0&&tr.length>5,{w,p3,s3});
  // ---- 2. Lastlight -> the Keeper's Stair -> Lanternfoot Cove ----
  await page.evaluate(()=>HolmIslandCurriculum.qaGrant(['melee_trial','ranged_trial','open_bank','magic_trial','relight_lastlight']));
  const door=await page.evaluate(()=>{const s=HolmArrivalQA.qaStance('lastlight','door');return s});
  const doorNode=door&&door.id;
  if(doorNode)await page.evaluate(n=>HolmArrivalQA.qaPlace(n),doorNode);await sleep(2500);
  const start=await pos(page);
  const legs=[['stair','head','04_stair_head'],['stair','mid','05_stair_mid'],['stair','foot','06_stair_foot'],['haven','notice','07_cove_haven']];const legRes=[];
  for(const [b,t,name] of legs){const tr2=[];const r=await D.walkTo(page,b,t,false,tr2);const p=await pos(page);legRes.push({b,t,error:r.error||null,at:p,steps:tr2.length});await shot(page,name)}
  ok('Lastlight -> Keeper\'s Stair head -> mid landing -> foot on the shingle -> the haven, all on foot by real clicks',!!doorNode&&legRes.every(l=>!l.error)&&legRes[2].at[1]<1.6&&legRes[3].at[2]<18,{start,door,doorNode,legRes});
  const tb=await talkTo(page,'tobin');
  ok('Ferryman Tobin at the cove speaks of Hearthmere and the beacon over the water',tb.ok&&tb.pages.some(p=>/Hearthmere/.test(p||'')),tb);
  await closeDialogue(page);
  await clickService(page,'Ferry','boat');await sleep(2500);const said=await chat(page,5);await shot(page,'08_board');
  ok('boarding the skiff at the end of the pier sails for the mainland',said.some(t=>/pushes off from the pier/.test(t)),{said});
 }catch(e){ok('driver ran without throwing',false,String(e&&e.stack||e).slice(0,800))}
 ok('no page errors',pageErrors.length===0,pageErrors.slice(0,5));
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({pass,total:results.length,results,consoleErrors:consoleErrors.slice(0,20)},null,1));
 console.log('[QA ROUTE V2] '+pass+'/'+results.length+' -> '+OUT);
 await browser.close();process.exit(pass===results.length?0:1);
})();
