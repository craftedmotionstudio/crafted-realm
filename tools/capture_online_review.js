/* capture_online_review.js — review captures of the online alpha's interface (W2): the login screen, the Commons,
 * the combat tab of each supply-chest kit (the weapon family's own style buttons), the special-attack orb, the
 * kept-on-death view, the Ditch warning, and a player's attack menu seen from a second adventurer.
 * Starts its own seeded world on 127.0.0.1:8204; needs the static dev server (python tools/serve_static.py 8100 .).
 * Run: node tools/capture_online_review.js [--out docs/rebuild/combat_grade_passes/online_evidence/review]
 */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { createServer } = require('../server/app');
const args = process.argv.slice(2);
const OUT = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(__dirname, '..', 'docs', 'rebuild', 'combat_grade_passes', 'online_evidence', 'review'));
const BASE = process.env.ONLINE_BASE || 'http://127.0.0.1:8100';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const app = await createServer({ db: ':memory:', saveKey: 'review-capture-save-key-0123456789ab', cost: { N: 1024 }, port: 8204, host: '127.0.0.1', authPerMinute: 1000, quiet: true, world: { seed: 11 } });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const shot = async (page, name, clip) => page.screenshot(Object.assign({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 85 }, clip ? { clip } : {}));
  try {
    const open = async (user) => {
      const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
      await page.setViewport({ width: 1538, height: 900 });
      await page.goto(BASE + '/?online=1&server=' + encodeURIComponent('ws://127.0.0.1:8204') + '&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 240 && !(await page.evaluate(() => !!window.CR_WORLD_READY && !!document.getElementById('online-login'))); i++) await sleep(500);
      return page;
    };
    const enter = async (page, user) => {
      await page.type('#online-user', user); await page.type('#online-pass', 'review-pass-' + user); await page.click('#online-register');
      for (let i = 0; i < 60 && !(await page.evaluate(() => window.CROnlineQA && CROnlineQA.state().entered)); i++) await sleep(500);
      await sleep(2500);
    };
    const A = await open('Rowan');
    await sleep(1500); await shot(A, 'login');
    await enter(A, 'Rowan');
    await A.bringToFront(); await shot(A, 'commons');
    const panel = { x: 1286, y: 470, width: 252, height: 430 };
    for (const kit of ['melee', 'ranged', 'magic']) {
      await A.evaluate((k) => CROnlineQA.kit(k), kit);
      const want = { melee: 'steel_longsword', ranged: 'gale_longbow', magic: 'storm_staff' }[kit];
      for (let i = 0; i < 80 && !(await A.evaluate((w) => CROnlineQA.state().equip.weapon === w, want)); i++) await sleep(300);
      await A.evaluate(() => document.querySelector('.tab-btn[data-tab="combat"]').click()); await sleep(700);
      await shot(A, 'combat_tab_' + kit, panel);
      await sleep(3500);   // the chest's cooldown
    }
    // the special-attack weapon: switch to the steel sword, show the orb armed
    await A.evaluate((k) => CROnlineQA.kit(k), 'melee'); await sleep(2500);
    await A.evaluate(() => { document.querySelector('.tab-btn[data-tab="inv"]').click(); const i = Player.inv.findIndex((x) => x && x.id === 'steel_sword'); if (i >= 0) document.querySelectorAll('#inv-grid > *')[i].click(); });
    await sleep(1500); await A.evaluate(() => document.getElementById('spec-orb').click()); await sleep(1500);
    await A.evaluate(() => document.querySelector('.tab-btn[data-tab="combat"]').click()); await sleep(600);
    await shot(A, 'spec_orb_armed', { x: 1286, y: 0, width: 252, height: 900 });
    // kept on death
    await A.evaluate(() => { document.querySelector('.tab-btn[data-tab="equip"]').click(); });
    await sleep(500);
    await A.evaluate(() => { const b = Array.from(document.querySelectorAll('#equip-list .kit-btn')).find((x) => /Kept/.test(x.textContent)); if (b) b.click(); });
    await sleep(700); await shot(A, 'kept_on_death', panel);
    // the Ditch warning on the first walk into the Scarlands
    await A.evaluate(() => OnlineMain.walkTile({ x: 32, z: 52 }));
    await sleep(900); await shot(A, 'ditch_warning');
    await A.evaluate(() => { const b = document.getElementById('onl-ditch-go'); if (b) b.click(); });
    // the Ditch and its crossings (our own ground: water in a trench, stone crossings, the warning signs)
    for (const [name, x, z] of [['ditch_crossing_west', 16, 45], ['ditch_crossing_east', 47, 45]]) {
      await A.evaluate((x, z) => { const m = OnlineWorld.model(), w = m.toWorld(x, z); window.__qaCameraFocus = { x: w.x, y: OnlineWorld.heightAt(w.x, w.z), z: w.z }; camCtl.dist = 24; }, x, z);
      await sleep(2500); await shot(A, name);
    }
    await A.evaluate(() => { window.__qaCameraFocus = null; camCtl.dist = 33; });
    // a second adventurer in the Scarlands: the attack menu with the level, seen by the first
    const B = await open('Briar'); await enter(B, 'Briar');
    await B.evaluate(() => CROnlineQA.walk(34, 52));
    for (let i = 0; i < 120; i++) { const ok = await A.evaluate(() => { const s = CROnlineQA.state(); return s.me.tile.z >= 50 && s.players.length > 0 && s.players[0].tile.z >= 50; }); if (ok) break; await sleep(500); }
    await A.bringToFront(); await sleep(1500);
    const pid = await A.evaluate(() => CROnlineQA.state().players[0].pid);
    const at = await A.evaluate((p) => CROnlineQA.screenOf('player', p), pid);
    if (at) { await A.mouse.click(at.x, at.y, { button: 'right' }); await sleep(600); await shot(A, 'attack_menu', { x: Math.max(0, at.x - 260), y: Math.max(0, at.y - 200), width: 520, height: 380 }); }
    console.log('captures ->', OUT, fs.readdirSync(OUT).join(' '));
  } finally { await browser.close(); await app.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
