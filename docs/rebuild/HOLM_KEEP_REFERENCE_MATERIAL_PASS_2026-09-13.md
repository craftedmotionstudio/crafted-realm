# Keep reference material pass

Status: unpublished v5 Blender candidate; full goal active.

The v4 castle’s dark masonry and rigid roof tile pattern were identified in direct reference review. New original 128px textures use lighter neutral gray courses, restrained stone relief and warm directional reed fibres. In-app review caught fibres running across the main roof; Blender UV mapping was corrected so fibres descend its pitch. Roof UVs changed deliberately; no navigation geometry changed.

Source: tools/blender/build_holm_keep_reference_materials.py. Candidate: .studio-workspaces/holm-warden-keep-v5/candidates/keep.blend and keep.glb. Final GLB SHA256 f49266fb56018f31d0d7916a9cc111e4c257e2069f4c65df9892e8155f6a0276;578312bytes;7222triangles;30primitives;3embeddedtextures. Blender session34726 completed with both export and render. V4 remains preserved.

Verification: authoring vertices/faces identical; tools/verify_holm_keep_material_geometry.py independently compared every exported position/normal/index accessor and scene transform against v4. UVs are intentionally excluded from that navigation-equivalence check. Only after equivalence passed was the measured graph transferred to navigation-v4 with the new exact model hash. All7targets and59514followerinterpolation checks pass. No new movement geometry, obstacles or floor connections were introduced.

Studio direct review at settled exterior and overview: silhouette/proportion8.4, hierarchy8.4, color/material separation8.6, reference features8.3, gameplay-camera readability8.4, animation/interaction7.5, family consistency8.3. Provisionaloverall8.3, not accepted. Gray stone is now much closer in value; roof fibres follow pitch. Remaining weaknesses: castle courtyard/gate are bare, window openings lack inhabited detail, no working animated doors, and the bakehouse/environment still need final material-family comparison. Low-poly connected volumes remain distinct and legible. No9.0 claim.

Banked direct Studio/reference comparison: Bible_References/Complete/_compare/holm-keep-v5-studio-reference.png. Close evidence scratchpad/holm_perf/keep-v5-reference-materials.png. Studio loaded without console errors. Ordinary foreground smoke recorded after this edit separately; it tests regression safety, not unpublished castle integration.

All three keep Studio views now point to v5; walking view verifies exact model and terrain hashes. Live provider and saves are unchanged. Remaining full goal includes complete island content, NPCs/items/services/progression, final art gates and actual game integration.

FinalforegroundsmokePASS105/105,boot1111ms,realwalk1886ms,sixchunkboundariesexact/losslesssave,60FPSworst28ms124draws34270tris6tickszeroerrors. TerrainStudio settledridgev5verifiedandbanked scratchpad/holm_perf/keep-v5-ridge.png;46habitatinstances. Stone reads lighter but sun/shadow makes islandcontext darker than isolatedStudio; furtherfamilylightingreview remains.
