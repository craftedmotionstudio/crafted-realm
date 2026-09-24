let v = await look('winch-house');
const climb = "WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&/Training cavern/.test(String(o.userData.label||'')))";
let c = await p.clickObject(climb, {dist: 10});
out('click climb-down', c);
let down = await p.waitFor("(Player.plane||0) < 0", 20000); out('went down', down);
if (!down){
  c = await p.clickObject(FINDERS.winchFrame, {dist: 10}); out('click winch frame', c);
  await sleep(1500); v = await look('winch-clicked');
  if (v.dialogue){ out('dialogue', v.dialogue); await p.chooseDialogue(v.dialogue.options[0]); await sleep(1000); }
  down = await p.waitFor("(Player.plane||0) < 0", 20000); out('went down after frame', down);
}
await sleep(1500);
v = await look('in-cavern');
