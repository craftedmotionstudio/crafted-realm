# Overhaul route sampling audit — 2026-09-12

Read-only staged terrain diagnostics, not gameplay accessibility proof. No live provider, geometry, placements, saves or browser were changed. Main owns in-app review.

Run `node tools/audit_holm_overhaul_routes.js` for full JSON on stdout; automatic fixture results print to stderr. Optional positional arguments select bundle and plan paths. The tool never writes either input. Its default bundle is `.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json`; default plan is `docs/rebuild/holm-overhaul/plan.json`.

Audited current staged bundle SHA-256: `6748110e2ad3561f7d32b8402fa323ddbc8f32e64a4a7740567303022148c7bb`. The JSON includes exact hashes of both inputs so future results can be distinguished from this snapshot.

The six surface paths contain 413 one-tile cardinal edges. Current sample finds **31 edges above 0.5 height/tile**, **5 creek intersections**, **zero sea intersections**, and **4 places whose footprint samples disagree with the proposed level pad**. Cave routes are deliberately excluded because the surface heightfield does not describe their floor.

| Path (plan array order) | Edges | Steep edges | Wet edges | Maximum height change/tile |
|---|---:|---:|---:|---:|
| 1 primary | 135 | 13 | 3 | 1.6162 |
| 2 primary | 46 | 2 | 0 | 0.5824 |
| 3 primary | 64 | 13 | 0 | 1.0007 |
| 4 primary | 49 | 0 | 0 | 0.3213 |
| 5 secondary | 54 | 3 | 2 | 0.9586 |
| 6 secondary | 65 | 0 | 0 | 0.3023 |

Priority locations for authoring:

- **High: timber crossing approaches.** Path 1 segment 6, (51,87)→(50,87), drops 1.6162; (43,87)→(42,87) rises 1.3325. The creek intersects edges x48→47,47→46,46→45 at z87. The bridge marker is (49,87), east of much of the wet span. The last wet edge is more than three tiles from that marker. Give the bridge an explicit deck length/width/elevation and design both approaches together; a centre marker is insufficient.
- **High: survival-to-kitchen bend.** Path 1 segment 8, (46,76)→(47,76), drops 1.3694. Segment 9, (47,75)→(47,74), rises 1.1981. Author a coherent graded approach rather than treating each cliff edge as an isolated notch.
- **Medium: quarry approach.** Path 1 segment 14, (36,44)→(36,43), rises 1.0286, followed by another 0.8582 at z43→42. These exceed the requested 0.5 design threshold even though the first is below the existing 1.05 engine step threshold.
- **Medium: Lastlight climb.** Path 3 has 13 steep edges; the largest is (114,36)→(114,35), +1.0007. Grade the switchback run against the 0.5 target; do not loosen movement rules to accept it.
- **High: stone village crossing.** Path 5 intersects creek on (62,53)→(63,53) and (63,53)→(64,53). The bridge marker at (62,53) is nearby but supplies no coverage or height contract. Approach (61,53)→(62,53) drops 0.9586.

Footprint sample ranges (including boundary and lattice samples):

| Place | Proposed height | Current minimum–maximum | Implication |
|---|---:|---:|---|
| Landing | 1 | 0.5341–2.6674 | Needs authored landing/shore interface; not a level pad. |
| Survival | 2 | 2.0022–3.4727 | Outdoor area differs from proposed pad; decide intentional slope versus service platform. |
| Kitchen | 4 | 3.1710–4.0000 | Footprint loses 0.829; check terrain/creek overlap before foundation authoring. |
| Ferry | 1 | 1.9945–2.0360 | Fairly level but about one tile above proposed height; reconcile pier and shore. |

Guide, quest, mine, keep, bank, mage and Lastlight footprints match their plan height in this snapshot. That says nothing about door approaches, colliders, floor supports or interior usability.

Method: sample each drawn cardinal segment at steps no longer than one tile, bilinear terrain endpoint heights, and midpoint containing-tile water classification. Report >0.5 as medium; >1.05 as high. These are design diagnostics, not an alteration or guarantee of engine passability. Drawn routes lie on proposal coordinates and are not yet an authored gameplay tile-centre path. Wet detection is grid-classification evidence, not an exact continuous shoreline intersection test.

Bridge metadata currently includes only x/z/orientation/label. The audit explicitly labels nearby markers as **coverage unproven**; proximity never exempts a wet edge from findings. The three-tile proximity radius is only a review aid.

The automatic synthetic fixture passes 5/5 checks: detects steep edges, detects a wet edge, preserves an actually flat pad, refuses to promote nearby bridge metadata into proven coverage, and checks deterministic nonmutating results. Any runtime acceptance still requires the new slope/deck/door contracts and real in-app traversal.
