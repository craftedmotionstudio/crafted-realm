# Departure Haven v1 (M4.4) — candidate report

- Triangles 18,916; materials 20; 22 meshes / 88 primitives; no textures or emission. Clip `HavenBoatIdleBob`.
- Local bounds x -2.5..17.9, y -4.45..6.24, z -6.23..4.15.
- Intended world placement: x 124, pad y 2.00 (samples 1.86-2.05), z 103, no rotation. The pier runs +x (east),
  because the sea starts at world x 133 (sea surface y -0.12); the plan outline's north-south pier did not meet water.
- Layout: 3-wide lane; deck 0.15 over a fieldstone abutment (x -2.5..8), five treads (0.2 rise, 0.45 run), landing
  stage at -1.05 over sea tiles (x 10.25..17.5) with a T-head crane; hipped-thatch waiting shelter north of the pier
  root; clinker single-mast ferry moored at a gap in the landing's south rail, gangplank and ropes to bollards.

## Services and targets
| Mesh / place | Target | Local stance |
|---|---|---|
| `Haven_ServiceBoat_` | boat | (14.5, -1.05, 0.5) |
| `Haven_ServiceNotice_` (notice board + bell) | notice | (-0.5, 0.15, -0.5) |
| pier root on dry land (extractor start) | shore | (-4.5, 0, 0.5) |
| inside the shelter | shelter | (2.5, 0.15, -3.5) |

## Extractor
`[BUILDING_NAVIGATION] haven {"nodes": 167, "undirectedEdges": 262, "reachableNodes": 167, "targetsReachable": 4, "targetsTotal": 4, "complete": true}`

## Self-review (agent)
1. Reads as the Port+Dock reference: long plank pier on pile bents, post-and-rail, notice board, barrels and crates
   off the lane; stepped drop, abutment and crane keep it distinct from the arrival dock.
2. Shelter and mooring describe different uses; the lane stays open.
3. The ferry reads well: sea-green sheer strake, clinker planking, mast, furled sail, oars, rudder, gangplank.
4. Weak: thatch slightly shingle-like up close, busy ridge; the notice board's roof is small at gameplay distance.
5. Weak: land-level deck boards are plain; the upper pier stands ~2.1 above the sea and may read tall. East-facing
   pier needs eyes-on confirmation at placement.
