/* Run 3, stage 2: Combat Hall, Bank and Mine Gatehouse before any lesson; then Survival Wood the wrong way. */
const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
const {safeClick, near} = p;
const doorsNear = async (rad) => p.page.evaluate(rad => (WORLD.doors||[]).map(d => ({label: String(d.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(d.position.x), Math.floor(d.position.z)], d: +Math.hypot(d.position.x - player.position.x, d.position.z - player.position.z).toFixed(1)})).filter(d => d.d < rad).sort((a,b) => a.d - b.d), rad || 8);
const dump = async (tag, rad) => { const k = await p.page.evaluate(rad => (WORLD.clickables||[]).filter(o => o.userData && o.userData.kind).map(o => { const c = o.getWorldPosition(new THREE.Vector3()); return {kind: o.userData.kind, label: String(o.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(c.x), Math.floor(c.z)], d: +Math.hypot(c.x - player.position.x, c.z - player.position.z).toFixed(1)}; }).filter(o => o.d < rad).sort((a,b) => a.d - b.d), rad || 12); out(tag + ' clickables:', k); return k; };
const tryStation = async (name, re, opts) => { const exists = await p.page.evaluate(src => !!eval(src), L(re)); if (!exists){ out('no object', re); return null; } await poke(name, L(re), Object.assign({dist: 9, pitch: 1.15}, opts || {})); const r = await safeClick(L(re)); await sleep(2200); const v = await look(name); await dismiss(); return v; };
const openDoor = async (label) => { const r = await safeClick(FINDERS.door(label)); out('door ' + label, r.clicked); await sleep(1000); };
p.dump = dump; p.tryStation = tryStation; p.openDoor = openDoor; p.doorsNear = doorsNear;
// road back west then north to Warden's Ridge: Combat Hall entry (176.5,116.5)
await near(191.5, 141.5, 'road', 8); await near(184.5, 135.5, 'switchback base', 8); await near(184.5, 128.5, 'north', 8); await near(176.5, 118.5, 'combat hall entry', 10);
let v = await look('14-combat-hall-outside'); await dump('combat hall', 14);
let ds = await doorsNear(10); out('doors', ds);
if (ds.length) await openDoor(ds[0].label.replace(/^(Open|Close) /, ''));
await near(171, 121.2, 'combat hall service', 8); v = await look('15-combat-hall-inside');
await tryStation('16-arms-rack', 'Arms rack|rack');
await tryStation('17-training-post', 'Training post|dummy|post');
await tryStation('18-warden-roll', 'Warden|roll');
await tryStation('19-archery-butt', 'Archery');
// Bank: exit by the hall's west door toward the bank staff door
await near(169.5, 125.5, 'hall exit', 8); await near(163, 118.5, 'bank staff door', 8); v = await look('20-bank-outside');
ds = await doorsNear(8); out('doors', ds);
if (ds.length) await openDoor(ds[0].label.replace(/^(Open|Close) /, ''));
await near(154, 117.5, 'bank service', 8); v = await look('21-bank-inside'); await dump('bank', 12);
await tryStation('22-bank-plaque', 'plaque');
await tryStation('23-bank-ledger', 'ledger');
await poke('bank-booth', FINDERS.bankBooth, {dist: 9, pitch: 1.15});
let r = await safeClick(FINDERS.bankBooth); await sleep(2000); v = await look('24-bank-booth-early');
const bankOpen = await p.page.evaluate(() => { const b = document.getElementById('bank-modal'); return !!(b && b.style.display === 'block'); }); out('bank opened before lessons?', bankOpen, 'step', v.step, 'chat', v.chat.slice(-2));
if (bankOpen) await p.page.evaluate(() => document.querySelector('#bank-modal .close-x').click());
await dismiss();
// Mine Gatehouse: bank front door (157,120) then west along the road to the gate (124.5,119.5)
await near(157.5, 121.5, 'bank front door inside', 6); await openDoor('Bank door');
await near(157.5, 124.5, 'outside bank', 6); await near(145.5, 126.5, 'road west', 8); await near(133.5, 121.5, 'gatehouse east door', 8); v = await look('25-gatehouse-outside'); await dump('gatehouse', 14);
await near(124.5, 124.5, 'south gate', 8); v = await look('26-south-gate');
await tryStation('27-gate-stone', 'Gate stone');
ds = await doorsNear(8); out('doors', ds);
for (const d of ds) await openDoor(d.label.replace(/^(Open|Close) /, ''));
await near(124.5, 119.5, 'winch house', 8); v = await look('28-winch-house'); await dump('winch', 10);
await tryStation('29-ore-tally', 'tally');
const wr = await poke('winch-frame', FINDERS.winchFrame, {dist: 9, pitch: 1.15, noExamine: true});
if (wr.rows.some(x => /climb/i.test(x))){ await safeClick(FINDERS.winchFrame, {}, true); await sleep(300); await p.chooseRow('Climb'); await sleep(2500); v = await look('30-climb-early'); out('climb early: plane', v.plane, 'chat', v.chat.slice(-2), 'dlg', v.dialogue); await dismiss(); }
r = await safeClick(FINDERS.winchFrame); await sleep(2500); v = await look('31-winch-left-click-early'); out('winch left-click early: plane', v.plane, 'chat', v.chat.slice(-2), 'dlg', v.dialogue); await dismiss();
if (v.plane === -1){ await p.note('high', 'Mine Gatehouse winch (124,119)', 'Climb-down worked before any lesson; I am in the cavern with no pickaxe', 'The shaft should be locked until the survival lessons, or the game should say why'); }
