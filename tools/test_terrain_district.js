#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),ctx={console};vm.createContext(ctx);
['holm_landscape_data.js','world_v2_terrain_district.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx,{filename:file}));
const T=ctx.WorldV2TerrainDistrict,L=ctx.HolmLandscape,source=T.source(),bundle=T.compile(source);
const copy=x=>JSON.parse(JSON.stringify(x));let locks=0;
function test(name,fn){fn();locks++;console.log('  ok '+name);}
test('canonical source and bundle',()=>assert(T.validateSource(source).ok&&T.validate(bundle,source).ok));
test('three deterministic compiles',()=>{for(let i=0;i<3;i++)assert.strictEqual(JSON.stringify(T.compile(source)),JSON.stringify(bundle));});
test('malformed sources fail closed',()=>{for(const value of [null,undefined,[],{},4,'source',{...source,building:{}},{...source,chunkSize:9}])assert(!T.validateSource(value).ok);});
test('source identity and membership drift refused',()=>{for(const mutate of [s=>s.provider.worldRevision++,s=>s.landscape.revision++,s=>s.district.padIds.reverse(),s=>s.district.id='survival_wood',s=>s.sourcePath='../x']){const s=copy(source);mutate(s);assert(!T.validateSource(s).ok);assert.throws(()=>T.compile(s));}});
test('every compiled field is checked',()=>{for(const mutate of [b=>b.chunks.pop(),b=>b.chunks.push(b.chunks[0]),b=>b.chunks[0].terrain.roles.push({id:'fake'}),b=>b.navigation.blockMask=0,b=>b.navigation.walkSurfaces.push({}),b=>b.landscape.pads[0].x++,b=>b.provider.id='other',b=>b.building={},b=>b.chunks[0].tileFlags.push({x:0,z:0,mask:1})]){const b=copy(bundle);mutate(b);assert(!T.validate(b,source).ok);}});
test('malformed/cyclic/nonfinite bundle rejected without throwing',()=>{const cyclic={};cyclic.self=cyclic;for(const b of [null,undefined,[],{},cyclic,{...bundle,extra:NaN}])assert(!T.validate(b,source).ok);});
test('canonical chunk order, ids and catalog containment',()=>{const ids=new Set();let previous=-Infinity;for(const c of bundle.chunks){assert.strictEqual(c.id,c.cx+','+c.cz);assert(!ids.has(c.id));ids.add(c.id);const order=c.cz*1000+c.cx;assert(order>previous);previous=order;assert(c.cx>=Math.floor(L.envelope.x0/8)&&c.cx<=Math.floor((L.envelope.x0+L.envelope.w-.0001)/8));assert(c.cz>=Math.floor(L.envelope.z0/8)&&c.cz<=Math.floor((L.envelope.z0+L.envelope.h-.0001)/8));}});
test('unchanged analytic terrain role rows',()=>bundle.chunks.forEach(c=>assert.strictEqual(JSON.stringify(c.terrain.roles),JSON.stringify(L.rolesForChunk(c.cx,c.cz)))));
test('water rows remain inside chunk and match analytic water',()=>{for(const c of bundle.chunks)for(const f of c.tileFlags){assert(Math.floor(f.x/8)===c.cx&&Math.floor(f.z/8)===c.cz);const h=L.heightAt(f.x+.5,f.z+.5);assert(h===null||h<-1.2);assert.strictEqual(f.mask,1);}});
test('route evidence remains cardinal',()=>{assert(bundle.landscape.routes.length);for(const r of bundle.landscape.routes)for(let i=1;i<r.points.length;i++)assert(r.points[i][0]===r.points[i-1][0]||r.points[i][1]===r.points[i-1][1]);});
test('reserved pads do not promote buildings or navigation geometry',()=>{assert(!bundle.building);assert.strictEqual(bundle.navigation.walkSurfaces.length,0);assert.strictEqual(bundle.navigation.collisionRows.length,0);assert.deepStrictEqual(Array.from(bundle.landscape.pads,p=>p.id),['quest_lodge','teaching_kitchen']);});
test('returned data has no shared mutable landscape references',()=>{const b=T.compile(source);b.landscape.pads[0].x++;b.chunks[0].terrain.roles.length=0;assert.strictEqual(JSON.stringify(T.compile(source)),JSON.stringify(bundle));});
console.log('[terrain-district] '+locks+'/'+locks+' locks passed; '+bundle.chunks.length+' chunks');
