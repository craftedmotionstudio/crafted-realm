#!/usr/bin/env node
/* Render every sound effect offline (sound pass 2026-09-29): the evidence for docs/rebuild/HOLM_SOUND_INVENTORY.md.
 *  1. Node renders each recipe (src/sfx_recipes.js) straight to a 16-bit mono WAV (22.05 kHz; --sr 44100 for full rate):
 *     scratchpad/sound_pass/wav/<id>.wav, and a levels table (peak, rms, audible seconds) to scratchpad/sound_pass/levels.json;
 *  2. headless Chrome opens the sound board in its sheet mode (tools/sound_board.html?sheet=1): a waveform and a spectrogram
 *     of every sound, new and (where one existed) old, the old ones rendered from tools/sfx_legacy.js by an
 *     OfflineAudioContext; the sheet is saved as scratchpad/sound_pass/sheet_<n>.jpg and the old sounds as wav/old/<id>.wav.
 * Needs the game served (SMOKE_BASE, default http://127.0.0.1:8777) for step 2; --no-sheet skips it.
 * Run: SMOKE_BASE=http://127.0.0.1:8261 node tools/render_sfx.js */
'use strict';
const fs=require('fs'),path=require('path');
const L=require('../src/sfx_lib.js');require('../src/sfx_recipes.js');
const OUT=path.join(__dirname,'..','scratchpad','sound_pass'),WAV=path.join(OUT,'wav');
fs.mkdirSync(path.join(WAV,'old'),{recursive:true});
const ai=process.argv.indexOf('--sr'),SR=ai>0?+process.argv[ai+1]:22050,levels={};   // 22.05 kHz keeps the archive small; the sound board plays them at the device rate
for(const id of L.ORDER){const b=L.render(id,SR,0);fs.writeFileSync(path.join(WAV,id+'.wav'),Buffer.from(L.wav(b,SR)));
 const d=L.DEFS[id];levels[id]=Object.assign({cat:d.cat,label:d.label,old:d.old||null,loop:!!d.loop},L.measure(b,SR))}
fs.writeFileSync(path.join(OUT,'levels.json'),JSON.stringify(levels,null,1));
console.log('[RENDER] '+L.ORDER.length+' WAVs -> '+path.relative(process.cwd(),WAV));
if(process.argv.includes('--no-sheet'))process.exit(0);
(async()=>{
 const puppeteer=require('puppeteer-core');
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--no-first-run','--mute-audio','--hide-scrollbars'],defaultViewport:{width:1200,height:900}});
 try{
  const page=await browser.newPage();const base=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
  await page.goto(base+'/tools/sound_board.html?sheet=1&t='+Date.now(),{waitUntil:'load',timeout:60000});
  await page.waitForFunction(()=>window.__sheetDone===true,{timeout:300000});
  const err=await page.evaluate(()=>window.__sheetError||null);if(err)throw new Error(err);
  const sheet=await page.evaluate(()=>window.__sheet);let olds=0;
  for(const id in sheet.olds){fs.writeFileSync(path.join(WAV,'old',id+'.wav'),Buffer.from(sheet.olds[id].wav,'base64'));olds++;levels[id].oldMeasure=sheet.olds[id].measure}
  fs.writeFileSync(path.join(OUT,'levels.json'),JSON.stringify(levels,null,1));
  const H=await page.evaluate(()=>document.getElementById('sheet').getBoundingClientRect().height),step=2600;let n=0;
  for(let y=0;y<H;y+=step){n++;await page.screenshot({path:path.join(OUT,'sheet_'+n+'.jpg'),type:'jpeg',quality:82,clip:{x:0,y:y,width:1200,height:Math.min(step,H-y)},captureBeyondViewport:true})}
  console.log('[RENDER] sheet: '+n+' page(s), '+olds+' old sounds rendered for comparison');
 }finally{await browser.close()}
})().catch(e=>{console.error('[RENDER] FAIL',e&&e.stack||e);process.exit(1)});
