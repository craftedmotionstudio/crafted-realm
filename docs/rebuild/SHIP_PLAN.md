# Crafted Realm — plan to a shippable game

Status: **v0.6 — Phase 1 foundation complete; Phase 2 authoring language next**  
Date: 2026-07-13

Execution checkpoint (2026-07-13): the Phase 1 engine exit gate is complete. Tutor's Holm streams a bounded
7x7 chunk-native terrain/collision ring plus validated chunk-owned object/interaction rows and shared asset
templates. The minimap now composes cached static geography, chunk/resource markers, and a 128-marker live
layer; camera orientation, compass, landmark, destination, and click-to-walk behavior remain intact. A real
minimap click moved the player across both chunk axes and rebuilt only the appropriate cached layers.

A one-shot rowboat asset failure produced the in-page recoverable error, and the real **Try again** action
cleanly reloaded to the saved-adventurer welcome screen. Five consecutive foreground Chrome runs passed
71/71 structural checks at 60 FPS with zero errors. Across those runs the worst frame was 22–44 ms, draw
calls were 295–348, triangles were 95,563–96,729, every stream route crossed eight chunk boundaries, save
position/progress restored exactly, and object release/cache counts returned to baseline. Direct Codex visual
review rated the live minimap 9.1/10 for land/water topology, contrast, compass/landmark readability, and
cohesion with the existing bezel. Its broader four-region topology and final art remain intentionally open
for owner approval.

The remaining globally built Holm dressing is temporary Phase 3 content, not a foundation dependency; do
not expand it. Replace or retire it through Phase 2's data-authoring tools when rebuilding the arrival. Phase
2 now starts with the schemas, validator, and one complete data-authored building/chunk workflow needed before
Hollow Well Square production scales.

This is the execution plan from the current responsive world-v2 recovery build to a public,
supportable release. It is deliberately gated: later content does not proceed while an earlier
foundation is unstable, unfun, unsafe, or undefined.

The owner interview is complete for Browser 1.0 and the initial post-launch direction. Deferred
commercial decisions remain explicitly marked. Decisions belong in the ledger at the end so they
survive chat history and prevent scope drift.

## 1. Where we are today

### Proven and worth preserving

- Responsive v2 recovery boot at Tutor's Holm: approximately 0.5–1.0 seconds to title, 11 ms
  Play-to-first-frame, 57–60 FPS in the current browser test, and a passing 43/43 smoke suite.
- Exact OSRS combat calculations and XP curve, locked by automated tests.
- One-unit tiles, four-direction movement, click-to-move BFS, collision flags, 600 ms world tick,
  run energy, Prayer, Magic, specials, equipment, inventory, bank, shops, skills, drops, and local
  saves.
- Interaction dispatcher, intents, scheduler, event bus, item attributes, content validator,
  admin console, Build Mode, UI tabs, overlays, and the current minimap.
- A substantial library of final and experimental art, item icons, modelled props, characters,
  and Studio reference builders.
- Canonical macro map and a coherent fiction foundation: Tutor's Holm, Veyhollow, Hollow Well,
  the Ditch, Scarlands, Scarring, factions, and Undercrag.

### Not yet a finished game

- World v2 is a recovery region, not the real streamed chunk runtime.
- The old full world is preserved behind `?world=legacy`, but its placement architecture is not
  suitable for release.
- Tutor's Holm, Hollow Well Square, the Commons, roads, buildings, landscape, and opening quests
  still require purposeful v2 re-authoring.
- Existing content systems are deeper than the currently playable v2 content; much of their old
  placement is deliberately unloaded.
- The story documents contain useful canon but contradictory or obsolete tutorial, geography,
  milestone, and content-status claims.
- Economy rules are local and incomplete: shop restocking/pricing, item sinks, ground-item
  ownership, anti-duplication, and balance simulation need release-grade treatment.
- Real player presence, chat, trade, Exchange, PvP, shared events, server persistence, accounts,
  moderation, and security do not exist.
- Production hosting, patching, rollback, monitoring, analytics, support, policies, and live-ops
  processes do not exist.
- NPC implementation is conditionally authorized, but remains deferred until the v2 chunk and
  environment stability gate is demonstrated.

## 2. The release ladder

### Locked first-release profile (owner, 2026-07-13)

- **Product:** a polished single-player game first.
- **Platform:** desktop browser first; mobile/PWA is later.
- **Price:** completely free at first public release.
- **Content:** three or four deep, interconnected regions with approximately 10–20 hours of
  meaningful progression, rather than the entire macro map.
- **Budget:** keep pre-release cash spending below a few hundred dollars. Prefer existing assets,
  free/open tooling, static hosting/CDN options, and work that does not create recurring services.
- **Growth path:** if the game earns traction, increase investment, evaluate a Steam-packaged build,
  later introduce an optional members offering, and pursue an Android application.
- **NPCs:** modelled NPC, placement, animation, dialogue, and encounter work is authorized only after
  the chunk foundation and environment are stable. World NPC spawning remains disabled until that gate.

### Locked player-experience profile (owner, 2026-07-13)

- **Comprehension:** newcomers should understand the game immediately; OSRS familiarity should reward
  the player with recognition and depth, never be required to understand a goal or interface.
- **Session elasticity:** a player should accomplish something meaningful in 15–30 minutes, while the
  world supports hours-long skilling, combat, questing, minigame, exploration, collection, and quiet
  view-enjoyment sessions; human social downtime arrives with the later online expansion. “10–20 launch
  hours” describes authored progression, not a hard ending.
- **Progression:** effective progression should be at least approximately three times faster than OSRS,
  with exact existing XP/combat mathematics preserved and rates tuned through XP sources and content.
