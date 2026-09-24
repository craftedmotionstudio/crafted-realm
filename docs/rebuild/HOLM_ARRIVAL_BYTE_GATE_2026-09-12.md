# Arrival package byte validation and staging

The isolated arrival core is staged as ten files in workspace
`holm-arrival-package-v1`. Export `e30d49f5b9bdafb4` has an all-green Safe Publish
plan. **No apply was performed; no live provider or player behavior changed.**

`tools/stage_holm_arrival_package.js` creates candidates using the authored
terrain, guide house, dock and existing navigation sources. It changes only the
dock model reference to its proposed stable asset path, hashes the actual staged
bytes, compiles the package, and invokes the existing CLI for init/stage/export/
plan. It never invokes apply. Re-running restages only this recipe's targets and
refuses an existing workspace with different target registration.

The working targets are:

- `assets/world/authoring/holm-overhaul.terrain.json` and `.terrain.bundle.json`.
- `assets/world/authoring/holm-arrival.layout.json`, `.envelopes.json`,
  `.dock.json` and `.package.json`.
- `assets/models/holm_guide_house_overhaul_v1.glb` and
  `holm_arrival_dock_overhaul_v1.glb`.
- Corresponding editable files in `assets/blender/`.

These are proposed paths within the workspace's working tree, not installed files.

`tools/studio_arrival_validation.js` validates exactly nine registered unique
source dependencies, contained normalized paths, actual SHA256 bytes, source
schema roles and an exact fresh reconstruction of the compiled package. It
checks GLB container lengths, embedded buffers, scene reachability, unique
semantic part names, mesh descendants and the hinge-targeted door animation
contracts. Blender files must have the expected header. The validator does not
prove Blender-to-GLB correspondence, full mesh collision, gait quality or visual
acceptance. Compiler draft flags stay false; successful external validation is
evidence, not a permission to enable the incomplete whole provider.

Safe Publish calls this validator while collecting working files and while
planning the actual installation (packed changed files plus unchanged live
partners). Older exports cannot skip it.

Verification performed:

- `node tools/test_studio_arrival_validation.js`: actual candidate bytes pass;
  deterministic/nonmutating; 22 byte/data/registration/semantic failures rejected.
- `node tools/test_studio_arrival_workspace.js`: actual ten-file set passes in
  a temporary repository; a hash-consistent altered route fails plan and apply,
  leaving all live fixture targets absent.
- Existing `test_studio_workspace.js` and `test_studio_overhaul_terrain.js` pass.
- `node tools/stage_holm_arrival_package.js` and the explicit plan command pass
  for the real isolated workspace/export named above.
- Foreground in-app smoke `arrival-bytes-20260912`: PASS, boot 849 ms,
  105/105 structural checks, real out/back, six boundaries, exact save/load,
  60 FPS/worst 23 ms, 94 calls/33,084 triangles, seven ticks, zero console errors.
  Live renderer code did not change; this does not resolve prior intermittent
  27/28 FPS failures.

Next: use this validated staged package for an explicit real-game QA provider
path with the real Player and surface-aware movement/save state. Preserve the
current provider until the northern route and remaining tutorial destinations
are authored and connected. Skiff/dressing/Bram still need inclusion in the
package, alongside the full island's remaining art and gameplay requirements.
