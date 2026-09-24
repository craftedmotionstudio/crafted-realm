'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const V=require('./studio_overhaul_terrain_validation'),W=require('./studio_workspace');
const source=require('../.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.json');
const bundle=require('../src/holm_overhaul_terrain').compile(source);
const sourcePath='assets/world/authoring/holm-overhaul.terrain.json',bundlePath=sourcePath.replace('.json','.bundle.json');
const clone=v=>JSON.parse(JSON.stringify(v));
assert.deepStrictEqual(V.validateSet({[sourcePath]:source,[bundlePath]:bundle}),[]);
assert(V.validateSet({[sourcePath]:source}).length);
assert(V.validateSet({[bundlePath]:bundle}).length);
for(const key of ['heights','materials','water']){
 const bad=clone(bundle);bad[key][0]=key==='heights'?bad[key][0]+.01:(bad[key][0]+1)%3;
 assert(V.validateSet({[sourcePath]:source,[bundlePath]:bad}).some(e=>e.includes('differs')));
}
const bad=clone(bundle);bad.heights[0]=null;assert(V.validate(bad).length);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'holm-terrain-publish-'));
for(const [rel,value] of [[sourcePath,source],[bundlePath,bundle]]){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),JSON.stringify(value))}
W.init(root,'terrain',[sourcePath,bundlePath]);
const next=clone(source);next.hills[0].height+=.1;
const candidate=path.join(root,'candidate.json');fs.writeFileSync(candidate,JSON.stringify(next));
W.stage(root,'terrain',sourcePath,candidate);
assert.throws(()=>W.exportWorkspace(root,'terrain'),/differs/);
fs.writeFileSync(candidate,JSON.stringify(require('../src/holm_overhaul_terrain').compile(next)));
W.stage(root,'terrain',bundlePath,candidate);
const exp=W.exportWorkspace(root,'terrain');assert(W.plan(root,'terrain',exp.exportId).ok);
// Simulate a pre-validator export with internally valid hashes but inconsistent terrain.
const packed=path.join(exp.dir,'files',bundlePath),wrong=clone(bundle);wrong.heights[0]+=.01;
const bytes=Buffer.from(JSON.stringify(wrong));fs.writeFileSync(packed,bytes);
const manifestPath=path.join(exp.dir,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const row=manifest.files.find(f=>f.path===bundlePath);row.hash=W.sha256(bytes);row.bytes=bytes.length;fs.writeFileSync(manifestPath,JSON.stringify(manifest));
const plan=W.plan(root,'terrain',exp.exportId);assert(!plan.ok);assert(plan.files.some(f=>f.errors.some(e=>e.includes('differs'))));
assert.throws(()=>W.apply(root,'terrain',exp.exportId),/publish refused/);
assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(root,sourcePath),'utf8')),source);
console.log('[HOLM_TERRAIN_PUBLISH] pair, lattice, source drift, staged mismatch and old-export plan/apply refusal passed; live fixture unchanged.');
