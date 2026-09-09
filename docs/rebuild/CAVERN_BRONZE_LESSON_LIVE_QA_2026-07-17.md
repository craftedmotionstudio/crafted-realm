# Training Cavern bronze lesson — live interaction QA

Date: 2026-07-17  
Client: desktop browser, real production page at `http://127.0.0.1:8777/`  
Method: visible UI and real pointer interactions; no direct mutation of runtime game state. Administrator tools were
used only to supply the tutorial's Bronze pickaxe and Hammer without altering the tested ores, bar, dagger, XP, or
crafting actions.

## Acceptance path

| Step | Player action | Expected | Observed | Result |
|---|---|---|---|---|
| 1 | Left-click Copper rock with a carried Bronze pickaxe | Character approaches, holds pick, swings, receives copper ore and Mining XP | `You manage to mine copper.`; copper ore appeared; Mining XP increased | PASS |
| 2 | Left-click Tin rock in the north offshoot | Character approaches, mines, receives tin ore and Mining XP | `You manage to mine tin.`; tin ore appeared; Mining advanced to level 2 | PASS |
| 3 | Click the anvil before owning a bar | Explain missing prerequisite without consuming anything | `You need metal bars to smith. The furnace turns ore into bars.` | PASS |
| 4 | Click the visible furnace, then `Smelt a Bronze bar` | Consume one copper + one tin; show furnace action; award bronze bar and 8 Smithing XP | `You smelt a bronze bar.`; both required ores consumed; bronze bar appeared; Smithing +8 | PASS |
| 5 | Click the visible anvil | Open Smithing grid with Bronze dagger as the first level-1 one-bar option | Correct recipe grid opened; higher-level recipes were visibly locked | PASS |
| 6 | Select Bronze dagger | Consume one bronze bar; hammer animation; award dagger and 13 Smithing XP | `You hammer out a bronze dagger.`; bar removed; dagger appeared; Smithing total +21 | PASS |
| 7 | Left-click the forged dagger | Equip it as a real melee weapon | `You wield the Bronze dagger.` | PASS |
| 8 | Reload the client | Preserve tools, gathered ores/crafted state and remain boot-safe | Inventory persisted during defect-fix reloads; smoke stayed green | PASS |

## Defects found and repaired during the live pass

### CR-CAV-001 — visible station and interaction hitboxes were displaced

Severity: Blocker. The Blender station used Blender +Y coordinates as if they mapped directly to Three.js +Z.
The visible furnace/anvil appeared eight tiles away from their semantic lesson targets. Clicking the visible art
walked the player; actionable hotspots existed elsewhere. The Blender source was corrected to account for glTF's
axis conversion, rebuilt, and cache-bumped. Four hover probes now read `Smelt at Furnace` and `Smith at Anvil`
directly over the visible models.

### CR-CAV-002 — tall station proxy prevented crafting completion

Severity: Blocker. Smelting and smithing used full 3D distance to a tall click proxy. Proxy height could keep the
player outside the numeric reach threshold even while standing beside the station. Both actions now use horizontal
tile-plane distance. A regression lock covers the two station thresholds.

### CR-CAV-003 — skilling effects produced repeated Three.js warnings

Severity: Minor. `flatShading` was passed as an unsupported r128 material constructor parameter. It is now assigned
as an explicit property, preserving the faceted effect without warning spam.

## Final regression status

- Complete live interaction path: PASS.
- Cavern crafting contract: 12/12 PASS.
- World V2 and Training Cavern contract: PASS.
- Content validation: PASS.
- Foreground smoke after station relocation/reach fixes: 100/100, 100 FPS, 133 draw calls, zero errors.

The lesson is now accepted based on a real player-facing run, not only data or source inspection.
