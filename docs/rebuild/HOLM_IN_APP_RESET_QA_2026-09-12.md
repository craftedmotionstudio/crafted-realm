# In-app browser and new-adventurer reset — 2026-09-12

Owner requests all further browser work in the Codex in-app browser. Active binding uses iab; retain tab for ongoing QA. Chrome is not the selected testing surface.

Integrated src/new_adventurer_reset.js before login_overhaul.js. Confirmed-new now verifies profile-scoped deletion and reloads the page to rebuild both world/provider and all character state. It no longer carries a loaded mainland world/character into creation. Failure text is visible in the confirmation; uncertain/deleted state cannot navigate back into creation before reload. Service tests7/7 and provider boot-save tests7/7 pass.

Real in-app UI QA, disposable holm-iab-reset-20260912: injected a serialized mainland save with ResetFixture/777coins/completed tutorial/claimed pack; reloaded and clicked Continue to actually restore it. Clicked Erase save then Erase save and continue. Normal reload restored Holm provider, default name,5coins,incomplete tutorial,no save,no errors. Clicked New Adventurer, named FreshHolm, Begin, Enter. Actual arrival [151,169] on tutors-holm-v2, FreshHolm,incomplete tutorial,no errors. Post-entry coins55 (normal entry grants need separate audit; do not claim the arrival carried5). No owner save modified. This is a reset-flow fixture, not evidence of sailing/full tutorial completion.

In-app smoke pending. Remaining goal includes lesson checkpoint saving, restored-interior smoke failures, NPC/modelled-player production, combat curriculum, and below-target building art. Do not close the goal on this repair.
Final in-app foreground smoke PASS105/105; boot1044ms, real walk4045ms,6stream boundaries/save-load exact/lossless,60FPS/worst20ms/126draws/34272tris/7ticks,zero uncaught or console errors. iab tab retained for continuation. Disposable profile now holds FreshHolm after reset, not owner state.
