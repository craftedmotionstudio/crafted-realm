/* scratchpad/playtest/explorer/driver.js — the explorer's session driver (run 2).
 * Boots ONE adventurer on port 8778, then executes command files dropped into run2/cmd/*.js in name
 * order (each file is the body of an async function with p, FINDERS, sleep, out, look, poke, dismiss, K in scope).
 * Real input only, via tools/play/harness.js. */
'use strict';
const fs = require('fs'), path = require('path');
const {Player, FINDERS, sleep} = require('../../../tools/play/harness');
const ROOT = 'C:/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Claude/scratchpad/playtest/explorer/' + (process.argv[2] || 'run2');
const CMD = path.join(ROOT, 'cmd');
const LOG = path.join(ROOT, 'driver.log');
fs.mkdirSync(CMD, {recursive: true});
const out = (...a) => { const s = '[' + new Date().toISOString().slice(11, 19) + '] ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); fs.appendFileSync(LOG, s + '\n'); console.log(s); };
const K = kind => `WORLD.clickables.find(o=>o.userData&&o.userData.kind==='${kind}')`;

(async () => {
  let p;
  for (let attempt = 0; attempt < 2; attempt++){
    p = await Player.launch({port: 8778, profile: 'explorer', out: ROOT});
    out('launched profile', p.profile);
    try { await p.login(); break; } catch (e) { out('login failed (attempt ' + (attempt + 1) + '): ' + e.message); await p.close(); p = null; }
  }
  if (!p){ out('BOOT FAILED twice'); process.exit(1); }
  out('logged in, bootMs', p.bootMs);
  const lessons = [];
  let lastStep = null;

  const look = async (tag, opts) => {
    opts = opts || {};
    const v = await p.see();
    if (lastStep !== null && v.step !== lastStep) lessons.push({t: v.t, from: lastStep, to: v.step, id: v.stepId});
    lastStep = v.step;
    const shot = opts.noShot ? '' : await p.screenshot(tag || 'look');
    out('LOOK ' + (tag || '') + ' t=' + v.t, {
      objective: v.objective, step: v.stepId + '#' + v.step, arrow: v.arrow, pos: v.pos, plane: v.plane, zone: v.zone, energy: v.energy,
      pack: v.pack, weapon: v.weapon, using: v.usingItem, dialogue: v.dialogue, ctx: v.ctxOpen,
      chat: v.chat.slice(-4), nearby: v.nearby.slice(0, 10).map(n => n.label + '@' + n.tile + (n.onScreen ? ' scr' + n.screen : ' off') + ' d' + n.dist),
      shot: path.basename(shot)});
    return v;
  };
  const dismiss = async () => {
    for (let i = 0; i < 4; i++){
      const v = await p.see();
      if (!v.dialogue) return;
      out('dismiss dialogue', v.dialogue.name, '|', v.dialogue.text.slice(0, 400), '| opts', v.dialogue.options);
      await p.chooseDialogue(v.dialogue.options[v.dialogue.options.length - 1]);
      await sleep(400);
    }
  };
  const closeCtx = async () => { await p.page.keyboard.press('Escape').catch(() => {}); if ((await p.see()).ctxOpen) await p.clickAt(760, 40); };
  /* A curious player: right-click a thing, read the rows, choose Examine if there is one, read what comes back. */
  const poke = async (name, finder, opts) => {
    opts = opts || {};
    const r = await p.rightClickObject(finder, opts);
    if (!r.clicked){ out('POKE ' + name + ': could not hit it', r.loc); await p.screenshot('miss-' + name); return {rows: [], miss: true, loc: r.loc}; }
    await sleep(350);
    const rows = await p.ctxRows();
    out('POKE ' + name + ' rows:', rows);
    await p.screenshot('menu-' + name);
    let examined = null;
    const ex = rows.find(x => /examine/i.test(x));
    if (ex && !opts.noExamine){
      await p.chooseRow('Examine'); await sleep(900);
      const v = await p.see(); examined = v.chat.slice(-2);
      out('POKE ' + name + ' examine ->', examined, v.dialogue ? 'DLG: ' + v.dialogue.name + ' | ' + v.dialogue.text.slice(0, 300) : '');
      await dismiss();
    } else await closeCtx();
    return {rows, examined};
  };

  const done = new Set();
  out('waiting for commands in', CMD);
  for (;;){
    const files = fs.readdirSync(CMD).filter(f => /\.js$/.test(f)).sort();
    const next = files.find(f => !done.has(f));
    if (!next){ await sleep(400); continue; }
    done.add(next);
    const src = fs.readFileSync(path.join(CMD, next), 'utf8');
    out('=== RUN ' + next + ' (t=' + p.elapsed() + ')');
    try {
      const fn = new (async function(){}).constructor('p', 'FINDERS', 'sleep', 'out', 'look', 'poke', 'dismiss', 'closeCtx', 'K', src);
      await fn(p, FINDERS, sleep, out, look, poke, dismiss, closeCtx, K);
      out('=== DONE ' + next + ' (t=' + p.elapsed() + ')');
    } catch (e) { out('=== ERROR ' + next + ': ' + (e.stack || e.message)); }
    const rep = await p.finish('explorer (in progress)');
    rep.lessons = lessons;
    fs.writeFileSync(path.join(ROOT, 'run.json'), JSON.stringify(rep, null, 2));
    if (/\bEXIT\b/.test(src)){ out('exit requested; run.json written'); await p.close(); process.exit(0); }
  }
})().catch(e => { out('DRIVER ERROR ' + (e.stack || e.message)); process.exit(1); });
