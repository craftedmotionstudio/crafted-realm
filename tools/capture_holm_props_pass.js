/* Props pass captures (owner, 2026-09-28: "props ... blocky -> redo in Blender purposefully"; "every object in every
 * building reviewed in Blender"): the same game-camera frames inside every building before and after its props are
 * designed again. A fresh adventurer on the island (qaProfile, production bundle by default; HOLM_MODE=draft for
 * ?holmIsland=1) with every lesson but the last granted (so the gated doors stand open) is stood on the building's
 * graph node nearest a local spot with the QA-only HolmArrivalQA.qaPlace (read-only, no lesson credit), so the cutaway
 * and the storey behave as for a player standing there; the camera is framed on a prop with HolmArrivalQA.qaView.
 * Run: SMOKE_BASE=http://127.0.0.1:8112 TAG=before node tools/capture_holm_props_pass.js [building ...]
 * Output: scratchpad/holm_props_pass/ingame/<TAG>_<building>_<view>.jpg + <TAG>_capture.json */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const TAG=process.env.TAG||'before';
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'scratchpad','holm_props_pass','ingame');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8112')+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+'props-'+TAG+'-'+Date.now().toString(36);
const REG=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/rebuild/holm-overhaul/v2land.json'),'utf8')).buildings;
// building -> [view, stand at (local x,y,z), look at (local x,y,z), camera [yaw (0 = from the south), pitch, distance]]
const VIEWS={
 keep:[['hall_table',[-5.5,0,.5],[-5.3,.8,-3.4],[.4,.85,6]],['corner_sw',[-7.5,0,4.5],[-8.6,-.5,5],[2.4,1.2,9]],['corner_se',[-4.5,0,4.5],[-4.2,-.5,5],[-2.4,1.2,9]],
  ['weapons',[-7.5,0,-6.5],[-8.6,-.2,-6.3],[1.4,1.1,8]],['barracks_bunks',[4.5,0,-7],[4.2,.7,-7.8],[.2,1.0,8]],['barracks_table',[4.5,0,-7],[4,.8,-5.7],[-.7,1.0,7]],
  ['upper_quarters',[-5.5,3.2,-2.5],[-5,3.8,-4.5],[.8,.9,7]]],
 quarry:[['bench',[3.5,0,.5],[4.2,.8,.3],[-1.2,.85,6]],['hall_racks',[.5,0,.5],[1.8,.8,-1],[-.6,.9,7]],['table',[.5,0,.5],[1,.8,1.9],[2.5,.85,5]],
  ['winch_loft',[-3.5,2.8,-2.5],[-3.6,3.6,-3],[.6,.8,6]],['sign',[-1.5,-.15,5.5],[-3.3,2.3,3.6],[.5,.4,6]],['kibble',[-.5,0,-1.5],[.5,3.2,-2.7],[2.4,.35,6]]],
 mage:[['runes',[2.5,0,.5],[2.5,.8,1.4],[Math.PI,.9,5]],['wing_hearth',[-3.5,0,.5],[-4.5,.6,-1.4],[.5,.9,7]],['wing_bed',[-3.5,0,.5],[-4.8,.5,2.9],[2.5,.9,6]],
  ['library_lectern',[2.5,3,1.5],[2.3,3.8,2.3],[3.6,.85,6]],['library_shelves',[2.5,3,1.5],[-1,4,-1],[1.8,.8,7]],['observatory',[3.5,6,-1.5],[1.2,6.6,-2.7],[.8,.85,7]],
  ['yard',[-3.5,-.13,6.5],[-4,.6,6],[.2,.8,9]]],
 haven:[['shelter',[-3.5,.15,-2.5],[-4.6,.6,-2.8],[1.2,.85,6]],['notice',[-.5,.15,.5],[-2,1.2,.8],[1.5,.5,5]],['pier_props',[.5,-1.05,-14.5],[-2.9,-.6,-15.6],[.8,.8,7]],
  ['mooring',[.5,-1.05,-14.5],[2.2,-.8,-12],[-1,.8,8]]],
 survival:[['canopy',[-2.5,0,-2.5],[-3.2,.5,-2.5],[.5,.9,7]],['store_tools',[4.5,.6,-2.5],[4.5,1.5,-3.6],[0,.6,5]],['logs',[4.5,.14,1.5],[4.5,.7,.8],[.3,.7,6]],
  ['fire',[-1.5,-.4,3.5],[-2.5,0,3.5],[1,.8,6]]],
 mill:[['stones',[.5,.04,-1.5],[.2,1,.4],[2.8,.8,6]],['store',[1.5,.04,-2.5],[3,.6,-2.5],[-1.2,.8,6]],['sacks',[-2.5,.04,.5],[2.8,.5,2.2],[-1.5,.8,7]],
  ['bin_west',[-2.5,.04,.5],[-2.2,.5,2],[1.2,.8,6]]],
 bank:[['counter',[.5,0,-.5],[.5,1.2,-1.4],[0,.7,6]],['vault',[3.5,0,-1.5],[3.5,.6,-3.8],[.2,.8,6]],['shelves',[4.5,0,.5],[5.1,1.3,0],[-1.5,.6,6]],
  ['strongroom',[-3.5,0,0],[-4.6,.5,-.3],[1.3,.85,6]],['clerk_back',[.5,0,-.5],[-.8,.6,-3.2],[.3,.85,7]],['upper_clerk',[-3.5,3,.5],[-2.5,3.6,0],[.6,.85,7]],
  ['upper_store',[-3.5,3,.5],[-3.5,3.4,-3.3],[.3,.85,7]]],
 lastlight:[['stores',[-3.5,0,2.5],[-3.3,.9,3.4],[Math.PI,.8,5]],['ground_room',[-3.5,0,.5],[-4,.7,-1.3],[.5,.85,6]],['tower_base',[1.5,0,-2.5],[1.5,.8,0],[-2.2,.85,7]],
  ['keeper_room',[1.5,3,-2.5],[0,3.6,-1],[.6,.85,7]],['watch_room',[2.5,6,-1.5],[.5,6.5,-2],[.8,.85,7]],['yard',[-5.5,0,.5],[-5.8,0,-1.8],[2.8,.8,6]]],
 bakehouse:[['prep',[-2.5,0,.5],[-1.9,.9,-.5],[.7,.9,7]],['buckets_water',[-1.5,0,1.5],[-1,.6,2.5],[2.8,.8,6]],['store',[4.5,0,-3.5],[4.5,1,-3],[.6,.85,7]],
  ['store_east',[4.5,0,-3.5],[6.5,1,-3.5],[-2.2,.85,6]],['hall_seats',[-2.5,0,.5],[-4.4,.4,-.6],[1.8,.85,6]],['loft',[-2.5,3.3,-2.5],[-2,3.7,-3.8],[.4,.85,7]],
  ['court',[.5,0,1.5],[5.5,.4,1.5],[-.6,.8,8]]],
 cavern:[['ladder',[-6.5,0,.5],[-7.4,.6,.5],[1.2,.85,6]],['cart',[-6.5,0,.5],[-2.8,.6,3],[.5,.85,6]],['forge',[3.5,0,3.5],[5,.6,5.3],[-2.4,.85,7]],
  ['ore_crates',[.5,0,-4.5],[.5,.5,-5.5],[.3,.8,6]],['exit_end',[27.5,0,.5],[25.5,.6,3],[-.5,.85,7]]]};
