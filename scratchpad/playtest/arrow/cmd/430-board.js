let v = await look('at-dock');
const boat = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='holm_departure')";
let c = await p.cclick(boat); out('click boat', c);
await sleep(2500);
v = await look('boat-clicked'); out('state', v.dialogue, v.zone, v.pos, v.chat.slice(-3));
for (let i = 0; i < 4 && v.dialogue; i++){
  const opt = v.dialogue.options.find(o => /board|sail|yes|mainland|go/i.test(o)) || v.dialogue.options[0];
  await p.chooseDialogue(opt); out('chose', opt); await sleep(2000);
  v = await look('boat-dialogue-' + i); out('state', v.dialogue, v.zone, v.pos, v.chat.slice(-3));
}
const arrived = await p.waitFor("document.getElementById('zone-label') && /Veyhollow/.test(document.getElementById('zone-label').textContent)", 60000);
out('arrived on mainland', arrived);
await sleep(3000);
v = await look('mainland'); out('final', v.zone, v.pos, v.plane, v.objective, v.tutorialComplete, v.chat.slice(-4));
