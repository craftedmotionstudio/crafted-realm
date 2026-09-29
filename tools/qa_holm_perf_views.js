/* Tutor's Holm performance capture at the heaviest island views (finish goal M7: "foreground smoke and performance
 * gates are green", audit 2026-09-29). Boots the live island (tutors-holm-v3, the shipped look) in a foreground headless
 * Chrome on the GPU with the normal 60 Hz frame cap, frames nine views a player can reach (the widest panoramas, the
 * busiest courts, the pond with its fires and leaves, the ore workings, Lastlight's crown), lets the stream settle, and
 * samples real frames with CRPerfProbe.sample: fps, p95 and worst frame, draw calls and triangles. Judged against the
 * smoke gate's own budgets (src/smoke.js SMOKE_BUDGETS: >= 45 fps, worst frame <= 150 ms, <= 800 draw calls, <= 900k
 * triangles). Views use the read-only HolmArrivalQA.qaView (the adventurer is not moved).
 * Run: SMOKE_BASE=http://127.0.0.1:8171 node tools/qa_holm_perf_views.js  -> scratchpad/holm_perf_views/{results.json,*.png} */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_perf_views');fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const BUDGET={minFps:45,maxWorstFrameMs:150,maxDrawCalls:800,maxTris:900000};
const VIEWS=[
 {name:'01_arrival_wide',x:66,z:104,yaw:.35,pitch:.8,dist:40},
 {name:'02_guide_house_exterior',x:66,z:101,yaw:.35,pitch:.95,dist:26},
 {name:'03_minnow_hollow_camp',x:32,z:92,yaw:-.6,pitch:.95,dist:28},
 {name:'04_bakehouse_court',x:44,z:67,yaw:.7,pitch:1.0,dist:26},
 {name:'05_hill_panorama',x:74,z:44,yaw:.15,pitch:.65,dist:55},
 {name:'06_keep_court',x:78,z:40,yaw:2.2,pitch:1.0,dist:30},
 {name:'07_lastlight_crown_and_cove',x:100,z:22,yaw:-2.6,pitch:.8,dist:45},
 {name:'08_island_overview_max_zoom',x:72,z:64,yaw:0,pitch:1.2,dist:70},
 {name:'09_ore_workings',x:200,z:60,y:-30,yaw:.8,pitch:1.0,dist:24}];
const med=a=>{const s=a.slice().sort((p,q)=>p-q);return s[Math.floor(s.length/2)]};
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
 const rows=[],errs=[];let ok=true;
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await page.goto((process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?qaProfile=perfviews-'+Date.now().toString(36),{waitUntil:'load',timeout:180000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
  await page.evaluate(()=>document.getElementById('btn-new').click());
  await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
  await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
  await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
  await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
  await page.waitForFunction(()=>typeof running!=='undefined'&&running&&typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,{timeout:180000});await sleep(6000);
  const env=await page.evaluate(()=>({provider:CRWorldMode.providerId,gpu:(()=>{try{const g=renderer.getContext(),d=g.getExtension('WEBGL_debug_renderer_info');return d?g.getParameter(d.UNMASKED_RENDERER_WEBGL):'unknown'}catch(e){return 'unknown'}})(),size:[innerWidth,innerHeight]}));
  console.log('[PERF VIEWS] '+JSON.stringify(env));
  for(const v of VIEWS){
   await page.evaluate(v=>{HolmArrivalQA.qaView(v.x,v.z,v.y);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);await sleep(4500);
   const s=[];for(let r=0;r<3;r++){s.push(await page.evaluate(()=>CRPerfProbe.sample(3)));await sleep(250)}
   const info=await page.evaluate(()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles}));
   const row={view:v.name,fps:med(s.map(x=>x.fps)),p95Ms:med(s.map(x=>x.p95Ms)),worstMs:Math.max(...s.map(x=>x.worstMs)),calls:info.calls,tris:info.tris,hidden:s.some(x=>x.hidden)};
   row.pass=row.fps>=BUDGET.minFps&&row.worstMs<=BUDGET.maxWorstFrameMs&&row.calls<=BUDGET.maxDrawCalls&&row.tris<=BUDGET.maxTris&&!row.hidden;ok=ok&&row.pass;
   rows.push(row);console.log((row.pass?'  ok  ':'  FAIL ')+JSON.stringify(row));await page.screenshot({path:path.join(OUT,v.name+'.png')});
  }
  await page.evaluate(()=>HolmArrivalQA.qaViewClear());
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({at:new Date().toISOString(),env,budget:BUDGET,rows,pageErrors:errs},null,1));
 }catch(e){ok=false;console.error(e)}
 finally{await browser.close()}
 ok=ok&&errs.length===0;
 console.log('[PERF VIEWS] '+(ok?'PASS':'FAIL')+' '+rows.filter(r=>r.pass).length+'/'+VIEWS.length+' views within the smoke budgets; worst frame '+Math.max(0,...rows.map(r=>r.worstMs))+' ms, max draw calls '+Math.max(0,...rows.map(r=>r.calls))+', page errors '+errs.length);
 process.exit(ok?0:1);
})();
