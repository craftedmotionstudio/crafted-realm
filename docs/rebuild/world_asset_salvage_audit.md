# Crafted Realm world-v2 asset salvage audit

**Scope:** read-only inventory and migration recommendation. No world placement, asset,
runtime, or script-order changes were made. This audit preserves the immutable mechanics:
OSRS-exact combat/XP, one world unit per tile, and four-directional movement. NPC work remains
deferred.

## Executive recommendation

Do **not** delete the current game or fork the mechanics into a second game. Put the current
world behind a `legacy` world provider, build a new world behind a feature flag, and let both
use the same player, item, combat, skilling, inventory, interaction, save, pathing, minimap,
and UI systems.

The strongest salvage boundary is:

- **Keep the current minimap appearance and controls.** They are not an image pasted into the
  HUD; they are a live canvas plus an OSRS-inspired bezel. The likely user-provided visual
  reference is `Bible_References/UI_OpenMiniMap.jpg`.
- **Keep the authored macro map image as optional geography, not as an obligation to preserve
  the existing 3D placements.** `Maps/Crafted Realms Map.png` is the source baked into the
  current terrain grid. World v2 can keep its region topology while replacing every building,
  path, tutorial space, and placement.
- **Keep mechanics and modelled assets; replace eager world construction and authored
  placements.** The startup architecture currently constructs one very large terrain mesh and
  then releases many self-booting placement modules together after `running=true`. That is a
  world-loader problem, not a reason to discard working RPG systems.
- **Rebuild one playable vertical slice first:** a larger Veyhollow civic hub, one useful
  resource road, one risk road, one combat space, a bank/shop/smithy/pub/chapel with functional
  interiors, and a short action-led onboarding embedded in or immediately beside the hub. Do
  not rebuild the whole illustrated continent before that loop is fun and fast.

## 1. Minimap and map provenance

### 1.1 Two different source images exist

| Role | Exact file | Evidence | Confidence / caveat |
|---|---|---|---|
| Likely original **minimap/UI reference supplied by the user** | `Bible_References/UI_OpenMiniMap.jpg` | 3840x2055 JPEG, SHA-256 `99B70750238C43037F8F7E5CAFC52D8AF735F919DD76487E97827C4F03FBF793`. It depicts an OSRS open-map screen with the circular minimap and was added with the UI reference batch in commit `a2201461`; the current bezel was added later the same day in `f87042d`. | **High, but not absolute.** The repository has no original upload metadata or prompt transcript proving that this was the exact attachment. It is not loaded at runtime. |
| Canonical **Crafted Realms macro geography** | `Maps/Crafted Realms Map.png` | 1536x1024 PNG, SHA-256 `DAD68427C9E581D474D2F0DBBAEB66A4B7A6F5A839B4E531CE42BDC6F138B2DE`. It is named as canonical in `STORY_BIBLE.md` section 1 and `MAP_PIPELINE.md` section 1. The bake tool loads this exact URL at `tools/bake_worldgrid.html:56-60`. | **Certain as the current macro-map source.** Whether the image itself was directly user-uploaded or generated during the earlier map session is not provable from repository contents. |
| OSRS world-map research reference | `Maps/reference/osrs_world_map.jpg` | 6145x4353 JPEG, SHA-256 `27411367C4BA6123AB7139C9B85DF46C3A02ABC9A366158E1C997A4F248D0637`. | Reference only; it is not the Crafted Realms map and is not used at runtime. |

The important distinction is that preserving the minimap **does not require preserving the
current world**. The current circular map is generated from live world data, while its bezel
and control cluster are CSS.

### 1.2 Runtime code path

1. `index.html:518-520` owns the `#minimap-frame`, 144x144 `#minimap` canvas, compass,
   music, and world-map button. `index.html:581-584` owns the 560x560 world-map canvas.
2. `src/ui_minimap.js:1-29` installs the bezel/orb CSS only. It explicitly does not add DOM
   or alter behavior; `src/ui_minimap.js:67` keeps the canvas above the chrome.
3. `src/ui_map.js:7-67` redraws the full world map from `groundY`, `gridBiome`, `PATHS`,
   `WORLD.interiors`, `ZONES`, and the player. It does **not** draw either source image.
