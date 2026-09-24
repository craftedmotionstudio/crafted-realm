'use strict';
const {isDeepStrictEqual}=require('util');
const Terrain=require('../src/holm_overhaul_terrain');
const SOURCE='holm-overhaul-terrain-source-v1',BUNDLE='holm-overhaul-terrain-bundle-v1';
function handles(value){return value&&[SOURCE,BUNDLE].includes(value.schema)}
function validate(value){
 try{
  if(!handles(value))throw Error('unsupported overhaul terrain schema');
  if(value.schema===SOURCE){Terrain.compile(value);return []}
  if(value.version!==1||value.width!==144||value.depth!==128||value.spacing!==1)throw Error('invalid terrain dimensions/version');
  for(const [key,size,valid] of [['heights',145*129,n=>Number.isFinite(n)],['materials',145*129,n=>Number.isInteger(n)&&n>=0&&n<=4],['water',144*128,n=>Number.isInteger(n)&&n>=0&&n<=2]]){
   if(!Array.isArray(value[key])||value[key].length!==size||!value[key].every(valid))throw Error('invalid '+key+' lattice');
  }
  if(!value.creek||!value.stats)throw Error('missing creek/stats');
  return [];
 }catch(e){return [e.message]}
}
function validateSet(json){
 const errors=[];
 for(const [rel,value] of Object.entries(json)){
  if(!handles(value))continue;
  errors.push(...validate(value).map(e=>rel+': '+e));
  const sourcePath=value.schema===SOURCE?rel:rel.replace(/\.bundle\.json$/,'.json');
  const bundlePath=sourcePath.replace(/\.json$/,'.bundle.json');
  if(sourcePath===bundlePath||!json[sourcePath]||json[sourcePath].schema!==SOURCE||!json[bundlePath]||json[bundlePath].schema!==BUNDLE){errors.push(rel+': matching terrain source and bundle must be registered together');continue}
  if(value.schema===BUNDLE)continue;
  try{if(!isDeepStrictEqual(Terrain.compile(json[sourcePath]),json[bundlePath]))errors.push(bundlePath+': terrain bundle differs from compiled source')}
  catch(e){errors.push(sourcePath+': '+e.message)}
 }
 return errors;
}
module.exports={handles,validate,validateSet};
