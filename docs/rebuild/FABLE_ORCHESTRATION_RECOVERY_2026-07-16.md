# Fable orchestration recovery — 2026-07-16

## Outcome

The alternate Fable/Codex orchestration experiment contained useful work, but its integration checkpoint was older
than the final accepted Workyard U5 state. The project is now recovered onto `codex/u5-accepted-checkpoint`, with the
complete accepted U3–U5 evidence and runtime banked before any experimental work was admitted.

## Value retained

- Deterministic World V2 Studio authoring is integrated. Imported authoring identity is preserved, rebuilds fail
  closed, and save/reload output is byte-stable. The authoring layer passes 18/18 pure-data locks.
- The Training Cavern route, lesson coordinates, mining/smelting/smithing targets, and forward-only surface flow were
  retained.
- The cavern no longer polls and self-installs globally. Tutor's Holm explicitly initializes, reports, and disposes
  the auxiliary negative-plane runtime. Its objects use `runtimeOwnerId`; they cannot masquerade as resident chunk
  catalog objects or invalidate the duplicate-placement smoke assertion.
- Five stable Test Travel bookmarks cover the Mine Gatehouse, cavern entry, copper rocks, furnace/anvil, and Combat
  Hall exit ladder.

## Work deliberately excluded

- The Teaching Kitchen worktree remains isolated. Its world totals and dedicated test were not clean, so no kitchen
  files were merged.
- The orchestration repository's older safety checkpoint was not promoted over the newer accepted U5 source of truth.
- The original cavern polling runtime was not accepted, and the smoke assertion was not weakened to accommodate it.
- Large raw Blender experiments, music previews, and unrelated scratch files remain outside the recovery commit.

## Acceptance evidence

- World V2, landscape, flow, Studio authoring, building, residency, migration, and disposal locks: PASS.
- Content integrity and roof-transition suites: PASS.
- Workyard U4: 21/21; Workyard U5: 25/25; Asset Factory regression: 5/5; U5 recipe: 31 locks.
- Foreground live smoke: PASS 100/100; final rerun boot 360 ms; 60 FPS; 18 ms worst frame; 95 draw calls;
  4,204 triangles at the saved test location;
  six streaming boundaries; exact save/load position; zero console errors.

## Outlook

The project is healthy enough to resume the intended Phase 2 sequence. The next production boundary remains U6
whole-room Workyard acceptance, followed by proving the complete Studio-authored chunk/building round trip. The
Training Cavern is now a stable functional graybox, not approved release art. The Teaching Kitchen should stay
quarantined until its data totals, lifecycle, tests, and visual proof all pass independently.
