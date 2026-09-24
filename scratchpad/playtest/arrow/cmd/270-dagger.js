let card = await p.page.evaluate(() => { const els = [...document.querySelectorAll('*')].filter(e => e.children.length < 8 && /Bronze dagger/i.test(e.textContent) && e.getBoundingClientRect().width > 40 && e.getBoundingClientRect().width < 200); if (!els.length) return null; const r = els[els.length - 1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
out('dagger card at', card);
if (!card){ await p.cclick(FINDERS.anvil); await sleep(1500); card = await p.page.evaluate(() => { const els = [...document.querySelectorAll('*')].filter(e => e.children.length < 8 && /Bronze dagger/i.test(e.textContent) && e.getBoundingClientRect().width > 40 && e.getBoundingClientRect().width < 200); if (!els.length) return null; const r = els[els.length - 1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); out('dagger card (2nd try)', card); }
if (card){ await p.page.mouse.click(card[0], card[1]); p.logLine('click-card', {text: 'Bronze dagger', at: card}); }
let ok = await p.waitFor("Tutorial.step >= 11", 40000); out('forged', ok);
await sleep(1000);
let v = await look('after-forge-2');
out('banner now', v.objective, v.arrow);
