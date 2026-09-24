# Bakehouse character v3 — unpublished Blender candidate

Built with Blender 4.5 from the editable v2 bakehouse. The owner's gray masonry clarification governs this pass: large exterior fields now use neutral gray stone, with warmth supplied by golden reed thatch and brown oak. Quiet limewash remains on interior wall faces. The L footprint, recessed court, tall occupied house, low pantry and hollow chimney remain.

Original four 128 px textures were authored locally and packed into the GLB. No reference pixels were copied. Stone uses broader courses with muted seams and uneven tones. Roof faces have small modeled undulations and pitch-aligned reed fibres. The pantry and baker's upper casement have paired oak shutters.

Outputs: `kitchen-character.blend`, `kitchen-character.glb`, `kitchen-character.contract.json`, `kitchen-character-exterior.png`, and four texture PNGs. Builder: `tools/blender/build_holm_kitchen_character.py`.

Blender exited 0. Automatic assertions compare every original non-roof mesh vertex exactly against v2, preserving the 16 treads, floor aperture, doorway geometry, furniture and passage dimensions. Finite vertices, 20k triangle / 24 material ceilings and exactly four internally embedded GLB images passed. Actual: 5,824 triangles, 12 materials, 545,676 GLB bytes. The contract records source/base/GLB hashes and retained geometric measurements.

The added `Kitchen_Shell_Shutters` and `Kitchen_UpperShell_Shutters` meshes follow existing cutaway families. All earlier mesh names remain. The new boards are exterior-only; they do not narrow doors or alter floors. Static shutters are shown open; hinge animation has not been implemented.

Direct Blender-render inspection confirms material separation, substantial masonry, readable window rhythm and differing wing heights. The stone is still regular coursed masonry and the roof silhouette refinement is restrained. This report assigns no visual acceptance score. Main-session settled Studio comparison, gameplay camera readability, runtime navigation, station/lesson/door/fire animation, saving, Safe Publish and full island acceptance remain outstanding.
