# Teaching Kitchen v2 and Quest Lodge v2 — P2-D art pass (2026-09-10)

Status: both live (`holm_teaching_kitchen_v2.glb`, `holm_quest_lodge_v2.glb`), owner fully-designed gate still
open. Brief: `docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md`. Both builders wrap their v1 builder whole
and add only what the v1 reviews held the sheets for; runtime contracts, station empties and every v1 authoring
check are preserved; no new materials.

## Teaching Kitchen v2 (`tools/blender/build_holm_teaching_kitchen_v2.py`)

- Louvred shutters (four tilted slats) with brass hinge pins on every window; bargeboards and iron finials on
  both bakehouse gables; a clay pot with lip on the range flue.
- Second interior cluster: four herb/onion strings from the bakehouse beams, six loaves on the bread rack, flour
  dust on the kneading table, a bread peel leaning on the range.
- Pipeline PASS: 12,286 triangles (v1 10,794), 78 primitives (budget 90), 30 materials (budget 30), 0.92 MB.
- Sheets (in-game): exterior **8.9** (held: apse courses still slabs, pot barely reads, gable wants a datestone),
  interior **9.0** (held: bare pantry wall, strings small at the elevated camera).

## Quest Lodge v2 (`tools/blender/build_holm_quest_lodge_v2.py`)

- Turned porch balusters with knobs under top rails and newel posts along the porch edge (step left open);
  laid ridge caps in light stone and iron finials on the hall ridge.
- Reading corner: bordered rug under the bench, candle stand with a lit candle, open pages and ribbon on the
  bench book; the turret chart gains a title strip and contour lines.
- Pipeline PASS: 8,738 triangles (v1 7,842), 74 primitives (budget 90), 29 materials (budget 40), 0.67 MB.
- Sheets (in-game): exterior **8.8** (held: gable tile field still reads flat-diagonal, turret courses slab-like,
  porch roof one plane), interior **8.8** (held: open hall floor, small corner objects, bare west wall).

## Contract

`src/world_v2_buildings.js` -> v2 GLBs, `src/world_v2_building_data.js` revision 2 for both; manifests
`holm_teaching_kitchen_v2.json` / `holm_quest_lodge_v2.json` (v1 budgets unchanged). Lock suite green.

## Gates

smoke PASS both phases 105/105 (boot 3063 ms foreground / 2599 ms hidden), full route PASS 20/20 in 479 s, kitchen QA PASS 11/11, lodge QA PASS 14/14 after its closed-wall check was rewritten to the door-auto-open rule.

## Honest reading

Neither building reached 9.0 on both sheets. The passes fixed what the reviewer named (shutters, bargeboards,
pot, clusters; balusters, ridge, reading corner) but the remaining gaps are field-level: roof tile fields and
apse/turret courses need per-course geometry rather than furniture. That is builder work on the v1 roof functions
and is logged as the next-pass target for this pair rather than rounded up.
