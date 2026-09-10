# Workyard Waterworks U4 — isolated asset family handoff (Claude → Codex)

Date: 2026-07-15. Status: **integrated and accepted in r128 gameplay plus r160 Studio.**
Ledger targets: U4.01 (dock shell), U4.02 (pulley station), U4.03 (animation), plus the pure-data
contract that Codex wires for U4.05/U4.06/U4.07. Prerequisite verified before work:
`u4_waterworks_shore_socket` lives at Workyard-local **(9.92, 1.85, 0.20)**
(`tools/blender/build_survival_workyard_v2.py:626`).

Claude's isolated packet did not claim Gate E/F/G. Codex completed those gates on 2026-07-15;
the fishing lesson itself remains the separate U5 slice.

## What was created

One animated prop family, `workyard_waterworks_u4_v1`. Local frame: root pivot at the
shore-entry walking surface; deck top = local z 0; assumed water plane = local **z −0.50**;
the dock leaves the shore toward +X, turns right at the corner platform, and lands on the
adjacent bank at −Y. Exported facing: Blender −Y = Three.js +Z (yaw 0 keeps the layout).

| GLB node | Content / purpose |
|---|---|
| `workyard_waterworks_u4_v1` | family root; carries the animation-event metadata extras (below) |
| `dock_shore_span` | 13 hand-cut planks, 3 bearers, 6 braced piles, threshold, foot stones, two side rope-rails (entry open) |
| `dock_turn_platform` | turned decking, corner piles with proud iron-banded bollards, east cross brace, junction sills, east rail |
| `dock_bank_span` | 11 planks, 3 bearers, 6 braced piles, west rail, bank threshold + stones (exit + fishing edge open) |
| `pulley_frame` | pegged posts, back braces, iron foot brackets, crossbeam, jib + guide wheel, cantilevered set-down ledge |
| `pulley_crank` | winch drum, flanges, rope wraps, iron axle, outboard crank arm + worn grip (animated: rotation about local X) |
| `pulley_rope` | static feed rope + `RopeFall` (animated scale.z from the guide tangent) |
| `pulley_bucket` | iron hook + bail, 9-stave bucket, two hoops, recessed interior wall + warm floor (animated: location.z + idle sway) |
| `shore_entry_socket` | (0, 0, 0) — walk-on point |
| `bank_exit_socket` | (5.05, −4.55, 0) — walk-off point |
| `fishing_edge_socket` | (6.05, −2.60, 0) — reserved for U5, east edge of the bank span |
| `water_contact_socket` | (5.0, 1.46, −0.50) — splash/ripple anchor (U4.04) |
| `pulley_operator_socket` | (5.05, 0.35, 0) — operator standing tile |

## Files

- Editable source: `assets/blender/props/workyard_waterworks_u4_v1.blend`
- Game-ready GLB (3 named clips): `assets/models/props/workyard_waterworks_u4_v1.glb`
- Family module / builder: `tools/blender/cr_workyard_waterworks_u4_v1.py`, `tools/blender/build_workyard_waterworks_u4_v1.py`
- Recipe (schemaVersion 3) / manifest / catalog: `assets/recipes|manifests|catalogs/workyard_waterworks_u4_v1.json`
- Pure-data contract (NOT runtime-installed): `src/waterworks_u4_contract.js`
- Deterministic headless test: `tools/test_waterworks_u4_contract.js` → `scratchpad/workyard_waterworks_u4_v1/contract_test_result.json` (**PASS 21/21**)
- Concepts (+ prompts): `docs/rebuild/concepts/workyard_waterworks_u4_{dock,pulley}_nanobanana2_v1.png|.prompt.md`
- Proofs (all in `scratchpad/workyard_waterworks_u4_v1/`): `01_shaded`, `02_clay_silhouette`, `03_wireframe`,
  `04_material_id`, `05_gameplay_camera`, `06_scale_proof` (1.85-tile player + tile grid), `07_pulley_closeup`;
  cardinal sets `turnaround_{shell,raised,lowered}_{north,south,east,west}.png` with 2×2 sheets and written
  per-direction PASS/FAIL reviews; motion set `motion_1_idle` … `motion_5_settled` with `motion_sheet.png`
  and `motion_review.json`. New shared tool: `tools/make_strip_sheet.py`.
