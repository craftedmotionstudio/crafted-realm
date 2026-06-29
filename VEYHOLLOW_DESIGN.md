# Veyhollow — Starter-Town Design Brief (our Lumbridge, but better)

> **Purpose:** the design spec a "perfect map designer" follows to author Veyhollow chunk by
> chunk. Grounded in what's already in the game (`game1_data.js` zones/shops/NPCs/quests,
> `game2_world.js` buildings, `STORY_BIBLE.md`) so every chunk is buildable, not abstract.
> **Unit:** an **8×8-tile chunk**. The Veyhollow core below is a **4×4 block = 16 chunks =
> 32×32 tiles**, centered on the town square. Everything is placed with intent.

---

## 1. What makes Lumbridge work (the principles we steal)

1. **One dominant landmark, visible from everywhere** — Lumbridge Castle orients you the moment
   you arrive and anchors the town's identity.
2. **A natural gate** — the river + bridge splits "town" from "wilds," structures movement, and
   makes leaving feel deliberate.
3. **A tight service cluster** — bank, general store, and the first NPCs are close together so a
   new player is never lost.
4. **Purpose within sight** — cows + goblins for first kills, trees/fishing/mine all within a
   short walk. You can *see* your next goal.
5. **Roads that radiate, each leading somewhere with a reason** — every exit promises content.
6. **Sightlines & breadcrumbs** — paths, signposts, and the castle silhouette pull you forward.
7. **Safe core, gentle danger at the edges** — forgiving middle, escalating threat outward.

## 2. Where Lumbridge falls short (our chance to be *better*)

- **Dead space / filler** between landmarks; long empty stretches.
- **Bank is awkward** (up the castle stairs, away from the store).
- **Tutorial→world handoff** is abrupt; the first hour can feel directionless.
- **Flat visual variety** in the immediate area.

**Our improvements (the bar for every Veyhollow chunk):**
- **Zero dead chunks** — every chunk earns its place (a landmark, a resource, an encounter, or a
  meaningful transition). The checklist (§6) is enforced tile by tile.
- **A legible, tight core** — bank + bazaar + smithy + tutors in one readable square.
- **A memorable central landmark** — **The Hollow Well** (a great ancient well + standing stones
  ringing the square), visible from every approach; it's the town's namesake and respawn anchor.
- **Stronger framing** — the river + **Stonereach Bridge** to the south, a wooded rise to the
  west, a pond to the east — each approach looks different so you always know where you are.
- **A guided first loop** — the tutor path (Holm → Maela → first skill nodes → first quest) is a
  visible breadcrumb trail, not a guess.

## 3. Veyhollow macro plan (region layout)

```
            N  → road to Brynholt (cold north)
            │
   [W woods]┼───────[ THE SQUARE ]───────┼[E pond / Mirrorpond]
  Emberwood │     Hollow Well + stones    │  fishing, road to Stonereach
            │   bank · bazaar · smithy     │
            │   pub · chapel · Maela        │
            │                               │
            └────── Stonereach Bridge ──────┘
                         │  (river gate)
            S → Gloomfen / the Scarlands (danger rises)
```

**Anchors (all exist in data, repositioned with intent):**
- **Central landmark:** The Hollow Well + standing-stone ring (new hero prop) — respawn point.
- **Service cluster (one square):** Bank booth (Warden Maela beside it → *Grub Trouble*),
  **Hollow Bazaar** (general store), **Stonereach Smithy** (Ferra → *The Thirsty Smith*),
  **The Tipsy Grub** pub, a central **signpost**.
- **Faith & arcane at the rim:** the **Chapel of the Dawn** (Prayer altar) NW, **the Spire**
  (Magic, Glimmerveil Arcana) SW — close enough to find, edge enough to feel special.
- **Starter resources within sight of the square:**
  - **NW** — a small wood (3–4 emberwood trees) for Woodcutting/Firemaking.
  - **NE** — a rock outcrop (copper + tin) for Mining → feeds the Smithy.
  - **E** — **Mirrorpond** edge for Fishing → cook at the square's fire/range.
  - **S** — a wheat field + mill (Olun → *Splinters & Sparks*) for Cooking/Firemaking flavor.
- **First combat (safe-ish):** the **Commons** with **grubkins (lvl 2)** to clear for Maela;
  a **gnarlgob (goblin, lvl 5)** patch just outside the south gate; a **Moorcalf** pasture
  (cow analog, hides) to the NE edge.
- **Roads radiate:** N→Brynholt, E→Stonereach/Mirrorpond, S over the bridge→Gloomfen/Scarlands,
  W→Emberwood. Each already in the `PATHS` array — we tighten and dress them.

## 4. The 16 starter chunks (4×4 grid, chunk = 8×8 tiles)

Grid coords `[col,row]`, row 0 = north. Each chunk: **purpose · landmark/sightline · contents ·
connects**.

