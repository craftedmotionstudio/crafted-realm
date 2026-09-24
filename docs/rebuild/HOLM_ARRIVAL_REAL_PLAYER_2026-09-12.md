# Arrival draft: actual player integration

Status: partial functional proof, not visual acceptance or full-island completion.

The opt-in `?arrivalQA=1&qaProfile=arrival-live-01` game loads the byte-verified ten-file Studio export `e30d49f5b9bdafb4`. The ordinary provider remains unchanged. No Safe Publish apply was performed. The house and dock use their actual Blender-exported GLBs with editable `.blend` sources in the staged package.

## Real in-app pointer evidence

The actual player walked dock `60,123` → exterior `61,114` → exterior `66,107` → porch `66,106`. After clicking the front door, the player entered `ground:66,102`, clicked the relief chart and walked to `ground:65,97`. The real tutorial advanced to `equip_hatchet`; its real dialogue and chat appeared. Clicking the modeled stairs reached `stair:70,97` at Y 5.5667, then the upper landing and `upper:65,96` at Y 5.8. No teleport or direct movement call was used as proof. Read-only scene projection located pointer targets.

Reload/Continue restored the porch, the ground-floor interior with its open front door, and a stair checkpoint with the chart lesson still complete. Final upstairs reload restored exactly `upper:65,96`, position `[65.5,5.8,96.5]`, arrival door open/garden door closed, lesson `equip_hatchet`, and the unchanged five coins. Console errors remained zero.

Banked screenshot: `.studio-workspaces/holm-arrival-package-v1/arrival-live-upper.png`.

## Defects found and repaired

- Asynchronous appearance loading replaces the player container. The movement bridge now adopts a replacement only at the exact supported current pose; the retired container stops moving. A regression covers active-route replacement and rejection of a displaced replacement.
- Door reach uses visible geometry bounds rather than the exported mesh origin.
- The old cellar visibility loop no longer overrides arrival-owned floor visibility.
- Stair users see the upper landing, making it possible to click onto it.
- Arrival zone labels no longer use the old world's coordinate regions. Door registration avoids adding the same leaf twice.

## Direct visual review: below acceptance

Silhouette/proportions: the tall stone house and dock are recognizable, but the broad interior floor and wall masses still dominate. Shape hierarchy: entrance, stair and chart read; the rooms need more deliberate composition. Material separation: warm wood, green-gray stone and red roof separate clearly, but broad floor fields remain flat. Reference features: two usable storeys, a porch and coastal grade are present; planted enclosure and settlement context are absent from this runtime package. Camera readability: cutaways now expose the active floor; entrance canopy obscures the door from some angles. Animation/interaction: real stair traversal and chart work; doors still snap to clip endpoints and water is static. Family consistency: only house/dock are integrated, so whole-island consistency is unproven. No 9.0 score or acceptance sheet is claimed.

## Remaining work

The provision rack/tool recovery is not connected in the draft, so the next lesson cannot yet be played. The legacy minimap and guidance arrow target the old world. Northward curriculum connection, landscape/skiff integration, animated water, timed door transitions, NPC/player art acceptance, robust occlusion, full save migration and complete island content remain open. The QA profile is disposable and cannot establish normal-save migration readiness. The full goal remains active.

## Deterministic checks

Player bridge, model-owner lifecycle/cutaway, follower, checkpoint, browser export-loader (26 cases), and actual staged transaction rejection tests pass. These supplement the pointer route and do not establish visual acceptance.

Default-provider foreground smoke profile `arrival-runtime-regression-20260912`: PASS; boot 953 ms, structural 105/105, real walk 3452 ms, six streamed boundaries/25 tiles, exact lossless save/load, 60 FPS, worst frame 21 ms, 125 draw calls, 34,270 triangles, six ticks, zero console errors. This is the ordinary-world regression gate; it does not measure arrival-draft performance or resolve historical intermittent slow runs.
