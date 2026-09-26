# Tutor's Holm: old-school world look (2026-09-25, island rollout 2026-09-26)

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
  water, buildings, trees and props.

## What changed

| Area | Files | Notes |
|---|---|---|
| Switch, ground material, fog/lights, model swaps | `src/holm_oldschool_look.js` (new), `src/config.js` | ground = unlit `MeshBasicMaterial`, vertex colour x kit detail textures (divided by their mean); `SWAPS` = verified folder swaps for every textured model |
| Ground builder | `src/holm_overhaul_ground.js` (`chunkOldschool`, `lightAt`, `setTerrain`, `LOOK`) | same positions/diagonals as `chunk()` (unit-tested), per-tile blended underlay, per-vertex baked light, per-vertex texture weights |
| Terrain adapter | `src/world_v2_sampled_terrain.js`, `src/world_v2_terrain.js` | old-school branch only when the switch is on |
| Water | `src/holm_arrival_water.js` | kit water texture in world space, two slow drifting layers; old shader kept when off |
| Black void | `src/game5_main.js` | fog target from `HolmOldschoolLook.fogRange()` while the island look is active |
| Island wiring | `src/holm_arrival_qa.js`, `src/holm_island_extras.js`, `src/holm_island_lessons.js`, `src/holm_island_gates.js` | preload kit + probe the textured files; every model URL goes through `HolmOldschoolLook.url()`; gate pack maps drawn as display values |
| Trail | via `HolmOldschoolLook.restyleTrail` | arrival trail = worn-path earth with the ground's light |
| Kit | `tools/build_oldschool_textures.js`, `assets/textures/oldschool/*.png`, `kit.json`, `tools/sheet_oldschool_kit.py` | 20 textures, 64 px, seeded procedural, tileable; building/tree textures lifted to ~.82 mean ("detail headroom") so light authored colours are never clamped |
| Blender recipe | `tools/blender/apply_oldschool_textures.py`, specs `docs/rebuild/holm-overhaul/oldschool/*.textures.json` (30) | UVs + kit textures on an existing .blend or an imported GLB, new workspace only |
| One-command rebuild + proofs | `tools/build_holm_oldschool_candidates.js`, `tools/compare_glb_structure.js`, `tools/blender/relock_with_swapped_paths.py`, `tools/stage_holm_arrival_package_oldschool.js` | structure/animation proof per GLB, graph re-lock per building, landscape re-measure, arrival package v2, export id pinned |
| Checks / captures | `tools/test_holm_oldschool_look.js`, `tools/check_holm_look_navigation.js`, `tools/capture_holm_look.js` (10 views + `LOOK_SET=closeup` 25 views), `tools/make_holm_look_sheets.py`, `tools/make_holm_look_closeup_sheets.py` | |
| Publish list | `tools/publish_holm_island.js`, `assets/holm_island/ws/*oldschool*` | production copies of every swapped folder |

## Rolled out (2026-09-26): every model on the island

| Asset | Workspace (model / graph) | Route | Re-lock |
|---|---|---|---|
| Guide House | `holm-guide-house-oldschool-v1` | .blend | arrival package v2 |
| Survival camp | `holm-survival-oldschool-v1` / `-navigation-v1` | .blend | re-measured, node-identical |
| Warden's Keep | `holm-keep-oldschool-v1` / `-navigation-v1` | GLB import (keep.blend no longer matches keep.glb) | graph carried over, hash changed; geometry proven identical |
| Bakehouse | `holm-kitchen-oldschool-v1` / `-navigation-v1` | .blend | own extractor v6 re-run, identical |
| Quest Lodge | `holm-quest-lodge-oldschool-v1` / `-navigation-v1` | .blend | own extractor v4 re-run, identical apart from model hash/paths |
| Bank, Mage, Lastlight (+ interiors), Quarry gatehouse, Haven, Cavern | `holm-<id>-oldschool-v1` / `-navigation-v1` | .blend | re-measured, node-identical |
| Bridges | `holm-island-bridges-oldschool-v1` | .blend | none (data-driven) |
| Tree family (oak, birch, pine, tuft, reeds, arrival oak) | `holm-tree-family-oldschool-v1` | GLB import, leaf/bark images replaced | arrival oak: landscape re-measure |
| Props packs v1 (habitat), v3 (gates), v5 (lessons) | `holm-props{1,3,5}-oldschool-v1` | v1/v3 .blend, v5 GLB import at 24 fps | none |
| Dock + moored boat, provision rack | `holm-arrival-dock-oldschool-v1`, `holm-provision-rack-oldschool-v1` | .blend | arrival package v2 |
| Hazels, fieldstones, garden wall, bench, waypost, cargo | `holm-arrival-garden-oldschool-v1`, `holm-landing-props-oldschool-v1` | GLB import | landscape re-measure `holm-arrival-landscape-measure-oldschool-v1` (equal to v4 within 1e-5 apart from render vertex counts) |
| Lantern Keeper statue v4 (v3.0 body) | `holm-arrival-statue-oldschool-v1` | .blend; every stone face `rock` (spec `vertexColour.texture`), lantern and lettering untouched, lantern glass/flame emissive kept | landscape re-measure `holm-arrival-landscape-measure-oldschool-v2` (measure v5, equal to the untextured v5 measurement) |
| Arrival package | `holm-arrival-package-oldschool-v3` (export pinned in the look module; v2 had statue v3) | Safe Publish | navigation identical to v9 apart from revision strings |

