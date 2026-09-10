'use strict';
// Use the same pure-data compiler as the browser; never accept a merely
// well-shaped terrain bundle whose navigation differs from its source.
const fs=require('fs'),path=require('path'),vm=require('vm');
function compiler(){
  const ctx={console:{log(){}},JSON,Math,Number,String,Array,Object,Map,Set,isFinite};ctx.globalThis=ctx;
  vm.createContext(ctx);
  ['holm_landscape_data.js','world_v2_terrain_district.js'].forEach(file=>
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..','src',file),'utf8'),ctx,{filename:file}));
  return ctx.WorldV2TerrainDistrict;
}
function validate(value,source){
  try{
    const api=compiler();
    return (value.schema===api.SOURCE_SCHEMA?api.validateSource(value):api.validate(value,source||api.source())).errors;
  }catch(error){return ['terrain district validation failed: '+error.message];}
}
module.exports={validate};
