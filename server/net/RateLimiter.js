'use strict';
/* ============ RateLimiter — token buckets and sliding windows ============
 * TokenBucket: per-connection message budget (burst `capacity`, refilled at `perSecond`).
 * WindowLimiter: at most `max` events per key per `windowMs` (login/register attempts per address).
 * Both take an injectable clock so tests are exact.
 */
class TokenBucket {
  constructor(capacity, perSecond, now) {
    this.capacity = capacity; this.perSecond = perSecond;
    this.now = now || Date.now;
    this.tokens = capacity; this.last = this.now();
  }
  take(n) {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.perSecond);
    this.last = t;
    const cost = n == null ? 1 : n;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

class WindowLimiter {
  constructor(max, windowMs, now) { this.max = max; this.windowMs = windowMs; this.now = now || Date.now; this.hits = new Map(); }
  allow(key) {
    const t = this.now();
    const list = (this.hits.get(key) || []).filter((x) => t - x < this.windowMs);
    if (list.length >= this.max) { this.hits.set(key, list); return false; }
    list.push(t); this.hits.set(key, list);
    if (this.hits.size > 10000) for (const [k, v] of this.hits) if (!v.length || t - v[v.length - 1] >= this.windowMs) this.hits.delete(k);
    return true;
  }
}

module.exports = { TokenBucket, WindowLimiter };
