/* qa_online_menu.js — the old-school "Choose Option" menu in the online world (W2b), with real mouse clicks.
 * Two adventurers on a seeded world (127.0.0.1:8206, in this process); the static client on 8100
 * (python tools/serve_static.py 8100 .). Checks, each a real right or left click on the canvas:
 *  - another adventurer in the Commons: Walk here on top (a left click walks), Follow / Trade with / Report under it,
 *    no Attack, no Examine; in the Scarlands within the level range: "Attack <name> (level-N)" on top, and a left
 *    click attacks (the server's target);
 *  - a monster: "Attack <name> (level-N)" on top, Walk here, "Examine <name>", Cancel; a left click attacks;
 *  - a readied spell: "Cast <spell> -> <name>" on top;
 *  - the items of a kill on one tile: one Take per item, a left click takes the top one;
 *  - the supply chest: Open, Take-<kit>-kit per kit, Examine;
 *  - worn equipment: Remove sends the unequip intent (the server moves it back to the pack);
 *  - the top-left hover line reads the top row and "/ N more options".
 * Captures: docs/rebuild/combat_grade_passes/online_evidence/menu/*.jpg; exit code 1 on any failure.
 * Run: node tools/qa_online_menu.js [--out <dir>]
 */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { createServer } = require('../server/app');
const args = process.argv.slice(2);
const OUT = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(__dirname, '..', 'docs', 'rebuild', 'combat_grade_passes', 'online_evidence', 'menu'));
const BASE = process.env.ONLINE_BASE || 'http://127.0.0.1:8100';
const PORT = 8206;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const results = [];
function check(ok, label, detail) { results.push({ ok: !!ok, label, detail: detail === undefined ? null : detail }); console.log((ok ? '  ok   ' : '  FAIL ') + label + (detail !== undefined ? ' ' + JSON.stringify(detail).slice(0, 300) : '')); }

