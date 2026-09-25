'use strict';
/* ============ PlayerStore — the world's save adapter ============
 * Glues Player.toSave() -> SaveCodec -> Database. The World calls savePlayer() on logout, on the
 * 15-minute autosave and at shutdown; the login path calls loadData() before a player is created.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const SaveCodec = require('./SaveCodec');

class PlayerStore {
  constructor(db, key) {
    this.db = db;
    this.codec = new SaveCodec(key);
  }
  savePlayer(p) { this.db.writeSave(p.accountId, this.codec.encode(p.toSave())); }
  /** decoded save data, or null for a brand-new account. Throws SaveError on a bad save. */
  loadData(accountId) {
    const rec = this.db.loadSave(accountId);
    return rec ? this.codec.decode(rec) : null;
  }
}

/**
 * The save-signing secret: CR_SAVE_KEY (at least 32 characters) or a random key kept in
 * server/data/runtime/save.key (created on first run; that folder is git-ignored).
 */
function saveKey(dir) {
  if (process.env.CR_SAVE_KEY && process.env.CR_SAVE_KEY.length >= 32) return Buffer.from(process.env.CR_SAVE_KEY, 'utf8');
  const file = path.join(dir || path.join(__dirname, '..', 'data', 'runtime'), 'save.key');
  if (fs.existsSync(file)) return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const key = crypto.randomBytes(32);
  fs.writeFileSync(file, key.toString('hex'), { mode: 0o600 });
  return key;
}

PlayerStore.saveKey = saveKey;
module.exports = PlayerStore;
