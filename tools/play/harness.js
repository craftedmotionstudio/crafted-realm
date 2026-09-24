/* tools/play/harness.js — a player's hands and eyes for Crafted Realm (headless Chrome, real input).
 *
 * The playtest agents drive the REAL game through this: every action goes through the game's own
 * mouse handlers (canvas mousedown/mouseup picks, real clicks on pack slots, dialogue buttons and
 * context-menu rows). Nothing here teleports, grants items, or advances the tutorial directly; the
 * only engine reads are "what a player can see" (objective text, chat, pack, position) and a pixel
 * scan that finds where an on-screen object is so the click lands like a player's would.
 *
 *   const {Player} = require('./harness');
 *   const p = await Player.launch({port: 8777, profile: 'tester-a', out: 'scratchpad/playtest/a'});
 *   await p.login();
 *   const view = await p.see();        // objective, arrow label, chat tail, pack, nearby clickables
 *   await p.walkTo(151.5, 157.5);      // real ground clicks toward a tile (or the object it sits on)
 *   await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_orientation')");
 *   await p.rightClickObject(...); await p.chooseRow('Climb-down');
 *   await p.clickInventory('hatchet'); await p.useItemOn('fishing_net', finder);
 *   await p.screenshot('01-arrival'); await p.note('F', 'high', 'what happened');
 *   await p.close();
 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

class Player {
  static async launch(opts){
    opts = opts || {};
    const p = new Player();
    p.port = opts.port || 8777;
    p.profile = (opts.profile || 'tester') + '-' + Date.now().toString(36);
    p.out = path.resolve(opts.out || path.join('scratchpad', 'playtest', opts.profile || 'tester'));
    fs.mkdirSync(p.out, {recursive: true});
    p.findings = [];
    p.log = [];
    p.t0 = Date.now();
    p.browser = await puppeteer.launch({executablePath: CHROME, headless: 'new',
      args: ['--window-size=1538,900', '--hide-scrollbars', '--mute-audio', '--no-first-run'], defaultViewport: {width: 1538, height: 900}});
    p.page = await p.browser.newPage();
    p.errors = [];
    p.page.on('pageerror', e => p.errors.push({t: p.elapsed(), msg: String(e).slice(0, 300)}));
    p.page.on('console', m => { if (m.type() === 'error') p.errors.push({t: p.elapsed(), msg: 'console: ' + m.text().slice(0, 300)}); });
    await p.page.goto(`http://127.0.0.1:${p.port}/?qaProfile=${p.profile}&boot=${Date.now()}`, {waitUntil: 'domcontentloaded', timeout: 60000});
    return p;
  }
  elapsed(){ return +((Date.now() - this.t0) / 1000).toFixed(1); }
  async close(){ try { await this.browser.close(); } catch (e) {} }

  /* ---- the login flow, as a new adventurer (real DOM clicks on the welcome screen) ---- */
  async login(){
    const page = this.page;
    const welcome = () => page.waitForFunction(() => { const w = document.getElementById('welcome-screen'); return w && w.style.display === 'flex'; }, {timeout: 120000, polling: 1000});
    try { await welcome(); }
    catch (e) {
      this.logLine('boot-retry', {reason: 'welcome screen not shown in 120 s; reloading once'});
      await page.goto(`http://127.0.0.1:${this.port}/?qaProfile=${this.profile}&boot=${Date.now()}`, {waitUntil: 'domcontentloaded', timeout: 60000});
      await welcome();
    }
    await page.waitForFunction(() => typeof WorldV2Warmup === 'undefined' || WorldV2Warmup.snapshot().deferred !== 'pending', {timeout: 300000, polling: 1000});
    this.bootMs = await page.evaluate(() => Math.round(performance.now()));
    await page.click('#btn-new');
    await page.waitForFunction(() => document.getElementById('login-create').style.display !== 'none', {timeout: 8000});
    await page.click('#btn-begin');
    await page.waitForFunction(() => document.getElementById('login-play').style.display !== 'none', {timeout: 8000});
    await page.click('#play-btn');
    await page.waitForFunction(() => { if (typeof running === 'undefined' || !running) return false; const b = document.getElementById('enter-buffer'); return !b || b.style.display === 'none'; }, {timeout: 30000});
    await sleep(1200);
    // a brand-new adventurer is offered the design panel; keep the default look like a hurried player would
    const kept = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /keep default look/i.test(x.textContent)); if (b){ b.click(); return true; } return false; });
    await sleep(400);
    this.logLine('login', {bootMs: this.bootMs, keptDefaultLook: kept});
    return true;
  }

  /* ---- eyes ---- */
  async see(){
    const view = await this.page.evaluate(() => {
      const text = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
      const chat = [...document.querySelectorAll('#chatbox > *')].slice(-8).map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const rect = renderer.domElement.getBoundingClientRect();
      const near = [];
      for (const o of (WORLD.clickables || [])){
        if (!o.userData || !o.userData.kind) continue;
        let vis = true; for (let q = o; q; q = q.parent) if (!q.visible){ vis = false; break; }
        if (!vis) continue;
        const c = o.getWorldPosition(new THREE.Vector3());
        const d = Math.hypot(c.x - player.position.x, c.z - player.position.z);
        if (d > 26) continue;
        const pr = c.clone().project(camera);
        const onScreen = pr.z < 1 && Math.abs(pr.x) <= 1 && Math.abs(pr.y) <= 1;
        near.push({kind: o.userData.kind, label: String(o.userData.label || o.userData.name || '').replace(/<[^>]+>/g, ''), name: o.name || '',
          tile: [Math.floor(c.x), Math.floor(c.z)], dist: +d.toFixed(1), onScreen,
          screen: onScreen ? [Math.round((pr.x + 1) / 2 * rect.width), Math.round((1 - pr.y) / 2 * rect.height)] : null});
      }
      near.sort((a, b) => a.dist - b.dist);
      const arrow = (typeof GuideArrow !== 'undefined' && GuideArrow._shown) ? {label: GuideArrow._shown.label, target: GuideArrow._shown.spec && (GuideArrow._shown.spec.mesh ? [Math.floor(GuideArrow._shown.spec.mesh.position.x), Math.floor(GuideArrow._shown.spec.mesh.position.z)] : [Math.floor(GuideArrow._shown.spec.x), Math.floor(GuideArrow._shown.spec.z)]), edgeArrowVisible: !!(document.getElementById('guide-edge-arrow') && document.getElementById('guide-edge-arrow').style.display === 'block')} : null;
      const dlg = document.getElementById('dialogue-modal');
      return {
        objective: text('obj-text'), objectiveVisible: !!(document.getElementById('objective') && document.getElementById('objective').style.display !== 'none'),
        stepId: (typeof Tutorial !== 'undefined' && Tutorial.steps && Tutorial.steps[Tutorial.step]) ? Tutorial.steps[Tutorial.step].id : null,
        step: typeof Tutorial !== 'undefined' ? Tutorial.step : null, tutorialComplete: typeof Tutorial !== 'undefined' ? !!Tutorial.complete : null,
        zone: text('zone-label'), pos: [+player.position.x.toFixed(1), +player.position.z.toFixed(1)], plane: Player.plane || 0,
        hp: Player.hp, energy: Math.round(Player.energy), running: !!Player.runOn, moving: !!Player.moveTo,
        pack: (Player.inv || []).filter(Boolean).map(s => s.id + (s.qty > 1 ? ' x' + s.qty : '')),
        weapon: Player.equip && Player.equip.weapon, usingItem: Player.usingItem || null,
        arrow, chat, dialogue: dlg && dlg.style.display === 'block' ? {name: text('dlg-name'), text: text('dlg-text'), options: [...document.querySelectorAll('#dlg-opts button')].map(b => b.textContent.trim())} : null,
        ctxOpen: !!(document.getElementById('ctx-menu') && document.getElementById('ctx-menu').style.display === 'block'),
        provider: typeof CRWorldMode !== 'undefined' ? CRWorldMode.providerId : null, nearby: near.slice(0, 14),
        camera: {yaw: +camCtl.yaw.toFixed(2), pitch: +camCtl.pitch.toFixed(2), dist: camCtl.dist},
      };
    });
    view.t = this.elapsed();
    return view;
  }
  async screenshot(name){
    const file = path.join(this.out, `${String(this.log.length).padStart(3, '0')}-${name}.png`);
    await this.page.screenshot({path: file}).catch(() => {});
    return file;
  }
  logLine(action, detail){ this.log.push({t: this.elapsed(), action, detail}); }
  /* A finding: id prefix, severity (critical/high/medium/low), what happened, what a player expected. */
  async note(severity, where, observation, expectation){
    const shot = await this.screenshot('finding-' + (this.findings.length + 1));
    this.findings.push({id: 'P-' + String(this.findings.length + 1).padStart(2, '0'), t: this.elapsed(), severity, where, observation, expectation, screenshot: path.basename(shot)});
  }

  /* ---- hands ---- */
  async clickAt(x, y, button){
    if (button === 'right') await this.page.mouse.click(x, y, {button: 'right'});
    else { await this.page.mouse.move(x, y); await this.page.mouse.down(); await this.page.mouse.up(); }
    await sleep(120);
  }
  async aim(x, z, dist){
    await this.page.evaluate((x, z, dist) => { camCtl.yaw = Math.atan2(player.position.x - x, player.position.z - z); if (dist) camCtl.dist = dist; }, x, z, dist || null);
    await sleep(700);
  }
  /* Find the pixel where a real click hits the object (scans outward from its projected centre). */
  async locate(finderSrc, opts){
    opts = opts || {};
    return this.page.evaluate(async (finderSrc, opts) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const obj = (function(){ try { return eval(finderSrc); } catch (e) { return null; } })();
      if (!obj) return {err: 'object not found'};
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      const centre = box.isEmpty() ? obj.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
      if (box.isEmpty()) centre.y += 0.8;
      if (!opts.keepCamera){ camCtl.yaw = Math.atan2(player.position.x - centre.x, player.position.z - centre.z); camCtl.pitch = opts.pitch || 0.95; camCtl.dist = opts.dist || 13; await sleep(opts.settle || 1500); }
      const rect = renderer.domElement.getBoundingClientRect();
      const pr = centre.clone().project(camera);
      const cx = (pr.x + 1) / 2 * rect.width + rect.left, cy = (1 - pr.y) / 2 * rect.height + rect.top;
      let best = null;
      for (let r = 0; r <= 140 && !best; r += 8) for (let a = 0; a < 360; a += (r ? 30 : 360)){
        const x = Math.round(cx + Math.cos(a * Math.PI / 180) * r), y = Math.round(cy + Math.sin(a * Math.PI / 180) * r);
        if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) continue;
        const hit = pick({clientX: x, clientY: y});
        if (hit && hit.obj === obj){ best = [x, y]; break; }
      }
      return {centre: [+centre.x.toFixed(1), +centre.z.toFixed(1)], screen: [Math.round(cx), Math.round(cy)], hit: best};
    }, finderSrc, opts);
  }
  /* Walk with real ground clicks: aim at the target, click the farthest visible ground pixel toward it, repeat. */
  async walkTo(x, z, opts){
    opts = opts || {};
    const maxLegs = opts.maxLegs || 12;
    let last = null, stuck = 0, legs = 0;
    for (; legs < maxLegs; legs++){
      const here = await this.page.evaluate(() => [player.position.x, player.position.z]);
      const d = Math.hypot(here[0] - x, here[1] - z);
      if (d <= (opts.near || 1.2)) break;
      await this.aim(x, z, opts.dist || 33);
      const px = await this.page.evaluate((x, z) => {
        const rect = renderer.domElement.getBoundingClientRect();
        const tryPoint = (wx, wz) => {
          let y = (typeof groundY === 'function' ? groundY(wx, wz) : 0) || 0;
          if (Math.abs(y - player.position.y) > 2.5) y = player.position.y;   // underground floors / upper storeys
          const pr = new THREE.Vector3(wx, y, wz).project(camera);
          if (pr.z > 1 || Math.abs(pr.x) > 0.92 || Math.abs(pr.y) > 0.9) return null;
          const sx = (pr.x + 1) / 2 * rect.width, sy = (1 - pr.y) / 2 * rect.height;
          const el = document.elementFromPoint(sx, sy);
          if (!el || el !== renderer.domElement) return null;
          const hit = pick({clientX: sx, clientY: sy});
          if (!hit) return null;
          const n = hit.obj.name || '';
          if (n === 'ground' || n.indexOf('ground-chunk-') === 0 || (hit.obj.userData && hit.obj.userData.walkSurface)) return [Math.round(sx), Math.round(sy)];
          return null;
        };
        const dx = x - player.position.x, dz = z - player.position.z, dist = Math.hypot(dx, dz);
        for (let f = 1; f >= 0.15; f -= 0.1){
          const p = tryPoint(player.position.x + dx * f, player.position.z + dz * f);
          if (p) return {screen: p, fraction: +f.toFixed(2), dist: +dist.toFixed(1)};
        }
        return null;
      }, x, z);
      if (!px){ this.logLine('walk-blocked', {target: [x, z], legs}); return {reached: false, reason: 'no clickable ground toward target', legs}; }
      await this.clickAt(px.screen[0], px.screen[1]);
      await this.page.waitForFunction(() => !Player.moveTo, {timeout: opts.legTimeout || 40000}).catch(() => {});
      await sleep(250);
      const now = await this.page.evaluate(() => [player.position.x, player.position.z]);
      if (last && Math.hypot(now[0] - last[0], now[1] - last[1]) < 0.6){ if (++stuck >= 2){ this.logLine('walk-stuck', {target: [x, z], at: now, legs}); return {reached: false, reason: 'no progress', at: now, legs}; } } else stuck = 0;
      last = now;
    }
    const at = await this.page.evaluate(() => [+player.position.x.toFixed(1), +player.position.z.toFixed(1)]);
    const reached = Math.hypot(at[0] - x, at[1] - z) <= (opts.near || 1.2) + 0.6;
    this.logLine('walk', {target: [x, z], at, legs, reached});
    return {reached, at, legs};
  }
  async clickObject(finderSrc, opts){
    opts = opts || {};
    const loc = await this.locate(finderSrc, opts);
    if (!loc.hit){ this.logLine('click-miss', {finder: finderSrc.slice(0, 80), loc}); return {clicked: false, loc}; }
    await this.clickAt(loc.hit[0], loc.hit[1], opts.right ? 'right' : 'left');
    this.logLine(opts.right ? 'right-click' : 'click', {finder: finderSrc.slice(0, 80), at: loc.hit});
    return {clicked: true, loc};
  }
  async rightClickObject(finderSrc, opts){ return this.clickObject(finderSrc, Object.assign({}, opts || {}, {right: true})); }
  async ctxRows(){ return this.page.evaluate(() => [...document.querySelectorAll('#ctx-rows > *')].map(e => e.textContent.replace(/\s+/g, ' ').trim())); }
  async chooseRow(text){
    const rect = await this.page.evaluate(text => {
      const cands = [...document.querySelectorAll('#ctx-rows > *')].filter(e => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()));
      if (!cands.length) return null;
      const r = cands[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
    }, text);
    if (!rect){ this.logLine('row-missing', {text}); return false; }
    await this.page.mouse.click(rect[0], rect[1]);
    this.logLine('choose-row', {text});
    await sleep(150);
    return true;
  }
  async chooseDialogue(text){
    const rect = await this.page.evaluate(text => {
      const cands = [...document.querySelectorAll('#dlg-opts button')].filter(e => e.textContent.trim().toLowerCase().includes(text.toLowerCase()));
      if (!cands.length) return null;
      const r = cands[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
    }, text);
    if (!rect) return false;
    await this.page.mouse.click(rect[0], rect[1]);
    this.logLine('dialogue', {text});
    await sleep(200);
    return true;
  }
  async clickInventory(itemId){
    const idx = await this.page.evaluate(id => { try { document.querySelector('.tab-btn[data-tab="inv"]').click(); } catch (e) {} UI.refreshInv(); return Player.inv.findIndex(s => s && s.id === id); }, itemId);
    if (idx < 0){ this.logLine('pack-missing', {itemId}); return false; }
    const sel = '#inv-grid .inv-slot:nth-child(' + (idx + 1) + ')';
    await this.page.waitForSelector(sel, {visible: true, timeout: 5000});
    await this.page.click(sel);
    this.logLine('pack-click', {itemId});
    await sleep(200);
    return true;
  }
  async useItemOn(itemId, finderSrc, opts){
    if (!(await this.clickInventory(itemId))) return {clicked: false};
    return this.clickObject(finderSrc, opts);
  }
  async clickButtonByText(text){
    const rect = await this.page.evaluate(text => {
      const cands = [...document.querySelectorAll('button')].filter(e => e.textContent.replace(/\s+/g, ' ').trim().toLowerCase().includes(text.toLowerCase()) && e.getBoundingClientRect().width > 0);
      if (!cands.length) return null;
      const r = cands[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
    }, text);
    if (!rect) return false;
    await this.page.mouse.click(rect[0], rect[1]);
    this.logLine('button', {text});
    await sleep(200);
    return true;
  }
  async waitFor(condSrc, timeout){
    return this.page.waitForFunction(condSrc, {timeout: timeout || 30000, polling: 250}).then(() => true).catch(() => false);
  }
  async wait(ms){ await sleep(ms); }

  /* ---- the report ---- */
  async finish(summary){
    const view = await this.see().catch(() => null);
    const report = {profile: this.profile, port: this.port, seconds: this.elapsed(), bootMs: this.bootMs, summary: summary || '',
      end: view, findings: this.findings, errors: this.errors, log: this.log};
    fs.writeFileSync(path.join(this.out, 'run.json'), JSON.stringify(report, null, 2));
    return report;
  }
}

/* finders a player would recognise by sight; the agent still has to click them for real */
const FINDERS = {
  reliefChart: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_orientation')",
  markedTree: "WORLD.clickables.find(o=>o.userData&&o.userData.marked&&o.userData.alive)",
  campfire: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='fire'&&o.parent)",
  fishingEdge: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_fishing_edge')",
  winchFrame: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_shaft_frame')",
  copperRock: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='resource'&&o.userData.oreKind==='copper'&&o.userData.alive)",
  tinRock: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='resource'&&o.userData.oreKind==='tin'&&o.userData.alive)",
  furnace: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='furnace')",
  anvil: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='anvil')",
  cavernExit: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/Cavern exit/.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))",
  exitLastlight: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/Exit Lastlight/.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))",
  ladderDown: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.climb&&o.userData.climb.down&&o.userData.climb.down.plane===(Player.plane||0)-1)",
  bankBooth: "WORLD.clickables.find(o=>o.userData&&/holm_bank_booth|bank/.test(String(o.userData.kind)))",
  lastlightDoor: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='lighthouseDoor')",
  ladderUp: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.climb&&o.userData.climb.up&&o.userData.climb.up.plane===(Player.plane||0)+1)",
  lever: "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='lever')",
  skiff: "WORLD.clickables.find(o=>o.userData&&/skiff|boat|depart/i.test(String(o.userData.label||o.userData.kind||'')))",
  door: label => `WORLD.doors.find(d=>/${label}/i.test(String(d.userData.label||'').replace(/<[^>]+>/g,'')))`,
  byLabel: text => `WORLD.clickables.find(o=>o.userData&&/${text}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`,
  byKind: kind => `WORLD.clickables.find(o=>o.userData&&o.userData.kind==='${kind}')`,
};

module.exports = {Player, FINDERS, sleep};
