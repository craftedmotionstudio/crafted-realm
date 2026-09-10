# Crafted Realm Rebuild — Game Loop and Content Blueprint

> **Supersession note (owner, 2026-07-13):** the supplied minimap image/current macro map is now a rough
> reference, not a fixed cartographic contract. Preserve useful map functions while letting v2 authored
> regions determine final topology and presentation. See `SHIP_PLAN.md` and `GUIDING_LIGHT.md`.

**Status:** decision document for a vertical-slice rebuild; no gameplay or NPC implementation is authorized by this report.

## 1. The answer to “what is the game?”

**Crafted Realm is a cozy, account-driven frontier RPG where players choose how to become useful to Veyhollow: train skills, make and trade goods, explore dangerous country, fight for valuable drops, solve quests, and turn what they earn into personal power and a stronger settlement before the next Scarring surge.**

Most play is free-roam. The settlement is a social and economic home, not a quest corridor. The periodic threat gives the otherwise-open progression a shared direction without becoming a mandatory survival timer. The player is not asked to build a voxel world; they improve authored places through fixed, legible civic projects.

This keeps the core promise in `GOAL.md` §§1–2: OSRS's soul, our own IP, no classes, a warm old-school world, and a reason to go somewhere. It adds the purpose requested by the user: social presence, trade, combat, levels, economy, wilderness rewards, and a civilization-scale threat.

### Traceability legend

- **[U]** Current user direction.
- **[G]** `GOAL.md`.
- **[SB]** `STORY_BIBLE.md`.
- **[R]** `ROADMAP.md`.
- **[C]** `OSRS_COMPARISON.md`.

## 2. Canon reconciliation

### Keep as the immutable spine

| Decision | Why it stays |
|---|---|
| OSRS-exact combat math and XP curve | Already the strongest system-level foundation; explicitly immutable in `GUIDING_LIGHT.md`, [G], and [C]. |
| One world unit per tile; four-direction movement only | A deliberate identity choice, even where OSRS permits diagonals. [G][R] |
| A deterministic 600 ms authoritative simulation | Required for the old-school feel and later networking. [G][R][C] |
| Own world, names, art, data, and layouts | “Love letter, not clone” is non-negotiable. [G][SB][R] |
| Veyhollow Commons as the safe home and the Scarlands north of the Ditch | The strongest existing geographic and fiction anchors. [G][SB] |
| The Scarring as the long-story engine | It naturally supports exploration, the Undercrag, and the requested periodic threat. [SB][U] |
| The existing player minimap artwork as the cartographic contract | The user explicitly wants it preserved. Rebuild the world to serve the map rather than discarding the map. [U] |
| Items as 2D icons; 3D for world props and worn gear | Preserves visual cohesion and the established asset pipeline. |

### Change deliberately

| Current canon or assumption | New decision |
|---|---|
| Tutor's Holm teaches nearly every major system and all three combat styles in one linear tour. [G] | Tutor's Holm becomes a short, story-led arrival that teaches only movement, interaction, one gathering-to-use loop, equipment, one chosen combat style, loot, and departure. The Commons teaches banking, trade, other combat styles, and deeper skills through optional stations and first quests. |
| V1 is framed around 3–4 realized regions and all 15 skills. [G] | Rebuild V1 around one excellent, replayable connected slice. Preserve all 15 skill definitions, but only surface the loops that make the slice coherent. No full-map rebuild until the slice proves fun and fast. |
| Current quests form a loose “learn each skill” chain. [SB] | Rewrite them into one causal spine: the washed-up shard, the Hollow Well's response, frontier failures, the Ditch, then the source of the Scarring. Side quests may still teach systems, but each must change knowledge, access, or relationships. |
| Houses and civic buildings can be small scenery objects. | Every enterable building must have a gameplay job, a readable frontage, a useful interior, and a relationship to the street. Core buildings use roughly 8×10 to 12×16 tile footprints unless the camera proves a smaller footprint readable. |
| “Homesteads MVP exists” in the master checklist while housing remains tabled in the bible. [G][SB] | Treat the current homestead prototype as optional legacy code, not a rebuild requirement. Keep it feature-disabled until the core slice works. Later housing is instanced and authored, not unrestricted terrain construction. |
| Existing code positions still reflect the old south-Wilderness layout. [SB] | New world data follows the canonical map: Commons south of the Ditch, Scarlands to the north. Old placements have no preservation claim. |
| The upper gear ladder is presented inconsistently across documents. [G][SB] | The slice uses Bronze → Iron → Steel as the readable economic ladder. Whitsteel, Aurel, Veyrite, Undercrag, and prestige sets remain later-region rewards and are not required to prove the loop. |

