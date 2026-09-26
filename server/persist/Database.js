'use strict';
/* ============ Database — accounts and saves in SQLite (node:sqlite, built into Node 24) ============
 * Tables:
 *   accounts  (id, username UNIQUE NOCASE, display, pass, created, last_login, banned)
 *   saves     (account_id PK, version, record JSON, updated)      — the current save
 *   save_log  (id, account_id, version, record, created)          — the last few saves per account,
 *                                                                    for restore / rollback drills
 * Every statement is prepared once. A `:memory:` path gives a throwaway database for tests.
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 1;
const KEEP_HISTORY = 5;

class Database {
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.migrate();
    this.q = {
      findAccount: this.db.prepare('SELECT id, username, display, pass, banned FROM accounts WHERE username = ? COLLATE NOCASE'),
      insertAccount: this.db.prepare('INSERT INTO accounts (username, display, pass, created) VALUES (?, ?, ?, ?)'),
      touchLogin: this.db.prepare('UPDATE accounts SET last_login = ? WHERE id = ?'),
      loadSave: this.db.prepare('SELECT record FROM saves WHERE account_id = ?'),
      upsertSave: this.db.prepare('INSERT INTO saves (account_id, version, record, updated) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(account_id) DO UPDATE SET version = excluded.version, record = excluded.record, updated = excluded.updated'),
      logSave: this.db.prepare('INSERT INTO save_log (account_id, version, record, created) VALUES (?, ?, ?, ?)'),
      trimLog: this.db.prepare('DELETE FROM save_log WHERE account_id = ? AND id NOT IN (SELECT id FROM save_log WHERE account_id = ? ORDER BY id DESC LIMIT ?)'),
      history: this.db.prepare('SELECT record, created FROM save_log WHERE account_id = ? ORDER BY id DESC'),
    };
  }

  migrate() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`);
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema');
    const have = row ? Number(row.value) : 0;
    if (have < 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          display TEXT NOT NULL,
          pass TEXT NOT NULL,
          created INTEGER NOT NULL,
          last_login INTEGER,
          banned INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS saves (
          account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
          version INTEGER NOT NULL,
          record TEXT NOT NULL,
          updated INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS save_log (
          id INTEGER PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES accounts(id),
          version INTEGER NOT NULL,
          record TEXT NOT NULL,
          created INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS save_log_account ON save_log(account_id, id);
      `);
    }
    this.db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('schema', String(SCHEMA_VERSION));
  }

  findAccount(username) { return this.q.findAccount.get(username) || null; }
  createAccount(username, display, pass) {
    const r = this.q.insertAccount.run(username, display, pass, Date.now());
    return Number(r.lastInsertRowid);
  }
  touchLogin(id) { this.q.touchLogin.run(Date.now(), id); }
  /** the stored save record (JSON string) or null */
  loadSave(accountId) { const r = this.q.loadSave.get(accountId); return r ? r.record : null; }
  /** store a save record (object from SaveCodec.encode) and keep a short history */
  writeSave(accountId, record) {
    const json = JSON.stringify(record), now = Date.now();
    this.q.upsertSave.run(accountId, record.version, json, now);
    this.q.logSave.run(accountId, record.version, json, now);
    this.q.trimLog.run(accountId, accountId, KEEP_HISTORY);
  }
  saveHistory(accountId) { return this.q.history.all(accountId); }
  close() { this.db.close(); }
}

Database.SCHEMA_VERSION = SCHEMA_VERSION;
module.exports = Database;
