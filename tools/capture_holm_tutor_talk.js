/* Screenshots of the 2004 "speak to the tutor first" flow on Tutor's Holm (owner play-test 2026-09-25): a fresh
 * adventurer on the live island (qaProfile, production provider) meets Guide Bram, Wenna and Cook Hettie with real
 * clicks, the way a player would. For each: the banner and arrow saying "Talk to <tutor>", a station refusing before the
 * talk, then every page of the tutor's chat box. Wenna is asked again during light_fire (the tinderbox page). Later
 * lessons are granted with the QA-only ledger (HolmIslandCurriculum.qaGrant) so the run goes straight to each tutor.
 * Output: scratchpad/holm_tutors_talk_v1/ (full frames + a crop of each chat box). Also prints what each tutor said.
 * Run: SMOKE_BASE=http://localhost:8093 node tools/capture_holm_tutor_talk.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,shot,enter,walkTo,clickService,clickNamed,waitFor,objective,lastChat,talkTo}=L;
const OUT=path.join(__dirname,'..','scratchpad','holm_tutors_talk_v1');L.setOut(OUT);
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+'tutor-talk-'+Date.now().toString(36);
async function clickKind(page,kind,extra){const name=await page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;if(!o.name)o.name='pt-'+kind;return o.name},kind,extra||null);return name?clickNamed(page,name):{error:'no '+kind}}
// the chat box and the objective banner, cropped from the frame
async function crop(page,name){const r=await page.evaluate(()=>{const d=document.getElementById('dialogue-modal');if(!d||getComputedStyle(d).display==='none')return null;const b=d.getBoundingClientRect();return {x:Math.max(0,b.x-12),y:Math.max(0,b.y-12),width:b.width+24,height:b.height+24}});
  if(r)await page.screenshot({path:path.join(OUT,name+'.png'),clip:r}).catch(()=>{})}
async function state(page){return page.evaluate(()=>({banner:document.getElementById('obj-text').textContent,arrow:GuideArrow._label,due:HolmIslandTalk.pending()&&HolmIslandTalk.pending().id,lesson:Tutorial.complete?'complete':Tutorial.steps[Tutorial.step].id}))}
const said={};
async function meet(page,id,tag){const r=await talkTo(page,id,{onPage:async(i,t)=>{await sleep(250);await shot(page,tag+'_p'+(i+1));await crop(page,tag+'_p'+(i+1)+'_box')}});
  said[tag]=r.pages||r.error;console.log('  '+tag+' talked='+r.talked+' pages='+(r.pages?r.pages.length:0)+(r.error?' error '+r.error:''));(r.pages||[]).forEach((p,i)=>console.log('    '+(i+1)+'. '+p));return r}
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const log=[];const note=(k,v)=>{log.push({k,v});console.log(k+' '+JSON.stringify(v))};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:120000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,60000);
    await page.evaluate(()=>{window.__qaTrace=[];setInterval(()=>window.__qaTrace.push([player.position.x,player.position.y,player.position.z]),120)});await sleep(1500);
    // --- Guide Bram: the first objective, the door first, the chart refuses, then his chat
    note('start',await state(page));await shot(page,'bram_01_start_banner');
    await clickKind(page,'arrival_door',['arrivalDoor','arrival']);await waitFor(page,()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},null,40000);await sleep(1200);
    note('enter',await L.enterGuideHouse(page));await sleep(1200);note('inside',await state(page));await shot(page,'bram_01b_inside_arrow');
    await clickKind(page,'arrival_chart');await sleep(2500);note('bram chart before talk',{chat:await lastChat(page,3),state:await state(page)});await shot(page,'bram_02_chart_refused');
    await meet(page,'bram','bram_03_talk');note('bram after',await state(page));await shot(page,'bram_04_after_banner');
    // --- Wenna: banner and arrow at the camp, an oak refuses, then her chat; asked again with logs (tinderbox)
    await page.evaluate(()=>HolmIslandCurriculum.qaGrant(['study_route','equip_hatchet']));await sleep(800);
    await walkTo(page,'survival','trail',true,[]);await sleep(1500);note('wenna before',await state(page));await shot(page,'wenna_01_banner_arrow');
    await clickNamed(page,'island-lesson-survival-oak-1');await sleep(1500);note('wenna oak before talk',{chat:await lastChat(page,3),logs:await L.count(page,'logs')});await shot(page,'wenna_02_oak_refused');
    await meet(page,'wenna','wenna_03_talk');note('wenna after',await state(page));
    await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(['chop_logs']);Player.addItem('logs',1);UI.refreshInv()});await sleep(800);
    await meet(page,'wenna','wenna_04_again_light_fire');
    // --- Cook Hettie: survival lessons granted, at the bakehouse the bucket rack refuses, then her chat
    await page.evaluate(()=>{HolmIslandCurriculum.qaGrant(['light_fire','catch_fish','cook_fish']);Player.inv=Player.inv.map(s=>s&&s.id==='logs'?null:s);UI.refreshInv()});await sleep(2500);
    await walkTo(page,'bakehouse','entrance',true,[]);await sleep(1500);note('hettie before',await state(page));await shot(page,'hettie_01_banner_arrow');
    await clickService(page,'Take bucket');note('hettie bucket before talk',{chat:await lastChat(page,3),buckets:await L.count(page,'bucket')});await shot(page,'hettie_02_bucket_refused');
    await meet(page,'hettie','hettie_03_talk');note('hettie after',await state(page));await shot(page,'hettie_04_after_banner');
  }catch(e){note('driver error',String(e).slice(0,300));await shot(page,'zz_error')}
  finally{fs.writeFileSync(path.join(OUT,'capture.json'),JSON.stringify({base:BASE,log,said,errors},null,2));console.log('[TUTOR_TALK_CAPTURE] page errors '+errors.length+(errors.length?' '+JSON.stringify(errors):''));await browser.close()}
})();
