# Tutor's Holm — redesign brief per building (P2-D, 2026-09-10)

Status: briefs for the P2-D art passes. One brief per building, written from the banked comparison reviews
(`docs/rebuild/<BUILDING>_V1*.md`, `Bible_References/PASS_LOG.md`), the play review
(`docs/rebuild/TUTORS_HOLM_PLAY_REVIEW_2026-09-10.md`) and the P2-C measurements. Each brief names the current
score and the gap the reviewer wrote down, then fixes the target for the pass. The bar for every pass is the owner's
fully-designed gate (`ART_PRODUCTION_PIPELINE.md` §2.1): two new comparison sheets at 9.0 or better, or an honest
score with the remaining gap named.

## Rules that apply to every pass

- **Footprint, doors, stations and tiles do not move.** The building definitions, interaction tiles, door entry
  points, collision rects and walk surfaces in `src/world_v2_building_data.js` are the contract the route driver,
  the per-building QA drivers and the flow data depend on. Art changes the mesh inside that contract.
- **Semantic parts stay named.** Every `parts` entry in `src/world_v2_buildings.js` must still resolve; the
  load-time merge (`src/world_v2_consolidate.js`) groups meshes under those parts, so a station may gain meshes
  freely and they will still collapse to one draw per surface bucket.
- **Two storeys live in the roof part.** Anything above hall height that must vanish with the cutaway (tower
  bands, upper studies, spires) is authored inside `roof`; the interior must read with the roof off from the
  elevated camera and from the low south-facing camera the play review used.
- **Materials are a family palette, not a per-object choice.** The merge buckets on type, roughness/metalness to
  0.5, transparency, side and texture; a building that wants to stay cheap keeps its opaque surfaces on one
  Standard material family and reserves separate materials for glass, flames and anything textured.
