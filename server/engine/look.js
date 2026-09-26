'use strict';
/* ============ look — an adventurer's character-kit appearance, validated ============
 * The client's character kit (src/holm_kit.js) describes a look as
 *   {body:'A'|'B', parts:{Hair:1,...}, colors:{hair:0,...}, build:'slim'|'average'|'stout', feet:'small'|'normal'|'large'}
 * The server does not know the kit catalog, so it only keeps a well-formed, bounded copy: known slot and channel
 * names, small integers, known enums. The client clamps indices to its catalog when it paints (HolmKit.normalize).
 * Stored in the save (`look`) and sent to every client that sees the player (`lk`), W2 (2026-09-25).
 */
const SLOTS = ['Hair', 'Jaw', 'Torso', 'Arms', 'Hands', 'Legs', 'Feet', 'Makeup'];
const CHANNELS = ['hair', 'torso', 'legs', 'feet', 'skin', 'makeup'];
const BUILDS = ['slim', 'average', 'stout'];
const FEET = ['small', 'normal', 'large'];
const MAX_PART = 64, MAX_COLOR = 63;

/** a clean copy of a look, or null when it is not a look at all */
function sanitize(look) {
  if (!look || typeof look !== 'object' || Array.isArray(look)) return null;
  if (look.body !== 'A' && look.body !== 'B') return null;
  const out = { body: look.body, parts: {}, colors: {} };
  const parts = look.parts && typeof look.parts === 'object' ? look.parts : {};
  const colors = look.colors && typeof look.colors === 'object' ? look.colors : {};
  for (const s of SLOTS) { const v = parts[s]; if (Number.isInteger(v) && v >= 1 && v <= MAX_PART) out.parts[s] = v; }
  for (const c of CHANNELS) { const v = colors[c]; if (Number.isInteger(v) && v >= 0 && v <= MAX_COLOR) out.colors[c] = v; }
  if (BUILDS.indexOf(look.build) >= 0) out.build = look.build;
  if (FEET.indexOf(look.feet) >= 0) out.feet = look.feet;
  return out;
}

module.exports = { sanitize, SLOTS, CHANNELS, BUILDS, FEET };
