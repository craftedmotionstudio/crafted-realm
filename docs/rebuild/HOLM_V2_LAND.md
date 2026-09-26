# Tutor's Holm v2 land (W0b, 2026-09-26)

Branch `holm-v2-land` (worktree `CraftedRealms-HolmV2`, from 5435f46). Plan: `docs/rebuild/WORLD_LAYOUT_GUIDE.md` §3,
owner decisions in `docs/rebuild/WORLD_GOAL_2026-09-25.md` (W0b). Owner's words: "more overall elevation change, more
height to the island ... a small pond in a recessed area where we learn to fish, but make the fishing skill actually fun
... one of the buildings has a water wheel in the creek ... a cozy greenery area on one of the houses that overlooks the
water wheel ... other random medieval objects ... like a broken carriage."

Names (per `docs/rebuild/NAMING_BIBLE.md`, internal ids unchanged): the fishing hollow is **Minnow Hollow**, the mill is
**Creakwheel Mill**, Hettie's terrace is **Hettie's Garden**, the departure cove is **Lanternfoot Cove** reached by the
**Keeper's Stair**, the farm on the old haven site is **Haycombe Farm**. New player-facing text names the mainland town
**Hearthmere**.

One command rebuilds the land from its design: `node tools/rebuild_holm_v2land.js [--bridges]`.

## Phase 1: terrain compiler v2 and the new island heightfield

### What changed

| Piece | Files |
|---|---|
| Terrain source v2 (the seven features of the 2004 study) | `src/holm_overhaul_terrain.js`: plateaus with an edge fraction that unite by max (terraces step, never spike); a two-octave ground swell (amp 1.0, 5-tile cells, faded out inside basins); basins with a pond level (water kind **3**, a flat pond sheet); dimples; a creek `valley` that keeps both banks 0.9 over the water line (never a perched channel) and close-spaced creek points as weirs/cascades; rock material wherever a lattice vertex rises more than `rock.rise` (0.95) to a neighbour; **seats** (below). v1 sources compile byte-identically (checked against the Sept 13 bundle); both versions emit the same bundle schema, a v2 bundle adds `ponds` and `seats`. |
| The design, as data | `docs/rebuild/holm-overhaul/terrain-v2.design.json` (plateaus, basins, dimples, pads, grades, creek, approach, seats, bridges) |
| Builder + numbers | `tools/build_holm_v2_terrain.js` -> `.studio-workspaces/holm-overhaul-terrain-v2/` (source, bundle, `seats.json`), the WORLD_LAYOUT_GUIDE gap-table numbers, a plot grid (`scratchpad/holm_v2_land/terrain/`) |
| Seats | each building keeps the ground it was measured on: the footprint of its floors/stairs/decks (+1 tile) is imprinted from the Sept 13 lattice relative to its old foundation and lifted to the new one, then blended over 2 tiles into the new land. Plinths, steps, retaining walls and the lodge's bay foundation fit exactly; the Guide House seat covers its whole arrival yard (statue, garden walls, bench, hazels), so the approved arrival composition keeps its ground, lifted 1.4. |
| Composer rule | `src/holm_island_nav.js`: a measured link between two terrain-lane stances inside a building's patch obeys the land's own 0.9 step (the capsule sampler alone allows ~3 tiles of rise per tile), so a cliff inside a building's patch refuses the walk as it does on open land. |
| Pond water | `src/holm_arrival_water.js` `ponds()`: a flat sheet at the pond level over every tile flooded from the pond's own water tiles through ground that dips under the level (never over a low beach or the creek) |
| Pond water kind accepted | `src/holm_overhaul_chunks.js` (tile flag `overhaul-pond`), `src/holm_arrival_approach.js`, `tools/studio_overhaul_terrain_validation.js`, `tools/studio_arrival_validation.js`, `src/holm_arrival_export_loader.js` (source v2 role) |
| Re-measure every building | `tools/remeasure_holm_v2land.js`: survival, quarry, bank, mage, lastlight, haven through the general extractor (`extract_holm_building_navigation.py`, new optional spec keys `terrain`, `frame`) on `buildings/<id>-v2land.nav.json`; keep, bakehouse, lodge through their OWN extractors re-run by `relock_with_swapped_paths.py` with the terrain folder, output folder, model-hash source and foundation height swapped (`v2land/*.relock.json`). New graph workspaces `holm-<id>-v2land-navigation-v1`, each hash-bound to the exact old-school GLB the island loads; registry `docs/rebuild/holm-overhaul/v2land.json`. |
| Survival camp | `holm-survival-v2land-v1` (`tools/blender/derive_glb_without_parts.py`): the old-school camp without its creek fishing stage (jetty, landing, bank steps, reeds); fishing moves to the pond (phase 2) |
| Arrival package | `tools/stage_holm_arrival_package_v2land.js` -> `holm-arrival-package-v2land-v1` (Safe Publish export pinned in `src/holm_v2_land.js`): the Guide House foundation 3 -> 4.4, the landing path climbs 1 -> 4.4 on the design's approach, every model/envelope/measurement v3's |
| Runtime pins | `src/holm_v2_land.js` (new, `HolmV2Land`): the arrival export + the registry; `src/holm_island_extras.js` loads every building/graph/habitat/bridge from the registry; `src/holm_arrival_qa.js` loads the v2-land package in both looks; island save revision `holm-island-v2` (a v1 island stance restarts at the landing, the lesson ledger is kept) |
| Data | `island-gates.json` (each leaf rises with its building), `island-bridges.json` (decks measured on the v2 land), habitat `holm-habitat-v2land-v1` (101 plants that now stood in the pond/creek or on a cliff face left out; phase 5 re-plants), lodge foundation placement `holm-quest-placement-v2land-v1` |
| Bridges | rebuilt in Blender on the new decks (`build_holm_island_bridges_v2.py` with an output folder argument -> `holm-island-bridges-v3`, textured old-school -> `holm-island-bridges-v2land-v1`): timber deck 3.0 -> 2.3 (clears the creek by 0.80), stone deck 4.52 -> 4.3 (clears by 0.76) |
| Proof tools | `tools/audit_holm_v2_routes.js` (the 18-lesson route leg by leg on the composed graph), `tools/holm_v2_land_inputs.js` (headless inputs; `tools/holm_island_inputs.js` now delegates to it), `tools/capture_holm_v2_land.js` + `tools/make_holm_v2_land_sheets.py` (game-camera before/after sheets), `tools/bump_script_versions.js` (cache busting by content hash) |

