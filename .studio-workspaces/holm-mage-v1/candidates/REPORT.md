# Mage House & tower v1 (mage, prefix Mage_) — candidate, not owner-accepted
Source tools/blender/build_holm_mage_v1.py -> mage.glb / mage.blend. Proofs scratchpad/holm_mage_v1/ (6 views + sheet.png,
renderer tools/blender/render_holm_mage_v1_views.py). Nav spec docs/rebuild/holm-overhaul/buildings/mage.nav.json.
Triangles 24,531 / 25,000; materials 20 / 20 (diffuse_color only, no emission); 20 meshes.
Plan bounds about 14.7 x 14.6 tiles including the yard; 14.4 tall to the finial.
Tower: octagon, vertex radius 4 round local (2,-1), 0.4 stone walls, floors 0 / 3.0 / 6.0, 2.8 clear ceilings, cone eave 7.95, apex 12.5.
Wing: one storey, wall plate 2.9, ridge 5.1-5.25.
Doors: west main 2.0x2.3 (double leaves, open), wing->tower 2.0x2.3, yard door 1.6x2.3, gate 1.84 clear.
Stairs: 13 risers of 0.231, run 0.40, width 1.2 (Mage_StairLibrary, Mage_StairObservatory).
Placement: x=114, y=6.15, z=58. Measured pad 6.00 (x 107-121, z 51-64), ground floor 0.15 above it, no steps needed.
Main door faces west onto the arrival path at (108,58); yard south of the study wing (x 107-113, z 62-66), gate to the
south road on x=114; north ascent at (114,51) kept clear.
Services -> targets: Mage_ServiceRuneTable_Workroom -> runes (2.5,0,0.5); Mage_ServiceLectern_Library -> lectern (2.5,3,1.5);
Mage_ServiceTelescope_Observatory -> observatory (3.5,6,-1.5). Also entrance/start (-7.5,-0.12,0.5) and yard (-3.5,-0.13,6.5).
Extractor: nodes 311, edges 464, reachable 299, targets 5/5, complete true.
Model fixes: flush tread nosings; exit-side stringers and rails stop short of the top tread.

Self-review (agent):
1. Gray octagonal stone tower with an open timber gallery under a big ochre thatched cone, thatched pent round its lower
   east faces, split-rail fencing; tower (12.5) and wing ridge (5.2) clearly different heights.
2. The wing has a crooked hip with a skewed falling ridge, a cross gable over the west door, stone base under timber-framed
   plaster, stepped chimney, shutters and a stone lean-to link.
3. Weak: thick ragged thatch courses still read a bit like big shingles.
4. Weak: most of the plan's link volume falls inside the tower's west faces; the stair starts just past the doorway.
5. Weak: budget forced cheaper 10-triangle stones (slightly brick-regular); bookshelves are book blocks; modest magic
   touches (rune circle, rune stones, star-chart table, armillary sphere, brass star finial, telescope).
