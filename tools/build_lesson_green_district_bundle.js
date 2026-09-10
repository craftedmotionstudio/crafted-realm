#!/usr/bin/env node
'use strict';
// Generate candidates only inside the journaled workspace. Use CLI export/plan/apply.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),id='lesson-green-district',W=require('./studio_workspace.js');
const workspace=path.join(root,'.studio-workspaces',id);
if(!fs.existsSync(path.join(workspace,'studio-workspace.json')))throw new Error('Initialize lesson-green-district with studio_workspace_cli.js first.');
const ctx={console};vm.createContext(ctx);
['holm_landscape_data.js','world_v2_terrain_district.js'].forEach(file=>vm.runInContext(fs.readFileSync(path.join(root,'src',file),'utf8'),ctx,{filename:file}));
const source=ctx.WorldV2TerrainDistrict.source(),bundle=ctx.WorldV2TerrainDistrict.compile(source);
const candidates=path.join(workspace,'candidates');fs.mkdirSync(candidates,{recursive:true});
[[source.sourcePath,source],['assets/world/authoring/studio-lesson-green-district.bundle.json',bundle]].forEach(([target,value])=>{
  const file=path.join(candidates,path.basename(target));fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');W.stage(root,id,target,file);
});
console.log('[lesson-green] Staged source and '+bundle.chunks.length+' compiled chunks. Run CLI export, plan, then apply.');
