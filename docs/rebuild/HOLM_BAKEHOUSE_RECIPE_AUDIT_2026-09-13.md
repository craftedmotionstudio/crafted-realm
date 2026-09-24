# Bakehouse recipe integration audit — 2026-09-13

Read-only source audit; only this new report was written. Base guard passed: `src/holm_teaching_kitchen_interactions.js` exists. Read `GUIDING_LIGHT.md` and `AGENT_SPEC_TEMPLATE.md`. No browser, runtime mutation, asset placement, or publish was performed. Source line references describe the inspected checkout, not proof that the new Blender bakehouse is integrated.

## Existing recipe and event contract

- `src/cooking_bread.js:15–20,65–66` declares missing-only item definitions for `dough`, `bucket`, `bucket_flour`, `bucket_water`, `bread_dough`. Existing IDs win. In particular `src/game1_data.js:30,32,62` already defines water, bread, and bread dough; bread heals 4 and has value 4, and the existing bread-dough value is 4 rather than the fallback value 3.
- The actual recipe is **one `bucket_flour` + one `bucket_water` + one `dough` → one `bread_dough`** (`cooking_bread.js:26–35`). Both filled buckets are consumed. No empty buckets are returned. There is no skill requirement, failure roll, or mixing XP in this function. This is an observation of current behavior, not an endorsement of bucket consumption as the final design.
- Clicking any flour/water/dough inventory slot attempts that complete recipe; clicking bread dough arms/disarms `Player.usingItem` (`cooking_bread.js:70–84`). This is a forgiving inventory interaction, not a worktable crafting service.
- Armed bread dough on an object with `userData.kind === 'fire'` calls `orderWalk`, polls every 200 ms, requires the item still armed/present, no competing `Player.action`, and 3D distance at most 2.4 (`cooking_bread.js:41–57,90–99`). Then it removes one dough, adds one `bread`, calls `Player.addXp('Cooking',40)`, clears selection and emits `Tutorial.notify('bake','bread')`. There is no bake-duration animation, burn roll, or explicit plane/line-of-sight validation in that loop. The poll has no explicit unreachable timeout.
- **40 is base XP**, not necessarily the final XP delta. `src/game3_systems.js:212–227` multiplies through `GameConfig.xpMult(s)`, updates XP/level UI and emits the generic `xp` event. Preserve this seam and the existing XP table.
- Inventory remove/add return values are ignored by the recipe (`cooking_bread.js:31–32,50–52`). Ordinary sequential inventory operations free enough slots, but `Player.addItem` can return false and `removeItem` reports success (`game3_systems.js:229–254`). An integration must not issue success/XP on a failed transaction.

## Existing kitchen services and their limitations

`index.html:941,962,967,971` loads bread, tutorial, station reach and kitchen scripts. The bread wrappers self-install on an 1800 ms guard (`cooking_bread.js:60–107`).

The old kitchen module binds `world-object-holm_teaching_kitchen` and only acts under provider `tutors-holm-v2` (`src/holm_teaching_kitchen_interactions.js:16–39`). Its range proxy uses local `(1.35,2.75)` and projects Y through `groundY`; that is not a measured new-model floor contract. The registered services at lines 164–171 hardcode old local coordinates:

| Service | Local X,Z | Inventory effect |
|---|---|---|
| Range | 1.35, 2.75 | Dispatches armed bread dough or ordinary raw-perch cooking |
| Flour bin | 4.45, -3.95 | One empty bucket → flour bucket |
| Water butt | 4.6, -0.35 | One empty bucket → water bucket |
| Dough trough | 3.3, -3.2 | One dough, if neither dough nor bread dough is held |
| Bucket shelf | -5.5, -3.5 | Take empty bucket, or return one |
| Recipe board | -5.2, -3.75 | Recipe dialogue |

Handlers at lines 70–108 count only inventory buckets, cap held empty/filled buckets at two, and use available-space checks before taking an item. Filling swaps one item for another. The baked loaf is repeatable. The range supports bread and raw perch (`45–59`); other armed items are cleared with explanatory text. The station is marked `acceptsUseItem:true` in old building data (`src/world_v2_building_data.js:301`); the input dispatch depends on that marker (`src/game4_ui.js:631`). Preserve it in the new service proxy.

