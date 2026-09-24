// provisions rack from close by
let w = await p.walkTo(159.5, 156.5, {near: 1.5}); out('walk to rack', w);
await poke('provisions', K('holm_provisions'));
await p.clickObject(K('holm_provisions')); await sleep(2500); let v = await look('15-provisions-click'); await dismiss();
// the plaque: left-click it and see what opens
w = await p.walkTo(146.5, 160.5, {near: 1.5});
await poke('plaque', K('holm_story_clue'));
await p.clickObject(K('holm_story_clue')); await sleep(2000); v = await look('16-plaque-open');
const modal = await p.page.evaluate(() => [...document.querySelectorAll('.modal')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.id));
out('modals after plaque click:', modal);
if (modal.includes('worldmap-modal')){
  // a curious player clicks "Veyhollow" on the map (the map says click anywhere to walk there)
  await p.clickAt(729, 392); await sleep(2500);
  v = await look('17-map-click-veyhollow');
  out('after clicking Veyhollow on the map: pos', v.pos, 'zone', v.zone, 'chat', v.chat.slice(-2));
  const still = await p.page.evaluate(() => { const m = document.getElementById('worldmap-modal'); return m && m.getBoundingClientRect().width > 0; });
  if (still){ const x = await p.page.evaluate(() => { const c = document.querySelector('#worldmap-modal .close-x'); const r = c.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }); await p.clickAt(x[0], x[1]); }
}
await dismiss();
// try the Teaching door before studying the chart
w = await p.walkTo(151.5, 145.5, {near: 1.5}); out('walk to teaching door', w);
await poke('teaching-door', FINDERS.door('Teaching door'));
await p.clickObject(FINDERS.door('Teaching door')); await sleep(1500); v = await look('18-teaching-door-early');
w = await p.walkTo(151.5, 140.5, {near: 1.2}); out('walk through teaching door early', w);
v = await look('19-outside-north', {noShot: true});
