# Gameplay QA System Closeout — 2026-07-17

## Outcome

Crafted Realm now has a repeatable QA gate for larger gameplay additions. It keeps the existing structural and smoke checks, adds real-player proof, and uses agent swarms selectively without allowing parallel testers to rewrite production code or corrupt one shared save.

## Delivered

- `QA_STANDARD.md`: Light, Full, and Swarm activation rules; seven acceptance gates; isolated-context law; one-integrator ownership.
- `templates/GAMEPLAY_QA_REPORT_TEMPLATE.md`: complete identity, contract, golden path, negative matrix, four-direction review, animation, persistence, performance, defect, retest, and sign-off record.
- `src/qa_profile.js`: local-only `?qaProfile=<slug>` durable-save namespace; public hosts retain `motionscape_save`.
- `CRAFT_QA_SIGHT`: local-only read-only evidence snapshot for position, action, inventory, bank, equipment, XP, tutorial state, recent messages, smoke, and uncaught errors.
- `tools/qa/schema.js`: machine validation for scenario level, ordered real interactions, negative cases, persistence, smoke, roles, and integrator sign-off.
- `tools/qa/scenarios/cavern_bronze_lesson_v1.json`: first reusable Full/Swarm scenario.
- `tools/test_qa_profile.js` and `tools/qa/test_schema.js`: permanent regression checks.
- `AGENTS.md` and `GUIDING_LIGHT.md`: QA is now part of the standard development discipline.

## Swarm policy

Use a swarm only when a feature has several independent risk surfaces. Assign functional, adversarial, visual/interaction, persistence, and performance roles. Each simultaneous browser tester needs a separate browser context and a unique disposable QA profile/evidence root. Testers report; the main integrator fixes, orders exact retests, runs the final golden path, and signs acceptance.

## Verification

- QA profile isolation: PASS.
- Scenario schema and negative locks: PASS.
- Content validation: PASS.
- Cavern crafting contract: PASS.
- World V2/Training Cavern contracts: PASS.
- Isolated browser profile confirmed by `[QA_PROFILE] isolated save framework_proof`.
- Foreground smoke: PASS 100/100, 100 FPS, 13 ms worst frame, 113 draw calls, 29,584 triangles, 6 healthy ticks, zero uncaught/console errors.

## Honest boundary

This framework makes agent QA repeatable and much harder to fool with setup shortcuts. It does not replace outside human alpha testing for comprehension, delight, accessibility, browser diversity, or market readiness.
