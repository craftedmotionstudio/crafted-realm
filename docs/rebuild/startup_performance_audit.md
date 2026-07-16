# Crafted Realm startup and performance architecture audit

Date: 2026-07-13  
Scope: read-only static audit of the path from document load through the first ten seconds after Play.  
User-visible incident: Chrome displayed **Page Unresponsive** after the loading animation and world entry.  

## Executive finding

The freeze has a credible architectural explanation in the repository. It is not necessary to blame the new Hollow Well Square work, NPCs, or a single broken asset.

Crafted Realm currently does two large waves of synchronous main-thread construction:

1. Before the welcome screen, it creates the renderer, generates a 60,501-vertex terrain mesh, populates every major region, and bakes collision for all 153,600 map tiles.
2. Play sets `running=true`, which releases a cluster of independently polling region and prop builders. At least 32 construction callbacks are scheduled in the 1.5–2.6 second period after entry. Each callback completes synchronously; they are not governed by a shared frame-time budget.

The loading UI describes this behavior as progress, but it is based on fixed percentages and fixed timers rather than measured readiness. The second entry overlay explicitly says it is covering a “real render freeze,” then hides after a hard cap whether or not all work is complete. This matches the reported experience: animation, apparent completion, then an unresponsive page.

The recommended “overhaul” is therefore a runtime/world-loading rebuild before a destructive content wipe. Preserve reusable art and the current minimap appearance, but replace global full-world construction with a measured boot coordinator, one playable spawn chunk, and distance-based chunk streaming. Content can then be rebuilt chunk by chunk without repeatedly destabilizing startup.

## Base check

- `src/game5_main.js` contains `BOOT_STEPS` at lines 723–747.
- `src/smoke.js` exists and is loaded first by `index.html` line 656.

## Static phase map

