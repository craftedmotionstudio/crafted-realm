# Lastlight Functional Circulation v1 — 2026-07-17

## Outcome

Lastlight now has a locked player-scale circulation contract before detailed art begins:

- 21-tile exterior diameter and 17.6-tile usable interior diameter.
- A 2.4-tile door and threshold control with a camera-readable click silhouette.
- A 64-tile cardinal spiral rising from 14.25 to 26.05 world units. Every rendered tread is also a real plane-aware walk surface.
- An unobstructed west-side gallery landing; the rejected center landing inside the support column was removed.
- A 10.4 × 10.4 accessible top platform with ordinary click-to-walk movement and a return stair control.
- A roughly nine-tile-wide Lastlight land approach.
- Tidebridge widened from a 3.5-tile deck to a 6.5-tile usable deck, with rail lines moved outward and a permanent landscape acceptance lock.

This is a **functional proving blockout**, not accepted release art. The final lighthouse must be authored in Blender without shrinking or breaking these dimensions, semantic sockets, planes, or walk surfaces.

## Real-pointer QA

The live browser test used actual pointer input rather than direct function calls:

1. Test Travel to `Lastlight Beacon — summit door`.
2. Click the threshold stair control and enter plane 1.
3. Walk the visible stair treads around the full spiral in cardinal segments.
4. Reach the open gallery landing at X 193.5 / Z 112.5.
5. Click the landing control and transition to plane 2.
6. Click across the top platform and confirm ordinary movement.

Named Test Travel bookmarks now cover the approach base, summit door, spiral start, gallery landing, and lantern gallery.

## Visual review

- **Silhouette / proportion:** functional footprint and platform scale pass; release silhouette deferred.
- **Shape hierarchy:** entrance, spiral, landing, and gallery read as separate circulation layers; tower shell is still a primitive blockout.
- **Color / material separation:** sufficient for testing only; no release material approval.
- **Reference-defining features:** lantern room, masonry character, windows, roof, railings, and hand-designed details remain for the Blender pass.
- **Gameplay-camera readability:** stairs and top movement pass. The exterior shell can occlude the camera at close range and therefore fails the final-art gate.
- **Animation / interaction readability:** threshold and gallery transitions pass. Stair-climb character animation and final beacon animation remain open.
- **Family consistency:** not judged until the lighthouse and bridge are replaced by final Blender assets.

Evidence is stored in `scratchpad/lastlight_circulation_v1/`.

## Automated gates

- World v2 / landscape / flow contract: PASS.
- Content validation: PASS, 177 items.
- Syntax and diff checks: PASS.
- Foreground smoke: **101/101**, 60 FPS, 20 ms worst frame, 161 draw calls, 7,300 triangles, zero console errors, exact save/load.

## Next art slice

Create the Lastlight visual anchor and final Blender asset around this circulation contract. The asset may improve proportions and consolidate render calls, but it may not reduce the door, interior clear diameter, stair clear width, landing clearance, top walk area, approach width, or Tidebridge usable width. The next acceptance must include north/east/south/west exterior renders, interior stair renders, top-platform renders, in-game cardinal views, collision review, and a comparison score of at least 9.0 before release-art approval.
