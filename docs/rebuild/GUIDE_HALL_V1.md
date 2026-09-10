# Guide Hall v6 - Hand-Authored Construction

Date: 2026-07-13  
Status: live in the game; complete-Hall owner review pending

## Direction

The owner rejected v5's flat, block-generated finish, then approved a smaller Blender art anchor that proved the
target construction language. v6 applies that anchor to the complete 26x24-tile functional Hall while preserving
the tested room, door, collision, roof-hide, and interaction contracts.

The live Hall now uses:

- one dominant connected central gable with two subordinate wing roofs;
- 656 orderly, staggered roof tiles with fascia and exposed timber support;
- real recessed door and window openings rather than surface-applied panels;
- irregular fieldstone courses, corner stones, timber posts, rails, and braces;
- fitted seven-plank full-frame doors with straps, rings, and semantic hinge pivots;
- recessed civic stained glass in a restrained blue/gold family;
- a detailed records cluster, chart desk, provision area, benches, teaching pieces, and compass floor mosaic;
- broader warm material variation that remains readable from the elevated OSRS-style camera.

## Production package

- Art-direction anchor: `tools/blender/build_guide_hall_art_anchor.py`.
- Full builder: `tools/blender/build_guide_hall_v6.py`.
- Editable source: `assets/blender/holm_guide_hall_v6.blend`.
- Runtime model: `assets/models/buildings/holm_guide_hall_v6.glb`.
- Manifest: `assets/manifests/holm_guide_hall_v6.json`.
- Generic runner: `tools/asset_pipeline.py`.
- Review renders and reports: `scratchpad/guide_hall_v6/`.
- Live screenshot: `scratchpad/guide_hall_v6/guide_hall_v6_in_game.png`.

The same deterministic low-poly component kit and manifest pipeline remain the governing workflow. Later
buildings may reuse construction components and palette rules, but never the whole Hall composition.

## Integration correction

The larger Hall exposed an old arrival seam: the former Holm safe spawn at 158,165 landed inside the expanded
east bay. The safe spawn now sits on the clear south arrival apron at 151,169, aligned with the front door and
the cardinal tutorial spine. Decorative supplies flank the apron rather than following the interior spawn.
The full-height arrival door opens in the live game, the player can path away, and the roof hides only after
entering the Hall footprint.

## Verification

- Asset pipeline: PASS at 35,314 triangles, 51 GLB primitives, 18 materials, and 2,623,512 bytes.
- Headless world-v2 contract: PASS, including the 228-tile cardinal spine, both door gaps, semantic nodes,
  resident-object ownership, and safe-spawn migration.
- Content integrity: PASS for 134 items, 30 NPCs, 10 shops, 10 quests, and 14 zones.
- Live interaction: exterior roof visible from the arrival apron; full-frame arrival door opens; roof-off
  interior exposes the orientation, records, teaching, and provision functions.
- Foreground smoke: PASS 75/75, 332 ms boot, real 1.848 s walk out-and-back, six streamed boundaries,
  exact save/progress restoration, 100 FPS, 11 ms worst frame, 84 draw calls, and zero errors.

## Direct Codex visual review

- **Silhouette/proportion:** the building finally reads as a large civic hall, not a small rectangular house.
- **Shape hierarchy:** the central gable leads; the lower wings support it without becoming random wall runs.
- **Color/material separation:** roof tile variation, pale plaster, dark timber, stone base, and stained glass
  separate cleanly at gameplay distance.
- **Reference-defining features:** deep openings, timber bracing, layered roofing, fitted door hardware, civic
  glass, and occupational clusters carry the approved anchor language into the full asset.
- **Gameplay-camera readability:** the front entrance, central roof, wing rhythm, stained glass, and player scale
  remain clear at the elevated browser camera.
- **Animation/interaction readability:** the door leaf fills its frame when closed and has an obvious swing when
  opened; exterior/interior roof switching is legible.
- **Family consistency:** the asset establishes a reusable warm, hand-built low-poly vocabulary without becoming
  a prefab template for every later structure.

The complete Hall is a review candidate, not yet owner-approved. The surrounding landscape still contains
temporary pads and sparse blockout dressing, so later Phase-2 environment work must frame this building with a
purposeful arrival court and route rather than treating the current shoreline as finished art.

## Next step

Collect owner feedback on the live v6 screenshot and in-game test. If accepted, lock the construction language,
then use the same pipeline to build the Survival Wood workyard as a distinct composition.
