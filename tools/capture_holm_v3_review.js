/* Owner review captures for the v3 slice (finish goal, step 3). Framing only: the player is placed and the
 * camera set for each view; functional proof is tools/qa_holm_v3_slice.js (real pointer input).
 * Run: SMOKE_BASE=http://localhost:8088 node tools/capture_holm_v3_review.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const OUT=path.join(__dirname,'..','scratchpad','holm_v3_review');fs.mkdirSync(OUT,{recursive:true});
const BASE=(process.env.SMOKE_BASE||'http://127.0.0.1:8777')+'/?holmV3=1&qaProfile=v3-review-'+Date.now().toString(36);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const VIEWS=[
  {name:'01_arrival_cove',pos:[64.5,112.5],plane:0,yaw:.25,dist:52,pitch:.95},
  {name:'02_guide_house_front',pos:[66.5,104.5],plane:0,yaw:.62,dist:30,pitch:.8},
  {name:'03_guide_house_side',pos:[73.5,101.5],plane:0,yaw:1.9,dist:28,pitch:.75},
  {name:'04_hall_interior',pos:[64.5,97.5],plane:0,yaw:.5,dist:17,pitch:1.1},
  {name:'05_loft',pos:[64.5,96.5],plane:1,yaw:.5,dist:17,pitch:1.15},
  {name:'06_creek_bridge',pos:[49.5,99.5],plane:0,yaw:1.2,dist:24,pitch:.85},
  {name:'07_island_overview',pos:[62.5,90.5],plane:0,yaw:.3,dist:70,pitch:1.2}
];
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex';},{timeout:60000});
  await page.evaluate(()=>document.getElementById('btn-new').click());
  await page.waitForFunction(()=>document.getElementById('login-create').style.display!=='none');
  await page.evaluate(()=>document.getElementById('btn-begin').click());
  await page.waitForFunction(()=>document.getElementById('login-play').style.display!=='none');
  await page.evaluate(()=>{CharCfg._new=false;document.getElementById('play-btn').click();});
  await page.waitForFunction(()=>{if(typeof running==='undefined'||!running)return false;const b=document.getElementById('enter-buffer');return !b||b.style.display==='none';},{timeout:30000});
  await sleep(1500);
  for(const v of VIEWS){
    await page.evaluate(v=>{
      if(v.plane===1)Planes.climbTo({plane:1,x:v.pos[0],z:v.pos[1]});
      else{if(Player.plane)Planes.climbTo({plane:0,x:v.pos[0],z:v.pos[1]});player.position.set(v.pos[0],groundY(v.pos[0],v.pos[1]),v.pos[1]);}
      Player.moveTo=null;Player.path=[];camCtl.yaw=v.yaw;camCtl.dist=v.dist;camCtl.pitch=v.pitch;
      const d=document.getElementById('dialogue-modal');if(d)d.style.display='none';
    },v);
    await sleep(2200);await page.screenshot({path:path.join(OUT,v.name+'.png')});console.log('  captured '+v.name);
  }
  console.log('[V3 REVIEW CAPTURE] '+VIEWS.length+' views, page errors '+errors.length);
  await browser.close();
})().catch(e=>{console.error('CAPTURE ERROR',e.message);process.exitCode=1;});
