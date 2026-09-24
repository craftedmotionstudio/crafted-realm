# Rebuilt arrival: live integration boundary

Read-only source audit, 2026-09-12. Only this new document was written. No browser, runtime change, publication, visual acceptance or save migration was performed. Base guard passed for `HolmArrivalDock`, `arrival-layout.json`, `HolmGuideHall` and `HolmTutorialFlow`; governing instructions and the earlier floor-adapter audit were read.

## Immediate implementation decision

The next implementation module should be **a pure, hash-bound arrival package compiler**, not another Studio quest mock and not a direct edit of the old provider placements. Implement `src/holm_arrival_package.js` and its headless tests, then `tools/studio_arrival_validation.js` with dispatch from `tools/studio_workspace.js`. The package must bind the already-authored terrain, house, dock, navigation, semantic interactions and source assets into one verifiable revision. Its consumer is the real WorldV2 runtime; compilation itself must not activate a provider or mutate `Player`/`Tutorial`.

There are two concrete reasons this boundary is necessary:

- `HolmOverhaulChunks.compile` describes a new 144 by 128 island at origin 0,0. The live `HolmLandscape.envelope` is 112 by 96 at 102,93. New guide foundation is 66,99, Y3; the live guide is 151,155. Replacing that object or its GLB alone cannot connect the real curriculum, which still points to the old coordinates. The new north exit currently has no complete route to the old Survival Wood.
- `tools/studio_workspace.js:validateBytes` recognizes only the existing world-v2 authoring/building/district schemas, then **returns an empty error array for unknown JSON schemas**. Current overhaul JSON can be staged and hash/journal protected, but its terrain/layout/navigation relationship is not semantically gated by Safe Publish. Do not describe a generic green plan as proof of this new package's correctness.

## Exact first module contract

Suggested API: `HolmArrivalPackage.compile(input)` returning JSON only; global classic-script and CommonJS exports. `input` contains the actual parsed layout, collision envelopes, compiled terrain, dock source, immutable asset descriptors and caller-computed SHA256 of each original file. Recompute hashes in the Node publication validator; a caller's arbitrary string is not evidence. Keep all existing compiled coordinates unchanged, reject implicit offsets and non-cardinal transforms.

```js
{
  schema: 'crafted-realm-holm-arrival-package-v1', version: 1,
  provider: { id: 'tutors-holm-v2', worldRevision: /* explicit next revision */ },
  sources: [ { path: '...', sha256: '64 lowercase hex characters' } ],
  terrain: { sourcePath: '...', bundlePath: '...', chunks: /* compiled rows */ },
  objects: [
    // Stable owner, asset path/hash, transform, semantic part names.
    // Guide, dock, skiff and dressing use their real authored source identities.
  ],
  navigation: {
    ownerId: 'holm_arrival', graphRevision: '...',
    actor: { radius: 0.42, height: 1.9, headMargin: 0.3 },
    surfaces: /* named ground/upper/stair/exterior/dock support contracts */,
    portals: /* explicit cardinal transitions */,
    interactions: [
      { id: 'holm_guide_hall.orientation', kind: 'holm_orientation',
        objectId: 'holm_guide_hall', surface: 'ground',
        stanceNodeIds: /* actual reachable compiled IDs */ }
    ],
    requiredChunkIds: /* actual occupied/intersected chunks, not only root chunk */
  },
  spawn: { landmark: 'holm_arrival', surface: 'exterior', nodeId: 'exterior:61,118' },
  lessonBindings: { study_route: 'holm_guide_hall.orientation' },
  boundary: {
    northExit: /* source node and explicit next-district connection */,
    readyForWholeProviderReplacement: false
  }
}
```

Comments are required filled values, not valid defaults. Derive the graph using `HolmArrivalDock.create(...).compile(doorState)` and preserve separate closed/open-door topology; do not serialize one permanently-open graph as live door behavior. Include terrain source/bundle, layout, envelopes, dock source and each referenced GLB/source hash. Skiff bobbing must not redefine the dry dock support. No fake `questComplete`, Studio lesson counter, or invented rewards belongs here.

First tests: deterministic immutable output; source/schema mismatch rejection; unknown asset/semantic part and owner rejection; exact source-derived placement; terrain/door/shore seam validation; exterior-to-chart-to-upstairs-to-dock reversible cardinal routes; water blocked except explicitly authored support; package changes when any bound input changes; missing north connection makes full-provider readiness false. That last state must prohibit replacing the existing playable whole island, while permitting a real-player QA integration branch of the package.

Safe Publish dispatch must recognize both package and its referenced overhaul terrain schemas, validate their actual values, recompile and compare, and require every paired authoring/bundle target in the same workspace set. Validate path containment, hashes, provider revision, asset references and semantic/stance binding. Use existing `init`, `stage`, `export`, `plan`, `apply` journal machinery; do not add an alternate copier. Its all-green plan is necessary, not sufficient for art/performance acceptance.

## Existing live mechanics that must be reused

`src/holm_tutorial_flow_data.js` supplies curriculumVersion 5, thirteen required success lessons and five optional lessons. `tutorial_holm.js` replaces the legacy Tutorial steps with `HolmTutorialFlow.runtimeSteps()`. The first required lesson is `study_route`, event **`orient`**, match **`route`**. The old Bram conversation in `game4_ui.js` still uses `talk/bram` and `talk/bram_done`; those are legacy events and must not drive the rebuilt curriculum.

