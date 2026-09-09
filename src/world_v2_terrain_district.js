/* Pure Lesson Green terrain/navigation evidence. No buildings or scene mutations. */
var WorldV2TerrainDistrict=(function(){
  'use strict';
  if(typeof HolmLandscape==='undefined')throw new Error('WorldV2TerrainDistrict requires HolmLandscape');
  var SOURCE_SCHEMA='crafted-realm-world-v2-terrain-district-authoring-v1';
  var BUNDLE_SCHEMA='crafted-realm-world-v2-terrain-district-bundle-v1';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  // Canonical comparison also rejects non-JSON values, cycles and nonfinite numbers.
  function canonical(value,ancestors){
    ancestors=ancestors||[];
    if(value===null)return 'null';
    if(typeof value==='number'){if(!isFinite(value))throw new Error('nonfinite number');return JSON.stringify(value);}
    if(typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
    if(typeof value!=='object')throw new Error('non-JSON value');
    if(ancestors.indexOf(value)!==-1)throw new Error('cyclic value');
    var next=ancestors.concat([value]);
    if(Array.isArray(value))return '['+value.map(function(v){return canonical(v,next);}).join(',')+']';
    return '{'+Object.keys(value).sort().map(function(k){return JSON.stringify(k)+':'+canonical(value[k],next);}).join(',')+'}';
  }
  function source(){return {schema:SOURCE_SCHEMA,version:1,chunkSize:8,
    sourcePath:'assets/world/authoring/studio-lesson-green-district.json',
    provider:{id:'tutors-holm-v2',worldRevision:4},
    landscape:{planId:HolmLandscape.landscapeContract.planId,revision:HolmLandscape.landscapeContract.revision},
    district:{id:'lesson_green',padIds:['quest_lodge','teaching_kitchen']}};}
  function validateSource(value){
    var errors=[];
    try{if(canonical(value)!==canonical(source()))errors.push('source differs from the canonical Lesson Green terrain contract');}
    catch(e){errors.push('source is invalid: '+e.message);}
    return {ok:errors.length===0,errors:errors};
  }
  function overlap(a,b){return a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;}
  function padBounds(p){return {x0:p.x-p.w/2,z0:p.z-p.d/2,x1:p.x+p.w/2,z1:p.z+p.d/2};}
  function build(s){
    var d=HolmLandscape.districts.find(function(row){return row.id===s.district.id;});
    var pads=s.district.padIds.map(function(id){return HolmLandscape.pads.find(function(p){return p.id===id;});});
    if(!d||pads.some(function(p){return !p;}))throw new Error('canonical district or pad is missing');
    var bounds={x0:d.center[0]-d.radius,z0:d.center[1]-d.radius,x1:d.center[0]+d.radius,z1:d.center[1]+d.radius};
    pads.forEach(function(p){var b=padBounds(p);bounds.x0=Math.min(bounds.x0,b.x0);bounds.z0=Math.min(bounds.z0,b.z0);bounds.x1=Math.max(bounds.x1,b.x1);bounds.z1=Math.max(bounds.z1,b.z1);});
    var envelope=HolmLandscape.envelope;
    if(bounds.x0<envelope.x0||bounds.z0<envelope.z0||bounds.x1>envelope.x0+envelope.w||bounds.z1>envelope.z0+envelope.h)throw new Error('district exceeds landscape catalog');
    HolmLandscape.routes.forEach(function(r){r.points.forEach(function(p,i){if(i&&r.points[i-1][0]!==p[0]&&r.points[i-1][1]!==p[1])throw new Error('route must be cardinal');});});
    var routes=HolmLandscape.routes.filter(function(r){return r.points.some(function(p,i){
      if(!i)return false;var a=r.points[i-1];
      if(a[0]!==p[0]&&a[1]!==p[1])throw new Error('route must be cardinal');
      return overlap(bounds,{x0:Math.min(a[0],p[0])-r.width,z0:Math.min(a[1],p[1])-r.width,x1:Math.max(a[0],p[0])+r.width,z1:Math.max(a[1],p[1])+r.width});
    });});
    var chunks=[];
    for(var cz=Math.floor(bounds.z0/8);cz<=Math.floor((bounds.z1-.0001)/8);cz++)for(var cx=Math.floor(bounds.x0/8);cx<=Math.floor((bounds.x1-.0001)/8);cx++){
      var flags=[];
      for(var z=cz*8;z<cz*8+8;z++)for(var x=cx*8;x<cx*8+8;x++){
        var px=x+.5,pz=z+.5;
        var owns=Math.hypot(px-d.center[0],pz-d.center[1])<=d.radius||pads.some(function(p){var b=padBounds(p);return px>=b.x0&&px<b.x1&&pz>=b.z0&&pz<b.z1;});
        var h=HolmLandscape.heightAt(px,pz);
        if(owns&&(h===null||h<-1.2))flags.push({x:x,z:z,mask:1,reason:'terrain-water'});
      }
      chunks.push({id:cx+','+cz,cx:cx,cz:cz,terrain:{underlay:'holm_landscape_v1',heightSource:'holm_landscape_v1',revision:s.landscape.revision,roles:clone(HolmLandscape.rolesForChunk(cx,cz))},tileFlags:flags});
    }
    return {schema:BUNDLE_SCHEMA,version:1,chunkSize:8,source:{path:s.sourcePath},provider:clone(s.provider),
      landscape:{planId:s.landscape.planId,revision:s.landscape.revision,district:clone(d),pads:clone(pads),routes:clone(routes)},
      chunks:chunks,navigation:{blockMask:1,walkSurfaces:[],collisionRows:[],movement:'cardinal',elevationBand:clone(d.elevationBand)}};
  }
  function compile(value){var check=validateSource(value);if(!check.ok)throw new Error('[WorldV2TerrainDistrict] '+check.errors.join('; '));return build(value);}
  function validate(bundle,value){
    var check=validateSource(value);if(!check.ok)return check;
    var errors=[];
    try{if(canonical(bundle)!==canonical(build(value)))errors.push('bundle differs from canonical compiled terrain/navigation rows');}
    catch(e){errors.push('bundle is invalid: '+e.message);}
    return {ok:errors.length===0,errors:errors};
  }
  var api={SOURCE_SCHEMA:SOURCE_SCHEMA,BUNDLE_SCHEMA:BUNDLE_SCHEMA,VERSION:1,BLOCK:1,source:source,compile:compile,validateSource:validateSource,validate:validate};
  var sample=compile(source()),bad=clone(sample);bad.navigation.movement='diagonal';
  var checks=[validate(sample,source()).ok,canonical(sample)===canonical(compile(source())),!validate(bad,source()).ok,!validateSource(null).ok,
    sample.chunks.every(function(c){return canonical(c.terrain.roles)===canonical(HolmLandscape.rolesForChunk(c.cx,c.cz));})];
  if(checks.some(function(ok){return !ok;}))throw new Error('[WorldV2TerrainDistrict] boot acceptance failed');
  console.log('[WorldV2TerrainDistrict] '+checks.length+'/'+checks.length+' acceptance ok');
  return api;
})();
if(typeof globalThis!=='undefined')globalThis.WorldV2TerrainDistrict=WorldV2TerrainDistrict;