| Phase | What runs now | Main-thread risk | Readiness shown to player |
|---|---|---|---|
| HTML/script evaluation | 153 sourced scripts are loaded in document order: 151 local and two external; 150 of the local scripts are under `src/`. Local sourced JavaScript is about 1.84 MiB uncompressed. All are classic global scripts (`index.html:656–813`). | Parse/evaluation and top-level side effects are serialized. Fifty-four loaded source files contain intervals. Five tree GLBs begin loading at top level (`src/game2_world.js:432–440`). | Loading screen already exists, but no resource/evaluation telemetry feeds its percentage. |
| Boot step 10 | `initEngine()` creates WebGL with antialiasing, up to 2× pixel ratio, and enabled soft-shadow maps (`src/game2_world.js:7–43`; `src/game5_main.js:723–725`). | WebGL context, backbuffer, and initial shader state are created synchronously. Actual driver cost is unknown. | Label says “Connecting to update server”; no update-server connection occurs. |
| Boot step 25 | Calls `iconFor(id)` for every item (`src/game5_main.js:725`; `src/game0_icons.js:8–23`). Each icon creates a canvas, draws, and serializes it with `toDataURL()`. | 134 items are currently validated by `tools/validate_content.js`; icon generation is synchronous CPU/allocation work. | Label says “Loading textures,” although most item icons are generated and serialized here. |
| Boot step 45 | `buildTextures(); buildSea(); buildGround()` (`src/game5_main.js:726`). `buildGround()` makes a 480×320 terrain with 300×200 segments (`src/game2_world.js:308–382`, `390–405`). | The plane has 60,501 vertices and 120,000 triangles. Every vertex runs `terrainHeight`, color logic, trigonometry, grid lookups, and potentially path-distance sweeps before normals are computed. This is a single synchronous job. | Percentage advances to 45 before the callback runs; the bar cannot animate during the long task. |
| Boot step 65 | `populateMainland()` (`src/game5_main.js:727`; `src/game4_ui.js:1582–1905`). | Builds content across Whitmoor, Undercrag, Emberwood, Quarry, Mirrorpond, Gloomfen, and countryside in one call. Repeated builders create scene objects/colliders immediately. NPC calls are cheap no-ops because `GameConfig.worldNpcSpawns` is false and `spawnNpc`/`spawnFriendly` return early (`src/config.js:19`; `src/game3_systems.js:369–372`, `459–461`). | “Populating Veyhollow” understates that multiple distant regions are being built. |
| Boot step 80 | Calls all remaining population functions, Menagerie if present, and `Bots.spawn()` (`src/game5_main.js:728`). | Mainland, Brynholt, Dunes, Scarlands, Arena, Holm, and a review lab are prepared before the player can use the tutorial spawn. Bots and world NPCs are gated off (`src/game4_ui.js:1495–1497`). | No per-region timing or failure state. |
| Boot step 90 | `CollisionGrid.rebake()` (`src/game5_main.js:729`; `src/collision_grid.js:73–94`). | Scans all 480×320 = 153,600 tiles. Each tile calls `collides`, which linearly scans current colliders (`src/game2_world.js:55–69`), and `groundY`, which recomputes analytic terrain (`src/game2_world.js:408–416`). This is a second full-map synchronous CPU pass. | “Charting walkable ground” has no measured sub-progress and cannot yield. |
| Boot step 95 | Builds player, initializes state/gear, and refreshes six UI areas (`src/game5_main.js:730–745`). | Smaller than world construction, but still synchronous and can initiate more geometry/UI allocation. | Welcome is shown 350 ms after the fixed sequence ends (`src/game5_main.js:748–759`). |
| Play click | Hides welcome, sets `running=true`, creates an entry overlay, refreshes UI/tutorial/chat (`src/game5_main.js:798–812`). | `running=true` is the release condition for many independent polling modules. A new character also schedules Character Creator after 500 ms. | Entry bar is a 2.2 s CSS transition, not work completed (`src/game5_main.js:763–777`). |
| Entry +1.5 to +2.6 s | Region/prop intervals simultaneously become eligible. Examples: three Tutorial Island polls at 1.5/1.6/1.5 s (`src/tutorial_island.js:76–109`, `122–168`, `191–204`); Gloomfen 1.6 s (`src/gloomfen.js:68–70`); Veyhollow 1.8 s (`src/veyhollow_town.js:179–181`); Town Square 1.9 s (`src/town_square.js:322–324`); Wardenholm 2.2 s (`src/wardenholm.js:703–705`); Dunes/Stilts 2.5/2.6 s (`src/dunes_camp.js:44–46`; `src/gloomfen_stilts.js:58–60`). | Static enumeration found at least 32 construction interval callbacks in this window, plus other timers. The browser runs due callbacks serially without a render opportunity between long callbacks. | The overlay watches for eight frames under 45 ms, but also hides at 6–6.8 s even if readiness is incomplete (`src/game5_main.js:778–796`). |
| First ten seconds running | Every animation frame calls `update`, `drawMinimap`, and `renderer.render` (`src/game5_main.js:688–696`). `update` scans world arrays and performs roof/resource/water/effect work (`src/game5_main.js:563–685`). | Full minimap canvas is reconstructed every frame and scans resources, NPCs, clickables, and drops (`src/ui_map.js:68–133`). Camera/fog code allocates a `THREE.Color` and `THREE.Vector3` every frame (`src/game5_main.js:677–685`). Independent visual RAF loops also exist in reference assets. | Once the overlay disappears there is no frame-health indicator for ordinary players. |

## Evidence and quantified static checks

