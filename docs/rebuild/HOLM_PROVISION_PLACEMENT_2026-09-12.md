# Provision rack: room placement and navigation contract

Status: Studio proof; not yet part of the byte-verified live arrival export. Full-island goal remains active. The preceding turn made progress by repairing the actual teaching-kit grant and producing/reviewing an editable Blender rack.

## Authoritative candidate

`docs/rebuild/holm-overhaul/arrival-provisions.json` proposes house-local X 2, Z -4, rotation 0, with interaction X 2.5, Z -2.5. The actual Blender model is 1.6 × 1.7 × .55 tiles, front +Z. It stands beneath the north window, east of the north exit and west of the stair landing. The source and model remain recoverable candidate files.

The new pure `HolmArrivalProvisions.compile` accepts caller placement and measured manifest bounds. It returns cloned augmented layout/envelopes, the rack blocker, interaction stance `ground:68,96`, transforms, four door-state graphs and 16 reversible route legs. It rejects furnishing/stair overlap, out-of-room/over-height placement, malformed bounds and unsupported stances. It does not verify model bytes or assert visual acceptance. Its deterministic tests pass, including 27 invalid cases and classic/CommonJS parity.

## In-app Studio proof

The terrain Studio loads the actual rack GLB using the placement document. The house walk uses the compiled rack blocker and stance. With doors open, clicking the rack crest directly drove the preview character from the landing through the house to `ground:68,96`, Y 3.00. No direct position mutation or teleport was used as movement proof. This preview does not award tools or touch an adventurer save.

Banked evidence: `.studio-workspaces/holm-provision-rack-v1/candidates/studio-house-stance.png`.

The return-to-chart button subsequently reached `ground:65,97`, Y 3.00, with zero Studio console errors. This is still preview traversal only.

Direct visual review: the rack is grounded and human-scaled, with clear open space in front and no visual door/stair penetration. The crest sits partly across the lower window opening; the window remains legible. Tool/shelf/frame hierarchy reads at this room angle. Bronze and timber are still close in value, and the net cords are fine at distant camera scale. Warm timber is compatible with the stairs, while the broader room remains sparse. Static secured props require no motion; collection feedback and actual gameplay interaction remain unverified. Retain the preliminary 8.6 candidate score; no final acceptance or comparison sheet claimed.

## Required next work

Extend the byte-verified arrival package to include the rack model/source/manifest/placement, augmented collision documents and service binding. Stage/export/plan using Studio Safe Publish and reject old/new cross-file drift. Only then wire the real arrival owner and repeated recovery interaction, verify pack-full/bank-owned/save-failure behavior at the authored stance, and continue north into the original survival lessons. Current Studio success cannot substitute for those gates or full-island completion.

## Regression gate

Foreground default-world smoke `arrival-rack-contract-20260912` **FAIL**: 14 FPS (minimum 45). Boot 4914 ms, structural 105/105, real walk 5180 ms, six boundaries/25 tiles and exact lossless save/load passed. Worst frame 90 ms, 125 draw calls, 34,270 triangles, four ticks, zero console errors. The intermittent slow-frame issue remains unresolved; Studio-only changes do not establish its cause. No repeated run was substituted for this failure.