### Retire from the rebuild baseline

- The claim that the game is “instant-load” until startup measurements prove it. Responsiveness is now an acceptance gate, not marketing copy. [G][U]
- Random or decorative-only object placement. A prop must support navigation, occupation, ecology, interaction, story, or composition.
- The existing world as something to preserve wholesale. Preserve independently good assets, item art, combat/XP systems, the minimap, and reusable data; replace weak placements and procedural building shells behind a feature flag.
- Tutorial checklist rooms whose only purpose is to expose a feature once.
- Generic fetch quests with no narrative payload, access change, economic choice, or world-state consequence. This strengthens the existing quest law in [SB].
- Unrestricted block/voxel construction as a core game promise.
- Fake multiplayer. Bots, ambient stand-ins, and a local Exchange simulation must not be presented as real social play.

### Preserve, but separate

- **Keep Siege** remains a possible later team-versus-team minigame. It is not the same system as the PvE Scarring surge.
- **The Exchange, direct player trade, clans, shared PvP, and friends** remain online-layer features. Their UI and data boundaries may be planned now, but their economies cannot be honestly shipped client-authoritatively.
- Existing NPC definitions and combat hooks may remain untouched, but world NPC spawns, modelling, placement, and wiring stay fully deferred until the user explicitly reopens NPC work.

## 3. Design pillars for the rebuild

1. **Free choice, visible purpose.** The player can skill, fight, quest, explore, or socialize, but every route should answer what it earns and what it unlocks. [U][G]
2. **Home, road, frontier.** Veyhollow is the safe economic and social home; roads carry low-risk production; the Ditch marks an intentional step into escalating risk. [SB]
3. **Skills solve world problems.** Mining and Smithing are not bars for their own sake: they create gear, tools, civic fittings, ammunition, and defense kits. Woodcutting, Cooking, Magic, Prayer, and the rest should have similarly legible outputs. [U][G]
4. **Authored density over world size.** A smaller world with working doors, interiors, shortcuts, supply routes, and readable neighborhoods beats twelve empty biomes. [U]
5. **OSRS rhythm, Crafted Realm fiction.** Preserve ticks, tiles, grind, loot, banks, quests, and readable risk; use the Hollow Well, the Scarring, Veyhollow factions, and our own items and layouts. [G][SB]
6. **Economy is circulation plus removal.** Every major resource needs a use, every Crown source needs a sink, and high-value drops need reasons to leave circulation.
7. **Social later means authoritative now.** Simulation, item identity, persistence, and transaction intents must be designed so the future server owns them. [G][R]
8. **Performance is part of game feel.** No new map content is accepted while startup can freeze the page. [U]

## 4. The loop hierarchy

### Core session loop: 5–20 minutes

1. **Choose a purpose** at the Commons: an upgrade, quest lead, resource order, civic project, bounty, or frontier target.
2. **Prepare** using the bank, shops, equipment, food, runes, and route knowledge.
3. **Travel** along a readable road from safe settlement to a skill site or danger pocket.
4. **Act** through gathering, production, combat, puzzle interaction, or exploration.
5. **Return or press deeper.** Banking secures value; continuing increases yield and risk.
6. **Convert rewards** into levels, equipment, Crowns, quest access, collection progress, or civic readiness.
7. **Choose again**, now with a new route or stronger goal.

The crucial choice is “bank now or risk one more objective,” not “follow the only quest marker.”

### Secondary loops

| Loop | Player promise | Examples in the slice |
|---|---|---|
| Skill ladder | Repetition produces reliable, visible mastery. | Mine iron → smelt bars → smith a weapon fitting or gate brace. |
| Gear and drops | Danger can produce exceptional, tradeable value. | Frontier encounters drop components, charges, maps, or off-ladder equipment. |
| Quest and access | Stories reveal why places matter and open new paths. | The Hollow Well identifies the shard; repairing a ward opens the north road. |
| Economy | Different play styles need one another. | Fighters consume food/runes; smiths need ore; civic projects consume processed goods. |
| Collection | Long-term goals outlive a single level. | Cipher Scroll clues, drop log, titles, cosmetic trophies, discovered map annotations. |
| Social occupation | The Commons is worth inhabiting between goals. | Trade frontage, bank forecourt, hearth, notice board, emote/seating spaces, visible gear. |

