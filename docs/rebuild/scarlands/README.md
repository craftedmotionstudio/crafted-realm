# The Scarlands art kit v1 (W2/W3, 2026-09-26)

The burned Wilderness north of the Wilderness Ditch (STORY_BIBLE.md §1/§3): a kit of our own low-poly Blender pieces
in the old-school 64 px texture style, a layout tool that turns a tile layout into both the server collision map and
the client placement list, and a proof over the W1 test map.

## What is in it

| Piece group | Pieces (id) | Collision |
|---|---|---|
| Dead trees | `dead_tree_tall`, `dead_tree_bent`, `dead_tree_split`, `dead_tree_snag`, `dead_shrub` | trees block their tile; the shrub is walkable |
| Stumps | `stump_charred`, `stump_split` | blocked |
| Ruins (modular, on tile edges) | `ruin_wall`, `ruin_wall_low`, `ruin_wall_corner`, `ruin_wall_end` (north edge), `ruin_pillar`, `ruin_pillar_broken`, `ruin_arch` (3x1 gateway) | walls = edge walls (N, + E for the corner); pillars blocked; arch blocks its two piers |
| Rubble, rock | `rubble_small` (walkable), `rubble_large` 2x2, `rock_boulder`, `rock_outcrop` 2x2 | blocked except the small rubble |
| Bones | `bones_skeleton`, `bones_skull`, `bones_pile` | walkable dressing |
| Cart | `cart_broken` 2x1 | blocked |
| The Ditch | `ditch_straight` 1x2, `ditch_end` 1x2, `ditch_corner` 2x2, `ditch_crossing_planks` 2x2, `ditch_crossing_stone` 2x2, `ditch_lip_wall` | trench cells = `water` (unwalkable, projectiles cross) + `cut` (lower the ground 1.6); the plank crossing is `cut` + `walk` (deck at +0.06); the causeway and lip wall add no collision |
| Signs, camps, markers | `wild_warning_sign`, `camp_fire_remnant` (glowing embers), `camp_tent_ruin` 2x2, `camp_crates_burnt`, `depth_stone` | blocked |

Texture additions (in `assets/textures/oldschool/`, built by `tools/build_oldschool_textures.js`): `scorched_earth`,
`ash`, `cracked_mud`, `burnt_grass`, `dark_rock`, `bone_dirt`, `charred_planks`, `ruined_stone`.

## Files

| What | Where |
|---|---|
| Kit GLB + manifest (published, committed) | `assets/scarlands/kit-v1/scarlands_kit.glb`, `assets/scarlands/kit-v1/manifest.json` |
| Proof layout + placement (published) | `assets/scarlands/proof/layout.json`, `assets/scarlands/proof/placement.json` |
| Proof server map (generated) | `server/data/maps/scarlands_kit_proof.json` |
| Sources | `tools/blender/build_scarlands_kit_v1.py` (pieces), `docs/rebuild/scarlands/scarlands-kit.textures.json` (texture recipe spec), `tools/make_scarlands_proof_layout.js` (proof layout) |
| Workspace (gitignored) | `.studio-workspaces/scarlands-kit-v1/{working,candidates}` (the .blend files, flat and textured GLB, manifest, texture report) |
| Tools | `tools/build_scarlands_kit.js` (build all), `tools/scarlands_kit.js` (layout -> map + placement), `tools/publish_scarlands_kit.js`, `tools/scarlands_proof.html`/`.js` (reference renderer), `tools/capture_scarlands_proof.js`, `tools/make_scarlands_sheets.py`, `tools/test_scarlands_kit.js` |

Rebuild everything: `node tools/build_scarlands_kit.js && node tools/make_scarlands_proof_layout.js &&
node tools/scarlands_kit.js docs/rebuild/scarlands/proof_layout.json --map server/data/maps/scarlands_kit_proof.json
--placement docs/rebuild/scarlands/proof_placement.json && node tools/publish_scarlands_kit.js apply`
(deterministic: the same inputs give the same GLB and map bytes).

## Layout format (`crafted-realm-scarlands-layout-v1`)

