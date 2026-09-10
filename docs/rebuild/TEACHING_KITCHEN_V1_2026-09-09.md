# Teaching Kitchen v1 — functional building slice

Date: 2026-09-09
Status: live functional graybox; owner fully-designed art gate still open

## Delivered boundary

Lesson Green's Teaching Kitchen reservation (pad `teaching_kitchen`, 13x10 at 153,136) is replaced by the third
complete Blender-built Tutor's Holm building. The optional `bake_bread` lesson from the curriculum data now has a real
place: the player fetches buckets, fills flour and water, takes dough, kneads bread dough through the existing
`cooking_bread.js` chain, and bakes it on an authored range that also roasts raw fish. No NPC is involved; every
ingredient the original chef brief handed over is supplied by a labelled station, matching the Guide Hall and
Workyard's NPC-free service pattern. The required thirteen-step graduation route is unchanged.

## Composition

- **Plan:** L-plan compound. Tall gabled bakehouse (7x10, 4.4-tile walls, ridge north–south) with plaster gable ends,
  a lower lean-to pantry wing (6x5.5, 3.0-tile walls) sloping east, and a half-octagonal oven apse projecting from
  the bakehouse's south-east corner through a short throat. One ten-vertex perimeter shares every endpoint.
- **Doors:** west green door faces the Lesson Green route node (outside tile 145.3,137.6); north yard door exits
  toward the Quest Lodge lawn and the mine road (outside tile 149.5,129.8). Both are fitted full-frame leaves with
  over-door infill and stone steps.
- **Roofs:** bakehouse gable with tile courses, a wheat-sheaf iron finial, pantry lean-to, and a polygonal apse roof
  with tilted courses carrying the nine-course stone range flue.
- **Interior:** alternating flagstones in the bakehouse and apse, boards in the pantry, ceiling beams, five shuttered
  windows placed at timber-bay centres with the crossing braces removed.
