# Rebuilt lodge service bindings and Ledger of Choices — 2026-09-13

Previous goal turn: progress, with measured island-to-lodge navigation and real pointer route evidence. This pass makes actual authored board/map geometry clickable and adds the missing ledger prop. Full island goal remains active; no live install.

## Stable service identities and actual mesh clicks

New tools/holm_lodge_service_bindings.js pairs the verified v3 GLB with existing holm_quest_lodge.quest_board / holm_quest_board and holm_quest_lodge.region_map / holm_region_map identities. It resolves actual material-split mesh names and the measured ground-floor approach tiles, refusing changed model, missing meshes, unreachable targets or shifted stances. Input and returned coordinate data remain immutable. Headless tests decode the actual GLB, compare its SHA with navigation, and exercise those refusal paths.

The island walking study raycasts real scene geometry, rejects hidden ancestors and clipped fragments, and uses the nearest remaining surface so walls occlude services. A drag over five pixels does not issue a service walk; left clicks only. Paused previews request resume. The existing measured router and door controller retain their behavior. After a mesh click, the adventurer turns toward the actual service bounds on arrival. No journal, tutorial credit or save mutation is simulated.

Actual in-app pointer flow on final code: south lane → entrance button → click rendered map parchment → reached region chart at (2.5,0,1.5) → click rendered notice board → reached board at (-3.5,0,2.5). Orbit drags did not issue additional service clicks. A front orbit makes the notices and facing adventurer readable; the default view still sees the board back and can occlude the avatar. That camera limitation is not solved by the binding change. Evidence: scratchpad/holm_perf/quest-lodge-service-pointer.png and quest-lodge-service-pointer-log.json.

## Blender ledger

New tools/blender/build_holm_story_ledger.py opens actual verified Blender base context and builds an original static book at local origin. Editable ledger.blend, ledger.glb and contract.json are in .studio-workspaces/holm-story-ledger-v1/candidates. Exported geometry checks cover finite transformed positions, named story_ledger root, bounds and budgets: 0.44 × 0.0985 × 0.63 tiles, 130 triangles, five material primitives, 11,320 bytes. GLB SHA256: 5f31b4df1a321548fd0443f70769136f0dd90d0e38e28e2b91ba0a89be8f2ae2.

New design-study loader verifies host and ledger hashes, actual book footprint/bottom and host table support. It replaces the old plain parchment visually and seats the book at the measured table top; the initial old parchment's 0.015 gap is not inherited. The geometry-verified walking study intentionally keeps its original mesh set until the added ledger is included in collision extraction. The exterior/interior design study adds a Ledger of Choices close camera and reports the added triangle count separately.

Direct Codex visual review: 8.4/10 provisional, not accepted. The open book silhouette and thick page shoulders read clearly; leather cover, cream pages, dark ink and red ribbon have strong material separation. Broad angular page facets fit the original low-poly direction. The whole-room view still reads a book on the bay table, though its lines become tiny and the text is symbolic. Static book needs no animation; its live read interaction is unfinished. Palette and scale fit the lodge, but this is a style/context comparison rather than an exact book reference and final island context remains unproven. Banked sheet: Bible_References/Complete/_compare/holm-quest-lodge-ledger-reference.png. Detail/room screenshots and loader logs in scratchpad/holm_perf/quest-lodge-ledger-*.

## Integration audit and next work

HOLM_QUEST_LODGE_BUNDLE_CONTRACT_AUDIT_2026-09-13.md identifies the provider bounds, old door/rectangular collider system, loader semantics, hardcoded service tiles and missing generic floor-save record. The proposal grid is not a proven migration transform to live world coordinates. Do not publish a model-only swap. Next: incorporate named ledger and measured stance into the candidate service contract/navigation, then form a coherent district/provider and floor persistence adapter before Safe Publish. All 18 lessons, other buildings, terrain/habitat quality, appearances/NPCs/items, Lastlight and departure remain required.
