# holm-props-v3 — doors and gates

Built by `tools/blender/build_holm_props_v3.py` (Blender 4.5 headless). Outputs `props.glb` (3 roots), `props.blend`,
`manifest.json` (v2 format + a `pivot` note per asset). Status: candidate; runtime check still to do.

## Conventions
- glTF Y-up, 1 unit = 1 tile. Colours authored sRGB, drawn as-is; the script checks every exported baseColorFactor.
- Timber and iron reuse the guide-house door leaf colours (oak .30/.20/.12, dark frame oak .22/.15/.09, iron .15/.16/.14).
- PIVOTS: `door-leaf` and `yard-gate` roots sit on the hinge line at floor level; the closed leaf runs along +X (0..1),
  thickness centred on z=0, front face (straps, palings, ring pull, latch bar) towards +Z. Rotating the root about +Y
  swings the far edge towards -Z (the back / ledge side), i.e. the leaf opens away from the viewer looking at the front.
  Hinge barrels are centred on the hinge line so they stay put as it turns. `gate-post` origin = ground centre.
- Runtime stretching: X is scaled per doorway (door 1.0-2.0, gate 1.0-4.0); proofs show door x2 and gate x4.
- Seeded; the build asserts identity root transforms, triangle counts in the GLB and the budget. sha256 17436105…4f5f32.

## Assets
| root | tris | min (x,y,z) | max (x,y,z) |
|---|---|---|---|
| door-leaf | 566 | -0.03, 0.01, -0.05 | 1.00, 2.30, 0.08 |
| yard-gate | 388 | -0.02, 0.06, -0.06 | 1.00, 1.28, 0.09 |
| gate-post | 78 | -0.11, -0.03, -0.11 | 0.11, 1.45, 0.11 |

Totals: 1,032 triangles (budget 1,500), 7 materials (budget 8): iron, iron-worn, oak, oak-dark, oak-end, oak-light, plank-gap.

- door-leaf: 5 front-chamfered oak planks (alternating two oaks, widths varied +-9%, ragged/sloped tops, 12 mm gaps with
  recessed dark fillers), 2 back ledges + a square-seated diagonal brace (hinge-bottom to latch-top), 2 spear-point
  strap hinges with nails and hinge barrels, faceted rose + drop ring pull (authored narrow so it stays near-round at x2),
  back thumb latch, clench-nail heads on the latch side. Thickness 0.09 (+ iron).
- yard-gate: hinge + head stiles (sloped weathering tops), top, middle and bottom rails, 3 pale palings with blunt points
  on the front, dark diagonal brace on the back, 2 wrap-around hinge bands with barrels, keeper + slide bar + drop handle.
- gate-post: 8-sided chamfered 0.2 post with alternating lit/dark faces, dark weathered foot, collar and 8-facet cap.

## Proof renders
EEVEE, Raw view transform (as the game): scratchpad/holm_props_v3/lineup.png, swing.png, stretched.png, back.png, sheet.png.

## Self-review
1. Reads well: ragged front-chamfered planks with dark gaps, spear-point strap hinges and drop ring read as a 2004-style
   oak door at x1 and x2; the gate's pointed palings, back brace and iron bands read as a gate, not a fence, at x1.
2. Weaker: at x4 the stiles/palings become 0.28-0.32 wide boards and nail heads stretch (inherent to X-scaling); plank
   colour alternation is subtle at distance.
3. Not yet checked in the runtime (hinge-side sign of the swing, per-doorway scaling, lighting).
