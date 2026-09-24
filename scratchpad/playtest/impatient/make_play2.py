import re
src=open('scratchpad/playtest/impatient/play.js',encoding='utf-8').read()
src=src.replace("process.env.PT_OUT || 'scratchpad/playtest/impatient/run2-full'","process.env.PT_OUT || 'scratchpad/playtest/impatient/run3-full'")
src=src.replace("""async function stepChanged(p, fromId, ms){
  const ok = await p.waitFor(""","""async function stepChanged(p, fromId, ms){
  const cur = await p.page.evaluate(() => Tutorial.steps[Tutorial.step] && Tutorial.steps[Tutorial.step].id);
  if (cur !== fromId) { say(`  (stepChanged: current step is ${cur}, not ${fromId}; not waiting)`); return false; }
  const ok = await p.waitFor(""")
start=src.index("  await phase(p, 'C try to board")
end=src.index("  await phase(p, 'H descend")
new = r"""  await phase(p, 'D chop (click far, click again, walk off mid-chop)', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [126, 158];
    await rush(p, tgt[0] + 1, tgt[1] + 1, {maxLegs: 30});
    v = await p.see(); await snap(p, v, 'survival-wood'); await p.screenshot('survival-wood');
    const m = await p.clickObject(FINDERS.markedTree); say('  marked tree click', m.clicked, m.loc && m.loc.hit);
    await p.wait(1500); await farClick(p, v.pos[0] + 6, v.pos[1] + 2); await p.wait(1500);
    v = await p.see(); say('  walked off mid-chop: pos=' + JSON.stringify(v.pos) + ' pack=' + JSON.stringify(v.pack));
    if (!v.pack.some(x => /logs/.test(x))) { await p.clickObject(FINDERS.markedTree); }
    const ok = await stepChanged(p, 'chop_logs', 25000);
    v = await p.see(); await snap(p, v, 'after-chop'); await p.screenshot('after-chop');
    if (!ok) await p.note('high', 'Survival Wood marked tree', 'No logs after clicking the marked tree twice. pack=' + JSON.stringify(v.pack), 'Logs in pack');
    await dismiss(p);
  });

  await phase(p, 'E fire: light it right where I stand (next to the tree)', async () => {
    await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await p.wait(800);
    let ok = await stepChanged(p, 'light_fire', 20000);
    v = await p.see(); await snap(p, v, 'after-fire'); await p.screenshot('after-fire');
    if (!ok) { await farClick(p, v.pos[0] + 2, v.pos[1]); await p.wait(1500); await p.clickInventory('tinderbox'); await p.clickInventory('logs'); ok = await stepChanged(p, 'light_fire', 20000); v = await p.see(); if (!ok) await p.note('high', 'Survival Wood', 'Tinderbox on logs did not light a fire that counted. chat=' + JSON.stringify(v.chat.slice(-3)), 'Fire lit'); }
    p.fireLitAt = v.t; p.firePos = await objPos(p, FINDERS.campfire); say('  fire at', p.firePos, 'lit t=', v.t);
    await dismiss(p);
  });

  await phase(p, 'F fish: click the water first, then the net', async () => {
    v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [132, 156];
    await rush(p, tgt[0], tgt[1] + 1);
    const e = await p.clickObject(FINDERS.fishingEdge); say('  edge click', e.clicked); await p.wait(1200);
    v = await p.see(); say('  after edge click: chat=' + JSON.stringify(v.chat.slice(-1)));
    const n = await p.useItemOn('fishing_net', FINDERS.fishingEdge); say('  net->edge', n.clicked);
    let ok = await stepChanged(p, 'catch_fish', 40000);
    if (!ok) { await p.useItemOn('fishing_net', FINDERS.fishingEdge); ok = await stepChanged(p, 'catch_fish', 40000); v = await p.see(); if (!ok) await p.note('high', 'Fishing edge', 'Net on the fishing edge twice; no perch. chat=' + JSON.stringify(v.chat.slice(-3)), 'A perch'); }
    v = await p.see(); await snap(p, v, 'after-fish'); await p.screenshot('after-fish');
    await dismiss(p);
  });

  await phase(p, 'G cook: fire under the tree canopy?', async () => {
    v = await p.see();
    let fire = await objPos(p, FINDERS.campfire);
    say('  fire object present at', fire, 'elapsed', v.t, 'lit at', p.fireLitAt);
    if (fire) {
      await rush(p, fire[0] + 1, fire[1]);
      let c = await p.useItemOn('raw_perch', FINDERS.campfire); say('  perch->fire (default camera)', c.clicked, c.loc);
      await p.screenshot('cook-default-camera');
      if (!c.clicked) {
        await p.note('high', 'Survival Wood, campfire at ' + JSON.stringify(fire) + ' beside the marked tree at 124,161', 'Lit the fire where I finished chopping (next to the marked tree). From the default camera the campfire is completely hidden under the tree canopy: the "Cook on your fire" label floats over solid leaves and no pixel around it hits the fire (pixel scan radius 140px). Clicking the perch in the pack only says "You should cook this on a campfire first."', 'The fire should be visible/clickable where the label points, or canopies should fade when they hide an interaction target');
        for (const [pitch, dist, yawOff] of [[1.45, 7, 0], [1.2, 6, Math.PI / 2], [1.2, 6, -Math.PI / 2], [0.6, 6, Math.PI]]) {
          await p.page.evaluate(yo => { camCtl.yaw += yo; }, yawOff);
          c = await p.useItemOn('raw_perch', FINDERS.campfire, {pitch, dist}); say(`  perch->fire pitch=${pitch} dist=${dist} yawOff=${yawOff.toFixed(2)}`, c.clicked, c.loc && c.loc.hit);
          await p.screenshot('cook-camera-' + pitch + '-' + dist);
          if (c.clicked) break;
          await p.page.keyboard.press('Escape');
        }
        if (c.clicked) say('  WORKAROUND: tilting/zooming the camera exposed the fire');
      }
      await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /cook|perch/i);
      let ok = c.clicked && await stepChanged(p, 'cook_fish', 25000);
      v = await p.see(); say('  after cook attempt: pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)));
      if (!ok) { fire = await objPos(p, FINDERS.campfire); say('  fire still present?', fire); }
      if (!ok && !fire) await p.note('medium', 'Survival Wood, campfire', 'The fire burned out while I was still trying to reach it (lit at ' + p.fireLitAt + 's, gone by ' + v.t + 's); arrow now says "' + ((v.arrow || {}).label) + '"', 'A fire that lasts through one fishing trip');
    }
    v = await p.see();
    if (v.stepId === 'cook_fish') {
      const t2 = (v.arrow && v.arrow.target) || [128, 155]; say('  lighting another fire at arrow target', t2, v.arrow && v.arrow.label);
      await rush(p, t2[0] + 0.5, t2[1] + 0.5, {near: 0.8});
      if (!v.pack.some(x => /logs/.test(x))) { await rush(p, 127, 159); await p.clickObject(FINDERS.markedTree); await p.waitFor("Player.inv.some(s=>s&&/logs/.test(s.id))", 25000); await rush(p, t2[0] + 0.5, t2[1] + 0.5, {near: 0.8}); }
      await p.clickInventory('tinderbox'); await p.clickInventory('logs'); await p.wait(500);
      await p.waitFor(FINDERS.campfire, 15000); await p.wait(1500);
      fire = await objPos(p, FINDERS.campfire); say('  second fire at', fire);
      await p.screenshot('second-fire');
      let c = await p.useItemOn('raw_perch', FINDERS.campfire); say('  perch->fire2', c.clicked, c.loc && c.loc.hit);
      await p.wait(1000); v = await p.see(); if (v.dialogue) await dismiss(p, /cook|perch/i);
      let ok = await stepChanged(p, 'cook_fish', 25000);
      if (!ok) { c = await p.useItemOn('raw_perch', FINDERS.campfire, {pitch: 1.45, dist: 7}); await dismiss(p, /cook/i); ok = await stepChanged(p, 'cook_fish', 25000); v = await p.see();
        if (!ok) await p.note('high', 'Survival Wood second campfire ' + JSON.stringify(fire), 'Raw perch on the second (open-ground) fire did not cook. pack=' + JSON.stringify(v.pack) + ' chat=' + JSON.stringify(v.chat.slice(-3)), 'Cooked perch'); }
    }
    v = await p.see(); await snap(p, v, 'after-cook'); await p.screenshot('after-cook');
    await dismiss(p);
  });

"""
src=src[:start]+new+src[end:]
src=src.replace("profile: 'impatient', out: OUT","profile: 'impatient2', out: OUT")
src=src.replace("[RUN2]","[RUN3]").replace("RUN2 ERROR","RUN3 ERROR")
open('scratchpad/playtest/impatient/play2.js','w',encoding='utf-8').write(src)
print(len(src))
