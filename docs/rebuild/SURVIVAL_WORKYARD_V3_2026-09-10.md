# Survival Workyard v3 — P2-D art pass (2026-09-10)

Status: live (`holm_survival_workyard_v3.glb`), owner fully-designed gate still open. Brief:
`docs/rebuild/TUTORS_HOLM_REDESIGN_BRIEFS_2026-09-10.md` (Survival Workyard).

## What changed

- GLB (`tools/blender/build_survival_workyard_v3.py`, the v2 builder reused whole): laid ridge caps on the lodge
  and passage ridges in a lighter stone, iron gable finials at both lodge ridge ends, a clay pot with lip on the
  hearth flue, soffit boards under the lodge and passage fascias. Root renamed `holm_survival_workyard_v3`,
  revision 15; every v2 authoring check still runs plus four roof-furniture checks.
- Runtime props from the brief and the play review:
  - `src/holm_survival_trees.js`: each marked lesson tree carries a limewash band and a red chalk cross on the
    trunk (F-12: the lesson trees no longer look like the scenery oaks); snapshot reports `marked`.
  - `src/world_v2_objects.js` + `src/holm_landscape_data.js`: a stone fire ring with ash bed and charred logs
    (`holm_fire_ring`) at the firemaking lesson tile (128,155), no collider, so the lesson fire is lit inside the
    ring in open ground and is visible from the default camera (F-13/F-14).
- Contract: building data revision 19 (v3 resources), Studio placement `definitionRevision` 19, both Studio
  bundles recompiled (compile-pair lock), `world_v2_buildings.js` -> v3 GLB.

## Numbers

Pipeline PASS: 21,094 triangles (v2 20,734), 110 primitives (budget 110), 37 materials (budget 40), 1.56 MB.

## Comparison sheets (in-game captures)

- `Bible_References/Complete/_compare/holm_survival_workyard_v3_exterior_compare.png` — **9.0**. The compound
  silhouette is memorable from the trail; ridge caps, finials and the pot read at gameplay distance; the fire
  ring and banded trees give the yard its lesson landmarks. Gap: the lean-to roof is one plain plane; the dock and
  pulley families keep per-part meshes; no dormer on the octagon.
- `Bible_References/Complete/_compare/holm_survival_workyard_v3_interior_compare.png` — **9.1**. Lodge, hearth
  room and open court read as one working compound with the roof off; pond-door beacon and fire ring share the
  sightline. Gap: open lodge floor centre, the cellar hatch reads as a plate, uniform court paving.

Both sheets meet the 9.0 gate on the direct review; the owner's eyes-on review remains the final call
(`ART_PRODUCTION_PIPELINE.md` §2.1).

## Gates

smoke PASS both phases 105/105 after moving the smoke's workyard revision pin from 18 to 19 (boot 2401 ms foreground / 2052 ms hidden), full route PASS 20/20 in 428 s. Locks green after the bundle recompile; pane verification (fire ring at 128,155 on a walkable tile, three
marked trees banded, zero errors).
