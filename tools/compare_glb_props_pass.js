/* Structure proof for a props-pass building (2026-09-28): the new GLB keeps every node of the reference that the pass
 * does not name, with the same parent, custom properties (extras), rest transform and triangles (positions within
 * 0.1 mm), and the same animation channels and keys. Nodes matching <changed> may be rebuilt (other geometry) or taken
 * away; new nodes must match <added>. Materials may differ (the recipe re-dresses what it textures).
 * Prints JSON {ok, kept, changed:{name:[beforeTris, afterTris|null]}, added:{name:tris}, issues}; exit 1 when not ok.
 * Run: node tools/compare_glb_props_pass.js <reference.glb> <new.glb> <changed-regex> <added-regex> */
'use strict';
const fs=require('fs');
function read(f){const b=fs.readFileSync(f),len=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+len).toString());return {j,bin:b.slice(20+len+8)}}
function acc(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 const T={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];const stride=bv.byteStride||n*T.BYTES_PER_ELEMENT;
 const out=[];for(let k=0;k<a.count;k++){const off=(bv.byteOffset||0)+(a.byteOffset||0)+k*stride;out.push(Array.from(new T(g.bin.buffer.slice(g.bin.byteOffset+off,g.bin.byteOffset+off+n*T.BYTES_PER_ELEMENT))))}return out}
function tris(g,mesh){const out=[];mesh.primitives.forEach(p=>{const pos=acc(g,p.attributes.POSITION),idx=p.indices!==undefined?acc(g,p.indices).map(v=>v[0]):pos.map((_,i)=>i);
 for(let i=0;i<idx.length;i+=3)out.push([idx[i],idx[i+1],idx[i+2]].map(k=>pos[k].map(x=>Math.round(x*1e4)).join(',')).sort().join('|'))});return out.sort()}
const triCount=(g,n)=>n.mesh===undefined?0:g.j.meshes[n.mesh].primitives.reduce((a,p)=>a+(p.indices!==undefined?g.j.accessors[p.indices].count:g.j.accessors[p.attributes.POSITION].count)/3,0);
const [fa,fb,ch,ad]=process.argv.slice(2),A=read(fa),B=read(fb),CH=new RegExp(ch||'^$'),AD=new RegExp(ad||'^$'),issues=[];
const parents=g=>{const p={};g.j.nodes.forEach(n=>(n.children||[]).forEach(c=>{p[g.j.nodes[c].name]=n.name}));return p};
const pa=parents(A),pb=parents(B),byB={};B.j.nodes.forEach(n=>{byB[n.name]=n});
const changed={};let kept=0;
A.j.nodes.forEach(n=>{const m=byB[n.name];
 if(CH.test(n.name)){changed[n.name]=[triCount(A,n),m?triCount(B,m):null];return}
 if(!m){issues.push('missing: '+n.name);return}
 if((pa[n.name]||null)!==(pb[n.name]||null))issues.push('parent differs: '+n.name);
 if(JSON.stringify(n.extras||null)!==JSON.stringify(m.extras||null))issues.push('extras differ: '+n.name);
 ['translation','rotation','scale'].forEach(k=>{const x=n[k]||null,y=m[k]||null;if(JSON.stringify(x&&x.map(v=>+v.toFixed(5)))!==JSON.stringify(y&&y.map(v=>+v.toFixed(5))))issues.push(k+' differs: '+n.name)});
 if((n.mesh===undefined)!==(m.mesh===undefined))issues.push('mesh presence differs: '+n.name);
 else if(n.mesh!==undefined){const ta=tris(A,A.j.meshes[n.mesh]),tb=tris(B,B.j.meshes[m.mesh]);if(ta.length!==tb.length||ta.some((t,k)=>t!==tb[k]))issues.push('geometry differs: '+n.name+' ('+ta.length+' vs '+tb.length+' tris)')}
 kept++});
const added={};B.j.nodes.filter(n=>!A.j.nodes.some(x=>x.name===n.name)).forEach(n=>{if(AD.test(n.name))added[n.name]=triCount(B,n);else issues.push('unexpected new node: '+n.name)});
const key=(g,a)=>a.channels.map(chn=>{const s=a.samplers[chn.sampler];return g.j.nodes[chn.target.node].name+'.'+chn.target.path+':'+acc(g,s.input).map(v=>v.map(x=>x.toFixed(4)).join()).join(';')+'='+acc(g,s.output).map(v=>v.map(x=>x.toFixed(4)).join()).join(';')}).sort().join('\n');
const anA=(A.j.animations||[]).map(a=>a.name+'\n'+key(A,a)).sort(),anB=(B.j.animations||[]).map(a=>a.name+'\n'+key(B,a)).sort();
if(anA.length!==anB.length||anA.some((x,i)=>x!==anB[i]))issues.push('animations differ');
const res={ok:!issues.length,reference:fa,candidate:fb,referenceNodes:A.j.nodes.length,kept,changed,added,issues:issues.slice(0,40)};
console.log(JSON.stringify(res));process.exit(res.ok?0:1);