`HolmGuideHall.studyRoute()` is the real public entry point for route teaching. It opens real UI dialogue, logs orientation and calls `Tutorial.notify('orient','route')`. `notify` advances only when the current step matches, so repeating orientation cannot complete later lessons. It advances as the chart dialogue opens, not on its close button. A modeled Bram's “Show me the island route” response should call this entry point **after a valid same-surface interaction stance**, not assign Tutorial.step or complete. A plain greeting must not award orientation. Reuse `HolmGuideHall.readRegister()`, `inspectPlaque()` and `collectTools()` for their corresponding services. `collectTools` delegates to the actual bank-aware recovery service.

The existing guard is providerId `tutors-holm-v2`. If testing under another provider, factor an explicit compatible-provider predicate rather than removing guards globally. Existing `HolmStationReach.guard('holm_guide_hall', localTile, fn)` uses the old building's hardcoded local station points and groundY, and falls through to `then()` if no building/player or walking scheduler exists. It cannot serve as the new surface-aware guard unchanged. New interactions must carry their compiled stance IDs and fail closed if owner/surface/residency is absent. Chart uses real `holm_orientation` semantic kind. Bind any new chart GLB part to that existing action.

Keep `Tutorial.steps` lesson IDs and event meanings unchanged while relocating target coordinates through package/world data. `HolmTutorialFlow` currently stores all targets and station entry/service/exit coordinates itself, including Study at151,155; `holm_guidance.js` consumes this data. A new visual model does not move those targets automatically. Required destinations after arrival still need authored connectivity before default-provider cutover.

The arrival skiff is not automatically the graduation boat. Current final departure is `holm_departure_boat`, `kind:holm_departure`, dock207,151, boat211,154, mainland `veyhollow-commons-v2` / `veyhollow_ferry_arrival`. `src/holm_departure.js` owns Board and the real departure flow. Preserve Lastlight and actual completion/reward guards. Do not call departure from an arrival-rower preview unless deliberately binding the final destination and validating the whole route.

## Runtime files and concrete gaps

| Boundary | Existing file/API | Necessary adapter |
|---|---|---|
| Provider catalog | `world_v2_holm.js`, `WorldV2.register` | Consume validated package rows instead of constructing duplicate old guide/props; choose explicit revision, landmarks, envelope and next-district route. Current code compiles old data synchronously; merely publishing JSON does not load it. |
| Ground rendering | `world_v2_terrain.js:loadChunk`, `buildTerrainPatch` | Consume sampled chunk heights/materials/exclusions from `HolmOverhaulChunks.surface`, preserving chunk-owned geometry/raycast registration/disposal. Current mesh builder samples old global terrain. Remove old pond only when new water owns the replacement. |
| Ground queries | `game2_world.js:terrainHeight/groundY`, collision/minimap callers | Active-provider sampled-height contract shared by visual terrain and all ground queries; preserve other providers. Whole-house upstairs must never be a highest-Y ground override. |
| Authored assets | `world_v2_building_data.js`, `world_v2_buildings.js`, `world_v2_objects.js` | Add new definition/asset source, semantic part mapping, doors/animations and owned surface package; remove old arrival instance of replaced types. Current building installer has one roof/interior and ground walk surfaces, no owned stairs. |
| Movement | `game5_main.js:computePath/orderWalk` and follower; `game4_ui.js` hit routing | Explicit surface-bearing path states and hit targets using the facade; revalidate dynamic edges; interrupt safely. Integrate into real Player/path/actions, not a second visible stand-in actor. Existing single-plane XZ BFS cannot carry upstairs. |
| Residency | `world_v2_contract.js`, object install/unload | Pin the package's intersecting chunks while occupied/in transit/pending interaction, and transactional owner install/remove for surfaces, colliders, clips, clickables and cutaway. Current root-chunk ownership alone is insufficient. |
| Saving | `ui_save.js`, `world_v2_boot_select.js` | Add optional versioned surface checkpoint to the actual save, resolved only after owner is resident. Preserve old fields and migration. Current pos is only XZ plus plane; it cannot identify stair/upper support. Studio checkpoint is separate test state. |

Current saves already record world provider/revision/nearest landmark and tutorial lessonId/curriculumVersion/optional/reward flags. `WorldProvider.resolveSavedPosition` relocates on worldRevision mismatch to the named landmark or default; retain this migration behavior deliberately and document exact landmark remaps. `ui_save.js` independently attempts saved nonzero-plane restoration first, so invalid old plane/region restoration needs checking before a rebuilt-world cutover. Keep inventories, bank, XP, appearance, quest and reward flags intact. Real save/load coverage must include downstairs, upstairs, stairs/interruption, dock, old live saves and mainland saves.

## Deploy order and acceptance boundary

1. Implement/test the package compiler and Safe Publish semantic/cross-file validator. This is the next bounded code task.
2. Integrate provider-owned sampled terrain plus real Player surface navigation behind an explicit QA path in the actual game. The existing live island remains available until the replacement has a connected required route. No new toy quest system.
3. Install new guide/dock/asset interactions through that path, using the same actual Tutorial/SaveGame and modeled Bram action delegation. Prove real-pointer arrival, Study, visible ascent/descent, dock return, interrupts, doors and actual save restoration. Validate all input routes, not only one walk button.
4. Complete the north connection and relocate/replace remaining tutorial destinations as the new island is authored; update map/arrow/landmarks together. Bind all source/asset revisions in the package and require complete migration and full required-route QA before making it default.
5. Stage complete authoring set through Safe Publish, export, inspect all-green plan, apply only after visual gates, runtime migration/routes and foreground performance pass. Keep receipt/rollback evidence. Full island completion still includes other buildings, NPCs, character art, systems, caves, capstone and departure.

This audit does not establish any of these missing adapters as implemented. Existing isolated walking/Blender tests are useful inputs; they do not prove a live provider, real tutorial progression or release readiness.
