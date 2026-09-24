'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {validate,measure}=require('./validate_landscape_model');
const root=path.resolve(__dirname,'..');
const report=JSON.parse(fs.readFileSync(path.join(root,'.studio-workspaces/holm-arrival-landscape-measure-v1/candidates/measured.json'),'utf8'));
assert.strictEqual(report.continuousSweptGuarantee,false,'base guard: sampled Blender report, not a swept guarantee');
assert.strictEqual(Object.keys(report.assets).length,7,'base guard: seven measured GLBs');
const manifest=report.assets.wall,bytes=fs.readFileSync(path.join(root,manifest.file));
function hash(b){return crypto.createHash('sha256').update(b).digest('hex')}
function validateFresh(b,m){return validate(b,{...m,sha256:hash(b)})}
let checks=0;
function test(name,fn){fn();checks++;console.log('[landscape model] '+name+' ok')}
function clone(v){return JSON.parse(JSON.stringify(v))}
function rewrite(edit,source=bytes){const n=source.readUInt32LE(12),g=JSON.parse(source.subarray(20,20+n)),bin=Buffer.from(source.subarray(28+n));edit(g,bin);let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const head=Buffer.alloc(20),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+bin.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([head,json,bh,bin])}
function bad(name,edit,pattern){test(name,()=>{const errors=validateFresh(rewrite(edit),manifest);assert(errors.length,'accepted malformed model');if(pattern)assert.match(errors.join(),pattern)})}
for(const [id,a] of Object.entries(report.assets))test('actual Blender '+id,()=>assert.deepStrictEqual(validate(fs.readFileSync(path.join(root,a.file)),a),[]));
test('hash drift',()=>assert.match(validate(Buffer.concat([bytes,Buffer.from([0])]),manifest).join(),/SHA256/));
test('measurement bounds drift',()=>{const m=clone(manifest);m.restBounds.max[0]-=.2;assert.match(validate(bytes,m).join(),/restBounds/) });
test('measurement triangle drift',()=>{const m=clone(manifest);m.triangles++;assert.match(validate(bytes,m).join(),/triangles/)});
test('sample union cannot exclude rest',()=>{const m=clone(manifest);m.animatedSampledUnion.min[0]+=.2;assert.match(validate(bytes,m).join(),/contain restBounds/)});
test('invalid sample union',()=>{const m=clone(manifest);m.animatedSampledUnion.min[0]=NaN;assert.match(validate(bytes,m).join(),/invalid animatedSampledUnion/)});
test('invented clip rejected',()=>{const m=clone(manifest);m.clips=[{name:'Invented'}];assert.match(validate(bytes,m).join(),/clip names/)});
test('missing actual clip rejected',()=>{const m=clone(report.assets.oak);m.clips=[];assert.match(validate(fs.readFileSync(path.join(root,m.file)),m).join(),/clip names/)});
test('fresh hash cannot bless altered geometry',()=>{const b=rewrite((g,bin)=>{const a=g.accessors[g.meshes[0].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView];bin.writeFloatLE(50,(v.byteOffset||0)+(a.byteOffset||0))});assert.notStrictEqual(hash(b),hash(bytes));assert.match(validateFresh(b,manifest).join(),/restBounds/)});
bad('nonfinite position',(g,b)=>b.writeFloatLE(NaN,g.bufferViews[g.accessors[0].bufferView].byteOffset||0),/nonfinite/);
bad('accessor extent',(g)=>g.accessors[0].count=999999,/accessor exceeds/);
bad('accessor negative offset',(g)=>g.accessors[0].byteOffset=-4,/accessor/);
bad('bufferView extent',(g)=>g.bufferViews[0].byteLength=g.buffers[0].byteLength+4,/bufferView/);
bad('sparse accessor',(g)=>g.accessors[0].sparse={count:1},/sparse/);
bad('invalid index',(g,b)=>{const a=g.accessors[g.meshes[0].primitives[0].indices];b.writeUInt16LE(65535,g.bufferViews[a.bufferView].byteOffset||0)},/index outside/);
bad('external buffer',(g)=>g.buffers[0].uri='foreign.bin',/embedded/);
bad('unreachable scene',(g)=>g.scenes[g.scene].nodes.pop(),/empty scene|unreachable/);
bad('unreachable node',(g)=>g.nodes.push({name:'Unreachable'}),/unreachable/);
bad('cyclic scene',(g)=>g.nodes[0].children=[0],/cyclic/);
bad('skinning',(g)=>g.nodes[0].skin=0,/skinning/);
bad('morphing',(g)=>g.meshes[0].primitives[0].targets=[],/static triangles/);
bad('line primitive',(g)=>g.meshes[0].primitives[0].mode=1,/static triangles/);
bad('extension',(g)=>g.meshes[0].primitives[0].extensions={KHR_draco_mesh_compression:{}},/extensions/);
bad('unnormalized quaternion',(g)=>g.nodes[0].rotation=[0,0,0,2],/TRS/);
bad('mixed matrix TRS',(g)=>{g.nodes[0].matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];g.nodes[0].translation=[0,0,0]},/matrix and TRS/);
for(const matrix of [false,true])test('hierarchical '+(matrix?'matrix':'TRS')+' transformed bounds',()=>{
 const b=rewrite(g=>{const roots=g.scenes[g.scene].nodes.slice(),node={children:roots};if(matrix)node.matrix=[2,0,0,0,0,3,0,0,0,0,4,0,5,6,7,1];else Object.assign(node,{translation:[5,6,7],scale:[2,3,4]});g.scenes[g.scene].nodes=[g.nodes.length];g.nodes.push(node)});
 const m=clone(manifest);for(const side of ['min','max'])m.restBounds[side]=m.restBounds[side].map((v,i)=>v*[2,3,4][i]+[5,6,7][i]);m.animatedSampledUnion=clone(m.restBounds);assert.deepStrictEqual(validateFresh(b,m),[]);
});
test('quaternion rotates bounds',()=>{const b=rewrite(g=>{const children=g.scenes[g.scene].nodes;g.scenes[g.scene].nodes=[g.nodes.length];g.nodes.push({children,rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2]})});const m=clone(manifest),a=m.restBounds.min.slice(),z=m.restBounds.max.slice();m.restBounds={min:[a[2],a[1],-z[0]],max:[z[2],z[1],-a[0]]};m.animatedSampledUnion=clone(m.restBounds);assert.deepStrictEqual(validateFresh(b,m),[])});
test('duplicated instance contributes triangles and bounds',()=>{const b=rewrite(g=>{const source=g.scenes[g.scene].nodes[0];g.scenes[g.scene].nodes.push(source)});assert.match(validateFresh(b,manifest).join(),/multiply parented/)});
test('read does not mutate report or bytes',()=>{const before=JSON.stringify(report),h=hash(bytes);measure(bytes);assert.strictEqual(JSON.stringify(report),before);assert.strictEqual(hash(bytes),h)});
function badAnimation(name,edit,pattern){test(name,()=>{const m=report.assets.oak,b=rewrite(edit,fs.readFileSync(path.join(root,m.file)));assert.match(validateFresh(b,m).join(),pattern)})}
badAnimation('animation target outside scene',g=>g.animations[0].channels[0].target.node=9999,/target/);
badAnimation('duplicate animation channel',g=>g.animations[0].channels.push(clone(g.animations[0].channels[0])),/duplicate animation channel/);
badAnimation('renamed actual animation',g=>g.animations[0].name='NotBreeze',/clip names/);
badAnimation('nonfinite animation output',(g,b)=>{const a=g.accessors[g.animations[0].samplers[0].output],v=g.bufferViews[a.bufferView];b.writeFloatLE(Infinity,(v.byteOffset||0)+(a.byteOffset||0))},/nonfinite animation/);
badAnimation('nonmonotonic animation time',(g,b)=>{const a=g.accessors[g.animations[0].samplers[0].input],v=g.bufferViews[a.bufferView];b.writeFloatLE(-1,(v.byteOffset||0)+(a.byteOffset||0))},/animation times/);
badAnimation('invalid animation interpolation',g=>g.animations[0].samplers[0].interpolation='CURVE',/interpolation/);
console.log('[landscape model] '+checks+'/'+checks+' acceptance checks passed; no visual/runtime acceptance claim.');
