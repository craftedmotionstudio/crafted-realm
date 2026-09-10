#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),ctx={console,JSON,Math,Number,String,Array,Object,Map,Set,isFinite};ctx.globalThis=ctx;
vm.createContext(ctx);
['holm_landscape_data.js','world_v2_building_data.js','world_v2_authoring.js','world_v2_bundle_authoring.js','world_v2_district_bundle_authoring.js']
  .forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx,{filename:file}));
const read=rel=>JSON.parse(fs.readFileSync(path.join(root,...rel.split('/')),'utf8'));
const districtPath='assets/world/authoring/studio-survival-wood-district.json';
const outputPath='assets/world/authoring/studio-survival-wood-district.bundle.json';
const source=read(districtPath),buildingSource=read(source.building.sourcePath),buildingBundle=read(source.building.bundlePath);
const bundle=ctx.WorldV2DistrictBundle.compile(source,buildingSource,buildingBundle);
fs.writeFileSync(path.join(root,...outputPath.split('/')),JSON.stringify(bundle,null,2)+'\n');
console.log('[district-bundle] '+bundle.landscape.district.label+': '+bundle.chunks.length+' chunks, '+bundle.navigation.collisionRows.length+' colliders, '+bundle.navigation.walkSurfaces.length+' walk surfaces');
