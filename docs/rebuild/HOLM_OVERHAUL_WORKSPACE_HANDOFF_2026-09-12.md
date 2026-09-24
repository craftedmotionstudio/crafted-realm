# Holm overhaul workspace handoff — 2026-09-12

Source inspection only; no live edits, workspace initialization, publication, or browser actions were performed. Read GUIDING_LIGHT, AGENT_SPEC_TEMPLATE, and HOLM_OVERHAUL_GOAL_2026-09-12. The rejected island is preserved as history; existing pad coordinates are not the new design contract.

## What exists, and what does not

The transactional workspace machinery supports new target paths and multi-file publication. The existing terrain authoring interface does **not** support a new island heightfield, arbitrary creek, or edited topology. Its current Lesson Green package is a compiled description of the old JavaScript landscape, not an editable terrain source. Do not initialize a copy of that package and mistake it for an overhaul authoring tool.

Confirmed entry points:

- `tools/studio_workspace_cli.js`: `init`, `stage`, `status`, `export`, `plan`, `apply`, `recover`, `rollback`.
- `tools/studio_workspace.js`: isolated source snapshots and working trees; SHA-256 export/base checks; publish journals, backups, receipts and guarded rollback.
- `tools/build_lesson_green_district_bundle.js`: stages candidates in the hardcoded `lesson-green-district` workspace; compiles the current `HolmLandscape` via `WorldV2TerrainDistrict`.
- `tools/build_survival_wood_district_bundle.js`: the existing Survival Wood district/building package workflow.
- `tools/studio_terrain.html` / `tools/studio_terrain.js`: read-only published Lesson Green inspection. It fetches fixed published JSON paths and colors tiles using current `HolmLandscape.heightAt`. It has no brush, connected terrain workspace, terrain import, or arbitrary source selection.

## Existing schemas and authoritative sources

| Package | Source and constraints |
|---|---|
| Building authoring | `crafted-realm-world-v2-authoring-v1`, version 1, chunkSize 8. `placements` have `id`, `definitionId`, `definitionRevision`, `asset`, finite `x/z/rot/yOffset`; provider ID/revision required. `src/world_v2_authoring.js` checks definitions against `WorldV2BuildingData` and supports adding/moving/removing placements. |
| Building bundle | `crafted-realm-world-v2-building-bundle-v1`; source path, provider metadata, compiled chunk rows and building contracts. Source plus bundle must be registered together, and transforms/provider metadata must agree. See `src/world_v2_bundle_authoring.js` and workspace set validation. |
| Survival district | `crafted-realm-world-v2-district-authoring-v1` and `crafted-realm-world-v2-district-bundle-v1`. District source references one building source/bundle pair. All four must be registered together; placement/provider/district references are cross-checked. See `src/world_v2_district_bundle_authoring.js`. |
| Lesson Green terrain | `crafted-realm-world-v2-terrain-district-authoring-v1` / `crafted-realm-world-v2-terrain-district-bundle-v1`. `src/world_v2_terrain_district.js:24–35` requires exact canonical source equality: fixed Lesson Green source path, provider, district and pads. Changing any field to a new island source fails. |

Current checked-in documents are under `assets/world/authoring/`:

- `studio-building-preview.json` and `.bundle.json` (Guide Hall).
- `studio-survival-workyard.json` and `.bundle.json`.
- `studio-survival-wood-district.json` and `.bundle.json`.
- `studio-lesson-green-district.json` and `.bundle.json`.

The terrain bundle contains chunk metadata, roles, water tile flags, route/pad descriptions and navigation rows; it contains **no sampled heights**. `build()` reads heights from `HolmLandscape.heightAt` and writes `heightSource:'holm_landscape_v1'`. Its navigation walk-surface/collision arrays are currently empty. `tools/studio_terrain_validation.js` loads the old landscape/compiler itself and verifies exact recompilation. Both compiler and validator must evolve before a new terrain contract can be accepted.

`src/holm_landscape_data.js` remains the old shape/elevation/pond/inlet/pad/route authority. `src/world_v2_holm.js` imports its envelope, landmarks, routes and objects and selects the old provider. Publishing an unrelated new JSON alone does not change runtime terrain or activate a new provider.

## Safe isolated workflow for the overhaul

Recommended new workspace ID: `holm-overhaul-arrival-v1`. Recommended **new**, currently uninstalled target identities:

- `assets/world/authoring/holm-overhaul-arrival.terrain.json`
- `assets/world/authoring/holm-overhaul-arrival.terrain.bundle.json`
- `assets/world/authoring/holm-overhaul-arrival.buildings.json`
- `assets/world/authoring/holm-overhaul-arrival.buildings.bundle.json`

These are proposed names, not currently supported terrain documents. First implement and test the new terrain schema/compiler/validator and isolated preview consumption described below. Do not label the candidate with the old canonical terrain schema to bypass that work, and do not rely on unknown-schema JSON being accepted by the generic file copier.

The CLI can register nonexistent targets: `init` records `existed:false` and `baseHash:null`, without touching those live paths. Use one workspace with the complete terrain/building pair set so placement heights and crossings can be cross-validated together. Concept drafts may live under its ignored working tree until supported candidate files exist.

