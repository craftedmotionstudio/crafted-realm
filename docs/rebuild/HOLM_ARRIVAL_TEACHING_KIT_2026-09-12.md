# Arrival teaching-kit continuation

The preceding pass made concrete progress: actual dock-to-house movement, chart interaction, upstairs traversal and exact reload were verified. This pass fixes the next real lesson failure, keeping the full island goal active.

## Fixed and verified

`HolmToolRecoveryService` previously rejected every provider except `tutors-holm-v2`, despite the new chart advancing the real tutorial. It now also accepts the active, isolated arrival QA provider. The same inventory planning, bank/equipment ownership, save-before-commit and rollback logic remains in use.

In-app browser, profile `arrival-live-01`: Continue/Enter granted one Bronze hatchet, one Tinderbox and one Small net. Read-only inspection confirmed all three in saved and live inventory. Clicking the visible hatchet equipped it and advanced the real lesson to `chop_logs`. Reload/Continue/Enter then restored `upper:65,96`, the equipped hatchet, one tinderbox, one net, five coins, and `chop_logs`, with zero console errors and no duplicate kit.

Service tests: 8/8 including inactive-provider refusal, active-arrival grant, repeated idempotency, full-pack refusal, bank/equipment ownership, save failure rollback, and mainland refusal. Initial-grant tests 6/6; content validation passes.

Default foreground smoke `arrival-tools-regression-20260912`: PASS, 105/105 structural, real walk, six streamed boundaries/26 tiles, exact lossless save/load, 60 FPS, worst frame 23 ms, 112 draw calls, 33,952 triangles, six ticks, no console errors. This is regression evidence, not arrival performance acceptance.

## Art and next integration

A separate Blender provision rack candidate and dedicated Studio view are ready for repeated tool collection integration. `tools/blender/build_holm_provision_rack_v1.py` produced actual editable `provisions.blend`, `provisions.glb`, and `manifest.json` under `.studio-workspaces/holm-provision-rack-v1/candidates/`. Final export: 1,816 triangles, eight materials, 15 primitives, four semantic families; 1.60 wide × 1.70 high × 0.55 deep tiles, front +Z. The isolated Studio is `tools/studio_holm_provisions.html`.

Direct Codex review in the in-app browser: the shaped crest, joined feet and open frame give a recognizable furniture silhouette with appropriate proportions. Rack/tool/shelf hierarchy reads clearly. Initial gray hatchet conflicted with the bronze inventory icon; revised bronze body and warm cutting edge correct that mismatch. Initial net read as an empty hoop with loose cord; revised crossed mesh bag is readable at both detail and gameplay scales. Wood/bronze separation is still modest under warm lighting. The secured props are static, so no animation is required for this furniture; interactive pickup/recovery is untested. Warm carved timber is compatible with the house, but family consistency and circulation must be reviewed in the actual room. Preliminary isolated score 8.6; no 9.0 acceptance, comparison sheet or live placement claimed. Banked `studio-detail.png` and `studio-gameplay.png` in the candidate directory; Studio console errors zero. Existing hatchet and fishing-net inventory icons were inspected as identity references; no inventory art was replaced.

The current successful initial grant does not constitute a placed rack or recovery-interaction acceptance. Next, add the rack's authored service footprint, collision envelope and supported interaction stance to a new validated arrival package revision through Studio Safe Publish, then test repeated collection in the actual house. The northern survival area is not connected to the arrival draft, so the chopping lesson is not yet playable there. No publication or full-island completion is claimed.
