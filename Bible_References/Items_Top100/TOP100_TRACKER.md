# TOP-100 ITEM PROGRAM — COMPLETE 2026-07-17 (100 have / 0 missing)

> All 100 mapped, referenced, iconed, and (for equippable items) modelled + fit-reviewed
> across sets 1-3. Weapons/helms/shields = Blender GLBs via the invisible bridge; body-fit
> armour (set 3) = procedural overlays on the GLB avatar. Two-model review pipeline + owner
> rounds drove every asset. Reviews in reviews/, build scripts in tools/blender_gear/,
> full history in PASS_LOG.md.

---

# TOP-100 ITEM PROGRAM — tracker (started 2026-07-17)

The owner's directive: identify the 100 common OSRS items Crafted Realm needs, bank wiki
reference imagery (inventory icon + detail render + equipped-on-character render), compare
every item we already have against its reference, then design the missing ones — with
correct in-game hold/orientation across the character set and the right animations
(weapon: attack styles + block; tool: its work loop, e.g. hammer on anvil).

## Assets & tools (all live)
- `top100_items.json` — the master list. Per item: OSRS name, category, our item id,
  our IP name, status (`have` 50 / `partial` 8 / `missing` 42), animation requirement,
  and after review: `iconVerdict` (`pass` 31 / `review` 24) + defect note.
- `wiki/icon|detail|equipped/` — 100/100 wiki icons, 99 detail renders, 27/27 equipped
  renders (every wearable in the list). Reference-only, never shipped.
- `ours/icon/` — 55/55 of our real in-game icons, captured from the live `iconFor()`
  code path (tools/icon_dump_top100.html + tools/icon_dump_server.js re-capture them
  after any icon edit).
- `tools/item_top100.html` — the comparison grid (serve 8777): wiki icon | detail |
  equipped | our icon | status | anim requirement, filterable by status.
- `tools/fetch_osrs_top100.js` — re-fetches/repairs the wiki reference bank.

## Review pass 1 — 2026-07-17 (icons, all 55 existing items)
Fixed same-day (verified in dump + smoke PASS 100/100, 60 FPS, 0 errors):
- **bucket / bucket_water** — had NO icon case, rendered the default beige square.
  Now a proper grey pail w/ rim, handle, water fill on the water variant.
- **entire rune family** — all 8 runes shared ONE identical blue-asterisk glyph.
  Now: one grey rune-stone family + per-element symbol (air gusts, water droplet,
  earth diamond, fire flame, mind starburst, chaos cross, nature sprout, spark bolt).

`review` queue (24) — worst first, defect noted in JSON: bars (flat vs chunky ingot),
logs (thin sticks), bones/big_bones (thin), fishing_net (grate vs draped mesh),
bread (bun vs loaf), clay (bun-read), hammer/tinderbox (too plain), sabres (straight
glyph, need curve), battleaxe (shares hatchet glyph), helms (dome read, need face
guard), plate/leather bodies (two-panel door-read), kiteshield (shares generic shield),
bows (thin arc; longbow needs own tall silhouette), monk_robe_top (blue, should be
brown), coins (flat discs).

## Status update 3 — 2026-07-17 (pass 7: TWO-MODEL REVIEW SYSTEM — the new gate)
- **Owner directives live:** zoomed reviews; TWO AI reviewers (Gemini vision + Codex) on
  every gear asset asking scaling / hold / everything-else; procedural player rigs OUT of
  the game — all QA on GLB avatars (male + female avatar pair wanted; second avatar is
  open character-pipeline work).
- **Pipeline:** `review_capture.js <id>` → `review_compose.js` → `gemini_review.js` (+ Codex
  reads the same sheet). Gemini stabilized with temperature 0 + measurable anchors — see
  memory `two-model-gear-review`. Iterate the repo build script
  (`tools/blender_gear/<item>_build.py`) via the invisible Mixar bridge until BOTH ≥9.
- **Bronze longsword rev4 PASSED the new gate: Gemini 9 (scaling 10, hold 10) + Codex 9;**
  smoke 100/100. This is the template flow for the remaining mesh backlog.

