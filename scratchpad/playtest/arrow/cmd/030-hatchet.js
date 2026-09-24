await p.note('medium', 'Guide Hall, relief chart (151,155)', 'Right after the chart the banner says "Open your pack and wield the Bronze hatchet." but the guidance arrow label says "Leave by the Teaching door" (target 151,141) with the edge arrow lit. The text and the arrow tell me two different things at once.', 'Arrow should point at the pack (or be hidden) until the hatchet is wielded, then point at the door.');
await p.note('low', 'Guide Hall, relief chart hover text', 'Hover text at top-left reads "Study orientation_table / 2 more options" — an internal id with an underscore.', 'A player-facing name, e.g. "Study Relief chart".');
await p.note('low', 'Guide Hall chat', 'Chat says "Guide Bram hands you a survival kit" but there is no Guide Bram anywhere near me; the kit appeared from studying a table.', 'Either Bram is present and hands it over, or the line says the kit was found at the table.');
// the dialogue offers one button; press it, as the text says
const d = await p.chooseDialogue('Trace the route');
out('dialogue pressed', d);
await sleep(800);
let v = await look('after-trace');
// banner: open your pack and wield the hatchet. The pack is already the open tab; click the hatchet.
const ok = await p.clickInventory('hatchet');
out('clicked hatchet', ok);
await sleep(1200);
v = await look('after-hatchet-click');