| Chunk | Name | Purpose · Landmark · Contents · Connects |
|---|---|---|
| [0,0] | **Chapel Rise** | Prayer intro · the Chapel of the Dawn (spire silhouette) · altar, monk, 2 graves · → square (S), Emberwood road (W) |
| [1,0] | **North Gate** | Arrival framing · stone gate arch + signpost · road N to Brynholt, banner · → square (S) |
| [2,0] | **The Woodline** | First Woodcutting · a cozy stand of emberwood trees · 3 trees, a stump, a woodcutter NPC · → square (S), pond (E) |
| [3,0] | **Stonereach Climb** | First Mining · a copper/tin rock outcrop on a low rise · 3 rocks, ore cart · → smithy (S), pond (SE) |
| [0,1] | **Arcane Verge** | Magic intro · the Spire base + Glimmerveil Arcana shopfront · arcanist NPC, rune stall · → square (E) |
| [1,1] | **The Square (NW)** | Civic core · **Hollow Well + standing stones** (the landmark) · bank booth, **Warden Maela**, signpost · → all square chunks |
| [2,1] | **The Square (NE)** | Commerce · **Hollow Bazaar** (general store) + a cooking fire · shopkeeper, fire/range, crates · → square, Woodline (N), pond (E) |
| [3,1] | **Smithy Yard** | Smithing loop · **Stonereach Smithy** (furnace + anvil) · **Ferra**, ore→bar→gear · → Stonereach Climb (N), square (W) |
| [0,2] | **Millhollow** | Cooking/Firemaking flavor · the wheat field + windmill · **Olun the Miller**, wheat, mill · → square (E), bridge (S) |
| [1,2] | **The Square (SW)** | Social core · **The Tipsy Grub** pub + benches · barkeep, patrons (wanderers) · → square, bridge (S) |
| [2,2] | **The Commons** | First combat · open green, the namesake "common" · **grubkins (lvl 2)** ×3–4, a noticeboard · → square (N), pond (E) |
| [3,2] | **Mirrorpond Bank** | Fishing · the pond's near shore · fishing spots, a fisher NPC, reeds · → smithy (N), Commons (W) |
| [0,3] | **Stonereach Bridge** | The south gate · **stone bridge over the river** (the gate) · bridge, river, gatekeeper sign · → Gloomfen road (S) |
| [1,3] | **Goblin Verge** | Escalation · a broken fence + **gnarlgob (lvl 5)** patch just past the bridge · goblins, a wrecked cart · → bridge (N), wilds (S) |
| [2,3] | **Moor Pasture** | Gathering/levels · the cow field · **Moorcalves** (hides), hay, a low stile · → Commons (N), pond (E) |
| [3,3] | **Eastreach** | Outbound · the road east to Stonereach Quarry/Mirrorpond proper · milestone, traveler NPC · → Mirrorpond Bank (N) |

**The guided first loop (breadcrumb trail):** wash ashore on Tutor's Holm (Guide Bram) → arrive
**North Gate** → **The Square** (Maela gives *Grub Trouble*) → **The Commons** (clear grubkins) →
back to Maela → branch to **Woodline / Stonereach Climb / Mirrorpond** for first skills →
**Smithy** to make your first bronze → south over **Stonereach Bridge** when you're ready for
danger. Every step is visible from the last.

## 5. Landmarks & sightline rules

- **The Hollow Well** is tall/lit enough to be seen from all 4 town gates — it's the compass.
- The **Spire** (SW) and **Chapel** (NW) silhouettes are visible on the skyline from the square,
  so faith/arcane always have a visible "go here."
- **No building blocks a critical sightline** — you can always see the next landmark or the well.
- **Roads are dressed, not bare** — lamp posts, ruts, fences, the occasional barrel/cart, so a
  path reads as traveled, never as empty filler.

## 6. The per-chunk design checklist (the "perfect designer," enforced)

A chunk is not done until **every** box is true:
- [ ] **Purpose** — one clear reason this chunk exists (landmark / service / resource / encounter / transition).
- [ ] **Landmark or sightline** — something to orient by or pull you forward.
- [ ] **Reason to cross it** — a destination, resource, NPC, or shortcut.
- [ ] **Smooth transition** — terrain/biome blends with its neighbors (no hard seams).
- [ ] **Connectivity** — at least one clear walkable route to each adjacent chunk; no accidental dead-ends.
- [ ] **Encounter/resource placement** — tuned to the threat band (safe core → danger at the rim).
- [ ] **No dead space** — every open area is intentional (a green for combat, a courtyard, a sightline), never filler.
- [ ] **Readability** — a new player understands what they're looking at in 2 seconds.

## 7. Authoring workflow (how we hit the bar)

1. **Macro first** — lock the 4×4 layout (§3–4) in a top-down planner before any 3D detail.
2. **Chunk by chunk** — author each chunk against its row in §4 + the §6 checklist.
3. **Reference compare** — for each town beat (square, bank cluster, bridge, first-combat green),
   pull a Lumbridge reference shot and make ours *clearer and more characterful*, not just different.
4. **Walk the first loop** — playtest the breadcrumb trail (§4) end to end; if you're ever unsure
   where to go, the chunk that failed gets a landmark/sightline fix.
5. **Iterate the rim** — once the core reads perfectly, extend the same discipline outward to the
   neighboring regions (Emberwood, Stonereach, Gloomfen) one chunk at a time.

---

**Build prerequisites (so this is authorable to spec):** the 8×8 **chunk data model**
(terrain/objects/spawns layers + def-vs-placement) and the upgraded **chunk editor** (tile-snap
ghost, terrain paint, building stamps with interiors, spawn-zone paint, per-chunk save, top-down
planner). New hero prop to make: **the Hollow Well + standing-stone ring**. Everything else
(bank, bazaar, smithy, pub, chapel, spire, mill, bridge, trees/rocks/fish, grubkins/gnarlgob/
moorcalf, Maela/Ferra/Olun) **already exists** in the game — this brief repositions and tightens
it into a town designed by intent.
