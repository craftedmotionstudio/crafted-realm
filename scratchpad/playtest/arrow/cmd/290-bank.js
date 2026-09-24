const booth = "WORLD.clickables.find(o=>o.userData&&/Bank booth/.test(String(o.userData.label||''))&&Math.abs(o.getWorldPosition(new THREE.Vector3()).x-154.5)<1.5)";
let c = await p.cclick(booth); out('click bank booth', c);
await sleep(2000);
let v = await look('booth-clicked');
if (v.dialogue){ out('dialogue', v.dialogue); const opt = v.dialogue.options.find(o => /open|account|yes/i.test(o)) || v.dialogue.options[0]; await p.chooseDialogue(opt); out('chose', opt); await sleep(1500); v = await look('after-dialogue'); if (v.dialogue){ out('dialogue2', v.dialogue); await p.chooseDialogue(v.dialogue.options[0]); await sleep(1000); } }
let ok = await p.waitFor("Tutorial.step >= 12", 30000); out('bank step done', ok);
await sleep(800);
v = await look('after-bank');
out('banner', v.objective, v.arrow, v.pos);
const bankOpen = await p.page.evaluate(() => { const b = document.getElementById('bank-modal') || document.querySelector('[id*=bank]'); return b ? {id: b.id, shown: b.style.display} : null; });
out('bank ui', bankOpen);
if (bankOpen && bankOpen.shown && bankOpen.shown !== 'none'){ await p.page.keyboard.press('Escape'); await sleep(500); const closed = await p.clickButtonByText('close'); out('closed bank', closed); }
v = await look('bank-closed');
