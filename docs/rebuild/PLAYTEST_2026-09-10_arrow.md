# Tutor's Holm playtest — 2026-09-10 — persona: the arrow-follower

Persona rules: read the objective banner every time it changes, look at the guidance arrow (`see().arrow`),
do exactly what the text and the arrow say and nothing more; never right-click unless told; walk by
clicking the ground toward the arrow; when the text and the arrow disagree, do the most literal thing and
record what happened; wait for actions to finish before clicking again.

Artifacts: `scratchpad/playtest/arrow/` — `play.js` (long-lived driver), `cmd/*.js` (each command file is
one "try" by the player, in order), `driver.log` (every look/click with elapsed time), `run.json`, and the
screenshots referenced below.

## 1. Run summary

| | |
|---|---|
| Persona | arrow-follower |
| Server | `http://127.0.0.1:8777`, profile `arrow-mtvxh5a4` |
| Total seconds | **1749 s** (29 min 9 s) from browser launch to the end of the run; boot 8.2 s. A first boot attempt timed out waiting for the welcome screen at 120 s and was retried once (allowed by the brief) — those 2 minutes are not in the 1749 s. |
| Reached the mainland | **Yes** — zone `Veyhollow Commons`, tile 0,18, `Tutorial.complete = true`, at t = 1735.7 s |
| Console / page errors | 5 console errors, 0 page errors: 3 × `net::ERR_CONNECTION_REFUSED` at t 1.8–2.3 s and 2 × `404 (File not found)` at t 3.3 s and 9.4 s, all resource loads during boot. Nothing during play. |

Lessons completed in order (elapsed seconds when the banner changed):

| # | step id | banner text (exact) | done at | notes |
|---|---|---|---|---|
| 0 | `study_route` | Enter the Guide Hall and study the relief chart of Tutor's Holm. | 40 s | one walk, one click |
| 1 | `equip_hatchet` | Open your pack and wield the Bronze hatchet. | 72 s | arrow pointed at the door while the text said "pack" |
| 2 | `chop_logs` | Chop a marked tree in Survival Wood for logs. | 478 s | **stuck 345 s** at the Teaching door (P-01/P-02/P-03) |
| 3 | `light_fire` | Use your tinderbox on the logs to light a fire. | 498 s | |
| 4 | `catch_fish` | Use the Small net at the marked fishing spot. | 599 s | arrow on the wrong tile (P-08); 45 s waiting |
| 5 | `cook_fish` | Cook the fish on your fire (light another if it has burnt out). | 627 s | |
| 6 | `descend_cavern` | Enter the Mine Gatehouse by its south gate and climb down the shaft in the winch house. | 682 s | |
| 7 | `mine_copper` | Mine a copper rock with your pickaxe. | 949 s | 250 s lost to a harness limitation in the cavern, not the game (see §3) |
| 8 | `mine_tin` | Follow the offshoot south-east and mine a tin rock. | 980 s | |
| 9 | `smelt_bronze` | Smelt copper and tin into a bronze bar. | 1010 s | |
| 10 | `forge_dagger` | Forge the highlighted Bronze dagger at the anvil. | 1079 s | "START HERE" card was clear |
| 11 | `open_bank` | Climb the far ladder up into the Combat Hall, cross Warden's Ridge to the Holm Bank, and open your account at a teller booth. | 1144 s | cleanest leg of the island |
| 12 | `relight_lastlight` | Climb Lastlight and pull the bronze lever to signal the mainland ferry. | 1432 s | arrow led me inside the solid tower (P-04, P-09) |
| 13 | departure | Board the skiff at Departure Dock. | 1736 s | 300 s lost getting back out of the tower body (P-10/P-11) |

## 2. Findings

