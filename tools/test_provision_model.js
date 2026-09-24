'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {validate,measure}=require('./validate_provision_model');
const base=path.resolve(__dirname,'../.studio-workspaces/holm-provision-rack-v1/candidates');
const bytes=fs.readFileSync(path.join(base,'provisions.glb')),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
let checks=0;
function test(name,fn){fn();checks++;console.log('[provision model] '+name+' ok')}
function clone(v){return JSON.parse(JSON.stringify(v))}
function rewrite(edit){const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n)),bin=Buffer.from(bytes.subarray(28+n));edit(g,bin);let json=Buffer.from(JSON.stringify(g));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const head=Buffer.alloc(20),bh=Buffer.alloc(8);head.write('glTF');head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+bin.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);return Buffer.concat([head,json,bh,bin])}
function bad(name,edit,pattern){test(name,()=>{const errors=validate(rewrite(edit),manifest);assert(errors.length,'accepted malformed model');if(pattern)assert.match(errors.join(),pattern)})}
test('actual Blender GLB',()=>assert.deepStrictEqual(validate(bytes,manifest),[]));
console.log('[provision model] measured '+JSON.stringify(measure(bytes)));
test('manifest bounds drift',()=>{const m=clone(manifest);m.localBounds.max[0]+=.2;assert.match(validate(bytes,m).join(),/localBounds/) });
for(const field of ['triangles','materials','primitives'])test('manifest '+field+' drift',()=>{const m=clone(manifest);m[field]++;assert(validate(bytes,m).length)});
test('fresh hash cannot bless altered geometry',()=>{const b=rewrite((g,bin)=>{const a=g.accessors[g.meshes[0].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView];bin.writeFloatLE(50,(v.byteOffset||0)+(a.byteOffset||0))});assert.notStrictEqual(crypto.createHash('sha256').update(b).digest('hex'),crypto.createHash('sha256').update(bytes).digest('hex'));assert.match(validate(b,manifest).join(),/localBounds/)});
bad('nonfinite position',(g,b)=>b.writeFloatLE(NaN,g.bufferViews[g.accessors[0].bufferView].byteOffset||0),/nonfinite/);
bad('accessor extent',(g)=>g.accessors[0].count=999999,/accessor exceeds/);
bad('accessor negative offset',(g)=>g.accessors[0].byteOffset=-4,/accessor/);
bad('bufferView extent',(g)=>g.bufferViews[0].byteLength=g.buffers[0].byteLength+4,/bufferView/);
bad('sparse accessor',(g)=>g.accessors[0].sparse={count:1},/sparse/);
bad('invalid index',(g,b)=>{const a=g.accessors[g.meshes[0].primitives[0].indices];b.writeUInt16LE(65535,g.bufferViews[a.bufferView].byteOffset||0)},/index outside/);
bad('external buffer',(g)=>g.buffers[0].uri='foreign.bin',/embedded/);
bad('unreachable family',(g)=>g.scenes[g.scene].nodes.pop(),/semantic family/);
bad('duplicate family',(g)=>g.nodes.push({name:'ProvisionsRack'}),/duplicate/);
bad('cyclic scene',(g)=>g.nodes[0].children=[0],/cyclic/);
bad('skinning',(g)=>g.nodes[0].skin=0,/skinning/);
bad('morphing',(g)=>g.meshes[0].primitives[0].targets=[],/static triangles/);
bad('line primitive',(g)=>g.meshes[0].primitives[0].mode=1,/static triangles/);
bad('extension',(g)=>g.meshes[0].primitives[0].extensions={KHR_draco_mesh_compression:{}},/extensions/);
bad('unnormalized quaternion',(g)=>g.nodes[0].rotation=[0,0,0,2],/TRS/);
bad('mixed matrix TRS',(g)=>{g.nodes[0].matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];g.nodes[0].translation=[0,0,0]},/matrix and TRS/);
for(const matrix of [false,true])test('hierarchical '+(matrix?'matrix':'TRS')+' transformed bounds',()=>{
 const b=rewrite(g=>{const roots=g.scenes[g.scene].nodes.slice(),node={children:roots};if(matrix)node.matrix=[2,0,0,0,0,3,0,0,0,0,4,0,5,6,7,1];else Object.assign(node,{translation:[5,6,7],scale:[2,3,4]});g.scenes[g.scene].nodes=[g.nodes.length];g.nodes.push(node)});
 const m=clone(manifest);for(const side of ['min','max'])m.localBounds[side]=m.localBounds[side].map((v,i)=>v*[2,3,4][i]+[5,6,7][i]);assert.deepStrictEqual(validate(b,m),[]);
});
test('quaternion rotates bounds',()=>{const b=rewrite(g=>{const children=g.scenes[g.scene].nodes;g.scenes[g.scene].nodes=[g.nodes.length];g.nodes.push({children,rotation:[0,Math.SQRT1_2,0,Math.SQRT1_2]})});const m=clone(manifest),a=m.localBounds.min.slice(),z=m.localBounds.max.slice();m.localBounds={min:[a[2],a[1],-z[0]],max:[z[2],z[1],-a[0]]};assert.deepStrictEqual(validate(b,m),[])});
test('semantic parents with split material meshes',()=>{const b=rewrite(g=>{const meshes=[];for(const node of g.nodes.slice()){const source=g.meshes[node.mesh];delete node.mesh;node.children=[];for(const primitive of source.primitives){node.children.push(g.nodes.length);g.nodes.push({mesh:meshes.length});meshes.push({primitives:[primitive]})}}g.meshes=meshes});assert.deepStrictEqual(validate(b,manifest),[])});
console.log('[provision model] '+checks+'/'+checks+' acceptance checks passed; no visual/runtime acceptance claim.');
