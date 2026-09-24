# 2004scape reference (owner direction, 2026-09-24)

Owner: "pull a copy of 2004scape and use this as needed." Goal style target: 2004 RuneScape
(`HOLM_FINISH_GOAL_2026-09-24.md` § Owner style direction).

## Where it is

Local clones (outside this repo, shallow, read-only reference) at `C:\Users\iQwaZ\repos\2004scape\`:

| Clone | What it is | License |
|---|---|---|
| `Server` | 2004 RuneScape server emulator (TypeScript) with the full content source in `data/src/` | Code MIT (Lost City). **Game content is Jagex's** |
| `Client2` | TypeScript port of the 2004 Java client (renderer, UI, input) | No license file, so study only |
| `rsmod-pathfinder` | BFS tile pathfinder used by RS emulators | ISC-style permissive |

The GitHub org is archived; active development moved to `github.com/LostCityRS` (same people, newer code).

## How we may use it (read before touching it)

- **Allowed:** studying *how 2004 felt and worked*: tutorial step order, lesson pacing, the door/gate gating pattern,
  tick timing, pathfinding and interaction rules, UI layout, camera, proportions and scale of places, colour and
  texture *style*. MIT server code and the permissive pathfinder may be adapted with attribution in
  `THIRD_PARTY_ASSETS.md`.
- **Not allowed:** copying Jagex content into Crafted Realm, including models (`data/src/models`, ~11k), maps,
  textures, sprites, songs/jingles, fonts, dialogue text, NPC/item names or exact map layouts. Crafted Realm is
  our own IP (GOAL.md). Rebuild everything as our own work, using this only as a reference for look and feel.
- `Client2` has no license, so do not copy code from it. Reading it to understand the 2004 renderer (flat shading,
  fog, draw distance, camera pitch limits) is fine.

## The 2004 Tutorial Island structure (summarised from `data/src/scripts/tutorial/`)

Step constants live in `configs/tutorial.constant`; guides in `scripts/guides/`; skills in `scripts/skills/`;
door/gate gating in `scripts/tut_doors_and_gates.rs2`.

| # | 2004 instructor | Teaches | Crafted Realm lesson today |
|---|---|---|---|
| 1 | RuneScape guide (start house) | design character, talk, options, open the door | study_route (Guide Hall) + appearance designer |
| 2 | Survival expert | inventory, woodcut, firemaking, skills tab, fish shrimps, cook (can burn) | equip_hatchet, chop_logs, light_fire, catch_fish, cook_fish |
| 3 | Master chef (through a gate) | flour + water → dough, bake bread, music tab | bake_bread (**currently switched off**) |
| 4 | (path) | run toggle / player controls | Holm run pacing |
| 5 | Quest guide | quest journal | learn_quests (**currently switched off**) |
| 6 | Mining instructor (underground) | prospect, mine copper + tin, smelt bronze, smith dagger | descend_cavern, mine_copper, mine_tin, smelt_bronze, forge_dagger |
| 7 | Combat instructor (rat pit) | wield/equipment screen, combat styles, melee rat, ranged rat | melee_trial, ranged_trial (**switched off, no enemies**) |
| 8 | Financial/account advisor | bank, then an advisor room | open_bank |
| 9 | Brother Brace (chapel) | prayer tab, friends/ignore | not in our curriculum |
| 10 | Magic instructor | magic tab, Wind Strike on a chicken, then leave the island | magic_trial (**switched off**), then Lastlight + ferry (our own capstone) |

What makes it feel like 2004, and how to apply it here:
- **Gated progression by doors and gates.** Each instructor's area opens only after the previous lesson; the
  player physically walks through a door/gate that unlocks. Our route is open. Consider door/gate gating in the
  M3–M5 world layout.
- **One instructor per building/area, each introduces exactly one side-panel tab.** Our tutors (M6) should do the same.
- **Small, compact island.** Buildings are simple one-room houses, fenced yards, a short path; no large halls.
  Matches the owner's rejection of the big slab Guide Hall.
- **Instructor dialogue drives every step** (chat-box, click-to-continue), plus a persistent hint box and a
  flashing arrow above the next target. We have the objective banner and beacon; M6 adds chat-box tutors.
- Failure is taught, not blocked: shrimps can burn and Wind Strike can miss, then you retry.

## Checked against our 18 lessons

Ours covers 2004 steps 1–8 and 10, plus Lastlight as our own ending. Missing compared to 2004: gate-gated areas,
chat-box instructors, the prayer/friends lesson. Record any decision to add a prayer lesson as an owner decision;
it is not currently in scope.
