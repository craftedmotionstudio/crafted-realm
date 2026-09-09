/* ================= WORLD V2 BUILDING BUNDLE AUTHORING =================
 * Compiles one validated placement document into runtime-shaped chunk rows
 * plus a compact, reviewable building contract. The game and Studio use the
 * same interaction metadata; provider files no longer duplicate it by hand.
 */
var WorldV2BuildingBundle=(function(){
  'use strict';
  var SCHEMA='crafted-realm-world-v2-building-bundle-v1',VERSION=1,CHUNK_SIZE=8;
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function finite(v){return typeof v==='number'&&isFinite(v);}
  function sortIds(a,b){return a.id<b.id?-1:a.id>b.id?1:0;}
  function definition(id){return typeof WorldV2BuildingData!=='undefined'&&WorldV2BuildingData.get(id);}
  function semanticRows(def){
    return [].concat(def.doors||[],def.services||[],def.clues||[],def.supportSpaces||[],def.furnishings||[])
      .filter(function(row){return row.bundle!==false;});
  }
  function resourceFiles(def){
    var result={};Object.keys(def.resources||{}).sort().forEach(function(key){
      var value=def.resources[key];if(typeof value==='string'&&value.indexOf('assets/')===0)result[key]=value;
    });return result;
  }
  function interactionRows(def,objectId){
    return semanticRows(def).filter(function(row){return !!row.interaction;}).map(function(row){
      var meta=row.interaction,partId=row.partId||row.id,kind=row.kind||'door';
      var out={id:objectId+'.'+meta.id,objectId:objectId,partId:partId,kind:kind};
      Object.keys(meta).forEach(function(key){if(key!=='id')out[key]=clone(meta[key]);});return out;
    }).sort(sortIds);
  }
  function contract(def,placementId){
    var semantic=semanticRows(def).filter(function(row){return !!row.interaction;});
    return {placementId:placementId,definitionId:def.id,definitionRevision:def.revision,padId:def.padId,
      roomIds:(def.rooms||[]).map(function(r){return r.id;}).sort(),
      doorIds:(def.doors||[]).map(function(r){return r.id;}).sort(),
      semanticPartIds:semantic.map(function(r){return r.partId||r.id;}).sort(),
      colliderCount:(def.colliders||[]).length,resources:resourceFiles(def)};
  }
  function compile(doc,options){
    if(typeof WorldV2Authoring==='undefined')throw new Error('[WorldV2BuildingBundle] WorldV2Authoring is required to compile');
    var source=WorldV2Authoring.load(doc),opts=options||{},chunks=WorldV2Authoring.toChunkRows(source),contracts=[];
    chunks=chunks.map(function(row){
      var objects=row.objects.map(function(o){
        var def=definition(o.buildingDef);if(!def)throw new Error('unknown building definition '+o.buildingDef);
        var expected=semanticRows(def),missing=expected.filter(function(s){return !s.interaction;});
        if(missing.length)throw new Error(def.id+' is not bundle-ready; interaction metadata missing for '+missing.map(function(s){return s.id;}).join(', '));
        contracts.push(contract(def,o.id));return clone(o);
      });
      var interactions=[];objects.forEach(function(o){interactions=interactions.concat(interactionRows(definition(o.buildingDef),o.id));});
      return {v:1,id:row.id,cx:row.cx,cz:row.cz,layers:{
        terrain:{underlay:opts.underlay||'holm_landscape_v1',heightSource:opts.heightSource||'holm_landscape_v1',revision:opts.terrainRevision||2,roles:[]},
        tileFlags:[],objects:objects,interactions:interactions.sort(sortIds),mutations:[],spawns:[]}};
    });
    var bundle={schema:SCHEMA,version:VERSION,chunkSize:CHUNK_SIZE,
      source:{path:opts.sourcePath||'assets/world/authoring/studio-building-preview.json'},
      provider:clone(source.provider),
      landscape:{planId:opts.planId||'tutors-holm-landscape-v1',revision:opts.landscapeRevision||1},
      chunks:chunks.sort(function(a,b){return a.cx-b.cx||a.cz-b.cz;}),
      buildingContracts:contracts.sort(function(a,b){return a.placementId<b.placementId?-1:a.placementId>b.placementId?1:0;})};
    var result=validate(bundle,source);if(!result.ok)throw new Error('[WorldV2BuildingBundle] '+result.errors.join('; '));return bundle;
  }
  function validate(bundle,sourceDoc){
    var errors=[];function need(ok,msg){if(!ok)errors.push(msg);}
    need(bundle&&typeof bundle==='object'&&!Array.isArray(bundle),'bundle must be an object');if(!bundle)return {ok:false,errors:errors};
    need(bundle.schema===SCHEMA,'schema must be '+SCHEMA);need(bundle.version===VERSION,'version must be '+VERSION);need(bundle.chunkSize===CHUNK_SIZE,'chunkSize must be 8');
    need(bundle.source&&typeof bundle.source.path==='string'&&bundle.source.path.length>0,'source.path is required');
    need(bundle.provider&&typeof bundle.provider.id==='string'&&bundle.provider.id.length>0,'provider.id is required');
    need(bundle.provider&&Number.isInteger(bundle.provider.worldRevision)&&bundle.provider.worldRevision>0,'provider.worldRevision must be positive');
    need(bundle.landscape&&typeof bundle.landscape.planId==='string'&&Number.isInteger(bundle.landscape.revision),'landscape plan and revision are required');
    need(Array.isArray(bundle.chunks),'chunks must be an array');need(Array.isArray(bundle.buildingContracts),'buildingContracts must be an array');
    var objects={},interactions={},contracts={};
    (bundle.buildingContracts||[]).forEach(function(c){
      need(c&&typeof c.placementId==='string'&&!contracts[c.placementId],'building contract needs a unique placementId');if(!c)return;
      contracts[c.placementId]=c;var def=definition(c.definitionId);need(!!def,'unknown definition '+c.definitionId);
      if(def){need(c.definitionRevision===def.revision,'stale definition revision for '+c.definitionId);need(c.padId===def.padId,'pad mismatch for '+c.definitionId);
        need(JSON.stringify(c.roomIds)===JSON.stringify((def.rooms||[]).map(function(r){return r.id;}).sort()),'room ids drifted for '+c.definitionId);
        need(JSON.stringify(c.doorIds)===JSON.stringify((def.doors||[]).map(function(r){return r.id;}).sort()),'door ids drifted for '+c.definitionId);
        need(JSON.stringify(c.semanticPartIds)===JSON.stringify(semanticRows(def).filter(function(r){return !!r.interaction;}).map(function(r){return r.partId||r.id;}).sort()),'semantic part ids drifted for '+c.definitionId);
        need(c.colliderCount===(def.colliders||[]).length,'collider count drifted for '+c.definitionId);
        need(JSON.stringify(c.resources)===JSON.stringify(resourceFiles(def)),'resource list drifted for '+c.definitionId);}
    });
    (bundle.chunks||[]).forEach(function(ch){
      need(ch&&ch.id===ch.cx+','+ch.cz,'chunk id must match cx,cz');need(ch&&ch.v===1,'chunk contract version must be 1');
      var layers=ch&&ch.layers;need(layers&&Array.isArray(layers.objects)&&Array.isArray(layers.interactions),'chunk layers are incomplete');if(!layers)return;
      layers.objects.forEach(function(o){need(o&&typeof o.id==='string'&&!objects[o.id],'object id must be globally unique');if(!o)return;objects[o.id]=o;
        need(Math.floor(o.x/CHUNK_SIZE)===ch.cx&&Math.floor(o.z/CHUNK_SIZE)===ch.cz,'object '+o.id+' is in the wrong chunk');need(!!contracts[o.id],'object '+o.id+' is missing its building contract');});
      layers.interactions.forEach(function(i){need(i&&typeof i.id==='string'&&!interactions[i.id],'interaction id must be globally unique');if(!i)return;interactions[i.id]=i;
        need(!!objects[i.objectId],'interaction '+i.id+' references a missing local object');var c=contracts[i.objectId];need(c&&c.semanticPartIds.indexOf(i.partId)>=0,'interaction '+i.id+' references an unknown semantic part');
        need(typeof i.kind==='string'&&i.kind.length>0&&typeof i.label==='string'&&i.label.length>0,'interaction '+i.id+' needs kind and label');});
    });
    if(sourceDoc&&typeof WorldV2Authoring!=='undefined'){
      var source;try{source=WorldV2Authoring.load(sourceDoc);}catch(e){errors.push(e.message);source=null;}
      if(source){need(source.provider.id===bundle.provider.id&&source.provider.worldRevision===bundle.provider.worldRevision,'source provider metadata drifted');
        need(source.placements.length===Object.keys(objects).length,'source placement count differs from bundle object count');
        source.placements.forEach(function(p){var o=objects[p.id];need(!!o,'source placement '+p.id+' is missing from bundle');if(o){
          need(o.asset===p.asset&&o.buildingDef===p.definitionId&&o.x===p.x&&o.z===p.z&&o.rot===p.rot&&o.yOffset===p.yOffset,'source placement '+p.id+' transform or identity drifted');}});}
    }
    return {ok:errors.length===0,errors:errors};
  }
  function serialize(bundle,source){var result=validate(bundle,source);if(!result.ok)throw new Error('[WorldV2BuildingBundle] '+result.errors.join('; '));return JSON.stringify(bundle);}
  return {SCHEMA:SCHEMA,VERSION:VERSION,interactionRows:interactionRows,compile:compile,validate:validate,serialize:serialize};
})();