### Measured (same metrics as the 2004 study, `node tools/build_holm_v2_terrain.js`)

| Metric | 2004 TI | Holm v1 | Target v2 | **v2 land** |
|---|---|---|---|---|
| Height p5 / p50 / p95 / max | 0.94 / 2.44 / 10.1 / 10.6 | 0.83 / 3.74 / 8.0 / 14.0 | 0.8 / 3-3.5 / 11-12 / 17-18 | **0.73 / 3.52 / 10.97 / 17.53** |
| Relief p5-p95 (player heights) | 5.8 | 3.9 | >= 5.5 | **5.54** |
| Relief per 32x32 block, median | 5.8 | 4.2 | 6.5-8 | **8.0** |
| Land <= 3 / >= 7 tiles | 68% / 15% | 38% / 14% | >= 45% / 20-25% | **45.0% / 23.1%** |
| Slopes flat / gentle / moderate / steep / cliff | 21/30/20/18/12 | 28/37/17/13/5 | 22-26/28-35/16-20/15-19/9-12 | **21.7 / 27.3 / 18.5 / 19.3 / 13.1** |
| Tiles above the 1.05 step | - | 4.5% | 10-12% | **11.9%** |
| Pond | 19 tiles, 0.6 below rim | none | 30-45 tiles, >= 2 below rim | **50 tiles; rim N/W/S 2.1 / 2.2 / 2.2 above the water, E opens to the creek** |

Site heights: landing 1.0, Guide House 4.4, survival camp 4.0 (floor), fire beach 1.6, pond 1.0 (floor 0.4), bakehouse
5.4, garden terrace 5.4, mill pad 3.2, lodge 6.4, quarry 9.15, keep 11.0 (crag, cliffs to the ravine), bank 7.3, mage
7.75, Lastlight 17.8, cove 1.0, farm 2.4. The creek falls 6.0 -> 0 with a ravine cascade (5.5 -> 4.8 at 68,40) and the
mill weir (3.1 -> 2.0 at 59-58, 60-62).

### Proof

- Re-measure: all nine island buildings re-measured on the v2 land in 67 s; every measured target reachable inside its
  graph; every graph hash-bound to the model the island loads and to the v2 terrain hash.
- Route (`scratchpad/holm_v2_land/route_audit.json`): every lesson station of the 18 is reachable on the composed graph
  (steepest land link 0.90, within the 1.05 limit) except `catch_fish`, whose creek stage was removed on purpose (phase 2
  moves fishing to the pond). The long legs (cavern -> keep 174 tiles, Lastlight -> haven 157) are the phase 4 route
  changes.
- Unit tests: all 77 pass except `test_holm_world_fixes` check 4 (the old creek fishing stage; rewritten in phase 2).
- Sheets (game camera, 18 views, before = 5435f46): `scratchpad/holm_v2_land/sheets/phase1_land_01..06.jpg`.

Known look items for later phases: the crown switchback reads as a boxy cut (rails + rock dressing in phases 4-5); the
seat edges show small rock-grey banks on the arrival lawn; cliffs are ground-texture rock, Blender rock faces come with
the clutter/density pass.
