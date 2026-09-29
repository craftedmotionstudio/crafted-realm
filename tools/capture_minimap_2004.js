/* Minimap review captures (holm-minimap-2004, owner 2026-09-29: "our mini map in the top right just isn't the most clear ...
 * look more like old school RuneScape ... if I could scroll wheel on the minimap to set it to a specific distance").
 * Boots ?holmIsland=1 at each review size (desktop 1356x773, 1538x900, 1920x1080 and a phone), stands the adventurer on a
 * few fixed island spots (a read-only nearest-node lookup + HolmArrivalQA.qaPlace, the same bench helper the combat QA
 * uses), faces the camera north and a quarter turn, and saves the full screen plus the minimap cluster, so a before and
 * an after run compare frame for frame.
 * Run: SMOKE_BASE=http://127.0.0.1:8221 node tools/capture_minimap_2004.js <label> [sizes]
 *      label: before | after (folder scratchpad/minimap_2004/<label>/); sizes: comma list of 1356x773,1538x900,1920x1080,phone
 * Our own game only: no 2004 imagery is written here (that stays in the private ref2004_captures folder). */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const label=process.argv[2]||'after';
const OUT=path.join(__dirname,'..','scratchpad','minimap_2004',label);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8221')+'/?holmIsland=1&qaProfile=mm2004'+label+Date.now().toString(36)+(process.env.SMOKE_QUERY||'');
const SIZES={'1356x773':{width:1356,height:773},'1538x900':{width:1538,height:900},'1920x1080':{width:1920,height:1080},
 phone:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2}};
const want=(process.argv[3]||Object.keys(SIZES).join(',')).split(',');
// fixed spots (world tiles): the dock, the Guide House lawn, the bank hall, the bakehouse yard, the keep court
const SPOTS=[['dock',[61,118]],['guide',[66,110]],['bank',[86,57]],['bakehouse',[46,68]],['keep',[88,36]]];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1920,1080','--hide-scrollbars','--mute-audio','--no-first-run']});
 const log=[];
 try{
  for(const key of want){
   const vp=SIZES[key];if(!vp)continue;
   const page=await browser.newPage();await page.setViewport(vp);
   await page.goto(BASE+'&mmsize='+key,{waitUntil:'load',timeout:120000});await L.enter(page);await sleep(2500);
   // every run starts at the default zoom (the minimap remembers the wheel per browser); the after run also keeps a wait for
   // the wall plan and the ground colours, which fill in over the first seconds
   await page.evaluate(()=>{try{if(CRMinimap.setZoom)CRMinimap.setZoom(4)}catch(e){}});
   for(let w=0;w<30;w++){const done=await page.evaluate(()=>{const s=CRMinimap.snapshot();return !s.walls||s.walls.done!==false&&(!s.ground||s.ground.chunks===s.ground.total)});if(done)break;await sleep(500)}
   for(const [name,at] of SPOTS){
    const placed=await page.evaluate(at=>{
     if(!at)return true;const g=HolmArrivalQA.navGraph();if(!g)return false;let best=null,d=1e9;
     g.nodes.forEach(n=>{if(n.y<-5||/upper|Upper|stair|Stair/.test(n.surface))return;const k=Math.hypot(n.x-at[0]-.5,n.z-at[1]-.5);if(k<d){d=k;best=n}});
     return best?HolmArrivalQA.qaPlace(best.id):false},at);
    for(const [yn,yaw] of [['n',0],['turn',0.7]]){
     await page.evaluate(yaw=>{camCtl.yaw=yaw;if(typeof drawMinimap==='function')drawMinimap()},yaw);await sleep(1600);
     const file=key+'_'+name+'_'+yn;await page.screenshot({path:path.join(OUT,file+'.jpg'),type:'jpeg',quality:80});
     const rect=await page.evaluate(()=>{const e=document.getElementById('mm-cluster')||document.getElementById('minimap-frame');const r=e.getBoundingClientRect();
      const f=document.getElementById('minimap-frame').getBoundingClientRect();return {x:Math.max(0,Math.min(r.x,f.x-40)),y:Math.max(0,Math.min(r.y,f.y-30)),w:Math.max(r.width,f.width+60),h:Math.max(r.height,f.height+60),frame:[f.x,f.y,f.width,f.height]}});
     await page.screenshot({path:path.join(OUT,file+'_mm.png'),clip:{x:rect.x,y:rect.y,width:Math.min(rect.w,vp.width-rect.x),height:rect.h}});
     const snap=await page.evaluate(()=>({mm:typeof CRMinimap!=='undefined'?CRMinimap.snapshot():null,p:[player.position.x,player.position.z].map(v=>+v.toFixed(2)),yaw:camCtl.yaw,z:typeof UIScale!=='undefined'?UIScale.value():1,dpr:devicePixelRatio}));
     log.push({file,size:key,spot:name,placed,rect,snap});
    }
    // the wheel's two ends (2 and 8 px a tile) at one size and spot
    if(key==='1538x900'&&name==='guide'&&(await page.evaluate(()=>!!CRMinimap.setZoom))){for(const z of [2,8]){await page.evaluate(z=>{CRMinimap.setZoom(z);camCtl.yaw=0},z);await sleep(1400);
      const rect=await page.evaluate(()=>{const f=document.getElementById('minimap-frame').getBoundingClientRect();return {x:f.x-40,y:Math.max(0,f.y-30),w:f.width+60,h:f.height+60}});
      await page.screenshot({path:path.join(OUT,key+'_'+name+'_zoom'+z+'_mm.png'),clip:{x:rect.x,y:rect.y,width:Math.min(rect.w,vp.width-rect.x),height:rect.h}});}
     await page.evaluate(()=>CRMinimap.setZoom(4))}
   }
   await page.close();
  }
 }finally{await browser.close()}
 fs.writeFileSync(path.join(OUT,'captures.json'),JSON.stringify(log,null,1));
 console.log('[capture_minimap_2004]',label,log.length,'captures ->',OUT);
})().catch(e=>{console.error(e);process.exit(1)});
