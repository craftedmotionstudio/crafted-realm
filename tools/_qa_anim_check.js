/* _qa_anim_check.js — regression check after the idle-hold changes: freeze
 * swing/block mid-pose on both rigs and capture. Headless, throwaway profile. */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const OUT = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'compare_equipped', '_anim_check');
fs.mkdirSync(OUT, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900, deviceScaleFactor: 3},
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8777/', {waitUntil: 'domcontentloaded', timeout: 60000});
  const t0 = Date.now();
  while (Date.now() - t0 < 180000){
    const s = await page.evaluate(() => {
      const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e : null; };
      const buf = document.getElementById('enter-buffer');
      if (typeof running !== 'undefined' && running && (!buf || buf.style.display === 'none')) return 'ready';
      const b = vis('btn-begin'), p = vis('play-btn'), f = vis('btn-new');
      if (b) b.click(); else if (p){ try{CharCfg._new=false;}catch(e){} p.click(); } else if (f) f.click();
      return 'wait';
    });
    if (s === 'ready') break;
    await sleep(2000);
  }
  await page.waitForFunction('window.GearModels && window.GearModels.ready', {timeout: 60000});
  await page.evaluate(() => {
    window.__qa = {
      equip(id){
        if (!Player.inv.some(s => s && s.id === id)) Player.addItem(id, 1);
        UI.useItem(Player.inv.findIndex(s => s && s.id === id));
      },
      stage(){
        Player.action = null; Player.moveTo = null; Player.target = null;
        player.position.set(130, gy(130, 163), 163);
        player.rotation.y = Math.atan2(camera.position.x - player.position.x,
                                       camera.position.z - player.position.z) + 0.5;
        player.traverse(o => { if (o.isSprite) o.visible = false; });
        camCtl.dist = 9;
      },
    };
    Player.action = null; Player.plane = 0;
    player.position.set(127, gy(127, 160), 160);
    Player.addXp('Attack', 30000); Player.addXp('Defence', 30000);
  });
  await sleep(1200);

  async function shot(name){
    const rect = await page.evaluate(() => {
      const p = player.position.clone(); p.y += 0.85;
      const v = p.project(camera);
      return {x: (v.x*0.5+0.5)*innerWidth - 135, y: (-v.y*0.5+0.5)*innerHeight - 175};
    });
    await page.screenshot({path: path.join(OUT, name + '.png'),
      clip: {x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: 270, height: 330}});
    console.log('shot', name);
  }

  // proc rig: slash swing, block, crush swing, bow at walk
  await page.evaluate(() => { window.__qa.equip('bronze_sword'); window.__qa.equip('wood_shield'); window.__qa.stage();
    player.userData.swinging = true; player.userData.swing = {t: 400, dur: 1000, type: 'slash'}; });
  await sleep(400); await shot('01_proc_slash_swing');
  await page.evaluate(() => { player.userData.swing = null; player.userData.swinging = false;
    window.__qa.stage(); player.userData.block = {t: 500, dur: 1000}; });
  await sleep(400); await shot('02_proc_block');
  await page.evaluate(() => { player.userData.block = null; player.userData.blocking = false;
    window.__qa.equip('hatchet'); window.__qa.stage();
    player.userData.swinging = true; player.userData.swing = {t: 400, dur: 1000, type: 'crush'}; });
  await sleep(400); await shot('03_proc_crush_hatchet');
  await page.evaluate(() => { player.userData.swing = null; player.userData.swinging = false;
    window.__qa.equip('worn_bow'); window.__qa.stage(); orderWalk(127, 160); });
  await sleep(900); await shot('04_proc_walk_bow');
  await sleep(2200);

  // GLB avatar: attack clip mid-pose with sword, tool carry mid-walk
  await page.evaluate(() => new Promise(res => installPlayerGLB(res)));
  await page.waitForFunction('player.userData && player.userData.isPlayerGLB === true', {timeout: 30000});
  await page.evaluate(() => { window.__qa.equip('bronze_sword'); window.__qa.stage();
    const gm = player.userData.gmix;
    if (gm && gm.attack){ gm.attack.reset(); gm.attack.play(); gm.attack.time = 0.28; gm.attack.paused = true; gm.mixer.update(0); } });
  await sleep(400); await shot('05_glb_attack_clip');
  await page.evaluate(() => { const gm = player.userData.gmix; if (gm && gm.attack){ gm.attack.paused = false; gm.attack.stop(); }
    window.__qa.equip('hatchet'); window.__qa.stage(); orderWalk(133, 163); });
  await sleep(900); await shot('06_glb_walk_hatchet');
  await sleep(2000);

  const errs = await page.evaluate(() => (window.SMOKE_ERRORS || []).length);
  console.log('uncaught errors:', errs);
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
