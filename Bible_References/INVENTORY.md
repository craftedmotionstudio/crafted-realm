# Reference Inventory (the Reference Inventory Rule, PIPELINES.md)

Every visible object per reference → have / missing → pipeline → status.
Bar: both reviewers ≥9.5/10 per modeled item (user, 2026-07-03).

## Stall.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Market stall (posts, planked counter, sagging striped canvas) | ✅ NEW `assets/models/stall.glb` | Prop | Claude 9.5 — Gemini gate noisy (fell 6→3 w/ pixel-false claims); AWAITING USER EYES |
| Gravel path / grass tufts (background) | ✅ (plaza tendrils, tufts) | — | done |

## Town_Square.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Quatrefoil stone fountain | ✅ `fountain.glb` | Prop | done (v2 scrolling water) |
| Market stalls (striped canvas) | ✅ `stall.glb` | Prop | see Stall.jpg row |
| Grey-stone buildings, green trellis windows | ⚠️ partial (bank is stone; trellis windows MISSING) | Kit | queued — General Store pass |
| Big leafy trees | ⚠️ have procedural `makeTree` (weak vs ref) | Prop (Hunyuan) | queued — Tree1/Tree2 |
| Fenced garden plots (green fenced squares) | ❌ | Kit/Prop | queued |
| Rubble / ruined wall stubs | ❌ | Prop | queued |
| Street lamp posts | ✅ (pass 016 lamps) | — | done |
| NPCs / players | ⏸ depopulation law | NPC | on hold until green light |

## General Store.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| White stone-block lower walls + tan plaster | ❌ (our walls are timber/plaster) | Kit | queued — store style pass |
| Green trellis/leaded windows | ❌ | Kit | queued |
| Tall shop shelving w/ goods (bottles, jugs, plates) | ⚠️ have plain `shelf`; goods variety missing | Prop | queued |
| Crates (stacked, stenciled) | ✅ crate + crate.glb | — | done |
| Shop counter | ✅ counter piece | — | done |
| Stools | ✅ | — | done |
| Step-ladder (freestanding A-frame) | ❌ (queued Ladder.jpg is wall ladder) | Prop | queued |
| Hanging sacks/bags on walls | ❌ | Prop | queued |
| Hanging candle sconce | ⚠️ candle exists; hanging variant missing | Prop | queued |
| Wall planters/hanging baskets (exterior) | ❌ | Prop | queued |
| Interior door (wood, gold handle) | ❌ (our doors are plain slabs) | Prop | queued — Closed/Open Door.jpg |
| NPCs (shopkeeper, customers) | ⏸ depopulation law | NPC | on hold |

## Ladder.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Wooden rung ladder (round rails/rungs) | ⚠️ Planes ladders exist but plain | Prop | queued next |
| Blue patterned rug beneath | ❌ | Prop | queued |
| Monk NPC | ⏸ depop law | NPC | on hold |

## Closed Door.jpg / Open Door.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Plank door w/ frame + gold handle (closed + open states) | ⚠️ makeBuilding has working doors, plain slab look | Prop | queued — upgrade panel to reference |

## Tree1.jpg / Tree2.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Big layered-canopy oak (Tree1) | ⚠️ procedural makeTree weak | Prop (Hunyuan) | queued next after ladder |
| Small young tree (Tree2) | ❌ | Prop (Hunyuan) | queued |

## Character.jpg
| Item | Have? | Pipeline | Status |
|---|---|---|---|
| Elder in blue/gold coat | ❌ | NPC Pipeline | queued (concept→Hunyuan→crpipe rig) |
| Wooden handcart w/ sacks (background) | ❌ | Prop | queued |
