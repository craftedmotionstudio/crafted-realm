# Workyard Exterior U3 — isolated asset family handoff (Claude → Codex)

Date: 2026-07-15 (acceptance-closeout revision, same day). Status: **integrated and accepted in
both the r160 Studio and live r128 game.** Closeout pass corrections: the sawbuck's kerf is now a thin dark
slit following the log's top cross-section (was a ring), the stump is one continuous lofted
hand-hewn trunk (was three visibly terraced rings), the rim scar lies flush on the endgrain
(was a proud floating block), and the recipe is upgraded to **Asset Factory schemaVersion 3**
with full cardinal installed-contact turnaround evidence (12/12 per-object directions PASS).
Ledger targets: U3.02 (sawn-log rack), U3.03 (chopping block), U3.04 (embedded axe),
U3.05 (pen decision honored — no pen was built), plus one purposeful extra fixture (sawbuck).
Prerequisites verified before work: Workyard revision 10 (`build_survival_workyard_v2.py`,
`root["revision"] = 10`) and the complete `workyard_upstairs_furnishings_v1` family.

## What was created

One prop family, `workyard_exterior_u3_v1`, with four sibling semantic roots plus two
nested load roots:

| GLB node | Content |
|---|---|
| `workyard_exterior_u3_v1` | family root (extras: assetId, pipelineVersion 1, assetClass `prop-family`, unitsPerTile 1) |
| `timber_log_rack` | leaning pegged end frames, crossed braces, foot stones, side rails, ground sleepers |
| `log_stack` (child of rack) | 8 individually tapered/tilted logs, pale proud endgrain, mixed bark tones, branch stub, one short log leaving an honest gap |
| `rope_restraints` (child of rack) | two hemp wraps over the load, cinched outside the side rails, knots + dangling tied-off ends |
| `chopping_block` | weathered stump: ONE continuous lofted hand-hewn trunk, root-flare wedges, bark striation, pale scarred top, 4 cut marks + flush rim scar, split chips |
| `embedded_axe` | complete felling axe: forged head, pale bit edge, split bruise + hairline crack at the bite, curved two-segment haft, swollen knob |
| `sawbuck` | pegged X-frames, low stringers, half-sawn log with a thin dark kerf slit following its top cross-section, sawdust pile beneath |

Each semantic root owns exactly one consolidated runtime mesh (`*RuntimeMesh`), so the
family renders in 6 draw units / 27 primitives.

## Files

- Editable Blender source: `assets/blender/props/workyard_exterior_u3_v1.blend`
- Game-ready GLB: `assets/models/props/workyard_exterior_u3_v1.glb`
- Family module (geometry authoring): `tools/blender/cr_workyard_exterior_u3_v1.py`
- Builder (renders/report/export): `tools/blender/build_workyard_exterior_u3_v1.py`
- Recipe / manifest / catalog: `assets/recipes/workyard_exterior_u3_v1.json`,
  `assets/manifests/workyard_exterior_u3_v1.json`, `assets/catalogs/workyard_exterior_u3_v1.json`
- Concepts (+ prompts): `docs/rebuild/concepts/workyard_exterior_u3_timber_rack_nanobanana2_v1.png|.prompt.md`,
  `docs/rebuild/concepts/workyard_exterior_u3_chopping_station_nanobanana2_v1.png|.prompt.md`
- Proof renders: `scratchpad/workyard_exterior_u3_v1/01_front.png`, `02_rear.png`, `03_side.png`,
  `04_three_quarter.png`, `05_gameplay_camera.png`, `06_timber_rack_family.png`, `07_chopping_station.png`
  (canonical 1.85-tile player + one-tile grid appear in every view)
- Cardinal installed-contact turnaround (schemaVersion 3 evidence, all in
  `scratchpad/workyard_exterior_u3_v1/`): 12 per-object renders `turnaround_{rack,block_axe,sawbuck}_{north,south,east,west}.png`
  plus 4 family renders `turnaround_family_*.png`; 2x2 sheets `turnaround_sheet_{rack,block_axe,sawbuck,family}.png`;
  written per-direction PASS/FAIL reviews `turnaround_review_{rack,block_axe,sawbuck,family}.json`.
  Identical lighting rig and ortho lens at gameplay pitch (~43°); framing scale is identical across
  all four directions of each object (4.9 / 3.4 / 3.2 / 10.8). Sheet composer: `tools/make_turnaround_sheet.py` (new).
- Banked comparison sheets: `Bible_References/Complete/_compare/workyard_exterior_u3_timber_rack_v1_compare.png`,
  `Bible_References/Complete/_compare/workyard_exterior_u3_chopping_station_v1_compare.png`
- Reports: `scratchpad/workyard_exterior_u3_v1/asset_report.json`, `pipeline_result.json`,
  `factory_result.json`, `asset_factory_brief.md`

## Visual review (Gate D, direct structured review — closeout scores)

- Timber rack board: **9.1 / 10** — approved (unchanged; re-verified by the 4/4 cardinal audit).
- Chopping station board: **9.2 / 10** — approved. Both previously banked next-pass targets are
  resolved: the stump is one continuous lofted trunk and the saw cut is the concept's top slit.
  Remaining deviations: the axe stands slightly more upright than the concept; chips are sparser.
