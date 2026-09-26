/* Classic pixels frame-rate bench (look pass 2, 2026-09-26): boots the island draft in headless Chrome with the frame
 * cap off (no vsync, no frame-rate limit, so the numbers show render cost, not the 60 Hz cap), frames three of the
 * standard look views, and alternates Classic pixels off/on (ClassicPixels.set) several times per view, sampling
 * real frames with CRPerfProbe.sample. Prints the median fps and p95 frame time per mode and view.
 * Run: SMOKE_BASE=http://127.0.0.1:8101 node tools/bench_classic_pixels.js   (BENCH_QUERY for extra URL query) */
'use strict';
const puppeteer=require('puppeteer-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const VIEWS=[
 {name:'02_guide_house_exterior',x:66,z:101,yaw:.35,pitch:.95,dist:26},
 {name:'07_bakehouse_court',x:44,z:67,yaw:.7,pitch:1.0,dist:26},
 {name:'10_hill_panorama',x:74,z:44,yaw:.15,pitch:.65,dist:55}];
const ROUNDS=3,SECONDS=3;
const med=a=>{const s=a.slice().sort((p,q)=>p-q);return s[Math.floor(s.length/2)]};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11',
   '--disable-gpu-vsync','--disable-frame-rate-limit'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 await page.goto((process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&classic=0&qaProfile=bench-classic-'+Date.now().toString(36)+(process.env.BENCH_QUERY||''),{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:120000});await sleep(5000);
 const out=[];
 for(const v of VIEWS){
  await page.evaluate(v=>{HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);await sleep(4000);
  const res={off:[],on:[]};
  for(let r=0;r<ROUNDS;r++)for(const mode of ['off','on']){
   await page.evaluate(m=>ClassicPixels.set(m==='on'),mode);await sleep(1200);
   const s=await page.evaluate(sec=>CRPerfProbe.sample(sec),SECONDS);res[mode].push(s);
  }
  const snap=await page.evaluate(()=>ClassicPixels.snapshot());
  const row={view:v.name,internal:snap.internal,palette:snap.palette};
  for(const m of ['off','on'])row[m]={fps:med(res[m].map(s=>s.fps)),p95Ms:med(res[m].map(s=>s.p95Ms)),samples:res[m].map(s=>s.fps)};
  out.push(row);console.log(JSON.stringify(row));
 }
 await page.evaluate(()=>ClassicPixels.set(false));
 const gl=await page.evaluate(()=>{try{const g=renderer.getContext(),d=g.getExtension('WEBGL_debug_renderer_info');return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown'}catch(e){return 'unknown'}});
 console.log('[CLASSIC BENCH] gpu: '+gl+'; median fps off -> on: '+out.map(r=>r.view.slice(0,2)+' '+r.off.fps+' -> '+r.on.fps).join(', ')+(errs.length?'; page errors '+errs.length:''));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