4. `src/ui_map.js:68-132` redraws the player-centered circular minimap every rendered frame.
   It paints land, ditch, zones, paths, resources, NPC/friendly dots, drops, destination flag,
   player dot, and compass.
5. `src/game5_main.js:689-695` calls `drawMinimap()` every animation frame.
6. `src/game4_ui.js:985-1001` converts clicks back into world tiles and calls the same
   `minimapWalkTo`/`orderWalk` flow as other movement. World-map clicks use the fixed chart
   bounds at `src/game4_ui.js:351-365`.

**Disposition:** keep `index.html`'s minimap DOM contract, `src/ui_minimap.js`, the dynamic dot
law, compass, destination flag, and click-to-walk behavior. Refactor `src/ui_map.js` to consume a
versioned map contract and a cached static base layer; do not freeze it to the JPEG reference.

## 2. Coordinate contract

The current map-to-world transform is explicit and reusable:

| Contract item | Current value | Evidence |
|---|---:|---|
| Tile scale | 1 world unit = 1 tile | `GUIDING_LIGHT.md`, spine item 2; `src/worldgrid.js:1-6` |
| Movement | N/S/E/W only | `GUIDING_LIGHT.md`, spine item 2; BFS neighbours in `src/game5_main.js:28-72` |
| Baked grid | 480 x 320 cells | `tools/bake_worldgrid.html:21-28`; `src/worldgrid.js:4-6` |
| Image sampling area | 16px border; rows below 942 excluded as legend | `tools/bake_worldgrid.html:44-51,78-83` |
| Map origin anchor | Commons map UV `(0.430, 0.445)` becomes world `(0,0)` | `tools/bake_worldgrid.html:25-28` |
| World origin of grid cell `(0,0)` | `x0=-206`, `z0=-142` | `src/worldgrid.js:4-6` |
| Charted bounds | `x in [-206,274)`, `z in [-142,178)` | `src/ui_map.js:7`; `src/game2_world.js:384-414` |
| Orientation | Image top / map north = negative world `z` | `src/game1_data.js:475-476`; compass math at `src/ui_map.js:127-132` |
| Full-map projection | `screenX=(x-x0)*560/480`, `screenY=(z-z0)*560/320` | `src/ui_map.js:7-12` |
| Circular minimap | 144px canvas, 70px clip radius, 1.35px per tile, camera-yaw rotation | `src/ui_map.js:68-79` |
| Minimap click inverse | undo yaw, add offset to player position, validate `groundY`, then `orderWalk` | `src/game4_ui.js:776-781,985-993` |

The bake is not a literal image import. It samples nine pixels per output cell, classifies eight
biomes, applies geographic corrections, fills masked furniture, and mode-filters three times
(`tools/bake_worldgrid.html:62-171`). The runtime source is the generated character string in
`src/worldgrid.js`, not the PNG.

**World-v2 rule:** publish these values through a `MapContract` object instead of duplicating
them in `WORLDGRID`, `WMAP`, UI click math, terrain, and save migration. V2 may keep the same
bounds and anchor, or declare a new version; it must never silently reinterpret saved `(x,z)`.

## 3. Reusable inventory

Repository snapshot: 153 enabled script tags in `index.html`, 97 GLBs under `assets/models/`
(337.8 MB including raw/backup generations), 28 `src/ref_*.js` Studio asset modules, and 35
comparison sheets in `Bible_References/Complete/_compare/`. The raw/backup GLBs are repository
weight, not all network startup cost; only referenced files are fetched.