- **Player fantasy:** the character arrives in the medieval world with almost nothing. They are not a
  foretold hero; they pursue strength, wealth, skills, exceptional equipment, and the ability to defeat
  the largest bosses through their own choices.
- **Death:** ordinary-region death is forgiving and recoverable. Scarlands entry clearly communicates
  higher item risk. Future online PvP should use familiar unskulled/skulled protected-item rules and a
  Protect Item modifier, but multiplayer item loss cannot ship before the authoritative online phase.
- **Scarring Surges:** milestone-gated, clearly telegraphed, and knowingly started by the player after
  preparation. They never resolve while the player is offline and never erase a vacationing player's
  permanent ownership or accumulated progress.
- **Story structure:** no mandatory “main quest” owns the player's journey. Regional and faction quest
  arcs can be completed in flexible order; a mysterious shard may exist as an optional quest item, not
  the character's identity, destiny, or a required path through the world.
- **Endgame:** completing an arc creates a durable victory without ending the sandbox. The launch
  capstone can permanently secure Veyhollow from involuntary Surges; optional controlled Surges, deeper
  Scarlands expeditions, bossing, skill mastery, wealth, rare equipment, collections, minigames, and
  homestead advancement continue afterward in an OSRS-like long tail.

### Housing and construction — locked Browser 1.0 direction

The distinct direction worth prototyping is a **purchasable homestead on a fixed authored plot**, not
unrestricted world voxels. Inside its build envelope, the player would choose foundations and snap
crafted floor, wall, roof, fence, gate, workshop, storage, and trap modules into readable sockets.
Woodcutting/Construction supplies timber and palisades; Mining, Smithing, and Masonry supply stone,
nails, fittings, gates, and reinforced defenses; Crafting supplies rope, hides, wattle, tiles, and
furnishings. Period materials should favor timber framing, wattle-and-daub, fieldstone, lime mortar,
thatch, wooden shingles, and clay tile over modern Portland cement.

For the first public release, the locked ceiling is one compact homestead, a few meaningful
foundation/layout choices, functional crafting/storage stations, and defenses that matter during
player-started Surges. Advanced estates and more plots wait until this loop proves fun. A Surge may
damage or temporarily disable repairable defenses, but cannot delete the deed, bank, house, or offline
progress.

### Locked progression and economy profile (owner, 2026-07-13)

- **Levels and XP:** retain level 99 and the exact OSRS XP table. Target at least approximately 3×
  effective progression by tuning action XP, quest rewards, encounter rewards, and useful unlock pacing;
  do not replace or mathematically distort the curve.
- **Equipment permanence:** ordinary weapons, armor, and tools do not degrade or require routine repair.
  Achievement gear should remain an achievement rather than becoming a recurring chore.
- **Healthy sinks:** food, ammunition, runes, potions, crafted homestead components, damaged civic and
  homestead defenses, travel, services, reclaim fees, and optional cosmetics remove items/Crowns.
- **Boss rewards:** important launch boss uniques target an expected acquisition range of roughly 10–30
  successful kills. Extremely rare rates belong to optional prestige cosmetics, not required power.
- **Regional commerce:** shops use bounded stock, restocking, buy/sell limits, regional specialties, and
  controlled price bands. Regional knowledge creates opportunity without deterministic infinite-profit
  loops.
- **Save promise:** alpha/beta saves are versioned and support export/import backups. Avoid wipes, but
  reserve a clearly communicated beta reset for irreparable economy/save corruption. Browser 1.0 progress
  is permanent and receives migrations rather than planned wipes.
- **Names:** early proper nouns are working canon, not untouchable. Renames require one deliberate naming
  and originality pass that updates data IDs only when necessary, display text, quests, map labels, lore,
  tests, migrations, and save compatibility together.

### Locked presentation profile (owner, 2026-07-13)

- **Camera:** preserve a readable OSRS-style elevated camera with bounded rotation and zoom. No first-person
  requirement or unrestricted camera that obscures navigation and interactions.
- **Character creation:** lightweight name, body presentation, skin tone, hair, hair color, and a small
  facial-choice set. No permanent class or starting-stat trap; earned equipment defines most appearance.
- **Writing tone:** concise OSRS-like conversations mixing grounded stakes, dry humor, eccentricity, and
  occasional cheesiness. Required dialogue stays short; optional questions, books, examinations, and
  environmental clues carry deeper lore.
- **Day/night:** Browser 1.0 includes a true visual day/night cycle. It cannot gate essential content behind
  real-time waiting, make the UI/world unreadable, alter offline state, or break performance budgets.
  Region identity and accessible brightness take precedence over physical darkness.
- **Content tone:** cozy and broadly teen-friendly, with stylized fantasy combat and eerie/dangerous regions
  but no graphic gore or sexual content.
- **Accessibility:** preserve the familiar OSRS-like visual grammar while supporting scalable text/UI,
  remappable controls, separate audio controls, captions, reduced motion/flashes, high-contrast options,
  and color-independent risk cues. Existing options are audited rather than assumed complete.
- **Music:** Suno-assisted music is allowed only with documented commercial rights and provenance for each
  shipped track. Generate candidates while subscribed to a plan that grants commercial video-game use,
  retain creation/export records, use only original inputs, and disclose pre-generated AI audio wherever a
  platform requires it. Free-plan tracks are not shippable commercial assets.

### Locked delivery, testing, and portability profile (owner, 2026-07-13)

- **Supported Browser 1.0:** current Chrome and Edge on Windows are the guaranteed launch browsers.
  Firefox, macOS, and other desktop combinations are compatibility targets after measured validation and
  do not delay the first stable release.