- **Budgets hold.** Each manifest's `maxTriangles / maxPrimitives / maxMaterials` stays; `python
  tools/asset_pipeline.py <manifest> --no-build` passes; `node tools/test_world_v2.js` (GLB node-tree locks) passes.
- **Gates after each pass:** locks, `validate_content`, the two-phase smoke, the building's `tools/qa_<id>.js`, and
  the full-route driver when a door, station or roof part changed. Comparison sheets go to
  `Bible_References/Complete/_compare/` with the direct review recorded in PASS_LOG.
- **Play-review items assigned below are part of the pass**, not optional polish.

## Guide Hall (`holm_guide_hall_v6`, manifest `holm_guide_hall_v6.json`)

- **Where it stands.** v5 scored 9.1 and was rejected by the owner as too blocky; v6 rebuilt the hall in the
  approved anchor language (thick reveals, fieldstone courses and quoins, timber bays, layered tiles) and is live
  with the owner's eyes-on review still open. It is the island's largest asset (26.5k triangles, 2.5 MB), almost
  all of it the relief chart and the layered roof.
- **Silhouette.** Keep the civic three-part massing (central gable over lower wings). Add the missing roof
  furniture the anchor promised: ridge caps, a lantern or bell cote on the ridge, chimney with pot, and eaves that
  cast a visible shadow line at the elevated camera.
- **Hero object.** The relief chart of Tutor's Holm. It must be the brightest, most saturated object in the room:
  a raised sandstone table with the island carved in relief, coloured districts, a brass compass rose, and the
  route pinned with flags. Its click target should cover the whole table top, not only the island (F-06).
- **Interior read.** Three occupation clusters instead of one: the chart (centre), the lesson register with a
  visible ledger and quill on its dais (west), and the provision rack with hanging oilskins and packs (east). The
  register dais moves half a tile off the north door axis so the teaching door reads from the south camera (F-09);
  the guidance beacon already points at the door, the geometry should not hide it.
- **Colour and material separation.** Pale limewash, dark oak, grey fieldstone, umber tile, brass, and one civic
  colour (deep red carpet ring) that nothing else on the island uses. Stained glass stays emissive glass.
- **Reference-defining features.** Deep door reveals with iron strap hardware, the timber bracing rhythm on both
  long walls, the layered staggered roof, the stained-glass ends, and the carved plaque at the landing.
- **Cut.** The relief chart's triangle count can drop by half with a coarser island mesh without losing the read;
  hidden faces under the chart table and inside the roof layers go.
- **Score target.** 9.0+ on both sheets (exterior from the apron, interior roof-off from the elevated camera).

## Survival Workyard (`holm_survival_workyard_v2`, manifest `holm_survival_workyard_v2.json`)

- **Where it stands.** v1 scored 9.1; the owner rejected the rectangular roof silhouette and directed v2 (compound
  and furnishing brief, 2026-07-14). v2 is live with the exterior kit, waterworks and fishing edge families (u3/u4/u5
  at 9.0+ individually). It is the island's heaviest building at 66 meshes after the merge because the three
  families keep per-part meshes and animated nodes.
- **Silhouette.** The compound must be memorable from its footprint: enclosed lodge, lower open lean-to, the
  dock reaching into the pond, the chimney. Break the remaining long roof line with a dormer over the lesson table
  and a lower shed roof over the tool bench.
- **Hero object.** The teaching fireplace with its hearth flame. Everything the survival lessons touch (tool bench,
  firemaking board, net rack, storm tally beam) sits in one sightline from the trail door.
- **Interior read.** Keep the lodge/lean-to split legible with the roof off; the cellar hatch and the ladder must
  read as a way down (the cellar family is separately scored and untouched here).
- **Colour and material separation.** Plaster, oak framing, fieldstone, iron, roof umber, moss, logs and rope
  already separate; the pass keeps that and merges the family palettes so the u3/u4/u5 props share the lodge's
  materials where they are the same substance (oak, rope, iron).
- **Reference-defining features.** Pond-side teaching function, fenced yard, marked trees (the three marked trees
  must read differently from the scenery oaks: ring-barked trunk band and a chalk mark, F-12), the dock with its
  pulley, and the fire pit. Add a proper fire pit ring on the firemaking tile so "Light a fire" has a place (F-13)
  and the campfire is visible from the default camera rather than under a canopy (F-14).
- **Cut.** The dock spans and pulley frame are eleven and five meshes; they can be authored as one mesh each
  with the animated crank, bucket and rope kept separate (their names are the animation targets).
- **Score target.** 9.0+ on a compound sheet from the trail and a yard sheet roof-off.

## Teaching Kitchen (`holm_teaching_kitchen_v1`)

- **Where it stands.** Exterior 8.6, interior 8.4. Held for flat slab shutters, boxy apse courses, gable ends
  without bargeboards, and a sparse interior beside the reference.
- **Silhouette.** Gable > lean-to > apse > flue hierarchy is right; give the flue a proper stack and cap and let the
  apse roof step in two courses so it reads round.
- **Hero object.** The teaching range: stone body, iron hob, oven mouth, the range flame (emissive, its own light
  is what streams the light count, keep it), mantel with copper pans, and a bread peel leaning on it.
- **Interior read.** A second cluster: the kneading table with flour dust, the trough and water butt as one
  working line along the wall, hanging herbs and onion strings from the beams, a bread rack with loaves. The bake
  lesson stations (shelf, bin, butt, trough, range) must read as a left-to-right sequence.
- **Colour and material separation.** Workyard family palette plus flour white and copper as the kitchen's own
  accents.
- **Reference-defining features.** Working range, ingredient stations, fitted doors, shuttered windows with real
  louvres and hinges, bargeboards on both gables.
- **Cut.** None needed; the building is 22 meshes after the merge.
- **Score target.** 9.0+ on both sheets.

## Quest Lodge (`holm_quest_lodge_v1`)

- **Where it stands.** Exterior 8.5, interior banked in PASS_LOG under 9.0. Held for gable tiles that read as a
  flat diagonal pattern, boxy porch balusters and turret courses, and an interior that wants a second occupation
  cluster.
- **Silhouette.** Three-mass composition with the cross-axis gable and the chart turret; the porch needs turned
  balusters and a real roof, the turret needs stepped courses and a finial.
- **Hero object.** The great quest board: eight notices, ink lines, brass pins, wax seals, and the notice lantern
  (emissive). It is the first thing seen from the lodge door.
- **Interior read.** Add the reading corner as the second cluster: the reading bench with an open ledger, a
  scroll rack with visible scroll ends, a rug, a candle stand. The region map in the turret must be a painted map,
  not a plain plane.
- **Colour and material separation.** Workyard family plus parchment cream and the lodge's own deep green for
  the board frame and shutters.
- **Reference-defining features.** Board, lectern, chart turret, ledger, porch; staggered roof tiles that catch
  light per course.
- **Cut.** None needed (16 meshes after the merge).
- **Score target.** 9.0+ on both sheets.

## Mine Gatehouse (`holm_mine_gatehouse_v1`)

- **Where it stands.** Exterior 8.5, passage sheet under 9.0. Held for flat pyramid roof courses, gate leaves
  without studs, and a winch-house gable end that wants a hoist beam and loading door.
- **Silhouette.** The tallest roof on the island reads as a gate; keep it. Add the hoist beam projecting from the
  winch-house gable with a hook, a loading door under it, and iron banding on the pyramid roof courses.
- **Hero object.** The head-frame with drum winch, wheels, hoist rope, hook and shaft lamp. The shaft mouth must
  read as a descent from the passage: timber collar, a rope down into darkness, the lamp lit (emissive).
- **Interior read.** The passage is the interior: the gate stone relief, the ore tally board and the ore cart in
  one line, chalk marks legible at the elevated camera. Climb-down is already the primary click during the lesson;
  the winch frame should look like something you climb down.
- **Colour and material separation.** Grey stone dominant with dark timber and iron; ore colours (copper orange,
  tin grey) only on the tally and cart so they teach.
- **Reference-defining features.** Twin gate leaves with studs and strap hinges under a portcullis, the head-frame,
  the shaft lamp, the road passing through.
- **Cut.** None needed (24 meshes after the merge).
- **Score target.** 9.0+ on both sheets.

## Holm Bank (`holm_bank_v1`)

- **Where it stands.** Exterior 8.4, hall 8.4. Held for the flat dormer cap, bare gable ends, hairline booth bars
  and the uniform marble grid; the vault chest is still the legacy chunk prop.
- **Silhouette.** Civic front with dormer, chimney and bay; give the dormer a real cap and finial, the gables
  bargeboards and a datestone, the bay a lead roof.
- **Hero object.** The two brass-grilled booths: thick turned bars, velvet coin trays, lamps (emissive glass), a
  polished counter with a bell. The booth is the required lesson station; it must be the brightest thing in the
  hall.
- **Interior read.** Counter and booths across the hall, the ledger desk and founders' plaque as the second
  cluster, the strongbox shelf and an authored vault chest replacing the legacy prop. Break the marble floor into
  a bordered pattern with a runner to the counter. The interface title reads "The Bank of Veyhollow" inside the
  Holm Bank (F-30): the bank UI takes its title from the building it opened in.
- **Colour and material separation.** Cream plaster, walnut, brass, deep blue velvet, marble; the only blue on
  the island belongs to the bank.
- **Reference-defining features.** Grille and booths, counter, dormer, bay window, plaque.
- **Cut.** None needed (26 meshes after the merge).
- **Score target.** 9.0+ on both sheets.

## Combat Hall (`holm_combat_hall_v1`)

- **Where it stands.** Two sheets banked without a numeric score; a functional graybox. The P2-B interior
  readability pass already moved the tower band into the roof group so the cavern landing reads after surfacing.
- **Silhouette.** Long hall with the drill tower; the tower needs a parapet with crenels and a banner pole, the
  hall a clerestory strip and a ridge beam with pennants so the pair reads as a training yard, not two boxes.
- **Hero object.** The training pell with padded head and strapped shield, cut marks and a sand floor ring around
  it; the archery butt with a target face and stuck arrows.
- **Interior read.** With the roof off: pell and butt as the two trial stations (NPC-deferred, sockets ready), the
  arms rack with distinct weapon silhouettes, the warden's roll on the wall, benches along the walls. After
  surfacing the camera must see the player on the landing (F-29): the tower interior gets a lit lantern and a
  contrasting floor so the landing reads even from a low camera.
- **Colour and material separation.** Grey stone with red-brown timber; the only red banner on the island.
- **Reference-defining features.** Pell, butt, arms rack, the tower ladder well, the two doors on the route.
- **Cut.** None needed (17 meshes after the merge).
- **Score target.** 9.0+ on both sheets, with the first numeric score recorded.

## Mage Tower (`holm_mage_tower_v1`)

- **Where it stands.** Two sheets banked without a numeric score; a functional graybox with the upper study
  authored in the roof part (visual only).
- **Silhouette.** The round tower with drum and spire; add a stepped spire with a finial, a projecting stair
  turret and arrow-slit windows so it reads as the headland's second landmark beside Lastlight rather than a
  chimney.
- **Hero object.** The rune table: velvet cloth, air and mind runes, primer, candle and the glowing orb (emissive,
  its light kept). The spell lectern faces it.
- **Interior read.** Ground floor as the practice room (rune table, lectern, tower register, bookshelf with real
  spines); the orrery as a rotating animated piece; the spiral stair reading as a way up even though the study is
  visual only. The camera clamp already keeps the boom out of Lastlight (F-36); the tower's own drum must not
  trap it: keep the drum inside the camera blocker radius rule used for Lastlight.
- **Colour and material separation.** Blue-grey stone, dark slate roof, violet cloth and brass; the only violet on
  the island.
- **Reference-defining features.** Round drum, spire, spiral stair, orrery, rune table.
- **Cut.** The drum's upper courses inside the roof part can share one merged mesh; nothing else.
- **Score target.** 9.0+ on both sheets, with the first numeric score recorded.

## Landscape and route (for the dressing item)

Not a building, recorded here so the passes share one vocabulary: the road along the spine gets edge stones and
wheel ruts, the shore a sand band with wrack, the switchback retaining walls and a rail, signposts at the four
route forks (Guide Hall apron, Survival Wood gate, Quarry Rise, Warden's Ridge), and scatter that thins near the
buildings so their silhouettes stay clean. The tin offshoot floor in the cavern (F-23) is part of this item.

## Order

Guide Hall / Survival Workyard first (the two the player sees most and the two with the most owner history), then
Kitchen / Lodge, Gatehouse / Bank, Combat Hall / Mage Tower, then landscape and route, then the Phase 2 regression.
