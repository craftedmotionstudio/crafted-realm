# Shared bread recipe and new bakehouse flow — 2026-09-13

Status: shared runtime conversion repair plus a verified interactive Studio recipe flow. Full game integration and island acceptance remain incomplete. The preceding turn was progress: modeled supplies and measured station routes.

## Shared runtime logic

`src/bread_recipe.js` plans mix/bake inventory conversions without mutating input slots. It rejects missing ingredients, malformed/unknown item slots, unknown output definitions and insufficient capacity. Success returns a new inventory plus base XP/event metadata; it does not grant XP, emit lessons or save anything itself.

`src/cooking_bread.js` now uses that planner, commits the resulting inventory only on success, then follows the existing `Player.addXp` and tutorial notification seams. Recipe remains flour bucket + water bucket + dough → bread dough → bread. Base bake XP40 and bake/bread event unchanged. Both filled buckets are still consumed, matching the recorded existing recipe. Raw-fish handling still forwards to the original click handler. Failed conversions do not consume ingredients or grant XP/event credit. Index loads the planner before the bread wrappers.

Tests: `node tools/test_bread_recipe.js` **31/31 PASS**; `node tools/test_bread_recipe_wrappers.js` **6/6 PASS**. The second suite executes actual wrappers in a controlled VM. Coverage includes immutable input/metadata, full inventory with freed input slots, capacity failure when quantities free no slot, malformed slots, missing definitions, exact XP/event, commit-before-XP, failure preserving ingredients, cancellation and single timer execution. Initial tests exposed empty/unknown IDs being accepted; validation was repaired before the passing run.

## Interactive new-model flow

`tools/studio_holm_kitchen_recipe.js` connects the v5 measured service stances to collection, mixing and baking buttons in the walking Studio. Each request walks along the measured cardinal graph and checks the exact station node before acting. The two-bucket loan cap and ingredient requirements are enforced. Mixing/baking use the same planner as the installed game.

The study intentionally has a temporary28-slot pack and displays base Cooking XP. It does not use the real Player, configured XP multiplier, tutorial ledger or game save; it grants no real game progress. Its text inventory is a testing surface, not accepted final 2D inventory art.

Real in-app button sequence, with no programmatic gameplay calls or teleport:

1. Take bucket: walk from courtyard to bucket stance, receive one.
2. Take second bucket; attempt third refused, count remains two.
3. Fill with flour: walk to sacks, one flour bucket/one empty bucket.
4. Fill with water: return to pantry stance, one flour/one water.
5. Take dough: walk to proving bowl, receive one dough.
6. Knead: exactly one bread dough, no other ingredients,0base XP.
7. Bake: walk to oven, exactly one bread and40base Cooking XP.
8. Bake again without dough: refused, remains one bread/40base XP.

No browser console warnings/errors. Evidence: `scratchpad/holm_perf/bakehouse-recipe-loaf.png`, `bakehouse-recipe-repeat-refused.png`, `bakehouse-recipe-actions.json`. Preview paused after verification.

Direct interaction review: prompts and temporary pack changes are readable, station actions wait for arrival, no free remote grants in the tested sequence. Sidebar is crowded with both exploration and recipe controls and requires scrolling; this is a Studio testing UI. Model art remains the prior provisional8.1, below final acceptance. No model geometry or textures changed this pass.

## Remaining required scope

Bind the new-world service data to real Player inventory, configured XP and required lesson events; preserve and prove save/reload/migration. Add the required modeled chef, recipe-state visuals and 2D sprite UI coverage. Restore all18lessons and departure eligibility together. The existing bake polling path still lacks a bounded unreachable timeout and comprehensive plane/line-of-sight enforcement; those are not fixed by an inventory planner. No Safe Publish apply, no completed-island claim.

Foreground ordinary-game smokePASS105/105,boot887ms,walk3597ms,sixstreamboundaries/exactlosslesssave-load,60FPS,worst30ms,124draws,34268triangles,seven ticks,zeroerrors. New breadwrapperv2 boot log verified. Evidence scratchpad/holm_perf/bakehouse-recipe-smoke.json. This protects the installed game's startup and general flows;it is not a live bake/save/reload proof. Temporary tab closed.
