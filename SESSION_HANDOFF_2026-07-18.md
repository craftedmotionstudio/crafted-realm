# Session Handoff — 2026-07-18

A pickup document for the work completed this session. All items below are **shipped +
verified** unless flagged OPEN. Deeper blow-by-blow lives in `Bible_References/PASS_LOG.md`
(three 2026-07-18 entries) and the `default-male-character` / `gear-icon-pipeline` memories.

---

## 1. Nano Banana gear inventory icons — WIRED, all 8 tiers

Replaced the flat canvas `drawModelIcon` art for gear with richer Nano Banana (Gemini) painted
sprites generated FROM the actual 3D models, then recoloured per metal tier.

- **Bronze/leather base (17 items):** generated via `tools/gen_gear_icons.js` (image-to-image
  using clean Blender model renders in `Bible_References/UI_Icons/model_refs/` as references),
  magenta-keyed with PIL into `Bible_References/UI_Icons/gear_nb/`, copied to `assets/icons/gear/`.
- **Per-tier (the other 7 metals):** `tools/recolor_gear_tiers.py` recolours ONLY the metal
  (warm hue ≤40) to each tier's colour from `TIERS`, preserving shading; gold guards, leather
  grips, helm plumes, outlines are left alone. 12 metal templates × 8 tiers = 96 files.
- **Wiring (`src/game0_icons.js`):** `GEAR_SPRITE_TEMPLATES` (12) + `GEAR_SPRITE_SINGLES` (5).
  `iconFor(id)` returns `assets/icons/gear/<id>.png` for any single or `<tier>_<template>`.
  `game0_icons.js?v=t2` in index.html.
- **Note:** iconFor returns a path used directly as `<img src>` — a MISSING file 404s (no
  canvas fallback). Only add a template to the set once its full 8-tier set exists on disk.
  `platebody / platelegs / hatchet / pickaxe` have NO sprites yet → still use drawn icons.
- **Verified:** live tier-ladder in inventory (copper→undercrag), all render correctly.

## 2. Default male character — BAKED into the game (concept B)

Owner picked **concept B** (green wool tunic, dark trousers, leather boots, sturdy build) from
3 concepts, then chose the **bake-a-GLB** path.

- **Pipeline:** Hunyuan mesh from the concept-B front crop (`tools/hunyuan_shape.py`) → Blender
  (invisible Mixar bg bridge) remesh/decimate/flat (~6k tris, faces −Y) → 6 region materials
  (`R_SKIN/HAIR/TUNIC/BELT/LEGS/BOOTS`, engine-sRGB concept-B palette) → **reused the 23-bone
  mixamorig armature** (so gear-attach bone names match) **refit to the new mesh's joints** →
  heat bind → **authored fresh idle/walk/attack/block** (reusing v02 clips would have retargeted
  badly — the new mesh is stockier / arms more spread).
- **Output:** `assets/models/male_default.glb` → copied to `assets/models/player.glb`
  (old backed up: `assets/models/player_prev_20260718.glb.bak`).
- **Polish pass:** fixed the sawtooth hairline via bmesh bisect (z=1.66 + y=0 then reclassify =
  razor OSRS fringe; bisect keeps deform weights, anims intact) and added eye+mouth geometry
  (new `R_EYES` material, weighted to `mixamorig:Head`).
- **`PLAYER_DEFAULT_COLORS`** in `src/fx_humanoid.js` synced to concept B; `fx_humanoid.js?v=g19`.
- **Verified:** installs as the player, animates, **gear attaches** on the new rig (longsword→
  RightHand, kiteshield→LeftHand, helm→Head), 0 console errors.
- **Review sheets:** `Bible_References/Character/male_concepts/` →
  `_concepts.png`, `male_b_turnaround.png`, `male_b_baked_sheet.png`, `male_b_polished_sheet.png`.

## Gates (after all changes)
- `node tools/validate_content.js` → **PASS**
- `node tools/run_smoke_headless.js` → **PASS, 103/103 structural, 100 FPS, 0 console errors**

---

## OPEN — your decision (nothing blocking)

**Make the baked GLB the BOOT default?** Right now `player.glb` is the canonical GLB avatar but
it is **opt-in** (reached via the char customizer / "HF Player" button). The boot default is
still the procedural humanoid (`applyPlayerLook` + `src/char_creator.js`). Making the GLB the
forced boot default = **retiring the procedural character creator**, which touches the tutorial's
character-design step (`CharCfg._new`) and the save/`CharCfg` flow — a broad change I did NOT flip
on my own. Say the word and I'll wire it in and gate it with smoke.

## Minor polish backlog (optional)
- Avatar face: no nose/brow geometry yet; back-hair reads a touch long in 3/4.
- Gear sprites: `platebody`/`platelegs` (and tools) still on drawn icons — generate if wanted.

## How to resume / useful handles
- **Serve + play:** dev server on `http://127.0.0.1:8777` (hard-refresh for JS edits). Smoke:
  `http://127.0.0.1:8777/?smoke=1` or `node tools/run_smoke_headless.js`.
- **Preview the baked avatar live:** in console —
  `player.userData.isPlayerGLB=false; installPlayerGLB(null,'assets/models/male_default.glb')`.
- **Blender bridge (for more model work):** launch Mixar bg —
  `Start-Process "C:\Program Files\Mixar\Mixar 3.0\mixar.exe" -ArgumentList '--background','--python','"<scratchpad>\mixar_bg_bootstrap.py"' -WindowStyle Hidden`
  → socket 9876 → `mcp__blender__execute_blender_code`. (Currently STOPPED.)
- **Regenerate per-tier gear:** `python tools/recolor_gear_tiers.py` (`--test` for one item).

---

*Signed — Claude_Notes, 2026-07-18*