## Status update 2 — 2026-07-17 (passes 4 + 5 + 6 done)
- **Equipped/held pass DONE:** 26 items × both rigs captured vs wiki equipped renders
  (sheets in `compare_equipped/`); 6 defect families FIXED in code (GLB tool carry, proc
  blade/bow idle angles, wizard hat color+GLB fallback, monk robe tent, amulet
  visibility); swing/block/walk anim regression captures clean. 16 pass / 8 review / 2 fail
  — every remaining gap needs new meshes.
- **Item-source pass DONE:** general store/bowyer/clothier/inn stock, hen/cow/boar/shade
  drops, fires leave ashes (proven live). Tree/rock/field sources logged for v2 authoring.
- **BRONZE LONGSWORD EXEMPLAR DONE (owner's requested flow, end-to-end):** fully-designed
  Blender mesh via the new INVISIBLE background-Mixar bridge (see PASS_LOG pass 6 for the
  recipe), all 8 tiers generated, icon, shops, both-rig equip + slash verified, sheet
  banked, smoke PASS. Awaiting owner visual sign-off per the art reset.
- **Standing: have 83 / partial 5 / missing 12** — all remaining items are meshes to
  produce through the same bridge recipe.

## Status update — 2026-07-17 (passes 2 + 3 done)
- **Icon pass 2 DONE:** all 24 `review` icons reworked + verified; every one of the 55
  original icons now `pass`. Headless smoke PASS.
- **Batch 1 data pass DONE:** 32 items registered (see PASS_LOG) with 32 new icons;
  validator PASS (169 items); headless smoke PASS; iron_dagger live-equip proof PASS.
  Standing: **have 82 / partial 5 / missing 13** — every remaining gap is equipment
  waiting on the modelled-gear pass.
- **Headless discipline (owner constraint):** the owner uses the browser during work
  sessions — all verification now runs in a separate headless Chrome via
  `tools/icon_dump_headless.js`, `tools/run_smoke_headless.js`, `tools/_qa_iron_dagger.js`
  (throwaway profiles, real login flow, user's save never touched).

## Next passes (in order)
1. **Equipped/held comparison pass** — for the 27 equipped-capable items we have:
   settle the real game per item (player wearing/holding it), capture, side-by-side vs
   `wiki/equipped/`, structured Codex review ≥9.0, bank sheets in `Complete/_compare/`.
   Covers placement, orientation, grip, scale — across procedural AND modelled
   (Quaternius GLB) character variants (gear routes through the shared `gearMesh()`).
2. **Item-source pass** — wire gathering/crafting/shop sources for the batch-1 items
   (oak/willow trees, gold rock, cow-analog drops for hide/beef, cooking chain recipes,
   spinning/flax, general-store stock); `node tools/validate_content.js` gates each batch.
3. **Missing-model pass** — new held/worn meshes through the fully-designed Blender
   gate (`docs/rebuild/ART_PRODUCTION_PIPELINE.md` §2.1 — no primitive assemblies):
   longsword, scimitar-curve, mace, warhammer, 2h, med helm, chainbody, plateskirt,
   sq shield, longbow silhouette, rods, spade… **Bronze longsword is the owner's
   exemplar and goes first**: wiki detail + equipped render as reference → model →
   grip-origin export a la `worn_gear_starter_v1.glb` → verify hold on both character
   paths → slash attack + block + strength/attack style anims vs an NPC → banked
   compare sheet ≥9.0.
4. **Animation coverage pass** — every `anim` field in the JSON proven in-browser:
   weapons (swing per style + block), tools (hammer→anvil smithing, tinderbox→
   firemaking, hatchet→trees, pickaxe→rocks, net/rod→fishing spots), staff cast.
   Extend `tools/smoke_test.js` checks where a regression could slip silently.

## Ground rules carried from GUIDING_LIGHT
- Wiki imagery is REFERENCE ONLY (Jagex IP) — informs proportion/readability/palette
  of our own original low-poly art; never copied into shipped assets, names stay ours.
- Verify, don't assert: every fix re-captured via the dump harness + grid, every
  gameplay-visible change smoke-gated, every "done" claim needs a banked compare sheet.
- Items are 2D icon sprites; 3D only for world props + worn gear (spine #4).
