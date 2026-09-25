# holm_player_v1 -- canonical Blender-authored player

Built by `tools/blender/build_holm_player_v1.py` (Blender 4.5, headless). Everything -- mesh, weights, clips -- is authored procedurally in Blender; nothing imported.

## Files

- `assets/models/holm_player_v1.glb` -- all variant meshes + all clips
- `assets/models/holm_player_v1_default.glb` -- Body_Male + Hair_Short only (zero-code drop-in for `installPlayerGLB(cb, url)`)
- `.studio-workspaces/holm-player-v1/candidates/player.blend`, `manifest.json`, this report
- proof renders: `scratchpad/holm_player_v1/` (`sheet.png` = everything)

## Drop-in contract vs assets/models/player.glb

- bone names match: **True** (order match: True, hierarchy match: True, Blender re-import match: True)
- rest pose deviation: max 0.00005 m translation, 0.013 deg rotation
- forward: glTF +Z (Blender -Y); feet at 0; height {"Body_Male+Hair_Short": 1.8418, "Body_Male (bald)": 1.814, "all_variants_bbox": 1.8712}
- materials (7): R_SKIN, R_HAIR, R_TUNIC, R_BELT, R_LEGS, R_BOOTS, R_EYES -- recolorPlayer strips `R_` so regions are skin/hair/tunic/belt/legs/boots (+eyes)

## Clips (30 fps, in place)

| clip | seconds | frames | loop |
|---|---|---|---|
| idle | 2 | 60 | yes |
| walk | 0.8 | 24 | yes |
| run | 0.5333 | 16 | yes |
| attack_slash | 0.6 | 18 | once |
| attack_stab | 0.6 | 18 | once |
| attack_crush | 0.7 | 21 | once |
| bow | 1.2 | 36 | once |
| cast | 1 | 30 | once |
| chop | 1 | 30 | yes |
| mine | 1 | 30 | yes |
| net | 1.6 | 48 | yes |
| cook | 1.2 | 36 | yes |
| smith | 1 | 30 | yes |
| smelt | 1.2 | 36 | yes |
| climb | 1 | 30 | yes |
| block | 0.4 | 12 | once |
| hit | 0.4 | 12 | once |
| death | 1.3333 | 40 | once |
| attack (alias of attack_slash) | 0.6 | 18 | once |

## Variants + triangle budget (<= 4000 for body + one hair + beard)

- Body_Male: 1440 tris
- Body_Female: 1464 tris
- Hair_Short: 380 tris
- Hair_Long: 508 tris
- Hair_Ponytail: 468 tris
- Hair_Bun: 456 tris
- Hair_Mohawk: 76 tris
- Beard_Full: 282 tris
- worst combo: 2254 tris (Body_Female+Hair_Long+Beard_Full)

## Runtime notes (no runtime files were edited)

- The full GLB contains every variant; glTF has no visibility flag, so the loader must hide the unused ones after load, e.g. `rig.traverse(o=>{ if(/^(Body_|Hair_|Beard_)/.test(o.name)) o.visible = [bodyName, hairName, beardName].includes(o.name); })` (three.js names the skinned mesh node exactly `Body_Male` etc.). Until that exists, use `holm_player_v1_default.glb`.
- `installPlayerGLB` normalises the whole scene bbox to 1.85 m; with every variant visible the bbox top is the mohawk, so hide variants BEFORE measuring or the character shrinks ~2%.
- `playerGLBAnim` only drives idle/walk/attack/block; the other clips are in the GLB for the skilling/combat code to play. `death` should use LoopOnce + clampWhenFinished.
- `refreshGLBGear` hides meshes whose name matches /hair/ under a helm -- Hair_* names satisfy that; Beard_Full stays visible (OSRS-correct).

## Validation

```json
{
 "bone_names_match": true,
 "bone_order_match": true,
 "hierarchy_match": true,
 "bone_count": 23,
 "max_rest_translation_delta_m": 5e-05,
 "max_rest_rotation_delta_deg": 0.013,
 "clips": {
  "attack": 0.6,
  "attack_crush": 0.7,
  "attack_slash": 0.6,
  "attack_stab": 0.6,
  "block": 0.4,
  "bow": 1.2,
  "cast": 1,
  "chop": 1,
  "climb": 1,
  "cook": 1.2,
  "death": 1.3333,
  "hit": 0.4,
  "idle": 2,
  "mine": 1,
  "net": 1.6,
  "run": 0.5333,
  "smelt": 1.2,
  "smith": 1,
  "walk": 0.8
 },
 "missing_clips": [],
 "zero_duration_clips": [],
 "missing_meshes": [],
 "materials": [
  "R_HAIR",
  "R_TUNIC",
  "R_BELT",
  "R_BOOTS",
  "R_SKIN",
  "R_EYES",
  "R_LEGS"
 ],
 "blender_reimport_bones_match": true,
 "PASS": true
}
```
