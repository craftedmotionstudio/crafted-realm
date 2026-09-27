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

## Merges from the live branch

- 2026-09-26: live head 00ffa9e (8-direction movement with Holm nav diagonals, 28-slot pack, LocalCombat, the old-school
  right-click menu, online alpha, kit v3.1, equipment v2) and 97424a1 merged into this branch. Conflicts: Wenna keeps her
  Minnow Hollow spot (with the live branch's examine line), the survival services keep the menu rows minus the removed
  creek stage, the arrival provider keeps both sides (fishing dispose, QA route-to-point, the live navGraph export).
- The route audit now runs on the composed graph WITH the 2004 diagonals (the live composer rule: a diagonal only where
  all four straight links exist on one storey and none climbs more than a third of a step): every station stays
  reachable; the 18-lesson route shortens from 873 to 733 walked tiles (440 s).
- The composer's measured-terrain-lane rule (a building's terrain lane obeys the land's 0.9 step) and the live diagonal
  rule compose without change.

## Phase 2: Minnow Hollow, fishing that is fun (the 2004 way)

| Piece | Files |
|---|---|
| Pond set, pond life, fx pieces (Blender) | `tools/blender/build_holm_hollow_props_v1.py` -> `holm-hollow-props-v1`, textured `holm-hollow-props-os-v1`: 3-tile jetty, log steps, lily pads (+ flower), stepping stones, beached rowboat, drying rack, bucket, creel, net crate, Fire Beach ring, duck, frog on its pad, dragonfly, perch and reedpike, fish shadow, splash ring, droplet, bubbles (2,528 tris) |
| Catches (Blender items + icons) | `tools/blender/build_holm_fishing_items_v1.py` -> `holm-fishing-items-v1`; icons `assets/icons/items/{raw,cooked,burnt}_reedpike, soggy_boot, pond_weed, sealed_bottle, tarnished_ring.png`; items in `src/game1_data.js` (our own names and examine text; the bottle carries a short Lastlight note); ground models in `src/holm_items_v1.js`; the reedpike cooks on fire and range (`src/game5_main.js`) |
| Fishing rules + scene | `src/holm_fishing.js` (new): 3 ripples among 7 shore candidates (`docs/rebuild/holm-overhaul/island-fishing.json`); a move every 60-100 ticks telegraphed by bubbles and a 2-tick fade, "The fish have moved on." to whoever nets a moving spot; a roll every 5 ticks, each with a cast, a net splash ring + droplets and a plish; a catch lifts a flapping fish for a second with a flop, a chat line and the XP drop; the 2004 catch curve (48/256 at level 1); the first catch lands on roll 2 (the lesson cannot fail); after the lesson: perch 85%, reedpike 12% from Fishing 5, junk 3%, the sealed bottle 1/150 once per account, a tarnished ring 1/400; 1 miss in 60 a big fish leaps and soaks you; fish shadows under the ripples, a leap every 15-25 s, two ducks paddling, dragonflies, a frog that plops off its pad within 2 tiles, reeds and lily pads, an ambient loop fading over 4 tiles as you climb out. Moving-spot rules after the 2004 fishing scripts (MIT logic, studied read-only in 2004scape; our own numbers and code). |
| Game hooks | `src/game5_main.js` gather branch hands a Minnow Hollow spot's rolls to `HolmFishing.gatherTick`; `src/game4_ui.js`: a ripple takes a plain click when a net is in the pack (the menu's "Net") |
| Lessons | teaching oaks on the hollow rim (`island-lessons.json`); Fire Beach shingle pad (terrain v2 pad material); `light_fire` / `cook_fish` at the Fire Beach, `catch_fish` at the live ripple (the guide arrow follows the nearest live spot); Wenna at the head of the Hollow Path (a `world` stance); her lines, the banner and the hint lines rewritten (`holm_island_tutors.js`, `holm_island_talk.js`, `holm_island_guide.js`, `holm_island_curriculum.js`) |
| Nav | the hollow jetty is a deck (1.3); the set's solid pieces block where they stand; every candidate has a dry stance beside it |