| Finding | Status | Evidence |
|---|---|---|
| Full-map terrain is generated before welcome. | Proven | `buildGround()` calls `buildTerrainPatch(..., 300, 200)` over the 480×320 world (`src/game2_world.js:384–405`). Plane topology is therefore 301×201 = 60,501 vertices and 300×200×2 = 120,000 triangles. |
| Terrain generation has high per-vertex CPU cost. | Proven work; live duration unknown | `buildTerrainPatch` loops every vertex (`src/game2_world.js:313–372`). `terrainHeight` samples a 5×5 kernel (`src/game2_world.js:200–218`) and path coloring calls `pathDist` (`src/game2_world.js:351–353`). `pathDist` scans all 30 road segments (`src/game1_data.js:509–541`). |
| Collision rebake is a full-map, collider-dependent pass. | Proven | `CollisionGrid.rebake` loops 153,600 tiles and calls `_walkable` (`src/collision_grid.js:73–94`). `_walkable` calls `collides` and `groundY`; `collides` linearly iterates all colliders (`src/game2_world.js:55–69`). Exact collider count at this phase is not recorded. |
| Play releases a timer herd. | Proven | Static scan of the 150 loaded `src/*.js` files found 54 files containing `setInterval`; 37 contain both an interval and a `running` reference. Manual inspection found at least 32 region/prop construction callbacks scheduled between 1.5 and 2.6 seconds. `game5_main.js:760–762` also states these self-booting builders settle after `running` flips true. |
| Construction is split across repeated passes for the same regions. | Proven; exact duplicate meshes not asserted | Holm is populated during boot (`src/game4_ui.js:1998–2035`) and Tutorial Island adds three delayed passes after Play (`src/tutorial_island.js:76–204`). Brynholt base content is built during boot (`src/game4_ui.js:1906–1913`) and `src/brynholt.js:103–105` builds again after Play. Veyhollow receives boot-era dressing (`src/game4_ui.js:1782–1802`) plus delayed town, square, and square-composer passes. These may be complementary, but there is no single ownership/readiness boundary. |
| Geometry/material reuse is insufficient in procedural builders. | Proven pattern; runtime magnitude unknown | `mat(c)` always returns a new material (`src/game2_world.js:49`). Scatter builders create new geometries/materials inside per-instance loops, e.g. sticks and bush lobes/berries (`src/world_scatter.js:8–53`). Across all `src/*.js`, static source contains 1,278 geometry-constructor sites, 1,177 mesh-constructor sites, 356 material-constructor sites, and only one `InstancedMesh` constructor site. Static sites are not runtime counts, but the ownership pattern explains potential draw-call and memory amplification. |
| Some instancing exists, but only for one dressing path. | Proven | `scatterInstanced` and `dressWorld` merge tufts/flowers/reeds/mushrooms/pebbles into a small number of instanced draws (`src/game2_world.js:1255–1336`). Most region/building modules still create individual meshes. |
| Asset readiness is not coordinated with world readiness. | Proven | Five tree GLBs start asynchronously at script evaluation (`src/game2_world.js:432–440`). `buildTextures` starts nine `TextureLoader` requests (`src/game2_world.js:144–166`, `2491–2504`) but returns immediately. `makeTree` permanently takes a procedural fallback when the GLB is not ready (`src/game2_world.js:541–640`). Network/decode timing can therefore change startup construction and mesh count. |
| The loading UI is misleading. | Proven | Boot percentages are constants and each job is invoked by a 220 ms timeout (`src/game5_main.js:723–759`). Labels do not always describe their functions. Entry progress is a fixed CSS transition; comments explicitly call the post-Play behavior a “real render freeze” (`src/game5_main.js:760–796`). |
| Existing smoke budgets tolerate an unplayable startup. | Proven | `src/smoke.js:39–47` permits 120 s to welcome, 12 s entry settle, 1,500 ms worst frames, 4,500 draw calls, and 3.5 million triangles. Its comment says the harness sees 60–90 s boots (`src/smoke.js:40`). Passing those values is a regression detector, not a player-quality gate. |
| Minimap appearance can be preserved while its cost is reduced. | Proven separation opportunity | Bezel/skin is CSS-only and behavior-neutral (`src/ui_minimap.js:1–29`). Map painting is isolated in `drawMinimap` (`src/ui_map.js:68–133`). The visual can stay unchanged while static layers are cached and dynamic dots update at a lower rate. |

## Ranked root causes

### 1. Unyielding whole-map terrain and collision work before welcome — very high confidence

The two largest algorithmically obvious jobs are a 60,501-vertex terrain build and a 153,600-tile collision rebake. Both run as single synchronous callbacks. The collision pass combines analytic height recomputation with an O(collider-count) scan per tile. This can monopolize the main thread long enough for Chrome to consider the page unresponsive.

Evidence: `src/game5_main.js:723–746`; `src/game2_world.js:308–405`; `src/collision_grid.js:73–94`.

### 2. Post-Play thundering herd of world builders — very high confidence

The startup design intentionally postpones many modules until `running=true`, then schedules them in nearly the same two-second band. There is no coordinator, job priority, cancellation, proximity check, or per-frame budget. This is the best static explanation for “loading finished, then it froze.”

Evidence: `src/game5_main.js:760–796` and the interval endpoints cited in the phase table.

### 3. Everything is loaded for one local player instead of one playable chunk — high confidence

The tutorial player needs Holm, nearby collision, player/UI, and the minimap. Current boot builds distant cities, dungeons, wilderness, ports, decorative world scatter, review spaces, and collision for the full map before entry. Delayed modules then add more distant content. The amount of work scales with the authored world rather than the player's immediate view.

