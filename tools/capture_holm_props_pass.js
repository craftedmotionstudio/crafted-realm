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
 quarry:[['bench',[3.5,0,.5],[4.2,-.2,.3],[-1.3,1.1,6]],['anvil_crates',[3.5,0,.5],[4.6,-.2,1.6],[-1.8,1.1,6]],['hall_racks',[.5,0,.5],[1.9,-.2,-1.2],[-.6,1.1,6.5]],
  ['table',[.5,0,.5],[1,-.2,1.9],[2.6,1.1,6]],['winch_loft',[-3.5,2.8,-2.5],[-3.6,2.6,-3],[.6,1.1,6]],['sign',[-1.5,-.15,5.5],[-3.3,1.5,3.8],[1.2,.6,5.5]],['kibble',[-.5,0,-1.5],[.5,1.6,-2.7],[.4,.85,7]]],
 mage:[['runes',[2.5,0,.5],[2.5,-.2,1.4],[3.14,1.1,6]],['wing_hearth',[-3.5,0,.5],[-4.6,-.3,-1.4],[.5,1.15,6.5]],['wing_bed',[-3.5,0,.5],[-4.9,-.3,2.9],[2.6,1.15,6]],
  ['wing_desk',[-3.5,0,.5],[-2.6,-.2,-1.4],[.2,1.15,6]],['tower_shelf',[.5,0,1.5],[-1.3,.3,2],[1.6,1,6]],['library_lectern',[2.5,3,1.5],[2.3,3,2.3],[3.6,1.1,6]],
  ['library_shelves',[2.5,3,.5],[5,2.8,.3],[-1.57,1.05,6]],['observatory',[3.5,6,-1.5],[1.2,5.8,-2.7],[.8,1.1,7]],['yard',[-3.5,-.13,6.5],[-4,-.3,6],[.2,1.1,9]]],
 haven:[['shelter',[-3.5,.15,-2.5],[-4.6,-.1,-2.8],[1.2,1.1,6]],['notice',[-.5,.15,.5],[-2,.8,.8],[1.5,.8,5.5]],['pier_props',[.5,-1.05,-14.5],[-2.9,-1.2,-15.6],[.8,1.1,7]],
  ['mooring',[.5,-1.05,-14.5],[2.2,-1.1,-12],[-1,1.1,8]]],
 survival:[['canopy',[-2.5,0,-2.5],[-3.2,-.2,-2.5],[.5,1.1,7]],['store_tools',[4.5,.6,-2.5],[4.5,1.2,-3.6],[0,.9,6]],['logs',[4.5,.14,1.5],[4.5,.3,.8],[.3,1.05,6.5]],
  ['fire',[-1.5,-.4,3.5],[-2.5,-.4,3.5],[1,1.1,6]],['yard',[-1.5,-.4,3.5],[-3,-.5,4.2],[.6,1.1,7]]],
 mill:[['stones',[.5,.04,-1.5],[.2,-.2,.4],[-2.6,1.1,7]],['ark',[1.5,.04,-2.5],[3,-.3,-2.5],[-1,1.1,6]],['sacks',[1.5,.04,1.5],[3,-.4,2.1],[-1.3,1.1,6]],
  ['sack_truck',[-1.5,.04,1.5],[-2.2,-.3,2.3],[1,1.1,6]],['spare_stone',[.5,0,5.5],[1,.3,4.4],[.2,1.25,8]],['door_sacks',[2.5,0,-4.5],[3.5,.3,-4.5],[3,1.25,8]]],
 bank:[['counter',[.5,0,-.5],[.5,.4,-1.4],[0,1,6]],['vault',[3.5,0,-1.5],[3.5,-.2,-3],[-.3,.85,6]],['shelves',[4.5,0,.5],[5.1,.6,0],[-1.5,.95,6]],
  ['strongroom',[-3.5,0,0],[-4.6,-.3,-.3],[1.3,1.15,6]],['clerk_back',[.5,0,-.5],[-.8,-.2,-3.2],[.3,1.1,7]],['hall',[.5,0,1.5],[.5,-.3,2.5],[3.14,1.15,7]],
  ['upper_clerk',[-3.5,3,.5],[-2.5,2.8,0],[.6,1.1,7]],['upper_store',[-3.5,3,.5],[-3.5,2.7,-3.3],[.3,1.1,7]]],
 lastlight:[['stores',[-3.5,0,2.5],[-2.9,-.3,3.3],[-2.6,1.2,7]],['ground_room',[-3.5,0,.5],[-4,-.2,-1.3],[.5,1.1,6]],['tower_base',[1.5,0,-2.5],[1.5,-.1,0],[-2.2,1.1,7]],
  ['keeper_room',[1.5,3,-2.5],[0,2.9,-1],[.6,1.1,7]],['watch_room',[2.5,6,-1.5],[.5,5.9,-2],[.8,1.1,7]],['yard',[-5.5,0,.5],[-5.8,-.2,-1.8],[2.8,1.1,6.5]]],
 bakehouse:[['worktable',[-2.5,0,.5],[-1.9,-.1,-.55],[.6,1.1,7]],['buckets_water',[-1.5,0,1.5],[-.9,-.3,2.5],[0,1.15,6.5]],['oven_tools',[-1.5,0,-2.5],[-2.2,-.2,-3.5],[.3,1.1,6]],
  ['flour_hutch',[4.5,0,-3.5],[4.5,-.2,-4.3],[.2,1.15,6]],['bread_rack',[5.5,0,-3.5],[6.5,-.1,-3.5],[-1.4,1.1,6]],['store_sacks',[2.5,0,-3.5],[1.9,-.3,-4.2],[.6,1.15,6]],
  ['meal_chest',[3.5,0,-1.5],[4.3,-.2,-.5],[-2.8,1.1,6]],['under_stair',[-3.5,0,-.5],[-4.4,-.3,-.6],[1.3,1.15,6]],['cooling_bench',[-2.5,0,1.5],[-2.7,-.2,2.6],[3.14,1.15,6]],
  ['recipe_settle',[-.5,0,-1.5],[.7,.3,-1],[-1.4,.9,5]],['loft',[-2.5,3.3,-2.5],[-1.5,3,-3.8],[.4,1.1,7]],['court_woodpile',[4.5,0,1.5],[5.5,.1,.5],[.2,1.15,7]]],
 cavern:[['ladder',[-6.5,0,.5],[-7.4,-.2,.5],[1.2,1.1,6]],['cart',[-6.5,0,.5],[-2.8,-.2,3],[.5,1.1,6]],['forge',[3.5,0,3.5],[5,-.2,5.3],[-2.4,1.1,7]],
  ['ore_crates',[.5,0,-4.5],[.5,-.3,-5.5],[.3,1.1,6]],['exit_end',[27.5,0,.5],[25.5,-.2,3],[-.5,1.1,7]]]};
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
