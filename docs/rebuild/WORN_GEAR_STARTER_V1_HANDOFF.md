# Worn Gear Starter Family v1 — Handoff (2026-07-16)

The six held items the first hour actually uses are now modelled gear replacing their procedural
builders everywhere they appear: **bronze hatchet, bronze pickaxe, bronze sword, bronze dagger,
worn shortbow, wooden shield**.

## What shipped

| Piece | Path |
|---|---|
| Geometry module (U3 construction language) | `tools/blender/cr_worn_gear_starter_v1.py` |
| Builder / proof harness | `tools/blender/build_worn_gear_starter_v1.py` |
| Runtime GLB (6 consolidated meshes, 2,220 tris, 192 KB) | `assets/models/props/worn_gear_starter_v1.glb` |
| Blender source | `assets/blender/props/worn_gear_starter_v1.blend` |
| Factory recipe (schemaVersion 3, FACTORY PASS) | `assets/recipes/worn_gear_starter_v1.json` |
| Manifest / catalog | `assets/manifests/worn_gear_starter_v1.json`, `assets/catalogs/worn_gear_starter_v1.json` |
| Concept board (Nano Banana 2) | `docs/rebuild/concepts/worn_gear_starter_nanobanana2_v1.png` (+ `.prompt.md`) |
| Banked comparison, **9.1/10** | `Bible_References/Complete/_compare/worn_gear_starter_v1_compare.png` |
| Proof packet (8 views + 24 per-item + 4 family turnarounds + review JSON) | `scratchpad/worn_gear_starter_v1/` |
| Runtime loader (NEW file) | `src/gear_models_v1.js` (script tag in `index.html` after `world_gear.js`) |

## The runtime contract

- Each `gear_*` group in the GLB is authored at its **grip origin**: grip at (0,0,0), blade/business
  axis along game +Y, hatchet/pickaxe edge toward +X, shield face normal +X — the same conventions as
  the procedural `world_gear.js` builders, so `holdWeapon` (procedural rig) and GearFit (GLB avatar)
  consume them unchanged.
- `src/gear_models_v1.js` reassigns the global `gearMesh(id)`: MODEL_MAP (`axe/pick/sword/bow/shield`)
  plus ID_MAP (`bronze_dagger`). Every caller upgrades automatically — player worn gear, GLB-avatar
  GearFit, NPC hands, ground drops, anim showcase. **Every tier** of a mapped class gets the modelled
  mesh: materials named `CR_GEAR_METAL` / `_EDGE` / `_DARK` recolor from `METALS[tier]` (edge lightened
  30% toward white, dark ×0.72), cached per (material, tier).
- Fail-soft: missing GLB/loader → one `[GEAR]` console.warn, procedural meshes stay. Templates outside
  0.25–1.4 wu are rejected loudly. The GLB fetch is deferred to the window `load` event so the boot
  chain never waits on it.

## Browser verification (live saved adventurer; save snapshotted first and restored byte-identical)

- Wield through the real inventory path (`UI.useItem`) — chat confirms, tutorial `equip_hatchet` fires.
- **Real mining loop** at the cavern copper rocks with the modelled pickaxe: ore gained, Mining level-up,
  per-tick gather swings visibly carry the crescent head.
- Frozen-apex captures verified slash (sword raised overhead), stab (dagger thrust), bow draw (stave +
  string overhead), shield readable on the off-arm throughout.
- Ground drop (`itemGroundMesh('bronze_sword')`) contains `gear_sword` — modelled on the ground too.
- Shift+P GLB avatar: GearFit attached `gear_shortbow` (RightHand) and `gear_shield` (LeftHand) with
  correct orientation.
- **Zero console errors across the entire session.**

## Open items / gotchas discovered

1. **Smoke boot budget**: foreground smoke fails only `boot ≤ 5s` at 5.0–5.9 s — a differential run
   WITHOUT the gear script also failed (5.4 s), so it pre-exists on today's in-flight tree (Codex
   mid-edit across game1/2/4). Re-run `?smoke=1` after the tree settles; earlier today it passed at 1.1 s.
2. **Holm surface trees are not gather clickables** — only the cavern rocks carry `userData.rtype`.
   The `chop_logs` lesson's marked tree needs a real chunk-owned gather interaction before the chop
   flow can be verified end-to-end on the surface. (Mining exercised the identical gather/swing code.)
3. `orderWalk` from the arrival to (126,158) repeatedly dumped the player at (116,108) (Proving
   Grounds edge) — worth a look at v2 pathing/streaming interplay; not gear-related.
4. Teleporting out of the cavern leaves the underground fog/background until `Player.plane` is reset —
   the per-frame swap keys off plane, honored by the real ladders.

## v2 rev (same day): bronze helm + tier families + animation matrix + v02 fits

- `gear_helm` added to the family GLB (FACTORY PASS, 2,500 tris, helm 0.468w x 0.354h in range);
  `helm` mapped in the loader (`?v=2`), so every `{tier}_helm` and NPC helm upgrades automatically.
- NEW repeatable gate: `node tools/test_gear_models.js` — 34 headless checks locking the GLB<->loader
  contract (nodes, grip origins, axis conventions, size band, CR_GEAR_METAL* materials).
- `tools/_npc_gear_test.js` repaired (pre-split source path) — 25/25 PASS.
- Live QA via NEW `tools/qa_gear_headless.js` (puppeteer-core + system Chrome headless; the
  claude-in-chrome extension dropped mid-session). Disposable fresh profile; real login flow; QA
  character levels through real XP so steel/aurel/veyrite equips pass genuine requirement gates.
  19 captures banked in `scratchpad/worn_gear_starter_v1/live_qa/`:
  - helm on both rigs; tier matrix bronze/iron/steel hatchet + bronze/aurel/veyrite sword (recolors
    verified live; veyrite reads teal with lightened edges);
  - crush swing, shield-up block guard, mid-stride walk on the procedural rig;
  - all seven items on the v02 GLB avatar (no clipping/floating grips; hair hides under the helm),
    baked attack clip carrying the sword, mid-stride v02 walk.
  Zero uncaught errors in every run.

## Next

- Distinctive Aurel/Veyrite silhouettes (recolor-only today; the pipeline wants increasing prestige
  by construction, not just tint).
- Bronze helm polish: hue sits near the v02 skin tone at distance; consider darkening the recolor
  or adding a dedicated helm concept board (it currently rides the family comparison).
- Deepen the hatchet beard notch; optional second wood tone on the bow stave (9.1 review note).
- 2D inventory icons for the seven items remain the third leg of the pipeline's three-part
  deliverable (worn 3D + fit/animation are done).