Not rolled out: props v4 (lever, beam, marker, ripple, flames: nothing texturable), characters (other agents).
The arrival step reads `docs/rebuild/holm-overhaul/oldschool/arrival.json` (measure script + swaps, untextured reference,
stage script, package id, navigation reference).

## Texture kit (assets/textures/oldschool, 64 x 64, our own procedural recipes)

grass_a, grass_b, grass_c (speckle variants), dirt (earth + pebbles), path (cobble), sand, rock (granular stone), mud
(creek bed), water, brick, stone_course, plaster, planks, beam (grain), thatch, roof_tiles, leaves (light leaves over
darker clumps and gaps), needles, bark (fissures + knots), bark_birch. `kit.json` records each texture's mean colour;
the ground shader and the Blender recipe divide by it, so a texture adds pattern without moving the authored average
colour. Rebuild: `node tools/build_oldschool_textures.js` (deterministic).

## Hash locks

- Buildings: every navigation graph stores `modelSha256`; the build tool re-measures (general extractor), re-runs the
  building's own extractor with folders swapped (bakehouse, lodge), or, for the keep whose .blend no longer matches its
  GLB, carries the graph over with the new hash (sound: the structure proof shows every triangle is unchanged).
  Runtime swaps a building's model and graph together and only when both are served.
- Arrival: everything in the arrival package export; `tools/stage_holm_arrival_package_oldschool.js` (v3) swaps all
  arrival models (statue v4 included), the landscape is re-measured, and the navigation equals v9's apart from the `graphRevision` strings
  (they hash every source file by design). Island saves use `holm-island-v1`, so they restore unchanged; an arrival-only
  (`?arrivalQA=1`) save from v9 restores at the landing.
- `tools/check_holm_look_navigation.js` boots both looks and compares the composed island graph (10,901 nodes), heights,
  stats and clickables, and requires all 15 swaps loaded (PASS in `?holmIsland=1` and production rehearsal `LOOK_MODE=live`).

## Checklist for new or changed assets (hand to Blender agents)

1. Find the asset's source: the `.blend` its GLB was exported from, and the Blender version that saved it
   (`head -c 20 file.blend`: `BLENDER-v405` = 4.5, `BLENDER17-01v0501` = 5.1; a zstd header means open it in 5.1).
   If the .blend holds several exported GLBs, or no longer matches the GLB, use `"import": "<the GLB>"` instead.
