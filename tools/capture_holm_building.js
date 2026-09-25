/* Capture in-game comparison shots of a Tutor's Holm building (headless Chrome, real game).
 * Usage: node tools/capture_holm_building.js <buildingId> <outDir> <exteriorX,Z,yaw,pitch,dist> <interiorX,Z,yaw,pitch,dist>
 * Example: node tools/capture_holm_building.js holm_guide_hall scratchpad/guide_hall_v7 151.5,178.5,0,0.95,44 151.5,160.5,0,1.05,30
 * Writes <outDir>/<buildingId>_exterior_ingame.png and <buildingId>_interior_ingame.png at 1538x900.
 */
'use strict';
const path = require('path');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [,, buildingId, outDir, extSpec, intSpec] = process.argv;
if (!buildingId || !outDir || !extSpec || !intSpec){ console.error('usage: node tools/capture_holm_building.js <buildingId> <outDir> <x,z,yaw,pitch,dist> <x,z,yaw,pitch,dist>'); process.exit(1); }
const parse = s => { const [x, z, yaw, pitch, dist] = s.split(',').map(Number); return {x, z, yaw, pitch, dist}; };
const ext = parse(extSpec), inn = parse(intSpec);
const PROFILE = 'fable-capture-' + Date.now().toString(36);

async function login(page){
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 120000, polling: 1000});
  await page.waitForFunction(() => typeof WorldV2Warmup === 'undefined' || WorldV2Warmup.snapshot().deferred !== 'pending', {timeout: 300000, polling: 1000});
  await page.evaluate(() => document.getElementById('btn-new').click());
  await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => (document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
  await page.waitForFunction(() => (document.getElementById('login-play').style.display !== 'none'||(typeof running!=='undefined'&&running)), {timeout: 8000});
  await page.evaluate(() => { try { CharCfg._new = false; } catch (e) {} if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click(); });
  await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
  await sleep(1500);
  await page.evaluate(() => { let el = document.getElementById('login-play'); while (el && el !== document.body){ if (getComputedStyle(el).position === 'fixed' || el.id === 'welcome-screen'){ el.style.display = 'none'; break; } el = el.parentElement; } });
}
async function view(page, spec, file){
  await page.evaluate(s => { Planes.climbTo({plane: 0, x: s.x, z: s.z, zone: "Tutor's Holm"}); }, spec);
  await sleep(2500);
  await page.evaluate(s => { camCtl.yaw = s.yaw; camCtl.pitch = s.pitch; camCtl.dist = s.dist; }, spec);
  await sleep(2200);
  // hide HUD chrome so the sheet shows the building, not the interface
  await page.evaluate(() => { document.querySelectorAll('body > *').forEach(e => { if (e.id !== 'game-canvas' && e.tagName !== 'CANVAS' && e.tagName !== 'SCRIPT') e.style.visibility = 'hidden'; }); });
  await sleep(300);
  await page.screenshot({path: file});
  await page.evaluate(() => { document.querySelectorAll('body > *').forEach(e => { e.style.visibility = ''; }); });
}
(async () => {
  const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'], defaultViewport: {width: 1538, height: 900}});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8777/?qaProfile=' + PROFILE + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  await login(page);
  const outExt = path.resolve(outDir, buildingId + '_exterior_ingame.png');
  const outInt = path.resolve(outDir, buildingId + '_interior_ingame.png');
  await view(page, ext, outExt);
  await view(page, inn, outInt);
  const roofOff = await page.evaluate(id => { const it = (WORLD.interiors || []).find(i => i.buildingId === id); return it ? !it.roof.visible : null; }, buildingId);
  console.log('[CAPTURE] ' + outExt + ' | ' + outInt + ' | interior roof off: ' + roofOff + ' | errors ' + errors.length);
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
