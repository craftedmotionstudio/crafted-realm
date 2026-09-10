# Training Cavern + Core UI closeout — 2026-07-16

## Outcome

The former Training Cavern graybox is replaced by a genuine Blender-authored, open-top mining environment based on the composition lessons in `Tutorial_Island_Mining_Cave_&_Mining_Rocks.jpg`. The core desktop HUD now loads the previously dormant OSRS-directed inventory, chat, combat, and skills treatments. The existing minimap implementation was deliberately preserved.

## Training Cavern

- Expanded the reserved underground envelope from a narrow 40×16 pit to an irregular 44×34 mine.
- Authored a three-part journey: entry gallery, broad ore hall/smithing alcove, and far exit chamber.
- Added a hand-hewn perimeter, layered ochre floor shelves, stalagmites, boulders, timber support arches, pale tin and copper fields, a recessed furnace alcove, and visual anvils.
- Kept the existing curriculum targets and item/action ids exactly intact: copper, tin, furnace, and anvil remain on their locked lesson coordinates.
- Added a visible surface shaft at the Mine Gatehouse and a separate far ladder beside the Combat Hall route.
- The first ladder is down-only and the far ladder is up-only, preserving the approved forward tutorial flow. Only the ladder silhouette is interactive; the floor beneath it remains ordinary walkable ground.
- Added slow animated torch flames and localized light flicker, plus broad warm cave illumination so mining silhouettes remain legible from the elevated gameplay camera.
- The visible source is banked at `assets/blender/environments/holm_training_cavern_v1.blend`; the runtime model is `assets/models/environments/holm_training_cavern_v1.glb`.

The five-view Blender evidence is under `scratchpad/holm_training_cavern_v1/`. The accepted comparison is `Bible_References/Complete/_compare/Training_Cavern_v1_compare.png` with a direct Codex visual score of **9.0/10**.

## Core UI

- Activated the carved/recessed desktop HUD treatment in `src/ui_osrs.js`.
- Activated the two-column combat-style treatment in `src/ui_combat.js`.
- Added `src/ui_reference_finish.js` for a 246 px desktop side panel, free-floating inventory items, compact side orbs, and parchment chat/channel spacing.
- Inventory now reads as one recessed field rather than a wall of heavy slot boxes.
- Combat now has a centered weapon title, combat level, four large style buttons, a red selected state, and separated auto-retaliate control.
- Skills retain their three-column icon/level grid and total-level footer.
- Chat now exposes All, Game, Public, Private, Clan, Trade, Yell, and Report in the reference-like channel bar.
- Mobile behavior is untouched by the finishing rules, which are scoped to desktop widths.
- The current minimap, compass, landmarks, destination marker, and click-to-walk behavior were not replaced.

Accepted UI comparisons:

- `Bible_References/Complete/_compare/UI_Inventory_v1_compare.png` — **9.0/10**
- `Bible_References/Complete/_compare/UI_Chat_v1_compare.png` — **9.0/10**
- `Bible_References/Complete/_compare/UI_Combat_v1_compare.png` — **9.1/10**
- `Bible_References/Complete/_compare/UI_Skills_v1_compare.png` — **9.0/10**

## Real-flow verification

The production interaction path was driven in the browser:

1. Stage at the Mine Gatehouse.
2. Click the visible ladder itself.
3. Arrive underground at `(286, 354, plane -1)`.
4. Review the entry and far chambers at gameplay scale.
5. Click the separate far ladder itself.
6. Surface beside the Combat Hall at `(172, 124, plane 0)`.

The final foreground smoke gate passes **100/100**: boot **1.1 s**, **60 FPS**, **19 ms** worst frame, **153 draw calls**, **32,128 triangles**, seven healthy world ticks, six streamed boundaries, exact save/load position, and zero console errors. `tools/test_world_v2.js`, content validation, JavaScript syntax checks, and `git diff --check` also pass.

The optional login background video request still returns the project's existing network 404 and falls back normally; it does not enter `SMOKE_ERRORS`, affect boot, or affect either accepted slice.

## Next production boundary

Resume U6 whole-room Survival Workyard acceptance or continue the Tutor's Holm curriculum environment-by-environment. Do not expand NPC production until the environment foundation remains stable across the full tutorial route.
