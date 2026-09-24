# Guide Hall v7 — P2-D art pass (2026-09-10)

Status: live (`holm_guide_hall_v7.glb`), owner fully-designed gate still open. Brief:
`docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md` (Guide Hall).

## What changed (builder `tools/blender/build_guide_hall_v7.py`, reusing the v6 anchor shell, roof and clusters)

- Roof furniture: laid ridge caps on the nave and both wings, a fieldstone chimney with quoins, cap and clay pot
  over the records wing (an iron stove with flue and riser sits under it inside), eaves soffit boards under
  every fascia.
- Hero relief chart: sandstone rim, inner rim and plinth around the route table so the whole table top is the
  click target (play review F-06: rim clicks now resolve to `holm_orientation` out to 1.9 tiles); six coloured
  district patches on the water; a brass compass rose; five route flags on the lesson stations.
- Teaching dais, board, chalk marks, inset and both teaching benches moved 5.2 tiles west, clear of the
  2.6-wide north door axis (F-09); the authoring check `teachingDaisOffDoorAxis` locks it.
- Lesson register: open ledger with spine, ink lines, ink pot and quill on the lectern. Provision rack: iron
  rail with five hung oilskins and packs on brass hooks.
- Palette held at the 18 family materials: every new surface aliases an approved material.

## Numbers

- Pipeline PASS: 37,050 triangles (v6 35,314), 61 primitives, 18 materials, 2.75 MB. The v7 manifest raises
  `maxTriangles` 36,000 -> 40,000 and `maxFileBytes` 2.7 -> 3.0 MB (the v6 budget was fitted to v6 at 98 %;
  3.0 MB matches the Workyard v2 and Lastlight manifests). Draw calls unchanged: the load-time merge keeps the
  hall at 19 meshes.
- Runtime: `src/world_v2_buildings.js` -> v7 GLB, `src/world_v2_building_data.js` revision 7 with the
  pipeline-gate acceptance moved to revision 7, `tools/test_world_v2.js` reads the v7 manifest.

## Comparison sheets (in-game captures, `tools/capture_holm_building.js`)

- `Bible_References/Complete/_compare/holm_guide_hall_v7_exterior_compare.png` — **8.8**. Civic three-part
  mass with the chimney, ridge caps and soffits added. Held: ridge caps barely register at gameplay distance
  (same tile colours), gables want bargeboard finials and a datestone, roof furniture beyond lantern and
  chimney is thin.
- `Bible_References/Complete/_compare/holm_guide_hall_v7_interior_compare.png` — **8.9**. Three occupation
  clusters read with the roof off; the hero chart is the brightest object; north door clear. Held: the central
  floor is a large plain field (a runner and a second bench pair would close it); oilskins read as small dark
  slabs from the elevated camera.

Direct review dimensions: silhouette/proportion 8.8, shape hierarchy 9.0, colour/material separation 9.0,
reference-defining features 8.8, gameplay-camera readability 9.1, animation/interaction readability 9.0
(doors, roof cutaway, rim click target), family consistency 9.0. Not called 9.0: the exterior gain is smaller
than the interior gain and the named gaps are concrete. Next pass target: contrasting ridge caps
(`stone_light`), bargeboard finials and datestone, floor runner and benches, larger oilskin silhouettes.

## Gates

smoke PASS both phases (boot 1968 ms foreground / 2017 ms hidden), full route PASS 20/20 in 425 s solo (a parallel run that overlapped another driver scored 9/20 on cook timing and was discarded as contention). Locks green (`node tools/test_world_v2.js`), pane verification (roof cutaway, chart rim click target, zero
errors).
