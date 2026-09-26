'use strict';
/* End to end over real WebSockets on the Scarlands test map: register, log in, walk across the
 * Ditch into the Wilderness, fight until one dies, loot for the killer only, the loser respawns in
 * the Commons, and a third client standing nearby sees both fighters. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../app');
const BotClient = require('../tools/BotClient');
const { saveData } = require('./helpers');

const KEY = 'integration-save-key-0123456789ab';

async function joined(app, name, pass, seed) {
  const bot = new BotClient(`ws://127.0.0.1:${app.port}`, name);
  await bot.connect();
  await bot.hello();
  assert.ok(await bot.register(name, pass));
  if (seed) {
    const id = app.db.findAccount(name).id;
    app.db.writeSave(id, app.store.codec.encode(saveData(app.world, seed)));
  }
  await bot.login(name, pass);
  return bot;
}

test('two clients fight to the death in the Wilderness; loot, respawn, and a third client watching', { timeout: 60000 }, async () => {
  const app = await createServer({ db: ':memory:', saveKey: KEY, cost: { N: 1024 }, port: 0, quiet: true, authPerMinute: 1000, world: { seed: 2026, tickMs: 20 } });
  try {
    const alice = await joined(app, 'alice', 'alice-pass-1', {
      levels: { Attack: 40, Strength: 40, Defence: 40, Hitpoints: 40 }, pos: { x: 32, z: 12 }, run: true,
      equip: { weapon: 'steel_sword', body: 'iron_platebody' }, inv: [['coins', 50]],
    });
    const bob = await joined(app, 'bob', 'bob-pass-12', {
      levels: { Attack: 38, Strength: 38, Defence: 38, Hitpoints: 38 }, pos: { x: 34, z: 12 }, run: true,
      equip: { weapon: 'iron_sword', body: 'bronze_plate', legs: 'bronze_legs' }, inv: [['coins', 500], ['iron_hatchet', 1], ['bread', 1]],
    });
    const carol = await joined(app, 'carol', 'carol-pass-1', { pos: { x: 30, z: 12 }, run: true });
    assert.equal(alice.me.wl, 0);

    // walk north across the Ditch into level-3 Wilderness
    alice.walk(50, 66); bob.walk(51, 66); carol.walk(46, 62);
    await alice.until((b) => b.me.x === 50 && b.me.z === 66, 20000, 'alice arrives');
    await bob.until((b) => b.me.x === 51 && b.me.z === 66, 20000, 'bob arrives');
    await carol.until((b) => b.me.x === 46 && b.me.z === 62, 20000, 'carol arrives');
    assert.equal(alice.me.wl, 3);
    assert.equal(carol.me.wl, 2);

    // carol can see both of them
    await carol.until((b) => b.players.has(alice.pid) && b.players.has(bob.pid), 5000, 'carol sees both');
    assert.equal(carol.players.get(alice.pid).nm, 'alice');
    assert.equal(carol.players.get(bob.pid).nm, 'bob');

    // alice starts the fight; bob auto-retaliates
    alice.attackPlayer(bob.pid);
    const dead = (b) => b.messages.includes('Oh dear, you are dead!');
    await alice.until(() => dead(alice) || dead(bob), 40000, 'someone dies');
    const [winner, loser] = dead(bob) ? [alice, bob] : [bob, alice];
    await loser.until((b) => b.messages.includes('You wake in the Commons.'), 5000, 'loser respawns');
    await loser.until((b) => Math.abs(b.me.x - 32) <= 2 && Math.abs(b.me.z - 10) <= 2 && b.me.hp[0] === b.me.hp[1], 5000, 'loser in commons at full health');
    assert.equal(loser.me.wl, 0);
    await winner.until((b) => b.messages.includes(`You have defeated ${loser.name}.`), 5000, 'kill message');
    assert.ok(winner.me.skull > 0 || winner === bob, 'the attacker carries a skull');

    // the loot pile: visible to the winner, not to carol
    await winner.until((b) => [...b.objs.values()].some((o) => o.id === 'bones'), 5000, 'winner sees the pile');
    const pile = [...winner.objs.values()];
    const lostIds = pile.map((o) => o.id);
    assert.ok(lostIds.includes('bones'));
    for (const o of pile) assert.ok(!carol.objs.has(o.i), `carol must not see private loot ${o.id}`);
    // what the loser kept is back in its pack (3 priciest, not skulled unless it attacked)
    const keptIds = loser.inv.filter(Boolean).map((s) => s[0]);
    assert.ok(keptIds.length <= 3);
    for (const id of keptIds) assert.ok(!lostIds.includes(id) || id === 'coins' || id === 'bread');

    // the winner picks up the coins
    const coins = pile.find((o) => o.id === 'coins');
    assert.ok(coins, 'coins dropped');
    const before = (winner.inv.find((s) => s && s[0] === 'coins') || [0, 0])[1];
    winner.take(coins.i);
    await winner.until((b) => { const c = b.inv.find((s) => s && s[0] === 'coins'); return c && c[1] === before + coins.q; }, 5000, 'coins picked up');

    // the server-side world agrees
    const w = app.world;
    assert.equal(w.playerCount, 3);
    assert.ok(w.playerByKey(winner.name).isSkulled() || winner === bob);

    // logout: a refused request is dropped (as in 2004), so a client asks again until it is let go
    const logoutFully = async (b) => {
      const iv = setInterval(() => b.logout(), 100);
      try { await b.until((x) => x.loggedOut === 'logout', 15000, 'logged out'); } finally { clearInterval(iv); }
    };
    await Promise.all([alice, bob, carol].map(logoutFully));
    assert.equal(w.playerCount, 0);
    // saves were written: log back in and find the coins
    const again = await joined(app, winner.name, winner === alice ? 'alice-pass-1' : 'bob-pass-12');
    const c = again.inv.find((s) => s && s[0] === 'coins');
    assert.equal(c[1], before + coins.q);
    again.close();
    for (const b of [alice, bob, carol]) b.close();
  } finally {
    await app.close();
  }
});

test('protocol hygiene: version check, auth before intents, bad messages are refused', { timeout: 20000 }, async () => {
  const app = await createServer({ db: ':memory:', saveKey: KEY, cost: { N: 1024 }, port: 0, quiet: true, authPerMinute: 3, world: { seed: 1, tickMs: 20 } });
  try {
    const bot = new BotClient(`ws://127.0.0.1:${app.port}`, 'x');
    await bot.connect();
    bot.send({ t: 'walk', x: 1, z: 1 });
    await bot.until((b) => b.errors.some((e) => e.code === 'not_logged_in'), 3000, 'intent before login refused');
    bot.send({ t: 'login', user: 'a', pass: 'b' });
    await bot.until((b) => b.errors.some((e) => e.code === 'say_hello_first'), 3000, 'hello required');
    bot.ws.send('this is not json');
    await bot.until((b) => b.errors.some((e) => e.code === 'bad_json'), 3000, 'bad json');
    await bot.hello();
    bot.send({ t: 'login', user: 'nobody', pass: 'wrongpass1' });
    await bot.waitFor((m) => m && m.t === 'auth_fail', 3000, 'bad login');
    bot.send({ t: 'login', user: 'nobody', pass: 'wrongpass1' });
    await bot.waitFor((m) => m && m.t === 'auth_fail', 3000);
    bot.send({ t: 'login', user: 'nobody', pass: 'wrongpass1' });
    await bot.waitFor((m) => m && m.t === 'auth_fail', 3000);
    bot.send({ t: 'login', user: 'nobody', pass: 'wrongpass1' });
    const m = await bot.waitFor((x) => x && x.t === 'auth_fail', 3000);
    assert.equal(m.code, 'too_many_attempts');
    bot.close();
    const old = new BotClient(`ws://127.0.0.1:${app.port}`, 'old');
    await old.connect();
    old.send({ t: 'hello', v: 0 });
    await old.until((b) => b.errors.some((e) => e.code === 'version'), 3000, 'version refused');
    old.close();
  } finally {
    await app.close();
  }
});
