# holm-props-v2 — lesson props (M5.1)

Built by `tools/blender/build_holm_props_v2.py` (Blender 4.5 headless). Outputs `props.glb` (6 roots), `props.blend`,
`manifest.json` (v1 format). Status: candidate; runtime check in the island draft follows (M5.1).

## Conventions
- glTF Y-up, 1 unit = 1 tile, each root's origin at its ground-contact centre.
- Colours are authored sRGB and drawn as-is by the game (unlike v1, which stored linear factors); the build script checks
  every baseColorFactor/emissiveFactor in the exported GLB against the authored values.
- Flame emission strength 1.0 (base colour 0.3x the emissive colour); no KHR_materials_emissive_strength.
- Flat matte colours (roughness 0.95), no textures. Seeded; sha256 identical across runs (5df16bc8…e10441).

## Assets
| root | tris | min (x,y,z) | max (x,y,z) |
|---|---|---|---|
| tree-stump | 211 | -0.40, -0.04, -0.38 | 0.40, 0.53, 0.38 |
| ore-rock-copper | 382 | -0.55, -0.03, -0.48 | 0.55, 0.87, 0.48 |
| ore-rock-tin | 382 | -0.55, -0.03, -0.49 | 0.55, 0.87, 0.49 |
| ore-rock-depleted | 244 | -0.60, -0.03, -0.60 | 0.60, 0.73, 0.60 |
| fishing-ripple | 556 | -0.50, 0.00, -0.50 | 0.50, 0.07, 0.50 |
| campfire | 701 | -0.46, -0.03, -0.42 | 0.46, 0.88, 0.42 |

Totals: 2,476 triangles (budget 3,500), 12 materials (bark = tree-family v3 oak bark, wood-cut, wood-ring, char, rock,
rock-dark, rock-spent, ore-copper, ore-tin, ripple, flame-orange, flame-yellow).

- tree-stump: 9-sided oak stump with a slanted axe cut, bark rim, pale cut face with a darker ring band, 3 splinters, 4 root flares.
- ore-rock-copper / ore-rock-tin: faceted gray-brown main mass plus 2 low shoulder stones; 24 separate faceted ore chips
  raycast onto the surface (6 veins + 4 singles).
- ore-rock-depleted: the same points with the top broken down by 4 tilted cuts to 0.73; dark top, 9 rubble chips, 4 loose
  chunks at the foot (the rock itself stays ~1.1 wide, so it swaps in at the same transform).
- fishing-ripple: 3 rings (r 0.15/0.31/0.46) broken into tapered ridged arcs, 5 bubble lumps, y 0..0.074; no baked animation.
- campfire: 7 soot-sided stones, ash bed, 2 crossed + 4 leaning logs, 6 orange + 3 yellow flame tongues (own mesh
  `campfire_Flames`), 9 embers, 2 sparks.

## Proof renders
EEVEE with the Raw view transform (to match the game): scratchpad/holm_props_v2/lineup.png, campfire_close.png,
ore_close.png, sheet.png.

## Self-review
1. Reads well: the campfire, the clearly separate copper vs tin chips, the depleted rock's dark broken top, the stump's
   ringed pale cut face.
2. Weaker: the ore rocks still read as rounded boulders; top 0.87 vs ~0.9 target. Stump splinters are small at game distance.
3. Not yet checked under game lighting (M5.1 runtime check).
