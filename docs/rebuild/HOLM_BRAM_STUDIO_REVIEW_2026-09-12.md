# Bram Blender candidate: in-app review

Status: draft, not accepted or published. The full island goal remains active.

Actual Blender source: `tools/blender/build_guide_bram_overhaul_v1.py`.
Editable candidate: `.studio-workspaces/guide-bram-overhaul-v1/candidates/bram.blend`.
Export manifest reports 2,556 triangles, one skinned mesh, nine material primitives,
1.90 tile height, and Idle (3s), Talk (3s), Walk (1s) clips.

New `tools/studio_bram_overhaul.html` loads that exported GLB in the in-app browser.
Its buttons switch real AnimationMixer clips; portrait and overhead views allow
shape and gait review without creating any live tutorial state or NPC placement.

Direct review against `Bible_References/Character/male_concepts/male_b_turnaround.png`:

| Criterion | Finding |
| --- | --- |
| Silhouette/proportion | Human outline and boots are readable; head/neck transition and shoulder cap feel rigid. |
| Shape hierarchy | Mantle, belt and book satchel distinguish the guide; sleeve-to-mantle join needs a softer authored profile. |
| Color/material separation | Olive, ochre and brown separate clearly; hair is less grey in browser lighting than the Blender proof. |
| Reference-defining features | Flat-shaded original medieval clothing is consistent with the reference; garment forms are still more rigid. |
| Gameplay-camera readability | Mantle and satchel remain legible in the overhead inspection view. Actual settlement context remains untested. |
| Animation/interaction | Idle, Talk and Walk loaded and switched through pointer controls with no console errors. Talk gesture reads; Walk remains stiff and foot planting is not accepted by screenshots. |
| Family consistency | Palette fits the arrival work; side-by-side settlement acceptance is pending. |

No 9.0 acceptance score is claimed. Screenshot evidence is stored beside the candidate
as `studio-gameplay.png`. A banked comparison sheet and live context review remain
required before acceptance. Next Blender revision should refine shoulders and gait;
NPC dialogue, navigation and progression integration remain separate unfinished work.

Foreground live smoke (disposable qaProfile bram-studio-20260912): FAIL on performance, 28 FPS versus 45 minimum. Boot 2650ms, 105/105 structural checks, real walk out/back, six streaming boundaries and exact save/load all passed; zero console errors. No live code changed in this inspection pass. Existing variable frame delivery remains unresolved.
