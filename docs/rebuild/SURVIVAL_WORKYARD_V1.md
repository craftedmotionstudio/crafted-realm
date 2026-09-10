# Tutor's Holm Survival Workyard v1

Date: 2026-07-14  
Status: Live Phase-2 building; visual and runtime gates passed

## Purpose and route

The workyard replaces the old 8x7 Survival Shelter blockout with a complete 16x13 occupational building.
The player approaches through a full-height south trail door, enters the enclosed lodge, and exits east into
the covered yard and toward Survival Pond. The cardinal collision route is headlessly proven through both
openings.

Its four purposeful spaces are:

- Survival Lodge — enclosed primary room and through-route.
- Tool Bay — hatchet, whetstone, wedges, and pitch service.
- Teaching Hearth — Firemaking/Cooking instruction and flue.
- Covered Workyard — ordered logs, chopping block, fishing net, floats, rope, and oilskin.

The four static semantic interactions are the survival tool bench, firemaking board, storm tally beam, and
net rack. They keep the environment useful before modelled tutors are authorized. The workyard does not grant
items or bypass the tutorial; it explains why the lesson order and props exist.

## Asset workflow

- Deterministic authoring recipe: `tools/blender/build_survival_workyard_v1.py`
- Editable source: `assets/blender/holm_survival_workyard_v1.blend`
- Production model: `assets/models/buildings/holm_survival_workyard_v1.glb`
- Pipeline manifest: `assets/manifests/holm_survival_workyard_v1.json`
- Review renders: `scratchpad/survival_workyard_v1/`
- Banked comparison: `Bible_References/Complete/_compare/survival_workyard_v1_compare.png`

The model uses the approved Guide Hall construction language—irregular fieldstone, warm plaster, structural
timber bays, fitted plank doors, and layered roof courses—without copying the Guide Hall composition. Its
asymmetric lodge and lower open lean-to give it a distinct silhouette and a clear gathering occupation.

Pipeline result: 17,640 triangles, 39 GLB primitives, 16 materials, 1,312,924 bytes. The live Studio view is
18,152 displayed triangles / 66 draws roof-on with inspection helpers, below the 24,000 / 90 budget.

## Direct Codex visual review — 9.1 / 10

- Silhouette and proportion: 9.2 — the enclosed lodge, lower lean-to, chimney, and work posts read as one
  connected but asymmetric service building; player scale is generous rather than hut-sized.
- Shape hierarchy: 9.1 — main gable first, occupational lean-to second, hearth flue and crest third.
- Color/material separation: 9.0 — plaster, oak framing, fieldstone, iron, roof umber, moss accents, logs,
  and rope remain distinct at the elevated camera.
- Reference-defining features: 9.0 — the pond-side teaching function, woods craft, fencing language, path
  connection, and open work area translate the tutorial references into original Crafted Realm IP.
- Gameplay-camera readability: 9.2 — the exterior mass reads while approaching; the entire roof hierarchy
  hides on entry, exposing the tool bench, hearth, lesson board, doors, and yard.
- Animation/interaction readability: 9.0 — both fitted doors animate and own collision; the tool bench was
  reached and used through the real click-to-walk flow; roof cutaway follows the player.
- Family consistency: 9.2 — it belongs beside Guide Hall through construction detail and palette without
  becoming a smaller copy of the civic building.

## Verification

The headless WorldV2 suite passes the building schema, semantic GLB nodes, manifest budgets, replacement of the
planning pad, 17 separate interaction rows, and a cardinal trail-door-to-pond-door route. Content integrity and
JavaScript syntax gates pass.

The first live review found an inherited blockout tree visually intersecting the lodge. The surrounding tree
placements were cleared from the 16x13 envelope and the real flow was repeated. Final foreground smoke passes
75/75: 307 ms boot, real 1.867 s out-and-back walk, ten streamed boundary crossings, exact save/progress
restoration, 100 FPS, 11 ms worst frame, 140 draw calls, 18,038 triangles, and zero console errors.
