# Authored terrain runtime and surface follower

Implemented the runtime mesh branch needed by the arrival provider. No rebuilt
provider has been activated; the current live island remains the default.

`src/world_v2_sampled_terrain.js` builds actual Three.js meshes from the authored
chunk lattice using `HolmOverhaulChunks.surface`. World positions, triangle order,
shared border heights, material bands and terrain exclusions come from data.
The r128 vertex palette is attenuated for the game's existing light intensities;
the first unattenuated inspection clipped highlights and was corrected.

`src/world_v2_terrain.js` selects this branch only for a provider whose
`renderStrategy` is `holm-overhaul-sampled`. It keeps one shared flat-shaded
material, registers each chunk in the real terrain/clickable arrays, and uses the
existing unload cleanup. It omits the old pond and grass texture in this mode.
The new scripts are loaded by index.html; the existing provider uses its old
rendering branch. This does not yet connect global ground queries, ocean/creek
water, building model loading, player movement or the new provider's boot.

In-app `tools/test_sampled_terrain.html` uses actual Three r128 and the staged
arrival package. It passed 4,631 assertions, mostly exact shared-edge vertex
comparisons, plus registration, four-tile exclusion, invalid sample rejection,
unload disposal, shared-material retention and reload. No console errors.
Evidence: `.studio-workspaces/holm-arrival-package-v1/runtime-terrain-r128.png`.

Direct visual review: the creek depression and raised building terraces are
visible, land materials separate, and no chunk seams are visible at the overview
camera. The bare terrain lacks water, architecture and vegetation in this test;
it is not a settlement quality review or a 9.0 acceptance claim. The large bare
areas still require the authored island content in the full goal.

`src/holm_arrival_follower.js` is a pure controller for the forthcoming actual
Player hook. It preserves explicit surface support on cardinal routes. Stops and
repaths finish the occupied edge; door changes that would invalidate that edge
are refused atomically. Mid-edge snapshots have no settled node ID, so they
cannot masquerade as saved tile-center checkpoints. Each update consumes at most
0.25 seconds and 64 edges to bound stall work. `tools/test_holm_arrival_follower.js`
passes actual dock/chart/upstairs returns, support, interruptions, door refusal,
blocked-route truncation, invalid input and immutable-source checks.

Remaining integration: an explicit QA provider boot using the staged export,
provider-owned terrain height queries and water, model/interaction ownership,
actual Player order/update/manual controls and save restoration. The follower
has no live Player hooks yet. Full island art/gameplay and migration gates remain.

Foreground live regression smoke sampled-terrain-runtime-20260912: PASS, boot 799 ms, 105/105 structural, real out/back 3619 ms, six boundaries and exact save/load, 60 FPS/worst 21 ms, 124 calls/34268 triangles, seven ticks, zero console errors. Prior intermittent slow runs remain a separate unresolved risk.
