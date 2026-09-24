// which modal is open? (read-only) then close it with its X like a player
const modal = await p.page.evaluate(() => { const ms = [...document.querySelectorAll('[id$="-modal"], .modal')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'); return ms.map(e => ({id: e.id, cls: e.className, title: (e.querySelector('h2,h3,.title,.modal-title')||{}).textContent})); });
out('open modals:', modal);
const x = await p.page.evaluate(() => { const c = [...document.querySelectorAll('.close-x, .modal-close, [class*="close"]')].filter(e => e.getBoundingClientRect().width > 0); if (!c.length) return null; const r = c[0].getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2, c[0].className, c[0].parentElement.id]; });
out('close button at', x);
if (x) await p.clickAt(x[0], x[1]);
await sleep(400);
let v = await look('11-after-close-map');
// walk back in
let w = await p.walkTo(146.5, 170.5, {near: 1.5}); out('walk1', w);
w = await p.walkTo(151.5, 168.5, {near: 1.5}); out('walk2', w);
w = await p.walkTo(151.5, 162.5, {near: 1.5}); out('walk3', w);
v = await look('12-inside-again');
// what can I click inside the hall? (read-only listing of kinds so my finders are right)
const kinds = await p.page.evaluate(() => (WORLD.clickables||[]).filter(o => o.userData && o.userData.kind).map(o => { const c = o.getWorldPosition(new THREE.Vector3()); return {kind: o.userData.kind, label: String(o.userData.label||'').replace(/<[^>]+>/g,''), tile: [Math.floor(c.x), Math.floor(c.z)], d: +Math.hypot(c.x - player.position.x, c.z - player.position.z).toFixed(1)}; }).filter(o => o.d < 16).sort((a,b) => a.d - b.d));
out('hall clickables:', kinds);
await poke('register', K('holm_register'));
await p.clickObject(K('holm_register')); await sleep(1500); v = await look('13-register-click'); await dismiss();
await poke('provisions', K('holm_provisions'));
await p.clickObject(K('holm_provisions')); await sleep(1500); v = await look('14-provisions-click'); await dismiss();
const r = await poke('chart', FINDERS.reliefChart, {noExamine: true});
