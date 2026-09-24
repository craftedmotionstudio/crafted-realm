# Arrival Player bridge and browser export loader

The game's actual `orderWalk` and movement section in `update` now delegate to
`HolmArrivalPlayer` only when it is explicitly attached to the current actor and
provider. The default island has no attachment and retains its existing path.
No rebuilt arrival provider was activated in this pass.

`src/holm_arrival_player.js` connects the pure surface follower to an actor's
actual position, orientation and Player move/action fields. Attachment requires
an exact supported starting stance and matching global player/provider identity;
it does not teleport a player into place. Click targets select a reachable tile
on the corresponding floor by surface/height and reject ambiguous or wrong-floor
targets. Keyboard input uses the existing camera-relative dominant-axis rule.
Stun freezes movement; cancellation and keyboard release settle the occupied
edge without inventing a diagonal shortcut. Runtime movement speed is passed to
the follower each update via its new `setSpeed` method.

`tools/test_holm_arrival_player.js` passes actual arrival navigation with actor
position vectors, dock-to-upper-floor traversal, supported distance budgets,
wrong-floor rejection, stun, keyboard release, attachment rejection, and the
actual game's extracted `orderWalk` dispatch in active and inactive cases.
The initial test incorrectly assumed one rendered frame could not consume the
end of one cardinal edge and start the next; it now checks the correct Manhattan
distance budget. Existing follower tests continue to prove each graph edge is
cardinal. These are integration-unit checks, not a completed real-pointer
journey through the new island.

`src/holm_arrival_export_loader.js` loads the self-contained ten-file export in
the browser. It verifies manifest identity, exact byte lengths/hashes, required
source roles and package reconstruction. Unsafe paths, case aliases, foreign
origins, redirects and cancelled requests are rejected without a live-file
fallback. It returns parsed documents and owned Uint8Array asset buffers for
GLTFLoader.parse; it does not activate a provider or touch saves. All 26 tests in
`tools/test_holm_arrival_export_loader.js` pass, including a classic-script
environment without Buffer and the actual staged export e30d49f5b9bdafb4.

Next: assemble the explicit arrival QA provider from those verified bytes, bind
the chunk terrain and authored model owners, establish the real spawn through
provider boot, attach this Player bridge, and connect same-surface interactions
and saved checkpoints. Save restoration and real-pointer arrival traversal are
still incomplete, as are the full island's remaining content and acceptance.

Foreground in-app smoke arrival-player-bridge-20260912: PASS, boot 872 ms, 105/105 structural, real out/back, six streamed boundaries and exact save/load, 60 FPS/worst 23 ms, 92 draw calls/33044 triangles, seven ticks and zero console errors. This validates default-provider regression only; the new bridge is intentionally inactive there.
