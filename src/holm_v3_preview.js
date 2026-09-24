/* Tutor's Holm v3 preview provider (finish goal, step 2).
 * Opt-in only: ?holmV3=1 with an isolated ?qaProfile. Ordinary adventurers and saves never see it;
 * production boot stays on the current island until the step-7 cutover.
 * One compiled bundle (tools/build_holm_v3_terrain.js) drives everything the player meets:
 *   groundY      -> HolmV3Terrain.walkHeight (null on water, deck height on crossings)
 *   collision    -> CollisionGrid resident chunks, baked from that same groundY
 *   pathfinding  -> the normal 4-direction BFS with the 1.05 step limit
 *   rendering    -> HolmV3Render (2004 underlay/overlay tiles, flat blue water, plank decks)
 */
var HolmV3Preview=(function(){
  'use strict';
  var requested=typeof location!=='undefined'&&new URLSearchParams(location.search).get('holmV3')==='1';
  var ID='tutors-holm-v3',BUNDLE='assets/world/holm_v3/holm-v3.terrain.bundle.json';
  var bundle=null,provider=null,material=null,water=null,crossings=[];

  function active(){ return !!provider&&typeof CRWorldMode!=='undefined'&&CRWorldMode.providerId===ID; }

  async function prepare(){
    if(!requested) return null;
    if(typeof QAProfile==='undefined'||!QAProfile.isolated||CRWorldMode.legacy)
      throw new Error('Holm v3 preview requires an isolated ?qaProfile and the v2 game');
    var res=await fetch(BUNDLE,{cache:'no-store'});
    if(!res.ok) throw new Error('Holm v3 bundle missing: run node tools/build_holm_v3_terrain.js');
    bundle=await res.json();
    if(bundle.schema!=='holm-terrain-bundle-v3') throw new Error('Holm v3 bundle has the wrong schema');
    var chunks=HolmOverhaulChunks.compile(bundle.base).chunks, a=bundle.anchors;
    var landmarks={};
    Object.keys(a).forEach(function(id){ landmarks['v3_'+id]={id:'v3_'+id,label:id,x:a[id][0]+.5,z:a[id][1]+.5}; });
    provider=WorldV2.register({contractVersion:1,id:ID,label:'Tutor’s Holm · v3 preview',worldRevision:1,
      initialRect:{x0:0,z0:0,w:bundle.width,h:bundle.depth},residentRadius:4,renderStrategy:'holm-v3-tiles',
      defaultLandmark:'v3_landing',landmarks:landmarks,chunks:chunks,
      hooks:{
        buildTerrain:function(p){
          material=HolmV3Render.terrainMaterial(THREE);
          water=HolmV3Render.buildWater(THREE,bundle);scene.add(water);
          crossings=bundle.crossings.map(function(c){var g=HolmV3Render.buildCrossing(THREE,c);scene.add(g);return g;});
          if(typeof CollisionGrid!=='undefined') CollisionGrid.initResident(p);
          var s=p.getSpawnLandmark(p.defaultLandmark);p.updateResidency(s.x,s.z,true);
        },
        populate:function(){},
        chartCollision:function(p){ if(typeof CollisionGrid!=='undefined') CollisionGrid.rebakeResident(p); },
        loadChunk:function(chunk){
          var mesh=HolmV3Render.buildChunk(THREE,bundle,chunk.cx,chunk.cz,material);
          mesh.userData.worldChunk={id:chunk.id,cx:chunk.cx,cz:chunk.cz};
          scene.add(mesh);WORLD.clickables.push(mesh);WORLD.grounds.push(mesh);
          if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.loadChunk(chunk);
          return {id:chunk.id,mesh:mesh};
        },
        unloadChunk:function(handle,chunk){
          if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.unloadChunk(chunk);
          if(!handle||!handle.mesh) return;
          scene.remove(handle.mesh);
          [WORLD.clickables,WORLD.grounds].forEach(function(list){var i=list.indexOf(handle.mesh);if(i>=0)list.splice(i,1);});
          handle.mesh.geometry.dispose();
        },
        dispose:function(){
          if(water){scene.remove(water);water.traverse(function(o){if(o.geometry)o.geometry.dispose();});}
          crossings.forEach(function(g){scene.remove(g);});crossings=[];
          if(material) material.dispose();material=null;water=null;
        },
        snapshot:function(){ return {v3Preview:true,stats:bundle.stats,routes:bundle.routes,
          collision:typeof CollisionGrid!=='undefined'&&CollisionGrid.snapshot?CollisionGrid.snapshot():null}; }
      }});
    WorldV2.activate(ID);CRWorldMode.attachProvider(provider);
    return provider;
  }

  function height(x,z){ return active()?HolmV3Terrain.walkHeight(bundle,x,z):null; }
  function snapshot(){ return active()?{provider:ID,stats:bundle.stats,routes:bundle.routes}:null; }
  return {requested:requested,prepare:prepare,active:active,height:height,snapshot:snapshot};
})();
