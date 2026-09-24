'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const Validator=require('./studio_arrival_validation'),Package=require('../src/holm_arrival_package');
const root=path.resolve(__dirname,'..'),store=new Map(),clone=v=>JSON.parse(JSON.stringify(v));
function hash(b){return crypto.createHash('sha256').update(b).digest('hex')}
function descriptor(p){const b=fs.readFileSync(path.join(root,p));store.set(p,b);return {path:p,sha256:hash(b)}}
const paths={terrainSource:'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.json',terrain:'.studio-workspaces/holm-overhaul-terrain-v1/working/assets/world/authoring/holm-overhaul.terrain.bundle.json',layout:'docs/rebuild/holm-overhaul/arrival-layout.json',envelopes:'docs/rebuild/holm-overhaul/guide-house-collision-envelopes.json',dock:'docs/rebuild/holm-overhaul/arrival-dock.json'};
const input={provider:{id:'tutors-holm-v2',worldRevision:20260912},sources:{},assets:[
 {id:'guide',ownerId:'holm_guide_hall',model:descriptor('.studio-workspaces/holm-guide-house-overhaul-v1/candidates/holm_guide_house_overhaul_v1.glb'),authoring:descriptor('.studio-workspaces/holm-guide-house-overhaul-v1/candidates/holm_guide_house_overhaul_v1.blend'),parts:['GroundFloor','UpperFloor','StairFlight','GroundFurnishing','DoorNorthHinge','DoorSouthHinge','DoorNorthLeaf','DoorSouthLeaf']},
 {id:'dock',ownerId:'holm_arrival_dock',model:descriptor('.studio-workspaces/holm-arrival-dock-v1/candidates/dock.glb'),authoring:descriptor('.studio-workspaces/holm-arrival-dock-v1/candidates/dock.blend'),parts:['DockDeck']}
]};
for(const k of Object.keys(paths)){input.sources[k]=descriptor(paths[k]);input[k]=JSON.parse(store.get(paths[k]).toString('utf8'))}
const output=Package.compile(input),registered=[...store.keys()],before=JSON.stringify(output),sourceHashes=[...store].map(([p,b])=>[p,hash(b)]);
assert(Validator.handles(output));assert(!Validator.handles({schema:'other'}));assert.deepStrictEqual(Validator.validateShape(output),[]);
assert.deepStrictEqual(Validator.validate(output,p=>store.get(p),registered),[]);
assert.deepStrictEqual(Validator.validate(output,p=>store.get(p),registered),[],'deterministic result');
assert.strictEqual(JSON.stringify(output),before,'package unchanged');assert.deepStrictEqual([...store].map(([p,b])=>[p,hash(b)]),sourceHashes,'buffers unchanged');
assert.strictEqual(output.boundary.sourceBytesVerified,false);assert.strictEqual(output.boundary.assetPartsVerified,false);
let rejected=0;
function bad(edit,pattern){const v=clone(output),data=new Map(store),reg=registered.slice();edit(v,data,reg);const errors=Validator.validate(v,p=>data.get(p),reg);assert(errors.length&&pattern.test(errors.join('\n')),JSON.stringify(errors));rejected++}
bad((v,d,r)=>r.pop(),/unregistered/);
bad(v=>v.sources[0].path='../escape.json',/path/);
bad(v=>v.sources[0].path='C:\\escape.json',/path/);
bad(v=>v.sources[0].path='assets//escape.json',/path/);
bad(v=>v.sources[0].path='assets/foo./escape.json',/path/);
bad(v=>v.sources[1]=clone(v.sources[0]),/duplicate/);
bad(v=>v.sources.pop(),/nine/);
bad(v=>v.sources[0].sha256='f'.repeat(64),/descriptor|SHA256/);
bad(v=>v.navigation.requiredRoutes[0].nodeIds.pop(),/differs/);
bad(v=>v.boundary.sourceBytesVerified=true,/draft flags/);
bad((v,d)=>{const p=input.assets[0].model.path,b=Buffer.from(d.get(p));b[b.length-1]^=1;d.set(p,b)},/SHA256 mismatch/);
function replace(v,d,p,b){d.set(p,b);const sha=hash(b);for(const s of v.sources)if(s.path===p)s.sha256=sha;for(const o of v.objects)for(const k of ['model','authoring'])if(o.asset[k].path===p)o.asset[k].sha256=sha}
bad((v,d)=>replace(v,d,paths.envelopes,Buffer.from(JSON.stringify(input.layout))),/duplicate source role/);
bad((v,d)=>replace(v,d,paths.envelopes,Buffer.from('{"schema":"other"}')),/unknown source schema/);
bad((v,d,r)=>{const p=paths.envelopes,next=p.replace('.json','.txt'),s=v.sources.find(s=>s.path===p);s.path=next;d.set(next,d.get(p));r.push(next)},/missing source role/);
// Recompile after deliberately changed asset bytes: these cases must pass hashes
// and source reconstruction so the actual GLB/.blend checks do the rejection.
function assetBad(which,mutate,pattern){
 const i=clone(input),data=new Map(store),asset=i.assets[0],p=asset[which].path,b=mutate(Buffer.from(data.get(p)));
 data.set(p,b);asset[which].sha256=hash(b);const value=Package.compile(i);
 const errors=Validator.validate(value,p=>data.get(p),registered);assert(errors.length&&pattern.test(errors.join('\n')),JSON.stringify(errors));rejected++;
}
function rewriteGlb(bytes,edit){
 const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n).toString('utf8'));edit(g);
 const json=Buffer.from(JSON.stringify(g)),padding=(4-json.length%4)%4,padded=Buffer.concat([json,Buffer.alloc(padding,32)]),tail=bytes.subarray(20+n),header=Buffer.alloc(20);
 header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+tail.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);return Buffer.concat([header,padded,tail]);
}
assetBad('model',b=>{b.writeUInt32LE(b.length+4,8);return b},/declared length/);
assetBad('model',b=>{b.writeUInt32LE(b.length,12);return b},/chunk length/);
assetBad('model',b=>rewriteGlb(b,g=>g.nodes.find(n=>n.name==='GroundFloor').name='LostFloor'),/semantic part/);
assetBad('model',b=>rewriteGlb(b,g=>g.nodes.push({name:'GroundFloor'})),/duplicate semantic/);
assetBad('model',b=>rewriteGlb(b,g=>{const index=g.nodes.findIndex(n=>n.name==='GroundFloor');for(const n of g.nodes)if(n.children)n.children=n.children.filter(i=>i!==index);for(const s of g.scenes)s.nodes=s.nodes.filter(i=>i!==index)}),/unreachable semantic/);
assetBad('model',b=>rewriteGlb(b,g=>g.animations=g.animations.filter(a=>a.name!=='DoorSouthOpen')),/door animation/);
assetBad('model',b=>rewriteGlb(b,g=>g.animations.find(a=>a.name==='DoorSouthOpen').channels[0].target.node=g.nodes.findIndex(n=>n.name==='DoorNorthHinge')),/semantic hinge/);
assetBad('authoring',b=>{b.write('INVALID');return b},/Blender header/);
console.log('[STUDIO_ARRIVAL_VALIDATION] actual candidates verified; deterministic/nonmutating; '+rejected+' invalid byte/data/registration/semantic cases rejected. No visual, collision or Blender-export correspondence acceptance.');
