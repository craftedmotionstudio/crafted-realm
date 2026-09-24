# Kitchen post-event saving — 2026-09-13

Status: focused runtime defect repair; not complete new-bakehouse cooking or curriculum acceptance. The preceding turn made progress by hardening station reach and verifying a real chart interaction.

## Behavior changed

The old kitchen notification wrapper saved the optional bread marker before forwarding `bake/bread` to the original tutorial notifier. If bread is a required active step, that snapshot can contain the old step. Subsequent bakes previously skipped this immediate save once the optional flag existed, despite changing inventory and XP.

`src/holm_teaching_kitchen_interactions.js` now forwards the event first, preserves the original return value, then marks and saves the resulting state for bread events on the existing Holm provider. Repeated bakes save again without repeating optional completion feedback. Events outside Holm and unrelated cooking events do not touch the kitchen ledger. Save exceptions are reported to the console rather than silently swallowed. The wrapper remains idempotent. Index script cache advanced to v2.

No recipe, XP amount/table, inventory conversion, lesson list, migration or saved-data schema changed. Existing optional completion evidence remains intact. This does not establish that a loaf was cooked specifically on the new oven: station provenance still needs the new interaction contract.

## Verification

- `node tools/test_holm_kitchen_save_order.js`: PASS. Executes the actual module in a VM with controlled tutorial/inventory/save dependencies. Confirms saved step is post-advance, optional mark is present, repeat loaf/XP snapshot is current, feedback occurs once, unrelated/provider-external events do not save the ledger, original result is forwarded, save failure is reported, and double loading does not double-wrap.
- `node --check src/holm_teaching_kitchen_interactions.js`: PASS.

These tests inspect the saved snapshot boundary; they do not operate real localStorage, migrate a save or bake through browser input. The ordinary game smoke gate is separate regression coverage, not proof of the required full cooking flow.

## Remaining full acceptance

The new Blender bakehouse still needs measured ingredient stations, recipe binding and a modeled chef. All original 18 lessons must be restored with a deliberate stable-ID migration and departure eligibility. A real-pointer fresh profile must acquire ingredients, mix, bake, advance, save/reload, retain the loaf/XP/lesson, and repeat without duplicating credit. That full scenario remains unproven. No Studio Safe Publish apply in this pass; full island goal active.

Foreground in-app smoke on disposable kitchen-save-order-20260913: PASS105/105,boot958ms,walk3592ms,six streaming boundaries/exact lossless save-load,60FPS,worst21ms,125draws,34270triangles,seven ticks,zero errors. Evidence scratchpad/holm_perf/kitchen-save-order-smoke.json. Temporary tab closed.
