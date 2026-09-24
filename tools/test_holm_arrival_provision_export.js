'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const Loader=require('../src/holm_arrival_export_loader'),Validator=require('./studio_arrival_validation'),Package=require('../src/holm_arrival_package');
const id='a0c7148866b7787c',root=path.resolve(__dirname,'../.studio-workspaces/holm-arrival-package-v2/exports',id);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const files=new Map(manifest.files.map(r=>[r.path,fs.readFileSync(path.join(root,'files',r.path))]));
const packagePath=[...files.keys()].find(p=>p.endsWith('holm-arrival.package.json'));
const pkg=JSON.parse(files.get(packagePath));
assert.deepStrictEqual(Validator.validate(pkg,p=>files.get(p),[...files.keys()]),[]);
const roles={'holm-overhaul-terrain-source-v1':'terrainSource','holm-overhaul-terrain-bundle-v1':'terrain','holm-overhaul-arrival-layout-v1':'layout','holm-guide-house-collision-envelopes-v1':'envelopes','holm-arrival-dock-study-v1':'dock','holm-arrival-provisions-placement-v1':'provisionsPlacement','crafted-realms-local-prop-v1':'provisionsManifest'};
const altered=new Map(files),model=pkg.objects.find(o=>o.asset.id==='provisions').asset.model.path;
const bytes=Buffer.from(files.get(model)),g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),bin=20+bytes.readUInt32LE(12)+8;
const a=g.accessors[g.meshes[0].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView],offset=bin+(v.byteOffset||0)+(a.byteOffset||0);
bytes.writeFloatLE(20,offset);altered.set(model,bytes);
const input={provider:pkg.provider,sources:{},assets:JSON.parse(JSON.stringify(pkg.objects.map(o=>o.asset)))};
for(const s of pkg.sources){const d={path:s.path,sha256:crypto.createHash('sha256').update(altered.get(s.path)).digest('hex')};if(s.path.endsWith('.json')){const doc=JSON.parse(altered.get(s.path)),role=roles[doc.schema];input[role]=doc;input.sources[role]=d}for(const asset of input.assets)for(const field of ['model','authoring'])if(asset[field].path===s.path)asset[field]=d}
const rebuilt=Package.compile(input);
assert(Validator.validate(rebuilt,p=>altered.get(p),[...altered.keys()]).some(e=>/measured localBounds/.test(e)),'fresh hashes and recompiled routes must not bless geometry/bounds drift');
(async()=>{
 const base='http://127.0.0.1:8777/.studio-workspaces/holm-arrival-package-v2/exports/';
 const loaded=await Loader.load({baseUrl:base,exportId:id,subtle:crypto.webcrypto.subtle,fetch:async url=>{assert(url.startsWith(base+id+'/'));const b=fs.readFileSync(path.join(root,url.slice((base+id+'/').length)));return {ok:true,url,redirected:false,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}});
 assert.equal(loaded.package.objects.length,3);assert.equal(Object.keys(loaded.files).length,14);
 assert(loaded.documents.envelopes.blockers.some(b=>b.id==='provisions'));
 assert(loaded.documents.layout.groundServices.some(s=>s.id==='provisions'));
 assert(loaded.package.navigation.interactions.some(s=>s.kind==='holm_provisions'&&s.stanceNodeIds[0]==='ground:68,96'));
 console.log('[ARRIVAL_PROVISION_EXPORT] actual fourteen-file loader and byte gate pass; augmented runtime docs agree with service stance; hash-consistent altered geometry rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});
