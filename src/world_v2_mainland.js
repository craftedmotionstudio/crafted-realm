/* ================= WORLD V2: VEYHOLLOW ARRIVAL =================
 * The first mainland residency shell. It intentionally owns only the Commons
 * arrival footprint; Hollow Well Square's complete authored buildings replace
 * this terrain-only shell through Phase 2 without sending the player back to the
 * retired legacy world.
 */
(function(global){
  'use strict';
  if(!global.WorldV2) throw new Error('WorldV2 contract must load before the mainland provider');

  var rect={x0:-48,z0:-48,w:96,h:96,cx:0,cz:0};
  var landmarks={
    veyhollow_ferry_arrival:{id:'veyhollow_ferry_arrival',label:'Veyhollow Ferry Landing',x:0,z:18,kind:'safe-spawn'},
    hollow_well_square:{id:'hollow_well_square',label:'Hollow Well Square',x:0,z:0,kind:'landmark'}
  };
  var chunks=[];
  var cx0=Math.floor(rect.x0/WorldV2.CHUNK_SIZE),cz0=Math.floor(rect.z0/WorldV2.CHUNK_SIZE);
  var cx1=Math.floor((rect.x0+rect.w-0.001)/WorldV2.CHUNK_SIZE);
  var cz1=Math.floor((rect.z0+rect.h-0.001)/WorldV2.CHUNK_SIZE);
  for(var cz=cz0;cz<=cz1;cz++) for(var cx=cx0;cx<=cx1;cx++) chunks.push({
    v:WorldV2.CONTRACT_VERSION,id:WorldV2.key(cx,cz),cx:cx,cz:cz,
    layers:{terrain:{underlay:'worldgrid_v4',heightSource:'worldgrid_v4',revision:1,roles:[
      {kind:'district',id:'veyhollow_commons',role:'mainland-arrival'}
    ]},tileFlags:[],objects:[],interactions:[],mutations:[],spawns:[]}
  });

  var provider=WorldV2.register({
    contractVersion:WorldV2.CONTRACT_VERSION,
    id:'veyhollow-commons-v2',label:'Veyhollow Commons',worldRevision:1,
    initialRect:rect,residentRadius:3,renderStrategy:'chunk-native-terrain',
    defaultLandmark:'veyhollow_ferry_arrival',landmarks:landmarks,
    mapMetadata:{revision:1,regionId:'veyhollow_commons',orientation:'north-is-negative-z',
      compass:true,clickToWalk:true,landmarks:Object.keys(landmarks).map(function(id){return landmarks[id];}),riskAreas:[]},
    chunks:chunks,
    hooks:{
      buildTerrain:function(p){
        if(typeof TEX==='undefined'||!TEX.grass) buildTextures();
        if(typeof WORLD!=='undefined'&&!WORLD.sea) buildSea();
        if(typeof WorldV2Terrain==='undefined') throw new Error('WorldV2Terrain runtime is unavailable');
        WorldV2Terrain.init(p);
        if(typeof WorldV2Objects==='undefined') throw new Error('WorldV2Objects runtime is unavailable');
        WorldV2Objects.init(p);
        if(typeof CollisionGrid!=='undefined') CollisionGrid.initResident(p);
        var spawn=p.getSpawnLandmark(p.defaultLandmark);
        p.updateResidency(spawn.x,spawn.z,true);
      },
      populate:function(){ console.info('[MAINLAND_V2] Veyhollow arrival residency ready'); },
      chartCollision:function(p){ if(typeof CollisionGrid!=='undefined') CollisionGrid.rebakeResident(p); },
      loadChunk:function(chunk,p){
        var render=(typeof WorldV2Terrain!=='undefined')?WorldV2Terrain.loadChunk(chunk,p):{id:chunk.id,dataOnly:true};
        var objects=(typeof WorldV2Objects!=='undefined')?WorldV2Objects.loadChunk(chunk,p):{id:chunk.id,dataOnly:true};
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.loadChunk(chunk);
        return {id:chunk.id,render:render,objects:objects};
      },
      unloadChunk:function(handle,chunk){
        if(typeof CollisionGrid!=='undefined'&&CollisionGrid.grid) CollisionGrid.unloadChunk(chunk);
        if(typeof WorldV2Objects!=='undefined'&&handle) WorldV2Objects.unloadChunk(handle.objects);
        if(typeof WorldV2Terrain!=='undefined'&&handle) WorldV2Terrain.unloadChunk(handle.render);
      },
      dispose:function(){
        if(typeof WorldV2Objects!=='undefined') WorldV2Objects.dispose();
        if(typeof WorldV2Terrain!=='undefined') WorldV2Terrain.dispose();
      },
      snapshot:function(){ return {
        terrain:typeof WorldV2Terrain!=='undefined'?WorldV2Terrain.snapshot():null,
        objects:typeof WorldV2Objects!=='undefined'?WorldV2Objects.snapshot():null,
        collision:typeof CollisionGrid!=='undefined'&&CollisionGrid.snapshot?CollisionGrid.snapshot():null,
        landscape:null
      }; }
    }
  });
  global.VeyhollowMainlandProvider=provider;
})(window);
