# Quest board success and save ordering — 2026-09-13

Previous turn: progress through the staged full-curriculum migration helper and event audit. This pass repairs the existing quest-board service; full island and new-lodge integration remain unfinished.

`src/holm_quest_lodge_interactions.js` now confirms the quest pane has its active class after clicking the journal tab. A missing, inert or throwing button, or missing pane, refuses credit. Study and the dialogue retry share the successful-open check; retry rechecks the Holm provider. The notification wrapper forwards to the original first, preserves its return, then marks the Holm optional evidence and saves the post-advance state. Repeated success saves without repeating optional feedback. Foreign-provider and unrelated notifications retain original forwarding without lodge ledger writes. Thrown save failures are logged. Index cache version is v4. Header comments now identify the modeled guide and full curriculum as unfinished requirements rather than deferred authorization.

## Evidence

- Syntax check PASS.
- `node tools/test_holm_quest_lodge_success.js`: **13/13 PASS** against the actual module in a controlled VM. Covers four opening failures, successful open/post-advance snapshot, successful and failed retry, provider change, repeats, return forwarding, foreign/unrelated events, save exception and wrapper idempotence.
- Foreground in-app smoke: **105/105 PASS**, boot 795 ms, actual walk out/back 3571 ms, six streaming boundaries with exact/lossless save-load, 60 FPS, worst frame 21 ms, 125 draw calls, 34,270 triangles, seven ticks, no console/uncaught errors. Banked `scratchpad/holm_perf/quest-lodge-success-smoke.json`.
- Real pointer click on the visible quest tab displayed Quest Journal, QP 0/14 and quest entries. Read-only DOM confirmed `#pane-quests` class `tab-pane active`. Screenshot: `scratchpad/holm_perf/quest-journal-pointer.png`.

## Limits

The pointer check verifies the actual tab's open-state contract, not a walk to the board, required lesson advance or that lesson's save/reload. Those flows remain unproved in-browser. The new lodge, modeled guide and 18-lesson runtime activation remain unfinished. This patch does not establish general lesson-event provenance or change old building coordinates. No art acceptance, world publish, combat math or save schema changes occurred.
