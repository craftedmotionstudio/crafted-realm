# Crafted Realm — Blender asset re-audit

Status: active  
Owner decision: 2026-07-14

## Decision

No asset is release-ready merely because Blender created, saved, rendered, or exported it. The recent building
pipeline proved useful technical behavior, but its scripted composition of boxes, cylinders, cones, and beams did
not meet the owner's visual expectation for fully designed low-poly art.

Nothing is being deleted during the re-audit. Proven collisions, interactions, room footprints, doors, roof-off
behavior, pathing, streaming, and tutorial flow remain the functional shell. Visual meshes are replaced only after
a stronger candidate passes the governing art pipeline.

## Repository inventory

Snapshot on 2026-07-14:

- 8 editable `.blend` sources in `assets/blender/`;
- 7 exported building/cellar GLBs in `assets/models/buildings/`;
- 97 root GLBs in `assets/models/`, plus 104 GLBs recursively;
- 5 current building manifests;
- 9 Blender builder/library scripts plus shape-study and metadata utilities.

## Blender-source classification

| Editable source | Previous role | Re-audit status | Reason / next action |
|---|---|---|---|
| `cr_furnishings_v1_catalog.blend` | Shared furnishing catalog | **Graybox component library** | Predominantly scripted primitive assemblies. Retain semantic IDs; replace visible meshes family by family. |
| `guide_hall_art_anchor.blend` | Small visual-direction anchor | **Reference only** | Useful palette/massing evidence, but not proof of the fully-designed topology/material gate. |
| `holm_guide_hall_v3.blend` | Historical Guide Hall | **Rejected archive** | Owner-rejected geometry/composition evidence. |
| `holm_guide_hall_v4.blend` | Historical Guide Hall | **Rejected archive** | Owner-rejected geometry/composition evidence. |
| `holm_guide_hall_v5.blend` | Historical Guide Hall | **Rejected archive** | Owner-rejected geometry/composition evidence. |
| `holm_guide_hall_v6.blend` | Live Guide Hall | **Functional graybox** | Preserve footprint, doors, rooms, roof behavior, and interactions; rebuild visible architecture. |
| `holm_survival_workyard_v1.blend` | Historical/live Workyard source | **Functional graybox/archive** | Preserve the proven service layout and cardinal through-route; do not treat the mesh as release art. |
| `holm_survival_workyard_v2.blend` | Live Workyard + cellar source | **Functional graybox** | Preserve flow, hatch/ladder, cellar plane, and interactions; rebuild architecture, furnishings, and lanterns. |

All seven GLBs under `assets/models/buildings/` inherit the status of their source above. None is currently
release-ready visual art.

## Legacy runtime-model classification

Every root GLB is quarantined from release promotion until it receives provenance, source, wireframe, material,
game-camera, and performance evidence. This does not disable models needed to keep the development build playable.

| Family | Files / examples | Re-audit status |
|---|---|---|
| Humanoid/player | `player.glb`, `base_*`, `v03.glb`–`v20.glb` and raw variants | **Legacy candidate**; player receives its own canonical-body/gear gate. NPC review remains after environment stability. |
| Monsters | `mosswolf.glb`, `giant_mole.glb`, `ash_wyrm*` | **Legacy candidate**; require rig-family, animation, silhouette, and combat-camera review. |
| Trees/landscape | `tree_oak.glb`, `tree_young.glb`, `tree_evergreen.glb`, `tree_evil.glb`, regional tree variants | **Legacy candidate**; review as a coherent regional vegetation family, not isolated models. |
| Crops/resources | `cabbage.glb`, `potato.glb`, `onion.glb`, `carrot.glb`, `wheat.glb` and raw sources | **Legacy candidate**; require slot/world readability and family consistency. |
| Props | `barrel*`, `bucket*`, `crate*`, `sack*`, `stall.glb`, `fountain.glb` | **Legacy candidate**; fully designed prop proof required before world-wide replacement. |
| Tutorial furnishings | `tut_arcanedesk.glb`, `tut_banquettable.glb`, `tut_bookshelf.glb`, `tut_fireplace.glb`, `tut_maptable.glb`, `tut_oven.glb`, `tut_preptable.glb`, `tut_questboard.glb` | **Legacy candidate**; re-review against the new furnishing family before reuse. |
| Raw/backups/experiments | `*_raw.glb`, `*.bak.glb`, `*_backup.glb`, `*_sf3d.glb`, `*_pixal3d.glb`, `proc_char.glb` | **Source/archive only**; never enter a runtime manifest by filename accident. |

