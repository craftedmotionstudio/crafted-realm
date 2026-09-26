/* Headless locks for the Scarlands bestiary v1 (W2/W3, 2026-09-26), on the published copy
 * (assets/scarlands/bestiary-v1/; the gitignored workspace is not needed):
 *  1 every creature's GLB matches the manifest hash, has one skin and a glTF animation for every listed clip, with
 *    the clip length = frames / 30 s (within a frame) and every event frame (impact / release / until) inside it;
 *    idle / walk / attack / hit / death are always there; ranged and magic foes have a release frame;
 *  2 the anchors ride bones that exist in the GLB; the model stands on y = 0 (the mesh bounds from the accessors);
 *  3 stats agree with the server's rules (shared/combat.js: levels, attack type, max hit) for the suggested NPC_TYPES
 *    entry (or the existing entry + changes for the ash stalker), and new ids do not collide with NPC_TYPES;
 *  4 the draft drop tables (docs/rebuild/scarlands/drops_scarlands_draft.json) pass shared/drops.js validate()
 *    against the game's items and server/data/drops.json's shared tables, match the manifest, leave proposed items
 *    out, and use ids not already in drops.json.
 * Run: node tools/test_scarlands_bestiary.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..'), DIR = path.join(ROOT, 'assets/scarlands/bestiary-v1');
const C = require('../shared/combat.js'), D = require('../shared/drops.js');
const MAN = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const DRAFT = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/rebuild/scarlands/drops_scarlands_draft.json'), 'utf8'));
const SERVER_DROPS = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/drops.json'), 'utf8'));
const sandbox = { Math, console }; sandbox.globalThis = sandbox; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/game1_data.js'), 'utf8') + '\n;globalThis.__D = {ITEMS, NPC_TYPES};\n', sandbox);
const { ITEMS, NPC_TYPES } = sandbox.__D;
let passed = 0; const check = (name, f) => { f(); passed++; console.log('PASS ' + name); };
function glb(file) {
  const b = fs.readFileSync(file), jl = b.readUInt32LE(12), json = JSON.parse(b.slice(20, 20 + jl).toString());
  const binStart = 20 + jl + 8;
  return { json, bin: b.slice(binStart), bytes: b };
}
function accMax(g, i) { return g.json.accessors[i].max; }
function accMin(g, i) { return g.json.accessors[i].min; }

assert.strictEqual(MAN.schema, 'crafted-realm-scarlands-bestiary-v1');
assert.strictEqual(MAN.creatures.length, 6);

check('1 GLBs: hash, one skin, every clip with its length and event frames', () => {
  for (const c of MAN.creatures) {
    const file = path.join(DIR, c.model.file), g = glb(file);
    assert.strictEqual(crypto.createHash('sha256').update(g.bytes).digest('hex'), c.model.sha256, c.id + ' hash');
    assert.strictEqual((g.json.skins || []).length, 1, c.id + ' skins');
    const anims = Object.fromEntries((g.json.animations || []).map(a => [a.name, a]));
    for (const req of ['idle', 'walk', 'attack', 'hit', 'death']) assert.ok(c.clips[req], c.id + ' lacks ' + req);
    for (const [name, clip] of Object.entries(c.clips)) {
      const a = anims[name]; assert.ok(a, c.id + ' GLB has no animation ' + name);
      const len = Math.max(...a.samplers.map(s => accMax(g, s.input)[0]));
      assert.ok(Math.abs(len - clip.frames / 30) <= 1 / 30 + 1e-3, c.id + ' ' + name + ' length ' + len + ' vs ' + clip.frames + ' frames');
      for (const ev of ['impact', 'release', 'until']) if (clip[ev] != null) assert.ok(clip[ev] > 0 && clip[ev] < clip.frames, c.id + ' ' + name + ' ' + ev);
      assert.strictEqual(!!clip.loop, name === 'idle' || name === 'walk', c.id + ' ' + name + ' loop flag');
    }
    const style = c.stats.attackStyle;
    if (style === 'ranged' || style === 'magic') assert.ok(c.clips.attack.release != null, c.id + ' ranged/magic attack needs a release frame');
    else assert.ok(c.clips.attack.impact != null, c.id + ' melee attack needs an impact frame');
  }
});

check('2 anchors ride real bones; every model stands on the ground', () => {
  for (const c of MAN.creatures) {
    const g = glb(path.join(DIR, c.model.file)), names = new Set(g.json.nodes.map(n => n.name));
    for (const [k, a] of Object.entries(c.model.anchors || {})) assert.ok(names.has(a.bone), c.id + ' anchor ' + k + ' bone ' + a.bone);
    let minY = Infinity;
    for (const m of g.json.meshes) for (const p of m.primitives) minY = Math.min(minY, accMin(g, p.attributes.POSITION)[1]);
    assert.ok(Math.abs(minY) < 0.03, c.id + ' lowest point ' + minY.toFixed(3) + ' m');
  }
});

check('3 stats follow shared/combat.js; new ids are new', () => {
  for (const c of MAN.creatures) {
    let def;
    if (c.npcType.existing) { assert.ok(NPC_TYPES[c.id], c.id + ' should exist'); def = Object.assign({}, NPC_TYPES[c.id]); for (const [k, v] of Object.entries(c.npcType.changes)) if (k !== 'note') def[k] = v; }
    else { assert.ok(!NPC_TYPES[c.id], c.id + ' collides with an existing NPC_TYPES id'); def = c.npcType; }
    const L = C.npcLevels(def);
    assert.strictEqual(c.stats.maxHit, C.npcMaxHit(def, L), c.id + ' max hit');
    assert.strictEqual(c.stats.attackStyle, C.npcAttackType(def), c.id + ' attack style');
    assert.strictEqual(c.stats.level, def.level); assert.strictEqual(c.stats.hitpoints, def.hp);
    assert.ok(c.stats.sizeTiles === (def.size >= 2 ? 2 : 1));
  }
  const lv = MAN.creatures.map(c => c.stats.level);
  assert.deepStrictEqual(lv.slice().sort((a, b) => a - b), lv, 'creatures listed weakest first');
});

check('4 draft drops validate against the game items and the server shared tables', () => {
  const itemExists = id => !!ITEMS[id];
  for (const c of MAN.creatures) {
    const t = DRAFT.npcs[c.id]; assert.ok(t, c.id + ' has no draft table');
    assert.deepStrictEqual(D.validate(c.id, t, SERVER_DROPS.shared, itemExists), [], c.id);
    assert.ok(!SERVER_DROPS.npcs[c.id], c.id + ' already has a table in server/data/drops.json');
    assert.deepStrictEqual(t.main, c.drops.main, c.id + ' draft vs manifest');
    for (const x of c.drops.tertiary || []) if (x.proposed) assert.ok(!ITEMS[x.item] && !(t.tertiary || []).some(y => y.item === x.item), c.id + ' proposed ' + x.item);
    // the always drop is there and the rare table is reachable
    assert.ok((t.always || []).length >= 1, c.id + ' always drop');
  }
  for (const s of MAN.itemSuggestions) assert.ok(!ITEMS[s.id], 'suggested item ' + s.id + ' already exists');
});

console.log('[SCARLANDS BESTIARY] ' + passed + '/4 checks passed (' + MAN.creatures.map(c => c.id + ' L' + c.stats.level).join(', ') + ')');
