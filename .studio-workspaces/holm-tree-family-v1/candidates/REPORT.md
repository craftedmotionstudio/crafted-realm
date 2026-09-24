# Holm vegetation family candidate

Authored in Blender 4.5.10 LTS using `tools/blender/build_holm_tree_family.py`.
References directly inspected: `Bible_References/Landscape_Option.jpg` and `Bible_References/Town2.jpg`.
No image pixels or meshes extracted from the references. Nine original 64px painted-size textures are packed into the editable blend and embedded in the corresponding GLBs.

| Asset | Triangles | Meshes/materials | Habitat intention |
|---|---:|---:|---|
| oak | 912 | 2/2 | Broad, sheltered meadow tree; occasional uneven pair |
| birch | 588 | 2/2 | Slender pale trunks on creek terraces and woodland edges |
| coastal-pine | 736 | 2/2 | Sparse exposed headland, wind-shaped crown |
| meadow-tuft | 39 | 1/1 | Small grass islands with broad open ground between |
| creek-reeds | 207 | 2/2 | Sheltered wet banks, seedheads at varied heights |

All roots export at the origin with glTF Y up. Each contains a four-second `Breeze` clip, rigid mesh animation and no skinning. Exported sampler start/end values were read from GLB binary and asserted equal. Finite vertex positions were checked at rest and every third frame from 1 through 121; manifest bounds are measured in glTF coordinates and are sampled, not a mathematical envelope guarantee. Per-asset triangle and material budgets passed. The builder printed 5/5 structural asset checks and exited 0.

The saved blend retains all roots at their individual local origins. The family PNG uses temporary display offsets after saving/exporting. Neither those offsets nor habitat prose represent world placement data.

Direct render observation: species silhouettes differ clearly, branch forks remain visible, and texture colors stay muted olive, gray-green and warm brown. Birch has a narrow vertical hierarchy; pine has displaced low foliage shelves and a leaning trunk. Oak reads as a broad sheltering crown. Remaining art review should assess foliage edge angularity, canopy texture frequency and the pine's shelf silhouette in the main Studio and gameplay camera. No >=9 art acceptance or playable interaction claim is made. Collisions, gathering states, replacement scope, spatial distribution, in-game animation and player routes remain integration work.
