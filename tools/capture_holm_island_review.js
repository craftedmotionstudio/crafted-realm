/* Review captures of the whole island draft (?holmIsland=1) at the gameplay camera: every planned place, the two
 * bridges and three elevated overviews. The camera is framed with HolmArrivalQA.qaView (streams terrain, never moves
 * the adventurer). Screenshots only; this is not a gameplay proof.
 * Run: SMOKE_BASE=http://localhost:8088 node tools/capture_holm_island_review.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_island_review');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmIsland=1&qaProfile=island-review-'+Date.now().toString(36);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'..','docs/rebuild/holm-overhaul/plan.json'),'utf8'));
const bridges=JSON.parse(fs.readFileSync(path.join(__dirname,'..','docs/rebuild/holm-overhaul/island-bridges.json'),'utf8')).bridges;
const views=plan.places.map((p,i)=>({name:String(i+1).padStart(2,'0')+'_'+p.id,x:p.x,z:p.z,yaw:.7,pitch:1.0,dist:24}))
 .concat(bridges.map((b,i)=>({name:'b'+(i+1)+'_'+b.id,x:(b.tiles[0][0]+b.tiles[b.tiles.length-1][0])/2+.5,z:b.tiles[0][1]+.5,yaw:.5,pitch:.9,dist:12})))
 .concat([{name:'o1_south',x:66,z:96,yaw:.3,pitch:1.2,dist:48},{name:'o2_north',x:66,z:48,yaw:.3,pitch:1.2,dist:48},{name:'o3_east',x:108,z:66,yaw:-.6,pitch:1.2,dist:48}]);
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size=1538,900','--mute-audio'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
 await page.goto(BASE,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:60000});
 await page.evaluate(()=>document.getElementById('btn-new').click());
 await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none',{timeout:8000});
 await page.evaluate(()=>(document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
 await page.waitForFunction(()=>(document.getElementById('login-play').style.display!=='none'||(typeof running!=='undefined'&&running)),{timeout:8000});
 await page.evaluate(()=>{try{CharCfg._new=false}catch(e){}if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click()});
 await page.waitForFunction(()=>typeof running!=='undefined'&&running,{timeout:90000});await sleep(4000);
 await page.evaluate(()=>{document.querySelectorAll('#tutorial-banner,.tut-banner').forEach(e=>e.style.display='none')});
 for(const v of views){
  await page.evaluate(v=>{HolmArrivalQA.qaView(v.x,v.z);camCtl.yaw=v.yaw;camCtl.pitch=v.pitch;camCtl.dist=v.dist},v);
  await sleep(3500);await page.screenshot({path:path.join(OUT,v.name+'.png')});console.log('captured',v.name);
 }
 console.log('[ISLAND REVIEW CAPTURE] '+views.length+' views, page errors '+errs.length);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
