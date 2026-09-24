# Overhaul terrain publication gate

The terrain authoring source and compiled bundle now have semantic validation in
Studio Safe Publish. This is a publication prerequisite, not visual acceptance or
proof of a complete playable island.

`tools/studio_overhaul_terrain_validation.js` uses the same terrain compiler as
Studio. It validates dimensions and lattice values and requires the paired
`.json` / `.bundle.json` targets. The bundle must equal a fresh compilation of
the source, including heights, material indices, water flags, creek and stats.

`tools/studio_workspace.js` invokes this at staging/collection and during plan.
Plan checks the proposed installation: packed changed files plus live unchanged
partners. Therefore an export created before this validator cannot bypass the
semantic gate simply because its packed hashes match its manifest.

Evidence:

- `node tools/test_studio_overhaul_terrain.js` passed matching pairs, missing
  partners, invalid samples, finite-but-wrong height/material/water values,
  staged source drift, and hash-consistent old-export refusal at plan and apply.
  Refused publication leaves fixture live bytes unchanged.
- `node tools/test_studio_workspace.js` passed existing transactional gates.
- Actual workspace `holm-overhaul-terrain-v1` status validates its two targets.
  Export `1daaae273a36d565` has an all-green plan. It was **not applied**.
- Foreground in-app smoke profile `arrival-publish-gate-20260912`: 105/105
  structural, real out/back walk, six streaming boundaries and exact save/load
  passed; zero console errors. Overall FAIL at 27 FPS versus 45 minimum,
  worst frame 48 ms, boot 1931 ms. Variable frame delivery remains unresolved.

Remaining: arrival package compiler and byte-bound asset/navigation validation,
real Player surface integration, complete northern tutorial connection, accepted
Blender art, full-route save migration and performance acceptance. Unknown
non-terrain schemas are not made valid by this terrain gate.

Arrival core compiler added: src/holm_arrival_package.js with tools/test_holm_arrival_package.js. Independently verified deterministic immutable compilation, all four door states, six reversible routes, actual source transforms and browser/CommonJS parity. It explicitly leaves full-provider readiness false. Asset hash declarations are not byte validation, and this package is not registered with the runtime. Package source-byte validation is the next integration prerequisite.
