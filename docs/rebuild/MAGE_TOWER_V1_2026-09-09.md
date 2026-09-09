# Mage Tower v1 — functional building slice

Date: 2026-09-09
Status: live functional graybox; owner fully-designed art gate still open; the magic trial remains NPC-deferred

## Delivered boundary

The Mage Headland's Mage Tower reservation (pad `mage_tower`, 11x11 at 193,136) is replaced by the eighth and last
complete Blender-built Tutor's Holm building. Every reservation pad on the island is now a building. The tower teaches
what can be taught NPC-free: which runes a wind spell burns (rune table, opening the spellbook tab), how the spellbook
lists a spell (lectern), and the tower's story (register). The `magic_trial` lesson stays deferred by the owner's NPC
decision; its standing place is the `casting_socket` inside the casting circle, authored in the GLB and the definition
without geometry or interactions.

## Composition

- **Plan:** square two-storey ashlar tower (6x6, 7.6-tile walls, corner quoins, string course) under a steep pyramid
  spire with a crescent-and-star finial; a lean-to timber scriptorium wing (4x5, 4.2-tile walls) on the east side
  reached through a two-tile arch. Two roof masses. The whole upper storey — stone walls above the string course,
  quoins, upper windows, the study floor with its desk, star chart and chests — lives in the `roof` semantic part so
  it cuts away with the spire when the player is inside; only the 4-tile ground storey stays, like every other hall.
- **Doors:** west tower door (opening on tile centre 188,135.5, facing the ridge road) and south dock door (opening on
  tile centre 191.5,139); both fitted full-frame leaves under stone arches.
- **Hero and support objects:** rune table (velvet cloth, air and mind runes, primer, candle, glowing orb) over a
  casting circle of eight rune stones; spell lectern with an open primer; tower register under a blue seal; bookshelf
  of primers; brass orrery; spiral stair to the shuttered study hatch; sconces, banner, scrolls, wall map.

## Contract

- `src/holm_tutorial_flow_data.js` — mage_tower station entry (186.8,135.5), service (191.5,134.5), exit
  (191.5,140.2), building definition; `magic_trial` carries `npcSocket:'casting_socket'` while staying optional and
  NPC-phase. 13/13 flow acceptance holds.
- `src/holm_landscape_data.js` — `mage_tower` joins the completed pads (level 1.62 unchanged; the pad is flat and the
  road arrives level from the west).
- `src/world_v2_building_data.js` — `holm_mage_tower_v1` (revision 1): three rooms, two doors, two services (rune table
  primary, lectern secondary), one clue, three inspect-only support spaces plus one silent socket, ten wall colliders
  and five furniture colliders. Five acceptance locks; suite now 61.
- `src/world_v2_buildings.js`, `src/world_v2_objects.js`, `src/world_v2_holm.js` — asset, template, authored object
  and eight compiled interaction rows (85 provider rows); pad retired.
- `src/holm_mage_tower_interactions.js` (new) — Study on the rune table (counts the player's air and mind runes,
  explains Wind Strike's cost and opens the 🪄 spellbook tab), Study on the lectern (how the spellbook lists level,
  runes and effect; staves providing runes), Read on the register; all wrapped with `HolmStationReach.guard`.
- `tools/blender/build_holm_mage_tower_v1.py`, `assets/manifests/holm_mage_tower_v1.json`, source `.blend`, runtime
  GLB, `tools/qa_mage_tower.js` (new).

## Verification

- Asset pipeline (`--no-build`): PASS — 11,544 tris, 75 prims, 28 materials, 866,460 B (GLB `?v=2` after the
  upper-storey split).
- `node tools/test_world_v2.js`: all locks pass (85 rows, 61 building checks).
- `node tools/validate_content.js`: PASS.
- `node tools/run_smoke_headless.js`: PASS 104/104, 60 FPS, 22 ms worst frame, 165 draws, zero errors.
- `node tools/qa_mage_tower.js`: PASS 14/14 — fresh login, staged real pathing along the spine to the tower door step,
  pad retired with a silent socket, long-route negative from the dock road (plan 12), west door and hall entry to the
  rune table tile, roof and upper study cutaway, rune table study opening the spellbook tab with the required route
  untouched, casting circle tile, arch to the lectern tile, register tile, south door exit, dock road continuation,
  reload persistence, no errors. (One run that overlapped a concurrent capture session timed out on a 60 s wait; the
  standalone rerun passed 14/14.)
- Real-pointer pane: west door opened through the engine's own door click path (scripted); a real rune table click walked the player to its tile and opened
  "The rune table" with the 🪄 spellbook tab active; a south door click opened the leaf and the player stepped
  toward it. With the player inside, every mesh above the string course is hidden and the interior reads through the
  open door. Zero console errors.

## Direct visual review

Comparison sheets: `Bible_References/Complete/_compare/holm_mage_tower_v1_exterior_compare.png` and
`holm_mage_tower_v1_hall_compare.png` (scores in PASS_LOG). **Functional graybox**, not release art, until the
owner's §2.1 gate.

## Open boundaries

- The practice target and the magic trial wait on the owner's NPC authorization; the casting socket is ready.
- The upper study is visual only (cut away with the roof); a walkable second floor would need the plane system used
  by Lastlight and is not part of this slice.
- Not yet a Studio building-bundle workspace (same as the other new buildings).
- No reservation pads remain on Tutor's Holm.
