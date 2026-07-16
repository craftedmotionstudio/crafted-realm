/* ================= WORLD V2 BUILDING COMPOSER =================
 * Shared r128/r160-compatible visual composer. Every geometry is created from
 * the THREE dependency passed to build(), so the live game and tools/studio.html
 * render the same asset without loading the legacy world builder.
 */
var WorldV2Buildings=(function(){
  'use strict';

  var ASSETS={
    holm_guide_hall_v1:{url:'/assets/models/buildings/holm_guide_hall_v6.glb?v=1',
      assetId:'holm_guide_hall',source:'blender-glb-v6',rootName:'asset-holm-guide-hall-v6',
      parts:['roof','front_door','teaching_door','orientation_table','lesson_register','first_landing_plaque','provision_rack']},
    holm_survival_workyard_v1:{url:'/assets/models/buildings/holm_survival_workyard_v2.glb?v=14',
      assetId:'holm_survival_workyard',source:'blender-glb-v16-integrated-u4',rootName:'asset-holm-survival-workyard-v16',
      dependencies:['workyard_exterior_u3_v1','workyard_waterworks_u4_v1','workyard_fishing_edge_u5_v1'],
      parts:['roof','trail_door','pond_door','tool_bench','firemaking_board','storm_tally_beam','net_rack',
        'teaching_fireplace','hearth_flame','cellar_ladder','chicken_spawn_socket',
        'u3_log_rack_socket','u3_chopping_block_socket','u4_waterworks_shore_socket',
        'workyard_exterior_u3_v1','timber_log_rack','log_stack','rope_restraints',
        'chopping_block','embedded_axe','sawbuck',
        'workyard_waterworks_u4_v1','dock_shore_span','dock_turn_platform','dock_bank_span',
        'pulley_frame','pulley_crank','pulley_rope','pulley_bucket','shore_entry_socket',
        'bank_exit_socket','fishing_edge_socket','water_contact_socket','pulley_operator_socket',
        'workyard_fishing_edge_u5_v1','fishing_water_patch','fishing_ripple','fish_school','dock_creel','catch_fish',
        'catch_presentation_socket','fishing_operator_socket','fish_reward_socket','water_surface_socket',
        'workyard_crockery_hutch','workyard_mug_shelf','workyard_empty_bucket','workyard_tool_stool',
        'workyard_lodge_rug','workyard_hearth_rug','workyard_lesson_table',
        'workyard_hearth_stool_splitter','workyard_hearth_stool_woven','workyard_storm_warden_relief']}
  };
  var PROP_ASSETS={
    workyard_exterior_u3_v1:{url:'/assets/models/props/workyard_exterior_u3_v1.glb?v=1',
      parts:['workyard_exterior_u3_v1','timber_log_rack','log_stack','rope_restraints',
        'chopping_block','embedded_axe','sawbuck']},
    workyard_waterworks_u4_v1:{url:'/assets/models/props/workyard_waterworks_u4_v1.glb?v=1',
      parts:['workyard_waterworks_u4_v1','dock_shore_span','dock_turn_platform','dock_bank_span',
        'pulley_frame','pulley_crank','pulley_rope','pulley_bucket','shore_entry_socket',
        'bank_exit_socket','fishing_edge_socket','water_contact_socket','pulley_operator_socket']},
    workyard_fishing_edge_u5_v1:{url:'/assets/models/props/workyard_fishing_edge_u5_v1.glb?v=1',
      parts:['workyard_fishing_edge_u5_v1','fishing_water_patch','fishing_ripple','fish_school','dock_creel','catch_fish',
        'catch_presentation_socket','fishing_operator_socket','fish_reward_socket','water_surface_socket']}
  };
  var MODEL_URL=ASSETS.holm_guide_hall_v1.url;
  var loadedTemplates={};
  var pendingLoads={};
  var loadedDependencies={};
  var loadedDependencyAnimations={};
  var pendingDependencies={};

  function normalizeImported(root,id){
    var cfg=ASSETS[id],semanticParts={};
    cfg.parts.forEach(function(part){semanticParts[part]=true;});
    root.name=cfg.rootName;
    root.userData=Object.assign({},root.userData||{},{buildingDefId:id,assetId:cfg.assetId,source:cfg.source});
    root.traverse(function(o){
      o.userData=o.userData||{};
      var part=o.userData.partId||o.name;
      if(semanticParts[part]){
        o.userData.partId=part;
        if(!o.userData.preserveAnimationName)o.name='building-part-'+part;
      }
      if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        var mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(function(m){ if(m){ m.flatShading=true; m.needsUpdate=true; } });
      }
    });
    return root;
  }

  function normalizeDependency(root,id){
    var cfg=PROP_ASSETS[id];
    root.name='dependency-'+id;
    root.userData=Object.assign({},root.userData||{},{assetId:id,source:'blender-glb-dependency'});
    root.traverse(function(o){
      o.userData=o.userData||{};
      var part=o.userData.partId||o.name;
      if(cfg.parts.indexOf(part)>=0) o.userData.partId=part;
      if(o.isMesh){
        o.castShadow=true; o.receiveShadow=true;
        var mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(function(m){ if(m){ m.flatShading=true; m.needsUpdate=true; } });
      }
    });
    return root;
  }

  function preloadDependency(T,loader,id){
    var cfg=PROP_ASSETS[id];
    if(!cfg) return Promise.reject(new Error('[WorldV2Buildings] unknown dependency '+id));
    if(loadedDependencies[id]) return Promise.resolve(loadedDependencies[id]);
    if(pendingDependencies[id]) return pendingDependencies[id];
    pendingDependencies[id]=new Promise(function(resolve,reject){
      loader.load(cfg.url,function(gltf){
        try{
          if(!gltf||!gltf.scene) throw new Error(id+' GLB has no scene');
          var root=normalizeDependency(gltf.scene,id);
          cfg.parts.forEach(function(part){
            if(!findPart(root,part)) throw new Error(id+' GLB is missing semantic node '+part);
          });
          loadedDependencies[id]=root;
          loadedDependencyAnimations[id]=(gltf.animations||[]).slice();
          delete pendingDependencies[id]; resolve(root);
        }catch(error){ delete pendingDependencies[id]; reject(error); }
      },undefined,function(error){
        delete pendingDependencies[id];
        reject(new Error('[WorldV2Buildings] failed to load '+cfg.url+': '+(error&&error.message||error)));
      });
    });
    return pendingDependencies[id];
  }

  function placePart(root,id,x,y,z,rotY){
    var part=findPart(root,id);
    if(!part) throw new Error('[WorldV2Buildings] integrated dependency is missing '+id);
    part.position.set(x,y,z); part.rotation.set(0,rotY||0,0); part.scale.set(1,1,1);
    return part;
  }

  function attachWorkyardU3(building,template){
    var instance=template.clone(true),family=findPart(instance,'workyard_exterior_u3_v1');
    if(!family) throw new Error('[WorldV2Buildings] U3 family root is missing');
    family.position.set(0,0,0); family.rotation.set(0,0,0); family.scale.set(1,1,1);
    family.userData=Object.assign({},family.userData||{},
      {partId:'workyard_exterior_u3_v1',integration:'holm-survival-workyard-u3'});
    placePart(family,'timber_log_rack',2.25,.20,4.70,0);
    placePart(family,'chopping_block',.80,.20,2.25,.35);
    placePart(family,'embedded_axe',.74,.845,2.15,-.62);
    placePart(family,'sawbuck',4.60,.20,4.55,.28);
    building.add(family);
  }

  function attachWorkyardU4(building,template,T){
    var instance=template.clone(true),family=findPart(instance,'workyard_waterworks_u4_v1');
    if(!family) throw new Error('[WorldV2Buildings] U4 waterworks family root is missing');
    family.position.set(9.92,.20,-1.85); family.rotation.set(0,0,0); family.scale.set(1,1,1);
    family.userData=Object.assign({},family.userData||{},
      {partId:'workyard_waterworks_u4_v1',integration:'holm-survival-workyard-u4'});
    var crank=findPart(family,'pulley_crank');
    if(!crank) throw new Error('[WorldV2Buildings] U4 pulley crank is missing');
    var hitMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
    var hitProxy=new T.Mesh(new T.BoxGeometry(1.15,1.15,.95),hitMat);
    hitProxy.name='waterworks-pulley-hit-proxy';
    crank.add(hitProxy);
    // GLTF animation tracks bind by node name.  Preserve every U4 dependency
    // name when the composed building receives its semantic normalization;
    // `partId` still provides the stable interaction lookup contract.
    family.traverse(function(o){
      o.userData=Object.assign({},o.userData||{},{preserveAnimationName:true});
    });
    building.add(family);
  }

  function attachWorkyardU5(building,template,T){
    var instance=template.clone(true),family=findPart(instance,'workyard_fishing_edge_u5_v1');
    if(!family) throw new Error('[WorldV2Buildings] U5 fishing family root is missing');
    family.position.set(15.97,.20,-.75);family.rotation.set(0,0,0);family.scale.set(1,1,1);
    family.userData=Object.assign({},family.userData||{},
      {partId:'workyard_fishing_edge_u5_v1',integration:'holm-survival-workyard-u5'});
    var water=findPart(family,'fishing_water_patch');
    if(!water) throw new Error('[WorldV2Buildings] U5 fishing water patch is missing');
    water.userData=Object.assign({},water.userData||{},{acceptsUseItem:true});
    var hitMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
    var hitProxy=new T.Mesh(new T.BoxGeometry(3.15,.34,2.08),hitMat);
    hitProxy.name='fishing-edge-hit-proxy';hitProxy.position.set(1.55,.03,0);
    hitProxy.userData={acceptsUseItem:true};water.add(hitProxy);
    family.traverse(function(o){o.userData=Object.assign({},o.userData||{},{preserveAnimationName:true});});
    building.add(family);
  }

  function attachDependencies(root,cfg,T){
    (cfg.dependencies||[]).forEach(function(id){
      if(id==='workyard_exterior_u3_v1') attachWorkyardU3(root,loadedDependencies[id]);
      else if(id==='workyard_waterworks_u4_v1') attachWorkyardU4(root,loadedDependencies[id],T);
      else if(id==='workyard_fishing_edge_u5_v1') attachWorkyardU5(root,loadedDependencies[id],T);
      else throw new Error('[WorldV2Buildings] no integration rule for dependency '+id);
    });
  }

  function preloadOne(T,loader,id){
    if(!T) return Promise.reject(new Error('[WorldV2Buildings] THREE dependency is required'));
    var cfg=ASSETS[id];
    if(!cfg) return Promise.reject(new Error('[WorldV2Buildings] unknown Blender asset '+id));
    if(loadedTemplates[id]) return Promise.resolve(loadedTemplates[id]);
    if(pendingLoads[id]) return pendingLoads[id];
    if(!loader){
      if(!T.GLTFLoader) return Promise.reject(new Error('[WorldV2Buildings] GLTFLoader is unavailable'));
      loader=new T.GLTFLoader();
    }
    pendingLoads[id]=new Promise(function(resolve,reject){
      loader.load(cfg.url,function(gltf){
        if(!gltf||!gltf.scene){ delete pendingLoads[id]; reject(new Error(id+' GLB has no scene')); return; }
        Promise.all((cfg.dependencies||[]).map(function(dep){return preloadDependency(T,loader,dep);})).then(function(){
          try{
            attachDependencies(gltf.scene,cfg,T);
            var root=normalizeImported(gltf.scene,id);
            cfg.parts.forEach(function(part){
              if(!findPart(root,part)) throw new Error(id+' composed asset is missing semantic node '+part);
            });
            loadedTemplates[id]=root; delete pendingLoads[id]; resolve(root);
          }catch(error){ delete pendingLoads[id]; reject(error); }
        }).catch(function(error){ delete pendingLoads[id]; reject(error); });
      },undefined,function(error){
        delete pendingLoads[id];
        reject(new Error('[WorldV2Buildings] failed to load '+cfg.url+': '+(error&&error.message||error)));
      });
    });
    return pendingLoads[id];
  }
  function preload(T,loader,id){
    if(id) return preloadOne(T,loader,id);
    return Promise.all(Object.keys(ASSETS).map(function(assetId){return preloadOne(T,loader,assetId);}));
  }

  function material(T,color,extra){
    var opts={color:color,flatShading:true,roughness:1,metalness:0};
    if(extra) for(var k in extra) opts[k]=extra[k];
    return new T.MeshStandardMaterial(opts);
  }
  function box(T,w,h,d,mat){ var m=new T.Mesh(new T.BoxGeometry(w,h,d),mat); m.castShadow=true; m.receiveShadow=true; return m; }
  function cyl(T,rt,rb,h,n,mat){ var m=new T.Mesh(new T.CylinderGeometry(rt,rb,h,n),mat); m.castShadow=true; m.receiveShadow=true; return m; }
  function tag(obj,id){ obj.userData=obj.userData||{}; obj.userData.partId=id; obj.name='building-part-'+id; return obj; }
  function addAt(parent,obj,x,y,z,ry){ obj.position.set(x,y,z); if(ry) obj.rotation.y=ry; parent.add(obj); return obj; }
  function timberWindow(T,mats,x,z,rot,parent){
    var g=new T.Group(), frame=mats.timber, glass=mats.glass;
    addAt(g,box(T,1.35,0.12,0.13,frame),0,0.67,0);
    addAt(g,box(T,1.35,0.12,0.13,frame),0,-0.67,0);
    addAt(g,box(T,0.12,1.45,0.13,frame),-0.62,0,0);
    addAt(g,box(T,0.12,1.45,0.13,frame),0.62,0,0);
    addAt(g,box(T,0.08,1.3,0.11,frame),0,0,0);
    addAt(g,box(T,1.15,0.08,0.11,frame),0,0,0);
    addAt(g,box(T,1.12,1.25,0.05,glass),0,0,-0.02);
    g.position.set(x,1.78,z); g.rotation.y=rot||0; parent.add(g); return g;
  }
  function plankDoor(T,mats,door){
    var hinge=tag(new T.Group(),door.id), panel=new T.Group();
    var wood=mats.door,iron=mats.iron;
    addAt(panel,box(T,door.width*0.96,2.25,0.13,wood),door.width/2,1.12,0);
    for(var i=0;i<3;i++) addAt(panel,box(T,door.width*0.88,0.08,0.16,iron),door.width/2,0.42+i*0.68,0.01);
    addAt(panel,box(T,0.10,2.05,0.16,iron),door.width*0.13,1.1,0.01);
    var latch=cyl(T,0.06,0.06,0.12,6,mats.brass); latch.rotation.x=Math.PI/2;
    addAt(panel,latch,door.width*0.77,1.13,0.1);
    hinge.add(panel); hinge.position.set(door.x,0,door.z); hinge.rotation.y=door.closedRot;
    return hinge;
  }
  function shelf(T,mats,partId){
    var g=partId?tag(new T.Group(),partId):new T.Group();
    for(var y=0.3;y<=2.1;y+=0.6) addAt(g,box(T,1.7,0.12,0.48,mats.timber),0,y,0);
    [-0.77,0.77].forEach(function(x){ addAt(g,box(T,0.13,2.35,0.5,mats.darkWood),x,1.17,0); });
    var colors=[mats.bookRed,mats.bookBlue,mats.parchment,mats.bookGreen];
    for(var row=0;row<3;row++) for(var i=0;i<5;i++){
      var b=box(T,0.18,0.34+(i%2)*0.08,0.32,colors[(row+i)%colors.length]);
      addAt(g,b,-0.55+i*0.27,0.57+row*0.6,0.02,(i%3-1)*0.05);
    }
    return g;
  }
  function bench(T,mats,w){
    var g=new T.Group(); addAt(g,box(T,w,0.16,0.48,mats.timber),0,0.58,0);
    [-w/2+0.25,w/2-0.25].forEach(function(x){ addAt(g,box(T,0.14,0.62,0.38,mats.darkWood),x,0.29,0); });
    return g;
  }
  function crate(T,mats,s){
    var g=new T.Group(); s=s||0.8; addAt(g,box(T,s,s,s,mats.crate),0,s/2,0);
    addAt(g,box(T,s*1.03,0.08,s*1.03,mats.darkWood),0,s*0.25,0);
    addAt(g,box(T,s*1.03,0.08,s*1.03,mats.darkWood),0,s*0.75,0);
    return g;
  }
  function makeGuideHall(T,def){
    var root=new T.Group(); root.name='asset-holm-guide-hall';
    root.userData={buildingDefId:def.id,assetId:def.assetId};
    var C={
      stone:material(T,0x9b927f),stoneDark:material(T,0x70695d),plaster:material(T,0xd2c6a7),
      plasterLight:material(T,0xe0d5b9),
      timber:material(T,0x765236),darkWood:material(T,0x4a3020),door:material(T,0x684326),
      roof:material(T,0x7b4c2f),roofLight:material(T,0xa66e36),floor:material(T,0x98734a),
      rug:material(T,0x7f2f2b),rugGold:material(T,0xc49a49),brass:material(T,0xd0a54e),
      iron:material(T,0x4b4c49),parchment:material(T,0xe5d49f),mapLand:material(T,0x72894d),
      mapWater:material(T,0x496f82),bookRed:material(T,0x874036),bookBlue:material(T,0x435b78),
      bookGreen:material(T,0x506744),crate:material(T,0x87613d),rope:material(T,0xa98b59),
      clothBlue:material(T,0x536b72),clothGreen:material(T,0x65704c),pinRed:material(T,0xa44b35),
      glass:material(T,0x9ec0c0,{transparent:true,opacity:0.62,depthWrite:false})
    };
    var W=def.footprint.w,D=def.footprint.d,H=def.footprint.h,t=0.28;

    // Foundation and floor: one continuous traversable surface at terrain level.
    addAt(root,box(T,W+0.35,0.34,D+0.35,C.stoneDark),0,-0.12,0);
    addAt(root,box(T,W-0.5,0.16,D-0.5,C.floor),0,0.05,0);
    for(var fx=-5.8;fx<=5.8;fx+=1.45) addAt(root,box(T,0.06,0.025,D-0.7,C.darkWood),fx,0.145,0);

    // Worked-stone lower course and warm plaster upper walls, split at both doors.
    function wallRun(x,z,w,d){
      addAt(root,box(T,w,1.08,d,C.stone),x,0.54,z);
      addAt(root,box(T,w,H-1.08,d,C.plaster),x,1.08+(H-1.08)/2,z);
      addAt(root,box(T,w,0.13,d+0.05,C.timber),x,1.12,z);
    }
    wallRun(-3.75,D/2-t/2,5.5,t); wallRun(3.75,D/2-t/2,5.5,t);
    wallRun(-3.75,-D/2+t/2,5.5,t); wallRun(3.75,-D/2+t/2,5.5,t);
    wallRun(-W/2+t/2,0,t,D-0.3); wallRun(W/2-t/2,0,t,D-0.3);
    // Continuous dark wall plates make the roof/wall junction deliberate at
    // both exterior and roof-off cameras.
    addAt(root,box(T,W-0.18,0.22,0.38,C.darkWood),0,H-0.08,D/2-t/2);
    addAt(root,box(T,W-0.18,0.22,0.38,C.darkWood),0,H-0.08,-D/2+t/2);
    addAt(root,box(T,0.38,0.22,D-0.18,C.darkWood),-W/2+t/2,H-0.08,0);
    addAt(root,box(T,0.38,0.22,D-0.18,C.darkWood),W/2-t/2,H-0.08,0);
    [[-6.55,-5.18],[-6.55,5.18],[6.55,-5.18],[6.55,5.18]].forEach(function(p){
      addAt(root,box(T,0.42,H+0.18,0.42,C.stoneDark),p[0],H/2,p[1]);
      addAt(root,box(T,0.72,0.32,0.72,C.stone),p[0],0.16,p[1]);
      addAt(root,box(T,0.62,0.18,0.62,C.timber),p[0],H+0.12,p[1]);
    });

    // Timber framing makes the hall legible at the gameplay camera.
    [-4.8,-2.4,2.4,4.8].forEach(function(x){
      addAt(root,box(T,0.13,H-1.15,0.32,C.timber),x,1.15+(H-1.15)/2,D/2-t/2);
      addAt(root,box(T,0.13,H-1.15,0.32,C.timber),x,1.15+(H-1.15)/2,-D/2+t/2);
    });
    [-3.7,-1.2,1.2,3.7].forEach(function(z){
      addAt(root,box(T,0.32,H-1.15,0.13,C.timber),-W/2+t/2,1.15+(H-1.15)/2,z);
      addAt(root,box(T,0.32,H-1.15,0.13,C.timber),W/2-t/2,1.15+(H-1.15)/2,z);
    });
    timberWindow(T,C,-4.2,D/2+0.01,0,root); timberWindow(T,C,4.2,D/2+0.01,0,root);
    timberWindow(T,C,-4.2,-D/2-0.01,Math.PI,root); timberWindow(T,C,4.2,-D/2-0.01,Math.PI,root);
    timberWindow(T,C,-W/2-0.01,1.8,Math.PI/2,root); timberWindow(T,C,W/2+0.01,1.8,-Math.PI/2,root);

    // Doors are semantic parts configured by the streaming runtime.
    def.doors.forEach(function(d){ root.add(plankDoor(T,C,d)); });

    // A deep, gabled front porch makes arrival ceremonial; the quieter north
    // awning points onward to the lesson circuit without competing for focus.
    function porch(z,front){
      var sign=front?1:-1,depth=front?2.0:1.35,width=front?4.1:3.2;
      [-width/2+0.3,width/2-0.3].forEach(function(x){
        addAt(root,cyl(T,0.18,0.22,2.65,7,C.stone),x,1.32,z+sign*(depth-0.25));
        addAt(root,box(T,0.52,0.16,0.52,C.stoneDark),x,2.68,z+sign*(depth-0.25));
      });
      if(front){
        [-1,1].forEach(function(s){
          var awn=box(T,width/2+0.32,0.20,depth+0.38,C.roofLight);
          awn.rotation.z=-s*0.48; addAt(root,awn,s*(width/4+0.02),3.28,z+sign*depth*0.52);
          var edge=box(T,width/2+0.4,0.13,0.14,C.darkWood); edge.rotation.z=-s*0.48;
          addAt(root,edge,s*(width/4+0.02),3.23,z+sign*(depth+0.12));
        });
        addAt(root,box(T,0.18,0.22,depth+0.52,C.darkWood),0,4.22,z+sign*depth*0.52);
      }else{
        var awn=box(T,width,0.18,depth+0.25,C.roofLight); awn.rotation.x=sign*0.18;
        addAt(root,awn,0,2.9,z+sign*depth*0.52);
        addAt(root,box(T,width+0.2,0.13,0.13,C.darkWood),0,2.86,z+sign*(depth+0.06));
      }
    }
    porch(D/2,true); porch(-D/2,false);
    addAt(root,box(T,2.5,0.16,1.0,C.stoneDark),0,0.04,D/2+0.55);
    addAt(root,box(T,2.1,0.12,0.75,C.stoneDark),0,0.03,-D/2-0.38);
    // Large front-facing compass plaque: purpose before decoration.
    var porchMark=new T.Group();
    var markBack=cyl(T,0.72,0.72,0.16,12,C.darkWood); markBack.rotation.x=Math.PI/2; porchMark.add(markBack);
    var markFace=cyl(T,0.57,0.57,0.18,12,C.brass); markFace.rotation.x=Math.PI/2; porchMark.add(markFace);
    var markNeedle=box(T,0.12,0.92,0.10,C.rug); markNeedle.rotation.z=-0.42; addAt(porchMark,markNeedle,0,0,0.13);
    addAt(root,porchMark,0,3.28,D/2+2.28);
    // Broad approach stones prevent the entrance from floating in grass.
    [[0,6.15,2.7,0.9],[-0.1,7.0,2.35,0.7],[0.12,7.7,1.9,0.62]].forEach(function(p,i){
      var step=box(T,p[2],0.12,p[3],i===1?C.stone:C.stoneDark); step.rotation.y=(i-1)*0.035;
      addAt(root,step,p[0],-0.01,p[1]);
    });

    // Roof is one tagged hierarchy so the game and Studio use the same roof-off behavior.
    var roof=tag(new T.Group(),'roof'),ang=0.47,slopeW=W/2+0.9;
    [-1,1].forEach(function(s){
      var slab=box(T,slopeW,0.24,D+1.2,C.roof);
      slab.rotation.z=-s*ang; slab.position.set(s*(W/4+0.08),H+1.42,0); roof.add(slab);
      for(var rz=-D/2;rz<=D/2;rz+=1.05){
        var course=box(T,slopeW*0.98,0.06,0.09,C.roofLight); course.rotation.z=-s*ang;
        course.position.set(s*(W/4+0.08),H+1.56,rz); roof.add(course);
      }
      var eave=box(T,0.18,0.18,D+1.45,C.darkWood); eave.rotation.z=-s*ang;
      eave.position.set(s*(W/2+0.12),H+0.02,0); roof.add(eave);
    });
    addAt(roof,box(T,0.30,0.30,D+1.42,C.darkWood),0,H+2.96,0);
    [-D/2-0.42,D/2+0.42].forEach(function(z){
      [-1,1].forEach(function(s){
        var rake=box(T,slopeW*0.96,0.13,0.15,C.darkWood); rake.rotation.z=-s*ang;
        addAt(roof,rake,s*(W/4+0.08),H+1.50,z);
      });
    });
    // The central map lantern is a purposeful roof landmark: it admits light
    // over the relief chart and breaks the otherwise generic long-house mass.
    addAt(roof,cyl(T,0.80,0.86,1.05,8,C.plasterLight),0,H+3.42,0.65);
    addAt(roof,cyl(T,0.89,0.89,0.14,8,C.darkWood),0,H+2.94,0.65);
    addAt(roof,cyl(T,0.89,0.89,0.14,8,C.darkWood),0,H+3.90,0.65);
    [[0,0.79,0], [0,-0.79,0], [0.79,0,Math.PI/2], [-0.79,0,Math.PI/2]].forEach(function(p){
      var pane=box(T,0.52,0.50,0.055,C.glass); pane.rotation.y=p[2]; addAt(roof,pane,p[0],H+3.45,0.65+p[1]);
      var mullion=box(T,0.08,0.54,0.07,C.timber); mullion.rotation.y=p[2]; addAt(roof,mullion,p[0],H+3.45,0.65+p[1]);
    });
    addAt(roof,cyl(T,0,1.22,0.82,8,C.roofLight),0,H+4.38,0.65);
    // A compass crest gives the Guide Hall a unique silhouette from the route.
    var crest=new T.Group();
    var disc=cyl(T,0.46,0.46,0.12,12,C.brass); disc.rotation.x=Math.PI/2; crest.add(disc);
    var needle=box(T,0.10,0.82,0.14,C.rug); needle.rotation.z=0.35; addAt(crest,needle,0,0,0.08);
    addAt(roof,crest,0,H+5.06,0.65);
    root.add(roof);

    // Orientation Hall: an oversized eight-point compass mosaic makes the
    // room read in a single glance from the elevated gameplay camera.
    var rugBase=cyl(T,2.72,2.72,0.035,8,C.rug); addAt(root,rugBase,0,0.17,0.65);
    var rugRing=cyl(T,2.34,2.34,0.025,8,C.rugGold); addAt(root,rugRing,0,0.20,0.65);
    var rugInner=cyl(T,2.02,2.02,0.03,8,C.rug); addAt(root,rugInner,0,0.23,0.65);
    [0,Math.PI/2,Math.PI/4,-Math.PI/4].forEach(function(ry,i){
      var ray=box(T,i<2?0.20:0.12,0.025,i<2?3.45:2.72,C.rugGold); ray.rotation.y=ry;
      addAt(root,ray,0,0.26,0.65);
    });
    // Colour-blocked support carpets establish the two secondary rooms.
    addAt(root,box(T,3.6,0.025,2.75,C.clothBlue),-4.55,0.17,-3.28);
    addAt(root,box(T,3.75,0.025,2.75,C.clothGreen),4.48,0.17,-3.28);
    [[-6.0,-3.1],[3.0,5.95]].forEach(function(pair){
      pair.forEach(function(x){ addAt(root,box(T,0.12,0.035,2.48,C.rugGold),x,0.20,-3.28); });
    });

    // The relief chart exaggerates the Holm's coast and lesson stops so it is
    // readable as a map, not a generic round table.
    var table=tag(new T.Group(),'orientation_table');
    addAt(table,cyl(T,1.36,1.18,0.22,10,C.timber),0,1.02,0);
    addAt(table,cyl(T,0.34,0.48,0.92,8,C.darkWood),0,0.52,0);
    var chart=cyl(T,1.12,1.12,0.035,10,C.mapWater); addAt(table,chart,0,1.15,0);
    [[-0.43,0.17,0.45,0.25],[0.10,-0.33,0.34,0.24],[0.44,0.23,0.21,0.30],[-0.05,0.45,0.23,0.16]].forEach(function(p){
      var land=cyl(T,p[2],p[2]*0.82,0.055,6,C.mapLand); land.scale.z=p[3]/p[2]; addAt(table,land,p[0],1.20,p[1],p[0]);
    });
    [[-.58,.16],[-.16,-.46],[.34,-.20],[.52,.30],[.02,.53]].forEach(function(p,n){
      var pin=cyl(T,0.045,0.07,0.25,6,n===0?C.pinRed:C.brass); addAt(table,pin,p[0],1.34,p[1]);
    });
    addAt(root,table,0,0,0.65);
    var b1=bench(T,C,3.15); addAt(root,b1,-3.65,0,1.45,Math.PI/2);
    var b2=bench(T,C,3.15); addAt(root,b2,3.65,0,1.45,Math.PI/2);
    // Cardinal wall boards reinforce direction and frame the through-route.
    [-2.0,2.0].forEach(function(x,i){
      addAt(root,box(T,1.22,1.55,0.10,C.darkWood),x,2.18,-5.17);
      addAt(root,box(T,0.98,1.30,0.08,i?C.clothGreen:C.clothBlue),x,2.18,-5.08);
      var pointer=box(T,0.14,0.92,0.06,C.rugGold); pointer.rotation.z=0.35*(i?1:-1);
      addAt(root,pointer,x,2.18,-5.01);
    });

    // Records nook: shelves plus a large, clickable lesson register.
    var records=shelf(T,C,null); addAt(root,records,-5.82,0,-3.35,Math.PI/2);
    var lectern=tag(new T.Group(),'lesson_register');
    addAt(lectern,box(T,1.45,0.16,0.82,C.timber),0,1.0,0,0.12);
    [-0.48,0.48].forEach(function(x){ addAt(lectern,box(T,0.12,0.9,0.12,C.darkWood),x,0.52,0); });
    var pageL=box(T,0.62,0.035,0.67,C.parchment),pageR=box(T,0.62,0.035,0.67,C.parchment);
    pageL.rotation.z=0.08; pageR.rotation.z=-0.08; addAt(lectern,pageL,-0.3,1.11,0); addAt(lectern,pageR,0.3,1.11,0);
    for(var li=0;li<4;li++) addAt(lectern,box(T,0.42,0.018,0.025,C.iron),0,1.14,-0.22+li*0.13);
    addAt(root,lectern,-4.25,0,-2.75);
    var recordStool=bench(T,C,1.05); addAt(root,recordStool,-3.42,0,-4.12);
    // Scroll case and wax seal make the register nook visibly administrative.
    for(var scroll=0;scroll<3;scroll++){
      var roll=cyl(T,0.10,0.10,0.62,7,C.parchment); roll.rotation.z=Math.PI/2;
      addAt(root,roll,-5.25,0.40+scroll*0.24,-4.36,scroll*0.08);
    }
    addAt(root,cyl(T,0.16,0.16,0.05,10,C.pinRed),-4.25,1.15,-2.72);

    // The plaque is an authored clue, not generic decoration.
    var plaque=tag(new T.Group(),'first_landing_plaque');
    addAt(plaque,box(T,0.12,1.75,2.25,C.darkWood),0,0,0);
    addAt(plaque,box(T,0.08,1.5,2.0,C.stoneDark),-0.08,0,0);
    var ship=box(T,0.06,0.15,1.2,C.brass); ship.rotation.x=-0.2; addAt(plaque,ship,-0.14,-0.2,0);
    for(var ray=0;ray<5;ray++){ var mark=box(T,0.05,0.55,0.05,C.brass); mark.rotation.x=ray*0.42-0.85; addAt(plaque,mark,-0.14,0.25,0); }
    plaque.rotation.y=Math.PI/2; addAt(root,plaque,-6.66,1.83,1.35);

    // Provision bay: shelves, packs, oilskins, crates, and a small work counter.
    var provisions=tag(shelf(T,C,null),'provision_rack'); addAt(root,provisions,5.75,0,-3.35,-Math.PI/2);
    for(var sack=0;sack<3;sack++){
      var bag=cyl(T,0.25,0.34,0.62,7,sack===1?C.rope:C.crate); bag.scale.z=0.8;
      addAt(provisions,bag,-0.45+sack*0.45,0.36,0.48,sack*0.2);
    }
    addAt(root,crate(T,C,0.82),4.2,0,-4.15,0.2); addAt(root,crate(T,C,0.68),3.45,0,-4.35,-0.2);
    var counter=box(T,2.35,0.9,0.68,C.timber); addAt(root,counter,4.42,0.45,-1.98);
    // Three recognisable issue items replace the old identical glowing props.
    var pack=new T.Group(); addAt(pack,box(T,0.58,0.68,0.28,C.crate),0,0.34,0);
    addAt(pack,box(T,0.10,0.72,0.31,C.rope),-0.18,0.35,0); addAt(pack,box(T,0.10,0.72,0.31,C.rope),0.18,0.35,0);
    addAt(root,pack,3.72,0.92,-1.98);
    var coil=cyl(T,0.30,0.30,0.12,10,C.rope); coil.rotation.x=Math.PI/2; addAt(root,coil,4.43,1.16,-1.98);
    var oilskin=box(T,0.55,0.16,0.44,C.clothGreen); oilskin.rotation.y=0.22; addAt(root,oilskin,5.10,1.08,-1.98);
    // A small water cask gives supplies a credible everyday function.
    var cask=cyl(T,0.36,0.36,0.85,9,C.crate); cask.rotation.z=Math.PI/2; addAt(root,cask,5.22,0.44,-4.28);
    [-0.30,0.30].forEach(function(x){ var band=cyl(T,0.38,0.38,0.08,9,C.iron); band.rotation.z=Math.PI/2; addAt(root,band,5.22+x,0.44,-4.28); });

    // Low stone-and-timber partitions divide support rooms while keeping the
    // generous central spine and both exits completely readable.
    [-4.8,4.8].forEach(function(x){
      addAt(root,box(T,3.2,0.64,0.18,C.stone),x,0.32,-1.65);
      addAt(root,box(T,3.34,0.14,0.22,C.darkWood),x,0.70,-1.65);
      addAt(root,box(T,0.20,1.72,0.22,C.timber),x<0?-3.20:3.20,0.86,-1.65);
    });

    root.traverse(function(o){ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    return root;
  }
  function build(T,id){
    if(!T) throw new Error('[WorldV2Buildings] THREE dependency is required');
    if(typeof WorldV2BuildingData==='undefined') throw new Error('[WorldV2Buildings] building data is unavailable');
    var def=WorldV2BuildingData.get(id);
    if(!def) throw new Error('[WorldV2Buildings] unknown building '+id);
    var check=WorldV2BuildingData.validate(def);
    if(!check.ok) throw new Error('[WorldV2Buildings] '+check.errors.join('; '));
    if(ASSETS[id]){
      if(!loadedTemplates[id]) throw new Error('[WorldV2Buildings] '+id+' must be preloaded before build()');
      return loadedTemplates[id].clone(true);
    }
    throw new Error('[WorldV2Buildings] no composer for '+id);
  }
  function findPart(root,id){
    var found=null; root.traverse(function(o){
      if(!found&&((o.userData&&o.userData.partId===id)||o.name===id||o.name==='building-part-'+id)) found=o;
    }); return found;
  }
  function dependencyAnimations(id){ return (loadedDependencyAnimations[id]||[]).slice(); }
  return {preload:preload,build:build,findPart:findPart,modelUrl:MODEL_URL,
    dependencyAnimations:dependencyAnimations,
    modelUrls:Object.keys(ASSETS).reduce(function(out,id){out[id]=ASSETS[id].url;return out;},{}),
    dependencyModelUrls:Object.keys(PROP_ASSETS).reduce(function(out,id){out[id]=PROP_ASSETS[id].url;return out;},{})};
})();
