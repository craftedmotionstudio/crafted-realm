/* capture_login_v4.js — screenshots of the welcome screen for the login art round (owner 2026-09-26: "our login art
 * should look more like the 2004 login": stone hall, archway, braziers, carved-stone title, stone panel).
 * Every stage of the flow (choose / new adventurer / options / ready / erase-confirm), the title and panel crops,
 * four frames of the brazier fire, and 1280 x 720, 760 x 820 and 390 x 844 layouts. Nothing is saved or erased:
 * stages are shown through LoginOverhaul.setStage.
 * Output: scratchpad/holm_login_v4/<label>/*.png + report.json
 * Run: SMOKE_BASE=http://127.0.0.1:8102 node tools/capture_login_v4.js before|after */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const LABEL=process.argv[2]||'after';
const OUT=path.join(__dirname,'..','scratchpad','holm_login_v4',LABEL);fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
    args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run'],defaultViewport:{width:1538,height:900}});
  const page=await browser.newPage();const errors=[];let bytes=0;const assets={};
  page.on('pageerror',e=>errors.push(String(e).slice(0,300)));
  page.on('response',async r=>{try{const u=r.url();if(/assets\/ui\/login|icons\/ui\/v3\/login|login_/.test(u)){const b=await r.buffer();assets[u.replace(/^.*?\/assets\//,'assets/').replace(/\?.*$/,'')]=b.length;bytes+=b.length}}catch(e){}});
  const shot=(n,clip)=>page.screenshot(Object.assign({path:path.join(OUT,n+'.png')},clip?{clip}:{})).catch(e=>console.log('shot fail',n,e.message));
  const rectOf=(sel,pad)=>page.evaluate((sel,pad)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();if(!r.width)return null;
    const x=Math.max(0,r.x-pad),y=Math.max(0,r.y-pad);return {x,y,width:Math.min(innerWidth-x,r.width+2*pad),height:Math.min(innerHeight-y,r.height+2*pad)}},sel,pad||0);
  const t0=Date.now();
  await page.goto(BASE+'/?qaProfile=loginv4-'+LABEL+'-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>{const w=document.getElementById('welcome-screen');return w&&w.style.display==='flex'},{timeout:90000});
  const shown=Date.now()-t0;
  await sleep(3000);await shot('01_choose');
  const logo=await rectOf('.login-title-wrap',10);if(logo)await shot('06_logo',logo);
  const box=await rectOf('#welcome-box',14);if(box)await shot('07_panel',box);
  // four frames of the left brazier's fire (animation check)
  const fire=await page.evaluate(()=>{const e=document.querySelector('.kit-torch-left,.login-brazier-left');if(!e)return null;const r=e.getBoundingClientRect();
    return {x:Math.max(0,r.x-40),y:Math.max(0,r.y-230),width:Math.min(300,innerWidth),height:Math.min(innerHeight-Math.max(0,r.y-230),520)}});
    if(fire)for(let i=0;i<4;i++){await shot('11_fire_'+i,fire);await sleep(140)}
  const stage=async(id,n,extra)=>{await page.evaluate((id,extra)=>{if(extra==='play'){try{LoginOverhaul.updateProfileSummary({look:{name:'Adventurer'},xp:{Attack:1200},tut:{step:3},inv:[{id:'coins',qty:25}]})}catch(e){}
      document.getElementById('play-welcome').textContent='Welcome back, Adventurer'}LoginOverhaul.setStage(id)},id,extra);await sleep(500);await shot(n);
    const b=await rectOf('#welcome-box',14);if(b)await shot(n+'_panel',b)};
  await stage('login-create','02_create');
  await stage('login-options','03_options');
  await stage('login-play','04_play','play');
  await stage('login-confirm-new','05_confirm');
  await page.evaluate(()=>LoginOverhaul.setStage('login-choose'));await sleep(300);
  for(const [w,h,n] of [[1280,720,'08_1280x720'],[760,820,'09_760x820'],[390,844,'10_390x844']]){await page.setViewport({width:w,height:h});await sleep(1200);await shot(n)}
  const report={label:LABEL,welcomeShownMs:shown,loginAssetBytes:bytes,assets,errors};
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,1));console.log(JSON.stringify(report));
  await browser.close();
})().catch(e=>{console.error('DRIVER ERROR',e);process.exit(1)});
