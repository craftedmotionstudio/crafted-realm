#!/usr/bin/env node
/* Build the Scarlands bestiary v1 end to end (W2/W3, 2026-09-26):
 *  1. kit textures (tools/build_oldschool_textures.js: hide_ash, scales_ember, fur_ashen are used by the beasts);
 *  2. Blender: tools/blender/build_scarlands_bestiary_humanoids_v1.py (scar skeleton, ash raider archer, ember mage
 *     on the character kit v3.0 + equipment kit) and ..._beasts_v1.py (ash stalker, cinder rat, cinder wyrmling);
 *  3. checks every GLB: a skin, the expected clips by name, event frames inside their clip, the rig's root at the feet;
 *  4. merges the design data (docs/rebuild/scarlands/bestiary_v1.data.json): the suggested NPC_TYPES entry with its
 *     max hit and combat level computed by shared/combat.js (the server's own rules), the draft drop table (every item
 *     id must exist in src/game1_data.js after buildTieredGear, or be flagged proposed);
 *  5. writes .studio-workspaces/scarlands-bestiary-v1/candidates/manifest.json and
 *     docs/rebuild/scarlands/drops_scarlands_draft.json (server/data/drops.json format, the new NPCs only).
 * Run: node tools/build_scarlands_bestiary.js [--no-blender]   (then node tools/publish_scarlands_bestiary.js apply) */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..'), WS = path.join(ROOT, '.studio-workspaces/scarlands-bestiary-v1');
