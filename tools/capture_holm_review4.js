/* Owner review 4 (2026-09-27) captures: one frame per item of the owner's Tutor's Holm list, at the game camera, so each
 * fix has a before and an after. A fresh adventurer on the island (qaProfile; production by default, HOLM_MODE=draft for
 * ?holmIsland=1); the adventurer is stood on graph nodes with the QA-only HolmArrivalQA.qaPlace (read-only placement,
 * no lesson credit) so the cutaways and storeys behave as they do for a player standing there.
 * Run: SMOKE_BASE=http://127.0.0.1:8109 TAG=before node tools/capture_holm_review4.js [view ...]
 * Output: scratchpad/holm_review4/<TAG>_<view>.jpg + <TAG>_capture.json */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const TAG=process.env.TAG||'before';
const OUT=path.join(__dirname,'..','scratchpad','holm_review4');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+'review4-'+TAG+'-'+Date.now().toString(36);
// stand on the walkable node nearest (x,z) whose surface matches re (and y band), then frame the camera
async function stand(page,x,z,re,cam,y){return page.evaluate((x,z,re,cam,y)=>{const rx=new RegExp(re);let best=null,d=Infinity;
  HolmArrivalQA.graphNodes().forEach(n=>{if(!rx.test(n.surface))return;if(Number.isFinite(y)&&Math.abs(n.y-y)>1.2)return;const k=Math.hypot(n.x-x,n.z-z);if(k<d){d=k;best=n}});
  if(!best)return {error:'no node '+re};HolmArrivalQA.qaPlace(best.id);if(cam){camCtl.yaw=cam[0];camCtl.pitch=cam[1];camCtl.dist=cam[2]}return {id:best.id,x:best.x,y:best.y,z:best.z,surface:best.surface}},x,z,re,cam||null,Number.isFinite(y)?y:null)}