Proof: `node tools/test_holm_fishing.js` 5/5 (the curve, the guaranteed first catch, the catch table over 300,000 seeded
rolls, the once-per-account bottle, spot timers and free candidates, items + icons). `test_holm_world_fixes` check 4 is
rewritten for the pond (every candidate on pond water under the pond sheet, a dry stance in reach, >= 2 apart, the jetty
clears the pond). Real input, `node tools/qa_holm_hollow.js`: 12/13 on the first full run (talk-first refusal, Wenna,
chop on the rim, the walk down the Hollow Path, a fire on the beach, a perch on roll 2, cooking with a burn retry, the
ledger, a varied session, frog/ducks/leaps, 0 page errors); the one miss was the check itself asserting all three spots
idle while another spot was naturally mid-move, rewritten to track the moved spot. Captures in
`scratchpad/holm_v2_land/qa_hollow/`.

## Phase 3: Creakwheel Mill, its wheel and weir, Hettie's Garden

| Piece | Files |
|---|---|
| The mill (Blender) | `tools/blender/build_holm_mill_v1.py` -> `holm-mill-v1`, textured `holm-mill-os-v1` (11,405 tris): 7x8 tiles, fieldstone ground floor with quoins and the wheel-pit wall down to the tailrace, a jettied timber-framed upper floor (west over the pit, north over the door), a thatched roof with a full hip north and a two-pitch hip south, a lucam with its sack hoist, shutters, a lantern by the door; inside: the tun with the runner stone, hopper and meal box, a grain bin, flour sacks, a sack barrow; outside: a spare millstone, sacks |
| Wheel, leat, weir, walk | a breastshot wheel 2.6 across, 0.8 wide, 8 spokes a side, 12 paddles, turning at 6 rpm (clip `WheelTurn`, 10 s a turn); a timber leat on trestles with a sluice gate from the head pool; the stone weir sill with the falling sheet (`FoamFlow`) and a splash where the paddles meet the tailrace (`SplashPulse`); the plank weir walk on the crest (`island-decks.json`: deck 3.35 over x 58-62 on row 59) |
| Terrain | the creek re-routed past the mill (weir crest 3.1 -> tailrace 2.05 at z 59.8-60.9), the mill pad 3.2; the creek valley now shapes the land BEFORE the hand-made terraces, so a terrace or seat by the creek stands as authored |
| Graph | `holm-mill-v2land-navigation-v1` (general extractor on the textured GLB, `buildings/mill-v2land.nav.json`): door, millstones, grain bin and the window over the pit, all reachable; the mill joins the island through its apron and the weir walk |
| Runtime | `src/holm_island_extras.js` (the mill building, its cutaway, two services that speak for themselves: no miller, one tutor per area), `src/holm_mill.js` (water rush, paddle slaps and the wheel's creak within 8 tiles), `src/holm_island_props.js` (new: data-driven Blender prop sets, instanced when repeated, examinable when they carry examine text) |
| Hettie's Garden (Blender) | `tools/blender/build_holm_garden_props_v1.py` -> `holm-garden-props-v1`, textured `holm-garden-props-os-v1` (3,316 tris): parapet runs and piers with ivy, a wicket gate, raised herb beds, a vine-and-rose arbour over a bench facing the wheel, a table with a jug and two cups, flower tubs, a bee skep, a bird table with two wrens, a lantern post, climbing roses; placed on the 5.4 terrace off the bakehouse's north-east corner (`island-props.json`), 3.4 above the tailrace, about 7 tiles from the wheel |
| Dialogue | Hettie: the flour comes from Creakwheel Mill across the creek; you can watch the wheel from her garden |

Proof: the route audit (`scratchpad/holm_v2_land/route_audit.json`) reaches Hettie's Garden, the millstones and the weir
walk on foot, and every lesson station still. Sheets: `scratchpad/holm_v2_land/sheets/phase2_3_01..02.jpg` (before/after
at the game camera) and `phase3_new_places.jpg` (the mill, the garden, the weir walk and the three Blender packs).
Known: the bakehouse has no side door onto the garden (its model is unchanged); the garden is entered by its wicket gate.
