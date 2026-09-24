'use strict';
// Actual rest-pose GLB byte evidence. Does not evaluate animation envelopes or prove art quality.
const crypto=require('crypto');
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
 need(!(g.extensionsUsed||[]).length&&!(g.extensionsRequired||[]).length&&!(g.skins||[]).length,'unskinned unextended asset required');
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
 const seen=new Set(),usedMeshes=new Set(),usedMaterials=new Set();let triangles=0,primitives=0,vertices=0;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 function visit(i,parent){
  need(uint(i)&&g.nodes[i]&&!seen.has(i),'invalid, cyclic or multiply parented node');seen.add(i);
  const n=g.nodes[i];need(n.skin===undefined&&n.weights===undefined,'skinning/morph weights unsupported');
  const matrix=multiply(parent,transform(n));need(matrix.every(Number.isFinite),'nonfinite composed transform');
  if(n.mesh!==undefined){
   need(uint(n.mesh)&&g.meshes[n.mesh],'invalid mesh');usedMeshes.add(n.mesh);
   const m=g.meshes[n.mesh];need(m.weights===undefined&&Array.isArray(m.primitives)&&m.primitives.length,'invalid static mesh');
   for(const p of m.primitives){
    need((p.mode??4)===4&&p.targets===undefined&&p.attributes&&p.attributes.POSITION!==undefined,'only static triangles supported');
    const pos=record(p.attributes.POSITION);need(pos.a.type==='VEC3'&&pos.a.componentType===5126&&!pos.a.normalized,'POSITION must be unnormalized float VEC3');
    for(const id of Object.values(p.attributes)){const r=record(id);need(r.a.count===pos.a.count,'attribute count mismatch');for(let j=0;j<r.a.count;j++)for(let k=0;k<r.components;k++)need(Number.isFinite(r.read(j,k)),'nonfinite vertex attribute')}
    let count=pos.a.count;
    if(p.indices!==undefined){const r=record(p.indices);need(r.a.type==='SCALAR'&&[5121,5123,5125].includes(r.a.componentType)&&!r.a.normalized&&r.v.byteStride===undefined,'invalid index accessor');count=r.a.count;for(let j=0;j<count;j++)need(r.read(j,0)<pos.a.count,'index outside POSITION accessor')}
    need(count%3===0,'triangle count not divisible by three');
    need(uint(p.material)&&g.materials[p.material],'invalid material');usedMaterials.add(p.material);triangles+=count/3;primitives++;
    for(let j=0;j<pos.a.count;j++){const x=pos.read(j,0),y=pos.read(j,1),z=pos.read(j,2);for(let k=0;k<3;k++){const v=matrix[k]*x+matrix[4+k]*y+matrix[8+k]*z+matrix[12+k];need(Number.isFinite(v),'nonfinite transformed POSITION');min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v)}vertices++}
   }
  }
  need(n.children===undefined||Array.isArray(n.children),'invalid children');for(const child of n.children||[])visit(child,matrix);
 }
 for(const i of g.scenes[g.scene].nodes)visit(i,identity());
 need(vertices>0&&seen.size===g.nodes.length,'empty scene or unreachable nodes');
 need(usedMeshes.size===g.meshes.length&&usedMaterials.size===g.materials.length,'unused meshes/materials prevent manifest count evidence');
 const clips=[];
 need(g.animations===undefined||Array.isArray(g.animations),'invalid animations');
 for(const animation of g.animations||[]){
  need(animation&&typeof animation.name==='string'&&animation.name.length>0&&!clips.includes(animation.name),'missing/duplicate animation name');clips.push(animation.name);
  need(Array.isArray(animation.samplers)&&animation.samplers.length>0&&Array.isArray(animation.channels)&&animation.channels.length>0,'empty animation');
  const usedSamplers=new Set(),targets=new Set();
  for(const channel of animation.channels){
   need(channel&&uint(channel.sampler)&&animation.samplers[channel.sampler]&&channel.target&&seen.has(channel.target.node)&&['translation','rotation','scale'].includes(channel.target.path),'invalid animation target/sampler');
   need(g.nodes[channel.target.node].matrix===undefined,'animation cannot target matrix node');
   const target=channel.target.node+':'+channel.target.path;need(!targets.has(target),'duplicate animation channel');targets.add(target);usedSamplers.add(channel.sampler);
   const sampler=animation.samplers[channel.sampler],input=record(sampler.input),output=record(sampler.output),interpolation=sampler.interpolation??'LINEAR';
   need(['LINEAR','STEP','CUBICSPLINE'].includes(interpolation),'unsupported animation interpolation');
   need(input.a.type==='SCALAR'&&input.a.componentType===5126&&!input.a.normalized&&input.v.byteStride===undefined,'invalid animation time accessor');
   need(output.a.type===(channel.target.path==='rotation'?'VEC4':'VEC3')&&output.a.componentType===5126&&!output.a.normalized&&output.v.byteStride===undefined&&output.a.count===input.a.count*(interpolation==='CUBICSPLINE'?3:1),'invalid animation output');
   let previous=-Infinity;
   for(let j=0;j<input.a.count;j++){const time=input.read(j,0);need(Number.isFinite(time)&&time>=0&&time>previous,'invalid animation times');previous=time}
   for(let j=0;j<output.a.count;j++)for(let k=0;k<output.components;k++)need(Number.isFinite(output.read(j,k)),'nonfinite animation output');
  }
  need(usedSamplers.size===animation.samplers.length,'unused animation sampler');
 }
 return {restBounds:{min,max},triangles,primitives,materials:g.materials.length,vertices,clips};
}
function validate(bytes,measurementAsset){try{
 const m=measurementAsset;
 need(m&&typeof m==='object','missing measurement asset');
 need(Buffer.isBuffer(bytes),'GLB bytes must be a Buffer');
 need(typeof m.sha256==='string'&&/^[a-f0-9]{64}$/.test(m.sha256)&&crypto.createHash('sha256').update(bytes).digest('hex')===m.sha256,'SHA256 differs from measurement');
 for(const key of ['restBounds','animatedSampledUnion']){
  const b=m[key];need(b&&vec(b.min,3)&&vec(b.max,3)&&b.min.every((v,i)=>v<=b.max[i]),'invalid '+key);
 }
 for(let k=0;k<3;k++)need(m.animatedSampledUnion.min[k]<=m.restBounds.min[k]+EPS&&m.animatedSampledUnion.max[k]>=m.restBounds.max[k]-EPS,'animatedSampledUnion must contain restBounds');
 const measured=measure(bytes);
 need(m.triangles===measured.triangles,'measured triangles differs from measurement');
 for(const side of ['min','max'])for(let k=0;k<3;k++)need(Math.abs(m.restBounds[side][k]-measured.restBounds[side][k])<=EPS,'measured restBounds.'+side+'['+k+'] differs from measurement');
 need(Array.isArray(m.clips)&&m.clips.every(c=>c&&typeof c.name==='string')&&new Set(m.clips.map(c=>c.name)).size===m.clips.length,'invalid measurement clips');
 need(JSON.stringify(m.clips.map(c=>c.name).sort())===JSON.stringify(measured.clips.slice().sort()),'actual clip names differ from measurement');
 // animatedSampledUnion is retained external Blender evidence, not computed by this rest-pose reader.
 // The enclosing measurement document must independently declare continuousSweptGuarantee:false.
 return [];
}catch(e){return ['landscape model: '+e.message]}}
module.exports={validate,measure};
