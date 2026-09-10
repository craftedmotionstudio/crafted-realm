# Gameplay QA Report — [Feature]

## 1. Test identity

- Feature/slice:
- QA level: Light / Full / Swarm
- Candidate build/revision:
- Final accepted build/revision:
- Date and timezone:
- Main integrator:
- Browser and version:
- URL/query parameters:
- Evidence root:

## 2. Scope and risk

### In scope

-

### Out of scope

-

### Risk surfaces

- Gameplay:
- Navigation/collision:
- Visual/animation/audio:
- Inventory/economy/XP:
- Save/migration:
- Performance/startup:

## 3. Profiles and assignments

| Profile ID | Tester/role | Baseline save/state | Permitted setup | Scenario IDs |
|---|---|---|---|---|
| | | | | |

Administrator Console/Test Travel usage:

-

Confirm that no shortcut bypassed the behavior under test: PASS / FAIL

## 4. Acceptance contract

### Starting state

-

### Golden-path actions and observable results

| Step | Player action | Expected state/UI/feedback | Evidence | Result |
|---:|---|---|---|---|
| 1 | | | | PASS / FAIL |

### Invalid-action expectations

| Case | Expected rejection/recovery | Result | Evidence |
|---|---|---|---|
| | | PASS / FAIL | |

### Persistence expectations

-

### Performance budgets

-

## 5. Automated gates

| Check/command | Result | Key output/evidence |
|---|---|---|
| Syntax/relevant unit tests | PASS / FAIL | |
| Feature contract tests | PASS / FAIL | |
| `node tools/validate_content.js` when applicable | PASS / FAIL / N/A | |
| Asset/model checks when applicable | PASS / FAIL / N/A | |
| Other regression suites | PASS / FAIL / N/A | |

## 6. Live golden-path run

Start timestamp:

Starting inventory/equipment/XP/progress:

-

Action log:

| Time/step | Visible interaction performed | Actual result and state delta | Animation/audio/message observed | Evidence | Result |
|---|---|---|---|---|---|
| | | | | | PASS / FAIL |

Final inventory/equipment/XP/progress:

-

Golden-path verdict: PASS / FAIL

## 7. Negative and interruption matrix

| Scenario ID | Case | Starting state | Steps | Expected | Actual | Evidence | Result |
|---|---|---|---|---|---|---|---|
| N-01 | Missing/wrong tool | | | | | | PASS / FAIL / N/A |
| N-02 | Missing/insufficient input | | | | | | PASS / FAIL / N/A |
| N-03 | Full inventory | | | | | | PASS / FAIL / N/A |
| N-04 | Wrong order/target | | | | | | PASS / FAIL / N/A |
| N-05 | Repeated/rapid activation | | | | | | PASS / FAIL / N/A |
| N-06 | Walk away/change target | | | | | | PASS / FAIL / N/A |
| N-07 | UI/equipment/reload interruption | | | | | | PASS / FAIL / N/A |
| N-08 | Blocked/edge/cardinal approach | | | | | | PASS / FAIL / N/A |
| N-09 | Depleted/already claimed/completed | | | | | | PASS / FAIL / N/A |
| N-10 | Leave and re-enter | | | | | | PASS / FAIL / N/A |

## 8. Four-direction visual and interaction review

Complete one row per important object or animated interaction.

| Object/action | North evidence/findings | South evidence/findings | East evidence/findings | West evidence/findings | Scale/silhouette | Collision/hitbox/reach | Camera readability | Result |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | PASS / FAIL |

Structured visual review:

- Shape hierarchy and proportions:
- Color/material separation:
- Reference-defining features:
- Warm low-poly family consistency:
- Wall/floor/roof/neighbor clipping:
- Visible model versus interaction alignment:
- Gameplay-camera readability:

Animation review:

| Animation | Start | Contact/impact | Follow-through/loop | Return to idle | Held-tool grip/orientation | Sound timing | Evidence | Result |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | PASS / FAIL |

## 9. Persistence and migration

| Checkpoint | Save state before reload/transition | State after reload/return | Duplication/loss/reset? | Evidence | Result |
|---|---|---|---|---|---|
| Before start | | | | | PASS / FAIL |
| Intermediate state | | | | | PASS / FAIL / N/A |
| Completed state | | | | | PASS / FAIL |
| Leave and return | | | | | PASS / FAIL / N/A |
| Older save/migration | | | | | PASS / FAIL / N/A |

## 10. Foreground smoke, performance, and console

- Smoke URL: `http://127.0.0.1:8777/?smoke=1`
- Foreground tab confirmed: Yes / No
- `[SMOKE]` verdict:
- Structural result:
- Boot/settle:
- FPS:
- Worst frame:
- Draw calls:
- Triangles:
- World-tick health:
- Uncaught errors:
- Console errors/warnings introduced:
- Responsiveness observations:
- Evidence:

Gate verdict: PASS / FAIL

## 11. Defect ledger

| ID | Severity | Summary | Frequency | Reproduction/evidence | Owner | Disposition | Retest build/result |
|---|---|---|---|---|---|---|---|
| | S0 / S1 / S2 / S3 / S4 | | | | | Open / Fixed / Deferred / Duplicate | |

For each nontrivial defect, include:

- Starting state:
- Exact reproduction steps:
- Expected result:
- Actual result:
- Console output:
- Suspected cause (clearly marked as hypothesis):
- Affected and downstream scenarios requiring retest:

## 12. Retest and regression record

| Defect/scenario | Exact reproduction repeated? | Adjacent regression coverage | Result | Evidence |
|---|---|---|---|---|
| | Yes / No | | PASS / FAIL | |

## 13. Final acceptance

- All required scenarios pass on one final build: Yes / No
- Open S0 defects: 0 / [count]
- Open S1 defects: 0 / [count]
- Open S2 defects: 0 / [count]
- Visible S3 defects fixed or owner-deferred: Yes / No
- Real-interaction golden path repeated after last relevant fix: Yes / No
- Persistence proven after completion: Yes / No
- Four-direction review complete: Yes / No
- Moving elements and action animations observed: Yes / No
- Automated gates pass: Yes / No
- Foreground smoke and console gate pass: Yes / No

Honest remaining limitations/deferred items:

-

Final verdict: ACCEPTED / REJECTED / BLOCKED

Main-integrator sign-off:

- Name/agent:
- Date/time:
- Acceptance rationale:

