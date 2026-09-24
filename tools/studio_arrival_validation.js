'use strict';
// Publication evidence only: byte identity, reproducible data and GLB structure.
// This does not establish collision geometry, visual acceptance, animation motion
// quality, or correspondence between the Blender source and its model export.
// v4 (2026-09-24): the scenery shape is 20+ objects; the Lantern Keeper statue is an allowed eleventh family.
const crypto=require('crypto'),util=require('util');
const Package=require('../src/holm_arrival_package');
const SCHEMA='crafted-realm-holm-arrival-package-v1';
const ROLES={
 'holm-overhaul-terrain-source-v1':'terrainSource',
 'holm-overhaul-terrain-bundle-v1':'terrain',
 'holm-overhaul-arrival-layout-v1':'layout',
 'holm-guide-house-collision-envelopes-v1':'envelopes',
 'holm-arrival-dock-study-v1':'dock',
 'holm-arrival-provisions-placement-v1':'provisionsPlacement',
 'crafted-realms-local-prop-v1':'provisionsManifest',
 'holm-arrival-landscape-study-v1':'landscapePlacement',
 'holm-arrival-landscape-measure-v1':'landscapeMeasurement'
};
function need(ok,message){if(!ok)throw Error(message)}
function handles(v){return !!v&&v.schema===SCHEMA}
function safe(p){return typeof p==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(p)&&p.split('/').every(s=>s!=='.'&&s!=='..'&&!s.endsWith('.'))}
function descriptor(d){need(d&&safe(d.path),'unsafe or non-normalized source path');need(/^[0-9a-f]{64}$/.test(d.sha256),'invalid SHA256 declaration')}
function validateShape(v){
 try{
  need(handles(v)&&v.version===1,'unsupported arrival package schema/version');
  need(v.provider&&v.provider.id==='tutors-holm-v2'&&Number.isInteger(v.provider.worldRevision)&&v.provider.worldRevision>0,'invalid provider revision');
  const scenic=Array.isArray(v.objects)&&v.objects.length>=20,extended=Array.isArray(v.objects)&&v.objects.length>=3;
  need(Array.isArray(v.sources)&&(scenic?v.sources.length>=24:v.sources.length===(extended?13:9)),extended?'arrival package needs exactly thirteen sources':'arrival package needs exactly nine sources');
  const paths=new Set(),folded=new Set();
  for(const s of v.sources){descriptor(s);need(!paths.has(s.path)&&!folded.has(s.path.toLowerCase()),'duplicate source path');paths.add(s.path);folded.add(s.path.toLowerCase())}
  need(Array.isArray(v.objects)&&([2,3].includes(v.objects.length)||scenic),'arrival package needs two or three objects');
  const ids=new Set(),assets=new Map();
  for(const o of v.objects){
   const a=o&&o.asset;need(a&&(scenic?['guide','dock','provisions','oak','hazel','fieldstones','wall','bench','waypost','cargo','statue']:extended?['guide','dock','provisions']:['guide','dock']).includes(a.id)&&!ids.has(o.id),'invalid or duplicate object');ids.add(o.id);need(!assets.has(a.id)||util.isDeepStrictEqual(assets.get(a.id),a),'conflicting shared asset');assets.set(a.id,a);
   for(const d of [a.model,a.authoring]){descriptor(d);need(v.sources.some(s=>s.path===d.path&&s.sha256===d.sha256),'asset descriptor absent from sources')}
   need(a.model.path.endsWith('.glb')&&a.authoring.path.endsWith('.blend'),'wrong model/authoring extension');
   need(Array.isArray(a.parts)&&a.parts.length&&a.parts.every(p=>typeof p==='string')&&new Set(a.parts).size===a.parts.length,'invalid semantic parts');
  }
  need(scenic?(assets.size===10||(assets.size===11&&assets.has('statue'))):assets.size===(extended?3:2),'missing unique asset family');
  need(v.navigation&&Array.isArray(v.navigation.doors)&&Array.isArray(v.navigation.requiredRoutes),'missing navigation contract');
  need(v.boundary&&v.boundary.readyForWholeProviderReplacement===false&&v.boundary.sourceBytesVerified===false&&v.boundary.assetPartsVerified===false,'compiler draft flags must remain false');
  return [];
 }catch(e){return ['arrival shape: '+e.message]}
}
function glb(bytes,asset,doors){
 need(bytes.length>=20&&bytes.toString('ascii',0,4)==='glTF','invalid GLB header');
 need(bytes.readUInt32LE(4)===2&&bytes.readUInt32LE(8)===bytes.length,'invalid GLB version/declared length');
 const chunks=[];let offset=12;
 while(offset<bytes.length){
  need(offset+8<=bytes.length,'truncated GLB chunk header');
  const size=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);offset+=8;
  need(size%4===0&&offset+size<=bytes.length,'invalid GLB chunk length');
  chunks.push({type,data:bytes.subarray(offset,offset+size)});offset+=size;
 }
 need(chunks.length===2&&chunks[0].type===0x4e4f534a&&chunks[1].type===0x004e4942,'expected JSON then BIN GLB chunks');
 const g=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(chunks[0].data));
 need(g.asset&&g.asset.version==='2.0','invalid glTF asset version');
 need(Array.isArray(g.buffers)&&g.buffers.length===1&&!g.buffers[0].uri&&Number.isInteger(g.buffers[0].byteLength)&&g.buffers[0].byteLength>0&&chunks[1].data.length-g.buffers[0].byteLength>=0&&chunks[1].data.length-g.buffers[0].byteLength<=3,'invalid embedded GLB buffer');
 const views=g.bufferViews||[];
 for(const v of views)need(v.buffer===0&&Number.isInteger(v.byteLength)&&v.byteLength>0&&Number.isInteger(v.byteOffset||0)&&(v.byteOffset||0)>=0&&(v.byteOffset||0)+v.byteLength<=g.buffers[0].byteLength,'invalid GLB buffer view');
 const nodes=g.nodes;need(Array.isArray(nodes)&&Array.isArray(g.scenes)&&Number.isInteger(g.scene)&&g.scenes[g.scene]&&Array.isArray(g.scenes[g.scene].nodes),'missing default GLB scene');
 const reachable=new Set(),active=new Set();
 function visit(i){need(Number.isInteger(i)&&nodes[i],'invalid scene node index');need(!active.has(i),'cyclic scene hierarchy');need(!reachable.has(i),'multiply parented scene node');reachable.add(i);active.add(i);const n=nodes[i];need(!n.children||Array.isArray(n.children),'invalid children');for(const c of n.children||[])visit(c);active.delete(i)}
 for(const i of g.scenes[g.scene].nodes)visit(i);
 const names={};
 for(const p of asset.parts){const matches=nodes.map((n,i)=>n.name===p?i:-1).filter(i=>i>=0);need(matches.length===1,'missing/duplicate semantic part '+p);need(reachable.has(matches[0]),'unreachable semantic part '+p);names[p]=matches[0]}
 function meshBelow(i){const n=nodes[i];if(n.mesh!==undefined){need(Number.isInteger(n.mesh)&&g.meshes&&g.meshes[n.mesh]&&Array.isArray(g.meshes[n.mesh].primitives)&&g.meshes[n.mesh].primitives.length,'invalid semantic mesh');return true}return (n.children||[]).some(meshBelow)}
 for(const p of asset.parts)need(meshBelow(names[p]),'semantic part has no mesh descendant '+p);
 if(asset.id==='guide')for(const door of doors){
  need(/^Door(?:North|South)Hinge$/.test(door.hingePart),'unsupported door hinge contract');
  const name=door.hingePart.replace('Hinge','Open'),clips=(g.animations||[]).filter(a=>a.name===name);
  need(clips.length===1,'missing/duplicate door animation '+name);
  const a=clips[0],channels=(a.channels||[]).filter(c=>c.target&&c.target.node===names[door.hingePart]&&c.target.path==='rotation');
  need(channels.length===1,'door animation must rotate its semantic hinge '+name);
  const sampler=(a.samplers||[])[channels[0].sampler],accessors=g.accessors||[];
  need(sampler&&accessors[sampler.input]&&accessors[sampler.output],'invalid door animation sampler '+name);
  const input=accessors[sampler.input],output=accessors[sampler.output];
  need(input.componentType===5126&&input.type==='SCALAR'&&input.count>=2&&output.componentType===5126&&output.type==='VEC4'&&output.count===input.count*(sampler.interpolation==='CUBICSPLINE'?3:1)&&views[input.bufferView]&&views[output.bufferView],'invalid door animation accessors '+name);
 }
}
function validate(value,readBytes,registeredPaths){
 const errors=validateShape(value);if(errors.length)return errors;
 try{
  need(typeof readBytes==='function'&&Array.isArray(registeredPaths),'byte reader and registered paths required');
  const registered=new Set(registeredPaths),bytes=new Map(),input={provider:value.provider,sources:{},assets:Array.from(new Map(value.objects.map(o=>[o.asset.id,o.asset])).values())};
  for(const s of value.sources){
   need(registered.has(s.path),'unregistered dependency '+s.path);
   const b=readBytes(s.path);need(Buffer.isBuffer(b),'byte reader must return Buffer for '+s.path);
   need(crypto.createHash('sha256').update(b).digest('hex')===s.sha256,'SHA256 mismatch '+s.path);bytes.set(s.path,b);
   if(s.path.endsWith('.json')){const doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b)),role=ROLES[doc.schema];need(role,'unknown source schema '+s.path);need(!input.sources[role],'duplicate source role '+role);input[role]=doc;input.sources[role]=s}
  }
  for(const role of ['terrainSource','terrain','layout','envelopes','dock'].concat(value.objects.length>=3?['provisionsPlacement','provisionsManifest']:[]).concat(value.objects.length>=20?['landscapePlacement','landscapeMeasurement']:[]))need(input.sources[role],'missing source role '+role);
  const expected=Package.compile(input);need(util.isDeepStrictEqual(value,expected),'compiled arrival package differs from source reconstruction');
  for(const a of input.assets){
   const blend=bytes.get(a.authoring.path);need(blend&&blend.length>=12&&/^BLENDER[_-][vV][0-9]{3}$/.test(blend.toString('ascii',0,12)),'invalid Blender header '+a.authoring.path);
   try{glb(bytes.get(a.model.path),a,expected.navigation.doors)}catch(e){throw Error(a.model.path+': '+e.message)}
   if(input.landscapeMeasurement&&input.landscapeMeasurement.assets[a.id]){const failures=require('./validate_landscape_model').validate(bytes.get(a.model.path),input.landscapeMeasurement.assets[a.id]);need(!failures.length,failures.join('; '))}
   if(a.id==='provisions'){const failures=require('./validate_provision_model').validate(bytes.get(a.model.path),input.provisionsManifest);need(!failures.length,failures.join('; '))}
  }
  return [];
 }catch(e){return ['arrival bytes: '+e.message]}
}
module.exports={handles,validateShape,validate};