### Meta loop: several sessions

1. Complete frontier investigations and faction work.
2. Increase skill capacity and gear tier.
3. Unlock more dangerous routes north.
4. Contribute selected goods to fixed civic defenses.
5. Face a Scarring surge when the account or world reaches the forecast threshold.
6. Earn recovery rewards, new evidence, and access to the next story chapter.

The surge punctuates progression; it does not erase it.

## 5. Periodic threat decision: fixed civic defenses, not free building

### Recommendation

Adopt a periodic PvE event called a **Scarring Surge**. In fiction, pressure beneath the Undercrag travels through old ward-lines and periodically drives hostile forces toward Veyhollow. The Hollow Well acts as an early-warning instrument.

Players reinforce **fixed, authored defense sockets** at named civic locations. They contribute resources and choose upgrades, but cannot place arbitrary blocks, walls, or collision geometry.

This is the right bridge between the requested Seven Days to Die pressure and Crafted Realm's OSRS identity:

- It makes Mining, Smithing, Woodcutting, Cooking, Prayer, and Magic strategically useful. [U]
- It keeps authored roads, buildings, camera readability, tile collision, and pathfinding intact.
- It creates an item sink and shared goal without turning the game into Minecraft.
- It remains data-driven: a project is a socket, recipes, levels, states, benefits, and visuals.
- It can become a shared server event later without requiring player-owned terrain mutation.

### Cycle structure

| Phase | Near-term single-player foundation | Later online world |
|---|---|---|
| Forecast | The Hollow Well shows 3–7 **realm days** of warning. The timer advances only while playing and may be delayed until the player opts in. | A server clock publishes a scheduled window far enough ahead for different time zones. Missing the event never removes account progress. |
| Prepare | Choose a limited number of civic projects and contribute local goods. | Players contribute to capped, server-owned projects; contribution rewards diminish to prevent wealth capture. |
| Disruption | Roads become less safe, resource requests change, and ward faults expose short objectives. | World-state changes are authoritative and synchronized. |
| Assault | An 8–12 minute defense encounter uses fixed lanes, gates, supply points, and ward devices. | Scaled instances or sharded encounters prevent one crowded square and support parties. |
| Recovery | Repair costs consume surplus goods; rewards include access, cosmetics, charges, and story evidence—not unlimited raw Crowns. | Server resolves contribution and encounter rewards idempotently. |

### Example civic projects

| Socket | Inputs | Choice | Benefit |
|---|---|---|---|
| North Gate braces | Logs, bars, nails | Strong gate or quick-release sally gate | More delay or a combat shortcut. |
| Ward brazier | Runes, sanctified oil, firemaking goods | Wider ward or stronger pulse | Area protection or timed damage/control. |
| Field kitchen | Fish, grain, logs | Endurance meals or rapid rations | Longer sustain or faster resupply. |
| Smithy rack | Bars, leather, Crowns | Melee fittings or ranged fittings | Temporary event equipment choices. |
| Well lattice | Veyrite fragments later, Prayer/Magic inputs | Warning clarity or recovery | Better forecast information or post-wave restoration. |

### Guardrails

- No real-time “seven days or lose your town” loop in single-player.
- No permanent destruction of banked items, core buildings, or quest access.
- No offline punishment.
- No mandatory daily chores or contribution leaderboard power.
- No arbitrary walls, towers, voxels, or collision edits.
- No siege implementation while NPC work is deferred. The design and data contract may be prepared; actors and combat content wait for explicit authorization.
- If playtests find the surge interrupts free-roam more than it motivates it, make it player-triggered after the forecast fills.

## 6. Progression model

### Four kinds of progress

1. **Permanent account mastery:** the 15 skills on the exact XP curve, quest points, faction standing, and discovery state.
2. **Economic capability:** tools, recipes, bank stock, production access, and transportation knowledge.
3. **Combat capability:** equipment, prayers, spell access, consumables, and player knowledge; combat calculations remain unchanged.
4. **World capability:** repaired routes, opened services, civic project tiers, ward access, and Scarlands depth.

### Progression bands

