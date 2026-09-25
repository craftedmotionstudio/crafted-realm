# Tutor's Holm: old-school world look (2026-09-25)

Owner: "Overall this game has to feel a little bit more old school medieval, like old school RuneScape. Right now it
does feel a little bit too polished ... this needs to feel like a cozy medieval old school RuneScape style game."

Branch `world-look-2026-09-25` (worktree `CraftedRealms-Look`). Switch: `GameConfig.holmOldschoolLook` (on), one-session
override `?oldschool=0` / `?oldschool=1`. Off runs the previous code paths unchanged.

## Diagnosis (checked against Bible_References and the 2004 client's renderer, read-only study)

- Ours read as "polished low-poly indie": flat-shaded terrain facets, clean flat colours on every surface, saturated
  blue water, a sky-blue background with distant fog.
- The references: terrain is **gouraud** shaded. The 2004 client (Client2 `World.ts`, studied only) gives each tile one
  blended underlay colour and lights each lattice **vertex** from the height-map slope (ambient + one low side light),
  so hills shade softly while tile squares still show as close shades. Paths/water are overlays with crisp tile edges.
  Walls, roofs and floors carry small tiled textures (64-128 px, one repeat per tile, unfiltered). Water is a pale,
  grey-blue textured surface. Past the draw distance the screen is black.
- Correction to the brief: in the references the **grass itself is mostly untextured** (the speckle comes from colour
  variation and modern grass blades). We add only a faint grass speckle; the texture work is on paths, sand, rock,
  water and buildings.

## What changed

| Area | Files | Notes |
|---|---|---|
| Switch + ground material + fog/lights + model prep | `src/holm_oldschool_look.js` (new), `src/config.js` | ground = unlit `MeshBasicMaterial`, vertex colour x kit detail textures (divided by their mean) |
| Ground builder | `src/holm_overhaul_ground.js` (`chunkOldschool`, `lightAt`, `setTerrain`, `LOOK`) | same positions/diagonals as `chunk()` (unit-tested), per-tile blended underlay, per-vertex baked light, per-vertex texture weights |
| Terrain adapter | `src/world_v2_sampled_terrain.js`, `src/world_v2_terrain.js` | old-school branch only when the switch is on |
| Water | `src/holm_arrival_water.js` | kit water texture in world space, two slow drifting layers; old shader kept when off |
| Black void | `src/game5_main.js` | fog target from `HolmOldschoolLook.fogRange()` while the island look is active |
| Island wiring | `src/holm_arrival_qa.js`, `src/holm_island_extras.js` | preload kit, textured arrival package / survival pair with fallback to v9 / v3 if not served |
| Trail | via `HolmOldschoolLook.restyleTrail` | arrival trail = worn-path earth with the ground's light |
| Kit | `tools/build_oldschool_textures.js`, `assets/textures/oldschool/*.png`, `kit.json`, `tools/sheet_oldschool_kit.py` | 16 textures, 64 px, seeded procedural, tileable |
| Blender recipe | `tools/blender/apply_oldschool_textures.py`, specs `docs/rebuild/holm-overhaul/oldschool/*.textures.json` | UVs + kit textures on an existing .blend, new workspace only |
| One-command rebuild + proofs | `tools/build_holm_oldschool_candidates.js`, `tools/compare_glb_structure.js`, `tools/stage_holm_arrival_package_oldschool.js` | re-locks hashes (graph re-measure / package re-stage) and pins the export id |
| Checks / captures | `tools/test_holm_oldschool_look.js`, `tools/check_holm_look_navigation.js`, `tools/capture_holm_look.js`, `tools/make_holm_look_sheets.py` | |
| Publish list | `tools/publish_holm_island.js`, `assets/holm_island/ws/holm-survival-oldschool-*` | production copies of the survival pair |

New workspaces (gitignored, copy them with the branch or rebuild with `node tools/build_holm_oldschool_candidates.js`):
`holm-guide-house-oldschool-v1`, `holm-survival-oldschool-v1`, `holm-survival-oldschool-navigation-v1`,
`holm-arrival-package-oldschool-v1` (export pinned in `src/holm_oldschool_look.js`).

## Texture kit (assets/textures/oldschool, 64 x 64, our own procedural recipes)

