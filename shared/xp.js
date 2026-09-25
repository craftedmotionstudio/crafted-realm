/* ============ shared/xp.js — the experience curve (browser global + Node require) ============
 * Same curve as src/game1_data.js XP_TABLE (the classic curve: level L needs
 * floor(sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7)) / 4) experience).
 *
 * The server stores experience in TENTHS, exactly like the 2004 engine (Lost City, MIT:
 * src/engine/entity/Player.ts levelExperience = floor(acc/4)*10, getLevelByExp; and every
 * stat_advance in data/src/scripts is in tenths, e.g. a 5.5 xp spell is "experience,55").
 * Keeping integers avoids float drift in 0.1-xp grants (1.33 xp per damage on Hitpoints etc.).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.xp = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_LEVEL = 99;
  /** 200,000,000 xp cap, in tenths */
  const MAX_XP10 = 2000000000;

  /** XP_TABLE[L] = whole experience needed for level L (index 0 and 1 are 0) — identical to game1_data.js */
  const XP_TABLE = (() => {
    const t = [0, 0]; let pts = 0;
    for (let lv = 1; lv < 100; lv++) { pts += Math.floor(lv + 300 * Math.pow(2, lv / 7)); t[lv + 1] = Math.floor(pts / 4); }
    return t;
  })();

  /** level for whole experience (1..99) */
  function levelForXp(xp) {
    let lv = 1;
    while (lv < MAX_LEVEL && xp >= XP_TABLE[lv + 1]) lv++;
    return lv;
  }
  /** level for experience stored in tenths (2004 getLevelByExp) */
  function levelForXp10(xp10) {
    for (let lv = MAX_LEVEL; lv >= 2; lv--) if (xp10 >= XP_TABLE[lv] * 10) return lv;
    return 1;
  }
  /** tenths of experience at the start of `level` */
  function xp10ForLevel(level) { return level <= 1 ? 0 : XP_TABLE[Math.min(level, MAX_LEVEL)] * 10; }
  /** convert a decimal xp amount (e.g. 5.5) to tenths */
  function toTenths(xp) { return Math.round(xp * 10); }
  /** add tenths, clamped to the 200m cap */
  function addXp10(current, amount10) { return Math.min(MAX_XP10, Math.max(0, current + Math.max(0, amount10 | 0))); }

  return { MAX_LEVEL, MAX_XP10, XP_TABLE, levelForXp, levelForXp10, xp10ForLevel, toTenths, addXp10 };
});
