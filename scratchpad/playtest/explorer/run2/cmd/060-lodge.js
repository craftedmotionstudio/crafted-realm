const L = re => `WORLD.clickables.find(o=>o.userData&&o.userData.kind!=='door'&&/${re}/i.test(String(o.userData.label||'').replace(/<[^>]+>/g,'')))`;
let v = await look('27-lodge-arrive');
// --- repro C: right-click the Quest board, click the objective banner (not the menu), walk away; does "Study" fire anyway?
let r = await p.rightClickObject(L('Quest board'), {dist: 9}); out('reproC right-click hit', r.clicked, r.loc && r.loc.hit); await sleep(300);
out('reproC rows', await p.ctxRows());
await p.clickAt(760, 40); await sleep(300);
out('reproC ctx open after banner click?', (await p.see()).ctxOpen);
await p.screenshot('28-reproC-after-banner-click');
let w = await p.walkTo(138.5, 134.5, {near: 1.0}); out('reproC walk away', w);
await sleep(2500);
v = await look('29-reproC-result');
out('reproC: step', v.step, 'dialogue', v.dialogue && v.dialogue.name, 'chat', v.chat.slice(-2));
await dismiss();
// --- poke the lodge furniture from close by
w = await p.walkTo(135.5, 132.5, {near: 1.2}); out('walk to board', w);
await poke('quest-board', L('Quest board'), {dist: 9});
await p.clickObject(L('Quest board'), {dist: 9}); await sleep(2000); v = await look('30-quest-board');
if (v.dialogue){ out('QUEST BOARD DLG', v.dialogue); const o = v.dialogue.options.find(x => /journal|quest/i.test(x)); if (o){ await p.chooseDialogue(o); await sleep(1200); v = await look('31-after-board-option'); } }
await dismiss();
const openModal = await p.page.evaluate(() => [...document.querySelectorAll('.modal')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.id));
out('modals open after board:', openModal);
if (openModal.length){ const x = await p.page.evaluate(id => { const c = document.querySelector('#' + id + ' .close-x'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, openModal[0]); if (x) await p.clickAt(x[0], x[1]); }
w = await p.walkTo(133.5, 134.5, {near: 1.2});
await poke('region-chart', L('Region chart'), {dist: 9});
await p.clickObject(L('Region chart'), {dist: 9}); await sleep(2000); v = await look('32-region-chart'); await dismiss();
const m2 = await p.page.evaluate(() => [...document.querySelectorAll('.modal')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.id)); out('modals after region chart:', m2);
if (m2.length){ const x = await p.page.evaluate(id => { const c = document.querySelector('#' + id + ' .close-x'); if (!c) return null; const r = c.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; }, m2[0]); if (x) await p.clickAt(x[0], x[1]); }
w = await p.walkTo(134.5, 137.5, {near: 1.2});
await poke('ledger', L('Ledger of Choices'), {dist: 9});
await p.clickObject(L('Ledger of Choices'), {dist: 9}); await sleep(2000); v = await look('33-ledger'); await dismiss();
await poke('scroll-rack', L('Scroll rack'), {dist: 9});
await p.clickObject(L('Scroll rack'), {dist: 9}); await sleep(2000); v = await look('34-scroll-rack'); await dismiss();
await poke('reading-bench', L('Reading bench'), {dist: 9});
v = await look('35-lodge-done', {noShot: true});
