# Combat Hall v1 — functional building slice

Date: 2026-09-09
Status: live functional graybox; owner fully-designed art gate still open; combat trials remain NPC-deferred

## Delivered boundary

Warden's Ridge's Combat Hall reservation (pad `combat_hall`, 12x9 at 172,119) is replaced by the seventh complete
Blender-built Tutor's Holm building. The Training Cavern's one-way exit ladder now surfaces inside the hall's drill
tower at (176.5,116.5) instead of on the open pad, so a miner climbs up into a real room and leaves by the west door
that faces the Holm Bank's staff door. The melee and ranged trials stay deferred by the owner's NPC decision; their
standing sockets (`melee_dummy_socket`, `ranged_target_socket`) are authored in the GLB and the definition without
geometry or interactions, so the practice enemies can be added last through spawn data.

## Composition

- **Plan:** gabled drill hall (8x9, 4.6-tile walls, ridge east–west) with an inlaid sparring ring; a taller
  pyramid-roofed drill tower (4x4.5, 6.0-tile walls) on the east end holding the cavern stair head; a covered
  practice yard on posts (three open sides) south of the tower with an archery butt and raked sand; a half-octagonal
  armoury apse on the north wall. Four roof masses.
- **Doors:** west bank-side door (opening on tile centre 166,118.5) and south road door (opening on tile centre
  169.5,123.5); both fitted full-frame leaves with over-door infill.
- **Hero and support objects:** training pell (padded head, strapped shield, cut marks); rack of arms (swords, axes,
  shield, bow, quiver); Wardens' roll of honour under a steel helm; archery butt with painted rings; hall bench with a
  spare helm and gloves; stair head with kerb, balusters, rails, lamp and sign; wall banners and shields; water
  barrel; quiver stand; tower brazier; crossed-swords gable crest and iron helm finial.

## Contract

- `src/holm_training_cavern.js` — `LAYOUT.hall` is now (176.5,116.5).
- `src/holm_tutorial_flow_data.js` — combat_hall station entry (176.5,116.5), service (171,121.2), exit
  (169.5,125.5), building definition; `melee_trial`/`ranged_trial` carry their `npcSocket` names while staying
  optional and NPC-phase. 13/13 flow acceptance holds.
- `src/holm_landscape_data.js` — pad level 2.02 → 2.3 (largest approach step 0.88, was 1.05 on the bank side);
  `combat_hall` joins the completed pads.
- `src/world_v2_building_data.js` — `holm_combat_hall_v1` (revision 1): four rooms, two doors, two services (pell
  primary, rack secondary), one clue, two inspect-only support spaces plus two silent sockets, sixteen wall colliders
  and nine post/furniture colliders. Five acceptance locks; suite now 56.
- `src/world_v2_buildings.js`, `src/world_v2_objects.js`, `src/world_v2_holm.js` — asset, template, authored
  object and seven compiled interaction rows (77 provider rows); pad retired.
- `src/holm_combat_hall_interactions.js` (new) — Study on the pell (opens the ⚔ combat tab and explains the three
  attack styles and wielding), Study on the rack (equipment slots, ammunition and runes, opens the equipment tab),
  Read on the roll; all wrapped with `HolmStationReach.guard`.
- `tools/blender/build_holm_combat_hall_v1.py`, `assets/manifests/holm_combat_hall_v1.json`, source `.blend`,
  runtime GLB, `tools/qa_combat_hall.js` (new, includes the real cavern round trip).

## Verification

- Asset pipeline (`--no-build`): PASS — 8,514 tris, 58 prims, 28 materials, 643,368 B.
- `node tools/test_world_v2.js`: all locks pass (77 rows, 56 building checks).
- `node tools/validate_content.js`: PASS.
- `node tools/run_smoke_headless.js`: PASS 104/104, 60 FPS, 22 ms worst frame, 165 draws, zero errors.
- `node tools/qa_combat_hall.js`: PASS 17/17 — fresh login, ridge approach, pad retired with silent sockets, long-route
  negative from the north (plan 25 tiles), bank-side door and hall entry, roof cutaway, pell study opening the combat
  tab with the required route untouched, apse mouth, arch to the tower landing, covered yard, road door exit, reload
  persistence, then the real cavern round trip: gatehouse winch house from the hall side, shaft descent, cavern route
  to the exit ladder, climb surfacing at (176.5,116.5) inside the tower with the roof cut away; no errors.
- Real-pointer pane: bank-side door click opened the leaf; a pell click walked in and opened "The training pell",
  and "Show me the styles." left the ⚔ combat tab active; tower landing rendered with rails, brazier and lamp;
  road door click opened the leaf and the player stepped into the doorway. Zero new console errors.
- Two engine fixes landed with this slice (see the goal document lessons): building pads are exempt from the
  Lastlight route gate in `src/game5_main.js`, and closed-door colliders no longer bake wall edges in
  `src/collision_grid.js`.

## Direct visual review

Comparison sheets: `Bible_References/Complete/_compare/holm_combat_hall_v1_exterior_compare.png` and
`holm_combat_hall_v1_hall_compare.png` (scores in PASS_LOG). **Functional graybox**, not release art, until the
owner's §2.1 gate.

## Open boundaries

- Practice enemies and the two kill trials wait on the owner's NPC authorization; the sockets are ready.
- Not yet a Studio building-bundle workspace (same as the other new buildings).
- The drill tower's 6-tile walls include the hall–tower partition, so a low west-facing camera hides the stair
  landing behind it after surfacing; drop the partition to hall height or extend the cutaway before the art gate.
- Observed once in a hidden browser pane: `clock.getDelta` threw at boot because rAF was frozen at the login screen;
  not reproduced in a fronted pane or under puppeteer (smoke and QA report zero errors).
- Remaining reservation pad: Mage Tower.
