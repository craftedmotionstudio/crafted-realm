'use strict';
// Static GLB byte evidence, not art acceptance or Blender/export correspondence.
const PARTS=['ProvisionsRack','ProvisionHatchet','ProvisionNet','ProvisionTinderbox'];
const EPS=1e-4;
function need(ok,msg){if(!ok)throw Error(msg)}
function uint(v){return Number.isSafeInteger(v)&&v>=0}
function vec(v,n){return Array.isArray(v)&&v.length===n&&v.every(Number.isFinite)}
function identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function multiply(a,b){const r=Array(16).fill(0);for(let c=0;c<4;c++)for(let j=0;j<4;j++)for(let k=0;k<4;k++)r[c*4+j]+=a[k*4+j]*b[c*4+k];return r}
function transform(n){
 if(n.matrix!==undefined){need(!['translation','rotation','scale'].some(k=>n[k]!==undefined),'matrix and TRS cannot coexist');need(vec(n.matrix,16)&&n.matrix[3]===0&&n.matrix[7]===0&&n.matrix[11]===0&&n.matrix[15]===1,'invalid affine matrix');return n.matrix}
 const t=n.translation||[0,0,0],q=n.rotation||[0,0,0,1],s=n.scale||[1,1,1];
 need(vec(t,3)&&vec(q,4)&&vec(s,3)&&Math.abs(q.reduce((a,v)=>a+v*v,0)-1)<1e-5,'invalid TRS');
 const [x,y,z,w]=q,xx=x*x,yy=y*y,zz=z*z;
 return [(1-2*(yy+zz))*s[0],2*(x*y+z*w)*s[0],2*(x*z-y*w)*s[0],0,2*(x*y-z*w)*s[1],(1-2*(xx+zz))*s[1],2*(y*z+x*w)*s[1],0,2*(x*z+y*w)*s[2],2*(y*z-x*w)*s[2],(1-2*(xx+yy))*s[2],0,...t,1];
}
function measure(bytes){
 need(Buffer.isBuffer(bytes)&&bytes.length>=28&&bytes.toString('ascii',0,4)==='glTF'&&bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'invalid GLB header');
 const chunks=[];let off=12;
 while(off<bytes.length){need(off+8<=bytes.length,'truncated chunk');const len=bytes.readUInt32LE(off),type=bytes.readUInt32LE(off+4);off+=8;need(len%4===0&&off+len<=bytes.length,'invalid chunk extent');chunks.push({type,data:bytes.subarray(off,off+len)});off+=len}
 need(chunks.length===2&&chunks[0].type===0x4e4f534a&&chunks[1].type===0x004e4942,'expected JSON and BIN only');
 const g=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(chunks[0].data)),bin=chunks[1].data;
 need(g.asset&&g.asset.version==='2.0','unsupported glTF version');
 function noExtensions(o){if(o&&typeof o==='object'){need(!o.extensions,'extensions unsupported');for(const v of Object.values(o))noExtensions(v)}}noExtensions(g);
 need(!(g.extensionsUsed||[]).length&&!(g.extensionsRequired||[]).length&&!(g.skins||[]).length&&!(g.animations||[]).length,'static unextended asset required');
 need(Array.isArray(g.buffers)&&g.buffers.length===1&&g.buffers[0].uri===undefined&&uint(g.buffers[0].byteLength)&&g.buffers[0].byteLength>0&&bin.length-g.buffers[0].byteLength>=0&&bin.length-g.buffers[0].byteLength<=3,'invalid embedded buffer');
 const views=g.bufferViews,accessors=g.accessors;
 need(Array.isArray(views)&&Array.isArray(accessors),'missing views/accessors');
 for(const v of views){need(v&&v.buffer===0&&uint(v.byteOffset??0)&&uint(v.byteLength)&&v.byteLength>0&&(v.byteOffset??0)+v.byteLength<=g.buffers[0].byteLength,'invalid bufferView bounds');if(v.byteStride!==undefined)need(uint(v.byteStride)&&v.byteStride>=4&&v.byteStride<=252&&v.byteStride%4===0,'invalid stride')}
 const sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},types={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
 const readers={5120:'readInt8',5121:'readUInt8',5122:'readInt16LE',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'};
 const records=accessors.map(a=>{
  need(a&&a.sparse===undefined&&uint(a.bufferView)&&views[a.bufferView],'sparse/missing accessor view unsupported');
  const v=views[a.bufferView],size=sizes[a.componentType],components=types[a.type],offset=a.byteOffset??0;
  need(size&&components&&uint(a.count)&&a.count>0&&uint(offset)&&offset%size===0&&((v.byteOffset??0)+offset)%size===0,'invalid accessor format/alignment');
  need(a.normalized===undefined||typeof a.normalized==='boolean','invalid normalized flag');
  const stride=v.byteStride??size*components;
  need(stride>=size*components&&stride%size===0&&offset+(a.count-1)*stride+size*components<=v.byteLength,'accessor exceeds bufferView');
  return {a,v,size,components,stride,start:(v.byteOffset??0)+offset,read:(i,k)=>bin[readers[a.componentType]]((v.byteOffset??0)+offset+i*stride+k*size)};
 });
 function record(i){need(uint(i)&&records[i],'invalid accessor index');return records[i]}
 need(Array.isArray(g.nodes)&&Array.isArray(g.scenes)&&uint(g.scene)&&g.scenes[g.scene]&&Array.isArray(g.scenes[g.scene].nodes)&&Array.isArray(g.meshes)&&Array.isArray(g.materials),'missing default scene/meshes/materials');
 const names=new Map();for(const p of PARTS){const found=g.nodes.map((n,i)=>n.name===p?i:-1).filter(i=>i>=0);need(found.length===1,'missing/duplicate semantic family '+p);names.set(found[0],p)}
 const seen=new Set(),families=new Map(),usedMeshes=new Set(),usedMaterials=new Set();let triangles=0,primitives=0,vertices=0;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 function visit(i,parent,family){
  need(uint(i)&&g.nodes[i]&&!seen.has(i),'invalid, cyclic or multiply parented node');seen.add(i);
  const n=g.nodes[i];need(n.skin===undefined&&n.weights===undefined,'skinning/morph weights unsupported');
  if(names.has(i)){need(!family,'nested semantic families unsupported');family=names.get(i);families.set(family,0)}
  const matrix=multiply(parent,transform(n));need(matrix.every(Number.isFinite),'nonfinite composed transform');
  if(n.mesh!==undefined){
   need(family&&uint(n.mesh)&&g.meshes[n.mesh],'mesh outside semantic families or invalid mesh');usedMeshes.add(n.mesh);
   const m=g.meshes[n.mesh];need(m.weights===undefined&&Array.isArray(m.primitives)&&m.primitives.length,'invalid static mesh');
   for(const p of m.primitives){
    need((p.mode??4)===4&&p.targets===undefined&&p.attributes&&p.attributes.POSITION!==undefined,'only static triangles supported');
    const pos=record(p.attributes.POSITION);need(pos.a.type==='VEC3'&&pos.a.componentType===5126&&!pos.a.normalized,'POSITION must be unnormalized float VEC3');
    for(const id of Object.values(p.attributes)){const r=record(id);need(r.a.count===pos.a.count,'attribute count mismatch');for(let j=0;j<r.a.count;j++)for(let k=0;k<r.components;k++)need(Number.isFinite(r.read(j,k)),'nonfinite vertex attribute')}
    let count=pos.a.count;
    if(p.indices!==undefined){const r=record(p.indices);need(r.a.type==='SCALAR'&&[5121,5123,5125].includes(r.a.componentType)&&!r.a.normalized&&r.v.byteStride===undefined,'invalid index accessor');count=r.a.count;for(let j=0;j<count;j++)need(r.read(j,0)<pos.a.count,'index outside POSITION accessor')}
    need(count%3===0,'triangle count not divisible by three');
    need(uint(p.material)&&g.materials[p.material],'invalid material');usedMaterials.add(p.material);triangles+=count/3;primitives++;families.set(family,families.get(family)+1);
    for(let j=0;j<pos.a.count;j++){const x=pos.read(j,0),y=pos.read(j,1),z=pos.read(j,2);for(let k=0;k<3;k++){const v=matrix[k]*x+matrix[4+k]*y+matrix[8+k]*z+matrix[12+k];need(Number.isFinite(v),'nonfinite transformed POSITION');min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v)}vertices++}
   }
  }
  need(n.children===undefined||Array.isArray(n.children),'invalid children');for(const child of n.children||[])visit(child,matrix,family);
 }
 for(const i of g.scenes[g.scene].nodes)visit(i,identity(),null);
 for(const p of PARTS)need(families.get(p)>0,'unreachable or empty semantic family '+p);
 need(usedMeshes.size===g.meshes.length&&usedMaterials.size===g.materials.length,'unused meshes/materials prevent manifest count evidence');
 return {localBounds:{min,max},triangles,primitives,materials:g.materials.length,vertices,semanticInteractionMeshes:PARTS.slice()};
}
function validate(bytes,manifest){try{
 const m=manifest;need(m&&m.localBounds&&vec(m.localBounds.min,3)&&vec(m.localBounds.max,3),'invalid manifest bounds');
 for(const k of ['semanticInteractionMeshes','meshFamilies'])need(Array.isArray(m[k])&&m[k].length===4&&m[k].slice().sort().join('|')===PARTS.slice().sort().join('|'),'invalid manifest '+k);
 need(Array.isArray(m.animationNames)&&m.animationNames.length===0,'manifest must declare static model');
 const measured=measure(bytes);
 for(const k of ['triangles','primitives','materials'])need(m[k]===measured[k],'measured '+k+' differs from manifest');
 for(const side of ['min','max'])for(let k=0;k<3;k++)need(Math.abs(m.localBounds[side][k]-measured.localBounds[side][k])<=EPS,'measured localBounds.'+side+'['+k+'] differs from manifest');
 return [];
}catch(e){return ['provision model: '+e.message]}}
module.exports={validate,measure};