## Fully-designed acceptance gate

A replacement candidate must provide all of the following before it can enter the live game:

1. Asset brief: gameplay purpose, dimensions, placement count, reference features, and performance budget.
2. Editable Blender source with semantic collections, correct pivots/scale, and asset-specific mesh construction.
3. Custom silhouette/topology: starter primitives may be edited, but recognizable raw primitive stacking cannot be
   the final form.
4. Purposeful construction: fitted joints, thickness, openings, supports, contact points, believable wear, and no
   accidental gaps/intersections.
5. Authored surface treatment: deliberate face ramps, vertex colors, or restrained painted textures with material
   changes tied to form and use.
6. Five-view proof sheet: shaded beauty, clay/silhouette, wireframe, material-ID, and actual gameplay camera.
7. Structured visual review of at least 9.0 covering the governing seven categories.
8. Technical validation, real interaction/traversal, and the foreground smoke/performance gate.

## Rebuild order

1. **Proof object — cellar lantern.** Small enough to iterate quickly; complex enough to prove custom silhouette,
   metal/glass/fire materials, modeled joins, and animation. The existing lantern remains a rejected baseline.
2. **Furnishing micro-family.** Table, storage cabinet, stool, rug, fireplace, and hatch/ladder set. Approve shared
   material and scale language without cloning whole compositions.
3. **Workyard room kit.** Rebuild walls, openings, roof transitions, doors, cellar threshold, and furnishings while
   preserving its proven functional shell.
4. **Guide Hall architecture.** Rebuild the visual shell and interior around the accepted footprint/services, then
   re-run the full door, roof-off, interaction, traversal, and smoke gates.
5. **Landscape family.** Ground edges, paths, rocks, vegetation, drainage, fences, and landmark composition for the
   Tutor's Holm/Hollow Well benchmarks.
6. Only after owner approval of these anchors: scale production to the remaining runtime prop, player/gear,
   character, and creature families in the order set by the governing roadmap.

## First proof-object review packet

The cellar lantern replacement is not accepted from a beauty render alone. Its packet must visibly demonstrate:

- a coherent custom cage/body silhouette rather than stacked rings and boxes;
- tapered or forged members with believable attachment points;
- a designed oil reservoir, vent, access door/hinge, handle, glass seating, and ceiling mount;
- restrained asymmetric wear and warm/cool material separation;
- animated flame and light that preserve the modeled fixture;
- readability at the cellar gameplay camera without blocking movement;
- wireframe evidence that the final form is not untouched default primitives.

### Cellar lantern v2 — provisional review (2026-07-14)

Artifacts: `assets/blender/cellar_lantern_v2.blend`, `assets/models/props/cellar_lantern_v2.glb`, and
`scratchpad/cellar_lantern_v2/cellar_lantern_v2_proof_sheet.png`.

Technical result: PASS at 2,464 triangles, 12 glTF render primitives, 12 materials, and 141,288 bytes. The
editable source contains custom turned profiles, forged-path meshes, faceted fitted glass, modeled access-door
hardware, controlled face-material variation, and the `FlameFlicker` action. The builder uses no Blender primitive
operators, and static fixture geometry is consolidated for browser rendering.

Direct Codex visual review: **8.9/10 provisional; not integrated**.

- **Silhouette/proportion:** 9.1 — the reservoir, glass chamber, weather cap, handle, links, and ceiling rose read
  as one designed fixture; scale was corrected against a 1.8-unit mannequin.
- **Shape hierarchy:** 9.2 — large reservoir/chamber/cap masses lead, while hinges, latch, vents, and forged
  supports remain secondary.
