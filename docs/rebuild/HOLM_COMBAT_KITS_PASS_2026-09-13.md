# Durable initial combat teaching kits — 2026-09-13

Previous pass: progress through killing-attack attribution. This pass replaces unchecked, per-session teaching grants with a durable atomic service. Full tutorial and island completion remain unfinished.

## Change

`src/holm_combat_kits.js` uses the existing reward planner. Initial ranged supplies target one worn bow and 30 arrows; magic targets 15 air and 15 mind runes. Ownership in inventory, equipment and bank counts toward those amounts; existing excess is untouched and bank contents are never moved. Bank-held supplies produce withdrawal guidance. This deliberately replaces the old unconditional additive consumable grants with a deficit-only initial kit.

Inventory and `Tutorial.combatKitClaims` are installed together, then saved. A false or thrown save restores the exact prior inventory/claim references and permits retry. Failed capacity/validation never claims a kit. Successful inventory updates preserve existing slot metadata. Repeat claims do not refill consumed supplies or re-save. The banner calls the service instead of latching before unchecked addItem operations. Lesson copy no longer asserts Bram has handed over items before success.

SaveGame serializes the claim map and loads only literal-true ranged/magic flags. Legacy records without it load unclaimed; ownership-aware deficit calculation avoids duplicating supplies still held. The optional field does not change outer save version 1 or the curriculum version. Index loads the service and updates tutorial_ext to v3 and ui_save to v12.

## Verification

`node tools/test_holm_combat_kits.js`: **18/18 PASS**. Actual service/planner and actual ui_save serialize/load tests cover both kits, ownership/partial/excess supplies, full pack, repeat and reload, exhausted claimed kit, invalid/corrupt/overflow data, metadata, rollback for false/thrown saves, legacy defaults and strict flags. `test_holm_combat_credit.js`: 28/28 PASS after the banner integration. Syntax checks pass.

Final saved-profile foreground in-app smoke: **105/105 PASS**, boot 704 ms, walk 3119 ms, six boundaries with exact/lossless save-load, 60 FPS, worst 22 ms, 115 draw calls, 33,980 triangles, seven ticks, zero errors. Evidence is banked in `scratchpad/holm_perf/combat-kits-smoke.json`; this exercises current startup/movement/streaming/save behavior, not a combat-kit lesson, since the installed curriculum still omits those steps.

## Remaining acceptance

This is an initial kit, not the required ongoing recovery service. Lost bow/consumed ammunition and rune recovery still need a deliberate teacher interaction and economy rules; repeated banners intentionally cannot refill them. No modeled teacher/target, provider/lesson authorization inside the service, real-pointer grant failure/retry, teaching encounter, or full 18-lesson save/reload circuit is claimed. The service is called only by the existing current-style lesson banner. New island art and world integration remain unfinished; no world publish occurred.
