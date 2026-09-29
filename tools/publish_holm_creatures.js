#!/usr/bin/env node
/* Publish the Holm creatures v1 (owner request 2026-09-29: the large rat that replaces the grubkins, the rat, the goblin,
 * the chicken and the cow) through the Studio Safe Publish pipeline (tools/studio_workspace.js: stage, export, plan,
 * journaled apply with backups and rollback):
 *   .studio-workspaces/holm-creatures-v1/candidates/<id>.glb     -> assets/models/<id>.glb   (charNpcModel loads them by glbChar)
 *   .studio-workspaces/holm-creatures-v1/candidates/manifest.json -> assets/models/holm_creatures_v1_manifest.json
 * Byte-identical copies, so the manifest's GLB hashes stay valid; the .blend source stays in the workspace.
 * Build first: blender -b --python tools/blender/build_holm_creatures_v1.py
 * Run: node tools/publish_holm_creatures.js [plan|apply]   (default plan: prints the list, changes nothing) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), W = require('./studio_workspace.js');
const K = '.studio-workspaces/holm-creatures-v1/candidates/';
const manPath = path.join(ROOT, K, 'manifest.json');
if (!fs.existsSync(manPath)) throw new Error('missing ' + K + 'manifest.json (run tools/blender/build_holm_creatures_v1.py first)');
const MAN = JSON.parse(fs.readFileSync(manPath, 'utf8'));
const ROWS = Object.keys(MAN.creatures).sort().map(id => [K + id + '.glb', 'assets/models/' + id + '.glb'])
  .concat([[K + 'manifest.json', 'assets/models/holm_creatures_v1_manifest.json']])
  .map(([src, target]) => ({ src: path.join(ROOT, src), target }));
ROWS.forEach(r => { if (!fs.existsSync(r.src)) throw new Error('missing ' + path.relative(ROOT, r.src)); });
// every creature built must have passed its checks (skin, the six clips, budgets, feet on the ground)
for (const [id, c] of Object.entries(MAN.creatures)) {
  const bad = Object.entries(c.checks || {}).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) throw new Error(id + ' failed its build checks: ' + bad.join(', '));
}
// a workspace's target list is fixed at init: a new file set publishes through the next version
function workspaceId() {
  for (let v = 1; ; v++) {
    const id = 'holm-creatures-publish-v' + v, m = path.join(ROOT, '.studio-workspaces', id, 'studio-workspace.json');
    if (!fs.existsSync(m)) return id;
    const have = new Set(JSON.parse(fs.readFileSync(m, 'utf8')).targets.map(t => t.path));
    if (ROWS.every(r => have.has(r.target)) && have.size === ROWS.length) return id;
  }
}
const mode = process.argv[2] || 'plan', id = workspaceId();
console.log('[CREATURES PUBLISH] ' + ROWS.length + ' files via ' + id + ':'); ROWS.forEach(r => console.log('  ' + r.target));
if (mode === 'plan') process.exit(0);
if (mode !== 'apply') throw new Error('usage: plan|apply');
if (!fs.existsSync(path.join(ROOT, '.studio-workspaces', id, 'studio-workspace.json'))) W.init(ROOT, id, ROWS.map(r => r.target));
ROWS.forEach(r => W.stage(ROOT, id, r.target, r.src));
const ex = W.exportWorkspace(ROOT, id), pl = W.plan(ROOT, id, ex.exportId);
if (!pl.ok && !pl.noChanges) throw new Error('publish plan refused: ' + JSON.stringify((pl.files || []).filter(f => !f.ok).slice(0, 5)));
const res = W.apply(ROOT, id, ex.exportId);
console.log('[CREATURES PUBLISH] applied ' + JSON.stringify({ exportId: ex.exportId, receipt: res.receiptId || res.id || null }));
