# Mine Gatehouse v1 — functional building slice

Date: 2026-09-09
Status: live functional graybox; owner fully-designed art gate still open

## Delivered boundary

Quarry Rise's Mine Gatehouse reservation (pad `mine_gatehouse`, 10x8 at 127,119) is replaced by the fifth complete
Blender-built Tutor's Holm building, and it is the first one on the **required** route: the `descend_cavern` step now
happens inside a real building. The mine road (north along x=128, then east along z=120) enters the gate tower's
south gate and leaves by its east door, so the gatehouse is a true gate rather than a house beside the road. The
cavern shaft moved from the open road tile (128,124) into the winch house at (124.5,119.5), under a timber head-frame;
the cavern module still owns the shaft climb, so the descend gate fires from `Planes.climbTo` exactly as before.

## Composition

- **Plan:** square gate tower (5x8 passage, 5.0-tile walls) with a pyramidal hip roof, a gate lantern finial and a
  raised portcullis over the south gate; a lower gabled winch house (5x8, 3.8-tile walls) west of the passage
  through a wide arch, with a louvred dormer over the head-frame; a half-octagonal ore-chute bay on the winch house's
  west wall. One shared-endpoint perimeter; three roof heights.
- **Doors:** south mine gate (2 tiles wide, opening on tile centre 128.5,123) and east road door (opening on tile
  centre 132,120.5); both fitted full-frame leaves with over-door infill and stone steps.
- **Interior:** cobbled passage, plank winch-house floor with an open kerbed shaft so the cavern's own hole and
  ladder show through, flagstone bay floor, beams, four shuttered windows and slits with braces removed.
- **Hero and support objects:** head-frame with drum winch, wheels, hoist rope and hook, and a shaft lamp; chalk ore
  tally (copper, tin, bronze); the Wardens' gate stone; ore cart on iron wheels; tool rack; ore bin under a chute;
  brazier, road lamp, ore sacks, rope coil and water keg.

## Contract

- `src/holm_training_cavern.js` — `LAYOUT.gate` is now (124.5,119.5); entry/exit/targets unchanged.
- `src/holm_tutorial_flow_data.js` — `mine_gate` station entry/service (124.5,119.5), exit (133,120.5), building
  definition; `descend_cavern` target and text updated. 13/13 flow acceptance holds.
- `src/world_v2_building_data.js` — `holm_mine_gatehouse_v1` (revision 1): four rooms, two doors with gate-to-road
  flow, two services (winch frame primary, ore tally secondary), one clue (gate stone), three inspect-only support
  spaces, fifteen wall colliders and thirteen service/support colliders. Five acceptance locks; suite now 46 checks.
- `src/world_v2_buildings.js`, `src/world_v2_objects.js`, `src/world_v2_holm.js` — asset, template, authored object
  and eight compiled interaction rows (61 provider rows); pad retired; `completedPads` updated.
- `src/holm_mine_gatehouse_interactions.js` (new) — Study/Climb-down on the winch frame (Climb-down triggers the
  cavern's own shaft climb), Read on the tally and gate stone, all wrapped with `HolmStationReach.guard`.
- `tools/blender/build_holm_mine_gatehouse_v1.py`, `assets/manifests/holm_mine_gatehouse_v1.json`, source `.blend`,
  runtime GLB, `tools/qa_mine_gatehouse.js` (new).

## Lessons recorded

- Furniture colliders beside a doorway or arch must not fall within 0.6 tiles of a tile centre or they seal the
  passage; the head-frame legs now stand exactly on tile corners (1.5 tiles out on both axes) where every adjacent
  tile centre is 0.71 away. Recorded in `docs/rebuild/TUTORS_HOLM_COMPLETION_GOAL.md`.

## Verification

- Asset pipeline (`--no-build`): PASS, 7,754 triangles, 62 primitives, 25 materials, 592,256 bytes.
- `node tools/test_world_v2.js`: all locks pass (61 rows, 46 building checks, gatehouse lock over the shaft tile).
- `node tools/validate_content.js`: PASS.
- `node tools/run_smoke_headless.js`: PASS 104/104, 60 FPS, 21 ms worst frame, 165 draws, zero errors.
- `node tools/qa_mine_gatehouse.js`: PASS 12/12 — fresh login, road approach, pad retired with the shaft inside,
  closed-gate negative, gate and passage roof cutaway, arch to the shaft tile, road door east, reload persistence,
  re-entry from the road side, real descent to the cavern entry (286,354) on plane -1, no errors.
- Real-pointer pane check: see the PASS_LOG addendum of the same date.

## Direct visual review

Comparison sheet: `Bible_References/Complete/_compare/holm_mine_gatehouse_v1_exterior_compare.png` (8.5) and
`holm_mine_gatehouse_v1_passage_compare.png` (see PASS_LOG). The tallest roof on the island so far reads as a gate;
the road passing through twin doors under a portcullis is the reference-defining feature; the lower winch house and
bay keep a clear hierarchy; materials follow the family. Held under 9.0: pyramid courses are flat slabs, the gate
leaves lack studs, and the winch-house gable end wants a hoist beam and loading door. **Functional graybox**, not
release art, until the owner's §2.1 gate.

## Open boundaries

- The Combat Hall exit ladder still surfaces on the open Combat Hall pad at (172,124); that building is next.
- Not yet a Studio building-bundle workspace (same as the Kitchen and Lodge).
- Remaining reservation pads: Holm Bank, Combat Hall, Mage Tower.
