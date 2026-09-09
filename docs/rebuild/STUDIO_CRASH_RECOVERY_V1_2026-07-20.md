# Studio crash recovery v1

Date: 2026-07-20
Status: implemented and contract-tested

## Outcome

Studio Safe Publish can now recover deterministically if a multi-file building or district publish is interrupted.
This closes the safety prerequisite for expanding the matched district-bundle workflow beyond Survival Wood.

## Contract

- Verified backups exist before the journal or any live replacement.
- The durable journal records the workspace, export, phase, before hashes, installed hashes, and target paths.
- Journal and receipt metadata use flush plus atomic rename; installed live files are flushed and hash-verified.
- A pending journal makes workspace status unclean and blocks new apply and rollback operations.
- `recover` restores only journal-declared states. Any unknown live hash fails closed.
- Recovery restores the old live/base snapshot while preserving the candidate in `working/` for another review.
- A receipt written before interruption is marked rolled back and cannot masquerade as a valid rollback target.
- A committed journal left behind during final cleanup is archived without undoing the completed publish.
- Repeating recovery after successful cleanup is a no-op.

## Operator command

`node tools/studio_workspace_cli.js recover <workspace-id>`

Always inspect `status` and run `plan` again after recovery before applying the preserved draft.

## Verification

`node tools/test_studio_workspace.js` passes 23 destructive-path locks in disposable project roots, including a
simulated process stop after a candidate file replaced its live target. The test proves exact byte restoration,
preserved draft state, receipt retirement, archival, idempotence, divergent-byte refusal, and committed cleanup.

The complete World V2 contract, content validator, and Fable recovery gate also pass. A foreground real-browser
smoke run passes 103/103 structural assertions, real out-and-back movement, six streamed boundary crossings, exact
save/load restoration, 60 FPS, 20 ms worst frame, 112 draw calls, 29,456 triangles, six world ticks, and zero
uncaught or console errors.

The next environment boundary is the Lesson Green terrain/navigation district package. It should reuse this journaled
four-file transaction before any Quest Lodge or Teaching Kitchen art is promoted.
