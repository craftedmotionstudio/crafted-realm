'use strict';
/* ============ app — assemble database, accounts, saves, world and socket server ============
 * createServer() is what server/index.js runs, and what the integration tests and the bot soak
 * start in-process (with an in-memory database and cheap password hashing).
 */
const path = require('node:path');
const World = require('./engine/World');
const Database = require('./persist/Database');
const Accounts = require('./persist/Accounts');
const PlayerStore = require('./persist/PlayerStore');
const WsServer = require('./net/WsServer');

const QUIET = new Set(['chat', 'take', 'npc_death']);

function defaultLogger(level) {
  const verbose = level === 'debug';
  return (event, data) => {
    if (!verbose && QUIET.has(event)) return;
    const line = JSON.stringify(Object.assign({ at: new Date().toISOString(), event }, data));
    if (/error/.test(event)) console.error(line); else console.log(line);
  };
}

/**
 * @param opts.port     TCP port (default CR_PORT / 43594; 0 = any free port)
 * @param opts.db       sqlite file or ':memory:' (default server/data/runtime/world.db)
 * @param opts.saveKey  save-signing secret (default PlayerStore.saveKey())
 * @param opts.cost     scrypt cost for Accounts (tests pass a cheap one)
 * @param opts.world    extra World options (seed, map, tickMs, timeouts, logger)
 * @param opts.start    start the real-time tick loop (default true)
 */
async function createServer(opts) {
  const o = opts || {};
  const db = new Database(o.db || process.env.CR_DB || path.join(__dirname, 'data', 'runtime', 'world.db'));
  const accounts = new Accounts(db, { cost: o.cost });
  const store = new PlayerStore(db, o.saveKey || PlayerStore.saveKey());
  const logger = (o.world && o.world.logger) || (o.quiet ? null : defaultLogger(process.env.CR_LOG));
  const world = new World(Object.assign({}, o.world || {}, { store, logger }));
  const server = new WsServer({ world, accounts, store, authPerMinute: o.authPerMinute });
  const port = await server.listen(o.port != null ? o.port : Number(process.env.CR_PORT || 43594), o.host);
  if (o.start !== false) world.start();
  let closed = false;
  async function close() {
    if (closed) return; closed = true;
    world.shutdown();
    await server.close();
    db.close();
  }
  return { world, server, db, accounts, store, port, close };
}

module.exports = { createServer, defaultLogger };
