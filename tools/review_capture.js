/* review_capture.js — two-model gear review, capture stage (GLB AVATAR ONLY —
 * owner decision 2026-07-17: procedural player rigs are out of the game).
 * For one item id: equip on the v02 GLB avatar in the real game and save
 *   reviews/<id>/full_front.png   3/4 front full body (camera-facing)
 *   reviews/<id>/full_side.png    side profile
 *   reviews/<id>/item_zoom.png    TIGHT crop of the gear mesh itself (projected
 *                                 bbox of the attached mesh, padded, dsf 4)
 * Run: node tools/review_capture.js <item_id>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const id = process.argv[2];
if (!id){ console.error('usage: node tools/review_capture.js <item_id>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'reviews', id);
fs.mkdirSync(OUT, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'],
    defaultViewport: {width: 1538, height: 900, deviceScaleFactor: 4},
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
  await page.goto('http://127.0.0.1:8777/', {waitUntil: 'domcontentloaded', timeout: 60000});
  const t0 = Date.now();
  while (Date.now() - t0 < 180000){
    const s = await page.evaluate(() => {
      const vis = i => { const e = document.getElementById(i); return e && e.offsetParent !== null ? e : null; };
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
  await page.evaluate(() => new Promise(res => installPlayerGLB(res)));
  await page.waitForFunction('player.userData && player.userData.isPlayerGLB === true', {timeout: 30000});

  await page.evaluate(id => {
    for (const sk of ['Attack','Defence','Strength','Ranged','Magic','Prayer']) Player.addXp(sk, 30000);
    for (const k in Player.equip) Player.equip[k] = null;
    if (!Player.inv.some(s => s && s.id === id)) Player.addItem(id, 1);
    UI.useItem(Player.inv.findIndex(s => s && s.id === id));
    Player.action = null; Player.moveTo = null; Player.target = null;
    player.position.set(130, gy(130, 163), 163);
    player.traverse(o => { if (o.isSprite) o.visible = false; });
    camCtl.dist = 8;
  }, id);
  await sleep(1400);

  async function faceAndShot(name, extraYaw, clipMode){
    await page.evaluate(y => {
      player.rotation.y = Math.atan2(camera.position.x - player.position.x,
                                     camera.position.z - player.position.z) + y;
    }, extraYaw);
    await sleep(350);
    const rect = await page.evaluate(mode => {
      if (mode === 'item'){
        const g = player.userData.glbGear || {};
        const m = g.weapon || g.head || g.shield || g.amulet || g.bodyPlate || g.skirt ||
                  g.LeftUpLeg || g.LeftHand_glove || g.LeftFoot_boot || g.cape;
        if (m){
          const box = new THREE.Box3().setFromObject(m);
          const pts = [];
          for (const xi of [box.min.x, box.max.x]) for (const yi of [box.min.y, box.max.y])
            for (const zi of [box.min.z, box.max.z]){
              const v = new THREE.Vector3(xi, yi, zi).project(camera);
              pts.push([(v.x*0.5+0.5)*innerWidth, (-v.y*0.5+0.5)*innerHeight]);
            }
          const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
          const pad = 30;
          const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
          const w = Math.max(...xs) - Math.min(...xs) + pad*2, h = Math.max(...ys) - Math.min(...ys) + pad*2;
          const s = Math.max(w, h);       // square-ish crop
          return {x: Math.max(0, x0 - (s-w)/2), y: Math.max(0, y0 - (s-h)/2), w: s, h: s};
        }
      }
      const p = player.position.clone(); p.y += 0.85;
      const v = p.project(camera);
      return {x: (v.x*0.5+0.5)*innerWidth - 140, y: (-v.y*0.5+0.5)*innerHeight - 180, w: 280, h: 340};
    }, clipMode);
    await page.screenshot({path: path.join(OUT, name),
      clip: {x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.w, height: rect.h}});
    console.log('shot', name);
  }

  await faceAndShot('full_front.png', 0.5, 'body');
  await faceAndShot('full_side.png', Math.PI/2, 'body');
  // item zoom from the side profile, where held gear presents fully
  await faceAndShot('item_zoom.png', Math.PI/2, 'item');

  const info = await page.evaluate(() => {
    const g = player.userData.glbGear || {};
    const m = g.weapon || g.head || g.shield || g.amulet || g.bodyPlate;
    if (!m) return {mesh: null};
    const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
    const av = new THREE.Box3().setFromObject(player).getSize(new THREE.Vector3());
    return {mesh: m.name || '(group)', itemSize: {x:+s.x.toFixed(3), y:+s.y.toFixed(3), z:+s.z.toFixed(3)},
            avatarHeight: +av.y.toFixed(3), errors: (window.SMOKE_ERRORS||[]).length};
  });
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info));
  await browser.close();
})().catch(e => { console.error('DRIVER ERROR', e.message); process.exit(1); });
