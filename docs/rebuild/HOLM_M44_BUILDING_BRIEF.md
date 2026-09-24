# M4.4 building brief (shared by every building agent) — 2026-09-24

Owner-approved look (M3R, commit 1f0ccd4): the Sept 13 Blender overhaul is the base. Buildings are hand-designed
low-poly Blender assets in the 2004 old-school RuneScape spirit, never primitive assemblies: connected unequal
wings, jetties/projections where they fit, many-angled roofs (hips, half-hips, cross gables, dormers, lean-tos),
substantial gray fieldstone wall fields with readable courses (relief stones, as `stone_facing` in
`tools/blender/build_holm_guide_house_overhaul_v2.py`), smaller cream plaster panels in orderly dark-oak timber
framing (studs on a ~1 m rhythm, sill/head rails, no random beams), ochre thatch or clay tiles laid in courses,
chimneys, shutters, sills, lintels. Owner quotes: "designed with a purpose and there's detail in every corner",
"not just two squares put together", "everything designed in Blender". Materials direction:
`docs/rebuild/holm-overhaul/plan.json` -> materialDirection. Reference images are named per building in plan.json.

## BASE CHECK (first; stop and report if missing)
- `tools/blender/build_holm_guide_house_overhaul_v2.py` (style + helper patterns to copy: mesh/prism/beam/wall with
  real voids/stone_facing/tile laying).
- `tools/blender/extract_holm_building_navigation.py` (general stance-graph extractor you must run).
- `.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json`.

## Coordinates and scale
- 1 unit = 1 tile. Game (x, y-up, z) maps to Blender (x, -z, y), as in the house v2 script. North is -z.
- Author in LOCAL space: origin = the footprint centre from plan.json (place x,z), y = 0 at the building's main
  ground-floor level. Record the world placement you intend (x,z integers = plan x,z; y = measured pad height) in
  your report; the main session places it with eyes on. Do not edit any runtime file.
- Human scale (the player is a 1.9 tall capsule, radius 0.24): doors >= 1.6 wide (main 2.0) x 2.3 tall; ceiling
  >= 2.6 above a walked floor; storey height 2.8-3.0; stairs <= 0.24 rise per tread, >= 0.35 run, >= 1.2 clear
  width; walk surfaces flat or <= 0.24 steps. Keep every service stance on a tile centre with 1-tile clearance.
- The site: sample the terrain bundle (heights are a (width+1)x(depth+1) lattice, water a width x depth mask) over
  your footprint. Sit the ground floor on a foundation/plinth that meets the lowest terrain (down to it), with steps
  named `<Prefix>_Step...` where a threshold is more than 0.24 above the ground outside. Do not build over water
  except a pier/deck (named `<Prefix>_Deck...`).

## Naming contract (the runtime depends on it)
- Every object starts with the building prefix you are given (e.g. `Bank_`).
- Walkable: floors `<Prefix>_Floor...` / `<Prefix>_UpperFloor...`, stair treads `<Prefix>_Stair...`, steps
  `<Prefix>_Step...`, decks `<Prefix>_Deck...` (the extractor supports only names containing Floor/Stair/Step/Deck).
- Cutaway: roofs `<Prefix>_Roof...` (hidden when inside), anything above the ground floor `<Prefix>_Upper...`, walls
  `<Prefix>_Shell...` / `<Prefix>_UpperShell...` (clipped when inside), glazing `<Prefix>_Glazing...`.
- Services: `<Prefix>_Service<Name>_...` for every mesh a player clicks for a lesson (listed per building).
- Batch by those prefixes (join meshes of one kind) so a building is tens of meshes, not hundreds.

## Deliverables (all NEW files; change nothing else)
1. `tools/blender/build_holm_<id>_v1.py` -> `.studio-workspaces/holm-<id>-v1/candidates/<id>.glb` and `<id>.blend`.
2. Five proof renders (workbench, studio light, material colours) into `scratchpad/holm_<id>_v1/`: front 3/4,
   back 3/4, side, top, and one cutaway (roofs/upper hidden) showing the rooms and services; plus `sheet.png`.
3. `docs/rebuild/holm-overhaul/buildings/<id>.nav.json` in the extractor's spec format (see the docstring of
   `extract_holm_building_navigation.py`; fields id, prefix, model, out, placement, local, start, targets) with
   `out` = `.studio-workspaces/holm-<id>-navigation-v1/candidates`; run
   `"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b --python tools/blender/extract_holm_building_navigation.py -- docs/rebuild/holm-overhaul/buildings/<id>.nav.json`
   and iterate on the MODEL until report.complete is true (every target reachable from start, start outside the
   entrance). Never loosen the extractor.
4. `.studio-workspaces/holm-<id>-v1/candidates/REPORT.md`: triangles, materials, dimensions, intended world
   placement, list of services (mesh prefix -> target id), extractor report line, and an honest self-review against
   the reference image (what reads well, what is still weak).

## Budgets and rules
- <= 25,000 triangles, <= 20 materials, material colours via `diffuse_color` (no image textures needed); if you use
  emission keep strength 1.0 (the runtime refuses the glTF emissive-strength extension).
- Blender 4.5 headless: `"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b --python <script>`.
- Deterministic (seeded random only). Original design; never copy Jagex models, maps or textures.

## Anti-goals
- Do not edit src/, index.html, plan.json, other workspaces, tests or the extractor.
- Do not place anything in the world or change terrain.
- No blobs, no untextured single-box walls, no random beams, no single plain gable on a box.