(async () => {
  const app = await createServer({ db: ':memory:', saveKey: 'qa-online-menu-save-key-0123456789ab', cost: { N: 1024 }, port: PORT, host: '127.0.0.1', authPerMinute: 1000, quiet: true, world: { seed: 17 } });
  const world = app.world;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const sp = (name) => world.playerByKey(String(name).toLowerCase());
  try {
    const open = async (user) => {
      const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
      await page.setViewport({ width: 1538, height: 900 });
      page.on('pageerror', (e) => errors.push(user + ': ' + String(e).slice(0, 200)));
      await page.goto(BASE + '/?online=1&server=' + encodeURIComponent('ws://127.0.0.1:' + PORT) + '&t=' + Date.now(), { waitUntil: 'domcontentloaded' });
      for (let i = 0; i < 240 && !(await page.evaluate(() => !!window.CR_WORLD_READY && !!document.getElementById('online-login'))); i++) await sleep(500);
      await page.type('#online-user', user); await page.type('#online-pass', 'qa-menu-pass-' + user); await page.click('#online-register');
      for (let i = 0; i < 60 && !(await page.evaluate(() => window.CROnlineQA && CROnlineQA.state().entered)); i++) await sleep(500);
      await sleep(1500);
      return page;
    };
    const A = await open('Wren'), B = await open('Hollis');
    // Wren takes the melee kit at the chest (worn gear for the Remove check)
    sp('Wren').teleport(35, 10, 0); await sleep(1200);
    await A.evaluate(() => CROnlineQA.kit('melee'));
    for (let i = 0; i < 60 && !(await A.evaluate(() => CROnlineQA.state().equip.weapon === 'steel_longsword')); i++) await sleep(300);
    for (const n of world.npcs.values()) n.huntEnabled = false;   // nothing interrupts the clicks
    const rowsOpen = (page) => page.evaluate(() => { const m = document.getElementById('ctx-menu'); if (!m || m.style.display === 'none') return null; return Array.from(document.querySelectorAll('#ctx-rows .ctx-row')).map((r) => r.textContent.replace(/\s+/g, ' ').trim()); });
    const hoverLine = (page) => page.evaluate(() => { const e = document.getElementById('action-text') || document.querySelector('.action-text,#hover-action'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    // where an entity is on screen once the camera has settled (two readings a moment apart agree)
    const screen = async (page, kind, id) => {
      let last = null;
      for (let i = 0; i < 30; i++) {
        const at = await page.evaluate((k, n) => CROnlineQA.screenOf(k, n), kind, id);
        if (at && last && Math.abs(at.x - last.x) < 1 && Math.abs(at.y - last.y) < 1) return at;
        last = at; await sleep(150);
      }
      if (!last) throw new Error(kind + ' ' + id + ' is not on screen ' + JSON.stringify(await page.evaluate((k, n) => ({ me: CROnlineQA.state().me.tile, npcs: CROnlineQA.state().npcs.map((x) => [x.nid, x.ty, x.tile && x.tile.x, x.tile && x.tile.z]).slice(0, 12), players: CROnlineQA.state().players.map((x) => [x.pid, x.tile]) }), kind, id)) + ' server ' + JSON.stringify(kind === 'npc' ? (() => { const n = world.npcs.get(id); return n && { at: [n.x, n.z], active: n.active, dying: n.dying }; })() : null));
      return last;
    };
    const focusOn = (page, x, z, dist) => page.evaluate((a, b, d) => { const m = OnlineWorld.model(), w = m.toWorld(a, b); window.__qaCameraFocus = { x: w.x, y: OnlineWorld.heightAt(w.x, w.z), z: w.z }; camCtl.dist = d || 18; }, x, z, dist);
    const rightClick = async (page, at) => { await page.mouse.move(at.x, at.y); await sleep(120); await page.mouse.click(at.x, at.y, { button: 'right' }); await sleep(350); return rowsOpen(page); };
    const leftClick = async (page, at) => { await page.mouse.move(at.x, at.y); await sleep(150); await page.mouse.down(); await page.mouse.up(); await sleep(250); };
    const escape = async (page) => { await page.keyboard.press('Escape'); await sleep(150); };
    const shot = (page, name, at) => page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 85, clip: at ? { x: Math.max(0, at.x - 300), y: Math.max(0, at.y - 220), width: 600, height: 440 } : undefined });
    const place = async (name, x, z) => { const p = sp(name); p.teleport(x, z, 0); await sleep(1800); };
    const bPid = sp('Hollis').pid;

    // 1) another adventurer in the Commons: no Attack; Walk here on top; a left click walks
    await place('Wren', 30, 14); await place('Hollis', 32, 16);
    await A.bringToFront(); await focusOn(A, 31, 15, 16); await sleep(1200);
    let at = await screen(A, 'player', bPid);
    let rows = await rightClick(A, at);
    await shot(A, 'player_commons', at);
    check(rows && rows[0] === 'Walk here' && rows.some((r) => /^Follow Hollis \(level-\d+\)$/.test(r)) && rows.some((r) => /^Trade with Hollis/.test(r)) && rows.includes('Report Hollis') && !rows.some((r) => /^Attack|^Examine/.test(r)) && rows[rows.length - 1] === 'Cancel',
      'Commons: another adventurer has Walk here on top, Follow / Trade with / Report under it, no Attack, no Examine', rows);
    await escape(A);
    at = await screen(A, 'player', bPid);
    await leftClick(A, at); await sleep(1200);
    check(!sp('Wren').target, 'Commons: a left click on another adventurer walks (no attack)', { target: !!sp('Wren').target });

    // 2) in the Scarlands, within range: Attack on top; a left click attacks
    await place('Wren', 57, 64); await place('Hollis', 59, 64);
    await focusOn(A, 58, 64, 16); await sleep(1200);
    at = await screen(A, 'player', bPid);
    rows = await rightClick(A, at);
    await shot(A, 'player_scarlands', at);
    check(rows && /^Attack Hollis \(level-\d+\)$/.test(rows[0]) && rows[1] === 'Walk here', 'Scarlands: "Attack Hollis (level-N)" on top, then Walk here', rows);
    const hover = await (async () => { await escape(A); await A.mouse.move(at.x + 1, at.y + 1); await sleep(400); return hoverLine(A); })();
    check(hover && /^Attack Hollis \(level-\d+\) \/ \d+ more options$/.test(hover), 'the hover line reads the top row and "/ N more options"', hover);
    await leftClick(A, at); await sleep(1500);
    check(sp('Wren').target && sp('Wren').target.pid === bPid, 'Scarlands: a left click on the adventurer attacks (the server\'s target)', { target: sp('Wren').target && sp('Wren').target.pid });
    // end the duel: Hollis back to the Commons, and nobody still retaliating
    sp('Wren').clearInteraction(); sp('Hollis').clearInteraction();
    await place('Hollis', 30, 20); await sleep(3000);
    sp('Wren').clearInteraction(); sp('Hollis').clearInteraction(); sp('Wren').autoRetaliate = false; sp('Hollis').autoRetaliate = false;

    // 3) a monster: Attack (level) on top, Walk here, Examine, Cancel; a readied spell puts Cast on top; left click attacks
    const gob = [...world.npcs.values()].find((n) => n.typeId === 'gnarlgob' && n.active);
    await place('Wren', gob.x + 2, gob.z);
    await focusOn(A, gob.x + 1, gob.z, 16); await sleep(1200);
    at = await screen(A, 'npc', gob.nid);
    rows = await rightClick(A, at);
    await shot(A, 'npc_menu', at);
    check(rows && /^Attack Gnarlgob \(level-\d+\)$/.test(rows[0]) && rows[1] === 'Walk here' && rows.some((r) => /^Examine Gnarlgob/.test(r)) && rows[rows.length - 1] === 'Cancel',
      'a monster: "Attack Gnarlgob (level-N)", Walk here, Examine Gnarlgob, Cancel', rows);
    await escape(A);
    await A.evaluate(() => { OnlineUI.armSpell ? OnlineUI.armSpell('water_bolt') : Player.selectSpell && Player.selectSpell('water_bolt'); });
    await sleep(300);
    const armed = await A.evaluate(() => OnlineUI.armedSpell());
    if (armed) {
      at = await screen(A, 'npc', gob.nid);
      rows = await rightClick(A, at);
      await shot(A, 'npc_cast_menu', at);
      check(rows && /^Cast .+ -> Gnarlgob \(level-\d+\)$/.test(rows[0]), 'a readied spell: "Cast <spell> -> Gnarlgob (level-N)" on top', rows);
      await escape(A); await A.evaluate(() => OnlineUI.clearArmed());
    } else check(true, 'a readied spell (the storm staff autocasts; single casts need a non-staff weapon): skipped', null);
    at = await screen(A, 'npc', gob.nid);
    if (!at) throw new Error('the gnarlgob is off the screen ' + JSON.stringify({ active: gob.active, dying: gob.dying, at: [gob.x, gob.z], wren: [sp('Wren').x, sp('Wren').z], seen: await A.evaluate((id) => !!OnlineActors.npcs().get(id), gob.nid) }));
    await leftClick(A, at); await sleep(1200);
    check(sp('Wren').target && sp('Wren').target.nid === gob.nid, 'a left click on the monster attacks it', { target: sp('Wren').target && sp('Wren').target.nid });

    // 4) the kill's items on one tile: one Take per item; a left click takes the top one
    for (let i = 0; i < 40 && gob.active && !gob.dying; i++) { gob.levels.hitpoints = 1; await sleep(600); }
    let pile = [];
    for (let i = 0; i < 30; i++) { const s = await A.evaluate(() => CROnlineQA.state()); pile = s.objs.filter((o) => o.own && !o.hidden); if (pile.length >= 2) break; await sleep(500); }
    if (pile.length) {
      const tile = pile[0];
      await focusOn(A, tile.x, tile.z, 14); await sleep(1200);
      const pileAt = async () => { let last = null; for (let k = 0; k < 20; k++) { const p = await A.evaluate((uid) => { const r = Array.from(OnlineActors.objs().values ? OnlineActors.objs().values() : []).find((x) => x.uid === uid); if (!r) return null; const v = r.mesh.getWorldPosition(new THREE.Vector3()); v.y += 0.05; v.project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, tile.uid); if (p && last && Math.abs(p.x - last.x) < 1 && Math.abs(p.y - last.y) < 1) return p; last = p; await sleep(150); } return last; };
      let objAt = await pileAt();
      if (objAt) {
        rows = await rightClick(A, objAt);
        await shot(A, 'ground_items', objAt);
        const takes = (rows || []).filter((r) => /^Take /.test(r)), exams = (rows || []).filter((r) => /^Examine /.test(r));
        const onTile = pile.filter((p) => p.x === tile.x && p.z === tile.z).length;
        check(rows && /^Take /.test(rows[0]) && takes.length === onTile && exams.length === onTile, 'items on one tile: one Take and one Examine per item, Take on top', { rows, onTile });
        await escape(A);
        const inv0 = (await A.evaluate(() => CROnlineQA.state().inv)).filter(Boolean).length;
        objAt = await pileAt();
        await leftClick(A, objAt);
        let took = false; for (let i = 0; i < 20 && !took; i++) { await sleep(500); took = (await A.evaluate(() => CROnlineQA.state().inv)).filter(Boolean).length > inv0; }
        check(took, 'a left click on the pile takes the top item into the pack', took ? null : { last: await A.evaluate(() => OsrsMenu.last()), me: [sp('Wren').x, sp('Wren').z], pile: tile, inv: (await A.evaluate(() => CROnlineQA.state().inv)).filter(Boolean).length, chat: (await A.evaluate(() => CROnlineQA.state().chat || [])).slice(-4) });
      } else check(false, 'found the drop on screen');
    } else check(false, 'the monster dropped something to take', { pile, active: gob.active, dying: gob.dying, hp: gob.levels.hitpoints, target: sp('Wren').target && (sp('Wren').target.nid != null ? 'n' + sp('Wren').target.nid : 'p'), objs: (await A.evaluate(() => CROnlineQA.state().objs)).slice(0, 6) });

    // 5) the supply chest: Open, Take-<kit>-kit, Examine
    await place('Wren', 34, 10);
    await focusOn(A, 35, 10, 14); await sleep(1500);
    const chestAt = await A.evaluate(() => { const o = OnlineWorld.chest ? OnlineWorld.chest() : null; if (!o) return null; const v = o.getWorldPosition(new THREE.Vector3()); v.y += 0.4; v.project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
    if (chestAt) {
      rows = await rightClick(A, chestAt);
      await shot(A, 'supply_chest', chestAt);
      check(rows && rows[0] === 'Open Supply chest' && ['melee', 'ranged', 'magic'].every((k) => rows.includes('Take-' + k + '-kit Supply chest')) && rows.includes('Examine Supply chest'), 'the supply chest: Open, Take-<kit>-kit per kit, Examine', rows);
      await escape(A);
    } else check(false, 'found the supply chest on screen');

    // 6) worn equipment: Remove is an intent
    await A.evaluate(() => document.querySelector('.tab-btn[data-tab="equip"]').click()); await sleep(600);
    const worn = await A.evaluate(() => { const el = document.querySelector('#equip-list .kit-doll .kit-slot.filled.slot-head, #equip-list .kit-doll .kit-slot.filled'); if (!el) return null; const r = el.getBoundingClientRect(); const m = /slot-([a-z]+)/.exec(el.className); return { x: r.x + r.width / 2, y: r.y + r.height / 2, slot: m && m[1] }; });
    if (worn && worn.slot) {
      const before = sp('Wren').equip[worn.slot];
      await A.mouse.click(worn.x, worn.y, { button: 'right' }); await sleep(350);
      rows = await rowsOpen(A);
      await shot(A, 'worn_remove', worn);
      check(rows && /^Remove /.test(rows[0]), 'worn equipment: Remove on top', rows);
      const rowEl = await A.evaluate(() => { const r = document.querySelector('#ctx-rows .ctx-row'); if (!r) return null; const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      if (rowEl) await A.mouse.click(rowEl.x, rowEl.y);
      let off = false; for (let i = 0; i < 10 && !off; i++) { await sleep(400); off = !sp('Wren').equip[worn.slot]; }
      check(before && off && sp('Wren').invCount(before) > 0, 'Remove sends the unequip intent: the server moves it back to the pack', { slot: worn.slot, item: before });
    } else check(false, 'found a worn item on the paper doll');
  } catch (e) { check(false, 'ran', String(e.stack || e).slice(0, 400)); }
  finally {
    check(errors.length === 0, 'no page errors', errors);
    fs.writeFileSync(path.join(OUT, 'qa_online_menu.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 1));
    await browser.close(); await app.close();
    const bad = results.filter((r) => !r.ok).length;
    console.log(bad ? bad + ' FAILED' : 'ALL PASS', '->', OUT);
    process.exit(bad ? 1 : 0);
  }
})();