Evidence: `src/game5_main.js:727–729`; `src/game4_ui.js:1582–2035`.

### 4. Mesh, geometry, material, and draw-call amplification — high confidence pattern; magnitude requires telemetry

Most procedural builders allocate separate scene nodes, geometries, and materials. `mat()` is not cached. One instanced dressing path is the exception. This raises CPU construction cost, garbage pressure, GPU upload cost, shader/material switches, and traversal/render cost. Exact live draw calls, triangles, texture memory, and heap could not be measured because the reported path becomes unresponsive; they must be captured by the proposed instrumentation.

Evidence: `src/game2_world.js:49`; `src/world_scatter.js:8–163`; source-constructor counts above.

### 5. Per-frame work scales with total world state — medium/high confidence

The minimap repaints from scratch on every rendered frame and scans global arrays. The game update also touches global resources, water, interiors, roofs, fires, effects, and drops regardless of spatial relevance. With a fully resident world, steady-state cost continues growing as content is added.

Evidence: `src/game5_main.js:563–696`; `src/ui_map.js:68–133`.

### 6. Asset loading races and script-side boot ownership — medium confidence

Classic scripts initiate asynchronous model/texture loads without a Promise-based manifest. Builders decide between GLB and procedural fallback based on timing. Fifty-four timer-owning loaded files create many independent lifecycles. This makes startup nondeterministic and prevents accurate progress reporting.

Evidence: `src/game2_world.js:432–440`, `541–640`, `2491–2504`; `index.html:656–813`.

### 7. WebGL configuration or asset decode may amplify the incident — hypothesis, not yet proven

Antialiasing, up to 2× device pixel ratio, and an enabled PCF soft-shadow map increase GPU/backbuffer costs (`src/game2_world.js:7–15`), even though the main sun does not cast shadows. Shader compilation, GLB decode, PNG decode, GPU driver behavior, OneDrive filesystem latency, or device memory could worsen the stall. Static code does not identify which of these dominated the user's machine.

## Unknowns that must not be guessed

- Exact longest task and its stack on the affected machine.
- Exact time spent in terrain, each population function, collision rebake, each delayed builder, first render, and shader compilation.
- Scene object count, unique geometry/material/texture count, draw calls, triangles, JS heap, and GPU memory immediately before welcome and after each entry wave.
- Whether Chrome killed the page because of one long task, sustained memory pressure, GPU reset, or a combination.
- Whether all GLBs/textures were ready before their builders ran.
- Whether a particular browser extension or hardware/driver issue amplified the reproducible architectural stalls.

## Instrumented boot pipeline

The replacement pipeline should have one authority, `BootCoordinator`, and no self-starting region timers. Modules register data/jobs; only the coordinator decides when they run.

| Stage | Required work | Instrumentation | Yield/readiness rule |
|---|---|---|---|
| 0. Shell | Load minimal CSS, login UI, error recorder, config/save metadata, and a boot manifest. | `navigationStart`, resource timings, script bytes, parse/eval marks, first paint, long-task observer. | Login shell remains responsive; no world construction. |
| 1. Core | Load Three.js, engine, input, Player mechanics, UI, and minimap skin. Create renderer at a conservative device profile. | Mark renderer/context creation; record pixel ratio, canvas pixels, renderer capabilities, context-loss events. | Any synchronous job over 50 ms fails development boot. |
| 2. Essential assets | Promise-load/decode only player, Holm ground palette, tutorial buildings/props, and icons visible in starter inventory. | Per-asset fetch/decode/upload timings, bytes, retry/error state, cache hit. | Weighted progress reflects completed asset promises, never a timer. |
| 3. Spawn chunk | Build only Holm plus a one-chunk safety ring from data. Generate terrain/collision in a Worker where possible; assemble scene in time-sliced batches. NPCs remain deferred. | For every job: start/end/duration, objects/meshes/geometries/materials/textures/colliders added, heap delta, renderer memory delta. | Main-thread assembly budget ≤4 ms per frame; yield on budget exhaustion. |
| 4. Playable | Spawn/restore player, install input, render one frame, prove a nearby 4-directional path, and acknowledge input. | `playClick`, first rendered frame, first controllable frame, first input processed, spawn-path result. | Entry overlay can close only after these explicit conditions pass. |
| 5. Neighbor stream | Stream adjacent chunks by predicted movement and camera distance. Cache immutable shared geometry/materials; instance repeated props. | Chunk request/build/activate/unload timings; resident chunk count; draw/triangle/heap budget per chunk. | One active build queue; near chunks outrank far chunks. No timer polling. |
| 6. Background systems | Start audio, optional visual FX, maps/search, distant chunk prefetch, and nonessential UI after control is established. | Each service has an owner, start reason, CPU interval, and stop/dispose count. | Background work pauses or degrades when frame budget is missed. |

