'use strict';
// Read-only fixture tests: never alter the export or install files into live assets.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const Loader=require('../src/holm_arrival_export_loader');
const stable=require('./studio_workspace').stableJson;
const root=path.resolve(__dirname,'../.studio-workspaces/holm-arrival-package-v1/exports/e30d49f5b9bdafb4');
assert(fs.existsSync(path.join(root,'manifest.json')),'required actual export missing');
const original=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const originalFiles=Object.fromEntries(original.files.map(r=>[r.path,fs.readFileSync(path.join(root,'files',r.path))]));
const base='http://127.0.0.1:8777/.studio-workspaces/holm-arrival-package-v1/exports/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){return {manifest:structuredClone(original),files:{...originalFiles},calls:[]}}
function identity(f){const m=f.manifest;m.exportId=sha(stable({schema:m.schema,version:m.version,workspaceId:m.workspaceId,files:m.files})).slice(0,16)}
function edit(f,p,fn){const doc=JSON.parse(f.files[p]);fn(doc);const b=Buffer.from(JSON.stringify(doc));f.files[p]=b;const r=f.manifest.files.find(r=>r.path===p);r.bytes=b.length;r.hash=sha(b);identity(f)}
function options(f){return {baseUrl:base,exportId:f.manifest.exportId,subtle:crypto.webcrypto.subtle,fetch:async(url,opt)=>{
 f.calls.push(url);assert.equal(opt.redirect,'error');assert.equal(opt.cache,'no-store');
 const prefix=base+f.manifest.exportId+'/';assert(url.startsWith(prefix),'outside export fetch');const rel=url.slice(prefix.length);
 const b=rel==='manifest.json'?Buffer.from(JSON.stringify(f.manifest)):f.files[rel.slice(6)];
 return {ok:!!b,url,redirected:false,arrayBuffer:async()=>Uint8Array.from(b).buffer};
}}}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('ok '+name)}
async function rejects(f,re){await assert.rejects(Loader.load(options(f)),re)}
(async()=>{
 await test('actual ten-file export identity and reconstruction',async()=>{const f=fixture(),r=await Loader.load(options(f));assert.equal(f.calls.length,11);assert.equal(Object.keys(r.files).length,10);assert.equal(Object.keys(r.documents).length,5);assert.equal(r.package.spawn.nodeId,'exterior:61,118');assert.equal(r.package.boundary.readyForWholeProviderReplacement,false);for(const [p,b] of Object.entries(r.files)){assert(b instanceof Uint8Array);assert(!Buffer.isBuffer(b));assert.equal(b.byteOffset,0);assert.equal(b.byteLength,b.buffer.byteLength);assert.equal(sha(b),sha(originalFiles[p]))}});
 await test('tampered equal-length model bytes',async()=>{const f=fixture(),p=f.manifest.files.find(r=>r.path.endsWith('.glb')).path;f.files[p]=Buffer.from(f.files[p]);f.files[p][50]^=1;await rejects(f,/SHA256 mismatch/)});
 await test('truncated model bytes',async()=>{const f=fixture(),p=f.manifest.files[0].path;f.files[p]=f.files[p].subarray(1);await rejects(f,/byte length mismatch/)});
 await test('manifest identity cannot be changed silently',async()=>{const f=fixture();f.manifest.files[0].baseHash='a'.repeat(64);await rejects(f,/export hash mismatch/)});
 await test('changed-only export rejects without fallback reads',async()=>{const f=fixture();f.manifest.files.pop();identity(f);await rejects(f,/ten-file/);assert.equal(f.calls.length,1)});
 for(const bad of ['../outside.glb','assets/../outside.glb','assets/%2e%2e/evil.glb','https://other.test/evil.glb','assets\\evil.glb','assets/foo./evil.glb','assets/CON.glb'])await test('reject path '+bad,async()=>{const f=fixture();f.manifest.files[0].path=bad;identity(f);await rejects(f,/unsafe manifest/);assert.equal(f.calls.length,1)});
 await test('case aliases reject before asset fetch',async()=>{const f=fixture();f.manifest.files[1].path=f.manifest.files[0].path.toUpperCase();identity(f);await rejects(f,/case-aliased/);assert.equal(f.calls.length,1)});
 const pp=original.files.find(r=>r.path.endsWith('.package.json')).path;
 await test('rehash cannot authorize altered compiled routes',async()=>{const f=fixture();edit(f,pp,p=>p.navigation.requiredRoutes[0].nodeIds.pop());await rejects(f,/source reconstruction/)});
 await test('package source mismatched hash',async()=>{const f=fixture();edit(f,pp,p=>p.sources[0].sha256='b'.repeat(64));await rejects(f,/source hash mismatch/)});
 await test('external package dependency',async()=>{const f=fixture();edit(f,pp,p=>p.sources[0].path='https://other.test/source.json');await rejects(f,/package source path/)});
 await test('duplicate source schema role',async()=>{const f=fixture(),p=original.files.find(r=>r.path.endsWith('.dock.json')).path;edit(f,p,d=>d.schema='holm-overhaul-arrival-layout-v1');await rejects(f,/duplicate source schema/)});
 await test('wrong workspace identity',async()=>{const f=fixture();f.manifest.workspaceId='different';identity(f);await rejects(f,/manifest identity/)});
 await test('HTTP failure has no fallback',async()=>{const f=fixture(),o=options(f);o.fetch=async()=>({ok:false});await assert.rejects(Loader.load(o),/fetch failed/)});
 await test('network failure propagates',async()=>{const f=fixture(),o=options(f);o.fetch=async()=>{throw Error('offline')};await assert.rejects(Loader.load(o),/offline/)});
 await test('redirect rejected even for injected fetch',async()=>{const f=fixture(),o=options(f),fetcher=o.fetch;o.fetch=async(...a)=>Object.assign(await fetcher(...a),{redirected:true});await assert.rejects(Loader.load(o),/redirected/)});
 await test('pre-aborted load makes no request',async()=>{const f=fixture(),o=options(f),c=new AbortController();c.abort();o.signal=c.signal;await assert.rejects(Loader.load(o),{name:'AbortError'});assert.equal(f.calls.length,0)});
 await test('abort during read cannot return package',async()=>{const f=fixture(),o=options(f),c=new AbortController(),fetcher=o.fetch;o.signal=c.signal;o.fetch=async(...a)=>{const r=await fetcher(...a);c.abort();return r};await assert.rejects(Loader.load(o),{name:'AbortError'});assert.equal(f.calls.length,1)});
 await test('invalid or traversal base rejected',async()=>{for(const url of [base+'../exports/',base+'?x=1',base.replace('http:','file:'),base.replace('/exports/','/working/')]){const o=options(fixture());o.baseUrl=url;await assert.rejects(Loader.load(o))}});
 await test('browser global rejects foreign origin before fetch',async()=>{const sandbox={HolmArrivalPackage:require('../src/holm_arrival_package'),URL,TextDecoder,TextEncoder,Uint8Array,location:{href:'http://127.0.0.1:8777/index.html'}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/holm_arrival_export_loader.js'),'utf8'),sandbox);const o=options(fixture());o.baseUrl=base.replace('127.0.0.1','other.test');await assert.rejects(sandbox.HolmArrivalExportLoader.load(o),/cross-origin/)});
 await test('classic browser scripts load actual export without Buffer or CommonJS',async()=>{const f=fixture(),o=options(f),sandbox={URL,TextDecoder,TextEncoder,Uint8Array,location:{href:'http://127.0.0.1:8777/index.html'},fetch:o.fetch,crypto:crypto.webcrypto};vm.createContext(sandbox);for(const name of ['holm_overhaul_terrain','holm_overhaul_chunks','holm_arrival_navigation','holm_arrival_approach','holm_arrival_dock','holm_arrival_package','holm_arrival_export_loader'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/'+name+'.js'),'utf8'),sandbox);const r=await sandbox.HolmArrivalExportLoader.load({baseUrl:new URL(base).pathname,exportId:f.manifest.exportId});assert.equal(r.package.spawn.nodeId,'exterior:61,118');assert.equal(Object.keys(r.files).length,10);assert.equal(typeof sandbox.Buffer,'undefined')});
 console.log('[HolmArrivalExportLoader] '+passed+'/'+passed+' acceptance ok');
})().catch(e=>{console.error(e);process.exitCode=1});
