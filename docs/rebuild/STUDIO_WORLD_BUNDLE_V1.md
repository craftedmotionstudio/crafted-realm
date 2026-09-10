# Studio World Bundle v1

Date: 2026-07-17  
Status: accepted proving slice

## Outcome

The Guide Hall is now the first complete Studio-authored building whose placement and runtime-facing world data
travel as one validated transaction. Moving the building no longer requires separately rewriting its doors,
services, clue anchors, support anchors, room contract, collider count, or resource list.

## Single-source flow

1. `src/world_v2_building_data.js` owns the Guide Hall definition and semantic interaction metadata.
2. `assets/world/authoring/studio-building-preview.json` owns the placed instance and transform.
3. `src/world_v2_bundle_authoring.js` deterministically compiles both into
   `assets/world/authoring/studio-building-preview.bundle.json`.
4. `tools/studio.html` stages and reloads the source and bundle together.
5. `tools/studio_workspace.js` refuses export when the files are not both registered, their providers disagree,
   or any placement identity or transform differs.
6. `src/world_v2_holm.js` consumes the same compiled interaction rows used by the bundle, removing the former
   handwritten Guide Hall interaction duplicate.

The bundle contains the chunk terrain/object row, six interaction rows, a compact building contract with room,
door, semantic-part and collider locks, and the model/source/manifest resource dependencies. It is runtime-shaped
data, not a second visual prefab or a replacement for the approved Blender asset.

## Acceptance gates

- The bundle validates against its source document and the current building definition.
- Guide Hall live interaction rows are byte-equivalent to freshly compiled interaction rows.
- Every semantic interaction part has an authored description and stable id.
- Model, Blender source, and manifest dependencies exist.
- The Safe Publish suite passes all fourteen checks, including mismatched-pair refusal and matched-pair export.
- The complete World V2 suite passes.
- The real r160 Studio loads the published pair with every contract green and no browser warnings or errors.
- A real Guide Hall door interaction completes in a disposable QA profile with no errors.
- Foreground game smoke passes 100/100 at 60 FPS, 18 ms worst frame, 166 draw calls, 32,932 triangles,
  exact streamed save restoration, and zero errors.

## Operating workflow

Use `.studio-workspaces/guide-hall-bundle`, created with both checked-in targets:

```powershell
node tools/studio_workspace_cli.js init guide-hall-bundle assets/world/authoring/studio-building-preview.json assets/world/authoring/studio-building-preview.bundle.json
node tools/studio_workspace_cli.js status guide-hall-bundle
node tools/studio_workspace_cli.js export guide-hall-bundle
node tools/studio_workspace_cli.js plan guide-hall-bundle
```

Studio's **Stage draft** action compiles both working files. Apply only an all-green plan. The earlier one-file
`building-preview` workspace is obsolete and must not be used for new Guide Hall publishing.

## Next boundary

The Workyard migration is complete in `docs/rebuild/STUDIO_WORKYARD_BUNDLE_V1.md`. The next boundary is explicit
landscape polygons, navigation and collision fields in a matched district bundle rather than broader legacy-provider
code. Before publishing large district bundles, add a durable crash-recovery journal; ordinary caught write failures
are already restored.
