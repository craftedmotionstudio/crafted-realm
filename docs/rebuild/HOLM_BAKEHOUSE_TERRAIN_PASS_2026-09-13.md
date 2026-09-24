# Bakehouse terrain placement pass

Status: unpublished Studio composition. Full island goal remains active.

The existing Blender kitchen-character v3 is now placed at world44,4.07,67 in Terrain Studio. Main first tested center46: the pantry entered creek-carved ground down to3.175. Moving to44 preserves creek/terrain geometry while both connected wings meet dry ground. Floor slab thickness0.18 comes from the Blender authoring source; at floor4.07 its underside is3.89. 2032 rendered-triangle samples across main/pantry/entrance range3.935..4.0465, wholly below floor and above slab underside. Threshold rises0.14 above level entrance ground. This is foundation fit evidence, not collision/navigation acceptance.

New tools/stage_holm_bakehouse_placement.py verifies frozen GLB SHA630e893e3efd7138a5cc8219db2e6cc78b56c0787e87a3de62cbd9a9477bf172 and writes .studio-workspaces/holm-bakehouse-placement-v1/candidates/placement.json. No live data or terrain source changed. Terrain loader now adds the actual Blender model to its owned/disposed world group.

Map footprint now matches modeled main room and lower perpendicular pantry. The old proposed route crossed the pantry; it now passes west atx37 with a separate southern entrance spur to45,69. All revised design segments remain cardinal. These lines remain a design plan, not a traversable runtime route. Habitat regenerated against these paths/footprints, now42placements; removedcrowded oak and grass placement eligibility changed. Avoid rerunning older architecture plan generators without preserving these measured changes.

Direct in-app review: tall main room, low pantry and recessed entrance read clearly beside creek; foundation does not visibly float or penetrate. Vegetation is sparse and entrance unoccluded. Silhouette8.3, hierarchy8.5, materials7.8 (bakehouse darker than revised keep), referencefeatures8.0, landscape readability8.4, interaction/animation6.8 (no actualbakehousewalker/services/fire/doors), family7.8. Provisional8.0, not accepted. Stagedground has no finished yardpath yet. Evidence scratchpad/holm_perf/bakehouse-terrain-placement.png; TerrainStudio consoleerrors empty.

Remaining: measured bakehouse cardinal graph and real-pointer upperfloor/oven/pantry flows, cooking item/station/NPCintegration, door/fireanimation, materialfamilymatch, finishedyard, providerintegration and fullislandrequirements. Ordinary smoke result appended separately.

ForegroundsmokePASS105/105,boot1182ms,realwalk1737ms,sixboundariesexact/losslesssave,60FPSworst21ms118draws33984tris6tickszeroerrors. No bakehouseplayability claim; smokeordinaryprovider.
