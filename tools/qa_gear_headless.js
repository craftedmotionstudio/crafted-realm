/* Headless QA driver: worn-gear v2 (helm + tiers + animations + v02 avatar fits).
 * Drives the REAL game in system Chrome (headless new, CDP) because the
 * claude-in-chrome extension is offline. Same discipline as the interactive
 * runs: snapshot localStorage first, login via the DOM play button, restore
 * the save byte-identical at the end. Screenshots land in ./v02_qa/.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT = path.join(__dirname, 'v02_qa');
fs.mkdirSync(OUT, { recursive: true });
const GAME = 'http://127.0.0.1:8777/';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  // clip around the player's projected screen position
  const rect = await page.evaluate(() => {
    if (typeof player === 'undefined' || !player) return null;
    const p = player.position.clone(); p.y += 1.0;
    const v = p.project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    return { x: Math.max(0, x - 110), y: Math.max(0, y - 125), w: 220, h: 215 };
  });
  const file = path.join(OUT, name + '.png');
  if (rect) await page.screenshot({ path: file, clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h } });
  else await page.screenshot({ path: file });
  console.log('shot', name);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio',
           '--use-angle=swiftshader', '--no-first-run'],
    defaultViewport: { width: 1538, height: 900, deviceScaleFactor: 3 },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e).slice(0, 200)));
  await page.goto(GAME, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // 1) snapshot every save key before touching anything
  await page.waitForFunction('!!localStorage', { timeout: 30000 });
  const backup = await page.evaluate(() => {
    const b = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); b[k] = localStorage.getItem(k); }
    return b;
  });
  fs.writeFileSync(path.join(OUT, 'save_backup.json'), JSON.stringify(backup));
  console.log('save backed up:', Object.keys(backup).join(','));

  // 2) real login flow: DOM clicks only, loop until the world has a player
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const state = await page.evaluate(() => {
      // fresh headless profile: same order the smoke harness drives the real flow
      const vis = id => { const e = document.getElementById(id); return e && e.offsetParent !== null ? e : null; };
      // in-world = the sim's own `running` flag, with the enter fade done (smoke.js contract)
      const buf = document.getElementById('enter-buffer');
      if (typeof running !== 'undefined' && running && (!buf || buf.style.display === 'none')) return 'ready';
      const cont = vis('btn-continue'), fresh = vis('btn-new'), begin = vis('btn-begin'), play = vis('play-btn');
      let hadSave = false; try { hadSave = SaveGame.exists(); } catch (e) {}
      if (begin) { begin.click(); return 'clicked begin'; }
      if (play) { try { CharCfg._new = false; } catch (e) {} play.click(); return 'clicked play'; }
      if (hadSave && cont) { cont.click(); return 'clicked continue'; }
      if (fresh) { fresh.click(); return 'clicked new adventurer'; }
      return 'waiting';
    });
    if (state === 'ready') break;
    if (state !== 'waiting') console.log(state);
    await sleep(2500);
  }
  const booted = await page.evaluate(() => typeof running !== 'undefined' && running && typeof player !== 'undefined' && !!player.userData.parts);
  if (!booted) { console.log('FATAL: game never booted'); await browser.close(); process.exit(1); }
  console.log('booted in', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  await page.waitForFunction('window.GearModels && window.GearModels.ready', { timeout: 60000 });
  console.log('gear templates:', await page.evaluate(() => window.GearModels.status().loaded.join(',')));

  // helpers injected once
  await page.evaluate(() => {
    window.__qa = {
      equip(id) {
        if (!Player.inv.some(s => s && s.id === id)) Player.addItem(id, 1);
        UI.useItem(Player.inv.findIndex(s => s && s.id === id));
        return { w: Player.equip.weapon, h: Player.equip.head, s: Player.equip.shield,
                 mesh: (player.userData.gear && player.userData.gear.weapon && player.userData.gear.weapon.name) ||
                       (player.userData.glbGear && player.userData.glbGear.weapon && player.userData.glbGear.weapon.name) || null,
                 headMesh: (player.userData.gear && player.userData.gear.head && player.userData.gear.head.name) ||
                           (player.userData.glbGear && player.userData.glbGear.head && player.userData.glbGear.head.name) || null };
      },
      face() {
        Player.action = null; Player.moveTo = null;
        if (player.userData) player.userData.path = null;
        player.position.set(130, gy(130, 163), 163);   // open grass, clear of the tree
        player.rotation.y = Math.PI + 0.6;
        player.traverse(o => { if (o.isSprite) o.visible = false; });  // name tag off for closeups
      },
      freezeSwing(type) { player.userData.swinging = true; player.userData.swing = { t: 400, dur: 1000, type: type }; },
      clearSwing() { player.userData.swing = null; player.userData.swinging = false; },
      freezeBlock() { player.userData.block = { t: 500, dur: 1000 }; },
      clearBlock() { player.userData.block = null; player.userData.blocking = false; },
      brighten() {
        if (window.__qaLight) return 'already';
        const lum = scene.fog ? (scene.fog.color.r + scene.fog.color.g + scene.fog.color.b) / 3 : 1;
        if (lum < 0.25) { window.__qaLight = new THREE.AmbientLight(0xfff2dd, 0.75); scene.add(window.__qaLight); return 'lit'; }
        return 'daylight';
      },
    };
    // stable stage: clear ground by the survival wood fence line
    Player.action = null; Player.plane = 0;
    player.position.set(127, gy(127, 160), 160);
    // disposable QA character: meet the real steel/aurel/veyrite requirement gates
    Player.addXp('Attack', 20000); Player.addXp('Defence', 20000);
  });
  console.log('stage light:', await page.evaluate(() => window.__qa.brighten()));
  await sleep(800);

  /* ---- 3) procedural rig: helm + tier matrix + crush/block/walk ---- */
  console.log('equip helm:', JSON.stringify(await page.evaluate(() => window.__qa.equip('bronze_helm'))));
  await page.evaluate(() => window.__qa.face()); await sleep(400);
  await shot(page, '01_proc_bronze_helm');

  for (const [id, name] of [['hatchet', '02_tier_bronze_hatchet'], ['iron_hatchet', '03_tier_iron_hatchet'],
                            ['steel_hatchet', '04_tier_steel_hatchet'], ['bronze_sword', '05_tier_bronze_sword'],
                            ['aurel_sword', '06_tier_aurel_sword'], ['veyrite_sword', '07_tier_veyrite_sword']]) {
    console.log(id, JSON.stringify(await page.evaluate(i => window.__qa.equip(i), id)));
    await page.evaluate(() => window.__qa.face()); await sleep(350);
    await shot(page, name);
  }

  // crush swing with the hatchet (battleaxe/hatchet class carries aCrush)
  await page.evaluate(() => { window.__qa.equip('hatchet'); window.__qa.face(); window.__qa.freezeSwing('crush'); });
  await sleep(400); await shot(page, '08_anim_crush_hatchet');
  await page.evaluate(() => window.__qa.clearSwing());

  // block/guard with sword + shield (blockReact channel owns armL + the shield)
  await page.evaluate(() => { window.__qa.equip('bronze_sword'); window.__qa.equip('wood_shield'); window.__qa.face(); window.__qa.freezeBlock(); });
  await sleep(400); await shot(page, '09_anim_block_sword_shield');
  await page.evaluate(() => window.__qa.clearBlock());

  // real walk: order a short leg and catch a mid-stride frame
  await page.evaluate(() => { orderWalk(124, 160); });
  await sleep(1100); await shot(page, '10_anim_walk_sword_shield');
  await sleep(2500);

  /* ---- 4) v02 GLB avatar: all seven items ---- */
  await page.evaluate(() => new Promise(res => installPlayerGLB(res)));
  await page.waitForFunction('player.userData && player.userData.isPlayerGLB === true', { timeout: 30000 });
  console.log('v02 avatar installed');
  await page.evaluate(() => window.__qa.face());
  await sleep(600);

  const v02 = [['bronze_helm', '11_v02_helm'], ['hatchet', '12_v02_hatchet'], ['pickaxe', '13_v02_pickaxe'],
               ['bronze_sword', '14_v02_sword_shield'], ['bronze_dagger', '15_v02_dagger'],
               ['worn_bow', '16_v02_bow'], ['veyrite_sword', '17_v02_veyrite_sword']];
  for (const [id, name] of v02) {
    console.log(id, JSON.stringify(await page.evaluate(i => window.__qa.equip(i), id)));
    await page.evaluate(() => window.__qa.face()); await sleep(500);
    await shot(page, name);
  }

  // v02 baked attack clip: hold a mid-clip pose so the capture is deterministic
  await page.evaluate(() => {
    window.__qa.equip('bronze_sword');
    const gm = player.userData.gmix;
    if (gm && gm.attack) { gm.attack.reset(); gm.attack.play(); gm.attack.time = 0.28; gm.attack.paused = true; gm.mixer.update(0); }
  });
  await sleep(400); await shot(page, '18_v02_attack_clip');
  await page.evaluate(() => { const gm = player.userData.gmix; if (gm && gm.attack) { gm.attack.paused = false; gm.attack.stop(); } });

  // v02 walk with gear (real walk clip blending)
  await page.evaluate(() => { orderWalk(130, 160); });
  await sleep(1100); await shot(page, '19_v02_walk');
  await sleep(2200);

  /* ---- 5) console error sweep + restore the save byte-identical ---- */
  const errs = await page.evaluate(() => (window.SMOKE_ERRORS || []).length);
  console.log('uncaught errors recorded by the game:', errs);
  await page.evaluate(b => {
    localStorage.clear();
    Object.keys(b).forEach(k => localStorage.setItem(k, b[k]));
    window.onbeforeunload = null;
  }, backup);
  const check = await page.evaluate(() => localStorage.getItem('motionscape_save'));
  console.log('save restored:', check === backup.motionscape_save ? 'BYTE-IDENTICAL' : 'MISMATCH!');
  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('DRIVER ERROR', e); process.exit(1); });