- **Performance:** target 60 FPS on an ordinary modern desktop/laptop and preserve a stable 30 FPS fallback
  on lower-end integrated graphics. Automatic profiles may tune internal resolution, effects, vegetation,
  and view distance without hiding gameplay information.
- **Capacity:** production is primarily the owner and Codex, with pre-release cash spending below a few
  hundred dollars, no fixed launch date, and quality-gated internal milestones every two to four weeks.
- **Testing:** owner-driven testing and automated/AI browser agents begin immediately, but do not replace
  outside human observation. Recruit approximately 10–20 human private-alpha testers before public beta;
  watch them without coaching and collect performance reports/save files with consent.
- **Analytics:** minimal privacy-conscious telemetry for startup failures, crashes, device/performance
  profiles, onboarding, deaths, quest flow, and abandonment. No advertising trackers or unnecessary
  personal data; publish consent/privacy behavior before public release.
- **Android:** a post-Browser-1.0 Android application is a committed growth direction, optimized for long
  sessions and travel. Input/UI/battery/offline behavior must be designed and tested rather than assuming
  the desktop browser can simply be wrapped unchanged.
- **Portable solo profile:** the single-player adventure save is versioned, exportable, migratable, and
  designed to become account-linked/cloud-portable across browser, Android, and Steam. It may support full
  offline play and reconcile only through explicit conflict-safe solo-save rules.
- **Authoritative online profile:** future shared economy, trade, PvP, Oathring, and member-world characters
  require a connection and server authority. Offline-earned items, XP, or Crowns never upload into the
  shared economy. Solo and online profiles may share one account identity but cannot transfer wealth.
- **Account durability:** stable account/character IDs, versioned schemas, backup/export, migrations,
  rollback, and recovery precede every platform or world transition. Avoid forced restarts.

### Deferred monetization decisions

The owner may later consider purchasable Crowns and separate member-specific worlds/items. Neither is
approved or designed yet. Directly purchasing a tradeable power currency conflicts with the current
no-pay-to-win direction and changes inflation, fraud/chargeback, real-world-trading, ratings, payment,
platform, and economy requirements. Completely isolated free/member economies can reduce crossover but
also split friends, identity, content, balance, and liquidity. Revisit only after a healthy authoritative
online economy exists, with an explicit entitlement/economy design and legal/platform review. Membership
and cosmetics remain the preferred first monetization experiments.

### Competitive duels — Oathring direction locked

The post-online competitive venue is **The Oathring**: voluntary practice duels and skill-based tournaments
with declared rules, rankings, cosmetics, and system-issued non-tradeable Laurels. Players do not transfer
staked wealth. This preserves competition without adding gambling-rating, jurisdiction, fraud, account-
theft, collusion, real-world-trading, moderation, and economy-integrity obligations. It remains a post-online
feature and does not block Browser 1.0.

The release strategy is therefore staged:

1. **Playable Prototype** — world-v2 foundations and a complete first-hour loop.
2. **Private Alpha** — a polished local/single-player game slice tested by invited players.
3. **Public Beta** — a free single-player browser release used to prove comprehension, balance,
   compatibility, save safety, and retention across the agreed launch content.
4. **Browser 1.0** — the polished free single-player game: three or four authored regions, the agreed
   progression and replayable loops, production-quality saves/hosting, and no release blockers.
5. **Online expansion** — durable accounts and authoritative shared state before chat, trade,
   Exchange, PvP, shared Surges, memberships, or a packaged store build.
6. **Live Game** — predictable patches, new roads/regions, events, balance, support, and rollback.

The first public release does **not** require accounts, networking, trade, the Exchange, shared PvP,
shared Scarring Surges, payments, or moderation infrastructure. Phases 6–7 are a post-release growth
program and must not delay the polished single-player launch.

## 3. Workstreams

Every phase draws from these continuing workstreams:

- **Product and creative:** audience, launch promise, story, regions, progression, content scope.
- **Engine and world:** boot, chunks, terrain, collision, rendering, simulation, assets, saves.
- **Gameplay and economy:** skills, combat, drops, quests, shops, sinks, rewards, balance.
- **Art, audio, and UX:** buildings, landscape, characters, animation, UI, accessibility, sound.
- **Online and trust:** accounts, server authority, persistence, trade, PvP, security, moderation.
- **Quality and operations:** tests, telemetry, hosting, deployment, rollback, support, policies.

No workstream may treat “implemented” as “shippable.” Each feature needs onboarding, failure states,
persistence, balance, accessibility, performance, telemetry, test coverage, and removal/rollback.

## 4. Phased build plan

### Phase 0 — Product lock and clean baseline

**Goal:** agree on what the first public release is and preserve a trustworthy starting point.

Work:

- Complete the owner interview and lock launch audience, platform, online scope, content size,
  business model, NPC authorization, risk rules, and target quality bar.
- Reconcile `GOAL.md`, `ROADMAP.md`, `STORY_BIBLE.md`, and the rebuild documents into one current
  canon and milestone vocabulary.
- Preserve the legacy world and current dirty work in a named baseline before core refactoring.
- Establish supported browser/device profiles and measurable performance budgets.
- Create a feature registry with owner, state, dependencies, acceptance tests, and release phase.
- Define save versioning, migration policy, and rollback rules before world coordinates change.

Exit gate:

- One written launch definition, one scope list, one non-scope list, and no contradictory roadmap.
- Current tests pass from a clean baseline and the recovery build remains reproducible.
- Every major feature belongs to Prototype, Alpha, Beta, 1.0, Later, or Retired.

### Phase 1 — Release-grade world-v2 foundation

**Goal:** replace recovery mode with the actual fast world runtime before adding density.

Work:

