/* Look v4 options frame-rate bench (2026-09-28): boots the live island once per ?look= option in headless Chrome on the
 * GPU with the frame cap off (no vsync, no frame-rate limit: the numbers show render cost, not the 60 Hz cap), frames
 * three standard look views and samples real frames with CRPerfProbe.sample. Prints the median fps, p95 frame time,
 * draw calls and the internal render size per option and view.
 * Run: SMOKE_BASE=http://127.0.0.1:8141 node tools/bench_look_v4.js [3,4a,4b,4c] */
'use strict';
const puppeteer=require('puppeteer-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOOKS=(process.argv[2]||'3,4a,4b,4c').split(',');
const VIEWS=[
 {name:'02_guide_house_exterior',x:66,z:101,yaw:.35,pitch:.95,dist:26},
 {name:'07_bakehouse_court',x:44,z:67,yaw:.7,pitch:1.0,dist:26},
 {name:'10_hill_panorama',x:74,z:44,yaw:.15,pitch:.65,dist:55}];
const ROUNDS=3,SECONDS=3,W=1530,H=1006;
const med=a=>{const s=a.slice().sort((p,q)=>p-q);return s[Math.floor(s.length/2)]};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size='+W+','+H,'--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11',
   '--disable-gpu-vsync','--disable-frame-rate-limit'],defaultViewport:{width:W,height:H}});
 const out=[];
 try{
  for(const look of LOOKS){
   const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
   await page.goto((process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=bench-look4-'+look+'-'+Date.now().toString(36)+'&look='+look,{waitUntil:'load',timeout:120000});
   await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
   await page.evaluate(()=>document.getElementById('btn-new').click());
   await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
   await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
   await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
   await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
   await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:120000});await sleep(6000);
   for(const v of VIEWS){
    await page.evaluate(v=>{HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);await sleep(4000);
    const s=[];for(let r=0;r<ROUNDS;r++){s.push(await page.evaluate(sec=>CRPerfProbe.sample(sec),SECONDS));await sleep(300)}
    const info=await page.evaluate(()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,
     px:typeof ClassicPixels!=='undefined'?ClassicPixels.snapshot():null,opt:typeof HolmLookV4!=='undefined'?HolmLookV4.option():null}));
    const row={look,view:v.name,fps:med(s.map(x=>x.fps)),p95Ms:med(s.map(x=>x.p95Ms)),calls:info.calls,tris:info.tris,internal:info.px&&info.px.enabled?info.px.internal:null,option:info.opt};
    out.push(row);console.log(JSON.stringify(row));
   }
   if(errs.length)console.log('['+look+'] page errors '+errs.length+': '+errs.slice(0,3).join(' | '));
   await page.close();
  }
  const gl=await (async()=>{const p=await browser.newPage();await p.goto('about:blank');const r=await p.evaluate(()=>{try{const g=document.createElement('canvas').getContext('webgl'),d=g.getExtension('WEBGL_debug_renderer_info');return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown'}catch(e){return 'unknown'}});await p.close();return r})();
  console.log('[LOOK V4 BENCH] gpu: '+gl+'; median fps per option: '+LOOKS.map(l=>l+' '+out.filter(r=>r.look===l).map(r=>r.fps).join('/')).join(', '));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
