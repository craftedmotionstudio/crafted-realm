/* Run 1: the impatient player presses "Skip tutorial" the moment the objective banner appears. */
'use strict';
const {Player, FINDERS} = require('../../../tools/play/harness');
(async () => {
  const p = await Player.launch({port: 8779, profile: 'impatient-skip', out: 'scratchpad/playtest/impatient/run1-skip'});
  await p.login();
  let v = await p.see();
  console.log('[arrive]', JSON.stringify({objective: v.objective, stepId: v.stepId, pos: v.pos, zone: v.zone, chat: v.chat.slice(-3)}));
  await p.screenshot('arrival');
  // where is the button? a skimming player sees a button on the banner and presses it
  const btn = await p.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /skip tutorial/i.test(x.textContent) && x.getBoundingClientRect().width > 0); if (!b) return null; const r = b.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height, text: b.textContent.trim(), parent: b.parentElement.id}; });
  console.log('[skipbtn]', JSON.stringify(btn));
  const pressed = await p.clickButtonByText('Skip tutorial');
  console.log('[pressed]', pressed);
  await p.wait(2500);
  v = await p.see();
  console.log('[after-skip]', JSON.stringify({objective: v.objective, objectiveVisible: v.objectiveVisible, stepId: v.stepId, tutorialComplete: v.tutorialComplete, pos: v.pos, zone: v.zone, dialogue: v.dialogue, chat: v.chat.slice(-4), pack: v.pack}));
  await p.screenshot('after-skip');
  await p.note(v.tutorialComplete ? 'high' : 'low', 'Guide Hall arrival, objective banner "Skip tutorial" button',
    'Pressed Skip tutorial at ' + v.t + 's: zone=' + v.zone + ' complete=' + v.tutorialComplete + ' objective="' + v.objective + '"',
    'Either a confirm prompt, or a clear statement of what is lost; not an instant teleport with no confirmation');
  if (v.dialogue) { await p.chooseDialogue(v.dialogue.options[0]); await p.wait(800); }
  v = await p.see();
  await p.screenshot('after-dialogue');
  console.log('[end]', JSON.stringify({pos: v.pos, zone: v.zone, objective: v.objective, objectiveVisible: v.objectiveVisible, pack: v.pack}));
  const rep = await p.finish('skip-button test');
  console.log('[RUN1] seconds', rep.seconds, 'errors', rep.errors.length);
  await p.close();
})().catch(e => { console.error('RUN1 ERROR', e.message); process.exit(1); });