async function look(page,x,z,cam,y){return page.evaluate((x,z,cam,y)=>{HolmArrivalQA.qaView(x,z,y);camCtl.yaw=cam[0];camCtl.pitch=cam[1];camCtl.dist=cam[2];return true},x,z,cam,Number.isFinite(y)?y:undefined)}
async function clear(page){await page.evaluate(()=>{HolmArrivalQA.qaViewClear();UI.closeDialogue&&UI.closeDialogue()}).catch(()=>{})}
async function snap(page,name){await sleep(2200);const f=path.join(OUT,TAG+'_'+name+'.jpg');await page.screenshot({path:f,type:'jpeg',quality:82}).catch(()=>{});return path.basename(f)}
const VIEWS={
 // 1: a fresh adventurer's pack after Bram and the chart (the hatchet should NOT be there yet)
 async flow(page,rec){rec.pack=await page.evaluate(()=>Player.inv.filter(Boolean).map(s=>s.id));rec.lesson=await page.evaluate(()=>Tutorial.steps[Tutorial.step].id);
  await page.evaluate(()=>HolmIslandCurriculum.qaSetLedger(['study_route']));await sleep(1500);
  rec.afterChart={pack:await page.evaluate(()=>Player.inv.filter(Boolean).map(s=>s.id)),banner:await page.evaluate(()=>document.getElementById('obj-text').textContent),arrow:await page.evaluate(()=>GuideArrow._label)};
  await page.evaluate(()=>document.querySelector('.tab-btn[data-tab="inv"]')&&document.querySelector('.tab-btn[data-tab="inv"]').click());
  rec.at=await stand(page,66,100,'^ground$',[0,1.05,10]);return snap(page,'1_after_chart_pack')},
 // 1-3 by real input: the door, Bram, the chart; the MOVING ON box and an empty pack; Wenna hands over the tools; the
 // hatchet wielded, an oak chopped and a fire lit right where the adventurer stands
 async realflow(page,rec){
  const chat=()=>page.evaluate(()=>Array.from(document.querySelectorAll('#chatbox > div')).slice(-4).map(d=>d.textContent.trim()));
  const clickKind=async(kind,extra)=>{const name=await page.evaluate((kind,extra)=>{let o=null;scene.traverse(m=>{if(!o&&m.isMesh&&m.userData&&m.userData.kind===kind&&(!extra||m.userData[extra[0]]===extra[1]))o=m});if(!o)return null;if(!o.name)o.name='rv-'+kind;return o.name},kind,extra||null);return name?L.clickNamed(page,name):{error:'no '+kind}};
  rec.runStartsOff=await page.evaluate(()=>Player.runOn===false);
  await clickKind('arrival_door',['arrivalDoor','arrival']);await waitFor(page,()=>{const r=HolmArrivalQA.saveRecord();return r&&r.doors&&r.doors.arrival},null,40000);
  rec.enter=await L.enterGuideHouse(page);const b=await L.talkTo(page,'bram');rec.bram=b.pages;
  await clickKind('arrival_chart');await waitFor(page,()=>Tutorial.steps[Tutorial.step].id!=='study_route',null,60000);await sleep(1500);await L.closeDialogue(page);
  await page.evaluate(()=>document.querySelector('.tab-btn[data-tab="inv"]')&&document.querySelector('.tab-btn[data-tab="inv"]').click());
  rec.afterChart={pack:await page.evaluate(()=>Player.inv.filter(Boolean).map(s=>s.id)),box:await page.evaluate(()=>document.querySelector('#objective .obj-label').textContent+' | '+document.getElementById('obj-text').textContent),chat:await chat()};
  await page.evaluate(()=>{camCtl.pitch=1.0;camCtl.dist=11});await snap(page,'1_3_after_chart_moving_on');
  await L.walkTo(page,'survival','trail',true,[]);const w=await L.talkTo(page,'wenna');rec.wenna=w.pages;await waitFor(page,()=>Player.count('hatchet')>0,null,20000);
  rec.afterWenna={pack:await page.evaluate(()=>Player.inv.filter(Boolean).map(s=>s.id)),chat:await chat()};await snap(page,'1_wenna_hands_tools');
  await L.clickInventory(page,'hatchet');await L.clickNamed(page,'island-lesson-survival-oak-1');await waitFor(page,()=>Player.count('logs')>0,null,120000);
  const p0=await page.evaluate(()=>[player.position.x,player.position.z]);await L.clickInventory(page,'tinderbox');await L.clickInventory(page,'logs');
  await waitFor(page,()=>!!scene.getObjectByName('island-campfire'),null,20000);await sleep(1500);
  rec.fire={stood:p0.map(v=>+v.toFixed(1)),fire:await page.evaluate(()=>{const f=scene.getObjectByName('island-campfire');return f?[+f.position.x.toFixed(1),+f.position.z.toFixed(1)]:null}),chat:await chat()};
  await page.evaluate(()=>{camCtl.yaw=0.6;camCtl.pitch=1.0;camCtl.dist=10});return snap(page,'2_fire_where_you_stand')},
 // 9: the run orb on a new adventurer
 async run(page,rec){rec.runOn=await page.evaluate(()=>Player.runOn);rec.at=await stand(page,63,112,'exterior|land',[0.6,1.1,14]);return snap(page,'9_run_orb')},
 // 8: the statue and the tree beside it, seen at the spawn
 async statue(page,rec){rec.at=await stand(page,62.3,111.5,'exterior|land',[Math.PI,1.05,12]);return snap(page,'8_statue_tree')},
 async statue2(page,rec){rec.at=await stand(page,64,110,'exterior|land',[-2.2,0.95,10]);return snap(page,'8_statue_tree_b')},
 // 4: the Guide House hatch and the cellar below it
 async hatch(page,rec){rec.at=await stand(page,64,100,'^ground$',[0.3,1.15,9]);return snap(page,'4_hatch')},
 async cellar(page,rec){rec.at=await stand(page,63.5,99.5,'guide-cellar',[0.5,1.0,8]);rec.player=await page.evaluate(()=>[player.position.x,player.position.y,player.position.z].map(v=>+v.toFixed(2)));
  rec.floorTop=await page.evaluate(()=>{const f=scene.getObjectByName('CellarFloor');if(!f)return null;return +new THREE.Box3().setFromObject(f).max.y.toFixed(2)});return snap(page,'4_cellar')},
 // 7 + 5: the Guide House main room (windows, the table ware, the beams and pictures above the cut)
 async guide1(page,rec){rec.at=await stand(page,66,101,'^ground$',[0.0,1.0,8]);return snap(page,'7_guide_room_south')},
 async guide2(page,rec){rec.at=await stand(page,66,99,'^ground$',[Math.PI*.75,0.95,8]);return snap(page,'7_guide_room_ne')},
 async guide3(page,rec){rec.at=await stand(page,66,99,'^ground$',[-Math.PI*.6,0.95,8]);return snap(page,'7_guide_room_w')},
 async guidetable(page,rec){rec.at=await stand(page,66,98.5,'^ground$',[0.4,0.75,4.5]);return snap(page,'7_guide_table_close')},
 async guidewin(page,rec){rec.at=await stand(page,63,110,'exterior|land',[Math.PI*.9,0.55,9]);await look(page,66,104.6,[Math.PI*.95,0.5,7]);return snap(page,'7_guide_windows_out')},
 // 5 + 6: the Quest Lodge: entrance doors, inside (upper storey, the board)
 async lodgedoor(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('lodge','entrance'));rec.stance=s;if(!s)return null;rec.at=await stand(page,s.x,s.z,'.',[0,1.0,10],s.y);return snap(page,'5_lodge_entrance')},
 async lodgein(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('lodge','map'));rec.stance=s;if(!s)return null;rec.at=await stand(page,s.x,s.z,'^b:lodge:',[0.5,1.0,11],s.y);return snap(page,'5_lodge_inside')},
 async lodgein2(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('lodge','map'));if(!s)return null;rec.at=await stand(page,s.x,s.z,'^b:lodge:',[Math.PI*.8,1.0,11],s.y);return snap(page,'5_lodge_inside_b')},
 async lodgeboard(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('lodge','board'));rec.stance=s;if(!s)return null;rec.at=await stand(page,s.x,s.z,'^b:lodge:',[Math.PI,1.05,11],s.y);
  rec.route=await page.evaluate(()=>{const e=HolmArrivalQA.qaStance('lodge','entrance'),b=HolmArrivalQA.qaStance('lodge','board');return e&&b?Math.round(Math.hypot(e.x-b.x,e.z-b.z)*10)/10:null});return snap(page,'6_lodge_board')},
 // 5: the bakehouse from inside (thin walls, the brick base)
 async bakein(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('bakehouse','prep'));rec.stance=s;if(!s)return null;rec.at=await stand(page,s.x,s.z,'^b:bakehouse:',[0.8,0.9,9],s.y);return snap(page,'5_bakehouse_inside')},
 async bakein2(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('bakehouse','prep'));if(!s)return null;rec.at=await stand(page,s.x,s.z,'^b:bakehouse:',[-2.2,0.8,9],s.y);return snap(page,'5_bakehouse_inside_b')},
 async bakeout(page,rec){const s=await page.evaluate(()=>HolmArrivalQA.qaStance('bakehouse','entrance'));if(!s)return null;rec.at=await stand(page,s.x,s.z,'.',[0.3,0.55,6],s.y);return snap(page,'5_bakehouse_base')},
 // 8: the cart wheels and the Guide House back path
 async wheel(page,rec){rec.at=await stand(page,36.5,61,'land|b:lodge:.*Terrain',[Math.PI*1.1,0.95,8]);await look(page,35.62,59.5,[Math.PI*1.1,0.9,7]);return snap(page,'8_cart_wheel_lodge')},
 async wheel2(page,rec){rec.at=await stand(page,40.5,41.5,'land|Terrain',[0,0.95,8]);await look(page,40.38,39.5,[0.2,0.9,7]);return snap(page,'8_cart_wheel_quarry')},
 async backpath(page,rec){rec.at=await stand(page,66,92,'exterior|land',[Math.PI,1.3,34]);await look(page,56,90,[Math.PI*.8,1.35,40]);return snap(page,'8_back_path')},
};
(async()=>{
  const want=process.argv.slice(2),names=want.length?want:Object.keys(VIEWS);
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const out={base:BASE,tag:TAG,views:{},errors};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,120000);await sleep(2500);
    for(const n of names){const rec={};try{rec.file=await VIEWS[n](page,rec)}catch(e){rec.error=String(e).slice(0,200)}await clear(page);out.views[n]=rec;console.log(n+' '+JSON.stringify(rec))}
  }catch(e){out.error=String(e).slice(0,300);console.log('driver error '+out.error)}
  finally{fs.writeFileSync(path.join(OUT,TAG+'_capture.json'),JSON.stringify(out,null,2));console.log('[REVIEW4_CAPTURE] page errors '+errors.length);await browser.close()}
})();