| Band | Geography | Character of play | Expected rewards |
|---|---|---|---|
| Home | Tutor's Holm and Commons | Safe learning, service use, social pause, low-tier production | Bronze baseline, first tools, first story lead. |
| Roads | Emberwood edge, Mirrorpond track, Stonereach approach | Low-risk gathering, production chains, local errands | Iron capability, reliable income, route shortcuts. |
| Frontier | Ditch approaches and regional hazards | Mixed skilling/combat, deliberate preparation | Steel capability, faction access, valuable components. |
| Wild | Scarlands depth | Opt-in risk, rare resources, later PvP | Prestige drops, clues, unique charges, high-value resources. |
| Deep | Undercrag and later regions | Boss and group-ready content | Off-ladder sets, story resolution, long-game unlocks. |

### Build identities, not classes

The first hour should support at least three credible identities:

- **Provider:** gather, process, sell, stock civic projects, and fund equipment.
- **Hunter:** fight, chase drops, complete bounties, and supply rare components.
- **Seeker:** quest, explore, solve Cipher Scrolls, and unlock routes or services.

Players may mix them freely. No starting choice permanently closes another route.

## 7. Economy model

### Economic goals

- A new player understands how to earn and spend Crowns within ten minutes of reaching the Commons.
- Gathering products have at least two uses: a personal/progression use and an economic or civic use.
- Shops are convenience and baseline supply, not infinite item generators.
- Exceptional drops retain excitement because common sources do not flood them.
- Future trade is secure because every item mutation is an authoritative transaction.

### Sources and sinks

| Category | Sources | Sinks |
|---|---|---|
| Crowns | Quest milestones, controlled shop sales, bounties, salvage, later player commerce | Shop purchases, transport, service fees, market listing/tax, civic permits, cosmetic services, selected death-recovery fees. |
| Raw materials | Resource sites, wilderness nodes, drops | Tools/gear, ammunition, runes, food, quest requirements, civic project recipes. |
| Combat supplies | Cooking, fletching, rune sources, shops at a premium | Combat, wilderness expeditions, surge preparation. |
| Equipment | Smithing, shops for baseline tiers, rare drops | Civic donation for low tiers, prestige repair/charge systems where fiction supports it, later player trade. Avoid blanket durability. |
| Rare components | Dangerous drops, quests, Cipher Scrolls | Targeted upgrades, cosmetics, ward devices, prestige item charges. |

### Shop rules

- Each stocked item has default quantity, current quantity, restock rate, buy spread, and sell cap.
- Price moves within a bounded band based on stock; no runaway simulation.
- A shop only stocks items supported by its building, region, and supply route.
- General shops buy broadly but poorly; specialists buy narrowly and better.
- Civic requests may create temporary demand, but never an infinite guaranteed-profit loop.

### Single-player versus multiplayer economy

| Concern | Browser single-player foundation | Server-authoritative online layer |
|---|---|---|
| Persistence | Versioned local serializer behind the existing persistence interface. | Server database owns skills, inventory, bank, quests, orders, and world contributions. |
| Shops | Deterministic stock and bounded pricing saved locally. | Server-owned stock or per-player instances, selected deliberately per shop. |
| Direct trade | Not shipped or simulated. | Two-stage confirm screen, immutable offer snapshot, atomic commit, audit id, distance/session checks. |
| The Exchange | UI can be mocked only as a non-interactive design prototype. | Server order book, escrow, price history, fees, cancellation rules, anti-dupe and rate limits. |
| Drops | Owner/public/despawn lifecycle with a local owner id. | Server assigns ownership, visibility, pickup, and despawn ticks. |
| Scarlands PvP | PvM risk only; keep/death rules may be prepared. | Server validates targets, combat range, skull, kept items, single/multi rules, and loot. |

## 8. Social and multiplayer assumptions

### What the near-term browser build should do

- Make the Commons physically suitable for social life: broad sightlines, bank forecourt, hearth, market edge, seating, performance/emote space, and travel departures.
- Preserve visible equipment, titles, emotes, examineable achievements, and readable player silhouettes as future social signals.
- Route all meaningful actions through intent objects and the deterministic tick path.
- Give all item instances stable identity and optional attribute bags.
- Keep interfaces usable without pretending other players exist.

### What waits for the online layer

- Accounts, sessions, chat, friends, clans, parties, player visibility, direct trade, Exchange orders, shared drops, PvP, Keep Siege, shared surge state, and housing visits.
- The server is authoritative. The browser sends intents; it never tells the server that a trade, hit, drop, level, or contribution succeeded.
- Economy launch requires transaction logs, atomic item movement, dupe testing, rollback procedures, moderation tools, rate limits, and telemetry.
- A world should target stable, readable concurrency before “massively multiplayer.” Small world populations with active Commons spaces better serve this art and camera than one overcrowded shard.

