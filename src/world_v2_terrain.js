/* ================= WORLD V2 CHUNK TERRAIN =================
 * Runtime-owned 8x8 terrain handles for Tutor's Holm. Every resident chunk has
 * one mesh/geometry; all chunks share one material and a world-space texture so
 * borders meet without colour or UV seams. Unload removes raycast registration
 * and disposes only the chunk geometry. Static pond water is owned here too.
 */
var WorldV2Terrain=(function(){
  'use strict';
  var state={ready:false,provider:null,material:null,texture:null,pond:null,
    geometriesCreated:0,geometriesDisposed:0,loads:0,unloads:0,lastLoadMs:0,maxLoadMs:0};

  function now(){ return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); }
  function removeFrom(list,obj){ var i=list.indexOf(obj); if(i>=0) list.splice(i,1); }
  function clippedBounds(chunk,provider){
    var s=WorldV2.CHUNK_SIZE, r=provider.getWorldRect();
    var x0=Math.max(r.x0,chunk.cx*s), z0=Math.max(r.z0,chunk.cz*s);
    var x1=Math.min(r.x0+r.w,(chunk.cx+1)*s), z1=Math.min(r.z0+r.h,(chunk.cz+1)*s);
    return {x0:x0,z0:z0,x1:x1,z1:z1,w:x1-x0,h:z1-z0};
  }
  function init(provider){
    if(state.ready && state.provider===provider) return;
    if(state.ready) dispose();
    if(typeof THREE==='undefined'||typeof scene==='undefined'||!TEX.grass)
      throw new Error('[WorldV2Terrain] renderer textures are not ready');
    state.provider=provider;
    state.texture=TEX.grass.clone(); state.texture.needsUpdate=true;
    state.texture.wrapS=state.texture.wrapT=THREE.RepeatWrapping;
    state.texture.repeat.set(1,1); state.texture.offset.set(0,0);
    state.material=new THREE.MeshPhongMaterial({map:state.texture,vertexColors:true,
      flatShading:true,shininess:0,specular:0x000000});
    if(provider.id==='tutors-holm-v2'){
      var hp=HOLM_POND;
      state.pond=makeWaterSurface(new THREE.CircleGeometry(hp.r+0.4,20),hp.x,HOLM_POND_WATER_Y,hp.z,5,0.94);
      state.pond.name='holm-pond-water';
    }else state.pond=null;
    state.ready=true;
  }
  function loadChunk(chunk,provider){
    if(!state.ready) return {id:chunk.id,dataOnly:true};
    var t0=now(), b=clippedBounds(chunk,provider);
    if(b.w<=0||b.h<=0) return {id:chunk.id,empty:true};
    var mesh=buildTerrainPatch((b.x0+b.x1)/2,(b.z0+b.z1)/2,b.w,b.h,
      Math.max(1,Math.round(b.w)),Math.max(1,Math.round(b.h)),{
        material:state.material,worldUvs:true,name:'ground-chunk-'+chunk.id
      });
    mesh.userData.worldChunk={id:chunk.id,cx:chunk.cx,cz:chunk.cz};
    state.geometriesCreated++; state.loads++;
    state.lastLoadMs=+(now()-t0).toFixed(3);
    state.maxLoadMs=Math.max(state.maxLoadMs,state.lastLoadMs);
    return {id:chunk.id,mesh:mesh,geometry:mesh.geometry,render:true};
  }
  function unloadChunk(handle){
    if(!handle||!handle.mesh) return;
    scene.remove(handle.mesh);
    removeFrom(WORLD.clickables,handle.mesh); removeFrom(WORLD.grounds,handle.mesh);
    if(handle.geometry){ handle.geometry.dispose(); state.geometriesDisposed++; }
    state.unloads++;
  }
  function disposeWater(mesh){
    if(!mesh) return;
    scene.remove(mesh);
    if(mesh.geometry) mesh.geometry.dispose();
    var material=mesh.material, tex=material&&material.map;
    if(tex){ removeFrom(WORLD.waterTextures,tex); tex.dispose(); }
    if(material) material.dispose();
  }
  function dispose(){
    disposeWater(state.pond); state.pond=null;
    if(state.material) state.material.dispose();
    if(state.texture) state.texture.dispose();
    state.material=null; state.texture=null; state.provider=null; state.ready=false;
  }
  function snapshot(){
    return {ready:state.ready,sharedMaterials:state.material?1:0,sharedTextures:state.texture?1:0,
      geometriesCreated:state.geometriesCreated,geometriesDisposed:state.geometriesDisposed,
      liveGeometries:state.geometriesCreated-state.geometriesDisposed,
      loads:state.loads,unloads:state.unloads,lastLoadMs:state.lastLoadMs,maxLoadMs:state.maxLoadMs};
  }
  return {init:init,loadChunk:loadChunk,unloadChunk:unloadChunk,dispose:dispose,snapshot:snapshot};
})();
