# Full curriculum migration foundation — 2026-09-13

Status: staged implementation, not activated in the game. Previous pass was progress: actual bake cancellation repair and verification. The full island goal remains active.

## Implemented contract

`src/holm_curriculum_progress.js` supplies pure `normalize(savedTutorial)` and `completeLesson(savedTutorial, lessonId)` functions, available as a classic browser global and CommonJS. Its version-6 curriculum contains all 18 recorded lesson IDs in their recorded order. No reward, inventory, XP, storage or world side effects occur.

- Known v4/v5 sequences establish only the completed prefix before the saved current lesson. Stable IDs outrank stale numeric indices. Invalid indices and unknown versions do not establish a prefix.
- Literal-true historical optional evidence credits a restored lesson. Newly required lessons without evidence remain due. Later completed lessons remain in the ledger, so returning for bread/quests does not force repeated mining/smithing.
- Version 6 uses a deduplicated known-ID completion ledger. The current objective is its first missing lesson. Only completing that current ID advances; repeated and out-of-order events refuse.
- Graduated profiles remain graduated without fabricating completion evidence for omitted lessons. Existing extra tutorial fields, optional markers and recovery/departure flags are copied and preserved. Inputs and nested data are not mutated.
- A v4 character may need the newer orientation lesson before resuming. Unknown-version partial records conservatively begin at orientation; they retain their original extra fields but receive no invented lesson credit.

## Verification

`node tools/test_holm_curriculum_progress.js`: **13/13 PASS**. Includes the full 18-event sequence, v5 restoration with later progress retained, v4 migration, stable IDs, literal optional evidence, graduation, unknown versions, invalid indices, ledger sanitation, repeat/out-of-order refusal, immutable nested inputs, JSON round trips at every step and browser-global/CommonJS parity.

Foreground in-app regression smoke: **105/105 PASS**, 60 FPS, worst frame 22 ms, 125 draw calls, 34,270 triangles, six world ticks, six streaming boundaries with exact/lossless save-load, zero console/uncaught errors. Evidence: `scratchpad/holm_perf/full-curriculum-staging-smoke.json`. This is the existing game's regression gate; the staged helper is not loaded by that game and this smoke does not prove its runtime integration.

## Required integration

Do not switch the live flow to 18 lessons until success targets, teaching grants/recovery, guidance and services exist for all five restored lessons. Replace the current reduced-flow acceptance assertions, then integrate this ledger with actual notify/finish/banner behavior and SaveGame serialization/loading together. In particular, generic numeric step increment must skip already credited later lessons through the ledger. Prove one real-pointer full tutorial circuit and migration/save reload fixtures without reward duplication. The staged helper alone does not meet those gates or complete curriculum restoration. No live world publish or art acceptance occurred.
