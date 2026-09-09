# Lastlight reference-led rebuild v2 — 2026-07-17

## Outcome

Lastlight now follows the six supplied lighthouse references as one coherent playable structure. The rejected transparent four-storey presentation has been replaced by a closed tapered exterior, three circular interior floors with full-height walls, and a traversable Underkeep dungeon.

## Reference routing

- `Lighthouse_Ref1.png` — exterior silhouette, gallery, lantern crown and opaque tower contract.
- `Lighthouse_entrance.jpg` — fitted player-scale side entrance and hinged-door presentation.
- `Lighthouse_FloorMap.png` — three circular floor maps plus a separate irregular basement/dungeon map.
- `Lighthouse_Interior.png` — keeper bed, dresser, fitted timber floor and wall lantern language.
- `Lighthouse_Interior2.png` — full-height circular walls, cozy bookshelf room and elevated interior camera.
- `Lighthouse_Dungeon.png` — grey wet cave, tidal water, moss, ledges, stalagmites, stalactites and visible depth.

## Playable structure

1. **Ground floor:** storm stores, side-stored dinghy, life rings, tackle, barrels, first ladder and working Underkeep hatch.
2. **Keeper's room:** bed with pillow and blanket, dresser with fitted drawers, bookshelf and books, desk, charts, windows and two ladder sockets.
3. **Lantern room:** beacon lens, animated flame, lever, gallery furnishings and return ladder.
4. **Underkeep:** isolated underground plane at far-map coordinates, irregular floor, raised rock shelves, tidal pool, moss, wet stones, geological formations, wall lights and a real return ladder.

The trapdoor now opens and descends into the Underkeep. The return ladder was pointer-tested from the dungeon and returns to the visible ground-floor hatch. Both interaction anchors were aligned to their Blender models after live testing found a coordinate-conversion offset.

## Minimap

The minimap cache key now includes the active plane. Lighthouse floors render as circular room maps with ladder, hatch and lever markers. The Underkeep renders as its own irregular grey cave with the tidal pool and return ladder, following the supplied floor-map reference without copying its exact layout.

## Asset and visual gates

- Blender source: `assets/blender/environments/holm_lastlight_lighthouse_v1.blend`
- Runtime GLB: `assets/models/environments/holm_lastlight_lighthouse_v1.glb`
- Manifest: `assets/manifests/holm_lastlight_lighthouse_v1.json`
- Asset Factory: PASS — 24,993 triangles, 96 primitives, 36 materials, 1,690,428 bytes.
- Exterior cardinal review: PASS, Codex 9.1.
- Underkeep cardinal review: PASS, Codex 9.0.
- Comparison sheets:
  - `Bible_References/Complete/_compare/holm_lastlight_lighthouse_v2_compare.png`
  - `Bible_References/Complete/_compare/holm_lastlight_underkeep_v1_compare.png`

## Live QA

- Corrected entrance door was reviewed at player scale after the first live view showed it was too tall.
- Real-pointer door interaction opened the hinged door and entered the ground floor.
- Real-pointer Underkeep return ladder moved the player back to the ground-floor hatch.
- Real-pointer ground-floor hatch descended to the isolated Underkeep.
- The isolated dungeon removed the surface-tree leak discovered during live review.
- Final foreground smoke: PASS — 101/101 structural checks, 100 FPS, 16 ms worst frame, 106 draw calls, 11,100 sampled triangles, zero console errors.

## Deliberate next slice

The dungeon is a proven environment and circulation foundation, not yet a quest or combat space. Its eventual creatures, loot, puzzle and lighthouse-story purpose should be authored only after the three-floor lighthouse loop receives user visual approval.