- Implement `WorldProvider`, a real `BootCoordinator`, weighted progress, failure/retry states, and
  named performance telemetry.
- Promote the existing 8x8 chunk model into the runtime format: terrain, tile flags, sparse object
  placements, interactions, mutations, and later spawns as separate layers.
- Stream a small ring around the player; prioritize near chunks; unload and dispose deterministically.
- Chunk terrain and collision; eliminate full-world startup passes.
- Add shared geometry/material/texture caches, instancing/merging, asset manifests, and asset budgets.
- Refactor the minimap painter into cached static, chunk-change, and bounded dynamic layers. Preserve
  functional continuity during the rebuild, but treat the supplied image, current bezel, drawing style,
  and old macro topology as revisable references rather than immutable canon.
- Add world/save revision IDs and named-landmark migrations.

Exit gate:

- Cold and warm boots meet agreed budgets in five consecutive runs.
- Crossing at least three chunk boundaries causes no visible stall or resource leak.
- Save/load across chunk boundaries is lossless; failed assets show a recoverable error.
- Exact combat/XP and four-direction movement remain unchanged. The minimap retains orientation,
  compass/landmarks, destination/risk readability, and click-to-walk while its final presentation and
  topology may be redesigned and owner-approved.

### Phase 2 — Authoring pipeline and building language

**Goal:** make high-quality places repeatable without returning to bespoke self-placing scripts.

Work:

- Adopt `docs/rebuild/ART_PRODUCTION_PIPELINE.md` as the governing visual production contract for
  environments, buildings, props, characters, monsters, worn equipment, icons, animation, and effects.
- Define chunk, building, room, door, service, interaction, roof, collision, landscape, and civic
  project schemas with validator coverage.
- Upgrade Build Mode/Studio to author chunk placements, floor layers, walls, roofs, doors, service
  anchors, support spaces, and interaction tiles as data.
- Create one audited asset catalog: final, rework, reference-only, archive; raw backups stay out of
  the production manifest.
- Build the consistency fixtures: palette/material library, scale mannequins, fixed Studio camera and
  day/night presets, canonical humanoid rig/attachments, monster archetype scenes, animation matrix,
  icon template, GLB validator, provenance schema, and automatic comparison captures.
- Upgrade Studio to load/review GLBs, scrub clips, preview worn gear/body variants, inspect monsters,
  show game-camera/night presets, and report family budgets.
- Establish a coherent architecture kit without prefab-building repetition.
- Require every enterable building to have a primary service, secondary use, story clue, readable
  frontage, navigable interior, and believable support space.
- Require every landscape placement to serve navigation, use, ecology, occupation, story, or
  composition.

Exit gate:

- A designer can build, move, validate, save, reload, and remove one complete building and chunk
  without editing the engine.
- Roof-off, pathing, interaction, performance, and visual-review checks are automated or scripted.
- Loading/unloading the authored test chunk returns resource counts to baseline.
- Two independently authored assets in each active family reproduce the same scale, palette, detail,
  animation, and performance standard; no asset is promoted on an isolated close-up alone.

### Phase 3 — The proving slice: First Bell at Veyhollow

**Goal:** build one connected, polished 45–75 minute experience before expanding the map.

World scope:

- Rebuilt Tutor's Holm arrival.
- Hollow Well Square as the civic/social anchor.
- Four functional Commons buildings: bank, smithy, provisions kitchen/shop, and ward hall or pub.
- One authored road with Emberwood logging and Stonereach mining branches.
- One preparation threshold at the Ditch.
- One compact Scarlands risk/reward pocket.

Gameplay scope:

- One gather → process → use/sell loop for wood and one for ore.
- Banking, bounded shops, equipment upgrade, food/supplies, useful Crowns, and item sinks.
- Optional opening threads: Hollow Well disturbances, a broken ward-line, livelihoods around the
  Commons, and evidence beyond the Ditch. A mysterious wreck shard may begin one quest, but is never a
  mandatory campaign rail.
- A reliable low-risk route and a meaningfully better high-risk route.
- Contextual tutorials instead of a checklist of every system.
- Environment and service testing without placeholder NPCs; actors are added only when authorized.

Exit gate:

- A blind first-time tester can move, interact, equip, bank, identify four core services, choose a
  goal, earn an upgrade, and explain why the Well and Ditch matter.
- Median tutorial is 8–12 minutes; first meaningful choice occurs within five minutes.
- Tester can complete at least one distinct Provider, Hunter, or Seeker story.
- Every required route passes real click-to-move; every core building passes the building law.
- Startup/performance budgets remain green in the busiest slice view.

### Phase 4 — Release-grade core systems and economy

**Goal:** turn the slice from a guided demo into a replayable RPG foundation.

Work:

- Ground-item ownership → public → despawn lifecycle; tile stacking and death-drop rules.
- Shop stock, restocking, price bands, buy/sell caps, regional supply logic, and exploit tests.
- Item/Crown source-and-sink ledger; scripted one-hour and long-run economy simulations.
- No routine durability system for ordinary equipment; only explicitly repairable world/homestead
  defenses and other declared sinks consume repair materials.
- Quest-state migration, route unlocks, service unlocks, and world-state mutations.
- Complete skilling interruptions, tool checks, inventory-full behavior, reconnect/load behavior,
  cancellation, and feedback.
- Combat encounter, boss, death, loot, Prayer, Magic, special, and equipment regression suites.
- Difficulty, XP, drop, gear, food, and travel balance for the agreed progression rate.
- Scarring Surge data model and fixed civic sockets; event combat remains gated by NPC/online scope.
- One fixed-plot modular home loop with crafted material components, useful stations/storage, and
  repairable defenses integrated with Surges.

Exit gate:

