/* ================= WORLD V2 PROVIDER CONTRACT =================
 * Versioned, data-first boundary between authored 8x8 chunks and the running
 * game. Providers validate first, then their terrain hook starts residency
 * only after the renderer and collision runtime exist. This keeps every live
 * chunk handle real and disposable instead of materialising placeholder state
 * during the data-planning boot step.
 */
(function(global){
  'use strict';

  var CONTRACT_VERSION = 1;
  var CHUNK_SIZE = (typeof global.CHUNK === 'number') ? global.CHUNK : 8;
  var LAYER_NAMES = ['terrain','tileFlags','objects','interactions','mutations','spawns'];

  function assert(ok, message){ if(!ok) throw new Error('[WorldV2] '+message); }
  function finite(n){ return typeof n === 'number' && isFinite(n); }
  function integer(n){ return finite(n) && Math.floor(n) === n; }
  function key(cx,cz){ return cx+','+cz; }
  function tileToChunk(v){ return Math.floor(v / CHUNK_SIZE); }
  function copyRect(r){ return {x0:r.x0,z0:r.z0,w:r.w,h:r.h,cx:r.cx,cz:r.cz}; }
  function copyPoint(p){ return p ? {id:p.id,label:p.label,x:p.x,z:p.z,kind:p.kind||'landmark'} : null; }

  function validateRect(r){
    assert(r && finite(r.x0) && finite(r.z0) && finite(r.w) && finite(r.h), 'initialRect needs finite x0/z0/w/h');
    assert(r.w>0 && r.h>0, 'initialRect must have positive dimensions');
  }

  function validateChunk(raw){
    assert(raw && raw.v===CONTRACT_VERSION, 'chunk has an unsupported contract version');
    assert(integer(raw.cx) && integer(raw.cz), 'chunk coordinates must be integers');
    assert(raw.id===key(raw.cx,raw.cz), 'chunk id must match cx,cz');
    assert(raw.layers && typeof raw.layers==='object', 'chunk '+raw.id+' is missing layers');
    for(var i=0;i<LAYER_NAMES.length;i++){
      var name=LAYER_NAMES[i], layer=raw.layers[name];
      if(name==='terrain') assert(layer && typeof layer==='object' && !Array.isArray(layer), 'chunk '+raw.id+' needs a terrain object');
      else assert(Array.isArray(layer), 'chunk '+raw.id+' layer '+name+' must be an array');
    }
    var objectIds={};
    for(var oi=0;oi<raw.layers.objects.length;oi++){
      var obj=raw.layers.objects[oi];
      assert(obj&&typeof obj==='object'&&!Array.isArray(obj), 'chunk '+raw.id+' has an invalid object row');
      assert(typeof obj.id==='string'&&obj.id.length>0, 'chunk '+raw.id+' object needs an id');
      assert(!objectIds[obj.id], 'chunk '+raw.id+' has duplicate object '+obj.id);
      assert(typeof obj.asset==='string'&&obj.asset.length>0, 'object '+obj.id+' needs an asset id');
      assert(finite(obj.x)&&finite(obj.z), 'object '+obj.id+' needs finite x/z');
      assert(tileToChunk(obj.x)===raw.cx&&tileToChunk(obj.z)===raw.cz,
        'object '+obj.id+' must live in its declared chunk '+raw.id);
      if(obj.rot!==undefined) assert(finite(obj.rot), 'object '+obj.id+' rotation must be finite');
      if(obj.yOffset!==undefined) assert(finite(obj.yOffset), 'object '+obj.id+' yOffset must be finite');
      if(obj.buildingDef!==undefined) assert(typeof obj.buildingDef==='string'&&obj.buildingDef.length>0,
        'object '+obj.id+' buildingDef must be a non-empty id');
      if(obj.scale!==undefined){
        var scaleOk=finite(obj.scale)&&obj.scale>0;
        if(Array.isArray(obj.scale)) scaleOk=obj.scale.length===3&&obj.scale.every(function(v){return finite(v)&&v>0;});
        assert(scaleOk, 'object '+obj.id+' scale must be a positive number or xyz tuple');
      }
      if(obj.collider!==undefined&&obj.collider!==null){
        var circle=obj.collider&&obj.collider.type==='circle'&&finite(obj.collider.r)&&obj.collider.r>0;
        var rect=obj.collider&&obj.collider.type==='rect'&&finite(obj.collider.hw)&&finite(obj.collider.hd)
          &&obj.collider.hw>0&&obj.collider.hd>0;
        assert(circle||rect,'object '+obj.id+' has an invalid collider');
      }
      objectIds[obj.id]=true;
    }
    var interactionIds={};
    for(var ii=0;ii<raw.layers.interactions.length;ii++){
      var interaction=raw.layers.interactions[ii];
      assert(interaction&&typeof interaction==='object'&&!Array.isArray(interaction),
        'chunk '+raw.id+' has an invalid interaction row');
      assert(typeof interaction.id==='string'&&interaction.id.length>0,
        'chunk '+raw.id+' interaction needs an id');
      assert(!interactionIds[interaction.id], 'chunk '+raw.id+' has duplicate interaction '+interaction.id);
      assert(objectIds[interaction.objectId], 'interaction '+interaction.id+' references a missing local object');
      if(interaction.partId!==undefined) assert(typeof interaction.partId==='string'&&interaction.partId.length>0,
        'interaction '+interaction.id+' partId must be a non-empty id');
      assert(typeof interaction.kind==='string'&&interaction.kind.length>0,
        'interaction '+interaction.id+' needs a kind');
      assert(typeof interaction.label==='string'&&interaction.label.length>0,
        'interaction '+interaction.id+' needs a label');
      interactionIds[interaction.id]=true;
    }
    return raw;
  }

  function validateLandscape(raw){
    if(raw===undefined||raw===null) return null;
    assert(raw&&typeof raw==='object'&&!Array.isArray(raw), 'landscape contract must be an object');
    assert(integer(raw.revision)&&raw.revision>0, 'landscape revision must be a positive integer');
    assert(typeof raw.planId==='string'&&raw.planId.length>0, 'landscape planId is required');
    ['districts','routes','pads','water','underground'].forEach(function(name){
      assert(Array.isArray(raw[name]), 'landscape '+name+' must be an array');
    });
    var ids={};
    raw.districts.forEach(function(d){
      assert(d&&typeof d.id==='string'&&d.id.length>0&&!ids[d.id], 'landscape district needs a unique id');
      assert(Array.isArray(d.center)&&d.center.length===2&&d.center.every(finite), 'district '+d.id+' needs a finite center');
      assert(finite(d.radius)&&d.radius>0&&typeof d.role==='string', 'district '+d.id+' needs radius and role');
      ids[d.id]=true;
    });
    raw.routes.forEach(function(r){
      assert(r&&typeof r.id==='string'&&r.id.length>0&&!ids[r.id], 'landscape route needs a unique id');
      assert(finite(r.width)&&r.width>0&&Array.isArray(r.points)&&r.points.length>=2, 'route '+r.id+' needs width and points');
      r.points.forEach(function(point,index){
        assert(Array.isArray(point)&&point.length===2&&point.every(finite), 'route '+r.id+' has an invalid point');
        if(index){ var prev=r.points[index-1]; assert(point[0]===prev[0]||point[1]===prev[1], 'route '+r.id+' must be cardinal'); }
      });
      ids[r.id]=true;
    });
    raw.pads.forEach(function(p){
      assert(p&&typeof p.id==='string'&&p.id.length>0&&!ids[p.id], 'landscape pad needs a unique id');
      assert(finite(p.x)&&finite(p.z)&&finite(p.w)&&finite(p.d)&&p.w>0&&p.d>0, 'pad '+p.id+' needs finite positive bounds');
      assert(typeof p.role==='string'&&p.role.length>0, 'pad '+p.id+' needs a role'); ids[p.id]=true;
    });
    return raw;
  }

  function WorldProvider(spec){
    assert(spec && spec.contractVersion===CONTRACT_VERSION, 'provider has an unsupported contract version');
    assert(typeof spec.id==='string' && spec.id.length>0, 'provider id is required');
    assert(integer(spec.worldRevision) && spec.worldRevision>0, 'worldRevision must be a positive integer');
    validateRect(spec.initialRect);
    assert(Array.isArray(spec.chunks) && spec.chunks.length>0, 'provider needs at least one chunk');

    this.contractVersion=CONTRACT_VERSION;
    this.id=spec.id;
    this.label=spec.label||spec.id;
    this.worldRevision=spec.worldRevision;
    this.initialRect=copyRect(spec.initialRect);
    if(!finite(this.initialRect.cx)) this.initialRect.cx=this.initialRect.x0+this.initialRect.w/2;
    if(!finite(this.initialRect.cz)) this.initialRect.cz=this.initialRect.z0+this.initialRect.h/2;
    this.residentRadius=integer(spec.residentRadius) ? Math.max(0,spec.residentRadius) : 2;
    this.renderStrategy=spec.renderStrategy||'chunk-native';
    this.mapMetadata=spec.mapMetadata||{revision:1,landmarks:[]};
    this.landscape=validateLandscape(spec.landscape);
    this.landmarks=spec.landmarks||{};
    this.defaultLandmark=spec.defaultLandmark;
    this.hooks=spec.hooks||{};
    this._catalog=new Map();
    this._resident=new Map();
    this._lastCenterKey='';
    this._telemetry={
      provider:this.id, worldRevision:this.worldRevision, renderStrategy:this.renderStrategy,
      catalogChunks:0, residentChunks:0, residencyChanges:0, loaded:0, unloaded:0,
      lastResidencyMs:0, maxResidencyMs:0, lastCenter:null
    };

    for(var landmarkId in this.landmarks){
      var landmark=this.landmarks[landmarkId];
      assert(landmark && landmark.id===landmarkId, 'landmark key/id mismatch for '+landmarkId);
      assert(finite(landmark.x) && finite(landmark.z), 'landmark '+landmarkId+' needs finite x/z');
    }

    var allObjectIds={}, allInteractionIds={};
    for(var i=0;i<spec.chunks.length;i++){
      var chunk=validateChunk(spec.chunks[i]);
      assert(!this._catalog.has(chunk.id), 'duplicate chunk '+chunk.id);
      for(var oi=0;oi<chunk.layers.objects.length;oi++){
        var oid=chunk.layers.objects[oi].id;
        assert(!allObjectIds[oid], 'duplicate world object '+oid); allObjectIds[oid]=true;
      }
      for(var ii=0;ii<chunk.layers.interactions.length;ii++){
        var iid=chunk.layers.interactions[ii].id;
        assert(!allInteractionIds[iid], 'duplicate world interaction '+iid); allInteractionIds[iid]=true;
      }
      this._catalog.set(chunk.id,chunk);
    }
    this._telemetry.catalogChunks=this._catalog.size;
    assert(this.getSpawnLandmark(this.defaultLandmark), 'defaultLandmark must name a valid landmark');
  }

  WorldProvider.prototype.validate=function(){
    var expected=[];
    this._catalog.forEach(function(c){ try{ validateChunk(c); }catch(e){ expected.push(e.message); } });
    return {ok:expected.length===0, errors:expected, chunks:this._catalog.size,
      contractVersion:this.contractVersion, worldRevision:this.worldRevision};
  };
  WorldProvider.prototype.getWorldRect=function(){ return copyRect(this.initialRect); };
  WorldProvider.prototype.containsWorldPoint=function(x,z){
    var r=this.initialRect;
    return finite(x)&&finite(z)&&x>=r.x0&&z>=r.z0&&x<r.x0+r.w&&z<r.z0+r.h;
  };
  WorldProvider.prototype.getChunk=function(cx,cz){ return this._catalog.get(key(cx,cz))||null; };
  WorldProvider.prototype.catalogChunks=function(){
    return Array.from(this._catalog.values()).sort(function(a,b){ return a.cz-b.cz||a.cx-b.cx; });
  };
  WorldProvider.prototype.getChunkAtWorldTile=function(tx,tz){ return this.getChunk(tileToChunk(tx),tileToChunk(tz)); };
  WorldProvider.prototype.getSpawnLandmark=function(id){ return copyPoint(this.landmarks[id]); };
  WorldProvider.prototype.closestLandmark=function(x,z){
    var best=null, bestD=Infinity;
    for(var id in this.landmarks){
      var p=this.landmarks[id], d=(p.x-x)*(p.x-x)+(p.z-z)*(p.z-z);
      if(d<bestD){ bestD=d; best=p; }
    }
    return copyPoint(best||this.landmarks[this.defaultLandmark]);
  };
  WorldProvider.prototype.resolveSavedPosition=function(pos,worldMeta){
    var sameWorld=!worldMeta || (worldMeta.provider===this.id && worldMeta.worldRevision===this.worldRevision);
    if(sameWorld && Array.isArray(pos) && this.containsWorldPoint(Number(pos[0]),Number(pos[1])))
      return {x:Number(pos[0]),z:Number(pos[1]),relocated:false,reason:'saved-position'};
    var wanted=worldMeta && worldMeta.landmark;
    var p=this.getSpawnLandmark(wanted)||this.getSpawnLandmark(this.defaultLandmark);
    return {x:p.x,z:p.z,relocated:true,reason:sameWorld?'outside-resident-world':'world-revision'};
  };
  WorldProvider.prototype.prepare=function(){
    var check=this.validate();
    assert(check.ok, check.errors.join('; '));
    if(this.hooks.prepare) this.hooks.prepare(this);
    return check;
  };
  WorldProvider.prototype.buildTerrain=function(){
    assert(typeof this.hooks.buildTerrain==='function', 'provider '+this.id+' has no terrain hook');
    return this.hooks.buildTerrain(this);
  };
  WorldProvider.prototype.populate=function(){
    assert(typeof this.hooks.populate==='function', 'provider '+this.id+' has no population hook');
    return this.hooks.populate(this);
  };
  WorldProvider.prototype.chartCollision=function(){
    assert(typeof this.hooks.chartCollision==='function', 'provider '+this.id+' has no collision hook');
    return this.hooks.chartCollision(this);
  };
  WorldProvider.prototype.residentChunks=function(){
    var self=this, out=[];
    this._resident.forEach(function(handle,id){
      var chunk=self._catalog.get(id); if(chunk) out.push(chunk);
    });
    out.sort(function(a,b){ return a.cz-b.cz || a.cx-b.cx; });
    return out;
  };
  WorldProvider.prototype.isResident=function(cx,cz){ return this._resident.has(key(cx,cz)); };
  WorldProvider.prototype.updateResidency=function(x,z,force){
    var cx=tileToChunk(x), cz=tileToChunk(z), center=key(cx,cz);
    if(!force && center===this._lastCenterKey) return false;
    var t0=(global.performance&&global.performance.now)?global.performance.now():Date.now();
    var wanted=new Map(), candidates=[];
    for(var dz=-this.residentRadius;dz<=this.residentRadius;dz++){
      for(var dx=-this.residentRadius;dx<=this.residentRadius;dx++){
        var chunk=this.getChunk(cx+dx,cz+dz);
        if(chunk) candidates.push({chunk:chunk,d:Math.abs(dx)+Math.abs(dz)});
      }
    }
    candidates.sort(function(a,b){ return a.d-b.d || a.chunk.cz-b.chunk.cz || a.chunk.cx-b.chunk.cx; });
    for(var i=0;i<candidates.length;i++) wanted.set(candidates[i].chunk.id,candidates[i].chunk);

    var remove=[];
    this._resident.forEach(function(handle,id){ if(!wanted.has(id)) remove.push({id:id,handle:handle}); });
    remove.sort(function(a,b){ return a.id.localeCompare(b.id); });
    for(var r=0;r<remove.length;r++){
      if(this.hooks.unloadChunk) this.hooks.unloadChunk(remove[r].handle,this._catalog.get(remove[r].id),this);
      this._resident.delete(remove[r].id); this._telemetry.unloaded++;
    }
    for(var c=0;c<candidates.length;c++){
      var item=candidates[c].chunk;
      if(this._resident.has(item.id)) continue;
      var handle=this.hooks.loadChunk ? this.hooks.loadChunk(item,this) : {id:item.id,dataOnly:true};
      this._resident.set(item.id,handle||{id:item.id}); this._telemetry.loaded++;
    }
    this._lastCenterKey=center;
    this._telemetry.residentChunks=this._resident.size;
    this._telemetry.residencyChanges++;
    this._telemetry.lastCenter={cx:cx,cz:cz};
    var t1=(global.performance&&global.performance.now)?global.performance.now():Date.now();
    this._telemetry.lastResidencyMs=+(t1-t0).toFixed(3);
    this._telemetry.maxResidencyMs=Math.max(this._telemetry.maxResidencyMs,this._telemetry.lastResidencyMs);
    return true;
  };
  WorldProvider.prototype.dispose=function(){
    var ids=Array.from(this._resident.keys()).sort();
    for(var i=0;i<ids.length;i++){
      var id=ids[i], handle=this._resident.get(id);
      if(this.hooks.unloadChunk) this.hooks.unloadChunk(handle,this._catalog.get(id),this);
      this._telemetry.unloaded++;
    }
    this._resident.clear(); this._lastCenterKey=''; this._telemetry.residentChunks=0;
    if(this.hooks.dispose) this.hooks.dispose(this);
  };
  WorldProvider.prototype.snapshot=function(){
    var out={}; for(var k in this._telemetry) out[k]=this._telemetry[k];
    out.residentIds=Array.from(this._resident.keys()).sort();
    if(this.landscape) out.landscape={planId:this.landscape.planId,revision:this.landscape.revision,
      districts:this.landscape.districts.length,routes:this.landscape.routes.length,
      pads:this.landscape.pads.length,water:this.landscape.water.length,
      underground:this.landscape.underground.length};
    if(this.hooks.snapshot) out.runtime=this.hooks.snapshot(this);
    return out;
  };

  var registry=new Map();
  var api={
    CONTRACT_VERSION:CONTRACT_VERSION,
    CHUNK_SIZE:CHUNK_SIZE,
    LAYER_NAMES:LAYER_NAMES.slice(),
    active:null,
    key:key,
    tileToChunk:tileToChunk,
    validateChunk:validateChunk,
    register:function(spec){
      var provider=new WorldProvider(spec);
      assert(!registry.has(provider.id), 'provider '+provider.id+' is already registered');
      registry.set(provider.id,provider); return provider;
    },
    activate:function(id){
      var provider=registry.get(id); assert(provider, 'unknown provider '+id);
      if(this.active && this.active!==provider) this.active.dispose();
      this.active=provider; return provider;
    },
    get:function(id){ return registry.get(id)||null; },
    snapshot:function(){ return this.active ? this.active.snapshot() : null; }
  };

  global.WorldProvider=WorldProvider;
  global.WorldV2=api;
})(window);
