/* World-look captures (2026-09-25 old-school look pass): the same ten camera positions on the island draft
 * (?holmIsland=1, isolated qaProfile) for before/after sheets, plus renderer numbers at each view.
 * The camera is framed with HolmArrivalQA.qaView (streams terrain, never moves the adventurer); the Guide House
 * interior view lifts the house's roof/upper storey the same way the model owner does when you walk in.
 * UI chrome is hidden so the sheet compares the world only. Screenshots only; not a gameplay proof.
 * Run: SMOKE_BASE=http://127.0.0.1:8097 LOOK_TAG=after LOOK_QUERY="&oldschool=1" node tools/capture_holm_look.js
 *   LOOK_TAG   output sub-folder under scratchpad/holm_look_v1/ (default 'capture')
 *   LOOK_QUERY extra URL query (the look switch: &oldschool=0 is the old look, &oldschool=1 the textured one)
 *   LOOK_ONLY  comma list of view names to capture (default all) */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const TAG=process.env.LOOK_TAG||'capture',OUT=path.join(__dirname,'..','scratchpad','holm_look_v1',TAG);fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=look-'+TAG+'-'+Date.now().toString(36)+(process.env.LOOK_QUERY||'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// name, focus x/z, yaw, pitch, distance (camCtl units), interior = lift the Guide House roof
const VIEWS=[
 {name:'01_arrival_landing',x:62,z:114,yaw:.7,pitch:1.0,dist:26},
 {name:'02_guide_house_exterior',x:66,z:101,yaw:.35,pitch:.95,dist:26},
 {name:'03_guide_house_interior',x:66,z:99,yaw:.2,pitch:1.15,dist:20,interior:true},
 {name:'04_survival_camp',x:31,z:84,yaw:.7,pitch:1.0,dist:26},
 {name:'05_timber_bridge',x:46,z:87.5,yaw:.5,pitch:.9,dist:14},
 {name:'06_fishing_spot',x:44.5,z:90.5,yaw:.9,pitch:.95,dist:14},
 {name:'07_bakehouse_court',x:44,z:67,yaw:.7,pitch:1.0,dist:26},
 {name:'08_keep_court',x:87,z:35,yaw:.7,pitch:1.05,dist:30},
 {name:'09_lighthouse_approach',x:119,z:34,yaw:.1,pitch:.8,dist:30},
 {name:'10_hill_panorama',x:74,z:44,yaw:.15,pitch:.65,dist:55}];
const only=process.env.LOOK_ONLY?process.env.LOOK_ONLY.split(','):null;
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--mute-audio','--hide-scrollbars','--no-first-run','--enable-gpu','--ignore-gpu-blocklist','--use-angle=d3d11'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e).slice(0,300)));
 page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,300))});
 const missing=[];page.on('response',r=>{if(r.status()===404)missing.push(r.url().replace(/^https?:\/\/[^/]+/,''))});
 await page.goto(BASE,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:120000});await sleep(5000);
 // world only: hide every DOM layer but the game canvas
 await page.addStyleTag({content:'body *{visibility:hidden !important} #game-canvas{visibility:visible !important}'});
 const rows=[];
 for(const v of VIEWS){
  if(only&&!only.includes(v.name))continue;
  await page.evaluate(v=>{
   HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist;
   const h=scene.getObjectByName('world-object-holm_guide_hall');
   if(h)h.traverse(n=>{if(/^(Roof|Gable|UpperShell|UpperFloor|UpperFurnishing|UpperHearth)/.test(n.name)){if(n.userData.__lookVis===undefined)n.userData.__lookVis=n.visible;n.visible=v.interior?false:n.userData.__lookVis}});
  },v);
  await sleep(4500);
  const stats=await page.evaluate(()=>{const r=typeof CRPerfProbe!=='undefined'?CRPerfProbe.renderStats():null;return r});
  const fps=await page.evaluate(()=>typeof CRPerfProbe!=='undefined'?CRPerfProbe.sample(2):null);
  await page.screenshot({path:path.join(OUT,v.name+'.png')});
  rows.push({view:v.name,calls:stats&&stats.calls,triangles:stats&&stats.triangles,textures:stats&&stats.textures,programs:stats&&stats.programs,fps:fps&&fps.fps,worstMs:fps&&fps.worstMs});
  console.log('captured',v.name,JSON.stringify(rows[rows.length-1]));
 }
 const look=await page.evaluate(()=>typeof HolmOldschoolLook!=='undefined'?HolmOldschoolLook.snapshot():{look:'none'});
 fs.writeFileSync(path.join(OUT,'perf.json'),JSON.stringify({tag:TAG,url:BASE,look,views:rows,pageErrors:errs,missing},null,1));
 if(missing.length)console.log('404: '+missing.join(', '));
 console.log('[LOOK CAPTURE] '+rows.length+' views, page errors '+errs.length+(errs.length?'\n'+errs.slice(0,8).join('\n'):''));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