Once schema support and deterministic candidate compilation are implemented, use this exact command pattern from the repository root:

```powershell
node tools/studio_workspace_cli.js init holm-overhaul-arrival-v1 assets/world/authoring/holm-overhaul-arrival.terrain.json assets/world/authoring/holm-overhaul-arrival.terrain.bundle.json assets/world/authoring/holm-overhaul-arrival.buildings.json assets/world/authoring/holm-overhaul-arrival.buildings.bundle.json
node tools/studio_workspace_cli.js stage holm-overhaul-arrival-v1 assets/world/authoring/holm-overhaul-arrival.terrain.json .studio-workspaces/holm-overhaul-arrival-v1/candidates/holm-overhaul-arrival.terrain.json
```

Repeat `stage` for the other three registered targets, then:

```powershell
node tools/studio_workspace_cli.js status holm-overhaul-arrival-v1
node tools/studio_workspace_cli.js export holm-overhaul-arrival-v1
node tools/studio_workspace_cli.js plan holm-overhaul-arrival-v1 <exportId>
```

Use the actual returned export ID. Review the first slice from the **working** bundle in an isolated Studio preview before any apply. The current terrain page cannot do that yet; extend/add a preview that explicitly selects the new workspace rather than silently reading old live files. Gameplay preview should use a separate entry/provider and disposable QA save in the in-app browser; loading the production `index.html` with a new JSON sitting nearby does not establish isolation.

Only after all-green plan, terrain/building/navigation gates and visual/function review:

```powershell
node tools/studio_workspace_cli.js apply holm-overhaul-arrival-v1 <exportId>
```

Publishing these new filenames preserves old JSON. Activation into the main game's provider needs its own reviewed integration and deliberate saved-position migration; it is not implied by file publication. Runtime script/asset changes need their own code/asset gates. Never copy working bytes over old live assets by hand.

If interrupted, run `recover` before another mutation. Use `rollback` only through the CLI; it refuses to overwrite later installed-file changes. Target deletion is unsupported in `collect`; do not use missing working files as a deletion request. Keep the old island package recoverable.

## Missing capabilities to build before first-slice installation

1. **A true terrain source.** Versioned finite height samples or deterministic authored elevation features, envelope/resolution, material regions and shoreline/water data. One coordinate/height contract must drive rendering, collision, minimap and `groundY`/navigation. Validate chunk-edge continuity and explicit dry/water bounds; avoid separately painting visual terrain over a flat walk plane.
2. **Creek and crossing contracts.** Authored channel profile, bank heights, water surface/flow direction, river mouth and pond connections; crossings with walkable deck height and cardinal approaches. The current terrain-water mask cannot alone represent a bridge above visible water. Reuse/test `WorldWalkSurfaces` where suitable, but verify it against the new terrain source and collision—not just against a bridge mesh.
3. **General terrain compiler/validator.** Remove Lesson-Green-only assumptions by adding a new schema/API, not loosening old equality gates. Deterministic compilation must derive water flags, route reachability, elevation constraints and shared boundary samples. The current compiler refuses all new source identities.
4. **Cross-package validation.** Check building footprint/door elevations, route anchors, bridges, cave entries/exits, and saved spawn landmarks against the same new terrain revision. Existing building pair validation catches source/bundle transform disagreement, but does not prove arbitrary new topography is traversable or service sockets reachable.
5. **New building definitions/assets and preview binding.** Placements can move already-known definitions; entirely new guide houses/castle families require new registered definitions, model templates and semantic service parts. Their upper-floor walk surfaces/planes, ladders/stairs and cutaway groups need authored contracts. The existing Studio building selector/workspace flow must point to the matching new definition and working files.
6. **Isolated runtime consumption and migration.** Wire the draft height source/provider only in a preview path first, keeping production boot untouched. Main activation later needs provider revision/landmark migration for current Holm and mainland saves, fresh arrival and underground/upper-floor profiles. Preserve item/state identities even when physical coordinates change.

## Minimum tests before publication

- Same source compiles byte-identically; bad/nonfinite heights, inconsistent chunk seams, unknown materials, dangling crossings and malformed provider metadata fail.
- Creek water is blocked except valid crossings; both bridge approaches and the arrival→guide service route are cardinal and respect elevation limits; surrounding banks cannot accidentally form shortcuts or traps.
- New guide-house doors, furnished circulation, stairs/upper floor and return path are reachable from the actual arrival; cave entry/exit roles are preserved for the whole-island extension.
- Modifying a source without its bundle, changing a placement without its terrain contract, tampering exported bytes, or editing live bytes after init fails the plan/application gates.
- New-target apply/rollback and interrupted-journal recovery work in a disposable fixture repository before any real publication.
- Studio/game preview visibly uses the candidate terrain, not `HolmLandscape` fallback. Record in-app pointer traversal and reference review; no headless coordinate test substitutes for that visual/function proof.

The immediate design map can proceed now. The smallest enabling engineering bundle is a general isolated terrain source/compiler/preview adapter plus its consistency tests—not a rewrite of the live old Holm or another detail pass on its buildings.
