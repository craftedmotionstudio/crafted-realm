# Connected buildings and reference materials

Owner direction: all buildings need distinct architectural character, and the island must match the Bible references' environment and textures. Full island completion remains active. Concept02 is a design revision, not a completed island.

## References inspected directly

- Building_Exterior_Option1: tall polygonal central volume, open upper gallery, low side roofs, stone/timber/thatch, fenced planted slopes.
- Building_Exterior_Option2: connected tall house and lower perpendicular wing, recessed court, offset masonry chimney, directional golden thatch.
- Building_Exterior_Option3: chamfered end, hipped roofs and unequal wings; pale plaster with darker roof surface grain.
- Building_Exterior_Option4: linked volumes at several heights, projecting towers and covered approach; a skyline rather than one roof slab.
- Building Option69: a purposeful divided work/living interior with a small protruding service entrance; reference image is an interior view, not proof of exterior roof form.
- Town2: articulated connected timber/plaster rooms, window rhythm, floor textures and meaningful furnished spaces.
- Landscape_Option: sloped green terraces, exposed bank faces, quiet blue-grey water, mottled tree crowns, reeds and restrained flowers; no dominant grid or ocean-wide neon stripes.

## Applied design revision

Every one of the eleven map places now has authored volume polygons, roof type, height count, material family and purpose. Guide house gains unequal wings and study bay; bakehouse an L-shaped pantry court; quest lodge a tall cross-wing and reading bay; bank a clipped hall and clerk wing; mine a rock portal/hoist/lean-to; mage an octagonal tower and low workroom; Lastlight a keeper wing. Keep is an asymmetric connected courtyard castle with unequal projecting towers, a great hall, service range, gatehouse and wall walk. Landings render as piers with offset working/shelter areas. These drawings supersede the generic rectangle symbols, not the current tested runtime geometry.

## Material target

Use original authored low-resolution textures in the same visual language: mottled grey fieldstone with subdued mortar, directional ochre thatch, cream plaster, dark warm timber and olive tree foliage. Terrain needs broad irregular green/brown transitions and bank faces; water must stay muted. Existing bright foliage, regular stone trim, visible terrain grid and strong water stripes are still defects. Merely changing hex colors does not deliver this request. Do not extract proprietary texture bytes from screenshots.

## Production and remaining proof

A new Blender bakehouse candidate is being authored with connected rooms and unequal roof heights. Candidate meshes, textures and renders must be inspected in Studio, revised against the reference, integrated through Safe Publish, and driven with real input. Comparison scores, functioning stairs/doors and all original lessons are still required. The current arrival door-animation code remains a separate unfinished verification pass after interruption: closing motion was observed and headless tests passed, but the queued opening walk and fresh foreground smoke still need completion. No whole-building or whole-island acceptance is inferred from either pass.

## First connected bakehouse reviewed in the in-app Studio

2026-09-13: Blender candidate `.studio-workspaces/holm-kitchen-wings-v1/candidates/kitchen-wings.blend` and embedded-texture GLB loaded successfully in `tools/studio_holm_kitchen_wings.html`. Actual model: 2,922 triangles, 21 primitives, 10 materials, four embedded original128px textures. Exterior and roof-off controls verified with real pointer input; no browser console errors reported. Screenshot `scratchpad/holm_perf/kitchen-wings-studio-exterior.png` includes the model and source reference together.

Direct review, provisional7.8/10 (not accepted): the L-shaped footprint, recessed court, unequal connected hip roofs and offset hollow chimney make the building legible as a different family from the guide-house slab. Plaster, stone base, timber and thatch separate clearly and are more restrained than the arrival game's bright foliage/water. Surface texture is now present, but the thatch reads too uniform from this distance and plaster mottling is a little broad. Roof edges and join need more authored construction character. The roof-off view confirms connected rooms and pantry storage, but the front wall hides the preparation work area. Reference Option2 has stronger height hierarchy and a usable upper story; this candidate has no completed sleeping loft/stair. It is an initial architectural/material candidate, not a finished tutorial building. No world placement, live integration, navigation, services or animation acceptance is claimed.

Foreground ordinary-game regression after this revision: PASS105/105, real out/back3445ms, six streamed boundaries and exact lossless save/load,60FPS/worst35ms/124calls/34,268triangles/seven ticks/zero errors. This gate does not prove candidate building gameplay; candidate remains Studio-only. The earlier door opening-route pointer proof remains open even though the shared code passes this ordinary-provider gate.