- No deterministic risk-free Crown loop, item duplication, negative quantity, or save rollback exploit.
- Every required resource has at least two meaningful destinations.
- All supported player identities can earn a useful upgrade within the agreed early-game window.
- Save/load and version migration preserve inventory, bank, equipment, skills, quests, and world state.

### Phase 5 — Alpha content

**Goal:** reach the agreed launch-content breadth without sacrificing authored quality.

Recommended order:

1. Tutor's Holm and Veyhollow Commons.
2. Emberwood/Stonereach production and homestead road.
3. Mirrorpond/Gloomfen food, mystery, and midgame boss road.
4. Scarlands breach, escalating danger, Surges, and launch endgame.
5. Additional regions only after retention tests justify them.

Browser 1.0 foregrounds Mining, Smithing, Woodcutting, Fishing, Cooking, Crafting/Construction,
and Combat. Existing secondary skills may remain available, but do not receive equal launch-content
breadth until these essential loops are deep, interconnected, and polished.

The planning target remains approximately 10–20 authored hours, with roughly ten substantial quests,
three major bosses, several smaller encounters, and two repeatable minigames as a balance hypothesis—not
a content quota. Playtest quality, choice, and replay value decide the final counts.

The initial creature target is **8–12 genuinely distinct enemy families** plus three major bosses. Rig
sharing is encouraged; recolors alone do not count as new families. The three boss pillars are:

1. a preparation-heavy iconic lair beast with multi-style pressure and a farmable prestige table;
2. an unpredictable Scarlands anomaly whose arena/hazards change the fight rather than copying a fixed
   rotation;
3. a high-pressure endurance capstone built around clear readable tells and mastery.

These may draw structural inspiration from memorable OSRS boss roles, but all creatures, silhouettes,
arenas, attacks, names, lore, rewards, and tuning are original Crafted Realm work.

For every added road/region:

- one distinct visual/ecological identity;
- one economic specialty and at least one sink;
- one story consequence or faction relationship;
- one risk band, landmark, shortcut, and return reason;
- complete map/minimap, save, pathing, performance, audio, and test coverage.

Exit gate:

- Agreed launch hours, quests, bosses, skills, tier range, and region count are complete.
- Players voluntarily choose a next goal after the opening arc.
- No region exists mainly to fill the macro map.

### Phase 6 — Post-launch online foundation

**Goal:** make all shared state authoritative and safe before adding commerce or PvP.

Work:

- Server-owned deterministic simulation, accounts, authentication, sessions, character slots,
  database persistence, migrations, backups, restore drills, and audit logs.
- Client sends validated intents; server owns movement, inventory, XP, hits, drops, shops, quests,
  contributions, and saves.
- Reconnection, latency, prediction/interpolation, world/shard selection, maintenance mode, and
  version compatibility.
- Player presence, chat, friends/ignore, moderation actions, reporting, rate limits, and safety tools.
- Load bots, soak tests, abuse testing, secrets management, dependency scanning, and incident response.

Exit gate:

- No client-authoritative item, XP, combat, position, or currency mutation.
- Tested restore from backup, rollback of a bad deploy, and recovery from disconnect during a mutation.
- Target concurrent population passes load/soak tests with healthy tick and database latency.
- Moderation and player-report workflows work before public chat is enabled.

### Phase 7 — Post-launch online economy, trade, Exchange, and PvP

**Goal:** add the dangerous online systems only after the authority layer is proven.

Work:

- Two-stage atomic player trade with immutable offer snapshots and audit IDs.
- Exchange escrow/order book, cancellation, fees, price history, item limits, and anti-manipulation
  monitoring.
- Ground-item ownership and death transactions enforced server-side.
- Scarlands combat ranges, skulls, keep-item rules, Protect Item, single/multi zones, logout rules,
  anti-luring affordances, and clear warnings.
- No player-wealth staking in the Oathring; its rewards are system-issued and non-tradeable.
- Economy test world with planned wipes before durable launch wealth is promised.

Exit gate:

- Concurrency, disconnect, replay, double-click, stale-session, and rollback tests cannot duplicate or
  destroy items incorrectly.
- Economy monitoring can identify abnormal creation, transfer, concentration, and price movement.
- PvP rules are understandable before crossing the Ditch and cannot be bypassed by the client.

### Phase 8 — UX, accessibility, audio, and device polish

**Goal:** make the complete game comfortable and understandable outside the developer's machine.

Work:

- First-run settings, keybinds, resizable UI, color/contrast options, text sizing, reduced motion,
  volume controls, captions/subtitles where applicable, and screen-reader-friendly account flows.
- Complete original music and sound identity with performance/streaming budgets.
- Browser compatibility, resolution/aspect-ratio matrix, input focus, lost-context recovery, tab
  suspension/recovery, and low-quality graphics mode.
- Post-Browser-1.0 Android track: touch UI/input, small-screen layout, battery/thermal budgets, lifecycle
  suspension, download/update size, offline solo saves, cloud conflicts, and travel-mode recovery.
- Loading, offline, maintenance, authentication, save conflict, disconnect, and retry UX.

Exit gate:

- Supported device/browser matrix passes; no critical action relies on color alone or inaccessible text.
- Audio can be fully controlled and never blocks startup.
- New players understand failures and recovery without opening developer tools.

### Phase 9 — Production, legal, and live operations

**Goal:** make release operable, supportable, and reversible.

Work:

- Production hosting/CDN, domain, TLS, environments, CI/CD, signed/versioned builds, cache busting,
  feature flags, maintenance mode, canary deploy, rollback, and disaster recovery.
- Crash/error reporting, performance telemetry, dashboards, alerts, game/economy health metrics, and
  privacy-conscious analytics.