### Required telemetry payload

For every development boot, emit one JSON record with:

- build ID, browser/device profile, viewport, pixel ratio;
- phase start/end/duration and longest synchronous task in each phase;
- every job over 16 ms and every Long Task over 50 ms;
- time to shell, welcome, Play click, first render, first controllable frame, and entry-overlay close;
- resident chunks and active build queue depth;
- scene nodes, meshes, lights, colliders, resources, clickables, interiors;
- unique geometries/materials/textures and `renderer.info.memory`;
- draw calls, triangles, shader programs, FPS and p50/p95/p99/worst frame;
- JS heap when Chromium exposes `performance.memory`;
- asset fetch/decode failures and WebGL context-loss events.

Take scene snapshots after each phase by traversing the scene and counting object identity in `Set`s. During development, wrap coordinator jobs so before/after counts are automatic. This avoids relying on static constructor-site counts.

### Minimap preservation plan

Keep the current bezel, size, icon language, click behavior, and visual map. Split its painter into:

1. a cached static layer for land, ditch, roads, and zone tints;
2. a chunk-change layer for resources/buildings;
3. a dynamic layer for player, destination flag, dots, and compass at 10–15 Hz or only when position/yaw changes materially.

This preserves the user's chosen minimap while removing the full global-array redraw from every animation frame (`src/ui_map.js:68–133`).

## Proposed player-quality budgets

These are replacement targets, not claims about current performance. Calibrate on one ordinary desktop and one low-end/mobile profile, then make them CI gates.

| Metric | Target | Hard failure |
|---|---:|---:|
| Shell visible and responsive, warm local load | ≤500 ms | >1,000 ms |
| Shell visible and responsive, cold load | ≤1,500 ms | >2,500 ms |
| Welcome/login usable | ≤2,000 ms warm; ≤4,000 ms cold | >5,000 ms |
| Play click → first rendered world frame | ≤500 ms warm; ≤1,200 ms cold | >2,000 ms |
| Play click → first controllable frame | ≤750 ms warm; ≤1,500 ms cold | >2,500 ms |
| Long tasks before control | zero >100 ms; no more than two 50–100 ms | any >250 ms |
| Main-thread world-build slice after control | ≤4 ms p95 | >12 ms |
| Foreground FPS at tutorial spawn | ≥50 desktop; ≥30 low-end | <40 desktop; <25 low-end |
| Frame time after settle | p95 ≤25 ms, p99 ≤50 ms | any frame >150 ms outside visibility recovery |
| Visible spawn-chunk draw calls | ≤500 target | >800 |
| Visible spawn-chunk triangles | ≤500,000 target | >900,000 |
| Unique materials in spawn chunk | ≤150 target | >250 |
| JS heap after spawn settle | ≤200 MiB desktop target | >300 MiB |
| Collision ready for spawn + safety ring | ≤250 ms off-thread or sliced | >750 ms / any blocking full-map bake |
| Entry progress accuracy | monotonic completed work; ETA optional | timer-only/fake completion |

The existing smoke thresholds (`src/smoke.js:39–47`) should remain temporarily as catastrophic-regression sentinels, then be replaced by these phased gates. A 120-second “pass” cannot represent a smooth game.

## Migration stages

### Stage 0 — Measure before changing behavior

Add phase marks, Long Task observation, job wrappers, and scene/resource snapshots around the current pipeline. Capture a baseline on the affected browser. Do not change combat, XP, movement, NPC policy, world placement, or the minimap appearance.

Exit criterion: one boot record identifies the longest tasks and before/after object counts for every current boot step and delayed builder.

### Stage 1 — Replace timer ownership with a single queue

