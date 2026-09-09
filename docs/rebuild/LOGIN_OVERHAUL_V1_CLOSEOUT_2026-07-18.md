# Crafted Realm Login Overhaul v1 — Closeout (2026-07-18)

## Outcome

The browser welcome screen now uses an original old-school fantasy composition built around the existing Veyhollow landscape: a strong title silhouette, compact metal-and-stone profile panel, faceted stone brazier pillars, and slow layered fire. It deliberately evokes the readability and ceremony of early browser RPG logins without copying another game's logo, layout, assets, or wording.

The real local profile flow remains intact and the smoke-test IDs are preserved.

## Player-facing features

- Continue Adventure with saved-character name and progress summary.
- New Adventurer with name, tunic colour, and skin tone controls.
- Explicit confirmation before an existing local save can be erased.
- Back navigation from creation, ready-to-play, confirmation, and options states.
- Clear single-player/free-world/beta status and honest local-device storage messaging.
- Title music, fullscreen, reduced-motion, and high-contrast controls.
- Keyboard-safe name submission and Escape navigation.
- Responsive desktop/small-screen layout.
- Accessible labels, focus states, and pressed-state reporting for appearance swatches.

## Animation review

Each brazier has a modelled CSS coal bed, three independently animated flame layers, a separate glow pulse, rising sparks, and drifting background embers. The motion is deliberately asymmetric and slow enough to read as a cozy medieval fire rather than a rapid looping icon. Reduced Motion removes embers and sparks and slows the remaining flame/glow cycle.

A two-frame live browser sample taken 900 ms apart produced 3,294 differing encoded bytes in the isolated left-flame crop, confirming the visible animation is active rather than a static illustration.

## Real-flow verification

- Fresh disposable profile: New Adventurer → character creation → named character → ready screen → Enter Veyhollow: PASS.
- Returning disposable profile: reload → Continue Adventure → saved name and profile summary restored: PASS.
- Save protection: New Adventurer with a save → warning → Keep my adventurer → Continue remains enabled: PASS.
- Welcome options panel and back navigation: PASS.
- JavaScript parse and diff-whitespace gates: PASS.
- Foreground smoke gate: **101/101 PASS**, 100 FPS, 14 ms worst frame, 166 draw calls, 32,932 triangles, zero uncaught errors, zero console errors.

## Direct Codex visual review

- Silhouette/proportion: 9.3 — the title, central panel, and two braziers read immediately at the target elevated desktop composition.
- Shape hierarchy: 9.3 — title → active action → secondary action → utilities is unambiguous.
- Colour/material separation: 9.2 — warm copper/gold type, dark forged panel, cool stone, and orange flame remain distinct over the landscape.
- Reference-defining old-school qualities: 9.2 — restrained information density, bevels, serif display type, and ceremonial framing capture the intended era while staying original.
- Gameplay-camera/readability: 9.4 — primary actions remain clear at 1280×720 and the panel does not compete with the title.
- Animation/interaction readability: 9.3 — flame motion is visible and cozy; save destruction is now explicit and reversible until confirmation.
- Family consistency: 9.2 — palette and faceted forms align with Crafted Realm's warm low-poly presentation.

Overall visual acceptance: **9.3/10**.

## Files

- `index.html`
- `assets/ui/login_overhaul.css`
- `src/login_overhaul.js`
- `src/game4_ui.js`
- `src/game5_main.js`

