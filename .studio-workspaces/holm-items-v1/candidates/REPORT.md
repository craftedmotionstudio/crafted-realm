# Holm item pack v1 -- report

Built by `tools/blender/build_holm_items_v1.py` (Blender 4.5 headless). Candidate only: not wired into the runtime.

## Outputs

- `.studio-workspaces/holm-items-v1/candidates/items.glb` (one root per item id), `items.blend`, `manifest.json`
- `assets/icons/items/<id>.png` (96x96 RGBA, transparent) + `assets/icons/items/manifest.json`
- proof: `scratchpad/holm_items_v1/lineup.png`, `scratchpad/holm_items_v1/sheet.png` (icons at 96/48/32 px on inventory-slot colours)

## Items

| id | tris | size x/y/z (tiles, glTF Y-up) | mats | in game data |
|---|---|---|---|---|
| tinderbox | 208 | 0.21 / 0.10 / 0.14 | 3 | yes |
| hammer | 68 | 0.44 / 0.10 / 0.26 | 5 | yes |
| bucket | 288 | 0.37 / 0.35 / 0.34 | 3 | yes |
| bucket_water | 296 | 0.37 / 0.35 / 0.34 | 4 | yes |
| bucket_flour | 338 | 0.37 / 0.36 / 0.34 | 4 | yes |
| dough | 96 | 0.17 / 0.11 / 0.15 | 1 | yes |
| bread_dough | 176 | 0.30 / 0.09 / 0.17 | 2 | yes |
| bread | 176 | 0.32 / 0.12 / 0.18 | 2 | yes |
| logs | 236 | 0.60 / 0.25 / 0.27 | 4 | yes |
| raw_perch | 223 | 0.48 / 0.07 / 0.22 | 5 | yes |
| cooked_perch | 223 | 0.48 / 0.07 / 0.22 | 4 | yes |
| burnt_perch | 223 | 0.48 / 0.07 / 0.22 | 3 | yes |
| copper_ore | 102 | 0.24 / 0.16 / 0.20 | 2 | yes |
| tin_ore | 102 | 0.25 / 0.16 / 0.21 | 2 | yes |
| bronze_bar | 20 | 0.30 / 0.08 / 0.13 | 1 | yes |
| fishing_net | 212 | 0.60 / 0.03 / 0.28 | 4 | yes |
| coins | 336 | 0.26 / 0.07 / 0.21 | 2 | yes |
| arrows | 136 | 0.63 / 0.04 / 0.25 | 4 | yes |
| air_rune | 208 | 0.20 / 0.07 / 0.17 | 2 | yes |
| mind_rune | 212 | 0.20 / 0.08 / 0.17 | 2 | yes |
| leather_body | 166 | 0.61 / 0.07 / 0.47 | 3 | yes |
| wood_shield | 268 | 0.64 / 0.09 / 0.64 | 3 | yes |
| bones | 104 | 0.42 / 0.08 / 0.13 | 1 | yes |
| pot_of_flour | 338 | 0.37 / 0.36 / 0.34 | 4 | yes |

**Totals:** 24 items (23 unique models + alias `pot_of_flour`), 4417 triangles (unique), 16 materials (budget 16), no textures.

## Id check

Checked against `ITEMS` in `src/game1_data.js` plus the runtime additions in `src/cooking_bread.js` (`NEW_ITEMS`).

- Missing from game data: none
- `dough` and `bucket_flour` are NOT in `game1_data.js` ITEMS; they are added at runtime by `src/cooking_bread.js`.
- `pot_of_flour` exists in `game1_data.js`; it ships as its own root reusing the `bucket_flour` mesh (glTF shared mesh) and icon.
- `wood_shield` has `model:'shield'`, so the gear router (`src/gear_models_v1.js`) already maps its ground/held mesh to `gear_shield`; the `wood_shield` root here is for icon / optional ground-drop use.

## Conventions

- 1 unit = 1 tile; Blender Z-up exported glTF Y-up; origin at resting base centre (min Y = 0); longest axis +X (asserted).
- Colours authored as seen sRGB, roughness 1, specular 0, metallic 0 (props v2 rule).
- Icons: orthographic camera at 50 deg elevation, item yawed 10-35 deg for a diagonal read, auto-framed to its projected bounds with 7% margin,
  rendered 384 px EEVEE (Raw view transform) and box-downsampled to 96 px, then a 1 px dark ink outline + faint drop shadow (numpy post, identical for all).

## Self-review

- Every icon was checked on `sheet.png` at 96/48/32 px: all 24 read at 48 px; weakest are `tinderbox` (reads as a grey tin with a striker, not instantly a tinderbox) and `burnt_perch` (dark on dark, carried by the outline).
- Items are real-world-ish but exaggerated (bucket 0.37, shield 0.64, arrows 0.63 tiles); not yet checked in the game engine or wired to itemGroundMesh / iconFor.
- `dough`/`bucket_flour` exist only via `src/cooking_bread.js`; `pot_of_flour` shares the bucket_flour model (a separate pot model may be wanted later).

