# Fable side-work recovery — 2026-07-18

Status: useful icon pipeline retained; avatar prototype quarantined; canonical player restored

## Retained

- The 101-file `assets/icons/gear/` family is retained: twelve equipment silhouettes across all eight metal tiers,
  plus five single-material items.
- Every sprite is a valid 128×128 transparent PNG and the runtime wiring resolves only declared complete families.
- `tools/gen_gear_icons.js` keeps Nano Banana generation behind `GEMINI_API_KEY` from the environment.
- `tools/recolor_gear_tiers.py` remains the repeatable metal-tier recoloring step.
- Fable's generated character remains available as `assets/models/male_default.glb` for comparison and future rework.

## Rejected for promotion

The generated male avatar is technically healthy, but its finished proof loses too much of the approved turnaround:
facial construction, hair silhouette, hands, clothing shape, boots, and authored surface character are substantially
flatter and less deliberate. It also has no checked-in `.blend` source or deterministic finished-model build script.
It therefore remains an experimental prototype and must not become the boot or canonical opt-in player.

`assets/models/player.glb` has been restored byte-identical to `assets/models/player_prev_20260718.glb.bak`. The
experimental `male_default.glb` was preserved byte-identical to the Fable handoff.

## Encoding repair

The same working-tree cluster contained double-decoded UTF-8 in `index.html`. Titles, tutorial punctuation, fallback
icons, modal close marks, admin controls, and build-stamp symbols were repaired without altering the surrounding UI
structure. The accidental UTF-8 byte-order marker was removed.

## Repeatable gate

Run:

`node tools/validate_fable_sidework.js`

The gate checks the exact 101-sprite family, PNG dimensions, runtime declarations, environment-only API-key use,
canonical/experimental GLB separation, required skin and animation clips, canonical backup identity, and HTML encoding.

The regular content validator and foreground smoke gate remain required after integration changes.

## Final acceptance

- `node tools/validate_fable_sidework.js`: PASS (13/13).
- `node tools/validate_content.js`: PASS.
- Browser visual review: PASS. The repaired login screen, title, punctuation, icons, and HUD render without mojibake.
- Foreground `?smoke=1` gate: PASS (103/103 structural assertions, real out-and-back walk, six streaming
  boundaries, exact save/load position, 60 FPS, 29 ms worst frame, 120 draw calls, 29,926 triangles,
  seven world ticks, zero uncaught errors, and zero console errors).
