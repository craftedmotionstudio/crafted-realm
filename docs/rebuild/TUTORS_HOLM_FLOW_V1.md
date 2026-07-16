# Tutor's Holm flow v1

Date: 2026-07-13  
Status: Phase-2 route and departure contract; environment production continues

## The journey

Tutor's Holm is a circuit with a beginning, middle, and release—not a collection of tutorial props.

1. **Arrival Cove / Guide Hall:** the player washes ashore, enters through the south door, studies the island
   route and lesson register, then leaves through the north teaching door toward Survival Wood.
2. **Survival Wood:** hatchet, firemaking, fishing, and cooking happen together around the pond.
3. **Lesson Green:** the Teaching Kitchen teaches bread; the Quest Lodge teaches optional authored stories.
4. **Quarry Rise:** the Mine Gatehouse is the only descent into the training cavern.
5. **Training Cavern:** mining leads forward to smelting, smithing, melee, and ranged practice. The far exit
   prevents the player from simply walking back out through the entrance.
6. **Warden's Ridge:** the player emerges through the Combat Hall and immediately learns banking.
7. **Mage Headland:** the final instruction is magic, visibly separated across Tidebridge.
8. **Departure Dock:** the eastern path terminates at a pier and ferry skiff. The boat is not at spawn.

The release curriculum contains 16 gated lessons. Eleven environment/system lessons are live in the current
curriculum contract. Five NPC-dependent lessons—guide, quest guide, melee, ranged, and magic—remain required
for release but intentionally deferred until the chunk/building environment gate authorizes modelled NPCs.

## Departure law

- The boat is a chunk-owned `holm_departure` interaction with **Board** as its primary click.
- Before completion, the brass lesson-lock explains that passage is closed and repeats the current objective.
- Tutorial completion hides the objective, persists the curriculum revision, and unlocks the boat; it no
  longer teleports the player.
- Boarding walks to the authored pier tile, grants the starter pack once, fades across the grey sea, activates
  the `veyhollow-commons-v2` provider, and lands at the Veyhollow ferry landmark.
- Saves record provider, world revision, nearest landmark, exact position, and tutorial curriculum revision.
  Reloading after the crossing therefore stays on the mainland; old saves still migrate safely to Arrival Cove.

## Phase boundary

This pass locks topology, sequence, gating, persistence, and travel. The Guide Hall now proves the first full
building/room/door/service authoring round-trip and replaces its blockout foundation. The remaining seven pads
and reserved cavern are still blockouts. The next slice is the Survival Wood outdoor service loop, followed by
the 48x40 cavern. NPC production remains last.