| Inventory | Evidence | Current condition | Disposition |
|---|---|---|---|
| Combat formulas, styles, specials, boss scripts | `src/game3_systems.js:586-934`; regression lock in `tools/test_combat.js` | Core calculations are independent of town geometry. | **KEEP AS-IS.** OSRS-exact boundary; never fork into world v2. |
| XP curve, items, tiers, skills, shops | `src/game1_data.js:8-360`; validator `tools/validate_content.js` | Valuable content base. Shops are data, though some IDs/dialogue are placement-coupled. | **KEEP mechanics/data; REFACTOR location coupling.** |
| Quest engine | `src/game3_systems.js:1251+` | Reusable stage engine; current quest definitions embed NPC IDs, region IDs, and coordinates (`src/game1_data.js:361-473`). | **KEEP engine; REWRITE quest/story data for v2.** Archive current quests as legacy content until migrated deliberately. |
| Player, inventory, equipment, gathering, crafting actions | `src/game3_systems.js`; action processing in `src/game5_main.js:151-477` | Mostly world-agnostic and already event-driven enough to reuse. | **KEEP, then expose narrow hooks.** Do not duplicate in v2. |
| Four-dir pathing and tile collision | `src/game5_main.js:17-91`; `src/collision_grid.js`; `src/game2_world.js:53-81` | Correct game identity, but calls global `groundY`, `WORLD.interiors`, and colliders. | **KEEP algorithm; REFACTOR inputs through the world provider.** |
| Plane/cave/ladder mechanics | `src/planes.js:1-158` | Useful verticality substrate, independent of current map if given authored destinations. | **KEEP.** Replace current tutorial/keep placements, not the plane system. |
| Chunk data/editor substrate | `src/chunks.js:1-92`, `src/game_editor.js` | Already separates definitions from placements and matches the intended 8x8 authoring model. It is not yet the actual runtime world loader. | **KEEP and promote into v2's authoring format.** |
| Interaction dispatcher and action scheduling | `src/dispatch.js:1-85`, `src/scheduler.js`, `src/intents.js` | Strong seam between world objects and mechanics. | **KEEP.** Require v2 assets to register semantic IDs rather than coordinates. |
| UI, save, map search, settings | `src/game4_ui.js`, `src/ui_*.js`, `src/map_search.js`, `src/ui_save.js` | Visually useful and mostly world-independent; save v1 persists raw coordinates and tutorial step (`src/ui_save.js:12-28,37-75`). | **KEEP UI. REFACTOR save/map adapters and add a save migration.** |
| Modelled tree family | `assets/models/tree_oak.glb`, `tree_young.glb`, `tree_evergreen.glb`, `tree_ironwood.glb`, `tree_mahogany.glb`, `tree_rosewood.glb`; loaders at `src/game2_world.js:422-589` and `src/biome_snow.js` | Small final GLBs, established visual comparisons, and resource hooks. | **KEEP and reuse.** Modelled instances replace procedural trees; keep procedural dead-tree fallback only where no model exists. |
| Modelled hero/world props | `assets/models/fountain.glb`, `stall.glb`; live use at `src/town_square.js`, `src/wardenholm.js`, and `src/game2_world.js:956-996` | Reusable independent of current coordinates. | **KEEP assets and interaction semantics; discard placements.** No procedural duplicate once a modelled equivalent exists. |
| Modelled resource/cargo props | `assets/models/cabbage.glb`, `carrot.glb`, `onion.glb`, `potato.glb`, `wheat.glb`, `sack.glb`; registry at `src/game2_world.js:792-819` | Already tied to useful gather/search semantics. | **KEEP.** Rebuild placements from v2 chunk data. Audit barrel/crate/bucket variants before choosing one canonical model each. |
| Tutorial furniture GLBs | Eight `assets/models/tut_*.glb`; loads at `src/tut_bld_guide.js:204-208`, `tut_bld_chef.js:195-196`, `tut_bld_quest.js:227-228`, `tut_bld_mage.js:178-181` | About 13.81 MB combined. Potentially reusable set dressing, but their current eager placement is coupled to four oversized station buildings. | **KEEP in the asset catalog; remove from initial boot.** Load only for a visible/interior chunk and verify each in Studio before v2 reuse. |
| Studio reference library | `src/ref_*.js`; status and comparison record in `Bible_References/INVENTORY.md` and `Complete/_compare/` | 28 self-contained procedural reference builders, including four exteriors and several interiors. They are asset sources, not a coherent town plan; many are procedural rather than GLB. | **KEEP as Studio/library sources.** Use pieces selectively. If a modelled replacement is produced, the model wins everywhere. Do not bulk-place the reference buildings. |
| Procedural prop/building kit | `src/proc_props.js`, `src/proc_items.js`, `src/buildkit.js`, `src/buildkit_thatch.js`, `src/prop_*.js` | Good low-level geometry and furniture vocabulary, but repeated whole-building presets created the cookie-cutter read. Many prop files also self-place. | **KEEP pure builders; split/archive self-placement. REFACTOR Buildkit into edge walls, rooms, roof pieces, and furnishing data.** |
| Current terrain implementation | `src/worldgrid.js`; `src/game2_world.js:188-416` | Preserves macro biomes but builds one 480x320 landmass and mixes height, paths, town flattening, Holm special cases, moat, and ditch in one function. | **REBUILD runtime terrain as streamed/compiled chunks.** Keep the source map and biome palette as inputs. |
| Current Veyhollow and regional placements | `src/veyhollow_town.js`, `town_square.js`, `wardenholm.js`, `brynholt.js`, `gloomfen*.js`, `saltreach.js`, `oluns_mill.js`, `quarry_store.js`, `dunes_camp.js`, and other `world_*`/`prop_*` self-placers in `index.html:680-755` | These are the present world the user wants freedom to replace. They mix construction, collision, decoration, interactions, and boot polling. | **ARCHIVE as legacy and disable for v2.** Salvage their builders/asset IDs, not their coordinates or compositions. |
| Tutorial state engine | Base `Tutorial` at `src/game4_ui.js:1006-1055` | Small action-gated engine worth keeping. | **KEEP concept/API; move out of UI and make its steps data.** |
| Current Tutor's Holm content | `src/tutorial_island.js`, four `tut_bld_*.js`, `src/tutorial_holm.js`, `tut_holm_path.js`, `tut_cave_dress.js` | Hardcoded surface/cave coordinates, multiple timed build phases, and a replacement tutorial step list. `tutorial_holm.js` monkey-patches `Planes.climbTo` and `Player.addItem` (`:126-170`). | **REBUILD onboarding layout and flow.** Archive Holm v1 intact; reuse action event names, cave/plane mechanics, useful furniture, smithing UI, and guide arrow. |
| NPC/model content | `NPC_TYPES` in `src/game1_data.js:188-299`; gates at `src/config.js:15-20` and `src/game3_systems.js:371,460` | World NPC spawns are intentionally off. | **DEFER.** Retain combat definitions and model files; no v2 placement/wiring until explicitly authorized. |
| Raw, backup, and numbered experimental GLBs | `assets/models/*_raw.glb`, `*.bak.glb`, backup variants, `v02`-`v20` generations | Useful provenance/source material but not a runtime catalog. Thirty-three `_raw.glb` files account for most of the 337.8 MB model folder. | **ARCHIVE outside the runtime manifest; do not delete in this pass.** Promote only an audited, named final asset. |

