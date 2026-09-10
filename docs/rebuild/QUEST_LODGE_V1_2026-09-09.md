# Quest Lodge v1 — functional building slice

Date: 2026-09-09
Status: live functional graybox; owner fully-designed art gate still open

## Delivered boundary

Lesson Green's Quest Lodge reservation (pad `quest_lodge`, 12x9 at 136,136) is replaced by the fourth complete
Blender-built Tutor's Holm building, facing the Teaching Kitchen across the Lesson Green route node. The optional
`learn_quests` lesson no longer waits for a modelled guide: studying the great quest board opens the real quest
journal tab and records the lesson in `Tutorial.optional`. A `quest_guide_socket` empty is authored in the GLB and
the definition (bundle-excluded, no geometry, no interaction) so the modelled guide can stand there later without
re-authoring the room. The required thirteen-step route is unchanged.

## Composition

- **Plan:** gabled hall (7x9, 4.2-tile walls, ridge east–west so it reads against the Kitchen's north–south gable),
  a half-octagonal chart turret engaged on the north-west corner (3.6-tile walls), and a covered east porch with
  posts, rails and a sign board that composes the arrival from the route node. One shared-endpoint perimeter.
- **Doors:** east lodge door under the porch (opening on tile centre 140,134.5) and west road door (opening on
  tile centre 133,137.5) toward the mine road along x=128. Both are fitted full-frame leaves with over-door infill.
- **Roofs:** hall gable with tile courses, plaster gable ends with king post and collar, polygonal turret roof with
  tilted courses and a brass finial, porch lean-to, and a scroll-and-star iron finial on the east gable.
- **Interior:** board floor with a blue-and-red runner, flagstone turret floor, three ceiling beams, five windows
  at bay centres with braces removed, wall banners, candle shelves.
- **Hero and support objects:** great quest board (eight pinned notices, ink lines, brass pins, two wax seals,
  hanging lantern, reading lectern with open book); four-region chart table (sea, four land plates, roads, pins,
  compass rose) in the turret; the Ledger of Choices on a stone plinth with quill and inkwell; cushioned reading
  bench with a left-open book; scroll rack with rolled scrolls; porch sign; guide socket.

## Contract

- `src/world_v2_building_data.js` — `holm_quest_lodge_v1` (revision 1): four rooms, two doors with entry/exit
  flow, two services (board primary, chart secondary), one clue (ledger), three support spaces (bench, rack, silent
  guide socket), ten oriented wall colliders and eight service/support colliders. Five acceptance locks; the suite is
  now 41 checks.
- `src/world_v2_buildings.js`, `src/world_v2_objects.js`, `src/world_v2_holm.js` — asset, template, authored
  object and seven compiled interaction rows (53 provider rows); pad retired.
- `src/holm_landscape_data.js` — `quest_lodge` joins the completed pads; `holm_tree_7` moved from (135,140) to
  (136,143); the pad level rose from 1.25 to 1.5 so the east approach's largest cardinal step is 0.95 tiles
  (it was 1.11, over the 1.05 pathing ceiling). The Lesson Green terrain bundle was republished through the
  journaled workspace (`lesson-green-district`, export `1c882fb3fb460e39`, applied cleanly).
- `src/holm_tutorial_flow_data.js` — station tiles and building definition; `learn_quests` becomes
  `orient/quests` with a target tile and an `npcSocket` note while staying optional.
- `src/holm_quest_lodge_interactions.js` (new) — Study/Open journal on the board, Study on the chart, Read on the
  ledger; wraps `Tutorial.notify` to record `learn_quests` once.
- `src/holm_station_reach.js` (new, shared) — every wall-mounted station handler in the Lodge and the Kitchen now
  walks the player onto its authored interaction tile through the real doors before running, so nothing can be
  studied or filled through a wall. Found by real-pointer review: the board was reachable from the north lawn.
- `src/world_v2_holm.js` — **engine fix:** `rebakeBuildingFootprints` re-bakes every resident tile under a
  building's footprint when its chunk loads or unloads. Previously a chunk baked before its neighbour's building
  streamed in kept unwalled tiles (the Lodge's and Kitchen's north rows), so the planner could walk through walls.
- `tools/blender/build_holm_quest_lodge_v1.py`, `assets/manifests/holm_quest_lodge_v1.json`,
  `assets/blender/holm_quest_lodge_v1.blend`, `assets/models/buildings/holm_quest_lodge_v1.glb`,
  `tools/qa_quest_lodge.js` (new).

## Verification

- Asset pipeline (`--no-build`): PASS, 7,842 triangles, 65 primitives, 29 materials, 603,332 bytes.
- `node tools/test_world_v2.js`: all locks pass (53 rows, 41 building checks, lodge replacement lock).
- `node tools/validate_content.js`: PASS.
- `node tools/run_smoke_headless.js`: PASS 104/104, 60 FPS, 26 ms worst frame, 165 draws, zero errors.
- `node tools/qa_quest_lodge.js`: PASS 14/14 — fresh login, pathing to the porch, pad retired, guide socket without
  geometry, closed walls unreachable from the north lawn, porch deck, lodge door and roof cutaway, board study opening
  the journal and recording `learn_quests`, turret mouth, reading corner, road door and the x=128 spine, reload
  persistence, no page/console/load errors.
- `node tools/qa_teaching_kitchen.js`: PASS 11/11 after the shared reach guard and collision fix.
- Real-pointer pane: lodge door click; board study from inside; road door click; walk out; board click from outside
  routed the player back in through the open road door and fired the lesson. Zero console errors.

## Direct visual review

Comparison sheet: `Bible_References/Complete/_compare/holm_quest_lodge_v1_exterior_compare.png` (8.5) and
`holm_quest_lodge_v1_interior_compare.png` (see PASS_LOG). Silhouette is a deliberate three-mass composition with a
cross-axis gable; hierarchy is gable > turret > porch; materials follow the Workyard family; the reference-defining
features (board, lectern, chart, ledger, porch) are present and readable inside with the roof cut away; the
notice lantern is emissive. Held under 9.0: the gable tiles read as a flat diagonal pattern, porch balusters and
turret courses are boxy, and the interior wants a second occupation cluster. **Functional graybox**, not release
art, until the owner's §2.1 gate.

## Open boundaries

- The chart turret interior (radius 2.1) is a window bay: its floor tiles are within the wall sampling pad, so the
  chart is studied from the turret mouth tile (133.6,133.6). A wider turret would need a wider pad.
- Not yet a Studio building-bundle workspace (same as the Kitchen).
- Remaining reservation pads: Mine Gatehouse, Holm Bank, Combat Hall, Mage Tower.
