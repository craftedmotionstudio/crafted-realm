/* ============== WORLD V2 DISTRICT BUNDLE AUTHORING ==============
 * Compiles a landscape district and its completed building into one reviewable
 * transaction.  The output deliberately contains the same terrain-role rows
 * consumed by the provider plus explicit navigation, collider, and walk-surface
 * evidence; Studio can therefore reject a landscape/building pair that drifted.
 */
var WorldV2DistrictBundle=(function(){
  'use strict';
  var SOURCE_SCHEMA='crafted-realm-world-v2-district-authoring-v1';
  var BUNDLE_SCHEMA='crafted-realm-world-v2-district-bundle-v1';
  var VERSION=1,CHUNK_SIZE=8,BLOCK=1;
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function finite(v){return typeof v==='number'&&isFinite(v);}
  function need(ok,msg,errors){if(!ok)errors.push(msg);}
  function district(id){return HolmLandscape.districts.find(function(d){return d.id===id;});}
  function pad(id){return HolmLandscape.pads.find(function(p){return p.id===id;});}
  function boundsForDistrict(d){return {x0:d.center[0]-d.radius,z0:d.center[1]-d.radius,x1:d.center[0]+d.radius,z1:d.center[1]+d.radius};}
  function rectOverlap(a,b){return a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;}
  function pointInRect(x,z,r){return Math.abs(x-r.x)<=r.w/2&&Math.abs(z-r.z)<=r.d/2;}
  function rotate(x,z,rot){var c=Math.cos(rot||0),s=Math.sin(rot||0);return [x*c+z*s,-x*s+z*c];}
  function worldPoint(row,placement){var p=rotate(row.x,row.z,placement.rot);return {x:+(placement.x+p[0]).toFixed(6),z:+(placement.z+p[1]).toFixed(6)};}
  function worldCollider(row,placement){
    var p=worldPoint(row,placement),out=clone(row);out.x=p.x;out.z=p.z;
    if(out.type==='obox')out.rot=+((out.rot||0)+(placement.rot||0)).toFixed(6);
    return out;
  }
  function worldSurface(row,placement){var p=worldPoint(row,placement),out=clone(row);out.x=p.x;out.z=p.z;out.y=+(row.y+(placement.yOffset||0)).toFixed(6);return out;}
  function inCircle(x,z,d,padBy){return Math.hypot(x-d.center[0],z-d.center[1])<=d.radius+(padBy||0);}
  function surfaceAt(x,z,surfaces){return surfaces.find(function(s){return pointInRect(x,z,s);})||null;}
  function validateSource(source){
    var errors=[];need(source&&typeof source==='object'&&!Array.isArray(source),'source must be an object',errors);if(!source)return {ok:false,errors:errors};
    need(source.schema===SOURCE_SCHEMA,'schema must be '+SOURCE_SCHEMA,errors);need(source.version===VERSION,'version must be 1',errors);need(source.chunkSize===CHUNK_SIZE,'chunkSize must be 8',errors);
    need(source.provider&&typeof source.provider.id==='string'&&Number.isInteger(source.provider.worldRevision),'provider metadata is required',errors);
    need(source.landscape&&source.landscape.planId===HolmLandscape.landscapeContract.planId&&source.landscape.revision===HolmLandscape.landscapeContract.revision,'landscape plan/revision drifted',errors);
    need(source.district&&!!district(source.district.id),'known district is required',errors);
    need(source.district&&Array.isArray(source.district.padIds)&&source.district.padIds.every(function(id){return !!pad(id);}), 'district padIds are invalid',errors);
    need(source.building&&typeof source.building.sourcePath==='string'&&typeof source.building.bundlePath==='string','building pair paths are required',errors);
    need(source.building&&typeof source.building.definitionId==='string'&&typeof source.building.runtimePlacementId==='string','building identity is required',errors);
    return {ok:errors.length===0,errors:errors};
  }
  function survivalWoodSource(){return {
    schema:SOURCE_SCHEMA,version:VERSION,chunkSize:CHUNK_SIZE,
    sourcePath:'assets/world/authoring/studio-survival-wood-district.json',
    provider:{id:'tutors-holm-v2',worldRevision:4},
    landscape:{planId:'tutors-holm-landscape-v1',revision:3},
    district:{id:'survival_wood',padIds:['survival_shelter']},
    building:{sourcePath:'assets/world/authoring/studio-survival-workyard.json',bundlePath:'assets/world/authoring/studio-survival-workyard.bundle.json',definitionId:'holm_survival_workyard_v1',runtimePlacementId:'holm_survival_workyard'}
  };}
  function compile(source,buildingSource,buildingBundle){
    var sourceCheck=validateSource(source);if(!sourceCheck.ok)throw new Error('[WorldV2DistrictBundle] '+sourceCheck.errors.join('; '));
    var pair=WorldV2BuildingBundle.validate(buildingBundle,buildingSource);if(!pair.ok)throw new Error('[WorldV2DistrictBundle] building pair: '+pair.errors.join('; '));
    var d=district(source.district.id),placement=buildingSource.placements.find(function(p){return p.definitionId===source.building.definitionId;});
    if(!placement)throw new Error('[WorldV2DistrictBundle] building placement is missing');
    var def=WorldV2BuildingData.get(placement.definitionId);if(!def)throw new Error('[WorldV2DistrictBundle] building definition is missing');
    if(placement.x!==def.placement.x||placement.z!==def.placement.z||placement.rot!==def.placement.rot||placement.yOffset!==(def.placement.yOffset||0))
      throw new Error('[WorldV2DistrictBundle] building placement drifted from the approved landscape pad');
    var colliders=(def.colliders||[]).map(function(c){return worldCollider(c,placement);});
    var surfaces=(def.walkSurfaces||[]).map(function(s){return worldSurface(s,placement);});
    var b=boundsForDistrict(d),minX=Math.min(b.x0,placement.x-def.footprint.w/2),maxX=Math.max(b.x1,placement.x+def.footprint.w/2);
    var minZ=Math.min(b.z0,placement.z-def.footprint.d/2),maxZ=Math.max(b.z1,placement.z+def.footprint.d/2);
    surfaces.forEach(function(s){minX=Math.min(minX,s.x-s.w/2);maxX=Math.max(maxX,s.x+s.w/2);minZ=Math.min(minZ,s.z-s.d/2);maxZ=Math.max(maxZ,s.z+s.d/2);});
    var chunks=[];
    for(var cz=Math.floor(minZ/CHUNK_SIZE);cz<=Math.floor((maxZ-.0001)/CHUNK_SIZE);cz++)for(var cx=Math.floor(minX/CHUNK_SIZE);cx<=Math.floor((maxX-.0001)/CHUNK_SIZE);cx++){
      var flags=[];
      for(var tz=cz*8;tz<cz*8+8;tz++)for(var tx=cx*8;tx<cx*8+8;tx++){
        var x=tx+.5,z=tz+.5,surface=surfaceAt(x,z,surfaces),h=HolmLandscape.heightAt(x,z);
        if(surface)flags.push({x:tx,z:tz,mask:0,reason:'authored-walk-surface',surfaceId:surface.id});
        else if((inCircle(x,z,d,.75)||pointInRect(x,z,pad('survival_shelter')))&&(h===null||h<-1.2))flags.push({x:tx,z:tz,mask:BLOCK,reason:'terrain-water'});
      }
      chunks.push({id:cx+','+cz,cx:cx,cz:cz,terrain:{underlay:'holm_landscape_v1',heightSource:'holm_landscape_v1',revision:3,roles:clone(HolmLandscape.rolesForChunk(cx,cz))},tileFlags:flags});
    }
    var districtRect=b,routes=HolmLandscape.routes.filter(function(r){
      for(var i=1;i<r.points.length;i++){var a=r.points[i-1],c=r.points[i],rb={x0:Math.min(a[0],c[0])-r.width,z0:Math.min(a[1],c[1])-r.width,x1:Math.max(a[0],c[0])+r.width,z1:Math.max(a[1],c[1])+r.width};if(rectOverlap(districtRect,rb))return true;}return false;
    });
    var bundle={schema:BUNDLE_SCHEMA,version:VERSION,chunkSize:CHUNK_SIZE,source:{path:source.sourcePath},provider:clone(source.provider),
      landscape:{planId:source.landscape.planId,revision:source.landscape.revision,district:clone(d),pads:source.district.padIds.map(function(id){return clone(pad(id));}),pond:clone(HolmLandscape.pond),routes:clone(routes)},
      building:{sourcePath:source.building.sourcePath,bundlePath:source.building.bundlePath,definitionId:def.id,definitionRevision:def.revision,runtimePlacementId:source.building.runtimePlacementId,placement:clone(placement)},
      chunks:chunks.sort(function(a,c){return a.cz-c.cz||a.cx-c.cx;}),navigation:{blockMask:BLOCK,walkSurfaces:surfaces,collisionRows:colliders}};
    var check=validate(bundle,source,buildingSource,buildingBundle);if(!check.ok)throw new Error('[WorldV2DistrictBundle] '+check.errors.join('; '));return bundle;
  }
  function validate(bundle,source,buildingSource,buildingBundle){
    var errors=[];need(bundle&&typeof bundle==='object'&&!Array.isArray(bundle),'bundle must be an object',errors);if(!bundle)return {ok:false,errors:errors};
    need(bundle.schema===BUNDLE_SCHEMA,'schema must be '+BUNDLE_SCHEMA,errors);need(bundle.version===VERSION&&bundle.chunkSize===CHUNK_SIZE,'version/chunkSize must be 1/8',errors);
    need(bundle.source&&typeof bundle.source.path==='string','source.path is required',errors);need(bundle.provider&&typeof bundle.provider.id==='string'&&Number.isInteger(bundle.provider.worldRevision),'provider metadata is required',errors);
    need(bundle.landscape&&bundle.landscape.district&&!!district(bundle.landscape.district.id),'landscape district is invalid',errors);need(Array.isArray(bundle.chunks)&&bundle.chunks.length>0,'district chunks are required',errors);
    need(bundle.navigation&&Array.isArray(bundle.navigation.walkSurfaces)&&Array.isArray(bundle.navigation.collisionRows),'navigation rows are required',errors);
    var ids={};(bundle.chunks||[]).forEach(function(ch){need(ch.id===ch.cx+','+ch.cz&&!ids[ch.id],'chunk ids must be unique and canonical',errors);ids[ch.id]=1;need(ch.terrain&&Array.isArray(ch.terrain.roles)&&Array.isArray(ch.tileFlags),'chunk terrain/tileFlags are required',errors);});
    if(source){var sc=validateSource(source);errors=errors.concat(sc.errors);need(source.sourcePath===bundle.source.path,'district source path drifted',errors);need(source.provider.id===bundle.provider.id&&source.provider.worldRevision===bundle.provider.worldRevision,'district provider metadata drifted',errors);}
    if(buildingSource&&buildingBundle){var pair=WorldV2BuildingBundle.validate(buildingBundle,buildingSource);errors=errors.concat(pair.errors);need(bundle.building.sourcePath===source.building.sourcePath&&bundle.building.bundlePath===source.building.bundlePath,'building pair paths drifted',errors);need(buildingSource.placements.some(function(p){return p.definitionId===bundle.building.definitionId;}),'district building is absent from building source',errors);}
    return {ok:errors.length===0,errors:errors};
  }
  function runtimeRows(source,buildingSource,buildingBundle){return compile(source,buildingSource,buildingBundle);}
  return {SOURCE_SCHEMA:SOURCE_SCHEMA,BUNDLE_SCHEMA:BUNDLE_SCHEMA,VERSION:VERSION,BLOCK:BLOCK,survivalWoodSource:survivalWoodSource,validateSource:validateSource,compile:compile,validate:validate,runtimeRows:runtimeRows};
})();
if(typeof globalThis!=='undefined')globalThis.WorldV2DistrictBundle=WorldV2DistrictBundle;
