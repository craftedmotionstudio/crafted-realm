#!/usr/bin/env node
/* Cozy fires (owner review 2026-09-29): before / after frame strips. Headless Chrome (throwaway QA profiles) boots the
 * island twice, once with ?cozyFire=0 (the old flicker and clip speeds: "before") and once as shipped ("after"), and for
 * each subject (a lit-log campfire on the grass by the Guide House; the bakehouse hearth and oven) frames it with the QA
 * camera, hides the HUD, and takes a burst of frames at about 12 per second, while sampling the flame's height (scale.y)
 * every animation frame for 4 s: the trace plots how fast and how far the flame moves. Writes
 * scratchpad/sound_pass/fire/<subject>_<mode>_fNN.jpg, traces.json and the strips fire_strip_<subject>.jpg (the page
 * composes them; no image library needed).
 * Run: SMOKE_BASE=http://127.0.0.1:8261 node tools/capture_cozy_fire.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const {enter}=require('./holm_island_driver_lib');
const OUT=path.join(__dirname,'..','scratchpad','sound_pass','fire');fs.mkdirSync(OUT,{recursive:true});
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const W=960,H=600,N=14,GAP=40;
const HUD_HIDE='#side-panel,#chatbox-frame,#mm-cluster,#hud-rail,#zone-box,#action-text,#holm-intro-note,#hud-tip,#music-menu,#test-travel-toggle,#objective,#build-stamp,.xp-drop,#xp-tracker,#loot-tracker,#hint-arrow{visibility:hidden!important}';
const SUBJECTS={
 // a campfire lit on the grass east of the Guide House's porch (the island's Blender campfire, WORLD.fires)
 campfire:{setup:async page=>page.evaluate(()=>{const want={x:66.5,z:104.5},n=HolmArrivalQA.graphNodes().filter(q=>/land|IslandTerrain/.test(q.surface)).map(q=>[q,Math.hypot(q.x-want.x,q.z-want.z)]).sort((a,b)=>a[1]-b[1]);
   const f0=n[0][0],st=n.find(e=>Math.hypot(e[0].x-f0.x,e[0].z-f0.z)>2.5)[0];HolmArrivalQA.qaPlace(st.id);const f=window.makeCampfire(f0.x,f0.z);f.userData.ttl=900;window.__subj={x:f0.x,y:f.position.y,z:f0.z};
   return {x:f0.x,y:f.position.y,z:f0.z}}),cam:p=>[p.x,p.z,p.y+.4,.6,.42,4.2],
  trace:()=>{const f=(WORLD.fires||[]).find(q=>q.name==='island-campfire')||WORLD.fires[0];return f&&f.userData.flame?f.userData.flame.scale.y:NaN}},
 // the bakehouse hearth and oven (Blender HearthFlicker / OvenFlicker clips)
 hearth:{setup:async page=>page.evaluate(()=>{HolmArrivalQA.qaPlace('b:bakehouse:-4:-3:1');return {x:42.0,y:5.75,z:62.9}}),cam:p=>[p.x,p.z,p.y+.3,Math.PI/2+1.25,.38,4.6],
  trace:()=>{const n=scene.getObjectByName('Kitchen_HearthFlame0');if(!n)return NaN;return n.scale.y}}
};
async function shoot(mode){
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--window-size='+W+','+H,'--hide-scrollbars','--mute-audio','--no-first-run','--use-angle=d3d11','--enable-gpu'],defaultViewport:{width:W,height:H}});
 const res={};
 try{const page=await browser.newPage();
  await page.goto(BASE+'/?qaProfile=cozyfire-'+mode+'-'+Date.now().toString(36)+(mode==='before'?'&cozyFire=0':''),{waitUntil:'load',timeout:120000});await enter(page);
  await page.waitForFunction(()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,{timeout:180000});await sleep(4000);
  for(const name of Object.keys(SUBJECTS)){const S=SUBJECTS[name];const p=await S.setup(page);const c=S.cam(p);
   await page.evaluate((c)=>{HolmArrivalQA.qaView(c[0],c[1],c[2]);camCtl.yaw=c[3];camCtl.pitch=c[4];camCtl.dist=c[5]},c);await sleep(3500);
   await page.evaluate(css=>{let el=document.getElementById('cozy-capture-css');if(!el){el=document.createElement('style');el.id='cozy-capture-css';el.textContent=css;document.head.appendChild(el)}},HUD_HIDE);await sleep(300);
   // the flame's height, every animation frame for 4 s
   const tr=await page.evaluate(src=>new Promise(ok=>{const f=new Function('return ('+src+')()'),t0=performance.now(),out=[];(function step(){const t=performance.now()-t0;out.push([+t.toFixed(1),+(+f()).toFixed(4)]);if(t<4000)requestAnimationFrame(step);else ok(out)})()}),S.trace.toString());
   const frames=[];for(let i=0;i<N;i++){const t=await page.evaluate(()=>performance.now());const file=name+'_'+mode+'_f'+String(i).padStart(2,'0')+'.jpg';
    await page.screenshot({path:path.join(OUT,file),type:'jpeg',quality:85,clip:{x:W/2-180,y:H/2-200,width:360,height:330}});frames.push({file,ms:Math.round(t)});await sleep(GAP)}
   const cz=await page.evaluate(()=>typeof CozyFire!=='undefined'?(({enabled,clipsSlowed,embers,embersSpawned,loopGain})=>({enabled,clipsSlowed,embers,embersSpawned,loopGain}))(CozyFire.status()):null);
   await page.evaluate(()=>{const el=document.getElementById('cozy-capture-css');if(el)el.remove()});
   res[name]={frames,trace:tr,cozy:cz,subject:p}}
 }finally{await browser.close()}
 return res}
function stats(tr){const v=tr.filter(r=>Number.isFinite(r[1]));if(v.length<3)return null;let lo=Infinity,hi=-Infinity,rate=0;for(let i=0;i<v.length;i++){lo=Math.min(lo,v[i][1]);hi=Math.max(hi,v[i][1]);if(i){const dt=(v[i][0]-v[i-1][0])/1000;if(dt>0)rate=Math.max(rate,Math.abs(v[i][1]-v[i-1][1])/dt)}}
 const mean=v.reduce((s,r)=>s+r[1],0)/v.length;let cross=0;for(let i=1;i<v.length;i++)if((v[i-1][1]-mean)*(v[i][1]-mean)<0)cross++;
 return {min:+lo.toFixed(3),max:+hi.toFixed(3),swingPct:+((hi-lo)/2/mean*100).toFixed(1),maxRatePerS:+rate.toFixed(2),crossingsPerS:+(cross/((v[v.length-1][0]-v[0][0])/1000)).toFixed(2),samples:v.length}}
(async()=>{
 const before=await shoot('before'),after=await shoot('after'),summary={};
 for(const name of Object.keys(SUBJECTS))summary[name]={before:stats(before[name].trace),after:stats(after[name].trace),cozyBefore:before[name].cozy,cozyAfter:after[name].cozy};
 fs.writeFileSync(path.join(OUT,'traces.json'),JSON.stringify({summary,before,after},null,1));console.log('[COZY FIRE] '+JSON.stringify(summary));
 // compose the strips in a page (two rows of frames and the two traces)
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-first-run'],defaultViewport:{width:1400,height:900}});
 try{const page=await browser.newPage();
  for(const name of Object.keys(SUBJECTS)){const b64=f=>'data:image/jpeg;base64,'+fs.readFileSync(path.join(OUT,f)).toString('base64');
   const row=(label,r,s)=>'<div class="lab">'+label+(s?'  <i>height swing +-'+s.swingPct+'%, fastest change '+s.maxRatePerS+'/s, '+s.crossingsPerS+' flickers/s</i>':'')+'</div><div class="row">'+r.frames.slice(0,7).map(f=>'<figure><img src="'+b64(f.file)+'"><figcaption>'+(f.ms-r.frames[0].ms)+' ms</figcaption></figure>').join('')+'</div>';
   const html='<html><body style="margin:0;background:#15110c;color:#efe3c8;font:14px Georgia"><div style="padding:10px"><h2 style="margin:4px 0;color:#e0b04a;font-weight:normal">Cozy fires: '+name+' (before: ?cozyFire=0, after: as shipped)</h2>'+
    '<style>.row{display:flex;gap:4px}figure{margin:0}img{width:180px;height:165px;object-fit:cover;display:block}figcaption{font:11px Consolas;color:#b3a383}.lab{margin:8px 0 3px}.lab i{color:#b3a383;font-style:normal;font-size:12px}</style>'+
    row('Before',before[name],summary[name].before)+row('After',after[name],summary[name].after)+'<div class="lab">Flame height over 4 s (orange: before, green: after)</div><canvas id="c" width="1270" height="170" style="background:#0d0a07"></canvas></div>'+
    '<script>const A='+JSON.stringify(before[name].trace)+',B='+JSON.stringify(after[name].trace)+';const c=document.getElementById("c").getContext("2d");const all=A.concat(B).map(r=>r[1]).filter(Number.isFinite);const lo=Math.min(...all),hi=Math.max(...all);'+
    'function line(d,col){c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();d.forEach((r,i)=>{const x=r[0]/4000*1260+5,y=160-(r[1]-lo)/((hi-lo)||1)*150;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}line(A,"#e0a47c");line(B,"#a8d88a")</script></body></html>';
   await page.setContent(html,{waitUntil:'load'});const h=await page.evaluate(()=>document.body.scrollHeight);await page.setViewport({width:1300,height:h});
   await page.screenshot({path:path.join(OUT,'..','fire_strip_'+name+'.jpg'),type:'jpeg',quality:85,fullPage:true})}
 }finally{await browser.close()}
 console.log('[COZY FIRE] strips written to scratchpad/sound_pass/fire_strip_*.jpg');
})().catch(e=>{console.error('[COZY FIRE] FAIL',e&&e.stack||e);process.exit(1)});
