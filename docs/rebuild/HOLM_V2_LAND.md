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

## Phase 4: the route - down the shaft, up into the keep; from Lastlight down to the skiff

The owner's plan (WORLD_LAYOUT_GUIDE §3.7, WORLD_GOAL W0b): "down here, up over there" underground, and the capstone's big
drop from the beacon straight down to the boat. The walk from Lastlight to the skiff falls from 114 tiles (round the
crown and across the south-east) to 69 tiles, all of it the Keeper's Stair and the cove.

| Piece | Files |
|---|---|
| East drift (Blender) | `tools/blender/build_holm_cavern_v2land.py` (the v1 cavern recipe with swaps, never edited) -> `holm-cavern-v2land-v1`, textured `holm-cavern-v2land-os-v1`: a 2-wide propped drift runs 16 tiles east from the smelting nook to an exit chamber (crates, a barrel, rope, a pick, torches), where `Cavern_ServiceLadderExit_` climbs a timber-lined shaft. Graph `holm-cavern-v2land-navigation-v1` (150 nodes, target `exit`) |
| Keep trapdoor | the keep re-measured with an `undercroft` stance in the hall (`v2land/keep.relock.json`); the hatch is a route prop (`tools/blender/build_holm_route_props_v2.py` -> `holm-route-props-v2`, textured `-os-v2`: an oak frame, the leaf thrown back on iron straps, the ladder rails in the shaft; plus a cove bell for phase 5) placed by `src/holm_island_extras.js` from `island-ladders.json` (`keep-undercroft`: `hatch` block), blocking its tile in the walk graph (runtime and `tools/holm_v2_land_inputs.js` alike) |
| Ladder + gates | `island-ladders.json` `keep-undercroft` (keep `undercroft` <-> cavern `exit`, 2004 instant storey change); services `Climb-up drift ladder` (cavern) and `Climb-down trapdoor` (keep, a service on a placed prop: `hatch`); both shut until `forge_dagger` ("The drift ladder is roped off. Foreman Durgin wants to see a bronze dagger first." / "The trapdoor is bolted from below."), kept in `v2land/gates.v2land.json` so the rebuild re-applies them |
| Keeper's Stair (Blender) | `tools/blender/build_holm_keepers_stair_v2.py` -> `holm-keepers-stair-v2`, textured `-os-v2` (2,292 tris): a flagged head landing on the crown path (y 13), flight 1 north down the cliff cleft (30 oak treads, 0.2 rise), a planked mid landing with a lantern post (y 7), flight 2 west along the back of the cove (26 treads of 0.23: the walk's per-step limit is 0.24 and the footprint limit 0.72), posts on stone footings sized from the terrain, stringers, rails, a rope on the seaward rail, a way-marker at the head. Graph `holm-keepers-stair-v2land-navigation-v1` (targets head, mid, foot). v1 ran flight 2 on to x 104, leaving its last tile a tread 0.6 over the shingle, so the walk could not step off; v2 lands flush on the shingle |
| Terrain | `src/holm_overhaul_terrain.js` `cuts` (lower-only path beds): the two flights' beds are carved into the cliff so no tread is buried; the Lanternfoot Cove pad (shingle, y 1.0); the old haven seat is dropped |
| Haven at Lanternfoot Cove (Blender) | `tools/blender/build_holm_haven_cove_v2land.py`: the v1 haven recipe with swaps (placement (101, 1.0, 14), v2 terrain, the whole haven turned 90 degrees so the pier runs north toward the mainland, every terrain sample turned with it) -> interior pass (`run_holm_m44_interior_on.py`) -> coplanar fix (`fix_holm_coplanar.py` m44) -> old-school textures: `holm-haven-v2land-v2 / -int-v2 / -fix-v2 / -os-v2`. v2 leaves out v1's cargo on the south apron, which would stand at the foot of the stair once turned (phase 5 places the cove's cargo as props). Graph `holm-haven-v2land-navigation-v1` (the shore stance is 2 tiles in: the cove is 3 deep under the cliff) |
| Haycombe Farm | the old haven site is a farm pad (y 2.4, habitat cleared); the south-east signpost's haven arm now reads Haycombe Farm (`v2land/habitat.v2land.json`); the farm is dressed in phase 5; the old haven's yard gate is gone (`haven-gate` dropped; Tobin himself refuses to sail until Lastlight burns) |
| Words | Durgin: follow the drift east, under the creek; the ladder comes up through a trapdoor in the Warden's Keep. Aldous: take the Keeper's Stair down to Lanternfoot Cove. Tobin (new lines): he ties up in the cove because the beacon shines straight down on that water; he rows you across to Hearthmere. The graduation line, the objective banner and the talk-first banner name Lanternfoot Cove; the guide arrow, down in the workings after the dagger, points at the drift ladder (`holm_island_guide.js`). The ferry's travel labels (Veyhollow) are the mainland's and are left for the naming pass there. |
| Rebuild | `tools/rebuild_holm_v2land.js` now re-applies the v2-land gate and signpost changes on top of the v1 snapshot; everything re-measured on the final terrain (12 buildings, every target reachable) |

