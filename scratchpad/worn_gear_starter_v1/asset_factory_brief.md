# Starter Worn Gear Family (first-hour held equipment) — Asset Factory v2 brief

- Asset ID: `worn_gear_starter_v1`
- Status: `in-production`
- Gameplay role: The six modelled held items the first hour actually uses - bronze hatchet (chop), bronze pickaxe (mine), bronze sword and forged bronze dagger (melee), worn shortbow (ranged trial), wooden shield (block), bronze helm (head) - replacing every procedural instance via the gearMesh router: worn on the character, on the ground, and in NPC hands
- Canonical scale fixture: 1.85-tile player, one-tile grid, gameplay camera

## Scale must pass before detail

| Measurement | Minimum | Maximum |
|---|---:|---:|
| sword overall length | 0.95 | 1.15 |
| hatchet overall length | 0.6 | 0.78 |
| pickaxe head span | 0.45 | 0.62 |
| dagger overall length | 0.42 | 0.56 |
| shortbow height | 0.85 | 1.02 |
| shield diameter | 0.58 | 0.72 |
| largest grip radius | 0.028 | 0.05 |
| helm width | 0.38 | 0.48 |
| helm height | 0.28 | 0.4 |

## Required semantic parts

- `worn_gear_starter_v1`
- `gear_hatchet`
- `gear_pickaxe`
- `gear_sword`
- `gear_dagger`
- `gear_shortbow`
- `gear_shield`
- `gear_helm`

## Proof order

1. Purpose and human scale beside the canonical player
2. Forged-head silhouettes: bearded hatchet bit, crescent pick, fullered sword
3. Grip and wrap readability at gameplay camera distance
4. Material separation: tier bronze vs brighter honed edges vs wood, leather, iron
5. Worn shortbow stave taper, string, and repair band
6. Shield plank construction, riveted rim, and boss
7. Helm dome/brow-band/cheek-guard readability at head scale
8. Per-item cardinal turnarounds
9. Final concept-to-Blender comparison

## Cardinal installed-contact proof

- Render and inspect the installed object from north, south, east, and west.
- Bank the contact sheet at `scratchpad/worn_gear_starter_v1/turnaround_sheet_family.png`.
- Record the collision audit at `scratchpad/worn_gear_starter_v1/turnaround_review_family.json`.

## Integration contract

- room: held equipment on the player character (procedural rig handR grip and GLB-avatar GearFit), ground drops, NPC hands
- placement: src/gear_models_v1.js wraps the global gearMesh(id) router: MODEL_MAP axe/pick/sword/bow/shield plus ID_MAP bronze_dagger; every tier of a mapped class recolors the CR_GEAR_METAL* materials via METALS[tier]; unmapped models keep the procedural builders (fail-soft)
- collision: Held items add no collision anywhere.
- interactions: No new interactions. The items ride the existing animation contract: swing(player, slash/stab/crush) for combat, swing(player) for woodcutting/mining gathers, holdWeapon on the procedural rig, GearFit bone attachment on the GLB avatar.