## 9. World structure and regional purpose

The canonical minimap remains the promise of the eventual world. The rebuild ships it in authored rings rather than rebuilding all twelve zones simultaneously.

| Region | Gameplay purpose | Economic purpose | Story purpose | Rebuild priority |
|---|---|---|---|---|
| Tutor's Holm | Short onboarding and first meaningful choice | Starter tools only | The wreck, shard, and first warning | Slice |
| Veyhollow Commons | Safe services, social home, production, quest decisions | Bank, shops, smithy, kitchen/pub, later Exchange | Hollow Well and civic identity | Slice |
| Emberwood–Stonereach road | Two complementary gathering/production chains | Logs, ore, bars, tools, civic materials | First ward-line failures | Slice |
| North Road and Ditch | Preparation gate and explicit risk transition | Supply sink and expedition staging | Proof that the Scarring is active | Slice |
| Scarlands breach pocket | First risk/reward expedition | Rare component and valuable drops | Source clue and future-depth promise | Slice, compact |
| Mirrorpond and Gloomfen | Food economy and midgame boss arc | Fish, food, fen materials | Fenlord consequence | After slice |
| Whitmoor and Brynholt | Faction, combat, ranged/fletching identities | Regional specialities | Conflicting responses to the Scarring | After slice |
| Ashar Dunes and Saltreach | Thieving, travel, smuggling, distant trade | Imports and transport | Wider-world consequences | Later |
| Deep Scarlands and Undercrag | Endgame risk and boss progression | Prestige components | Korthul and the Scarring's source | Later |

### Settlement and building laws

1. Every building has a **primary service**, **secondary use**, and **story clue**.
2. Entrances face a route players actually use; service counters are visible on entry.
3. Interiors are large enough for camera, pathing, interaction queues, and later multiple players.
4. Buildings cluster by civic logic: bank and market share a forecourt; smithy faces material traffic; pub overlooks the social square; chapel/ward house relates to the Well.
5. Back doors, yards, storage, chimneys, drains, deliveries, and worn paths explain how the building works.
6. A decorative prop must support navigation, use, ecology, occupation, or story. Otherwise remove it.
7. Roof-off readability and tile collision are acceptance requirements, not polish.

## 10. Story spine

### Premise adjustment

The player still washes ashore on Tutor's Holm, but “no memory and no name” is not the whole hook. The wreck leaves them with a heat-scarred shard that should be inert. When brought near the Hollow Well, it resonates with buried ward-lines. This makes the player relevant through possession and curiosity, not prophecy.

### Main arc

| Chapter | Player question | World change or unlock |
|---|---|---|
| **0. The Wreck's Ember** | What survived the wreck, and how do I reach the mainland? | Learns the essential controls; chooses a first combat style; reaches Veyhollow. |
| **1. The Well Remembers** | Why does the Hollow Well react to the shard? | Opens the civic notice system, first regional leads, and one service relationship. |
| **2. Broken Lines** | Why are roads, mines, and old ward markers failing together? | Repairs one route through skilling or combat supplies; reveals the Ditch as more than a border. |
| **3. Beyond the Ditch** | What is moving south, and why now? | Opens a compact Scarlands expedition and the first rare-component loop. |
| **4. The First Surge** | Can Veyhollow prepare without becoming a fortress? | Introduces fixed civic projects and resolves a player-triggered surge. Implementation waits for NPC authorization. |
| **5. The Undercrag Answer** | Is Korthul the cause, a symptom, or a guardian? | Opens the endgame arc and preserves room for post-Korthul revelations. |

### Quest laws

- Every main quest changes access, knowledge, a service, or a world state.
- Every side quest supports a place, profession, faction, or economic relationship.
- A delivery is acceptable only when the route, choice, or item reveals something meaningful.
- Objectives should admit at least two forms of preparation when practical: skill, purchase, combat, exploration, or prior knowledge.
- Quest text must explain why an object is where it is; world placement and story are authored together.

## 11. Tutorial redesign: Tutor's Holm as an arrival, not a syllabus

### Target experience

**Length:** 8–12 minutes for a new player; under 5 minutes for a returning player who selects the accelerated path.

**Promise:** “I survived a wreck, learned how this world responds to clicks and ticks, made one useful thing, chose how to handle danger, recovered a strange shard, and reached a town with several visible possibilities.”

### Flow

