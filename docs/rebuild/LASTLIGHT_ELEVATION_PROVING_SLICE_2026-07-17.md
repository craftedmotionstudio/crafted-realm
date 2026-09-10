# Lastlight elevation proving slice — 2026-07-17

## Outcome

Tutor's Holm now has a curriculum-aligned elevation contract and a browser-proven high landmark foundation. Lastlight Beacon is the planned graduation capstone: after the release curriculum, the player will relight it to call the mainland ferry. The player remains free to roam; this is a tutorial-island release gate, not a mandatory mainland campaign.

This pass establishes geography and traversal only. The beacon building, relighting interaction, animation, sound, reward, and boat-gate wiring are deliberately not claimed as complete.

## Objective alignment

| District | Tutorial purpose | Elevation intent |
| --- | --- | --- |
| Arrival Cove | movement, inventory, dialogue | sheltered sea-level arrival |
| Survival Wood | woodcutting, firemaking, fishing, cooking, water | gentle rolling ground |
| Lesson Green | quests, shops, bank, homestead preview | readable civic plateau |
| Quarry Rise | mining, smelting, smithing | production rise above the green |
| Warden's Ridge | combat, prayer, drops, banking | higher-risk ridge |
| Mage Headland / Lastlight | magic, beacon, graduation | island high point and final view |

This supports the game's current objectives: an OSRS-readable first hour, useful 15–30 minute progress, a purposeful open world rather than random scatter, and a tutorial that teaches systems before the boat unlocks.

## Authored result

- Lastlight crown: approximately 14 world tiles high, with a building-sized level summit.
- Mage Tower: retains a separate level service terrace; the rejected overlapping cliff/spike composition was removed.
- Climb: 40-tile cardinal road wrapping the eastern shoulder, respecting four-direction movement.
- Island silhouette: a new northern land lobe supports the high point instead of stacking height onto the old coast.
- Reviewer travel points: `Lastlight Beacon — switchback base` and `Lastlight Beacon — summit`.
- Curriculum: 11 stations, 18 release lessons, 12 currently live environment/system lessons.

## QA evidence

- Pure world contract: all World V2 locks pass, including district purpose/elevation and Lastlight height/cardinal-climb locks.
- Real browser traversal: minimap click-to-walk from the Mage terrace, around the eastern shoulder, to X203.5 / Z115.5 on the crown.
- Four-direction visual review: banked in `scratchpad/lastlight_elevation_v1/`.
- Visual findings: silhouette, district separation, crown proportion, route readability, and gameplay-camera readability pass for an environment blockout. Close cliff materials and the final beacon socket remain an art pass, so this is not a 9.0 release-art claim.
- Foreground smoke: 100/100; 60 FPS; 20 ms worst frame; 92 draw calls; 5,012 triangles; zero console errors; exact save/load preservation.

## Rejected iterations and lesson learned

1. The first rise gained full height in roughly eight tiles and read as a generated spike.
2. Widening the radius alone still overlapped the flat Mage Tower pad, producing a cliff and a trench.
3. The accepted composition separates the landmarks, gives Lastlight its own land mass, uses a broad crown, and keeps one non-overlapping wrap road.

Landscape height must be composed with nearby building terraces and route topology. Numeric slope checks alone are insufficient.

## Next logical slice

Author the Mage Headland as a safe Studio district transaction, then build one fully designed Lastlight Beacon visual anchor. The beacon slice should include a readable exterior silhouette, an enterable purpose space or explicit service platform, fire/light animation, relight interaction and sound, curriculum completion state, ferry signal response, persistence, four-direction evidence, and foreground smoke. NPC production remains deferred.
