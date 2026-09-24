src=open('scratchpad/playtest/impatient/play4.js',encoding='utf-8').read()
src=src.replace("'scratchpad/playtest/impatient/run5-full'","'scratchpad/playtest/impatient/run6-full'")
src=src.replace("profile: 'impatient4'","profile: 'impatient5'").replace('[RUN5]','[RUN6]').replace('RUN5 ERROR','RUN6 ERROR')
# After launch: never click through the objective banner (a player sees the button; the harness pixel scan does not)
src=src.replace("""  await p.login();
  let v = await p.see(); await snap(p, v, 'arrival');""","""  const rawLocate = p.locate.bind(p);
  let bannerHazards = 0;
  p.clickObject = async (finderSrc, opts) => {
    opts = opts || {};
    for (const pitch of [opts.pitch || 0.95, 0.6, 1.3, 0.4]) {
      const loc = await rawLocate(finderSrc, Object.assign({}, opts, {pitch}));
      if (!loc.hit) { if (opts.keepCamera) break; continue; }
      const el = await p.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.tagName + '#' + (e.id || '') + ':' + (e.textContent || '').trim().slice(0, 24)) : null; }, loc.hit);
      if (!/^CANVAS/i.test(el || '')) {
        say(`  click at ${JSON.stringify(loc.hit)} would land on ${el}; tilting the camera instead`);
        if (/skip tutorial/i.test(el) && ++bannerHazards === 1) await p.note('critical', 'objective banner / Skip tutorial button, target ' + finderSrc.slice(0, 60), 'The object I wanted to click was drawn directly behind the "Skip tutorial" button at ' + JSON.stringify(loc.hit) + '. In run 5 the same click hit the button, ended the whole tutorial without confirmation, unlocked the dock and handed over an unearned dagger/pickaxe/hammer.', 'A confirmation on Skip, and a banner that does not sit over the play area');
        continue;
      }
      await p.clickAt(loc.hit[0], loc.hit[1], opts.right ? 'right' : 'left');
      p.logLine(opts.right ? 'right-click' : 'click', {finder: finderSrc.slice(0, 80), at: loc.hit, pitch});
      return {clicked: true, loc};
    }
    p.logLine('click-miss', {finder: finderSrc.slice(0, 80)});
    return {clicked: false, loc: null};
  };
  await p.login();
  let v = await p.see(); await snap(p, v, 'arrival');""")
open('scratchpad/playtest/impatient/play5.js','w',encoding='utf-8').write(src)
print('ok')
