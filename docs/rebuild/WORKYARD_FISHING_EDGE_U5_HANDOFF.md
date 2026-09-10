# Survival Workyard U5 — fishing-edge integration handoff

Status: **integrated and browser-accepted on 2026-07-16**. U5 gives the terminal platform of the accepted U4 dock an unmistakable purpose without changing the dock or pulley family. It is the first complete use of the Small net in the rebuilt Tutor's Holm environment.

## Player-facing result

- The terminal dock edge contains a subtle fishable water patch, three silver-blue mirrorperch, sparse ripple/bubble motion, and an open woven creel with a real interior.
- Selecting the existing **Small net** and clicking the visible fishing water walks to a stable operator socket, plays the Blender-authored cast/bite/catch sequence, and awards exactly one **Raw mirrorperch** plus **28 Fishing XP**.
- Casting, bite, and catch use restrained synthesized rope/water/creel cues routed through the saved SFX volume.
- Leaving the operation radius interrupts without a reward. A full pack or missing Small net fails with useful game-message feedback.
- The exact-once operation ledger is capped at 32 IDs and is saved immediately with a successful catch. A normal Continue Adventure reload restored both caught fish during acceptance.

## Art packet

| Item | Location / result |
|---|---|
| Nano Banana concept | `docs/rebuild/concepts/workyard_fishing_edge_u5_nanobanana2_v1.png` |
| Editable Blender source | `assets/blender/props/workyard_fishing_edge_u5_v1.blend` |
| Runtime GLB | `assets/models/props/workyard_fishing_edge_u5_v1.glb` |
| Builder | `tools/blender/build_workyard_fishing_edge_u5_v1.py` |
| Recipe / catalog / manifest | `assets/recipes`, `assets/catalogs`, and `assets/manifests` rows with the same asset ID |
| Concept comparison | `Bible_References/Complete/_compare/workyard_fishing_edge_u5_v1_compare.png` — direct Codex score **9.0/10** |
| Blender four-angle proof | `scratchpad/workyard_fishing_edge_u5_v1/turnaround_sheet_installed.png` — **PASS 4/4** |
| Live r128 four-angle proof | `scratchpad/workyard_fishing_edge_u5_v1/live_turnaround_sheet.png` — **PASS 4/4** |
| Motion strip | `scratchpad/workyard_fishing_edge_u5_v1/motion_sheet.png` |

The export contains **1,338 triangles, 15 primitives, 11 materials, and 105,972 bytes**. The integrated factory passes all 31 current recipe locks. Human-scale locks pass: 1.35-tile clear lane, 3.10 × 2.05-tile water patch, 0.50-tile water setback from the deck, 0.49-tile creel, and 0.52-tile fish.

Semantic nodes are `workyard_fishing_edge_u5_v1`, `fishing_water_patch`, `fishing_ripple`, `fish_school`, `dock_creel`, `catch_fish`, `catch_presentation_socket`, `fishing_operator_socket`, `fish_reward_socket`, and `water_surface_socket`.

The three exported clips are:

- `FishingSpot_Idle` — 4.5 seconds;
- `FishingSpot_Bite` — 1.25 seconds, bite event at normalized 0.40;
- `FishingSpot_Catch` — 1.5 seconds, exact reward at normalized 0.5278.

## Runtime ownership

- Workyard revision: **17**.
- Composed dependency transform: Workyard-local **(15.97, 0.20, −0.75), yaw 0** at the accepted U4 `fishing_edge_socket`.
- `src/fishing_edge_u5_contract.js` is the pure deterministic state/reward contract.
- `src/fishing_edge_u5.js` owns binding, approach, animation playback, audio, interruption, reward, tutorial notification, and save/restore.
- `src/world_v2_buildings.js` composes the dependency, preserves GLTF track names, and gives only the fishing water an explicit inventory-item dispatch flag plus an invisible forgiving raycast proxy.
- `src/game4_ui.js` routes item-on-world clicks to a custom Interact hook only when the authored target explicitly declares `acceptsUseItem`. Existing resources, doors, and scenery retain their old behavior.
- `src/ui_save.js` serializes and restores the bounded fishing ledger.
- Test Travel bookmark: **Survival Workyard — fishing edge**, X **131.70**, Z **151.10**, plane **0**.

## Acceptance record

- U5 pure contract: **PASS 25/25**.
- U4 regression contract: **PASS 21/21**.
- World-v2 headless contract: **all locks pass**, including 25 purposeful Workyard interactions through U5.
- Content validation: **PASS**, 136 items / 30 NPC definitions / 10 shops / 10 quests / 14 zones.
- Asset pipeline: **PASS**; Asset Factory: **CHECK PASS 31 locks**.
- Foreground r128 smoke: **PASS 100/100**, boot **712 ms**, **60 FPS**, **19 ms** worst frame, **169 draw calls**, **32,976 live triangles**, exact stream/save position, and zero console errors.
- Hands-on interaction: Small net armed, authored interaction began, message/reward/XP appeared once, two successive catches produced two fish, and normal Continue Adventure reload restored both.
- Live four-angle review: no floating fixture, dock/patch collision, blocked cardinal lane, opaque creel void, or oversized interaction marker.

The r160 Studio loads the complete six-room Workyard and reports all 30 definition locks PASS. Its current total-scene HUD includes Studio floor and always-on semantic service markers; with optional grid/collision/room/player overlays disabled it reads 25,734 triangles / 210 total scene draws. The real gameplay r128 reading is the production performance authority and passes the 170-draw Workyard budget at 169. Separating Studio asset-only and helper draw totals is retained as a U6 tooling cleanup rather than weakening the live budget.

## Defects caught by the gates

1. The first export lacked `pipelineVersion` and `assetClass` root extras and used 11 intentional materials against a stale 10-material manifest. Source and budget were aligned and rebuilt.
2. The cardinal review used `directions` instead of the schema-3 `views` key. The builder now reproduces the correct fail-closed evidence format.
3. World/smoke totals still described U4. They now lock 36 Holm interactions and 25 Workyard interactions through U5.
4. A selected inventory item bypassed central custom interaction hooks. The live click showed the right label but did nothing. The explicit `acceptsUseItem` dispatcher boundary fixed it without broad click behavior changes.
5. A successful catch was initially durable only at the next manual/system save. U5 now silently saves immediately after banking the exact-once reward.

## Next boundary

Do not expand this spot into rods, bait, fish variety, or cooking content yet. The next Workyard slice is **U6 room acceptance**: a complete surface/upstairs interaction and collision sweep, roof-transition review, player-scale review, live performance confirmation from ordinary play cameras, and owner review. The basement remains frozen and accepted for now.
