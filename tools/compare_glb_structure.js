/* Structural diff of two GLBs (world look pass 2026-09-25): proves a textured candidate kept the source's node names,
 * hierarchy, custom properties (extras), animations and per-node geometry (vertex positions within 0.1 mm), while
 * listing what changed (materials, textures, UVs). Run: node tools/compare_glb_structure.js <a.glb> <b.glb> */
'use strict';
const fs=require('fs');
function read(f){const b=fs.readFileSync(f),len=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+len).toString());const binStart=20+len+8;return {j,bin:b.slice(binStart)}}
function acc(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 const T={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];const stride=bv.byteStride||n*T.BYTES_PER_ELEMENT;
 const out=[];for(let k=0;k<a.count;k++){const off=(bv.byteOffset||0)+(a.byteOffset||0)+k*stride;const v=new T(g.bin.buffer.slice(g.bin.byteOffset+off,g.bin.byteOffset+off+n*T.BYTES_PER_ELEMENT));out.push(Array.from(v))}return out}
function tris(g,mesh){const out=[];mesh.primitives.forEach(p=>{const pos=acc(g,p.attributes.POSITION),idx=p.indices!==undefined?acc(g,p.indices).map(v=>v[0]):pos.map((_,i)=>i);
 for(let i=0;i<idx.length;i+=3)out.push([idx[i],idx[i+1],idx[i+2]].map(k=>pos[k].map(x=>Math.round(x*1e4)).join(',')).sort().join('|'))});return out.sort()}
const A=read(process.argv[2]),B=read(process.argv[3]),issues=[];
const names=g=>g.j.nodes.map(n=>n.name);
if(JSON.stringify(names(A))!==JSON.stringify(names(B)))issues.push('node names/order differ');
A.j.nodes.forEach((n,i)=>{const m=B.j.nodes[i];if(!m)return;
 if(JSON.stringify(n.children||[])!==JSON.stringify(m.children||[]))issues.push('children differ: '+n.name);
 if(JSON.stringify(n.extras||null)!==JSON.stringify(m.extras||null))issues.push('extras differ: '+n.name);
 ['translation','rotation','scale'].forEach(k=>{if(JSON.stringify(n[k]||null)!==JSON.stringify(m[k]||null))issues.push(k+' differs: '+n.name)});
 if((n.mesh===undefined)!==(m.mesh===undefined))issues.push('mesh presence differs: '+n.name);
 else if(n.mesh!==undefined){const ta=tris(A,A.j.meshes[n.mesh]),tb=tris(B,B.j.meshes[m.mesh]);if(ta.length!==tb.length||ta.some((t,k)=>t!==tb[k]))issues.push('geometry differs: '+n.name+' ('+ta.length+' vs '+tb.length+' tris)')}});
const an=g=>(g.j.animations||[]).map(a=>a.name+':'+a.channels.length).join(',');
if(an(A)!==an(B))issues.push('animations differ: '+an(A)+' vs '+an(B));
else (A.j.animations||[]).forEach((a,ai)=>{const b=B.j.animations[ai];
 // every channel: same target node (by name) and path, same key times and values (within 1e-4)
 const key=(g,an,ch)=>g.j.nodes[ch.target.node].name+'.'+ch.target.path;
 const chA=a.channels.map(c=>[key(A,a,c),c]).sort((p,q)=>p[0]<q[0]?-1:1),chB=b.channels.map(c=>[key(B,b,c),c]).sort((p,q)=>p[0]<q[0]?-1:1);
 chA.forEach(([k,c],i)=>{const [k2,d]=chB[i]||[];if(k!==k2){issues.push('animation '+a.name+' channel '+k+' vs '+k2);return}
  const sa=a.samplers[c.sampler],sb=b.samplers[d.sampler];if((sa.interpolation||'LINEAR')!==(sb.interpolation||'LINEAR'))issues.push('animation '+a.name+' '+k+' interpolation');
  const ia=acc(A,sa.input).flat(),ib=acc(B,sb.input).flat(),oa=acc(A,sa.output).flat(),ob=acc(B,sb.output).flat();
  const same=(x,y)=>x.length===y.length&&x.every((v,j)=>Math.abs(v-y[j])<1e-4);
  if(!same(ia,ib)||!same(oa,ob))issues.push('animation '+a.name+' '+k+' keys differ ('+ia.length+' vs '+ib.length+')')})});
const count=g=>({nodes:g.j.nodes.length,meshes:g.j.meshes.length,primitives:g.j.meshes.reduce((a,m)=>a+m.primitives.length,0),materials:(g.j.materials||[]).length,images:(g.j.images||[]).length,textures:(g.j.textures||[]).length,
 primsWithUV:g.j.meshes.reduce((a,m)=>a+m.primitives.filter(p=>p.attributes.TEXCOORD_0!==undefined).length,0),
 texturedMaterials:(g.j.materials||[]).filter(m=>m.pbrMetallicRoughness&&m.pbrMetallicRoughness.baseColorTexture).length});
console.log(JSON.stringify({a:count(A),b:count(B),identicalStructureAndGeometry:issues.length===0,issues:issues.slice(0,20)},null,1));
process.exit(issues.length?1:0);
