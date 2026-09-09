/* _qa_iron_dagger.js — headless proof that the batch-1 iron_dagger equips with
 * the modelled gear_dagger mesh (iron tier recolor) on the real game. Fresh
 * throwaway profile; never touches the user's browser or save. */
'use strict';
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900},
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8777/', {waitUntil: 'domcontentloaded', timeout: 60000});

  const t0 = Date.now();
  while (Date.now() - t0 < 180000){
    const state = await page.evaluate(() => {
      const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e : null; };
      const buf = document.getElementById('enter-buffer');
      if (typeof running !== 'undefined' && running && (!buf || buf.style.display === 'none')) return 'ready';
      const begin = vis('btn-begin'), play = vis('play-btn'), fresh = vis('btn-new');
      if (begin){ begin.click(); return 'begin'; }
      if (play){ try { CharCfg._new = false; } catch(e){} play.click(); return 'play'; }
      if (fresh){ fresh.click(); return 'new'; }
      return 'waiting';
    });
    if (state === 'ready') break;
    await sleep(2000);
  }
  await page.waitForFunction('window.GearModels && window.GearModels.ready', {timeout: 60000});

  const res = await page.evaluate(() => {
    Player.addXp('Attack', 500);                       // meet the level-5 gate
    Player.addItem('iron_dagger', 1);
    UI.useItem(Player.inv.findIndex(s => s && s.id === 'iron_dagger'));
    const g = player.userData.gear || player.userData.glbGear || {};
    return {
      equipped: Player.equip.weapon,
      meshName: g.weapon && g.weapon.name || null,
      iconCached: typeof ICONS !== 'undefined' && !!ICONS['iron_dagger'],
      errors: (window.SMOKE_ERRORS || []).length,
    };
  });
  console.log(JSON.stringify(res));
  await browser.close();
  const ok = res.equipped === 'iron_dagger' && /dagger/i.test(res.meshName || '') && res.errors === 0;
  console.log(ok ? 'IRON DAGGER QA PASS' : 'IRON DAGGER QA FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
