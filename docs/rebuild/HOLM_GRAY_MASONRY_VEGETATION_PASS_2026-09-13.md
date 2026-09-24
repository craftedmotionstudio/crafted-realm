# Gray masonry and vegetation family — 2026-09-13

Owner direction: emphasize gray masonry and old-school low-poly character; varied tree shapes and sparse, environment-specific vegetation guided by the Bible images. Persisted in GUIDING_LIGHT.md, overhaul goal and plan.json. Previous upper-room turn was progress; its authored model and browser evidence were retained.

## Authored results

Bakehouse v3: `tools/blender/build_holm_kitchen_character.py`, candidate `.studio-workspaces/holm-kitchen-wings-v3/candidates/`. Broad exterior gray masonry, original directional thatch, restrained roof irregularity and paired shutters. All 49 non-roof base meshes retain exactly their v2 vertices; no circulation geometry changes. 5,824 triangles, 12 materials, 56 primitives and four embedded original textures. Source, editable blend, GLB, numeric contract and render preserved. Studio now follows semantic ancestors when glTF splits a multi-material wall into child meshes, so ground/upper cutaways remain correct. Exterior and both floors verified through actual in-app controls.

Vegetation: new builders `tools/blender/build_holm_tree_family.py` and `build_holm_tree_family_v2.py`; v1 preserved, current candidate `.studio-workspaces/holm-tree-family-v2/candidates/`. Five separately exported assets: oak, birch, coastal pine, meadow tuft and creek reeds. Distinct trunks/canopies, original embedded bark/foliage textures and four-second Breeze clips. V2 uses more offset oak/birch clusters and pointed pine sprays after direct v1 review identified rock-like crowns and flat pine shelves. Current counts: oak 1,872; birch 1,356; pine 436; tuft 39; reeds 207 triangles. At most two materials each. Manifest records finite rest and sampled animation bounds; these are sampled, not continuous swept-volume proof. Independent main check verified export hashes, embedded image data and absence of skins.

`tools/studio_holm_vegetation.html` shows eight comparison instances (4,195 triangles), with family/species cameras and pause/resume controls. Initial camera orientation was corrected after real browser inspection. Error/warning logs empty. Comparison positions are not island placement. Habitat direction distinguishes village meadow, creek bank, exposed coast and woodland edge; sparse groups and clear interaction routes are required.

## Direct visual review — candidates below acceptance

Bakehouse provisional 8.3/10: L footprint, tall main block and low wing read clearly; gray masonry now carries the exterior and matches the owner's expressed preference. Thatch/wood provide warm separation. Courses and windows remain too uniform, roof needs stronger authored breakup, and the building lacks animation/runtime bindings. Both inspection floors are readable. Actual game-scale family placement and comparison acceptance are still missing.

Vegetation provisional 7.8/10: species silhouette separation is strong (broad oak, tall pale birch, leaning pine); muted foliage and bark fit the intended family. V2 crown boundaries improve on v1, but some oak/birch masses remain solid and pine sprays are too angular. Texture mottle is too broad at close view compared with reference foliage detail. Small tufts/reeds read as sparse plants; their environment placement remains unproven. Breeze clips load and play; more direct motion/readability evidence is required for final acceptance. Flat comparison ground is not final terrain.

Evidence: `scratchpad/holm_perf/kitchen-gray-masonry-v3.png`, `vegetation-v1-oak.png`, `vegetation-v2-oak.png`, `vegetation-v2-pine.png`, `vegetation-v2-family.png`. No asset is declared >=9 or installed. Remaining work includes foliage refinement, habitat placement on actual terrain, collision/route clearance, gathering interactions, building doors/fire/lessons and Safe Publish. Full-island goal remains active.

Foreground ordinary-game smoke PASS: 105/105, real out/back walk 3585ms, six streaming boundaries, exact/lossless save-load, 60FPS, worst frame23ms,122draws,34264triangles,6ticks and zero console errors. Total23541ms. This confirms regression health; it does not prove candidate world integration.
