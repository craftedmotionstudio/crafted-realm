#!/usr/bin/env node
/* Sound pass QA (owner review 2026-09-29): a fresh adventurer plays the whole Tutor's Holm curriculum with real input
 * (the lesson steps of tools/qa_holm_island_playthrough.js), walks to the ferry and sails, while the page records every
 * sound the game actually plays (SfxLib's play counter, summed across the mid-run reloads), the island director's stroke
 * sync (chop and pick blows on the swing), the beds, and the cozy fires. At the end it checks the real run against the
 * inventory (tools/sfx_inventory.js): which sounds were heard, which were not reached by this route, and that nothing
 * sounded before the first click. Writes scratchpad/sound_pass/qa_sound_pass.json.
 * Run: SMOKE_BASE=http://127.0.0.1:8261 node tools/qa_sound_pass.js */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const L=require('./holm_island_driver_lib');
const PT=require('./qa_holm_island_playthrough');
const INV=require('./sfx_inventory.js');
const {sleep,enter,waitFor,walkTo,closeDialogue}=L;
const OUT=path.join(__dirname,'..','scratchpad','sound_pass');fs.mkdirSync(OUT,{recursive:true});L.setOut(OUT);
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
(async()=>{
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',
  args:['--window-size=1538,900','--hide-scrollbars','--mute-audio','--no-first-run','--autoplay-policy=user-gesture-required'],defaultViewport:{width:1538,height:900}});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e&&e.stack||e).slice(0,300)));
 // the recorder: SfxLib's per-sound counts, summed across reloads (sessionStorage), and the first sound's time vs the first gesture
 await page.evaluateOnNewDocument(()=>{let seen={};window.__firstGesture=null;
  ['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{if(!window.__firstGesture)window.__firstGesture=performance.now()},true));
  setInterval(()=>{try{if(typeof SfxLib==='undefined')return;const by=SfxLib.stats().byId,tot=JSON.parse(sessionStorage.getItem('__sfx')||'{}');
   for(const k in by){const d=by[k]-(seen[k]||0);if(d>0)tot[k]=(tot[k]||0)+d}seen=Object.assign({},by);sessionStorage.setItem('__sfx',JSON.stringify(tot));
   if(!sessionStorage.getItem('__sfxEarly')&&SfxLib.stats().plays>0)sessionStorage.setItem('__sfxEarly',JSON.stringify({firstGestureMs:window.__firstGesture,unlocked:typeof Sfx!=='undefined'&&Sfx.unlocked}));
   if(typeof HolmSound!=='undefined'){const s=HolmSound.status(),best=JSON.parse(sessionStorage.getItem('__holmSound')||'{"strokes":{"chop":0,"mine":0},"beds":{}}');
    best.strokes.chop+=Math.max(0,s.strokes.chop-(window.__hs0?window.__hs0.chop:0));best.strokes.mine+=Math.max(0,s.strokes.mine-(window.__hs0?window.__hs0.mine:0));
    window.__hs0=Object.assign({},s.strokes);for(const k in s.beds)best.beds[k]=Math.max(best.beds[k]||0,s.beds[k]);if(s.lastStroke)best.lastStroke=s.lastStroke;sessionStorage.setItem('__holmSound',JSON.stringify(best))}
   if(typeof CozyFire!=='undefined'){const c=CozyFire.status(),b=JSON.parse(sessionStorage.getItem('__cozy')||'{}');b.clipsSlowed=Math.max(b.clipsSlowed||0,c.clipsSlowed);b.sources=Math.max(b.sources||0,c.sources.length);
    b.embersSpawned=(b.embersSpawned||0)+Math.max(0,c.embersSpawned-(window.__ce||0));window.__ce=c.embersSpawned;b.maxEmbers=Math.max(b.maxEmbers||0,c.embers);b.maxLoopGain=Math.max(b.maxLoopGain||0,c.loopGain);b.maxCampfires=Math.max(b.maxCampfires||0,c.campfires);sessionStorage.setItem('__cozy',JSON.stringify(b))}
  }catch(e){}},250)});
 const t0=Date.now(),per={};let status='incomplete',note='';
 try{
  await page.goto(BASE+'/?qaProfile=soundpass-'+Date.now().toString(36),{waitUntil:'load',timeout:120000});
  const pre=await page.evaluate(()=>({ctx:!!(typeof Sfx!=='undefined'&&Sfx.ctx),plays:typeof SfxLib!=='undefined'?SfxLib.stats().plays:-1}));
  await enter(page);
  await waitFor(page,()=>typeof HolmIslandTutors!=='undefined'&&HolmIslandTutors.tutors().length>=10,null,180000);
  await L.runOrb(page);
  for(let guard=0;guard<30;guard++){const id=await PT.lesson(page);if(id==='complete'){status='complete';break}
   const s=Date.now();console.log('  lesson '+id);try{await PT.DO[id](page)}catch(e){note=id+': '+String(e).slice(0,200)}
   await PT.waitLesson(page,id,20000);per[id]=Math.round((Date.now()-s)/1000);if(await PT.lesson(page)===id){status='stuck';note=note||'stuck at '+id;break}}
  if(status==='complete'){await walkTo(page,'haven','shore',true,[]);await PT.talk(page,'tobin');await closeDialogue(page);await walkTo(page,'haven','boat',false,[]);const dep=await L.boardSkiff(page);if(!dep.sailed)note='ferry did not sail';await sleep(4000)}
  const end=await page.evaluate(()=>({sfx:JSON.parse(sessionStorage.getItem('__sfx')||'{}'),early:JSON.parse(sessionStorage.getItem('__sfxEarly')||'null'),holmSound:JSON.parse(sessionStorage.getItem('__holmSound')||'null'),
   cozy:JSON.parse(sessionStorage.getItem('__cozy')||'null'),ctx:typeof Sfx!=='undefined'&&Sfx.ctx?Sfx.ctx.state:null,bus:typeof Sfx!=='undefined'&&Sfx._master?Sfx._master.__sfxName:null,renders:SfxLib.stats().renders,renderMs:+SfxLib.stats().renderMs.toFixed(1)}));
  const heard=new Set(Object.keys(end.sfx)),rows=INV.map(r=>({group:r.group,event:r.event,status:r.status,sounds:r.sounds.map(s=>({id:s,plays:end.sfx[s]||0}))}));
  const reached=rows.filter(r=>r.sounds.some(s=>s.plays>0)),notReached=rows.filter(r=>!r.sounds.some(s=>s.plays>0));
  const rec={status,note,minutes:+((Date.now()-t0)/60000).toFixed(1),lessons:Object.keys(per).length,perLessonSeconds:per,errors,beforeGesture:pre,audio:{ctx:end.ctx,bus:end.bus,renders:end.renders,renderMs:end.renderMs},
   strokes:end.holmSound,cozy:end.cozy,soundsHeard:heard.size,plays:end.sfx,eventsReached:reached.length,eventsTotal:rows.length,notReachedByThisRoute:notReached.map(r=>r.group+': '+r.event+' ['+r.status+']'),at:new Date().toISOString()};
  fs.writeFileSync(path.join(OUT,'qa_sound_pass.json'),JSON.stringify(rec,null,1));
  console.log('[SOUND QA] '+status+' in '+rec.minutes+' min, lessons '+rec.lessons+'/18, page errors '+errors.length+'; '+heard.size+' distinct sounds heard, '+reached.length+'/'+rows.length+' inventory events reached');
  console.log('[SOUND QA] before the first click: context '+pre.ctx+', plays '+pre.plays+'; strokes on the swing '+JSON.stringify(end.holmSound)+'; fires '+JSON.stringify(end.cozy));
  console.log('[SOUND QA] not reached by this route: '+rec.notReachedByThisRoute.join(' | '));
  process.exitCode=status==='complete'&&!errors.length&&pre.plays===0&&!pre.ctx?0:1;
 }catch(e){console.error('[SOUND QA] driver error',e&&e.stack||e);process.exitCode=1}
 finally{await browser.close()}
})();
