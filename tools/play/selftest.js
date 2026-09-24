/* Harness self-test: boot, log in, look around, walk to the relief chart with real ground clicks,
 * click it, and confirm the first lesson advanced. Run: node tools/play/selftest.js [port] */
'use strict';
const {Player, FINDERS} = require('./harness');
(async () => {
  const port = Number(process.argv[2] || 8777);
  const p = await Player.launch({port, profile: 'selftest', out: 'scratchpad/playtest/selftest'});
  await p.login();
  let v = await p.see();
  console.log('[see]', JSON.stringify({objective: v.objective, stepId: v.stepId, pos: v.pos, arrow: v.arrow && v.arrow.label, pack: v.pack, nearby: v.nearby.slice(0, 4).map(n => n.label + '@' + n.tile)}));
  await p.screenshot('arrival');
  const walk = await p.walkTo(151.5, 158.5);
  console.log('[walk]', JSON.stringify(walk));
  const click = await p.clickObject(FINDERS.reliefChart);
  console.log('[click]', JSON.stringify({clicked: click.clicked, hit: click.loc.hit}));
  const advanced = await p.waitFor("Tutorial.step >= 1", 15000);
  v = await p.see();
  console.log('[after]', JSON.stringify({advanced, objective: v.objective, stepId: v.stepId, chat: v.chat.slice(-2)}));
  await p.screenshot('after-chart');
  const rep = await p.finish('selftest');
  console.log('[SELFTEST] ' + (walk.reached && click.clicked && advanced ? 'PASS' : 'FAIL') + ' in ' + rep.seconds + ' s, errors ' + rep.errors.length);
  await p.close();
})().catch(e => { console.error('SELFTEST ERROR', e.message); process.exit(1); });
