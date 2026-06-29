# Crafted Realms — OSRS Content Scope & Art Plan

Goal: understand the *quantity* of content OSRS has (items, scenery/"blocks", NPCs, map
chunks) so we can plan how much of "our own version of everything" we're really signing up
for — then tackle it in prioritized waves with the local SF3D pipeline.

## The raw numbers (sourced)

| Category | Raw cache IDs | Catalogued / unique | What it means for us |
|---|---|---|---|
| **Items** | ~20,000–30,000 IDs | **12,364** documented (OSRSBox) | inventory icons + ground/equipped models |
| **NPCs / monsters** | ~14,000 NPC defs | **1,089** unique monsters (OSRSBox); ~2,500 combat variants | characters + creatures |
| **Objects / scenery ("blocks")** | ~40,000–58,000 loc IDs (est.) | ~3,000–6,000 visually unique (est.) | trees, walls, doors, furniture, rocks, fences, signs… |
| **Map regions ("chunks")** | 64×64-tile **mapsquares**; ~800–1,000 populated (est.) | — | each region = 4,096 tiles; player "chunk" = 8×8 = 64 tiles |

Sources: OSRSBox items-summary.json = 12,364 entries; monsters-wiki-page-titles.json = 1,089;
README "20K+ items / 2.5K+ monsters"; OSRS Wiki *Game square* (region/chunk hierarchy).
Exact object + region counts require dumping our own cache via RuneLite (precise method).

## The honest reframing: raw IDs ≠ art workload

Raw cache counts are **massively inflated by variants** that share (or recolor) one model:
- noted versions, charged/uncharged, degraded armour stages (e.g. Barrows = 4 stages ×4 pieces),
  holiday recolors, "broken" states, placeholder/null IDs, every door rotation & open/closed state.
- So 30K item IDs collapse to maybe **~5,000–8,000 visually-distinct items**; 58K loc IDs to
  **~3,000–6,000 unique scenery**; 14K NPC defs to **~2,000–3,000 unique characters**.

**Realistic "make our own version" universe ≈ 10,000–17,000 unique assets** if we ever did *all* of it.
That's a multi-year catalog — so the game is **prioritization**, not "do everything at once."

## Why this is now tractable for us

The local SF3D pipeline is **unlimited** (no quota, ~10s/asset on the RTX 4070). The bottleneck is
no longer generation — it's **prompt authoring + art review/curation**. Throughput is gated by how
fast we can write good sprite prompts and judge results, which we can batch heavily.

## Art-direction fix: less realistic, more "cozy OSRS"

Current SF3D output looks slightly too painterly/realistic and pops out of the flat-shaded world.
Bake these into the pipeline:
1. **Cozier sprite prompt** — "flat 2007 RuneScape texture, simple banded colors, minimal shading,
   low detail, matte, slightly desaturated, NOT photorealistic."
2. **Posterize/flatten post-step** — downscale baked texture to ~256px + quantize colors → kills
   realistic gradients, gives the hand-painted look that blends.
3. **1:1 reference compare (NEW workflow gate)** — for each asset, pull the official OSRS reference
   (OSRS Wiki has predictable image URLs) and render ours beside it. Accept only when it reads as
   "clearly our own, but close, and cozier." This is iterative across the catalog.

## Proposed wave plan (prioritized, smallest-first)

- **Wave 0 — re-tune style** (now): redo the existing 9 props with the cozy prompt + posterize,
  side-by-side vs OSRS refs. Lock the look before scaling.
- **Wave 1 — starter-area essentials** (~40–60 assets): the props/scenery a new player sees first
  (logs, ores, fishing spots, basic trees, fences, signposts, common food, tools, low-tier gear).
- **Wave 2 — common items** (~300–500): everyday inventory items + icons (runes, potions, bars,
  planks, gems, common weapons/armour tiers).
- **Wave 3 — scenery library** (~200–400 unique): the "blocks" that build towns/dungeons.
- **Wave 4 — NPCs/creatures** (~100–200 to start): low-level monsters + townsfolk (note: these
  need the rig — different pipeline from static props; revisit procedural vs image-to-3D per type).
- **Ongoing** — fill the long tail by region as we build out the map.

Numbers above are targets to refine; exact cache counts can be dumped from RuneLite when we want
precision. See [[prop-pipeline-image-to-3d]] and ROADMAP.md.
