'use strict';
/* ============ Accounts — username + password with scrypt ============
 * Passwords are stored as "scrypt$N$r$p$<salt b64>$<hash b64>" (node:crypto scrypt, 16-byte random
 * salt, 64-byte key) and compared in constant time. Hashing is asynchronous so a login never stalls
 * the 600 ms tick. The cost is a constructor option so tests can use a cheap setting.
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,10}[A-Za-z0-9]$|^[A-Za-z0-9]$/;   // 1-12 chars, like 2004
const PASS_MIN = 8, PASS_MAX = 64;
const DEFAULT_COST = { N: 32768, r: 8, p: 1 };

class AccountError extends Error { constructor(code, message) { super(message || code); this.code = code; } }

function validUsername(u) { return typeof u === 'string' && USERNAME_RE.test(u) && !/ {2}/.test(u); }
function validPassword(p) { return typeof p === 'string' && p.length >= PASS_MIN && p.length <= PASS_MAX; }

class Accounts {
  /** @param db server/persist/Database; @param opts.cost {N, r, p} */
  constructor(db, opts) {
    this.db = db;
    this.cost = Object.assign({}, DEFAULT_COST, (opts && opts.cost) || {});
  }
  async hash(password) {
    const { N, r, p } = this.cost;
    const salt = crypto.randomBytes(16);
    const key = await scrypt(password, salt, 64, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 });
    return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
  }
  async verify(password, stored) {
    const parts = String(stored).split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]), r = Number(parts[2]), p = Number(parts[3]);
    const salt = Buffer.from(parts[4], 'base64'), want = Buffer.from(parts[5], 'base64');
    const got = await scrypt(password, salt, want.length, { N, r, p, maxmem: 256 * N * r + 1024 * 1024 });
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  }
  /** create an account; returns {id, username, display} */
  async register(username, password) {
    if (!validUsername(username)) throw new AccountError('bad_username', 'Names are 1-12 letters, numbers, spaces, - or _.');
    if (!validPassword(password)) throw new AccountError('bad_password', `Passwords are ${PASS_MIN}-${PASS_MAX} characters.`);
    if (this.db.findAccount(username)) throw new AccountError('name_taken', 'That name is taken.');
    const pass = await this.hash(password);
    if (this.db.findAccount(username)) throw new AccountError('name_taken', 'That name is taken.');   // raced
    const id = this.db.createAccount(username.toLowerCase(), username, pass);
    return { id, username: username.toLowerCase(), display: username };
  }
  /** check credentials; returns {id, username, display} */
  async login(username, password) {
    if (!validUsername(username) || typeof password !== 'string' || password.length > PASS_MAX) throw new AccountError('bad_credentials', 'Invalid name or password.');
    const row = this.db.findAccount(username);
    if (!row) { await this.hash(password); throw new AccountError('bad_credentials', 'Invalid name or password.'); }   // same cost either way
    if (!(await this.verify(password, row.pass))) throw new AccountError('bad_credentials', 'Invalid name or password.');
    if (row.banned) throw new AccountError('banned', 'This account is locked.');
    this.db.touchLogin(row.id);
    return { id: row.id, username: row.username, display: row.display };
  }
}

Accounts.AccountError = AccountError;
Accounts.validUsername = validUsername;
Accounts.validPassword = validPassword;
module.exports = Accounts;
