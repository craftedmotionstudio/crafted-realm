/* _probe_glb_grip.js — empirical probe: on the GLB avatar, equip hatchet/staff/
 * sword and print the WORLD direction of each mesh's local +Y (the canonical
 * blade/handle axis) plus the bbox-longest axis the fit solver picked.
 * Headless, throwaway profile. */
'use strict';
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1200,800', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1200, height: 800},
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8777/', {waitUntil: 'domcontentloaded', timeout: 60000});
  const t0 = Date.now();
  while (Date.now() - t0 < 180000){
    const s = await page.evaluate(() => {
      const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e : null; };
      const buf = document.getElementById('enter-buffer');
      if (typeof running !== 'undefined' && running && (!buf || buf.style.display === 'none')) return 'ready';
      const b = vis('btn-begin'), p = vis('play-btn'), f = vis('btn-new');
      if (b){ b.click(); } else if (p){ try{CharCfg._new=false;}catch(e){} p.click(); } else if (f){ f.click(); }
      return 'wait';
    });
    if (s === 'ready') break;
    await sleep(2000);
  }
  await page.waitForFunction('window.GearModels && window.GearModels.ready', {timeout: 60000});
  await page.evaluate(() => new Promise(res => installPlayerGLB(res)));
  await page.waitForFunction('player.userData && player.userData.isPlayerGLB === true', {timeout: 30000});
  await sleep(500);

  const out = await page.evaluate(() => {
    const report = {};
    for (const id of ['hatchet', 'apprentice_staff', 'bronze_sword', 'pickaxe']){
      for (const k in Player.equip) Player.equip[k] = null;
      if (!Player.inv.some(s => s && s.id === id)) Player.addItem(id, 1);
      Player.addXp('Attack', 30000); Player.addXp('Magic', 30000);
      UI.useItem(Player.inv.findIndex(s => s && s.id === id));
      player.updateMatrixWorld(true);
      const m = player.userData.glbGear && player.userData.glbGear.weapon;
      if (!m){ report[id] = 'NO MESH'; continue; }
      const o = m.localToWorld(new THREE.Vector3(0, 0, 0));
      const tipY = m.localToWorld(new THREE.Vector3(0, 1, 0)).sub(o).normalize();
      const tipX = m.localToWorld(new THREE.Vector3(1, 0, 0)).sub(o.clone()).normalize();
      // player facing for reference
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion);
      report[id] = {
        meshName: m.name,
        localYworld: {x: +tipY.x.toFixed(2), y: +tipY.y.toFixed(2), z: +tipY.z.toFixed(2)},
        localXworld: {x: +tipX.x.toFixed(2), y: +tipX.y.toFixed(2), z: +tipX.z.toFixed(2)},
        playerFwd: {x: +fwd.x.toFixed(2), y: +fwd.y.toFixed(2), z: +fwd.z.toFixed(2)},
      };
    }
    return report;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