```json
{ "name": "...", "base": "server/data/maps/<map>.json", "kit": "<manifest.json>",
  "pieces": [{ "piece": "dead_tree_tall", "x": 5, "z": 60, "rot": 0 }],
  "runs":   [{ "piece": "ditch_straight", "from": [1, 44], "to": [62, 44], "rot": 0, "skip": [[14, 17]] }],
  "extra":  { "blocked": [[x1, z1, x2, z2]], "water": [...], "walls": [[x, z, "N"]] },
  "ground": { "default": "scorched_earth", "rects": [...], "patches": [...], "bands": [...], "paths": [...], "hills": {...}, "flatten": [...] } }
```

`x, z` = the south-west tile of the piece's footprint after rotation; `rot` = clockwise quarter turns seen from above
(a piece's north edge faces east at rot 1; only the rotations listed in the manifest are allowed). North is +z, as in
the server map. `base` supplies bounds, respawn, areas, spawns and any other keys; the tool writes `blocked`, `water`
and `walls` from the pieces plus `extra` (merged into rectangles and wall runs). A tile under a plank crossing is not
water. `node tools/scarlands_kit.js <layout> --map <out> --placement <out> [--compare <map>]`.

## How the online client should consume it

1. **Load once:** `manifest.json` and `scarlands_kit.glb` (GLTFLoader, r128). Treat colour maps as display values like
   the island loaders do (`map.encoding = THREE.LinearEncoding`, `magFilter = NearestFilter`,
   `minFilter = LinearMipmapLinearFilter`; `roughness = 1`, `metalness = 0`). The ember material is emissive.
2. **Pieces:** each piece is a root node named `scar_<id>` at the origin with one mesh child (one primitive per
   material). For every placement row `{node, cx, cz, yaw}`: position `(cx, groundY(cx, cz), -cz)` in a scene where
   north is -z, `rotation.y = yaw`. Ditch pieces sit at the uncarved ground height (their geometry already goes down
   to the trench bed).
3. **Instancing:** build one `THREE.InstancedMesh` per mesh primitive of each piece in use (the proof does this:
   `tools/scarlands_proof.js` `instance()`); the whole 64x128 proof map is 74 draw calls and about 67k triangles.
   For a larger world, instance per region (for example 16x16 tiles) so regions can be culled and streamed;
   r128 InstancedMeshes are not frustum-culled per instance.
4. **Ground:** `placement.ground` gives a kind per tile (`kinds[(z - z1) * width + (x - x1)]`, names in `kindNames`),
   suggested colours (`kindColours`), overlays drawn crisp (`overlays`: paths), tile-corner heights (`cornerHeights`,
   `(width + 1) x (depth + 1)`), the carved Ditch tiles (`cut`: `[x, z, depth]`, draw those tiles with their own
   vertices lowered by `depth`) and walk surfaces over them (`walk`: `[x, z, y]`). The reference ground in
   `tools/scarlands_proof.js` is the old-school island technique: a blended underlay per corner (4x4 tiles, overlays
   skipped), gouraud light baked per vertex from the corner heights, and the kit ground texture of each kind
   multiplied in as detail (divided by its `kit.json` mean). Ground textures by kind: grass `grass_a`, dirt `dirt`,
   burnt_grass `burnt_grass`, scorched_earth `scorched_earth`, ash `ash`, cracked_mud `cracked_mud`,
   dark_rock `dark_rock`, bone_dirt `bone_dirt`.
5. **Water with no piece** (the pool in the test map) is listed in `placement.water` as rectangles; draw your own
   surface there.
6. **Looks:** the day look uses the game's sky colour and far fog; the old-school look fogs to black from
   `camera distance + 24` to `+ 32` (as `HolmOldschoolLook.fogRange`). Both are shown in the sheets.
7. **Server:** load the generated map as any other (`server/data/maps/*.json`); `tools/test_scarlands_kit.js` proves
   the server's `CollisionMap` blocks the Ditch, passes both crossings and paths from the respawn to the ruins.

## Proof (`scratchpad/scarlands_v1/sheets/`)

Nine game-camera views (30 degree lens, the follow camera's yaw/pitch/distance), each as reference | day | void,
three improvement passes side by side, and the catalog of every piece. The proof layout keeps every blocked, water and
wall tile of `server/data/maps/scarlands_test.json` (it only adds collision for new dressing: trees, rocks, the camp,
signs and depth stones).