- Banked comparisons: `Bible_References/Complete/_compare/workyard_waterworks_u4_{dock,pulley}_v1_compare.png`

## Visual review (Gate D)

- Dock board: **9.1 / 10** — approved. L silhouette, plank variety, piles/braces/rails, open
  functional edges, and both shore contacts carried over; concept's terrain dressing is Codex work.
- Pulley board: **9.0 / 10** — approved. Frame, drum + wraps, crank, guide, hook + bail, recessed
  bucket, ledge all carried over; the ledge sits deliberately BESIDE the drop line (see corrections).
- Contact audits: **12/12 cardinal views PASS** (shell, raised, lowered) and **5/5 motion poses PASS**.
  Seven defects were found during my own audit and fixed before any PASS was recorded — most
  importantly: the original ledge sat in the bucket's drop line (hard clip on lowering), the bucket
  interior read as a closed lid, gappy cage-like staves, a crank-grip/crossbeam clearance sliver,
  and a deck-side motion camera that occluded the water contact.

## Animation contract (baked into GLB clips + root extras + JS contract, all identical)

| Clip | Duration | Events |
|---|---|---|
| `Pulley_Idle` | 3.0 s loop | restrained bucket pendulum sway only |
| `Pulley_Lower` | 2.0 s | water contact at normalized **0.8542** (bucket base meets local z −0.50), fully dipped at end |
| `Pulley_Lift` | 2.3333 s | transaction commit at normalized **0.9286** (bucket lands at rest), micro-settle to end |

Root extras: `pulleyIdleClip/Seconds`, `pulleyLowerClip/Seconds`, `pulleyWaterContactNormalized`,
`pulleyLiftClip/Seconds`, `pulleyCommitNormalized`, `waterContactSocket`, `operatorSocket`,
`waterPlaneLocalZ` (−0.5). Rope length, bucket height, and crank angle are mathematically linked
(linear keys at identical frames), so the hook can never detach in any interpolated pose.

## Transaction / state machine (U4.05/U4.06 groundwork)

`src/waterworks_u4_contract.js` — pure data + pure functions, absent from `index.html`.
States `idle → lowering → water_contact → lifting → settling`; `bucket` → `bucket_water`;
commit fires exactly once on `LIFT_COMPLETE`, only if the inventory can accept; `INTERRUPT`
in any pre-commit state changes nothing; applied-operation IDs (capped ledger of 32) make
save/reload replays reward-safe. Verified by 21 deterministic assertions
(`node tools/test_waterworks_u4_contract.js`).

## Pipeline measurements (all gates PASS)

- **5,204 triangles** (budget 12,000) · **47 primitives** (64) · **12 materials** (18) ·
  **2,952 vertices** · **412,048 bytes** (1,400,000)
- 8 visible meshes after consolidation; dimensions **6.67 × 6.79 × 3.60 tiles** (piles-bottom to jib-top)
- Scale locks: deck width 2.0, clear lane 1.8, deck-over-water 0.5, frame 2.17, crank grip 1.52,
  bucket 0.5 — all against the 1.85-tile player
- Factory `[FACTORY] PASS` with the v3 cardinal-turnaround contract; contract test PASS 21/21

## Recommended placement (Workyard-local frame of the live builder)

