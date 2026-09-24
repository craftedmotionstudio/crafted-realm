await p.note('low', 'Arrival tile 151,169 (chat box)', 'Chat on arrival shows "Deed complete: <b>Apprentice</b> — 50 crowns!" with raw <b> tags, and a "[COOK] The bread-making chain is lit" line before I have done anything.', 'Clean text; no deed/cook messages before the first lesson.');
await p.note('medium', 'Arrival tile 151,169 (chat vs banner)', 'Chat says "Your adventurer is ready. Talk to Guide Bram by the rowboat." while the banner says "Enter the Guide Hall and study the relief chart" and the arrow says "Study the island chart". Two different first instructions.', 'One first instruction; chat and banner should agree.');
// follow the arrow: walk toward its target
let v = await p.see();
out('arrow target', v.arrow && v.arrow.target);
const w = await p.walkTo(151.5, 157.5);
out('walk', w);
v = await look('at-chart');
const c = await p.clickObject(FINDERS.reliefChart);
out('click chart', c);
await p.waitFor('Tutorial.step >= 1', 15000);
await sleep(1500);
v = await look('after-chart');
