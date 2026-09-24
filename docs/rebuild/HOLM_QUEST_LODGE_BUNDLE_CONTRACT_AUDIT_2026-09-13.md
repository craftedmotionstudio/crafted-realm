# Quest Lodge rebuilt bundle contract audit — 2026-09-13

Read-only audit of current source and measured candidates. Base checks passed for the terrain navigation JSON and island walking HTML. No runtime files, placements, bundles or saves were edited; no publish was attempted. This is an integration specification, not gameplay or visual acceptance.

## Current installed identities and coupling

| Surface | Current authoritative source | Contract to preserve |
|---|---|---|
| Provider | `src/world_v2_holm.js:167` | `tutors-holm-v2`, worldRevision 4; catalog uses `HolmLandscape.envelope` |
| Bounds | `src/holm_landscape_data.js:12` | x 102..214, z 93..189 (upper bounds exclusive) |
| Lodge | `src/world_v2_building_data.js:373`; `src/world_v2_holm.js:83` | Definition `holm_quest_lodge_v1`, asset/object `holm_quest_lodge`, pad `quest_lodge`; current placement 136,136, yaw 0, yOffset -0.12 |
| Loader | `src/world_v2_buildings.js:33` | Installed older `assets/models/buildings/holm_quest_lodge_v2.glb`, not the overhaul candidate sharing a version-like name |
| Services | `src/world_v2_building_data.js:405` | `quest_board` / `holm_quest_board`; `region_map` / `holm_region_map`; clue `story_ledger` / `holm_story_ledger` |
| Interaction rows | `src/world_v2_bundle_authoring.js:22` | `{id:objectId+'.'+meta.id,objectId,partId,kind,...interactionMetadata}`; service `interactionTile` is NOT serialized into this row |
| Runtime targets | `src/world_v2_objects.js:197` | Finds semantic part, rejects missing or duplicate part, adds real target to WORLD.clickables, copies kind/label/examine/inspection metadata and world ownership |
| Service reach | `src/holm_quest_lodge_interactions.js:83` | Hardcoded old local board (0.6,-2.6), map (-2.4,-2.4), ledger (-1.9,2.7); must be replaced from a shared verified stance source |
| Floor guard | `src/holm_station_reach.js:7` | Explicit tile Y transforms through building root; absent Y falls back to terrain on plane 0. Rechecks root identity, plane and arrival elevation before calling service |
| Tutorial | `src/holm_quest_lodge_interactions.js:32`; `src/holm_tutorial_flow_data.js:65` | Successful journal activation emits `orient/quests`; wrapper calls original notify first then optional `learn_quests` and save(true). Current curriculum still optional; full 18-lesson restoration is separate |
| Save | `src/ui_save.js:24`, `:103`, `:129` | Preserves Player.quests, tracked quest, Tutorial.optional, stable lessonId/version, combat kit claims, provider/revision/landmark, XZ and plane. Generic save has no lodge floor/node record; `arrivalSurface` is specific to arrival QA |

The direct “Open journal” secondary interaction opens the UI without credit or station guard (`holm_quest_lodge_interactions.js:87`); this is current behavior, not evidence of having studied the physical board. Board primary action calls the guarded service. Persistence returns are not a transactional completion guarantee: its wrapper catches thrown save errors but does not roll back optional credit on false.

## Measured overhaul facts

Authoritative files: `.studio-workspaces/holm-quest-placement-v1/candidates/placement.json`, `.studio-workspaces/holm-quest-terrain-navigation-v1/candidates/navigation.json`, candidate `door.json`, and `.studio-workspaces/holm-quest-lodge-v3/candidates/lodge.glb`.

- Model SHA256 `a8d57474e1a5cd6f8e13214e57905cf3bacecdf8e1fcc14c5b0ea1393248b324`.
- Terrain SHA256 `655e69f88d24b389ccf6b7c90e61d60d1d9b4ccde32030b0a45754285feb1d98`.
- Origin `{x:35,y:5.02,z:51}`, yaw 0 is **proposal grid**, not installed runtime coordinates. Terrain Studio subtracts (72,0,64). Neither that subtraction nor the difference from current lodge placement establishes a migration transform.
- Navigation schema remains `holm-keep-navigation-v1`. At audit: 494 nodes, 871 undirected edges, six reachable destinations. This proves only sampled candidate geometry; no generic player integration, saving, or animated vegetation sweep.
- Measured local stances: board node `-4:2:1` at (-3.5,0,2.5); map `2:1:0` at (2.5,0,1.5); reading bay `4:-2:0` at (4.5,0,-1.5); guest `-4:0:0` at (-3.5,3.3,0.5); entrance `0:1:0` at (0.5,0,1.5). Node IDs' final component must not be assumed to mean Player.plane.

## Minimum new pure-data semantic contract

