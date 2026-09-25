'use strict';
/* ============ HeadlessSession — an in-process client for tests and bots ============
 * Implements the session interface the World calls (send / onLogin / onLoginFailed / onLogout)
 * without a socket, and lets a test push intents straight into the player's inbox. It keeps every
 * message it received so a test can assert on exactly what a real client would have been sent.
 */
class HeadlessSession {
  constructor() {
    this.received = [];
    this.alwaysAlive = true;     // counts as "responding" every tick (no x-log timeout)
    this.player = null;
    this.loggedIn = false;
    this.loggedOut = null;
    this.failed = null;
  }
  attach(player) { this.player = player; player.session = this; return this; }
  send(msg) { this.received.push(msg); }
  onLogin(welcome) { this.loggedIn = true; this.received.push(welcome); }
  onLoginFailed(reason) { this.failed = reason; }
  onLogout(reason) { this.loggedOut = reason; this.loggedIn = false; }
  /** queue an intent exactly as if it had arrived over the network */
  intent(msg) { this.player.inbox.push(msg); }
  lastTick() { for (let i = this.received.length - 1; i >= 0; i--) if (this.received[i].t === 'tick') return this.received[i]; return null; }
  messages() { const out = []; for (const m of this.received) if (m.msg) for (const x of m.msg) out.push(x[1]); return out; }
  clear() { this.received = []; }
}

module.exports = HeadlessSession;
