/* scratchpad/playtest/arrow/play.js — the arrow-follower's session driver.
 * Boots ONE adventurer, then executes command files dropped into ./cmd/*.js in name order
 * (each file is the body of an async function with p, FINDERS, sleep, out, look in scope).
 * This lets the playtester iterate mid-run without restarting the game. */
'use strict';
const fs = require('fs'), path = require('path');
const {Player, FINDERS, sleep} = require('../../../tools/play/harness');
const ROOT = 'C:/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Claude/scratchpad/playtest/arrow';
const CMD = path.join(ROOT, 'cmd');
const LOG = path.join(ROOT, 'driver.log');
fs.mkdirSync(CMD, {recursive: true});
const out = (...a) => { const s = '[' + new Date().toISOString().slice(11, 19) + '] ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); fs.appendFileSync(LOG, s + '\n'); console.log(s); };

(async () => {
  let p;
  for (let attempt = 0; attempt < 2; attempt++){
    p = await Player.launch({port: 8777, profile: 'arrow', out: ROOT});
    out('launched profile', p.profile);
    try { await p.login(); break; } catch (e) { out('login failed (attempt ' + (attempt + 1) + '): ' + e.message); await p.close(); p = null; }
  }
  if (!p){ out('BOOT FAILED twice'); process.exit(1); }
  out('logged in, bootMs', p.bootMs);

  /* the player's glance: objective, arrow, position, pack, last chat, nearby things */
  const look = async (tag) => {
    const v = await p.see();
    const shot = await p.screenshot(tag || 'look');
    out('LOOK ' + (tag || '') + ' t=' + v.t, {
      objective: v.objective, step: v.stepId + '#' + v.step, arrow: v.arrow, pos: v.pos, plane: v.plane, zone: v.zone,
      pack: v.pack, weapon: v.weapon, using: v.usingItem, dialogue: v.dialogue, ctx: v.ctxOpen,
      chat: v.chat.slice(-3), nearby: v.nearby.slice(0, 8).map(n => n.label + '@' + n.tile + (n.onScreen ? ' scr' + n.screen : ' off') + ' d' + n.dist),
      shot: path.basename(shot)});
    return v;
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
      const fn = new (async function(){}).constructor('p', 'FINDERS', 'sleep', 'out', 'look', src);
      await fn(p, FINDERS, sleep, out, look);
      out('=== DONE ' + next + ' (t=' + p.elapsed() + ')');
    } catch (e) { out('=== ERROR ' + next + ': ' + (e.stack || e.message)); }
    await p.finish('arrow-follower (in progress)');
    if (/\bEXIT\b/.test(src)){ out('exit requested; run.json written'); await p.close(); process.exit(0); }
  }
})().catch(e => { out('DRIVER ERROR ' + (e.stack || e.message)); process.exit(1); });
