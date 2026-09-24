# Bakehouse animated hearth pass — 2026-09-13

Status: authored Blender asset and isolated Studio integration. Full island goal remains active; cooking is not yet integrated with the new building.

The preceding turn was progress: it repaired measured cardinal circulation and verified a real-pointer interior/upper-floor circuit. This pass adds a visibly lit oven and audits the real recipe/progression seams before binding them.

## Authored asset

`tools/blender/build_holm_bakehouse_fire.py` creates an editable `.blend`, GLB and contract in `.studio-workspaces/holm-bakehouse-fire-v1/candidates/`. Original flat-shaded amber/gold flames and coals total 204 triangles. Eight independently animated flame meshes export 16 scale/rotation channels. The 49-frame, 24 FPS cycle lasts two seconds. Sampled geometry stays inside the existing oven firebed width/depth, with highest flame below the arch opening. Local glTF placement is (-3.25,0.46,-3.38). No reference pixels were copied.

GLB SHA256: `b5138d41ee563df9dee97a403fdb6420acb719bb3985dd9f475974d423ac75cd`.

`python tools/verify_holm_bakehouse_fire.py` reads actual exported accessors: PASS 16 animated transform channels, finite values, non-static motion, two-second timing and matching loop endpoints within 0.000001. These are exported-data checks, not a claim of gameplay cooking.

`tools/studio_holm_bakehouse_fire.js` verifies the GLB hash, loads all authored clips and advances their mixer with the preview clock. It provides explicit resource disposal. Both the walking and exterior kitchen Studios use it. The base building bytes/navigation graph are untouched. The fire is visual and does not add a navigable floor or interaction proxy. Terrain Studio and the installed game do not yet include this separate asset.

## In-app verification and visual review

Reloaded the walking study in the in-app browser, clicked the real oven destination and observed arrival at (-2.5,0,-1.5). Animated fire loaded and was visibly seated within the masonry opening. No browser console warnings/errors. Evidence: `scratchpad/holm_perf/bakehouse-fire-walk.png`. Preview pause stops the flame mixer with the rest of the scene.

Direct Codex review: silhouette 8.0 (simple tapered tongues); proportion 8.2 (contained within opening); shape hierarchy 8.0 (gold core/amber edge); material separation 8.2 (clear against soot); reference-defining behavior 8.0 (restrained flat-shaded warm fire); gameplay-camera readability 8.4 (oven now clearly hot); animation/interaction 7.5 (authored loop, but no cooking response); family consistency 8.0. Provisional overall 8.0. No new >=9 art acceptance; existing building comparison remains the prior v4 sheet. The light currently comes from emissive color, not a new dynamic point light.

## Integration findings

Read and accepted the source-grounded audit in `HOLM_BAKEHOUSE_RECIPE_AUDIT_2026-09-13.md`. Existing code consumes one flour bucket, water bucket and dough for bread dough, then bakes bread through the shared 40-base Cooking XP and bake/bread event seam. Current handlers remain coupled to the old kitchen root/coordinates. Station reach can fail open and does not check floor identity. Optional progress is saved before the original lesson notification. Eighteen lesson records exist but five are filtered out; save migration also skips the earlier bread step. These are known integration gaps, not reasons to accept a thirteen-lesson endpoint.

Next: explicit new-model station data and floor-safe reach, actual ingredient/service binding through the existing recipe, required full-curriculum events and save migration, then real-pointer recipe/save/reload/negative-case QA. Modeled chef remains required and is added after the environment per the guiding light. No live publication or save changes in this pass.

Foreground smoke: PASS105/105, boot1653ms, real walk3592ms, six streaming boundaries and lossless exact save/load,60FPS,worst29ms,123draws,34266triangles,seven ticks,zero console/uncaught errors. Evidence: scratchpad/holm_perf/bakehouse-fire-smoke.json. Ordinary-game regression coverage only; the new bakehouse recipe remains unverified. Temporary smoke tab closed. Both kitchen Studios reloaded successfully; ground-floor comparison banked at Bible_References/Complete/_compare/holm-bakehouse-fire-studio-reference.png.