1. **Wake at the wreck:** one click-to-move destination and camera hint; no text wall.
2. **Clear a route:** interact with one obstruction, showing hover action and walk-then-act behavior.
3. **Make something useful:** gather one branch or fish, then turn it into food, a fire, or a repair component. This is one complete gather → process → use loop.
4. **Choose a combat kit:** melee, ranged, or magic. Teach only the chosen style now; the other two remain optional Commons lessons.
5. **Resolve one danger:** a very short encounter after NPC work is explicitly reopened. Until then, use only the environment and training targets; do not add placeholder NPCs.
6. **Recover the shard and one drop:** teach equipment/inventory and the reason to pick up loot.
7. **Repair or signal the ferry:** use the gathered product or a second route, proving that skills affect the world.
8. **See Veyhollow before arrival:** frame the Commons and Hollow Well from the landing; then give control, not another tour.

### What moves out of the tutorial

- Banking: first optional Commons objective at the bank.
- Shops and selling: first Commons earning/spending objective.
- The two unchosen combat styles: permanent training yard or ward hall.
- Mining, Smithing, Fletching, Prayer, Thieving, and teleportation: early quests and contextual stations.
- Exhaustive UI instruction: just-in-time prompts that disappear permanently after success.

### Tutorial acceptance

- At least 80% of first-time testers can move, interact, equip, and identify their next goal without external explanation.
- Median completion is 8–12 minutes; no mandatory dialogue sequence exceeds 30 seconds without player input.
- The player performs no mechanic solely for a checklist; each action advances escape or reveals the shard.
- The tutorial contains no room or building with only one tutorial prop and no believable function.
- Skipping or accelerating never grants an economic advantage beyond the standard starter kit.

## 12. OSRS/private-server feature decisions

| Capability | Rebuild decision | Slice | Online |
|---|---|---|---|
| Exact XP curve and combat rolls | Preserve and test-lock. | Required | Server reproduces exactly. |
| 600 ms tick, four-dir tile BFS, collision flags | Preserve; finish responsiveness and interpolation work without changing rules. | Required | Server authoritative. |
| Inventory, equipment, bank | Preserve mechanics; rebuild only presentation/containers as needed. | Required | Atomic server containers. |
| Shops | Add bounded stock/restock/pricing and regional supply logic. | Required | Server or explicitly instanced stock. |
| Ground-item lifecycle | Add owner → public → despawn states before economy scale. | Required | Server authoritative. |
| Three combat styles, Prayer, Magic, specials | Preserve; tutorial teaches one chosen style. | Core combat required after NPC authorization | Authoritative timing and resource use. |
| Quests | Rewrite the first spine; retain the data-driven engine. | One three-chapter arc | Shared definitions, per-player state. |
| Bounties and Cipher Scrolls | Keep as secondary loops, but surface only after the core trip is fun. | One representative activity at most | Shared definitions, server rewards. |
| Drop log, deeds, titles, pets | Defer until the core reward loop works; then use as retention, not compensation for weak play. | Optional polish | Account-owned. |
| Direct player trade | Do not fake locally. | No | Two-stage atomic trade. |
| The Exchange | Preserve the Commons location and UI concept. | No functional market | Server escrow/order book/tax. |
| Scarlands PvP | Build geography and death-rule data; PvM only locally. | PvM risk pocket | Level-range, skull, keep rules, single/multi server-side. |
| Keep Siege | Keep as a separate later PvP minigame. | No | Post-core multiplayer. |
| Scarring Surge | Use fixed civic projects and an opt-in/predictable event. | Design/data only while NPCs are deferred | Shared or instanced server event. |
| Construction/Homesteads | No free building. Later instanced authored rooms and socketed furniture. | No | V3 visiting and ownership. |
| Overlays and QoL | Keep clean, toggleable, and non-obstructive. | Only what improves comprehension | Per-player settings. |
| Admin/build tools | Preserve as creator tools, not player mechanics. | Required for authoring | Permissioned server tools. |

## 13. The proving vertical slice: **First Bell at Veyhollow**

### Scope

A 45–75 minute first-session loop across a compact, connected world:

- Rebuilt Tutor's Holm arrival.
- Hollow Well Square and four functional Commons buildings: bank, smithy, provisions shop/kitchen, and ward hall or pub.
- One authored road with an Emberwood gathering spur and a Stonereach mining spur.
- One preparation gate at the Ditch.
- One compact Scarlands breach expedition.
- One three-chapter main quest from the shard to evidence beyond the Ditch.
- Two complete production chains:
  - logs → fire/fletching/civic timber;
  - ore → bar → personal fitting or civic brace.
