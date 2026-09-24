// try to take the bucket (label says "Take Bucket")
await p.clickObject("WORLD.clickables.find(o=>o.userData&&/Bucket/i.test(String(o.userData.label||'')))"); await sleep(1500);
let v = await look('05-take-bucket', {noShot: true});
out('bucket taken?', v.pack);
// walk in through the open door and read the plaque
let w = await p.walkTo(151.5, 162.5, {near: 1.5}); out('walk in', w);
await poke('plaque', "WORLD.clickables.find(o=>o.userData&&/plaque/i.test(String(o.userData.label||'')))");
await p.clickObject("WORLD.clickables.find(o=>o.userData&&/plaque/i.test(String(o.userData.label||'')))"); await sleep(1500);
v = await look('06-plaque-click'); await dismiss();
await poke('register', K('holm_register'));
await p.clickObject(K('holm_register')); await sleep(1500); v = await look('07-register-click'); await dismiss();
await poke('region-map', K('holm_region_map'));
await p.clickObject(K('holm_region_map')); await sleep(1500); v = await look('08-regionmap-click'); await dismiss();
await poke('provisions', K('holm_provisions'));
await p.clickObject(K('holm_provisions')); await sleep(1500); v = await look('09-provisions-click'); await dismiss();
// the chart: read its menu only, do not study it yet
const r = await poke('chart', FINDERS.reliefChart, {noExamine: true});
// click the chart from far away: stand at the door (151.5,167) and click it
await p.walkTo(151.5, 166.5, {near: 1.0});
await p.clickObject(FINDERS.reliefChart, {dist: 20}); await sleep(3000);
v = await look('10-chart-from-door');
out('chart from door: step', v.step, 'pos', v.pos, 'dlg', !!v.dialogue);
await dismiss();
