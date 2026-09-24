/* Explorer playtest of Tutor's Holm. Ignores the objective banner at first: walks into every building,
 * right-clicks things, reads examines, tries stations out of order and the wrong item on things, tries
 * to leave early, then does the curriculum and boards the skiff. Every action is a real click. */
'use strict';
const {Player, FINDERS} = require('../../../tools/play/harness');
const PORT = 8778;
const K = kind => `WORLD.clickables.find(o=>o.userData&&o.userData.kind==='${kind}')`;
const BUDGET_S = 45 * 60;

(async () => {
  const p = await Player.launch({port: PORT, profile: 'explorer', out: 'scratchpad/playtest/explorer'});
  const say = (...a) => console.log('[' + p.elapsed() + 's]', ...a);
  const lessons = [];
  let lastStep = -1;
  async function view(tag){
    const v = await p.see();
    if (v.step !== lastStep){ if (lastStep >= 0) lessons.push({t: v.t, from: lastStep, to: v.step, id: v.stepId}); lastStep = v.step; }
    say(tag || 'see', JSON.stringify({obj: v.objective, step: v.step + ':' + v.stepId, pos: v.pos, plane: v.plane, zone: v.zone, energy: v.energy, arrow: v.arrow && [v.arrow.label, v.arrow.target], pack: v.pack, chat: v.chat.slice(-3), dlg: v.dialogue}));
    return v;
  }
  async function dismiss(){
    for (let i = 0; i < 4; i++){
      const v = await p.see();
      if (!v.dialogue) return;
      await p.chooseDialogue(v.dialogue.options[v.dialogue.options.length - 1]);
      await p.wait(300);
    }
  }
  async function closeModals(){
    await p.page.evaluate(() => { const b = document.getElementById('bank-modal'); if (b && b.style.display === 'block') b.querySelector('.close-x').click(); }).catch(() => {});
    await p.page.keyboard.press('Escape').catch(() => {});
    await dismiss();
  }
  /* A curious player: right-click, read the rows, examine, then left-click the thing. */
  async function poke(name, finder, opts){
    opts = opts || {};
    const r = await p.rightClickObject(finder, opts);
    if (!r.clicked){ say('poke', name, 'could not find/hit it', JSON.stringify(r.loc)); await p.screenshot('miss-' + name); return {rows: [], miss: true, loc: r.loc}; }
    await p.wait(300);
    const rows = await p.ctxRows();
    say('poke', name, 'rows:', JSON.stringify(rows));
    await p.screenshot('menu-' + name);
    let examined = null;
    const ex = rows.find(x => /examine|inspect|read|study/i.test(x));
    if (ex && !opts.noExamine){ await p.chooseRow(ex.split(' ')[0]); await p.wait(900); const v = await p.see(); examined = v.chat.slice(-2); say('poke', name, ex, '->', JSON.stringify(examined), v.dialogue ? 'DLG: ' + v.dialogue.name + ' | ' + v.dialogue.text.slice(0, 200) : ''); await p.screenshot('after-' + name); await dismiss(); }
    else { await p.page.keyboard.press('Escape'); await p.clickAt(760, 60); }
    return {rows, examined};
  }
  async function walkVia(pts, near){ let r; for (const [x, z] of pts){ r = await p.walkTo(x, z, {near: near || 1.5}); if (!r.reached) say('walk', 'did not reach', x, z, JSON.stringify(r)); } return r; }
  async function phase(name, fn){ say('=== PHASE', name); try { await fn(); } catch (e){ say('PHASE ERROR', name, e.message); await p.screenshot('error-' + name); } }
  const overBudget = () => p.elapsed() > BUDGET_S * 0.62;

  try { await p.login(); } catch (e){ say('boot timed out once, retrying:', e.message.slice(0, 80)); await p.screenshot('boot-timeout'); await p.page.goto(`http://127.0.0.1:${PORT}/?qaProfile=${p.profile}&boot=${Date.now()}`, {waitUntil: 'domcontentloaded', timeout: 60000}); await p.login(); }
  let v = await view('arrival');
  await p.screenshot('01-arrival');

  /* ---------- A. Guide Hall: poke around, right-click the ground, ignore the banner ---------- */
  await phase('guide-hall', async () => {
    // right-click the ground under my feet
    await p.aim(v.pos[0], v.pos[1] - 3, 14);
    await p.clickAt(769, 560, 'right'); await p.wait(300);
    say('ground rows', JSON.stringify(await p.ctxRows())); await p.screenshot('02-ground-menu');
    await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
    // the chart: read its menu, examine, but do not study yet
    await poke('chart', FINDERS.reliefChart, {noExamine: true});
    await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
    await poke('register', K('holm_register'));
    await poke('region-map', K('holm_region_map'));
    await poke('provisions', K('holm_provisions'));
    v = await view('hall-poked');
    if (v.step === 0) await p.note('low', 'Guide Hall', 'Read register, region map and provisions without studying the chart; objective still "' + v.objective + '"', 'Curious reading should not be punished (ok) but chart is the only thing that counts');
  });

  /* ---------- B. Teaching Kitchen out of order: bin before bucket, range with nothing ---------- */
  await phase('kitchen-early', async () => {
    await walkVia([[151.5, 145.5], [151.5, 141.5], [148.5, 143.5], [144.5, 137.6], [150.5, 137.6]]);
    await view('kitchen-in'); await p.screenshot('03-kitchen');
    await poke('recipe-board', K('holm_recipe_board'));
    await poke('flour-bin-nobucket', K('holm_flour_bin'));
    await poke('range-empty', K('holm_kitchen_range'));
    // now do it the right way as the board says
    await p.clickObject(K('holm_bucket_shelf')); await p.wait(1500); await dismiss();
    await p.clickObject(K('holm_bucket_shelf')); await p.wait(1500); await dismiss();
    await p.clickObject(K('holm_flour_bin')); await p.wait(1500); await dismiss();
    await p.clickObject(K('holm_water_butt')); await p.wait(1500); await dismiss();
    await p.clickObject(K('holm_dough_trough')); await p.wait(1500); await dismiss();
    v = await view('kitchen-ingredients');
    // wrong item on the range: the raw flour bucket
    const fl = v.pack.find(x => /flour/.test(x));
    if (fl){ await p.useItemOn(fl.split(' ')[0], K('holm_kitchen_range')); await p.wait(1500); v = await view('flour-on-range'); await p.screenshot('04-flour-on-range'); await dismiss(); }
    await p.clickInventory('dough'); await p.wait(1200); v = await view('kneaded');
    if (v.pack.some(x => /bread_dough/.test(x))){ await p.clickInventory('bread_dough'); await p.clickObject(K('holm_kitchen_range')); await p.waitFor("Player.count('bread')>0", 30000); }
    v = await view('baked'); await p.screenshot('05-baked'); await dismiss();
    if (!v.pack.some(x => /^bread/.test(x))) await p.note('medium', 'Teaching Kitchen', 'Followed the recipe board but no bread in pack; pack=' + v.pack.join(','), 'A loaf after clicking bread dough then the range');
  });

  /* ---------- C. Quest Lodge ---------- */
  await phase('quest-lodge', async () => {
    await walkVia([[144.5, 137.6], [141.2, 134.5], [137.5, 133.5]]);
    await p.screenshot('06-lodge');
    await poke('quest-board', K('holm_quest_board'));
    await poke('story-ledger', K('holm_story_ledger'));
    await poke('story-clue', K('holm_story_clue'));
    await p.clickObject(K('holm_quest_board')); await p.wait(1200); v = await view('board-left-click');
    if (v.dialogue){ const opt = v.dialogue.options.find(o => /journal/i.test(o)); if (opt){ await p.chooseDialogue(opt); await p.wait(800); await p.screenshot('07-journal'); } }
    await closeModals();
  });

  /* ---------- D. Try to leave early: road east to Departure Dock, click the skiff ---------- */
  await phase('leave-early', async () => {
    await walkVia([[141.2, 134.5], [145.5, 146.5], [158.5, 142.5], [184.5, 142.5], [186.5, 140.5], [193.5, 150.5], [205.5, 151.5]]);
    v = await view('dock'); await p.screenshot('08-dock');
    const r = await poke('skiff', FINDERS.skiff, {noExamine: true});
    await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
    const ex = r.rows.find(x => /examine/i.test(x));
    if (ex){ await p.rightClickObject(FINDERS.skiff); await p.wait(300); await p.chooseRow('Examine'); await p.wait(600); v = await view('skiff-examine'); }
    await p.clickObject(FINDERS.skiff); await p.wait(1500); v = await view('skiff-early'); await p.screenshot('09-skiff-early');
    if (v.dialogue) say('SKIFF SAYS', v.dialogue.name, '|', v.dialogue.text);
    else await p.note('medium', 'Departure Dock (207,151)', 'Clicked the skiff before any lesson; no dialogue or chat explained why I cannot leave. chat=' + v.chat.slice(-2).join(' / '), 'A clear "finish the lessons first" message');
    await dismiss();
    // walk to the water's edge past the dock and right-click the water
    const w = await p.walkTo(211.5, 154.5, {near: 1.0, maxLegs: 4});
    say('water edge walk', JSON.stringify(w)); await p.screenshot('10-water-edge');
  });

  /* ---------- E. Mage Tower, then Lastlight early ---------- */
  await phase('mage-tower', async () => {
    await walkVia([[193.5, 150.5], [186.5, 140.5], [186.8, 135.5], [191.5, 134.5]]);
    await p.screenshot('11-mage-tower');
    await poke('rune-table', K('holm_rune_table'));
    await poke('spell-lectern', K('holm_spell_lectern'));
    await poke('tower-register', K('holm_tower_register'));
    await closeModals();
  });
  await phase('lastlight-early', async () => {
    if (overBudget()) return say('skip: budget');
    await walkVia([[191.5, 140.2], [184.5, 135.5], [184.5, 128.5], [205.5, 128.5], [205.5, 123.5], [196.5, 125.5]]);
    v = await view('lastlight-foot'); await p.screenshot('12-lastlight-foot');
    const r = await poke('lastlight-door', FINDERS.lastlightDoor, {noExamine: true});
    await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
    await p.clickObject(FINDERS.lastlightDoor); await p.wait(2500); v = await view('lastlight-door-early'); await p.screenshot('13-lastlight-early');
    if (v.plane === 1){
      say('entered lastlight early');
      const l1 = await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===1&&/ground-floor ladder/.test(String(o.userData.label||'')))");
      await p.waitFor('(Player.plane||0)===2', 15000); await p.wait(1200);
      const l2 = await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===2&&/upper ladder/.test(String(o.userData.label||'')))");
      await p.waitFor('(Player.plane||0)===3', 15000); await p.wait(1200);
      v = await view('lantern-room-early'); await p.screenshot('14-lantern-early');
      const lv = await poke('lever-early', FINDERS.lever, {noExamine: true});
      await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
      await p.clickObject(FINDERS.lever); await p.wait(1500); v = await view('lever-early'); await p.screenshot('15-lever-early');
      if (v.dialogue) say('LEVER SAYS', v.dialogue.name, '|', v.dialogue.text);
      await dismiss();
      // climb back down
      for (const [pl, re] of [[3, /lower ladder/], [2, /lower ladder/], [1, /Exit/]]){
        if ((await p.see()).plane !== pl) continue;
        await p.clickObject(`WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===${pl}&&${re}.test(String(o.userData.label||'')))`);
        await p.waitFor(`(Player.plane||0)===${pl - 1}`, 15000); await p.wait(1000);
      }
      v = await view('back-down');
    }
  });

  /* ---------- F. Combat Hall and Bank (early booth) ---------- */
  await phase('combat-hall', async () => {
    if (overBudget()) return say('skip: budget');
    await walkVia([[205.5, 123.5], [205.5, 128.5], [184.5, 128.5], [169.5, 125.5], [171, 121.2]]);
    await p.screenshot('16-combat-hall');
    await poke('arms-rack', K('holm_arms_rack'));
    await poke('training-post', K('holm_training_post'));
    await poke('warden-roll', K('holm_warden_roll'));
    await closeModals();
  });
  await phase('bank-early', async () => {
    if (overBudget()) return say('skip: budget');
    await walkVia([[169.5, 125.5], [164.5, 118.5], [157.5, 122.5], [154.5, 118.5]]);
    await p.screenshot('17-bank');
    await poke('bank-plaque', K('holm_bank_plaque'));
    await poke('bank-ledger', K('holm_bank_ledger'));
    await p.clickObject(FINDERS.bankBooth); await p.wait(1500);
    const open = await p.page.evaluate(() => document.getElementById('bank-modal').style.display === 'block');
    v = await view('bank-early'); await p.screenshot('18-bank-early');
    say('bank opened early?', open, 'step', v.step);
    await closeModals();
  });

  /* ---------- G. Mine Gatehouse: try to climb down early ---------- */
  await phase('gatehouse-early', async () => {
    await walkVia([[157.5, 122.5], [158.5, 128.5], [145.5, 128.5], [133, 120.5], [128.5, 121.5], [124.5, 118.5]]);
    await p.screenshot('19-gatehouse');
    await poke('gate-stone', K('holm_gate_stone'));
    await poke('ore-tally', K('holm_ore_tally'));
    const r = await poke('winch-frame', FINDERS.winchFrame, {noExamine: true});
    const cd = r.rows.find(x => /climb/i.test(x));
    if (cd){ await p.chooseRow('Climb'); await p.wait(2000); v = await view('climb-early'); await p.screenshot('20-climb-early'); if (v.dialogue) say('WINCH SAYS', v.dialogue.name, '|', v.dialogue.text); await dismiss(); }
    else { await p.page.keyboard.press('Escape'); await p.clickAt(760, 60); }
    if ((await p.see()).plane === -1){ say('!!! descended before any lesson'); await p.note('high', 'Mine Gatehouse winch', 'Climb-down worked before any lesson; I am in the cavern with no pickaxe', 'The shaft should be locked until the survival lessons, or the game should say why'); }
  });

  /* ---------- H. Survival Wood before the chart: chop without a hatchet, wrong item on the tree ---------- */
  await phase('wood-early', async () => {
    if ((await p.see()).plane === -1) return say('skip: underground');
    await walkVia([[128.5, 126.5], [128.5, 137.5], [128.5, 146.5], [127.5, 159.5]]);
    v = await view('wood'); await p.screenshot('21-wood');
    await poke('net-rack', K('holm_net_rack'));
    await poke('survival-tools', K('holm_survival_tools'));
    await poke('firemaking-board', K('holm_firemaking_board'));
    await poke('hearth', K('holm_teaching_hearth'));
    const tree = await poke('marked-tree', FINDERS.markedTree, {noExamine: true});
    await p.page.keyboard.press('Escape'); await p.clickAt(760, 60);
    await p.clickObject(FINDERS.markedTree); await p.wait(2500); v = await view('chop-early'); await p.screenshot('22-chop-early');
    await dismiss();
    if (v.pack.includes('tinderbox')){ await p.useItemOn('tinderbox', FINDERS.markedTree); await p.wait(1500); v = await view('tinderbox-on-tree'); await p.screenshot('23-tinderbox-on-tree'); await dismiss(); }
    // click the fishing edge with nothing armed, from where I stand (far)
    await p.clickObject(FINDERS.fishingEdge, {dist: 20}); await p.wait(2500); v = await view('edge-noitem-far'); await p.screenshot('24-edge-far');
    await dismiss();
  });

  /* ---------- I. Curriculum, explorer order: chart, hatchet, then the wood ---------- */
  await phase('chart', async () => {
    await walkVia([[134.5, 157.5], [134.5, 147.5], [151.5, 145.5], [151.5, 155.5]]);
    await p.clickObject(FINDERS.reliefChart);
    await p.waitFor('Tutorial.step>=1', 20000); v = await view('chart-studied'); await p.screenshot('25-chart');
    await dismiss();
    await p.clickInventory('hatchet'); await p.waitFor('Tutorial.step>=2', 10000); v = await view('hatchet');
  });
  await phase('wood-lessons', async () => {
    await walkVia([[151.5, 145.5], [134.5, 147.5], [134.5, 157.5], [127.5, 159.5]]);
    // click a tree while still walking: order a long walk then click the tree at once
    await p.clickObject(FINDERS.markedTree);
    const got = await p.waitFor("Player.count('logs')>=1", 60000); v = await view('chopped'); await p.screenshot('26-chopped');
    if ((await p.see()).pack.filter(x => /^logs/.test(x)).length && !/x2/.test(v.pack.find(x => /^logs/.test(x)) || '')){ await p.waitFor('!Player.action', 30000); await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.count('logs')>=2||!Player.action", 40000); }
    await p.waitFor('!Player.action', 30000);
    // light the fire by using the tinderbox on the logs (the objective text says so)
    await p.clickInventory('tinderbox'); // arm the tinderbox, then click the logs
    await p.clickInventory('logs'); await p.waitFor('Tutorial.step>=4', 20000); v = await view('fire'); await p.screenshot('27-fire');
    // fish: net on the edge
    await p.walkTo(131.5, 152.5, {near: 1.5});
    await p.clickInventory('fishing_net'); await p.clickObject(FINDERS.fishingEdge, {dist: 12});
    await p.waitFor("Player.count('raw_perch')>0", 60000); v = await view('fished'); await p.screenshot('28-fished');
    // cook: use the fish on the fire (a player would do this) — if fire is gone, light another
    let fire = await p.page.evaluate(() => (WORLD.clickables||[]).some(o => o.userData && o.userData.kind === 'fire' && o.parent));
    if (!fire){ say('fire out; lighting another'); await p.note('medium', 'Survival Wood', 'The fire had burnt out by the time I came back from the pond', 'The fire should still be burning after one cast'); await p.clickInventory('logs'); await p.wait(2500); }
    await p.useItemOn('raw_perch', FINDERS.campfire, {dist: 12});
    let cooked = await p.waitFor('Tutorial.step>=6', 25000);
    if (!cooked){ v = await view('cook-try2'); fire = await p.page.evaluate(() => (WORLD.clickables||[]).some(o => o.userData && o.userData.kind === 'fire' && o.parent)); if (!fire){ await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.count('logs')>=1", 40000); await p.waitFor('!Player.action', 30000); await p.clickInventory('logs'); await p.wait(2500); } if (!(await p.see()).pack.some(x => /raw_perch/.test(x))){ await p.walkTo(131.5, 152.5, {near: 1.5}); await p.clickInventory('fishing_net'); await p.clickObject(FINDERS.fishingEdge, {dist: 12}); await p.waitFor("Player.count('raw_perch')>0", 60000); } await p.clickObject(FINDERS.campfire, {dist: 12}); cooked = await p.waitFor('Tutorial.step>=6', 25000); }
    v = await view('cooked'); await p.screenshot('29-cooked');
  });
  await phase('cavern', async () => {
    await walkVia([[128.5, 146.5], [128.5, 137.5], [128.5, 126.5], [128.5, 121.5], [124.5, 118.5]]);
    await p.clickObject(FINDERS.winchFrame, {dist: 11}); // left click: primary should be Climb-down now
    let down = await p.waitFor('(Player.plane||0)===-1', 20000);
    if (!down){ v = await view('winch-left-click'); await dismiss(); await p.rightClickObject(FINDERS.winchFrame, {dist: 11}); await p.wait(300); say('winch rows', JSON.stringify(await p.ctxRows())); await p.chooseRow('Climb-down'); down = await p.waitFor('(Player.plane||0)===-1', 20000); }
    await p.wait(1500); v = await view('cavern'); await p.screenshot('30-cavern');
    // copper
    await p.walkTo(294.5, 355.5, {near: 1.5});
    await p.clickObject(FINDERS.copperRock, {dist: 12}); await p.waitFor('Tutorial.step>=8', 60000); v = await view('copper'); await p.screenshot('31-copper');
    await p.waitFor('!Player.action', 30000);
    // the objective says south-east offshoot
    await walkVia([[300.5, 366.5], [303.5, 375.5]]);
    await p.clickObject(FINDERS.tinRock, {dist: 12}); await p.waitFor('Tutorial.step>=9', 60000); v = await view('tin'); await p.screenshot('32-tin');
    await p.waitFor('!Player.action', 30000);
    // wrong item on the furnace: the pickaxe
    await p.walkTo(304.5, 361.5, {near: 1.5});
    await p.useItemOn('pickaxe', FINDERS.furnace, {dist: 12}); await p.wait(1500); v = await view('pickaxe-on-furnace'); await p.screenshot('33-pickaxe-furnace'); await dismiss();
    await p.clickObject(FINDERS.furnace, {dist: 12}); await p.wait(800); v = await view('furnace-dlg');
    if (v.dialogue){ const o = v.dialogue.options.find(x => /bronze/i.test(x)); if (o) await p.chooseDialogue(o); }
    await p.waitFor('Tutorial.step>=10', 45000); v = await view('smelted'); await p.screenshot('34-smelted');
    await p.waitFor('!Player.action', 30000);
    await p.walkTo(301.5, 361.5, {near: 1.5});
    await p.clickObject(FINDERS.anvil, {dist: 12}); await p.wait(1000); v = await view('anvil-dlg'); await p.screenshot('35-anvil');
    if (v.dialogue){ const o = v.dialogue.options.find(x => /dagger/i.test(x)); if (o) await p.chooseDialogue(o); }
    else { const ok = await p.page.evaluate(() => { const g = document.getElementById('smith-grid-overlay'); if (!g || g.style.display === 'none') return false; const c = [...g.querySelectorAll('*')].filter(e => /dagger/i.test(e.textContent) && e.children.length === 0 && e.getClientRects().length); if (!c.length) return false; const r = c[0].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (ok) await p.clickAt(ok[0], ok[1]); }
    await p.waitFor('Tutorial.step>=11', 45000); v = await view('forged'); await p.screenshot('36-forged');
    await p.page.keyboard.press('Escape');
    await p.waitFor('!Player.action', 30000);
    // exit
    await p.walkTo(321.5, 355.5, {near: 1.5});
    v = await view('at-exit'); await p.screenshot('37-exit-ladder');
    await p.clickObject(FINDERS.cavernExit, {dist: 12});
    await p.waitFor('(Player.plane||0)===0', 20000); await p.wait(2000); v = await view('surfaced'); await p.screenshot('38-surfaced');
  });
  await phase('bank', async () => {
    await walkVia([[169.5, 121.5], [164.5, 118.5], [157.5, 122.5], [154.5, 118.5]]);
    await p.clickObject(FINDERS.bankBooth, {dist: 12});
    await p.waitFor('Tutorial.step>=12', 20000); v = await view('bank-open'); await p.screenshot('39-bank-open');
    await closeModals();
  });
  await phase('lastlight', async () => {
    await walkVia([[158.5, 128.5], [184.5, 128.5], [205.5, 128.5], [205.5, 123.5], [196.5, 125.5]]);
    await p.clickObject(FINDERS.lastlightDoor, {dist: 12}); await p.waitFor('(Player.plane||0)===1', 20000); await p.wait(1200);
    await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===1&&/ground-floor ladder/.test(String(o.userData.label||'')))", {dist: 12});
    await p.waitFor('(Player.plane||0)===2', 20000); await p.wait(1200);
    await p.clickObject("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===2&&/upper ladder/.test(String(o.userData.label||'')))", {dist: 12});
    await p.waitFor('(Player.plane||0)===3', 20000); await p.wait(1200);
    v = await view('lantern-room'); await p.screenshot('40-lantern-room');
    await p.clickObject(FINDERS.lever, {dist: 12});
    await p.waitFor('Tutorial.step>=13||Tutorial.complete', 30000); v = await view('lever-pulled'); await p.screenshot('41-lever');
    await dismiss();
    for (const [pl, re] of [[3, /lower ladder/], [2, /lower ladder/], [1, /Exit/]]){
      if ((await p.see()).plane !== pl) continue;
      await p.clickObject(`WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===${pl}&&${re}.test(String(o.userData.label||'')))`, {dist: 12});
      await p.waitFor(`(Player.plane||0)===${pl - 1}`, 15000); await p.wait(1000);
    }
    v = await view('down-from-lastlight'); await p.screenshot('42-after-lastlight');
  });
  await phase('depart', async () => {
    await walkVia([[196.5, 125.5], [205.5, 123.5], [205.5, 128.5], [184.5, 128.5], [184.5, 135.5], [186.5, 140.5], [193.5, 150.5], [205.5, 151.5]]);
    v = await view('dock-final'); await p.screenshot('43-dock-final');
    await p.clickObject(FINDERS.skiff, {dist: 12});
    const sailed = await p.waitFor("typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId!=='tutors-holm-v2'&&player.position.x>1", 60000);
    await p.wait(3000); v = await view('mainland'); await p.screenshot('44-mainland');
    say('SAILED', sailed, v.zone, v.provider);
  });

  const rep = await p.finish('explorer run');
  rep.lessons = lessons;
  require('fs').writeFileSync(require('path').join(p.out, 'run.json'), JSON.stringify(rep, null, 2));
  say('DONE', rep.seconds, 's; findings', rep.findings.length, 'errors', rep.errors.length, 'lessons', JSON.stringify(lessons));
  await p.close();
})().catch(e => { console.error('RUN ERROR', e); process.exit(1); });
