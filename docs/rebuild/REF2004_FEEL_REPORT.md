# How ours feels next to 2004: side-by-side report (2026-09-27)

Harness: `docs/rebuild/REF2004_HARNESS.md` (tools/ref2004). Reference: a local, private run of the Lost City 2004
engine (rs-sdk, revision 274) played by an SDK bot; ours: this worktree (branch `ref2004-harness`, from 18a0efa) played
by the Tutor's Holm driver. Every pair was captured at the same window size (2004 applet x2 = 1530 x 1006) and, where
the section needs it, through the same lens (the 2004 camera measured from its client: 36.1 deg vertical FOV,
22.5-67.3 deg elevation, boom 7.7-13.7 tiles).

**All pair sheets are private** (`C:\Users\iQwaZ\ref2004_captures\sheets\` and `...\characters\SHEETS\`); they are
named below so a reviewer on this machine can open them. Only our-only strips are in the repo (`scratchpad/ref2004/`).
Every target is a number measured from the reference, never a shape or text taken from it.

## The biggest differences, in priority order

| # | Difference | 2004 (measured) | Ours (measured) | Target for ours |
|---|---|---|---|---|
| 1 | **Default camera**: how far and how high | elevation 22.5 deg (pitch 128, the login default; range 22.5-67.3), boom 7.7 tiles (range 7.7-13.7, tied to pitch: +0.023 tile per 2048th), vertical FOV 36.1 deg, look point 0.39 tile above the ground; the player is **~100 px of the 334 px view = 30% of the view height** | elevation ~47 deg, boom ~38 tiles (camCtl.dist 33), FOV 30 deg, look point 1.2 above the feet; the player is **~90 px of 1006 = 9%** | default elevation 22.5 deg, boom 7.7 tiles, FOV 36 deg, look +0.4 tile; player 28-32% of the view height; arrow-key pitch between 22.5 and 67 deg with the boom growing 7.7 -> 13.7 tiles; no free zoom (or a zoom whose default is the numbers above) |
| 2 | **Walk and run pace** | walk 1.61 tiles/s (1 tile per 600 ms tick), run 3.39 tiles/s (2 tiles per tick); new characters start **walking** (run is a toggle in the controls tab) | walk 2.40, run 4.25 tiles/s; **run is on by default** | walk 1.67 tiles/s, run 3.33 tiles/s; run off for a new character |
| 3 | **Walk / run cadence and stride** | walk cycle 0.94 s (8 anim frames) = 2.13 steps/s, 0.50 body heights per step; run cycle 0.66 s = 3.04 steps/s, 0.73-0.75 body heights per step | walk cycle 0.50 s = 4.0 steps/s, 0.32 body heights per step; run 0.53 s = 3.75 steps/s, 0.61 body heights | walk: 2.1 steps/s with 0.5 H steps; run: 3.0 steps/s with 0.74 H steps (at our 1.85-tile height that is 0.93 / 1.37 tiles per step - see #4) |
| 4 | **Character scale in the world** | man 193 units = **1.51 tiles**, woman 1.49 | **1.85 tiles** (+23%) | 1.5 tiles tall (keep doors, counters and trees where they are) |
| 5 | **Walk / run body motion** | forward lean +5 deg walking, **+14 deg running**; arms swing with bent elbows (arm band up to 0.42-0.50 H walking, 0.53-0.59 H running); legs open to 0.51-0.62 H walking, 0.78 H running; head bob 2.5-6% H | upright (0 to -3 deg), arms nearly straight (0.31-0.32 H walking, 0.39-0.45 running), legs 0.50 / 0.62-0.68 H, bob 1.3-2% H | lean +5 / +14 deg, elbow-bent arm swing reaching 0.45 / 0.56 H, leg opening 0.56 / 0.78 H, bob 3-5% H |
| 6 | **Body proportions** (front, fraction of height H) | head 0.16 H (6.2 heads tall); fingertips 0.50 H down; legs 0.45 H (man) / 0.43 (woman); waist 0.18 H; feet together (stance 0.08-0.09 H) with one foot slightly forward | head 0.185 H (5.4 heads); fingertips 0.56 H; legs 0.40 H; waist 0.24 H; feet apart (stance 0.23 H) | head 0.16 H, fingertips 0.50 H, legs 0.44 H, waist 0.18-0.20 H, stance 0.08-0.10 H (heels close, one foot a little forward) |
| 7 | **Screen layout** | a fixed 765 x 503 frame: the 3D view is only **512 x 334 (67% x 66%)**, framed by heavy stone chrome; chat box 519 x 165 under the view, side panel 243 x 335 right, minimap top-right; no orbs | full-bleed 3D with floating panels; HP / prayer / run / spec orbs, an objective banner, zone label, XP tracker, hover label on the target | see the UI section: fixed frame proportions, no orbs, tutorial text in the chat box |
| 8 | **Scenery colour and texture** | see the scenery section (numbers from `scenery/image_stats.json`) | | |
| 9 | **Skilling animation timing** | chop 0.77 s per swing (6 frames); net 1.80 s (11 frames) | chop 1.0 s, net 1.6 s, mine 1.0 s, cook 1.33 s, smelt 1.2 s | chop 0.77 s, net 1.8 s (others: see the tutorial section) |

Rubric grades are at the end.

<!--SECTIONS-->
