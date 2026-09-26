/* ============ shared/rng.js — seedable random numbers (browser global + Node require) ============
 * Every roll the server makes (hit/miss, damage, drops, NPC wander) goes through an Rng object so a
 * fight can be replayed exactly from a seed in tests, and so the client's offline mode can share the
 * same code. Two flavours:
 *   CRShared.rng.create(seed)  -> deterministic xoshiro128** stream (seeded with splitmix32)
 *   CRShared.rng.math          -> the same API backed by Math.random (production default)
 *
 * The integer helpers mirror the 2004 RuneScript primitives exactly (Lost City engine, MIT,
 * src/engine/script/handlers/NumberOps.ts, verified 2026-09-25):
 *   random(n)    = floor(u * n)        -> 0 .. n-1
 *   randomInc(n) = floor(u * (n + 1))  -> 0 .. n   (the "randominc" every accuracy/damage roll uses)
 * where u is uniform in [0, 1).
 *
 * xoshiro128** and splitmix32 are public-domain algorithms (Blackman & Vigna); written here from the
 * published reference description.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.CRShared = root.CRShared || {}; root.CRShared.rng = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TWO32 = 4294967296;

  function splitmix32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return (z ^ (z >>> 16)) >>> 0;
    };
  }

  function rotl(x, k) { return ((x << k) | (x >>> (32 - k))) >>> 0; }

  /** Deterministic generator. `seed` may be any number or string. */
  function Rng(seed) {
    let n = 0;
    if (typeof seed === 'string') { for (let i = 0; i < seed.length; i++) n = (Math.imul(n, 31) + seed.charCodeAt(i)) >>> 0; }
    else n = (Number(seed) || 0) >>> 0;
    const sm = splitmix32(n);
    this.s = [sm(), sm(), sm(), sm()];
    if ((this.s[0] | this.s[1] | this.s[2] | this.s[3]) === 0) this.s[0] = 1;   // all-zero state is invalid
    this.seed = n;
    this.draws = 0;
  }
  /** next raw 32-bit unsigned integer (xoshiro128**) */
  Rng.prototype.nextU32 = function () {
    const s = this.s;
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0;
    const t = (s[1] << 9) >>> 0;
    s[2] = (s[2] ^ s[0]) >>> 0;
    s[3] = (s[3] ^ s[1]) >>> 0;
    s[1] = (s[1] ^ s[2]) >>> 0;
    s[0] = (s[0] ^ s[3]) >>> 0;
    s[2] = (s[2] ^ t) >>> 0;
    s[3] = rotl(s[3], 11);
    this.draws++;
    return result;
  };
  /** uniform float in [0, 1) */
  Rng.prototype.next = function () { return this.nextU32() / TWO32; };
  /** 2004 random(n): 0 .. n-1 (0 when n <= 0) */
  Rng.prototype.random = function (n) { return n > 0 ? Math.floor(this.next() * n) : 0; };
  /** 2004 randominc(n): 0 .. n inclusive (0 when n <= 0) */
  Rng.prototype.randomInc = function (n) { return n > 0 ? Math.floor(this.next() * (n + 1)) : 0; };
  /** inclusive integer range lo..hi */
  Rng.prototype.range = function (lo, hi) { return lo + this.randomInc(hi - lo); };
  /** snapshot / restore, so a test can rewind a stream */
  Rng.prototype.getState = function () { return { s: this.s.slice(), draws: this.draws }; };
  Rng.prototype.setState = function (st) { this.s = st.s.slice(); this.draws = st.draws | 0; };

  /** Math.random-backed generator with the same API (not reproducible) */
  const math = {
    next: () => Math.random(),
    random: (n) => (n > 0 ? Math.floor(Math.random() * n) : 0),
    randomInc: (n) => (n > 0 ? Math.floor(Math.random() * (n + 1)) : 0),
    range: (lo, hi) => lo + (hi - lo > 0 ? Math.floor(Math.random() * (hi - lo + 1)) : 0),
  };

  /**
   * A generator that replays a fixed script of values, for golden tests: each call to next()
   * returns the next float from `floats` (cycling). random/randomInc are derived exactly as above.
   */
  function scripted(floats) {
    let i = 0;
    const next = () => { const v = floats[i % floats.length]; i++; return v; };
    return {
      next,
      random: (n) => (n > 0 ? Math.floor(next() * n) : 0),
      randomInc: (n) => (n > 0 ? Math.floor(next() * (n + 1)) : 0),
      range: (lo, hi) => lo + (hi - lo > 0 ? Math.floor(next() * (hi - lo + 1)) : 0),
      get calls() { return i; },
    };
  }

  return { create: (seed) => new Rng(seed), Rng, math, scripted };
});
