/* gait_lab_bake.js -- turn the owner's Gait Lab picks into clip data for Blender (owner review 5, round 3).
 * The lab (tools/gait_lab.html) shows every preset with the owner's slider settings applied live; this drives the same page
 * headless and samples the tuned cycle at 30 fps (GaitLab.bake: every bone's glTF-local rotation + the Hips position), so the
 * baked clip is exactly what he saw. The 2004 reference is not needed (and never touched).
 *   SMOKE_BASE=http://127.0.0.1:8121 node tools/gait_lab_bake.js <settings.json | picks.json> <name, e.g. walk_P> [pick index]
 * -> tools/blender/gait_lab_bakes/<name>.json; then `blender -b --python tools/blender/build_holm_characters_v2.py --
 * --gait-options` adds <name> to assets/models/holm_kit_v2_gaits.glb (round-trip checked) and ?gait=walkP plays it. */
'use strict';
const fs=require('fs'),path=require('path'),puppeteer=require('puppeteer-core');
const [,,inFile,name,pickIx]=process.argv;
if(!inFile||!/^(walk|run)_[A-Z][A-Z0-9]*$/.test(name||'')){console.log('usage: node tools/gait_lab_bake.js <settings.json|picks.json> <walk_X|run_X> [pick index]');process.exit(2)}
const doc=JSON.parse(fs.readFileSync(inFile,'utf8'));
const settings=doc.picks?(doc.picks[+(pickIx||0)]||doc.current):(doc.current||doc);
if(!settings||settings.mode!==name.split('_')[0]){console.log('the settings are for',settings&&settings.mode,'but the name is',name);process.exit(2)}
const BASE=process.env.SMOKE_BASE||'http://127.0.0.1:8777';
(async()=>{
  const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:'new',args:['--mute-audio','--no-first-run'],defaultViewport:{width:1300,height:900}});
  try{
    const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
    await page.goto(BASE+'/tools/gait_lab.html?bake=1',{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>window.GaitLab&&GaitLab.ready,{timeout:120000,polling:200});
    const out=await page.evaluate((x,n)=>GaitLab.bake(x,n),settings,name);
    if(errs.length)throw new Error('page errors: '+errs.join(' | '));
    const dir=path.join(__dirname,'blender','gait_lab_bakes');fs.mkdirSync(dir,{recursive:true});
    const f=path.join(dir,name+'.json');fs.writeFileSync(f,JSON.stringify(out));
    console.log('[BAKE]',name,'from',out.source_clip,'sliders',JSON.stringify(settings.sliders||{}),'frames',out.frames,'->',path.relative(path.join(__dirname,'..'),f));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
