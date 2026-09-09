# Lesson Green terrain package

Date: 2026-09-07

## Delivered boundary

Lesson Green now has a deterministic terrain/navigation source and compiled bundle, an isolated Studio map review,
and a journaled source/bundle publication. This resumes the boundary recorded after Studio crash recovery v1.
Quest Lodge and Teaching Kitchen remain planning foundations. No new building, NPC, service, quest, art acceptance,
or terrain painting feature is implied by this package.

The terrain-only schema deliberately has no completed-building dependency. It uses the same journaled transaction
mechanism as the four-file Survival Wood transaction, with two registered files. The old handoff's four-file wording
does not justify inventing a building pair for terrain-only work.

## Contract

- `src/world_v2_terrain_district.js` compiles the canonical Lesson Green landscape data into 20 chunks
  (`cx=15..19`, `cz=15..18`), two cardinal route records, two reserved pads and 23 analytic water flags.
- Terrain roles and height source remain identical to the existing landscape. The live 195-chunk catalog,
  world revision 4, cardinal movement, save migration, and maximum 49 resident chunks are preserved.
- Overlap merging retains Survival Wood's existing flags first, including authored dock walk overrides.
  The full Survival Wood source/bundle and live rows remain byte-equivalent to their earlier contract.
- Strict canonical validation rejects malformed values, nonfinite/cyclic input, unknown fields, changed identities,
  pad/revision drift, missing chunks, and altered navigation. It intentionally represents the current authored plan;
  arbitrary terrain editing needs a later authoring-language extension.
- Safe Publish requires exactly one registered matching bundle per terrain source and validates every compiled row
  with the same compiler as the game. The generator writes candidates/staged files only inside the local workspace.

## Use

Open `http://127.0.0.1:8777/tools/studio_terrain.html` or follow the Lesson Green link from Building Studio.
The map is a read-only package review: cardinal roads, chunk boundaries, district outline, reserved pads and height
inspection. Load Published fetches both files without cache and refuses any contract mismatch.

The initialized workspace is `.studio-workspaces/lesson-green-district`.

```powershell
node tools/build_lesson_green_district_bundle.js
node tools/studio_workspace_cli.js export lesson-green-district
node tools/studio_workspace_cli.js plan lesson-green-district
node tools/studio_workspace_cli.js apply lesson-green-district
```

Only apply an all-green plan. Existing CLI `status`, `recover` and `rollback` remain the recovery controls.
This slice does not add a native directory-picker write path to the terrain preview.

Initial publish: export `d6de5f1662552dfb`, receipt
`apply-2026-09-07T13-06-52-838Z-d6de5f1662552dfb`. Both installed hashes matched their export; workspace rebased cleanly.

## Verification

- Terrain compiler: 12/12 deterministic/negative locks; 5/5 automatic boot assertions.
- Terrain workspace: 9/9 locks, including missing pairs, mismatched paths, navigation tampering, deterministic export,
  exact apply, clean rebase, new-file rollback and existing-byte restoration.
- Original Studio transaction/crash recovery: 23/23 locks pass.
- World V2: all locks pass, including three new package/provider/retained-foundation checks.
- Foreground Chrome smoke: 104/104 structural, 2.164-second boot, 60 FPS, 20 ms worst frame,
  154 draw calls, 32,106 triangles, seven ticks, six streamed boundary crossings, exact save/load restoration,
  zero game console errors and zero uncaught errors.
- Real pointer minimap traversal starts at the saved Guide Hall apron `(151.5,169.5)`, reaches the Kitchen-side
  approach `(161.5,133.5)`, then the Lesson Green corridor `(145.5,137.5)`. No teleport or direct position write.
  Live inspection at Lesson Green reports 49 resident chunks and an empty `SMOKE_ERRORS` array.
  A further minimap click reached Quarry Rise `(128.5,120.5)` and a return click reached
  `(145.5,137.5)` again, with the same resident ceiling and no errors.
- Studio loads the published pair in real Chrome, displays 20/2/2/0 package metrics and verified status.
  Captured game and Studio screenshots are in the task's browser-review tool outputs.
- A later smoke repeat also passed structural/movement/persistence/error checks but marked the window occluded;
  its FPS values are not used as performance evidence. The explicit 60 FPS foreground result above is the
  performance acceptance evidence.
- After explicitly bringing Chrome forward, the final foreground run passed 104/104 at 120 FPS,
  17 ms worst frame, 147 draws, 31,574 triangles, six ticks and six boundary crossings. Save/load was exact
  and both error counts were zero (23.678 seconds total). This is the final performance gate.

## Direct Codex visual review

This is a functional foundation review, not an asset release score. The settled game view shows the two reserved
graybox pads and a readable open corridor; inherited cliffs/building art remain existing art debt. No new mesh
silhouette or animation has been introduced. The Studio view separates terrain, pale cardinal paths, outlined pads
and the dashed district boundary. Labels remain legible at the tested desktop width and the map explicitly calls
both structures reserved. Navigation hierarchy and color separation pass for package inspection; the muted palette
fits the existing Studio family. The reload control produces an explicit validated status. Animation, material art
and finished-building family acceptance are not applicable to this read-only terrain review.

## Next work

Extend actual district authoring only through a validated schema, rather than editing generated bundles.
Quest Lodge and Teaching Kitchen still need purposeful building contracts and fully-designed art review before
promotion. Workyard owner whole-room sign-off remains recorded as open in the guiding light. This milestone does
not close the full Browser 1.0 game or those owner visual decisions.
