/* Tutor's Holm route pacing audit (headless Chrome, real game).
 * Walks every leg of the required route between the authored station tiles (staged inside the chunk residency
 * radius), recording planned tiles, elapsed seconds, run energy and back-tracking for each leg. Writes
 * scratchpad/holm_full_route/pacing.json and prints a table. Run: node tools/audit_holm_route_pacing.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const OUT = path.join(__dirname, '..', 'scratchpad', 'holm_full_route');
fs.mkdirSync(OUT, {recursive: true});
const PROFILE = 'fable-pacing-' + Date.now().toString(36);
const URL = 'http://127.0.0.1:8777/?qaProfile=' + PROFILE;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function login(page){
  await page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 60000});
  await page.evaluate(() => document.getElementById('btn-new').click());
  await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
  await page.evaluate(() => (document.getElementById('btn-begin').click(),(()=>{try{CharCfg._new=false}catch(e){}})()));
  await page.waitForFunction(() => (document.getElementById('login-play').style.display !== 'none'||(typeof running!=='undefined'&&running)), {timeout: 8000});
  await page.evaluate(() => { try { CharCfg._new = false; } catch (e) {} if(!(typeof running!=='undefined'&&running))document.getElementById('play-btn').click(); });
  await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
  await sleep(1500);
}
/* One stage: order the walk, capture the planned tile count, wait for arrival, return tiles + seconds. */
async function stage(page, x, z){
  const t0 = Date.now();
  const tiles = await page.evaluate((x, z) => { minimapWalkTo({x, z}); return (Player.path || []).length; }, x, z);
  await page.waitForFunction(() => !Player.moveTo, {timeout: 90000}).catch(() => {});
  const s = await page.evaluate(() => ({pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], energy: Math.round(Player.energy), run: !!Player.runOn}));
  return {tiles, seconds: +((Date.now() - t0) / 1000).toFixed(1), pos: s.pos, energy: s.energy, run: s.run};
}
async function leg(page, name, points, opts){
  const stages = [];
  for (const [x, z] of points) stages.push(await stage(page, x, z));
  const tiles = stages.reduce((n, s) => n + s.tiles, 0), seconds = +stages.reduce((n, s) => n + s.seconds, 0).toFixed(1);
  const row = {name, tiles, seconds, stages, end: stages[stages.length - 1].pos, energyEnd: stages[stages.length - 1].energy, note: (opts && opts.note) || ''};
  console.log(`  ${name.padEnd(46)} ${String(tiles).padStart(4)} tiles ${String(seconds).padStart(6)} s  energy ${row.energyEnd}%  end ${row.end}`);
  return row;
}

(async () => {
  const browser = await puppeteer.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'], defaultViewport: {width: 1538, height: 900}});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(URL + '&boot=' + Date.now(), {waitUntil: 'domcontentloaded', timeout: 60000});
  await login(page);
  const legs = [];
  legs.push(await leg(page, 'L1 arrival apron -> relief chart tile', [[151.5, 157.5]]));
  legs.push(await leg(page, 'L2 chart -> marked tree (via teaching door)', [[151.5, 145.5], [134.5, 147.5], [134.5, 157.5], [125.5, 159.5]]));
  legs.push(await leg(page, 'L3 tree -> fishing dock', [[131.5, 152.5]]));
  legs.push(await leg(page, 'L4 dock -> gatehouse winch tile', [[128.5, 146.5], [128.5, 137.5], [128.5, 126.5], [124.5, 118.5]]));
  await page.evaluate(() => HolmMineGatehouse.descend());
  await page.waitForFunction(() => (Player.plane || 0) === -1, {timeout: 20000}).catch(() => {});
  await sleep(1500);
  legs.push(await leg(page, 'L5 cavern entry -> copper rock', [[294.5, 355.5]]));
  legs.push(await leg(page, 'L6 copper -> tin (offshoot)', [[300.5, 366.5], [303.5, 375.5]]));
  legs.push(await leg(page, 'L7 tin -> furnace', [[304.5, 361.5]]));
  legs.push(await leg(page, 'L8 furnace -> anvil -> exit ladder', [[301.5, 361.5], [321.5, 355.5]]));
  await page.evaluate(() => { const l = (WORLD.clickables || []).find(o => o.userData && o.userData.kind === 'climb' && /Cavern exit/.test(String(o.userData.label || ''))); handleClick(l, l.position); });
  await page.waitForFunction(() => (Player.plane || 0) === 0, {timeout: 30000}).catch(() => {});
  await sleep(2500);
  legs.push(await leg(page, 'L9 hall tower -> bank booth tile', [[169.5, 121.5], [164.5, 118.5], [157.5, 122.5], [154.5, 117.5]]));
  legs.push(await leg(page, 'L10 bank -> Lastlight door step (switchback)', [[158.5, 128.5], [158.5, 142.5], [184.5, 142.5], [184.5, 135.5], [184.5, 128.5], [205.5, 128.5], [205.5, 123.5], [196.5, 125.5]]));
  legs.push(await leg(page, 'L11 summit -> Departure Dock (via tower road)', [[205.5, 123.5], [205.5, 128.5], [184.5, 128.5], [184.5, 135.5], [186.5, 140.5], [193.5, 150.5], [206.5, 151.5]]));
  legs.push(await leg(page, 'O1 dock road -> Teaching Kitchen door (optional)', [[193.5, 150.5], [184.5, 143.5], [158.5, 142.5], [148.5, 143.5], [144.5, 135.6], [150.5, 135.6]], {note: 'optional detour measured from the dock; on the natural route the kitchen sits between the wood and the gatehouse'}));
  legs.push(await leg(page, 'O2 kitchen -> Quest Lodge board tile (optional)', [[144.5, 135.6], [141.2, 134.5], [137.5, 133.5]]));
  const total = legs.filter(l => /^L/.test(l.name)).reduce((n, l) => n + l.seconds, 0);
  const totalTiles = legs.filter(l => /^L/.test(l.name)).reduce((n, l) => n + l.tiles, 0);
  const over = legs.filter(l => /^L/.test(l.name) && l.seconds > 45).map(l => l.name);
  const result = {profile: PROFILE, legs, requiredTotalSeconds: +total.toFixed(1), requiredTotalTiles: totalTiles, over45: over, errors};
  fs.writeFileSync(path.join(OUT, 'pacing.json'), JSON.stringify(result, null, 2));
  console.log(`[PACING] required legs ${totalTiles} tiles, ${total.toFixed(0)} s walking at bot pace; over 45 s: ${over.length ? over.join('; ') : 'none'}; errors ${errors.length}`);
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
