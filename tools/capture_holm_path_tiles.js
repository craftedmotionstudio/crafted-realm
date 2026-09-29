/* Path tiles pass (2026-09-29) captures: the grey paths at the game camera, the same camera positions before (review-5
 * lanes) and after (the authored layout), UI chrome hidden so the sheet compares the world only. A fresh adventurer on the
 * island (qaProfile; production by default, HOLM_MODE=draft for ?holmIsland=1); the camera is framed with the QA-only
 * HolmArrivalQA.qaView (streams terrain, never moves the adventurer). Screenshots only; not a gameplay proof.
 * Run: SMOKE_BASE=http://127.0.0.1:8231 TAG=after node tools/capture_holm_path_tiles.js [view ...]
 * Output: scratchpad/holm_path_tiles/<TAG>/<view>.jpg + capture.json */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const {sleep,enter,waitFor}=L;
const TAG=process.env.TAG||'after';
const OUT=path.join(__dirname,'..','scratchpad','holm_path_tiles',TAG);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8231')+(process.env.HOLM_MODE==='draft'?'/?holmIsland=1&qaProfile=':'/?qaProfile=')+'pathtiles-'+TAG+'-'+Date.now().toString(36)+(process.env.CAP_QUERY||'');
// [x, z, yaw, pitch, dist]: the game camera (pitch ~0.9-1.1, the 2004 camera) and a few wider looks down the lanes
const VIEWS={
 v01_guide_house_front:[64,109,.45,.95,22],
 v02_guide_house_back:[64,90,3.4,.95,20],
 v03_knoll_to_bridge:[56,89,2.6,.9,24],
 v04_survival_hollow:[36,92,.5,.95,24],
 v05_bakehouse_lane:[40,66,.6,.95,26],
 v06_lodge_village_lane:[46,57,.4,.95,26],
 v07_quarry_climb:[30,46,-1.2,1.0,24],
 v07b_quarry_gate:[33,41,-0.4,1.05,18],
 v08_keep_ledge:[82,54,.7,.95,26],
 v09_bank_court:[88,63,.5,1.0,24],
 v10_gully_to_mage:[100,60,.3,.95,24],
 v11_crown_climb:[120,40,-0.6,1.2,40],
 v12_village_road:[80,70,.6,.9,34],
 v13_overview_west:[46,76,.9,.75,56],
 v14_overview_east:[98,58,.4,.75,56]};
async function frame(page,v){
  return page.evaluate(v=>{HolmArrivalQA.qaViewClear&&HolmArrivalQA.qaViewClear();HolmArrivalQA.qaView(v[0],v[1]);camCtl.yaw=v[2];camCtl.pitch=v[3];camCtl.dist=v[4];return true},v);
}
(async()=>{
  const want=process.argv.slice(2),names=want.length?want:Object.keys(VIEWS);
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1280,760','--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11'],defaultViewport:{width:1280,height:760}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('console',m=>{if(m.type()==='error'&&!/404|favicon|BUILD_INFO/.test(m.text()))errors.push('console: '+m.text().slice(0,300))});
  const out={base:BASE,tag:TAG,views:{},errors};
  try{
    await page.goto(BASE,{waitUntil:'load',timeout:180000});await enter(page);
    await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,120000);await sleep(2500);
    await page.evaluate(()=>{try{UI.closeDialogue&&UI.closeDialogue()}catch(e){}});
    out.paths=await page.evaluate(()=>({style:HolmOverhaulGround.pathStyle(),tiles:typeof HolmIslandGreyPaths!=='undefined'?Object.keys(HolmIslandGreyPaths.tiles).length:null,layout:typeof HolmIslandGreyPaths!=='undefined'?HolmIslandGreyPaths.layout||null:null}));
    await page.addStyleTag({content:'body *{visibility:hidden !important} #game-canvas{visibility:visible !important}'});
    for(const n of names){const v=VIEWS[n];if(!v){console.log('no view '+n);continue}
      const rec={};
      try{rec.at=await frame(page,v);await sleep(3500);const f=path.join(OUT,n+'.jpg');await page.screenshot({path:f,type:'jpeg',quality:84});rec.file=path.basename(f)}
      catch(e){rec.error=String(e).slice(0,200)}
      out.views[n]=rec;console.log(n+' '+JSON.stringify(rec))}
  }catch(e){out.error=String(e).slice(0,300);console.log('driver error '+out.error)}
  finally{const jf=path.join(OUT,'capture.json');try{const old=JSON.parse(fs.readFileSync(jf,'utf8'));out.views=Object.assign(old.views||{},out.views)}catch(e){}
    fs.writeFileSync(jf,JSON.stringify(out,null,2));console.log('[PATH_TILES_CAPTURE] paths '+JSON.stringify(out.paths)+' page errors '+errors.length+(errors.length?'\n'+errors.slice(0,6).join('\n'):''));await browser.close()}
})();