Proof:
- Route audit (`node tools/audit_holm_v2_routes.js`, composed graph with the 2004 diagonals): all 18 stations reachable;
  the whole route 566 tiles (340 s at 0.6 s a tile; phase 3: 733); anvil -> keep court climbs the drift ladder
  (35 tiles instead of back up the shaft and across); Lastlight -> skiff walks the Keeper's Stair (69 tiles); the skiff
  is at Lanternfoot Cove; the lodge's north lane is still the one unreachable target (pre-existing).
- Real input, `node tools/qa_holm_route_v2.js` (new): 10/10 - the pieces load and join; the drift ladder refuses
  before the dagger; after it the guide arrow points at the drift ladder; the ladder comes up in the keep hall beside
  the trapdoor; the trapdoor goes back down; the hall walks out to the court; Lastlight's door -> stair head -> mid
  landing -> foot -> haven on foot by real clicks; Tobin speaks of Hearthmere; boarding sails; 0 page errors.
  Captures `scratchpad/holm_v2_land/qa_route/`.
- All unit tests pass (`for t in tools/test_*.js`).
- Sheets: `scratchpad/holm_v2_land/sheets/phase4_01..02.jpg` (before/after at the game camera: keep crag, crown climb,
  the cove, the farm site, the east) and `phase4_route.jpg` (the drift, the trapdoor, the stair, the cove, Tobin).

## Phase 5: density - clumped trees, yards, the farm, the cove, the wayside, fences, decor, 3-wide paths

