/* ================= WORLD V2 OBJECT RUNTIME =================
 * Chunk-owned static object/interaction handles. Asset templates are built once
 * and deep-cloned with shared geometry/material references on every residency
 * load. Instances, raycast registrations, and colliders are released with their
 * chunk; shared GPU resources live until provider disposal.
 */
var WorldV2Objects=(function(){
  'use strict';
  function blockMat(color){ return new THREE.MeshLambertMaterial({color:color}); }
  function buildHolmFoundation(){
    var g=new THREE.Group();
    var slab=new THREE.Mesh(new THREE.BoxGeometry(1,0.18,1),blockMat(0x4d4942)); slab.position.y=0.09; g.add(slab);
    var inset=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.04,0.82),blockMat(0x776e5d)); inset.position.y=0.20; g.add(inset);
    return g;
  }
  function buildHolmOak(){
    var g=new THREE.Group(), trunkMat=blockMat(0x6a4a2f), leaf=blockMat(0x55723b),leafD=blockMat(0x405c31);
    var trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.38,2.2,7),trunkMat); trunk.position.y=1.1; g.add(trunk);
    [[-0.45,2.55,0.05,0.78],[0.38,2.65,0.18,0.74],[0,3.18,-0.1,0.72],[-0.05,2.83,-0.42,0.68]].forEach(function(p,i){
      var crown=new THREE.Mesh(new THREE.IcosahedronGeometry(p[3],1),i%2?leaf:leafD);
      crown.position.set(p[0],p[1],p[2]); crown.scale.y=0.78; g.add(crown);
    });
    return g;
  }
  function buildHolmRock(){
    var g=new THREE.Group(),m1=blockMat(0x756f66),m2=blockMat(0x8d8578);
    [[-0.25,0.36,0,0.52],[0.28,0.28,0.12,0.40],[0,-0.02,-0.22,0.32]].forEach(function(p,i){
      var rock=new THREE.Mesh(new THREE.DodecahedronGeometry(p[3],0),i===1?m2:m1);
      rock.position.set(p[0],p[1],p[2]); rock.scale.y=0.72; rock.rotation.y=i*0.8; g.add(rock);
    });
    return g;
  }
  function buildHolmFence(){
    var g=new THREE.Group(),wood=blockMat(0x765334),dark=blockMat(0x523823);
    [-1,1].forEach(function(x){
      var post=new THREE.Mesh(new THREE.BoxGeometry(0.15,1.15,0.15),dark); post.position.set(x,0.58,0); g.add(post);
      var cap=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.28,4),dark); cap.position.set(x,1.29,0); cap.rotation.y=Math.PI/4; g.add(cap);
    });
    [0.42,0.78].forEach(function(y){ var rail=new THREE.Mesh(new THREE.BoxGeometry(2,0.12,0.10),wood); rail.position.y=y; g.add(rail); });
    return g;
  }
  function buildHolmBridge(){
    var g=new THREE.Group(),deck=blockMat(0x80603c),edge=blockMat(0x563b24);
    for(var i=-9;i<9;i++){
      var plank=new THREE.Mesh(new THREE.BoxGeometry(0.92,0.18,3.5),i%2?deck:edge); plank.position.set(i+0.5,0.12,0); g.add(plank);
    }
    [-1.82,1.82].forEach(function(z){
      var rail=new THREE.Mesh(new THREE.BoxGeometry(18,0.13,0.12),edge); rail.position.set(0,1.02,z); g.add(rail);
      for(var x=-8.5;x<=8.5;x+=3){ var post=new THREE.Mesh(new THREE.BoxGeometry(0.16,1.15,0.16),edge); post.position.set(x,0.58,z); g.add(post); }
    });
    return g;
  }
  function buildHolmPier(){
    var g=new THREE.Group(),deck=blockMat(0x80603c),edge=blockMat(0x563b24),rope=blockMat(0x9b865a);
    for(var i=-4;i<4;i++){
      var plank=new THREE.Mesh(new THREE.BoxGeometry(0.92,0.16,2.15),i%2?deck:edge);
      plank.position.set(i+0.5,0.12,0); g.add(plank);
    }
    [-1.0,1.0].forEach(function(z){
      for(var x=-3.5;x<=3.5;x+=3.5){
        var post=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.13,1.15,6),edge);
        post.position.set(x,0.55,z); g.add(post);
      }
      var rail=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,7.2,6),rope);
      rail.rotation.z=Math.PI/2; rail.position.set(0,0.92,z); g.add(rail);
    });
    return g;
  }
  function buildHolmBankChest(){
    var g=new THREE.Group(),wood=blockMat(0x684724),dark=blockMat(0x3e2a18),iron=blockMat(0x8d877c);
    var box=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.62,0.78),wood); box.position.y=0.34; g.add(box);
    var lid=new THREE.Mesh(new THREE.CylinderGeometry(0.39,0.39,1.18,8,1,false,0,Math.PI),wood);
    lid.rotation.z=Math.PI/2; lid.rotation.y=Math.PI/2; lid.position.y=0.67; g.add(lid);
    [-0.42,0.42].forEach(function(x){ var band=new THREE.Mesh(new THREE.BoxGeometry(0.10,0.78,0.82),iron); band.position.set(x,0.43,0); g.add(band); });
    var lock=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.24,0.08),dark); lock.position.set(0,0.48,0.43); g.add(lock);
    return g;
  }
  var MANIFEST={
    supply_crate:{build:function(){ return buildCrate(); }},
    supply_barrel:{build:function(){ return buildBarrel(); }},
    supply_bucket:{build:function(){ return buildBucket(); }},
    holm_rowboat:{build:function(){
      if(typeof makeRefRowboat!=='function') throw new Error('Rowboat asset builder is unavailable');
      return makeRefRowboat(0,0,0);
    }},
    holm_foundation:{build:buildHolmFoundation},
    holm_oak:{build:buildHolmOak},
    holm_rock:{build:buildHolmRock},
    holm_fence:{build:buildHolmFence},
    holm_bridge:{build:buildHolmBridge},
    holm_pier:{build:buildHolmPier},
    holm_bank_chest:{build:buildHolmBankChest},
    holm_guide_hall:{build:function(){
      if(typeof WorldV2Buildings==='undefined') throw new Error('World v2 building composer is unavailable');
      return WorldV2Buildings.build(THREE,'holm_guide_hall_v1');
    }},
    holm_survival_workyard:{build:function(){
      if(typeof WorldV2Buildings==='undefined') throw new Error('World v2 building composer is unavailable');
      return WorldV2Buildings.build(THREE,'holm_survival_workyard_v1');
    }}
  };
  var state={ready:false,provider:null,templates:new Map(),active:new Map(),geometries:new Set(),
    materials:new Set(),textures:new Set(),catalogObjectChunks:[],templateBuilds:0,cacheHits:0,
    instancesCreated:0,instancesReleased:0,liveInstances:0,clickables:0,colliders:0,
    buildings:0,interiors:0,doors:0,loads:0,unloads:0};

  /* Test-only, one-shot asset failure. The token is stored before throwing, so
   * the loading screen's clean-page retry can recover while keeping the same URL.
   * It is completely dormant unless both query parameters are present. */
  function injectFailureOnce(asset){
    var q;
    try{ q=new URLSearchParams(location.search); }catch(e){ return; }
    var wanted=q.get('failAsset'),token=q.get('failToken');
    if(!wanted||!token||wanted!==asset) return;
    var key='cr_asset_fail_seen_'+token.replace(/[^a-zA-Z0-9_.-]/g,'_');
    try{
      if(sessionStorage.getItem(key)==='1') return;
      sessionStorage.setItem(key,'1');
    }catch(e){ return; }
    throw new Error('[WorldV2Objects] injected recoverable asset failure for '+asset);
  }

  function removeFrom(list,obj){ var i=list.indexOf(obj); if(i>=0) list.splice(i,1); }
  function findPart(root,id){
    if(typeof WorldV2Buildings!=='undefined'&&WorldV2Buildings.findPart) return WorldV2Buildings.findPart(root,id);
    var found=null; root.traverse(function(o){ if(!found&&o.userData&&o.userData.partId===id) found=o; }); return found;
  }
  function worldPoint(root,x,z){
    root.updateMatrixWorld(true);
    return root.localToWorld(new THREE.Vector3(x||0,0,z||0));
  }
  function quarterTurn(rot){
    var q=Math.round((rot||0)/(Math.PI/2)); return ((q%4)+4)%4;
  }
  function localCollider(root,raw,owner){
    var p=worldPoint(root,raw.x,raw.z), turns=quarterTurn(root.rotation.y), sx=Math.abs(root.scale.x||1),sz=Math.abs(root.scale.z||1);
    if(raw.type==='circle') return {type:'circle',x:p.x,z:p.z,r:raw.r*Math.max(sx,sz),worldObjectId:owner,role:raw.role};
    if(raw.type==='obox') return {type:'obox',x:p.x,z:p.z,hw:raw.hw*sx,hd:raw.hd*sz,
      rot:(raw.rot||0)-root.rotation.y,worldObjectId:owner,role:raw.role};
    var swap=turns%2===1, hw=swap?raw.hd*sz:raw.hw*sx, hd=swap?raw.hw*sx:raw.hd*sz;
    return {type:'rect',x:p.x,z:p.z,hw:hw,hd:hd,worldObjectId:owner,role:raw.role};
  }
  function pushClickable(runtime,target){
    if(runtime.clickables.indexOf(target)>=0) return;
    WORLD.clickables.push(target); runtime.clickables.push(target); state.clickables++;
  }
  function attachBuilding(mesh,placement,interactionRows){
    if(!placement.buildingDef) return null;
    if(typeof WorldV2BuildingData==='undefined') throw new Error('Building data is unavailable for '+placement.id);
    var def=WorldV2BuildingData.get(placement.buildingDef);
    if(!def) throw new Error('Unknown building definition '+placement.buildingDef);
    var check=WorldV2BuildingData.validate(def);
    if(!check.ok) throw new Error('Invalid building '+placement.buildingDef+': '+check.errors.join('; '));
    var runtime={definition:def,clickables:[],colliders:[],doors:[],interiors:[],roofs:[],walkSurfaces:null};
    var interactionByPart={};
    for(var i=0;i<interactionRows.length;i++){
      var row=interactionRows[i],target=row.partId?findPart(mesh,row.partId):mesh;
      if(!target) throw new Error('Interaction '+row.id+' cannot find building part '+row.partId);
      if(row.partId&&interactionByPart[row.partId]) throw new Error('Duplicate interaction part '+row.partId+' on '+placement.id);
      target.userData=Object.assign({},target.userData||{},
        {kind:row.kind,label:row.label,examine:row.examine||'Nothing unusual.',
          inspectOnly:!!row.inspectOnly,inspectName:row.inspectName||null,
          inspectMessage:row.inspectMessage||row.examine||null,
          worldObjectId:placement.id,worldChunkId:mesh.userData.worldChunkId});
      pushClickable(runtime,target); if(row.partId) interactionByPart[row.partId]=row;
    }
    for(var ci=0;ci<def.colliders.length;ci++){
      var col=localCollider(mesh,def.colliders[ci],placement.id); WORLD.colliders.push(col);
      runtime.colliders.push(col); state.colliders++;
    }
    if(def.walkSurfaces&&def.walkSurfaces.length){
      if(typeof WorldWalkSurfaces==='undefined') throw new Error('Authored walk-surface runtime is unavailable for '+placement.id);
      runtime.walkSurfaces=WorldWalkSurfaces.register(mesh,def.walkSurfaces,placement.id);
    }
    for(var di=0;di<def.doors.length;di++){
      var doorDef=def.doors[di],door=findPart(mesh,doorDef.id);
      if(!door) throw new Error('Building '+placement.id+' is missing door part '+doorDef.id);
      door.rotation.y=doorDef.closedRot;
      var opening=doorDef.opening||{x:doorDef.x,z:doorDef.z};
      var localDoorCol={type:'rect',x:opening.x,z:opening.z,hw:doorDef.width/2+0.05,hd:0.16,role:'door'};
      if(doorDef.side==='E'||doorDef.side==='W') localDoorCol={type:'rect',x:opening.x,z:opening.z,hw:0.16,hd:doorDef.width/2+0.05,role:'door'};
      var doorCol=localCollider(mesh,localDoorCol,placement.id); doorCol.door=true;
      var inside=doorDef.entry&&doorDef.entry.inside?
        worldPoint(mesh,doorDef.entry.inside[0],doorDef.entry.inside[1]):worldPoint(mesh,opening.x,opening.z);
      var outside=doorDef.entry&&doorDef.entry.outside?
        worldPoint(mesh,doorDef.entry.outside[0],doorDef.entry.outside[1]):worldPoint(mesh,opening.x,opening.z);
      var openingPoint=worldPoint(mesh,opening.x,opening.z);
      door.userData=Object.assign({},door.userData||{},
        {kind:'door',open:false,closedRot:doorDef.closedRot,openRot:doorDef.openRot,col:doorCol,
          entryInside:{x:inside.x,z:inside.z},entryOutside:{x:outside.x,z:outside.z},
          openingPoint:{x:openingPoint.x,z:openingPoint.z},
          label:(interactionByPart[doorDef.id]&&interactionByPart[doorDef.id].label)||'Open <b>Door</b>'});
      WORLD.colliders.push(doorCol); runtime.colliders.push(doorCol); state.colliders++;
      WORLD.doors=WORLD.doors||[]; WORLD.doors.push(door); runtime.doors.push(door); state.doors++;
      pushClickable(runtime,door);
    }
    var roof=findPart(mesh,'roof'),bounds=def.interiorBounds||{x:0,z:0,w:def.footprint.w,d:def.footprint.d};
    var center=worldPoint(mesh,bounds.x,bounds.z),turns=quarterTurn(mesh.rotation.y);
    if(!roof) throw new Error('Building '+placement.id+' is missing its roof part');
    var entryDoor=def.doors.filter(function(d){return def.flow&&d.id===def.flow.entryDoor;})[0]||def.doors[0];
    var outside=entryDoor&&entryDoor.entry&&entryDoor.entry.outside||[0,bounds.d/2+0.9];
    var doorPoint=worldPoint(mesh,outside[0],outside[1]);
    var interior={x:center.x,z:center.z,hw:(turns%2?bounds.d:bounds.w)/2-0.25,
      hd:(turns%2?bounds.w:bounds.d)/2-0.25,roof:roof,band:null,
      door:{x:doorPoint.x,z:doorPoint.z},
      buildingId:placement.id,rooms:def.rooms};
    WORLD.interiors.push(interior); runtime.interiors.push(interior); state.interiors++;
    var roofEntry={mesh:roof,x:center.x,z:center.z,
      hw:(turns%2?bounds.d:bounds.w)/2,hd:(turns%2?bounds.w:bounds.d)/2,
      buildingId:placement.id};
    WORLD.roofs.push(roofEntry); runtime.roofs.push(roofEntry);
    state.buildings++;
    return runtime;
  }
  function collect(root){
    root.traverse(function(o){ if(!o.isMesh) return;
      if(o.geometry) state.geometries.add(o.geometry);
      var mats=Array.isArray(o.material)?o.material:[o.material];
      for(var i=0;i<mats.length;i++) if(mats[i]){
        state.materials.add(mats[i]); if(mats[i].map) state.textures.add(mats[i].map);
      }
    });
  }
  function template(asset){
    if(state.templates.has(asset)){ state.cacheHits++; return state.templates.get(asset); }
    var entry=MANIFEST[asset];
    if(!entry) throw new Error('[WorldV2Objects] unknown asset '+asset);
    injectFailureOnce(asset);
    var root=entry.build();
    if(!root||!root.traverse) throw new Error('[WorldV2Objects] asset '+asset+' did not return an Object3D');
    root.position.set(0,0,0); root.rotation.set(0,0,0); root.name='template-'+asset;
    collect(root); state.templates.set(asset,root); state.templateBuilds++;
    return root;
  }
  function init(provider){
    if(state.ready&&state.provider===provider) return;
    if(state.ready) dispose();
    state.templateBuilds=0; state.cacheHits=0; state.instancesCreated=0; state.instancesReleased=0;
    state.liveInstances=0; state.clickables=0; state.colliders=0; state.buildings=0; state.interiors=0; state.doors=0;
    state.loads=0; state.unloads=0;
    state.provider=provider; state.ready=true;
    state.catalogObjectChunks=provider.catalogChunks().filter(function(c){ return c.layers.objects.length>0; })
      .map(function(c){ return c.id; });
  }
  function loadChunk(chunk){
    if(!state.ready) return {id:chunk.id,dataOnly:true};
    if(state.active.has(chunk.id)) throw new Error('[WorldV2Objects] duplicate load '+chunk.id);
    var interactions={};
    for(var ii=0;ii<chunk.layers.interactions.length;ii++){
      var interactionRow=chunk.layers.interactions[ii];
      (interactions[interactionRow.objectId]||(interactions[interactionRow.objectId]=[])).push(interactionRow);
    }
    var instances=[];
    for(var i=0;i<chunk.layers.objects.length;i++){
      var def=chunk.layers.objects[i], mesh=template(def.asset).clone(true), interactionRows=interactions[def.id]||[];
      mesh.position.set(def.x,gy(def.x,def.z)+(def.yOffset||0),def.z); mesh.rotation.y=def.rot||0;
      if(Array.isArray(def.scale)) mesh.scale.set(def.scale[0],def.scale[1],def.scale[2]);
      else if(def.scale!==undefined) mesh.scale.setScalar(def.scale);
      mesh.name='world-object-'+def.id;
      mesh.userData=Object.assign({},mesh.userData||{},
        {worldObjectId:def.id,worldChunkId:chunk.id,asset:def.asset,alive:true,buildingDef:def.buildingDef||null});
      mesh.traverse(function(o){ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
      scene.add(mesh); mesh.updateMatrixWorld(true);
      var building=attachBuilding(mesh,def,interactionRows), collider=null, clickable=false;
      if(!building&&interactionRows.length){
        if(interactionRows.length>1) throw new Error('Object '+def.id+' has multiple root interactions without part ids');
        var interaction=interactionRows[0];
        mesh.userData.kind=interaction.kind; mesh.userData.label=interaction.label;
        mesh.userData.examine=interaction.examine||'Nothing unusual.';
        WORLD.clickables.push(mesh); state.clickables++; clickable=true;
      }
      if(def.collider){
        collider=def.collider.type==='rect'
          ? {type:'rect',x:def.x,z:def.z,hw:def.collider.hw,hd:def.collider.hd,worldObjectId:def.id}
          : {type:'circle',x:def.x,z:def.z,r:def.collider.r,worldObjectId:def.id};
        WORLD.colliders.push(collider); state.colliders++;
      }
      instances.push({mesh:mesh,collider:collider,clickable:clickable,building:building});
      state.instancesCreated++; state.liveInstances++;
    }
    var handle={id:chunk.id,instances:instances};
    state.active.set(chunk.id,handle); state.loads++;
    return handle;
  }
  function unloadChunk(handle){
    if(!handle||!handle.instances) return;
    for(var i=0;i<handle.instances.length;i++){
      var item=handle.instances[i]; scene.remove(item.mesh);
      if(item.clickable){ removeFrom(WORLD.clickables,item.mesh); state.clickables--; }
      if(item.collider){ removeFrom(WORLD.colliders,item.collider); state.colliders--; }
      if(item.building){
        var b=item.building;
        if(b.walkSurfaces&&typeof WorldWalkSurfaces!=='undefined') WorldWalkSurfaces.unregister(b.walkSurfaces);
        for(var ci=0;ci<b.clickables.length;ci++){ removeFrom(WORLD.clickables,b.clickables[ci]); state.clickables--; }
        for(var co=0;co<b.colliders.length;co++){
          if(WORLD.colliders.indexOf(b.colliders[co])>=0) removeFrom(WORLD.colliders,b.colliders[co]);
          state.colliders--;
        }
        for(var di=0;di<b.doors.length;di++){ removeFrom(WORLD.doors,b.doors[di]); state.doors--; }
        for(var ii=0;ii<b.interiors.length;ii++){ removeFrom(WORLD.interiors,b.interiors[ii]); state.interiors--; }
        for(var ri=0;ri<b.roofs.length;ri++) removeFrom(WORLD.roofs,b.roofs[ri]);
        state.buildings--;
      }
      state.instancesReleased++; state.liveInstances--;
    }
    state.active.delete(handle.id); state.unloads++;
  }
  function dispose(){
    Array.from(state.active.values()).forEach(unloadChunk);
    if(typeof WorldWalkSurfaces!=='undefined') WorldWalkSurfaces.clear();
    state.geometries.forEach(function(g){ g.dispose(); });
    state.materials.forEach(function(m){ m.dispose(); });
    state.textures.forEach(function(t){ t.dispose(); });
    state.templates.clear(); state.active.clear(); state.geometries.clear(); state.materials.clear(); state.textures.clear();
    state.provider=null; state.ready=false; state.catalogObjectChunks=[];
  }
  function ownsObject(id){
    if(!state.provider) return false;
    var chunks=state.provider.catalogChunks();
    for(var i=0;i<chunks.length;i++) for(var j=0;j<chunks[i].layers.objects.length;j++)
      if(chunks[i].layers.objects[j].id===id) return true;
    return false;
  }
  function snapshot(){
    var liveObjectIds=[];
    state.active.forEach(function(handle){
      (handle.instances||[]).forEach(function(item){
        if(item.mesh&&item.mesh.userData&&item.mesh.userData.worldObjectId)liveObjectIds.push(item.mesh.userData.worldObjectId);
      });
    });
    return {ready:state.ready,manifestAssets:Object.keys(MANIFEST).length,templates:state.templates.size,
      sharedGeometries:state.geometries.size,sharedMaterials:state.materials.size,sharedTextures:state.textures.size,
      templateBuilds:state.templateBuilds,cacheHits:state.cacheHits,instancesCreated:state.instancesCreated,
      instancesReleased:state.instancesReleased,liveInstances:state.liveInstances,clickables:state.clickables,
      colliders:state.colliders,buildings:state.buildings,interiors:state.interiors,doors:state.doors,
      loads:state.loads,unloads:state.unloads,
      catalogObjectChunks:state.catalogObjectChunks.slice(),liveObjectIds:liveObjectIds.sort()};
  }
  return {init:init,loadChunk:loadChunk,unloadChunk:unloadChunk,dispose:dispose,
    ownsObject:ownsObject,snapshot:snapshot};
})();
