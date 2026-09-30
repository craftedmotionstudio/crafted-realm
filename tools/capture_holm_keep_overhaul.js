/* Warden's Keep overhaul captures (owner review 2026-09-29): the same game-camera frames of the keep before and after the
 * overhaul, outside (the gate front and the four corners) and inside on both floors (the hall, the barracks, the gatehouse,
 * the upper ring and the tower rooms). A fresh adventurer on the island (qaProfile; ?holmIsland=1 draft by default, the
 * production bundle with HOLM_MODE=prod) with every lesson but the last granted is stood on the keep graph node nearest a
 * local spot with the QA-only HolmArrivalQA.qaPlace (read-only, no lesson credit), so the cutaway and the storey behave as
 * for a player standing there; the camera is framed with HolmArrivalQA.qaView. Views are keep-local (x east, y up, z south).
 * Run: SMOKE_BASE=http://127.0.0.1:8271 TAG=before node tools/capture_holm_keep_overhaul.js [view ...]
 * Output: scratchpad/keep_overhaul/ingame/<TAG>_<view>.jpg + <TAG>_capture.json */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const TAG=process.env.TAG||'before';
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'scratchpad','keep_overhaul','ingame');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8271')+(process.env.HOLM_MODE==='prod'?'/?qaProfile=':'/?holmIsland=1&qaProfile=')+'keep-'+TAG+'-'+Date.now().toString(36);
const P=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/rebuild/holm-overhaul/v2land.json'),'utf8')).buildings.keep.placement;
// [view, stand at (local x,y,z), look at (local x,y,z), camera [yaw (0 = from the south, +pi/2 = from the east), pitch, distance]]
const VIEWS=[
 ['out_front',[2.5,0,11.5],[2,3,5],[0,.42,30]],
 ['out_se',[2.5,0,11.5],[1,3,-2],[.75,.5,36]],
 ['out_sw',[2.5,0,11.5],[1,3,-2],[-.75,.5,36]],
 ['out_ne',[2.5,0,11.5],[1,3,-2],[2.4,.5,36]],
 ['out_nw',[2.5,0,11.5],[1,3,-2],[-2.4,.5,36]],
 ['out_gate',[2.5,0,11.5],[2,1.8,9],[.15,.28,11]],
 ['court',[1.5,0,1.5],[0,1.5,-1],[.5,.75,16]],
 ['gate_passage',[2.5,0,7.5],[2,1,8],[2.8,.8,9]],
 ['hall_south',[-5.5,0,.5],[-6,.6,3],[2.9,.85,9]],
 ['hall_north',[-5.5,0,-3.5],[-6.5,.6,-7],[.2,.85,9]],
 ['hall_stair',[-6.5,0,2.5],[-8.6,1.2,1.5],[1.2,.8,9]],
 ['barracks',[1.5,0,-6.5],[2,.5,-7.5],[.2,.9,9]],
 ['upper_chamber',[-5.5,3.2,-4.5],[-6,3.6,-6],[.4,.9,9]],
 ['upper_solar',[-5.5,3.2,2.5],[-6,3.6,3],[.4,.9,9]],
 ['upper_barracks',[1.5,3.2,-6.5],[2,3.6,-7.5],[.2,.9,9]],
 ['walk_east',[9.5,3.2,.5],[10,3.5,1],[-1.2,.75,11]],
 ['walk_south',[7.5,3.2,5.5],[6,3.5,5],[.3,.7,11]],
 ['gatehouse_upper',[2.5,3.2,7.5],[2,3.6,7],[.2,.9,9]],
 ['watch_l1',[-7.5,3.2,-10.5],[-7,3.6,-12],[.3,.9,9]],
 ['turret_l1',[9.5,3.2,-5.5],[10,3.6,-7],[.3,.9,9]],
 ['watch_top',[-6.5,9.6,-10.5],[-7,9.8,-12],[.4,.8,10]],
 ['turret_top',[10.5,6.4,-5.5],[10,6.6,-7],[.4,.8,10]]];
async function frame(page,v){const [name,st,fo,cam]=v;
 return page.evaluate((sx,sy,sz,fx,fy,fz,cam)=>{let best=null,d=Infinity;HolmArrivalQA.graphNodes().forEach(n=>{if(Math.abs(n.y-sy)>1.2)return;const k=Math.hypot(n.x-sx,n.z-sz);if(k<d){d=k;best=n}});
  if(!best)return {error:'no node'};HolmArrivalQA.qaPlace(best.id);HolmArrivalQA.qaView(fx,fz,fy);camCtl.yaw=cam[0];camCtl.pitch=cam[1];camCtl.dist=cam[2];return {node:best.id,off:+d.toFixed(2),surface:best.surface}},
  P.x+st[0],P.y+st[1],P.z+st[2],P.x+fo[0],P.y+fo[1],P.z+fo[2],cam)}
(async()=>{
  const want=process.argv.slice(2),views=want.length?VIEWS.filter(v=>want.includes(v[0])):VIEWS;
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const out={base:BASE,tag:TAG,views:{},errors};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,120000);await sleep(2500);
    await page.evaluate(()=>HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds.slice(0,-1)));await sleep(4000);
    for(const v of views){const rec=await frame(page,v).catch(e=>({error:String(e).slice(0,200)}));
     if(!rec.error){await sleep(2600);const f=path.join(OUT,TAG+'_'+v[0]+'.jpg');await page.screenshot({path:f,type:'jpeg',quality:84}).catch(()=>{});rec.file=path.basename(f)}
     await page.evaluate(()=>{HolmArrivalQA.qaViewClear();UI.closeDialogue&&UI.closeDialogue()}).catch(()=>{});
     out.views[v[0]]=rec;console.log(v[0]+' '+JSON.stringify(rec))}
  }catch(e){out.error=String(e).slice(0,300);console.log('driver error '+out.error)}
  finally{const jf=path.join(OUT,TAG+'_capture.json');try{const old=JSON.parse(fs.readFileSync(jf,'utf8'));out.views=Object.assign(old.views||{},out.views)}catch(e){}
   fs.writeFileSync(jf,JSON.stringify(out,null,2));console.log('[KEEP_CAPTURE] page errors '+errors.length);await browser.close()}
})();