Ranked by severity, then by how early on the route they occur. Screenshots are in `scratchpad/playtest/arrow/`.
"Engine read" means a read-only `page.evaluate` was used to explain the finding, as the brief allows.
Ids here are ranked; `run.json` numbers findings in the order they were noted — mapping run.json → report:
01→P-13, 02→P-05, 03→P-06, 04→P-14, 05→P-15, 06→P-07, 07→P-02, 08→P-01, 09→P-03, 10→P-08, 11→P-16,
12→P-17, 13→P-18, 14→P-09, 15→P-04, 16→P-10, 17→P-11. P-12 and P-19–P-22 were observed from screenshots
and the driver log after the run.

| id | sev | where | what happened | what a player expected | screenshot |
|---|---|---|---|---|---|
| P-01 | **critical** | Guide Hall north "Teaching door" (door col rect x 151±1.35, z 143) → outside tiles 150,142 and 151,142 | The arrow says "Leave by the Teaching door" (target 151,141). Stepping through puts you in a **two-tile pen**: engine read of `tileWalkable` shows row z=142 as `......##.@##.......` (x 148–149 and 152–153 blocked) and the whole row z=141 from x=146 to 154 blocked by the Teaching-kitchen wall. `computePath` from the pen reaches only the pen and the hall. `holm_guidance.exitDoor()` gives this door the authored-exit bonus, so it is chosen for the Survival Wood objective every time. | The door the arrow names should open onto ground connected to Survival Wood. | `022-finding-8.png`, `011-try-north.png` |
| P-02 | high | Same doorway, tile 151.5,142.5 | Player experience of P-01: every ground click north, east or west printed "You can't get all the way there; walking as close as you can." (six times in the chat) and I did not move at all; only south (back into the hall) worked. Clicking the door leaf just toggled it Open/Close. I spent from t=92 s to t=437 s here — the five-minute limit. | Some movement, or a message that says which way to go. | `022-finding-7.png`, `009-at-green-door.png` |
| P-03 | high | Guide Hall — workaround for P-01 | To continue I had to ignore the arrow, walk back through the hall, leave by the **south Arrival door** (149,166) and walk around the outside to the trees at 126–131,158–164. Nothing on screen mentions that door once you are past it. | The arrow should pick a door that connects. | `022-finding-9.png`, `024-outside-south.png` |
| P-04 | high | Lastlight tower body, all tiles within ~10 of 196,112 | The "Relight Lastlight" arrow targets 196,112 = the beacon centre. Following it, I walked **into the solid lighthouse** and stood inside pale stone at 196.5,120.5 (screens show blank walls all round and the door seen from inside). Engine read: `groundY` = 14 across 196,112 → 196,124 (the summit plateau), no `WORLD.interiors` entry there, beacon `footprintRadius` 10.5 / `interiorRadius` 8.8 — the footprint is simply walkable. | The tower body should be blocked; the way in is the door at 196,124 (`walkAt` 196.5,124.65). | `062-finding-15.png`, `059-lastlight-plateau-wide.png` |
| P-05 | medium | Arrival tile 151,169 — chat vs banner | Chat's last line on arrival is "Your adventurer is ready. Talk to Guide Bram by the rowboat." while the banner says "Enter the Guide Hall and study the relief chart of Tutor's Holm." and the arrow says "Study the island chart". There is no Bram and no rowboat in sight. | One first instruction; chat and banner agree. | `001-finding-2.png` |
| P-06 | medium | Guide Hall relief chart 151,155 | Right after the chart, banner = "Open your pack and wield the Bronze hatchet." but the arrow = "Leave by the Teaching door" (151,141) with the edge arrow lit. The two guides disagree for the whole step. | Arrow points at the pack (or hides) until the hatchet is wielded. | `003-finding-3.png` |
| P-07 | medium | Teaching door → tree | Once the door step "completes" (the arrow flips to "Chop tree" at 126,158, edge arrow on), the arrow points back **through** the building I just walked out of. Even if P-01 were fixed, a literal arrow-follower is led at a wall; there is no route hint. | Arrow follows a walkable route, or the objective names the door. | `007-finding-6.png` |
| P-08 | medium | Survival Wood pond, arrow target 132,156 | "Catch a fish" arrow target is a grass tile on the shore with nothing to click; its label hangs on my own feet. The real net spot ("Net-fish Mirrorperch", bubbles) is at 131,150, six tiles away by the dock. With the net armed I waited 45 s at the arrow. | Arrow on the bubbling spot itself. | `032-finding-10.png`, `030-at-fishing-arrow.png` |
| P-09 | medium | Lastlight plateau 196,112 | "Relight Lastlight" label hangs on my feet on bare sand; the Lastlight door is 12 tiles south (196,124) and nothing says where the way in is. (This is the mild half of P-04.) | Arrow on the door, then the stair, then the lever. | `059-finding-14.png` |
| P-10 | medium | Lastlight Lantern Room lever 199,111 | Pulling the lever ("You pull the bronze lever. Lastlight wakes…") dropped me to **plane 0 at the same x,z** (199.5,112.5) — inside the solid tower body again — and the zone label kept saying "Lastlight Lantern Room". No climb-down message. | Stay in the lantern room and walk down, or an explicit exit; zone label updates. | `074-finding-16.png` |
| P-11 | medium | Lastlight door 196,124 (from inside the body) | Inside the stone every camera angle hits tower walls; ground clicks toward the skiff gave "no clickable ground". The only way out was to click the door (→ "Lastlight Ground Floor", plane 1) and then click the "Exit Lastlight" object (→ "Lastlight Summit", 196.5,124.5). A player inside the stone would not guess this. Took t=1451 → 1645 s. | Never be inside the body; the exit is the door. | `092-finding-17.png`, `091-back-in-tower.png` |
| P-12 | low | Boot | First `login()` timed out waiting for `#welcome-screen` (120 s); the retry booted in 8.2 s. | Welcome screen within a few seconds. | `driver.log` lines 1–3 (no screenshot possible before the page shows) |
| P-13 | low | Arrival chat box | Chat shows raw HTML: "Deed complete: \<b\>Apprentice\</b\> — 50 crowns!" and again at the dock "Deed complete: \<b\>Wanderlust\</b\> — 150 crowns!". Also a "[COOK] The bread-making chain is lit…" line is already there before I have done anything. | Clean text; no deed/cook lines before the first lesson. | `001-finding-1.png`, `103-at-dock.png` |
| P-14 | low | Relief chart hover | Hover text reads "Study orientation_table / 2 more options" — an internal id with an underscore. | "Study Relief chart". | `003-finding-4.png` |
| P-15 | low | Guide Hall chat | "Guide Bram hands you a survival kit: a bronze hatchet, a tinderbox and a small net." — but there is no Bram; the kit appears when you click a table. | Bram is there, or the line says the kit was on the table. | `003-finding-5.png` |
| P-16 | low | Campfire 128,155, pack click | Clicking the raw mirrorperch in the pack printed "You should cook this on a campfire first." (an eat attempt) before the fire click roasted it. | Clicking the raw fish during the cook step arms it or says "use it on the fire". | `036-finding-11.png` |
| P-17 | low | Training Cavern arrival tile 286,354 | After climbing down I appeared standing on top of a stalagmite cone, feet on the spike. | Arrive on flat floor beside the shaft. | `044-finding-12.png`, `039-at-copper.png` |
| P-18 | low | Training Cavern chat | "Congratulations, you just advanced an Mining level. You are now level 2." (and level 3). | "a Mining level". | `047-finding-13.png` |
| P-19 | low | XP-this-session panel (from the cavern on) | Row reads "fishing +28 … lvl 1 · NaN to 2 · —": lower-case skill name and a NaN, while every other row is capitalised with a number. | "Fishing", "lvl 1 · N to 2". | `039-at-copper.png` |
| P-20 | low | Anvil 302,363 | Chat says "The smith passes you a hammer. Use it on the anvil with a bronze bar." while the banner says "Forge the highlighted Bronze dagger at the anvil." A plain left-click on the anvil is what works (opens the smithing panel). | The chat and banner should teach the same input. | `049-after-smelt.png`, `051-anvil-clicked.png` |
| P-21 | low | Departure Dock 207,151 | Zone label still reads "Lastlight Summit" while standing on the dock at the skiff. | "Departure Dock". | `103-at-dock.png` |
| P-22 | low | Name tag after the lever | With the new title the floating name reads "…nturer, the Way…" — clipped at both ends. | Full "Adventurer, the Wayfarer" or a shorter tag. | `103-at-dock.png`, `104-mainland.png` |