2. Write `docs/rebuild/holm-overhaul/oldschool/<id>.textures.json`: `source` or `import`, `blender`, `reference` (the
   current GLB), `outBlend`/`outGlb`/`report` in a NEW workspace `.studio-workspaces/holm-<id>-oldschool-v1/candidates/`,
   `vertexColour` if it uses `Holm flat colour` (`skip`, `woodOnly`, `floors`, `maxVariants` 2, `minShare` .15), `rules`
   to override the material-name table (`[[regex, texture|null, metres]]`, tried first), `replaceExisting` to swap
   authored images (trees), `factorToSrgb` when the runtime converts flat colours to sRGB (props v1), `manifest` to copy
   a manifest with refreshed hashes, and for imported clips `exportAnimationMode: NLA_TRACKS`, `fps` (the clips' rate)
   and `slideToZero` (false if the clips start at frame 1).
3. Re-lock: `navigation` (general extractor spec copy), `extractor` (own extractor + folder swaps + ignore keys),
   `rehash` (only when the geometry proof passes and the source .blend cannot be re-measured), or `arrival: true`.
4. Run `node tools/build_holm_oldschool_candidates.js <spec-prefix>` (add `arrival` for arrival assets). It stops unless
   the GLB keeps every node, parent, transform, extra, animation key and triangle of the reference and every re-lock
   proof holds.
5. Review the close-up (`LOOK_SET=closeup LOOK_ONLY=<view> node tools/capture_holm_look.js`), adjust `rules`, re-run.
   Typical repeats: rock 0.9 m, planks 1.0 m, beam 0.8 m, plaster 1.5 m, roof tiles 1.1 m, thatch 1.4 m, leaves 0.9 m.
6. Add a swap to `SWAPS` in `src/holm_oldschool_look.js` (building pairs: model + graph folders and both probes), add the
   folders to `DIRS` in `tools/publish_holm_island.js`, run `node tools/publish_holm_island.js apply` and commit only the
   new `assets/holm_island/ws/...oldschool...` folders (revert anything else it rewrites).
7. Prove: `node tools/test_holm_oldschool_look.js`, `SMOKE_BASE=... node tools/check_holm_look_navigation.js` (update the
   swap count), close-up and 10-view sheets, then the island QA on a quiet machine.
8. Keep draw calls in check: each vertex-colour class split is one more draw call per mesh (`maxVariants`); named
   materials are textured in place (no new draw calls).

## Look pass 2 (2026-09-26): measured against the refs, look v2, classic pixels

Owner, 2026-09-26: "the overall feel is a little bit too polished; it needs to feel more like old school and follow more
like the Bible references style ... I think it might be [a textures thing]". Branch `world-look2-2026-09-26`
(worktree `CraftedRealms-Look2`). Every change was measured; no model, graph, triangle or hash changed (pixels only).

### Measuring (tools/measure_look_vs_refs.py)

- Surface classes grass, path, sand, foliage, trunk, wall, roof, water. Numbers: HLS L/S/H of the region's mean colour,
  `sd` (lightness spread inside 16 px blocks: blotchiness, not roof-plane lighting), `fine` (mean |luma step| between
  neighbouring pixels = local texture contrast) and `coarse` (the same on 4x4 averaged pixels = leaf-clump / blotch
  scale), every image at a common 900 px screen height (big refs area-averaged, small 2004-size refs nearest-scaled).
- Refs: hand-picked boxes in 10 Bible references (`docs/rebuild/holm-overhaul/oldschool/look_ref_regions.json`, check
  with `python tools/measure_look_vs_refs.py regions`). Band = min..max over the refs, widened by a small tolerance;
  grey surfaces (S < .08) have no hue band.
- Ours: `LOOK_MASK=1 LOOK_ROOT=holm_look_v2 node tools/capture_holm_look.js` also writes `<view>.mask.png` (every mesh in a
  flat class colour; ground split by its texture weights; foliage/trunk/wall/roof by material name, timber roofs by
  mesh name), eroded 2 px, void pixels dropped. `capture`, `compare`, `views` commands print the tables.
- Sheets: `python tools/make_holm_look_v2_sheets.py` -> `scratchpad/holm_look_v2/sheets/` (reference | live | v2 |
  v2 + classic pixels | approved login mood, numbers table per view, `summary.png/json`).

Diagnosis in numbers (live look, class averages over the 10 views): grass fine contrast 2.60 (refs .14-.85), foliage
L .31 / S .41 / sd 27 / coarse 16 (refs <= .29 / .39 / 17 / 12: bright, saturated camouflage blotches), roof hue 30
and tile contrast 13 (refs >= 38 / <= 9), plaster/stone S .18 (refs <= .15), paths/sand speckle. Grass lightness and
water were already inside the band (distant water only looked dark in the long void fade).

### Look v2 (default; `?lookv=1` or `GameConfig.holmLookVersion=1` = the first look, for A/B)

| Area | Change |
|---|---|
| Kit (additive) | `tools/oldschool_textures_v2.js`, registered by one line in `build_oldschool_textures.js`: `dirt_soft`, `sand_soft`, `leaves_soft`, `needles_soft`, `bark_soft`, `roof_tiles_soft`, `thatch_soft`, `stone_course_soft`, `plaster_soft`, `planks_soft`, `beam_soft` (same layouts, low tone spread; first-kit PNGs byte-identical) |
| Ground | grass without detail texture (a .15 trace of `grass_b`), per-tile underlay + gouraud slope light only; grass underlay ~10% darker, sand ~8% lighter, per-tile jitter .09 (`HolmOverhaulGround.setLookVersion`); soft earth/sand detail |
| Models | `HolmOldschoolLook` hooks `GLTFLoader.parse` while the island look is active: each kit image in a textured candidate (image name) is swapped for its soft variant keeping the authored average colour, then graded per family (`GRADE`: leaves gain .74 sat .82 hue -5, roof tiles .95/.7/+24, plaster .93/.4, stone .55 sat, ...) on the material colour, or on the corner colours of vertex-coloured variants; own-image keep/lodge textures graded by `FAMILY`; timber-shingle roof meshes (bakehouse) get the roof-wood grade on their own corners |
| Scene | void fade 27..30 past the camera distance (was 24..32), sun 0xfff6ea and ground bounce 0x6c6a60 (less amber: the warm light alone added ~.08 saturation to grey walls); hills shade from the baked ground light as before |

Passes (class averages outside the band / per-view values outside, 10 views): live 14/137 -> pass 1 2/49 -> pass 2
1/48 -> pass 3 0/43 -> pass 4 0/31 -> pass 5 0/28 -> pass 6 (final) 0/29 (pass 6 adds the bakehouse roof to the roof
class, so it is measured on more surface than pass 5). Remaining per-view strays: the Lastlight clay roof (hue 35),
bakehouse/guide house warm sandstone (S .16-.19 in two views), close-up paths by the creek (L .47-.52), the survival
camp's small sand patch.

### Classic pixels (`src/classic_pixels.js`, off by default)

Settings -> "Classic pixels" (localStorage), `?classic=1/0`, `GameConfig.classicPixels`. The world is drawn into a render
target of screen height / whole number (~503 lines: 900 px -> 769 x 450, 1440 -> 3x, 2160 -> 4x), no anti-aliasing,
scaled up nearest, and every pixel is mapped to a fixed 64-colour island palette (+ black; median cut of the look-v2
captures, `tools/build_classic_palette.py` -> `assets/textures/oldschool/classic_palette.json`, no dither): the finish
of the owner-approved login art. `?classicPalette=0` = pixels without the palette step. UI, chat and 2D overlays stay
sharp; picking and camera unchanged; `renderer.info` counts the world pass + 1 blit. Cost (uncapped, RTX 4070 laptop,
headless, `node tools/bench_classic_pixels.js`, median fps off -> on): guide house 50 -> 46, bakehouse 47 -> 51, hill
panorama 83 -> 86, i.e. no measurable cost (the island is draw-call / CPU bound, not fill bound).

### Needs a Blender re-export to bake v2 in (runtime swap works meanwhile)

The runtime swap/grade covers every textured candidate; baking it would drop the loader hook. Needed: an
`apply_oldschool_textures.py` option that maps first-kit names to the `*_soft` names (leaves at 0.45 m, i.e. the runtime's
2x repeat) and bakes `GRADE` into the tints / corner colours, then `build_holm_oldschool_candidates.js` into new
`-oldschool-v2` workspaces with the usual re-locks and arrival package v4. Assets, by priority:
1. foliage: tree family (oak, birch, coastal pine, meadow tuft, creek reeds, arrival oak v3), garden hazels, props
   packs v1/v3/v5 shrubs, survival coppice;
2. roofs: Guide House (clay tiles, VC), bakehouse (timber shingles, VC), Lastlight / quarry / bank / mage clay tiles,
   survival + haven + mage thatch, keep shingles (`roof-128`), lodge slate/reed (own images);
3. walls and timber: every building's plaster / stone / planks / beam (Guide House, bakehouse, lodge, keep, bank, mage,
   Lastlight, quarry, haven, survival, cavern), bridges, dock + moored boat, provision rack, landing props, statue.
Modelling notes (not texture): the survival camp thatch is a patchwork of differently coloured cards and the Guide
House roof carries strong per-face tile colour variation; both still read busier than the refs' even roofs.