- One reliable Crown route and one riskier drop route.
- Existing minimap artwork retained, with the playable extent clearly indicated rather than implying inaccessible space is complete.

NPC models, spawns, dialogue actors, and combat encounters are **not part of the first environment build pass**. Their specifications may be written, but implementation waits for explicit user authorization. Static services must remain testable through objects and interfaces in the meantime.

### Required player stories

By the end of the slice, a tester must be able to tell at least one of these stories:

- “I mined and smithed what the town needed, upgraded myself, and made money.”
- “I prepared food and gear, crossed the Ditch, and returned with a valuable component.”
- “I followed the shard mystery, opened a route, and discovered why the Well matters.”

The best result is that the tester immediately names a different route they want to try next.

### Measurable acceptance criteria

#### Startup and performance gate

- Title controls respond within **3 seconds** on the agreed baseline desktop after cached assets are available.
- New-game or continue reaches an interactive world within **8 seconds cached** and **15 seconds cold** on that baseline; progress reporting names real stages.
- No single main-thread task blocks input for more than **200 ms** during boot; heavy construction is budgeted and yielded across frames or loaded by chunk.
- No browser “Page Unresponsive” dialog in five consecutive cold-start runs.
- Foreground play sustains **45 FPS minimum** and **55 FPS median** on the baseline in the busiest slice view, with tick health inside the existing smoke budgets.
- If these gates fail, content work stops and the boot/render bottleneck is fixed before expansion.

#### World and building gate

- Every core building has a useful interior, at least two interactions, one service, and one believable support area such as storage, yard, hearth, office, or delivery point.
- All critical paths are traversed through real click-to-move from the tutorial start to the Scarlands pocket; no teleport-based verification.
- The Hollow Well remains visible or intentionally re-revealed on the main square approaches.
- No scenery collider blocks a required four-direction route; all doors and counters have interaction tiles.
- A blind tester can identify bank, smithy, food service, and north road from architecture/signage without opening the minimap.

#### Loop and purpose gate

- The first meaningful choice appears within 5 minutes.
- The first personal upgrade or useful sale is achievable within 15 minutes on each supported identity route.
- Every required resource has at least two destinations; no mandatory item exists only to satisfy one fetch step.
- Testers can state the immediate goal, the risk of continuing, and what their reward enables.
- The three required player stories use meaningfully different activities rather than the same route with different labels.

#### Economy gate

- A 60-minute scripted economy test has no repeatable risk-free shop loop that creates unlimited Crowns.
- Shop stock, item creation, consumption, drops, and civic contributions reconcile without negative or duplicated quantities.
- At least one recurring Crown sink and two recurring item sinks are active in the slice.
- The bank and inventory survive save/load and version migration without loss or duplication.

#### Story/tutorial gate

- At least 80% of first-time testers finish or intentionally skip the tutorial without help.
- At least 70% can explain in one sentence why the shard, Hollow Well, and Ditch are connected.
- No main objective is a context-free “bring N items” instruction.

### Explicit non-scope for the slice

- Full twelve-zone map.
- Real multiplayer, direct trade, Exchange, clans, chat, shared PvP, or Keep Siege.
- Unrestricted construction, terrain modification, or shared homesteads.
- Full Scarring Surge combat implementation while NPCs are deferred.
- All fifteen skills receiving bespoke new areas.
- Endgame tiers, raids, Undercrag boss rebuild, pets, dailies, or monetization.

## 14. Phased roadmap

### Phase 0 — Stop the freeze and inventory what is worth saving

- Profile cold and cached startup by named stage: scripts/data, world build, geometry/materials, textures/models, renderer first frame, save restore, UI settle.
- Establish a lightweight boot shell so the title remains responsive while world chunks load.
- Feature-flag the legacy world rather than deleting it immediately.
- Inventory assets as **keep**, **rework**, **reference only**, or **retire**. Preserve the minimap source image and independently strong art.
- Exit gate: all startup criteria in §13 pass with a minimal test chunk.

### Phase 1 — Freeze the engine contract

- Preserve exact combat/XP tests, four-dir movement, collision flags, tick health, intents, dispatcher, persistence interface, and smoke gate.
- Separate boot, simulation, world definitions, placements, and rendering so the rebuilt world cannot reintroduce one monolithic synchronous build.
- Define data contracts for chunks, buildings, services, civic sockets, quests, shops, and drops.
- Exit gate: a blank authored chunk and one service object load, save, reload, and walk correctly.

