# Holm prop pack v1 — candidate report

Built by `tools/blender/build_holm_props_v1.py` (Blender 4.5, headless). Outputs: `props.glb` (all 9 roots in one file),
`props.blend`, `manifest.json` (tree-family v3 format + `root`, `materialNames`, `groundMinY`, `totals`).
Status: candidate, not visually or runtime accepted.

- Axes: glTF Y-up, 1 unit = 1 tile, player = 1.9. Every root sits at the origin in the GLB.
- Materials: 12 flat colours (material `diffuse_color` + Principled base colour, roughness 0.95, no image textures).
  The greens and bark reuse the tree-family v3 sRGB base colours (olive-leaves, birch-leaves, oak-bark), so the props sit with the trees.
- Deterministic: seeded `random.Random` only. Two runs gave the same GLB sha256 (`35192f01…b235cc`).
- The script checks the exported GLB itself: every root name is present as a top-level node, per-root triangle
  counts match Blender, there are 12 materials or fewer, there are no images or textures, and the pack is under 6,000 triangles.

## Assets (bounds in glTF coordinates: x, y-up, z)

| root | tris | mats | min | max | notes |
|---|---|---|---|---|---|
| `shrub-a` | 340 | 3 | -0.54, -0.055, -0.44 | 0.54, 0.90, 0.44 | wide knee-high mound: 6 faceted leaf lumps, 3 stems + root flare, 3 bare twigs |
| `shrub-b` | 340 | 3 | -0.46, -0.042, -0.32 | 0.46, 1.06, 0.32 | upright waist-high vase shape |
| `flower-patch` | 367 | 5 | -0.38, -0.01, -0.34 | 0.38, 0.27, 0.34 | 4 low leaf mats + 11 rosette blades; 13 five-petal heads (10 white, 3 pale yellow) on stems |
| `stones-small` | 90 | 2 | -0.35, -0.02, -0.29 | 0.35, 0.16, 0.29 | 5 flat-topped fieldstones in two grays |
| `rock-group` | 98 | 3 | -0.72, -0.06, -0.56 | 0.72, 0.86, 0.56 | 3 boulders with planar cuts + 2 pebbles; moss plane on the big boulder's top |
| `fallen-log` | 165 | 2 | -1.04, -0.037, -0.33 | 1.04, 0.59, 0.33 | 8-sided bark trunk 1.8 long; sawn end with bark rim; jagged broken end with 3 splinters (+0.28); snapped stub branch; knot |
| `signpost` | 116 | 4 | -0.21, -0.06, -0.19 | 0.20, 2.10, 0.21 | hewn post (square with chamfered corners), carved pyramid top, 4 packing stones |
| `signpost-arm` | 88 | 4 | 0.00, -0.12, -0.045 | 0.93, 0.12, 0.045 | two stacked planks form a barbed arrow toward +X; weathered faces, timber edges, cleats both sides, 8 iron nails |
| `fence-rail` | 208 | 3 | -0.07, -0.04, -0.11 | 2.08, 1.12, 0.11 | 2 split bark posts with slanted cut tops (x=0 and x=2.0), 2 sagging wedge-split rails (bark crown + pale split faces), 4 pegs |

**Totals: 1,812 triangles (limit 6,000), 12 materials (limit 12), 9 roots.**
Materials: leaf, leaf-light, bark, wood-cut, timber, board-weathered, stone, stone-dark, flower-white, flower-yellow, flower-eye, iron.

## Runtime notes
- Buried contact (min y below 0): shrubs down to -0.055 (root flare), rock-group -0.06, stones -0.02, log -0.037, signpost -0.06 (post foot), fence -0.04.
- `signpost-arm`: the origin is at the post end (x=0). The board is **centred** on y=0 (spans -0.12..0.12), so mounting at y 1.55/1.3/1.05 centres each board on that height with about 0.01 clearance between arms.
  The inner 0.085 of the board sits inside the post (post half-width 0.085), and the cleat starts at x=0.12, just outside the post face. Rotate about the post's Y axis.
- `fence-rail`: posts at x=0 and x=2.0. Chaining sections every 2.0 puts two identical posts in the same place (the rails end inside the post, so they don't clash).
  The runtime can skip the start post of each follow-on section, or accept the coincident duplicate.
- `rock-group` came out 1.44 across, not the ~1.6 in the brief. Scale it 1.1x at placement, or widen it in v2.

## Proof renders (scratchpad `holm_props_v1/`)
`lineup.png` shows every asset in two rows with a 1.9 capsule per row (the arm is shown raised to 0.75). `signpost_close.png` is a 3/4 view with two arms mounted at 1.55 and 1.30.
`props_close.png` is a 3/4 group view. `sheet.png` combines the three.

## Honest self-review
- Reads well: the signpost and arm (the plank seam, barbed tip, lighter weathered face and nails read clearly at close range), the log's splintered break and stub, the split rails with pale split faces, and the rock group's planar cuts with the moss plane.
- Weaker: the shrub lumps read as separate faceted balls rather than one merged canopy. They are clearly designed rather than primitive, but a v2 could overlap the lumps more and add a few leaf-card tips. The flower heads are small at gameplay camera distance and may need scaling up by about 1.3x in-game.
- Iterations made after looking at the renders: fixed the broken-end cap of the log (a bug put it on the sawn end, so the break didn't show), made the boulders more angular (they were geodesic blobs), shortened the shrub twigs, and fixed the render framing and labels.
  Not yet checked in the game runtime or under the game's own lighting.
