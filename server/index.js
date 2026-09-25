'use strict';
/* ============ Crafted Realm game server ============
 *   npm run server                 (port CR_PORT, default 43594)
 * Environment:
 *   CR_PORT      TCP port for WebSocket + GET /health
 *   CR_DB        sqlite file (default server/data/runtime/world.db)
 *   CR_SAVE_KEY  save-signing secret, >= 32 chars (default: generated into server/data/runtime/save.key)
 *   CR_LOG       'debug' to also log chat, pickups and npc deaths
 * See server/README.md.
 */
const { createServer } = require('./app');

(async () => {
  const app = await createServer({});
  console.log(JSON.stringify({ at: new Date().toISOString(), event: 'listening', port: app.port, tickMs: app.world.tickMs, npcs: app.world.npcs.size }));
  let stopping = false;
  const stop = async (sig) => {
    if (stopping) return; stopping = true;
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'shutdown', signal: sig }));
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
})().catch((e) => { console.error(e); process.exit(1); });
