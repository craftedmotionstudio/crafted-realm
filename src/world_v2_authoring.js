/* ================= WORLD V2 AUTHORING =================
 * Pure, deterministic authoring documents for complete-building placements.
 * Runtime providers remain authoritative until a reviewed document is integrated.
 */
var WorldV2Authoring=(function(){
  'use strict';

  var SCHEMA='crafted-realm-world-v2-authoring-v1';
  var VERSION=1;
  var CHUNK_SIZE=8;

  function finite(n){ return typeof n==='number'&&isFinite(n); }
  function positiveInteger(n){ return finite(n)&&n>0&&Math.floor(n)===n; }
  function stringValue(v){ return typeof v==='string'&&v.length>0; }
  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function definition(id){
    return typeof WorldV2BuildingData!=='undefined'&&WorldV2BuildingData.get(id);
  }
  function canonical(doc){
    var copy=clone(doc);
    copy.placements.sort(function(a,b){ return a.id<b.id?-1:a.id>b.id?1:0; });
    return copy;
  }
  function validationError(result){
    var error=new Error('[WorldV2Authoring] '+result.errors.join('; '));
    error.name='WorldV2AuthoringValidationError';
    return error;
  }
  function assertValid(doc){
    var result=validate(doc);
    if(!result.ok) throw validationError(result);
    return canonical(doc);
  }
  function validate(doc){
    var errors=[];
    function need(ok,message){ if(!ok) errors.push(message); }
    need(!!doc&&typeof doc==='object'&&!Array.isArray(doc),'document must be an object');
    if(!doc) return {ok:false,errors:errors};
    need(doc.schema===SCHEMA,'schema must be '+SCHEMA);
    need(doc.version===VERSION,'version must be '+VERSION);
    need(doc.chunkSize===CHUNK_SIZE,'chunkSize must be '+CHUNK_SIZE);
    need(doc.provider&&stringValue(doc.provider.id),'provider.id must be a non-empty string');
    need(doc.provider&&positiveInteger(doc.provider.worldRevision),'provider.worldRevision must be a positive integer');
    need(Array.isArray(doc.placements),'placements must be an array');
    if(!Array.isArray(doc.placements)) return {ok:false,errors:errors};
    var ids={};
    doc.placements.forEach(function(row,index){
      var prefix='placement['+index+'] ';
      need(row&&typeof row==='object'&&!Array.isArray(row),prefix+'must be an object');
      if(!row) return;
      need(stringValue(row.id),prefix+'id must be a non-empty string');
      if(stringValue(row.id)){
        need(!ids[row.id],'duplicate placement id '+row.id);
        ids[row.id]=true;
      }
      need(stringValue(row.definitionId),prefix+'definitionId must be a non-empty string');
      var def=stringValue(row.definitionId)?definition(row.definitionId):null;
      need(!!def,'unknown building definition '+row.definitionId);
      need(positiveInteger(row.definitionRevision),prefix+'definitionRevision must be a positive integer');
      if(def&&positiveInteger(row.definitionRevision)) need(row.definitionRevision===def.revision,
        'stale definition revision for '+row.definitionId+': expected '+def.revision);
      need(stringValue(row.asset),prefix+'asset must be a non-empty string');
      if(def&&stringValue(row.asset)) need(row.asset===def.assetId,'asset must match definition '+row.definitionId);
      ['x','z','rot','yOffset'].forEach(function(key){ need(finite(row[key]),prefix+key+' must be finite'); });
    });
    return {ok:errors.length===0,errors:errors};
  }
  function createDocument(providerId,worldRevision){
    return assertValid({schema:SCHEMA,version:VERSION,chunkSize:CHUNK_SIZE,
      provider:{id:providerId,worldRevision:worldRevision},placements:[]});
  }
  function addBuilding(doc,definitionId,placement){
    var next=assertValid(doc),def=definition(definitionId),p=placement||{};
    if(!def) throw validationError({errors:['unknown building definition '+definitionId]});
    next.placements.push({id:p.id,definitionId:def.id,definitionRevision:def.revision,asset:def.assetId,
      x:p.x,z:p.z,rot:p.rot,yOffset:finite(p.yOffset)?p.yOffset:(def.placement&&finite(def.placement.yOffset)?def.placement.yOffset:0)});
    return assertValid(next);
  }
  function moveBuilding(doc,id,transform){
    var next=assertValid(doc),found=false,t=transform||{};
    next.placements=next.placements.map(function(row){
      if(row.id!==id) return row;
      found=true;
      return {id:row.id,definitionId:row.definitionId,definitionRevision:row.definitionRevision,asset:row.asset,
        x:t.x,z:t.z,rot:t.rot,yOffset:t.yOffset===undefined?row.yOffset:t.yOffset};
    });
    if(!found) throw validationError({errors:['unknown placement id '+id]});
    return assertValid(next);
  }
  function removeBuilding(doc,id){
    var next=assertValid(doc),before=next.placements.length;
    next.placements=next.placements.filter(function(row){ return row.id!==id; });
    if(next.placements.length===before) throw validationError({errors:['unknown placement id '+id]});
    return assertValid(next);
  }
  function toChunkRows(doc){
    var valid=assertValid(doc),chunks={};
    valid.placements.forEach(function(row){
      var cx=Math.floor(row.x/CHUNK_SIZE),cz=Math.floor(row.z/CHUNK_SIZE),id=cx+','+cz;
      if(!chunks[id]) chunks[id]={id:id,cx:cx,cz:cz,objects:[]};
      chunks[id].objects.push({id:row.id,asset:row.asset,buildingDef:row.definitionId,
        x:row.x,z:row.z,rot:row.rot,yOffset:row.yOffset});
    });
    return Object.keys(chunks).map(function(id){
      chunks[id].objects.sort(function(a,b){ return a.id<b.id?-1:a.id>b.id?1:0; });
      return chunks[id];
    }).sort(function(a,b){ return a.cx-b.cx||a.cz-b.cz; });
  }
  function serialize(doc){ return JSON.stringify(assertValid(doc)); }
  function load(textOrObject){
    var value=textOrObject;
    if(typeof value==='string'){
      try{ value=JSON.parse(value); }
      catch(e){ throw validationError({errors:['document JSON is malformed']}); }
    }
    return assertValid(value);
  }
  function acceptance(){
    var checks=[];
    function add(label,ok){ checks.push({label:label,ok:!!ok}); }
    function rejects(fn,text){ try{ fn(); }catch(e){ return String(e.message).indexOf(text)>=0; } return false; }
    var empty=createDocument('studio-guide-hall',1);
    add('empty document validates',validate(empty).ok&&empty.placements.length===0);
    add('empty serialization is deterministic',serialize(empty)===serialize(empty)&&serialize(empty)===serialize(empty));
    var hall=WorldV2BuildingData.get('holm_guide_hall_v1');
    var added=addBuilding(empty,hall.id,{id:'studio-guide-hall',x:151,z:155,rot:0});
    var rows=toChunkRows(added),object=rows[0]&&rows[0].objects[0];
    add('Guide Hall projects to its expected owner chunk',rows.length===1&&rows[0].id==='18,19');
    add('projected row matches the runtime object contract',object&&object.id==='studio-guide-hall'&&
      object.asset===hall.assetId&&object.buildingDef===hall.id&&finite(object.x)&&finite(object.z)&&finite(object.rot)&&finite(object.yOffset));
    var moved=moveBuilding(added,'studio-guide-hall',{x:160,z:155,rot:0});
    add('move recomputes exactly one owner chunk',toChunkRows(moved).length===1&&toChunkRows(moved)[0].id==='20,19');
    add('move preserves identity, revision, and asset',moved.placements[0].id===added.placements[0].id&&
      moved.placements[0].definitionRevision===added.placements[0].definitionRevision&&moved.placements[0].asset===added.placements[0].asset);
    add('mutations leave source documents unchanged',added.placements[0].x===151&&empty.placements.length===0);
    var roundTrip=load(serialize(moved)),serialized=serialize(roundTrip);
    add('save load serialize is byte-identical three times',serialized===serialize(load(serialized))&&serialized===serialize(load(serialize(load(serialized)))));
    var removed=removeBuilding(moved,'studio-guide-hall');
    add('remove leaves no placement or dangling chunk',removed.placements.length===0&&toChunkRows(removed).length===0);
    add('duplicate placement ids fail closed',rejects(function(){ addBuilding(added,hall.id,{id:'studio-guide-hall',x:1,z:1,rot:0}); },'duplicate placement id'));
    add('unknown definitions fail closed',rejects(function(){ addBuilding(empty,'missing',{id:'x',x:1,z:1,rot:0}); },'unknown building definition'));
    var stale=clone(added);stale.placements[0].definitionRevision--;
    add('stale revisions fail closed',rejects(function(){ load(stale); },'stale definition revision'));
    add('non-finite transforms fail closed',rejects(function(){ moveBuilding(added,'studio-guide-hall',{x:Infinity,z:1,rot:0}); },'x must be finite'));
    add('wrong schema fails closed',rejects(function(){ var d=clone(empty);d.schema='wrong';load(d); },'schema must be'));
    add('wrong version fails closed',rejects(function(){ var d=clone(empty);d.version=2;load(d); },'version must be'));
    add('wrong chunk size fails closed',rejects(function(){ var d=clone(empty);d.chunkSize=16;load(d); },'chunkSize must be'));
    add('malformed provider metadata fails closed',rejects(function(){ var d=clone(empty);d.provider={id:'',worldRevision:0};load(d); },'provider.id'));
    add('current complete building definitions still validate',WorldV2BuildingData.all().every(function(def){return WorldV2BuildingData.validate(def).ok;}));
    return {ok:checks.every(function(check){return check.ok;}),checks:checks,
      errors:checks.filter(function(check){return !check.ok;}).map(function(check){return check.label;})};
  }

  var api={SCHEMA:SCHEMA,VERSION:VERSION,createDocument:createDocument,validate:validate,
    addBuilding:addBuilding,moveBuilding:moveBuilding,removeBuilding:removeBuilding,
    toChunkRows:toChunkRows,serialize:serialize,load:load,acceptance:acceptance};
  var result=acceptance();
  if(!result.ok){
    var failure=new Error('[WORLD_V2_AUTHORING] acceptance failed: '+result.errors.join('; '));
    failure.name='WorldV2AuthoringAcceptanceError';
    throw failure;
  }
  console.log('[WORLD_V2_AUTHORING] '+result.checks.length+'/'+result.checks.length+' acceptance ok');
  return api;
})();