- Privacy policy, terms, age/parental decisions, cookie/analytics consent, account deletion/export,
  acceptable-use rules, community rules, and original-IP/license audit.
- Support inbox/workflow, account recovery, bans/appeals, known-issues page, status page, and patch notes.
- Payment, tax, refund, entitlement, and customer-service systems only if monetization is enabled.

Exit gate:

- A failed release can be detected and rolled back without data loss.
- A user can obtain support, recover or delete an account, and understand the rules.
- Required policies and asset/code licenses are reviewed for the intended audience and jurisdictions.

### Phase 10 — Private alpha, beta, release candidate, launch

**Private alpha:** recruit approximately 10–20 outside human testers and prove comprehension, first-hour
fun, technical stability, and save safety. Observe; do not explain unless the test calls for it. Owner and
AI/automated testing are prerequisites, not substitutes for outside humans.

**Closed beta:** prove progression, balance, retention, device compatibility, operations, save migration,
and economy integrity. Versioned export/import backups are available. Avoid wipes; any unavoidable reset
is announced with its reason and scope.

**Open beta:** prove acquisition, capacity, support load, deployment cadence, and exploit response. The
beta terms reserve a reset only for irreparable corruption or economy failure; Browser 1.0 begins the
permanent-progress promise.

**Release candidate:** content lock; only release blockers, localization/policy, performance, security,
balance emergencies, and data-loss issues change.

**Launch:** staged rollout, live dashboards, rollback owner available, support staffed, known issues
published, and the next patch already planned.

Exit gate:

- No unresolved blocker in crash/data loss/security/dupe/auth/payment/moderation categories.
- Performance and first-session success meet agreed targets across supported devices.
- Operations team has completed a deploy, rollback, backup restore, incident, and support rehearsal.

## 5. Definition of shippable

The game is shippable only when all launch-scope items satisfy these categories:

- **Promise:** store/site language exactly matches what players can do.
- **Fun:** target players choose goals voluntarily and want another session.
- **Complete:** onboarding, progression, endings/continuation, and failure states exist.
- **Correct:** combat, economy, inventory, saves, quests, and permissions pass automated tests.
- **Fast:** boot, frame, tick, memory, draw, and network budgets pass on supported profiles.
- **Safe:** no known client-authoritative economy path, critical exploit, exposed secret, or unsafe chat
  release.
- **Durable:** save migration, backup, restore, deploy, and rollback are rehearsed.
- **Understandable:** UI, rules, risk, errors, accessibility, and support paths are clear.
- **Original:** art, music, text, names, code, and licenses pass the project's IP boundary.
- **Operable:** monitoring, alerts, support, moderation, policies, and patch ownership exist.

## 6. Scope-control laws

1. Startup/performance regression stops content expansion.
2. No fourth launch region begins before the proving slice passes first-hour playtests.
3. No real trade, market, PvP, or shared event is simulated as client-authoritative multiplayer.
4. No unrestricted world block building. Settlement upgrades use authored civic sockets; a player
   homestead may use modular snap construction only inside its fixed owned build envelope.
5. No building ships without function, support space, pathing, roof, collision, and story context.
6. No random settlement scatter; placements require a reason.
7. NPC implementation remains off until the already-authorized chunk/environment stability gate passes.
8. Cosmetics, pets, deeds, dailies, and content breadth do not compensate for a weak first outing.
9. Exact combat/XP, tile scale, and four-direction movement do not change accidentally.
10. One release blocker outranks a backlog of attractive additions.
11. AI/automated play catches regressions and explores state; outside human observation remains required
    before public beta because comprehension, delight, confusion, trust, and fatigue are human outcomes.
12. Offline solo progress never crosses into a server-authoritative shared economy.

## 7. Owner interview map

The interview will proceed in small batches and update this file after each answer.

### Batch 1 — Launch identity and constraints

**Status: answered and locked on 2026-07-13.** See the release profile in §2 and decision ledger.

- First public release: local single-player, account-based online social/co-op, or MMO-lite with
  trade/Exchange/PvP?
- Supported launch platforms: desktop browser only, desktop plus mobile web, or installable PWA?
- Business model at first public release: free beta, paid game, membership, cosmetics, or undecided?
- Desired launch breadth: one exceptional compact campaign, several realized regions, or the full
  macro map?
- Target timing, budget, and regular contributors available for engineering, art, writing, audio,
  testing, community, and operations?
- Is NPC modelling/placement/encounter work now authorized once the v2 world foundation is ready?

### Batch 2 — Target player and game rhythm

**Status: substantially answered and locked on 2026-07-13.** Accessibility details and exact numerical
death/protection rules remain for systems design and playtesting.

- Primary audience, typical session length, expected weekly play, grind intensity, and solo/group mix.
- Desired first-session, first-week, and endgame outcomes.
- Difficulty, death penalty, wilderness risk, PvP opt-in rules, and accessibility priorities.
- Whether Scarring Surges are player-triggered, scheduled, shared, or post-launch.

### Batch 3 — World, story, and content

**Status: answered and direction locked on 2026-07-13.** Exact quest, boss, and minigame counts remain
playtest targets rather than quotas; faction and detailed arc decisions remain for content design.

- Launch regions, factions, quest count, boss count, tier ceiling, and skills foregrounded.
- Story tone, dialogue density, player identity, moral choice, and whether the player is exceptional.
- Hollow Well/Scarring/Undercrag canon decisions and the first arc's ending.
- Housing, civic projects, construction, minigames, clues, bounties, pets, and achievements by milestone.

### Batch 4 — Economy and progression

**Status: answered and direction locked on 2026-07-13.** Exact action XP, reward tables, stock quantities,
price bands, sink costs, and drop rates remain balance hypotheses until simulated and playtested.

