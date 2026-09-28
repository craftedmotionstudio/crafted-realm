/* Per-part triangle audit of the island's building models (props pass, 2026-09-28: "every object in every building
 * reviewed"). Reads the registry (docs/rebuild/holm-overhaul/v2land.json) or the GLBs named on the command line and
 * prints, per mesh node: triangles, primitives (draw calls), material names and the plan-space bounds (x east, y up,
 * z south, building-local metres).
 * Run: node tools/audit_holm_building_parts.js [id|file.glb ...] [--filter regex] [--json out.json] */
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
function read(f){const b=fs.readFileSync(f),len=b.readUInt32LE(12),j=JSON.parse(b.slice(20,20+len).toString());return {j,bin:b.slice(20+len+8)}}
function accessor(g,i){const a=g.j.accessors[i],bv=g.j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
 const T={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array}[a.componentType];const stride=bv.byteStride||n*T.BYTES_PER_ELEMENT;
 const out=[];for(let k=0;k<a.count;k++){const off=(bv.byteOffset||0)+(a.byteOffset||0)+k*stride;const buf=g.bin.buffer.slice(g.bin.byteOffset+off,g.bin.byteOffset+off+n*T.BYTES_PER_ELEMENT);out.push(Array.from(new T(buf)))}return out}
function quat(q,v){const [x,y,z,w]=q,[vx,vy,vz]=v;const ix=w*vx+y*vz-z*vy,iy=w*vy+z*vx-x*vz,iz=w*vz+x*vy-y*vx,iw=-x*vx-y*vy-z*vz;
 return [ix*w+iw*-x+iy*-z-iz*-y,iy*w+iw*-y+iz*-x-ix*-z,iz*w+iw*-z+ix*-y-iy*-x]}
function worldOf(g){const par={};g.j.nodes.forEach((n,i)=>(n.children||[]).forEach(c=>{par[c]=i}));
 const chain=i=>{const out=[];for(let k=i;k!==undefined;k=par[k])out.push(g.j.nodes[k]);return out};
 return (i,p)=>{let v=p;for(const n of chain(i)){if(n.scale)v=v.map((x,k)=>x*n.scale[k]);if(n.rotation)v=quat(n.rotation,v);if(n.translation)v=v.map((x,k)=>x+n.translation[k])}return v}}
function audit(file,filter){const g=read(file),W=worldOf(g),rows=[];
 g.j.nodes.forEach((n,i)=>{if(n.mesh===undefined)return;if(filter&&!filter.test(n.name))return;const m=g.j.meshes[n.mesh];let tris=0;const mats=new Set();
  const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
  m.primitives.forEach(p=>{const pos=accessor(g,p.attributes.POSITION);tris+=(p.indices!==undefined?g.j.accessors[p.indices].count:pos.length)/3;
   if(p.material!==undefined)mats.add(g.j.materials[p.material].name);
   pos.forEach(v=>{const w=W(i,v);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],w[k]);hi[k]=Math.max(hi[k],w[k])}})});
  // glTF (x, y up, z) -> plan (x east, y up, z south): glTF +z is Blender -y = plan +z
  rows.push({name:n.name,tris,prims:m.primitives.length,mats:[...mats],x:[+lo[0].toFixed(2),+hi[0].toFixed(2)],y:[+lo[1].toFixed(2),+hi[1].toFixed(2)],z:[+lo[2].toFixed(2),+hi[2].toFixed(2)]})});
 return rows}
const args=process.argv.slice(2),fi=args.indexOf('--filter'),filter=fi>=0?new RegExp(args.splice(fi,2)[1]):null,ji=args.indexOf('--json'),jsonOut=ji>=0?args.splice(ji,2)[1]:null;
const reg=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/rebuild/holm-overhaul/v2land.json'),'utf8')).buildings;
const targets=(args.length?args:Object.keys(reg)).map(a=>/\.glb$/i.test(a)?{id:path.basename(a),file:path.resolve(a)}:{id:a,file:path.join(ROOT,reg[a].model)});
const all={};
targets.forEach(t=>{const rows=audit(t.file,filter);all[t.id]={file:path.relative(ROOT,t.file).split(path.sep).join('/'),parts:rows,tris:rows.reduce((a,r)=>a+r.tris,0)};
 if(!jsonOut){console.log('== '+t.id+'  '+all[t.id].file+'  '+rows.length+' parts, '+all[t.id].tris+' tris');
  rows.forEach(r=>console.log('  '+String(r.tris).padStart(6)+'  '+String(r.prims).padStart(2)+'  '+r.name.padEnd(46)+' x'+r.x.join('..')+' y'+r.y.join('..')+' z'+r.z.join('..')+'  ['+r.mats.join(', ')+']'))}});
if(jsonOut)fs.writeFileSync(jsonOut,JSON.stringify(all,null,1)+'\n');