### Phase 2 — Build the slice as authored chunks

- Tutor's Holm, Commons, Hollow Well Square, four core buildings, resource road, Ditch gate, and Scarlands pocket.
- Build assets in the Studio, then place by data. No random settlement scatter.
- Make services and static interaction flows testable without NPCs.
- Exit gate: world/building criteria pass and startup remains within budget.

### Phase 3 — Make the first hour coherent

- Implement the production/economy chains, shop stock rules, ground-item lifecycle, quest state, save migration, and route unlocks.
- Rewrite the tutorial and first quest arc.
- NPC specifications remain data-only until explicitly authorized; after authorization, add modelled NPCs last and replace all procedural counterparts.
- Exit gate: the three required player stories and economy tests pass.

### Phase 4 — Prove retention before scale

- Add one representative repeatable loop: a bounty **or** Cipher Scroll, not both automatically.
- Prepare Scarring Surge project/state data. Add combat actors only after NPC authorization.
- Conduct new-player, returning-player, and 3-session tests.
- Exit gate: testers voluntarily choose another goal after completing the main slice; surge prototype, if present, motivates rather than interrupts.

### Phase 5 — Expand one authored road at a time

- Choose the next region based on the weakest proven loop, not the oldest backlog item.
- Add one economy speciality, one narrative consequence, and one risk band per region.
- Keep the minimap and canonical north-Wilderness geography synchronized with authored chunks.
- Do not start a second region until the first passes startup, traversal, purpose, and economy gates.

### Phase 6 — Online layer

- Move the deterministic simulation and persistence to an authoritative server boundary.
- Add accounts, player presence, chat/moderation, atomic trade, then Exchange, then Scarlands PvP.
- Launch the economy in a test world with wipes before promising durable player wealth.
- Add shared Scarring Surge and Keep Siege only after ordinary movement, combat, loot, and trade remain correct under concurrency.

## 15. Kill criteria and anti-drift rules

Stop, cut, or redesign a feature when any condition below is met:

1. **Performance:** startup misses the §13 gate or produces an unresponsive-page warning. Stop world/content expansion immediately.
2. **Purpose:** after a guided-free playtest, half the testers cannot say what they wanted to do next. Rewrite the first-hour goals before adding content.
3. **Building value:** a building has no service, secondary use, story clue, or believable operational space. Do not ship it as an enterable building.
4. **World density:** an authored chunk contains props that cannot be justified by function, navigation, ecology, occupation, or composition. Remove them.
5. **Tutorial drag:** median completion exceeds 12 minutes or players repeat actions only to satisfy the syllabus. Move systems to the Commons.
6. **Economy exploit:** a deterministic risk-free loop creates unbounded Crowns or duplicates items. Disable the source until reconciled.
7. **Siege chore:** two of three multi-session testers feel punished for ignoring the surge. Make it opt-in, less frequent, or purely milestone-triggered.
8. **Construction drift:** civic upgrades require arbitrary placement, general terrain editing, or player-built collision. Return to fixed sockets.
9. **Multiplayer fiction:** a client-only system is being presented as player trade, a shared market, shared PvP, or a shared event. Cut it until server authority exists.
10. **Map-before-fun:** work begins on a fourth playable region before the slice's three player stories pass. Stop and finish the slice.
11. **Checklist retention:** pets, deeds, dailies, or cosmetics are being added to mask a weak core outing. Cut them until the travel–act–return loop is fun.
12. **NPC boundary:** NPC modelling, placement, spawning, or wiring begins without explicit user authorization. Stop; keep only data specifications.
13. **OSRS clone drift:** a feature requires copied names, layouts, assets, cache data, or verbatim code. Replace it with our own expression or cut it.
14. **Sacred-system regression:** a change alters exact combat math, XP curve, four-dir movement, or tile scale. Revert it unless the user deliberately changes the spine.

## 16. Final product test

The rebuild is on course when a player can say:

> “Veyhollow feels like home. I can see several worthwhile things to do, I understand how my skills and loot help me, and crossing the Ditch feels like my decision. The world is preparing for something, but it still lets me choose who I become.”

That is the OSRS-like soul the project should protect: not a copied map or a giant feature checklist, but a readable home, meaningful routes, account growth, economic interdependence, risky frontiers, memorable quests, and reasons to return.