- XP rate, expected time per tier/level band, item loss, repair/durability, shops, sinks, rarity, and
  trade restrictions.
- Whether wealth is permanent through beta, seasonal, wiped at 1.0, or separated by test/production worlds.
- Anti-pay-to-win boundary and monetization entitlements.

### Batch 5 — Presentation, character, and release experience

**Status: answered and locked on 2026-07-13.** Exact day length, lighting curves, character option counts,
audio list, and supported hardware remain implementation/playtest decisions. The non-staked Oathring is
locked for the post-online competitive direction.

- Camera and control feel, character creation, dialogue tone, environmental mood, audio direction,
  accessibility, supported desktop profiles, and content/age tone.
- Testing community, analytics/privacy, support, release cadence, and the Browser 1.0 store/site promise.

### Batch 6 — Post-launch online community and trust

**Status: answered at direction level on 2026-07-13; core owner interview complete.** Exact concurrency,
moderation staffing, bot/multi-account rules, and commercial entitlements wait for the funded online phase.
Purchasable Crowns and free/member economy separation remain intentionally unresolved.

- World size/concurrency, regional servers, chat types, friends/clans/parties, moderation philosophy,
  reporting, age audience, names, and account recovery.
- PvP scope, trade scope, Exchange behavior, bot policy, multi-account policy, creator/admin powers,
  monetization entitlements, and live-content capacity. This batch does not block Browser 1.0.

## 8. Decision ledger

