'use strict';
// End-to-end transaction test against the real staged Blender arrival package.
// Run tools/stage_holm_arrival_package.js first. No real live targets are written.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const W=require('./studio_workspace');
const staged=path.resolve(__dirname,'../.studio-workspaces/holm-arrival-package-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(staged,'studio-workspace.json'),'utf8'));
const targets=manifest.targets.map(t=>t.path),root=fs.mkdtempSync(path.join(os.tmpdir(),'holm-arrival-transaction-'));
W.init(root,'arrival',targets);
for(const rel of targets)W.stage(root,'arrival',rel,path.join(staged,'working',rel));
const exp=W.exportWorkspace(root,'arrival');assert(W.plan(root,'arrival',exp.exportId).ok);
const rel='assets/world/authoring/holm-arrival.package.json',packed=path.join(exp.dir,'files',rel);
const bad=JSON.parse(fs.readFileSync(packed,'utf8'));
bad.navigation.doorStates['open-open'].graph.links[bad.spawn.nodeId]=[];
const bytes=Buffer.from(JSON.stringify(bad));fs.writeFileSync(packed,bytes);
const exportManifestPath=path.join(exp.dir,'manifest.json'),exportManifest=JSON.parse(fs.readFileSync(exportManifestPath,'utf8'));
const row=exportManifest.files.find(f=>f.path===rel);row.hash=W.sha256(bytes);row.bytes=bytes.length;
fs.writeFileSync(exportManifestPath,JSON.stringify(exportManifest));
const plan=W.plan(root,'arrival',exp.exportId);assert(!plan.ok,'hash-consistent wrong navigation cannot publish');
assert.throws(()=>W.apply(root,'arrival',exp.exportId),/publish refused/);
assert(targets.every(t=>!fs.existsSync(path.join(root,t))),'rejected apply writes no live target');
console.log('[HOLM_ARRIVAL_TRANSACTION] actual staged source bytes accepted; hash-consistent altered route rejected by plan and apply; no live writes.');