- **Hero and support objects:** teaching range (stone body, iron hob, oven mouth, ash pit, chimney breast, mantel
  jars, kettle, pan, baker's peel) with an emissive three-tongue `range_flame` and ember bed; octagonal flour bin
  with heap and scoop; dough trough on splayed legs with proving cloth; water butt with ladle; bucket shelf with
  two stave buckets; chalk recipe board; tiered cooling rack with eight loaves; floured kneading table with rolling
  pin, dough balls and stool; hanging herb bunches; hearth log basket; salt box.

## Contract

- `src/world_v2_building_data.js` — `holm_teaching_kitchen_v1` (revision 1): four purposeful rooms, two doors with
  entry/exit flow, four services (range primary, flour bin secondary, dough trough, water butt), one story clue
  (recipe board), three support spaces (bucket shelf, cooling rack, kneading table), fifteen oriented wall colliders
  and seven furniture colliders, resources and a visual budget. Five new acceptance locks; the acceptance suite is now
  36 checks.
- `src/world_v2_buildings.js` — `ASSETS.holm_teaching_kitchen_v1` with its twelve semantic parts.
- `src/world_v2_objects.js` — `MANIFEST.holm_teaching_kitchen` template; interaction rows may now carry
  `acceptsUseItem` as data so an inventory item can target a station while it keeps its Interact hook.
- `src/world_v2_holm.js` — the kitchen is an authored chunk object with ten compiled interaction rows; its planning
  pad is retired. The provider now carries 46 interaction rows.
- `src/holm_landscape_data.js` — `teaching_kitchen` joins the completed-pad set; `holm_fence_5` moved from
  (149,131) to (146,128) so no passive prop sits inside the footprint.
- `src/holm_tutorial_flow_data.js` — the kitchen station records its building definition, service and exit tiles;
  `bake_bread` gains a target tile and arrow label while staying optional. The 13/13 flow acceptance is unchanged.
- `src/holm_teaching_kitchen_interactions.js` (new) — Cook/Study on the range, Fill bucket on the flour bin and
  water butt, Take dough, Take/Return bucket on the shelf, Read on the recipe board; the range hands the legacy cook
  loop a world-positioned proxy on the authored interaction tile so both bread dough and raw fish use the paths the
  Workyard fire already proved. It also wraps `Tutorial.notify` so the optional bake is recorded once in
  `Tutorial.optional`, and animates the flame and its point light (with a low-rate fallback for background tabs).
- `src/ui_save.js` — the `tut` save block now persists and restores `optional`.
- `tools/blender/build_holm_teaching_kitchen_v1.py`, `assets/manifests/holm_teaching_kitchen_v1.json`,
  `assets/blender/holm_teaching_kitchen_v1.blend`, `assets/models/buildings/holm_teaching_kitchen_v1.glb`.
- `tools/qa_teaching_kitchen.js` (new) — repeatable headless QA for the slice.

## Verification

- Asset pipeline (`--no-build`): PASS, 10,794 triangles, 75 primitives, 30 materials, 816,580 bytes; all nine
  authoring checks and six human-scale checks pass.
- `node tools/test_world_v2.js`: all locks pass, including the new kitchen replacement lock and the 46-row and
  36-check counts.
- `node tools/validate_content.js`: PASS.
- `node tools/run_smoke_headless.js`: PASS 104/104 structural, 60 FPS, 22 ms worst frame, 165 draws,
  32,598 triangles, six streamed boundaries with exact save/load, zero errors.
- Real-pointer golden path in the browser pane (disposable `?qaProfile=fable-kitchen`): walked from the Guide Hall
  apron to the west door with the game's own pathing, opened the door, took two buckets, filled flour and water,
  took dough, kneaded by clicking the flour bucket, armed the dough and clicked the range. Result: one loaf, 40
  Cooking XP, `Tutorial.optional.bake_bread = true`, zero console errors. A second real click on the range with two
  raw perch produced one roasted and one burnt fish through the range-bonus cook roll.
- Negative cases: the shelf refuses a third bucket, the trough refuses a second lump, returning buckets works, and
  an empty-handed Cook explains the chain.
- `node tools/qa_teaching_kitchen.js`: PASS 11/11 — fresh-profile login, pathing to the door, pad retired, green
  door and roof cutaway, flame and light animate in a visible tab (scales 0.962→0.777 over 600 ms), ingredient chain,
  bake and ledger, yard-door exit to (149.5,129.5), reload restores the ledger, loaf and position, no page errors,
  console errors or failed loads (favicon probe excluded).

## Direct visual review

Comparison sheets: `Bible_References/Complete/_compare/holm_teaching_kitchen_v1_exterior_compare.png` (8.6) and
`holm_teaching_kitchen_v1_interior_compare.png` (8.4). Silhouette and proportion read as a deliberate compound rather
than a box with trim; shape hierarchy is gable > lean-to > apse > flue; material separation follows the Workyard
family palette; the reference-defining features (working range, ingredient stations, fitted doors, shuttered windows)
are present; gameplay-camera readability is good outside and inside with the roof cut away; the flame animates.
Held under 9.0 because the shutters are flat slabs, the apse courses are boxy, the gable ends lack bargeboards, and
the interior still reads sparse beside the reference. This is a **functional graybox**: it should not be called
release art until it passes the owner's fully-designed gate in `docs/rebuild/ART_PRODUCTION_PIPELINE.md` §2.1.

## Open boundaries

- The kitchen is wired through the provider like the Guide Hall, not yet through a Studio building-bundle workspace;
  add `assets/world/authoring/studio-teaching-kitchen.json` + bundle when the next Studio publish pass runs.
- Kneading consumes both buckets with the dough (existing `cooking_bread.js` behaviour); a later polish could return
  empty buckets.
- Remaining reservation pads: Quest Lodge, Mine Gatehouse building, Holm Bank building, Combat Hall, Mage Tower.
  NPC production stays deferred by owner decision.
