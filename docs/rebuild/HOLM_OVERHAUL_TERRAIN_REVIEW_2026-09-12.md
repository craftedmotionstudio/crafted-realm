# Terrain draft 01 — direct in-app review

Status: **working terrain study; not visually accepted or published**. The owner's full overhaul remains the goal. This is an intermediate foundation, not an island completion claim.

## Implemented

`src/holm_overhaul_terrain.js` compiles explicit coast, shore shelf, hills, foundation pads and descending creek into a deterministic shared height lattice. `tools/build_holm_overhaul_terrain.js` derives the candidate source from the composition plan. The paired source/bundle are registered and staged in the isolated `holm-overhaul-terrain-v1` Studio workspace. Both live target files remain absent. No export/plan/apply or runtime provider migration occurred.

`tools/studio_holm_overhaul.html` renders the actual draft lattice through Three r160, with island/arrival/creek/ridge camera presets and optional plan overlays. Creek geometry shares bend vertices. Direct inspection exposed a repeated flat bank shelf; the compiler now uses two smooth bank transitions without that shelf. The submerged shoreline now grades into the sea instead of dropping immediately to -2.

Latest staged bundle SHA256: `6748110e2ad3561f7d32b8402fa323ddbc8f32e64a4a7740567303022148c7bb`. 18,705 vertices, 36,864 terrain triangles; height -2 to 14.07. Those are geometry statistics, not performance acceptance.

## Direct visual findings

In-app Studio inspected whole island, creek and arrival after refresh. Evidence: `holm-overhaul/evidence/terrain-overview-20260912.png` and `holm-overhaul/evidence/terrain-arrival-20260912.png`.

- Silhouette/proportion: the headland, lower shore and keep terrace are legible as different elevations. Lastlight still has a conspicuous platform-like shoulder, requiring geological shaping.
- Shape hierarchy: creek divides the settlement and the hills establish broad masses. Building outlines are reservations only; rectangular flattening and empty land still dominate.
- Color/material separation: warm grass, sand and teal water separate at distance. Rock is currently selected by height alone; final exposed rock must follow slope/geology. The shoreline remains too uniformly banded.
- Reference features: real relief and creek are present. Planted shore, inhabited stone guide house, village variety, castle, caves and useful upper floors are absent from this preview.
- Gameplay camera readability: arrival incline and guide-house reservation are readable, but foundation/shore interfaces and bridge approaches are unfinished. No route traversal was claimed from line overlays.
- Animation/interaction: orbit, camera presets and draft controls work. Water is static study geometry; final moving-water art and gameplay interactions are unfinished.
- Family consistency: only the terrain palette can currently be judged. No finished architectural/character/vegetation family exists in this draft.

Overall final-art readiness: **3/10, not accepted**. Better terrain structure is useful progress; it does not meet the owner's requested finished cozy world quality.

## Gates and actual failures

Terrain compiler tests: **9/9 pass**. Route-audit fixture: **5/5 pass**. The staged route audit finds **31 steep edges, 5 wet edges, 4 foundation-height conflicts**; see `HOLM_OVERHAUL_ROUTE_AUDIT_2026-09-12.md`. Bridge markers lack deck dimensions/elevations, so crossings remain unproven. Studio console error query returned none.

Foreground live-game smoke in the in-app browser, disposable existing profile `holm-iab-reset-20260912`, returned **FAIL**: structural104/105, failed assertion “Workyard U4 deck replaces pond collision with a continuous cardinal L route”; performance39FPS below45 budget, worst58ms,173drawcalls,54,394triangles. Boot2.197s, real out-and-back1.881s, six streaming boundaries/save-load exact, and console0errors passed. This draft is not loaded by the game; causation of the live failure is not established. Do not describe this run as green or conflate it with terrain acceptance.

## Next authored slice

Resolve arrival landing/shore support and guide-house floor/door approach first, then author the complete guide-house architecture in Blender/Studio with useful stairs and upper room. Resolve bakehouse/creek overlap, bridge deck contracts and route grades as part of terrain authoring; do not loosen movement constraints to hide them. Add planted shore and readable working details, then prove one actual playable arrival slice. Full island/buildings/characters/NPCs/items/lessons/underground/castle/ferry remain required. New schema needs source/bundle and cross-file validation before any all-green Safe Publish plan can authorize runtime integration.