## 4. Keep / refactor / archive / rebuild decision matrix

| Area | Keep | Refactor | Archive/disable in v2 | Rebuild |
|---|---|---|---|---|
| Minimap | Bezel, canvas DOM, yaw rotation, dots, destination flag, click-to-walk | Read `MapContract`; cache base layer; dynamic overlays only | None | No visual reset required |
| World map image | Preserve both source/reference images verbatim | Decide deliberately whether v2 keeps the macro topology | Do not treat old placements as map canon | A new baked/hand-authored v2 map layer if geography changes |
| Mechanics | Combat, XP, skills, inventory, equipment, shops, gathering, crafting, bank, prayer/magic | World-provider inputs and semantic hooks | None | Nothing duplicated |
| Story | Names/factions/Scarring motifs are salvageable | Separate fiction, quest data, and coordinates | Current quest chain as `legacy` until rewritten | A purpose-led v2 arc with economic, social, danger, and faction loops |
| Terrain | Biome concepts and source image | Shared tile flags/height queries | Monolithic legacy terrain builder in v2 | Chunked deterministic terrain and authored transitions |
| Buildings | Modelled props, reference library, furniture pieces, planes | Buildkit as components/data; larger functional footprints | Existing prefab placements | V2 civic buildings individually authored around gameplay |
| Landscape | Trees, resource models, roads-as-data concept | Deterministic dressing at chunk compile time | Random/scattered self-placement | Authored paths, thresholds, resource ecology, sightlines |
| Tutorial | Action event vocabulary, guide arrow, smith grid, plane system | A standalone tutorial state machine | Tutor's Holm v1 placement and monkey-patches | Short, coherent, staged onboarding space/flow |
| Assets | Named, final, compared GLBs | One asset catalog with preload policy | Raw/backup/unused variants from runtime manifest | Only missing hero assets; modelled replaces procedural |
| Loading | Existing loading UI can be visually reused | Real progress, frame budgets, cancellation, readiness promise | Self-boot polling and fixed-delay cover | Central staged world loader/streamer |