`src/holm_station_reach.js:18–27` measures horizontal distance to a transformed local station tile (default reach 1.15), then uses `Sched.walkThen`. It **fails open** when the root/player or scheduler/walk function is missing (calls the handler), and does not check the player's floor. Do not transfer these assumptions to the two-storey bakehouse. Measured cardinal station routes must terminate on the correct floor, and missing navigation/root dependencies must refuse safely.

The range flame is looked up by semantic part `range_flame`, scales with periodic flicker, and receives a point light (`holm_teaching_kitchen_interactions.js:131–157`). New mesh semantics and light-budget integration need deliberate binding; a new model alone does not supply this behavior.

## Curriculum and save mismatch

`TUTORIAL_ISLAND.md:16,26–28` requires a chef in a chef outfit to grant dough, flour and water, followed by mixing and using the range before proceeding. Its further stations explicitly teach quests, melee, ranged and magic (`30–48`). The later overhaul requirement says all original lessons and modeled characters remain required and prior optional/deferred labels cannot remove them (`docs/rebuild/HOLM_OVERHAUL_GOAL_2026-09-12.md:8,45`). A self-service shelf is useful recovery support, not evidence that the chef requirement is complete.

Current data contains **18 lesson records** (`src/holm_tutorial_flow_data.js:50–88`), but five are optional: `bake_bread`, `learn_quests`, `melee_trial`, `ranged_trial`, `magic_trial`. `runtimeSteps()` filters to 13 (`90–97`), and acceptance checks explicitly enforce that reduction (`115–119`). `src/tutorial_holm.js:31–32` installs that filtered list; its historical comments describe omitted combat and discarded earlier steps (`12–22`). Therefore a current thirteen-step green gate cannot prove the full requested curriculum.

The kitchen wraps `Tutorial.notify` and marks `Tutorial.optional.bake_bread` on **any** `bake/bread` event, without a provider/range check in that wrapper (`holm_teaching_kitchen_interactions.js:111–128`). It calls `SaveGame.save(true)` before calling the original notify. Original notify advances only the matching current lesson (`game4_ui.js:1206–1215`). If bread becomes required, this ordering can persist the optional marker before the required-step advance; repeated bakes skip the marker's immediate save entirely. The recipe itself makes no direct save call.

`src/ui_save.js:29–37` serializes inventory, XP, current lesson/version/completion and optional flags; lines 72–74 and 100–124 restore them. Existing complete saves remain complete (`105–107`). Version-4 to version-5 migration explicitly skips saved `bake_bread` to `descend_cavern` (`115–119`). Expanding the curriculum requires deliberate migration by stable lesson IDs, preservation of existing items/XP/completion/optional evidence, and a documented policy for already graduated characters. Numeric step indexes alone cannot establish past completion of newly restored lessons.

## Required next integration and proof

1. Bind the new Blender oven, prep surface, pantry supplies, recipe and animated heat to explicit service data and measured reachable stances. Include bucket, water, flour and dough access; a generic pantry target alone does not prove all four supplies. Replace old coordinate/root assumptions; preserve click-to-walk and item-use dispatch, floor identity, and refusal through walls/missing routes.
2. Reuse the bread IDs and shared XP/event seam. Make completion conditional on successful inventory conversion. Decide and document whether reusable buckets should return; do not silently change the recorded three-ingredient recipe. Test full inventory, missing ingredients, repeated clicks, interrupted/unreachable walks and repeat baking without duplication or free XP.
3. Implement the required modeled/animated chef, concise teaching dialogue, ingredient grants and safe recovery. Preserve self-service utility where appropriate. Confirm actual 2D item sprite coverage in the integrated inventory; this audit did not establish asset quality or sprite coverage.
4. Restore all 18 lesson records to the intended full curriculum with success events and meaningful targets, rather than merely changing the bake label. Update the checks that currently enforce omission, departure eligibility, guidance and save migration together. Save the post-success lesson state, not only the pre-advance optional marker.
5. Main integrator must prove, using real input in the in-app browser: walk into the new bakehouse; obtain all ingredients; mix; use bread dough on the oven; see one loaf and the correct configured XP delta; observe the required lesson advancing exactly once; save/reload and retain item/XP/lesson state; repeat without corrupting the next lesson; return outside and traverse the upper room without cross-floor service access. Also test raw-perch compatibility and foreground smoke. Existing old-provider QA cannot substitute for this new-model flow.

All five groups remain integration/acceptance requirements. This report establishes source behavior and discrepancies, not completed new-bakehouse gameplay.
