# Visual Baseline — 2026-06-30 (before/after anchor)

The "before" snapshot so we have real visual proof, not "I think it changed."
Re-shoot the *after* the same way and diff against this.

## Build identity (exactly what was on screen)
- **Branch / commit:** `crafted-realm-sprint @ 2553ccd` (the on-screen build stamp confirms it)
- **Working tree:** had uncommitted pipeline changes (stamp showed `✎`) — review-surface
  files (`serve.ps1`, `serve.bat`, `index.html` stamp, `REVIEW.md`, this file).
- **Build URL / path:** `http://127.0.0.1:8777` via `serve.bat` (this session used a temp
  port 8801 only because an elevated zombie still held 8777 — see REVIEW.md).
- **Captured:** 2026-06-30 ~07:58, in-browser via Claude-in-Chrome MCP.

## How to reproduce this exact baseline
1. `serve.bat` → open the URL → **New Adventurer** → Begin → **Click here to play**.
2. In-world, press **`Shift+A`** → the Animation Showcase spawns one labelled rig of every
   archetype (Sword · Bow · Staff · Wolf · Crawler · Crab · Brute) + the player.
3. The Ash Wyrm dragon is visible to the north-west of the showcase fan.
4. Use the showcase buttons (Walk / Slash / Block / Death / …) to judge *motion* — stills
   can't show sliding/readability; the live buttons can.

## What changed today (overnight push — see OVERNIGHT_CLOSENESS.md)
Whole **procedural animation system** landed (committed in `2553ccd`):
per-archetype walk gaits, block/parry poses, per-archetype death styles, a combat-ready
stance, the Ash Wyrm skeletal GLB rig drive, worn armour on humanoid NPCs, the `Shift+A`
Animation Showcase itself, and headless QA harnesses for each. Boot is clean (only benign
THREE `'map' undefined` warnings, no errors/404s).

## What looks GOOD (baseline read)
- World/art direction holds the cozy low-poly OSRS look; starter area (pond, trees, props)
  reads well. Login screen art is strong.
- Dragon **silhouette** is a clear dragon: charcoal body, glowing lava-crack markings, bat
  wings, horned head.
- The Showcase is a genuinely strong review lab — one keypress, every archetype side by side.

## What still looks BAD / needs work (honest baseline)
- **Humanoid variety is thin:** the Staff and Sword archetypes are near-identical green
  goblins/orcs; only the Bow (a skeleton) reads differently. The weapon archetypes don't
  yet sell three distinct fighters at a glance.
- **Player scale/proportion:** the Adventurer reads small and a bit stiff next to the orcs —
  the scale-vs-NPC concern is real and visible.
- **Wolf is hard to read** at showcase distance (small, low to the ground).
- **Dragon at distance is hazy** (atmospheric fog) — needs a closer controlled shot to truly
  judge proportions/movement; silhouette is good but the in-world read is muddy.
- **Motion not yet proven by eye:** sliding/cardboard/paper-doll movement can only be judged
  live (Showcase Walk button) or via a recording — not captured here yet. This is the next
  gate.

## Next visual gate (planned)
A starter "showcase pen" (Priority 4) so every creature is placed, spaced, and labelled in
the actual world for walk-up inspection + movement/scale judgement — instead of hunting the
map or relying on the debug fan.