## 5. Why the current world boundary is unsafe

These are migration risks and likely contributors to the reported unresponsive startup; they
are not a measured browser profile and should not be presented as the sole proven cause.

1. **The boot bar hides synchronous work instead of scheduling it.** `BOOT_STEPS` invokes
   `buildGround`, all mainland population, several region populations, collision rebake, and
   player construction as synchronous callbacks separated by 220ms timers
   (`src/game5_main.js:718-758`). The percentage is therefore not proportional to actual work.
2. **The ground build is a large main-thread burst.** `buildGround()` creates a 300x200-segment
   plane (`src/game2_world.js:384-392`): 60,501 vertices and about 120,000 triangles. Every
   vertex calls `terrainHeight`; its biome smoothing alone samples a 5x5 kernel, before road,
   zone, moat, ditch, and Holm special cases (`src/game2_world.js:193-296,308-374`).
3. **Entering the game releases another placement burst.** `running=true` is set only after the
   Play click (`src/game5_main.js:798-803`). Many enabled world/prop modules poll that flag and
   synchronously build when it changes; examples include `veyhollow_town.js:179`,
   `town_square.js:322`, `wardenholm.js:703`, `prop_crates.js:169`, and
   `tutorial_island.js:76-203`. A repository scan finds 38 enabled scripts containing both
   `setInterval` and `running` (53 interval sites total); roughly thirty are world/prop builders.
   `WORLD_QUALITY.md` section A already records this as a multi-second render freeze.
4. **The entry cover admits the freeze.** `showEnterBuffer` says self-booting props build in a
   burst on the first running ticks and waits for smooth frames or a six-second cap
   (`src/game5_main.js:760-796`). A cover cannot make a blocked main thread responsive.
5. **World construction is spread through global side effects.** `WORLD` is a shared set of
   arrays (`src/game2_world.js:3`); builders add meshes, clickables, colliders, roofs, resources,
   and timers directly. There is no single manifest that can unload a region or report accurate
   progress.
6. **UI and save data know legacy coordinates.** `WMAP` duplicates bounds; quests contain
   coordinates/zone IDs; save v1 stores raw `(x,z)` and tutorial step
   (`src/ui_save.js:12-28`). Undercrag's zone anchor `[-330,-260]` is outside the charted terrain
   bounds (`src/game1_data.js:477-492`), demonstrating that zone identity, surface geography,
   and far-offset content already need a formal contract.
7. **Tutorial code replaces and monkey-patches shared systems.** `tutorial_holm.js:30-42`
   replaces the step list; `:126-170` waits for and wraps plane/player functions. It is
   reversible as one script, but it is not a clean foundation for a second world.
8. **Plain global script order is an integration hazard.** The game intentionally uses global
   scripts and lexical globals; a v2 manifest cannot assume `const` values appear on `window`.
   A provider must be loaded in a known order and expose one explicit global API.

## 6. Safe world-v2 boundary

### 6.1 Provider contract

Add a small world-selection seam later; do not rewrite mechanics to know about v2:

```js
// Plain global script contract, shown here as design only.
var ActiveWorld = {
  id: 'legacy' | 'v2',
  map: MapContract,
  preload(onProgress),          // Promise; assets/data only, no scene mutation
  buildInitial(spawn, onProgress), // Promise; yields between bounded jobs
  streamAround(tileX, tileZ),   // loads/unloads chunk rings
  groundY(x, z, plane),
  tileFlags(x, z, plane),
  zoneAt(x, z),
  dispose()
};
```

`game5_main` should call this interface instead of `buildGround()` plus six direct
`populate*()` calls. `computePath` keeps its four-neighbour BFS but obtains height/collision
from `ActiveWorld`. `ui_map` reads `ActiveWorld.map`. The legacy adapter simply wraps today's
functions, making the change reversible before v2 owns any content.