grass_a, grass_b, grass_c (speckle variants), dirt (earth + pebbles), path (cobble), sand, rock (granular stone), mud
(creek bed), water, brick, stone_course, plaster, planks, beam (grain), thatch, roof_tiles. `kit.json` records each
texture's mean colour; both the ground shader and the Blender recipe divide by it so a texture adds pattern without
moving the authored average colour. Rebuild: `node tools/build_oldschool_textures.js` (deterministic).

## Hash locks

- Survival camp: the navigation graph stores `modelSha256`; the textured GLB is re-measured
  (`docs/rebuild/holm-overhaul/buildings/survival-oldschool.nav.json`) and proven node-identical to v3 apart from the hash.
- Guide House: part of the arrival package export. `tools/stage_holm_arrival_package_oldschool.js` = v9 with the textured
  house; its navigation is identical to v9's apart from the `graphRevision` strings (they hash every source file by
  design). Island saves use `holm-island-v1`, so they restore unchanged; an arrival-only (`?arrivalQA=1`) save from v9
  restores at the landing.
- `tools/check_holm_look_navigation.js` boots both looks and compares the composed island graph, heights, stats and
  clickables (PASS in `?holmIsland=1` and in production rehearsal `LOOK_MODE=live`).

## Rollout checklist for every other building (hand to Blender agents)

1. Pick the building's current candidate `.blend` (the one its GLB was exported from) and note the Blender version
   that saved it (`head -c 20 file.blend`: `BLENDER-v405` = 4.5, `BLENDER17-01v0501` = 5.1).
2. Write `docs/rebuild/holm-overhaul/oldschool/<id>.textures.json`:
   `source` (.blend), `blender`, `reference` (its current GLB), `outBlend`/`outGlb`/`report` in a NEW workspace
   `.studio-workspaces/holm-<id>-oldschool-v1/candidates/`, and `vertexColour` rules if it uses `Holm flat colour`
   (`skip` for maps/flames/glows, `woodOnly` for furniture objects, `floors` for floor objects).
   Add `rules` only if the default material-name table does not fit (first match wins; `null` keeps flat colour).
3. If the building has a measured stance graph, copy its `buildings/<id>.nav.json` to `<id>-oldschool.nav.json` with
   `model` = the new GLB and `out` = `.studio-workspaces/holm-<id>-oldschool-navigation-v1/candidates`, and add
   `"navigation": {"spec": ..., "reference": <current navigation.json>}` to the textures spec.
   (Keep/bakehouse/lodge use their own extractors `extract_holm_keep_navigation_v*.py` etc.: re-run the one that made
   their current graph on the new GLB.)
4. Run `node tools/build_holm_oldschool_candidates.js <id>`. It stops unless the GLB keeps every node name, parent,
   transform, extra, animation and triangle of the reference and the re-measured graph is node-identical.
5. Look at the building in Blender or the game; adjust `rules` (texture, metres per repeat) and re-run. Typical repeats:
   stone/rock 0.9 m, planks 1.0 m, beam 0.8 m, plaster 1.5 m, roof tiles 1.1 m, thatch 1.4 m.
6. Add `<id>: {graph, model}` to `ASSETS.buildings` in `src/holm_oldschool_look.js` (the loader falls back to the old
   pair if the new one is not served) and add both workspace folders to `DIRS` in `tools/publish_holm_island.js`, then
   `node tools/publish_holm_island.js apply` (commit only the new `assets/holm_island/ws/...oldschool...` folders).
7. Prove: `node tools/test_holm_oldschool_look.js`, `SMOKE_BASE=... node tools/check_holm_look_navigation.js`,
   `LOOK_ONLY=<view> node tools/capture_holm_look.js` + `python tools/make_holm_look_sheets.py`; then the island QA
   on a quiet machine.
8. Things the recipe does not do: trees/leaf cards, props packs (`holm-props-v*`, habitat), bridges, the dock and the
   characters keep their current materials; they take the same recipe (props: per-object GLBs, one spec each).
   Modelled per-tile colour noise (e.g. warm/cool clay tiles) can be merged into one textured material in the source
   when a building is next rebuilt; the texture then carries the variation.