| Piece | Files |
|---|---|
| Clutter pack (Blender) | `tools/blender/build_holm_clutter_props_v1.py` -> `holm-clutter-props-v1`, textured `holm-clutter-props-os-v1` (`v2land/clutter-props.textures.json`): 46 original pieces, 8,187 triangles - yard (barrel, apple barrel, crate, crate stack, sack, sack pile, hay bale, handcart, wheelbarrow, woodpile under a lean-to, chopping block with its axe, water trough, bench, well with roof and bucket, washing line, lamp post, milestone, spare cart wheel, rake and pitchfork, market stall), the broken carriage (the coach down on its smashed near wheel, the front wheel off and lying in the grass, the shaft snapped, a split trunk and clothes; examine "Somebody's journey ended early."), fences (split-rail run, post, a field gate swung open), farm (barn, haystack, scarecrow, cabbage row, sheep, cow, hen, feed trough), cove (lobster pot, pot stack, net rack, upturned rowboat, anchor, rope coil, fish crates) and the ground decor (grass clump, daisies, pebbles, mushrooms, fern, thistle, bracken). Faces meant to be seen from both sides are built as two faces on separate vertices (one poly call with a face and its reverse loses one in Blender: the phase 4 trapdoor leaf) |
| The dressing, as data | `tools/stage_holm_v2land_dressing.js` (new, deterministic, re-runnable): writes the generated sets of `island-props.json` (`dress-yards`, `dress-haycombe-farm`, `dress-lanternfoot-cove`, `dress-wayside`, `dress-decor`), the tree and signpost adds of `v2land/habitat.v2land.json` (applied by the rebuild), `src/holm_island_paths_data.js`, and `scratchpad/holm_v2_land/dressing_report.json`. Every blocking piece is tried on the composed walk graph first and kept only if every other reachable stance stays reachable (ladders and climbs included); nothing stands on a worn path, a stance, a doorway, a bridge landing, a gate or the hollow set |
| Paths | re-drawn on the v2 land: Dijkstra on the composed graph over open ground and the bridge decks along the old desire lines (`v2land/v1-snapshot/paths.json`), gentle slopes preferred; primary legs 3 tiles worn with a soft verge, secondary legs 1 worn with a soft verge; new legs to Minnow Hollow's Fire Beach, the Creakwheel Mill, Hettie's Garden, the Keeper's Stair head, the mage yard, Haycombe Farm and from the stair foot to the haven; the arrival trail's tiles kept. 1,675 tiles (1,078 worn) |
| Trees | 197 new trees in 39 clumps of 3-7 (pines on the coast, the cliffs and the crown; birches by the creek and the pond; oaks and birches in the meadows), clear of paths (3 tiles), yards, stances and pads: **267** island trees (70 before) |
| Clutter | **167** generated pieces (+ Hettie's Garden's 23 = 190), 87 % in yards: every building's kit hugs its walls (long side along the wall, the front away from it) - camp, bakehouse, lodge, quarry, keep, bank, mage tower, mill, Lastlight, haven; Haycombe Farm (barn, two haystacks, hay bales, a railed paddock with its gate, four sheep and a cow, troughs, a fenced kitchen garden with cabbage rows and a scarecrow, five hens, a well, a wheelbarrow); Lanternfoot Cove (pots, rope, anchor, barrels, the ferry bell at the pier root); the wayside (the broken carriage beside the old cart track at (81.6, 81.3), milestones, lamp posts, wells, a spare wheel, 14 small roadside clusters); 35 fence pieces and 2 gates |
| Signposts | four new junction signposts (Minnow Hollow / Survival camp / Guide House; Creakwheel Mill / Bakehouse / Guide House; Keeper's Stair / Lastlight / Mage Tower; Haycombe Farm / Mage Tower) |
| Ground decor | **1,685** pieces, 14.5 per 100 dry tiles (grass 622, pebbles 282, fern 179, bracken 177, thistle 169, daisies 139, mushrooms 117), denser in woodland, sparser on verges and the coast; no block, no shadow |
| Draw calls | `src/holm_instanced_cells.js` (new, `HolmInstancedCells`): repeated still pieces (habitat trees, shrubs, clutter, decor) are drawn as one InstancedMesh per mesh per 32-tile cell, each cell shown only while its box is in view; trees keep their breeze as a canopy vertex sway instead of one animation mixer per tree (`src/holm_island_extras.js`, `src/holm_island_props.js`); tutors off screen are not drawn (their rigs keep frustum culling off for animation, so each is culled by a standing-height sphere, `src/holm_island_tutors.js`: 168 -> 17-32 calls in a view) |

Proof:
- Game-camera views (`scratchpad/holm_v2_land/p5_after/capture.json`): **255-630 draw calls** (budget 800), 119-463k
  triangles. The two wide establishing views (camera distance 60, beyond the game's zoom) draw 1,218-1,277 calls, most of
  them the buildings (375 in view there, unchanged by this phase).
- Route audit: all 18 stations reachable, 567 tiles; the drift ladder and the Keeper's Stair legs as in phase 4; every
  fishing stance, Hettie's Garden, the millstones and the weir walk reachable; lodge:north-lane (pre-existing) the one
  unreachable target.
- All unit tests pass (including `test_holm_world_fixes` 5b: no untinted tile splits a worn path).
- Sheets: `scratchpad/holm_v2_land/sheets/phase5_01..06.jpg` (before/after, every view at the game camera) and
  `phase5_details.jpg` (the farm, the carriage, the cove, a meadow's decor, the bank court, the clutter lineup).
- Known: 28 authored or kit wishes found no valid ground near their spot (listed in `dressing_report.json`; mostly a bench
  or lamp where a path, stance or slope sits); the generator skips them rather than block a route.