- **Color/material separation:** 9.0 — blackened iron, aged brass, amber glass, soot, and flame layers are distinct
  without high-frequency texture noise.
- **Reference-defining features:** 9.1 — fitted glass seating, working-door language, hinge barrels, latch, vent
  slots, oil reservoir, carry handle, chain, and ceiling mount explain how the object is built and used.
- **Gameplay-camera readability:** 8.9 — glow and major silhouette survive the elevated mock gameplay camera;
  the smallest hardware correctly falls away.
- **Animation/interaction readability:** 8.4 pending — the authored/exported flame action is structurally present,
  but its motion and light response still require real cellar playback before final acceptance.
- **Family consistency:** 8.9 provisional — it establishes a promising iron/brass/amber cellar-light family, but
  a second fixture variant is needed to prove reproducibility.

Remaining review risks: the handle/chain/ceiling-mount cluster is slightly busy at distance, and flame visibility
through the amber panels must be judged in the real cellar. Owner approval of the overall design direction comes
before live replacement.

### Survival Workyard cellar v2 - integrated visual review (2026-07-14)

Artifacts: `assets/blender/holm_survival_workyard_cellar_v2.blend`,
`assets/models/buildings/holm_survival_workyard_cellar_v2.glb`, and the five-view packet under
`scratchpad/workyard_cellar_v2/`. Live evidence is `scratchpad/workyard_cellar_v2/06_live_game_glow.png`.

Technical result: PASS at 10,242 triangles, 71 glTF render primitives, 29 materials, and 592,312 bytes. Revision 4
uses custom mesh profiles and paths instead of Blender primitive operators. It models the irregular stone shell,
tightly laid flagstones over lime mortar, wall-leaning hatch ladder, flush reserve shelving, lidded crocks, tied
grain sacks, handled baskets, stave barrels, woven rug, provision table, root basket, cutting board and knife,
arched iron-strapped reserve chest, two forged wall torches, and a masonry hearth. Runtime supplies only animated
flame movement, restrained glow spill, and point-light response at the authored flame sockets.

Direct Codex visual review: **9.0/10 integration candidate; owner verdict pending**.

- **Silhouette/proportion:** 9.1 - the room is broad enough for play, the fixture scale is subordinate to the
  player, and the cutaway wall protects the elevated camera view.
- **Shape hierarchy:** 9.0 - masonry shell and long rug establish the room; shelving, provision table, stores, ladder, and
  chest form readable secondary stations rather than scattered clutter.
- **Color/material separation:** 9.0 - warm timber, red/blue/gold textile, cool stone, pale provisions, and amber
  light separate cleanly in the dark interior.
- **Reference-defining features:** 9.1 - stone coursing, visible mortar, shelf bracing, barrel staves and hoops,
  rug fringe, ladder anchors, chest arch/ironwork, forged torch brackets, and the soot-darkened hearth explain
  construction and purpose.
- **Gameplay-camera readability:** 8.9 - the full room, central aisle, stores, and exit remain readable; a future
  lighting-family pass can lift the darkest far-left shelf without flattening the cellar mood.
- **Animation/interaction readability:** 9.0 - two wall-torch flames and the hearth fire visibly flicker with
  independent light response; live testing confirms cardinal cellar movement, climb-down, the reserve chest
  panel/reward state, and registered room-side selection volumes for the hearth and return ladder.
- **Family consistency:** 9.0 - the cellar establishes a coherent forged-iron/oak/fire lighting family and a
  restrained timber/stone/storage furnishing language suitable for other medieval service interiors.

The previous oversized lantern placement, grass-filled hatch impression, gapped uneven floor, projecting shelf
boards, rolled-color placeholders, and ambiguous tabletop shapes are rejected. The reserve ledger now uses a
portrait rendered from the same Blender chest source. Final live gate: PASS 80/80 at 60 FPS, 18 ms worst frame,
132 draw calls, exact save/load restoration, and zero console errors. This candidate is not promoted beyond the
Workyard until the owner reviews the in-game result.
