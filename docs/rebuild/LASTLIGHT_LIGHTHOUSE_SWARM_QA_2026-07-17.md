# Gameplay QA Report — Lastlight lighthouse journey

## Test identity

- Feature: surface walk to Lastlight plus four-floor ladder circulation
- QA level: Swarm
- Candidate: Lastlight runtime v22 / UI r30
- Retest: Lastlight runtime v33 / UI r33 / Test Travel v20 / model cache v9
- Date: 2026-07-17 (America/Chicago)
- Main integrator: Codex
- Profiles: isolated disposable `qaProfile` saves for route, vertical, and visual interaction testing

## Scope and assignments

| Tester | Assignment | Setup rule |
|---|---|---|
| Route tester | Walk from the ordinary tutorial route toward Lastlight; independently test the switchback and summit entry | No teleport except a separate switchback-base diagnostic |
| Vertical tester | Enter and traverse L1 → L2 → L3 → L4 → L3 → L2 → L1 with real pointer input | Test Travel to L1 allowed only as setup |
| Visual/interaction tester | Check visible ladder, trapdoor, lever, adjacency safety, camera and floor composition | Separate disposable save |
| Main integrator | Reproduce failures, repair, run independent real-pointer traversal and automated gates | Integration authority |

## Findings and repairs

1. **Fixed — hidden-floor click interception (S1).** Hidden ladder proxies from overlapping floors were still raycast candidates. This caused skipped floors and lever/ladder cross-activation. Pointer picking now rejects any interaction whose plane differs from `Player.plane`.
2. **Fixed — model/proxy coordinate mismatch (S1).** Blender local Y exports into game negative Z. Ladder, trapdoor and lever contract coordinates were mirrored. The authored interaction coordinates now match the rendered fixtures.
3. **Fixed — interior save restore (S2).** Saves now retain validated non-surface plane and authored floor label, restore floor visibility, and immediately recenter the camera.
4. **Passed — complete ordered vertical journey.** An independent tester and the main integrator both completed real-pointer L1 → L2 → L3 → L4. The independent tester also completed L4 → L3 → L2 → L1. Every transition showed the correct climb action and message. Adjacent floor clicks on every level remained on that level.
5. **Passed — beacon control.** The top lever remains on L4, toggles the beacon on/off, changes its light, and reports both states.
6. **Fixed — summit and bookmark camera obstruction (S1).** The lighthouse runtime keeps the elevated camera on the player's side of the opaque cylinder near the summit. Local Test Travel now derives a landmark-safe yaw, pitch and distance before placing the camera at Lastlight bookmarks. A main-integrator live retest showed a readable switchback-base view immediately after travel, with no camera inside tower geometry.
7. **Fixed — distant door interception (S1).** Pointer picking now rejects the lighthouse door beyond fourteen tiles, so the invisible proxy cannot advertise or activate through the lower terrain.
8. **Passed — hinged doorway and stone threshold.** A real pointer opened the visible south door. The leaf swung inward before the plane change, the player arrived in Lastlight Stores, and the exterior shell contained a circular stone floor instead of summit grass.
9. **Passed — enclosed-floor presentation (S2 visual).** The Blender export now uses a connected cylindrical shell, dedicated low cutaway base, tall per-floor circular walls and visible windows. Direct Codex review passed the exterior silhouette, material hierarchy, doorway and gameplay-camera readability.
10. **Partial — complete outdoor route.** Static route acceptance passes every cardinal step and limits height change to 1.05 units. A real-pointer retest walked the first repaired switchback leg from the exact base bookmark. The complete uninterrupted base-to-door walk was not rerun after the final camera repair, so that single golden-path scenario remains pending rather than assumed.

## Acceptance matrix

| Scenario | Result |
|---|---|
| Correct ladder action on active floor | PASS |
| Hidden floors cannot intercept clicks | PASS |
| L1 → L2 → L3 → L4 | PASS |
| L4 → L3 → L2 → L1 | PASS |
| Adjacent floor click does not climb | PASS |
| Top beacon lever on/off | PASS |
| Interior plane and label save contract | PASS (structural and live restore observation) |
| Ordinary tutorial route to switchback | NOT RETESTED |
| Switchback base first leg | PASS (real pointer) |
| Switchback base to summit | PENDING full uninterrupted retest |
| Summit door animation and entry | PASS (independent live test) |
| Per-floor lighthouse walls/windows | PASS (visual) |

## Automated gates

- Syntax: PASS (`game4_ui.js`, `game5_main.js`, `ui_save.js`)
- World-v2 contract: PASS, including plane-aware pointer and save locks
- Content validation: PASS
- Game-origin errors during isolated traversal tests: zero
- Foreground smoke: PASS, structural 101/101, boot 1,114 ms, 100 FPS, 14 ms worst frame, 119 draw calls, 29,924 triangles, 7 world ticks, zero uncaught or console errors

## Final verdict

**VERTICAL CIRCULATION, CONNECTED TOWER, CAMERA, AND DOORWAY ACCEPTED; COMPLETE WALK-TO-TOP JOURNEY STILL NEEDS ONE FINAL UNINTERRUPTED RETEST.**

The swarm exposed genuine cross-floor picking and camera defects that a single-angle test missed. Those defects,
the disconnected masonry, the grass threshold and the teleport-style doorway are repaired. The remaining QA item
is deliberately narrow: walk the already-validated switchback from its base through every corner and open the
door in one uninterrupted real-pointer run.