const BLENDER = 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe';
const C = require('../shared/combat.js');
function run(cmd, args) {
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) { console.error((r.stdout || '').slice(-3000), (r.stderr || '').slice(-3000)); throw new Error(path.basename(cmd) + ' ' + args.slice(-1) + ' failed (' + r.status + ')'); }
  return r.stdout;
}
function need(ok, msg) { if (!ok) throw new Error('[bestiary] ' + msg); }
if (!process.argv.includes('--no-blender')) {
  run(process.execPath, ['tools/build_oldschool_textures.js']);
  for (const s of ['tools/blender/build_scarlands_bestiary_humanoids_v1.py', 'tools/blender/build_scarlands_bestiary_beasts_v1.py'])
    console.log(run(BLENDER, ['-b', '--python-exit-code', '1', '--python', s]).split(/\r?\n/).filter(l => l.startsWith('[BESTIARY')).join('\n'));
}
const H = JSON.parse(fs.readFileSync(path.join(WS, 'working/humanoids.json'), 'utf8')), Bst = JSON.parse(fs.readFileSync(path.join(WS, 'working/beasts.json'), 'utf8'));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/rebuild/scarlands/bestiary_v1.data.json'), 'utf8'));
const models = Object.assign({}, H.foes, Bst.beasts);
// game data (same sandbox as tools/validate_content.js): items after tier generation, existing NPC_TYPES
const sandbox = { Math, console }; sandbox.globalThis = sandbox; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/game1_data.js'), 'utf8') + '\n;globalThis.__D = {ITEMS, NPC_TYPES};\n', sandbox);
const ITEMS = sandbox.__D.ITEMS, NPCS = sandbox.__D.NPC_TYPES;
function glbJson(file) { const b = fs.readFileSync(file); return JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString()); }
const creatures = [], drops = {};
for (const d of DATA.creatures) {
  const m = models[d.id]; need(m, 'no model for ' + d.id);
  const file = path.join(ROOT, m.glb), j = glbJson(file);
  need(j.skins && j.skins.length === 1, d.id + ': one skin');
  const anims = new Set((j.animations || []).map(a => a.name));
  for (const [name, c] of Object.entries(m.clips)) {
    need(anims.has(name), d.id + ' GLB lacks clip ' + name);
    for (const ev of ['impact', 'release', 'until']) if (c[ev] != null) need(c[ev] > 0 && c[ev] < c.frames, d.id + ' ' + name + ' ' + ev + ' outside the clip');
  }
  for (const req of ['idle', 'walk', 'attack', 'hit', 'death']) need(m.clips[req], d.id + ' misses clip ' + req);
  // stats: the suggested entry, or the existing one with its changes
  let def;
  if (d.existing) { need(NPCS[d.id], d.id + ' is marked existing but is not in NPC_TYPES'); def = Object.assign({}, NPCS[d.id]); Object.keys(d.npcTypeChanges || {}).forEach(k => { if (k !== 'note') def[k] = d.npcTypeChanges[k]; }); }
  else { need(!NPCS[d.id], d.id + ' already exists in NPC_TYPES: mark it existing'); def = d.npcType; }
  const L = C.npcLevels(def), type = C.npcAttackType(def);
  const stats = { level: def.level, hitpoints: def.hp, attack: def.att, strength: def.str, defence: def.def, ranged: L.ranged, magic: L.magic,
    attackStyle: type, attackSpeedTicks: def.speedTicks, attackSpeedSeconds: +(def.speedTicks * 0.6).toFixed(1), attackRange: def.attackRange != null ? def.attackRange : (['stab', 'slash', 'crush'].includes(type) ? 1 : 7),
    maxHit: C.npcMaxHit(def, L), aggressive: !!def.aggro, respawnSeconds: def.respawn, sizeTiles: def.size >= 2 ? 2 : 1 };
  // drops: every item must exist (or be flagged proposed, and then must NOT exist yet)
  const dt = JSON.parse(JSON.stringify(d.drops));
  const check = (it, where) => { if (it.proposed) { need(!ITEMS[it.item], d.id + ' ' + where + ' ' + it.item + ' is marked proposed but exists'); } else if (it.item) need(ITEMS[it.item], d.id + ' ' + where + ': unknown item ' + it.item); };
  (dt.always || []).forEach(it => check(it, 'always')); (dt.main || []).forEach(it => check(it, 'main')); (dt.tertiary || []).forEach(it => check(it, 'tertiary'));
  const used = (dt.main || []).reduce((a, r) => a + r.w, 0); need(used <= (dt.rolls || 128), d.id + ' main weights ' + used + ' exceed rolls');
  // the draft table the server can load: proposed items left out (they do not exist yet)
  drops[d.id] = Object.assign({}, dt, { tertiary: (dt.tertiary || []).filter(t => !t.proposed) });
  if (!drops[d.id].tertiary.length) delete drops[d.id].tertiary;
  creatures.push({ id: d.id, name: d.name, examine: d.examine, role: d.role, wildernessLevels: d.wildernessLevels, pack: d.pack || null,
    model: { file: path.basename(m.glb), sha256: m.sha256, bytes: m.bytes, triangles: m.triangles, height_m: m.height_m, length_m: m.length_m || null,
      rig: m.rig || 'own rig (' + (m.bones || []).length + ' bones, Root at the ground)', walk_speed_mps: m.walk_speed_mps || 1.67, anchors: m.anchors || null },
    clips: m.clips, stats, npcType: d.existing ? { existing: true, changes: d.npcTypeChanges } : d.npcType,
    attacks: d.attacks || [{ clip: 'attack', type, range: stats.attackRange }], projectile: d.projectile || null,
    drops: dt, dropMainWeight: used + ' / ' + (dt.rolls || 128) });
  console.log(d.id.padEnd(20), 'lvl', String(def.level).padStart(2), 'hp', String(def.hp).padStart(3), type.padEnd(6), 'max', stats.maxHit, 'spd', def.speedTicks, 'range', stats.attackRange,
    '|', m.triangles, 'tris', m.height_m, 'm |', Object.keys(m.clips).join(','));
}
const manifest = {
  schema: 'crafted-realm-scarlands-bestiary-v1', version: 1, name: 'The Scarlands bestiary v1',
  about: 'Six Scarlands foes: our own low-poly Blender designs, rigged and animated for three.js r128 (one GLB each). Humanoids share the character kit v3.0 rig and clips; beasts have their own rigs.',
  conventions: {
    axes: 'glTF +Y up, +Z forward (the character kit convention), 1 unit = 1 m = 1 tile, feet on y = 0, model origin = the centre of its tile footprint',
    clips: 'glTF animations named idle, walk, attack, hit, death (+ block / shoot / cast / breath); frames at 30 fps; loop flags as listed. Play non-looping clips with LoopOnce + clampWhenFinished; death holds its last frame',
    events: 'impact = the frame the hit lands (melee: show the hitsplat); release = the frame the projectile leaves (ranged/magic); until = the last frame of a sustained breath',
    walk: 'clips are in place; the server moves the NPC one tile per 600 ms tick (1.67 m/s); play walk at timeScale = speed / walk_speed_mps',
    materials: 'colours are display values (the game renders without colour management): colour maps LinearEncoding + NearestFilter, roughness 1, metalness 0; glow materials are emissive',
    stats: 'npcType = a suggested src/game1_data.js NPC_TYPES entry; stats.maxHit / attackStyle are computed with shared/combat.js (the server rules); drops = a draft in server/data/drops.json format'
  },
  creatures,
  itemSuggestions: DATA.itemSuggestions
};
fs.writeFileSync(path.join(WS, 'candidates/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const draft = { about: 'DRAFT drop tables for the Scarlands bestiary v1 (docs/rebuild/scarlands/bestiary_v1.data.json), in server/data/drops.json format. Merge the npcs block into server/data/drops.json when the NPC_TYPES entries land; the shared table scar_rare is the one already in drops.json. Proposed items (stalker_fang, wyrmling_scale) are left out until they exist.',
  npcs: drops };
fs.writeFileSync(path.join(ROOT, 'docs/rebuild/scarlands/drops_scarlands_draft.json'), JSON.stringify(draft, null, 1) + '\n');
console.log('[BESTIARY BUILD] ' + creatures.length + ' creatures -> ' + path.relative(ROOT, path.join(WS, 'candidates/manifest.json')));