async function frame(page,b,v){const p=REG[b].placement,[name,st,fo,cam]=v;
 return page.evaluate((b,sx,sy,sz,fx,fy,fz,cam)=>{let best=null,d=Infinity;HolmArrivalQA.graphNodes().forEach(n=>{if(n.id.indexOf('b:'+b+':')!==0)return;if(Math.abs(n.y-sy)>1.2)return;const k=Math.hypot(n.x-sx,n.z-sz);if(k<d){d=k;best=n}});
  if(!best)return {error:'no node'};HolmArrivalQA.qaPlace(best.id);HolmArrivalQA.qaView(fx,fz,fy);camCtl.yaw=cam[0];camCtl.pitch=cam[1];camCtl.dist=cam[2];return {node:best.id,off:+d.toFixed(2)}},
  b,p.x+st[0],p.y+st[1],p.z+st[2],p.x+fo[0],p.y+fo[1],p.z+fo[2],cam)}
(async()=>{
  const want=process.argv.slice(2),names=want.length?want:Object.keys(VIEWS);
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  const out={base:BASE,tag:TAG,views:{},errors};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,120000);await sleep(2500);
    await page.evaluate(()=>HolmIslandCurriculum.qaGrant(HolmCurriculumProgress.lessonIds.slice(0,-1)));await sleep(4000);
    for(const b of names)for(const v of VIEWS[b]){const rec=await frame(page,b,v).catch(e=>({error:String(e).slice(0,200)}));
     if(!rec.error){await sleep(2600);const f=path.join(OUT,TAG+'_'+b+'_'+v[0]+'.jpg');await page.screenshot({path:f,type:'jpeg',quality:84}).catch(()=>{});rec.file=path.basename(f)}
     await page.evaluate(()=>{HolmArrivalQA.qaViewClear();UI.closeDialogue&&UI.closeDialogue()}).catch(()=>{});
     out.views[b+'_'+v[0]]=rec;console.log(b+' '+v[0]+' '+JSON.stringify(rec))}
  }catch(e){out.error=String(e).slice(0,300);console.log('driver error '+out.error)}
  finally{const jf=path.join(OUT,TAG+'_capture.json');try{const old=JSON.parse(fs.readFileSync(jf,'utf8'));out.views=Object.assign(old.views||{},out.views)}catch(e){}
   fs.writeFileSync(jf,JSON.stringify(out,null,2));console.log('[PROPS_CAPTURE] page errors '+errors.length);await browser.close()}
})();