| Decision | Status | Owner answer | Consequence |
|---|---|---|---|
| First public release online scope | Locked | Polished single-player first | Phases 6–7 move post-launch and do not block public release. |
| Launch platforms | Locked | Windows desktop Chrome and Edge first | Firefox/macOS are compatibility targets; Android and packaged desktop are later tracks. |
| Launch business model | Locked | Completely free initially; optional members later | No payment/entitlement system in first-release scope. |
| Launch content breadth | Locked | Three or four deep regions; approximately 10–20 hours | Finish an authored core rather than filling the whole macro map. |
| Time, budget, and contributors | Locked | Owner + Codex; pre-release cash below a few hundred dollars; no fixed launch date | Quality-gated milestones every 2–4 weeks; increase investment only if traction proves out. |
| Steam growth path | Direction locked | Evaluate a packaged Steam release if the browser game starts doing well | Keep saves/input/rendering portable; packaging and store work are post-validation. |
| NPC work authorization | Conditional authorization | Authorized after chunk foundation and environments are stable | Keep spawning disabled until the Phase 2/3 environment gate, then add only modelled NPCs last. |
| Immediate audience | Locked | Newcomers understand it; OSRS players recognize its depth | Onboarding cannot assume RuneScape knowledge. |
| Session rhythm | Locked | Progress in 15–30 minutes; support sessions up to many hours | Layer short goals, long grinds, quests, combat, minigames, exploration, and restful spaces. |
| Progression speed | Direction locked | At least approximately 3× faster than OSRS | Preserve exact formulas; tune source rates and content pacing, then playtest. |
| Player identity | Locked | Arrive with almost nothing; self-directed pursuit of strength, bosses, wealth, and best gear | Avoid chosen-one framing; status is earned through action. |
| Death and Scarlands risk | Direction locked | Forgiving ordinary death; clearly warned higher Scarlands stakes; OSRS-like protected items for future PvP | Exact counts, reclaim timing, and PvE rules still need prototyping; online loss must be server-authoritative. |
| Scarring Surge trigger | Locked | Prepared, milestone-gated, and knowingly player-started | No offline resolution or permanent offline destruction. |
| Scarring Surge completion | Locked | Eventually secure Veyhollow so normal Surges can no longer break in | Preserve optional controlled challenge Surges and deeper Scarlands threats after the durable story victory. |
| Story structure | Locked | Open-ended world with no mandatory main path; the mysterious shard is at most an optional quest item | Regional/faction arcs invite rather than compel; progression cannot depend on one narrative railroad. |
| Housing/construction | Locked for Browser 1.0 | One fixed purchasable homestead with crafted modular components and defenses | Build only after the proving slice; no unrestricted world voxels or offline estate deletion. |
| Unrestricted building vs civic sockets | Direction locked | Authored civic sockets in settlements; modular construction only inside a fixed homestead envelope | Protects authored world composition while supporting player expression. |
| Browser 1.0 regions | Locked | Tutor's Holm/Veyhollow; Emberwood/Stonereach; Mirrorpond/Gloomfen; Scarlands | Four complementary roads from safe civic life through production and mystery to dangerous endgame. |
| Essential launch skills | Locked | Mining, Smithing, Woodcutting, Fishing, Cooking, Crafting/Construction, and Combat | Other skills may exist, but these receive the deepest interconnected launch content first. |
| Authored launch content | Direction locked | Approximately 10–20 hours; ~10 substantial quests, 3 major bosses, smaller encounters, and 2 minigames as planning targets | Counts can change when playtests show a better quality/retention balance. |
| Endgame shape | Locked | OSRS-like long tail after completable regional arcs | Skill mastery, best gear, rare drops, wealth, bossing, collections, minigames, homestead advancement, and voluntary challenges remain. |
| Level and XP policy | Locked | Level 99 and exact OSRS XP table; at least ~3× effective progression | Tune action/quest/reward XP and unlock pacing without replacing the curve. |
| Equipment durability | Locked | No routine degradation or repairs for ordinary weapons, armor, or tools | Use consumables, services, construction, defense repairs, and other healthy sinks instead. |
| Boss unique rarity | Direction locked | Important power uniques target roughly 10–30 successful kills | Reserve extreme rarity for optional prestige cosmetics; validate with drop simulation. |
| Regional shops | Locked | Bounded stock/prices and regional specialties | Reward travel and knowledge while testing out infinite-profit loops. |
| Save/wipe policy | Locked | Versioned backups in beta; avoid wipes; Browser 1.0 progress permanent | Reset beta only for clearly communicated irreparable corruption/economy failure. |
| Naming authority | Locked | Early names may be improved through a deliberate canon pass | Preserve originality and update display text, data, map, quests, tests, and saves coherently. |
| Camera | Locked | Elevated OSRS-style readability with bounded rotation and zoom | Interaction visibility and navigation clarity outrank cinematic freedom. |
| Character creation | Locked | Lightweight appearance/name choices; no classes or starting-stat traps | Equipment and earned progression define the character afterward. |
| Dialogue tone | Locked | Concise OSRS-like balance of seriousness, dry humor, eccentricity, and cheesiness | Keep mandatory conversations short and deeper lore optional. |
| Day/night | Locked for Browser 1.0 | True visual cycle | No offline advancement, forced waiting, unreadable darkness, or performance regression. |
| Content tone | Locked | Cozy teen-friendly fantasy; no graphic gore or sexual content | Scarlands may be eerie and dangerous without becoming graphic. |
| Accessibility | Direction locked | Preserve OSRS visual grammar with modern options | Audit existing support; add scalable UI/text, remapping, captions, reduced effects, contrast, and redundant cues. |
| Suno music | Conditionally approved | Use commercially licensed paid-plan generations with records | Free-plan tracks are excluded; retain provenance and make required platform AI disclosures. |
| Competitive duel venue | Locked post-online | The Oathring: practice/ranked tournaments, cosmetics, and non-tradeable Laurels; no player-wealth staking | Avoid gambling/RWT/fraud scope while preserving competitive duels. |
| Visual production pipeline | Locked | Reference-driven family pipeline covering environments, characters, monsters, gear, icons, motion, integration, and performance | `docs/rebuild/ART_PRODUCTION_PIPELINE.md` governs; isolated attractive assets are not “done.” |
| Visual reference interpretation | Locked | Match detail, readability, density, and composition while creating original Crafted Realm designs | References define quality/grammar, not permission to copy protected assets. |
| Humanoid production | Locked | One canonical player/NPC rig and body standard with modular variety and distinctive hero silhouettes | Consistent animation and gear fit; NPC work still waits for the environment gate. |
| Launch creature breadth | Direction locked | 8–12 distinct enemy families and 3 major bosses | Shared rigs are allowed; recolor-only variants do not count as breadth. |
| Boss pillars | Direction locked | Prepared lair beast, unpredictable Scarlands anomaly, and readable endurance capstone | Capture memorable combat roles using original creatures, arenas, attacks, lore, and rewards. |
| Launch equipment presentation | Locked | Copper starter subset; full bronze/iron/steel; distinctive Aurel/Veyrite; Cinderbound prestige | Every supported equippable needs its 2D icon, worn/held 3D form, and animation/fit matrix. |
| Launch animation baseline | Locked | Locomotion, combat families/reactions, essential skilling/production/interactions, and an initial expressive emote set | One data-driven animation contract; visuals align to but never alter the 600 ms simulation. |
| Visual anchor approvals | Locked | Hollow Well scene; player in bronze; one friendly NPC after gate; one common monster plus boss | Approve anchors before scaling each family and compare later production against them. |
| Sacred mechanics | Locked | Exact combat/XP; 1-unit tiles; four-direction movement | Regression-gated. |
| Minimap and world-map presentation | Reopened and direction locked | Supplied image/current version are rough references; redesign as needed around the authored four-region world | Preserve useful orientation, landmark, destination, risk, compass, and click-to-walk functions; topology and appearance require new approval. |
| Performance promise | Locked | Target 60 FPS; stable 30 FPS fallback with automatic quality profiles | Validate on supported hardware; tune resolution/effects/vegetation/view distance without hiding gameplay. |
| Human testing | Locked | Owner and AI test continuously; recruit 10–20 outside humans before public beta | AI does not replace uncoached human comprehension, fun, fatigue, and trust testing. |
| Analytics/privacy | Locked | Minimal privacy-conscious crash/performance/progression telemetry; no ad trackers | Collect only needed data with disclosure/consent and no unnecessary personal information. |
| Release cadence | Locked | Quality-gated internal milestones every 2–4 weeks; no fixed launch date | Public builds require smoke, save migration, and complete-flow gates. |
| Android growth path | Locked post-Browser-1.0 | Account-linked mobile app suitable for long travel/offline solo sessions | Design touch, battery, lifecycle, download, offline, and cloud-conflict behavior explicitly. |
| Offline/online profile boundary | Locked | Offline-capable portable solo profile; connected server-authoritative online profile | Same account identity may hold both; no item/XP/Crown transfer from offline solo into shared economy. |
| Online social scope | Direction locked | Small worlds, text chat, friends/ignore, parties, clans, trade, Exchange, Oathring, and Scarlands PvP; no voice | Requires authority, moderation, reporting, and load tests; remains post-launch. |
| Platform/account migration | Locked | Preserve identities and progress across upgrades and later browser/Android/Steam surfaces | Stable IDs, versioned saves, backups, migration rehearsals, rollback, and account recovery are release gates. |
| Membership | Deferred direction | Member worlds, regions, access, and items may come later | Define entitlements and whether economies interoperate only after online authority exists. |
| Purchasable Crowns | Unresolved, not approved | Owner may consider them later | Conflicts with strict no-pay-to-win if tradeable for power; requires explicit economy/legal/platform decision. |
