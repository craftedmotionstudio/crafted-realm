# Test Travel coordinate contract

`Test Travel` is localhost-only reviewer tooling. It never becomes player travel and is not part of game balance.

Coordinate rules:

- X increases east; Z increases south; north is negative Z.
- Plane `0` is the surface, `-1` is an underground room, and positive planes are upper floors.
- Every completed building, basement, dungeon, castle floor, boss room, and active art-review location receives a
  permanent named bookmark in `src/dev_travel.js`.
- Bookmark IDs are stable contracts. If an authored room moves, its existing bookmark is updated rather than
  replaced with a differently named shortcut.
- A destination cannot be entered until its provider, model, and registered floor are ready.
- Personal bookmarks are saved only in the reviewer's browser and can be created with **Save current**.

Open the panel with the on-screen pin button or `F8`. It shows the live X, Z, plane, and world provider. Named
buttons teleport immediately; manual X/Z/plane fields support one-off checks.

Initial permanent destinations:

| ID | Location | X | Z | Plane |
|---|---|---:|---:|---:|
| `holm_guide_apron` | Guide Hall arrival | 151.00 | 169.00 | 0 |
| `holm_guide_interior` | Guide Hall central aisle | 151.00 | 162.50 | 0 |
| `holm_workyard` | Survival Workyard trail entrance | 113.70 | 158.25 | 0 |
| `holm_workyard_hatch` | Workyard cellar hatch | 110.35 | 153.35 | 0 |
| `holm_workyard_cellar` | Basement ladder landing | 325.95 | 302.47 | -1 |
| `holm_workyard_chest` | Basement reserve chest | 326.50 | 303.50 | -1 |
| `holm_departure` | Departure dock | 206.50 | 151.50 | 0 |
| `veyhollow_ferry` | Veyhollow ferry landing | 0.00 | 18.00 | 0 |
| `hollow_well_square` | Hollow Well Square | 0.00 | 0.00 | 0 |

Wardenholm bookmarks are exposed only in the legacy reference world. They will be replaced by production
bookmarks when the castle is rebuilt in World V2.
