// the bank window is still open; close it the way a player would (its close control), then follow the arrow
let closeBtn = await p.page.evaluate(() => { const m = document.getElementById('bank-modal'); if (!m) return null; const cands = [...m.querySelectorAll('button, .close, [class*=close], span')].filter(e => /close|✕|×|x$/i.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0); if (!cands.length) return null; const r = cands[0].getBoundingClientRect(); return {text: cands[0].textContent.trim(), at: [r.left + r.width / 2, r.top + r.height / 2]}; });
out('bank close control', closeBtn);
if (closeBtn){ await p.page.mouse.click(closeBtn.at[0], closeBtn.at[1]); p.logLine('click-bank-close', closeBtn); await sleep(500); }
let shown = await p.page.evaluate(() => document.getElementById('bank-modal').style.display); out('bank display after close', shown);
if (shown === 'block'){ await p.page.keyboard.press('Escape'); await sleep(400); shown = await p.page.evaluate(() => document.getElementById('bank-modal').style.display); out('after Escape', shown); }
let v = await look('leaving-bank');
let lastTarget = null;
for (let i = 0; i < 10 && v.stepId === 'relight_lastlight'; i++){
  if (!v.arrow || !v.arrow.target) break;
  const tgt = v.arrow.target;
  if (lastTarget && tgt[0] === lastTarget[0] && tgt[1] === lastTarget[1]) break;
  lastTarget = tgt;
  const w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2, maxLegs: 30}); out('walk to arrow "' + v.arrow.label + '" ' + tgt, w);
  v = await look('lastlight-leg-' + i);
  out('now', v.arrow, v.pos, v.plane, v.zone, v.nearby.slice(0, 5).map(n => n.label + '@' + n.tile));
}
