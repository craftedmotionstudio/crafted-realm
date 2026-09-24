# Warden Keep Blender candidate v1

Original authored source: tools/blender/build_holm_warden_keep.py. Blender 4.5.10 LTS. Local coordinates use Blender X/Y plan and Z up; glTF maps to X/Z/-Y.

Physical model: asymmetric two-story west teaching hall, low connected north stores, open courtyard, south gate passage, upper gallery to east wall walk, tall hollow octagonal watchtower and smaller roofed octagonal turret. Purposeful contents include teaching table/parchment/benches, training spear rack, stores chests/counter, guard beds and upper map desk. No live world installation.

The high tower moved north, and the eastern turret moved east, to prevent solid overlapping rooms in the concept plan. The plan stair turret was replaced with a real straight internal hall flight. Plan/local extents consequently differ; inspect contract before world placement.

Measured export: 4,074 triangles; 20 merged mesh primitives; 9 materials; 3 original embedded 128px textures; 359,936 GLB bytes. SHA256 3b35a22df01db975ca25804367541c4bc63f76b34137d92ce1524fa09220bf59.

Geometry assertions run automatically during authoring: 16 tread widths and heights measured from actual mesh vertices, 0.20 rise, 0.30 depth, 1.60 tread width. Actual upward scene rays at each tread center give minimum headroom 4.29215. All 8 doorways pass 120 scene raycasts (five width and three height sample fractions), including shared tower wall geometry and parapets. An initial gallery parapet obstruction was detected and corrected by widening the connecting galleries. These sampled local aperture checks do not prove avatar collision clearance or runtime cardinal routing.

Deliverables: keep.blend, keep.glb, keep.contract.json, keep-exterior.png, keep-cutaway.png, keep-stone.png, keep-wood.png and keep-shingle.png.

Unfinished: watchtower upper floors/stairs/roof access; upper turret/wallwalk connection (current north wallwalk stop is closed); door leaves and animation; full furnished room inventory; station/NPC/lesson bindings; runtime nav/collision/save testing; world placement and Safe Publish. No reference-quality score or final acceptance claimed. First exterior review shows a clear unequal skyline and substantial gray masonry but roof/stone remain overly regular and dark, and the gate roof gallery needs purposeful character. Main integrator owns real Studio review and subsequent acceptance.