A new candidate binding document should pin actual model, navigation, terrain and door hashes; declare the proposal coordinate frame; retain stable service identity; and map each service to exact exported node names plus a measured nav node ID and explicit XYZ stance. An identity-transform semantic group can own all material-split geometry for one service without changing geometry transforms.

| Stable part | Exact existing exported mesh names | Stance / disposition |
|---|---|---|
| `quest_board` | `Lodge_FurnishingBoard_Warm_oak`, `Lodge_FurnishingBoard_Original_parchment`, `Lodge_FurnishingBoard_Faded_map_ink`, `Lodge_FurnishingBoard_Burgundy_wax` | board target above |
| `region_map` | `Lodge_FurnishingMap_Warm_oak`, `Lodge_FurnishingMap_Original_parchment`, `Lodge_FurnishingMap_Faded_map_ink`, `Lodge_FurnishingMap_Burgundy_wax` | map target above |
| `story_ledger` | **Unresolved** | Bay contains `Lodge_FurnishingBay_Original_parchment`, but its name/geometry alone does not establish a modeled Ledger of Choices. Do not silently relabel it or infer a clue stance |
| `lodge_door` | `Lodge_DoorPivot` plus its actual animated descendants | Needs deliberate adapter to measured door controller; not direct current rotation contract |
| `road_door` | **Absent** | Old two-door flow is obsolete; remove from revised flow contract only when exterior route and guidance are integrated |
| `roof` | `Lodge_Roof_Muted_wheat_thatch`, `Lodge_Roof_Warm_oak`, `Lodge_Roof_Blue_gray_slate` | Needs floor-aware upper shell/chimney/cutaway policy; grouping only roofs is insufficient proof |

The document should fail closed when a named mesh is absent or multiply claimed, a hash differs, a stance/node is absent/unreachable, or explicit stance support differs from measured navigation. Geometry bounds should be measured from the GLB, never typed from memory. Keep unresolved services explicit rather than providing guessed boxes. Standard runtime targets may be groups containing actual meshes; `findPart` accepts `userData.partId`, exact name or `building-part-<id>` (`world_v2_buildings.js:529`). Protect semantic groups from consolidation (`world_v2_consolidate.js:57,77`).

## Specific integration blockers

1. Proposed placement is outside the installed provider catalog. `world_v2_holm.js:143` rejects objects without an owner chunk. Requires the actual overhaul terrain/provider catalog and save migration; no ad-hoc translation justified.
2. Old definition has single-floor rectangular colliders, obsolete turret/porch shape, two doors and old service coordinates. Swapping GLB URL cannot repair these.
3. `world_v2_objects.js:215` can register `def.walkSurfaces`, but no evidence maps this sampled, vertically overlapping graph into that API and the real movement/saving path. Generic save only records XZ/plane: an upstairs reload is unproven.
4. Runtime `world_v2_objects.js:220–239` resets each door rotation and creates its own closed rectangular collider. Candidate Blender animation/cylinder-safe controller must be integrated intentionally, preserving movement gating and chunk disposal.
5. Required old semantic parts are absent in candidate nomenclature. Loader completeness validation (`world_v2_buildings.js:216`) and attachment checks will fail without binding/definition replacement.
6. Quest guide socket is still nonbundled future data (`world_v2_building_data.js:429`); no modeled guide service in this candidate. Board credit does not satisfy guide or full island requirements.
7. Tutorial flow entry/service/exit (`holm_tutorial_flow_data.js:27`) and lesson target remain old global coordinates. Guidance must consume revised provider coordinates and floor-aware service data.
8. Current candidate quality is not proven >=9 here. This audit does no visual scoring and authorizes no live installation.

## Safe Publish seam and checks

`tools/studio_workspace_cli.js:7–15` exposes init/stage/status/export/plan/apply/recover/rollback. `tools/studio_workspace.js:153–164` requires registered source+compiled building bundle, matching provider metadata and exact placement rows. District pairs additionally validate referenced building pairs and placement (`:167–180`). Packed/live hashes are checked in plan (`:235`); inspection of an all-green plan is mandatory before any apply. No audit action invoked these mutations.

Current lodge runtime is generated from `WorldV2BuildingData` and `WorldV2BuildingBundle.interactionRows` inside `world_v2_holm.js:59,83,122`; this is not evidence that dropping a new bundle JSON into authoring will be consumed. An explicit provider consumption seam is required alongside the registered source/bundle transaction. The generic bundle compiler (`world_v2_bundle_authoring.js:38–58`) emits chunk terrain defaults for the old Holm landscape; compile options need the actual new terrain identity.

Next bounded implementation: create the hashed board/map semantic binding package and a deterministic validator proving actual GLB membership, unique grouping and measured target stances. Main can render those groups in the existing study and use real pointer selection to confirm service targeting. Keep ledger unresolved pending authored evidence; then integrate the shared stance contract into a scoped gameplay provider adapter, with explicit floor/save and door contracts. Only after that should a full source/bundle publish plan be considered.
