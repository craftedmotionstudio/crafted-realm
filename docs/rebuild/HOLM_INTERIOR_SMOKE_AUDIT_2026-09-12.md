# Interior smoke audit — 2026-09-12

Source-only audit after reading GUIDING_LIGHT and AGENT_SPEC_TEMPLATE. Confirmed `campLabels` in `tools/smoke_test.js:143–147` and `walkTest` in `src/smoke.js:163–195`. No browser was opened, no saves inspected or modified, and no runtime code changed. Any follow-up browser verification must use the in-app browser per current owner instruction.

## Structural failure: label uniqueness is a false assumption

The camp assertion computes expected count as `resident.some(... label ...) ? 1 : 0`, then compares every world clickable sharing that label. It mistakes two different authored services with the same display label for duplicate population.

There are two legitimate `Take <b>Bucket</b>` interactions:

- Arrival supply bucket: `holm_supply_bucket.take`, owner `holm_supply_bucket`, position (153.2,169.0), chunk (19,21), `src/world_v2_holm.js:105,131–132`.
- Teaching Kitchen bucket shelf: owner `holm_teaching_kitchen`, part `bucket_shelf`, label at `src/world_v2_building_data.js:319–321`. Kitchen placement is (153,136), chunk (19,17). Building interaction rows are owned by the building chunk, not by the service's world tile.

Holm resident radius is three chunks (`src/world_v2_holm.js:174`), with eight-tile chunks. Fresh arrival (151,169) centres on (18,21), including z chunks 18–24: only the supply bucket is resident, so expected label count is one. Restored position (160.5,154.5) centres on (20,19), including z chunks 16–22 and x chunks 17–23: both owners are resident, so expected count is two. Crate and barrel each remain one. The Workyard empty bucket uses `Take <b>Empty bucket</b>` and is unrelated.

This is sufficient source evidence for a faulty assertion; it is not evidence that every live instance is correct. Fix the assertion without removing either bucket or weakening duplicate detection.

Minimal fix: replace the boolean `some` expected count with the exact sum of matching resident interaction rows. Stronger fix: for each expected row, require exactly one live clickable matching label, `userData.worldObjectId`, and part where applicable, and reject unmatched legacy/global copies. `world_v2_objects.js:198–209` records owner/chunk and attaches the authored part; root objects receive owner metadata at `:310`. Runtime does not currently expose `row.id` as an interaction ID, so do not assume that field exists. Existing all-interaction aggregate check at `smoke_test.js:136–140` should remain.

Tests: synthetic resident supply-only gives one; supply+kitchen gives two; remove either gives failure; add a duplicate of either owner gives failure; inject a legacy clickable without owner but same label gives failure. Repeat around arrival/interior residency boundaries in the in-app browser after normal Continue and walk; preserve the save.

## Walk failure: short offset does not imply short route

`walkTest` tries east +5 first and accepts the first reached BFS result of at least four points. There is no maximum route distance or time estimate. It then allows only 10 seconds total for both legs (`src/smoke.js:120`), measured from before leg one; the timer is not restarted for leg two.

At (160.5,154.5), that first candidate is (165.5,154.5). The start is in the Guide Hall provision bay. The east wall sits at x163 over this z band (`world_v2_building_data.js:69`, `outer_05`), so the target is outside the building. The only exits are around (151,166) and (151,143), not through the east wall (`:40–45`). A cardinal route via the south door alone requires roughly 46–48 tiles by endpoint/door bounds, before detailed furniture detours. At the game's maximum 4.2 tiles/s (`game3_systems.js:198`), even this one-way route is over ten seconds. Walking speed is 2.4 tiles/s. Thus a leg-one timeout here is explained by target selection without requiring a movement bug.

This route-length explanation is a source-derived inference. Exact `computePath` points, actual selected candidate, player movement, and elapsed time must be captured on the follow-up run before declaring runtime navigation sound.

`computePath` returns all cardinal tile centres and `reached` means the target tile was found (`game5_main.js:58–105`). It does not promise a direct path or budget-compatible route. `orderWalk` recomputes the route and uses `pElev` for waypoint heights (`:107–116`); passing y=0 from smoke is not the elevation defect here. For arbitrary fractional starting positions, use the returned final tile centre as the test destination, rather than assuming the offset itself is the exact navigation endpoint.

Recommended local smoke repair:

1. Evaluate all nearby candidates, normalize to tile centres, compute outbound and return paths, and rank by actual cardinal path distance, not candidate order or Euclidean offset.
2. Select a reached pair with a meaningful short movement (at least three edges) that fits the unchanged total budget using conservative walking speed 2.4 tiles/s plus polling/settle allowance. Prefer a nearby interior target. Do not choose a long doorway detour solely because it is first.
3. Keep the real `orderWalk` out-and-back and strict timeout. Record start, target, both path lengths, expected duration, actual end, plane, moveTo/path state, and timeout leg in the result for diagnosis.
4. If no bounded candidate exists, fail with the explicit candidate/path reason. Do not mark pass, teleport to arrival, raise the global budget, or modify the saved character's energy to hide it. If a special tiny room needs separate policy, name and test that case explicitly.

Meaningful tests: a first candidate of 48 edges followed by a later five-edge interior candidate must select the short candidate; exhausted-energy/walk mode must still fit; unreachable candidates are ignored; all-too-long routes fail with diagnostics; fractional starts use tile endpoints; a genuinely stalled follower must still timeout. Then rerun arrival and the reported Guide Hall interior restore in the in-app browser with the same unchanged save and real movement.

## Acceptance boundary

Both reported failures have concrete smoke-assumption explanations. Do not change world geometry, remove duplicate-labelled services, or weaken movement limits on this evidence. Fix the assertions/selection, then use in-app runtime evidence to distinguish any remaining navigation defect from test behavior. Fresh PASS105 alone never established arbitrary-restored-position coverage.
