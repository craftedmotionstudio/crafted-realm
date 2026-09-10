'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),ctx={console,JSON,Math,Number,String,Array,Object,Map,Set,isFinite};ctx.globalThis=ctx;
vm.createContext(ctx);
['holm_landscape_data.js','world_v2_building_data.js','world_v2_authoring.js','world_v2_bundle_authoring.js','world_v2_district_bundle_authoring.js']
  .forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx,{filename:file}));
const srcPath='assets/world/authoring/studio-survival-workyard.json';
const outPath='assets/world/authoring/studio-survival-workyard.bundle.json';
const doc=JSON.parse(fs.readFileSync(path.join(root,srcPath),'utf8'));
const bundle=ctx.WorldV2BuildingBundle.compile(doc,{sourcePath:srcPath});
const v=ctx.WorldV2BuildingBundle.validate(bundle,doc);
if(!v.ok) throw new Error('bundle invalid: '+JSON.stringify(v.errors));
fs.writeFileSync(path.join(root,outPath),JSON.stringify(bundle,null,2)+'\n');
console.log('[workyard-bundle] rows '+bundle.chunks[0].layers.interactions.length+', acceptsUseItem rows '+bundle.chunks[0].layers.interactions.filter(r=>r.acceptsUseItem).map(r=>r.id).join(','));
