#!/usr/bin/env node
/* Publish the Scarlands art kit v1 (W2/W3, 2026-09-26) through the Studio Safe Publish pipeline
 * (tools/studio_workspace.js: stage, export, plan, journaled apply with backups and rollback):
 *   .studio-workspaces/scarlands-kit-v1/candidates/scarlands_kit.glb  -> assets/scarlands/kit-v1/scarlands_kit.glb
 *   .studio-workspaces/scarlands-kit-v1/candidates/manifest.json      -> assets/scarlands/kit-v1/manifest.json
 *   docs/rebuild/scarlands/proof_layout.json                          -> assets/scarlands/proof/layout.json
 *   docs/rebuild/scarlands/proof_placement.json                       -> assets/scarlands/proof/placement.json
 * Byte-identical copies, so the manifest's GLB hash and the placement's kit hash stay valid. The .blend sources stay in
 * the workspace. Run: node tools/publish_scarlands_kit.js [plan|apply]   (default plan: prints the list, changes nothing) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), W = require('./studio_workspace.js');
const K = '.studio-workspaces/scarlands-kit-v1/candidates/';
const ROWS = [[K + 'scarlands_kit.glb', 'assets/scarlands/kit-v1/scarlands_kit.glb'], [K + 'manifest.json', 'assets/scarlands/kit-v1/manifest.json'],
  ['docs/rebuild/scarlands/proof_layout.json', 'assets/scarlands/proof/layout.json'], ['docs/rebuild/scarlands/proof_placement.json', 'assets/scarlands/proof/placement.json']]
  .map(([src, target]) => ({ src: path.join(ROOT, src), target }));
ROWS.forEach(r => { if (!fs.existsSync(r.src)) throw new Error('missing ' + path.relative(ROOT, r.src) + ' (run node tools/build_scarlands_kit.js first)'); });
// a workspace's target list is fixed at init: a new file set publishes through the next version
function workspaceId() {
  for (let v = 1; ; v++) {
    const id = 'scarlands-kit-publish-v' + v, m = path.join(ROOT, '.studio-workspaces', id, 'studio-workspace.json');
    if (!fs.existsSync(m)) return id;
    const have = new Set(JSON.parse(fs.readFileSync(m, 'utf8')).targets.map(t => t.path));
    if (ROWS.every(r => have.has(r.target)) && have.size === ROWS.length) return id;
  }
}
const mode = process.argv[2] || 'plan', id = workspaceId();
console.log('[SCARLANDS PUBLISH] ' + ROWS.length + ' files via ' + id + ':'); ROWS.forEach(r => console.log('  ' + r.target));
if (mode === 'plan') process.exit(0);
if (mode !== 'apply') throw new Error('usage: plan|apply');
if (!fs.existsSync(path.join(ROOT, '.studio-workspaces', id, 'studio-workspace.json'))) W.init(ROOT, id, ROWS.map(r => r.target));
ROWS.forEach(r => W.stage(ROOT, id, r.target, r.src));
const ex = W.exportWorkspace(ROOT, id), pl = W.plan(ROOT, id, ex.exportId);
if (!pl.ok && !pl.noChanges) throw new Error('publish plan refused: ' + JSON.stringify((pl.files || []).filter(f => !f.ok).slice(0, 5)));
const res = W.apply(ROOT, id, ex.exportId);
console.log('[SCARLANDS PUBLISH] applied ' + JSON.stringify({ exportId: ex.exportId, receipt: res.receiptId || res.id || null }));
