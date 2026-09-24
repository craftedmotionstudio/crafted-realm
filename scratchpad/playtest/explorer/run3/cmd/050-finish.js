/* Run 3, stage 5: bank, Lastlight, and the skiff. */
const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const {safeClick, near, dump, tryStation, openDoor, doorsNear} = p;
let v = await look('71-stage5-start', {noShot: true});
// Combat Hall: a quick look at the training post now that I have a dagger (optional lesson)
await near(171, 121.2, 'combat hall', 8); v = await look('72-combat-hall-with-dagger');
await tryStation('73-training-post-dagger', 'Training post|dummy|post');
// bank
await near(169.5, 125.5, 'hall exit', 8); await near(163, 118.5, 'bank staff door', 8);
let ds = await doorsNear(8); out('doors', ds); if (ds.length) await openDoor(ds[0].label.replace(/^(Open|Close) /, ''));
await near(154, 117.5, 'bank', 8);
let r = await safeClick(FINDERS.bankBooth); out('booth click', r.clicked); const banked = await p.waitFor('Tutorial.step>=12', 20000); await sleep(800);
v = await look('74-bank-open'); out('bank lesson?', banked, 'step', v.step, v.objective, 'chat', v.chat.slice(-2));
const bankOpen = await p.page.evaluate(() => { const b = document.getElementById('bank-modal'); return !!(b && b.style.display === 'block'); }); out('bank modal open', bankOpen);
if (bankOpen){ const x = await p.page.evaluate(() => { const c = document.querySelector('#bank-modal .close-x'); const r = c.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }); await p.clickAt(x[0], x[1]); }
await dismiss();
// Lastlight
await near(157.5, 121.5, 'bank front', 6); await openDoor('Bank door'); await near(157.5, 124.5, 'outside', 6);
await near(170.5, 128.5, 'ridge road', 8); await near(184.5, 128.5, 'ridge east', 8); await near(193.5, 130.5, 'lastlight approach', 8); v = await look('75-lastlight-approach');
await poke('lastlight-door', FINDERS.lastlightDoor, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.lastlightDoor); const in1 = await p.waitFor('(Player.plane||0)===1', 20000); await sleep(1200); v = await look('76-lastlight-l1'); out('inside lastlight?', in1, v.plane, v.zone); await dump('lastlight l1', 12);
r = await safeClick("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===1&&/ground-floor ladder/.test(String(o.userData.label||'')))"); await p.waitFor('(Player.plane||0)===2', 20000); await sleep(1200); v = await look('77-lastlight-l2'); await dump('lastlight l2', 12);
r = await safeClick("WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===2&&/upper ladder/.test(String(o.userData.label||'')))"); await p.waitFor('(Player.plane||0)===3', 20000); await sleep(1200); v = await look('78-lantern-room'); await dump('lantern room', 12);
await poke('lever', FINDERS.lever, {dist: 9, pitch: 1.15});
r = await safeClick(FINDERS.lever); const lit = await p.waitFor('Tutorial.step>=13||Tutorial.complete', 30000); await sleep(1000); v = await look('79-lever-pulled'); out('lever?', lit, 'step', v.step, v.objective, 'dlg', v.dialogue, 'chat', v.chat.slice(-3)); await dismiss();
for (const [pl, re] of [[3, /lower ladder/], [2, /lower ladder/], [1, /Exit/]]){
  if ((await p.see()).plane !== pl) continue;
  await safeClick(`WORLD.clickables.find(o=>o.userData&&o.userData.kind==='climb'&&o.userData.plane===${pl}&&${re}.test(String(o.userData.label||'')))`);
  await p.waitFor(`(Player.plane||0)===${pl - 1}`, 15000); await sleep(1000);
}
v = await look('80-down-from-lastlight'); out('after lastlight: plane', v.plane, v.pos, v.objective, 'arrow', v.arrow);
// the road south to the dock
await near(193.5, 130.5, 'approach', 8); await near(184.5, 135.5, 'switchback', 8); await near(191.5, 141.5, 'road', 10); await near(193.5, 150.5, 'road s', 8); await near(205.5, 151.5, 'dock', 8);
v = await look('81-dock-final');
r = await safeClick(FINDERS.skiff); out('board click', r.clicked); await sleep(1500); v = await look('82-boat-clicked', {noShot: true});
if (v.dialogue){ out('BOAT DLG', v.dialogue); const o = v.dialogue.options.find(x => /board|sail|mainland|yes|go/i.test(x)); if (o) await p.chooseDialogue(o); }
const sailed = await p.waitFor("typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId!=='tutors-holm-v2'", 60000); await sleep(4000);
v = await look('83-mainland'); out('SAILED?', sailed, v.zone, v.provider, v.pos, 'pack', v.pack, 'chat', v.chat.slice(-4)); await dismiss();
v = await look('84-mainland-final');
// EXIT
