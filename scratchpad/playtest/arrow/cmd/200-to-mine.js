await p.note('low', 'Campfire 128,155 (pack click)', 'Clicking the raw mirrorperch in the pack to use it on the fire printed "You should cook this on a campfire first." before the fire click roasted it — the pack click reads as an eat attempt, not as arming the item.', 'Clicking a raw fish while the objective says to cook it should arm it (or say "use it on the fire").');
let v = await p.see();
for (let i = 0; i < 4; i++){
  const tgt = v.arrow ? v.arrow.target : null; if (!tgt) break;
  const w = await p.walkTo(tgt[0] + 0.5, tgt[1] + 0.5, {near: 2, maxLegs: 20}); out('walk to arrow ' + v.arrow.label, w);
  v = await look('mine-leg-' + i);
  if (w.reached || (v.arrow && v.arrow.target[0] === tgt[0] && v.arrow.target[1] === tgt[1])) break;
}
out('nearby at mine', v.nearby.slice(0, 8));