- Cardinal contact audit: **12/12 directions PASS** (plus 4/4 family views). Two defects were
  found during the audit and fixed before any PASS was recorded: the first slit implementation
  poked square corners through the log flanks (east/west views), and the rim notch floated proud
  of the rim (south view). Both re-rendered clean.

Five build iterations total across both passes (pass 1 failed my own review: stone-grey stump,
trestle-read sawbuck, oversized split mark, washed palette); nothing was marked PASS with a
visible defect.

## Pipeline measurements (all gates PASS, including the schemaVersion 3 factory gate)

- 2,888 triangles (budget 9,000) · 27 primitives (48) · 13 materials (18) · 216,016 bytes (800,000)
- 6 visible meshes, 1,668 vertices; dimensions 8.02 × 2.08 × 1.735 tiles (isolated proof layout)
- Scale contract locked: rack frames 1.58, stack top 1.31, block 0.645, axe length 1.05,
  embedded axe top 1.67, sawbuck 1.08 — all under the 1.85-tile player
- Flat shading on every polygon; no animations (nothing here moves in reality)

## Recommended placement (Workyard-local frame of `build_survival_workyard_v2.py`)

Court surface top is z = 0.20; every root below sits ON that surface (authored ground contact
is at each root's z = 0). All rotations are Z-radians. Collision rects are axis-aligned after
rotation ≈ 0 placements; keep rotations small or port ref_bank's turned-rect fix.

| Node | Position (x, y, z) | Rot Z | Collision (solid) | Notes |
|---|---|---|---|---|
| `timber_log_rack` (+ children) | (2.25, -4.70, 0.20) | 0 | x 0.65..3.85, y -5.45..-3.95 | replaces v2 `SawnLogRack`; logs run E-W against the south court edge |
| `chopping_block` | (0.80, -2.25, 0.20) | 0.35 | circle r 0.70 (or its 1 tile) | replaces v2 `ChoppingBlock`/`ChoppingBlockTop` |
| `embedded_axe` | block pos + (-0.06, +0.10, +0.645) | block rot − 0.97 | none (inside block tile) | replaces v2 `BlockAxeHandle`/`BlockAxeHead`; these exact deltas reproduce the proven proof look |
| `sawbuck` | (4.60, -4.55, 0.20) | 0.28 | x 3.65..5.55, y -5.35..-3.75 | new fixture; sits on the south working edge, east of the rack |

- Ropes, chips, sawdust, and log overhangs must NOT create invisible collision.
- **U3.05:** remove the `chicken_pen` visual at (7.50, -4.00); keep a data socket reserved.
- **U3.06:** these placements keep the pond-door → future-dock cardinal lane (north half of the
  court) completely clear; verify with the room's four-direction sweep.

## Interaction anchors

- `embedded_axe` + `chopping_block`: the splitting lesson target. Suggested walk-to tile: one
  tile west of the block; left-click `Split logs` (lesson), right-click `Inspect`.
- `timber_log_rack` / `log_stack`: right-click `Inspect` scenery until a gathering lesson
  claims it (then `log_stack` is the take-from node — it is a separate GLB node for this reason).
- `sawbuck`: right-click `Inspect` ("A half-sawn log. Someone's work was interrupted.").

## Unresolved concerns

1. ~~Kerf ring~~ — RESOLVED in the closeout pass (arc-profile top slit, audited from all four
   cardinals).
2. ~~Terraced stump~~ — RESOLVED in the closeout pass (single lofted continuous trunk, still
   deliberately faceted/hand-hewn).
3. ~~GLB had not been loaded in the live r128 game or r160 Studio.~~ **RESOLVED:** the same
   dependency-composed Workyard loads in both renderers; clean Studio display is 19,108 triangles
   and 142 draw calls with inspection helpers disabled.
4. ~~In-game acceptance evidence was absent.~~ **RESOLVED:** banked at
   `scratchpad/workyard_exterior_u3_v1/integration/`; the foreground `?smoke=1` run passes 92/92,
   60 FPS, 290 world draw calls, 63,578 triangles, and zero console errors.
5. Minor cosmetic notes only, none blocking: the axe stands slightly more upright than the
   concept, and the family-view turnaround letterboxes the ground slab (framing, not geometry).

## Exact integration instructions for Codex

1. Load `assets/models/props/workyard_exterior_u3_v1.glb` through the Workyard building data
   (chunk/asset catalog path — never a self-starting timer) and place the four semantic roots
   with the transforms above. The GLB's front is Three.js +Z.
2. In `build_survival_workyard_v2.py` / world data, retire the procedural `SawnLogRack`,
   `SawnLog`, `ChoppingBlock`, `ChoppingBlockTop`, `BlockAxeHandle`, `BlockAxeHead` visuals
   (asset-replacement rule: the modelled family replaces ALL procedural instances) and remove
   the `chicken_pen` visual while reserving its socket.
3. Wire collision + interactions per the tables above; keep existing lesson handlers on the
   block/axe socket. Deterministic scatter only — no random rolls near the fixed builds.
4. Re-run `node tools/validate_content.js` if any interaction/data rows change, then the
   foreground `?smoke=1` gate, and capture the in-game gameplay-camera screenshot for the
   room-acceptance packet (U6).
5. After integration, bump the catalog `status` from `review` to `integrated` and append the
   in-game proof paths to `assets/recipes/workyard_exterior_u3_v1.json` → `integration.requiredProof`.
