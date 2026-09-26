'use strict';
/* ============ SaveCodec — versioned player saves with a keyed checksum ============
 * The idea follows the 2004 .sav (Lost City engine, MIT: src/engine/entity/PlayerLoading.ts —
 * magic 0x2004, a version number, and a CRC over the body; loading refuses a newer version or a bad
 * checksum). Ours is JSON:
 *     { "magic": "CRSAVE", "version": 1, "body": "<canonical JSON>", "mac": "<hex>" }
 * The checksum is an HMAC-SHA256 keyed with a server secret, so it catches corruption AND edits made
 * outside the server (a plain CRC can simply be recomputed by whoever edits the file).
 * Older versions are upgraded through MIGRATIONS on load; saving always writes the current version.
 */
const crypto = require('node:crypto');

const MAGIC = 'CRSAVE';
const VERSION = 1;

/** version n -> n+1 upgrades of the decoded body */
const MIGRATIONS = {
  // 1: (body) => { ...; return body; },   // the first migration goes here when version 2 exists
};

class SaveError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

/** JSON with object keys sorted at every level, so the same data always gives the same bytes */
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

class SaveCodec {
  /** @param key a secret (Buffer or string) — see server/persist/secrets.js */
  constructor(key) {
    if (!key || key.length < 16) throw new Error('SaveCodec needs a secret key of at least 16 bytes');
    this.key = key;
  }
  mac(version, body) {
    return crypto.createHmac('sha256', this.key).update(MAGIC + '\n' + version + '\n' + body).digest('hex');
  }
  /** player data -> a record ready to store */
  encode(data) {
    const body = canonical(data);
    return { magic: MAGIC, version: VERSION, body, mac: this.mac(VERSION, body) };
  }
  /** a stored record -> player data (verified, migrated). Throws SaveError. */
  decode(record) {
    let rec = record;
    if (typeof rec === 'string') { try { rec = JSON.parse(rec); } catch (e) { throw new SaveError('corrupt', 'save is not JSON'); } }
    if (!rec || rec.magic !== MAGIC) throw new SaveError('corrupt', 'bad save magic');
    if (!Number.isInteger(rec.version) || rec.version < 1) throw new SaveError('corrupt', 'bad save version');
    if (rec.version > VERSION) throw new SaveError('unsupported_version', `save version ${rec.version} is newer than ${VERSION}`);
    if (typeof rec.body !== 'string' || typeof rec.mac !== 'string') throw new SaveError('corrupt', 'save fields missing');
    const want = Buffer.from(this.mac(rec.version, rec.body), 'hex');
    const got = Buffer.from(rec.mac, 'hex');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) throw new SaveError('tampered', 'save checksum mismatch');
    let data;
    try { data = JSON.parse(rec.body); } catch (e) { throw new SaveError('corrupt', 'save body is not JSON'); }
    for (let v = rec.version; v < VERSION; v++) {
      if (!MIGRATIONS[v]) throw new SaveError('unsupported_version', `no migration from version ${v}`);
      data = MIGRATIONS[v](data);
    }
    return data;
  }
}

SaveCodec.MAGIC = MAGIC;
SaveCodec.VERSION = VERSION;
SaveCodec.MIGRATIONS = MIGRATIONS;
SaveCodec.SaveError = SaveError;
SaveCodec.canonical = canonical;
module.exports = SaveCodec;
