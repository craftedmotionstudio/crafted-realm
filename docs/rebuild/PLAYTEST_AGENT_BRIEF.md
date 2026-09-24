# Tutor's Holm playtest — agent brief

You are a playtester. Your job is to PLAY Crafted Realm's tutorial island (Tutor's Holm) the way a new player
would, from the welcome screen to boarding the skiff to the mainland, and to report what you found. You are not
here to fix the game. You are here to notice.

## The goal of a run

Start as a brand-new adventurer, complete the island's curriculum (the objective banner walks you through it:
chart, hatchet, tree, fire, fish, cook, descend, copper, tin, smelt, forge, bank, Lastlight), and sail from
Departure Dock. Arrival on the mainland (zone "Veyhollow Commons") ends the run. The route usually takes a
player 15-25 minutes; you have a budget of about 40 minutes of play plus writing.

## How you play

Use `tools/play/harness.js` (read it first; it is short). It gives you a player's hands and eyes on the real game
in headless Chrome: `see()` tells you what is on screen (objective text, the guidance arrow's label and target,
the last chat lines, your pack, nearby clickable things with their screen positions), and every action is a real
input: `walkTo(x, z)` clicks the ground toward a tile the way a player would, `clickObject(finder)` clicks an
object where it is drawn, `rightClickObject` + `chooseRow(text)` use the right-click menu, `clickInventory(id)`
clicks a pack slot, `useItemOn(id, finder)` arms an item and clicks a target, `chooseDialogue(text)` presses a
dialogue button, `screenshot(name)` and `note(severity, where, observation, expectation)` record what you saw.
`FINDERS` names the things a player can recognise by sight.

Write your run as a node script at `scratchpad/playtest/<persona>/play.js` that requires the harness with
`require('../../../tools/play/harness')`, run it with `node`, look at the screenshots it produced (Read the
PNG files), and iterate: a real player who gets confused does not restart, they try something else. You may run
several scripts; keep every `run.json`.

## Rules

- Real input only. Never call `Planes.climbTo`, `Tutorial.notify`, `Tutorial.finish`, `Admin.*`, `Player.addItem`,
  `SaveGame`, or set `Tutorial.step`. Never edit files under `src/`, `tools/` or `assets/`. Do not commit.
- You may READ engine state through `p.page.evaluate` only to explain a finding (for example, why a click did
  nothing). Say so in the finding.
- If you are stuck on a step for more than five minutes of trying like a player would, write a finding of
  severity `high` describing exactly what you tried, then and only then use a read-only inspection to find the
  intended action and continue. Record the workaround as its own finding ("a player would not know this").
- Every finding needs: severity (critical = cannot progress, high = wrong or misleading, medium = friction,
  low = polish), where (station / building / tile), what happened, what a player would have expected, and a
  screenshot taken at that moment.
- Note the good things too, briefly, at the end: what read clearly, what felt right.
- Run your play script in the foreground with a long Bash timeout (up to 600000 ms) or poll its log and
  screenshots with short Bash commands. Do not arm a Monitor and wait for it: nothing wakes you while you wait,
  and the run will be lost. Split long runs into stages (one script per stage, same profile) if you need to look
  at screenshots in between.
- Boot: `login()` waits for the welcome screen and the shader warm-up. If the boot times out once, retry once.

## Your persona

Play the persona you were given. Stay in character for decisions (what to click, when to read, how patient to
be), but report as an analyst.

## Your report

Write `docs/rebuild/PLAYTEST_2026-09-10_<persona>.md`:

1. **Run summary** — persona, server port, total seconds, reached the mainland (yes/no and where you ended),
   lessons completed in order with the elapsed time at each, console/page errors count.
2. **Findings** — a table: id, severity, where, what happened, what you expected, screenshot file. Ranked by
   severity, then by how early in the route they occur.
3. **Workarounds needed** — anything you had to inspect to get past, as a list (each is a real bug for a
   human player).
4. **What read well** — three to six lines.
5. **Verdict** — one paragraph: would a first-time player finish this island unaided? What is the one change
   that would help most?

Keep the report factual and specific: tile coordinates, exact objective text, exact chat lines, elapsed times.
