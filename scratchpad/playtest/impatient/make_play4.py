src=open('scratchpad/playtest/impatient/play3.js',encoding='utf-8').read()
src=src.replace("'scratchpad/playtest/impatient/run4-full'","'scratchpad/playtest/impatient/run5-full'")
src=src.replace("profile: 'impatient3'","profile: 'impatient4'").replace('[RUN4]','[RUN5]').replace('RUN4 ERROR','RUN5 ERROR')
# 1. rush(): when no ground is clickable toward the target (canopy over the ground), step out sideways like a player would, then retry once
src=src.replace("""  const r = await p.walkTo(x, z, Object.assign({maxLegs: 24}, opts || {}));
  const v = await p.see();""","""  let r = await p.walkTo(x, z, Object.assign({maxLegs: 24}, opts || {}));
  if (!r.reached && /no clickable ground/.test(r.reason || '')) {
    say('  no clickable ground toward target; stepping out sideways');
    const here = await p.page.evaluate(() => [player.position.x, player.position.z]);
    for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4], [4, 4], [-4, -4], [4, -4], [-4, 4]]) {
      const px = await farClick(p, here[0] + dx, here[1] + dz);
      if (px) { await p.wait(1500); break; }
    }
    r = await p.walkTo(x, z, Object.assign({maxLegs: 24}, opts || {}));
  }
  const v = await p.see();""")
# 2. catch_fish: do not toggle the net off; leave the canopy first; detect a silent no-op
start=src.index("H.catch_fish = async (p, n) => {")
end=src.index("H.cook_fish = async")
new=r"""H.catch_fish = async (p, n) => {
  let v = await p.see(); const tgt = (v.arrow && v.arrow.target) || [132, 156];
  if (n >= 2) { say('  leaving the canopy via open ground first'); await rush(p, 128.5, 155.5, {near: 1.5}); }
  await rush(p, tgt[0], tgt[1] + 1);
  if (n === 1) { const e = await p.clickObject(FINDERS.fishingEdge); await p.wait(1200); v = await p.see(); say('  plain edge click', e.clicked, JSON.stringify(v.chat.slice(-1))); await p.screenshot('edge-plain-click'); await p.clickObject(FINDERS.fishingEdge, {keepCamera: true}); await p.wait(1000); }
  const armed = await p.page.evaluate(() => Player.usingItem);
  if (armed !== 'fishing_net') await p.clickInventory('fishing_net');
  const before = (await p.see()).chat.length;
  const c = await p.clickObject(FINDERS.fishingEdge); say('  net->edge', c.clicked, c.loc && c.loc.hit);
  await p.wait(1500); v = await p.see();
  const said = v.chat.slice(-2).some(x => /head for the fishing spot|lower the small net|already/i.test(x));
  say('  after net->edge: chat=' + JSON.stringify(v.chat.slice(-2)) + ' usingItem=' + v.usingItem + ' moving=' + v.moving);
  if (c.clicked && !said && !v.moving) { await p.note('high', 'Survival Wood fishing edge, standing at ' + JSON.stringify(v.pos) + ' under the tree canopy', 'With the net out ("You take out the small net. Now click a fishing spot to use it."), clicking the fishing water did nothing at all: no walk, no chat line, the net stayed armed. The same click from 131.5,157.5 works.', 'Either walk to the spot and fish, or say why not'); await p.screenshot('net-click-silent'); }
  return stepDone(p, 'catch_fish', 45000);
};
"""
src=src[:start]+new+src[end:]
open('scratchpad/playtest/impatient/play4.js','w',encoding='utf-8').write(src)
print('ok')
