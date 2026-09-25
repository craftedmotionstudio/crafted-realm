# Holm practice grubkin v1

Original six-legged grub crawler for the Tutor's Holm combat trial (dagger / shortbow / Wind Strike target).
Built by `tools/blender/build_holm_grubkin_v1.py` (Blender 4.5 headless, deterministic).

- Runtime GLB: `assets/models/holm_grubkin_v1.glb` (load via `glbChar:'holm_grubkin_v1', glbHeight:0.75`)
- Blend: `.studio-workspaces/holm-grubkin-v1/candidates/grubkin.blend`
- Renders: `scratchpad/holm_grubkin_v1/` (01 three-quarter + 1.9 capsule, 02 side, 03 front, 04-08 clip poses, sheet.png)

## Numbers
- Triangles: 1218 / 3000
- Bones: 20 / 24 (root, body, thorax, head, mand_L, mand_R, leg_TL_up, leg_TL_lo, leg_TR_up, leg_TR_lo, abdomen, tail, leg_AL_up, leg_AL_lo, leg_AR_up, leg_AR_lo, leg_BL_up, leg_BL_lo, leg_BR_up, leg_BR_lo)
- Materials: 6 / 6 (flat sRGB colours, roughness 1, no textures)
- Bounds (Blender units): height 0.723, length 1.2506, width 1.23
- Forward: glTF +Z (Blender -Y), same as v07.glb; `npc.mesh.lookAt(player)` aims it correctly.

## Clips (glTF animation names)
- `idle`: 2 s (60 frames @ 30 fps, loops)
- `walk`: 0.8 s (24 frames @ 30 fps, loops)
- `attack`: 0.6 s (18 frames @ 30 fps, one-shot)
- `block`: 0.4 s (12 frames @ 30 fps, one-shot)

walk is in place (no root motion; alternating tripod gait TL+BR+AL / TR+BL+AR, body bob twice per cycle).
attack rears up (front legs raised, jaws open) then lunges and snaps the mandibles shut; block flinches back and curls
(head tucked, tail up, front legs guarding). Skinning is rigid per part (one weight 1.0 per vertex) for robustness.

## Validation (re-import of the exported GLB)
- skinned_mesh_present: PASS
- clips_present: PASS
- clip_durations_nonzero: PASS
- tris_within_budget: PASS
- bones_within_budget: PASS
- materials_within_budget: PASS
- no_image_textures: PASS

Overall: PASS