Convert self-booting modules into registered jobs without changing their output. Preserve data and builders initially. The queue owns ordering, dependencies, errors, cancellation, and a per-frame time budget.

Exit criterion: setting `running=true` creates no unmanaged construction timer; no post-Play thundering herd occurs.

### Stage 2 — Make Holm the only startup world

Define a Holm spawn chunk and safety ring. Build only those terrain/collision/content records before control. Keep all distant regions unloaded. NPCs remain deferred as required.

Exit criterion: Play reaches a controllable Holm within the budget, and the player can complete a real out-and-back 4-directional path while no distant settlement exists in the scene.

### Stage 3 — Chunk terrain and collision

Move terrain samples and collision flags to fixed chunks. Compute typed-array data off-thread where possible; assemble BufferGeometry and colliders incrementally. Reuse cached biome/path fields rather than recomputing analytic height for every collision tile.

Exit criterion: no full-map `buildTerrainPatch` or `CollisionGrid.rebake` runs on startup; entering an adjacent chunk never causes a >100 ms long task.

### Stage 4 — Reduce object amplification

Introduce geometry/material caches and instancing/merging for repeated architecture pieces, foliage, fences, paving, roofs, and small props. Give every chunk an explicit `dispose()` path. Preserve interactive roots separately from merged visuals.

Exit criterion: spawn chunk meets draw-call, triangle, material, and heap budgets; repeated load/unload returns counts to baseline without leaks.

### Stage 5 — Rebuild world content purposefully

Only after startup is stable, rebuild Tutorial Holm, Veyhollow, buildings, landscape, story, economy, wilderness, and future siege/civilization systems as chunk data. Reuse approved assets. This is the safe place for the broader design overhaul: each place ships with a purpose, functional interiors, travel relationships, and performance cost declared in its data.

Exit criterion: each authored chunk passes gameplay purpose, pathing, visual, and performance acceptance independently before it is connected to the world.

### Stage 6 — Tighten the smoke gate

Drive the real login/Play path as today, but fail on phase budgets, Long Tasks, first controllable frame, chunk-stream hitches, and memory/draw-call regressions. Keep a cold and warm profile.

Exit criterion: three consecutive cold boots and ten warm boots meet budgets without console errors, context loss, or unresponsive-page warnings.

## Acceptance criteria for the startup overhaul

1. No world-building module starts itself with polling timers.
2. Progress percentage is derived from completed weighted jobs/assets and cannot reach 100% before the first controllable frame prerequisites are ready.
3. Only the spawn chunk and safety ring are resident at first control.
4. No startup or entry task exceeds 250 ms; the target is no task above 100 ms.
5. Terrain and collision are chunked; no 480×320 startup pass remains.
6. A real Play click produces a rendered, controllable player within 2.5 seconds on the hard-failure profile.
7. A real 4-directional out-and-back path succeeds immediately after control.
8. The minimap retains its current appearance and interaction, while static painting is cached and dynamic updates are bounded.
9. Spawn scene stays under 800 draw calls, 900k triangles, 250 unique materials, and 300 MiB JS heap on the hard-failure profile.
10. Moving across three chunk boundaries produces no frame over 150 ms, and unloading returns scene/resource counts to baseline.
11. Asset failures present a retryable error with the failed asset/job name; they never leave an infinite loading animation.
12. NPC spawning remains disabled until explicitly approved; combat math, XP curve, 1-unit tiles, and four-direction movement remain unchanged.

## Commands and checks used

All checks were read-only except creation of this report.

```text
Select-String src/game5_main.js for BOOT_STEPS; Test-Path src/smoke.js
Enumerated index.html script tags and local file sizes
rg for setInterval, setTimeout, requestAnimationFrame, running guards, loaders, and geometry/material/mesh constructors
Inspected numbered source ranges for BOOT_STEPS, initEngine, terrain generation, population functions,
CollisionGrid.rebake, delayed builders, animate/update, minimap painting, smoke budgets, and NPC gates
Static totals: 153 sourced scripts; 151 local; 150 local src scripts; ~1.84 MiB local sourced JS;
54 loaded src files with intervals; 37 loaded src files with both intervals and a running reference;
1,278 geometry-constructor sites; 1,177 Mesh sites; 356 material-constructor sites; one InstancedMesh site
```

No core files, world placement, combat/XP code, NPC data, or runtime modules were changed by this audit.