## 3. Workarounds needed

Each of these is something a human player would not know to do.

1. **Teaching door pen (P-01/P-02/P-03).** After five minutes of trying like a player, I used a read-only
   `tileWalkable` map and `computePath` probes to learn that the pen is sealed and that the only route to the
   trees is back out the **south Arrival door** and around the outside of the Guide Hall. Then I walked that.
2. **Lastlight (P-04/P-10/P-11).** To get from the arrow's target to the lever I had to (a) find the door by
   tilting the camera to a low pitch from inside the stone, (b) climb the "ground-floor ladder" 201,109 and the
   "upper ladder" 192,115, (c) after the lever dropped me into the stone again, click the door *again*, then
   click the "Exit Lastlight" object to appear outside at 196.5,124.5. An engine read of the beacon record
   (`footprintRadius` 10.5, `groundY` 14 across the footprint) was used to explain, not to move.
3. **Descending from the summit to the dock.** A straight-line ground click toward 207,151 hits the cliff and
   the Mage tower; I had to click a far patch of ground that the game's own pathfinder could reach (two
   clicks: 204,144 then 207.7,151.5). A player would probably do this by trial, so it is friction, not a bug.

Harness limitations met on this run (not player-facing; for the tool owner):

- In the Training Cavern `harness.walkTo` projects click points at `groundY(x,z)` = 0 while the floor is at
  y ≈ -6, so its ground clicks land off-screen or on the objective banner; `locate()` also returned pixels under
  the HUD (`[769,10]`). I wrote cavern-aware `cwalk`/`cclick` helpers (project at `pElev`/player height, accept
  only bare-canvas pixels) in `cmd/240-cavern-walk.js`. This cost ~250 s on `mine_copper` and is not a game bug.
