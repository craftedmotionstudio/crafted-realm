# Tutor's Holm playtest loop (standing loop from 2026-09-10)

Owner direction (2026-09-10): "spin up a few agents and actually play the game and report back findings and
issues; they should be able to get through the tutorial island and back to the mainland eventually; that should
be the loop."

## One tick of the loop

1. **Play.** Spawn three playtester agents in parallel, one per persona, each on its own dev server so they do not
   share the single-threaded python server (ports 8777, 8778, 8779; start extra servers with
   `python -m http.server 87xx` from the repo root). Each agent reads `docs/rebuild/PLAYTEST_AGENT_BRIEF.md`,
   plays through `tools/play/harness.js` with real input only, and writes
   `docs/rebuild/PLAYTEST_<date>_<persona>.md` plus `scratchpad/playtest/<persona>/run.json` and screenshots.
   Personas rotate so every tick sees the island through different eyes:
   arrow-follower, explorer, impatient, first-timer-slow-reader, completionist, mobile-narrow-viewport (when a
   viewport variant is added to the harness), returning-player-with-save.
2. **Triage.** Merge the reports into `docs/rebuild/PLAYTEST_FINDINGS.md` (the ledger): one row per distinct
   finding with id, first seen (tick/persona), severity, where, observation, expectation, status
   (open / fixed <date> / by design / deferred with reason). Duplicates across personas raise confidence, not
   count. Findings that are the harness's fault go under "harness" and are fixed in `tools/play/`.
3. **Fix.** Work the open findings by severity: anything that stops a tester reaching the mainland first, then
   misleading guidance, then friction. Every fix gets a lock (`tools/test_world_v2.js` or a QA driver) and the
   normal gates (locks, `validate_content`, two-phase smoke, the relevant `tools/qa_<id>.js`, the full-route
   driver when doors/stations/route change). The P2-D art-pass items in `TUTORS_HOLM_COMPLETION_GOAL.md` stay open
   and are picked up when a tick has no play-blocking findings left, or when a finding names them.
4. **Close the tick.** PASS_LOG entry (tick number, testers spawned, reached-mainland tally, findings opened /
   fixed), the ledger updated, this file's tally below appended, and the loop re-armed. Nothing is committed
   unless the owner asks.

## Exit condition

Three consecutive ticks in which every tester reaches the mainland unaided with no new critical or high
findings. Then the loop pauses and the remaining P2-D items are worked to completion.

## Tally

| Tick | Date | Testers | Reached mainland | New findings (crit/high/med/low) | Fixed this tick |
|---|---|---|---|---|---|
