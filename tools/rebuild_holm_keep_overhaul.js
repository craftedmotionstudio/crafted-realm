#!/usr/bin/env node
/* Warden's Keep overhaul (owner review 2026-09-29), one command from Blender to the registry, stopping on the first failed
 * proof. Spec: docs/rebuild/holm-overhaul/keep-overhaul/keep.json. New versioned workspaces only
 * (holm-keep-overhaul-v1, holm-keep-overhaul-navigation-v1); nothing the island loads today is overwritten.
 *  1. build:    tools/blender/build_holm_keep_overhaul.py (Blender 4.5) -> <ws>/working/keep-flat.blend + keep.build.json
 *  2. texture:  tools/blender/apply_oldschool_textures.py (the old-school recipe; props textured on their own faces)
 *  2b. zfix:    tools/blender/fix_holm_keep_overhaul_coplanar.py (holm_coplanar's push and carve passes in the keep's views,
 *               stances measured first so nothing beside one moves) -> <ws>/candidates/keep.blend + keep.glb
 *  3. contract: the exported GLB carries what gameplay code binds to: every stair's foot and head anchor, every door leaf
 *               on its hinge pivot (door id, closed / open yaw), the beer (Keep_ServiceBeer_Tankard + keep-beer anchor),
 *               the FX parts; every mesh named by the island cutaway contract -> <ws>/candidates/keep.contract.json
 *  4. graph:    tools/blender/extract_holm_keep_navigation_v7.py (Blender 5.1) on the new bytes -> the navigation workspace
 *  5. proof:    the graph locks the model; every target reachable on foot; the eight targets the island used are kept and
 *               the lesson stances (gate, court, hall, undercroft) stand where they stood; level two is one ring round the
 *               keep (each ring door on a cycle); with the stair treads taken out and the climbs added (instant 2004 stairs)
 *               every target is still reachable; every door has its doorway links; the court's practice-rat spots are the
 *               court's grass; the gate court outside is unchanged
 *  6. cutaway:  tools/check_holm_cutaway_props.js (the game's own rule) on the furnishings: no piece clipped
 *  7. coplanar: tools/blender/check_holm_coplanar.py (keep profile) on the model the island loads and on the new one
 *  8. registry: docs/rebuild/holm-overhaul/v2land.json repointed to the new model and graph
 * Run: node tools/rebuild_holm_keep_overhaul.js [--from step] [--to step] [--no-registry]
 *      steps: build texture zfix graph contract proof cutaway coplanar registry */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), abs = p => path.join(ROOT, p), read = p => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const BLENDER = v => 'C:/Program Files/Blender Foundation/Blender ' + v + '/blender.exe';
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(abs(p))).digest('hex');
const STEPS = ['build', 'texture', 'zfix', 'graph', 'contract', 'proof', 'cutaway', 'coplanar', 'registry'];
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null };
const from = STEPS.indexOf(opt('--from') || 'build'), to = STEPS.indexOf(opt('--to') || 'registry'), noReg = args.includes('--no-registry');
const on = s => STEPS.indexOf(s) >= from && STEPS.indexOf(s) <= to && !(s === 'registry' && noReg);
const SPEC = 'docs/rebuild/holm-overhaul/keep-overhaul/keep.json', spec = read(SPEC), REG = 'docs/rebuild/holm-overhaul/v2land.json';
const LOG = abs('scratchpad/keep_overhaul/pipeline'); fs.mkdirSync(LOG, { recursive: true });
const WS = path.dirname(path.dirname(spec.outGlb)), NAV = '.studio-workspaces/' + spec.graph + '/candidates/navigation.json';
const REF_NAV = '.studio-workspaces/' + spec.referenceGraph + '/candidates/navigation.json';
const resultFile = path.join(LOG, 'result.json');
const result = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf8')) : {};
const save = () => fs.writeFileSync(resultFile, JSON.stringify(result, null, 1) + '\n');
function run(cmd, a, log) {
  const r = cp.spawnSync(cmd, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true });
  if (log) fs.writeFileSync(log, (r.stdout || '') + '\n' + (r.stderr || ''));
  if (r.status !== 0) throw Error(path.basename(cmd) + ' ' + a.slice(0, 6).join(' ') + ' failed (' + r.status + ')' + (log ? ' see ' + log : ''));
  return r.stdout;
}
function fail(msg) { result.failed = msg; save(); throw Error(msg) }
const reg0 = read(REG), entry0 = reg0.buildings.keep;
if (on('build') && entry0.model.replace(/^\//, '') !== spec.reference && entry0.model.replace(/^\//, '') !== spec.outGlb)
  fail('the island loads ' + entry0.model + ', not the spec reference ' + spec.reference);

// 1. build
if (on('build')) {
  const out = run(BLENDER(spec.blender), ['-b', '--python-exit-code', '1', '--python', spec.script, '--', SPEC], path.join(LOG, 'build.log'));
  const line = out.split(/\r?\n/).find(l => l.startsWith('[KEEP_OVERHAUL_BUILD] {'));
  if (!line) fail('no build result'); result.build = JSON.parse(line.slice(22)); save();
  console.log('[KEEP_OVERHAUL] built ' + JSON.stringify(result.build));
}
// 2. texture
if (on('texture')) {
  const out = run(BLENDER(spec.blender), ['-b', spec.flat, '--python-exit-code', '1', '--python', 'tools/blender/apply_oldschool_textures.py', '--', 'docs/rebuild/holm-overhaul/keep-overhaul/keep.textures.json'], path.join(LOG, 'texture.log'));
  const line = out.split(/\r?\n/).find(l => l.startsWith('[OLDSCHOOL TEXTURES]'));
  result.texture = line ? JSON.parse(line.slice(21)) : null; save();
  console.log('[KEEP_OVERHAUL] textured ' + JSON.stringify(result.texture && result.texture.glb));
}
// 3. the z-fighting pass: a first measure on the textured model (its stances), then the pass
if (on('zfix')) {
  const pre = 'scratchpad/keep_overhaul/pipeline/prenav';
  run(BLENDER('5.1'), ['-b', '--python-exit-code', '1', '--python', spec.extractor, '--', WS + '/working', pre, 'keep-textured'], path.join(LOG, 'prenav.log'));
  const out = run(BLENDER('5.1'), ['-b', '--python-exit-code', '1', '--python', 'tools/blender/fix_holm_keep_overhaul_coplanar.py', '--', abs(WS + '/working/keep-textured.blend'), abs(spec.outBlend), abs(spec.outGlb), abs('scratchpad/keep_overhaul/pipeline/zfix.json'), abs(pre + '/navigation.json')], path.join(LOG, 'zfix.log'));
  const z = out && JSON.parse(fs.readFileSync(abs('scratchpad/keep_overhaul/pipeline/zfix.json'), 'utf8'));
  result.zfix = z && { before: z.before, after: z.after, passes: z.passes && z.passes.length }; save();
  console.log('[KEEP_OVERHAUL] z-fix ' + JSON.stringify(result.zfix && { before: result.zfix.before && result.zfix.before.area, after: result.zfix.after && result.zfix.after.area }));
}
// 4. graph (the candidate the island will load)
if (on('graph')) {
  const out = run(BLENDER('5.1'), ['-b', '--python-exit-code', '1', '--python', spec.extractor], path.join(LOG, 'graph.log'));
  const line = out.split(/\r?\n/).find(l => l.startsWith('[KEEP_NAVIGATION] {'));
  result.graph = line ? JSON.parse(line.slice(18)) : null; save();
  console.log('[KEEP_OVERHAUL] graph ' + JSON.stringify(result.graph && { nodes: result.graph.nodes, reachable: result.graph.reachableNodes, targets: result.graph.targetsReachable + '/' + result.graph.targetsTotal, climbs: result.graph.climbs, doors: result.graph.doorsLinked + '/' + result.graph.doors }));
}
// the GLB's JSON chunk
function glb(p) { const b = fs.readFileSync(abs(p)), len = b.readUInt32LE(12); return JSON.parse(b.slice(20, 20 + len).toString()) }
// 3. contract
if (on('contract')) {
  const g = glb(spec.outGlb), build = read(spec.buildReport), names = g.nodes.map(n => n.name || '');
  const byName = Object.fromEntries(g.nodes.map(n => [n.name, n]));
  const issues = [];
  const anchors = build.anchors.map(a => { const n = byName[a.node]; if (!n) issues.push('missing anchor node ' + a.node); return Object.assign({}, a, { extras: n && n.extras || null }) });
  const doors = build.doors.map(d => Object.assign({}, d, { leaves: d.leaves.map(l => { const pv = byName[l.pivot], lf = byName[l.mesh];
    if (!pv) issues.push('missing door pivot ' + l.pivot); if (!lf) issues.push('missing door leaf ' + l.mesh);
    if (pv && (!pv.extras || pv.extras.door !== d.id || typeof pv.extras.closedYaw !== 'number')) issues.push('door pivot without its extras ' + l.pivot);
    const kids = pv && (pv.children || []).map(i => g.nodes[i].name); if (pv && !kids.includes(l.mesh)) issues.push('leaf not on its pivot ' + l.mesh);
    return Object.assign({}, l, { pivotRotation: pv && pv.rotation || [0, 0, 0, 1], pivotTranslation: pv && pv.translation }) }) }));
  if (!byName.Keep_ServiceBeer_Tankard || byName.Keep_ServiceBeer_Tankard.mesh === undefined) issues.push('missing the beer mesh Keep_ServiceBeer_Tankard');
  const meshNames = g.nodes.filter(n => n.mesh !== undefined).map(n => n.name);
  const contractRe = /^Keep_(Shell_|Upper_Shell_|GroundFront_|Roof_|Upper_|Tower_|Floor_|Stair_|TreadFrame_|Furnishing_|Door_|ServiceBeer_)/;
  meshNames.filter(n => !contractRe.test(n)).forEach(n => issues.push('mesh outside the cutaway contract ' + n));
  const hung = meshNames.filter(n => /Hung|Glazing|StainedGlass|TorchFlames|Hearth$|Portcullis/.test(n));
  hung.filter(n => !/^Keep_(Shell|Upper_Shell)_/.test(n)).forEach(n => issues.push('wall-hung part not tagged Shell ' + n));
  const fx = g.nodes.filter(n => n.extras && n.extras.fx).map(n => ({ node: n.name, fx: n.extras.fx }));
  const contract = { schema: 'holm.warden-keep.overhaul.v1', model: spec.outGlb, modelSha256: sha(spec.outGlb), triangles: build.triangles,
    note: 'Warden\'s Keep overhaul (owner review 2026-09-29). Anchors, doors and services for gameplay code; FX parts for the torch/fire FX; the island cutaway contract (Keep_Shell_* / Keep_Upper_Shell_* clip with the walls: every wall-hung part is there).',
    cutaway: { clip: '^Keep_(Shell|Upper_Shell|GroundFront)_', upper: '^Keep_(Upper|Tower)_', roof: '^Keep_Roof_', wallHung: hung,
      keptWhole: 'floors (Floor), stairs (Stair) and their carpentry (TreadFrame, Tread), services (Keep_ServiceBeer_); furnishing objects welded one piece per material' },
    anchors, doors, stairs: build.stairs, services: build.services, fx, meshes: meshNames.length, issues };
  fs.writeFileSync(abs(WS + '/candidates/keep.contract.json'), JSON.stringify(contract, null, 1) + '\n');
  result.contract = { anchors: anchors.length, doors: doors.length, leaves: doors.reduce((a, d) => a + d.leaves.length, 0), meshes: meshNames.length, wallHung: hung.length, fx: fx.length, issues }; save();
  if (issues.length) fail('contract: ' + issues.slice(0, 8).join('; '));
  console.log('[KEEP_OVERHAUL] contract ok ' + JSON.stringify(result.contract));
}
// 5. proof
function reach(n, start, links, jump) {
  const seen = new Set([start]), q = [start];
  for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of (links[u] || []).concat(jump && jump[u] || [])) if (!seen.has(v)) { seen.add(v); q.push(v) } }
  return seen;
}
if (on('proof')) {
  const n = read(NAV), ref = read(REF_NAV), p = {}, bad = [];
  const byId = Object.fromEntries(n.nodes.map(x => [x.id, x])), tg = Object.fromEntries(n.targets.map(t => [t.id, t]));
  p.locksModel = n.modelSha256 === sha(spec.outGlb); if (!p.locksModel) bad.push('graph does not lock the model');
  const R = reach(n, n.startId, n.links);
  p.targets = n.targets.map(t => ({ id: t.id, node: t.nodeId, reachable: !!(t.nodeId && R.has(t.nodeId)) }));
  p.targets.filter(t => !t.reachable).forEach(t => bad.push('target unreachable ' + t.id));
  p.unreachableNodes = n.nodes.filter(x => !R.has(x.id)).map(x => x.id + '@' + x.y.toFixed(2) + ':' + x.surface);
  // the island's targets are kept; the lesson stances stand where they stood
  const lesson = ['gate', 'court', 'hall', 'undercroft'];
  p.kept = ref.targets.map(t => ({ id: t.id, present: !!tg[t.id] }));
  p.kept.filter(k => !k.present).forEach(k => bad.push('island target dropped ' + k.id));
  p.lessonStances = lesson.map(id => { const a = ref.nodes.find(x => x.id === ref.targets.find(t => t.id === id).nodeId), b = tg[id] && byId[tg[id].nodeId];
    const same = !!(a && b && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6 && Math.abs(a.y - b.y) < .05);
    if (!same) bad.push('lesson stance moved ' + id); return { id, before: a && [a.x, a.y, a.z], after: b && [b.x, b.y, b.z], same } });
  // level two is one ring: the ring's rooms in one component, and every ring door on a cycle (drop its links: still one)
  const L2 = x => x.y > 2.9 && x.y < 3.5, ringRooms = ['chamber', 'dormitory', 'turret-l1', 'wallwalk', 'walk-south', 'guardroom', 'walk-southwest', 'solar', 'upper'];
  const l2links = drop => { const o = {}; for (const [a, vs] of Object.entries(n.links)) { if (!L2(byId[a])) continue; o[a] = vs.filter(b => L2(byId[b]) && !(drop && drop.has(a + '|' + b))) } return o };
  const ringOk = drop => { const ls = l2links(drop), s0 = tg.chamber.nodeId, S = reach(n, s0, ls); return ringRooms.every(r => S.has(tg[r].nodeId)) };
  p.ring = { rooms: ringRooms, connected: ringOk(null), doors: [] };
  if (!p.ring.connected) bad.push('level two is not one ring');
  const ringDoors = ['keep-door-dormitory', 'keep-door-turret-l1', 'keep-door-eastwalk', 'keep-door-gatehouse-e', 'keep-door-gatehouse-w', 'keep-door-solar', 'keep-door-chamber'];
  for (const d of n.doors) {
    const drop = new Set(); d.links.forEach(([a, b]) => { drop.add(a + '|' + b); drop.add(b + '|' + a) });
    const rec = { id: d.id, links: d.links.length, onCycle: d.storey === 1 ? ringOk(drop) : null };
    if (!d.links.length) bad.push('door without doorway links ' + d.id);
    if (ringDoors.includes(d.id) && !rec.onCycle) bad.push('ring door not on a cycle ' + d.id);
    p.ring.doors.push(rec);
  }
  // instant 2004 stairs: the flights taken out of the walk, each staircase a jump between its measured foot and head
  const jump = {}, add = (a, b) => (jump[a] = jump[a] || []).push(b);
  n.climbs.forEach(c => { if (!c.footId || !c.topId) bad.push('climb unmeasured ' + c.id); else { add(c.footId, c.topId); add(c.topId, c.footId) } });
  const noStair = {}; for (const [a, vs] of Object.entries(n.links)) { if (/Stair/.test(byId[a].surface)) continue; noStair[a] = vs.filter(b => !/Stair/.test(byId[b].surface)) }
  const R2 = reach(n, n.startId, noStair, jump);
  p.instantStairs = { climbs: n.climbs.length, targets: n.targets.map(t => ({ id: t.id, reachable: R2.has(t.nodeId) })) };
  p.instantStairs.targets.filter(t => !t.reachable).forEach(t => bad.push('target unreachable with instant stairs ' + t.id));
  // the court's practice rats (src/holm_island_trials.js spots(): graph nodes 2..4.5 tiles from the court stance, level with
  // it, on the land; the same deterministic pick): each on the court's grass and reachable
  const cs = byId[tg.court.nodeId];
  // every node the runtime may pick (its filter; the pick order depends on the composed graph), each on the court's grass
  const cand = n.nodes.filter(x => { const d = Math.hypot(x.x - cs.x, x.z - cs.z); return d >= 2 && d <= 4.5 && Math.abs(x.y - cs.y) < .6 && /(Terrain|Floor)$/.test(x.surface) });
  const inCourt = x => x.x > -2.81 && x.x < 8.81 && x.z > -4.81 && x.z < 3.81;
  cand.sort((a, b) => ((a.x + 87) * 7 + (a.z + 35) * 13) % 5 - ((b.x + 87) * 7 + (b.z + 35) * 13) % 5);
  const spots = []; cand.forEach(x => { if (spots.length < 3 && spots.every(o => Math.hypot(o.x - x.x, o.z - x.z) >= 2.2)) spots.push(x) });
  p.courtRats = { candidates: cand.length, offCourt: cand.filter(x => !R.has(x.id) || !inCourt(x)).map(x => x.id), sample: spots.map(x => ({ node: x.id, at: [x.x, x.y, x.z] })) };
  p.courtRats.offCourt.forEach(id => bad.push('a court rat spot off the court ' + id));
  if (spots.length < 3) bad.push('fewer than three court rat spots');
  // outside the gate (the gate court and the keep ledge path's start): the terrain stances are those the island had
  const outside = x => x.z >= 10.5 && /Terrain$/.test(x.surface);
  const a0 = ref.nodes.filter(outside).map(x => x.id + '@' + x.y.toFixed(3)).sort(), b0 = n.nodes.filter(outside).map(x => x.id + '@' + x.y.toFixed(3)).sort();
  p.gateCourt = { before: a0.length, after: b0.length, same: JSON.stringify(a0) === JSON.stringify(b0) };
  if (!p.gateCourt.same) bad.push('the gate court outside changed');
  // the undercroft: the trapdoor tile (the island's hatch at world 77.5, 35.5) and its stance next to it stay free floor
  const hatch = read('docs/rebuild/holm-overhaul/island-ladders.json').ladders.find(l => l.id === 'keep-undercroft').hatch;
  const hx = hatch.x - n.placement.x, hz = hatch.z - n.placement.z, ht = n.nodes.filter(x => Math.floor(x.x) === Math.floor(hx) && Math.floor(x.z) === Math.floor(hz) && x.y < 1);
  p.undercroft = { hatchLocal: [hx, hz], hatchTileFloor: ht.length > 0, stance: tg.undercroft.nodeId };
  if (!ht.length) bad.push('the trapdoor tile is not floor');
  // the island's own dressing round the keep (yard props, habitat trunks) takes no walk, no target, no new masonry
  const dr = cp.spawnSync(process.execPath, ['tools/check_holm_keep_overhaul_dressing.js', NAV], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  try { const dj = JSON.parse(dr.stdout); p.dressing = { checked: dj.checked, problems: dj.problems.map(x => x.id) }; dj.problems.forEach(x => bad.push('island dressing on the keep: ' + x.id)) }
  catch (e) { bad.push('dressing check failed to run') }
  p.ok = !bad.length; p.issues = bad; result.proof = p; save();
  fs.writeFileSync(path.join(LOG, 'proof.json'), JSON.stringify(p, null, 1) + '\n');
  if (bad.length) fail('proof: ' + bad.slice(0, 10).join('; '));
  console.log('[KEEP_OVERHAUL] proof ok: ' + n.targets.length + ' targets reachable (on foot and with instant stairs), ring of ' + ringDoors.length + ' doors on a cycle, ' + n.doors.length + ' doors linked, lesson stances unchanged, ' + p.courtRats.candidates + ' rat spots all on the court, unreachable nodes ' + p.unreachableNodes.length);
}
// 6. cutaway: the game's own rule on every furnishing object (nothing clipped while inside)
if (on('cutaway')) {
  const f = 'scratchpad/keep_overhaul/pipeline/cutaway.json';
  cp.spawnSync(process.execPath, ['tools/check_holm_cutaway_props.js', spec.outGlb, NAV, 'keep', '^Keep_(Upper_)?(Furnishing_|Tower_WatchL2Furnishing|Tower_WatchTopGun|Tower_TurretTopGun|ServiceBeer_)', '--json', f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const c = JSON.parse(fs.readFileSync(abs(f), 'utf8'));
  result.cutaway = { pieces: c.pieces, keep: c.keep, cut: c.cut, clipped: c.clipped.length, sample: c.clipped.slice(0, 12) }; save();
  if (c.clipped.length) fail('cutaway: ' + c.clipped.length + ' furnishing pieces clipped ' + JSON.stringify(c.clipped.slice(0, 6)));
  console.log('[KEEP_OVERHAUL] cutaway ok: ' + c.pieces + ' furnishing pieces, none clipped');
}
// 7. coplanar (the game's views: outside and every cutaway storey)
if (on('coplanar')) {
  const o = {};
  for (const [k, m, g] of [['before', spec.reference, REF_NAV], ['after', spec.outGlb, NAV]]) {
    const f = 'scratchpad/keep_overhaul/pipeline/coplanar.' + k + '.json';
    run(BLENDER('5.1'), ['-b', '--python-exit-code', '1', '--python', 'tools/blender/check_holm_coplanar.py', '--', abs(m), abs(f), 'keep', abs(g)], path.join(LOG, 'coplanar.' + k + '.log'));
    const j = JSON.parse(fs.readFileSync(abs(f), 'utf8')), c = {};
    j.fights.filter(q => q.visible !== false).forEach(q => { const key = [q.a, q.b].sort().join(' | '); c[key] = (c[key] || 0) + 1 });
    o[k] = { summary: j.summary, pairs: c };
  }
  result.coplanar = { before: o.before.summary, after: o.after.summary, afterPairs: o.after.pairs }; save();
  console.log('[KEEP_OVERHAUL] coplanar: before ' + JSON.stringify(o.before.summary) + ' after ' + JSON.stringify(o.after.summary));
  if ((o.after.summary.fights || 0) > (o.before.summary.fights || 0)) fail('coplanar: more visible fights than the keep had (' + JSON.stringify(o.after.pairs).slice(0, 400) + ')');
}
// 8. registry
if (on('registry')) {
  if (!result.proof || !result.proof.ok) fail('no proof to register');
  const r2 = read(REG), e = r2.buildings.keep, n = read(NAV), was = { graph: e.graph, model: e.model };
  Object.assign(e, { graph: spec.graph, model: spec.outGlb, nodes: n.nodes.length, modelSha256: n.modelSha256, terrainSha256: n.terrainSha256,
    unreachableTargets: n.targets.filter(t => !result.proof.targets.find(x => x.id === t.id && x.reachable)).map(t => t.id), measuredAt: new Date().toISOString(),
    overhaul: 'owner review 2026-09-29: the Warden\'s Keep rebuilt in Blender (' + spec.script + ', ' + SPEC + '): a closed front with one gatehouse, stone floors, stained glass, a level-two ring through the towers with hinged doors, supported stairs with foot/head anchors and climbs, cannons, torches, a richly furnished hall, chamber, solar and dormitory, the beer (keep-beer). Graph measured with ' + spec.extractor + ' (was ' + was.graph + ' / ' + was.model + ').' });
  delete e.props;
  fs.writeFileSync(abs(REG), JSON.stringify(r2, null, 1) + '\n');
  result.registry = { was, now: { graph: e.graph, model: e.model } }; save();
  console.log('[KEEP_OVERHAUL] registry -> ' + spec.outGlb);
}
