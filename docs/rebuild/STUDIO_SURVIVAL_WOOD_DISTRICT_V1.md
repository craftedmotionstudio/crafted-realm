# Studio Survival Wood District Bundle v1

Date: 2026-07-17  
Status: accepted; live provider byte-equivalent

## Outcome

Survival Wood is the first Tutor's Holm landscape district compiled as one reviewable transaction with its completed
building. The package joins the Workyard placement and building bundle to the district boundary, survival pad, pond,
overlapping routes, terrain-role rows, explicit navigation flags, world-space collision rows, and authored dock walk
surfaces. Live terrain and traversal behavior remain unchanged.

## Compiled contract

The deterministic district bundle contains:

- 30 `8x8` chunks covering the Survival Wood boundary, Workyard footprint, pond edge, and extended dock;
- the `survival_wood` district, `survival_shelter` pad, freshwater pond, and three overlapping route contracts;
- 27 Workyard colliders transformed into world space;
- three dock walk surfaces transformed into world space at the exact runtime height;
- explicit blocked-water tile rows and walk-surface override rows;
- the revision-18 Workyard identity, placement, and checked-in building source/bundle references.

`world_v2_holm.js` now consumes the compiled terrain and tile-flag rows for these 30 chunks. The World V2 gate compares
every live row to the checked-in district bundle byte-for-byte and also compares the complete in-memory runtime bundle.

## Studio transaction

The Workyard Studio profile now opens `.studio-workspaces/survival-wood-district` and registers four files:

1. Workyard placement source;
2. Workyard runtime building bundle;
3. Survival Wood district source;
4. Survival Wood compiled district bundle.

Stage regenerates and verifies all four. Load Published refuses incomplete or drifted packages. The command-line Safe
Publish gate also refuses unregistered references, provider or district drift, and a district building transform that
does not match its building source. The old two-file Workyard workspace is superseded, not silently reused.

## Verification

- World V2 pure-data suite passes all locks, including deterministic bundle equality and live byte-equivalence.
- Studio Safe Publish passes its original transaction locks plus the four-file district and drift-refusal locks.
- Content validation passes with 169 items, 30 NPCs, 10 shops, 10 quests, and 14 zones.
- Real r160 Studio loads the published four-file transaction successfully.
- The first browser run caught a stale cached building-definition script and the smoke lock's old revision-17
  expectation; cache versions and the lock were corrected before acceptance.
- Final foreground smoke passes 100/100 at 60 FPS, 18 ms worst frame, 173 draw calls, 33,160 triangles, six streamed
  boundary crossings, exact save restoration, and zero errors.

## Honest remaining debt

The isolated Workyard preview remains over its authored draw-call budget (248 versus 170). This district migration does
not disguise or expand that art-performance budget. Collision-grid consumption of compiled tile flags is also a later
engine optimization; today the provider owns the reviewed flags while the collision grid continues to sample the same
analytic predicate, which preserves exact behavior.

## Next boundary

Use the same district transaction contract for Lesson Green, beginning with its terrain/navigation package before the
Quest Lodge or Teaching Kitchen is promoted from a planning foundation.