Place the family root exactly on the socket: **position (9.92, 1.85, 0.20), yaw 0** (exported
front already faces game-south; the dock then runs game-east and turns south, matching the
ledger's "leaves the shore, turns right"). The assumed water plane lands at world z −0.30
relative to the court surface — verify against the live pond before accepting, and slide the
whole root only (never individual spans).

Suggested collision (walkable deck rects, Workyard-local):

| Region | X range | Y range |
|---|---|---|
| shore span deck | 9.92 … 13.82 | 0.85 … 2.85 |
| turn platform | 13.82 … 16.02 | 0.75 … 2.95 |
| bank span deck | 13.97 … 16.02 | −2.70 … 0.75 |
| pulley frame blocker | 14.60 … 15.25 | 2.72 … 2.95 |

Clear cardinal lane (keep unblocked): east-west along y ≈ 1.85 from x 9.92 → 16.02, then
north-south along x ≈ 14.97 from y 2.85 → −2.70. Rails, ropes, ledge, bucket travel path,
piles, and all sockets must add no collision. Key anchors (Workyard-local): operator tile
(14.97, 2.20), water contact (14.92, 3.31, −0.30), fishing edge (15.97, −0.75), bank exit
(14.97, −2.70).

## Exact integration instructions for Codex

1. Load the GLB through chunk/building data at the transform above; keep the semantic roots
   addressable (crank/rope/bucket are the animated nodes; spans are static).
2. Drive `Pulley_Lower` → (splash at 0.8542 — U4.04) → `Pulley_Lift`, and advance
   `src/waterworks_u4_contract.js` off the same clip events; commit the swap at 0.9286 via
   `u4Advance(save, "LIFT_COMPLETE", inventory)`. Persist `save.appliedOps` + `save.active`.
3. Wire Operate/Inspect per U4.07 from `pulley_operator_socket`; play `Pulley_Idle` as ambient.
4. Fit the shore/bank contacts to live terrain (the bank end expects the adjacent bank the
   ledger describes); then run content validation, the foreground `?smoke=1` gate, and bank the
   in-game acceptance packet.
5. After integration, bump catalog `status` to `integrated` and append in-game proofs to the
   recipe's `integration.requiredProof`.

## Codex integration closeout — 2026-07-15

- Installed as a composed Workyard dependency at local `(9.92, 0.20, -1.85)`, yaw 0. The
  terminal span is accepted as the U5 fishing platform in the present pond terrain rather than
  being misdescribed as a completed far-bank crossing.
- Raised the Workyard pond to a freshwater surface at world Y `0.46`, with the deck exactly
  `0.50` tile above it. Three overlapping walk surfaces provide a continuous four-direction L.
- Installed all three Blender clips, cozy pulley/splash/settle sounds, the water-contact ripple,
  atomic `bucket` to `bucket_water` transaction, interruption behavior, and the capped operation-ID
  save ledger. A manual Save now + reload retained both the filled bucket and one applied operation.
- The visible crank owns Operate and has a forgiving invisible raycast proxy. Right-click Inspect
  remains available; the proxy is functional only and adds no visible primitive.
- Preserved original GLTF node names inside the animated dependency. This is mandatory because
  Three.js animation tracks bind by node name; semantic identity lives in `userData.partId`.
  The smoke gate now proves that every clip track still resolves to a live named node.
- r160 Studio production-only reading: `22,192` triangles and `158` draws, within the composed
  Workyard budget of `42,000` triangles / `170` draws. Debug grid, collision, room bounds, and
  player-scale overlays add 30 Studio-only draws and are excluded from the production reading.
- Foreground r128 acceptance: `SMOKE PASS`, `97/97` structural assertions, `60fps`, `126` draw
  calls, zero console errors, exact save/load position, and a complete live pulley interaction.

Production lessons: durable transaction items must exist in the core item catalog before save
sanitization runs; animated GLB nodes must not be renamed after clip load; interaction pivots and
visible geometry must coincide or receive a deliberate invisible hit proxy; streaming acceptance
must compare the resident object ledger without assuming every possible template is loaded in the
current ring.

## Remaining concerns

1. **Resolved by U5:** the far span is now an unmistakable Small-net fishing platform with a separate
   animated fish/ripple/creel family. It does not imply a land connection.
2. The freshwater plane fit is accepted at world Y `0.46`; any future terrain revision must retain
   the locked `0.50`-tile deck clearance or rebuild the authored water-contact timing.
3. The concept's rope coil on the drum is richer than our three clean wraps — cosmetic only.
4. Idle sway animates the bucket only; if Codex wants the fall rope to sway with it, that is a
   deliberate later polish (kept still to guarantee zero clip risk).