### 6.2 Proposed modules

```text
src/world_provider.js                 selector + interface assertions
src/world_legacy_adapter.js           wrappers around current globals
src/world_v2/
  map_contract.js                     bounds, origin, north, projection, spawn aliases
  asset_catalog.js                    semantic asset ID -> final GLB/builder + load policy
  world_data.js                       region graph, roads, gates, travel links
  terrain_builder.js                  chunk geometry compiler; deterministic and yieldable
  building_kit.js                     edge walls, doors, roofs, rooms; no placements
  chunk_runtime.js                    load/unload/register/dispose WORLD entries
  chunks/
    veyhollow_00_00.js                pure placement/surface/collision/interaction data
    ...
  tutorial/
    steps.js                          pure action-gated step data
    hooks.js                          event subscriptions, no monkey-patching
  v2_provider.js                      implements ActiveWorld contract
  acceptance.js                       data/boot invariants and checksums
```

Chunk data should contain tile surfaces, edge walls/doors, asset placements, interaction IDs,
landmarks, and deliberate resource sockets. It should not construct Three.js objects. Each
building needs a purpose ID, entrance tile, navigable rooms, service/interactable anchors, roof
group, and collision footprint. No random runtime placement.

### 6.3 Feature flag and save safety

- Select with `?world=v2` or a non-persisted development flag first; legacy remains the default.
- Add `worldId` and `worldRevision` to save v2. Preserve XP, inventory, bank, equipment, skills,
  quests that have stable IDs, and appearance. Translate position by named spawn/landmark, not by
  assuming legacy coordinates are valid.
- Never overwrite the v1 save during early v2 testing. Store a separate key or make a one-way copy.
- V2 scripts must not load legacy self-placing modules. A flag inside their callbacks is weaker
  than excluding them from the active manifest because their timers and side effects still exist.

## 7. Recommended migration sequence

1. **Prove startup first.** Instrument each boot job, number of meshes/draw calls/triangles, asset
   bytes, long tasks, and time-to-first-responsive-frame. Centralize a job queue with an 8-12ms
   frame budget. The loader reaches 100% only after the initial chunk, collision, player, minimap,
   and input are ready.
2. **Introduce `ActiveWorld` with legacy behavior unchanged.** Gate with the existing smoke and
   combat/content tests. This is the rollback point.
3. **Create the v2 minimal map contract and one empty starter chunk.** Verify the preserved
   minimap, four-dir pathing, save isolation, and sub-second responsiveness before any art density.
4. **Build the Veyhollow vertical slice from paths and functions outward.** Use individually
   authored bank, store, smithy, pub, chapel/guild service, and larger dwellings. Every room must
   support a gameplay or social use; every exterior threshold must connect to a path and minimap.
5. **Add the economic loop before map breadth.** Resource source -> processing -> item sink/shop or
   player trade hook -> risk/reward route. Preserve mining, smithing, drops, banking, and combat
   mechanics; author their geography anew.
6. **Replace Tutor's Holm with a shorter v2 onboarding slice.** Reuse real action gates and the
   guide arrow, but avoid four showcase buildings and a detached checklist tour. Teach movement,
   one gather/process loop, bank/inventory, and combat readiness in spaces the player understands
   they will use in the main game. NPCs remain deferred until authorized.
7. **Only then expand by authored chunks.** Each new region must add a distinct economy/resource,
   threat, faction/story purpose, and return route. Stream it; do not add it to the initial boot.
8. **Retire legacy only after parity gates.** Keep the old provider and assets until v2 can boot,
   save/load, path, gather, craft, bank, fight in an authorized test context, render the minimap,
   and pass the smoke/performance budgets.

## Final disposition

The current world should be treated as a **legacy reference implementation**, not as a base mesh to
keep polishing and not as code to delete. The minimap/UI, mechanics, modelled asset library, planes,
collision/pathing rules, interactions, saveable player state, and content validators are substantial
salvage. The monolithic terrain, self-booting placement swarm, small prefab buildings, hardcoded
tutorial layout, coordinate-coupled quest story, and current regional compositions are the correct
world-v2 replacement boundary.
