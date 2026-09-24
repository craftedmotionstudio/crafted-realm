# Vegetation family v2 — bounded visual revision

Main Studio review of v1 found flattened solid oak lobes and pancake-like pine shelves; initial quality remained around 8, not accepted.

New standalone builder: `tools/blender/build_holm_tree_family_v2.py`. v1 source and exports are preserved. Blender 4.5.10 completed exports and family rendering with exit 0.

- Oak and birch replace each large crown mass with three overlapping, offset clusters at unequal heights and scales. Trunks and branches remain unchanged.
- Pine replaces broad circular slabs with three uneven pointed fans per branch group, rising toward their outer tips.
- Leaf textures use broader, lower-contrast interpolated mottling. An initial block-noise attempt looked checker-like in the rendered proof and was replaced before handoff.
- All five exact export filenames, rigid mesh structure, local origins and four-second Breeze clips remain compatible with the main Studio viewer.

Triangles: oak 1872, birch 1356, coastal pine 436, meadow tuft 39, creek reeds 207. Each uses at most two meshes and materials. Finite vertex coordinates, rest bounds, 41 sampled animation frames and binary exported animation endpoint equality pass. Manifest contains current hashes and measured glTF-space bounds. Sampled animation bounds are not claimed as analytically proven extrema.

The new family render was directly inspected: silhouettes remain distinct; canopy contour is more broken and pine tips replace rounded slabs. Foliage remains deliberately opaque and faceted, so Studio review must still determine whether its edge character and texture frequency satisfy the reference. No >=9 acceptance, gameplay placement or functional harvesting claim is made.
