# Studio Survival Workyard Bundle v1

Date: 2026-07-18  
Status: functional/data/draw-budget and Codex whole-room acceptance; owner visual sign-off open

## Outcome

The Survival Workyard is the second complete Studio building to publish as a matched source/runtime bundle. Its
live provider no longer contains a separate handwritten list of interactions. One revision-18 building definition
now owns all 25 door, service, clue, support, furnishing, inspection, waterworks, fishing, bucket, and cellar rows.

## Rich interaction contract

The bundle compiler now includes furnishings as first-class semantics and preserves metadata beyond label/examine:
`inspectOnly`, `inspectName`, and `inspectMessage` survive compilation. This is required for right-click-only props
such as the sawbuck, timber rack, rugs, stools, hutch, mug shelf, lesson table, and Storm Warden relief. The reserved
future poultry socket is marked `bundle:false`; it remains a purposeful future anchor without becoming a fake live
interaction.

The Workyard bundle contains:

- one placement in owner chunk `14,18`;
- 25 stable interaction rows;
- six rooms, two doors, 27 colliders, and 25 semantic part locks;
- 16 checked resource paths covering the lodge, furnishings, U3 occupation yard, U4 waterworks, U5 fishing edge,
  and storm cellar models, Blender sources, and manifests.

## Studio behavior

Studio now selects a Safe Publish profile per building. Choosing the Workyard resets the authoring identity to
`studio-survival-workyard`, points Load/Stage at its checked-in files, and now requires the four-file
`.studio-workspaces/survival-wood-district` transaction. Changing buildings disconnects the prior workspace. The HUD now marks
`OVER BUDGET` in red whenever the isolated preview exceeds its authored triangle or draw-call lock.

U6 reports the composition honestly at three levels. After the Blender-authored U4 dock and pulley family was
consolidated, the production asset renders at 25,202 triangles / exactly 170 draws; semantic helpers add 1,352
triangles / 43 draws; the complete preview is 26,134 / 227. The unchanged 42,000-triangle and 170-draw production
locks both pass. U4 fell from 47 to 26 primitives without removing geometry, animation clips, semantic nodes, or
reference-defining features. A headless composition gate now reserves 168 static roof-off primitives plus two
runtime hearth-flame effect draws, preventing this debt from silently returning.

## Verification

- Safe Publish transaction tests pass 14/14.
- The complete World V2 suite passes, including deterministic checked-in pair equality.
- Live Workyard interactions are byte-equivalent to fresh definition compilation.
- Fourteen inspection-only rows retain their messages; animated services retain both inspection and examine text.
- All 16 declared resource files exist.
- Real r160 Studio switches profiles, loads the Workyard pair, and reports no browser errors.
- Real r160 Studio reports the isolated production asset at 25,202 triangles / 170 draws, with no `OVER BUDGET` flag.
- Every functional surface service/lesson anchor is cardinally reachable from the trail entrance; all fourteen
  decorative furnishing rows remain right-click Inspect only.
- A disposable real-play profile used normal world-map click-to-walk from the Guide Hall to the Workyard, opened
  the sawbuck context menu, selected **Inspect sawbuck**, and received its authored message with zero errors.
- Foreground smoke passes 100/100 at 60 FPS, 18 ms worst frame, 166 draw calls, 32,932 triangles, exact streamed
  save restoration, and zero errors.
- The final U6 hands-on pass ordinary-walked from Guide Hall to the Workyard, verified the door/roof and two-way cellar
  flows, collected the real bucket, completed the animated bucket-to-water transaction, checked the missing-net fishing
  case, and proved left-click Walk/right-click Inspect on the lodge runner.
- The post-fix foreground smoke passes 103/103 at 100 FPS, 12 ms worst frame, 168 draw calls, 32,934 triangles, exact
  streamed save restoration, and zero errors. Codex whole-room review is 9.2/10.

## Completed next boundary

Explicit landscape roles, walk surfaces, navigation flags, and collision rows now ship in the matched Survival Wood
district bundle recorded in `docs/rebuild/STUDIO_SURVIVAL_WOOD_DISTRICT_V1.md`. U6 visible-mesh optimization is closed;
Codex whole-room acceptance is also closed. The remaining boundary is owner visual sign-off, recorded in
`docs/rebuild/WORKYARD_U6_CODEX_ACCEPTANCE_2026-07-18.md`.