- `walkTo` treats a door hit as clickable ground, so walking "through" a door tile toggles the door instead.
- `FINDERS`-style regexes on labels miss labels with inline HTML (`Exit <b>Lastlight</b>`); strip tags first.

## 4. What read well

- The objective banner is always readable, its wording is plain, and it changed instantly on every completion.
- Chart → hatchet → tree → fire → fish → cook → gatehouse → shaft is a clear chain; the marked trees (red cross)
  and the "Cook on Campfire" label are unmistakable.
- The furnace dialogue ("Smelt a Bronze bar." / "Never mind.") and the anvil panel with the dagger card marked
  "START HERE" are exactly the right amount of hand-holding.
- The Combat Hall → "Leave by the Bank-side door" → "Open the bank" leg is the arrow system working perfectly:
  three walks, one click, no ambiguity.
- The mine gatehouse's "Climb-down Training cavern" and the cavern-exit ladder were obvious; the lever pull
  and its three chat lines ("Departure Dock is now unlocked") give a real sense of graduation.
- Boarding the skiff is one click and the mainland arrival message is warm.

## 5. Verdict

A first-time player who trusts the arrow will **not** finish this island unaided: the third lesson sends them
through the Teaching door into a sealed two-tile pen (P-01), and the only exit is a door behind them that
nothing mentions; most players would hit "Skip tutorial" or quit there. Those who get past it on their own
would face a second trap at Lastlight, where the arrow walks them into the solid tower (P-04) and the lever
drops them back into it (P-10). Everything between those two — fire, fish, cook, cavern, smelt, forge, bank —
reads cleanly and would be finished in a few minutes. The one change that would help most is to make guidance
targets *reachable points*, not station centres: pick exit doors by `computePath` reachability (so the Teaching
door is never chosen while its pen is sealed, and fix the pen), and put the fishing, Lastlight and lever arrows
on the actual clickable spot or doorway.
