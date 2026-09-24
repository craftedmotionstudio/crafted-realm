# Arrival water integration requirements — 2026-09-12

Status: read-only source audit for the shared water renderer. No visual acceptance, placement approval, publication, or gameplay completion is claimed. Base guard passed: `tools/studio_holm_overhaul.js` contains joined creek cross-sections; `src/holm_arrival_qa.js` currently builds only a static ocean plane.

## Authoritative inputs and coordinates

- `src/holm_overhaul_terrain.js` compiles the terrain and copies `source.creek` into the bundle. Consume the verified arrival export's `loaded.documents.terrain.creek` in-game; do not fetch the loose Studio draft in the runtime adapter.
- Creek points are **[world X, world Z, water Y]**, unlike ordinary Three.js [X,Y,Z] vectors. Terrain is 144 × 128 tiles; one unit is one tile. Studio subtracts 72 from X and 64 from Z. Runtime uses the original world coordinates. Apply that translation exactly once, including animated highlights and any mask.
- The inspected terrain bundle has 14 creek points (13 sections), half-width 1.2, bank width 2.5 and depth 0.8. Points are `[72,30,5.2], [66,37,4.9], [70,44,4.5], [64,50,4.1], [62,58,3.7], [55,63,3.2], [57,71,2.8], [49,77,2.4], [48,86,2], [43,91,1.6], [45,99,1.2], [39,107,.8], [39,115,.35], [35,118,0]`.
- The terrain compiler rejects consecutive duplicate XZ points and increasing downstream water heights. It carves a bed at water Y minus depth and builds banks toward water Y + 0.3. `waterHeight()` samples nearest centerline segment within half-width; it is not a full rendered-mesh query.
- Existing Studio creek uses two shared edge vertices per point, averaged adjacent normals, and miter width `min(halfWidth / max(.25, dot(miter, nextNormal)), halfWidth * 1.6)`. Its Y is authored water Y + .025. Shared indices close the cracks of separately drawn segments. This is 28 vertices / 26 triangles before any highlights.
- Existing oceans differ: Studio 390 × 390 centered at Studio origin; arrival QA 200 × 180 centered at world (72,64). Both use Y = -.03. A shared renderer should declare its extent explicitly and preserve sufficient visible horizon coverage.

## Required behavior and ownership

1. Render the same continuous creek shape in r128 classic-script game and r160 module Studio, with translation supplied by the caller. Do not bake the Studio offset into shared world data.
2. Animate water visibly but gently, consistent with the warm low-poly direction and the north-star requirement that real-world moving things animate. Avoid per-frame topology allocations or large numbers of separate ripple objects. Keep highlight geometry within the water strip; do not introduce conspicuous raised water edges or swimming-looking land.
3. Preserve seam closure at bends, the downstream height profile, and the creek-to-ocean mouth. The .055 difference between mouth surface (.025) and ocean (-.03) needs direct camera review; numeric continuity of creek sections alone cannot prove a convincing confluence.
4. Own the water group, geometries, materials, and animation lifecycle explicitly. Dispose on provider teardown and Studio reload; stop updating disposed resources. Studio pause should freeze this animation with the rest of its preview and resume without a large time jump.
5. Do not register cosmetic water as an `arrivalSurface`, terrain ground, service, or clickable target. Do not alter terrain heights, `water` tile categories, navigation graphs, bridge/dock supports, checkpoints, doors, tutorial state, inventory, or save revisions merely to render water.
6. Preserve validated package provenance. Water derives from already verified terrain bytes; adding a skiff or new authored placement later requires the corresponding package/manifest/Safe Publish work. This renderer does not authorize copying candidates into live assets.

## Skiff boundary

`docs/rebuild/holm-overhaul/arrival-skiff.json` is explicitly a Studio draft with boarding, rower, and departure integration pending. It places the Blender skiff at world (58.65,-.03,126.2), rotation 0, requests `IdleBob`, and names approach node `dock:60,125`. The current arrival package includes guide house, dock and optional provisions; it does not include the skiff.

Studio's `makeSkiffWaterMask()` uses a waterline contour inset to 76% of the authored half-width stations. The mask is at ocean Y -.03, not parented to the bobbing skiff. It writes stencil 1 with color/depth writes disabled and render order -10. Existing Studio water tests `NotEqualStencilFunc` against 1; its renderer explicitly enables stencil. Preserve this masking behavior when replacing the Studio material, or the ocean will reappear inside the open hull. Check the whole bob cycle and oblique views: a static inset mask can expose water at the hull edge or cut an excessive hole if the animated geometry no longer matches it. Do not add an invisible skiff-shaped ocean hole in arrival QA while the skiff itself is absent.

## Meaningful verification

- Pure geometry: correct world-to-Studio translation; exact vertex/index counts for the current creek; finite vertices; shared section endpoints; nonzero-area triangles; bounded miters at sharp turns; controlled rejection of malformed, zero-length and reversal inputs if the shared API accepts untrusted geometry inputs.
- Animation: repeatable time sampling, finite bounded positions/material values, stable mesh/resource count over updates, visible change over time, and no landward highlight spill at bends/endpoints. Prove disposal releases every owned resource once.
- Navigation/save separation: compare the same arrival package graph and restored checkpoint before/after the cosmetic change. Retain a real-pointer landing → dock → house/rack walk and Continue reload. A creek rendered elsewhere does not prove the planned north bridge or survival route is traversable.
- In-app browser visual review: upstream bends, middle terraces, mouth, shoreline/dock and gameplay camera. Check cracks, z-fighting, opaque blue sheets over banks, depth/transparent sorting with terrain and player, water animation readability, and Studio skiff masking throughout bob motion.
- Run a foreground smoke with Studio explicitly paused, capture console errors and existing performance budgets, and compare draw/triangle counts and frame timings. A structural pass cannot establish animation quality or full-island completion.

Inspected source set: `tools/studio_holm_overhaul.js`, `tools/studio_holm_water_mask.js`, `src/holm_arrival_qa.js`, `src/holm_arrival_package.js`, `src/holm_overhaul_terrain.js`, `tools/build_holm_overhaul_terrain.js`, the terrain workspace bundle, and `docs/rebuild/holm-overhaul/arrival-skiff.json` / `plan.json`.
