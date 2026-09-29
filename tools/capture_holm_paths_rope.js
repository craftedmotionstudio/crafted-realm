/* Owner review 5 (2026-09-28) captures: purposeful grey paths and the rock-grey squares on steep edges, the same camera
 * positions before and after, at the game camera (UI chrome hidden so the sheet compares the world only). A fresh
 * adventurer on the island (qaProfile; production by default, HOLM_MODE=draft for ?holmIsland=1); the camera is framed
 * with the QA-only HolmArrivalQA.qaView (streams terrain, never moves the adventurer). Screenshots only; not a gameplay
 * proof (the rope steps are proved by real input in tools/qa_holm_island.js).
 * Run: SMOKE_BASE=http://127.0.0.1:8122 TAG=before node tools/capture_holm_paths_rope.js [view ...]
 * Output: scratchpad/holm_paths_rope/<TAG>/<view>.jpg + capture.json */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const TAG=process.env.TAG||'before';
const OUT=path.join(__dirname,'..','scratchpad','holm_paths_rope',TAG);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8122')+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+'pathsrope-'+TAG+'-'+Date.now().toString(36)+(process.env.CAP_QUERY||'');
// [x, z, yaw, pitch, dist, y?]: game-camera pitch ~0.9-1.1 (the 2004 camera), a few wider views of the route
const VIEWS={
 p01_landing_to_guide_house:[63,110,.55,.9,24],
 p02_guide_house_yard:[66,101,.35,.95,22],
 p03_guide_house_back_fork:[62,90,3.3,.95,20],
 p04_guide_knoll_wide:[66,100,.35,.95,30],
 p05_survival_camp_path:[38,88,.7,.95,26],
 p06_timber_bridge:[46,87.5,.5,.9,22],
 p07_bakehouse_lodge_lane:[42,62,.6,.95,26],
 p08_mill_crossing:[55,60,.8,.9,24],
 p09_quarry_approach:[38,40,.6,.9,26],
 p10_keep_court:[87,44,.7,.95,28],
 p11_bank_court:[86,62,.6,1.0,26],
 p12_mage_yard:[110,62,.6,.95,26],
 p13_crown_climb:[118,40,.2,.85,30],
 p14_route_overview_west:[48,78,.9,.75,52],
 p15_route_overview_east:[98,55,.4,.75,52],
 // the rock-grey squares on steep edges (HOLM_V2_LAND.md, 'For the owner'): the Guide House knoll, close
 r01_knoll_south_edge:[66,105,.35,1.0,14],
 r02_knoll_west_edge:[53,100,-1.5,1.0,14],
 r03_knoll_north_edge:[66,90,3.2,1.0,14],
 r04_knoll_east_edge:[79,101,1.5,1.0,14],
 r05_seat_edge_bakehouse:[46,70,.4,1.0,16],
 r06_ravine_cliff:[68,42,-.6,.9,20],
 r07_keep_crag_cliff:[84,42,.9,.9,22],
 // the Quarry Gate's mine shaft: the adventurer stood at the shaft stance (qaPlace, no lesson credit), two angles
 q01_shaft_stance:{stance:['quarry','shaft'],cam:[.7,.95,10]},
 q02_shaft_stance_back:{stance:['quarry','shaft'],cam:[-2.3,.95,10]},
 q03_quarry_outside:{stance:['quarry','approach'],cam:[.7,.9,16]},
 q04_shaft_top:{stance:['quarry','shaft'],cam:[.2,1.35,7]},
 q05_shaft_side:{stance:['quarry','shaft'],cam:[1.6,1.05,7]},
 q06_hall_top:{stance:['quarry','shaft'],cam:[0,1.45,9],look:[36,30.5]},
 // owner review 5, the rope (after): the coil by the shaft for a new adventurer, then the rope tied to the frame (the state is
 // set with the game's own HolmShaftRope.tie() for the picture; tools/qa_holm_island.js does it by real input)
 q10_rope_coil:{stance:['quarry','shaft'],cam:[.25,1.0,11],look:[36,30.5],setup:'untie'},
 q11_rope_coil_close:{stance:['quarry','approach'],cam:[.6,1.05,5],look:[36.55,30.45],setup:'untie'},
 q12_rope_tied:{stance:['quarry','shaft'],cam:[.25,1.0,11],look:[36,30.5],setup:'tie'},
 q13_rope_tied_close:{stance:['quarry','shaft'],cam:[.9,1.0,5],look:[36.3,29.3],setup:'tie'},
 q14_rope_tied_inside:{stance:['quarry','shaft'],cam:[-.35,1.25,5.5],look:[36.2,28],setup:'tie'},
 q15_rope_cavern_foot:{stance:['cavern','ladder'],cam:[.7,1.0,9],setup:'tie'}};
async function frame(page,v){
  if(Array.isArray(v))return page.evaluate(v=>{HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear();HolmArrivalQA.qaView(v[0],v[1],v[5]);camCtl.yaw=v[2];camCtl.pitch=v[3];camCtl.dist=v[4];return true},v);
  if(v.setup)await page.evaluate(k=>{if(typeof HolmShaftRope==='undefined')return;if(k==='untie'){HolmShaftRope.qaUntie()}else if(k==='tie'&&!HolmShaftRope.tied()){Player.addItem('rope',1);HolmShaftRope.tie()}HolmShaftRope.update(0)},v.setup);
  return page.evaluate(v=>{HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear();const s=HolmArrivalQA.qaStance(v.stance[0],v.stance[1]);if(!s)return false;HolmArrivalQA.qaPlace(s.id);if(v.look)HolmArrivalQA.qaView(v.look[0],v.look[1],s.y);camCtl.yaw=v.cam[0];camCtl.pitch=v.cam[1];camCtl.dist=v.cam[2];return s},v);
}
(async()=>{
  const want=process.argv.slice(2),names=want.length?want:Object.keys(VIEWS);
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1280,760','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11'],defaultViewport:{width:1280,height:760}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,300))});
  const missing=[];page.on('response',r=>{if(r.status()===404)missing.push(r.url().replace(/^https?:\/\/[^/]+/,''))});
  const out={base:BASE,tag:TAG,views:{},errors,missing};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,120000);await sleep(2500);
    await page.evaluate(()=>{try{UI.closeDialogue&&UI.closeDialogue()}catch(e){}});
    await page.addStyleTag({content:'body *{visibility:hidden !important} #game-canvas{visibility:visible !important}'});
    for(const n of names){const v=VIEWS[n];if(!v){console.log('no view '+n);continue}
      const rec={};
      try{rec.at=await frame(page,v);
        await sleep(3500);const f=path.join(OUT,n+'.jpg');await page.screenshot({path:f,type:'jpeg',quality:86});rec.file=path.basename(f)}
      catch(e){rec.error=String(e).slice(0,200)}
      out.views[n]=rec;console.log(n+' '+JSON.stringify(rec))}
  }catch(e){out.error=String(e).slice(0,300);console.log('driver error '+out.error)}
  finally{const jf=path.join(OUT,'capture.json');try{const old=JSON.parse(fs.readFileSync(jf,'utf8'));out.views=Object.assign(old.views||{},out.views)}catch(e){}
    fs.writeFileSync(jf,JSON.stringify(out,null,2));console.log('[PATHS_ROPE_CAPTURE] page errors '+errors.length+(errors.length?'\n'+errors.slice(0,6).join('\n'):''));await browser.close()}
})();
