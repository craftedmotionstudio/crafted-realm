await p.note('low', 'Training Cavern chat', 'Level-up line reads "Congratulations, you just advanced an Mining level."', '"a Mining level".');
let c = await p.cclick(FINDERS.furnace); out('click furnace', c);
await sleep(2000);
let v = await look('furnace-clicked');
if (v.dialogue){ out('dialogue', v.dialogue); const opt = v.dialogue.options.find(o => /bronze/i.test(o)) || v.dialogue.options[0]; await p.chooseDialogue(opt); out('chose', opt); }
else { const btn = await p.clickButtonByText('bronze'); out('bronze button', btn); }
let ok = await p.waitFor("Tutorial.step >= 10", 40000); out('smelted', ok);
v = await look('after-smelt');
out('banner now', v.objective, v.arrow);
if (ok && v.arrow){
  let w = await p.cwalk(v.arrow.target[0] + 0.5, v.arrow.target[1] + 1.5, {near: 2.5}); out('cwalk to ' + v.arrow.label, w);
  c = await p.cclick(FINDERS.anvil); out('click anvil', c);
  await sleep(2000);
  v = await look('anvil-clicked');
  if (v.dialogue){ out('dialogue', v.dialogue); await p.chooseDialogue(v.dialogue.options[0]); out('chose', v.dialogue.options[0]); }
  else { const btns = await p.page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && !/skip tutorial/i.test(b.textContent)).map(b => b.textContent.trim()).slice(0, 20)); out('visible buttons', btns); }
  ok = await p.waitFor("Tutorial.step >= 11", 40000); out('forged', ok);
  v = await look('after-forge');
  out('banner now', v.objective, v.arrow);
}
